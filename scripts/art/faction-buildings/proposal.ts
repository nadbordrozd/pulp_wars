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
  /** "sample": in this bead's PixelLab sample; "later": production only. */
  readonly stage: "sample" | "later";
  /** The exploration asset of the sample, when it has one. */
  readonly asset?: string;
}

export const FACTION_BUILDING_CHANGES_V7: readonly FactionBuildingChangeV7[] = [
  {
    faction: "UNDEAD",
    improvement: "FARM",
    name: "Graveyard",
    look: "three rows of low dark burial mounds with small dark wooden crosses and a few pale violet flowers",
    stage: "sample",
    asset: "chibi-undead-graveyard",
  },
  {
    faction: "UNDEAD",
    improvement: "WINDMILL",
    name: "Bone Mill",
    look: "the windmill in dark slate with ragged charcoal sails and one violet window",
    stage: "later",
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
    stage: "later",
  },
  {
    faction: "DINOSAUR",
    improvement: "WINDMILL",
    name: "Grinding Stone",
    look: "a huge round millstone on basalt stones with a wooden lever and a hide lean-to on bone poles",
    stage: "sample",
    asset: "chibi-dinosaur-grinding-stone",
  },
  {
    faction: "DINOSAUR",
    improvement: "SAWMILL",
    name: "Chopping Block",
    look: "a big stone axe in a split stump beside a pile of split logs, no steel saw",
    stage: "later",
  },
  {
    faction: "ICE_FOLK",
    improvement: "FARM",
    name: "Frost Garden",
    look: "rows of hardy blue-green frost cabbages in snow-banked beds",
    stage: "later",
  },
  {
    faction: "DWARF",
    improvement: "FARM",
    name: "Mushroom Farm",
    look: "three rows of big tan and russet mushrooms on dark peat beds",
    stage: "sample",
    asset: "chibi-dwarf-mushroom-farm",
  },
  {
    faction: "DWARF",
    improvement: "WINDMILL",
    name: "Steam Pump",
    look: "a squat copper boiler tower with a chimney puffing steam and a turning cog wheel",
    stage: "later",
  },
];

/** The Undead territory grass candidate the review draws by default. */
export const RECOMMENDED_UNDEAD_GRASS = "gloam";
