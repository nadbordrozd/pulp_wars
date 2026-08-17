import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppController } from "../../src/app/controller";
import {
  DEMO_MATCH_SEED,
  DEMO_MATCH_SETUP,
  DEMO_OPENING_STARS,
  ReplayError,
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  canonicalJson,
  cityCapacity,
  cityAssignedCountedUnitCount,
  cityAssignedExemptUnitCount,
  createGame,
  createReplay,
  demoScenarioIssues,
  parseMatchSetup,
  queryPlayerCommands,
  runReplay,
  viewFor,
  type Command,
  type GameState,
  type MatchSetup,
} from "../../src/engine/index";
import { headless, runAiMatch } from "../../src/headless/index";
import {
  SAVE_STORAGE_KEY,
  createSaveEnvelope,
  parseSave,
  type StorageAdapter,
} from "../../src/persistence/index";
import { buildRenderPlan } from "../../src/render/canvas/render-plan";
import { setupBuilder } from "../fixtures/builders";

const DEMO_INITIAL_HASH =
  "33e7131617587013ffbe21384391f77c615970821c86178dcc905e4cdd8d734d";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("canonical deterministic demo scenario", () => {
  it("creates the exact developed human state without changing AI parity or PRNG", () => {
    const first = createGame(DEMO_MATCH_SETUP);
    const second = createGame(DEMO_MATCH_SETUP);
    if (!first.ok || !second.ok) throw new Error("Demo creation failed");
    expect(first).toEqual(second);
    expect(canonicalJson(first.state)).toBe(canonicalJson(second.state));
    expect(canonicalHash(first.state)).toBe(DEMO_INITIAL_HASH);
    expect(first.state.setup).toEqual(DEMO_MATCH_SETUP);
    expect(first.state.setup.seed).toBe(DEMO_MATCH_SEED);
    expect(first.state.random).toEqual({
      algorithm: "MULBERRY32",
      version: 1,
      state: 816_534_373,
    });
    expect(first.state.turnOrder).toEqual([1, 3, 2]);
    expect(first.state.turnOrder[first.state.activeSeatIndex]).toBe(1);
    expect(demoScenarioIssues(first.state)).toEqual([]);
    expect(first.events.map((event) => event.kind)).toEqual([
      "TILES_REVEALED",
      "TILES_REVEALED",
      "TILES_REVEALED",
      "TURN_STARTED",
      "INCOME_AWARDED",
    ]);

    const human = first.state.players.find(
      (player) => player.controller === "HUMAN",
    );
    if (human === undefined) throw new Error("Missing human");
    expect(human).toMatchObject({
      id: 1,
      color: "CORAL",
      faction: "ORIGINAL",
      stars: DEMO_OPENING_STARS,
      explored: expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 24, y: 24 },
      ]),
    });
    expect(human.explored).toHaveLength(625);
    expect(human.researchedTechs).toEqual([
      "CLIMBING",
      "RIDING",
      "HUNTING",
      "ORGANIZATION",
      "MINING",
      "FORESTRY",
      "ARCHERY",
      "STRATEGY",
      "MATHEMATICS",
    ]);
    expect(
      first.state.players
        .filter((player) => player.controller === "AI")
        .map((player) => ({
          id: player.id,
          stars: player.stars,
          techs: player.researchedTechs.length,
          explored: player.explored.length,
        })),
    ).toEqual([
      { id: 2, stars: 5, techs: 0, explored: 25 },
      { id: 3, stars: 5, techs: 0, explored: 25 },
    ]);
  });

  it("has the exact city, territory, unit, capacity, and selectable-movement layout", () => {
    const created = createGame(DEMO_MATCH_SETUP);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    const human = state.players[0];
    if (human === undefined) throw new Error("Missing human");
    const humanCities = state.cities.filter(
      (city) => city.ownerId === human.id,
    );
    expect(
      humanCities.map((city) => ({
        id: city.id,
        at: city.at,
        capital: city.isCapital,
        level: city.level,
        population: city.population,
        rewards: [city.rewardLevel2, city.rewardLevel3],
        capacity: cityCapacity(city),
        counted: cityAssignedCountedUnitCount(state, city.id),
        exempt: cityAssignedExemptUnitCount(state, city.id),
      })),
    ).toEqual([
      {
        id: 1,
        at: { x: 20, y: 2 },
        capital: true,
        level: 3,
        population: 0,
        rewards: ["WORKSHOP", "CITY_WALL"],
        capacity: 3,
        counted: 3,
        exempt: 1,
      },
      {
        id: 7,
        at: { x: 17, y: 2 },
        capital: false,
        level: 3,
        population: 0,
        rewards: ["WORKSHOP", "CITY_WALL"],
        capacity: 3,
        counted: 4,
        exempt: 0,
      },
    ]);
    expect(
      state.board.tiles
        .filter((tile) => tile.territoryCityId === 7)
        .map((tile) => tile.at),
    ).toHaveLength(9);
    expect(
      state.board.tiles.find((tile) => tile.at.x === 17 && tile.at.y === 2),
    ).toMatchObject({ site: "CITY", territoryCityId: 7 });
    expect(
      state.units
        .filter((unit) => unit.ownerId === human.id)
        .map((unit) => ({
          id: unit.id,
          home: unit.homeCityId,
          type: unit.type,
          at: unit.at,
          ready: unit.ready,
          capacityExempt: unit.capacityExempt,
        })),
    ).toEqual([
      {
        id: 2,
        home: 1,
        type: "WARRIOR",
        at: { x: 20, y: 2 },
        ready: true,
        capacityExempt: true,
      },
      {
        id: 8,
        home: 1,
        type: "ARCHER",
        at: { x: 19, y: 1 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 9,
        home: 1,
        type: "DEFENDER",
        at: { x: 20, y: 1 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 10,
        home: 1,
        type: "RIDER",
        at: { x: 21, y: 1 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 11,
        home: 7,
        type: "WARRIOR",
        at: { x: 17, y: 2 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 12,
        home: 7,
        type: "ARCHER",
        at: { x: 16, y: 1 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 13,
        home: 7,
        type: "DEFENDER",
        at: { x: 17, y: 1 },
        ready: true,
        capacityExempt: false,
      },
      {
        id: 14,
        home: 7,
        type: "RIDER",
        at: { x: 18, y: 1 },
        ready: true,
        capacityExempt: false,
      },
    ]);
    const view = viewFor(state, human.id);
    const commands = queryPlayerCommands(view).map(({ command }) => command);
    for (const unit of state.units.filter(
      (unit) => unit.ownerId === human.id,
    )) {
      expect(
        commands.some(
          (command) => command.kind === "MOVE" && command.unitId === unit.id,
        ),
      ).toBe(true);
      expect(
        buildRenderPlan(
          view,
          { kind: "UNIT", unitId: unit.id },
          null,
        ).entries.some((entry) => entry.kind === "MOVE_TARGET"),
      ).toBe(true);
    }
  });

  it("keeps absent-scenario STANDARD bytes stable and rejects every noncanonical setup shape", () => {
    const standard = createGame(setupBuilder());
    if (!standard.ok) throw new Error(standard.error.code);
    expect(standard.state.setup).not.toHaveProperty("scenario");
    expect(canonicalHash(standard.state)).toBe(
      "c3569de5a49954b3ae586a137407e3513ceda5c07bc0bc5449486f780013452e",
    );
    expect(parseMatchSetup(DEMO_MATCH_SETUP)).toEqual(DEMO_MATCH_SETUP);
    for (const candidate of [
      { ...DEMO_MATCH_SETUP, scenario: "SANDBOX" },
      { ...DEMO_MATCH_SETUP, scenario: undefined },
      { ...DEMO_MATCH_SETUP, seed: 0 },
      { ...DEMO_MATCH_SETUP, humanColor: "TEAL" },
      {
        ...DEMO_MATCH_SETUP,
        factions: ["CANDY", "ORIGINAL", "ORIGINAL"],
      },
      { ...DEMO_MATCH_SETUP, extra: true },
    ]) {
      expect(parseMatchSetup(candidate)).toBeNull();
      expect(createGame(candidate as unknown as MatchSetup)).toMatchObject({
        ok: false,
        error: { code: "INVALID_SETUP" },
      });
    }
  });
});

describe("demo replay, save, headless, and controller boundaries", () => {
  it("reconstructs the initial and accepted-command boundaries through replay", () => {
    const created = createGame(DEMO_MATCH_SETUP);
    if (!created.ok) throw new Error(created.error.code);
    const initialReplay = createReplay(DEMO_MATCH_SETUP);
    expect(runReplay(initialReplay).stateHash).toBe(DEMO_INITIAL_HASH);
    const human = created.state.players.find(
      (player) => player.controller === "HUMAN",
    );
    if (human === undefined) throw new Error("Missing human");
    const move = queryPlayerCommands(viewFor(created.state, human.id))
      .map(({ command }) => command)
      .find(
        (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === 2,
      );
    if (move === undefined) throw new Error("Missing demo move");
    const applied = applyCommand(created.state, move);
    if (!applied.ok) throw new Error(applied.error.code);
    const replay = appendReplayCommand(initialReplay, move, applied.state);
    const replayed = runReplay(replay);
    expect(replayed.state).toEqual(applied.state);
    expect(replayed.stateHash).toBe(canonicalHash(applied.state));
    expect(() =>
      runReplay({
        ...initialReplay,
        setup: { ...DEMO_MATCH_SETUP, scenario: "UNKNOWN" },
      } as unknown as typeof initialReplay),
    ).toThrowError(ReplayError);
  });

  it("round-trips the exact demo through v5 autosave and rejects scenario tampering", () => {
    const created = createGame(DEMO_MATCH_SETUP);
    if (!created.ok) throw new Error(created.error.code);
    const envelope = createSaveEnvelope(
      {
        state: created.state,
        replay: createReplay(DEMO_MATCH_SETUP),
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: created.state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-15T14:00:00.000Z",
    );
    expect(envelope.version).toBe(5);
    expect(envelope.stateHash).toBe(DEMO_INITIAL_HASH);
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") throw new Error("Demo save did not load");
    expect(loaded.save.setup).toEqual(DEMO_MATCH_SETUP);
    expect(canonicalHash(loaded.save.state)).toBe(DEMO_INITIAL_HASH);
    expect(
      parseSave(
        JSON.stringify({
          ...envelope,
          setup: { ...envelope.setup, scenario: "UNKNOWN" },
        }),
      ).kind,
    ).toBe("CORRUPT");
  });

  it("exposes a direct headless launch and deterministic Normal-policy advance", async () => {
    const created = await headless.createDemo();
    if (!created.ok) throw new Error(created.error.code);
    expect(canonicalHash(created.state)).toBe(DEMO_INITIAL_HASH);
    expect(demoScenarioIssues(created.state)).toEqual([]);
    const first = runAiMatch(DEMO_MATCH_SETUP, {
      maxCommands: 1,
      maxRounds: 5,
    });
    const second = runAiMatch(DEMO_MATCH_SETUP, {
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.acceptedCommands).toBe(1);
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
  });

  it("launches, autosaves, resumes, and restarts demo through the controller", () => {
    const storage = new MemoryStorage();
    const controller = new AppController({
      initialRoute: "HUB",
      storage,
      aiStepDelayMs: 100_000,
      persistenceNow: () => "2026-08-15T14:00:00.000Z",
    });
    controller.requestDemoMatch();
    expect(controller.snapshot().overlay).toEqual({
      name: "CONFIRM",
      action: { kind: "START_DEMO" },
    });
    controller.confirm();
    expect(controller.snapshot().route).toBe("MATCH");
    expect(canonicalHash(controller.snapshot().match)).toBe(DEMO_INITIAL_HASH);
    expect(parseSave(storage.getItem(SAVE_STORAGE_KEY) ?? "").kind).toBe(
      "VALID",
    );
    controller.exitToHub();
    controller.resumeMatch();
    expect(canonicalHash(controller.snapshot().match)).toBe(DEMO_INITIAL_HASH);
    controller.openConfirmation({ kind: "RESTART" });
    controller.confirm();
    expect(controller.snapshot().match?.setup).toEqual(DEMO_MATCH_SETUP);
    expect(canonicalHash(controller.snapshot().match)).toBe(DEMO_INITIAL_HASH);
    controller.destroy();
  });

  it("requires the same replacement confirmation when a current save exists", () => {
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: requireCreated(setupBuilder()),
      storage: null,
      aiStepDelayMs: 100_000,
    });
    controller.navigate("HUB");
    controller.requestDemoMatch();
    expect(controller.snapshot().match?.setup.scenario).toBeUndefined();
    expect(controller.snapshot().overlay).toMatchObject({
      name: "CONFIRM",
      action: { kind: "START_DEMO" },
    });
    controller.confirm();
    expect(controller.snapshot().match?.setup.scenario).toBe("DEMO");
    controller.destroy();
  });

  it("plays the exact demo setup again from its result route", () => {
    const initial = requireCreated(DEMO_MATCH_SETUP);
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    if (human === undefined) throw new Error("Missing human");
    const completed: GameState = {
      ...initial,
      outcome: { kind: "VICTORY", winnerId: human.id },
    };
    const controller = new AppController({
      initialRoute: "RESULT",
      initialMatch: completed,
      storage: null,
      aiStepDelayMs: 100_000,
    });
    controller.openConfirmation({ kind: "PLAY_AGAIN" });
    controller.confirm();
    expect(controller.snapshot().route).toBe("MATCH");
    expect(controller.snapshot().match?.setup).toEqual(DEMO_MATCH_SETUP);
    expect(canonicalHash(controller.snapshot().match)).toBe(DEMO_INITIAL_HASH);
    controller.destroy();
  });
});

function requireCreated(setup: MatchSetup) {
  const created = createGame(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
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
