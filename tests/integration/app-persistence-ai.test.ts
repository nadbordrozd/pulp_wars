import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppController,
  COMBAT_PRESENTATION_TIMING,
} from "../../src/app/controller";
import {
  RULESET_ID,
  applyCommand,
  canonicalHash,
  createGame,
  queryPlayerCommands,
  viewFor,
  type Command,
  type GameState,
  type MatchSetup,
  type UnitState,
} from "../../src/engine/index";
import {
  SAVE_STORAGE_KEY,
  parseSave,
  type StorageAdapter,
} from "../../src/persistence/index";
import { captureReadyStateBuilder } from "../fixtures/builders";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("application save and AI integration", () => {
  it("presents accepted human combat after committing the exact authoritative boundary", () => {
    const initial = meaningfulActionState("ATTACK");
    const controller = controllerFor(initial);
    const attack = offeredCommands(controller.snapshot().view).find(
      (command): command is Extract<Command, { readonly kind: "ATTACK" }> =>
        command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("Missing attack");
    const expected = applyCommand(initial, attack);
    if (!expected.ok) throw new Error(expected.error.code);

    controller.requestCommand(attack);
    const contact = controller.snapshot();
    expect(contact.overlay).toEqual({ name: "NONE" });
    expect(canonicalHash(contact.match)).toBe(canonicalHash(expected.state));
    expect(contact.match?.commandIndex).toBe(initial.commandIndex + 1);
    expect(contact.combatPresentation).toMatchObject({
      phase: "CONTACT",
      motion: "FULL",
      damageToDefender: expect.any(Number),
    });
    expect(contact.announcement).toContain("dealt");
    expect(controller.dispatch({ kind: "END_TURN" })).toBe(false);

    vi.advanceTimersByTime(COMBAT_PRESENTATION_TIMING.contactNormalMs - 1);
    expect(controller.snapshot().combatPresentation?.phase).toBe("CONTACT");
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().combatPresentation?.phase).toBe("IMPACT");
    vi.advanceTimersByTime(COMBAT_PRESENTATION_TIMING.impactNormalMs);
    expect(controller.snapshot().combatPresentation).toBeNull();
    expect(canonicalHash(controller.snapshot().match)).toBe(
      canonicalHash(expected.state),
    );
    controller.requestCommand(attack);
    expect(controller.snapshot().match?.commandIndex).toBe(
      expected.state.commandIndex,
    );
    expect(controller.snapshot().assertiveAnnouncement).toBe(
      "That action is no longer available.",
    );
    controller.destroy();
  });

  it("uses a brief non-motion impact cue and cancels presentation on navigation", () => {
    const initial = meaningfulActionState("ATTACK");
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: initial,
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    const attack = offeredCommands(controller.snapshot().view).find(
      (command): command is Extract<Command, { readonly kind: "ATTACK" }> =>
        command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("Missing attack");
    expect(controller.dispatch(attack)).toBe(true);
    expect(controller.snapshot().combatPresentation).toMatchObject({
      phase: "IMPACT",
      motion: "REDUCED",
      phaseDurationMs: COMBAT_PRESENTATION_TIMING.reducedImpactMs,
    });
    controller.navigate("HUB");
    expect(controller.snapshot().combatPresentation).toBeNull();
    const boundary = canonicalHash(controller.snapshot().match);
    vi.advanceTimersByTime(1_000);
    expect(canonicalHash(controller.snapshot().match)).toBe(boundary);
    controller.destroy();
  });

  it("keeps a defeated unit available only to the transient death effect", () => {
    const base = meaningfulActionState("ATTACK");
    const human = base.players.find((player) => player.controller === "HUMAN");
    const defender = base.units.find((unit) => unit.ownerId !== human?.id);
    if (defender === undefined) throw new Error("Missing defender");
    const initial: GameState = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === defender.id ? { ...unit, hp: 1 } : unit,
      ),
    };
    const controller = controllerFor(initial);
    const attack = offeredCommands(controller.snapshot().view).find(
      (command): command is Extract<Command, { readonly kind: "ATTACK" }> =>
        command.kind === "ATTACK" &&
        command.target.kind === "UNIT" &&
        command.target.unitId === defender.id,
    );
    if (attack === undefined) throw new Error("Missing lethal attack");
    expect(controller.dispatch(attack)).toBe(true);
    expect(controller.snapshot().view?.units).not.toContainEqual(
      expect.objectContaining({ id: defender.id }),
    );
    expect(controller.snapshot().combatPresentation).toMatchObject({
      defender: { id: defender.id, hp: 1 },
      defenderDies: true,
    });
    controller.destroy();
  });

  it("safely cancels combat timers on restart and destroy", () => {
    const initial = meaningfulActionState("ATTACK");
    const restarted = controllerFor(initial);
    const attack = offeredCommands(restarted.snapshot().view).find(
      (command) => command.kind === "ATTACK",
    );
    if (attack === undefined) throw new Error("Missing attack");
    expect(restarted.dispatch(attack)).toBe(true);
    const oldInstance = restarted.snapshot().matchInstanceId;
    restarted.openConfirmation({ kind: "RESTART" });
    expect(restarted.snapshot().combatPresentation).toBeNull();
    restarted.confirm();
    const restartBoundary = canonicalHash(restarted.snapshot().match);
    expect(restarted.snapshot().matchInstanceId).toBe(oldInstance + 1);
    vi.advanceTimersByTime(1_000);
    expect(canonicalHash(restarted.snapshot().match)).toBe(restartBoundary);
    restarted.destroy();

    const destroyed = controllerFor(initial);
    expect(destroyed.dispatch(attack)).toBe(true);
    const destroyedBoundary = canonicalHash(destroyed.snapshot().match);
    destroyed.destroy();
    vi.runAllTimers();
    expect(canonicalHash(destroyed.snapshot().match)).toBe(destroyedBoundary);
    expect(destroyed.snapshot().combatPresentation).toBeNull();
  });

  it("paces visible AI combat but Fast Forward suppresses queued presentation", () => {
    const humanAttack = meaningfulActionState("ATTACK");
    const human = humanAttack.players.find(
      (player) => player.controller === "HUMAN",
    );
    const attacker = humanAttack.units.find(
      (unit) => unit.ownerId !== human?.id,
    );
    const defender = humanAttack.units.find(
      (unit) => unit.ownerId === human?.id,
    );
    if (human === undefined || attacker === undefined || defender === undefined)
      throw new Error("Missing AI combatants");
    const aiSeat = humanAttack.turnOrder.findIndex(
      (playerId) => playerId === attacker.ownerId,
    );
    const aiAttackState: GameState = {
      ...humanAttack,
      activeSeatIndex: aiSeat,
      players: humanAttack.players.map((player) =>
        player.id === attacker.ownerId
          ? {
              ...player,
              explored: [
                ...player.explored,
                ...[attacker.at, defender.at].filter(
                  (at) =>
                    !player.explored.some((known) => sameCoord(known, at)),
                ),
              ],
            }
          : player,
      ),
      units: humanAttack.units.map((unit) =>
        unit.id === attacker.id
          ? { ...unit, ready: true, activation: freshActivation() }
          : unit.id === defender.id
            ? { ...unit, ready: true, activation: freshActivation() }
            : unit,
      ),
    };
    const chooseAttackThenEnd = (
      view: NonNullable<ReturnType<AppController["snapshot"]>["view"]>,
    ) => {
      const attack = offeredCommands(view).find(
        (command) => command.kind === "ATTACK",
      );
      return {
        difficulty: "NORMAL" as const,
        candidates: [],
        command: attack ?? ({ kind: "END_TURN" } as const),
        prngDraws: 0 as const,
      };
    };
    expect(
      offeredCommands(viewFor(aiAttackState, attacker.ownerId)).map(
        (command) => command.kind,
      ),
    ).toContain("ATTACK");

    const paced = new AppController({
      initialRoute: "MATCH",
      initialMatch: aiAttackState,
      storage: null,
      aiStepDelayMs: 10,
      chooseAiCommand: chooseAttackThenEnd,
    });
    vi.advanceTimersByTime(10);
    expect(paced.snapshot().combatPresentation?.phase).toBe("CONTACT");
    vi.advanceTimersByTime(COMBAT_PRESENTATION_TIMING.contactNormalMs);
    expect(paced.snapshot().combatPresentation?.phase).toBe("IMPACT");
    vi.advanceTimersByTime(COMBAT_PRESENTATION_TIMING.impactNormalMs + 10);
    expect(paced.snapshot().combatPresentation).toBeNull();
    expect(activeController(paced.snapshot().match)).toBe("HUMAN");
    const pacedBoundary = canonicalHash(paced.snapshot().match);

    const fast = new AppController({
      initialRoute: "MATCH",
      initialMatch: aiAttackState,
      storage: null,
      aiStepDelayMs: 10,
      chooseAiCommand: chooseAttackThenEnd,
    });
    fast.fastForwardAi();
    expect(fast.snapshot().combatPresentation).toBeNull();
    expect(activeController(fast.snapshot().match)).toBe("HUMAN");
    expect(canonicalHash(fast.snapshot().match)).toBe(pacedBoundary);
    paced.destroy();
    fast.destroy();
  });
  it.each([
    ["WAIT", () => meaningfulActionState("MOVE")],
    ["TRAIN", () => affordableTrainingState()],
    ["CAPTURE", () => meaningfulActionState("CAPTURE")],
  ] as const)(
    "dispatches End Turn immediately while an offered %s opportunity remains",
    (kind, buildState) => {
      const state = buildState();
      const controller = controllerFor(state);
      const offered = offeredCommands(controller.snapshot().view);
      expect(offered).toContainEqual(expect.objectContaining({ kind }));
      expect(offered).toContainEqual({ kind: "END_TURN" });

      controller.requestCommand({ kind: "END_TURN" });

      expect(controller.snapshot().overlay).toEqual({ name: "NONE" });
      expect(controller.snapshot().match?.commandIndex).toBe(
        state.commandIndex + 1,
      );
      expect(controller.snapshot().match?.activeSeatIndex).not.toBe(
        state.activeSeatIndex,
      );
      controller.destroy();
    },
  );

  it("keeps End Turn unavailable while a mandatory city reward is pending", () => {
    const initial = humanTurnState(created(setup({ seed: 1 })));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (city === undefined) throw new Error("Missing human city");
    const pending: GameState = {
      ...initial,
      cities: initial.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, level: 2 } : candidate,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    const controller = controllerFor(pending);

    expect(offeredCommands(controller.snapshot().view)).not.toContainEqual({
      kind: "END_TURN",
    });
    expect(controller.snapshot().overlay).toEqual({
      name: "REWARD",
      cityId: city.id,
    });
    controller.requestCommand({ kind: "END_TURN" });
    expect(controller.snapshot().match?.commandIndex).toBe(
      pending.commandIndex,
    );
    expect(controller.snapshot().match?.activeSeatIndex).toBe(
      pending.activeSeatIndex,
    );
    controller.destroy();
  });

  it("changes presentation identity only when recreating the match", () => {
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: created(setup({ seed: 2 })),
      storage: null,
      aiStepDelayMs: 100_000,
    });
    const initialId = controller.snapshot().matchInstanceId;
    const view = controller.snapshot().view;
    if (view === null) throw new Error("Missing view");
    const command = queryPlayerCommands(view)
      .map(({ command: candidate }) => candidate)
      .find((candidate) => candidate.kind === "RESEARCH");
    if (command === undefined) throw new Error("Missing command");
    expect(controller.dispatch(command)).toBe(true);
    expect(controller.snapshot().matchInstanceId).toBe(initialId);
    controller.openConfirmation({ kind: "RESTART" });
    controller.confirm();
    expect(controller.snapshot().matchInstanceId).toBe(initialId + 1);
    expect(controller.snapshot().match?.commandIndex).toBe(0);
    controller.destroy();
  });

  it("researches immediately from Technology and rejects a stale repeat in place", () => {
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: created(setup({ seed: 2 })),
      storage: null,
      aiStepDelayMs: 100_000,
    });
    const before = controller.snapshot();
    const command = offeredCommands(before.view).find(
      (
        candidate,
      ): candidate is Extract<Command, { readonly kind: "RESEARCH" }> =>
        candidate.kind === "RESEARCH",
    );
    if (command === undefined) throw new Error("Missing research command");
    const humanBefore = before.match?.players.find(
      (player) => player.controller === "HUMAN",
    );
    controller.openOverlay({ name: "TECH" });

    controller.requestCommand(command);

    const researched = controller.snapshot();
    const humanAfter = researched.match?.players.find(
      (player) => player.controller === "HUMAN",
    );
    expect(researched.overlay).toEqual({ name: "TECH" });
    expect(researched.match?.commandIndex).toBe(
      (before.match?.commandIndex ?? 0) + 1,
    );
    expect(humanAfter?.stars).toBe((humanBefore?.stars ?? 0) - 5);
    expect(humanAfter?.researchedTechs).toContain(command.tech);
    expect(researched.announcement).toBe(
      `${command.tech.charAt(0)}${command.tech.slice(1).toLowerCase()} researched.`,
    );

    controller.requestCommand(command);

    const rejected = controller.snapshot();
    expect(rejected.overlay).toEqual({ name: "TECH" });
    expect(rejected.match?.commandIndex).toBe(researched.match?.commandIndex);
    expect(rejected.assertiveAnnouncement).toBe(
      "That action is no longer available.",
    );
    expect(rejected.match).toBe(researched.match);
    controller.destroy();
  });

  it("restores settings, authoritative state, command log, and presentation metadata", () => {
    const storage = new MemoryStorage();
    const first = new AppController({
      initialRoute: "SETUP",
      storage,
      randomSeed: () => 2,
      aiStepDelayMs: 100_000,
      persistenceNow: () => "2026-08-14T12:00:00.000Z",
    });
    first.updateSettings({
      uiScale: 1.5,
      motion: "REDUCED",
      animationSpeed: "FAST",
      highContrast: true,
    });
    first.requestStartMatch();
    first.confirm();
    const view = first.snapshot().view;
    if (view === null) throw new Error("Missing human view");
    const command = queryPlayerCommands(view)
      .map(({ command: candidate }) => candidate)
      .find((candidate) => candidate.kind === "RESEARCH");
    if (command === undefined) throw new Error("Missing research command");
    first.requestCommand(command);
    first.flushPersistence();
    const expected = first.snapshot();
    expect(storage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();
    first.destroy();

    const resumed = new AppController({
      initialRoute: "HUB",
      storage,
      aiStepDelayMs: 100_000,
    });
    const loaded = resumed.snapshot();
    expect(loaded.settings).toEqual(expected.settings);
    expect(canonicalHash(loaded.match)).toBe(canonicalHash(expected.match));
    expect(loaded.tallies).toEqual(expected.tallies);
    expect(loaded.playerTallies).toEqual(expected.playerTallies);
    expect(loaded.savedAt).toBe("2026-08-14T12:00:00.000Z");
    resumed.resumeMatch();
    expect(resumed.snapshot().route).toBe("MATCH");
    resumed.destroy();
  });

  it("produces the identical authoritative state with paced and fast-forward AI presentation", () => {
    const initial = created(setup({ seed: 0 }));
    const pacedStorage = new MemoryStorage();
    const paced = new AppController({
      initialRoute: "MATCH",
      initialMatch: initial,
      storage: pacedStorage,
      aiStepDelayMs: 1,
    });
    vi.runAllTimers();
    paced.flushPersistence();
    const pacedState = paced.snapshot().match;
    expect(activeController(pacedState)).toBe("HUMAN");

    const fastStorage = new MemoryStorage();
    const fast = new AppController({
      initialRoute: "MATCH",
      initialMatch: initial,
      storage: fastStorage,
      aiStepDelayMs: 1,
    });
    fast.fastForwardAi();
    const fastState = fast.snapshot().match;
    expect(activeController(fastState)).toBe("HUMAN");
    expect(canonicalHash(fastState)).toBe(canonicalHash(pacedState));
    expect(fastState?.commandIndex).toBe(pacedState?.commandIndex);
    fast.flushPersistence();
    const pacedSave = parseSave(pacedStorage.getItem(SAVE_STORAGE_KEY) ?? "");
    const fastSave = parseSave(fastStorage.getItem(SAVE_STORAGE_KEY) ?? "");
    expect(pacedSave.kind).toBe("VALID");
    expect(fastSave.kind).toBe("VALID");
    if (pacedSave.kind === "VALID" && fastSave.kind === "VALID") {
      expect(fastSave.save.acceptedCommands).toEqual(
        pacedSave.save.acceptedCommands,
      );
      expect(fastSave.save.stateHash).toBe(pacedSave.save.stateHash);
    }
    paced.destroy();
    fast.destroy();
  });

  it("resets the wired browser AI budget over consecutive human and AI turns", () => {
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: created(setup({ seed: 0 })),
      storage: null,
      aiStepDelayMs: 100_000,
      chooseAiCommand: () => ({
        difficulty: "NORMAL",
        candidates: [],
        command: { kind: "END_TURN" },
        prngDraws: 0,
      }),
    });
    let completedAiTurns = 0;
    let attempts = 0;
    while (completedAiTurns < 3 && attempts < 8) {
      const snapshot = controller.snapshot();
      const view = snapshot.view;
      if (view === null) throw new Error("Missing player view");
      const activeId = view.turnOrder[view.activeSeatIndex];
      const active = view.players.find((player) => player.id === activeId);
      if (active?.controller === "AI") {
        controller.fastForwardAi();
        completedAiTurns += 1;
      } else {
        if (!controller.dispatch({ kind: "END_TURN" }))
          throw new Error("Human End Turn was rejected");
      }
      const overlay = controller.snapshot().overlay;
      if (overlay.name === "AI_ERROR") throw new Error(overlay.diagnostic);
      attempts += 1;
    }
    expect(completedAiTurns).toBe(3);
    expect(attempts).toBeLessThan(8);
    controller.destroy();
  });

  it("cancels queued AI work across overlays and destroy", () => {
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: created(setup({ seed: 0 })),
      storage: null,
      aiStepDelayMs: 10,
    });
    const before = canonicalHash(controller.snapshot().match);
    controller.openOverlay({ name: "SETTINGS", from: "MATCH" });
    vi.runAllTimers();
    expect(canonicalHash(controller.snapshot().match)).toBe(before);
    controller.closeOverlay();
    controller.destroy();
    vi.runAllTimers();
    expect(canonicalHash(controller.snapshot().match)).toBe(before);
  });

  it("preserves corrupt saves for actionable recovery and deletes only after confirmation", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, "{broken");
    const controller = new AppController({ initialRoute: "HUB", storage });
    expect(controller.snapshot().saveRecovery?.kind).toBe("CORRUPT");
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe("{broken");
    controller.inspectSaveRecovery();
    expect(controller.snapshot().overlay.name).toBe("SAVE_RECOVERY");
    controller.closeOverlay();
    controller.openConfirmation({ kind: "DELETE_SAVE" });
    controller.confirm();
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(controller.snapshot().saveRecovery).toBeNull();
    controller.destroy();
  });

  it("does not expose a pending reward over the Hub and restores it on Resume", () => {
    const initial = created(setup());
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (city === undefined) throw new Error("Missing city");
    const pending: GameState = {
      ...initial,
      cities: initial.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, level: 2 } : candidate,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    const controller = new AppController({
      initialRoute: "HUB",
      initialMatch: pending,
      storage: null,
    });
    expect(controller.snapshot().overlay.name).toBe("NONE");
    controller.resumeMatch();
    expect(controller.snapshot().overlay).toEqual({
      name: "REWARD",
      cityId: city.id,
    });
    controller.destroy();
  });

  it("keeps the match installed when deleting Storage fails", () => {
    const storage: StorageAdapter = {
      getItem(): string | null {
        return null;
      },
      setItem(): void {},
      removeItem(): void {
        throw new Error("denied");
      },
    };
    const controller = new AppController({
      initialRoute: "MATCH",
      initialMatch: created(setup()),
      storage,
    });
    controller.openConfirmation({ kind: "DELETE_SAVE" });
    controller.confirm();
    expect(controller.snapshot().match).not.toBeNull();
    expect(controller.snapshot().saveWarning).toContain("denied");
    controller.destroy();
  });

  it("stops policy failures at a saved boundary and restores that boundary on retry", () => {
    const storage = new MemoryStorage();
    const controller = new AppController({
      initialRoute: "SETUP",
      storage,
      randomSeed: () => 0,
      aiStepDelayMs: 1,
      chooseAiCommand: () => {
        throw new Error("policy exploded");
      },
    });
    controller.requestStartMatch();
    controller.confirm();
    const boundary = canonicalHash(controller.snapshot().match);
    vi.advanceTimersByTime(1);
    expect(controller.snapshot().overlay).toMatchObject({ name: "AI_ERROR" });
    expect(canonicalHash(controller.snapshot().match)).toBe(boundary);
    controller.retryAi();
    expect(controller.snapshot().overlay.name).toBe("NONE");
    expect(canonicalHash(controller.snapshot().match)).toBe(boundary);
    controller.destroy();
  });
});

function setup(overrides: Partial<MatchSetup> = {}): MatchSetup {
  const aiCount = overrides.aiCount ?? 1;
  return {
    rulesetId: RULESET_ID,
    seed: 1,
    width: 11,
    height: 11,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    ...overrides,
    factions:
      overrides.factions ??
      Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
  };
}

function created(matchSetup: MatchSetup): GameState {
  const result = createGame(matchSetup);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function activeController(state: GameState | null): "HUMAN" | "AI" | null {
  if (state === null) return null;
  const activeId = state.turnOrder[state.activeSeatIndex];
  return (
    state.players.find((player) => player.id === activeId)?.controller ?? null
  );
}

function controllerFor(state: GameState): AppController {
  return new AppController({
    initialRoute: "MATCH",
    initialMatch: state,
    storage: null,
    aiStepDelayMs: 100_000,
  });
}

function offeredCommands(
  view: ReturnType<AppController["snapshot"]>["view"],
): readonly Command[] {
  return view === null
    ? []
    : queryPlayerCommands(view).map(({ command }) => command);
}

function humanTurnState(state: GameState): GameState {
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) throw new Error("Missing human player");
  const activeSeatIndex = state.turnOrder.indexOf(human.id);
  if (activeSeatIndex < 0) throw new Error("Human is absent from turn order");
  return { ...state, activeSeatIndex };
}

function blockedHumanState(state: GameState): GameState {
  const humanTurn = humanTurnState(state);
  const human = humanTurn.players.find(
    (player) => player.controller === "HUMAN",
  );
  const unit = humanTurn.units.find(
    (candidate) => candidate.ownerId === human?.id,
  );
  if (human === undefined || unit === undefined)
    throw new Error("Missing human fixture context");
  const neighbors = humanTurn.board.tiles.filter(
    (tile) =>
      Math.max(
        Math.abs(tile.at.x - unit.at.x),
        Math.abs(tile.at.y - unit.at.y),
      ) === 1,
  );
  return {
    ...humanTurn,
    players: humanTurn.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            stars: 0,
            explored: [
              ...player.explored,
              ...neighbors
                .map((tile) => tile.at)
                .filter(
                  (at) =>
                    !player.explored.some(
                      (known) => known.x === at.x && known.y === at.y,
                    ),
                ),
            ],
          }
        : player,
    ),
    board: {
      ...humanTurn.board,
      tiles: humanTurn.board.tiles.map((tile) =>
        neighbors.includes(tile)
          ? { ...tile, terrain: "MOUNTAIN", resource: null }
          : tile,
      ),
    },
  };
}

function replaceHumanUnit(
  state: GameState,
  update: (unit: UnitState) => UnitState,
): GameState {
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) throw new Error("Missing human player");
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === human.id ? update(unit) : unit,
    ),
  };
}

function meaningfulActionState(kind: Command["kind"]): GameState {
  const original = humanTurnState(created(setup({ seed: 1 })));
  if (kind === "MOVE") {
    return {
      ...original,
      players: original.players.map((player) =>
        player.controller === "HUMAN" ? { ...player, stars: 0 } : player,
      ),
    };
  }
  const blocked = blockedHumanState(original);
  const human = blocked.players.find((player) => player.controller === "HUMAN");
  const unit = blocked.units.find(
    (candidate) => candidate.ownerId === human?.id,
  );
  if (human === undefined || unit === undefined)
    throw new Error("Missing human fixture context");
  if (kind === "ATTACK") {
    const enemy = blocked.units.find(
      (candidate) => candidate.ownerId !== human.id,
    );
    const destination = blocked.board.tiles.find(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - unit.at.x),
          Math.abs(tile.at.y - unit.at.y),
        ) === 1,
    );
    if (enemy === undefined || destination === undefined)
      throw new Error("Missing attack fixture context");
    return {
      ...blocked,
      units: blocked.units.map((candidate) =>
        candidate.id === enemy.id
          ? { ...candidate, at: destination.at }
          : candidate,
      ),
    };
  }
  if (kind === "ESCAPE_MOVE") {
    const destination = blocked.board.tiles.find(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - unit.at.x),
          Math.abs(tile.at.y - unit.at.y),
        ) === 1 &&
        !blocked.units.some((candidate) => sameCoord(candidate.at, tile.at)),
    );
    if (destination === undefined)
      throw new Error("Missing escape destination");
    return {
      ...replaceHumanUnit(blocked, (candidate) => ({
        ...candidate,
        type: "RIDER",
        activation: {
          ...candidate.activation,
          attacked: true,
          escapeAvailable: true,
          specialActed: false,
        },
      })),
      board: {
        ...blocked.board,
        tiles: blocked.board.tiles.map((tile) =>
          tile.at.x === destination.at.x && tile.at.y === destination.at.y
            ? { ...tile, terrain: "GRASS" }
            : tile,
        ),
      },
    };
  }
  if (kind === "RECOVER") {
    return replaceHumanUnit(blocked, (candidate) => ({
      ...candidate,
      hp: candidate.maxHp - 1,
    }));
  }
  if (kind === "PROMOTE") {
    return replaceHumanUnit(blocked, (candidate) => ({
      ...candidate,
      kills: 3,
      ready: false,
    }));
  }
  if (kind === "CAPTURE") return captureReadyStateBuilder(1, original);
  throw new Error(`Unsupported meaningful command fixture: ${kind}`);
}

function affordableTrainingState(): GameState {
  const original = humanTurnState(created(setup({ seed: 1 })));
  const human = original.players.find(
    (player) => player.controller === "HUMAN",
  );
  if (human === undefined) throw new Error("Missing human player");
  return {
    ...original,
    players: original.players.map((player) =>
      player.id === human.id ? { ...player, stars: 20 } : player,
    ),
    units: original.units.filter((unit) => unit.ownerId !== human.id),
  };
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

function freshActivation(): UnitState["activation"] {
  return {
    moved: false,
    attacked: false,
    recovered: false,
    captured: false,
    handled: false,
    escapeAvailable: false,
    specialActed: false,
  };
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
