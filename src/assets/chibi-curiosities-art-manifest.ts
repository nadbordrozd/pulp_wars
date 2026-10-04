import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Map curiosity art (bead pulp_wars-737.5, batch `curiosities`; see
 * docs/art/classes/curiosities.md): the neutral Giant Spider and its
 * portrait, the four 80 x 80 tile overlays (the lair web, the Fountain of
 * Youth, the Shrine, the Sunken Wreck), their legend icons and the bounty
 * icon, three effect sprites and the provoked marker. Faction-less: no
 * owner area and no mask; the Spider and its portrait are `fixedColours`.
 *
 * Registered in the live direction registry by the curiosities UI bead
 * (pulp_wars-737.6, chibiDirectionArtRegistryV7). The classic look and the
 * LEGACY art set have no curiosity rasters and draw the code markers of
 * src/render/canvas/curiosity-canvas-v7.ts.
 */
export const CHIBI_CURIOSITIES_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-curiosity-giant-spider",
    subject: "UNIT:MONSTER_GIANT_SPIDER",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 72,
    url: chibiArtUrl("assets/chibi/units/chibi-curiosity-giant-spider.png"),
    fixedColours: true,
  },
  {
    id: "chibi-curiosity-portrait-giant-spider",
    subject: "PORTRAIT:MONSTER_GIANT_SPIDER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-curiosity-portrait-giant-spider.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-curiosity-web",
    subject: "CURIOSITY:WEB",
    assetClass: "BUILDING",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-web.png"),
  },
  {
    id: "chibi-curiosity-fountain",
    subject: "CURIOSITY:FOUNTAIN",
    assetClass: "BUILDING",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-fountain.png"),
  },
  {
    id: "chibi-curiosity-shrine",
    subject: "CURIOSITY:SHRINE",
    assetClass: "BUILDING",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-shrine.png"),
  },
  {
    id: "chibi-curiosity-wreck",
    subject: "CURIOSITY:WRECK",
    assetClass: "BUILDING",
    width: 80,
    height: 80,
    url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-wreck.png"),
  },
  {
    id: "chibi-curiosity-icon-web",
    subject: "ICON:CURIOSITY:WEB",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-web.png"),
  },
  {
    id: "chibi-curiosity-icon-fountain",
    subject: "ICON:CURIOSITY:FOUNTAIN",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-fountain.png"),
  },
  {
    id: "chibi-curiosity-icon-shrine",
    subject: "ICON:CURIOSITY:SHRINE",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-shrine.png"),
  },
  {
    id: "chibi-curiosity-icon-wreck",
    subject: "ICON:CURIOSITY:WRECK",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-wreck.png"),
  },
  {
    id: "chibi-curiosity-icon-bounty",
    subject: "ICON:CURIOSITY:BOUNTY",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-bounty.png"),
  },
  {
    id: "chibi-curiosity-effect-fountain-heal",
    subject: "EFFECT:FOUNTAIN_HEAL",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-curiosity-effect-fountain-heal.png",
    ),
  },
  {
    id: "chibi-curiosity-effect-shrine-blessing",
    subject: "EFFECT:SHRINE_BLESSING",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-curiosity-effect-shrine-blessing.png",
    ),
  },
  {
    id: "chibi-curiosity-effect-salvage-coins",
    subject: "EFFECT:SALVAGE_COINS",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-curiosity-effect-salvage-coins.png",
    ),
  },
  {
    id: "chibi-curiosity-status-provoked",
    subject: "STATUS:PROVOKED",
    assetClass: "STATUS",
    width: 32,
    height: 32,
    url: chibiArtUrl("assets/chibi/status/chibi-curiosity-status-provoked.png"),
  },
];

/**
 * Where the Giant Spider touches the ground, measured on its master by
 * scripts/art/unit-shadows/measure.ts: the same numbers as its entry in
 * unit-shadow-measurements-v7.generated.ts, which the board's shadow is
 * anchored from (a test checks both against the master). The lowest
 * rows hold a single leg tip, so a ground shadow should take its width from
 * the base band (the spread legs), not from the foot band.
 */
export const GIANT_SPIDER_SHADOW_MEASUREMENT_V7 = {
  assetId: "chibi-curiosity-giant-spider",
  assetClass: "GIANT_UNIT",
  width: 88,
  height: 72,
  contactY: 67,
  footLeft: 18,
  footRight: 25,
  baseLeft: 6,
  baseRight: 81,
} as const;
