import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_LIMIT_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  isMindControlledV7,
  playerFactionV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitFactionV7,
  unitMayActAfterMoveV7,
  unitMovementModeV7,
  seatRoleMechanicsV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type UnitKindRefV7,
  type UnitKindV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { isNeutralOwnerV7 } from "../engine/v7/types";
import {
  mindControlTargetBlockV7,
  tractorBeamDestinationV7,
  tractorBeamRuleV7,
  tractorBeamTargetBlockV7,
} from "../engine/v7/martian";
import { queryTractorBeamPathV7 } from "../engine/v7/query";
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
 * Down, Mind Control, a controlled unit, the Tractor Beam), so decisions in every
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
  /**
   * `pulp_wars-b5f.3` (the AI pass of docs/product/RULESET_7_MIND_CONTROL.md
   * section 8): Mind Control by what the target becomes, the focus-fire
   * setup, controlled units played by their kind's policies with their
   * kind cost, and against Martians the value-aware Brain bonus and the
   * wounded denial test. Off, the policy decides as the engine step of
   * `pulp_wars-b5f.3` did (`c24e06d`, the head-to-head baseline): it reads a
   * unit's owner's faction for its per-unit policies, so a match without a
   * controlled unit decides the same either way.
   */
  readonly mindControlPlay: boolean;
  /**
   * `pulp_wars-1wy.4` (the AI step of
   * docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 9): the mobility
   * play. As Martians: carriers by ratio (one Saucer per three front units),
   * Beam Down that delivers a passenger where it shoots on arrival and that
   * extracts a spent unit from lethal reach, the Saucer's pull scored
   * without its own attack and the Mothership's free pull with it and
   * before its attacks, carriers that fly to a unit to extract and to the
   * tile a siege pull is made from, and shooters that keep their distance.
   * Against Martians: the guard against a pull for Saucers too and the
   * Mothership as a target. Off, the policy decides as the engine step of
   * `pulp_wars-1wy.3` did (`d2b9412f`, the head-to-head baseline).
   */
  readonly mobilityPlay: boolean;
}

export const DEFAULT_MARTIAN_POLICY_OPTIONS_V7: MartianPolicyOptionsV7 =
  Object.freeze({
    rangedStepBack: true,
    mindControlPlay: true,
    mobilityPlay: true,
  });
export const LEGACY_MARTIAN_POLICY_OPTIONS_V7: MartianPolicyOptionsV7 =
  Object.freeze({
    rangedStepBack: false,
    mindControlPlay: false,
    mobilityPlay: false,
  });

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

/**
 * The Mind Control revision (section 8, "playing controlled units"): the
 * faction whose per-unit policies play `unit`, its kind (`unitFactionV7`):
 * a controlled Goblin Kabooms by the Goblin rules, a controlled Witch
 * Cold Snaps by the Ice Folk rules. Seat plans (research, production,
 * economy) keep the viewer's faction. With `mindControlPlay` off, the
 * unit's owner's faction (the baseline). Both are the owner's faction for
 * every unit that is not mind-controlled, so a match without a controlled
 * unit decides the same.
 */
export function policyUnitFactionV7(
  view: PlayerViewV7,
  unit: UnitKindRefV7,
): UnitKindV7 {
  // Map curiosities (section 8.1): a neutral unit's kind is the neutral
  // registration in both modes (it has no seat).
  return martianPolicyOptions.mindControlPlay || isNeutralOwnerV7(unit.ownerId)
    ? unitFactionV7(view, unit)
    : playerFactionV7(view, unit.ownerId);
}

/** Whether the new Mind Control play is on (`mindControlPlay`). */
export function mindControlPlayV7(): boolean {
  return martianPolicyOptions.mindControlPlay;
}

/** Whether the mobility play is on (`mobilityPlay`). */
export function mobilityPlayV7(): boolean {
  return martianPolicyOptions.mobilityPlay;
}

// --- Priorities -----------------------------------------------------------

/** Mind Control: above every ordinary kill (a conversion beats a kill). */
export const MIND_CONTROL_PRIORITY_V7 = 1186;
/** A hit that leaves its target convertible by a ready own Brain. */
export const MIND_CONTROL_SETUP_PRIORITY_V7 = 1182;
/**
 * `pulp_wars-b5f.3` AI pass: the first of two own hits that together leave
 * a valuable target convertible by a ready own Brain (focus fire to wound,
 * then convert): above the chips (900) and the Shield-break hits (1178,
 * 1179 stay above it), below every kill.
 */
export const MIND_CONTROL_FOCUS_PRIORITY_V7 = 1177;
/** The focus-fire setup is only for targets worth at least this much. */
export const MIND_CONTROL_FOCUS_MINIMUM_VALUE_V7 = 3;
/** Strategic weight of one point of Mind Control value. */
export const MIND_CONTROL_VALUE_WEIGHT_V7 = 10;
/**
 * `pulp_wars-b5f.3`: an own attack on a unit an offered Mind Control
 * targets waits below the Mind Control (1185), unless it is worth at least
 * this (clearing or capturing a city).
 */
export const MIND_CONTROL_FIRST_CEILING_V7 = 1300;
/** A Mind Control value point lost per ability the target loses under control. */
export const MIND_CONTROL_LOST_ABILITY_VALUE_V7 = 1;
/** A ray unit steps to range 2 of a hostile center defender (it fires at
 *  full power next turn): above routine Moves. */
export const RAY_SIEGE_PRIORITY_V7 = 760;
/** A Brain Move that brings a convertible target within range. */
export const MIND_CONTROL_APPROACH_PRIORITY_V7 = 1183;
/** Psychic Command waits while the same Brain can Mind Control. */
export const PSYCHIC_COMMAND_DEFERRED_PRIORITY_V7 = 1100;
/** A Tractor Beam that empties a hostile center for an own capturer. */
export const TRACTOR_CAPTURE_PRIORITY_V7 = 1347;
/**
 * `pulp_wars-1wy.4`: a puller's Move to the tile that pull is made from
 * (just below it: fly, pull, and the capturer steps on).
 */
export const TRACTOR_CAPTURE_MOVE_PRIORITY_V7 = 1346;
/** A Tractor Beam that lifts the siege of an own city. */
export const TRACTOR_SIEGE_PRIORITY_V7 = 1279;
/** A Tractor Beam that pulls a hostile unit where own attacks kill it. */
export const TRACTOR_KILL_SETUP_PRIORITY_V7 = 1181;
/** A Tractor Beam that pulls a fortified unit off its fortification, or an
 *  own unit out of lethal reach. */
export const TRACTOR_UTILITY_PRIORITY_V7 = 1150;
/**
 * `pulp_wars-1wy.4`: the Mothership's free pull, in the utility cases:
 * before its own Move toward a target (1175) and every attack (the pull
 * costs it nothing, and it shoots what it pulled), below Mind Control.
 */
export const TRACTOR_FREE_PRIORITY_V7 = 1184;
/** Beam Down of a passenger toward its objective: above routine Moves. */
export const BEAM_DOWN_PRIORITY_V7 = 865;
/**
 * `pulp_wars-1wy.4`: Beam Down of a passenger onto a tile from which its
 * shot on arrival kills (with the kills, below the pull that sets one up).
 */
export const BEAM_DOWN_KILL_PRIORITY_V7 = 1180;
/** ... from which it shoots on arrival: above the chips (900), so the
 *  passenger arrives before it fires, and above the step back (904). */
export const BEAM_DOWN_ATTACK_PRIORITY_V7 = 906;
/**
 * `pulp_wars-1wy.4`: extraction, a carrier lifts a unit that has acted out
 * of visible lethal reach: below the chips (every shot is fired first),
 * above the delivery by route (865) and every routine Move.
 */
export const BEAM_DOWN_EXTRACT_PRIORITY_V7 = 890;
/** A carrier flies to where it can extract such a unit: just above it. */
export const CARRIER_RESCUE_MOVE_PRIORITY_V7 = 891;
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
/** A controlled unit's chip goes before other chips (900): the front row. */
export const CONTROLLED_CHIP_PRIORITY_V7 = 901;
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
 * `pulp_wars-1wy.6`: 15, cancelling the HP point the Grunt lost at 8 HP
 * (the role value counts HP; at 14 it tied with the Ray Gunner and lost).
 */
export const THREATENED_GRUNT_BIAS_V7 = 15;
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
/**
 * `pulp_wars-1wy.4` production: one Saucer for this many front units (it
 * gains `SAUCER_BIAS_V7` below the need; beyond it the surplus cost).
 */
export const FRONT_UNITS_PER_SAUCER_V7 = 3;
export const SAUCER_BIAS_V7 = 10;
/** Beam Down for a shot: per point of the shot's whole hit. */
export const BEAM_DOWN_HIT_VALUE_V7 = 2;
/** ... and for a shot from two tiles or more (no retaliation). */
export const BEAM_DOWN_STANDOFF_VALUE_V7 = 6;
/** A shooter's routine Move next to a hostile melee unit costs this. */
export const SHOOTER_CONTACT_COST_V7 = 8;
/** Against Martians: a hostile Mothership (a carrier with a free pull). */
export const MOTHERSHIP_TARGET_BONUS_V7 = 8;
/** Against Martians: a Saucer's pull reaches this far (Move 3, reach 2). */
export const SAUCER_PULL_RADIUS_V7 = 5;
/** ... and since `pulp_wars-1wy.3` a Mothership's (Move 2, reach 3). */
export const HEAVY_PULL_RADIUS_V7 = 5;
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
/** Against Martians: per controlled unit of a hostile Brain (released). */
export const CONTROLLED_TARGET_BONUS_V7 = 8;
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
  /** The Mind Control revision: each visible controlled unit's Brain. */
  readonly brainOfControlled: ReadonlyMap<UnitId, UnitId | null>;
  readonly controlledOfBrain: ReadonlyMap<UnitId, readonly UnitId[]>;
  /** Each visible controlled unit's original owner (it returns there). */
  readonly originalOwnerOfControlled: ReadonlyMap<UnitId, PlayerId>;
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
  const brainOfControlled = new Map<UnitId, UnitId | null>();
  const controlledOfBrain = new Map<UnitId, UnitId[]>();
  const originalOwnerOfControlled = new Map<UnitId, PlayerId>();
  for (const entry of view.mindControlled) {
    brainOfControlled.set(entry.unitId, entry.brainUnitId);
    originalOwnerOfControlled.set(entry.unitId, entry.originalOwnerId);
    if (entry.brainUnitId !== null) {
      const list = controlledOfBrain.get(entry.brainUnitId) ?? [];
      list.push(entry.unitId);
      controlledOfBrain.set(entry.brainUnitId, list);
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
    brainOfControlled,
    controlledOfBrain,
    originalOwnerOfControlled,
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

/**
 * The Shield maximum of a unit under its kind (0 for every non-Martian
 * kind; the Mind Control revision: a controlled Martian unit keeps its
 * Shield).
 */
export function shieldMaximumForPolicyV7(
  view: PlayerViewV7,
  _facts: MartianFactsV7,
  unit: PublicUnitV7,
): number {
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

/** A ready hostile Brain: no cooldown and below the control limit. */
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
      (facts.controlledOfBrain.get(unit.id)?.length ?? 0) <
        MIND_CONTROL_LIMIT_V7,
  );
}

/**
 * Whether a unit on `at` with `hp` could be Mind Controlled by a Brain
 * within `MIND_CONTROL_THREAT_RADIUS_V7`. With `mindControlPlay` the
 * engine's own per-target test (`mindControlTargetBlockV7`) decides
 * immunity and health: a construct, a unit on a Rift, an already
 * controlled unit, and an unwounded unit (`hp` equal to its maximum) are
 * not exposed.
 */
export function mindControlExposedV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
  hp: number,
  brains: readonly PublicUnitV7[],
): boolean {
  if (brains.length === 0) return false;
  if (martianPolicyOptions.mindControlPlay) {
    if (hp <= 0) return false;
    const tile = view.board.tiles[at.y * view.board.width + at.x];
    if (tile?.explored !== true) return false;
    // The Brain on the target's own tile: only immunity and health count.
    if (mindControlTargetBlockV7(view, { at }, { ...unit, at, hp }, tile))
      return false;
    return brains.some(
      (brain) => chebyshev(brain.at, at) <= MIND_CONTROL_THREAT_RADIUS_V7,
    );
  }
  if (
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
 * owner holds a city, a Brain by its controlled units (released with it:
 * each one's value, doubled when it was the viewer's own, Mind Control
 * revision section 8), and a ray unit ready to fire at full power. 0 for
 * every other unit.
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
    isSaucerForPolicyV7(view, unit) &&
    view.cities.some((city) => city.ownerId === unit.ownerId)
  )
    bonus += SAUCER_TARGET_BONUS_V7;
  // `pulp_wars-1wy.4`: the Mothership, the carrier with the free pull.
  if (martianPolicyOptions.mobilityPlay && isMothershipForPolicyV7(view, unit))
    bonus += MOTHERSHIP_TARGET_BONUS_V7;
  if (abilities.includes("MIND_CONTROL"))
    for (const controlledId of facts.controlledOfBrain.get(unit.id) ?? []) {
      const controlled = view.units.find((other) => other.id === controlledId);
      if (!martianPolicyOptions.mindControlPlay || controlled === undefined) {
        bonus += CONTROLLED_TARGET_BONUS_V7 + (controlled?.hp ?? 0);
        continue;
      }
      // `pulp_wars-b5f.3`: the controlled unit's value, doubled when it was
      // the viewer's own (killing the Brain gives it back).
      const value = controlledUnitValueV7(view, controlled);
      bonus +=
        facts.originalOwnerOfControlled.get(controlledId) === view.viewer.id
          ? 2 * value
          : value;
    }
  if (abilities.includes("HEAT_RAY") && !facts.coolingNow.has(unit.id))
    bonus += READY_RAY_TARGET_BONUS_V7;
  return bonus;
}

/**
 * Retained value of an own Martian unit: a controlled unit is worth its
 * kind cost scaled by its HP (`pulp_wars-b5f.3`; the baseline: its HP
 * only, as the Thrall was); a Brain carries its controlled units.
 */
export function martianRetainedValueV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  unit: PublicUnitV7,
  base: number,
): number {
  const play = martianPolicyOptions.mindControlPlay;
  if (facts.brainOfControlled.has(unit.id))
    return play
      ? controlledRetainedValueV7(view, unit)
      : unit.hp + unit.kills * 2;
  if (hasAbilityV7(view, unit, "MIND_CONTROL")) {
    let value = base;
    for (const controlledId of facts.controlledOfBrain.get(unit.id) ?? []) {
      const controlled = view.units.find((other) => other.id === controlledId);
      value +=
        controlled === undefined
          ? 0
          : play
            ? controlledRetainedValueV7(view, controlled)
            : controlled.hp;
    }
    return value;
  }
  return base;
}

/**
 * The retained value of a controlled unit (section 8): its kind cost (2
 * without one) x 4 scaled by HP, plus its HP and twice its kills.
 */
export function controlledRetainedValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  const cost = unitRoleRuleV7(view, unit).cost ?? 2;
  return (
    Math.floor((cost * 4 * unit.hp) / Math.max(1, unit.maxHp)) +
    unit.hp +
    unit.kills * 2
  );
}

/**
 * Against Martians: the value of a hostile Brain's controlled unit in the
 * policy's units (its kind cost x 4 plus its HP and twice its kills).
 */
export function controlledUnitValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return (unitRoleRuleV7(view, unit).cost ?? 2) * 4 + unit.hp + unit.kills * 2;
}

/**
 * The Mind Control value of a target (section 8): what it becomes, the
 * kind cost of its role (2 if it has none) plus its kills, less 1 for each
 * ability it would lose under control (Raise Dead, Infect, Bite, Hatch,
 * Assemble, Mind Control, tunnel riding), at least 1.
 */
export function mindControlValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  const rule = unitRoleRuleV7(view, unit);
  const lost = isMindControlledV7(view, unit.id)
    ? 0
    : rule.abilities.filter((ability) =>
        MIND_CONTROLLED_LOST_ABILITIES_V7.includes(ability),
      ).length;
  return Math.max(
    1,
    (rule.cost ?? 2) + unit.kills - MIND_CONTROL_LOST_ABILITY_VALUE_V7 * lost,
  );
}

// --- Production -----------------------------------------------------------

export interface MartianArmyCountsV7 {
  readonly byRole: ReadonlyMap<UnitRoleIdV7, number>;
  /** Grunts, Ray Gunners, Tripods, and the Colossus. */
  readonly front: number;
}

export function martianArmyCountsV7(view: PlayerViewV7): MartianArmyCountsV7 {
  const byRole = new Map<UnitRoleIdV7, number>();
  let front = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id) continue;
    // `pulp_wars-b5f.3`: a controlled unit is the front row, never one of
    // the seat's own roles (a controlled Captain is not a Brain).
    if (
      martianPolicyOptions.mindControlPlay &&
      isMindControlledV7(view, unit.id)
    ) {
      front += 1;
      continue;
    }
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
 * - in a threatened city the Grunt gains 15 (12 before its cost of 3, 14
 *   before its 8 HP) and
 *   the Projector, Saucer, and Brain cost 30 (a Projector would win the
 *   Guard's threatened bonus);
 * - the Grunt's repetition costs 5 a unit instead of 8 (bodies; in the
 *   preferred role only, which is where the repetition cost applies), and
 *   the Ray Gunner gains 10 (the main damage, about two for every three
 *   Grunts);
 * - a Projector gains 4 while there are more than four front units per
 *   Projector, otherwise (and before three front units) it costs 20;
 * - a Saucer gains 10 while the army has more than three front units per
 *   Saucer and otherwise costs 20 (`pulp_wars-1wy.4`; the baseline: a
 *   Saucer beyond the first costs 20 unless the army has six front units,
 *   and beyond two it always does);
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
      if (martianPolicyOptions.mobilityPlay)
        // `pulp_wars-1wy.4`: one Saucer per three front units (no bias in
        // a threatened city: bodies first).
        value +=
          owned * FRONT_UNITS_PER_SAUCER_V7 >= front
            ? -SURPLUS_COST_V7
            : threatened
              ? 0
              : SAUCER_BIAS_V7;
      else if (owned >= 2 || (owned >= 1 && front < 6))
        value -= SURPLUS_COST_V7;
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
  // A role-level read: the role to train is the viewer seat's own.
  return seatRoleMechanicsV7(view, view.viewer.id, role).shield;
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
  /**
   * `pulp_wars-1wy.4`: the whole hit of own `attacker` on `target` after a
   * Move or a Beam Down (a heat ray at half power), from any tile in range.
   */
  arrivalHit(attacker: PublicUnitV7, target: PublicUnitV7): number;
  /** The tiles `unit`'s offered Moves end on. */
  moveEnds(unit: PublicUnitV7): readonly CoordV7[];
  /** Visible hostile units an attack may target. */
  readonly hostileTargets: readonly PublicUnitV7[];
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
 * still attack this turn. `joins`: another own land unit stands within two
 * tiles of the landing (the delivery by route needs it). With
 * `mobilityPlay` an extraction or a shot on arrival
 * (`beamDownMobilityScoreV7`) is scored first.
 */
export function beamDownScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "BEAM_DOWN" }>,
  passengerCanAct: boolean,
  passengerCanMove: boolean,
  joins = true,
): MartianScoreV7 {
  const { view } = tools;
  const passenger = tools.unit(command.passengerUnitId);
  if (passenger === undefined || passengerCanAct) return NOT_A_CANDIDATE_V7;
  if (beamDownPassengerIsGarrisonV7(tools, passenger))
    return NOT_A_CANDIDATE_V7;
  if (martianPolicyOptions.mobilityPlay) {
    const mobile = beamDownMobilityScoreV7(tools, command, passenger, joins);
    if (mobile !== null) return mobile;
  }
  // The delivery by route joins a group: another own land unit near the
  // landing (the policy checks it).
  if (!joins) return NOT_A_CANDIDATE_V7;
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

/** Whether `unit` has used its primary action this turn. */
export function primaryUsedForPolicyV7(unit: PublicUnitV7): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

/**
 * `pulp_wars-1wy.4` (docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section
 * 9, "Beam Down"): the two uses the freed Beam Down adds, for a passenger
 * with no offered attack that is not a threatened garrison and does not
 * stand on a settlement center (a unit there holds or takes it). Null when
 * neither applies (the delivery by route decides).
 *
 * - **Extraction** (890): a passenger that has used its primary action and
 *   stands in visible lethal reach is set down outside it; by its retained
 *   value, then the least danger.
 * - **A shot on arrival** (906; 1180 when the shot kills): a passenger that
 *   still has its primary action and may act after moving (a beamed unit
 *   counts as moved, so a heat ray fires at half power and a Shield
 *   Projector not at all) lands where a hostile unit is in its range that no
 *   Move of its own reaches, outside visible lethal reach, and not further
 *   from its campaign job than it stands. A shot that does not kill lands
 *   within two tiles of another own land unit (`joins`). By the hit (2 a
 *   point), the target's value when it dies, 6 more from two tiles or more
 *   (no retaliation), less twice the danger.
 */
function beamDownMobilityScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "BEAM_DOWN" }>,
  passenger: PublicUnitV7,
  joins: boolean,
): MartianScoreV7 | null {
  const { view } = tools;
  const rule = unitRoleRuleV7(view, passenger);
  // A unit on a settlement center holds or takes it: it stays.
  const onCenter = view.board.tiles[
    passenger.at.y * view.board.width + passenger.at.x
  ] as PlayerViewV7["board"]["tiles"][number] | undefined;
  if (onCenter?.explored === true && onCenter.site !== null) return null;
  if (primaryUsedForPolicyV7(passenger)) {
    // An exhausted unit (trained this turn) has every flag set: it is
    // delivered by route, not extracted.
    if (passenger.activation.recovered && passenger.activation.captured)
      return null;
    const here = tools.danger(passenger, passenger.at);
    if (here < passenger.hp) return null;
    const there = tools.danger(passenger, command.to);
    if (there >= passenger.hp) return NOT_A_CANDIDATE_V7;
    return {
      priority: BEAM_DOWN_EXTRACT_PRIORITY_V7,
      strategic: tools.retainedValue(passenger) - 2 * there,
      immediate: -there,
    };
  }
  if (
    !rule.abilities.includes("ATTACK") ||
    rule.abilities.includes("MIND_CONTROL") ||
    !unitMayActAfterMoveV7(view, passenger)
  )
    return null;
  const inRange = (from: CoordV7, target: PublicUnitV7): boolean => {
    const gap = chebyshev(from, target.at);
    return gap >= rule.minimumRange && gap <= rule.range;
  };
  const ends = tools.moveEnds(passenger);
  let best: { value: number; kills: boolean } | null = null;
  for (const target of tools.hostileTargets) {
    if (!inRange(command.to, target)) continue;
    if (inRange(passenger.at, target)) continue;
    if (ends.some((end) => inRange(end, target))) continue;
    const hit = tools.arrivalHit(passenger, target);
    if (hit <= 0) continue;
    const kills =
      hit >= target.hp + (tools.facts.shieldByUnit.get(target.id) ?? 0);
    const value =
      BEAM_DOWN_HIT_VALUE_V7 * hit +
      (kills ? tools.targetValue(target) : 0) +
      (chebyshev(command.to, target.at) >= 2 ? BEAM_DOWN_STANDOFF_VALUE_V7 : 0);
    if (
      best === null ||
      (kills && !best.kills) ||
      (kills === best.kills && value > best.value)
    )
      best = { value, kills };
  }
  // A shot that does not kill joins a group (another own land unit within
  // two tiles of the landing): a lone unit in front of the army is lost.
  if (best === null || (!best.kills && !joins)) return null;
  // A passenger with a job is not carried away from it for a shot.
  if ((tools.routeProgress(passenger, command.to) ?? 0) < 0)
    return NOT_A_CANDIDATE_V7;
  const danger = tools.danger(passenger, command.to);
  if (danger >= passenger.hp) return NOT_A_CANDIDATE_V7;
  return {
    priority: best.kills
      ? BEAM_DOWN_KILL_PRIORITY_V7
      : BEAM_DOWN_ATTACK_PRIORITY_V7,
    strategic: best.value - 2 * danger,
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
 * `MIND_CONTROL` (section 12, "use the Brain"): whenever offered (above
 * every kill, so it keeps priority over an ordinary kill of the same
 * target), on the target worth most as what it becomes
 * (`mindControlValueV7`: kind cost plus kills, less what it loses under
 * control), ties by the lower unit ID. The baseline: unit cost, then HP
 * and target value.
 */
export function mindControlScoreV7(
  tools: MartianPolicyToolsV7,
  command: Extract<CommandV7, { kind: "MIND_CONTROL" }>,
): MartianScoreV7 {
  const target = tools.unit(command.targetUnitId);
  if (target === undefined) return NOT_A_CANDIDATE_V7;
  if (martianPolicyOptions.mindControlPlay)
    return {
      priority: MIND_CONTROL_PRIORITY_V7,
      strategic:
        MIND_CONTROL_VALUE_WEIGHT_V7 * mindControlValueV7(tools.view, target),
      immediate: -target.id,
    };
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
 *
 * `pulp_wars-1wy.4` (`mobilityPlay`): the puller's own attack counts only
 * after a free pull (the Mothership's; a Saucer that pulls has spent its
 * action); a pull into a kill or into half of the target's HP and Shield
 * must add to what the own attacks deal where the target stands; and the
 * free pull's utility cases go at 1184, before the Mothership's own Move
 * toward a target and every attack.
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
  // `pulp_wars-1wy.3`: the tile the pull ends on comes from the public
  // query (one tile for a Saucer, up to two for a Mothership).
  const to = queryTractorBeamPathV7(view, mothership.id, target.id)?.at(-1);
  if (to === undefined) return NOT_A_CANDIDATE_V7;
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
  // `pulp_wars-1wy.4`: a pull that is the puller's primary action (the
  // Saucer's) leaves it nothing to shoot with, so its own attack does not
  // count; the Mothership's free pull keeps it (pull, then shoot). A pull
  // into a kill is one the own attacks do not already make where the
  // target stands.
  const mobility = martianPolicyOptions.mobilityPlay;
  const spent =
    mobility && tractorBeamRuleV7(view, mothership)?.free !== true
      ? mothership.id
      : undefined;
  // The free pull goes before the puller's own Move and attacks (1184).
  const utility =
    mobility && spent === undefined
      ? TRACTOR_FREE_PRIORITY_V7
      : TRACTOR_UTILITY_PRIORITY_V7;
  const killers = tools.projectedKillers(target, to, spent);
  const shield = tools.facts.shieldByUnit.get(target.id) ?? 0;
  if (
    killers >= target.hp + shield &&
    (!mobility ||
      tools.projectedKillers(target, target.at, spent) < target.hp + shield)
  )
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
      priority: utility,
      strategic: Math.floor(value / 2),
      immediate: 0,
    };
  // pulp_wars-9s0.8: two more pulls. A hostile unit pulled where the
  // army's other attacks take at least half of its HP and Shield (the army
  // finishes what it starts) ...
  // `pulp_wars-1wy.4`: the Mothership's own attack counts after its free
  // pull, and the pull must add to what the attacks already deal.
  const army = tools.projectedKillers(
    target,
    to,
    mobility ? spent : mothership.id,
  );
  if (
    army > 0 &&
    army * 2 >= target.hp + shield &&
    (!mobility || army > tools.projectedKillers(target, target.at, spent))
  )
    return {
      priority: utility,
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
      priority: utility,
      strategic: 20 + Math.floor(value / 4),
      immediate: 0,
    };
  return NOT_A_CANDIDATE_V7;
}

/**
 * `pulp_wars-1wy.4` (the siege pull, set up): whether a puller's Move to
 * `to` puts it where its Tractor Beam empties a hostile city center for an
 * own capturer. The puller may still pull after the Move (the Saucer: its
 * primary action unused; the Mothership: its free pull unused), no pull of
 * that defender is offered from where it stands, a hostile unit the beam
 * may target holds the center, `to` is within the beam's reach of it, the
 * first tile of the pull (next to the center, toward `to`) is explored
 * open land with no unit and no settlement, and an own capturer next to
 * the center can still step on (`capturerCanEnter`).
 */
export function pullCaptureMoveV7(
  tools: MartianPolicyToolsV7,
  puller: PublicUnitV7,
  to: CoordV7,
  capturerCanEnter: (center: CoordV7) => boolean,
): boolean {
  const { view } = tools;
  const rule = tractorBeamRuleV7(view, puller);
  if (rule === null || !unitMayActAfterMoveV7(view, puller)) return false;
  if (
    rule.free
      ? view.tractorUsedThisTurn.includes(puller.id)
      : primaryUsedForPolicyV7(puller)
  )
    return false;
  for (const city of view.cities) {
    if (city.ownerId === null || !tools.isHostile(city.ownerId)) continue;
    const defender = view.units.find((unit) => same(unit.at, city.at));
    if (
      defender === undefined ||
      !tools.isHostile(defender.ownerId) ||
      tractorBeamTargetBlockV7(view, rule, { at: to }, defender) !== null
    )
      continue;
    if (
      tools.commands.some(
        (command) =>
          command.kind === "TRACTOR_BEAM" &&
          command.unitId === puller.id &&
          command.targetUnitId === defender.id,
      )
    )
      continue;
    const step = tractorBeamDestinationV7(to, city.at);
    const tile = view.board.tiles[step.y * view.board.width + step.x] as
      PlayerViewV7["board"]["tiles"][number] | undefined;
    if (
      tile?.explored !== true ||
      tile.biome === null ||
      tile.terrain === "MOUNTAIN" ||
      tile.terrain === "RIFT" ||
      tile.site !== null ||
      view.units.some((unit) => same(unit.at, step))
    )
      continue;
    if (capturerCanEnter(city.at)) return true;
  }
  return false;
}

/**
 * `pulp_wars-1wy.3`: the Saucer and the Mothership both carry Beam Down and
 * a Tractor Beam now, so the policy's Saucer rules (staging, the target
 * bonus, no chip attacks) and Mothership rules (staying with the army, the
 * guard against a pull) are told apart by the Heavy Tractor Beam mechanic
 * instead of by the ability. With `mobilityPlay` off the policy decides for
 * each as it did before the balance revision; its use of the new tools
 * (`pulp_wars-1wy.4`) is behind that switch.
 */
export function isSaucerForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unitRoleRuleV7(view, unit).abilities.includes("BEAM_DOWN") &&
    !unitRoleMechanicsV7(view, unit).heavyTractorBeam
  );
}

/** The Mothership: a puller with the Heavy Tractor Beam. */
export function isMothershipForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unitRoleRuleV7(view, unit).abilities.includes("TRACTOR_BEAM") &&
    unitRoleMechanicsV7(view, unit).heavyTractorBeam
  );
}

export function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
