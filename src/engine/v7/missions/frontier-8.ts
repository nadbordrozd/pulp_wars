import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_8` "Brain Wave" (docs/product/CAMPAIGN.md section 9, mission
 * 8). You lead the Dinosaurs against the Martians and their Human thralls
 * on a 16 x 16 board, the two of them allied. Hard. It is a hunt: the
 * mission is won when the Overmind, a Martian Brain, is dead, and lost
 * when round 20 ends. The Overmind stands on the walled center of its
 * crater with a garrison of six (`GUARD`): itself, a Colossus, two Shield
 * Projectors, a Ray Gunner, and a Tripod; the other Martians hunt, and the
 * thralls come at you in waves. The lesson is a raid: no city has to
 * fall, one unit behind its guard does. A Brain takes over a wounded
 * one-slot unit that comes within two tiles of it, a Saucer pulls a unit
 * out of your line, and a Force Field keeps a full-strength Martian alive
 * through one hit; a Spitter's Acid ignores the Walls.
 *
 * The board is the map generator's (Pangea, seed 2): the crater is the
 * basin in the eastern mountains, open only to the south. There are three
 * ways in: the Rim (from your capital along the north; the peaks north of
 * the crater are two tiles from the Overmind, and one Mountain tile leads
 * onto its back), the Pass (the row of your town, through two Mountain
 * tiles), and the long southern road past the thralls' camp, which needs
 * no Mountain at all. You start with Engineering, so your dinosaurs climb.
 * Eight villages are removed: your town, three in and beside the crater,
 * and the four of the south that made the thralls a four-city power.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~fff..f.^^~~~~
 *    2   ~~..f.^^^^^^^^~~      the peaks of the Rim
 *    3   ~~..D..^^..^^f~~      D: your capital
 *    4   ~vff...vf.^^O.^~      O: the Overmind's crater; v: villages
 *    5   ~..ff.^^^^^^...~
 *    6   ~f.ff^^^^^f...f~
 *    7   ~v..d.fv^^.....~      d: your town; ^^: the Pass
 *    8   ~f.f^^^f^^^.^.^~
 *    9   ~fff.^f^^^^^f.f~
 *   10   ~..f.f^.^f..f^^~
 *   11   ~ffffff..f...ff~
 *   12   ~~....f......^~~
 *   13   ~~~.ffT....^..~~      T: the thralls' camp
 *   14   ~~~~ff^...f.~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const FRONTIER_8_V7: MissionDefinitionV7 = {
  id: "FRONTIER_8",
  revision: 1,
  seed: 20261108,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 2,
    edits: [
      { kind: "VILLAGE", at: { x: 4, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 13 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~fff..f.^^~~~~",
    "~~..f.^^^^^^^^~~",
    "~~.....^^..^^f~~",
    "~.ff....f.^^..^~",
    "~..ff.^^^^^^...~",
    "~f.ff^^^^^f...f~",
    "~.....f.^^.....~",
    "~f.f^^^f^^^.^.^~",
    "~fff.^f^^^^^f.f~",
    "~..f.f^.^f..f^^~",
    "~ffffff..f...ff~",
    "~~....f......^~~",
    "~~~.ff.....^..~~",
    "~~~~ff^...f.~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    ".pp....s..p....p",
    "...g..r...oo.pp.",
    "....gr.oooo.o.s.",
    "p.e..e.o....o..p",
    "....rrr...oo....",
    "..e....oooo.rr..",
    ".g...oooo.......",
    "s.e...g..o.e....",
    "s.e..o.g..o.o.o.",
    "sg.ge..o...o....",
    "s.eg..o..grr.oos",
    "pgg..g......e..s",
    "....reg.....e...",
    "..s..g..r...rr..",
    "...p...e....ss..",
    ".......psss.....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPHHHHHPPPP",
    "PPPPPPPHHHHHHHPP",
    "PPPPPPPHHHHHHHPP",
    "PPPPPPPHHHHHHHHP",
    "PPPPPPHHHHHHHHHP",
    "PPPPPHHHHHHHHHHP",
    "PPPPHHHHHHHHHHHP",
    "PPWWHHHHHHHHHHHP",
    "PWWWWHHHHHHHHHHP",
    "PWWWWWHHHHHHHHHP",
    "PWWWWWWPPPPPPPPP",
    "PPWWWWWPPPPPPPPP",
    "PPPWWWPPPPPPPPPP",
    "PPPPWPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 1, y: 4 },
    { x: 7, y: 4 },
    { x: 1, y: 7 },
    { x: 7, y: 7 },
  ],
  treasureChests: [
    { x: 14, y: 7 },
    { x: 4, y: 11 },
  ],
  // </map>
  aiMode: "RIVAL",
  // The Martians and their thralls are one side.
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DINOSAUR",
      coins: 12,
      // Engineering: your dinosaurs cross Mountains (the Pass, the Rim).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
      ],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 4, y: 3 },
          level: 3,
          rewards: ["STOCKPILE", "MILITIA"],
        },
        {
          name: "Egg Rock",
          at: { x: 4, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a Brontosaurus.
        { role: "JUGGERNAUT", at: { x: 5, y: 3 }, tag: "OLD_QUEEN" },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "RAIDER", at: { x: 5, y: 4 }, kills: 1 },
        { role: "MARKSMAN", at: { x: 4, y: 4 }, kills: 1 },
        { role: "CAPTAIN", at: { x: 3, y: 3 } },
        { role: "FIGHTER", at: { x: 4, y: 7 }, home: 1 },
        { role: "RAIDER", at: { x: 5, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 7 }, home: 1 },
        { role: "GUARD", at: { x: 5, y: 5 }, home: 1 },
      ],
      // The crater, seen from the peaks.
      reveal: { radius: 2, rects: [{ x0: 10, y0: 2, x1: 14, y1: 7 }] },
    },
    {
      faction: "MARTIAN",
      coins: 5,
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
          name: "The Glass Ship",
          at: { x: 12, y: 4 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
      ],
      units: [
        // The Overmind, a Brain: the seat's first unit, so the garrison
        // always counts it in. It stands on the walled center.
        { role: "CAPTAIN", at: { x: 12, y: 4 }, tag: "OVERMIND" },
        // Its bodyguard, a Colossus (hand play, CAMPAIGN.md section 11.9:
        // without one the Old Queen walked in alone and won in round 6).
        { role: "JUGGERNAUT", at: { x: 12, y: 5 } },
        { role: "GUARD", at: { x: 11, y: 6 } },
        { role: "GUARD", at: { x: 13, y: 5 } },
        { role: "MARKSMAN", at: { x: 13, y: 4 } },
        { role: "CATAPULT", at: { x: 12, y: 6 } },
        // The rest are not the garrison: they hunt.
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 11, y: 7 } },
        { role: "MARKSMAN", at: { x: 10, y: 6 } },
        { role: "RAIDER", at: { x: 10, y: 8 } },
        { role: "RAIDER", at: { x: 9, y: 4 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 9, y1: 8 }] },
      // No Mothership, and no growth (hand play, CAMPAIGN.md section
      // 11.9): with Mines on every peak of its land the crater was a
      // level 7 city in round 5, and the Colossus of its level 7 pushed
      // the Overmind off its own walls; without Mines it blasted the
      // peaks of its rim for population instead. What is left grows it by
      // two.
      forbiddenTechnologies: [
        "CHIVALRY",
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
        "ROADS",
        "COMMERCE",
      ],
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 3, x1: 14, y1: 7 }],
        garrison: 6,
      },
    },
    {
      faction: "ORIGINAL",
      coins: 6,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Kessler's Camp",
          at: { x: 6, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 13 } },
        { role: "FIGHTER", at: { x: 7, y: 12 } },
        { role: "FIGHTER", at: { x: 7, y: 13 } },
        { role: "MARKSMAN", at: { x: 5, y: 12 } },
      ],
      // The Overmind shows its puppets where to go.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 6, y1: 8 }] },
      // `pulp_wars-v642.5`: a RUSH seat does not storm a player who stays
      // home (the deliberate loss of the first build: nine units intact
      // at the end). From round 9, with the second wave in, the thralls
      // assault Egg Rock, the town nearest their camp.
      directive: [
        { kind: "RUSH", untilRound: 9 },
        { kind: "ASSAULT", target: { x: 4, y: 7 } },
      ],
    },
  ],
  // No ships: the hunt is on land.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // More thralls march in step.
  reinforcements: [
    {
      seat: 2,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
    {
      seat: 2,
      round: 13,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
  ],
  // Kill the Overmind before round 20 ends. The stars are for doing it by
  // round 15 and for the Old Queen living to see it.
  objective: {
    kind: "KILL",
    units: ["OVERMIND"],
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 15 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
