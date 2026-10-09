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

/**
 * Round-2 map curiosity art (bead pulp_wars-737.13, batch `curiosities-2`;
 * docs/art/classes/curiosities.md section 8): the neutral Bigfoot and its
 * portrait, the Downed Saucer, the Graveyard, the Dimensional Gate (one look
 * for both gates) and the Wishing Well as 80 x 80 tile overlays, their five
 * legend icons, and the gate-traverse and coin-splash effects. Faction-less:
 * no owner area and no mask; Bigfoot and its portrait are `fixedColours`.
 * The camp guards reuse the Martian and Undead unit sprites.
 *
 * Registered in the live direction registry (chibiDirectionArtRegistryV7,
 * so the preload fetches them) and drawn since the round-2 UI bead
 * (pulp_wars-737.16), which also added Bigfoot's entry to the unit-shadow
 * table, as pulp_wars-737.6 did for the Spider.
 */
export const CHIBI_CURIOSITIES_ROUND2_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-curiosity-bigfoot",
      subject: "UNIT:NEUTRAL_BIGFOOT",
      assetClass: "GIANT_UNIT",
      width: 88,
      height: 96,
      url: chibiArtUrl("assets/chibi/units/chibi-curiosity-bigfoot.png"),
      fixedColours: true,
    },
    {
      id: "chibi-curiosity-portrait-bigfoot",
      subject: "PORTRAIT:NEUTRAL_BIGFOOT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-curiosity-portrait-bigfoot.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-curiosity-downed-saucer",
      subject: "CURIOSITY:DOWNED_SAUCER",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-curiosity-downed-saucer.png",
      ),
    },
    {
      id: "chibi-curiosity-graveyard",
      subject: "CURIOSITY:GRAVEYARD",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-graveyard.png"),
    },
    {
      id: "chibi-curiosity-gate",
      subject: "CURIOSITY:GATE",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl("assets/chibi/buildings/chibi-curiosity-gate.png"),
    },
    {
      id: "chibi-curiosity-wishing-well",
      subject: "CURIOSITY:WISHING_WELL",
      assetClass: "BUILDING",
      width: 80,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/buildings/chibi-curiosity-wishing-well.png",
      ),
    },
    {
      id: "chibi-curiosity-icon-downed-saucer",
      subject: "ICON:CURIOSITY:DOWNED_SAUCER",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-curiosity-icon-downed-saucer.png",
      ),
    },
    {
      id: "chibi-curiosity-icon-graveyard",
      subject: "ICON:CURIOSITY:GRAVEYARD",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-graveyard.png"),
    },
    {
      id: "chibi-curiosity-icon-gate",
      subject: "ICON:CURIOSITY:GATE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-gate.png"),
    },
    {
      id: "chibi-curiosity-icon-bigfoot",
      subject: "ICON:CURIOSITY:BIGFOOT",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl("assets/chibi/icons/chibi-curiosity-icon-bigfoot.png"),
    },
    {
      id: "chibi-curiosity-icon-wishing-well",
      subject: "ICON:CURIOSITY:WISHING_WELL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-curiosity-icon-wishing-well.png",
      ),
    },
    {
      id: "chibi-curiosity-effect-gate-traverse",
      subject: "EFFECT:GATE_TRAVERSE",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-curiosity-effect-gate-traverse.png",
      ),
    },
    {
      id: "chibi-curiosity-effect-coin-splash",
      subject: "EFFECT:COIN_SPLASH",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-curiosity-effect-coin-splash.png",
      ),
    },
  ];

/**
 * Where Bigfoot touches the ground, measured on its master by
 * scripts/art/unit-shadows/measure.ts (a test checks it), the shadow
 * table entry of the board: both huge feet sit on the contact line, so
 * the foot band and the base band nearly agree.
 */
export const BIGFOOT_SHADOW_MEASUREMENT_V7 = {
  assetId: "chibi-curiosity-bigfoot",
  assetClass: "GIANT_UNIT",
  width: 88,
  height: 96,
  contactY: 89,
  footLeft: 21,
  footRight: 66,
  baseLeft: 21,
  baseRight: 69,
} as const;
