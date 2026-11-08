import type { PlayerId, UnitId } from "../model/ids";
import {
  BLIZZARD_RADIUS_V7,
  DEEP_WINTER_RADIUS_V7,
  factionRulesV7,
  ownerResearchedTechsV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitIsUnstoppableV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type SummonedUnitRefV7,
} from "../rules/ruleset-v7";
import { surfacedRiderV7 } from "./dwarf";
import { arePlayersHostileV7 } from "./economy";
import type { CommandV7 } from "./commands";
import type { DomainEventV7 } from "./events";
import { allOwnedUnitsV7 } from "./units";
import type { PlayerViewV7 } from "./view";
import type {
  CoordV7,
  FactionIdV7,
  FrozenStatusV7,
  GameStateV7,
  UnitFormV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";
import { isNeutralOwnerV7 } from "./types";

/**
 * The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md), with Ice Folk
 * Freeze (`pulp_wars-w49.37`, RULESET_7_CURRENT.md section 21): Frozen
 * (section 21.2), derived Snow and the Blizzard, and the helpers of the
 * unit rules. `frozen` is the stored status; Snow and the Blizzard are
 * derived from the state (or the view's tile flags) on every read and
 * never cached across commands. Every helper returns the
 * neutral answer in a match without an Ice Folk seat.
 */

/** Whether any seat of the match is Ice Folk (the setup decides). */
export function matchHasIceFolkV7(state: {
  readonly setup: { readonly factions: readonly FactionIdV7[] };
}): boolean {
  return state.setup.factions.includes("ICE_FOLK");
}

/**
 * Whether the unit is of the Ice Folk kind (the `snow` faction rule of its
 * kind, `unitFactionV7`): a body rule, so a mind-controlled Ice Folk unit
 * keeps Glide, Snow cover, and deep-snow freedom.
 */
export function unitOwnerIsIceFolkV7(
  roster: FactionRosterV7,
  unit: { readonly id: UnitId; readonly ownerId: PlayerId },
): boolean {
  return factionRulesV7(unitFactionV7(roster, unit)).snow;
}

/**
 * An Ice Folk unit in the sense of sections 5 to 8: a land-form unit of the
 * Ice Folk kind (never an embarked unit or a boat).
 */
export function isIceFolkLandUnitV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly form: UnitFormV7;
  },
): boolean {
  return unit.form === "LAND" && unitOwnerIsIceFolkV7(roster, unit);
}

// --------------------------------------------------------------- Frozen ---

/** The Frozen entry of `unitId`, if any. */
export function frozenEntryOfV7(
  frozen: readonly FrozenStatusV7[],
  unitId: UnitId,
): FrozenStatusV7 | undefined {
  if (frozen.length === 0) return undefined;
  return frozen.find((entry) => entry.unitId === unitId);
}

/** Section 21.2: whether the unit is Frozen (it has an entry). */
export function isFrozenV7(
  frozen: readonly FrozenStatusV7[],
  unitId: UnitId,
): boolean {
  return frozenEntryOfV7(frozen, unitId) !== undefined;
}

/**
 * Section 21.2: whether `target` can be Frozen by a source owned by
 * `sourceOwnerId`: a living unit hostile to the source's owner, in land,
 * naval, or embarked form (since `pulp_wars-s55m.1` ships, embarked units,
 * and units on docks freeze like anyone; never an Egg, own, or allied
 * unit). Map curiosities: the
 * neutral Monster is immune too. The Cultists (`pulp_wars-mch9.7`,
 * RULESET_7_CULTISTS.md section 4.2): so is the Herald (Unstoppable).
 */
export function canBeFrozenV7(
  state: {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
  },
  sourceOwnerId: PlayerId,
  target: Pick<UnitStateV7, "ownerId" | "form" | "hp"> & SummonedUnitRefV7,
): boolean {
  return (
    target.hp > 0 &&
    target.form !== "EGG" &&
    // Map curiosities (section 8.6): the Monster is immune to Frozen.
    !isNeutralOwnerV7(target.ownerId) &&
    !unitIsUnstoppableV7(target) &&
    arePlayersHostileV7(state, sourceOwnerId, target.ownerId)
  );
}

/**
 * The Ice Folk roster rework (`pulp_wars-s55m.4`, 7r125): Frost Breath.
 * Whether an `ATTACK` by `attacker` Freezes its target: a land-form
 * attacker whose role under its kind has `frostBreath` (the Frost Wyrm),
 * a target the attack leaves alive (`defenderDies` false), and a target
 * its controller can freeze ({@link canBeFrozenV7}: any form but an Egg,
 * ships and embarked units included; never the Monster or the Herald). A
 * retaliation is no attack of the Wyrm's and never breathes frost. The
 * public preview reads the same facts, so it is exact.
 */
export function attackFrostBreathV7(
  state: FactionRosterV7 & {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
  },
  attacker: Pick<UnitStateV7, "id" | "ownerId" | "role" | "form">,
  defender: Pick<UnitStateV7, "ownerId" | "form" | "hp"> & SummonedUnitRefV7,
  defenderDies: boolean,
): boolean {
  return (
    !defenderDies &&
    attacker.form === "LAND" &&
    unitRoleMechanicsV7(state, attacker).frostBreath &&
    canBeFrozenV7(state, attacker.ownerId, defender)
  );
}

/**
 * Section 21.2: the `turnsLeft` a freeze gives a unit of `ownerId` now: 2
 * during that owner's own turn (it stays Frozen through its next turn), 1
 * otherwise (it thaws at the end of its owner's next turn). Either way the
 * unit loses one turn of its own: the one Freeze effect (`pulp_wars-xv0t`,
 * 7r133) keeps this, since Frostbite (and, until it goes, Black Ice) still
 * freezes a unit during its own turn.
 */
export function frozenTurnsForV7(
  state: {
    readonly turnOrder: readonly PlayerId[];
    readonly activeSeatIndex: number;
  },
  ownerId: PlayerId,
): 1 | 2 {
  return state.turnOrder[state.activeSeatIndex] === ownerId ? 2 : 1;
}

/**
 * Section 21.2: freezing each of `unitIds` (units on the board of `state`).
 * A unit without an entry gets `turnsLeft` from {@link frozenTurnsForV7}; a
 * Frozen unit keeps the larger of its count and the new one. There is no
 * thaw immunity. Returns the sorted list and the entries after the
 * application in unit-ID order (the `UNITS_FROZEN` results).
 */
export function withFrozenAppliedV7(
  state: {
    readonly turnOrder: readonly PlayerId[];
    readonly activeSeatIndex: number;
    readonly units: readonly Pick<UnitStateV7, "id" | "ownerId">[];
  },
  frozen: readonly FrozenStatusV7[],
  unitIds: readonly UnitId[],
): {
  readonly frozen: readonly FrozenStatusV7[];
  readonly results: readonly FrozenStatusV7[];
} {
  const next = new Map(frozen.map((entry) => [entry.unitId, entry] as const));
  const results: FrozenStatusV7[] = [];
  for (const unitId of [...new Set(unitIds)].sort((a, b) => a - b)) {
    const unit = state.units.find((candidate) => candidate.id === unitId);
    if (unit === undefined) throw new RangeError("INVALID_STATE");
    const prior = next.get(unitId);
    const turns = frozenTurnsForV7(state, unit.ownerId);
    const entry: FrozenStatusV7 = {
      unitId,
      turnsLeft:
        prior === undefined
          ? turns
          : prior.turnsLeft > turns
            ? prior.turnsLeft
            : turns,
    };
    next.set(unitId, entry);
    results.push(entry);
  }
  return {
    frozen: [...next.values()].sort(
      (left, right) => left.unitId - right.unitId,
    ),
    results,
  };
}

/**
 * No pointless actions (`pulp_wars-zir6`, 7r107): whether freezing `unit`
 * now would change its Frozen entry ({@link withFrozenAppliedV7}): it has
 * none, or its `turnsLeft` is below what a freeze gives now. A unit that is
 * Frozen for at least that long already would keep its count unchanged, so
 * a Cold Snap needs at least one target (or tile) it changes. `frozen` is
 * the state's list or a view's (a view lists every visible unit's entry).
 */
export function freezeChangesUnitV7(
  state: {
    readonly turnOrder: readonly PlayerId[];
    readonly activeSeatIndex: number;
  },
  frozen: readonly FrozenStatusV7[],
  unit: Pick<UnitStateV7, "id" | "ownerId">,
): boolean {
  const prior = frozenEntryOfV7(frozen, unit.id);
  return (
    prior === undefined ||
    prior.turnsLeft < frozenTurnsForV7(state, unit.ownerId)
  );
}

/**
 * Section 21.2: the thaw at the end of `playerId`'s turn. Every entry of
 * that player's units loses 1 from `turnsLeft`, and an entry at 0 is
 * removed (the unit thaws). No event: the view list is the source.
 */
export function frozenCountdownV7(
  state: GameStateV7,
  playerId: PlayerId,
): GameStateV7 {
  if (state.frozen.length === 0) return state;
  // The Dwarf revision section 5.2: burrowed units keep counting down.
  const own = new Set(allOwnedUnitsV7(state, playerId).map((unit) => unit.id));
  let changed = false;
  const frozen = state.frozen.flatMap((entry): FrozenStatusV7[] => {
    if (!own.has(entry.unitId)) return [entry];
    changed = true;
    return entry.turnsLeft === 1
      ? []
      : [{ unitId: entry.unitId, turnsLeft: 1 }];
  });
  return changed ? { ...state, frozen } : state;
}

/**
 * Section 10.5 Tend Wounded (and the Dwarf Engineer's Repair): a Frozen
 * unit thaws at once (its entry is removed). Returns the list unchanged
 * for a unit that is not Frozen.
 */
export function withFrozenCuredV7(
  frozen: readonly FrozenStatusV7[],
  unitId: UnitId,
): readonly FrozenStatusV7[] {
  if (!isFrozenV7(frozen, unitId)) return frozen;
  return frozen.filter((entry) => entry.unitId !== unitId);
}

/**
 * Section 21.2 removal: the entries of units that left the board (death,
 * rising, Disband, displacement, elimination), and (`pulp_wars-xv0t`) the
 * stored Snow that melted in a territory. Every reducer output runs
 * through this before validation.
 */
export function prunedIceFolkV7(state: GameStateV7): GameStateV7 {
  return withSnowMeltedV7(prunedFrozenV7(state));
}

function prunedFrozenV7(state: GameStateV7): GameStateV7 {
  if (state.frozen.length === 0) return state;
  // The Dwarf revision section 5.2: a burrowed unit keeps its entry.
  const alive = new Set(
    allOwnedUnitsV7(state)
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.id),
  );
  const frozen = state.frozen.filter((entry) => alive.has(entry.unitId));
  return frozen.length === state.frozen.length ? state : { ...state, frozen };
}

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.2): stored Snow melts
 * the moment its tile becomes any player's territory (a new city, a Land
 * Grant, a capture). Every reducer output runs through this (with the
 * Frozen pruning), so no command needs its own melt.
 */
export function withSnowMeltedV7(state: GameStateV7): GameStateV7 {
  if (state.snow.length === 0) return state;
  const { width, tiles } = state.board;
  const snow = state.snow.filter(
    (at) => tiles[at.y * width + at.x]?.territoryCityId === null,
  );
  return snow.length === state.snow.length ? state : { ...state, snow };
}

/**
 * The sources of a `UNITS_FROZEN` event (section 21.15). The one Freeze
 * effect (`pulp_wars-xv0t`, 7r133): the Cold Snap, the Frost Giant's Cold
 * Wake, Black Ice (until the naval branch is rebuilt), the Walrus's
 * Frostbite, and the Frost Wyrm's Frost Breath; `BOLAS`, `FROST_BOLT`,
 * `COLD_AURA`, `SHARDS`, and `FREEZE` retired.
 */
export type FrozenSourceV7 =
  "COLD_SNAP" | "COLD_WAKE" | "BLACK_ICE" | "FROSTBITE" | "FROST_BREATH";

/** One `UNITS_FROZEN` event (section 21.15). */
export function unitsFrozenEventV7(
  playerId: PlayerId,
  sourceUnitId: UnitId | null,
  source: FrozenSourceV7,
  results: readonly FrozenStatusV7[],
): Extract<DomainEventV7, { readonly kind: "UNITS_FROZEN" }> {
  return {
    kind: "UNITS_FROZEN",
    playerId,
    sourceUnitId,
    source,
    results: results.map((entry) => ({
      unitId: entry.unitId,
      turnsLeft: entry.turnsLeft,
    })),
  };
}

// (The Cold Snap targets, the Bolas and Frost Bolt reaches, and the Frost
// Giant's Cold Aura retired with the one Freeze effect, `pulp_wars-xv0t`,
// 7r133: the Cold Snap and the Cold Wake freeze the ring of tiles, in
// `./ice`.)

/** Commands a Frozen unit may still give (section 21.3). */
const FROZEN_ALLOWED_KINDS_V7: ReadonlySet<CommandV7["kind"]> = new Set([
  "PROMOTE",
  "DISBAND",
  "WAIT",
]);

/**
 * Ice Folk Freeze (`pulp_wars-w49.37`, section 21.3): the ID of the own
 * Frozen unit a command would use (its `unitId` unless the kind is Promote,
 * Disband, or Wait; a Goblin Toss's passenger; a Tunnel's rider), or null.
 */
export function frozenUnitNamedV7(
  state: {
    // A retained public view captured before Ice Folk Freeze has no list;
    // it reads as empty.
    readonly frozen?: GameStateV7["frozen"];
    readonly units: readonly Pick<UnitStateV7, "id" | "ownerId" | "hp">[];
  },
  actor: PlayerId,
  command: CommandV7,
): UnitId | null {
  const frozen = state.frozen ?? [];
  if (frozen.length === 0) return null;
  const named: UnitId[] = [];
  if ("unitId" in command && !FROZEN_ALLOWED_KINDS_V7.has(command.kind))
    named.push(command.unitId);
  if (command.kind === "TOSS") named.push(command.passengerUnitId);
  // The Cultists (`pulp_wars-mch9.5`): a Frozen helper summons nothing.
  if (command.kind === "SUMMON" && command.helperUnitId !== undefined)
    named.push(command.helperUnitId);
  if (command.kind === "TUNNEL" && command.rider !== null)
    named.push(command.rider.unitId);
  for (const unitId of named)
    if (
      isFrozenV7(frozen, unitId) &&
      state.units.some(
        (unit) => unit.id === unitId && unit.ownerId === actor && unit.hp > 0,
      )
    )
      return unitId;
  return null;
}

// ------------------------------------------------------- Snow, Blizzard ---

/** The derived winter of a state: Snow and Blizzard tiles by board index. */
export interface WinterV7 {
  /**
   * Board indices of the Snow tiles (land only): territory, Deep Winter,
   * and stored Snow (since `pulp_wars-xv0t`, 7r133, the Blizzard lays no
   * Snow).
   */
  readonly snow: ReadonlySet<number>;
  /** Board indices within `BLIZZARD_RADIUS_V7` of a land-form Witch. */
  readonly blizzard: ReadonlySet<number>;
  /** The land-form Ice Witches (any Ice Folk seat). */
  readonly witches: readonly Pick<UnitStateV7, "id" | "ownerId" | "at">[];
}

const NO_WINTER_V7: WinterV7 = Object.freeze({
  snow: new Set<number>(),
  blizzard: new Set<number>(),
  witches: [],
});

const WINTER_CACHE_V7 = new WeakMap<object, WinterV7>();

/** The facts the derived Snow reads (a canonical state or a projection). */
export type WinterFactsV7 = Pick<
  GameStateV7,
  "setup" | "board" | "players" | "cities" | "units" | "mindControlled"
> & {
  /**
   * The stored Snow (`pulp_wars-xv0t`, 7r133). A retained public view
   * captured before it has no list; it reads as empty.
   */
  readonly snow?: GameStateV7["snow"];
};

/**
 * Sections 6.1 and 6.3: the Snow and Blizzard tiles of `state`, derived from
 * the current state at every read (memoised per state object only, which is
 * immutable). Snow is a land tile (biome not null) that is in the territory
 * of a city owned by an Ice Folk seat, or has no territory and lies within
 * Chebyshev 2 of the center of a city whose Ice Folk owner has Deep Winter,
 * or holds stored Snow (the one Freeze effect, `pulp_wars-xv0t`, 7r133;
 * since then the Blizzard of a Witch lays no Snow). Water is never Snow;
 * the Blizzard covers water tiles too (for drawing only).
 */
export function winterV7(state: WinterFactsV7): WinterV7 {
  if (!state.setup.factions.includes("ICE_FOLK")) return NO_WINTER_V7;
  const cached = WINTER_CACHE_V7.get(state);
  if (cached !== undefined) return cached;
  const { width, height, tiles } = state.board;
  const factionOf = new Map(
    state.players.map((player) => [player.id, player] as const),
  );
  const iceCityIds = new Set<number>();
  const deepWinterCenters: CoordV7[] = [];
  for (const city of state.cities) {
    // Territory Snow and Deep Winter are seat rules (the city owner's).
    const owner = factionOf.get(city.ownerId);
    if (owner === undefined || !factionRulesV7(owner.faction).snow) continue;
    iceCityIds.add(city.id);
    if (
      technologyCapabilitiesV7(owner.researchedTechs, owner.faction).deepWinter
    )
      deepWinterCenters.push(city.at);
  }
  const snow = new Set<number>();
  // The one Freeze effect: the stored Snow (only ever on neutral land).
  for (const at of state.snow ?? []) snow.add(at.y * width + at.x);
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index];
    // Section 6.1: Water and Rift tiles are never Snow.
    if (tile === undefined || tile.biome === null || tile.terrain === "RIFT")
      continue;
    if (tile.territoryCityId !== null) {
      if (iceCityIds.has(tile.territoryCityId)) snow.add(index);
      continue;
    }
    if (
      deepWinterCenters.some(
        (center) => chebyshev(center, tile.at) <= DEEP_WINTER_RADIUS_V7,
      )
    )
      snow.add(index);
  }
  // Only the Ice Witch's role has `BLIZZARD` (under her kind; the Mind
  // Control revision: a controlled Witch keeps her Blizzard).
  const witches = state.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "LAND" &&
      unitRoleRuleV7(state, unit).abilities.includes("BLIZZARD"),
  );
  const blizzard = new Set<number>();
  for (const witch of witches)
    for (
      let y = Math.max(0, witch.at.y - BLIZZARD_RADIUS_V7);
      y <= Math.min(height - 1, witch.at.y + BLIZZARD_RADIUS_V7);
      y += 1
    )
      for (
        let x = Math.max(0, witch.at.x - BLIZZARD_RADIUS_V7);
        x <= Math.min(width - 1, witch.at.x + BLIZZARD_RADIUS_V7);
        x += 1
      )
        blizzard.add(y * width + x);
  const result: WinterV7 = {
    snow,
    blizzard,
    witches: witches.map((unit) => ({
      id: unit.id,
      ownerId: unit.ownerId,
      at: unit.at,
    })),
  };
  WINTER_CACHE_V7.set(state, result);
  return result;
}

/**
 * Section 6.1 `isSnowV7`: on canonical state facts, the derived Snow; on a
 * view, the public `snow` flag of an explored tile (the Snow the viewer
 * knows of; the UI draws the overlay from it and never recomputes the rule).
 */
export function isSnowV7(
  input: WinterFactsV7 | PlayerViewV7,
  at: CoordV7,
): boolean {
  if ("leaderboard" in input) return viewTileFlag(input, at, "snow");
  const winter = winterV7(input);
  if (winter.snow.size === 0 || !onBoard(input.board, at)) return false;
  return winter.snow.has(indexOf(input.board, at));
}

/**
 * Section 6.3 `isBlizzardV7`: on canonical state facts, within 1 of a
 * land-form Ice Witch (water included); on a view, the public `blizzard`
 * flag (a Witch the viewer can see).
 */
export function isBlizzardV7(
  input: WinterFactsV7 | PlayerViewV7,
  at: CoordV7,
): boolean {
  if ("leaderboard" in input) return viewTileFlag(input, at, "blizzard");
  const winter = winterV7(input);
  if (winter.blizzard.size === 0 || !onBoard(input.board, at)) return false;
  return winter.blizzard.has(indexOf(input.board, at));
}

function viewTileFlag(
  view: PlayerViewV7,
  at: CoordV7,
  flag: "snow" | "blizzard",
): boolean {
  if (!onBoard(view.board, at)) return false;
  const tile = view.board.tiles[indexOf(view.board, at)];
  return tile?.explored === true && tile[flag] === true;
}

/**
 * Section 6.5: the winter a viewer knows of, by board index: the Snow
 * (territory, Deep Winter, and stored Snow: public on every tile), and the
 * Blizzard of every Witch the viewer can see (her tile is explored by the
 * viewer, or she is the viewer's own). The view's tile flags are this
 * projection on explored tiles.
 */
export function knownWinterV7(
  state: WinterFactsV7,
  viewerId: PlayerId,
  explored: ReadonlySet<number>,
): {
  readonly snow: ReadonlySet<number>;
  readonly blizzard: ReadonlySet<number>;
} {
  const winter = winterV7(state);
  if (winter.snow.size === 0 && winter.blizzard.size === 0) return winter;
  const { width, height } = state.board;
  const blizzard = new Set<number>();
  for (const witch of winter.witches) {
    if (
      witch.ownerId !== viewerId &&
      !explored.has(indexOf(state.board, witch.at))
    )
      continue;
    for (
      let y = Math.max(0, witch.at.y - BLIZZARD_RADIUS_V7);
      y <= Math.min(height - 1, witch.at.y + BLIZZARD_RADIUS_V7);
      y += 1
    )
      for (
        let x = Math.max(0, witch.at.x - BLIZZARD_RADIUS_V7);
        x <= Math.min(width - 1, witch.at.x + BLIZZARD_RADIUS_V7);
        x += 1
      )
        blizzard.add(y * width + x);
  }
  return { snow: winter.snow, blizzard };
}

/**
 * Section 10.10: whether a Witch the viewer cannot see may stand within
 * `BLIZZARD_RADIUS_V7` of `unit`, a land-form Ice Folk unit: a tile in that
 * radius (the unit's own excepted) is unexplored. Her Blizzard may then
 * halve a ranged hit on it, which the view does not show (a Witch on an
 * explored tile is known, section 6.5; since `pulp_wars-xv0t`, 7r133, it
 * lays no Snow). Shared by the combat and Wail previews.
 */
export function hiddenBlizzardPossibleV7(
  view: PlayerViewV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "form" | "at">,
): boolean {
  if (!isIceFolkLandUnitV7(view, unit)) return false;
  for (
    let y = unit.at.y - BLIZZARD_RADIUS_V7;
    y <= unit.at.y + BLIZZARD_RADIUS_V7;
    y += 1
  )
    for (
      let x = unit.at.x - BLIZZARD_RADIUS_V7;
      x <= unit.at.x + BLIZZARD_RADIUS_V7;
      x += 1
    ) {
      const at = { x, y };
      if ((x === unit.at.x && y === unit.at.y) || !onBoard(view.board, at))
        continue;
      if (view.board.tiles[indexOf(view.board, at)]?.explored === false)
        return true;
    }
  return false;
}

/**
 * Section 6.3 (root ruling 4): whether `unit` is protected by a Blizzard's
 * ranged-damage halving: a land-form unit of the Ice Folk kind within
 * `BLIZZARD_RADIUS_V7` of a land-form Ice Witch of its own seat (the Mind
 * Control revision: a controlled Witch protects only Ice Folk units of her
 * controller). `witches` are the Witches the caller knows of (canonical:
 * all; public: visible).
 */
export function blizzardProtectsV7(
  roster: FactionRosterV7,
  witches: readonly Pick<UnitStateV7, "ownerId" | "at">[],
  unit: Pick<UnitStateV7, "id" | "ownerId" | "form" | "at">,
): boolean {
  if (witches.length === 0 || !isIceFolkLandUnitV7(roster, unit)) return false;
  return witches.some(
    (witch) =>
      witch.ownerId === unit.ownerId &&
      chebyshev(witch.at, unit.at) <= BLIZZARD_RADIUS_V7,
  );
}

/** Section 6.3: a halved ranged hit, rounded up. */
export function blizzardHalvedDamageV7(damage: number): number {
  return Math.ceil(damage / 2);
}

/**
 * Section 6.2 (1): whether the unit Glides: a land-form unit of an Ice Folk
 * seat whose role Glides (every Ice Folk land role but the Frost Wyrm, a
 * flyer).
 */
export function unitGlidesV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).glides;
}

/**
 * Section 6.2 (3): whether Snow stops the unit's Move (deep snow): a
 * land-form ground unit of a faction without the `snow` rule, unless
 * Fieldcraft frees its role (`forestFree`). Martian walkers and flyers are
 * never stopped by terrain.
 */
export function deepSnowStopsUnitV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  forestFree: boolean,
): boolean {
  return (
    unit.form === "LAND" &&
    !forestFree &&
    unitRoleMechanicsV7(roster, unit).movementMode === "GROUND" &&
    !unitOwnerIsIceFolkV7(roster, unit)
  );
}

/**
 * A unit that never ends a Move (or lands, or advances) on a settlement
 * center it does not own: only a Dwarf rider on the turn it surfaced. Any
 * unit can capture (`pulp_wars-ke95`, user direction 2026-10-09): a flyer
 * (the Martian revision section 7.2) and a Prowling Sabretooth (the Ice Folk
 * revision section 7.7) stood off villages and foreign centers before and
 * may stand there, and so capture, since.
 */
export function unitAvoidsForeignSitesV7(
  roster: FactionRosterV7 & { readonly surfacedThisTurn?: readonly UnitId[] },
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form?: UnitFormV7;
  },
): boolean {
  return (
    (unit.form === undefined || unit.form === "LAND") &&
    // The Dwarf revision (section 5.4, root ruling 1): a rider never ends
    // a Move or advances on a foreign or neutral center on the turn it
    // surfaced.
    surfacedRiderV7(roster, unit)
  );
}

/** Section 7.7 Prowl: entering hostile zone of control does not end a Move. */
export function unitIgnoresZocStopsV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).ignoresZocStops
  );
}

// ------------------------------------------------------- Unit rules ---

/**
 * Section 7.2 Rockfall: the attack range of a unit standing on `terrain`:
 * the role's range, or 2 for a land-form Yeti (Rockfall) on a Mountain.
 */
export function attackMaximumRangeV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  terrain: string | undefined,
): number {
  const range = unitRoleRuleV7(roster, unit).range;
  return unit.form === "LAND" &&
    terrain === "MOUNTAIN" &&
    unitRoleMechanicsV7(roster, unit).rockfallAttack2 > 0
    ? Math.max(range, 2)
    : range;
}

/**
 * The attacker's Shatter threshold (section 5.5): Brittle is a unit-level
 * unlock (the Mind Control revision section 5.2), so it reads the attacker's
 * controller's research through the attacker's kind's tree.
 */
export function shatterThresholdV7(
  state: Pick<GameStateV7, "players" | "mindControlled">,
  unit: { readonly id: UnitId; readonly ownerId: PlayerId },
): number {
  // Map curiosities (section 10.5): the neutral owner has no technology.
  return unitCapabilitiesV7(
    state,
    unit,
    ownerResearchedTechsV7(state, unit.ownerId),
  ).shatterThreshold;
}

/**
 * Section 5.5: whether an attack shatters its defender: the attacker is a
 * land-form unit of an Ice Folk seat attacking from distance 1; the defender
 * is Frozen (or assumed Frozen), of any form (a ship or an embarked unit
 * too since `pulp_wars-s55m.1`), and not of the `JUGGERNAUT` role; and the
 * HP the hit leaves is from 1 to the threshold.
 */
export function attackShattersV7(input: {
  readonly attackerIceFolk: boolean;
  readonly distance: number;
  readonly defenderFrozen: boolean;
  readonly defender: Pick<UnitStateV7, "form" | "role">;
  readonly hpAfterHit: number;
  readonly threshold: number;
}): boolean {
  return (
    input.attackerIceFolk &&
    input.distance === 1 &&
    input.defenderFrozen &&
    input.defender.role !== "JUGGERNAUT" &&
    input.hpAfterHit >= 1 &&
    input.hpAfterHit <= input.threshold
  );
}

/**
 * Section 7.5 Sweep: the two flank tiles of an attack from `attacker` on the
 * adjacent `target`: the tiles next to the target on the ring of eight
 * around the attacker (one step clockwise and one counter-clockwise).
 */
export function sweepFlankTilesV7(
  attacker: CoordV7,
  target: CoordV7,
): readonly CoordV7[] {
  const ring: readonly [number, number][] = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const index = ring.findIndex(([x, y]) => x === dx && y === dy);
  if (index === -1) return [];
  return [ring[(index + 7) % 8], ring[(index + 1) % 8]].map((offset) => {
    const [x, y] = offset as [number, number];
    return { x: attacker.x + x, y: attacker.y + y };
  });
}

function indexOf(board: { readonly width: number }, at: CoordV7): number {
  return at.y * board.width + at.x;
}
function onBoard(
  board: { readonly width: number; readonly height: number },
  at: CoordV7,
): boolean {
  return at.x >= 0 && at.y >= 0 && at.x < board.width && at.y < board.height;
}
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
