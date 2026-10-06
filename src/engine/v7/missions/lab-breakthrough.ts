import type { CoordV7, TechnologyIdV7, UnitRoleIdV7 } from "../types";
import type { MissionDefinitionV7, MissionUnitV7 } from "./types";

/**
 * `LAB_BREAKTHROUGH` (tuning 6, `pulp_wars-w49.6`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 13 and
 * docs/validation/TEXT_PLAY.md): numbers against a prepared line, the bar
 * the user set for the Normal AI ("with overwhelming numbers the AI must
 * break through my ranks"). Three hidden fixtures, one per attacking
 * faction, on the same board; like the other labs they are ordinary
 * mission definitions with no rule of their own.
 *
 * The player (Humans) holds the only crossing between two lakes, a front
 * of eight tiles at x = 6: Guards on the two Mountains and the two Field
 * Defenses, Swordsmen in the four Forests (cover with Forestry), three
 * Marksmen and two Catapults behind, and a walled level-4 capital three
 * tiles behind the line with a Guard on its center: 14 units, 63 Coins of
 * them, 12 Coins a turn. The AI attacks with twice the unit value
 * (two and a half to three times in the first draft of the lab,
 * which the round-5 policy also broke) in a mix of its own roster (line units,
 * defenders, ranged, siege, breakthrough, and fast units) and holds five level-5
 * cities with a Barracks each (21 Coins a turn) and a few free unit slots,
 * so that it reinforces. It has no directive: it plays the ordinary Normal
 * policy. Its army starts three tiles outside the reach of the line's
 * Catapults and Marksmen.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   .....~~~~.......
 *    1   .....~~~~.......
 *    2   .h...~~~~.....u.      h, H: your cities; u, U: the AI's
 *    3   .....~~~~.......
 *    4   ......^.........      the line: x = 6, y = 4 to 11
 *    5   ......f....f..u.
 *    6   ......#.........      #: a Field Defense
 *    7   ...H..f.........      H: your walled capital
 *    8   ......f.......U.
 *    9   ......#.........
 *   10   ......f....f....
 *   11   ......^.......u.
 *   12   .....~~~~.......
 *   13   .h...~~~~.......
 *   14   .....~~~~.....u.
 *   15   .....~~~~.......
 * ```
 */
const DRY_NAVAL_V7: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const BREAKTHROUGH_TERRAIN_V7 = [
  ".....~~~~.......",
  ".....~~~~.......",
  ".....~~~~.......",
  ".....~~~~.......",
  "......^.........",
  "......f....f....",
  "................",
  "......f.........",
  "......f.........",
  "................",
  "......f....f....",
  "......^.........",
  ".....~~~~.......",
  ".....~~~~.......",
  ".....~~~~.......",
  ".....~~~~.......",
];

/** The front: every tile an attacker must take to cross. */
export const LAB_BREAKTHROUGH_LINE_V7: readonly CoordV7[] = [
  4, 5, 6, 7, 8, 9, 10, 11,
].map((y) => ({ x: 6, y }));

/** The player's walled capital behind the line. */
export const LAB_BREAKTHROUGH_CAPITAL_V7: CoordV7 = { x: 3, y: 7 };

export type BreakthroughAttackerV7 = "ORIGINAL" | "GOBLIN" | "UNDEAD";

/** The AI's cities, the capital first; three Farms east of each. */
const BREAKTHROUGH_AI_CITIES_V7: readonly CoordV7[] = [
  { x: 14, y: 8 },
  { x: 14, y: 5 },
  { x: 14, y: 11 },
];
const BREAKTHROUGH_AI_FARMS_V7: readonly CoordV7[] =
  BREAKTHROUGH_AI_CITIES_V7.flatMap((city) => [
    { x: 15, y: city.y - 1 },
    { x: 15, y: city.y },
    { x: 15, y: city.y + 1 },
  ]);

type ArmyColumnV7 = readonly (readonly [UnitRoleIdV7, number])[];

const BREAKTHROUGH_AI_TECHNOLOGIES_V7: readonly TechnologyIdV7[] = [
  "GATHERING",
  "FARMING",
  "ADMINISTRATION",
  "HUNTING",
  "FORESTRY",
  "SAWMILLING",
  "MARKSMANSHIP",
  "SCOUTING",
  "RAIDING",
  "CHIVALRY",
  "DRILL",
];

/**
 * The attacker's army by faction: three columns of `[role, count]`, the
 * front column first (x = 10, 11, 12).
 */
const BREAKTHROUGH_ARMIES_V7: Readonly<
  Record<
    BreakthroughAttackerV7,
    {
      readonly technologies: readonly TechnologyIdV7[];
      readonly columns: readonly ArmyColumnV7[];
    }
  >
> = {
  // Twice the line's 63 Coins of units (the first draft: 172, 154, and 156
  // Coins).
  // 26 units, 125 Coins of them.
  ORIGINAL: {
    technologies: [...BREAKTHROUGH_AI_TECHNOLOGIES_V7, "ENGINEERING"],
    columns: [
      [
        ["SWORDSMAN", 6],
        ["GUARD", 2],
        ["FIGHTER", 4],
      ],
      [
        ["MARKSMAN", 5],
        ["KNIGHT", 3],
        ["FIGHTER", 1],
      ],
      [
        ["CATAPULT", 3],
        ["RAIDER", 2],
      ],
    ],
  },
  // 33 units, 125 Coins: the horde is cheaper per body.
  GOBLIN: {
    technologies: BREAKTHROUGH_AI_TECHNOLOGIES_V7,
    columns: [
      [
        ["GUARD", 6],
        ["FIGHTER", 6],
      ],
      [
        ["MARKSMAN", 7],
        ["KNIGHT", 4],
      ],
      [
        ["CATAPULT", 4],
        ["RAIDER", 5],
        ["CAPTAIN", 1],
      ],
    ],
  },
  // 29 units, 127 Coins.
  UNDEAD: {
    technologies: BREAKTHROUGH_AI_TECHNOLOGIES_V7,
    columns: [
      [
        ["GUARD", 6],
        ["FIGHTER", 6],
      ],
      [
        ["MARKSMAN", 5],
        ["KNIGHT", 4],
        ["CAPTAIN", 1],
      ],
      [
        ["CATAPULT", 4],
        ["RAIDER", 3],
      ],
    ],
  },
};

/**
 * The attacker's units: column `index` of the army stands at x = 10 +
 * `index`, filled from the middle rows outward. Homes go round the five
 * cities.
 */
function breakthroughUnitsV7(
  columns: readonly ArmyColumnV7[],
): readonly MissionUnitV7[] {
  const rows = [7, 8, 6, 9, 5, 10, 4, 11, 3, 12, 2, 13, 1, 14];
  const units: MissionUnitV7[] = [];
  columns.forEach((column, index) => {
    const roles = column.flatMap(([role, count]) =>
      Array.from({ length: count }, () => role),
    );
    roles.forEach((role, order) => {
      const y = rows[order];
      if (y === undefined) throw new Error("LAB_BREAKTHROUGH column overflow");
      units.push({
        role,
        at: { x: 10 + index, y },
        home: units.length % BREAKTHROUGH_AI_CITIES_V7.length,
      });
    });
  });
  return units;
}

function breakthroughLabV7(
  id: string,
  faction: BreakthroughAttackerV7,
  seed: number,
): MissionDefinitionV7 {
  const army = BREAKTHROUGH_ARMIES_V7[faction];
  return {
    id,
    revision: 1,
    hidden: true,
    mirror: true,
    size: 16,
    seed,
    terrain: BREAKTHROUGH_TERRAIN_V7,
    resources: BREAKTHROUGH_TERRAIN_V7.map((row, y) =>
      [...row]
        .map((_, x) =>
          BREAKTHROUGH_AI_FARMS_V7.some((farm) => farm.x === x && farm.y === y)
            ? "e"
            : ".",
        )
        .join(""),
    ),
    biome: "PLAINS",
    villages: [],
    improvements: BREAKTHROUGH_AI_FARMS_V7.map((at) => ({
      at,
      improvement: "FARM",
    })),
    fieldDefenses: [
      { x: 6, y: 6 },
      { x: 6, y: 9 },
    ],
    aiMode: "RIVAL",
    seats: [
      {
        faction: "ORIGINAL",
        coins: 10,
        technologies: [
          "GATHERING",
          "HUNTING",
          "FORESTRY",
          "SAWMILLING",
          "MARKSMANSHIP",
          "DRILL",
          "ENGINEERING",
          "FORTIFICATION",
        ],
        cities: [
          {
            at: LAB_BREAKTHROUGH_CAPITAL_V7,
            level: 4,
            rewards: ["STOCKPILE", "WALLS", "BOOM"],
          },
          {
            at: { x: 1, y: 2 },
            level: 4,
            rewards: ["STOCKPILE", "MILITIA", "BOOM"],
          },
          { at: { x: 1, y: 13 }, level: 3, rewards: ["STOCKPILE", "MILITIA"] },
        ],
        units: [
          { role: "GUARD", at: LAB_BREAKTHROUGH_CAPITAL_V7 },
          { role: "GUARD", at: { x: 6, y: 4 } },
          { role: "SWORDSMAN", at: { x: 6, y: 5 } },
          { role: "GUARD", at: { x: 6, y: 6 } },
          { role: "SWORDSMAN", at: { x: 6, y: 7 } },
          { role: "SWORDSMAN", at: { x: 6, y: 8 }, home: 1 },
          { role: "GUARD", at: { x: 6, y: 9 }, home: 1 },
          { role: "SWORDSMAN", at: { x: 6, y: 10 }, home: 1 },
          { role: "GUARD", at: { x: 6, y: 11 }, home: 1 },
          { role: "MARKSMAN", at: { x: 5, y: 5 }, home: 1 },
          { role: "MARKSMAN", at: { x: 5, y: 7 }, home: 2 },
          { role: "MARKSMAN", at: { x: 5, y: 10 }, home: 2 },
          { role: "CATAPULT", at: { x: 4, y: 6 }, home: 2 },
          { role: "CATAPULT", at: { x: 4, y: 9 }, home: 2 },
        ],
        reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 12, y1: 15 }] },
      },
      {
        faction,
        coins: 10,
        technologies: army.technologies,
        cities: BREAKTHROUGH_AI_CITIES_V7.map((at) => ({
          at,
          level: 4,
          rewards: ["STOCKPILE", "MILITIA", "BOOM"],
        })),
        units: breakthroughUnitsV7(army.columns),
        reveal: { radius: 2, rects: [{ x0: 2, y0: 0, x1: 15, y1: 15 }] },
      },
    ],
    forbiddenTechnologies: DRY_NAVAL_V7,
    objective: { kind: "DOMINATION" },
  };
}

export const LAB_BREAKTHROUGH_V7 = breakthroughLabV7(
  "LAB_BREAKTHROUGH",
  "ORIGINAL",
  20261104,
);
export const LAB_BREAKTHROUGH_GOBLIN_V7 = breakthroughLabV7(
  "LAB_BREAKTHROUGH_GOBLIN",
  "GOBLIN",
  20261105,
);
export const LAB_BREAKTHROUGH_UNDEAD_V7 = breakthroughLabV7(
  "LAB_BREAKTHROUGH_UNDEAD",
  "UNDEAD",
  20261106,
);
