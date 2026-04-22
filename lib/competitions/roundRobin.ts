// lib/competitions/roundRobin.ts
// Single round-robin pairing (E1). Odd team count uses BYE sentinel.

export const ROUND_ROBIN_BYE = "__BYE__";

/** Rounds and fixture counts from the same generator used for persistence. */
export function roundRobinRoundCounts(teamCount: number): {
  roundsSingle: number;
  roundsHomeAndAway: number;
  fixturesSingle: number;
  fixturesHomeAndAway: number;
} {
  if (teamCount < 2) {
    return {
      roundsSingle: 0,
      roundsHomeAndAway: 0,
      fixturesSingle: 0,
      fixturesHomeAndAway: 0,
    };
  }
  const ids = Array.from({ length: teamCount }, (_, i) => `t${i}`);
  const single = generateRoundRobin(ids, { doubleRound: false });
  const dbl = generateRoundRobin(ids, { doubleRound: true });
  const maxRoundSingle = single.reduce((m, f) => Math.max(m, f.round), 0);
  const maxRoundDouble = dbl.reduce((m, f) => Math.max(m, f.round), 0);
  return {
    roundsSingle: maxRoundSingle,
    roundsHomeAndAway: maxRoundDouble,
    fixturesSingle: single.length,
    fixturesHomeAndAway: dbl.length,
  };
}

export interface RoundRobinFixture {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Circle method round-robin. Team at index 0 fixed; others rotate.
 * For odd n, BYE is injected so each real team gets a bye round.
 */
export function generateRoundRobin(
  teamIds: string[],
  options?: { doubleRound?: boolean },
): RoundRobinFixture[] {
  const unique = [...new Set(teamIds.map((t) => t.trim()).filter(Boolean))];
  if (unique.length < 2) return [];

  const teams = [...unique];
  const isOdd = teams.length % 2 === 1;
  if (isOdd) teams.push(ROUND_ROBIN_BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const out: RoundRobinFixture[] = [];

  const rotate = (arr: string[]) => {
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    return [fixed, ...rest];
  };

  let state = teams;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = state[i]!;
      const b = state[n - 1 - i]!;
      if (a === ROUND_ROBIN_BYE || b === ROUND_ROBIN_BYE) continue;
      out.push({ round: r + 1, homeTeamId: a, awayTeamId: b });
    }
    state = rotate(state);
  }

  if (options?.doubleRound) {
    const rev = out.map((f) => ({
      round: f.round + rounds,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
    }));
    out.push(...rev);
  }

  return out;
}
