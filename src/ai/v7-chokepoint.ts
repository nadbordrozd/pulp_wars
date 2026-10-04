import type { PlayerId, UnitId } from "../engine/model/ids";
import { unitRoleRuleV7 } from "../engine/rules/ruleset-v7";
import type { CoordV7 } from "../engine/v7/types";
import type {
  PlayerViewV7,
  PublicCityV7,
  PublicUnitV7,
} from "../engine/v7/view";

/**
 * Normal AI siege of a single-file front (`pulp_wars-68k.6`).
 *
 * Measured on the campaign mission "Bone Neck" (a one-tile isthmus three
 * tiles long under a fortified gate): the policy attacks only at favourable
 * odds, so two lines of high-Defense units facing each other across a
 * one-tile front never engage, and an own Catapult or Guard parked on the
 * isthmus corks the only path for the rest of the army. The seat never
 * breached such a position.
 *
 * A **chokepoint front** exists for a viewer when
 *
 * - every explored land route from every own city center to its nearest
 *   known hostile city passes through the same run of at least
 *   `CHOKEPOINT_MINIMUM_LENGTH_V7` consecutive tiles (the corridor: each
 *   tile alone separates the cities);
 * - the corridor's far end is at least two tiles from that city's center
 *   (a corridor that opens onto the center itself is a city assault, which
 *   the ordinary policy plays); and
 * - a fortified position holds it: visible hostile land units stand on the
 *   corridor or within `CHOKEPOINT_GARRISON_RADIUS_V7` of its far end on
 *   the target's side (the garrison), and at least one of them stands in
 *   its owner's territory (where it recovers and may hold a Field Defense).
 *
 * The corridor is ordered from the home side to the target side. Its
 * **head** is the last corridor tile with no hostile unit on it or behind
 * it. The **holders** are the garrison units on the corridor or next to its
 * far end (the mouth); with no holder left the mouth is **open**. The
 * **apron** is the home-side land next to the corridor's entrance, the
 * **yard** the home-side land within two tiles of it.
 *
 * The plan is null on every board without such a front, and every rule of
 * the siege (the rules below and the `chokepoint` helpers of
 * `src/ai/v7.ts`) is gated on it, so a position without a chokepoint front
 * keeps its decision exactly.
 *
 * Every input is public: explored tiles and their territory owner, cities
 * on explored tiles, visible units, and the viewer's Coins. Nothing draws
 * from the PRNG or depends on elapsed time; the plan is three breadth-first
 * searches and one depth-first search (articulation tiles) over the
 * explored land.
 */

/** A corridor is at least this many consecutive single-file tiles. */
export const CHOKEPOINT_MINIMUM_LENGTH_V7 = 2;
/** Hostile units this close to the far end are the front's garrison. */
export const CHOKEPOINT_GARRISON_RADIUS_V7 = 3;
/** A head unit has at least this Defense (half-units), like a screen. */
export const CHOKEPOINT_HEAD_DEFENSE2_V7 = 4;
/** Melee units that form up in the yard while the siege is on. */
export const CHOKEPOINT_YARD_UNITS_V7 = 3;
/** Own units this many land-route steps from the entrance are staged. */
export const CHOKEPOINT_STAGING_STEPS_V7 = 4;
/**
 * The attrition clock. The policy has no memory, so the clock is the
 * viewer's treasury: a seat at a stalemate fills its unit capacity and its
 * Coins pile up (a seat that still has something to buy spends them every
 * turn). With this many unspent Coins the siege turns into an assault: the
 * head advances into lethal reach, siege units take firing tiles in lethal
 * reach, and melee attacks are committed at odds the policy otherwise
 * refuses. The Coins replace what the assault loses.
 */
export const CHOKEPOINT_ASSAULT_BANK_V7 = 30;
/** Siege units the seat wants for a chokepoint front. */
export const CHOKEPOINT_SIEGE_TARGET_V7 = 3;
/** The training bias for a siege role while the seat is short of them. */
export const CHOKEPOINT_TRAINING_BIAS_V7 = 24;
/** The training value of each half-unit of Attack at a chokepoint front. */
export const CHOKEPOINT_ATTACK_BIAS_V7 = 3;
/** Focused ranged fire: above the lane moves, so the shots come first. */
export const CHOKEPOINT_FIRE_PRIORITY_V7 = 1112;
/** A committed melee attack: after the fire, before the lane moves. */
export const CHOKEPOINT_COMMIT_PRIORITY_V7 = 1108;
/** Lane moves (the head, a siege slot) outrank routine moves (700–850). */
export const CHOKEPOINT_LANE_PRIORITY_V7 = 1105;
/** A wounded head's withdrawal: just above an urgent Recover (930). */
export const CHOKEPOINT_ROTATE_PRIORITY_V7 = 945;

export interface ChokepointPolicyOptionsV7 {
  /** The siege rules are on (the default). */
  readonly siege: boolean;
  /** Seats (0-based) that keep the policy without the siege rules. */
  readonly offSeats: readonly number[];
}

export const DEFAULT_CHOKEPOINT_POLICY_OPTIONS_V7: ChokepointPolicyOptionsV7 =
  Object.freeze({ siege: true, offSeats: Object.freeze([]) });

let chokepointPolicyOptions: ChokepointPolicyOptionsV7 =
  DEFAULT_CHOKEPOINT_POLICY_OPTIONS_V7;

/** The options the next decisions use. */
export function chokepointPolicyOptionsV7(): ChokepointPolicyOptionsV7 {
  return chokepointPolicyOptions;
}

/**
 * Tests and headless harnesses only (the head-to-head against the policy
 * without the siege): changes the options and returns the previous ones.
 */
export function setChokepointPolicyOptionsV7(
  options: Partial<ChokepointPolicyOptionsV7>,
): ChokepointPolicyOptionsV7 {
  const previous = chokepointPolicyOptions;
  chokepointPolicyOptions = Object.freeze({
    ...chokepointPolicyOptions,
    ...options,
  });
  return previous;
}

/** How the siege plays an own land unit. */
export type ChokepointUnitClassV7 = "HEAD" | "MELEE" | "RANGED" | "OTHER";

export interface ChokepointPlanV7 {
  /** The hostile city the front faces. */
  readonly target: PublicCityV7;
  /** The corridor, from the home side (index 0) to the target side. */
  readonly corridor: readonly CoordV7[];
  /**
   * The corridor index of the head tile: the last tile with no hostile unit
   * on it or behind it; -1 when a hostile unit holds the entrance.
   */
  readonly headIndex: number;
  /**
   * The visible hostile land units that hold the front: on the corridor
   * beyond the head, next to the head on the target's side, or on the mouth.
   */
  readonly holders: readonly PublicUnitV7[];
  /**
   * The holders and every other visible hostile land unit beyond the head
   * within `CHOKEPOINT_GARRISON_RADIUS_V7` of the corridor's far end. The
   * front exists while this list is not empty.
   */
  readonly garrison: readonly PublicUnitV7[];
  /**
   * The mouth is open: no holder is left, only the garrison behind it. The
   * siege fire has cleared the way and the column goes through.
   */
  readonly open: boolean;
  /**
   * The lane's tail: the apron tile (home-side land next to the entrance)
   * nearest the own centers. Line units queue through it; siege units stay
   * off it like off the corridor. Null when the entrance has no apron.
   */
  readonly laneApron: CoordV7 | null;
  /** The corridor index of a tile, or undefined off the corridor. */
  readonly indexOf: (at: CoordV7) => number | undefined;
  /** Land-route steps from a tile to the target, or undefined. */
  readonly stepsToTarget: (at: CoordV7) => number | undefined;
  /** Whether a tile lies on the home side of the corridor. */
  readonly homeSide: (at: CoordV7) => boolean;
}

export interface ChokepointFactsV7 {
  readonly isHostile: (ownerId: PlayerId) => boolean;
  /** Another seat whose territory the viewer does not enter. */
  readonly isAllied: (ownerId: PlayerId) => boolean;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** The chokepoint front of the viewer, or null without one. */
export function chokepointPlanForPolicyV7(
  view: PlayerViewV7,
  facts: ChokepointFactsV7,
): ChokepointPlanV7 | null {
  if (
    !chokepointPolicyOptions.siege ||
    chokepointPolicyOptions.offSeats.includes(view.viewer.seat)
  )
    return null;
  const targets = view.cities.filter((city) => facts.isHostile(city.ownerId));
  const ownCenters = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  if (targets.length === 0 || ownCenters.length === 0) return null;
  const { width, height, tiles } = view.board;
  const size = width * height;
  const engineering = view.viewer.researchedTechs.includes("ENGINEERING");
  // The campaign plan's land (`src/ai/v7-campaign.ts`): units are not walls.
  const enterable = new Uint8Array(size);
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (
      tile !== undefined &&
      tile.explored &&
      (tile.terrain === "GRASS" ||
        tile.terrain === "FOREST" ||
        (tile.terrain === "MOUNTAIN" && engineering)) &&
      !(
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== view.viewer.id &&
        facts.isAllied(tile.territoryOwnerId)
      )
    )
      enterable[index] = 1;
  }
  const indexAt = (at: CoordV7): number => at.y * width + at.x;
  const search = (sources: readonly number[]): Int16Array => {
    const steps = new Int16Array(size).fill(-1);
    const queue = new Int32Array(size);
    let tail = 0;
    for (const source of sources)
      if (steps[source] === -1) {
        steps[source] = 0;
        queue[tail] = source;
        tail += 1;
      }
    for (let head = 0; head < tail; head += 1) {
      const current = queue[head] as number;
      const next = (steps[current] as number) + 1;
      const x = current % width;
      const y = (current - x) / width;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const index = ny * width + nx;
          if (steps[index] !== -1 || enterable[index] !== 1) continue;
          steps[index] = next;
          queue[tail] = index;
          tail += 1;
        }
      }
    }
    return steps;
  };
  // The nearest known hostile city by land route from any own center.
  const fromHome = search(ownCenters.map((city) => indexAt(city.at)));
  let target: PublicCityV7 | null = null;
  let targetSteps = Number.POSITIVE_INFINITY;
  for (const city of targets) {
    const steps = fromHome[indexAt(city.at)] as number;
    if (
      steps >= 0 &&
      (steps < targetSteps ||
        (steps === targetSteps && city.id < (target?.id ?? city.id)))
    ) {
      target = city;
      targetSteps = steps;
    }
  }
  if (target === null) return null;
  const root = indexAt(target.at);
  const toTarget = search([root]);
  const routed = ownCenters
    .map((city) => indexAt(city.at))
    .filter((index) => (toTarget[index] as number) > 0);
  if (routed.length === 0) return null;

  // Articulation tiles: a depth-first search from the target. A tile `v`
  // with a child `c` in the search tree whose subtree reaches no tile found
  // before `v` (`low[c] >= found[v]`) separates the target from that whole
  // subtree.
  const found = new Int32Array(size).fill(-1);
  const low = new Int32Array(size);
  const parent = new Int32Array(size).fill(-1);
  const cursor = new Uint8Array(size);
  const stack = new Int32Array(size);
  let clock = 0;
  found[root] = clock;
  low[root] = clock;
  clock += 1;
  stack[0] = root;
  let depth = 1;
  while (depth > 0) {
    const current = stack[depth - 1] as number;
    const step = cursor[current] as number;
    if (step >= 9) {
      depth -= 1;
      const above = parent[current] as number;
      if (above >= 0)
        low[above] = Math.min(low[above] as number, low[current] as number);
      continue;
    }
    cursor[current] = step + 1;
    const dx = (step % 3) - 1;
    const dy = Math.floor(step / 3) - 1;
    if (dx === 0 && dy === 0) continue;
    const x = (current % width) + dx;
    const y = Math.floor(current / width) + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const next = y * width + x;
    if (enterable[next] !== 1 || next === parent[current]) continue;
    if ((found[next] as number) >= 0) {
      low[current] = Math.min(low[current] as number, found[next] as number);
      continue;
    }
    found[next] = clock;
    low[next] = clock;
    clock += 1;
    parent[next] = current;
    stack[depth] = next;
    depth += 1;
  }
  // The tiles that separate the target from every routed own center.
  const separates = new Int32Array(size);
  for (const center of routed) {
    let child = center;
    let above = parent[child] as number;
    while (above >= 0 && above !== root) {
      if ((low[child] as number) >= (found[above] as number))
        separates[above] = (separates[above] as number) + 1;
      child = above;
      above = parent[child] as number;
    }
  }
  const separators: number[] = [];
  for (let index = 0; index < size; index += 1)
    if (separates[index] === routed.length) separators.push(index);
  if (separators.length < CHOKEPOINT_MINIMUM_LENGTH_V7) return null;
  // Home side first: every route crosses the separators in the order of
  // their distance to the target.
  separators.sort(
    (left, right) => (toTarget[right] as number) - (toTarget[left] as number),
  );
  const runs: number[][] = [];
  for (const index of separators) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (
      run !== undefined &&
      last !== undefined &&
      (toTarget[last] as number) - (toTarget[index] as number) === 1
    )
      run.push(index);
    else runs.push([index]);
  }
  const coordOf = (index: number): CoordV7 => ({
    x: index % width,
    y: Math.floor(index / width),
  });
  const hostileLand = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.form === "LAND" && facts.isHostile(unit.ownerId),
  );
  const occupiedByHostile = new Set<number>();
  for (const unit of view.units)
    if (unit.hp > 0 && facts.isHostile(unit.ownerId))
      occupiedByHostile.add(indexAt(unit.at));
  // The run nearest the target that hostile units hold.
  for (let order = runs.length - 1; order >= 0; order -= 1) {
    const run = runs[order];
    if (run === undefined || run.length < CHOKEPOINT_MINIMUM_LENGTH_V7)
      continue;
    const corridor = run.map(coordOf);
    const far = corridor.at(-1);
    const farIndex = run.at(-1);
    if (far === undefined || farIndex === undefined) continue;
    let headIndex = run.length - 1;
    for (let item = 0; item < run.length; item += 1)
      if (occupiedByHostile.has(run[item] as number)) {
        headIndex = item - 1;
        break;
      }
    const head = headIndex >= 0 ? corridor[headIndex] : undefined;
    const headSteps =
      headIndex >= 0
        ? (toTarget[run[headIndex] as number] as number)
        : (toTarget[run[0] as number] as number) + 1;
    const holders = hostileLand
      .filter((unit) => {
        const steps = toTarget[indexAt(unit.at)] as number;
        if (steps < 0 || steps >= headSteps) return false;
        return (
          run.includes(indexAt(unit.at)) ||
          chebyshev(unit.at, far) <= 1 ||
          (head !== undefined && chebyshev(unit.at, head) <= 1)
        );
      })
      .sort((left, right) => left.id - right.id);
    const garrison = hostileLand
      .filter((unit) => {
        const steps = toTarget[indexAt(unit.at)] as number;
        if (steps < 0 || steps >= headSteps) return false;
        return (
          run.includes(indexAt(unit.at)) ||
          chebyshev(unit.at, far) <= CHOKEPOINT_GARRISON_RADIUS_V7
        );
      })
      .sort((left, right) => left.id - right.id);
    // A fortified position: a garrison unit stands in its owner's territory
    // (it recovers there and may hold a Field Defense), and the corridor
    // does not open onto the target center itself (that is a city assault,
    // which the ordinary policy plays).
    if (
      chebyshev(far, target.at) < 2 ||
      !garrison.some((unit) => {
        const tile = tiles[indexAt(unit.at)];
        return (
          tile !== undefined &&
          tile.explored &&
          tile.territoryOwnerId === unit.ownerId
        );
      })
    )
      continue;
    const positions = new Map<number, number>();
    run.forEach((index, item) => positions.set(index, item));
    // The home side: the land the own centers reach without the entrance.
    const entrance = run[0] as number;
    enterable[entrance] = 0;
    const home = search(routed);
    enterable[entrance] = 1;
    const inside = (at: CoordV7): boolean =>
      at.x >= 0 && at.y >= 0 && at.x < width && at.y < height;
    // The lane's tail: the apron tile (home-side land next to the entrance)
    // nearest the own centers, then a tile straight behind the entrance
    // before a diagonal one, then the first by (y, x).
    let laneApron: CoordV7 | null = null;
    let laneApronCost = Number.POSITIVE_INFINITY;
    const first = corridor[0];
    if (first !== undefined)
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const at = { x: first.x + dx, y: first.y + dy };
          if (!inside(at)) continue;
          const steps = home[indexAt(at)] as number;
          const cost = steps * 2 + Number(dx !== 0 && dy !== 0);
          if (steps >= 0 && cost < laneApronCost) {
            laneApron = at;
            laneApronCost = cost;
          }
        }
    return {
      target,
      corridor,
      headIndex,
      holders,
      garrison,
      open: holders.length === 0,
      laneApron,
      indexOf: (at) => (inside(at) ? positions.get(indexAt(at)) : undefined),
      stepsToTarget: (at) => {
        if (!inside(at)) return undefined;
        const steps = toTarget[indexAt(at)] as number;
        return steps < 0 ? undefined : steps;
      },
      homeSide: (at) => inside(at) && (home[indexAt(at)] as number) >= 0,
    };
  }
  return null;
}

/**
 * How the siege plays an own land unit: `HEAD` a durable melee unit (the
 * head of the column is kept for one), `MELEE` another melee unit, `RANGED`
 * a unit that hits from distance 2 or more, `OTHER` a support unit (a
 * Captain) or a unit that does not attack.
 */
export function chokepointUnitClassV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): ChokepointUnitClassV7 {
  if (unit.form !== "LAND") return "OTHER";
  const rule = unitRoleRuleV7(view, unit);
  if (
    !rule.abilities.includes("ATTACK") ||
    rule.attack2 <= 0 ||
    rule.tacticalRole === "SUPPORT"
  )
    return "OTHER";
  if (rule.range >= 2) return "RANGED";
  return rule.defense2 >= CHOKEPOINT_HEAD_DEFENSE2_V7 ? "HEAD" : "MELEE";
}

const isLine = (unitClass: ChokepointUnitClassV7): boolean =>
  unitClass === "HEAD" || unitClass === "MELEE";

/** A unit at half its HP or more is fit to hold or take the head. */
export function chokepointFitV7(unit: PublicUnitV7): boolean {
  return unit.hp * 2 >= unit.maxHp;
}

/**
 * How well a unit leads the column: its HP times the sum of its Attack and
 * Defense (half-units). A Juggernaut leads a Guard, a Guard a Fighter.
 */
export function chokepointStrengthV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  const rule = unitRoleRuleV7(view, unit);
  return unit.hp * (rule.attack2 + rule.defense2);
}

/** The own unit standing on corridor tile `index`, if any. */
export function chokepointOwnUnitAtV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  index: number,
): PublicUnitV7 | undefined {
  const at = plan.corridor[index];
  if (at === undefined) return undefined;
  return view.units.find(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.hp > 0 &&
      unit.at.x === at.x &&
      unit.at.y === at.y,
  );
}

/**
 * The own melee unit (`HEAD` or `MELEE`) nearest the target with a corridor
 * index above `index` (not `excluded`; only a fit one with `fit`): the
 * screen of whatever stands behind it.
 */
export function chokepointScreenAheadV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  index: number,
  excluded: UnitId | null = null,
  fit = false,
): { readonly unit: PublicUnitV7; readonly index: number } | undefined {
  for (let item = plan.headIndex; item > index; item -= 1) {
    const unit = chokepointOwnUnitAtV7(view, plan, item);
    if (
      unit !== undefined &&
      unit.id !== excluded &&
      isLine(chokepointUnitClassV7(view, unit)) &&
      (!fit || chokepointFitV7(unit))
    )
      return { unit, index: item };
  }
  return undefined;
}

/**
 * An own melee unit stands beyond the corridor's far end on the target's
 * side, within one tile of it: the column is through.
 */
export function chokepointColumnBeyondV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
): boolean {
  const far = plan.corridor.at(-1);
  if (far === undefined) return false;
  const farSteps = plan.stepsToTarget(far);
  if (farSteps === undefined) return false;
  return view.units.some((unit) => {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.hp <= 0 ||
      chebyshev(unit.at, far) !== 1 ||
      !isLine(chokepointUnitClassV7(view, unit))
    )
      return false;
    const steps = plan.stepsToTarget(unit.at);
    return steps !== undefined && steps < farSteps;
  });
}

/**
 * A fit `HEAD` unit other than `excluded` stands off the corridor on the
 * home side within `steps` land-route steps of the entrance
 * (`CHOKEPOINT_STAGING_STEPS_V7` by default): a replacement for the head is
 * waiting.
 */
export function chokepointReplacementStagedV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  excluded: UnitId | null,
  steps = CHOKEPOINT_STAGING_STEPS_V7,
): boolean {
  const entrance = plan.corridor[0];
  if (entrance === undefined) return false;
  const entranceSteps = plan.stepsToTarget(entrance);
  if (entranceSteps === undefined) return false;
  return view.units.some((unit) => {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.id === excluded ||
      unit.hp <= 0 ||
      plan.indexOf(unit.at) !== undefined ||
      chokepointUnitClassV7(view, unit) !== "HEAD" ||
      !chokepointFitV7(unit)
    )
      return false;
    const route = plan.stepsToTarget(unit.at);
    return (
      route !== undefined &&
      plan.homeSide(unit.at) &&
      route - entranceSteps <= steps
    );
  });
}

/**
 * The hostile units a siege unit fires at from `at`: the holders within its
 * range band, or the garrison's while the mouth is open.
 */
export function chokepointTargetsInRangeV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  unit: PublicUnitV7,
  at: CoordV7,
): number {
  const rule = unitRoleRuleV7(view, unit);
  let count = 0;
  for (const target of plan.open ? plan.garrison : plan.holders) {
    const range = chebyshev(target.at, at);
    if (range >= rule.minimumRange && range <= rule.range) count += 1;
  }
  return count;
}

const isLaneApron = (plan: ChokepointPlanV7, at: CoordV7): boolean =>
  plan.laneApron !== null &&
  plan.laneApron.x === at.x &&
  plan.laneApron.y === at.y;

/** The apron tiles: the home-side land next to the entrance. */
function apronSize(plan: ChokepointPlanV7): number {
  const entrance = plan.corridor[0];
  if (entrance === undefined) return 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (plan.homeSide({ x: entrance.x + dx, y: entrance.y + dy })) count += 1;
  return count;
}

/**
 * The siege is on: an own `RANGED` unit stands on the corridor, or on the
 * home side within `CHOKEPOINT_STAGING_STEPS_V7` land-route steps of the
 * entrance. The lane behind the head and the apron beside its tail then
 * belong to the siege units.
 */
export function chokepointSiegeStagedV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
): boolean {
  const entrance = plan.corridor[0];
  if (entrance === undefined) return false;
  const entranceSteps = plan.stepsToTarget(entrance);
  if (entranceSteps === undefined) return false;
  return view.units.some((unit) => {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.hp <= 0 ||
      chokepointUnitClassV7(view, unit) !== "RANGED"
    )
      return false;
    if (plan.indexOf(unit.at) !== undefined) return true;
    const route = plan.stepsToTarget(unit.at);
    return (
      route !== undefined &&
      plan.homeSide(unit.at) &&
      route - entranceSteps <= CHOKEPOINT_STAGING_STEPS_V7
    );
  });
}

/**
 * The yard: the home-side land within two tiles of the entrance (the apron
 * and the ring around it), where the column forms up.
 */
export function chokepointYardV7(plan: ChokepointPlanV7, at: CoordV7): boolean {
  const entrance = plan.corridor[0];
  return (
    entrance !== undefined && chebyshev(entrance, at) <= 2 && plan.homeSide(at)
  );
}

/**
 * The yard holds `CHOKEPOINT_YARD_UNITS_V7` own melee units (not counting
 * `excluded`): the next in line. More would pack the yard, and neither a
 * siege unit nor a unit leaving the corridor could move in it.
 */
export function chokepointYardFullV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  excluded: UnitId,
): boolean {
  let count = 0;
  for (const unit of view.units)
    if (
      unit.ownerId === view.viewer.id &&
      unit.id !== excluded &&
      unit.hp > 0 &&
      chokepointYardV7(plan, unit.at) &&
      isLine(chokepointUnitClassV7(view, unit))
    )
      count += 1;
  return count >= CHOKEPOINT_YARD_UNITS_V7;
}

/**
 * The placement rule (the lane discipline of the siege): whether `unit` may
 * stand on (end a Move on) `to`.
 *
 * **The yard** (`chokepointYardV7`). While the siege is on and the mouth is
 * held, a melee unit outside the yard does not enter it once it holds
 * `CHOKEPOINT_YARD_UNITS_V7` melee units: the rest of the army waits behind.
 *
 * **The apron** (the home-side tiles next to the entrance, when there is
 * more than one). The lane's tail (`laneApron`) is for melee units: the
 * column queues through it, and no other unit takes it. The other apron
 * tiles are the siege units' way in and, where they reach the holders,
 * their firing tiles: while the siege is on (`chokepointSiegeStagedV7`) and
 * the mouth is held, melee units stay off them.
 *
 * **The corridor.** A Move back toward home is always allowed. Otherwise:
 *
 * - a support unit or a unit that does not attack stays off the corridor
 *   until the column is through the open mouth;
 * - a `RANGED` unit takes a corridor tile only behind a screen: an own
 *   melee unit ahead of it on the corridor, or the column beyond the open
 *   mouth. Nothing has to pass it there, so it does not block the lane;
 * - a melee unit below half its HP does not enter or advance while the
 *   mouth is held (it would be the wounded head the rotation takes out);
 * - a melee unit takes a tile with no own melee unit ahead of it (it holds
 *   or takes the head) at any time, and follows the column only when the
 *   lane is not needed by the siege (the mouth is open, or no siege unit
 *   is staged) and the unit ahead of it is not a wounded head on its way
 *   out. With the siege on, one melee unit holds the head and the lane
 *   behind it is the siege units'.
 *
 * Among the melee units the policy sends the strongest first
 * (`chokepointStrengthV7`), so the head goes to a durable unit.
 */
export function chokepointPlaceAllowedV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  unit: PublicUnitV7,
  to: CoordV7,
): boolean {
  const toIndex = plan.indexOf(to);
  const unitClass = chokepointUnitClassV7(view, unit);
  const free = (): boolean => plan.open || !chokepointSiegeStagedV7(view, plan);
  if (toIndex === undefined) {
    if (!chokepointApronV7(plan, to) || apronSize(plan) < 2)
      return (
        !isLine(unitClass) ||
        !chokepointYardV7(plan, to) ||
        chokepointYardV7(plan, unit.at) ||
        free() ||
        !chokepointYardFullV7(view, plan, unit.id)
      );
    if (isLaneApron(plan, to))
      return (
        isLine(unitClass) &&
        (chokepointYardV7(plan, unit.at) ||
          free() ||
          !chokepointYardFullV7(view, plan, unit.id))
      );
    return !isLine(unitClass) || free();
  }
  const fromIndex = plan.indexOf(unit.at);
  if (fromIndex !== undefined && toIndex < fromIndex) return true;
  if (unitClass === "OTHER")
    return plan.open && chokepointColumnBeyondV7(view, plan);
  if (unitClass === "RANGED")
    return (
      chokepointScreenAheadV7(view, plan, toIndex) !== undefined ||
      chokepointColumnBeyondV7(view, plan)
    );
  if (!plan.open && !chokepointFitV7(unit)) return false;
  const ahead = chokepointScreenAheadV7(view, plan, toIndex, unit.id);
  if (ahead === undefined) return true;
  // The way out of a wounded head stays free: its relief follows it out.
  return free() && !chokepointShouldVacateV7(view, plan, ahead.unit);
}

/**
 * An own unit stands on an apron tile the lane rule does not give it (a
 * siege or support unit on the lane's tail, a melee unit on the siege
 * units' side while the siege is on): it is in the way and leaves.
 */
export function chokepointApronBlockerV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    chokepointApronV7(plan, unit.at) &&
    !chokepointPlaceAllowedV7(view, plan, unit, unit.at)
  );
}

/**
 * Whether an own unit on the corridor is out of place and should leave
 * toward home:
 *
 * - a support unit or a unit that does not attack, until the column is
 *   through the open mouth;
 * - a siege unit with no melee unit ahead of it once a durable unit is
 *   staged behind it (until then it keeps firing; behind its screen it
 *   stays, whatever the screen's HP): it is in the way;
 * - a melee unit below half its HP with no fit melee unit ahead of it (the
 *   wounded head) while the mouth is held: it rotates out. In single file
 *   it can only do so while the tile behind it is free; a column behind it
 *   holds it in place.
 */
export function chokepointShouldVacateV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
  unit: PublicUnitV7,
): boolean {
  const index = plan.indexOf(unit.at);
  if (index === undefined || unit.ownerId !== view.viewer.id) return false;
  const unitClass = chokepointUnitClassV7(view, unit);
  if (unitClass === "OTHER")
    return !(plan.open && chokepointColumnBeyondV7(view, plan));
  if (unitClass === "RANGED")
    return (
      chokepointScreenAheadV7(view, plan, index) === undefined &&
      !chokepointColumnBeyondV7(view, plan) &&
      chokepointReplacementStagedV7(view, plan, unit.id)
    );
  return (
    !plan.open &&
    !chokepointFitV7(unit) &&
    chokepointScreenAheadV7(view, plan, index, unit.id, true) === undefined
  );
}

/** Whether `at` is an apron tile (home-side land next to the entrance). */
export function chokepointApronV7(
  plan: ChokepointPlanV7,
  at: CoordV7,
): boolean {
  const entrance = plan.corridor[0];
  return (
    entrance !== undefined && chebyshev(entrance, at) === 1 && plan.homeSide(at)
  );
}

/**
 * The apron is the only way out of the corridor. It is jammed when the own
 * unit on the entrance should leave (`chokepointShouldVacateV7`) and every
 * apron tile holds a unit; an own unit on the apron then makes room.
 */
export function chokepointApronJammedV7(
  view: PlayerViewV7,
  plan: ChokepointPlanV7,
): boolean {
  const entrance = plan.corridor[0];
  const leaving = chokepointOwnUnitAtV7(view, plan, 0);
  if (
    entrance === undefined ||
    leaving === undefined ||
    !chokepointShouldVacateV7(view, plan, leaving)
  )
    return false;
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      const at = { x: entrance.x + dx, y: entrance.y + dy };
      if (!plan.homeSide(at)) continue;
      if (!view.units.some((unit) => unit.at.x === at.x && unit.at.y === at.y))
        return false;
    }
  return true;
}

/**
 * The focus of this turn's fire: among the holders an own unit can attack
 * this turn (`damageTo` is the sum of the previewed damage of the unanswered
 * own attacks offered on the holder, null for a holder no own unit can
 * attack), the one the offered fire leaves with the least HP, then the one
 * with the least HP, then the lowest ID. Null when no holder can be
 * attacked.
 */
export function chokepointFocusV7(
  plan: ChokepointPlanV7,
  damageTo: (holder: PublicUnitV7) => number | null,
): PublicUnitV7 | null {
  let best: PublicUnitV7 | null = null;
  let bestLeft = Number.POSITIVE_INFINITY;
  for (const holder of plan.holders) {
    const damage = damageTo(holder);
    if (damage === null) continue;
    const left = holder.hp - damage;
    if (
      best === null ||
      left < bestLeft ||
      (left === bestLeft &&
        (holder.hp < best.hp || (holder.hp === best.hp && holder.id < best.id)))
    ) {
      best = holder;
      bestLeft = left;
    }
  }
  return best;
}

/**
 * The attrition clock has struck: the seat holds at least
 * `CHOKEPOINT_ASSAULT_BANK_V7` Coins it has not spent, so it can replace
 * what an assault costs.
 */
export function chokepointAssaultV7(view: PlayerViewV7): boolean {
  return view.viewer.coins >= CHOKEPOINT_ASSAULT_BANK_V7;
}
