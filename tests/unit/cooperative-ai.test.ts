import { describe, expect, it } from "vitest";
import { chooseNormalCommand } from "../../src/ai/index";
import {
  applyCommand,
  arePlayersAllied,
  arePlayersHostile,
  captureEligibility,
  isCityBesieged,
  queryPlayerCommands,
  revealRadiusForPlayer,
  validateMovementPath,
  viewFor,
  type Coord,
  type GameState,
  type PlayerState,
  type UnitState,
} from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

function cooperativeState(): GameState {
  return gameStateBuilder(
    setupBuilder({
      aiCount: 2,
      width: 14,
      height: 14,
      aiMode: "COOPERATIVE",
    }),
  );
}

function seats(state: GameState): {
  readonly human: PlayerState;
  readonly firstAi: PlayerState;
  readonly secondAi: PlayerState;
  readonly firstUnit: UnitState;
  readonly secondUnit: UnitState;
} {
  const human = state.players.find(
    (player) => player.id === state.humanPlayerId,
  );
  const ais = state.players.filter(
    (player) => player.id !== state.humanPlayerId,
  );
  const firstAi = ais[0];
  const secondAi = ais[1];
  const firstUnit = state.units.find((unit) => unit.ownerId === firstAi?.id);
  const secondUnit = state.units.find((unit) => unit.ownerId === secondAi?.id);
  if (
    human === undefined ||
    firstAi === undefined ||
    secondAi === undefined ||
    firstUnit === undefined ||
    secondUnit === undefined
  )
    throw new Error("Missing cooperative fixture seats");
  return { human, firstAi, secondAi, firstUnit, secondUnit };
}

function withActive(state: GameState, player: PlayerState): GameState {
  const activeSeatIndex = state.turnOrder.indexOf(player.id);
  if (activeSeatIndex < 0) throw new Error("Missing active seat");
  return { ...state, activeSeatIndex };
}

function exploredPlayer(
  state: GameState,
  playerId: number,
  coords: readonly Coord[],
): readonly PlayerState[] {
  return state.players.map((player) =>
    player.id === playerId ? { ...player, explored: coords } : player,
  );
}

describe("cooperative AI diplomacy", () => {
  it("derives the fixed human-versus-AI-coalition relationship graph", () => {
    const state = cooperativeState();
    const { human, firstAi, secondAi } = seats(state);
    expect(
      arePlayersAllied(
        state.setup.aiMode,
        state.humanPlayerId,
        firstAi.id,
        secondAi.id,
      ),
    ).toBe(true);
    expect(
      arePlayersHostile(
        state.setup.aiMode,
        state.humanPlayerId,
        human.id,
        firstAi.id,
      ),
    ).toBe(true);
    expect(
      arePlayersHostile("RIVAL", state.humanPlayerId, firstAi.id, secondAi.id),
    ).toBe(true);
  });

  it("rejects a visible allied attack atomically before range or damage", () => {
    const original = cooperativeState();
    const { firstAi, firstUnit, secondUnit } = seats(original);
    const attackerAt = { x: 1, y: 1 };
    const defenderAt = { x: 2, y: 1 };
    const state = withActive(
      {
        ...original,
        players: exploredPlayer(original, firstAi.id, [attackerAt, defenderAt]),
        units: original.units.map((unit) =>
          unit.id === firstUnit.id
            ? { ...unit, at: attackerAt, ready: true }
            : unit.id === secondUnit.id
              ? { ...unit, at: defenderAt }
              : unit,
        ),
      },
      firstAi,
    );
    const command = {
      kind: "ATTACK" as const,
      unitId: firstUnit.id,
      target: { kind: "UNIT" as const, unitId: secondUnit.id },
    };
    const result = applyCommand(state, command);
    expect(result).toEqual({
      ok: false,
      state,
      error: { code: "TARGET_ALLIED", params: {} },
    });
    expect(queryPlayerCommands(viewFor(state, firstAi.id))).not.toContainEqual({
      kind: "ATTACK",
      command,
    });
  });

  it("rejects allied capture, never marks it eligible, and never creates siege", () => {
    const original = cooperativeState();
    const { firstAi, secondAi, firstUnit, secondUnit } = seats(original);
    const alliedCity = original.cities.find(
      (city) => city.ownerId === secondAi.id,
    );
    if (alliedCity === undefined) throw new Error("Missing allied city");
    const state = withActive(
      {
        ...original,
        players: exploredPlayer(original, firstAi.id, [alliedCity.at]),
        units: original.units.map((unit) =>
          unit.id === firstUnit.id
            ? {
                ...unit,
                at: alliedCity.at,
                ready: true,
                captureEligible: true,
              }
            : unit.id === secondUnit.id
              ? { ...unit, at: { x: 0, y: 0 } }
              : unit,
        ),
      },
      firstAi,
    );
    expect(isCityBesieged(state, alliedCity)).toBe(false);
    expect(captureEligibility(state, firstUnit.id)).toMatchObject({
      eligible: false,
      reason: "NOT_OCCUPYING_TARGET",
    });
    const result = applyCommand(state, {
      kind: "CAPTURE",
      unitId: firstUnit.id,
    });
    expect(result).toEqual({
      ok: false,
      state,
      error: { code: "TARGET_ALLIED", params: {} },
    });
  });

  it("forbids the first allied-territory path step and allied units exert no ZOC", () => {
    const original = cooperativeState();
    const { firstAi, secondAi, firstUnit, secondUnit } = seats(original);
    const alliedCity = original.cities.find(
      (city) => city.ownerId === secondAi.id,
    );
    const target = original.board.tiles.find(
      (tile) => tile.territoryCityId === alliedCity?.id,
    );
    if (target === undefined) throw new Error("Missing allied territory");
    const start = { x: Math.max(0, target.at.x - 1), y: target.at.y };
    const blocked = withActive(
      {
        ...original,
        players: exploredPlayer(original, firstAi.id, [start, target.at]),
        board: {
          ...original.board,
          tiles: original.board.tiles.map((tile) =>
            sameCoord(tile.at, start) || sameCoord(tile.at, target.at)
              ? { ...tile, terrain: "GRASS" as const }
              : tile,
          ),
        },
        units: original.units.map((unit) =>
          unit.id === firstUnit.id
            ? { ...unit, at: start, ready: true }
            : unit.id === secondUnit.id
              ? { ...unit, at: { x: 0, y: 0 } }
              : unit,
        ),
      },
      firstAi,
    );
    const rejected = applyCommand(blocked, {
      kind: "MOVE",
      unitId: firstUnit.id,
      path: [target.at],
    });
    expect(rejected).toEqual({
      ok: false,
      state: blocked,
      error: {
        code: "ALLY_TERRITORY_FORBIDDEN",
        params: { at: target.at },
      },
    });

    const path = [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    const zocState: GameState = {
      ...blocked,
      players: exploredPlayer(blocked, firstAi.id, [
        { x: 1, y: 1 },
        ...path,
        { x: 2, y: 2 },
      ]),
      board: {
        ...blocked.board,
        tiles: blocked.board.tiles.map((tile) =>
          [{ x: 1, y: 1 }, ...path, { x: 2, y: 2 }].some((at) =>
            sameCoord(at, tile.at),
          )
            ? {
                ...tile,
                terrain: "GRASS" as const,
                territoryCenter: null,
                territoryCityId: null,
              }
            : tile,
        ),
      },
      units: blocked.units.map((unit) =>
        unit.id === firstUnit.id
          ? { ...unit, type: "RIDER", at: { x: 1, y: 1 } }
          : unit.id === secondUnit.id
            ? { ...unit, at: { x: 2, y: 2 } }
            : { ...unit, at: { x: 13, y: 13 } },
      ),
    };
    const zocMover = zocState.units.find((unit) => unit.id === firstUnit.id);
    if (zocMover === undefined) throw new Error("ZOC mover disappeared");
    expect(validateMovementPath(zocState, zocMover, path, 2)).toMatchObject({
      legal: true,
      destination: { x: 3, y: 1 },
    });
  });

  it("projects only a content-free hidden boundary, clips new reveal, and never re-fogs", () => {
    const original = cooperativeState();
    const { firstAi, secondAi } = seats(original);
    const alliedCity = original.cities.find(
      (city) => city.ownerId === secondAi.id,
    );
    const target = original.board.tiles.find(
      (tile) =>
        tile.territoryCityId === alliedCity?.id &&
        !sameCoord(tile.at, alliedCity?.at ?? tile.at),
    );
    if (target === undefined) throw new Error("Missing allied territory");
    const hidden: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === firstAi.id ? { ...player, explored: [] } : player,
      ),
    };
    const boundary = viewFor(hidden, firstAi.id).board.tiles.find((tile) =>
      sameCoord(tile.at, target.at),
    );
    expect(boundary).toEqual({
      at: target.at,
      explored: false,
      diplomaticBlock: "ALLIED_TERRITORY",
    });
    expect(Object.keys(boundary ?? {}).sort()).toEqual([
      "at",
      "diplomaticBlock",
      "explored",
    ]);
    const changedHidden: GameState = {
      ...hidden,
      board: {
        ...hidden.board,
        tiles: hidden.board.tiles.map((tile) =>
          sameCoord(tile.at, target.at)
            ? {
                ...tile,
                terrain: tile.terrain === "GRASS" ? "MOUNTAIN" : "GRASS",
                resource: tile.resource === null ? "ORE" : null,
                improvement: tile.improvement === null ? "MINE" : null,
                site: "VILLAGE",
              }
            : tile,
        ),
      },
    };
    expect(viewFor(changedHidden, firstAi.id)).toEqual(
      viewFor(hidden, firstAi.id),
    );
    expect(queryPlayerCommands(viewFor(changedHidden, firstAi.id))).toEqual(
      queryPlayerCommands(viewFor(hidden, firstAi.id)),
    );
    expect(chooseNormalCommand(viewFor(changedHidden, firstAi.id))).toEqual(
      chooseNormalCommand(viewFor(hidden, firstAi.id)),
    );

    const reveal = revealRadiusForPlayer(hidden, firstAi.id, [], target.at, 1);
    expect(reveal.explored).not.toContainEqual(target.at);
    const known = revealRadiusForPlayer(
      hidden,
      firstAi.id,
      [target.at],
      target.at,
      1,
    );
    expect(known.explored).toContainEqual(target.at);
    expect(
      viewFor(
        {
          ...hidden,
          players: original.players.map((player) =>
            player.id === firstAi.id
              ? { ...player, explored: [target.at] }
              : player,
          ),
        },
        firstAi.id,
      ).board.tiles.find((tile) => sameCoord(tile.at, target.at)),
    ).toMatchObject({ explored: true, terrain: target.terrain });
  });

  it("keeps the human hostile to every AI", () => {
    const original = cooperativeState();
    const { human, firstAi, firstUnit } = seats(original);
    const humanUnit = original.units.find((unit) => unit.ownerId === human.id);
    if (humanUnit === undefined) throw new Error("Missing human unit");
    const humanAt = { x: 1, y: 1 };
    const aiAt = { x: 2, y: 1 };
    const state = withActive(
      {
        ...original,
        players: exploredPlayer(original, human.id, [humanAt, aiAt]),
        units: original.units.map((unit) =>
          unit.id === humanUnit.id
            ? { ...unit, at: humanAt, ready: true }
            : unit.id === firstUnit.id
              ? { ...unit, at: aiAt }
              : unit,
        ),
      },
      human,
    );
    const result = applyCommand(state, {
      kind: "ATTACK",
      unitId: humanUnit.id,
      target: { kind: "UNIT", unitId: firstUnit.id },
    });
    expect(result.ok).toBe(true);
    expect(
      queryPlayerCommands(viewFor(state, human.id)).some(
        ({ command }) =>
          command.kind === "ATTACK" &&
          command.target.kind === "UNIT" &&
          command.target.unitId === firstUnit.id,
      ),
    ).toBe(true);
    expect(firstAi.id).not.toBe(human.id);
  });
});

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}
