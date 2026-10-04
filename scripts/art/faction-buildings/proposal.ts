/**
 * The faction building proposal of bead pulp_wars-xdh.1 as data, for the
 * review (scripts/art/faction-buildings-review.ts). The table and its
 * reasons are in docs/art/FACTION_BUILDINGS.md; keep the two in step.
 * Nothing here is read by the game.
 */
import type { FactionIdV7, ImprovementIdV7 } from "../../../src/engine/index";

export interface FactionBuildingChangeV7 {
  readonly faction: FactionIdV7;
  readonly improvement: ImprovementIdV7;
  /** The faction's display name of the building. */
  readonly name: string;
  /** The look, in one line. */
  readonly look: string;
  /** "sample": has a PixelLab sample in the exploration run; "later": not made yet. */
  readonly stage: "sample" | "later";
  /** The exploration asset of the sample, when it has one. */
  readonly asset?: string;
}

export const FACTION_BUILDING_CHANGES_V7: readonly FactionBuildingChangeV7[] = [
  {
    faction: "UNDEAD",
    improvement: "FARM",
    name: "Graveyard",
    look: "three rows of dark slate gravestones with moss on mounds of dark earth and tiny violet flowers",
    stage: "sample",
    asset: "chibi-undead-graveyard",
  },
  {
    faction: "UNDEAD",
    improvement: "WINDMILL",
    name: "Bone Mill",
    look: "the windmill in dark slate with ragged charcoal sails and one violet window",
    stage: "sample",
    asset: "chibi-undead-bone-mill",
  },
  {
    faction: "MARTIAN",
    improvement: "WINDMILL",
    name: "Solar Array",
    look: "three tilted navy solar panels on chrome stands with a magenta-tipped mast",
    stage: "sample",
    asset: "chibi-martian-solar-array",
  },
  {
    faction: "MARTIAN",
    improvement: "FARM",
    name: "Hydroponic Farm",
    look: "the vegetable beds in chrome troughs under small glass domes",
    stage: "sample",
    asset: "chibi-martian-hydroponic-farm",
  },
  {
    faction: "DINOSAUR",
    improvement: "WINDMILL",
    name: "Grinding Stone",
    look: "an upright grindstone with a wooden lever on a big flat millstone, a hide lean-to on bone poles",
    stage: "sample",
    asset: "chibi-dinosaur-grinding-stone",
  },
  {
    faction: "DINOSAUR",
    improvement: "SAWMILL",
    name: "Chopping Block",
    look: "a huge axe in a tree stump, a pile of split logs and a hide lean-to, no saw blade",
    stage: "sample",
    asset: "chibi-dinosaur-chopping-block",
  },
  {
    faction: "ICE_FOLK",
    improvement: "FARM",
    name: "Frost Garden",
    look: "three rows of blue-green frost cabbages on thin banks of snow",
    stage: "sample",
    asset: "chibi-ice-folk-frost-garden",
  },
  {
    faction: "DWARF",
    improvement: "FARM",
    name: "Mushroom Farm",
    look: "four rows of tan and brown mushrooms on thin peat beds",
    stage: "sample",
    asset: "chibi-dwarf-mushroom-farm",
  },
  {
    faction: "DWARF",
    improvement: "WINDMILL",
    name: "Steam Pump",
    look: "a copper boiler with a domed top, an iron chimney puffing steam and a brass cog wheel",
    stage: "sample",
    asset: "chibi-dwarf-steam-pump",
  },
];

/** The Undead territory grass candidate the review draws by default. */
export const RECOMMENDED_UNDEAD_GRASS = "gloam";
