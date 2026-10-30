import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { missionMapLayersV7 } from "../../src/engine/v7/missions/generated-map";
import type {
  MissionDefinitionV7,
  MissionMapSourceV7,
} from "../../src/engine/v7/missions/types";
import {
  DINOSAUR_TECHS_V7,
  MARTIAN_TECHS_V7,
  UNDEAD_TECHS_V7,
  marketingSceneFromV7,
  sightRect,
  type MarketingWearV7,
} from "./v7-marketing-scene";

/**
 * More takes of the marketing scene (bead pulp_wars-vbi9): the same war,
 * the Martians (the human, seat 0) against the Undead and the Dinosaurs in
 * round 19, on other boards of the game's own map generator, with other
 * moments. Each board is the generator's skirmish board for its map type
 * and seed (`missionMapLayersV7`), edited only where a played game would
 * have changed it (chests opened, villages grown into the cities). The
 * cities take the territory the rules give them, and the Martians' explored
 * land is what their cities, their units and a few scouting routes would
 * have seen, so the fog's edge is ragged. Built and checked as the v2 scene
 * (`marketingSceneFromV7` in ./v7-marketing-scene.ts).
 *
 * The module imports no test runner, so the browser script mounts it
 * through the dev server.
 */

/** Sight squares of the routes the Martians took. */
function routes(
  steps: readonly { readonly at: CoordV7; readonly sight: number }[],
) {
  return steps.map((step) => sightRect(step.at, step.sight));
}

function generatedMission(
  id: string,
  map: MissionMapSourceV7,
  rest: Omit<
    MissionDefinitionV7,
    | "id"
    | "revision"
    | "hidden"
    | "size"
    | "seed"
    | "source"
    | "terrain"
    | "resources"
    | "biome"
    | "biomes"
    | "villages"
    | "treasureChests"
  >,
): MissionDefinitionV7 {
  const layers = missionMapLayersV7(map);
  return {
    id,
    revision: 1,
    hidden: true,
    size: 20,
    seed: 20261030,
    source: map,
    terrain: layers.terrain,
    resources: layers.resources,
    biome: "PLAINS",
    biomes: layers.biomes,
    villages: layers.villages,
    treasureChests: layers.treasureChests,
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// Take 2: Lakes, seed 13. The Martians hold the western fields and push
// across the isthmus between two lakes to besiege the Undead city, while the
// Dinosaurs fall on the Undead from the east. A Saucer is selected, its
// strike on a Skeleton previewed.
//
//      x 0123456789ABCDEFGHIJ
// y  5   .......~~~~~..fff.f^
//    6   ..V..V.~~~~~..UffVff     U: Undead city (level 3, Walls)
//    7   ..f..f^f..fVf..fffff
//    8   ^...f.ff~~.ff..fff..
//    9   f.M.fm.~~~~ff~~~~df^     M: Martian capital, m: harbour
//   10   .f..ff~~~~~f.ff~~^f.     d: Dinosaur camp (level 2)
//   11   ..Cfff~~~~f.f.~~~^ff
//   12   f...f.V~~~f~~~~~~D.^     D: Dinosaur city (level 3)
// ---------------------------------------------------------------------------

/** Where take 2's key pieces stand. */
export const MARKETING_TAKE2_V7 = {
  /** The selected Saucer; a Skeleton beside it is its target. */
  saucer: { x: 12, y: 8 },
  mothership: { x: 12, y: 6 },
  capital: { x: 2, y: 9 },
  harbour: { x: 5, y: 9 },
  undeadCity: { x: 14, y: 6 },
  dinosaurCity: { x: 17, y: 12 },
  dinosaurCamp: { x: 17, y: 9 },
} as const;

export const MARKETING_TAKE2_MAP_V7: MissionMapSourceV7 = {
  mapType: "LAKES",
  size: 20,
  seats: 3,
  seed: 13,
  edits: [
    // Chests in the Martians' land, opened long ago.
    { kind: "CHEST", at: { x: 2, y: 11 }, present: false },
    { kind: "CHEST", at: { x: 3, y: 13 }, present: false },
    // The villages that became the scene's cities.
    { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
    { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
    { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
    { kind: "VILLAGE", at: { x: 17, y: 9 }, present: false },
  ],
};

export const MARKETING_TAKE2_MISSION_V7: MissionDefinitionV7 = generatedMission(
  "MARKETING_TAKE_2",
  MARKETING_TAKE2_MAP_V7,
  {
    roads: [
      { x: 3, y: 10 },
      { x: 4, y: 9 },
      { x: 6, y: 9 },
      { x: 13, y: 7 },
      { x: 18, y: 11 },
    ],
    improvements: [
      // The Martian capital and its harbour.
      { at: { x: 1, y: 8 }, improvement: "FARM" },
      { at: { x: 3, y: 9 }, improvement: "FARM" },
      { at: { x: 0, y: 11 }, improvement: "FARM" },
      { at: { x: 5, y: 8 }, improvement: "FARM" },
      { at: { x: 1, y: 10 }, improvement: "LUMBER_CAMP" },
      { at: { x: 3, y: 11 }, improvement: "LUMBER_CAMP" },
      { at: { x: 2, y: 10 }, improvement: "WINDMILL" },
      { at: { x: 0, y: 10 }, improvement: "SAWMILL" },
      { at: { x: 6, y: 10 }, improvement: "PORT" },
      // The Undead city.
      { at: { x: 13, y: 6 }, improvement: "FARM" },
      { at: { x: 15, y: 5 }, improvement: "LUMBER_CAMP" },
      // The Dinosaur camp and city.
      { at: { x: 18, y: 8 }, improvement: "FARM" },
      { at: { x: 16, y: 8 }, improvement: "LUMBER_CAMP" },
      { at: { x: 17, y: 11 }, improvement: "MINE" },
      { at: { x: 17, y: 13 }, improvement: "MINE" },
    ],
    graves: [
      { x: 10, y: 7 },
      { x: 13, y: 8 },
      { x: 12, y: 4 },
    ],
    aiMode: "RIVAL",
    seats: [
      {
        faction: "MARTIAN",
        coins: 29,
        technologies: MARTIAN_TECHS_V7,
        cities: [
          {
            at: { x: 2, y: 9 },
            level: 5,
            rewards: ["STOCKPILE", "WALLS", "BOOM", "JUGGERNAUT"],
            landGrant: true,
          },
          { at: { x: 5, y: 9 }, level: 2, rewards: ["STOCKPILE"] },
        ],
        units: [
          { role: "KNIGHT", at: { x: 12, y: 6 } },
          { role: "JUGGERNAUT", at: { x: 8, y: 7 } },
          { role: "CATAPULT", at: { x: 9, y: 7 } },
          { role: "RAIDER", at: { x: 12, y: 8 } },
          { role: "RAIDER", at: { x: 11, y: 3 } },
          { role: "MARKSMAN", at: { x: 10, y: 8 } },
          { role: "MARKSMAN", at: { x: 13, y: 4 } },
          { role: "GUARD", at: { x: 12, y: 5 } },
          { role: "CAPTAIN", at: { x: 5, y: 7 } },
          { role: "FIGHTER", at: { x: 2, y: 9 } },
          { role: "FIGHTER", at: { x: 6, y: 9 } },
          { role: "PATROL_BOAT", at: { x: 7, y: 9 }, home: 1 },
        ],
        reveal: {
          radius: 2,
          rects: routes([
            // Saucer sweeps over the northern fields.
            { at: { x: 4, y: 4 }, sight: 2 },
            { at: { x: 8, y: 2 }, sight: 2 },
            { at: { x: 12, y: 2 }, sight: 1 },
            { at: { x: 1, y: 4 }, sight: 2 },
            { at: { x: 16, y: 6 }, sight: 1 },
            { at: { x: 15, y: 3 }, sight: 1 },
            // The lake shores.
            { at: { x: 10, y: 11 }, sight: 1 },
            { at: { x: 7, y: 13 }, sight: 2 },
            // Across the lakes to the Dinosaur border.
            { at: { x: 13, y: 11 }, sight: 2 },
            { at: { x: 17, y: 10 }, sight: 2 },
            { at: { x: 16, y: 13 }, sight: 1 },
            // The southern fields.
            { at: { x: 3, y: 14 }, sight: 2 },
            { at: { x: 6, y: 16 }, sight: 2 },
            { at: { x: 9, y: 16 }, sight: 1 },
            { at: { x: 11, y: 14 }, sight: 1 },
          ]),
        },
      },
      {
        faction: "UNDEAD",
        coins: 11,
        technologies: UNDEAD_TECHS_V7,
        cities: [
          { at: { x: 14, y: 6 }, level: 3, rewards: ["MILITIA", "WALLS"] },
        ],
        units: [
          { role: "GUARD", at: { x: 14, y: 6 } },
          { role: "FIGHTER", at: { x: 13, y: 7 } },
          { role: "KNIGHT", at: { x: 13, y: 6 } },
          { role: "MARKSMAN", at: { x: 13, y: 5 } },
          { role: "CATAPULT", at: { x: 16, y: 5 } },
          { role: "CAPTAIN", at: { x: 15, y: 4 } },
          { role: "GUARD", at: { x: 14, y: 4 } },
          { role: "FIGHTER", at: { x: 14, y: 8 } },
          { role: "RAIDER", at: { x: 16, y: 7 } },
        ],
        reveal: { radius: 3, rects: [{ x0: 6, y0: 0, x1: 19, y1: 12 }] },
      },
      {
        faction: "DINOSAUR",
        coins: 8,
        technologies: DINOSAUR_TECHS_V7,
        cities: [
          { at: { x: 17, y: 12 }, level: 3, rewards: ["STOCKPILE", "SURVEY"] },
          { at: { x: 17, y: 9 }, level: 2, rewards: ["MILITIA"] },
        ],
        units: [
          { role: "FIGHTER", at: { x: 17, y: 12 } },
          { role: "KNIGHT", at: { x: 17, y: 8 }, kills: 3 },
          { role: "RAIDER", at: { x: 18, y: 8 } },
          { role: "SWORDSMAN", at: { x: 18, y: 9 } },
          { role: "RAIDER", at: { x: 15, y: 8 } },
          { role: "MARKSMAN", at: { x: 18, y: 10 } },
          { role: "CATAPULT", at: { x: 18, y: 12 } },
          { role: "GUARD", at: { x: 17, y: 9 }, home: 1 },
          { role: "FIGHTER", at: { x: 19, y: 8 } },
        ],
        reveal: { radius: 3, rects: [{ x0: 8, y0: 4, x1: 19, y1: 19 }] },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  },
);

const TAKE2_WEAR_V7: MarketingWearV7 = {
  wounds: [
    { at: { x: 13, y: 7 }, lost: 5 }, // the Skeleton under the Saucer
    { at: { x: 13, y: 6 }, lost: 7 }, // the Vampire
    { at: { x: 12, y: 5 }, lost: 4 }, // the Shield Projector
    { at: { x: 14, y: 6 }, lost: 8 }, // the Zombie holding the city
    { at: { x: 16, y: 7 }, lost: 5 }, // the Ghoul
    { at: { x: 17, y: 8 }, lost: 10 }, // the T-Rex
    { at: { x: 15, y: 8 }, lost: 6 }, // a Raptor
    { at: { x: 10, y: 8 }, lost: 3 }, // a Ray Gunner
  ],
  veterans: [
    { x: 12, y: 6 },
    { x: 13, y: 6 },
  ],
  shieldsLeft: [
    { at: { x: 12, y: 5 }, shield: 0 },
    { at: { x: 12, y: 6 }, shield: 2 },
    { at: { x: 10, y: 8 }, shield: 1 },
  ],
  acted: [
    { x: 10, y: 8 },
    { x: 11, y: 3 },
  ],
  coins: 29,
};

/** Take 2: the built state, dated and worn, schema-checked. */
export function marketingTake2StateV7(): GameStateV7 {
  return marketingSceneFromV7(
    MARKETING_TAKE2_MISSION_V7,
    MARKETING_TAKE2_MAP_V7,
    TAKE2_WEAR_V7,
  );
}

// ---------------------------------------------------------------------------
// Take 3: Continents, seed 14. The Martians have crossed the strait from
// their western island to the eastern one: Skimmers and a Saucer besiege
// the Undead city on its west shore, an Undead Ghost Ship slips up the
// strait, and outside the Dinosaur capital the selected veteran Mothership
// lines up its strike on a T-Rex.
//
//      x 0123456789ABCDEFGHIJ
// y  0   ~~~~~f.~~~~~ff^ff~~~
//    1   ~...V...f~~^.^V.f~~~
//    2   ~m......~~~^....^V~~     m: Martian harbour (level 2)
//    3   ff......^~~..C.^^^^~
//    4   .........~~U^.^^^..~     U: Undead city (level 3, Walls)
//    5   ~.......~~~^^f.^...~
//    6   ~f..M...~~~~.^D...d~     M: Martian capital, D: Dinosaur capital
//    7   ~Vff....~~~~......f~     d: Dinosaur town (level 2)
//    8   ~~.ff.~~~~~~~~^..f.~
// ---------------------------------------------------------------------------

/** Where take 3's key pieces stand. */
export const MARKETING_TAKE3_V7 = {
  /** The selected Mothership; the T-Rex beside it is its target. */
  selected: { x: 12, y: 6 },
  mothership: { x: 12, y: 6 },
  capital: { x: 4, y: 6 },
  harbour: { x: 1, y: 2 },
  undeadCity: { x: 11, y: 4 },
  dinosaurCity: { x: 14, y: 6 },
  dinosaurCamp: { x: 18, y: 6 },
} as const;

export const MARKETING_TAKE3_MAP_V7: MissionMapSourceV7 = {
  mapType: "CONTINENTS",
  size: 20,
  seats: 3,
  seed: 14,
  edits: [
    // Chests opened long ago.
    { kind: "CHEST", at: { x: 5, y: 2 }, present: false },
    { kind: "CHEST", at: { x: 13, y: 3 }, present: false },
    // The villages that became the scene's cities.
    { kind: "VILLAGE", at: { x: 1, y: 2 }, present: false },
    { kind: "VILLAGE", at: { x: 11, y: 4 }, present: false },
    { kind: "VILLAGE", at: { x: 18, y: 6 }, present: false },
  ],
};

export const MARKETING_TAKE3_MISSION_V7: MissionDefinitionV7 = generatedMission(
  "MARKETING_TAKE_3",
  MARKETING_TAKE3_MAP_V7,
  {
    roads: [
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 3, y: 4 },
      { x: 2, y: 3 },
      { x: 16, y: 6 },
      { x: 17, y: 6 },
      { x: 11, y: 3 },
    ],
    improvements: [
      // The Martian capital and harbour.
      { at: { x: 5, y: 5 }, improvement: "FARM" },
      { at: { x: 3, y: 6 }, improvement: "FARM" },
      { at: { x: 2, y: 8 }, improvement: "FARM" },
      { at: { x: 4, y: 5 }, improvement: "WINDMILL" },
      { at: { x: 6, y: 8 }, improvement: "PORT" },
      { at: { x: 1, y: 1 }, improvement: "FARM" },
      { at: { x: 0, y: 3 }, improvement: "LUMBER_CAMP" },
      { at: { x: 0, y: 2 }, improvement: "PORT" },
      // The Undead city.
      { at: { x: 12, y: 4 }, improvement: "MINE" },
      { at: { x: 11, y: 5 }, improvement: "MINE" },
      { at: { x: 12, y: 3 }, improvement: "LUMBER_CAMP" },
      // The Dinosaur capital and town.
      { at: { x: 15, y: 5 }, improvement: "MINE" },
      { at: { x: 13, y: 6 }, improvement: "MINE" },
      { at: { x: 13, y: 5 }, improvement: "LUMBER_CAMP" },
      { at: { x: 13, y: 7 }, improvement: "FARM" },
      { at: { x: 18, y: 5 }, improvement: "FARM" },
      { at: { x: 18, y: 7 }, improvement: "LUMBER_CAMP" },
    ],
    graves: [
      { x: 16, y: 5 },
      { x: 6, y: 7 },
      { x: 12, y: 1 },
    ],
    aiMode: "RIVAL",
    seats: [
      {
        faction: "MARTIAN",
        coins: 44,
        technologies: MARTIAN_TECHS_V7,
        cities: [
          {
            at: { x: 4, y: 6 },
            level: 5,
            rewards: ["STOCKPILE", "WALLS", "BOOM", "JUGGERNAUT"],
            landGrant: true,
          },
          { at: { x: 1, y: 2 }, level: 2, rewards: ["STOCKPILE"] },
        ],
        units: [
          { role: "KNIGHT", at: { x: 12, y: 6 } },
          { role: "JUGGERNAUT", at: { x: 6, y: 5 } },
          { role: "CATAPULT", at: { x: 12, y: 7 } },
          { role: "RAIDER", at: { x: 12, y: 3 } },
          { role: "RAIDER", at: { x: 15, y: 8 } },
          { role: "MARKSMAN", at: { x: 16, y: 8 } },
          { role: "MARKSMAN", at: { x: 7, y: 4 } },
          { role: "GUARD", at: { x: 7, y: 6 } },
          { role: "CAPTAIN", at: { x: 5, y: 7 } },
          { role: "FIGHTER", at: { x: 4, y: 6 } },
          { role: "PATROL_BOAT", at: { x: 10, y: 5 } },
          { role: "PATROL_BOAT", at: { x: 9, y: 3 } },
        ],
        reveal: {
          radius: 2,
          rects: routes([
            // The home island.
            { at: { x: 2, y: 1 }, sight: 2 },
            { at: { x: 6, y: 1 }, sight: 2 },
            { at: { x: 7, y: 8 }, sight: 1 },
            { at: { x: 1, y: 7 }, sight: 2 },
            { at: { x: 2, y: 10 }, sight: 1 },
            // Over the strait and round the eastern island.
            { at: { x: 10, y: 2 }, sight: 2 },
            { at: { x: 14, y: 4 }, sight: 1 },
            { at: { x: 16, y: 5 }, sight: 2 },
            { at: { x: 17, y: 8 }, sight: 1 },
            // Boats along the southern sea.
            { at: { x: 4, y: 10 }, sight: 2 },
            { at: { x: 9, y: 10 }, sight: 2 },
            { at: { x: 13, y: 10 }, sight: 1 },
            { at: { x: 12, y: 12 }, sight: 1 },
          ]),
        },
      },
      {
        faction: "UNDEAD",
        coins: 10,
        technologies: [...UNDEAD_TECHS_V7, "SHORECRAFT"],
        cities: [
          { at: { x: 11, y: 4 }, level: 3, rewards: ["MILITIA", "WALLS"] },
        ],
        units: [
          { role: "GUARD", at: { x: 11, y: 4 } },
          { role: "FIGHTER", at: { x: 11, y: 3 } },
          { role: "KNIGHT", at: { x: 13, y: 4 } },
          { role: "CATAPULT", at: { x: 13, y: 3 } },
          { role: "MARKSMAN", at: { x: 12, y: 2 } },
          { role: "CAPTAIN", at: { x: 13, y: 2 } },
          { role: "RAIDER", at: { x: 14, y: 3 } },
          { role: "FIGHTER", at: { x: 14, y: 2 } },
          { role: "PATROL_BOAT", at: { x: 10, y: 2 } },
        ],
        reveal: { radius: 3, rects: [{ x0: 6, y0: 0, x1: 19, y1: 9 }] },
      },
      {
        faction: "DINOSAUR",
        coins: 6,
        technologies: DINOSAUR_TECHS_V7,
        cities: [
          {
            at: { x: 14, y: 6 },
            level: 4,
            rewards: ["STOCKPILE", "WALLS", "BOOM"],
          },
          { at: { x: 18, y: 6 }, level: 2, rewards: ["MILITIA"] },
        ],
        units: [
          { role: "GUARD", at: { x: 14, y: 6 } },
          { role: "KNIGHT", at: { x: 13, y: 7 }, kills: 3 },
          { role: "SWORDSMAN", at: { x: 15, y: 6 } },
          { role: "RAIDER", at: { x: 14, y: 5 } },
          { role: "RAIDER", at: { x: 17, y: 4 } },
          { role: "MARKSMAN", at: { x: 15, y: 7 } },
          { role: "CATAPULT", at: { x: 16, y: 6 } },
          { role: "FIGHTER", at: { x: 18, y: 6 }, home: 1 },
          { role: "FIGHTER", at: { x: 17, y: 7 }, home: 1 },
        ],
        reveal: { radius: 3, rects: [{ x0: 6, y0: 0, x1: 19, y1: 9 }] },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  },
);

const TAKE3_WEAR_V7: MarketingWearV7 = {
  wounds: [
    { at: { x: 11, y: 4 }, lost: 10 }, // the Zombie holding the walls
    { at: { x: 13, y: 7 }, lost: 11 }, // the T-Rex
    { at: { x: 14, y: 5 }, lost: 5 }, // a Raptor
    { at: { x: 13, y: 4 }, lost: 6 }, // the Vampire
    { at: { x: 11, y: 3 }, lost: 4 }, // a Skeleton
    { at: { x: 12, y: 7 }, lost: 5 }, // the Tripod
    { at: { x: 12, y: 3 }, lost: 3 }, // a Saucer
    { at: { x: 15, y: 7 }, lost: 4 }, // the Spitter
  ],
  veterans: [
    { x: 12, y: 6 },
    { x: 13, y: 4 },
  ],
  shieldsLeft: [
    { at: { x: 12, y: 7 }, shield: 0 },
    { at: { x: 12, y: 3 }, shield: 1 },
    { at: { x: 16, y: 8 }, shield: 1 },
  ],
  acted: [
    { x: 12, y: 7 },
    { x: 16, y: 8 },
    { x: 10, y: 5 },
  ],
  coins: 44,
};

/** Take 3: the built state, dated and worn, schema-checked. */
export function marketingTake3StateV7(): GameStateV7 {
  return marketingSceneFromV7(
    MARKETING_TAKE3_MISSION_V7,
    MARKETING_TAKE3_MAP_V7,
    TAKE3_WEAR_V7,
  );
}
