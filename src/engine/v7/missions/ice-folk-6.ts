import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_6` "The Winter Crown" (docs/product/SAGA.md section 3.7, I6; the
 * Ice Folk campaign, `pulp_wars-hmyk.10`). The Heart of Winter must be set on
 * the summit before the Long Night, and Mother Rime will carry it: bring
 * her onto the summit by round 20. Step 6 of 6, the finale. A frail witch
 * walks a long climb under attack from both sides: the Grey Lodge holds the
 * eastern slopes beside the road and strikes whatever passes, and the
 * Unquiet climb out of the barrows on the western slopes in rounds 4, 8
 * and 12. Thane Ironbraid's dwarves hold the Deep Gate on the road and fight
 * beside you; no unit enters an ally's land, so the road skirts its walls.
 * A Musk Ox freezes whoever strikes it from the next tile; a Mammoth's blow
 * also hits the two enemies beside its target; Rime's Cold Snap freezes
 * every enemy beside her.
 *
 * The board is the map generator's (Dry Land 20, four seats, seed 1): the
 * Ice Folk's towns in the north, the Hollow Mountain's peaks in the middle
 * with the summit, the Lodge's ruins, among them; the Deep Gate on the road
 * up; the Lodge's camps on the eastern slopes, the barrows in the west.
 *
 * ```text
 *      x 0123456789ABCDEF0123
 * y  1   f^^..^....E...f..ff.      E: the Ember Lodge
 *    2   f^.ff......f.ff.f.f.
 *    3   ^^Wf^..Rff...f.ff.ff      W: Whitefang; R: Rime Camp
 *    4   .^......ff....f..fff
 *    5   ^^..ff...ff...c.f...      c: a treasure chest
 *    6   ff.^^.^fGf^.f^L..Hff      G: the Deep Gate; L, H: the Lodge's camps
 *    7   f.^^^..^.^^^^f^....f
 *    8   .^^f^...^^f.^^^f...f
 *    9   .fBf^..^.ffS^^.^f.ff      B: Barrow Hill; S: the Summit
 *   10   ^^^^f^^^..^^^^f^^ff.
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): the saga's finale and the hardest mission of the game. A
 * thin start: Rime Camp at level 2 and a level 1 Whitefang (the Ember Lodge
 * is no longer yours), six units instead of eleven, five technologies (no
 * Explosives), 4 Coins and the Summit the only thing seen. The Grey Lodge
 * has two camps at level 2, sixteen units and Favour 8: ten
 * hold the slopes, six march on Rime Camp from round 4. The Unquiet have a
 * barrow, six dead and five announced waves (rounds 3, 6, 9, 12
 * and 15). The clock is 16 (was 20).
 *
 * The fourth retune (`pulp_wars-hmyk.31`, CAMPAIGN.md section 22.5,
 * hand-played): Rime Camp level 3 behind walls, Whitefang level 1, the old
 * Ember Lodge's village behind Rime Camp back; nine units (a second Ox, a
 * second Snow Hunter, a Sled), seven technologies (Scouting and Explosives
 * back), 6 Coins, the climb seen. The Grey Lodge has eleven units (three of
 * retune 3's keepers and the ambush below the summit are gone) and Favour
 * 3: eight hold the slopes and three march. The dead have ten on the board
 * (the first wave among them) and one more wave in round 8. The clock is 18
 * (star 14).
 */
export const ICE_FOLK_6_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start, a
  // marching Lodge and five waves of the dead.
  // Revision 4 (`pulp_wars-hmyk.31`, the fourth retune): eased toward the
  // middle; the first of the dead on the board, one later wave.
  revision: 4,
  seed: 20261606,
  // <map>
  size: 20,
  source: {
    mapType: "DRY_LAND",
    size: 20,
    seats: 4,
    seed: 1,
    // The Ember Lodge, Whitefang, the Deep Gate, the Lodge's camp and
    // Barrow Hill stand on villages; the villages round the slopes and the
    // barrows are gone (each would be a free town for the Lodge or the
    // dead).
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 13 }, present: false },
      // Hand play: taken on the road up, this village gave the Witch a town
      // and its snow halfway to the summit.
      { kind: "VILLAGE", at: { x: 11, y: 6 }, present: false },
    ],
  },
  terrain: [
    "^f^^.^...f.f..f.f.ff",
    "f^^..^........f..ff.",
    "f^.ff......f.ff.f.f.",
    "^^.f^...ff...f.ff.ff",
    ".^......ff....f..fff",
    "^^..ff...ff...f.f...",
    "ff.^^.^f.f^.f^....ff",
    "f.^^^..^.^^^^f^....f",
    ".^^f^...^^f.^^^f...f",
    ".f.f^..^.ff.^^.^f.ff",
    "^^^^f^^^..^^^^f^^ff.",
    "fff.ff^f^..^^^^.f^f.",
    "^f^.^.f..f.x.^..^f..",
    "^.f.f..ff^fx..^f^.ff",
    "...f...ff^^x.^ff^f.f",
    ".........^^^^f..fff.",
    ".........f.f^ff...f^",
    "..........f..f^^...^",
    "f............f..ff^f",
    "f...f...f......ff.ff",
  ],
  resources: [
    "o.oo..rrr...r....rgg",
    ".oo.eor..e..ee.....e",
    ".or.gr.er.e...g..e..",
    "oo...e....r.....g.g.",
    "r.errr.r..ee.rg.....",
    "oo....e.e..rrr.e..r.",
    "g...o.....o..o.rr...",
    "...oor.oro.o..o.....",
    ".o..oe..oo..ooo.e...",
    "....o.......o..o....",
    "oooo.o.o..oooo.oo...",
    ".....g.g.....oo..og.",
    "ogo.o...eg...o...g.r",
    "o....rrg..g.reo...gg",
    "e........o...o..oge.",
    ".rr.....rooo.....gg.",
    ".r.r...ee.r.o.ger..o",
    ".r.eerree..e.......o",
    "......re..r.e......g",
    ".e.rge..gr.er.e.g.g.",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHPPPPPPPPPPPWWWWW",
    "HHHHPPPPPPPPPPPWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHHHHHHHHHHWWWWWW",
    "HHHHHHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHHHHHHWWWW",
    "HHHHHHHHHHHHHHHHHWWW",
    "HHHHHHHHHHHHHHHHHHWW",
    "HHHHHHHHHHHHHHHHHHWW",
    "HHHHHHHHHHHHHHHHHWWW",
    "HPPPPPPHHHHHHHHHWWWW",
    "PPPPPPPPHHHHHHHWWWWW",
    "PPPPPPPPPHHHHHWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
  ],
  villages: [
    // Retune 4: the old Ember Lodge's village is back, behind Rime Camp.
    { x: 10, y: 1 },
    { x: 11, y: 9 },
    { x: 14, y: 15 },
    { x: 1, y: 18 },
    { x: 5, y: 18 },
    { x: 8, y: 18 },
    { x: 11, y: 18 },
    { x: 14, y: 18 },
  ],
  improvements: [
    // The Deep Gate's mines in the peaks beside it.
    { at: { x: 7, y: 7 }, improvement: "MINE" },
    { at: { x: 9, y: 7 }, improvement: "MINE" },
  ],
  treasureChests: [
    { x: 14, y: 5 },
    { x: 4, y: 11 },
    { x: 1, y: 14 },
    { x: 0, y: 19 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      // Retune 3: a thin start. No Administration, Scouting or Explosives
      // (Blast Mountain is one research away), and no Engineering (hand
      // play: with it the Witch walked straight over the peaks to the
      // summit in nine rounds).
      // Retune 4: Scouting and Explosives (Brittle) back, 6 Coins, Rime
      // Camp at level 3 behind walls (Engineering stays a research away).
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "Rime Camp",
          at: { x: 7, y: 3 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "Whitefang", at: { x: 2, y: 3 }, level: 1, rewards: [] },
      ],
      units: [
        // Mother Rime, the Ice Witch, with the Heart of Winter.
        { role: "CAPTAIN", at: { x: 7, y: 4 }, tag: "RIME" },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "SWORDSMAN", at: { x: 6, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "MARKSMAN", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 3 }, home: 1 },
        // Retune 4: a second Musk Ox, a second Snow Hunter and a Sled.
        { role: "GUARD", at: { x: 8, y: 3 } },
        { role: "MARKSMAN", at: { x: 6, y: 2 } },
        { role: "RAIDER", at: { x: 8, y: 2 } },
      ],
      // The camps and the summit (retune 4: and the climb to it).
      reveal: { radius: 2, rects: [{ x0: 8, y0: 4, x1: 12, y1: 9 }] },
    },
    {
      // The Grey Lodge on the eastern slopes.
      faction: "CULT",
      coins: 6,
      // Enough Favour for two Horrors at once (retune 3: was 4). Retune 4:
      // 3 (hand play: a Horror kills Mother Rime in one blow, and with 6
      // one stood in the fog on every other tile of the climb).
      favour: 3,
      // Leadership (the Summoner), Hexers and Familiars.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Slope Camp",
          at: { x: 14, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Eastwatch",
          at: { x: 17, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 14, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "MARKSMAN", at: { x: 15, y: 8 } },
        { role: "MARKSMAN", at: { x: 15, y: 6 } },
        { role: "RAIDER", at: { x: 13, y: 5 } },
        { role: "GUARD", at: { x: 14, y: 9 } },
        { role: "FIGHTER", at: { x: 17, y: 6 }, home: 1 },
        { role: "RAIDER", at: { x: 16, y: 7 }, home: 1 },
        // Retune 4: the ambush below the summit is gone (hand play: its
        // Fighter settled the Summit's village in round 4 and the last
        // step of the climb became a siege nobody was left for).
        // Retune 3: five more keepers of the slopes (retune 4: two).
        { role: "MARKSMAN", at: { x: 12, y: 5 } },
        { role: "GUARD", at: { x: 15, y: 7 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 2, x1: 15, y1: 11 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
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
      // They hold the slopes beside the road and strike whatever passes
      // (ten of them); from round 4 the other six march on Rime Camp.
      directive: [
        {
          kind: "HOLD",
          zone: [
            { x0: 12, y0: 4, x1: 16, y1: 10 },
            { x0: 8, y0: 8, x1: 10, y1: 9 },
          ],
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 12, y0: 4, x1: 16, y1: 10 },
            { x0: 8, y0: 8, x1: 10, y1: 9 },
          ],
          garrison: 8,
          others: { kind: "ASSAULT", target: { x: 7, y: 3 } },
          fromRound: 4,
        },
      ],
    },
    {
      // The Unquiet in the barrows on the western slopes.
      faction: "UNDEAD",
      coins: 4,
      technologies: [],
      cities: [
        { name: "Barrow Hill", at: { x: 2, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "FIGHTER", at: { x: 1, y: 9 } },
        // Retune 3: three more dead.
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 9 } },
        { role: "GUARD", at: { x: 5, y: 8 } },
        // Retune 4: the first wave (round 3) is on the board from the start.
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "FIGHTER", at: { x: 6, y: 7 } },
        { role: "GUARD", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 7 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 12, y1: 11 }] },
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
      // The dead climb for the nearest living town.
      directive: { kind: "RUSH" },
    },
    {
      // Thane Ironbraid's dwarves at the Deep Gate.
      faction: "DWARF",
      coins: 2,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 8, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 7 } },
        { role: "MARKSMAN", at: { x: 9, y: 6 } },
        { role: "MARKSMAN", at: { x: 7, y: 6 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 4, x1: 15, y1: 10 }] },
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
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The dwarves hold the Deep Gate's land.
      directive: { kind: "HOLD", zone: [{ x0: 7, y0: 5, x1: 9, y1: 7 }] },
    },
  ],
  teams: [0, 1, 1, 0],
  // The Unquiet climb out of the barrows in rounds 4, 8 and 12 (hand play:
  // in rounds 6, 10 and 14 they came too late for the road). Retune 3: in
  // rounds 3, 6, 9, 12 and 15, and bigger. Retune 4: the first wave is on
  // the board from the start and one more comes in round 8.
  reinforcements: [
    {
      seat: 2,
      round: 8,
      line: "More of the dead, who have heard there is a witch on the road.",
      announce: true,
      units: [
        { role: "SWORDSMAN", at: { x: 7, y: 8 } },
        { role: "GUARD", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 7 } },
      ],
    },
  ],
  landmarks: [{ tag: "SUMMIT", at: { x: 11, y: 9 }, name: "The Summit" }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Rime onto the summit by round 18. The stars: by round 14, and no city
  // lost.
  objective: {
    kind: "ESCORT",
    unit: "RIME",
    to: "SUMMIT",
    within: 0,
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
