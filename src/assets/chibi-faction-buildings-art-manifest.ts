import type { FactionIdV7 } from "../engine/index";
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
 * with a lighter slate tower). Since bead pulp_wars-2o7.2 every Farm look
 * is one whole sprite with ground round it: the Graveyard (tombstones on
 * the tile's own ground since bead pulp_wars-2yc.14, a fenced plot before)
 * and the Mushroom Farm (big mushrooms on a mulch bed) were redrawn, the
 * Hydroponic Farm and the Frost Garden refitted. Like the shared calm set they carry no owner
 * colour and no mask. Their subjects are `IMPROVEMENT:<FACTION>:<ID>`
 * (factionImprovementSubjectV7): the board asks with the faction that owns
 * the improvement's territory, so a captured city's buildings change look.
 *
 * The ground is the "ashen" look of the three Grass masters (bead
 * pulp_wars-2yc.14; the "gloam" recolour before) and the two Forest
 * masters over it (scripts/art/faction-buildings/gloam-grass.ts, no
 * PixelLab call), under `TERRAIN:UNDEAD:GRASS` and `TERRAIN:UNDEAD:FOREST`
 * (territoryTerrainSubjectV7). The Forest entries reuse the body layers of
 * the shared Forest.
 *
 * Stage 2 of bead pulp_wars-2yc.38 adds a Forge, a Workshop, a Port and a
 * Shipyard per faction the same way (twenty-eight masters), and bead
 * pulp_wars-eu3r.1 a Market (seven more).
 *
 * The Lumber Camps and Sawmills (bead pulp_wars-2yc.38; the user,
 * 2026-10-07: "lumber camps should be different per faction - depending on
 * the native forest skin. ditto for sawmills") are thirteen more masters of
 * the same batches and of `buildings-goblin` and `buildings-candy`: a camp
 * among the trees of the faction's forest and a mill in its materials, on
 * the 72 x 72 canvas and the seat of the shared pair. The Dinosaur Sawmill
 * is the Chopping Block above.
 *
 * The list is part of the direction registry
 * (chibiDirectionArtRegistryV7), so the classic look and the LEGACY art set
 * draw the shared buildings and ground as before.
 */
/**
 * Every faction's Lumber Camp, Sawmill, Forge, Workshop, Port, Shipyard
 * and Market (stage 2 of the bead added the Forge to the Shipyard, bead
 * pulp_wars-eu3r.1 the Market). The Dinosaur Sawmill is the Chopping Block
 * above.
 */
type SharedCanvasImprovement =
  | "LUMBER_CAMP"
  | "SAWMILL"
  | "FORGE"
  | "WORKSHOP"
  | "PORT"
  | "SHIPYARD"
  | "MARKET";

const SHARED_CANVAS_IMPROVEMENTS: readonly SharedCanvasImprovement[] = [
  "LUMBER_CAMP",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "PORT",
  "SHIPYARD",
  "MARKET",
];

const FOREST_BUILDINGS: readonly (readonly [
  slug: string,
  faction: Exclude<FactionIdV7, "ORIGINAL">,
])[] = [
  ["undead", "UNDEAD"],
  ["goblin", "GOBLIN"],
  ["dinosaur", "DINOSAUR"],
  ["martian", "MARTIAN"],
  ["ice-folk", "ICE_FOLK"],
  ["dwarf", "DWARF"],
  ["candy", "CANDY"],
  // Bead pulp_wars-mch9.16, batch `buildings-cult` (docs/art/factions/CULT.md).
  ["cult", "CULT"],
];

const FOREST_BUILDING_ASSETS: readonly ChibiArtAssetV7[] =
  FOREST_BUILDINGS.flatMap(([slug, faction]) =>
    SHARED_CANVAS_IMPROVEMENTS.filter(
      (improvement) => !(faction === "DINOSAUR" && improvement === "SAWMILL"),
    ).map((improvement): ChibiArtAssetV7 => {
      const id = `chibi-${slug}-${improvement.toLowerCase().replace("_", "-")}`;
      return {
        id,
        subject: `IMPROVEMENT:${faction}:${improvement}`,
        assetClass: "BUILDING",
        width: 72,
        height: 72,
        url: chibiArtUrl(`assets/chibi/buildings/${id}.png`),
      };
    }),
  );

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
    ...FOREST_BUILDING_ASSETS,
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
