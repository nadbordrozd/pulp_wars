import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  FREEZE_LINE_V7,
  WITCH_FREEZE_RADIUS_V7,
  isIceAtV7,
  technologyCapabilitiesV7,
  unitIsFrozenV7,
  unitIsIceboundV7,
  unitMayActAfterMoveV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { forbiddenTechnologiesV7 } from "../engine/v7/forbidden-technologies";
import { iceAtV7 } from "../engine/v7/ice";
import {
  previewCrackIceV7,
  previewFreezeV7,
  queryCombatPreviewV7,
  type CrackIcePreviewV7,
  type FreezePreviewV7,
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
 * and slides across. The same seat Freezes hostile ships in (Icebound),
 * mends and retakes its crossing, Freezes the water of its own territory for
 * the buildings it can put on the ice and beside a threatened center, and
 * researches its five ice technologies when the board asks for them.
 *
 * **Every seat** plays against the ice: a ship stays out of the Freeze reach
 * of a seat that has been seen to Freeze, a land unit does not end a Move on
 * hostile ice (Black Ice is assumed, research being private), a transport
 * lands beside the ice, the crew of an icebound transport climbs out, and
 * every other seat Cracks the ice (`iceCrackScoreV7`) to free its icebound
 * ships, to break a bridge that threatens a center, and to open its ships'
 * way. The threat estimate follows a slide (`iceSlideEndV7`), through zones
 * of control for a Sled's Runners.
 *
 * The frozen sea redesign (`pulp_wars-5ti.26`,
 * docs/product/RULESET_7_ICE_REDESIGN.md section 3): ice is permanent, so no
 * rule here reads a thaw.
 *
 * Every function reads only the viewer's public view and the public
 * previews (`previewFreezeV7`, `previewCrackIceV7`, `queryCombatPreviewV7`),
 * draws nothing from the PRNG, and returns its neutral value at once in a
 * view without ice, without an Ice Folk seat, or (the plan) without water:
 * Dry Land and every match without an Ice Folk seat decide as before.
 */

// --- Priorities and values ---------------------------------------------------

/** Rime or Pack Ice for a crossing the plan needs (the naval plan's own research has 1280 too). */
export const ICE_SEA_PLAN_RESEARCH_PRIORITY_V7 = 1280;
/** Icebound or Black Ice against what is in sight (the due naval research of a seafaring seat has 1170 too). */
export const ICE_SEA_DUE_RESEARCH_PRIORITY_V7 = 1170;
/** Glacier, last: above the generic research, below training. */
export const ICE_SEA_GLACIER_RESEARCH_PRIORITY_V7 = 1075;
/**
 * The frozen sea redesign: Glacier rises to the due research (1170) once at
 * least this many of the seat's ice tiles are seen cracked open
 * (`iceCrackedOpenTilesV7`).
 */
export const ICE_GLACIER_CRACK_EVIDENCE_V7 = 2;
/** A hostile ship this close to an own city center asks for Rime and for home ice. */
export const ICE_SEA_HOME_RADIUS_V7 = 3;
/** A hostile Battleship or Submarine this close to an own unit asks for Icebound. */
export const ICE_SEA_ICEBOUND_RADIUS_V7 = 4;
/** A hostile transport this close to own territory asks for Black Ice. */
export const ICE_SEA_BLACK_ICE_RADIUS_V7 = 3;
/** A crossing tile this close to a visible hostile Battleship is avoided. */
export const ICE_SEA_BATTLESHIP_RADIUS_V7 = 3;
/** The Witch builds a crossing whose stand tile is within this many tiles of her. */
export const ICE_SEA_WITCH_BUILDER_RADIUS_V7 = 6;
/** A Freeze that locks a hostile ship in: before every attack on it (they are unanswered afterwards). */
export const ICE_ICEBOUND_PRIORITY_V7 = 1297;
/** A builder's Move to the tile it Freezes the crossing from: before its Freeze. */
export const ICE_BUILD_MOVE_PRIORITY_V7 = 1112;
/** A Freeze that extends the crossing (or fills a gap a Crack broke in it): below every kill, above routine Moves. */
export const ICE_BRIDGE_FREEZE_PRIORITY_V7 = 1110;
/** A Freeze that mends a cracked crossing tile, or takes one another seat holds. */
export const ICE_MEND_PRIORITY_V7 = 1109;
/** The wave's Move onto and along a crossing that is ready. */
export const ICE_CROSS_MOVE_PRIORITY_V7 = 1108;
/** The wave's walk to the head of the crossing: a routine Move with a goal. */
export const ICE_STAGE_MOVE_PRIORITY_V7 = 720;
/**
 * A Freeze of own-territory water that a building on offer would use, or
 * beside a threatened center, by a unit with nothing better to do.
 */
export const ICE_HOME_FREEZE_PRIORITY_V7 = 712;
/** The crew of an icebound transport climbs out (a planned landing has 1335). */
export const ICE_CREW_LANDING_PRIORITY_V7 = 1336;
/** An attack on a unit that stands on ice: it has no terrain cover and cannot be fortified. */
export const ICE_EXPOSED_TARGET_VALUE_V7 = 3;
/** A Crack that frees an own or allied icebound ship: just below the Icebound Freeze, above every routine action. */
export const ICE_CRACK_FREE_PRIORITY_V7 = 1296;
/** A Crack that breaks a hostile bridge near an own center: below kills and defence, above routine Moves. */
export const ICE_CRACK_HOME_PRIORITY_V7 = 1108;
/** A ship's Crack of the ice that is the next step of its route. */
export const ICE_CRACK_LANE_PRIORITY_V7 = 1107;
/** Hostile ice this close to an own city center is a bridge worth breaking. */
export const ICE_CRACK_HOME_RADIUS_V7 = 3;
/** ...when a hostile Ice Folk unit is visible this close to that center. */
export const ICE_CRACK_SLIDER_RADIUS_V7 = 6;
/** The naval route search: a tile of crackable ice costs this many steps more than water. */
export const ICE_LANE_EXTRA_STEPS_V7 = 2;
/** ...and thick ice that has not been cracked yet this many (two Cracks). */
export const ICE_LANE_THICK_EXTRA_STEPS_V7 = 4;

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
 * the slide is followed).
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

// --- The slide in a reach estimate ---------------------------------------------

/**
 * Section 8.6 for an estimate over the public view: the tile on which a
 * sliding unit stops after it has entered the known ice tile `first` in the
 * direction (`dx`, `dy`). It goes on while the tile it is on is in no
 * hostile zone of control (`zoc`) and the next tile is on the board,
 * explored, ice, and free (`occupied`: a unit of any owner stops it).
 * A Sled's Runners (the frozen sea redesign, section 2.7): the caller passes
 * a `zoc` that is always false, since a zone of control does not stop its
 * slide (where the slide ends, a zone stops the Move as for any step).
 */
export function iceSlideEndV7(
  view: PlayerViewV7,
  first: CoordV7,
  dx: number,
  dy: number,
  occupied: (at: CoordV7) => boolean,
  zoc: (at: CoordV7) => boolean,
): CoordV7 {
  let current = first;
  if (dx === 0 && dy === 0) return current;
  for (;;) {
    if (zoc(current)) return current;
    const next = { x: current.x + dx, y: current.y + dy };
    if (
      exploredTile(view, next) === undefined ||
      !isIceAtV7(view, next) ||
      occupied(next)
    )
      return current;
    current = next;
  }
}

/** Whether the unit slides on ice (section 8.6): land form and a role that Glides under its kind. */
export function iceSliderV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    view.ice.length > 0 &&
    unit.form === "LAND" &&
    unitRoleMechanicsV7(view, unit).glides
  );
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
  /** The crossing is complete or one Freeze short of it: the wave goes. */
  readonly ready: boolean;
  /** An unfrozen crossing tile is Deep Water and the seat has no Pack Ice. */
  readonly needsPackIce: boolean;
  /** Where a builder stands to Freeze the next tile; null when complete. */
  readonly stand: CoordV7 | null;
  /** The unit with the Build job (none or one: ice is permanent, a crossing is built once). */
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
 * straight run slides), each step of the walk at either end `walkCost`,
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
      tools.isHostile(unit.ownerId) &&
      !unitIsIceboundV7(view, unit),
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
  // Builders (section 13.2): the Witch when she is near (her ring makes the
  // road three wide); otherwise the cheapest line unit. The frozen sea
  // redesign (`pulp_wars-5ti.26`): ice is permanent, so one builder builds
  // the crossing once and nobody refreezes behind it.
  const rime =
    technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
      .freezeWater !== "NONE";
  const freezers =
    stand === null || !rime
      ? []
      : ownUnits.filter((unit) => {
          const rule = unitRoleRuleV7(view, unit);
          return (
            rule.abilities.includes("FREEZE") &&
            // Not Frozen, and a role that may Freeze after its Move.
            unitMayActAfterMoveV7(view, unit) &&
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
  const witch =
    stand === null
      ? undefined
      : freezers
          .filter(
            (unit) =>
              unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD") &&
              chebyshev(unit.at, stand) <= ICE_SEA_WITCH_BUILDER_RADIUS_V7,
          )
          .sort((left, right) => left.id - right.id)[0];
  const builders =
    stand === null
      ? []
      : witch !== undefined
        ? [witch.id]
        : freezers
            .filter(
              (unit) =>
                !unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD"),
            )
            .sort(
              (left, right) =>
                garrison(left) - garrison(right) ||
                (unitRoleRuleV7(view, left).cost ?? 0) -
                  (unitRoleRuleV7(view, right).cost ?? 0) ||
                chebyshev(left.at, stand) - chebyshev(right.at, stand) ||
                left.id - right.id,
            )
            .slice(0, 1)
            .map((unit) => unit.id);
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
        unfrozen <= FREEZE_LINE_V7 &&
        next >= crossing.length - FREEZE_LINE_V7),
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
 *   least) are all the seat's ice;
 * - **a crack:** the seat's thick ice that has taken one Crack.
 *
 * A gap is mended at once by the crossing's own Freeze, so a gap that is
 * still there is a recent one (the design's "in the last three rounds").
 */
export function iceCrackedOpenTilesV7(
  view: PlayerViewV7,
  plan: IcePlanV7 | null,
): readonly CoordV7[] {
  if (view.ice.length === 0) return [];
  const own = (at: CoordV7): boolean =>
    iceEntry(view, at)?.ownerId === view.viewer.id;
  const found = new Map<string, CoordV7>();
  for (const entry of view.ice)
    if (entry.ownerId === view.viewer.id && entry.cracked)
      found.set(keyOf(entry.at), entry.at);
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
 *   of an own city center (Rime makes the home ice);
 * - **Pack Ice** when the crossing needs Deep Water;
 * - **Icebound** once a visible hostile Battleship or Submarine is within 4
 *   of an own unit;
 * - **Black Ice** once a hostile land unit stands on own ice, or a hostile
 *   transport is visible within 3 of own territory;
 * - **Glacier** (the frozen sea redesign) at the due 1170 once at least two
 *   of the seat's ice tiles are seen cracked open (`iceCrackedOpenTilesV7`:
 *   thick ice holds two Cracks and a Freeze mends one); otherwise last
 *   (1075), with a crossing, once the other four are researched.
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
  const ownUnits = view.units.filter(
    (unit) => unit.hp > 0 && unit.ownerId === view.viewer.id,
  );
  const hostile = view.units.filter(
    (unit) => unit.hp > 0 && tools.isHostile(unit.ownerId),
  );
  const ships = hostile.filter(
    (unit) => afloat(unit) && !unitIsIceboundV7(view, unit),
  );
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
  if (
    ships.some(
      (ship) =>
        ship.form === "NAVAL" &&
        (ship.role === "BATTLESHIP" || ship.role === "SUBMARINE") &&
        ownUnits.some(
          (unit) => chebyshev(unit.at, ship.at) <= ICE_SEA_ICEBOUND_RADIUS_V7,
        ),
    )
  )
    wants.push({
      path: ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
      strategic: 50,
    });
  const ownTerritory = (): readonly CoordV7[] =>
    view.board.tiles.flatMap((tile) =>
      tile.explored && tile.territoryOwnerId === view.viewer.id
        ? [tile.at]
        : [],
    );
  if (
    hostile.some(
      (unit) =>
        unit.form === "LAND" &&
        iceEntry(view, unit.at)?.ownerId === view.viewer.id,
    ) ||
    (ships.some((ship) => ship.form === "EMBARKED") &&
      ownTerritory().some((at) =>
        ships.some(
          (ship) =>
            ship.form === "EMBARKED" &&
            chebyshev(ship.at, at) <= ICE_SEA_BLACK_ICE_RADIUS_V7,
        ),
      ))
  )
    wants.push({
      path: ["SHORECRAFT", "SEAMANSHIP"],
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
      strategic: 40,
    });
  if (
    researched.includes("SHORECRAFT") &&
    iceCrackedOpenTilesV7(view, plan).length >= ICE_GLACIER_CRACK_EVIDENCE_V7
  )
    wants.push({
      path: ["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"],
      priority: ICE_SEA_DUE_RESEARCH_PRIORITY_V7,
      strategic: 45,
    });
  if (
    plan !== null &&
    researched.includes("SHORECRAFT") &&
    (["NAVIGATION", "NAVAL_ENGINEERING", "SEAMANSHIP"] as const).every((tech) =>
      researched.includes(tech),
    )
  )
    wants.push({
      path: ["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"],
      priority: ICE_SEA_GLACIER_RESEARCH_PRIORITY_V7,
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
  readonly reason: "ICEBOUND" | "BRIDGE" | "MEND" | "HOME";
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
  /** The engine's preview of the Freeze (the score is read from it). */
  readonly preview: FreezePreviewV7;
}

/**
 * Section 13.2: what an offered `FREEZE` is for, read from
 * `previewFreezeV7`, or null: the policy never Freezes without one of
 * these reasons ("never a Freeze that only refreshes ice no crossing or
 * wall needs").
 *
 * - **Icebound** (1297): it locks a hostile ship in. Each ship counts four
 *   times its role's cost plus three for every other own unit whose Move
 *   and range reach it (their attacks are unanswered while it is frozen).
 *   Not when the same unit's offered attack sinks the one ship it binds.
 * - **Bridge** (1110): it freezes the next tile of the crossing (ten a new
 *   crossing tile, one for every other new tile: the Witch's ring makes the
 *   road wide). The next tile is the first one that is not ice, so a gap a
 *   Crack broke is rebuilt by the same Freeze; a complete crossing is never
 *   frozen again.
 * - **Mend** (1109, the frozen sea redesign): it mends a cracked crossing
 *   tile, or takes back one another seat holds.
 * - **Home ice** (712, re-aimed by the redesign): new ice in own territory
 *   next to an own center a hostile ship or transport is within 3 of (five
 *   a tile), a tile that would then host a building the seat can afford
 *   (`iceBuildSiteV7`: a Fishing Hole, one more beside a contributor for a
 *   mill, Workshop, or Market), and a mended crack of the home ice. Never
 *   by the crossing's builder. An Ice Harbour may stand on the ice, so no
 *   Port site is kept open.
 */
export function iceFreezeScoreV7(
  view: PlayerViewV7,
  tools: FrozenSeaToolsV7,
  plan: IcePlanV7 | null,
  command: Extract<CommandV7, { kind: "FREEZE" }>,
): IceFreezeScoreV7 | null {
  const preview = previewFreezeV7(view, command.unitId, command.at);
  const actor = view.units.find((unit) => unit.id === command.unitId);
  if (preview === null || actor === undefined) return null;
  if (preview.icebound.length > 0) {
    const ships = preview.icebound.flatMap((id) => {
      const ship = view.units.find((unit) => unit.id === id);
      return ship === undefined ? [] : [ship];
    });
    const sinksIt =
      ships.length === 1 &&
      tools.commands.some(
        (offered) =>
          offered.kind === "ATTACK" &&
          offered.unitId === actor.id &&
          offered.targetUnitId === ships[0]?.id &&
          queryCombatPreviewV7(view, actor.id, offered.targetUnitId)
            ?.defenderDies === true,
      );
    if (!sinksIt) {
      let strategic = 0;
      for (const ship of ships) {
        const reachers = view.units.filter((unit) => {
          if (
            unit.hp <= 0 ||
            unit.id === actor.id ||
            unit.ownerId !== view.viewer.id ||
            unit.form !== "LAND"
          )
            return false;
          const rule = unitRoleRuleV7(view, unit);
          return (
            rule.abilities.includes("ATTACK") &&
            chebyshev(unit.at, ship.at) <= Math.floor(rule.move) + rule.range
          );
        }).length;
        strategic += 4 * (unitRoleRuleV7(view, ship).cost ?? 0) + 3 * reachers;
      }
      return {
        reason: "ICEBOUND",
        priority: ICE_ICEBOUND_PRIORITY_V7,
        strategic,
        immediate: 10 * ships.length,
        preview,
      };
    }
  }
  // The frozen sea redesign: the tiles newly made ice (not mended or taken).
  const fresh = preview.tiles.filter(
    (at) =>
      !preview.mended.some((tile) => same(tile, at)) &&
      !preview.taken.some((tile) => same(tile, at)),
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
    // The frozen sea redesign (section 3.1): a cracked crossing tile mended,
    // or one another seat holds taken back. The crossing is the seat's road
    // for the rest of the match, so it is kept whoever still has to pass.
    const kept = [...preview.mended, ...preview.taken].filter((at) =>
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
          !unitIsIceboundV7(view, unit) &&
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
  // A crack of the home ice mended: two a tile.
  const mended = preview.mended.filter(ownTerritory).length;
  const strategic = 5 * walled + sites + 2 * mended;
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
 * ice.
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
 *   newest ice): `BUILD` at 1112, ahead of its Freeze, the stand tile
 *   itself first. On the stand tile with its action unused it stays
 *   (`HOLD`), it never goes past it, and it makes no other Move unless it
 *   would die where it stands.
 * - **The wave** (every other own land unit on the home side; on a
 *   shortcut only the units whose objective is the target) walks toward
 *   the head (`STAGE`, 720) and does not step onto the crossing, or onto
 *   the builder's stand tile, until it is ready (`HOLD`): complete, or one
 *   Freeze short. Then it crosses
 *   (`CROSS`, 1108) by the offered Moves, whose ends are the slides' ends.
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
    // The walk to the stand tile, over land or the ice short of it (a
    // slide that enters the crossing askew stops before the tip), never
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

/** Whether `ownerId` is a living seat whose own tree has Black Ice (an Ice Folk seat). */
function blackIceSeat(view: PlayerViewV7, ownerId: PlayerId): boolean {
  const player = view.players.find((candidate) => candidate.id === ownerId);
  return (
    player !== undefined &&
    player.status === "ACTIVE" &&
    technologyCapabilitiesV7(["SHORECRAFT", "SEAMANSHIP"], player.faction)
      .blackIce
  );
}

/** The ice entry on `at` when a hostile seat that may have Black Ice owns it. */
function hostileBlackIce(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
  at: CoordV7,
): PublicIceTileV7 | undefined {
  const entry = iceEntry(view, at);
  return entry !== undefined &&
    tools.isHostile(entry.ownerId) &&
    blackIceSeat(view, entry.ownerId)
    ? entry
    : undefined;
}

/**
 * Section 13.3 and 11.8 ("do not stand on their ice"): whether a Move of
 * an own land unit that ends on `to` is refused. It is when `to` is the ice
 * of a hostile Ice Folk seat entered from off it: the frozen sea redesign's
 * Black Ice (assumed, research being private) Freezes such a unit at once,
 * for its own next turn, and the Ice Folk may Shatter it. A unit that
 * already stands on such ice is not frozen again and may move on along it
 * (it is leaving or crossing). Flyers and walkers that end on land beyond
 * are not affected: only the end of the Move counts.
 */
export function iceMoveOntoHostileIceRejectedV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (
    view.ice.length === 0 ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id
  )
    return false;
  return (
    hostileBlackIce(view, tools, to) !== undefined &&
    hostileBlackIce(view, tools, actor.at) === undefined
  );
}

/**
 * Section 13.3: whether an offered landing is refused: the tile is the ice
 * of a hostile Ice Folk seat and the same unit is offered a landing within
 * 2 of it that is not.
 */
export function iceLandingRejectedV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "commands">,
  command: Extract<CommandV7, { kind: "DISEMBARK" }>,
): boolean {
  if (
    view.ice.length === 0 ||
    hostileBlackIce(view, tools, command.at) === undefined
  )
    return false;
  return tools.commands.some(
    (offered) =>
      offered.kind === "DISEMBARK" &&
      offered.unitId === command.unitId &&
      chebyshev(offered.at, command.at) <= 2 &&
      hostileBlackIce(view, tools, offered.at) === undefined,
  );
}

/**
 * The visible hostile land units that may Freeze a ship in on their next
 * turn: a role with `FREEZE`, not Frozen, of a seat that has been seen to
 * Freeze (it owns ice the viewer knows of). Icebound is then assumed, its
 * owner's research being private.
 */
export function iceHostileFreezersV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
): readonly PublicUnitV7[] {
  if (view.ice.length === 0) return [];
  const seen = new Set(view.ice.map((entry) => entry.ownerId));
  return view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "LAND" &&
      seen.has(unit.ownerId) &&
      tools.isHostile(unit.ownerId) &&
      !unitIsFrozenV7(view, unit) &&
      unitRoleRuleV7(view, unit).abilities.includes("FREEZE"),
  );
}

/**
 * Whether the Freeze of `freezer` standing on `from` takes the tile `at`
 * with a ship on it (section 8.4): the Witch's ring within 1; a line's
 * first tile; or its second tile, in a straight line, when the tile between
 * is water that can freeze and holds no ship (an empty tile or ice). Pack
 * Ice is assumed with Icebound.
 */
function freezeTakes(
  view: PlayerViewV7,
  freezer: PublicUnitV7,
  from: CoordV7,
  at: CoordV7,
): boolean {
  const range = chebyshev(from, at);
  if (unitRoleRuleV7(view, freezer).abilities.includes("BLIZZARD"))
    return range <= WITCH_FREEZE_RADIUS_V7;
  if (range === 1) return true;
  if (range !== FREEZE_LINE_V7) return false;
  const dx = at.x - from.x;
  const dy = at.y - from.y;
  if (Math.abs(dx) % 2 !== 0 || Math.abs(dy) % 2 !== 0) return false;
  const between = { x: from.x + dx / 2, y: from.y + dy / 2 };
  const tile = exploredTile(view, between);
  if (tile === undefined || !isWater(tile) || isDock(tile)) return false;
  return (
    isIceAtV7(view, between) ||
    !view.units.some((unit) => unit.hp > 0 && same(unit.at, between))
  );
}

/** Whether a visible hostile unit can Freeze a ship that stands on `at` on its next turn. */
export function iceFreezeReachesV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "standTiles">,
  at: CoordV7,
): boolean {
  const tile = exploredTile(view, at);
  // A dock never freezes, and a ship on ice is frozen in already.
  if (tile === undefined || !isWater(tile) || isDock(tile)) return false;
  return iceHostileFreezersV7(view, tools).some((freezer) =>
    tools
      .standTiles(freezer)
      .some((from) => freezeTakes(view, freezer, from, at)),
  );
}

/**
 * Section 13.3: whether a Move of an own ship to `to` is refused: a
 * visible hostile unit can Freeze it there this turn (its reach by a Move,
 * the slide on known ice included, plus the Freeze), and it cannot where
 * the ship stands (a ship already in reach may go anywhere). A Battleship
 * therefore shells the ice from three tiles and comes no nearer. Ships
 * only: a transport's crew climbs out of the ice.
 */
export function iceShipMoveRejectedV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile" | "standTiles">,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (
    view.ice.length === 0 ||
    actor.form !== "NAVAL" ||
    actor.ownerId !== view.viewer.id ||
    unitIsIceboundV7(view, actor)
  )
    return false;
  return (
    iceFreezeReachesV7(view, tools, to) &&
    !iceFreezeReachesV7(view, tools, actor.at)
  );
}

/**
 * Section 13.3, "their crews land": the landing of the viewer's own
 * icebound transport (the crush takes 3 at every Start Turn of the ice's
 * owner, and the transport never sails again). 10 for a landing on land or
 * on ice that is not a hostile Ice Folk seat's, 0 for one on such ice, null
 * for every other landing.
 */
export function iceboundCrewLandingV7(
  view: PlayerViewV7,
  tools: Pick<FrozenSeaToolsV7, "isHostile">,
  command: Extract<CommandV7, { kind: "DISEMBARK" }>,
): number | null {
  if (view.ice.length === 0) return null;
  const actor = view.units.find((unit) => unit.id === command.unitId);
  if (
    actor === undefined ||
    actor.form !== "EMBARKED" ||
    actor.ownerId !== view.viewer.id ||
    !unitIsIceboundV7(view, actor)
  )
    return null;
  return hostileBlackIce(view, tools, command.at) === undefined ? 10 : 0;
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
 * no building on it) is passable at `ICE_LANE_EXTRA_STEPS_V7` more, thick
 * ice not yet cracked at `ICE_LANE_THICK_EXTRA_STEPS_V7` more (two Cracks);
 * an ally's ice and built ice are closed (undefined).
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
  return (
    1 +
    (entry.thick && !entry.cracked
      ? ICE_LANE_THICK_EXTRA_STEPS_V7
      : ICE_LANE_EXTRA_STEPS_V7)
  );
}

export interface IceCrackScoreV7 {
  readonly reason: "FREE" | "BRIDGE" | "LANE";
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
  /** The engine's preview of the Crack (the score is read from it). */
  readonly preview: CrackIcePreviewV7;
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
 * that holds a ship of another seat. A Crack of thick ice that is not
 * cracked yet breaks nothing by itself: it is a reason only when another
 * own unit is offered the second Crack of the same tile this turn (the
 * policy picks one command at a time, so the two Cracks follow each other),
 * or, for a ship, when that ice is the next step of its route.
 *
 * - **Free** (1296): the tile holds an own or allied icebound ship (four
 *   times its role's cost, and 10 immediate for each ship freed).
 * - **Bridge** (1108): the tile is a hostile seat's ice within 3 of an own
 *   city center, a visible hostile Ice Folk unit is within 6 of that
 *   center, and the Crack breaks it; the nearer the center the better (ten
 *   a step nearer), and five more when the ice joins it to that unit (the
 *   line it would slide along).
 * - **Lane** (1107): the cracker is afloat and the tile is the next step of
 *   its public water route (`route`, where ice costs `iceRouteStepCostV7`):
 *   no tile around it leads on as cheaply.
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
  const ships = view.units.filter(
    (unit) => unit.hp > 0 && afloat(unit) && same(unit.at, command.at),
  );
  const friends = ships.filter(
    (unit) => unit.ownerId === view.viewer.id || tools.isAllied(unit.ownerId),
  );
  if (ships.length > friends.length) return null;
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
  const breaks =
    preview.broken ||
    tools.commands.some(
      (offered) =>
        offered.kind === "CRACK_ICE" &&
        offered.unitId !== actor.id &&
        same(offered.at, command.at),
    );
  if (friends.length > 0)
    return breaks
      ? {
          reason: "FREE",
          priority: ICE_CRACK_FREE_PRIORITY_V7,
          strategic: friends.reduce(
            (value, ship) => value + 4 * (unitRoleRuleV7(view, ship).cost ?? 0),
            0,
          ),
          immediate: preview.broken ? 10 * preview.freed.length : 0,
          preview,
        }
      : null;
  // Only a hostile seat's ice (or an eliminated one's) is cracked.
  if (entry.ownerId === view.viewer.id || !tools.isHostile(entry.ownerId))
    return null;
  if (breaks) {
    const sliders = view.units.filter(
      (unit) =>
        unit.hp > 0 && tools.isHostile(unit.ownerId) && iceSliderV7(view, unit),
    );
    const centers = view.cities.filter(
      (city) =>
        city.ownerId === view.viewer.id &&
        chebyshev(city.at, command.at) <= ICE_CRACK_HOME_RADIUS_V7 &&
        sliders.some(
          (unit) => chebyshev(unit.at, city.at) <= ICE_CRACK_SLIDER_RADIUS_V7,
        ),
    );
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
          (iceJoinsV7(view, command.at, threats) ? 5 : 0),
        immediate: 0,
        preview,
      };
    }
  }
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
    strategic: 5 + 2 * Number(preview.broken),
    immediate: 0,
    preview,
  };
}
