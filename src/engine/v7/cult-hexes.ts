import type { PlayerId, UnitId } from "../model/ids";
import {
  RIBBIT_RANGE_V7,
  SWITCHEROO_RANGE_V7,
  TENTACLE_RANGE_V7,
  canEnterTerrainV7,
  primaryActionBlockedAfterMoveV7,
  unitCapacitySlotsV7,
  unitIsMountainBornV7,
  unitIsSummonedV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type FrozenLookupV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import type { CommandV7 } from "./commands";
import { arePlayersHostileV7 } from "./economy";
import { awestruckRefusingAttackV7, type WardenLookupV7 } from "./cult-warden";
import type { GiantTileFactsV7 } from "./giants";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type GameStateV7,
  type UnitActivationV7,
  type UnitFormV7,
  type UnitRoleIdV7,
} from "./types";

/**
 * The Cultists of the Ancient Ones, hexes and tricks (`pulp_wars-mch9.8`,
 * the sixth Cult engine bead; docs/product/RULESET_7_CULTISTS.md sections
 * 9.1 to 9.3 and 8.7): what the canonical state and a player's view share
 * of Ribbit and the frog, Switcheroo, and the Tentacle and Grab: who is a
 * frog, who is grabbed, the legality of the three commands, and the frog's
 * restriction on other commands ({@link trickRefusalV7}). (The Chosen's
 * Pick Me! retired with the Chosen: the Cult redesign, `pulp_wars-mch9.31`.) The reducer steps are in
 * src/engine/v7/cult-tricks.ts.
 *
 * The helpers read only facts that canonical state and a player's view
 * share, so the public command query and the reducer agree exactly. This
 * module imports no rule module that reads it (movement and combat do).
 */

/** The unit facts the trick helpers read (state and public units). */
export interface TrickUnitFactsV7 extends SummonedUnitRefV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
}
type ActorFactsV7 = TrickUnitFactsV7 & {
  readonly activation: UnitActivationV7;
};

/**
 * The trick lists of a state or a view. In a view a Tentacle's caller or
 * grabbed unit that the viewer does not see is null; a view captured before
 * the tricks has no lists (they read as empty).
 */
export interface TrickListsV7 {
  readonly cult?: {
    readonly frogs?: readonly UnitId[];
    readonly hexCooldowns?: readonly { readonly unitId: UnitId }[];
    readonly tentacles?: readonly {
      readonly unitId: UnitId;
      readonly callerUnitId: UnitId | null;
      readonly grabbedUnitId: UnitId | null;
    }[];
    /**
     * The rituals under way (`pulp_wars-mch9.61`: the Great Summoning's
     * circle leaves out a cultist that chants for a star already).
     */
    readonly rituals?: readonly {
      readonly leaderUnitId: UnitId | null;
      readonly chanterUnitIds: readonly UnitId[];
    }[];
  };
}

const NO_IDS: readonly UnitId[] = Object.freeze([]);
const frogsOf = (lookup: TrickListsV7) => lookup.cult?.frogs ?? NO_IDS;
const tentaclesOf = (lookup: TrickListsV7) => lookup.cult?.tentacles ?? [];
const cooldownsOf = (lookup: TrickListsV7) => lookup.cult?.hexCooldowns ?? [];

// --------------------------------------------------------------- Frogs ---

/**
 * Section 9.1: whether the unit is a frog. A frog has Defense 0.5 flat, no
 * fortification and no cover, Move 1, and no attack, retaliation, capture,
 * or other primary action; it still blocks its tile and exerts its zone of
 * control. False for every unit of a match without a Cult seat.
 */
export function unitIsFrogV7(
  lookup: TrickListsV7,
  unit: { readonly id: UnitId },
): boolean {
  const frogs = frogsOf(lookup);
  return frogs.length > 0 && frogs.includes(unit.id);
}

/**
 * Sections 9.1 and 9.2: whether a hex or a swap takes `unit` at all: a
 * land-form unit of a player that is not a reward giant, a two-slot unit,
 * an Egg (it is not in land form), a neutral unit, or a summoned unit (a
 * daemon; so never the Unstoppable Herald).
 */
export function trickTakesV7(
  roster: FactionRosterV7,
  unit: TrickUnitFactsV7,
): boolean {
  return (
    unit.hp > 0 &&
    unit.form === "LAND" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    !unitIsSummonedV7(unit) &&
    unit.role !== "JUGGERNAUT" &&
    unitCapacitySlotsV7(roster, unit) === 1
  );
}

/**
 * A trick is a primary action: refused when the unit has used one or has a
 * continuation waiting. It may follow the unit's Move.
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

/** Sections 9.1 and 9.2: whether the unit's trick is on cooldown. */
export function hexOnCooldownV7(
  lookup: TrickListsV7,
  unit: { readonly id: UnitId },
): boolean {
  const cooldowns = cooldownsOf(lookup);
  return (
    cooldowns.length > 0 && cooldowns.some((entry) => entry.unitId === unit.id)
  );
}

export type RibbitRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "RIBBIT_NOT_LEGAL";
      readonly reason:
        "EMBARKED" | "COOLDOWN" | "TARGET" | "IMMUNE" | "FROG" | "RANGE";
    };

/**
 * Section 9.1, shared by the reducer and the public command query: the
 * first reason the Hexer `hexer` may not Ribbit `target` (the unit the
 * command names if it is on the board and the actor sees it, else
 * undefined), or null. The Hexer is a land-form unit with Ribbit that has
 * not used a primary action (it may have moved) and did not cast on its
 * owner's previous turn; the target is a hostile land-form unit within
 * `RIBBIT_RANGE_V7` tiles that a hex takes ({@link trickTakesV7}) and that
 * is not a frog already.
 */
export function ribbitRejectionV7(
  lookup: FrozenLookupV7 &
    TrickListsV7 &
    Pick<GameStateV7, "setup" | "humanPlayerId">,
  hexer: ActorFactsV7,
  target: TrickUnitFactsV7 | undefined,
): RibbitRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, hexer).abilities.includes("RIBBIT"))
    return { code: "UNIT_ROLE_INVALID" };
  if (hexer.form !== "LAND")
    return { code: "RIBBIT_NOT_LEGAL", reason: "EMBARKED" };
  if (primaryActedV7(hexer) || primaryActionBlockedAfterMoveV7(lookup, hexer))
    return { code: "UNIT_ALREADY_ACTED" };
  if (hexOnCooldownV7(lookup, hexer))
    return { code: "RIBBIT_NOT_LEGAL", reason: "COOLDOWN" };
  if (
    target === undefined ||
    target.hp <= 0 ||
    target.id === hexer.id ||
    !arePlayersHostileV7(lookup, hexer.ownerId, target.ownerId)
  )
    return { code: "RIBBIT_NOT_LEGAL", reason: "TARGET" };
  if (!trickTakesV7(lookup, target))
    return { code: "RIBBIT_NOT_LEGAL", reason: "IMMUNE" };
  if (unitIsFrogV7(lookup, target))
    return { code: "RIBBIT_NOT_LEGAL", reason: "FROG" };
  if (chebyshev(hexer.at, target.at) > RIBBIT_RANGE_V7)
    return { code: "RIBBIT_NOT_LEGAL", reason: "RANGE" };
  return null;
}

// ---------------------------------------------------------- Switcheroo ---

/**
 * Section 9.2, the rule every shove uses, for one unit of a swap: whether
 * `unit` may stand on `at`, the tile the other unit leaves. The tile is
 * known to the actor, is not a settlement center, is of a terrain the unit
 * enters (the shared `canEnterTerrainV7`, with the **actor's** Engineering
 * and Navigation, as for a Tractor Beam, so the offer is exact), and is not
 * in territory allied to the unit. The other unit is leaving it, so its
 * occupancy is not read.
 */
export function swapStandLegalV7(
  roster: FactionRosterV7,
  facts: GiantTileFactsV7,
  technology: { readonly engineering: boolean; readonly navigation: boolean },
  unit: TrickUnitFactsV7,
  at: CoordV7,
): boolean {
  const tile = facts.tile(at);
  if (tile === undefined || tile.site !== null) return false;
  if (
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(roster, unit),
      afloat: false,
      ...technology,
      mountainBorn: unitIsMountainBornV7(roster, unit),
      ice: facts.ice(at),
    })
  )
    return false;
  return !(
    tile.territoryOwnerId !== null &&
    tile.territoryOwnerId !== unit.ownerId &&
    facts.allied(unit.ownerId, tile.territoryOwnerId)
  );
}

export type SwitcherooRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "SWITCHEROO_NOT_LEGAL";
      readonly reason:
        | "EMBARKED"
        | "TECHNOLOGY"
        | "COOLDOWN"
        | "TARGET"
        | "IMMUNE"
        | "RANGE"
        | "CENTER"
        | "TILE";
    };

/**
 * Section 9.2, shared by the reducer and the public command query: the
 * first reason the Familiar `familiar` may not swap with `target` (the unit
 * the command names if it is on the board and the actor sees it, else
 * undefined), or null. `unlocked` is the capability `switcheroo` of the
 * Familiar's controller's research in the Familiar's own tree (Scouting);
 * `technology` is that controller's Engineering and Navigation.
 *
 * The Familiar is a land-form unit with Switcheroo that has not used a
 * primary action (it may have moved) and did not swap on its owner's
 * previous turn. The target is a land-form unit of any player within
 * `SWITCHEROO_RANGE_V7` tiles that a swap takes ({@link trickTakesV7}) and
 * that nothing holds in place (a Jawbreaker is Rock Hard). Neither tile is
 * a settlement center, and each unit may stand where the other stood
 * ({@link swapStandLegalV7}).
 */
export function switcherooRejectionV7(
  lookup: FrozenLookupV7 & TrickListsV7,
  facts: GiantTileFactsV7,
  unlocked: boolean,
  technology: { readonly engineering: boolean; readonly navigation: boolean },
  familiar: ActorFactsV7,
  target: TrickUnitFactsV7 | undefined,
): SwitcherooRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, familiar).abilities.includes("SWITCHEROO"))
    return { code: "UNIT_ROLE_INVALID" };
  if (familiar.form !== "LAND")
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "EMBARKED" };
  if (!unlocked) return { code: "SWITCHEROO_NOT_LEGAL", reason: "TECHNOLOGY" };
  if (
    primaryActedV7(familiar) ||
    primaryActionBlockedAfterMoveV7(lookup, familiar)
  )
    return { code: "UNIT_ALREADY_ACTED" };
  if (hexOnCooldownV7(lookup, familiar))
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "COOLDOWN" };
  if (target === undefined || target.hp <= 0 || target.id === familiar.id)
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "TARGET" };
  if (
    !trickTakesV7(lookup, target) ||
    unitRoleMechanicsV7(lookup, target).immovable
  )
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "IMMUNE" };
  if (chebyshev(familiar.at, target.at) > SWITCHEROO_RANGE_V7)
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "RANGE" };
  const here = facts.tile(familiar.at);
  const there = facts.tile(target.at);
  if (here === undefined || there === undefined)
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "TILE" };
  if (here.site !== null || there.site !== null)
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "CENTER" };
  if (
    !swapStandLegalV7(lookup, facts, technology, familiar, target.at) ||
    !swapStandLegalV7(lookup, facts, technology, target, familiar.at)
  )
    return { code: "SWITCHEROO_NOT_LEGAL", reason: "TILE" };
  return null;
}

// ------------------------------------------------- Tentacle and Grab ---

/** Section 9.3: whether the unit is a Tentacle (a neutral summoned unit). */
export function unitIsTentacleV7(
  unit: SummonedUnitRefV7 & { readonly ownerId: PlayerId },
): boolean {
  return unit.summoned === "TENTACLE" && isNeutralOwnerV7(unit.ownerId);
}

/**
 * Section 9.3, Grab: the tile of the Tentacle that holds the unit `unitId`,
 * or null when nothing holds it. A held unit may move only to tiles next to
 * that Tentacle.
 */
export function grabbingTentacleAtV7(
  lookup: TrickListsV7 & {
    readonly units: readonly {
      readonly id: UnitId;
      readonly at: CoordV7;
      readonly hp: number;
    }[];
  },
  unitId: UnitId,
): CoordV7 | null {
  const tentacles = tentaclesOf(lookup);
  if (tentacles.length === 0) return null;
  const entry = tentacles.find(
    (candidate) => candidate.grabbedUnitId === unitId,
  );
  if (entry === undefined) return null;
  return (
    lookup.units.find((unit) => unit.id === entry.unitId && unit.hp > 0)?.at ??
    null
  );
}

/**
 * Section 9.3: whether a Tentacle may rise on `at`: a tile the actor knows,
 * land or water of any terrain but a Rift, with no unit, mound, Barricade,
 * treasure chest, or curiosity, and not a settlement center.
 */
export function tentacleTileLegalV7(
  facts: GiantTileFactsV7,
  at: CoordV7,
): boolean {
  const tile = facts.tile(at);
  return (
    tile !== undefined &&
    tile.site === null &&
    tile.terrain !== "RIFT" &&
    !facts.occupied(at) &&
    !facts.chest(at) &&
    !facts.curiosity(at)
  );
}

export type TentacleRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "TENTACLE_NOT_LEGAL";
      readonly reason: "EMBARKED" | "TECHNOLOGY" | "EXISTS" | "TILE";
    };

/**
 * Section 9.3, shared by the reducer and the public command query: the
 * first reason the unit `caller` may not call a Tentacle up on `at`, or
 * null. The caller is a land-form unit with Tentacle (the Summoner since
 * the Cult redesign, `pulp_wars-mch9.31`, the retired Caller before; a
 * mind-controlled one has none: it needs a Cult seat) whose owner has
 * Tentacles (`unlocked`, the capability `tentacles` of the Cult
 * `CHIVALRY`), that has not used a primary action (it may have moved) and
 * has no Tentacle of its own on the board; the tile is 1 to
 * `TENTACLE_RANGE_V7` tiles away and free ({@link tentacleTileLegalV7}).
 */
export function tentacleRejectionV7(
  lookup: FrozenLookupV7 & TrickListsV7,
  facts: GiantTileFactsV7,
  unlocked: boolean,
  caller: ActorFactsV7,
  at: CoordV7,
): TentacleRejectionV7 | null {
  if (!unitRoleRuleV7(lookup, caller).abilities.includes("TENTACLE"))
    return { code: "UNIT_ROLE_INVALID" };
  if (caller.form !== "LAND")
    return { code: "TENTACLE_NOT_LEGAL", reason: "EMBARKED" };
  if (!unlocked) return { code: "TENTACLE_NOT_LEGAL", reason: "TECHNOLOGY" };
  if (primaryActedV7(caller) || primaryActionBlockedAfterMoveV7(lookup, caller))
    return { code: "UNIT_ALREADY_ACTED" };
  if (tentaclesOf(lookup).some((entry) => entry.callerUnitId === caller.id))
    return { code: "TENTACLE_NOT_LEGAL", reason: "EXISTS" };
  const distance = chebyshev(caller.at, at);
  if (
    distance < 1 ||
    distance > TENTACLE_RANGE_V7 ||
    !tentacleTileLegalV7(facts, at)
  )
    return { code: "TENTACLE_NOT_LEGAL", reason: "TILE" };
  return null;
}

/**
 * Section 9.3, the slap: the unit the Tentacle on `at` attacks: the unit of
 * a player (any form; never a neutral unit) on one of the eight tiles
 * around it with the fewest Hit Points, ties to the lowest unit ID. Null
 * when nobody stands beside it.
 */
export function tentacleSlapTargetV7<
  U extends {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly at: CoordV7;
    readonly hp: number;
  },
>(units: readonly U[], at: CoordV7): U | null {
  let best: U | null = null;
  for (const unit of units) {
    if (
      unit.hp <= 0 ||
      isNeutralOwnerV7(unit.ownerId) ||
      chebyshev(unit.at, at) !== 1
    )
      continue;
    if (
      best === null ||
      unit.hp < best.hp ||
      (unit.hp === best.hp && unit.id < best.id)
    )
      best = unit;
  }
  return best;
}

// ----------------------------------------------------------- Pamphlets ---

/**
 * Section 8.7, Pamphlets: whether the unit captures a neutral village in
 * the turn it walks onto it: a land-form unit with Pamphlets (the Initiate)
 * on a village center nobody owns (`site` is the tile's site). The Move
 * that ends there sets its `captureEligible`, and its `CAPTURE` is not
 * refused for having moved. Every other capture rule holds.
 */
export function pamphletsApplyV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  site: "CAPITAL" | "VILLAGE" | "CITY" | null | undefined,
): boolean {
  return (
    site === "VILLAGE" &&
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("PAMPHLETS")
  );
}

// ------------------------------------------------- The command gate ---

/** Commands a frog may still give (section 9.1): it hops, and nothing else. */
const FROG_ALLOWED_KINDS_V7: ReadonlySet<CommandV7["kind"]> = new Set([
  "MOVE",
  "DISEMBARK",
  "PROMOTE",
  "DISBAND",
  "WAIT",
]);

export type TrickRefusalV7 = {
  readonly code: "UNIT_FROGGED" | "ATTACK_AWESTRUCK";
  readonly unitId: UnitId;
};

/**
 * Section 9.1, shared by the reducer (which refuses the command) and the
 * public command query (which withholds it): what a hex or an idol forbids
 * of a command of `actor`, or null.
 *
 * - **A frog** gives no command but Move, Disembark, Promote, Disband, and
 *   Wait (`UNIT_FROGGED`, with the frog's ID): no attack, capture, Kaboom,
 *   or other action. A frogged helper summons nothing.
 * - **Awestruck** (the Cult redesign, `pulp_wars-mch9.33`, section 8.1):
 *   an `ATTACK` by a unit that stands beside a standing idol hostile to it
 *   may name only such an Idol Bearer (`ATTACK_AWESTRUCK`, with the
 *   bearer's ID; src/engine/v7/cult-warden.ts). Nothing else is
 *   restricted. (Pick Me!'s `ATTACK_TAUNTED`, the retired Chosen's, was
 *   the rule it took over.)
 *
 * (Grab is a rule of the Move itself: `MOVEMENT_ILLEGAL` reason `GRABBED`,
 * src/engine/v7/movement.ts.)
 */
export function trickRefusalV7<U extends TrickUnitFactsV7>(
  lookup: TrickListsV7 &
    WardenLookupV7 & {
      readonly units: readonly U[];
    },
  actor: PlayerId,
  command: CommandV7,
): TrickRefusalV7 | null {
  const frogs = frogsOf(lookup);
  const own = (unitId: UnitId): U | undefined =>
    lookup.units.find(
      (unit) => unit.id === unitId && unit.ownerId === actor && unit.hp > 0,
    );
  if (frogs.length > 0) {
    const named: UnitId[] = [];
    if ("unitId" in command && !FROG_ALLOWED_KINDS_V7.has(command.kind))
      named.push(command.unitId);
    if (command.kind === "SUMMON" && command.helperUnitId !== undefined)
      named.push(command.helperUnitId);
    for (const unitId of named)
      if (frogs.includes(unitId) && own(unitId) !== undefined)
        return { code: "UNIT_FROGGED", unitId };
  }
  if (command.kind === "ATTACK") {
    const attacker = own(command.unitId);
    if (attacker !== undefined) {
      const bearer = awestruckRefusingAttackV7(
        lookup,
        lookup.units,
        attacker,
        command.targetUnitId,
      );
      if (bearer !== null)
        return { code: "ATTACK_AWESTRUCK", unitId: bearer.id };
    }
  }
  return null;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
