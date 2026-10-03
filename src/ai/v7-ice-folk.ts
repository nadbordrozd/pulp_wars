import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  BOLAS_RANGE_V7,
  COLD_SNAP_RANGE_V7,
  SHATTER_HP_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  technologyCapabilitiesV7,
  unitIsSluggishV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import { policyUnitFactionV7 } from "./v7-martian";

/**
 * The Ice Folk Normal AI (`pulp_wars-7g3.4`,
 * docs/product/RULESET_7_ICE_FOLK.md section 12).
 *
 * Every function reads only the viewer's public view, the offered public
 * commands, and public previews (through the policy). Nothing here draws
 * from the PRNG, reads authoritative state, or depends on elapsed time. The
 * policy calls these helpers only in a match with an Ice Folk seat
 * (`iceFolkMatchForPolicyV7`), or through facts only such a match has (a
 * Chill entry, a Snow or Blizzard tile flag, an Ice Folk unit's ability),
 * so decisions in every other match stay byte-identical.
 *
 * Values are in the policy's usual units: a unit is worth its cost x 4 plus
 * its HP; priorities are the policy's tiers (a kill 1180, a chip 900,
 * routine Moves 600 to 850).
 */

// --- Priorities -----------------------------------------------------------

/**
 * The Witch's Move (rule 2) comes first in the turn, then her Cold Snap
 * (rule 3), then the Bolas that sets up a Shatter: all above every kill
 * (1180 to 1280) and below captures and city-clearing kills (1340 and up).
 */
export const WITCH_MOVE_PRIORITY_V7 = 1296;
export const COLD_SNAP_PRIORITY_V7 = 1295;
export const BOLAS_SHATTER_PRIORITY_V7 = 1293;
/** A Bolas on a hostile unit that can reach an own unit next turn. */
export const BOLAS_SLOW_PRIORITY_V7 = 1186;
/** A non-lethal hit that leaves a Chilled unit for another unit's Shatter. */
export const SHATTER_SETUP_PRIORITY_V7 = 1179;
/**
 * The order of the chips (900): Snow Hunters first, then Mammoths, then the
 * other melee units, then Sleds, so that Cold Blood and Sweep come before
 * the blows that can Shatter.
 */
export const SNOW_HUNTER_CHIP_OFFSET_V7 = 3;
export const MAMMOTH_CHIP_OFFSET_V7 = 2;
export const MELEE_CHIP_OFFSET_V7 = 1;
/** Against the Ice Folk: a kill on the Witch outranks every other kill. */
export const WITCH_KILL_PRIORITY_V7 = 1182;
/** Against the Ice Folk: hits that this turn's attacks turn into her death. */
export const WITCH_FOCUS_RANGED_PRIORITY_V7 = 1179;
export const WITCH_FOCUS_PRIORITY_V7 = 1178;
/**
 * Against the Ice Folk: a unit that only a Shatter kills where it stands
 * steps out of that reach (the Martian shieldless retreat tier).
 */
export const SHATTER_ESCAPE_PRIORITY_V7 = 935;
/** Routine Moves are below this priority. */
export const ICE_ROUTINE_MOVE_PRIORITY_V7 = 1100;

/**
 * Research toward the Witch and the Snow Hunter once the seat owns two
 * cities: the Dinosaur signature priority (above the economic plan).
 */
export const ICE_SIGNATURE_RESEARCH_PRIORITY_V7 = 1170;
/** Deep Winter, Brittle, and the tier-3 roles with an army. */
export const ICE_RESEARCH_PRIORITY_V7 = 1150;
/** The Sled and the Mammoth before the army is there: above the role plan. */
export const ICE_EARLY_RESEARCH_PRIORITY_V7 = 1062;
/** Front units before the tier-3 roles go first. */
export const ICE_LATE_RESEARCH_FRONT_V7 = 5;
export const ICE_SIGNATURE_RESEARCH_CITIES_V7 = 2;

// --- Values ---------------------------------------------------------------

/** Cold Snap: per target that becomes sluggish, and per refreshed target. */
export const COLD_SNAP_FREEZE_VALUE_V7 = 6;
export const COLD_SNAP_REFRESH_VALUE_V7 = 3;
/** A Shatter kill: no Grave, no death blast. */
export const SHATTER_KILL_VALUE_V7 = 4;
/** A Mammoth attack that tramples Field Defense. */
export const TRAMPLE_VALUE_V7 = 8;
/** A Sweep flank hit that leaves a Chilled unit inside the window. */
export const FLANK_SETUP_VALUE_V7 = 6;
/** A Boulder Yeti hit: per fortification level ignored. */
export const BOULDER_FORTIFICATION_VALUE_V7 = 3;
/** A Sabretooth kill on a backline unit, and on an isolated unit. */
export const SABRETOOTH_BACKLINE_VALUE_V7 = 8;
export const SABRETOOTH_ISOLATED_VALUE_V7 = 4;
/**
 * Route tie-breaks: an Ice Folk unit's Move objective (its route progress)
 * is scaled by 8, and these add less than one step, so they decide only at
 * equal progress: within 1 of an own Witch, on Snow, and a Yeti's Rockfall
 * peak.
 */
export const ICE_OBJECTIVE_SCALE_V7 = 8;
export const WITCH_ESCORT_OBJECTIVE_V7 = 4;
export const SNOW_OBJECTIVE_V7 = 2;
export const ROCKFALL_PEAK_OBJECTIVE_V7 = 1;

/** Production: bodies first while the city is threatened. */
export const THREATENED_YETI_BIAS_V7 = 12;
export const THREATENED_SUPPORT_COST_V7 = 30;
/** Production: the Yeti pays less for repetition (5 instead of 8 a unit). */
export const YETI_REPETITION_REFUND_V7 = 3;
/** Production: the first-of-role bias (the Dinosaur first-Triceratops one). */
export const FIRST_OF_ROLE_BIAS_V7 = 10;
/** Production: one Sled for this many front units (from two). */
export const FRONT_UNITS_PER_SLED_V7 = 3;
export const SLED_BIAS_V7 = 6;
/** Production: one Mammoth for this many other front units. */
export const FRONT_UNITS_PER_MAMMOTH_V7 = 2;
export const MAMMOTH_BIAS_V7 = 6;
/** Production: the first Witch at war with three front units, then one per eight. */
export const WITCH_FRONT_V7 = 3;
export const FRONT_UNITS_PER_WITCH_V7 = 8;
export const WITCH_BIAS_V7 = 20;
/** Production: a Boulder Yeti per three and a Sabretooth per six front units. */
export const FRONT_UNITS_PER_BOULDER_V7 = 3;
export const FRONT_UNITS_PER_SABRETOOTH_V7 = 6;
export const BIG_UNIT_BIAS_V7 = 30;
/** Production: a role beyond its need costs this much. */
export const SURPLUS_COST_V7 = 20;

/** Against the Ice Folk: a visible Witch, per own unit within two of her. */
export const WITCH_TARGET_BONUS_V7 = 12;
export const WITCH_NEIGHBOUR_TARGET_BONUS_V7 = 4;
export const WITCH_NEIGHBOUR_RADIUS_V7 = 2;
/** Against the Ice Folk: a visible Sled, and a Mammoth. */
export const SLED_TARGET_BONUS_V7 = 6;
export const MAMMOTH_TARGET_BONUS_V7 = 6;
/** Against the Ice Folk: a fragile unit ending a Move on hostile Snow. */
export const FRAGILE_SNOW_COST_V7 = 3;
/**
 * Against the Ice Folk: a visible Witch reaches this far with Cold Snap next
 * turn (her Glide inside her own Blizzard, then range 2); a Sled with Bolas
 * after its Move.
 */
export const WITCH_CHILL_REACH_V7 = COLD_SNAP_RANGE_V7 + 2;
export const SLED_CHILL_REACH_V7 = BOLAS_RANGE_V7 + 2;

// --- Gate and facts -------------------------------------------------------

/** Whether the match has an Ice Folk seat (the gate of every heuristic). */
export function iceFolkMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "ICE_FOLK");
}

/** Per-view public Ice Folk facts. */
export interface IceFolkFactsV7 {
  readonly viewerIceFolk: boolean;
  /** Public Chill entries of the visible units. */
  readonly chill: ReadonlyMap<
    UnitId,
    { readonly sluggish: boolean; readonly turnsLeft: number }
  >;
  readonly iceOwners: ReadonlySet<PlayerId>;
  /**
   * The Mind Control revision (section 8): visible land-form units of the
   * Ice Folk kind, whoever controls them (a controlled Witch is still a
   * Witch; `policyUnitFactionV7`).
   */
  readonly iceUnitIds: ReadonlySet<UnitId>;
  /** Visible land-form Witches: all, own, and hostile. */
  readonly visibleWitches: readonly PublicUnitV7[];
  readonly ownWitches: readonly PublicUnitV7[];
  readonly hostileWitches: readonly PublicUnitV7[];
  /** Visible hostile land-form Sleds. */
  readonly hostileSleds: readonly PublicUnitV7[];
  /** Visible hostile Ice Folk land units that attack at distance 1. */
  readonly hostileMelee: readonly PublicUnitV7[];
  /** The public Shatter threshold of each Ice Folk seat. */
  readonly thresholdByOwner: ReadonlyMap<PlayerId, number>;
}

export function iceFolkFactsV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): IceFolkFactsV7 {
  const chill = new Map<
    UnitId,
    { readonly sluggish: boolean; readonly turnsLeft: number }
  >();
  for (const entry of view.chilled) chill.set(entry.unitId, entry);
  const iceOwners = new Set<PlayerId>(
    view.players
      .filter((player) => player.faction === "ICE_FOLK")
      .map((player) => player.id),
  );
  const visibleWitches: PublicUnitV7[] = [];
  const ownWitches: PublicUnitV7[] = [];
  const hostileWitches: PublicUnitV7[] = [];
  const hostileSleds: PublicUnitV7[] = [];
  const hostileMelee: PublicUnitV7[] = [];
  const iceUnitIds = new Set<UnitId>();
  for (const unit of view.units) {
    // The Mind Control revision (section 8): by the unit's kind.
    if (unit.form !== "LAND" || policyUnitFactionV7(view, unit) !== "ICE_FOLK")
      continue;
    iceUnitIds.add(unit.id);
    if (unit.hp <= 0) continue;
    const rule = unitRoleRuleV7(view, unit);
    const hostile = isHostile(unit.ownerId);
    if (rule.abilities.includes("COLD_SNAP")) {
      visibleWitches.push(unit);
      if (unit.ownerId === view.viewer.id) ownWitches.push(unit);
      else if (hostile) hostileWitches.push(unit);
    }
    if (!hostile) continue;
    if (rule.abilities.includes("BOLAS")) hostileSleds.push(unit);
    if (
      rule.abilities.includes("ATTACK") &&
      rule.attack2 > 0 &&
      rule.minimumRange <= 1
    )
      hostileMelee.push(unit);
  }
  const thresholdByOwner = new Map<PlayerId, number>();
  if (iceOwners.has(view.viewer.id))
    thresholdByOwner.set(
      view.viewer.id,
      technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
        .shatterThreshold,
    );
  const ownerById = new Map<UnitId, PlayerId>();
  for (const unit of view.units) ownerById.set(unit.id, unit.ownerId);
  for (const stats of view.unitStats) {
    const threshold = stats.iceFolk?.shatterThreshold;
    const ownerId = ownerById.get(stats.unitId);
    if (
      threshold !== undefined &&
      ownerId !== undefined &&
      !thresholdByOwner.has(ownerId)
    )
      thresholdByOwner.set(ownerId, threshold);
  }
  return {
    viewerIceFolk: view.viewer.faction === "ICE_FOLK",
    chill,
    iceOwners,
    iceUnitIds,
    visibleWitches,
    ownWitches,
    hostileWitches,
    hostileSleds,
    hostileMelee,
    thresholdByOwner,
  };
}

export function hasAbilityForIceV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  ability: string,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(view, unit).abilities.includes(ability as never)
  );
}

/**
 * A land-form unit of the Ice Folk kind (the Mind Control revision: a
 * controlled Ice Folk unit too; without one, a unit of an Ice Folk seat).
 */
export function isIceFolkUnitForPolicyV7(
  facts: IceFolkFactsV7,
  unit: PublicUnitV7,
): boolean {
  return unit.form === "LAND" && facts.iceUnitIds.has(unit.id);
}

/** The public Shatter threshold of an Ice Folk seat (3 when unknown). */
export function shatterThresholdForPolicyV7(
  facts: IceFolkFactsV7,
  ownerId: PlayerId,
): number {
  return facts.thresholdByOwner.get(ownerId) ?? SHATTER_HP_V7;
}

/** Chilled now (an entry with at least one turn left). */
export function chilledForPolicyV7(
  facts: IceFolkFactsV7,
  unitId: UnitId,
): boolean {
  return (facts.chill.get(unitId)?.turnsLeft ?? 0) >= 1;
}

/**
 * Whether the viewer's unit can be shattered during the next enemy turn:
 * Chilled through its own End Turn (two turns left), or within the reach of
 * a visible hostile Witch's Cold Snap or Sled's Bolas next turn. Never a
 * `JUGGERNAUT`-role unit, and only in land form.
 */
export function shatterableNextTurnV7(
  view: PlayerViewV7,
  facts: IceFolkFactsV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (unit.form !== "LAND" || unit.role === "JUGGERNAUT") return false;
  if ((facts.chill.get(unit.id)?.turnsLeft ?? 0) >= 2) return true;
  const reach = (source: PublicUnitV7, range: number, extra: number): boolean =>
    chebyshev(source.at, at) <=
    range + (unitIsSluggishV7(view, source) ? 0 : extra);
  return (
    facts.hostileWitches.some((witch) =>
      reach(
        witch,
        COLD_SNAP_RANGE_V7,
        WITCH_CHILL_REACH_V7 - COLD_SNAP_RANGE_V7,
      ),
    ) ||
    facts.hostileSleds.some((sled) =>
      reach(sled, BOLAS_RANGE_V7, SLED_CHILL_REACH_V7 - BOLAS_RANGE_V7),
    )
  );
}

/**
 * Section 12, "count Shatter in every lethal-reach estimate": a unit whose
 * projected damage `total` leaves it at a visible Ice Folk melee unit's
 * Shatter threshold or below, while that unit can reach it and the unit can
 * be shattered next turn, is in lethal reach.
 */
export function shatterLethalV7(
  view: PlayerViewV7,
  facts: IceFolkFactsV7,
  unit: PublicUnitV7,
  at: CoordV7,
  total: number,
  reaches: (hostile: PublicUnitV7) => boolean,
): boolean {
  if (total <= 0 || total >= unit.hp || facts.hostileMelee.length === 0)
    return false;
  const left = unit.hp - total;
  if (left > 4) return false;
  if (!shatterableNextTurnV7(view, facts, unit, at)) return false;
  return facts.hostileMelee.some(
    (hostile) =>
      left <= shatterThresholdForPolicyV7(facts, hostile.ownerId) &&
      reaches(hostile),
  );
}

// --- Production -----------------------------------------------------------

export interface IceFolkArmyCountsV7 {
  readonly byRole: ReadonlyMap<UnitRoleIdV7, number>;
  /** Yetis, Snow Hunters, Mammoths, Boulder Yetis, Sabretooths, Giants. */
  readonly front: number;
}

export function iceFolkArmyCountsV7(view: PlayerViewV7): IceFolkArmyCountsV7 {
  const byRole = new Map<UnitRoleIdV7, number>();
  let front = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.form === "NAVAL") continue;
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
  }
  return { byRole, front };
}

/**
 * The Ice Folk production adjustment of one role, added to the policy's
 * role value (HP, first-of-role, cost, and repetition terms) in the
 * preferred role and in the city-action utility (section 12, "produce every
 * role"; "train bodies first under threat"):
 *
 * - the Sled, the Mammoth, the Witch, the Snow Hunter, the Boulder Yeti, and
 *   the Sabretooth gain 10 as the first of their role;
 * - in a threatened city the Yeti gains 12, and the Sled and the Witch are
 *   worth -30 whatever else they would gain (bodies first);
 * - the Yeti's repetition costs 5 a unit instead of 8 (bodies; in the
 *   preferred role only, which is where the repetition cost applies);
 * - a Sled gains 6 while there are fewer than one per three front units
 *   (and at least two), otherwise it costs 20: it is the cheap Chill;
 * - a Mammoth gains 6 while there are fewer than one per two other front
 *   units, otherwise it costs 20: it marches with every wave;
 * - the Witch gains 20 at war with three front units and no Witch, and a
 *   second one with eight per Witch; otherwise she costs 20;
 * - a Boulder Yeti (one per three front units) and a Sabretooth (one per
 *   six) gain 30 when offered, so they are bought when affordable.
 */
export function iceFolkProductionAdjustmentV7(
  view: PlayerViewV7,
  role: UnitRoleIdV7,
  counts: IceFolkArmyCountsV7,
  threatened: boolean,
  atWar: boolean,
  repetition: boolean,
): number {
  if (view.viewer.faction !== "ICE_FOLK") return 0;
  const owned = counts.byRole.get(role) ?? 0;
  const front = counts.front;
  let value =
    owned === 0 &&
    role !== "FIGHTER" &&
    role !== "JUGGERNAUT" &&
    role !== "PATROL_BOAT" &&
    role !== "BATTLESHIP"
      ? FIRST_OF_ROLE_BIAS_V7
      : 0;
  switch (role) {
    case "FIGHTER":
      if (repetition) value += YETI_REPETITION_REFUND_V7 * owned;
      if (threatened) value += THREATENED_YETI_BIAS_V7;
      break;
    case "RAIDER":
      if (threatened) return -THREATENED_SUPPORT_COST_V7;
      value +=
        front >= 2 && owned * FRONT_UNITS_PER_SLED_V7 < front
          ? SLED_BIAS_V7
          : -SURPLUS_COST_V7;
      break;
    case "GUARD": {
      const others = front - owned;
      value +=
        owned * FRONT_UNITS_PER_MAMMOTH_V7 < Math.max(2, others)
          ? MAMMOTH_BIAS_V7
          : -SURPLUS_COST_V7;
      break;
    }
    case "CAPTAIN":
      if (threatened) return -THREATENED_SUPPORT_COST_V7;
      value +=
        atWar &&
        front >= WITCH_FRONT_V7 &&
        (owned === 0 || owned * FRONT_UNITS_PER_WITCH_V7 <= front)
          ? WITCH_BIAS_V7
          : -SURPLUS_COST_V7;
      break;
    case "CATAPULT":
      if (owned * FRONT_UNITS_PER_BOULDER_V7 <= front)
        value += BIG_UNIT_BIAS_V7;
      break;
    case "KNIGHT":
      if (owned * FRONT_UNITS_PER_SABRETOOTH_V7 <= front)
        value += BIG_UNIT_BIAS_V7;
      break;
    default:
      break;
  }
  return value;
}

// --- Research -------------------------------------------------------------

/**
 * Ice Folk research (section 12, "research toward its roles"): Drill and
 * Scouting while the role plan is the alternative (the Mammoth and the
 * Sled); with two cities Administration and Marksmanship at the Dinosaur
 * signature priority; Deep Winter once it owns two cities or has a wounded
 * unit at home; Brittle when it owns a Chill source and Deep Winter; then
 * Sawmilling and Chivalry (the shorter chain first). Returns the next
 * technology to research and its tier, or null.
 */
export function iceFolkResearchV7(
  view: PlayerViewV7,
  ownedCities: number,
  front: number,
  woundedAtHome: boolean,
): {
  readonly tech: TechnologyIdV7;
  readonly priority: number;
  readonly strategic: number;
} | null {
  if (view.viewer.faction !== "ICE_FOLK") return null;
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
    kind: string,
    priority: number,
    strategic: number,
  ): {
    readonly tech: TechnologyIdV7;
    readonly priority: number;
    readonly strategic: number;
  } | null => {
    const target = withUnlock(kind);
    const first = target === null ? undefined : chainTo(target)[0];
    return first === undefined ? null : { tech: first, priority, strategic };
  };
  const early = pick(["GUARD", "RAIDER"], ICE_EARLY_RESEARCH_PRIORITY_V7);
  if (early !== null) return early;
  if (ownedCities >= ICE_SIGNATURE_RESEARCH_CITIES_V7) {
    const signature = pick(
      ["CAPTAIN", "MARKSMAN"],
      ICE_SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    if (signature !== null) return signature;
  }
  const deepWinter = owned.has(withUnlock("DEEP_WINTER") ?? "FORTIFICATION");
  if (
    !deepWinter &&
    (ownedCities >= ICE_SIGNATURE_RESEARCH_CITIES_V7 || woundedAtHome)
  )
    return towards("DEEP_WINTER", ICE_RESEARCH_PRIORITY_V7, 12);
  const chillSource = view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unitRoleRuleV7(view, unit).abilities.some(
        (ability) =>
          ability === "BOLAS" ||
          ability === "COLD_SNAP" ||
          ability === "COLD_AURA",
      ),
  );
  if (deepWinter && chillSource) {
    const brittle = towards("BRITTLE", ICE_RESEARCH_PRIORITY_V7, 10);
    if (brittle !== null) return brittle;
  }
  if (ownedCities < ICE_SIGNATURE_RESEARCH_CITIES_V7) return null;
  return pick(
    ["CATAPULT", "KNIGHT"],
    front >= ICE_LATE_RESEARCH_FRONT_V7
      ? ICE_RESEARCH_PRIORITY_V7
      : ICE_EARLY_RESEARCH_PRIORITY_V7,
  );
}

// --- Commands -------------------------------------------------------------

export interface IceFolkScoreV7 {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
}

const NOT_A_CANDIDATE_V7: IceFolkScoreV7 = Object.freeze({
  priority: -1,
  strategic: 0,
  immediate: 0,
});

/** What the policy provides to the Ice Folk scoring helpers. */
export interface IceFolkPolicyToolsV7 {
  readonly view: PlayerViewV7;
  readonly facts: IceFolkFactsV7;
  readonly commands: readonly CommandV7[];
  isHostile(ownerId: PlayerId): boolean;
  unit(unitId: UnitId): PublicUnitV7 | undefined;
  targetValue(unit: PublicUnitV7): number;
  /** Projected damage of a visible hostile unit on an own unit where it stands. */
  projectedDamage(attacker: PublicUnitV7, defender: PublicUnitV7): number;
  /** The tiles a visible hostile unit can attack next turn. */
  threatens(hostile: PublicUnitV7, at: CoordV7): boolean;
  /**
   * Own units other than `throwerId` whose offered attack on `targetId`
   * shatters it once Chilled (`previewBolasV7.shatterSetups`).
   */
  shatterSetups(targetId: UnitId, throwerId: UnitId): readonly UnitId[];
}

/**
 * `COLD_SNAP` (rule 3): whenever it is offered, first in the turn; worth
 * each target, a new freeze (sluggish) more than a refresh.
 */
export function coldSnapScoreV7(
  tools: IceFolkPolicyToolsV7,
  command: Extract<CommandV7, { kind: "COLD_SNAP" }>,
): IceFolkScoreV7 {
  const witch = tools.unit(command.unitId);
  if (witch === undefined) return NOT_A_CANDIDATE_V7;
  let strategic = 0;
  let targets = 0;
  for (const unit of tools.view.units) {
    if (
      unit.id === witch.id ||
      unit.form !== "LAND" ||
      unit.hp <= 0 ||
      !tools.isHostile(unit.ownerId) ||
      chebyshev(unit.at, witch.at) > COLD_SNAP_RANGE_V7
    )
      continue;
    targets += 1;
    strategic += tools.facts.chill.has(unit.id)
      ? COLD_SNAP_REFRESH_VALUE_V7
      : COLD_SNAP_FREEZE_VALUE_V7;
  }
  if (targets === 0) return NOT_A_CANDIDATE_V7;
  return { priority: COLD_SNAP_PRIORITY_V7, strategic, immediate: targets };
}

/**
 * `THROW_BOLAS` (section 12, the Bolas rule): on the visible hostile unit
 * that some own unit's offered attack would shatter once Chilled, the most
 * valuable first (1293); else on the hostile unit not yet Chilled that can
 * reach and attack an own unit next turn, the highest projected damage first
 * (1186), unless the Sled can kill something itself; else none. Never on a
 * unit that is Chilled already or that an own Witch's offered Cold Snap
 * covers this turn.
 */
export function bolasScoreV7(
  tools: IceFolkPolicyToolsV7,
  command: Extract<CommandV7, { kind: "THROW_BOLAS" }>,
  sledKills: boolean,
): IceFolkScoreV7 {
  const { view, facts } = tools;
  const target = tools.unit(command.targetUnitId);
  if (target === undefined || chilledForPolicyV7(facts, target.id))
    return NOT_A_CANDIDATE_V7;
  const covered = tools.commands.some((offered) => {
    if (offered.kind !== "COLD_SNAP") return false;
    const witch = tools.unit(offered.unitId);
    return (
      witch !== undefined &&
      chebyshev(witch.at, target.at) <= COLD_SNAP_RANGE_V7
    );
  });
  if (covered) return NOT_A_CANDIDATE_V7;
  const setups = tools.shatterSetups(target.id, command.unitId);
  if (setups.length > 0)
    return {
      priority: BOLAS_SHATTER_PRIORITY_V7,
      strategic: tools.targetValue(target) + 2 * setups.length,
      immediate: 0,
    };
  if (sledKills) return NOT_A_CANDIDATE_V7;
  let worst = 0;
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      !tools.threatens(target, unit.at)
    )
      continue;
    worst = Math.max(worst, tools.projectedDamage(target, unit));
  }
  if (worst <= 0) return NOT_A_CANDIDATE_V7;
  return {
    priority: BOLAS_SLOW_PRIORITY_V7,
    strategic: worst,
    immediate: 0,
  };
}

/**
 * The Witch's Move key (rule 2, ordered best first): not into visible
 * lethal reach; the most own land units other than Witches within 1; not
 * adjacent to a visible hostile unit; the most hostile land units within
 * Cold Snap range (so that she does not step away from her targets for a
 * tie); the route progress toward the wave's target; the least visible
 * danger.
 */
export function witchMoveKeyV7(
  view: PlayerViewV7,
  witch: PublicUnitV7,
  to: CoordV7,
  danger: number,
  routeProgress: number,
  isHostile: (ownerId: PlayerId) => boolean,
): readonly number[] {
  let escort = 0;
  let adjacentHostile = false;
  let targets = 0;
  for (const unit of view.units) {
    if (unit.id === witch.id || unit.form !== "LAND" || unit.hp <= 0) continue;
    const range = chebyshev(unit.at, to);
    if (
      range <= COLD_SNAP_RANGE_V7 &&
      unit.ownerId !== view.viewer.id &&
      isHostile(unit.ownerId)
    )
      targets += 1;
    if (range > 1) continue;
    if (unit.ownerId === view.viewer.id) {
      if (
        range === 1 &&
        !unitRoleRuleV7(view, unit).abilities.includes("COLD_SNAP")
      )
        escort += 1;
    } else if (isHostile(unit.ownerId)) adjacentHostile = true;
  }
  return [
    danger >= witch.hp ? 0 : 1,
    escort,
    adjacentHostile ? 0 : 1,
    targets,
    routeProgress,
    -danger,
  ];
}

export function compareKeysV7(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// --- Against the Ice Folk -------------------------------------------------

/**
 * Extra target value of a visible hostile Ice Folk unit (section 12, "focus
 * the Witch and the Sled"; the Necromancer precedent): a Witch is worth 12
 * plus 4 for every own unit within two tiles of her (at most four), a Sled
 * 6 plus 4 when an own unit is within two tiles of it, and a Mammoth 6. 0
 * for every other unit, and in a match without an Ice Folk seat.
 */
export function iceFolkTargetBonusV7(
  view: PlayerViewV7,
  facts: IceFolkFactsV7,
  unit: PublicUnitV7,
): number {
  if (
    unit.form !== "LAND" ||
    unit.ownerId === view.viewer.id ||
    !facts.iceUnitIds.has(unit.id)
  )
    return 0;
  const abilities = unitRoleRuleV7(view, unit).abilities;
  const near = (): number =>
    view.units.filter(
      (other) =>
        other.ownerId === view.viewer.id &&
        other.form === "LAND" &&
        other.role !== "JUGGERNAUT" &&
        chebyshev(other.at, unit.at) <= WITCH_NEIGHBOUR_RADIUS_V7,
    ).length;
  if (abilities.includes("COLD_SNAP"))
    return (
      WITCH_TARGET_BONUS_V7 +
      WITCH_NEIGHBOUR_TARGET_BONUS_V7 * Math.min(4, near())
    );
  if (abilities.includes("BOLAS"))
    return (
      SLED_TARGET_BONUS_V7 + (near() > 0 ? WITCH_NEIGHBOUR_TARGET_BONUS_V7 : 0)
    );
  if (abilities.includes("SWEEP")) return MAMMOTH_TARGET_BONUS_V7;
  return 0;
}

/** A unit the policy keeps out of hostile Snow when it can (fragile). */
export function fragileOnSnowV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  if (unit.form !== "LAND") return false;
  const role = unitRoleRuleV7(view, unit).tacticalRole;
  return (
    role === "RANGED" ||
    role === "SIEGE" ||
    role === "SUPPORT" ||
    unit.hp * 2 < unit.maxHp
  );
}

export function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
