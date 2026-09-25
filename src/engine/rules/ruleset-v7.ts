import { deepFreeze } from "../model/freeze";
import {
  COMMAND_KIND_ORDER_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CommandKindV7,
  type ImprovementIdV7,
  type ResourceIdV7,
  type TechnologyIdV7,
  type TerrainIdV7,
  type UnitRoleIdV7,
} from "../v7/types";

export const TECHNOLOGY_BRANCH_IDS_V7 = deepFreeze([
  "SETTLEMENT",
  "WILDS",
  "MOBILITY",
  "INDUSTRY",
  "NAVAL",
] as const);
export type TechnologyBranchIdV7 = (typeof TECHNOLOGY_BRANCH_IDS_V7)[number];

export type TechnologyUnlockedCommandV7 = Extract<
  CommandKindV7,
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_FIELD_DEFENSE"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP"
  | "PILLAGE"
  | "DISBAND"
  | "HARVEST_FISH"
  | "GATHER_PEARLS"
  | "BUILD_PORT"
  | "BUILD_SHIPYARD"
  | "CULTIVATE_FOREST"
  | "BLAST_MOUNTAIN"
  | "LAND_GRANT"
>;

export type TechnologyUnlockV7 =
  | { readonly kind: "COMMAND"; readonly command: TechnologyUnlockedCommandV7 }
  | {
      readonly kind: "RESOURCE_REVEAL";
      readonly resources: readonly ResourceIdV7[];
    }
  | { readonly kind: "UNIT_ROLE"; readonly role: UnitRoleIdV7 }
  | {
      readonly kind: "ECONOMIC_FORMULA";
      readonly improvement: ImprovementIdV7;
      readonly formula:
        | "ADJACENT_FRIENDLY_CONTRIBUTORS"
        | "DISTINCT_BASIC_TYPES"
        | "DISTINCT_ECONOMIC_FAMILIES";
    }
  | { readonly kind: "CONNECTED_FARM_VISUALS" }
  | {
      readonly kind: "FOREST_MOVEMENT_FREEDOM";
      readonly roles: readonly UnitRoleIdV7[];
    }
  | { readonly kind: "MOUNTAIN_MOVEMENT" }
  | { readonly kind: "HIGH_GROUND_VISION"; readonly radiusBonus: 1 }
  | {
      readonly kind: "ROLE_SIGHT";
      readonly role: UnitRoleIdV7;
      readonly radius: 2;
    }
  | {
      readonly kind: "ROAD_MOVEMENT";
      readonly ordinaryStepCost2: 2;
      readonly connectedOrthogonalStepCost2: 1;
    }
  | { readonly kind: "OWNED_CITY_CAPACITY_BONUS"; readonly capacity: 1 }
  | { readonly kind: "ADJACENT_START_TURN_HEALING"; readonly amount: 6 }
  | { readonly kind: "LAND_ROAD_POPULATION"; readonly amount: 1 }
  | { readonly kind: "MARKET_INCOME_MULTIPLIER"; readonly multiplier: 2 }
  | { readonly kind: "ARMS_INDUSTRY_DISCOUNT"; readonly coins: 1 }
  | { readonly kind: "LAND_TRADE_INCOME"; readonly coins: 1 }
  | { readonly kind: "SEA_TRADE_INCOME"; readonly coins: 1 }
  | { readonly kind: "CAPTAIN_SUPPORT" }
  | { readonly kind: "OVERRUN" }
  | {
      readonly kind: "CHARGE_BONUS";
      readonly attack: 1;
      readonly minimumMove: 2;
    }
  | { readonly kind: "MELEE_FIELD_DEMOLITION" }
  | { readonly kind: "NAVAL_TRAINING_DISCOUNT"; readonly coins: 2 }
  | { readonly kind: "FIRST_HOSTILE_CAPTURE_SPOILS"; readonly coins: 2 };

export interface TechnologyNodeV7 {
  readonly id: TechnologyIdV7;
  readonly branch: TechnologyBranchIdV7;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyIdV7[];
  readonly unlocks: readonly TechnologyUnlockV7[];
  readonly unlockedRoles: readonly UnitRoleIdV7[];
}

export type UnitRoleAbilityV7 =
  | "ATTACK"
  | "CAPTURE"
  | "CHARGE"
  | "RALLY"
  | "TEND_WOUNDED"
  | "OVERRUN"
  | "PUSH";

export interface EffectiveRoleRuleV7 {
  readonly role: UnitRoleIdV7;
  readonly label: string;
  readonly tacticalRole:
    | "LINE"
    | "SKIRMISHER"
    | "RANGED"
    | "DEFENDER"
    | "SUPPORT"
    | "SIEGE"
    | "BREAKTHROUGH"
    | "MYTHIC"
    | "NAVAL_SCREEN"
    | "NAVAL_CAPITAL";
  readonly cost: number | null;
  readonly maxHp: number;
  readonly attack2: number;
  readonly defense2: number;
  readonly move: number;
  readonly range: number;
  readonly minimumRange: number;
  readonly sightRadius: number;
  readonly technology: TechnologyIdV7 | null;
  readonly mayUsePrimaryActionAfterMove: boolean;
  readonly abilities: readonly UnitRoleAbilityV7[];
}

export interface FactionTechnologyTreeV7 {
  readonly id: "ORIGINAL_BASELINE_V5";
  readonly faction: "ORIGINAL";
  readonly startingTechIds: readonly ["GATHERING"];
  readonly nodes: readonly TechnologyNodeV7[];
  readonly roleRules: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
}

export type BasicEconomicCommandKindV7 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "HARVEST_FISH"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE";
export interface BasicEconomicActionRuleV7 {
  readonly command: BasicEconomicCommandKindV7;
  readonly technology: TechnologyIdV7;
  readonly terrain: TerrainIdV7;
  readonly resource: ResourceIdV7 | null;
  readonly cost: number;
  readonly population: number;
  readonly populationCategory: "PERMANENT" | "LIVE";
  readonly improvement: ImprovementIdV7 | null;
}
export const BASIC_ECONOMIC_ACTIONS_V7 = deepFreeze({
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
  HARVEST_FISH: {
    command: "HARVEST_FISH",
    technology: "SHORECRAFT",
    terrain: "SHALLOW_WATER",
    resource: "FISH",
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
    technology: "ENGINEERING",
    terrain: "MOUNTAIN",
    resource: "ORE",
    cost: 5,
    population: 2,
    populationCategory: "LIVE",
    improvement: "MINE",
  },
} satisfies Readonly<
  Record<BasicEconomicCommandKindV7, BasicEconomicActionRuleV7>
>);

export type SpatialEconomicCommandKindV7 =
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_MARKET";
export interface SpatialEconomicActionRuleV7 {
  readonly command: SpatialEconomicCommandKindV7;
  readonly technology: TechnologyIdV7;
  readonly cost: number;
  readonly improvement: ImprovementIdV7;
  readonly placementMinimum: number;
}
export const SPATIAL_ECONOMIC_ACTIONS_V7 = deepFreeze({
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
    cost: 6,
    improvement: "FORGE",
    placementMinimum: 1,
  },
  BUILD_WORKSHOP: {
    command: "BUILD_WORKSHOP",
    technology: "ENGINEERING",
    cost: 4,
    improvement: "WORKSHOP",
    placementMinimum: 1,
  },
  BUILD_MARKET: {
    command: "BUILD_MARKET",
    technology: "ADMINISTRATION",
    cost: 6,
    improvement: "MARKET",
    placementMinimum: 1,
  },
} satisfies Readonly<
  Record<SpatialEconomicCommandKindV7, SpatialEconomicActionRuleV7>
>);

function node(
  id: TechnologyIdV7,
  branch: TechnologyBranchIdV7,
  tier: 1 | 2 | 3,
  prerequisites: readonly TechnologyIdV7[] = [],
  unlocks: readonly TechnologyUnlockV7[] = [],
): TechnologyNodeV7 {
  return deepFreeze({
    id,
    branch,
    tier,
    prerequisites: [...prerequisites],
    unlocks: [...unlocks],
    unlockedRoles: unlocks.flatMap((unlock) =>
      unlock.kind === "UNIT_ROLE" ? [unlock.role] : [],
    ),
  });
}

export const ORIGINAL_BASELINE_V5_NODES = deepFreeze([
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
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "ADJACENT_START_TURN_HEALING", amount: 6 },
    ],
  ),
  node(
    "ADMINISTRATION",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "UNIT_ROLE", role: "CAPTAIN" },
      { kind: "CAPTAIN_SUPPORT" },
      { kind: "COMMAND", command: "BUILD_MARKET" },
      { kind: "COMMAND", command: "DISBAND" },
    ],
  ),
  node(
    "PLANNING",
    "SETTLEMENT",
    3,
    ["ADMINISTRATION"],
    [
      { kind: "OWNED_CITY_CAPACITY_BONUS", capacity: 1 },
      { kind: "COMMAND", command: "LAND_GRANT" },
    ],
  ),
  node("HUNTING", "WILDS", 1, [], [{ kind: "COMMAND", command: "HUNT_GAME" }]),
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
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "UNIT_ROLE", role: "CATAPULT" },
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
      { kind: "COMMAND", command: "REPLANT_FOREST" },
      { kind: "FOREST_MOVEMENT_FREEDOM", roles: ["RAIDER", "MARKSMAN"] },
      { kind: "ROLE_SIGHT", role: "MARKSMAN", radius: 2 },
    ],
  ),
  node(
    "SCOUTING",
    "MOBILITY",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "RAIDER" },
      { kind: "ROLE_SIGHT", role: "RAIDER", radius: 2 },
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
      { kind: "LAND_ROAD_POPULATION", amount: 1 },
    ],
  ),
  node(
    "COMMERCE",
    "MOBILITY",
    3,
    ["ROADS"],
    [
      { kind: "LAND_TRADE_INCOME", coins: 1 },
      { kind: "MARKET_INCOME_MULTIPLIER", multiplier: 2 },
    ],
  ),
  node(
    "RAIDING",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [
      { kind: "COMMAND", command: "PILLAGE" },
      { kind: "CHARGE_BONUS", attack: 1, minimumMove: 2 },
    ],
  ),
  node(
    "CHIVALRY",
    "MOBILITY",
    3,
    ["RAIDING"],
    [
      { kind: "UNIT_ROLE", role: "KNIGHT" },
      { kind: "OVERRUN" },
      { kind: "COMMAND", command: "CULTIVATE_FOREST" },
    ],
  ),
  node(
    "DRILL",
    "INDUSTRY",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["ORE"] },
      { kind: "UNIT_ROLE", role: "GUARD" },
      { kind: "FIRST_HOSTILE_CAPTURE_SPOILS", coins: 2 },
    ],
  ),
  node(
    "ENGINEERING",
    "INDUSTRY",
    2,
    ["DRILL"],
    [
      { kind: "MOUNTAIN_MOVEMENT" },
      { kind: "HIGH_GROUND_VISION", radiusBonus: 1 },
      { kind: "COMMAND", command: "BUILD_MINE" },
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      { kind: "COMMAND", command: "REDEVELOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
    ],
  ),
  node(
    "METALLURGY",
    "INDUSTRY",
    3,
    ["ENGINEERING"],
    [
      { kind: "COMMAND", command: "BUILD_FORGE" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "FORGE",
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "ARMS_INDUSTRY_DISCOUNT", coins: 1 },
    ],
  ),
  node(
    "FORTIFICATION",
    "INDUSTRY",
    2,
    ["DRILL"],
    [{ kind: "COMMAND", command: "BUILD_FIELD_DEFENSE" }],
  ),
  node(
    "EXPLOSIVES",
    "INDUSTRY",
    3,
    ["FORTIFICATION"],
    [
      { kind: "COMMAND", command: "BLAST_MOUNTAIN" },
      { kind: "MELEE_FIELD_DEMOLITION" },
    ],
  ),
  node(
    "SHORECRAFT",
    "NAVAL",
    1,
    [],
    [
      { kind: "COMMAND", command: "HARVEST_FISH" },
      { kind: "COMMAND", command: "BUILD_PORT" },
      { kind: "UNIT_ROLE", role: "PATROL_BOAT" },
    ],
  ),
  node(
    "NAVIGATION",
    "NAVAL",
    2,
    ["SHORECRAFT"],
    [
      { kind: "COMMAND", command: "GATHER_PEARLS" },
      { kind: "SEA_TRADE_INCOME", coins: 1 },
    ],
  ),
  node(
    "NAVAL_ENGINEERING",
    "NAVAL",
    3,
    ["NAVIGATION"],
    [
      { kind: "UNIT_ROLE", role: "BATTLESHIP" },
      { kind: "COMMAND", command: "BUILD_SHIPYARD" },
      { kind: "NAVAL_TRAINING_DISCOUNT", coins: 2 },
    ],
  ),
] as const);

const role = (input: EffectiveRoleRuleV7): EffectiveRoleRuleV7 =>
  deepFreeze(input);
export const ORIGINAL_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    label: "Fighter",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Raider",
    tacticalRole: "SKIRMISHER",
    cost: 4,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Marksman",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Guard",
    tacticalRole: "DEFENDER",
    cost: 3,
    maxHp: 15,
    attack2: 3,
    defense2: 6,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Captain",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 10,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY", "TEND_WOUNDED"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Catapult",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    attack2: 7,
    defense2: 1,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Knight",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 10,
    attack2: 6,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "OVERRUN"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Juggernaut",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 40,
    attack2: 8,
    defense2: 8,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH"],
  }),
  PATROL_BOAT: role({
    role: "PATROL_BOAT",
    label: "Patrol Boat",
    tacticalRole: "NAVAL_SCREEN",
    cost: 5,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SHORECRAFT",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK"],
  }),
  BATTLESHIP: role({
    role: "BATTLESHIP",
    label: "Battleship",
    tacticalRole: "NAVAL_CAPITAL",
    cost: 16,
    maxHp: 25,
    attack2: 12,
    defense2: 8,
    move: 2,
    range: 3,
    minimumRange: 1,
    sightRadius: 3,
    technology: "NAVAL_ENGINEERING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK"],
  }),
});

export const ORIGINAL_BASELINE_V5_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ORIGINAL_BASELINE_V5",
  faction: "ORIGINAL",
  startingTechIds: ["GATHERING"],
  nodes: ORIGINAL_BASELINE_V5_NODES,
  roleRules: ORIGINAL_ROLE_RULES_V7,
});
export const RULESET_7 = deepFreeze({
  id: RULESET_7_ID,
  version: 7 as const,
  startingCoins: 5 as const,
  technologies: ORIGINAL_BASELINE_V5_NODES,
  tree: ORIGINAL_BASELINE_V5_TREE,
});

export function technologyResearchCostV7(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
): number {
  if (
    ![1, 2, 3].includes(tier) ||
    !Number.isSafeInteger(ownedCityCount) ||
    ownedCityCount < 1
  )
    throw new RangeError("INVALID_CITY_COUNT");
  const value =
    BigInt(tier === 1 ? 5 : tier === 2 ? 7 : 9) +
    BigInt(tier) * BigInt(ownedCityCount - 1);
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  return Number(value);
}

export function effectiveRoleRuleV7(roleId: UnitRoleIdV7): EffectiveRoleRuleV7 {
  return ORIGINAL_ROLE_RULES_V7[roleId];
}
export function requireTechnologyNodeV7(id: TechnologyIdV7): TechnologyNodeV7 {
  const result = ORIGINAL_BASELINE_V5_NODES.find((item) => item.id === id);
  if (result === undefined)
    throw new RangeError(`Unknown v7 technology: ${id}`);
  return result;
}

export interface TechnologyCapabilitiesV7 {
  readonly treeId: "ORIGINAL_BASELINE_V5";
  readonly resourceReveals: readonly ResourceIdV7[];
  readonly commands: readonly TechnologyUnlockedCommandV7[];
  readonly trainableRoles: readonly UnitRoleIdV7[];
  readonly roleBindings: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
  readonly economicFormulas: readonly Extract<
    TechnologyUnlockV7,
    { readonly kind: "ECONOMIC_FORMULA" }
  >[];
  readonly connectedFarmVisuals: boolean;
  readonly forestMovementFreedomRoles: readonly UnitRoleIdV7[];
  readonly mountainMovement: boolean;
  readonly highGroundVisionRadiusBonus: 0 | 1;
  readonly roleSightRadius: Readonly<Partial<Record<UnitRoleIdV7, number>>>;
  readonly roadMovement: {
    readonly ordinaryStepCost2: 2;
    readonly connectedOrthogonalStepCost2: 1;
  } | null;
  readonly ownedCityCapacityBonus: 0 | 1;
  readonly adjacentStartTurnHealingAmount: 0 | 6;
  readonly landRoadPopulationAmount: 0 | 1;
  readonly marketIncomeMultiplier: 1 | 2;
  readonly armsIndustryDiscountCoins: 0 | 1;
  readonly landTradeIncomeCoins: 0 | 1;
  readonly seaTradeIncomeCoins: 0 | 1;
  readonly hostileCaptureSpoilsCoins: 0 | 2;
}

export function technologyCapabilitiesV7(
  researchedTechs: readonly TechnologyIdV7[],
): TechnologyCapabilitiesV7 {
  const known = new Set(researchedTechs);
  const unlocks = ORIGINAL_BASELINE_V5_NODES.filter((node) =>
    known.has(node.id),
  ).flatMap((node) => node.unlocks);
  const resources = new Set<ResourceIdV7>();
  const commands = new Set<TechnologyUnlockedCommandV7>();
  const roles = new Set<UnitRoleIdV7>();
  const formulas: Extract<TechnologyUnlockV7, { kind: "ECONOMIC_FORMULA" }>[] =
    [];
  const forest = new Set<UnitRoleIdV7>();
  const sights: Partial<Record<UnitRoleIdV7, number>> = {};
  let connectedFarmVisuals = false;
  let mountainMovement = false;
  let highGroundVisionRadiusBonus: 0 | 1 = 0;
  let roadMovement: TechnologyCapabilitiesV7["roadMovement"] = null;
  let ownedCityCapacityBonus: 0 | 1 = 0;
  let adjacentStartTurnHealingAmount: 0 | 6 = 0;
  let landRoadPopulationAmount: 0 | 1 = 0;
  let marketIncomeMultiplier: 1 | 2 = 1;
  let armsIndustryDiscountCoins: 0 | 1 = 0;
  let landTradeIncomeCoins: 0 | 1 = 0;
  let seaTradeIncomeCoins: 0 | 1 = 0;
  let hostileCaptureSpoilsCoins: 0 | 2 = 0;
  for (const unlock of unlocks)
    switch (unlock.kind) {
      case "COMMAND":
        commands.add(unlock.command);
        break;
      case "RESOURCE_REVEAL":
        unlock.resources.forEach((item) => resources.add(item));
        break;
      case "UNIT_ROLE":
        roles.add(unlock.role);
        break;
      case "ECONOMIC_FORMULA":
        formulas.push(unlock);
        break;
      case "CONNECTED_FARM_VISUALS":
        connectedFarmVisuals = true;
        break;
      case "FOREST_MOVEMENT_FREEDOM":
        unlock.roles.forEach((item) => forest.add(item));
        break;
      case "MOUNTAIN_MOVEMENT":
        mountainMovement = true;
        break;
      case "HIGH_GROUND_VISION":
        highGroundVisionRadiusBonus = 1;
        break;
      case "ROLE_SIGHT":
        sights[unlock.role] = unlock.radius;
        break;
      case "ROAD_MOVEMENT":
        roadMovement = {
          ordinaryStepCost2: 2,
          connectedOrthogonalStepCost2: 1,
        };
        break;
      case "OWNED_CITY_CAPACITY_BONUS":
        ownedCityCapacityBonus = 1;
        break;
      case "ADJACENT_START_TURN_HEALING":
        adjacentStartTurnHealingAmount = 6;
        break;
      case "LAND_ROAD_POPULATION":
        landRoadPopulationAmount = 1;
        break;
      case "MARKET_INCOME_MULTIPLIER":
        marketIncomeMultiplier = 2;
        break;
      case "ARMS_INDUSTRY_DISCOUNT":
        armsIndustryDiscountCoins = 1;
        break;
      case "LAND_TRADE_INCOME":
        landTradeIncomeCoins = 1;
        break;
      case "SEA_TRADE_INCOME":
        seaTradeIncomeCoins = 1;
        break;
      case "FIRST_HOSTILE_CAPTURE_SPOILS":
        hostileCaptureSpoilsCoins = 2;
        break;
      case "CAPTAIN_SUPPORT":
      case "OVERRUN":
      case "CHARGE_BONUS":
      case "MELEE_FIELD_DEMOLITION":
      case "NAVAL_TRAINING_DISCOUNT":
        break;
    }
  return deepFreeze({
    treeId: "ORIGINAL_BASELINE_V5",
    resourceReveals: RESOURCE_IDS_V7.filter((item) => resources.has(item)),
    commands: COMMAND_KIND_ORDER_V7.filter((item) =>
      commands.has(item as TechnologyUnlockedCommandV7),
    ) as readonly TechnologyUnlockedCommandV7[],
    trainableRoles: UNIT_ROLE_IDS_V7.filter(
      (item) =>
        effectiveRoleRuleV7(item).cost !== null &&
        (item === "FIGHTER" || roles.has(item)),
    ),
    roleBindings: ORIGINAL_ROLE_RULES_V7,
    economicFormulas: formulas,
    connectedFarmVisuals,
    forestMovementFreedomRoles: UNIT_ROLE_IDS_V7.filter((item) =>
      forest.has(item),
    ),
    mountainMovement,
    highGroundVisionRadiusBonus,
    roleSightRadius: sights,
    roadMovement,
    ownedCityCapacityBonus,
    adjacentStartTurnHealingAmount,
    landRoadPopulationAmount,
    marketIncomeMultiplier,
    armsIndustryDiscountCoins,
    landTradeIncomeCoins,
    seaTradeIncomeCoins,
    hostileCaptureSpoilsCoins,
  });
}

export function assertRuleset7Registry(): void {
  if (
    ORIGINAL_BASELINE_V5_NODES.length !== TECHNOLOGY_IDS_V7.length ||
    !ORIGINAL_BASELINE_V5_NODES.every(
      (node, index) => node.id === TECHNOLOGY_IDS_V7[index],
    ) ||
    Reflect.ownKeys(ORIGINAL_ROLE_RULES_V7).length !==
      UNIT_ROLE_IDS_V7.length ||
    IMPROVEMENT_IDS_V7.length !== 11
  )
    throw new Error("Ruleset-7 registry is incomplete");
}
