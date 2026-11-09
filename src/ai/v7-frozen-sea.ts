import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  COLD_SNAP_RANGE_V7,
  isIceAtV7,
  technologyCapabilitiesV7,
  unitIsFrozenV7,
  unitMayActAfterMoveV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { ownIceChainPairsV7, seaLinksOverOwnIceV7 } from "../engine/v7/economy";
import { forbiddenTechnologiesV7 } from "../engine/v7/forbidden-technologies";
import { iceAtV7, unitIsIceFolkGroundV7 } from "../engine/v7/ice";
import {
  previewColdSnapV7,
  previewColdWakeV7,
  previewCrackIceV7,
  publicIceLinkPopulationGainV7,
  queryCombatPreviewV7,
  type CrackIcePreviewV7,
} from "../engine/v7/query";
import type { CoordV7, TechnologyIdV7 } from "../engine/v7/types";
import type {
  PlayerViewV7,
  PublicIceTileV7,
  PublicUnitV7,
} from "../engine/v7/view";

/**
 * The frozen sea for the Normal AI (`pulp_wars-5ti.5`,
 * docs/product/RULESET_7_NAVAL_BRANCH.md sections 13.2 and 13.3, rules in
 * docs/product/RULESET_7_CURRENT.md section 21.16).
 *
 * **An Ice Folk seat** has no ship and so no naval plan; it has an ice plan
 * (`iceSeaPlanV7`): the crossing it freezes toward an objective it cannot
 * walk to, the builder that freezes it, and the wave that waits at its head
 * and walks across. The one Freeze effect (`pulp_wars-xv0t`, 7r133): the
 * builder is an Ice Witch, who casts her Cold Snap from the crossing's tip,
 * or a Frost Giant, whose Cold Wake freezes the ring around every tile it
 * ends a Move on (it walks out along the crossing, one new tile a Move).
 * The same seat mends and retakes its crossing with them, freezes the
 * water of its own territory for the buildings it can put on the ice and
 * beside a threatened center, and researches its ice technologies when
 * the board asks for them. (The `FREEZE` command of every role is gone.)
 *
 * **Every seat** plays against the ice: a ship stays out of the reach of a
 * hostile Witch's Cold Snap and a hostile Frost Giant's Cold
 * Wake (`pulp_wars-xv0t`), a land unit does not end a Move on
 * hostile ice (Black Ice is assumed, research being private), a transport
 * lands beside the ice, and every other seat Cracks the ice
 * (`iceCrackScoreV7`) to open an own or allied dock iced over, to break a
 * bridge that threatens a center, and to open its ships' way. The threat
 * estimate follows Ice Folk movement: Glide (`pulp_wars-ecnj`, 7r135; Skate
 * and Runners before) makes a step between frozen tiles, Snow or ice, cost
 * half, and a Fishing Hole dive reaches every other own hole.
 *
 * The frozen sea redesign (`pulp_wars-5ti.26`,
 * docs/product/RULESET_7_ICE_REDESIGN.md section 3): ice is permanent, so no
 * rule here reads a thaw.
 *
 * Every function reads only the viewer's public view and the public
 * previews (`previewColdSnapV7`, `previewColdWakeV7`, `previewCrackIceV7`),
 * draws nothing from the PRNG, and returns its neutral value at once in a
 * view without ice, without an Ice Folk seat, or (the plan) without water:
 * Dry Land and every match without an Ice Folk seat decide as before.
 */

// --- Priorities and values ---------------------------------------------------

/** Rime or Pack Ice for a crossing the plan needs (the naval plan's own research has 1280 too). */
export const ICE_SEA_PLAN_RESEARCH_PRIORITY_V7 = 1280;
/** Harpoons when the board asks (the due naval research of a seafaring seat has 1170 too). */
export const ICE_SEA_DUE_RESEARCH_PRIORITY_V7 = 1170;
/**
 * The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): Under the Ice and
 * the Ice Fortress, last: above the generic research, below training.
 */
export const ICE_SEA_LATE_RESEARCH_PRIORITY_V7 = 1075;
/** Under the Ice once the seat has this many Fishing Holes (its +1 population each). */
export const ICE_UNDER_THE_ICE_HOLES_V7 = 2;
/** A hostile ship this close to an own city center asks for Rime and for home ice. */
export const ICE_SEA_HOME_RADIUS_V7 = 3;
/** A hostile unit afloat this close to own territory asks for Harpoons. */
export const ICE_SEA_HARPOON_RADIUS_V7 = 3;
/** A crossing tile this close to a visible hostile Battleship is avoided. */
export const ICE_SEA_BATTLESHIP_RADIUS_V7 = 3;
/** The Witch builds a crossing whose stand tile is within this many tiles of her. */
export const ICE_SEA_WITCH_BUILDER_RADIUS_V7 = 6;
/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): the crossing tiles the
 * wave lets the builder still freeze when it goes (a Witch's next Cold
 * Snap or a Frost Giant's next Move freezes one tile of the crossing).
 */
export const ICE_SEA_READY_GAP_V7 = 1;
/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): an Ice Witch's training
 * value while the crossing still to build has no builder (no own Witch and
 * no own Frost Giant): her Cold Snaps build it.
 */
export const ICE_BUILDER_TRAINING_BIAS_V7 = 30;
/**
 * A builder's Move to the tile it freezes the crossing from (a Frost
 * Giant's Cold Wake does it on arrival): before its Cold Snap.
 */
export const ICE_BUILD_MOVE_PRIORITY_V7 = 1112;
/** A Cold Snap that extends the crossing (or fills a gap a Crack broke in it): below every kill, above routine Moves. */
export const ICE_BRIDGE_FREEZE_PRIORITY_V7 = 1110;
/** A Cold Snap that takes back a crossing tile another seat holds. */
export const ICE_MEND_PRIORITY_V7 = 1109;
/** The wave's Move onto and along a crossing that is ready. */
export const ICE_CROSS_MOVE_PRIORITY_V7 = 1108;
/** The wave's walk to the head of the crossing: a routine Move with a goal. */
export const ICE_STAGE_MOVE_PRIORITY_V7 = 720;
/**
 * A Cold Snap that ices own-territory water a building on offer would use,
 * or beside a threatened center, by a Witch with nothing better to do.
 */
export const ICE_HOME_FREEZE_PRIORITY_V7 = 712;
/** An attack on a unit that stands on ice: it has no terrain cover and cannot be fortified. */
export const ICE_EXPOSED_TARGET_VALUE_V7 = 3;
/** A Crack that breaks a hostile bridge near an own center: below kills and defence, above routine Moves. */
export const ICE_CRACK_HOME_PRIORITY_V7 = 1108;
/** A ship's Crack of the ice that is the next step of its route. */
export const ICE_CRACK_LANE_PRIORITY_V7 = 1107;
/**
 * Sea routes over ice only (`pulp_wars-dy2b`, 7r138): a Cold Snap that
 * fills a gap in the seat's own ice chain between two Fishing Holes, so
 * that a sea link (its link population) forms: below the crossing's
 * freezes, above home ice and routine Moves.
 */
export const ICE_LINK_FREEZE_PRIORITY_V7 = 1106;
/** The strategic value of each point of link population a freeze makes. */
export const ICE_LINK_FREEZE_VALUE_V7 = 8;
/**
 * Sea routes over ice only (`pulp_wars-dy2b`, 7r138): a Crack of a chain
 * tile that breaks a hostile Ice Folk sea link (below the bridge and lane
 * Cracks).
 */
export const ICE_CRACK_LINK_PRIORITY_V7 = 1106;
/** The strategic value of each hostile city pair a Crack unlinks. */
export const ICE_CRACK_LINK_VALUE_V7 = 8;
/** Hostile ice this close to an own city center is a bridge worth breaking. */
export const ICE_CRACK_HOME_RADIUS_V7 = 3;
/** ...when a hostile Ice Folk unit is visible this close to that center. */
export const ICE_CRACK_SLIDER_RADIUS_V7 = 6;
/** The naval route search: a tile of crackable ice costs this many steps more than water. */
export const ICE_LANE_EXTRA_STEPS_V7 = 2;

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const keyOf = (at: CoordV7): string => `${String(at.x)},${String(at.y)}`;
const afloat = (unit: PublicUnitV7): boolean =>
  unit.form === "NAVAL" || unit.form === "EMBARKED";

type ExploredTileV7 = Extract<
  PlayerViewV7["board"]["tiles"][number],
  { explored: true }
>;

function exploredTile(
  view: PlayerViewV7,
  at: CoordV7,
): ExploredTileV7 | undefined {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= view.board.width ||
    at.y >= view.board.height
  )
    return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile?.explored === true && same(tile.at, at) ? tile : undefined;
}

function iceEntry(
  view: PlayerViewV7,
  at: CoordV7,
): PublicIceTileV7 | undefined {
  return iceAtV7(view, at);
}

const isDock = (tile: ExploredTileV7): boolean =>
  tile.improvement === "PORT" || tile.improvement === "SHIPYARD";
const isWater = (tile: ExploredTileV7): boolean => tile.biome === null;

/**
 * What the policy lends these rules: its hostility and alliance tests, its
 * threat estimate (`danger`: the damage the visible hostile units can deal
 * `unit` on `at` on their next turn), and `standTiles`: the tiles a visible
 * hostile unit can stand on and still use its primary action this turn (its
 * own tile, and every tile its Move reaches when it may act after a Move;
 * every tile its Move reaches for a Frost Giant,
 * whose Cold Wake freezes on arrival).
 */
export interface FrozenSeaToolsV7 {
  readonly isHostile: (ownerId: PlayerId) => boolean;
  readonly isAllied: (ownerId: PlayerId) => boolean;
  readonly danger: (
    view: PlayerViewV7,
    unit: PublicUnitV7,
    at: CoordV7,
  ) => number;
  readonly standTiles: (hostile: PublicUnitV7) => readonly CoordV7[];
  /** The objective the policy's tactical plan gave an own unit, if any. */
  readonly objective: (unitId: UnitId) => CoordV7 | undefined;
  readonly commands: readonly CommandV7[];
  /**
   * The frozen sea redesign: the public water route an own unit afloat
   * follows (the naval plan's steps to its goal, per tile; ice costs
   * `iceRouteStepCostV7`), or null when it has none.
   */
  readonly route: (
    unit: PublicUnitV7,
  ) => ((at: CoordV7) => number | undefined) | null;
  /**
   * The frozen sea redesign: whether an own or allied land unit needs the
   * ice on `at` for a Move this turn (an own unit's Move the policy would
   * consider passes over it, or an allied unit stands on ice beside it).
   */
  readonly plannedThrough: (at: CoordV7) => boolean;
}

// --- The ice plan ----------------------------------------------------------------

/** The ice plan of an Ice Folk seat at one decision (section 13.2). */
export interface IcePlanV7 {
  /** The objective the crossing leads to: a hostile city, else a neutral village. */
  readonly target: CoordV7;
  /**
   * The target can be walked to and the crossing is the shorter way (by
   * more than three steps): only the units bound for it take the crossing.
   * False when every known objective is overseas: then every unit does.
   */
  readonly shortcut: boolean;
  /** The chain of water tiles, from the tile next to home land to the tile next to the target's land. */
  readonly crossing: readonly CoordV7[];
  /** The home land tile the crossing starts from (its head). */
  readonly head: CoordV7;
  /**
   * The index of the first crossing tile that is not ice (`crossing.length`
   * when all are). Ice is permanent, so a tile short of the tip that is not
   * ice is a gap a Crack broke; it is the next tile to freeze.
   */
  readonly next: number;
  /** The crossing tiles that are not ice. */
  readonly unfrozen: number;
  /** Every crossing tile is ice. */
  readonly complete: boolean;
  /** The crossing is complete or one tile short of it: the wave goes. */
  readonly ready: boolean;
  /** An unfrozen crossing tile is Deep Water and the seat has no Pack Ice. */
  readonly needsPackIce: boolean;
  /**
   * Where a builder stands to freeze the next tile (the head on the shore,
   * then the newest crossing ice: it is next to the next tile); null when
   * complete.
   */
  readonly stand: CoordV7 | null;
  /**
   * The unit with the Build job (none or one: ice is permanent, a crossing
   * is built once): a near own Witch, else an own Frost Giant, else the
   * nearest own Witch (`pulp_wars-xv0t`).
   */
  readonly builders: readonly UnitId[];
  /** Route steps to the target over ground, ice, and the crossing, by tile key. */
  readonly steps: ReadonlyMap<string, number>;
}

const ICE_PLAN_CACHE_V7 = new WeakMap<PlayerViewV7, IcePlanV7 | null>();

/** Whether the viewer's tree is the ice tree (Shorecraft there is Rime). */
export function iceSeaSeatV7(view: PlayerViewV7): boolean {
  return (
    technologyCapabilitiesV7(["SHORECRAFT"], view.viewer.faction)
      .freezeWater !== "NONE"
  );
}

/**
 * The border freeze (`pulp_wars-5ti.31`): the water a Land Grant of the
 * viewer's city at `cityAt` would freeze: the explored water of the city's
 * 5 x 5 footprint that is its territory or neutral (the grant claims it)
 * and is not the viewer's own sound ice, Shallow, or Deep with Pack Ice.
 * Each such tile is new ground for a Fishing Hole or a mill. 0 for a seat
 * without Rime, so no other seat's grant is valued differently. A
 * planning estimate: it does not test ships or other seats' ice.
 */
export function landGrantIceTilesV7(
  view: PlayerViewV7,
  cityId: number,
  cityAt: CoordV7,
): number {
  const freezeWater = technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).freezeWater;
  if (freezeWater === "NONE") return 0;
  let count = 0;
  for (let y = cityAt.y - 2; y <= cityAt.y + 2; y += 1)
    for (let x = cityAt.x - 2; x <= cityAt.x + 2; x += 1) {
      const tile = exploredTile(view, { x, y });
      if (tile === undefined) continue;
      if (
        tile.terrain !== "SHALLOW_WATER" &&
        !(tile.terrain === "DEEP_WATER" && freezeWater === "DEEP")
      )
        continue;
      if (
        tile.territoryCityId !== cityId &&
        !(tile.territoryCityId === null && tile.territoryOwnerId === null)
      )
        continue;
      // The one Freeze effect (`pulp_wars-xv0t`, 7r133): a dock never
      // freezes.
      if (tile.improvement === "PORT" || tile.improvement === "SHIPYARD")
        continue;
      const ice = iceAtV7(view, tile.at);
      if (ice !== undefined && ice.ownerId === view.viewer.id) continue;
      count += 1;
    }
  return count;
}

interface CrossingV7 {
  readonly tiles: readonly CoordV7[];
  readonly head: CoordV7;
  readonly landing: CoordV7;
}

/** A binary min-heap of `[cost, state]`, ordered by cost and then by state. */
class CostHeapV7 {
  private readonly items: (readonly [number, number])[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: readonly [number, number]): void {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!CostHeapV7.less(items[index], items[parent])) break;
      [items[index], items[parent]] = [
        items[parent] as readonly [number, number],
        items[index] as readonly [number, number],
      ];
      index = parent;
    }
  }
  pop(): readonly [number, number] | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (top === undefined || last === undefined) return undefined;
    if (items.length === 0) return top;
    items[0] = last;
    let index = 0;
    for (;;) {
      const left = 2 * index + 1;
      const right = left + 1;
      let least = index;
      if (CostHeapV7.less(items[left], items[least])) least = left;
      if (CostHeapV7.less(items[right], items[least])) least = right;
      if (least === index) break;
      [items[index], items[least]] = [
        items[least] as readonly [number, number],
        items[index] as readonly [number, number],
      ];
      index = least;
    }
    return top;
  }
  private static less(
    left: readonly [number, number] | undefined,
    right: readonly [number, number] | undefined,
  ): boolean {
    if (left === undefined || right === undefined) return false;
    return left[0] < right[0] || (left[0] === right[0] && left[1] < right[1]);
  }
}

/** Multi-source 8-way steps over `passable` board indices. */
function stepsFrom(
  view: PlayerViewV7,
  passable: (index: number) => boolean,
  sources: readonly number[],
): Map<number, number> {
  const width = view.board.width;
  const height = view.board.height;
  const steps = new Map<number, number>();
  const queue: number[] = [];
  for (const source of sources)
    if (passable(source) && !steps.has(source)) {
      steps.set(source, 0);
      queue.push(source);
    }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor] as number;
    const x = index % width;
    const y = (index - x) / width;
    const next = (steps.get(index) as number) + 1;
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const neighbor = ny * width + nx;
      if (steps.has(neighbor) || !passable(neighbor)) continue;
      steps.set(neighbor, next);
      queue.push(neighbor);
    }
  }
  return steps;
}

const COST_TILE = 1000;
const COST_TURN = 10;
const COST_BATTLESHIP = 3 * COST_TILE;
/** A head on a settlement center: its garrison stands in the way of the wave. */
const COST_CENTER_HEAD = 2 * COST_TURN;

/**
 * Section 13.2, "Crossing": the cheapest 8-way chain of explored water
 * tiles from a tile next to home land (`homeSteps`: the walk to that land)
 * to a tile next to the target's land (`targetSteps`). A tile to freeze
 * costs 1000, one that is already ice `iceCost`, a tile within 3 of a
 * visible hostile Battleship 3000 more, a change of direction 10 (a
 * straighter crossing is preferred), each step of the walk at either end `walkCost`,
 * and a head on a settlement center 20 (the wave enters past its
 * garrison). A dock is never part of it (a dock never freezes).
 */
function findCrossing(
  view: PlayerViewV7,
  homeSteps: ReadonlyMap<number, number>,
  targetSteps: ReadonlyMap<number, number>,
  allowDeep: boolean,
  battleships: readonly PublicUnitV7[],
  iceCost: number,
  walkCost: number,
  blocked: (tile: ExploredTileV7) => boolean,
): CrossingV7 | null {
  const width = view.board.width;
  const height = view.board.height;
  const size = width * height;
  const tileCost = new Float64Array(size).fill(Number.POSITIVE_INFINITY);
  let water = 0;
  for (const tile of view.board.tiles) {
    if (!tile.explored || !isWater(tile) || isDock(tile) || blocked(tile))
      continue;
    const ice = isIceAtV7(view, tile.at);
    // Deep Water freezes only with Pack Ice; Deep Water that is ice is there.
    if (
      tile.terrain !== "SHALLOW_WATER" &&
      !(tile.terrain === "DEEP_WATER" && (allowDeep || ice))
    )
      continue;
    tileCost[tile.at.y * width + tile.at.x] =
      (ice ? iceCost : COST_TILE) +
      (battleships.some(
        (ship) => chebyshev(ship.at, tile.at) <= ICE_SEA_BATTLESHIP_RADIUS_V7,
      )
        ? COST_BATTLESHIP
        : 0);
    water += 1;
  }
  if (water === 0) return null;
  const best = new Float64Array(size * 8).fill(Number.POSITIVE_INFINITY);
  // The state a state was reached from, or -(land index) - 2 for a start.
  const from = new Int32Array(size * 8).fill(-1);
  const heap = new CostHeapV7();
  const landSteps = (
    steps: ReadonlyMap<number, number>,
    x: number,
    y: number,
  ): number | undefined =>
    x < 0 || y < 0 || x >= width || y >= height
      ? undefined
      : steps.get(y * width + x);
  for (let index = 0; index < size; index += 1) {
    if (!Number.isFinite(tileCost[index] as number)) continue;
    const x = index % width;
    const y = (index - x) / width;
    DIRECTIONS.forEach(([dx, dy], direction) => {
      // The head: the land tile the first step comes from.
      const walk = landSteps(homeSteps, x - dx, y - dy);
      if (walk === undefined) return;
      const cost =
        (tileCost[index] as number) +
        walkCost * walk +
        (exploredTile(view, { x: x - dx, y: y - dy })?.site == null
          ? 0
          : COST_CENTER_HEAD);
      const state = index * 8 + direction;
      if (cost >= (best[state] as number)) return;
      best[state] = cost;
      from[state] = -((y - dy) * width + (x - dx)) - 2;
      heap.push([cost, state]);
    });
  }
  let end: { cost: number; state: number; landing: number } | null = null;
  while (heap.size > 0) {
    const item = heap.pop();
    if (item === undefined) break;
    const [cost, state] = item;
    if (cost > (best[state] as number)) continue;
    if (end !== null && cost >= end.cost) break;
    const index = state >> 3;
    const direction = state & 7;
    const x = index % width;
    const y = (index - x) / width;
    for (const [dx, dy] of DIRECTIONS) {
      const walk = landSteps(targetSteps, x + dx, y + dy);
      if (walk === undefined) continue;
      const total = cost + walkCost * walk;
      const landing = (y + dy) * width + (x + dx);
      if (
        end === null ||
        total < end.cost ||
        (total === end.cost &&
          (state < end.state || (state === end.state && landing < end.landing)))
      )
        end = { cost: total, state, landing };
    }
    DIRECTIONS.forEach(([dx, dy], nextDirection) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const neighbor = ny * width + nx;
      const step = tileCost[neighbor] as number;
      if (!Number.isFinite(step)) return;
      const nextCost =
        cost + step + (nextDirection === direction ? 0 : COST_TURN);
      const nextState = neighbor * 8 + nextDirection;
      if (nextCost >= (best[nextState] as number)) return;
      best[nextState] = nextCost;
      from[nextState] = state;
      heap.push([nextCost, nextState]);
    });
  }
  if (end === null) return null;
  const tiles: CoordV7[] = [];
  let state = end.state;
  let head: number;
  for (;;) {
    const index = state >> 3;
    tiles.push({ x: index % width, y: Math.floor(index / width) });
    const prior = from[state] as number;
    if (prior < -1) {
      head = -prior - 2;
      break;
    }
    if (prior < 0) return null;
    state = prior;
  }
  tiles.reverse();
  return {
    tiles,
    head: { x: head % width, y: Math.floor(head / width) },
    landing: { x: end.landing % width, y: Math.floor(end.landing / width) },
  };
}

/**
 * Section 13.2: the ice plan of the viewer, or null. Null unless the viewer
 * is an Ice Folk seat whose Rime is not forbidden, and unless the plan
 * would activate where the naval plan of a seafaring seat does: every known
 * objective (a hostile city, a neutral village) is overseas, or the nearest
 * objective can be walked to but the way over the water is more than three
 * steps shorter. Land is every explored land tile but a Rift (Mountains
 * included: the Ice Folk are Mountain-born); a tile in an ally's territory
 * is closed. Home is the land the seat's cities stand on, so "overseas" is
 * judged by land alone and a bridge does not end the plan it serves. The
 * plan is computed once per view.
 */
export function iceSeaPlanV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "isAllied">,
): IcePlanV7 | null {
  const cached = ICE_PLAN_CACHE_V7.get(view);
  if (cached !== undefined) return cached;
  const plan = computeIcePlan(view, tools);
  ICE_PLAN_CACHE_V7.set(view, plan);
  return plan;
}

function computeIcePlan(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "isAllied">,
): IcePlanV7 | null {
  if (!iceSeaSeatV7(view)) return null;
  const forbidden = forbiddenTechnologiesV7(view.setup, view.viewer.seat);
  if (forbidden.has("SHORECRAFT")) return null;
  const width = view.board.width;
  const indexOf = (at: CoordV7): number => at.y * width + at.x;
  const closed = (tile: ExploredTileV7): boolean =>
    tile.territoryOwnerId !== null &&
    tile.territoryOwnerId !== view.viewer.id &&
    tools.isAllied(tile.territoryOwnerId);
  const iceKeys = new Set(view.ice.map((entry) => indexOf(entry.at)));
  const land = new Set<number>();
  let anyWater = false;
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    if (isWater(tile)) anyWater = true;
    else if (tile.terrain !== "RIFT" && !closed(tile))
      land.add(indexOf(tile.at));
  }
  if (!anyWater) return null;
  const ground = (index: number): boolean =>
    land.has(index) || iceKeys.has(index);
  const ownUnits = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.form === "LAND" && unit.ownerId === view.viewer.id,
  );
  // Home is the land the seat's cities stand on, walked over land only: a
  // unit that has crossed, and the bridge itself, do not make the far shore
  // home (the plan lasts until the objective is taken).
  const ownCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  if (ownCities.length === 0) return null;
  const homeSteps = stepsFrom(
    view,
    (index) => land.has(index),
    ownCities.map((city) => indexOf(city.at)),
  );
  const nearest = (at: CoordV7): number =>
    Math.min(...ownCities.map((city) => chebyshev(city.at, at)));
  const objectives = [
    ...view.cities
      .filter((city) => tools.isHostile(city.ownerId))
      .map((city) => ({ at: city.at, rank: 0 })),
    ...view.board.tiles.flatMap((tile) =>
      tile.explored && tile.site === "VILLAGE" && tile.territoryOwnerId === null
        ? [{ at: tile.at, rank: 1 }]
        : [],
    ),
  ].sort(
    (left, right) =>
      left.rank - right.rank ||
      nearest(left.at) - nearest(right.at) ||
      left.at.y - right.at.y ||
      left.at.x - right.at.x,
  );
  const overseas = objectives.filter(
    (objective) => !homeSteps.has(indexOf(objective.at)),
  );
  const reachable = objectives.filter((objective) =>
    homeSteps.has(indexOf(objective.at)),
  );
  const shortcut = overseas.length === 0 && reachable.length > 0;
  if (!shortcut && !(overseas.length > 0 && reachable.length === 0))
    return null;
  const target = (shortcut ? reachable[0] : overseas[0])?.at;
  if (target === undefined) return null;
  // The walk at either end is over land only: the chain is the water part.
  const homeLand = homeSteps;
  const targetLand = stepsFrom(view, (index) => land.has(index), [
    indexOf(target),
  ]);
  const capabilities = technologyCapabilitiesV7(
    [...view.viewer.researchedTechs, "SHORECRAFT"],
    view.viewer.faction,
  );
  const battleships = view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "NAVAL" &&
      unit.role === "BATTLESHIP" &&
      tools.isHostile(unit.ownerId),
  );
  const search = (allowDeep: boolean): CrossingV7 | null =>
    findCrossing(
      view,
      homeLand,
      targetLand,
      allowDeep,
      battleships,
      shortcut ? COST_TILE : 1,
      shortcut ? COST_TILE : 1,
      closed,
    );
  const packIce = capabilities.freezeWater === "DEEP";
  const found =
    search(packIce) ??
    (packIce || forbidden.has("NAVIGATION") ? null : search(true));
  if (found === null || found.tiles.length === 0) return null;
  if (shortcut) {
    const walk = homeSteps.get(indexOf(target));
    const over =
      (homeLand.get(indexOf(found.head)) ?? 0) +
      found.tiles.length +
      1 +
      (targetLand.get(indexOf(found.landing)) ?? 0);
    if (walk === undefined || over + 3 >= walk) return null;
  }
  const crossing = found.tiles;
  const frozen = crossing.map((at) => iceKeys.has(indexOf(at)));
  const firstOpen = frozen.indexOf(false);
  const next = firstOpen < 0 ? crossing.length : firstOpen;
  const unfrozen = frozen.filter((ice) => !ice).length;
  const complete = unfrozen === 0;
  const needsPackIce =
    !packIce &&
    crossing.some(
      (at, index) =>
        frozen[index] !== true &&
        exploredTile(view, at)?.terrain === "DEEP_WATER",
    );
  const stand = complete
    ? null
    : next === 0
      ? found.head
      : (crossing[next - 1] ?? found.head);
  const crossingKeys = new Set(crossing.map(indexOf));
  const routeSteps = stepsFrom(
    view,
    (index) => ground(index) || crossingKeys.has(index),
    [indexOf(target)],
  );
  const steps = new Map<string, number>();
  for (const [index, value] of routeSteps)
    steps.set(keyOf({ x: index % width, y: Math.floor(index / width) }), value);
  // Builders (section 13.2): the Witch when she is near (her Cold Snap's
  // ring makes the road three wide); otherwise a Frost Giant, whose Cold
  // Wake freezes the ring around every tile it ends a Move on; otherwise
  // the nearest Witch however far (the one Freeze effect,
  // `pulp_wars-xv0t`, 7r133; every line unit's `FREEZE` before). The frozen
  // sea redesign (`pulp_wars-5ti.26`): ice is permanent, so one builder
  // builds the crossing once and nobody refreezes behind it.
  const rime =
    technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
      .freezeWater !== "NONE";
  const freezers =
    stand === null || !rime
      ? []
      : ownUnits.filter((unit) => {
          const rule = unitRoleRuleV7(view, unit);
          return (
            (rule.abilities.includes("COLD_WAKE") ||
              // The Witch casts after her Move.
              (rule.abilities.includes("COLD_SNAP") &&
                unitMayActAfterMoveV7(view, unit))) &&
            !unitIsFrozenV7(view, unit) &&
            // Home side only: a unit that has crossed has other work.
            (steps.get(keyOf(unit.at)) ?? -1) >= (steps.get(keyOf(stand)) ?? 0)
          );
        });
  const garrison = (unit: PublicUnitV7): number =>
    Number(
      view.cities.some(
        (city) => city.ownerId === view.viewer.id && same(city.at, unit.at),
      ),
    );
  const witches =
    stand === null
      ? []
      : freezers
          .filter((unit) =>
            unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD"),
          )
          .sort(
            (left, right) =>
              chebyshev(left.at, stand) - chebyshev(right.at, stand) ||
              left.id - right.id,
          );
  const witch = witches
    .filter(
      (unit) =>
        stand !== null &&
        chebyshev(unit.at, stand) <= ICE_SEA_WITCH_BUILDER_RADIUS_V7,
    )
    .sort((left, right) => left.id - right.id)[0];
  const waker =
    stand === null
      ? undefined
      : freezers
          .filter(
            (unit) =>
              !unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD"),
          )
          .sort(
            (left, right) =>
              garrison(left) - garrison(right) ||
              chebyshev(left.at, stand) - chebyshev(right.at, stand) ||
              left.id - right.id,
          )[0];
  const builder = witch ?? waker ?? witches[0];
  const builders = builder === undefined ? [] : [builder.id];
  return {
    target,
    shortcut,
    crossing,
    head: found.head,
    next,
    unfrozen,
    complete,
    ready:
      complete ||
      (!needsPackIce &&
        unfrozen <= ICE_SEA_READY_GAP_V7 &&
        next >= crossing.length - ICE_SEA_READY_GAP_V7),
    needsPackIce,
    stand,
    builders,
    steps,
  };
}

// --- Research --------------------------------------------------------------------

/**
 * The frozen sea redesign (section 3.1, "Research"): the tiles of the
 * viewer's ice it sees cracked open, in (y, x) order. The policy keeps no
 * memory and the view no event history, so the `ICE_CRACKED` events of the
 * last rounds are read from what they leave on the board. Ice is permanent,
 * the builder freezes its crossing from the head outward, and a Freeze
 * makes its tiles in one piece, so these shapes are what a Crack leaves:
 *
 * - **a gap in the crossing:** a crossing tile that is not ice while a tile
 *   farther along the crossing is the seat's ice;
 * - **a hole in the home ice:** an open water tile of the seat's territory
 *   with no unit and no dock on it, whose explored water neighbours (two at
 *   least) are all the seat's ice.
 *
 * A gap is refrozen at once by the crossing's own freeze, so a gap that is
 * still there is a recent one. (Thick ice and its cracks retired with the
 * naval branch rebuilt, `pulp_wars-tzk6`, 7r137: since then nothing in the
 * research reads this; it stays a public diagnostic of the policy.)
 */
export function iceCrackedOpenTilesV7(
  view: PlayerViewV7,
  plan: IcePlanV7 | null,
): readonly CoordV7[] {
  if (view.ice.length === 0) return [];
  const own = (at: CoordV7): boolean =>
    iceEntry(view, at)?.ownerId === view.viewer.id;
  const found = new Map<string, CoordV7>();
  if (plan !== null) {
    let ownBeyond = false;
    for (let index = plan.crossing.length - 1; index >= 0; index -= 1) {
      const at = plan.crossing[index] as CoordV7;
      if (isIceAtV7(view, at)) ownBeyond ||= own(at);
      else if (ownBeyond) found.set(keyOf(at), at);
    }
  }
  for (const tile of view.board.tiles) {
    if (
      !tile.explored ||
      !isWater(tile) ||
      isDock(tile) ||
      tile.territoryOwnerId !== view.viewer.id ||
      isIceAtV7(view, tile.at) ||
      view.units.some((unit) => unit.hp > 0 && same(unit.at, tile.at))
    )
      continue;
    let water = 0;
    let enclosed = true;
    for (const [dx, dy] of DIRECTIONS) {
      const near = exploredTile(view, {
        x: tile.at.x + dx,
        y: tile.at.y + dy,
      });
      if (near === undefined || !isWater(near)) continue;
      water += 1;
      if (!own(near.at)) {
        enclosed = false;
        break;
      }
    }
    if (enclosed && water >= 2) found.set(keyOf(tile.at), tile.at);
  }
  return [...found.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

export interface IceSeaResearchV7 {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
}

/** The first technology of `path` the seat has not researched. */
function nextOf(
  researched: readonly TechnologyIdV7[],
  path: readonly TechnologyIdV7[],
): TechnologyIdV7 | undefined {
  return path.find((tech) => !researched.includes(tech));
}

/**
 * Section 13.2, "Research", for an Ice Folk seat (null for every other).
 * In this order, the first want whose next technology is offered:
 *
 * - **Rime** when a crossing exists, or a visible hostile ship is within 3
 *   of an own city center (Rime makes the home ice and, since the naval
 *   branch rebuilt, `pulp_wars-tzk6`, 7r137, trains the Walrus; the army
 *   growth also asks for it as the Walrus's technology);
 * - **Pack Ice** when the crossing needs Deep Water;
 * - **Harpoons** (Black Ice before 7r137) at the due 1170 once a hostile
 *   unit afloat (a ship or a transport) is visible within 3 of own
 *   territory;
 * - **Under the Ice** (Glacier before) last (1075), once the seat has
 *   `ICE_UNDER_THE_ICE_HOLES_V7` Fishing Holes: one more population each,
 *   and the dive;
 * - **Ice Fortress** (Hoarfrost before) last (1075), once the seat has a
 *   Fishing Hole and sees a hostile unit afloat (a fortified sea post that
 *   shoots one tile further).
 *
 * A technology on the way to the wanted one is asked for in its place. The
 * free opener keeps the ordinary scorer (the caller never asks then).
 */
export function iceSeaResearchV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
  plan: IcePlanV7 | null,
  offered: (tech: TechnologyIdV7) => boolean,
): IceSeaResearchV7 | null {
  if (!iceSeaSeatV7(view)) return null;
  const researched = view.viewer.researchedTechs;
  const ownCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  const hostile = view.units.filter(
    (unit) => unit.hp > 0 && tools.isHostile(unit.ownerId),
  );
  const ships = hostile.filter((unit) => afloat(unit));
  const wants: {
    readonly path: readonly TechnologyIdV7[];
    readonly priority: number;
    readonly strategic: number;
  }[] = [];
  if (
    (plan !== null && !plan.complete) ||
    ships.some((ship) =>
      ownCities.some(
        (city) => chebyshev(city.at, ship.at) <= ICE_SEA_HOME_RADIUS_V7,
      ),
    )
  )
    wants.push({
      path: ["SHORECRAFT"],
      priority: ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
      strategic: 60,
    });
  if (plan?.needsPackIce === true)
    wants.push({
      path: ["SHORECRAFT", "NAVIGATION"],
      priority: ICE_SEA_PLAN_RESEARCH_PRIORITY_V7,
      strategic: 80,
    });
  const ownTerritory = (): readonly CoordV7[] =>
    view.board.tiles.flatMap((tile) =>
      tile.explored && tile.territoryOwnerId === view.viewer.id
        ? [tile.at]
        : [],
    );
  // The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): Harpoons against
  // the ships and transports that come close.
  if (
    ships.length > 0 &&
    ownTerritory().some((at) =>
      ships.some((ship) => chebyshev(ship.at, at) <= ICE_SEA_HARPOON_RADIUS_V7),
    )
  )
    wants.push({
      path: ["SHORECRAFT", "SEAMANSHIP"],
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
      strategic: 40,
    });
  const holes = view.board.tiles.filter(
    (tile) =>
      tile.explored &&
      tile.territoryOwnerId === view.viewer.id &&
      (tile.improvement === "FISHING_HOLE" ||
        tile.improvement === "ICE_FORTRESS"),
  ).length;
  if (holes >= ICE_UNDER_THE_ICE_HOLES_V7)
    wants.push({
      path: ["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"],
      priority: ICE_SEA_LATE_RESEARCH_PRIORITY_V7,
      strategic: 25,
    });
  if (holes > 0 && ships.length > 0)
    wants.push({
      path: ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
      priority: ICE_SEA_LATE_RESEARCH_PRIORITY_V7,
      strategic: 20,
    });
  for (const want of wants) {
    const tech = nextOf(researched, want.path);
    if (tech !== undefined && offered(tech))
      return { tech, priority: want.priority, strategic: want.strategic };
  }
  return null;
}

/**
 * Whether `tech` is what the crossing waits for (Rime, or Pack Ice for a
 * Deep Water crossing): the research the army's own order does not hold
 * back, since without it the seat has no objective it can reach.
 */
export function iceSeaCrossingTechV7(
  view: PlayerViewV7,
  plan: IcePlanV7 | null,
  tech: TechnologyIdV7,
): boolean {
  if (plan === null || plan.complete) return false;
  const researched = view.viewer.researchedTechs;
  if (!researched.includes("SHORECRAFT")) return tech === "SHORECRAFT";
  return plan.needsPackIce && tech === "NAVIGATION";
}

// --- Freeze ----------------------------------------------------------------------

export interface IceFreezeScoreV7 {
  readonly reason: "BRIDGE" | "MEND" | "LINK" | "HOME";
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
  /** What the freeze changes (for a `COLD_SNAP`, its `previewColdSnapV7`). */
  readonly preview: IceWaterFreezeV7;
}

/** What a freeze changes on the water: its tiles (made or taken). */
export interface IceWaterFreezeV7 {
  readonly tiles: readonly CoordV7[];
  readonly taken: readonly CoordV7[];
}

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): the water part of an
 * offered `COLD_SNAP` (the Witch's ring, from `previewColdSnapV7`), or null
 * without a reason (`iceWaterFreezeScoreV7`). The units the cast Freezes
 * are the Cold Snap's own targets (scored by `coldSnapScoreV7`), and Snow
 * is only a tie-break there, so only the ice tiles count here.
 */
export function iceColdSnapTilesScoreV7(
  view: PlayerViewV7,
  tools: FrozenSeaToolsV7,
  plan: IcePlanV7 | null,
  command: Extract<CommandV7, { kind: "COLD_SNAP" }>,
): IceFreezeScoreV7 | null {
  if (!iceSeaSeatV7(view)) return null;
  const preview = previewColdSnapV7(view, command.unitId);
  if (preview === null || preview.tiles.length === 0) return null;
  return iceWaterFreezeScoreV7(
    view,
    tools,
    plan,
    command.unitId,
    iceWaterFreezeOfV7(view, preview.tiles),
  );
}

/**
 * The water a freeze makes the viewer's ice (`tiles`), and the other seats'
 * ice among it that it takes.
 */
export function iceWaterFreezeOfV7(
  view: PlayerViewV7,
  tiles: readonly CoordV7[],
): IceWaterFreezeV7 {
  const taken: CoordV7[] = [];
  for (const at of tiles) {
    const entry = iceEntry(view, at);
    if (entry !== undefined && entry.ownerId !== view.viewer.id) taken.push(at);
  }
  return { tiles, taken };
}

/**
 * Section 13.2: what a water freeze by `actorId` (a Witch's Cold Snap) is
 * for, or null.
 *
 * - **Bridge** (1110): it freezes the next tile of the crossing (ten a new
 *   crossing tile, one for every other new tile: the ring makes the road
 *   wide). The next tile is the first one that is not ice, so a gap a
 *   Crack broke is rebuilt by the same freeze; a complete crossing is
 *   never frozen again.
 * - **Mend** (1109, the frozen sea redesign): it takes back a crossing tile
 *   another seat holds (no cracked state since `pulp_wars-tzk6`, 7r137).
 * - **Home ice** (712, re-aimed by the redesign): new ice in own territory
 *   next to an own center a hostile ship or transport is within 3 of (five
 *   a tile), a tile that would then host a building the seat can afford
 *   (`iceBuildSiteV7`: a Fishing Hole, one more beside a contributor for a
 *   mill, Workshop, or Market). Never by the crossing's builder. Since
 *   `pulp_wars-xv0t` (7r133) a freeze
 *   never ices a dock.
 *
 * (A Freeze that reached a ship, 1297, went with the `FREEZE` command: a
 * Cold Snap's ships are its own targets.)
 */
function iceWaterFreezeScoreV7(
  view: PlayerViewV7,
  tools: FrozenSeaToolsV7,
  plan: IcePlanV7 | null,
  actorId: UnitId,
  preview: IceWaterFreezeV7,
): IceFreezeScoreV7 | null {
  const actor = view.units.find((unit) => unit.id === actorId);
  if (actor === undefined) return null;
  // The frozen sea redesign: the tiles newly made ice (not taken).
  const fresh = preview.tiles.filter(
    (at) => !preview.taken.some((tile) => same(tile, at)),
  );
  if (plan !== null && !plan.complete) {
    const nextTile = plan.crossing[plan.next];
    if (nextTile !== undefined && fresh.some((at) => same(at, nextTile))) {
      const onCrossing = fresh.filter((at) =>
        plan.crossing.some((tile) => same(tile, at)),
      ).length;
      return {
        reason: "BRIDGE",
        priority: ICE_BRIDGE_FREEZE_PRIORITY_V7,
        strategic: 10 * onCrossing + (fresh.length - onCrossing),
        immediate: 0,
        preview,
      };
    }
  }
  if (plan !== null) {
    // The frozen sea redesign (section 3.1): a crossing tile another seat
    // holds taken back. The crossing is the seat's road for the rest of the
    // match, so it is kept whoever still has to pass.
    const kept = preview.taken.filter((at) =>
      plan.crossing.some((tile) => same(tile, at)),
    ).length;
    if (kept > 0)
      return {
        reason: "MEND",
        priority: ICE_MEND_PRIORITY_V7,
        strategic: 6 * kept,
        immediate: 0,
        preview,
      };
  }
  // Sea routes over ice only (`pulp_wars-dy2b`, 7r138): new own ice that
  // closes a gap in a chain between two Fishing Holes makes a sea link; the
  // public economic graph says what link population it adds.
  const linkGain = publicIceLinkPopulationGainV7(view, [
    ...fresh,
    ...preview.taken,
  ]);
  if (linkGain > 0)
    return {
      reason: "LINK",
      priority: ICE_LINK_FREEZE_PRIORITY_V7,
      strategic: ICE_LINK_FREEZE_VALUE_V7 * linkGain,
      immediate: 0,
      preview,
    };
  // Home ice (section 3.1): never by the builder, whom the crossing needs.
  if (plan?.builders.includes(actor.id) === true) return null;
  const pressed = view.cities.filter(
    (city) =>
      city.ownerId === view.viewer.id &&
      view.units.some(
        (unit) =>
          unit.hp > 0 &&
          afloat(unit) &&
          tools.isHostile(unit.ownerId) &&
          chebyshev(unit.at, city.at) <= ICE_SEA_HOME_RADIUS_V7,
      ),
  );
  const ownTerritory = (at: CoordV7): boolean =>
    exploredTile(view, at)?.territoryOwnerId === view.viewer.id;
  // Beside a threatened center: five a tile.
  const walled = fresh.filter(
    (at) =>
      ownTerritory(at) && pressed.some((city) => chebyshev(city.at, at) === 1),
  ).length;
  // A building site: three a tile, and one more beside an own Farm, Fishing
  // Hole, Lumber Camp, or Mine (a mill, a Workshop, or a Market there later).
  let sites = 0;
  for (const at of [...fresh, ...preview.taken]) {
    const site = iceBuildSiteV7(view, tools, at);
    if (site !== null) sites += 3 + Number(site.contributor);
  }
  const strategic = 5 * walled + sites;
  if (strategic > 0)
    return {
      reason: "HOME",
      priority: ICE_HOME_FREEZE_PRIORITY_V7,
      strategic,
      immediate: 0,
      preview,
    };
  return null;
}

/** The improvements a mill, Workshop, or Market counts beside it (a Fishing Hole is the Farm type). */
const ICE_CONTRIBUTORS_V7: ReadonlySet<string> = new Set([
  "FARM",
  "FISHING_HOLE",
  "ICE_FORTRESS",
  "LUMBER_CAMP",
  "MINE",
]);

/**
 * The frozen sea redesign (section 3.1, "Home ice for building"): whether
 * the water tile `at`, frozen or taken for the viewer, would host a
 * building the viewer can afford now, or null. A Fishing Hole is on offer
 * on the viewer's own ice in the territory of its own city with no pending
 * reward, with no visible resource, no improvement, no chest, and no
 * hostile unit on it (`BUILD_FISHING_HOLE`'s gate: Rime, which a Freeze
 * already needs, and 3 Coins); every other building on ice (a mill, the
 * Workshop, the Market) needs at least that tile and a contributor beside
 * it, so `contributor` marks such a tile. Only an Ice Folk seat builds on
 * ice. Since building placement (`pulp_wars-h0xx`, 7r106) Fish or Pearls
 * no longer block a building on ice (it uses them up); the plan still
 * leaves such a tile out, so it freezes for building only where nothing
 * is given up.
 */
export function iceBuildSiteV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
  at: CoordV7,
): { readonly contributor: boolean } | null {
  if (view.viewer.faction !== "ICE_FOLK") return null;
  const tile = exploredTile(view, at);
  if (
    tile === undefined ||
    !isWater(tile) ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    view.viewer.coins < BASIC_ECONOMIC_ACTIONS_V7.BUILD_FISHING_HOLE.cost ||
    !view.viewer.researchedTechs.includes(
      BASIC_ECONOMIC_ACTIONS_V7.BUILD_FISHING_HOLE.technology,
    ) ||
    view.pendingChoices.some(
      (choice) => choice.cityId === tile.territoryCityId,
    ) ||
    !view.cities.some(
      (city) =>
        city.id === tile.territoryCityId && city.ownerId === view.viewer.id,
    ) ||
    view.treasureChests.some((chest) => same(chest, at)) ||
    view.units.some(
      (unit) =>
        unit.hp > 0 && same(unit.at, at) && tools.isHostile(unit.ownerId),
    )
  )
    return null;
  return {
    contributor: DIRECTIONS.some(([dx, dy]) => {
      const near = exploredTile(view, { x: at.x + dx, y: at.y + dy });
      return (
        near !== undefined &&
        near.territoryOwnerId === view.viewer.id &&
        near.improvement !== null &&
        ICE_CONTRIBUTORS_V7.has(near.improvement)
      );
    }),
  };
}

// --- The builders and the wave ---------------------------------------------------

export type IceMoveV7 =
  | {
      readonly kind: "BUILD" | "CROSS" | "STAGE";
      readonly priority: number;
      readonly strategic: number;
    }
  | { readonly kind: "HOLD" };

/**
 * Section 13.2, "Builders" and "The wave": what a Move of an own land unit
 * to `to` is to the ice plan, or null when the plan has nothing to say.
 *
 * - A **builder** goes to the stand tile (the head on the shore, then the
 *   newest ice): `BUILD` at 1112, the stand tile itself first. A Witch
 *   then casts her Cold Snap there; a Frost Giant's Cold Wake freezes the next
 *   tile on arrival (the one Freeze effect, `pulp_wars-xv0t`, 7r133), so
 *   any of its Moves whose wake freezes the next crossing tile is a
 *   `BUILD` too (`previewColdWakeV7`), the stand tile first. On the stand
 *   tile with nothing left to do it stays (`HOLD`), it never goes past it,
 *   and it makes no other Move unless it would die where it stands.
 * - **The wave** (every other own land unit on the home side; on a
 *   shortcut only the units whose objective is the target) walks toward
 *   the head (`STAGE`, 720) and does not step onto the crossing, or onto
 *   the builder's stand tile, until it is ready (`HOLD`): complete, or one
 *   Freeze short. Then it crosses
 *   (`CROSS`, 1108) by the offered Moves (Glide on the ice, `pulp_wars-ecnj`).
 * - No Move of the plan goes into lethal reach the unit is not already in.
 */
export function iceCrossingMoveV7(
  view: PlayerViewV7,
  tools: FrozenSeaToolsV7,
  plan: IcePlanV7,
  actor: PublicUnitV7,
  to: CoordV7,
): IceMoveV7 | null {
  if (
    actor.hp <= 0 ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id ||
    same(actor.at, to)
  )
    return null;
  const here = plan.steps.get(keyOf(actor.at));
  const there = plan.steps.get(keyOf(to));
  const first = plan.crossing[0];
  const last = plan.crossing.at(-1);
  if (
    here === undefined ||
    there === undefined ||
    first === undefined ||
    last === undefined
  )
    return null;
  const firstSteps = plan.steps.get(keyOf(first)) ?? 0;
  const lastSteps = plan.steps.get(keyOf(last)) ?? 0;
  // A unit that has crossed has the ordinary policy again.
  if (here < lastSteps) return null;
  const lethal = (): boolean =>
    tools.danger(view, actor, to) >= actor.hp &&
    tools.danger(view, actor, actor.at) < actor.hp;
  const onCrossing = plan.crossing.some((tile) => same(tile, to));
  const builder = plan.builders.includes(actor.id);
  if (builder && plan.stand !== null) {
    const stand = plan.stand;
    // The one Freeze effect (`pulp_wars-xv0t`): a Frost Giant's Move whose
    // Cold Wake freezes the next crossing tile builds it.
    const nextTile = plan.crossing[plan.next];
    const wake =
      nextTile === undefined ? null : previewColdWakeV7(view, actor.id, to);
    if (
      wake !== null &&
      nextTile !== undefined &&
      wake.tiles.some((at) => same(at, nextTile))
    )
      return lethal()
        ? { kind: "HOLD" }
        : {
            kind: "BUILD",
            priority: ICE_BUILD_MOVE_PRIORITY_V7,
            strategic: (same(to, stand) ? 40 : 30) + wake.tiles.length,
          };
    if (same(actor.at, stand))
      return actor.activation.specialActed || actor.activation.attacked
        ? null
        : { kind: "HOLD" };
    const standSteps = plan.steps.get(keyOf(stand)) ?? 0;
    if (same(to, stand))
      return lethal()
        ? { kind: "HOLD" }
        : {
            kind: "BUILD",
            priority: ICE_BUILD_MOVE_PRIORITY_V7,
            strategic: 40,
          };
    // The walk to the stand tile, over land or the ice short of it, never
    // past it.
    if (there < standSteps) return { kind: "HOLD" };
    if (there < here && !lethal())
      return {
        kind: "BUILD",
        priority: ICE_BUILD_MOVE_PRIORITY_V7,
        strategic: 20 + (here - there) - chebyshev(to, stand),
      };
    // A builder's Move is for the job (the Witch's own best tile waits);
    // it is free again when it would die where it stands.
    return tools.danger(view, actor, actor.at) >= actor.hp && !onCrossing
      ? null
      : { kind: "HOLD" };
  }
  // On a shortcut the wave is the units whose objective is the target.
  if (plan.shortcut) {
    const bound = tools.objective(actor.id);
    if (bound === undefined || !same(bound, plan.target)) return null;
  }
  if (onCrossing || there < lastSteps) {
    if (!plan.ready) return { kind: "HOLD" };
    if (there >= here) return null;
    if (lethal()) return { kind: "HOLD" };
    return {
      kind: "CROSS",
      priority: ICE_CROSS_MOVE_PRIORITY_V7,
      strategic: 4 * (here - there),
    };
  }
  // The stand tile on the shore is the builder's until the wave goes.
  if (
    !plan.ready &&
    plan.builders.length > 0 &&
    plan.stand !== null &&
    same(to, plan.stand)
  )
    return { kind: "HOLD" };
  if (here <= firstSteps + 1 || there >= here || lethal()) return null;
  return {
    kind: "STAGE",
    priority: ICE_STAGE_MOVE_PRIORITY_V7,
    strategic: here - there,
  };
}

// --- Against the frozen sea ------------------------------------------------------

/**
 * The visible hostile land units that may Freeze a ship on their next turn
 * (the one Freeze effect, `pulp_wars-xv0t`, 7r133): a Witch (`COLD_SNAP`)
 * and a Frost Giant (`COLD_WAKE`), not Frozen. (A seat no longer
 * needs ice to freeze a ship, so the old "seen to Freeze" gate is gone.)
 */
export function iceHostileFreezersV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
): readonly PublicUnitV7[] {
  return view.units.filter((unit) => {
    if (
      unit.hp <= 0 ||
      unit.form !== "LAND" ||
      !tools.isHostile(unit.ownerId) ||
      unitIsFrozenV7(view, unit)
    )
      return false;
    const abilities = unitRoleRuleV7(view, unit).abilities;
    return abilities.includes("COLD_SNAP") || abilities.includes("COLD_WAKE");
  });
}

/**
 * Whether a freeze of `freezer` reaches a ship on `at` from `from` (one of
 * its stand tiles): its ring (`COLD_SNAP_RANGE_V7`) around the tile. A Cold
 * Wake needs a Move to `from`, a Cold Snap may follow one; both are read
 * the same (a near miss at most).
 */
function freezeTakes(from: CoordV7, at: CoordV7): boolean {
  const range = chebyshev(from, at);
  return range >= 1 && range <= COLD_SNAP_RANGE_V7;
}

/** Whether a visible hostile unit can Freeze a ship that stands on `at` on its next turn. */
export function iceFreezeReachesV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "standTiles">,
  at: CoordV7,
): boolean {
  const tile = exploredTile(view, at);
  if (tile === undefined || !isWater(tile)) return false;
  return iceHostileFreezersV7(view, tools).some((freezer) =>
    tools.standTiles(freezer).some((from) => freezeTakes(from, at)),
  );
}

/**
 * Section 13.3: whether a Move of an own ship to `to` is refused: a
 * visible hostile Witch or Frost Giant can Freeze it there this
 * turn (its reach by a Move, Glide on known ice included, plus its
 * ring), and it cannot where the ship stands (a ship already in reach may
 * go anywhere). A Battleship therefore shells the ice from three tiles and
 * comes no nearer. Ships only.
 */
export function iceShipMoveRejectedV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "standTiles">,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (
    actor.form !== "NAVAL" ||
    actor.ownerId !== view.viewer.id ||
    !view.players.some((player) => player.faction === "ICE_FOLK")
  )
    return false;
  return (
    iceFreezeReachesV7(view, tools, to) &&
    !iceFreezeReachesV7(view, tools, actor.at)
  );
}

/**
 * What an attack on a unit that stands on ice is worth beyond its damage: 3
 * for any land unit on ice (no terrain cover, no fortification; Glacier's
 * cover is in the preview). The frozen sea redesign: ice is permanent, so a
 * kill on it breaks no bridge and earns nothing more.
 */
export function iceTargetBonusV7(
  view: PlayerViewV7,
  target: PublicUnitV7,
): number {
  if (view.ice.length === 0 || target.form !== "LAND") return 0;
  return iceEntry(view, target.at) === undefined
    ? 0
    : ICE_EXPOSED_TARGET_VALUE_V7;
}

// --- Crack Ice (every other seat) -----------------------------------------------

/**
 * The frozen sea redesign (section 3.2, "Cut a lane"): the steps a unit
 * afloat counts to enter `at` on a public water route. 1 for open water.
 * Ice it may Crack (its own, a hostile seat's, an eliminated seat's, with
 * no building on it) is passable at `ICE_LANE_EXTRA_STEPS_V7` more (one
 * Crack breaks any ice since `pulp_wars-tzk6`, 7r137); an ally's ice and
 * built ice are closed (undefined).
 */
export function iceRouteStepCostV7(
  view: PlayerViewV7,
  isAllied: (ownerId: PlayerId) => boolean,
  at: CoordV7,
): number | undefined {
  const entry = iceEntry(view, at);
  if (entry === undefined) return 1;
  if (entry.ownerId !== view.viewer.id && isAllied(entry.ownerId))
    return undefined;
  const tile = exploredTile(view, at);
  if (tile === undefined || tile.improvement !== null) return undefined;
  return 1 + ICE_LANE_EXTRA_STEPS_V7;
}

export interface IceCrackScoreV7 {
  readonly reason: "BRIDGE" | "LINK" | "LANE";
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
  /** The engine's preview of the Crack (the score is read from it). */
  readonly preview: CrackIcePreviewV7;
}

/**
 * Sea routes over ice only (`pulp_wars-dy2b`, 7r138): how many pairs of
 * cities of the Ice Folk seat `ownerId` a chain of its own ice sea-links
 * now and no longer would with the ice on `at` cracked, on public facts:
 * its Fishing Holes, Ice Fortresses and docks on explored tiles of its
 * territory with no unit of another seat on them, and its ice in the view.
 */
export function iceCrackUnlinkedPairsV7(
  view: PlayerViewV7,
  ownerId: PlayerId,
  at: CoordV7,
): number {
  const owner = view.players.find((player) => player.id === ownerId);
  if (owner === undefined || !seaLinksOverOwnIceV7(owner.faction)) return 0;
  const endpoints: { readonly at: CoordV7; readonly cityId: number }[] = [];
  for (const tile of view.board.tiles)
    if (
      tile.explored &&
      (tile.improvement === "FISHING_HOLE" ||
        tile.improvement === "ICE_FORTRESS" ||
        tile.improvement === "PORT" ||
        tile.improvement === "SHIPYARD") &&
      tile.territoryOwnerId === ownerId &&
      tile.territoryCityId !== null &&
      !view.units.some(
        (unit) =>
          unit.hp > 0 && unit.ownerId !== ownerId && same(unit.at, tile.at),
      )
    )
      endpoints.push({ at: tile.at, cityId: tile.territoryCityId });
  if (endpoints.length < 2) return 0;
  const width = view.board.width;
  const ice = new Set<number>();
  for (const entry of view.ice)
    if (entry.ownerId === ownerId) ice.add(entry.at.y * width + entry.at.x);
  const cityPairs = (ownIce: ReadonlySet<number>): ReadonlySet<string> => {
    const pairs = new Set<string>();
    for (const [left, right] of ownIceChainPairsV7(
      width,
      view.board.height,
      ownIce,
      endpoints.map((endpoint) => endpoint.at),
    )) {
      const a = endpoints[left]?.cityId;
      const b = endpoints[right]?.cityId;
      if (a === undefined || b === undefined || a === b) continue;
      pairs.add(a < b ? `${a}:${b}` : `${b}:${a}`);
    }
    return pairs;
  };
  const before = cityPairs(ice);
  if (before.size === 0) return 0;
  const cracked = new Set(ice);
  cracked.delete(at.y * width + at.x);
  const after = cityPairs(cracked);
  return [...before].filter((pair) => !after.has(pair)).length;
}

/** Whether the ice tile `at` is joined, over ice, to a tile beside one of `sliders`. */
function iceJoinsV7(
  view: PlayerViewV7,
  at: CoordV7,
  sliders: readonly PublicUnitV7[],
): boolean {
  const seen = new Set([keyOf(at)]);
  const queue = [at];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index] as CoordV7;
    if (sliders.some((unit) => chebyshev(unit.at, current) <= 1)) return true;
    for (const [dx, dy] of DIRECTIONS) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (seen.has(keyOf(next)) || !isIceAtV7(view, next)) continue;
      seen.add(keyOf(next));
      queue.push(next);
    }
  }
  return false;
}

/**
 * The frozen sea redesign (section 3.2): what an offered `CRACK_ICE` is
 * for, read from `previewCrackIceV7`, or null: a seat never spends a Crack
 * where nothing is gained. Never when the cracker has an offered attack
 * that kills (`queryCombatPreviewV7`), never under ice an own or allied
 * land unit needs for a Move this turn (`plannedThrough`), never on a tile
 * that holds a ship of another seat. Every Crack breaks its tile (thick
 * ice, and the Dock reason for a dock a Freeze iced over, retired with the
 * naval branch rebuilt, `pulp_wars-tzk6`, 7r137).
 *
 * - **Bridge** (1108): the tile is a hostile seat's ice within 3 of an own
 *   city center and a visible hostile Ice Folk unit is within 6 of that
 *   center; the nearer the center the better (ten
 *   a step nearer), and five more when the ice joins it to that unit (the
 *   ice it would walk along).
 * - **Lane** (1107): the cracker is afloat and the tile is the next step of
 *   its public water route (`route`, where ice costs `iceRouteStepCostV7`):
 *   no tile around it leads on as cheaply.
 * - **Link** (1106, sea routes over ice only, `pulp_wars-dy2b`, 7r138): the
 *   tile is a link of a hostile Ice Folk seat's chain of ice between two of
 *   its cities' Fishing Holes, and the Crack unlinks them
 *   (`iceCrackUnlinkedPairsV7`; eight for each pair of cities). A Bridge
 *   Crack that also unlinks adds the same.
 */
export function iceCrackScoreV7(
  view: PlayerViewV7,
  tools: FrozenSeaToolsV7,
  command: Extract<CommandV7, { kind: "CRACK_ICE" }>,
): IceCrackScoreV7 | null {
  if (view.ice.length === 0) return null;
  const preview = previewCrackIceV7(view, command.unitId, command.at);
  const actor = view.units.find((unit) => unit.id === command.unitId);
  const entry = iceEntry(view, command.at);
  if (preview === null || actor === undefined || entry === undefined)
    return null;
  if (
    tools.plannedThrough(command.at) ||
    tools.commands.some(
      (offered) =>
        offered.kind === "ATTACK" &&
        offered.unitId === actor.id &&
        queryCombatPreviewV7(view, actor.id, offered.targetUnitId)
          ?.defenderDies === true,
    )
  )
    return null;
  // Only a hostile seat's ice (or an eliminated one's) is cracked.
  if (entry.ownerId === view.viewer.id || !tools.isHostile(entry.ownerId))
    return null;
  const sliders = view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      tools.isHostile(unit.ownerId) &&
      unitIsIceFolkGroundV7(view, unit),
  );
  const centers = view.cities.filter(
    (city) =>
      city.ownerId === view.viewer.id &&
      chebyshev(city.at, command.at) <= ICE_CRACK_HOME_RADIUS_V7 &&
      sliders.some(
        (unit) => chebyshev(unit.at, city.at) <= ICE_CRACK_SLIDER_RADIUS_V7,
      ),
  );
  const unlinked = iceCrackUnlinkedPairsV7(view, entry.ownerId, command.at);
  if (centers.length > 0) {
    const near = Math.min(
      ...centers.map((city) => chebyshev(city.at, command.at)),
    );
    const threats = sliders.filter((unit) =>
      centers.some(
        (city) => chebyshev(unit.at, city.at) <= ICE_CRACK_SLIDER_RADIUS_V7,
      ),
    );
    return {
      reason: "BRIDGE",
      priority: ICE_CRACK_HOME_PRIORITY_V7,
      strategic:
        10 * (ICE_CRACK_HOME_RADIUS_V7 + 1 - near) +
        (iceJoinsV7(view, command.at, threats) ? 5 : 0) +
        ICE_CRACK_LINK_VALUE_V7 * unlinked,
      immediate: 0,
      preview,
    };
  }
  if (unlinked > 0)
    return {
      reason: "LINK",
      priority: ICE_CRACK_LINK_PRIORITY_V7,
      strategic: ICE_CRACK_LINK_VALUE_V7 * unlinked,
      immediate: 0,
      preview,
    };
  if (!afloat(actor)) return null;
  const route = tools.route(actor);
  const here = route?.(actor.at);
  if (route === null || here === undefined) return null;
  let best: { readonly at: CoordV7; readonly value: number } | null = null;
  for (const [dx, dy] of DIRECTIONS) {
    const at = { x: actor.at.x + dx, y: actor.at.y + dy };
    const steps = route(at);
    const cost = iceRouteStepCostV7(view, tools.isAllied, at);
    if (steps === undefined || cost === undefined) continue;
    const value = steps + cost;
    // Open water first: a ship that can sail on does not Crack.
    if (
      best === null ||
      value < best.value ||
      (value === best.value && isIceAtV7(view, best.at) && !isIceAtV7(view, at))
    )
      best = { at, value };
  }
  if (best === null || !same(best.at, command.at) || best.value > here)
    return null;
  return {
    reason: "LANE",
    priority: ICE_CRACK_LANE_PRIORITY_V7,
    strategic: 7,
    immediate: 0,
    preview,
  };
}
