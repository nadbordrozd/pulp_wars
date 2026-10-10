import type { FactionIdV7 } from "../engine/index";
import {
  territoryGroundV7,
  territoryTerrainSubjectV7,
} from "../assets/chibi-art-v7";
import {
  CHIBI_MOUNTAIN_ART_SET_V7,
  CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7,
} from "../assets/chibi-mountain-ranges-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../assets/faction-forest-pieces-manifest";
import { FACTION_GRASS_TILES_V7 } from "../assets/faction-grass-manifest";
import {
  factionForestIdV7,
  factionForestsEnabledV7,
} from "./canvas/faction-forests-v7";
import { factionGrassEnabledV7 } from "./canvas/faction-grass-v7";
import type {
  GalleryTerrainLayerV7,
  GalleryTerrainSwatchV7,
} from "./gallery-terrain-presentation-v7";

/**
 * The picture of a selected Forest or Mountain cell in the tile dock (bead
 * pulp_wars-2yc.41): what the board draws on that cell, not the terrain's
 * old master. The interface showed the single blue-grey mountain on its
 * rocky ground after the board had moved to the massifs (bead
 * pulp_wars-2yc.1), and the default green clump on default Grass for a
 * Forest inside a faction's territory, whatever stood on it (bead
 * pulp_wars-2yc.2).
 *
 * A swatch is the cell alone, as a lone cell of its kind is drawn:
 *
 * - the ground of its territory (the faction's grass tile, the Undead
 *   ground, Snow over either);
 * - a Mountain: a single low mountain of the massif set;
 * - a Mine: the mined mountain of the massif set;
 * - a Forest of a faction with a forest of its own: one single piece of
 *   that faction's set, as a clearing draws it.
 *
 * Every other cell (the default Forest, Grass, water, the Rift) keeps the
 * registered master: the function returns null. The faction looks are the
 * live look's, so the classic look gets the default ground and Forest; the
 * massifs are drawn in both looks.
 */
export interface DockTerrainRequestV7 {
  readonly terrain: string;
  /** A Mine stands on the cell. */
  readonly mined: boolean;
  /** The faction whose territory holds the cell, or null. */
  readonly faction: FactionIdV7 | null;
  /** The cell is under Snow. */
  readonly snow: boolean;
  /** The live look (false: the classic look). */
  readonly live: boolean;
}

/**
 * The rows shown above the cell: a low mountain of the massif set (and the
 * mined one) rises at most 13 px over its cell, a forest piece up to 24.
 */
export const DOCK_MOUNTAIN_RISE_V7 = 13;
export const DOCK_FOREST_RISE_V7 = 24;

const raster = (piece: {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}): GalleryTerrainLayerV7 => ({
  kind: "RASTER",
  url: piece.url,
  width: piece.width,
  height: piece.height,
});

/** The ground the board draws under a Forest or a Mountain of a territory. */
export function dockTerrainGroundV7(
  request: Pick<DockTerrainRequestV7, "faction" | "snow" | "live">,
): readonly GalleryTerrainLayerV7[] {
  const baked =
    request.live && factionGrassEnabledV7()
      ? FACTION_GRASS_TILES_V7.find(
          (entry) => entry.id === request.faction && entry.toned !== true,
        )
      : undefined;
  return [
    baked === undefined
      ? {
          kind: "SUBJECT",
          subject: territoryTerrainSubjectV7(
            "TERRAIN:GRASS",
            territoryGroundV7(request.faction),
          ),
          at: { x: 0, y: 0 },
        }
      : { kind: "RASTER", url: baked.url, width: 80, height: 80 },
    ...(request.snow ? [{ kind: "SNOW", variant: 0 } as const] : []),
  ];
}

export function dockTerrainSwatchV7(
  request: DockTerrainRequestV7,
): GalleryTerrainSwatchV7 | null {
  const cell = (
    id: string,
    piece: GalleryTerrainLayerV7,
    rise: number,
  ): GalleryTerrainSwatchV7 => ({
    id,
    box: { kind: "CELL", rise },
    layers: [...dockTerrainGroundV7(request), piece],
  });
  if (request.terrain === "MOUNTAIN") {
    if (request.mined) {
      const mine = CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7[0];
      const body = mine?.layers?.bodyUrl;
      return mine === undefined || body === undefined
        ? null
        : cell(mine.id, raster({ ...mine, url: body }), DOCK_MOUNTAIN_RISE_V7);
    }
    const single = CHIBI_MOUNTAIN_ART_SET_V7.pieces.find(
      (piece) => piece.columns === 1 && !piece.tall,
    );
    return single === undefined
      ? null
      : cell(single.id, raster(single), DOCK_MOUNTAIN_RISE_V7);
  }
  if (request.terrain !== "FOREST" || request.mined) return null;
  const forest =
    request.live && factionForestsEnabledV7()
      ? factionForestIdV7(request.faction)
      : null;
  if (forest === null) return null;
  const single = FACTION_FOREST_ART_SETS_V7[forest].pieces.find(
    (piece) => piece.shape === "1x1",
  );
  return single === undefined
    ? null
    : cell(single.id, raster(single), DOCK_FOREST_RISE_V7);
}
