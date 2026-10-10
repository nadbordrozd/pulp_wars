import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Cult production art (beads pulp_wars-mch9.14 and pulp_wars-mch9.15,
 * batches `direction-cult` and `naval-cult`; see docs/art/factions/CULT.md):
 * a secret lodge in indigo cloth with cream wax and paper, warm brass and
 * one green flame, and what it summons, rubbery deep-sea teal with cream
 * bellies and yellow eyes. No sprite has an owner area or a mask
 * (`fixedColours`): the faction look alone says "Cult".
 *
 * The nine trained units; the three summoned units (the Horror, the Herald
 * and the wild Tentacle, under the engine's summoned role IDs) and the
 * Unbound looks of the Horror and the Herald; and the frog a Ribbit victim
 * is drawn as. Apart, the Cult naval set.
 *
 * **Registered** in the live direction registry and the naval list by bead
 * pulp_wars-mch9.15, so a Cult unit on the board is drawn as itself and no
 * longer wears the stand-in letter. Nothing spawns a summoned unit or a
 * frog yet (the Cult's command beads do): their rasters are loaded and
 * resolvable under their subjects, and nothing asks for them. The portraits,
 * the cities, the icons and the effects are bead pulp_wars-mch9.16's.
 */
export const CHIBI_DIRECTION_CULT_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-direction-cult-initiate",
    subject: "UNIT:CULT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-initiate.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-idol-bearer",
    subject: "UNIT:CULT:GUARD",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-idol-bearer.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-familiar",
    subject: "UNIT:CULT:RAIDER",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-familiar.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-hexer",
    subject: "UNIT:CULT:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-hexer.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-summoner",
    subject: "UNIT:CULT:CAPTAIN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-summoner.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-stargazer",
    subject: "UNIT:CULT:CATAPULT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-stargazer.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-caller",
    subject: "UNIT:CULT:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-caller.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-chosen",
    subject: "UNIT:CULT:SWORDSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-chosen.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-thing",
    subject: "UNIT:CULT:JUGGERNAUT",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-thing.png"),
    fixedColours: true,
  },
  // --- The summoned (SUMMONED_ROLE_IDS_V7) and their Unbound looks ---
  {
    id: "chibi-direction-cult-horror",
    subject: "UNIT:CULT:HORROR",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-horror.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-horror-unbound",
    subject: "UNIT:CULT:HORROR_UNBOUND",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-cult-horror-unbound.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-herald",
    subject: "UNIT:CULT:HERALD",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-herald.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-herald-unbound",
    subject: "UNIT:CULT:HERALD_UNBOUND",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-cult-herald-unbound.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-cult-tentacle",
    subject: "UNIT:CULT:TENTACLE",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-cult-tentacle.png"),
    fixedColours: true,
  },
  // --- The frog of Ribbit: a marker like the Crumbs, on the Grave's canvas ---
  {
    id: "chibi-direction-cult-frog",
    subject: "FROG",
    assetClass: "RESOURCE",
    width: 40,
    height: 40,
    url: chibiArtUrl("assets/chibi/resources/chibi-direction-cult-frog.png"),
  },
];

/** The Cult's ships and transport (their portraits are bead mch9.16's). */
export type CultNavalArtRoleV7 =
  "PATROL_BOAT" | "BATTLESHIP" | "EMBARKED_TRANSPORT";

export interface ChibiCultNavalArtV7 {
  readonly faction: "CULT";
  readonly role: CultNavalArtRoleV7;
  readonly kind: "UNIT";
  readonly asset: ChibiArtAssetV7;
}

/**
 * The Cult naval set (batch `naval-cult`): the entries of
 * CHIBI_NAVAL_FACTION_ART_ASSETS_V7's shape for the ninth faction, which
 * that list ends with before the Submarines. Edits of the shared ships, so
 * each keeps the shared canvas, class, anchor and waterline. The Cult
 * Submarine and its submerged sprite are with the other factions' in
 * chibi-naval-submarine-art-manifest.ts.
 */
export const CHIBI_DIRECTION_CULT_NAVAL_ART_ASSETS_V7: readonly ChibiCultNavalArtV7[] =
  [
    {
      faction: "CULT",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-cult-patrol-boat",
        subject: "UNIT:CULT:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-cult-patrol-boat.png"),
        fixedColours: true,
      },
    },
    {
      faction: "CULT",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-cult-battleship",
        subject: "UNIT:CULT:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-cult-battleship.png"),
        fixedColours: true,
      },
    },
    {
      faction: "CULT",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-cult-transport",
        subject: "UNIT:CULT:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-cult-transport.png"),
        fixedColours: true,
      },
    },
  ];
