import type { TechnologyIdV7 } from "../types";
import type { MissionDefinitionV7 } from "./types";

/**
 * `LAB_UNDEAD_MID` (the Undead pass, `pulp_wars-w49.13`;
 * docs/product/RULESET_7_TUNING_UNDEAD.md and docs/validation/TEXT_PLAY.md):
 * the Undead roster in an even middle game, for a hand player to judge in
 * about ten rounds without playing an opening. Like the other labs it is an
 * ordinary hidden mission definition with no rule of its own. Its board,
 * its cities, and its Human side are those of `LAB_GOBLIN_MID`, so the two
 * rosters meet the same opponent.
 *
 * **The player is the Undead** (seat 0, west) against the Human Normal AI
 * (east), five cities a side with the same levels (a level-4 capital, two
 * level-3 cities, two level-2 cities at the front: 15 Coins a turn each).
 * The Undead own the ten technologies that make every Undead unit trainable
 * (Zombie, Banshee, Lich, Necromancer, Ghoul with Charge, Vampire) and hold
 * 16 units worth 62 Coins with three free unit slots and 20 Coins; the
 * Humans own ten technologies (Swordsman, Marksman, Catapult, Knight,
 * Guard, Raider with Charge; Forestry for Forest cover) and hold 17 units
 * worth 77 Coins with two free slots and 15 Coins. The front cities are
 * four tiles apart; two neutral villages lie between the lines. The AI has
 * no directive: it plays the ordinary Normal policy.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   ........v.......      v: a neutral village
 *    2   ..d..........u..      d, D: your cities; u, U: the AI's
 *    4   .....d..........
 *    5   ..........u.....
 *    7   ..D.............      D: your capital
 *    8   .............U..      U: its walled capital
 *   10   .....d..........
 *   11   ..........u.....
 *   13   ..d..........u..
 *   14   ........v.......
 * ```
 */
const DRY_NAVAL_V7: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const UNDEAD_MID_TERRAIN_V7 = [
  "................",
  "................",
  ".......f........",
  "................",
  ".......f.f......",
  "........f.......",
  "................",
  "........^.......",
  ".......^........",
  "................",
  ".......f........",
  "........f.......",
  "................",
  "........f.......",
  "................",
  "................",
];

export const LAB_UNDEAD_MID_V7: MissionDefinitionV7 = {
  id: "LAB_UNDEAD_MID",
  revision: 1,
  hidden: true,
  size: 16,
  seed: 20261301,
  terrain: UNDEAD_MID_TERRAIN_V7,
  resources: UNDEAD_MID_TERRAIN_V7.map((row) => ".".repeat(row.length)),
  biome: "PLAINS",
  villages: [
    { x: 8, y: 1 },
    { x: 8, y: 14 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
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
      ],
      // Unit slots: 5, 4, 4, 3, 3.
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
      // Every center is free, so every city with a slot trains on the first
      // turn.
      units: [
        // The capital's (full): the Necromancer, the Liches, the Vampire,
        // and a Zombie.
        { role: "CAPTAIN", at: { x: 4, y: 7 } },
        { role: "CATAPULT", at: { x: 3, y: 6 } },
        { role: "CATAPULT", at: { x: 3, y: 8 } },
        { role: "KNIGHT", at: { x: 4, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 7 } },
        // The northern cities'.
        { role: "FIGHTER", at: { x: 3, y: 2 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 4, y: 3 }, home: 1 },
        { role: "GUARD", at: { x: 6, y: 4 }, home: 3 },
        { role: "FIGHTER", at: { x: 6, y: 3 }, home: 3 },
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 3 },
        // The southern cities'.
        { role: "FIGHTER", at: { x: 3, y: 13 }, home: 2 },
        { role: "RAIDER", at: { x: 4, y: 12 }, home: 2 },
        { role: "MARKSMAN", at: { x: 4, y: 11 }, home: 2 },
        { role: "GUARD", at: { x: 6, y: 10 }, home: 4 },
        { role: "GUARD", at: { x: 6, y: 11 }, home: 4 },
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
        "ENGINEERING",
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
