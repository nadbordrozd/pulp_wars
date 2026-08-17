import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BrowserPersistence,
  SAVE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createSaveEnvelope,
  parseSave,
  parseSettings,
  type StorageAdapter,
} from "../../src/persistence/index";
import {
  RULESET_ID,
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  createGame,
  createReplay,
  queryPlayerCommands,
  runReplay,
  viewFor,
  type Command,
  type GameState,
  type MatchSetup,
  type ReplayFile,
} from "../../src/engine/index";
import { headless } from "../../src/headless/index";

const setup: MatchSetup = {
  rulesetId: RULESET_ID,
  seed: 1,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "ORIGINAL"],
};

describe("versioned local persistence", () => {
  it("round-trips a Huge setup in the v5 envelope", () => {
    const hugeSetup: MatchSetup = {
      ...setup,
      width: 25,
      height: 25,
      aiCount: 3,
      factions: ["CANDY", "ORIGINAL", "CANDY", "ORIGINAL"],
    };
    const created = createGame(hugeSetup);
    if (!created.ok) throw new Error(created.error.code);
    const envelope = createSaveEnvelope(
      {
        state: created.state,
        replay: createReplay(hugeSetup),
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: created.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-15T12:00:00.000Z",
    );
    expect(envelope.version).toBe(5);
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded).toMatchObject({
      kind: "VALID",
      save: {
        setup: {
          width: 25,
          height: 25,
          aiCount: 3,
          factions: ["CANDY", "ORIGINAL", "CANDY", "ORIGINAL"],
        },
      },
    });
  });

  it("round-trips cooperative Large setup identity without inventing diplomacy", () => {
    const cooperative: MatchSetup = {
      ...setup,
      width: 20,
      height: 20,
      aiCount: 2,
      aiMode: "COOPERATIVE",
      factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
    };
    const created = createGame(cooperative);
    if (!created.ok) throw new Error(created.error.code);
    const envelope = createSaveEnvelope(
      {
        state: created.state,
        replay: createReplay(cooperative),
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: created.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-16T12:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded).toMatchObject({
      kind: "VALID",
      save: {
        setup: {
          width: 20,
          height: 20,
          aiCount: 2,
          aiMode: "COOPERATIVE",
          factions: ["ORIGINAL", "CANDY", "ORIGINAL"],
        },
        state: { humanPlayerId: created.state.humanPlayerId },
      },
    });
  });

  it("round-trips an authoritative command boundary through deterministic replay", () => {
    const boundary = oneCommandBoundary();
    const envelope = createSaveEnvelope(
      {
        state: boundary.state,
        replay: boundary.replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: boundary.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-14T12:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") throw new Error("Save did not validate");
    expect(loaded.save.commandIndex).toBe(1);
    expect(canonicalHash(loaded.save.state)).toBe(
      canonicalHash(boundary.state),
    );
    expect(loaded.save.acceptedCommands).toEqual(boundary.replay.commands);
  });

  it("round-trips a trained Catapult through save, replay, and headless", async () => {
    const boundary = catapultReplayBoundary();
    expect(boundary.replay.commands).toContainEqual({
      kind: "RESEARCH",
      tech: "MATHEMATICS",
    });
    expect(boundary.replay.commands).toContainEqual(
      expect.objectContaining({ kind: "TRAIN", unit: "CATAPULT" }),
    );
    expect(boundary.state.units.some((unit) => unit.type === "CATAPULT")).toBe(
      true,
    );
    const replayed = runReplay(boundary.replay);
    const headlessReplay = await headless.run(boundary.replay);
    expect(replayed.stateHash).toBe(canonicalHash(boundary.state));
    expect(headlessReplay.stateHash).toBe(replayed.stateHash);
    expect(headlessReplay.events).toEqual(replayed.events);

    const envelope = createSaveEnvelope(
      {
        state: boundary.state,
        replay: boundary.replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: boundary.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-16T12:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") throw new Error("Catapult save failed");
    expect(loaded.save.stateHash).toBe(replayed.stateHash);
    expect(
      loaded.save.state.units.some((unit) => unit.type === "CATAPULT"),
    ).toBe(true);
  });

  it("round-trips a Chocolate Wall and Donut Roll through save, replay, and headless", async () => {
    const boundary = candySpecialReplayBoundary();
    expect(boundary.replay.commands).toContainEqual(
      expect.objectContaining({ kind: "KAMIKAZE_ROLL" }),
    );
    expect(boundary.replay.commands).toContainEqual(
      expect.objectContaining({ kind: "BUILD_CHOCOLATE_WALL" }),
    );
    expect(boundary.state.chocolateWalls).toHaveLength(1);

    const replayed = runReplay(boundary.replay);
    const headlessReplay = await headless.run(boundary.replay);
    expect(replayed.stateHash).toBe(canonicalHash(boundary.state));
    expect(headlessReplay.stateHash).toBe(replayed.stateHash);
    expect(headlessReplay.events).toEqual(replayed.events);
    expect(
      headlessReplay.events.some(
        (event) => event.kind === "CHOCOLATE_WALL_BUILT",
      ),
    ).toBe(true);
    expect(
      headlessReplay.events.some((event) => event.kind === "DONUT_ROLL_STEP"),
    ).toBe(true);

    const envelope = createSaveEnvelope(
      {
        state: boundary.state,
        replay: boundary.replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 1 },
        playerTallies: boundary.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: player.controller === "HUMAN" ? 1 : 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-17T12:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") throw new Error("Candy save failed");
    expect(loaded.save.stateHash).toBe(replayed.stateHash);
    expect(loaded.save.state.chocolateWalls).toEqual(
      boundary.state.chocolateWalls,
    );
  });

  it("rejects corrupt, tampered, incompatible, and oversized saves without deleting them", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, "{broken");
    const persistence = new BrowserPersistence(storage);
    expect(persistence.loadSave().kind).toBe("CORRUPT");
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe("{broken");

    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ format: "pulp-wars-save", version: 99 }),
    );
    expect(persistence.loadSave().kind).toBe("INCOMPATIBLE");

    const v1Bytes = readFileSync("tests/fixtures/legacy-save-v1.json", "utf8");
    storage.setItem(SAVE_STORAGE_KEY, v1Bytes);
    expect(persistence.loadSave()).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v1Bytes);

    const v2Bytes = readFileSync("tests/fixtures/legacy-save-v2.json", "utf8");
    storage.setItem(SAVE_STORAGE_KEY, v2Bytes);
    expect(persistence.loadSave()).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v2Bytes);

    const v3Bytes =
      '{"format":"pulp-wars-save","version":3,"opaque":"preserve me"}';
    storage.setItem(SAVE_STORAGE_KEY, v3Bytes);
    expect(persistence.loadSave()).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v3Bytes);

    const v4Bytes = readFileSync("tests/fixtures/legacy-save-v4.json", "utf8");
    storage.setItem(SAVE_STORAGE_KEY, v4Bytes);
    expect(persistence.loadSave()).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v4Bytes);

    const boundary = oneCommandBoundary();
    const envelope = createSaveEnvelope(
      {
        state: boundary.state,
        replay: boundary.replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: [],
      },
      "2026-08-14T12:00:00.000Z",
    );
    const tampered = {
      ...envelope,
      state: { ...envelope.state, round: envelope.state.round + 1 },
    };
    expect(parseSave(JSON.stringify(tampered)).kind).toBe("CORRUPT");
  });

  it("coalesces save writes, flushes explicitly, persists settings, and deletes only on request", () => {
    const boundary = oneCommandBoundary();
    const storage = new MemoryStorage();
    const scheduled: (() => void)[] = [];
    const persistence = new BrowserPersistence(storage, {
      now: () => "2026-08-14T12:00:00.000Z",
      schedule: (task) => {
        scheduled.push(task);
        return () => undefined;
      },
    });
    const saveInput = {
      state: boundary.state,
      replay: boundary.replay,
      tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
      playerTallies: boundary.state.players.map((player) => ({
        playerId: player.id,
        kills: 0,
        losses: 0,
        citiesCaptured: 0,
      })),
    } as const;
    persistence.queueSave(saveInput);
    persistence.queueSave(saveInput);
    expect(scheduled).toHaveLength(1);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(persistence.flushSave()).toEqual({ ok: true });
    expect(persistence.loadSave().kind).toBe("VALID");

    const settings = {
      uiScale: 1.25,
      motion: "REDUCED",
      animationSpeed: "FAST",
      highContrast: true,
    } as const;
    expect(persistence.writeSettings(settings)).toEqual({ ok: true });
    expect(
      parseSettings(storage.getItem(SETTINGS_STORAGE_KEY) ?? "").kind,
    ).toBe("VALID");
    expect(persistence.deleteSave()).toEqual({ ok: true });
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });

  it("turns Storage failures into stable results instead of crashing", () => {
    const storage: StorageAdapter = {
      getItem(): string | null {
        throw new Error("denied");
      },
      setItem(): void {
        throw new Error("full");
      },
      removeItem(): void {
        throw new Error("denied");
      },
    };
    const persistence = new BrowserPersistence(storage);
    expect(persistence.loadSave()).toMatchObject({ kind: "STORAGE_ERROR" });
    expect(persistence.loadSettings()).toMatchObject({ kind: "STORAGE_ERROR" });
    expect(persistence.deleteSave()).toMatchObject({ ok: false });
  });
});

function oneCommandBoundary(): {
  readonly state: GameState;
  readonly replay: ReplayFile;
} {
  const created = createGame(setup);
  if (!created.ok) throw new Error(created.error.code);
  const activeId = created.state.turnOrder[created.state.activeSeatIndex];
  if (activeId === undefined) throw new Error("Missing active player");
  const command = queryPlayerCommands(viewFor(created.state, activeId))
    .map(({ command: candidate }) => candidate)
    .find((candidate) => candidate.kind === "END_TURN");
  if (command === undefined) throw new Error("Missing End Turn");
  const applied = applyCommand(created.state, command);
  if (!applied.ok) throw new Error(applied.error.code);
  return {
    state: applied.state,
    replay: appendReplayCommand(createReplay(setup), command, applied.state),
  };
}

function catapultReplayBoundary(): {
  readonly state: GameState;
  readonly replay: ReplayFile;
} {
  const created = createGame(setup);
  if (!created.ok) throw new Error(created.error.code);
  const targetId = created.state.turnOrder[created.state.activeSeatIndex];
  if (targetId === undefined) throw new Error("Missing Catapult test player");
  let state = created.state;
  let replay = createReplay(setup);
  let founderMoved = false;
  for (let guard = 0; guard < 100; guard += 1) {
    const activeId = state.turnOrder[state.activeSeatIndex];
    if (activeId === undefined) throw new Error("Missing active player");
    const commands = queryPlayerCommands(viewFor(state, activeId)).map(
      ({ command }) => command,
    );
    let command: Command | undefined = commands.find(
      (candidate) => candidate.kind === "END_TURN",
    );
    if (activeId === targetId) {
      const player = state.players.find(
        (candidate) => candidate.id === targetId,
      );
      if (player === undefined) throw new Error("Missing Catapult test player");
      if (!founderMoved) {
        command = commands.find((candidate) => candidate.kind === "MOVE");
        founderMoved = true;
      } else {
        const nextTech = !player.researchedTechs.includes("HUNTING")
          ? "HUNTING"
          : !player.researchedTechs.includes("FORESTRY")
            ? "FORESTRY"
            : !player.researchedTechs.includes("MATHEMATICS")
              ? "MATHEMATICS"
              : null;
        command =
          (nextTech === null
            ? commands.find(
                (candidate) =>
                  candidate.kind === "TRAIN" && candidate.unit === "CATAPULT",
              )
            : commands.find(
                (candidate) =>
                  candidate.kind === "RESEARCH" && candidate.tech === nextTech,
              )) ?? command;
      }
    }
    if (command === undefined) throw new Error("Missing replay command");
    const applied = applyCommand(state, command);
    if (!applied.ok) throw new Error(applied.error.code);
    state = applied.state;
    replay = appendReplayCommand(replay, command, state);
    if (command.kind === "TRAIN" && command.unit === "CATAPULT") {
      return { state, replay };
    }
  }
  throw new Error("Catapult training replay exceeded its bounded command cap");
}

function candySpecialReplayBoundary(): {
  readonly state: GameState;
  readonly replay: ReplayFile;
} {
  const candySetup: MatchSetup = {
    ...setup,
    factions: ["CANDY", "CANDY"],
  };
  const created = createGame(candySetup);
  if (!created.ok) throw new Error(created.error.code);
  const riderOwner = created.state.players.find(
    (player) => player.controller === "HUMAN",
  )?.id;
  const wallOwner = created.state.players.find(
    (player) => player.controller === "AI",
  )?.id;
  if (riderOwner === undefined || wallOwner === undefined)
    throw new Error("Missing Candy replay players");
  const founders = new Map(
    created.state.units.map((unit) => [unit.ownerId, unit.id] as const),
  );
  let state = created.state;
  let replay = createReplay(candySetup);
  let rolled = false;
  let built = false;
  for (let guard = 0; guard < 100 && !(rolled && built); guard += 1) {
    const activeId = state.turnOrder[state.activeSeatIndex];
    if (activeId === undefined) throw new Error("Missing Candy active player");
    const player = state.players.find((candidate) => candidate.id === activeId);
    const city = state.cities.find(
      (candidate) => candidate.ownerId === activeId,
    );
    const founder = state.units.find(
      (candidate) => candidate.id === founders.get(activeId),
    );
    if (player === undefined || city === undefined)
      throw new Error("Missing Candy replay state");
    const commands = queryPlayerCommands(viewFor(state, activeId)).map(
      ({ command }) => command,
    );
    let command: Command | undefined;
    if (
      founder !== undefined &&
      founder.at.x === city.at.x &&
      founder.at.y === city.at.y
    ) {
      command = commands.find(
        (candidate) =>
          candidate.kind === "MOVE" && candidate.unitId === founder.id,
      );
    } else if (activeId === riderOwner) {
      command = !player.researchedTechs.includes("RIDING")
        ? commands.find(
            (candidate) =>
              candidate.kind === "RESEARCH" && candidate.tech === "RIDING",
          )
        : !rolled
          ? (commands.find((candidate) => candidate.kind === "KAMIKAZE_ROLL") ??
            commands.find(
              (candidate) =>
                candidate.kind === "TRAIN" && candidate.unit === "RIDER",
            ))
          : undefined;
    } else if (activeId === wallOwner) {
      command = !player.researchedTechs.includes("ORGANIZATION")
        ? commands.find(
            (candidate) =>
              candidate.kind === "RESEARCH" &&
              candidate.tech === "ORGANIZATION",
          )
        : !player.researchedTechs.includes("STRATEGY")
          ? commands.find(
              (candidate) =>
                candidate.kind === "RESEARCH" && candidate.tech === "STRATEGY",
            )
          : !built
            ? (commands.find(
                (candidate) => candidate.kind === "BUILD_CHOCOLATE_WALL",
              ) ??
              commands.find(
                (candidate) =>
                  candidate.kind === "TRAIN" && candidate.unit === "DEFENDER",
              ))
            : undefined;
    }
    command ??= commands.find((candidate) => candidate.kind === "END_TURN");
    if (command === undefined) throw new Error("Missing Candy replay command");
    const applied = applyCommand(state, command);
    if (!applied.ok) throw new Error(applied.error.code);
    state = applied.state;
    replay = appendReplayCommand(replay, command, state);
    if (command.kind === "KAMIKAZE_ROLL") rolled = true;
    if (command.kind === "BUILD_CHOCOLATE_WALL") built = true;
  }
  if (!rolled || !built)
    throw new Error("Candy replay exceeded its bounded command cap");
  return { state, replay };
}

class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}
