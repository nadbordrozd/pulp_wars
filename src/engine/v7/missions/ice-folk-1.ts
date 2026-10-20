import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_1` "The Warm Mountain" (docs/product/SAGA.md section 3.7, I1;
 * the Ice Folk campaign, `pulp_wars-hmyk.10`). You lead Mother Rime's
 * people from Rime Camp on the glacier against the Frostbite Boys, a goblin
 * gang that has put a stove in the warm caves below: take both their camps.
 * Step 1 of 6: the Ice Folk from scratch. Frozen units cannot move or act
 * and do not strike back; the Ice Witch's Cold Snap freezes everyone beside
 * her and her Frost Bolt one enemy two tiles off, as does a Sled's; a Yeti
 * walks over the peaks; a badly hurt Frozen enemy hit from the next tile
 * shatters. The Witch's Blizzard halves every shot at her neighbours.
 *
 * The board is the map generator's (Dry Land 11, seed 2): Highlands in the
 * north and west, all peaks; Rime Camp in a hollow among them; the valley
 * of the warm caves opens to the south-east, with Boiler Hole on its
 * shoulder and the Stovepipe on the valley floor.
 *
 * ```text
 *      x 0123456789A
 * y  0   f^.^^^.f.ff
 *    1   ^^^^^.^...^
 *    2   .v^fR^.vff^      R: Rime Camp; v: villages
 *    3   .f^..ffffff
 *    4   ^.f...ffcff      c: a treasure chest
 *    5   ^.^f...B..f      B: Boiler Hole
 *    6   ^ff^.^.....
 *    7   .f^........
 *    8   ..c.S......      S: the Stovepipe
 *    9   .^^.ff.....
 *   10   .ff.ff.....
 * ```
 */
export const ICE_FOLK_1_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261601,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 2,
    // Boiler Hole stands on a village; the three villages of the valley
    // are gone (hand play: the gang settled each of them and trained a
    // Goblin a turn from every one).
    edits: [
      { kind: "VILLAGE", at: { x: 7, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 8 }, present: false },
    ],
  },
  terrain: [
    "f^.^^^.f.ff",
    "^^^^^.^...^",
    "..^f.^..ff^",
    ".f^..ffffff",
    "^.f...ff.ff",
    "^.^f......f",
    "^ff^.^.....",
    ".f^........",
    "...........",
    ".^^.ff.....",
    ".ff.ff.....",
  ],
  resources: [
    ".orooorge..",
    ".ooo.ro.r..",
    "..o..o...go",
    "r.o.r.g.g.g",
    "..g........",
    "o.og.....e.",
    "...oeo.errr",
    "..oreere.r.",
    ".....rerrr.",
    "e.o....er.e",
    ".g..g.er...",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHPPPPPW",
    "HHHHPPPPPPP",
    "HHHPPPPPPPP",
    "HHPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
  ],
  villages: [
    { x: 1, y: 2 },
    { x: 7, y: 2 },
  ],
  treasureChests: [
    { x: 8, y: 4 },
    { x: 2, y: 8 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 5,
      // Leadership (the Ice Witch: Cold Snap and Frost Bolt), the Sled (its
      // Frost Bolt) and Deep Winter (the Musk Ox, whose Frostbite freezes
      // whoever strikes it from the next tile).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Rime Camp",
          at: { x: 4, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 4, y: 3 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "RAIDER", at: { x: 5, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 4 } },
      ],
      // The valley below, as seen from the glacier.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 4, x1: 9, y1: 9 }] },
    },
    {
      // The Frostbite Boys: a goblin gang with a stove.
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "The Stovepipe",
          at: { x: 4, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Boiler Hole", at: { x: 7, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "GUARD", at: { x: 5, y: 8 } },
        { role: "RAIDER", at: { x: 4, y: 7 } },
        { role: "FIGHTER", at: { x: 7, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 5 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 7, y1: 5 }] },
      // Step 1 keeps to the lesson: a gang of Goblins with a Brute and a
      // Wolf Rider, who learn nothing.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
    },
  ],
  landmarks: [
    { tag: "STOVEPIPE", at: { x: 4, y: 8 } },
    { tag: "BOILER_HOLE", at: { x: 7, y: 5 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Both camps. The stars: by round 12, and Rime lives.
  objective: {
    kind: "DOMINATION",
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "RIME" },
    ],
  },
};
