import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_4` "Saucers over the Hold" (docs/product/SAGA.md section 3.4, D4;
 * the Dwarf campaign, `pulp_wars-hmyk.9`). A Martian mothership hangs over
 * Ironbraid Hold and wants the bell: bring the Mothership (tagged
 * `MOTHERSHIP`) down by round 18. Step 4 of 6. An enemy that flies, drops
 * troops anywhere beside its saucers, and wears a Shield that is whole
 * again every turn (the Mothership's is 4, over 16 Hit Points). A
 * Gyrocopter's Bomb Run flies out over its target, drops a bomb nothing
 * answers (6, 7 with Dive), and lands back where it started or anywhere
 * its Move reaches; one bomb a turn finds each target, so a bomb strips
 * the Shield and the next blow finds the hull.
 *
 * The board is the map generator's (Dry Land 16, two seats, seed 1933):
 * Ironbraid Hold and Copperstep sit in the south-western mountains on
 * their Mines, behind a wall of peaks and the Rift that no Martian on foot
 * can cross; the Martians have landed on the high meadow to the north.
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 20.4, NOT play
 * tested): the Hold stands alone (level 3; Copperstep is gone) with a
 * Fighter, the Engineer, a Gunner and a Gyrocopter, five technologies and
 * 3 Coins, and only the landing field is explored. The Martians have
 * eleven men (the Mothership, its Projector and two Grunts hold the field,
 * the other seven go for the Hold), 10 Coins and four announced waves
 * (rounds 3, 5, 8 and 11). The clock is 14 rounds.
 *
 * The fourth retune (`pulp_wars-hmyk.30`, CAMPAIGN.md section 20.5, hand
 * played): Copperstep is back (level 2, no Mines) with a Gunner, Dig In is
 * known, 6 Coins and the village in the gap east of Copperstep; the
 * eleven Martians keep their posts with 6 Coins; the four waves are gone
 * and the Mothership must fall by round 16.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   f.f.^.........^.
 *    1   ^f......ff.v..v^      v: villages
 *    2   fff.f..f^.f...f.
 *    3   ..f...ff.....^^.
 *    4   ^.......f.^v.fv.
 *    5   ....L.......f..f      L: the Landing Field
 *    6   ^.^^..f.^....^..
 *    7   .f.f..f^^^.vffv.
 *    8   ^fxxx.f^^^^..fff      x: the Rift
 *    9   f^^^..^^^f....ff
 *   10   f^^^^^^^v^^v^fvf
 *   11   ^^^^^^^^^^.fffff
 *   12   ^^^^^C.^^^^.ff.f      C: Copperstep
 *   13   ^^Hf..^f...^^fv.      H: Ironbraid Hold
 *   14   ^^fff^^^..f^^..f
 *   15   ^fff^^^ff..^..^f
 * ```
 */
export const DWARF_4_V7: MissionDefinitionV7 = {
  id: "DWARF_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean Hold against
  // eleven Martians and four announced waves.
  // Revision 4 (`pulp_wars-hmyk.30`, the fourth retune): Copperstep back,
  // no waves, 16 rounds.
  revision: 4,
  seed: 20261504,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 2,
    seed: 1933,
    // The Hold stands on a village, and the village under Copperstep's
    // walls is gone; so are the three villages round the landing field (in
    // hand play each became a Martian town that trained a Grunt a turn);
    // the landing field has flattened its Game, and Copperstep's last two
    // ore seams are worked out (hand play: with them Copperstep made a
    // second Brass Titan in round 1).
    edits: [
      { kind: "RESOURCE", at: { x: 4, y: 5 }, resource: "." },
      { kind: "RESOURCE", at: { x: 4, y: 12 }, resource: "." },
      { kind: "RESOURCE", at: { x: 6, y: 13 }, resource: "." },
      { kind: "VILLAGE", at: { x: 2, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
      // Retune 3: two of the southern villages are gone (retune 4 gives
      // back the one in the gap east of Copperstep).
      { kind: "VILLAGE", at: { x: 11, y: 7 }, present: false },
    ],
  },
  terrain: [
    "f.f.^.........^.",
    "^f......ff.....^",
    "fff.f..f^.f...f.",
    "..f...ff.....^^.",
    "^.......f.^..f..",
    "............f..f",
    "^.^^..f.^....^..",
    ".f.f..f^^^..ff..",
    "^fxxx.f^^^^..fff",
    "f^^^..^^^f....ff",
    "f^^^^^^^.^^.^f.f",
    "^^^^^^^^^^.fffff",
    "^^^^^..^^^^.ff.f",
    "^^.f..^f...^^f..",
    "^^fff^^^..f^^..f",
    "^fff^^^ff..^..^f",
  ],
  resources: [
    ".e.ro..eeerr.ro.",
    "o........ge.e..o",
    ".....eego..r.e.e",
    "r..r...g..r..o..",
    "o...r..e.e..r..e",
    ".e...e.e......eg",
    "oe....g.oeee.orr",
    ".g.....o.......e",
    ".......oooo.....",
    ".o.or.o.o.e..egg",
    ".ooo.ooo.oo.o..g",
    "oo.ooooooo.g..gg",
    "oooo..roooo.gge.",
    ".o.g.......oo...",
    "o..g..oorrg.o..g",
    "og..ooo.g...r.o.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHHPPPPPP",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHWWWWWW",
    "HHHHHHHHHWWWWWWW",
    "HHHHHHHHWWWWWWWW",
    "HHHHHHHWWWWWWWWW",
  ],
  villages: [
    { x: 11, y: 1 },
    { x: 14, y: 1 },
    { x: 11, y: 4 },
    { x: 14, y: 4 },
    { x: 14, y: 7 },
    { x: 8, y: 10 },
    { x: 11, y: 10 },
    { x: 14, y: 10 },
    { x: 14, y: 13 },
  ],
  treasureChests: [
    { x: 4, y: 6 },
    { x: 9, y: 9 },
  ],
  // </map>
  // The Hold's Mines (retune 3: Copperstep's three are gone with it).
  improvements: [
    { at: { x: 1, y: 12 }, improvement: "MINE" },
    { at: { x: 2, y: 12 }, improvement: "MINE" },
    { at: { x: 3, y: 12 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DWARF",
      // Retune 4: the Hold (level 3) and Copperstep, five units, six
      // technologies (a Gyrocopter, Gunners, Dig In, the way to Mining), 6
      // Coins.
      coins: 6,
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
          name: "Ironbraid Hold",
          at: { x: 2, y: 13 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        // Retune 4: Copperstep is back, without its Mines.
        {
          name: "Copperstep",
          at: { x: 5, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "CAPTAIN", at: { x: 2, y: 14 } },
        { role: "MARKSMAN", at: { x: 3, y: 14 } },
        { role: "RAIDER", at: { x: 3, y: 13 } },
        { role: "MARKSMAN", at: { x: 5, y: 12 }, home: 1 },
      ],
      // The high meadow round the landing field, seen from the peaks; the
      // rest is unexplored.
      reveal: {
        radius: 2,
        rects: [{ x0: 1, y0: 2, x1: 8, y1: 7 }],
      },
    },
    {
      // A raiding mothership and its saucers, very polite.
      faction: "MARTIAN",
      // Retune 3: eleven men; retune 4: 6 Coins (were 10).
      coins: 6,
      technologies: ["SCOUTING"],
      cities: [
        { name: "Landing Field", at: { x: 4, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        // The mothership over the field, a Shield Projector under it, two
        // Grunts of the landing party and the saucers (hand play: with four
        // Grunts round the field a Brass Titan beside it was shot from 29
        // HP to nothing in one enemy phase).
        { role: "KNIGHT", at: { x: 4, y: 4 }, tag: "MOTHERSHIP" },
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 4 } },
        { role: "RAIDER", at: { x: 2, y: 5 } },
        { role: "RAIDER", at: { x: 6, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 6 } },
        { role: "RAIDER", at: { x: 3, y: 3 } },
        { role: "RAIDER", at: { x: 5, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 10, x1: 7, y1: 15 }] },
      // Grunts and Saucers. Hand play: with Ray Gunners and Force Fields
      // the landing party shot every dwarf in the open through Shields of
      // 4 that a Gunner's shot could not get past.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
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
      // The mothership hangs over its landing field with the landing party
      // under it while the saucers go for the bell, which is under the
      // Hold. (Hand play: sent at the Hold it flew ahead of its escort and
      // was shot down at the walls in round 4; on a field across the board
      // nothing could reach it.)
      directive: {
        kind: "GUARD",
        zone: [{ x0: 3, y0: 3, x1: 5, y1: 5 }],
        garrison: 4,
        others: { kind: "ASSAULT", target: { x: 2, y: 13 } },
      },
    },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Mothership down by round 16 (the saga's 20; 18, then 14 in retune
  // 3). The stars: by round 12, and no city lost.
  objective: {
    kind: "KILL",
    units: ["MOTHERSHIP"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
