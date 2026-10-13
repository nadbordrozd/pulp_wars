import type {
  FactionGrassIdV7,
  FactionGrassTileAssetV7,
} from "../render/canvas/faction-grass-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

const tileUrl = (id: FactionGrassIdV7, variant: number): string =>
  chibiArtUrl(
    `assets/chibi/terrain/faction-grass/chibi-${id.toLowerCase()}-grass-${variant + 1}.png`,
  );

/**
 * EXPERIMENT: faction grass (bead pulp_wars-2o7.4, docs/art/FACTION_GRASS.md).
 * The grounds of each faction's territory, baked by
 * scripts/art/faction-grass.ts in their final colours and drawn as they
 * are. There are three kinds.
 *
 * - **Textured** (docs/art/TEXTURED_GROUNDS.md): one periodic texture of
 *   `columns` x `rows` board cells, sampled by a cell's place on the map.
 * - **Tiles composed from PixelLab fields** (bead pulp_wars-2yc.48): six
 *   tiles, picked by a hash of the cell.
 * - **Tiles recoloured from the Grass masters**: three.
 */
export const FACTION_GRASS_WORLDS_V7: Partial<
  Readonly<
    Record<
      FactionGrassIdV7,
      { readonly columns: number; readonly rows: number }
    >
  >
> = {
  // Bare ground with few rocks: a longer period, so a boulder does not
  // come back as a lattice on a large territory.
  MARTIAN: { columns: 8, rows: 8 },
  DWARF: { columns: 6, rows: 6 },
};

/** How many tiles a ground of tiles has. A textured ground has none. */
export const FACTION_GRASS_TILE_COUNTS_V7: Readonly<
  Record<FactionGrassIdV7, number>
> = {
  CANDY: 6,
  GOBLIN: 6,
  MARTIAN: 0,
  DINOSAUR: 3,
  DWARF: 0,
  UNDEAD: 6,
  CULT: 6,
};

export const FACTION_GRASS_TILES_V7: readonly FactionGrassTileAssetV7[] = (
  Object.entries(FACTION_GRASS_TILE_COUNTS_V7) as [FactionGrassIdV7, number][]
).flatMap(([id, count]): FactionGrassTileAssetV7[] => {
  const world = FACTION_GRASS_WORLDS_V7[id];
  if (world !== undefined)
    return [
      {
        id,
        variant: 0,
        url: chibiArtUrl(
          `assets/chibi/terrain/faction-grass/world/chibi-${id.toLowerCase()}-ground.png`,
        ),
        // The texture's first cell as a tile: what the Gallery, the tile
        // dock and the forest bake show of the ground.
        world: { ...world, swatchUrl: tileUrl(id, 0) },
      },
    ];
  return Array.from({ length: count }, (_, variant) => ({
    id,
    variant,
    url: tileUrl(id, variant),
  }));
});

/**
 * One 80 x 80 picture of a ground for the interface: a tile's own file, a
 * textured ground's first cell.
 */
export function factionGrassSwatchUrlV7(tile: FactionGrassTileAssetV7): string {
  return tile.world?.swatchUrl ?? tile.url;
}
