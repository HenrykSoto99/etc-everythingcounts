import type { Knowledge } from "@shared/etc/types";

export type AiTurn = { role: "customer" | "human" | "ai"; text: string };
export type AiProfile = {
  name: string;
  agentName: string;
  tone: string;
  description: string;
};
export type SuggestionResult = {
  text: string;
  handoff: boolean;
  mode: "llm" | "fallback";
  reason?: string;
};

const MODEL = "gpt-6-luna";
const MAX_COMPLETION_TOKENS = 700;
const timeoutMs = 20_000;
const outputSchema = {
  type: "json_schema",
  json_schema: {
    name: "etc_copilot_suggestion",
    strict: true,
    schema: {
      type: "object",
      properties: { text: { type: "string" }, handoff: { type: "boolean" } },
      required: ["text", "handoff"],
      additionalProperties: false,
    },
  },
};

const normalize = (value: unknown, max = 4000): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const safeProfile = (profile?: AiProfile): AiProfile => ({
  name: normalize(profile?.name, 160),
  agentName: normalize(profile?.agentName, 120),
  tone: normalize(profile?.tone, 120),
  description: normalize(profile?.description, 2000),
});
const tokens = (text: string) =>
  new Set(
    (text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(
      token =>
        ![
          "para",
          "como",
          "que",
          "una",
          "con",
          "los",
          "las",
          "por",
          "del",
          "qué",
        ].includes(token)
    )
  );

export function faqFallback(
  input: string,
  knowledge: Knowledge[],
  reason: string
): SuggestionResult {
  const inputTokens = tokens(input);
  let best: Knowledge | null = null;
  let score = 0;
  for (const item of knowledge.filter(item => item.approved)) {
    const candidate = tokens(`${item.title} ${item.content}`);
    const overlap = [...inputTokens].filter(token =>
      candidate.has(token)
    ).length;
    if (overlap > score) {
      score = overlap;
      best = item;
    }
  }
  if (best && score > 0)
    return {
      text: best.content.slice(0, 1200),
      handoff: false,
      mode: "fallback",
      reason,
    };
  return {
    text: "No tengo una respuesta aprobada para eso todavía. Puedo dejarlo en manos de una persona del equipo.",
    handoff: true,
    mode: "fallback",
    reason,
  };
}

export async function generateSuggestion(
  input: string,
  history: AiTurn[],
  knowledge: Knowledge[],
  profile?: AiProfile
): Promise<SuggestionResult> {
  const fallback = (reason: string) => faqFallback(input, knowledge, reason);
  const baseUrl = (process.env.MANUS_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.MANUS_API_KEY;
  if (!baseUrl || !key)
    return fallback(
      "Proveedor de IA no configurado; se usa contenido aprobado."
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const approved = knowledge
      .filter(item => item.approved)
      .slice(0, 20)
      .map(item => `- ${item.title}: ${item.content}`)
      .join("\n");
    const currentProfile = safeProfile(profile);
    const profileText = [
      `Nombre del espacio: ${currentProfile.name || "(no definido)"}`,
      `Nombre del agente: ${currentProfile.agentName || "(no definido)"}`,
      `Tono: ${currentProfile.tone || "(no definido)"}`,
      `Descripción: ${currentProfile.description || "(no definida)"}`,
    ].join("\n");
    const messages = [
      {
        role: "system",
        content:
          "Eres el copiloto interno de un equipo de atención. Responde en español, de forma breve y útil. Usa únicamente el conocimiento aprobado que se proporciona; si no alcanza, marca handoff=true y no inventes datos, precios ni condiciones. No prometas resultados ni afirmes que enviaste mensajes, agendaste algo o notificaste a una persona.",
      },
      {
        role: "system",
        content: `Perfil vigente del espacio y agente:\n${profileText}`,
      },
      {
        role: "system",
        content: `Conocimiento aprobado:\n${approved || "(vacío)"}`,
      },
      ...history
        .slice(-8)
        .map(turn => ({
          role:
            turn.role === "customer"
              ? "user"
              : turn.role === "ai"
                ? "assistant"
                : "user",
          content: normalize(turn.text, 4000),
        })),
      { role: "user", content: normalize(input, 4000) },
    ];
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        reasoning: { effort: "none" },
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        response_format: outputSchema,
      }),
      signal: controller.signal,
    });
    if (!response.ok)
      return fallback(
        `Proveedor de IA no disponible (${response.status}); se usa contenido aprobado.`
      );
    const body = (await response.json()) as any;
    const content = body?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    if (
      !parsed ||
      typeof parsed.text !== "string" ||
      typeof parsed.handoff !== "boolean" ||
      Object.keys(parsed).some(
        keyName => !["text", "handoff"].includes(keyName)
      )
    )
      return fallback(
        "La respuesta del proveedor no cumplió el contrato; se usa contenido aprobado."
      );
    const responseText = normalize(parsed.text);
    if (!responseText)
      return fallback(
        "La respuesta del proveedor estaba vacía; se usa contenido aprobado."
      );
    return { text: responseText, handoff: parsed.handoff, mode: "llm" };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "Tiempo de espera de IA agotado; se usa contenido aprobado."
        : "Error del proveedor de IA; se usa contenido aprobado.";
    return fallback(reason);
  } finally {
    clearTimeout(timer);
  }
}
