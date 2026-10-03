import type { FactionIdV7 } from "../engine/index";
import type { ArtSubjectV7, ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Faction-styled naval art (bead pulp_wars-w5j.2, batches `naval-human`,
 * `naval-undead`, `naval-goblin`, `naval-dinosaur`, `naval-martian` and
 * `naval-ice-folk`; see docs/art/NAVAL_FACTIONS.md). Every faction gets its
 * own Patrol Boat, Battleship and embarked transport, and portraits of the
 * two warships, in its fixed colours: no owner area and no mask
 * (`fixedColours`), on the canvases and anchors of the shared ships they
 * replace.
 *
 * **Not registered yet.** No game module imports this file: today every
 * faction's naval units are the shared ships (`UNIT:PATROL_BOAT`,
 * `UNIT:BATTLESHIP`, `UNIT:EMBARKED_TRANSPORT`, `PORTRAIT:PATROL_BOAT`,
 * `PORTRAIT:BATTLESHIP`) with a player-coloured sail in a ring. Bead
 * `pulp_wars-w5j.3` removes the base plates and rings and wires this art in
 * (NAVAL_FACTIONS.md, "Wiring list"). Until then the subjects of the five
 * non-Human factions (`UNIT:<FACTION>:<ROLE>`, `PORTRAIT:<FACTION>:<ROLE>`)
 * are proposals and are not members of ArtSubjectV7; the Human entries use
 * the shared subjects, as the Human direction art does for its land units.
 */

/** The naval sprites a player sees: the two warships and the transport. */
export type NavalArtRoleV7 =
  "PATROL_BOAT" | "BATTLESHIP" | "EMBARKED_TRANSPORT";

/** Naval roles with an interface portrait (the transport has none). */
export type NavalPortraitRoleV7 = Exclude<NavalArtRoleV7, "EMBARKED_TRANSPORT">;

/** Proposed subjects of the non-Human factions' naval art (bead w5j.3). */
export type NavalFactionArtSubjectV7 =
  | `UNIT:${Exclude<FactionIdV7, "ORIGINAL">}:${NavalArtRoleV7}`
  | `PORTRAIT:${Exclude<FactionIdV7, "ORIGINAL">}:${NavalPortraitRoleV7}`;

/** A naval raster: a ChibiArtAssetV7 whose subject may be a proposed one. */
export type ChibiNavalArtAssetV7 = Omit<ChibiArtAssetV7, "subject"> & {
  readonly subject: ArtSubjectV7 | NavalFactionArtSubjectV7;
};

export interface ChibiNavalFactionArtV7 {
  readonly faction: FactionIdV7;
  readonly role: NavalArtRoleV7;
  /** The map sprite (UNIT) or the interface portrait (PORTRAIT). */
  readonly kind: "UNIT" | "PORTRAIT";
  readonly asset: ChibiNavalArtAssetV7;
}

/**
 * The subject a faction's naval raster is listed under: the shared subject
 * for the Humans, `<KIND>:<FACTION>:<ROLE>` for the others.
 */
export function navalFactionArtSubjectV7(
  faction: FactionIdV7,
  kind: "UNIT" | "PORTRAIT",
  role: NavalArtRoleV7,
): ArtSubjectV7 | NavalFactionArtSubjectV7 {
  return (
    faction === "ORIGINAL" ? `${kind}:${role}` : `${kind}:${faction}:${role}`
  ) as ArtSubjectV7 | NavalFactionArtSubjectV7;
}

/** Six factions x (three map sprites + two portraits) = 30 rasters. */
export const CHIBI_NAVAL_FACTION_ART_ASSETS_V7: readonly ChibiNavalFactionArtV7[] =
  [
    {
      faction: "ORIGINAL",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-human-patrol-boat",
        subject: "UNIT:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-human-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ORIGINAL",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-human-battleship",
        subject: "UNIT:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-human-battleship.png"),
        fixedColours: true,
      },
    },
    {
      faction: "ORIGINAL",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-human-transport",
        subject: "UNIT:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-human-transport.png"),
        fixedColours: true,
      },
    },
    {
      faction: "ORIGINAL",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-human-portrait-patrol-boat",
        subject: "PORTRAIT:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-human-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ORIGINAL",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-human-portrait-battleship",
        subject: "PORTRAIT:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-human-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-undead-patrol-boat",
        subject: "UNIT:UNDEAD:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-undead-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-undead-battleship",
        subject: "UNIT:UNDEAD:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-undead-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-undead-transport",
        subject: "UNIT:UNDEAD:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-undead-transport.png"),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-undead-portrait-patrol-boat",
        subject: "PORTRAIT:UNDEAD:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-undead-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "UNDEAD",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-undead-portrait-battleship",
        subject: "PORTRAIT:UNDEAD:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-undead-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-goblin-patrol-boat",
        subject: "UNIT:GOBLIN:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-goblin-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-goblin-battleship",
        subject: "UNIT:GOBLIN:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-goblin-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-goblin-transport",
        subject: "UNIT:GOBLIN:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-goblin-transport.png"),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-goblin-portrait-patrol-boat",
        subject: "PORTRAIT:GOBLIN:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-goblin-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "GOBLIN",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-goblin-portrait-battleship",
        subject: "PORTRAIT:GOBLIN:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-goblin-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dinosaur-patrol-boat",
        subject: "UNIT:DINOSAUR:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dinosaur-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dinosaur-battleship",
        subject: "UNIT:DINOSAUR:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dinosaur-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dinosaur-transport",
        subject: "UNIT:DINOSAUR:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dinosaur-transport.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dinosaur-portrait-patrol-boat",
        subject: "PORTRAIT:DINOSAUR:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dinosaur-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DINOSAUR",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dinosaur-portrait-battleship",
        subject: "PORTRAIT:DINOSAUR:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dinosaur-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-martian-patrol-boat",
        subject: "UNIT:MARTIAN:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-martian-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-martian-battleship",
        subject: "UNIT:MARTIAN:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-martian-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-martian-transport",
        subject: "UNIT:MARTIAN:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-martian-transport.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-martian-portrait-patrol-boat",
        subject: "PORTRAIT:MARTIAN:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-martian-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "MARTIAN",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-martian-portrait-battleship",
        subject: "PORTRAIT:MARTIAN:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-martian-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ICE_FOLK",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-ice-folk-patrol-boat",
        subject: "UNIT:ICE_FOLK:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-ice-folk-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ICE_FOLK",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-ice-folk-battleship",
        subject: "UNIT:ICE_FOLK:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-ice-folk-battleship.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ICE_FOLK",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-ice-folk-transport",
        subject: "UNIT:ICE_FOLK:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-ice-folk-transport.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ICE_FOLK",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-ice-folk-portrait-patrol-boat",
        subject: "PORTRAIT:ICE_FOLK:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-ice-folk-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "ICE_FOLK",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-ice-folk-portrait-battleship",
        subject: "PORTRAIT:ICE_FOLK:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-ice-folk-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
  ];
