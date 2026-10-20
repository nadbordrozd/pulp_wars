import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_1` "Grubnak Gets Bored" (docs/product/SAGA.md section 3.3, G1;
 * the Goblin campaign, `pulp_wars-hmyk.8`). You lead Grubnak the Loud's
 * goblins against the last of Baron Kessler's soldiers on the mainland, in
 * Fort Bullion, on an 11 x 11 board. Step 1 of 6: the Goblins from
 * scratch. Each goblin unit beside a target gives the next goblin's hit +1
 * Attack (an Ogre +2), up to +3; a Goblin may Kaboom (it dies and hits
 * everything around it for 6); the Warboss's Berserk sends the goblins
 * near him an extra tile through the enemy's lines.
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 19.4, NOT play
 * tested): a skirmish start. The camp is level 1 with Grubnak, Snikkit and
 * the Ogre (nobody can train another yet), no technology and 2 Coins; the
 * three villages near the camp are gone. Fort Bullion has a garrison of
 * eight, Gathering and Farming, and 10 Coins; three hold the fort and its
 * toll and the rest march on the camp from round 3. The Baron's relief
 * column lands in round 6. The clock is 14 rounds.
 *
 * The board is the map generator's (Dry Land 11, seed 1): wooded hills in
 * the east, where the goblins camp, and plains in the west, where Fort
 * Bullion stands walled with its toll village to the south-east.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^.^f^^..f.f
 *    1   .^v.f.^.v..      v: villages
 *    2   ^.ff^$..f.f      $: treasure chests
 *    3   .f^fff..^ff
 *    4   ..^..vffR..      R: Rustgut Camp, yours
 *    5   ....fff^.$^
 *    6   ..B..f..ff.      B: Fort Bullion
 *    7   ..f..T...f.      T: Bullion Toll
 *    8   .......f^f^
 *    9   f......^fff
 *   10   .......f^ff
 * ```
 */
export const GOBLIN_1_V7: MissionDefinitionV7 = {
  id: "GOBLIN_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against a fort of eight that marches from round 3.
  revision: 3,
  seed: 20261501,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 1,
    // Bullion Toll stands on a village; the village behind the goblin camp
    // would be a free second town for the goblins.
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
      // Retune 3: no free village within reach of the camp.
      { kind: "VILLAGE", at: { x: 8, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 7 }, present: false },
    ],
  },
  terrain: [
    "^.^f^^..f.f",
    ".^..f.^....",
    "^.ff^...f.f",
    ".f^fff..^ff",
    "..^...ff...",
    "....fff^..^",
    ".....f..ff.",
    "..f...f..ff",
    ".......f^f^",
    "f......^fff",
    ".......f^ff",
  ],
  resources: [
    "o.o..o....g",
    ".o....o...e",
    "o...o..r...",
    "eg..gg.rogg",
    "..o.r..g...",
    "re.e...o...",
    ".e.rrger.g.",
    "er.er....g.",
    "..erer.g.g.",
    "greee..ogg.",
    ".rerre..o..",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHWWW",
    "HHHHHHHWWWW",
    "HHHHHHWWWWW",
    "HHHHHWWWWWW",
    "PHHHWWWWWWW",
    "PPPPWWWWWWW",
    "PPPPPWWWWWW",
    "PPPPPPWWWWW",
    "PPPPPPPWWWW",
    "PPPPPPPWWWW",
    "PPPPPPPWWWW",
  ],
  villages: [{ x: 2, y: 1 }],
  treasureChests: [
    { x: 5, y: 2 },
    { x: 9, y: 5 },
  ],
  // </map>
  // Fort Bullion's farm, on the fertile ground north of its walls.
  improvements: [{ at: { x: 1, y: 5 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Retune 3: a skirmish start. One level 1 camp, the Warboss, Snikkit
      // and an Ogre nobody can train yet, no technology, 2 Coins.
      coins: 2,
      technologies: [],
      cities: [
        { name: "Rustgut Camp", at: { x: 8, y: 4 }, level: 1, rewards: [] },
      ],
      units: [
        // Grubnak the Loud, an Orc Warboss, and Snikkit, who can read.
        { role: "CAPTAIN", at: { x: 8, y: 4 }, tag: "GRUBNAK" },
        { role: "FIGHTER", at: { x: 9, y: 3 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 8, y: 5 } },
      ],
      // The fort's gate, seen from the hills, and nothing else.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 5, x1: 3, y1: 7 }] },
    },
    {
      // Fort Bullion's garrison. Retune 3: eight men (the fort's Guard, the
      // toll's Fighter and a rifle hold; the rest march), a level 2 toll,
      // 10 Coins, Gathering and Farming.
      faction: "ORIGINAL",
      coins: 10,
      technologies: [
        "GATHERING",
        "FARMING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Bullion",
          at: { x: 2, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Bullion Toll",
          at: { x: 5, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      // The three holders first: a garrison is chosen by unit ID among the
      // units inside the zones.
      units: [
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "FIGHTER", at: { x: 4, y: 6 } },
        { role: "MARKSMAN", at: { x: 4, y: 5 } },
        { role: "GUARD", at: { x: 4, y: 7 } },
      ],
      reveal: { radius: 1 },
      // Step 1 keeps to the lesson: the garrison learns nothing more.
      forbiddenTechnologies: [
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The fort and the toll keep three; for two rounds the rest play
      // their game, then they march on the camp.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 5, x1: 3, y1: 7 },
            { x0: 5, y0: 7, x1: 5, y1: 7 },
          ],
          garrison: 3,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 5, x1: 3, y1: 7 },
            { x0: 5, y0: 7, x1: 5, y1: 7 },
          ],
          garrison: 3,
          others: { kind: "RUSH" },
        },
      ],
    },
  ],
  // The Baron's relief column, up the road from the toll.
  reinforcements: [
    {
      seat: 1,
      round: 6,
      units: [
        { role: "GUARD", at: { x: 5, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "MARKSMAN", at: { x: 6, y: 8 } },
      ],
      line: "The Baron's relief column marches up the road, in step.",
      announce: true,
    },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Take the fort and the toll by round 14 (retune 3; it had no clock).
  // The stars: by round 10, and Snikkit lives.
  objective: {
    kind: "DOMINATION",
    byRound: 14,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 10 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
