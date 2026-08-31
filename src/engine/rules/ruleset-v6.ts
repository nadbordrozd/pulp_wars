import { deepFreeze } from "../model/freeze";
import {
  FACTION_TREE_IDS,
  RULESET_6_ID,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type FactionIdV6,
  type FactionTreeId,
  type EconomicImprovementId,
  type ResourceId,
  type TerrainIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "../v6/types";

export interface TechnologyNodeV6 {
  readonly id: TechnologyId;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyId[];
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

function node(
  id: TechnologyId,
  tier: 1 | 2 | 3,
  prerequisites: readonly TechnologyId[] = [],
  unlockedRoles: readonly UnitRoleId[] = [],
): TechnologyNodeV6 {
  return deepFreeze({
    id,
    tier,
    prerequisites: [...prerequisites],
    unlockedRoles: [...unlockedRoles],
  });
}

/** The single frozen baseline graph shared explicitly by both registrations. */
export const BASELINE_TECHNOLOGY_NODES_V6 = deepFreeze([
  node("GATHERING", 1),
  node("FARMING", 2, ["GATHERING"]),
  node("MILLING", 3, ["FARMING"]),
  node("CRAFT", 2, ["GATHERING"]),
  node("GRAND_WORKS", 3, ["CRAFT"]),
  node("HUNTING", 1),
  node("FORESTRY", 2, ["HUNTING"]),
  node("SAWMILLING", 3, ["FORESTRY"]),
  node("MARKSMANSHIP", 2, ["HUNTING"], ["MARKSMAN"]),
  node("FIELDCRAFT", 3, ["MARKSMANSHIP"]),
  node("SURVEYING", 1),
  node("MINING", 2, ["SURVEYING"]),
  node("METALLURGY", 3, ["MINING"], ["HEAVY"]),
  node("QUARRYING", 2, ["SURVEYING"]),
  node("MASONRY", 3, ["QUARRYING"]),
  node("SCOUTING", 1, [], ["SCOUT"]),
  node("ROADS", 2, ["SCOUTING"]),
  node("COMMERCE", 3, ["ROADS"]),
  node("RAIDING", 2, ["SCOUTING"], ["RAIDER"]),
  node("MANEUVER", 3, ["RAIDING"]),
  node("DRILL", 1, [], ["GUARD"]),
  node("FORTIFICATION", 2, ["DRILL"]),
  node("EXPLOSIVES", 3, ["FORTIFICATION"], ["BREACHER"]),
  node("MEDICINE", 2, ["DRILL"], ["MEDIC"]),
  node("RECOVERY", 3, ["MEDICINE"]),
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
      actual.tier !== expected.tier ||
      !sameOrderedValues(actual.prerequisites, expected.prerequisites) ||
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

function sameOrderedValues<T>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
