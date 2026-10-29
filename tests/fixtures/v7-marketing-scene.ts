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
import type { MissionDefinitionV7 } from "../../src/engine/v7/missions/types";

/**
 * The marketing screenshot scene (bead pulp_wars-mxwn): a hand-built
 * mid-game state of a three-way war, the Martians (the human, seat 0)
 * against the Undead and the Dinosaurs, captured from the real game UI by
 * `scripts/marketing/screenshot-v7.ts`. No match is played: the board, the
 * cities and the units are written here and built by the ordinary mission
 * builder (which checks every placement and the population ledger), then
 * dated to round 19 with the wear of a long war (wounds, veterans, spent
 * Shields, a grown T-Rex) and checked against the state schema. The setup
 * is an ordinary Continents skirmish, so no mission chrome shows.
 *
 * The module imports no test runner, so the browser script mounts it
 * through the dev server.
 *
 * ```text
 *      x 0123456789ABCDEFGHIJ   (A = 10 ... J = 19)
 * y  0   ~~~~~..ff^^^^..fff^^
 *    1   ~~~~..f.^^f....f..^f
 *    2   ~~~~~..f^^^..ff^^f.f
 *    3   ~~~~...ff^...f.^fff.
 *    4   ~~~~..f.....f..f.f..
 *    5   ~~~...f.^.f...U..ff.    U: Undead city (level 3, Walls)
 *    6   ~~~..^.....f.....f.^
 *    7   ~~~.f...............
 *    8   ~~~~..M............f    M: Martian capital (level 5, Land Grant)
 *    9   ~~~~..f.........fff.    the front: columns 8 to 13, rows 5 to 12
 *   10   ~~~...f.f......d^f^.    d: Dinosaur camp (level 2)
 *   11   ~~~~.........f..^f..
 *   12   ~~~~~............ff.
 *   13   ~~~~~m.......Df..f..    m: Martian harbour (level 2), D: Dinosaur
 *   14   ~~~~~~...f.......^^f       city (level 3)
 *   15   ~~~~~~~.ff.^..f.^^f.
 *   16   ~~~~~~~~.f..ff.^^f..
 *   17   ~~~~~~~~~..f^^^ffff.
 *   18   ~~~~~~~~~~..f.^^ff.f
 *   19   ~~~~~~~~~~~...ff^ff.
 * ```
 *
 * The Martians have explored all but the north-east corner and the two
 * eastern columns, which stay under the fog.
 */

/** Where the scene's key pieces stand. */
export const MARKETING_SCENE_V7 = {
  /** The Tripod the shots select: a Skeleton two tiles off is its target. */
  tripod: { x: 8, y: 9 },
  /** The veteran Mothership, between a Vampire and a T-Rex. */
  mothership: { x: 10, y: 9 },
  capital: { x: 6, y: 8 },
  harbour: { x: 5, y: 13 },
  undeadCity: { x: 14, y: 5 },
  dinosaurCity: { x: 13, y: 13 },
  dinosaurCamp: { x: 15, y: 10 },
} as const;

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

export const MARKETING_SCENE_MISSION_V7: MissionDefinitionV7 = {
  id: "MARKETING_SCENE",
  revision: 1,
  hidden: true,
  size: 20,
  seed: 20261029,
  terrain: [
    "~~~~~..ff^^^^..fff^^",
    "~~~~..f.^^f....f..^f",
    "~~~~~..f^^^..ff^^f.f",
    "~~~~...ff^...f.^fff.",
    "~~~~..f.....f..f.f..",
    "~~~...f.^.f......ff.",
    "~~~..^.....f.....f.^",
    "~~~.f...............",
    "~~~~...............f",
    "~~~~..f.........fff.",
    "~~~...f.f.......^f^.",
    "~~~~.........f..^f..",
    "~~~~~............ff.",
    "~~~~~.........f..f..",
    "~~~~~~...f.......^^f",
    "~~~~~~~.ff.^..f.^^f.",
    "~~~~~~~~.f..ff.^^f..",
    "~~~~~~~~~..f^^^ffff.",
    "~~~~~~~~~~..f.^^ff.f",
    "~~~~~~~~~~~...ff^ff.",
  ],
  resources: [
    "...........o.....g..",
    "..........g.........",
    ".........o.....o....",
    ".........o....r.....",
    "...s..g..r.......g..",
    ".........r..........",
    ".....o..........e...",
    ".....e........e.....",
    "...s.e..............",
    "....e...........g...",
    ".............r..o...",
    "....r.........e.....",
    "....s....r...e......",
    "..........r.........",
    "....p.........e.....",
    "......s......e......",
    "......p.............",
    "...........g.....g..",
    "...........r........",
    "....................",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHHHWWWWWWWWW",
    "HHHHHHHHHHWWWWWWWWWW",
    "PPHHHHHHHHHWWWWWWWWW",
    "PPHHHHHHHHWWWWWWWWWW",
    "PPPPPPPPPPWWWWWWWWWW",
    "PPPPPPPPPPPWWWWWWWWW",
    "PPPPPPPPPPPPWWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPPWWWWWW",
    "PPPPPPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPHHHHHH",
    "PPPPPPPPPPPPPHHHHHHH",
    "PPPPPPPPPPPPHHHHHHHH",
    "PPPPPPPPPPPHHHHHHHHH",
    "PPPPPPPPPPHHHHHHHHHH",
    "PPPPPPPPPHHHHHHHHHHH",
  ],
  villages: [{ x: 10, y: 3 }],
  roads: [
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 9, y: 8 },
    { x: 6, y: 10 },
    { x: 6, y: 11 },
    { x: 5, y: 12 },
    { x: 13, y: 6 },
    { x: 12, y: 7 },
    { x: 13, y: 12 },
    { x: 14, y: 11 },
  ],
  improvements: [
    // The Martian capital: mines, farms, lumber, and the works between.
    { at: { x: 5, y: 6 }, improvement: "MINE" },
    { at: { x: 5, y: 7 }, improvement: "FARM" },
    { at: { x: 5, y: 8 }, improvement: "FARM" },
    { at: { x: 4, y: 9 }, improvement: "FARM" },
    { at: { x: 4, y: 7 }, improvement: "LUMBER_CAMP" },
    { at: { x: 6, y: 9 }, improvement: "LUMBER_CAMP" },
    { at: { x: 4, y: 8 }, improvement: "WINDMILL" },
    { at: { x: 7, y: 10 }, improvement: "SAWMILL" },
    { at: { x: 6, y: 6 }, improvement: "FORGE" },
    // The harbour town.
    { at: { x: 4, y: 13 }, improvement: "PORT" },
    // The Undead city.
    { at: { x: 15, y: 4 }, improvement: "LUMBER_CAMP" },
    // The Dinosaur city and camp.
    { at: { x: 13, y: 12 }, improvement: "FARM" },
    { at: { x: 14, y: 13 }, improvement: "LUMBER_CAMP" },
    { at: { x: 16, y: 10 }, improvement: "MINE" },
  ],
  graves: [
    { x: 11, y: 5 },
    { x: 12, y: 9 },
    { x: 9, y: 11 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      coins: 37,
      technologies: MARTIAN_TECHS_V7,
      cities: [
        {
          at: { x: 6, y: 8 },
          level: 5,
          rewards: ["STOCKPILE", "WALLS", "BOOM", "JUGGERNAUT"],
          landGrant: true,
        },
        { at: { x: 5, y: 13 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "KNIGHT", at: { x: 10, y: 9 } },
        { role: "JUGGERNAUT", at: { x: 7, y: 7 } },
        { role: "CATAPULT", at: { x: 8, y: 9 } },
        { role: "RAIDER", at: { x: 9, y: 5 } },
        { role: "RAIDER", at: { x: 8, y: 12 } },
        { role: "MARKSMAN", at: { x: 9, y: 7 } },
        { role: "MARKSMAN", at: { x: 9, y: 10 } },
        { role: "GUARD", at: { x: 8, y: 8 } },
        { role: "CAPTAIN", at: { x: 7, y: 9 } },
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 10, y: 10 } },
        { role: "PATROL_BOAT", at: { x: 5, y: 14 }, home: 1 },
      ],
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 0, x1: 14, y1: 19 },
          { x0: 15, y0: 4, x1: 17, y1: 16 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 12,
      technologies: UNDEAD_TECHS_V7,
      cities: [
        {
          at: { x: 14, y: 5 },
          level: 3,
          rewards: ["MILITIA", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 14, y: 5 } },
        { role: "KNIGHT", at: { x: 11, y: 8 } },
        { role: "GUARD", at: { x: 11, y: 6 } },
        { role: "FIGHTER", at: { x: 10, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "CATAPULT", at: { x: 13, y: 7 } },
        { role: "MARKSMAN", at: { x: 12, y: 8 } },
        { role: "CAPTAIN", at: { x: 13, y: 4 } },
        { role: "RAIDER", at: { x: 15, y: 8 } },
      ],
      reveal: { radius: 3, rects: [{ x0: 7, y0: 2, x1: 17, y1: 11 }] },
    },
    {
      faction: "DINOSAUR",
      coins: 9,
      technologies: DINOSAUR_TECHS_V7,
      cities: [
        { at: { x: 13, y: 13 }, level: 3, rewards: ["STOCKPILE", "SURVEY"] },
        { at: { x: 15, y: 10 }, level: 2, rewards: ["MILITIA"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "KNIGHT", at: { x: 11, y: 10 }, kills: 3 },
        { role: "SWORDSMAN", at: { x: 12, y: 10 } },
        { role: "RAIDER", at: { x: 11, y: 12 } },
        { role: "RAIDER", at: { x: 14, y: 8 }, home: 1 },
        { role: "CATAPULT", at: { x: 14, y: 11 } },
        { role: "MARKSMAN", at: { x: 12, y: 13 } },
        { role: "GUARD", at: { x: 15, y: 10 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 12 } },
      ],
      reveal: { radius: 3, rects: [{ x0: 7, y0: 7, x1: 17, y1: 17 }] },
    },
  ],
  forbiddenTechnologies: [],
  objective: { kind: "DOMINATION" },
};

/**
 * An ordinary three-seat skirmish setup (Continents, 20 x 20) for the
 * scene: the match reads like one the player started from the menu, so no
 * mission objective, story name or campaign chrome appears.
 */
export function marketingSceneSetupV7(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 20261029,
    width: 20,
    height: 20,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "LIME",
    factions: ["MARTIAN", "UNDEAD", "DINOSAUR"],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  };
}

/** The wear of the war, by tile: HP lost, and veterans. */
const WOUNDS_V7: readonly { readonly at: CoordV7; readonly lost: number }[] = [
  { at: { x: 11, y: 8 }, lost: 6 }, // the Vampire, bloodied
  { at: { x: 10, y: 7 }, lost: 5 }, // a Skeleton
  { at: { x: 11, y: 10 }, lost: 9 }, // the T-Rex
  { at: { x: 8, y: 8 }, lost: 4 }, // the Shield Projector
  { at: { x: 9, y: 10 }, lost: 3 }, // a Ray Gunner
  { at: { x: 12, y: 10 }, lost: 7 }, // the Triceratops
  { at: { x: 14, y: 8 }, lost: 4 }, // a Raptor fighting the Ghoul
  { at: { x: 15, y: 8 }, lost: 6 }, // the Ghoul
];
const VETERANS_V7: readonly CoordV7[] = [
  { x: 10, y: 9 },
  { x: 11, y: 8 },
];
/** Martian Shields spent in the fighting: tile and Shield left. */
const SHIELDS_LEFT_V7: readonly {
  readonly at: CoordV7;
  readonly shield: number;
}[] = [
  { at: { x: 8, y: 8 }, shield: 1 },
  { at: { x: 9, y: 10 }, shield: 0 },
  { at: { x: 10, y: 10 }, shield: 1 },
];
/** Martian units that already acted this turn. */
const ACTED_V7: readonly CoordV7[] = [
  { x: 9, y: 7 },
  { x: 8, y: 12 },
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
