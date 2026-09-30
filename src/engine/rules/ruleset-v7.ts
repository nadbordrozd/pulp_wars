import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import {
  COMMAND_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CommandKindV7,
  type FactionIdV7,
  type FactionTreeIdV7,
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
  /** Revision 13 Undead: Necromancer Frenzy (Rally) and Raise Dead. */
  | { readonly kind: "NECROMANCER_SUPPORT" }
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
  | "ESCAPE"
  | "PUSH"
  // Revision 13 Undead ability identifiers.
  | "RAISE_DEAD"
  | "DEVOUR"
  | "INFECT"
  | "LIFESTEAL"
  | "WAIL"
  // Revision 14: a Lich attack plagues living survivors; Zombie damage bites
  // living land units; a Vampire attack receives no retaliation.
  | "PLAGUE"
  | "BITE"
  | "UNANSWERED";

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

/**
 * Engine-only per-role mechanics that the historical role-rule shape does not
 * carry. They resolve through the owner's faction like every role rule.
 */
export interface RoleMechanicsV7 {
  /** A melee kill moves the surviving attacker onto the defender's tile. */
  readonly advancesAfterKill: boolean;
  /** An attack splashes onto hostile units around the primary target. */
  readonly splash: boolean;
}

export interface FactionTechnologyTreeV7 {
  readonly id: FactionTreeIdV7;
  readonly faction: FactionIdV7;
  readonly startingTechIds: readonly [];
  readonly nodes: readonly TechnologyNodeV7[];
  readonly roleRules: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
  readonly roleMechanics: Readonly<Record<UnitRoleIdV7, RoleMechanicsV7>>;
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
      { kind: "RESOURCE_REVEAL", resources: ["FERTILE_GROUND"] },
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
    // Revision 14 (E2): Commerce no longer doubles Market income.
    [{ kind: "LAND_TRADE_INCOME", coins: 1 }],
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

/**
 * Revision 16 (2-tile boats): an embarked land unit has Move 2 on water, and
 * `DISEMBARK` spends one of those points, so it is legal only while the
 * unit's Move this turn has spent at most `EMBARKED_LANDING_MAX_SPENT_V7`.
 */
export const EMBARKED_MOVE_V7 = 2;
export const EMBARKED_LANDING_MAX_SPENT_V7 = EMBARKED_MOVE_V7 - 1;

/** Movement points an embarked unit's Move has spent this turn (section 5.2). */
export function embarkedMovementSpentV7(activation: {
  readonly moved: boolean;
  readonly movedPathLength: number;
}): number {
  return activation.moved ? activation.movedPathLength : 0;
}

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
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "ESCAPE"],
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
    // Revision 16 (2-tile boats): Move 2 (was 3).
    move: 2,
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

const mechanics = (
  overrides: Partial<Record<UnitRoleIdV7, Partial<RoleMechanicsV7>>>,
): Readonly<Record<UnitRoleIdV7, RoleMechanicsV7>> =>
  deepFreeze(
    Object.fromEntries(
      UNIT_ROLE_IDS_V7.map((roleId) => [
        roleId,
        {
          advancesAfterKill: true,
          splash: false,
          ...overrides[roleId],
        },
      ]),
    ) as Record<UnitRoleIdV7, RoleMechanicsV7>,
  );

export const ORIGINAL_ROLE_MECHANICS_V7 = mechanics({
  CATAPULT: { advancesAfterKill: false },
  BATTLESHIP: { splash: true },
});

export const ORIGINAL_BASELINE_V5_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ORIGINAL_BASELINE_V5",
  faction: "ORIGINAL",
  startingTechIds: [],
  nodes: ORIGINAL_BASELINE_V5_NODES,
  roleRules: ORIGINAL_ROLE_RULES_V7,
  roleMechanics: ORIGINAL_ROLE_MECHANICS_V7,
});

/**
 * Revision 13 Undead technology graph: identical to ORIGINAL_BASELINE_V5
 * except that Administration grants Necromancer support instead of Captain
 * support and Chivalry grants no Overrun.
 */
export const UNDEAD_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  ORIGINAL_BASELINE_V5_NODES.map((original) =>
    node(
      original.id,
      original.branch,
      original.tier,
      original.prerequisites,
      original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? [{ kind: "NECROMANCER_SUPPORT" }]
          : unlock.kind === "OVERRUN"
            ? []
            : [unlock],
      ),
    ),
  ),
);

export const UNDEAD_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    ...ORIGINAL_ROLE_RULES_V7.FIGHTER,
    label: "Skeleton",
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Ghoul",
    tacticalRole: "SKIRMISHER",
    cost: 3,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "DEVOUR"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Banshee",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 8,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 0,
    minimumRange: 0,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["CAPTURE", "WAIL"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Zombie",
    tacticalRole: "DEFENDER",
    cost: 3,
    // Revision 15 (Undead fragility): 18 HP (was 20); risings keep 10 HP.
    maxHp: 18,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "INFECT", "BITE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Necromancer",
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
    abilities: ["ATTACK", "RALLY", "RAISE_DEAD"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Lich",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    // Revision 14 (L2): Attack 3 (was 2.5).
    attack2: 6,
    defense2: 2,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "PLAGUE"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Vampire",
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
    abilities: ["ATTACK", "LIFESTEAL", "UNANSWERED"],
  }),
  JUGGERNAUT: role({
    ...ORIGINAL_ROLE_RULES_V7.JUGGERNAUT,
    label: "Abomination",
    abilities: ["ATTACK", "CAPTURE", "PUSH"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * The Zombie never advances after a kill. The Lich keeps Catapult parity and
 * adds the Battleship splash rule (revision 13 section 6.7). The `SPLASH`
 * capability is this engine mechanic rather than a declared role ability, so
 * Human public role abilities stay exactly as in revision 12.
 */
export const UNDEAD_ROLE_MECHANICS_V7 = mechanics({
  GUARD: { advancesAfterKill: false },
  CATAPULT: { advancesAfterKill: false, splash: true },
  BATTLESHIP: { splash: true },
});

export const UNDEAD_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "UNDEAD_BASELINE_V1",
  faction: "UNDEAD",
  startingTechIds: [],
  nodes: UNDEAD_BASELINE_V1_NODES,
  roleRules: UNDEAD_ROLE_RULES_V7,
  roleMechanics: UNDEAD_ROLE_MECHANICS_V7,
});

/** Frozen faction registrations; there is no cross-faction fallback. */
export const FACTION_TREES_V7: Readonly<
  Record<FactionIdV7, FactionTechnologyTreeV7>
> = deepFreeze({
  ORIGINAL: ORIGINAL_BASELINE_V5_TREE,
  UNDEAD: UNDEAD_BASELINE_V1_TREE,
});

export const FACTION_DISPLAY_NAMES_V7: Readonly<Record<FactionIdV7, string>> =
  deepFreeze({ ORIGINAL: "Human", UNDEAD: "Undead" });

export function factionTreeV7(faction: FactionIdV7): FactionTechnologyTreeV7 {
  const tree = Object.hasOwn(FACTION_TREES_V7, faction)
    ? FACTION_TREES_V7[faction]
    : undefined;
  if (tree === undefined)
    throw new RangeError(`Unknown v7 faction: ${String(faction)}`);
  return tree;
}

export function factionTreeIdV7(faction: FactionIdV7): FactionTreeIdV7 {
  return factionTreeV7(faction).id;
}

/** Revision 13 faction-wide rules that are not role rules. */
export interface FactionRulesV7 {
  /**
   * Restless: land-form units recover only in their owner's territory
   * (explicit Recover is illegal elsewhere; idle recovery is 0 there).
   */
  readonly restless: boolean;
}

export const FACTION_RULES_V7: Readonly<Record<FactionIdV7, FactionRulesV7>> =
  deepFreeze({
    ORIGINAL: { restless: false },
    UNDEAD: { restless: true },
  });

export function factionRulesV7(faction: FactionIdV7): FactionRulesV7 {
  const rules = Object.hasOwn(FACTION_RULES_V7, faction)
    ? FACTION_RULES_V7[faction]
    : undefined;
  if (rules === undefined)
    throw new RangeError(`Unknown v7 faction: ${String(faction)}`);
  return rules;
}

/**
 * Revision 13: Graves exist exactly in matches whose setup includes an UNDEAD
 * seat. The property is fixed at setup and survives Undead elimination.
 */
export function gravesEnabledV7(setup: {
  readonly factions: readonly FactionIdV7[];
}): boolean {
  return setup.factions.includes("UNDEAD");
}

export const RULESET_7 = deepFreeze({
  id: RULESET_7_ID,
  version: 7 as const,
  startingCoins: 5 as const,
  factionTrees: FACTION_TREES_V7,
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

/**
 * Revision 12 free opening research: while a player has researched no
 * technology, any offered tier-1 technology costs 0 Coins. Afterward the
 * ordinary tier formula applies.
 */
export function playerTechnologyResearchCostV7(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
  researchedTechCount: number,
): number {
  const ordinary = technologyResearchCostV7(tier, ownedCityCount);
  return tier === 1 && researchedTechCount === 0 ? 0 : ordinary;
}

/** Resources masked in public observation until the listed technology. */
export const RESOURCE_REVEAL_TECHNOLOGY_V7: Readonly<
  Partial<Record<ResourceIdV7, TechnologyIdV7>>
> = deepFreeze({ FERTILE_GROUND: "GATHERING", ORE: "DRILL" });

export function isResourceRevealedV7(
  resource: ResourceIdV7,
  researchedTechs: readonly string[],
): boolean {
  const required = RESOURCE_REVEAL_TECHNOLOGY_V7[resource];
  return required === undefined || researchedTechs.includes(required);
}

/** The role rule of one faction's registration; the faction is mandatory. */
export function effectiveRoleRuleV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
): EffectiveRoleRuleV7 {
  const rule = factionTreeV7(faction).roleRules[roleId];
  if (rule === undefined)
    throw new RangeError(`Unknown v7 role for ${faction}: ${String(roleId)}`);
  return rule;
}

/** Engine-only role mechanics of one faction's registration. */
export function roleMechanicsV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
): RoleMechanicsV7 {
  const result = factionTreeV7(faction).roleMechanics[roleId];
  if (result === undefined)
    throw new RangeError(`Unknown v7 role for ${faction}: ${String(roleId)}`);
  return result;
}

/** Anything that lists players with their bound faction (state or view). */
export interface FactionRosterV7 {
  readonly players: readonly {
    readonly id: PlayerId;
    readonly faction: FactionIdV7;
  }[];
}

export function playerFactionV7(
  roster: FactionRosterV7,
  playerId: PlayerId,
): FactionIdV7 {
  const player = roster.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player.faction;
}

/** Resolves a unit's role rule through its owner's faction registration. */
export function unitRoleRuleV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
): EffectiveRoleRuleV7 {
  return effectiveRoleRuleV7(unit.role, playerFactionV7(roster, unit.ownerId));
}

/** Resolves a unit's engine mechanics through its owner's faction. */
export function unitRoleMechanicsV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
): RoleMechanicsV7 {
  return roleMechanicsV7(unit.role, playerFactionV7(roster, unit.ownerId));
}

export function requireTechnologyNodeV7(
  id: TechnologyIdV7,
  faction: FactionIdV7,
): TechnologyNodeV7 {
  const result = factionTreeV7(faction).nodes.find((item) => item.id === id);
  if (result === undefined)
    throw new RangeError(`Unknown v7 technology: ${id}`);
  return result;
}

export interface TechnologyCapabilitiesV7 {
  readonly treeId: FactionTreeIdV7;
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
  faction: FactionIdV7,
): TechnologyCapabilitiesV7 {
  const tree = factionTreeV7(faction);
  const cacheKey = JSON.stringify([tree.id, ...[...researchedTechs].sort()]);
  const cached = TECHNOLOGY_CAPABILITIES_CACHE_V7.get(cacheKey);
  if (cached !== undefined) {
    TECHNOLOGY_CAPABILITIES_CACHE_V7.delete(cacheKey);
    TECHNOLOGY_CAPABILITIES_CACHE_V7.set(cacheKey, cached);
    return cached;
  }
  const known = new Set(researchedTechs);
  const unlocks = tree.nodes
    .filter((node) => known.has(node.id))
    .flatMap((node) => node.unlocks);
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
      case "NECROMANCER_SUPPORT":
      case "OVERRUN":
      case "CHARGE_BONUS":
      case "MELEE_FIELD_DEMOLITION":
      case "NAVAL_TRAINING_DISCOUNT":
        break;
    }
  const result: TechnologyCapabilitiesV7 = deepFreeze({
    treeId: tree.id,
    resourceReveals: RESOURCE_IDS_V7.filter((item) => resources.has(item)),
    commands: COMMAND_KIND_ORDER_V7.filter((item) =>
      commands.has(item as TechnologyUnlockedCommandV7),
    ) as readonly TechnologyUnlockedCommandV7[],
    trainableRoles: UNIT_ROLE_IDS_V7.filter(
      (item) =>
        tree.roleRules[item].cost !== null &&
        (item === "FIGHTER" || roles.has(item)),
    ),
    roleBindings: tree.roleRules,
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
  TECHNOLOGY_CAPABILITIES_CACHE_V7.set(cacheKey, result);
  if (TECHNOLOGY_CAPABILITIES_CACHE_V7.size > 32) {
    const oldest = TECHNOLOGY_CAPABILITIES_CACHE_V7.keys().next().value;
    if (oldest !== undefined) TECHNOLOGY_CAPABILITIES_CACHE_V7.delete(oldest);
  }
  return result;
}

/** Bounded exact memo of immutable technology-only capability tables. */
const TECHNOLOGY_CAPABILITIES_CACHE_V7 = new Map<
  string,
  TechnologyCapabilitiesV7
>();

export function assertRuleset7Registry(): void {
  const complete = FACTION_IDS_V7.every((faction, index) => {
    const tree = FACTION_TREES_V7[faction];
    return (
      tree.faction === faction &&
      tree.id === FACTION_TREE_IDS_V7[index] &&
      tree.nodes.length === TECHNOLOGY_IDS_V7.length &&
      tree.nodes.every((item, position) => {
        const reference = ORIGINAL_BASELINE_V5_NODES[position];
        return (
          item.id === TECHNOLOGY_IDS_V7[position] &&
          reference !== undefined &&
          item.tier === reference.tier &&
          item.branch === reference.branch &&
          JSON.stringify(item.prerequisites) ===
            JSON.stringify(reference.prerequisites)
        );
      }) &&
      Reflect.ownKeys(tree.roleRules).length === UNIT_ROLE_IDS_V7.length &&
      Reflect.ownKeys(tree.roleMechanics).length === UNIT_ROLE_IDS_V7.length &&
      UNIT_ROLE_IDS_V7.every(
        (roleId) =>
          tree.roleRules[roleId].role === roleId &&
          tree.roleRules[roleId].tacticalRole ===
            ORIGINAL_ROLE_RULES_V7[roleId].tacticalRole,
      )
    );
  });
  if (
    !complete ||
    FACTION_IDS_V7.length !== FACTION_TREE_IDS_V7.length ||
    Reflect.ownKeys(FACTION_TREES_V7).length !== FACTION_IDS_V7.length ||
    IMPROVEMENT_IDS_V7.length !== 11
  )
    throw new Error("Ruleset-7 registry is incomplete");
}
