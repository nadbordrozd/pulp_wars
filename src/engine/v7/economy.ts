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

export function isActivePortV7(
  state: Pick<
    GameStateV7,
    "board" | "cities" | "units" | "setup" | "humanPlayerId"
  >,
  at: { readonly x: number; readonly y: number },
  ownerId: PlayerId,
): boolean {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (
    tile?.at.x !== at.x ||
    tile.at.y !== at.y ||
    (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD")
  )
    return false;
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city?.ownerId !== ownerId) return false;
  return !state.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.at.x === at.x &&
      unit.at.y === at.y &&
      unit.ownerId !== ownerId &&
      arePlayersHostileV7(state, unit.ownerId, ownerId) &&
      (unit.form === "NAVAL" || unit.form === "EMBARKED"),
  );
}

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
  const fortified = state.players
    .find((player) => player.id === city.ownerId)
    ?.researchedTechs.includes("PLANNING");
  const result = city.level + 1 + (fortified ? 1 : 0);
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

export function rewardCandidatesForLevelV7(
  level: number,
): readonly [RewardIdV7, RewardIdV7] {
  if (level === 2) return ["SURVEY", "STOCKPILE"];
  if (level === 3) return ["WALLS", "MILITIA"];
  if (level === 4) return ["BOOM", "TREASURY_8"];
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
  state: NetworkStateV7,
  city: CityStateV7,
): number {
  const commerce = state.players
    .find((player) => player.id === city.ownerId)
    ?.researchedTechs.includes("COMMERCE");
  let total = 0;
  for (const tile of state.board.tiles)
    if (tile.territoryCityId === city.id && tile.improvement === "MARKET") {
      const evaluation = spatialContributionAtV7(state, tile.at, "MARKET");
      total += Math.min(4, evaluation.marketIncome) * (commerce ? 2 : 1);
      if (!Number.isSafeInteger(total))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  return total;
}

export function recomputeLiveEconomyV7(
  beforeState: GameStateV7,
  finalGraph: Pick<GameStateV7, "board" | "cities"> &
    Partial<Pick<GameStateV7, "units">>,
  contributions: readonly PopulationContributionV7[],
): LiveEconomyResultV7 {
  const graphState: GameStateV7 = {
    ...beforeState,
    board: finalGraph.board,
    cities: finalGraph.cities,
    units: finalGraph.units ?? beforeState.units,
  };
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
      tile.improvement === "MONUMENT"
    )
      throw new RangeError("INVALID_STATE");
    const city = finalGraph.cities.find(
      (candidate) => candidate.id === tile.territoryCityId,
    );
    if (city === undefined) throw new RangeError("INVALID_STATE");
    return {
      ...contribution,
      cityId: tile.territoryCityId,
      amount:
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
          ? isActivePortV7(
              {
                ...beforeState,
                board: finalGraph.board,
                cities: finalGraph.cities,
                units: finalGraph.units ?? beforeState.units,
              },
              tile.at,
              city.ownerId,
            )
            ? tile.improvement === "SHIPYARD"
              ? 2
              : 1
            : 0
          : spatialContributionAtV7(finalGraph, tile.at, tile.improvement)
              .population,
    };
  });
  const changes: CityEconomyChangeV7[] = [];
  const cities: CityStateV7[] = [];
  const afterStateForMarkets = graphState;
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
    live += roadPopulationForCityV7(graphState, city);
    if (!Number.isSafeInteger(live)) throw new RangeError("INTEGER_OVERFLOW");
    const growth = resolveCityGrowthV7(city, permanent, live);
    cities.push(growth.city);
    const before = beforeState.cities.find((item) => item.id === city.id);
    if (before === undefined) continue;
    const marketBefore = marketIncomeForCityV7(beforeState, before);
    const marketAfter = marketIncomeForCityV7(
      afterStateForMarkets,
      growth.city,
    );
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
  const base =
    city.level +
    (city.isCapital ? 1 : 0) +
    (seaTradeCityIdsV7(state, city.ownerId).has(city.id) ? 1 : 0) +
    (landTradeCityIdsV7(state, city.ownerId).has(city.id) ? 1 : 0);
  const result = Math.max(
    1,
    base + marketIncomeForCityV7(state, city) + Math.min(0, city.population),
  );
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

type NetworkStateV7 = Pick<
  GameStateV7,
  "board" | "cities" | "players" | "units" | "setup" | "humanPlayerId"
>;
const SEA_TRADE_CACHE = new WeakMap<
  object,
  Map<PlayerId, ReadonlySet<CityId>>
>();
const COMBINED_NETWORK_CACHE = new WeakMap<
  object,
  Map<PlayerId, ReadonlySet<CityId>>
>();
const COMBINED_ROAD_CACHE = new WeakMap<
  object,
  Map<PlayerId, ReadonlySet<string>>
>();

export function combinedNetworkCityIdsV7(
  state: NetworkStateV7,
  playerId: PlayerId,
): ReadonlySet<CityId> {
  seaTradeCityIdsV7(state, playerId);
  return COMBINED_NETWORK_CACHE.get(state)?.get(playerId) ?? new Set<CityId>();
}

/** Roads-only capital-rooted land graph, independent from land-trade income. */
export function landConnectedCityIdsV7(
  state: NetworkStateV7,
  playerId: PlayerId,
): ReadonlySet<CityId> {
  seaTradeCityIdsV7(state, playerId);
  return COMBINED_NETWORK_CACHE.get(state)?.get(playerId) ?? new Set<CityId>();
}

export function roadPopulationForCityV7(
  state: NetworkStateV7,
  city: Pick<CityStateV7, "id" | "ownerId">,
): number {
  const player = state.players.find(
    (candidate) => candidate.id === city.ownerId,
  );
  if (player === undefined) return 0;
  const connected = landConnectedCityIdsV7(state, city.ownerId);
  if (!connected.has(player.originalCapitalCityId)) return 0;
  const connectedOtherCities = [...connected].filter(
    (cityId) => cityId !== player.originalCapitalCityId,
  );
  return city.id === player.originalCapitalCityId
    ? connectedOtherCities.length
    : Number(connectedOtherCities.includes(city.id));
}

/** Commerce-only income recipients from the Roads land graph. */
export function landTradeCityIdsV7(
  state: NetworkStateV7,
  playerId: PlayerId,
): ReadonlySet<CityId> {
  seaTradeCityIdsV7(state, playerId);
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player?.researchedTechs.includes("COMMERCE")) return new Set();
  const connected = landConnectedCityIdsV7(state, playerId);
  return new Set(
    [...connected].filter((cityId) => cityId !== player.originalCapitalCityId),
  );
}

export function combinedNetworkRoadKeysV7(
  state: NetworkStateV7,
  playerId: PlayerId,
): ReadonlySet<string> {
  seaTradeCityIdsV7(state, playerId);
  return COMBINED_ROAD_CACHE.get(state)?.get(playerId) ?? new Set<string>();
}

/** Owner-private Navigation Port/Shipyard graph with bounded sea edges. */
export function seaTradeCityIdsV7(
  state: NetworkStateV7,
  playerId: PlayerId,
): ReadonlySet<CityId> {
  let byOwner = SEA_TRADE_CACHE.get(state);
  if (byOwner === undefined) {
    byOwner = new Map();
    SEA_TRADE_CACHE.set(state, byOwner);
  }
  const prior = byOwner.get(playerId);
  if (prior !== undefined) return prior;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) {
    const empty = new Set<CityId>();
    byOwner.set(playerId, empty);
    let combinedByOwner = COMBINED_NETWORK_CACHE.get(state);
    if (combinedByOwner === undefined) {
      combinedByOwner = new Map();
      COMBINED_NETWORK_CACHE.set(state, combinedByOwner);
    }
    combinedByOwner.set(playerId, empty);
    let roadsByOwner = COMBINED_ROAD_CACHE.get(state);
    if (roadsByOwner === undefined) {
      roadsByOwner = new Map();
      COMBINED_ROAD_CACHE.set(state, roadsByOwner);
    }
    roadsByOwner.set(playerId, new Set());
    return empty;
  }
  const explored = new Set(player.explored.map(coordKey));
  const water = new Set(
    state.board.tiles
      .filter(
        (tile) =>
          tile.biome === null &&
          explored.has(coordKey(tile.at)) &&
          (tile.terrain !== "DEEP_WATER" ||
            player.researchedTechs.includes("NAVIGATION")),
      )
      .map((tile) => coordKey(tile.at)),
  );
  const ports = player.researchedTechs.includes("NAVIGATION")
    ? state.board.tiles.filter(
        (tile) =>
          (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
          water.has(coordKey(tile.at)) &&
          isActivePortV7(state, tile.at, playerId),
      )
    : [];
  const seaEdges = new Map<CityId, Set<CityId>>();
  const portIndexesByKey = new Map<string, number[]>();
  ports.forEach((port, index) => {
    const indexes = portIndexesByKey.get(coordKey(port.at)) ?? [];
    indexes.push(index);
    portIndexesByKey.set(coordKey(port.at), indexes);
  });
  for (let leftIndex = 0; leftIndex < ports.length; leftIndex += 1) {
    const left = ports[leftIndex];
    if (left?.territoryCityId === null || left === undefined) continue;
    const seen = new Set([coordKey(left.at)]);
    const queue = [{ at: left.at, distance: 0 }];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current === undefined || current.distance >= 5) continue;
      for (const near of neighbors8(
        state.board.width,
        state.board.height,
        current.at,
      )) {
        const nearKey = coordKey(near);
        if (!water.has(nearKey) || seen.has(nearKey)) continue;
        seen.add(nearKey);
        queue.push({ at: near, distance: current.distance + 1 });
        for (const rightIndex of portIndexesByKey.get(nearKey) ?? []) {
          if (rightIndex <= leftIndex) continue;
          const right = ports[rightIndex];
          if (right?.territoryCityId === null || right === undefined) continue;
          for (const [from, to] of [
            [left.territoryCityId, right.territoryCityId],
            [right.territoryCityId, left.territoryCityId],
          ] as const) {
            const sea = seaEdges.get(from) ?? new Set<CityId>();
            if (from !== to) sea.add(to);
            seaEdges.set(from, sea);
          }
        }
      }
    }
  }
  const ownedCityAt = new Map(
    state.cities
      .filter((city) => city.ownerId === playerId)
      .map((city) => [coordKey(city.at), city.id] as const),
  );
  const roadKeys = new Set(
    state.board.tiles
      .filter(
        (tile) =>
          tile.road &&
          player.researchedTechs.includes("ROADS") &&
          (tile.territoryCityId === null ||
            state.cities.some(
              (city) =>
                city.id === tile.territoryCityId && city.ownerId === playerId,
            )),
      )
      .map((tile) => coordKey(tile.at)),
  );
  if (player.researchedTechs.includes("ROADS"))
    for (const key of ownedCityAt.keys()) roadKeys.add(key);
  const roadLeft = new Set(roadKeys);
  const roadComponents: {
    readonly keys: ReadonlySet<string>;
    readonly cityIds: ReadonlySet<CityId>;
  }[] = [];
  while (roadLeft.size > 0) {
    const first = roadLeft.values().next().value as string;
    const [y, x] = first.split(",").map(Number);
    if (x === undefined || y === undefined)
      throw new RangeError("INVALID_STATE");
    const roadQueue = [{ x, y }];
    const cityIds = new Set<CityId>();
    const componentKeys = new Set<string>();
    roadLeft.delete(first);
    for (let index = 0; index < roadQueue.length; index += 1) {
      const at = roadQueue[index];
      if (at === undefined) throw new RangeError("INVALID_STATE");
      componentKeys.add(coordKey(at));
      const cityId = ownedCityAt.get(coordKey(at));
      if (cityId !== undefined) cityIds.add(cityId);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const near = { x: at.x + dx, y: at.y + dy };
          if (roadLeft.delete(coordKey(near))) roadQueue.push(near);
        }
    }
    roadComponents.push({ keys: componentKeys, cityIds });
  }
  const originalCapital = state.cities.find(
    (city) =>
      city.id === player.originalCapitalCityId && city.ownerId === playerId,
  );
  const connected = new Set<CityId>();
  if (originalCapital !== undefined)
    for (const component of roadComponents)
      if (component.cityIds.has(originalCapital.id))
        for (const cityId of component.cityIds) connected.add(cityId);
  const eligible = new Set<CityId>();
  for (const city of state.cities)
    if (
      city.ownerId === playerId &&
      city.id !== player.originalCapitalCityId &&
      (seaEdges.get(city.id)?.size ?? 0) > 0
    )
      eligible.add(city.id);
  let combinedByOwner = COMBINED_NETWORK_CACHE.get(state);
  if (combinedByOwner === undefined) {
    combinedByOwner = new Map();
    COMBINED_NETWORK_CACHE.set(state, combinedByOwner);
  }
  combinedByOwner.set(playerId, connected);
  const connectedRoadKeys = new Set<string>();
  for (const component of roadComponents)
    if ([...component.cityIds].some((cityId) => connected.has(cityId)))
      for (const at of component.keys) connectedRoadKeys.add(at);
  let roadsByOwner = COMBINED_ROAD_CACHE.get(state);
  if (roadsByOwner === undefined) {
    roadsByOwner = new Map();
    COMBINED_ROAD_CACHE.set(state, roadsByOwner);
  }
  roadsByOwner.set(playerId, connectedRoadKeys);
  byOwner.set(playerId, eligible);
  return eligible;
}

function coordKey(at: { readonly x: number; readonly y: number }): string {
  return `${at.y},${at.x}`;
}

function neighbors8(
  width: number,
  height: number,
  at: { readonly x: number; readonly y: number },
): readonly { readonly x: number; readonly y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height
      )
        result.push({ x, y });
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
  resetActivation = true,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const reset: GameStateV7 = {
    ...state,
    cities: state.cities.map((city) =>
      city.ownerId === player.id
        ? { ...city, cityActionAvailable: true }
        : city,
    ),
    units: state.units.map((unit) =>
      resetActivation && unit.ownerId === player.id && unit.hp > 0
        ? {
            ...unit,
            captureEligible: unitOccupiesCapturableSiteV7(state, unit),
            activation: {
              moved: false,
              movedPathLength: 0,
              attacked: false,
              attacksUsed: 0 as const,
              tendedThisTurn: false,
              inspired: false,
              overrunActive: false,
              recovered: false,
              captured: false,
              handled: false,
              specialActed: false,
            },
          }
        : unit,
    ),
  };
  const healing = resolveWindmillHealingV7(reset, player.id);
  const income = playerIncomeV7(healing.state, player.id);
  const coins = player.coins + income.totalCoins;
  if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
  return {
    state: {
      ...healing.state,
      players: healing.state.players.map((item) =>
        item.id === player.id ? { ...item, coins } : item,
      ),
    },
    events: [
      { kind: "TURN_STARTED", playerId: player.id, coins },
      ...healing.events,
      {
        kind: "INCOME_AWARDED",
        playerId: player.id,
        totalCoins: income.totalCoins,
        cities: income.cities,
      },
    ],
  };
}

function resolveWindmillHealingV7(
  state: GameStateV7,
  playerId: PlayerId,
): {
  readonly state: GameStateV7;
  readonly events: readonly Extract<
    DomainEventV7,
    { readonly kind: "WINDMILL_HEALING_RESOLVED" }
  >[];
} {
  const sources = state.board.tiles
    .flatMap((tile) => {
      if (tile.improvement !== "WINDMILL" || tile.territoryCityId === null)
        return [];
      const city = state.cities.find(
        (candidate) =>
          candidate.id === tile.territoryCityId &&
          candidate.ownerId === playerId,
      );
      return city === undefined ? [] : [{ at: tile.at, cityId: city.id }];
    })
    .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
  const assigned = new Set<number>();
  const events: Extract<
    DomainEventV7,
    { readonly kind: "WINDMILL_HEALING_RESOLVED" }
  >[] = [];
  const amounts = new Map<number, number>();
  for (const source of sources) {
    const results = state.units
      .filter(
        (unit) =>
          unit.ownerId === playerId &&
          unit.hp > 0 &&
          unit.hp < unit.maxHp &&
          !assigned.has(unit.id) &&
          Math.max(
            Math.abs(unit.at.x - source.at.x),
            Math.abs(unit.at.y - source.at.y),
          ) === 1,
      )
      .sort((left, right) => left.id - right.id)
      .map((unit) => {
        const amount = Math.min(6, unit.maxHp - unit.hp);
        assigned.add(unit.id);
        amounts.set(unit.id, amount);
        return { unitId: unit.id, amount, hpAfter: unit.hp + amount };
      });
    if (results.length > 0)
      events.push({
        kind: "WINDMILL_HEALING_RESOLVED",
        playerId,
        cityId: source.cityId,
        at: source.at,
        results,
      });
  }
  if (amounts.size === 0) return { state, events };
  return {
    state: {
      ...state,
      units: state.units.map((unit) => {
        const amount = amounts.get(unit.id);
        return amount === undefined ? unit : { ...unit, hp: unit.hp + amount };
      }),
    },
    events,
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
