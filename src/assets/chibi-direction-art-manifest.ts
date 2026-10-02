import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

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
 * portraits have no owner area: `fixedColours` instead of a mask. Ships,
 * the other factions and terrain are not converted yet.
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

/** The registry the live look resolves before the default art. */
export function chibiDirectionArtRegistryV7(): ChibiArtRegistryV7 {
  const built = buildChibiArtRegistryV7(CHIBI_DIRECTION_ART_ASSETS_V7);
  if (built.problems.length > 0) throw new Error(built.problems.join("; "));
  return built.registry;
}
