import type { CityId, PlayerId } from "../model/ids";
import type { CityIncomeEntryV6, DomainEventV6 } from "./events";
import type {
  CityStateV6,
  GameStateV6,
  PendingChoiceV6,
  PlayerStateV6,
  PopulationContributionV6,
  RewardIdV6,
} from "./types";

export interface CityGrowthResultV6 {
  readonly city: CityStateV6;
  readonly reachedLevels: readonly number[];
  readonly pendingChoices: readonly Extract<
    PendingChoiceV6,
    { readonly kind: "CITY_REWARD" }
  >[];
}

export interface PlayerIncomeV6 {
  readonly totalCoins: number;
  readonly cities: readonly CityIncomeEntryV6[];
}

export function growthSpentV6(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError("INTEGER_OVERFLOW");
  }
  const value = (BigInt(level) * BigInt(level + 1)) / 2n - 1n;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("INTEGER_OVERFLOW");
  }
  return Number(value);
}

export function cityUnitCapacityV6(city: Pick<CityStateV6, "level">): number {
  const capacity = city.level + 1;
  if (!Number.isSafeInteger(capacity)) throw new RangeError("INTEGER_OVERFLOW");
  return capacity;
}

export function assignedUnitCountV6(
  state: Pick<GameStateV6, "units">,
  cityId: CityId,
): number {
  return state.units.filter((unit) => unit.hp > 0 && unit.homeCityId === cityId)
    .length;
}

export function rewardCandidatesForLevelV6(
  level: number,
): readonly [RewardIdV6, RewardIdV6] {
  if (level === 2) return ["SURVEY", "STOCKPILE"];
  if (level === 3) return ["WALLS", "MILITIA"];
  if (level === 4) return ["EXPAND", "BOOM"];
  if (level >= 5) return ["JUGGERNAUT", "TREASURY"];
  throw new RangeError("A city reward requires reached level 2 or greater");
}

/** Applies a fully preflighted ledger total without ever lowering city level. */
export function resolveCityGrowthV6(
  city: CityStateV6,
  permanentPopulation: number,
  economicPopulation: number,
): CityGrowthResultV6 {
  if (
    !Number.isSafeInteger(permanentPopulation) ||
    permanentPopulation < 0 ||
    !Number.isSafeInteger(economicPopulation) ||
    economicPopulation < 0
  ) {
    throw new RangeError("INTEGER_OVERFLOW");
  }
  const total = permanentPopulation + economicPopulation;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");

  let level = city.level;
  let spent = growthSpentV6(level);
  const reachedLevels: number[] = [];
  while (total - spent >= level + 1) {
    const nextLevel = level + 1;
    if (!Number.isSafeInteger(nextLevel))
      throw new RangeError("INTEGER_OVERFLOW");
    spent = growthSpentV6(nextLevel);
    level = nextLevel;
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
    pendingChoices: reachedLevels.map((reachedLevel) => ({
      kind: "CITY_REWARD",
      cityId: city.id,
      reachedLevel,
      candidates: rewardCandidatesForLevelV6(reachedLevel),
    })),
  };
}

export function contributionTotalsForCityV6(
  contributions: readonly PopulationContributionV6[],
  cityId: CityId,
): { readonly permanent: number; readonly live: number } {
  let permanent = 0;
  let live = 0;
  for (const contribution of contributions) {
    if (contribution.cityId !== cityId) continue;
    if (contribution.category === "PERMANENT") {
      permanent += contribution.amount;
    } else {
      live += contribution.amount;
    }
    if (!Number.isSafeInteger(permanent) || !Number.isSafeInteger(live)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
  }
  return { permanent, live };
}

export function arePlayersAlliedV6(
  state: Pick<GameStateV6, "setup" | "humanPlayerId">,
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

export function arePlayersHostileV6(
  state: Pick<GameStateV6, "setup" | "humanPlayerId">,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return left !== right && !arePlayersAlliedV6(state, left, right);
}

export function isCityBesiegedV6(
  state: Pick<GameStateV6, "cities" | "units" | "setup" | "humanPlayerId">,
  city: CityStateV6,
): boolean {
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.at.x === city.at.x &&
      unit.at.y === city.at.y &&
      arePlayersHostileV6(state, unit.ownerId, city.ownerId),
  );
}

export function marketIncomeForCityV6(
  state: Pick<GameStateV6, "board" | "cities">,
  city: CityStateV6,
): number {
  // Market live output is introduced by phg.5/phg.7. Keeping the authoritative
  // income hook here prevents basic improvements from becoming Coin producers.
  void state;
  void city;
  return 0;
}

export function cityIncomeV6(state: GameStateV6, city: CityStateV6): number {
  if (isCityBesiegedV6(state, city)) return 0;
  const base = city.level + (city.isCapital ? 1 : 0);
  const market = marketIncomeForCityV6(state, city);
  const negativePopulation = Math.min(0, city.population);
  const income = Math.max(0, base + market + negativePopulation);
  if (!Number.isSafeInteger(income)) throw new RangeError("INTEGER_OVERFLOW");
  return income;
}

export function playerIncomeV6(
  state: GameStateV6,
  playerId: PlayerId,
): PlayerIncomeV6 {
  const cities = state.cities
    .filter((city) => city.ownerId === playerId)
    .sort((left, right) => left.id - right.id)
    .map((city) => ({ cityId: city.id, coins: cityIncomeV6(state, city) }));
  const totalCoins = cities.reduce((total, entry) => total + entry.coins, 0);
  if (!Number.isSafeInteger(totalCoins))
    throw new RangeError("INTEGER_OVERFLOW");
  return { totalCoins, cities };
}

export function startTurnV6(
  state: GameStateV6,
  player: PlayerStateV6,
): { readonly state: GameStateV6; readonly events: readonly DomainEventV6[] } {
  const income = playerIncomeV6(state, player.id);
  const balance = player.coins + income.totalCoins;
  if (!Number.isSafeInteger(balance)) throw new RangeError("INTEGER_OVERFLOW");
  const players = state.players.map((candidate) =>
    candidate.id === player.id ? { ...candidate, coins: balance } : candidate,
  );
  const units = state.units.map((unit) =>
    unit.ownerId === player.id && unit.hp > 0
      ? {
          ...unit,
          activation: {
            moved: false,
            movedPathLength: 0,
            attacked: false,
            healed: false,
            recovered: false,
            captured: false,
            handled: false,
            specialActed: false,
          },
        }
      : unit,
  );
  return {
    state: { ...state, players, units },
    events: [
      { kind: "TURN_STARTED", playerId: player.id, coins: balance },
      {
        kind: "INCOME_AWARDED",
        playerId: player.id,
        totalCoins: income.totalCoins,
        cities: income.cities,
      },
    ],
  };
}
