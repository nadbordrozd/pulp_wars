import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_9` "Sugar and Spite" (docs/product/CAMPAIGN.md section 9,
 * mission 9; `pulp_wars-v642.4`). You lead the Martians beside an allied
 * Candy seat against the Undead and the Goblins on a 16 x 16 board. Hard.
 * A rescue: the mission is won when round 16 ends with Sugarcrest, the
 * ally's capital, still the ally's, and lost the moment it falls.
 *
 * The board is the map generator's (Lakes, seed 5): a western strip, two
 * long lakes, the kingdom between them, and the enemy camps in the east.
 * Seven tiles of the western lake's line are turned to Rift, north and
 * south of the water, so your strip is cut off from the rest: only your
 * flyers cross, and they carry the ground troops over one at a time (Beam
 * Down). The Naval branch is forbidden, so nobody sails the lakes.
 *
 * - **Sugarcrest** fights beside you (teams) and `HOLD`s the footprint of
 *   its two cities: hand play showed that a wider zone sends Queen Praline
 *   out to be mobbed in round 3, and that a narrow one keeps her and the
 *   garrison on the walls. Your units may not enter an ally's land, so you
 *   fight in front of the kingdom, never in its streets.
 * - **The Undead** (north-east) `RUSH` from the first round; **the
 *   Goblins** (south-east) hold their camp until round 4, then `RUSH`.
 *   Six waves muster in the enemy camps, out of your sight: rounds 4, 8,
 *   and 12 for the Undead and 6, 10, and 12 for the Goblins, the later ones
 *   with siege engines (Liches and Rocket Carts), which outrange the walls
 *   and are what your Saucers are for.
 * - **Riftwatch** is a neutral village just east of the Rift. Taking it
 *   and still holding it at the end is the third star; it is also the one
 *   place east of the Rift where you can train.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ^ff^xff^ff..f..f
 *    1   ^..fx^..^f....Uf      U: the Undead barrow
 *    2   ^^.^x.^..^f.^...      x: the Rift
 *    3   .^^~~~.^..~~~...
 *    4   ff.~~~^...~~~...
 *    5   ffv~~~..gf~~~.u.      g: Gumdrop, the kingdom's town; u: an Undead town
 *    6   fff~~f....~~~f..
 *    7   fff~~~....~~~^.^
 *    8   ffm~~~.S..~~~.v.      m: your town; S: Sugarcrest
 *    9   .f.~~~^....~~^f.
 *   10   ^.f~~~f...~~~...
 *   11   fff~~~.f..~~~...
 *   12   ffffx......f^f..
 *   13   .fM.x......f..f.      M: your capital
 *   14   ff..xR.....o..G^      R: Riftwatch; o: a Goblin camp; G: the Goblin capital
 *   15   ..ffxf.ff..$..f.
 * ```
 */
export const FRONTIER_9_V7: MissionDefinitionV7 = {
  id: "FRONTIER_9",
  revision: 1,
  seed: 20261109,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 4,
    seed: 5,
    edits: [
      { kind: "TERRAIN", at: { x: 4, y: 0 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 4, y: 1 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 4, y: 2 }, terrain: "x" },
      { kind: "CHEST", at: { x: 4, y: 12 }, present: false },
      { kind: "TERRAIN", at: { x: 4, y: 12 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 4, y: 13 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 4, y: 14 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 4, y: 15 }, terrain: "x" },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 14 }, present: false },
    ],
  },
  terrain: [
    "^ff^xff^ff..f..f",
    "^..fx^..^f.....f",
    "^^.^x.^..^f.^...",
    ".^^~~~.^..~~~...",
    "ff.~~~^...~~~...",
    "ff.~~~...f~~~...",
    "fff~~f....~~~f..",
    "fff~~~....~~~^.^",
    "ff.~~~....~~~...",
    ".f.~~~^....~~^f.",
    "^.f~~~f...~~~...",
    "fff~~~.f..~~~...",
    "ffffx......f^f..",
    ".f..x......f..f.",
    "ff..x..........^",
    "..ffxf.ff.....f.",
  ],
  resources: [
    "og.....o..rr....",
    ".rr..or...rrrr..",
    ".o.......og....r",
    ".o..s.ro...spe..",
    "g.e..por.r.p..r.",
    "g...........p..e",
    ".g.sp....r..s.e.",
    ".ggsp.eerr..p.ro",
    "g.......ers....r",
    ".ge..porrer....e",
    "...p.sgr..s.se..",
    ".g...p..r..sp.re",
    ".gg..ree.eeg..re",
    "...r..e..er.rr.r",
    ".......r.rr.ee.o",
    "r.....e...r.e...",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "WHHPPPHHPPPPPPPP",
    "WWHPPPHPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 2, y: 5 },
    { x: 14, y: 8 },
    { x: 5, y: 14 },
  ],
  treasureChests: [{ x: 11, y: 15 }],
  // </map>
  aiMode: "RIVAL",
  teams: [0, 0, 1, 1],
  seats: [
    {
      faction: "MARTIAN",
      coins: 10,
      // Saucers (and their Strafe), Ray Gunners, and Shield Projectors:
      // the relief force. Motherships, Brains, and Tripods are a research
      // away.
      technologies: [
        "GATHERING",
        "HUNTING",
        "SCOUTING",
        "RAIDING",
        "DRILL",
        "FORTIFICATION",
        "MARKSMANSHIP",
      ],
      cities: [
        {
          name: "Saucer Field",
          at: { x: 2, y: 13 },
          level: 4,
          rewards: ["SURVEY", "WALLS", "BOOM"],
          landGrant: true,
        },
        { name: "Red Dust", at: { x: 2, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "RAIDER", at: { x: 3, y: 13 } },
        { role: "RAIDER", at: { x: 3, y: 14 } },
        { role: "RAIDER", at: { x: 2, y: 9 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 12 } },
        { role: "GUARD", at: { x: 1, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 8 }, home: 1 },
      ],
      // The kingdom and Riftwatch, seen from the air.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 4, x1: 9, y1: 10 },
          { x0: 5, y0: 13, x1: 6, y1: 15 },
        ],
      },
    },
    {
      faction: "CANDY",
      // A kingdom under siege: no Coins, and a small economy (below).
      coins: 0,
      technologies: [
        "GATHERING",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
        "MARKSMANSHIP",
        "ADMINISTRATION",
      ],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 7, y: 8 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        { name: "Gumdrop", at: { x: 8, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 7, y: 8 } },
        { role: "JUGGERNAUT", at: { x: 8, y: 8 }, tag: "PRALINE" },
        { role: "FIGHTER", at: { x: 7, y: 7 } },
        { role: "FIGHTER", at: { x: 7, y: 9 } },
        { role: "MARKSMAN", at: { x: 6, y: 8 } },
        { role: "CAPTAIN", at: { x: 6, y: 7 } },
        { role: "GUARD", at: { x: 8, y: 5 }, home: 1 },
      ],
      // The kingdom watches every approach: its sentries see a besieger
      // two turns out, so a garrison stays on its center.
      reveal: { radius: 3, rects: [{ x0: 5, y0: 1, x1: 10, y1: 13 }] },
      // Hand play (CAMPAIGN.md section 11.10): a Candy seat that could farm,
      // log, and mine out-built both besiegers and won the mission by
      // itself, with the player absent.
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
      ],
      // The ally's directive: stay on the land of Sugarcrest and Gumdrop.
      directive: {
        kind: "HOLD",
        zone: [
          { x0: 5, y0: 6, x1: 9, y1: 10 },
          { x0: 7, y0: 4, x1: 9, y1: 5 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 10,
      technologies: [
        "GATHERING",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Wormwood",
          at: { x: 14, y: 1 },
          level: 3,
          rewards: ["STOCKPILE", "SURVEY"],
        },
        {
          name: "Coffin Hill",
          at: { x: 14, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 14, y: 1 } },
        { role: "FIGHTER", at: { x: 11, y: 1 } },
        { role: "FIGHTER", at: { x: 10, y: 1 } },
        { role: "FIGHTER", at: { x: 10, y: 0 } },
        { role: "GUARD", at: { x: 11, y: 2 } },
        { role: "GUARD", at: { x: 9, y: 1 } },
        { role: "RAIDER", at: { x: 12, y: 1 } },
        { role: "RAIDER", at: { x: 13, y: 2 } },
        { role: "FIGHTER", at: { x: 14, y: 5 }, home: 1 },
      ],
      // The road to the kingdom's north gate.
      reveal: { radius: 2, rects: [{ x0: 6, y0: 0, x1: 12, y1: 9 }] },
      directive: { kind: "RUSH" },
    },
    {
      faction: "GOBLIN",
      coins: 10,
      technologies: [
        "GATHERING",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
        "MARKSMANSHIP",
      ],
      cities: [
        {
          name: "Spitewood",
          at: { x: 14, y: 14 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Sourmash", at: { x: 11, y: 14 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 14, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 12, y: 14 } },
        { role: "GUARD", at: { x: 12, y: 13 } },
        { role: "MARKSMAN", at: { x: 11, y: 13 } },
        { role: "FIGHTER", at: { x: 11, y: 14 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 13 }, home: 1 },
      ],
      // The road to the kingdom's south gate.
      reveal: { radius: 2, rects: [{ x0: 6, y0: 7, x1: 12, y1: 15 }] },
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 10, y0: 12, x1: 15, y1: 15 }],
          untilRound: 4,
        },
        { kind: "RUSH" },
      ],
    },
  ],
  // The besiegers' waves muster in their own camps (hand play: a wave
  // that rose beside the player's squad wiped it out in the turn it came),
  // the Undead north-east of the lake and the Goblins south-east.
  reinforcements: [
    {
      seat: 2,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 1 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "FIGHTER", at: { x: 11, y: 2 } },
        { role: "GUARD", at: { x: 13, y: 2 } },
        { role: "CATAPULT", at: { x: 12, y: 0 } },
      ],
    },
    {
      seat: 3,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 13 } },
        { role: "FIGHTER", at: { x: 12, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "GUARD", at: { x: 13, y: 12 } },
        { role: "CATAPULT", at: { x: 12, y: 15 } },
      ],
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 1 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "FIGHTER", at: { x: 11, y: 2 } },
        { role: "GUARD", at: { x: 13, y: 2 } },
        { role: "CATAPULT", at: { x: 12, y: 0 } },
        { role: "CATAPULT", at: { x: 13, y: 0 } },
      ],
    },
    {
      seat: 3,
      round: 10,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 13 } },
        { role: "FIGHTER", at: { x: 12, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "GUARD", at: { x: 13, y: 12 } },
        { role: "CATAPULT", at: { x: 12, y: 15 } },
        { role: "CATAPULT", at: { x: 13, y: 15 } },
      ],
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 1 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "FIGHTER", at: { x: 11, y: 2 } },
        { role: "GUARD", at: { x: 13, y: 2 } },
        { role: "CATAPULT", at: { x: 12, y: 0 } },
        { role: "CATAPULT", at: { x: 13, y: 0 } },
      ],
    },
    {
      seat: 3,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 13 } },
        { role: "FIGHTER", at: { x: 12, y: 14 } },
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "GUARD", at: { x: 13, y: 12 } },
        { role: "CATAPULT", at: { x: 12, y: 15 } },
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
  landmarks: [
    { tag: "SUGARCREST", at: { x: 7, y: 8 } },
    { tag: "RIFTWATCH", at: { x: 5, y: 14 }, name: "Riftwatch" },
  ],
  // Sixteen rounds, and Sugarcrest must not fall. The stars: the Queen
  // lives, and Riftwatch is yours (or the kingdom's) at the end.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "SUGARCREST" }],
    bonus: [
      { kind: "UNIT_ALIVE", unit: "PRALINE" },
      { kind: "HOLD_PLACE", place: "RIFTWATCH" },
    ],
  },
};
