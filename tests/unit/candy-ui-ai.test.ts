import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chooseNormalCommand } from "../../src/ai/index";
import { AppController } from "../../src/app/controller";
import {
  applyCommand,
  canonicalHash,
  queryPlayerCommands,
  unitId,
  viewFor,
  type Command,
  type Coord,
  type GameState,
  type UnitState,
} from "../../src/engine/index";
import {
  resolveInspectionActivation,
  spatialCommandAt,
} from "../../src/render/canvas/board-host";
import { buildRenderPlan } from "../../src/render/canvas/render-plan";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

const FRESH = {
  moved: false,
  attacked: false,
  recovered: false,
  captured: false,
  handled: false,
  escapeAvailable: false,
  specialActed: false,
} as const;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("Candy map-first controls and presentation", () => {
  it("maps only one cardinal Roll activation and previews its visible edge path", () => {
    const { state, actor, enemy, direction, adjacent } = rollArena();
    const view = viewFor(state, state.humanPlayerId);
    expect(
      spatialCommandAt(view, actor.id, adjacent, {
        kind: "ROLL",
        unitId: actor.id,
      }),
    ).toEqual({ kind: "KAMIKAZE_ROLL", unitId: actor.id, direction });
    expect(
      spatialCommandAt(
        view,
        actor.id,
        { x: adjacent.x, y: adjacent.y + 1 },
        {
          kind: "ROLL",
          unitId: actor.id,
        },
      ),
    ).toBeNull();
    const plan = buildRenderPlan(
      view,
      { kind: "UNIT", unitId: actor.id },
      adjacent,
      { kind: "ROLL", unitId: actor.id },
    );
    expect(
      plan.entries.filter((entry) => entry.kind === "ROLL_TARGET"),
    ).toHaveLength(4);
    expect(plan.entries.some((entry) => entry.kind === "ROLL_PATH")).toBe(true);
    expect(plan.entries).toContainEqual(
      expect.objectContaining({ kind: "ROLL_VICTIM", id: enemy.id }),
    );
  });

  it("maps exact adjacent Wall targets and cycles a standalone wall before its tile", () => {
    const { state, actor } = engineerArena();
    const view = viewFor(state, state.humanPlayerId);
    const build = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find((command) => command.kind === "BUILD_CHOCOLATE_WALL");
    if (build?.kind !== "BUILD_CHOCOLATE_WALL")
      throw new Error("Missing wall target");
    expect(
      spatialCommandAt(view, actor.id, build.at, {
        kind: "BUILD_WALL",
        unitId: actor.id,
      }),
    ).toEqual(build);
    const built = applyCommand(state, build);
    if (!built.ok) throw new Error(built.error.code);
    const wall = built.state.chocolateWalls[0];
    if (wall === undefined) throw new Error("Missing built wall");
    const builtView = viewFor(built.state, state.humanPlayerId);
    const first = resolveInspectionActivation(builtView, wall.at, null);
    expect(first.selection).toEqual({ kind: "WALL", wallId: wall.id });
    expect(
      resolveInspectionActivation(builtView, wall.at, first.cycle).selection,
    ).toEqual({ kind: "TILE", at: wall.at });
  });

  it("animates Roll without changing its accepted hash and locks conflicting input", () => {
    const { state, actor, direction } = rollArena();
    const command = {
      kind: "KAMIKAZE_ROLL" as const,
      unitId: actor.id,
      direction,
    };
    const expected = applyCommand(state, command);
    if (!expected.ok) throw new Error(expected.error.code);
    const controller = new AppController({
      initialMatch: state,
      initialRoute: "MATCH",
      storage: null,
      aiStepDelayMs: 100_000,
    });
    expect(controller.dispatch(command)).toBe(true);
    expect(controller.snapshot().candyPresentation).toMatchObject({
      kind: "DONUT_ROLL",
      motion: "FULL",
      paused: false,
    });
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(expected.state),
    );
    expect(controller.dispatch({ kind: "END_TURN" })).toBe(false);
    vi.runOnlyPendingTimers();
    expect(controller.snapshot().candyPresentation).toBeNull();
    controller.destroy();
  });

  it("compresses Roll to its documented reduced-motion equivalent", () => {
    const { state, actor, direction } = rollArena();
    const controller = new AppController({
      initialMatch: state,
      initialRoute: "MATCH",
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    expect(
      controller.dispatch({
        kind: "KAMIKAZE_ROLL",
        unitId: actor.id,
        direction,
      }),
    ).toBe(true);
    expect(controller.snapshot().candyPresentation).toMatchObject({
      kind: "DONUT_ROLL",
      motion: "REDUCED",
      durationMs: 100,
    });
    controller.destroy();
  });

  it("animates a Wall build at the accepted boundary", () => {
    const { state } = engineerArena();
    const build = queryPlayerCommands(viewFor(state, state.humanPlayerId))
      .map(({ command }) => command)
      .find((command) => command.kind === "BUILD_CHOCOLATE_WALL");
    if (build?.kind !== "BUILD_CHOCOLATE_WALL")
      throw new Error("Missing build");
    const controller = new AppController({
      initialMatch: state,
      initialRoute: "MATCH",
      storage: null,
      aiStepDelayMs: 100_000,
    });
    expect(controller.dispatch(build)).toBe(true);
    expect(controller.snapshot().candyPresentation).toMatchObject({
      kind: "WALL_BUILD",
      durationMs: 180,
    });
    controller.destroy();
  });

  it("uses the calibrated Gumball projectile for a Candy Archer", () => {
    const { state, actor, enemy } = combatArena("ARCHER");
    const attack: Command = {
      kind: "ATTACK",
      unitId: actor.id,
      target: { kind: "UNIT", unitId: enemy.id },
    };
    const controller = new AppController({
      initialMatch: state,
      initialRoute: "MATCH",
      storage: null,
      aiStepDelayMs: 100_000,
    });
    expect(controller.dispatch(attack)).toBe(true);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      kind: "ARCHER_ARROW",
      projectile: "GUMBALL",
      phase: "FLIGHT",
    });
    controller.destroy();
  });
});

describe("deterministic Normal Candy heuristics", () => {
  it("chooses a safe threat-killing Roll from the public query", () => {
    const { state, actor, direction } = rollArena();
    const decision = chooseNormalCommand(viewFor(state, state.humanPlayerId));
    expect(decision.command).toEqual({
      kind: "KAMIKAZE_ROLL",
      unitId: actor.id,
      direction,
    });
    expect(decision.candidates[0]?.score).toMatchObject({ priority: 1070 });
  });

  it("excludes Roll lines that cross a public cooperative ally boundary", () => {
    const base = gameStateBuilder(
      setupBuilder({
        aiCount: 2,
        width: 14,
        height: 14,
        aiMode: "COOPERATIVE",
        factions: ["ORIGINAL", "CANDY", "CANDY"],
      }),
    );
    const candyPlayers = base.players.filter(
      (player) => player.controller === "AI" && player.faction === "CANDY",
    );
    const actorPlayer = candyPlayers[0];
    const allyPlayer = candyPlayers[1];
    if (actorPlayer === undefined || allyPlayer === undefined)
      throw new Error("Missing cooperative Candy seats");
    const actorSource = base.units.find(
      (unit) => unit.ownerId === actorPlayer.id,
    );
    const allySource = base.units.find(
      (unit) => unit.ownerId === allyPlayer.id,
    );
    const allyCity = base.cities.find((city) => city.ownerId === allyPlayer.id);
    if (
      actorSource === undefined ||
      allySource === undefined ||
      allyCity === undefined
    )
      throw new Error("Missing cooperative Candy fixture entities");
    const actor = {
      ...actorSource,
      type: "RIDER" as const,
      at: { x: 5, y: 5 },
      ready: true,
      activation: FRESH,
    };
    const ally = { ...allySource, at: { x: 6, y: 5 } };
    const state: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(actorPlayer.id),
      players: base.players.map((player) =>
        player.id === actorPlayer.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === ally.at.x && tile.at.y === ally.at.y
            ? {
                ...tile,
                territoryCityId: allyCity.id,
                territoryCenter: allyCity.at,
              }
            : tile,
        ),
      },
      units: [actor, ally],
    };
    const view = viewFor(state, actorPlayer.id);
    expect(
      queryPlayerCommands(view).some(
        ({ command }) =>
          command.kind === "KAMIKAZE_ROLL" &&
          command.unitId === actor.id &&
          command.direction === "EAST",
      ),
    ).toBe(true);
    expect(
      chooseNormalCommand(view).candidates.some(
        ({ command }) => command.kind === "KAMIKAZE_ROLL",
      ),
    ).toBe(false);
  });

  it("builds one defensive wall at a visibly threatened city without stacking", () => {
    const { state } = engineerArena();
    const first = chooseNormalCommand(viewFor(state, state.humanPlayerId));
    expect(first.command?.kind).toBe("BUILD_CHOCOLATE_WALL");
    if (first.command?.kind !== "BUILD_CHOCOLATE_WALL") return;
    expect(first.candidates[0]?.score.priority).toBe(1055);
    const built = applyCommand(state, first.command);
    if (!built.ok) throw new Error(built.error.code);
    const nextView = viewFor(
      {
        ...built.state,
        units: built.state.units.map((unit) =>
          unit.ownerId === state.humanPlayerId
            ? { ...unit, ready: true, activation: FRESH }
            : unit,
        ),
      },
      state.humanPlayerId,
    );
    expect(
      chooseNormalCommand(nextView).candidates.some(
        (candidate) => candidate.command.kind === "BUILD_CHOCOLATE_WALL",
      ),
    ).toBe(false);
  });

  it("prefers legal neutral Candify over ordinary movement", () => {
    const { state, actor } = candifyArena();
    expect(
      chooseNormalCommand(viewFor(state, state.humanPlayerId)).command,
    ).toEqual({
      kind: "CANDIFY",
      unitId: actor.id,
    });
  });
});

function candyBase(): {
  readonly base: GameState;
  readonly humanId: GameState["humanPlayerId"];
  readonly humanUnit: UnitState;
  readonly enemyUnit: UnitState;
} {
  const base = gameStateBuilder(
    setupBuilder({ factions: ["CANDY", "ORIGINAL"] }),
  );
  const humanUnit = base.units.find(
    (unit) => unit.ownerId === base.humanPlayerId,
  );
  const enemyUnit = base.units.find(
    (unit) => unit.ownerId !== base.humanPlayerId,
  );
  if (humanUnit === undefined || enemyUnit === undefined)
    throw new Error("Missing arena units");
  return { base, humanId: base.humanPlayerId, humanUnit, enemyUnit };
}

function combatArena(type: UnitState["type"]): {
  readonly state: GameState;
  readonly actor: UnitState;
  readonly enemy: UnitState;
} {
  const { base, humanId, humanUnit, enemyUnit } = candyBase();
  const actor = {
    ...humanUnit,
    type,
    at: { x: 5, y: 5 },
    ready: true,
    activation: FRESH,
  };
  const enemy = {
    ...enemyUnit,
    at: { x: 6, y: 5 },
    ready: true,
    activation: FRESH,
  };
  return {
    actor,
    enemy,
    state: {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(humanId),
      players: base.players.map((player) =>
        player.id === humanId
          ? {
              ...player,
              stars: 0,
              explored: base.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      units: [actor, enemy],
      chocolateWalls: [],
    },
  };
}

function rollArena(): ReturnType<typeof combatArena> & {
  readonly direction: "EAST";
  readonly adjacent: Coord;
} {
  const arena = combatArena("RIDER");
  const city = arena.state.cities.find(
    (candidate) => candidate.ownerId === arena.state.humanPlayerId,
  );
  if (city === undefined) throw new Error("Missing human city");
  const actor = { ...arena.actor, at: { x: city.at.x - 2, y: city.at.y } };
  const enemy = { ...arena.enemy, at: { x: city.at.x - 1, y: city.at.y } };
  if (actor.at.x < 0) {
    // Generated capitals have a two-cell safety margin, but keep the fixture explicit.
    throw new Error("Roll fixture capital is too close to the west edge");
  }
  return {
    ...arena,
    actor,
    enemy,
    state: { ...arena.state, units: [actor, enemy] },
    direction: "EAST",
    adjacent: enemy.at,
  };
}

function engineerArena(): {
  readonly state: GameState;
  readonly actor: UnitState;
} {
  const arena = combatArena("DEFENDER");
  const city = arena.state.cities.find(
    (candidate) => candidate.ownerId === arena.state.humanPlayerId,
  );
  if (city === undefined) throw new Error("Missing engineer city");
  const actor = { ...arena.actor, at: { x: city.at.x - 1, y: city.at.y } };
  const enemy = { ...arena.enemy, at: city.at };
  return {
    actor,
    state: {
      ...arena.state,
      players: arena.state.players.map((player) =>
        player.id === arena.state.humanPlayerId
          ? { ...player, stars: 1 }
          : player,
      ),
      units: [actor, enemy],
    },
  };
}

function candifyArena(): {
  readonly state: GameState;
  readonly actor: UnitState;
} {
  const arena = combatArena("WARRIOR");
  const city = arena.state.cities.find(
    (candidate) => candidate.ownerId === arena.state.humanPlayerId,
  );
  if (city === undefined) throw new Error("Missing Candify city");
  const frontier = arena.state.board.tiles.find(
    (tile) =>
      tile.site === null &&
      tile.territoryCityId === null &&
      arena.state.board.tiles.some(
        (owned) =>
          owned.territoryCityId === city.id &&
          Math.max(
            Math.abs(owned.at.x - tile.at.x),
            Math.abs(owned.at.y - tile.at.y),
          ) === 1,
      ),
  );
  if (frontier === undefined) throw new Error("Missing Candify frontier");
  const actor = { ...arena.actor, at: frontier.at, homeCityId: city.id };
  const enemy = {
    ...arena.enemy,
    id: unitId(arena.enemy.id),
    at: { x: arena.state.board.width - 1, y: arena.state.board.height - 1 },
  };
  return { actor, state: { ...arena.state, units: [actor, enemy] } };
}
