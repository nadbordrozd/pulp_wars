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
 * Retune 4 (`pulp_wars-hmyk.28`, hand-played; CAMPAIGN.md section 18.5):
 * you start with Red Dust at level 2 and its farm, Quaxx, a Grunt and a
 * Saucer, Scouting and Hunting, 5 Coins, two of the three villages near
 * Red Dust are back, the militia has eleven men with Drill and Walls,
 * holds Millford with six and marches the rest on Red Dust from round 4,
 * no levies come, and the clock is 22 (retune 3: a skirmish start against
 * thirteen, three levies and a 14-round clock).
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
  // Revision 3 (`pulp_wars-hmyk.28`, retune 4): Red Dust at level 2 with a
  // Saucer, two villages back, a militia of eleven, no levies and a
  // 22-round clock.
  revision: 3,
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
      // Retune 3: the villages within reach of Red Dust (retune 4 gives
      // back the two nearest).
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
    { x: 9, y: 5 },
    { x: 12, y: 5 },
  ],
  treasureChests: [{ x: 9, y: 9 }],
  // </map>
  // Red Dust's farm and Millford's mines on the hill (retune 3 took the farm
  // away and Red Dust started at level 1; retune 4 gives it back).
  improvements: [
    { at: { x: 11, y: 3 }, improvement: "FARM" },
    { at: { x: 3, y: 10 }, improvement: "MINE" },
    { at: { x: 2, y: 11 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      // Retune 4: Red Dust at level 2, Scouting and Hunting, 5 Coins, Quaxx,
      // a Grunt and a Saucer: Mind Control still makes most of the army.
      // Only the old Millford road is marked (retune 3: level 1, 3 Coins,
      // no Saucer).
      coins: 5,
      technologies: ["SCOUTING", "HUNTING"],
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
        { role: "RAIDER", at: { x: 10, y: 1 } },
      ],
      // Red Dust, and the ground round Millford.
      reveal: {
        radius: 2,
        rects: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
      },
    },
    {
      // Millford's militia.
      faction: "ORIGINAL",
      // Retune 3: Hunting, Marksmanship, Drill and Walls, and thirteen men
      // instead of six (retune 4: eleven, 5 Coins, were 8).
      coins: 5,
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
          garrison: 11,
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
  // Collect the Professor: take Millford by round 22 (retune 3: 14; before
  // it 18). The stars: by round 16, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["MILLFORD"],
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
