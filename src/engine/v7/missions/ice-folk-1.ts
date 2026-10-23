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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): a skirmish start. Rime Camp is level 1 with Mother Rime, a
 * Fighter and the one Guard nobody can train yet, no technology and 3 Coins;
 * both villages by the camp are gone. The Frostbite Boys have two level 2
 * camps, ten Goblins, Coins to train more, hold
 * home for three rounds and then send all but three at the camp; a second
 * gang comes up the valley in round 7.
 *
 * The fourth retune (`pulp_wars-hmyk.31`, CAMPAIGN.md section 22.5,
 * hand-played): eased toward the middle. Rime Camp is level 2 with
 * Gathering, 5 Coins and a second Yeti, and both villages by the camp are
 * back. The Frostbite Boys keep the Stovepipe at level 2 but Boiler Hole is
 * level 1; eight Goblins and no Coins, home for four rounds and then all
 * but three at the camp; the second gang is gone. The clock is 22 (star
 * 15).
 */
export const ICE_FOLK_1_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against a bigger, marching gang.
  // Revision 4 (`pulp_wars-hmyk.31`, the fourth retune): eased toward
  // the middle.
  revision: 4,
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
      // Retune 3: nothing free by the camp. Retune 4: both villages by
      // the camp are back.
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
      // Retune 3 (`pulp_wars-hmyk.21`): a skirmish start. A level 1 camp,
      // Mother Rime, a Fighter and one Guard nobody can train yet (no
      // Fortification), no technology. Retune 4: level 2, Gathering, 5 Coins
      // and a second Yeti.
      coins: 5,
      technologies: ["GATHERING"],
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
        { role: "GUARD", at: { x: 4, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
      ],
      // The camp and the two camps below it, and nothing else.
      reveal: {
        radius: 2,
        rects: [
          { x0: 4, y0: 8, x1: 4, y1: 8 },
          { x0: 7, y0: 5, x1: 7, y1: 5 },
        ],
      },
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
        // Retune 3: four more, and a second Raider (retune 4: a Fighter and
        // the Raider are gone again).
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "GUARD", at: { x: 6, y: 5 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 2, x1: 7, y1: 4 }] },
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
      // Retune 3: they hold home for three rounds (Boiler Hole and the
      // Stovepipe, all ten), then all but three march on Rime Camp. Retune
      // 4: four rounds, all eight.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 3, y0: 6, x1: 8, y1: 9 },
            { x0: 6, y0: 4, x1: 8, y1: 6 },
          ],
          garrison: 8,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 3, y0: 7, x1: 5, y1: 9 },
            { x0: 6, y0: 4, x1: 8, y1: 6 },
          ],
          garrison: 3,
          others: { kind: "RUSH" },
          fromRound: 4,
        },
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
  // Both camps, by round 22. The stars: by round 15, and Rime lives.
  objective: {
    kind: "DOMINATION",
    byRound: 22,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 15 },
      { kind: "UNIT_ALIVE", unit: "RIME" },
    ],
  },
};
