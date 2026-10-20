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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): a skirmish start. Hoarfrost Camp alone at level 2 with
 * Mother Rime, a Fighter and the one Guard nobody can train yet, no
 * technology, 3 Coins, the Lodge unseen but for its door. The Lodge is
 * walled at level 3 with ten keepers (eight stay, two hunt), Favour 4 and
 * the Familiars' craft, and a shift of four more arrives in round 8; the
 * Redcaps have a level 2 camp, twelve wood-cutters, 5 Coins, rush from
 * round 1 and send three announced waves in rounds 3, 6 and 9. The clock
 * is 18 (was 22).
 */
export const ICE_FOLK_5_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_5",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against a fortified Lodge and a rushing horde.
  revision: 3,
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
      // Retune 3: the villages of the snowfield are gone too.
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 1 }, present: false },
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
  villages: [{ x: 2, y: 1 }],
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
      // Retune 3: a skirmish start. One camp at level 2, Mother Rime, a
      // Fighter and a Guard nobody can train yet, no technology.
      coins: 3,
      technologies: [],
      cities: [
        {
          name: "Hoarfrost Camp",
          at: { x: 10, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 10, y: 3 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 10, y: 2 } },
        { role: "GUARD", at: { x: 10, y: 4 } },
      ],
      // The camp and the Lodge's door, and nothing else.
      reveal: { radius: 2, rects: [{ x0: 10, y0: 11, x1: 10, y1: 11 }] },
    },
    {
      // The Grey Lodge at the Ember Lodge.
      faction: "CULT",
      coins: 4,
      // Enough Favour for an Imp (hand play: with 6 the Summoners called a
      // Horror and an Imp in round 1, and a Horror nearly every round after
      // on the Favour of what they killed).
      favour: 4,
      // Leadership (the Summoner: Imps and Horrors), Hexers and, in retune
      // 3, the Familiars' craft (Scouting). Hand play:
      // with Crafting, Engineering and the game round the Lodge it grew a
      // level a round, and at level 5 raised two Things in the Cellar; the
      // Lodge stays level 3, and its doorstep daemon is a Horror.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
      ],
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
        // Retune 3: three more keepers.
        { role: "GUARD", at: { x: 10, y: 13 } },
        { role: "MARKSMAN", at: { x: 11, y: 13 } },
        { role: "RAIDER", at: { x: 10, y: 14 } },
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
      // Retune 3: eight keepers hold the shoulder round the fire; the other
      // two hunt the snowfield from round 1.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 8, y0: 9, x1: 12, y1: 12 }],
        garrison: 8,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Redcaps, out of work since the Baron's war, burning charcoal.
      faction: "GOBLIN",
      coins: 5,
      technologies: ["SCOUTING"],
      cities: [
        {
          name: "Charcoal Camp",
          at: { x: 2, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Cinder Pit",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
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
        // Retune 3: four more wood-cutters.
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 12 }, home: 1 },
        { role: "RAIDER", at: { x: 3, y: 12 } },
        { role: "GUARD", at: { x: 4, y: 9 } },
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
  // Retune 3: the Redcaps bring up more wood-cutters in rounds 3, 6 and 9,
  // and the Lodge changes its shift in round 8.
  reinforcements: [
    {
      seat: 2,
      round: 3,
      line: "A Redcap shift comes off the charcoal woods with axes and a bad attitude.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 3, y: 7 } },
        { role: "FIGHTER", at: { x: 4, y: 7 } },
      ],
    },
    {
      seat: 2,
      round: 6,
      line: "More Redcaps. The fire is hungry and so are they.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 3, y: 7 } },
        { role: "RAIDER", at: { x: 4, y: 7 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      line: "The Lodge changes its shift: four fresh keepers and a lit lantern.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 9, y: 11 } },
        { role: "MARKSMAN", at: { x: 11, y: 12 } },
        { role: "FIGHTER", at: { x: 9, y: 10 } },
        { role: "MARKSMAN", at: { x: 8, y: 10 } },
      ],
    },
    {
      seat: 2,
      round: 9,
      line: "The last of the Redcaps come out of the trees, all at once, shouting.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "RAIDER", at: { x: 4, y: 7 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
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
  // The Ember Lodge by round 18. The stars: by round 14, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["EMBER_LODGE"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
