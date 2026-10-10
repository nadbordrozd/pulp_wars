import type { MissionDefinitionV7 } from "./types";

/**
 * `TUTORIAL_1` (bead `pulp_wars-0yxy`, docs/ui/SCREEN_FLOW.md "Tutorial"):
 * the board of the guided first game. Humans against one Goblin seat on a
 * dry 11 x 11 board; it belongs to no campaign chapter (`hidden`), and the
 * main menu's Tutorial button starts it.
 *
 * Everything the lessons need is in place before any AI turn: Fruit in the
 * capital's land (Gathering, the free first technology, then Harvest Fruit),
 * a Fighter one step from a village (move, then capture on the next turn),
 * an empty city center and the Coins for a Fighter, and a lone Goblin next
 * to the other Fighter, which one attack kills. The Goblin capital is far
 * off with one Goblin and no Coins, so nothing of theirs is near the
 * village when the capture comes.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^^f...f^^^
 *    1   ^ff.......^
 *    2   f.v.....G.f      G: the Goblin capital; v: a village
 *    3   f.........f
 *    4   ...ff.....f
 *    5   ^^..f......
 *    6   ^...g......      g: the lone Goblin
 *    7   ff.F....v.f      F: your Fighter beside it; v: a village
 *    8   f.H.Fv....f      H: your capital; F: your Fighter; v: the village
 *    9   ^r.r..r...^      r: Fruit
 *   10   ^^f...ff^^^
 * ```
 */
export const TUTORIAL_1_V7: MissionDefinitionV7 = {
  id: "TUTORIAL_1",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261010,
  terrain: [
    "^^^f...f^^^",
    "^ff.......^",
    "f.........f",
    "f.........f",
    "...ff.....f",
    "^^..f......",
    "^..........",
    "ff........f",
    "f.........f",
    "^.........^",
    "^^f...ff^^^",
  ],
  resources: [
    "...........",
    ".g.........",
    "...........",
    ".......r...",
    "...g.......",
    "...........",
    "...........",
    ".g.........",
    "...........",
    ".r.r..r....",
    "...........",
  ],
  biome: "PLAINS",
  villages: [
    { x: 5, y: 8 },
    { x: 2, y: 2 },
    { x: 8, y: 7 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      // Income 3 at the first Start Turn: 6 Coins for the Harvest (2) and
      // the Fighter (2). No technology, so the first research is free.
      coins: 3,
      technologies: [],
      // Level 2: three unit slots, so a third Fighter can be trained.
      cities: [{ at: { x: 2, y: 8 }, level: 2, rewards: ["STOCKPILE"] }],
      units: [
        // Beside the lone Goblin: the attack.
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        // One step from the village: the move, then the capture.
        { role: "FIGHTER", at: { x: 4, y: 8 } },
      ],
      // The village and the ground around it are known from the start.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 5, x1: 7, y1: 10 }] },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [{ at: { x: 8, y: 2 }, level: 1, rewards: [] }],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 2 } },
        // The lone Goblin at the player's border.
        { role: "FIGHTER", at: { x: 4, y: 6 } },
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
