import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_2` "The Lord Protector's Writ" (docs/product/SAGA.md section 3.1,
 * H2; `pulp_wars-hmyk.4`). You lead the Humans against the Redcaps, Baron
 * Kessler's goblin mercenaries, on a dry 14 x 14 board, and take back the
 * three walled toll forts on the King's Road by round 30. Step 2 of 6.
 *
 * The board is the map generator's (Dry Land 14, seed 9): open plains in
 * the west, wooded hills in the east, and a line of villages north to south
 * that the King's Road joins. Fort Steele stands at the southern end of the
 * road; the three toll forts stand on it, three tiles apart, the Redcaps'
 * capital, Kingsgate, at the far end. Each fort keeps one of its own at
 * home; from round 4 every other Redcap marches on Fort Steele. The
 * problem: walls, Gang Up and Kaboom, and a gate the Goblins refill every
 * turn: the Catapult kills the gate's Goblin and a Fighter beside it steps
 * in the same turn.
 *
 * The second retune (`pulp_wars-hmyk.19`, CAMPAIGN.md section 15.5): a
 * skirmish start. The Rangers are disbanded: Fort Steele alone (level 2),
 * two Fighters and the old Catapult nobody can build until Sawmilling, no
 * technology; Haywick is gone. Mudford is an unwalled level 2 fort, the
 * Redcaps keep no field army and march from round 4 (with a field army and
 * a round-3 march the skirmish start was lost by round 7).
 *
 * The fourth retune (`pulp_wars-hmyk.25`, CAMPAIGN.md section 15.6): the
 * Redcaps outnumber you from the start (eight Goblins in and around the
 * forts and 4 Coins); Fort Steele is a walled level 3 fort with its land
 * grant, three Fighters and the Catapult, and the conquest clock is lax
 * (30 rounds; the thoughtful win took 26).
 *
 * ```text
 *      x 01234567890123
 * y  0   .ff....fff^.f.
 *    1   .$...f.fffff..      $: a treasure chest
 *    2   ........Kff.ff      K: Kingsgate, the Redcaps' capital
 *    3   .......fLf.fff      L: Lumber Camps (also at 7,1 9,1 7,3 9,3 7,4 9,4)
 *    4   ....$..f#fffff      #: the King's Road
 *    5   ...f....Hff.ff      H: Halfway Toll
 *    6   .vf.^...#^f.^^      v: villages
 *    7   ....v...#f^.^f
 *    8   ^..f....M.f..^      M: Mudford Toll
 *    9   ^.......#....f
 *   10   .v.....f#.f..^
 *   11   f...f^^fS.^.^f      S: Fort Steele
 *   12   .....^f^^^^^^.
 *   13   ....^.ff^^..f^
 * ```
 */
export const HUMAN_2_V7: MissionDefinitionV7 = {
  id: "HUMAN_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.19`, the second retune): a skirmish start
  // against Redcaps that march from round 4. Revision 4
  // (`pulp_wars-hmyk.25`, the fourth retune): two more Goblins in the
  // field, 4 Coins; a walled Fort Steele with three Fighters; 30 rounds.
  revision: 4,
  seed: 20261202,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 9,
    // The four villages on the road are the forts and Fort Steele; three in
    // the east would hand the Redcaps free towns behind their forts.
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
    ],
  },
  terrain: [
    ".ff....fff^.f.",
    ".....f.fffff..",
    ".........ff.ff",
    ".......fff.fff",
    ".......fffffff",
    "...f.....ff.ff",
    "..f.^....^f.^^",
    ".........f^.^f",
    "^..f......f..^",
    "^............f",
    ".......f..f..^",
    "f...f^^f..^.^f",
    ".....^f^^^^^^.",
    "....^.ff^^..f^",
  ],
  resources: [
    "r..eeer..g.rge",
    "e.......g.g...",
    ".r.er..e.gg.gg",
    "...eeee...r.g.",
    ".r...rr.g..g.g",
    "rr..rr...gg.gg",
    "e..r.re.r..e..",
    "..re....r.o.og",
    "oe..re.e.....o",
    "orerree...r...",
    "..rr..rg.....o",
    "..rego.g..o.og",
    ".er.ro.ooooo..",
    "rr.e...goo.e..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPPWWWWWW",
    "PPPPPPPPPWWWWW",
    "PPPPPPPPPWWWWW",
    "PPPPPPPPPHHHWW",
    "PPPPPPPPHHHHHW",
    "PPPPPPPHHHHHHH",
    "PPPPPPHHHHHHHH",
    "PPPPPHHHHHHHHH",
    "PPPPHHHHHHHHHH",
  ],
  villages: [
    { x: 1, y: 6 },
    { x: 4, y: 7 },
    { x: 1, y: 10 },
  ],
  treasureChests: [
    { x: 1, y: 1 },
    { x: 4, y: 4 },
  ],
  // </map>
  // The King's Road, from Kingsgate to Fort Steele.
  roads: [
    { x: 8, y: 4 },
    { x: 8, y: 6 },
    { x: 8, y: 7 },
    { x: 8, y: 9 },
    { x: 8, y: 10 },
  ],
  // The forts stand in the woods: their Lumber Camps feed them, since the
  // woods leave little Grass to farm.
  improvements: [
    { at: { x: 7, y: 1 }, improvement: "LUMBER_CAMP" },
    { at: { x: 7, y: 3 }, improvement: "LUMBER_CAMP" },
    { at: { x: 8, y: 3 }, improvement: "LUMBER_CAMP" },
    { at: { x: 9, y: 1 }, improvement: "LUMBER_CAMP" },
    { at: { x: 9, y: 3 }, improvement: "LUMBER_CAMP" },
    { at: { x: 7, y: 4 }, improvement: "LUMBER_CAMP" },
    { at: { x: 9, y: 4 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      // Retune 2 (`pulp_wars-hmyk.19`): a skirmish start. The Rangers are
      // disbanded: one fort, no technology, and the old Catapult nobody can
      // build again until Sawmilling. Retune 4: the fort is walled (level 3
      // with its land grant) and keeps three Fighters.
      coins: 5,
      technologies: [],
      cities: [
        {
          name: "Fort Steele",
          at: { x: 8, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 10 } },
        { role: "FIGHTER", at: { x: 7, y: 10 } },
        { role: "FIGHTER", at: { x: 9, y: 11 } },
        { role: "CATAPULT", at: { x: 9, y: 10 } },
      ],
      // The three forts' gates, and nothing else.
      reveal: {
        radius: 1,
        rects: [
          { x0: 8, y0: 8, x1: 8, y1: 8 },
          { x0: 8, y0: 5, x1: 8, y1: 5 },
          { x0: 8, y0: 2, x1: 8, y1: 2 },
        ],
      },
    },
    {
      // The Redcaps: Baron Kessler's goblin mercenaries.
      faction: "GOBLIN",
      coins: 4,
      technologies: ["DRILL"],
      cities: [
        {
          name: "Kingsgate",
          at: { x: 8, y: 2 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Halfway Toll",
          at: { x: 8, y: 5 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Mudford Toll",
          at: { x: 8, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      // The three holders first: a garrison is chosen by unit ID among the
      // units inside the forts, so each fort keeps exactly one of its own.
      units: [
        { role: "GUARD", at: { x: 8, y: 2 } },
        { role: "GUARD", at: { x: 8, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 8 }, home: 2 },
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 9, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 8 }, home: 2 },
        // Retune 4: two more Goblins, at Halfway and Kingsgate.
        { role: "FIGHTER", at: { x: 7, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 9, x1: 9, y1: 12 }] },
      // Step 2 is walls and Gang Up (hand play, CAMPAIGN.md section 15):
      // with Bomb Chuckers and Rocket Carts behind the walls, or with Orc
      // Brutes on Field Defenses (Defense 6.5 on a walled center), the
      // Redcaps turtled and the siege of the second fort was still going in
      // round 10; with Game and Fruit to harvest, Kingsgate reached level 5
      // and a Troll by round 4; and Wolf Riders, charging in pairs, killed
      // a Marksman a hit wherever the line had a gap. Mercenaries do not
      // farm and do not ride here: they field Goblins, which mob.
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
        "FORTIFICATION",
        "EXPLOSIVES",
        "CHIVALRY",
        "METALLURGY",
      ],
      // One Redcap holds each fort. The rest play their ordinary game for
      // three rounds, then from round 4 march on the nearest town of yours.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 7, y0: 1, x1: 9, y1: 3 },
            { x0: 7, y0: 4, x1: 9, y1: 6 },
            { x0: 7, y0: 7, x1: 9, y1: 9 },
          ],
          garrison: 3,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 7, y0: 1, x1: 9, y1: 3 },
            { x0: 7, y0: 4, x1: 9, y1: 6 },
            { x0: 7, y0: 7, x1: 9, y1: 9 },
          ],
          garrison: 3,
          others: { kind: "RUSH" },
        },
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
  landmarks: [
    { tag: "MUDFORD", at: { x: 8, y: 8 } },
    { tag: "HALFWAY", at: { x: 8, y: 5 } },
    { tag: "KINGSGATE", at: { x: 8, y: 2 } },
  ],
  // The three forts by round 30 (retune 4: lax for a conquest; the
  // thoughtful win took 26); the stars: by round 22, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["MUDFORD", "HALFWAY", "KINGSGATE"],
    byRound: 30,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 22 }, { kind: "KEEP_CITIES" }],
  },
};
