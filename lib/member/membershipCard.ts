export function membershipCardQrPayload(input: {
  memberId: string;
  seasonYear: string;
}): string {
  const memberId = String(input.memberId ?? "").trim();
  const seasonYear = String(input.seasonYear ?? "").trim();
  // Simple, scanner-friendly payload with a fixed prefix for versioning.
  return `HA_CARD_v1|${memberId}|${seasonYear}`;
}

