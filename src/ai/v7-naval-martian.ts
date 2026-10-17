import {
  isIceAtV7,
  technologyCapabilitiesV7,
  unitCapabilitiesV7,
  unitMovementModeV7,
} from "../engine/rules/ruleset-v7";
import type { CoordV7, TechnologyIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Themed naval branches, the Martian Hover Fleet (`pulp_wars-5ti.19`,
 * docs/product/RULESET_7_NAVAL_FACTIONS.md section 6.6): the Normal AI's use
 * of Hover Pods beyond `src/ai/v7.ts`'s naval plan.
 *
 * - **Hover launches.** For a seat with Hover Pods every explored Shallow
 *   Water tile beside its home land (a landmass with an own city), free,
 *   not ice and not a dock, is a launch start of the naval plan, as an own
 *   Port is (`hoverLaunchTilesV7`): the water routes and the landing coast
 *   are computed from those starts too, and a foot unit bound overseas
 *   walks to the nearest launch tile that serves the landing coast instead
 *   of a Port. The Move onto the water is the engine's offered Move
 *   (`hoverLaunchMoveV7` recognises it), so the plan only scores it, and
 *   every boarding rule (the wave, the hold, the escort rule
 *   `navalTransportMoveRejectedV7`) applies to it as to boarding at a Port.
 * - **Research.** Hover Pods (the Martian `SEAMANSHIP`) is the naval plan's
 *   next technology once the plan is active and two or more own foot units
 *   are bound overseas (`hoverPodsResearchDueV7`), with or without a
 *   warship.
 * - **Shields at sea.** Every exchange is read from the exact previews,
 *   which count both Shields; the threat estimate already takes the
 *   Shield the defender has during the enemy turn off the damage it
 *   expects (`enemyTurnShieldV7`), for a ship as for a land unit.
 *
 * Every function reads only the viewer's public view.
 */

/** The foot units bound overseas from which Hover Pods is worth its price. */
export const HOVER_PODS_OVERSEAS_UNITS_V7 = 2;

/** The research a seat's tree is asked about for its Hover Pods. */
const HOVER_PODS_TECHS_V7: readonly TechnologyIdV7[] = Object.freeze([
  "SHORECRAFT",
  "SEAMANSHIP",
]);

/** Whether the viewer's tree grants Hover Pods (the Martian Seamanship). */
export function hoverPodsTreeV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(HOVER_PODS_TECHS_V7, view.viewer.faction)
    .hoverPods;
}

/** Whether the viewer has Hover Pods now. */
export function hoverPodsResearchedV7(view: PlayerViewV7): boolean {
  return technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).hoverPods;
}

/**
 * Whether the own land-form `unit` launches from the shore under the
 * viewer's research: a foot unit (`GROUND` movement) whose kind's
 * capabilities under the viewer have `hoverPods`.
 */
export function hoverLauncherV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.ownerId === view.viewer.id &&
    unit.form === "LAND" &&
    unitMovementModeV7(view, unit) === "GROUND" &&
    unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).hoverPods
  );
}

/**
 * Whether an offered Move of the own `unit` to `to` is a hover launch: the
 * unit launches from the shore and `to` is explored Shallow Water that is
 * neither ice nor a dock (a Move onto an own dock embarks there as ever).
 */
export function hoverLaunchMoveV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (!hoverLauncherV7(view, unit)) return false;
  const tile = view.board.tiles[to.y * view.board.width + to.x];
  return (
    tile !== undefined &&
    tile.explored &&
    tile.at.x === to.x &&
    tile.at.y === to.y &&
    tile.terrain === "SHALLOW_WATER" &&
    tile.improvement !== "PORT" &&
    tile.improvement !== "SHIPYARD" &&
    !isIceAtV7(view, to)
  );
}

/**
 * The launch tiles of a seat with Hover Pods, oldest-row first: every
 * explored Shallow Water tile beside an explored land tile of its home land
 * (`home`), with no visible unit on it, no ice, and no dock. Empty for a
 * seat without Hover Pods.
 */
export function hoverLaunchTilesV7(
  view: PlayerViewV7,
  home: (at: CoordV7) => boolean,
): readonly CoordV7[] {
  if (!hoverPodsResearchedV7(view)) return [];
  const occupied = new Set(
    view.units
      .filter((unit) => unit.hp > 0)
      .map((unit) => `${String(unit.at.x)},${String(unit.at.y)}`),
  );
  const width = view.board.width;
  const height = view.board.height;
  const tiles: CoordV7[] = [];
  for (const tile of view.board.tiles) {
    if (
      !tile.explored ||
      tile.terrain !== "SHALLOW_WATER" ||
      tile.improvement === "PORT" ||
      tile.improvement === "SHIPYARD" ||
      occupied.has(`${String(tile.at.x)},${String(tile.at.y)}`) ||
      isIceAtV7(view, tile.at)
    )
      continue;
    let beach = false;
    for (let dy = -1; dy <= 1 && !beach; dy += 1)
      for (let dx = -1; dx <= 1 && !beach; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const at = { x: tile.at.x + dx, y: tile.at.y + dy };
        if (at.x < 0 || at.y < 0 || at.x >= width || at.y >= height) continue;
        const near = view.board.tiles[at.y * width + at.x];
        beach =
          near !== undefined &&
          near.explored &&
          near.biome !== null &&
          !isIceAtV7(view, at) &&
          home(at);
      }
    if (beach) tiles.push(tile.at);
  }
  return tiles.sort((left, right) => left.y - right.y || left.x - right.x);
}

/**
 * Section 6.6, "Research": Hover Pods is due for a seat whose tree grants
 * it, that has not researched it and is offered it, while the naval plan is
 * active and at least `HOVER_PODS_OVERSEAS_UNITS_V7` own foot units are
 * bound overseas (`overseasFootUnits`), whether or not it has a warship.
 */
export function hoverPodsResearchDueV7(
  view: PlayerViewV7,
  planActive: boolean,
  overseasFootUnits: number,
  offered: (tech: TechnologyIdV7) => boolean,
): boolean {
  return (
    planActive &&
    hoverPodsTreeV7(view) &&
    !hoverPodsResearchedV7(view) &&
    overseasFootUnits >= HOVER_PODS_OVERSEAS_UNITS_V7 &&
    offered("SEAMANSHIP")
  );
}
