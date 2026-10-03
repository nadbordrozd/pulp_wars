import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_THRALL_LIMIT_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { tractorBeamDestinationV7 } from "../engine/v7/martian";
import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The Martian Normal AI (`pulp_wars-t6s.3`,
 * docs/product/RULESET_7_MARTIANS.md section 12).
 *
 * Every function reads only the viewer's public view, the offered public
 * commands, and public previews (through the policy). Nothing here draws
 * from the PRNG, reads authoritative state, or depends on elapsed time. The
 * policy calls these helpers only in a match with a Martian seat
 * (`martianMatchForPolicyV7`), or through facts only a Martian unit has (a
 * Shield, a heat ray, Pierce, the Force Field, flying or striding, Beam
 * Down, Mind Control, a Thrall, the Tractor Beam), so decisions in every
 * other match stay byte-identical.
 *
 * Values are in the policy's usual units: a unit is worth its cost x 4 plus
 * its HP; priorities are the policy's tiers (a kill 1180, a chip 900,
 * routine Moves 600 to 850).
 */

// --- Options --------------------------------------------------------------

/**
 * `pulp_wars-b5f.2`: the Martian ranged play. With the Grunt's ray pistol
 * (range 1–2) and the Tripod's range-2-only ray, a shooter next to a
 * hostile unit that cannot shoot back at range 2 (or, for the Tripod, next
 * to any hostile unit) steps back to range 2 before it shoots
 * (`rangedStepBack`). Off, the policy decides as that of `pulp_wars-7g3.8`
 * did (the head-to-head baseline). A second rule, walking a shooter with no
 * target in range to a tile two tiles from one, lost its head-to-head and
 * was dropped (docs/architecture/NORMAL_AI.md, "Martian ranged play").
 *
 * Tests and headless harnesses set the switch before a seat's decision;
 * nothing else does.
 */
export interface MartianPolicyOptionsV7 {
  readonly rangedStepBack: boolean;
}

export const DEFAULT_MARTIAN_POLICY_OPTIONS_V7: MartianPolicyOptionsV7 =
  Object.freeze({ rangedStepBack: true });
export const LEGACY_MARTIAN_POLICY_OPTIONS_V7: MartianPolicyOptionsV7 =
  Object.freeze({ rangedStepBack: false });

let martianPolicyOptions: MartianPolicyOptionsV7 =
  DEFAULT_MARTIAN_POLICY_OPTIONS_V7;

/** The options the next decisions use. */
export function martianPolicyOptionsV7(): MartianPolicyOptionsV7 {
  return martianPolicyOptions;
}

/**
 * Tests and headless harnesses only: changes the options and returns the
 * previous ones (restore them when done).
 */
export function setMartianPolicyOptionsV7(
  options: Partial<MartianPolicyOptionsV7>,
): MartianPolicyOptionsV7 {
  const previous = martianPolicyOptions;
  martianPolicyOptions = Object.freeze({ ...martianPolicyOptions, ...options });
  return previous;
}

// --- Priorities -----------------------------------------------------------

/** Mind Control: above every ordinary kill (a conversion beats a kill). */
export const MIND_CONTROL_PRIORITY_V7 = 1186;
/** A hit that leaves its target convertible by a ready own Brain. */
export const MIND_CONTROL_SETUP_PRIORITY_V7 = 1182;
/** A ray unit steps to range 2 of a hostile center defender (it fires at
 *  full power next turn): above routine Moves. */
export const RAY_SIEGE_PRIORITY_V7 = 760;
/** A Brain Move that brings a convertible target within range. */
export const MIND_CONTROL_APPROACH_PRIORITY_V7 = 1183;
/** Psychic Command waits while the same Brain can Mind Control. */
export const PSYCHIC_COMMAND_DEFERRED_PRIORITY_V7 = 1100;
/** A Tractor Beam that empties a hostile center for an own capturer. */
export const TRACTOR_CAPTURE_PRIORITY_V7 = 1347;
/** A Tractor Beam that lifts the siege of an own city. */
export const TRACTOR_SIEGE_PRIORITY_V7 = 1279;
/** A Tractor Beam that pulls a hostile unit where own attacks kill it. */
export const TRACTOR_KILL_SETUP_PRIORITY_V7 = 1181;
/** A Tractor Beam that pulls a fortified unit off its fortification, or an
 *  own unit out of lethal reach. */
export const TRACTOR_UTILITY_PRIORITY_V7 = 1150;
/** Beam Down of a passenger toward its objective: above routine Moves. */
export const BEAM_DOWN_PRIORITY_V7 = 865;
/** A Cooling ray unit steps out of melee reach before its half shot. */
export const RAY_KITE_PRIORITY_V7 = 905;
/**
 * `pulp_wars-b5f.2`: a shooter next to a hostile it would rather not shoot
 * from there (a melee unit retaliates; the Tripod cannot fire at an
 * adjacent unit) steps back to range 2: above the chips (900), so it steps
 * before it shoots, below the kills.
 */
export const RANGED_STEP_BACK_PRIORITY_V7 = 904;
/** A full-power kill that a half-power shot would also make waits. */
export const RAY_WASTED_KILL_PRIORITY_V7 = 1176;
/** A Thrall's chip goes before other chips (900): it is the front row. */
export const THRALL_CHIP_PRIORITY_V7 = 901;
/** A wounded unit without a Shield leaves visible reach to recover. */
export const SHIELDLESS_RETREAT_PRIORITY_V7 = 935;
/** Against Martians: hits that this turn's attacks turn into a kill. */
export const SHIELD_BREAK_RANGED_PRIORITY_V7 = 1179;
export const SHIELD_BREAK_PRIORITY_V7 = 1178;
/** Against Martians: a second unit next to a center a Mothership can empty
 *  (the lane-blocking tier). */
export const MOTHERSHIP_GUARD_PRIORITY_V7 = 1245;
/** Against Martians: a hostile Mothership this close threatens a pull. */
export const MOTHERSHIP_PULL_RADIUS_V7 = 4;
/** Against Martians (Goblins): per Shield point a Kaboom strips from a unit
 *  that own attacks can still hit this turn. */
export const STRIPPED_SHIELD_VALUE_V7 = 4;
/** Against Martians: a wounded unit leaves the reach of a ready Brain. */
export const MIND_CONTROL_ESCAPE_PRIORITY_V7 = 1150;
/** Routine Moves are below this priority. */
export const MARTIAN_ROUTINE_MOVE_PRIORITY_V7 = 1100;
/**
 * Research toward the Martian roles: above land production (1080), below
 * the best economic plan (1160). At the Dinosaur signature priority (1170)
 * it won fewer head-to-head games (31 of 60 against 34 of 60 on 14 x 14).
 */
export const MARTIAN_RESEARCH_PRIORITY_V7 = 1150;
export const FORCE_FIELDS_RESEARCH_PRIORITY_V7 = 1145;
export const DISINTEGRATOR_RESEARCH_PRIORITY_V7 = 1061;
/** Role research before the army is there: just above the role plan. */
export const EARLY_RESEARCH_PRIORITY_V7 = 1062;
/** Front units before the tier-2 roles (and Force Fields) go first. */
export const MIDDLE_RESEARCH_FRONT_V7 = 3;
/** Front units before the tier-3 machines go first. */
export const LATE_RESEARCH_FRONT_V7 = 5;

// --- Values ---------------------------------------------------------------

/** Production: each Shield point is worth two HP. */
export const SHIELD_PRODUCTION_VALUE_V7 = 2;
/**
 * Production: bodies first while the city is threatened. `pulp_wars-b5f.2`:
 * 14 (was 12), cancelling the Grunt's third Coin in the role value's
 * "minus twice the cost" term, so a threatened city still trains Grunts.
 */
export const THREATENED_GRUNT_BIAS_V7 = 14;
export const THREATENED_SUPPORT_COST_V7 = 30;
/** Production: the Grunt pays less for repetition (5 instead of 8 a unit). */
export const GRUNT_REPETITION_REFUND_V7 = 3;
/** Production: the Ray Gunner is the main damage. */
export const RAY_GUNNER_BIAS_V7 = 10;
/** Production: one Shield Projector for this many front units. */
export const FRONT_UNITS_PER_PROJECTOR_V7 = 4;
export const PROJECTOR_BIAS_V7 = 4;
/** Production: one Brain for this many front units, once at war. */
export const FRONT_UNITS_PER_BRAIN_V7 = 6;
export const BRAIN_BIAS_V7 = 10;
/** Production: a Tripod for this many front units, a Mothership for six. */
export const FRONT_UNITS_PER_TRIPOD_V7 = 3;
export const FRONT_UNITS_PER_MOTHERSHIP_V7 = 6;
export const BIG_MACHINE_BIAS_V7 = 30;
/** Production: Saucers beyond the need cost this much. */
export const SURPLUS_COST_V7 = 20;
/** Beam Down needs at least this much route progress. */
export const BEAM_DOWN_MINIMUM_PROGRESS_V7 = 3;
/** Beam Down value per route step gained. */
export const BEAM_DOWN_STEP_VALUE_V7 = 4;
/** A Saucer waiting to beam stays within this distance of the wave target. */
export const SAUCER_STAGING_DISTANCE_V7 = 4;
/** Attacks: Shield spent on retaliation is exposure without Force Fields. */
export const RETALIATION_SHIELD_COST_V7 = 2;
/** A full ray whose half shot would kill wastes next turn's full shot. */
export const WASTED_FULL_RAY_COST_V7 = 6;
/** A Move that ends next to an own Projector (covered at the recharge). */
export const FORCE_FIELD_COVER_VALUE_V7 = 3;
/** A Projector Move: per own shielded unit next to it. */
export const PROJECTOR_COVER_VALUE_V7 = 4;
/** Against Martians: a hostile Saucer while its owner holds a city. */
export const SAUCER_TARGET_BONUS_V7 = 8;
/** Against Martians: per covered unit around a hostile Projector. */
export const PROJECTOR_TARGET_BONUS_V7 = 4;
/** Against Martians: per Thrall of a hostile Brain (they collapse). */
export const THRALL_TARGET_BONUS_V7 = 8;
/** Against Martians: a hostile ray unit ready to fire at full power. */
export const READY_RAY_TARGET_BONUS_V7 = 4;
/** Against Martians: a Cooling ray unit (weak now and next turn). */
export const COOLING_RAY_ATTACK_BONUS_V7 = 6;
/** Against Martians: a hit that this turn's attacks complete into a kill. */
export const SHIELD_BREAK_VALUE_V7 = 10;
/** Against Martians: a hostile Brain reaches this far before Mind Control. */
export const MIND_CONTROL_THREAT_RADIUS_V7 = MIND_CONTROL_RANGE_V7 + 1;

// --- Gate and facts -------------------------------------------------------

/** Whether the match has a Martian seat (the gate of every heuristic). */
export function martianMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "MARTIAN");
}

/** Per-decision public Martian facts. */
export interface MartianFactsV7 {
  readonly viewerMartian: boolean;
  readonly forceFields: boolean;
  readonly shieldByUnit: ReadonlyMap<UnitId, number>;
  /** Units Cooling now (their next ray is half power). */
  readonly coolingNow: ReadonlySet<UnitId>;
  /** Own units that fired a full ray this turn (Cooling next turn). */
  readonly firedThisTurn: ReadonlySet<UnitId>;
  readonly brainOfThrall: ReadonlyMap<UnitId, UnitId | null>;
  readonly thrallsOfBrain: ReadonlyMap<UnitId, readonly UnitId[]>;
  readonly cooldownBrains: ReadonlySet<UnitId>;
  /** Own land-form Shield Projectors. */
  readonly ownProjectors: readonly PublicUnitV7[];
}

export function martianFactsV7(view: PlayerViewV7): MartianFactsV7 {
  const shieldByUnit = new Map<UnitId, number>();
  for (const entry of view.shields)
    shieldByUnit.set(entry.unitId, entry.shield);
  const coolingNow = new Set<UnitId>();
  const firedThisTurn = new Set<UnitId>();
  for (const entry of view.cooling)
    (entry.firedThisTurn ? firedThisTurn : coolingNow).add(entry.unitId);
  const brainOfThrall = new Map<UnitId, UnitId | null>();
  const thrallsOfBrain = new Map<UnitId, UnitId[]>();
  for (const entry of view.thralls) {
    brainOfThrall.set(entry.unitId, entry.brainUnitId);
    if (entry.brainUnitId !== null) {
      const list = thrallsOfBrain.get(entry.brainUnitId) ?? [];
      list.push(entry.unitId);
      thrallsOfBrain.set(entry.brainUnitId, list);
    }
  }
  return {
    viewerMartian: view.viewer.faction === "MARTIAN",
    forceFields: technologyCapabilitiesV7(
      view.viewer.researchedTechs,
      view.viewer.faction,
    ).shieldsRechargeAtEndTurn,
    shieldByUnit,
    coolingNow,
    firedThisTurn,
    brainOfThrall,
    thrallsOfBrain,
    cooldownBrains: new Set(
      view.mindControlCooldowns.map((entry) => entry.unitId),
    ),
    ownProjectors: view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        unit.hp > 0 &&
        hasAbilityV7(view, unit, "FORCE_FIELD"),
    ),
  };
}

export function hasAbilityV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  ability: string,
): boolean {
  return unitRoleRuleV7(view, unit).abilities.includes(ability as never);
}

/** The Shield maximum of a unit (0 for a Thrall and every non-Martian). */
export function shieldMaximumForPolicyV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
): number {
  if (facts.brainOfThrall.has(unit.id)) return 0;
  return unitRoleMechanicsV7(view, unit).shield;
}

/** A land-form unit with a heat ray (Ray Gunner, Tripod, Colossus). */
export function isRayUnitV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unit.form === "LAND" && hasAbilityV7(view, unit, "HEAT_RAY");
}

/** A land-form flyer (Saucer, Mothership). */
export function fliesForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return unit.form === "LAND" && unitMovementModeV7(view, unit) === "FLY";
}

/**
 * The Shield `unit` has during the enemy turn if it ends this turn on
 * `at`: with Force Fields the End Turn recharge (to 4 next to an own
 * Projector), otherwise what it has now.
 */
export function enemyTurnShieldV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
  at: CoordV7,
): number {
  const current = facts.shieldByUnit.get(unit.id) ?? 0;
  if (unit.ownerId !== view.viewer.id || !facts.forceFields) return current;
  const maximum = shieldMaximumForPolicyV7(view, facts, unit);
  if (maximum === 0) return current;
  const covered = facts.ownProjectors.some(
    (projector) =>
      projector.id !== unit.id && chebyshev(projector.at, at) === 1,
  );
  return covered ? Math.max(maximum, FORCE_FIELD_SHIELD_V7) : maximum;
}

/**
 * The `attack2` a visible hostile ray unit fires at the viewer next turn:
 * full when it is not Cooling and need not move, otherwise half
 * (section 12, "read Cooling"). Null for a unit without a heat ray.
 */
export function hostileRayAttack2V7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
  mustMove: boolean,
): number | null {
  if (!isRayUnitV7(view, unit)) return null;
  const attack2 = unitRoleRuleV7(view, unit).attack2;
  return mustMove || facts.coolingNow.has(unit.id)
    ? Math.floor(attack2 / 2)
    : attack2;
}

/** A ready hostile Brain: no cooldown and fewer Thralls than the limit. */
export function readyHostileBrainsV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  isHostile: (ownerId: PlayerId) => boolean,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.form === "LAND" &&
      unit.hp > 0 &&
      isHostile(unit.ownerId) &&
      hasAbilityV7(view, unit, "MIND_CONTROL") &&
      !facts.cooldownBrains.has(unit.id) &&
      (facts.thrallsOfBrain.get(unit.id)?.length ?? 0) <
        MIND_CONTROL_THRALL_LIMIT_V7,
  );
}

/** Whether a unit on `at` with `hp` could be Mind Controlled by a Brain. */
export function mindControlExposedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
  hp: number,
  brains: readonly PublicUnitV7[],
): boolean {
  if (
    brains.length === 0 ||
    hp > MIND_CONTROL_HP_V7 ||
    unit.form !== "LAND" ||
    unit.role === "JUGGERNAUT" ||
    unitCapacitySlotsV7(view, unit) !== 1
  )
    return false;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  if (tile?.explored === true && tile.site !== null) return false;
  return brains.some(
    (brain) => chebyshev(brain.at, at) <= MIND_CONTROL_THREAT_RADIUS_V7,
  );
}

// --- Target and retained values -------------------------------------------

/**
 * Extra target value of a visible hostile Martian unit (section 12, "kill
 * the enablers"): a Projector by the units it covers, a Saucer while its
 * owner holds a city, a Brain by its Thralls (they collapse with it), and a
 * ray unit ready to fire at full power. 0 for every other unit.
 */
export function martianTargetBonusV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
): number {
  if (unit.form !== "LAND") return 0;
  const abilities = unitRoleRuleV7(view, unit).abilities;
  let bonus = 0;
  if (abilities.includes("FORCE_FIELD")) {
    const covered = view.units.filter(
      (other) =>
        other.id !== unit.id &&
        other.ownerId === unit.ownerId &&
        chebyshev(other.at, unit.at) === 1 &&
        shieldMaximumForPolicyV7(view, facts, other) > 0,
    ).length;
    bonus += PROJECTOR_TARGET_BONUS_V7 * Math.min(4, covered);
  }
  if (
    abilities.includes("BEAM_DOWN") &&
    view.cities.some((city) => city.ownerId === unit.ownerId)
  )
    bonus += SAUCER_TARGET_BONUS_V7;
  if (abilities.includes("MIND_CONTROL"))
    for (const thrallId of facts.thrallsOfBrain.get(unit.id) ?? []) {
      const thrall = view.units.find((other) => other.id === thrallId);
      bonus += THRALL_TARGET_BONUS_V7 + (thrall?.hp ?? 0);
    }
  if (abilities.includes("HEAT_RAY") && !facts.coolingNow.has(unit.id))
    bonus += READY_RAY_TARGET_BONUS_V7;
  return bonus;
}

/**
 * Retained value of an own Martian unit: a Thrall cost nothing and is the
 * front row (its HP only); a Brain carries its Thralls.
 */
export function martianRetainedValueV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
  base: number,
): number {
  if (facts.brainOfThrall.has(unit.id)) return unit.hp + unit.kills * 2;
  if (hasAbilityV7(view, unit, "MIND_CONTROL")) {
    let value = base;
    for (const thrallId of facts.thrallsOfBrain.get(unit.id) ?? []) {
      const thrall = view.units.find((other) => other.id === thrallId);
      value += thrall?.hp ?? 0;
    }
    return value;
  }
  return base;
}

// --- Production -----------------------------------------------------------

export interface MartianArmyCountsV7 {
  readonly byRole: ReadonlyMap<UnitRoleIdV7, number>;
  /** Grunts, Thralls, Ray Gunners, Tripods, and the Colossus. */
  readonly front: number;
}

export function martianArmyCountsV7(view: PlayerViewV7): MartianArmyCountsV7 {
  const byRole = new Map<UnitRoleIdV7, number>();
  let front = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id) continue;
    byRole.set(unit.role, (byRole.get(unit.role) ?? 0) + 1);
    if (
      unit.role === "FIGHTER" ||
      unit.role === "MARKSMAN" ||
      unit.role === "CATAPULT" ||
      unit.role === "JUGGERNAUT"
    )
      front += 1;
  }
  return { byRole, front };
}

/**
 * The Martian production adjustment of one role, added to the policy's role
 * value (HP, first-of-role, cost, and repetition terms) in the preferred
 * role and in the city-action utility (section 12, "value its units by what
 * they are"; "train bodies first under threat"):
 *
 * - every role gains two per Shield point (`HP + 2 x Shield`);
 * - in a threatened city the Grunt gains 14 (12 before its cost of 3) and
 *   the Projector, Saucer, and Brain cost 30 (a Projector would win the
 *   Guard's threatened bonus);
 * - the Grunt's repetition costs 5 a unit instead of 8 (bodies; in the
 *   preferred role only, which is where the repetition cost applies), and
 *   the Ray Gunner gains 10 (the main damage, about two for every three
 *   Grunts);
 * - a Projector gains 4 while there are more than four front units per
 *   Projector, otherwise (and before three front units) it costs 20;
 * - a Saucer beyond the first costs 20 unless the army has six front
 *   units, and beyond two it always does;
 * - a Brain gains 10 at war with four or more front units and fewer than
 *   one Brain per six; otherwise it costs 20;
 * - a Tripod (one per three front units) and a Mothership (one per six)
 *   gain 30 when offered, so they are bought when affordable.
 */
export function martianProductionAdjustmentV7(
  view: PlayerViewV7,
  role: UnitRoleIdV7,
  counts: MartianArmyCountsV7,
  threatened: boolean,
  atWar: boolean,
  repetition: boolean,
): number {
  if (view.viewer.faction !== "MARTIAN") return 0;
  const shield =
    role === "PATROL_BOAT" || role === "BATTLESHIP"
      ? 0
      : (factionShieldV7(view, role) ?? 0);
  const owned = counts.byRole.get(role) ?? 0;
  const front = counts.front;
  let value = SHIELD_PRODUCTION_VALUE_V7 * shield;
  switch (role) {
    case "FIGHTER":
      if (repetition) value += GRUNT_REPETITION_REFUND_V7 * owned;
      if (threatened) value += THREATENED_GRUNT_BIAS_V7;
      break;
    case "MARKSMAN":
      value += RAY_GUNNER_BIAS_V7;
      break;
    case "GUARD":
      value +=
        front >= 3 && owned * FRONT_UNITS_PER_PROJECTOR_V7 < front
          ? PROJECTOR_BIAS_V7
          : -SURPLUS_COST_V7;
      // The Guard's threatened bonus (20) does not apply to the Projector.
      if (threatened) value -= THREATENED_SUPPORT_COST_V7 + 20;
      break;
    case "RAIDER":
      if (owned >= 2 || (owned >= 1 && front < 6)) value -= SURPLUS_COST_V7;
      if (threatened) value -= THREATENED_SUPPORT_COST_V7;
      break;
    case "CAPTAIN":
      value +=
        atWar && front >= 4 && owned * FRONT_UNITS_PER_BRAIN_V7 < front
          ? BRAIN_BIAS_V7
          : -SURPLUS_COST_V7;
      if (threatened) value -= THREATENED_SUPPORT_COST_V7;
      break;
    case "CATAPULT":
      if (owned * FRONT_UNITS_PER_TRIPOD_V7 <= front)
        value += BIG_MACHINE_BIAS_V7;
      break;
    case "KNIGHT":
      if (owned * FRONT_UNITS_PER_MOTHERSHIP_V7 <= front)
        value += BIG_MACHINE_BIAS_V7;
      break;
    default:
      break;
  }
  return value;
}

function factionShieldV7(view: PlayerViewV7, role: UnitRoleIdV7): number {
  return unitRoleMechanicsV7(view, {
    ownerId: view.viewer.id,
    role,
  }).shield;
}

// --- Research -------------------------------------------------------------

/**
 * Martian research (section 12, "research toward its roles"): Drill and
 * Scouting from the start; once the seat owns two cities Marksmanship and
 * Administration, then Force Fields once it owns a Projector, then the
 * Tripod's and the Mothership's technologies (the shorter chain first); the
 * Disintegrator while a visible hostile unit stands fortified and the seat
 * owns a ray unit. Returns the next technology to research and its tier, or
 * null.
 */
export function martianResearchV7(
  view: PlayerViewV7,
  ownedCities: number,
  front: number,
  fortifiedHostileVisible: boolean,
): {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
} | null {
  if (view.viewer.faction !== "MARTIAN") return null;
  const owned = new Set(view.viewer.researchedTechs);
  const chainTo = (target: TechnologyIdV7): readonly TechnologyIdV7[] => {
    const result: TechnologyIdV7[] = [];
    const tree = factionTreeV7(view.viewer.faction);
    const visit = (tech: TechnologyIdV7): void => {
      if (owned.has(tech) || result.includes(tech)) return;
      const node = tree.nodes.find((item) => item.id === tech);
      for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
      result.push(tech);
    };
    visit(target);
    return result;
  };
  const roleTech = (role: UnitRoleIdV7): TechnologyIdV7 | null =>
    effectiveRoleRuleV7(role, view.viewer.faction).technology;
  const pick = (
    roles: readonly UnitRoleIdV7[],
    priority: number,
  ): {
    readonly tech: TechnologyIdV7;
    readonly priority: number;
    readonly strategic: number;
  } | null => {
    let best: { chain: readonly TechnologyIdV7[]; role: UnitRoleIdV7 } | null =
      null;
    for (const role of roles) {
      const tech = roleTech(role);
      if (tech === null) continue;
      const chain = chainTo(tech);
      if (
        chain.length > 0 &&
        (best === null || chain.length < best.chain.length)
      )
        best = { chain, role };
    }
    const first = best?.chain[0];
    if (best === null || first === undefined) return null;
    const rule = effectiveRoleRuleV7(best.role, view.viewer.faction);
    return {
      tech: first,
      priority,
      strategic: rule.maxHp + rule.attack2 + rule.defense2,
    };
  };
  // Bodies first: the role technologies wait for an army (they starved
  // the opening of Grunts when researched ahead of training).
  const early = pick(["GUARD", "RAIDER"], EARLY_RESEARCH_PRIORITY_V7);
  if (early !== null) return early;
  if (ownedCities < 2) return null;
  const middle = pick(
    ["MARKSMAN", "CAPTAIN"],
    front >= MIDDLE_RESEARCH_FRONT_V7
      ? MARTIAN_RESEARCH_PRIORITY_V7
      : EARLY_RESEARCH_PRIORITY_V7,
  );
  if (middle !== null) return middle;
  const ownsProjector = view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      hasAbilityV7(view, unit, "FORCE_FIELD"),
  );
  if (ownsProjector) {
    const chain = chainTo(technologyWithCapabilityV7(view, "FORCE_FIELDS"));
    const first = chain[0];
    if (first !== undefined)
      return {
        tech: first,
        priority:
          front >= MIDDLE_RESEARCH_FRONT_V7
            ? FORCE_FIELDS_RESEARCH_PRIORITY_V7
            : EARLY_RESEARCH_PRIORITY_V7,
        strategic: 12,
      };
  }
  const late = pick(
    ["CATAPULT", "KNIGHT"],
    front >= LATE_RESEARCH_FRONT_V7
      ? MARTIAN_RESEARCH_PRIORITY_V7
      : EARLY_RESEARCH_PRIORITY_V7,
  );
  if (late !== null) return late;
  if (
    fortifiedHostileVisible &&
    view.units.some(
      (unit) => unit.ownerId === view.viewer.id && isRayUnitV7(view, unit),
    )
  ) {
    const chain = chainTo(technologyWithCapabilityV7(view, "DISINTEGRATOR"));
    const first = chain[0];
    if (first !== undefined)
      return {
        tech: first,
        priority: DISINTEGRATOR_RESEARCH_PRIORITY_V7,
        strategic: 8,
      };
  }
  return null;
}

function technologyWithCapabilityV7(
  view: PlayerViewV7,
  kind: "FORCE_FIELDS" | "DISINTEGRATOR",
): TechnologyIdV7 {
  for (const node of factionTreeV7(view.viewer.faction).nodes)
    if (node.unlocks.some((unlock) => unlock.kind === kind)) return node.id;
  return kind === "FORCE_FIELDS" ? "FORTIFICATION" : "EXPLOSIVES";
}

// --- Commands -------------------------------------------------------------

export interface MartianScoreV7 {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
}

const NOT_A_CANDIDATE_V7: MartianScoreV7 = Object.freeze({
  priority: -1,
  strategic: 0,
  immediate: 0,
});

/** What the policy provides to the Martian scoring helpers. */
export interface MartianPolicyToolsV7 {
  readonly view: PlayerViewV7;
  readonly facts: MartianFactsV7;
  readonly commands: readonly CommandV7[];
  isHostile(ownerId: PlayerId): boolean;
  unit(unitId: UnitId): PublicUnitV7 | undefined;
  /** Shield-aware visible hostile damage to `unit` on `at` next turn. */
  danger(unit: PublicUnitV7, at: CoordV7): number;
  targetValue(unit: PublicUnitV7): number;
  retainedValue(unit: PublicUnitV7): number;
  /** Campaign route steps gained by `unit` moving to `to` (null: no job). */
  routeProgress(unit: PublicUnitV7, to: CoordV7): number | null;
  /** The city the seat's main wave marches on, or null. */
  readonly waveTarget: CoordV7 | null;
  readonly threatenedCityIds: ReadonlySet<CityId>;
  /**
   * Projected `ATTACK` previews of own units on `target` standing on `at`
   * (without `excludeUnitId` when given).
   */
  projectedKillers(
    target: PublicUnitV7,
    at: CoordV7,
    excludeUnitId?: UnitId,
  ): number;
}

/** The whole hit of an attack (Shield and HP damage). */
export function wholeHitV7(preview: CombatPreviewV7): number {
  return preview.damageToDefender + preview.defenderShieldDamage;
}

/**
 * `BEAM_DOWN` (section 12, "use the Saucer"): a passenger at home goes to
 * the front. Scored by the campaign route steps it gains (at least three),
 * plus a bonus for a passenger that cannot walk this turn (a unit trained
 * this turn); never onto a tile inside visible lethal reach, never the
 * garrison of a city with a hostile unit nearby, and never a unit that can
 * still attack this turn.
 */
export function beamDownScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "BEAM_DOWN" }>,
  passengerCanAct: boolean,
  passengerCanMove: boolean,
): MartianScoreV7 {
  const { view } = tools;
  const passenger = tools.unit(command.passengerUnitId);
  if (passenger === undefined || passengerCanAct) return NOT_A_CANDIDATE_V7;
  if (beamDownPassengerIsGarrisonV7(tools, passenger))
    return NOT_A_CANDIDATE_V7;
  const abilities = unitRoleRuleV7(view, passenger).abilities;
  if (!abilities.includes("ATTACK") || abilities.includes("MIND_CONTROL"))
    return NOT_A_CANDIDATE_V7;
  const progress =
    tools.routeProgress(passenger, command.to) ??
    (tools.waveTarget === null
      ? null
      : chebyshev(passenger.at, tools.waveTarget) -
        chebyshev(command.to, tools.waveTarget));
  if (progress === null || progress < BEAM_DOWN_MINIMUM_PROGRESS_V7)
    return NOT_A_CANDIDATE_V7;
  const danger = tools.danger(passenger, command.to);
  if (danger >= passenger.hp) return NOT_A_CANDIDATE_V7;
  return {
    priority: BEAM_DOWN_PRIORITY_V7,
    strategic:
      BEAM_DOWN_STEP_VALUE_V7 * Math.min(progress, 8) +
      (passengerCanMove ? 0 : 8) -
      2 * danger,
    immediate: -danger,
  };
}

function beamDownPassengerIsGarrisonV7(
  tools: MartianPolicyToolsV7,
  passenger: PublicUnitV7,
): boolean {
  const { view } = tools;
  const center = view.cities.find(
    (city) => city.ownerId === view.viewer.id && same(city.at, passenger.at),
  );
  if (center === undefined) return false;
  if (tools.threatenedCityIds.has(center.id)) return true;
  return view.units.some(
    (unit) =>
      unit.form === "LAND" &&
      tools.isHostile(unit.ownerId) &&
      chebyshev(unit.at, center.at) <= 3,
  );
}

/**
 * `MIND_CONTROL` (section 12, "use the Brain"): whenever offered, on the
 * target with the highest value (unit cost, then HP).
 */
export function mindControlScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "MIND_CONTROL" }>,
): MartianScoreV7 {
  const target = tools.unit(command.targetUnitId);
  if (target === undefined) return NOT_A_CANDIDATE_V7;
  const cost = unitRoleRuleV7(tools.view, target).cost ?? 0;
  return {
    priority: MIND_CONTROL_PRIORITY_V7,
    strategic: cost * 10 + target.hp + tools.targetValue(target),
    immediate: target.hp,
  };
}

/**
 * `TRACTOR_BEAM` (section 12, "use the Mothership"), by its previewed gain:
 * a defender pulled off a hostile center next to an own capturer that can
 * still step in (1347); a besieger pulled off an own center (1279); a
 * hostile unit pulled where this turn's own attacks kill it (1181); a
 * fortified unit pulled off its fortification into the reach of two own
 * attackers, or an own unit pulled out of lethal reach (1150);
 * `pulp_wars-9s0.8` adds, also at 1150, a hostile unit pulled where the
 * other own attacks take at least half of its HP and Shield, and a hostile land unit
 * pulled away from an own city center it stands next to. Any other pull is
 * not a candidate: it never helps the enemy.
 */
export function tractorBeamScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "TRACTOR_BEAM" }>,
  capturerCanEnter: (center: CoordV7) => boolean,
): MartianScoreV7 {
  const { view } = tools;
  const mothership = tools.unit(command.unitId);
  const target = tools.unit(command.targetUnitId);
  if (mothership === undefined || target === undefined)
    return NOT_A_CANDIDATE_V7;
  const to = tractorBeamDestinationV7(mothership.at, target.at);
  const city = view.cities.find((candidate) => same(candidate.at, target.at));
  if (target.ownerId === view.viewer.id) {
    const before = tools.danger(target, target.at);
    const after = tools.danger(target, to);
    if (before >= target.hp && after < target.hp && city === undefined)
      return {
        priority: TRACTOR_UTILITY_PRIORITY_V7,
        strategic: tools.retainedValue(target) - after,
        immediate: 0,
      };
    return NOT_A_CANDIDATE_V7;
  }
  if (!tools.isHostile(target.ownerId)) return NOT_A_CANDIDATE_V7;
  const value = tools.targetValue(target);
  if (city !== undefined && tools.isHostile(city.ownerId)) {
    if (capturerCanEnter(city.at))
      return {
        priority: TRACTOR_CAPTURE_PRIORITY_V7,
        strategic: 40 + Math.floor(value / 2),
        immediate: 0,
      };
  }
  if (city !== undefined && city.ownerId === view.viewer.id)
    return {
      priority: TRACTOR_SIEGE_PRIORITY_V7,
      strategic: 30 + Math.floor(value / 2),
      immediate: 0,
    };
  const killers = tools.projectedKillers(target, to);
  const shield = tools.facts.shieldByUnit.get(target.id) ?? 0;
  if (killers >= target.hp + shield)
    return {
      priority: TRACTOR_KILL_SETUP_PRIORITY_V7,
      strategic: value,
      immediate: 0,
    };
  const fromTile =
    view.board.tiles[target.at.y * view.board.width + target.at.x];
  const fortified =
    fromTile?.explored === true &&
    fromTile.territoryOwnerId === target.ownerId &&
    (fromTile.fortificationLevel ?? 0) > 0;
  if (fortified && killers > 0 && killers * 2 >= target.hp)
    return {
      priority: TRACTOR_UTILITY_PRIORITY_V7,
      strategic: Math.floor(value / 2),
      immediate: 0,
    };
  // pulp_wars-9s0.8: two more pulls. A hostile unit pulled where the
  // army's other attacks take at least half of its HP and Shield (the army
  // finishes what it starts) ...
  const army = tools.projectedKillers(target, to, mothership.id);
  if (army > 0 && army * 2 >= target.hp + shield)
    return {
      priority: TRACTOR_UTILITY_PRIORITY_V7,
      strategic: Math.floor(value / 2),
      immediate: 0,
    };
  // ... and a hostile land unit next to an own city center pulled away
  // from it (the besieger rule covers only the center itself).
  const besieged = view.cities.find(
    (candidate) =>
      candidate.ownerId === view.viewer.id &&
      chebyshev(candidate.at, target.at) === 1 &&
      chebyshev(candidate.at, to) > 1,
  );
  if (target.form === "LAND" && besieged !== undefined)
    return {
      priority: TRACTOR_UTILITY_PRIORITY_V7,
      strategic: 20 + Math.floor(value / 4),
      immediate: 0,
    };
  return NOT_A_CANDIDATE_V7;
}

export function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
