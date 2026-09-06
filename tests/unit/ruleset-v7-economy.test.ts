import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  applyCommandV7,
  parseGameStateV7,
  previewEconomicV7,
  spatialContributionAtV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
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
      BUILD_MINE: { cost: 6, population: 4 },
      BUILD_QUARRY: { cost: 5, population: 3 },
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7).toMatchObject({
      BUILD_WINDMILL: { cost: 5, placementMinimum: 1 },
      BUILD_SAWMILL: { cost: 5, placementMinimum: 1 },
      BUILD_FORGE: { cost: 6, placementMinimum: 0 },
      BUILD_STONEWORKS: { cost: 6, placementMinimum: 0 },
      BUILD_WORKSHOP: { cost: 4, placementMinimum: 2 },
      BUILD_GRAND_WORKS: { cost: 7, placementMinimum: 3 },
      BUILD_MARKET: { cost: 7, placementMinimum: 2 },
      BUILD_BARRACKS: { cost: 6, placementMinimum: 0 },
    });
  });

  it.each([
    ["BUILD_MINE", "ORE", 6, 4],
    ["BUILD_QUARRY", "STONE", 5, 3],
  ] as const)(
    "applies exact mountain basic action %s",
    (kind, resource, cost, population) => {
      let state = exploredAllV7(
        allTechsV7(initialV7(kind === "BUILD_MINE" ? 101 : 102)),
      );
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
        resource,
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
        improvement: kind === "BUILD_MINE" ? "MINE" : "QUARRY",
        cost,
        populationContribution: population,
        capacityDelta: 0,
      });
      expect(result.state.random).toEqual(random);
      expect(parseGameStateV7(result.state)).toEqual(result.state);
    },
  );

  it("calculates capped Forge and paired Stoneworks output from the final graph", () => {
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
      population: 6,
      placementCount: 2,
    });
    const stone = graphWith(state, [
      [center.at, "STONEWORKS"],
      [west, "QUARRY"],
      [east, "QUARRY"],
    ]);
    expect(
      spatialContributionAtV7(stone, center.at, "STONEWORKS"),
    ).toMatchObject({
      population: 6,
      placementCount: 2,
      oppositePairAxes: ["EAST_WEST"],
    });
    const fullForge = graphWith(state, [
      [center.at, "FORGE"],
      ...neighbors(center.at).map((at) => [at, "MINE"] as const),
    ]);
    expect(
      spatialContributionAtV7(fullForge, center.at, "FORGE").population,
    ).toBe(18);
    const fullStone = graphWith(state, [
      [center.at, "STONEWORKS"],
      ...neighbors(center.at).map((at) => [at, "QUARRY"] as const),
    ]);
    expect(
      spatialContributionAtV7(fullStone, center.at, "STONEWORKS").population,
    ).toBe(16);
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
    const third = required(around[2], "third neighbor missing");
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
          [center.at, "WORKSHOP"],
          [first, "FARM"],
          [second, "MINE"],
        ]),
        center.at,
        "WORKSHOP",
      ).population,
    ).toBe(2);
    expect(
      spatialContributionAtV7(
        graphWith(state, [
          [center.at, "GRAND_WORKS"],
          [first, "WINDMILL"],
          [second, "FORGE"],
          [third, "SAWMILL"],
        ]),
        center.at,
        "GRAND_WORKS",
      ).population,
    ).toBe(6);
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
    ).toBe(2);
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
