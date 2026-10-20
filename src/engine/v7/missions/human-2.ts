import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_2` "The Lord Protector's Writ" (docs/product/SAGA.md section 3.1,
 * H2; `pulp_wars-hmyk.4`). You lead the Humans against the Redcaps, Baron
 * Kessler's goblin mercenaries, on a dry 14 x 14 board, and take back the
 * three walled toll forts on the King's Road by round 18. Step 2 of 6.
 *
 * The board is the map generator's (Dry Land 14, seed 9): open plains in
 * the west, wooded hills in the east, and a line of villages north to south
 * that the King's Road joins. Fort Steele stands at the southern end of the
 * road; the three toll forts stand on it, three tiles apart, the Redcaps'
 * capital, Kingsgate, at the far end. Each fort keeps one of its own at
 * home; from round 6 every other Redcap marches on your nearest town. The
 * problem: walls and Gang Up. Marksmen and the Catapult crack a wall; an
 * army that advances in a block gives the Redcaps no lone unit to mob.
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
 *   10   .v..t..f#.f..^      t: Haywick, your town
 *   11   f...f^^fS.^.^f      S: Fort Steele
 *   12   .....^f^^^^^^.
 *   13   ....^.ff^^..f^
 * ```
 */
export const HUMAN_2_V7: MissionDefinitionV7 = {
  id: "HUMAN_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
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
      coins: 6,
      // Fortification is in hand, so Explosives' Breach (melee that
      // ignores Walls) is one technology away.
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Steele",
          at: { x: 8, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        { name: "Haywick", at: { x: 4, y: 10 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 10 } },
        { role: "FIGHTER", at: { x: 7, y: 10 }, home: 1 },
        { role: "MARKSMAN", at: { x: 9, y: 10 } },
        { role: "MARKSMAN", at: { x: 8, y: 11 } },
        { role: "CATAPULT", at: { x: 9, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 10 }, home: 1 },
      ],
      // The road and its three forts.
      reveal: { radius: 2, rects: [{ x0: 7, y0: 1, x1: 9, y1: 10 }] },
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
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
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
        // The field army, camped between the forts.
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
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
      // five rounds, then march on the nearest town of yours.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 7, y0: 1, x1: 9, y1: 3 },
            { x0: 7, y0: 4, x1: 9, y1: 6 },
            { x0: 7, y0: 7, x1: 9, y1: 9 },
          ],
          garrison: 3,
          untilRound: 6,
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
  // The three forts by round 18; the stars: by round 14, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["MUDFORD", "HALFWAY", "KINGSGATE"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
