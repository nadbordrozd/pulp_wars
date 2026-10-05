import type { ForestShapeV7 } from "../render/canvas/chibi-forest-packing-v7";
import {
  FACTION_FOREST_IDS_V7,
  type FactionForestIdV7,
} from "../render/canvas/faction-forests-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import type { ChibiForestArtSetV7 } from "./chibi-forest-pieces-manifest";
import record from "./faction-forest-pieces.json";

/**
 * The faction forests (bead pulp_wars-2yc.2, docs/art/FACTION_FORESTS.md):
 * one composed-forest piece set per faction, stamped from that faction's
 * own clumps by scripts/art/faction-forests.ts, which also writes
 * faction-forest-pieces.json (this manifest's data and the derivation
 * record `art:validate` checks).
 */
const publicUrl = (file: string): string =>
  chibiArtUrl(file.replace(/^public\//, ""));

function setOf(id: FactionForestIdV7): ChibiForestArtSetV7 {
  const set = record.sets[id];
  return {
    pieces: set.pieces.map((piece) => ({
      id: piece.id,
      shape: piece.shape as ForestShapeV7,
      variant: piece.variant,
      width: piece.width,
      height: piece.height,
      url: publicUrl(piece.path),
    })),
    clumps: set.clumps.map((clump) => ({
      id: clump.id,
      url: publicUrl(clump.seam.path),
      width: clump.seam.width,
      height: clump.seam.height,
    })),
  };
}

export const FACTION_FOREST_ART_SETS_V7: Readonly<
  Record<FactionForestIdV7, ChibiForestArtSetV7>
> = Object.fromEntries(
  FACTION_FOREST_IDS_V7.map((id) => [id, setOf(id)]),
) as Record<FactionForestIdV7, ChibiForestArtSetV7>;
