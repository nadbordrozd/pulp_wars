import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_2` "The Warrens" (docs/product/CAMPAIGN.md section 6.2):
 * Chapter One, mission 2. Humans against a three-city Goblin realm on a dry
 * 14 x 14 board, the Goblins `NORMAL`. Medium. You hold a walled capital
 * and a frontier town against their three cities; two of the three villages
 * lie on your side of the valley, the eastern outpost is the weak point and
 * the walled capital comes last. Three cities make the Goblins' research
 * dearer. Final numbers and their tuning (a single Human city could not
 * hold against three Goblin cities): CAMPAIGN.md section 8.3.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ^^ff..ffff.^^^
 *    1   ^f.....f...f.^
 *    2   f...g.....f..^     g: a Goblin town
 *    3   f.........G..f     G: the Goblin capital
 *    4   ..ff..^^.....f
 *    5   .f...^^....f..
 *    6   ..f....v...f..     v: a village
 *    7   .v....^^...f..     v: a village
 *    8   f....v^^...g..     v: a village; g: the Goblin outpost
 *    9   f..f.......f.f
 *   10   ..f......ff..f
 *   11   f..H...h....ff     H: your capital; h: your town
 *   12   ^f....ff..f.^^
 *   13   ^^ff.....ff^^^
 * ```
 */
export const FRONTIER_2_V7: MissionDefinitionV7 = {
  id: "FRONTIER_2",
  revision: 1,
  size: 14,
  seed: 20261102,
  terrain: [
    "^^ff..ffff.^^^",
    "^f.....f...f.^",
    "f.........f..^",
    "f............f",
    "..ff..^^.....f",
    ".f...^^....f..",
    "..f........f..",
    "......^^...f..",
    "f.....^^......",
    "f..f.......f.f",
    "..f......ff..f",
    "f...........ff",
    "^f....ff..f.^^",
    "^^ff.....ff^^^",
  ],
  resources: [
    "..............",
    "...r..........",
    "..........gr..",
    ".....e........",
    "...g.....r....",
    "......oe......",
    "..g.....r.....",
    "r..........g..",
    ".e............",
    "....r.......r.",
    "..g.r.e.r.....",
    "..............",
    "..r...g.......",
    "..............",
  ],
  biome: "WOODLAND",
  villages: [
    { x: 1, y: 7 },
    { x: 7, y: 6 },
    { x: 5, y: 8 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 10,
      technologies: ["GATHERING", "SCOUTING"],
      cities: [
        { at: { x: 3, y: 11 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 7, y: 11 }, level: 2, rewards: ["SURVEY"] },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "RAIDER", at: { x: 4, y: 10 } },
        { role: "GUARD", at: { x: 7, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 11 }, home: 1 },
      ],
      reveal: { radius: 3 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: ["DRILL", "SCOUTING", "HUNTING"],
      cities: [
        { at: { x: 10, y: 3 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 4, y: 2 }, level: 2, rewards: ["STOCKPILE"] },
        { at: { x: 11, y: 8 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "GUARD", at: { x: 10, y: 3 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "RAIDER", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 5, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 2 },
        { role: "FIGHTER", at: { x: 10, y: 8 }, home: 2 },
      ],
      reveal: { radius: 2 },
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  objective: { kind: "DOMINATION" },
};
