import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_1` "Goblins at the Gate" (docs/product/CAMPAIGN.md section 6.1):
 * Chapter One, mission 1. Humans against a Goblin `RUSH` on a dry 11 x 11
 * board. Easy. The Goblin war band starts in the field, halfway to your
 * walled fort, with a level-1 capital and no Coins behind it: the Goblins
 * start over capacity, so the first wave is their whole army and
 * reinforcements trickle in as it dies. Their reveal holds your capital and
 * the open ground between, so the rush has an explored route from the first
 * turn. The middle village lies east of the rush lane (on the lane it
 * became a Goblin town the rush defended instead of attacking). Final
 * numbers and their tuning: CAMPAIGN.md section 8.3.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff^^
 *    1   ^f....ff..^
 *    2   f..v....G.f      G: the Goblin capital; v: a village
 *    3   f.....f...f
 *    4   ..^^.ww...f      w: the war band (four Goblins, a Wolf Rider)
 *    5   ...^ww..^v.      v: a village
 *    6   f....w.^^..
 *    7   f...f.....f
 *    8   f.H....v..f      H: your capital; v: a village
 *    9   ^..ff....f^
 *   10   ^^f...ff^^^
 * ```
 */
export const FRONTIER_1_V7: MissionDefinitionV7 = {
  id: "FRONTIER_1",
  revision: 1,
  size: 11,
  seed: 20261101,
  terrain: [
    "^^ff...ff^^",
    "^f....ff..^",
    "f.........f",
    "f.....f...f",
    "..^^......f",
    "...^....^..",
    "f......^^..",
    "f...f.....f",
    "f.........f",
    "^..ff....f^",
    "^^f...ff^^^",
  ],
  resources: [
    "...........",
    "..e....g.r.",
    "...........",
    "....r.g..r.",
    ".....r....g",
    ".......eo..",
    ".......o...",
    ".r.rg...r..",
    "...........",
    "...g..e....",
    "...........",
  ],
  biome: "PLAINS",
  villages: [
    { x: 3, y: 2 },
    { x: 9, y: 5 },
    { x: 7, y: 8 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 8,
      technologies: ["DRILL"],
      cities: [{ at: { x: 2, y: 8 }, level: 3, rewards: ["SURVEY", "WALLS"] }],
      units: [
        { role: "GUARD", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "FIGHTER", at: { x: 1, y: 8 } },
      ],
      reveal: { radius: 2 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: ["SCOUTING"],
      cities: [{ at: { x: 8, y: 2 }, level: 1, rewards: [] }],
      // The war band is already out of the hills.
      units: [
        { role: "FIGHTER", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "RAIDER", at: { x: 5, y: 4 } },
      ],
      // Your capital and the open ground between: an explored rush route.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 3, x1: 8, y1: 9 }] },
      directive: { kind: "RUSH" },
    },
  ],
  forbiddenTechnologies: ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
  objective: { kind: "DOMINATION" },
};
