import type { PlayerId, UnitId } from "../model/ids";
import {
  CANDY_ROLE_MECHANICS_V7,
  CRUMBS_TURNS_V7,
  HOME_SWEET_HOME_RADIUS_V7,
  SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  SUGAR_RUSH_ATTACK2_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  SUGAR_TOSS_HEAL_V7,
  SUGAR_TOSS_RANGE_V7,
  armouredDamageV7,
  ownerResearchedTechsV7,
  primaryActionBlockedAfterMoveV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
  type FactionRosterV7,
  type SluggishLookupV7,
} from "../rules/ruleset-v7";
import type {
  CoordV7,
  CrumbsV7,
  CuriosityV7,
  FactionIdV7,
  GameStateV7,
  SugarRushStatusV7,
  TerrainIdV7,
  UnitActivationV7,
  UnitFormV7,
  UnitRoleIdV7,
} from "./types";

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md): the helpers the
 * reducer, the public queries, the stats, and the views share. Every helper
 * returns the neutral answer in a match without a Candy seat: the four Candy
 * lists are empty there and no role has a Candy ability or mechanic.
 */

/** Whether any seat of the match is a Candy seat (the setup decides). */
export function matchHasCandyV7(input: {
  readonly setup: { readonly factions: readonly FactionIdV7[] };
}): boolean {
  return input.setup.factions.includes("CANDY");
}

/** The unit facts the Candy helpers read (state units and public units). */
export interface CandyUnitFactsV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** Anything that carries the `sugarRush` list (canonical state or a view). */
export interface SugarRushLookupV7 {
  readonly sugarRush?: readonly SugarRushStatusV7[];
}

/** Section 5.3: the unit's `sugarRush` phase, or null without an entry. */
export function sugarRushPhaseV7(
  lookup: SugarRushLookupV7,
  unitId: UnitId,
): SugarRushStatusV7["phase"] | null {
  const list = lookup.sugarRush;
  if (list === undefined || list.length === 0) return null;
  return list.find((entry) => entry.unitId === unitId)?.phase ?? null;
}

/** Section 13: whether the unit is Rushed (a `RUSHED` entry). */
export function unitIsRushedV7(
  lookup: SugarRushLookupV7,
  unitId: UnitId,
): boolean {
  return sugarRushPhaseV7(lookup, unitId) === "RUSHED";
}

/** Section 13: whether the unit is Crashed (a `CRASHED` entry). */
export function unitIsCrashedV7(
  lookup: SugarRushLookupV7,
  unitId: UnitId,
): boolean {
  return sugarRushPhaseV7(lookup, unitId) === "CRASHED";
}

/** Section 13: whether the unit was Splatted during the active seat's turn. */
export function unitIsSplattedV7(
  lookup: { readonly splattedThisTurn?: readonly UnitId[] },
  unitId: UnitId,
): boolean {
  const list = lookup.splattedThisTurn;
  return list !== undefined && list.length > 0 && list.includes(unitId);
}

/** `sugarRush` with the entry of `unitId` set to `phase`, sorted by unit ID. */
export function withSugarRushV7(
  sugarRush: readonly SugarRushStatusV7[],
  unitId: UnitId,
  phase: SugarRushStatusV7["phase"],
): readonly SugarRushStatusV7[] {
  return [
    ...sugarRush.filter((entry) => entry.unitId !== unitId),
    { unitId, phase },
  ].sort((left, right) => left.unitId - right.unitId);
}

/** A sorted unit-ID list with `unitId` added (itself when already listed). */
export function withUnitIdV7(
  list: readonly UnitId[],
  unitId: UnitId,
): readonly UnitId[] {
  return list.includes(unitId)
    ? list
    : [...list, unitId].sort((left, right) => left - right);
}

function primaryUsedV7(activation: {
  readonly attacked: boolean;
  readonly recovered: boolean;
  readonly captured: boolean;
  readonly specialActed: boolean;
}): boolean {
  return (
    activation.attacked ||
    activation.recovered ||
    activation.captured ||
    activation.specialActed
  );
}

/** Why a `SUGAR_RUSH` of an own unit on the board is refused (section 5.1). */
export type SugarRushRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | {
      readonly code: "SUGAR_RUSH_NOT_LEGAL";
      readonly reason: "EMBARKED" | "RUSHED";
    }
  | { readonly code: "UNIT_CRASHED" }
  | { readonly code: "UNIT_ALREADY_ACTED" };

/**
 * THE Sugar Rush legality (section 5.1, rows 2 to 6), shared by the reducer
 * and the public command query: the unit's role, under its kind, has
 * `SUGAR_RUSH`; it is in land form; it is neither Crashed nor Rushed; and it
 * has not moved (a landing is a Move), used a primary action, or been
 * handled. A sluggish unit may Rush.
 */
export function sugarRushRejectionV7(
  lookup: FactionRosterV7 & SugarRushLookupV7,
  unit: CandyUnitFactsV7 & { readonly activation: UnitActivationV7 },
): SugarRushRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, unit).abilities.includes("SUGAR_RUSH"))
    return { code: "UNIT_ROLE_INVALID" };
  if (unit.form !== "LAND")
    return { code: "SUGAR_RUSH_NOT_LEGAL", reason: "EMBARKED" };
  const phase = sugarRushPhaseV7(lookup, unit.id);
  if (phase === "CRASHED") return { code: "UNIT_CRASHED" };
  if (phase === "RUSHED")
    return { code: "SUGAR_RUSH_NOT_LEGAL", reason: "RUSHED" };
  if (
    unit.activation.moved ||
    unit.activation.handled ||
    primaryUsedV7(unit.activation)
  )
    return { code: "UNIT_ALREADY_ACTED" };
  return null;
}

/**
 * Section 5.2: the extra Move of a unit's ordinary `MOVE`: a Rushed
 * land-form unit has `SUGAR_RUSH_MOVE_BONUS_V7`, except on an Escape Move
 * (the Donut Racer's perk), which has the ordinary budget.
 */
export function sugarRushMoveBonusV7(
  lookup: SugarRushLookupV7,
  unit: {
    readonly id: UnitId;
    readonly form: UnitFormV7;
    readonly activation: { readonly escapeAvailable: boolean };
  },
): number {
  return unit.form === "LAND" &&
    !unit.activation.escapeAvailable &&
    unitIsRushedV7(lookup, unit.id)
    ? SUGAR_RUSH_MOVE_BONUS_V7
    : 0;
}

/**
 * Section 5.2: the Rush `attack2` of an `ATTACK` by this unit: a land-form
 * Rushed unit's first attack this turn, unless Charge or Inspired applies
 * (the Rush bonus never adds to either). `assumeRushed` evaluates a unit
 * that could Rush (its role has `SUGAR_RUSH` and it is not Crashed) as
 * Rushed, for the estimate option `assumeSugarRush`.
 */
export function sugarRushAttack2V7(
  lookup: FactionRosterV7 & SugarRushLookupV7,
  unit: CandyUnitFactsV7 & {
    readonly activation: { readonly attacksUsed: number };
  },
  facts: {
    readonly chargeApplied: boolean;
    readonly inspiredApplied: boolean;
    readonly assumeRushed?: boolean;
  },
): number {
  if (
    unit.form !== "LAND" ||
    unit.activation.attacksUsed !== 0 ||
    facts.chargeApplied ||
    facts.inspiredApplied
  )
    return 0;
  return countsAsRushedV7(lookup, unit, facts.assumeRushed === true)
    ? SUGAR_RUSH_ATTACK2_V7
    : 0;
}

/**
 * Whether the unit is Rushed, or (with `assumeRushed`) could be: its role,
 * under its kind, has `SUGAR_RUSH` and it is not Crashed.
 */
function countsAsRushedV7(
  lookup: FactionRosterV7 & SugarRushLookupV7,
  unit: CandyUnitFactsV7,
  assumeRushed: boolean,
): boolean {
  const phase = sugarRushPhaseV7(lookup, unit.id);
  if (phase === "RUSHED") return true;
  return (
    assumeRushed &&
    phase === null &&
    unit.form === "LAND" &&
    unitRoleRuleV7(lookup, unit).abilities.includes("SUGAR_RUSH")
  );
}

/**
 * Section 5.4: the Overrun an `ATTACK` by this unit has: the role ability
 * `OVERRUN` (uncapped), the Gummy Bear's Sugar Frenzy while it is Rushed in
 * land form (capped), or none.
 */
export function overrunKindV7(
  lookup: FactionRosterV7 & SugarRushLookupV7,
  unit: CandyUnitFactsV7,
  rule: EffectiveRoleRuleV7,
  assumeRushed = false,
): "OVERRUN" | "SUGAR_FRENZY" | null {
  if (rule.abilities.includes("OVERRUN")) return "OVERRUN";
  return unit.form === "LAND" &&
    unitRoleMechanicsV7(lookup, unit).rushPerk === "SUGAR_FRENZY" &&
    countsAsRushedV7(lookup, unit, assumeRushed)
    ? "SUGAR_FRENZY"
    : null;
}

/**
 * Section 5.4, the cap: whether an attack that leaves the unit with
 * `attacksUsedAfter` attacks this turn may grant a continuation. An ordinary
 * Overrun always may; a Sugar Frenzy only while the unit has made at most
 * `SUGAR_FRENZY_MAX_CONTINUATIONS_V7` attacks, so it attacks three times at
 * most.
 */
export function overrunMayContinueV7(
  kind: "OVERRUN" | "SUGAR_FRENZY" | null,
  attacksUsedAfter: number,
): boolean {
  return (
    kind === "OVERRUN" ||
    (kind === "SUGAR_FRENZY" &&
      attacksUsedAfter <= SUGAR_FRENZY_MAX_CONTINUATIONS_V7)
  );
}

/**
 * Sections 5.4 and 12.1: whether a surviving land-form attacker's role
 * grants Escape after an `ATTACK`: the role ability `ESCAPE` (the Human
 * Raider), or the Donut Racer's perk while it is Rushed. The caller adds the
 * survival and sluggish conditions.
 */
export function attackGrantsEscapeV7(
  lookup: FactionRosterV7 & SugarRushLookupV7,
  unit: CandyUnitFactsV7,
  rule: EffectiveRoleRuleV7,
  assumeRushed = false,
): boolean {
  if (unit.form !== "LAND") return false;
  if (rule.abilities.includes("ESCAPE")) return true;
  return (
    unitRoleMechanicsV7(lookup, unit).rushPerk === "ESCAPE" &&
    countsAsRushedV7(lookup, unit, assumeRushed)
  );
}

/** Section 7: whether an `ATTACK` by this unit Splats its target. */
export function attackSplatsV7(
  roster: FactionRosterV7,
  unit: CandyUnitFactsV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("SPLAT")
  );
}

/** Section 8: whether the unit bounces melee attackers (land form). */
export function unitBouncesV7(
  roster: FactionRosterV7,
  unit: CandyUnitFactsV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("BOUNCE")
  );
}

/**
 * Section 8: whether an attack bounces its attacker, before the destination
 * is tested: made from distance 1, both units on the board after the
 * exchange's deaths, the defender bounces, and the attacker's mechanical
 * role is not `JUGGERNAUT` (the Giant Spider included).
 */
export function attackIsBouncedV7(
  roster: FactionRosterV7,
  attacker: Pick<CandyUnitFactsV7, "role">,
  defender: CandyUnitFactsV7,
  facts: {
    readonly distance: number;
    readonly attackerDies: boolean;
    readonly defenderDies: boolean;
  },
): boolean {
  return (
    facts.distance === 1 &&
    !facts.attackerDies &&
    !facts.defenderDies &&
    attacker.role !== "JUGGERNAUT" &&
    unitBouncesV7(roster, defender)
  );
}

/**
 * Section 8: the tile a bounced attacker lands on: one tile directly away
 * from the defender (both positions read after the Push, the advance, and
 * the Charge! follow).
 */
export function bounceDestinationV7(
  attackerAt: CoordV7,
  defenderAt: CoordV7,
): CoordV7 {
  return {
    x: attackerAt.x + (attackerAt.x - defenderAt.x),
    y: attackerAt.y + (attackerAt.y - defenderAt.y),
  };
}

// ------------------------------------------------------------- Crumbs ---

/** The `UNIT_DIED` causes that leave Crumbs (section 6.1, condition 4). */
export const CRUMBS_DEATH_CAUSES_V7: readonly string[] = Object.freeze([
  "ATTACK",
  "RETALIATION",
  "SPLASH",
  "WAIL",
  "PLAGUE",
  "EXPLOSION",
  "SHATTER",
  "BOMB",
  "ERUPTION",
  "PEPPERMINT",
]);

/** The canonical facts a Crumbs decision reads. */
export interface CrumbsContextV7 {
  readonly setup: { readonly factions: readonly FactionIdV7[] };
  readonly board: GameStateV7["board"];
  readonly treasureChests: readonly CoordV7[];
  readonly curiosities?: readonly CuriosityV7[];
  readonly players?: readonly {
    readonly id: PlayerId;
    readonly faction: FactionIdV7;
  }[];
}

/**
 * Section 6.1: whether the death of `unit` on its tile leaves Crumbs. The
 * caller guarantees the unit did not rise. The unit is owned by a Candy seat
 * (so it is not mind-controlled: a controlled unit's owner is its Martian
 * controller, and its kind is `CANDY`), its role leaves Crumbs, it died in
 * land form on a land tile that is not a settlement site, not a Rift, and
 * holds no treasure chest and no curiosity, by a cause of
 * {@link CRUMBS_DEATH_CAUSES_V7}.
 */
export function deathLeavesCrumbsV7(
  context: CrumbsContextV7,
  unit: {
    readonly ownerId?: PlayerId;
    readonly role?: UnitRoleIdV7;
    readonly form: UnitFormV7;
    readonly at: CoordV7;
  },
  cause: string,
): boolean {
  if (
    !matchHasCandyV7(context) ||
    context.players === undefined ||
    unit.ownerId === undefined ||
    unit.role === undefined ||
    unit.form !== "LAND" ||
    !CRUMBS_DEATH_CAUSES_V7.includes(cause)
  )
    return false;
  const owner = context.players.find((player) => player.id === unit.ownerId);
  if (owner?.faction !== "CANDY") return false;
  if (!CANDY_ROLE_MECHANICS_V7[unit.role].leavesCrumbs) return false;
  const tile = context.board.tiles[unit.at.y * context.board.width + unit.at.x];
  return (
    tile !== undefined &&
    sameCoord(tile.at, unit.at) &&
    crumbsTerrainV7(tile.terrain, tile.biome === null) &&
    tile.site === null &&
    !context.treasureChests.some((chest) => sameCoord(chest, unit.at)) &&
    !(context.curiosities ?? []).some((curiosity) =>
      sameCoord(curiosity.at, unit.at),
    )
  );
}

/** Section 6.1: Crumbs lie on land that is not a Rift (never on water). */
export function crumbsTerrainV7(terrain: TerrainIdV7, water: boolean): boolean {
  return !water && terrain !== "RIFT";
}

/** The Crumbs on `at` (canonical state or a view), if any. */
export function crumbsAtV7<C extends { readonly at: CoordV7 }>(
  input: { readonly crumbs?: readonly C[] },
  at: CoordV7,
): C | undefined {
  const crumbs = input.crumbs;
  if (crumbs === undefined || crumbs.length === 0) return undefined;
  return crumbs.find((entry) => sameCoord(entry.at, at));
}

/**
 * The Crumbs list after fresh Crumbs of `role` were left on `at` for
 * `ownerId`: any Crumbs on the tile are replaced; sorted by (y, x).
 */
export function withCrumbsV7(
  crumbs: readonly CrumbsV7[],
  entry: Pick<CrumbsV7, "at" | "role" | "ownerId">,
): readonly CrumbsV7[] {
  const fresh: CrumbsV7 = {
    at: { x: entry.at.x, y: entry.at.y },
    role: entry.role,
    ownerId: entry.ownerId,
    turnsLeft: CRUMBS_TURNS_V7,
  };
  return [
    ...crumbs.filter((candidate) => !sameCoord(candidate.at, entry.at)),
    fresh,
  ].sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
}

/** The Crumbs list without the Crumbs on `at`. */
export function withoutCrumbsAtV7<C extends { readonly at: CoordV7 }>(
  crumbs: readonly C[],
  at: CoordV7,
): readonly C[] {
  return crumbs.filter((entry) => !sameCoord(entry.at, at));
}

/**
 * Section 6.3: `crumbsBite` of the Candy seat `ownerId`: its Peppermint
 * Surprise damage (0 without the technology). From canonical state it is the
 * owner's capability; from a view it is the viewer's own capability, or the
 * public `bite` of one of that owner's Crumbs or the `candy` block of one of
 * its visible units (0 when the view shows neither).
 */
export function crumbsBiteV7(
  input:
    | Pick<GameStateV7, "players">
    | {
        readonly viewer: GameStateV7["players"][number];
        readonly crumbs: readonly {
          readonly ownerId: PlayerId;
          readonly bite: number;
        }[];
        readonly units: readonly {
          readonly id: UnitId;
          readonly ownerId: PlayerId;
        }[];
        readonly unitStats: readonly {
          readonly unitId: UnitId;
          readonly candy?: { readonly crumbsBite: number };
        }[];
      },
  ownerId: PlayerId,
): number {
  if (!("viewer" in input)) {
    const owner = input.players.find((player) => player.id === ownerId);
    return owner === undefined
      ? 0
      : technologyCapabilitiesV7(owner.researchedTechs, owner.faction)
          .crumbsBite;
  }
  if (input.viewer.id === ownerId)
    return technologyCapabilitiesV7(
      input.viewer.researchedTechs,
      input.viewer.faction,
    ).crumbsBite;
  const crumbs = input.crumbs.find((entry) => entry.ownerId === ownerId);
  if (crumbs !== undefined) return crumbs.bite;
  for (const unit of input.units) {
    if (unit.ownerId !== ownerId) continue;
    const candy = input.unitStats.find(
      (stats) => stats.unitId === unit.id,
    )?.candy;
    if (candy !== undefined) return candy.crumbsBite;
  }
  return 0;
}

/**
 * Section 6.3: whether `unit`, in the form it has after its `MOVE` or
 * `DISEMBARK`, eats the Crumbs of `crumbsOwnerId` on its final tile: it is
 * in land form, it does not fly, and its owner is hostile to the Crumbs'
 * owner (`hostile` is `arePlayersHostileV7` on the state or the view).
 */
export function unitEatsCrumbsV7(
  roster: FactionRosterV7,
  unit: CandyUnitFactsV7,
  crumbsOwnerId: PlayerId,
  hostile: (left: PlayerId, right: PlayerId) => boolean,
): boolean {
  return (
    unit.form === "LAND" &&
    unitMovementModeV7(roster, unit) !== "FLY" &&
    hostile(unit.ownerId, crumbsOwnerId)
  );
}

/**
 * Section 6.3: the Peppermint Surprise on an eater: the fixed `bite`,
 * reduced by Armoured, capped by Plated, taken from the eater's Shield first
 * and then from its HP (capped at its HP).
 */
export function peppermintHitV7(
  roster: FactionRosterV7,
  eater: CandyUnitFactsV7 & { readonly hp: number },
  shield: number,
  bite: number,
): {
  readonly damage: number;
  readonly shieldDamage: number;
  readonly dies: boolean;
} {
  if (bite <= 0) return { damage: 0, shieldDamage: 0, dies: false };
  const hit = armouredDamageV7(roster, eater, bite);
  const shieldDamage = Math.min(shield, hit);
  const damage = Math.min(eater.hp, hit - shieldDamage);
  return { damage, shieldDamage, dies: damage >= eater.hp };
}

// ------------------------------------------------- Home Sweet Home ---

/**
 * Section 5.3: whether Home Sweet Home spares the Rushed `unit` at End Turn
 * (also the "won't Crash here" test of the owner's UI): its owner has the
 * capability (its research read through the unit's kind's tree) and the
 * unit stands, in any form, on or next to a city center its owner owns.
 */
export function homeSweetHomeSparesV7(
  state: Pick<GameStateV7, "players" | "cities" | "mindControlled">,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly at: CoordV7;
  },
): boolean {
  return (
    unitCapabilitiesV7(state, unit, ownerResearchedTechsV7(state, unit.ownerId))
      .homeSweetHome && standsByOwnCenterV7(state.cities, unit)
  );
}

/** Section 5.3: on or next to a city center the unit's owner owns. */
export function standsByOwnCenterV7(
  cities: readonly { readonly ownerId: PlayerId; readonly at: CoordV7 }[],
  unit: { readonly ownerId: PlayerId; readonly at: CoordV7 },
): boolean {
  return cities.some(
    (city) =>
      city.ownerId === unit.ownerId &&
      chebyshev(city.at, unit.at) <= HOME_SWEET_HOME_RADIUS_V7,
  );
}

// ------------------------------------------- Re-bake and Sugar Toss ---

/** The activation facts a primary action's readiness reads. */
type PrimaryReadyUnitV7 = CandyUnitFactsV7 & {
  readonly activation: UnitActivationV7;
};

/**
 * Sections 6.4 and 9, rows 2 to 5 of both tables, shared by the reducer and
 * the public command query: the first reason the unit may not use the
 * primary action `ability` (`REBAKE` or `SUGAR_TOSS`) now, or null. The
 * order is the contract's: the role, the Crash, the spent action (a landing
 * and a sluggish unit's Move included), then the land form.
 */
export function candyActionRejectionV7(
  lookup: SluggishLookupV7 & SugarRushLookupV7,
  unit: PrimaryReadyUnitV7,
  ability: "REBAKE" | "SUGAR_TOSS",
): "ROLE" | "CRASHED" | "ACTED" | "EMBARKED" | null {
  if (!unitRoleRuleV7(lookup, unit).abilities.includes(ability)) return "ROLE";
  if (unitIsCrashedV7(lookup, unit.id)) return "CRASHED";
  if (
    unit.activation.overrunActive ||
    primaryUsedV7(unit.activation) ||
    primaryActionBlockedAfterMoveV7(lookup, unit)
  )
    return "ACTED";
  if (unit.form !== "LAND") return "EMBARKED";
  return null;
}

/**
 * Section 9, rows 6 to 10: why a Sugar Toss from the ready Gunner `gunner`
 * to `target` is illegal, or null. `target` is the unit named by the
 * command if it is on the board. Own units are always visible, so the state
 * and the view agree exactly.
 */
export function sugarTossTargetRejectionV7(
  gunner: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly at: CoordV7;
  },
  target:
    | {
        readonly id: UnitId;
        readonly ownerId: PlayerId;
        readonly form: UnitFormV7;
        readonly at: CoordV7;
        readonly hp: number;
        readonly maxHp: number;
      }
    | undefined,
  tossedThisTurn: readonly UnitId[],
):
  | "HEAL_TARGET_NOT_FOUND"
  | "HEAL_TARGET_NOT_OWNED"
  | "OUT_OF_RANGE"
  | "ALREADY_TOSSED"
  | "HEAL_TARGET_FULL"
  | null {
  if (
    target === undefined ||
    target.hp <= 0 ||
    target.id === gunner.id ||
    target.form !== "LAND"
  )
    return "HEAL_TARGET_NOT_FOUND";
  if (target.ownerId !== gunner.ownerId) return "HEAL_TARGET_NOT_OWNED";
  if (chebyshev(gunner.at, target.at) > SUGAR_TOSS_RANGE_V7)
    return "OUT_OF_RANGE";
  if (tossedThisTurn.includes(target.id)) return "ALREADY_TOSSED";
  if (target.hp >= target.maxHp) return "HEAL_TARGET_FULL";
  return null;
}

/** Section 9: what a Sugar Toss heals the target. */
export function sugarTossAmountV7(target: {
  readonly hp: number;
  readonly maxHp: number;
}): number {
  return Math.min(SUGAR_TOSS_HEAL_V7, target.maxHp - target.hp);
}

/**
 * Section 6.4, row 7: the Crumbs a Confectioner at `at` may Re-bake for
 * `actor`: those on the eight tiles around it that the actor owns, in
 * (y, x) order.
 */
export function rebakeCrumbsV7<
  C extends { readonly at: CoordV7; readonly ownerId: PlayerId },
>(crumbs: readonly C[], actor: PlayerId, at: CoordV7): readonly C[] {
  return crumbs.filter(
    (entry) => entry.ownerId === actor && chebyshev(entry.at, at) === 1,
  );
}

/** The kind of a unit is Candy (its `sugarRush` entry is legal). */
export function unitIsCandyKindV7(
  roster: FactionRosterV7,
  unit: { readonly id: UnitId; readonly ownerId: PlayerId },
): boolean {
  return unitFactionV7(roster, unit) === "CANDY";
}

const sameCoord = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
