import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryPlayerCommandsV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
} from "../../src/engine/index";
import { withPortV7 } from "../fixtures/v7-naval-builders";

describe("ruleset-7 naval public commands", () => {
  it("offers exact Port recruitment and an autoembarking move without a native naval TRAIN", () => {
    const fixture = withPortV7(9401);
    const city = fixture.state.cities.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    const unit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (city === undefined || unit === undefined)
      throw new Error("entities missing");
    const commands = queryPlayerCommandsV7(
      viewForV7(fixture.state, fixture.state.humanPlayerId),
    );
    expect(commands).toContainEqual({
      kind: "TRAIN_NAVAL",
      cityId: city.id,
      at: fixture.portAt,
      role: "PATROL_BOAT",
    });
    expect(commands).toContainEqual(
      expect.objectContaining({
        kind: "MOVE",
        unitId: unit.id,
        path: expect.arrayContaining([fixture.portAt]),
      }),
    );
    expect(commands).not.toContainEqual({
      kind: "TRAIN",
      cityId: city.id,
      role: "PATROL_BOAT",
    });
  });

  it("does not expose a hidden hostile ship used to blockade an explored Port", () => {
    const fixture = withPortV7(9402);
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("hostile missing");
    const hidden = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => at.x !== fixture.portAt.x || at.y !== fixture.portAt.y,
              ),
            }
          : player,
      ),
      units: fixture.state.units.map((unit) =>
        unit.id === hostile.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
            }
          : unit,
      ),
    } as typeof fixture.state;
    const view = viewForV7(hidden, hidden.humanPlayerId);
    expect(view.units.some((unit) => unit.id === hostile.id)).toBe(false);
    expect(JSON.stringify(view)).not.toContain("PATROL_BOAT");
  });

  it("omits form-disabled and stale naval commands that the reducer rejects", () => {
    const fixture = withPortV7(9404);
    const own = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (own === undefined || hostile === undefined)
      throw new Error("units missing");
    const staleLand = {
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === own.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                handled: true,
                attacked: true,
                attacksUsed: 1 as const,
              },
            }
          : unit,
      ),
    } as typeof fixture.state;
    const staleCommands = queryPlayerCommandsV7(
      viewForV7(staleLand, staleLand.humanPlayerId),
    );
    expect(
      staleCommands.some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === own.id &&
          command.path.at(-1)?.x === fixture.portAt.x &&
          command.path.at(-1)?.y === fixture.portAt.y,
      ),
    ).toBe(false);
    expect(
      applyCommandV7(staleLand, staleLand.humanPlayerId, {
        kind: "MOVE",
        unitId: own.id,
        path: [fixture.portAt],
      }).accepted,
    ).toBe(false);

    const afloat = {
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === own.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "FIGHTER" as const,
              form: "EMBARKED" as const,
              kills: 3,
              veteran: false,
              activation: { ...unit.activation, moved: false, handled: false },
            }
          : unit,
      ),
    } as typeof fixture.state;
    const commands = queryPlayerCommandsV7(
      viewForV7(afloat, afloat.humanPlayerId),
    );
    expect(
      commands.some(
        (command) =>
          "unitId" in command &&
          command.unitId === own.id &&
          ["PROMOTE", "PILLAGE", "DISBAND", "HEAL_ADJACENT"].includes(
            command.kind,
          ),
      ),
    ).toBe(false);

    const blocked = {
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === own.id
          ? {
              ...unit,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
              hp: 5,
              at: fixture.portAt,
            }
          : unit.id === hostile.id
            ? {
                ...unit,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
                at: fixture.portAt,
              }
            : unit,
      ),
    } as typeof fixture.state;
    const blockedCommands = queryPlayerCommandsV7(
      viewForV7(blocked, blocked.humanPlayerId),
    );
    expect(
      blockedCommands.some(
        (command) => command.kind === "RECOVER" && command.unitId === own.id,
      ),
    ).toBe(false);
  });

  it("publishes owner-safe Port, route, trade, and recovery facts in canonical order", () => {
    const fixture = withPortV7(9405);
    const city = fixture.state.cities.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    const own = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    if (city === undefined || own === undefined)
      throw new Error("entities missing");
    const secondAt = fixture.state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) === 1 &&
        !fixture.state.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    )?.at;
    if (secondAt === undefined) throw new Error("second Port site missing");
    const secondId = (city.id + 100) as typeof city.id;
    const state = {
      ...fixture.state,
      cities: [
        ...fixture.state.cities,
        { ...city, id: secondId, at: secondAt, isCapital: false },
      ],
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === secondAt.x && tile.at.y === secondAt.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: "PORT" as const,
                road: false,
                site: null,
                territoryCityId: secondId,
              }
            : tile,
        ),
      },
      units: fixture.state.units.map((unit) =>
        unit.id === own.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
              hp: 6,
            }
          : unit,
      ),
    } as typeof fixture.state;
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.naval.ownedPorts).toEqual(
      [
        { at: fixture.portAt, cityId: city.id, status: "ACTIVE" },
        { at: secondAt, cityId: secondId, status: "ACTIVE" },
      ].sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x),
    );
    expect(view.naval.seaRoutes).toEqual([
      {
        fromCityId: city.id,
        toCityId: secondId,
        path: [fixture.portAt, secondAt],
      },
    ]);
    expect(view.naval.recoverableNavalUnitIds).toEqual([own.id]);
    expect(view.naval.networkCityIds).toContain(city.id);
    expect(view.naval.tradeCityIds).toEqual([secondId]);
    const noShorecraft = {
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "SHORECRAFT" && tech !== "NAVIGATION",
              ),
            }
          : player,
      ),
    } as typeof state;
    expect(
      viewForV7(noShorecraft, noShorecraft.humanPlayerId).naval.seaRoutes,
    ).toEqual([]);
  });

  it("projects shoreline ZOC for a Fighter but not a Catapult", () => {
    const fixture = withPortV7(9406);
    const own = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (own === undefined || hostile === undefined)
      throw new Error("units missing");
    const start = { x: 4, y: 5 };
    const target = { x: 5, y: 5 };
    const beyond = { x: 6, y: 5 };
    const shore = { x: 5, y: 4 };
    const makeState = (role: "FIGHTER" | "CATAPULT") =>
      ({
        ...fixture.state,
        players: fixture.state.players.map((player) =>
          player.id === hostile.ownerId
            ? {
                ...player,
                explored: fixture.state.board.tiles.map((tile) => tile.at),
              }
            : player,
        ),
        board: {
          ...fixture.state.board,
          tiles: fixture.state.board.tiles.map((tile) => {
            if (
              [start, target, beyond].some(
                (at) => at.x === tile.at.x && at.y === tile.at.y,
              )
            )
              return {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
                site: null,
              };
            if (tile.at.x === shore.x && tile.at.y === shore.y)
              return {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                site: null,
              };
            return tile;
          }),
        },
        units: fixture.state.units.map((unit) =>
          unit.id === own.id
            ? {
                ...unit,
                at: start,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
              }
            : unit.id === hostile.id
              ? { ...unit, at: shore, role, form: "LAND" as const }
              : unit,
        ),
      }) as typeof fixture.state;
    for (const [role, expected] of [
      ["FIGHTER", "ZOC_STOPS_MOVE"],
      ["CATAPULT", null],
    ] as const) {
      const state = makeState(role);
      const unit = state.units.find((candidate) => candidate.id === own.id);
      if (unit === undefined) throw new Error("ship missing");
      const authority = validateMovementPathV7(state, unit, [target, beyond]);
      const view = viewForV7(state, state.humanPlayerId);
      const publicUnit = view.units.find(
        (candidate) => candidate.id === own.id,
      );
      if (publicUnit === undefined) throw new Error("public ship missing");
      const projected = validatePlayerMovementPathV7(view, publicUnit, [
        target,
        beyond,
      ]);
      if (expected === null) {
        expect(authority.legal).toBe(true);
        expect(projected.legal).toBe(true);
      } else {
        expect(authority).toMatchObject({ legal: false, reason: expected });
        expect(projected).toMatchObject({ legal: false, reason: expected });
      }
    }
  });
});
