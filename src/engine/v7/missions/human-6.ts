import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_6` "Kessler Hall" (docs/product/SAGA.md section 3.1, H6;
 * `pulp_wars-hmyk.4`). The Humans campaign's finale: take Kessler Hall by
 * round 22 against three teamed armies with three kinds of trouble, the
 * Redcaps' Gang Up in the toll forts, the circus beasts' Charge on the
 * lawns, and the Grey Lodge's daemons by the chapel. Step 6 of 6: a
 * multi-front siege; take the armies apart one at a time.
 *
 * The board is the map generator's (Pangea 20, seed 16): the Frontier's
 * highlands in the south with Fort Steele and the Redcaps' Kessler's
 * Toll; a band of peaks across the middle crossed by three roads, each
 * held by a walled
 * Redcap toll fort; and the Baron's plain in the north, with the Hall in
 * the middle, the Lodge's chapel town west of it and the menagerie east of
 * it. The Redcaps hold their forts and the Hall and send the rest at you;
 * the beasts keep to the Hall's grounds; the Lodge keeps its chapel and
 * the Hall's west lawn. The saga's lightning tower, a Tesla Tower (mission
 * curiosities, SAGA.md section 4, E1; `pulp_wars-hmyk.14`), stands on the
 * Hall's lawn two tiles before its gate, so whoever holds it zaps the
 * gate's Troll (hand play: one zap and three Knights took the Troll in
 * round 11, where four Knights were needed without it).
 *
 * Hand play (CAMPAIGN.md section 15) set the numbers: a Troll holds the
 * Hall's gate and one Redcap the gate of each fort (with an Orc Brute on
 * the Hall, two Knights' Overrun chains took it in round 10); the Redcaps
 * learn nothing (with Drill and Engineering, Workshops and Mines raised a
 * fort from level 3 to 6 and two Trolls in seven rounds); and the clock is
 * 22 rounds, not the saga's 26 (a thoughtful run took the Hall in round 13).
 *
 * The second retune (`pulp_wars-hmyk.19`, CAMPAIGN.md section 15.5): Fort
 * Steele alone and a column of three Knights, a Catapult nobody can build
 * again, two Fighters and a Marksman, eight technologies; Kessler's Toll
 * is the Baron's again (five gates to hold, five Redcaps on them), the
 * rest of the Redcaps march from round 4 with three more Goblins, three
 * bands of hired swords come behind the tolls (rounds 5, 9 and 13), the
 * menagerie has two more Raptors, and four of the six villages on the
 * Frontier's side are gone. With the Lodge hunting from round 6 and no
 * Chivalry the column died by round 7 in two tries.
 *
 * ```text
 *      x 01234567890123456789
 * y  0   ~~~~~~~~~~~~~~~~~~~~
 *    1   ~~~~~.^^......f~~~~~
 *    2   ~~~~......f$...f.~~~      $: treasure chests
 *    3   ~~^...ff^........f~~
 *    4   ~~....^f..K....f^.~~      K: Kessler Hall
 *    5   ~.f..fC...f...ff$..~      C: Greyfriars, the Lodge's chapel
 *    6   ~.^...^...Z..ff.ff.~      Z: the Tesla Tower
 *    7   ~f........^..^M.fff~      M: the Menagerie
 *    8   ~f.......$...ff.ff^~
 *    9   ~.f..........f.fff^~
 *   10   ~f.$....xxx..^..fff~      x: the Rift
 *   11   ~ff.W...^^^.G^^.^.R~      W, G, R: Weir, Gallows and Ridge Toll
 *   12   ~ffff..^^^^^f^f^^.^~
 *   13   ~fffff.^^^^..^^.^f.~
 *   14   ~~f.f.vf^.f^^Tf^...~      T: Kessler's Toll (Redcap); v: villages
 *   15   ~~ff.f.^..f.^fffff~~
 *   16   ~~^f..^..^f..fff^.~~
 *   17   ~~~~.fS.f.^^v^^.~~~~      S: Fort Steele
 *   18   ~~~~~..^.f^^f^.~~~~~
 *   19   ~~~~~~~~~~~~~~~~~~~~
 * ```
 */
export const HUMAN_6_V7: MissionDefinitionV7 = {
  id: "HUMAN_6",
  // Revision 2 (`pulp_wars-hmyk.14`): the Tesla Tower on the Hall's lawn.
  // Revision 3 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 4 (`pulp_wars-hmyk.19`, the second retune): one fort and a
  // veteran column against five walled tolls, rushing Redcaps, waves of
  // hired swords and fewer free villages.
  revision: 4,
  seed: 20261206,
  // <map>
  size: 20,
  source: {
    mapType: "PANGEA",
    size: 20,
    seats: 4,
    seed: 16,
    edits: [
      { kind: "VILLAGE", at: { x: 6, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 16, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 15, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 15, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 14 }, present: false },
      { kind: "RESOURCE", at: { x: 10, y: 4 }, resource: "." },
      // Retune 2: no free towns on the Frontier's side of the ridge but
      // two.
      { kind: "VILLAGE", at: { x: 3, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 17 }, present: false },
      { kind: "VILLAGE", at: { x: 15, y: 17 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~.^^......f~~~~~",
    "~~~~......f....f.~~~",
    "~~^...ff^........f~~",
    "~~....^f.......f^.~~",
    "~.f..f....f...fff..~",
    "~.^...^......ff.ff.~",
    "~f........^..^..fff~",
    "~f...........ff.ff^~",
    "~.f..........f.fff^~",
    "~f......xxx..^..fff~",
    "~ff.....^^^..^^.^..~",
    "~ffff..^^^^^f^f^^.^~",
    "~fffff.^^^^..^^.^f.~",
    "~~f.f..f^.f^^.f^...~",
    "~~ff.f.^..f.^fffff~~",
    "~~^f..^..^f..fff^.~~",
    "~~~~.f..f.^^.^^.~~~~",
    "~~~~~..^.f^^f^.~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "....p.s.ss...s....p.",
    "pp...r.......e..p.p.",
    ".p...r.......ee.....",
    "....r..g.ee.rrreeg..",
    "p..e.r.g.e....r.....",
    "pr......r..eerg...rs",
    "..orr..r.e..eggr.g..",
    "s..e.e....o.ro.rg..s",
    "..r....e...e.g.....s",
    "..gr.r.ee..r.......s",
    "sge..rr.......r....s",
    ".g...er.oooe.o.....p",
    "s.ggg...o..o.ogooeos",
    "...ggg.oooo.roo.og..",
    "p......go.g....o.r.p",
    "..gge..o.r.....g..sp",
    "..og.ro.rogr....o.s.",
    "...pe..r..oo..o.p..p",
    ".pppseeo..oo.o......",
    "....pspsss.s....p...",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPWWPP",
    "PPPPPPPPPPPPPPPWWWPP",
    "PPPPPPPPPPPPPPWWWWWP",
    "PPPPPPPPPPPPPWWWWWWP",
    "PPPPPPPPPPPPPWWWWWWP",
    "PWPPPPPPPPPPPWWWWWWP",
    "PWWPPPPPPPPPPWWWWWWP",
    "PWWWPPPPPPPPPWWWWWWP",
    "PWWWWPPPHHHPHHHHHHWP",
    "PWWWWWWHHHHHHHHHHHHP",
    "PWWWWWWHHHHHHHHHHHHP",
    "PPWWWWHHHHHHHHHHHHHP",
    "PPWWWHHHHHHHHHHHHHPP",
    "PPWWHHHHHHHHHHHHHHPP",
    "PPPPHHHHHHHHHHHHPPPP",
    "PPPPPHHHHHHHHHHPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 14 },
    { x: 12, y: 17 },
  ],
  treasureChests: [
    { x: 11, y: 2 },
    { x: 16, y: 5 },
    { x: 9, y: 8 },
    { x: 3, y: 10 },
  ],
  // </map>
  // The lightning tower on the Hall's lawn (E1, `pulp_wars-hmyk.14`):
  // within two of the gate, so whoever stands on it zaps the gate too.
  curiosities: [{ kind: "TESLA_TOWER", at: { x: 10, y: 6 } }],
  improvements: [
    // Kessler's Toll's Lumber Camp.
    { at: { x: 14, y: 14 }, improvement: "LUMBER_CAMP" },
    // Ridge Toll's Lumber Camps, in the forest on the ridge road.
    { at: { x: 16, y: 10 }, improvement: "LUMBER_CAMP" },
    { at: { x: 17, y: 10 }, improvement: "LUMBER_CAMP" },
    { at: { x: 18, y: 10 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      // Retune 2 (`pulp_wars-hmyk.19`): Fort Steele alone, and the column
      // that took the forts on the King's Road: three Knights, a Catapult
      // the Rangers cannot build again (no Sawmilling), two Fighters and a
      // Marksman.
      coins: 8,
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
          name: "Fort Steele",
          at: { x: 6, y: 17 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
      ],
      units: [
        { role: "KNIGHT", at: { x: 6, y: 15 } },
        { role: "KNIGHT", at: { x: 5, y: 15 } },
        { role: "KNIGHT", at: { x: 6, y: 14 } },
        { role: "CATAPULT", at: { x: 5, y: 16 } },
        { role: "FIGHTER", at: { x: 7, y: 16 } },
        { role: "FIGHTER", at: { x: 4, y: 16 } },
        { role: "MARKSMAN", at: { x: 4, y: 15 } },
      ],
      // The ridge, its tolls and the Hall on its hill.
      reveal: {
        radius: 2,
        rects: [
          { x0: 2, y0: 10, x1: 18, y1: 14 },
          { x0: 9, y0: 3, x1: 11, y1: 6 },
        ],
      },
    },
    {
      // The Redcaps: the last of Kessler's goblins, in his forts and yard.
      faction: "GOBLIN",
      coins: 8,
      technologies: [],
      cities: [
        {
          name: "Kessler Hall",
          at: { x: 10, y: 4 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
          landGrant: true,
        },
        {
          name: "Weir Toll",
          at: { x: 4, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        {
          name: "Gallows Toll",
          at: { x: 12, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        {
          name: "Ridge Toll",
          at: { x: 18, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        // Retune 2: the toll on the Frontier's side of the ridge is the
        // Baron's again.
        {
          name: "Kessler's Toll",
          at: { x: 13, y: 14 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      // The four holders first (a garrison is chosen by unit ID among the
      // units inside the zones), then the forts' Goblins and the field army.
      // The Hall's gate is held by a Troll (hand play: with an Orc Brute
      // there, two Knights' Overrun chains took the Hall in round 10).
      units: [
        { role: "JUGGERNAUT", at: { x: 10, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 11 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 11 }, home: 2 },
        { role: "GUARD", at: { x: 18, y: 11 }, home: 3 },
        { role: "GUARD", at: { x: 13, y: 14 }, home: 4 },
        { role: "FIGHTER", at: { x: 5, y: 10 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 10 }, home: 2 },
        { role: "FIGHTER", at: { x: 17, y: 10 }, home: 3 },
        { role: "FIGHTER", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "FIGHTER", at: { x: 14, y: 15 }, home: 4 },
        { role: "FIGHTER", at: { x: 12, y: 13 }, home: 4 },
        { role: "FIGHTER", at: { x: 4, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 12, x1: 18, y1: 18 }] },
      // Mercenaries field Goblins, which mob (H2's lesson: no farms, no
      // riders, no Brutes on Field Defenses). Hand play: with Drill and
      // Engineering the forts' Workshops and Mines took Gallows Toll from
      // level 3 to 6 in seven rounds, two Trolls on its gate.
      forbiddenTechnologies: [
        "DRILL",
        "ENGINEERING",
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
        "FORTIFICATION",
        "EXPLOSIVES",
        "CHIVALRY",
        "METALLURGY",
      ],
      // One Redcap stands on the gate of the Hall and of each toll; the
      // rest march on you from round 4.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 10, y0: 4, x1: 10, y1: 4 },
            { x0: 4, y0: 11, x1: 4, y1: 11 },
            { x0: 12, y0: 11, x1: 12, y1: 11 },
            { x0: 18, y0: 11, x1: 18, y1: 11 },
            { x0: 13, y0: 14, x1: 13, y1: 14 },
          ],
          garrison: 5,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 10, y0: 4, x1: 10, y1: 4 },
            { x0: 4, y0: 11, x1: 4, y1: 11 },
            { x0: 12, y0: 11, x1: 12, y1: 11 },
            { x0: 18, y0: 11, x1: 18, y1: 11 },
            { x0: 13, y0: 14, x1: 13, y1: 14 },
          ],
          garrison: 5,
          others: { kind: "RUSH" },
        },
      ],
    },
    {
      // Kessler's war beasts, out of the cellars.
      faction: "DINOSAUR",
      coins: 4,
      technologies: ["HUNTING"],
      cities: [
        {
          name: "The Menagerie",
          at: { x: 14, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "SWORDSMAN", at: { x: 12, y: 6 }, kills: 1 },
        { role: "RAIDER", at: { x: 11, y: 7 }, kills: 1 },
        { role: "RAIDER", at: { x: 13, y: 5 } },
        { role: "RAIDER", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 14, y: 7 } },
        // Retune 2: two more of the Baron's raptors.
        { role: "RAIDER", at: { x: 12, y: 3 }, kills: 1 },
        { role: "RAIDER", at: { x: 15, y: 5 } },
      ],
      reveal: { radius: 3 },
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // The Hall's grounds.
      directive: { kind: "HOLD", zone: [{ x0: 8, y0: 2, x1: 15, y1: 8 }] },
    },
    {
      // The Grey Lodge, chanting in the chapel beside the Hall.
      faction: "CULT",
      coins: 2,
      favour: 3,
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING", "DRILL"],
      cities: [
        {
          name: "Greyfriars",
          at: { x: 6, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 5 } },
        { role: "CAPTAIN", at: { x: 7, y: 5 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
      ],
      reveal: { radius: 2 },
      // As in H4: Summoners, Initiates and Idol Bearers, a little Favour.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
        "FORTIFICATION",
      ],
      // The chapel and the Hall's west lawn.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 3, x1: 9, y1: 7 }],
        garrison: 2,
      },
    },
  ],
  teams: [0, 1, 1, 1],
  // Retune 2: every hired sword on the Frontier falls back on the one place
  // still paying, in three bands behind the tolls.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      line: "Hired swords off the river road fall in behind Weir Toll.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "FIGHTER", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 10 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      line: "The Baron's last payroll buys a new band at Gallows Toll.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "FIGHTER", at: { x: 13, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        { role: "FIGHTER", at: { x: 13, y: 8 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      line: "Redcaps from the far marches come over the ridge road.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 17, y: 9 } },
        { role: "FIGHTER", at: { x: 18, y: 9 } },
        { role: "FIGHTER", at: { x: 16, y: 9 } },
        { role: "FIGHTER", at: { x: 17, y: 8 } },
      ],
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "KESSLER_HALL", at: { x: 10, y: 4 } }],
  // The Hall by round 22; the stars: by round 18, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["KESSLER_HALL"],
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
