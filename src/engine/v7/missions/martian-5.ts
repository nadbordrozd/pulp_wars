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
  revision: 2,
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
    { x: 13, y: 8 },
    { x: 10, y: 11 },
    { x: 10, y: 14 },
  ],
  treasureChests: [{ x: 5, y: 7 }],
  // </map>
  // Red Dust's hydroponic farm.
  improvements: [{ at: { x: 13, y: 11 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "MARTIAN",
      coins: 8,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Red Dust",
          at: { x: 13, y: 12 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 13, y: 12 } },
        // The mothership's crew, home on foot from the Hold.
        { role: "KNIGHT", at: { x: 12, y: 11 } },
        { role: "FIGHTER", at: { x: 12, y: 12 } },
        { role: "FIGHTER", at: { x: 13, y: 11 } },
        { role: "MARKSMAN", at: { x: 12, y: 13 } },
        { role: "MARKSMAN", at: { x: 11, y: 12 } },
        { role: "CATAPULT", at: { x: 11, y: 13 } },
        { role: "RAIDER", at: { x: 12, y: 10 } },
      ],
      // The road north to Candlewick.
      reveal: {
        radius: 2,
        rects: [{ x0: 6, y0: 2, x1: 14, y1: 12 }],
      },
    },
    {
      // The Grey Lodge in Candlewick, with the orrery.
      faction: "CULT",
      coins: 2,
      favour: 6,
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
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 2, x1: 14, y1: 13 }] },
      // The Lodge holds the town and its slope.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 7, y0: 2, x1: 11, y1: 6 }],
        garrison: 8,
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
      coins: 0,
      technologies: ["HUNTING", "MARKSMANSHIP"],
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
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
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
  // Take Candlewick by round 18 (the saga's 22: the first hand-played
  // run took it in 8). The stars: by round 14, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["CANDLEWICK"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
