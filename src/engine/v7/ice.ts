import type { PlayerId, UnitId } from "../model/ids";
import {
  FREEZE_LINE_V7,
  ICE_CRUSH_DAMAGE_V7,
  WITCH_FREEZE_RADIUS_V7,
  iceEntryIndexV7,
  iceTileKeyV7,
  technologyCapabilitiesV7,
  unitFactionV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  factionRulesV7,
  type FactionRosterV7,
  type IceLookupV7,
} from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import {
  canBeFrozenV7,
  unitsFrozenEventV7,
  withFrozenAppliedV7,
} from "./ice-folk";
import { absorbHitV7, shieldOfV7, withShieldDamageV7 } from "./martian";
import { compareCoordsV7, sameCoordV7 } from "./schema";
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
  type UnitStateV7,
} from "./types";

/**
 * The naval branch, engine step II: the frozen sea of the Ice Folk
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8), as redesigned by
 * docs/product/RULESET_7_ICE_REDESIGN.md (`pulp_wars-5ti.25`). Ice is a
 * stored layer over water tiles (`GameStateV7.ice`): ground for every
 * land-form unit, never entered by a unit afloat, and permanent until a
 * Crack Ice breaks it. This module holds the ice reads every rule shares
 * (`iceAtV7`, with `unitIsIceboundV7` in the registry), the Freeze set, the
 * Crack Ice result, building on ice, Black Ice on entry, and the crush. The
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
 * Section 8.6: whether the unit slides on ice: a land-form unit whose role
 * Glides under its kind (every Ice Folk land role but the Sabretooth). A
 * body rule, so a mind-controlled Ice Folk unit slides for its controller.
 */
export function unitSlidesV7(
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
 * The frozen sea redesign (RULESET_7_ICE_REDESIGN.md section 2.7): Runners,
 * whether the unit's slide is not stopped by a hostile zone of control (the
 * Sled, a body rule of its role under its kind).
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
    unitSlidesV7(roster, unit) && unitRoleMechanicsV7(roster, unit).runners
  );
}

/**
 * Section 8.7: whether the unit is of the Ice Folk kind for the slip rule
 * (the `snow` rule of its kind). A unit of any other kind in movement mode
 * `GROUND` ends its Move on entering ice (`terrainStopsMoveV7`).
 */
export function unitKindWalksIceV7(
  roster: FactionRosterV7,
  unit: { readonly id: UnitId; readonly ownerId: PlayerId },
): boolean {
  return factionRulesV7(unitFactionV7(roster, unit)).snow;
}

/**
 * The frozen sea redesign (section 2.9 rows 2): whether the unit may Crack
 * Ice at all: a unit of any kind but the Ice Folk (a body rule of its kind,
 * so a mind-controlled Ice Folk unit never cracks), in land, naval, or
 * embarked form (never an Egg; a burrowed unit is off the board), and not a
 * neutral Monster. Every land and naval role of the other eight factions
 * has it; it is a kind rule, like the slip, not a role-table entry.
 */
export function unitCracksIceV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly form: UnitFormV7;
  },
): boolean {
  return (
    (unit.form === "LAND" ||
      unit.form === "NAVAL" ||
      unit.form === "EMBARKED") &&
    !isNeutralOwnerV7(unit.ownerId) &&
    !unitKindWalksIceV7(roster, unit)
  );
}

/** Section 8.4: whether the role Freezes a ring (the Ice Witch) or a line. */
export function unitFreezesRingV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  // Only the Ice Witch's role has `BLIZZARD` (see `winterV7`).
  return unitRoleRuleV7(roster, unit).abilities.includes("BLIZZARD");
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
  readonly improvement: string | null;
  /** The tile is in the territory of a city of the actor (its owner). */
  readonly ownTerritory: boolean;
  /** The ice on the tile: whether it is the actor's own, and cracked. */
  readonly ice: { readonly own: boolean; readonly cracked: boolean } | null;
  /** The living unit on the tile, if any (visible on an explored tile). */
  readonly unit: {
    readonly id: UnitId;
    readonly form: UnitFormV7;
    readonly hostile: boolean;
    /**
     * Map curiosities round 3, bead B (section 8.6): the unit is neutral.
     * The tile under the Sea Serpent is never freezable.
     */
    readonly neutral: boolean;
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
  /** The afloat units newly locked in the ice, in unit-ID order. */
  readonly icebound: readonly UnitId[];
}

type FreezeTakeV7 = "MAKE" | "LOCK" | "TAKE" | "MEND" | "PASS" | "NO";

/**
 * The frozen sea redesign (section 2.4): what a Freeze does to one tile. A
 * tile is freezable when it is explored by the actor and water (Shallow, or
 * Deep with `DEEP`); a dock that is not the actor's own never freezes.
 * Open water with no unit (the actor's own dock included) is made ice;
 * open water holding a hostile afloat unit, with `icebound`, is made ice
 * and locks it in; another player's ice is taken (any occupant); the
 * actor's own cracked ice is mended (any occupant); the actor's own sound
 * ice is passed over.
 */
function freezeTakeV7(
  tile: FreezeTileFactsV7 | undefined,
  freezeWater: "NONE" | "SHALLOW" | "DEEP",
  icebound: boolean,
): FreezeTakeV7 {
  if (tile === undefined || !tile.explored || freezeWater === "NONE")
    return "NO";
  if (
    tile.terrain !== "SHALLOW_WATER" &&
    !(tile.terrain === "DEEP_WATER" && freezeWater === "DEEP")
  )
    return "NO";
  if (
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    !tile.ownTerritory
  )
    return "NO";
  if (tile.ice !== null)
    return !tile.ice.own ? "TAKE" : tile.ice.cracked ? "MEND" : "PASS";
  if (tile.unit === null) return "MAKE";
  // Map curiosities round 3, bead B (section 8.6): the Sea Serpent's tile is
  // never freezable, so it is never icebound or crushed.
  if (tile.unit.neutral) return "NO";
  return icebound && tile.unit.hostile && isAfloatFormV7(tile.unit.form)
    ? "LOCK"
    : "NO";
}

/**
 * The frozen sea redesign (section 2.4): the freeze set of a Freeze by a
 * unit on `from` aimed at `at`. `ring` (the Ice Witch): every freezable tile
 * within Chebyshev `WITCH_FREEZE_RADIUS_V7` of her, her own tile included.
 * Otherwise a line of `FREEZE_LINE_V7` tiles from `at` in the direction from
 * the unit to `at`: each is taken if freezable; the actor's own sound ice
 * is passed over and the line goes on; any other tile ends the line, and so
 * does a tile that holds a unit afloat. An empty `tiles` means the Freeze
 * changes nothing and is not offered.
 */
export function freezeSetV7(input: {
  readonly from: CoordV7;
  readonly at: CoordV7;
  readonly ring: boolean;
  readonly freezeWater: "NONE" | "SHALLOW" | "DEEP";
  readonly icebound: boolean;
  readonly tileAt: (at: CoordV7) => FreezeTileFactsV7 | undefined;
}): FreezeSetV7 {
  const tiles: CoordV7[] = [];
  const mended: CoordV7[] = [];
  const taken: CoordV7[] = [];
  const icebound: UnitId[] = [];
  const take = (at: CoordV7): "GO" | "STOP" => {
    const tile = input.tileAt(at);
    const result = freezeTakeV7(tile, input.freezeWater, input.icebound);
    if (result === "NO" || tile === undefined) return "STOP";
    if (result !== "PASS") {
      tiles.push({ x: at.x, y: at.y });
      if (result === "MEND") mended.push({ x: at.x, y: at.y });
      if (result === "TAKE") taken.push({ x: at.x, y: at.y });
      if (result === "LOCK" && tile.unit !== null) icebound.push(tile.unit.id);
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
    for (let step = 0; step < FREEZE_LINE_V7; step += 1) {
      if (take(current) !== "GO") break;
      current = { x: current.x + dx, y: current.y + dy };
    }
  }
  return {
    tiles: tiles.sort(compareCoordsV7),
    mended: mended.sort(compareCoordsV7),
    taken: taken.sort(compareCoordsV7),
    icebound: icebound.sort((left, right) => left - right),
  };
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
 * The frozen sea redesign (section 2.3): the elimination release. Every
 * icebound unit on the ice of the eliminated `ownerId` floats free (its
 * tile's entry goes); the rest of that ice stays. One `ICE_MELTED`, or
 * nothing.
 */
export function releaseEliminatedIceV7(
  ice: readonly IceTileV7[],
  units: readonly Pick<UnitStateV7, "id" | "at" | "hp" | "form">[],
  ownerId: PlayerId,
): {
  readonly ice: readonly IceTileV7[];
  readonly events: readonly DomainEventV7[];
} {
  if (ice.length === 0) return { ice, events: [] };
  const melted: CoordV7[] = [];
  const freed: UnitId[] = [];
  for (const entry of ice) {
    if (entry.ownerId !== ownerId) continue;
    const afloat = units.filter(
      (unit) =>
        unit.hp > 0 &&
        isAfloatFormV7(unit.form) &&
        sameCoordV7(unit.at, entry.at),
    );
    if (afloat.length === 0) continue;
    melted.push(entry.at);
    for (const unit of afloat) freed.push(unit.id);
  }
  // An eliminated owner has no thick ice: its cracks are gone with it (the
  // next Crack breaks the tile).
  const sound = ice.some((entry) => entry.ownerId === ownerId && entry.cracked)
    ? ice.map((entry) =>
        entry.ownerId === ownerId && entry.cracked
          ? { ...entry, cracked: false }
          : entry,
      )
    : ice;
  if (melted.length === 0) return { ice: sound, events: [] };
  return {
    ice: withoutIceV7(sound, melted),
    events: [
      {
        kind: "ICE_MELTED",
        tiles: [...melted].sort(compareCoordsV7),
        freed: [...freed].sort((left, right) => left - right),
      },
    ],
  };
}

/**
 * Section 8.9 the crush at the Start Turn of `playerId` (the redesign keeps
 * it; Black Ice no longer runs at the Start Turn): every icebound unit on
 * that player's ice takes `ICE_CRUSH_DAMAGE_V7`, in unit-ID order: fixed
 * damage (no cover, Defense, or HP ratio), from its Shield first, capped at
 * its HP. The dead leave the board with `UNIT_DIED` cause `CRUSHED` (no
 * credit, no Grave: a death afloat). The caller resolves what a death
 * starts (a Brain's collapse, an embarked exploding unit's blast) and
 * recomputes the live economy; `dead` lists the victims as they stood
 * before the crush, in unit-ID order.
 */
export function resolveIceCrushV7(
  state: GameStateV7,
  playerId: PlayerId,
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
  readonly dead: readonly UnitStateV7[];
} {
  if (state.ice.length === 0) return { state, events: [], dead: [] };
  const victims = state.units
    .filter((unit) => {
      if (unit.hp <= 0 || !isAfloatFormV7(unit.form)) return false;
      return iceAtV7(state, unit.at)?.ownerId === playerId;
    })
    .sort((left, right) => left.id - right.id);
  if (victims.length === 0) return { state, events: [], dead: [] };
  const hits = victims.map((unit) => ({
    unit,
    hit: absorbHitV7(
      shieldOfV7(state.shields, unit.id),
      unit.hp,
      ICE_CRUSH_DAMAGE_V7,
    ),
  }));
  const damage = new Map(
    hits.map(({ unit, hit }) => [unit.id, hit.hpDamage] as const),
  );
  const events: DomainEventV7[] = [
    {
      kind: "UNITS_CRUSHED",
      playerId,
      results: hits.map(({ unit, hit }) => ({
        unitId: unit.id,
        damage: hit.hpDamage,
        shieldDamage: hit.shieldDamage,
        hpAfter: unit.hp - hit.hpDamage,
      })),
    },
  ];
  const dead = hits
    .filter(({ unit, hit }) => hit.hpDamage >= unit.hp)
    .map(({ unit }) => unit);
  for (const unit of dead)
    events.push({ kind: "UNIT_DIED", unitId: unit.id, cause: "CRUSHED" });
  return {
    state: {
      ...state,
      units: state.units
        .map((unit) =>
          damage.has(unit.id)
            ? { ...unit, hp: unit.hp - (damage.get(unit.id) ?? 0) }
            : unit,
        )
        .filter((unit) => unit.hp > 0),
      shields: withShieldDamageV7(
        state.shields,
        new Map(hits.map(({ unit, hit }) => [unit.id, hit.shieldDamage])),
      ),
    },
    events,
    dead,
  };
}
