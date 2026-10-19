import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_5` "Broadsides at Saltmarsh" (docs/product/SAGA.md section 3.1,
 * H5; `pulp_wars-hmyk.4`). You lead the Humans, who keep no navy on the
 * Frontier, against the Redcap navy that blockades the river mouth, and
 * must sink its treasure ship, the Golden Goose (a tagged Scrap
 * Dreadnought), by round 20. Step 5 of 6: build a fleet under fire. Ships
 * need Navigation for the deep water; a Submarine's torpedo strikes a big
 * ship unanswered; a Fire Raft sails up and Kabooms, hurting every ship
 * around it, so a tight fleet dies to one raft; the Golden Goose blows up
 * when it sinks.
 *
 * The board is the map generator's (Continents 16, seed 1): the Frontier's
 * shore in the west with Saltmarsh on the channel and Ferry Rest inland;
 * the Redcaps' shore in the east with the Anchorage on the channel and
 * Wreckers' Cove behind it; a channel of deep water between. The Golden
 * Goose rides on the open sea east of the Redcaps' shore with two Fire
 * Rafts and a Diving Barrel; the Normal AI keeps her there for some rounds
 * and then brings her round the south cape into the channel, where a
 * waiting pack of Submarines can sink her. The Anchorage builds a Fire
 * Raft a turn at its Shipyard. The saga's old Sea Serpent (mission
 * curiosities, SAGA.md section 4, E1; `pulp_wars-hmyk.14`) prowls the deep
 * water north of the narrows and bites whoever sails beside it, Redcap or
 * Ranger (hand play: it parked at the channel's north mouth for rounds and
 * pushed the Submarines south, out of the pearl water).
 *
 * Hand play (CAMPAIGN.md section 15) set the numbers: the Redcaps' shore
 * keeps no villages and the Anchorage no pearls, and the Redcaps learn
 * nothing but the sea (with villages, pearls, farms and workshops they
 * grew to five towns, two Trolls and a Fire Raft from every port).
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~.~~~~~~^~~~^.f~
 *    2   ~~~.v~~~f~~.ff.~      v: villages
 *    3   ~~$.ff~~~~~^f.f~      $: treasure chests
 *    4   ~~.fff~~~~~~...~
 *    5   ~fv^ff~~@~~~f..~      @: the Sea Serpent's home
 *    6   ~~^.ff~~~~~f.f^~
 *    7   ~f.....~~~....~~
 *    8   ~vf....~~~f..W~~      W: Wreckers' Cove (the Redcaps' capital)
 *    9   ~...f.SP~~f...fG      S: Saltmarsh; P: its Port; G: the Goose
 *   10   ~.....f~~~A....~      A: the Anchorage
 *   11   ~.....f~~P.....~      P: the Anchorage's Port
 *   12   ~~..F..~~~$....~      F: Ferry Rest
 *   13   ~~..^f.~~~.....~
 *   14   ~~~~~~~~~~.ff..~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const HUMAN_5_V7: MissionDefinitionV7 = {
  id: "HUMAN_5",
  // Revision 2 (`pulp_wars-hmyk.14`): the old Sea Serpent in the deep water.
  revision: 2,
  seed: 20261205,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 1,
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 14 }, present: false },
      { kind: "RESOURCE", at: { x: 9, y: 10 }, resource: "." },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~.~~~~~~^~~~^.f~",
    "~~~..~~~f~~.ff.~",
    "~~f.ff~~~~~^f.f~",
    "~~.fff~~~~~~...~",
    "~f.^ff~~~~~~f..~",
    "~~^.ff~~~~~f.f^~",
    "~f.....~~~....~~",
    "~.f....~~~f...~~",
    "~...f..~~~f...f~",
    "~.....f~~~.....~",
    "~.....f~~~.....~",
    "~~.....~~~.....~",
    "~~..^f.~~~.....~",
    "~~~~~~~~~~.ff..~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...p..pps..p.ss.",
    "s.s......p.....s",
    ".ps...psg....g.p",
    "...e.gp...so.rg.",
    "..r.g......se.r.",
    ".....g.p...s...s",
    ".sor.g..p.p...o.",
    "..er.r.....rrrs.",
    "...r.er....re...",
    ".e.......sg.rrgp",
    "pe..ee......e...",
    "..reee.s..er....",
    ".srr.rr....r.rrs",
    ".seeo.r.pp.ee.ep",
    "..s..s...se.....",
    "....p......p....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PWPPPPPPHPPPHHHP",
    "PPPWWPPPHPPHHHHP",
    "PPWWWWPPPPPHHHHP",
    "PPWWWWPPPPPPHHHP",
    "PWWWWWPPPPPPHHHP",
    "PPWWWWPPPPPPPPHP",
    "PWPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 4, y: 2 },
    { x: 2, y: 5 },
    { x: 1, y: 8 },
  ],
  treasureChests: [
    { x: 2, y: 3 },
    { x: 10, y: 12 },
  ],
  // </map>
  // The saga's old serpent (E1, `pulp_wars-hmyk.14`): it has bitten both
  // sides for a hundred years, in the deep water north of the narrows.
  curiosities: [{ kind: "SEA_SERPENT", at: { x: 8, y: 5 } }],
  improvements: [
    // Saltmarsh's Port and Farms.
    { at: { x: 7, y: 9 }, improvement: "PORT" },
    { at: { x: 5, y: 8 }, improvement: "FARM" },
    { at: { x: 5, y: 10 }, improvement: "FARM" },
    // The Anchorage's Port.
    { at: { x: 9, y: 11 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 10,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
      ],
      cities: [
        {
          name: "Saltmarsh",
          at: { x: 6, y: 9 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Ferry Rest",
          at: { x: 4, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 9 } },
        { role: "MARKSMAN", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 9 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 10 } },
        { role: "FIGHTER", at: { x: 4, y: 12 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 6, x1: 12, y1: 12 }] },
    },
    {
      // The Redcap navy, Baron Kessler's blockade.
      faction: "GOBLIN",
      coins: 6,
      technologies: [
        "HUNTING",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      cities: [
        {
          name: "Wreckers' Cove",
          at: { x: 13, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Anchorage",
          at: { x: 10, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 8 } },
        // The fleet rides on the open sea east of the Redcaps' shore (hand
        // play: anchored in the channel, two Dreadnoughts shelled Saltmarsh
        // flat in round 1). The Golden Goose, with the Frontier's taxes,
        // two Fire Rafts and a Diving Barrel.
        { role: "BATTLESHIP", at: { x: 15, y: 9 }, tag: "GOLDEN_GOOSE" },
        { role: "PATROL_BOAT", at: { x: 15, y: 7 } },
        { role: "PATROL_BOAT", at: { x: 15, y: 11 } },
        { role: "SUBMARINE", at: { x: 15, y: 4 } },
        { role: "FIGHTER", at: { x: 10, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 6, x1: 9, y1: 13 }] },
      // A navy and nothing else (hand play: with farms, workshops, the
      // villages and the channel's pearls, the Redcaps grew four towns, two
      // Trolls and a Fire Raft a turn).
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
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
    },
  ],
  landmarks: [],
  forbiddenTechnologies: [],
  // Sink the Golden Goose by round 20. The stars: by round 16, and no city
  // lost.
  objective: {
    kind: "KILL",
    units: ["GOLDEN_GOOSE"],
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
