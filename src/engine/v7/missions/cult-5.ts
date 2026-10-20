import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_5` "Thaw" (docs/product/SAGA.md section 3.9, CU5; the Cult
 * campaign, `pulp_wars-hmyk.12`). Mother Rime has made herself into a crown
 * of ice on the summit of the Hollow Mountain, and while she stands the
 * mountain is cold and the Guest sleeps through any note. Sister Agatha
 * Vole, formerly of the Millford Ladies' Academy, has offered to drop a
 * star on her; the Redcaps have been hired at the usual rate. Destroy the
 * Winter Crown. Step 5 of 6: reach a target at the top of a defended
 * mountain with frail casters, against an enemy that freezes whatever
 * comes close. A Stargazer's star needs no road, only a tile two to four
 * tiles from her; every chanter who joins her makes it hit 3 harder, and
 * every chanter hurt or moved drops out. The Redcaps are the shield; the
 * circle is the sword.
 *
 * The board is the map generator's (Dry Land 16, seed 8), read with the
 * summit in the north-west: the Winter Crown on the ruins of the Lodge in
 * a ring of peaks, the Ice Folk's camps on the snowfields beside it, the
 * Frost Treaty's sweets at their camp in the middle of the board, and Hood
 * Hollow in the woods of the south with the Redcaps' den beside it. Rime is
 * a `GUARD` of her own tile, so she never leaves the Crown (hand play: with
 * a wider zone she stepped out from under the star; SAGA.md section 4,
 * E2's fallback); the sweets play their own game, then storm Hood Hollow
 * from round 5; the Redcaps rush.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   ..^f^..f.....^f.
 *    1   .^f^R^^Wf.......      R: the Winter Crown (Rime); W: Whitecairn
 *    2   ^.^f^^^^^......f
 *    3   .^Ff^^^^^...f...      F: Frostmere
 *    4   .^^ff.^f......v.      v: villages
 *    5   ff^...^......f..
 *    6   f^........$..^f.      $: treasure chests
 *    7   .v^.v.f...T..v.f      T: Toffee Post
 *    8   ^^^^f^.....f....
 *    9   f^fff^..........
 *   10   ^vffffff.^.....^
 *   11   .ffffHff^ff....f      H: Hood Hollow
 *   12   ffff..f.......ff
 *   13   ffDfffff..vf....      D: the Redcap Den
 *   14   f...ffff.....v..
 *   15   f^.^$ff^^^f..f..
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 23.4, not
 * play-tested): a skirmish start. Hood Hollow alone with Mr. Pettigrew,
 * Sister Vole (the Stargazer, who nobody can train yet) and two guards,
 * six technologies (the road to Stargazers and Hexers), 3 Coins and Favour 8; the
 * summit is the only thing seen. The Ice Folk have thirteen units and 5
 * Coins, the sweets eight and 4 Coins; from round 3 the Ice Folk's guard
 * sallies on Hood Hollow and from round 2 the sweets storm it, and five
 * announced waves (the Crown's frozen guard in rounds 5, 9 and 13, the
 * sweets in rounds 6 and 11) come. The clock is 16 (was 20).
 */
export const CULT_5_V7: MissionDefinitionV7 = {
  id: "CULT_5",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start.
  revision: 3,
  seed: 20261905,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 4,
    seed: 8,
    // Whitecairn, Toffee Post and the Redcap Den stand on villages; the
    // village under the summit is gone (the Ice Folk would settle it at
    // once and stand a town between the circle and the Crown).
    edits: [
      { kind: "VILLAGE", at: { x: 7, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 4 }, present: false },
      // Hand play: the sweets settled the two villages on their road and
      // trained a Trooper a turn from each, a flood across the circle's way.
      { kind: "VILLAGE", at: { x: 7, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 10 }, present: false },
    ],
  },
  terrain: [
    "..^f^..f.....^f.",
    ".^f^f^^.f.......",
    "^.^f^^^^^......f",
    ".^.f^^^^^...f...",
    ".^^ff.^f........",
    "ff^...^......f..",
    "f^...........^f.",
    "..^...f........f",
    "^^^^f^.....f....",
    "f^fff^..........",
    "^.ffffff.^.....^",
    ".ffff.ff^ff....f",
    "ffff..f.......ff",
    "ff.fffff...f....",
    "f...ffff........",
    "f^.^.ff^^^f..f..",
  ],
  resources: [
    "...g.r.geerero.r",
    ".o....o..rr..rrr",
    "...go..o..eee.rg",
    "...g.ooo..r.grr.",
    "eoogg.o.rer..e..",
    "g.ore.o.e.er....",
    ".o..e..ere.rr...",
    "..or....re.....g",
    "o.oo.or.e.....re",
    "go.g.o.ee..r..rr",
    "......ggr..rerro",
    "r.ggg..g...e..r.",
    "gg.g.r..e..ereg.",
    ".g...........r..",
    "...e.ggg...e....",
    "g..o..g.o...e.re",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "WWWWWWWPPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
  ],
  villages: [
    { x: 14, y: 4 },
    { x: 1, y: 7 },
    { x: 4, y: 7 },
    { x: 13, y: 7 },
    { x: 1, y: 10 },
    { x: 10, y: 13 },
    { x: 13, y: 14 },
  ],
  treasureChests: [
    { x: 10, y: 6 },
    { x: 4, y: 15 },
  ],
  // </map>
  aiMode: "RIVAL",
  // The Redcaps are hired: they fight beside you.
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "CULT",
      coins: 3,
      // The Lodge's purse for the season, much thinner (retune 3: 8, was
      // 12).
      favour: 8,
      // Leadership (the Summoner), Hexers, Stargazers (Star-fall) on the
      // way through Forestry, Warding Circles (the Idol Bearer), and
      // Mountaineering and Gibbering Masses (the climb, and a wall at home).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
      ],
      cities: [
        {
          name: "Hood Hollow",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mr. Pettigrew, Hierophant.
        { role: "CAPTAIN", at: { x: 5, y: 11 }, tag: "PETTIGREW" },
        // Sister Agatha Vole, Stargazer.
        { role: "CATAPULT", at: { x: 5, y: 10 }, tag: "VOLE" },
        { role: "FIGHTER", at: { x: 4, y: 10 } },
        { role: "GUARD", at: { x: 6, y: 9 } },
      ],
      // The summit, and nothing else (retune 3).
      reveal: { radius: 2, rects: [{ x0: 4, y0: 1, x1: 4, y1: 1 }] },
    },
    {
      // The Winter Crown's guard.
      faction: "ICE_FOLK",
      coins: 5,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Frostmere",
          at: { x: 2, y: 3 },
          level: 1,
          rewards: [],
        },
        { name: "Whitecairn", at: { x: 7, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        // Mother Rime, frozen into the Winter Crown on the summit.
        { role: "CAPTAIN", at: { x: 4, y: 1 }, tag: "RIME" },
        { role: "GUARD", at: { x: 3, y: 2 } },
        { role: "GUARD", at: { x: 5, y: 0 } },
        { role: "FIGHTER", at: { x: 2, y: 3 } },
        { role: "MARKSMAN", at: { x: 0, y: 3 } },
        { role: "FIGHTER", at: { x: 7, y: 1 }, home: 1 },
        { role: "RAIDER", at: { x: 8, y: 1 }, home: 1 },
        // Retune 3: six more of the guard.
        { role: "GUARD", at: { x: 3, y: 0 } },
        { role: "FIGHTER", at: { x: 5, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 4 } },
        { role: "FIGHTER", at: { x: 9, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 8, y: 0 }, home: 1 },
        { role: "RAIDER", at: { x: 9, y: 1 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 9, y1: 12 }] },
      // Rime is the Crown: a garrison of one on its tile, so she never
      // leaves it (the saga's E2 fallback; hand play: with the whole ring of
      // peaks as her zone she stepped out from under a marked star). The
      // rest of the guard plays its own game on the snowfields for two
      // rounds, then sallies on Hood Hollow (retune 3).
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 4, y0: 1, x1: 4, y1: 1 }],
          garrison: 1,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 4, y0: 1, x1: 4, y1: 1 }],
          garrison: 1,
          others: { kind: "ASSAULT", target: { x: 5, y: 11 } },
          fromRound: 3,
        },
      ],
    },
    {
      // The Frost Treaty's soldiers from Sugarcrest.
      faction: "CANDY",
      coins: 4,
      technologies: ["GATHERING", "HUNTING", "MARKSMANSHIP", "SCOUTING"],
      cities: [
        {
          name: "Toffee Post",
          at: { x: 10, y: 7 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 10, y: 7 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "MARKSMAN", at: { x: 10, y: 8 } },
        { role: "RAIDER", at: { x: 11, y: 6 } },
        // Retune 3: four more sweets.
        { role: "FIGHTER", at: { x: 9, y: 8 } },
        { role: "GUARD", at: { x: 11, y: 7 } },
        { role: "RAIDER", at: { x: 9, y: 6 } },
        { role: "MARKSMAN", at: { x: 8, y: 7 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 6, x1: 12, y1: 13 }] },
      // The sweets march on the second day and storm Hood Hollow (retune 3:
      // was the fourth).
      directive: [
        { kind: "NORMAL", untilRound: 2 },
        { kind: "ASSAULT", target: { x: 5, y: 11 } },
      ],
    },
    {
      // The Redcaps, hired at the usual rate.
      faction: "GOBLIN",
      coins: 2,
      technologies: ["GATHERING", "HUNTING", "SCOUTING"],
      cities: [
        {
          name: "Redcap Den",
          at: { x: 2, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 12 } },
        { role: "RAIDER", at: { x: 1, y: 12 } },
        { role: "RAIDER", at: { x: 3, y: 13 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 9, y1: 13 }] },
      directive: { kind: "RUSH" },
    },
  ],
  // Retune 3: five announced waves, the Crown's frozen guard in rounds 5, 9
  // and 13 and the sweets of the Frost Treaty in rounds 6 and 11.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      line: "The snowfield stirs: the Crown's frozen guard walks out of the drifts.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "MARKSMAN", at: { x: 5, y: 5 } },
      ],
    },
    {
      seat: 2,
      round: 6,
      line: "Sugarcrest's treaty soldiers march out of Toffee Post, banners up.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 7 } },
        { role: "GUARD", at: { x: 11, y: 8 } },
        { role: "RAIDER", at: { x: 12, y: 6 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      line: "Mother Rime's snow-walkers come down the mountain, quite silent, quite cold.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "RAIDER", at: { x: 5, y: 5 } },
        { role: "MARKSMAN", at: { x: 9, y: 2 } },
      ],
    },
    {
      seat: 2,
      round: 11,
      line: "Another column of sweets. The Frost Treaty is very thorough about this.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 6 } },
        { role: "GUARD", at: { x: 12, y: 7 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        { role: "RAIDER", at: { x: 12, y: 6 } },
        { role: "MARKSMAN", at: { x: 10, y: 9 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      line: "The Winter Crown's last guard rises from the ice, in a hurry.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "MARKSMAN", at: { x: 9, y: 2 } },
      ],
    },
  ],
  landmarks: [
    { tag: "SUMMIT", at: { x: 4, y: 1 } },
    { tag: "HOOD_HOLLOW", at: { x: 5, y: 11 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Winter Crown by round 16. The stars: by round 13, and Vole lives.
  objective: {
    kind: "KILL",
    units: ["RIME"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 13 },
      { kind: "UNIT_ALIVE", unit: "VOLE" },
    ],
  },
};
