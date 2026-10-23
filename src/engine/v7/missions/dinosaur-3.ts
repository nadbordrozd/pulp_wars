import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_3` "The Sea Road" (docs/product/SAGA.md section 3.5, DN3; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs, who have never needed to sail, across the Lost Sea after the
 * eggs: she must come within a tile of Big Top Bay on the mainland's
 * north-eastern shore by round 20, crossing embarked. Step 3 of 6: a
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
 * beaches in rounds 4 and 9. Gullrock's garrison holds the islet
 * (`GUARD`) and the rest of his men hunt you (`others: RUSH`).
 *
 * Retune 3 (`pulp_wars-hmyk.21`) started you thin (Fernmaw alone, 3
 * Coins) against a richer Baron (12 Coins, Drill and Walls, more boats)
 * with five announced waves on an 18-round clock; the user found the
 * campaign mostly impossible. Retune 4 (`pulp_wars-hmyk.27`, hand-played,
 * CAMPAIGN.md section 17.5): the Crater back with a Fighter, Scouting,
 * 5 Coins and the village by Fernmaw; the Baron has 8 Coins, one Patrol
 * Boat fewer and two landings (rounds 4 and 9) on a 20-round clock.
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
  // Revision 4 (`pulp_wars-hmyk.27`, retune 4): the Crater and a village
  // back, 5 Coins, a poorer Baron, two landings, a 20-round clock.
  revision: 4,
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
      // Retune 3: the chest beside Fernmaw is gone (retune 4 gives the
      // village back).
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
    { x: 2, y: 3 },
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
      // Retune 3: thin. Fernmaw alone (the Crater was gone), Hunting and
      // the sea technologies only, 3 Coins. Retune 4: the Crater and a
      // Fighter back, Scouting, 5 Coins. The lane is unseen but for the
      // far shore.
      coins: 5,
      technologies: [
        "HUNTING",
        "SCOUTING",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
      ],
      cities: [
        {
          name: "Fernmaw",
          at: { x: 3, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Crater",
          at: { x: 2, y: 9 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // The Old Queen, a T-Rex, who must cross the sea.
        { role: "KNIGHT", at: { x: 3, y: 4 }, tag: "OLD_QUEEN" },
        { role: "PATROL_BOAT", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 9 }, home: 1 },
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
      // ships still keep to the shallows: no Navigation); retune 4: 8.
      coins: 8,
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
        // the landings (retune 4: one of those Patrol Boats).
        { role: "SUBMARINE", at: { x: 5, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 5 }, home: 1 },
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
  // 4 and 9, for Fernmaw and the Crater, each announced (retune 3: four
  // landings and a gunboat flotilla).
  reinforcements: [
    {
      seat: 1,
      round: 4,
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
      round: 9,
      units: [
        { role: "GUARD", at: { x: 1, y: 8 } },
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "MARKSMAN", at: { x: 0, y: 7 } },
      ],
      line: "The Baron sends the second boat, and the heavier men.",
      announce: true,
    },
  ],
  landmarks: [{ tag: "BIG_TOP_BAY", at: { x: 13, y: 3 }, name: "Big Top Bay" }],
  forbiddenTechnologies: [],
  // The Queen to Big Top Bay by round 20 (retune 3: 18). The stars: by
  // round 16, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "OLD_QUEEN",
    to: "BIG_TOP_BAY",
    within: 1,
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
