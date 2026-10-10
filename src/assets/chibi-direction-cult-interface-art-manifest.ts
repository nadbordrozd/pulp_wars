import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * The Cult's interface art (bead pulp_wars-mch9.23, batches
 * `interface-cult` and `effects-cult`; docs/art/factions/CULT.md, "The
 * interface batches"): the twelve unit portraits (the nine trained units
 * and the three summoned ones), the three technology icons, the eighteen
 * command and ability icons, the Favour candle at two sizes, the faction
 * emblem, the eight status chips and the fifteen effect sprites. The three
 * ship portraits are with the fleet (chibi-direction-cult-art-manifest.ts
 * and the Submarine manifest).
 *
 * **Registered** in the live direction registry. The portraits and the
 * technology icons are drawn today (`portraitSubjectV7`,
 * `technologySubjectV7`). So are the Favour candle of the HUD and the
 * Sacrifice, Seize and Offering icons, which the Favour interface (bead
 * pulp_wars-mch9.17) asked for with a code glyph until these rasters
 * existed. The other command icons, the status icons, the emblem and the
 * effects belong to mechanics the engine does not have yet (the strands,
 * rituals, hexes): they are loaded and resolvable under the subjects of
 * `CultInterfaceArtSubjectV7`, and nothing asks for them until the Cult's
 * engine and interface beads do.
 */
export const CHIBI_DIRECTION_CULT_INTERFACE_ART_ASSETS_V7: readonly ChibiArtAssetV7[] =
  [
    // --- The unit portraits: busts of the seven robed cultists, the Familiar, the Thing and the summoned whole ---
    {
      id: "chibi-direction-portrait-cult-initiate",
      subject: "PORTRAIT:CULT:FIGHTER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-initiate.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-idol-bearer",
      subject: "PORTRAIT:CULT:GUARD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-idol-bearer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-familiar",
      subject: "PORTRAIT:CULT:RAIDER",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-familiar.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-hexer",
      subject: "PORTRAIT:CULT:MARKSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-hexer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-summoner",
      subject: "PORTRAIT:CULT:CAPTAIN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-summoner.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-stargazer",
      subject: "PORTRAIT:CULT:CATAPULT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-stargazer.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-caller",
      subject: "PORTRAIT:CULT:KNIGHT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-caller.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-chosen",
      subject: "PORTRAIT:CULT:SWORDSMAN",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-chosen.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-thing",
      subject: "PORTRAIT:CULT:JUGGERNAUT",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-thing.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-horror",
      subject: "PORTRAIT:CULT:HORROR",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-horror.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-herald",
      subject: "PORTRAIT:CULT:HERALD",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-herald.png",
      ),
      fixedColours: true,
    },
    {
      id: "chibi-direction-portrait-cult-tentacle",
      subject: "PORTRAIT:CULT:TENTACLE",
      assetClass: "PORTRAIT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/portraits/chibi-direction-portrait-cult-tentacle.png",
      ),
      fixedColours: true,
    },
    // --- Technology: Warding Circles, The Stars Are Right, Harvest Rites ---
    {
      id: "chibi-direction-icon-cult-tech-warding-circles",
      subject: "ICON:TECH:CULT:FORTIFICATION",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-tech-warding-circles.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-tech-stars-are-right",
      subject: "ICON:TECH:CULT:EXPLOSIVES",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-tech-stars-are-right.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-tech-harvest-rites",
      subject: "ICON:TECH:CULT:FARMING",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-tech-harvest-rites.png",
      ),
    },
    // --- Commands, rituals, hexes and abilities ---
    {
      id: "chibi-direction-icon-cult-action-sacrifice",
      subject: "ICON:ACTION:SACRIFICE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-sacrifice.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-seize",
      subject: "ICON:ACTION:SEIZE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-seize.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-offering",
      subject: "ICON:ACTION:OFFERING",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-offering.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-summon",
      subject: "ICON:ACTION:SUMMON",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-summon.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-channel",
      subject: "ICON:ACTION:CHANNEL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-channel.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-behold",
      subject: "ICON:ACTION:BEHOLD",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-behold.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-pick-me",
      subject: "ICON:ACTION:PICK_ME",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-pick-me.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-anchor",
      subject: "ICON:ACTION:ANCHOR",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-anchor.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-boo",
      subject: "ICON:ACTION:BOO",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-boo.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-proclaim",
      subject: "ICON:ACTION:PROCLAIM",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-proclaim.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-ribbit",
      subject: "ICON:ACTION:RIBBIT",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-ribbit.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-switcheroo",
      subject: "ICON:ACTION:SWITCHEROO",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-switcheroo.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-tentacle",
      subject: "ICON:ACTION:TENTACLE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-tentacle.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-starfall",
      subject: "ICON:ACTION:STARFALL",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-starfall.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-great-summoning",
      subject: "ICON:ACTION:GREAT_SUMMONING",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-great-summoning.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-pamphlets",
      subject: "ICON:ACTION:PAMPHLETS",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-pamphlets.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-martyr",
      subject: "ICON:ACTION:MARTYR",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-martyr.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-action-grab",
      subject: "ICON:ACTION:GRAB",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-action-grab.png",
      ),
    },
    // --- The HUD and the status chips ---
    {
      id: "chibi-direction-icon-cult-favour",
      subject: "ICON:HUD:CULT:FAVOUR",
      assetClass: "ICON",
      width: 32,
      height: 32,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-favour.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-favour-large",
      subject: "ICON:HUD:CULT:FAVOUR_LARGE",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-favour-large.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-emblem",
      subject: "ICON:HUD:CULT:EMBLEM",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-emblem.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-candlelit",
      subject: "ICON:STATUS:CANDLELIT",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-candlelit.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-frog",
      subject: "ICON:STATUS:FROG",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-frog.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-unbound",
      subject: "ICON:STATUS:UNBOUND",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-unbound.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-furious",
      subject: "ICON:STATUS:FURIOUS",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-furious.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-grabbed",
      subject: "ICON:STATUS:GRABBED",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-grabbed.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-cowed",
      subject: "ICON:STATUS:COWED",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-cowed.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-warded",
      subject: "ICON:STATUS:WARDED",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-warded.png",
      ),
    },
    {
      id: "chibi-direction-icon-cult-status-pick-me",
      subject: "ICON:STATUS:PICK_ME",
      assetClass: "ICON",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/icons/chibi-direction-icon-cult-status-pick-me.png",
      ),
    },
    // --- The effect sprites (batch `effects-cult`, palette cult-green.png) ---
    {
      id: "chibi-direction-effect-cult-sacrifice-puff",
      subject: "EFFECT:SACRIFICE_PUFF",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-sacrifice-puff.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-seize",
      subject: "EFFECT:SEIZE",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-seize.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-summon-pop",
      subject: "EFFECT:SUMMON_POP",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-summon-pop.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-strand-snap",
      subject: "EFFECT:STRAND_SNAP",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-strand-snap.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-unbound",
      subject: "EFFECT:UNBOUND",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-unbound.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-starfall-star",
      subject: "EFFECT:STARFALL_STAR",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-starfall-star.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-starfall-burst",
      subject: "EFFECT:STARFALL_BURST",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-starfall-burst.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-boo",
      subject: "EFFECT:BOO",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-boo.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-ribbit",
      subject: "EFFECT:RIBBIT",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-ribbit.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-switcheroo",
      subject: "EFFECT:SWITCHEROO",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-switcheroo.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-tentacle-slap",
      subject: "EFFECT:TENTACLE_SLAP",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-tentacle-slap.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-proclaim",
      subject: "EFFECT:PROCLAIM",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-proclaim.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-pamphlets",
      subject: "EFFECT:PAMPHLETS",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-pamphlets.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-favour",
      subject: "EFFECT:FAVOUR",
      assetClass: "EFFECT",
      width: 40,
      height: 40,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-favour.png",
      ),
    },
    {
      id: "chibi-direction-effect-cult-ritual-fizzle",
      subject: "EFFECT:RITUAL_FIZZLE",
      assetClass: "EFFECT",
      width: 48,
      height: 48,
      url: chibiArtUrl(
        "assets/chibi/effects/chibi-direction-effect-cult-ritual-fizzle.png",
      ),
    },
  ];
