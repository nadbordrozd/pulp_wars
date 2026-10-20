import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_2` "Boats for Bones" (docs/product/SAGA.md section 3.3, G2; the
 * Goblin campaign, `pulp_wars-hmyk.8`). You lead Grubnak's crew from a
 * camp on the western downs to Wreckers' Cove, the only shipyard on the Lost
 * Sea shore, which the Unquiet (drowned sailors who walked ashore when the
 * bell rang) have taken over. Capture the cove by round 18. Step 2 of 6.
 *
 * The board is the map generator's (Pangea 14, seed 6): open downs above
 * the southern woods, peaks along the eastern cliffs. Your camp is on the
 * western downs; the Unquiet hold the cove on the south-western shore,
 * with Graves on its beach, and send their dead up the downs. The problem:
 * the dead are slow but rise again (a Zombie's bite raises its victim),
 * and a Bomb Chucker's bomb splashes every unit beside its target, goblins
 * included, so the bombs go in ahead of the mob, never into it.
 *
 * Hand play (the Goblin campaign's record in CAMPAIGN.md) set the board:
 * with the camp on the northern headland, ten rows from the cove, and a
 * second Unquiet town (a wreck camp) beside the cove, both towns put a
 * fresh Skeleton on their centres every turn and the crew never reached
 * the cove's centre in time.
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 19.4, NOT play
 * tested): a skirmish start. The camp is level 1 with Mogga and a Fighter,
 * no technology (no Bomb Chuckers until Hunting and Marksmanship are
 * learned) and 2 Coins; the two villages and the chest near the camp are
 * gone, and the map is unexplored. The cove has eight dead,
 * four of whom march on the camp from round 3, and two announced waves
 * (rounds 5 and 9) come up the beach. The clock is 14 rounds.
 *
 * ```text
 *      x 01234567890123
 * y  0   ~~~~~~~~~~~~~~
 *    1   ~~~.f..f.^~~~~
 *    2   ~~...$..f^^f~~      $: chests
 *    3   ~~....v^f^^^^~      v: villages
 *    4   ~..$.......^^~
 *    5   ~........f..f~
 *    6   ~..G..v..v.^v~      G: Gullcliff Camp, yours
 *    7   ~.f...f..^^^^~
 *    8   ~.fff...^^^^f~
 *    9   ~^.....f^^^^.~
 *   10   ~~x......f^^^~      x: Graves
 *   11   ~~fF.f....f.~~      F: the cove's farm
 *   12   ~~~W.x.f^.f~~~      W: Wreckers' Cove
 *   13   ~~~~~~~~~~~~~~
 * ```
 */
export const GOBLIN_2_V7: MissionDefinitionV7 = {
  id: "GOBLIN_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against a cove of eight that marches from round 3.
  revision: 3,
  seed: 20261502,
  // <map>
  size: 14,
  source: {
    mapType: "PANGEA",
    size: 14,
    seats: 2,
    seed: 6,
    // The camp and the cove stand on villages; the villages of the
    // southern shore would hand the dead free towns behind the cove.
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 9 }, present: false },
      // Retune 3: nothing free within reach of the camp.
      { kind: "VILLAGE", at: { x: 6, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 3 }, present: false },
      { kind: "CHEST", at: { x: 3, y: 4 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~",
    "~~~.f..f.^~~~~",
    "~~...f..f^^f~~",
    "~~.....^f^^^^~",
    "~..........^^~",
    "~........f..f~",
    "~..........^.~",
    "~.f...f..^^^^~",
    "~.fff...^^^^f~",
    "~^.....f^^^^.~",
    "~~f......f^^^~",
    "~~f..f....f.~~",
    "~~~.f.ff^.f~~~",
    "~~~~~~~~~~~~~~",
  ],
  resources: [
    "...s.......p..",
    "...e..r.eo.s..",
    "....r..e..o...",
    ".ser.r....ooos",
    "s.r.e..r.e..op",
    ".err.e.r.....s",
    ".r..r..e...o.s",
    "...eer...oo.o.",
    "s..gg..r..oo.s",
    "s...e.e..o.o..",
    ".s...e.e..ooo.",
    "...e.g..e.....",
    "......g.o..s..",
    "....sss.p.....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPHPPPP",
    "PPPPPPPPPHHHPP",
    "PPPPPPPPPHHHHP",
    "PPPPPPPPPHHHHP",
    "PPPPPPPPHHHHHP",
    "PPPPPPPPHHHHHP",
    "PPPPPPPPHHHHHP",
    "PPPPPPPPHHHHHP",
    "PWWWWWWWHHHHHP",
    "PPWWWWWWWHHHHP",
    "PPWWWWWWWWHHPP",
    "PPPWWWWWWWWPPP",
    "PPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 9, y: 6 },
    { x: 12, y: 6 },
  ],
  treasureChests: [{ x: 5, y: 2 }],
  // </map>
  // The cove's farm, on the fertile ground above the slipways.
  improvements: [{ at: { x: 3, y: 11 }, improvement: "FARM" }],
  // The drowned, on the beach and in the woods by the cove.
  graves: [
    { x: 2, y: 10 },
    { x: 5, y: 12 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Retune 3: a skirmish start. Mogga and a Fighter, no technology
      // (Bomb Chuckers come with Hunting and Marksmanship), 2 Coins.
      coins: 2,
      technologies: [],
      cities: [
        { name: "Gullcliff Camp", at: { x: 3, y: 6 }, level: 1, rewards: [] },
      ],
      units: [
        // Mogga the Ogre, who carries the powder.
        { role: "SWORDSMAN", at: { x: 3, y: 7 }, tag: "MOGGA" },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
      ],
      // The camp and the cove (the objective's place must be known); the
      // downs between are unexplored.
      reveal: { radius: 1, rects: [{ x0: 2, y0: 11, x1: 4, y1: 12 }] },
    },
    {
      // The Unquiet: drowned sailors, a Necromancer who reads the tide
      // tables, and the Zombies on the slipways.
      faction: "UNDEAD",
      // Retune 3: eight dead, 8 Coins and four techs.
      coins: 8,
      technologies: ["GATHERING", "FARMING", "HUNTING", "DRILL"],
      cities: [
        {
          name: "Wreckers' Cove",
          at: { x: 3, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      // The cove's four first: the garrison is chosen by unit ID among
      // the units inside the zone.
      units: [
        { role: "GUARD", at: { x: 3, y: 12 } },
        { role: "CAPTAIN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "GUARD", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 6, y: 11 } },
        { role: "FIGHTER", at: { x: 6, y: 10 } },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
        { role: "FIGHTER", at: { x: 5, y: 10 } },
      ],
      reveal: { radius: 2 },
      // Step 2 keeps to the lesson: one Necromancer, no Banshees, Liches,
      // Vampires, Wights or Ghouls, and no Zombies dug in on Field
      // Defenses.
      forbiddenTechnologies: [
        "ADMINISTRATION",
        "PLANNING",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SAWMILLING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // Four hold the cove; the rest raid up the coast from round 3.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
          garrison: 4,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
          garrison: 4,
          others: { kind: "RUSH" },
        },
      ],
    },
  ],
  // Two shifts more come up the beach.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 9 } },
        { role: "GUARD", at: { x: 6, y: 9 } },
      ],
      line: "Another tide of drowned men walks up the beach, dripping.",
      announce: true,
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "CAPTAIN", at: { x: 5, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 7, y: 8 } },
        { role: "GUARD", at: { x: 4, y: 9 } },
      ],
      line: "The second shift clocks on, with a Necromancer who is late.",
      announce: true,
    },
  ],
  // The Lost Sea is for the next mission.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "WRECKERS_COVE", at: { x: 3, y: 12 } }],
  // Take the cove by round 14 (it was 18). The stars: by round 12, and no
  // city lost.
  objective: {
    kind: "CAPTURE",
    places: ["WRECKERS_COVE"],
    byRound: 14,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
