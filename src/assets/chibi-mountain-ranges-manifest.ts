import type { ForestShapeV7 } from "../render/canvas/chibi-forest-packing-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import type { ChibiForestArtSetV7 } from "./chibi-forest-pieces-manifest";
import record from "./chibi-mountain-ranges.json";

/**
 * The composed CHIBI mountain ranges (bead pulp_wars-e9f,
 * docs/art/COMPOSED_TERRAIN.md): multi-tile range pieces generated with
 * PixelLab and derived by scripts/art/chibi-mountain-ranges.ts, which also
 * writes chibi-mountain-ranges.json (this manifest's data and the
 * derivation record `art:validate` checks). The board packs and draws them
 * with the machinery of the composed forests, without seam clumps.
 */
const publicUrl = (file: string): string =>
  chibiArtUrl(file.replace(/^public\//, ""));

export const CHIBI_MOUNTAIN_ART_SET_V7: ChibiForestArtSetV7 = {
  pieces: record.pieces.map((piece) => ({
    id: piece.id,
    shape: piece.shape as ForestShapeV7,
    variant: piece.variant,
    width: piece.width,
    height: piece.height,
    url: publicUrl(piece.path),
  })),
  // No join pieces: a foothill between two ridges read as a grey slug.
  clumps: [],
};
