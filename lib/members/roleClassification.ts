// Role classification shared by the analytics API.
export function classifyRoles(rawRoles: string[]): {
  isPlayer: boolean;
  isUmpire: boolean;
  isTechnicalOfficial: boolean;
  isCoach: boolean;
  isAdmin: boolean;
} {
  // Imported members use "role-umpire" style ids; app-created ones use "umpire".
  const rs = new Set(rawRoles.map((r) => String(r).replace(/^role-/, "")));
  return {
    isPlayer:            rs.has("player"),
    isUmpire:            rs.has("umpire"),
    isTechnicalOfficial: rs.has("technical-official") || rs.has("tech-official") || rs.has("technical-officer"),
    isCoach:             rs.has("coach") || rs.has("assoc-coach"),
    isAdmin:             rs.has("club-admin") || rs.has("association-admin") ||
                         rs.has("club-committee") || rs.has("assoc-committee") ||
                         rs.has("registrar") || rs.has("assoc-registrar"),
  };
}

