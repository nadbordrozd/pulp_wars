import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Faction building looks (epic pulp_wars-xdh, bead pulp_wars-xdh.2; see
 * docs/art/FACTION_BUILDINGS.md): the few improvements a faction draws in a
 * look of its own, and the Undead territory ground.
 *
 * The nine buildings are the batches `buildings-undead`, `-martian`,
 * `-dinosaur`, `-ice-folk` and `-dwarf` (imported from the exploration run
 * `art/explorations/faction-buildings-2026-10`; the Bone Mill was redone
 * with a lighter slate tower). Like the shared calm set they carry no owner
 * colour and no mask. Their subjects are `IMPROVEMENT:<FACTION>:<ID>`
 * (factionImprovementSubjectV7): the board asks with the faction that owns
 * the improvement's territory, so a captured city's buildings change look.
 *
 * The ground is the "gloam" recolour of the three Grass masters and the two
 * Forest masters over it (scripts/art/faction-buildings/gloam-grass.ts, no
 * PixelLab call), under `TERRAIN:UNDEAD:GRASS` and `TERRAIN:UNDEAD:FOREST`
 * (territoryTerrainSubjectV7). The Forest entries reuse the body layers of
 * the shared Forest.
 *
 * The list is part of the direction registry
 * (chibiDirectionArtRegistryV7), so the classic look and the LEGACY art set
 * draw the shared buildings and ground as before.
 */
export const CHIBI_FACTION_BUILDING_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-undead-graveyard",
      subject: "IMPROVEMENT:UNDEAD:FARM",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl("assets/chibi/buildings/chibi-undead-graveyard.png"),
    },
    {
      id: "chibi-undead-bone-mill",
      subject: "IMPROVEMENT:UNDEAD:WINDMILL",
      assetClass: "BUILDING",
      width: 64,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-undead-bone-mill.png"),
    },
    {
      id: "chibi-martian-hydroponic-farm",
      subject: "IMPROVEMENT:MARTIAN:FARM",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-martian-hydroponic-farm.png",
      ),
    },
    {
      id: "chibi-martian-solar-array",
      subject: "IMPROVEMENT:MARTIAN:WINDMILL",
      assetClass: "BUILDING",
      width: 72,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-martian-solar-array.png"),
    },
    {
      id: "chibi-dinosaur-grinding-stone",
      subject: "IMPROVEMENT:DINOSAUR:WINDMILL",
      assetClass: "BUILDING",
      width: 72,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-grinding-stone.png",
      ),
    },
    {
      id: "chibi-dinosaur-chopping-block",
      subject: "IMPROVEMENT:DINOSAUR:SAWMILL",
      assetClass: "BUILDING",
      width: 72,
      height: 72,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-dinosaur-chopping-block.png",
      ),
    },
    {
      id: "chibi-ice-folk-frost-garden",
      subject: "IMPROVEMENT:ICE_FOLK:FARM",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-ice-folk-frost-garden.png",
      ),
    },
    {
      id: "chibi-dwarf-mushroom-farm",
      subject: "IMPROVEMENT:DWARF:FARM",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl("assets/chibi/buildings/chibi-dwarf-mushroom-farm.png"),
    },
    {
      id: "chibi-dwarf-steam-pump",
      subject: "IMPROVEMENT:DWARF:WINDMILL",
      assetClass: "BUILDING",
      width: 72,
      height: 72,
      url: chibiArtUrl("assets/chibi/buildings/chibi-dwarf-steam-pump.png"),
    },
  ];

/**
 * The Undead territory ground. The three Grass tiles are in the order of
 * `chibi-grass-1..3` and the two Forests in the order of
 * `chibi-forest-1..2`, so a cell keeps its tuft pattern and its trees when
 * its territory changes hands (chibiVariantV7 picks by coordinates).
 */
export const CHIBI_UNDEAD_GROUND_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  ...([1, 2, 3] as const).map((index): ChibiArtAssetV7 => ({
    id: `chibi-undead-grass-${index}`,
    subject: "TERRAIN:UNDEAD:GRASS",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: chibiArtUrl(`assets/chibi/terrain/chibi-undead-grass-${index}.png`),
  })),
  ...([1, 2] as const).map((index): ChibiArtAssetV7 => ({
    id: `chibi-undead-forest-${index}`,
    subject: "TERRAIN:UNDEAD:FOREST",
    assetClass: "TALL_TERRAIN",
    width: 80,
    height: 104,
    url: chibiArtUrl(`assets/chibi/terrain/chibi-undead-forest-${index}.png`),
    layers: {
      bodyUrl: chibiArtUrl(
        `assets/chibi/terrain/chibi-forest-${index}.body.png`,
      ),
      groundUrl: chibiArtUrl("assets/chibi/terrain/chibi-undead-grass-1.png"),
    },
  })),
];
