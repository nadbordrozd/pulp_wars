/**
 * Faction strength tournament (`pulp_wars-hblo`): the pure helpers of the
 * runner and the report. No engine, no AI, no match runner: scheduling,
 * placement, intervals, and ratings over plain records, so the unit tier
 * can test them on small hand-built inputs.
 */

/** A small deterministic PRNG (Mulberry32) for schedules and bootstraps. */
export function mulberry32V7(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

export interface TournamentMatchSpecV7 {
  /** Stable file name of the match: `<phase>-<index>`. */
  readonly id: string;
  readonly phase: "1v1" | "ffa";
  readonly seed: number;
  readonly mapType: string;
  /** Seat-ordered factions, seat 0 first. */
  readonly factions: readonly string[];
}

/**
 * The 1v1 round robin: every unordered pair of `factions`, `gamesPerPairing`
 * games each. Game `g` of a pairing plays seat order `g % 2` (the pair as
 * listed, then swapped) on map `mapTypes[(start + floor(g / 2)) % length]`,
 * where `start` rotates with the pairing, so each pairing plays both seat
 * orders on a map before moving to the next and the maps stay balanced.
 * Seeds are `seedBase + index` in schedule order.
 */
export function roundRobinScheduleV7(options: {
  readonly factions: readonly string[];
  readonly gamesPerPairing: number;
  readonly mapTypes: readonly string[];
  readonly seedBase: number;
}): TournamentMatchSpecV7[] {
  const { factions, gamesPerPairing, mapTypes, seedBase } = options;
  if (mapTypes.length === 0) throw new RangeError("mapTypes cannot be empty");
  if (!Number.isSafeInteger(gamesPerPairing) || gamesPerPairing < 1)
    throw new RangeError("gamesPerPairing must be a positive integer");
  const specs: TournamentMatchSpecV7[] = [];
  let pairIndex = 0;
  for (let i = 0; i < factions.length; i += 1)
    for (let j = i + 1; j < factions.length; j += 1) {
      const a = factions[i] as string;
      const b = factions[j] as string;
      for (let game = 0; game < gamesPerPairing; game += 1) {
        const index = specs.length;
        specs.push({
          id: `1v1-${String(index).padStart(4, "0")}`,
          phase: "1v1",
          seed: seedBase + index,
          mapType: mapTypes[
            (pairIndex + Math.floor(game / 2)) % mapTypes.length
          ] as string,
          factions: game % 2 === 0 ? [a, b] : [b, a],
        });
      }
      pairIndex += 1;
    }
  return specs;
}

/**
 * Free-for-alls: `games` matches of `seats` distinct factions each, drawn so
 * that every faction appears equally often (within one game's worth when
 * `games * seats` is not a multiple of the faction count). Each game takes
 * the least-used factions, ties broken by the seeded PRNG, then shuffles
 * the seat order. Maps rotate through `mapTypes`.
 */
export function ffaScheduleV7(options: {
  readonly factions: readonly string[];
  readonly games: number;
  readonly seats: number;
  readonly mapTypes: readonly string[];
  readonly seedBase: number;
  readonly drawSeed: number;
}): TournamentMatchSpecV7[] {
  const { factions, games, seats, mapTypes, seedBase } = options;
  if (seats < 2 || seats > factions.length)
    throw new RangeError("seats must be between 2 and the faction count");
  if (mapTypes.length === 0) throw new RangeError("mapTypes cannot be empty");
  const random = mulberry32V7(options.drawSeed);
  const used = new Map(factions.map((faction) => [faction, 0]));
  const specs: TournamentMatchSpecV7[] = [];
  for (let game = 0; game < games; game += 1) {
    const ranked = factions
      .map((faction) => ({ faction, tie: random() }))
      .sort(
        (left, right) =>
          (used.get(left.faction) as number) -
            (used.get(right.faction) as number) || left.tie - right.tie,
      )
      .slice(0, seats)
      .map((entry) => entry.faction);
    for (let index = ranked.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      const here = ranked[index] as string;
      ranked[index] = ranked[swap] as string;
      ranked[swap] = here;
    }
    for (const faction of ranked)
      used.set(faction, (used.get(faction) as number) + 1);
    specs.push({
      id: `ffa-${String(game).padStart(4, "0")}`,
      phase: "ffa",
      seed: seedBase + game,
      mapType: mapTypes[game % mapTypes.length] as string,
      factions: ranked,
    });
  }
  return specs;
}

export interface PlacementSeatV7 {
  readonly seat: number;
  /** The command index of the seat's elimination; null while it stands. */
  readonly eliminatedAt: number | null;
  readonly score: number;
}

/**
 * Placement, best first: the seats still standing at the end, by final
 * score (the winner of a decided match is the only one standing), then the
 * eliminated seats, the last eliminated first. Equal scores keep seat
 * order.
 */
export function placementOrderV7(seats: readonly PlacementSeatV7[]): number[] {
  const standing = seats
    .filter((seat) => seat.eliminatedAt === null)
    .sort((left, right) => right.score - left.score || left.seat - right.seat);
  const eliminated = seats
    .filter((seat) => seat.eliminatedAt !== null)
    .sort(
      (left, right) =>
        (right.eliminatedAt as number) - (left.eliminatedAt as number),
    );
  return [...standing, ...eliminated].map((seat) => seat.seat);
}

/** The Wilson score interval of `wins` in `n` (z = 1.96 for 95%). */
export function wilsonIntervalV7(
  wins: number,
  n: number,
  z = 1.96,
): { readonly rate: number; readonly low: number; readonly high: number } {
  if (n === 0) return { rate: 0, low: 0, high: 1 };
  const rate = wins / n;
  const denominator = 1 + (z * z) / n;
  const centre = (rate + (z * z) / (2 * n)) / denominator;
  const half =
    (z * Math.sqrt((rate * (1 - rate)) / n + (z * z) / (4 * n * n))) /
    denominator;
  return {
    rate,
    low: Math.max(0, centre - half),
    high: Math.min(1, centre + half),
  };
}

/** Mean and normal-approximation 95% interval of a sample. */
export function meanIntervalV7(values: readonly number[]): {
  readonly mean: number;
  readonly low: number;
  readonly high: number;
  readonly n: number;
} {
  const n = values.length;
  if (n === 0) return { mean: 0, low: 0, high: 0, n };
  const mean = values.reduce((total, value) => total + value, 0) / n;
  if (n === 1) return { mean, low: mean, high: mean, n };
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (n - 1);
  const half = 1.96 * Math.sqrt(variance / n);
  return { mean, low: mean - half, high: mean + half, n };
}

/** One decided 1v1 game: `winner` is `a`, `b`, or null for a draw. */
export interface PairGameV7 {
  readonly a: string;
  readonly b: string;
  readonly winner: string | null;
}

/**
 * Bradley-Terry strengths by the MM algorithm (Hunter 2004), on the Elo
 * scale (`400 * log10(strength)`, mean 0). A draw is half a win for each.
 * Every faction also plays `prior` virtual games against a virtual
 * opponent of strength 1 and wins half of them, which keeps an unbeaten or
 * winless faction finite and pulls thin samples toward the middle.
 */
export function bradleyTerryV7(
  games: readonly PairGameV7[],
  factions: readonly string[],
  prior = 2,
  iterations = 500,
): Record<string, number> {
  const index = new Map(factions.map((faction, at) => [faction, at]));
  const k = factions.length;
  const wins = new Array<number>(k).fill(prior / 2);
  const played: number[][] = Array.from({ length: k }, () =>
    new Array<number>(k).fill(0),
  );
  for (const game of games) {
    const a = index.get(game.a);
    const b = index.get(game.b);
    if (a === undefined || b === undefined || a === b) continue;
    (played[a] as number[])[b] = ((played[a] as number[])[b] as number) + 1;
    (played[b] as number[])[a] = ((played[b] as number[])[a] as number) + 1;
    if (game.winner === null) {
      wins[a] = (wins[a] as number) + 0.5;
      wins[b] = (wins[b] as number) + 0.5;
    } else if (game.winner === game.a) wins[a] = (wins[a] as number) + 1;
    else if (game.winner === game.b) wins[b] = (wins[b] as number) + 1;
  }
  let strength = new Array<number>(k).fill(1);
  for (let step = 0; step < iterations; step += 1) {
    const next = strength.map((own, i) => {
      let denominator = prior / (own + 1);
      for (let j = 0; j < k; j += 1) {
        const n = (played[i] as number[])[j] as number;
        if (n > 0) denominator += n / (own + (strength[j] as number));
      }
      return denominator === 0 ? own : (wins[i] as number) / denominator;
    });
    const logMean =
      next.reduce((total, value) => total + Math.log(value), 0) / k;
    strength = next.map((value) => value / Math.exp(logMean));
  }
  return Object.fromEntries(
    factions.map((faction, i) => [
      faction,
      400 * Math.log10(strength[i] as number),
    ]),
  );
}

/**
 * Bootstrap 95% intervals of the Bradley-Terry ratings: `samples` resamples
 * of the games with replacement, the 2.5th and 97.5th percentiles.
 */
export function bootstrapRatingsV7(
  games: readonly PairGameV7[],
  factions: readonly string[],
  samples: number,
  seed: number,
  prior = 2,
): Record<string, { readonly low: number; readonly high: number }> {
  const random = mulberry32V7(seed);
  const draws: Record<string, number[]> = Object.fromEntries(
    factions.map((faction) => [faction, [] as number[]]),
  );
  for (let sample = 0; sample < samples; sample += 1) {
    const resampled = games.map(
      () => games[Math.floor(random() * games.length)] as PairGameV7,
    );
    const ratings = bradleyTerryV7(resampled, factions, prior, 200);
    for (const faction of factions)
      (draws[faction] as number[]).push(ratings[faction] as number);
  }
  return Object.fromEntries(
    factions.map((faction) => {
      const sorted = [...(draws[faction] as number[])].sort((x, y) => x - y);
      return [
        faction,
        {
          low: percentileV7(sorted, 0.025),
          high: percentileV7(sorted, 0.975),
        },
      ];
    }),
  );
}

/** Linear-interpolated percentile of an ascending list. */
export function percentileV7(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const at = (sorted.length - 1) * p;
  const below = Math.floor(at);
  const above = Math.ceil(at);
  const low = sorted[below] as number;
  const high = sorted[above] as number;
  return low + (high - low) * (at - below);
}

/**
 * The head-to-head matrix: `wins[row][column]` counts the games `row` won
 * against `column`, `games[row][column]` the games they played (draws count
 * as played, not won).
 */
export function headToHeadV7(
  games: readonly PairGameV7[],
  factions: readonly string[],
): {
  readonly wins: Record<string, Record<string, number>>;
  readonly games: Record<string, Record<string, number>>;
} {
  const zero = (): Record<string, Record<string, number>> =>
    Object.fromEntries(
      factions.map((row) => [
        row,
        Object.fromEntries(factions.map((column) => [column, 0])),
      ]),
    );
  const wins = zero();
  const played = zero();
  for (const game of games) {
    const rowA = played[game.a];
    const rowB = played[game.b];
    if (rowA === undefined || rowB === undefined) continue;
    rowA[game.b] = (rowA[game.b] ?? 0) + 1;
    rowB[game.a] = (rowB[game.a] ?? 0) + 1;
    if (game.winner === game.a)
      (wins[game.a] as Record<string, number>)[game.b] =
        ((wins[game.a] as Record<string, number>)[game.b] ?? 0) + 1;
    else if (game.winner === game.b)
      (wins[game.b] as Record<string, number>)[game.a] =
        ((wins[game.b] as Record<string, number>)[game.a] ?? 0) + 1;
  }
  return { wins, games: played };
}

/**
 * Turns a faction's ability was offered in and turns it used it: the
 * "offered but never chosen" share. Null when it was never offered.
 */
export function useShareV7(
  turnsUsed: number,
  turnsOffered: number,
): number | null {
  return turnsOffered === 0 ? null : turnsUsed / turnsOffered;
}
