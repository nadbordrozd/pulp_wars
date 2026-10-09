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
  isNeutralOwnerV7,
  type BoardStateV7,
  type CoordV7,
  type CuriosityV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type MonsterStateV7,
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
 * Section 4.2: the kinds placement draws from, in the frozen draw order:
 * the Monster (`pulp_wars-737.3`, a unit with its own list, never a tile
 * marker) first, then the three tile markers of {@link CURIOSITY_KINDS_V7}.
 */
export const CURIOSITY_PLACEMENT_KINDS_V7 = Object.freeze([
  "MONSTER",
  ...CURIOSITY_KINDS_V7,
] as const);
export type CuriosityPlacementKindV7 =
  (typeof CURIOSITY_PLACEMENT_KINDS_V7)[number];

/** Section 4.2: the kind weights (Monster 3, Fountain 3, Shrine 2, Wreck 2). */
export const CURIOSITY_WEIGHTS_V7: Readonly<
  Record<CuriosityPlacementKindV7, number>
> = Object.freeze({ MONSTER: 3, FOUNTAIN: 3, SHRINE: 2, WRECK: 2 });

/** The terrains a kind may stand on (section 4.4). */
const CURIOSITY_TERRAINS_V7: Readonly<
  Record<CuriosityPlacementKindV7, readonly TerrainIdV7[]>
> = Object.freeze({
  MONSTER: ["GRASS", "FOREST", "MOUNTAIN"],
  FOUNTAIN: ["GRASS"],
  SHRINE: ["GRASS", "FOREST"],
  WRECK: ["SHALLOW_WATER", "DEEP_WATER"],
});

/** Whether a curiosity of `kind` may stand on `terrain` (section 4.4). */
export function curiosityTerrainLegalV7(
  kind: CuriosityPlacementKindV7,
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
 * the eight-connected water components, and (for the Monster, section 4.4)
 * the cut tiles of the land graph with and without Mountains.
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

/**
 * Sections 4.3 and 4.4: whether `at` is a legal site for a curiosity of
 * `kind`, with `placed` already on the board.
 */
function siteLegalV7(
  context: CuriositySiteContextV7,
  connectivity: CuriosityConnectivityV7,
  kind: CuriosityPlacementKindV7,
  placed: readonly PlacedCuriosityV7[],
  at: CoordV7,
): boolean {
  const { board } = context;
  // Rule 1: off the edge ring. Section 4.4: the Monster's whole area is on
  // the board.
  const margin = kind === "MONSTER" ? MONSTER_HOME_RADIUS_V7 : 1;
  if (
    at.x < margin ||
    at.y < margin ||
    at.x > board.width - 1 - margin ||
    at.y > board.height - 1 - margin
  )
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
  // Rule 3: 3 or more from every settlement center; section 4.4: the
  // Monster's home 5 or more from every capital and 4 or more from every
  // village (5 from every center before `pulp_wars-ykw.7`).
  const monster = kind === "MONSTER";
  if (
    context.capitals.some(
      (center) =>
        chebyshevV7(center, at) <
        (monster ? MONSTER_CENTER_DISTANCE_V7 : CURIOSITY_CENTER_DISTANCE_V7),
    ) ||
    context.villages.some(
      (center) =>
        chebyshevV7(center, at) <
        (monster ? MONSTER_VILLAGE_DISTANCE_V7 : CURIOSITY_CENTER_DISTANCE_V7),
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
  return kind !== "MONSTER" || monsterAreaLegalV7(board, connectivity, at);
}

/**
 * Section 4.4, the Monster's area: at least
 * {@link MONSTER_LAND_AROUND_HOME_V7} of the 24 tiles around home are Grass,
 * Forest, or Mountain, and no tile within {@link MONSTER_HOME_RADIUS_V7} of
 * home is a cut tile of the land graph, with or without Mountains, so the
 * Monster can never block a corridor. (The area is on the board: the caller
 * checked the margin.)
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
 * Sections 4.3 and 4.4: every legal site of `kind` on the board as it
 * stands (with `placed` already there), in (y, x) order. A Wreck needs a
 * map with water (never Dry Land).
 */
export function curiositySitesV7(
  context: CuriositySiteContextV7,
  kind: CuriosityPlacementKindV7,
  placed: readonly PlacedCuriosityV7[] = [],
): readonly CoordV7[] {
  if (kind === "WRECK" && context.mapType === "DRY_LAND") return [];
  if (kind === "MONSTER" && context.board.width < MONSTER_MINIMUM_WIDTH_V7)
    return [];
  if (placed.some((curiosity) => curiosity.kind === kind)) return [];
  const connectivity = connectivityV7(context);
  return context.board.tiles
    .map((tile) => tile.at)
    .filter((at) => siteLegalV7(context, connectivity, kind, placed, at));
}

/** A placed curiosity of any kind, the Monster's home included. */
export interface PlacedCuriosityV7 {
  readonly kind: CuriosityPlacementKindV7;
  readonly at: CoordV7;
}

/**
 * The result of placement: the tile markers (sorted by (y, x)) and the
 * Monster's home, if a Monster was placed.
 */
export interface CuriosityPlacementV7 {
  readonly curiosities: readonly CuriosityV7[];
  readonly monsterHome: CoordV7 | null;
}

/**
 * Section 4: places the curiosities of a generated board. The target count
 * comes from {@link curiosityTargetCountV7}; each curiosity in turn draws
 * one kind by weight among the eligible kinds (not yet placed, allowed by
 * the board, with a legal site), in {@link CURIOSITY_PLACEMENT_KINDS_V7}
 * order, then one of its legal sites uniformly in (y, x) order. With no
 * eligible kind placement stops. The board is never changed or rejected.
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
  const placed: PlacedCuriosityV7[] = [];
  while (placed.length < target.count) {
    const eligible = CURIOSITY_PLACEMENT_KINDS_V7.flatMap((kind) => {
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
  const curiosities: CuriosityV7[] = [];
  for (const entry of placed)
    if (entry.kind !== "MONSTER")
      curiosities.push({ kind: entry.kind, at: entry.at });
  return {
    curiosities: curiosities.sort((left, right) =>
      compareCoordsV7(left.at, right.at),
    ),
    monsterHome: placed.find((entry) => entry.kind === "MONSTER")?.at ?? null,
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
      // a Thunder Stomp and an Overstride's trample provoke like an attack.
      event.kind === "THUNDER_STOMP" ||
      event.kind === "UNITS_TRAMPLED"
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
