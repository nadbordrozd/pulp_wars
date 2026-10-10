import type { FactionGrassTileAssetV7 } from "../render/canvas/faction-grass-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * EXPERIMENT: faction grass (bead pulp_wars-2o7.4, docs/art/FACTION_GRASS.md).
 * The ground tiles of each faction's territory, three variants each, baked
 * by scripts/art/faction-grass.ts in their final colours. The Undead tiles
 * are the Undead ground masters (bead pulp_wars-xdh.2, the ashen look of
 * bead pulp_wars-2yc.14), which the board
 * tones like every Grass tile; they are listed for the border spill only.
 */
export const FACTION_GRASS_TILES_V7: readonly FactionGrassTileAssetV7[] = [
  ...(
    ["CANDY", "GOBLIN", "CULT", "MARTIAN", "DWARF", "DINOSAUR"] as const
  ).flatMap((id) =>
    [0, 1, 2].map((variant) => ({
      id,
      variant,
      url: chibiArtUrl(
        `assets/chibi/terrain/faction-grass/chibi-${id.toLowerCase()}-grass-${variant + 1}.png`,
      ),
    })),
  ),
  ...[0, 1, 2].map((variant) => ({
    id: "UNDEAD" as const,
    variant,
    url: chibiArtUrl(
      `assets/chibi/terrain/chibi-undead-grass-${variant + 1}.png`,
    ),
    toned: true,
  })),
];
