import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_1` "Minutes of the Last Meeting" (docs/product/SAGA.md section 3.9,
 * CU1; the Cult campaign, `pulp_wars-hmyk.12`). You lead the Grey Lodge at
 * Greyhood, with Mr. Pettigrew taking the minutes, against a Ranger patrol:
 * Sergeant Hobb watched the spring meeting from a hedge and is riding for
 * Northwatch. Kill him before he gets there. Step 1 of 6: the Cult from
 * scratch. Favour buys daemons (an Imp alone for 2, a Horror with a helper
 * for 4), and a daemon must be channelled by a robed cultist every turn or
 * it breaks loose; a Familiar swaps places with any unit up to four tiles
 * away and drops it among the brethren.
 *
 * The board is the map generator's (Dry Land 11, seed 3): Greyhood in the
 * wooded marsh of the north, the Rangers' camp at Marsh Road to the south
 * of it, and the road to Northwatch running off the board in the
 * south-east, where Hobb keeps to the road (a `GUARD` of one). From round
 * 4 the rest of the patrol marches on Greyhood.
 *
 * ```text
 *      x 0123456789A
 * y  0   $...f^....f      $: treasure chests
 *    1   .^v...ff...      v: villages
 *    2   ffff.G...v.      G: Greyhood
 *    3   .fffff.f..f
 *    4   ^fffff.....
 *    5   .ffvf^v.fv.
 *    6   ...^^^..ff.
 *    7   ff^^.f..fff
 *    8   f.^v^fM...f      M: Marsh Road
 *    9   ^^f^^^^....
 *   10   ^^^^^^f.$.f      Hobb on the road (8..10, 9..10)
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 23.4, not
 * play-tested): a skirmish start. Greyhood alone with Mr. Pettigrew, Brother
 * Mallory and a Fighter, Gathering and Leadership only, 3 Coins and Favour
 * 2; the four villages by Greyhood are gone and only the road and the camp
 * are seen. The patrol has nine units and 4 Coins; Hobb keeps the road and
 * the rest march on Greyhood from round 3 (was 4), and a second patrol
 * comes up in round 5. The clock is 8 (was 10).
 *
 * The fourth retune (`pulp_wars-hmyk.33`, CAMPAIGN.md section 23.5,
 * hand-played): eased toward the middle. Pettigrew, Mallory and an
 * Initiate with Hunting as well, 5 Coins and Favour 2; two villages by
 * Greyhood are back and seen. The patrol is Hobb, his escort and seven
 * more (one of retune 3's four extra cut, a Marksman among them) with 3
 * Coins, marching from round 3; the second patrol is cut. The clock is 12
 * (star 8): the opener's clock is lax.
 */
export const CULT_1_V7: MissionDefinitionV7 = {
  id: "CULT_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start.
  // Revision 4 (`pulp_wars-hmyk.33`, the fourth retune): eased toward the
  // middle.
  revision: 4,
  seed: 20261901,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 3,
    // Retune 3: the four villages by Greyhood are gone (retune 4: two of
    // them are back).
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
    ],
  },
  terrain: [
    "....f^....f",
    ".^....ff...",
    "ffff.......",
    ".fffff.f..f",
    "^fffff.....",
    ".ff.f^..f..",
    "...^^^..ff.",
    "ff^^.f..fff",
    "f.^.^f....f",
    "^^f^^^^....",
    "^^^^^^f...f",
  ],
  resources: [
    ".e..go.rer.",
    "........e..",
    "..g.e..ee..",
    ".g.ggge....",
    ".g.g.g...r.",
    ".g..go.e...",
    "..roo..eg.e",
    "ggoor.reggg",
    "..o.og.rrr.",
    ".o.o.oo.ee.",
    "..o..og....",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWPPPP",
    "WWWWWWWPPPP",
    "WWWWWWWPPPP",
    "WWWWWWWPPPP",
    "WWWWWWPPPPP",
    "WWWWWPPPPPP",
    "WWWHHPPPPPP",
    "WWHHHPPPPPP",
    "WHHHHHPPPPP",
    "HHHHHHHPPPP",
    "HHHHHHHHPPP",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 5 },
    { x: 3, y: 8 },
  ],
  treasureChests: [
    { x: 0, y: 0 },
    { x: 8, y: 10 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CULT",
      coins: 5,
      // A little Favour: an Imp. A Horror waits on a Sacrifice, or on the
      // Summoner's trickle while its strand holds.
      favour: 2,
      // Leadership (the Summoner) and Hunting (retune 4; retune 3 Leadership
      // only).
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING"],
      cities: [
        {
          name: "Greyhood",
          at: { x: 5, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mr. Pettigrew, Initiate, on his afternoon off.
        { role: "FIGHTER", at: { x: 5, y: 3 }, tag: "PETTIGREW" },
        // Brother Mallory presides.
        { role: "CAPTAIN", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 2 } },
      ],
      // The camp at Marsh Road and the road where Hobb rides, and nothing
      // between.
      reveal: {
        radius: 2,
        rects: [
          { x0: 2, y0: 1, x1: 9, y1: 2 },
          { x0: 6, y0: 8, x1: 6, y1: 8 },
          { x0: 8, y0: 9, x1: 10, y1: 10 },
        ],
      },
    },
    {
      // The Ranger patrol.
      faction: "ORIGINAL",
      coins: 3,
      technologies: [],
      cities: [
        {
          name: "Marsh Road",
          at: { x: 6, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 7 } },
        { role: "GUARD", at: { x: 7, y: 8 } },
        { role: "FIGHTER", at: { x: 7, y: 7 } },
        // Sergeant Hobb, riding for Northwatch.
        { role: "RAIDER", at: { x: 10, y: 10 }, tag: "HOBB" },
        // His escort on the road.
        { role: "GUARD", at: { x: 9, y: 10 } },
        // Three of retune 3's four extra Rangers.
        { role: "FIGHTER", at: { x: 5, y: 8 } },
        { role: "GUARD", at: { x: 5, y: 7 } },
        { role: "MARKSMAN", at: { x: 7, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 1, x1: 8, y1: 4 }] },
      // Step 1 keeps to the lesson: a patrol of Fighters and Guards.
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
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
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // Hobb keeps to the south road (a garrison of one, who starts on it);
      // from round 3 the rest of the patrol marches on Greyhood (retune 3:
      // was round 4).
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 8, y0: 9, x1: 10, y1: 10 }],
          garrison: 2,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 8, y0: 9, x1: 10, y1: 10 }],
          garrison: 2,
          others: { kind: "ASSAULT", target: { x: 5, y: 2 } },
        },
      ],
    },
  ],
  landmarks: [
    { tag: "GREYHOOD", at: { x: 5, y: 2 } },
    { tag: "MARSH_ROAD", at: { x: 6, y: 8 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Hobb, before the thirteenth day (retune 4: 12; retune 3 8, was 10).
  // The stars: by round 8, and Pettigrew lives.
  objective: {
    kind: "KILL",
    units: ["HOBB"],
    byRound: 12,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 8 },
      { kind: "UNIT_ALIVE", unit: "PETTIGREW" },
    ],
  },
};
