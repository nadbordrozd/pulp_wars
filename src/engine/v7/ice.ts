import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  COLD_SNAP_RANGE_V7,
  iceEntryIndexV7,
  iceTileKeyV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitKindWalksIceV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
  type IceLookupV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import {
  canBeFrozenV7,
  freezeChangesUnitV7,
  unitsFrozenEventV7,
  winterV7,
  withFrozenAppliedV7,
} from "./ice-folk";
import { compareCoordsV7 } from "./schema";
import {
  isNeutralOwnerV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type IceTileV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";

/**
 * The naval branch, engine step II: the frozen sea of the Ice Folk
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8), as redesigned by
 * docs/product/RULESET_7_ICE_REDESIGN.md (`pulp_wars-5ti.25`). Ice is a
 * stored layer over water tiles (`GameStateV7.ice`): ground for every
 * land-form unit, never entered by a unit afloat, and permanent until a
 * Crack Ice breaks it. This module holds the ice reads every rule shares
 * (`iceAtV7`), the one Freeze effect (`pulp_wars-xv0t`, 7r133: the freeze
 * of a tile, the Cold Wake, the border freeze, and stored Snow), the
 * building on ice (Black Ice, thick ice, and the crack result retired with
 * the naval branch rebuilt, `pulp_wars-tzk6`, 7r137: one Crack breaks any
 * ice). The list changes in the middle of a turn (a freeze, a Crack), so nothing here
 * is cached across lists. Every helper returns the neutral answer in a match
 * without an Ice Folk seat, whose list is always empty.
 */

/** The ice entry on `at`, if any (section 8.3 `iceAtV7`), by index. */
export function iceAtV7<T extends { readonly at: CoordV7 }>(
  lookup: { readonly ice: readonly T[] },
  at: CoordV7,
): T | undefined {
  const ice = lookup.ice;
  if (ice.length === 0) return undefined;
  return iceEntryIndexV7(ice).get(iceTileKeyV7(at));
}

const NO_ICE_V7: ReadonlySet<number> = new Set<number>();
const ICE_BOARD_INDEXES_V7 = new WeakMap<
  readonly unknown[],
  { readonly width: number; readonly set: ReadonlySet<number> }
>();

/** The board indices (`y * width + x`) of the ice tiles of a lookup. */
export function iceIndexSetV7(
  lookup: IceLookupV7,
  width: number,
): ReadonlySet<number> {
  if (lookup.ice.length === 0) return NO_ICE_V7;
  const cached = ICE_BOARD_INDEXES_V7.get(lookup.ice);
  if (cached !== undefined && cached.width === width) return cached.set;
  const set = new Set(
    lookup.ice.map((entry) => entry.at.y * width + entry.at.x),
  );
  ICE_BOARD_INDEXES_V7.set(lookup.ice, { width, set });
  return set;
}

/**
 * Ice Folk movement (`pulp_wars-s55m.2`; `unitSkatesV7` until
 * `pulp_wars-ecnj`, 7r135): whether the unit is an Ice Folk ground unit: a
 * land-form unit of the Ice Folk kind, every role on the ground (the Ice
 * Folk roster rework, `pulp_wars-s55m.4`: the Frost Wyrm flies). Such a
 * unit may dive through Fishing Holes. A body rule, so a mind-controlled
 * Ice Folk unit counts for its controller. (Skating is plain movement since
 * 7r135: Glide, `unitGlidesV7`, covers Snow and ice alike.)
 */
export function unitIsIceFolkGroundV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unit.form === "LAND" &&
    unitKindWalksIceV7(roster, unit) &&
    unitRoleMechanicsV7(roster, unit).movementMode === "GROUND"
  );
}

/**
 * The frozen sea redesign (section 2.9 rows 2): whether the unit may Crack
 * Ice at all: a unit of any kind but the Ice Folk (a body rule of its kind,
 * so a mind-controlled Ice Folk unit never cracks), in land, naval, or
 * embarked form (never an Egg; a burrowed unit is off the board), and not a
 * neutral Monster. It is a kind rule, not a role-table entry.
 *
 * One tile, one meaning (`pulp_wars-y242`, 7r132): a unit cracks exactly
 * the ice it may not walk on. So a role whose movement mode is `STRIDE` or
 * `FLY` (the Martian walkers and flyers, the Dwarf Gyrocopter, the Cult's
 * summons), which stands on ice in land form, never cracks it, in any form;
 * every ground role and every ship of the eight other factions does.
 */
export function unitCracksIceV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    (unit.form === "LAND" ||
      unit.form === "NAVAL" ||
      unit.form === "EMBARKED") &&
    !isNeutralOwnerV7(unit.ownerId) &&
    !unitKindWalksIceV7(roster, unit) &&
    unitRoleMechanicsV7(roster, unit).movementMode === "GROUND"
  );
}

/**
 * The frozen sea redesign (section 2.6): whether a seat of `faction` may
 * build on the ice entry `entry` for `actor`: only an Ice Folk seat (a seat
 * rule read from the seat's faction, like Snow; a Martian controlling a Yeti
 * does not), on its own ice. The caller checks the rest of the common gate
 * (territory, exploration, resource, improvement, occupants, and the
 * building's own rules).
 */
export function iceBuildableV7(
  faction: FactionIdV7,
  actor: PlayerId,
  entry: { readonly ownerId: PlayerId } | undefined,
): boolean {
  return (
    entry !== undefined && entry.ownerId === actor && faction === "ICE_FOLK"
  );
}

/**
 * What a freeze reads of one tile (canonical state or the actor's view;
 * the one Freeze effect, `pulp_wars-xv0t`, 7r133,
 * docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.1).
 */
export interface FreezeTileFactsV7 {
  /** Explored by the actor. */
  readonly explored: boolean;
  readonly terrain: string;
  /** A land tile (its biome is not null). */
  readonly land: boolean;
  /** The tile lies in some player's territory. */
  readonly territory: boolean;
  /** A dock (Port or Shipyard) stands on it: docks are never frozen. */
  readonly dock: boolean;
  /**
   * The tile is Snow already (territory, Deep Winter, or stored Snow: all
   * public since the Blizzard lays none, so the view's `snow` flag equals
   * the state's).
   */
  readonly snow: boolean;
  /** The ice on the tile: whether it is the actor's own. */
  readonly ice: { readonly own: boolean } | null;
  /** Whether any living unit stands on the tile (seen or not). */
  readonly occupied: boolean;
  /**
   * The units on the tile the freeze Freezes: hostile to the actor,
   * visible to it, freezable (`canBeFrozenV7`), and not Frozen already, in
   * unit-ID order.
   */
  readonly freezes: readonly UnitId[];
}

/** The result of a freeze (section 3.1), shared with the previews. */
export interface FreezeSetV7 {
  /**
   * Every water tile that gets an ice entry of the actor (open water made
   * ice, another player's ice taken), in (y, x) order.
   */
  readonly tiles: readonly CoordV7[];
  /** The tiles of `tiles` that were another player's ice, in (y, x) order. */
  readonly taken: readonly CoordV7[];
  /** The open neutral land tiles that become stored Snow, in (y, x) order. */
  readonly snow: readonly CoordV7[];
  /** The units the freeze Freezes, in unit-ID order. */
  readonly units: readonly UnitId[];
}

/** A freeze that changes nothing. */
export const NO_FREEZE_V7: FreezeSetV7 = Object.freeze({
  tiles: [],
  taken: [],
  snow: [],
  units: [],
});

/** Whether a freeze changes anything (a tile or a unit). */
export function freezeChangesAnythingV7(freeze: FreezeSetV7): boolean {
  return (
    freeze.tiles.length > 0 || freeze.snow.length > 0 || freeze.units.length > 0
  );
}

type FreezeTileResultV7 = "MAKE" | "TAKE" | "SNOW" | "NONE";

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133, section 3.1): what
 * freezing one tile does to the tile itself (the units on it are read
 * separately). Water (Shallow, or Deep with `DEEP`, Pack Ice): open water
 * with no unit is made the actor's ice; another player's ice is taken; the
 * actor's own ice, a tile holding any unit (afloat, over the water, or a
 * swimming Walrus), and any dock are unchanged. Land: open land that is no
 * player's territory and not a Rift becomes stored Snow; territory land, a
 * Rift, and a tile that is Snow already are unchanged. An unexplored tile is
 * unchanged.
 */
function freezeTileV7(
  tile: FreezeTileFactsV7,
  freezeWater: "NONE" | "SHALLOW" | "DEEP",
): FreezeTileResultV7 {
  if (!tile.explored) return "NONE";
  if (tile.land)
    return tile.terrain === "RIFT" || tile.territory || tile.snow
      ? "NONE"
      : "SNOW";
  if (
    tile.dock ||
    freezeWater === "NONE" ||
    (tile.terrain !== "SHALLOW_WATER" &&
      !(tile.terrain === "DEEP_WATER" && freezeWater === "DEEP"))
  )
    return "NONE";
  if (tile.ice !== null) return tile.ice.own ? "NONE" : "TAKE";
  return tile.occupied ? "NONE" : "MAKE";
}

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133, section 3.1): the freeze
 * of every tile in `tiles` (in any order; off-board tiles are skipped) by an
 * actor whose freezes make ice of `freezeWater`. A hostile unit on a frozen
 * tile is Frozen (its tile changes as the table says: a ship's water stays
 * water). Shared by the Cold Snap, the Cold Wake, and their previews.
 */
export function freezeTilesV7(input: {
  readonly tiles: readonly CoordV7[];
  readonly freezeWater: "NONE" | "SHALLOW" | "DEEP";
  readonly tileAt: (at: CoordV7) => FreezeTileFactsV7 | undefined;
}): FreezeSetV7 {
  const tiles: CoordV7[] = [];
  const taken: CoordV7[] = [];
  const snow: CoordV7[] = [];
  const units = new Set<UnitId>();
  for (const at of input.tiles) {
    const tile = input.tileAt(at);
    if (tile === undefined) continue;
    for (const unitId of tile.freezes) units.add(unitId);
    const result = freezeTileV7(tile, input.freezeWater);
    const copy = { x: at.x, y: at.y };
    if (result === "SNOW") snow.push(copy);
    else if (result !== "NONE") {
      tiles.push(copy);
      if (result === "TAKE") taken.push(copy);
    }
  }
  return {
    tiles: tiles.sort(compareCoordsV7),
    taken: taken.sort(compareCoordsV7),
    snow: snow.sort(compareCoordsV7),
    units: [...units].sort((left, right) => left - right),
  };
}

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): the ring a Cold Snap or
 * a Cold Wake freezes: the eight tiles around `center`
 * (`COLD_SNAP_RANGE_V7`, the center itself excepted), in (y, x) order.
 * Off-board tiles are included; {@link freezeTilesV7} skips them.
 */
export function freezeRingTilesV7(center: CoordV7): readonly CoordV7[] {
  const ring: CoordV7[] = [];
  for (
    let y = center.y - COLD_SNAP_RANGE_V7;
    y <= center.y + COLD_SNAP_RANGE_V7;
    y += 1
  )
    for (
      let x = center.x - COLD_SNAP_RANGE_V7;
      x <= center.x + COLD_SNAP_RANGE_V7;
      x += 1
    )
      if (x !== center.x || y !== center.y) ring.push({ x, y });
  return ring;
}

/**
 * The one Freeze effect: what a freeze by `actor` reads of one tile of the
 * canonical state (`freezeTilesV7`). A unit on the tile is Frozen when the
 * actor sees it, can Freeze it, and it is not Frozen already.
 */
export function canonicalFreezeTileFactsV7(
  state: GameStateV7,
  actor: PlayerId,
  visible: (unit: UnitStateV7) => boolean,
): (at: CoordV7) => FreezeTileFactsV7 | undefined {
  const player = state.players.find((candidate) => candidate.id === actor);
  const explored = new Set(
    (player?.explored ?? []).map((at) => iceTileKeyV7(at)),
  );
  const snow = winterV7(state).snow;
  return (at) => {
    if (
      at.x < 0 ||
      at.y < 0 ||
      at.x >= state.board.width ||
      at.y >= state.board.height
    )
      return undefined;
    const tile = state.board.tiles[at.y * state.board.width + at.x];
    if (tile === undefined) return undefined;
    const occupants = state.units.filter(
      (candidate) =>
        candidate.hp > 0 && candidate.at.x === at.x && candidate.at.y === at.y,
    );
    const entry = iceAtV7(state, at);
    return {
      explored: explored.has(iceTileKeyV7(at)),
      terrain: tile.terrain,
      land: tile.biome !== null,
      territory: tile.territoryCityId !== null,
      dock: tile.improvement === "PORT" || tile.improvement === "SHIPYARD",
      snow: snow.has(at.y * state.board.width + at.x),
      ice: entry === undefined ? null : { own: entry.ownerId === actor },
      occupied: occupants.length > 0,
      freezes: occupants
        .filter(
          (occupant) =>
            visible(occupant) &&
            canBeFrozenV7(state, actor, occupant) &&
            freezeChangesUnitV7(state, state.frozen, occupant),
        )
        .map((occupant) => occupant.id)
        .sort((left, right) => left - right),
    };
  };
}

/**
 * The one Freeze effect: the state after `actor` froze `freeze` (the ice
 * entries made or taken; the Snow laid; the units Frozen), with
 * its events: one `UNITS_FROZEN` of `source` when a unit was Frozen, then
 * one `TILES_FROZEN` when a tile froze. A freeze makes no ice on a dock, so
 * no blockade changes and the live economy needs no recomputation.
 */
export function withFreezeAppliedV7(
  state: GameStateV7,
  actor: PlayerId,
  sourceUnitId: UnitId | null,
  source: "COLD_SNAP" | "COLD_WAKE" | "SNOWBALL",
  freeze: FreezeSetV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (!freezeChangesAnythingV7(freeze)) return { state, events: [] };
  const events: DomainEventV7[] = [];
  let frozen = state.frozen;
  if (freeze.units.length > 0) {
    const applied = withFrozenAppliedV7(state, state.frozen, freeze.units);
    frozen = applied.frozen;
    events.push(
      unitsFrozenEventV7(actor, sourceUnitId, source, applied.results),
    );
  }
  if (freeze.tiles.length > 0 || freeze.snow.length > 0)
    events.push({
      kind: "TILES_FROZEN",
      playerId: actor,
      unitId: sourceUnitId,
      tiles: freeze.tiles,
      snow: freeze.snow,
    });
  return {
    state: {
      ...state,
      ice: withFrozenV7(state.ice, freeze.tiles, actor),
      snow: withSnowV7(state.snow, freeze.snow),
      frozen,
    },
    events,
  };
}

/**
 * The one Freeze effect (`pulp_wars-xv0t`, 7r133): the Cold Wake of the
 * Walrus and the Frost Giant (the Frost Giant's Cold Aura before). When a
 * land-form unit whose role has `COLD_WAKE` completes its own `MOVE` (a
 * dive included; nothing else: an advance, a push, a pull, or a placement
 * does not count), it freezes every tile of the eight around its new tile
 * (section 3.1), read after the Move (its sight revealed). Returns the state
 * unchanged for every other unit.
 */
export function resolveColdWakeV7(
  state: GameStateV7,
  unitId: UnitId,
  visible: (unit: UnitStateV7) => boolean,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (!state.setup.factions.includes("ICE_FOLK")) return { state, events: [] };
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (
    unit === undefined ||
    unit.form !== "LAND" ||
    !unitRoleRuleV7(state, unit).abilities.includes("COLD_WAKE")
  )
    return { state, events: [] };
  const player = state.players.find(
    (candidate) => candidate.id === unit.ownerId,
  );
  if (player === undefined) return { state, events: [] };
  // A unit-level unlock (the Mind Control revision section 5.2): the
  // controller's research through the unit's kind's tree.
  const capabilities = unitCapabilitiesV7(state, unit, player.researchedTechs);
  const freeze = freezeTilesV7({
    tiles: freezeRingTilesV7(unit.at),
    freezeWater: capabilities.freezeWater,
    tileAt: canonicalFreezeTileFactsV7(state, unit.ownerId, visible),
  });
  return withFreezeAppliedV7(state, unit.ownerId, unit.id, "COLD_WAKE", freeze);
}

/**
 * The border freeze (`pulp_wars-5ti.31`; the user, 2026-10-24: "when doing
 * land grant and city boundaries expand any water within city boundaries
 * (including water within the original boundaries) should get covered with
 * ice IF you have the relevant technology"). When the borders of an Ice
 * Folk city grow (a Land Grant, a village captured into a city, a city
 * captured), and when its owner researches a technology that widens what
 * it freezes (Rime, Pack Ice), every water tile of that city's territory is
 * put through the freeze of one tile (`freezeTileV7`, section 3.1) with the
 * seat's own `freezeWater`: open water with no unit is made ice, another
 * player's ice is taken, and own ice, unexplored tiles, deep water without
 * Pack Ice, a tile holding any unit, and (since `pulp_wars-xv0t`, 7r133)
 * every dock are left (no unit
 * acts, so nobody is Frozen; territory land is never Snow). `cityIds` null:
 * every city of `actor`. A seat without Rime (every seat of another
 * faction) freezes nothing.
 */
export function territoryFreezeV7(
  state: Pick<
    GameStateV7,
    "board" | "cities" | "units" | "ice" | "players" | "setup" | "humanPlayerId"
  >,
  actor: PlayerId,
  cityIds: ReadonlySet<CityId> | null,
): {
  readonly ice: readonly IceTileV7[];
  readonly frozen: FreezeSetV7;
} {
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player === undefined || player.status === "ELIMINATED")
    return { ice: state.ice, frozen: NO_FREEZE_V7 };
  const capabilities = technologyCapabilitiesV7(
    player.researchedTechs,
    player.faction,
  );
  if (capabilities.freezeWater === "NONE")
    return { ice: state.ice, frozen: NO_FREEZE_V7 };
  const own = new Set(
    state.cities
      .filter(
        (city) =>
          city.ownerId === actor && (cityIds === null || cityIds.has(city.id)),
      )
      .map((city) => city.id),
  );
  if (own.size === 0) return { ice: state.ice, frozen: NO_FREEZE_V7 };
  const explored = new Set(player.explored.map((at) => iceTileKeyV7(at)));
  const occupied = new Set(
    state.units
      .filter((candidate) => candidate.hp > 0)
      .map((candidate) => iceTileKeyV7(candidate.at)),
  );
  const tiles: CoordV7[] = [];
  for (const tile of state.board.tiles) {
    if (tile.territoryCityId === null || !own.has(tile.territoryCityId))
      continue;
    if (tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER")
      continue;
    tiles.push(tile.at);
  }
  const frozen = freezeTilesV7({
    tiles,
    freezeWater: capabilities.freezeWater,
    tileAt: (at) => {
      const tile = state.board.tiles[at.y * state.board.width + at.x];
      if (tile === undefined) return undefined;
      const entry = iceAtV7(state, at);
      return {
        explored: explored.has(iceTileKeyV7(at)),
        terrain: tile.terrain,
        land: false,
        territory: true,
        dock: tile.improvement === "PORT" || tile.improvement === "SHIPYARD",
        snow: false,
        ice: entry === undefined ? null : { own: entry.ownerId === actor },
        occupied: occupied.has(iceTileKeyV7(at)),
        // The border freeze Freezes no unit: no unit acted.
        freezes: [],
      };
    },
  });
  if (frozen.tiles.length === 0)
    return { ice: state.ice, frozen: NO_FREEZE_V7 };
  return { ice: withFrozenV7(state.ice, frozen.tiles, actor), frozen };
}

/**
 * The `TILES_FROZEN` of a border freeze (`territoryFreezeV7`): no unit
 * froze the water (`unitId` null), or nothing when no tile changed.
 */
export function territoryFrozenEventsV7(
  actor: PlayerId,
  frozen: FreezeSetV7,
): readonly DomainEventV7[] {
  if (frozen.tiles.length === 0) return [];
  return [
    {
      kind: "TILES_FROZEN",
      playerId: actor,
      unitId: null,
      tiles: frozen.tiles,
      snow: [],
    },
  ];
}

/** The stored Snow with `tiles` added, sorted by (y, x), one per tile. */
export function withSnowV7(
  snow: readonly CoordV7[],
  tiles: readonly CoordV7[],
): readonly CoordV7[] {
  if (tiles.length === 0) return snow;
  const keys = new Set(snow.map((at) => iceTileKeyV7(at)));
  const added = tiles.filter((at) => !keys.has(iceTileKeyV7(at)));
  if (added.length === 0) return snow;
  return [...snow, ...added.map((at) => ({ x: at.x, y: at.y }))].sort(
    compareCoordsV7,
  );
}

/** The ice list with `tiles` frozen for `ownerId`, sorted by (y, x). */
export function withFrozenV7(
  ice: readonly IceTileV7[],
  tiles: readonly CoordV7[],
  ownerId: PlayerId,
): readonly IceTileV7[] {
  if (tiles.length === 0) return ice;
  const keys = new Set(tiles.map((at) => iceTileKeyV7(at)));
  return [
    ...ice.filter((entry) => !keys.has(iceTileKeyV7(entry.at))),
    ...tiles.map((at) => ({ at: { x: at.x, y: at.y }, ownerId })),
  ].sort((left, right) => compareCoordsV7(left.at, right.at));
}

/** The ice list without the entries on `tiles`. */
export function withoutIceV7(
  ice: readonly IceTileV7[],
  tiles: readonly CoordV7[],
): readonly IceTileV7[] {
  if (tiles.length === 0) return ice;
  const keys = new Set(tiles.map((at) => iceTileKeyV7(at)));
  return ice.filter((entry) => !keys.has(iceTileKeyV7(entry.at)));
}
