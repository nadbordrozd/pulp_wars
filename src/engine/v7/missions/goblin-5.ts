import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_5` "Everybody Wants the Tongue" (docs/product/SAGA.md section
 * 3.3, G5; the Goblin campaign, `pulp_wars-hmyk.8`). The crew has the
 * vault's loot and a long iron crate that hums, and must hold Smuggler's
 * Rock for 16 rounds until the getaway rafts are ready, against the
 * Baron's last loyal men and Martian saucers that want the crate. Step 5
 * of 6: a hold-out.
 *
 * The board is the map generator's (Archipelago 16, seed 10, three seats):
 * three islands. Smuggler's Rock, walled, on the southern one; the
 * loyalists' jungle camp on the north-western; the Martian outpost of Ray
 * Hollow on the north-eastern. The loyalists come ashore in landing
 * parties; the saucers fly over the water and carry Brains, and a Brain
 * takes over any goblin left standing beside it. Goblins have no healers,
 * so a long siege wears them thin: wall the Rock, regenerate behind Orc
 * Brutes, and kill every Brain before it reaches the line. The getaway
 * rafts' crew comes early, in round 12, to help dig in.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ...^.~~~~~..^^..
 *    1   .....~~~~^~.f.f.
 *    2   ..K.~~.~~~...fff      K: Kessler's Camp, the loyalists'
 *    3   f..f^.~~~~f^.f^f
 *    4   .^.ff.~~~~~ffRff      R: Ray Hollow, the Martians'
 *    5   ~.f..f.~~~ff~~~~
 *    6   ~~~.~~~~~~.~~.~.
 *    7   ~~~~~~~~~~~~~~~~
 *    8   ~~~~~~~~~~~~~~~~
 *    9   ~~~~~~~~~~~~~~~~
 *   10   ~~~~~~.~~.^~~~~~
 *   11   ~~~...f~f.~f~~~~
 *   12   ~~~~.~~..f.v~~~~      v: a village
 *   13   ~~~f~~..S...~~~~      S: Smuggler's Rock, yours
 *   14   ~~~~^~~.....~~~~
 *   15   ~~~~~~.....~~~~~
 * ```
 */
export const GOBLIN_5_V7: MissionDefinitionV7 = {
  id: "GOBLIN_5",
  revision: 1,
  seed: 20261505,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 10,
    // Only the southern island's eastern village is left: the others would
    // be free towns for the loyalists and the Martians, and one would stand
    // on the Rock's western shore.
    edits: [
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
    ],
  },
  terrain: [
    "...^.~~~~~..^^..",
    ".....~~~~^~.f.f.",
    "....~~.~~~...fff",
    "f..f^.~~~~f^.f^f",
    ".^.ff.~~~~~ff.ff",
    "~.f..f.~~~ff~~~~",
    "~~~.~~~~~~.~~.~.",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~.~~.^~~~~~",
    "~~~...f~f.~f~~~~",
    "~~~~.~~..f..~~~~",
    "~~~f~~......~~~~",
    "~~~~^~~.....~~~~",
    "~~~~~~.....~~~~~",
  ],
  resources: [
    "rr......pp..oor.",
    "r.rrrss..o......",
    "r..e.....s..e..g",
    ".r...e.....oeg..",
    "e.e..r......g...",
    "s..r.......gs..s",
    "ps.e..p..p..p.pe",
    ".........p.....p",
    ".p.....p.p.p....",
    ".p...p.......pp.",
    "......e...o....p",
    "...re......gs...",
    "...s..s.r.e.s..p",
    ".p..ss.r.e.e..p.",
    "p..s...eeeee....",
    "....sper..r.p..p",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPHPHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPWWPPPP",
    "PPPPPPPPPPWPPWPW",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [{ x: 11, y: 12 }],
  treasureChests: [
    { x: 13, y: 2 },
    { x: 15, y: 4 },
  ],
  // </map>
  // The Rock's farm, on the fertile ground south of its walls.
  improvements: [{ at: { x: 8, y: 14 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Smuggler's Rock",
          at: { x: 8, y: 13 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // Mogga the Ogre, who says the crate is singing.
        { role: "SWORDSMAN", at: { x: 8, y: 12 }, tag: "MOGGA" },
        { role: "GUARD", at: { x: 8, y: 13 } },
        { role: "FIGHTER", at: { x: 7, y: 13 } },
        { role: "FIGHTER", at: { x: 9, y: 13 } },
        { role: "MARKSMAN", at: { x: 9, y: 14 } },
      ],
      // The southern island and the water round it.
      reveal: { radius: 3, rects: [{ x0: 2, y0: 9, x1: 13, y1: 15 }] },
    },
    {
      // Kessler's last loyal men: a jungle camp on the north-western island,
      // who come ashore in landing parties.
      faction: "ORIGINAL",
      coins: 4,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Kessler's Camp",
          at: { x: 2, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 2 } },
        { role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: [
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
    {
      // The Martians of Ray Hollow: saucers over the water, and Brains.
      faction: "MARTIAN",
      coins: 4,
      technologies: ["SCOUTING", "GATHERING", "ADMINISTRATION"],
      cities: [
        {
          name: "Ray Hollow",
          at: { x: 13, y: 4 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "RAIDER", at: { x: 13, y: 4 } },
        { role: "RAIDER", at: { x: 11, y: 5 } },
        { role: "CAPTAIN", at: { x: 13, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 10, x1: 11, y1: 15 }] },
      forbiddenTechnologies: [
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
        "CHIVALRY",
        "SAWMILLING",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // Every saucer flies at the Rock.
      directive: { kind: "ASSAULT", target: { x: 8, y: 13 } },
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [{ tag: "SMUGGLERS_ROCK", at: { x: 8, y: 13 } }],
  reinforcements: [
    // The loyalists' landing parties, on the Rock's western shore.
    {
      seat: 1,
      round: 3,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "GUARD", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
      ],
    },
    {
      seat: 1,
      round: 11,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "MARKSMAN", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "GUARD", at: { x: 5, y: 11 } },
      ],
    },
    // Martians beamed down on the island's eastern end.
    {
      seat: 2,
      round: 5,
      units: [
        { role: "CAPTAIN", at: { x: 11, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 13 } },
        { role: "FIGHTER", at: { x: 10, y: 15 } },
      ],
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "CAPTAIN", at: { x: 11, y: 11 } },
        { role: "MARKSMAN", at: { x: 11, y: 13 } },
        { role: "RAIDER", at: { x: 10, y: 15 } },
        { role: "FIGHTER", at: { x: 11, y: 14 } },
      ],
    },
    // The getaway rafts' crew, early, to help dig in.
    {
      seat: 0,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 8, y: 15 } },
        { role: "FIGHTER", at: { x: 7, y: 15 } },
        { role: "GUARD", at: { x: 9, y: 15 } },
        { role: "MARKSMAN", at: { x: 7, y: 14 } },
      ],
    },
  ],
  // Hold the Rock for 16 rounds. The stars: no city lost, and Mogga lives.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "SMUGGLERS_ROCK" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "MOGGA" }],
  },
};
