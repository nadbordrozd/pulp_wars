import type { UnitId } from "../model/ids";
import { RAISE_DEAD_RADIUS_V7, gravesEnabledV7 } from "../rules/ruleset-v7";
import { unitIsConstructV7 } from "./afflictions";
import { deathLeavesCrumbsV7 } from "./candy";
import type { DomainEventV7 } from "./events";
import { compareCoordsV7, sameCoordV7 } from "./schema";
import { tileAtV7 } from "./spatial-economy";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";

/**
 * Revision 13 combat death causes that may leave a Grave (section 5.1), plus
 * the revision-14 Plague death and the revision-17 Kaboom and explosion
 * deaths.
 */
export type GraveDeathCauseV7 =
  | "ATTACK"
  | "RETALIATION"
  | "SPLASH"
  | "WAIL"
  | "PLAGUE"
  | "KABOOM"
  | "EXPLOSION"
  // The Dwarf revision: a bomb and an eruption (section 5.4, 6.3).
  | "BOMB"
  | "ERUPTION"
  // The Candy revision: an eater killed by Peppermint Surprise (section 6.3).
  | "PEPPERMINT"
  // The giants' signatures (RULESET_7_GIANTS.md section 6.0, G5): a crush
  // or collision, a Thunder Stomp, and a trample, each like a splash.
  | "CRUSH"
  | "STOMP"
  | "TRAMPLE"
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Mammoth's Stampede.
  | "STAMPEDE";

/**
 * The canonical state a Grave decision reads. The Dwarf revision: with the
 * players, a construct's death leaves no Grave (section 7.2). The Candy
 * revision: with the players (and the curiosities), a Candy seat's unit
 * leaves Crumbs (docs/product/RULESET_7_CANDY.md section 6.1).
 */
export type GraveContextV7 = Pick<
  GameStateV7,
  "setup" | "board" | "treasureChests"
> &
  Partial<Pick<GameStateV7, "players" | "mindControlled" | "curiosities">>;

/**
 * The facts of a dead unit a Grave decision reads (the Mind Control
 * revision: its ID resolves its kind).
 */
export type GraveUnitV7 = Pick<UnitStateV7, "form" | "at"> &
  Partial<Pick<UnitStateV7, "id" | "ownerId" | "role">>;

/**
 * Whether the death of `unit` on its tile creates a Grave, given the Graves
 * already on the board. The caller guarantees the death is a qualifying
 * combat death (see {@link GraveDeathCauseV7}) that Infect did not convert.
 */
export function deathCreatesGraveV7(
  context: GraveContextV7,
  graves: readonly CoordV7[],
  unit: GraveUnitV7,
): boolean {
  if (!gravesEnabledV7(context.setup) || unit.form !== "LAND") return false;
  // The Dwarf revision section 7.2: a construct leaves no Grave.
  if (
    context.players !== undefined &&
    unit.id !== undefined &&
    unit.ownerId !== undefined &&
    unit.role !== undefined &&
    unitIsConstructV7(
      {
        players: context.players,
        mindControlled: context.mindControlled ?? [],
      },
      { id: unit.id, ownerId: unit.ownerId, role: unit.role },
    )
  )
    return false;
  const tile = tileAtV7(context.board, unit.at);
  // The Rift (RULESET_7_RIFT.md section 4): no Grave lies on a Rift.
  return (
    tile !== undefined &&
    tile.biome !== null &&
    tile.terrain !== "RIFT" &&
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
 * Revision 13 Raise Dead eligibility (section 6.2): every Grave within
 * `RAISE_DEAD_RADIUS_V7` of `at` (the Undead pass, correction: 2 tiles; the
 * eight adjacent cells before) with no living unit of any owner on it, in
 * the (y, x) order of the Grave list. There is no cap and no terrain or
 * territory filter. The public query passes the viewer's Graves (those on
 * explored tiles) and units; the reducer passes the Graves on the tiles
 * the raiser's owner has explored, so both agree exactly.
 */
export function raiseDeadGravesV7(
  graves: readonly CoordV7[],
  units: readonly Pick<UnitStateV7, "at" | "hp">[],
  at: CoordV7,
): readonly CoordV7[] {
  return graves.filter(
    (grave) =>
      Math.max(Math.abs(grave.x - at.x), Math.abs(grave.y - at.y)) <=
        RAISE_DEAD_RADIUS_V7 &&
      !sameCoordV7(grave, at) &&
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
  unit: GraveUnitV7 & { readonly id: UnitId },
  cause: GraveDeathCauseV7,
  events: DomainEventV7[],
): readonly CoordV7[] {
  events.push({ kind: "UNIT_DIED", unitId: unit.id, cause });
  const grave = deathCreatesGraveV7(context, graves, unit);
  if (grave)
    events.push({ kind: "GRAVE_CREATED", at: { x: unit.at.x, y: unit.at.y } });
  recordCrumbsV7(context, unit, cause, events);
  return grave ? withGraveV7(graves, unit.at) : graves;
}

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 6.1): appends
 * the `CRUMBS_LEFT` of a death that did not rise, right after its
 * `UNIT_DIED` and `GRAVE_CREATED`, when it leaves Crumbs. The reducer folds
 * the `CRUMBS_LEFT` events of an accepted command into `crumbs` in their
 * order (`withCrumbsLeftV7`), so several deaths leave their Crumbs in the
 * order of their deaths. `recordCombatDeathV7` calls it; a Shatter death,
 * which records no Grave, calls it directly.
 */
export function recordCrumbsV7(
  context: GraveContextV7,
  unit: GraveUnitV7,
  cause: GraveDeathCauseV7 | "SHATTER",
  events: DomainEventV7[],
): void {
  if (
    unit.ownerId === undefined ||
    unit.role === undefined ||
    !deathLeavesCrumbsV7(context, unit, cause)
  )
    return;
  events.push({
    kind: "CRUMBS_LEFT",
    playerId: unit.ownerId,
    at: { x: unit.at.x, y: unit.at.y },
    role: unit.role,
  });
}
