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
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start like a skirmish (Red
 * Dust at level 1, Quaxx and one Grunt, Scouting and Hunting, 3 Coins), the
 * three villages near Red Dust are gone, the militia has thirteen men with
 * Drill and Walls, holds Millford with six and marches the rest on Red
 * Dust from round 4, three announced levies come in rounds 4, 8 and 12, and
 * the clock is 14.
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
  // Revision 2 (`pulp_wars-hmyk.21`, retune 3): a skirmish-like start (Red
  // Dust at level 1, Quaxx and a Grunt, two technologies, 3 Coins), the
  // villages near Red Dust gone, a militia of thirteen with Drill and Walls
  // that marches on Red Dust, three announced levies and a 14-round clock.
  revision: 2,
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
      // Retune 3: the three villages within reach of Red Dust.
      { kind: "VILLAGE", at: { x: 12, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
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
  ],
  treasureChests: [{ x: 9, y: 9 }],
  // </map>
  // Millford's mines on the hill (retune 3: Red Dust's farm is gone, so the
  // town starts at level 1).
  improvements: [
    { at: { x: 3, y: 10 }, improvement: "MINE" },
    { at: { x: 2, y: 11 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      // Retune 3: a skirmish-like start. Red Dust at level 1, Scouting and
      // Hunting, 3 Coins, Quaxx and one Grunt: Mind Control has to make the
      // army. Only the old Millford road is marked.
      coins: 3,
      technologies: ["SCOUTING", "HUNTING"],
      cities: [
        {
          name: "Red Dust",
          at: { x: 11, y: 2 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Captain Quaxx, a Brain.
        { role: "CAPTAIN", at: { x: 11, y: 2 }, tag: "QUAXX" },
        { role: "FIGHTER", at: { x: 10, y: 3 } },
      ],
      // Red Dust, and the ground round Millford.
      reveal: {
        radius: 1,
        rects: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
      },
    },
    {
      // Millford's militia.
      faction: "ORIGINAL",
      // Retune 3: 8 Coins, Hunting, Marksmanship, Drill and Walls, and
      // thirteen men instead of six.
      coins: 8,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
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
        { role: "FIGHTER", at: { x: 2, y: 10 } },
        { role: "MARKSMAN", at: { x: 3, y: 9 } },
        { role: "GUARD", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 11 }, home: 2 },
        { role: "MARKSMAN", at: { x: 6, y: 10 }, home: 2 },
      ],
      // Red Dust, from the farmers' gossip.
      reveal: { radius: 2, rects: [{ x0: 10, y0: 1, x1: 12, y1: 3 }] },
      // Millford keeps its walls for three rounds, then a garrison of six
      // stays and everyone else marches on Red Dust (retune 3: a garrison
      // of four, the rest playing their ordinary game round the lodge).
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 1, y0: 7, x1: 7, y1: 12 }],
          garrison: 13,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 1, y0: 7, x1: 7, y1: 12 }],
          garrison: 6,
          others: { kind: "RUSH" },
        },
      ],
      // Step 2: the militia learns little (hand play: Workshops by its
      // Mines grew Millford in round 1, and with Hunting and Marksmen its
      // five towns trained a unit each a turn).
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
  // Retune 3: the county's levies come to Millford in rounds 4, 8 and 12,
  // each announced.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "MARKSMAN", at: { x: 3, y: 9 } },
      ],
      line: "Millford rings the bell: every farmhand takes a pitchfork.",
      announce: true,
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "GUARD", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "MARKSMAN", at: { x: 5, y: 9 } },
      ],
      line: "The county militia arrives by wagon, in its good boots.",
      announce: true,
    },
    {
      seat: 1,
      round: 12,
      units: [
        { role: "GUARD", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "MARKSMAN", at: { x: 3, y: 9 } },
      ],
      line: "Regulars of the Pact march up the south road.",
      announce: true,
    },
  ],
  // Collect the Professor: take Millford by round 14 (was 18). The stars:
  // by round 11, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["MILLFORD"],
    byRound: 14,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 11 }, { kind: "KEEP_CITIES" }],
  },
};
