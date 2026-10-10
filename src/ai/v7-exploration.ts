import type { PlayerId } from "../engine/model/ids";
import {
  technologyCapabilitiesV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Normal AI exploration plan (`pulp_wars-nc6`): where a scout goes, how
 * many scouts a seat keeps, and when it stops.
 *
 * The campaign plan (`src/ai/v7-campaign.ts`) sent a scout to the nearest
 * explored land tile next to an unexplored one, and kept one scout once an
 * enemy city was known. Hand-played games showed seats with three cities
 * and unexplored land beside them, scouts that turned back whenever an
 * enemy came in sight (their nearest frontier lay behind it), and scouts
 * that walked to a single unexplored tile in a corner while a whole side of
 * the map was dark.
 *
 * This module answers three questions for the campaign plan, from public
 * information only (the seat's explored tiles, the units on them, and the
 * seat's own technologies):
 *
 * 1. **Which frontier** ({@link explorationGoalV7}). Every frontier tile
 *    the scout can stand on is weighed by what it reveals (the unexplored
 *    tiles inside the scout's real Sight from there, a Mountain with
 *    Engineering seeing one tile farther), by how much unexplored land lies
 *    behind it (the tiles within {@link EXPLORATION_POCKET_RADIUS_V7}: land
 *    that can hold a village), by whether it lies beside an own city, and
 *    by the turns the scout needs to get there with its own movement (a
 *    flyer over Mountains and Rifts, a walker or a Mountain-born unit over
 *    Mountains, Glide on Snow). The route never crosses a tile a visible
 *    enemy can reach next turn, and no such tile is a goal.
 * 2. **How many scouts** ({@link explorationScoutsWantedV7}): by the
 *    unexplored share of the map, the stretches of frontier that can be
 *    reached, and the size of the army.
 * 3. **When to stop** ({@link explorationHomeDangerV7}, and a scout with no
 *    goal): nothing unexplored can be reached safely, or the enemy at an
 *    own center outweighs the units there.
 *
 * An unexplored tile is counted, never read: the view carries no terrain,
 * site, or unit for it, so nothing here can depend on what the fog hides.
 * Nothing draws from the PRNG or depends on elapsed time.
 */

/** Unexplored tiles this close to a frontier tile are the land behind it. */
export const EXPLORATION_POCKET_RADIUS_V7 = 3;
/** What one tile revealed on arrival is worth, in tiles of land behind. */
export const EXPLORATION_REVEAL_WEIGHT_V7 = 2;
/** What one turn of walking costs, in the same unit. */
export const EXPLORATION_TURN_COST_V7 = 6;
/** What a frontier beside an own city is worth more. */
export const EXPLORATION_HOME_VALUE_V7 = 6;
/** With this share (percent) of the map unexplored: up to three scouts. */
export const EXPLORATION_SHARE_THREE_SCOUTS_V7 = 50;
/** With this share (percent) of the map unexplored: up to two scouts. */
export const EXPLORATION_SHARE_TWO_SCOUTS_V7 = 20;
/** One scout for every this many free capturers (at least one). */
export const EXPLORATION_CAPTURERS_PER_SCOUT_V7 = 3;
/** A stretch of frontier has at least this much unexplored land behind it. */
export const EXPLORATION_STRETCH_TILES_V7 = 3;
/** The enemy and the own units this close to an own center are weighed. */
export const EXPLORATION_HOME_DANGER_RADIUS_V7 = 3;

/**
 * What terrain a scout crosses: `GROUND` is Grass and Forest (and Mountains
 * with Engineering), `MOUNTAIN` adds every Mountain (a walker or a
 * Mountain-born unit), `FLY` adds Rifts as well. No class ends a route on
 * water.
 */
export type ExplorationTerrainV7 = "GROUND" | "MOUNTAIN" | "FLY";

export interface ExplorationProfileV7 {
  readonly terrain: ExplorationTerrainV7;
  readonly move: number;
  /** A step from Snow onto Snow costs half (the Ice Folk Glide). */
  readonly glides: boolean;
  /** The unit's Sight with its owner's technologies, on level ground. */
  readonly sight: number;
}

export interface ExplorationFactsV7 {
  readonly isHostile: (ownerId: PlayerId) => boolean;
  /** Another seat whose territory the viewer does not enter. */
  readonly isAllied: (ownerId: PlayerId) => boolean;
  /** A `HOLD` directive: only frontier inside the zone. */
  readonly confine: ((at: CoordV7) => boolean) | null;
}

export interface ExplorationSurveyV7 {
  readonly width: number;
  readonly height: number;
  /** Unexplored tiles the seat may still explore. */
  readonly unexplored: number;
  /** Those as a share of the board, in percent. */
  readonly share: number;
  /** 1 on every tile a visible hostile unit can attack next turn. */
  readonly threat: Uint8Array;
  /** 1 on every explored tile a scout of this class can stand on. */
  readonly enterable: (terrain: ExplorationTerrainV7) => Uint8Array;
  /** The enterable tiles next to an unexplored one, in index order. */
  readonly frontier: (terrain: ExplorationTerrainV7) => readonly number[];
  /** The unexplored tiles within `radius` of a tile. */
  readonly unexploredWithin: (index: number, radius: number) => number;
}

export interface ExplorationGoalV7 {
  readonly index: number;
  readonly at: CoordV7;
  /** The goal and the route to it lie outside every visible enemy's reach. */
  readonly safe: boolean;
  /** Steps to the goal by tile over the scout's route (-1: no route). */
  readonly steps: Int16Array;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** How the unit moves and sees as a scout. */
export function explorationProfileV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): ExplorationProfileV7 {
  const rule = unitRoleRuleV7(view, unit);
  const mode = unitMovementModeV7(view, unit);
  return {
    terrain:
      mode === "FLY"
        ? "FLY"
        : mode === "STRIDE" || unitIsMountainBornV7(view, unit)
          ? "MOUNTAIN"
          : "GROUND",
    move: Math.max(1, rule.move),
    glides: unitRoleMechanicsV7(view, unit).glides,
    sight: Math.max(
      rule.sightRadius,
      technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
        .roleSightRadius[unit.role] ?? 0,
    ),
  };
}

/** The seat's explored map as a scout sees it: frontier, fog, and reach. */
export function explorationSurveyV7(
  view: PlayerViewV7,
  facts: ExplorationFactsV7,
): ExplorationSurveyV7 {
  const { width, height, tiles } = view.board;
  const size = width * height;
  const engineering = view.viewer.researchedTechs.includes("ENGINEERING");
  // An unexplored tile of an ally's land is never entered: it is no fog.
  const fog = new Uint8Array(size);
  let unexplored = 0;
  for (let index = 0; index < size; index += 1) {
    const tile = tiles[index];
    if (tile !== undefined && !tile.explored && !("diplomaticBlock" in tile)) {
      fog[index] = 1;
      unexplored += 1;
    }
  }
  const threat = new Uint8Array(size);
  for (const unit of view.units) {
    if (unit.hp <= 0 || !facts.isHostile(unit.ownerId)) continue;
    const rule = unitRoleRuleV7(view, unit);
    if (rule.attack2 <= 0) continue;
    // Its Move and its range, as the crow flies: never less than its reach.
    const reach = (unit.form === "LAND" ? rule.move : 0) + rule.range;
    for (
      let y = Math.max(0, unit.at.y - reach);
      y <= Math.min(height - 1, unit.at.y + reach);
      y += 1
    )
      for (
        let x = Math.max(0, unit.at.x - reach);
        x <= Math.min(width - 1, unit.at.x + reach);
        x += 1
      )
        threat[y * width + x] = 1;
  }
  const enterableByTerrain = new Map<ExplorationTerrainV7, Uint8Array>();
  const enterable = (terrain: ExplorationTerrainV7): Uint8Array => {
    const cached = enterableByTerrain.get(terrain);
    if (cached !== undefined) return cached;
    const result = new Uint8Array(size);
    for (let index = 0; index < size; index += 1) {
      const tile = tiles[index];
      if (
        tile !== undefined &&
        tile.explored &&
        (tile.terrain === "GRASS" ||
          tile.terrain === "FOREST" ||
          (tile.terrain === "MOUNTAIN" &&
            (engineering || terrain !== "GROUND")) ||
          (tile.terrain === "RIFT" && terrain === "FLY")) &&
        !(
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== view.viewer.id &&
          facts.isAllied(tile.territoryOwnerId)
        )
      )
        result[index] = 1;
    }
    enterableByTerrain.set(terrain, result);
    return result;
  };
  const frontierByTerrain = new Map<ExplorationTerrainV7, number[]>();
  const frontier = (terrain: ExplorationTerrainV7): readonly number[] => {
    const cached = frontierByTerrain.get(terrain);
    if (cached !== undefined) return cached;
    const enter = enterable(terrain);
    const result: number[] = [];
    for (let index = 0; index < size; index += 1) {
      if (enter[index] !== 1) continue;
      const x = index % width;
      const y = (index - x) / width;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy += 1)
        for (let dx = -1; dx <= 1 && !edge; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (fog[ny * width + nx] === 1) edge = true;
        }
      if (edge && (facts.confine === null || facts.confine({ x, y })))
        result.push(index);
    }
    frontierByTerrain.set(terrain, result);
    return result;
  };
  const withinByRadius = new Map<number, Int16Array>();
  const unexploredWithin = (index: number, radius: number): number => {
    let counts = withinByRadius.get(radius);
    if (counts === undefined) {
      counts = new Int16Array(size).fill(-1);
      withinByRadius.set(radius, counts);
    }
    const cached = counts[index] as number;
    if (cached >= 0) return cached;
    const x = index % width;
    const y = (index - x) / width;
    let count = 0;
    for (
      let ny = Math.max(0, y - radius);
      ny <= Math.min(height - 1, y + radius);
      ny += 1
    )
      for (
        let nx = Math.max(0, x - radius);
        nx <= Math.min(width - 1, x + radius);
        nx += 1
      )
        count += fog[ny * width + nx] as number;
    counts[index] = count;
    return count;
  };
  return {
    width,
    height,
    unexplored,
    share: size === 0 ? 0 : Math.floor((100 * unexplored) / size),
    threat,
    enterable,
    frontier,
    unexploredWithin,
  };
}

/**
 * Half-points of movement from `start` to every tile over `enter`, a step
 * costing two and a Glide step (Snow onto Snow, for a unit that glides)
 * one; -1 where no route exists. A tile of `blocked` is never entered; the
 * start tile is always left.
 */
function costsFrom(
  view: PlayerViewV7,
  enter: Uint8Array,
  blocked: Uint8Array | null,
  start: number,
  glides: boolean,
): Int32Array {
  const { width, height, tiles } = view.board;
  const size = width * height;
  const costs = new Int32Array(size).fill(-1);
  const snow = (index: number): boolean => {
    const tile = tiles[index];
    return tile !== undefined && tile.explored && tile.snow === true;
  };
  costs[start] = 0;
  // Costs are one or two, so a tile may be improved once after it was
  // first reached: a plain work list settles in a few passes.
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as number;
    const base = costs[current] as number;
    const x = current % width;
    const y = (current - x) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= width || (dx === 0 && dy === 0)) continue;
        const index = ny * width + nx;
        if (enter[index] !== 1 || (blocked !== null && blocked[index] === 1))
          continue;
        const cost = base + (glides && snow(current) && snow(index) ? 1 : 2);
        const known = costs[index] as number;
        if (known >= 0 && known <= cost) continue;
        costs[index] = cost;
        queue.push(index);
      }
    }
  }
  return costs;
}

/** Steps to `goal` by tile over `enter` (-1: no route). */
function stepsTo(
  width: number,
  height: number,
  enter: Uint8Array,
  blocked: Uint8Array | null,
  goal: number,
  /** A tile that is entered although it is blocked (where the scout stands). */
  open: number,
): Int16Array {
  const size = width * height;
  const steps = new Int16Array(size).fill(-1);
  const queue = new Int32Array(size);
  let tail = 0;
  steps[goal] = 0;
  queue[tail] = goal;
  tail += 1;
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
        if (steps[index] !== -1) continue;
        if (
          index !== open &&
          (enter[index] !== 1 || (blocked !== null && blocked[index] === 1))
        )
          continue;
        steps[index] = next;
        queue[tail] = index;
        tail += 1;
      }
    }
  }
  return steps;
}

/**
 * The frontier tile a scout goes to, or null when it has none.
 *
 * `tiers` are tried in order (the campaign plan's "frontier at home first,
 * then toward the enemy whose city is unseen"), and the last tier is every
 * frontier tile. Inside a tier the tile with the highest value wins:
 * `EXPLORATION_REVEAL_WEIGHT_V7` for every unexplored tile inside the
 * scout's Sight from it, one for every unexplored tile within
 * `EXPLORATION_POCKET_RADIUS_V7`, `EXPLORATION_HOME_VALUE_V7` beside an own
 * city, less `EXPLORATION_TURN_COST_V7` for every turn of the way (ties:
 * the shorter way, then the tile index). A tile in `taken` belongs to
 * another scout. Only tiles and routes outside every visible enemy's reach
 * count.
 *
 * With `allowUnsafe`, a scout with no safe goal takes the nearest frontier
 * tile whatever stands near it (the plan's rule before this module).
 */
export function explorationGoalV7(
  view: PlayerViewV7,
  survey: ExplorationSurveyV7,
  unit: PublicUnitV7,
  options: {
    readonly taken: Uint8Array;
    readonly tiers: readonly ((index: number) => boolean)[];
    readonly home: (index: number) => boolean;
    readonly allowUnsafe: boolean;
  },
): ExplorationGoalV7 | null {
  const { width, height, tiles } = view.board;
  const profile = explorationProfileV7(view, unit);
  const enter = survey.enterable(profile.terrain);
  const frontier = survey.frontier(profile.terrain);
  if (frontier.length === 0) return null;
  const start = unit.at.y * width + unit.at.x;
  const coordOf = (index: number): CoordV7 => ({
    x: index % width,
    y: Math.floor(index / width),
  });
  const engineering = view.viewer.researchedTechs.includes("ENGINEERING");
  const tiers = [...options.tiers, (): boolean => true];
  const safeCosts = costsFrom(
    view,
    enter,
    survey.threat,
    start,
    profile.glides,
  );
  for (const tier of tiers) {
    let best = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const index of frontier) {
      const cost = safeCosts[index] as number;
      if (
        cost < 0 ||
        options.taken[index] === 1 ||
        survey.threat[index] === 1 ||
        !tier(index)
      )
        continue;
      const tile = tiles[index];
      const sight =
        profile.sight +
        Number(
          engineering &&
            tile !== undefined &&
            tile.explored &&
            tile.terrain === "MOUNTAIN",
        );
      const value =
        EXPLORATION_REVEAL_WEIGHT_V7 * survey.unexploredWithin(index, sight) +
        survey.unexploredWithin(index, EXPLORATION_POCKET_RADIUS_V7) +
        (options.home(index) ? EXPLORATION_HOME_VALUE_V7 : 0) -
        EXPLORATION_TURN_COST_V7 * Math.ceil(cost / (2 * profile.move));
      if (value > bestValue || (value === bestValue && cost < bestCost)) {
        best = index;
        bestValue = value;
        bestCost = cost;
      }
    }
    if (best >= 0)
      return {
        index: best,
        at: coordOf(best),
        safe: true,
        steps: stepsTo(width, height, enter, survey.threat, best, start),
      };
  }
  if (!options.allowUnsafe) return null;
  const costs = costsFrom(view, enter, null, start, profile.glides);
  for (const tier of tiers) {
    let best = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const index of frontier) {
      const cost = costs[index] as number;
      if (
        cost < 0 ||
        cost >= bestCost ||
        options.taken[index] === 1 ||
        !tier(index)
      )
        continue;
      best = index;
      bestCost = cost;
    }
    if (best >= 0)
      return {
        index: best,
        at: coordOf(best),
        safe: false,
        steps: stepsTo(width, height, enter, null, best, start),
      };
  }
  return null;
}

/**
 * The stretches of frontier a seat can explore: ground frontier tiles
 * outside every visible enemy's reach, reachable (`reachable(index)`), with
 * at least `EXPLORATION_STRETCH_TILES_V7` unexplored tiles within
 * `EXPLORATION_POCKET_RADIUS_V7`, no two of them nearer than `spacing`.
 */
export function explorationStretchesV7(
  survey: ExplorationSurveyV7,
  reachable: (index: number) => boolean,
  spacing: number,
): number {
  const picked: CoordV7[] = [];
  for (const index of survey.frontier("GROUND")) {
    if (
      survey.threat[index] === 1 ||
      !reachable(index) ||
      survey.unexploredWithin(index, EXPLORATION_POCKET_RADIUS_V7) <
        EXPLORATION_STRETCH_TILES_V7
    )
      continue;
    const at = {
      x: index % survey.width,
      y: Math.floor(index / survey.width),
    };
    if (picked.every((other) => chebyshev(other, at) >= spacing))
      picked.push(at);
  }
  return picked.length;
}

/**
 * How many scouts the seat keeps: the smallest of
 *
 * - the stretches of frontier it can explore (`stretches`);
 * - three while `EXPLORATION_SHARE_THREE_SCOUTS_V7` percent of the map is
 *   unexplored, two while `EXPLORATION_SHARE_TWO_SCOUTS_V7` percent is, one
 *   below that;
 * - one for every `EXPLORATION_CAPTURERS_PER_SCOUT_V7` free capturers (at
 *   least one): the army is not sent away to look at the map.
 *
 * Zero when nothing is left to explore.
 */
export function explorationScoutsWantedV7(
  survey: ExplorationSurveyV7,
  stretches: number,
  capturers: number,
): number {
  if (survey.unexplored === 0 || stretches <= 0) return 0;
  const byShare =
    survey.share >= EXPLORATION_SHARE_THREE_SCOUTS_V7
      ? 3
      : survey.share >= EXPLORATION_SHARE_TWO_SCOUTS_V7
        ? 2
        : 1;
  const byArmy = Math.max(
    1,
    Math.floor(capturers / EXPLORATION_CAPTURERS_PER_SCOUT_V7),
  );
  return Math.min(stretches, byShare, byArmy);
}

/**
 * The seat needs its bodies at home: at some own center the hostile land
 * units within `EXPLORATION_HOME_DANGER_RADIUS_V7` weigh at least as much
 * as the own land units within the same distance (`strength`: what a unit
 * is worth in an assault).
 */
export function explorationHomeDangerV7(input: {
  readonly ownCenters: readonly CoordV7[];
  readonly hostiles: readonly PublicUnitV7[];
  readonly own: readonly PublicUnitV7[];
  readonly strength: (unit: PublicUnitV7) => number;
}): boolean {
  const weight = (units: readonly PublicUnitV7[], center: CoordV7): number =>
    units.reduce(
      (sum, unit) =>
        chebyshev(unit.at, center) <= EXPLORATION_HOME_DANGER_RADIUS_V7
          ? sum + input.strength(unit)
          : sum,
      0,
    );
  return input.ownCenters.some((center) => {
    const hostile = weight(input.hostiles, center);
    return hostile > 0 && hostile >= weight(input.own, center);
  });
}
