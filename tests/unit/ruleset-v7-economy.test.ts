import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  applyCommandV7,
  parseGameStateV7,
  previewEconomicV7,
  queryPlayerCommandsV7,
  spatialContributionAtV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  replaceTileV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 economy", () => {
  it("registers the retained economy and revised Industry values exactly", () => {
    expect(BASIC_ECONOMIC_ACTIONS_V7).toMatchObject({
      HARVEST_FRUIT: { cost: 2, population: 1 },
      HUNT_GAME: { cost: 2, population: 1 },
      BUILD_FARM: { cost: 5, population: 2 },
      BUILD_LUMBER_CAMP: { cost: 3, population: 1 },
      BUILD_MINE: { cost: 5, population: 2, resource: "ORE" },
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7).toMatchObject({
      BUILD_WINDMILL: { cost: 5, placementMinimum: 1 },
      BUILD_SAWMILL: { cost: 5, placementMinimum: 1 },
      BUILD_FORGE: { cost: 6, placementMinimum: 1 },
      BUILD_WORKSHOP: { cost: 4, placementMinimum: 1 },
      BUILD_MARKET: { cost: 6, placementMinimum: 1 },
    });
  });

  it("applies Mine to owned Ore", () => {
    const kind = "BUILD_MINE" as const;
    const cost = 5;
    const population = 2;
    let state = exploredAllV7(allTechsV7(initialV7(101)));
    const city = state.cities.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    const tile = state.board.tiles.find(
      (item) => item.territoryCityId === city.id && item.site === null,
    );
    if (tile === undefined) throw new Error("tile missing");
    state = replaceTileV7(state, tile.at, {
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: null,
      road: false,
    });
    const random = state.random;
    const preview = previewEconomicV7(state, state.humanPlayerId, {
      kind,
      at: tile.at,
    });
    expect(preview).toMatchObject({
      ok: true,
      preview: { cost, resultingContribution: population, complete: true },
    });
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind,
      at: tile.at,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events[0]).toMatchObject({
      kind: "ECONOMIC_BUILDING_BUILT",
      improvement: "MINE",
      cost,
      populationContribution: population,
    });
    expect(result.state.random).toEqual(random);
    expect(parseGameStateV7(result.state)).toEqual(result.state);
  });

  it("keeps exact non-graph previews at a sight edge with irrelevant fog", () => {
    const base = exploredAllV7(allTechsV7(initialV7(4_243)));
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    const edge = required(
      base.board.tiles.find(
        (candidate) =>
          candidate.territoryCityId === city.id &&
          candidate.site === null &&
          neighbors(candidate.at).some((at) => {
            const neighbor = tileAt(base, at);
            return (
              neighbor !== undefined && neighbor.territoryCityId !== city.id
            );
          }),
      ),
      "owned sight-edge tile missing",
    );
    const hiddenAt = required(
      neighbors(edge.at).find((at) => {
        const neighbor = tileAt(base, at);
        return neighbor !== undefined && neighbor.territoryCityId !== city.id;
      }),
      "irrelevant fog coordinate missing",
    );
    const state = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) => !same(chest, edge.at),
      ),
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter((at) => !same(at, hiddenAt)),
            }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, edge.at)
            ? {
                ...tile,
                terrain: "FOREST" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
    });
    const command = { kind: "CLEAR_FOREST", at: edge.at } as const;
    expect(
      queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)),
    ).toContainEqual(command);
    expect(
      previewEconomicV7(state, state.humanPlayerId, command),
    ).toMatchObject({
      ok: true,
      preview: {
        at: edge.at,
        cost: 0,
        ownerCityId: city.id,
        populationDeltaByCity: [],
        coinIncomeDeltaByCity: [],
        resultingContribution: 0,
        contributingTiles: [],
        complete: true,
      },
    });
  });

  it("withholds a city-limited offer and support coordinates hidden inside its footprint", () => {
    const base = exploredAllV7(allTechsV7(initialV7(4_244)));
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
      "human city missing",
    );
    const line = required(
      base.board.tiles
        .filter(
          (candidate) =>
            candidate.territoryCityId === city.id && candidate.site === null,
        )
        .flatMap((target) =>
          (
            [
              [1, 0],
              [0, 1],
            ] as const
          ).flatMap(([dx, dy]) => {
            const first = tileAt(base, {
              x: target.at.x + dx,
              y: target.at.y + dy,
            });
            const second = tileAt(base, {
              x: target.at.x + dx * 2,
              y: target.at.y + dy * 2,
            });
            return first?.territoryCityId === city.id &&
              first.site === null &&
              second?.territoryCityId === city.id &&
              second.site === null
              ? [[target.at, first.at, second.at] as const]
              : [];
          }),
        )[0],
      "three-tile owned line missing",
    );
    const [target, visibleFarm, hiddenFarm] = line;
    const state = checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 2,
      treasureChests: [],
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter((at) => !same(at, hiddenFarm)),
            }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, target)
            ? { ...tile, resource: null, improvement: null }
            : same(tile.at, visibleFarm) || same(tile.at, hiddenFarm)
              ? {
                  ...tile,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: "FARM" as const,
                }
              : tile,
        ),
      },
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 2,
              permanentPopulation: 0,
              economicPopulation: 4,
              population: 2,
              expanded: false,
              rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
            }
          : candidate,
      ),
      populationContributions: [visibleFarm, hiddenFarm].map((at, index) => ({
        id: base.nextEntityId + index,
        cityId: city.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at,
        },
      })),
    });
    const command = { kind: "BUILD_WINDMILL", at: target } as const;
    const view = viewForV7(state, state.humanPlayerId);
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(command);
    const preview = previewEconomicV7(state, state.humanPlayerId, command);
    expect(preview).toEqual({ ok: false, error: "NOT_OFFERED" });
    expect(JSON.stringify(preview)).not.toContain(JSON.stringify(hiddenFarm));
  });

  it("calculates capped Forge output from same-owner adjacent Mines", () => {
    const state = allTechsV7(initialV7(103));
    const city = state.cities.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    const center = state.board.tiles.find(
      (item) => item.territoryCityId === city.id && item.site === null,
    );
    if (center === undefined) throw new Error("center missing");
    const west = { x: center.at.x - 1, y: center.at.y };
    const east = { x: center.at.x + 1, y: center.at.y };
    const graph = graphWith(state, [
      [center.at, "FORGE"],
      [west, "MINE"],
      [east, "MINE"],
    ]);
    expect(spatialContributionAtV7(graph, center.at, "FORGE")).toMatchObject({
      population: 2,
      placementCount: 2,
    });
    const fullForge = graphWith(state, [
      [center.at, "FORGE"],
      ...neighbors(center.at).map((at) => [at, "MINE"] as const),
    ]);
    expect(
      spatialContributionAtV7(fullForge, center.at, "FORGE").population,
    ).toBe(6);
  });

  it("retains farm/camp processors, mixed buildings, Market, roads, and forest actions", () => {
    const state = allTechsV7(initialV7(104));
    const city = state.cities.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    const center = state.board.tiles.find(
      (item) => item.territoryCityId === city.id && item.site === null,
    );
    if (center === undefined) throw new Error("tile missing");
    const around = neighbors(center.at);
    const first = required(around[0], "first neighbor missing");
    const second = required(around[1], "second neighbor missing");
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "WINDMILL"],
          [first, "FARM"],
          [second, "FARM"],
        ]),
        center.at,
        "WINDMILL",
      ).population,
    ).toBe(2);
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "SAWMILL"],
          [first, "LUMBER_CAMP"],
          [second, "LUMBER_CAMP"],
        ]),
        center.at,
        "SAWMILL",
      ).population,
    ).toBe(2);
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "SAWMILL"],
          [first, "LUMBER_CAMP"],
        ]),
        center.at,
        "SAWMILL",
      ).population,
    ).toBe(1);
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "WORKSHOP"],
          [first, "FARM"],
          [second, "MINE"],
        ]),
        center.at,
        "WORKSHOP",
      ).population,
    ).toBe(3);
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "MARKET"],
          [first, "FARM"],
          [second, "MINE"],
        ]),
        center.at,
        "MARKET",
      ).marketIncome,
    ).toBe(3);
  });

  it("gives Markets a base coin plus distinct adjacent families and keeps Workshop contributors in-city", () => {
    const base = allTechsV7(initialV7(10_409));
    const owner = base.humanPlayerId;
    const city = base.cities.find((candidate) => candidate.ownerId === owner);
    const otherCity = base.cities.find(
      (candidate) => candidate.id !== city?.id,
    );
    if (city === undefined || otherCity === undefined)
      throw new Error("two owned cities missing");
    const center = required(
      base.board.tiles.find(
        (tile) => tile.territoryCityId === city.id && tile.site === null,
      ),
      "center missing",
    );
    const around = neighbors(center.at).slice(0, 4);
    if (around.length < 4) throw new Error("neighbors missing");
    const first = required(around[0], "first neighbor missing");
    const second = required(around[1], "second neighbor missing");
    const improvements = ["FARM", "LUMBER_CAMP", "MINE"] as const;
    for (let count = 0; count <= improvements.length; count += 1) {
      const graph = graphWith(base, [
        [center.at, "MARKET"],
        ...improvements
          .slice(0, count)
          .map(
            (improvement, index) =>
              [
                required(around[index], "family neighbor missing"),
                improvement,
              ] as const,
          ),
      ]);
      expect(
        spatialContributionAtV7(graph, center.at, "MARKET").marketIncome,
      ).toBe(1 + Math.min(count, 3));
    }
    const sharedFamily = graphWith(base, [
      [center.at, "MARKET"],
      [first, "MARKET"],
      [second, "FARM"],
    ]);
    expect(
      spatialContributionAtV7(sharedFamily, center.at, "MARKET").marketIncome,
    ).toBe(2);
    expect(
      spatialContributionAtV7(sharedFamily, first, "MARKET").marketIncome,
    ).toBe(2);
    const crossCity = graphWith(base, [
      [center.at, "WORKSHOP"],
      [first, "FARM"],
      [second, "MINE"],
    ]);
    const reassigned = {
      ...crossCity,
      board: {
        ...crossCity.board,
        tiles: crossCity.board.tiles.map((tile) =>
          same(tile.at, second)
            ? { ...tile, territoryCityId: otherCity.id }
            : tile,
        ),
      },
    };
    expect(
      spatialContributionAtV7(crossCity, center.at, "WORKSHOP").population,
    ).toBe(3);
    expect(
      spatialContributionAtV7(reassigned, center.at, "WORKSHOP"),
    ).toMatchObject({
      population: 2,
      distinctTypes: ["FARM"],
    });
    const captured = {
      ...reassigned,
      cities: reassigned.cities.map((candidate) =>
        candidate.id === otherCity.id
          ? {
              ...candidate,
              ownerId: required(
                base.players.find((player) => player.id !== owner),
                "enemy missing",
              ).id,
            }
          : candidate,
      ),
    };
    expect(
      spatialContributionAtV7(captured, center.at, "WORKSHOP").population,
    ).toBe(2);
    expect(spatialContributionAtV7(captured, center.at, "PORT")).toMatchObject({
      marketIncome: 0,
      population: 0,
    });
    expect(
      spatialContributionAtV7(captured, center.at, "SHIPYARD"),
    ).toMatchObject({
      marketIncome: 0,
      population: 0,
    });
  });

  it("preserves Roads through free Clear Forest and paid Replant, and builds Roads for 2", () => {
    let state = exploredAllV7(allTechsV7(initialV7(106)));
    const player = required(state.players[0], "player missing");
    const city = required(
      state.cities.find((item) => item.ownerId === player.id),
      "city missing",
    );
    const forestTile = state.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    if (forestTile === undefined) throw new Error("forest tile missing");
    state = replaceTileV7(state, forestTile.at, {
      terrain: "FOREST",
      resource: null,
      improvement: null,
      road: true,
    });
    const beforeCoins = required(state.players[0], "player missing").coins;
    const cleared = applyCommandV7(state, player.id, {
      kind: "CLEAR_FOREST",
      at: forestTile.at,
    });
    expect(cleared.accepted).toBe(true);
    if (!cleared.accepted) return;
    expect(tileAt(cleared.state, forestTile.at)).toMatchObject({
      terrain: "GRASS",
      road: true,
    });
    expect(cleared.state.players[0]?.coins).toBe(beforeCoins + 1);
    const replanted = applyCommandV7(cleared.state, player.id, {
      kind: "REPLANT_FOREST",
      at: forestTile.at,
    });
    expect(replanted.accepted).toBe(true);
    if (!replanted.accepted) return;
    expect(tileAt(replanted.state, forestTile.at)).toMatchObject({
      terrain: "FOREST",
      road: true,
    });
    expect(replanted.state.players[0]?.coins).toBe(beforeCoins - 3);

    const roadTile = replanted.state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        !tile.road &&
        (tile.at.x !== forestTile.at.x || tile.at.y !== forestTile.at.y),
    );
    if (roadTile === undefined) throw new Error("road tile missing");
    const road = applyCommandV7(replanted.state, player.id, {
      kind: "BUILD_ROAD",
      at: roadTile.at,
    });
    expect(road.accepted).toBe(true);
    if (!road.accepted) return;
    expect(tileAt(road.state, roadTile.at)?.road).toBe(true);
    expect(road.state.players[0]?.coins).toBe(beforeCoins - 5);
  });

  it("keeps city level while live loss can drive current population negative", () => {
    let state = exploredAllV7(allTechsV7(initialV7(105)));
    const city = state.cities.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    const tile = state.board.tiles.find(
      (item) => item.territoryCityId === city.id && item.site === null,
    );
    if (tile === undefined) throw new Error("tile missing");
    state = replaceTileV7(state, tile.at, {
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: null,
    });
    const built = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_MINE",
      at: tile.at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    const reward = built.state.pendingChoices[0];
    if (reward === undefined) throw new Error("reward missing");
    const chosen = applyCommandV7(built.state, built.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: reward.cityId,
      reachedLevel: reward.reachedLevel,
      reward: "STOCKPILE",
    });
    if (!chosen.accepted) throw new Error(chosen.error.code);
    const removed = applyCommandV7(chosen.state, chosen.state.humanPlayerId, {
      kind: "REDEVELOP",
      at: tile.at,
    });
    expect(removed.accepted).toBe(true);
    if (!removed.accepted) return;
    const after = removed.state.cities.find((item) => item.id === city.id);
    expect(after).toMatchObject({
      level: 2,
      economicPopulation: 0,
      population: -2,
    });
    expect(removed.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "CITY_ECONOMY_CHANGED",
          populationAfter: -2,
        }),
      ]),
    );
  });

  it.each([
    ["BUILD_FARM", "REDEVELOP", "GRASS", "FERTILE_GROUND", "FARM"],
    ["BUILD_MINE", "REDEVELOP", "MOUNTAIN", "ORE", "MINE"],
    ["BUILD_LUMBER_CAMP", "REDEVELOP", "FOREST", null, "LUMBER_CAMP"],
  ] as const)(
    "restores only covered production markers after %s and full-cost rebuild",
    (buildKind, removeKind, terrain, resource, improvement) => {
      let state = exploredAllV7(allTechsV7(initialV7(1_200)));
      const city = required(
        state.cities.find((item) => item.ownerId === state.humanPlayerId),
        "city missing",
      );
      const tile = required(
        state.board.tiles.find(
          (item) =>
            item.territoryCityId === city.id &&
            item.site === null &&
            !state.treasureChests.some((chest) => same(chest, item.at)),
        ),
        "build tile missing",
      );
      state = replaceTileV7(state, tile.at, {
        terrain,
        resource,
        improvement: null,
      });
      const built = applyCommandV7(state, state.humanPlayerId, {
        kind: buildKind,
        at: tile.at,
      });
      if (!built.accepted) throw new Error(built.error.code);
      state = built.state;
      while (state.pendingChoices[0] !== undefined) {
        const choice = state.pendingChoices[0];
        const chosen = applyCommandV7(state, state.humanPlayerId, {
          kind: "CHOOSE_CITY_REWARD",
          cityId: choice.cityId,
          reachedLevel: choice.reachedLevel,
          reward: choice.candidates.includes("STOCKPILE")
            ? "STOCKPILE"
            : required(choice.candidates[0], "reward candidate missing"),
        });
        if (!chosen.accepted) throw new Error(chosen.error.code);
        state = chosen.state;
      }
      const removed = applyCommandV7(state, state.humanPlayerId, {
        kind: removeKind,
        at: tile.at,
      });
      if (!removed.accepted) throw new Error(removed.error.code);
      expect(tileAt(removed.state, tile.at)).toMatchObject({
        terrain,
        resource,
        improvement: null,
      });
      expect(removed.events[0]).toMatchObject({
        kind: "ECONOMIC_BUILDING_REMOVED",
        improvement,
        resourceRestored: resource,
      });
      const coinsBefore = required(
        removed.state.players.find(
          (player) => player.id === removed.state.humanPlayerId,
        ),
        "player before rebuild missing",
      ).coins;
      const rebuilt = applyCommandV7(
        removed.state,
        removed.state.humanPlayerId,
        { kind: buildKind, at: tile.at },
      );
      if (!rebuilt.accepted) throw new Error(rebuilt.error.code);
      expect(
        required(
          rebuilt.state.players.find(
            (player) => player.id === rebuilt.state.humanPlayerId,
          ),
          "player after rebuild missing",
        ).coins,
      ).toBe(coinsBefore - BASIC_ECONOMIC_ACTIONS_V7[buildKind].cost);
    },
  );
});

function graphWith(
  state: GameStateV7,
  entries: readonly (readonly [
    CoordV7,
    NonNullable<GameStateV7["board"]["tiles"][number]["improvement"]>,
  ])[],
) {
  const city = state.cities.find(
    (item) => item.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("city missing");
  const wanted = new Map(
    entries.map(([at, improvement]) => [`${at.y},${at.x}`, improvement]),
  );
  return {
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        wanted.has(`${tile.at.y},${tile.at.x}`)
          ? {
              ...tile,
              site: null,
              resource: null,
              territoryCityId: city.id,
              improvement: required(
                wanted.get(`${tile.at.y},${tile.at.x}`),
                "wanted improvement missing",
              ),
            }
          : tile,
      ),
    },
    cities: state.cities,
  };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function neighbors(at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0) result.push({ x: at.x + dx, y: at.y + dy });
  return result;
}

function tileAt(state: GameStateV7, at: CoordV7) {
  return state.board.tiles[at.y * state.board.width + at.x];
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
