import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_5` "The Ember Lodge" (docs/product/SAGA.md section 3.7, I5; the
 * Ice Folk campaign, `pulp_wars-hmyk.10`). The Grey Lodge keeps the mountain
 * warm with a bonfire three hundred years old, and the Redcaps feed it with
 * every tree for miles: take the Ember Lodge by round 22 and put the fire
 * out. Step 5 of 6. A walled temple on a shoulder of the mountain, a
 * Horror on its doorstep, and a goblin horde rushing out of the
 * charcoal woods. A city of level 5 gives a Frost Giant, whose blow from
 * the next tile shatters a Frozen enemy left with 8 HP or less and freezes
 * every enemy round it; Yetis walk straight over the peaks to the Lodge's
 * walls.
 *
 * The board is the map generator's (Dry Land 16, three seats, seed 5): the
 * snowfields in the north, the Highlands below them, the Ember Lodge in
 * the peaks of the south-east, the Redcaps' charcoal camps in the western
 * woods.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   .fv...v........f      v: villages
 *    2   ..........H...v.      H: Hoarfrost Camp
 *    3   f.........f.f..f
 *    4   ^.x............f      x: the Rift
 *    5   .^x^^...v..v..v^
 *    6   f.x.^^..ff^f.ff.
 *    7   ffff.^^fff....f^
 *    8   ffff^f^.f.^....^
 *    9   fcf.f.^.^f^^c..f      c: treasure chests
 *   10   ffR....^f.^^^..^      R: the Redcaps' charcoal camp
 *   11   fff.^C..^fE^^^ff      C: the Cinder Pit; E: the Ember Lodge
 *   12   fff.f.^^^^f.^^.f
 *   13   ffff.f^^^^ff^^..
 * ```
 */
export const ICE_FOLK_5_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_5",
  revision: 1,
  seed: 20261605,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 3,
    seed: 5,
    // The Cinder Pit stands on a village; the villages round the Lodge and
    // in the southern woods are gone (each would be a free town for the
    // Lodge or the Redcaps).
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 14 }, present: false },
      // The game round the Lodge is gone (hand play: hunted, it grew the
      // Lodge to level 5).
      { kind: "RESOURCE", at: { x: 9, y: 11 }, resource: "." },
      { kind: "RESOURCE", at: { x: 10, y: 12 }, resource: "." },
    ],
  },
  terrain: [
    "....^.fff.....^.",
    ".f.............f",
    "................",
    "f.........f.f..f",
    "^.x............f",
    ".^x^^.....^....^",
    "f.x.^^..ff^f.ff.",
    "ffff.^^fff....f^",
    "ffff^f^.f.^....^",
    "fff.f.^.^f^^f..f",
    "ff.....^f.^^^..^",
    "fff.^...^f.^^^ff",
    "fff.f.^^^^f.^^.f",
    "ffff.f^^^^ff^^..",
    ".f....^^^^f.^^.f",
    "..f...^^^..^^^.^",
  ],
  resources: [
    "..er.eg..rr..e.e",
    "e..err....e..re.",
    ".re.err.re.r.r..",
    ".r..e.r..rg.gee.",
    "o...e..e.eer.r.g",
    ".o..........e..o",
    ".....o....og.ggr",
    ".ggg.oo..g..r.go",
    "ggggo.o...o..r.o",
    "......o...oo.r..",
    "gg...e.o..oo...o",
    ".g.eo...o..ooogg",
    ".g..g.oo.o..oo..",
    "ggg...o.o...oo..",
    "...er.oooo...o.g",
    ".r...rooo..o.oe.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 6, y: 1 },
    { x: 14, y: 2 },
    { x: 8, y: 5 },
    { x: 11, y: 5 },
    { x: 14, y: 5 },
  ],
  improvements: [
    // Hoarfrost Camp's farms.
    { at: { x: 10, y: 1 }, improvement: "FARM" },
    { at: { x: 9, y: 2 }, improvement: "FARM" },
    // The Lodge's mines in the peaks round it.
    { at: { x: 10, y: 10 }, improvement: "MINE" },
    { at: { x: 11, y: 10 }, improvement: "MINE" },
  ],
  treasureChests: [
    { x: 1, y: 9 },
    { x: 12, y: 9 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 6,
      // Leadership, Sleds, Snow Hunters, Deep Winter (the Musk Ox) and
      // Brittle (Breach, and Shatter at 4).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "Hoarfrost Camp",
          at: { x: 10, y: 2 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 10, y: 3 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 10, y: 2 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "FIGHTER", at: { x: 11, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 4 } },
        { role: "MARKSMAN", at: { x: 9, y: 2 } },
        { role: "RAIDER", at: { x: 11, y: 2 } },
      ],
      // The mountain's shoulder, as seen from the snowfields. A Workshop
      // and the camp's harvests make it level 5 (a Frost Giant) in round 1.
      reveal: { radius: 2, rects: [{ x0: 7, y0: 4, x1: 13, y1: 12 }] },
    },
    {
      // The Grey Lodge at the Ember Lodge.
      faction: "CULT",
      coins: 0,
      // Enough Favour for an Imp (hand play: with 6 the Summoners called a
      // Horror and an Imp in round 1, and a Horror nearly every round after
      // on the Favour of what they killed).
      favour: 2,
      // Leadership (the Summoner: Imps and Horrors) and Hexers. Hand play:
      // with Crafting, Engineering and the game round the Lodge it grew a
      // level a round, and at level 5 raised two Things in the Cellar; the
      // Lodge stays level 3, and its doorstep daemon is a Horror.
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING", "MARKSMANSHIP"],
      cities: [
        {
          name: "The Ember Lodge",
          at: { x: 10, y: 11 },
          // Hand play: at level 4 with four Mines it reached level 5 in
          // round 2 and raised two Things in the Cellar.
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // The keepers of the fire: two Summoners side by side, Idol
        // Bearers at the door, Hexers on the walls.
        { role: "GUARD", at: { x: 10, y: 11 } },
        { role: "CAPTAIN", at: { x: 9, y: 11 } },
        { role: "CAPTAIN", at: { x: 9, y: 10 } },
        { role: "GUARD", at: { x: 10, y: 12 } },
        { role: "MARKSMAN", at: { x: 11, y: 12 } },
        { role: "MARKSMAN", at: { x: 8, y: 10 } },
        { role: "FIGHTER", at: { x: 9, y: 9 } },
      ],
      // The slope below the Lodge (hand play: with the whole mountain known
      // the Lodge earned the Explorer monument, reached level 5 in round 2
      // and raised two Things in the Cellar).
      reveal: { radius: 2, rects: [{ x0: 8, y0: 4, x1: 12, y1: 9 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
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
      // The Lodge's keepers hold the shoulder round the fire.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 8, y0: 9, x1: 12, y1: 12 }],
        garrison: 7,
      },
    },
    {
      // The Redcaps, out of work since the Baron's war, burning charcoal.
      faction: "GOBLIN",
      coins: 2,
      technologies: ["SCOUTING"],
      cities: [
        {
          name: "Charcoal Camp",
          at: { x: 2, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "The Cinder Pit", at: { x: 5, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 10 } },
        { role: "FIGHTER", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "RAIDER", at: { x: 4, y: 10 } },
        { role: "RAIDER", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 10 }, home: 1 },
        { role: "GUARD", at: { x: 5, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 0, x1: 14, y1: 6 }] },
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
      // They rush the snowfield camp.
      directive: { kind: "RUSH" },
    },
  ],
  teams: [0, 1, 1],
  // The Redcaps bring up more wood-cutters in rounds 5 and 10.
  reinforcements: [
    {
      seat: 2,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 3, y: 7 } },
      ],
    },
    {
      seat: 2,
      round: 10,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 3, y: 7 } },
      ],
    },
  ],
  landmarks: [{ tag: "EMBER_LODGE", at: { x: 10, y: 11 } }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Ember Lodge by round 22. The stars: by round 18, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["EMBER_LODGE"],
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
