import type { UnitId } from "../engine/model/ids";
import type { CoordV7 } from "../engine/v7/types";
import { previewMonsterV7, type MonsterPreviewV7 } from "../engine/v7/query";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Normal AI awareness of the map curiosities (`pulp_wars-737.4`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 11): the Giant Spider,
 * the Fountain of Youth, the Shrine, and the Sunken Wreck.
 *
 * Every input is public: the explored curiosities and the visible Monsters
 * of the view, `previewMonsterV7`, the visible units, and the explored
 * tiles. Nothing reads the wander draw, draws from a PRNG, or depends on
 * elapsed time. Every helper is gated on `curiosityFactsV7`, which is null
 * for a view with no curiosity and no Monster, so a match without one keeps
 * its decisions and hashes byte for byte.
 */

/**
 * The switch for the head-to-head test the project requires of an AI
 * change (the curiosity-aware policy against the policy of
 * `pulp-wars-poc-7r36`, which ignored curiosities): a test or a headless
 * harness sets it before a seat's decision. With `curiosityPlay` off the
 * policy decides exactly as it did before this module.
 */
export interface CuriosityPolicyOptionsV7 {
  readonly curiosityPlay: boolean;
}

export const DEFAULT_CURIOSITY_POLICY_OPTIONS_V7: CuriosityPolicyOptionsV7 =
  Object.freeze({ curiosityPlay: true });

let curiosityPolicyOptions: CuriosityPolicyOptionsV7 =
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7;

/** The options the next decisions use. */
export function curiosityPolicyOptionsV7(): CuriosityPolicyOptionsV7 {
  return curiosityPolicyOptions;
}

/**
 * Tests and headless harnesses only: changes the options and returns the
 * previous ones (restore them when done).
 */
export function setCuriosityPolicyOptionsV7(
  options: Partial<CuriosityPolicyOptionsV7>,
): CuriosityPolicyOptionsV7 {
  const previous = curiosityPolicyOptions;
  curiosityPolicyOptions = Object.freeze({
    ...curiosityPolicyOptions,
    ...options,
  });
  return previous;
}

// --- Priorities and bounds --------------------------------------------------

/**
 * The published rule numbers the policy reads (section 8.2): the HP a
 * Monster regenerates each neutral turn and the Coins its kill pays. The
 * policy keeps its own copies because the engine module that defines them
 * also holds map generation and its PRNG stream, which no policy module
 * imports; `tests/unit/ruleset-v7-curiosities-ai.test.ts` pins them to the
 * engine's `MONSTER_REGENERATION_V7` and `MONSTER_BOUNTY_V7`.
 */
export const MONSTER_REGENERATION_FOR_POLICY_V7 = 4;
export const MONSTER_BOUNTY_FOR_POLICY_V7 = 10;

/**
 * A unit the Spider would attack steps out of its reach: above the routine
 * Moves and the chips (900), just below a hunt Move (1177) and every kill.
 */
export const MONSTER_STEP_AWAY_PRIORITY_V7 = 1176;
/** A Move that ends on a Shrine or a Wreck: the treasure-chest priority. */
export const CURIOSITY_CLAIM_PRIORITY_V7 = 1330;
/** A Move toward a Shrine or a Wreck: just above the routine Moves (700–715). */
export const CURIOSITY_APPROACH_PRIORITY_V7 = 725;
/**
 * A wounded unit's Move onto, or toward, a safe Fountain: above `RECOVER`
 * (930) and the wounded Windmill staging (940).
 */
export const FOUNTAIN_ARRIVE_PRIORITY_V7 = 946;
export const FOUNTAIN_APPROACH_PRIORITY_V7 = 944;
/** A Shrine or a Wreck is an errand for a unit within this many steps. */
export const CURIOSITY_ERRAND_STEPS_V7 = 4;
/** An idle Patrol Boat sails for a Wreck within this many water steps. */
export const PATROL_BOAT_WRECK_STEPS_V7 = 8;
/** A Fountain is an errand within this many turns of the unit's Move. */
export const FOUNTAIN_ERRAND_TURNS_V7 = 2;
/** A sole city defender: no other own land unit within this of its center. */
export const SOLE_DEFENDER_RADIUS_V7 = 2;
/** A capturer this close to a center it can take keeps to its capture. */
export const PLANNED_CAPTURE_RADIUS_V7 = 2;

// --- Facts -------------------------------------------------------------------

export interface MonsterFactsV7 {
  readonly unit: PublicUnitV7;
  readonly preview: MonsterPreviewV7;
  /** The tiles next to it: a unit that ends there provokes it. */
  readonly provokeKeys: ReadonlySet<string>;
  /** Every tile it could attack on its next turn after one step. */
  readonly reachKeys: ReadonlySet<string>;
  /** The visible units that hurt it since its last turn. */
  readonly provokedBy: ReadonlySet<UnitId>;
}

export interface CuriosityFactsV7 {
  readonly monsters: readonly MonsterFactsV7[];
  readonly monsterById: ReadonlyMap<UnitId, MonsterFactsV7>;
  readonly fountains: readonly CoordV7[];
  readonly shrines: readonly CoordV7[];
  readonly wrecks: readonly CoordV7[];
}

const key = (at: CoordV7): string => `${at.y},${at.x}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const factsByView = new WeakMap<PlayerViewV7, CuriosityFactsV7>();

/**
 * The gate: the public curiosity facts of a view, or null when the view
 * has no curiosity and no Monster (or the switch is off).
 */
export function curiosityFactsV7(view: PlayerViewV7): CuriosityFactsV7 | null {
  if (view.curiosities.length === 0 && view.monsters.length === 0) return null;
  if (!curiosityPolicyOptions.curiosityPlay) return null;
  const cached = factsByView.get(view);
  if (cached !== undefined) return cached;
  const monsters: MonsterFactsV7[] = [];
  for (const entry of view.monsters) {
    const preview = previewMonsterV7(view, entry.unitId);
    const unit = view.units.find((candidate) => candidate.id === entry.unitId);
    if (preview === null || unit === undefined) continue;
    monsters.push({
      unit,
      preview,
      provokeKeys: new Set(preview.provokeTiles.map(key)),
      reachKeys: new Set(preview.reachTiles.map(key)),
      provokedBy: new Set(entry.provokedBy),
    });
  }
  const of = (kind: "FOUNTAIN" | "SHRINE" | "WRECK"): readonly CoordV7[] =>
    view.curiosities
      .filter((curiosity) => curiosity.kind === kind)
      .map((curiosity) => curiosity.at);
  const facts: CuriosityFactsV7 = {
    monsters,
    monsterById: new Map(monsters.map((monster) => [monster.unit.id, monster])),
    fountains: of("FOUNTAIN"),
    shrines: of("SHRINE"),
    wrecks: of("WRECK"),
  };
  factsByView.set(view, facts);
  return facts;
}

/** The first visible Monster whose provoke tiles include `at`. */
export function monsterProvokedAtV7(
  facts: CuriosityFactsV7,
  at: CoordV7,
): MonsterFactsV7 | undefined {
  const where = key(at);
  return facts.monsters.find((monster) => monster.provokeKeys.has(where));
}

/**
 * Section 11, "Threat": whether `monster` would count the unit `unitId`,
 * standing on `at` at the Monster's turn, among its candidates: next to
 * it, or listed in its `provokedBy` and inside its reach.
 */
export function monsterThreatensV7(
  monster: MonsterFactsV7,
  unitId: UnitId,
  at: CoordV7,
): boolean {
  const where = key(at);
  return (
    monster.provokeKeys.has(where) ||
    (monster.provokedBy.has(unitId) && monster.reachKeys.has(where))
  );
}

/** The visible Monsters that threaten the unit `unitId` on `at`. */
export function monstersThreateningV7(
  facts: CuriosityFactsV7,
  unitId: UnitId,
  at: CoordV7,
): readonly MonsterFactsV7[] {
  return facts.monsters.filter((monster) =>
    monsterThreatensV7(monster, unitId, at),
  );
}

/**
 * A sole city defender: an own land unit on the center of one of its
 * owner's cities while no other land unit of that owner stands within
 * `SOLE_DEFENDER_RADIUS_V7` of the center. No curiosity heuristic ever
 * moves one.
 */
export function soleCityDefenderV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  if (unit.form !== "LAND") return false;
  const city = view.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && same(candidate.at, unit.at),
  );
  if (city === undefined) return false;
  return !view.units.some(
    (other) =>
      other.id !== unit.id &&
      other.ownerId === unit.ownerId &&
      other.form === "LAND" &&
      other.hp > 0 &&
      chebyshev(other.at, city.at) <= SOLE_DEFENDER_RADIUS_V7,
  );
}

// --- Errands -----------------------------------------------------------------

export interface CuriosityErrandV7 {
  readonly kind: "FOUNTAIN" | "SHRINE" | "WRECK";
  readonly at: CoordV7;
  /** Route steps to `at` from every tile within the errand's bound. */
  readonly steps: ReadonlyMap<string, number>;
}

/** What the errand planner needs from the policy, all public. */
export interface CuriosityPolicyToolsV7 {
  readonly view: PlayerViewV7;
  readonly facts: CuriosityFactsV7;
  /** The unit's Move (tiles per turn) in its current form. */
  readonly move: (unit: PublicUnitV7) => number;
  /** A construct is not healed by a Fountain. */
  readonly construct: (unit: PublicUnitV7) => boolean;
  /** A growing unit (a dinosaur) cannot be Promoted, nor claim a Shrine. */
  readonly grows: (unit: PublicUnitV7) => boolean;
  /** The unit can capture a settlement center. */
  readonly captures: (unit: PublicUnitV7) => boolean;
  /** The visible damage the unit would take standing on `at`. */
  readonly danger: (unit: PublicUnitV7, at: CoordV7) => number;
  /** The naval plan sees hostile ships: no Patrol Boat is idle. */
  readonly navalDanger: boolean;
}

/**
 * Route steps (8-way) to `target` over explored tiles the terrain test
 * accepts, up to `limit` steps. Units are not walls: the offered Moves say
 * what a unit can really do; the steps only say which Move comes closer.
 */
export function curiosityRouteStepsV7(
  view: PlayerViewV7,
  target: CoordV7,
  limit: number,
  water: boolean,
): ReadonlyMap<string, number> {
  const { width, height } = view.board;
  const passable = (at: CoordV7): boolean => {
    if (at.x < 0 || at.y < 0 || at.x >= width || at.y >= height) return false;
    const tile = view.board.tiles[at.y * width + at.x];
    if (tile?.explored !== true) return false;
    const afloat =
      tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER";
    return water ? afloat : !afloat && tile.terrain !== "RIFT";
  };
  const steps = new Map<string, number>();
  if (!passable(target)) return steps;
  const queue: { readonly at: CoordV7; readonly steps: number }[] = [
    { at: target, steps: 0 },
  ];
  steps.set(key(target), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item === undefined || item.steps >= limit) continue;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const next = { x: item.at.x + dx, y: item.at.y + dy };
        if ((dx === 0 && dy === 0) || !passable(next) || steps.has(key(next)))
          continue;
        steps.set(key(next), item.steps + 1);
        queue.push({ at: next, steps: item.steps + 1 });
      }
  }
  return steps;
}

/** Section 6 (and section 17): a land unit that is no veteran and never grows. */
export function shrineEligibleForPolicyV7(
  tools: CuriosityPolicyToolsV7,
  unit: PublicUnitV7,
): boolean {
  return unit.form === "LAND" && !unit.veteran && !tools.grows(unit);
}

/**
 * A capturer on or within `PLANNED_CAPTURE_RADIUS_V7` of a center it can
 * take (a hostile city or an unowned village) has a capture to make: it is
 * never sent to a Shrine instead.
 */
function plannedCapturerV7(
  tools: CuriosityPolicyToolsV7,
  unit: PublicUnitV7,
): boolean {
  if (!tools.captures(unit)) return false;
  const { view } = tools;
  return view.board.tiles.some(
    (tile) =>
      tile.explored &&
      tile.site !== null &&
      tile.territoryOwnerId !== unit.ownerId &&
      chebyshev(tile.at, unit.at) <= PLANNED_CAPTURE_RADIUS_V7 &&
      !view.cities.some(
        (city) => city.ownerId === unit.ownerId && same(city.at, tile.at),
      ),
  );
}

/**
 * Section 11: the errand of each own unit, at most one per unit and one
 * unit per curiosity, in the order Fountains, Shrines, Wrecks (each kind in
 * (y, x) order of its tiles):
 *
 * - **Fountain.** The own land unit standing on it while it is hurt keeps
 *   it. Otherwise, when the Fountain is free (no unit of another owner on
 *   it) and no visible enemy can strike a unit there, the nearest own land
 *   unit at half HP or less, not a construct and not a sole city defender,
 *   within two turns of its Move.
 * - **Shrine.** The nearest own unit that could be Promoted there, within
 *   four route steps, not a sole city defender and with no capture to make.
 * - **Wreck.** The nearest own unit afloat within four water steps (an idle
 *   Patrol Boat within eight).
 *
 * Ties go to the lower unit ID.
 */
export function planCuriosityErrandsV7(
  tools: CuriosityPolicyToolsV7,
): ReadonlyMap<UnitId, CuriosityErrandV7> {
  const { view, facts } = tools;
  const errands = new Map<UnitId, CuriosityErrandV7>();
  const own = view.units
    .filter((unit) => unit.ownerId === view.viewer.id && unit.hp > 0)
    .sort((left, right) => left.id - right.id);
  const nearest = (
    steps: ReadonlyMap<string, number>,
    eligible: (unit: PublicUnitV7, distance: number) => boolean,
  ): PublicUnitV7 | undefined => {
    let best: PublicUnitV7 | undefined;
    let bestSteps = Number.POSITIVE_INFINITY;
    for (const unit of own) {
      const distance = steps.get(key(unit.at));
      if (
        distance === undefined ||
        distance >= bestSteps ||
        errands.has(unit.id) ||
        !eligible(unit, distance)
      )
        continue;
      best = unit;
      bestSteps = distance;
    }
    return best;
  };

  for (const at of facts.fountains) {
    const occupant = view.units.find(
      (unit) => unit.hp > 0 && same(unit.at, at),
    );
    if (occupant !== undefined && occupant.ownerId !== view.viewer.id) continue;
    const heals = (unit: PublicUnitV7): boolean =>
      unit.form === "LAND" && !tools.construct(unit) && unit.hp < unit.maxHp;
    const limit = Math.max(
      0,
      ...own
        .filter((unit) => unit.form === "LAND")
        .map((unit) => FOUNTAIN_ERRAND_TURNS_V7 * tools.move(unit)),
    );
    const steps = curiosityRouteStepsV7(view, at, limit, false);
    if (occupant !== undefined) {
      // The unit on it stands until it has healed; nobody else is sent.
      if (heals(occupant) && tools.danger(occupant, at) <= 0)
        errands.set(occupant.id, { kind: "FOUNTAIN", at, steps });
      if (heals(occupant)) continue;
    }
    const patient = nearest(
      steps,
      (unit, distance) =>
        heals(unit) &&
        unit.hp * 2 <= unit.maxHp &&
        distance > 0 &&
        distance <= FOUNTAIN_ERRAND_TURNS_V7 * tools.move(unit) &&
        !soleCityDefenderV7(view, unit) &&
        tools.danger(unit, at) <= 0,
    );
    if (patient !== undefined)
      errands.set(patient.id, { kind: "FOUNTAIN", at, steps });
  }

  for (const at of facts.shrines) {
    const steps = curiosityRouteStepsV7(
      view,
      at,
      CURIOSITY_ERRAND_STEPS_V7,
      false,
    );
    const pilgrim = nearest(
      steps,
      (unit, distance) =>
        distance > 0 &&
        shrineEligibleForPolicyV7(tools, unit) &&
        !soleCityDefenderV7(view, unit) &&
        !plannedCapturerV7(tools, unit),
    );
    if (pilgrim !== undefined)
      errands.set(pilgrim.id, { kind: "SHRINE", at, steps });
  }

  for (const at of facts.wrecks) {
    const steps = curiosityRouteStepsV7(
      view,
      at,
      PATROL_BOAT_WRECK_STEPS_V7,
      true,
    );
    const salvager = nearest(
      steps,
      (unit, distance) =>
        distance > 0 &&
        (unit.form === "NAVAL" || unit.form === "EMBARKED") &&
        (distance <= CURIOSITY_ERRAND_STEPS_V7 ||
          (unit.role === "PATROL_BOAT" && !tools.navalDanger)),
    );
    if (salvager !== undefined)
      errands.set(salvager.id, { kind: "WRECK", at, steps });
  }
  return errands;
}

/**
 * The value of an errand unit's Move that ends on `to`: the claim (or the
 * arrival on the Fountain), a step that brings it closer, or null for a
 * Move that does neither.
 */
export function curiosityErrandMoveV7(
  errand: CuriosityErrandV7,
  from: CoordV7,
  to: CoordV7,
): { readonly priority: number; readonly strategic: number } | null {
  const fountain = errand.kind === "FOUNTAIN";
  if (same(to, errand.at))
    return {
      priority: fountain
        ? FOUNTAIN_ARRIVE_PRIORITY_V7
        : CURIOSITY_CLAIM_PRIORITY_V7,
      strategic: 1,
    };
  const before = errand.steps.get(key(from));
  const after = errand.steps.get(key(to));
  if (before === undefined || after === undefined || after >= before)
    return null;
  return {
    priority: fountain
      ? FOUNTAIN_APPROACH_PRIORITY_V7
      : CURIOSITY_APPROACH_PRIORITY_V7,
    strategic: before - after,
  };
}
