import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * The faction Monuments (bead pulp_wars-eu3r.2, batches
 * `monuments-<faction>`; see docs/art/FACTION_BUILDINGS.md, "Faction
 * Monuments"): every achievement's Monument in the materials of each
 * faction but the Humans, whose look is the seven of
 * chibi-monuments-art-manifest.ts, and each faction's own obelisk for a
 * viewer who may not see the achievement. Same 48 x 72 canvas, anchor and
 * seat as the shared Monument; no owner colour, no mask. Subjects:
 * `IMPROVEMENT:MONUMENT:<FACTION>:<ACHIEVEMENT>` and
 * `IMPROVEMENT:MONUMENT:<FACTION>`.
 *
 * Art only: the list is part of the direction registry
 * (chibiDirectionArtAssetsV7, so the preload fetches it with its faction's
 * art), but nothing asks for these subjects yet, so the board, the
 * interface and the Gallery draw exactly what they drew before. The skin
 * rule (bead pulp_wars-eu3r.3) asks for them.
 */
export const CHIBI_FACTION_MONUMENT_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    // --- UNDEAD (batch monuments-undead) ---
    {
      id: "chibi-undead-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-explorer.png",
      ),
    },
    {
      id: "chibi-undead-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-engineer.png",
      ),
    },
    {
      id: "chibi-undead-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-muster.png",
      ),
    },
    {
      id: "chibi-undead-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-undead-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-undead-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-undead-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-undead-monument-slayer.png",
      ),
    },
    {
      id: "chibi-undead-monument",
      subject: "IMPROVEMENT:MONUMENT:UNDEAD",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-undead-monument.png"),
    },
    // --- GOBLIN (batch monuments-goblin) ---
    {
      id: "chibi-goblin-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-explorer.png",
      ),
    },
    {
      id: "chibi-goblin-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-engineer.png",
      ),
    },
    {
      id: "chibi-goblin-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-muster.png",
      ),
    },
    {
      id: "chibi-goblin-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-goblin-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-goblin-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-goblin-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-goblin-monument-slayer.png",
      ),
    },
    {
      id: "chibi-goblin-monument",
      subject: "IMPROVEMENT:MONUMENT:GOBLIN",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-goblin-monument.png"),
    },
    // --- DINOSAUR (batch monuments-dinosaur) ---
    {
      id: "chibi-dinosaur-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-explorer.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-engineer.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-muster.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-monument-slayer.png",
      ),
    },
    {
      id: "chibi-dinosaur-monument",
      subject: "IMPROVEMENT:MONUMENT:DINOSAUR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-dinosaur-monument.png"),
    },
    // --- MARTIAN (batch monuments-martian) ---
    {
      id: "chibi-martian-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-explorer.png",
      ),
    },
    {
      id: "chibi-martian-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-engineer.png",
      ),
    },
    {
      id: "chibi-martian-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-muster.png",
      ),
    },
    {
      id: "chibi-martian-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-martian-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-martian-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-martian-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:MARTIAN:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-monument-slayer.png",
      ),
    },
    // --- ICE_FOLK (batch monuments-ice-folk) ---
    {
      id: "chibi-ice-folk-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-explorer.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-engineer.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-muster.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-monument-slayer.png",
      ),
    },
    {
      id: "chibi-ice-folk-monument",
      subject: "IMPROVEMENT:MONUMENT:ICE_FOLK",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-ice-folk-monument.png"),
    },
    // --- DWARF (batch monuments-dwarf) ---
    {
      id: "chibi-dwarf-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:DWARF:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-explorer.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:DWARF:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-engineer.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:DWARF:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-muster.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:DWARF:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:DWARF:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:DWARF:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-dwarf-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:DWARF:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dwarf-monument-slayer.png",
      ),
    },
    {
      id: "chibi-dwarf-monument",
      subject: "IMPROVEMENT:MONUMENT:DWARF",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-dwarf-monument.png"),
    },
    // --- CANDY (batch monuments-candy) ---
    {
      id: "chibi-candy-monument-explorer",
      subject: "IMPROVEMENT:MONUMENT:CANDY:EXPLORER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-explorer.png",
      ),
    },
    {
      id: "chibi-candy-monument-engineer",
      subject: "IMPROVEMENT:MONUMENT:CANDY:ENGINEER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-engineer.png",
      ),
    },
    {
      id: "chibi-candy-monument-muster",
      subject: "IMPROVEMENT:MONUMENT:CANDY:MUSTER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-muster.png",
      ),
    },
    {
      id: "chibi-candy-monument-conqueror",
      subject: "IMPROVEMENT:MONUMENT:CANDY:CONQUEROR",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-conqueror.png",
      ),
    },
    {
      id: "chibi-candy-monument-land-baron",
      subject: "IMPROVEMENT:MONUMENT:CANDY:LAND_BARON",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-land-baron.png",
      ),
    },
    {
      id: "chibi-candy-monument-sea-dog",
      subject: "IMPROVEMENT:MONUMENT:CANDY:SEA_DOG",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-sea-dog.png",
      ),
    },
    {
      id: "chibi-candy-monument-slayer",
      subject: "IMPROVEMENT:MONUMENT:CANDY:SLAYER",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-candy-monument-slayer.png",
      ),
    },
    {
      id: "chibi-candy-monument",
      subject: "IMPROVEMENT:MONUMENT:CANDY",
      assetClass: "BUILDING",
      width: 48,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-candy-monument.png"),
    },
  ];
