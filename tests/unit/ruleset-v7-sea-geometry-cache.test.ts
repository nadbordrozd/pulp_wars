import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  combinedNetworkCityIdsV7,
  resetSeaRouteGeometryCacheV7,
  seaLinksV7,
  seaRouteGeometryCacheDiagnosticsV7,
  type CityStateV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { initialV7 } from "../fixtures/v7-builders";

/**
 * `pulp-wars-poc-7r76` (`pulp_wars-5ti.12`): the geometry now serves the
 * sea links of the connection network (sea trade is gone). The links of a
 * seat, as `"x,y>x,y"` strings.
 */
function links(state: GameStateV7, owner: PlayerId): readonly string[] {
  return seaLinksV7(state, owner).map(
    (link) => `${link.from.x},${link.from.y}>${link.to.x},${link.to.y}`,
  );
}

describe("ruleset-7 bounded structural sea geometry", () => {
  it("reuses cold structurally equal and interleaved geometry with exact results", () => {
    const state = seaGraph(91);
    const owner = state.humanPlayerId;
    const expected = [...links(structuredClone(state), owner)];
    resetSeaRouteGeometryCacheV7();

    expect([...links(structuredClone(state), owner)]).toEqual(expected);
    expect(seaRouteGeometryCacheDiagnosticsV7()).toMatchObject({
      entries: 1,
      hits: 0,
      misses: 1,
      builds: 1,
    });
    expect([...links(structuredClone(state), owner)]).toEqual(expected);
    // A different sea (a tile of the lane is land) is a second entry.
    // Exploration is no part of the geometry since 7r76.
    const interrupted = structuredClone(state);
    for (const tile of interrupted.board.tiles)
      if (tile.at.x === 3 && tile.at.y === 1) {
        tile.biome = "PLAINS";
        tile.terrain = "GRASS";
      }
    links(interrupted, owner);
    expect([...links(structuredClone(state), owner)]).toEqual(expected);
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
    const baseline = links(state, owner);
    expect(baseline).toHaveLength(1);

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
    expect(links(state, owner)).toEqual([]);

    state.units.pop();
    remoteCity.ownerId = enemy.id;
    expect(links(state, owner)).toEqual([]);
    remoteCity.ownerId = owner;
    expect(links(state, owner)).toEqual(baseline);

    remotePort.territoryCityId = required(ports[0]).territoryCityId;
    expect(links(state, owner)).toEqual([]);
    remotePort.territoryCityId = remoteCityId;
    expect(links(state, owner)).toEqual(baseline);

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

  it("changes geometry for Shorecraft, Navigation over Deep Water, Port removal, and water; not for exploration", () => {
    const state = seaGraph(93);
    const owner = state.humanPlayerId;
    expect(links(state, owner)).toHaveLength(1);

    // 7r76: fog is no condition, and the link needs Shorecraft only.
    const player = required(state.players.find((item) => item.id === owner));
    player.explored = player.explored.filter(
      (at) => !(at.x === 3 && at.y === 1),
    );
    expect(links(state, owner)).toHaveLength(1);
    player.explored = state.board.tiles.map((tile) => tile.at);

    player.researchedTechs = player.researchedTechs.filter(
      (tech) => tech !== "NAVIGATION",
    );
    expect(links(state, owner)).toHaveLength(1);
    player.researchedTechs = player.researchedTechs.filter(
      (tech) => tech !== "SHORECRAFT",
    );
    expect(links(state, owner)).toEqual([]);
    player.researchedTechs = TECHNOLOGY_IDS_V7;

    const middle = required(
      state.board.tiles.find((tile) => tile.at.x === 3 && tile.at.y === 1),
    );
    middle.biome = "PLAINS";
    middle.terrain = "GRASS";
    expect(links(state, owner)).toEqual([]);
    middle.biome = null;
    middle.terrain = "DEEP_WATER";
    expect(links(state, owner)).toHaveLength(1);
    // Deep Water is crossed only with Navigation.
    player.researchedTechs = player.researchedTechs.filter(
      (tech) => tech !== "NAVIGATION",
    );
    expect(links(state, owner)).toEqual([]);
    player.researchedTechs = TECHNOLOGY_IDS_V7;

    const remotePort = required(
      state.board.tiles.find((tile) => tile.at.x === 5 && tile.at.y === 1),
    );
    remotePort.improvement = null;
    expect(links(state, owner)).toEqual([]);
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
    expect(links(rival, owner)).toEqual([]);
    rival.setup = { ...rival.setup, aiMode: "COOPERATIVE" };
    expect(links(rival, owner)).toHaveLength(1);
  });

  it("bounds entries and skips water expansion when Shorecraft or two Ports are absent", () => {
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
      links(state, owner);
    }
    expect(seaRouteGeometryCacheDiagnosticsV7()).toMatchObject({
      capacity: 16,
      entries: 16,
      builds: 20,
    });

    resetSeaRouteGeometryCacheV7();
    const noPorts = structuredClone(base);
    for (const tile of noPorts.board.tiles) tile.improvement = null;
    links(noPorts, owner);
    const noShorecraft = structuredClone(base);
    noShorecraft.players = noShorecraft.players.map((player) =>
      player.id === owner
        ? {
            ...player,
            researchedTechs: player.researchedTechs.filter(
              (tech) => tech !== "SHORECRAFT",
            ),
          }
        : player,
    );
    links(noShorecraft, owner);
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
