import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_3` "The Ship of the Dead" (docs/product/SAGA.md section 3.2, U3;
 * the Undead campaign, `pulp_wars-hmyk.5`). You must take Chapel Rock, the
 * Martians' fort on an island in the mouth of Gravesend Bay, by round 20:
 * the Marquis's flagship lies under it. Step 3 of 6: a naval capture.
 * Martian Shields soak damage and refill every turn, so spread fire is
 * wasted; focus one ship a turn. The Undead fleet grows from the enemy's:
 * with Drowned Crews, every hostile ship an Undead ship sinks rises as a
 * Ghost Ship.
 *
 * The board is the map generator's (Continents 16, seed 15). Gravesend
 * stands at the head of the bay on the western landmass; Chapel Rock is a
 * two-tile island in the channel; the dredgers' rig town stands on the
 * eastern shore across from it. The Rock's garrison holds the Rock
 * (`GUARD`); the rest of the dredgers play their ordinary game. Their
 * fleet starts at sea off the channel, north and south (hand play of the
 * Humans' naval mission: a fleet anchored by your port shells it flat in
 * round 1). More ships come back down the channel in rounds 5, 9 and 13.
 *
 * Hand play (CAMPAIGN.md section 16) set the numbers: the dredgers learn
 * no naval technology (they built a Port on every water tile round the
 * Rock, then a Shipyard, and rode the monuments to level 4) and raise no
 * Force Fields (a Hover Cruiser beside a Shield Projector out-shot every
 * Undead ship); Gravesend gets Planning and Lychgate a port, since one
 * town over its unit limit could train nothing.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~.~~.~~~~~~~~~~
 *    1   ~~..^^~~~~.^^^~~
 *    2   ~....fv~~~^f^.~~      v: villages
 *    3   ~~.$...~~~....~~      $: treasure chests
 *    4   ~~f....~~~~^^f~~
 *    5   ~~...~~~~~~^..f~
 *    6   ~...f~~C~~f....~      C: Chapel Rock (the island: 7,6 and 7,7)
 *    7   ~..f~~~f~fR....~      R: the Dredgers' Rig
 *    8   ~..G~~~~~......~      G: Gravesend
 *    9   ~...~~~~~~.....~
 *   10   ~~..^^~~~~f....~
 *   11   ~~L.f..~~~~....~      L: Lychgate
 *   12   ~~.fff.~~~~~...~
 *   13   ~~$.fff~~~~f..~~
 *   14   ~~~.v~~~.~~..^~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const UNDEAD_3_V7: MissionDefinitionV7 = {
  id: "UNDEAD_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.20`, retune 2): a thin start and a third
  // wave.
  revision: 3,
  seed: 20261303,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 15,
    // Gravesend and Lychgate stand on villages; the eastern villages would
    // hand the dredgers more towns and ports.
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 14 }, present: false },
      // The Rig and the Rock stand on fruit and fertile ground.
      { kind: "RESOURCE", at: { x: 10, y: 7 }, resource: "." },
      { kind: "RESOURCE", at: { x: 7, y: 6 }, resource: "." },
      // No fish by the Rig and the Rock (hand play: fish, a Port and a
      // Shipyard raised both Martian towns to level 3 in round 1, with
      // City Walls on the Rock and a Saucer from the Rig).
      { kind: "RESOURCE", at: { x: 9, y: 6 }, resource: "." },
      { kind: "RESOURCE", at: { x: 6, y: 7 }, resource: "." },
      // Retune 2 (`pulp_wars-hmyk.20`): the chest above Gravesend.
      { kind: "CHEST", at: { x: 3, y: 3 }, present: false },
    ],
  },
  terrain: [
    "~~.~~.~~~~~~~~~~",
    "~~..^^~~~~.^^^~~",
    "~....f.~~~^f^.~~",
    "~~.....~~~....~~",
    "~~f....~~~~^^f~~",
    "~~...~~~~~~^..f~",
    "~...f~~.~~f....~",
    "~..f~~~f~f.....~",
    "~...~~~~~......~",
    "~...~~~~~~.....~",
    "~~..^^~~~~f....~",
    "~~..f..~~~~....~",
    "~~.fff.~~~~~...~",
    "~~f.fff~~~~f..~~",
    "~~~..~~~.~~..^~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    ".sr..e.p........",
    ".s.e.o..pp.ooo..",
    "seere..s..o.o...",
    "ps...ers....r.sp",
    ".s..e....p.oo..p",
    ".........p.oee..",
    "sre........e..r.",
    "ser........r..rs",
    ".er........ee.e.",
    ".rr.......ere..p",
    "..r.o.......eers",
    ".p.eg...pp..rre.",
    "...gg.r.........",
    "....gg...ps..es.",
    ".psr..pp..sr.o..",
    "..........ps....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPPHHHPP",
    "PPPPPPPPPPPHHHPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPWWWPPPPPPPPP",
    "PPWWWWWPPPPPPPPP",
    "PPWWWWWPPPPPPPPP",
    "PPPWWPPPWPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 2 },
    { x: 4, y: 14 },
  ],
  treasureChests: [{ x: 2, y: 13 }],
  // </map>
  improvements: [
    // Gravesend's Port.
    { at: { x: 4, y: 8 }, improvement: "PORT" },
    // Lychgate's Port.
    { at: { x: 1, y: 11 }, improvement: "PORT" },
    // The Rig's Port.
    { at: { x: 9, y: 6 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: ["GATHERING", "SHORECRAFT", "SEAMANSHIP"],
      cities: [
        {
          name: "Gravesend",
          at: { x: 3, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Lychgate", at: { x: 2, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 4, y: 7 } },
        // The Last Rites' old tender, which never quite sank.
        { role: "SUBMARINE", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 11 }, home: 1 },
      ],
      // Chapel Rock is in sight across the bay.
      reveal: { radius: 1, rects: [{ x0: 6, y0: 6, x1: 7, y1: 7 }] },
    },
    {
      // The dredgers of Gravesend Bay, after star-iron.
      faction: "MARTIAN",
      coins: 6,
      technologies: ["HUNTING", "DRILL", "MARKSMANSHIP"],
      cities: [
        {
          name: "Dredgers' Rig",
          at: { x: 10, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Chapel Rock", at: { x: 7, y: 6 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 10, y: 7 } },
        { role: "MARKSMAN", at: { x: 11, y: 7 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        // The Rock's garrison.
        { role: "GUARD", at: { x: 7, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 7 }, home: 1 },
        // The fleet, at sea off the channel.
        { role: "PATROL_BOAT", at: { x: 8, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 2 } },
        { role: "PATROL_BOAT", at: { x: 11, y: 12 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 6, x1: 5, y1: 10 }] },
      // Step 3: Grunts, Shield Projectors, Ray Gunners and the Hover Fleet's
      // Skimmers and Hover Cruisers; no Saucers or Motherships (they fly over
      // the bay), Tripods, Brains, rams or Bathyspheres; no Force Fields
      // and no new ships (hand play, see above).
      forbiddenTechnologies: [
        "ADMINISTRATION",
        "PLANNING",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "FORTIFICATION",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // The Rock's garrison holds the Rock.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 7, y0: 6, x1: 7, y1: 7 }],
        garrison: 2,
      },
    },
  ],
  // The dredgers' fleet comes back from the open sea: two Skimmers down the
  // channel in round 5, a Hover Cruiser and a Skimmer in round 9, a Cruiser
  // and two Skimmers in round 13.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      line: "Two more dredgers skim in from the open sea, humming.",
      announce: true,
      units: [
        { role: "PATROL_BOAT", at: { x: 8, y: 7 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 9 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      line: "A Hover Cruiser comes down the channel. The Last Rites' captain whistles.",
      announce: true,
      units: [
        { role: "BATTLESHIP", at: { x: 8, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 9 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      line: "The whole dredging fleet returns. The Marquis asks for his good hat.",
      announce: true,
      units: [
        { role: "BATTLESHIP", at: { x: 8, y: 9 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 2 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 10 } },
      ],
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [{ tag: "CHAPEL_ROCK", at: { x: 7, y: 6 } }],
  // Take the Rock by round 20. The stars: by round 16, and Gravesend never
  // falls.
  objective: {
    kind: "CAPTURE",
    places: ["CHAPEL_ROCK"],
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
