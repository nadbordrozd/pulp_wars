import type { ForestShapeV7 } from "../render/canvas/chibi-forest-packing-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import type { ChibiArtAssetV7 } from "./chibi-art-v7";
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
/**
 * The range-style mined mountain as a registered terrain master (bead
 * pulp_wars-6kn): part of the direction registry, so the interface (build
 * menu, gallery, Help) and the board's fallback show the mined mountain the
 * board draws. The old `chibi-mined-mountain-1` and `-2` stay the default
 * art behind it (the classic look, and a failed load).
 */
export const CHIBI_RANGE_MINED_MOUNTAIN_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  record.mines.map((piece) => ({
    id: piece.id,
    subject: "TERRAIN:MINED_MOUNTAIN",
    assetClass: "TALL_TERRAIN",
    width: piece.width,
    height: piece.height,
    url: chibiArtUrl(
      piece.path.replace(/^public\//, "").replace(/\.png$/, ".master.png"),
    ),
    layers: {
      bodyUrl: chibiArtUrl(piece.path.replace(/^public\//, "")),
      groundUrl: chibiArtUrl(
        "assets/chibi/terrain/chibi-mountain-ground-1.png",
      ),
    },
  }));

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
  // Bead pulp_wars-6kn: the mined mountain in the range style.
  mined: record.mines.map((piece) => ({
    id: piece.id,
    url: publicUrl(piece.path),
  })),
};
