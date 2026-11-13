// A roster can list the same member twice (e.g. after members were merged). Show each once.
export function uniquePlayers<T extends { id?: string }>(players: T[] | undefined): T[] {
  const seen = new Set<string>();
  return (players ?? []).filter((p) => {
    if (!p?.id) return true; // keep rows without an id; they cannot collide
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
