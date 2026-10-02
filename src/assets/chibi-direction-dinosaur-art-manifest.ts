import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Dinosaur production art of the new visual direction (bead
 * pulp_wars-3tq.13, batch `direction-dinosaur`; see
 * docs/art/VISUAL_DIRECTION_2026-10.md, "Dinosaur production", and
 * docs/art/factions/DINOSAUR.md).
 *
 * Every Dinosaur land unit, the Egg and the portraits in the faction's
 * fixed colours: deep blue hide with a navy back, a cream belly, jaws and
 * claws, tawny spotted fur on the cavemen and one red-orange accent, with a
 * body pattern per species. No owner area and no mask (`fixedColours`). The
 * Lay Egg, Hatch and Stampede icons show the same Egg and hide, and City
 * 1-3 are the bone-and-hide camps with tawny tents, whose pennant is drawn
 * in code (DIRECTION_FLAG_ANCHORS_V7).
 *
 * The entries use the subjects of the classic Dinosaur art, on the same
 * canvases and anchors, but live in the direction's registry
 * (chibiDirectionArtRegistryV7), so the classic look and LEGACY are
 * unchanged, and a raster that fails to load falls back to the classic
 * asset of its subject. The War Drums icon (no hide, no player colour) and
 * the ships are not converted.
 */
export const CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-dinosaur-caveman",
      subject: "UNIT:DINOSAUR:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-caveman.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-raptor",
      subject: "UNIT:DINOSAUR:RAIDER",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-raptor.png",
      ),
      anchor: { x: 34, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-spitter",
      subject: "UNIT:DINOSAUR:MARKSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-spitter.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-ankylosaurus",
      subject: "UNIT:DINOSAUR:GUARD",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-ankylosaurus.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-shaman",
      subject: "UNIT:DINOSAUR:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-shaman.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-triceratops",
      subject: "UNIT:DINOSAUR:CATAPULT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-triceratops.png",
      ),
      anchor: { x: 34, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-t-rex",
      subject: "UNIT:DINOSAUR:KNIGHT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-dinosaur-t-rex.png"),
      anchor: { x: 30, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-brontosaurus",
      subject: "UNIT:DINOSAUR:JUGGERNAUT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-dinosaur-brontosaurus.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-egg",
      subject: "UNIT:DINOSAUR:EGG",
      assetClass: "STANDARD_UNIT",
      width: 48,
      height: 48,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-dinosaur-egg.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-caveman",
      subject: "PORTRAIT:DINOSAUR:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-caveman.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-raptor",
      subject: "PORTRAIT:DINOSAUR:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-raptor.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-spitter",
      subject: "PORTRAIT:DINOSAUR:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-spitter.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-ankylosaurus",
      subject: "PORTRAIT:DINOSAUR:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-ankylosaurus.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-shaman",
      subject: "PORTRAIT:DINOSAUR:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-shaman.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-triceratops",
      subject: "PORTRAIT:DINOSAUR:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-triceratops.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-t-rex",
      subject: "PORTRAIT:DINOSAUR:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-t-rex.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-dinosaur-brontosaurus",
      subject: "PORTRAIT:DINOSAUR:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-dinosaur-brontosaurus.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-icon-action-hatch",
      subject: "ICON:ACTION:HATCH",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-hatch.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-lay-egg",
      subject: "ICON:ACTION:LAY_EGG",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-lay-egg.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-stampede",
      subject: "ICON:ACTION:STAMPEDE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-stampede.png",
      ),
    },
    {
      id: "chibi-direction-dinosaur-city-1",
      subject: "CITY:DINOSAUR:1",
      assetClass: "SETTLEMENT",
      width: 88,
      height: 96,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-dinosaur-city-1.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-city-2",
      subject: "CITY:DINOSAUR:2",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 100,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-dinosaur-city-2.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-dinosaur-city-3",
      subject: "CITY:DINOSAUR:3",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-dinosaur-city-3.png",
      ),
      fixedColours: true,
    },
  ];
