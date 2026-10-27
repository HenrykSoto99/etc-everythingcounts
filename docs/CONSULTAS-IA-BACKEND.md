# Consultas IA backend

This backend unit adds two route registrars and one provider helper. The parent ETC router must call both registrars **after** its existing middleware has authenticated the request and populated `req.etc`, and after the JSON parser is active:

```ts
registerConsultationRoutes(router);
registerLlmConfigRoutes(router);
```

The registrars do not authenticate requests themselves. They still return `401` if `req.etc` is absent, and all database reads are keyed by the authenticated workspace.

## Consultation contract

The routes are mounted below `/api/etc`:

- `GET /consultations` returns `{ messages, segment, businessType }`.
- `POST /consultations` accepts `{ text, clientId, segment, businessType?, language: "es" | "en" }` and returns HTTP 200 with `{ message, reply, mode, remainingAI, scope, reason? }`.

`ConsultMessage` is exported from `server/etc/consultation.ts`:

```ts
type ConsultMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type ConsultationScope = {
  segment: Segment;
  businessType: BusinessType | null;
};
```

For non-PYMES workspaces, `businessType` and `scope.businessType` are `null`. For a PYMES workspace, the value is the subtype currently stored on the workspace. A request cannot select a historical or foreign scope: `segment` must equal the authenticated workspace segment, and a supplied `businessType` must equal the authenticated PYMES subtype. Mismatches are `403`; invalid values are `400`.

The GET route ignores caller-supplied scope query parameters. The POST route captures the current scope before reservation and checks the database again immediately before inserting the assistant response. If the workspace segment or PYMES subtype changed during provider work, the route returns `409` and does not return or persist a stale assistant reply.

`clientId` is a required, bounded idempotency key. The user row is reserved before quota consumption. A retry with the same scope, client ID, and text returns the existing pair without consuming AI. Reusing the client ID with different text is `409`; a request already reserved by another process is `409` rather than triggering a second paid call. The unique database key is `(workspace_id, segment, business_type, client_id, role)`. The consultation thread is bounded to 100 rows, so at most 50 user/assistant exchanges are created in one scope.

The guard runs before reservation, `consumeAi`, and any provider request. It blocks clear world/weather/poem requests, prompt-injection and secret requests, other segment terms, mismatched PYMES operations, financial investment or credit recommendations, and clinical diagnosis/treatment requests for dental, medical, or veterinary subtypes. It permits scoped administrative work such as appointments, follow-ups, approved FAQs, pipeline work, and customer-contact workflows. The generated answer is checked again for the same classes of unsafe scope and for claims that an action or message was sent; provider instructions are not treated as the only defense.

`mode` is:

- `blocked`: deterministic scope guard response; no AI quota is consumed and no provider call is made.
- `llm`: a response from the selected provider passed the output scope check.
- `fallback`: approved workspace FAQ content or a conservative localized handoff sentence was used. Provider failures never silently switch an explicitly selected personal provider to managed service.

Only approved FAQ rows from the current workspace are included in prompts. No contacts, phone numbers, email addresses, or other client PII are queried. The model receives at most the most recent 20 messages from the current scope, while the stored thread remains bounded to 100 rows. The assistant only drafts text; it does not send messages, create appointments, update pipeline records, or perform financial actions.

## Provider and key configuration contract

`registerLlmConfigRoutes(router)` adds:

- `GET /llm/config` -> `{ provider, model, hasKey, keyLast4, encryptionReady }`.
- `PATCH /llm/config` with `{ provider, model, apiKey? }`.
- `POST /llm/test` -> sanitized `{ ok, message }` after an owner-only provider list-model GET where supported.
- `DELETE /llm/config` -> removes the workspace row and returns managed defaults.

Personal-provider PATCH, test, and DELETE operations require a live workspace whose authenticated user is the workspace owner. Demo GET always reports `{ provider: "managed", model: "gpt-6-luna", hasKey: false, keyLast4: null, encryptionReady: false }`; demo cannot store personal credentials. The API never returns a key, ciphertext, nonce, or authentication tag.

`ETC_LLM_ENCRYPTION_KEY` is intentionally not declared by this unit. In a live deployment it must be an independent 32-byte root, supplied as exactly 64 hexadecimal characters or standard Base64 encoding of 32 bytes. If it is absent or malformed, personal-provider writes fail closed with `503`; the implementation never derives a root from a platform secret and never stores plaintext. AES-256-GCM stores ciphertext, a random 12-byte nonce, and the authentication tag. Tampering or a wrong root produces a sanitized typed error.

Managed settings accept only the existing project model `gpt-6-luna`. User-supplied personal-provider models are bounded by a strict model-ID regex and are not hardcoded to a catalog. Provider hosts are fixed in `server/etc/providers.ts`:

- OpenAI: `https://api.openai.com/v1` and `POST /chat/completions` with Bearer auth.
- Gemini: `https://generativelanguage.googleapis.com/v1beta` and `POST /models/{model}:generateContent` with native `systemInstruction`, `contents`, `generationConfig`, and the `x-goog-api-key` header.
- Anthropic: `https://api.anthropic.com/v1` and `POST /messages` with `x-api-key` and `anthropic-version: 2023-06-01`.
- Managed: the existing `MANUS_API_URL` and `MANUS_API_KEY`, raw chat payload with model `gpt-6-luna`, `reasoning: { effort: "none" }`, and `max_completion_tokens` capped at 700.

The provider implementation exports:

```ts
callConfiguredModel(
  workspaceId: string,
  messages: ProviderMessage[],
  options?: { language?: "es" | "en"; maxTokens?: number }
): Promise<{ text: string; provider: ProviderName }>;
```

It returns a sanitized `ConfiguredModelError` for configuration, encryption, timeout, transport, or response-shape failures. The consultation route converts those failures to conservative local fallback text; it does not make an unexpected managed call.

## Additive migration

`server/etc/consultation-migrate.ts` exports `runConsultationMigration(databaseUrl?)`. It creates `etc_llm_settings` and `etc_consultation_messages` with `CREATE TABLE IF NOT EXISTS` only, then closes its pool in `finally`. The parent migration runner should invoke it after the managed ETC base tables exist. No existing table is dropped or altered by this module.

## Validation

Focused backend tests:

```bash
pnpm exec vitest run \
  server/etc/providers.test.ts \
  server/etc/consultation.test.ts \
  server/etc/consultation-migrate.test.ts
```

The tests cover AES-GCM round trips, tampered ciphertext, wrong roots, invalid root formats, fixed provider hosts, model validation, distinct segment/subtype rejection, PYMES dental versus restaurant operations, prompt injection, clinical and financial guard cases, and additive migration constraints. They use only a unit-test root and placeholder test key; no production credential or outside provider call is made.

## Transport references

The native request shapes were checked against the official provider references:

- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)
- [Google Gemini `generateContent`](https://ai.google.dev/api/generate-content)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)
