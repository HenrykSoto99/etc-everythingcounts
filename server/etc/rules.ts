export function canPersistAiReply(
  startVersion: number,
  currentVersion: number,
  aiPaused: boolean,
  status = "abierta"
): boolean {
  return !aiPaused && status !== "cerrada" && startVersion === currentVersion;
}

export function isWorkspaceOwner(
  ownerUserId: number | null,
  authenticatedUserId: number | null
): boolean {
  return (
    ownerUserId !== null &&
    authenticatedUserId !== null &&
    ownerUserId === authenticatedUserId
  );
}
