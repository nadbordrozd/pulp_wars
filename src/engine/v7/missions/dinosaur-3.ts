import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_3` "The Sea Road" (docs/product/SAGA.md section 3.5, DN3; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs, who have never needed to sail, across the Lost Sea after the
 * eggs: she must come within a tile of Big Top Bay on the mainland's
 * north-eastern shore by round 22, crossing embarked. Step 3 of 6: a
 * transport carrying your best unit is the weakest thing on the sea, so
 * the lane is cleared first. A Dugout rams harder after a run of two tiles
 * (Horned Prows), a Plesiosaur torpedoes unanswered and grows; War Rafts
 * are yours to research.
 *
 * The board is the map generator's (Archipelago 16, seed 9): the island
 * in the west with Fernmaw on its northern bay and the Crater inland; a
 * channel of open sea with the Baron's fort, Gullrock, on an islet at its
 * northern mouth (joined to the island by a diagonal step); the mainland
 * in the east, with Kessler's Wharf on its western shore and Big Top Bay,
 * a fishing village, on its north-east; the old Sea Serpent in the deep
 * water south of the channel (E1, mission curiosities). The Baron's last
 * warships are a blockade, not a navy: the Baron learns nothing, so his
 * Battleship, Submarine and two Patrol Boats keep to the shallows (no
 * Navigation), the Battleship's guns covering the whole
 * northern lane. His landing parties come ashore on the island's western
 * beaches in rounds 4, 8 and 12. Gullrock's garrison holds the islet
 * (`GUARD`) and the rest of his men hunt you (`others: RUSH`).
 *
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start thin (Fernmaw
 * alone, four technologies, 3 Coins, the Queen, a boat and a Fighter, only
 * the far shore seen), the village and chest by Fernmaw are gone, the
 * Baron is richer (12 Coins, Drill and Walls, two more
 * Patrol Boats and a second Submarine) and five announced waves land (four
 * landings and a gunboat flotilla) on an 18-round clock.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * numbers: with Hunting, Drill and the naval tree Gullrock and the Wharf
 * grew two levels a turn on fish, pearls, Ports and Workshops, took Big
 * Top Bay and launched a Patrol Boat a turn; Gullrock's pearls, fruit and
 * fish are gone.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~~~~~~~~~~~~~
 *    2   ~~.~~~~~~~~~~~~~
 *    3   f~v.~~G~~~f~fB~~      G: Gullrock; B: Big Top Bay; v: villages
 *    4   ~~f.P~.~~~.~.f.f      P: Fernmaw's Port
 *    5   .f.F..~~~~~^^ff.      F: Fernmaw
 *    6   f...f~~~~~~~^f..
 *    7   ...ff.~~~~f^..ff
 *    8   .$..~^~~~f~Wf.ff      W: Kessler's Wharf; $: treasure chests
 *    9   ^fC..~~~~~~fff..      C: the Crater
 *   10   .f..~.~~~f.ffff^
 *   11   ^^v~fv~~~..fff$~
 *   12   ~~~~..~~~~~~f.~.
 *   13   f~^..~~~@~~~~~~f      @: the Sea Serpent
 *   14   ~~~~~~~~~~~~~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_3_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a thin start (Fernmaw
  // alone, four technologies, three units, 3 Coins), a blind crossing, a
  // richer Baron and five announced waves.
  revision: 3,
  seed: 20261403,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 2,
    seed: 9,
    // The mainland's other villages would hand the Wharf more towns.
    edits: [
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 11 }, present: false },
      // Gullrock is a fort, not a town: no pearls, fruit or fish round it.
      { kind: "RESOURCE", at: { x: 5, y: 2 }, resource: "." },
      { kind: "RESOURCE", at: { x: 5, y: 4 }, resource: "." },
      { kind: "RESOURCE", at: { x: 6, y: 4 }, resource: "." },
      // Retune 3: the village and the chest beside Fernmaw are gone.
      { kind: "VILLAGE", at: { x: 2, y: 3 }, present: false },
      { kind: "CHEST", at: { x: 1, y: 8 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~.~~~~~~~~~~~~~",
    "f~..~~.~~~f~f.~~",
    "~~f.~.~~~~.~.f.f",
    ".f....~~~~~^^ff.",
    "f...f~~~~~~~^f..",
    "...ff.~~~~f^..ff",
    "....~^~~~f~.f.ff",
    "^f...~~~~~~fff..",
    ".f..~.~~~f.ffff^",
    "^^.~f.~~~..fff.~",
    "~~~~..~~~~~~f.~.",
    "f~^..~~~~~~~~~~f",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "p...p.p..pp.....",
    "..s.............",
    "s.rp.....p......",
    "g..r.....sgs..s.",
    "s...........e..g",
    "r.e.rr...p.o.g..",
    ".e.r.pp.........",
    ".r......psgoeegg",
    "..ersos..g...e..",
    "og.re..p...g....",
    "rgees..pp.egg...",
    "oo.s.....e..gg..",
    ".psseep.....g...",
    ".sor.s....p...s.",
    ".p..s...p...p..s",
    "..p......p.p....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPWPWWPP",
    "PPPPPPPPPPWPWWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPPWWWW",
    "HPPPPPPPPPWWWWWW",
    "HHPPPPPPPWPWWWWW",
    "HHPPPPPPPPPWWWWW",
    "HHPPPPPPPPWWWWWW",
    "HHPPPPPPPPPWWWWP",
    "PPPPPPPPPPPPWWPW",
    "HPHHPPPPPPPPPPPW",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 13, y: 3 },
    { x: 2, y: 11 },
    { x: 5, y: 11 },
  ],
  treasureChests: [{ x: 14, y: 11 }],
  // </map>
  improvements: [
    // Fernmaw's Port on its northern bay and the Wharf's.
    { at: { x: 4, y: 4 }, improvement: "PORT" },
    { at: { x: 10, y: 8 }, improvement: "PORT" },
  ],
  // The old serpent of the deep water south of the channel.
  curiosities: [{ kind: "SEA_SERPENT", at: { x: 8, y: 13 } }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3: thin. Fernmaw alone (the Crater is gone), Hunting and
      // the sea technologies only, 3 Coins, three units, and the lane
      // unseen but for the far shore.
      coins: 3,
      technologies: ["HUNTING", "SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      cities: [
        {
          name: "Fernmaw",
          at: { x: 3, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex, who must cross the sea.
        { role: "KNIGHT", at: { x: 3, y: 4 }, tag: "OLD_QUEEN" },
        { role: "PATROL_BOAT", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
      ],
      // Big Top Bay, and the water round Fernmaw.
      reveal: {
        radius: 2,
        rects: [{ x0: 12, y0: 2, x1: 14, y1: 4 }],
      },
    },
    {
      // The Baron's last warships, Gullrock fort and Kessler's Wharf.
      faction: "ORIGINAL",
      // Retune 3: 12 Coins and Hunting, Marksmanship, Drill and Walls (his
      // ships still keep to the shallows: no Navigation).
      coins: 12,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Gullrock",
          at: { x: 6, y: 3 },
          level: 1,
          rewards: [],
        },
        {
          name: "Kessler's Wharf",
          at: { x: 11, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 3 } },
        // The fleet keeps to the shallows (no Navigation): the
        // Battleship over the northern lane, the Submarine off Big Top
        // Bay, the Patrol Boats by Gullrock (hand play: free to sail, the
        // Battleship shelled Fernmaw's port in round 2).
        { role: "BATTLESHIP", at: { x: 9, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 4 }, home: 1 },
        { role: "SUBMARINE", at: { x: 11, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 11, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 8 }, home: 1 },
        // Retune 3: a second Submarine, two more Patrol Boats and men for
        // the landings.
        { role: "SUBMARINE", at: { x: 5, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 5 }, home: 1 },
        { role: "PATROL_BOAT", at: { x: 6, y: 2 } },
        { role: "MARKSMAN", at: { x: 12, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 7 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 2, x1: 5, y1: 7 }] },
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
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // Gullrock's garrison holds the islet; the rest hunt you.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 6, y0: 3, x1: 6, y1: 3 }],
        garrison: 1,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The Baron's landing parties on the island's western shore, in rounds
  // 3, 6, 9 and 12, for Fernmaw, and a pair of Patrol Boats and a
  // Submarine for the lane in round 7; every wave announced (retune 3:
  // three landings, rounds 4, 8 and 12, and no ships).
  reinforcements: [
    {
      seat: 1,
      round: 3,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "MARKSMAN", at: { x: 0, y: 6 } },
      ],
      line: "Redcoats wade ashore with fixed bayonets.",
      announce: true,
    },
    {
      seat: 1,
      round: 6,
      units: [
        { role: "GUARD", at: { x: 1, y: 8 } },
        { role: "FIGHTER", at: { x: 0, y: 8 } },
        { role: "FIGHTER", at: { x: 1, y: 10 } },
        { role: "MARKSMAN", at: { x: 0, y: 7 } },
      ],
      line: "The Baron sends the second boat, and the heavier men.",
      announce: true,
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "PATROL_BOAT", at: { x: 10, y: 5 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 5 } },
        { role: "SUBMARINE", at: { x: 10, y: 5 } },
      ],
      line: "Gunboats close the sea road behind you.",
      announce: true,
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 0, y: 8 } },
        { role: "MARKSMAN", at: { x: 0, y: 6 } },
        { role: "MARKSMAN", at: { x: 0, y: 7 } },
      ],
      line: "Every Redcoat the Baron could spare, and every rifle.",
      announce: true,
    },
    {
      seat: 1,
      round: 12,
      units: [
        { role: "GUARD", at: { x: 1, y: 8 } },
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "MARKSMAN", at: { x: 0, y: 6 } },
        { role: "MARKSMAN", at: { x: 1, y: 10 } },
      ],
      line: "The last boat in the Baron's pocket-book.",
      announce: true,
    },
  ],
  landmarks: [{ tag: "BIG_TOP_BAY", at: { x: 13, y: 3 }, name: "Big Top Bay" }],
  forbiddenTechnologies: [],
  // The Queen to Big Top Bay by round 18 (was 22). The stars: by round 14,
  // and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "OLD_QUEEN",
    to: "BIG_TOP_BAY",
    within: 1,
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
