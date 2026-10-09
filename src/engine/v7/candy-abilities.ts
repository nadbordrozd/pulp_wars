import type { PlayerId, UnitId } from "../model/ids";
import {
  REBAKE_REACH_V7,
  RICOCHET_DIVISOR_V7,
  STUCK_MAX_STEPS_V7,
  TOOTHACHE_ATTACK2_V7,
  TOP_UP_HEAL_V7,
  armouredDamageV7,
  unitIsSubmergedV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type IceLookupV7,
} from "../rules/ruleset-v7";
import { unitIsCrashedV7, type SugarRushLookupV7 } from "./candy";
import type { CombatSplashEntryV7 } from "./events";
import { absorbHitV7 } from "./martian";
import { isFrozenV7 } from "./ice-folk";
import type {
  CandyStatusEntryV7,
  CoordV7,
  FrozenStatusV7,
  UnitFormV7,
  UnitRoleIdV7,
} from "./types";
import { isNeutralOwnerV7 } from "./types";

/**
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md, bead
 * `pulp_wars-jdb.12`): the helpers of the new Candy abilities that the
 * reducer, the combat preview, the public queries, the movement search, and
 * the stats share: Sticky Toffee (Stuck), Toothache, Glaze Trail, Ricochet,
 * Bunny Hop, Thump, the reworked Re-bake, and Top-Up. Each reads the unit's
 * kind's role mechanics (`unitRoleMechanicsV7`), so a mind-controlled Candy
 * unit keeps its body rules, and each answers neutrally in a match without
 * a Candy seat (no role has the mechanics and the lists are empty).
 */

/** The unit facts the role-mechanic readers need. */
export interface CandyAbilityUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** Anything that carries the Stuck and Toothache lists (state or view). */
export interface CandyStatusLookupV7 {
  readonly stuck?: readonly CandyStatusEntryV7[];
  readonly toothache?: readonly CandyStatusEntryV7[];
}

// --------------------------------------------------- Stuck, Toothache ---

/** Section 6.2: whether the unit is Stuck (an entry in `stuck`). */
export function unitIsStuckV7(
  lookup: CandyStatusLookupV7,
  unitId: UnitId,
): boolean {
  const list = lookup.stuck;
  return (
    list !== undefined &&
    list.length > 0 &&
    list.some((entry) => entry.unitId === unitId)
  );
}

/** Section 6.2: whether the unit has Toothache (an entry in `toothache`). */
export function unitHasToothacheV7(
  lookup: CandyStatusLookupV7,
  unitId: UnitId,
): boolean {
  const list = lookup.toothache;
  return (
    list !== undefined &&
    list.length > 0 &&
    list.some((entry) => entry.unitId === unitId)
  );
}

/**
 * Section 6.2: whether a Candy status (Stuck, Toothache) can be put on the
 * unit: a unit on the board in any form except an Egg, and never the Giant
 * Spider (the neutral owner). A burrowed unit is off the board, so the
 * caller never offers one.
 */
export function unitTakesCandyStatusV7(unit: {
  readonly ownerId: PlayerId;
  readonly form: UnitFormV7;
  readonly hp: number;
}): boolean {
  return unit.hp > 0 && unit.form !== "EGG" && !isNeutralOwnerV7(unit.ownerId);
}

/**
 * Section 6.2: the `endsLeft` of a fresh entry on a unit of `ownerId`
 * applied during the turn of `activePlayerId`: 2 during the owner's own
 * turn (it lasts through the owner's next turn), else 1.
 */
export function candyStatusEndsLeftV7(
  activePlayerId: PlayerId | undefined,
  ownerId: PlayerId,
): 1 | 2 {
  return activePlayerId === ownerId ? 2 : 1;
}

/**
 * Section 6.2: `list` with an entry of `unitId`: a new application sets
 * `endsLeft` to the larger of the old and the new value. Sorted by unit ID.
 */
export function withCandyStatusV7(
  list: readonly CandyStatusEntryV7[],
  unitId: UnitId,
  endsLeft: 1 | 2,
): readonly CandyStatusEntryV7[] {
  const old = list.find((entry) => entry.unitId === unitId);
  const next: CandyStatusEntryV7 = {
    unitId,
    endsLeft:
      old === undefined || old.endsLeft < endsLeft ? endsLeft : old.endsLeft,
  };
  return [...list.filter((entry) => entry.unitId !== unitId), next].sort(
    (left, right) => left.unitId - right.unitId,
  );
}

/** `list` without the entry of `unitId` (itself when there is none). */
export function withoutCandyStatusV7(
  list: readonly CandyStatusEntryV7[],
  unitId: UnitId,
): readonly CandyStatusEntryV7[] {
  return list.some((entry) => entry.unitId === unitId)
    ? list.filter((entry) => entry.unitId !== unitId)
    : list;
}

/**
 * Section 6.2: the countdown of `playerId`'s End Turn: every entry of a
 * unit `playerId` owns loses 1 and those at 0 go. `ownerOf` gives a unit's
 * current owner (undefined for a unit off the board, whose entry goes).
 */
export function countedDownCandyStatusV7(
  list: readonly CandyStatusEntryV7[],
  playerId: PlayerId,
  ownerOf: (unitId: UnitId) => PlayerId | undefined,
): readonly CandyStatusEntryV7[] {
  if (list.length === 0) return list;
  let changed = false;
  const next: CandyStatusEntryV7[] = [];
  for (const entry of list) {
    const owner = ownerOf(entry.unitId);
    if (owner === undefined) {
      changed = true;
      continue;
    }
    if (owner !== playerId) {
      next.push(entry);
      continue;
    }
    changed = true;
    if (entry.endsLeft === 2) next.push({ unitId: entry.unitId, endsLeft: 1 });
  }
  return changed ? next : list;
}

/**
 * Section 7.1: whether the unit's hits Stick: a land-form unit whose role,
 * under its kind, is `sticky` (the Toffee Trooper, and a Gingerbread Man,
 * which is one in every rule).
 */
export function unitSticksV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).sticky;
}

/**
 * Section 7.8: whether a unit that attacks this one from distance 1 gets
 * Toothache: a land-form unit whose role, under its kind, gives it (the
 * Jawbreaker).
 */
export function unitGivesToothacheV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).toothache;
}

/**
 * Section 6.2 (Toothache): the attack value after the attacker's own
 * Toothache: 2 half-units less, after every other modifier, never below 1
 * half-unit (0.5 Attack). An attack value of 0 (no attack) stays 0.
 */
export function attack2AfterToothacheV7(
  attack2: number,
  toothache: boolean,
): number {
  if (!toothache || attack2 <= 0) return attack2;
  return Math.max(1, attack2 - TOOTHACHE_ATTACK2_V7);
}

/**
 * Sections 7.1 and 7.8: the statuses an `ATTACK` exchange leaves. `stuck`:
 * the Toffee Trooper's target (when the attacker Sticks and the target is
 * still on the board), the attacker it struck back at (when the defender
 * Sticks, struck back, and the attacker is still on the board), both (a
 * controlled Trooper against a Trooper), or none. `toothache`: a surviving
 * attacker from distance 1 of a Jawbreaker, whether or not the Jawbreaker
 * survived. "Still on the board" excludes a unit that dies or rises as
 * another unit.
 */
export function candyExchangeStatusesV7(
  roster: FactionRosterV7,
  attacker: CandyAbilityUnitV7 & { readonly hp: number },
  defender: CandyAbilityUnitV7 & { readonly hp: number },
  facts: {
    readonly distance: number;
    readonly retaliates: boolean;
    readonly attackerRemains: boolean;
    readonly defenderRemains: boolean;
  },
): {
  readonly stuckApplied: "NONE" | "TARGET" | "ATTACKER" | "BOTH";
  readonly toothacheApplied: boolean;
} {
  const target =
    facts.defenderRemains &&
    unitTakesCandyStatusV7(defender) &&
    unitSticksV7(roster, attacker);
  const struck =
    facts.retaliates &&
    facts.attackerRemains &&
    unitTakesCandyStatusV7(attacker) &&
    unitSticksV7(roster, defender);
  return {
    stuckApplied:
      target && struck
        ? "BOTH"
        : target
          ? "TARGET"
          : struck
            ? "ATTACKER"
            : "NONE",
    toothacheApplied:
      facts.distance === 1 &&
      facts.attackerRemains &&
      unitTakesCandyStatusV7(attacker) &&
      unitGivesToothacheV7(roster, defender),
  };
}

// ------------------------------------------------------------- Stuck ---

/**
 * Section 6.2: the most steps a `MOVE` of the unit may have (a hop is one
 * step; a slide is none): `STUCK_MAX_STEPS_V7` while it is Stuck, else
 * unlimited.
 */
export function moveStepLimitV7(
  lookup: CandyStatusLookupV7,
  unitId: UnitId,
): number {
  return unitIsStuckV7(lookup, unitId)
    ? STUCK_MAX_STEPS_V7
    : Number.POSITIVE_INFINITY;
}

// ------------------------------------------------------------- Glaze ---

/** Section 7.2: whether the unit lays a Glaze Trail (the Donut Racer). */
export function unitLaysGlazeV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).glazeTrail;
}

/**
 * Section 7.2: the tiles a Donut Racer's Move Glazes: its start tile and
 * every tile its path passed (not the tile it ended on) that is a land tile
 * (`isLand`), sorted by (y, x) without duplicates.
 */
export function glazeTrailTilesV7(
  start: CoordV7,
  traversedPath: readonly CoordV7[],
  isLand: (at: CoordV7) => boolean,
): readonly CoordV7[] {
  if (traversedPath.length === 0) return [];
  return sortedUniqueCoordsV7(
    [start, ...traversedPath.slice(0, -1)].filter(isLand),
  );
}

/** `glazed` with `tiles` added, sorted by (y, x) without duplicates. */
export function withGlazedTilesV7(
  glazed: readonly CoordV7[],
  tiles: readonly CoordV7[],
): readonly CoordV7[] {
  if (tiles.length === 0) return glazed;
  return sortedUniqueCoordsV7([...glazed, ...tiles]);
}

/**
 * Section 7.2: whether a step of `unit` onto `at` costs the Glaze's one
 * half-point: a land-form unit of the active seat (its own and the units it
 * controls) onto a tile of `glazedThisTurn`.
 */
export function glazeStepAppliesV7(
  lookup: {
    readonly glazedThisTurn?: readonly CoordV7[];
    readonly turnOrder: readonly PlayerId[];
    readonly activeSeatIndex: number;
  },
  unit: { readonly ownerId: PlayerId; readonly form: UnitFormV7 },
  at: CoordV7,
): boolean {
  const glazed = lookup.glazedThisTurn;
  return (
    glazed !== undefined &&
    glazed.length > 0 &&
    unit.form === "LAND" &&
    lookup.turnOrder[lookup.activeSeatIndex] === unit.ownerId &&
    glazed.some((tile) => tile.x === at.x && tile.y === at.y)
  );
}

// --------------------------------------------------------------- Hop ---

/** Section 7.7: whether the unit's Move may contain a hop (the Bunny). */
export function unitHopsV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).hop;
}

/**
 * Section 7.7: the tile a hop from `from` to `to` jumps (the one between),
 * or null when the two are not a hop apart (Chebyshev distance 2 in a
 * straight line: `dx` and `dy` each in {-2, 0, 2}, not both 0).
 */
export function hopJumpedTileV7(from: CoordV7, to: CoordV7): CoordV7 | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (
    (dx !== -2 && dx !== 0 && dx !== 2) ||
    (dy !== -2 && dy !== 0 && dy !== 2) ||
    (dx === 0 && dy === 0)
  )
    return null;
  return { x: from.x + dx / 2, y: from.y + dy / 2 };
}

/** Section 7.7: the eight hop landings from `from`, in (y, x) order. */
export function hopLandingsV7(from: CoordV7): readonly CoordV7[] {
  const landings: CoordV7[] = [];
  for (const dy of [-2, 0, 2])
    for (const dx of [-2, 0, 2])
      if (dx !== 0 || dy !== 0)
        landings.push({ x: from.x + dx, y: from.y + dy });
  return landings;
}

// ---------------------------------------------------- Ricochet, Thump ---

/** The unit facts the fixed hits of Ricochet and Thump read. */
export interface CandyHitUnitV7 extends CandyAbilityUnitV7 {
  readonly at: CoordV7;
  readonly hp: number;
}

/**
 * Sections 7.3 and 7.7: fixed damage on one unit: Armoured takes 1 off a
 * hit of 2 or more and Plated caps it, then the Shield absorbs it first;
 * the HP part is capped at the unit's HP (the signature-hit rule).
 */
export function candyFixedHitV7(
  roster: FactionRosterV7,
  unit: CandyHitUnitV7,
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

/**
 * Sections 7.3 and 7.7: whether a unit is a Ricochet or Thump victim at all:
 * on the board, in any form but burrowed (off the board) or submerged,
 * never an Egg or the Giant Spider.
 */
export function candySplashableV7(
  roster: FactionRosterV7 & IceLookupV7,
  unit: CandyHitUnitV7,
): boolean {
  return (
    unit.hp > 0 &&
    unit.form !== "EGG" &&
    !isNeutralOwnerV7(unit.ownerId) &&
    !unitIsSubmergedV7(roster, unit)
  );
}

/** Section 7.3: whether the unit's attacks ricochet (the Gumball Gunner). */
export function unitRicochetsV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).ricochet;
}

/**
 * Section 7.3: the Ricochet of an `ATTACK` by `attacker` from `distance` on
 * the target `defender`, whose main hit dealt `hit` (HP plus Shield): from
 * distance 2 with a hit of at least 2, `floor(hit / 2)` fixed damage to the
 * candidate with the lowest HP, then the lowest unit ID. `candidates` are
 * the units the attacker's owner saw before the attack; the caller filters
 * them by hostility. Null when nothing ricochets.
 */
export function ricochetEntryV7(
  roster: FactionRosterV7 & IceLookupV7,
  attacker: CandyAbilityUnitV7,
  defender: { readonly id: UnitId; readonly at: CoordV7 },
  distance: number,
  hit: number,
  candidates: readonly CandyHitUnitV7[],
  shieldOf: (unitId: UnitId) => number,
): CombatSplashEntryV7 | null {
  if (distance !== 2 || hit < 2 || !unitRicochetsV7(roster, attacker))
    return null;
  const damage = Math.floor(hit / RICOCHET_DIVISOR_V7);
  let best: CandyHitUnitV7 | undefined;
  for (const unit of candidates) {
    if (
      unit.id === defender.id ||
      unit.id === attacker.id ||
      chebyshev(unit.at, defender.at) !== 1 ||
      !candySplashableV7(roster, unit)
    )
      continue;
    if (
      best === undefined ||
      unit.hp < best.hp ||
      (unit.hp === best.hp && unit.id < best.id)
    )
      best = unit;
  }
  return best === undefined
    ? null
    : candyFixedHitV7(roster, best, shieldOf(best.id), damage);
}

/** Section 7.7: the Thump damage of the unit's attacks (0 without). */
export function unitThumpDamageV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): number {
  return unit.form === "LAND"
    ? unitRoleMechanicsV7(roster, unit).thumpDamage
    : 0;
}

/**
 * Section 7.7: the Thump of a Chocolate Bunny standing on `at` after its
 * attack on `targetUnitId`: every candidate on the eight tiles around `at`
 * other than the Bunny and the target, in unit-ID order, takes the fixed
 * Thump damage. The caller filters the candidates by hostility.
 */
export function thumpEntriesV7(
  roster: FactionRosterV7 & IceLookupV7,
  bunny: CandyAbilityUnitV7,
  at: CoordV7,
  targetUnitId: UnitId,
  candidates: readonly CandyHitUnitV7[],
  shieldOf: (unitId: UnitId) => number,
): readonly CombatSplashEntryV7[] {
  const damage = unitThumpDamageV7(roster, bunny);
  if (damage <= 0) return [];
  return candidates
    .filter(
      (unit) =>
        unit.id !== bunny.id &&
        unit.id !== targetUnitId &&
        chebyshev(unit.at, at) === 1 &&
        candySplashableV7(roster, unit),
    )
    .sort((left, right) => left.id - right.id)
    .map((unit) => candyFixedHitV7(roster, unit, shieldOf(unit.id), damage));
}

// ------------------------------------------------------------ Re-bake ---

/**
 * Section 8.1, row 7: the Crumbs a Confectioner at `at` may scoop for
 * `actor`: the actor's Crumbs within `REBAKE_REACH_V7` (any unit, Egg, or
 * mound may stand on them), in (y, x) order.
 */
export function rebakeSourcesV7<
  C extends { readonly at: CoordV7; readonly ownerId: PlayerId },
>(crumbs: readonly C[], actor: PlayerId, at: CoordV7): readonly C[] {
  return crumbs.filter(
    (entry) =>
      entry.ownerId === actor && chebyshev(entry.at, at) <= REBAKE_REACH_V7,
  );
}

/**
 * Section 8.1, row 8, the geometry: the eight tiles around the
 * Confectioner on the board, in (y, x) order; the caller tests each tile.
 */
export function rebakePlacementCandidatesV7(
  board: { readonly width: number; readonly height: number },
  at: CoordV7,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = at.x + dx;
      const y = at.y + dy;
      if (x >= 0 && y >= 0 && x < board.width && y < board.height)
        tiles.push({ x, y });
    }
  return tiles;
}

// ------------------------------------------------------------- Top-Up ---

/** Why a Top-Up from a ready Confectioner to a target is illegal (8.2). */
export type TopUpTargetRejectionV7 =
  | "HEAL_TARGET_NOT_FOUND"
  | "HEAL_TARGET_NOT_OWNED"
  | "OUT_OF_RANGE"
  | "NOTHING_TO_DO";

/**
 * Section 8.2, rows 6 to 8: why a Top-Up from the ready Confectioner
 * `confectioner` to `target` is illegal, or null. `target` is the unit
 * named by the command when it is on the board and the actor sees it (own
 * units are always visible, so the state and the view agree exactly).
 * `afflicted` says whether it is plagued, bitten, or Frozen.
 */
export function topUpTargetRejectionV7(
  lookup: SugarRushLookupV7 & CandyStatusLookupV7,
  confectioner: {
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
  afflicted: boolean,
): TopUpTargetRejectionV7 | null {
  if (
    target === undefined ||
    target.hp <= 0 ||
    target.id === confectioner.id ||
    target.form !== "LAND"
  )
    return "HEAL_TARGET_NOT_FOUND";
  if (target.ownerId !== confectioner.ownerId) return "HEAL_TARGET_NOT_OWNED";
  if (chebyshev(confectioner.at, target.at) > 1) return "OUT_OF_RANGE";
  if (
    !unitIsCrashedV7(lookup, target.id) &&
    target.hp >= target.maxHp &&
    !afflicted &&
    !unitIsStuckV7(lookup, target.id) &&
    !unitHasToothacheV7(lookup, target.id)
  )
    return "NOTHING_TO_DO";
  return null;
}

/** Section 8.2: what a Top-Up heals the target. */
export function topUpAmountV7(target: {
  readonly hp: number;
  readonly maxHp: number;
}): number {
  return Math.max(0, Math.min(TOP_UP_HEAL_V7, target.maxHp - target.hp));
}

/** Section 7.5: whether the role, under the unit's kind, has `TOP_UP`. */
export function unitTopsUpV7(
  roster: FactionRosterV7,
  unit: CandyAbilityUnitV7,
): boolean {
  return unitRoleRuleV7(roster, unit).abilities.includes("TOP_UP");
}

/**
 * Section 8.2, row 8: whether a Top-Up would cure an affliction of the
 * unit other than Stuck and Toothache: Plague, Bitten, or Frozen (Ice Folk
 * Freeze replaced Chill; a Top-Up thaws a Frozen unit, as Tend Wounded does).
 */
export function unitIsAfflictedForTopUpV7(
  lookup: {
    readonly frozen: readonly FrozenStatusV7[];
    readonly plagued: readonly { readonly unitId: UnitId }[];
    readonly bitten: readonly { readonly unitId: UnitId }[];
  },
  unitId: UnitId,
): boolean {
  return (
    lookup.plagued.some((entry) => entry.unitId === unitId) ||
    lookup.bitten.some((entry) => entry.unitId === unitId) ||
    isFrozenV7(lookup.frozen, unitId)
  );
}

function sortedUniqueCoordsV7(tiles: readonly CoordV7[]): readonly CoordV7[] {
  const seen = new Set<string>();
  const result: CoordV7[] = [];
  for (const at of tiles) {
    const id = `${at.y},${at.x}`;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ x: at.x, y: at.y });
  }
  return result.sort((left, right) => left.y - right.y || left.x - right.x);
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
