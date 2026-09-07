import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  createReplayV7,
  parseReplayFileV7,
  runReplayV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type ReplayFileV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";

const setup: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 42,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
  mapGenerationRevision: "SPATIAL_ECONOMY",
};

describe("ruleset-7 save and replay foundation", () => {
  it("uses an independent v7 save key and round-trips a canonical initial save", () => {
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r2.current");
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(save.stateHash).toBe(canonicalHash(created.state));
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: 0,
      stateHash: save.stateHash,
    });
  });

  it("round-trips a command-bearing v7 save through reducer replay", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const actor = created.state.turnOrder[created.state.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const applied = applyCommandV7(created.state, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!applied.accepted) throw new Error(applied.error.code);
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      { kind: "RESEARCH", tech: "HUNTING" },
      applied.state,
    );
    const save = createSaveEnvelopeV7(
      { state: applied.state, replay },
      "2026-09-06T12:30:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay).state).toEqual(applied.state);
  });

  it("naturally replays Muster unlock and its command-bearing Monument placement", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay: ReplayFileV7 = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const city = state.cities.find(
      (candidate) => candidate.ownerId === humanId,
    );
    if (city === undefined) throw new Error("human city missing");
    const apply = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active actor missing");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result.events;
    };
    const fundHuman = (coins: number) => {
      for (let guard = 0; guard < 100; guard += 1) {
        const active = state.turnOrder[state.activeSeatIndex];
        const human = state.players.find((player) => player.id === humanId);
        if (active === humanId && human !== undefined && human.coins >= coins)
          return;
        apply({ kind: "END_TURN" });
      }
      throw new Error("funding guard exhausted");
    };
    fundHuman(5);
    apply({ kind: "RESEARCH", tech: "SCOUTING" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "RAIDING" });
    fundHuman(9);
    apply({ kind: "RESEARCH", tech: "DRILL" });
    fundHuman(5);
    apply({ kind: "RESEARCH", tech: "SURVEYING" });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "QUARRYING" });

    const openTiles = () =>
      state.board.tiles.filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.terrain !== "MOUNTAIN" &&
          tile.resource === null &&
          tile.improvement === null &&
          !state.treasureChests.some((chest) => sameCoord(chest, tile.at)) &&
          !state.units.some((unit) => sameCoord(unit.at, tile.at)),
      );
    fundHuman(4);
    const barracksAt = openTiles().find(
      (tile) => chebyshev(tile.at, city.at) === 1,
    )?.at;
    if (barracksAt === undefined) throw new Error("barracks tile missing");
    apply({ kind: "BUILD_BARRACKS", at: barracksAt });

    const roles = ["SCOUT", "RAIDER", "GUARD"] as const;
    for (const role of roles) {
      const cost = role === "GUARD" ? 3 : 4;
      fundHuman(cost);
      const occupant = state.units.find(
        (unit) => unit.ownerId === humanId && sameCoord(unit.at, city.at),
      );
      if (occupant === undefined) throw new Error("city occupant missing");
      const destination = openTiles().find(
        (tile) => chebyshev(tile.at, city.at) === 1,
      )?.at;
      if (destination === undefined) throw new Error("movement tile missing");
      apply({ kind: "MOVE", unitId: occupant.id, path: [destination] });
      const events = apply({ kind: "TRAIN", cityId: city.id, role });
      if (role === "GUARD")
        expect(events).toContainEqual({
          kind: "ACHIEVEMENT_UNLOCKED",
          playerId: humanId,
          achievement: "MUSTER",
        });
    }
    const monumentAt = openTiles()[0]?.at;
    if (monumentAt === undefined) throw new Error("Monument tile missing");
    const monumentEvents = apply({
      kind: "BUILD_MONUMENT",
      achievement: "MUSTER",
      at: monumentAt,
    });
    expect(monumentEvents[0]).toMatchObject({
      kind: "MONUMENT_BUILT",
      achievement: "MUSTER",
      populationAdded: 3,
    });
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-07T17:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: replay.commands.length,
      state,
      stateHash: canonicalHash(state),
    });
  });

  it("replays natural Windmill dependency loss, marker restoration, and full-cost repair", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const humanId = state.humanPlayerId;
    const city = state.cities.find(
      (candidate) => candidate.ownerId === humanId,
    );
    if (city === undefined) throw new Error("human city missing");
    const farmTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.terrain === "GRASS" &&
        tile.resource === "FERTILE_GROUND" &&
        tile.improvement === null &&
        tile.site === null,
    );
    if (farmTile === undefined) throw new Error("natural farm missing");
    const windmillTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.resource === null &&
        tile.improvement === null &&
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - farmTile.at.x),
          Math.abs(tile.at.y - farmTile.at.y),
        ) === 1,
    );
    if (windmillTile === undefined)
      throw new Error("natural mill site missing");

    const apply = (command: CommandV7) => {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active actor missing");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}:${result.error.code}`);
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
      return result.events;
    };
    const fundHuman = (minimum: number) => {
      for (let guard = 0; guard < 100; guard += 1) {
        const active = state.turnOrder[state.activeSeatIndex];
        const coins = state.players.find(
          (player) => player.id === humanId,
        )?.coins;
        if (active === humanId && coins !== undefined && coins >= minimum)
          return;
        apply({ kind: "END_TURN" });
      }
      throw new Error("funding guard exhausted");
    };

    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "FARMING" });
    fundHuman(5);
    apply({ kind: "BUILD_FARM", at: farmTile.at });
    apply({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    fundHuman(9);
    apply({ kind: "RESEARCH", tech: "MILLING" });
    fundHuman(5);
    apply({ kind: "BUILD_WINDMILL", at: windmillTile.at });
    apply({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 3,
      reward: "WALLS",
    });
    fundHuman(7);
    apply({ kind: "RESEARCH", tech: "CRAFT" });
    fundHuman(9);
    apply({ kind: "RESEARCH", tech: "GRAND_WORKS" });
    const removedEvents = apply({ kind: "REDEVELOP", at: farmTile.at });
    expect(removedEvents).toContainEqual(
      expect.objectContaining({
        kind: "ECONOMIC_BUILDING_REMOVED",
        resourceRestored: "FERTILE_GROUND",
      }),
    );
    const damaged = state.cities.find((candidate) => candidate.id === city.id);
    expect(damaged).toMatchObject({
      level: 3,
      economicPopulation: 0,
      population: -5,
    });
    fundHuman(5);
    const repairingPlayer = state.players.find(
      (player) => player.id === humanId,
    );
    if (repairingPlayer === undefined) throw new Error("human player missing");
    const coinsBeforeRepair = repairingPlayer.coins;
    const repairedEvents = apply({ kind: "BUILD_FARM", at: farmTile.at });
    expect(state.players.find((player) => player.id === humanId)?.coins).toBe(
      coinsBeforeRepair - 5,
    );
    expect(
      state.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      level: 3,
      economicPopulation: 5,
      population: 0,
      rewards: [
        { reachedLevel: 2, reward: "STOCKPILE" },
        { reachedLevel: 3, reward: "WALLS" },
      ],
    });
    expect(
      repairedEvents.some(
        (event) =>
          event.kind === "CITY_LEVELED_UP" || event.kind.includes("REWARD"),
      ),
    ).toBe(false);

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-06T13:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: replay.commands.length,
      state,
      stateHash: canonicalHash(state),
    });
  });

  it("classifies every v1-v6 artifact as incompatible without migration", () => {
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const replay = { format: "pulp-wars-replay", version, opaque: "keep" };
      expect(parseReplayFileV7(replay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      const source = JSON.stringify({
        format: "pulp-wars-save",
        version,
        opaque: "keep",
      });
      expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
      expect(source).toBe(
        JSON.stringify({ format: "pulp-wars-save", version, opaque: "keep" }),
      );
    }
  });

  it("preserves the r1 development identity as incompatible and never executes it", () => {
    const developmentSetup = {
      ...setup,
      rulesetId: "pulp-wars-poc-7",
    };
    const developmentReplay = {
      format: "pulp-wars-replay",
      version: 7,
      setup: developmentSetup,
      commands: [{ kind: "UNKNOWN_DEVELOPMENT_COMMAND" }],
      checkpoints: [],
    };
    expect(parseReplayFileV7(developmentReplay)).toEqual({
      kind: "INCOMPATIBLE_REPLAY",
    });
    expect(() => runReplayV7(developmentReplay)).toThrowError(
      "INCOMPATIBLE_REPLAY",
    );

    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const current = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const developmentState = {
      ...current.state,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      players: current.state.players.map((player) => ({
        ...player,
        factionTreeId: "ORIGINAL_BASELINE_V2",
      })),
    };
    const developmentSave = {
      ...current,
      rulesetId: "pulp-wars-poc-7",
      setup: developmentSetup,
      state: developmentState,
      randomState: developmentState.random,
      stateHash: canonicalHash(developmentState),
    };
    const source = JSON.stringify(developmentSave);
    expect(parseSaveV7(source)).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(source).toBe(JSON.stringify(developmentSave));
  });

  it("rejects mixed and unknown r1/r2 identities without fallback", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );

    expect(
      parseReplayFileV7({
        ...replay,
        setup: { ...setup, rulesetId: "pulp-wars-poc-unknown" },
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          setup: { ...setup, rulesetId: "pulp-wars-poc-7" },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          state: {
            ...save.state,
            players: save.state.players.map((player, index) =>
              index === 0
                ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V2" }
                : player,
            ),
          },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, rulesetId: "pulp-wars-poc-unknown" }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("rejects unknown fields, malformed checkpoints, hash drift, and rejected command execution", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const replay = createReplayV7(setup);
    expect(parseReplayFileV7({ ...replay, unknown: true })).toEqual({
      kind: "INVALID_REPLAY",
    });
    expect(
      parseReplayFileV7({
        ...replay,
        checkpoints: [{ index: 1, stateHash: "0".repeat(64) }],
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state: created.state, replay },
      "2026-09-06T12:00:00.000Z",
    );
    expect(
      parseSaveV7(JSON.stringify({ ...save, stateHash: "0".repeat(64) })),
    ).toMatchObject({ kind: "CORRUPT" });
    const withCommand = {
      ...replay,
      commands: [
        { kind: "MOVE", unitId: created.state.units[0]?.id, path: [] },
      ],
    } as const;
    expect(() => runReplayV7(withCommand)).toThrowError("COMMAND_REJECTED");
    try {
      runReplayV7(withCommand);
    } catch (error) {
      expect((error as { code: string }).code).toBe("COMMAND_REJECTED");
    }
  });

  it("does not copy the v6 missing-treasure normalization", () => {
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-06T12:00:00.000Z",
    );
    const state = Object.fromEntries(
      Object.entries(save.state).filter(([key]) => key !== "treasureChests"),
    );
    expect(
      parseSaveV7(
        JSON.stringify({ ...save, state, stateHash: canonicalHash(state) }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });
});

const sameCoord = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
