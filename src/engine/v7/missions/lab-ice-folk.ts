import type { TechnologyIdV7 } from "../types";
import type { MissionDefinitionV7 } from "./types";

/**
 * `LAB_ICE_FOLK_MID` (step two of the Ice Folk pass, `pulp_wars-w49.27`;
 * docs/product/RULESET_7_TUNING_ICE_FOLK.md and
 * docs/validation/TEXT_PLAY.md): the Ice Folk roster in an even middle game,
 * for a hand player to judge in about ten rounds without playing an
 * opening. A generated match of twenty rounds reaches neither the Mammoth
 * (three technologies of Industry) nor the Boulder Yeti and the Sabretooth.
 * Like the other labs it is an ordinary hidden mission definition with no
 * rule of its own. Its land, its cities, and its Human side are those of
 * `LAB_MARTIAN_MID` and `LAB_DINOSAUR_MID`, so the rosters meet the same
 * opponent on the same ground: every city of both sides has Forest and
 * Fertile Ground in its territory, and the capitals and the level-3 cities
 * a Mountain with Ore, a Lumber Camp (two in a capital), and (the level-3
 * cities) Game.
 *
 * **The player is the Ice Folk** (seat 0, west) against the Human Normal AI
 * (east), five cities a side with the same levels (a level-4 capital, two
 * level-3 cities, two level-2 cities at the front: 15 Coins a turn each).
 * The Ice Folk own the thirteen technologies that make every Ice Folk unit
 * trainable (Sled, Snow Hunter, Musk Ox with Deep Winter, Ice Witch,
 * Mammoth, Boulder Yeti, Sabretooth) and hold 16 units worth 64 Coins: 5
 * Yetis, 2 Sleds, 2 Snow Hunters, 2 Musk Oxen, an Ice Witch, 2 Mammoths, a
 * Boulder Yeti, and a Sabretooth. They have three free unit slots (two in
 * the capital, one in the northern level-3 city; the other cities are full)
 * and 20 Coins before the income of the first turn (35 in hand on it). They
 * own Deep Winter (the Snow reaches two tiles beyond a city's land, and
 * Recover heals 6 in their land) and neither Brittle (the Shatter threshold
 * of 4) nor Fieldcraft, Farming, or Roads. The Humans own twelve
 * technologies (Champion, Marksman, Catapult, Knight, Guard, Raider with
 * Charge; Forestry for Forest cover) and hold 17 units worth 80 Coins with
 * two free slots and 15 Coins (30 on their first turn). The front cities
 * are four tiles apart; two neutral villages lie between the lines. The AI
 * has no directive: it plays the ordinary Normal policy.
 *
 * Revision 2 (Ice Folk Freeze, `pulp_wars-w49.37`): the same board and
 * units under the new numbers (the Sled 4 Coins, the Ice Witch 6 and 10 HP,
 * the Boulder Yeti 9 and 10 HP, the Mammoth 7, the Musk Ox Defense 2): the
 * Ice Folk units are worth 70 Coins now. The numbers quoted above are
 * revision 1's.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   .Ge.....v....eG.      v: a neutral village
 *    2   .Om....f.....uO.      m, M: your cities; u, U: the AI's
 *    3   .L...e........L.      f: Forest; G: Forest with Game
 *    4   .....m.f.f......      L: Forest with a Lumber Camp
 *    5   ....fe..f.ue....      e: Fertile Ground
 *    6   .Le.......ef....      O: a Mountain with Ore; ^: a Mountain
 *    7   .OM.....^....eL.      M: your capital
 *    8   .L.....^.....UO.      U: its walled capital
 *    9   ....fe........L.
 *   10   .....m.f..e.....
 *   11   .....e..f.uf....
 *   12   .L........e...L.
 *   13   .Om.....f....uO.
 *   14   .Ge.....v....eG.
 * ```
 */
const DRY_NAVAL_V7: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const ICE_FOLK_MID_TERRAIN_V7 = [
  "................",
  ".f............f.",
  ".^.....f......^.",
  ".f............f.",
  ".......f.f......",
  "....f...f.......",
  ".f.........f....",
  ".^......^.....f.",
  ".f.....^......^.",
  "....f.........f.",
  ".......f........",
  "........f..f....",
  ".f............f.",
  ".^......f.....^.",
  ".f............f.",
  "................",
];

const ICE_FOLK_MID_RESOURCES_V7 = [
  "................",
  ".ge..........eg.",
  ".o............o.",
  ".....e..........",
  "................",
  ".....e.....e....",
  "..e.......e.....",
  ".o...........e..",
  "..............o.",
  ".....e..........",
  "..........e.....",
  ".....e..........",
  "..........e.....",
  ".o............o.",
  ".ge..........eg.",
  "................",
];

export const LAB_ICE_FOLK_MID_V7: MissionDefinitionV7 = {
  id: "LAB_ICE_FOLK_MID",
  revision: 2,
  hidden: true,
  size: 16,
  seed: 20262701,
  terrain: ICE_FOLK_MID_TERRAIN_V7,
  resources: ICE_FOLK_MID_RESOURCES_V7,
  biome: "PLAINS",
  villages: [
    { x: 8, y: 1 },
    { x: 8, y: 14 },
  ],
  // One Lumber Camp in each level-3 city and two in each capital.
  improvements: [
    { at: { x: 1, y: 3 }, improvement: "LUMBER_CAMP" },
    { at: { x: 1, y: 6 }, improvement: "LUMBER_CAMP" },
    { at: { x: 1, y: 8 }, improvement: "LUMBER_CAMP" },
    { at: { x: 1, y: 12 }, improvement: "LUMBER_CAMP" },
    { at: { x: 14, y: 3 }, improvement: "LUMBER_CAMP" },
    { at: { x: 14, y: 7 }, improvement: "LUMBER_CAMP" },
    { at: { x: 14, y: 9 }, improvement: "LUMBER_CAMP" },
    { at: { x: 14, y: 12 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 20,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        // Deep Winter: the Musk Ox, the wider Snow, Recover 6.
        "FORTIFICATION",
        "ENGINEERING",
        "METALLURGY",
      ],
      // Unit slots: 5, 4, 4, 3, 3; every Ice Folk unit fills one.
      cities: [
        {
          at: { x: 2, y: 7 },
          level: 4,
          rewards: ["STOCKPILE", "MILITIA", "BOOM"],
        },
        { at: { x: 2, y: 2 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
        { at: { x: 2, y: 13 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
        { at: { x: 5, y: 4 }, level: 2, rewards: ["STOCKPILE"] },
        { at: { x: 5, y: 10 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      // Every center is free, so a city with a slot trains on the first
      // turn.
      units: [
        // The capital's (two free slots): the Witch, the Sabretooth, and
        // the Boulder Yeti behind the line.
        { role: "CAPTAIN", at: { x: 4, y: 7 } },
        { role: "KNIGHT", at: { x: 3, y: 6 } },
        { role: "CATAPULT", at: { x: 4, y: 8 } },
        // The northern cities' (one free slot in the level-3 city; the
        // front city is full).
        { role: "FIGHTER", at: { x: 3, y: 2 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 3 }, home: 1 },
        { role: "SWORDSMAN", at: { x: 6, y: 4 }, home: 3 },
        { role: "GUARD", at: { x: 6, y: 3 }, home: 3 },
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 3 },
        // The southern cities' (both full).
        { role: "FIGHTER", at: { x: 3, y: 13 }, home: 2 },
        { role: "RAIDER", at: { x: 4, y: 12 }, home: 2 },
        { role: "MARKSMAN", at: { x: 5, y: 11 }, home: 2 },
        { role: "GUARD", at: { x: 5, y: 7 }, home: 2 },
        { role: "SWORDSMAN", at: { x: 6, y: 10 }, home: 4 },
        { role: "FIGHTER", at: { x: 6, y: 11 }, home: 4 },
        { role: "FIGHTER", at: { x: 6, y: 9 }, home: 4 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 11, y1: 15 }] },
    },
    {
      faction: "ORIGINAL",
      coins: 15,
      technologies: [
        "GATHERING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "METALLURGY",
      ],
      // Unit slots: 5, 4, 4, 3, 3.
      cities: [
        {
          at: { x: 13, y: 8 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        { at: { x: 13, y: 2 }, level: 3, rewards: ["STOCKPILE", "WALLS"] },
        { at: { x: 13, y: 13 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
        { at: { x: 10, y: 5 }, level: 2, rewards: ["STOCKPILE"] },
        { at: { x: 10, y: 11 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        // The capital's.
        { role: "GUARD", at: { x: 13, y: 8 } },
        { role: "CATAPULT", at: { x: 11, y: 7 } },
        { role: "CATAPULT", at: { x: 11, y: 9 } },
        { role: "KNIGHT", at: { x: 12, y: 7 } },
        { role: "KNIGHT", at: { x: 12, y: 9 } },
        // The northern cities'.
        { role: "FIGHTER", at: { x: 13, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 11, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 6 }, home: 1 },
        { role: "SWORDSMAN", at: { x: 10, y: 5 }, home: 3 },
        { role: "SWORDSMAN", at: { x: 9, y: 5 }, home: 3 },
        // The southern cities'.
        { role: "FIGHTER", at: { x: 13, y: 13 }, home: 2 },
        { role: "MARKSMAN", at: { x: 11, y: 12 }, home: 2 },
        { role: "MARKSMAN", at: { x: 11, y: 10 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 12 }, home: 2 },
        { role: "GUARD", at: { x: 10, y: 11 }, home: 4 },
        { role: "SWORDSMAN", at: { x: 9, y: 10 }, home: 4 },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 0, x1: 15, y1: 15 }] },
    },
  ],
  forbiddenTechnologies: DRY_NAVAL_V7,
  objective: { kind: "DOMINATION" },
};
