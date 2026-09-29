import type { UnitId } from "../model/ids";
import { gravesEnabledV7 } from "../rules/ruleset-v7";
import type { DomainEventV7 } from "./events";
import { compareCoordsV7, sameCoordV7 } from "./schema";
import { tileAtV7 } from "./spatial-economy";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";

/**
 * Revision 13 combat death causes that may leave a Grave (section 5.1).
 */
export type GraveDeathCauseV7 = "ATTACK" | "RETALIATION" | "SPLASH" | "WAIL";

/** The canonical state a Grave decision reads. */
export type GraveContextV7 = Pick<
  GameStateV7,
  "setup" | "board" | "treasureChests"
>;

/**
 * Whether the death of `unit` on its tile creates a Grave, given the Graves
 * already on the board. The caller guarantees the death is a qualifying
 * combat death (see {@link GraveDeathCauseV7}) that Infect did not convert.
 */
export function deathCreatesGraveV7(
  context: GraveContextV7,
  graves: readonly CoordV7[],
  unit: Pick<UnitStateV7, "form" | "at">,
): boolean {
  if (!gravesEnabledV7(context.setup) || unit.form !== "LAND") return false;
  const tile = tileAtV7(context.board, unit.at);
  return (
    tile !== undefined &&
    tile.biome !== null &&
    tile.site === null &&
    !context.treasureChests.some((chest) => sameCoordV7(chest, unit.at)) &&
    !graves.some((grave) => sameCoordV7(grave, unit.at))
  );
}

/** Inserts `at` into the (y, x)-sorted Grave list; duplicates are ignored. */
export function withGraveV7(
  graves: readonly CoordV7[],
  at: CoordV7,
): readonly CoordV7[] {
  if (graves.some((grave) => sameCoordV7(grave, at))) return graves;
  return [...graves, { x: at.x, y: at.y }].sort(compareCoordsV7);
}

/** Revision 13 Raise Dead rising HP: a Skeleton rises at 5 HP (section 6.2). */
export const RAISE_DEAD_SKELETON_HP_V7 = 5;

/**
 * Revision 13 Raise Dead eligibility (section 6.2): every Grave on the eight
 * cells adjacent to `at` with no living unit of any owner on it, in the
 * (y, x) order of the Grave list. There is no cap and no terrain or territory
 * filter. The public query passes the viewer's Graves and units; a raiser's
 * neighbours are always explored by its owner, so both agree exactly.
 */
export function raiseDeadGravesV7(
  graves: readonly CoordV7[],
  units: readonly Pick<UnitStateV7, "at" | "hp">[],
  at: CoordV7,
): readonly CoordV7[] {
  return graves.filter(
    (grave) =>
      Math.max(Math.abs(grave.x - at.x), Math.abs(grave.y - at.y)) === 1 &&
      !units.some((unit) => unit.hp > 0 && sameCoordV7(unit.at, grave)),
  );
}

/** Removes the given coordinates from a (y, x)-sorted Grave list. */
export function withoutGravesV7(
  graves: readonly CoordV7[],
  removed: readonly CoordV7[],
): readonly CoordV7[] {
  return graves.filter(
    (grave) => !removed.some((item) => sameCoordV7(item, grave)),
  );
}

/**
 * Records one combat death: appends its `UNIT_DIED` event, then its
 * `GRAVE_CREATED` event when a Grave is created, and returns the Grave list
 * after the death. Deaths must be recorded in their resolution order.
 */
export function recordCombatDeathV7(
  context: GraveContextV7,
  graves: readonly CoordV7[],
  unit: Pick<UnitStateV7, "form" | "at"> & { readonly id: UnitId },
  cause: GraveDeathCauseV7,
  events: DomainEventV7[],
): readonly CoordV7[] {
  events.push({ kind: "UNIT_DIED", unitId: unit.id, cause });
  if (!deathCreatesGraveV7(context, graves, unit)) return graves;
  events.push({ kind: "GRAVE_CREATED", at: { x: unit.at.x, y: unit.at.y } });
  return withGraveV7(graves, unit.at);
}
