import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  OFFERING_FAVOUR_V7,
  OFFERING_MINIMUM_LEVEL_V7,
  OFFERING_POPULATION_V7,
  SEIZE_BROKEN_HP_V7,
  SEIZE_FAVOUR_MULTIPLIER_V7,
  isMindControlledV7,
  primaryActionBlockedAfterMoveV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitRoleMechanicsV7,
  unitIsSummonedV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type FrozenLookupV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { isLivingUnitV7 } from "./afflictions";
import type { CommandV7 } from "./commands";
import type { DwarfReducerKitV7 } from "./dwarf-reducer";
import { arePlayersHostileV7, isCityBesiegedV7 } from "./economy";
import type { DomainEventV7, FavourSourceV7 } from "./events";
import { releaseControlledV7 } from "./martian";
import type { ApplyCommandResultV7 } from "./reducer";
import { recordScoreCreditsV7, unitScoreValueV7 } from "./score";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type CultStateV7,
  type FavourEntryV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { allOwnedUnitsV7 } from "./units";

/**
 * The Cultists of the Ancient Ones (docs/product/RULESET_7_CULTISTS.md;
 * `pulp_wars-mch9.4`, the second Cult engine bead): Favour, the faction's
 * one economic mechanic (section 3), and what feeds it so far: the
 * Summoner's Sacrifice and Seize (sections 5.1 and 5.2), a city's Offering
 * (section 5.3), and the Chosen's Martyr (section 8.2). Summoning a Horror
 * spends it (`pulp_wars-mch9.5`, src/engine/v7/cult-channel.ts); the Great
 * Summoning (`pulp_wars-mch9.7`) will, and a bound daemon's kills
 * (`pulp_wars-mch9.6`) and a consumption (`.7`) join the sources.
 *
 * The legality helpers read only facts that canonical state and a player's
 * view share, so the public command query and the reducer agree exactly.
 * The reducer passes its shared helpers (the kit of the Dwarf commands).
 */
export type CultReducerKitV7 = DwarfReducerKitV7;

/** The unit facts the Cult helpers read (state and public units). */
export interface CultUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

// ------------------------------------------------------------- Favour ---

/**
 * Section 3: the Favour of `playerId` (0 for a seat without an entry: a
 * Cult seat that has none, and every seat of another faction). A state or a
 * view captured before the Cultists has no list; it reads as empty.
 */
export function favourOfV7(
  input: { readonly cult?: { readonly favour: readonly FavourEntryV7[] } },
  playerId: PlayerId,
): number {
  const favour = input.cult?.favour;
  if (favour === undefined || favour.length === 0) return 0;
  return favour.find((entry) => entry.playerId === playerId)?.favour ?? 0;
}

/**
 * Section 3: the Cult state after `playerId` gained `amount` Favour (a
 * positive whole number; there is no maximum but the safe-integer range,
 * past which the command is refused as an overflow).
 */
export function withFavourGainedV7(
  cult: CultStateV7,
  playerId: PlayerId,
  amount: number,
): CultStateV7 {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new RangeError("INVALID_STATE");
  const total = favourOfV7({ cult }, playerId) + amount;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");
  return {
    ...cult,
    favour: [
      ...cult.favour.filter((entry) => entry.playerId !== playerId),
      { playerId, favour: total },
    ].sort((left, right) => left.playerId - right.playerId),
  };
}

/**
 * Section 3: the Cult state after `playerId` spent `amount` Favour (a
 * positive whole number it has). A seat left with none has no entry.
 */
export function withFavourSpentV7(
  cult: CultStateV7,
  playerId: PlayerId,
  amount: number,
): CultStateV7 {
  const left = favourOfV7({ cult }, playerId) - amount;
  if (!Number.isSafeInteger(amount) || amount <= 0 || left < 0)
    throw new RangeError("INVALID_STATE");
  return {
    ...cult,
    favour: [
      ...cult.favour.filter((entry) => entry.playerId !== playerId),
      ...(left > 0 ? [{ playerId, favour: left }] : []),
    ].sort((first, second) => first.playerId - second.playerId),
  };
}

/** The `FAVOUR_GAINED` event of a gain that left the seat at `favour`. */
function favourGainedEventV7(
  cult: CultStateV7,
  playerId: PlayerId,
  source: FavourSourceV7,
  amount: number,
): DomainEventV7 {
  return {
    kind: "FAVOUR_GAINED",
    playerId,
    source,
    amount,
    favour: favourOfV7({ cult }, playerId),
  };
}

/**
 * Section 3: a unit's value in Favour, the Score's unit value
 * (`unitScoreValueV7`): the printed cost of its role under its kind (a
 * mind-controlled unit keeps its kind), 12 for a reward giant. Free units
 * are worth their role; Arms Industry lowers a price, never a value.
 */
export function unitFavourValueV7(
  roster: FactionRosterV7,
  unit: Pick<CultUnitFactsV7, "id" | "ownerId" | "role" | "summoned">,
): number {
  return unitScoreValueV7(roster, unit);
}

/**
 * Section 4: whether the unit is a robed cultist now: its role, under its
 * kind, is robed and it is in land form.
 */
export function isRobedCultistV7(
  roster: FactionRosterV7,
  unit: Pick<CultUnitFactsV7, "id" | "ownerId" | "role" | "form" | "summoned">,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).robed;
}

/**
 * Drops the Favour of a seat that is no longer in the match (section 13.1,
 * Elimination: its Favour is gone). Every reducer output runs through this
 * before validation.
 */
export function prunedCultV7(state: GameStateV7): GameStateV7 {
  if (state.cult.favour.length === 0) return state;
  const active = new Set(
    state.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  const favour = state.cult.favour.filter((entry) =>
    active.has(entry.playerId),
  );
  return favour.length === state.cult.favour.length
    ? state
    : { ...state, cult: { ...state.cult, favour } };
}

// ------------------------------------------------- Sacrifice and Seize ---

/** The facts the Summoner's two offerings read (state and view alike). */
export type CultLookupV7 = FactionRosterV7 &
  FrozenLookupV7 & {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
    readonly plagued: readonly { readonly unitId: UnitId }[];
    readonly bitten: readonly { readonly unitId: UnitId }[];
  };

export type SacrificeRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "SACRIFICE_NOT_LEGAL";
      readonly reason:
        "EMBARKED" | "VICTIM" | "DAEMON" | "CONTROLLED" | "PLAGUED" | "BITTEN";
    };

export type SeizeRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "SEIZE_NOT_LEGAL";
      readonly reason:
        "EMBARKED" | "VICTIM" | "IMMUNE" | "HEALTHY" | "NO_HOLDER";
    };

type SummonerFactsV7 = CultUnitFactsV7 & {
  readonly activation: UnitActivationV7;
};

/**
 * A Summoner's offering is a primary action that may follow its Move: it is
 * refused when the unit has used a primary action, has a continuation
 * waiting, or may not act after its Move (a Frozen Summoner is refused
 * before this, as `UNIT_FROZEN`).
 */
function summonerActedV7(
  lookup: FrozenLookupV7,
  summoner: SummonerFactsV7,
): boolean {
  return (
    summoner.activation.overrunActive ||
    summoner.activation.attacked ||
    summoner.activation.recovered ||
    summoner.activation.captured ||
    summoner.activation.specialActed ||
    primaryActionBlockedAfterMoveV7(lookup, summoner)
  );
}

/**
 * Section 5.1, shared by the reducer and the public command query: the
 * first reason the Summoner `summoner` may not Sacrifice `victim` (the unit
 * the command names if it is on the board, else undefined), or null.
 *
 * The victim is an own land-form unit on one of the eight tiles around the
 * Summoner, of any role (the Thing in the Cellar and the Familiar
 * included), never a summoned unit (a daemon: `pulp_wars-mch9.5`), an Egg
 * (it is not in land form), or a mind-controlled unit, and not Plagued or
 * Bitten (as for Disband, so a Sacrifice never dodges a bite). A mind-controlled Summoner has no `SACRIFICE` ability
 * (Favour needs a Cult seat), so it is refused by its role.
 */
export function sacrificeRejectionV7(
  lookup: CultLookupV7,
  summoner: SummonerFactsV7,
  victim: CultUnitFactsV7 | undefined,
): SacrificeRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, summoner).abilities.includes("SACRIFICE"))
    return { code: "UNIT_ROLE_INVALID" };
  if (summoner.form !== "LAND")
    return { code: "SACRIFICE_NOT_LEGAL", reason: "EMBARKED" };
  if (summonerActedV7(lookup, summoner)) return { code: "UNIT_ALREADY_ACTED" };
  if (
    victim === undefined ||
    victim.hp <= 0 ||
    victim.id === summoner.id ||
    victim.ownerId !== summoner.ownerId ||
    victim.form !== "LAND" ||
    chebyshev(summoner.at, victim.at) !== 1
  )
    return { code: "SACRIFICE_NOT_LEGAL", reason: "VICTIM" };
  if (unitIsSummonedV7(victim))
    return { code: "SACRIFICE_NOT_LEGAL", reason: "DAEMON" };
  if (isMindControlledV7(lookup, victim.id))
    return { code: "SACRIFICE_NOT_LEGAL", reason: "CONTROLLED" };
  if (lookup.plagued.some((entry) => entry.unitId === victim.id))
    return { code: "SACRIFICE_NOT_LEGAL", reason: "PLAGUED" };
  if (lookup.bitten.some((entry) => entry.unitId === victim.id))
    return { code: "SACRIFICE_NOT_LEGAL", reason: "BITTEN" };
  return null;
}

/**
 * Section 5.2: whether a hostile unit is broken: at `SEIZE_BROKEN_HP_V7`
 * Hit Points or less (a Shield does not count). The frog's rule (half its
 * maximum HP or less) joins here with Ribbit (`pulp_wars-mch9.8`).
 */
export function unitIsBrokenV7(unit: Pick<CultUnitFactsV7, "hp">): boolean {
  return unit.hp <= SEIZE_BROKEN_HP_V7;
}

/**
 * Section 5.2: the robed cultist of `summoner`'s owner that holds `victim`
 * down: another own robed cultist next to the victim, the one with the
 * lowest unit ID when there are several (it spends nothing; the event names
 * it for the show). Undefined when nobody holds it.
 */
export function seizeHolderV7<U extends CultUnitFactsV7>(
  roster: FactionRosterV7,
  units: readonly U[],
  summoner: Pick<CultUnitFactsV7, "id" | "ownerId">,
  victim: Pick<CultUnitFactsV7, "at">,
): U | undefined {
  let holder: U | undefined;
  for (const unit of units)
    if (
      unit.hp > 0 &&
      unit.id !== summoner.id &&
      unit.ownerId === summoner.ownerId &&
      chebyshev(unit.at, victim.at) === 1 &&
      isRobedCultistV7(roster, unit) &&
      (holder === undefined || unit.id < holder.id)
    )
      holder = unit;
  return holder;
}

/**
 * Section 5.2, shared by the reducer and the public command query: the
 * first reason the Summoner `summoner` may not Seize `victim` (the unit the
 * command names if it is on the board and the actor sees it, else
 * undefined), or null. `units` are the units on the board (in a view, the
 * visible ones, which include every own unit).
 *
 * The victim is a hostile land-form unit on one of the eight tiles around
 * the Summoner; living (not of the Undead kind, not a construct), not a
 * reward giant, not a two-slot unit, not neutral (an Egg is not in land
 * form); broken ({@link unitIsBrokenV7}); and held by another robed cultist
 * of the actor next to it ({@link seizeHolderV7}).
 */
export function seizeRejectionV7(
  lookup: CultLookupV7,
  units: readonly CultUnitFactsV7[],
  summoner: SummonerFactsV7,
  victim: CultUnitFactsV7 | undefined,
): SeizeRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, summoner).abilities.includes("SEIZE"))
    return { code: "UNIT_ROLE_INVALID" };
  if (summoner.form !== "LAND")
    return { code: "SEIZE_NOT_LEGAL", reason: "EMBARKED" };
  if (summonerActedV7(lookup, summoner)) return { code: "UNIT_ALREADY_ACTED" };
  if (
    victim === undefined ||
    victim.hp <= 0 ||
    victim.id === summoner.id ||
    !arePlayersHostileV7(lookup, summoner.ownerId, victim.ownerId) ||
    victim.form !== "LAND" ||
    chebyshev(summoner.at, victim.at) !== 1
  )
    return { code: "SEIZE_NOT_LEGAL", reason: "VICTIM" };
  if (
    isNeutralOwnerV7(victim.ownerId) ||
    victim.role === "JUGGERNAUT" ||
    unitCapacitySlotsV7(lookup, victim) !== 1 ||
    !isLivingUnitV7(lookup, victim)
  )
    return { code: "SEIZE_NOT_LEGAL", reason: "IMMUNE" };
  if (!unitIsBrokenV7(victim))
    return { code: "SEIZE_NOT_LEGAL", reason: "HEALTHY" };
  if (seizeHolderV7(lookup, units, summoner, victim) === undefined)
    return { code: "SEIZE_NOT_LEGAL", reason: "NO_HOLDER" };
  return null;
}

/** Section 5.1: the Favour a Sacrifice of `victim` pays: its value. */
export function sacrificeFavourV7(
  roster: FactionRosterV7,
  victim: Pick<CultUnitFactsV7, "id" | "ownerId" | "role">,
): number {
  return unitFavourValueV7(roster, victim);
}

/** Section 5.2: the Favour a Seizure of `victim` pays: twice its value. */
export function seizeFavourV7(
  roster: FactionRosterV7,
  victim: Pick<CultUnitFactsV7, "id" | "ownerId" | "role">,
): number {
  return SEIZE_FAVOUR_MULTIPLIER_V7 * unitFavourValueV7(roster, victim);
}

// ----------------------------------------------------------- Offering ---

/** The city facts an Offering reads (state and public cities). */
export interface OfferingCityFactsV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly level: number;
  readonly population: number;
  /** Owner-private in a view: undefined for another player's city. */
  readonly cityActionAvailable?: boolean | undefined;
}

export type OfferingRejectionV7 =
  | { readonly code: "CITY_NOT_OWNED" }
  | { readonly code: "TECH_REQUIRED" }
  | { readonly code: "CITY_BESIEGED" }
  | { readonly code: "CITY_REWARD_PENDING" }
  | { readonly code: "CITY_ACTION_SPENT" }
  | {
      readonly code: "OFFERING_NOT_LEGAL";
      readonly reason: "LEVEL" | "POPULATION";
    };

/**
 * Section 5.3, shared by the reducer and the public command query: the
 * first reason `actor` may not make an Offering in `city`, or null. The
 * city is the actor's, the actor has Harvest Rites (the `offering`
 * capability of the Cult's Farming, so a seat of another faction never
 * has it), the city is not besieged, has no pending reward, has its city
 * action, is level `OFFERING_MINIMUM_LEVEL_V7` or more, and has
 * `OFFERING_POPULATION_V7` population or more (the floor: an Offering never
 * takes the population below 0).
 */
export function offeringRejectionV7(
  actor: {
    readonly id: PlayerId;
    readonly faction: GameStateV7["players"][number]["faction"];
    readonly researchedTechs: readonly TechnologyIdV7[];
  },
  city: OfferingCityFactsV7,
  besieged: boolean,
  rewardPending: boolean,
): OfferingRejectionV7 | null {
  if (city.ownerId !== actor.id) return { code: "CITY_NOT_OWNED" };
  if (!technologyCapabilitiesV7(actor.researchedTechs, actor.faction).offering)
    return { code: "TECH_REQUIRED" };
  if (besieged) return { code: "CITY_BESIEGED" };
  if (rewardPending) return { code: "CITY_REWARD_PENDING" };
  if (city.cityActionAvailable !== true) return { code: "CITY_ACTION_SPENT" };
  if (city.level < OFFERING_MINIMUM_LEVEL_V7)
    return { code: "OFFERING_NOT_LEGAL", reason: "LEVEL" };
  if (city.population < OFFERING_POPULATION_V7)
    return { code: "OFFERING_NOT_LEGAL", reason: "POPULATION" };
  return null;
}

// ----------------------------------------------------- Reducer steps ---

/** A `SACRIFICE` or `SEIZE` command (the two share one shape). */
type SummonerOfferingCommandV7 = Pick<
  Extract<CommandV7, { readonly victimUnitId: UnitId }>,
  "unitId" | "victimUnitId"
>;
type SacrificeCommandV7 = SummonerOfferingCommandV7;
type SeizeCommandV7 = SummonerOfferingCommandV7;
type OfferingCommandV7 = Extract<CommandV7, { kind: "OFFERING" }>;

/** Marks the Summoner as having used its primary action. */
function withPrimaryUsed(unit: UnitStateV7, kills = 0): UnitStateV7 {
  const total = unit.kills + kills;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");
  return {
    ...unit,
    kills: total,
    activation: { ...unit.activation, specialActed: true, handled: true },
  };
}

function rejectWith(
  kit: CultReducerKitV7,
  original: GameStateV7,
  unit: UnitStateV7,
  rejection: SacrificeRejectionV7 | SeizeRejectionV7,
): ApplyCommandResultV7 {
  switch (rejection.code) {
    case "UNIT_ROLE_INVALID":
      return kit.rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
    case "UNIT_ALREADY_ACTED":
      return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
    default:
      return kit.rejected(original, rejection.code, {
        reason: rejection.reason,
      });
  }
}

/**
 * Section 5.1: `SACRIFICE`, a primary action of a Summoner that may follow
 * its Move. The victim is removed (`UNIT_SACRIFICED`, then `UNIT_DIED`
 * cause `SACRIFICED`): no kill credit, Grave, rising, death blast, Crumbs,
 * Plunder, or growth for anyone; its slot frees; a Chosen pays no Martyr
 * on top. The seat gains the victim's value in Favour. It is not a Loss in
 * the Score (like Disband) and ends a flawless game.
 */
export function applySacrificeV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SacrificeCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const summoner = actorCheck.unit;
  const victim = state.units.find(
    (unit) => unit.id === command.victimUnitId && unit.hp > 0,
  );
  const rejection = sacrificeRejectionV7(state, summoner, victim);
  if (rejection !== null) return rejectWith(kit, original, summoner, rejection);
  if (victim === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const favour = sacrificeFavourV7(state, victim);
    const cult = withFavourGainedV7(state.cult, actor, favour);
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_SACRIFICED",
        playerId: actor,
        unitId: summoner.id,
        victimUnitId: victim.id,
        role: victim.role,
        at: { x: victim.at.x, y: victim.at.y },
        favour,
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "SACRIFICED" },
      favourGainedEventV7(cult, actor, "SACRIFICE", favour),
    ];
    const units = state.units
      .filter((unit) => unit.id !== victim.id)
      .map((unit) => (unit.id === summoner.id ? withPrimaryUsed(unit) : unit));
    // A removed Brain releases its controlled units (no Cult unit is one,
    // but the release is the one rule for every unit that leaves).
    const release = releaseControlledV7(
      units,
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: [...release.units],
        burrowed: release.burrowed,
        mindControlled: release.mindControlled,
        cult,
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * Section 5.2: `SEIZE`, a primary action of a Summoner that may follow its
 * Move. The victim dies (`UNIT_SEIZED`, then `UNIT_DIED` cause
 * `SACRIFICED`), credited to the Summoner as a kill (its kills, Promotion,
 * Slayer, the Score's Kills; the victim's owner's Loss), with no Grave,
 * rising, death blast, Crumbs, or Plunder. A Seized Brain releases its
 * controlled unit. The seat gains twice the victim's value in Favour.
 */
export function applySeizeV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SeizeCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const summoner = actorCheck.unit;
  const named = state.units.find(
    (unit) => unit.id === command.victimUnitId && unit.hp > 0,
  );
  const victim =
    named !== undefined && visibleTo(state, actor, named) ? named : undefined;
  const rejection = seizeRejectionV7(state, state.units, summoner, victim);
  if (rejection !== null) return rejectWith(kit, original, summoner, rejection);
  const holder =
    victim === undefined
      ? undefined
      : seizeHolderV7(state, state.units, summoner, victim);
  if (victim === undefined || holder === undefined)
    return kit.rejected(original, "INVALID_STATE");
  try {
    const favour = seizeFavourV7(state, victim);
    const cult = withFavourGainedV7(state.cult, actor, favour);
    // The Score's Kills (and the victim's owner's Loss) follow the credited
    // deaths; the record is made here, without the Plunder step, because a
    // Seizure pays no Plunder.
    recordScoreCreditsV7(state, [
      {
        creditedId: actor,
        victimOwnerId: victim.ownerId,
        victimUnitId: victim.id,
      },
    ]);
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_SEIZED",
        playerId: actor,
        unitId: summoner.id,
        holderUnitId: holder.id,
        victimUnitId: victim.id,
        victimOwnerId: victim.ownerId,
        role: victim.role,
        at: { x: victim.at.x, y: victim.at.y },
        favour,
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "SACRIFICED" },
      favourGainedEventV7(cult, actor, "SEIZE", favour),
    ];
    const units = state.units
      .filter((unit) => unit.id !== victim.id)
      .map((unit) =>
        unit.id === summoner.id ? withPrimaryUsed(unit, 1) : unit,
      );
    const release = releaseControlledV7(
      units,
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: [...release.units],
        burrowed: release.burrowed,
        mindControlled: release.mindControlled,
        cult,
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * Section 5.3: `OFFERING`, the city's action for the turn. The city gives
 * up `OFFERING_POPULATION_V7` population for good (`offeredPopulation`, so
 * it is that much further from its next level; a level is never lost and a
 * reward never repeats) and its seat gains `OFFERING_FAVOUR_V7` Favour.
 * `OFFERING_MADE`, the city's `CITY_ECONOMY_CHANGED`, then `FAVOUR_GAINED`.
 */
export function applyOfferingV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: OfferingCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined) return kit.rejected(original, "CITY_NOT_FOUND");
  const rejection = offeringRejectionV7(
    kit.requirePlayer(state, actor),
    city,
    isCityBesiegedV7(state, city),
    state.pendingChoices.some((choice) => choice.cityId === city.id),
  );
  if (rejection !== null)
    switch (rejection.code) {
      case "TECH_REQUIRED":
        return kit.rejected(original, "TECH_REQUIRED", { tech: "FARMING" });
      case "CITY_ACTION_SPENT":
        return kit.rejected(original, "CITY_ACTION_SPENT", {
          cityId: city.id,
        });
      case "OFFERING_NOT_LEGAL":
        return kit.rejected(original, "OFFERING_NOT_LEGAL", {
          reason: rejection.reason,
        });
      default:
        return kit.rejected(original, rejection.code);
    }
  try {
    const offered = (city.offeredPopulation ?? 0) + OFFERING_POPULATION_V7;
    if (!Number.isSafeInteger(offered))
      throw new RangeError("INTEGER_OVERFLOW");
    const cult = withFavourGainedV7(state.cult, actor, OFFERING_FAVOUR_V7);
    const events: DomainEventV7[] = [
      {
        kind: "OFFERING_MADE",
        playerId: actor,
        cityId: city.id,
        at: { x: city.at.x, y: city.at.y },
        population: OFFERING_POPULATION_V7,
        favour: OFFERING_FAVOUR_V7,
      },
    ];
    // The city keeps its stored `population` here: the economy tail below
    // recomputes it with the new `offeredPopulation` and reports the change
    // (`CITY_ECONOMY_CHANGED`), as for any other population change.
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        cities: state.cities.map((candidate) =>
          candidate.id === city.id
            ? {
                ...candidate,
                offeredPopulation: offered,
                cityActionAvailable: false,
              }
            : candidate,
        ),
        cult,
      },
      actor,
      events,
    );
    events.push(
      favourGainedEventV7(cult, actor, "OFFERING", OFFERING_FAVOUR_V7),
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// -------------------------------------------------------------- Martyr ---

/**
 * Section 8.2, Martyr: "When a Chosen dies, the Ancient Ones pay 6 Favour."
 * Folds the deaths of a command (or a Start Turn) into Favour: every
 * `UNIT_DIED` of a unit that, before the command, had the `MARTYR` ability
 * under its kind and belonged to a seat still in the match afterwards pays
 * that seat the role's `martyrFavour`, with a `FAVOUR_GAINED` (source
 * `MARTYR`) right after the death. It reads the events, so every way a unit
 * dies is covered by one rule (an attack, a retaliation, a splash, a blast,
 * Plague, a Wail, a bomb, a crush, a digest, and whatever comes later).
 *
 * No Martyr for: a Sacrifice (it pays the unit's value anyway; a Seizure by
 * another Cult seat is a death and pays), a removal (`ELIMINATION`,
 * `BRAIN_LOST`: the seat is out, or the unit was not a Cult seat's), a
 * mind-controlled Chosen (a controlled unit has no `MARTYR`: Favour needs a
 * Cult seat), and a unit that was not on the board, burrowed, or held
 * before the command. The two exceptions still to come are named by their
 * beads: a consumption (the Great Summoning, `pulp_wars-mch9.7`) and an
 * attack by a wild unit (an Unbound daemon, `pulp_wars-mch9.6`, or a
 * Tentacle, `pulp_wars-mch9.8`); each adds its test here. A kill by the
 * Giant Spider, a camp guard, or Bigfoot pays: they are no failure of the
 * Cult's.
 *
 * Returns the state and events unchanged (the same `events` array) when no
 * Martyr was paid.
 */
export function withMartyrFavourV7(
  before: Pick<
    GameStateV7,
    "players" | "mindControlled" | "monsters" | "units" | "burrowed" | "giants"
  >,
  after: GameStateV7,
  events: readonly DomainEventV7[],
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (!events.some((event) => event.kind === "UNIT_DIED"))
    return { state: after, events };
  const facts = new Map<UnitId, UnitStateV7>();
  for (const unit of allOwnedUnitsV7(before)) facts.set(unit.id, unit);
  for (const entry of before.giants.swallowed)
    facts.set(entry.unit.id, entry.unit);
  const active = new Set(
    after.players
      .filter((player) => player.status === "ACTIVE")
      .map((player) => player.id),
  );
  const sacrificed = new Set<UnitId>();
  let cult = after.cult;
  const out: DomainEventV7[] = [];
  let paid = false;
  for (const event of events) {
    out.push(event);
    if (event.kind === "UNIT_SACRIFICED") sacrificed.add(event.victimUnitId);
    if (
      event.kind !== "UNIT_DIED" ||
      event.cause === "ELIMINATION" ||
      event.cause === "BRAIN_LOST" ||
      sacrificed.has(event.unitId)
    )
      continue;
    const unit = facts.get(event.unitId);
    if (
      unit === undefined ||
      isNeutralOwnerV7(unit.ownerId) ||
      !active.has(unit.ownerId) ||
      !unitRoleRuleV7(before, unit).abilities.includes("MARTYR")
    )
      continue;
    const amount = unitRoleMechanicsV7(before, unit).martyrFavour;
    if (amount <= 0) continue;
    cult = withFavourGainedV7(cult, unit.ownerId, amount);
    out.push(favourGainedEventV7(cult, unit.ownerId, "MARTYR", amount));
    paid = true;
  }
  return paid
    ? { state: { ...after, cult }, events: out }
    : { state: after, events };
}

function visibleTo(state: GameStateV7, viewerId: PlayerId, unit: UnitStateV7) {
  if (unit.ownerId === viewerId) return true;
  return (
    state.players
      .find((player) => player.id === viewerId)
      ?.explored.some((at) => same(at, unit.at)) === true
  );
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
