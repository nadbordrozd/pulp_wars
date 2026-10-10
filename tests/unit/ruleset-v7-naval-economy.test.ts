import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityIncomeV7,
  combinedNetworkCityIdsV7,
  marketIncomeForCityV7,
  parseGameStateV7,
  previewEconomicV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  seaLinksV7,
  seaTradeCityIdsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import { PRE_NAVAL_BRANCH_TECHS_V7, checkedV7 } from "../fixtures/v7-builders";
import { coastalV7, withPortV7 } from "../fixtures/v7-naval-builders";

describe("ruleset-7 naval economy", () => {
  it("keeps naval training keyed to the selected dock while the land center is occupied", () => {
    const fixture = withPortV7(9_099);
    const actor = fixture.state.humanPlayerId;
    const city = required(
      fixture.state.cities.find((candidate) => candidate.ownerId === actor),
    );
    const centerUnit = required(
      fixture.state.units.find(
        (unit) =>
          unit.ownerId === actor &&
          unit.at.x === city.at.x &&
          unit.at.y === city.at.y,
      ),
    );
    const state = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              coins: 100,
              researchedTechs: PRE_NAVAL_BRANCH_TECHS_V7,
            }
          : player,
      ),
    });
    const naval = {
      kind: "TRAIN_NAVAL" as const,
      cityId: city.id,
      at: fixture.portAt,
      role: "PATROL_BOAT" as const,
    };
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
      naval,
    );
    expect(applyCommandV7(state, actor, naval)).toMatchObject({
      accepted: true,
      events: [expect.objectContaining({ kind: "NAVAL_UNIT_TRAINED" })],
    });

    const occupiedDock = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === centerUnit.id
          ? { ...unit, at: fixture.portAt, form: "EMBARKED" as const }
          : unit,
      ),
    });
    expect(
      queryPlayerCommandsV7(viewForV7(occupiedDock, actor)),
    ).not.toContainEqual(naval);
    expect(applyCommandV7(occupiedDock, actor, naval)).toMatchObject({
      accepted: false,
      error: { code: "CITY_SPAWN_OCCUPIED" },
      state: occupiedDock,
      events: [],
    });
  });

  it("upgrades an occupied Port and applies only an active Shipyard discount", () => {
    const fixture = withPortV7(9100);
    const actor = fixture.state.humanPlayerId;
    const passenger = fixture.state.units.find(
      (unit) => unit.ownerId === actor,
    );
    if (passenger === undefined) throw new Error("passenger missing");
    let state = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              coins: 100,
              researchedTechs: PRE_NAVAL_BRANCH_TECHS_V7,
            }
          : player,
      ),
      units: fixture.state.units
        .filter((unit) => unit.ownerId !== actor || unit.id === passenger.id)
        .map((unit) =>
          unit.id === passenger.id
            ? { ...unit, at: fixture.portAt, form: "EMBARKED" as const }
            : unit,
        ),
    });
    const build = {
      kind: "BUILD_SHIPYARD" as const,
      at: fixture.portAt,
    };
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
      build,
    );
    const built = applyCommandV7(state, actor, build);
    if (!built.accepted) throw new Error(built.error.code);
    expect(
      built.state.units.find((unit) => unit.id === passenger.id),
    ).toMatchObject({ at: fixture.portAt, form: "EMBARKED" });
    expect(built.events).toContainEqual(
      expect.objectContaining({
        kind: "SHIPYARD_BUILT",
        populationAdded: 1,
        livePopulationTotal: 2,
      }),
    );
    state = checkedV7({
      ...built.state,
      units: built.state.units.filter((unit) => unit.id !== passenger.id),
    });
    while (state.pendingChoices[0] !== undefined) {
      const choice = state.pendingChoices[0];
      const settled = applyCommandV7(state, actor, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: choice.cityId,
        reachedLevel: choice.reachedLevel,
        reward: required(choice.candidates[0]),
      });
      if (!settled.accepted) throw new Error(settled.error.code);
      state = settled.state;
    }
    const train = queryPlayerCommandsV7(viewForV7(state, actor)).find(
      (command) =>
        command.kind === "TRAIN_NAVAL" &&
        command.role === "PATROL_BOAT" &&
        command.at.x === fixture.portAt.x &&
        command.at.y === fixture.portAt.y,
    );
    if (train?.kind !== "TRAIN_NAVAL")
      throw new Error("discounted training offer missing");
    const trained = applyCommandV7(state, actor, train);
    if (!trained.accepted) throw new Error(trained.error.code);
    expect(trained.events).toContainEqual(
      expect.objectContaining({
        kind: "NAVAL_UNIT_TRAINED",
        cost: 3,
        dock: "SHIPYARD",
        discountSource: "SHIPYARD",
      }),
    );

    const hostile = fixture.state.units.find((unit) => unit.ownerId !== actor);
    if (hostile === undefined) throw new Error("hostile ship source missing");
    const blockadedCandidate = {
      ...state,
      units: [
        {
          ...hostile,
          role: "PATROL_BOAT" as const,
          form: "NAVAL" as const,
          at: fixture.portAt,
          hp: 10,
          maxHp: 10,
        },
      ],
    };
    const blockadedEconomy = recomputeLiveEconomyV7(
      state,
      blockadedCandidate,
      state.populationContributions,
    );
    const blockaded = checkedV7({
      ...blockadedCandidate,
      cities: blockadedEconomy.cities,
      populationContributions: blockadedEconomy.populationContributions,
    });
    expect(
      queryPlayerCommandsV7(viewForV7(blockaded, actor)).some(
        (command) => command.kind === "TRAIN_NAVAL",
      ),
    ).toBe(false);
  });

  it("gathers Pearls for exact net +2 and fails overflow atomically", () => {
    const fixture = coastalV7(9101);
    const tile = fixture.state.board.tiles.find(
      (candidate) =>
        candidate.at.x === fixture.portAt.x &&
        candidate.at.y === fixture.portAt.y,
    );
    if (tile === undefined) throw new Error("water tile missing");
    const state = checkedV7({
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((candidate) =>
          candidate === tile
            ? { ...candidate, resource: "PEARLS" as const }
            : candidate,
        ),
      },
    });
    const before = state.players.find(
      (player) => player.id === state.humanPlayerId,
    )?.coins;
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "GATHER_PEARLS",
      at: fixture.portAt,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted || before === undefined) return;
    expect(
      result.state.players.find((player) => player.id === state.humanPlayerId)
        ?.coins,
    ).toBe(before + 2);
    expect(result.events[0]).toMatchObject({
      cost: 2,
      coinsReceived: 4,
      coinDelta: 2,
    });
    expect(parseGameStateV7(result.state)).toEqual(result.state);

    const overflow = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, coins: Number.MAX_SAFE_INTEGER }
          : player,
      ),
    });
    const failed = applyCommandV7(overflow, overflow.humanPlayerId, {
      kind: "GATHER_PEARLS",
      at: fixture.portAt,
    });
    expect(failed).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
    });
    expect(failed.state).toBe(overflow);
  });

  it("keeps Fish under a Port and blocks harvesting under hostile occupation", () => {
    const fixture = withPortV7(9102);
    const state = checkedV7({
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y
            ? { ...tile, resource: "FISH" as const }
            : tile,
        ),
      },
    });
    const hostile = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("hostile unit missing");
    const blockaded = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === hostile.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
            }
          : unit,
      ),
    } as typeof state;
    expect(
      applyCommandV7(blockaded, blockaded.humanPlayerId, {
        kind: "HARVEST_FISH",
        at: fixture.portAt,
      }),
    ).toMatchObject({ accepted: false });
  });

  it("preserves Port resources through harvest and Port removal in either action order", () => {
    const fixture = withPortV7(9105);
    const pearlsUnderPort = checkedV7({
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y
            ? { ...tile, resource: "PEARLS" as const }
            : tile,
        ),
      },
    });
    const gathered = applyCommandV7(
      pearlsUnderPort,
      pearlsUnderPort.humanPlayerId,
      { kind: "GATHER_PEARLS", at: fixture.portAt },
    );
    expect(gathered.accepted).toBe(true);
    if (!gathered.accepted) return;
    expect(
      gathered.state.board.tiles.find(
        (tile) =>
          tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y,
      ),
    ).toMatchObject({ improvement: "PORT", resource: null });

    const removed = applyCommandV7(
      pearlsUnderPort,
      pearlsUnderPort.humanPlayerId,
      { kind: "REDEVELOP", at: fixture.portAt },
    );
    expect(removed.accepted).toBe(true);
    if (!removed.accepted) return;
    expect(
      removed.state.board.tiles.find(
        (tile) =>
          tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y,
      ),
    ).toMatchObject({ improvement: null, resource: "PEARLS" });
    expect(removed.events).toContainEqual(
      expect.objectContaining({
        kind: "ECONOMIC_BUILDING_REMOVED",
        improvement: "PORT",
        resourceRestored: null,
      }),
    );
    expect(
      previewEconomicV7(
        viewForV7(pearlsUnderPort, pearlsUnderPort.humanPlayerId),
        { kind: "REDEVELOP", at: fixture.portAt },
      ),
    ).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: [expect.objectContaining({ delta: -1 })],
        resourceRestored: null,
        resultingContribution: 0,
      },
    });
  });

  it("never offers or applies land infrastructure on water", () => {
    const fixture = coastalV7(9106);
    const command = { kind: "BUILD_ROAD" as const, at: fixture.portAt };
    expect(
      queryPlayerCommandsV7(
        viewForV7(fixture.state, fixture.state.humanPlayerId),
      ),
    ).not.toContainEqual(command);
    const result = applyCommandV7(
      fixture.state,
      fixture.state.humanPlayerId,
      command,
    );
    expect(result).toMatchObject({ accepted: false, state: fixture.state });
    expect(result.state).toBe(fixture.state);
  });

  it("offers and accepts Fish, Pearls, and Port actions on their exact water targets", () => {
    for (const [resource, action] of [
      ["FISH", "HARVEST_FISH"],
      ["PEARLS", "GATHER_PEARLS"],
    ] as const) {
      const fixture = coastalV7(resource === "FISH" ? 9107 : 9108);
      const state = checkedV7({
        ...fixture.state,
        board: {
          ...fixture.state.board,
          tiles: fixture.state.board.tiles.map((tile) =>
            tile.at.x === fixture.portAt.x && tile.at.y === fixture.portAt.y
              ? { ...tile, resource }
              : tile,
          ),
        },
      });
      const commands = queryPlayerCommandsV7(
        viewForV7(state, state.humanPlayerId),
      );
      expect(commands).toContainEqual({ kind: action, at: fixture.portAt });
      expect(commands).toContainEqual({
        kind: "BUILD_PORT",
        at: fixture.portAt,
      });
      expect(
        applyCommandV7(state, state.humanPlayerId, {
          kind: action,
          at: fixture.portAt,
        }),
      ).toMatchObject({ accepted: true });
      expect(
        applyCommandV7(state, state.humanPlayerId, {
          kind: "BUILD_PORT",
          at: fixture.portAt,
        }),
      ).toMatchObject({ accepted: true });
    }
  });

  // `pulp-wars-poc-7r76` (`pulp_wars-5ti.12`): Ports join the Road network.
  // Before, this case kept the two apart and paid a sea-trade Coin.
  it("joins capital Roads and Ports in one network, pays one trade Coin, and ignores mid-lane occupation", () => {
    const fixture = coastalV7(9103);
    const capital = fixture.state.cities.find(
      (city) => city.ownerId === fixture.state.humanPlayerId,
    );
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (capital === undefined || hostile === undefined)
      throw new Error("entities missing");
    const cityBId = (capital.id + 100) as typeof capital.id;
    const cityCId = (capital.id + 101) as typeof capital.id;
    const cityDId = (capital.id + 102) as typeof capital.id;
    const cityB = {
      ...capital,
      id: cityBId,
      at: { x: 4, y: 1 },
      isCapital: false,
    };
    const cityC = {
      ...capital,
      id: cityCId,
      at: { x: 8, y: 1 },
      isCapital: false,
    };
    const cityD = {
      ...capital,
      id: cityDId,
      at: { x: 10, y: 1 },
      isCapital: false,
    };
    const route = new Set(["1,1", "1,2", "1,3", "1,4", "1,8", "1,9", "1,10"]);
    const sea = new Set(["2,4", "2,5", "2,6", "2,7", "2,8"]);
    const base = {
      ...fixture.state,
      cities: [
        ...fixture.state.cities.map((city) =>
          city.id === capital.id ? { ...city, at: { x: 1, y: 1 } } : city,
        ),
        cityB,
        cityC,
        cityD,
      ],
      units: fixture.state.units.filter(
        (unit) => unit.ownerId === fixture.state.humanPlayerId,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) => {
          const coord = `${tile.at.y},${tile.at.x}`;
          if (sea.has(coord))
            return {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement:
                tile.at.x === 4 || tile.at.x === 8 ? ("PORT" as const) : null,
              road: false,
              site: null,
              territoryCityId:
                tile.at.x === 4 ? cityBId : tile.at.x === 8 ? cityCId : null,
            };
          if (tile.at.x === 10 && tile.at.y === 0)
            return {
              ...tile,
              improvement: "MARKET" as const,
              resource: null,
              territoryCityId: cityDId,
            };
          if (route.has(coord))
            return {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: true,
              site: null,
              territoryCityId:
                tile.at.x < 3
                  ? capital.id
                  : tile.at.x < 8
                    ? cityBId
                    : tile.at.x < 10
                      ? cityCId
                      : cityDId,
            };
          return tile;
        }),
      },
    } as GameStateV7;
    // The capital's Road reaches the second city, whose dock stands beside
    // its center; a sea link joins that dock to the third city's, and a
    // Road runs on to the fourth: one network of four cities.
    expect(seaTradeCityIdsV7(base, base.humanPlayerId)).toEqual(new Set());
    expect(seaLinksV7(base, base.humanPlayerId)).toEqual([
      {
        from: { x: 4, y: 2 },
        to: { x: 8, y: 2 },
        fromCityId: cityBId,
        toCityId: cityCId,
      },
    ]);
    expect(combinedNetworkCityIdsV7(base, base.humanPlayerId)).toEqual(
      new Set([capital.id, cityBId, cityCId, cityDId]),
    );
    expect(
      cityIncomeV7(
        base,
        base.cities.find((city) => city.id === cityBId) ?? cityB,
      ),
      // Level 1 + one trade Coin (3 through 7r75, with the sea-trade Coin).
    ).toBe(2);
    expect(
      cityIncomeV7(
        base,
        base.cities.find((city) => city.id === cityCId) ?? cityC,
      ),
    ).toBe(2);
    // Revision 14 (E2): a lone Market pays 1 even with Commerce.
    expect(marketIncomeForCityV7(base, cityD)).toBe(1);
    expect(
      viewForV7(base, base.humanPlayerId).improvementValues.find(
        (value) => value.improvement === "MARKET",
      ),
    ).toMatchObject({ level: 1, measure: "COIN_INCOME" });

    const transitOccupied = {
      ...base,
      units: [
        ...base.units,
        {
          ...hostile,
          at: { x: 6, y: 2 },
          role: "PATROL_BOAT" as const,
          form: "NAVAL" as const,
        },
      ],
    };
    expect(seaLinksV7(transitOccupied, base.humanPlayerId)).toHaveLength(1);
    // The frozen sea (`pulp_wars-5ti.11`, current rules section 21.16): a
    // sea link counts an ice tile as water, so the route runs under the ice.
    const frozenRoute = {
      ...base,
      ice: [5, 6, 7].map((x) => ({
        at: { x, y: 2 },
        ownerId: hostile.ownerId,
        turnsLeft: 3,
      })),
    };
    expect(seaLinksV7(frozenRoute, base.humanPlayerId)).toHaveLength(1);
    expect(
      [cityBId, cityCId].map((id) =>
        cityIncomeV7(
          frozenRoute,
          frozenRoute.cities.find((city) => city.id === id) ?? cityB,
        ),
      ),
      // Tuning 3: both earn land trade (the second had 2). Tuning 4: 1 Coin.
      // 7r76: and no sea-trade Coin (3 each before).
    ).toEqual([2, 2]);
    const blockaded = {
      ...base,
      units: [
        ...base.units,
        {
          ...hostile,
          at: { x: 8, y: 2 },
          role: "PATROL_BOAT" as const,
          form: "NAVAL" as const,
        },
      ],
    };
    // A blockaded dock ends the sea link and is no Road node: the cities
    // beyond it leave the capital's network.
    expect(seaLinksV7(blockaded, base.humanPlayerId)).toEqual([]);
    expect(combinedNetworkCityIdsV7(blockaded, base.humanPlayerId)).toEqual(
      new Set([capital.id, cityBId]),
    );
  });

  it("emits canonical blockade and network transitions when a hostile ship enters a Port", () => {
    const fixture = withPortV7(9104);
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("hostile missing");
    const from = fixture.state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null &&
        !tile.road &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) === 1 &&
        !fixture.state.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    );
    if (from === undefined) throw new Error("departure water missing");
    const state = checkedV7({
      ...fixture.state,
      activeSeatIndex: fixture.state.turnOrder.indexOf(hostile.ownerId),
      players: fixture.state.players.map((player) =>
        player.id === hostile.ownerId
          ? {
              ...player,
              researchedTechs: PRE_NAVAL_BRANCH_TECHS_V7,
              explored: fixture.state.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === from.at.x && tile.at.y === from.at.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                site: null,
                road: false,
              }
            : tile,
        ),
      },
      units: fixture.state.units.map((unit) =>
        unit.id === hostile.id
          ? {
              ...unit,
              at: from.at,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
              hp: 10,
              maxHp: 10,
            }
          : unit,
      ),
    });
    const moved = applyCommandV7(state, hostile.ownerId, {
      kind: "MOVE",
      unitId: hostile.id,
      path: [fixture.portAt],
    });
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    expect(moved.events).toContainEqual({
      kind: "PORT_BLOCKADE_CHANGED",
      playerId: state.humanPlayerId,
      cityId: state.cities.find((city) => city.ownerId === state.humanPlayerId)
        ?.id,
      at: fixture.portAt,
      activeBefore: true,
      activeAfter: false,
    });
    expect(
      projectEventsV7(state, moved.state, state.humanPlayerId, moved.events)
        .events,
    ).toContainEqual(
      expect.objectContaining({
        kind: "PORT_BLOCKADE_CHANGED",
        playerId: state.humanPlayerId,
      }),
    );
    expect(
      projectEventsV7(
        state,
        moved.state,
        hostile.ownerId,
        moved.events,
      ).events.some((event) => event.kind === "PORT_BLOCKADE_CHANGED"),
    ).toBe(false);
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("required value missing");
  return value;
}
