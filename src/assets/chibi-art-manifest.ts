/// <reference types="vite/client" />
import type { ChibiArtAssetV7 } from "./chibi-art-v7";

/**
 * Accepted CHIBI art-set rasters for Ruleset 7 (?art=chibi). Batch beads add
 * entries here after review; every subject without an entry keeps rendering
 * its legacy asset at the chibi geometry. Rasters live under
 * public/assets/chibi/ and use chibiArtUrl so the Vite base path applies.
 * Contract: docs/art/CHIBI_ART_DIRECTION.md sections 3 and 4.
 */
export const CHIBI_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [];

export function chibiArtUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
