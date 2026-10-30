import {
  MAP_GENERATION_REVISION_V7,
  PROMOTION_HP_V7,
  PROMOTION_KILLS_V7,
  RULESET_7_ID,
  parseGameStateV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { buildMissionStateV7 } from "../../src/engine/v7/missions/build";
import { missionMapLayersV7 } from "../../src/engine/v7/missions/generated-map";
import type {
  MissionDefinitionV7,
  MissionMapSourceV7,
  RectV7,
} from "../../src/engine/v7/missions/types";

/**
 * The marketing screenshot scene (beads pulp_wars-mxwn, pulp_wars-n3lv): a
 * mid-game state of a three-way war, the Martians (the human, seat 0)
 * against the Undead and the Dinosaurs, captured from the real game UI by
 * `scripts/marketing/screenshot-v7.ts`. No match is played.
 *
 * The board is the game's own map generator's: the Pangea 20 x 20 skirmish
 * board of seed 24 for three seats, as a player who starts that match gets
 * it (`missionMapLayersV7` runs the generator), with only the edits a
 * played game would have made: the treasure chests the Martians opened and
 * the villages that grew into the scene's cities. The cities, their
 * buildings, Roads and units stand on that board; the ordinary mission
 * builder gives each city the territory the rules give it (its 3 x 3
 * footprint, the capital's Land Grant 5 x 5) and checks every placement and
 * the population ledger. The Martians' explored land is what their cities
 * and units would have seen over the war: the cities' surroundings, the
 * sight of every unit now on the board, and the squares seen along a few
 * scouting and marching routes, so the fog's edge is ragged. The state is
 * then dated to round 19 with the wear of a long war (wounds, veterans,
 * spent Shields, a grown T-Rex) and checked against the state schema.
 *
 * The module imports no test runner, so the browser script mounts it
 * through the dev server.
 *
 * ```text
 *      x 0123456789ABCDEFGHIJ   (A = 10 ... J = 19)
 * y  5   ~^^^^^V^^Vf^V.^V..V~
 *    6   ~fC^^.....^^f.f^...~
 *    7   ~V.f^.ff.^^^^....ff~
 *    8   ~....f.ff^^V.^^.U..~    U: Undead city (level 3, Walls)
 *    9   ~.....f..^..f^.^fff~
 *   10   ~...f.^.^^.^.^^f.ff~
 *   11   ~f.M..f^f.f^d...f.V~    M: Martian capital (level 5, Land Grant)
 *   12   ~f....f....f..^D^ff~    d: Dinosaur camp (level 2)
 *   13   ~.......^.....^^f.f~    D: Dinosaur city (level 3)
 *   14   ~m...f^.fV.^V^^^.fV~    m: Martian harbour (level 2)
 *   15   ~f..^fff.f^f^^xxxf~~    x: the Rift (under the fog)
 * ```
 */

/** Where the scene's key pieces stand. */
export const MARKETING_SCENE_V7 = {
  /** The Tripod the shots select: a wounded Raptor two tiles off is its target. */
  tripod: { x: 7, y: 12 },
  /** The veteran Mothership, between a Vampire, a Raptor and a T-Rex. */
  mothership: { x: 9, y: 11 },
  capital: { x: 3, y: 11 },
  harbour: { x: 1, y: 7 },
  undeadCity: { x: 16, y: 8 },
  dinosaurCity: { x: 15, y: 12 },
  dinosaurCamp: { x: 12, y: 11 },
} as const;

/** The generated board: Pangea 20 x 20, seed 24, three seats. */
export const MARKETING_SCENE_MAP_V7: MissionMapSourceV7 = {
  mapType: "PANGEA",
  size: 20,
  seats: 3,
  seed: 24,
  edits: [
    // The chests in the Martians' land were opened long ago.
    { kind: "CHEST", at: { x: 2, y: 6 }, present: false },
    { kind: "CHEST", at: { x: 5, y: 7 }, present: false },
    { kind: "CHEST", at: { x: 8, y: 7 }, present: false },
    // The villages that became the scene's cities.
    { kind: "VILLAGE", at: { x: 3, y: 11 }, present: false },
    { kind: "VILLAGE", at: { x: 1, y: 7 }, present: false },
    { kind: "VILLAGE", at: { x: 12, y: 11 }, present: false },
    { kind: "VILLAGE", at: { x: 15, y: 12 }, present: false },
  ],
};

/**
 * What the Martians saw on the way to round 19, beyond their cities'
 * surroundings and their units' present sight (which the builder adds):
 * Saucer sweeps (sight 2) and marching columns (sight 1).
 */
const MARTIAN_HISTORY_V7: readonly {
  readonly at: CoordV7;
  readonly sight: number;
}[] = [
  // The first Saucer's loop north and east.
  { at: { x: 5, y: 6 }, sight: 2 },
  { at: { x: 7, y: 4 }, sight: 2 },
  { at: { x: 9, y: 2 }, sight: 2 },
  { at: { x: 11, y: 3 }, sight: 1 },
  { at: { x: 12, y: 5 }, sight: 2 },
  { at: { x: 14, y: 6 }, sight: 1 },
  // The column that found the Undead city.
  { at: { x: 11, y: 7 }, sight: 1 },
  { at: { x: 13, y: 8 }, sight: 1 },
  { at: { x: 14, y: 9 }, sight: 2 },
  // The southern march and the Dinosaur border.
  { at: { x: 5, y: 15 }, sight: 2 },
  { at: { x: 8, y: 16 }, sight: 1 },
  { at: { x: 10, y: 14 }, sight: 1 },
  { at: { x: 12, y: 13 }, sight: 1 },
  { at: { x: 14, y: 12 }, sight: 1 },
  { at: { x: 16, y: 11 }, sight: 1 },
  { at: { x: 17, y: 9 }, sight: 1 },
  { at: { x: 16, y: 14 }, sight: 1 },
  { at: { x: 13, y: 15 }, sight: 1 },
  { at: { x: 11, y: 16 }, sight: 1 },
  // The second Saucer down the west coast.
  { at: { x: 2, y: 4 }, sight: 2 },
  { at: { x: 1, y: 8 }, sight: 2 },
  { at: { x: 1, y: 13 }, sight: 2 },
  { at: { x: 2, y: 17 }, sight: 1 },
];

function sightRect(at: CoordV7, sight: number): RectV7 {
  return {
    x0: Math.max(0, at.x - sight),
    y0: Math.max(0, at.y - sight),
    x1: Math.min(19, at.x + sight),
    y1: Math.min(19, at.y + sight),
  };
}

const MARTIAN_TECHS_V7: readonly TechnologyIdV7[] = [
  "GATHERING",
  "FARMING",
  "MILLING",
  "ADMINISTRATION",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "SCOUTING",
  "ROADS",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
  "ENGINEERING",
  "METALLURGY",
  "FORTIFICATION",
  "SHORECRAFT",
];

const UNDEAD_TECHS_V7: readonly TechnologyIdV7[] = [
  "GATHERING",
  "FARMING",
  "ADMINISTRATION",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "SCOUTING",
  "ROADS",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
  "ENGINEERING",
  "FORTIFICATION",
];

const DINOSAUR_TECHS_V7: readonly TechnologyIdV7[] = [
  "GATHERING",
  "FARMING",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "SCOUTING",
  "ROADS",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
  "ENGINEERING",
  "METALLURGY",
  "FORTIFICATION",
];

const LAYERS_V7 = missionMapLayersV7(MARKETING_SCENE_MAP_V7);

export const MARKETING_SCENE_MISSION_V7: MissionDefinitionV7 = {
  id: "MARKETING_SCENE",
  revision: 2,
  hidden: true,
  size: 20,
  seed: 20261030,
  source: MARKETING_SCENE_MAP_V7,
  terrain: LAYERS_V7.terrain,
  resources: LAYERS_V7.resources,
  biome: "PLAINS",
  biomes: LAYERS_V7.biomes,
  villages: LAYERS_V7.villages,
  treasureChests: LAYERS_V7.treasureChests,
  roads: [
    // The capital's road to the harbour and out to the front.
    { x: 2, y: 10 },
    { x: 1, y: 9 },
    { x: 1, y: 8 },
    { x: 4, y: 11 },
    { x: 5, y: 11 },
    // The Undead and Dinosaur roads.
    { x: 15, y: 8 },
    { x: 14, y: 7 },
    { x: 13, y: 12 },
    { x: 13, y: 11 },
  ],
  improvements: [
    // The Martian capital: farms on the Fertile Ground, lumber in its
    // woods, a windmill and a sawmill between them.
    { at: { x: 2, y: 9 }, improvement: "FARM" },
    { at: { x: 2, y: 11 }, improvement: "FARM" },
    { at: { x: 5, y: 12 }, improvement: "FARM" },
    { at: { x: 4, y: 13 }, improvement: "FARM" },
    { at: { x: 4, y: 10 }, improvement: "LUMBER_CAMP" },
    { at: { x: 1, y: 11 }, improvement: "LUMBER_CAMP" },
    { at: { x: 3, y: 12 }, improvement: "WINDMILL" },
    { at: { x: 5, y: 10 }, improvement: "SAWMILL" },
    // The harbour.
    { at: { x: 0, y: 7 }, improvement: "PORT" },
    // The Undead city.
    { at: { x: 16, y: 7 }, improvement: "FARM" },
    { at: { x: 15, y: 9 }, improvement: "MINE" },
    { at: { x: 17, y: 7 }, improvement: "LUMBER_CAMP" },
    // The Dinosaur city and camp.
    { at: { x: 14, y: 12 }, improvement: "MINE" },
    { at: { x: 15, y: 13 }, improvement: "MINE" },
    { at: { x: 11, y: 12 }, improvement: "LUMBER_CAMP" },
  ],
  graves: [
    { x: 12, y: 10 },
    { x: 14, y: 9 },
    { x: 6, y: 13 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      coins: 37,
      technologies: MARTIAN_TECHS_V7,
      cities: [
        {
          at: { x: 3, y: 11 },
          level: 5,
          rewards: ["STOCKPILE", "WALLS", "BOOM", "JUGGERNAUT"],
          landGrant: true,
        },
        { at: { x: 1, y: 7 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "KNIGHT", at: { x: 9, y: 11 } },
        { role: "JUGGERNAUT", at: { x: 5, y: 9 } },
        { role: "CATAPULT", at: { x: 7, y: 12 } },
        { role: "RAIDER", at: { x: 7, y: 6 } },
        { role: "RAIDER", at: { x: 3, y: 14 } },
        { role: "MARKSMAN", at: { x: 8, y: 9 } },
        { role: "MARKSMAN", at: { x: 7, y: 10 } },
        { role: "GUARD", at: { x: 7, y: 9 } },
        { role: "CAPTAIN", at: { x: 5, y: 10 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "FIGHTER", at: { x: 7, y: 13 } },
        { role: "PATROL_BOAT", at: { x: 0, y: 8 }, home: 1 },
      ],
      reveal: {
        radius: 2,
        rects: MARTIAN_HISTORY_V7.map((step) => sightRect(step.at, step.sight)),
      },
    },
    {
      faction: "UNDEAD",
      coins: 12,
      technologies: UNDEAD_TECHS_V7,
      cities: [
        { at: { x: 16, y: 8 }, level: 3, rewards: ["MILITIA", "WALLS"] },
      ],
      units: [
        { role: "GUARD", at: { x: 16, y: 8 } },
        { role: "KNIGHT", at: { x: 10, y: 10 } },
        { role: "GUARD", at: { x: 10, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 8, y: 6 } },
        { role: "MARKSMAN", at: { x: 12, y: 8 } },
        { role: "CATAPULT", at: { x: 13, y: 7 } },
        { role: "CAPTAIN", at: { x: 14, y: 7 } },
        { role: "RAIDER", at: { x: 13, y: 11 } },
      ],
      reveal: { radius: 3, rects: [{ x0: 6, y0: 2, x1: 19, y1: 13 }] },
    },
    {
      faction: "DINOSAUR",
      coins: 9,
      technologies: DINOSAUR_TECHS_V7,
      cities: [
        { at: { x: 15, y: 12 }, level: 3, rewards: ["STOCKPILE", "SURVEY"] },
        { at: { x: 12, y: 11 }, level: 2, rewards: ["MILITIA"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 15, y: 12 } },
        { role: "KNIGHT", at: { x: 10, y: 12 }, kills: 3 },
        { role: "RAIDER", at: { x: 9, y: 12 } },
        { role: "SWORDSMAN", at: { x: 12, y: 12 } },
        { role: "RAIDER", at: { x: 14, y: 11 } },
        { role: "CATAPULT", at: { x: 13, y: 13 } },
        { role: "MARKSMAN", at: { x: 12, y: 13 } },
        { role: "GUARD", at: { x: 12, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 13 } },
      ],
      reveal: { radius: 3, rects: [{ x0: 6, y0: 6, x1: 19, y1: 18 }] },
    },
  ],
  forbiddenTechnologies: [],
  objective: { kind: "DOMINATION" },
};

/**
 * The skirmish setup the generated board belongs to (Pangea, 20 x 20, seed
 * 24, two AI seats): the match reads like one the player started from the
 * menu, so no mission objective, story name or campaign chrome appears.
 */
export function marketingSceneSetupV7(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: MARKETING_SCENE_MAP_V7.seed,
    width: 20,
    height: 20,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "LIME",
    factions: ["MARTIAN", "UNDEAD", "DINOSAUR"],
    mapType: "PANGEA",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  };
}

/** The wear of the war, by tile: HP lost. */
const WOUNDS_V7: readonly { readonly at: CoordV7; readonly lost: number }[] = [
  { at: { x: 10, y: 10 }, lost: 6 }, // the Vampire, bloodied
  { at: { x: 9, y: 12 }, lost: 7 }, // the Raptor under the Tripod's ray
  { at: { x: 10, y: 12 }, lost: 9 }, // the T-Rex
  { at: { x: 7, y: 9 }, lost: 4 }, // the Shield Projector
  { at: { x: 8, y: 9 }, lost: 3 }, // a Ray Gunner
  { at: { x: 11, y: 9 }, lost: 4 }, // a Skeleton
  { at: { x: 12, y: 12 }, lost: 7 }, // the Triceratops
  { at: { x: 14, y: 11 }, lost: 4 }, // a Raptor fighting the Ghoul
  { at: { x: 13, y: 11 }, lost: 6 }, // the Ghoul
];
/** Veterans: the Mothership and the Vampire. */
const VETERANS_V7: readonly CoordV7[] = [
  { x: 9, y: 11 },
  { x: 10, y: 10 },
];
/** Martian Shields spent in the fighting: tile and Shield left. */
const SHIELDS_LEFT_V7: readonly {
  readonly at: CoordV7;
  readonly shield: number;
}[] = [
  { at: { x: 7, y: 9 }, shield: 1 },
  { at: { x: 8, y: 9 }, shield: 0 },
  { at: { x: 7, y: 13 }, shield: 1 },
];
/** Martian units that already acted this turn. */
const ACTED_V7: readonly CoordV7[] = [
  { x: 8, y: 9 },
  { x: 7, y: 6 },
];

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

/** The scene: the built mission state, dated and worn, schema-checked. */
export function marketingSceneStateV7(): GameStateV7 {
  const built = buildMissionStateV7(
    MARKETING_SCENE_MISSION_V7,
    marketingSceneSetupV7(),
  );
  const martian = built.players[0]?.id;
  const units = built.units.map((unit): UnitStateV7 => {
    const wound = WOUNDS_V7.find((entry) => same(entry.at, unit.at));
    const veteran = VETERANS_V7.some((at) => same(at, unit.at));
    const acted = ACTED_V7.some((at) => same(at, unit.at));
    const promotion = veteran ? PROMOTION_HP_V7 : 0;
    return {
      ...unit,
      hp: unit.hp + promotion - (wound?.lost ?? 0),
      maxHp: unit.maxHp + promotion,
      ...(veteran
        ? { veteran: true, kills: Math.max(unit.kills, PROMOTION_KILLS_V7) }
        : {}),
      ...(acted
        ? {
            activation: {
              ...unit.activation,
              moved: true,
              movedPathLength: 1,
              attacked: true,
              attacksUsed: 1,
              handled: true,
            },
          }
        : {}),
    };
  });
  const shields = built.shields.flatMap((entry) => {
    const unit = units.find((item) => item.id === entry.unitId);
    const left = SHIELDS_LEFT_V7.find(
      (item) => unit !== undefined && same(item.at, unit.at),
    );
    if (left === undefined) return [entry];
    return left.shield > 0 ? [{ ...entry, shield: left.shield }] : [];
  });
  const state = parseGameStateV7({
    ...built,
    round: 19,
    commandIndex: 412,
    units,
    shields,
    players: built.players.map((player) =>
      player.id === martian ? { ...player, coins: 37 } : player,
    ),
  });
  if (state === null)
    throw new Error("The marketing scene does not pass the state schema");
  return state;
}
