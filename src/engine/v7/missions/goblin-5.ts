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
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (a lean Rock against seven announced waves): the
 * Rock has Mogga, a Brute, a Goblin and a Chucker, five technologies, 5
 * Coins and the eastern village back. The loyalists' first landing party
 * is ashore at the start (their camp is level 2 with 6 Coins), and two
 * more parties land in rounds 7 and 11; the Martians have a Brain and three
 * saucers with 6 Coins and drop in rounds 5 and 9. The raft crews row in
 * in round 12. The sixteen rounds stay. A wave never lands beside a
 * hostile unit: with the beach taken it once came in on the far islands;
 * since `pulp_wars-hmyk.35` it lands within 3 tiles of its beach, or waits
 * up to two rounds and then lands on the nearest free tile.
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
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean Rock against
  // seven announced waves.
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): the first landing
  // party ashore at the start, four waves, a Chucker and the village back.
  // Revision 5 (`pulp_wars-hmyk.35`): no definition change; a blocked wave
  // now lands within 3 tiles of its tiles or waits (up to two rounds)
  // instead of coming in on the far islands, so the same waves play out
  // differently.
  revision: 5,
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
      // Retune 4: four units, five technologies, 5 Coins.
      coins: 5,
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
        { role: "MARKSMAN", at: { x: 9, y: 14 } },
      ],
      // The Rock and the water round it.
      reveal: { radius: 3, rects: [{ x0: 4, y0: 10, x1: 12, y1: 15 }] },
    },
    {
      // Kessler's last loyal men: a jungle camp on the north-western island,
      // who come ashore in landing parties.
      faction: "ORIGINAL",
      // Retune 4: a level 2 camp, two men at home, 6 Coins.
      coins: 6,
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
        // Retune 4: the first landing party is ashore at the start, on the
        // Rock's western shore.
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "GUARD", at: { x: 5, y: 11 } },
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
      // Retune 4: a Brain and three saucers, 6 Coins.
      coins: 6,
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
        { role: "RAIDER", at: { x: 12, y: 4 } },
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
    // The loyalists' landing parties, on the Rock's western shore (retune
    // 4: the first is ashore at the start, two more come).
    {
      seat: 1,
      round: 7,
      units: [
        { role: "GUARD", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
      ],
      line: "More loyalists wade in with a lawyer, a flag and a grudge.",
      announce: true,
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
      line: "The pay-clerk lands his escort. The Baron wants the crate by supper.",
      announce: true,
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
      line: "A saucer sets down a Brain and a few very polite Grunts.",
      announce: true,
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
      line: "Another Brain beams down. It would like a word about the crate.",
      announce: true,
    },
    // The getaway rafts' crew.
    {
      seat: 0,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 8, y: 15 } },
        { role: "FIGHTER", at: { x: 7, y: 15 } },
        { role: "GUARD", at: { x: 9, y: 15 } },
        { role: "MARKSMAN", at: { x: 7, y: 14 } },
      ],
      line: "The getaway rafts' crew rows in, late, to help dig the Rock in.",
      announce: true,
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
