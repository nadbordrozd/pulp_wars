import type { UnitId } from "../engine/model/ids";
import type { CoordV7, NeutralBreedV7 } from "../engine/v7/types";
import {
  previewGateV7,
  previewMonsterV7,
  type GatePreviewV7,
  type MonsterPreviewV7,
} from "../engine/v7/query";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Normal AI awareness of the map curiosities (`pulp_wars-737.4`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 11): the Giant Spider,
 * the Fountain of Youth, the Shrine, and the Sunken Wreck; and of round 2
 * (`pulp_wars-737.15`, section 33): the camp guards of a Downed Saucer or a
 * Graveyard, the Dimensional Gates, Bigfoot, and the Wishing Well.
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
 * Round 2 (sections 25.2 and 29.1): the Coins each neutral breed's kill
 * pays, pinned to the engine's `NEUTRAL_BOUNTIES_V7` by the round-2 AI
 * test. Only the Spider regenerates.
 */
export const NEUTRAL_BOUNTY_FOR_POLICY_V7: Readonly<
  Record<NeutralBreedV7, number>
> = Object.freeze({
  GIANT_SPIDER: MONSTER_BOUNTY_FOR_POLICY_V7,
  GRUNT: 3,
  RAY_GUNNER: 4,
  SHIELD_PROJECTOR: 4,
  ZOMBIE: 5,
  BIGFOOT: 12,
});
/**
 * Section 33, "avoid unless strong": a unit strikes a camp guard only when
 * the guards this turn's kills leave standing would deal it less than its
 * HP divided by this at the next neutral turn.
 */
export const CAMP_ANSWER_HP_DIVISOR_V7 = 2;
/** Section 33: the Coins a seat has before it tosses one into the Well. */
export const WELL_TOSS_COINS_V7 = 3;

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
/**
 * Round 2, Bigfoot (section 33, "opportunistic"): a Move that sets up this
 * turn's kill of Bigfoot ranks just above the routine Moves (at most 735),
 * so below every capture, kill, chest, errand of a wounded unit, and hunt
 * of a unit that fights back.
 */
export const BIGFOOT_HUNT_MOVE_PRIORITY_V7 = 736;
/**
 * Round 2, the Wishing Well: the toss, and the Move onto the Well of the
 * unit sent to toss. Above `RECOVER` (930), the wounded Windmill staging
 * (940), and the Fountain (946), so the unit the errand picked goes; below
 * the step away from a Monster (1176), every hunt, kill, and capture.
 */
export const WELL_TOSS_PRIORITY_V7 = 950;
export const WELL_ARRIVE_PRIORITY_V7 = 948;
/**
 * Round 2, the gates: the Move onto the entry gate of a unit whose gate
 * route is shorter, and a Move that brings it closer to that gate (the
 * routine tier, as a Shrine's approach).
 */
export const GATE_TRAVERSE_PRIORITY_V7 = 728;
export const GATE_APPROACH_PRIORITY_V7 = 725;
/** The gate route counts when it saves at least this many turns. */
export const GATE_ROUTE_TURNS_SAVED_V7 = 3;
/** A sole city defender: no other own land unit within this of its center. */
export const SOLE_DEFENDER_RADIUS_V7 = 2;
/** A capturer this close to a center it can take keeps to its capture. */
export const PLANNED_CAPTURE_RADIUS_V7 = 2;

// --- Facts -------------------------------------------------------------------

export interface MonsterFactsV7 {
  readonly unit: PublicUnitV7;
  readonly preview: MonsterPreviewV7;
  /** Round 2: its breed (the Spider, a camp guard, or Bigfoot). */
  readonly breed: NeutralBreedV7;
  /** Its lair, its camp centre, or Bigfoot's home. */
  readonly home: CoordV7;
  /** The tiles of the engine preview's `provokeTiles`. */
  readonly provokeKeys: ReadonlySet<string>;
  /** Every tile it could attack on its next turn after one step. */
  readonly reachKeys: ReadonlySet<string>;
  /**
   * The visible units that hurt it since its last turn; for a camp guard,
   * those that hurt any visible guard of its camp (section 25.4: a hurt to
   * one guard provokes the camp). Empty for Bigfoot, which is never
   * provoked.
   */
  readonly provokedBy: ReadonlySet<UnitId>;
  /**
   * Section 33, "no routine Move ends on a camp's `provokeTiles`": the
   * Spider's and a guard's provoke tiles. Empty for Bigfoot: standing
   * within 3 of it only makes it flee.
   */
  readonly avoidKeys: ReadonlySet<string>;
  /**
   * Section 33, "Threat": the tiles where it would count a unit among its
   * candidates unprovoked. The Spider's provoke tiles; a guard's provoke
   * tiles within its reach; none for Bigfoot, which never attacks.
   */
  readonly threatKeys: ReadonlySet<string>;
  /** The Coins its kill pays. */
  readonly bounty: number;
  /** The HP it regenerates each neutral turn (only the Spider's is not 0). */
  readonly regeneration: number;
}

/** Round 2 (section 28): a visible gate and where it leads. */
export interface GateFactsV7 {
  readonly at: CoordV7;
  readonly exit: CoordV7;
}

/** Round 2 (section 30): a visible Wishing Well. */
export interface WellFactsV7 {
  readonly at: CoordV7;
  /** The viewer has tossed its Coin there. */
  readonly tossed: boolean;
}

export interface CuriosityFactsV7 {
  readonly monsters: readonly MonsterFactsV7[];
  readonly monsterById: ReadonlyMap<UnitId, MonsterFactsV7>;
  readonly fountains: readonly CoordV7[];
  readonly shrines: readonly CoordV7[];
  readonly wrecks: readonly CoordV7[];
  /** Round 2: the visible gates, in (y, x) order. */
  readonly gates: readonly GateFactsV7[];
  readonly gateByKey: ReadonlyMap<string, GateFactsV7>;
  /** Round 2: the visible Wishing Wells. */
  readonly wells: readonly WellFactsV7[];
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
    const breed = preview.breed;
    const bigfoot = breed === "BIGFOOT";
    const guard = !bigfoot && breed !== "GIANT_SPIDER";
    const provokeKeys = new Set(preview.provokeTiles.map(key));
    const reachKeys = new Set(preview.reachTiles.map(key));
    monsters.push({
      unit,
      preview,
      breed,
      home: preview.home,
      provokeKeys,
      reachKeys,
      provokedBy: new Set(
        bigfoot
          ? []
          : guard
            ? view.monsters
                .filter(
                  (other) =>
                    other.breed !== "GIANT_SPIDER" &&
                    other.breed !== "BIGFOOT" &&
                    same(other.home, entry.home),
                )
                .flatMap((other) => other.provokedBy)
            : entry.provokedBy,
      ),
      avoidKeys: bigfoot ? new Set() : provokeKeys,
      threatKeys: bigfoot
        ? new Set()
        : guard
          ? new Set([...provokeKeys].filter((tile) => reachKeys.has(tile)))
          : provokeKeys,
      bounty: NEUTRAL_BOUNTY_FOR_POLICY_V7[breed],
      regeneration:
        breed === "GIANT_SPIDER" ? MONSTER_REGENERATION_FOR_POLICY_V7 : 0,
    });
  }
  const gates: GateFactsV7[] = [];
  const wells: WellFactsV7[] = [];
  for (const curiosity of view.curiosities) {
    if (curiosity.kind === "GATE")
      gates.push({ at: curiosity.at, exit: curiosity.partner });
    else if (curiosity.kind === "WISHING_WELL")
      wells.push({
        at: curiosity.at,
        tossed: curiosity.tossedBy.includes(view.viewer.id),
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
    gates,
    gateByKey: new Map(gates.map((gate) => [key(gate.at), gate])),
    wells,
  };
  factsByView.set(view, facts);
  return facts;
}

/**
 * The first visible Monster that keeps a routine Move off `at`: the Spider
 * or a camp guard whose provoke tiles include it (never Bigfoot).
 */
export function monsterProvokedAtV7(
  facts: CuriosityFactsV7,
  at: CoordV7,
): MonsterFactsV7 | undefined {
  const where = key(at);
  return facts.monsters.find((monster) => monster.avoidKeys.has(where));
}

/**
 * Section 11 and section 33, "Threat": whether `monster` would count the
 * unit `unitId`, standing on `at` at the neutral turn, among its
 * candidates: on its threat tiles (next to the Spider; on a guard's provoke
 * tiles within its reach), or listed in its `provokedBy` and inside its
 * reach. Never for Bigfoot.
 */
export function monsterThreatensV7(
  monster: MonsterFactsV7,
  unitId: UnitId,
  at: CoordV7,
): boolean {
  const where = key(at);
  return (
    monster.threatKeys.has(where) ||
    (monster.provokedBy.has(unitId) && monster.reachKeys.has(where))
  );
}

/**
 * Whether the unit `unitId` on `at` is where the policy does not leave a
 * unit: on a tile a routine Move avoids, or where `monster` threatens it.
 * A unit there with no attack to make steps out (sections 11 and 33).
 */
export function monsterHoldsOffV7(
  monster: MonsterFactsV7,
  unitId: UnitId,
  at: CoordV7,
): boolean {
  return (
    monster.avoidKeys.has(key(at)) || monsterThreatensV7(monster, unitId, at)
  );
}

/** The other visible guards of `monster`'s camp (none for another breed). */
export function campMatesV7(
  facts: CuriosityFactsV7,
  monster: MonsterFactsV7,
): readonly MonsterFactsV7[] {
  if (monster.breed === "GIANT_SPIDER" || monster.breed === "BIGFOOT")
    return [];
  return facts.monsters.filter(
    (other) =>
      other !== monster &&
      other.breed !== "GIANT_SPIDER" &&
      other.breed !== "BIGFOOT" &&
      same(other.home, monster.home),
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
  readonly kind: "FOUNTAIN" | "SHRINE" | "WRECK" | "WELL" | "GATE";
  /** The curiosity's tile (for a gate errand: the entry gate). */
  readonly at: CoordV7;
  /** Route steps to `at` from every tile within the errand's bound. */
  readonly steps: ReadonlyMap<string, number>;
  /** A gate errand: the engine's preview of the unit's traversal. */
  readonly gate?: GatePreviewV7;
  /**
   * A gate errand: the traversal is not made now (the exit holds an own
   * unit, or its occupant cannot be shoved aside). The unit waits by the
   * gate.
   */
  readonly held?: boolean;
}

/** A unit's route goal and the land-route steps to it from a tile. */
export interface CuriosityRouteGoalV7 {
  readonly at: CoordV7;
  readonly steps: (from: CoordV7) => number | undefined;
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
  /**
   * Round 2. The unit has an offered attack on a seat's unit (not on a
   * neutral one). Absent: the Well gets no errand.
   */
  readonly otherTargets?: (unit: PublicUnitV7) => boolean;
  /** Round 2. An offered Move of the unit ends on `at`. */
  readonly reaches?: (unit: PublicUnitV7, at: CoordV7) => boolean;
  /**
   * Round 2. The unit's route goal, when it is a visible tile, or null.
   * Absent: the gates get no errand.
   */
  readonly goal?: (unit: PublicUnitV7) => CuriosityRouteGoalV7 | null;
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
 * Round 2 (section 33), after those:
 *
 * - **Wishing Well.** While the seat has not tossed there and has at least
 *   `WELL_TOSS_COINS_V7` Coins: the own land unit standing on the Well, or,
 *   on a free Well, one that an offered Move takes onto it this turn; never
 *   a sole city defender, a unit with an offered attack on a seat's unit,
 *   or one the visible enemies would kill there. A unit at half HP or less
 *   is preferred, then the nearest.
 * - **Gates.** Every own land unit left whose route goal is visible and
 *   whose gate route (the walk to a visible gate, the traversal, the walk
 *   on from its exit) is at least `GATE_ROUTE_TURNS_SAVED_V7` turns shorter
 *   than its land route (or the only route), of the gates the best. Never
 *   through an exit on a Spider's or a camp's provoke tiles, or where the
 *   visible enemies would kill it. Several units may use one gate.
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

  const { otherTargets, reaches, goal } = tools;
  if (
    otherTargets !== undefined &&
    reaches !== undefined &&
    view.viewer.coins >= WELL_TOSS_COINS_V7
  )
    for (const well of facts.wells) {
      if (well.tossed) continue;
      const fit = (unit: PublicUnitV7): boolean =>
        unit.form === "LAND" &&
        !errands.has(unit.id) &&
        !soleCityDefenderV7(view, unit) &&
        !otherTargets(unit) &&
        tools.danger(unit, well.at) < unit.hp;
      const steps = curiosityRouteStepsV7(
        view,
        well.at,
        Math.max(
          0,
          ...own
            .filter((unit) => unit.form === "LAND")
            .map((unit) => tools.move(unit)),
        ),
        false,
      );
      const occupant = view.units.find(
        (unit) => unit.hp > 0 && same(unit.at, well.at),
      );
      if (occupant !== undefined) {
        if (occupant.ownerId === view.viewer.id && fit(occupant))
          errands.set(occupant.id, { kind: "WELL", at: well.at, steps });
        continue;
      }
      let tosser: PublicUnitV7 | undefined;
      let tosserRank: readonly [number, number] | undefined;
      for (const unit of own) {
        if (!fit(unit) || !reaches(unit, well.at)) continue;
        const rank: readonly [number, number] = [
          unit.hp * 2 <= unit.maxHp ? 0 : 1,
          steps.get(key(unit.at)) ?? chebyshev(unit.at, well.at),
        ];
        if (
          tosserRank === undefined ||
          rank[0] < tosserRank[0] ||
          (rank[0] === tosserRank[0] && rank[1] < tosserRank[1])
        ) {
          tosser = unit;
          tosserRank = rank;
        }
      }
      if (tosser !== undefined)
        errands.set(tosser.id, { kind: "WELL", at: well.at, steps });
    }

  if (goal !== undefined && facts.gates.length > 0) {
    const limit = view.board.width * view.board.height;
    const stepsByGate = new Map<string, ReadonlyMap<string, number>>();
    const stepsTo = (at: CoordV7): ReadonlyMap<string, number> => {
      let steps = stepsByGate.get(key(at));
      if (steps === undefined) {
        steps = curiosityRouteStepsV7(view, at, limit, false);
        stepsByGate.set(key(at), steps);
      }
      return steps;
    };
    for (const unit of own) {
      if (
        unit.form !== "LAND" ||
        errands.has(unit.id) ||
        soleCityDefenderV7(view, unit)
      )
        continue;
      const route = goal(unit);
      if (route === null) continue;
      const move = Math.max(1, tools.move(unit));
      const turns = (steps: number): number => Math.ceil(steps / move);
      const direct = route.steps(unit.at);
      let best:
        { readonly gate: GateFactsV7; readonly turns: number } | undefined;
      for (const gate of facts.gates) {
        const toGate = stepsTo(gate.at).get(key(unit.at));
        const onward = route.steps(gate.exit);
        if (toGate === undefined || toGate === 0 || onward === undefined)
          continue;
        const through = turns(toGate) + turns(onward);
        if (
          (direct !== undefined &&
            turns(direct) - through < GATE_ROUTE_TURNS_SAVED_V7) ||
          facts.monsters.some((monster) =>
            monster.avoidKeys.has(key(gate.exit)),
          ) ||
          tools.danger(unit, gate.exit) >= unit.hp
        )
          continue;
        if (best === undefined || through < best.turns)
          best = { gate, turns: through };
      }
      if (best === undefined) continue;
      const preview = previewGateV7(view, unit.id, best.gate.at);
      if (preview === null) continue;
      const occupant =
        preview.displaces === null
          ? undefined
          : view.units.find((other) => other.id === preview.displaces);
      errands.set(unit.id, {
        kind: "GATE",
        at: best.gate.at,
        steps: stepsTo(best.gate.at),
        gate: preview,
        held: preview.blocked || occupant?.ownerId === view.viewer.id,
      });
    }
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
  const well = errand.kind === "WELL";
  const gate = errand.kind === "GATE";
  if (same(to, errand.at))
    return gate && errand.held === true
      ? null
      : {
          priority: fountain
            ? FOUNTAIN_ARRIVE_PRIORITY_V7
            : well
              ? WELL_ARRIVE_PRIORITY_V7
              : gate
                ? GATE_TRAVERSE_PRIORITY_V7
                : CURIOSITY_CLAIM_PRIORITY_V7,
          strategic: 1,
        };
  // The Well's unit reaches it this turn: no approach.
  if (well) return null;
  const before = errand.steps.get(key(from));
  const after = errand.steps.get(key(to));
  if (before === undefined || after === undefined || after >= before)
    return null;
  return {
    priority: fountain
      ? FOUNTAIN_APPROACH_PRIORITY_V7
      : gate
        ? GATE_APPROACH_PRIORITY_V7
        : CURIOSITY_APPROACH_PRIORITY_V7,
    strategic: before - after,
  };
}

/**
 * Round 2, the gates: whether a Move of a unit whose traversal is held
 * (see `CuriosityErrandV7.held`) ends farther from its gate than it stands.
 * A routine Move that does is not made: the unit waits for the exit.
 */
export function gateErrandWaitsV7(
  errand: CuriosityErrandV7,
  from: CoordV7,
  to: CoordV7,
): boolean {
  if (errand.kind !== "GATE" || errand.held !== true) return false;
  const before = errand.steps.get(key(from));
  const after = errand.steps.get(key(to));
  return before !== undefined && (after === undefined || after > before);
}
