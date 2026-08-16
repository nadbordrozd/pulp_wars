import type { CityId, PlayerId } from "../model/ids";
import { RULESET_ID } from "../model/types";
import type {
  CityState,
  GameState,
  PlayerState,
  TechId,
  UnitType,
  UnitState,
} from "../model/types";
import { requireRuleset } from "./ruleset";
import { arePlayersHostile } from "./relationships";

export interface CityIncome {
  readonly cityId: CityId;
  readonly amount: number;
}

export interface CityGrowthResult {
  readonly city: CityState;
  readonly reachedLevels: readonly number[];
}

export interface RationalBonus {
  readonly numerator: number;
  readonly denominator: number;
}

export function isCityBesieged(state: GameState, city: CityState): boolean {
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      arePlayersHostile(
        state.setup.aiMode,
        state.humanPlayerId,
        city.ownerId,
        unit.ownerId,
      ) &&
      sameCoord(unit.at, city.at),
  );
}

export function cityIncome(state: GameState, city: CityState): number {
  if (isCityBesieged(state, city)) return 0;
  const ruleset = requireRuleset(state.rulesetId);
  const income =
    city.level +
    (city.isCapital ? ruleset.capitalIncomeBonus : 0) +
    (city.rewardLevel2 === "WORKSHOP" ? ruleset.workshopIncomeBonus : 0);
  if (!Number.isSafeInteger(income)) {
    throw new RangeError("City income exceeds the safe-integer boundary");
  }
  return income;
}

export function playerIncome(
  state: GameState,
  playerId: PlayerId,
): readonly CityIncome[] {
  return state.cities
    .filter((city) => city.ownerId === playerId)
    .sort((left, right) => left.id - right.id)
    .map((city) => ({ cityId: city.id, amount: cityIncome(state, city) }));
}

export function totalIncome(entries: readonly CityIncome[]): number {
  return entries.reduce((total, entry) => {
    const next = total + entry.amount;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError("Player income exceeds the safe-integer boundary");
    }
    return next;
  }, 0);
}

export function cityCapacity(city: CityState): number {
  return city.level;
}

export function citySupportedUnitCount(
  state: GameState,
  cityId: CityId,
): number {
  return state.units.filter((unit) => unit.hp > 0 && unit.homeCityId === cityId)
    .length;
}

export function cityAssignedCountedUnitCount(
  state: GameState,
  cityId: CityId,
): number {
  return state.units.filter(
    (unit) => unit.hp > 0 && unit.homeCityId === cityId && !unit.capacityExempt,
  ).length;
}

export function cityAssignedExemptUnitCount(
  state: GameState,
  cityId: CityId,
): number {
  return state.units.filter(
    (unit) => unit.hp > 0 && unit.homeCityId === cityId && unit.capacityExempt,
  ).length;
}

export function cityHasTrainingCapacity(
  state: GameState,
  city: CityState,
): boolean {
  return cityAssignedCountedUnitCount(state, city.id) < cityCapacity(city);
}

export function friendlyCityDefenseBonus(
  state: GameState,
  unit: UnitState,
): RationalBonus | null {
  const city = state.cities.find(
    (candidate) =>
      candidate.ownerId === unit.ownerId && sameCoord(candidate.at, unit.at),
  );
  if (city === undefined) return null;
  const ruleset = requireRuleset(state.rulesetId);
  return city.rewardLevel3 === "CITY_WALL"
    ? ruleset.cityWallDefense
    : ruleset.normalCityDefense;
}

export function unitTypeIsUnlocked(
  player: PlayerState,
  unitType: UnitType,
): boolean {
  const required = requireRuleset(RULESET_ID).unitUnlocks[unitType];
  return required === null || player.researchedTechs.includes(required);
}

export function technologyCost(
  state: GameState,
  playerId: PlayerId,
  tech: TechId,
): number {
  const rule = requireRuleset(state.rulesetId).technologies.find(
    (candidate) => candidate.id === tech,
  );
  if (rule === undefined) {
    throw new RangeError(`Unknown technology: ${tech}`);
  }
  const ownedCities = state.cities.filter(
    (city) => city.ownerId === playerId,
  ).length;
  return (
    rule.tier * ownedCities + requireRuleset(state.rulesetId).technologyBaseCost
  );
}

export function technologyPrerequisitesMet(
  player: PlayerState,
  tech: TechId,
): boolean {
  const rule = requireRuleset(RULESET_ID).technologies.find(
    (candidate) => candidate.id === tech,
  );
  return (
    rule !== undefined &&
    rule.prerequisites.every((required) =>
      player.researchedTechs.includes(required),
    )
  );
}

export function growCity(
  city: CityState,
  populationAdded: number,
): CityGrowthResult {
  if (!Number.isSafeInteger(populationAdded) || populationAdded < 0) {
    throw new RangeError("Population growth must be a non-negative integer");
  }
  if (
    !Number.isSafeInteger(city.level) ||
    city.level < 1 ||
    !Number.isSafeInteger(city.population) ||
    city.population < 0 ||
    city.population > city.level
  ) {
    throw new RangeError("City growth requires a valid scalable city");
  }
  let level = city.level;
  let population = checkedAdd(city.population, populationAdded);
  const reachedLevels: number[] = [];
  while (true) {
    const threshold = checkedAdd(level, 1);
    if (population < threshold) break;
    population -= threshold;
    level = checkedAdd(level, 1);
    reachedLevels.push(level);
  }
  const ruleset = requireRuleset(RULESET_ID);
  checkedAdd(
    level,
    (city.isCapital ? ruleset.capitalIncomeBonus : 0) +
      (city.rewardLevel2 === "WORKSHOP" ? ruleset.workshopIncomeBonus : 0),
  );
  return {
    city: { ...city, level, population },
    reachedLevels,
  };
}

export function cityGrowthWouldOverflow(
  city: CityState,
  populationAdded: number,
): boolean {
  try {
    growCity(city, populationAdded);
    return false;
  } catch (error) {
    if (error instanceof RangeError) return true;
    throw error;
  }
}

function checkedAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Integer addition exceeds the safe-integer boundary");
  }
  return result;
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
