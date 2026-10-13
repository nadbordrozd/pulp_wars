import { chibiArtUrl } from "../../assets/chibi-art-manifest";
import { FACTION_GRASS_TILES_V7 } from "../../assets/faction-grass-manifest";
import type { FactionGrassTileAssetV7 } from "./faction-grass-v7";

/**
 * EXPERIMENT, off (bead pulp_wars-2yc.48, second round;
 * docs/art/TEXTURED_GROUNDS.md): the grounds that have a textured version,
 * each one periodic texture of 6 x 6 cells baked by
 * scripts/art/textured-grounds.ts. Drawn only with `?textured-grounds=1`.
 *
 * Not a manifest under src/assets on purpose: these are samples for
 * review, so the asset inventory does not list them and nothing preloads
 * them. To make one the ground of its faction, move it there.
 */
export const TEXTURED_GROUND_TILES_V7: readonly FactionGrassTileAssetV7[] = (
  [
    ["MARTIAN", "martian-regolith-world"],
    ["DWARF", "dwarf-moss-world"],
    ["CULT", "cult-marsh-world"],
  ] as const
).map(([id, look]) => ({
  id,
  variant: 0,
  url: chibiArtUrl(
    `assets/chibi/terrain/faction-grass/world/chibi-${look}.png`,
  ),
  world: { columns: 6, rows: 6 },
}));

/** The tiles the board loads: with `textured`, those grounds' textures. */
export function factionGrassTilesV7(
  textured: boolean,
): readonly FactionGrassTileAssetV7[] {
  if (!textured) return FACTION_GRASS_TILES_V7;
  const replaced = new Set(TEXTURED_GROUND_TILES_V7.map((tile) => tile.id));
  return [
    ...FACTION_GRASS_TILES_V7.filter((tile) => !replaced.has(tile.id)),
    ...TEXTURED_GROUND_TILES_V7,
  ];
}
