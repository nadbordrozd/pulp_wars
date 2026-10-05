import type { ChibiMassifArtSetV7 } from "../render/canvas/chibi-massif-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import record from "./chibi-mountain-ranges.json";

/**
 * The composed CHIBI mountains (beads pulp_wars-e9f and pulp_wars-2o7.1,
 * docs/art/COMPOSED_TERRAIN.md): range pieces generated with PixelLab and
 * derived by scripts/art/chibi-mountain-ranges.ts, which also writes
 * chibi-mountain-ranges.json (this manifest's data and the derivation
 * record `art:validate` checks).
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

/**
 * The massif set (bead pulp_wars-2o7.1): ridges two cells wide and single
 * mountains whose rock fills the footprint, each in a low form (at most
 * 13 px above its cell, for the top row of an area) and a tall form (up to
 * 48 px, drawn only under another plain Mountain cell), and the mined
 * mountain. The board draws them with chibi-massif-v7.ts.
 */
export const CHIBI_MOUNTAIN_ART_SET_V7: ChibiMassifArtSetV7 = {
  pieces: record.pieces.map((piece) => ({
    id: piece.id,
    columns: piece.shape === "2x1" ? 2 : 1,
    tall: piece.tall,
    variant: piece.variant,
    width: piece.width,
    height: piece.height,
    url: publicUrl(piece.path),
  })),
  mined: record.mines.map((piece) => ({
    id: piece.id,
    url: publicUrl(piece.path),
  })),
};
