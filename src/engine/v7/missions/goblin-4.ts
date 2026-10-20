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
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 19.4, NOT play
 * tested): the crew lands lean (Snikkit, the Ogre and a Chucker, four
 * technologies, 3 Coins; the village by the beachhead is gone). Port
 * Kessler has ten men (seven on the headland, three outside the neck who
 * march on the beachhead from round 3), 12 Coins and Gathering and
 * Scouting; the tribes have eight men, 8 Coins and a level 2 home, and
 * assault Egg Rock from round 3; four announced waves (the tribes in
 * rounds 4 and 8, the Baron's harbour guard in rounds 6 and 11) come up
 * the island. The clock is 16 rounds.
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
  revision: 3,
  seed: 20261504,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 74,
    // Tarpit and Egg Rock stand on villages.
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 2 }, present: false },
      // Retune 3: no free village by the beachhead.
      { kind: "VILLAGE", at: { x: 9, y: 2 }, present: false },
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
      // Retune 3: a lean landing. Snikkit, the Ogre and a Chucker, four
      // technologies (Bomb Chuckers, Orc Brutes and the way to Explosives),
      // 3 Coins.
      coins: 3,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [{ name: "Egg Rock", at: { x: 6, y: 2 }, level: 1, rewards: [] }],
      units: [
        // Snikkit, who did the sums.
        { role: "FIGHTER", at: { x: 6, y: 2 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 5, y: 2 } },
        { role: "MARKSMAN", at: { x: 4, y: 1 } },
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
      // Retune 3: ten men, 12 Coins, Gathering and Scouting.
      coins: 12,
      technologies: [
        "GATHERING",
        "SCOUTING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Port Kessler",
          at: { x: 4, y: 5 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      // Seven on the headland, in the order of the garrison, then three
      // outside the neck who march on the beachhead.
      units: [
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "MARKSMAN", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "MARKSMAN", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 2, y: 5 } },
        { role: "GUARD", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
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
      // The garrison holds the headland and its neck; from round 3 the
      // three outside the neck march on the beachhead.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 1, y0: 4, x1: 5, y1: 6 }],
          garrison: 7,
          untilRound: 3,
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
      // Retune 3: a level 2 home, eight men, 8 Coins.
      coins: 8,
      technologies: ["GATHERING", "HUNTING", "SCOUTING"],
      // Fernhollow, their home, is on the north-eastern island; Tarpit is
      // the hunting camp on the Baron's island, and the hunters keep coming
      // out of the jungle (the waves below).
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
        { role: "FIGHTER", at: { x: 4, y: 0 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 2 } },
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: ["METALLURGY", "CHIVALRY"],
      // The tribes bite whoever lands: from round 3 they storm Egg Rock.
      directive: [
        { kind: "NORMAL", untilRound: 3 },
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
  // The island's hunters, out of the jungle on its western end, and the
  // Baron's harbour guard, up the neck.
  reinforcements: [
    {
      seat: 2,
      round: 4,
      units: [
        { role: "RAIDER", at: { x: 0, y: 2 } },
        { role: "FIGHTER", at: { x: 1, y: 1 } },
        { role: "RAIDER", at: { x: 0, y: 0 } },
      ],
      line: "The hunters come out of the jungle, painted for the occasion.",
      announce: true,
    },
    {
      seat: 1,
      round: 6,
      units: [
        { role: "GUARD", at: { x: 3, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 3 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
      line: "The Baron's harbour guard doubles up the neck, grumbling.",
      announce: true,
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "SWORDSMAN", at: { x: 1, y: 1 } },
        { role: "RAIDER", at: { x: 0, y: 2 } },
        { role: "FIGHTER", at: { x: 0, y: 3 } },
        { role: "RAIDER", at: { x: 0, y: 0 } },
      ],
      line: "The tribes' chief walks out of the trees, and he is not alone.",
      announce: true,
    },
    {
      seat: 1,
      round: 11,
      units: [
        { role: "GUARD", at: { x: 3, y: 3 } },
        { role: "GUARD", at: { x: 4, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 3 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
      line: "The Baron's last pay-packet buys him four more guards.",
      announce: true,
    },
  ],
  // Capture Port Kessler by round 16 (it was 20). The stars: by round 13,
  // and Snikkit lives.
  objective: {
    kind: "CAPTURE",
    places: ["PORT_KESSLER"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 13 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
