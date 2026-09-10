import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  applyCommandV7,
  cityIncomeV7,
  parseGameStateV7,
  previewEconomicV7,
  queryPlayerCommandsV7,
  spatialContributionAtV7,
  unitId,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PopulationContributionV7,
  type UnitStateV7,
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
      BUILD_MINE: { cost: 6, population: 4, resource: null },
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7).toMatchObject({
      BUILD_WINDMILL: { cost: 5, placementMinimum: 1 },
      BUILD_SAWMILL: { cost: 5, placementMinimum: 1 },
      BUILD_FORGE: { cost: 6, placementMinimum: 0 },
      BUILD_WORKSHOP: { cost: 4, placementMinimum: 1 },
      BUILD_GRAND_WORKS: { cost: 7, placementMinimum: 2 },
      BUILD_MARKET: { cost: 7, placementMinimum: 2 },
    });
  });

  it("applies Mine to any empty owned Mountain", () => {
    const kind = "BUILD_MINE" as const;
    const cost = 6;
    const population = 4;
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
      resource: null,
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

  it("withholds connected-support coordinates hidden inside an owned footprint", () => {
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
    expect(queryPlayerCommandsV7(view)).toContainEqual(command);
    const preview = previewEconomicV7(state, state.humanPlayerId, command);
    expect(preview).toEqual({ ok: false, error: "NOT_OFFERED" });
    expect(JSON.stringify(preview)).not.toContain(JSON.stringify(hiddenFarm));
  });

  it("calculates capped Forge output from same-city adjacent Mines", () => {
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
    const fullForge = graphWith(state, [
      [center.at, "FORGE"],
      ...neighbors(center.at).map((at) => [at, "MINE"] as const),
    ]);
    expect(
      spatialContributionAtV7(fullForge, center.at, "FORGE").population,
    ).toBe(18);
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
    const emptyProcessors = graphWith(state, [
      [center.at, "GRAND_WORKS"],
      [first, "WINDMILL"],
      [second, "FORGE"],
    ]);
    expect(
      spatialContributionAtV7(emptyProcessors, center.at, "GRAND_WORKS")
        .population,
    ).toBe(0);
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
      resource: null,
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
    ["BUILD_MINE", "REDEVELOP", "MOUNTAIN", null, "MINE"],
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

  it("counts only distinct positive processors for Grand Works and hides support coordinates", () => {
    const staged = processorPackageV7(1_301);
    const positiveView = viewForV7(staged.state, staged.state.humanPlayerId);
    expect(queryPlayerCommandsV7(positiveView)).toContainEqual({
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    const forgeValue = positiveView.improvementValues.find((value) =>
      same(value.at, staged.forgeAt),
    );
    expect(forgeValue).toMatchObject({ level: 3, measure: "POPULATION" });

    const withoutMine = checkedV7({
      ...staged.state,
      board: {
        ...staged.state.board,
        tiles: staged.state.board.tiles.map((tile) =>
          same(tile.at, staged.mineAt)
            ? { ...tile, improvement: null, resource: null }
            : tile,
        ),
      },
      cities: staged.state.cities.map((city) =>
        city.id === staged.cityId
          ? {
              ...city,
              level: 3,
              economicPopulation: 3,
              population: -2,
              expanded: false,
              rewards: city.rewards.filter(
                (reward) => reward.reachedLevel <= 3,
              ),
            }
          : city,
      ),
      populationContributions: staged.state.populationContributions
        .filter((entry) => !same(entry.source.at, staged.mineAt))
        .map((entry) =>
          same(entry.source.at, staged.forgeAt)
            ? { ...entry, amount: 0 }
            : entry,
        ),
    });
    expect(
      queryPlayerCommandsV7(viewForV7(withoutMine, withoutMine.humanPlayerId)),
    ).not.toContainEqual({
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    expect(
      spatialContributionAtV7(withoutMine, staged.grandWorksAt, "GRAND_WORKS")
        .population,
    ).toBe(0);

    const hiddenMine = checkedV7({
      ...staged.state,
      players: staged.state.players.map((player) =>
        player.id === staged.state.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !same(at, staged.mineAt),
              ),
            }
          : player,
      ),
    });
    const hiddenView = viewForV7(hiddenMine, hiddenMine.humanPlayerId);
    expect(
      hiddenView.improvementValues.find((value) =>
        same(value.at, staged.forgeAt),
      ),
    ).toMatchObject({ level: 3, contributingTiles: [] });
    const preview = previewEconomicV7(hiddenMine, hiddenMine.humanPlayerId, {
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    expect(JSON.stringify(preview)).not.toContain(
      JSON.stringify(staged.mineAt),
    );
  });

  it("queues one every-level reward at a time and stops preflight at the modal", () => {
    const staged = rewardPackageV7(1_302, Number.MAX_SAFE_INTEGER);
    const built = applyCommandV7(staged.state, staged.state.humanPlayerId, {
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    if (!built.accepted) throw new Error(built.error.code);
    expect(built.state.pendingChoices).toEqual([
      {
        kind: "CITY_REWARD",
        cityId: staged.cityId,
        reachedLevel: 5,
        candidates: ["JUGGERNAUT", "TREASURY"],
      },
    ]);
    expect(built.events.map((event) => event.kind)).toEqual([
      "ECONOMIC_BUILDING_BUILT",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
      "ACHIEVEMENT_UNLOCKED",
    ]);
    expect(parseGameStateV7(built.state)).toEqual(built.state);

    const occupied = occupyCityExceptV7(built.state, staged.cityId, [
      staged.freePlacement,
    ]);
    const pending = checkedV7({
      ...occupied,
      players: occupied.players.map((player) =>
        player.id === occupied.humanPlayerId
          ? { ...player, coins: Number.MAX_SAFE_INTEGER }
          : player,
      ),
    });
    const juggernaut = applyCommandV7(pending, pending.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: staged.cityId,
      reachedLevel: 5,
      reward: "JUGGERNAUT",
    });
    expect(juggernaut).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
      events: [],
    });
    expect(juggernaut.state).toBe(pending);
  });

  it("settles successful Juggernaut rewards sequentially through one modal", () => {
    const staged = rewardPackageV7(1_305, Number.MAX_SAFE_INTEGER);
    const built = applyCommandV7(staged.state, staged.state.humanPlayerId, {
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    if (!built.accepted) throw new Error(built.error.code);
    const first = applyCommandV7(built.state, built.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: staged.cityId,
      reachedLevel: 5,
      reward: "JUGGERNAUT",
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(first.events.map((event) => event.kind)).toEqual([
      "CITY_REWARD_CHOSEN",
      "UNIT_REWARD_GRANTED",
      "CITY_REWARD_QUEUED",
    ]);
    expect(first.state.pendingChoices).toEqual([
      {
        kind: "CITY_REWARD",
        cityId: staged.cityId,
        reachedLevel: 6,
        candidates: ["JUGGERNAUT", "TREASURY"],
      },
    ]);
    const second = applyCommandV7(first.state, first.state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: staged.cityId,
      reachedLevel: 6,
      reward: "JUGGERNAUT",
    });
    if (!second.accepted) throw new Error(second.error.code);
    expect(second.state.pendingChoices).toEqual([]);
    const juggernauts = second.state.units.filter(
      (unit) => unit.homeCityId === staged.cityId && unit.role === "JUGGERNAUT",
    );
    expect(juggernauts).toHaveLength(2);
    expect(new Set(juggernauts.map((unit) => coordKey(unit.at))).size).toBe(2);
    expect(
      second.state.cities.find((city) => city.id === staged.cityId)?.rewards,
    ).toEqual([
      { reachedLevel: 2, reward: "STOCKPILE" },
      { reachedLevel: 3, reward: "WALLS" },
      { reachedLevel: 4, reward: "EXPAND" },
      { reachedLevel: 5, reward: "JUGGERNAUT" },
      { reachedLevel: 6, reward: "JUGGERNAUT" },
    ]);
    expect(parseGameStateV7(second.state)).toEqual(second.state);
  });

  it("automatically grants Treasury 12 at every blocked level with no ghost queue", () => {
    const staged = rewardPackageV7(1_303, 100);
    const occupied = occupyCityExceptV7(staged.state, staged.cityId, []);
    const built = applyCommandV7(occupied, occupied.humanPlayerId, {
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    if (!built.accepted) throw new Error(built.error.code);
    expect(built.state.pendingChoices).toEqual([]);
    expect(
      built.state.cities.find((city) => city.id === staged.cityId)?.rewards,
    ).toEqual([
      { reachedLevel: 2, reward: "STOCKPILE" },
      { reachedLevel: 3, reward: "WALLS" },
      { reachedLevel: 4, reward: "EXPAND" },
      { reachedLevel: 5, reward: "TREASURY" },
      { reachedLevel: 6, reward: "TREASURY" },
    ]);
    expect(
      built.events.filter(
        (event) => event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED",
      ),
    ).toEqual([
      {
        kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
        playerId: occupied.humanPlayerId,
        cityId: staged.cityId,
        reachedLevel: 5,
        reward: "TREASURY",
        coins: 12,
      },
      {
        kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
        playerId: occupied.humanPlayerId,
        cityId: staged.cityId,
        reachedLevel: 6,
        reward: "TREASURY",
        coins: 12,
      },
    ]);
    expect(
      built.events.findIndex((event) => event.kind.includes("REWARD")),
    ).toBeGreaterThan(
      built.events.map((event) => event.kind).lastIndexOf("CITY_LEVELED_UP"),
    );
    expect(
      built.state.players.find((player) => player.id === occupied.humanPlayerId)
        ?.coins,
    ).toBe(117);
    expect(parseGameStateV7(built.state)).toEqual(built.state);
  });

  it("repairs the exact level-5 live18 package from floor income without repeating rewards", () => {
    const staged = processorPackageV7(1_304, 100);
    const built = applyCommandV7(staged.state, staged.state.humanPlayerId, {
      kind: "BUILD_GRAND_WORKS",
      at: staged.grandWorksAt,
    });
    if (!built.accepted) throw new Error(built.error.code);
    let state = built.state;
    const chosen = applyCommandV7(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: staged.cityId,
      reachedLevel: 5,
      reward: "TREASURY",
    });
    if (!chosen.accepted) throw new Error(chosen.error.code);
    state = chosen.state;
    const rewardsBefore = required(
      state.cities.find((city) => city.id === staged.cityId),
      "reward city missing",
    ).rewards;
    state = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId ? { ...player, coins: 0 } : player,
      ),
    });
    const removalCommand = {
      kind: "REDEVELOP",
      at: staged.mineAt,
    } as const;
    const removalFromView = previewEconomicV7(
      viewForV7(state, state.humanPlayerId),
      removalCommand,
    );
    expect(
      previewEconomicV7(state, state.humanPlayerId, removalCommand),
    ).toEqual(removalFromView);
    expect(removalFromView).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: [{ cityId: staged.cityId, delta: -15 }],
        coinIncomeDeltaByCity: [{ cityId: staged.cityId, delta: -5 }],
        resourceRestored: null,
        levelsReached: [],
        outputTransitions: expect.arrayContaining([
          expect.objectContaining({
            at: staged.mineAt,
            improvement: "MINE",
            before: 4,
            after: 0,
            change: "REMOVED",
          }),
          expect.objectContaining({
            at: staged.forgeAt,
            improvement: "FORGE",
            before: 3,
            after: 0,
            change: "OUTAGE",
          }),
          expect.objectContaining({
            at: staged.grandWorksAt,
            improvement: "GRAND_WORKS",
            before: 8,
            after: 0,
            change: "OUTAGE",
          }),
        ]),
      },
    });
    const removed = applyCommandV7(state, state.humanPlayerId, {
      ...removalCommand,
    });
    if (!removed.accepted) throw new Error(removed.error.code);
    state = removed.state;
    const damaged = required(
      state.cities.find((city) => city.id === staged.cityId),
      "damaged city missing",
    );
    expect(damaged).toMatchObject({
      level: 5,
      economicPopulation: 3,
      population: -11,
    });
    expect(tileAt(state, staged.mineAt)?.resource).toBeNull();
    expect(cityIncomeV7(state, damaged)).toBe(1);
    expect(
      state.populationContributions.find((entry) =>
        same(entry.source.at, staged.forgeAt),
      )?.amount,
    ).toBe(0);
    expect(
      state.populationContributions.find((entry) =>
        same(entry.source.at, staged.grandWorksAt),
      )?.amount,
    ).toBe(0);
    for (let turn = 0; turn < 12; turn += 1) {
      const actor = required(
        state.turnOrder[state.activeSeatIndex],
        "active actor missing",
      );
      const ended = applyCommandV7(state, actor, { kind: "END_TURN" });
      if (!ended.accepted) throw new Error(ended.error.code);
      state = ended.state;
    }
    expect(
      state.players.find((player) => player.id === state.humanPlayerId)?.coins,
    ).toBe(6);
    const repairCommand = { kind: "BUILD_MINE", at: staged.mineAt } as const;
    const repairFromView = previewEconomicV7(
      viewForV7(state, state.humanPlayerId),
      repairCommand,
    );
    expect(
      previewEconomicV7(state, state.humanPlayerId, repairCommand),
    ).toEqual(repairFromView);
    expect(repairFromView).toMatchObject({
      ok: true,
      preview: {
        cost: 6,
        populationDeltaByCity: [{ cityId: staged.cityId, delta: 15 }],
        coinIncomeDeltaByCity: [{ cityId: staged.cityId, delta: 5 }],
        levelsReached: [],
        outputTransitions: expect.arrayContaining([
          expect.objectContaining({
            at: staged.mineAt,
            improvement: "MINE",
            before: 0,
            after: 4,
            change: "CREATED",
          }),
          expect.objectContaining({
            at: staged.forgeAt,
            improvement: "FORGE",
            before: 0,
            after: 3,
            change: "RESUMED",
          }),
          expect.objectContaining({
            at: staged.grandWorksAt,
            improvement: "GRAND_WORKS",
            before: 0,
            after: 8,
            change: "RESUMED",
          }),
        ]),
      },
    });
    const repaired = applyCommandV7(state, state.humanPlayerId, {
      ...repairCommand,
    });
    if (!repaired.accepted) throw new Error(repaired.error.code);
    const restored = required(
      repaired.state.cities.find((city) => city.id === staged.cityId),
      "restored city missing",
    );
    expect(restored).toMatchObject({
      level: 5,
      economicPopulation: 18,
      population: 4,
    });
    expect(cityIncomeV7(repaired.state, restored)).toBe(6);
    expect(restored.rewards).toEqual(rewardsBefore);
    expect(
      repaired.events.some(
        (event) =>
          event.kind === "CITY_LEVELED_UP" || event.kind.includes("REWARD"),
      ),
    ).toBe(false);
    expect(parseGameStateV7(repaired.state)).toEqual(repaired.state);
  });

  it("floors only nonbesieged pre-Blackout income and keeps suppression bounded", () => {
    const state = initialV7(1_307);
    const city = required(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
      "income city missing",
    );
    const enemy = required(
      state.units.find((unit) => unit.ownerId !== city.ownerId),
      "income enemy missing",
    );
    const damaged = { ...city, population: -100 };
    expect(cityIncomeV7(state, damaged)).toBe(1);
    expect(
      cityIncomeV7(state, {
        ...damaged,
        blackout: {
          phase: "ACTIVE",
          sourceOwnerId: enemy.ownerId,
          suppressedCoins: 1,
        },
      }),
    ).toBe(0);
    expect(
      cityIncomeV7(state, {
        ...city,
        level: 6,
        blackout: {
          phase: "ACTIVE",
          sourceOwnerId: enemy.ownerId,
          suppressedCoins: 3,
        },
      }),
    ).toBe(4);
    expect(
      cityIncomeV7(
        {
          ...state,
          units: state.units.map((unit) =>
            unit.id === enemy.id ? { ...unit, at: city.at } : unit,
          ),
        },
        { ...city, level: 6 },
      ),
    ).toBe(0);
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

function processorPackageV7(
  seed: number,
  coins = 100,
): {
  state: GameStateV7;
  cityId: GameStateV7["cities"][number]["id"];
  grandWorksAt: CoordV7;
  windmillAt: CoordV7;
  farmAt: CoordV7;
  forgeAt: CoordV7;
  mineAt: CoordV7;
  freePlacement: CoordV7;
} {
  const base = exploredAllV7(allTechsV7(initialV7(seed)));
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === base.humanPlayerId),
    "package city missing",
  );
  const center = required(
    base.board.tiles.find((tile) => {
      const positions = [
        tile.at,
        { x: tile.at.x, y: tile.at.y - 1 },
        { x: tile.at.x - 1, y: tile.at.y - 1 },
        { x: tile.at.x + 1, y: tile.at.y },
        { x: tile.at.x + 1, y: tile.at.y - 1 },
      ];
      return (
        tile.at.x > 0 &&
        tile.at.x < base.board.width - 1 &&
        tile.at.y > 0 &&
        positions.every((at) => {
          const candidate = tileAt(base, at);
          return candidate?.site === null;
        })
      );
    }),
    "package center missing",
  ).at;
  const windmillAt = { x: center.x, y: center.y - 1 };
  const farmAt = { x: center.x - 1, y: center.y - 1 };
  const forgeAt = { x: center.x + 1, y: center.y };
  const mineAt = { x: center.x + 1, y: center.y - 1 };
  const improvements = new Map<
    string,
    NonNullable<GameStateV7["board"]["tiles"][number]["improvement"]>
  >([
    [coordKey(center), "GRAND_WORKS"],
    [coordKey(windmillAt), "WINDMILL"],
    [coordKey(farmAt), "FARM"],
    [coordKey(forgeAt), "FORGE"],
    [coordKey(mineAt), "MINE"],
  ]);
  const contributionSpecs = [
    [windmillAt, "WINDMILL", 1],
    [farmAt, "FARM", 2],
    [forgeAt, "FORGE", 3],
    [mineAt, "MINE", 4],
  ] as const;
  const contributions: PopulationContributionV7[] = contributionSpecs.map(
    ([at, improvement, amount], index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE",
      amount,
      source: { kind: "IMPROVEMENT", improvement, at },
    }),
  );
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + contributions.length,
    treasureChests: [],
    players: base.players.map((player) =>
      player.id === base.humanPlayerId ? { ...player, coins } : player,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const improvement = improvements.get(coordKey(tile.at));
        return improvement === undefined
          ? tile
          : {
              ...tile,
              site: null,
              territoryCityId: city.id,
              terrain:
                improvement === "FARM"
                  ? "GRASS"
                  : improvement === "MINE"
                    ? "MOUNTAIN"
                    : tile.terrain,
              resource: null,
              improvement: improvement === "GRAND_WORKS" ? null : improvement,
            };
      }),
    },
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            level: 4,
            permanentPopulation: 0,
            economicPopulation: 10,
            population: 1,
            expanded: true,
            rewards: [
              { reachedLevel: 2, reward: "STOCKPILE" as const },
              { reachedLevel: 3, reward: "WALLS" as const },
              { reachedLevel: 4, reward: "EXPAND" as const },
            ],
          }
        : candidate,
    ),
    populationContributions: contributions,
  });
  const freePlacement = required(
    state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        !same(tile.at, center) &&
        !state.units.some((unit) => same(unit.at, tile.at)),
    ),
    "free package placement missing",
  ).at;
  return {
    state,
    cityId: city.id,
    grandWorksAt: center,
    windmillAt,
    farmAt,
    forgeAt,
    mineAt,
    freePlacement,
  };
}

function rewardPackageV7(
  seed: number,
  coins: number,
): ReturnType<typeof processorPackageV7> {
  const staged = processorPackageV7(seed, coins);
  const cityTiles = staged.state.board.tiles.filter(
    (tile) => tile.territoryCityId === staged.cityId,
  );
  const first = required(cityTiles[0], "first reward population tile missing");
  const second = required(
    cityTiles[1],
    "second reward population tile missing",
  );
  const contributions: PopulationContributionV7[] = [first, second].map(
    (tile, index) => ({
      id: staged.state.nextEntityId + index,
      cityId: staged.cityId,
      category: "PERMANENT",
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION",
        action: "HARVEST_FRUIT",
        at: tile.at,
      },
    }),
  );
  return {
    ...staged,
    state: checkedV7({
      ...staged.state,
      nextEntityId: staged.state.nextEntityId + contributions.length,
      cities: staged.state.cities.map((city) =>
        city.id === staged.cityId
          ? { ...city, permanentPopulation: 2, population: 3 }
          : city,
      ),
      populationContributions: [
        ...staged.state.populationContributions,
        ...contributions,
      ],
    }),
  };
}

function occupyCityExceptV7(
  state: GameStateV7,
  cityId: GameStateV7["cities"][number]["id"],
  except: readonly CoordV7[],
): GameStateV7 {
  const city = required(
    state.cities.find((candidate) => candidate.id === cityId),
    "occupancy city missing",
  );
  const occupied = new Set(state.units.map((unit) => coordKey(unit.at)));
  const excluded = new Set(except.map(coordKey));
  let nextEntityId = state.nextEntityId;
  const added: UnitStateV7[] = [];
  for (const tile of state.board.tiles)
    if (
      tile.territoryCityId === city.id &&
      !occupied.has(coordKey(tile.at)) &&
      !excluded.has(coordKey(tile.at))
    ) {
      added.push({
        id: unitId(nextEntityId),
        ownerId: city.ownerId,
        homeCityId: city.id,
        role: "FIGHTER",
        at: tile.at,
        hp: 10,
        maxHp: 10,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: readyActivation(),
        blackoutEligibleRound: null,
      });
      nextEntityId += 1;
    }
  return checkedV7({
    ...state,
    nextEntityId,
    units: [...state.units, ...added].sort((left, right) => left.id - right.id),
  });
}

function readyActivation(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    healed: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

function coordKey(at: CoordV7): string {
  return `${at.y},${at.x}`;
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
