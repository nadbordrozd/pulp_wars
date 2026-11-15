import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_4` "A Year Without Summer" (docs/product/SAGA.md section 3.7,
 * I4; the Ice Folk campaign, `pulp_wars-hmyk.10`). Winter comes down three
 * months early and the lowlands fight the snow. Step 4 of 6.
 *
 * Since revision 5 (`pulp_wars-vdgh`, CAMPAIGN.md section 28) it is the
 * campaign's expansion war. The user, 2026-11-14: "at least one of the
 * missions should be like this - youre starting with nothing and
 * expanding and so is the enemy and if you snooze you lose. the time
 * limit should be very very generous so the game is decided by good old
 * conquest." Both sides start as in a skirmish, on a natural board with
 * free villages for each; the Crown's Harvest Wardens start ahead (two
 * towns, more soldiers, Coins and learning), claim the lowlands under the
 * Normal AI's own play, and then ride north for the snow towns. Take
 * every town of the Wardens; the clock only stops a stalemate.
 *
 * The board is the map generator's (Lakes 14, two seats, seed 12): the
 * Lake of Sighs fills the middle, with land round it in the west woods
 * and the eastern plain, and the Wardens' hills in the south.
 *
 * ```text
 *      x 0123456789ABCD
 * y  2   .fWffv..v.fv..      W: Whitewater (yours); v: villages
 *    4   fff~ffc.~..c..      c: treasure chests
 *    5   ffv~fv~~~~...^
 *    8   ^fv~~~~~.ffv.^
 *   11   ^fv^fK^^wf^v..      K: Kingsfield; w: Reaper's Cross
 * ```
 *
 * Hand play (CAMPAIGN.md section 28, two `play-text` games against the
 * Normal AI): the first, thoughtful attempt fell behind (eight units to
 * twenty-three in round 17, Rime and a town lost) until Frost Wyrms turned
 * it, and was won in round 32; the planned replay (the Wyrms by round 9)
 * led from round 19 and won in round 35, since the Crown re-manned each
 * town centre and woke a Juggernaut in its towns. Both kept Whitewater.
 *
 * Before revision 5 the mission was a hold-out (hold Whitewater and
 * Frostford for 13 rounds against the Wardens and Sugarcrest, Lakes 16,
 * three seats, seed 3; CAMPAIGN.md sections 22 and 27).
 */
export const ICE_FOLK_4_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start against
  // two marching armies and six waves.
  // Revision 4 (`pulp_wars-hmyk.31`, the fourth retune): eased toward
  // the middle.
  // Revision 5 (`pulp_wars-vdgh`): the expansion war against a head-started
  // Crown on a new board.
  revision: 5,
  seed: 20261604,
  // <map>
  size: 14,
  source: {
    mapType: "LAKES",
    size: 14,
    seats: 2,
    seed: 12,
    // Reaper's Cross stands on a village.
    edits: [{ kind: "VILLAGE", at: { x: 8, y: 11 }, present: false }],
  },
  terrain: [
    "ff.ff...^f.f..",
    "ffffff...ff..f",
    ".f.ff.....f...",
    "ff.ffff....f..",
    "fff~ff..~.....",
    "ff.~f.~~~~...^",
    "ff.~f.~~~~~...",
    "f.f~~~~~~~~f..",
    "^f.~~~~~.ff..^",
    "ff.~~~~~f~~..f",
    "fff~~~~~.~~..f",
    "^f.^f.^^.f^...",
    "^.^.ff^^^^.f^f",
    ".^^^ff^.^^^f^^",
  ],
  resources: [
    ".g...r.e..rg.r",
    "...gg.er.ggee.",
    "....g..r.e..re",
    "g.rg.gge.er..r",
    "..g.gg.r..e.r.",
    "..........eero",
    ".gepgr..p.....",
    ".egs.s.p...ge.",
    "..........g.e.",
    "...sp..s..pre.",
    ".g.s.ssp......",
    "og.og.oo..o...",
    "..oe.go.o...og",
    ".ooo.go.oo..o.",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWPPPPPPPP",
    "WWWWWWPPPPPPPP",
    "WWWWWWPPPPPPPP",
    "WWWWWWPPPPPPPP",
    "WWWPWWPPPPPPPP",
    "WWWPWWPPPPPPPP",
    "WWWPWWPPPPPPPP",
    "WWWPPPPPPPPPPP",
    "WWWPPPPPHPPPPP",
    "WWWPPPPPHPPPPP",
    "WWWPPPPPHPPPPP",
    "WWWHHHHHHHHHPP",
    "WWHHHHHHHHHHHP",
    "WHHHHHHHHHHHHH",
  ],
  villages: [
    { x: 5, y: 2 },
    { x: 8, y: 2 },
    { x: 11, y: 2 },
    { x: 2, y: 5 },
    { x: 5, y: 5 },
    { x: 2, y: 8 },
    { x: 11, y: 8 },
    { x: 2, y: 11 },
    { x: 11, y: 11 },
  ],
  treasureChests: [
    { x: 6, y: 4 },
    { x: 11, y: 4 },
  ],
  // Kingsfield's Lumber Camp and Mine (the town's land is
  // forest and peaks, with no Grass to harvest).
  improvements: [
    { at: { x: 4, y: 12 }, improvement: "LUMBER_CAMP" },
    { at: { x: 6, y: 12 }, improvement: "MINE" },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      // A skirmish start: a level 1 town, Mother Rime and one Yeti, no
      // learning, the skirmish's 3 Coins. Every Ice Folk technology is
      // open (the mission forbids nothing).
      coins: 3,
      technologies: [],
      cities: [
        { name: "Whitewater", at: { x: 2, y: 2 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 2 } },
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 2, y: 3 }, tag: "RIME" },
      ],
      reveal: { radius: 2 },
    },
    {
      // The Crown's Harvest Wardens: a head start of a second town, three
      // more soldiers, Coins and three technologies.
      faction: "ORIGINAL",
      coins: 8,
      technologies: ["HUNTING", "SCOUTING", "RAIDING"],
      cities: [
        {
          name: "Kingsfield",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Reaper's Cross", at: { x: 8, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 5, y: 11 } },
        { role: "FIGHTER", at: { x: 8, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "RAIDER", at: { x: 8, y: 10 } },
      ],
      reveal: { radius: 2 },
      // Normal AI play (it expands and develops as in a skirmish) until
      // round 8; then two hold each town and the rest ride for the nearest
      // snow town.
      directive: [
        { kind: "NORMAL", untilRound: 8 },
        {
          kind: "GUARD",
          zone: [{ x0: 4, y0: 10, x1: 9, y1: 12 }],
          garrison: 2,
          others: { kind: "RUSH" },
          fromRound: 8,
        },
      ],
    },
  ],
  forbiddenTechnologies: [],
  // Every town of the Wardens, by round 50: a clock that only stops a
  // stalemate (the two hand-played wins came in rounds 32 and 35). The
  // stars: by round 32 (the better of the two), and Whitewater never lost.
  objective: {
    kind: "DOMINATION",
    byRound: 50,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 32 }, { kind: "KEEP_CITIES" }],
  },
};
