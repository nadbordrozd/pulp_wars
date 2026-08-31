import { deepFreeze } from "../model/freeze";
import {
  COMMAND_KIND_ORDER_V6,
  FACTION_TREE_IDS,
  RESOURCE_IDS,
  RULESET_6_ID,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type FactionIdV6,
  type FactionTreeId,
  type CommandKindV6,
  type EconomicImprovementId,
  type ResourceId,
  type TerrainIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "../v6/types";

export const TECHNOLOGY_BRANCH_IDS_V6 = deepFreeze([
  "SETTLEMENT",
  "WILDS",
  "INDUSTRY",
  "MOBILITY",
  "WARFARE",
] as const);

export type TechnologyBranchIdV6 = (typeof TECHNOLOGY_BRANCH_IDS_V6)[number];

export type TechnologyUnlockedCommandV6 = Extract<
  CommandKindV6,
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_QUARRY"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_STONEWORKS"
  | "BUILD_WORKSHOP"
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP"
>;

export type TechnologyUnlockV6 =
  | {
      readonly kind: "COMMAND";
      readonly command: TechnologyUnlockedCommandV6;
    }
  | {
      readonly kind: "RESOURCE_REVEAL";
      readonly resources: readonly ResourceId[];
    }
  | {
      readonly kind: "UNIT_ROLE";
      readonly role: UnitRoleId;
    }
  | {
      readonly kind: "ECONOMIC_FORMULA";
      readonly improvement: EconomicImprovementId;
      readonly formula:
        | "CONNECTED_ORTHOGONAL_CLUSTER"
        | "ADJACENT_MINES"
        | "ADJACENT_QUARRIES_AND_OPPOSITE_PAIRS"
        | "DISTINCT_BASIC_TYPES"
        | "DISTINCT_PROCESSOR_TYPES"
        | "DISTINCT_ECONOMIC_FAMILIES";
    }
  | { readonly kind: "CONNECTED_FARM_VISUALS" }
  | {
      readonly kind: "FOREST_MOVEMENT_FREEDOM";
      readonly roles: readonly ["SCOUT", "MARKSMAN"];
    }
  | { readonly kind: "MOUNTAIN_MOVEMENT" }
  | { readonly kind: "HIGH_GROUND_VISION"; readonly radiusBonus: 1 }
  | { readonly kind: "ROLE_SIGHT"; readonly role: "SCOUT"; readonly radius: 2 }
  | {
      readonly kind: "ROAD_MOVEMENT";
      readonly ordinaryStepCost2: 2;
      readonly connectedOrthogonalStepCost2: 1;
    }
  | { readonly kind: "MARKET_CAPITAL_ROAD_BONUS"; readonly coins: 1 }
  | {
      readonly kind: "IGNORE_HOSTILE_ZOC";
      readonly roles: readonly ["SCOUT", "RAIDER"];
    }
  | {
      readonly kind: "FRIENDLY_CITY_FORTIFICATION";
      readonly roles: readonly ["FIGHTER", "GUARD"];
      readonly defenseNumerator: 2;
      readonly defenseDenominator: 1;
    }
  | { readonly kind: "MEDIC_HEAL"; readonly amount: 4 | 6 }
  | { readonly kind: "FRIENDLY_IDLE_RECOVERY"; readonly amount: 6 };

export interface TechnologyNodeV6 {
  readonly id: TechnologyId;
  readonly branch: TechnologyBranchIdV6;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyId[];
  readonly unlocks: readonly TechnologyUnlockV6[];
  readonly unlockedRoles: readonly UnitRoleId[];
}

export type UnitRoleAbilityV6 =
  | "ATTACK"
  | "BREACH"
  | "BUILD_CHOCOLATE_WALL"
  | "CANDIFY"
  | "CAPTURE"
  | "CHARGE"
  | "HEAL_ADJACENT"
  | "IGNORE_ZOC_WITH_MANEUVER"
  | "KAMIKAZE_ROLL"
  | "PUSH";

export interface EffectiveRoleRuleV6 {
  readonly role: UnitRoleId;
  readonly label: string;
  /** Null means city-reward-only and therefore not trainable. */
  readonly cost: number | null;
  readonly maxHp: number;
  readonly attack2: number;
  readonly defense2: number;
  readonly move: number;
  readonly range: number;
  readonly sightRadius: number;
  readonly technology: TechnologyId | null;
  readonly mayUsePrimaryActionAfterMove: boolean;
  readonly abilities: readonly UnitRoleAbilityV6[];
}

export interface FactionTechnologyTreeV6 {
  readonly id: FactionTreeId;
  readonly faction: FactionIdV6;
  readonly startingTechIds: readonly ["GATHERING"];
  readonly nodes: readonly TechnologyNodeV6[];
  readonly roleRules: Readonly<Record<UnitRoleId, EffectiveRoleRuleV6>>;
}

export interface RulesetDefinitionV6 {
  readonly id: typeof RULESET_6_ID;
  readonly version: 6;
  readonly boardSizes: readonly [11, 14, 16, 20, 25];
  readonly playerCount: Readonly<{ readonly minimum: 2; readonly maximum: 4 }>;
  readonly startingCoins: 5;
  readonly factionTreeIds: typeof FACTION_TREE_IDS;
  readonly technologies: readonly TechnologyNodeV6[];
}

export type BasicEconomicCommandKindV6 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_QUARRY";

export interface BasicEconomicActionRuleV6 {
  readonly command: BasicEconomicCommandKindV6;
  readonly technology: TechnologyId;
  readonly terrain: TerrainIdV6;
  readonly resource: ResourceId | null;
  readonly cost: number;
  readonly population: number;
  readonly populationCategory: "PERMANENT" | "LIVE";
  readonly improvement: EconomicImprovementId | null;
}

export type SpatialEconomicCommandKindV6 =
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_STONEWORKS"
  | "BUILD_WORKSHOP"
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET";

export interface SpatialEconomicActionRuleV6 {
  readonly command: SpatialEconomicCommandKindV6;
  readonly technology: TechnologyId;
  readonly cost: number;
  readonly improvement: Exclude<
    EconomicImprovementId,
    "FARM" | "LUMBER_CAMP" | "MINE" | "QUARRY"
  >;
  /** Minimum distinct/connected contributor count needed for placement. */
  readonly placementMinimum: number;
}

export const BASIC_ECONOMIC_ACTIONS_V6 = deepFreeze({
  HARVEST_FRUIT: {
    command: "HARVEST_FRUIT",
    technology: "GATHERING",
    terrain: "GRASS",
    resource: "FRUIT",
    cost: 2,
    population: 1,
    populationCategory: "PERMANENT",
    improvement: null,
  },
  HUNT_GAME: {
    command: "HUNT_GAME",
    technology: "HUNTING",
    terrain: "FOREST",
    resource: "GAME",
    cost: 2,
    population: 1,
    populationCategory: "PERMANENT",
    improvement: null,
  },
  BUILD_FARM: {
    command: "BUILD_FARM",
    technology: "FARMING",
    terrain: "GRASS",
    resource: "FERTILE_GROUND",
    cost: 5,
    population: 2,
    populationCategory: "LIVE",
    improvement: "FARM",
  },
  BUILD_LUMBER_CAMP: {
    command: "BUILD_LUMBER_CAMP",
    technology: "FORESTRY",
    terrain: "FOREST",
    resource: null,
    cost: 3,
    population: 1,
    populationCategory: "LIVE",
    improvement: "LUMBER_CAMP",
  },
  BUILD_MINE: {
    command: "BUILD_MINE",
    technology: "MINING",
    terrain: "MOUNTAIN",
    resource: "ORE",
    cost: 5,
    population: 2,
    populationCategory: "LIVE",
    improvement: "MINE",
  },
  BUILD_QUARRY: {
    command: "BUILD_QUARRY",
    technology: "QUARRYING",
    terrain: "MOUNTAIN",
    resource: "STONE",
    cost: 4,
    population: 1,
    populationCategory: "LIVE",
    improvement: "QUARRY",
  },
} satisfies Readonly<
  Record<BasicEconomicCommandKindV6, BasicEconomicActionRuleV6>
>);

export const SPATIAL_ECONOMIC_ACTIONS_V6 = deepFreeze({
  BUILD_WINDMILL: {
    command: "BUILD_WINDMILL",
    technology: "MILLING",
    cost: 5,
    improvement: "WINDMILL",
    placementMinimum: 1,
  },
  BUILD_SAWMILL: {
    command: "BUILD_SAWMILL",
    technology: "SAWMILLING",
    cost: 5,
    improvement: "SAWMILL",
    placementMinimum: 1,
  },
  BUILD_FORGE: {
    command: "BUILD_FORGE",
    technology: "METALLURGY",
    cost: 5,
    improvement: "FORGE",
    placementMinimum: 0,
  },
  BUILD_STONEWORKS: {
    command: "BUILD_STONEWORKS",
    technology: "MASONRY",
    cost: 5,
    improvement: "STONEWORKS",
    placementMinimum: 0,
  },
  BUILD_WORKSHOP: {
    command: "BUILD_WORKSHOP",
    technology: "CRAFT",
    cost: 4,
    improvement: "WORKSHOP",
    placementMinimum: 2,
  },
  BUILD_GRAND_WORKS: {
    command: "BUILD_GRAND_WORKS",
    technology: "GRAND_WORKS",
    cost: 7,
    improvement: "GRAND_WORKS",
    placementMinimum: 3,
  },
  BUILD_MARKET: {
    command: "BUILD_MARKET",
    technology: "COMMERCE",
    cost: 7,
    improvement: "MARKET",
    placementMinimum: 2,
  },
} satisfies Readonly<
  Record<SpatialEconomicCommandKindV6, SpatialEconomicActionRuleV6>
>);

function node(
  id: TechnologyId,
  branch: TechnologyBranchIdV6,
  tier: 1 | 2 | 3,
  prerequisites: readonly TechnologyId[] = [],
  unlocks: readonly TechnologyUnlockV6[] = [],
): TechnologyNodeV6 {
  const unlockedRoles = unlocks.flatMap((unlock) =>
    unlock.kind === "UNIT_ROLE" ? [unlock.role] : [],
  );
  return deepFreeze({
    id,
    branch,
    tier,
    prerequisites: [...prerequisites],
    unlocks: [...unlocks],
    unlockedRoles: [...unlockedRoles],
  });
}

/** The single frozen baseline graph shared explicitly by both registrations. */
export const BASELINE_TECHNOLOGY_NODES_V6 = deepFreeze([
  node(
    "GATHERING",
    "SETTLEMENT",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["FRUIT", "FERTILE_GROUND"] },
      { kind: "COMMAND", command: "HARVEST_FRUIT" },
    ],
  ),
  node(
    "FARMING",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "COMMAND", command: "BUILD_FARM" },
      { kind: "CONNECTED_FARM_VISUALS" },
    ],
  ),
  node(
    "MILLING",
    "SETTLEMENT",
    3,
    ["FARMING"],
    [
      { kind: "COMMAND", command: "BUILD_WINDMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WINDMILL",
        formula: "CONNECTED_ORTHOGONAL_CLUSTER",
      },
    ],
  ),
  node(
    "CRAFT",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
    ],
  ),
  node(
    "GRAND_WORKS",
    "SETTLEMENT",
    3,
    ["CRAFT"],
    [
      { kind: "COMMAND", command: "BUILD_GRAND_WORKS" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "GRAND_WORKS",
        formula: "DISTINCT_PROCESSOR_TYPES",
      },
      { kind: "COMMAND", command: "REDEVELOP" },
    ],
  ),
  node(
    "HUNTING",
    "WILDS",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["GAME"] },
      { kind: "COMMAND", command: "HUNT_GAME" },
    ],
  ),
  node(
    "FORESTRY",
    "WILDS",
    2,
    ["HUNTING"],
    [
      { kind: "COMMAND", command: "BUILD_LUMBER_CAMP" },
      { kind: "COMMAND", command: "CLEAR_FOREST" },
    ],
  ),
  node(
    "SAWMILLING",
    "WILDS",
    3,
    ["FORESTRY"],
    [
      { kind: "COMMAND", command: "BUILD_SAWMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "SAWMILL",
        formula: "CONNECTED_ORTHOGONAL_CLUSTER",
      },
    ],
  ),
  node(
    "MARKSMANSHIP",
    "WILDS",
    2,
    ["HUNTING"],
    [{ kind: "UNIT_ROLE", role: "MARKSMAN" }],
  ),
  node(
    "FIELDCRAFT",
    "WILDS",
    3,
    ["MARKSMANSHIP"],
    [
      { kind: "FOREST_MOVEMENT_FREEDOM", roles: ["SCOUT", "MARKSMAN"] },
      { kind: "COMMAND", command: "REPLANT_FOREST" },
    ],
  ),
  node(
    "SURVEYING",
    "INDUSTRY",
    1,
    [],
    [
      { kind: "MOUNTAIN_MOVEMENT" },
      { kind: "RESOURCE_REVEAL", resources: ["ORE", "STONE"] },
      { kind: "HIGH_GROUND_VISION", radiusBonus: 1 },
    ],
  ),
  node(
    "MINING",
    "INDUSTRY",
    2,
    ["SURVEYING"],
    [{ kind: "COMMAND", command: "BUILD_MINE" }],
  ),
  node(
    "METALLURGY",
    "INDUSTRY",
    3,
    ["MINING"],
    [
      { kind: "COMMAND", command: "BUILD_FORGE" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "FORGE",
        formula: "ADJACENT_MINES",
      },
      { kind: "UNIT_ROLE", role: "HEAVY" },
    ],
  ),
  node(
    "QUARRYING",
    "INDUSTRY",
    2,
    ["SURVEYING"],
    [{ kind: "COMMAND", command: "BUILD_QUARRY" }],
  ),
  node(
    "MASONRY",
    "INDUSTRY",
    3,
    ["QUARRYING"],
    [
      { kind: "COMMAND", command: "BUILD_STONEWORKS" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "STONEWORKS",
        formula: "ADJACENT_QUARRIES_AND_OPPOSITE_PAIRS",
      },
    ],
  ),
  node(
    "SCOUTING",
    "MOBILITY",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "SCOUT" },
      { kind: "ROLE_SIGHT", role: "SCOUT", radius: 2 },
    ],
  ),
  node(
    "ROADS",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [
      { kind: "COMMAND", command: "BUILD_ROAD" },
      {
        kind: "ROAD_MOVEMENT",
        ordinaryStepCost2: 2,
        connectedOrthogonalStepCost2: 1,
      },
    ],
  ),
  node(
    "COMMERCE",
    "MOBILITY",
    3,
    ["ROADS"],
    [
      { kind: "COMMAND", command: "BUILD_MARKET" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "MARKET",
        formula: "DISTINCT_ECONOMIC_FAMILIES",
      },
      { kind: "MARKET_CAPITAL_ROAD_BONUS", coins: 1 },
    ],
  ),
  node(
    "RAIDING",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [{ kind: "UNIT_ROLE", role: "RAIDER" }],
  ),
  node(
    "MANEUVER",
    "MOBILITY",
    3,
    ["RAIDING"],
    [{ kind: "IGNORE_HOSTILE_ZOC", roles: ["SCOUT", "RAIDER"] }],
  ),
  node("DRILL", "WARFARE", 1, [], [{ kind: "UNIT_ROLE", role: "GUARD" }]),
  node(
    "FORTIFICATION",
    "WARFARE",
    2,
    ["DRILL"],
    [
      {
        kind: "FRIENDLY_CITY_FORTIFICATION",
        roles: ["FIGHTER", "GUARD"],
        defenseNumerator: 2,
        defenseDenominator: 1,
      },
    ],
  ),
  node(
    "EXPLOSIVES",
    "WARFARE",
    3,
    ["FORTIFICATION"],
    [{ kind: "UNIT_ROLE", role: "BREACHER" }],
  ),
  node(
    "MEDICINE",
    "WARFARE",
    2,
    ["DRILL"],
    [
      { kind: "UNIT_ROLE", role: "MEDIC" },
      { kind: "MEDIC_HEAL", amount: 4 },
    ],
  ),
  node(
    "RECOVERY",
    "WARFARE",
    3,
    ["MEDICINE"],
    [
      { kind: "MEDIC_HEAL", amount: 6 },
      { kind: "FRIENDLY_IDLE_RECOVERY", amount: 6 },
    ],
  ),
] as const);

const ORIGINAL_LABELS: Readonly<Record<UnitRoleId, string>> = deepFreeze({
  FIGHTER: "Fighter",
  SCOUT: "Scout",
  MARKSMAN: "Marksman",
  GUARD: "Guard",
  RAIDER: "Raider",
  MEDIC: "Medic",
  HEAVY: "Heavy",
  BREACHER: "Breacher",
  JUGGERNAUT: "Juggernaut",
});

const CANDY_LABELS: Readonly<Record<UnitRoleId, string>> = deepFreeze({
  FIGHTER: "Candy Warrior",
  SCOUT: "Jelly Scout",
  MARKSMAN: "Gumball Guard",
  GUARD: "Choco Engineer",
  RAIDER: "Donut",
  MEDIC: "Marshmallow Medic",
  HEAVY: "Jawbreaker",
  BREACHER: "Candy Crusher",
  JUGGERNAUT: "Sugar Titan",
});

type BaseRoleInput = Omit<EffectiveRoleRuleV6, "label">;

const BASE_ROLE_RULES: Readonly<Record<UnitRoleId, BaseRoleInput>> = deepFreeze(
  {
    FIGHTER: {
      role: "FIGHTER",
      cost: 2,
      maxHp: 10,
      attack2: 4,
      defense2: 4,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: null,
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE"],
    },
    SCOUT: {
      role: "SCOUT",
      cost: 3,
      maxHp: 10,
      attack2: 3,
      defense2: 2,
      move: 2,
      range: 1,
      sightRadius: 2,
      technology: "SCOUTING",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE", "IGNORE_ZOC_WITH_MANEUVER"],
    },
    MARKSMAN: {
      role: "MARKSMAN",
      cost: 3,
      maxHp: 10,
      attack2: 4,
      defense2: 2,
      move: 1,
      range: 2,
      sightRadius: 1,
      technology: "MARKSMANSHIP",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE"],
    },
    GUARD: {
      role: "GUARD",
      cost: 3,
      maxHp: 15,
      attack2: 3,
      defense2: 6,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: "DRILL",
      mayUsePrimaryActionAfterMove: false,
      abilities: ["ATTACK", "CAPTURE"],
    },
    RAIDER: {
      role: "RAIDER",
      cost: 4,
      maxHp: 10,
      attack2: 5,
      defense2: 3,
      move: 2,
      range: 1,
      sightRadius: 1,
      technology: "RAIDING",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE", "CHARGE", "IGNORE_ZOC_WITH_MANEUVER"],
    },
    MEDIC: {
      role: "MEDIC",
      cost: 4,
      maxHp: 10,
      attack2: 1,
      defense2: 3,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: "MEDICINE",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "HEAL_ADJACENT"],
    },
    HEAVY: {
      role: "HEAVY",
      cost: 5,
      maxHp: 15,
      attack2: 6,
      defense2: 6,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: "METALLURGY",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE", "PUSH"],
    },
    BREACHER: {
      role: "BREACHER",
      cost: 5,
      maxHp: 10,
      attack2: 8,
      defense2: 2,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: "EXPLOSIVES",
      mayUsePrimaryActionAfterMove: false,
      abilities: ["ATTACK", "BREACH"],
    },
    JUGGERNAUT: {
      role: "JUGGERNAUT",
      cost: null,
      maxHp: 40,
      attack2: 8,
      defense2: 8,
      move: 1,
      range: 1,
      sightRadius: 1,
      technology: null,
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE", "PUSH"],
    },
  },
);

function makeRoleRules(
  labels: Readonly<Record<UnitRoleId, string>>,
  candy: boolean,
): Readonly<Record<UnitRoleId, EffectiveRoleRuleV6>> {
  const rules = Object.fromEntries(
    UNIT_ROLE_IDS.map((role) => {
      const baseline = BASE_ROLE_RULES[role];
      const rule: EffectiveRoleRuleV6 =
        candy && role === "RAIDER"
          ? {
              role,
              label: labels[role],
              cost: 3,
              maxHp: 10,
              attack2: 0,
              defense2: 2,
              move: 1,
              range: 0,
              sightRadius: 1,
              technology: "RAIDING",
              mayUsePrimaryActionAfterMove: false,
              abilities: [
                "CANDIFY",
                "CAPTURE",
                "KAMIKAZE_ROLL",
                "IGNORE_ZOC_WITH_MANEUVER",
              ],
            }
          : {
              ...baseline,
              label: labels[role],
              abilities: [
                ...baseline.abilities,
                ...(candy ? (["CANDIFY"] as const) : []),
                ...(candy && role === "GUARD"
                  ? (["BUILD_CHOCOLATE_WALL"] as const)
                  : []),
              ],
            };
      return [role, deepFreeze(rule)] as const;
    }),
  ) as Record<UnitRoleId, EffectiveRoleRuleV6>;
  return deepFreeze(rules);
}

export const ORIGINAL_BASELINE_TREE = deepFreeze({
  id: "ORIGINAL_BASELINE",
  faction: "ORIGINAL",
  startingTechIds: ["GATHERING"],
  nodes: BASELINE_TECHNOLOGY_NODES_V6,
  roleRules: makeRoleRules(ORIGINAL_LABELS, false),
} satisfies FactionTechnologyTreeV6);

export const CANDY_BASELINE_TREE_V1 = deepFreeze({
  id: "CANDY_BASELINE_V1",
  faction: "CANDY",
  startingTechIds: ["GATHERING"],
  nodes: BASELINE_TECHNOLOGY_NODES_V6,
  roleRules: makeRoleRules(CANDY_LABELS, true),
} satisfies FactionTechnologyTreeV6);

export const FACTION_TECHNOLOGY_TREES_V6 = deepFreeze({
  ORIGINAL_BASELINE: ORIGINAL_BASELINE_TREE,
  CANDY_BASELINE_V1: CANDY_BASELINE_TREE_V1,
} satisfies Readonly<Record<FactionTreeId, FactionTechnologyTreeV6>>);

const FACTION_TREE_BY_FACTION = deepFreeze({
  ORIGINAL: ORIGINAL_BASELINE_TREE,
  CANDY: CANDY_BASELINE_TREE_V1,
} satisfies Readonly<Record<FactionIdV6, FactionTechnologyTreeV6>>);

export const RULESET_6: RulesetDefinitionV6 = deepFreeze({
  id: RULESET_6_ID,
  version: 6,
  boardSizes: [11, 14, 16, 20, 25],
  playerCount: { minimum: 2, maximum: 4 },
  startingCoins: 5,
  factionTreeIds: FACTION_TREE_IDS,
  technologies: BASELINE_TECHNOLOGY_NODES_V6,
});

export function getFactionTechnologyTreeV6(
  id: string,
): FactionTechnologyTreeV6 | undefined {
  return Object.prototype.hasOwnProperty.call(FACTION_TECHNOLOGY_TREES_V6, id)
    ? FACTION_TECHNOLOGY_TREES_V6[id as FactionTreeId]
    : undefined;
}

export function requireFactionTechnologyTreeV6(
  id: string,
): FactionTechnologyTreeV6 {
  const tree = getFactionTechnologyTreeV6(id);
  if (tree === undefined) throw new RangeError(`Unknown faction tree: ${id}`);
  return tree;
}

export function factionTechnologyTreeV6(
  faction: FactionIdV6,
): FactionTechnologyTreeV6 {
  return FACTION_TREE_BY_FACTION[faction];
}

export function effectiveRoleRuleV6(
  faction: FactionIdV6,
  role: UnitRoleId,
): EffectiveRoleRuleV6 {
  return factionTechnologyTreeV6(faction).roleRules[role];
}

export function technologyResearchCostV6(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
): number {
  if (
    (tier !== 1 && tier !== 2 && tier !== 3) ||
    !Number.isSafeInteger(ownedCityCount) ||
    ownedCityCount < 1
  ) {
    throw new RangeError("ownedCityCount must be a positive safe integer");
  }
  const multiplier = tier;
  const base = tier === 1 ? 5 : tier === 2 ? 7 : 9;
  const cost = base + multiplier * (ownedCityCount - 1);
  if (!Number.isSafeInteger(cost)) throw new RangeError("INTEGER_OVERFLOW");
  return cost;
}

export interface TechnologyCapabilitiesV6 {
  readonly treeId: FactionTreeId;
  readonly resourceReveals: readonly ResourceId[];
  readonly commands: readonly TechnologyUnlockedCommandV6[];
  readonly trainableRoles: readonly UnitRoleId[];
  readonly roleBindings: Readonly<Record<UnitRoleId, EffectiveRoleRuleV6>>;
  readonly economicFormulas: readonly Extract<
    TechnologyUnlockV6,
    { readonly kind: "ECONOMIC_FORMULA" }
  >[];
  readonly connectedFarmVisuals: boolean;
  readonly forestMovementFreedomRoles: readonly UnitRoleId[];
  readonly mountainMovement: boolean;
  readonly highGroundVisionRadiusBonus: 0 | 1;
  readonly roleSightRadius: Readonly<Partial<Record<UnitRoleId, number>>>;
  readonly roadMovement: {
    readonly ordinaryStepCost2: 2;
    readonly connectedOrthogonalStepCost2: 1;
  } | null;
  readonly marketCapitalRoadBonusCoins: 0 | 1;
  readonly ignoreHostileZocRoles: readonly UnitRoleId[];
  readonly friendlyCityFortification: {
    readonly roles: readonly UnitRoleId[];
    readonly defenseNumerator: 2;
    readonly defenseDenominator: 1;
  } | null;
  readonly medicHealAmount: 0 | 4 | 6;
  readonly friendlyIdleRecoveryAmount: 0 | 6;
}

/**
 * Resolves every currently owned technology effect through the explicit tree
 * registration. Downstream reducers consume this object rather than inferring
 * capabilities from faction labels or duplicating technology checks.
 */
export function technologyCapabilitiesV6(
  treeId: FactionTreeId,
  researchedTechs: readonly TechnologyId[],
): TechnologyCapabilitiesV6 {
  const tree = requireFactionTechnologyTreeV6(treeId);
  const researched = new Set(researchedTechs);
  const unlocks = tree.nodes
    .filter((technology) => researched.has(technology.id))
    .flatMap((technology) => technology.unlocks);
  const resourceReveals = new Set<ResourceId>();
  const commands = new Set<TechnologyUnlockedCommandV6>();
  const trainableRoles = new Set<UnitRoleId>();
  const economicFormulas: Extract<
    TechnologyUnlockV6,
    { readonly kind: "ECONOMIC_FORMULA" }
  >[] = [];
  const forestMovementFreedomRoles = new Set<UnitRoleId>();
  const roleSightRadius: Partial<Record<UnitRoleId, number>> = {};
  const ignoreHostileZocRoles = new Set<UnitRoleId>();
  let connectedFarmVisuals = false;
  let mountainMovement = false;
  let highGroundVisionRadiusBonus: 0 | 1 = 0;
  let roadMovement: TechnologyCapabilitiesV6["roadMovement"] = null;
  let marketCapitalRoadBonusCoins: 0 | 1 = 0;
  let friendlyCityFortification: TechnologyCapabilitiesV6["friendlyCityFortification"] =
    null;
  let medicHealAmount: 0 | 4 | 6 = 0;
  let friendlyIdleRecoveryAmount: 0 | 6 = 0;

  for (const unlock of unlocks) {
    switch (unlock.kind) {
      case "COMMAND":
        commands.add(unlock.command);
        break;
      case "RESOURCE_REVEAL":
        unlock.resources.forEach((resource) => resourceReveals.add(resource));
        break;
      case "UNIT_ROLE":
        trainableRoles.add(unlock.role);
        break;
      case "ECONOMIC_FORMULA":
        economicFormulas.push(unlock);
        break;
      case "CONNECTED_FARM_VISUALS":
        connectedFarmVisuals = true;
        break;
      case "FOREST_MOVEMENT_FREEDOM":
        unlock.roles.forEach((role) => forestMovementFreedomRoles.add(role));
        break;
      case "MOUNTAIN_MOVEMENT":
        mountainMovement = true;
        break;
      case "HIGH_GROUND_VISION":
        highGroundVisionRadiusBonus = unlock.radiusBonus;
        break;
      case "ROLE_SIGHT":
        roleSightRadius[unlock.role] = unlock.radius;
        break;
      case "ROAD_MOVEMENT":
        roadMovement = {
          ordinaryStepCost2: unlock.ordinaryStepCost2,
          connectedOrthogonalStepCost2: unlock.connectedOrthogonalStepCost2,
        };
        break;
      case "MARKET_CAPITAL_ROAD_BONUS":
        marketCapitalRoadBonusCoins = unlock.coins;
        break;
      case "IGNORE_HOSTILE_ZOC":
        unlock.roles.forEach((role) => ignoreHostileZocRoles.add(role));
        break;
      case "FRIENDLY_CITY_FORTIFICATION":
        friendlyCityFortification = {
          roles: [...unlock.roles],
          defenseNumerator: unlock.defenseNumerator,
          defenseDenominator: unlock.defenseDenominator,
        };
        break;
      case "MEDIC_HEAL":
        medicHealAmount = unlock.amount;
        break;
      case "FRIENDLY_IDLE_RECOVERY":
        friendlyIdleRecoveryAmount = unlock.amount;
        break;
    }
  }

  return deepFreeze({
    treeId,
    resourceReveals: RESOURCE_IDS.filter((resource) =>
      resourceReveals.has(resource),
    ),
    commands: COMMAND_KIND_ORDER_V6.filter((command) =>
      commands.has(command as TechnologyUnlockedCommandV6),
    ) as readonly TechnologyUnlockedCommandV6[],
    trainableRoles: UNIT_ROLE_IDS.filter((role) => trainableRoles.has(role)),
    roleBindings: tree.roleRules,
    economicFormulas,
    connectedFarmVisuals,
    forestMovementFreedomRoles: UNIT_ROLE_IDS.filter((role) =>
      forestMovementFreedomRoles.has(role),
    ),
    mountainMovement,
    highGroundVisionRadiusBonus,
    roleSightRadius,
    roadMovement,
    marketCapitalRoadBonusCoins,
    ignoreHostileZocRoles: UNIT_ROLE_IDS.filter((role) =>
      ignoreHostileZocRoles.has(role),
    ),
    friendlyCityFortification,
    medicHealAmount,
    friendlyIdleRecoveryAmount,
  });
}

/** Defensive assertion used by schema tests and future ruleset registration. */
export function assertRuleset6Registry(): void {
  if (
    BASELINE_TECHNOLOGY_NODES_V6.length !== TECHNOLOGY_IDS.length ||
    !BASELINE_TECHNOLOGY_NODES_V6.every(
      (technology, index) => technology.id === TECHNOLOGY_IDS[index],
    )
  ) {
    throw new Error("Ruleset-6 technology registry is not in frozen order");
  }
  for (const treeId of FACTION_TREE_IDS) {
    const tree = requireFactionTechnologyTreeV6(treeId);
    if (!validateFactionTechnologyTreeV6(tree)) {
      throw new Error(
        `Faction tree ${treeId} is incomplete or does not register the baseline graph`,
      );
    }
  }
}

export function validateFactionTechnologyTreeV6(
  tree: FactionTechnologyTreeV6,
): boolean {
  const expectedId =
    tree.faction === "ORIGINAL"
      ? "ORIGINAL_BASELINE"
      : tree.faction === "CANDY"
        ? "CANDY_BASELINE_V1"
        : null;
  if (
    tree.id !== expectedId ||
    tree.startingTechIds.length !== 1 ||
    tree.startingTechIds[0] !== "GATHERING" ||
    tree.nodes.length !== BASELINE_TECHNOLOGY_NODES_V6.length ||
    Reflect.ownKeys(tree.roleRules).length !== UNIT_ROLE_IDS.length
  ) {
    return false;
  }
  for (let index = 0; index < BASELINE_TECHNOLOGY_NODES_V6.length; index += 1) {
    const actual = tree.nodes[index];
    const expected = BASELINE_TECHNOLOGY_NODES_V6[index];
    if (
      actual === undefined ||
      expected === undefined ||
      actual.id !== expected.id ||
      actual.branch !== expected.branch ||
      actual.tier !== expected.tier ||
      !sameOrderedValues(actual.prerequisites, expected.prerequisites) ||
      canonicalUnlocks(actual.unlocks) !== canonicalUnlocks(expected.unlocks) ||
      !sameOrderedValues(actual.unlockedRoles, expected.unlockedRoles)
    ) {
      return false;
    }
  }
  return UNIT_ROLE_IDS.every((role) => {
    const rule = tree.roleRules[role];
    return rule !== undefined && rule.role === role;
  });
}

function canonicalUnlocks(unlocks: readonly TechnologyUnlockV6[]): string {
  return JSON.stringify(unlocks);
}

function sameOrderedValues<T>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
