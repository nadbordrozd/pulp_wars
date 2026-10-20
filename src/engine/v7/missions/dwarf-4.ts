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
  revision: 2,
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
    { x: 11, y: 7 },
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
  // The Hold's and Copperstep's Mines.
  improvements: [
    { at: { x: 1, y: 12 }, improvement: "MINE" },
    { at: { x: 2, y: 12 }, improvement: "MINE" },
    { at: { x: 3, y: 12 }, improvement: "MINE" },
    { at: { x: 4, y: 11 }, improvement: "MINE" },
    { at: { x: 5, y: 11 }, improvement: "MINE" },
    { at: { x: 6, y: 11 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DWARF",
      coins: 10,
      // Gyrocopters, Clockwork, Dig In and Mining.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
      ],
      cities: [
        {
          name: "Ironbraid Hold",
          at: { x: 2, y: 13 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        {
          name: "Copperstep",
          at: { x: 5, y: 12 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "CAPTAIN", at: { x: 1, y: 13 } },
        { role: "MARKSMAN", at: { x: 2, y: 12 } },
        { role: "RAIDER", at: { x: 3, y: 13 } },
        { role: "FIGHTER", at: { x: 5, y: 12 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 12 }, home: 1 },
        { role: "RAIDER", at: { x: 6, y: 13 }, home: 1 },
      ],
      // The high meadow, seen from the peaks.
      reveal: {
        radius: 2,
        rects: [{ x0: 0, y0: 2, x1: 14, y1: 11 }],
      },
    },
    {
      // A raiding mothership and its saucers, very polite.
      faction: "MARTIAN",
      coins: 3,
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
  // Fresh troops beamed down from the sky: by Copperstep in round 5 and by
  // the Hold in round 9.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 9 } },
        { role: "FIGHTER", at: { x: 6, y: 8 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 0, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 1, y: 6 } },
      ],
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
  // The Mothership down by round 18 (the saga's 20; hand play won in round
  // 10). The stars: by round 14, and no city lost.
  objective: {
    kind: "KILL",
    units: ["MOTHERSHIP"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
