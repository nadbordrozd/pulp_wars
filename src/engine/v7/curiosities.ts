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
  isAfloatFormV7,
  isDaemonBreedV7,
  isNeutralOwnerV7,
  type BoardStateV7,
  type CoordV7,
  type CuriosityV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type MonsterStateV7,
  type NeutralBreedV7,
  type TerrainIdV7,
  type UnitStateV7,
} from "./types";
import { tileOccupiedV7 } from "./units";

/**
 * Map curiosities (`pulp_wars-737.2` and `pulp_wars-737.3`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md): the rare neutral Fountain of
 * Youth, Shrine, Sunken Wreck, and the Giant Spider (the Monster). This
 * module holds their placement in map generation (section 4), the rule
 * helpers that Start Turn (the Fountain) and `MOVE` (the Shrine and the
 * Wreck) call, and the Monster's movement, targeting, wander draw, and
 * provocation helpers that the neutral turn of `END_TURN` uses (section 8).
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
 * Section 4.2 and, round 2, section 24.1: the kinds placement draws from,
 * in the frozen draw order. `MONSTER` (the Giant Spider's lair), the camp
 * centres, `GATES` (a pair of `GATE` markers), and `BIGFOOT` (its home)
 * bring neutral units; the others are plain tile markers.
 */
export const CURIOSITY_PLACEMENT_KINDS_V7 = Object.freeze([
  "MONSTER",
  "FOUNTAIN",
  "SHRINE",
  "WRECK",
  "DOWNED_SAUCER",
  "GRAVEYARD",
  "GATES",
  "BIGFOOT",
  "WISHING_WELL",
] as const);
export type CuriosityPlacementKindV7 =
  (typeof CURIOSITY_PLACEMENT_KINDS_V7)[number];

/** Section 24.1: the kind weights. */
export const CURIOSITY_WEIGHTS_V7: Readonly<
  Record<CuriosityPlacementKindV7, number>
> = Object.freeze({
  MONSTER: 3,
  FOUNTAIN: 3,
  SHRINE: 2,
  WRECK: 2,
  DOWNED_SAUCER: 2,
  GRAVEYARD: 2,
  GATES: 2,
  BIGFOOT: 1,
  WISHING_WELL: 1,
});

/**
 * Section 23 pillar 6 and section 24.1: the hostile neutral groups. Once one
 * is placed, the other two are not eligible (one danger per board).
 */
export const CURIOSITY_DANGER_KINDS_V7: readonly CuriosityPlacementKindV7[] =
  Object.freeze(["MONSTER", "DOWNED_SAUCER", "GRAVEYARD"]);

/** The terrains a kind may stand on (sections 4.4 and 24.1). */
const CURIOSITY_TERRAINS_V7: Readonly<
  Record<CuriosityPlacementKindV7 | "GATE", readonly TerrainIdV7[]>
> = Object.freeze({
  MONSTER: ["GRASS", "FOREST", "MOUNTAIN"],
  FOUNTAIN: ["GRASS"],
  SHRINE: ["GRASS", "FOREST"],
  WRECK: ["SHALLOW_WATER", "DEEP_WATER"],
  DOWNED_SAUCER: ["GRASS", "FOREST"],
  GRAVEYARD: ["GRASS"],
  GATES: ["GRASS", "FOREST"],
  GATE: ["GRASS", "FOREST"],
  BIGFOOT: ["FOREST"],
  WISHING_WELL: ["GRASS"],
});

/** Whether a curiosity of `kind` may stand on `terrain` (section 4.4). */
export function curiosityTerrainLegalV7(
  kind: CuriosityPlacementKindV7 | "GATE",
  terrain: TerrainIdV7,
): boolean {
  return CURIOSITY_TERRAINS_V7[kind].includes(terrain);
}

// ---------------------------------------------------------- Monster ---

/** Section 8.2: the Giant Spider's maximum HP. */
export const MONSTER_HP_V7 = 24;
/** Section 8.2: its Attack in half-units (3). */
export const MONSTER_ATTACK2_V7 = 6;
/** Section 8.2: its Defense in half-units (2). */
export const MONSTER_DEFENSE2_V7 = 4;
/** Section 8.3: its area is every tile within this Chebyshev distance. */
export const MONSTER_HOME_RADIUS_V7 = 2;
/** Section 8.5: HP it regenerates at the end of each neutral turn. */
export const MONSTER_REGENERATION_V7 = 4;
/** Section 8.7: the Coins its credited killer's owner gains. */
export const MONSTER_BOUNTY_V7 = 10;
/** Section 4.4: the smallest board width that may have a Monster. */
export const MONSTER_MINIMUM_WIDTH_V7 = 16;
/**
 * Section 4.4: minimum Chebyshev distance from home to every capital
 * center.
 */
export const MONSTER_CENTER_DISTANCE_V7 = 5;
/**
 * Minimum Chebyshev distance from home to every village center
 * (`pulp_wars-ykw.7`, `pulp-wars-poc-7r40`; 5 before, like a capital). On
 * the village-density boards almost no tile is 5 from every village, so the
 * lair may stand 4 from one: the Monster still never stands within 2 of a
 * center ({@link monsterStandableV7}), so it stays out of every territory,
 * and the part of its area nearer a village is simply closed to it.
 */
export const MONSTER_VILLAGE_DISTANCE_V7 = 4;
/**
 * Section 4.4: of the 24 tiles around home, at least this many are Grass,
 * Forest, or Mountain.
 */
export const MONSTER_LAND_AROUND_HOME_V7 = 12;

// ------------------------------------------------- Round 2 constants ---

/** Section 25.1: a camp's area is every tile within 2 of its centre. */
export const CAMP_RADIUS_V7 = 2;
/** Section 24.1: the smallest board width with a camp (open question 1). */
export const CAMP_MINIMUM_WIDTH_V7 = 16;
/** Section 24.1: the smallest board width with the gates or Bigfoot. */
export const GATES_MINIMUM_WIDTH_V7 = 20;
export const BIGFOOT_MINIMUM_WIDTH_V7 = 20;
/** Section 25.2: the guards' bounties. */
export const GRUNT_BOUNTY_V7 = 3;
export const RAY_GUNNER_BOUNTY_V7 = 4;
export const SHIELD_PROJECTOR_BOUNTY_V7 = 4;
export const ZOMBIE_BOUNTY_V7 = 5;
/** Section 29.1: Bigfoot. */
export const BIGFOOT_HP_V7 = 15;
export const BIGFOOT_DEFENSE2_V7 = 4;
export const BIGFOOT_HABITAT_RADIUS_V7 = 4;
export const BIGFOOT_ALERT_RADIUS_V7 = 3;
export const BIGFOOT_FLEE_STEPS_V7 = 3;
export const BIGFOOT_BOUNTY_V7 = 12;
/** Section 24.3: the smallest habitat at placement, home included. */
export const BIGFOOT_HABITAT_MINIMUM_V7 = 12;
/** Section 29.2: a habitat tile keeps this far from every curiosity tile. */
export const BIGFOOT_CURIOSITY_DISTANCE_V7 = 3;
/**
 * Section 24.4: the largest difference between the capitals' distances to
 * their nearer gate.
 */
export const GATE_FAIRNESS_V7 = 4;
/** Section 30: the Wishing Well. */
export const WELL_TOSS_COST_V7 = 1;
export const WELL_COINS_V7 = 5;
export const WELL_VISION_RADIUS_V7 = 5;

/**
 * Section 24.4: the smallest Chebyshev distance between the two gates,
 * `ceil(2 x width / 3)` (14 on 20 x 20, 17 on 25 x 25).
 */
export function gateSeparationV7(width: number): number {
  return Math.ceil((2 * width) / 3);
}

/**
 * Sections 8.7, 25.2, and 29.4: the bounty of each breed. The Cultists
 * (docs/product/RULESET_7_CULTISTS.md section 6.4): killing an Unbound
 * daemon pays no bounty Coins (its kill is worth its value in the Score).
 */
export const NEUTRAL_BOUNTIES_V7: Readonly<Record<NeutralBreedV7, number>> =
  Object.freeze({
    GIANT_SPIDER: 10,
    GRUNT: GRUNT_BOUNTY_V7,
    RAY_GUNNER: RAY_GUNNER_BOUNTY_V7,
    SHIELD_PROJECTOR: SHIELD_PROJECTOR_BOUNTY_V7,
    ZOMBIE: ZOMBIE_BOUNTY_V7,
    BIGFOOT: BIGFOOT_BOUNTY_V7,
    HORROR: 0,
    HERALD: 0,
  });

/** The guard breeds of a camp (section 25). */
export const GUARD_BREEDS_V7: readonly NeutralBreedV7[] = Object.freeze([
  "GRUNT",
  "RAY_GUNNER",
  "SHIELD_PROJECTOR",
  "ZOMBIE",
]);

/** Whether `breed` is a camp guard (section 25). */
export function isGuardBreedV7(breed: NeutralBreedV7): boolean {
  return GUARD_BREEDS_V7.includes(breed);
}

/** The camp centre kind a guard breed belongs to (section 32.2). */
export function guardCampKindV7(
  breed: NeutralBreedV7,
): "DOWNED_SAUCER" | "GRAVEYARD" | null {
  if (breed === "ZOMBIE") return "GRAVEYARD";
  if (
    breed === "GRUNT" ||
    breed === "RAY_GUNNER" ||
    breed === "SHIELD_PROJECTOR"
  )
    return "DOWNED_SAUCER";
  return null;
}

/**
 * Section 26: the four compositions of a Downed Saucer camp, by the
 * composition draw `nextBounded(4)`, each in composition order.
 */
export const SAUCER_COMPOSITIONS_V7: readonly (readonly NeutralBreedV7[])[] =
  Object.freeze([
    Object.freeze(["GRUNT"] as const),
    Object.freeze(["GRUNT", "GRUNT"] as const),
    Object.freeze(["GRUNT", "GRUNT", "SHIELD_PROJECTOR"] as const),
    Object.freeze(["GRUNT", "RAY_GUNNER"] as const),
  ]);
/** Section 27: the Graveyard's two Zombies. */
export const GRAVEYARD_GUARDS_V7: readonly NeutralBreedV7[] = Object.freeze([
  "ZOMBIE",
  "ZOMBIE",
]);
/**
 * Section 24.3: the guard tiles a camp centre needs among its eight
 * neighbours at generation.
 */
export const CAMP_GUARD_TILES_MINIMUM_V7 = Object.freeze({
  DOWNED_SAUCER: 3,
  GRAVEYARD: 2,
});

/** Section 30.2: the Wishing Well's outcomes, by the draw. */
export const WELL_OUTCOMES_V7 = Object.freeze([
  "SPLASH",
  "COINS",
  "HEAL",
  "VISION",
] as const);
export type WellOutcomeV7 = (typeof WELL_OUTCOMES_V7)[number];

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

/** The facts a curiosity site is checked against (sections 4.3 and 24). */
export interface CuriositySiteContextV7 {
  /** The accepted board after the Rifts. */
  readonly board: BoardStateV7;
  readonly mapType: MapTypeV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly treasureChests: readonly CoordV7[];
  /**
   * Section 24.1: the setup's seat factions (every seat, AI and human); a
   * Downed Saucer needs no `MARTIAN` entry and a Graveyard no `UNDEAD`
   * entry. Absent, no seat is excluded.
   */
  readonly factions?: readonly FactionIdV7[];
}

/**
 * The connectivity facts every site check shares, computed once per board:
 * the eight-connected land components (Rifts excluded), the land tiles
 * reachable from a capital without Mountains (the treasure-chest route),
 * the eight-connected water components, and (for the lairs, camps, gates,
 * and Bigfoot, sections 4.4 and 24.3) the cut tiles of the land graph with
 * and without Mountains.
 */
interface CuriosityConnectivityV7 {
  readonly land: readonly number[];
  readonly lowlandFromCapital: ReadonlySet<number>;
  readonly water: readonly number[];
  /** The land component of each capital. */
  readonly capitalLand: readonly number[];
  /** Per water component: the land components it touches orthogonally. */
  readonly waterTouches: ReadonlyMap<number, ReadonlySet<number>>;
  /**
   * Section 4.4: the cut tiles (articulation points) of the eight-connected
   * land graph (Rifts excluded), and of the same graph without Mountains.
   */
  readonly cutTiles: ReadonlySet<number>;
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
  const cutTiles = new Set<number>([
    ...articulationTilesV7(board, isLand),
    ...articulationTilesV7(board, lowland),
  ]);
  return {
    land,
    lowlandFromCapital,
    water,
    capitalLand: context.capitals.map(
      (capital) => land[capital.y * board.width + capital.x] ?? -1,
    ),
    waterTouches,
    cutTiles,
  };
}

/**
 * Section 4.4: the cut tiles of the eight-connected graph of `member`
 * tiles: removing one splits its component (Tarjan's articulation points,
 * iterative).
 */
function articulationTilesV7(
  board: BoardStateV7,
  member: (index: number) => boolean,
): readonly number[] {
  const count = board.tiles.length;
  const order = new Array<number>(count).fill(-1);
  const low = new Array<number>(count).fill(0);
  const cut = new Set<number>();
  let time = 0;
  for (let root = 0; root < count; root += 1) {
    if (order[root] !== -1 || !member(root)) continue;
    order[root] = time;
    low[root] = time;
    time += 1;
    let rootChildren = 0;
    const stack: { node: number; parent: number; next: number[] }[] = [
      {
        node: root,
        parent: -1,
        next: eightNeighbours(board, root).filter(member),
      },
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as (typeof stack)[number];
      const child = frame.next.shift();
      if (child === undefined) {
        stack.pop();
        const parent = stack[stack.length - 1];
        if (parent !== undefined) {
          low[parent.node] = Math.min(
            low[parent.node] as number,
            low[frame.node] as number,
          );
          if (
            parent.parent !== -1 &&
            (low[frame.node] as number) >= (order[parent.node] as number)
          )
            cut.add(parent.node);
        }
        continue;
      }
      if (child === frame.parent) continue;
      if (order[child] !== -1) {
        low[frame.node] = Math.min(
          low[frame.node] as number,
          order[child] as number,
        );
        continue;
      }
      order[child] = time;
      low[child] = time;
      time += 1;
      if (frame.node === root) rootChildren += 1;
      stack.push({
        node: child,
        parent: frame.node,
        next: eightNeighbours(board, child).filter(member),
      });
    }
    if (rootChildren > 1) cut.add(root);
  }
  return [...cut].sort((left, right) => left - right);
}

/** The lair-like kinds: the Spider's lair and the two camp centres. */
function lairLikeKindV7(kind: CuriosityPlacementKindV7 | "GATE"): boolean {
  return kind === "MONSTER" || kind === "DOWNED_SAUCER" || kind === "GRAVEYARD";
}

/**
 * Sections 4.3, 4.4, and 24.2 to 24.4: whether `at` is a legal tile for a
 * curiosity of `kind` (for the gates, `GATE`: one gate of a pair, before
 * the pair rule), with `placed` already on the board.
 */
function siteLegalV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  kind: CuriosityPlacementKindV7 | "GATE",
  placed: readonly PlacedCuriosityV7[],
  at: CoordV7,
): boolean {
  const { board } = context;
  const lairLike = lairLikeKindV7(kind);
  // Rule 1: off the edge ring. Section 4.4: the Spider's whole area is on
  // the board; section 24.3: so is a camp's.
  const margin = lairLike ? MONSTER_HOME_RADIUS_V7 : 1;
  if (
    at.x < margin ||
    at.y < margin ||
    at.x > board.width - 1 - margin ||
    at.y > board.height - 1 - margin
  )
    return false;
  const index = at.y * board.width + at.x;
  const tile = board.tiles[index];
  // Rule 2 and the kind's terrain: no site, chest, resource, improvement,
  // or Rift.
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
  // Rule 3: 3 or more from every settlement center; section 4.4: a lair (a
  // camp centre too, section 24.3) 5 or more from every capital and 4 or
  // more from every village.
  if (
    context.capitals.some(
      (center) =>
        chebyshevV7(center, at) <
        (lairLike ? MONSTER_CENTER_DISTANCE_V7 : CURIOSITY_CENTER_DISTANCE_V7),
    ) ||
    context.villages.some(
      (center) =>
        chebyshevV7(center, at) <
        (lairLike ? MONSTER_VILLAGE_DISTANCE_V7 : CURIOSITY_CENTER_DISTANCE_V7),
    )
  )
    return false;
  // Rule 4: 5 or more from every capital, and roughly between them (a gate
  // keeps only the first half, section 24.4).
  const distances = context.capitals.map((capital) => chebyshevV7(capital, at));
  if (
    distances.length === 0 ||
    Math.min(...distances) < CURIOSITY_CAPITAL_DISTANCE_V7 ||
    (kind !== "GATE" &&
      Math.max(...distances) - Math.min(...distances) >
        CURIOSITY_CAPITAL_SPREAD_V7)
  )
    return false;
  // Rule 5: 5 or more from every curiosity tile already placed.
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
  // a neutral island (reached by sea). A Monster's Mountain home is reached
  // when a tile next to it is (implementation note, section 17).
  const landmass = connectivity.land[index] ?? -1;
  if (landmass < 0) return false;
  const capitalsHere = connectivity.capitalLand.filter(
    (other) => other === landmass,
  ).length;
  if (capitalsHere === 1) return false;
  const reached =
    capitalsHere === 0 ||
    connectivity.lowlandFromCapital.has(index) ||
    (kind === "MONSTER" &&
      tile.terrain === "MOUNTAIN" &&
      eightNeighbours(board, index).some((near) =>
        connectivity.lowlandFromCapital.has(near),
      ));
  if (!reached) return false;
  // Section 24.4: a gate is never a cut tile.
  if (kind === "GATE") return !connectivity.cutTiles.has(index);
  if (kind === "BIGFOOT")
    return bigfootSiteLegalV7(context, connectivity, placed, at);
  if (!lairLike) return true;
  if (!monsterAreaLegalV7(board, connectivity, at)) return false;
  if (kind === "MONSTER") return true;
  // Section 24.3: the guard tiles around a camp centre.
  return (
    campGuardTilesAtGenerationV7(context, at).length >=
    CAMP_GUARD_TILES_MINIMUM_V7[kind as "DOWNED_SAUCER" | "GRAVEYARD"]
  );
}

/**
 * Section 4.4, the Monster's area (section 24.3, a camp's too): at least
 * {@link MONSTER_LAND_AROUND_HOME_V7} of the 24 tiles around home are
 * Grass, Forest, or Mountain, and no tile within
 * {@link MONSTER_HOME_RADIUS_V7} of home is a cut tile of the land graph,
 * with or without Mountains, so the Monster can never block a corridor.
 * (The area is on the board: the caller checked the margin.)
 */
function monsterAreaLegalV7(
  board: BoardStateV7,
  connectivity: CuriosityConnectivityV7,
  home: CoordV7,
): boolean {
  let land = 0;
  for (let dy = -MONSTER_HOME_RADIUS_V7; dy <= MONSTER_HOME_RADIUS_V7; dy += 1)
    for (
      let dx = -MONSTER_HOME_RADIUS_V7;
      dx <= MONSTER_HOME_RADIUS_V7;
      dx += 1
    ) {
      const index = (home.y + dy) * board.width + home.x + dx;
      if (connectivity.cutTiles.has(index)) return false;
      if (dx === 0 && dy === 0) continue;
      const terrain = board.tiles[index]?.terrain;
      if (terrain === "GRASS" || terrain === "FOREST" || terrain === "MOUNTAIN")
        land += 1;
    }
  return land >= MONSTER_LAND_AROUND_HOME_V7;
}

/**
 * Sections 24.1 and 25.3: the neighbours of a camp centre, in (y, x)
 * order, a guard may stand on at generation: Grass, Forest, or Mountain,
 * no settlement site, 3 or more from every settlement centre, and no
 * treasure chest (no unit or mound stands there at generation: the
 * starting units are on the capitals).
 */
function campGuardTilesAtGenerationV7(
  context: CuriositySiteContextV7,
  centre: CoordV7,
): readonly CoordV7[] {
  const { board } = context;
  const centers = [...context.capitals, ...context.villages];
  const tiles: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const at = { x: centre.x + dx, y: centre.y + dy };
      if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
        continue;
      const tile = board.tiles[at.y * board.width + at.x];
      if (
        tile === undefined ||
        tile.site !== null ||
        (tile.terrain !== "GRASS" &&
          tile.terrain !== "FOREST" &&
          tile.terrain !== "MOUNTAIN") ||
        centers.some(
          (center) => chebyshevV7(center, at) < CURIOSITY_CENTER_DISTANCE_V7,
        ) ||
        context.treasureChests.some((chest) => sameCoordV7(chest, at))
      )
        continue;
      tiles.push(at);
    }
  return tiles;
}

/**
 * Section 29.2: the habitat of a Bigfoot whose home is `home`: every tile
 * on the board within {@link BIGFOOT_HABITAT_RADIUS_V7} of home that is
 * Forest, 3 or more from every settlement centre in `centers`, and 3 or
 * more from every tile in `curiosityTiles` (every other curiosity tile on
 * the board: a lair, a camp centre, a gate, a Fountain, Shrine, Wreck, or
 * Well), in (y, x) order.
 */
export function bigfootHabitatV7(
  board: Pick<BoardStateV7, "width" | "height" | "tiles">,
  home: CoordV7,
  centers: readonly CoordV7[],
  curiosityTiles: readonly CoordV7[],
): readonly CoordV7[] {
  const habitat: CoordV7[] = [];
  for (
    let y = home.y - BIGFOOT_HABITAT_RADIUS_V7;
    y <= home.y + BIGFOOT_HABITAT_RADIUS_V7;
    y += 1
  )
    for (
      let x = home.x - BIGFOOT_HABITAT_RADIUS_V7;
      x <= home.x + BIGFOOT_HABITAT_RADIUS_V7;
      x += 1
    ) {
      if (x < 0 || y < 0 || x >= board.width || y >= board.height) continue;
      const at = { x, y };
      if (
        board.tiles[y * board.width + x]?.terrain !== "FOREST" ||
        centers.some(
          (center) => chebyshevV7(center, at) < CURIOSITY_CENTER_DISTANCE_V7,
        ) ||
        curiosityTiles.some(
          (tile) => chebyshevV7(tile, at) < BIGFOOT_CURIOSITY_DISTANCE_V7,
        )
      )
        continue;
      habitat.push(at);
    }
  return habitat;
}

/**
 * Section 24.3, Bigfoot: its habitat at placement has at least
 * {@link BIGFOOT_HABITAT_MINIMUM_V7} tiles, home included, and no Forest
 * tile within 4 of home that is 3 or more from every settlement centre is
 * a cut tile of the land graph, with or without Mountains.
 */
function bigfootSiteLegalV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  placed: readonly PlacedCuriosityV7[],
  home: CoordV7,
): boolean {
  const centers = [...context.capitals, ...context.villages];
  const habitat = bigfootHabitatV7(
    context.board,
    home,
    centers,
    placed.map((entry) => entry.at),
  );
  if (
    habitat.length < BIGFOOT_HABITAT_MINIMUM_V7 ||
    !habitat.some((at) => sameCoordV7(at, home))
  )
    return false;
  for (const at of bigfootHabitatV7(context.board, home, centers, []))
    if (connectivity.cutTiles.has(at.y * context.board.width + at.x))
      return false;
  return true;
}

/**
 * Section 24.1: whether the board and the seats allow a kind at all (the
 * board width, Dry Land for the Wreck, and the faction exclusions).
 */
function curiosityKindAllowedV7(
  context: CuriositySiteContextV7,
  kind: CuriosityPlacementKindV7,
): boolean {
  const width = context.board.width;
  const factions = context.factions ?? [];
  switch (kind) {
    case "MONSTER":
      return width >= MONSTER_MINIMUM_WIDTH_V7;
    case "WRECK":
      return context.mapType !== "DRY_LAND";
    case "DOWNED_SAUCER":
      return width >= CAMP_MINIMUM_WIDTH_V7 && !factions.includes("MARTIAN");
    case "GRAVEYARD":
      return width >= CAMP_MINIMUM_WIDTH_V7 && !factions.includes("UNDEAD");
    case "GATES":
      return width >= GATES_MINIMUM_WIDTH_V7;
    case "BIGFOOT":
      return width >= BIGFOOT_MINIMUM_WIDTH_V7;
    default:
      return true;
  }
}

function legalTilesV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  kind: CuriosityPlacementKindV7 | "GATE",
  placed: readonly PlacedCuriosityV7[],
): readonly CoordV7[] {
  return context.board.tiles
    .map((tile) => tile.at)
    .filter((at) => siteLegalV7(context, connectivity, kind, placed, at));
}

/**
 * Section 24.4: the legal gate pairs `[A, B]`, `A` before `B` in (y, x)
 * order, listed in lexicographic order of `(A, B)`: two gate tiles at
 * least {@link gateSeparationV7} apart, and fair to every start (the
 * largest capital's distance to its nearer gate minus the smallest is at
 * most {@link GATE_FAIRNESS_V7}).
 */
function gatePairsV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  placed: readonly PlacedCuriosityV7[],
): readonly (readonly [CoordV7, CoordV7])[] {
  const tiles = legalTilesV7(context, connectivity, "GATE", placed);
  const separation = gateSeparationV7(context.board.width);
  const pairs: (readonly [CoordV7, CoordV7])[] = [];
  for (let first = 0; first < tiles.length; first += 1)
    for (let second = first + 1; second < tiles.length; second += 1) {
      const a = tiles[first] as CoordV7;
      const b = tiles[second] as CoordV7;
      if (chebyshevV7(a, b) < separation) continue;
      const nearer = context.capitals.map((capital) =>
        Math.min(chebyshevV7(capital, a), chebyshevV7(capital, b)),
      );
      if (Math.max(...nearer) - Math.min(...nearer) > GATE_FAIRNESS_V7)
        continue;
      pairs.push([a, b]);
    }
  return pairs;
}

/**
 * Sections 4.3, 4.4, and 24: every legal site of `kind` on the board as it
 * stands (with `placed` already there), in (y, x) order: for `GATES`, the
 * tiles of the legal pairs (see {@link curiosityGatePairsV7}). Empty when
 * the board or the seats rule the kind out, or it is already placed. (The
 * one-danger rule is the placement loop's.)
 */
export function curiositySitesV7(
  context: CuriositySiteContextV7,
  kind: CuriosityPlacementKindV7,
  placed: readonly PlacedCuriosityV7[] = [],
): readonly CoordV7[] {
  if (
    !curiosityKindAllowedV7(context, kind) ||
    placed.some((curiosity) => curiosity.kind === kind)
  )
    return [];
  const connectivity = connectivityV7(context);
  if (kind === "GATES") {
    const tiles = new Map<string, CoordV7>();
    for (const pair of gatePairsV7(context, connectivity, placed))
      for (const at of pair) tiles.set(`${at.y},${at.x}`, at);
    return [...tiles.values()].sort(compareCoordsV7);
  }
  return legalTilesV7(context, connectivity, kind, placed);
}

/** Section 24.4: the legal gate pairs of the board as it stands. */
export function curiosityGatePairsV7(
  context: CuriositySiteContextV7,
  placed: readonly PlacedCuriosityV7[] = [],
): readonly (readonly [CoordV7, CoordV7])[] {
  if (
    !curiosityKindAllowedV7(context, "GATES") ||
    placed.some((curiosity) => curiosity.kind === "GATES")
  )
    return [];
  return gatePairsV7(context, connectivityV7(context), placed);
}

/**
 * A placed curiosity tile of any kind: the Spider's lair, a camp centre,
 * each gate of the pair (kind `GATES`), Bigfoot's home, or a marker.
 */
export interface PlacedCuriosityV7 {
  readonly kind: CuriosityPlacementKindV7;
  readonly at: CoordV7;
}

/**
 * A neutral unit placement draws (section 24.1): its breed, its home (the
 * lair, the camp centre, or Bigfoot's home), and the tile it starts on. The
 * initial state creates them after every other initial entity, in this
 * order (placement order, a camp's guards in composition order).
 */
export interface NeutralPlacementV7 {
  readonly breed: NeutralBreedV7;
  readonly home: CoordV7;
  readonly at: CoordV7;
}

/**
 * The result of placement: the tile markers (sorted by (y, x)) and the
 * neutral units to create.
 */
export interface CuriosityPlacementV7 {
  readonly curiosities: readonly CuriosityV7[];
  readonly neutrals: readonly NeutralPlacementV7[];
}

/**
 * Sections 4 and 24: places the curiosities of a generated board. The
 * target count comes from {@link curiosityTargetCountV7}; each curiosity in
 * turn draws one kind by weight among the eligible kinds (not yet placed,
 * allowed by the board and the seats, not excluded by the one-danger rule,
 * with a legal site or pair), in {@link CURIOSITY_PLACEMENT_KINDS_V7}
 * order, then one of its legal sites (for the gates, pairs) uniformly in
 * (y, x) order, then a Downed Saucer's composition draw and each guard's
 * tile draw (a Graveyard: two tile draws). With no eligible kind placement
 * stops. The board is never changed or rejected.
 */
export function placeCuriositiesV7(
  seed: number,
  context: CuriositySiteContextV7,
): CuriosityPlacementV7 {
  const target = curiosityTargetCountV7(
    context.board.width,
    curiosityRandomStateV7(seed),
  );
  let random = target.random;
  const draw = (bound: number): number => {
    const result = nextBounded(random, bound);
    random = result.random;
    return result.value;
  };
  const connectivity = target.count === 0 ? null : connectivityV7(context);
  const placed: PlacedCuriosityV7[] = [];
  const kindsPlaced: CuriosityPlacementKindV7[] = [];
  const curiosities: CuriosityV7[] = [];
  const neutrals: NeutralPlacementV7[] = [];
  while (connectivity !== null && kindsPlaced.length < target.count) {
    const danger = kindsPlaced.some((kind) =>
      CURIOSITY_DANGER_KINDS_V7.includes(kind),
    );
    const eligible = CURIOSITY_PLACEMENT_KINDS_V7.flatMap((kind) => {
      if (
        kindsPlaced.includes(kind) ||
        !curiosityKindAllowedV7(context, kind) ||
        (danger && CURIOSITY_DANGER_KINDS_V7.includes(kind))
      )
        return [];
      const sites: readonly (readonly CoordV7[])[] =
        kind === "GATES"
          ? gatePairsV7(context, connectivity, placed)
          : legalTilesV7(context, connectivity, kind, placed).map((at) => [at]);
      return sites.length === 0 ? [] : [{ kind, sites }];
    });
    if (eligible.length === 0) break;
    const total = eligible.reduce(
      (sum, entry) => sum + CURIOSITY_WEIGHTS_V7[entry.kind],
      0,
    );
    let remaining = draw(total);
    const chosen =
      eligible.find((entry) => {
        remaining -= CURIOSITY_WEIGHTS_V7[entry.kind];
        return remaining < 0;
      }) ?? (eligible.at(-1) as (typeof eligible)[number]);
    const site = chosen.sites[draw(chosen.sites.length)] as readonly CoordV7[];
    const at = site[0] as CoordV7;
    kindsPlaced.push(chosen.kind);
    for (const tile of site) placed.push({ kind: chosen.kind, at: tile });
    switch (chosen.kind) {
      case "MONSTER":
        neutrals.push({ breed: "GIANT_SPIDER", home: at, at });
        break;
      case "BIGFOOT":
        neutrals.push({ breed: "BIGFOOT", home: at, at });
        break;
      case "GATES": {
        const partner = site[1] as CoordV7;
        curiosities.push(
          { kind: "GATE", at, partner },
          { kind: "GATE", at: partner, partner: at },
        );
        break;
      }
      case "WISHING_WELL":
        curiosities.push({ kind: "WISHING_WELL", at, tossedBy: [] });
        break;
      case "DOWNED_SAUCER":
      case "GRAVEYARD": {
        curiosities.push({ kind: chosen.kind, at });
        const guards =
          chosen.kind === "DOWNED_SAUCER"
            ? (SAUCER_COMPOSITIONS_V7[
                draw(SAUCER_COMPOSITIONS_V7.length)
              ] as readonly NeutralBreedV7[])
            : GRAVEYARD_GUARDS_V7;
        const free = [...campGuardTilesAtGenerationV7(context, at)];
        for (const breed of guards) {
          const index = draw(free.length);
          const tile = free[index] as CoordV7;
          free.splice(index, 1);
          neutrals.push({ breed, home: at, at: tile });
        }
        break;
      }
      default:
        curiosities.push({ kind: chosen.kind, at });
    }
  }
  return {
    curiosities: curiosities.sort((left, right) =>
      compareCoordsV7(left.at, right.at),
    ),
    neutrals,
  };
}

// ------------------------------------------------------ Monster rules ---

/** The board facts the Monster's movement and targeting read (section 8). */
export interface MonsterBoardFactsV7 {
  readonly board: BoardStateV7;
  readonly units: readonly UnitStateV7[];
  readonly burrowed: GameStateV7["burrowed"];
  /** Dwarf crowd control (`pulp_wars-w49.33`): a Monster never steps on one. */
  readonly barricades: GameStateV7["barricades"];
  readonly treasureChests: readonly CoordV7[];
}

/** The `monsters` entry of `unitId`, if any. */
export function monsterEntryV7(
  state: Pick<GameStateV7, "monsters">,
  unitId: number,
): MonsterStateV7 | undefined {
  return state.monsters.length === 0
    ? undefined
    : state.monsters.find((entry) => entry.unitId === unitId);
}

/**
 * Section 8.3: the Monster's area, every tile on the board within
 * {@link MONSTER_HOME_RADIUS_V7} of `home`, in (y, x) order.
 */
export function monsterAreaV7(
  board: Pick<BoardStateV7, "width" | "height">,
  home: CoordV7,
): readonly CoordV7[] {
  const area: CoordV7[] = [];
  for (
    let y = home.y - MONSTER_HOME_RADIUS_V7;
    y <= home.y + MONSTER_HOME_RADIUS_V7;
    y += 1
  )
    for (
      let x = home.x - MONSTER_HOME_RADIUS_V7;
      x <= home.x + MONSTER_HOME_RADIUS_V7;
      x += 1
    )
      if (x >= 0 && y >= 0 && x < board.width && y < board.height)
        area.push({ x, y });
  return area;
}

/**
 * Section 8.3: whether the Monster whose home is `home` may stand on `at`:
 * on the board, in its area, Grass, Forest, or Mountain (never a Rift or
 * water), 3 or more from every settlement center, with no unit (other than
 * `exceptUnitId`), mound, or treasure chest.
 */
export function monsterStandableV7(
  facts: MonsterBoardFactsV7,
  home: CoordV7,
  at: CoordV7,
  exceptUnitId?: UnitStateV7["id"],
): boolean {
  if (chebyshevV7(home, at) > MONSTER_HOME_RADIUS_V7) return false;
  const { board } = facts;
  if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
    return false;
  const tile = board.tiles[at.y * board.width + at.x];
  if (
    tile === undefined ||
    tile.site !== null ||
    (tile.terrain !== "GRASS" &&
      tile.terrain !== "FOREST" &&
      tile.terrain !== "MOUNTAIN")
  )
    return false;
  for (const center of board.tiles)
    if (
      center.site !== null &&
      chebyshevV7(center.at, at) < CURIOSITY_CENTER_DISTANCE_V7
    )
      return false;
  return (
    !tileOccupiedV7(facts, at, exceptUnitId) &&
    !facts.treasureChests.some((chest) => sameCoordV7(chest, at))
  );
}

/**
 * Section 8.3: the tiles the Monster on `at` may step to, the standable
 * Chebyshev neighbours of `at`, in (y, x) order.
 */
export function monsterStepsV7(
  facts: MonsterBoardFactsV7,
  monster: Pick<UnitStateV7, "id" | "at">,
  home: CoordV7,
): readonly CoordV7[] {
  const steps: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const at = { x: monster.at.x + dx, y: monster.at.y + dy };
      if (monsterStandableV7(facts, home, at, monster.id)) steps.push(at);
    }
  return steps;
}

/**
 * Section 8.4: the provokers of a Monster at its turn: every unit on the
 * board (never another neutral unit) that stands next to it, in any form,
 * or is listed in its `provokedBy`, sorted by unit ID.
 */
export function monsterProvokersV7(
  facts: Pick<MonsterBoardFactsV7, "units">,
  monster: Pick<UnitStateV7, "id" | "at">,
  provokedBy: readonly number[],
): readonly UnitStateV7[] {
  return facts.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.id !== monster.id &&
      !isNeutralOwnerV7(unit.ownerId) &&
      (chebyshevV7(unit.at, monster.at) === 1 || provokedBy.includes(unit.id)),
  );
}

/**
 * Section 8.4: the attack a Monster makes this turn, or null when no
 * provoker is in reach. Candidates are the provokers adjacent now or
 * adjacent to a tile it may step to; the target is the one with the lowest
 * HP, ties broken by the lowest unit ID (a Shield does not count). When the
 * target is not adjacent, `step` is the first step tile, in (y, x) order,
 * next to it.
 */
export function monsterAttackChoiceV7(
  facts: MonsterBoardFactsV7,
  monster: Pick<UnitStateV7, "id" | "at">,
  entry: Pick<MonsterStateV7, "home" | "provokedBy">,
): { readonly target: UnitStateV7; readonly step: CoordV7 | null } | null {
  const steps = monsterStepsV7(facts, monster, entry.home);
  const candidates = monsterProvokersV7(
    facts,
    monster,
    entry.provokedBy,
  ).filter(
    (unit) =>
      chebyshevV7(unit.at, monster.at) === 1 ||
      steps.some((step) => chebyshevV7(step, unit.at) === 1),
  );
  const target = [...candidates].sort(
    (left, right) => left.hp - right.hp || left.id - right.id,
  )[0];
  if (target === undefined) return null;
  if (chebyshevV7(target.at, monster.at) === 1) return { target, step: null };
  const step = steps.find((at) => chebyshevV7(at, target.at) === 1);
  return step === undefined ? null : { target, step };
}

/**
 * Section 8.4: the stateless wander draw of a Monster with no reachable
 * provoker. The options are "stay" (null) followed by its step tiles in
 * (y, x) order, each equally likely, drawn by one `nextBounded` on a stream
 * seeded from the setup seed, the round, and the unit ID. It never touches
 * the match PRNG and needs no stored state.
 */
export function monsterWanderV7(
  seed: number,
  round: number,
  unitId: number,
  steps: readonly CoordV7[],
): CoordV7 | null {
  const options: (CoordV7 | null)[] = [null, ...steps];
  const draw = nextBounded(
    randomState(seedFromText(`pulp-wars-monster:${seed}:${round}:${unitId}`)),
    options.length,
  );
  return options[draw.value] ?? null;
}

// ------------------------------------------- Round 2: neutral units ---

/**
 * The board facts a round-2 neutral unit's movement and targeting read: the
 * Monster's facts plus the tile markers and the `monsters` list (Bigfoot's
 * habitat keeps clear of every curiosity tile, a Spider's lair included)
 * and, for a guard's shot from 2, which units are submerged.
 */
export interface NeutralBoardFactsV7 extends MonsterBoardFactsV7 {
  readonly curiosities: GameStateV7["curiosities"];
  readonly monsters: GameStateV7["monsters"];
  /** Naval branch section 5.2: a submerged unit is hit only from next to it. */
  readonly submerged?: (unit: UnitStateV7) => boolean;
}

/**
 * Section 29.2: every curiosity tile on the board other than Bigfoot's own
 * home: the tile markers (camp centres, gates, Fountains, Shrines, Wrecks,
 * the Well) and the Spider's lair.
 */
export function curiosityTilesV7(
  facts: Pick<NeutralBoardFactsV7, "curiosities" | "monsters">,
): readonly CoordV7[] {
  return [
    ...facts.curiosities.map((curiosity) => curiosity.at),
    ...facts.monsters
      .filter((entry) => entry.breed === "GIANT_SPIDER")
      .map((entry) => entry.home),
  ];
}

/** The settlement centres of a board (sites), in (y, x) order. */
function settlementCentersV7(board: BoardStateV7): readonly CoordV7[] {
  return board.tiles
    .filter((tile) => tile.site !== null)
    .map((tile) => tile.at);
}

/**
 * Sections 8.3, 25.3, and 29.2: whether the neutral unit of `entry` may
 * stand on `at` (with no unit other than `exceptUnitId`, no mound, and no
 * treasure chest there). The Spider: its area; a guard: its camp's area,
 * never the centre; Bigfoot: its habitat.
 */
export function neutralStandableV7(
  facts: NeutralBoardFactsV7,
  entry: Pick<MonsterStateV7, "breed" | "home">,
  at: CoordV7,
  exceptUnitId?: UnitStateV7["id"],
): boolean {
  // The Cultists (section 6.4): an Unbound daemon has no area; it moves by
  // the rampage rule (src/engine/v7/cult-unbound.ts), never by these steps.
  if (isDaemonBreedV7(entry.breed)) return false;
  if (entry.breed === "GIANT_SPIDER")
    return monsterStandableV7(facts, entry.home, at, exceptUnitId);
  if (entry.breed !== "BIGFOOT")
    return (
      !sameCoordV7(at, entry.home) &&
      monsterStandableV7(facts, entry.home, at, exceptUnitId)
    );
  const { board } = facts;
  if (
    chebyshevV7(entry.home, at) > BIGFOOT_HABITAT_RADIUS_V7 ||
    at.x < 0 ||
    at.y < 0 ||
    at.x >= board.width ||
    at.y >= board.height ||
    board.tiles[at.y * board.width + at.x]?.terrain !== "FOREST"
  )
    return false;
  if (
    settlementCentersV7(board).some(
      (center) => chebyshevV7(center, at) < CURIOSITY_CENTER_DISTANCE_V7,
    ) ||
    curiosityTilesV7(facts).some(
      (tile) => chebyshevV7(tile, at) < BIGFOOT_CURIOSITY_DISTANCE_V7,
    )
  )
    return false;
  return (
    !tileOccupiedV7(facts, at, exceptUnitId) &&
    !facts.treasureChests.some((chest) => sameCoordV7(chest, at))
  );
}

/**
 * Sections 8.3, 25.3, and 29.3: the tiles the neutral unit on `unit.at`
 * may step to, its standable Chebyshev neighbours in (y, x) order.
 */
export function neutralStepsV7(
  facts: NeutralBoardFactsV7,
  unit: Pick<UnitStateV7, "id" | "at">,
  entry: Pick<MonsterStateV7, "breed" | "home">,
): readonly CoordV7[] {
  const steps: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const at = { x: unit.at.x + dx, y: unit.at.y + dy };
      if (neutralStandableV7(facts, entry, at, unit.id)) steps.push(at);
    }
  return steps;
}

/**
 * Section 25.4: the provokers of the camp whose centre is `centre` at its
 * neutral turn, sorted by unit ID: every unit on the board that is not
 * neutral and, for a Downed Saucer, stands within 2 of the saucer (the
 * perimeter), stands next to a guard of the camp, or is listed in the
 * `provokedBy` of a guard of the camp; for a Graveyard, every such unit.
 */
export function campProvokersV7(
  facts: Pick<NeutralBoardFactsV7, "units" | "monsters" | "curiosities">,
  centre: CoordV7,
): readonly UnitStateV7[] {
  const kind = facts.curiosities.find((curiosity) =>
    sameCoordV7(curiosity.at, centre),
  )?.kind;
  const guards = facts.monsters.filter(
    (entry) => isGuardBreedV7(entry.breed) && sameCoordV7(entry.home, centre),
  );
  const guardUnits = facts.units.filter((unit) =>
    guards.some((entry) => entry.unitId === unit.id && unit.hp > 0),
  );
  return facts.units.filter(
    (unit) =>
      unit.hp > 0 &&
      !isNeutralOwnerV7(unit.ownerId) &&
      (kind === "GRAVEYARD" ||
        chebyshevV7(unit.at, centre) <= CAMP_RADIUS_V7 ||
        guardUnits.some((guard) => chebyshevV7(guard.at, unit.at) === 1) ||
        guards.some((entry) => entry.provokedBy.includes(unit.id))),
  );
}

/** The reach a neutral attacker's role rule gives it. */
export interface NeutralRangeV7 {
  readonly range: number;
  readonly minimumRange: number;
}

/**
 * Whether a neutral attacker on `from` may attack `target`: within its
 * range, and a submerged Submarine only from next to it.
 */
function neutralInRangeV7(
  facts: Pick<NeutralBoardFactsV7, "submerged">,
  from: CoordV7,
  target: UnitStateV7,
  reach: NeutralRangeV7,
): boolean {
  const distance = chebyshevV7(from, target.at);
  return (
    distance >= reach.minimumRange &&
    distance <= reach.range &&
    (distance <= 1 || facts.submerged?.(target) !== true)
  );
}

/**
 * Sections 8.4 and 25.4: the attack a Spider or a guard makes this turn,
 * or null when no provoker is in reach. Candidates are the `provokers` it
 * can attack from where it stands or from a tile it may step to; the target
 * is the one with the lowest HP, ties broken by the lowest unit ID (a
 * Shield does not count). With the target in range now it attacks without
 * a step; otherwise `step` is the first step tile, in (y, x) order, from
 * which the target is in range.
 */
export function neutralAttackChoiceV7(
  facts: NeutralBoardFactsV7,
  unit: Pick<UnitStateV7, "id" | "at">,
  steps: readonly CoordV7[],
  provokers: readonly UnitStateV7[],
  reach: NeutralRangeV7,
): { readonly target: UnitStateV7; readonly step: CoordV7 | null } | null {
  const candidates = provokers.filter(
    (target) =>
      neutralInRangeV7(facts, unit.at, target, reach) ||
      steps.some((step) => neutralInRangeV7(facts, step, target, reach)),
  );
  const target = [...candidates].sort(
    (left, right) => left.hp - right.hp || left.id - right.id,
  )[0];
  if (target === undefined) return null;
  if (neutralInRangeV7(facts, unit.at, target, reach))
    return { target, step: null };
  const step = steps.find((at) => neutralInRangeV7(facts, at, target, reach));
  return step === undefined ? null : { target, step };
}

/**
 * Section 29.3: Bigfoot's flight, or null when no unit that is not neutral
 * stands within {@link BIGFOOT_ALERT_RADIUS_V7} of it. Among the tiles it
 * can reach in 0 to {@link BIGFOOT_FLEE_STEPS_V7} steps (each to a
 * Chebyshev neighbour of its habitat it may stand on, never passing a
 * unit), it goes to the one with the greatest Chebyshev distance to the
 * nearest such unit on the board; ties by fewer steps, then (y, x). `path`
 * is the shortest step path there (empty when it stays).
 */
export function bigfootFleeV7(
  facts: NeutralBoardFactsV7,
  bigfoot: Pick<UnitStateV7, "id" | "at">,
  entry: Pick<MonsterStateV7, "breed" | "home">,
): { readonly path: readonly CoordV7[] } | null {
  const others = facts.units.filter(
    (unit) => unit.hp > 0 && !isNeutralOwnerV7(unit.ownerId),
  );
  if (
    !others.some(
      (unit) => chebyshevV7(unit.at, bigfoot.at) <= BIGFOOT_ALERT_RADIUS_V7,
    )
  )
    return null;
  const nearest = (at: CoordV7): number =>
    Math.min(...others.map((unit) => chebyshevV7(unit.at, at)));
  // Breadth-first over standable tiles, neighbours in (y, x) order, so the
  // recorded path to each tile is a shortest one and deterministic.
  const keyOf = (at: CoordV7): string => `${at.y},${at.x}`;
  const reached = new Map<
    string,
    { readonly at: CoordV7; readonly path: readonly CoordV7[] }
  >([[keyOf(bigfoot.at), { at: bigfoot.at, path: [] }]]);
  let frontier: { readonly at: CoordV7; readonly path: readonly CoordV7[] }[] =
    [{ at: bigfoot.at, path: [] }];
  for (let step = 0; step < BIGFOOT_FLEE_STEPS_V7; step += 1) {
    const next: typeof frontier = [];
    for (const node of frontier)
      for (const near of neutralStepsV7(
        facts,
        { id: bigfoot.id, at: node.at },
        entry,
      )) {
        if (reached.has(keyOf(near))) continue;
        const entryNode = { at: near, path: [...node.path, near] };
        reached.set(keyOf(near), entryNode);
        next.push(entryNode);
      }
    frontier = next;
  }
  const best = [...reached.values()].sort(
    (left, right) =>
      nearest(right.at) - nearest(left.at) ||
      left.path.length - right.path.length ||
      compareCoordsV7(left.at, right.at),
  )[0];
  return { path: best?.path ?? [] };
}

/**
 * Sections 25.6 and 29.4: the bounty the credited killer's owner gains for
 * a neutral unit of `breed`.
 */
export function neutralBountyV7(breed: NeutralBreedV7): number {
  return NEUTRAL_BOUNTIES_V7[breed];
}

// ------------------------------------------------- Round 2: the gates ---

/** Section 28: the gate on `at`, if any. */
export function gateAtV7(
  curiosities: readonly CuriosityV7[],
  at: CoordV7,
): Extract<CuriosityV7, { readonly kind: "GATE" }> | null {
  for (const curiosity of curiosities)
    if (curiosity.kind === "GATE" && sameCoordV7(curiosity.at, at))
      return curiosity;
  return null;
}

/**
 * Section 28.3: the clockwise order around an exit gate in which an
 * occupant is displaced: N, NE, E, SE, S, SW, W, NW.
 */
export const GATE_DISPLACEMENT_ORDER_V7: readonly (readonly [
  number,
  number,
])[] = Object.freeze([
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
]);

/**
 * Section 28.3: the tile an occupant of the exit gate is displaced to: the
 * first tile in {@link GATE_DISPLACEMENT_ORDER_V7} around `exit` that is on
 * the board, that `mayHold` accepts (the occupant's own terrain rule), and
 * that holds no unit, mound, treasure chest, or gate and is no settlement
 * centre; null when there is none (the traversal is blocked).
 */
export function gateDisplacementTileV7(
  facts: Pick<
    MonsterBoardFactsV7,
    "board" | "units" | "burrowed" | "treasureChests"
  > & {
    readonly curiosities: readonly CuriosityV7[];
  },
  exit: CoordV7,
  occupantId: UnitStateV7["id"],
  mayHold: (at: CoordV7) => boolean,
): CoordV7 | null {
  const { board } = facts;
  for (const [dx, dy] of GATE_DISPLACEMENT_ORDER_V7) {
    const at = { x: exit.x + dx, y: exit.y + dy };
    if (at.x < 0 || at.y < 0 || at.x >= board.width || at.y >= board.height)
      continue;
    const tile = board.tiles[at.y * board.width + at.x];
    if (
      tile === undefined ||
      tile.site !== null ||
      tileOccupiedV7(facts, at, occupantId) ||
      facts.treasureChests.some((chest) => sameCoordV7(chest, at)) ||
      gateAtV7(facts.curiosities, at) !== null ||
      !mayHold(at)
    )
      continue;
    return at;
  }
  return null;
}

// -------------------------------------------- Round 2: the Wishing Well ---

/**
 * Section 30.2: the outcome of `playerId`'s toss: one `nextBounded(4)` on a
 * stream keyed by the setup seed and the player, so it never touches the
 * match PRNG and does not depend on when, or with which unit, the player
 * tosses.
 */
export function wellOutcomeV7(seed: number, playerId: PlayerId): WellOutcomeV7 {
  const draw = nextBounded(
    randomState(seedFromText(`pulp-wars-well:${seed}:${playerId}`)),
    WELL_OUTCOMES_V7.length,
  );
  return WELL_OUTCOMES_V7[draw.value] as WellOutcomeV7;
}

/**
 * Section 10.2: drops the `monsters` entries of Monsters that left the
 * board and, from every `provokedBy`, the units no longer on it. Returns
 * `state` itself when nothing changes.
 */
export function prunedMonstersV7(state: GameStateV7): GameStateV7 {
  if (state.monsters.length === 0) return state;
  const onBoard = new Set(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.id),
  );
  let changed = false;
  const monsters: MonsterStateV7[] = [];
  for (const entry of state.monsters) {
    const unit = state.units.find((candidate) => candidate.id === entry.unitId);
    if (unit === undefined || unit.hp <= 0 || !isNeutralOwnerV7(unit.ownerId)) {
      changed = true;
      continue;
    }
    const provokedBy = entry.provokedBy.filter((id) => onBoard.has(id));
    if (provokedBy.length !== entry.provokedBy.length) changed = true;
    monsters.push(
      provokedBy.length === entry.provokedBy.length
        ? entry
        : { ...entry, provokedBy },
    );
  }
  return changed ? { ...state, monsters } : state;
}

/**
 * Section 8.4: the units that dealt a Monster damage in `events`: the
 * attacker of an `ATTACK` that hit it (as the target, by splash, Pierce, or
 * Sweep), a Banshee whose Wail or a Whirligig whose Whirl hit it, a
 * Gyrocopter whose bomb hit it, and a Mole whose eruption hit it. Kabooms and death blasts are made by units
 * that are dead by then, and Plague never reaches it, so they record
 * nobody. Keyed by the Monster's unit ID.
 */
export function monsterDamageSourcesV7(
  monsterIds: ReadonlySet<number>,
  events: readonly DomainEventV7[],
): ReadonlyMap<number, ReadonlySet<UnitStateV7["id"]>> {
  const sources = new Map<number, Set<UnitStateV7["id"]>>();
  const add = (monsterId: number, source: UnitStateV7["id"]): void => {
    if (!monsterIds.has(monsterId) || monsterIds.has(source)) return;
    let entry = sources.get(monsterId);
    if (entry === undefined) {
      entry = new Set();
      sources.set(monsterId, entry);
    }
    entry.add(source);
  };
  for (const event of events) {
    if (event.kind === "COMBAT_RESOLVED") {
      const preview = event.preview;
      if (preview.damageToDefender + preview.defenderShieldDamage > 0)
        add(preview.targetUnitId, preview.attackerId);
      for (const entry of preview.splash)
        if (entry.damage + entry.shieldDamage > 0)
          add(entry.unitId, preview.attackerId);
    } else if (
      event.kind === "WAIL_RESOLVED" ||
      // Dwarf crowd control (`pulp_wars-w49.33`): a Whirl hits like a Wail.
      event.kind === "WHIRL_RESOLVED"
    ) {
      for (const entry of event.results)
        if (entry.damage + entry.shieldDamage > 0)
          add(entry.unitId, event.unitId);
    } else if (event.kind === "UNIT_BOMBED") {
      if (event.damage + event.shieldDamage > 0)
        add(event.targetUnitId, event.unitId);
    } else if (event.kind === "UNIT_SURFACED") {
      for (const entry of event.results)
        if (entry.damage + entry.shieldDamage > 0)
          add(entry.unitId, event.unitId);
    } else if (
      // The giants' signatures (RULESET_7_GIANTS.md sections 6.4 and 6.5):
      // a Thunder Stomp and an Overstride's trample provoke like an attack;
      // so does the Mammoth's Stampede (Ice Folk Freeze, `pulp_wars-w49.37`).
      event.kind === "THUNDER_STOMP" ||
      event.kind === "UNITS_TRAMPLED" ||
      event.kind === "MAMMOTH_STAMPEDED"
    ) {
      for (const entry of event.results)
        if (entry.damage + entry.shieldDamage > 0)
          add(entry.unitId, event.unitId);
    } else if (event.kind === "UNIT_CRUSHED") {
      // Section 6.1: the crush and the collision of a Juggernaut.
      if (event.damage + event.shieldDamage > 0)
        add(event.targetUnitId, event.sourceUnitId);
      if (
        event.blockerUnitId !== null &&
        event.blockerDamage + event.blockerShieldDamage > 0
      )
        add(event.blockerUnitId, event.sourceUnitId);
    }
  }
  return sources;
}

/**
 * Section 8.4: adds every unit on the board that damaged a Monster in
 * `events` to its `provokedBy` (sorted, without duplicates). Returns
 * `state` itself when nothing changes.
 */
export function withMonsterProvocationsV7(
  state: GameStateV7,
  events: readonly DomainEventV7[],
): GameStateV7 {
  if (state.monsters.length === 0) return state;
  const sources = monsterDamageSourcesV7(
    new Set(state.monsters.map((entry) => entry.unitId)),
    events,
  );
  if (sources.size === 0) return state;
  const onBoard = new Set(
    state.units
      .filter((unit) => unit.hp > 0 && !isNeutralOwnerV7(unit.ownerId))
      .map((unit) => unit.id),
  );
  let changed = false;
  const monsters = state.monsters.map((entry) => {
    // The Cultists (section 6.4): nobody provokes an Unbound daemon; it
    // goes for the nearest unit whoever hurt it.
    if (isDaemonBreedV7(entry.breed)) return entry;
    const added = [...(sources.get(entry.unitId) ?? [])].filter(
      (id) => onBoard.has(id) && !entry.provokedBy.includes(id),
    );
    if (added.length === 0) return entry;
    changed = true;
    return {
      ...entry,
      provokedBy: [...entry.provokedBy, ...added].sort(
        (left, right) => left - right,
      ),
    };
  });
  return changed ? { ...state, monsters } : state;
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
    // The frozen sea (naval branch section 8.11): a Wreck under ice is
    // salvaged by a land-form unit (it stands on water only on ice).
    if (!isAfloatFormV7(unit.form) && unit.form !== "LAND") return null;
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
