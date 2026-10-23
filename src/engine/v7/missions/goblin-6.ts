import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_6` "The Big Getaway" (docs/product/SAGA.md section 3.3, G6; the
 * Goblin campaign, `pulp_wars-hmyk.8`). The crew has turned down the
 * polite man in grey and must get the loot-cart, with the bell's clapper in
 * it, from the river quay to Thane Ironbraid at the Ironbraid Gate, through
 * the Grey Lodge's brethren and the Unquiet. Step 6 of 6: an escort.
 *
 * The board is the map generator's (Pangea 20, seed 5, four seats): the
 * goblins' river quay and Grubnak's Hall in the south-east, the open middle
 * country, the Unquiet's barrow in the south-west, the Lodge's two camps
 * beside the road, and the Ironbraid Gate at the foot of the mountains in
 * the north-west, reached from the south through one pass. The Getaway is
 * a tagged Scrap Buggy: fast and fragile. No unit may enter an ally's
 * land, so the cart arrives within two tiles of the Gate. A Hexer turns
 * the best escort into a frog, a Familiar swaps the cart out of its
 * convoy, and the dead come from the barrows: kill the Hexers first and
 * keep the cart inside the mob.
 *
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (a lean crew against a Lodge of thirteen, eight
 * dead and four waves): the Hall is level 3 and walled again with the River
 * Quay, the crew has the Getaway, the Warboss, an Ogre, a Goblin, a Brute
 * and a Chucker, eight technologies and 6 Coins, and the village up the
 * road is back. The Lodge has fifteen men with 6 Coins: its second choir
 * (a Hexer, a Familiar, an Initiate and an Idol Bearer) is on the road
 * from the start instead of a wave; the dead have six and 5 Coins. No
 * waves; the escort keeps a meaningful clock of 14 rounds.
 *
 * ```text
 *      x 01234567890123456789
 * y  1   ~~~~~.f^.f^^.ff~~~~~
 *    2   ~~~.^^^^.^f.ff..~~~~
 *    3   ~~.^^^^.^^^......~~~
 *    4   ~.^^^.I^^^^^......~~      I: the Ironbraid Gate (the Thane's)
 *    5   ~f.^^.f.^^^.f..f...~
 *    6   ~.^^fff.^^^^.......~
 *    7   ~fff^ff..^^x^f...ff~
 *    8   ~..^.H^..^^x......^~      H: Hood Camp (the Lodge's)
 *    9   ~^^ff.^.fffx......f~
 *   10   ~.ffffffff.........~
 *   11   ~f.ffW..fff.....ff.f~      W: Wick Chapel (the Lodge's)
 *   12   ~...ff..f.^....ffff~
 *   13   ~.......f......^f..~
 *   14   ~fB....f..........Q~      B: Gallowmound (the Unquiet's); Q: the quay
 *   15   ~^f^.ff^.....G...f~~      G: Grubnak's Hall
 * ```
 */
export const GOBLIN_6_V7: MissionDefinitionV7 = {
  id: "GOBLIN_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean crew, bigger
  // enemies and four announced waves on a 16-round clock.
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): the Hall and Quay
  // back, the Lodge's second choir on the road from the start, no waves.
  revision: 4,
  seed: 20261506,
  // <map>
  size: 20,
  source: {
    mapType: "PANGEA",
    size: 20,
    seats: 4,
    seed: 5,
    // The quay and the Lodge's two camps stand on villages; the villages
    // beside the barrow and the camps would feed the dead and the Lodge.
    edits: [
      { kind: "VILLAGE", at: { x: 17, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 17 }, present: false },
      // Retune 3 took the three villages near the Hall; retune 4 gives
      // back the one up the road.
      { kind: "VILLAGE", at: { x: 12, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 11 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~.f^.f^^.ff~~~~~",
    "~~~.^^^^.^f.ff..~~~~",
    "~~.^^^^f^^^......~~~",
    "~.^^^..f^^^^......~~",
    "~f.^^.f.^^^.f..f...~",
    "~.^^fff.^^^^.......~",
    "~fff^ff..^^x^f...ff~",
    "~..^..^..^^x......^~",
    "~^^ff.^.fffx......f~",
    "~.ffffffff.........~",
    "~f.ff..fff.....ff.f~",
    "~...ff..f.^....ffff~",
    "~.......f......^f..~",
    "~f.....f...........~",
    "~^f^.ff^....f....f~~",
    "~~~f^.^^^........~~~",
    "~~~~..f^.f^..f..f~~~",
    "~~~~~^.f^^....~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "....p.........p..p..",
    ".p.s...o..........p.",
    "..s.o.oo.o...g......",
    ".s...oogo..erre.es..",
    "...oor..o.oo.e.rr.s.",
    "....o.g..oo......e.p",
    "..oo.....oo..e...e..",
    "..g.o....o..o.e..gg.",
    ".r.o.....oo..e..e...",
    "p.og.ro..g........gs",
    ".e..ggg..g.err...ee.",
    "...g..e....eer..g...",
    ".....g.rg.oe...g....",
    "..r.....g...rero....",
    "sg..r..g.e.er.rr...p",
    "sog...go.e..g...e.sp",
    ".s.goeooo.e.e.r...p.",
    "....e.....or..e..s..",
    ".....o.go..e..s...p.",
    ".......ss...sp..pp.p",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPHHHHHPPPPPPPPPP",
    "PPPHHHHHHHPPPPPPPPPP",
    "PPHHHHHHHHHPPPPPPPPP",
    "PHHHHHHHHHHHPPPPPPPP",
    "PHHHHHHHHHHHHPPPPPPP",
    "PHHHHHHHHHHHHPPPPPWP",
    "PHHHHHHHHHHHHPPPPWWP",
    "PHHHHHHHHHHHPPPPWWWP",
    "PWWWWWWWWWWPPPWWWWWP",
    "PWWWWWWWWWWPPPWWWWWP",
    "PWWWWWWWWWWPPPWWWWWP",
    "PWWWWWWWWWPPPPWWWWWP",
    "PWWWWWWWWPPPPPPWWWWP",
    "PWWWWWWWPPPPPPPPWWWP",
    "PHHHHHHHPPPPPPPPPWPP",
    "PPPHHHHHHPPPPPPPPPPP",
    "PPPPHHHHHHPPPPPPPPPP",
    "PPPPPHHHHHHPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 5, y: 1 },
    { x: 8, y: 1 },
    { x: 11, y: 2 },
    { x: 15, y: 2 },
    { x: 2, y: 5 },
    { x: 11, y: 5 },
    { x: 14, y: 8 },
    { x: 14, y: 11 },
    { x: 17, y: 8 },
    { x: 8, y: 14 },
    { x: 8, y: 17 },
  ],
  treasureChests: [
    { x: 12, y: 1 },
    { x: 13, y: 5 },
    { x: 10, y: 9 },
    { x: 14, y: 9 },
  ],
  // </map>
  // The Gate's mine in the mountain behind it.
  improvements: [{ at: { x: 5, y: 3 }, improvement: "MINE" }],
  // The barrow's dead, waiting.
  graves: [
    { x: 3, y: 12 },
    { x: 4, y: 13 },
    { x: 1, y: 12 },
    { x: 4, y: 15 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Retune 4: eight technologies (Scrap Buggies, Bomb Chuckers, Orc
      // Brutes), 6 Coins, the Hall walled and the River Quay back.
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Grubnak's Hall",
          at: { x: 13, y: 15 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "River Quay", at: { x: 17, y: 14 }, level: 1, rewards: [] },
      ],
      units: [
        // The Getaway, a Scrap Buggy with the crate lashed on.
        { role: "KNIGHT", at: { x: 16, y: 14 }, home: 1, tag: "GETAWAY" },
        { role: "CAPTAIN", at: { x: 14, y: 14 } },
        { role: "SWORDSMAN", at: { x: 15, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 15 } },
        { role: "GUARD", at: { x: 12, y: 14 } },
        { role: "MARKSMAN", at: { x: 14, y: 15 } },
      ],
      // The Hall, the road's first stretch and the Gate (the objective's
      // place must be known); the rest is unexplored.
      reveal: {
        radius: 2,
        rects: [
          { x0: 10, y0: 10, x1: 16, y1: 15 },
          { x0: 5, y0: 3, x1: 7, y1: 5 },
        ],
      },
    },
    {
      // The Grey Lodge's Candlewick brethren, in two camps beside the road.
      faction: "CULT",
      // Retune 4: 6 Coins (Favour stays 6) and fifteen men.
      coins: 6,
      favour: 6,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Hood Camp",
          at: { x: 5, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Wick Chapel", at: { x: 5, y: 11 }, level: 1, rewards: [] },
      ],
      // The camps' holders first: the garrison is chosen among the units
      // inside the zones.
      units: [
        { role: "GUARD", at: { x: 5, y: 8 } },
        { role: "GUARD", at: { x: 5, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 7, y: 9 } },
        { role: "MARKSMAN", at: { x: 6, y: 11 }, home: 1 },
        { role: "CAPTAIN", at: { x: 4, y: 8 } },
        { role: "RAIDER", at: { x: 7, y: 8 } },
        { role: "FIGHTER", at: { x: 7, y: 10 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 11 }, home: 1 },
        { role: "RAIDER", at: { x: 6, y: 12 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 10 }, home: 1 },
        { role: "MARKSMAN", at: { x: 7, y: 11 }, home: 1 },
        // Retune 4: retune 3's second choir is on the road from the start.
        { role: "MARKSMAN", at: { x: 9, y: 12 } },
        { role: "RAIDER", at: { x: 10, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 11 } },
        { role: "GUARD", at: { x: 9, y: 11 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 9, x1: 14, y1: 15 }] },
      forbiddenTechnologies: [
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "METALLURGY",
        "ENGINEERING",
        "EXPLOSIVES",
      ],
      // The camps keep four; the rest go for Grubnak's Hall.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 4, y0: 7, x1: 6, y1: 9 },
          { x0: 4, y0: 10, x1: 6, y1: 12 },
        ],
        garrison: 4,
        others: { kind: "ASSAULT", target: { x: 13, y: 15 } },
      },
    },
    {
      // The Unquiet of the barrow country.
      faction: "UNDEAD",
      // Retune 4: six dead, 5 Coins.
      coins: 5,
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING", "DRILL"],
      cities: [
        {
          name: "Gallowmound",
          at: { x: 2, y: 14 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 14 } },
        { role: "CAPTAIN", at: { x: 3, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 3, y: 13 } },
        { role: "GUARD", at: { x: 1, y: 14 } },
        { role: "CAPTAIN", at: { x: 4, y: 12 } },
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: [
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SAWMILLING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
    {
      // Thane Ironbraid's escort, holding the Ironbraid Gate.
      faction: "DWARF",
      coins: 4,
      technologies: ["DRILL", "FORTIFICATION", "MARKSMANSHIP", "HUNTING"],
      cities: [
        {
          name: "Ironbraid Gate",
          at: { x: 6, y: 4 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 4 } },
        { role: "MARKSMAN", at: { x: 5, y: 4 } },
        { role: "FIGHTER", at: { x: 7, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
      ],
      reveal: { radius: 3 },
      // The Thane's escort holds the Gate's land.
      directive: { kind: "HOLD", zone: [{ x0: 5, y0: 3, x1: 7, y1: 5 }] },
    },
  ],
  teams: [0, 1, 1, 0],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "IRONBRAID_GATE", at: { x: 6, y: 4 } }],
  // Bring the Getaway within two tiles of the Gate by round 14 (retune 4:
  // an escort keeps a meaningful clock; the saga's was 24). The stars: by
  // round 10, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "GETAWAY",
    to: "IRONBRAID_GATE",
    within: 2,
    byRound: 14,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 10 }, { kind: "KEEP_CITIES" }],
  },
};
