/**
 * Adapted from Vocero CRM src/server/inbox/window.ts.
 * Copyright (c) 2026 Kevin Belier. MIT License.
 * Original notice: docs/third-party/vocero-crm-LICENSE.
 * ETC is WhatsApp-only; invalid/future inbound timestamps fail closed.
 */
export const WINDOW_MS = 24 * 60 * 60 * 1000;
export function isWindowOpen(lastInboundAt: Date | string | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  const elapsed = now.getTime() - new Date(lastInboundAt).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < WINDOW_MS;
}
export function windowRemainingMs(lastInboundAt: Date | string | null, now: Date = new Date()): number {
  if (!isWindowOpen(lastInboundAt, now)) return 0;
  return WINDOW_MS - (now.getTime() - new Date(lastInboundAt!).getTime());
}
