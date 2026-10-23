import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_2` "The Drowned Library" (docs/product/SAGA.md section 3.2, U2;
 * the Undead campaign, `pulp_wars-hmyk.5`). You hold the drowned Abbey of
 * Saint Ashes, an island in a lake, for 14 rounds while Doctor Crane (a
 * tagged Necromancer) reads the Marquis's diary, against the Bonepicker
 * goblins. Step 2 of 6: a hold-out. Goblins come in mobs and blow up
 * beside you, and the dead heal only inside their own borders; a
 * Banshee's Wail hurts every living enemy near it and leaves the
 * survivors unable to strike back for the rest of the turn, which is when
 * the dead counter-attack.
 *
 * The board is the map generator's (Lakes 14, seed 22). The abbey stands
 * on the island in the great lake, walled in by peaks; the only way onto
 * it on foot is the causeway in the south-east. Your landing is on the
 * western shore. The Bonepickers camp on the eastern and southern shores
 * and assault the abbey from the first round (`ASSAULT`, then `RUSH` from
 * round 9); more of them come up from the lakeshore in rounds 4, 7 and
 * 10, the second band against the landing. The Naval branch is forbidden,
 * so nobody sails the lake; the goblins have Engineering and climb the peaks.
 *
 * Hand play (CAMPAIGN.md section 16) set the numbers: with only the
 * causeway the goblins sat at its foot and never attacked, so they climb;
 * their camps are level 1 with no ore and no growth technologies (Mines and
 * a Workshop took a camp to level 4 in four rounds, a reward unit a
 * level).
 *
 * Retune 2 (`pulp_wars-hmyk.20`) restored the bible's 14 rounds with six
 * waves, both towns at level 1, three coins and Crane, the Marquis, two
 * Banshees, a Zombie and two Skeletons; the goblins have no coins and no
 * Fortification (a camp trained a Brute a turn), so only the Brutes in the
 * waves and the start are Brutes.
 *
 * Retune 4 (`pulp_wars-hmyk.26`) moves the strength into the start: the
 * clan has four coins, two more Brutes and its Ogre, Old Gutbucket, beside
 * the causeway, and only three bands come up the shore (rounds 4, 7 and
 * 10). The hold stays 14 rounds.
 *
 * ```text
 *      x 01234567890123
 * y  0   f^.f.f..^f...^
 *    1   .f..ffv^fv$..^      v: villages; $: treasure chests
 *    2   ^^^.^..fff^^.f
 *    3   ..f~~~~~~~~...
 *    4   ...~~~~~~~~^^.
 *    5   fvf~~~~~Af^^^.      A: the Abbey of Saint Ashes
 *    6   f.f~~~.^f^^^Bf      B: Bonepicker Camp
 *    7   ..f~~~^~ff^^.f
 *    8   .L.v...~^^.ff.      L: Ashwater Landing; the causeway: 10,8
 *    9   ...~~~~~.f...^
 *   10   ...~~~~~~^..^^
 *   11   .....f.^f^f.^^
 *   12   ..f..$.f^G^^.^      G: Gnawbone
 *   13   .f.ff.f.^^^.^f
 * ```
 */
export const UNDEAD_2_V7: MissionDefinitionV7 = {
  id: "UNDEAD_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.20`, retune 2): fourteen days, waves
  // every other round, a thin garrison, no Fortification for the goblins.
  // Revision 4 (`pulp_wars-hmyk.26`, retune 4): a strong clan at the
  // causeway, three waves.
  revision: 4,
  seed: 20261302,
  // <map>
  size: 14,
  source: {
    mapType: "LAKES",
    size: 14,
    seats: 2,
    seed: 22,
    // The two goblin camps stand on villages; the villages round the
    // causeway and the eastern shore would hand the Bonepickers more camps
    // beside the island.
    edits: [
      { kind: "VILLAGE", at: { x: 12, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 12 }, present: false },
      // No ore by the goblin camps (hand play: Mines and a Workshop raised
      // Bonepicker Camp to level 4 by round 4, and it sent a reward unit a
      // level).
      { kind: "RESOURCE", at: { x: 11, y: 6 }, resource: "." },
      { kind: "RESOURCE", at: { x: 11, y: 7 }, resource: "." },
      { kind: "RESOURCE", at: { x: 10, y: 12 }, resource: "." },
      // Retune 2 (`pulp_wars-hmyk.20`): the north-shore villages would be
      // a goblin camp behind the abbey, Shroudby a free town by the
      // landing.
      { kind: "VILLAGE", at: { x: 9, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 1 }, present: false },
      { kind: "CHEST", at: { x: 10, y: 1 }, present: false },
    ],
  },
  terrain: [
    "f^.f.f..^f...^",
    ".f..ff.^f.f..^",
    "^^^.^..fff^^.f",
    "..f~~~~~~~~...",
    "...~~~~~~~~^^.",
    "f.f~~~~~.f^^^.",
    "f.f~~~.^f^^^.f",
    "..f~~~^~ff^^.f",
    ".......~^^.ff.",
    "...~~~~~.f...^",
    "...~~~~~~^..^^",
    ".....f.^f^f.^^",
    "..f....f^.^^.^",
    ".f.ff.f.^^^.^f",
  ],
  resources: [
    "..rg.g.eog.reo",
    "..e.g..o....eo",
    ".......g.goo.g",
    "..g.p.pp.p...r",
    ".....p.....o..",
    "..g...........",
    ".e.....ogoo...",
    ".r.s..o...o..g",
    "..e...esoo....",
    "..e..s...gr..o",
    "eres.........o",
    ".ee.r..o....oo",
    "...r..........",
    "e..g.e...oo.og",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWWWWHHHH",
    "WWWWWWWWWHHHHH",
    "WWWWWWWWHHHHHH",
    "WWWPPPPPPPPHHH",
    "WWWPPPPPPPPHHH",
    "WWWPPPPPHHHHHH",
    "PPPPPPHHHHHHHH",
    "PPPPPPHPHHHHHH",
    "PPPPHHHPHHHHHH",
    "PPPPPPPPHHHHHH",
    "PPPPPPPPPHHHHH",
    "PPPPPPPHHHHHHH",
    "PPPPPPPHHHHHHH",
    "PPPPPPPHHHHHHH",
  ],
  villages: [{ x: 1, y: 5 }],
  treasureChests: [{ x: 5, y: 12 }],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 3,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "ENGINEERING",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Saint Ashes",
          at: { x: 8, y: 5 },
          level: 1,
          rewards: [],
        },
        {
          name: "Ashwater Landing",
          at: { x: 1, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Doctor Crane, reading in the abbey with a lantern and tongs.
        { role: "CAPTAIN", at: { x: 8, y: 5 }, tag: "CRANE" },
        // The Ashen Marquis.
        { role: "KNIGHT", at: { x: 9, y: 7 }, tag: "MARQUIS" },
        { role: "MARKSMAN", at: { x: 8, y: 6 } },
        { role: "MARKSMAN", at: { x: 8, y: 7 } },
        { role: "GUARD", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 1, y: 8 }, home: 1 },
      ],
      reveal: { radius: 1 },
    },
    {
      // The Bonepicker clan, who use the abbey's bell tower as a lair.
      faction: "GOBLIN",
      coins: 4,
      // Engineering: the goblins climb the peaks round the abbey. No
      // Fortification (retune 2): a camp trained a Brute a turn.
      technologies: ["DRILL", "ENGINEERING"],
      cities: [
        {
          name: "Bonepicker Camp",
          at: { x: 12, y: 6 },
          level: 1,
          rewards: [],
        },
        { name: "Gnawbone", at: { x: 9, y: 12 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 8 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "GUARD", at: { x: 13, y: 8 } },
        { role: "GUARD", at: { x: 11, y: 6 } },
        // The clan's Ogre, Old Gutbucket.
        { role: "SWORDSMAN", at: { x: 11, y: 7 } },
        { role: "RAIDER", at: { x: 13, y: 7 } },
        { role: "FIGHTER", at: { x: 9, y: 12 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 11 }, home: 1 },
        { role: "GUARD", at: { x: 9, y: 11 }, home: 1 },
      ],
      reveal: {
        radius: 1,
        rects: [
          { x0: 7, y0: 4, x1: 9, y1: 7 },
          { x0: 0, y0: 7, x1: 3, y1: 9 },
        ],
      },
      // Step 2: Goblins and Orc Brutes, a Bomb Chucker only in a wave; no
      // Wolf Riders, Rocket Carts, Scrap Buggies, Ogres or Breach, and no
      // farms, lumber camps or growth (hand play: Mines, a Workshop and a
      // monument raised Bonepicker Camp to level 4 in two rounds, a reward
      // Wolf Rider a level).
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
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      directive: [
        { kind: "ASSAULT", target: { x: 8, y: 5 }, untilRound: 9 },
        { kind: "RUSH" },
      ],
    },
  ],
  // Retune 4 (`pulp_wars-hmyk.26`): the clan starts strong and three
  // bands come up from the lakeshore: the north shore in round 4, the
  // landing in round 7, the causeway in round 10.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      line: "The Bonepickers come round the north shore, picking as they go.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 1 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "RAIDER", at: { x: 12, y: 2 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      line: "A band wades ashore at the landing, where nobody thought to build a wall.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "FIGHTER", at: { x: 1, y: 11 } },
        { role: "GUARD", at: { x: 4, y: 11 } },
      ],
    },
    {
      seat: 1,
      round: 10,
      line: "The clan sends its Brutes up the causeway. The Marquis sighs.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 10 } },
        { role: "MARKSMAN", at: { x: 13, y: 9 } },
      ],
    },
  ],
  // Nobody sails the lake.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "SAINT_ASHES", at: { x: 8, y: 5 } }],
  // Fourteen rounds, and the abbey and Doctor Crane must not fall. The
  // stars: no city lost, and the Marquis lives.
  objective: {
    kind: "SURVIVE",
    rounds: 14,
    protect: [{ place: "SAINT_ASHES" }, { unit: "CRANE" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "MARQUIS" }],
  },
};
