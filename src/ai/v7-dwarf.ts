import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  BOMB_RANGE_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  technologyCapabilitiesV7,
  unitIsSluggishV7,
  unitMovementModeV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PublicUnitStatsV7 } from "../engine/v7/unit-stats";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import type { CampaignAssignmentV7 } from "./v7-campaign";

/**
 * The Steampunk Dwarf Normal AI (`pulp_wars-78i.4`,
 * docs/product/RULESET_7_DWARVES.md section 15).
 *
 * Every function reads only the viewer's public view (the mounds of
 * `view.burrowed`, the `dwarf` block of the public unit stats,
 * `bombedThisTurn`), the offered public commands, and public previews
 * (through the policy). Nothing here draws from the PRNG, reads
 * authoritative state, or depends on elapsed time. The policy calls these
 * helpers only in a match with a Dwarf seat (`dwarfMatchForPolicyV7`), or
 * through facts only such a match has (a mound, a `dwarf` stat block, a
 * `bombedThisTurn` entry), so decisions in every other match stay
 * byte-identical.
 *
 * Values are in the policy's usual units: a unit is worth its cost x 4 plus
 * its HP; priorities are the policy's tiers (a kill 1180, a chip 900,
 * routine Moves 600 to 850).
 */

// --- The switch -----------------------------------------------------------

/**
 * Which groups of Dwarf rules the policy plays. The shipped policy plays
 * the Dwarves and against them (`dwarfPlay`, `againstDwarves`); the
 * optional expansion tunnel of section 15 (Mole rule 5) is off, because its
 * head-to-head test did not show that it tends to win (see
 * docs/architecture/NORMAL_AI.md, "Dwarf measurements").
 *
 * The switch exists for the head-to-head and win-tendency tests the spec
 * requires (the Dwarf policy against the generic policy on the Dwarf
 * registration, and each group with and without it): a test or a headless
 * harness sets it before a seat's decision. With `dwarfPlay` and
 * `againstDwarves` both off the policy decides exactly as the generic
 * policy of `pulp_wars-78i.3` did.
 */
export interface DwarfPolicyOptionsV7 {
  /** The Dwarf seat's own rules (Mole, Gyrocopter, Gunner, Engineer, ...). */
  readonly dwarfPlay: boolean;
  /** Every seat's estimates of Dwarf units and the counterplay rules. */
  readonly againstDwarves: boolean;
  /** Section 15 Mole rule 5: tunnelling on an Expansion job. */
  readonly expansionTunnel: boolean;
}

export const DEFAULT_DWARF_POLICY_OPTIONS_V7: DwarfPolicyOptionsV7 =
  Object.freeze({
    dwarfPlay: true,
    againstDwarves: true,
    expansionTunnel: false,
  });

let dwarfPolicyOptions: DwarfPolicyOptionsV7 = DEFAULT_DWARF_POLICY_OPTIONS_V7;

/** The options the next decisions use. */
export function dwarfPolicyOptionsV7(): DwarfPolicyOptionsV7 {
  return dwarfPolicyOptions;
}

/**
 * Tests and headless harnesses only: changes the options and returns the
 * previous ones (restore them when done).
 */
export function setDwarfPolicyOptionsV7(
  options: Partial<DwarfPolicyOptionsV7>,
): DwarfPolicyOptionsV7 {
  const previous = dwarfPolicyOptions;
  dwarfPolicyOptions = Object.freeze({ ...dwarfPolicyOptions, ...options });
  return previous;
}

// --- Priorities -----------------------------------------------------------

/** Mole rule 1: a tunnel toward an invader 3 or 4 tiles away. */
export const DEFENCE_TUNNEL_PRIORITY_V7 = 1150;
/**
 * Mole rule 2: a Pressure tunnel. Above the routine Moves (and so before the
 * rider walks off), below the chips (900): a Mole with an attack where it
 * stands attacks instead.
 */
export const PRESSURE_TUNNEL_PRIORITY_V7 = 875;
/** Mole rule 5 (optional): an expansion tunnel toward a village. */
export const EXPANSION_TUNNEL_PRIORITY_V7 = 870;
/**
 * A bomb that sets up a kill this turn (the target is at most the bomb plus
 * one offered hit) goes before every kill; one that finishes a wounded unit
 * goes after the chips; any other bomb after them too.
 */
export const BOMB_SETUP_PRIORITY_V7 = 1185;
export const BOMB_FINISH_PRIORITY_V7 = 895;
export const BOMB_PRIORITY_V7 = 880;
/** A Gunner's chip goes after the bombs and before the melee chips (900). */
export const GUNNER_CHIP_OFFSET_V7 = 2;
/** Repair of machines comes before the chips (the healed units fight). */
export const MACHINE_REPAIR_PRIORITY_V7 = 905;
/**
 * Against the Dwarves: a unit the next eruption kills where it stands steps
 * out of every eruption ring (the Shatter-escape tier).
 */
export const ERUPTION_ESCAPE_PRIORITY_V7 = 935;
/** Routine Moves are below this priority. */
export const DWARF_ROUTINE_MOVE_PRIORITY_V7 = 1100;

/** Research: the Mole and the Gyrocopter before the army is there. */
export const DWARF_EARLY_RESEARCH_PRIORITY_V7 = 1062;
/** Research: Raiding and Marksmanship with two cities. */
export const DWARF_SIGNATURE_RESEARCH_PRIORITY_V7 = 1170;
/** Research: Administration, Dig In, Blasting Charges, the tier-3 roles. */
export const DWARF_RESEARCH_PRIORITY_V7 = 1150;
export const DWARF_SIGNATURE_RESEARCH_CITIES_V7 = 2;
export const DWARF_LATE_RESEARCH_FRONT_V7 = 5;
/** Dig In is researched once a visible hostile unit is this close to a center. */
export const DIG_IN_THREAT_RADIUS_V7 = 3;

// --- Values ---------------------------------------------------------------

/** Mole rule 2: each hostile ground unit next to a tunnel destination. */
export const ERUPTION_TARGET_VALUE_V7 = 2;
/** Mole rule 2: each of them with the `CATAPULT`, `MARKSMAN`, `CAPTAIN` role. */
export const ERUPTION_BACKLINE_VALUE_V7 = 3;
/** Mole rule 2: no destination next to this many hostile melee units. */
export const TUNNEL_MELEE_LIMIT_V7 = 3;
/** Mole rule 2: a Pressure tunnel needs a route of at least this many steps. */
export const PRESSURE_TUNNEL_STEPS_V7 = 4;
/** Mole rule 1: a tunnel goes toward an invader this far away. */
export const DEFENCE_TUNNEL_MINIMUM_V7 = 3;
export const DEFENCE_TUNNEL_MAXIMUM_V7 = 4;
/** Mole rule 5: a village this far from the Mole. */
export const EXPANSION_VILLAGE_MINIMUM_V7 = 5;
export const EXPANSION_VILLAGE_MAXIMUM_V7 = 8;
/**
 * A tunnel that erupts on nobody keeps the Mole within this distance of
 * another own land unit (it surfaces next to its wave, not alone).
 */
export const TUNNEL_ESCORT_RADIUS_V7 = 3;
/** The Gyrocopter's back-liner bonus (`CATAPULT`, `MARKSMAN`, `CAPTAIN`). */
export const BOMB_BACKLINE_VALUE_V7 = 6;
/** The Gyrocopter's kill bonus. */
export const BOMB_KILL_VALUE_V7 = 10;
/**
 * The Gyrocopter never lands where the landing threat is this much (its 8
 * HP) unless the bomb kills a `CATAPULT` or `CAPTAIN`-role unit.
 */
export const BOMB_LANDING_THREAT_LIMIT_V7 = 8;
/**
 * The landing threat counts half in a bombing run's score (the spec's
 * formula subtracts all of it). With the whole threat the Gyrocopters
 * refused most runs (14 bombs in 64 head-to-head seat-games, a 4-Coin scout,
 * section 21 concern 5); with half of it they bombed 73 times and the
 * policy won as often (37 of 64 against 35 of 64). The hard limit of 8
 * stands.
 */
export const BOMB_LANDING_THREAT_DIVISOR_V7 = 2;
/** Bombing runs previewed exactly per Gyrocopter (the best by estimate). */
export const BOMB_PREVIEWS_PER_GYROCOPTER_V7 = 3;
/** An assembled Gunner's value (its HP plus the placement). */
export const ASSEMBLE_VALUE_V7 = 20;
/** An Engineer Assembles within this distance of a visible hostile unit. */
export const ASSEMBLE_FRONT_RADIUS_V7 = 3;
/** Assemble goes before training when home is this far from the target. */
export const ASSEMBLE_FAR_HOME_V7 = 4;
/** Repair: HP on a construct counts double. */
export const CONSTRUCT_REPAIR_FACTOR_V7 = 2;
/** Repair: below this many machine HP the Repair keeps its routine tier. */
export const MACHINE_REPAIR_MINIMUM_V7 = 3;
/** The Engineer: per missing HP of an adjacent own construct at its tile. */
export const ENGINEER_ESCORT_VALUE_V7 = 1;
/** The Engineer: a Move that ends next to a visible hostile melee unit. */
export const ENGINEER_EXPOSURE_COST_V7 = 6;
/** A Hammerer ends a routine Move next to a fresh own Mole (rule 3). */
export const RIDER_STAGING_VALUE_V7 = 2;
/** A Steam Cannon's Knockback: off a hostile center, off Field Defense. */
export const KNOCKBACK_CENTER_VALUE_V7 = 8;
export const KNOCKBACK_FIELD_DEFENSE_VALUE_V7 = 4;
/** A Steam Cannon's Knockback: per own melee unit next to the push tile. */
export const KNOCKBACK_MELEE_VALUE_V7 = 2;

/** Production: the first Mole, Gunner, Engineer, Cannon, and Tank. */
export const DWARF_FIRST_OF_ROLE_BIAS_V7 = 10;
/** Production: bodies (Hammerers, and a Mole) first under threat. */
export const THREATENED_HAMMERER_BIAS_V7 = 12;
export const THREATENED_MOLE_BIAS_V7 = 6;
export const THREATENED_SUPPORT_COST_V7 = 30;
/** Production: the Hammerer pays less for repetition (5 instead of 8). */
export const HAMMERER_REPETITION_REFUND_V7 = 3;
/** Production: one Mole for this many other front units. */
export const FRONT_UNITS_PER_MOLE_V7 = 3;
export const MOLE_BIAS_V7 = 6;
/**
 * Production: the first Gyrocopter at war with four front units, then one
 * per five (the head-to-head: a Gyrocopter per three front units lost).
 */
export const GYROCOPTER_FRONT_V7 = 4;
export const FRONT_UNITS_PER_GYROCOPTER_V7 = 5;
export const GYROCOPTER_BIAS_V7 = 4;
/**
 * Production: the Engineer at war with four front units once it has work
 * (Marksmanship for Assemble, or two machines to mend), then one per eight.
 */
export const ENGINEER_FRONT_V7 = 4;
export const ENGINEER_MACHINES_V7 = 2;
export const FRONT_UNITS_PER_ENGINEER_V7 = 8;
export const ENGINEER_BIAS_V7 = 16;
/** Production: one Steam Cannon for this many front units. */
export const FRONT_UNITS_PER_CANNON_V7 = 4;
/** Production: a role beyond its need costs this much. */
export const DWARF_SURPLUS_COST_V7 = 20;

/** Against the Dwarves: a visible Engineer, and per construct near it. */
export const ENGINEER_TARGET_BONUS_V7 = 6;
export const ENGINEER_CONSTRUCT_TARGET_BONUS_V7 = 4;
export const ENGINEER_CONSTRUCT_RADIUS_V7 = 2;
/** Against the Dwarves: a Gyrocopter that landed next to an own unit. */
export const LANDED_GYROCOPTER_TARGET_BONUS_V7 = 6;
/** Against the Dwarves: a ranged unit that ends a Move in an eruption ring. */
export const RANGED_RING_COST_V7 = 3;

// --- Gate and facts -------------------------------------------------------

/** Whether the match has a Dwarf seat (the gate of every heuristic). */
export function dwarfMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "DWARF");
}

/** A hostile mound of a Steam Mole (it erupts) or of a rider (it does not). */
export interface HostileMoundV7 {
  readonly unit: PublicUnitV7;
  readonly mole: boolean;
  /** The owner's public eruption damage (0 for a rider). */
  readonly eruptionDamage: number;
}

/** Per-view public Dwarf facts. */
export interface DwarfFactsV7 {
  readonly viewerDwarf: boolean;
  readonly dwarfOwners: ReadonlySet<PlayerId>;
  /** The `dwarf` stat block of every visible unit and mound. */
  readonly statsById: ReadonlyMap<UnitId, PublicUnitStatsV7>;
  /** Visible hostile mounds. */
  readonly hostileMounds: readonly HostileMoundV7[];
  /** Visible hostile land-form Gyrocopters that can bomb next turn. */
  readonly hostileGyrocopters: readonly PublicUnitV7[];
  /** Visible hostile Engineers. */
  readonly hostileEngineers: readonly PublicUnitV7[];
}

export function dwarfFactsV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): DwarfFactsV7 {
  const dwarfOwners = new Set<PlayerId>(
    view.players
      .filter((player) => player.faction === "DWARF")
      .map((player) => player.id),
  );
  const statsById = new Map<UnitId, PublicUnitStatsV7>();
  for (const stats of view.unitStats) statsById.set(stats.unitId, stats);
  const hostileMounds: HostileMoundV7[] = [];
  for (const entry of view.burrowed) {
    if (!isHostile(entry.unit.ownerId)) continue;
    const mole = entry.moleUnitId === null;
    hostileMounds.push({
      unit: entry.unit,
      mole,
      eruptionDamage: mole
        ? (statsById.get(entry.unit.id)?.dwarf?.eruptionDamage ?? 0)
        : 0,
    });
  }
  const hostileGyrocopters: PublicUnitV7[] = [];
  const hostileEngineers: PublicUnitV7[] = [];
  for (const unit of view.units) {
    if (
      unit.form !== "LAND" ||
      unit.hp <= 0 ||
      !dwarfOwners.has(unit.ownerId) ||
      !isHostile(unit.ownerId)
    )
      continue;
    const abilities = unitRoleRuleV7(view, unit).abilities;
    if (abilities.includes("BOMB_RUN") && !unitIsSluggishV7(view, unit))
      hostileGyrocopters.push(unit);
    if (abilities.includes("ASSEMBLE")) hostileEngineers.push(unit);
  }
  return {
    viewerDwarf: view.viewer.faction === "DWARF",
    dwarfOwners,
    statsById,
    hostileMounds,
    hostileGyrocopters,
    hostileEngineers,
  };
}

/** A unit on the ground for the eruption (land form, not flying, or an Egg). */
export function onTheGroundV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "EGG" ||
    (unit.form === "LAND" && unitMovementModeV7(view, unit) !== "FLY")
  );
}

/** A `CATAPULT`, `MARKSMAN`, or `CAPTAIN`-role unit (the soft back line). */
export function backLinerV7(unit: { readonly role: UnitRoleIdV7 }): boolean {
  return (
    unit.role === "CATAPULT" ||
    unit.role === "MARKSMAN" ||
    unit.role === "CAPTAIN"
  );
}

/** A visible land unit that attacks at distance 1 (a melee unit). */
export function meleeUnitV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  if (unit.form !== "LAND") return false;
  const rule = unitRoleRuleV7(view, unit);
  return (
    rule.abilities.includes("ATTACK") &&
    rule.attack2 > 0 &&
    rule.minimumRange <= 1
  );
}

/**
 * The eruption damage a ground unit takes at `at` at the next Start Turn of
 * the hostile mounds' owners: the sum over the hostile Mole mounds next to
 * it (each Mole erupts on its eight tiles).
 */
export function eruptionAtV7(facts: DwarfFactsV7, at: CoordV7): number {
  let total = 0;
  for (const mound of facts.hostileMounds)
    if (mound.mole && chebyshev(mound.unit.at, at) === 1)
      total += mound.eruptionDamage;
  return total;
}

/**
 * The bomb a visible hostile Gyrocopter can drop on a unit at `at` next
 * turn: its owner's public bomb damage when it is within `BOMB_RANGE_V7`,
 * once per unit (the largest, whatever the number of Gyrocopters).
 */
export function bombThreatAtV7(facts: DwarfFactsV7, at: CoordV7): number {
  let worst = 0;
  for (const gyro of facts.hostileGyrocopters)
    if (chebyshev(gyro.at, at) <= BOMB_RANGE_V7)
      worst = Math.max(
        worst,
        facts.statsById.get(gyro.id)?.dwarf?.bombDamage ?? 0,
      );
  return worst;
}

// --- Production -----------------------------------------------------------

export interface DwarfArmyCountsV7 {
  readonly byRole: ReadonlyMap<UnitRoleIdV7, number>;
  /** Hammerers, Gunners, Moles, Cannons, Tanks, the Titan (mounds too). */
  readonly front: number;
  /** Machines that Repair mends (every Dwarf land role but two). */
  readonly machines: number;
}

export function dwarfArmyCountsV7(view: PlayerViewV7): DwarfArmyCountsV7 {
  const byRole = new Map<UnitRoleIdV7, number>();
  let front = 0;
  let machines = 0;
  const units = [
    ...view.units,
    ...view.burrowed.map((entry) => entry.unit),
  ].filter((unit) => unit.ownerId === view.viewer.id && unit.form !== "NAVAL");
  for (const unit of units) {
    byRole.set(unit.role, (byRole.get(unit.role) ?? 0) + 1);
    if (
      unit.role === "FIGHTER" ||
      unit.role === "MARKSMAN" ||
      unit.role === "GUARD" ||
      unit.role === "CATAPULT" ||
      unit.role === "KNIGHT" ||
      unit.role === "JUGGERNAUT"
    )
      front += 1;
    if (unit.role !== "FIGHTER" && unit.role !== "CAPTAIN") machines += 1;
  }
  return { byRole, front, machines };
}

/**
 * The Dwarf production adjustment of one role, added to the policy's role
 * value in the preferred role and in the city-action utility (section 15,
 * "produce every role"; "train Hammerers or a Mole first under threat"):
 *
 * - the Mole, the Gunner, the Engineer, the Cannon, and the Tank gain 10 as
 *   the first of their role (the Gyrocopter has the `RAIDER` bias already);
 * - in a threatened city the Hammerer gains 12 and the Mole 6, and the
 *   Gyrocopter and the Engineer are worth -30 (bodies first);
 * - the Hammerer's repetition costs 5 a unit instead of 8 (bodies);
 * - a Mole gains 6 while there is fewer than one per three other front
 *   units, otherwise it costs 20 (Moles go with the waves);
 * - at war with four front units the first Gyrocopter gains 4, then one
 *   per five front units is valued as usual; any other costs 20;
 * - the Engineer gains 16 at war with four front units once it has work
 *   (Marksmanship for Assemble, or two machines to mend) and no Engineer (a
 *   second one with eight front units per Engineer), otherwise it costs 20;
 * - a Steam Cannon costs 20 beyond one per four front units.
 */
export function dwarfProductionAdjustmentV7(
  view: PlayerViewV7,
  role: UnitRoleIdV7,
  counts: DwarfArmyCountsV7,
  threatened: boolean,
  atWar: boolean,
  repetition: boolean,
): number {
  if (view.viewer.faction !== "DWARF") return 0;
  const owned = counts.byRole.get(role) ?? 0;
  const front = counts.front;
  // An Engineer has work: it can Assemble, or there are machines to mend.
  const engineerUseful =
    technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
      .assemble || counts.machines >= ENGINEER_MACHINES_V7;
  let value =
    owned === 0 &&
    (role === "GUARD" ||
      role === "MARKSMAN" ||
      role === "CAPTAIN" ||
      role === "CATAPULT" ||
      role === "KNIGHT")
      ? DWARF_FIRST_OF_ROLE_BIAS_V7
      : 0;
  switch (role) {
    case "FIGHTER":
      if (repetition) value += HAMMERER_REPETITION_REFUND_V7 * owned;
      if (threatened) value += THREATENED_HAMMERER_BIAS_V7;
      break;
    case "GUARD": {
      if (threatened) value += THREATENED_MOLE_BIAS_V7;
      const others = front - owned;
      value +=
        owned * FRONT_UNITS_PER_MOLE_V7 <= others
          ? MOLE_BIAS_V7
          : -DWARF_SURPLUS_COST_V7;
      break;
    }
    case "RAIDER":
      if (threatened) return -THREATENED_SUPPORT_COST_V7;
      value +=
        atWar &&
        front >= GYROCOPTER_FRONT_V7 &&
        owned * FRONT_UNITS_PER_GYROCOPTER_V7 < front
          ? owned === 0
            ? GYROCOPTER_BIAS_V7
            : 0
          : -DWARF_SURPLUS_COST_V7;
      break;
    case "CAPTAIN":
      if (threatened) return -THREATENED_SUPPORT_COST_V7;
      value +=
        atWar &&
        engineerUseful &&
        front >= ENGINEER_FRONT_V7 &&
        (owned === 0 || owned * FRONT_UNITS_PER_ENGINEER_V7 <= front)
          ? ENGINEER_BIAS_V7
          : -DWARF_SURPLUS_COST_V7;
      break;
    case "CATAPULT":
      if (owned > 0 && owned * FRONT_UNITS_PER_CANNON_V7 > front)
        value -= DWARF_SURPLUS_COST_V7;
      break;
    default:
      break;
  }
  return value;
}

// --- Research -------------------------------------------------------------

export interface DwarfResearchFactsV7 {
  readonly ownedCities: number;
  readonly counts: DwarfArmyCountsV7;
  /** A visible hostile unit within 3 of an own city center. */
  readonly cityThreatened: boolean;
  /** A visible hostile city with Walls, or a Martian seat in the match. */
  readonly wallsOrShields: boolean;
}

/**
 * Dwarf research (section 15, "research toward its roles"); the free
 * opening technology keeps the existing scorer. Drill (the Mole) while the
 * role plan is the alternative; Dig In once a visible hostile unit or mound
 * stands within 3 of an own center; with two cities Marksmanship (the
 * Gunner and Assemble) at the Dinosaur signature priority, and Raiding
 * (Dive) once the seat owns a Gyrocopter; Administration once it owns a
 * Gunner or two Moles; Scouting (the Gyrocopter) with four front units;
 * Blasting Charges against a visible Walled city or a Martian seat; then
 * Sawmilling and Chivalry (the shorter chain first). Returns the next
 * technology to research and its tier, or null. (The first draft pushed
 * Scouting with Drill and Raiding with two cities: Gyrocopters too early,
 * and the head-to-head was lost.)
 */
export function dwarfResearchV7(
  view: PlayerViewV7,
  facts: DwarfResearchFactsV7,
): {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
} | null {
  if (view.viewer.faction !== "DWARF") return null;
  const owned = new Set(view.viewer.researchedTechs);
  const tree = factionTreeV7(view.viewer.faction);
  const chainTo = (target: TechnologyIdV7): readonly TechnologyIdV7[] => {
    const result: TechnologyIdV7[] = [];
    const visit = (tech: TechnologyIdV7): void => {
      if (owned.has(tech) || result.includes(tech)) return;
      const node = tree.nodes.find((item) => item.id === tech);
      for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
      result.push(tech);
    };
    visit(target);
    return result;
  };
  const withUnlock = (kind: string): TechnologyIdV7 | null => {
    for (const node of tree.nodes)
      if (node.unlocks.some((unlock) => unlock.kind === kind)) return node.id;
    return null;
  };
  type Plan = {
    readonly tech: TechnologyIdV7;
    readonly priority: number;
    readonly strategic: number;
  };
  const pick = (
    roles: readonly UnitRoleIdV7[],
    priority: number,
  ): Plan | null => {
    let best: { chain: readonly TechnologyIdV7[]; role: UnitRoleIdV7 } | null =
      null;
    for (const role of roles) {
      const tech = effectiveRoleRuleV7(role, view.viewer.faction).technology;
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
  const towards = (
    tech: TechnologyIdV7 | null,
    priority: number,
    strategic: number,
  ): Plan | null => {
    const first = tech === null ? undefined : chainTo(tech)[0];
    return first === undefined ? null : { tech: first, priority, strategic };
  };
  const early = pick(["GUARD"], DWARF_EARLY_RESEARCH_PRIORITY_V7);
  if (early !== null) return early;
  if (facts.cityThreatened) {
    const digIn = towards(withUnlock("DIG_IN"), DWARF_RESEARCH_PRIORITY_V7, 12);
    if (digIn !== null) return digIn;
  }
  if (facts.ownedCities >= DWARF_SIGNATURE_RESEARCH_CITIES_V7) {
    const signature = pick(["MARKSMAN"], DWARF_SIGNATURE_RESEARCH_PRIORITY_V7);
    if (signature !== null) return signature;
    if ((facts.counts.byRole.get("RAIDER") ?? 0) > 0) {
      const raiding = towards(
        withUnlock("DIVE"),
        DWARF_SIGNATURE_RESEARCH_PRIORITY_V7,
        10,
      );
      if (raiding !== null) return raiding;
    }
  }
  const moles = facts.counts.byRole.get("GUARD") ?? 0;
  const gunners = facts.counts.byRole.get("MARKSMAN") ?? 0;
  if (gunners >= 1 || moles >= 2) {
    const administration = pick(["CAPTAIN"], DWARF_RESEARCH_PRIORITY_V7);
    if (administration !== null) return administration;
  }
  if (facts.counts.front >= GYROCOPTER_FRONT_V7) {
    const scouting = pick(["RAIDER"], DWARF_EARLY_RESEARCH_PRIORITY_V7);
    if (scouting !== null) return scouting;
  }
  if (facts.wallsOrShields) {
    const blasting = towards(
      withUnlock("BLASTING_CHARGES"),
      DWARF_RESEARCH_PRIORITY_V7,
      10,
    );
    if (blasting !== null) return blasting;
  }
  if (facts.ownedCities < DWARF_SIGNATURE_RESEARCH_CITIES_V7) return null;
  return pick(
    ["CATAPULT", "KNIGHT"],
    facts.counts.front >= DWARF_LATE_RESEARCH_FRONT_V7
      ? DWARF_RESEARCH_PRIORITY_V7
      : DWARF_EARLY_RESEARCH_PRIORITY_V7,
  );
}

// --- Commands -------------------------------------------------------------

export interface DwarfScoreV7 {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
}

export const NOT_A_DWARF_CANDIDATE_V7: DwarfScoreV7 = Object.freeze({
  priority: -1,
  strategic: 0,
  immediate: 0,
});

/** What the policy provides to the Dwarf planning helpers. */
export interface DwarfPolicyToolsV7 {
  readonly view: PlayerViewV7;
  readonly facts: DwarfFactsV7;
  readonly commands: readonly CommandV7[];
  readonly options: DwarfPolicyOptionsV7;
  isHostile(ownerId: PlayerId): boolean;
  unit(unitId: UnitId): PublicUnitV7 | undefined;
  targetValue(unit: PublicUnitV7): number;
  /** The policy's visible danger to `unit` standing on `at` next turn. */
  danger(unit: PublicUnitV7, at: CoordV7): number;
  /** The unit's campaign job, if any. */
  assignment(unitId: UnitId): CampaignAssignmentV7 | undefined;
  /** A wave has not formed: a Move from home to `to` waits. */
  holdsMove(unit: PublicUnitV7, to: CoordV7): boolean;
  /** The best HP damage of an own offered attack on the target (0 if none). */
  bestOwnHit(targetId: UnitId, exceptUnitId: UnitId): number;
  /** The exact bombing-run preview (`previewBombRunV7`), or null. */
  previewBomb(command: Extract<CommandV7, { kind: "BOMB_RUN" }>): {
    readonly damage: number;
    readonly shieldDamage: number;
    readonly kills: boolean;
    readonly landingThreat: number;
  } | null;
}

type TunnelCommandV7 = Extract<CommandV7, { kind: "TUNNEL" }>;
type BombCommandV7 = Extract<CommandV7, { kind: "BOMB_RUN" }>;

export interface PlannedDwarfCommandV7<C extends CommandV7> {
  readonly command: C;
  readonly priority: number;
  readonly strategic: number;
}

/**
 * The eruption score of a destination (Mole rule 2): 2 for each visible
 * hostile ground unit next to it, 3 more for each with the `CATAPULT`,
 * `MARKSMAN`, or `CAPTAIN` role. The Mole erupts at its owner's next Start
 * Turn, so this is a forecast (the targets may move first); it is used to
 * choose a tile, never counted as damage dealt.
 */
export function eruptionScoreV7(
  view: PlayerViewV7,
  hostiles: readonly PublicUnitV7[],
  to: CoordV7,
): { readonly score: number; readonly melee: number } {
  let score = 0;
  let melee = 0;
  for (const unit of hostiles) {
    if (chebyshev(unit.at, to) !== 1) continue;
    if (onTheGroundV7(view, unit))
      score +=
        ERUPTION_TARGET_VALUE_V7 +
        (backLinerV7(unit) ? ERUPTION_BACKLINE_VALUE_V7 : 0);
    if (meleeUnitV7(view, unit)) melee += 1;
  }
  return { score, melee };
}

/**
 * Every own Mole's tunnel, or none (section 15, the Mole AI rule). The
 * large offer list (destinations x rider tiles) is pruned cheaply: each
 * destination is scored once from the visible units around it, and only
 * the chosen destination's rider tiles are compared. Returns, per Mole,
 * the one `TUNNEL` the policy will consider (every other is not a
 * candidate).
 *
 * 1. Defence: a Mole that can walk to an invader (a visible hostile land
 *    unit within 2 of an own city center) and hit it this turn does not
 *    tunnel; one 3 or 4 tiles from an invader tunnels to the offered
 *    destination next to it with the best eruption score.
 * 2. Offence: on a Pressure job whose wave has set out, with a route of 4
 *    or more steps to its target, it tunnels to the destination with the
 *    best eruption score plus route progress, skipping destinations next to
 *    three or more hostile melee units unless next to the target's center;
 *    a destination that erupts on nobody must make route progress and stay
 *    within 3 of another own land unit.
 * 3. Rider: it takes an adjacent fresh Hammerer when a rider tile is
 *    offered (never the garrison of an own center with a hostile unit
 *    within 3), on the rider tile next to the most hostile units (the
 *    softest first).
 * 5. Optional (the switch): on an Expansion job, toward a village 5 to 8
 *    tiles away that no own unit reaches sooner by walking.
 *
 * It never tunnels off an own city center it garrisons alone.
 */
export function planTunnelsV7(
  tools: DwarfPolicyToolsV7,
): ReadonlyMap<UnitId, PlannedDwarfCommandV7<TunnelCommandV7> | null> {
  const { view } = tools;
  const result = new Map<
    UnitId,
    PlannedDwarfCommandV7<TunnelCommandV7> | null
  >();
  const byMole = new Map<UnitId, TunnelCommandV7[]>();
  for (const command of tools.commands)
    if (command.kind === "TUNNEL") {
      const list = byMole.get(command.unitId) ?? [];
      list.push(command);
      byMole.set(command.unitId, list);
    }
  if (byMole.size === 0) return result;
  const hostiles = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.form !== "NAVAL" && tools.isHostile(unit.ownerId),
  );
  const ownCenters = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const ownLand = view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.form === "LAND",
  );
  const invaders = hostiles.filter(
    (unit) =>
      unit.form === "LAND" &&
      ownCenters.some((center) => chebyshev(center, unit.at) <= 2),
  );
  const hostileCenterGarrisoned = (unit: PublicUnitV7): boolean =>
    ownCenters.some((center) => same(center, unit.at)) &&
    hostiles.some(
      (hostile) =>
        hostile.form === "LAND" && chebyshev(hostile.at, unit.at) <= 3,
    );
  for (const [moleId, offers] of byMole) {
    const mole = tools.unit(moleId);
    if (mole === undefined) {
      result.set(moleId, null);
      continue;
    }
    const center = ownCenters.find((at) => same(at, mole.at));
    if (
      center !== undefined &&
      !ownLand.some(
        (unit) => unit.id !== mole.id && chebyshev(unit.at, center) <= 1,
      )
    ) {
      result.set(moleId, null);
      continue;
    }
    const destinations = new Map<
      string,
      {
        to: CoordV7;
        riderless: TunnelCommandV7 | null;
        ridden: TunnelCommandV7[];
      }
    >();
    for (const command of offers) {
      const key = coordKeyV7(command.to);
      const entry = destinations.get(key) ?? {
        to: command.to,
        riderless: null,
        ridden: [],
      };
      if (command.rider === null) entry.riderless = command;
      else {
        const rider = tools.unit(command.rider.unitId);
        if (rider !== undefined && !hostileCenterGarrisoned(rider))
          entry.ridden.push(command);
      }
      destinations.set(key, entry);
    }
    let best: {
      to: CoordV7;
      score: number;
      danger: number;
      priority: number;
      entry: {
        riderless: TunnelCommandV7 | null;
        ridden: TunnelCommandV7[];
      };
    } | null = null;
    const consider = (
      entry: {
        to: CoordV7;
        riderless: TunnelCommandV7 | null;
        ridden: TunnelCommandV7[];
      },
      score: number,
      priority: number,
    ): void => {
      if (score <= 0) return;
      const danger = tools.danger(mole, entry.to);
      if (
        best === null ||
        score > best.score ||
        (score === best.score &&
          (danger < best.danger ||
            (danger === best.danger &&
              (entry.to.y < best.to.y ||
                (entry.to.y === best.to.y && entry.to.x < best.to.x)))))
      )
        best = { to: entry.to, score, danger, priority, entry };
    };
    // Rule 1: defence.
    const walkable = invaders.some(
      (invader) => chebyshev(invader.at, mole.at) <= 2,
    );
    const far = invaders.filter((invader) => {
      const range = chebyshev(invader.at, mole.at);
      return (
        range >= DEFENCE_TUNNEL_MINIMUM_V7 && range <= DEFENCE_TUNNEL_MAXIMUM_V7
      );
    });
    if (walkable) {
      result.set(moleId, null);
      continue;
    }
    if (far.length > 0)
      for (const entry of destinations.values()) {
        if (!far.some((invader) => chebyshev(invader.at, entry.to) === 1))
          continue;
        consider(
          entry,
          eruptionScoreV7(view, hostiles, entry.to).score,
          DEFENCE_TUNNEL_PRIORITY_V7,
        );
      }
    // Rule 2: offence, on a Pressure job only.
    const assignment = tools.assignment(mole.id);
    if (best === null && assignment?.job === "ATTACK") {
      const steps = assignment.field.get(mole.at);
      const blocked =
        steps !== undefined && steps > chebyshev(mole.at, assignment.at) + 1;
      if (steps !== undefined && (steps >= PRESSURE_TUNNEL_STEPS_V7 || blocked))
        for (const entry of destinations.values()) {
          if (tools.holdsMove(mole, entry.to)) continue;
          const eruption = eruptionScoreV7(view, hostiles, entry.to);
          if (
            eruption.melee >= TUNNEL_MELEE_LIMIT_V7 &&
            chebyshev(entry.to, assignment.at) > 1
          )
            continue;
          const next = assignment.field.get(entry.to);
          const progress = next === undefined ? 0 : steps - next;
          if (eruption.score === 0) {
            if (progress <= 1) continue;
            if (
              !ownLand.some(
                (unit) =>
                  unit.id !== mole.id &&
                  chebyshev(unit.at, entry.to) <= TUNNEL_ESCORT_RADIUS_V7,
              )
            )
              continue;
          }
          consider(
            entry,
            eruption.score + progress,
            PRESSURE_TUNNEL_PRIORITY_V7,
          );
        }
    }
    // Rule 5 (optional): expansion.
    if (best === null && tools.options.expansionTunnel)
      for (const village of expansionVillagesV7(tools, mole))
        for (const entry of destinations.values()) {
          const reach = (at: CoordV7): number => chebyshev(at, village);
          const riderTiles = entry.ridden.map((command) =>
            command.rider === null ? entry.to : command.rider.to,
          );
          const closest = Math.min(
            reach(entry.to),
            ...riderTiles.map((at) => reach(at)),
          );
          const gain = reach(mole.at) - closest;
          if (gain < 2) continue;
          consider(entry, gain, EXPANSION_TUNNEL_PRIORITY_V7);
        }
    const chosen = best as {
      to: CoordV7;
      score: number;
      priority: number;
      entry: {
        riderless: TunnelCommandV7 | null;
        ridden: TunnelCommandV7[];
      };
    } | null;
    if (chosen === null) {
      result.set(moleId, null);
      continue;
    }
    // Rule 3: the rider, on the tile next to the most hostile units.
    let command: TunnelCommandV7 | null = chosen.entry.riderless;
    let riderKey = -1;
    for (const ridden of chosen.entry.ridden) {
      const rider = ridden.rider;
      if (rider === null) continue;
      const tile = rider.to;
      let key = 0;
      for (const hostile of hostiles)
        if (hostile.form === "LAND" && chebyshev(hostile.at, tile) === 1)
          key += 2 + (backLinerV7(hostile) ? 1 : 0);
      if (
        command === null ||
        command.rider === null ||
        key > riderKey ||
        (key === riderKey &&
          (tile.y < command.rider.to.y ||
            (tile.y === command.rider.to.y && tile.x < command.rider.to.x)))
      ) {
        command = ridden;
        riderKey = key;
      }
    }
    if (command === null) {
      result.set(moleId, null);
      continue;
    }
    result.set(moleId, {
      command,
      priority: chosen.priority,
      strategic: chosen.score,
    });
  }
  return result;
}

/**
 * Mole rule 5: the unclaimed villages 5 to 8 tiles from the Mole that no
 * other own capture-capable unit reaches sooner by walking (Chebyshev turns
 * at its Move), nearest first.
 */
function expansionVillagesV7(
  tools: DwarfPolicyToolsV7,
  mole: PublicUnitV7,
): readonly CoordV7[] {
  const { view } = tools;
  const assignment = tools.assignment(mole.id);
  const riders = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      chebyshev(unit.at, mole.at) === 1 &&
      unitRoleRuleV7(view, unit).abilities.includes("RIDES_TUNNEL"),
  );
  if (
    assignment?.job !== "VILLAGE" &&
    !riders.some((rider) => tools.assignment(rider.id)?.job === "VILLAGE")
  )
    return [];
  const capturers = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unit.id !== mole.id &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"),
  );
  const villages: CoordV7[] = [];
  for (const tile of view.board.tiles) {
    if (
      !tile.explored ||
      tile.site !== "VILLAGE" ||
      tile.territoryOwnerId !== null
    )
      continue;
    const range = chebyshev(tile.at, mole.at);
    if (
      range < EXPANSION_VILLAGE_MINIMUM_V7 ||
      range > EXPANSION_VILLAGE_MAXIMUM_V7
    )
      continue;
    // The ride: about two turns (tunnel, surface, walk in).
    const rideTurns = Math.max(2, range - 3);
    const sooner = capturers.some((unit) => {
      const move = Math.max(1, unitRoleRuleV7(view, unit).move);
      return (
        !riders.some((rider) => rider.id === unit.id) &&
        Math.ceil(chebyshev(unit.at, tile.at) / move) < rideTurns
      );
    });
    if (!sooner) villages.push(tile.at);
  }
  return villages.sort(
    (left, right) =>
      chebyshev(left, mole.at) - chebyshev(right, mole.at) ||
      left.y - right.y ||
      left.x - right.x,
  );
}

/**
 * Every own Gyrocopter's bombing run, or none (section 15, "choose the
 * Gyrocopter's targets"). Each offered `BOMB_RUN` is scored by
 * `min(bombDamage, target HP)`, plus the kill bonus when it kills, plus the
 * back-liner bonus, minus half the landing threat; the best few by the policy's
 * own danger estimate are previewed exactly (`previewBombRunV7`, with its
 * `landingThreat`), and the best above zero is taken. It never lands where
 * the landing threat is 8 or more unless the bomb kills a `CATAPULT` or
 * `CAPTAIN`-role unit. A bomb that sets up a kill this turn (a target at
 * most the bomb plus one offered hit) goes before every kill; one that
 * kills goes after the chips.
 */
export function planBombRunsV7(
  tools: DwarfPolicyToolsV7,
): ReadonlyMap<UnitId, PlannedDwarfCommandV7<BombCommandV7> | null> {
  const { view } = tools;
  const result = new Map<UnitId, PlannedDwarfCommandV7<BombCommandV7> | null>();
  const byGyro = new Map<UnitId, BombCommandV7[]>();
  for (const command of tools.commands)
    if (command.kind === "BOMB_RUN") {
      const list = byGyro.get(command.unitId) ?? [];
      list.push(command);
      byGyro.set(command.unitId, list);
    }
  const bombDamage = technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).bombDamage;
  const shieldOf = (unitId: UnitId): number =>
    view.shields.find((entry) => entry.unitId === unitId)?.shield ?? 0;
  for (const [gyroId, offers] of byGyro) {
    const gyro = tools.unit(gyroId);
    if (gyro === undefined) {
      result.set(gyroId, null);
      continue;
    }
    const score = (
      command: BombCommandV7,
      damage: number,
      kills: boolean,
      threat: number,
    ): number => {
      const target = tools.unit(command.targetUnitId);
      if (target === undefined) return Number.NEGATIVE_INFINITY;
      if (
        threat >= BOMB_LANDING_THREAT_LIMIT_V7 &&
        !(kills && (target.role === "CATAPULT" || target.role === "CAPTAIN"))
      )
        return Number.NEGATIVE_INFINITY;
      return (
        Math.min(damage, target.hp) +
        (kills ? BOMB_KILL_VALUE_V7 : 0) +
        (backLinerV7(target) ? BOMB_BACKLINE_VALUE_V7 : 0) -
        Math.floor(threat / BOMB_LANDING_THREAT_DIVISOR_V7)
      );
    };
    const estimates = offers
      .map((command) => {
        const target = tools.unit(command.targetUnitId);
        if (target === undefined)
          return { command, value: Number.NEGATIVE_INFINITY };
        const damage = Math.max(
          0,
          Math.min(target.hp, bombDamage - shieldOf(target.id)),
        );
        return {
          command,
          value: score(
            command,
            damage,
            damage >= target.hp,
            Math.min(gyro.hp, tools.danger(gyro, command.to)),
          ),
        };
      })
      .filter((entry) => entry.value > Number.NEGATIVE_INFINITY)
      .sort(
        (left, right) =>
          right.value - left.value ||
          left.command.targetUnitId - right.command.targetUnitId ||
          left.command.to.y - right.command.to.y ||
          left.command.to.x - right.command.to.x,
      );
    let best: {
      command: BombCommandV7;
      value: number;
      kills: boolean;
      damage: number;
    } | null = null;
    for (const entry of estimates.slice(0, BOMB_PREVIEWS_PER_GYROCOPTER_V7)) {
      const preview = tools.previewBomb(entry.command);
      if (preview === null) continue;
      const value = score(
        entry.command,
        preview.damage,
        preview.kills,
        preview.landingThreat,
      );
      if (value <= 0) continue;
      if (best === null || value > best.value)
        best = {
          command: entry.command,
          value,
          kills: preview.kills,
          damage: preview.damage,
        };
    }
    if (best === null) {
      result.set(gyroId, null);
      continue;
    }
    const target = tools.unit(best.command.targetUnitId);
    const left = target === undefined ? 0 : target.hp - best.damage;
    const setsUp =
      !best.kills &&
      target !== undefined &&
      left > 0 &&
      tools.bestOwnHit(target.id, gyro.id) >= left;
    result.set(gyroId, {
      command: best.command,
      priority: setsUp
        ? BOMB_SETUP_PRIORITY_V7
        : best.kills
          ? BOMB_FINISH_PRIORITY_V7
          : BOMB_PRIORITY_V7,
      strategic:
        best.value +
        (best.kills && target !== undefined ? tools.targetValue(target) : 0),
    });
  }
  return result;
}

/**
 * `ASSEMBLE` (section 15, "Assemble at the front"): an Engineer on a
 * Pressure job, or within 3 of a visible hostile unit, Assembles on the
 * offered tile nearest its target (the job's target, or the nearest visible
 * hostile unit) that is not next to a visible hostile melee unit. Returns
 * the chosen command per Engineer (the others are not candidates).
 */
export function planAssemblesV7(
  tools: DwarfPolicyToolsV7,
): ReadonlyMap<
  UnitId,
  { readonly command: CommandV7; readonly target: CoordV7 } | null
> {
  const { view } = tools;
  const result = new Map<
    UnitId,
    { readonly command: CommandV7; readonly target: CoordV7 } | null
  >();
  const hostiles = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.form === "LAND" && tools.isHostile(unit.ownerId),
  );
  const byEngineer = new Map<
    UnitId,
    Extract<CommandV7, { kind: "ASSEMBLE" }>[]
  >();
  for (const command of tools.commands)
    if (command.kind === "ASSEMBLE") {
      const list = byEngineer.get(command.unitId) ?? [];
      list.push(command);
      byEngineer.set(command.unitId, list);
    }
  for (const [engineerId, offers] of byEngineer) {
    const engineer = tools.unit(engineerId);
    if (engineer === undefined) {
      result.set(engineerId, null);
      continue;
    }
    const assignment = tools.assignment(engineer.id);
    const nearest = [...hostiles].sort(
      (left, right) =>
        chebyshev(left.at, engineer.at) - chebyshev(right.at, engineer.at) ||
        left.id - right.id,
    )[0];
    const front =
      assignment?.job === "ATTACK" ||
      (nearest !== undefined &&
        chebyshev(nearest.at, engineer.at) <= ASSEMBLE_FRONT_RADIUS_V7);
    const target =
      assignment?.job === "ATTACK" ? assignment.at : (nearest?.at ?? null);
    if (!front || target === null) {
      result.set(engineerId, null);
      continue;
    }
    let chosen: Extract<CommandV7, { kind: "ASSEMBLE" }> | null = null;
    for (const command of offers) {
      if (
        hostiles.some(
          (hostile) =>
            meleeUnitV7(view, hostile) &&
            chebyshev(hostile.at, command.to) <= 1,
        )
      )
        continue;
      if (
        chosen === null ||
        chebyshev(command.to, target) < chebyshev(chosen.to, target) ||
        (chebyshev(command.to, target) === chebyshev(chosen.to, target) &&
          (command.to.y < chosen.to.y ||
            (command.to.y === chosen.to.y && command.to.x < chosen.to.x)))
      )
        chosen = command;
    }
    result.set(
      engineerId,
      chosen === null ? null : { command: chosen, target },
    );
  }
  return result;
}

/**
 * Repair (section 15): the HP an own Engineer's `TEND_WOUNDED` restores,
 * machines 4 and others 2 (the public `dwarf.machine` flag), with HP on a
 * construct counting double. `machineHeal` is the HP restored on machines.
 */
export function repairValueV7(
  view: PlayerViewV7,
  facts: DwarfFactsV7,
  engineer: PublicUnitV7,
): { readonly value: number; readonly machineHeal: number } {
  let value = 0;
  let machineHeal = 0;
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.id === engineer.id ||
      unit.form !== "LAND" ||
      unit.hp >= unit.maxHp ||
      unit.activation.tendedThisTurn ||
      chebyshev(unit.at, engineer.at) !== 1
    )
      continue;
    const dwarf = facts.statsById.get(unit.id)?.dwarf;
    const heal = Math.min(
      dwarf?.machine === true ? 4 : 2,
      unit.maxHp - unit.hp,
    );
    value +=
      heal * (dwarf?.construct === true ? CONSTRUCT_REPAIR_FACTOR_V7 : 1);
    if (dwarf?.machine === true) machineHeal += heal;
  }
  return { value, machineHeal };
}

/**
 * The Engineer's Move (section 15, Repair): it ends next to the most
 * wounded own construct when it can (1 per missing HP of the constructs
 * next to `to`) and not next to a visible hostile melee unit (6).
 */
export function engineerMoveValueV7(
  view: PlayerViewV7,
  facts: DwarfFactsV7,
  engineer: PublicUnitV7,
  to: CoordV7,
  isHostile: (ownerId: PlayerId) => boolean,
): number {
  let value = 0;
  for (const unit of view.units) {
    if (unit.id === engineer.id || chebyshev(unit.at, to) !== 1) continue;
    if (unit.ownerId === view.viewer.id) {
      if (facts.statsById.get(unit.id)?.dwarf?.construct === true)
        value += ENGINEER_ESCORT_VALUE_V7 * (unit.maxHp - unit.hp);
    } else if (isHostile(unit.ownerId) && meleeUnitV7(view, unit))
      value -= ENGINEER_EXPOSURE_COST_V7;
  }
  return value;
}

// --- Against the Dwarves --------------------------------------------------

/**
 * Extra target value of a visible hostile Dwarf unit (section 15, "focus
 * the Engineer"; "attack a Gyrocopter that landed next to an own unit"): an
 * Engineer is worth 6 plus 4 for each construct of its owner within 2 of it
 * (at most three); a Gyrocopter next to a unit of the viewer 6. 0 for every
 * other unit, and in a match without a Dwarf seat.
 */
export function dwarfTargetBonusV7(
  view: PlayerViewV7,
  facts: DwarfFactsV7,
  unit: PublicUnitV7,
): number {
  if (
    unit.form !== "LAND" ||
    unit.ownerId === view.viewer.id ||
    !facts.dwarfOwners.has(unit.ownerId)
  )
    return 0;
  const abilities = unitRoleRuleV7(view, unit).abilities;
  if (abilities.includes("ASSEMBLE")) {
    const constructs = view.units.filter(
      (other) =>
        other.ownerId === unit.ownerId &&
        other.id !== unit.id &&
        chebyshev(other.at, unit.at) <= ENGINEER_CONSTRUCT_RADIUS_V7 &&
        facts.statsById.get(other.id)?.dwarf?.construct === true,
    ).length;
    return (
      ENGINEER_TARGET_BONUS_V7 +
      ENGINEER_CONSTRUCT_TARGET_BONUS_V7 * Math.min(3, constructs)
    );
  }
  if (
    abilities.includes("BOMB_RUN") &&
    view.units.some(
      (other) =>
        other.ownerId === view.viewer.id && chebyshev(other.at, unit.at) === 1,
    )
  )
    return LANDED_GYROCOPTER_TARGET_BONUS_V7;
  return 0;
}

export function coordKeyV7(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

export function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
