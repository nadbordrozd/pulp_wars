import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";
import { CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7 } from "./chibi-direction-dinosaur-art-manifest";
import { CHIBI_CURIOSITIES_ART_ASSETS_V7 } from "./chibi-curiosities-art-manifest";
import { CHIBI_DIRECTION_DWARF_ART_ASSETS_V7 } from "./chibi-direction-dwarf-art-manifest";
import { CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7 } from "./chibi-direction-ice-folk-art-manifest";
import { CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7 } from "./chibi-direction-martian-art-manifest";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "./chibi-direction-undead-art-manifest";
import {
  CHIBI_FACTION_BUILDING_ART_ASSETS_V7,
  CHIBI_UNDEAD_GROUND_ART_ASSETS_V7,
} from "./chibi-faction-buildings-art-manifest";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "./chibi-naval-faction-art-manifest";

/**
 * Production art of the new visual direction (bead pulp_wars-3tq.5, batch
 * `direction-human`; see docs/art/VISUAL_DIRECTION_2026-10.md, "Production").
 * Every Human unit and portrait in the faction's fixed crimson and gold, the
 * shared improvement set in the calm building style, the Farm as crop rows,
 * Human City 1-3 and the neutral Village.
 *
 * The entries use the same subjects as the current art in
 * chibi-art-manifest.ts but live in their own list, so nothing here is a
 * variant of a default subject and the classic look is unchanged. Since
 * bead pulp_wars-3tq.6 the game loads this registry with the rest of the
 * CHIBI set and resolves it first, on the board and in the interface
 * (src/render/canvas/live-board-look-v7.ts); a raster that fails to load
 * falls back to the default asset of that subject. Units, cities and
 * portraits have no owner area: `fixedColours` instead of a mask. Terrain
 * is not converted; the Goblins (the list below this one), the Undead, the
 * Dinosaurs, the Martians, the Ice Folk and the Dwarves (their own modules)
 * are, and so
 * is every faction's naval art (chibi-naval-faction-art-manifest.ts, bead
 * pulp_wars-w5j.3).
 */
export const CHIBI_DIRECTION_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-direction-captain",
    subject: "UNIT:CAPTAIN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-captain.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-catapult",
    subject: "UNIT:CATAPULT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-catapult.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-fighter.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-guard",
    subject: "UNIT:GUARD",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-guard.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-juggernaut",
    subject: "UNIT:JUGGERNAUT",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-juggernaut.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-knight",
    subject: "UNIT:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-knight.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-marksman",
    subject: "UNIT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-marksman.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-raider",
    subject: "UNIT:RAIDER",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-raider.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-captain",
    subject: "PORTRAIT:CAPTAIN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-captain.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-catapult",
    subject: "PORTRAIT:CATAPULT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-catapult.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-fighter",
    subject: "PORTRAIT:FIGHTER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-fighter.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-guard",
    subject: "PORTRAIT:GUARD",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-guard.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-juggernaut",
    subject: "PORTRAIT:JUGGERNAUT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-juggernaut.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-knight",
    subject: "PORTRAIT:KNIGHT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-knight.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-marksman",
    subject: "PORTRAIT:MARKSMAN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-marksman.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-raider",
    subject: "PORTRAIT:RAIDER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-raider.png",
    ),
    fixedColours: true,
  },
  // The Farm: beds of mixed vegetables, the one the user chose from three
  // green candidates (bead pulp_wars-9s0.7).
  {
    id: "chibi-direction-farm",
    subject: "IMPROVEMENT:FARM",
    assetClass: "BUILDING",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-farm.png"),
  },
  {
    id: "chibi-direction-forge",
    subject: "IMPROVEMENT:FORGE",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-forge.png"),
  },
  {
    id: "chibi-direction-lumber-camp",
    subject: "IMPROVEMENT:LUMBER_CAMP",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-lumber-camp.png"),
  },
  {
    id: "chibi-direction-market",
    subject: "IMPROVEMENT:MARKET",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-market.png"),
  },
  {
    id: "chibi-direction-monument",
    subject: "IMPROVEMENT:MONUMENT",
    assetClass: "BUILDING",
    width: 48,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-monument.png"),
  },
  {
    id: "chibi-direction-port",
    subject: "IMPROVEMENT:PORT",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-port.png"),
  },
  {
    id: "chibi-direction-sawmill",
    subject: "IMPROVEMENT:SAWMILL",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-sawmill.png"),
  },
  {
    id: "chibi-direction-shipyard",
    subject: "IMPROVEMENT:SHIPYARD",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-shipyard.png"),
  },
  {
    id: "chibi-direction-windmill",
    subject: "IMPROVEMENT:WINDMILL",
    assetClass: "BUILDING",
    width: 64,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-windmill.png"),
  },
  {
    id: "chibi-direction-workshop",
    subject: "IMPROVEMENT:WORKSHOP",
    assetClass: "BUILDING",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/buildings/chibi-direction-workshop.png"),
  },
  {
    id: "chibi-direction-city-1",
    subject: "CITY:1",
    assetClass: "SETTLEMENT",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/settlements/chibi-direction-city-1.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-city-2",
    subject: "CITY:2",
    assetClass: "SETTLEMENT",
    width: 88,
    height: 80,
    url: chibiArtUrl("assets/chibi/settlements/chibi-direction-city-2.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-city-3",
    subject: "CITY:3",
    assetClass: "SETTLEMENT",
    width: 96,
    height: 88,
    url: chibiArtUrl("assets/chibi/settlements/chibi-direction-city-3.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-village",
    subject: "SITE:VILLAGE",
    assetClass: "SETTLEMENT",
    width: 72,
    height: 72,
    url: chibiArtUrl("assets/chibi/settlements/chibi-direction-village.png"),
  },
];

/**
 * Goblin production art of the new visual direction (bead pulp_wars-3tq.9,
 * batch `direction-goblin`; see docs/art/VISUAL_DIRECTION_2026-10.md, "Goblin
 * production"): every Goblin unit and portrait and the scrap camp City 1-3
 * in the faction's fixed colours. Bead pulp_wars-wrn.2 redrew every piece
 * in place, under the same asset ids, for the redesign the user asked for
 * (docs/art/factions/GOBLIN_REDESIGN.md, direction A): lime goblins, leaf
 * green Orcs and a pale mossy Troll in sand leather and light tin, with the
 * faction's hazard yellow as paint. The entries use the Goblin faction
 * subjects of chibi-art-manifest.ts, on the same canvases and anchors as
 * the classic sprites, and have no owner area. The Goblin boats are in the
 * naval list (chibi-naval-faction-art-manifest.ts), redrawn by the same
 * bead.
 */
export const CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-goblin-goblin",
      subject: "UNIT:GOBLIN:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-goblin-goblin.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-wolf-rider",
      subject: "UNIT:GOBLIN:RAIDER",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-wolf-rider.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-bomb-chucker",
      subject: "UNIT:GOBLIN:MARKSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-bomb-chucker.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-orc-brute",
      subject: "UNIT:GOBLIN:GUARD",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-orc-brute.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-orc-warboss",
      subject: "UNIT:GOBLIN:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-orc-warboss.png",
      ),
      anchor: { x: 27, y: 40 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-rocket-cart",
      subject: "UNIT:GOBLIN:CATAPULT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-rocket-cart.png",
      ),
      anchor: { x: 34, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-scrap-buggy",
      subject: "UNIT:GOBLIN:KNIGHT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-goblin-scrap-buggy.png",
      ),
      anchor: { x: 32, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-troll",
      subject: "UNIT:GOBLIN:JUGGERNAUT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 104,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-goblin-troll.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-goblin",
      subject: "PORTRAIT:GOBLIN:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-goblin.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-wolf-rider",
      subject: "PORTRAIT:GOBLIN:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-wolf-rider.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-bomb-chucker",
      subject: "PORTRAIT:GOBLIN:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-bomb-chucker.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-orc-brute",
      subject: "PORTRAIT:GOBLIN:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-orc-brute.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-orc-warboss",
      subject: "PORTRAIT:GOBLIN:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-orc-warboss.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-rocket-cart",
      subject: "PORTRAIT:GOBLIN:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-rocket-cart.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-scrap-buggy",
      subject: "PORTRAIT:GOBLIN:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-scrap-buggy.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-goblin-troll",
      subject: "PORTRAIT:GOBLIN:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-goblin-troll.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-city-1",
      subject: "CITY:GOBLIN:1",
      assetClass: "SETTLEMENT",
      width: 88,
      height: 96,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-goblin-city-1.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-city-2",
      subject: "CITY:GOBLIN:2",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 100,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-goblin-city-2.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-goblin-city-3",
      subject: "CITY:GOBLIN:3",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-goblin-city-3.png",
      ),
      fixedColours: true,
    },
  ];

/** The registry the live look resolves before the default art. */
export function chibiDirectionArtRegistryV7(): ChibiArtRegistryV7 {
  const built = buildChibiArtRegistryV7([
    ...CHIBI_DIRECTION_ART_ASSETS_V7,
    ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
    // --- Undead (pulp_wars-3tq.12) ---
    ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
    // --- Dinosaur (pulp_wars-3tq.13) ---
    ...CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7,
    // --- Martian (pulp_wars-t6s.6 art, wired in by pulp_wars-t6s.4) ---
    ...CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
    // --- Ice Folk (pulp_wars-7g3.5 art, wired in by pulp_wars-7g3.6) ---
    ...CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
    // --- Dwarf (pulp_wars-78i.5 art, wired in by pulp_wars-78i.6) ---
    ...CHIBI_DIRECTION_DWARF_ART_ASSETS_V7,
    // --- Naval, every faction (pulp_wars-w5j.2 art, wired in by
    // pulp_wars-w5j.3): the Human entries take the shared ship subjects.
    ...CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map((entry) => entry.asset),
    // --- Faction building looks and the Undead territory ground
    // (pulp_wars-xdh.2) ---
    ...CHIBI_FACTION_BUILDING_ART_ASSETS_V7,
    ...CHIBI_UNDEAD_GROUND_ART_ASSETS_V7,
    // --- Map curiosities (pulp_wars-737.5 art, wired in by pulp_wars-737.6):
    // the neutral Giant Spider, the tile overlays, icons, effects, marker.
    ...CHIBI_CURIOSITIES_ART_ASSETS_V7,
  ]);
  if (built.problems.length > 0) throw new Error(built.problems.join("; "));
  return built.registry;
}
