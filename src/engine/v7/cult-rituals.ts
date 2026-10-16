import {
  allocateUnitId,
  type CityId,
  type PlayerId,
  type UnitId,
} from "../model/ids";
import {
  CULT_SUMMONED_ROLE_RULES_V7,
  PROCLAIM_RANGE_V7,
  RITUAL_MINIMUM_CHANTERS_V7,
  STARFALL_MAXIMUM_RANGE_V7,
  STARFALL_MINIMUM_RANGE_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  isMindControlledV7,
  primaryActionBlockedAfterMoveV7,
  starfallDamageV7,
  summonedUnitRoleRuleV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitIsFrozenV7,
  unitIsSummonedV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type FrozenLookupV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { isLivingUnitV7 } from "./afflictions";
import type { CommandV7 } from "./commands";
import {
  favourGainedEventV7,
  favourOfV7,
  isRobedCultistV7,
  sacrificeFavourV7,
  seizeFavourV7,
  unitIsBrokenV7,
  withFavourGainedV7,
  withFavourSpentV7,
  type CultLookupV7,
  type CultReducerKitV7,
} from "./cult";
import { unitIsFrogV7, type TrickListsV7 } from "./cult-hexes";
import {
  cultDisruptionsV7,
  disruptingStatusKeysV7,
  summonTileLegalV7,
  unitDisruptionCausesV7,
  type DisruptionStateV7,
} from "./cult-channel";
import { attackAllowanceV7 } from "./dwarf";
import { arePlayersHostileV7, recomputeLiveEconomyV7 } from "./economy";
import type {
  CombatSplashEntryV7,
  DomainEventV7,
  RitualFizzleReasonV7,
} from "./events";
import {
  canonicalGiantTileFactsV7,
  fixedSignatureHitV7,
  resolveFixedHitsV7,
  type GiantTileFactsV7,
} from "./giants";
import { releaseControlledV7 } from "./martian";
import { unitSightRadiusAtV7 } from "./movement";
import type { ApplyCommandResultV7 } from "./reducer";
import { recordScoreCreditsV7 } from "./score";
import { tileAtV7 } from "./spatial-economy";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type CowedCityV7,
  type CultStateV7,
  type GameStateV7,
  type RitualKindV7,
  type RitualV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { barricadeAtV7, barricadesOfV7, moundAtV7 } from "./units";

/**
 * The Cultists of the Ancient Ones, rituals and the Herald
 * (`pulp_wars-mch9.7`, the fifth Cult engine bead;
 * docs/product/RULESET_7_CULTISTS.md sections 7, 4.2, and 8.6): the ritual
 * frame (a leader and its chanters, the countdown to the seat's next Start
 * Turn, the one disruption rule), Star-fall, the Great Summoning (consume or
 * block) and the Herald's arrival, and the Herald's Proclaim with the Cowed
 * city. (Ravage and Unstoppable are role mechanics the combat rules read:
 * `ravageAttacks`, `ignoresFortification`, `immovable`, and
 * `unitIsUnstoppableV7` in src/engine/rules/ruleset-v7.ts.)
 *
 * The legality helpers read only facts that canonical state and a player's
 * view share, so the public command query and the reducer agree exactly.
 */

/** The unit facts the ritual helpers read (state and public units). */
export interface RitualUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}
type ActorFactsV7 = RitualUnitFactsV7 & {
  readonly activation: UnitActivationV7;
};

/**
 * The tile facts a ritual reads: the placement facts of the giants' rules
 * and whether something that is not a unit (a mound or a Barricade) stands
 * on a tile. A unit on the Great Summoning's mark does not make the mark
 * illegal: it is consumed, or it blocks the arrival (section 7.3).
 */
export interface RitualTileFactsV7 extends GiantTileFactsV7 {
  readonly obstacle: (at: CoordV7) => boolean;
}

/** The canonical tile facts of the seat `actor`. */
export function canonicalRitualTileFactsV7(
  state: GameStateV7,
  actor: PlayerId,
): RitualTileFactsV7 {
  return {
    ...canonicalGiantTileFactsV7(state, actor),
    obstacle: (at) =>
      moundAtV7(state, at) !== undefined ||
      barricadeAtV7(state, at) !== undefined,
  };
}

// ---------------------------------------------------------- The frame ---

/**
 * Section 7.1: a ritual's primary action is refused when the unit has used
 * one or has a continuation waiting.
 */
function primaryActedV7(unit: ActorFactsV7): boolean {
  return (
    unit.activation.overrunActive ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

/**
 * Section 7.1: the circle around `leader`: the leader's own robed cultists
 * (in land form, with Channel, so never a mind-controlled unit) on the
 * eight tiles around it that have not used a primary action (they may have
 * moved) and are not Frozen or frogs (`pulp_wars-mch9.8`), in unit-ID
 * order. Every such unit joins a Great Summoning at its begin; a player who
 * wants one left out uses it first. A Star-fall begins with nobody (the
 * Cult redesign, `pulp_wars-mch9.34`: {@link beginChantersV7}).
 */
export function ritualChantersV7<U extends ActorFactsV7>(
  lookup: FrozenLookupV7 & TrickListsV7,
  units: readonly U[],
  leader: RitualUnitFactsV7,
): readonly U[] {
  return units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.id !== leader.id &&
        unit.ownerId === leader.ownerId &&
        chebyshev(unit.at, leader.at) === 1 &&
        isRobedCultistV7(lookup, unit) &&
        unitRoleRuleV7(lookup, unit).abilities.includes("CHANNEL") &&
        !primaryActedV7(unit) &&
        !unitIsFrozenV7(lookup, unit) &&
        !unitIsFrogV7(lookup, unit),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The chanters the ritual `ritual` led by `leader` begins with: the circle
 * ({@link ritualChantersV7}) for the Great Summoning, nobody for a
 * Star-fall (the Cult redesign, `pulp_wars-mch9.34`, section 8.2: the
 * Stargazer casts alone and cultists join with `JOIN_CHANT`).
 */
export function beginChantersV7<U extends ActorFactsV7>(
  lookup: FrozenLookupV7 & TrickListsV7,
  units: readonly U[],
  leader: RitualUnitFactsV7,
  ritual: RitualKindV7,
): readonly U[] {
  return ritual === "STARFALL" ? [] : ritualChantersV7(lookup, units, leader);
}

/**
 * Section 7.4: whether a Stargazer on `from` may mark `at`: a tile its seat
 * has explored (any terrain: a star falls on water too), 2 to 4 tiles away.
 */
export function starfallMarkLegalV7(
  facts: Pick<GiantTileFactsV7, "tile">,
  from: CoordV7,
  at: CoordV7,
): boolean {
  const distance = chebyshev(from, at);
  return (
    distance >= STARFALL_MINIMUM_RANGE_V7 &&
    distance <= STARFALL_MAXIMUM_RANGE_V7 &&
    facts.tile(at) !== undefined
  );
}

/**
 * Section 7.3: whether the Herald of `actor` could stand on `at`, a unit on
 * it aside: a tile the seat knows, land (never water or ice), not a
 * settlement center, with no mound, Barricade, treasure chest, or
 * curiosity, a terrain the Herald enters (it strides), and not in territory
 * allied to the actor.
 */
export function heraldMarkLegalV7(
  facts: RitualTileFactsV7,
  actor: PlayerId,
  at: CoordV7,
): boolean {
  return summonTileLegalV7(
    { ...facts, occupied: facts.obstacle },
    actor,
    "HERALD",
    at,
  );
}

/** The ability a ritual's leader needs (section 7.2). */
export function ritualLeaderAbilityV7(
  ritual: RitualKindV7,
): "STARFALL" | "SUMMON" {
  return ritual === "STARFALL" ? "STARFALL" : "SUMMON";
}

/** What a ritual costs in Favour when it begins (section 7.2). */
export function ritualFavourCostV7(ritual: RitualKindV7): number {
  return ritual === "GREAT_SUMMONING"
    ? (CULT_SUMMONED_ROLE_RULES_V7.HERALD.favourCost ?? 0)
    : 0;
}

export type BeginRitualRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | { readonly code: "TECH_REQUIRED" }
  | { readonly code: "INSUFFICIENT_FAVOUR"; readonly cost: number }
  | {
      readonly code: "RITUAL_NOT_LEGAL";
      readonly reason: "EMBARKED" | "MOVED" | "CHANTERS" | "TILE";
    };

/**
 * Sections 7.1, 7.3, and 7.4, shared by the reducer and the public command
 * query: the first reason `leader` may not begin the ritual `ritual` with
 * its mark on `at`, or null. `seat` is the leader's seat: its Favour and
 * whether it has The Stars Are Right.
 *
 * The leader is a land-form unit with the rite's ability (Star-fall: the
 * Stargazer's `STARFALL`; the Great Summoning: the Summoner's `SUMMON`, with
 * its seat's `greatSummoning`; a mind-controlled unit has neither) that has
 * not used a primary action. A Stargazer must not have moved this turn. It
 * needs the rite's chanters ({@link beginChantersV7}: a Star-fall none),
 * the rite's Favour, and a legal mark.
 */
export function beginRitualRejectionV7<U extends ActorFactsV7>(
  lookup: FrozenLookupV7 & TrickListsV7,
  facts: RitualTileFactsV7,
  seat: { readonly favour: number; readonly greatSummoning: boolean },
  units: readonly U[],
  leader: ActorFactsV7,
  ritual: RitualKindV7,
  at: CoordV7,
): BeginRitualRejectionV7 | null {
  if (
    !unitRoleRuleV7(lookup, leader).abilities.includes(
      ritualLeaderAbilityV7(ritual),
    )
  )
    return { code: "UNIT_ROLE_INVALID" };
  if (!isRobedCultistV7(lookup, leader))
    return { code: "RITUAL_NOT_LEGAL", reason: "EMBARKED" };
  if (ritual === "GREAT_SUMMONING" && !seat.greatSummoning)
    return { code: "TECH_REQUIRED" };
  if (
    primaryActedV7(leader) ||
    (ritual === "GREAT_SUMMONING" &&
      primaryActionBlockedAfterMoveV7(lookup, leader))
  )
    return { code: "UNIT_ALREADY_ACTED" };
  if (ritual === "STARFALL" && leader.activation.moved)
    return { code: "RITUAL_NOT_LEGAL", reason: "MOVED" };
  if (
    beginChantersV7(lookup, units, leader, ritual).length <
    RITUAL_MINIMUM_CHANTERS_V7[ritual]
  )
    return { code: "RITUAL_NOT_LEGAL", reason: "CHANTERS" };
  const cost = ritualFavourCostV7(ritual);
  if (seat.favour < cost) return { code: "INSUFFICIENT_FAVOUR", cost };
  if (
    ritual === "STARFALL"
      ? !starfallMarkLegalV7(facts, leader.at, at)
      : chebyshev(leader.at, at) !== 1 ||
        !heraldMarkLegalV7(facts, leader.ownerId, at)
  )
    return { code: "RITUAL_NOT_LEGAL", reason: "TILE" };
  return null;
}

// ----------------------------------------------------------- Star-fall ---

/** Section 7.4: the marked tile and the eight around it, in (y, x) order. */
export function starfallAreaV7(
  width: number,
  height: number,
  at: CoordV7,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (x >= 0 && y >= 0 && x < width && y < height) tiles.push({ x, y });
  return tiles;
}

/**
 * Section 7.4: the hits of a star of `damage` on `at` among `units`
 * (canonical units, or the units a viewer sees): every unit on the board on
 * the marked tile and the eight around it, of any side and form (a ship, an
 * embarked unit, an Egg, a daemon; a burrowed unit is in no list this
 * reads), each hit by the fixed damage: no Defense, fortification, cover,
 * Snow, or Blizzard; Armoured, Plated, and a Shield apply. Sorted by
 * (y, x, unitId).
 */
export function starfallResultsV7<U extends RitualUnitFactsV7>(
  roster: FactionRosterV7,
  shields: readonly { readonly unitId: UnitId; readonly shield: number }[],
  units: readonly U[],
  at: CoordV7,
  damage: number,
): readonly CombatSplashEntryV7[] {
  return units
    .filter((unit) => unit.hp > 0 && chebyshev(unit.at, at) <= 1)
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    )
    .map((unit) =>
      fixedSignatureHitV7(
        roster,
        unit,
        shields.find((entry) => entry.unitId === unit.id)?.shield ?? 0,
        damage,
      ),
    );
}

// ---------------------------------------------------- Join the chant ---

/**
 * A ritual as a join reads it: a canonical entry, or a viewer's public one
 * (its leader null when the viewer does not see it).
 */
export interface JoinableRitualV7 {
  readonly kind: RitualKindV7;
  readonly playerId: PlayerId;
  readonly leaderUnitId: UnitId | null;
  readonly chanterUnitIds: readonly UnitId[];
}

export type JoinChantRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | {
      readonly code: "JOIN_CHANT_NOT_LEGAL";
      readonly reason:
        "EMBARKED" | "CHANTING" | "ACTED" | "STATUS" | "RITUAL" | "ADJACENT";
    };

/**
 * The pending Star-fall of the seat `playerId` that the Stargazer
 * `leaderUnitId` leads, if any.
 */
export function pendingStarfallOfV7<R extends JoinableRitualV7>(
  rituals: readonly R[],
  playerId: PlayerId,
  leaderUnitId: UnitId,
): R | undefined {
  return rituals.find(
    (ritual) =>
      ritual.kind === "STARFALL" &&
      ritual.playerId === playerId &&
      ritual.leaderUnitId === leaderUnitId,
  );
}

/**
 * The Cult redesign (`pulp_wars-mch9.34`, RULESET_7_CULT_REDESIGN.md
 * section 8.2), shared by the reducer and the public command query: the
 * first reason the robed cultist `joiner` may not join the chant of the
 * Star-fall led by `leader` (the unit the command names, if it is on the
 * board), or null. The joiner has Join the chant (a robed role of a Cult
 * seat: a mind-controlled unit has none), stands in land form, is in no
 * ritual already, has not used its primary action (it may have moved), is
 * neither Frozen nor a frog, and stands on one of the eight tiles around a
 * Stargazer that leads a pending Star-fall of the joiner's seat. A star is
 * pending only from its begin to its seat's next Start Turn, so a join
 * happens in the casting turn.
 */
export function joinChantRejectionV7(
  lookup: FrozenLookupV7 & TrickListsV7,
  rituals: readonly JoinableRitualV7[],
  joiner: ActorFactsV7,
  leader: RitualUnitFactsV7 | undefined,
): JoinChantRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, joiner).abilities.includes("JOIN_CHANT"))
    return { code: "UNIT_ROLE_INVALID" };
  if (!isRobedCultistV7(lookup, joiner))
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "EMBARKED" };
  if (
    rituals.some(
      (ritual) =>
        ritual.leaderUnitId === joiner.id ||
        ritual.chanterUnitIds.includes(joiner.id),
    )
  )
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "CHANTING" };
  if (primaryActedV7(joiner))
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "ACTED" };
  if (unitIsFrozenV7(lookup, joiner) || unitIsFrogV7(lookup, joiner))
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "STATUS" };
  if (
    leader === undefined ||
    leader.hp <= 0 ||
    pendingStarfallOfV7(rituals, joiner.ownerId, leader.id) === undefined
  )
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "RITUAL" };
  if (chebyshev(joiner.at, leader.at) !== 1)
    return { code: "JOIN_CHANT_NOT_LEGAL", reason: "ADJACENT" };
  return null;
}

// ------------------------------------------------- The Great Summoning ---

/** What the unit on the Great Summoning's mark means for it (section 7.3). */
export type SummoningMarkOutcomeV7<U> =
  /** Nobody stands on the mark: the Herald arrives. */
  | { readonly kind: "FREE" }
  /** The unit on the mark is consumed for `favour`, and the Herald arrives. */
  | {
      readonly kind: "CONSUMES";
      readonly victim: U;
      /** A broken enemy (a kill credited to the leader), not an own unit. */
      readonly hostile: boolean;
      readonly favour: number;
    }
  /**
   * The arrival is blocked: by the unit on the mark (`unit`), or because
   * the Herald cannot stand on the tile any more (`unit` null).
   */
  | { readonly kind: "BLOCKED"; readonly unit: U | null };

/**
 * Section 7.3, shared by the Start Turn step and the public preview: what
 * happens on the mark `at` of a Great Summoning of the seat `playerId` as
 * the board stands. `units` are the units on the board (in a view, the
 * visible ones).
 *
 * **A legal victim is consumed:** an own unit that could be Sacrificed (in
 * land form, not a summoned unit, not mind-controlled, not Plagued or
 * Bitten), for its value; or a hostile unit that could be Seized, the
 * holder test waived (in land form, living, one-slot, not a reward giant,
 * not neutral, and broken), for twice its value. **Any other unit blocks
 * the arrival:** a healthy enemy, a giant, a two-slot unit, an Undead or
 * construct unit, a neutral unit, an Egg, a daemon, an allied unit, a
 * Plagued or Bitten own unit.
 */
export function summoningMarkOutcomeV7<U extends RitualUnitFactsV7>(
  lookup: CultLookupV7,
  facts: RitualTileFactsV7,
  units: readonly U[],
  playerId: PlayerId,
  at: CoordV7,
): SummoningMarkOutcomeV7<U> {
  if (!heraldMarkLegalV7(facts, playerId, at))
    return { kind: "BLOCKED", unit: null };
  const unit = units.find(
    (candidate) => candidate.hp > 0 && same(candidate.at, at),
  );
  if (unit === undefined) return { kind: "FREE" };
  if (unit.ownerId === playerId)
    return unit.form === "LAND" &&
      !unitIsSummonedV7(unit) &&
      !isMindControlledV7(lookup, unit.id) &&
      !lookup.plagued.some((entry) => entry.unitId === unit.id) &&
      !lookup.bitten.some((entry) => entry.unitId === unit.id)
      ? {
          kind: "CONSUMES",
          victim: unit,
          hostile: false,
          favour: sacrificeFavourV7(lookup, unit),
        }
      : { kind: "BLOCKED", unit };
  return arePlayersHostileV7(lookup, playerId, unit.ownerId) &&
    unit.form === "LAND" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unit.role !== "JUGGERNAUT" &&
    unitCapacitySlotsV7(lookup, unit) === 1 &&
    isLivingUnitV7(lookup, unit) &&
    unitIsBrokenV7(unit)
    ? {
        kind: "CONSUMES",
        victim: unit,
        hostile: true,
        favour: seizeFavourV7(lookup, unit),
      }
    : { kind: "BLOCKED", unit };
}

// ------------------------------------------------------------ Proclaim ---

/** Anything that carries the Cowed cities (state or view). */
export interface CowedLookupV7 {
  readonly cult?: { readonly cowed?: readonly CowedCityV7[] };
}

/**
 * Section 8.6: whether the city `cityId` is Cowed: it pays no income at its
 * owner's Start Turn and has no city action, until its owner's turn ends.
 */
export function isCityCowedV7(lookup: CowedLookupV7, cityId: CityId): boolean {
  const cowed = lookup.cult?.cowed;
  return (
    cowed !== undefined &&
    cowed.length > 0 &&
    cowed.some((entry) => entry.cityId === cityId)
  );
}

/**
 * Section 4.2, Ravage: the attacks the unit may still make this turn: its
 * allowance (`attackAllowanceV7`: the Herald's 2) less the attacks it made,
 * or 0 when it used another primary action. A Proclaim spends one.
 */
export function attacksLeftV7(
  roster: FactionRosterV7,
  unit: ActorFactsV7,
): number {
  if (
    unit.activation.overrunActive ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return 0;
  return Math.max(
    0,
    attackAllowanceV7(roster, unit) - unit.activation.attacksUsed,
  );
}

export type ProclaimRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "PROCLAIM_NOT_LEGAL";
      readonly reason: "CITY" | "RANGE" | "COWED";
    };

/**
 * Section 8.6, shared by the reducer and the public command query: the
 * first reason the Herald `herald` may not Proclaim at `city` (the city the
 * command names if its center is on a tile the actor has explored, else
 * undefined), or null. The Herald is a land-form unit with Proclaim that a
 * seat commands, with an attack left (it may have moved); the city is a
 * player's city hostile to that seat, within `PROCLAIM_RANGE_V7` tiles, and
 * not Cowed already.
 */
export function proclaimRejectionV7(
  lookup: FactionRosterV7 &
    CowedLookupV7 &
    Pick<GameStateV7, "setup" | "humanPlayerId">,
  herald: ActorFactsV7,
  city:
    | {
        readonly id: CityId;
        readonly ownerId: PlayerId;
        readonly at: CoordV7;
      }
    | undefined,
): ProclaimRejectionV7 | null {
  if (
    herald.form !== "LAND" ||
    !unitRoleRuleV7(lookup, herald).abilities.includes("PROCLAIM")
  )
    return { code: "UNIT_ROLE_INVALID" };
  if (attacksLeftV7(lookup, herald) === 0)
    return { code: "UNIT_ALREADY_ACTED" };
  if (
    city === undefined ||
    !arePlayersHostileV7(lookup, herald.ownerId, city.ownerId)
  )
    return { code: "PROCLAIM_NOT_LEGAL", reason: "CITY" };
  if (chebyshev(herald.at, city.at) > PROCLAIM_RANGE_V7)
    return { code: "PROCLAIM_NOT_LEGAL", reason: "RANGE" };
  if (isCityCowedV7(lookup, city.id))
    return { code: "PROCLAIM_NOT_LEGAL", reason: "COWED" };
  return null;
}

/**
 * Section 8.6: Cowed ends with its owner's turn. At `actor`'s End Turn each
 * Cowed city it owns counts down, and leaves the list at 0. Returns `state`
 * itself when nothing changes.
 */
export function withCowedTurnEndedV7(
  state: GameStateV7,
  actor: PlayerId,
): GameStateV7 {
  if (state.cult.cowed.length === 0) return state;
  const owned = new Set(
    state.cities
      .filter((city) => city.ownerId === actor)
      .map((city) => city.id),
  );
  if (!state.cult.cowed.some((entry) => owned.has(entry.cityId))) return state;
  return {
    ...state,
    cult: {
      ...state.cult,
      cowed: state.cult.cowed.flatMap((entry) =>
        !owned.has(entry.cityId)
          ? [entry]
          : entry.endsLeft > 1
            ? [{ ...entry, endsLeft: entry.endsLeft - 1 }]
            : [],
      ),
    },
  };
}

/**
 * Section 8.6: a Cowed city that changed hands in a command is Cowed no
 * more (the cellars are its old owner's fear). `cult` of `after` without
 * the entries of cities whose owner differs from `before`'s; `after.cult`
 * itself when nothing changes.
 */
export function cowedAfterCapturesV7(
  before: Pick<GameStateV7, "cities">,
  after: Pick<GameStateV7, "cities" | "cult">,
): CultStateV7 {
  if (after.cult.cowed.length === 0) return after.cult;
  const cowed = after.cult.cowed.filter((entry) => {
    const now = after.cities.find((city) => city.id === entry.cityId);
    const was = before.cities.find((city) => city.id === entry.cityId);
    return (
      now !== undefined && (was === undefined || was.ownerId === now.ownerId)
    );
  });
  return cowed.length === after.cult.cowed.length
    ? after.cult
    : { ...after.cult, cowed };
}

// ----------------------------------------------------------- Disruption ---

/**
 * Section 7.1, "Breaking": the participants of the rituals of `before` that
 * were disrupted between `before` and `after` (the one rule of section 6.2,
 * `unitDisruptionCausesV7`: Hit Points lost, moved by anything but its own
 * command, a status, another owner, or off the board; Behold! does not
 * apply to rituals) leave their ritual (`RITUAL_DISRUPTED`). A ritual whose
 * leader left, or that has fewer chanters than it needs, fizzles at once
 * (`RITUAL_FIZZLED`). Returns the events and the Cult state of `after` with
 * the rituals as they stand.
 *
 * `seats.onlySeat` judges only that seat's rituals (its Start Turn step);
 * `seats.skipSeat` leaves a seat out (the seat whose Start Turn step ran in
 * this command: its rituals were judged there, then completed).
 */
export function ritualDisruptionsV7(
  before: DisruptionStateV7,
  after: DisruptionStateV7,
  actingUnitId: UnitId | null,
  seats: {
    readonly onlySeat?: PlayerId;
    readonly skipSeat?: PlayerId | null;
  } = {},
): { readonly cult: CultStateV7; readonly events: readonly DomainEventV7[] } {
  const watched = before.cult.rituals.filter(
    (ritual) =>
      (seats.onlySeat === undefined || ritual.playerId === seats.onlySeat) &&
      ritual.playerId !== seats.skipSeat,
  );
  if (watched.length === 0) return { cult: after.cult, events: [] };
  const beforeStatuses = disruptingStatusKeysV7(before);
  const afterStatuses = disruptingStatusKeysV7(after);
  const events: DomainEventV7[] = [];
  let rituals = after.cult.rituals;
  for (const ritual of watched) {
    const now = after.cult.rituals.find(
      (candidate) =>
        candidate.leaderUnitId === ritual.leaderUnitId &&
        candidate.kind === ritual.kind &&
        candidate.playerId === ritual.playerId,
    );
    const gone = new Set<UnitId>();
    for (const unitId of [ritual.leaderUnitId, ...ritual.chanterUnitIds]) {
      const cause = unitDisruptionCausesV7(
        before,
        after,
        beforeStatuses,
        afterStatuses,
        unitId,
        actingUnitId,
      )[0];
      if (cause === undefined) continue;
      gone.add(unitId);
      events.push({
        kind: "RITUAL_DISRUPTED",
        playerId: ritual.playerId,
        ritual: ritual.kind,
        unitId: ritual.leaderUnitId,
        participantUnitId: unitId,
        cause,
      });
    }
    // The chanters as the ritual stands after the command (a cultist that
    // joined in it, `pulp_wars-mch9.34`, included), less the disrupted.
    const chanterUnitIds = (
      now?.chanterUnitIds ?? ritual.chanterUnitIds
    ).filter((unitId) => !gone.has(unitId));
    if (
      gone.size === 0 &&
      now !== undefined &&
      chanterUnitIds.length === now.chanterUnitIds.length
    )
      continue;
    const reason: RitualFizzleReasonV7 | null = gone.has(ritual.leaderUnitId)
      ? "LEADER"
      : chanterUnitIds.length < RITUAL_MINIMUM_CHANTERS_V7[ritual.kind] ||
          now === undefined
        ? "CHANTERS"
        : null;
    rituals = rituals.filter(
      (candidate) => candidate.leaderUnitId !== ritual.leaderUnitId,
    );
    if (reason === null)
      rituals = [...rituals, { ...(now ?? ritual), chanterUnitIds }];
    else
      events.push({
        kind: "RITUAL_FIZZLED",
        playerId: ritual.playerId,
        ritual: ritual.kind,
        unitId: ritual.leaderUnitId,
        at: { x: ritual.at.x, y: ritual.at.y },
        reason,
      });
  }
  return {
    cult: {
      ...after.cult,
      rituals: [...rituals].sort(
        (left, right) => left.leaderUnitId - right.leaderUnitId,
      ),
    },
    events,
  };
}

/**
 * The structural half of the ritual lists (every reducer output runs
 * through it before validation, with `prunedChannelV7`): a ritual needs its
 * seat (an active one), its leader (a land-form robed cultist of the seat on
 * the board with the rite's ability), and at least the rite's chanters,
 * each a land-form robed cultist of the seat next to the leader; a Cowed
 * entry needs its city. What it drops is reported at the end of the command
 * by {@link ritualDisruptionsV7}, which reads the state before the command.
 */
export function prunedRitualsV7(state: GameStateV7): GameStateV7 {
  const cult = state.cult;
  if (cult.rituals.length === 0 && cult.cowed.length === 0) return state;
  const unitById = new Map(
    state.units.filter((unit) => unit.hp > 0).map((unit) => [unit.id, unit]),
  );
  let changed = false;
  const rituals = cult.rituals.flatMap((ritual): RitualV7[] => {
    const leader = unitById.get(ritual.leaderUnitId);
    const member = (unit: UnitStateV7 | undefined): unit is UnitStateV7 =>
      unit !== undefined &&
      unit.ownerId === ritual.playerId &&
      isRobedCultistV7(state, unit);
    const chanterUnitIds = member(leader)
      ? ritual.chanterUnitIds.filter((unitId) => {
          const chanter = unitById.get(unitId);
          return member(chanter) && chebyshev(chanter.at, leader.at) === 1;
        })
      : [];
    if (
      !member(leader) ||
      !unitRoleRuleV7(state, leader).abilities.includes(
        ritualLeaderAbilityV7(ritual.kind),
      ) ||
      chanterUnitIds.length < RITUAL_MINIMUM_CHANTERS_V7[ritual.kind] ||
      !state.players.some(
        (player) => player.id === ritual.playerId && player.status === "ACTIVE",
      )
    ) {
      changed = true;
      return [];
    }
    if (chanterUnitIds.length === ritual.chanterUnitIds.length) return [ritual];
    changed = true;
    return [{ ...ritual, chanterUnitIds }];
  });
  const cowed = cult.cowed.filter((entry) =>
    state.cities.some((city) => city.id === entry.cityId),
  );
  return !changed && cowed.length === cult.cowed.length
    ? state
    : { ...state, cult: { ...cult, rituals, cowed } };
}

// ----------------------------------------------------- Reducer steps ---

type BeginRitualCommandV7 = Extract<CommandV7, { kind: "BEGIN_RITUAL" }>;
type JoinChantCommandV7 = Extract<CommandV7, { kind: "JOIN_CHANT" }>;
type ProclaimCommandV7 = Extract<CommandV7, { kind: "PROCLAIM" }>;

/** Marks a unit as having used its primary action. */
function withPrimaryUsed(unit: UnitStateV7): UnitStateV7 {
  return {
    ...unit,
    activation: { ...unit.activation, specialActed: true, handled: true },
  };
}

/**
 * Sections 7.1, 7.3, and 7.4: `BEGIN_RITUAL`, a primary action of the
 * leader that spends the primary action of every chanter too (a Star-fall
 * begins with none: the Cult redesign, `pulp_wars-mch9.34`). A Great
 * Summoning pays its Favour now (`FAVOUR_SPENT`); nothing is refunded
 * when a ritual fizzles. `RITUAL_BEGUN` names the chanters and the mark;
 * the ritual completes at the seat's next Start Turn.
 */
export function applyBeginRitualV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: BeginRitualCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const leader = actorCheck.unit;
  const player = kit.requirePlayer(state, actor);
  const rejection = beginRitualRejectionV7(
    state,
    canonicalRitualTileFactsV7(state, actor),
    {
      favour: favourOfV7(state, actor),
      greatSummoning: technologyCapabilitiesV7(
        player.researchedTechs,
        player.faction,
      ).greatSummoning,
    },
    state.units,
    leader,
    command.ritual,
    command.at,
  );
  if (rejection !== null)
    switch (rejection.code) {
      case "UNIT_ROLE_INVALID":
        return kit.rejected(original, "UNIT_ROLE_INVALID", {
          role: leader.role,
        });
      case "UNIT_ALREADY_ACTED":
        return kit.rejected(original, "UNIT_ALREADY_ACTED", {
          unitId: leader.id,
        });
      case "TECH_REQUIRED":
        return kit.rejected(original, "TECH_REQUIRED", { tech: "EXPLOSIVES" });
      case "INSUFFICIENT_FAVOUR":
        return kit.rejected(original, "INSUFFICIENT_FAVOUR", {
          cost: rejection.cost,
        });
      default:
        return kit.rejected(original, "RITUAL_NOT_LEGAL", {
          reason: rejection.reason,
        });
    }
  try {
    const chanters = beginChantersV7(
      state,
      state.units,
      leader,
      command.ritual,
    );
    const chanterUnitIds = chanters.map((unit) => unit.id);
    const events: DomainEventV7[] = [];
    const cost = ritualFavourCostV7(command.ritual);
    let cult = state.cult;
    if (cost > 0) {
      cult = withFavourSpentV7(cult, actor, cost);
      events.push({
        kind: "FAVOUR_SPENT",
        playerId: actor,
        purpose: "GREAT_SUMMONING",
        amount: cost,
        favour: favourOfV7({ cult }, actor),
      });
    }
    const at = { x: command.at.x, y: command.at.y };
    events.push({
      kind: "RITUAL_BEGUN",
      playerId: actor,
      ritual: command.ritual,
      unitId: leader.id,
      chanterUnitIds,
      at,
    });
    const participants = new Set<UnitId>([leader.id, ...chanterUnitIds]);
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          participants.has(unit.id) ? withPrimaryUsed(unit) : unit,
        ),
        cult: {
          ...cult,
          rituals: [
            ...cult.rituals,
            {
              kind: command.ritual,
              playerId: actor,
              leaderUnitId: leader.id,
              chanterUnitIds,
              at,
            },
          ].sort((left, right) => left.leaderUnitId - right.leaderUnitId),
        },
      }),
      events,
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * The Cult redesign (`pulp_wars-mch9.34`, section 8.2): `JOIN_CHANT`, a
 * primary action of the joiner (it cannot move after it). It becomes a
 * chanter of the Stargazer's pending Star-fall (Candlelit, public, and 3
 * more damage), and `CHANT_JOINED` names the star's damage after the join.
 * It pays no Favour. A disrupted joiner leaves the ritual as any chanter
 * does ({@link ritualDisruptionsV7}).
 */
export function applyJoinChantV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: JoinChantCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const joiner = actorCheck.unit;
  const leader = state.units.find(
    (unit) => unit.id === command.leaderUnitId && unit.hp > 0,
  );
  const rejection = joinChantRejectionV7(
    state,
    state.cult.rituals,
    joiner,
    leader,
  );
  if (rejection !== null)
    return rejection.code === "UNIT_ROLE_INVALID"
      ? kit.rejected(original, "UNIT_ROLE_INVALID", { role: joiner.role })
      : kit.rejected(original, "JOIN_CHANT_NOT_LEGAL", {
          reason: rejection.reason,
        });
  const ritual = pendingStarfallOfV7(
    state.cult.rituals,
    actor,
    command.leaderUnitId,
  );
  if (ritual === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const chanterUnitIds = [...ritual.chanterUnitIds, joiner.id].sort(
      (left, right) => left - right,
    );
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          unit.id === joiner.id ? withPrimaryUsed(unit) : unit,
        ),
        cult: {
          ...state.cult,
          rituals: state.cult.rituals.map((entry) =>
            entry === ritual ? { ...entry, chanterUnitIds } : entry,
          ),
        },
      }),
      [
        {
          kind: "CHANT_JOINED",
          playerId: actor,
          unitId: joiner.id,
          leaderUnitId: ritual.leaderUnitId,
          damage: starfallDamageV7(chanterUnitIds.length),
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/**
 * Section 8.6: `PROCLAIM`, one of the bound Herald's two attacks (it may
 * follow the Move): the city is Cowed until the end of its owner's next
 * turn (`CITY_COWED`). It touches no unit.
 */
export function applyProclaimV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: ProclaimCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const herald = actorCheck.unit;
  const named = state.cities.find((city) => city.id === command.cityId);
  // A city is a target only when the actor knows it, as in its view.
  const city =
    named !== undefined &&
    kit.requirePlayer(state, actor).explored.some((at) => same(at, named.at))
      ? named
      : undefined;
  const rejection = proclaimRejectionV7(state, herald, city);
  if (rejection !== null)
    switch (rejection.code) {
      case "UNIT_ROLE_INVALID":
        return kit.rejected(original, "UNIT_ROLE_INVALID", {
          role: herald.role,
        });
      case "UNIT_ALREADY_ACTED":
        return kit.rejected(original, "UNIT_ALREADY_ACTED", {
          unitId: herald.id,
        });
      default:
        return kit.rejected(original, "PROCLAIM_NOT_LEGAL", {
          reason: rejection.reason,
        });
    }
  if (city === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const attacksUsed = kit.nextSafe(herald.activation.attacksUsed);
    const spent: UnitStateV7 = {
      ...herald,
      captureEligible: false,
      activation: {
        ...herald.activation,
        attacked: true,
        attacksUsed,
        handled: attackAllowanceV7(state, herald) <= attacksUsed,
      },
    };
    return kit.accepted(
      kit.checked({
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          unit.id === herald.id ? spent : unit,
        ),
        cult: {
          ...state.cult,
          cowed: [...state.cult.cowed, { cityId: city.id, endsLeft: 1 }].sort(
            (left, right) => left.cityId - right.cityId,
          ),
        },
      }),
      [
        {
          kind: "CITY_COWED",
          playerId: actor,
          unitId: herald.id,
          cityId: city.id,
          cityOwnerId: city.ownerId,
          at: { x: city.at.x, y: city.at.y },
        },
      ],
    );
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

// ----------------------------------------------------- The Start Turn ---

/**
 * Section 7.4: a star lands. Every unit in the area takes the star's fixed
 * damage (`STAR_FELL`), every Field Defense (`FIELD_DEFENSE_DESTROYED`
 * reason `STARFALL`) and Barricade in it is destroyed, and the deaths follow
 * as `STARFALL` deaths credited to the Stargazer (its kills and Promotion
 * for hostile ones, the Score, Plunder; Graves, risings, Crumbs, and death
 * blasts as for any splash death). No retaliation.
 */
function completeStarfallV7(
  kit: CultReducerKitV7,
  state: GameStateV7,
  ritual: RitualV7,
  events: DomainEventV7[],
): GameStateV7 {
  const chanters = ritual.chanterUnitIds.length;
  const damage = starfallDamageV7(chanters);
  const area = starfallAreaV7(state.board.width, state.board.height, ritual.at);
  const results = starfallResultsV7(
    state,
    state.shields,
    state.units,
    ritual.at,
    damage,
  );
  const fieldDefenses = area.filter(
    (at) => tileAtV7(state.board, at)?.fieldDefense === true,
  );
  const standing = barricadesOfV7(state);
  const barricades = area.filter((at) =>
    standing.some((entry) => same(entry.at, at)),
  );
  events.push({
    kind: "STAR_FELL",
    playerId: ritual.playerId,
    unitId: ritual.leaderUnitId,
    at: { x: ritual.at.x, y: ritual.at.y },
    chanters,
    damage,
    results,
    fieldDefenses,
    barricades,
  });
  let board = state.board;
  for (const at of fieldDefenses) {
    const tile = tileAtV7(board, at);
    if (tile === undefined) throw new RangeError("INVALID_STATE");
    board = kit.replaceTile({ ...state, board }, at, {
      ...tile,
      fieldDefense: false,
    });
    events.push({ kind: "FIELD_DEFENSE_DESTROYED", at, reason: "STARFALL" });
  }
  return resolveFixedHitsV7(
    kit,
    {
      ...state,
      board,
      barricades:
        barricades.length === 0
          ? state.barricades
          : standing.filter(
              (entry) => !barricades.some((at) => same(entry.at, at)),
            ),
    },
    ritual.leaderUnitId,
    results,
    "STARFALL",
    events,
  );
}

/**
 * Section 7.3: the Great Summoning completes. The unit on the mark decides
 * it ({@link summoningMarkOutcomeV7}): a legal victim is consumed
 * (`UNIT_CONSUMED`, `UNIT_DIED` cause `CONSUMED`, `FAVOUR_GAINED` source
 * `CONSUMPTION`; a broken enemy is a kill credited to the leader; nothing
 * is left of it, as for a Sacrifice), any other unit blocks the arrival
 * (`RITUAL_FIZZLED` reason `BLOCKED`; the Favour is gone). Then the Herald
 * stands on the mark at full HP, exhausted for the turn (`HERALD_ARRIVED`),
 * and the leader and every remaining chanter channel it at once
 * (`STRAND_FORMED`, in unit-ID order), which spends their whole turn.
 */
function completeGreatSummoningV7(
  kit: CultReducerKitV7,
  state: GameStateV7,
  ritual: RitualV7,
  events: DomainEventV7[],
): GameStateV7 {
  const playerId = ritual.playerId;
  const at = { x: ritual.at.x, y: ritual.at.y };
  const outcome = summoningMarkOutcomeV7(
    state,
    canonicalRitualTileFactsV7(state, playerId),
    state.units,
    playerId,
    at,
  );
  if (outcome.kind === "BLOCKED") {
    events.push({
      kind: "RITUAL_FIZZLED",
      playerId,
      ritual: ritual.kind,
      unitId: ritual.leaderUnitId,
      at,
      reason: "BLOCKED",
    });
    return state;
  }
  let units = state.units;
  let cult = state.cult;
  let burrowed = state.burrowed;
  let mindControlled = state.mindControlled;
  let chanterUnitIds = ritual.chanterUnitIds;
  if (outcome.kind === "CONSUMES") {
    const victim = outcome.victim;
    cult = withFavourGainedV7(cult, playerId, outcome.favour);
    // A consumed enemy is a kill like a Seizure's: the Score's Kills and
    // the victim's owner's Loss, without Plunder.
    if (outcome.hostile)
      recordScoreCreditsV7(state, [
        {
          creditedId: playerId,
          victimOwnerId: victim.ownerId,
          victimUnitId: victim.id,
        },
      ]);
    events.push(
      {
        kind: "UNIT_CONSUMED",
        playerId,
        unitId: ritual.leaderUnitId,
        victimUnitId: victim.id,
        victimOwnerId: victim.ownerId,
        role: victim.role,
        at,
        favour: outcome.favour,
      },
      { kind: "UNIT_DIED", unitId: victim.id, cause: "CONSUMED" },
      favourGainedEventV7(cult, playerId, "CONSUMPTION", outcome.favour),
    );
    chanterUnitIds = chanterUnitIds.filter((unitId) => unitId !== victim.id);
    const release = releaseControlledV7(
      units
        .filter((unit) => unit.id !== victim.id)
        .map((unit) => {
          if (unit.id !== ritual.leaderUnitId || !outcome.hostile) return unit;
          const kills = unit.kills + 1;
          if (!Number.isSafeInteger(kills))
            throw new RangeError("INTEGER_OVERFLOW");
          return { ...unit, kills };
        }),
      burrowed,
      mindControlled,
      state.players,
      events,
    );
    units = release.units;
    burrowed = release.burrowed;
    mindControlled = release.mindControlled;
  }
  const rule = summonedUnitRoleRuleV7("HERALD");
  const mechanicalRole = SUMMONED_MECHANICAL_ROLES_V7.HERALD;
  if (mechanicalRole === undefined) throw new RangeError("INVALID_STATE");
  const allocation = allocateUnitId(state.nextEntityId);
  const herald: UnitStateV7 = {
    id: allocation.id,
    ownerId: playerId,
    homeCityId: null,
    role: mechanicalRole,
    form: "LAND",
    at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: kit.exhaustedActivation(),
    summoned: "HERALD",
  };
  const channellers = [ritual.leaderUnitId, ...chanterUnitIds].sort(
    (left, right) => left - right,
  );
  events.push({
    kind: "HERALD_ARRIVED",
    playerId,
    unitId: ritual.leaderUnitId,
    chanterUnitIds,
    daemonUnitId: herald.id,
    at,
    hp: herald.hp,
  });
  for (const unitId of channellers)
    events.push({
      kind: "STRAND_FORMED",
      playerId,
      unitId,
      daemonUnitId: herald.id,
    });
  const placed: GameStateV7 = {
    ...state,
    nextEntityId: allocation.nextEntityId,
    units: [
      ...units.map((unit) =>
        channellers.includes(unit.id)
          ? {
              ...unit,
              captureEligible: false,
              activation: kit.exhaustedActivation(),
            }
          : unit,
      ),
      herald,
    ],
    burrowed,
    mindControlled,
    cult: {
      ...cult,
      strands: [
        ...cult.strands.filter(
          (strand) => !channellers.includes(strand.cultistUnitId),
        ),
        ...channellers.map((cultistUnitId) => ({
          cultistUnitId,
          daemonUnitId: herald.id,
        })),
      ].sort((left, right) => left.cultistUnitId - right.cultistUnitId),
    },
  };
  const reveal = kit.revealRadius(
    placed,
    playerId,
    herald.at,
    unitSightRadiusAtV7(placed, herald),
  );
  if (reveal.revealed.length > 0)
    events.push({
      kind: "TILES_REVEALED",
      playerId,
      tiles: reveal.revealed,
    });
  return {
    ...placed,
    players: kit.setExplored(placed.players, playerId, reveal.explored),
  };
}

/**
 * Sections 7.1 and 13.3: the ritual step of the Start Turn of `playerId`,
 * after the channel check and before Egg hatching. `original` is the state
 * the `END_TURN` began with.
 *
 * 1. The disruptions of the command so far (the neutral turn, Black Ice,
 *    the surfacing, Plague and its chains, the rampage of a daemon that
 *    just broke loose) take their participants out of the seat's rituals,
 *    and a ritual left without its leader or its chanters fizzles.
 * 2. Each ritual of the seat still under way completes, in leader unit-ID
 *    order: a star lands; the Great Summoning consumes or is blocked, and
 *    the Herald arrives. What one completion hurts is disrupted before the
 *    next ritual completes (a star on the seat's own second circle), and a
 *    strand of the Herald's arrival that a later star breaks is broken for
 *    the next check.
 * 3. The live economy follows what the step did to the board.
 *
 * Returns the state itself and no event for a seat with no ritual.
 */
export function resolveStartTurnRitualsV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const mine = (cult: CultStateV7): readonly RitualV7[] =>
    cult.rituals.filter((ritual) => ritual.playerId === playerId);
  if (mine(state.cult).length === 0 && mine(original.cult).length === 0)
    return { state, events: [] };
  const events: DomainEventV7[] = [];
  const judged = ritualDisruptionsV7(original, state, null, {
    onlySeat: playerId,
  });
  events.push(...judged.events);
  let current: GameStateV7 =
    judged.cult === state.cult ? state : { ...state, cult: judged.cult };
  let completed = false;
  for (const { leaderUnitId } of mine(current.cult)) {
    const ritual = current.cult.rituals.find(
      (candidate) => candidate.leaderUnitId === leaderUnitId,
    );
    // An earlier completion of this step may have made it fizzle.
    if (ritual === undefined) continue;
    const before: GameStateV7 = {
      ...current,
      cult: {
        ...current.cult,
        rituals: current.cult.rituals.filter(
          (candidate) => candidate !== ritual,
        ),
      },
    };
    const done =
      ritual.kind === "STARFALL"
        ? completeStarfallV7(kit, before, ritual, events)
        : completeGreatSummoningV7(kit, before, ritual, events);
    completed = true;
    const strands = cultDisruptionsV7(before, done, null, null, events);
    events.push(...strands.events);
    const next: GameStateV7 =
      strands.cult === done.cult ? done : { ...done, cult: strands.cult };
    const circles = ritualDisruptionsV7(before, next, null, {
      onlySeat: playerId,
    });
    events.push(...circles.events);
    current =
      circles.cult === next.cult ? next : { ...next, cult: circles.cult };
  }
  if (!completed) return { state: current, events };
  const economy = recomputeLiveEconomyV7(
    current,
    { board: current.board, cities: current.cities, units: current.units },
    current.populationContributions,
  );
  events.push(...kit.economyAndGrowth(economy.changes));
  return {
    state: {
      ...current,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    },
    events,
  };
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
