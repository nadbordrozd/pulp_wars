import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Martian production art (bead pulp_wars-t6s.6, batch `direction-martian`;
 * see docs/art/factions/MARTIAN.md): retro pulp invaders in fixed faction
 * colours, polished chrome and gunmetal, lavender-grey skin under glass
 * bubble helmets and one hot magenta accent. No sprite has an owner area or
 * a mask (`fixedColours`); the player is read from the base plate, the
 * pennant and the border.
 *
 * The eight unit sprites (the land roles), their portraits, seven command,
 * ability and status icons, five ability effect sprites and City 1-3 (a
 * landed-saucer colony). The Thrall's sprite and portrait are retired (bead
 * pulp_wars-b5f.3: a mind-controlled unit keeps its own sprite).
 *
 * Since bead `pulp_wars-t6s.4` this list is registered in the direction
 * registry (chibiDirectionArtRegistryV7), MARTIAN_FLAG_ANCHORS_V7 is part of
 * DIRECTION_FLAG_ANCHORS_V7, and the board draws the flyers' lift and
 * shadow from MARTIAN_FLYER_PRESENTATION_V7.
 */
export const CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-martian-grunt",
      subject: "UNIT:MARTIAN:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-martian-grunt.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-saucer",
      subject: "UNIT:MARTIAN:RAIDER",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-martian-saucer.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-ray-gunner",
      subject: "UNIT:MARTIAN:MARKSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-martian-ray-gunner.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-shield-projector",
      subject: "UNIT:MARTIAN:GUARD",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-martian-shield-projector.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-brain",
      subject: "UNIT:MARTIAN:CAPTAIN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-martian-brain.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-tripod",
      subject: "UNIT:MARTIAN:CATAPULT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-martian-tripod.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-mothership",
      subject: "UNIT:MARTIAN:KNIGHT",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-martian-mothership.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-colossus",
      subject: "UNIT:MARTIAN:JUGGERNAUT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 104,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-martian-colossus.png",
      ),
      fixedColours: true,
    },
    // The Shock Trooper (ruleset 7r55, bead pulp_wars-2yc.34): the ninth art
    // slot.
    {
      id: "chibi-direction-martian-shock-trooper",
      subject: "UNIT:MARTIAN:SWORDSMAN",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-martian-shock-trooper.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-shock-trooper",
      subject: "PORTRAIT:MARTIAN:SWORDSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-shock-trooper.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-grunt",
      subject: "PORTRAIT:MARTIAN:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-grunt.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-saucer",
      subject: "PORTRAIT:MARTIAN:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-saucer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-ray-gunner",
      subject: "PORTRAIT:MARTIAN:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-ray-gunner.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-shield-projector",
      subject: "PORTRAIT:MARTIAN:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-shield-projector.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-brain",
      subject: "PORTRAIT:MARTIAN:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-brain.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-tripod",
      subject: "PORTRAIT:MARTIAN:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-tripod.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-mothership",
      subject: "PORTRAIT:MARTIAN:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-mothership.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-martian-colossus",
      subject: "PORTRAIT:MARTIAN:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-martian-colossus.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-city-1",
      subject: "CITY:MARTIAN:1",
      assetClass: "SETTLEMENT",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-martian-city-1.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-city-2",
      subject: "CITY:MARTIAN:2",
      assetClass: "SETTLEMENT",
      width: 88,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-martian-city-2.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-martian-city-3",
      subject: "CITY:MARTIAN:3",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/settlements/chibi-direction-martian-city-3.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-icon-action-beam-down",
      subject: "ICON:ACTION:BEAM_DOWN",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-beam-down.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-force-field",
      subject: "ICON:ACTION:FORCE_FIELD",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-force-field.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-martian-rally",
      subject: "ICON:ACTION:MARTIAN:RALLY",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-martian-rally.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-mind-control",
      subject: "ICON:ACTION:MIND_CONTROL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-mind-control.png",
      ),
    },
    {
      id: "chibi-direction-icon-action-tractor-beam",
      subject: "ICON:ACTION:TRACTOR_BEAM",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-action-tractor-beam.png",
      ),
    },
    {
      id: "chibi-direction-icon-status-cooling",
      subject: "ICON:STATUS:COOLING",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-status-cooling.png",
      ),
    },
    {
      id: "chibi-direction-icon-status-shield",
      subject: "ICON:STATUS:SHIELD",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-status-shield.png",
      ),
    },
    {
      id: "chibi-direction-effect-martian-beam-down",
      subject: "EFFECT:BEAM_DOWN",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-martian-beam-down.png",
      ),
    },
    {
      id: "chibi-direction-effect-martian-heat-ray",
      subject: "EFFECT:HEAT_RAY",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-martian-heat-ray.png",
      ),
    },
    {
      id: "chibi-direction-effect-martian-mind-control",
      subject: "EFFECT:MIND_CONTROL",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-martian-mind-control.png",
      ),
    },
    {
      id: "chibi-direction-effect-martian-shield-flare",
      subject: "EFFECT:SHIELD_FLARE",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-martian-shield-flare.png",
      ),
    },
    {
      id: "chibi-direction-effect-martian-tractor-beam",
      subject: "EFFECT:TRACTOR_BEAM",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-martian-tractor-beam.png",
      ),
    },
  ];

export {
  MARTIAN_FLAG_ANCHORS_V7,
  MARTIAN_FLYER_PRESENTATION_V7,
  MARTIAN_PALETTE_V7,
} from "./chibi-direction-martian-presentation";
