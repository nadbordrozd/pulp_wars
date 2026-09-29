/// <reference types="vite/client" />
import type { ChibiArtAssetV7 } from "./chibi-art-v7";

/**
 * Accepted CHIBI art-set rasters for Ruleset 7 (?art=chibi). Batch beads add
 * entries here after review; every subject without an entry keeps rendering
 * its legacy asset at the chibi geometry. Rasters live under
 * public/assets/chibi/ and use chibiArtUrl so the Vite base path applies.
 * Contract: docs/art/CHIBI_ART_DIRECTION.md sections 3 and 4.
 */
export const CHIBI_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  // Batch 1 (pulp_wars-67q.3): terrain, Village, City 1-3, Fighter, Marksman.
  {
    id: "chibi-grass-1",
    subject: "TERRAIN:GRASS",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-grass-1.png"),
  },
  {
    id: "chibi-grass-2",
    subject: "TERRAIN:GRASS",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-grass-2.png"),
  },
  {
    id: "chibi-grass-3",
    subject: "TERRAIN:GRASS",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-grass-3.png"),
  },
  {
    id: "chibi-forest-1",
    subject: "TERRAIN:FOREST",
    assetClass: "TALL_TERRAIN",
    width: 80,
    height: 104,
    url: chibiArtUrl("assets/chibi/terrain/chibi-forest-1.png"),
  },
  {
    id: "chibi-forest-2",
    subject: "TERRAIN:FOREST",
    assetClass: "TALL_TERRAIN",
    width: 80,
    height: 104,
    url: chibiArtUrl("assets/chibi/terrain/chibi-forest-2.png"),
  },
  {
    id: "chibi-mountain-1",
    subject: "TERRAIN:MOUNTAIN",
    assetClass: "TALL_TERRAIN",
    width: 80,
    height: 104,
    url: chibiArtUrl("assets/chibi/terrain/chibi-mountain-1.png"),
  },
  {
    id: "chibi-mountain-3",
    subject: "TERRAIN:MOUNTAIN",
    assetClass: "TALL_TERRAIN",
    width: 80,
    height: 104,
    url: chibiArtUrl("assets/chibi/terrain/chibi-mountain-3.png"),
  },
  {
    id: "chibi-shallow-water-1",
    subject: "TERRAIN:SHALLOW_WATER",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-shallow-water-1.png"),
  },
  {
    id: "chibi-shallow-water-2",
    subject: "TERRAIN:SHALLOW_WATER",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-shallow-water-2.png"),
  },
  {
    id: "chibi-deep-water-1",
    subject: "TERRAIN:DEEP_WATER",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-deep-water-1.png"),
  },
  {
    id: "chibi-deep-water-2",
    subject: "TERRAIN:DEEP_WATER",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/terrain/chibi-deep-water-2.png"),
  },
  {
    id: "chibi-village",
    subject: "SITE:VILLAGE",
    assetClass: "SETTLEMENT",
    width: 80,
    height: 88,
    url: chibiArtUrl("assets/chibi/settlements/chibi-village.png"),
  },
  {
    id: "chibi-city-1",
    subject: "CITY:1",
    assetClass: "SETTLEMENT",
    width: 88,
    height: 96,
    url: chibiArtUrl("assets/chibi/settlements/chibi-city-1.png"),
    ownerMaskUrl: chibiArtUrl("assets/chibi/settlements/chibi-city-1.mask.png"),
  },
  {
    id: "chibi-city-2",
    subject: "CITY:2",
    assetClass: "SETTLEMENT",
    width: 96,
    height: 100,
    url: chibiArtUrl("assets/chibi/settlements/chibi-city-2.png"),
    ownerMaskUrl: chibiArtUrl("assets/chibi/settlements/chibi-city-2.mask.png"),
  },
  {
    id: "chibi-city-3",
    subject: "CITY:3",
    assetClass: "SETTLEMENT",
    width: 96,
    height: 104,
    url: chibiArtUrl("assets/chibi/settlements/chibi-city-3.png"),
    ownerMaskUrl: chibiArtUrl("assets/chibi/settlements/chibi-city-3.mask.png"),
  },
  {
    id: "chibi-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-fighter.png"),
    ownerMaskUrl: chibiArtUrl("assets/chibi/units/chibi-fighter.mask.png"),
  },
  {
    id: "chibi-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-marksman.png"),
    ownerMaskUrl: chibiArtUrl("assets/chibi/units/chibi-marksman.mask.png"),
  },
];

export function chibiArtUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
