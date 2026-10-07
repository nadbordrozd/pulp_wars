import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Candy production art (bead pulp_wars-jdb.5, batches `direction-candy`
 * and `naval-candy`; see docs/art/factions/CANDY.md): cotton-candy pink
 * glaze and frosting, marshmallow white and cream, caramel, biscuit and
 * chocolate, a hard white shine on every glossy surface and a little mint
 * trim. No sprite has an owner area or a mask (`fixedColours`): the faction
 * look alone says "Candy", as the live look has no base plates.
 *
 * The eight unit sprites, their portraits, City 1-3 (a gingerbread house
 * growing into a cake castle), the Crumbs marker, eleven command, ability,
 * status and technology icons, the faction emblem and seven effect
 * sprites; and, apart, the Candy naval set.
 *
 * **Registered** in the live direction registry and the naval list by the
 * Candy engine bead (pulp_wars-jdb.3), which draws the units, portraits,
 * cities and ships; the Candy UI bead (pulp_wars-jdb.6) draws the rest
 * (CANDY.md, "Wiring list").
 */
export const CHIBI_DIRECTION_CANDY_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-direction-candy-gumdrop",
    subject: "UNIT:CANDY:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-candy-gumdrop.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-donut-racer",
    subject: "UNIT:CANDY:RAIDER",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-donut-racer.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-gumball-gunner",
    subject: "UNIT:CANDY:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-gumball-gunner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-marshmallow",
    subject: "UNIT:CANDY:GUARD",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-marshmallow.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-confectioner",
    subject: "UNIT:CANDY:CAPTAIN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-confectioner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-pie-launcher",
    subject: "UNIT:CANDY:CATAPULT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-pie-launcher.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-gummy-bear",
    subject: "UNIT:CANDY:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-candy-gummy-bear.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-rock-candy-golem",
    subject: "UNIT:CANDY:JUGGERNAUT",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-candy-rock-candy-golem.png",
    ),
    fixedColours: true,
  },
  // The Jawbreaker (ruleset 7r55, bead pulp_wars-2yc.34): the ninth art slot.
  {
    id: "chibi-direction-candy-jawbreaker",
    subject: "UNIT:CANDY:SWORDSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-candy-jawbreaker.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-jawbreaker",
    subject: "PORTRAIT:CANDY:SWORDSMAN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-jawbreaker.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-gumdrop",
    subject: "PORTRAIT:CANDY:FIGHTER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-gumdrop.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-donut-racer",
    subject: "PORTRAIT:CANDY:RAIDER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-donut-racer.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-gumball-gunner",
    subject: "PORTRAIT:CANDY:MARKSMAN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-gumball-gunner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-marshmallow",
    subject: "PORTRAIT:CANDY:GUARD",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-marshmallow.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-confectioner",
    subject: "PORTRAIT:CANDY:CAPTAIN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-confectioner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-pie-launcher",
    subject: "PORTRAIT:CANDY:CATAPULT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-pie-launcher.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-gummy-bear",
    subject: "PORTRAIT:CANDY:KNIGHT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-gummy-bear.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-candy-rock-candy-golem",
    subject: "PORTRAIT:CANDY:JUGGERNAUT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-candy-rock-candy-golem.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-city-1",
    subject: "CITY:CANDY:1",
    assetClass: "SETTLEMENT",
    width: 80,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-candy-city-1.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-city-2",
    subject: "CITY:CANDY:2",
    assetClass: "SETTLEMENT",
    width: 88,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-candy-city-2.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-city-3",
    subject: "CITY:CANDY:3",
    assetClass: "SETTLEMENT",
    width: 96,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-candy-city-3.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-candy-crumbs",
    subject: "CRUMBS",
    assetClass: "RESOURCE",
    width: 40,
    height: 40,
    url: chibiArtUrl("assets/chibi/resources/chibi-direction-candy-crumbs.png"),
  },
  {
    id: "chibi-direction-icon-action-sugar-rush",
    subject: "ICON:ACTION:SUGAR_RUSH",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-sugar-rush.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-rebake",
    subject: "ICON:ACTION:REBAKE",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-rebake.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-sugar-toss",
    subject: "ICON:ACTION:SUGAR_TOSS",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-sugar-toss.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-frosting",
    subject: "ICON:ACTION:CANDY:TEND_WOUNDED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-frosting.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-splat",
    subject: "ICON:ACTION:SPLAT",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-splat.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-bounce",
    subject: "ICON:ACTION:BOUNCE",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-bounce.png",
    ),
  },
  {
    id: "chibi-direction-icon-status-rushed",
    subject: "ICON:STATUS:RUSHED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-status-rushed.png",
    ),
  },
  {
    id: "chibi-direction-icon-status-crashed",
    subject: "ICON:STATUS:CRASHED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-status-crashed.png",
    ),
  },
  {
    id: "chibi-direction-icon-status-splatted",
    subject: "ICON:STATUS:SPLATTED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-status-splatted.png",
    ),
  },
  {
    id: "chibi-direction-icon-tech-home-sweet-home",
    subject: "ICON:TECH:CANDY:FORTIFICATION",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-tech-home-sweet-home.png",
    ),
  },
  {
    id: "chibi-direction-icon-tech-peppermint-surprise",
    subject: "ICON:TECH:CANDY:EXPLOSIVES",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-tech-peppermint-surprise.png",
    ),
  },
  {
    id: "chibi-direction-icon-candy-emblem",
    subject: "ICON:HUD:CANDY:EMBLEM",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-candy-emblem.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-gumball-shot",
    subject: "EFFECT:GUMBALL_SHOT",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-gumball-shot.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-pie",
    subject: "EFFECT:PIE",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-pie.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-splat",
    subject: "EFFECT:SPLAT",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-splat.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-sugar-toss",
    subject: "EFFECT:SUGAR_TOSS",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-sugar-toss.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-rebake-puff",
    subject: "EFFECT:REBAKE_PUFF",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-rebake-puff.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-peppermint-pop",
    subject: "EFFECT:PEPPERMINT_POP",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-peppermint-pop.png",
    ),
  },
  {
    id: "chibi-direction-effect-candy-bounce",
    subject: "EFFECT:BOUNCE",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-candy-bounce.png",
    ),
  },
];

/** The naval sprites a player sees: the two warships and the transport. */
export type CandyNavalArtRoleV7 =
  "PATROL_BOAT" | "BATTLESHIP" | "EMBARKED_TRANSPORT";

/**
 * The subjects of the Candy naval art: `UNIT:CANDY:<ROLE>` and
 * `PORTRAIT:CANDY:<ROLE>`, exactly what the live generic naval wiring
 * (bead pulp_wars-w5j.3) resolves, `navalArtSubjectV7("CANDY", kind,
 * role)` in chibi-art-v7.ts, and members of NavalFactionArtSubjectV7 once
 * the engine bead (pulp_wars-jdb.3) makes `CANDY` a FactionIdV7. Until then
 * `CANDY` is not a faction, so this module spells them out; it does not
 * import the faction naval manifest.
 */
export type CandyNavalArtSubjectV7 =
  | `UNIT:CANDY:${CandyNavalArtRoleV7}`
  | `PORTRAIT:CANDY:${Exclude<CandyNavalArtRoleV7, "EMBARKED_TRANSPORT">}`;

/**
 * A Candy naval raster: a ChibiArtAssetV7 whose subject is a Candy naval
 * subject (a ChibiArtAssetV7 outright once `CANDY` is a FactionIdV7).
 */
export type ChibiCandyNavalArtAssetV7 = Omit<ChibiArtAssetV7, "subject"> & {
  readonly subject: CandyNavalArtSubjectV7;
};

export interface ChibiCandyNavalArtV7 {
  readonly faction: "CANDY";
  readonly role: CandyNavalArtRoleV7;
  /** The map sprite (UNIT) or the interface portrait (PORTRAIT). */
  readonly kind: "UNIT" | "PORTRAIT";
  readonly asset: ChibiCandyNavalArtAssetV7;
}

/**
 * The Candy naval set (batch `naval-candy`): the entries of
 * CHIBI_NAVAL_FACTION_ART_ASSETS_V7's shape for the eighth faction, on the
 * engine bead (pulp_wars-jdb.3) appended these
 * registered yet: once `CANDY` is a FactionIdV7 the UI bead appends these
 * wiring draws them.
 * wiring draws them with no other change.
 */
export const CHIBI_DIRECTION_CANDY_NAVAL_ART_ASSETS_V7: readonly ChibiCandyNavalArtV7[] =
  [
    {
      faction: "CANDY",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-candy-patrol-boat",
        subject: "UNIT:CANDY:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-candy-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-candy-battleship",
        subject: "UNIT:CANDY:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-candy-battleship.png"),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-candy-transport",
        subject: "UNIT:CANDY:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-candy-transport.png"),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-candy-portrait-patrol-boat",
        subject: "PORTRAIT:CANDY:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-candy-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-candy-portrait-battleship",
        subject: "PORTRAIT:CANDY:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-candy-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
  ];

export {
  CANDY_MARKERS_V7,
  CANDY_PALETTE_V7,
} from "./chibi-direction-candy-presentation";
