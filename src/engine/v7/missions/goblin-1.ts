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
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (a skirmish start against a fort of eight and a
 * relief column, which the user found impossible): the camp is level 2
 * with Gathering, 5 Coins, a second Goblin and the two hill villages back;
 * the fort keeps seven men but loses Gathering and Farming again (with
 * them it grew to level 4 in round 1), has 4 Coins, and marches on the
 * camp from round 4. No relief column; a lax 20-round clock.
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
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): eased toward the
  // middle; no relief column, a lax clock.
  revision: 4,
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
      // Retune 3 took the three villages near the camp; retune 4 gives
      // back the two in the hills and keeps the one by the toll road gone.
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
  villages: [
    { x: 2, y: 1 },
    { x: 8, y: 1 },
    { x: 5, y: 4 },
  ],
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
      // Retune 4: a level 2 camp with Gathering and 5 Coins; the Warboss,
      // Snikkit, a Goblin and an Ogre nobody can train yet.
      coins: 5,
      technologies: ["GATHERING"],
      cities: [
        {
          name: "Rustgut Camp",
          at: { x: 8, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Grubnak the Loud, an Orc Warboss, and Snikkit, who can read.
        { role: "CAPTAIN", at: { x: 8, y: 4 }, tag: "GRUBNAK" },
        { role: "FIGHTER", at: { x: 9, y: 3 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 4 } },
      ],
      // The fort's gate, seen from the hills, and nothing else.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 5, x1: 3, y1: 7 }] },
    },
    {
      // Fort Bullion's garrison. Retune 4: seven men (the fort's Guard, the
      // toll's Fighter and a rifle hold; the rest march), a level 2 toll,
      // 4 Coins, and no Gathering or Farming (with them the fort grew to
      // level 4 in round 1).
      faction: "ORIGINAL",
      coins: 4,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
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
      ],
      reveal: { radius: 1 },
      // Step 1 keeps to the lesson: the garrison learns nothing more.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
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
      // The fort and the toll keep three; for three rounds the rest play
      // their game, then they march on the camp.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 5, x1: 3, y1: 7 },
            { x0: 5, y0: 7, x1: 5, y1: 7 },
          ],
          garrison: 3,
          untilRound: 4,
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
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Take the fort and the toll by round 20 (retune 4: a lax clock, about
  // one and a half times a good win). The stars: by round 14, and Snikkit
  // lives.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 14 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
