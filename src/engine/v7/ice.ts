import type { PlayerId, UnitId } from "../model/ids";
import {
  FREEZE_LINE_V7,
  ICE_CRUSH_DAMAGE_V7,
  WITCH_FREEZE_RADIUS_V7,
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
import { tileAtV7 } from "./spatial-economy";
import {
  isAfloatFormV7,
  type CoordV7,
  type GameStateV7,
  type IceTileV7,
  type UnitFormV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";

/**
 * The naval branch, engine step II: the frozen sea of the Ice Folk
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8). Ice is a stored layer
 * over water tiles (`GameStateV7.ice`): ground for every land-form unit,
 * never entered by a unit afloat. This module holds the ice reads every rule
 * shares (`iceAtV7`, with `unitIsIceboundV7` in the registry), the
 * Freeze set, and the Start and End Turn steps (Black Ice, the crush, the
 * thaw). The list changes in the middle of a turn (a Freeze), so nothing
 * here is cached across commands. Every helper returns the neutral answer
 * in a match without an Ice Folk seat, whose list is always empty.
 */

/** The ice entry on `at`, if any (section 8.3 `iceAtV7`). */
export function iceAtV7<T extends { readonly at: CoordV7 }>(
  lookup: { readonly ice: readonly T[] },
  at: CoordV7,
): T | undefined {
  const ice = lookup.ice;
  if (ice.length === 0) return undefined;
  return ice.find((entry) => entry.at.x === at.x && entry.at.y === at.y);
}

const NO_ICE_V7: ReadonlySet<number> = new Set<number>();

/** The board indices (`y * width + x`) of the ice tiles of a lookup. */
export function iceIndexSetV7(
  lookup: IceLookupV7,
  width: number,
): ReadonlySet<number> {
  if (lookup.ice.length === 0) return NO_ICE_V7;
  return new Set(lookup.ice.map((entry) => entry.at.y * width + entry.at.x));
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

/** What a Freeze reads of one tile (canonical state or the actor's view). */
export interface FreezeTileFactsV7 {
  /** Explored by the actor. */
  readonly explored: boolean;
  readonly terrain: string;
  readonly improvement: string | null;
  readonly ice: boolean;
  /** The living unit on the tile, if any (visible on an explored tile). */
  readonly unit: {
    readonly id: UnitId;
    readonly form: UnitFormV7;
    readonly hostile: boolean;
  } | null;
}

/** The result of the freeze set (section 8.4), shared with the preview. */
export interface FreezeSetV7 {
  /** Every tile that gets an entry, in (y, x) order. */
  readonly tiles: readonly CoordV7[];
  /** The tiles of `tiles` that were already ice, in (y, x) order. */
  readonly refreshed: readonly CoordV7[];
  /** The afloat units newly locked in the ice, in unit-ID order. */
  readonly icebound: readonly UnitId[];
}

/**
 * Section 8.4: whether a Freeze takes the tile, and whether it locks the
 * unit on it in the ice. A tile is freezable when it is explored by the
 * actor, water, not a dock, Shallow Water or (with `DEEP`) Deep Water, and
 * one of: it holds no unit; it is already ice (whoever stands on it); or,
 * with `icebound`, it holds a hostile afloat unit, which becomes icebound.
 */
function freezableV7(
  tile: FreezeTileFactsV7 | undefined,
  freezeWater: "NONE" | "SHALLOW" | "DEEP",
  icebound: boolean,
): { readonly freezable: boolean; readonly locks: boolean } {
  const no = { freezable: false, locks: false };
  if (tile === undefined || !tile.explored || freezeWater === "NONE") return no;
  if (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") return no;
  if (
    tile.terrain !== "SHALLOW_WATER" &&
    !(tile.terrain === "DEEP_WATER" && freezeWater === "DEEP")
  )
    return no;
  if (tile.ice || tile.unit === null) return { freezable: true, locks: false };
  return icebound && tile.unit.hostile && isAfloatFormV7(tile.unit.form)
    ? { freezable: true, locks: true }
    : no;
}

/**
 * Section 8.4 the freeze set of a Freeze by a unit on `from` aimed at `at`.
 * `ring` (the Ice Witch): every freezable tile within Chebyshev
 * `WITCH_FREEZE_RADIUS_V7` of her. Otherwise a line of `FREEZE_LINE_V7`
 * tiles from `at` in the direction from the unit to `at`: it takes `at` if
 * it is freezable, then the next tile if it is freezable and the tile before
 * it did not hold a ship; it never skips a tile.
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
  const refreshed: CoordV7[] = [];
  const icebound: UnitId[] = [];
  const take = (at: CoordV7): "TAKEN" | "SHIP" | "NOT_FREEZABLE" => {
    const tile = input.tileAt(at);
    const result = freezableV7(tile, input.freezeWater, input.icebound);
    if (!result.freezable || tile === undefined) return "NOT_FREEZABLE";
    tiles.push({ x: at.x, y: at.y });
    if (tile.ice) refreshed.push({ x: at.x, y: at.y });
    if (result.locks && tile.unit !== null) icebound.push(tile.unit.id);
    return tile.unit !== null && isAfloatFormV7(tile.unit.form)
      ? "SHIP"
      : "TAKEN";
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
      if (take(current) !== "TAKEN") break;
      current = { x: current.x + dx, y: current.y + dy };
    }
  }
  return {
    tiles: tiles.sort(compareCoordsV7),
    refreshed: refreshed.sort(compareCoordsV7),
    icebound: icebound.sort((left, right) => left - right),
  };
}

/** The ice list with `tiles` (re)frozen for `ownerId`, sorted by (y, x). */
export function withFrozenV7(
  ice: readonly IceTileV7[],
  tiles: readonly CoordV7[],
  ownerId: PlayerId,
  turnsLeft: number,
): readonly IceTileV7[] {
  if (tiles.length === 0) return ice;
  return [
    ...ice.filter((entry) => !tiles.some((at) => sameCoordV7(at, entry.at))),
    ...tiles.map((at) => ({ at: { x: at.x, y: at.y }, ownerId, turnsLeft })),
  ].sort((left, right) => compareCoordsV7(left.at, right.at));
}

/**
 * Section 8.5: whether the ice tile is in its owner's territory (it never
 * counts down there; the view's `permanent`). An eliminated owner has none.
 */
export function iceIsPermanentV7(
  state: Pick<GameStateV7, "board" | "cities" | "players">,
  entry: IceTileV7,
): boolean {
  const tile = tileAtV7(state.board, entry.at);
  if (tile === undefined || tile.territoryCityId === null) return false;
  const owner = state.players.find((player) => player.id === entry.ownerId);
  if (owner === undefined || owner.status === "ELIMINATED") return false;
  return (
    state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId ===
    entry.ownerId
  );
}

/**
 * Section 8.5 the thaw at the End Turn of `playerId`, after the Frozen
 * countdown: every entry owned by that player, or by an eliminated player,
 * outside its owner's territory loses one turn (never below 0); then each of
 * those entries at 0 with no land-form unit on its tile melts. An icebound
 * unit on a melted tile floats free. One `ICE_MELTED`, dropped when empty.
 */
export function resolveThawV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (state.ice.length === 0) return { state, events: [] };
  const eliminated = new Set(
    state.players
      .filter((player) => player.status === "ELIMINATED")
      .map((player) => player.id),
  );
  const melted: CoordV7[] = [];
  const freed: UnitId[] = [];
  let changed = false;
  const ice = state.ice.flatMap((entry): IceTileV7[] => {
    if (entry.ownerId !== playerId && !eliminated.has(entry.ownerId))
      return [entry];
    const turnsLeft = iceIsPermanentV7(state, entry)
      ? entry.turnsLeft
      : Math.max(0, entry.turnsLeft - 1);
    const occupants = state.units.filter(
      (unit) => unit.hp > 0 && sameCoordV7(unit.at, entry.at),
    );
    // A land-form unit (of any owner) holds the ice; a unit afloat does not.
    // An entry in its owner's territory never melts, whatever its count.
    if (
      turnsLeft === 0 &&
      !iceIsPermanentV7(state, entry) &&
      !occupants.some((unit) => !isAfloatFormV7(unit.form))
    ) {
      changed = true;
      melted.push(entry.at);
      for (const unit of occupants) freed.push(unit.id);
      return [];
    }
    if (turnsLeft === entry.turnsLeft) return [entry];
    changed = true;
    return [{ ...entry, turnsLeft }];
  });
  if (!changed) return { state, events: [] };
  return {
    state: { ...state, ice },
    events:
      melted.length === 0
        ? []
        : [
            {
              kind: "ICE_MELTED",
              tiles: [...melted].sort(compareCoordsV7),
              freed: [...freed].sort((left, right) => left - right),
            },
          ],
  };
}

/**
 * Section 8.8 Black Ice at the Start Turn of `playerId`: with the seat
 * capability `blackIce`, every land-form unit hostile to that player
 * standing on that player's ice is Frozen (Ice Folk Freeze,
 * `pulp_wars-w49.37`). One `UNITS_FROZEN` (source `BLACK_ICE`, no source
 * unit), dropped when empty.
 */
export function resolveBlackIceV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (state.ice.length === 0) return { state, events: [] };
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (
    player === undefined ||
    !technologyCapabilitiesV7(player.researchedTechs, player.faction).blackIce
  )
    return { state, events: [] };
  const own = state.ice.filter((entry) => entry.ownerId === playerId);
  const targets = state.units
    .filter(
      (unit) =>
        own.some((entry) => sameCoordV7(entry.at, unit.at)) &&
        canBeFrozenV7(state, playerId, unit),
    )
    .map((unit) => unit.id);
  if (targets.length === 0) return { state, events: [] };
  const applied = withFrozenAppliedV7(state, state.frozen, targets);
  return {
    state: { ...state, frozen: applied.frozen },
    events: [unitsFrozenEventV7(playerId, null, "BLACK_ICE", applied.results)],
  };
}

/**
 * Section 8.9 the crush at the Start Turn of `playerId`, right after Black
 * Ice: every icebound unit on that player's ice takes
 * `ICE_CRUSH_DAMAGE_V7`, in unit-ID order: fixed damage (no cover, Defense,
 * or HP ratio), from its Shield first, capped at its HP. The dead leave the
 * board with `UNIT_DIED` cause `CRUSHED` (no credit, no Grave: a death
 * afloat). The caller resolves what a death starts (a Brain's collapse, an
 * embarked exploding unit's blast) and recomputes the live economy;
 * `dead` lists the victims as they stood before the crush, in unit-ID order.
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
  const own = state.ice.filter((entry) => entry.ownerId === playerId);
  const victims = state.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        isAfloatFormV7(unit.form) &&
        own.some((entry) => sameCoordV7(entry.at, unit.at)),
    )
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
