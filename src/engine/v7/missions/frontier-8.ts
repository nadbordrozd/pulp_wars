import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_8` "Brain Wave" (docs/product/CAMPAIGN.md section 9, mission
 * 8). You lead the Dinosaurs against the Martians and their Human thralls
 * on a 16 x 16 board, the two of them allied. Hard. It is a hunt: the
 * mission is won when the Overmind, a Martian Brain, is dead, and lost
 * when round 26 ends.
 *
 * Revision 2 (`pulp_wars-v642.9`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.14) makes it a build-up: you start with one nest,
 * no technology at all (the first research is free), the Old Queen (now a
 * T-Rex) and a Raptor, against a Martian colony of two cities in its crater
 * and the Baron's thralls with two camps in the south, on a clock of 26
 * rounds. Revision 1 was won on autopilot in round 7: its Brontosaurus
 * walked the Rim alone and stepped on the Overmind.
 *
 * Revision 3 (the danger pass, `pulp_wars-v642.10`, CAMPAIGN.md section
 * 11.19): the thralls march on the nest from round 3 (they held their camps
 * until round 10), and their waves of three come in rounds 6, 12 and 18
 * (were 10, 16 and 22). The early assault is the young Queen's food: fed on
 * it she is an Alpha by round 8. Since the Bolder abilities (`7r99`) a
 * Brain takes over any unit beside it, the Old Queen included, so whoever
 * steps next to the Overmind must kill it in the same turn. Hand-played:
 * lost on autopilot (eliminated in round 19), won in round 22 with two
 * stars.
 *
 * The board is the map generator's (Pangea, seed 2): the crater is the
 * basin in the eastern mountains, and for anything that cannot climb it
 * has one gate, in the south. The Rim (the peaks north of the crater; the
 * Mountains beside the Glass Ship touch the Overmind) and the Pass (two
 * Mountain tiles on the row of Egg Rock) are open only to a seat with
 * Engineering, which is yours to research and forbidden to the Martians.
 * Five villages are removed (where the enemy towns stand, and the three of
 * the south that made the thralls a four-city power); seven stay.
 *
 * The problem: the guard (two Shield Projectors, three Ray Gunners, a
 * Tripod, and two Grunts, nine with the Overmind) shoots down anything that
 * walks up alone, a Brain takes over a wounded one-slot unit within two
 * tiles of it, and a Force Field keeps an unhurt Martian alive through one
 * hit. The answer: grow first (the villages, Mines on the peaks), research
 * Engineering (the Martians cannot follow you onto a Mountain), and feed
 * the Old Queen the hunters (Saucers, Ray Gunners, Grunts) until she is an
 * Alpha: a T-Rex grows with every kill, an Alpha bites through the walls,
 * and her Overrun ends the hunt.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~fff..fv^^~~~~      v: villages
 *    2   ~~..f.^^^^^^^^~~      the peaks of the Rim
 *    3   ~~..D..^^..^^f~~      D: your capital
 *    4   ~vff...vf.^^O.^~      O: the Overmind's crater (the Glass Ship)
 *    5   ~..ff.^^^^^^...~
 *    6   ~f.ff^^^^^f...f~
 *    7   ~v..v.fv^^v..m.~      m: Ray Hollow; ^^: the Pass
 *    8   ~f.f^^^f^^^.^.^~
 *    9   ~fff.^f^^^^^f.f~
 *   10   ~..f.f^.^f..f^^~
 *   11   ~ffffff..f...ff~
 *   12   ~~....f......^~~
 *   13   ~~~pffT....^..~~      T: the thralls' camp; p: Puppet Ford
 *   14   ~~~~ff^...f.~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const FRONTIER_8_V7: MissionDefinitionV7 = {
  id: "FRONTIER_8",
  revision: 3,
  seed: 20261108,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 2,
    edits: [
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
    { x: 9, y: 1 },
    { x: 1, y: 4 },
    { x: 7, y: 4 },
    { x: 1, y: 7 },
    { x: 4, y: 7 },
    { x: 7, y: 7 },
    { x: 10, y: 7 },
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
      coins: 5,
      // A build-up: no technology (the first research is free, and the
      // rest of the tree is yours to discover).
      technologies: [],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 4, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex (revision 1's Brontosaurus walked the Rim
        // alone and stepped on the Overmind): sent in young and alone she
        // is shot down; grown on the hunters, her bite ends the hunt.
        { role: "KNIGHT", at: { x: 5, y: 3 }, tag: "OLD_QUEEN" },
        { role: "RAIDER", at: { x: 4, y: 3 } },
      ],
      // The crater, seen from the peaks.
      reveal: { radius: 2, rects: [{ x0: 10, y0: 2, x1: 14, y1: 7 }] },
    },
    {
      faction: "MARTIAN",
      coins: 8,
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
        {
          name: "Ray Hollow",
          at: { x: 13, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Overmind, a Brain: the seat's first unit, so the garrison
        // always counts it in. It stands on the walled center.
        { role: "CAPTAIN", at: { x: 12, y: 4 }, tag: "OVERMIND" },
        // Its guard (the garrison is the first nine, by unit order): two
        // Shield Projectors, three Ray Gunners, a Tripod, and two Grunts.
        // No Colossus: with one the guard shot every Spitter off the Rim.
        { role: "GUARD", at: { x: 11, y: 6 } },
        { role: "GUARD", at: { x: 13, y: 5 } },
        { role: "MARKSMAN", at: { x: 13, y: 4 } },
        { role: "MARKSMAN", at: { x: 12, y: 6 } },
        { role: "MARKSMAN", at: { x: 11, y: 7 } },
        { role: "CATAPULT", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 7 }, home: 1 },
        // The hunters.
        { role: "RAIDER", at: { x: 10, y: 6 } },
        { role: "RAIDER", at: { x: 14, y: 6 } },
      ],
      reveal: { radius: 2 },
      // No Mothership, no climbing, and no growth (hand play, CAMPAIGN.md
      // section 11.9): with Mines on every peak of its land the crater was
      // a level 7 city in round 5, and the Colossus of its level 7 pushed
      // the Overmind off its own walls; without Mines it blasted the peaks
      // of its rim for population instead.
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
      // The colony guards the crater with nine and hunts with the rest
      // (hand play: with three towns and a garrison of seven its Grunts,
      // Ray Gunners, and the Colossus were on the nest's villages from
      // round 3, and a build-up was not possible).
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 3, x1: 14, y1: 7 }],
        garrison: 9,
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
        { name: "Puppet Ford", at: { x: 3, y: 13 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 13 } },
        { role: "FIGHTER", at: { x: 7, y: 12 } },
        { role: "FIGHTER", at: { x: 7, y: 13 } },
        { role: "MARKSMAN", at: { x: 5, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 13 }, home: 1 },
      ],
      reveal: { radius: 2 },
      // Thralls: no Knights, no Champions, and no growth (hand play: a
      // thrall camp that farmed and took the villages of the south fielded
      // twenty units and overran the nest's towns).
      forbiddenTechnologies: [
        "CHIVALRY",
        "METALLURGY",
        "FARMING",
        "MILLING",
        "FORESTRY",
        "SAWMILLING",
        "PLANNING",
      ],
      // Revision 3 (`pulp_wars-v642.10`, the danger pass): they march on the
      // nest from round 3 (it was 10), and their waves come in rounds 6, 12
      // and 18 (were 10, 16 and 22).
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 2, y0: 12, x1: 12, y1: 14 }],
          untilRound: 3,
        },
        { kind: "ASSAULT", target: { x: 4, y: 3 } },
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
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
    {
      seat: 2,
      round: 18,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
      ],
    },
  ],
  // Kill the Overmind before round 26 ends. The stars are for doing it by
  // round 18 and for the Old Queen living to see it.
  objective: {
    kind: "KILL",
    units: ["OVERMIND"],
    byRound: 26,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 18 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
