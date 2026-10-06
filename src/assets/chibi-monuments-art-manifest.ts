import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * The achievement Monuments (bead pulp_wars-2yc.15, batch `monuments`; see
 * docs/art/FACTION_BUILDINGS.md, section 11): one Monument look per
 * achievement, on the 48 x 72 canvas of the shared Monument and in its pale
 * stone, with no owner colour and no mask. Their subjects are
 * `IMPROVEMENT:MONUMENT:<ACHIEVEMENT>` (monumentArtSubjectV7); the board
 * asks with the achievement the viewer may see (its own Monuments), and
 * every other Monument is the shared `IMPROVEMENT:MONUMENT`.
 *
 * The list is part of the direction registry (chibiDirectionArtRegistryV7),
 * so the Classic look and the LEGACY art set draw the shared Monument.
 */
export const CHIBI_MONUMENT_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-monument-explorer",
    subject: "IMPROVEMENT:MONUMENT:EXPLORER",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-explorer.png"),
  },
  {
    id: "chibi-monument-engineer",
    subject: "IMPROVEMENT:MONUMENT:ENGINEER",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-engineer.png"),
  },
  {
    id: "chibi-monument-muster",
    subject: "IMPROVEMENT:MONUMENT:MUSTER",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-muster.png"),
  },
  {
    id: "chibi-monument-conqueror",
    subject: "IMPROVEMENT:MONUMENT:CONQUEROR",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-conqueror.png"),
  },
  {
    id: "chibi-monument-land-baron",
    subject: "IMPROVEMENT:MONUMENT:LAND_BARON",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-land-baron.png"),
  },
  {
    id: "chibi-monument-sea-dog",
    subject: "IMPROVEMENT:MONUMENT:SEA_DOG",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-sea-dog.png"),
  },
  {
    id: "chibi-monument-slayer",
    subject: "IMPROVEMENT:MONUMENT:SLAYER",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-monument-slayer.png"),
  },
];
