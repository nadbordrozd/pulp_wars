import type {
  FactionGrassIdV7,
  FactionGrassTileAssetV7,
} from "../render/canvas/faction-grass-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * EXPERIMENT: faction grass (bead pulp_wars-2o7.4, docs/art/FACTION_GRASS.md).
 * The ground tiles of each faction's territory, baked by
 * scripts/art/faction-grass.ts in their final colours and drawn as they
 * are. The grounds recoloured from the Grass masters have three tiles; the
 * grounds composed from PixelLab fields (bead pulp_wars-2yc.48: the Cult
 * bog, the Undead burnt ground, the Dwarf gravel) have six, so a puddle or
 * a burnt bush does not come back every third cell.
 */
export const FACTION_GRASS_TILE_COUNTS_V7: Readonly<
  Record<FactionGrassIdV7, number>
> = {
  CANDY: 3,
  GOBLIN: 3,
  MARTIAN: 3,
  DINOSAUR: 3,
  DWARF: 6,
  UNDEAD: 6,
  CULT: 6,
};

export const FACTION_GRASS_TILES_V7: readonly FactionGrassTileAssetV7[] = (
  Object.entries(FACTION_GRASS_TILE_COUNTS_V7) as [FactionGrassIdV7, number][]
).flatMap(([id, count]) =>
  Array.from({ length: count }, (_, variant) => ({
    id,
    variant,
    url: chibiArtUrl(
      `assets/chibi/terrain/faction-grass/chibi-${id.toLowerCase()}-grass-${variant + 1}.png`,
    ),
  })),
);
