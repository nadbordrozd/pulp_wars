import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6,
  chooseNormalCommandV6,
} from "../../src/ai/v6";
import {
  canonicalHash,
  canonicalJson,
} from "../../src/engine/replay/canonical";
import type { PlayerId } from "../../src/engine/model/ids";
import { compareCommandsV6 } from "../../src/engine/v6/commands";
import { queryPlayerCommandsV6 } from "../../src/engine/v6/query";
import {
  applyCommandV6,
  createPlayableGameV6,
} from "../../src/engine/v6/reducer";
import {
  ReplayErrorV6,
  parseReplayFileV6,
  runReplayV6,
  type ReplayFileV6,
} from "../../src/engine/v6/replay";
import { parseGameStateV6 } from "../../src/engine/v6/state-schema";
import type {
  AiModeV6,
  FactionIdV6,
  GameStateV6,
  MatchSetupV6,
} from "../../src/engine/v6/types";
import { viewForV6 } from "../../src/engine/v6/view";
import {
  V6_MATCH_MAX_COMMANDS_DEFAULT,
  V6_MATCH_MAX_ROUNDS_DEFAULT,
  V6_PUBLIC_EQUALITY_COMMAND_LIMIT,
  NormalTurnCommandCapErrorV6,
  chooseNormalTurnCommandV6,
  runAiBatchV6,
  runAiMatchV6,
} from "../../src/headless/v6";

function setupV6(overrides: Partial<MatchSetupV6> = {}): MatchSetupV6 {
  const aiCount = overrides.aiCount ?? 1;
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 0,
    width: aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16,
    height: aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, (_, index): FactionIdV6 =>
      index % 2 === 0 ? "ORIGINAL" : "CANDY",
    ),
    ...overrides,
  };
}

function createdState(setup: MatchSetupV6 = setupV6()): GameStateV6 {
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function activePlayer(state: GameStateV6): PlayerId {
  const playerId = state.turnOrder[state.activeSeatIndex];
  if (playerId === undefined) throw new Error("Missing active player");
  return playerId;
}

describe("ruleset-6 Normal observation boundary", () => {
  it("keeps authoritative state, reducer, map, and PRNG out of policy imports", () => {
    const source = readFileSync("src/ai/v6.ts", "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    expect(imports).toEqual([
      "../engine/model/ids",
      "../engine/v6/commands",
      "../engine/v6/query",
      "../engine/v6/types",
      "../engine/v6/view",
    ]);
    expect(source).not.toMatch(
      /\bGameStateV6\b|applyCommandV6|createPlayableGameV6/,
    );
    expect(
      imports.some((value) =>
        /map|random|reducer|state-schema/.test(value ?? ""),
      ),
    ).toBe(false);
  });

  it("removes Wait, classifies public commands once, and uses the exact tuple", () => {
    const state = createdState();
    const view = viewForV6(state, activePlayer(state));
    const publicCommands = queryPlayerCommandsV6(view);
    const decision = chooseNormalCommandV6(view);

    expect(publicCommands).toEqual([...publicCommands].sort(compareCommandsV6));
    expect(new Set(publicCommands.map(canonicalJson)).size).toBe(
      publicCommands.length,
    );
    expect(publicCommands.some((command) => command.kind === "WAIT")).toBe(
      true,
    );
    expect(
      decision.candidates.some(({ command }) => command.kind === "WAIT"),
    ).toBe(false);
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: "FARMING" });
    expect(decision.prngDraws).toBe(0);
    expect(
      decision.candidates.find(
        ({ command }) => command.kind === "HARVEST_FRUIT",
      )?.score.priority,
    ).toBe(1140);
    expect(decision.candidates.at(-1)).toMatchObject({
      command: { kind: "END_TURN" },
      score: { priority: 0 },
    });
    for (const candidate of decision.candidates) {
      expect(candidate.tuple).toEqual([
        candidate.score.priority,
        candidate.score.strategicValue,
        candidate.score.immediateValue,
        candidate.score.futureValue,
        candidate.score.safetyValue,
        candidate.score.objectiveValue,
        ...candidate.score.deterministicTieBreak,
      ]);
      expect(candidate.tuple).toHaveLength(11);
    }
  });

  it("produces the same public commands and policy choice for hidden tile changes", () => {
    const state = createdState();
    const viewer = activePlayer(state);
    const first = structuredClone(state);
    const hiddenIndex = first.board.tiles.findIndex(
      (tile) =>
        !first.players
          .find((player) => player.id === viewer)
          ?.explored.some((at) => at.x === tile.at.x && at.y === tile.at.y),
    );
    expect(hiddenIndex).toBeGreaterThanOrEqual(0);
    const hidden = first.board.tiles[hiddenIndex];
    if (hidden === undefined) throw new Error("Missing hidden tile");
    const second: GameStateV6 = {
      ...first,
      board: {
        ...first.board,
        tiles: first.board.tiles.map((tile, index) =>
          index === hiddenIndex
            ? {
                ...tile,
                terrain: tile.terrain === "MOUNTAIN" ? "GRASS" : "MOUNTAIN",
                resource: tile.resource === "ORE" ? "STONE" : "ORE",
                improvement: "MINE",
                road: !tile.road,
              }
            : tile,
        ),
      },
    };

    const firstView = viewForV6(first, viewer);
    const secondView = viewForV6(second, viewer);
    expect(firstView).toEqual(secondView);
    expect(queryPlayerCommandsV6(firstView)).toEqual(
      queryPlayerCommandsV6(secondView),
    );
    expect(chooseNormalCommandV6(firstView)).toEqual(
      chooseNormalCommandV6(secondView),
    );
  });

  it("applies threatened kill, promotion, and production priority tiers", () => {
    const base = createdState();
    const viewer = activePlayer(base);
    const city = base.cities.find((value) => value.ownerId === viewer);
    const own = base.units.find((value) => value.ownerId === viewer);
    const enemy = base.units.find((value) => value.ownerId !== viewer);
    if (city === undefined || own === undefined || enemy === undefined) {
      throw new Error("Missing priority fixture entities");
    }
    const threatened: GameStateV6 = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === enemy.id
          ? {
              ...unit,
              at: { x: city.at.x, y: city.at.y - 1 },
              hp: 1,
            }
          : unit,
      ),
    };
    const attack = chooseNormalCommandV6(viewForV6(threatened, viewer));
    expect(attack.command).toMatchObject({ kind: "ATTACK", unitId: own.id });
    expect(attack.candidates[0]?.score.priority).toBe(1280);

    const promotable: GameStateV6 = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === own.id ? { ...unit, kills: 3 } : unit,
      ),
    };
    const promotion = chooseNormalCommandV6(viewForV6(promotable, viewer));
    expect(promotion.command).toEqual({ kind: "PROMOTE", unitId: own.id });
    expect(promotion.candidates[0]?.score.priority).toBe(1320);

    const emptyCenter: GameStateV6 = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === own.id
          ? { ...unit, at: { x: city.at.x - 1, y: city.at.y - 1 } }
          : unit,
      ),
    };
    const general = chooseNormalCommandV6(viewForV6(emptyCenter, viewer));
    expect(
      general.candidates.find(({ command }) => command.kind === "TRAIN")?.score
        .priority,
    ).toBe(1080);

    const threatenedEmpty: GameStateV6 = {
      ...emptyCenter,
      units: emptyCenter.units.map((unit) =>
        unit.id === enemy.id
          ? { ...unit, at: { x: city.at.x, y: city.at.y - 1 } }
          : unit,
      ),
    };
    const defense = chooseNormalCommandV6(viewForV6(threatenedEmpty, viewer));
    expect(
      defense.candidates.find(({ command }) => command.kind === "TRAIN")?.score
        .priority,
    ).toBe(1260);
  });

  it("exposes only a content-free allied-territory block on unexplored tiles", () => {
    const initial = structuredClone(
      createdState(
        setupV6({
          aiCount: 3,
          width: 16,
          height: 16,
          aiMode: "COOPERATIVE",
          factions: ["ORIGINAL", "CANDY", "ORIGINAL", "CANDY"],
        }),
      ),
    );
    const viewer = initial.players.find((player) => player.controller === "AI");
    const ally = initial.players.find(
      (player) => player.controller === "AI" && player.id !== viewer?.id,
    );
    if (viewer === undefined || ally === undefined)
      throw new Error("Missing AI allies");
    const allyCity = initial.cities.find((city) => city.ownerId === ally.id);
    if (allyCity === undefined) throw new Error("Missing allied city");
    const hiddenIndex = initial.board.tiles.findIndex(
      (tile) =>
        !viewer.explored.some((at) => at.x === tile.at.x && at.y === tile.at.y),
    );
    const hidden = initial.board.tiles[hiddenIndex];
    if (hidden === undefined) throw new Error("Missing hidden tile");
    const activeSeatIndex = initial.turnOrder.indexOf(viewer.id);
    if (activeSeatIndex < 0) throw new Error("Missing viewer turn");
    const state: GameStateV6 = {
      ...initial,
      activeSeatIndex,
      board: {
        ...initial.board,
        tiles: initial.board.tiles.map((tile, index) =>
          index === hiddenIndex
            ? {
                ...tile,
                territoryCityId: allyCity.id,
                terrain: "MOUNTAIN",
                resource: "ORE",
                improvement: "MINE",
                road: true,
                site: "VILLAGE",
              }
            : tile,
        ),
      },
    };
    const altered: GameStateV6 = {
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile, index) =>
          index === hiddenIndex
            ? {
                ...tile,
                terrain: "GRASS",
                resource: "FRUIT",
                improvement: null,
                road: false,
                site: null,
              }
            : tile,
        ),
      },
    };

    const view = viewForV6(state, viewer.id);
    const alteredView = viewForV6(altered, viewer.id);
    expect(view.board.tiles[hiddenIndex]).toEqual({
      at: hidden.at,
      explored: false,
      diplomaticBlock: "ALLIED_TERRITORY",
    });
    expect(view).toEqual(alteredView);
    expect(chooseNormalCommandV6(view)).toEqual(
      chooseNormalCommandV6(alteredView),
    );
  });

  it.each([
    ["NEUTRAL", true],
    ["ENEMY", true],
    ["OWN", true],
    ["ALLIED", false],
  ] as const)(
    "keeps an explored %s territory step aligned between the public query and reducer",
    (relationship, offered) => {
      const state = movementTerritoryState(relationship);
      const actor = activePlayer(state);
      const unit = state.units.find((candidate) => candidate.ownerId === actor);
      if (unit === undefined) throw new Error("Missing movement actor");
      const target = { x: 12, y: 12 };
      const command = {
        kind: "MOVE" as const,
        unitId: unit.id,
        path: [target],
      };
      const view = viewForV6(state, actor);
      const publicTile =
        view.board.tiles[target.y * view.board.width + target.x];
      const publicCommands = queryPlayerCommandsV6(view);

      expect(publicTile).toMatchObject({
        explored: true,
        territoryOwnerId:
          relationship === "NEUTRAL"
            ? null
            : relationship === "OWN"
              ? actor
              : 3,
      });
      if (relationship === "ALLIED" || relationship === "ENEMY") {
        expect(publicTile).toMatchObject({ territoryCityId: null });
        expect(view.cities).not.toContainEqual(
          expect.objectContaining({ id: 5, at: { x: 11, y: 11 } }),
        );
        expect(view.board.tiles[11 * view.board.width + 11]).toMatchObject({
          at: { x: 11, y: 11 },
          explored: false,
        });
      }
      if (offered) expect(publicCommands).toContainEqual(command);
      else expect(publicCommands).not.toContainEqual(command);

      const applied = applyCommandV6(state, actor, command);
      if (offered) {
        expect(applied.accepted).toBe(true);
      } else {
        expect(applied).toMatchObject({
          accepted: false,
          error: {
            code: "MOVEMENT_ILLEGAL",
            params: { reason: "ALLY_TERRITORY_FORBIDDEN" },
          },
        });
        const decision = chooseNormalCommandV6(view);
        expect(decision.command).not.toEqual(command);
        if (decision.command === null)
          throw new Error("Missing fallback command");
        expect(applyCommandV6(state, actor, decision.command).accepted).toBe(
          true,
        );
      }
    },
  );
});

function movementTerritoryState(
  relationship: "NEUTRAL" | "ENEMY" | "OWN" | "ALLIED",
): GameStateV6 {
  const state = structuredClone(
    createdState(
      setupV6({
        aiCount: 2,
        width: 14,
        height: 14,
        aiMode: relationship === "ENEMY" ? "RIVAL" : "COOPERATIVE",
        factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
      }),
    ),
  );
  const actorId = relationship === "OWN" ? (3 as PlayerId) : (2 as PlayerId);
  const unit = state.units.find((candidate) => candidate.ownerId === actorId);
  if (unit === undefined)
    throw new Error("Missing deterministic movement unit");
  const hiddenController = state.cities.find(
    (city) => city.ownerId === (3 as PlayerId),
  );
  if (hiddenController === undefined) {
    throw new Error("Missing deterministic territory controller");
  }
  const start = { x: 13, y: 13 };
  const target = { x: 12, y: 12 };
  const exploredAroundStart = [
    { x: 12, y: 12 },
    { x: 13, y: 12 },
    { x: 12, y: 13 },
    start,
  ];
  const candidate: GameStateV6 = {
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(actorId),
    board:
      relationship === "NEUTRAL"
        ? {
            ...state.board,
            tiles: state.board.tiles.map((tile) =>
              tile.at.x === target.x && tile.at.y === target.y
                ? { ...tile, territoryCityId: null }
                : tile,
            ),
          }
        : state.board,
    players: state.players.map((player) =>
      player.id === actorId
        ? {
            ...player,
            explored: [...player.explored, ...exploredAroundStart]
              .filter(
                (at, index, all) =>
                  all.findIndex(
                    (candidateAt) =>
                      candidateAt.x === at.x && candidateAt.y === at.y,
                  ) === index,
              )
              .sort((left, right) => left.y - right.y || left.x - right.x),
          }
        : player,
    ),
    units: state.units.map((candidateUnit) =>
      candidateUnit.id === unit.id
        ? { ...candidateUnit, at: start }
        : candidateUnit,
    ),
  };
  const parsed = parseGameStateV6(candidate);
  if (parsed === null) throw new Error("Invalid movement territory fixture");
  expect(hiddenController.at).toEqual({ x: 11, y: 11 });
  expect(unit.id).toBe(relationship === "OWN" ? 6 : 4);
  return parsed;
}

describe("ruleset-6 deterministic headless execution", () => {
  it("repeats mixed-faction commands, events, checkpoints, and final state", () => {
    const setup = setupV6();
    const first = runAiMatchV6(setup, { maxCommands: 36, maxRounds: 20 });
    const second = runAiMatchV6(setup, { maxCommands: 36, maxRounds: 20 });

    expect(first.termination).toBe("COMMAND_CAP");
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.events).toEqual(second.events);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.metrics.commandHash).toBe(second.metrics.commandHash);
    expect(first.metrics.eventHash).toBe(second.metrics.eventHash);
    expect(first.metrics.checkpointHash).toBe(second.metrics.checkpointHash);
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(first.metrics.publicEquality.mismatches).toBe(0);
    expect(first.metrics.publicEquality.commandChecks).toBe(
      V6_PUBLIC_EQUALITY_COMMAND_LIMIT,
    );
    expect(first.metrics.relationshipViolations.total).toBe(0);
    expect(first.metrics.factionsBySeat).toEqual(["ORIGINAL", "CANDY"]);
    expect(first.metrics.factionTreesBySeat).toEqual([
      "ORIGINAL_BASELINE",
      "CANDY_BASELINE_V1",
    ]);
    expect(first.metrics.commandCapHits).toBe(1);

    const replay: ReplayFileV6 = {
      format: "pulp-wars-replay",
      version: 6,
      setup,
      commands: first.commandLog.map((record) => record.command),
      checkpoints: first.commandLog.map((record) => ({
        index: record.index,
        stateHash: record.stateHash,
      })),
    };
    const replayed = runReplayV6(replay);
    expect(replayed.acceptedCommands).toBe(first.acceptedCommands);
    expect(replayed.stateHash).toBe(first.stateHash);
    expect(canonicalHash(replayed.events)).toBe(canonicalHash(first.events));

    expect(
      Object.values(first.metrics.commandsByKind).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(first.acceptedCommands);
    expect(
      Object.values(first.metrics.eventsByKind).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(first.events.length);
    expect(Object.values(first.metrics.researchByTech).some(Boolean)).toBe(
      true,
    );
    expect(first.metrics.coinsEarned).toBeGreaterThan(0);
    expect(first.metrics.coinsSpent).toBeGreaterThan(0);
  }, 30_000);

  it("strictly rejects malformed replays and mismatched checkpoints", () => {
    const replay: ReplayFileV6 = {
      format: "pulp-wars-replay",
      version: 6,
      setup: setupV6(),
      commands: [],
      checkpoints: [],
    };
    expect(parseReplayFileV6({ ...replay, extra: true })).toEqual({
      kind: "INVALID_REPLAY",
    });
    expect(() => runReplayV6({ ...replay, extra: true })).toThrowError(
      ReplayErrorV6,
    );
    try {
      runReplayV6({
        ...replay,
        checkpoints: [{ index: 0, stateHash: "0".repeat(64) }],
      });
      throw new Error("Expected checkpoint mismatch");
    } catch (cause) {
      expect(cause).toMatchObject({
        code: "CHECKPOINT_MISMATCH",
        index: 0,
      });
    }
  });

  it("reserves the entire pending queue plus End Turn and reports overflow", () => {
    const state = createdState();
    const view = viewForV6(state, activePlayer(state));
    const rewardCity = view.cities[0];
    if (rewardCity === undefined) throw new Error("Missing reward city");
    const pending = {
      ...view,
      pendingChoices: [
        {
          kind: "CITY_REWARD" as const,
          cityId: rewardCity.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"] as const,
        },
      ],
    };
    expect(chooseNormalTurnCommandV6(pending, 0, 2)).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
    });
    expect(chooseNormalTurnCommandV6(view, 1, 2)).toEqual({
      kind: "END_TURN",
    });
    expect(() => chooseNormalTurnCommandV6(pending, 1, 2)).toThrowError(
      NormalTurnCommandCapErrorV6,
    );
  });

  it("audits a cooperative alternating-faction run without allied harm", () => {
    const setup = setupV6({
      aiCount: 2,
      width: 14,
      height: 14,
      aiMode: "COOPERATIVE",
      factions: ["CANDY", "ORIGINAL", "CANDY"],
    });
    const result = runAiMatchV6(setup, { maxCommands: 12, maxRounds: 20 });
    const repeated = runAiMatchV6(setup, {
      maxCommands: 12,
      maxRounds: 20,
    });
    expect(result.errors).toEqual([]);
    expect(result.stalls).toEqual([]);
    expect(result.metrics.relationshipViolations).toMatchObject({ total: 0 });
    expect(result.metrics.publicEquality.mismatches).toBe(0);
    expect(result.commandLog).toEqual(repeated.commandLog);
    expect(result.events).toEqual(repeated.events);
    expect(result.stateHash).toBe(repeated.stateHash);
    expect(result.metrics.checkpointHash).toBe(repeated.metrics.checkpointHash);
  }, 30_000);

  it("preserves map, turn order, and post-generation PRNG across faction-only changes", () => {
    const original = createdState(
      setupV6({ factions: ["ORIGINAL", "ORIGINAL"] }),
    );
    const mixed = createdState(setupV6({ factions: ["ORIGINAL", "CANDY"] }));
    expect(original.board).toEqual(mixed.board);
    expect(original.turnOrder).toEqual(mixed.turnOrder);
    expect(original.random).toEqual(mixed.random);

    const originalMetrics = runAiMatchV6(original.setup, {
      maxCommands: 1,
      maxRounds: 5,
    }).metrics;
    const mixedMetrics = runAiMatchV6(mixed.setup, {
      maxCommands: 1,
      maxRounds: 5,
    }).metrics;
    expect(originalMetrics.mapHash).toBe(mixedMetrics.mapHash);
    expect(originalMetrics.postGenerationPrngHash).toBe(
      mixedMetrics.postGenerationPrngHash,
    );
  });

  it("uses the documented caps and records caps as batch failures", async () => {
    expect(NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6).toBe(128);
    expect(V6_MATCH_MAX_COMMANDS_DEFAULT).toBe(30_000);
    expect(V6_MATCH_MAX_ROUNDS_DEFAULT).toBe(750);
    expect(() =>
      runAiMatchV6(setupV6(), {
        maxCommands: 1,
        maxRounds: 1,
        maxCommandsPerTurn: 129,
      }),
    ).toThrow(RangeError);

    const summary = await runAiBatchV6({
      seeds: [0],
      aiCounts: [1],
      modes: ["RIVAL", "COOPERATIVE"] satisfies readonly AiModeV6[],
      factions: ["ORIGINAL", "CANDY"],
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(summary).toMatchObject({
      matches: 2,
      completed: 0,
      failed: 2,
      capped: 2,
      errors: 0,
      stalls: 0,
      outcomes: { COMMAND_CAP: 2 },
    });
    expect(summary.entries.every((entry) => entry.capFailure)).toBe(true);
    expect(summary.entries.map((entry) => entry.aiMode)).toEqual([
      "RIVAL",
      "COOPERATIVE",
    ]);

    const defaults = await runAiBatchV6({
      seeds: [0],
      aiCounts: [1],
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(defaults.entries).toHaveLength(1);
    expect(defaults.entries[0]).toMatchObject({
      aiMode: "RIVAL",
      capFailure: true,
      metrics: {
        factionsBySeat: ["ORIGINAL", "ORIGINAL"],
        factionTreesBySeat: ["ORIGINAL_BASELINE", "ORIGINAL_BASELINE"],
      },
    });
    const initial = createdState(
      setupV6({ factions: ["ORIGINAL", "ORIGINAL"] }),
    );
    expect(defaults.entries[0]?.metrics.mapHash).toBe(
      canonicalHash({
        board: initial.board,
        treasureChests: initial.treasureChests,
      }),
    );
  });
});
