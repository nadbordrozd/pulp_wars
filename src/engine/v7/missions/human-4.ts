import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_4` "The Siege of Fort Hollow" (docs/product/SAGA.md section 3.1,
 * H4; `pulp_wars-hmyk.4`). You hold Fort Hollow for 12 rounds against the
 * Grey Lodge and the Whitefang clan, Baron Kessler's latest hirelings,
 * teamed; the Ashen Marquis's dead are your allies and their column
 * arrives in round 7. Step 4 of 6: a hold-out, and a first taste of the
 * Cult. Its daemons are strong only while robed cultists channel them;
 * shoot the channellers and the daemon breaks loose and turns on the
 * nearest cultist. Meanwhile the Whitefang freeze whoever stands outside
 * the walls.
 *
 * The board is the map generator's (Dry Land 16, seed 19): Fort Hollow in
 * the middle of the plain, a ridge of peaks in the north-west, the
 * Whitefang camp in the north-east hills, the Lodge's chapel down the
 * south-western road, and the Marquis's camp behind the ridge in the far
 * north-west. The Lodge assaults the fort from the start; the Whitefang
 * forage for a round and then rush. Three waves: the Lodge in round 6,
 * the Marquis's column down the north road in round 7, and the Whitefang
 * in round 8; then the dead march on the Lodge's chapel.
 *
 * Hand play (CAMPAIGN.md section 15) set the numbers: Hollow Mill east of
 * the fort is a second place to train, since the fort's center is where
 * Mr. Pettigrew shelters; the villages around the fort are gone (taken by
 * the Lodge and the Whitefang, each one was a camp training against you),
 * and the enemies field no ranged units (Hexers and Snow Hunters shot the
 * clerk off the walls). The second retune (`pulp_wars-hmyk.19`, section
 * 15.5): Fort Hollow is a level 3 town with two Farms and no Farming (the
 * first pass's fort farmed itself to level 5 and a Juggernaut in round
 * 1), the garrison is two Guards, a Marksman and a Catapult, and the waves
 * come every round or two (with 5 Favour the Lodge raised a Horror a turn
 * and the fort fell; with 3 and the old waves nothing came for six rounds).
 * The fourth retune (`pulp_wars-hmyk.25`, section 15.6): the enemies start
 * strong instead of arriving in waves: the Lodge's column has two more
 * Initiates and 3 Coins, the Whitefang a fifth Yeti and 2 Coins, and the
 * early waves (Lodge rounds 3 and 10, Whitefang round 4) are gone; Hollow
 * Mill is a level 2 town (three training slots) and the fort has 8 Coins.
 *
 * ```text
 *      x 0123456789012345
 * y  0   f^.ffff^.^.....^
 *    1   .U.^.v^.fff...ff      U: the Marquis's camp
 *    2   ..^^^^.f.ff..^ff
 *    3   .f.^^^^.^...W.v.      W: Whitefang Camp
 *    4   ..^.^^^^........
 *    5   ...^^^^.......$.      $: treasure chests
 *    6   ...f^^v...v...v^      v: villages
 *    7   f..^^^.f...f...f
 *    8   .^^^^........f..
 *    9   fv^^vf....H..v.f      H: Fort Hollow
 *   10   ff.f^f.v..f.^..^
 *   11   ffffff..f....^.f
 *   12   ffff.ff^ff..f.v.
 *   13   $ffG.^fv.......^      G: the Grey Chapel
 *   14   .^f..ff.........
 *   15   f.f^.ff..f......
 * ```
 */
export const HUMAN_4_V7: MissionDefinitionV7 = {
  id: "HUMAN_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.19`, the second retune): a level 3 fort
  // with a thin garrison and no Farming, against more Favour and waves.
  // Revision 4 (`pulp_wars-hmyk.25`, the fourth retune): stronger enemy
  // starts, three waves instead of six, a level 2 Hollow Mill, 8 Coins.
  revision: 4,
  seed: 20261204,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 4,
    seed: 19,
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 12 }, present: false },
    ],
  },
  terrain: [
    "f^.ffff^.^.....^",
    "...^..^.fff...ff",
    "..^^^^.f.ff..^ff",
    ".f.^^^^.^.......",
    "....^^^^........",
    "...^^^^.........",
    "...f^^.........^",
    "f..^^^.f...f...f",
    ".^^^^........f..",
    "f.^^.f.........f",
    "ff.f^f....f.^..^",
    "ffffff..f....^.f",
    "ffff.ff^ff..f...",
    ".ff..^f........^",
    ".^f..ff.........",
    "f.f^.ff..f......",
  ],
  resources: [
    ".o.ggg..roree...",
    "...o..o..g..e.g.",
    "r.oo.o...g.r.o.g",
    "...oo...or.e..r.",
    "....oo......r...",
    "erro.oor..rrr..e",
    "rr..oo.ree.e...o",
    "g..o..e..re.ee..",
    ".o.oo.eeer.er...",
    "..oo..r..e.e....",
    "gge..ge.e..e.r..",
    "..g.g..r..rrr...",
    "g.g...go.g..g..e",
    ".g..r...re.rrr..",
    "..ge..gr..rr..rr",
    "....r.ge...r...r",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HWWWWWPPPPPPPPPP",
    "WWWWWWWPPPPPPPPP",
    "WWWWWWWWPPPPPPPP",
    "WWWWWWWWWPPPPPPP",
    "WWWWWWWWWPPPPPPP",
    "WWWWWWWWWPPPPPPP",
  ],
  villages: [
    { x: 5, y: 1 },
    { x: 6, y: 6 },
    { x: 7, y: 13 },
  ],
  treasureChests: [
    { x: 14, y: 5 },
    { x: 0, y: 13 },
  ],
  // </map>
  // Fort Hollow's Farms.
  improvements: [
    { at: { x: 11, y: 8 }, improvement: "FARM" },
    { at: { x: 9, y: 9 }, improvement: "FARM" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 8,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Hollow",
          at: { x: 10, y: 9 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        // The mill town east of the fort: a second place to train, so the
        // fort can keep Mr. Pettigrew on its walled center (hand play).
        {
          name: "Hollow Mill",
          at: { x: 13, y: 9 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mr. Pettigrew, keeping the garrison's books.
        { role: "CAPTAIN", at: { x: 10, y: 9 }, tag: "PETTIGREW" },
        { role: "GUARD", at: { x: 9, y: 9 } },
        { role: "GUARD", at: { x: 11, y: 9 } },
        { role: "MARKSMAN", at: { x: 10, y: 8 } },
        { role: "CATAPULT", at: { x: 9, y: 10 } },
      ],
      reveal: {
        radius: 3,
        rects: [
          { x0: 2, y0: 11, x1: 5, y1: 14 },
          { x0: 11, y0: 2, x1: 14, y1: 5 },
        ],
      },
    },
    {
      // The Grey Lodge: the hooded men who knelt to you last autumn.
      faction: "CULT",
      coins: 3,
      favour: 3,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Grey Chapel",
          at: { x: 3, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 13 } },
        // The column, already up the road (hand play: started at the
        // chapel, the Lodge summoned Imps there for five rounds and never
        // came).
        { role: "CAPTAIN", at: { x: 6, y: 11 } },
        { role: "FIGHTER", at: { x: 7, y: 11 } },
        { role: "FIGHTER", at: { x: 5, y: 10 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "GUARD", at: { x: 6, y: 10 } },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
        // Retune 4: two more hoods march with the column.
        { role: "FIGHTER", at: { x: 8, y: 11 } },
        { role: "FIGHTER", at: { x: 7, y: 10 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 8, y0: 7, x1: 12, y1: 11 }] },
      // A first taste of the Cult: Summoners, Initiates and Idol Bearers,
      // with a little Favour for Imps and Horrors. No Hexers, Familiars,
      // Stargazers, Tentacles, Gibbering Masses or Great Summoning.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "ASSAULT", target: { x: 10, y: 9 } },
    },
    {
      // The Whitefang clan under Chief Gnash, who would sooner fight than
      // freeze.
      faction: "ICE_FOLK",
      coins: 2,
      technologies: ["HUNTING", "DRILL", "ENGINEERING", "METALLURGY"],
      cities: [
        {
          name: "Whitefang Camp",
          at: { x: 13, y: 3 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Chief Gnash.
        { role: "SWORDSMAN", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 14, y: 4 } },
        { role: "FIGHTER", at: { x: 13, y: 4 } },
        // Retune 4: more of the clan, from the start.
        { role: "FIGHTER", at: { x: 12, y: 5 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 8, y0: 7, x1: 12, y1: 11 }] },
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SAWMILLING",
        "CHIVALRY",
      ],
      directive: [{ kind: "NORMAL", untilRound: 2 }, { kind: "RUSH" }],
    },
    {
      // The Ashen Marquis's dead: a camp behind the ridge, then a column.
      faction: "UNDEAD",
      coins: 0,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        { name: "Marquis's Camp", at: { x: 1, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 1, y: 1 } },
        { role: "FIGHTER", at: { x: 2, y: 1 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 9, x1: 6, y1: 15 }] },
      directive: [
        { kind: "HOLD", zone: [{ x0: 0, y0: 0, x1: 3, y1: 3 }], untilRound: 9 },
        { kind: "ASSAULT", target: { x: 3, y: 13 } },
      ],
    },
  ],
  teams: [0, 1, 1, 0],
  // The waves arrive within two or three steps of the walls (the Normal AI
  // does not walk a column up to a walled town): the Lodge's in round 6
  // up the south-western road, the Whitefang's in round 8 down from the
  // northern hills, and the Marquis's column down the north road in round
  // 7, each with its story line and a heads-up the turn before
  // (`pulp_wars-hmyk.18`). (Hand play, CAMPAIGN.md section 15: with two
  // waves each and 16 rounds, the fort fell every time; the second
  // retune's twelve rounds came with a wave every round or two; the fourth
  // retune puts those early waves' men on the board from the start.)
  reinforcements: [
    {
      seat: 1,
      round: 6,
      line: "The Lodge brings up its idol and its second choir.",
      announce: true,
      units: [
        { role: "CAPTAIN", at: { x: 7, y: 12 } },
        { role: "FIGHTER", at: { x: 8, y: 12 } },
        { role: "FIGHTER", at: { x: 7, y: 11 } },
        { role: "GUARD", at: { x: 6, y: 11 } },
      ],
    },
    {
      seat: 3,
      round: 7,
      line: "The dead are here. They apologise for the delay.",
      announce: true,
      units: [
        { role: "KNIGHT", at: { x: 7, y: 4 } },
        { role: "SWORDSMAN", at: { x: 7, y: 5 } },
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "MARKSMAN", at: { x: 7, y: 3 } },
      ],
    },
    {
      seat: 2,
      round: 8,
      line: "Chief Gnash's own warband joins the siege.",
      announce: true,
      units: [
        { role: "SWORDSMAN", at: { x: 11, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 6 } },
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
  landmarks: [{ tag: "FORT_HOLLOW", at: { x: 10, y: 9 } }],
  // Twelve rounds, and Fort Hollow must not fall. The stars: no city lost,
  // and Mr. Pettigrew lives.
  objective: {
    kind: "SURVIVE",
    rounds: 12,
    protect: [{ place: "FORT_HOLLOW" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "PETTIGREW" }],
  },
};
