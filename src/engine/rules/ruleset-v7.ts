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
  "MOBILITY_TRADE",
  "INDUSTRY_WARFARE",
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
  | "BUILD_GRAND_WORKS"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP"
  | "PILLAGE"
  | "DISBAND"
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
        | "CONNECTED_ORTHOGONAL_CLUSTER"
        | "ADJACENT_MINES"
        | "DISTINCT_BASIC_TYPES"
        | "DISTINCT_PROCESSOR_TYPES"
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
      readonly kind: "SCOUT_DETECTION_RADIUS";
      readonly radius: 2;
    }
  | {
      readonly kind: "ROAD_MOVEMENT";
      readonly ordinaryStepCost2: 2;
      readonly connectedOrthogonalStepCost2: 1;
    }
  | { readonly kind: "MARKET_CAPITAL_ROAD_BONUS"; readonly coins: 1 }
  | {
      readonly kind: "FRIENDLY_CITY_FORTIFICATION";
      readonly roles: readonly UnitRoleIdV7[];
      readonly defenseNumerator: 2;
      readonly defenseDenominator: 1;
    }
  | { readonly kind: "OWNED_CITY_CAPACITY_BONUS"; readonly capacity: 1 }
  | { readonly kind: "MEDIC_HEAL"; readonly amount: 4 | 6 }
  | { readonly kind: "FRIENDLY_IDLE_RECOVERY"; readonly amount: 6 }
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
  | "BLACKOUT"
  | "BREACH"
  | "CAPTURE"
  | "CHARGE"
  | "CONCEALMENT"
  | "DASH"
  | "HEAL_ADJACENT"
  | "PUSH"
  | "TWO_SHOTS";

export interface EffectiveRoleRuleV7 {
  readonly role: UnitRoleIdV7;
  readonly label: string;
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
  readonly id: "ORIGINAL_BASELINE_V4";
  readonly faction: "ORIGINAL";
  readonly startingTechIds: readonly ["GATHERING"];
  readonly nodes: readonly TechnologyNodeV7[];
  readonly roleRules: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
}

export type BasicEconomicCommandKindV7 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
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
  | "BUILD_GRAND_WORKS"
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
  BUILD_GRAND_WORKS: {
    command: "BUILD_GRAND_WORKS",
    technology: "GRAND_WORKS",
    cost: 7,
    improvement: "GRAND_WORKS",
    placementMinimum: 2,
  },
  BUILD_MARKET: {
    command: "BUILD_MARKET",
    technology: "COMMERCE",
    cost: 7,
    improvement: "MARKET",
    placementMinimum: 2,
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

export const ORIGINAL_BASELINE_V4_NODES = deepFreeze([
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
    "MEDICINE",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "UNIT_ROLE", role: "MEDIC" },
      { kind: "MEDIC_HEAL", amount: 4 },
    ],
  ),
  node(
    "RECOVERY",
    "SETTLEMENT",
    3,
    ["MEDICINE"],
    [
      { kind: "MEDIC_HEAL", amount: 6 },
      { kind: "FRIENDLY_IDLE_RECOVERY", amount: 6 },
      { kind: "COMMAND", command: "DISBAND" },
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
        formula: "CONNECTED_ORTHOGONAL_CLUSTER",
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
      { kind: "UNIT_ROLE", role: "SABOTEUR" },
      { kind: "FOREST_MOVEMENT_FREEDOM", roles: ["SCOUT", "MARKSMAN"] },
      { kind: "ROLE_SIGHT", role: "MARKSMAN", radius: 2 },
    ],
  ),
  node(
    "SCOUTING",
    "MOBILITY_TRADE",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "SCOUT" },
      { kind: "ROLE_SIGHT", role: "SCOUT", radius: 2 },
      { kind: "SCOUT_DETECTION_RADIUS", radius: 2 },
    ],
  ),
  node(
    "ROADS",
    "MOBILITY_TRADE",
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
    "MOBILITY_TRADE",
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
    "MOBILITY_TRADE",
    2,
    ["SCOUTING"],
    [{ kind: "UNIT_ROLE", role: "RAIDER" }],
  ),
  node(
    "MOUNTED_ARCHERY",
    "MOBILITY_TRADE",
    3,
    ["RAIDING"],
    [{ kind: "UNIT_ROLE", role: "HORSE_ARCHER" }],
  ),
  node(
    "DRILL",
    "INDUSTRY_WARFARE",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "GUARD" },
      { kind: "FIRST_HOSTILE_CAPTURE_SPOILS", coins: 2 },
    ],
  ),
  node(
    "FORTIFICATION",
    "INDUSTRY_WARFARE",
    2,
    ["DRILL"],
    [
      {
        kind: "FRIENDLY_CITY_FORTIFICATION",
        roles: ["FIGHTER", "GUARD"],
        defenseNumerator: 2,
        defenseDenominator: 1,
      },
      { kind: "OWNED_CITY_CAPACITY_BONUS", capacity: 1 },
    ],
  ),
  node(
    "EXPLOSIVES",
    "INDUSTRY_WARFARE",
    3,
    ["FORTIFICATION"],
    [
      { kind: "UNIT_ROLE", role: "BREACHER" },
      { kind: "COMMAND", command: "PILLAGE" },
    ],
  ),
  node(
    "ENGINEERING",
    "INDUSTRY_WARFARE",
    2,
    ["DRILL"],
    [
      { kind: "RESOURCE_REVEAL", resources: ["ORE"] },
      { kind: "COMMAND", command: "BUILD_MINE" },
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
      { kind: "MOUNTAIN_MOVEMENT" },
      { kind: "HIGH_GROUND_VISION", radiusBonus: 1 },
    ],
  ),
  node(
    "METALLURGY",
    "INDUSTRY_WARFARE",
    3,
    ["ENGINEERING"],
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
    "GRAND_WORKS",
    "INDUSTRY_WARFARE",
    3,
    ["ENGINEERING"],
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
] as const);

const role = (input: EffectiveRoleRuleV7): EffectiveRoleRuleV7 =>
  deepFreeze(input);
export const ORIGINAL_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    label: "Fighter",
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
  SCOUT: role({
    role: "SCOUT",
    label: "Scout",
    cost: 4,
    maxHp: 10,
    attack2: 3,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Marksman",
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
  RAIDER: role({
    role: "RAIDER",
    label: "Raider",
    cost: 4,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "RAIDING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE"],
  }),
  MEDIC: role({
    role: "MEDIC",
    label: "Medic",
    cost: 4,
    maxHp: 10,
    attack2: 1,
    defense2: 3,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MEDICINE",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "HEAL_ADJACENT"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Catapult",
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
  SABOTEUR: role({
    role: "SABOTEUR",
    label: "Saboteur",
    cost: 6,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "FIELDCRAFT",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "BLACKOUT", "CONCEALMENT"],
  }),
  HEAVY: role({
    role: "HEAVY",
    label: "Heavy",
    cost: 7,
    maxHp: 20,
    attack2: 7,
    defense2: 7,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH"],
  }),
  HORSE_ARCHER: role({
    role: "HORSE_ARCHER",
    label: "Horse Archer",
    cost: 9,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 3,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MOUNTED_ARCHERY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "DASH", "TWO_SHOTS"],
  }),
  BREACHER: role({
    role: "BREACHER",
    label: "Breacher",
    cost: 6,
    maxHp: 10,
    attack2: 8,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "EXPLOSIVES",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "BREACH"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Juggernaut",
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
});

export const ORIGINAL_BASELINE_V4_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ORIGINAL_BASELINE_V4",
  faction: "ORIGINAL",
  startingTechIds: ["GATHERING"],
  nodes: ORIGINAL_BASELINE_V4_NODES,
  roleRules: ORIGINAL_ROLE_RULES_V7,
});
export const RULESET_7 = deepFreeze({
  id: RULESET_7_ID,
  version: 7 as const,
  startingCoins: 5 as const,
  technologies: ORIGINAL_BASELINE_V4_NODES,
  tree: ORIGINAL_BASELINE_V4_TREE,
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
  const result = ORIGINAL_BASELINE_V4_NODES.find((item) => item.id === id);
  if (result === undefined)
    throw new RangeError(`Unknown v7 technology: ${id}`);
  return result;
}

export interface TechnologyCapabilitiesV7 {
  readonly treeId: "ORIGINAL_BASELINE_V4";
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
  readonly scoutDetectionRadius: 0 | 2;
  readonly roadMovement: {
    readonly ordinaryStepCost2: 2;
    readonly connectedOrthogonalStepCost2: 1;
  } | null;
  readonly marketCapitalRoadBonusCoins: 0 | 1;
  readonly friendlyCityFortification: {
    readonly roles: readonly UnitRoleIdV7[];
    readonly defenseNumerator: 2;
    readonly defenseDenominator: 1;
  } | null;
  readonly ownedCityCapacityBonus: 0 | 1;
  readonly medicHealAmount: 0 | 4 | 6;
  readonly friendlyIdleRecoveryAmount: 0 | 6;
  readonly hostileCaptureSpoilsCoins: 0 | 2;
}

export function technologyCapabilitiesV7(
  researchedTechs: readonly TechnologyIdV7[],
): TechnologyCapabilitiesV7 {
  const known = new Set(researchedTechs);
  const unlocks = ORIGINAL_BASELINE_V4_NODES.filter((node) =>
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
  let scoutDetectionRadius: 0 | 2 = 0;
  let marketCapitalRoadBonusCoins: 0 | 1 = 0;
  let friendlyCityFortification: TechnologyCapabilitiesV7["friendlyCityFortification"] =
    null;
  let ownedCityCapacityBonus: 0 | 1 = 0;
  let medicHealAmount: 0 | 4 | 6 = 0;
  let friendlyIdleRecoveryAmount: 0 | 6 = 0;
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
      case "SCOUT_DETECTION_RADIUS":
        scoutDetectionRadius = 2;
        break;
      case "ROAD_MOVEMENT":
        roadMovement = {
          ordinaryStepCost2: 2,
          connectedOrthogonalStepCost2: 1,
        };
        break;
      case "MARKET_CAPITAL_ROAD_BONUS":
        marketCapitalRoadBonusCoins = 1;
        break;
      case "FRIENDLY_CITY_FORTIFICATION":
        friendlyCityFortification = {
          roles: unlock.roles,
          defenseNumerator: 2,
          defenseDenominator: 1,
        };
        break;
      case "OWNED_CITY_CAPACITY_BONUS":
        ownedCityCapacityBonus = 1;
        break;
      case "MEDIC_HEAL":
        medicHealAmount = unlock.amount;
        break;
      case "FRIENDLY_IDLE_RECOVERY":
        friendlyIdleRecoveryAmount = 6;
        break;
      case "FIRST_HOSTILE_CAPTURE_SPOILS":
        hostileCaptureSpoilsCoins = 2;
        break;
    }
  return deepFreeze({
    treeId: "ORIGINAL_BASELINE_V4",
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
    scoutDetectionRadius,
    roadMovement,
    marketCapitalRoadBonusCoins,
    friendlyCityFortification,
    ownedCityCapacityBonus,
    medicHealAmount,
    friendlyIdleRecoveryAmount,
    hostileCaptureSpoilsCoins,
  });
}

export function assertRuleset7Registry(): void {
  if (
    ORIGINAL_BASELINE_V4_NODES.length !== TECHNOLOGY_IDS_V7.length ||
    !ORIGINAL_BASELINE_V4_NODES.every(
      (node, index) => node.id === TECHNOLOGY_IDS_V7[index],
    ) ||
    Reflect.ownKeys(ORIGINAL_ROLE_RULES_V7).length !==
      UNIT_ROLE_IDS_V7.length ||
    IMPROVEMENT_IDS_V7.length !== 10
  )
    throw new Error("Ruleset-7 registry is incomplete");
}
