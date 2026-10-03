import type { ChibiArtAssetV7 } from "./chibi-art-v7";
import { chibiArtUrl } from "./chibi-art-manifest";

/**
 * Steampunk Dwarf production art (bead pulp_wars-78i.5, batches
 * `direction-dwarf` and `naval-dwarf`; see docs/art/factions/DWARF.md):
 * soot-black iron with a light rim, red copper, dark leather, white steam,
 * ginger-copper beards and, on every machine, the reserve signal-green
 * lamp. No sprite has an owner area or a mask (`fixedColours`): the faction
 * look alone says "Dwarf", as the live look has no base plates (bead
 * pulp_wars-w5j.3).
 *
 * The eight unit sprites, the tunnel mound and the rider's mound, the
 * portraits, City 1-3 (a forge hold with an iron pole for the pennant), ten
 * command, ability, status and technology icons and four effect sprites;
 * and, apart, the Dwarf naval set.
 *
 * **Not registered yet.** No game module imports this file; the Dwarf UI
 * bead (pulp_wars-78i.6) wires it in (DWARF.md, "Wiring list").
 */
export const CHIBI_DIRECTION_DWARF_ART_ASSETS_V7: readonly ChibiArtAssetV7[] = [
  {
    id: "chibi-direction-dwarf-hammerer",
    subject: "UNIT:DWARF:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-hammerer.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-gyrocopter",
    subject: "UNIT:DWARF:RAIDER",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-gyrocopter.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-clockwork-gunner",
    subject: "UNIT:DWARF:MARKSMAN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-dwarf-clockwork-gunner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-steam-mole",
    subject: "UNIT:DWARF:GUARD",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-steam-mole.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-engineer",
    subject: "UNIT:DWARF:CAPTAIN",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-engineer.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-steam-cannon",
    subject: "UNIT:DWARF:CATAPULT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-dwarf-steam-cannon.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-steam-tank",
    subject: "UNIT:DWARF:KNIGHT",
    assetClass: "LARGE_UNIT",
    width: 72,
    height: 88,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-steam-tank.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-brass-titan",
    subject: "UNIT:DWARF:JUGGERNAUT",
    assetClass: "GIANT_UNIT",
    width: 88,
    height: 104,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-dwarf-brass-titan.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-mound",
    subject: "UNIT:DWARF:MOUND",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 48,
    url: chibiArtUrl("assets/chibi/units/chibi-direction-dwarf-mound.png"),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-mound-rider",
    subject: "UNIT:DWARF:MOUND_RIDER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/units/chibi-direction-dwarf-mound-rider.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-hammerer",
    subject: "PORTRAIT:DWARF:FIGHTER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-hammerer.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-gyrocopter",
    subject: "PORTRAIT:DWARF:RAIDER",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-gyrocopter.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-clockwork-gunner",
    subject: "PORTRAIT:DWARF:MARKSMAN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-clockwork-gunner.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-steam-mole",
    subject: "PORTRAIT:DWARF:GUARD",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-steam-mole.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-engineer",
    subject: "PORTRAIT:DWARF:CAPTAIN",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-engineer.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-steam-cannon",
    subject: "PORTRAIT:DWARF:CATAPULT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-steam-cannon.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-steam-tank",
    subject: "PORTRAIT:DWARF:KNIGHT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-steam-tank.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-portrait-dwarf-brass-titan",
    subject: "PORTRAIT:DWARF:JUGGERNAUT",
    assetClass: "PORTRAIT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/portraits/chibi-direction-portrait-dwarf-brass-titan.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-city-1",
    subject: "CITY:DWARF:1",
    assetClass: "SETTLEMENT",
    width: 80,
    height: 80,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-dwarf-city-1.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-city-2",
    subject: "CITY:DWARF:2",
    assetClass: "SETTLEMENT",
    width: 88,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-dwarf-city-2.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-dwarf-city-3",
    subject: "CITY:DWARF:3",
    assetClass: "SETTLEMENT",
    width: 96,
    height: 88,
    url: chibiArtUrl(
      "assets/chibi/settlements/chibi-direction-dwarf-city-3.png",
    ),
    fixedColours: true,
  },
  {
    id: "chibi-direction-icon-action-tunnel",
    subject: "ICON:ACTION:TUNNEL",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-tunnel.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-bomb-run",
    subject: "ICON:ACTION:BOMB_RUN",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-bomb-run.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-assemble",
    subject: "ICON:ACTION:ASSEMBLE",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-assemble.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-repair",
    subject: "ICON:ACTION:DWARF:TEND_WOUNDED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-repair.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-knockback",
    subject: "ICON:ACTION:KNOCKBACK",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-knockback.png",
    ),
  },
  {
    id: "chibi-direction-icon-action-plated",
    subject: "ICON:ACTION:PLATED",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-action-plated.png",
    ),
  },
  {
    id: "chibi-direction-icon-status-clockwork",
    subject: "ICON:STATUS:CLOCKWORK",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-status-clockwork.png",
    ),
  },
  {
    id: "chibi-direction-icon-status-dug-in",
    subject: "ICON:STATUS:DUG_IN",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-status-dug-in.png",
    ),
  },
  {
    id: "chibi-direction-icon-tech-dig-in",
    subject: "ICON:TECH:DWARF:FORTIFICATION",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl("assets/chibi/icons/chibi-direction-icon-tech-dig-in.png"),
  },
  {
    id: "chibi-direction-icon-tech-blasting-charges",
    subject: "ICON:TECH:DWARF:EXPLOSIVES",
    assetClass: "ICON",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/icons/chibi-direction-icon-tech-blasting-charges.png",
    ),
  },
  {
    id: "chibi-direction-effect-dwarf-eruption",
    subject: "EFFECT:ERUPTION",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-dwarf-eruption.png",
    ),
  },
  {
    id: "chibi-direction-effect-dwarf-bomb-blast",
    subject: "EFFECT:BOMB_BLAST",
    assetClass: "EFFECT",
    width: 48,
    height: 48,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-dwarf-bomb-blast.png",
    ),
  },
  {
    id: "chibi-direction-effect-dwarf-steam-puff",
    subject: "EFFECT:STEAM_PUFF",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-dwarf-steam-puff.png",
    ),
  },
  {
    id: "chibi-direction-effect-dwarf-repair-sparks",
    subject: "EFFECT:REPAIR_SPARKS",
    assetClass: "EFFECT",
    width: 40,
    height: 40,
    url: chibiArtUrl(
      "assets/chibi/effects/chibi-direction-effect-dwarf-repair-sparks.png",
    ),
  },
];

/** The naval sprites a player sees: the two warships and the transport. */
export type DwarfNavalArtRoleV7 =
  "PATROL_BOAT" | "BATTLESHIP" | "EMBARKED_TRANSPORT";

/**
 * The subjects of the Dwarf naval art: `UNIT:DWARF:<ROLE>` and
 * `PORTRAIT:DWARF:<ROLE>`, exactly what the live generic naval wiring
 * (bead pulp_wars-w5j.3) resolves, `navalArtSubjectV7("DWARF", kind,
 * role)` in chibi-art-v7.ts, and members of NavalFactionArtSubjectV7 once
 * the engine bead (pulp_wars-78i.3) makes `DWARF` a FactionIdV7. Until then
 * `DWARF` is not a faction, so this module spells them out; it does not
 * import the faction naval manifest.
 */
export type DwarfNavalArtSubjectV7 =
  | `UNIT:DWARF:${DwarfNavalArtRoleV7}`
  | `PORTRAIT:DWARF:${Exclude<DwarfNavalArtRoleV7, "EMBARKED_TRANSPORT">}`;

/**
 * A Dwarf naval raster: a ChibiArtAssetV7 whose subject is a Dwarf naval
 * subject (a ChibiArtAssetV7 outright once `DWARF` is a FactionIdV7).
 */
export type ChibiDwarfNavalArtAssetV7 = Omit<ChibiArtAssetV7, "subject"> & {
  readonly subject: DwarfNavalArtSubjectV7;
};

export interface ChibiDwarfNavalArtV7 {
  readonly faction: "DWARF";
  readonly role: DwarfNavalArtRoleV7;
  /** The map sprite (UNIT) or the interface portrait (PORTRAIT). */
  readonly kind: "UNIT" | "PORTRAIT";
  readonly asset: ChibiDwarfNavalArtAssetV7;
}

/**
 * The Dwarf naval set (batch `naval-dwarf`): the entries of
 * CHIBI_NAVAL_FACTION_ART_ASSETS_V7's shape for the seventh faction, on the
 * shared ships' canvases, anchors and waterline (NAVAL_FACTIONS.md). Not
 * registered yet: once `DWARF` is a FactionIdV7 the UI bead appends these
 * entries to CHIBI_NAVAL_FACTION_ART_ASSETS_V7 (or registers their assets),
 * and the generic naval wiring draws them with no other change.
 */
export const CHIBI_DIRECTION_DWARF_NAVAL_ART_ASSETS_V7: readonly ChibiDwarfNavalArtV7[] =
  [
    {
      faction: "DWARF",
      role: "PATROL_BOAT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dwarf-patrol-boat",
        subject: "UNIT:DWARF:PATROL_BOAT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 88,
        url: chibiArtUrl(
          "assets/chibi/units/chibi-naval-dwarf-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "BATTLESHIP",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dwarf-battleship",
        subject: "UNIT:DWARF:BATTLESHIP",
        assetClass: "GIANT_UNIT",
        width: 88,
        height: 96,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-dwarf-battleship.png"),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "EMBARKED_TRANSPORT",
      kind: "UNIT",
      asset: {
        id: "chibi-naval-dwarf-transport",
        subject: "UNIT:DWARF:EMBARKED_TRANSPORT",
        assetClass: "LARGE_UNIT",
        width: 72,
        height: 72,
        url: chibiArtUrl("assets/chibi/units/chibi-naval-dwarf-transport.png"),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "PATROL_BOAT",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dwarf-portrait-patrol-boat",
        subject: "PORTRAIT:DWARF:PATROL_BOAT",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dwarf-portrait-patrol-boat.png",
        ),
        fixedColours: true,
      },
    },
    {
      faction: "DWARF",
      role: "BATTLESHIP",
      kind: "PORTRAIT",
      asset: {
        id: "chibi-naval-dwarf-portrait-battleship",
        subject: "PORTRAIT:DWARF:BATTLESHIP",
        assetClass: "PORTRAIT",
        width: 48,
        height: 48,
        url: chibiArtUrl(
          "assets/chibi/portraits/chibi-naval-dwarf-portrait-battleship.png",
        ),
        fixedColours: true,
      },
    },
  ];

export {
  DWARF_BOMB_TIMELINE_V7,
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_FLAG_ANCHORS_V7,
  DWARF_FLYER_PRESENTATION_V7,
  DWARF_MOUND_V7,
  DWARF_PALETTE_V7,
} from "./chibi-direction-dwarf-presentation";
