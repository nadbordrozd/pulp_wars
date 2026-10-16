import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * The Cult redesign's art in the runtime: the one manifest of batch
 * `summons-cult` (bead pulp_wars-mch9.45; docs/art/factions/CULT.md, "The
 * redesign's summons"). Each piece is registered as it comes into play:
 *
 * - the Imp's sprite, its Unbound look and its portrait with engine bead
 *   `pulp_wars-mch9.36`, which put the Imp on the board;
 * - the Hunger bowl (`ICON:HUD:CULT:HUNGER`) with the Favour display of bead
 *   `pulp_wars-mch9.42` (the "Hunger 2" chip of a bound Herald's card and of
 *   the End Turn question);
 * - the Gibbering Mass's sprite, its Unbound look and its portrait with
 *   engine bead `pulp_wars-mch9.37`, which put the Mass on the board.
 *
 * The other icons wait for the beads that put them on the board (U-R2,
 * U-R3), which add them here.
 */
export const CHIBI_DIRECTION_CULT_SUMMONS_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    {
      id: "chibi-direction-cult-imp",
      subject: "UNIT:CULT:IMP",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-imp.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-cult-imp-unbound",
      subject: "UNIT:CULT:IMP_UNBOUND",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-cult-imp-unbound.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-imp",
      subject: "PORTRAIT:CULT:IMP",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-imp.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-icon-cult-hunger",
      subject: "ICON:HUD:CULT:HUNGER",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-hunger.png",
      ),
    },
    {
      id: "chibi-direction-cult-mass",
      subject: "UNIT:CULT:MASS",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-mass.png"),
      fixedColours: true,
    },
    {
      id: "chibi-direction-cult-mass-unbound",
      subject: "UNIT:CULT:MASS_UNBOUND",
      assetClass: "LARGE_UNIT",
      width: 72,
      height: 88,
      url: chibiArtUrl(
        "assets/chibi/units/chibi-direction-cult-mass-unbound.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-mass",
      subject: "PORTRAIT:CULT:MASS",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-mass.png",
      ),
      fixedColours: true,
    },
  ];
