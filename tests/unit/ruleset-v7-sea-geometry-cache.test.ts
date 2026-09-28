import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  combinedNetworkCityIdsV7,
  resetSeaRouteGeometryCacheV7,
  seaRouteGeometryCacheDiagnosticsV7,
  seaTradeCityIdsV7,
  type CityStateV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { initialV7 } from "../fixtures/v7-builders";

describe("ruleset-7 bounded structural sea geometry", () => {
  it("reuses cold structurally equal and interleaved geometry with exact results", () => {
    const state = seaGraph(91);
    const owner = state.humanPlayerId;
    const expected = [...seaTradeCityIdsV7(structuredClone(state), owner)];
    resetSeaRouteGeometryCacheV7();

    expect([...seaTradeCityIdsV7(structuredClone(state), owner)]).toEqual(
      expected,
    );
    expect(seaRouteGeometryCacheDiagnosticsV7()).toMatchObject({
      entries: 1,
      hits: 0,
      misses: 1,
      builds: 1,
    });
    expect([...seaTradeCityIdsV7(structuredClone(state), owner)]).toEqual(
      expected,
    );
    const interrupted = structuredClone(state);
    interrupted.players = interrupted.players.map((player) =>
      player.id === owner
        ? { ...player, explored: player.explored.filter((at) => at.x !== 3) }
        : player,
    );
    seaTradeCityIdsV7(interrupted, owner);
    expect([...seaTradeCityIdsV7(structuredClone(state), owner)]).toEqual(
      expected,
    );
    expect(seaRouteGeometryCacheDiagnosticsV7()).toMatchObject({
      entries: 2,
      hits: 2,
      misses: 2,
      builds: 2,
    });
  });

  it("keeps ownership, city ids, blockade, alliance, roads, and capital fresh", () => {
    const state = seaGraph(92);
    const owner = state.humanPlayerId;
    const baseline = seaTradeCityIdsV7(state, owner);
    expect(baseline.size).toBe(1);

    const ports = state.board.tiles.filter(
      (tile) => tile.improvement === "PORT",
    );
    const remotePort = required(ports[1]);
    const remoteCityId = required(remotePort.territoryCityId);
    const remoteCity = required(
      state.cities.find((city) => city.id === remoteCityId),
    );
    const enemy = required(state.players.find((player) => player.id !== owner));
    const blockader = required(
      state.units.find((unit) => unit.ownerId === enemy.id),
    );
    state.units.push({
      ...blockader,
      at: remotePort.at,
      form: "NAVAL",
      hp: 10,
      maxHp: 10,
    });
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());

    state.units.pop();
    remoteCity.ownerId = enemy.id;
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
    remoteCity.ownerId = owner;
    expect(seaTradeCityIdsV7(state, owner)).toEqual(baseline);

    remotePort.territoryCityId = required(ports[0]).territoryCityId;
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
    remotePort.territoryCityId = remoteCityId;
    expect(seaTradeCityIdsV7(state, owner)).toEqual(baseline);

    const capital = required(
      state.players.find((player) => player.id === owner),
    );
    const original = required(
      state.cities.find((city) => city.id === capital.originalCapitalCityId),
    );
    const roadAt = connectRoad(state, original, remoteCity);
    expect(combinedNetworkCityIdsV7(state, owner)).toEqual(
      new Set([original.id, remoteCity.id]),
    );
    roadAt.road = false;
    expect(combinedNetworkCityIdsV7(state, owner)).toEqual(
      new Set([original.id]),
    );
    roadAt.road = true;
    original.ownerId = enemy.id;
    expect(combinedNetworkCityIdsV7(state, owner)).toEqual(new Set());
    original.ownerId = owner;
  });

  it("changes geometry for exploration, Navigation, Port removal, and water", () => {
    const state = seaGraph(93);
    const owner = state.humanPlayerId;
    expect(seaTradeCityIdsV7(state, owner).size).toBe(1);

    const player = required(state.players.find((item) => item.id === owner));
    player.explored = player.explored.filter(
      (at) => !(at.x === 3 && at.y === 1),
    );
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
    player.explored = state.board.tiles.map((tile) => tile.at);

    player.researchedTechs = player.researchedTechs.filter(
      (tech) => tech !== "NAVIGATION",
    );
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
    player.researchedTechs = TECHNOLOGY_IDS_V7;

    const middle = required(
      state.board.tiles.find((tile) => tile.at.x === 3 && tile.at.y === 1),
    );
    middle.biome = "PLAINS";
    middle.terrain = "GRASS";
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
    middle.biome = null;
    middle.terrain = "DEEP_WATER";
    expect(seaTradeCityIdsV7(state, owner).size).toBe(1);

    const remotePort = required(
      state.board.tiles.find((tile) => tile.at.x === 5 && tile.at.y === 1),
    );
    remotePort.improvement = null;
    expect(seaTradeCityIdsV7(state, owner)).toEqual(new Set());
  });

  it("reevaluates allied blockades for the current relationship", () => {
    const rival = seaGraph(94, 2);
    const owner = required(rival.players[1]).id;
    const ally = required(rival.players[2]).id;
    transferGraph(rival, owner);
    const port = required(
      rival.board.tiles.find(
        (tile) =>
          tile.improvement === "PORT" &&
          rival.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId === owner,
      ),
    );
    const unit = required(
      rival.units.find((candidate) => candidate.ownerId === ally),
    );
    rival.units = [{ ...unit, at: port.at, form: "NAVAL", hp: 10, maxHp: 10 }];
    expect(seaTradeCityIdsV7(rival, owner)).toEqual(new Set());
    rival.setup = { ...rival.setup, aiMode: "COOPERATIVE" };
    expect(seaTradeCityIdsV7(rival, owner).size).toBe(1);
  });

  it("bounds entries and skips water expansion when Navigation or two Ports are absent", () => {
    const base = seaGraph(95);
    const owner = base.humanPlayerId;
    resetSeaRouteGeometryCacheV7();
    const variations = base.board.tiles.filter(
      (tile) => tile.at.y !== 1 || tile.at.x < 1 || tile.at.x > 5,
    );
    for (let index = 0; index < 20; index += 1) {
      const state = structuredClone(base);
      const variation = required(variations[index]);
      const tile = required(
        state.board.tiles.find(
          (candidate) =>
            candidate.at.x === variation.at.x &&
            candidate.at.y === variation.at.y,
        ),
      );
      tile.biome = null;
      tile.terrain = "SHALLOW_WATER";
      tile.site = null;
      seaTradeCityIdsV7(state, owner);
    }
    expect(seaRouteGeometryCacheDiagnosticsV7()).toMatchObject({
      capacity: 16,
      entries: 16,
      builds: 20,
    });

    resetSeaRouteGeometryCacheV7();
    const noPorts = structuredClone(base);
    for (const tile of noPorts.board.tiles) tile.improvement = null;
    seaTradeCityIdsV7(noPorts, owner);
    const noNavigation = structuredClone(base);
    noNavigation.players = noNavigation.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter(
              (tech) => tech !== "NAVIGATION",
            ),
          }
        : player,
    );
    seaTradeCityIdsV7(noNavigation, owner);
    expect(seaRouteGeometryCacheDiagnosticsV7()).toEqual({
      capacity: 16,
      entries: 0,
      hits: 0,
      misses: 0,
      builds: 0,
      skipped: 2,
    });
  });
});

function seaGraph(seed: number, aiCount: 1 | 2 | 3 = 1): MutableGameState {
  const base = structuredClone(initialV7(seed, aiCount)) as MutableGameState;
  const owner = base.humanPlayerId;
  const cities = base.cities.slice(0, 2);
  const first = required(cities[0]);
  const second = required(cities[1]);
  for (const player of base.players)
    if (player.id === owner) {
      player.researchedTechs = TECHNOLOGY_IDS_V7;
      player.explored = base.board.tiles.map((tile) => tile.at);
      player.originalCapitalCityId = first.id;
    }
  first.ownerId = owner;
  second.ownerId = owner;
  for (const tile of base.board.tiles)
    if (tile.at.y === 1 && tile.at.x >= 1 && tile.at.x <= 5) {
      tile.biome = null;
      tile.terrain = "SHALLOW_WATER";
      tile.resource = null;
      tile.improvement = tile.at.x === 1 || tile.at.x === 5 ? "PORT" : null;
      tile.road = false;
      tile.fieldDefense = false;
      tile.site = null;
      tile.territoryCityId =
        tile.at.x === 1 ? first.id : tile.at.x === 5 ? second.id : null;
    }
  return base;
}

function transferGraph(state: MutableGameState, owner: PlayerId): void {
  const cities = state.cities.slice(0, 2);
  for (const city of cities) city.ownerId = owner;
  const player = required(
    state.players.find((candidate) => candidate.id === owner),
  );
  player.researchedTechs = TECHNOLOGY_IDS_V7;
  player.explored = state.board.tiles.map((tile) => tile.at);
  player.originalCapitalCityId = required(cities[0]).id;
}

function connectRoad(
  state: MutableGameState,
  left: CityStateV7,
  right: CityStateV7,
): Mutable<GameStateV7["board"]["tiles"][number]> {
  let x = left.at.x;
  let y = left.at.y;
  let middle: Mutable<GameStateV7["board"]["tiles"][number]> | undefined;
  while (x !== right.at.x || y !== right.at.y) {
    x += Math.sign(right.at.x - x);
    y += Math.sign(right.at.y - y);
    const tile = required(
      state.board.tiles.find(
        (candidate) => candidate.at.x === x && candidate.at.y === y,
      ),
    );
    if (x !== right.at.x || y !== right.at.y) {
      tile.biome = "PLAINS";
      tile.terrain = "GRASS";
      tile.site = null;
      tile.improvement = null;
      tile.territoryCityId = null;
      tile.road = true;
      middle ??= tile;
    }
  }
  return required(middle);
}

type MutableGameState = {
  -readonly [K in keyof GameStateV7]: K extends "board"
    ? {
        -readonly [B in keyof GameStateV7["board"]]: B extends "tiles"
          ? Mutable<GameStateV7["board"]["tiles"][number]>[]
          : GameStateV7["board"][B];
      }
    : K extends "players"
      ? Mutable<GameStateV7["players"][number]>[]
      : K extends "cities"
        ? Mutable<CityStateV7>[]
        : K extends "units"
          ? GameStateV7["units"][number][]
          : GameStateV7[K];
};
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("fixture missing");
  return value;
}
