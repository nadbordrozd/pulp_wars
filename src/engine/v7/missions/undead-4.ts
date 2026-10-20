import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_4` "The Hall of the Thanes" (docs/product/SAGA.md section 3.2,
 * U4; the Undead campaign, `pulp_wars-hmyk.5`). You must walk Doctor Crane
 * (a tagged Necromancer) from Lantern Hill to the summit stair, past the
 * Ironbraid crypt-wardens, by round 22. Step 4 of 6: an escort through a
 * mountain maze. Dwarves standing still by their own cities defend as if
 * fortified, and their cannons knock units back down the road; fighting
 * through every hall is slow, and the long way round over the peaks is
 * only lightly watched.
 *
 * The board is the map generator's (Dry Land 16, seed 3): Lantern Hill in
 * the south-west below the mountain; the short road north-east through a
 * gap in the peaks past the two halls of the crypt-wardens, Deepdelve and
 * Cairn Hall; a watch-post, Stairwatch, on the eastern shoulder; and the
 * summit stair, on bare ground, in the far north-east. The long way runs
 * up the western woods and along the northern peaks (Engineering takes
 * units over Mountains). The wardens hold the halls and the watch-post
 * (`GUARD`) and send the rest, a Gyrocopter and a patrol on the peaks, at
 * Lantern Hill.
 *
 * Hand play (CAMPAIGN.md section 16) set the shape: as a village the stair
 * was taken by the wardens as a fourth hall; Cairn Hall stood by the goat
 * path and its Gyrocopters bombed Crane, so it moved onto the road; with
 * nobody on the peaks the goat path was too easy, hence the patrol.
 *
 * ```text
 *      x 0123456789012345
 * y  0   fffff.ff.^.f^fff
 *    1   ^fff..v^...^fS^f      S: the Summit Stair; v: villages
 *    2   .vff^..^f^.ff^^.
 *    3   fff^^^f^ff..f.^^
 *    4   .fff.f^$f..^^W^f      W: Stairwatch; $: treasure chests
 *    5   f^...$.^f^D^.^.^      D: Deepdelve
 *    6   .f.^^...^.ff^^^.
 *    7   ff^^^..^^^^^.^f^
 *    8   .v..f^.^^^Cf..^.      C: Cairn Hall
 *    9   ff.....f^^^^.^^.
 *   10   .f......^^^^^..f
 *   11   .v..L..v.^^.f...      L: Lantern Hill
 *   12   ^...f...f^^f...f
 *   13   f....f....f....f
 *   14   .v...v..........
 *   15   ...f.^.......^..
 * ```
 */
export const UNDEAD_4_V7: MissionDefinitionV7 = {
  id: "UNDEAD_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.20`, retune 2): a thin start against a
  // clan that hunts.
  revision: 3,
  seed: 20261304,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 2,
    seed: 3,
    // Lantern Hill and the two halls stand on villages; the villages east
    // of the peaks would hand the wardens more halls.
    edits: [
      { kind: "VILLAGE", at: { x: 4, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 14 }, present: false },
      // The summit stair is a stair, not a village (hand play: the wardens
      // walked up and took it as a fourth hall).
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
      // Retune 2 (`pulp_wars-hmyk.20`): Lantern Hill keeps one village in
      // reach, not five; the two on the goat path stay, for whoever gets
      // there first.
      { kind: "VILLAGE", at: { x: 1, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 14 }, present: false },
    ],
  },
  terrain: [
    "fffff.ff.^.f^fff",
    "^fff...^...^f.^f",
    "..ff^..^f^.ff^^.",
    "fff^^^f^ff..f.^^",
    ".fff.f^ff..^^.^f",
    "f^.....^f^.^.^.^",
    ".f.^^...^.ff^^^.",
    "ff^^^..^^^^^.^f^",
    "....f^.^^^.f..^.",
    "ff.....f^^^^.^^.",
    ".f......^^^^^..f",
    ".........^^.f...",
    "^...f...f^^f...f",
    "f....f....f....f",
    "................",
    "...f.^.......^..",
  ],
  resources: [
    "g.g..e......o...",
    "o....e.o...og...",
    "e......ogo....or",
    "...ooo..g..e.roo",
    "..g......eeoo.o.",
    "..r.....go...oro",
    "e..oo...o.g...o.",
    ".gooo.....oo.o.o",
    "e..e...o.o....o.",
    "g..r.e..oooo.o..",
    "r.r.....ooooorr.",
    "r.rr.rr.ro.e...e",
    "orr..err.oo.r...",
    ".rr.e.r.r....e..",
    "...rr.re..eree..",
    "rr..eoee.r.ero..",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWHHHHHHHHHHHHH",
    "WWHHHHHHHHHHHHHH",
    "WWHHHHHHHHHHHHHH",
    "WWHHHHHHHHHHHHHH",
    "WWPPPHHHHHHHHHHP",
    "WPPPPPHHHHHHHHPP",
    "PPPPPPPHHHHHHPPP",
    "PPPPPPPPHHHHPPPP",
    "PPPPPPPPPHHPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 11 },
  ],
  treasureChests: [
    { x: 7, y: 4 },
    { x: 5, y: 5 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Lantern Hill",
          at: { x: 4, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        // Doctor Crane, with his hat.
        { role: "CAPTAIN", at: { x: 4, y: 10 }, tag: "CRANE" },
        // A Vampire of the Marquis's court, lent for the walk.
        { role: "KNIGHT", at: { x: 5, y: 10 } },
        { role: "GUARD", at: { x: 3, y: 10 } },
        { role: "MARKSMAN", at: { x: 5, y: 11 } },
      ],
      // Crane's map: the mountain, the road, both halls, the watch-post
      // and the stair.
      reveal: {
        radius: 1,
        rects: [
          { x0: 0, y0: 0, x1: 15, y1: 6 },
          { x0: 5, y0: 6, x1: 12, y1: 9 },
        ],
      },
    },
    {
      // The Ironbraid crypt-wardens.
      faction: "DWARF",
      coins: 4,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        { name: "Deepdelve", at: { x: 10, y: 5 }, level: 1, rewards: [] },
        { name: "Cairn Hall", at: { x: 10, y: 8 }, level: 1, rewards: [] },
        { name: "Stairwatch", at: { x: 13, y: 4 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 10, y: 5 } },
        { role: "FIGHTER", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 9, y: 6 } },
        { role: "MARKSMAN", at: { x: 9, y: 4 } },
        { role: "CATAPULT", at: { x: 10, y: 6 } },
        { role: "GUARD", at: { x: 10, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 12, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 4 }, home: 2 },
        // The Gyrocopters on patrol.
        { role: "RAIDER", at: { x: 12, y: 5 }, home: 2 },
        { role: "RAIDER", at: { x: 8, y: 2 } },
        // The patrol on the peaks.
        { role: "FIGHTER", at: { x: 10, y: 1 }, home: 2 },
        { role: "MARKSMAN", at: { x: 9, y: 1 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 9, x1: 6, y1: 12 }] },
      // Step 4: Hammerers, Steam Moles dug in, Gyrocopters, Clockwork
      // Gunners and the one Steam Cannon of Deepdelve; no Whirligigs, Steam
      // Tanks or Engineers, and no Mining, farms or lumber camps (hand play:
      // Mines and Workshops raised Cairn Hall to level 4 in two rounds, a
      // reward Gyrocopter a level). Without Mining the wardens never climb
      // the peaks; your dead may.
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "EXPLOSIVES",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
      ],
      // The wardens hold the halls on the road and the watch-post; the
      // rest of the clan, the Gyrocopters and both patrols, goes for
      // Lantern Hill.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 9, y0: 4, x1: 11, y1: 9 },
          { x0: 12, y0: 3, x1: 14, y1: 5 },
        ],
        garrison: 10,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The clan calls up more hammers as the dead climb: a Gyrocopter, a
  // Hammerer and a Gunner come over the northern peaks in round 6, and the
  // stair's own guard turns out in round 12.
  reinforcements: [
    {
      seat: 1,
      round: 6,
      line: "More of the clan over the northern peaks. They do not care to see the dead walk.",
      announce: true,
      units: [
        { role: "RAIDER", at: { x: 11, y: 0 } },
        { role: "FIGHTER", at: { x: 12, y: 2 } },
        { role: "MARKSMAN", at: { x: 10, y: 0 } },
      ],
    },
    {
      seat: 1,
      round: 12,
      line: "The stair's own guard turns out. The Thane has sent word to stop the hat.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 15, y: 2 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "GUARD", at: { x: 14, y: 0 } },
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
  landmarks: [{ tag: "SUMMIT_STAIR", at: { x: 13, y: 1 } }],
  // Doctor Crane reaches the stair by round 22. The stars: by round 18,
  // and Lantern Hill never falls.
  objective: {
    kind: "ESCORT",
    unit: "CRANE",
    to: "SUMMIT_STAIR",
    within: 1,
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
