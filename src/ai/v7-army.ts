import {
  effectiveRoleRuleV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type {
  FactionIdV7,
  TechnologyIdV7,
  UnitRoleIdV7,
} from "../engine/v7/types";
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
 * It applies to a Human, Undead, Goblin, (the Martian pass,
 * `pulp_wars-w49.14`) Martian, or (the Dinosaur pass, `pulp_wars-w49.15`)
 * Dinosaur seat in a match whose every seat is one of those five (the
 * pairings the tuning rounds play): a match with any other faction keeps
 * the policy of that faction's own pass, on both sides. It is off while the seat's naval plan is active (it
 * must cross water to reach anyone) and while the opening growth harvest
 * is due. Everything is read from the public view and the public previews;
 * nothing draws from the PRNG or depends on elapsed time.
 */
export const ARMY_PLAY_FACTIONS_V7: readonly FactionIdV7[] = Object.freeze([
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "MARTIAN",
  "DINOSAUR",
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
 *   waves are what the faction is), the Banshee, the Lich (third since the
 *   Undead pass, `pulp_wars-w49.13`), the Necromancer, the Vampire.
 * - Goblins (the Goblin pass, `pulp_wars-w49.12`,
 *   docs/product/RULESET_7_TUNING_GOBLIN.md): the Bomb Chucker and the Wolf
 *   Rider, the Orc Brute (the correction pass: the one Goblin unit a
 *   Knight does not kill in one attack, so it ends an Overrun chain; with
 *   Drill last the first Brute came in round 20), then the Rocket Cart (the
 *   one ranged unit with Gang Up), the Warboss (WAAAGH! is the only thing
 *   that strengthens a bomb), and the Scrap Buggy.
 * - Humans, since the same correction: the Swordsman third (one technology
 *   after the Guard's; in a hand-played game the Human seat had seven
 *   technologies in 25 rounds, two of them toward a Catapult it never
 *   bought, and fielded Fighters, Guards, and Marksmen).
 *
 * The ninth unit (`pulp_wars-w49.17`, 7r55,
 * docs/product/RULESET_7_NINTH_UNIT.md): every faction's heavy line unit
 * (the `SWORDSMAN` role) is at Metallurgy, two technologies behind the
 * defender's Drill, with Engineering (Mines and Workshops: a growth
 * technology) on the way. A first pass, not tuned:
 *
 * - Humans: unchanged in order (the Champion third); its chain is one
 *   technology longer (Drill, Engineering, Metallurgy).
 * - Goblins: the Ogre after the Warboss and before the Scrap Buggy (third,
 *   behind the Wolf Rider, since step two of the Goblin pass, below).
 * - Undead: the Wight after the Necromancer and before the Vampire.
 * - Martians: the Shock Trooper after the Ray Gunner and before the Tripod.
 * - Dinosaurs: the Triceratops second, as before, by its new chain; the
 *   Stegosaurus (Sawmilling, the Triceratops's old chain) after the Spitter.
 *
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56,
 * docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): the defender of every
 * faction (the `GUARD` role) is at Fortification, one technology behind
 * the root of Industry (shown as "Crafting": Ore, the Workshop, Spoils),
 * and the heavy is on the other sub-branch (the root, Engineering,
 * Metallurgy). No order changed: a chain is read from the tree, so every
 * seat buys the root and then Fortification where its order names the
 * defender (first for an Undead, Martian, or Dinosaur seat; second for a
 * Human seat; third for a Goblin seat). "Drill" in the notes above and
 * below is that root. What the policy does about the longer chain
 * (`src/ai/v7.ts`): the root does not count against the research tempo
 * (`armyTempoTechnologiesV7`); a seat whose order begins with its defender
 * buys Fortification before its units and keeps the Coins for it
 * (`armyDefenderResearchV7`); the root alone is no population technology
 * for "economy first"; and a seat that keeps Coins for a due technology
 * builds no Field Defense (`armyFieldDefenseHeldV7`). The rules that
 * research Force Fields once a Shield Projector is fielded and Nesting
 * once an Ankylosaurus is (below) now find the technology owned, since the
 * unit is trained with it; they still apply to a seat that fields one
 * without it (a unit it was given).
 */
export const ARMY_RESEARCH_ROLES_V7: Readonly<
  Partial<Record<FactionIdV7, readonly UnitRoleIdV7[]>>
> = Object.freeze({
  ORIGINAL: Object.freeze([
    "MARKSMAN",
    "GUARD",
    "SWORDSMAN",
    "CATAPULT",
    "KNIGHT",
    "CAPTAIN",
  ] as const),
  // The Undead pass (`pulp_wars-w49.13`,
  // docs/product/RULESET_7_TUNING_UNDEAD.md): the Lich third (it was
  // fourth, behind the Necromancer): the Zombie, the 3-Coin Banshee, then
  // the unit that wins the faction's fights; the Necromancer once there are
  // Graves to raise, the Vampire last.
  UNDEAD: Object.freeze([
    "GUARD",
    "MARKSMAN",
    "CATAPULT",
    "CAPTAIN",
    // The ninth unit (7r55): the Wight.
    "SWORDSMAN",
    "KNIGHT",
  ] as const),
  // Step two of the Goblin pass (`pulp_wars-w49.23`,
  // docs/product/RULESET_7_TUNING_GOBLIN.md section 14): the Ogre third
  // (it was sixth, behind the Warboss) and the Orc Brute behind it. The
  // Ogre's chain is the root, Engineering, and Armoury: Mines and the
  // Workshop on the way (a Goblin seat boxed in by Mountains stood on three
  // cities of level 1 and 2 for twenty rounds with no growth technology but
  // its opening harvest), and Fortification is then one step from the root.
  // A seat reached Armoury in round 21 to 27 with the Ogre sixth. The Orc
  // Brute comes first whenever Knights or Raiders are in sight
  // (`armyBlockerV7` in `src/ai/v7.ts`).
  GOBLIN: Object.freeze([
    "MARKSMAN",
    "RAIDER",
    // The ninth unit (7r55): the Ogre.
    "SWORDSMAN",
    "GUARD",
    "CATAPULT",
    "CAPTAIN",
    "KNIGHT",
  ] as const),
  // The Martian pass (`pulp_wars-w49.14`,
  // docs/product/RULESET_7_TUNING_MARTIAN.md section 8): the Shield
  // Projector (Drill, one technology: the one Martian unit a Knight does
  // not kill in one attack, so it ends an Overrun chain, and the garrison),
  // then one growth technology (economy first, as for the Undead), the Ray
  // Gunner (the kill of a 10-HP unit from two tiles), the Tripod, the
  // Brain, the Saucer (one comes free with Scouts), the Mothership. Force
  // Fields is researched once a Projector is fielded and Heat Sinks once
  // two Ray Gunners are (`armyResearchTargetV7`). (With the Saucer second
  // a seat owned six technologies in thirty rounds, none of them toward a
  // Tripod, and lost three Saucers for two pulls.)
  // Step two of the Martian pass (`pulp_wars-w49.25`,
  // docs/product/RULESET_7_TUNING_MARTIAN.md section 14): the Brain third
  // (it was fifth). Its Leadership is one technology behind the Gathering
  // most seats open with, where the Shock Trooper and the Tripod are two
  // each, and it is Psychic Command for the firing line and Mind Control.
  // (A seat with the Shock Trooper third bought Engineering in round 16 and
  // Armoury in round 24 of two diagnostic matches, and fielded no Tripod,
  // no Brain, and no Mothership in 25 rounds.) The Tripod comes before the
  // Shock Trooper unless the enemy in sight fights hand to hand
  // (`armyMartianResearchRolesV7` in `src/ai/v7.ts`), and Heat Sinks right
  // after the second Ray Gunner (it was before the Mothership, the last
  // unit, which no seat reached).
  MARTIAN: Object.freeze([
    "GUARD",
    "MARKSMAN",
    "CAPTAIN",
    // The ninth unit (7r55): the Shock Trooper, the body in front of the
    // rays (through Engineering, a growth technology).
    "SWORDSMAN",
    "CATAPULT",
    "RAIDER",
    "KNIGHT",
  ] as const),
  // The Dinosaur pass (`pulp_wars-w49.15`,
  // docs/product/RULESET_7_TUNING_DINOSAUR.md section 8): the Ankylosaurus
  // (Drill, one technology: the garrison, and the unit a Knight's hit does
  // not kill, so it ends an Overrun chain), then one growth technology
  // (economy first), the Triceratops (Hunting, Forestry, Sawmilling: the
  // line; Forestry is also a growth technology), the Raptor (one comes free
  // with Scouts), the Spitter, the Shaman, the T-Rex. Nesting is researched
  // once an Ankylosaurus is fielded and Wallbreaker once two Triceratops
  // are (`armyResearchTargetV7`).
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Triceratops is the
  // heavy line role now (Drill, Engineering, Metallurgy) and keeps its
  // place in the order; the Stegosaurus (the `CATAPULT` role, at
  // Sawmilling) comes after the Spitter.
  // Step two of the Dinosaur pass (`pulp_wars-w49.26`,
  // docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): the Spitter and
  // the Raptor before the Triceratops (it was second). The Triceratops is
  // two dear technologies behind the root (Engineering and Armoury: 30 to
  // 40 Coins on four cities), and with it second a seat fielded Cavemen and
  // Ankylosauruses only until round 21 of a diagnostic match and for all
  // eighteen rounds of a hand-played game: an army that cannot attack (an
  // Ankylosaurus does not move and strike). The Spitter is Hunting and one
  // technology, the Raptor one technology, and both hatch in a turn.
  DINOSAUR: Object.freeze([
    "GUARD",
    "MARKSMAN",
    "RAIDER",
    "SWORDSMAN",
    "CATAPULT",
    "CAPTAIN",
    "KNIGHT",
  ] as const),
});

/**
 * The ninth unit (7r55): the role of a Dinosaur seat's Triceratops (the
 * unit with Charge!), which the Nesting, Wallbreaker, and Planning rules of
 * `armyResearchTargetV7` name. It was `CATAPULT` until 7r54.
 */
export const ARMY_DINOSAUR_CHARGER_ROLE_V7 = "SWORDSMAN" as const;

/**
 * The Dinosaur pass (`pulp_wars-w49.15`). A Dinosaur seat with this many
 * Ankylosauruses researches Nesting (a unit slot in every city, and Eggs
 * with 10 HP) before the Triceratops's technologies; one
 * with this many Triceratops researches Wallbreaker (the second tile of
 * the run-up) before the T-Rex's.
 */
export const ARMY_NESTING_DEFENDERS_V7 = 1;
export const ARMY_WALLBREAKER_CHARGERS_V7 = 2;
/**
 * The Dinosaur pass: a Dinosaur seat is crowded when it fields this many
 * units and no city of it has room for a unit of two slots. It then
 * researches its slot technologies, Nesting and, once it can lay the
 * Triceratops, Planning (through Administration), like the growth
 * technology of a seat at its unit limit:
 * unit slots are what a Dinosaur army runs out of. (In the first diagnostic
 * lab match the seat stood at its limit from round 6 with 20 to 48 Coins
 * in hand, researched Nesting in round 7, and never Planning.)
 */
export const ARMY_DINOSAUR_CROWDED_UNITS_V7 = 4;
export const ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7 = 2;
/**
 * The Dinosaur pass, correction (after three hand-played games; a Human
 * player met thirteen Ankylosauruses that made three kills between them,
 * laid by a seat with 0 to 2 Coins left on 24 of 30 turns). A Dinosaur
 * seat's Ankylosauruses are capped: no more than a third of the army
 * (`armyDinosaurDefenderCappedV7`), never more than the other units they
 * screen, and no more than `ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7` while the
 * seat can still buy growth or has a growth technology to research. A
 * capped Ankylosaurus costs `ARMY_DINOSAUR_DEFENDER_CAP_COST_V7` of
 * training score, more than the garrison bonus of a threatened center.
 */
export const ARMY_DINOSAUR_DEFENDER_CAP_COST_V7 = 600;
export const ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7 = 7;
export function armyDinosaurDefenderCappedV7(counts: ArmyCountsV7): boolean {
  const have = counts.byClass.DEFENDER;
  const screened = counts.total - have;
  return (
    have >= 1 && (have >= Math.ceil((counts.total + 1) / 3) || have >= screened)
  );
}
/**
 * The correction: a Dinosaur seat's unit on an own center stays there
 * while a visible hostile unit that moves two tiles or more, or rides on
 * after a kill, is within this many tiles of the center (the seat walked
 * its Ankylosauruses off a city and off its walled capital, and one Knight
 * took six units in a turn).
 */
export const ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7 = 4;
/**
 * The correction: a Triceratops commits (a Move into contact, an attack)
 * with support only: another own Triceratops or T-Rex that has charged
 * this turn or can still reach the target (within
 * `ARMY_DINOSAUR_CHARGER_REACH_V7` tiles of it), or
 * `ARMY_DINOSAUR_PACK_CAVEMEN_V7` own Cavemen within
 * `ARMY_DINOSAUR_PACK_REACH_V7` tiles of the target (Pack Hunt). Without
 * it, it still attacks a target within `ARMY_DINOSAUR_DEFENCE_RADIUS_V7`
 * tiles of an own center, or one with no other hostile unit within
 * `ARMY_DINOSAUR_ALONE_RADIUS_V7` tiles. (Each Triceratops of the seat
 * charged alone and was killed the turn after: 8 Coins for a 2-Coin
 * Fighter.)
 */
export const ARMY_DINOSAUR_CHARGER_REACH_V7 = 3;
export const ARMY_DINOSAUR_PACK_CAVEMEN_V7 = 2;
export const ARMY_DINOSAUR_PACK_REACH_V7 = 2;
export const ARMY_DINOSAUR_DEFENCE_RADIUS_V7 = 2;
export const ARMY_DINOSAUR_ALONE_RADIUS_V7 = 2;
/**
 * The Dinosaur pass: a Dinosaur unit whose maximum HP is below this is a
 * weak link of a kill chain at any HP: a Human Knight's hit (12 on a
 * Caveman, 14 on a Raptor, a Spitter, or a Shaman) kills a Caveman, a
 * Shaman, a Raptor that has not grown, and a Spitter below Alpha, and rides
 * on. An Ankylosaurus, a Triceratops, a T-Rex, a Brontosaurus, and a grown
 * Raptor are not.
 */
export const ARMY_DINOSAUR_STURDY_V7 = 15;
/** A Dinosaur army has one Raptor per this many units (at most three). */
export const ARMY_DINOSAUR_SKIRMISHER_PER_UNITS_V7 = 4;
export const ARMY_DINOSAUR_SKIRMISHER_MAXIMUM_V7 = 3;

/**
 * The Martian pass: an army seat's Martian shooter next to a hostile melee
 * unit steps back to two tiles before it shoots (the Grunt's and the
 * Tripod's step back, a Cooling ray unit's): above a committed melee attack
 * (1174) and with a committed ranged unit's Move to a shot (1175), below
 * every kill (1180).
 */
export const ARMY_STEP_BACK_PRIORITY_V7 = 1175;
/**
 * The Martian pass: an army seat's Saucer that stands in the reach of
 * visible enemies flies to a tile where it takes less: below an extraction
 * (890) and a shot on arrival (906), above the delivery by route (865) and
 * every routine Move. Its Recover in such a reach waits (it recovered two
 * tiles from two Marksmen and died there).
 */
export const ARMY_CARRIER_KEEP_OUT_PRIORITY_V7 = 880;
/**
 * The Martian pass: a Martian unit whose HP and Shield maximum together are
 * below this is a weak link of a kill chain at any HP: a Human Knight's
 * hit (13 on a Grunt, 14 on a Ray Gunner, a Brain, a Saucer, or a Tripod)
 * kills it through its Shield and rides on. A Shield Projector (12 and 3)
 * and a Mothership (16 and 4) are not. (Knights rode on twenty-seven times
 * in fourteen rounds through Martian units that stood side by side.)
 */
export const ARMY_MARTIAN_STURDY_V7 = 15;
/**
 * The Martian pass, correction (`pulp_wars-w49.14`, section 13 of
 * docs/product/RULESET_7_TUNING_MARTIAN.md).
 *
 * `ARMY_KNIGHT_SHY_MAXIMUM_V7`: a Martian unit a unit with Overrun kills in
 * one attack makes no Move of a lower priority (everything but a kill)
 * into such a unit's reach, and steps out of it at
 * `ARMY_STEP_BACK_PRIORITY_V7`. A unit that will stand in a Force Field at
 * full HP is not such a unit (the field holds).
 *
 * `ARMY_VILLAGE_DELIVERY_PRIORITY_V7`: a Saucer's Beam Down of a unit that
 * captures to a tile beside a free village (just below the step onto the
 * village, 1170). `ARMY_VILLAGE_FERRY_PRIORITY_V7`: the Saucer's Move to a
 * tile beside that village, above the delivery by route (865).
 * `ARMY_VILLAGE_DELIVERY_GAIN_V7`: the tiles the passenger must gain.
 *
 * `ARMY_EMPTY_CENTER_PRIORITY_V7`: a capturer's Move toward a hostile city
 * center no unit stands on, within `ARMY_RETAKE_RADIUS_V7`.
 *
 * `ARMY_RANGED_ENEMY_UNITS_V7`: with this many visible hostile land units,
 * most of them shooting from two tiles or more, a seat trains no unit that
 * is open to ranged attacks (the Human Guard) while it can train another.
 */
export const ARMY_KNIGHT_SHY_MAXIMUM_V7 = 1179;
export const ARMY_VILLAGE_DELIVERY_PRIORITY_V7 = 1168;
export const ARMY_VILLAGE_FERRY_PRIORITY_V7 = 870;
export const ARMY_VILLAGE_DELIVERY_GAIN_V7 = 2;
export const ARMY_EMPTY_CENTER_PRIORITY_V7 = 1160;
export const ARMY_RANGED_ENEMY_UNITS_V7 = 3;
/** A Martian seat with this many Shield Projectors researches Force Fields. */
export const ARMY_FORCE_FIELDS_PROJECTORS_V7 = 1;
/** A Martian seat with this many Ray Gunners researches Heat Sinks. */
export const ARMY_HEAT_SINKS_RAY_GUNNERS_V7 = 2;

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

/**
 * The Goblin pass, correction (`pulp_wars-w49.12`): what a unit of a kind
 * with Gang Up weighs in an assault, in percent of `armyUnitStrengthV7`.
 */
export const ARMY_GANG_UP_STRENGTH_V7 = 150;

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
 * The Goblin pass, correction (`pulp_wars-w49.12`): once the battle is
 * joined, an army with one and a half times the position's units commits
 * at this weight, in percent of the position's (100 without the numbers).
 * Eighteen to twenty-three Goblin units stood two tiles from eight Human
 * units for five rounds at 75 to 99 percent of their weight, attacked with
 * two or three units a turn, and lost seventeen units in one turn when the
 * Knights came.
 */
export const ARMY_COMMIT_JOINED_COUNT_WEIGHT_V7 = 70;

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
    ? // The Goblin pass, correction: a joined battle with the numbers.
      outnumbers(facts.nearUnits)
      ? ARMY_COMMIT_JOINED_COUNT_WEIGHT_V7
      : ARMY_COMMIT_HELD_RATIO_V7
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
  // The Dinosaur pass (`pulp_wars-w49.15`): a unit with Charge! (the
  // Triceratops, registered as `SIEGE`) fights in the line: it walks up and
  // strikes the unit beside it, needs no screen, and is no fragile target.
  if (rule.abilities.includes("LINEBREAKER")) return "LINE";
  return armyShareClassV7(rule);
}

/**
 * The class a role is counted in for the composition (`armyCountsV7`,
 * `armyRoleScoreV7`, `ARMY_SHARES_V7`): its registered tactical role. It
 * differs from `armyClassV7`, the class a unit fights as, for the
 * Triceratops alone: it has the siege share of a Dinosaur army (its own,
 * apart from the Cavemen's) and fights in the line.
 */
export function armyShareClassV7(
  rule: EffectiveRoleRuleV7,
): ArmyClassV7 | null {
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
  // The Undead pass (`pulp_wars-w49.13`): a quarter Zombies (30% before; in
  // three hand-played games an Undead seat fielded ten Zombies of thirteen
  // units), a quarter Skeletons (the units that strike on arrival and, with
  // Bones, walk through arrows), a fifth Banshees, a fifth Liches (15%),
  // a tenth Vampires. Against two or more hostile ranged, siege, or support
  // units: a fifth Vampires (they reach the shooters and fly back), a fifth
  // Zombies (shots kill them before they bite, but the Zombie is the one
  // Undead unit a Knight does not kill in one attack, so it ends a chain),
  // fewer Banshees.
  undead: Object.freeze({
    LINE: 25,
    DEFENDER: 25,
    RANGED: 20,
    SIEGE: 20,
    BREAKTHROUGH: 10,
  }),
  undeadFragile: Object.freeze({
    LINE: 25,
    DEFENDER: 20,
    RANGED: 15,
    SIEGE: 20,
    BREAKTHROUGH: 20,
  }),
  // The Goblin pass (`pulp_wars-w49.12`): a bomb no longer gets Gang Up,
  // so the Rocket Cart and the Scrap Buggy are what kills a unit in cover.
  // The correction pass: a fifth Orc Brutes (10% before: the chain
  // stoppers and escorts), a quarter Rocket Carts, 15% Scrap Buggies (seven
  // Buggies and two Rocket Carts were trained in a hand-played game).
  goblin: Object.freeze({
    LINE: 20,
    DEFENDER: 20,
    RANGED: 20,
    SIEGE: 25,
    BREAKTHROUGH: 15,
  }),
  goblinFragile: Object.freeze({
    LINE: 15,
    DEFENDER: 20,
    RANGED: 20,
    SIEGE: 25,
    BREAKTHROUGH: 20,
  }),
  // The Martian pass (`pulp_wars-w49.14`): two fifths Grunts (the line that
  // moves and shoots), a Shield Projector for every five or six units (the
  // field covers the eight tiles around it), a fifth Tripods, 15% Ray
  // Gunners, a tenth Motherships (two slots each). Against two or more
  // hostile ranged, siege, or support units: a quarter Tripods, which kill
  // them from two tiles.
  martian: Object.freeze({
    LINE: 40,
    DEFENDER: 15,
    RANGED: 15,
    SIEGE: 20,
    BREAKTHROUGH: 10,
  }),
  martianFragile: Object.freeze({
    LINE: 35,
    DEFENDER: 15,
    RANGED: 15,
    SIEGE: 25,
    BREAKTHROUGH: 10,
  }),
  // The Dinosaur pass (`pulp_wars-w49.15`): three tenths Triceratops (the
  // siege share: the grown units that are the line), a quarter
  // Ankylosauruses (the units a Knight does not kill, and the garrisons),
  // a fifth Cavemen (the capturers, and Pack Hunt beside the dinosaurs),
  // 15% Spitters (Acid against cover and Walls), a tenth T-Rexes (14 Coins
  // and two slots each). Against two or more hostile ranged, siege, or
  // support units a quarter T-Rexes, which Rampage through them.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Triceratops is a `LINE`
  // role now, so the line share holds the Triceratops and the Cavemen
  // together (the dearer unit of a short class is bought first), and the
  // siege share is the Stegosaurus's: 40 / 25 / 15 / 10 / 10, and against
  // fragile enemies 30 / 20 / 15 / 10 / 25. A first guess, not tuned.
  dinosaur: Object.freeze({
    LINE: 40,
    DEFENDER: 25,
    RANGED: 15,
    SIEGE: 10,
    BREAKTHROUGH: 10,
  }),
  dinosaurFragile: Object.freeze({
    LINE: 30,
    DEFENDER: 20,
    RANGED: 15,
    SIEGE: 10,
    BREAKTHROUGH: 25,
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
  if (faction === "MARTIAN")
    return fragile ? ARMY_SHARES_V7.martianFragile : ARMY_SHARES_V7.martian;
  if (faction === "DINOSAUR")
    return fragile ? ARMY_SHARES_V7.dinosaurFragile : ARMY_SHARES_V7.dinosaur;
  return fragile ? ARMY_SHARES_V7.fragile : ARMY_SHARES_V7.standard;
}
/**
 * The Martian pass (`pulp_wars-w49.14`): a Martian army has one Saucer per
 * this many units, at most two (the carriers and pullers of the line; a
 * seat with one for every four lost three for two pulls).
 */
export const ARMY_MARTIAN_SKIRMISHER_PER_UNITS_V7 = 6;
export const ARMY_MARTIAN_SKIRMISHER_MAXIMUM_V7 = 2;
/**
 * The Martian pass: what a threatened or frontier center adds to the
 * training score of a Martian seat's Grunt and of its Shield Projector.
 * The other factions' defender has the 200 and their line unit the 100: a
 * Martian seat's body is the Grunt, which shoots what walks up, and a
 * Projector beyond its share is 4 Coins that hit for 3 (a seat with four
 * cities trained a Projector in thirteen of eighteen rounds and fielded
 * three Grunts).
 */
export const ARMY_MARTIAN_FRONT_LINE_VALUE_V7 = 200;
export const ARMY_MARTIAN_FRONT_DEFENDER_VALUE_V7 = 100;
/**
 * Step two of the Martian pass (`pulp_wars-w49.25`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 14): a Martian army has
 * one Shock Trooper for every two Grunts, no more. Both are its line class,
 * and a class the army is short of is bought in its dearest unit: in the
 * lab a seat with Armoury trained seven Shock Troopers in nine rounds and
 * fielded no Grunt at the end. The Grunt is the line that shoots from two
 * tiles; the Trooper is the body that stands in front of it. A capped
 * Trooper costs `ARMY_MARTIAN_HEAVY_CAP_COST_V7` of training score (more
 * than the garrison bonus of a threatened center leaves a Grunt behind).
 */
export const ARMY_MARTIAN_HEAVY_CAP_COST_V7 = 600;
export function armyMartianHeavyCappedV7(
  troopers: number,
  grunts: number,
): boolean {
  return troopers * 2 >= grunts;
}
/** A Goblin army has one Wolf Rider per this many units (at most three). */
export const ARMY_GOBLIN_SKIRMISHER_PER_UNITS_V7 = 4;
export const ARMY_GOBLIN_SKIRMISHER_MAXIMUM_V7 = 3;
/**
 * The Undead pass (`pulp_wars-w49.13`): an Undead army has one Ghoul per
 * this many units, at most two (one in all before): the fast unit that
 * finishes what a Zombie has bitten.
 */
export const ARMY_UNDEAD_SKIRMISHER_PER_UNITS_V7 = 5;
export const ARMY_UNDEAD_SKIRMISHER_MAXIMUM_V7 = 2;
/**
 * The Undead pass: an Undead seat keeps the Coins for the dear unit its
 * army is short of (the Lich, the Vampire) when one more turn's income
 * pays for it, in a city no enemy is near. The army must have this many
 * units first.
 */
export const ARMY_DEAR_UNIT_ARMY_V7 = 4;
/** What a Zombie's bite is worth for each Coin of its target's price. */
export const ARMY_ZOMBIE_BITE_VALUE_V7 = 4;

// ---------------------------------------------------------------------------
// The Undead pass, correction (`pulp_wars-w49.13`,
// docs/product/RULESET_7_TUNING_UNDEAD.md section 13): what three
// hand-played games showed. The hooks are in `src/ai/v7.ts`
// (`armyVillagesFirstV7`, `armyEconomyFirstV7`, `armySwapsOutV7`,
// `armyZombieAloneV7`, `armyShootsBiterFirstV7`, `armyCureDueV7`).
// ---------------------------------------------------------------------------

/**
 * Villages first: in its first rounds an Undead seat that knows a free
 * village within `ARMY_VILLAGES_FIRST_REACH_V7` of an own center with no
 * hostile unit beside it walks into no visible enemy's reach outside its
 * own land with the units that capture and attack, and such a unit makes
 * no attack after a Move on a unit outside its own land that the attack
 * does not kill. (Its three starting Skeletons walked seven tiles to fight at the
 * player's village while free villages four tiles from its capital stood
 * empty: three cities by round 9 against five.)
 */
export const ARMY_VILLAGES_FIRST_ROUNDS_V7 = 10;
export const ARMY_VILLAGES_FIRST_REACH_V7 = 6;
/** A village with a hostile unit this close is not one "in reach". */
export const ARMY_VILLAGES_FIRST_DANGER_V7 = 2;
/**
 * The garrison swap: the step off a threatened own center of a unit that
 * cannot attack a neighbour (a Banshee, a Lich), for the sturdier own unit
 * beside the center. Just above the step onto a threatened center (1250).
 */
export const ARMY_SWAP_PRIORITY_V7 = 1251;
/**
 * A Banshee with a hostile unit within this many tiles and none within
 * three walks up (one of two sat out seven rounds four tiles from the
 * fight).
 */
export const ARMY_BANSHEE_APPROACH_RADIUS_V7 = 6;
/** That Move: above a route step (700) and a picket (710). */
export const ARMY_BANSHEE_APPROACH_PRIORITY_V7 = 716;
/**
 * Economy first (`armyEconomyFirstV7`): the growth an Undead seat's land
 * can use is weighed by population per Coin of research; a Lumber Camp
 * counts this many times, because Forestry is also the first step to the
 * Lich (Sawmilling).
 */
export const ARMY_ECONOMY_FORESTRY_WEIGHT_V7 = 3;
/** An Undead seat with this many Liches researches Pestilence before the Vampire. */
export const ARMY_PESTILENCE_LICHES_V7 = 2;
/**
 * A seat with Bitten units and no unit that tends: what its cure (the
 * Captain) is worth more in training.
 */
export const ARMY_CURE_TRAINING_VALUE_V7 = 400;

// ---------------------------------------------------------------------------
// Step two of the Undead pass (`pulp_wars-w49.24`,
// docs/product/RULESET_7_TUNING_UNDEAD.md section 15). The hooks are in
// `src/ai/v7.ts` (`armyUndeadBodiesFirstV7`, `armyUndeadGrowthFirstV7`,
// `armyUndeadContactV7`, `armyNecromancerDueV7`, `armyBestGarrisonStaysV7`).
// ---------------------------------------------------------------------------

/**
 * Bodies first: an Undead seat with fewer land units than its cities and
 * this many more trains before it researches and keeps no Coins for a
 * technology. (Its first three Skeletons and a free Ghoul were its whole
 * army to round 9 in two diagnostic matches, on four cities.)
 */
export const ARMY_UNDEAD_SPARE_UNITS_V7 = 2;

/**
 * Step two of the Undead pass: the technologies the research clock of a
 * war may fall behind while an Undead seat is short of units; one more and
 * the technology is bought before the units again.
 */
export const ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7 = 1;
/**
 * Growth first: an Undead seat that has met no enemy and owns at most this
 * many technologies (its opener; the root of Industry does not count)
 * researches one growth technology before the Zombie's two.
 */
export const ARMY_UNDEAD_GROWTH_FIRST_TECHNOLOGIES_V7 = 1;
/**
 * The Necromancer: an Undead seat that can train one and fields none
 * trains it in a city with this many free Graves within
 * `ARMY_NECROMANCER_GRAVE_REACH_V7` tiles of its center (its Move and the
 * two tiles of Raise Dead), also in a threatened city, where a support unit
 * otherwise loses 200. What the training is worth more.
 */
export const ARMY_NECROMANCER_GRAVES_V7 = 3;
export const ARMY_NECROMANCER_GRAVE_REACH_V7 = 3;
export const ARMY_NECROMANCER_TRAINING_VALUE_V7 = 600;
/**
 * An Undead seat's due technology while a capture is on offer: just above
 * the capture (1340), which would raise its price.
 */
export const ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7 = 1341;

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
    // The Dinosaur pass (`pulp_wars-w49.15`): an own Egg counts as the unit
    // inside (it fills that unit's slots and hatches into it), so a seat
    // does not lay the same class again while its Eggs wait.
    if (
      unit.form !== "LAND" &&
      !(unit.form === "EGG" && unit.ownerId === view.viewer.id)
    )
      continue;
    const rule = unitRoleRuleV7(view, unit);
    // An own unit by its share of the army; a hostile one by how it fights.
    const unitClass =
      unit.ownerId === view.viewer.id
        ? armyShareClassV7(rule)
        : armyClassV7(rule);
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
  const unitClass = armyShareClassV7(rule);
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
        : // The Undead pass: one Ghoul per five units, at most two.
          faction === "UNDEAD"
          ? Math.min(
              ARMY_UNDEAD_SKIRMISHER_MAXIMUM_V7,
              Math.floor(counts.total / ARMY_UNDEAD_SKIRMISHER_PER_UNITS_V7),
            )
          : // The Martian pass: one Saucer per six units, at most two.
            faction === "MARTIAN"
            ? Math.min(
                ARMY_MARTIAN_SKIRMISHER_MAXIMUM_V7,
                Math.floor(counts.total / ARMY_MARTIAN_SKIRMISHER_PER_UNITS_V7),
              )
            : // The Dinosaur pass: one Raptor per four units, at most three.
              faction === "DINOSAUR"
              ? Math.min(
                  ARMY_DINOSAUR_SKIRMISHER_MAXIMUM_V7,
                  Math.floor(
                    counts.total / ARMY_DINOSAUR_SKIRMISHER_PER_UNITS_V7,
                  ),
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
    : // The Martian pass: Grunts are a Martian seat's bodies.
      faction === "MARTIAN" && unitClass === "LINE"
      ? ARMY_MARTIAN_FRONT_LINE_VALUE_V7
      : faction === "MARTIAN" && unitClass === "DEFENDER"
        ? ARMY_MARTIAN_FRONT_DEFENDER_VALUE_V7
        : unitClass === "DEFENDER"
          ? 200
          : unitClass === "LINE"
            ? 100
            : // (The Dinosaur pass: not the Triceratops, which fights in
              // the line; its Egg's two turns already count against it in
              // a threatened city.)
              (unitClass === "SIEGE" && armyClassV7(rule) === "SIEGE") ||
                unitClass === "SUPPORT"
              ? -200
              : // The Goblin pass, correction: a Goblin seat trains no
                // breakthrough unit onto a threatened or frontier center either
                // (five of seven Scrap Buggies died on the center they were
                // trained on). Other factions' seats are as they were.
                // The Martian pass: nor a Martian seat a Mothership (8
                // Coins and two unit slots of a city that needs bodies).
                // The Dinosaur pass: nor a Dinosaur seat a T-Rex Egg (14
                // Coins, two slots, and four turns as an Egg).
                unitClass === "BREAKTHROUGH" &&
                  (faction === "GOBLIN" ||
                    faction === "MARTIAN" ||
                    faction === "DINOSAUR")
                ? -ARMY_FRONT_BREAKTHROUGH_COST_V7
                : 0;
  // Tuning 6 (`pulp_wars-w49.6`): a class the army is short of is bought
  // in its dearest unit the Coins reach (`ARMY_DEAR_UNIT_VALUE_V7` per
  // Coin of price), so the top units get a real share of the purchases:
  // the Goblin seat trained nothing dearer than 3 Coins in thirty rounds.
  // The Dinosaur pass, correction: the capped Ankylosaurus.
  const capped =
    faction === "DINOSAUR" &&
    unitClass === "DEFENDER" &&
    armyDinosaurDefenderCappedV7(counts)
      ? ARMY_DINOSAUR_DEFENDER_CAP_COST_V7
      : 0;
  return (
    deficit +
    defence +
    rule.cost +
    (deficit > 0 ? ARMY_DEAR_UNIT_VALUE_V7 * rule.cost : 0) -
    capped
  );
}

/** What a threatened or frontier center costs a Scrap Buggy's score. */
export const ARMY_FRONT_BREAKTHROUGH_COST_V7 = 400;
/**
 * What standing beside an own ranged, siege, or support unit is worth to
 * the Move of a Goblin seat's defender-class unit (the Orc Brute), and how
 * many such neighbours count.
 */
export const ARMY_ESCORT_VALUE_V7 = 6;
export const ARMY_ESCORT_MAXIMUM_V7 = 2;
/** What a Coin of price adds to the score of a role the army is short of. */
export const ARMY_DEAR_UNIT_VALUE_V7 = 20;

// ---------------------------------------------------------------------------
// Tuning 8 (`pulp_wars-w49.11`, docs/product/RULESET_7_TUNING_HUMAN.md
// section 15): capture what it reaches, research in a war, real numbers on
// a front, Goblin growth and fire, and the small seat. The hooks are in
// `src/ai/v7.ts` (`armyStormV7`, `armyHoldsCenterV7`, `armyStormWaitsV7`,
// `armyStormMoveV7`).
// ---------------------------------------------------------------------------

/** A hostile center this close to an own capturer is stormed. */
export const ARMY_STORM_RADIUS_V7 = 6;
/**
 * Capturers told off for one hostile center: two, and one more for every
 * two hostile ranged or siege units within `ARMY_STORM_SHOOTER_RADIUS_V7`
 * of it, at most `ARMY_STORM_UNITS_MAXIMUM_V7`.
 */
export const ARMY_STORM_UNITS_V7 = 2;
export const ARMY_STORM_UNITS_MAXIMUM_V7 = 5;
export const ARMY_STORM_SHOOTER_RADIUS_V7 = 4;
/** Fighting units that come up to an own unit holding a hostile center. */
export const ARMY_COVER_UNITS_V7 = 3;
/** A stormer's Move toward its center: just above a committed advance. */
export const ARMY_STORM_PRIORITY_V7 = 762;
/**
 * The shots that empty a center a stormer then enters: with the kills that
 * open a capture (1344, 1345), above the step onto the center (1290).
 */
export const ARMY_STORM_FIRE_PRIORITY_V7 = 1344;

/**
 * Research in a war: one technology of the army's order (or its one growth
 * technology) is due for every this many rounds played (more for a seat
 * whose income is small against the price: `ARMY_WAR_RESEARCH_SHARE_V7`).
 * The Goblin pass, correction (`pulp_wars-w49.12`) tried 2 and kept 3: at 2
 * an Undead seat's opening bought no growth building (the pinned seed-4
 * opening of tuning 7). The Human seat that owned seven technologies in
 * round 25 of a hand-played game is answered by its order instead (the
 * Swordsman third, `ARMY_RESEARCH_ROLES_V7`).
 */
export const ARMY_WAR_RESEARCH_ROUNDS_V7 = 3;
/** The same for a rich seat. */
export const ARMY_RICH_RESEARCH_ROUNDS_V7 = 2;
/** A seat with this income a turn is rich. */
export const ARMY_RICH_INCOME_V7 = 15;
/** ... or one with this many units and this share (percent) of the largest hostile seat's. */
export const ARMY_RICH_ARMY_V7 = 12;
export const ARMY_RICH_ARMY_RATIO_V7 = 150;
/**
 * A seat that earns little waits longer for each technology: the turns its
 * income needs to pay the price, plus this many (the turns of a cycle whose
 * income goes to units). A seat on 4 Coins a turn buys a 10-Coin
 * technology every fourth round, not every third.
 */
export const ARMY_WAR_RESEARCH_SPARE_TURNS_V7 = 1;
/**
 * A city with a hostile land unit this close to its center trains whatever
 * the Coins kept for the due technology.
 */
export const ARMY_RESEARCH_FLOOR_GATES_V7 = 2;

/**
 * What a hostile siege unit is worth more than another ranged or support
 * target to a fast, ranged, or siege unit of the seat.
 */
export const ARMY_SIEGE_TARGET_VALUE_V7 = 15;

/**
 * A committed bomb that splashes whatever stands beside its target (the
 * Goblin Bomb Chucker's), with no own unit there: its Move and its throw go
 * before every other Move of the assault (the Gang Up and Kaboom ladders
 * end at 1185), so that the own units close in afterwards.
 */
export const ARMY_BOMB_MOVE_PRIORITY_V7 = 1187;
export const ARMY_BOMB_FIRE_PRIORITY_V7 = 1188;
/** A spent fast unit's Move out of the enemy's reach: above Recover (930). */
export const ARMY_PULL_BACK_PRIORITY_V7 = 937;
/** ... and its hit that does not kill: after that Move. */
export const ARMY_SPENT_ATTACK_PRIORITY_V7 = 905;
/**
 * Training onto the empty center of a threatened city: what a role adds to
 * its score for being a better garrison (HP times Defense) than the best
 * own unit beside the center.
 */
export const ARMY_GARRISON_TRAINING_VALUE_V7 = 5000;

/**
 * Step two of the Human pass (`pulp_wars-w49.22`,
 * docs/product/RULESET_7_TUNING_HUMAN.md section 17): a Human army seat's
 * garrison rule yields to a ranged unit. In a war on a small map every city
 * of a seat is threatened and its garrison steps aside every turn, so the
 * garrison value above decided every training: Fighters only before
 * Fortification, then Guards only. A seat that researched Marksmanship in
 * round 8 trained its first Marksman in round 17, with every city training
 * a Fighter a turn against Goblins in between.
 *
 * The garrison value is not given while the seat fields this many line and
 * defender units, its ranged class is below its share of the army
 * (`armySharesV7`), and the city is offered a ranged unit that its Coins
 * reach. The shares then choose (a ranged unit until it has its share).
 *
 * Step two of the Goblin pass (`pulp_wars-w49.23`,
 * docs/product/RULESET_7_TUNING_GOBLIN.md section 14): a Goblin seat too.
 * In a diagnostic match a Goblin seat on the defensive owned Bomb Chuckers
 * from round 7 and trained two in twenty-one rounds, and Goblins in every
 * other training: its three cities were threatened every turn. (No Bomb
 * Chucker is trained onto a contested center, as before:
 * `armyHelplessGarrisonV7`.)
 */
export const ARMY_GARRISON_YIELD_BODIES_V7 = 3;

export function armyGarrisonYieldsToRangedV7(
  faction: FactionIdV7,
  counts: ArmyCountsV7,
  offersRanged: boolean,
  offersSiege = false,
): boolean {
  // Step two of the Undead pass (`pulp_wars-w49.24`,
  // docs/product/RULESET_7_TUNING_UNDEAD.md section 15): an Undead seat
  // too, and to its siege class as well (the Banshee and the Lich). A seat
  // with the Banshee's technology from round 16 of a diagnostic match
  // trained Zombies and Skeletons only to round 25: ten Zombies of fifteen
  // units in another. (No Banshee and no Lich is trained onto a contested
  // center, as before: `armyHelplessGarrisonV7`.)
  if (faction !== "ORIGINAL" && faction !== "GOBLIN" && faction !== "UNDEAD")
    return false;
  const siege = faction === "UNDEAD" && offersSiege;
  if (!offersRanged && !siege) return false;
  if (
    counts.byClass.LINE + counts.byClass.DEFENDER <
    ARMY_GARRISON_YIELD_BODIES_V7
  )
    return false;
  const shares = armySharesV7(
    faction,
    counts.hostileFragile >= ARMY_FRAGILE_HOSTILES_V7,
  );
  return (
    (offersRanged &&
      shares.RANGED * (counts.total + 1) > 100 * counts.byClass.RANGED) ||
    (siege && shares.SIEGE * (counts.total + 1) > 100 * counts.byClass.SIEGE)
  );
}

/**
 * Growth in the seat's own first capital goes before the same growth
 * elsewhere (strategic value) while the capital is at this level or below,
 * or below another own city.
 */
export const ARMY_CAPITAL_GROWTH_LEVEL_V7 = 2;
export const ARMY_CAPITAL_GROWTH_VALUE_V7 = 3;

/**
 * An army is massed when half of the units coming at a position stand
 * within this many tiles of its foremost unit (or those that do have the
 * numbers by themselves, or the battle is joined). Before that it stages.
 */
export const ARMY_MASSED_RANKS_V7 = 1;

/**
 * The step onto an empty hostile center: 1 strategic value for every this
 * much worth (HP times Defense in half-points, the mean of the Defense
 * hand to hand and against an attack from two tiles) of the unit, at
 * most `ARMY_CENTER_HOLDER_VALUE_MAXIMUM_V7`, so the sturdiest unit in
 * reach goes in.
 */
export const ARMY_CENTER_HOLDER_WORTH_V7 = 1;
export const ARMY_CENTER_HOLDER_VALUE_MAXIMUM_V7 = 150;

/**
 * The technologies the research order goes on to once every unit of the
 * faction's order is unlocked: what an army uses, never Roads or Commerce
 * (those are bought in peace).
 */
export const ARMY_LATE_RESEARCH_V7: readonly TechnologyIdV7[] = Object.freeze([
  "FIELDCRAFT",
  "FORTIFICATION",
  "METALLURGY",
  "EXPLOSIVES",
] as const);

/**
 * A weak garrison (half its HP or less, on a center without Walls) is
 * attacked by a group of this many own fighting units within this many
 * tiles of it, whatever the position weighs.
 */
export const ARMY_RETAKE_UNITS_V7 = 2;
export const ARMY_RETAKE_RADIUS_V7 = 3;

/**
 * A battery (the hostile siege units whose range covers a center the seat
 * storms) is answered by the own units within this many tiles of it.
 */
export const ARMY_BATTERY_REACH_V7 = 7;
/** The Move toward a battery: above a stormer's approach (762). */
export const ARMY_BATTERY_PRIORITY_V7 = 764;

/** A hostile melee unit this close to a center makes it contested. */
export const ARMY_CONTESTED_RADIUS_V7 = 2;
/**
 * The garrison worth of a unit that cannot attack a neighbour (the Bomb
 * Chucker) is divided by this.
 */
export const ARMY_HELPLESS_GARRISON_DIVISOR_V7 = 4;
/**
 * What a bomber's Move loses in strategic value for every hostile melee
 * unit beside its end tile, and for every other own bomber beside it.
 */
export const ARMY_BOMBER_MELEE_COST_V7 = 30;
export const ARMY_BOMBER_NEIGHBOUR_COST_V7 = 12;

/**
 * A garrison's hit that does not kill is made before the step aside that
 * lets its city train when it is worth this much (10 a point dealt, 8 a
 * point taken).
 */
export const ARMY_GARRISON_HIT_VALUE_V7 = 30;
