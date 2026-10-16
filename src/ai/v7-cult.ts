import type { PlayerId } from "../engine/model/ids";
import {
  FAVOUR_CAP_V7,
  HERALD_FAVOUR_COST_V7,
  HERALD_HUNGER_FAVOUR_V7,
  HORROR_FAVOUR_COST_V7,
  effectiveRoleRuleV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import {
  isNeutralOwnerV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The Cult seat of the Normal AI (`pulp_wars-mch9.9`, bead A1 of
 * docs/product/RULESET_7_CULTISTS.md section 15.1; revised by the Cult
 * redesign's A-R1, `pulp_wars-mch9.38`,
 * docs/product/RULESET_7_CULT_REDESIGN.md sections 12.1 and 12.2): the
 * numbers and the unit predicates of a Cult seat on the army policy. The
 * hooks are in `src/ai/v7-army.ts` (the list of army factions, the research
 * order, the shares, the counts of Summoners and Familiars) and
 * `src/ai/v7.ts` (`armyCultSeatV7` and the rules it gates).
 *
 * A baseline designed from judgement and from the lessons of the other
 * factions' passes, **not tuned by simulation**: no match was played to set
 * a number in this file, and its tests are hand-built positions
 * (`tests/unit/ruleset-v7-cult-ai.test.ts`).
 *
 * The redesign's aim: **summons are the army, cultists the casters.** What
 * this file holds:
 *
 * - **The gate.** `CULT` is in `ARMY_PLAY_FACTIONS_V7`, so a match with a
 *   Cult seat keeps every seat on the army rules.
 * - **Research order** (`CULT_RESEARCH_ROLES_V7` and the technologies
 *   between them): Leadership, Crafting, Warding Circles, Hunting, Hexers,
 *   Familiars, Harvest Rites, Engineering, Gibbering Masses, Forestry,
 *   Stargazers, Raiding, Tentacles. With a hostile Raider- or Knight-role
 *   unit in sight before the seat has Hexers, Hexers go first
 *   (`cultHexersWantedV7`); with a hostile unit near an own city after
 *   Warding Circles, Gibbering Masses do (`cultMassWantedV7`); The Stars Are
 *   Right is the first late technology once Favour has reached
 *   `CULT_STARS_FAVOUR_V7`.
 * - **The army** (`CULT_ARMY_SHARES_V7`): 55% line, 20% Hexers, 10% Idol
 *   Bearers (no more than cities, nor a third of the army), 10% Stargazers;
 *   one Summoner for every five units (one to three); one Familiar for five
 *   units, two at most.
 * - **Bodies first** (`cultBodiesWantedV7`): robed cultists enough for every
 *   own daemon's strands and two to spare (and the seat's cities and two),
 *   and one more Initiate to Sacrifice when a summon is wanted and Favour is
 *   short (`cultFeedWantedV7`). The Militia at level 2, the Thing at every
 *   level from 5.
 * - **Casters and the warden** (`cultCasterV7`, `cultWardenV7`): every robed
 *   cultist but the Idol Bearer is a caster: a weak link of a kill chain at
 *   any HP, it makes no attack but a kill, a Seizure's set-up, or a blow on
 *   a frog, and no Move into a visible enemy's reach unless an own summon or
 *   Idol Bearer stands nearer that enemy (the rules are in `src/ai/v7.ts`).
 *   The Idol Bearer is the only escort.
 * - **Favour against its cap and the Herald's Hunger** (`cultHungerV7`, the
 *   prices and the cap below): read by the channel plan
 *   (`src/ai/v7-cult-channel.ts`).
 *
 * Everything is read from the public view; nothing draws from the PRNG or
 * depends on elapsed time.
 */

/**
 * The order in which a Cult seat researches toward its units (the Cult
 * redesign, section 12.1): the Summoner (Leadership: the faction's heart
 * and its summons, one technology behind the Gathering most seats open
 * with), the Idol Bearer (Crafting and Warding Circles: the warden whose
 * idol shields the casters), the Hexer (Hunting and Hexers: Ribbit), the
 * Familiar (one comes free with Scouts), and the Stargazer (Forestry and
 * Stargazers). The Caller's and the Chosen's slots are vacant
 * (`pulp_wars-mch9.31`).
 */
export const CULT_RESEARCH_ROLES_V7: readonly UnitRoleIdV7[] = Object.freeze([
  "CAPTAIN",
  "GUARD",
  "MARKSMAN",
  "RAIDER",
  "CATAPULT",
] as const);

/**
 * The technologies a Cult seat buys before the Stargazer's (section 12.1):
 * Harvest Rites (the Farm and the Offering), then Gibbering Masses (through
 * Engineering): the summoned wall before the late caster.
 */
export const CULT_RESEARCH_BEFORE_STARGAZER_V7: readonly TechnologyIdV7[] =
  Object.freeze(["FARMING", "METALLURGY"] as const);

/**
 * The technologies a Cult seat buys after every unit of its order (section
 * 12.1): Tentacles (through Raiding), the Summoner's Tentacle.
 */
export const CULT_RESEARCH_AFTER_ROLES_V7: readonly TechnologyIdV7[] =
  Object.freeze(["CHIVALRY"] as const);

/** The technology of the Gibbering Mass (Gibbering Masses). */
export const CULT_MASS_TECHNOLOGY_V7: TechnologyIdV7 = "METALLURGY";
/** The technology of the Idol Bearer (Warding Circles). */
export const CULT_WARDEN_TECHNOLOGY_V7: TechnologyIdV7 = "FORTIFICATION";
/** A hostile unit this near an own city moves Gibbering Masses up. */
export const CULT_MASS_ALERT_RADIUS_V7 = 6;

/** The technology of the Summoner, who summons the Mass (Leadership). */
export const CULT_SUMMONER_TECHNOLOGY_V7: TechnologyIdV7 = "ADMINISTRATION";

/**
 * Gibbering Masses first (section 12.1, the pattern of the Hexers-wanted
 * rule): the seat owns Leadership (decided here: only a Summoner summons a
 * Mass) and Warding Circles but not Gibbering Masses (no Mass on offer),
 * and a hostile land unit of `hostiles` (the visible hostile land units)
 * stands within `CULT_MASS_ALERT_RADIUS_V7` of an own city.
 */
export function cultMassWantedV7(
  view: PlayerViewV7,
  hostiles: readonly PublicUnitV7[],
): boolean {
  const owned = view.viewer.researchedTechs;
  if (
    !owned.includes(CULT_SUMMONER_TECHNOLOGY_V7) ||
    !owned.includes(CULT_WARDEN_TECHNOLOGY_V7) ||
    owned.includes(CULT_MASS_TECHNOLOGY_V7)
  )
    return false;
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  return hostiles.some(
    (unit) =>
      unit.form === "LAND" &&
      cities.some(
        (city) =>
          Math.max(
            Math.abs(city.at.x - unit.at.x),
            Math.abs(city.at.y - unit.at.y),
          ) <= CULT_MASS_ALERT_RADIUS_V7,
      ),
  );
}

/**
 * The shares of a Cult seat's land army, in percent (first guesses, not
 * tuned): 55% line (Initiates), 10% Idol Bearers (`cultIdolBearerCappedV7`),
 * 20% Hexers, 10% Stargazers, and no breakthrough unit (the Caller's slot is
 * vacant since `pulp_wars-mch9.31`). The Summoners and the Familiars are
 * counted apart (below), which is why the shares do not add up to 100. The
 * same against fragile enemies: the Cult's answer to a back row is its
 * summons, not a trained unit.
 */
export const CULT_ARMY_SHARES_V7 = Object.freeze({
  LINE: 55,
  DEFENDER: 10,
  RANGED: 20,
  SIEGE: 10,
  BREAKTHROUGH: 0,
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
 * A Cult army has one Summoner per this many units (section 12.1: five
 * since the redesign, six before), at least one (the role is offered only
 * once Leadership is owned) and at most three.
 */
export const CULT_SUMMONER_PER_UNITS_V7 = 5;
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
 * garrison of a center and the warden of a circle. No more than the seat
 * owns cities, nor than a third of the army.
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
 * Favour at which The Stars Are Right is the first late technology: half
 * the Great Summoning's 18 (section 12.1; 12 before the redesign).
 */
export const CULT_STARS_FAVOUR_V7 = 9;

/** What a Horror costs (the engine's number: 4 since `pulp_wars-mch9.32`). */
export const CULT_HORROR_FAVOUR_V7: number = HORROR_FAVOUR_COST_V7;
/** What the Great Summoning costs (the engine's number: 18). */
export const CULT_SUMMONING_FAVOUR_V7: number = HERALD_FAVOUR_COST_V7;
/** What each bound Herald eats at its seat's check (the engine's 2). */
export const CULT_HUNGER_FAVOUR_V7: number = HERALD_HUNGER_FAVOUR_V7;
/** The most Favour a seat holds: any gain above it is lost (30). */
export const CULT_FAVOUR_CAP_V7: number = FAVOUR_CAP_V7;
/**
 * From this much Favour the seat spends before it forfeits (section 12.2,
 * "the cap"): it summons with no enemy near, so it never sits at the cap.
 */
export const CULT_CAP_SPEND_FAVOUR_V7 = 26;
/** A summon is wanted with an enemy unit or center this near a Summoner. */
export const CULT_FEED_FRONT_V7 = 6;
/**
 * What an Initiate trained to be Sacrificed (`cultFeedWantedV7`) adds to
 * its training score: about one unit's share, so a short seat buys the body
 * that becomes Favour before another class.
 */
export const CULT_FEED_INITIATE_VALUE_V7 = 150;
/** A seat wants this many robed cultists beyond its daemons' strands. */
export const CULT_SPARE_ROBED_V7 = 2;

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
 * The warden (the Cult redesign, section 8.1): a robed cultist with
 * Behold!, the Idol Bearer. It is the robed unit that wants to be hit.
 */
export function cultWardenV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    cultRobedV7(view, unit) &&
    (unitRoleRuleV7(view, unit).abilities as readonly string[]).includes(
      "BEHOLD",
    )
  );
}

/**
 * A caster (section 12.1, "cultists do not brawl"): every robed cultist but
 * the Idol Bearer (the Initiate, the Hexer, the Summoner, the Stargazer, 7
 * HP each since the redesign).
 */
export function cultCasterV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return cultRobedV7(view, unit) && !cultWardenV7(view, unit);
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

/**
 * A weak link of a kill chain at any HP (section 12.1): every caster
 * (`cultCasterV7`). A Human Knight kills each at full HP and rides on.
 */
export function cultWeakLinkV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return cultCasterV7(view, unit);
}

/**
 * An escort (section 12.1): the Idol Bearer only (`cultWardenV7`; the
 * Chosen was one until it retired). It stands beside the weak links and
 * ends the ride. (The Thing and the daemons are not robed: a daemon beside
 * its own cultists is the last thing a Cult seat wants.)
 */
export function cultEscortV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return cultWardenV7(view, unit);
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

/**
 * The upkeep in bodies (section 15.2 step 1): every own bound daemon's
 * Control and one strand to spare, summed (the channel plan's
 * `wantedAll`).
 */
export function cultUpkeepV7(view: PlayerViewV7): number {
  const cult = view.cult as PlayerViewV7["cult"] | undefined;
  if (cult === undefined) return 0;
  let upkeep = 0;
  for (const entry of cult.daemons) {
    const unit = view.units.find((item) => item.id === entry.unitId);
    if (unit?.ownerId === view.viewer.id && unit.form === "LAND")
      upkeep += entry.control + 1;
  }
  return upkeep;
}

/**
 * The Herald's Hunger (section 12.2): the Favour the seat's next check eats,
 * `CULT_HUNGER_FAVOUR_V7` for each own bound Herald. The seat spends none of
 * it, and feeds it when short.
 */
export function cultHungerV7(view: PlayerViewV7): number {
  const cult = view.cult as PlayerViewV7["cult"] | undefined;
  if (cult === undefined) return 0;
  let heralds = 0;
  for (const entry of cult.daemons) {
    if (entry.role !== "HERALD") continue;
    const unit = view.units.find((item) => item.id === entry.unitId);
    if (unit?.ownerId === view.viewer.id && unit.form === "LAND") heralds += 1;
  }
  return heralds * CULT_HUNGER_FAVOUR_V7;
}

/**
 * Spare Coins become Favour (section 12.1): a summon is wanted (an own
 * Summoner has a visible hostile unit or center within
 * `CULT_FEED_FRONT_V7`), Favour is short of the Horror's price beyond the
 * Hunger it keeps (or, with The Stars Are Right, of the Great Summoning's),
 * and the Sacrifice of one Initiate reaches that price.
 */
export function cultFeedWantedV7(
  view: PlayerViewV7,
  hostile: (ownerId: PlayerId) => boolean,
): boolean {
  const me = view.viewer.id;
  const summoners = view.units.filter(
    (unit) =>
      unit.ownerId === me &&
      cultRobedV7(view, unit) &&
      unitRoleRuleV7(view, unit).abilities.includes("SUMMON"),
  );
  if (summoners.length === 0) return false;
  const near = (at: { readonly x: number; readonly y: number }): boolean =>
    summoners.some(
      (summoner) =>
        Math.max(
          Math.abs(summoner.at.x - at.x),
          Math.abs(summoner.at.y - at.y),
        ) <= CULT_FEED_FRONT_V7,
    );
  const front =
    view.units.some(
      (unit) =>
        unit.hp > 0 &&
        unit.form === "LAND" &&
        !isNeutralOwnerV7(unit.ownerId) &&
        hostile(unit.ownerId) &&
        near(unit.at),
    ) ||
    view.cities.some(
      (city) =>
        !isNeutralOwnerV7(city.ownerId) &&
        hostile(city.ownerId) &&
        near(city.at),
    );
  if (!front) return false;
  const favour = cultFavourV7(view);
  const hunger = cultHungerV7(view);
  const initiate = effectiveRoleRuleV7("FIGHTER", view.viewer.faction).cost;
  if (initiate === null) return false;
  const reaches = (price: number): boolean =>
    favour < price + hunger && favour + initiate >= price + hunger;
  return (
    reaches(CULT_HORROR_FAVOUR_V7) ||
    (view.viewer.researchedTechs.includes("EXPLOSIVES") &&
      reaches(CULT_SUMMONING_FAVOUR_V7))
  );
}

/**
 * Bodies first (section 12.1): the robed cultists the seat wants: enough
 * for every own daemon's strands and `CULT_SPARE_ROBED_V7` to spare, and no
 * fewer than its cities and two (the Undead lesson); one more while an
 * Initiate is wanted for its Favour (`cultFeedWantedV7`).
 */
export function cultBodiesWantedV7(
  view: PlayerViewV7,
  hostile: (ownerId: PlayerId) => boolean,
): number {
  let cities = 0;
  for (const city of view.cities)
    if (city.ownerId === view.viewer.id) cities += 1;
  return (
    Math.max(
      cities + CULT_SPARE_ROBED_V7,
      cultUpkeepV7(view) + CULT_SPARE_ROBED_V7,
    ) + Number(cultFeedWantedV7(view, hostile))
  );
}
