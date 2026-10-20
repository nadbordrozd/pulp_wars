import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_5` "The Orrery at Candlewick" (docs/product/SAGA.md section
 * 3.6, M5; the Martian campaign, `pulp_wars-hmyk.7`). The Lodge's brass
 * orrery stands in Candlewick's meeting hall on the mountain's slope; the
 * Grey Lodge holds the town and has hired Redcaps to guard the road. Take
 * Candlewick before they melt the orrery down. Step 5 of 6: a town on a
 * slope guarded by tricks. A Stargazer calls a star onto a tile and it
 * falls at the start of the Lodge's next turn on whatever stands there and
 * around it; Hexers turn units into frogs; Saucers fly over the slope's
 * forests to the guns behind.
 *
 * The board is the map generator's (Pangea 16, seed 23, three seats). The
 * mountain fills the north-west; Candlewick sits on its eastern slope; the
 * Redcaps' two camps lie on the lower slope across the road south; Red
 * Dust is far off in the south-east.
 *
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start like a skirmish (Red
 * Dust at level 1, a Cavalier and a Grunt, no technology, no Coins, only
 * Candlewick's slope marked), the three villages near Red Dust are gone, the
 * Lodge holds the hall with twelve and 8 Favour, fifteen Redcaps with Drill
 * and Walls rush Red Dust, six announced waves come (four Redcap columns,
 * two files of the Lodge's faithful), and the clock is 15.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   ~~~~f.vf^v.^.~~~      v: villages
 *    2   ~~~.^^^^^f..^~~~
 *    3   ~...^^^^.^f..^~~
 *    4   ~f^.^^^^fC...f.~      C: Candlewick
 *    5   ~v..v^^f^.....f~
 *    6   ~.ffff..^......~
 *    7   ~.f.f$.f.f..ff.~      $: a treasure chest
 *    8   ~v.^vf.S..H..v.~      S: Snuffer's Camp   H: Redcap Hollow
 *    9   ~f..fff........~
 *   10   ~..xxx.........~      x: a Rift
 *   11   ~ff.......vf...~
 *   12   ~~^fff.......R~~      R: Red Dust
 *   13   ~~~ff........f~~
 *   14   ~~~.ff^f..vf~~~~
 * ```
 */
export const MARTIAN_5_V7: MissionDefinitionV7 = {
  id: "MARTIAN_5",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start (Red Dust at
  // level 1, a Cavalier and a Grunt, no technology), no village near it, a
  // fuller Lodge and Redcap host, six announced waves and a 15-round clock.
  revision: 3,
  seed: 20261605,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 23,
    edits: [
      // Candlewick and the two Redcap camps stand on villages; the chest
      // below Candlewick would hand the Lodge a Familiar.
      { kind: "VILLAGE", at: { x: 9, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 8 }, present: false },
      { kind: "CHEST", at: { x: 9, y: 6 }, present: false },
      // Retune 3: the three villages within reach of Red Dust.
      { kind: "VILLAGE", at: { x: 13, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 14 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~f..f^..^.~~~",
    "~~~.^^^^^f..^~~~",
    "~...^^^^.^f..^~~",
    "~f^.^^^^f....f.~",
    "~....^^f^.....f~",
    "~.ffff..^......~",
    "~.f.ff.f.f..ff.~",
    "~..^.f.........~",
    "~f..fff........~",
    "~..xxx.........~",
    "~ff........f...~",
    "~~^fff........~~",
    "~~~ff........f~~",
    "~~~.ff^f...f~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    ".p..ss.psp......",
    "...s...go..or...",
    ".ss.o.ooo.eros..",
    "...roooo.o.e..pp",
    "..oro.o...r.....",
    "..e..oo.o.rr.r..",
    "........o..eerrs",
    ".ege..r...rr...p",
    "..r..g..e.....es",
    ".g.....errr..er.",
    "..r....rr.r.rre.",
    ".g..e.e.e....e..",
    "..og.gr.ee.er...",
    "...gg..er.e.r...",
    ".p..gg..ee......",
    "........s....p..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPHHHHHHHHPPPP",
    "PPPHHHHHHHHPPPPP",
    "PHHHHHHHHHPPPPPP",
    "PWHHHHHHHPPPPPPP",
    "PWWHHHHHHPPPPPPP",
    "PWWWHHHHHPPPPPPP",
    "PWWWWHHHPPPPPPPP",
    "PWWWWWHPPPPPPPPP",
    "PWWWWWPPPPPPPPPP",
    "PWWWWWPPPPPPPPPP",
    "PWWWWWPPPPPPPPPP",
    "PPWWWWPPPPPPPPPP",
    "PPPWWWPPPPPPPPPP",
    "PPPWWWPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 1 },
    { x: 9, y: 1 },
    { x: 1, y: 5 },
    { x: 4, y: 5 },
    { x: 1, y: 8 },
    { x: 4, y: 8 },
  ],
  treasureChests: [{ x: 5, y: 7 }],
  // </map>
  // (Retune 3: Red Dust's hydroponic farm is gone: a level 1 town.)
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "MARTIAN",
      // Retune 3: a skirmish start. Red Dust at level 1, no technology, no
      // Coins, a Cavalier you cannot raise another of (no Chivalry) and a
      // Grunt; only Candlewick's slope is marked.
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "Red Dust",
          at: { x: 13, y: 12 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // The mothership's crew, home on foot from the Hold.
        { role: "KNIGHT", at: { x: 12, y: 11 } },
        { role: "FIGHTER", at: { x: 13, y: 12 } },
      ],
      // Candlewick, far up the road.
      reveal: {
        radius: 1,
        rects: [{ x0: 8, y0: 3, x1: 10, y1: 5 }],
      },
    },
    {
      // The Grey Lodge in Candlewick, with the orrery.
      faction: "CULT",
      // Retune 3: 8 Coins, 8 Favour, thirteen men instead of eight.
      coins: 8,
      favour: 8,
      technologies: [
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Candlewick",
          at: { x: 9, y: 4 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
      ],
      units: [
        { role: "GUARD", at: { x: 9, y: 4 } },
        // The hall's ring: every tile a walker can reach beside the
        // centre is held (hand play: with one free, a Brain beamed in took
        // the centre's Idol Bearer in round 7).
        { role: "FIGHTER", at: { x: 8, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "MARKSMAN", at: { x: 10, y: 4 } },
        { role: "MARKSMAN", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 10, y: 5 } },
        { role: "GUARD", at: { x: 10, y: 3 } },
        // The Stargazer on the hall's roof (no Summoner: hand play, with one
        // and 10 Favour the Lodge called three Horrors and an Imp by round
        // 5 and they ate the strike force).
        { role: "CATAPULT", at: { x: 11, y: 2 } },
        { role: "FIGHTER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 2 } },
        { role: "MARKSMAN", at: { x: 9, y: 2 } },
        { role: "FIGHTER", at: { x: 11, y: 5 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 2, x1: 14, y1: 13 }] },
      // The Lodge holds the town and its slope.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 7, y0: 2, x1: 12, y1: 6 }],
        garrison: 12,
      },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
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
    {
      // The Redcaps, hired to keep the road.
      faction: "GOBLIN",
      // Retune 3: 6 Coins, Scouting, Raiding, Drill and Walls, fifteen
      // Redcaps instead of eight.
      coins: 6,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Snuffer's Camp",
          at: { x: 7, y: 8 },
          level: 1,
          rewards: [],
        },
        { name: "Redcap Hollow", at: { x: 10, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 7, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 8, y: 9 } },
        { role: "MARKSMAN", at: { x: 7, y: 9 } },
        { role: "FIGHTER", at: { x: 10, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 9 }, home: 1 },
        { role: "MARKSMAN", at: { x: 9, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "RAIDER", at: { x: 6, y: 7 } },
        { role: "FIGHTER", at: { x: 11, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 9 }, home: 1 },
        { role: "RAIDER", at: { x: 12, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 11, y: 7 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 6, x1: 14, y1: 13 }] },
      // The Redcaps go for Red Dust at once.
      directive: { kind: "RUSH" },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
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
  landmarks: [{ tag: "CANDLEWICK", at: { x: 9, y: 4 } }],
  // Retune 3: the Redcaps' hired men come up the road in rounds 3, 6, 9 and
  // 12 and the Lodge's faithful file into the hall in rounds 5 and 9, every
  // wave announced.
  reinforcements: [
    {
      seat: 2,
      round: 3,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 8, y: 9 } },
        { role: "MARKSMAN", at: { x: 7, y: 9 } },
      ],
      line: "Hired Redcaps tramp out of the hills, rifles first.",
      announce: true,
    },
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "MARKSMAN", at: { x: 11, y: 6 } },
      ],
      line: "Candle-makers in grey file into the hall.",
      announce: true,
    },
    {
      seat: 2,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 10, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "RAIDER", at: { x: 9, y: 8 } },
        { role: "RAIDER", at: { x: 12, y: 8 } },
      ],
      line: "The Lodge's coin buys another Redcap column.",
      announce: true,
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "GUARD", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 11, y: 6 } },
        { role: "MARKSMAN", at: { x: 10, y: 6 } },
      ],
      line: "The last of Candlewick's faithful take up the candles.",
      announce: true,
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 7, y: 9 } },
        { role: "MARKSMAN", at: { x: 8, y: 9 } },
        { role: "RAIDER", at: { x: 6, y: 7 } },
      ],
      line: "Redcaps, unpaid, come anyway for the melting-down.",
      announce: true,
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 10, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "MARKSMAN", at: { x: 9, y: 9 } },
        { role: "RAIDER", at: { x: 12, y: 8 } },
      ],
      line: "Every Redcap left on the mountain, with a grudge.",
      announce: true,
    },
  ],
  // Take Candlewick by round 15 (the saga's 22; was 18). The stars: by
  // round 11, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["CANDLEWICK"],
    byRound: 15,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 11 }, { kind: "KEEP_CITIES" }],
  },
};
