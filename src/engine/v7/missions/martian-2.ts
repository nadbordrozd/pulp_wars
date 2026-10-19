import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_2` "Abduction at Millford" (docs/product/SAGA.md section 3.6,
 * M2; the Martian campaign, `pulp_wars-hmyk.7`). Captain Quaxx goes to
 * collect Professor Haddock from the Millford Observatory, and Millford's
 * militia objects. Step 2 of 6: Mind Control. A Brain takes over any enemy
 * unit beside it, up to three, and they fight for you until the Brain is
 * lost; a unit taken on a city's centre stands there as yours. A Brain is
 * frail, so it walks behind Shields.
 *
 * The board is the map generator's (Pangea 14, seed 13). Red Dust stands
 * in the north-eastern woods; farmland runs down the west; Millford sits on
 * the hills in the south-west, walled, with its two farm villages north and
 * east of it.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ~~~~~~~~~~~~~~
 *    1   ~~~..ffffff~~~
 *    2   ~~.vffvffffR~~      R: Red Dust   v: villages
 *    3   ~f....fffff.~~
 *    4   ~.....ffffff.~
 *    5   ~....fvffvffv~
 *    6   ~.....ff.^fff~
 *    7   ~.....^^f.^ff~
 *    8   ~^.H.f..^.^.^~      H: Haybridge
 *    9   ~...ffff^$f^.~      $: a treasure chest
 *   10   ~.f^.ff.^^^^~~
 *   11   ~~^M.^Pf..^^~~      M: Millford   P: Ploughby
 *   12   ~~~~^^^^f^.~~~
 *   13   ~~~~~~~~~~~~~~
 * ```
 */
export const MARTIAN_2_V7: MissionDefinitionV7 = {
  id: "MARTIAN_2",
  revision: 1,
  seed: 20261602,
  // <map>
  size: 14,
  source: {
    mapType: "PANGEA",
    size: 14,
    seats: 2,
    seed: 13,
    edits: [
      // Haybridge and Ploughby, Millford's farm villages, stand on two
      // villages.
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 11 }, present: false },
      // The chest by Ploughby handed the militia a Raider, and the two
      // villages nearest Millford two more towns.
      { kind: "CHEST", at: { x: 6, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 11 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~",
    "~~~..ffffff~~~",
    "~~..ff.ffff.~~",
    "~f....fffff.~~",
    "~.....ffffff.~",
    "~....f.ff.ff.~",
    "~.....ff.^fff~",
    "~.....^^f.^ff~",
    "~^...f..^.^.^~",
    "~...ffff^.f^.~",
    "~.f^.ff.^^^^~~",
    "~~^..^.f..^^~~",
    "~~~~^^^^f^.~~~",
    "~~~~~~~~~~~~~~",
  ],
  resources: [
    ".....s.sp.pp..",
    "..p...ggggg...",
    ".....g.g.gg.pp",
    "pge.ee....ges.",
    ".rrr..ggg.gge.",
    "peerr...g..g.s",
    "...rer.ge..g..",
    "...re.oo......",
    ".oe..g..o..r..",
    ".r.e..g.o....s",
    "...or..roooo.p",
    "..o.ro.g......",
    "....oooo.o.sp.",
    "...........p..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPP",
    "PPPPWWWWWWWPPP",
    "PPPPWWWWWWWWPP",
    "PPPPPWWWWWWWPP",
    "PPPPPPWWWWWWWP",
    "PPPPPPWWWWWWWP",
    "PPPPPPHWWWWWWP",
    "PPPPPHHHWWWWWP",
    "PPPPHHHHHWWWWP",
    "PPPHHHHHHHHHHP",
    "PPHHHHHHHHHHPP",
    "PPHHHHHHHHHHPP",
    "PPPPHHHHHHHPPP",
    "PPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 3, y: 2 },
    { x: 6, y: 2 },
    { x: 6, y: 5 },
    { x: 9, y: 5 },
    { x: 12, y: 5 },
  ],
  treasureChests: [{ x: 9, y: 9 }],
  // </map>
  // Red Dust's farm and Millford's mines on the hill.
  improvements: [
    { at: { x: 11, y: 3 }, improvement: "FARM" },
    { at: { x: 3, y: 10 }, improvement: "MINE" },
    { at: { x: 2, y: 11 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      coins: 6,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "SCOUTING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
      ],
      cities: [
        {
          name: "Red Dust",
          at: { x: 11, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Captain Quaxx, a Brain.
        { role: "CAPTAIN", at: { x: 11, y: 2 }, tag: "QUAXX" },
        { role: "FIGHTER", at: { x: 10, y: 3 } },
        { role: "FIGHTER", at: { x: 10, y: 1 } },
        { role: "MARKSMAN", at: { x: 10, y: 2 } },
      ],
      // Down the farmland to Millford.
      reveal: {
        radius: 2,
        rects: [{ x0: 1, y0: 2, x1: 9, y1: 12 }],
      },
    },
    {
      // Millford's militia.
      faction: "ORIGINAL",
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "Millford",
          at: { x: 3, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "Haybridge", at: { x: 3, y: 8 }, level: 1, rewards: [] },
        { name: "Ploughby", at: { x: 6, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 10 } },
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 4, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 6, y: 11 }, home: 2 },
      ],
      reveal: { radius: 2 },
      // Millford keeps its militia home: a garrison round the walls, the
      // rest playing their ordinary game.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 1, y0: 8, x1: 7, y1: 12 }],
        garrison: 4,
      },
      // Step 2: the militia learns nothing (hand play: Workshops by its
      // Mines grew Millford in round 1, and with Hunting and Marksmen its
      // five towns trained a unit each a turn).
      forbiddenTechnologies: [
        "DRILL",
        "FORTIFICATION",
        "HUNTING",
        "MARKSMANSHIP",
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
    },
  ],
  // No fleets in the farmland.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "MILLFORD", at: { x: 3, y: 11 } }],
  // Collect the Professor: take Millford by round 18. The stars: by round
  // 15, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["MILLFORD"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 15 }, { kind: "KEEP_CITIES" }],
  },
};
