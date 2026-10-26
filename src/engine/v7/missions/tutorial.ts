import type { MissionDefinitionV7 } from "./types";

/**
 * `TUTORIAL_1` (beads `pulp_wars-0yxy` and `pulp_wars-2yc.115`,
 * docs/ui/SCREEN_FLOW.md "Tutorial"): the board of the guided first game.
 * Humans against one Goblin seat on a dry 11 x 11 board; it belongs to no
 * campaign chapter (`hidden`), and the main menu's Tutorial button starts
 * it. The script (src/render/tutorial-v7.ts) runs over eight turns.
 *
 * Like a campaign start, the Humans know the technologies the lessons
 * need (Farm, Windmill, Lumber Camp, Captain, Roads, Knight), and research
 * Crafting (the Ore appears) and Engineering (mountains open, the Mine)
 * themselves. Everything is in place before any AI turn: Fruit and Fertile
 * Ground in the capital's land, a Forest for the Lumber Camp, a Fighter one
 * step from a village (move, then capture on turn 2), a lone Goblin next to
 * the other Fighter, an Ore mountain and a bare mountain beside the
 * village, and the Coins every lesson costs with a little to spare (no
 * other command is let through while the tutorial runs).
 *
 * The Goblins hold their corner until round 9 (`HOLD`), so nothing of
 * theirs comes near. A Knight and a Captain of the player's arrive at the
 * start of round 7, and three Goblins in a row at the Goblins' turn of
 * round 7, two tiles from the Knight: on turn 8 the Captain's Rally and the
 * Knight's Overrun kill all three.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^^f...f^^^
 *    1   ^ff.......^
 *    2   f.v.....G.f      G: the Goblin capital; v: a village
 *    3   f.........f
 *    4   ...ff.....f
 *    5   ^^..fCK.ggg      C, K: the Captain and Knight (round 7); g: Goblins (round 7)
 *    6   ^...g......      g: the lone Goblin
 *    7   ff.F..^.v.f      F: your Fighter beside it; ^: a bare mountain; v: a village
 *    8   feH.Fv....f      e: Fertile Ground; H: your capital; F: your Fighter; v: the village
 *    9   ^r.r..o...^      r: Fruit; o: Ore on a mountain
 *   10   ^^f...ff^^^
 * ```
 */
export const TUTORIAL_1_V7: MissionDefinitionV7 = {
  id: "TUTORIAL_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-2yc.115`): the eight-turn tutorial (its
  // technologies and Coins, the economy's tiles, the mountains, the waves).
  revision: 3,
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
    "ff....^...f",
    "f.........f",
    "^.....^...^",
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
    "...........",
    ".e.........",
    ".r.r..o....",
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
      // Income 3 at the first Start Turn. The lessons cost 44 Coins over
      // six turns (the harvest and a Fighter, the Farm, the Windmill and
      // the Lumber Camp, Crafting and the Workshop, Engineering and the
      // Mine, two Roads); the income pays 29 of them by turn 6.
      coins: 20,
      technologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SCOUTING",
        "ROADS",
        "RAIDING",
        "CHIVALRY",
      ],
      // Level 2: three unit slots, so a third Fighter can be trained.
      cities: [{ at: { x: 2, y: 8 }, level: 2, rewards: ["STOCKPILE"] }],
      units: [
        // Beside the lone Goblin: the attack.
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        // One step from the village: the move, then the capture.
        { role: "FIGHTER", at: { x: 4, y: 8 } },
      ],
      // The village and the ground around it are known from the start, and
      // so is the field where the Knight fights on turn 8.
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 5, x1: 7, y1: 10 },
          { x0: 5, y0: 4, x1: 10, y1: 6 },
        ],
      },
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
      // The tutorial's turns are the player's own: the Goblins keep to
      // their corner until the lessons are over.
      directive: {
        kind: "HOLD",
        zone: [{ x0: 6, y0: 0, x1: 10, y1: 3 }],
        untilRound: 9,
      },
    },
  ],
  reinforcements: [
    {
      seat: 0,
      round: 7,
      line: "A Knight and a Captain ride in from the capital.",
      units: [
        { role: "KNIGHT", at: { x: 6, y: 5 } },
        { role: "CAPTAIN", at: { x: 5, y: 5 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      line: "Three Goblins in a row. That never ends well for Goblins.",
      units: [
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 10, y: 5 } },
      ],
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
