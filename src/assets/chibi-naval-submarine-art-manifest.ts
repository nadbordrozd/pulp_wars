import { chibiArtUrl } from "./chibi-art-manifest";
import type { ChibiNavalFactionArtV7 } from "./chibi-naval-faction-art-manifest";

/**
 * The anchor of every Submarine map sprite, shared and faction, surfaced
 * and submerged: 4 px left of the class placement (36, 48), so the sprite
 * is drawn 4 px to the right and its tail (and, sunk, its hull) stays clear
 * of the HP bar and seat badge strips on the left of the cell.
 */
export const SUBMARINE_ANCHOR_V7 = { x: 32, y: 48 } as const;

/**
 * The Submarines of the naval branch (bead pulp_wars-5ti.6, batches
 * `naval-human`, `naval-undead`, `naval-goblin`, `naval-dinosaur`,
 * `naval-martian`, `naval-dwarf` and `naval-candy`; see
 * docs/art/NAVAL_FACTIONS.md, "The Submarines"): one map sprite and one
 * portrait for each seafaring faction, in its fleet's fixed colours, on the
 * Patrol Boat's canvas, class, anchor and waterline. Each map sprite is an
 * edit of that faction's accepted Patrol Boat (the Human one of the shared
 * Submarine), so the materials are the fleet's.
 *
 * The Ice Folk have none: they lose their ships in engine step II of the
 * naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 8). Until
 * then an Ice Folk Submarine falls back to the shared Submarine in the
 * owner's colour, like any faction naval subject without a raster
 * (chibiFallbackSubjectV7).
 *
 * CHIBI_NAVAL_FACTION_ART_ASSETS_V7 ends with these entries, so the live
 * registry holds them and the generic naval wiring draws them; the Classic
 * look draws the shared `chibi-submarine` of chibi-art-manifest.ts.
 */
export const CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7: readonly ChibiNavalFactionArtV7[] =
  [
    {
      faction: "ORIGINAL",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-human-submarine",
        subject: "UNIT:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-human-submarine.png"),
        fixedColours: true,
      },
    },
    {
      faction: "ORIGINAL",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-human-portrait-submarine",
        subject: "PORTRAIT:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-human-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-undead-submarine",
        subject: "UNIT:UNDEAD:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-undead-submarine.png"),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-undead-portrait-submarine",
        subject: "PORTRAIT:UNDEAD:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-undead-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-goblin-submarine",
        subject: "UNIT:GOBLIN:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-goblin-submarine.png"),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-goblin-portrait-submarine",
        subject: "PORTRAIT:GOBLIN:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-goblin-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dinosaur-submarine",
        subject: "UNIT:DINOSAUR:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dinosaur-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dinosaur-portrait-submarine",
        subject: "PORTRAIT:DINOSAUR:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dinosaur-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-martian-submarine",
        subject: "UNIT:MARTIAN:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-martian-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-martian-portrait-submarine",
        subject: "PORTRAIT:MARTIAN:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-martian-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dwarf-submarine",
        subject: "UNIT:DWARF:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-dwarf-submarine.png"),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dwarf-portrait-submarine",
        subject: "PORTRAIT:DWARF:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dwarf-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "SUBMARINE",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-candy-submarine",
        subject: "UNIT:CANDY:SUBMARINE",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-candy-submarine.png"),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "SUBMARINE",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-candy-portrait-submarine",
        subject: "PORTRAIT:CANDY:SUBMARINE",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-candy-portrait-submarine.png",
        ),
        fixedColours: true,
      },
    },
  ];

/**
 * The same seven Submarines riding low in the water (`SUBMARINE_SUBMERGED`):
 * each is derived from its surfaced master above by
 * scripts/art/naval-branch/submerged.ts (the sprite sunk seven rows, the
 * hull under the waterline a faint ghost, foam where it meets the water),
 * with no PixelLab call; `npm run art:validate` re-derives them. The live
 * registry holds them (chibiDirectionArtRegistryV7). The Classic look has
 * none (its registry holds only accepted pipeline assets): there, and for a
 * faction without one, a submerged Submarine falls back to the shared
 * surfaced Submarine (chibiFallbackSubjectV7). The board asks for them for
 * a submerged Submarine (unitArtSubjectV7's `submerged`).
 */
export const CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7: readonly ChibiNavalFactionArtV7[] =
  [
    {
      faction: "ORIGINAL",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-human-submarine-submerged",
        subject: "UNIT:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-human-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-undead-submarine-submerged",
        subject: "UNIT:UNDEAD:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-undead-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-goblin-submarine-submerged",
        subject: "UNIT:GOBLIN:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-goblin-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dinosaur-submarine-submerged",
        subject: "UNIT:DINOSAUR:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dinosaur-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-martian-submarine-submerged",
        subject: "UNIT:MARTIAN:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-martian-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dwarf-submarine-submerged",
        subject: "UNIT:DWARF:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dwarf-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "CANDY",
      role: "SUBMARINE_SUBMERGED",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-candy-submarine-submerged",
        subject: "UNIT:CANDY:SUBMARINE_SUBMERGED",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        anchor: SUBMARINE_ANCHOR_V7,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-candy-submarine-submerged.png",
        ),
        fixedColours: true,
      },
    },
  ];
