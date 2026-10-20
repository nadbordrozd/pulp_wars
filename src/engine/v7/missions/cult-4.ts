import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_4` "The Inspector Calls" (docs/product/SAGA.md section 3.9, CU4; the
 * Cult campaign, `pulp_wars-hmyk.12`). Mr. Pettigrew, the Crown's Inspector
 * of Works by his own appointment, inspects the Great Seal at the Deep Gate
 * with twelve brethren and their toolbags, and every bolt of the Seal goes
 * back black wax. Hold the Seal-works until the last bolt is waxed: the
 * dwarves notice on the third day, and the goblin who refused the
 * Hierophant's gold, now an Honorary Dwarf, on the fourth. Step 4 of 6:
 * hold a town against Steam Tanks and a goblin mob with frail casters. A
 * Gibbering Mass on or beside your city needs no strand, and enemies
 * beside it move one tile; an Idol Bearer halves the shots at whoever
 * stands beside it, and enemies beside it can strike only the Bearer.
 *
 * The board is the map generator's (Dry Land 16, seed 3): the Seal-works in
 * a bowl of the Hollow Mountain's peaks in the north-east, the Deep Gate
 * three tiles west of it on the shelf, Copperstep below to the south, the
 * Lodge's hidden camp, Hood Hollow, in the corner behind the peaks, and
 * the goblins' road coming up from the south-east. The dwarves keep two at
 * the Gate and play their own game with the rest for three rounds, then
 * storm the Seal-works (`GUARD` with `others: ASSAULT`); the goblins rush
 * from round 5; both send more up the road.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   ...........f....
 *    1   .v.v......D^^H..      D: the Deep Gate; H: Hood Hollow; v: villages
 *    2   ...f.......^^^f^
 *    3   ..f......fff^f^f
 *    4   ....f....^...S..      S: the Seal-works
 *    5   f....^......^...
 *    6   f...f.^...f^^..^
 *    7   ff.........f^^^f
 *    8   .vf.......$C^^vf      C: Copperstep; $: treasure chests
 *    9   ...^.v.....f^^^.
 *   10   ...f....vf..^^f.
 *   11   .v.....^.fff...f
 *   12   .ff...ff....$.Gf      G: the goblins' camp
 *   13   f..ff.vf...f..ff
 *   14   ..v.....v..^.fff
 *   15   .....^.....^f.ff
 * ```
 */
export const CULT_4_V7: MissionDefinitionV7 = {
  id: "CULT_4",
  revision: 1,
  seed: 20261904,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 3,
    seed: 3,
    // The Deep Gate, Copperstep and the goblins' camp stand on villages.
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
    ],
  },
  terrain: [
    "...........f....",
    "..f........^^...",
    "...f.......^^^f^",
    "..f......fff^f^f",
    "....f....^......",
    "f....^......^...",
    "f...f.^...f^^..^",
    "ff.........f^^^f",
    ".....f......^^.f",
    "...^.......f^^^.",
    "...f.....f..^^f.",
    ".......^.fff...f",
    ".ff...ff.......f",
    "f..ff..f...f..ff",
    "...........^.fff",
    ".....^.....^f.ff",
  ],
  resources: [
    "e...r.eee....er.",
    ".....r..e..oo...",
    "err....r...ooo..",
    "r..reeer....o...",
    "er.r.r.e..r.r.r.",
    ".r.....er...o...",
    "..re.....r.oo...",
    "..re.rrr..e..oo.",
    "e...r.e..r..oo..",
    "e.r.e.r..rrg.o..",
    ".e..rrrr..rroogr",
    "...r..eorg.g.eeg",
    "rg......rr.....g",
    ".r....e.e..gerg.",
    ".e.ree.r.r...ggg",
    ".r.ero....e.....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPPHHHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPWWWWW",
  ],
  villages: [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 2, y: 8 },
    { x: 14, y: 8 },
    { x: 5, y: 9 },
    { x: 8, y: 10 },
    { x: 2, y: 11 },
    { x: 5, y: 13 },
    { x: 2, y: 14 },
    { x: 8, y: 14 },
  ],
  treasureChests: [
    { x: 10, y: 8 },
    { x: 12, y: 12 },
  ],
  // </map>
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "CULT",
      coins: 6,
      // Favour enough for a daemon or two: a Gibbering Mass and a Horror.
      favour: 9,
      // Leadership (the Summoner), Hexers, Warding Circles (the Idol
      // Bearer), and Crafting and Mountaineering on the way to Gibbering
      // Masses.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "METALLURGY",
      ],
      cities: [
        {
          name: "The Seal-works",
          at: { x: 13, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Hood Hollow", at: { x: 13, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        // Mr. Pettigrew, the Crown's Inspector of Works.
        { role: "CAPTAIN", at: { x: 13, y: 4 }, tag: "PETTIGREW" },
        { role: "CAPTAIN", at: { x: 14, y: 4 } },
        { role: "GUARD", at: { x: 12, y: 4 } },
        { role: "GUARD", at: { x: 13, y: 5 } },
        { role: "FIGHTER", at: { x: 14, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "MARKSMAN", at: { x: 14, y: 3 } },
        { role: "FIGHTER", at: { x: 13, y: 1 }, home: 1 },
      ],
      // The shelf, the Gate, and the road below.
      reveal: { radius: 2, rects: [{ x0: 8, y0: 0, x1: 15, y1: 13 }] },
    },
    {
      // The Seal's wardens: the Deep Gate and Copperstep.
      faction: "DWARF",
      coins: 0,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
      ],
      // No Steam Moles and no Clockwork Gunners (hand play: a Mole's tunnel
      // surfaced beside the channellers every other round and its eruption
      // broke every strand round it, and a Gunner on the shelf, three tiles
      // from the Seal-works, shot a channeller a turn): the wardens come
      // over the ground with hammers and Steam Tanks, and the shots that
      // break strands are the goblins' bombs.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 10, y: 1 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Copperstep",
          at: { x: 11, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 10, y: 1 } },
        { role: "FIGHTER", at: { x: 9, y: 1 } },
        { role: "FIGHTER", at: { x: 10, y: 2 } },
        { role: "FIGHTER", at: { x: 9, y: 2 } },
        { role: "FIGHTER", at: { x: 10, y: 0 } },
        { role: "SWORDSMAN", at: { x: 9, y: 0 } },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 7 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 8, y0: 0, x1: 15, y1: 13 }] },
      // Two keep the Gate; from round 3 the rest storm the Seal-works.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 9, y0: 0, x1: 11, y1: 2 }],
          garrison: 2,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 9, y0: 0, x1: 11, y1: 2 }],
          garrison: 2,
          others: { kind: "ASSAULT", target: { x: 13, y: 4 } },
        },
      ],
    },
    {
      // Grubnak's horde, Honorary Dwarves.
      faction: "GOBLIN",
      coins: 0,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Honour Camp",
          at: { x: 14, y: 12 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 13, y: 12 } },
        { role: "FIGHTER", at: { x: 14, y: 11 } },
        { role: "FIGHTER", at: { x: 13, y: 11 } },
        { role: "GUARD", at: { x: 15, y: 12 } },
        { role: "RAIDER", at: { x: 12, y: 11 } },
        { role: "MARKSMAN", at: { x: 13, y: 13 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 8, y0: 0, x1: 15, y1: 13 }] },
      // The horde shows up on the fourth day.
      directive: [{ kind: "NORMAL", untilRound: 4 }, { kind: "RUSH" }],
    },
  ],
  // More of the horde up the road, and the dwarves' Steam Tanks.
  reinforcements: [
    {
      seat: 2,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 14, y: 9 } },
        { role: "FIGHTER", at: { x: 15, y: 9 } },
        { role: "GUARD", at: { x: 15, y: 10 } },
        { role: "RAIDER", at: { x: 14, y: 10 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "SWORDSMAN", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 6 } },
      ],
    },
    {
      seat: 2,
      round: 10,
      units: [
        { role: "FIGHTER", at: { x: 14, y: 9 } },
        { role: "FIGHTER", at: { x: 15, y: 9 } },
        { role: "MARKSMAN", at: { x: 15, y: 10 } },
        { role: "RAIDER", at: { x: 14, y: 10 } },
      ],
    },
  ],
  landmarks: [
    { tag: "SEAL_WORKS", at: { x: 13, y: 4 } },
    { tag: "DEEP_GATE", at: { x: 10, y: 1 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Hold the Seal-works for 14 rounds. The stars: no city lost, and
  // Pettigrew lives.
  objective: {
    kind: "SURVIVE",
    rounds: 14,
    protect: [{ place: "SEAL_WORKS" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "PETTIGREW" }],
  },
};
