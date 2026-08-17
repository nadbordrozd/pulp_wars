import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommand,
  preferredTrainingType,
  scoreCommand,
} from "../../src/ai/index";
import {
  applyCommand,
  canonicalJson,
  queryPlayerCommands,
  unitId,
  viewFor,
  type GameState,
  type PlayerId,
  type PlayerState,
  type UnitState,
} from "../../src/engine/index";
import {
  captureReadyStateBuilder,
  gameStateBuilder,
  setupBuilder,
} from "../fixtures/builders";

function active(state: GameState): {
  readonly playerId: PlayerId;
  readonly player: PlayerState;
  readonly unit: UnitState;
} {
  const playerId = state.turnOrder[state.activeSeatIndex];
  const player = state.players.find((candidate) => candidate.id === playerId);
  const unit = state.units.find((candidate) => candidate.ownerId === playerId);
  if (playerId === undefined || player === undefined || unit === undefined) {
    throw new Error("Missing active fixture context");
  }
  return { playerId, player, unit };
}

describe("Normal POC AI", () => {
  it("receives public Wait commands but excludes them from policy candidates", () => {
    const state = gameStateBuilder();
    const { playerId, unit } = active(state);
    const view = viewFor(state, playerId);
    expect(queryPlayerCommands(view)).toContainEqual({
      kind: "WAIT",
      command: { kind: "WAIT", unitId: unit.id },
    });
    const decision = chooseNormalCommand(view);
    expect(
      decision.candidates.some(({ command }) => command.kind === "WAIT"),
    ).toBe(false);
    expect(decision.command?.kind).not.toBe("WAIT");
    expect(decision.prngDraws).toBe(0);
  });

  it("uses only the public query boundary and contains no authoritative imports", () => {
    const source = readFileSync("src/ai/index.ts", "utf8");
    expect(source).not.toMatch(/\bGameState\b/);
    expect(source).not.toMatch(/\bapplyCommand\b/);
    expect(source).not.toMatch(/\blegalCommands\b/);
    expect(source).not.toMatch(/\bpreviewCombat\b/);
  });

  it("is noninterfering for hidden occupancy, candidates, scores, choice, and PRNG use", () => {
    const original = gameStateBuilder();
    const { playerId, player, unit } = active(original);
    const hiddenTarget = { x: unit.at.x - 1, y: unit.at.y };
    const hiddenExplored = player.explored.filter(
      (at) => at.x !== hiddenTarget.x || at.y !== hiddenTarget.y,
    );
    const enemy = original.units.find(
      (candidate) => candidate.ownerId !== playerId,
    );
    if (enemy === undefined) throw new Error("Missing enemy");
    const base: GameState = {
      ...original,
      players: original.players.map((candidate) =>
        candidate.id === playerId
          ? {
              ...candidate,
              stars: 0,
              explored: hiddenExplored.filter(
                (at) => at.x !== enemy.at.x || at.y !== enemy.at.y,
              ),
            }
          : candidate,
      ),
    };
    const occupied: GameState = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === enemy.id
          ? { ...candidate, at: hiddenTarget }
          : candidate,
      ),
    };
    const emptyView = viewFor(base, playerId);
    const occupiedView = viewFor(occupied, playerId);
    expect(occupiedView).toEqual(emptyView);
    expect(queryPlayerCommands(occupiedView)).toEqual(
      queryPlayerCommands(emptyView),
    );
    expect(chooseNormalCommand(occupiedView)).toEqual(
      chooseNormalCommand(emptyView),
    );
    expect(chooseNormalCommand(emptyView).prngDraws).toBe(0);

    const blind = queryPlayerCommands(occupiedView).find(
      ({ command }) =>
        command.kind === "MOVE" &&
        command.path.at(-1)?.x === hiddenTarget.x &&
        command.path.at(-1)?.y === hiddenTarget.y,
    )?.command;
    if (blind === undefined) throw new Error("Missing optimistic blind move");
    const applied = applyCommand(occupied, blind);
    if (!applied.ok) throw new Error(applied.error.code);
    expect(applied.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: unit.id,
      at: hiddenTarget,
      reason: "OCCUPIED",
    });
    expect(
      applied.state.units.find((candidate) => candidate.id === unit.id),
    ).toMatchObject({ at: unit.at, activation: { moved: true } });
  });

  it("does not leak a newly revealed hidden ZOC through query or rejection", () => {
    const original = gameStateBuilder();
    const { playerId, player, unit } = active(original);
    const enemy = original.units.find(
      (candidate) => candidate.ownerId !== playerId,
    );
    if (enemy === undefined) throw new Error("Missing enemy");
    const direction = unit.at.x >= 3 ? -1 : 1;
    const riderAt = { x: unit.at.x + 2 * direction, y: unit.at.y };
    const base: GameState = {
      ...original,
      players: original.players.map((candidate) =>
        candidate.id === playerId
          ? {
              ...candidate,
              stars: 0,
              explored: player.explored.filter(
                (at) => at.x !== enemy.at.x || at.y !== enemy.at.y,
              ),
            }
          : candidate,
      ),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, type: "RIDER", at: riderAt }
          : candidate,
      ),
    };
    const baseView = viewFor(base, playerId);
    const candidate = queryPlayerCommands(baseView)
      .map(({ command }) => command)
      .find((command) => {
        if (command.kind !== "MOVE" || command.path.length !== 2) return false;
        const firstStep = command.path[0];
        return (
          firstStep !== undefined &&
          baseView.board.tiles.some(
            (tile) =>
              !tile.explored &&
              Math.max(
                Math.abs(tile.at.x - firstStep.x),
                Math.abs(tile.at.y - firstStep.y),
              ) === 1,
          )
        );
      });
    if (candidate?.kind !== "MOVE") {
      throw new Error("Missing public frontier two-step path");
    }
    const first = candidate.path[0];
    if (first === undefined) throw new Error("Missing first path step");
    const hiddenEnemyAt = baseView.board.tiles.find(
      (tile) =>
        !tile.explored &&
        Math.max(
          Math.abs(tile.at.x - first.x),
          Math.abs(tile.at.y - first.y),
        ) === 1,
    )?.at;
    if (hiddenEnemyAt === undefined) throw new Error("Missing hidden ZOC tile");
    const zocState: GameState = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === enemy.id
          ? { ...candidate, at: hiddenEnemyAt }
          : candidate,
      ),
    };
    expect(viewFor(zocState, playerId)).toEqual(baseView);
    expect(queryPlayerCommands(viewFor(zocState, playerId))).toContainEqual({
      kind: "MOVE",
      command: candidate,
    });
    const applied = applyCommand(zocState, candidate);
    if (!applied.ok) throw new Error(applied.error.code);
    expect(applied.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: unit.id,
      at: first,
      reason: "ZOC",
    });
    expect(
      applied.state.units.find((candidate) => candidate.id === unit.id)?.at,
    ).toEqual(first);
  });

  it("follows the documented economy, production, recovery, exploration, reward, and end priorities", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = active(original);
    const cityId = unit.homeCityId;
    if (cityId === null) throw new Error("Starting unit has no home city");
    const view = viewFor(original, playerId);
    expect(scoreCommand(view, { kind: "END_TURN" }).priority).toBe(0);
    expect(
      scoreCommand(view, { kind: "RESEARCH", tech: "CLIMBING" }),
    ).toMatchObject({
      priority: 920,
      strategicValue: 1,
      immediateValue: -5,
    });
    expect(
      scoreCommand(view, { kind: "RESEARCH", tech: "RIDING" }),
    ).toMatchObject({ priority: 840, immediateValue: -5 });
    expect(
      scoreCommand(view, {
        kind: "TRAIN",
        cityId,
        unit: "WARRIOR",
      }),
    ).toMatchObject({ priority: 860, immediateValue: -2 });
    expect(
      scoreCommand(view, { kind: "BUILD_MINE", at: unit.at }),
    ).toMatchObject({
      priority: 900,
      strategicValue: 1,
      immediateValue: 5,
    });
    expect(
      scoreCommand(view, { kind: "HARVEST_FRUIT", at: unit.at }),
    ).toMatchObject({ priority: 880, immediateValue: 3 });
    expect(
      scoreCommand(view, { kind: "RECOVER", unitId: unit.id }).priority,
    ).toBe(250);
    expect(
      scoreCommand(view, {
        kind: "CHOOSE_CITY_REWARD",
        cityId,
        reward: "RESOURCES",
      }),
    ).toMatchObject({ priority: 950, immediateValue: 5 });
    const moves = queryPlayerCommands(view).filter(
      ({ command }) => command.kind === "MOVE",
    );
    expect(
      moves.some(({ command }) => scoreCommand(view, command).priority === 500),
    ).toBe(true);
  });

  it("uses the public Forest economy and shortest Catapult research chain", () => {
    const original = gameStateBuilder(setupBuilder({ seed: 0 }));
    const { playerId } = active(original);
    const city = original.cities.find(
      (candidate) => candidate.ownerId === playerId,
    );
    if (city === undefined) throw new Error("Missing Forest AI city");
    const huntingState: GameState = {
      ...original,
      board: {
        ...original.board,
        tiles: original.board.tiles.map((tile) =>
          tile.territoryCityId === city.id && tile.resource === "FRUIT"
            ? { ...tile, resource: null }
            : tile,
        ),
      },
      players: original.players.map((player) =>
        player.id === playerId
          ? { ...player, stars: 50, researchedTechs: ["HUNTING"] }
          : player,
      ),
    };
    const huntingView = viewFor(huntingState, playerId);
    expect(
      queryPlayerCommands(huntingView).some(
        ({ command }) => command.kind === "HUNT_ANIMAL",
      ),
    ).toBe(true);
    expect(chooseNormalCommand(huntingView).command).toEqual({
      kind: "RESEARCH",
      tech: "FORESTRY",
    });

    const exhaustedForestState: GameState = {
      ...huntingState,
      players: huntingState.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              researchedTechs: [
                "RIDING",
                "HUNTING",
                "ORGANIZATION",
                "FORESTRY",
                "ARCHERY",
                "STRATEGY",
              ],
            }
          : player,
      ),
      board: {
        ...huntingState.board,
        tiles: huntingState.board.tiles.map((tile) => {
          if (tile.territoryCityId !== city.id) return tile;
          if (tile.terrain === "FOREST")
            return { ...tile, resource: null, improvement: "LUMBER_MILL" };
          if (tile.terrain === "MOUNTAIN" && tile.resource === "ORE")
            return { ...tile, resource: null, improvement: "MINE" };
          if (tile.terrain === "GRASS" && tile.resource === "FRUIT")
            return { ...tile, resource: null };
          return tile;
        }),
      },
    };
    const exhaustedView = viewFor(exhaustedForestState, playerId);
    expect(chooseNormalCommand(exhaustedView).command).toEqual({
      kind: "RESEARCH",
      tech: "MATHEMATICS",
    });
    expect(
      scoreCommand(exhaustedView, {
        kind: "RESEARCH",
        tech: "MATHEMATICS",
      }),
    ).toMatchObject({ priority: 840, strategicValue: 0 });
  });

  it("uses stable tuple ties and selects only an offered public command", () => {
    const state = gameStateBuilder();
    const { playerId } = active(state);
    const view = viewFor(state, playerId);
    const first = chooseNormalCommand(view);
    const second = chooseNormalCommand(view);
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(
      queryPlayerCommands(view).map(({ command }) => command),
    ).toContainEqual(first.command);
  });

  it("distinguishes neutral, hostile-city, and visibly match-ending captures", () => {
    const neutralState = captureReadyStateBuilder();
    const { playerId, unit } = active(neutralState);
    expect(
      scoreCommand(viewFor(neutralState, playerId), {
        kind: "CAPTURE",
        unitId: unit.id,
      }).priority,
    ).toBe(1140);

    const original = gameStateBuilder();
    const context = active(original);
    const hostileCity = original.cities.find(
      (city) => city.ownerId !== context.playerId,
    );
    if (hostileCity === undefined) throw new Error("Missing hostile city");
    const hostileCapture: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === context.playerId
          ? {
              ...player,
              explored: original.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      units: original.units.map((candidate) =>
        candidate.id === context.unit.id
          ? {
              ...candidate,
              at: hostileCity.at,
              captureEligible: true,
            }
          : candidate,
      ),
    };
    expect(
      scoreCommand(viewFor(hostileCapture, context.playerId), {
        kind: "CAPTURE",
        unitId: context.unit.id,
      }).priority,
    ).toBe(1200);

    const partlyExplored: GameState = {
      ...hostileCapture,
      players: hostileCapture.players.map((player) =>
        player.id === context.playerId
          ? { ...player, explored: [hostileCity.at] }
          : player,
      ),
    };
    expect(
      scoreCommand(viewFor(partlyExplored, context.playerId), {
        kind: "CAPTURE",
        unitId: context.unit.id,
      }).priority,
    ).toBe(1160);
  });

  it("reserves visibly match-ending capture priority for the final active hostile", () => {
    const original = gameStateBuilder(
      setupBuilder({ aiCount: 2, width: 14, height: 14 }),
    );
    const { playerId, unit } = active(original);
    const hostiles = original.players.filter(
      (player) => player.id !== playerId && player.status === "ACTIVE",
    );
    const target = hostiles[0];
    const remaining = hostiles[1];
    const targetCity = original.cities.find(
      (city) => city.ownerId === target?.id,
    );
    const targetUnit = original.units.find(
      (candidate) => candidate.ownerId === target?.id,
    );
    const openTile = original.board.tiles.find(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.site === null &&
        !original.units.some((candidate) => sameCoord(candidate.at, tile.at)) &&
        !original.cities.some((city) => sameCoord(city.at, tile.at)),
    );
    if (
      target === undefined ||
      remaining === undefined ||
      targetCity === undefined ||
      targetUnit === undefined ||
      openTile === undefined
    ) {
      throw new Error("Missing three-player capture fixture context");
    }
    const captureState: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === playerId
          ? { ...player, explored: original.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              at: targetCity.at,
              captureEligible: true,
            }
          : candidate.id === targetUnit.id
            ? { ...candidate, at: openTile.at }
            : candidate,
      ),
    };
    const command = { kind: "CAPTURE" as const, unitId: unit.id };
    const multiHostileView = viewFor(captureState, playerId);
    expect(
      queryPlayerCommands(multiHostileView).map(({ command }) => command),
    ).toContainEqual(command);
    expect(scoreCommand(multiHostileView, command).priority).toBe(1160);

    const finalHostileState: GameState = {
      ...captureState,
      players: captureState.players.map((player) =>
        player.id === remaining.id
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
      cities: captureState.cities.map((city) =>
        city.ownerId === remaining.id ? { ...city, ownerId: playerId } : city,
      ),
      units: captureState.units.filter(
        (candidate) => candidate.ownerId !== remaining.id,
      ),
    };
    const finalHostileView = viewFor(finalHostileState, playerId);
    expect(
      queryPlayerCommands(finalHostileView).map(({ command }) => command),
    ).toContainEqual(command);
    expect(scoreCommand(finalHostileView, command).priority).toBe(1200);
  });

  it("detects visible move-plus-range threats and prioritizes useful local training", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = active(original);
    const city = original.cities.find(
      (candidate) => candidate.ownerId === playerId,
    );
    const enemy = original.units.find(
      (candidate) => candidate.ownerId !== playerId,
    );
    if (city === undefined || enemy === undefined)
      throw new Error("Missing threat fixture context");
    const threatened: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              stars: 50,
              researchedTechs: [
                "CLIMBING",
                "RIDING",
                "HUNTING",
                "ORGANIZATION",
                "MINING",
                "FORESTRY",
                "ARCHERY",
                "STRATEGY",
                "MATHEMATICS",
              ],
            }
          : player,
      ),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: city.at.x - 1, y: city.at.y - 1 } }
          : candidate.id === enemy.id
            ? { ...candidate, at: { x: city.at.x + 1, y: city.at.y } }
            : candidate,
      ),
    };
    const view = viewFor(threatened, playerId);
    const decision = chooseNormalCommand(view);
    expect(decision.command).toEqual({
      kind: "TRAIN",
      cityId: city.id,
      unit: "DEFENDER",
    });
    expect(decision.candidates[0]?.score).toMatchObject({
      priority: 1050,
      strategicValue: 2,
    });
    const cityDefenseMove = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command) =>
          command.kind === "MOVE" &&
          command.path.at(-1)?.x === city.at.x &&
          command.path.at(-1)?.y === city.at.y,
      );
    if (cityDefenseMove?.kind !== "MOVE")
      throw new Error("Missing local city-defense move");
    expect(scoreCommand(view, cityDefenseMove)).toMatchObject({
      priority: 1040,
      strategicValue: 2,
    });
    expect(
      scoreCommand(view, {
        kind: "ATTACK",
        unitId: unit.id,
        target: { kind: "UNIT", unitId: enemy.id },
      }),
    ).toMatchObject({ priority: 1030, strategicValue: 2 });

    const attackView = {
      ...view,
      units: view.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: city.at.x, y: city.at.y - 1 } }
          : candidate.id === enemy.id
            ? { ...candidate, hp: 1 }
            : candidate,
      ),
    };
    expect(
      scoreCommand(attackView, {
        kind: "ATTACK",
        unitId: unit.id,
        target: { kind: "UNIT", unitId: enemy.id },
      }),
    ).toMatchObject({ priority: 1060, strategicValue: 2 });
    const noOwnedCityView = {
      ...attackView,
      cities: attackView.cities.filter(
        (candidate) => candidate.ownerId !== playerId,
      ),
    };
    expect(
      scoreCommand(noOwnedCityView, {
        kind: "ATTACK",
        unitId: unit.id,
        target: { kind: "UNIT", unitId: enemy.id },
      }).priority,
    ).toBe(1000);
    expect(
      scoreCommand(
        {
          ...noOwnedCityView,
          units: noOwnedCityView.units.map((candidate) =>
            candidate.id === enemy.id
              ? { ...candidate, hp: candidate.maxHp }
              : candidate,
          ),
        },
        {
          kind: "ATTACK",
          unitId: unit.id,
          target: { kind: "UNIT", unitId: enemy.id },
        },
      ).priority,
    ).toBe(700);
    expect(
      scoreCommand(view, { kind: "PROMOTE", unitId: unit.id }).priority,
    ).toBe(1100);
    expect(
      scoreCommand(
        {
          ...view,
          units: view.units.map((candidate) =>
            candidate.id === unit.id ? { ...candidate, hp: 4 } : candidate,
          ),
        },
        { kind: "RECOVER", unitId: unit.id },
      ).priority,
    ).toBe(350);

    const affordableWarrior: GameState = {
      ...threatened,
      players: threatened.players.map((player) =>
        player.id === playerId
          ? { ...player, stars: 2, researchedTechs: [] }
          : player,
      ),
    };
    expect(
      chooseNormalCommand(viewFor(affordableWarrior, playerId)).command,
    ).toEqual({ kind: "TRAIN", cityId: city.id, unit: "WARRIOR" });
  });

  it("chooses level-producing growth, then affordable general training, without speculative saving", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = active(original);
    const city = original.cities.find(
      (candidate) => candidate.ownerId === playerId,
    );
    if (city === undefined) throw new Error("Missing growth city");
    const growthState: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              stars: 50,
              researchedTechs: [
                "CLIMBING",
                "RIDING",
                "HUNTING",
                "ORGANIZATION",
                "MINING",
                "FORESTRY",
                "ARCHERY",
                "STRATEGY",
                "MATHEMATICS",
              ],
            }
          : player,
      ),
    };
    expect(
      chooseNormalCommand(viewFor(growthState, playerId)).command?.kind,
    ).toBe("BUILD_MINE");

    const trainingState: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === playerId
          ? { ...player, stars: 2, researchedTechs: [] }
          : player,
      ),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: city.at.x - 1, y: city.at.y } }
          : candidate,
      ),
    };
    expect(
      chooseNormalCommand(viewFor(trainingState, playerId)).command,
    ).toEqual({
      kind: "TRAIN",
      cityId: city.id,
      unit: "WARRIOR",
    });
  });

  it("selects missing public-information roles before balancing its roster", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = active(original);
    const city = original.cities.find(
      (candidate) => candidate.ownerId === playerId,
    );
    if (city === undefined) throw new Error("Missing city");
    const emptyCityState: GameState = {
      ...original,
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: city.at.x + 1, y: city.at.y } }
          : candidate,
      ),
    };
    const startingView = viewFor(emptyCityState, playerId);
    const startingTraining = queryPlayerCommands(startingView)
      .map(({ command }) => command)
      .filter(
        (
          command,
        ): command is Extract<typeof command, { readonly kind: "TRAIN" }> =>
          command.kind === "TRAIN",
      );
    expect(startingTraining.map((command) => command.unit)).toEqual([
      "WARRIOR",
    ]);
    expect(preferredTrainingType(startingView, startingTraining)).toBe(
      "WARRIOR",
    );
    const state: GameState = {
      ...original,
      players: original.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              stars: 50,
              researchedTechs: [
                "CLIMBING",
                "RIDING",
                "HUNTING",
                "ORGANIZATION",
                "MINING",
                "FORESTRY",
                "ARCHERY",
                "STRATEGY",
                "MATHEMATICS",
              ],
            }
          : player,
      ),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: { x: city.at.x + 1, y: city.at.y } }
          : candidate,
      ),
    };
    const view = viewFor(state, playerId);
    const training = queryPlayerCommands(view)
      .map(({ command }) => command)
      .filter(
        (
          command,
        ): command is Extract<typeof command, { readonly kind: "TRAIN" }> =>
          command.kind === "TRAIN",
      );
    expect(preferredTrainingType(view, training)).toBe("RIDER");
    expect(
      chooseNormalCommand(view)
        .candidates.filter(({ command }) => command.kind === "TRAIN")
        .map(({ command }) =>
          command.kind === "TRAIN" ? command.unit : "WARRIOR",
        ),
    ).toEqual(["RIDER"]);

    const withRider = {
      ...view,
      units: [
        ...view.units,
        { ...unit, id: unitId(100), type: "RIDER" as const },
      ],
    };
    expect(preferredTrainingType(withRider, training)).toBe("ARCHER");
    const withArcher = {
      ...withRider,
      units: [
        ...withRider.units,
        { ...unit, id: unitId(101), type: "ARCHER" as const },
      ],
    };
    expect(preferredTrainingType(withArcher, training)).toBe("CATAPULT");
    const withCatapult = {
      ...withArcher,
      units: [
        ...withArcher.units,
        { ...unit, id: unitId(102), type: "CATAPULT" as const },
      ],
    };
    expect(preferredTrainingType(withCatapult, training)).toBe("DEFENDER");
  });
});

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
