import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../types";
import type {
  MissionCityV7,
  MissionDefinitionV7,
  MissionImprovementV7,
  MissionUnitV7,
} from "./types";

/**
 * The Human tuning labs (`pulp_wars-w49.3`, tuning 4;
 * docs/product/RULESET_7_TUNING_HUMAN.md part 4 and
 * docs/validation/TEXT_PLAY.md): three hidden mirror fixtures, a Human
 * player against the Human Normal AI, each a staged position that a normal
 * match reaches too late or too rarely to judge by hand. They are ordinary
 * mission definitions (no rule of their own), registered for the text
 * harness (`play:text -- lab`) and tests, and belong to no chapter.
 *
 * Tuning 5 (`pulp_wars-w49.4`, `7r48`): `LAB_BACKLINE` and `LAB_LATE` are
 * revision 2: both sides have Engineering and field Swordsmen (the middle
 * Fighter of each screen in `LAB_BACKLINE`, one Fighter of every front
 * city in `LAB_LATE`). `LAB_SIEGE` is unchanged: its player can research
 * Engineering (14 Coins since tuning 6, 21 before) and train Swordsmen as a
 * fifth way in.
 *
 * The ninth unit (`pulp_wars-w49.17`, `7r55`): the Swordsman is the
 * Champion (6 Coins) and is trained with Metallurgy, one technology after
 * Engineering. `LAB_BACKLINE` and `LAB_LATE` are revision 3: both sides own
 * Metallurgy too, so the Champions they field can be replaced (`LAB_LATE`:
 * 17 of the 20 land technologies; Planning, Fieldcraft, and Explosives are
 * missing). `LAB_SIEGE` is unchanged: its player reaches the Champion by
 * Engineering and then Metallurgy.
 */
const DRY_NAVAL_V7: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const NO_RESOURCES_11_V7 = Array.from({ length: 11 }, () => "...........");
const NO_RESOURCES_14_V7 = Array.from({ length: 14 }, () => "..............");

/**
 * `LAB_SIEGE`: the assault on a walled capital. The AI holds a level-4
 * walled capital with a Guard on the center, a screen of three Guards west
 * of it (one in Forest, which its Forestry makes cover; one on a Field
 * Defense), and a Marksman and two Catapults behind. A neutral Mountain
 * touches the whole screen. The player has two cities, six units, 60 Coins,
 * and every prerequisite of Sawmilling (Catapults), Chivalry (Knights),
 * Explosives (Blast and Breach), and Fieldcraft, at 16 Coins the first
 * (tuning 6: research costs 1 Coin more per technology owned; 23 before).
 * The AI's whole army is the garrison of its capital (`GUARD`): it keeps
 * the formation.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff^^
 *    1   ^f.......f^
 *    2   f.........f
 *    3   f.....f...f
 *    4   ......ff...
 *    5   ..H...^.U..      H: your capital; U: the walled AI capital
 *    6   ......f....
 *    7   f.........f
 *    8   f.h.......f      h: your second city
 *    9   ^f.......f^
 *   10   ^^ff...ff^^
 * ```
 */
export const LAB_SIEGE_V7: MissionDefinitionV7 = {
  id: "LAB_SIEGE",
  revision: 1,
  hidden: true,
  mirror: true,
  size: 11,
  seed: 20261101,
  terrain: [
    "^^ff...ff^^",
    "^f.......f^",
    "f.........f",
    "f.....f...f",
    "......ff...",
    "......^....",
    "......f....",
    "f.........f",
    "f.........f",
    "^f.......f^",
    "^^ff...ff^^",
  ],
  resources: NO_RESOURCES_11_V7,
  biome: "PLAINS",
  villages: [],
  fieldDefenses: [{ x: 7, y: 6 }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 60,
      technologies: [
        "GATHERING",
        "HUNTING",
        "FORESTRY",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          at: { x: 2, y: 5 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        { at: { x: 2, y: 8 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 4, y: 4 } },
        { role: "GUARD", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 5 }, home: 1 },
        { role: "RAIDER", at: { x: 3, y: 3 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 2, x1: 10, y1: 8 }] },
    },
    {
      faction: "ORIGINAL",
      coins: 10,
      technologies: [
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        { at: { x: 8, y: 5 }, level: 4, rewards: ["SURVEY", "WALLS", "BOOM"] },
      ],
      units: [
        { role: "GUARD", at: { x: 8, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 4 } },
        { role: "GUARD", at: { x: 7, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "MARKSMAN", at: { x: 9, y: 5 } },
        { role: "CATAPULT", at: { x: 9, y: 4 } },
        { role: "CATAPULT", at: { x: 9, y: 6 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 3, x1: 6, y1: 9 }] },
      // The whole army is the garrison of exactly the seven tiles it stands
      // on, so it keeps its formation and fights from it.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 7, y0: 4, x1: 7, y1: 6 },
          { x0: 8, y0: 5, x1: 8, y1: 5 },
          { x0: 9, y0: 4, x1: 9, y1: 6 },
        ],
        garrison: 7,
      },
    },
  ],
  forbiddenTechnologies: DRY_NAVAL_V7,
  objective: { kind: "DOMINATION" },
};

/**
 * `LAB_BACKLINE`: an army that leads with its screen. The AI advances
 * (`RUSH`) with four Catapults and three Marksmen behind two Guards, a
 * Swordsman, and two Fighters, one tile short of the player's line. The
 * player has three Knights, two Raiders, a Swordsman, two Fighters, two
 * Marksmen, a Catapult, and 40 Coins: the question is what reaches the
 * Catapults.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ^^ff......ff^^
 *    1   ^f..........f^
 *    2   f............f
 *    3   ......f.......
 *    4   ..............
 *    5   .....f........
 *    6   ..H........U..      H, h: your cities; U, u: the AI's
 *    7   ..............
 *    8   ......f.......
 *    9   ..............
 *   10   ..h........u..
 *   11   f............f
 *   12   ^f..........f^
 *   13   ^^ff......ff^^
 * ```
 */
export const LAB_BACKLINE_V7: MissionDefinitionV7 = {
  id: "LAB_BACKLINE",
  revision: 3,
  hidden: true,
  mirror: true,
  size: 14,
  seed: 20261102,
  terrain: [
    "^^ff......ff^^",
    "^f..........f^",
    "f............f",
    "......f.......",
    "..............",
    ".....f........",
    "..............",
    "..............",
    "......f.......",
    "..............",
    "..............",
    "f............f",
    "^f..........f^",
    "^^ff......ff^^",
  ],
  resources: NO_RESOURCES_14_V7,
  biome: "PLAINS",
  villages: [],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 40,
      technologies: [
        "GATHERING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        // The ninth unit (`pulp_wars-w49.17`, 7r55): the Champion is at
        // Metallurgy (revision 3).
        "METALLURGY",
        "FORTIFICATION",
      ],
      cities: [
        {
          at: { x: 2, y: 6 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        { at: { x: 2, y: 10 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "KNIGHT", at: { x: 4, y: 4 } },
        { role: "KNIGHT", at: { x: 4, y: 6 } },
        { role: "KNIGHT", at: { x: 4, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 4 } },
        { role: "SWORDSMAN", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 7 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 3 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 9 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 5 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 3, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 2, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 2, x1: 12, y1: 11 }] },
    },
    {
      faction: "ORIGINAL",
      coins: 10,
      technologies: [
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "ROADS",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
      ],
      cities: [
        { at: { x: 11, y: 6 }, level: 4, rewards: ["SURVEY", "WALLS", "BOOM"] },
        { at: { x: 11, y: 10 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 6 } },
        { role: "GUARD", at: { x: 7, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 7 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "SWORDSMAN", at: { x: 7, y: 6 } },
        { role: "FIGHTER", at: { x: 7, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 8, y: 5 } },
        { role: "MARKSMAN", at: { x: 8, y: 6 }, home: 1 },
        { role: "MARKSMAN", at: { x: 8, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 9, y: 4 } },
        { role: "CATAPULT", at: { x: 9, y: 5 } },
        { role: "CATAPULT", at: { x: 9, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 9, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 2, x1: 10, y1: 11 }] },
      directive: { kind: "RUSH" },
    },
  ],
  forbiddenTechnologies: DRY_NAVAL_V7,
  objective: { kind: "DOMINATION" },
};

// ------------------------------------------------------------- LAB_LATE ---

const LATE_ROWS_V7 = [2, 7, 12] as const;
const LATE_TECHNOLOGIES_V7: readonly TechnologyIdV7[] = [
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
  "COMMERCE",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
  "ENGINEERING",
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Champion is at
  // Metallurgy (revision 3; seventeen technologies).
  "METALLURGY",
  "FORTIFICATION",
];

/** A unit of a `LAB_LATE` city, as an offset from its center. */
type LateUnitV7 = readonly [UnitRoleIdV7, number, number];
const LATE_FRONT_UNITS_V7: readonly LateUnitV7[] = [
  ["GUARD", 0, 0],
  ["FIGHTER", 1, -1],
  // Tuning 5: a heavy line unit in every front city (the Champion; its
  // Metallurgy is among the seventeen technologies since revision 3).
  ["SWORDSMAN", 1, 1],
  ["MARKSMAN", 0, -1],
  ["CATAPULT", 0, 1],
];
const LATE_REAR_UNITS_V7: readonly LateUnitV7[] = [
  ["FIGHTER", 0, 0],
  ["KNIGHT", 1, -1],
  ["KNIGHT", 1, 1],
  ["RAIDER", 1, 0],
  ["MARKSMAN", 0, -1],
];

/**
 * One side of `LAB_LATE`: a rear column of three cities at `rearX` and a
 * front column at `frontX` (`facing` is +1 when the enemy lies to the
 * east), every city level 4 except the level-5 capital in the middle of the
 * rear column. Each city has two Farms and a Market on its outer column and
 * Roads join all six, so Commerce pays everywhere.
 */
function lateSideV7(
  rearX: number,
  frontX: number,
  facing: 1 | -1,
): {
  readonly cities: readonly MissionCityV7[];
  readonly units: readonly MissionUnitV7[];
  readonly improvements: readonly MissionImprovementV7[];
  readonly roads: readonly CoordV7[];
  readonly farms: readonly CoordV7[];
} {
  // The capital first (the middle of the rear column), then the rest.
  const sites: { x: number; y: number; front: boolean }[] = [
    { x: rearX, y: 7, front: false },
    { x: rearX, y: 2, front: false },
    { x: rearX, y: 12, front: false },
    ...LATE_ROWS_V7.map((y) => ({ x: frontX, y, front: true })),
  ];
  const cities = sites.map((site, index): MissionCityV7 =>
    index === 0
      ? {
          at: { x: site.x, y: site.y },
          level: 5,
          rewards: ["STOCKPILE", "WALLS", "BOOM", "BARRACKS"],
        }
      : index === 1
        ? {
            at: { x: site.x, y: site.y },
            level: 4,
            rewards: ["STOCKPILE", "MILITIA", "BARRACKS"],
          }
        : {
            at: { x: site.x, y: site.y },
            level: 4,
            rewards: ["STOCKPILE", site.front ? "WALLS" : "MILITIA", "BOOM"],
          },
  );
  const units: MissionUnitV7[] = [];
  const improvements: MissionImprovementV7[] = [];
  const farms: CoordV7[] = [];
  sites.forEach((site, home) => {
    // A rear city's buildings stand on its outer column, away from the
    // enemy; a front city's on the column that faces it.
    const column = site.x + (site.front ? facing : -facing);
    for (const dy of [-1, 1]) {
      farms.push({ x: column, y: site.y + dy });
      improvements.push({
        at: { x: column, y: site.y + dy },
        improvement: "FARM",
      });
    }
    improvements.push({ at: { x: column, y: site.y }, improvement: "MARKET" });
    const roster = [
      ...(site.front ? LATE_FRONT_UNITS_V7 : LATE_REAR_UNITS_V7),
      // The capital (level 5 and a Barracks) holds seven, the other
      // Barracks city six.
      ...(home === 0
        ? ([
            ["CAPTAIN", -1, 0],
            ["CATAPULT", 0, 1],
          ] as const)
        : home === 1
          ? ([["FIGHTER", 0, 1]] as const)
          : []),
    ];
    for (const [role, dx, dy] of roster)
      units.push({
        role,
        at: { x: site.x + dx * facing, y: site.y + dy },
        home,
      });
  });
  const roads: CoordV7[] = [];
  // The rear column, center to center.
  for (const y of [3, 4, 5, 6, 8, 9, 10, 11]) roads.push({ x: rearX, y });
  // Each rear city to the front city of its row.
  for (const y of LATE_ROWS_V7)
    for (let x = rearX + facing; x !== frontX; x += facing)
      roads.push({ x, y });
  return { cities, units, improvements, roads, farms };
}

const LATE_HUMAN_V7 = lateSideV7(2, 6, 1);
const LATE_AI_V7 = lateSideV7(14, 10, -1);

const LATE_TERRAIN_V7 = [
  "^^ff....ff....^^",
  "................",
  "................",
  "................",
  "f.......f......f",
  "f.......^......f",
  "................",
  "................",
  "................",
  "f.......f......f",
  "f.......^......f",
  "................",
  "................",
  "................",
  "................",
  "^^ff....ff....^^",
];

/**
 * `LAB_LATE`: the late game. Both sides hold six road-linked cities (a
 * level-5 capital with a Barracks, one level-4 city with a Barracks, four
 * more level-4 cities; two Farms and a Market each), 16 of the 20 land
 * technologies, 100 Coins, and an army at every city's unit limit. Missing
 * on both sides: Planning, Fieldcraft, Metallurgy, and Explosives. The
 * question is what the Coins are for.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  2   ..h...h...u...u.
 *    7   ..H...h...u...U.      H, U: the capitals
 *   12   ..h...h...u...u.
 * ```
 */
export const LAB_LATE_V7: MissionDefinitionV7 = {
  id: "LAB_LATE",
  revision: 3,
  hidden: true,
  mirror: true,
  size: 16,
  seed: 20261103,
  terrain: LATE_TERRAIN_V7,
  resources: LATE_TERRAIN_V7.map((row, y) =>
    [...row]
      .map((_, x) =>
        [...LATE_HUMAN_V7.farms, ...LATE_AI_V7.farms].some(
          (farm) => farm.x === x && farm.y === y,
        )
          ? "e"
          : ".",
      )
      .join(""),
  ),
  biome: "PLAINS",
  villages: [],
  roads: [...LATE_HUMAN_V7.roads, ...LATE_AI_V7.roads],
  improvements: [...LATE_HUMAN_V7.improvements, ...LATE_AI_V7.improvements],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 100,
      technologies: LATE_TECHNOLOGIES_V7,
      cities: LATE_HUMAN_V7.cities,
      units: LATE_HUMAN_V7.units,
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 11, y1: 15 }] },
    },
    {
      faction: "ORIGINAL",
      coins: 100,
      technologies: LATE_TECHNOLOGIES_V7,
      cities: LATE_AI_V7.cities,
      units: LATE_AI_V7.units,
      reveal: { radius: 2, rects: [{ x0: 5, y0: 0, x1: 15, y1: 15 }] },
    },
  ],
  forbiddenTechnologies: DRY_NAVAL_V7,
  objective: { kind: "DOMINATION" },
};
