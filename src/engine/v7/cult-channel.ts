import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  CHANNEL_RANGE_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  SUMMONED_MECHANICAL_ROLES_V7,
  canEnterTerrainV7,
  primaryActionBlockedAfterMoveV7,
  summonedUnitRoleMechanicsV7,
  summonedUnitRoleRuleV7,
  unitCapacitySlotsV7,
  unitIsFrozenV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type FrozenLookupV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { isLivingUnitV7 } from "./afflictions";
import { displacementDestinationLegalV7 } from "./combat";
import type { CommandV7 } from "./commands";
import {
  favourOfV7,
  isRobedCultistV7,
  withFavourSpentV7,
  type CultReducerKitV7,
} from "./cult";
import type { DisruptionCauseV7, DomainEventV7, ScaredUnitV7 } from "./events";
import type { GiantTileFactsV7 } from "./giants";
import { canonicalGiantTileFactsV7 } from "./giants";
import { unitSightRadiusAtV7 } from "./movement";
import type { ApplyCommandResultV7 } from "./reducer";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type CultStateV7,
  type GameStateV7,
  type GripV7,
  type SummonedRoleIdV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";

/**
 * The Cultists of the Ancient Ones, the channel (`pulp_wars-mch9.5`, the
 * third Cult engine bead; docs/product/RULESET_7_CULTISTS.md sections 6.1,
 * 6.2, 8.1, 8.4, and 8.5): Summon a Horror, Channel and the strands, the
 * one disruption rule, the Start Turn check, Behold!, Anchor, and Boo!.
 *
 * The legality helpers read only facts that canonical state and a player's
 * view share, so the public command query and the reducer agree exactly.
 *
 * **Disruption is decided by what happened to the unit, not by who did
 * it.** {@link cultDisruptionsV7} compares the state before a command (or
 * before a Start Turn's steps) with the state after it: a watched unit that
 * lost Hit Points, stands elsewhere without having acted itself, has a
 * status it did not have, changed owner, or left the board is disrupted.
 * So every way the engine has of hurting, moving, marking, taking, or
 * removing a unit breaks a strand without knowing about strands, and a new
 * one does too. What a new rule must still decide is listed in
 * `tests/fixtures/v7-disruption-paths.ts` (the audit).
 */

/** The unit facts the channel helpers read (state and public units). */
export interface ChannelUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}
type ActorFactsV7 = ChannelUnitFactsV7 & {
  readonly activation: UnitActivationV7;
};

/**
 * The channel facts of a state or a view. In a view a strand to a daemon
 * the viewer does not see has a null `daemonUnitId`; a view captured before
 * the channel has no lists (they read as empty).
 */
export interface ChannelListsV7 {
  readonly cult?: {
    readonly strands?: readonly {
      readonly cultistUnitId: UnitId;
      readonly daemonUnitId: UnitId | null;
    }[];
    readonly grips?: readonly GripV7[];
    readonly idols?: readonly UnitId[];
  };
}
export type ChannelLookupV7 = FactionRosterV7 & FrozenLookupV7 & ChannelListsV7;

const strandsOf = (lookup: ChannelListsV7) => lookup.cult?.strands ?? [];
const gripsOf = (lookup: ChannelListsV7) => lookup.cult?.grips ?? [];
const idolsOf = (lookup: ChannelListsV7) => lookup.cult?.idols ?? [];

// ------------------------------------------------------------ Daemons ---

/**
 * Section 4.2: the summoned role of a daemon (a summoned unit with a
 * Control: the Horror; the Herald from `pulp_wars-mch9.7`), or null.
 */
export function daemonRoleV7(unit: SummonedUnitRefV7): SummonedRoleIdV7 | null {
  return unit.summoned !== undefined &&
    CULT_SUMMONED_ROLE_RULES_V7[unit.summoned].control !== null
    ? unit.summoned
    : null;
}

/** Section 6.2: the strands the daemon needs at each check (its Control). */
export function daemonControlV7(unit: SummonedUnitRefV7): number {
  const role = daemonRoleV7(unit);
  return role === null ? 0 : (CULT_SUMMONED_ROLE_RULES_V7[role].control ?? 0);
}

/**
 * Section 6.2: whether the daemon is bound: a seat commands it. (An Unbound
 * daemon belongs to the neutral owner, from `pulp_wars-mch9.6`.)
 */
export function daemonIsBoundV7(
  unit: SummonedUnitRefV7 & { readonly ownerId: PlayerId },
): boolean {
  return daemonRoleV7(unit) !== null && !isNeutralOwnerV7(unit.ownerId);
}

/**
 * Section 6.2: the daemon's **holding strands** as the board stands: the
 * strands to it whose cultist is on the board as the daemon's seat's own
 * robed cultist within `CHANNEL_RANGE_V7` tiles of the daemon, each
 * counting 1, or 1 plus the Thing's `anchorStrands` (so 3) when an Anchor
 * grip holds: the cultist is gripped by an own land-form Thing that stands
 * next to it (section 8.4). Broken strands and failed grips are not in the
 * lists. The Start Turn check compares this number with the Control; the
 * public view shows it for every visible daemon.
 */
export function holdingStrandsV7<U extends ChannelUnitFactsV7>(
  lookup: FactionRosterV7 & ChannelListsV7,
  units: readonly U[],
  daemon: ChannelUnitFactsV7,
): number {
  let total = 0;
  for (const strand of strandsOf(lookup)) {
    if (strand.daemonUnitId !== daemon.id) continue;
    const cultist = units.find(
      (unit) => unit.id === strand.cultistUnitId && unit.hp > 0,
    );
    if (
      cultist === undefined ||
      cultist.ownerId !== daemon.ownerId ||
      !isRobedCultistV7(lookup, cultist) ||
      chebyshev(cultist.at, daemon.at) > CHANNEL_RANGE_V7
    )
      continue;
    total += 1 + gripStrandsV7(lookup, units, cultist);
  }
  return total;
}

/** Section 8.4: what a holding grip adds to `cultist`'s strand (0 or 2). */
function gripStrandsV7<U extends ChannelUnitFactsV7>(
  lookup: FactionRosterV7 & ChannelListsV7,
  units: readonly U[],
  cultist: ChannelUnitFactsV7,
): number {
  const grip = gripsOf(lookup).find(
    (entry) => entry.cultistUnitId === cultist.id,
  );
  if (grip === undefined) return 0;
  const thing = units.find(
    (unit) => unit.id === grip.thingUnitId && unit.hp > 0,
  );
  return thing !== undefined &&
    thing.ownerId === cultist.ownerId &&
    thing.form === "LAND" &&
    chebyshev(thing.at, cultist.at) === 1 &&
    unitRoleRuleV7(lookup, thing).abilities.includes("ANCHOR")
    ? unitRoleMechanicsV7(lookup, thing).anchorStrands
    : 0;
}

// --------------------------------------------------------- Legality ---

/**
 * A cultist's channel action (Summon, Channel, Behold!, Boo!) is a primary
 * action: refused when the unit has used one or has a continuation waiting.
 * It may follow the unit's Move, also for a role that may not attack after
 * moving (the Idol Bearer, the Stargazer): section 8.1.
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

export type SummonRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | { readonly code: "INSUFFICIENT_FAVOUR"; readonly cost: number }
  | {
      readonly code: "SUMMON_NOT_LEGAL";
      readonly reason: "EMBARKED" | "HELPER" | "TILE";
    };

/**
 * Section 6.1: whether `helper` may help `summoner` summon: another own
 * robed cultist (in land form, with Channel, so never a mind-controlled
 * unit) on one of the eight tiles around the Summoner that has not used a
 * primary action (it may have moved) and is not Frozen.
 */
export function summonHelperLegalV7(
  lookup: ChannelLookupV7,
  summoner: ChannelUnitFactsV7,
  helper: ActorFactsV7 | undefined,
): boolean {
  return (
    helper !== undefined &&
    helper.hp > 0 &&
    helper.id !== summoner.id &&
    helper.ownerId === summoner.ownerId &&
    chebyshev(helper.at, summoner.at) === 1 &&
    isRobedCultistV7(lookup, helper) &&
    unitRoleRuleV7(lookup, helper).abilities.includes("CHANNEL") &&
    !primaryActedV7(helper) &&
    !unitIsFrozenV7(lookup, helper)
  );
}

/**
 * Section 6.1: whether a Horror of `actor` may be summoned on `at`: a tile
 * the actor knows, land (never water, and not ice: a summoned unit stands
 * on ground), with no unit, mound, Barricade, treasure chest, or curiosity,
 * not a settlement center (as for every unit an action places), a terrain a
 * Horror enters (it strides: Grass, Forest, Mountain), and not in territory
 * allied to the actor.
 */
export function summonTileLegalV7(
  facts: GiantTileFactsV7,
  actor: PlayerId,
  role: SummonedRoleIdV7,
  at: CoordV7,
): boolean {
  const tile = facts.tile(at);
  if (tile === undefined || tile.biome === null || tile.site !== null)
    return false;
  if (facts.occupied(at) || facts.chest(at) || facts.curiosity(at))
    return false;
  const mechanics = summonedUnitRoleMechanicsV7(role);
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: mechanics.movementMode,
      afloat: false,
      engineering: false,
      navigation: false,
      mountainBorn: mechanics.mountainBorn,
      ice: false,
    })
  )
    return false;
  return !(
    tile.territoryOwnerId !== null &&
    tile.territoryOwnerId !== actor &&
    facts.allied(actor, tile.territoryOwnerId)
  );
}

/**
 * Section 6.1, shared by the reducer and the public command query: the
 * first reason the Summoner `summoner` may not summon a Horror on `at` with
 * `helper` (the unit the command names if it is on the board, else
 * undefined), or null. `favour` is the seat's Favour.
 */
export function summonRejectionV7(
  lookup: ChannelLookupV7,
  facts: GiantTileFactsV7,
  favour: number,
  summoner: ActorFactsV7,
  helper: ActorFactsV7 | undefined,
  at: CoordV7,
): SummonRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, summoner).abilities.includes("SUMMON"))
    return { code: "UNIT_ROLE_INVALID" };
  if (summoner.form !== "LAND")
    return { code: "SUMMON_NOT_LEGAL", reason: "EMBARKED" };
  if (
    primaryActedV7(summoner) ||
    primaryActionBlockedAfterMoveV7(lookup, summoner)
  )
    return { code: "UNIT_ALREADY_ACTED" };
  if (!summonHelperLegalV7(lookup, summoner, helper))
    return { code: "SUMMON_NOT_LEGAL", reason: "HELPER" };
  const cost = CULT_SUMMONED_ROLE_RULES_V7.HORROR.favourCost ?? 0;
  if (favour < cost) return { code: "INSUFFICIENT_FAVOUR", cost };
  if (
    chebyshev(summoner.at, at) !== 1 ||
    !summonTileLegalV7(facts, summoner.ownerId, "HORROR", at)
  )
    return { code: "SUMMON_NOT_LEGAL", reason: "TILE" };
  return null;
}

export type ChannelRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "CHANNEL_NOT_LEGAL";
      readonly reason: "EMBARKED" | "DAEMON" | "RANGE";
    };

/**
 * Section 6.2, shared by the reducer and the public command query: the
 * first reason `cultist` may not channel `daemon` (the unit the command
 * names if it is on the board, else undefined), or null. The cultist is a
 * robed cultist in land form with Channel (a mind-controlled one has none:
 * the channel needs a Cult seat) that has not used a primary action; the
 * daemon is an own bound daemon within `CHANNEL_RANGE_V7` tiles.
 */
export function channelRejectionV7(
  lookup: ChannelLookupV7,
  cultist: ActorFactsV7,
  daemon: ChannelUnitFactsV7 | undefined,
): ChannelRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, cultist).abilities.includes("CHANNEL"))
    return { code: "UNIT_ROLE_INVALID" };
  if (!isRobedCultistV7(lookup, cultist))
    return { code: "CHANNEL_NOT_LEGAL", reason: "EMBARKED" };
  if (primaryActedV7(cultist)) return { code: "UNIT_ALREADY_ACTED" };
  if (
    daemon === undefined ||
    daemon.hp <= 0 ||
    daemon.ownerId !== cultist.ownerId ||
    !daemonIsBoundV7(daemon)
  )
    return { code: "CHANNEL_NOT_LEGAL", reason: "DAEMON" };
  if (chebyshev(cultist.at, daemon.at) > CHANNEL_RANGE_V7)
    return { code: "CHANNEL_NOT_LEGAL", reason: "RANGE" };
  return null;
}

export type BeholdRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "BEHOLD_NOT_LEGAL";
      readonly reason: "EMBARKED" | "RAISED";
    };

/**
 * Section 8.1, shared by the reducer and the public command query: the
 * first reason the Idol Bearer `bearer` may not raise its idol, or null.
 */
export function beholdRejectionV7(
  lookup: ChannelLookupV7,
  bearer: ActorFactsV7,
): BeholdRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, bearer).abilities.includes("BEHOLD"))
    return { code: "UNIT_ROLE_INVALID" };
  if (bearer.form !== "LAND")
    return { code: "BEHOLD_NOT_LEGAL", reason: "EMBARKED" };
  if (primaryActedV7(bearer)) return { code: "UNIT_ALREADY_ACTED" };
  if (idolsOf(lookup).includes(bearer.id))
    return { code: "BEHOLD_NOT_LEGAL", reason: "RAISED" };
  return null;
}

export type AnchorRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | {
      readonly code: "ANCHOR_NOT_LEGAL";
      readonly reason: "EMBARKED" | "GRIPPING" | "CULTIST";
    };

/**
 * Section 8.4, shared by the reducer and the public command query: the
 * first reason the Thing `thing` may not grip `cultist` (the unit the
 * command names if it is on the board, else undefined), or null. The grip
 * is not a primary action: the Thing may have moved or attacked. One grip
 * per Thing, one grip per cultist; the cultist is an own robed cultist next
 * to the Thing that holds a strand.
 */
export function anchorRejectionV7(
  lookup: ChannelLookupV7,
  thing: ChannelUnitFactsV7,
  cultist: ChannelUnitFactsV7 | undefined,
): AnchorRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, thing).abilities.includes("ANCHOR"))
    return { code: "UNIT_ROLE_INVALID" };
  if (thing.form !== "LAND")
    return { code: "ANCHOR_NOT_LEGAL", reason: "EMBARKED" };
  const grips = gripsOf(lookup);
  if (grips.some((grip) => grip.thingUnitId === thing.id))
    return { code: "ANCHOR_NOT_LEGAL", reason: "GRIPPING" };
  if (
    cultist === undefined ||
    cultist.hp <= 0 ||
    cultist.id === thing.id ||
    cultist.ownerId !== thing.ownerId ||
    chebyshev(cultist.at, thing.at) !== 1 ||
    !isRobedCultistV7(lookup, cultist) ||
    !strandsOf(lookup).some((strand) => strand.cultistUnitId === cultist.id) ||
    grips.some((grip) => grip.cultistUnitId === cultist.id)
  )
    return { code: "ANCHOR_NOT_LEGAL", reason: "CULTIST" };
  return null;
}

export type BooRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | { readonly code: "BOO_NOT_LEGAL"; readonly reason: "NOBODY" };

/**
 * Section 8.5: whether a Horror's Boo! scares `unit`: a living land-form
 * unit of any owner that is not a reward giant, a two-slot unit, an Egg
 * (not in land form), or a neutral unit. Undead units, constructs, and
 * daemons are not living.
 */
export function booScaresV7(
  roster: FactionRosterV7,
  unit: ChannelUnitFactsV7,
): boolean {
  return (
    unit.hp > 0 &&
    unit.form === "LAND" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    unit.role !== "JUGGERNAUT" &&
    unitCapacitySlotsV7(roster, unit) === 1 &&
    isLivingUnitV7(roster, unit)
  );
}

/** Section 8.5: the units a Boo! of `horror` reaches, in (y, x, ID) order. */
export function booVictimsV7<U extends ChannelUnitFactsV7>(
  roster: FactionRosterV7,
  units: readonly U[],
  horror: ChannelUnitFactsV7,
): readonly U[] {
  return units
    .filter(
      (unit) =>
        unit.id !== horror.id &&
        chebyshev(unit.at, horror.at) === 1 &&
        booScaresV7(roster, unit),
    )
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    );
}

/** Section 8.5: the tile one step directly away from the Horror. */
export function booDestinationV7(horror: CoordV7, from: CoordV7): CoordV7 {
  return { x: from.x + (from.x - horror.x), y: from.y + (from.y - horror.y) };
}

/**
 * Section 8.5, shared by the reducer and the public command query: the
 * first reason the Horror `horror` may not Boo, or null. It is a primary
 * action of a land-form Horror a seat commands, in place of its attack,
 * that may follow its Move; it needs somebody to scare (every unit beside
 * an own Horror is visible to its seat).
 */
export function booRejectionV7<U extends ChannelUnitFactsV7>(
  lookup: ChannelLookupV7,
  units: readonly U[],
  horror: ActorFactsV7,
): BooRejectionV7 | null {
  if (
    horror.form !== "LAND" ||
    !unitRoleRuleV7(lookup, horror).abilities.includes("BOO")
  )
    return { code: "UNIT_ROLE_INVALID" };
  if (primaryActedV7(horror)) return { code: "UNIT_ALREADY_ACTED" };
  if (booVictimsV7(lookup, units, horror).length === 0)
    return { code: "BOO_NOT_LEGAL", reason: "NOBODY" };
  return null;
}

// ------------------------------------------------------- Disruption ---

/**
 * Section 6.2, the status lists: the statuses another seat can put on a
 * unit. A watched unit that is in one of them after a command and was not
 * before it is disrupted. Every key of `GameStateV7` is classified in
 * `tests/fixtures/v7-disruption-paths.ts`; a new status list joins here.
 */
export function disruptingStatusKeysV7(
  state: Pick<
    GameStateV7,
    | "plagued"
    | "bitten"
    | "frozen"
    | "stuck"
    | "toothache"
    | "splattedThisTurn"
    | "terrorThisTurn"
    | "huntedThisTurn"
    | "bombedThisTurn"
    | "ninthUnit"
  >,
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const entry of state.plagued) keys.add(`plagued:${entry.unitId}`);
  for (const entry of state.bitten) keys.add(`bitten:${entry.unitId}`);
  for (const entry of state.frozen) keys.add(`frozen:${entry.unitId}`);
  for (const entry of state.stuck) keys.add(`stuck:${entry.unitId}`);
  for (const entry of state.toothache) keys.add(`toothache:${entry.unitId}`);
  for (const unitId of state.splattedThisTurn) keys.add(`splatted:${unitId}`);
  for (const unitId of state.terrorThisTurn) keys.add(`terror:${unitId}`);
  for (const unitId of state.huntedThisTurn) keys.add(`hunted:${unitId}`);
  for (const unitId of state.bombedThisTurn) keys.add(`bombed:${unitId}`);
  for (const unitId of state.ninthUnit.crackedThisTurn)
    keys.add(`cracked:${unitId}`);
  return keys;
}

/** The names of the status lists {@link disruptingStatusKeysV7} reads. */
export const DISRUPTING_STATUS_LISTS_V7 = Object.freeze([
  "plagued",
  "bitten",
  "frozen",
  "stuck",
  "toothache",
  "splattedThisTurn",
  "terrorThisTurn",
  "huntedThisTurn",
  "bombedThisTurn",
  "ninthUnit",
] as const);

const STATUS_PREFIXES_V7 = Object.freeze([
  "plagued",
  "bitten",
  "frozen",
  "stuck",
  "toothache",
  "splatted",
  "terror",
  "hunted",
  "bombed",
  "cracked",
]);

type DisruptionStateV7 = Pick<
  GameStateV7,
  | "units"
  | "players"
  | "mindControlled"
  | "cult"
  | (typeof DISRUPTING_STATUS_LISTS_V7)[number]
>;

/**
 * Section 6.2, the one disruption rule, for one unit: everything that
 * happened to the unit `unitId` between `before` and `after`, in the frozen
 * order of `DISRUPTION_CAUSES_V7`. It left the board when it is no longer a
 * land-form unit on it (a death, a Sacrifice, a Swallow, an embarkation);
 * otherwise it may have changed owner, lost Hit Points, been moved (it
 * stands elsewhere and is not `actingUnitId`, the unit whose own command
 * this is), or been given a status.
 */
export function unitDisruptionCausesV7(
  before: DisruptionStateV7,
  after: DisruptionStateV7,
  beforeStatuses: ReadonlySet<string>,
  afterStatuses: ReadonlySet<string>,
  unitId: UnitId,
  actingUnitId: UnitId | null,
): readonly DisruptionCauseV7[] {
  const was = before.units.find((unit) => unit.id === unitId);
  if (was === undefined) return [];
  const now = after.units.find((unit) => unit.id === unitId && unit.hp > 0);
  if (now === undefined || now.form !== "LAND") return ["GONE"];
  const causes: DisruptionCauseV7[] = [];
  if (now.hp < was.hp) causes.push("HP_LOSS");
  if (
    (now.at.x !== was.at.x || now.at.y !== was.at.y) &&
    unitId !== actingUnitId
  )
    causes.push("MOVED");
  if (
    STATUS_PREFIXES_V7.some(
      (prefix) =>
        afterStatuses.has(`${prefix}:${unitId}`) &&
        !beforeStatuses.has(`${prefix}:${unitId}`),
    )
  )
    causes.push("STATUS");
  if (now.ownerId !== was.ownerId) causes.push("OWNER");
  return causes;
}

/**
 * Section 6.2: the disruptions of one command (or of the steps of a Start
 * Turn so far): the strands, grips, and raised idols of `before` whose unit
 * was disrupted between `before` and `after`, as events, and the Cult state
 * of `after` without them.
 *
 * - **A strand** breaks when its cultist is disrupted by anything, except
 *   that a cultist that only lost Hit Points keeps it under Behold!
 *   (section 8.1): at the start of the command it stood on one of the eight
 *   tiles around an own Idol Bearer whose idol was raised, and that Idol
 *   Bearer was not itself disrupted in the command (hit the Idol Bearer too
 *   and the ward is gone: section 13.1).
 * - **A grip** fails when its Thing was moved, given a status, taken, or
 *   removed (its own HP loss never matters: section 8.4), and ends with its
 *   cultist's strand.
 * - **An idol** drops when its bearer is disrupted by anything.
 *
 * `actingUnitId` is the unit the command names as its actor (its own Move,
 * advance, or gate traversal is not a displacement); null for `END_TURN`.
 * `skipSeat` is a seat whose Start Turn check already ran in this command
 * (its strands, grips, and idols were judged before the check and cleared
 * by it); `reported` are the events of the command so far, whose reported
 * units are not reported twice.
 */
export function cultDisruptionsV7(
  before: DisruptionStateV7,
  after: DisruptionStateV7,
  actingUnitId: UnitId | null,
  skipSeat: PlayerId | null = null,
  reported: readonly DomainEventV7[] = [],
): { readonly cult: CultStateV7; readonly events: readonly DomainEventV7[] } {
  const watched = before.cult;
  if (
    watched.strands.length === 0 &&
    watched.grips.length === 0 &&
    watched.idols.length === 0
  )
    return { cult: after.cult, events: [] };
  const beforeStatuses = disruptingStatusKeysV7(before);
  const afterStatuses = disruptingStatusKeysV7(after);
  const memo = new Map<UnitId, readonly DisruptionCauseV7[]>();
  const causesOf = (unitId: UnitId): readonly DisruptionCauseV7[] => {
    let causes = memo.get(unitId);
    if (causes === undefined) {
      causes = unitDisruptionCausesV7(
        before,
        after,
        beforeStatuses,
        afterStatuses,
        unitId,
        actingUnitId,
      );
      memo.set(unitId, causes);
    }
    return causes;
  };
  const ownerBefore = (unitId: UnitId): PlayerId | undefined =>
    before.units.find((unit) => unit.id === unitId)?.ownerId;
  const brokenStrands = new Set<UnitId>();
  const droppedIdols = new Set<UnitId>();
  const failedGrips = new Set<UnitId>();
  for (const event of reported) {
    if (event.kind === "STRAND_BROKEN") brokenStrands.add(event.unitId);
    if (event.kind === "IDOL_DROPPED") droppedIdols.add(event.unitId);
    if (event.kind === "ANCHOR_BROKEN") failedGrips.add(event.unitId);
  }
  const events: DomainEventV7[] = [];
  // Behold!: the raised idols of `before` whose bearer was not disrupted.
  const wards = watched.idols.flatMap((unitId) => {
    const bearer = before.units.find((unit) => unit.id === unitId);
    return bearer !== undefined && causesOf(unitId).length === 0
      ? [bearer]
      : [];
  });
  const warded = (cultist: UnitStateV7): boolean =>
    isRobedCultistV7(before, cultist) &&
    wards.some(
      (bearer) =>
        bearer.id !== cultist.id &&
        bearer.ownerId === cultist.ownerId &&
        chebyshev(bearer.at, cultist.at) === 1,
    );
  const newlyBroken = new Set<UnitId>();
  for (const strand of watched.strands) {
    const cultist = before.units.find(
      (unit) => unit.id === strand.cultistUnitId,
    );
    if (
      cultist === undefined ||
      cultist.ownerId === skipSeat ||
      brokenStrands.has(cultist.id)
    )
      continue;
    const causes = causesOf(cultist.id);
    // Under Behold! the loss of Hit Points does not count; what else
    // happened to the cultist still does (and is what is reported).
    const effective =
      causes.includes("HP_LOSS") && warded(cultist)
        ? causes.filter((candidate) => candidate !== "HP_LOSS")
        : causes;
    const cause = effective[0];
    if (cause === undefined) continue;
    newlyBroken.add(cultist.id);
    // A strand to a daemon that left the board in the same command is
    // simply gone; nothing snapped.
    if (
      after.units.some((unit) => unit.id === strand.daemonUnitId && unit.hp > 0)
    )
      events.push({
        kind: "STRAND_BROKEN",
        playerId: cultist.ownerId,
        unitId: cultist.id,
        daemonUnitId: strand.daemonUnitId,
        cause,
      });
  }
  const newlyFailed = new Set<UnitId>();
  for (const grip of watched.grips) {
    const owner = ownerBefore(grip.thingUnitId);
    if (
      owner === undefined ||
      owner === skipSeat ||
      failedGrips.has(grip.thingUnitId)
    )
      continue;
    if (
      newlyBroken.has(grip.cultistUnitId) ||
      brokenStrands.has(grip.cultistUnitId)
    ) {
      newlyFailed.add(grip.thingUnitId);
      continue;
    }
    const cause = causesOf(grip.thingUnitId).find(
      (candidate): candidate is Exclude<DisruptionCauseV7, "HP_LOSS"> =>
        candidate !== "HP_LOSS",
    );
    if (cause === undefined) continue;
    newlyFailed.add(grip.thingUnitId);
    events.push({
      kind: "ANCHOR_BROKEN",
      playerId: owner,
      unitId: grip.thingUnitId,
      cultistUnitId: grip.cultistUnitId,
      cause,
    });
  }
  const newlyDropped = new Set<UnitId>();
  for (const unitId of watched.idols) {
    const owner = ownerBefore(unitId);
    if (owner === undefined || owner === skipSeat || droppedIdols.has(unitId))
      continue;
    const cause = causesOf(unitId)[0];
    if (cause === undefined) continue;
    newlyDropped.add(unitId);
    events.push({ kind: "IDOL_DROPPED", playerId: owner, unitId, cause });
  }
  if (
    newlyBroken.size === 0 &&
    newlyFailed.size === 0 &&
    newlyDropped.size === 0
  )
    return { cult: after.cult, events };
  return {
    cult: {
      ...after.cult,
      strands: after.cult.strands.filter(
        (strand) => !newlyBroken.has(strand.cultistUnitId),
      ),
      grips: after.cult.grips.filter(
        (grip) =>
          !newlyFailed.has(grip.thingUnitId) &&
          !newlyBroken.has(grip.cultistUnitId),
      ),
      idols: after.cult.idols.filter((unitId) => !newlyDropped.has(unitId)),
    },
    events,
  };
}

/**
 * The structural half of the channel lists (every reducer output runs
 * through it before validation, with `prunedCultV7`): a strand needs its
 * cultist (a land-form robed cultist with Channel on the board) and its
 * daemon (on the board, of the same seat); a grip its Thing (in land form,
 * with Anchor, next to its cultist, of the same seat) and its cultist's
 * strand; an idol its bearer (in land form, with Behold!). What it drops
 * was reported, or is reported at the end of the command, by
 * {@link cultDisruptionsV7}, which reads the state before the command.
 */
export function prunedChannelV7(state: GameStateV7): GameStateV7 {
  const cult = state.cult;
  if (
    cult.strands.length === 0 &&
    cult.grips.length === 0 &&
    cult.idols.length === 0
  )
    return state;
  const unitById = new Map(
    state.units.filter((unit) => unit.hp > 0).map((unit) => [unit.id, unit]),
  );
  const strands = cult.strands.filter((strand) => {
    const cultist = unitById.get(strand.cultistUnitId);
    const daemon = unitById.get(strand.daemonUnitId);
    return (
      cultist !== undefined &&
      daemon !== undefined &&
      cultist.ownerId === daemon.ownerId &&
      daemonRoleV7(daemon) !== null &&
      isRobedCultistV7(state, cultist) &&
      unitRoleRuleV7(state, cultist).abilities.includes("CHANNEL")
    );
  });
  const grips = cult.grips.filter((grip) => {
    const thing = unitById.get(grip.thingUnitId);
    const cultist = unitById.get(grip.cultistUnitId);
    return (
      thing !== undefined &&
      cultist !== undefined &&
      thing.form === "LAND" &&
      thing.ownerId === cultist.ownerId &&
      chebyshev(thing.at, cultist.at) === 1 &&
      unitRoleRuleV7(state, thing).abilities.includes("ANCHOR") &&
      strands.some((strand) => strand.cultistUnitId === cultist.id)
    );
  });
  const idols = cult.idols.filter((unitId) => {
    const bearer = unitById.get(unitId);
    return (
      bearer !== undefined &&
      bearer.form === "LAND" &&
      unitRoleRuleV7(state, bearer).abilities.includes("BEHOLD")
    );
  });
  return strands.length === cult.strands.length &&
    grips.length === cult.grips.length &&
    idols.length === cult.idols.length
    ? state
    : { ...state, cult: { ...cult, strands, grips, idols } };
}

// --------------------------------------------------- The Start Turn ---

/**
 * Sections 6.2 and 13.3: the channel step of the Start Turn of `playerId`,
 * after Plague and its chains and before Egg hatching. `original` is the
 * state the `END_TURN` began with.
 *
 * 1. The disruptions of the command so far (the neutral turn, Black Ice,
 *    the surfacing, Plague and its chains) break their strands.
 * 2. **The check:** each bound daemon of the seat, in unit-ID order, needs
 *    holding strands ({@link holdingStrandsV7}) of at least its Control, or
 *    it is Unbound (`DAEMON_UNBOUND`). Until the Unbound rules
 *    (`pulp_wars-mch9.6`: the neutral owner, the rampage, Furious) an
 *    Unbound daemon leaves the board (`UNIT_DIED` cause `UNBOUND`).
 * 3. Every strand and grip of the seat is cleared: it must channel again.
 * 4. The idols of the seat's Idol Bearers are lowered (`IDOL_DROPPED` cause
 *    `EXPIRED`): Behold! lasts until the end of this check.
 *
 * Returns the state itself and no event when nothing of it applied.
 */
export function resolveStartTurnChannelV7(
  original: GameStateV7,
  state: GameStateV7,
  playerId: PlayerId,
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
  /** The daemons that left the board (the live economy may change). */
  readonly removedUnitIds: readonly UnitId[];
} {
  const hasChannel =
    state.cult.strands.length > 0 ||
    state.cult.grips.length > 0 ||
    state.cult.idols.length > 0 ||
    original.cult.strands.length > 0 ||
    original.cult.grips.length > 0 ||
    original.cult.idols.length > 0;
  const daemons = state.units
    .filter(
      (unit) =>
        unit.hp > 0 && unit.ownerId === playerId && daemonIsBoundV7(unit),
    )
    .sort((left, right) => left.id - right.id);
  if (!hasChannel && daemons.length === 0)
    return { state, events: [], removedUnitIds: [] };
  const events: DomainEventV7[] = [];
  const disrupted = cultDisruptionsV7(original, state, null);
  events.push(...disrupted.events);
  let current: GameStateV7 =
    disrupted.cult === state.cult ? state : { ...state, cult: disrupted.cult };
  const removed: UnitId[] = [];
  for (const daemon of daemons) {
    const control = daemonControlV7(daemon);
    const strands = holdingStrandsV7(current, current.units, daemon);
    if (strands >= control) continue;
    removed.push(daemon.id);
    events.push(
      {
        kind: "DAEMON_UNBOUND",
        unitId: daemon.id,
        summonerPlayerId: playerId,
        strands,
        control,
      },
      { kind: "UNIT_DIED", unitId: daemon.id, cause: "UNBOUND" },
    );
    current = {
      ...current,
      units: current.units.filter((unit) => unit.id !== daemon.id),
    };
  }
  const ownerOf = (unitId: UnitId): PlayerId | undefined =>
    current.units.find((unit) => unit.id === unitId)?.ownerId ??
    state.units.find((unit) => unit.id === unitId)?.ownerId;
  const expired = current.cult.idols.filter(
    (unitId) => ownerOf(unitId) === playerId,
  );
  for (const unitId of expired)
    events.push({
      kind: "IDOL_DROPPED",
      playerId,
      unitId,
      cause: "EXPIRED",
    });
  const cult: CultStateV7 = {
    ...current.cult,
    strands: current.cult.strands.filter(
      (strand) => ownerOf(strand.cultistUnitId) !== playerId,
    ),
    grips: current.cult.grips.filter(
      (grip) => ownerOf(grip.thingUnitId) !== playerId,
    ),
    idols: current.cult.idols.filter((unitId) => !expired.includes(unitId)),
  };
  const changed =
    cult.strands.length !== current.cult.strands.length ||
    cult.grips.length !== current.cult.grips.length ||
    cult.idols.length !== current.cult.idols.length;
  return {
    state: changed ? { ...current, cult } : current,
    events,
    removedUnitIds: removed,
  };
}

// ----------------------------------------------------- Reducer steps ---

type SummonCommandV7 = Extract<CommandV7, { kind: "SUMMON" }>;
type ChannelCommandV7 = Extract<CommandV7, { kind: "CHANNEL" }>;
type AnchorCommandV7 = Extract<CommandV7, { kind: "ANCHOR" }>;
type UnitCommandV7 = { readonly unitId: UnitId };

/** Marks a unit as having used its primary action. */
function withPrimaryUsed(unit: UnitStateV7): UnitStateV7 {
  return {
    ...unit,
    activation: { ...unit.activation, specialActed: true, handled: true },
  };
}

function withStrand(
  cult: CultStateV7,
  cultistUnitId: UnitId,
  daemonUnitId: UnitId,
): CultStateV7 {
  return {
    ...cult,
    strands: [
      ...cult.strands.filter(
        (strand) => strand.cultistUnitId !== cultistUnitId,
      ),
      { cultistUnitId, daemonUnitId },
    ].sort((left, right) => left.cultistUnitId - right.cultistUnitId),
  };
}

function rejectWith(
  kit: CultReducerKitV7,
  original: GameStateV7,
  unit: UnitStateV7,
  rejection:
    | SummonRejectionV7
    | ChannelRejectionV7
    | BeholdRejectionV7
    | AnchorRejectionV7
    | BooRejectionV7,
): ApplyCommandResultV7 {
  switch (rejection.code) {
    case "UNIT_ROLE_INVALID":
      return kit.rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
    case "UNIT_ALREADY_ACTED":
      return kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
    case "INSUFFICIENT_FAVOUR":
      return kit.rejected(original, "INSUFFICIENT_FAVOUR", {
        cost: rejection.cost,
      });
    default:
      return kit.rejected(original, rejection.code, {
        reason: rejection.reason,
      });
  }
}

/**
 * Section 6.1: `SUMMON`, a primary action of a Summoner that may follow its
 * Move. The seat pays 5 Favour (`FAVOUR_SPENT`); a Horror of the actor
 * stands on `at` at full HP, exhausted until the next turn, with no home
 * city (`DAEMON_SUMMONED`); the Summoner and the helper have each channelled
 * it (`STRAND_FORMED`, in unit-ID order) and their primary actions are
 * spent.
 */
export function applySummonV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: SummonCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const summoner = actorCheck.unit;
  const helper = state.units.find(
    (unit) => unit.id === command.helperUnitId && unit.hp > 0,
  );
  const rejection = summonRejectionV7(
    state,
    canonicalGiantTileFactsV7(state, actor),
    favourOfV7(state, actor),
    summoner,
    helper,
    command.at,
  );
  if (rejection !== null) return rejectWith(kit, original, summoner, rejection);
  if (helper === undefined) return kit.rejected(original, "INVALID_STATE");
  try {
    const role: SummonedRoleIdV7 = "HORROR";
    const registration = CULT_SUMMONED_ROLE_RULES_V7[role];
    const rule = summonedUnitRoleRuleV7(role);
    const mechanicalRole = SUMMONED_MECHANICAL_ROLES_V7[role];
    const cost = registration.favourCost;
    if (mechanicalRole === undefined || cost === null)
      throw new RangeError("INVALID_STATE");
    const allocation = allocateUnitId(state.nextEntityId);
    const horror: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: null,
      role: mechanicalRole,
      form: "LAND",
      at: { x: command.at.x, y: command.at.y },
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: kit.exhaustedActivation(),
      summoned: role,
    };
    const spent = withFavourSpentV7(state.cult, actor, cost);
    const [first, second] =
      summoner.id < helper.id ? [summoner, helper] : [helper, summoner];
    const cult = withStrand(
      withStrand(spent, summoner.id, horror.id),
      helper.id,
      horror.id,
    );
    const events: DomainEventV7[] = [
      {
        kind: "FAVOUR_SPENT",
        playerId: actor,
        purpose: "SUMMON_HORROR",
        amount: cost,
        favour: favourOfV7({ cult }, actor),
      },
      {
        kind: "DAEMON_SUMMONED",
        playerId: actor,
        unitId: summoner.id,
        helperUnitId: helper.id,
        daemonUnitId: horror.id,
        role,
        at: horror.at,
        hp: horror.hp,
      },
      {
        kind: "STRAND_FORMED",
        playerId: actor,
        unitId: first.id,
        daemonUnitId: horror.id,
      },
      {
        kind: "STRAND_FORMED",
        playerId: actor,
        unitId: second.id,
        daemonUnitId: horror.id,
      },
    ];
    const units = [
      ...state.units.map((unit) =>
        unit.id === summoner.id || unit.id === helper.id
          ? withPrimaryUsed(unit)
          : unit,
      ),
      horror,
    ];
    const sightState: GameStateV7 = { ...state, units };
    const reveal = kit.revealRadius(
      sightState,
      actor,
      horror.at,
      unitSightRadiusAtV7(sightState, horror),
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
        commandIndex: kit.nextSafe(state.commandIndex),
        nextEntityId: allocation.nextEntityId,
        units,
        players: kit.setExplored(state.players, actor, reveal.explored),
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
 * Section 6.2: `CHANNEL`, a primary action of a robed cultist that may
 * follow its Move: it holds a strand to the daemon until its seat's next
 * Start Turn check (`STRAND_FORMED`).
 */
export function applyChannelV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: ChannelCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const cultist = actorCheck.unit;
  const daemon = state.units.find(
    (unit) => unit.id === command.daemonUnitId && unit.hp > 0,
  );
  const rejection = channelRejectionV7(state, cultist, daemon);
  if (rejection !== null) return rejectWith(kit, original, cultist, rejection);
  if (daemon === undefined) return kit.rejected(original, "INVALID_STATE");
  return kit.accepted(
    kit.checked({
      ...state,
      commandIndex: kit.nextSafe(state.commandIndex),
      units: state.units.map((unit) =>
        unit.id === cultist.id ? withPrimaryUsed(unit) : unit,
      ),
      cult: withStrand(state.cult, cultist.id, daemon.id),
    }),
    [
      {
        kind: "STRAND_FORMED",
        playerId: actor,
        unitId: cultist.id,
        daemonUnitId: daemon.id,
      },
    ],
  );
}

/**
 * Section 8.1: `BEHOLD`, a primary action of an Idol Bearer that may follow
 * its Move: its idol is raised (`IDOL_RAISED`) until the end of the channel
 * check of its owner's next Start Turn, or until it is disrupted.
 */
export function applyBeholdV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: UnitCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const bearer = actorCheck.unit;
  const rejection = beholdRejectionV7(state, bearer);
  if (rejection !== null) return rejectWith(kit, original, bearer, rejection);
  return kit.accepted(
    kit.checked({
      ...state,
      commandIndex: kit.nextSafe(state.commandIndex),
      units: state.units.map((unit) =>
        unit.id === bearer.id ? withPrimaryUsed(unit) : unit,
      ),
      cult: {
        ...state.cult,
        idols: [...state.cult.idols, bearer.id].sort(
          (left, right) => left - right,
        ),
      },
    }),
    [{ kind: "IDOL_RAISED", playerId: actor, unitId: bearer.id }],
  );
}

/**
 * Section 8.4: `ANCHOR`, the Thing's grip on a channeller beside it
 * (`ANCHOR_GRIPPED`). Not a primary action: the Thing's activation does not
 * change.
 */
export function applyAnchorV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: AnchorCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const thing = actorCheck.unit;
  const cultist = state.units.find(
    (unit) => unit.id === command.cultistUnitId && unit.hp > 0,
  );
  const rejection = anchorRejectionV7(state, thing, cultist);
  if (rejection !== null) return rejectWith(kit, original, thing, rejection);
  if (cultist === undefined) return kit.rejected(original, "INVALID_STATE");
  return kit.accepted(
    kit.checked({
      ...state,
      commandIndex: kit.nextSafe(state.commandIndex),
      cult: {
        ...state.cult,
        grips: [
          ...state.cult.grips,
          { thingUnitId: thing.id, cultistUnitId: cultist.id },
        ].sort((left, right) => left.thingUnitId - right.thingUnitId),
      },
    }),
    [
      {
        kind: "ANCHOR_GRIPPED",
        playerId: actor,
        unitId: thing.id,
        cultistUnitId: cultist.id,
      },
    ],
  );
}

/**
 * Section 8.5: the jumps of a Boo! of `horror` on `state`, in (y, x, ID)
 * order, each resolved on the board the earlier jumps left: a scared unit
 * moves one tile directly away from the Horror when that tile passes the
 * Push conditions (`displacementDestinationLegalV7`), and stays otherwise.
 */
export function planBooV7(
  state: GameStateV7,
  horror: UnitStateV7,
): {
  readonly units: readonly UnitStateV7[];
  readonly results: readonly ScaredUnitV7[];
} {
  let units = state.units;
  const results: ScaredUnitV7[] = [];
  for (const victim of booVictimsV7(state, state.units, horror)) {
    const to = booDestinationV7(horror.at, victim.at);
    const moves = displacementDestinationLegalV7(
      units === state.units ? state : { ...state, units },
      victim,
      to,
    );
    results.push({
      unitId: victim.id,
      from: { x: victim.at.x, y: victim.at.y },
      to: moves ? to : null,
    });
    if (moves)
      units = units.map((unit) =>
        unit.id === victim.id
          ? { ...unit, at: to, captureEligible: false }
          : unit,
      );
  }
  return { units, results };
}

/**
 * Section 8.5: `BOO`, a primary action of a bound land-form Horror in place
 * of its attack, that may follow its Move (`UNITS_SCARED`). No damage, no
 * retaliation; a jump is not a Move. Each moved unit reveals its sight
 * where it lands. A moved cultist is disrupted (the command's disruption
 * step).
 */
export function applyBooV7(
  kit: CultReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: UnitCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const horror = actorCheck.unit;
  const rejection = booRejectionV7(state, state.units, horror);
  if (rejection !== null) return rejectWith(kit, original, horror, rejection);
  try {
    const plan = planBooV7(state, horror);
    const units = plan.units.map((unit) =>
      unit.id === horror.id ? withPrimaryUsed(unit) : unit,
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNITS_SCARED",
        playerId: actor,
        unitId: horror.id,
        at: { x: horror.at.x, y: horror.at.y },
        results: plan.results,
      },
    ];
    let players = state.players;
    for (const result of plan.results) {
      if (result.to === null) continue;
      const moved = units.find((unit) => unit.id === result.unitId);
      if (moved === undefined) continue;
      const sightState: GameStateV7 = { ...state, units, players };
      const reveal = kit.revealRadius(
        sightState,
        moved.ownerId,
        moved.at,
        unitSightRadiusAtV7(sightState, moved),
      );
      players = kit.setExplored(players, moved.ownerId, reveal.explored);
      if (reveal.revealed.length > 0)
        events.push({
          kind: "TILES_REVEALED",
          playerId: moved.ownerId,
          tiles: reveal.revealed,
        });
    }
    const staged = kit.graveActionTail(
      {
        ...state,
        commandIndex: kit.nextSafe(state.commandIndex),
        units,
        players,
      },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
