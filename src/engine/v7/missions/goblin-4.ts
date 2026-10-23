import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_4` "The Inside Job" (docs/product/SAGA.md section 3.3, G4; the
 * Goblin campaign, `pulp_wars-hmyk.8`). The crew has landed at Egg Rock on
 * the Baron's island. Port Kessler, with the vault under its harbour,
 * stands walled on a headland joined to the island by one narrow neck that
 * the Baron's garrison holds; on the hill above the neck stands the Baron's
 * Moon Gun, a circus cannon built to fire a man at the moon. Capture Port
 * Kessler by round 20, while the island's tribes bite everyone. Step 4 of
 * 6.
 *
 * The board is the map generator's (Archipelago 16, seed 74, three seats):
 * the Baron's island is the north-western one, with Port Kessler on its
 * southern headland, joined to the island by a single tile (the neck); the
 * crew's beachhead, Egg Rock, on its eastern shore; the tribes' village,
 * Tarpit, in the middle, beside the hill of the Moon Gun. The Moon Gun (a
 * mission curiosity, E1) fires a unit standing on it to any empty land
 * tile within five, once a turn, and the unit lands spent: drop the
 * sturdiest behind the garrison and time the last drop with the assault up
 * the neck.
 *
 * Hand play (the Goblin campaign's record in CAMPAIGN.md) set the numbers:
 * the garrison is six, one more than the port's slots (with free slots it
 * put a fresh Fighter on its centre whenever the centre emptied), and the
 * crew has Land Grants (it had Coins and no free slot). The tribes' home
 * is Fernhollow on the north-eastern island (with only Tarpit they were
 * gone in round 2), and their hunters come in two waves of two (waves of
 * three in rounds 4, 8 and 12 retook Tarpit and swamped the crew). Snikkit
 * starts on Egg Rock: beside the Bomb Chucker its death blast left him at
 * 1 HP in round 1.
 *
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (a lean landing against a port of ten, assaulting
 * tribes and four waves on a 16-round clock): the crew lands with Snikkit,
 * the Ogre, a Chucker and an Orc Brute, seven technologies (Leadership and
 * Land Grants back) and 5 Coins (Egg Rock stays level 1: it has no Grass to
 * grow on); the port has nine (seven on the headland, two outside the neck
 * who march from round 4) and 6 Coins; the tribes six and 5 Coins, storming
 * Egg Rock from round 4. No waves; a lax 20-round clock.
 *
 * ```text
 *      x 0123456
 * y  0   .^^.ff~
 *    1   ^.M.f.~      M: the Moon Gun
 *    2   .fT.ffE      T: Tarpit, the tribes'; E: Egg Rock, yours
 *    3   f^ffff^
 *    4   .~~N~~~      N: the neck
 *    5   ~~.fP.~      P: Port Kessler
 *    6   ~f~~~.~
 * ```
 */
export const GOBLIN_4_V7: MissionDefinitionV7 = {
  id: "GOBLIN_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean landing
  // against a port of ten, assaulting tribes and four announced waves.
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): a Brute and three
  // technologies more, a port of nine, no waves, a lax clock.
  revision: 4,
  seed: 20261504,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 74,
    // Tarpit and Egg Rock stand on villages (retune 4 gives back the one
    // across the water from Egg Rock).
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 2 }, present: false },
    ],
  },
  terrain: [
    ".^^.ff~~~~..fff^",
    "^...f.~~~.f..f^.",
    ".ff.ff.~~.....ff",
    "f^ffff^~~......^",
    ".~~.~~~~~~~~....",
    "~~.f..~~~~~~.f.~",
    "~f~~~.~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~f~~~~~~~.~~",
    "~~~~.~.~~~~~~~~~",
    "~~~~~~.~~..~f~~~",
    "~~~~~f..f^^~~~~~",
    "~~~~~ff^f^..~~~~",
    "~~~~~~..ff..~~~~",
    "~~~~~~..^f..^~~~",
  ],
  resources: [
    "eo.egg.....r.g..",
    "o..ege..s....g.r",
    "..........ere.g.",
    ".o..gg..se..e...",
    ".psr.p....ps..ee",
    "..r..rspp...e...",
    "..ps.ep.p....s..",
    "ps..pp..........",
    "...p...p.p...s..",
    "..p.sg.p......s.",
    "......epp..p....",
    ".p..p...s..s....",
    ".p....e.goo.sp.p",
    "p...sggo...rs...",
    "....ps..g.r.p..p",
    "..p..s..og..o.p.",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWPPPPPPPPPP",
    "WWWWWWPPPPPPPPPP",
    "WWWWWWWPPPPPPPPP",
    "WWWWWWWPPPPPPPPP",
    "WPPWPPPPPPPPPPPP",
    "PPWWPPPPPPPPPPPP",
    "PWPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPHPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPHPHPPP",
    "PPPPPPPPPHHPPPPP",
    "PPPPPPPPHHHHPPPP",
    "PPPPPPPHHHHHPPPP",
    "PPPPPPHHHHHHHPPP",
  ],
  villages: [
    { x: 9, y: 2 },
    { x: 14, y: 5 },
    { x: 6, y: 11 },
    { x: 7, y: 14 },
  ],
  treasureChests: [
    { x: 15, y: 2 },
    { x: 13, y: 5 },
  ],
  // </map>
  // Port Kessler's farm and timber yard, behind its walls.
  improvements: [
    { at: { x: 5, y: 6 }, improvement: "FARM" },
    { at: { x: 3, y: 5 }, improvement: "LUMBER_CAMP" },
  ],
  // The Baron's Moon Gun, on the hill above the neck (E1).
  curiosities: [{ kind: "MOON_GUN", at: { x: 2, y: 1 } }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Retune 4: Snikkit, the Ogre, a Chucker and an Orc Brute, seven
      // technologies (Land Grants, Bomb Chuckers, Orc Brutes and the way to
      // Explosives), 5 Coins.
      coins: 5,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [{ name: "Egg Rock", at: { x: 6, y: 2 }, level: 1, rewards: [] }],
      units: [
        // Snikkit, who did the sums.
        { role: "FIGHTER", at: { x: 6, y: 2 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 5, y: 2 } },
        { role: "MARKSMAN", at: { x: 4, y: 1 } },
        { role: "GUARD", at: { x: 5, y: 3 } },
      ],
      // The beachhead, the hills round the Gun and the port's own tiles
      // (the objective's place must be known).
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 0, x1: 6, y1: 3 },
          { x0: 3, y0: 4, x1: 5, y1: 6 },
        ],
      },
    },
    {
      // Kessler's island garrison: Port Kessler, walled, with its guns on
      // the headland. The Baron himself stays in his counting-house.
      faction: "ORIGINAL",
      // Retune 4: nine men and 6 Coins.
      coins: 6,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Port Kessler",
          at: { x: 4, y: 5 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      // Seven on the headland, in the order of the garrison, then two
      // outside the neck who march on the beachhead.
      units: [
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "MARKSMAN", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "MARKSMAN", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 2, y: 5 } },
        { role: "GUARD", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 3 } },
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The garrison holds the headland and its neck; from round 4 the
      // two outside the neck march on the beachhead.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 1, y0: 4, x1: 5, y1: 6 }],
          garrison: 7,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 1, y0: 4, x1: 5, y1: 6 }],
          garrison: 7,
          others: { kind: "RUSH" },
        },
      ],
    },
    {
      // The island's tribes, who bite whoever lands.
      faction: "DINOSAUR",
      // Retune 4: a level 2 home, six men, 5 Coins.
      coins: 5,
      technologies: ["GATHERING", "HUNTING", "SCOUTING"],
      // Fernhollow, their home, is on the north-eastern island; Tarpit is
      // the hunting camp on the Baron's island.
      cities: [
        {
          name: "Fernhollow",
          at: { x: 13, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Tarpit", at: { x: 3, y: 2 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 2 } },
        { role: "RAIDER", at: { x: 3, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 2, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 3, y: 1 }, home: 1 },
        { role: "RAIDER", at: { x: 1, y: 1 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 2 } },
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: ["METALLURGY", "CHIVALRY"],
      // The tribes bite whoever lands: from round 4 they storm Egg Rock.
      directive: [
        { kind: "NORMAL", untilRound: 4 },
        { kind: "ASSAULT", target: { x: 6, y: 2 } },
      ],
    },
  ],
  // The sea is the Baron's last moat: no ships this time.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "PORT_KESSLER", at: { x: 4, y: 5 } }],
  // Capture Port Kessler by round 20 (retune 4: lax). The stars: by round
  // 15, and Snikkit lives.
  objective: {
    kind: "CAPTURE",
    places: ["PORT_KESSLER"],
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 15 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
