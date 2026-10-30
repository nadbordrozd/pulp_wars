import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_5` "Everybody Wants the Tongue" (docs/product/SAGA.md section
 * 3.3, G5; the Goblin campaign, `pulp_wars-hmyk.8`). The crew has the
 * vault's loot and a long iron crate that hums, and must hold Smuggler's
 * Rock for 16 rounds until the getaway rafts are ready, against the
 * Baron's last loyal men and Martian saucers that want the crate. Step 5
 * of 6: a hold-out with a break-out.
 *
 * The board is the map generator's (Archipelago 16, seed 10, three seats):
 * three islands. Smuggler's Rock, walled, on the southern one; the
 * loyalists' jungle camp on the north-western; the Martian outpost of Ray
 * Hollow on the north-eastern.
 *
 * Revision 6 (`pulp_wars-mv96`, CAMPAIGN.md section 19.7): the user found
 * revision 5 too easy and with nothing to do but turtle. The enemy is now
 * on the Rock's island from the start, in two beachhead towns that train
 * men every turn: the Baron's Landing on the western end (the loyalists'
 * landing parties come ashore there) and the Saucer Field on the eastern
 * end (the Martians' Brains beam down there). Each keeps a garrison and
 * sends the rest at the Rock. Taking the Landing is the second star, and
 * either town gives the crew a shore for a Port: Gull Islet, a new village
 * in the strait, is a Fire Raft's hop away, and its shallows reach the
 * Martians' island. Eliminating every enemy still wins early.
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
 *    8   ~~~~~~~~v~~~~~~~      v: Gull Islet, a village
 *    9   ~~~~~~~~~~~~~~~~
 *   10   ~~~~~~.~~.^~~~~~
 *   11   ~~~..B.~f.~f~~~~      B: the Baron's Landing, the loyalists'
 *   12   ~~~~.~~..f.M~~~~      M: the Saucer Field, the Martians'
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
  // Revision 6 (`pulp_wars-mv96`, the beachheads): the Baron's Landing and
  // the Saucer Field on the Rock's island, Gull Islet in the strait, the
  // Landing as the second star.
  revision: 6,
  seed: 20261505,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 10,
    // The northern villages are gone (free towns for the loyalists and the
    // Martians, out of the crew's reach). The Rock's island's two villages
    // are the beachheads: the Baron's Landing on the western one, the
    // Saucer Field on the eastern one. Gull Islet is new: one tile of land
    // in the strait, with a village, whose shallows let Fire Rafts cross to
    // the Martians' island.
    edits: [
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 12 }, present: false },
      { kind: "TERRAIN", at: { x: 8, y: 8 }, terrain: "." },
      { kind: "VILLAGE", at: { x: 8, y: 8 }, present: true },
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
    "~~~~~~~~.~~~~~~~",
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
  villages: [{ x: 8, y: 8 }],
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
      // The Rock's island and the islet: both beachheads are known.
      reveal: { radius: 3, rects: [{ x0: 3, y0: 8, x1: 12, y1: 15 }] },
    },
    {
      // Kessler's last loyal men: the jungle camp on the north-western
      // island, and the Baron's Landing, their beachhead on the Rock's own
      // island, where every landing party comes ashore.
      faction: "ORIGINAL",
      coins: 6,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Kessler's Camp",
          at: { x: 2, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Baron's Landing",
          // Level 1: its one bare Grass tile holds no more.
          at: { x: 5, y: 11 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 2 } },
        { role: "FIGHTER", at: { x: 3, y: 2 } },
        // The Landing: a Guard and a rifle hold it, the rest march.
        { role: "GUARD", at: { x: 5, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 4, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 10 }, home: 1 },
        { role: "FIGHTER", at: { x: 4, y: 12 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 11 }, home: 1 },
      ],
      // The Landing knows the Rock it marches on.
      reveal: { radius: 2, rects: [{ x0: 3, y0: 9, x1: 9, y1: 15 }] },
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
      // Two hold the Landing; everyone else rushes the Rock. In hand play
      // the rest mostly dug in at the Landing and shot at the walls; if the
      // hold proves too easy, `ASSAULT` on the Rock is the lever.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 10, x1: 6, y1: 12 }],
        garrison: 2,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Martians: the saucers of Ray Hollow on the north-eastern
      // island, and the Saucer Field, where they set down on the Rock's.
      faction: "MARTIAN",
      coins: 6,
      technologies: ["SCOUTING", "GATHERING", "ADMINISTRATION"],
      cities: [
        {
          name: "Ray Hollow",
          at: { x: 13, y: 4 },
          level: 1,
          rewards: [],
        },
        {
          name: "Saucer Field",
          at: { x: 11, y: 12 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "RAIDER", at: { x: 13, y: 4 } },
        { role: "RAIDER", at: { x: 11, y: 5 } },
        { role: "RAIDER", at: { x: 12, y: 4 } },
        // The Field: a Shield Projector holds it; a Brain, a Ray Gunner and
        // a Grunt go for the crate.
        { role: "GUARD", at: { x: 11, y: 12 }, home: 1 },
        { role: "CAPTAIN", at: { x: 11, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 11, y: 13 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 13 }, home: 1 },
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
      // One holds the Field; every saucer and the rest fly at the Rock.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 11, x1: 12, y1: 13 }],
        garrison: 1,
        others: { kind: "ASSAULT", target: { x: 8, y: 13 } },
      },
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [
    { tag: "SMUGGLERS_ROCK", at: { x: 8, y: 13 } },
    { tag: "BARONS_LANDING", at: { x: 5, y: 11 } },
  ],
  reinforcements: [
    // The loyalists' landing parties, on the Landing's beach.
    {
      seat: 1,
      round: 7,
      units: [
        { role: "GUARD", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 6, y: 10 } },
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
        { role: "GUARD", at: { x: 6, y: 10 } },
      ],
      line: "The pay-clerk lands his escort. The Baron wants the crate by supper.",
      announce: true,
    },
    // Martians beamed down at the Saucer Field.
    {
      seat: 2,
      round: 5,
      units: [
        { role: "CAPTAIN", at: { x: 11, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 14 } },
        { role: "FIGHTER", at: { x: 10, y: 14 } },
      ],
      line: "A saucer sets down a Brain and a few very polite Grunts.",
      announce: true,
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "CAPTAIN", at: { x: 11, y: 11 } },
        { role: "MARKSMAN", at: { x: 11, y: 14 } },
        { role: "RAIDER", at: { x: 10, y: 15 } },
        { role: "FIGHTER", at: { x: 10, y: 14 } },
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
  // Hold the Rock for 16 rounds. The stars: the Baron's Landing is the
  // crew's at the end, and Mogga lives.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "SMUGGLERS_ROCK" }],
    bonus: [
      { kind: "HOLD_PLACE", place: "BARONS_LANDING" },
      { kind: "UNIT_ALIVE", unit: "MOGGA" },
    ],
  },
};
