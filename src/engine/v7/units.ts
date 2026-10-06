import type { PlayerId, UnitId } from "../model/ids";
import type { CoordV7 } from "./types";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 5.2): the
 * one accessor of the unit lists. `units` keeps its meaning, the units that
 * stand on the board; a burrowed Steam Mole and its rider leave it for the
 * `burrowed` list until their owner's next Start Turn. Every reader of a
 * unit list chooses explicitly between the board ({@link boardUnitsV7}, or a
 * plain `units` read classified `BOARD`) and everything a player owns
 * ({@link allOwnedUnitsV7}); `tests/unit/ruleset-v7-dwarf-unit-readers.test.ts`
 * classifies every reader in `src`.
 */

/** A burrowed unit: its record (at its mound tile) and its Mole. */
export interface BurrowedEntryLikeV7<U> {
  readonly unit: U;
  readonly moleUnitId: UnitId | null;
}

/** Anything with a board unit list and, optionally, a burrowed list. */
export interface UnitListsV7<U> {
  readonly units: readonly U[];
  readonly burrowed?: readonly BurrowedEntryLikeV7<U>[];
}

/** What stands on the board (canonical state or a view). */
export function boardUnitsV7<U>(input: UnitListsV7<U>): readonly U[] {
  return input.units;
}

/**
 * Everything a player owns: the board units and the burrowed records (in a
 * view, the mounds the viewer has explored, which include every own mound).
 * With `ownerId` only that player's units, in unit-ID order.
 */
export function allOwnedUnitsV7<
  U extends { readonly id: UnitId; readonly ownerId: PlayerId },
>(input: UnitListsV7<U>, ownerId?: PlayerId): readonly U[] {
  const burrowed = input.burrowed ?? [];
  const all =
    burrowed.length === 0
      ? input.units
      : [...input.units, ...burrowed.map((entry) => entry.unit)].sort(
          (left, right) => left.id - right.id,
        );
  return ownerId === undefined
    ? all
    : all.filter((unit) => unit.ownerId === ownerId);
}

/** The burrowed entry whose mound is on `at`, if any. */
export function moundAtV7<U extends { readonly at: CoordV7 }>(
  input: UnitListsV7<U>,
  at: CoordV7,
): BurrowedEntryLikeV7<U> | undefined {
  const burrowed = input.burrowed;
  if (burrowed === undefined || burrowed.length === 0) return undefined;
  return burrowed.find(
    (entry) => entry.unit.at.x === at.x && entry.unit.at.y === at.y,
  );
}

/**
 * THE occupancy predicate (section 5.3): a unit stands on `at` or a mound
 * is on it. Every rule that places a unit on a tile, or ends a unit's step
 * there, asks it (the end of a Move, an advance, Push, the Charge! push,
 * the Tractor Beam, Knockback, Beam Down, landing, rewards and displacement,
 * treasure units, Raise Dead, Eggs, Assemble, and the tunnel and bombing-run
 * destinations). `exceptUnitId` ignores one unit (the unit being moved).
 */
export function tileOccupiedV7<
  U extends {
    readonly id: UnitId;
    readonly at: CoordV7;
    readonly hp: number;
  },
>(input: UnitListsV7<U>, at: CoordV7, exceptUnitId?: UnitId): boolean {
  return (
    input.units.some(
      (unit) =>
        unit.id !== exceptUnitId &&
        unit.hp > 0 &&
        unit.at.x === at.x &&
        unit.at.y === at.y,
    ) || moundAtV7(input, at) !== undefined
  );
}

/** Whether `unitId` is burrowed (canonical state or a view). */
export function isBurrowedV7(
  input: {
    readonly burrowed?: readonly BurrowedEntryLikeV7<{ readonly id: UnitId }>[];
  },
  unitId: UnitId,
): boolean {
  const burrowed = input.burrowed;
  return (
    burrowed !== undefined &&
    burrowed.length > 0 &&
    burrowed.some((entry) => entry.unit.id === unitId)
  );
}

/**
 * Tuning 3 (`pulp_wars-w49.3`): whether a visible unit has the Forest or
 * Mountain cover now, from its public Defense breakdown (the cover is a
 * modifier there exactly when it applies). Forest cover needs the owner's
 * Forestry, and another seat's technologies are private, so the public
 * combat preview, the public Wail, and the Normal AI read it here.
 */
export function publicUnitHasTerrainCoverV7(
  view: {
    readonly unitStats: readonly {
      readonly unitId: UnitId;
      readonly stats: readonly {
        readonly id: string;
        readonly modifiers: readonly { readonly source: string }[];
      }[];
    }[];
  },
  unitId: UnitId,
): boolean {
  return (
    view.unitStats
      .find((stats) => stats.unitId === unitId)
      ?.stats.find((stat) => stat.id === "DEFENSE")
      ?.modifiers.some(
        (modifier) =>
          modifier.source === "FOREST" || modifier.source === "MOUNTAIN",
      ) === true
  );
}
