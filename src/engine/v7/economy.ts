import type { CityId, PlayerId } from "../model/ids";
import type { DomainEventV7 } from "./events";
import { spatialContributionAtV7 } from "./spatial-economy";
import type {
  CityStateV7,
  GameStateV7,
  PlayerStateV7,
  PopulationContributionV7,
  RewardIdV7,
} from "./types";

export interface CityGrowthResultV7 {
  readonly city: CityStateV7;
  readonly reachedLevels: readonly number[];
}
export interface CityEconomyChangeV7 {
  readonly cityId: CityId;
  readonly before: CityStateV7;
  readonly after: CityStateV7;
  readonly marketBefore: number;
  readonly marketAfter: number;
  readonly reachedLevels: readonly number[];
}
export interface LiveEconomyResultV7 {
  readonly cities: readonly CityStateV7[];
  readonly populationContributions: readonly PopulationContributionV7[];
  readonly changes: readonly CityEconomyChangeV7[];
}

export function growthSpentV7(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1)
    throw new RangeError("INTEGER_OVERFLOW");
  const result = (BigInt(level) * BigInt(level + 1)) / 2n - 1n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  return Number(result);
}

export function cityUnitCapacityV7(
  state: Pick<GameStateV7, "board" | "players">,
  city: Pick<CityStateV7, "id" | "level" | "ownerId">,
): number {
  const barracks = state.board.tiles.some(
    (tile) =>
      tile.territoryCityId === city.id && tile.improvement === "BARRACKS",
  );
  const fortified = state.players
    .find((player) => player.id === city.ownerId)
    ?.researchedTechs.includes("FORTIFICATION");
  const result = city.level + 1 + (fortified ? 1 : 0) + (barracks ? 2 : 0);
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

export function assignedUnitCountV7(
  state: Pick<GameStateV7, "units">,
  cityId: CityId,
): number {
  return state.units.filter((unit) => unit.hp > 0 && unit.homeCityId === cityId)
    .length;
}

export function reservedCapacityCountV7(
  state: Pick<GameStateV7, "defectionMarks">,
  cityId: CityId,
): number {
  return state.defectionMarks.filter(
    (mark) => mark.reservedHomeCityId === cityId,
  ).length;
}

export function rewardCandidatesForLevelV7(
  level: number,
): readonly [RewardIdV7, RewardIdV7] {
  if (level === 2) return ["SURVEY", "STOCKPILE"];
  if (level === 3) return ["WALLS", "MILITIA"];
  if (level === 4) return ["EXPAND", "BOOM"];
  if (level >= 5) return ["JUGGERNAUT", "TREASURY"];
  throw new RangeError("INVALID_REWARD_LEVEL");
}

export function resolveCityGrowthV7(
  city: CityStateV7,
  permanentPopulation: number,
  economicPopulation: number,
): CityGrowthResultV7 {
  if (
    !Number.isSafeInteger(permanentPopulation) ||
    permanentPopulation < 0 ||
    !Number.isSafeInteger(economicPopulation) ||
    economicPopulation < 0
  )
    throw new RangeError("INTEGER_OVERFLOW");
  const total = permanentPopulation + economicPopulation;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");
  let level = city.level;
  let spent = growthSpentV7(level);
  const reachedLevels: number[] = [];
  while (total - spent >= level + 1) {
    level += 1;
    if (!Number.isSafeInteger(level)) throw new RangeError("INTEGER_OVERFLOW");
    spent = growthSpentV7(level);
    reachedLevels.push(level);
  }
  const population = total - spent;
  if (!Number.isSafeInteger(population))
    throw new RangeError("INTEGER_OVERFLOW");
  return {
    city: {
      ...city,
      level,
      permanentPopulation,
      economicPopulation,
      population,
    },
    reachedLevels,
  };
}

export function arePlayersAlliedV7(
  state: Pick<GameStateV7, "setup" | "humanPlayerId">,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return (
    left !== right &&
    state.setup.aiMode === "COOPERATIVE" &&
    left !== state.humanPlayerId &&
    right !== state.humanPlayerId
  );
}
export function arePlayersHostileV7(
  state: Pick<GameStateV7, "setup" | "humanPlayerId">,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return left !== right && !arePlayersAlliedV7(state, left, right);
}
export function isCityBesiegedV7(
  state: Pick<GameStateV7, "cities" | "units" | "setup" | "humanPlayerId">,
  city: CityStateV7,
): boolean {
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.at.x === city.at.x &&
      unit.at.y === city.at.y &&
      arePlayersHostileV7(state, unit.ownerId, city.ownerId),
  );
}

export function marketIncomeForCityV7(
  state: Pick<GameStateV7, "board" | "cities">,
  city: CityStateV7,
): number {
  let total = 0;
  for (const tile of state.board.tiles)
    if (tile.territoryCityId === city.id && tile.improvement === "MARKET") {
      total += spatialContributionAtV7(state, tile.at, "MARKET").marketIncome;
      if (!Number.isSafeInteger(total))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  return total;
}

export function recomputeLiveEconomyV7(
  beforeState: GameStateV7,
  finalGraph: Pick<GameStateV7, "board" | "cities">,
  contributions: readonly PopulationContributionV7[],
): LiveEconomyResultV7 {
  const populationContributions = contributions.map((contribution) => {
    if (contribution.category === "PERMANENT") return contribution;
    const tile =
      finalGraph.board.tiles[
        contribution.source.at.y * finalGraph.board.width +
          contribution.source.at.x
      ];
    if (tile?.territoryCityId === null || tile?.territoryCityId === undefined)
      throw new RangeError("INVALID_STATE");
    if (contribution.source.kind === "MONUMENT") {
      if (tile.improvement !== "MONUMENT")
        throw new RangeError("INVALID_STATE");
      return { ...contribution, cityId: tile.territoryCityId, amount: 3 };
    }
    if (
      contribution.source.kind !== "IMPROVEMENT" ||
      tile.at.x !== contribution.source.at.x ||
      tile.at.y !== contribution.source.at.y ||
      tile.improvement !== contribution.source.improvement ||
      tile.improvement === "MARKET" ||
      tile.improvement === "BARRACKS" ||
      tile.improvement === "MONUMENT"
    )
      throw new RangeError("INVALID_STATE");
    return {
      ...contribution,
      cityId: tile.territoryCityId,
      amount: spatialContributionAtV7(finalGraph, tile.at, tile.improvement)
        .population,
    };
  });
  const changes: CityEconomyChangeV7[] = [];
  const cities: CityStateV7[] = [];
  for (const city of [...finalGraph.cities].sort((a, b) => a.id - b.id)) {
    let permanent = 0;
    let live = 0;
    for (const contribution of populationContributions)
      if (contribution.cityId === city.id) {
        if (contribution.category === "PERMANENT")
          permanent += contribution.amount;
        else live += contribution.amount;
        if (!Number.isSafeInteger(permanent) || !Number.isSafeInteger(live))
          throw new RangeError("INTEGER_OVERFLOW");
      }
    const growth = resolveCityGrowthV7(city, permanent, live);
    cities.push(growth.city);
    const before = beforeState.cities.find((item) => item.id === city.id);
    if (before === undefined) continue;
    const marketBefore = marketIncomeForCityV7(beforeState, before);
    const marketAfter = marketIncomeForCityV7(finalGraph, growth.city);
    if (
      before.economicPopulation !== growth.city.economicPopulation ||
      before.population !== growth.city.population ||
      marketBefore !== marketAfter
    )
      changes.push({
        cityId: city.id,
        before,
        after: growth.city,
        marketBefore,
        marketAfter,
        reachedLevels: growth.reachedLevels,
      });
  }
  return { cities, populationContributions, changes };
}

export function cityIncomeV7(state: GameStateV7, city: CityStateV7): number {
  if (isCityBesiegedV7(state, city)) return 0;
  const base = city.level + (city.isCapital ? 1 : 0);
  const preBlackout = Math.max(
    1,
    base + marketIncomeForCityV7(state, city) + Math.min(0, city.population),
  );
  const suppression =
    city.blackout?.phase === "ACTIVE" ? Math.min(3, preBlackout) : 0;
  const result = preBlackout - suppression;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

export function playerIncomeV7(
  state: GameStateV7,
  playerId: PlayerId,
): {
  readonly totalCoins: number;
  readonly cities: readonly {
    readonly cityId: CityId;
    readonly coins: number;
  }[];
} {
  const cities = state.cities
    .filter((city) => city.ownerId === playerId)
    .sort((a, b) => a.id - b.id)
    .map((city) => ({ cityId: city.id, coins: cityIncomeV7(state, city) }));
  const totalCoins = cities.reduce((sum, entry) => sum + entry.coins, 0);
  if (!Number.isSafeInteger(totalCoins))
    throw new RangeError("INTEGER_OVERFLOW");
  return { totalCoins, cities };
}

export function unitOccupiesCapturableSiteV7(
  state: Pick<GameStateV7, "board" | "cities" | "setup" | "humanPlayerId">,
  unit: GameStateV7["units"][number],
): boolean {
  if (unit.hp <= 0) return false;
  const city = state.cities.find(
    (item) => item.at.x === unit.at.x && item.at.y === unit.at.y,
  );
  if (city !== undefined)
    return arePlayersHostileV7(state, unit.ownerId, city.ownerId);
  const tile = state.board.tiles[unit.at.y * state.board.width + unit.at.x];
  return (
    tile?.at.x === unit.at.x &&
    tile.at.y === unit.at.y &&
    tile.site === "VILLAGE"
  );
}

export function startTurnEconomyV7(
  state: GameStateV7,
  player: PlayerStateV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const income = playerIncomeV7(state, player.id);
  const coins = player.coins + income.totalCoins;
  if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
  return {
    state: {
      ...state,
      players: state.players.map((item) =>
        item.id === player.id ? { ...item, coins } : item,
      ),
      units: state.units.map((unit) =>
        unit.ownerId === player.id && unit.hp > 0
          ? {
              ...unit,
              captureEligible: unitOccupiesCapturableSiteV7(state, unit),
              activation: {
                moved: false,
                movedPathLength: 0,
                attacked: false,
                attacksUsed: 0 as const,
                pursuitPhase: "NONE" as const,
                healed: false,
                recovered: false,
                captured: false,
                handled: false,
                specialActed: false,
              },
            }
          : unit,
      ),
    },
    events: [
      { kind: "TURN_STARTED", playerId: player.id, coins },
      {
        kind: "INCOME_AWARDED",
        playerId: player.id,
        totalCoins: income.totalCoins,
        cities: income.cities,
      },
    ],
  };
}

export function economyEventsV7(
  changes: readonly CityEconomyChangeV7[],
): readonly DomainEventV7[] {
  return changes.map((change) => ({
    kind: "CITY_ECONOMY_CHANGED",
    cityId: change.cityId,
    economicBefore: change.before.economicPopulation,
    economicAfter: change.after.economicPopulation,
    populationBefore: change.before.population,
    populationAfter: change.after.population,
    marketBefore: change.marketBefore,
    marketAfter: change.marketAfter,
  }));
}
export function growthEventsV7(
  changes: readonly CityEconomyChangeV7[],
): readonly DomainEventV7[] {
  return changes.flatMap((change) =>
    change.reachedLevels.map((level): DomainEventV7 => ({
      kind: "CITY_LEVELED_UP",
      cityId: change.cityId,
      level,
    })),
  );
}
