import {
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { UnitRoleIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The Cult seat of the Normal AI (`pulp_wars-mch9.9`, bead A1 of
 * docs/product/RULESET_7_CULTISTS.md section 15.1): the numbers and the
 * unit predicates of a Cult seat on the army policy. The hooks are in
 * `src/ai/v7-army.ts` (the list of army factions, the research order, the
 * shares, the counts of Summoners and Familiars) and `src/ai/v7.ts`
 * (`armyCultSeatV7` and the rules it gates).
 *
 * A baseline designed from judgement and from the lessons of the other
 * factions' passes, **not tuned by simulation**: no match was played to set
 * a number in this file, and its tests are hand-built positions
 * (`tests/unit/ruleset-v7-cult-ai.test.ts`).
 *
 * What A1 holds:
 *
 * - **The gate.** `CULT` is in `ARMY_PLAY_FACTIONS_V7`, so a match with a
 *   Cult seat keeps every seat on the army rules.
 * - **Research order** (`CULT_RESEARCH_ROLES_V7`): the Summoner, the Hexer,
 *   the Idol Bearer, the Familiar, the Chosen, the Stargazer, the Caller.
 *   Leadership is the second technology (no growth technology before it);
 *   Harvest Rites comes before the Chosen's chain; with a hostile Raider-
 *   or Knight-role unit in sight before the seat has Hexers, Hexers go
 *   first (`cultHexersWantedV7`); The Stars Are Right is the first late
 *   technology once Favour has reached `CULT_STARS_FAVOUR_V7`.
 * - **The army** (`CULT_ARMY_SHARES_V7`): 45% line, 20% Hexers, 10% Idol
 *   Bearers (no more than cities), 10% Stargazers, 10% Callers; one
 *   Summoner for every six units (one to three); one Familiar for five
 *   units, two at most; one Chosen for every two Initiates.
 * - **Bodies first.** The seat counts its robed cultists
 *   (`cultRobedV7`); short of them it trains before it researches and
 *   takes the Militia at level 2. It takes the Thing at every level from 5.
 * - **Weak links** (`cultWeakLinkV7`, `cultEscortV7`): a robed cultist
 *   under `CULT_STURDY_V7` HP at its maximum is a weak link of a kill chain
 *   at any HP; the Chosen and the Idol Bearer are the escorts.
 * - **Contact with company** and **the back row out of reach**
 *   (`cultBackRowV7`): the hooks are `armyDinosaurContactHeldV7` and
 *   `armyIceFolkShooterHeldV7` in `src/ai/v7.ts`.
 *
 * The channel, Summon, Sacrifice, Seize, Offering, Anchor, and Behold! are
 * bead A2 (`pulp_wars-mch9.10`): the Cult seat's plan in
 * `src/ai/v7-cult-channel.ts`. The rituals, the hexes, and the tricks are
 * bead A3 (`pulp_wars-mch9.11`): `src/ai/v7-cult-rituals.ts`, a part of
 * that plan. What is left: every other seat against the Cult (A4,
 * `pulp_wars-mch9.12`). The policy offers each of the Cult's commands only
 * as a step of the plan (`isPolicyCandidate`).
 *
 * Everything is read from the public view; nothing draws from the PRNG or
 * depends on elapsed time.
 */

/**
 * The order in which a Cult seat researches toward its units (section
 * 15.1): the Summoner (Leadership: the faction's heart, one technology
 * behind the Gathering most seats open with), the Hexer (Hunting and
 * Hexers: the shot from two tiles, and Ribbit), the Idol Bearer (Crafting
 * and Warding Circles: the garrison, and the unit a Knight's hit does not
 * kill), the Familiar (one comes free with Scouts), the Chosen (Engineering
 * and the Chosen: the heavy body that guards the circle), the Stargazer
 * (Forestry and Stargazers), the Caller (Raiding and Callers).
 */
export const CULT_RESEARCH_ROLES_V7: readonly UnitRoleIdV7[] = Object.freeze([
  "CAPTAIN",
  "MARKSMAN",
  "GUARD",
  "RAIDER",
  "SWORDSMAN",
  "CATAPULT",
  "KNIGHT",
] as const);

/**
 * The shares of a Cult seat's land army, in percent (section 15.1; first
 * guesses, not tuned): 45% line (Initiates, and the Chosen once their
 * technology is owned: `cultChosenCappedV7`), 10% Idol Bearers
 * (`cultIdolBearerCappedV7`), 20% Hexers, 10% Stargazers, 10% Callers. The
 * Summoners and the Familiars are counted apart (below), which is why the
 * shares do not add up to 100. The same against fragile enemies: the Cult
 * has no unit that exists to reach a back row (a Caller has no Overrun).
 */
export const CULT_ARMY_SHARES_V7 = Object.freeze({
  LINE: 45,
  DEFENDER: 10,
  RANGED: 20,
  SIEGE: 10,
  BREAKTHROUGH: 10,
});

/** A Cult army has one Familiar per this many units, at most two. */
export const CULT_FAMILIAR_PER_UNITS_V7 = 5;
export const CULT_FAMILIAR_MAXIMUM_V7 = 2;

/** The Familiars an army of `total` units wants. */
export function cultFamiliarsWantedV7(total: number): number {
  return Math.min(
    CULT_FAMILIAR_MAXIMUM_V7,
    Math.floor(total / CULT_FAMILIAR_PER_UNITS_V7),
  );
}

/**
 * A Cult army has one Summoner per this many units, at least one (the role
 * is offered only once Leadership is owned) and at most three.
 */
export const CULT_SUMMONER_PER_UNITS_V7 = 6;
export const CULT_SUMMONER_MINIMUM_V7 = 1;
export const CULT_SUMMONER_MAXIMUM_V7 = 3;

/** The Summoners an army of `total` units wants. */
export function cultSummonersWantedV7(total: number): number {
  return Math.min(
    CULT_SUMMONER_MAXIMUM_V7,
    Math.max(
      CULT_SUMMONER_MINIMUM_V7,
      Math.floor(total / CULT_SUMMONER_PER_UNITS_V7),
    ),
  );
}

/**
 * A Cult seat's Idol Bearers are capped as an Ice Folk seat's Musk Oxen
 * are: the Idol Bearer does not strike after it moves, so it is the
 * garrison of a center and the ward of a circle. No more than the seat owns
 * cities, nor than a third of the army.
 */
export function cultIdolBearerCappedV7(
  idolBearers: number,
  army: number,
  cities: number,
): boolean {
  return (
    idolBearers >= Math.max(1, cities) ||
    (idolBearers >= 1 && idolBearers >= Math.ceil((army + 1) / 3))
  );
}

/**
 * A Cult army has one Chosen for every two Initiates, no more (the Martian
 * seat's Shock Trooper rule). Both are its line class, and a class the army
 * is short of is bought in its dearest unit: without the cap a seat with
 * the Chosen's technology trains the Chosen only, and the Initiates are the
 * channellers, the Pamphlets, and the 2-Coin bodies.
 */
export function cultChosenCappedV7(chosen: number, initiates: number): boolean {
  return chosen * 2 >= initiates;
}

/**
 * A robed cultist whose maximum HP is below this is a weak link of a kill
 * chain at any HP: a Human Knight's hit kills an Initiate (10 HP), a Hexer
 * (9), a Summoner (10), a Stargazer (10), and a Caller (12) at full HP and
 * rides on. The Chosen (15 HP, Defense 2) and the Idol Bearer (16 HP,
 * Defense 2.5) are not.
 */
export const CULT_STURDY_V7 = 15;

/** Favour at which The Stars Are Right is the first late technology. */
export const CULT_STARS_FAVOUR_V7 = 12;

/**
 * A robed cultist (section 4): a unit whose role, under its kind, is robed,
 * in land form. The Familiar, the Thing, the ships, and the daemons are
 * not. Read through the unit's kind, so a mind-controlled cultist is still
 * one.
 */
export function cultRobedV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(view, unit).robed;
}

/**
 * Bodies first: the robed cultists `view`'s seat fields. They are what
 * captures, channels, chants, and holds; a Familiar, the Thing, and a
 * daemon are not counted.
 */
export function cultBodiesV7(view: PlayerViewV7): number {
  let bodies = 0;
  for (const unit of view.units)
    if (unit.ownerId === view.viewer.id && cultRobedV7(view, unit)) bodies += 1;
  return bodies;
}

/** A weak link of a kill chain at any HP (`CULT_STURDY_V7`). */
export function cultWeakLinkV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return cultRobedV7(view, unit) && unit.maxHp < CULT_STURDY_V7;
}

/**
 * An escort: a robed cultist a Knight's hit does not kill at full HP (the
 * Chosen, the Idol Bearer). It stands beside the weak links and ends the
 * ride. (The Thing and the daemons are not robed: a daemon beside its own
 * cultists is the last thing a Cult seat wants.)
 */
export function cultEscortV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return cultRobedV7(view, unit) && unit.maxHp >= CULT_STURDY_V7;
}

/**
 * The back row (section 15.1, "shooters and the back row out of reach"): a
 * Hexer (the robed cultist that shoots from two tiles), a Stargazer (it
 * leads Star-fall), or a Summoner (it Summons).
 */
export function cultBackRowV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  if (!cultRobedV7(view, unit)) return false;
  const rule = unitRoleRuleV7(view, unit);
  return (
    rule.range >= 2 ||
    rule.abilities.includes("STARFALL") ||
    rule.abilities.includes("SUMMON")
  );
}

/**
 * Hexers first (section 15.1, the pattern of the Goblin seat's Orc Brute
 * rule, `WANTED`): a hostile land unit of the `RAIDER` or `KNIGHT` role is
 * among `hostiles` (the visible hostile land units). The Hexer is the
 * Cult's answer to a fast unit: the shot from two tiles, and Ribbit.
 */
export function cultHexersWantedV7(hostiles: readonly PublicUnitV7[]): boolean {
  return hostiles.some(
    (unit) =>
      unit.form === "LAND" &&
      (unit.role === "RAIDER" || unit.role === "KNIGHT"),
  );
}

/**
 * The viewer's Favour (section 3: public), read from the view as the
 * engine's `favourOfV7` reads it: 0 for a seat without an entry, and for a
 * view captured before the Cultists (no `cult` key). (Read here and not
 * through `src/engine/v7/cult.ts`, which also holds the reducers of the
 * Favour commands: the policy imports no reducer.)
 */
export function cultFavourV7(view: PlayerViewV7): number {
  const cult = view.cult as PlayerViewV7["cult"] | undefined;
  return (
    cult?.favour.find((entry) => entry.playerId === view.viewer.id)?.favour ?? 0
  );
}

/** The Stars Are Right is due: the seat's Favour has reached the mark. */
export function cultStarsDueV7(view: PlayerViewV7): boolean {
  return cultFavourV7(view) >= CULT_STARS_FAVOUR_V7;
}
