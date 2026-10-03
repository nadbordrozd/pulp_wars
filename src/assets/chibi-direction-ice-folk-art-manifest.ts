import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Ice Folk production art (bead pulp_wars-7g3.5, batch `direction-ice-folk`;
 * see docs/art/factions/ICE_FOLK.md): "frost and fur" in fixed faction
 * colours, warm white and cream fur shaded warm taupe, charcoal slate faces
 * on the beasts, dark brown-grey hide, ivory bone and one deep ice-blue
 * accent. No sprite has an owner area or a mask (`fixedColours`); the
 * player is read from the base plate, the pennant and the border.
 *
 * The eight unit sprites, their portraits, ten command, ability, technology
 * and status icons, five effect sprites and City 1-3 (an igloo settlement
 * with a bone pole for the pennant).
 *
 * **Nothing imports this module yet** except the review scenes. The faction
 * is added to the engine and the interface by other beads;
 * `pulp_wars-7g3.6` registers this list in the direction registry
 * (chibiDirectionArtRegistryV7), copies ICE_FOLK_FLAG_ANCHORS_V7 into
 * DIRECTION_FLAG_ANCHORS_V7, and draws the Snow overlay, the Blizzard and
 * the Chill markers from chibi-direction-ice-folk-presentation.ts.
 */
export const CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-ice-folk-yeti",
      subject: "UNIT:ICE_FOLK:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-ice-folk-yeti.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-sled",
      subject: "UNIT:ICE_FOLK:RAIDER",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-ice-folk-sled.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-snow-hunter",
      subject: "UNIT:ICE_FOLK:MARKSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-snow-hunter.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-mammoth",
      subject: "UNIT:ICE_FOLK:GUARD",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-mammoth.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-ice-witch",
      subject: "UNIT:ICE_FOLK:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-ice-witch.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-boulder-yeti",
      subject: "UNIT:ICE_FOLK:CATAPULT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-boulder-yeti.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-sabretooth",
      subject: "UNIT:ICE_FOLK:KNIGHT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-sabretooth.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-frost-giant",
      subject: "UNIT:ICE_FOLK:JUGGERNAUT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-ice-folk-frost-giant.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-yeti",
      subject: "PORTRAIT:ICE_FOLK:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-yeti.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-sled",
      subject: "PORTRAIT:ICE_FOLK:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-sled.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-snow-hunter",
      subject: "PORTRAIT:ICE_FOLK:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-snow-hunter.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-mammoth",
      subject: "PORTRAIT:ICE_FOLK:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-mammoth.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-ice-witch",
      subject: "PORTRAIT:ICE_FOLK:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-ice-witch.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-boulder-yeti",
      subject: "PORTRAIT:ICE_FOLK:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-boulder-yeti.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-sabretooth",
      subject: "PORTRAIT:ICE_FOLK:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-sabretooth.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-ice-folk-frost-giant",
      subject: "PORTRAIT:ICE_FOLK:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-ice-folk-frost-giant.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-city-1",
      subject: "CITY:ICE_FOLK:1",
      assetClass: "SETTLEMENT",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-ice-folk-city-1.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-city-2",
      subject: "CITY:ICE_FOLK:2",
      assetClass: "SETTLEMENT",
      width: 88,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-ice-folk-city-2.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-ice-folk-city-3",
      subject: "CITY:ICE_FOLK:3",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-ice-folk-city-3.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-icon-action-cold-snap",
      subject: "ICON:ACTION:COLD_SNAP",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-cold-snap.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-prowl",
      subject: "ICON:ACTION:PROWL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-prowl.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-rockfall",
      subject: "ICON:ACTION:ROCKFALL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-rockfall.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-shatter",
      subject: "ICON:ACTION:SHATTER",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-shatter.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-sweep",
      subject: "ICON:ACTION:SWEEP",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-sweep.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-throw-bolas",
      subject: "ICON:ACTION:THROW_BOLAS",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-throw-bolas.png",
      ),
    },
    {
      id: "chibi-direction-icon-status-chilled",
      subject: "ICON:STATUS:CHILLED",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-status-chilled.png",
      ),
    },
    {
      id: "chibi-direction-icon-status-frozen",
      subject: "ICON:STATUS:FROZEN",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-status-frozen.png",
      ),
    },
    {
      id: "chibi-direction-icon-tech-brittle",
      subject: "ICON:TECH:ICE_FOLK:EXPLOSIVES",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-tech-brittle.png",
      ),
    },
    {
      id: "chibi-direction-icon-tech-deep-winter",
      subject: "ICON:TECH:ICE_FOLK:FORTIFICATION",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-tech-deep-winter.png",
      ),
    },
    {
      id: "chibi-direction-effect-ice-folk-bolas",
      subject: "EFFECT:BOLAS",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-ice-folk-bolas.png",
      ),
    },
    {
      id: "chibi-direction-effect-ice-folk-cold-snap",
      subject: "EFFECT:COLD_SNAP",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-ice-folk-cold-snap.png",
      ),
    },
    {
      id: "chibi-direction-effect-ice-folk-frost-hit",
      subject: "EFFECT:FROST_HIT",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-ice-folk-frost-hit.png",
      ),
    },
    {
      id: "chibi-direction-effect-ice-folk-shatter",
      subject: "EFFECT:SHATTER",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-ice-folk-shatter.png",
      ),
    },
    {
      id: "chibi-direction-effect-ice-folk-shatter-shards",
      subject: "EFFECT:SHATTER_SHARDS",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-ice-folk-shatter-shards.png",
      ),
    },
  ];

export {
  ICE_FOLK_CHILL_MARKER_V7,
  ICE_FOLK_FLAG_ANCHORS_V7,
  ICE_FOLK_PALETTE_V7,
  ICE_FOLK_SHATTER_TIMELINE_V7,
  ICE_FOLK_SNOW_OVERLAY_V7,
  ICE_FOLK_BLIZZARD_V7,
} from "./chibi-direction-ice-folk-presentation";
