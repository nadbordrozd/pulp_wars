import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Undead production art of the new visual direction (bead pulp_wars-3tq.12,
 * batch `direction-undead`, and the four violet effect sprites of batch
 * `effects-undead`; see docs/art/VISUAL_DIRECTION_2026-10.md, "Undead
 * production", and docs/art/factions/UNDEAD.md).
 *
 * Every Undead land unit and its portrait in the faction's fixed colours:
 * a lot of pale bone, near-black cloth, pallid ash grey flesh and one violet
 * accent, with no owner area and no mask (`fixedColours`). The four Undead
 * command icons and four ability effects in the same violet, and City 1-3
 * as a dark slate necropolis with bone trim and violet windows, whose
 * pennant is drawn in code (DIRECTION_FLAG_ANCHORS_V7).
 *
 * The entries use the subjects of the classic Undead art but live in the
 * direction's registry (chibiDirectionArtRegistryV7), so the classic look
 * and LEGACY are unchanged, and a raster that fails to load falls back to
 * the classic asset of its subject. The Plague and Bitten markers, the cure
 * sparkle, the Grave and the ships are not converted.
 */
export const CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-undead-skeleton",
      subject: "UNIT:UNDEAD:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-undead-skeleton.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-ghoul",
      subject: "UNIT:UNDEAD:RAIDER",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-ghoul.png"),
      // As the classic Ghoul: 4 px right of the default.
      anchor: { x: 32, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-banshee",
      subject: "UNIT:UNDEAD:MARKSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-banshee.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-zombie",
      subject: "UNIT:UNDEAD:GUARD",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-zombie.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-necromancer",
      subject: "UNIT:UNDEAD:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-undead-necromancer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-lich",
      subject: "UNIT:UNDEAD:CATAPULT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-lich.png"),
      // As the classic Lich: 7 px right of the default (the wide robe hem).
      anchor: { x: 29, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-vampire",
      subject: "UNIT:UNDEAD:KNIGHT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-vampire.png"),
      // As the classic Vampire: 3 px right of the default (the left cape wing).
      anchor: { x: 33, y: 48 },
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-abomination",
      subject: "UNIT:UNDEAD:JUGGERNAUT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-undead-abomination.png",
      ),
      fixedColours: true,
    },
    // The Wight (ruleset 7r55, bead pulp_wars-2yc.34): the ninth art slot.
    {
      id: "chibi-direction-undead-wight",
      subject: "UNIT:UNDEAD:SWORDSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-undead-wight.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-wight",
      subject: "PORTRAIT:UNDEAD:SWORDSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-wight.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-skeleton",
      subject: "PORTRAIT:UNDEAD:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-skeleton.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-ghoul",
      subject: "PORTRAIT:UNDEAD:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-ghoul.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-banshee",
      subject: "PORTRAIT:UNDEAD:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-banshee.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-zombie",
      subject: "PORTRAIT:UNDEAD:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-zombie.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-necromancer",
      subject: "PORTRAIT:UNDEAD:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-necromancer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-lich",
      subject: "PORTRAIT:UNDEAD:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-lich.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-vampire",
      subject: "PORTRAIT:UNDEAD:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-vampire.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-undead-abomination",
      subject: "PORTRAIT:UNDEAD:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-undead-abomination.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-icon-action-raise-dead",
      subject: "ICON:ACTION:RAISE_DEAD",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-raise-dead.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-devour",
      subject: "ICON:ACTION:DEVOUR",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-devour.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-wail",
      subject: "ICON:ACTION:WAIL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-wail.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-undead-rally",
      subject: "ICON:ACTION:UNDEAD:RALLY",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-undead-rally.png",
      ),
    },
    {
      id: "chibi-direction-undead-city-1",
      subject: "CITY:UNDEAD:1",
      assetClass: "SETTLEMENT",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-undead-city-1.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-city-2",
      subject: "CITY:UNDEAD:2",
      assetClass: "SETTLEMENT",
      width: 88,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-undead-city-2.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-undead-city-3",
      subject: "CITY:UNDEAD:3",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-undead-city-3.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-effect-wail",
      subject: "EFFECT:WAIL",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl("assets/chibi/effects/chibi-direction-effect-wail.png"),
    },
    {
      id: "chibi-direction-effect-splash",
      subject: "EFFECT:SPLASH",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-splash.png",
      ),
    },
    {
      id: "chibi-direction-effect-raise",
      subject: "EFFECT:RAISE",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl("assets/chibi/effects/chibi-direction-effect-raise.png"),
    },
    {
      id: "chibi-direction-effect-wisp",
      subject: "EFFECT:WISP",
      assetClass: "EFFECT",
      width: 24,
      height: 24,
      url: chibiArtUrl("assets/chibi/effects/chibi-direction-effect-wisp.png"),
    },
  ];
