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
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (a skirmish start against a cove of eight and two
 * waves): the camp is level 2 with Hunting and Marksmanship (Bomb
 * Chuckers), 5 Coins, Mogga, two Goblins and a Chucker, and the village on
 * the downs is back. The dead have seven: a Wight (Rise Again) holds the
 * cove with its Zombies, Skeleton and the Necromancer, and two Skeletons
 * march from round 4 (a rushing Wight, inspired, killed Mogga in two of
 * two attempts). No waves; a lax 20-round clock.
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
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): a Wight holds the
  // cove, no waves, a lax clock.
  revision: 4,
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
      // Retune 3 took the villages and the chest near the camp; retune 4
      // gives back the village on the downs east of the camp.
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
    { x: 6, y: 6 },
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
      // Retune 4: a level 2 camp, Mogga, two Goblins and a Bomb Chucker,
      // Hunting and Marksmanship, 5 Coins.
      coins: 5,
      technologies: ["HUNTING", "MARKSMANSHIP"],
      cities: [
        {
          name: "Gullcliff Camp",
          at: { x: 3, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mogga the Ogre, who carries the powder.
        { role: "SWORDSMAN", at: { x: 3, y: 7 }, tag: "MOGGA" },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
        { role: "MARKSMAN", at: { x: 2, y: 6 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
      ],
      // The camp and the cove (the objective's place must be known); the
      // downs between are unexplored.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 11, x1: 4, y1: 12 }] },
    },
    {
      // The Unquiet: drowned sailors, a Necromancer who reads the tide
      // tables, and the Zombies on the slipways.
      faction: "UNDEAD",
      // Retune 4: seven dead, 5 Coins, Gathering and Hunting.
      coins: 5,
      technologies: ["GATHERING", "HUNTING"],
      cities: [
        {
          name: "Wreckers' Cove",
          at: { x: 3, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      // The cove's five first (the Wight among them): the garrison is
      // chosen by unit ID among the units inside the zone.
      units: [
        { role: "GUARD", at: { x: 3, y: 12 } },
        { role: "CAPTAIN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "GUARD", at: { x: 2, y: 11 } },
        { role: "SWORDSMAN", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 6, y: 11 } },
        { role: "FIGHTER", at: { x: 6, y: 10 } },
      ],
      reveal: { radius: 2 },
      // Step 2 keeps to the lesson: one Necromancer, the one Wight it starts
      // with, no Banshees, Liches, Vampires or Ghouls, and no Zombies dug in
      // on Field Defenses.
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
      // Five hold the cove; the rest raid up the coast from round 4.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
          garrison: 5,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 10, x1: 4, y1: 12 }],
          garrison: 5,
          others: { kind: "RUSH" },
        },
      ],
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
  // Take the cove by round 20 (retune 4: lax). The stars: by round 14, and
  // no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["WRECKERS_COVE"],
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
