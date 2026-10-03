import type { PlayerId, UnitId } from "../model/ids";
import {
  BLIZZARD_RADIUS_V7,
  BOLAS_RANGE_V7,
  CHILL_TURNS_V7,
  COLD_SNAP_RANGE_V7,
  DEEP_WINTER_RADIUS_V7,
  factionRulesV7,
  playerFactionV7,
  technologyCapabilitiesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { surfacedRiderV7 } from "./dwarf";
import { arePlayersHostileV7 } from "./economy";
import type { DomainEventV7 } from "./events";
import { allOwnedUnitsV7 } from "./units";
import type { PlayerViewV7 } from "./view";
import type {
  ChillStatusV7,
  CoordV7,
  FactionIdV7,
  GameStateV7,
  UnitFormV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";

/**
 * The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md): Chill
 * (section 5), derived Snow and the Blizzard (section 6), and the helpers of
 * the unit rules (section 7). `chilled` is the only stored state; Snow and
 * the Blizzard are derived from the state (or the view's tile flags) on
 * every read and never cached across commands. Every helper returns the
 * neutral answer in a match without an Ice Folk seat.
 */

/** Whether any seat of the match is Ice Folk (the setup decides). */
export function matchHasIceFolkV7(state: {
  readonly setup: { readonly factions: readonly FactionIdV7[] };
}): boolean {
  return state.setup.factions.includes("ICE_FOLK");
}

/** Whether the unit's owner is an Ice Folk seat (the `snow` faction rule). */
export function unitOwnerIsIceFolkV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId },
): boolean {
  return factionRulesV7(playerFactionV7(roster, unit.ownerId)).snow;
}

/**
 * An Ice Folk unit in the sense of sections 5 to 8: a land-form unit of an
 * Ice Folk seat (never an embarked unit or a boat).
 */
export function isIceFolkLandUnitV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly form: UnitFormV7 },
): boolean {
  return unit.form === "LAND" && unitOwnerIsIceFolkV7(roster, unit);
}

// ---------------------------------------------------------------- Chill ---

/** The Chill entry of `unitId`, if any. */
export function chillOfV7(
  chilled: readonly ChillStatusV7[],
  unitId: UnitId,
): ChillStatusV7 | undefined {
  if (chilled.length === 0) return undefined;
  return chilled.find((entry) => entry.unitId === unitId);
}

/**
 * Section 5.1: whether the unit is Chilled (an entry with `turnsLeft` of at
 * least 1; a thawing entry does not count).
 */
export function isChilledV7(
  chilled: readonly ChillStatusV7[],
  unitId: UnitId,
): boolean {
  const entry = chillOfV7(chilled, unitId);
  return entry !== undefined && entry.turnsLeft >= 1;
}

/**
 * Section 5.2: whether `target` can be Chilled by a source owned by
 * `sourceOwnerId`: a living land-form unit hostile to the source's owner
 * (never embarked, naval, an Egg, own, or allied). Nothing else is immune.
 */
export function canBeChilledV7(
  state: {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
  },
  sourceOwnerId: PlayerId,
  target: Pick<UnitStateV7, "ownerId" | "form" | "hp">,
): boolean {
  return (
    target.hp > 0 &&
    target.form === "LAND" &&
    arePlayersHostileV7(state, sourceOwnerId, target.ownerId)
  );
}

/**
 * Section 5.2: applying Chill to each of `unitIds`. Without an entry a unit
 * gets `{ sluggish: true, turnsLeft: 2 }` (a new freeze); with an entry,
 * thawing or not, `turnsLeft` goes back to 2 and `sluggish` is unchanged.
 * Returns the sorted list and the entries after the application in unit-ID
 * order (the `UNITS_CHILLED` results).
 */
export function withChillAppliedV7(
  chilled: readonly ChillStatusV7[],
  unitIds: readonly UnitId[],
): {
  readonly chilled: readonly ChillStatusV7[];
  readonly results: readonly ChillStatusV7[];
} {
  const next = new Map(chilled.map((entry) => [entry.unitId, entry] as const));
  const results: ChillStatusV7[] = [];
  for (const unitId of [...new Set(unitIds)].sort((a, b) => a - b)) {
    const prior = next.get(unitId);
    const entry: ChillStatusV7 = {
      unitId,
      sluggish: prior === undefined ? true : prior.sluggish,
      turnsLeft: CHILL_TURNS_V7,
    };
    next.set(unitId, entry);
    results.push(entry);
  }
  return {
    chilled: [...next.values()].sort(
      (left, right) => left.unitId - right.unitId,
    ),
    results,
  };
}

/**
 * Section 5.4: the countdown at the end of `playerId`'s turn. Every entry of
 * that player's units loses `sluggish`, and `turnsLeft` 0 is removed while
 * any other value loses 1. No event: the view list is the source.
 */
export function chillCountdownV7(
  state: GameStateV7,
  playerId: PlayerId,
): GameStateV7 {
  if (state.chilled.length === 0) return state;
  // The Dwarf revision section 5.2: burrowed units keep counting down.
  const own = new Set(allOwnedUnitsV7(state, playerId).map((unit) => unit.id));
  let changed = false;
  const chilled = state.chilled.flatMap((entry): ChillStatusV7[] => {
    if (!own.has(entry.unitId)) return [entry];
    changed = true;
    return entry.turnsLeft === 0
      ? []
      : [
          {
            unitId: entry.unitId,
            sluggish: false,
            turnsLeft: (entry.turnsLeft - 1) as 0 | 1,
          },
        ];
  });
  return changed ? { ...state, chilled } : state;
}

/**
 * Section 10.5 Tend Wounded: the entry of a Chilled unit becomes thawing
 * (`{ sluggish: false, turnsLeft: 0 }`). Returns the list unchanged for a
 * unit that is not Chilled.
 */
export function withChillCuredV7(
  chilled: readonly ChillStatusV7[],
  unitId: UnitId,
): readonly ChillStatusV7[] {
  if (!isChilledV7(chilled, unitId)) return chilled;
  return chilled.map((entry) =>
    entry.unitId === unitId
      ? { unitId, sluggish: false, turnsLeft: 0 as const }
      : entry,
  );
}

/**
 * Section 5.4 removal: the entries of units that left the board (death,
 * rising, Disband, Mind Control, displacement, elimination). Every reducer
 * output runs through this before validation.
 */
export function prunedIceFolkV7(state: GameStateV7): GameStateV7 {
  if (state.chilled.length === 0) return state;
  // The Dwarf revision section 5.2: a burrowed unit keeps its Chill entry.
  const alive = new Set(
    allOwnedUnitsV7(state)
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.id),
  );
  const chilled = state.chilled.filter((entry) => alive.has(entry.unitId));
  return chilled.length === state.chilled.length
    ? state
    : { ...state, chilled };
}

/** One `UNITS_CHILLED` event (section 11). */
export function unitsChilledEventV7(
  playerId: PlayerId,
  sourceUnitId: UnitId,
  source: "BOLAS" | "COLD_SNAP" | "COLD_AURA",
  results: readonly ChillStatusV7[],
): Extract<DomainEventV7, { readonly kind: "UNITS_CHILLED" }> {
  return {
    kind: "UNITS_CHILLED",
    playerId,
    sourceUnitId,
    source,
    results: results.map((entry) => ({
      unitId: entry.unitId,
      sluggish: entry.sluggish,
      turnsLeft: entry.turnsLeft,
    })),
  };
}

/**
 * Section 6.4: the Cold Snap targets of `witch` among `units` (the units the
 * Witch's owner can see): every unit that can be Chilled within Chebyshev
 * `COLD_SNAP_RANGE_V7`, in unit-ID order.
 */
export function coldSnapTargetsV7<
  U extends Pick<UnitStateV7, "id" | "ownerId" | "form" | "hp" | "at">,
>(
  state: {
    readonly setup: GameStateV7["setup"];
    readonly humanPlayerId: PlayerId;
  },
  witch: Pick<UnitStateV7, "id" | "ownerId" | "at">,
  units: readonly U[],
): readonly U[] {
  return units
    .filter(
      (unit) =>
        unit.id !== witch.id &&
        chebyshev(unit.at, witch.at) <= COLD_SNAP_RANGE_V7 &&
        canBeChilledV7(state, witch.ownerId, unit),
    )
    .sort((left, right) => left.id - right.id);
}

/** Section 7.3: the Bolas reach check (Chebyshev 1 or 2). */
export function withinBolasRangeV7(from: CoordV7, to: CoordV7): boolean {
  const distance = chebyshev(from, to);
  return distance >= 1 && distance <= BOLAS_RANGE_V7;
}

/**
 * Section 7.8: the Cold Aura of `playerId`'s Start Turn: each land-form
 * Frost Giant (role ability `COLD_AURA`) in unit-ID order applies Chill to
 * every unit that can be Chilled on the eight tiles around it; one
 * `UNITS_CHILLED` event (source `COLD_AURA`) per Giant with a target.
 */
export function resolveColdAuraV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (!matchHasIceFolkV7(state)) return { state, events: [] };
  const giants = state.units
    .filter(
      (unit) =>
        unit.ownerId === playerId &&
        unit.hp > 0 &&
        unit.form === "LAND" &&
        unitRoleRuleV7(state, unit).abilities.includes("COLD_AURA"),
    )
    .sort((left, right) => left.id - right.id);
  if (giants.length === 0) return { state, events: [] };
  let chilled = state.chilled;
  const events: DomainEventV7[] = [];
  for (const giant of giants) {
    const targets = state.units
      .filter(
        (unit) =>
          unit.id !== giant.id &&
          chebyshev(unit.at, giant.at) === 1 &&
          canBeChilledV7(state, giant.ownerId, unit),
      )
      .map((unit) => unit.id);
    if (targets.length === 0) continue;
    const applied = withChillAppliedV7(chilled, targets);
    chilled = applied.chilled;
    events.push(
      unitsChilledEventV7(playerId, giant.id, "COLD_AURA", applied.results),
    );
  }
  return events.length === 0
    ? { state, events }
    : { state: { ...state, chilled }, events };
}

// ------------------------------------------------------- Snow, Blizzard ---

/** The derived winter of a state: Snow and Blizzard tiles by board index. */
export interface WinterV7 {
  /** Board indices of the Snow tiles (land only). */
  readonly snow: ReadonlySet<number>;
  /** Board indices within `BLIZZARD_RADIUS_V7` of a land-form Witch. */
  readonly blizzard: ReadonlySet<number>;
  /** Board indices of the Snow from territory and Deep Winter only. */
  readonly groundSnow: ReadonlySet<number>;
  /** The land-form Ice Witches (any Ice Folk seat). */
  readonly witches: readonly Pick<UnitStateV7, "id" | "ownerId" | "at">[];
}

const NO_WINTER_V7: WinterV7 = Object.freeze({
  snow: new Set<number>(),
  blizzard: new Set<number>(),
  groundSnow: new Set<number>(),
  witches: [],
});

const WINTER_CACHE_V7 = new WeakMap<object, WinterV7>();

/** The facts the derived Snow reads (a canonical state or a projection). */
export type WinterFactsV7 = Pick<
  GameStateV7,
  "setup" | "board" | "players" | "cities" | "units"
>;

/**
 * Sections 6.1 and 6.3: the Snow and Blizzard tiles of `state`, derived from
 * the current state at every read (memoised per state object only, which is
 * immutable). Snow is a land tile (biome not null) that is in the territory
 * of a city owned by an Ice Folk seat, or within Chebyshev 1 of a land-form
 * Ice Witch, or has no territory and lies within Chebyshev 2 of the center
 * of a city whose Ice Folk owner has Deep Winter. Water is never Snow; the
 * Blizzard covers water tiles too (for drawing only).
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
    const owner = factionOf.get(city.ownerId);
    if (owner === undefined || !factionRulesV7(owner.faction).snow) continue;
    iceCityIds.add(city.id);
    if (
      technologyCapabilitiesV7(owner.researchedTechs, owner.faction).deepWinter
    )
      deepWinterCenters.push(city.at);
  }
  const groundSnow = new Set<number>();
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index];
    // Section 6.1: Water and Rift tiles are never Snow.
    if (tile === undefined || tile.biome === null || tile.terrain === "RIFT")
      continue;
    if (tile.territoryCityId !== null) {
      if (iceCityIds.has(tile.territoryCityId)) groundSnow.add(index);
      continue;
    }
    if (
      deepWinterCenters.some(
        (center) => chebyshev(center, tile.at) <= DEEP_WINTER_RADIUS_V7,
      )
    )
      groundSnow.add(index);
  }
  // Only the Ice Witch's role has `BLIZZARD` (under her owner's registration).
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
  const snow = new Set(groundSnow);
  for (const index of blizzard)
    if (
      tiles[index] !== undefined &&
      tiles[index]?.biome !== null &&
      tiles[index]?.terrain !== "RIFT"
    )
      snow.add(index);
  const result: WinterV7 = {
    snow,
    blizzard,
    groundSnow,
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
 * Section 6.5: the winter a viewer knows of, by board index: the territory
 * and Deep Winter Snow (public on every tile), and the Blizzard (and its
 * Snow) of every Witch the viewer can see (her tile is explored by the
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
  const { width, height, tiles } = state.board;
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
  const snow = new Set(winter.groundSnow);
  for (const index of blizzard)
    if (
      tiles[index] !== undefined &&
      tiles[index]?.biome !== null &&
      tiles[index]?.terrain !== "RIFT"
    )
      snow.add(index);
  return { snow, blizzard };
}

/**
 * Section 6.3 (root ruling 4): whether `unit` is protected by a Blizzard's
 * ranged-damage halving: a land-form Ice Folk unit within
 * `BLIZZARD_RADIUS_V7` of a land-form Ice Witch of its own seat. `witches`
 * are the Witches the caller knows of (canonical: all; public: visible).
 */
export function blizzardProtectsV7(
  roster: FactionRosterV7,
  witches: readonly Pick<UnitStateV7, "ownerId" | "at">[],
  unit: Pick<UnitStateV7, "ownerId" | "form" | "at">,
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
 * seat whose role Glides (every Ice Folk land role but the Sabretooth).
 */
export function unitGlidesV7(
  roster: FactionRosterV7,
  unit: {
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
 * Section 7.7: a unit that never ends a Move (or lands) on a settlement
 * center it does not own: a Martian flyer, or a land-form Sabretooth
 * (`PROWL`).
 */
export function unitAvoidsForeignSitesV7(
  roster: FactionRosterV7 & { readonly surfacedThisTurn?: readonly UnitId[] },
  unit: {
    readonly id?: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form?: UnitFormV7;
  },
): boolean {
  return (
    (unit.form === undefined || unit.form === "LAND") &&
    (unitRoleMechanicsV7(roster, unit).movementMode === "FLY" ||
      unitRoleRuleV7(roster, unit).abilities.includes("PROWL") ||
      // The Dwarf revision (section 5.4, root ruling 1): a rider never ends
      // a Move or advances on a foreign or neutral center on the turn it
      // surfaced.
      surfacedRiderV7(roster, unit))
  );
}

/** Section 7.7 Prowl: entering hostile zone of control does not end a Move. */
export function unitIgnoresZocStopsV7(
  roster: FactionRosterV7,
  unit: {
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

/** The attacker's owner's Shatter threshold (section 5.5). */
export function shatterThresholdV7(
  players:
    | GameStateV7["players"]
    | readonly {
        readonly id: PlayerId;
        readonly faction: FactionIdV7;
        readonly researchedTechs: readonly string[];
      }[],
  playerId: PlayerId,
): number {
  const player = players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return technologyCapabilitiesV7(
    player.researchedTechs as GameStateV7["players"][number]["researchedTechs"],
    player.faction,
  ).shatterThreshold;
}

/**
 * Section 5.5: whether an attack shatters its defender: the attacker is a
 * land-form unit of an Ice Folk seat attacking from distance 1; the defender
 * is Chilled (or assumed Chilled), in land form, and not of the `JUGGERNAUT`
 * role; and the HP the hit leaves is from 1 to the threshold.
 */
export function attackShattersV7(input: {
  readonly attackerIceFolk: boolean;
  readonly distance: number;
  readonly defenderChilled: boolean;
  readonly defender: Pick<UnitStateV7, "form" | "role">;
  readonly hpAfterHit: number;
  readonly threshold: number;
}): boolean {
  return (
    input.attackerIceFolk &&
    input.distance === 1 &&
    input.defenderChilled &&
    input.defender.form === "LAND" &&
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
