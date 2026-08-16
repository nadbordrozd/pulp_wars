import {
  RULESET_ID,
  type RewardId,
  type RulesetId,
  type TechId,
  type UnitType,
} from "../model/types";

export interface TechnologyRule {
  readonly id: TechId;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechId[];
}

export interface CityLevelRule {
  readonly level: 1 | 2 | 3;
  readonly populationRequired: number;
  readonly rewards: readonly RewardId[];
}

export type UnitAbility = "DASH" | "ESCAPE" | "FORTIFY";

export interface UnitRule {
  readonly type: UnitType;
  readonly cost: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly move: number;
  readonly range: number;
  readonly abilities: readonly UnitAbility[];
  readonly technology: TechId | null;
}

export interface RulesetDefinition {
  readonly id: RulesetId;
  readonly version: 4;
  readonly boardSizes: readonly [11, 14, 16, 20, 25];
  readonly playerCount: Readonly<{
    readonly minimum: 2;
    readonly maximum: 4;
  }>;
  readonly startingStars: 5;
  readonly technologyBaseCost: 4;
  readonly capitalIncomeBonus: 1;
  readonly workshopIncomeBonus: 1;
  readonly fruitCost: 2;
  readonly fruitPopulation: 1;
  readonly animalCost: 2;
  readonly animalPopulation: 1;
  readonly lumberMillCost: 3;
  readonly lumberMillPopulation: 1;
  readonly mineCost: 5;
  readonly minePopulation: 2;
  readonly resourcesRewardStars: 5;
  readonly surveyRadius: 3;
  readonly captureRevealRadius: 1;
  readonly normalCityDefense: Readonly<{
    readonly numerator: 3;
    readonly denominator: 2;
  }>;
  readonly cityWallDefense: Readonly<{
    readonly numerator: 4;
    readonly denominator: 1;
  }>;
  readonly mountainDefense: Readonly<{
    readonly numerator: 3;
    readonly denominator: 2;
  }>;
  readonly forestDefense: Readonly<{
    readonly numerator: 3;
    readonly denominator: 2;
  }>;
  readonly friendlyRecovery: 4;
  readonly otherRecovery: 2;
  readonly promotionKills: 3;
  readonly promotionMaxHp: 5;
  readonly technologies: readonly TechnologyRule[];
  readonly cityLevels: readonly CityLevelRule[];
  readonly units: Readonly<Record<UnitType, UnitRule>>;
  readonly unitUnlocks: Readonly<Record<UnitType, TechId | null>>;
}

const POC_RULESET: RulesetDefinition = Object.freeze({
  id: RULESET_ID,
  version: 4,
  boardSizes: Object.freeze([11, 14, 16, 20, 25] as const),
  playerCount: Object.freeze({ minimum: 2, maximum: 4 }),
  startingStars: 5,
  technologyBaseCost: 4,
  capitalIncomeBonus: 1,
  workshopIncomeBonus: 1,
  fruitCost: 2,
  fruitPopulation: 1,
  animalCost: 2,
  animalPopulation: 1,
  lumberMillCost: 3,
  lumberMillPopulation: 1,
  mineCost: 5,
  minePopulation: 2,
  resourcesRewardStars: 5,
  surveyRadius: 3,
  captureRevealRadius: 1,
  normalCityDefense: Object.freeze({ numerator: 3, denominator: 2 }),
  cityWallDefense: Object.freeze({ numerator: 4, denominator: 1 }),
  mountainDefense: Object.freeze({ numerator: 3, denominator: 2 }),
  forestDefense: Object.freeze({ numerator: 3, denominator: 2 }),
  friendlyRecovery: 4,
  otherRecovery: 2,
  promotionKills: 3,
  promotionMaxHp: 5,
  technologies: Object.freeze([
    Object.freeze({
      id: "CLIMBING",
      tier: 1,
      prerequisites: Object.freeze([]),
    }),
    Object.freeze({ id: "RIDING", tier: 1, prerequisites: Object.freeze([]) }),
    Object.freeze({ id: "HUNTING", tier: 1, prerequisites: Object.freeze([]) }),
    Object.freeze({
      id: "ORGANIZATION",
      tier: 1,
      prerequisites: Object.freeze([]),
    }),
    Object.freeze({
      id: "MINING",
      tier: 2,
      prerequisites: Object.freeze(["CLIMBING"] as const),
    }),
    Object.freeze({
      id: "FORESTRY",
      tier: 2,
      prerequisites: Object.freeze(["HUNTING"] as const),
    }),
    Object.freeze({
      id: "ARCHERY",
      tier: 2,
      prerequisites: Object.freeze(["HUNTING"] as const),
    }),
    Object.freeze({
      id: "STRATEGY",
      tier: 2,
      prerequisites: Object.freeze(["ORGANIZATION"] as const),
    }),
    Object.freeze({
      id: "MATHEMATICS",
      tier: 3,
      prerequisites: Object.freeze(["FORESTRY"] as const),
    }),
  ]),
  cityLevels: Object.freeze([
    Object.freeze({
      level: 1,
      populationRequired: 0,
      rewards: Object.freeze([]),
    }),
    Object.freeze({
      level: 2,
      populationRequired: 2,
      rewards: Object.freeze(["WORKSHOP", "SURVEY"] as const),
    }),
    Object.freeze({
      level: 3,
      populationRequired: 3,
      rewards: Object.freeze(["RESOURCES", "CITY_WALL"] as const),
    }),
  ]),
  units: Object.freeze({
    WARRIOR: Object.freeze({
      type: "WARRIOR",
      cost: 2,
      maxHp: 10,
      attack: 2,
      defense: 2,
      move: 1,
      range: 1,
      abilities: Object.freeze(["DASH", "FORTIFY"] as const),
      technology: null,
    }),
    ARCHER: Object.freeze({
      type: "ARCHER",
      cost: 3,
      maxHp: 10,
      attack: 2,
      defense: 1,
      move: 1,
      range: 2,
      abilities: Object.freeze(["DASH", "FORTIFY"] as const),
      technology: "ARCHERY",
    }),
    DEFENDER: Object.freeze({
      type: "DEFENDER",
      cost: 3,
      maxHp: 15,
      attack: 1,
      defense: 3,
      move: 1,
      range: 1,
      abilities: Object.freeze(["FORTIFY"] as const),
      technology: "STRATEGY",
    }),
    RIDER: Object.freeze({
      type: "RIDER",
      cost: 3,
      maxHp: 10,
      attack: 2,
      defense: 1,
      move: 2,
      range: 1,
      abilities: Object.freeze(["DASH", "ESCAPE", "FORTIFY"] as const),
      technology: "RIDING",
    }),
    CATAPULT: Object.freeze({
      type: "CATAPULT",
      cost: 8,
      maxHp: 10,
      attack: 4,
      defense: 0,
      move: 1,
      range: 3,
      abilities: Object.freeze([]),
      technology: "MATHEMATICS",
    }),
  }),
  unitUnlocks: Object.freeze({
    WARRIOR: null,
    ARCHER: "ARCHERY",
    DEFENDER: "STRATEGY",
    RIDER: "RIDING",
    CATAPULT: "MATHEMATICS",
  }),
});

const RULESETS: ReadonlyMap<string, RulesetDefinition> = new Map([
  [POC_RULESET.id, POC_RULESET],
]);

export function getRuleset(id: string): RulesetDefinition | undefined {
  return RULESETS.get(id);
}

export function requireRuleset(id: string): RulesetDefinition {
  const ruleset = getRuleset(id);
  if (ruleset === undefined) {
    throw new RangeError(`Unknown ruleset: ${id}`);
  }
  return ruleset;
}
