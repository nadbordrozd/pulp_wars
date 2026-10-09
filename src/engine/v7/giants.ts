import { recordScoreCreditsV7 } from "./score";
import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  GINGERBREAD_MAN_VARIANT_V7,
  DIGEST_DAMAGE_V7,
  TOSS_MINIMUM_RANGE_V7,
  armouredDamageV7,
  canEnterTerrainV7,
  isIceAtV7,
  isMindControlledV7,
  primaryActionBlockedAfterMoveV7,
  seatRoleMechanicsV7,
  seatRoleRuleV7,
  unitCapacitySlotsV7,
  unitFactionV7,
  unitFliesV7,
  unitIsIceboundV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type FrozenLookupV7,
  type UnitRoleAbilityV7,
} from "../rules/ruleset-v7";
import {
  biteOfV7,
  recordBittenRisingV7,
  unitIsConstructV7,
} from "./afflictions";
import { unitIsCrashedV7, type SugarRushLookupV7 } from "./candy";
import type { CommandV7 } from "./commands";
import type { DwarfReducerKitV7 } from "./dwarf-reducer";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  recomputeLiveEconomyV7,
} from "./economy";
import type { CombatSplashEntryV7, DomainEventV7 } from "./events";
import {
  isExplodingUnitV7,
  resolveStateExplosionChainV7,
  type CreditedDeathV7,
} from "./explosions";
import { recordCombatDeathV7 } from "./graves";
import { grownUnitV7 } from "./growth";
import { INFECT_RISING_HP_V7 } from "./infect";
import {
  absorbHitV7,
  releaseControlledV7,
  shieldOfV7,
  withFullShieldsV7,
  withShieldDamageV7,
} from "./martian";
import { unitSightRadiusAtV7 } from "./movement";
import { unitIsImmovableV7 } from "./ninth-unit";
import { exhaustedActivationV7 } from "./plague";
import type { ApplyCommandResultV7 } from "./reducer";
import { noRisingAtV7 } from "./rift";
import { tileAtV7 } from "./spatial-economy";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type GameStateV7,
  type SwallowedEntryV7,
  type TechnologyIdV7,
  type TileStateV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { tileOccupiedV7 } from "./units";

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md): the shared
 * rules of the eight signature abilities of the faction giants (the
 * `JUGGERNAUT` role), and the `SWALLOW`, `TOSS`, `STOMP`, and `BREAK_OFF`
 * commands, the Start Turn digest, the fixed hits of a crush, a Stomp, and
 * a trample, and the bookkeeping of the held victims. The legality helpers
 * read only facts that canonical state and a player's view share, so the
 * public command query and the reducer agree exactly. The reducer passes
 * its shared helpers (the kit of the Dwarf commands).
 */
export type GiantsReducerKitV7 = DwarfReducerKitV7;

/** The eight signature ability literals (section 6.0, G3). */
export type GiantSignatureV7 = Extract<
  UnitRoleAbilityV7,
  | "CRUSH"
  | "SWALLOW"
  | "TOSS"
  | "STOMP"
  | "OVERSTRIDE"
  | "GLACIAL_SMASH"
  | "SIEGE_HAMMER"
  | "BREAK_OFF"
>;
export const GIANT_SIGNATURES_V7: readonly GiantSignatureV7[] = Object.freeze([
  "CRUSH",
  "SWALLOW",
  "TOSS",
  "STOMP",
  "OVERSTRIDE",
  "GLACIAL_SMASH",
  "SIEGE_HAMMER",
  "BREAK_OFF",
]);

/** The unit facts the signature helpers read (state and public units). */
export interface GiantUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}

/**
 * Section 6.0 (G3): the signature ability of the unit's role under its
 * kind, whatever its form, or null (every other role, and the neutral
 * Giant Spider, whose role rule has `ATTACK` only).
 */
export function giantSignatureV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): GiantSignatureV7 | null {
  const abilities = unitRoleRuleV7(roster, unit).abilities;
  return (
    GIANT_SIGNATURES_V7.find((ability) => abilities.includes(ability)) ?? null
  );
}

/**
 * Sections 6.0 (G2, G3): whether the unit has `signature` now: its role,
 * under its kind, has the ability literal and it is in land form (an
 * embarked giant has none).
 */
export function unitUsesSignatureV7(
  roster: FactionRosterV7,
  unit: Pick<GiantUnitFactsV7, "id" | "ownerId" | "role" | "form">,
  signature: GiantSignatureV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes(signature)
  );
}

/**
 * The number of a signature (section 6's role mechanics): the crush, Stomp,
 * or trample damage, the Swallow HP limit, the Toss range, the Glacial
 * Smash threshold, or the HP a Break Off tears off; 0 for the Siege Hammer
 * (it has no number) and for a unit without the signature.
 */
export function giantSignatureAmountV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): number {
  const signature = giantSignatureV7(roster, unit);
  if (signature === null) return 0;
  const mechanics = unitRoleMechanicsV7(roster, unit);
  switch (signature) {
    case "CRUSH":
      return mechanics.crushDamage;
    case "SWALLOW":
      return mechanics.swallowMaxHp;
    case "TOSS":
      return mechanics.tossRange;
    case "STOMP":
      return mechanics.stompDamage;
    case "OVERSTRIDE":
      return mechanics.trampleDamage;
    case "GLACIAL_SMASH":
      return mechanics.glacialSmashHp;
    case "SIEGE_HAMMER":
      return 0;
    case "BREAK_OFF":
      return mechanics.breakOffHp;
  }
}

/**
 * Fixed signature damage on one unit (section 6 notation): Armoured takes 1
 * off a hit of 2 or more and Plated caps it, then the Shield absorbs it
 * first; the HP part is capped at the unit's HP.
 */
export function fixedSignatureHitV7(
  roster: FactionRosterV7,
  unit: Pick<
    GiantUnitFactsV7,
    "id" | "ownerId" | "role" | "form" | "at" | "hp"
  >,
  shield: number,
  damage: number,
): CombatSplashEntryV7 {
  const hit = absorbHitV7(
    shield,
    unit.hp,
    armouredDamageV7(roster, unit, damage),
  );
  return {
    unitId: unit.id,
    at: { x: unit.at.x, y: unit.at.y },
    damage: hit.hpDamage,
    dies: hit.hpDamage >= unit.hp,
    shieldDamage: hit.shieldDamage,
  };
}

// ----------------------------------------------------- Crushing Shove ---

/**
 * Section 6.1: the crush damage of an `ATTACK` from `distance` by
 * `attacker`: its role's `crushDamage` for a land-form attacker whose role
 * has `CRUSH` attacking from distance 1, else 0.
 */
export function attackCrushDamageV7(
  roster: FactionRosterV7,
  attacker: Pick<GiantUnitFactsV7, "id" | "ownerId" | "role" | "form">,
  distance: number,
): number {
  if (distance !== 1 || !unitUsesSignatureV7(roster, attacker, "CRUSH"))
    return 0;
  return unitRoleMechanicsV7(roster, attacker).crushDamage;
}

/**
 * Section 6.1: a defender the Push rule never moves by its nature is never
 * crushed: an Egg, a Rock Hard unit, and an icebound unit.
 */
export function defenderCrushableV7(
  lookup: FactionRosterV7 & {
    readonly ice: readonly { readonly at: CoordV7 }[];
  },
  defender: Pick<GiantUnitFactsV7, "id" | "ownerId" | "role" | "form" | "at">,
): boolean {
  return (
    defender.form !== "EGG" &&
    !unitIsImmovableV7(lookup, defender) &&
    !unitIsIceboundV7(lookup, defender)
  );
}

/** Section 6.1: the tile a pushed defender would have gone to. */
export function crushBehindTileV7(
  attacker: CoordV7,
  defender: CoordV7,
): CoordV7 {
  return {
    x: defender.x + defender.x - attacker.x,
    y: defender.y + defender.y - attacker.y,
  };
}

/**
 * Section 6.1: the `crush` preview state: `NONE` without a crush (no
 * `CRUSH` attacker, a target that died in the exchange or cannot be
 * crushed, or a Push that happens), `UNKNOWN_BEHIND_FOG` exactly when the
 * Push preview is, otherwise `WILL_CRUSH`.
 */
export function crushStateV7(
  crushDamage: number,
  crushable: boolean,
  defenderDies: boolean,
  push: "WILL_PUSH" | "BLOCKED" | "UNKNOWN_BEHIND_FOG",
): "NONE" | "WILL_CRUSH" | "UNKNOWN_BEHIND_FOG" {
  if (crushDamage <= 0 || !crushable || defenderDies || push === "WILL_PUSH")
    return "NONE";
  return push === "UNKNOWN_BEHIND_FOG" ? "UNKNOWN_BEHIND_FOG" : "WILL_CRUSH";
}

// -------------------------------------------------------- Siege Hammer ---

/**
 * Section 6.7: whether an `ATTACK` from `distance` is a Siege Hammer blow:
 * a land-form attacker whose role has `SIEGE_HAMMER`, from distance 1.
 */
export function attackSiegeHammerV7(
  roster: FactionRosterV7,
  attacker: Pick<GiantUnitFactsV7, "id" | "ownerId" | "role" | "form">,
  distance: number,
): boolean {
  return (
    distance === 1 &&
    unitUsesSignatureV7(roster, attacker, "SIEGE_HAMMER") &&
    unitRoleMechanicsV7(roster, attacker).siegeHammer
  );
}

/**
 * Section 6.7: the city whose Walls a Siege Hammer blow on a target at `at`
 * tears down: the city whose center is `at`, owned by a player hostile to
 * the Titan's owner, that has Walls. Undefined otherwise.
 */
export function siegeHammerRazedCityV7<
  C extends {
    readonly at: CoordV7;
    readonly ownerId: PlayerId;
    readonly rewards: readonly { readonly reward: string }[];
    readonly wallsRazed?: true | undefined;
  },
>(
  cities: readonly C[],
  hostile: (ownerId: PlayerId) => boolean,
  at: CoordV7,
): C | undefined {
  return cities.find(
    (city) =>
      city.at.x === at.x &&
      city.at.y === at.y &&
      hostile(city.ownerId) &&
      city.wallsRazed !== true &&
      city.rewards.some((record) => record.reward === "WALLS"),
  );
}

// ------------------------------------------------------- Glacial Smash ---

/**
 * Section 6.6: the Shatter threshold of an `ATTACK` from `distance` by a
 * land-form unit whose role has `GLACIAL_SMASH` (the Frost Giant), or null
 * for every other attack (the owner's ordinary threshold applies).
 */
export function glacialSmashThresholdV7(
  roster: FactionRosterV7,
  attacker: Pick<GiantUnitFactsV7, "id" | "ownerId" | "role" | "form">,
  distance: number,
): number | null {
  if (distance !== 1 || !unitUsesSignatureV7(roster, attacker, "GLACIAL_SMASH"))
    return null;
  return unitRoleMechanicsV7(roster, attacker).glacialSmashHp;
}

// ------------------------------------------------------------ Shared ---

/** The activation facts of a primary action's readiness. */
interface PrimaryReadyFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly activation: UnitActivationV7;
}

/**
 * Section 6.0 (G4): a new primary action is refused when the unit has used
 * a primary action (a landing included: it exhausts the activation), has a
 * Ram or Sugar Frenzy continuation waiting, or is sluggish and has moved
 * (or may not act after moving).
 */
export function giantPrimaryUsedV7(
  lookup: FrozenLookupV7,
  unit: PrimaryReadyFactsV7,
): boolean {
  return (
    unit.activation.overrunActive ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed ||
    primaryActionBlockedAfterMoveV7(lookup, unit)
  );
}

/**
 * The tile facts a placement rule reads, from canonical state or from a
 * player's view (where only explored tiles are known; every unit and mound
 * on an explored tile is visible).
 */
export interface GiantTileFactsV7 {
  /** The tile when the actor knows it (explored), else undefined. */
  readonly tile: (at: CoordV7) =>
    | {
        readonly terrain: TileStateV7["terrain"];
        readonly biome: TileStateV7["biome"];
        readonly site: TileStateV7["site"];
        readonly fieldDefense: boolean;
        readonly territoryOwnerId: PlayerId | null;
      }
    | undefined;
  /** A unit of any owner or form, or a mound, is on the tile. */
  readonly occupied: (at: CoordV7) => boolean;
  readonly chest: (at: CoordV7) => boolean;
  readonly curiosity: (at: CoordV7) => boolean;
  readonly ice: (at: CoordV7) => boolean;
  /** The two players are cooperative allies. */
  readonly allied: (left: PlayerId, right: PlayerId) => boolean;
}

/** The canonical tile facts of the actor `actor`. */
export function canonicalGiantTileFactsV7(
  state: GameStateV7,
  actor: PlayerId,
): GiantTileFactsV7 {
  const player = state.players.find((candidate) => candidate.id === actor);
  const explored = new Set(
    (player?.explored ?? []).map((at) => at.y * state.board.width + at.x),
  );
  return {
    tile: (at) => {
      const tile = tileAtV7(state.board, at);
      if (tile === undefined || !explored.has(at.y * state.board.width + at.x))
        return undefined;
      return {
        terrain: tile.terrain,
        biome: tile.biome,
        site: tile.site,
        fieldDefense: tile.fieldDefense,
        territoryOwnerId:
          tile.territoryCityId === null
            ? null
            : (state.cities.find((city) => city.id === tile.territoryCityId)
                ?.ownerId ?? null),
      };
    },
    occupied: (at) => tileOccupiedV7(state, at),
    chest: (at) => state.treasureChests.some((chest) => same(chest, at)),
    curiosity: (at) => state.curiosities.some((item) => same(item.at, at)),
    ice: (at) => isIceAtV7(state, at),
    allied: (left, right) => arePlayersAlliedV7(state, left, right),
  };
}

/**
 * A free placement tile for a new or thrown ground unit of `actor`'s seat
 * of `role` (Goblin Toss and Break Off): known (explored), land or ice, no
 * unit of any owner or form, no mound, no chest, no curiosity, not a
 * settlement site when `noSite`, enterable by a ground unit of the role
 * under the actor's research, and not in territory allied to the actor.
 */
function placementTileLegalV7(
  roster: FactionRosterV7,
  facts: GiantTileFactsV7,
  actor: PlayerId,
  role: UnitRoleIdV7,
  researched: readonly TechnologyIdV7[],
  at: CoordV7,
  noSite: boolean,
): boolean {
  const tile = facts.tile(at);
  if (tile === undefined) return false;
  const ice = facts.ice(at);
  if (tile.biome === null && !ice) return false;
  if (noSite && tile.site !== null) return false;
  if (facts.occupied(at) || facts.chest(at) || facts.curiosity(at))
    return false;
  const mechanics = seatRoleMechanicsV7(roster, actor, role);
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: mechanics.movementMode,
      afloat: false,
      engineering: researched.includes("ENGINEERING"),
      navigation: researched.includes("NAVIGATION"),
      mountainBorn: mechanics.mountainBorn,
      ice,
    })
  )
    return false;
  return !(
    tile.territoryOwnerId !== null &&
    tile.territoryOwnerId !== actor &&
    facts.allied(actor, tile.territoryOwnerId)
  );
}

// ------------------------------------------------------------ Swallow ---

export type SwallowRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | {
      readonly code: "SWALLOW_NOT_LEGAL";
      readonly reason: "EMBARKED" | "FULL" | "TARGET" | "IMMUNE" | "TOO_BIG";
    }
  | { readonly code: "UNIT_ALREADY_ACTED" };

/**
 * Section 6.2, rows 2 to 8, shared by the reducer and the public command
 * query: the first reason the Abomination `holder` may not swallow
 * `target` (a unit named by the command if it is on the board and the
 * actor sees it, else undefined), or null. `swallowed` is the held-victim
 * list (canonical or public: the holder's own entry is always known).
 */
export function swallowRejectionV7(
  lookup: FactionRosterV7 &
    FrozenLookupV7 & {
      readonly setup: GameStateV7["setup"];
      readonly humanPlayerId: PlayerId;
      readonly ice: readonly { readonly at: CoordV7 }[];
    },
  swallowed: readonly { readonly holderUnitId: UnitId }[],
  holder: GiantUnitFactsV7 & { readonly activation: UnitActivationV7 },
  target: GiantUnitFactsV7 | undefined,
): SwallowRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, holder).abilities.includes("SWALLOW"))
    return { code: "UNIT_ROLE_INVALID" };
  if (holder.form !== "LAND")
    return { code: "SWALLOW_NOT_LEGAL", reason: "EMBARKED" };
  if (giantPrimaryUsedV7(lookup, holder)) return { code: "UNIT_ALREADY_ACTED" };
  if (swallowed.some((entry) => entry.holderUnitId === holder.id))
    return { code: "SWALLOW_NOT_LEGAL", reason: "FULL" };
  if (
    target === undefined ||
    target.hp <= 0 ||
    target.id === holder.id ||
    !arePlayersHostileV7(lookup, holder.ownerId, target.ownerId) ||
    chebyshev(holder.at, target.at) !== 1 ||
    target.form !== "LAND"
  )
    return { code: "SWALLOW_NOT_LEGAL", reason: "TARGET" };
  if (
    isNeutralOwnerV7(target.ownerId) ||
    target.role === "JUGGERNAUT" ||
    unitCapacitySlotsV7(lookup, target) !== 1 ||
    unitIsConstructV7(lookup, target) ||
    unitIsImmovableV7(lookup, target) ||
    unitIsIceboundV7(lookup, target) ||
    isMindControlledV7(lookup, target.id)
  )
    return { code: "SWALLOW_NOT_LEGAL", reason: "IMMUNE" };
  if (target.hp > unitRoleMechanicsV7(lookup, holder).swallowMaxHp)
    return { code: "SWALLOW_NOT_LEGAL", reason: "TOO_BIG" };
  return null;
}

/** The held entry of the holder `holderUnitId`, if any. */
export function swallowedByV7<E extends { readonly holderUnitId: UnitId }>(
  swallowed: readonly E[],
  holderUnitId: UnitId,
): E | undefined {
  if (swallowed.length === 0) return undefined;
  return swallowed.find((entry) => entry.holderUnitId === holderUnitId);
}

// -------------------------------------------------------- Goblin Toss ---

export type TossRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | {
      readonly code: "TOSS_NOT_LEGAL";
      readonly reason: "EMBARKED" | "PASSENGER" | "DESTINATION";
    }
  | { readonly code: "UNIT_ALREADY_ACTED" };

/**
 * Section 6.3, row 5: a landing exhausts the activation (moved, attacked,
 * recovered, captured, and a special action all at once); no other
 * sequence of one turn sets all of them on a unit that is still standing.
 */
export function unitLandedThisTurnV7(activation: UnitActivationV7): boolean {
  return (
    activation.moved &&
    activation.attacked &&
    activation.recovered &&
    activation.captured &&
    activation.specialActed
  );
}

/**
 * Section 6.3, rows 2 to 4, shared by the reducer and the public query:
 * the first reason the Troll may not throw at all, or null.
 */
export function tossActorRejectionV7(
  lookup: FactionRosterV7 & FrozenLookupV7,
  troll: GiantUnitFactsV7 & { readonly activation: UnitActivationV7 },
): TossRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, troll).abilities.includes("TOSS"))
    return { code: "UNIT_ROLE_INVALID" };
  if (troll.form !== "LAND")
    return { code: "TOSS_NOT_LEGAL", reason: "EMBARKED" };
  if (giantPrimaryUsedV7(lookup, troll)) return { code: "UNIT_ALREADY_ACTED" };
  return null;
}

/**
 * Section 6.3, row 5: whether `passenger` may be thrown by `troll`: another
 * unit of the actor on the board, of the Goblin kind and the `FIGHTER` role
 * (the Goblin), in land form, next to the Troll, not mind-controlled, and
 * not landed this turn.
 */
export function tossPassengerLegalV7(
  roster: FactionRosterV7,
  troll: GiantUnitFactsV7,
  passenger:
    (GiantUnitFactsV7 & { readonly activation: UnitActivationV7 }) | undefined,
): boolean {
  return (
    passenger !== undefined &&
    passenger.hp > 0 &&
    passenger.id !== troll.id &&
    passenger.ownerId === troll.ownerId &&
    passenger.role === "FIGHTER" &&
    passenger.form === "LAND" &&
    !isMindControlledV7(roster, passenger.id) &&
    unitFactionV7(roster, passenger) === "GOBLIN" &&
    chebyshev(passenger.at, troll.at) === 1 &&
    !unitLandedThisTurnV7(passenger.activation)
  );
}

/**
 * Section 6.3, row 6: whether the Goblin may land on `at`: 2 to the Troll's
 * Toss range from it, explored, no treasure chest or curiosity, and the
 * Push conditions for the Goblin (no unit, Egg, or mound, not a settlement
 * site, enterable by a Goblin under the actor's research, not a Rift, not
 * allied territory). Ice is ground for a land-form unit.
 */
export function tossDestinationLegalV7(
  roster: FactionRosterV7,
  facts: GiantTileFactsV7,
  troll: GiantUnitFactsV7,
  researched: readonly TechnologyIdV7[],
  at: CoordV7,
): boolean {
  const distance = chebyshev(troll.at, at);
  return (
    distance >= TOSS_MINIMUM_RANGE_V7 &&
    distance <= unitRoleMechanicsV7(roster, troll).tossRange &&
    placementTileLegalV7(
      roster,
      facts,
      troll.ownerId,
      "FIGHTER",
      researched,
      at,
      true,
    )
  );
}

/** The candidate landing tiles of a Troll at `at` (rings 2 and 3). */
export function tossCandidateTilesV7(
  width: number,
  height: number,
  at: CoordV7,
  range: number,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let y = at.y - range; y <= at.y + range; y += 1)
    for (let x = at.x - range; x <= at.x + range; x += 1) {
      const distance = Math.max(Math.abs(x - at.x), Math.abs(y - at.y));
      if (
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height &&
        distance >= TOSS_MINIMUM_RANGE_V7 &&
        distance <= range
      )
        tiles.push({ x, y });
    }
  return tiles;
}

// ------------------------------------------------------ Thunder Stomp ---

export type StompRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "STOMP_NOT_LEGAL"; readonly reason: "EMBARKED" | "MOVED" }
  | { readonly code: "UNIT_ALREADY_ACTED" };

/** Section 6.4: the Stomp legality after the ordinary unit errors. */
export function stompRejectionV7(
  lookup: FactionRosterV7 & FrozenLookupV7,
  unit: GiantUnitFactsV7 & { readonly activation: UnitActivationV7 },
): StompRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, unit).abilities.includes("STOMP"))
    return { code: "UNIT_ROLE_INVALID" };
  if (unit.form !== "LAND")
    return { code: "STOMP_NOT_LEGAL", reason: "EMBARKED" };
  if (
    unit.activation.overrunActive ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return { code: "UNIT_ALREADY_ACTED" };
  if (unit.activation.moved)
    return { code: "STOMP_NOT_LEGAL", reason: "MOVED" };
  return null;
}

/**
 * Section 6.4: the Stomp results of `unit` among `units` (canonical units,
 * or a player's visible units: every unit next to the Brontosaurus is on a
 * tile its owner explored): every unit on the eight tiles around it that is
 * on the board, hostile to its owner, in land form or an Egg, and does not
 * fly, each hit by the fixed Stomp damage, sorted by (y, x, unitId).
 */
export function stompResultsV7<U extends GiantUnitFactsV7>(
  lookup: FactionRosterV7 & {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
  },
  shields: readonly { readonly unitId: UnitId; readonly shield: number }[],
  units: readonly U[],
  unit: GiantUnitFactsV7,
): readonly CombatSplashEntryV7[] {
  const damage = unitRoleMechanicsV7(lookup, unit).stompDamage;
  return units
    .filter(
      (candidate) =>
        candidate.hp > 0 &&
        candidate.id !== unit.id &&
        chebyshev(candidate.at, unit.at) === 1 &&
        (candidate.form === "LAND" || candidate.form === "EGG") &&
        !unitFliesV7(lookup, candidate) &&
        arePlayersHostileV7(lookup, unit.ownerId, candidate.ownerId),
    )
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    )
    .map((candidate) =>
      fixedSignatureHitV7(
        lookup,
        candidate,
        shieldsOf(shields, candidate.id),
        damage,
      ),
    );
}

/** The eight tiles around `at` on a `width` x `height` board, in (y, x). */
export function ringTilesV7(
  width: number,
  height: number,
  at: CoordV7,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height
      )
        tiles.push({ x, y });
  return tiles;
}

// ---------------------------------------------------------- Break Off ---

export type BreakOffRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_CRASHED" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "BREAK_OFF_NOT_LEGAL";
      readonly reason: "EMBARKED" | "TOO_WEAK" | "NO_HOME" | "TILE";
    };

/**
 * Section 6.8 (as the user changed it on 2026-10-09), rows 2 to 7 (the
 * Giant itself), shared by the reducer and the public query: the first
 * reason, or null. The Giant needs more than `breakOffHp` (10) HP, so 11 or
 * more. `homeOwnerId` is the owner of the Giant's home city (null without
 * one). There is no slot rule: the two Gingerbread Men are placed even
 * when the home city is full, and count against it afterwards.
 */
export function breakOffActorRejectionV7(
  lookup: FactionRosterV7 & FrozenLookupV7 & SugarRushLookupV7,
  giant: GiantUnitFactsV7 & {
    readonly activation: UnitActivationV7;
    readonly homeCityId: number | null;
  },
  homeOwnerId: PlayerId | null,
): BreakOffRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, giant).abilities.includes("BREAK_OFF"))
    return { code: "UNIT_ROLE_INVALID" };
  if (unitIsCrashedV7(lookup, giant.id)) return { code: "UNIT_CRASHED" };
  if (giantPrimaryUsedV7(lookup, giant)) return { code: "UNIT_ALREADY_ACTED" };
  if (giant.form !== "LAND")
    return { code: "BREAK_OFF_NOT_LEGAL", reason: "EMBARKED" };
  if (giant.hp <= unitRoleMechanicsV7(lookup, giant).breakOffHp)
    return { code: "BREAK_OFF_NOT_LEGAL", reason: "TOO_WEAK" };
  if (giant.homeCityId === null || homeOwnerId !== giant.ownerId)
    return { code: "BREAK_OFF_NOT_LEGAL", reason: "NO_HOME" };
  return null;
}

/**
 * Section 6.8, row 8: one of the eight tiles around the Giant with no unit
 * of any owner or form, no mound, chest, or curiosity, enterable by a
 * Toffee Trooper (the actor's `FIGHTER`) under the actor's research, and
 * not allied territory (Re-bake's tile rule).
 */
export function breakOffTileLegalV7(
  roster: FactionRosterV7,
  facts: GiantTileFactsV7,
  giant: GiantUnitFactsV7,
  researched: readonly TechnologyIdV7[],
  at: CoordV7,
): boolean {
  return (
    chebyshev(giant.at, at) === 1 &&
    placementTileLegalV7(
      roster,
      facts,
      giant.ownerId,
      "FIGHTER",
      researched,
      at,
      false,
    )
  );
}

/**
 * Section 6.8, row 8 (as the user changed it on 2026-10-09): the command's
 * two tiles are distinct, in (y, x) order, and each one is legal.
 */
export function breakOffTilesLegalV7(
  roster: FactionRosterV7,
  facts: GiantTileFactsV7,
  giant: GiantUnitFactsV7,
  researched: readonly TechnologyIdV7[],
  tiles: readonly [CoordV7, CoordV7],
): boolean {
  const [first, second] = tiles;
  return (
    (first.y < second.y || (first.y === second.y && first.x < second.x)) &&
    breakOffTileLegalV7(roster, facts, giant, researched, first) &&
    breakOffTileLegalV7(roster, facts, giant, researched, second)
  );
}

/**
 * Section 6.8: the HP of each Gingerbread Man a Break Off makes: a regular
 * Toffee Trooper's, its seat `FIGHTER` maximum (full HP).
 */
export function breakOffTrooperHpV7(
  roster: FactionRosterV7,
  ownerId: PlayerId,
): number {
  return seatRoleRuleV7(roster, ownerId, "FIGHTER").maxHp;
}

// ----------------------------------------------------- Reducer steps ---

type SwallowCommandV7 = Extract<CommandV7, { kind: "SWALLOW" }>;
type TossCommandV7 = Extract<CommandV7, { kind: "TOSS" }>;
type StompCommandV7 = Extract<CommandV7, { kind: "STOMP" }>;
type BreakOffCommandV7 = Extract<CommandV7, { kind: "BREAK_OFF" }>;

/** Marks the actor's unit as having used its primary action. */
function withPrimaryUsed(unit: UnitStateV7): UnitStateV7 {
  return {
    ...unit,
    activation: { ...unit.activation, specialActed: true, handled: true },
  };
}

/** Section 6.2: `SWALLOW`, a primary action of the Abomination. */
export function applySwallowV7(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SwallowCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const holder = actorCheck.unit;
  const named = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  const target =
    named !== undefined && visibleTo(state, actor, named) ? named : undefined;
  const rejection = swallowRejectionV7(
    state,
    state.giants.swallowed,
    holder,
    target,
  );
  if (rejection !== null) return rejectWith(kit, original, holder, rejection);
  if (target === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const victim: UnitStateV7 = {
      ...target,
      at: { x: holder.at.x, y: holder.at.y },
      form: "LAND",
      captureEligible: false,
      activation: exhaustedActivationV7(),
    };
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_SWALLOWED",
        playerId: actor,
        unitId: holder.id,
        victimUnitId: target.id,
        victimOwnerId: target.ownerId,
        role: target.role,
        hp: target.hp,
      },
    ];
    const units = state.units
      .filter((unit) => unit.id !== target.id)
      .map((unit) => (unit.id === holder.id ? withPrimaryUsed(unit) : unit));
    // A swallowed Brain releases its controlled units, as a lost Brain.
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
        giants: {
          ...state.giants,
          swallowed: [
            ...state.giants.swallowed,
            { holderUnitId: holder.id, unit: victim },
          ].sort((left, right) => left.holderUnitId - right.holderUnitId),
        },
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/** Section 6.3: `TOSS`, a primary action of the Troll. */
export function applyTossV7(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: TossCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const troll = actorCheck.unit;
  const blocked = tossActorRejectionV7(state, troll);
  if (blocked !== null) return rejectWith(kit, original, troll, blocked);
  const passenger = state.units.find(
    (unit) => unit.id === command.passengerUnitId && unit.hp > 0,
  );
  if (!tossPassengerLegalV7(state, troll, passenger) || passenger === undefined)
    return kit.rejected(original, "TOSS_NOT_LEGAL", { reason: "PASSENGER" });
  const player = kit.requirePlayer(state, actor);
  if (
    !tossDestinationLegalV7(
      state,
      canonicalGiantTileFactsV7(state, actor),
      troll,
      player.researchedTechs,
      command.at,
    )
  )
    return kit.rejected(original, "TOSS_NOT_LEGAL", { reason: "DESTINATION" });
  try {
    const at = { x: command.at.x, y: command.at.y };
    const tile = tileAtV7(state.board, at) as TileStateV7;
    const territoryOwner =
      tile.territoryCityId === null
        ? undefined
        : state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId;
    const occupiesHostileDefense =
      tile.fieldDefense &&
      territoryOwner !== undefined &&
      territoryOwner !== actor &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? kit.replaceTile(state, at, { ...tile, fieldDefense: false })
      : state.board;
    const thrown: UnitStateV7 = {
      ...passenger,
      at,
      captureEligible: false,
      activation: { ...passenger.activation, moved: true },
    };
    const units = state.units.map((unit) =>
      unit.id === troll.id
        ? withPrimaryUsed(unit)
        : unit.id === passenger.id
          ? thrown
          : unit,
    );
    const events: DomainEventV7[] = [
      {
        kind: "GOBLIN_TOSSED",
        playerId: actor,
        unitId: troll.id,
        passengerUnitId: passenger.id,
        from: { x: passenger.at.x, y: passenger.at.y },
        to: at,
      },
    ];
    if (occupiesHostileDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at,
        reason: "OCCUPATION",
      });
    const sightState = { ...state, board, units } as GameStateV7;
    const reveal = kit.revealRadius(
      sightState,
      actor,
      at,
      unitSightRadiusAtV7(sightState, thrown),
    );
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    const staged = kit.graveActionTail(
      {
        ...state,
        board,
        commandIndex: kit.nextSafe(state.commandIndex),
        players: kit.setExplored(state.players, actor, reveal.explored),
        units,
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/** Section 6.4: `STOMP`, a primary action of the unmoved Brontosaurus. */
export function applyStompV7(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: StompCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const bronto = actorCheck.unit;
  const blocked = stompRejectionV7(state, bronto);
  if (blocked !== null) return rejectWith(kit, original, bronto, blocked);
  try {
    const results = stompResultsV7(state, state.shields, state.units, bronto);
    const fieldDefenses = ringTilesV7(
      state.board.width,
      state.board.height,
      bronto.at,
    ).filter((at) => tileAtV7(state.board, at)?.fieldDefense === true);
    const events: DomainEventV7[] = [
      {
        kind: "THUNDER_STOMP",
        playerId: actor,
        unitId: bronto.id,
        results,
        fieldDefenses,
      },
    ];
    let board = state.board;
    for (const at of fieldDefenses) {
      const tile = tileAtV7(board, at) as TileStateV7;
      board = kit.replaceTile({ ...state, board }, at, {
        ...tile,
        fieldDefense: false,
      });
      events.push({ kind: "FIELD_DEFENSE_DESTROYED", at, reason: "STOMP" });
    }
    const hit = resolveFixedHitsV7(
      kit,
      {
        ...state,
        board,
        units: state.units.map((unit) =>
          unit.id === bronto.id ? withPrimaryUsed(unit) : unit,
        ),
      },
      bronto.id,
      results,
      "STOMP",
      events,
    );
    const staged = kit.graveActionTail(
      { ...hit, commandIndex: kit.nextSafe(state.commandIndex) },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

/** Section 6.8: `BREAK_OFF`, a primary action of the Gingerbread Giant. */
export function applyBreakOffV7(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: BreakOffCommandV7,
): ApplyCommandResultV7 {
  if (
    state.commandIndex >= Number.MAX_SAFE_INTEGER ||
    state.nextEntityId >= Number.MAX_SAFE_INTEGER
  )
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const giant = actorCheck.unit;
  const home =
    giant.homeCityId === null
      ? undefined
      : state.cities.find((city) => city.id === giant.homeCityId);
  const blocked = breakOffActorRejectionV7(state, giant, home?.ownerId ?? null);
  if (blocked !== null) return rejectWith(kit, original, giant, blocked);
  if (home === undefined) return kit.rejected(original, "INVALID_STATE");
  const player = kit.requirePlayer(state, actor);
  if (
    !breakOffTilesLegalV7(
      state,
      canonicalGiantTileFactsV7(state, actor),
      giant,
      player.researchedTechs,
      command.tiles,
    )
  )
    return kit.rejected(original, "BREAK_OFF_NOT_LEGAL", { reason: "TILE" });
  try {
    const rule = seatRoleRuleV7(state, actor, "FIGHTER");
    const hp = breakOffTrooperHpV7(state, actor);
    let nextEntityId = state.nextEntityId;
    let board = state.board;
    const men: UnitStateV7[] = [];
    const smashed: CoordV7[] = [];
    for (const tileAt of command.tiles) {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const at = { x: tileAt.x, y: tileAt.y };
      men.push({
        id: allocation.id,
        ownerId: actor,
        homeCityId: home.id,
        role: "FIGHTER",
        form: "LAND",
        at,
        hp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: exhaustedActivationV7(),
        variant: GINGERBREAD_MAN_VARIANT_V7,
      });
      const tile = tileAtV7(board, at) as TileStateV7;
      const territoryOwner =
        tile.territoryCityId === null
          ? undefined
          : state.cities.find((city) => city.id === tile.territoryCityId)
              ?.ownerId;
      if (
        tile.fieldDefense &&
        territoryOwner !== undefined &&
        arePlayersHostileV7(state, actor, territoryOwner)
      ) {
        board = kit.replaceTile({ ...state, board }, at, {
          ...tile,
          fieldDefense: false,
        });
        smashed.push(at);
      }
    }
    const [first, second] = men as [UnitStateV7, UnitStateV7];
    const spent = unitRoleMechanicsV7(state, giant).breakOffHp;
    const units = [
      ...state.units.map((unit) =>
        unit.id === giant.id
          ? { ...withPrimaryUsed(unit), hp: unit.hp - spent }
          : unit,
      ),
      ...men,
    ];
    // Each Gingerbread Man reveals its sight, the first then the second.
    let players = state.players;
    const revealed: CoordV7[] = [];
    for (const man of men) {
      const sightState = { ...state, board, units, players } as GameStateV7;
      const reveal = kit.revealRadius(
        sightState,
        actor,
        man.at,
        unitSightRadiusAtV7(sightState, man),
      );
      players = kit.setExplored(players, actor, reveal.explored);
      revealed.push(...reveal.revealed);
    }
    const events: DomainEventV7[] = [
      {
        kind: "GIANT_BROKE_OFF",
        playerId: actor,
        unitId: giant.id,
        newUnitIds: [first.id, second.id],
        tiles: [first.at, second.at],
        cityId: home.id,
        hp,
      },
    ];
    for (const at of smashed)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at,
        reason: "OCCUPATION",
      });
    if (revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: kit.uniqueCoords(revealed),
      });
    const staged = kit.graveActionTail(
      {
        ...state,
        board,
        nextEntityId,
        commandIndex: kit.nextSafe(state.commandIndex),
        players,
        units,
        shields: withFullShieldsV7(state, state.shields, men),
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
 * Sections 6.1, 6.4, and 6.5 (G5): applies fixed signature hits at once to
 * `state` (the hits were computed on its units), then the deaths in the
 * order of `results`: each `UNIT_DIED` with its Grave or Bitten rising and
 * its Crumbs, the releases of a dead Brain's units, the death-blast chain,
 * the kill credit (`creditUnitId`'s kills, growth, Slayer) and the Plunder
 * and Monster bounty of the source's owner, and the risings' reveals. No
 * new damage draws retaliation. Returns the state; the caller adds the
 * economy tail. A credited unit that is no longer on the board (it died
 * earlier in the exchange) earns nothing.
 */
export function resolveFixedHitsV7(
  kit: GiantsReducerKitV7,
  state: GameStateV7,
  creditUnitId: UnitId,
  results: readonly CombatSplashEntryV7[],
  cause: "CRUSH" | "STOMP" | "TRAMPLE" | "STAMPEDE",
  events: DomainEventV7[],
): GameStateV7 {
  if (results.length === 0) return state;
  const before = new Map(state.units.map((unit) => [unit.id, unit]));
  const hpDamage = new Map(
    results.map((entry) => [entry.unitId, entry.damage]),
  );
  const source = before.get(creditUnitId);
  const sourceOwner = source?.ownerId ?? null;
  const deaths = results.filter((entry) => entry.dies);
  const hostileKills = deaths.filter((entry) => {
    const victim = before.get(entry.unitId);
    return (
      victim !== undefined &&
      sourceOwner !== null &&
      arePlayersHostileV7(state, sourceOwner, victim.ownerId)
    );
  }).length;
  let units: UnitStateV7[] = state.units
    .map((unit) =>
      hpDamage.has(unit.id)
        ? { ...unit, hp: unit.hp - (hpDamage.get(unit.id) ?? 0) }
        : unit,
    )
    .filter((unit) => unit.hp > 0);
  // The kill credit (G5): Promotion, growth, and Slayer read `kills`.
  const growthEvents: DomainEventV7[] = [];
  if (source !== undefined && hostileKills > 0) {
    const credited = units.find((unit) => unit.id === source.id);
    if (credited !== undefined) {
      const kills = credited.kills + hostileKills;
      if (!Number.isSafeInteger(kills))
        throw new RangeError("INTEGER_OVERFLOW");
      const grown = grownUnitV7(
        state,
        credited.kills,
        { ...credited, kills },
        growthEvents,
      );
      units = units.map((unit) => (unit.id === grown.id ? grown : unit));
    }
  }
  let graves = state.graves;
  let nextEntityId = state.nextEntityId;
  const risings: UnitStateV7[] = [];
  const initialExplosions: {
    readonly unit: UnitStateV7;
    readonly cause: "DEATH";
  }[] = [];
  for (const entry of deaths) {
    const victim = before.get(entry.unitId);
    if (victim === undefined) throw new RangeError("INVALID_STATE");
    const bite = biteOfV7(state, victim.id);
    if (
      bite === undefined ||
      victim.form !== "LAND" ||
      noRisingAtV7(state.board, victim.at)
    )
      graves = recordCombatDeathV7(state, graves, victim, cause, events);
    else {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        { players: state.players, units },
        bite,
        victim,
        cause,
        allocation.id,
        exhaustedActivationV7(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    }
    if (isExplodingUnitV7(state, victim))
      initialExplosions.push({ unit: victim, cause: "DEATH" });
  }
  events.push(...growthEvents);
  const release = releaseControlledV7(
    units,
    state.burrowed,
    state.mindControlled,
    state.players,
    events,
  );
  const chain = resolveStateExplosionChainV7(
    state,
    {
      units: release.units,
      board: state.board,
      graves,
      nextEntityId,
      bitten: state.bitten,
      shields: withShieldDamageV7(
        state.shields,
        new Map(results.map((entry) => [entry.unitId, entry.shieldDamage])),
      ),
      mindControlled: release.mindControlled,
      burrowed: release.burrowed,
    },
    initialExplosions,
    events,
  );
  risings.push(...chain.risings);
  const credits: CreditedDeathV7[] =
    sourceOwner === null
      ? []
      : deaths.map((entry) => ({
          creditedId: sourceOwner,
          victimOwnerId: (before.get(entry.unitId) as UnitStateV7).ownerId,
          victimUnitId: entry.unitId,
        }));
  const plunder = kit.plunderAwards(state, state.players, [
    ...credits,
    ...chain.credits,
  ]);
  events.push(...plunder.events);
  let players = plunder.players;
  for (const risen of risings) {
    const risenState = {
      ...state,
      board: chain.board,
      players,
      units: chain.units,
    } as GameStateV7;
    const reveal = kit.revealRadius(
      risenState,
      risen.ownerId,
      risen.at,
      unitSightRadiusAtV7(risenState, risen),
    );
    players = kit.setExplored(players, risen.ownerId, reveal.explored);
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: risen.ownerId,
        tiles: reveal.revealed,
      });
  }
  return {
    ...state,
    board: chain.board,
    players,
    units: [...chain.units],
    graves: chain.graves,
    nextEntityId: chain.nextEntityId,
    shields: chain.shields,
    mindControlled: chain.mindControlled,
    burrowed: chain.burrowed,
  };
}

// ------------------------------------------------------------ Digest ---

/**
 * Section 6.2: the regurgitation tile around the Abomination `holder`: the
 * first tile in (y, x) order that is land (not ice), holds no unit, Egg,
 * mound, or chest, is enterable by a Zombie (its owner's `GUARD`) under the
 * holder's owner's research, and is not in territory allied to that owner
 * (the reward placement test). Null when there is none.
 */
export function regurgitationTileV7(
  state: GameStateV7,
  holder: UnitStateV7,
): CoordV7 | null {
  const owner = state.players.find((player) => player.id === holder.ownerId);
  if (owner === undefined) return null;
  const mechanics = seatRoleMechanicsV7(state, holder.ownerId, "GUARD");
  for (const at of ringTilesV7(
    state.board.width,
    state.board.height,
    holder.at,
  )) {
    const tile = tileAtV7(state.board, at);
    if (
      tile === undefined ||
      tile.biome === null ||
      tileOccupiedV7(state, at) ||
      state.treasureChests.some((chest) => same(chest, at)) ||
      !canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: mechanics.movementMode,
        afloat: false,
        engineering: owner.researchedTechs.includes("ENGINEERING"),
        navigation: owner.researchedTechs.includes("NAVIGATION"),
        mountainBorn: mechanics.mountainBorn,
        ice: false,
      })
    )
      continue;
    const territoryOwner =
      tile.territoryCityId === null
        ? undefined
        : state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId;
    if (
      territoryOwner !== undefined &&
      territoryOwner !== holder.ownerId &&
      arePlayersAlliedV7(state, holder.ownerId, territoryOwner)
    )
      continue;
    return at;
  }
  return null;
}

/**
 * Section 6.2: the digest step of `playerId`'s Start Turn, right after
 * Troll regeneration: each victim its Abominations hold (in holder order)
 * loses `DIGEST_DAMAGE_V7` HP (nothing reduces it) and its holder heals what
 * it lost; a victim at 0 HP dies (`DIGESTED`, credited to the holder) and
 * comes back out as a homeless, exhausted Zombie of the holder's owner at
 * the Infect rising HP on the first free tile around it (none without one).
 */
export function resolveStartTurnDigestV7(
  kit: GiantsReducerKitV7,
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const held = state.giants.swallowed.filter(
    (entry) =>
      state.units.find((unit) => unit.id === entry.holderUnitId)?.ownerId ===
      playerId,
  );
  if (held.length === 0) return { state, events: [] };
  const events: DomainEventV7[] = [];
  let current = state;
  for (const entry of held) {
    const holder = current.units.find((unit) => unit.id === entry.holderUnitId);
    if (holder === undefined) continue;
    const amount = Math.min(entry.unit.hp, DIGEST_DAMAGE_V7);
    const hpAfter = entry.unit.hp - amount;
    const healed = Math.max(0, Math.min(amount, holder.maxHp - holder.hp));
    events.push({
      kind: "UNIT_DIGESTED",
      playerId,
      unitId: holder.id,
      victimUnitId: entry.unit.id,
      amount,
      hpAfter,
      healed,
    });
    let healedHolder: UnitStateV7 = { ...holder, hp: holder.hp + healed };
    if (hpAfter > 0) {
      current = {
        ...current,
        units: current.units.map((unit) =>
          unit.id === holder.id ? healedHolder : unit,
        ),
        giants: {
          ...current.giants,
          swallowed: current.giants.swallowed.map((item) =>
            item.holderUnitId === holder.id
              ? { ...item, unit: { ...item.unit, hp: hpAfter } }
              : item,
          ),
        },
      };
      continue;
    }
    // The victim dies inside: credited to the Abomination, nothing left.
    events.push({
      kind: "UNIT_DIED",
      unitId: entry.unit.id,
      cause: "DIGESTED",
    });
    // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
    // 3.2): the digestion is a death credited to the holder's owner, so it
    // is a Kill; it never reaches Plunder, so it is recorded here.
    recordScoreCreditsV7(current, [
      {
        creditedId: playerId,
        victimOwnerId: entry.unit.ownerId,
        victimUnitId: entry.unit.id,
      },
    ]);
    const kills = healedHolder.kills + 1;
    if (!Number.isSafeInteger(kills)) throw new RangeError("INTEGER_OVERFLOW");
    healedHolder = { ...healedHolder, kills };
    current = {
      ...current,
      units: current.units.map((unit) =>
        unit.id === holder.id ? healedHolder : unit,
      ),
      giants: {
        ...current.giants,
        swallowed: current.giants.swallowed.filter(
          (item) => item.holderUnitId !== holder.id,
        ),
      },
    };
    const at = regurgitationTileV7(current, healedHolder);
    if (at === null) {
      events.push({
        kind: "UNIT_REGURGITATED",
        playerId,
        unitId: holder.id,
        victimUnitId: entry.unit.id,
        zombieUnitId: null,
        at: null,
      });
      continue;
    }
    const allocation = allocateUnitId(current.nextEntityId);
    const rule = seatRoleRuleV7(current, playerId, "GUARD");
    const zombie: UnitStateV7 = {
      id: allocation.id,
      ownerId: playerId,
      homeCityId: null,
      role: "GUARD",
      form: "LAND",
      at,
      hp: Math.min(INFECT_RISING_HP_V7, rule.maxHp),
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivationV7(),
    };
    events.push({
      kind: "UNIT_REGURGITATED",
      playerId,
      unitId: holder.id,
      victimUnitId: entry.unit.id,
      zombieUnitId: zombie.id,
      at,
    });
    const units = [...current.units, zombie];
    const sightState = { ...current, units } as GameStateV7;
    const reveal = kit.revealRadius(
      sightState,
      playerId,
      at,
      unitSightRadiusAtV7(sightState, zombie),
    );
    if (reveal.revealed.length > 0)
      events.push({ kind: "TILES_REVEALED", playerId, tiles: reveal.revealed });
    current = {
      ...current,
      nextEntityId: allocation.nextEntityId,
      units,
      players: kit.setExplored(current.players, playerId, reveal.explored),
    };
  }
  if (current.units.length !== state.units.length) {
    // A Zombie on a city center besieges it: the live economy follows.
    const economy = recomputeLiveEconomyV7(
      current,
      { board: current.board, cities: current.cities, units: current.units },
      current.populationContributions,
    );
    events.push(...kit.economyAndGrowth(economy.changes));
    current = {
      ...current,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    };
  }
  return { state: current, events };
}

// ------------------------------------------------------ Bookkeeping ---

/**
 * Section 6.2: the pruning of `giants.swallowed`, run on every checked
 * state (`checked` in the reducer). A held victim follows its holder's tile
 * (its `at`); a victim whose owner left the game is removed with that
 * player's units; a victim homed to a city its owner lost is homeless. A
 * victim whose holder is no longer a land-form Abomination on the board is
 * released: it stands on its holder's last tile, with the exhausted
 * activation, when that tile is land (or ice) and free; otherwise (the
 * holder died afloat, was removed by a reward displacement, or the tile is
 * taken) it is gone. `withSwallowedOutcomesV7` reports both.
 */
export function prunedGiantsV7(state: GameStateV7): GameStateV7 {
  const swallowed = state.giants.swallowed;
  if (swallowed.length === 0) return state;
  const kept: SwallowedEntryV7[] = [];
  const released: UnitStateV7[] = [];
  let changed = false;
  for (const entry of swallowed) {
    let victim = entry.unit;
    const owner = state.players.find((player) => player.id === victim.ownerId);
    if (owner === undefined || owner.status !== "ACTIVE") {
      changed = true;
      continue;
    }
    if (
      victim.homeCityId !== null &&
      state.cities.find((city) => city.id === victim.homeCityId)?.ownerId !==
        victim.ownerId
    )
      victim = { ...victim, homeCityId: null };
    const holder = state.units.find(
      (unit) => unit.id === entry.holderUnitId && unit.hp > 0,
    );
    if (
      holder !== undefined &&
      holder.form === "LAND" &&
      unitRoleRuleV7(state, holder).abilities.includes("SWALLOW")
    ) {
      if (!same(victim.at, holder.at))
        victim = { ...victim, at: { x: holder.at.x, y: holder.at.y } };
      if (victim !== entry.unit) changed = true;
      kept.push(victim === entry.unit ? entry : { ...entry, unit: victim });
      continue;
    }
    changed = true;
    const tile = tileAtV7(state.board, victim.at);
    const ground =
      tile !== undefined &&
      tile.terrain !== "RIFT" &&
      (tile.biome !== null || isIceAtV7(state, victim.at)) &&
      // An embarked holder is afloat: its victim is digested.
      !(holder !== undefined && holder.form !== "LAND");
    if (
      ground &&
      !tileOccupiedV7(
        { units: [...state.units, ...released], burrowed: state.burrowed },
        victim.at,
      )
    )
      released.push({
        ...victim,
        form: "LAND",
        captureEligible: false,
        activation: exhaustedActivationV7(),
      });
  }
  if (!changed) return state;
  return {
    ...state,
    units:
      released.length === 0
        ? state.units
        : [...state.units, ...released].sort(
            (left, right) => left.id - right.id,
          ),
    giants: { ...state.giants, swallowed: kept },
  };
}

/**
 * Section 6.2: the events of the victims a command let go, folded from the
 * state before the command and the result (`prunedGiantsV7` already moved
 * them): `SWALLOWED_UNIT_RELEASED` right after its holder's `UNIT_DIED`
 * (before its Grave) for a victim back on the board, else `UNIT_DIED` cause
 * `ELIMINATION` (its owner left the game, before its `PLAYER_ELIMINATED`)
 * or `DIGESTED` (no credit and no Zombie). A victim the command digested
 * itself already has its `UNIT_DIED`. Returns the events (the same array
 * when nothing changed) and the released units, whose sight the caller
 * reveals.
 */
export function swallowedOutcomeEventsV7(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
): {
  readonly events: readonly DomainEventV7[];
  readonly released: readonly UnitStateV7[];
} {
  if (before.giants.swallowed.length === 0) return { events, released: [] };
  const still = new Set(after.giants.swallowed.map((entry) => entry.unit.id));
  const output = [...events];
  const released: UnitStateV7[] = [];
  let changed = false;
  for (const entry of before.giants.swallowed) {
    const victimId = entry.unit.id;
    if (still.has(victimId)) continue;
    if (
      output.some(
        (event) => event.kind === "UNIT_DIED" && event.unitId === victimId,
      )
    )
      continue;
    changed = true;
    const holderDeath = output.findIndex(
      (event) =>
        event.kind === "UNIT_DIED" && event.unitId === entry.holderUnitId,
    );
    const onBoard = after.units.find((unit) => unit.id === victimId);
    if (onBoard !== undefined) {
      released.push(onBoard);
      const event: DomainEventV7 = {
        kind: "SWALLOWED_UNIT_RELEASED",
        playerId: onBoard.ownerId,
        unitId: victimId,
        holderUnitId: entry.holderUnitId,
        at: { x: onBoard.at.x, y: onBoard.at.y },
        hp: onBoard.hp,
      };
      if (holderDeath < 0) output.push(event);
      else output.splice(holderDeath + 1, 0, event);
      continue;
    }
    const ownerGone =
      after.players.find((player) => player.id === entry.unit.ownerId)
        ?.status !== "ACTIVE";
    if (ownerGone) {
      const eliminated = output.findIndex(
        (event) =>
          event.kind === "PLAYER_ELIMINATED" &&
          event.playerId === entry.unit.ownerId,
      );
      const event: DomainEventV7 = {
        kind: "UNIT_DIED",
        unitId: victimId,
        cause: "ELIMINATION",
      };
      if (eliminated < 0) output.push(event);
      else output.splice(eliminated, 0, event);
      continue;
    }
    const event: DomainEventV7 = {
      kind: "UNIT_DIED",
      unitId: victimId,
      cause: "DIGESTED",
    };
    if (holderDeath < 0) output.push(event);
    else output.splice(holderDeath + 1, 0, event);
  }
  return changed ? { events: output, released } : { events, released: [] };
}

/**
 * Section 6.2: the held victims a city's unit limit counts: the victims of
 * `ownerId` (every owner when omitted) homed to `cityId`, with their slots.
 */
export function swallowedSlotsForCityV7(
  roster: FactionRosterV7,
  swallowed: readonly {
    readonly unit: Pick<
      UnitStateV7,
      "id" | "ownerId" | "role" | "homeCityId" | "hp"
    >;
  }[],
  cityId: number,
): number {
  let used = 0;
  for (const entry of swallowed)
    if (entry.unit.hp > 0 && entry.unit.homeCityId === cityId)
      used += unitCapacitySlotsV7(roster, entry.unit);
  return used;
}

// ------------------------------------------------------------ Helpers ---

function rejectWith(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  unit: UnitStateV7,
  rejection:
    | SwallowRejectionV7
    | TossRejectionV7
    | StompRejectionV7
    | BreakOffRejectionV7,
): ApplyCommandResultV7 {
  switch (rejection.code) {
    case "UNIT_ROLE_INVALID":
      return kit.rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
    case "UNIT_ALREADY_ACTED":
      return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
    case "UNIT_CRASHED":
      return kit.rejected(original, "UNIT_CRASHED", { unitId: unit.id });
    default:
      return kit.rejected(original, rejection.code, {
        reason: rejection.reason,
      });
  }
}

function visibleTo(state: GameStateV7, viewerId: PlayerId, unit: UnitStateV7) {
  if (unit.ownerId === viewerId) return true;
  return (
    state.players
      .find((player) => player.id === viewerId)
      ?.explored.some((at) => same(at, unit.at)) === true
  );
}

function shieldsOf(
  shields: readonly { readonly unitId: UnitId; readonly shield: number }[],
  unitId: UnitId,
): number {
  return shieldOfV7(shields, unitId);
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
