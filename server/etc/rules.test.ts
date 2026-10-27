import { describe, expect, it } from "vitest";
import { isWindowOpen } from "../../shared/etc/window";
import { faqFallback } from "./ai";
import { canPersistAiReply, isWorkspaceOwner } from "./rules";

describe("ETC backend rules", () => {
  it("closes the WhatsApp window for missing, future and expired inbound messages", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");
    expect(isWindowOpen(null, now)).toBe(false);
    expect(isWindowOpen("2026-10-27T12:00:01.000Z", now)).toBe(false);
    expect(isWindowOpen("2026-10-26T11:59:59.000Z", now)).toBe(false);
    expect(isWindowOpen("2026-10-27T11:59:59.000Z", now)).toBe(true);
  });

  it("requires the same conversation version and an unpaused conversation to persist AI", () => {
    expect(canPersistAiReply(4, 4, false)).toBe(true);
    expect(canPersistAiReply(4, 5, false)).toBe(false);
    expect(canPersistAiReply(4, 4, true)).toBe(false);
    expect(canPersistAiReply(4, 4, false, "cerrada")).toBe(false);
  });

  it("does not elevate a different OAuth user to owner", () => {
    expect(isWorkspaceOwner(42, 42)).toBe(true);
    expect(isWorkspaceOwner(42, 43)).toBe(false);
    expect(isWorkspaceOwner(null, 42)).toBe(false);
  });

  it("uses approved FAQ fallback and escalates when there is no matching knowledge", () => {
    const knowledge = [{ id: "k", title: "Horarios de visita", content: "Atendemos de lunes a sábado.", approved: true, updatedAt: "2026-10-27T00:00:00.000Z" }];
    expect(faqFallback("¿Cuáles son los horarios de visita?", knowledge, "provider down")).toMatchObject({ mode: "fallback", text: "Atendemos de lunes a sábado.", handoff: false });
    expect(faqFallback("¿Pueden garantizar una rentabilidad?", knowledge, "provider down")).toMatchObject({ mode: "fallback", handoff: true });
  });
});
