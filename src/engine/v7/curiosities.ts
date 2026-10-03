import type { PlayerId } from "../model/ids";
import type { RandomState } from "../model/types";
import { nextBounded, randomState, seedFromText } from "../random/random";
import {
  PROMOTION_HP_V7,
  unitGrowsV7,
  unitRoleMechanicsV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import { compareCoordsV7, sameCoordV7 } from "./schema";
import {
  CURIOSITY_KINDS_V7,
  isAfloatFormV7,
  type BoardStateV7,
  type CoordV7,
  type CuriosityKindV7,
  type CuriosityV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type TerrainIdV7,
  type UnitStateV7,
} from "./types";

/**
 * Map curiosities (`pulp_wars-737.2`, docs/product/RULESET_7_MAP_CURIOSITIES.md):
 * the rare neutral Fountain of Youth, Shrine, and Sunken Wreck. This module
 * holds their placement in map generation (section 4) and the rule helpers
 * that Start Turn (the Fountain) and `MOVE` (the Shrine and the Wreck) call.
 * The roaming Monster (section 8) belongs to a later revision.
 */

/** Section 5: the HP a Fountain heals at its occupant's Start Turn. */
export const FOUNTAIN_HEAL_V7 = 12;
/** Section 7: the Coins a salvaged Wreck pays its salvager's owner. */
export const WRECK_COINS_V7 = 8;
/** Section 4.3 rule 3: minimum Chebyshev distance to a settlement center. */
export const CURIOSITY_CENTER_DISTANCE_V7 = 3;
/** Section 4.3 rule 4: minimum Chebyshev distance to a capital. */
export const CURIOSITY_CAPITAL_DISTANCE_V7 = 5;
/**
 * Section 4.3 rule 4: the largest allowed difference between a site's
 * farthest and nearest capital (Chebyshev).
 */
export const CURIOSITY_CAPITAL_SPREAD_V7 = 4;
/** Section 4.3 rule 5: minimum Chebyshev distance between curiosities. */
export const CURIOSITY_SPACING_V7 = 5;
/**
 * Section 4.2: the kind weights, in the frozen kind order. The Monster
 * (weight 3, drawn first) joins with its own revision.
 */
export const CURIOSITY_WEIGHTS_V7: Readonly<Record<CuriosityKindV7, number>> =
  Object.freeze({ FOUNTAIN: 3, SHRINE: 2, WRECK: 2 });

/** The terrains a kind may stand on (section 4.4). */
const CURIOSITY_TERRAINS_V7: Readonly<
  Record<CuriosityKindV7, readonly TerrainIdV7[]>
> = Object.freeze({
  FOUNTAIN: ["GRASS"],
  SHRINE: ["GRASS", "FOREST"],
  WRECK: ["SHALLOW_WATER", "DEEP_WATER"],
});

/** Whether a curiosity of `kind` may stand on `terrain` (section 4.4). */
export function curiosityTerrainLegalV7(
  kind: CuriosityKindV7,
  terrain: TerrainIdV7,
): boolean {
  return CURIOSITY_TERRAINS_V7[kind].includes(terrain);
}

/**
 * Section 3: whether a setup's map can carry curiosities: the option is on
 * and the map is generated (the Showcase and mission boards never have any).
 */
export function setupHasCuriositiesV7(
  setup: Pick<MatchSetupV7, "curiosities" | "mapType">,
): boolean {
  return (
    setup.curiosities &&
    setup.mapType !== "SHOWCASE" &&
    setup.mapType !== "MISSION"
  );
}

// ------------------------------------------------------- Generation ---

/**
 * Section 4.1: the curiosity stream. Placement draws from its own Mulberry32
 * stream seeded from the setup seed, never from the match stream or the
 * Rift stream, and the stream is not stored.
 */
export function curiosityRandomStateV7(seed: number): RandomState {
  return randomState(seedFromText(`pulp-wars-curiosities:${seed}`));
}

/**
 * Section 4.2: the number of curiosities a board of this width aims for,
 * from the stream's first draw. 11: one with probability 1/3; 14: one with
 * probability 1/2; 16: one (no draw); 20: two with probability 1/2,
 * otherwise one; 25: two (no draw). Fewer are placed when no kind has a
 * legal site left.
 */
export function curiosityTargetCountV7(
  width: number,
  random: RandomState,
): { readonly count: 0 | 1 | 2; readonly random: RandomState } {
  if (width === 11) {
    const draw = nextBounded(random, 3);
    return { count: draw.value === 0 ? 1 : 0, random: draw.random };
  }
  if (width === 14) {
    const draw = nextBounded(random, 2);
    return { count: draw.value === 0 ? 1 : 0, random: draw.random };
  }
  if (width === 16) return { count: 1, random };
  if (width === 20) {
    const draw = nextBounded(random, 2);
    return { count: draw.value === 0 ? 2 : 1, random: draw.random };
  }
  if (width === 25) return { count: 2, random };
  return { count: 0, random };
}

/** The facts a curiosity site is checked against (section 4.3). */
export interface CuriositySiteContextV7 {
  /** The accepted board after the Rifts. */
  readonly board: BoardStateV7;
  readonly mapType: MapTypeV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly treasureChests: readonly CoordV7[];
}

/**
 * The connectivity facts every site check shares, computed once per board:
 * the eight-connected land components (Rifts excluded), the land tiles
 * reachable from a capital without Mountains (the treasure-chest route),
 * and the eight-connected water components.
 */
interface CuriosityConnectivityV7 {
  readonly land: readonly number[];
  readonly lowlandFromCapital: ReadonlySet<number>;
  readonly water: readonly number[];
  /** The land component of each capital. */
  readonly capitalLand: readonly number[];
  /** Per water component: the land components it touches orthogonally. */
  readonly waterTouches: ReadonlyMap<number, ReadonlySet<number>>;
}

function connectivityV7(
  context: CuriositySiteContextV7,
): CuriosityConnectivityV7 {
  const { board } = context;
  const isLand = (index: number): boolean => {
    const tile = board.tiles[index];
    return tile !== undefined && tile.biome !== null && tile.terrain !== "RIFT";
  };
  const isWater = (index: number): boolean =>
    board.tiles[index]?.biome === null;
  const land = componentLabelsV7(board, isLand);
  const water = componentLabelsV7(board, isWater);
  const lowland = (index: number): boolean =>
    isLand(index) && board.tiles[index]?.terrain !== "MOUNTAIN";
  const lowlandFromCapital = new Set<number>();
  const queue: number[] = [];
  for (const capital of context.capitals) {
    const index = capital.y * board.width + capital.x;
    if (!lowland(index) || lowlandFromCapital.has(index)) continue;
    lowlandFromCapital.add(index);
    queue.push(index);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor] as number;
    for (const near of eightNeighbours(board, index))
      if (lowland(near) && !lowlandFromCapital.has(near)) {
        lowlandFromCapital.add(near);
        queue.push(near);
      }
  }
  const waterTouches = new Map<number, Set<number>>();
  board.tiles.forEach((tile, index) => {
    const label = water[index] ?? -1;
    if (label < 0) return;
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const x = tile.at.x + dx;
      const y = tile.at.y + dy;
      if (x < 0 || y < 0 || x >= board.width || y >= board.height) continue;
      const near = land[y * board.width + x] ?? -1;
      if (near < 0) continue;
      let touched = waterTouches.get(label);
      if (touched === undefined) {
        touched = new Set();
        waterTouches.set(label, touched);
      }
      touched.add(near);
    }
  });
  return {
    land,
    lowlandFromCapital,
    water,
    capitalLand: context.capitals.map(
      (capital) => land[capital.y * board.width + capital.x] ?? -1,
    ),
    waterTouches,
  };
}

/**
 * Sections 4.3 and 4.4: whether `at` is a legal site for a curiosity of
 * `kind`, with `placed` already on the board.
 */
function siteLegalV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  kind: CuriosityKindV7,
  placed: readonly CuriosityV7[],
  at: CoordV7,
): boolean {
  const { board } = context;
  // Rule 1: off the edge ring.
  if (at.x < 1 || at.y < 1 || at.x > board.width - 2 || at.y > board.height - 2)
    return false;
  const index = at.y * board.width + at.x;
  const tile = board.tiles[index];
  // Rule 2 and section 4.4: no site, chest, resource, improvement, or Rift,
  // and the kind's terrain.
  if (
    tile === undefined ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    tile.terrain === "RIFT" ||
    !curiosityTerrainLegalV7(kind, tile.terrain) ||
    context.treasureChests.some((chest) => sameCoordV7(chest, at))
  )
    return false;
  // Rule 3: 3 or more from every settlement center.
  if (
    [...context.capitals, ...context.villages].some(
      (center) => chebyshevV7(center, at) < CURIOSITY_CENTER_DISTANCE_V7,
    )
  )
    return false;
  // Rule 4: 5 or more from every capital, and roughly between them.
  const distances = context.capitals.map((capital) => chebyshevV7(capital, at));
  if (
    distances.length === 0 ||
    Math.min(...distances) < CURIOSITY_CAPITAL_DISTANCE_V7 ||
    Math.max(...distances) - Math.min(...distances) >
      CURIOSITY_CAPITAL_SPREAD_V7
  )
    return false;
  // Rule 5: 5 or more from every curiosity already placed.
  if (placed.some((other) => chebyshevV7(other.at, at) < CURIOSITY_SPACING_V7))
    return false;
  if (kind === "WRECK") {
    // Rule 7: the water component touches every capital's landmass.
    const touched = connectivity.waterTouches.get(
      connectivity.water[index] ?? -1,
    );
    return (
      touched !== undefined &&
      connectivity.capitalLand.every(
        (landmass) => landmass >= 0 && touched.has(landmass),
      )
    );
  }
  // Rule 6: a shared landmass reached from a capital without Mountains, or
  // a neutral island (reached by sea).
  const landmass = connectivity.land[index] ?? -1;
  if (landmass < 0) return false;
  const capitalsHere = connectivity.capitalLand.filter(
    (other) => other === landmass,
  ).length;
  if (capitalsHere === 1) return false;
  return capitalsHere === 0 || connectivity.lowlandFromCapital.has(index);
}

/**
 * Sections 4.3 and 4.4: every legal site of `kind` on the board as it
 * stands (with `placed` already there), in (y, x) order. A Wreck needs a
 * map with water (never Dry Land).
 */
export function curiositySitesV7(
  context: CuriositySiteContextV7,
  kind: CuriosityKindV7,
  placed: readonly CuriosityV7[] = [],
): readonly CoordV7[] {
  if (kind === "WRECK" && context.mapType === "DRY_LAND") return [];
  if (placed.some((curiosity) => curiosity.kind === kind)) return [];
  const connectivity = connectivityV7(context);
  return context.board.tiles
    .map((tile) => tile.at)
    .filter((at) => siteLegalV7(context, connectivity, kind, placed, at));
}

/**
 * Section 4: places the curiosities of a generated board. The target count
 * comes from {@link curiosityTargetCountV7}; each curiosity in turn draws
 * one kind by weight among the eligible kinds (not yet placed, allowed by
 * the board, with a legal site), in {@link CURIOSITY_KINDS_V7} order, then
 * one of its legal sites uniformly in (y, x) order. With no eligible kind
 * placement stops. The board is never changed or rejected.
 */
export function placeCuriositiesV7(
  seed: number,
  context: CuriositySiteContextV7,
): readonly CuriosityV7[] {
  const target = curiosityTargetCountV7(
    context.board.width,
    curiosityRandomStateV7(seed),
  );
  let random = target.random;
  const placed: CuriosityV7[] = [];
  while (placed.length < target.count) {
    const eligible = CURIOSITY_KINDS_V7.flatMap((kind) => {
      const sites = curiositySitesV7(context, kind, placed);
      return sites.length === 0 ? [] : [{ kind, sites }];
    });
    if (eligible.length === 0) break;
    const total = eligible.reduce(
      (sum, entry) => sum + CURIOSITY_WEIGHTS_V7[entry.kind],
      0,
    );
    const kindDraw = nextBounded(random, total);
    random = kindDraw.random;
    let remaining = kindDraw.value;
    const chosen =
      eligible.find((entry) => {
        remaining -= CURIOSITY_WEIGHTS_V7[entry.kind];
        return remaining < 0;
      }) ?? (eligible.at(-1) as (typeof eligible)[number]);
    const siteDraw = nextBounded(random, chosen.sites.length);
    random = siteDraw.random;
    placed.push({
      kind: chosen.kind,
      at: chosen.sites[siteDraw.value] as CoordV7,
    });
  }
  return [...placed].sort((left, right) => compareCoordsV7(left.at, right.at));
}

// ------------------------------------------------------------ Rules ---

/** The curiosity on `at`, if any. */
export function curiosityAtV7(
  state: Pick<GameStateV7, "curiosities">,
  at: CoordV7,
): CuriosityV7 | null {
  return (
    state.curiosities.find((curiosity) => sameCoordV7(curiosity.at, at)) ?? null
  );
}

/**
 * Section 5: the Fountain step of `playerId`'s Start Turn, after Windmill
 * healing and before Troll regeneration. Each of the player's land-form
 * units on a Fountain (never an Egg or a construct) heals
 * `min(FOUNTAIN_HEAL_V7, maxHp - hp)`; one `FOUNTAIN_HEALED` per unit that
 * healed, in (y, x) order of the Fountains.
 */
export function resolveFountainHealingV7(
  state: GameStateV7,
  playerId: PlayerId,
): {
  readonly state: GameStateV7;
  readonly events: readonly Extract<
    DomainEventV7,
    { readonly kind: "FOUNTAIN_HEALED" }
  >[];
} {
  if (state.curiosities.length === 0) return { state, events: [] };
  const events: Extract<DomainEventV7, { readonly kind: "FOUNTAIN_HEALED" }>[] =
    [];
  const healed = new Map<number, number>();
  for (const fountain of state.curiosities) {
    if (fountain.kind !== "FOUNTAIN") continue;
    const unit = state.units.find(
      (candidate) =>
        candidate.ownerId === playerId &&
        candidate.hp > 0 &&
        candidate.form === "LAND" &&
        sameCoordV7(candidate.at, fountain.at),
    );
    if (unit === undefined || unitRoleMechanicsV7(state, unit).construct)
      continue;
    const amount = Math.min(FOUNTAIN_HEAL_V7, unit.maxHp - unit.hp);
    if (amount <= 0) continue;
    healed.set(unit.id, unit.hp + amount);
    events.push({
      kind: "FOUNTAIN_HEALED",
      playerId,
      unitId: unit.id,
      at: fountain.at,
      amount,
      hpAfter: unit.hp + amount,
    });
  }
  if (healed.size === 0) return { state, events };
  return {
    state: {
      ...state,
      units: state.units.map((unit) => {
        const hp = healed.get(unit.id);
        return hp === undefined ? unit : { ...unit, hp };
      }),
    },
    events,
  };
}

/**
 * Section 6: whether `unit` could claim a Shrine: a land-form unit for which
 * `PROMOTE` would be legal if it had the kills (not a veteran, not a
 * growing Dinosaur unit).
 */
export function shrineEligibleV7(
  state: GameStateV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form" | "veteran">,
): boolean {
  return unit.form === "LAND" && !unit.veteran && !unitGrowsV7(state, unit);
}

/**
 * Sections 6 and 7: the claim of the curiosity under a unit that just ended
 * a `MOVE` on `at` (its state after the Move, form included). An eligible
 * unit on a Shrine is Promoted (+5 maximum HP, full heal, veteran) and the
 * Shrine leaves the board; an afloat unit on a Wreck salvages
 * `WRECK_COINS_V7` for `actor` and the Wreck leaves the board. Anything else
 * changes nothing (null).
 */
export function resolveCuriosityClaimV7(
  state: GameStateV7,
  actor: PlayerId,
  unit: UnitStateV7,
  at: CoordV7,
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} | null {
  const curiosity = curiosityAtV7(state, at);
  if (curiosity === null) return null;
  const remaining = state.curiosities.filter(
    (entry) => !sameCoordV7(entry.at, at),
  );
  if (curiosity.kind === "SHRINE") {
    if (!shrineEligibleV7(state, unit)) return null;
    const maxHp = unit.maxHp + PROMOTION_HP_V7;
    if (!Number.isSafeInteger(maxHp)) throw new RangeError("INTEGER_OVERFLOW");
    return {
      state: {
        ...state,
        curiosities: remaining,
        units: state.units.map((candidate) =>
          candidate.id === unit.id
            ? { ...candidate, veteran: true, maxHp, hp: maxHp }
            : candidate,
        ),
      },
      events: [
        { kind: "SHRINE_CLAIMED", playerId: actor, unitId: unit.id, at },
        { kind: "UNIT_PROMOTED", unitId: unit.id, maxHp },
      ],
    };
  }
  if (curiosity.kind === "WRECK") {
    if (!isAfloatFormV7(unit.form)) return null;
    return {
      state: {
        ...state,
        curiosities: remaining,
        players: state.players.map((player) => {
          if (player.id !== actor) return player;
          const coins = player.coins + WRECK_COINS_V7;
          if (!Number.isSafeInteger(coins))
            throw new RangeError("INTEGER_OVERFLOW");
          return { ...player, coins };
        }),
      },
      events: [
        {
          kind: "WRECK_SALVAGED",
          playerId: actor,
          unitId: unit.id,
          at,
          coins: WRECK_COINS_V7,
        },
      ],
    };
  }
  return null;
}

// ---------------------------------------------------------- Helpers ---

function chebyshevV7(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function eightNeighbours(board: BoardStateV7, index: number): number[] {
  const x = index % board.width;
  const y = Math.floor(index / board.width);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
      result.push(ny * board.width + nx);
    }
  return result;
}

function componentLabelsV7(
  board: BoardStateV7,
  member: (index: number) => boolean,
): readonly number[] {
  const labels = new Array<number>(board.tiles.length).fill(-1);
  let next = 0;
  for (let start = 0; start < labels.length; start += 1) {
    if (labels[start] !== -1 || !member(start)) continue;
    labels[start] = next;
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1)
      for (const near of eightNeighbours(board, queue[cursor] as number))
        if (labels[near] === -1 && member(near)) {
          labels[near] = next;
          queue.push(near);
        }
    next += 1;
  }
  return labels;
}
