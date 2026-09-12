import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  parseEventEnvelopeV7,
  parsePlayerEventEnvelopeV7,
  queryPlayerCommandsV7,
  spatialContributionAtV7,
  viewForV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 revision-4 Ore economy", () => {
  it("freezes Mine and Forge costs, outputs, and placement minimum", () => {
    expect(BASIC_ECONOMIC_ACTIONS_V7.BUILD_MINE).toMatchObject({
      technology: "ENGINEERING",
      terrain: "MOUNTAIN",
      resource: "ORE",
      cost: 5,
      population: 2,
    });
    expect(SPATIAL_ECONOMIC_ACTIONS_V7.BUILD_FORGE).toMatchObject({
      cost: 6,
      placementMinimum: 1,
    });
    const state = initialV7(0);
    const city = state.cities[0];
    if (city === undefined) throw new Error("city missing");
    const center = state.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    if (center === undefined) throw new Error("site missing");
    const adjacent = state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          Math.max(
            Math.abs(tile.at.x - center.at.x),
            Math.abs(tile.at.y - center.at.y),
          ) === 1,
      )
      .slice(0, 6);
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        adjacent.some(
          (mine) => mine.at.x === tile.at.x && mine.at.y === tile.at.y,
        )
          ? { ...tile, improvement: "MINE" as const, resource: null }
          : tile,
      ),
    };
    expect(
      spatialContributionAtV7(
        { board, cities: state.cities },
        center.at,
        "FORGE",
      ).population,
    ).toBe(Math.min(6, adjacent.length));
  });

  it("never offers Forge without an adjacent same-city Mine", () => {
    const base = allTechsV7(exploredAllV7(initialV7(0)));
    const humanSeat = base.turnOrder.indexOf(base.humanPlayerId);
    const state = checkedV7({
      ...base,
      activeSeatIndex: humanSeat,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId ? { ...player, coins: 100 } : player,
      ),
    });
    expect(
      queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)).filter(
        (command) => command.kind === "BUILD_FORGE",
      ),
    ).toEqual([]);
  });

  it("strictly parses Ore restoration in authoritative and public events", () => {
    const event = {
      kind: "ECONOMIC_BUILDING_REMOVED" as const,
      playerId: 1,
      cityId: 2,
      at: { x: 3, y: 4 },
      improvement: "MINE" as const,
      populationContributionRemoved: 2,
      marketIncomeRemoved: 0,
      resourceRestored: "ORE" as const,
    };
    expect(
      parseEventEnvelopeV7({
        format: "pulp-wars-events",
        version: 7,
        commandIndex: 1,
        events: [event],
      }),
    ).toMatchObject({ ok: true });
    expect(
      parsePlayerEventEnvelopeV7({
        format: "pulp-wars-player-events",
        version: 7,
        viewerId: 1,
        commandIndex: 1,
        events: [event],
      }),
    ).toMatchObject({ ok: true });
    for (const resourceRestored of ["STONE", "GAME"]) {
      expect(
        parseEventEnvelopeV7({
          format: "pulp-wars-events",
          version: 7,
          commandIndex: 1,
          events: [{ ...event, resourceRestored }],
        }),
      ).toMatchObject({ ok: false });
      expect(
        parsePlayerEventEnvelopeV7({
          format: "pulp-wars-player-events",
          version: 7,
          viewerId: 1,
          commandIndex: 1,
          events: [{ ...event, resourceRestored }],
        }),
      ).toMatchObject({ ok: false });
    }
  });
});
