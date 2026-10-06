import {
  effectiveRoleRuleV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { FactionIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Normal AI army play (tuning 5, `pulp_wars-w49.4`,
 * docs/product/RULESET_7_TUNING_HUMAN.md section 12): field an army and use
 * it. In four hand-played games the policy trained a unit every third turn,
 * bought economy technologies with enemies at its gates, walked its
 * garrison off walled centers, fed single units into pairs, and left its
 * ranged units where they had no shot.
 *
 * The rules (the hooks are in `src/ai/v7.ts`; this file holds the numbers
 * and the composition):
 *
 * - **Alert.** A seat is alert once an enemy city is known or a hostile
 *   land unit is visible within `ARMY_ALERT_RADIUS_V7` of an own center.
 * - **Units first.** While alert, a city with a free unit slot trains
 *   before any research and any construction, and the unit on its center
 *   steps beside it so that the city can train in the same turn (also
 *   with an enemy near: the trained unit takes the center, so a besieged
 *   city gains a defender instead of sitting on its Coins).
 * - **Composition.** What a city trains is the offered (so affordable)
 *   role whose class is furthest below its share of the army
 *   (`ARMY_SHARES_V7`), the dearer role first inside a class; never only
 *   defenders.
 * - **Research toward units.** While alert and a fighting role of the tree
 *   is not unlocked, the cheapest chain to one is researched before any
 *   other technology, and other research waits.
 * - **Combined kills.** Every visible hostile land unit is a target for the
 *   combined kill of `pulp_wars-9s0.8`: the units that can hit it this
 *   turn, moving in first where they must, attack when together they kill
 *   it; unanswered (ranged) hits go first.
 * - **Engage.** A unit that may attack after moving moves to where its
 *   attack is an acceptable exchange (a kill, or clearly more dealt than
 *   taken); a siege unit moves to where it will have a shot next turn and
 *   survives the turn between.
 * - **Approach.** A healthy fighting unit with no errand (a village, a
 *   chest, exploring) walks toward the nearest visible hostile land unit
 *   within `ARMY_APPROACH_RADIUS_V7`; a ranged unit stops at its range.
 * - **Together.** A routine Move does not take a melee unit alone into the
 *   heavy reach of more enemies than it has friends beside it, nor a
 *   ranged, siege, or support unit into lethal reach or into any reach
 *   without a melee unit of its own nearer to the enemy.
 * - **Garrison.** The unit on an own center stays while a hostile land unit
 *   is visible within `ARMY_GARRISON_RADIUS_V7`, except for that step
 *   beside the center; without the Coins for a unit it does not move.
 *
 * It applies to a Human, Undead, or Goblin seat in a match whose every
 * seat is one of those three (the pairings the tuning rounds play): a
 * match with any other faction keeps the policy of that faction's own
 * pass, on both sides. It is off while the seat's naval plan is active (it
 * must cross water to reach anyone) and while the opening growth harvest
 * is due. Everything is read from the public view and the public previews;
 * nothing draws from the PRNG or depends on elapsed time.
 */
export const ARMY_PLAY_FACTIONS_V7: readonly FactionIdV7[] = Object.freeze([
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
]);

export function armyPlayFactionV7(faction: FactionIdV7): boolean {
  return ARMY_PLAY_FACTIONS_V7.includes(faction);
}

/** A hostile land unit this close to an own center puts the seat on alert. */
export const ARMY_ALERT_RADIUS_V7 = 6;
/** The unit on an own center stays while a hostile land unit is this close. */
export const ARMY_GARRISON_RADIUS_V7 = 6;
/** Training while alert: above a city level (1210) and every construction. */
export const ARMY_TRAINING_PRIORITY_V7 = 1215;
/** Stepping off a center so that its city can train: just above training. */
export const ARMY_VACATE_PRIORITY_V7 = 1216;
/** Research toward a fighting role: above the best economic research (1160). */
export const ARMY_RESEARCH_PRIORITY_V7 = 1165;
/** Other research waits while the role chain costs at most this many turns. */
export const ARMY_RESEARCH_HOLD_TURNS_V7 = 4;
/**
 * A combined kill on an ordinary unit: the hunters' Moves and their hits
 * that do not kill yet. Below a direct kill (1180) and the Goblin Kaboom
 * and Gang Up ladders (1177 to 1185), above Pillage (1170).
 */
export const ARMY_HUNT_MOVE_PRIORITY_V7 = 1171;
export const ARMY_HUNT_ATTACK_PRIORITY_V7 = 1172;
/** A Move into an acceptable exchange: above chip attacks (900). */
export const ARMY_ENGAGE_PRIORITY_V7 = 950;
/** A siege unit's Move to a tile with a shot next turn: above routine Moves. */
export const ARMY_FIRING_POSITION_PRIORITY_V7 = 740;
/** A Move toward the nearest visible hostile land unit: a routine Move. */
export const ARMY_APPROACH_PRIORITY_V7 = 720;
/** A unit approaches a hostile land unit within this distance. */
export const ARMY_APPROACH_RADIUS_V7 = 5;
/** Hostile units counted around a destination, and own units beside it. */
export const ARMY_PRESSURE_RADIUS_V7 = 3;
export const ARMY_SUPPORT_RADIUS_V7 = 2;
/** Hunters of one combined kill (the limit of `pulp_wars-9s0.8`). */
export const ARMY_HUNT_REACH_V7 = 6;

// ---------------------------------------------------------------------------
// Tuning 6 (`pulp_wars-w49.6`, docs/product/RULESET_7_TUNING_HUMAN.md
// section 13): numbers break a line. The user's bar: "with overwhelming
// numbers the AI must break through my ranks".
//
// - **Assault.** The visible hostile land units form positions (units
//   within `ARMY_POSITION_LINK_V7` of each other). Each own fighting unit
//   belongs to the position nearest to it within `ARMY_COMING_RADIUS_V7`;
//   it is *near* within `ARMY_NEAR_RADIUS_V7`. Strength is
//   `armyUnitStrengthV7` (4 per Coin of price plus present HP; a hostile
//   unit behind Walls or on a Field Defense counts half as much again, in
//   other cover a quarter).
//   - **Commit**: the near units are worth `ARMY_COMMIT_RATIO_V7` percent
//     of the position (`ARMY_COMMIT_HELD_RATIO_V7` once a unit of theirs is
//     in contact and a unit of the position is wounded, so that an assault
//     is not called off after its first losses), or the units coming are worth that and
//     `ARMY_COMMIT_ARRIVED_V7` percent of them have arrived. A committed
//     unit attacks whenever its attack does not kill it without a kill, the
//     shots from two or more tiles first, then the melee; it moves into
//     contact whatever the reach it enters; and it does not wait for
//     company.
//   - **Stage**: the units coming are worth the ratio but have not
//     arrived: the units near wait outside every visible enemy's reach.
// - **Breakthrough.** A fast unit (Move 2 or more) or a ranged unit prefers
//   a ranged, siege, or support target, and a fast unit that can reach one
//   goes before the melee.
// - **Expansion.** A capturer that can step onto a free village does, and
//   then stays until it has captured it: with fewer than
//   `ARMY_EXPANSION_CITIES_V7` cities before every exchange that is not a
//   kill, and a unit sent to a village turns aside only for a kill.
// - **Economy.** Growth that costs at most `ARMY_CHEAP_GROWTH_COINS_V7` per
//   population, or levels a city now, comes before training while no
//   hostile unit is within `ARMY_NEAR_THREAT_RADIUS_V7` of an own center;
//   other construction comes after training. Within
//   `ARMY_PRESSED_RADIUS_V7` of a center no research and no construction
//   is done while a city could still train.
// - **Research.** The next technology is the first step toward the first
//   unit of the faction's own order (`ARMY_RESEARCH_ROLES_V7`) that the
//   seat cannot train yet: the faction's signature units come first. It
//   is *due* while the seat's city levels are worth more technologies than
//   it owns (`armyResearchDueV7`): then it is bought before training when
//   affordable and no enemy is near, and dearer construction waits for it.
// ---------------------------------------------------------------------------

/** Hostile units this close to each other are one position. */
export const ARMY_POSITION_LINK_V7 = 2;
/** An own unit this close to a position's nearest unit has arrived. */
export const ARMY_NEAR_RADIUS_V7 = 5;
/** An own unit this close to a position is on its way to it. */
export const ARMY_COMING_RADIUS_V7 = 9;
/** Near strength, in percent of the position's, that commits. */
export const ARMY_COMMIT_RATIO_V7 = 150;
/**
 * The same once the battle is joined: an own unit stands next to a unit of
 * the position and a unit of the position is wounded.
 */
export const ARMY_COMMIT_HELD_RATIO_V7 = 100;
/** Share of the coming strength, in percent, that counts as assembled. */
export const ARMY_COMMIT_ARRIVED_V7 = 60;
/** A committed shot from two or more tiles: below a kill (1180). */
export const ARMY_COMMIT_FIRE_PRIORITY_V7 = 1176;
/** A committed ranged unit's Move to a tile with a shot. */
export const ARMY_COMMIT_FIRE_MOVE_PRIORITY_V7 = 1175;
/** A committed melee attack that does not kill. */
export const ARMY_COMMIT_MELEE_PRIORITY_V7 = 1174;
/** A committed melee unit's Move into contact. */
export const ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7 = 1173;
/** A fast unit's Move to a ranged, siege, or support target: first. */
export const ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7 = 1177;
/** A committed unit that cannot attack after moving closes in. */
export const ARMY_COMMIT_ADVANCE_PRIORITY_V7 = 760;
/** Strategic value of a ranged, siege, or support target for a fast unit. */
export const ARMY_FRAGILE_TARGET_VALUE_V7 = 30;
/**
 * A Move onto a free village while the seat expands: above an exchange
 * (950), a chip (900), and Pillage; below a combined kill (1171) and a
 * kill (1180).
 */
export const ARMY_VILLAGE_PRIORITY_V7 = 1170;
/** The same Move once the seat has its cities: above an exchange. */
export const ARMY_LATE_VILLAGE_PRIORITY_V7 = 960;
/** The seat expands first while it owns fewer cities than this. */
export const ARMY_EXPANSION_CITIES_V7 = 3;
/** A hostile unit this close to an own center: units before the economy. */
export const ARMY_NEAR_THREAT_RADIUS_V7 = 4;
/** A hostile unit this close to an own center: nothing but units. */
export const ARMY_PRESSED_RADIUS_V7 = 3;
/** Coins per population of growth that goes before training. */
export const ARMY_CHEAP_GROWTH_COINS_V7 = 2;
/** Cheap growth: above training while alert (1215) and the step aside. */
export const ARMY_GROWTH_PRIORITY_V7 = 1218;
/** The due research, bought before training: above cheap growth. */
export const ARMY_DUE_RESEARCH_PRIORITY_V7 = 1219;
/**
 * Training with two thirds of the unit slots filled and no enemy near:
 * after the growth that adds population (1140), before Roads (1120).
 */
export const ARMY_TOPUP_TRAINING_PRIORITY_V7 = 1135;
/** The army's next technology while it is not due: after that training. */
export const ARMY_UNDUE_RESEARCH_PRIORITY_V7 = 1130;
/** City levels one owned technology beyond the first is worth. */
export const ARMY_LEVELS_PER_TECHNOLOGY_V7 = 2;
/** An attack on a unit standing on an own city center. */
export const ARMY_RETAKE_CENTER_PRIORITY_V7 = 1345;
/** A Move toward the own units by a unit alone among enemies. */
export const ARMY_REGROUP_PRIORITY_V7 = 705;
/** A unit is alone with no own fighting unit this close. */
export const ARMY_ALONE_RADIUS_V7 = 3;
/** A Move next to an own center with an enemy at its gates. */
export const ARMY_RALLY_PRIORITY_V7 = 725;
/** A Move onto a hostile improvement to Pillage it: above an exchange. */
export const ARMY_RAID_PRIORITY_V7 = 955;
/** Hostile ranged units over a center at which a city does not train. */
export const ARMY_COVERED_CENTER_SHOOTERS_V7 = 2;
/** Strategic penalty per own unit next to a tile under a splash attack. */
export const ARMY_SPLASH_SPACING_VALUE_V7 = 6;

/**
 * The order in which a seat researches toward its units, by faction (the
 * correction pass of tuning 6): each faction's signature and best-value
 * units come first.
 *
 * - Humans: the Marksman, the Guard as a cheap anchor, the Catapult, the
 *   Knight, the Swordsman, the Captain.
 * - Undead: the **Zombie** with the first technology bought (its Infect
 *   waves are what the faction is), the Banshee, the Necromancer, the
 *   Lich, the Vampire.
 * - Goblins: the Bomb Chucker and the Wolf Rider, then the Rocket Cart and
 *   the Scrap Buggy, the Orc Brute, the Warboss.
 */
export const ARMY_RESEARCH_ROLES_V7: Readonly<
  Partial<Record<FactionIdV7, readonly UnitRoleIdV7[]>>
> = Object.freeze({
  ORIGINAL: Object.freeze([
    "MARKSMAN",
    "GUARD",
    "CATAPULT",
    "KNIGHT",
    "SWORDSMAN",
    "CAPTAIN",
  ] as const),
  UNDEAD: Object.freeze([
    "GUARD",
    "MARKSMAN",
    "CAPTAIN",
    "CATAPULT",
    "KNIGHT",
  ] as const),
  GOBLIN: Object.freeze([
    "MARKSMAN",
    "RAIDER",
    "CATAPULT",
    "KNIGHT",
    "GUARD",
    "CAPTAIN",
  ] as const),
});

/**
 * Roads: a seat with this many cities researches Roads once it can train
 * the first `ARMY_ROADS_AFTER_ROLES_V7` units of its order (Roads links
 * the cities, and Commerce, which follows the whole order, pays for it).
 */
export const ARMY_ROADS_CITIES_V7 = 3;
export const ARMY_ROADS_AFTER_ROLES_V7 = 2;

/**
 * Whether the next army technology is due: the seat's city levels are
 * worth more technologies than it owns. One technology (the free opener)
 * is always owned; each further one needs
 * `ARMY_LEVELS_PER_TECHNOLOGY_V7` city levels, so research and growth
 * advance together and neither starves the other.
 */
export function armyResearchDueV7(
  cityLevels: number,
  ownedTechnologies: number,
): boolean {
  return (
    cityLevels >=
    ARMY_LEVELS_PER_TECHNOLOGY_V7 * Math.max(0, ownedTechnologies - 1)
  );
}

/** The price a reward unit (no price of its own) counts as. */
export const ARMY_REWARD_UNIT_COST_V7 = 8;

/** What a unit is worth in an assault: 4 per Coin of price plus its HP. */
export function armyUnitStrengthV7(
  rule: EffectiveRoleRuleV7,
  hp: number,
): number {
  return 4 * (rule.cost ?? ARMY_REWARD_UNIT_COST_V7) + hp;
}

export type ArmyAssaultModeV7 = "COMMIT" | "STAGE" | "NONE";

/**
 * Tuning 7 (`pulp_wars-w49.10`): a position is local. The hostile units of
 * one position stand within this many tiles of its seed (the unit of it
 * nearest to an own fighting unit), so that an enemy's whole land is never
 * weighed as one line.
 */
export const ARMY_POSITION_SPAN_V7 = 4;
/**
 * Tuning 7: with this many units for each of the position's (in percent),
 * `ARMY_COMMIT_COUNT_WEIGHT_V7` percent of its weight commits: overwhelming
 * numbers of cheap units are numbers.
 */
export const ARMY_COMMIT_COUNT_RATIO_V7 = 150;
/**
 * Weight, in percent of the position's, that commits with the numbers
 * above: a tenth more, not parity (ten Fighters against five Swordsmen in
 * cover have the numbers and equal weight, and only bleed).
 */
export const ARMY_COMMIT_COUNT_WEIGHT_V7 = 110;

/**
 * The mode of one position from the strengths around it (`contact`: the
 * battle is joined). Tuning 7: with the unit counts given, one and a half
 * times the position's units commit at 110% of its weight, and count as
 * coming in strength.
 */
export function armyAssaultModeV7(facts: {
  readonly hostile: number;
  readonly near: number;
  readonly coming: number;
  readonly contact: boolean;
  readonly hostileUnits?: number;
  readonly nearUnits?: number;
  readonly comingUnits?: number;
}): ArmyAssaultModeV7 {
  if (facts.hostile <= 0 || facts.near <= 0) return "NONE";
  const outnumbers = (own: number | undefined): boolean =>
    own !== undefined &&
    facts.hostileUnits !== undefined &&
    100 * own >= ARMY_COMMIT_COUNT_RATIO_V7 * facts.hostileUnits;
  const ratio = facts.contact
    ? ARMY_COMMIT_HELD_RATIO_V7
    : outnumbers(facts.nearUnits)
      ? ARMY_COMMIT_COUNT_WEIGHT_V7
      : ARMY_COMMIT_RATIO_V7;
  if (100 * facts.near >= ratio * facts.hostile) return "COMMIT";
  if (
    100 * facts.coming < ARMY_COMMIT_RATIO_V7 * facts.hostile &&
    !(
      outnumbers(facts.comingUnits) &&
      100 * facts.coming >= ARMY_COMMIT_COUNT_WEIGHT_V7 * facts.hostile
    )
  )
    return "NONE";
  return 100 * facts.near >= ARMY_COMMIT_ARRIVED_V7 * facts.coming &&
    100 * facts.near >= ARMY_COMMIT_HELD_RATIO_V7 * facts.hostile
    ? "COMMIT"
    : "STAGE";
}

/** The classes the composition counts; a naval or reward role has none. */
export type ArmyClassV7 =
  | "LINE"
  | "DEFENDER"
  | "RANGED"
  | "SIEGE"
  | "BREAKTHROUGH"
  | "SKIRMISHER"
  | "SUPPORT";

export const ARMY_CLASSES_V7: readonly ArmyClassV7[] = Object.freeze([
  "LINE",
  "DEFENDER",
  "RANGED",
  "SIEGE",
  "BREAKTHROUGH",
  "SKIRMISHER",
  "SUPPORT",
]);

export function armyClassV7(rule: EffectiveRoleRuleV7): ArmyClassV7 | null {
  return (ARMY_CLASSES_V7 as readonly string[]).includes(rule.tacticalRole)
    ? (rule.tacticalRole as ArmyClassV7)
    : null;
}

/**
 * The shares of the land army, in percent. `fragile` (two or more visible
 * hostile ranged, siege, or support units): more breakthrough units, which
 * exist to reach them.
 */
export const ARMY_SHARES_V7 = Object.freeze({
  standard: Object.freeze({
    LINE: 35,
    DEFENDER: 15,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 15,
  }),
  fragile: Object.freeze({
    LINE: 30,
    DEFENDER: 10,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 25,
  }),
  // The correction pass of tuning 6: the Undead army is a third Zombies
  // (its defender-class unit, whose kills rise as Zombies), and the Goblin
  // army has more Bomb Chuckers.
  undead: Object.freeze({
    LINE: 20,
    DEFENDER: 30,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 15,
  }),
  undeadFragile: Object.freeze({
    LINE: 20,
    DEFENDER: 25,
    RANGED: 20,
    SIEGE: 15,
    BREAKTHROUGH: 20,
  }),
  goblin: Object.freeze({
    LINE: 30,
    DEFENDER: 10,
    RANGED: 30,
    SIEGE: 15,
    BREAKTHROUGH: 15,
  }),
  goblinFragile: Object.freeze({
    LINE: 25,
    DEFENDER: 10,
    RANGED: 30,
    SIEGE: 15,
    BREAKTHROUGH: 20,
  }),
});

/** The shares of a faction's land army (`fragile`: see above). */
export function armySharesV7(
  faction: FactionIdV7,
  fragile: boolean,
): Readonly<
  Record<"LINE" | "DEFENDER" | "RANGED" | "SIEGE" | "BREAKTHROUGH", number>
> {
  if (faction === "UNDEAD")
    return fragile ? ARMY_SHARES_V7.undeadFragile : ARMY_SHARES_V7.undead;
  if (faction === "GOBLIN")
    return fragile ? ARMY_SHARES_V7.goblinFragile : ARMY_SHARES_V7.goblin;
  return fragile ? ARMY_SHARES_V7.fragile : ARMY_SHARES_V7.standard;
}
/** A Goblin army has one Wolf Rider per this many units (at most three). */
export const ARMY_GOBLIN_SKIRMISHER_PER_UNITS_V7 = 4;
export const ARMY_GOBLIN_SKIRMISHER_MAXIMUM_V7 = 3;
/** One skirmisher once the army has this many units. */
export const ARMY_SKIRMISHER_ARMY_V7 = 5;
/** One support unit per this many army units, at most two. */
export const ARMY_SUPPORT_PER_UNITS_V7 = 4;
export const ARMY_SUPPORT_MAXIMUM_V7 = 2;
/** Visible hostile fragile units that switch the shares. */
export const ARMY_FRAGILE_HOSTILES_V7 = 2;

export interface ArmyCountsV7 {
  /** Own land-form units with a class. */
  readonly total: number;
  readonly byClass: Readonly<Record<ArmyClassV7, number>>;
  /** Visible hostile land units of a ranged, siege, or support class. */
  readonly hostileFragile: number;
}

export function armyCountsV7(
  view: PlayerViewV7,
  isHostile: (unit: PublicUnitV7) => boolean,
): ArmyCountsV7 {
  const byClass: Record<ArmyClassV7, number> = {
    LINE: 0,
    DEFENDER: 0,
    RANGED: 0,
    SIEGE: 0,
    BREAKTHROUGH: 0,
    SKIRMISHER: 0,
    SUPPORT: 0,
  };
  let total = 0;
  let hostileFragile = 0;
  for (const unit of view.units) {
    if (unit.form !== "LAND") continue;
    const unitClass = armyClassV7(unitRoleRuleV7(view, unit));
    if (unitClass === null) continue;
    if (unit.ownerId === view.viewer.id) {
      byClass[unitClass] += 1;
      total += 1;
    } else if (
      isHostile(unit) &&
      (unitClass === "RANGED" ||
        unitClass === "SIEGE" ||
        unitClass === "SUPPORT")
    )
      hostileFragile += 1;
  }
  return { total, byClass, hostileFragile };
}

/**
 * How much the army wants one more unit of `role`, in hundredths of a unit
 * of its class's deficit, plus the role's cost (the dearer role of a class
 * first, and the dearer class on a tie). `threatened`: the city is
 * threatened, so bodies come first and fragile units last.
 */
export function armyRoleScoreV7(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  counts: ArmyCountsV7,
  threatened: boolean,
): number {
  const rule = effectiveRoleRuleV7(role, faction);
  const unitClass = armyClassV7(rule);
  if (unitClass === null || rule.cost === null) return Number.NEGATIVE_INFINITY;
  const after = counts.total + 1;
  const have = counts.byClass[unitClass];
  let deficit: number;
  if (unitClass === "SKIRMISHER")
    deficit =
      100 *
      ((faction === "GOBLIN"
        ? Math.min(
            ARMY_GOBLIN_SKIRMISHER_MAXIMUM_V7,
            Math.floor(counts.total / ARMY_GOBLIN_SKIRMISHER_PER_UNITS_V7),
          )
        : Number(counts.total >= ARMY_SKIRMISHER_ARMY_V7)) -
        have);
  else if (unitClass === "SUPPORT")
    deficit =
      100 *
      (Math.min(
        ARMY_SUPPORT_MAXIMUM_V7,
        Math.floor(counts.total / ARMY_SUPPORT_PER_UNITS_V7),
      ) -
        have);
  else {
    const shares = armySharesV7(
      faction,
      counts.hostileFragile >= ARMY_FRAGILE_HOSTILES_V7,
    );
    deficit = shares[unitClass] * after - 100 * have;
  }
  const defence = !threatened
    ? 0
    : unitClass === "DEFENDER"
      ? 200
      : unitClass === "LINE"
        ? 100
        : unitClass === "SIEGE" || unitClass === "SUPPORT"
          ? -200
          : 0;
  // Tuning 6 (`pulp_wars-w49.6`): a class the army is short of is bought
  // in its dearest unit the Coins reach (`ARMY_DEAR_UNIT_VALUE_V7` per
  // Coin of price), so the top units get a real share of the purchases:
  // the Goblin seat trained nothing dearer than 3 Coins in thirty rounds.
  return (
    deficit +
    defence +
    rule.cost +
    (deficit > 0 ? ARMY_DEAR_UNIT_VALUE_V7 * rule.cost : 0)
  );
}

/** What a Coin of price adds to the score of a role the army is short of. */
export const ARMY_DEAR_UNIT_VALUE_V7 = 20;
