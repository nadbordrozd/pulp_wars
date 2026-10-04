import type { ForestShapeV7 } from "../render/canvas/chibi-forest-packing-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import record from "./chibi-forest-pieces.json";

/**
 * The composed CHIBI forest pieces (bead pulp_wars-maw.3,
 * docs/art/COMPOSED_FORESTS.md): multi-tile pieces stamped from the
 * accepted Forest clumps by scripts/art/chibi-forest-pieces.ts, which also
 * writes chibi-forest-pieces.json (this manifest's data and the derivation
 * record `art:validate` checks). The clumps are the same trees one clump at
 * a time; the board draws them between pieces to close seams.
 */
export interface ChibiForestPieceAssetV7 {
  readonly id: string;
  readonly shape: ForestShapeV7;
  readonly variant: number;
  /** cols x 80 by rows x 80 + 24 (the band above the footprint). */
  readonly width: number;
  readonly height: number;
  readonly url: string;
}

export interface ChibiForestClumpAssetV7 {
  readonly id: string;
  /** The clump alone, trimmed and softened like the pieces. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface ChibiForestArtSetV7 {
  readonly pieces: readonly ChibiForestPieceAssetV7[];
  readonly clumps: readonly ChibiForestClumpAssetV7[];
}

const publicUrl = (file: string): string =>
  chibiArtUrl(file.replace(/^public\//, ""));

export const CHIBI_FOREST_ART_SET_V7: ChibiForestArtSetV7 = {
  pieces: record.pieces.map((piece) => ({
    id: piece.id,
    shape: piece.shape as ForestShapeV7,
    variant: piece.variant,
    width: piece.width,
    height: piece.height,
    url: publicUrl(piece.path),
  })),
  clumps: record.clumps.map((clump) => ({
    id: clump.id,
    url: publicUrl(clump.seam.path),
    width: clump.seam.width,
    height: clump.seam.height,
  })),
};
