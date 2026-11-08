import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  FREEZE_LINE_V7,
  LONG_FREEZE_LINE_V7,
  WITCH_FREEZE_RADIUS_V7,
  iceEntryIndexV7,
  iceTileKeyV7,
  technologyCapabilitiesV7,
  unitKindWalksIceV7,
  unitRoleMechanicsV7,
  type FactionRosterV7,
  type IceLookupV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import {
  canBeFrozenV7,
  unitsFrozenEventV7,
  withFrozenAppliedV7,
} from "./ice-folk";
import { compareCoordsV7 } from "./schema";
import {
  isAfloatFormV7,
  isNeutralOwnerV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type IceTileV7,
  type PlayerStateV7,
  type UnitFormV7,
  type UnitRoleIdV7,
} from "./types";

/**
 * The naval branch, engine step II: the frozen sea of the Ice Folk
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8), as redesigned by
 * docs/product/RULESET_7_ICE_REDESIGN.md (`pulp_wars-5ti.25`). Ice is a
 * stored layer over water tiles (`GameStateV7.ice`): ground for every
 * land-form unit, never entered by a unit afloat, and permanent until a
 * Crack Ice breaks it. This module holds the ice reads every rule shares
 * (`iceAtV7`), the Freeze set, the
 * Crack Ice result, building on ice, and Black Ice on entry. The
 * list changes in the middle of a turn (a Freeze, a Crack), so nothing here
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
 * Ice Folk movement (`pulp_wars-s55m.2`, `pulp-wars-poc-7r124`; the forced
 * slide before): whether the unit **skates**: a land-form unit of the Ice
 * Folk kind, every role on the ground (the Ice Folk roster rework,
 * `pulp_wars-s55m.4`: the Frost Wyrm flies and never skates). Each step it
 * makes onto an ice tile costs half a Move point (ice is its road). A body
 * rule, so a mind-controlled Ice Folk unit skates for its controller.
 */
export function unitSkatesV7(
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
 * Ice Folk movement (`pulp_wars-s55m.2`): **Runners**, whether a step of
 * the skating unit from ice onto ice in the same direction as the step
 * before it in the same Move costs nothing (the Sled and the Snow Hunter,
 * a body rule of the role under its kind), so it glides any distance in a
 * straight line along ice and may stop on any tile of it.
 */
export function unitHasRunnersV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unitSkatesV7(roster, unit) && unitRoleMechanicsV7(roster, unit).runners
  );
}

/**
 * Ice Folk movement (`pulp_wars-s55m.2`): whether the unit's step onto ice
 * that enters a hostile zone of control does not end its Move while its
 * next step glides on straight along the ice (the Sled).
 */
export function unitGlidesThroughZocV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    unitHasRunnersV7(roster, unit) &&
    unitRoleMechanicsV7(roster, unit).glidesThroughZoc
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
 * The frozen sea redesign (section 2.3): whether the ice of `ownerId` is
 * thick: its owner is a living player whose tree's Glacier it has
 * researched (`thickIce`). An eliminated owner has no thick ice. A
 * seat-level read of the ice owner's own capability.
 */
export function iceIsThickV7(
  players: readonly Pick<
    PlayerStateV7,
    "id" | "status" | "faction" | "researchedTechs"
  >[],
  ownerId: PlayerId,
): boolean {
  const owner = players.find((player) => player.id === ownerId);
  return (
    owner !== undefined &&
    owner.status !== "ELIMINATED" &&
    technologyCapabilitiesV7(owner.researchedTechs, owner.faction).thickIce
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

/** What a Freeze reads of one tile (canonical state or the actor's view). */
export interface FreezeTileFactsV7 {
  /** Explored by the actor. */
  readonly explored: boolean;
  readonly terrain: string;
  /** The ice on the tile: whether it is the actor's own, and cracked. */
  readonly ice: { readonly own: boolean; readonly cracked: boolean } | null;
  /** The living unit on the tile, if any (visible on an explored tile). */
  readonly unit: {
    readonly id: UnitId;
    readonly form: UnitFormV7;
    /**
     * Ice Folk freeze rework (`pulp_wars-s55m.1`): the actor can Freeze it
     * now and that would change its Frozen entry (`canBeFrozenV7`, visible
     * to the actor, `freezeChangesUnitV7`). The Sea Serpent never is.
     */
    readonly freezable: boolean;
  } | null;
}

/** The result of the freeze set (redesign section 2.4), shared with the preview. */
export interface FreezeSetV7 {
  /** Every tile that gets an entry of the actor, in (y, x) order. */
  readonly tiles: readonly CoordV7[];
  /** The actor's own cracked tiles of `tiles`, mended, in (y, x) order. */
  readonly mended: readonly CoordV7[];
  /** The tiles of `tiles` that were another player's ice, in (y, x) order. */
  readonly taken: readonly CoordV7[];
  /**
   * Ice Folk freeze rework (`pulp_wars-s55m.1`): the units afloat the
   * Freeze Frozen on open water it reached (their tiles stay open water),
   * in unit-ID order.
   */
  readonly units: readonly UnitId[];
}

type FreezeTakeV7 = "MAKE" | "FREEZE_UNIT" | "TAKE" | "MEND" | "PASS" | "NO";

/**
 * The frozen sea redesign (section 2.4), as reworked by `pulp_wars-s55m.1`:
 * what a Freeze does to one tile. A tile is freezable when it is explored
 * by the actor and water (Shallow, or Deep with `DEEP`); any dock, another
 * player's included, may be iced over (it stays its owner's dock). Open
 * water with no unit is made ice; open water holding a unit afloat that
 * the actor can freeze stays open water and the unit is Frozen; another
 * player's ice is taken (any occupant); the actor's own cracked ice is
 * mended (any occupant); the actor's own sound ice is passed over.
 */
function freezeTakeV7(
  tile: FreezeTileFactsV7 | undefined,
  freezeWater: "NONE" | "SHALLOW" | "DEEP",
): FreezeTakeV7 {
  if (tile === undefined || !tile.explored || freezeWater === "NONE")
    return "NO";
  if (
    tile.terrain !== "SHALLOW_WATER" &&
    !(tile.terrain === "DEEP_WATER" && freezeWater === "DEEP")
  )
    return "NO";
  if (tile.ice !== null)
    return !tile.ice.own ? "TAKE" : tile.ice.cracked ? "MEND" : "PASS";
  if (tile.unit === null) return "MAKE";
  return tile.unit.freezable && isAfloatFormV7(tile.unit.form)
    ? "FREEZE_UNIT"
    : "NO";
}

/**
 * The frozen sea redesign (section 2.4): the freeze set of a Freeze by a
 * unit on `from` aimed at `at`. `ring` (the Ice Witch's Cold Snap): every
 * freezable tile within Chebyshev `WITCH_FREEZE_RADIUS_V7` of her, her own
 * tile included. Otherwise a line of `line` tiles (`freezeLineV7`) from
 * `at` in the direction from the unit to `at`: each is taken if freezable;
 * the actor's own sound ice is passed over and the line goes on; any other
 * tile ends the line, and so does a tile that holds a unit afloat (after
 * Freezing it, when it can). An empty `tiles` and `units` means the Freeze
 * changes nothing and is not offered.
 */
export function freezeSetV7(input: {
  readonly from: CoordV7;
  readonly at: CoordV7;
  readonly ring: boolean;
  readonly line: number;
  readonly freezeWater: "NONE" | "SHALLOW" | "DEEP";
  readonly tileAt: (at: CoordV7) => FreezeTileFactsV7 | undefined;
}): FreezeSetV7 {
  const tiles: CoordV7[] = [];
  const mended: CoordV7[] = [];
  const taken: CoordV7[] = [];
  const units: UnitId[] = [];
  const take = (at: CoordV7): "GO" | "STOP" => {
    const tile = input.tileAt(at);
    if (tile === undefined) return "STOP";
    const result = freezeTakeV7(tile, input.freezeWater);
    if (result === "FREEZE_UNIT" && tile.unit !== null) {
      units.push(tile.unit.id);
      return "STOP";
    }
    if (result === "NO") return "STOP";
    if (result !== "PASS") {
      tiles.push({ x: at.x, y: at.y });
      if (result === "MEND") mended.push({ x: at.x, y: at.y });
      if (result === "TAKE") taken.push({ x: at.x, y: at.y });
    }
    return tile.unit !== null && isAfloatFormV7(tile.unit.form) ? "STOP" : "GO";
  };
  if (input.ring) {
    for (
      let y = input.from.y - WITCH_FREEZE_RADIUS_V7;
      y <= input.from.y + WITCH_FREEZE_RADIUS_V7;
      y += 1
    )
      for (
        let x = input.from.x - WITCH_FREEZE_RADIUS_V7;
        x <= input.from.x + WITCH_FREEZE_RADIUS_V7;
        x += 1
      )
        take({ x, y });
  } else {
    const dx = input.at.x - input.from.x;
    const dy = input.at.y - input.from.y;
    let current = input.at;
    for (let step = 0; step < input.line; step += 1) {
      if (take(current) !== "GO") break;
      current = { x: current.x + dx, y: current.y + dy };
    }
  }
  return {
    tiles: tiles.sort(compareCoordsV7),
    mended: mended.sort(compareCoordsV7),
    taken: taken.sort(compareCoordsV7),
    units: units.sort((left, right) => left - right),
  };
}

/**
 * Ice Folk freeze rework (`pulp_wars-s55m.1`): the length of a Freeze line
 * for a unit whose capabilities have `longFreeze` (Hoarfrost) or not.
 */
export function freezeLineV7(capabilities: {
  readonly longFreeze: boolean;
}): number {
  return capabilities.longFreeze ? LONG_FREEZE_LINE_V7 : FREEZE_LINE_V7;
}

/**
 * The border freeze (`pulp_wars-5ti.31`; the user, 2026-10-24: "when doing
 * land grant and city boundaries expand any water within city boundaries
 * (including water within the original boundaries) should get covered with
 * ice IF you have the relevant technology"). When the borders of an Ice
 * Folk city grow (a Land Grant, a village captured into a city, a city
 * captured), and when its owner researches a technology that widens what
 * it freezes (Rime, Pack Ice), every tile of that city's territory is put
 * through the Freeze rule of one tile (`freezeTakeV7`, redesign section
 * 2.4) with the seat's own `freezeWater`: open water with no unit (an own
 * dock too) is made ice, another player's ice is taken, own cracked ice is
 * mended, and own sound ice, unexplored tiles, deep water without Pack Ice,
 * and a tile holding any unit afloat are left (no unit acts, so nobody is
 * Frozen). No line, no ring and no stopping: every tile is read on its own.
 * `cityIds` null: every city of `actor`. A seat without Rime (every seat of
 * another faction) freezes nothing. Every caller recomputes the live
 * economy after it (a dock made ice is an Ice Harbour, whose blockade rule
 * differs).
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
  const none: FreezeSetV7 = { tiles: [], mended: [], taken: [], units: [] };
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player === undefined || player.status === "ELIMINATED")
    return { ice: state.ice, frozen: none };
  const capabilities = technologyCapabilitiesV7(
    player.researchedTechs,
    player.faction,
  );
  if (capabilities.freezeWater === "NONE")
    return { ice: state.ice, frozen: none };
  const own = new Set(
    state.cities
      .filter(
        (city) =>
          city.ownerId === actor && (cityIds === null || cityIds.has(city.id)),
      )
      .map((city) => city.id),
  );
  if (own.size === 0) return { ice: state.ice, frozen: none };
  const explored = new Set(player.explored.map((at) => iceTileKeyV7(at)));
  const occupied = new Map(
    state.units
      .filter((candidate) => candidate.hp > 0)
      .map((candidate) => [iceTileKeyV7(candidate.at), candidate] as const),
  );
  const tiles: CoordV7[] = [];
  const mended: CoordV7[] = [];
  const taken: CoordV7[] = [];
  for (const tile of state.board.tiles) {
    if (tile.territoryCityId === null || !own.has(tile.territoryCityId))
      continue;
    if (tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER")
      continue;
    const occupant = occupied.get(iceTileKeyV7(tile.at));
    const entry = iceAtV7(state, tile.at);
    const facts: FreezeTileFactsV7 = {
      explored: explored.has(iceTileKeyV7(tile.at)),
      terrain: tile.terrain,
      ice:
        entry === undefined
          ? null
          : { own: entry.ownerId === actor, cracked: entry.cracked },
      // The border freeze Freezes no unit: no unit acted.
      unit:
        occupant === undefined
          ? null
          : { id: occupant.id, form: occupant.form, freezable: false },
    };
    const result = freezeTakeV7(facts, capabilities.freezeWater);
    if (result === "NO" || result === "PASS" || result === "FREEZE_UNIT")
      continue;
    const at = { x: tile.at.x, y: tile.at.y };
    tiles.push(at);
    if (result === "MEND") mended.push(at);
    if (result === "TAKE") taken.push(at);
  }
  if (tiles.length === 0) return { ice: state.ice, frozen: none };
  const frozen: FreezeSetV7 = {
    tiles: tiles.sort(compareCoordsV7),
    mended: mended.sort(compareCoordsV7),
    taken: taken.sort(compareCoordsV7),
    units: [],
  };
  return { ice: withFrozenV7(state.ice, frozen.tiles, actor), frozen };
}

/**
 * The `WATER_FROZEN` of a border freeze (`territoryFreezeV7`): no unit
 * froze the water (`unitId` null), or nothing when no tile changed.
 */
export function territoryFrozenEventsV7(
  actor: PlayerId,
  frozen: FreezeSetV7,
): readonly DomainEventV7[] {
  if (frozen.tiles.length === 0) return [];
  return [
    {
      kind: "WATER_FROZEN",
      playerId: actor,
      unitId: null,
      tiles: frozen.tiles,
    },
  ];
}

/** The ice list with `tiles` frozen for `ownerId` (sound), sorted by (y, x). */
export function withFrozenV7(
  ice: readonly IceTileV7[],
  tiles: readonly CoordV7[],
  ownerId: PlayerId,
): readonly IceTileV7[] {
  if (tiles.length === 0) return ice;
  const keys = new Set(tiles.map((at) => iceTileKeyV7(at)));
  return [
    ...ice.filter((entry) => !keys.has(iceTileKeyV7(entry.at))),
    ...tiles.map((at) => ({
      at: { x: at.x, y: at.y },
      ownerId,
      cracked: false,
    })),
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

/**
 * The frozen sea redesign (section 2.9): what a Crack Ice does to an ice
 * entry: thick ice (its owner has Glacier, `thick`) that is not cracked
 * becomes cracked; any other ice breaks (the entry goes).
 */
export function crackIceResultV7(
  entry: { readonly cracked: boolean },
  thick: boolean,
): { readonly broken: boolean } {
  return { broken: !thick || entry.cracked };
}

/**
 * The frozen sea redesign (section 2.8): Black Ice on entry. After the
 * accepted `MOVE`, `DISEMBARK` landing, or `BEAM_DOWN` of `unitId` (the
 * passenger for a Beam Down), whose tile before the command was `from`: a
 * land-form unit that now stands on the ice of a seat with Black Ice,
 * having started off that seat's ice, and that the seat can freeze, is
 * Frozen at once. One `UNITS_FROZEN` (source `BLACK_ICE`, no source unit)
 * of the ice's owner, or nothing.
 */
export function resolveBlackIceOnEntryV7(
  state: GameStateV7,
  unitId: UnitId,
  from: CoordV7 | null,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (state.ice.length === 0) return { state, events: [] };
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined || unit.form !== "LAND") return { state, events: [] };
  const entry = iceAtV7(state, unit.at);
  if (entry === undefined) return { state, events: [] };
  const before = from === null ? undefined : iceAtV7(state, from);
  // A Move along the seat's own ice freezes nobody (the old ice list is
  // the new one: a Move never changes ice).
  if (before !== undefined && before.ownerId === entry.ownerId)
    return { state, events: [] };
  const owner = state.players.find((player) => player.id === entry.ownerId);
  if (
    owner === undefined ||
    owner.status === "ELIMINATED" ||
    !technologyCapabilitiesV7(owner.researchedTechs, owner.faction).blackIce ||
    !canBeFrozenV7(state, owner.id, unit)
  )
    return { state, events: [] };
  const applied = withFrozenAppliedV7(state, state.frozen, [unit.id]);
  return {
    state: { ...state, frozen: applied.frozen },
    events: [unitsFrozenEventV7(owner.id, null, "BLACK_ICE", applied.results)],
  };
}

/**
 * The frozen sea redesign (section 2.3): the elimination release. The ice of
 * the eliminated `ownerId` stays, but an eliminated owner has no thick ice,
 * so its cracks are gone (the next Crack breaks the tile). Since
 * `pulp_wars-s55m.1` no unit afloat is ever on ice, so nothing floats free.
 */
export function releaseEliminatedIceV7(
  ice: readonly IceTileV7[],
  ownerId: PlayerId,
): readonly IceTileV7[] {
  if (!ice.some((entry) => entry.ownerId === ownerId && entry.cracked))
    return ice;
  return ice.map((entry) =>
    entry.ownerId === ownerId && entry.cracked
      ? { ...entry, cracked: false }
      : entry,
  );
}
