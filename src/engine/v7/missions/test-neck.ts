import type { MissionDefinitionV7 } from "./types";

/**
 * `TEST_NECK`: the hidden fixture of the Normal AI's siege of a single-file
 * front (`pulp_wars-68k.6`, `src/ai/v7-chokepoint.ts`). Two shores of a
 * small 11 x 11 board are joined only by a one-tile neck two tiles long
 * (row 5, x 4–5). The Human shore's three tiles next to the neck's entrance
 * (the apron, x 3) lie three tiles from the Undead shore's tiles next to its
 * far end (the mouth, x 6), which belong to the Undead capital's territory
 * and carry Field Defenses.
 * The Naval branch is forbidden, so the neck is the only way across. Both
 * seats play `NORMAL`. It is registered for headless runs and tests and
 * belongs to no chapter.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff~~ff.^^
 *    1   ^f..~~....^
 *    2   f...~~....f
 *    3   f...~~....f
 *    4   ....~~.....
 *    5   .H......U..      H: the Human capital; U: the Undead capital
 *    6   ....~~.....
 *    7   f...~~....f
 *    8   f...~~....f
 *    9   ^f..~~...f^
 *   10   ^^ff~~ff^^^
 * ```
 */
export const TEST_NECK_V7: MissionDefinitionV7 = {
  id: "TEST_NECK",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261008,
  terrain: [
    "^^ff~~ff.^^",
    "^f..~~....^",
    "f...~~....f",
    "f...~~....f",
    "....~~.....",
    "...........",
    "....~~.....",
    "f...~~....f",
    "f...~~....f",
    "^f..~~...f^",
    "^^ff~~ff^^^",
  ],
  resources: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
  ],
  biome: "PLAINS",
  villages: [],
  // The mouth is fortified (in the Undead capital's territory).
  fieldDefenses: [
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["DRILL"],
      cities: [{ at: { x: 1, y: 5 }, level: 2, rewards: ["SURVEY"] }],
      units: [
        { role: "FIGHTER", at: { x: 1, y: 5 } },
        { role: "GUARD", at: { x: 2, y: 5 } },
      ],
      // The neck, the mouth, and the Undead capital.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 3, x1: 9, y1: 7 }] },
    },
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: ["DRILL"],
      cities: [{ at: { x: 8, y: 5 }, level: 2, rewards: ["SURVEY"] }],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "GUARD", at: { x: 6, y: 5 } },
      ],
      // The neck, the apron, and the Human capital.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 3, x1: 5, y1: 7 }] },
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
