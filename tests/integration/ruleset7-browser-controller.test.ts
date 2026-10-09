import { describe, expect, it } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AiProgressScheduler,
  type Ruleset7BrowserSnapshot,
  type Ruleset7PolicyWork,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  queryPlayerCommandsV7,
  type CommandV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  SAVE_STORAGE_KEY_V7,
  parseSaveV7,
  type PersistenceScheduler,
  type StorageAdapter,
} from "../../src/persistence/index";
import {
  immediateEndTurnWork,
  endTurnDecision,
  decisionV7,
  MemoryStorage,
} from "./ruleset7-browser-controller.shared";

describe("Ruleset 7 browser controller", () => {
  it("rejects malformed and decorated runtime commands without changing the offered boundary", async () => {
    const controller = new Ruleset7BrowserController();
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const before = controller.snapshot();
    const move = requireCommand(before, "MOVE");
    for (const command of [
      null,
      { kind: "MOVE", unitId: 1, path: [] },
      { ...move, unexpected: true },
    ]) {
      expect(await controller.dispatch(command as CommandV7)).toMatchObject({
        accepted: false,
        reason: "NOT_OFFERED",
      });
    }
    expect(controller.snapshot().view).toBe(before.view);
    expect(await controller.dispatch(move)).toMatchObject({
      accepted: true,
      beforeView: before.view,
    });
    controller.destroy();
  });

  it("installs command zero with the exact AI-first 5/3 boundary and autosave", async () => {
    const storage = new MemoryStorage();
    const controller = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => "2026-09-08T12:00:00.000Z",
      createAiPolicyWork: immediateEndTurnWork,
    });
    // Seed 2: the AI moves first on its village-density map (`pulp_wars-ykw.2`;
    // seed 0 did before).
    const launched = await controller.launch(setupV7(2, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const snapshot = controller.snapshot();
    expect(snapshot).toMatchObject({
      phase: "ACTIVE",
      transitioning: false,
      view: {
        commandIndex: 0,
        viewer: { id: 1, coins: 3 },
        turnOrder: [2, 1],
      },
    });
    expect(launched.playerEvents).toMatchObject({
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: 1,
      commandIndex: 0,
    });
    expect(player(snapshot.view, 2)).not.toHaveProperty("coins");
    const stored = storage.getItem(SAVE_STORAGE_KEY_V7);
    if (stored === null) throw new Error("initial autosave missing");
    const parsed = parseSaveV7(stored);
    expect(parsed.kind).toBe("VALID");
    if (parsed.kind !== "VALID") throw new Error(parsed.diagnostic);
    expect(parsed.save.state.players.map((item) => item.coins)).toEqual([3, 5]);
    controller.destroy();
  });

  it("persists policy work across event-loop slices, accepts at most one command per callback, and projects only to the human", async () => {
    const scheduler = manualScheduler();
    const policyViewerIds: number[] = [];
    const publicSnapshots: Ruleset7BrowserSnapshot[] = [];
    let clock = 0;
    const controller = new Ruleset7BrowserController({
      aiProgressScheduler: scheduler.schedule,
      policyReadClock: () => clock,
      createAiPolicyWork: (view) => {
        policyViewerIds.push(view.viewer.id);
        let first = true;
        return {
          runSlice() {
            if (first) {
              first = false;
              return null;
            }
            return endTurnDecision(view);
          },
        };
      },
    });
    const unsubscribe = controller.subscribe((snapshot) => {
      publicSnapshots.push(snapshot);
      const safe = controller.exportSafeLog();
      if (safe !== null) {
        expect(JSON.parse(safe.source)).toMatchObject({
          log: { viewerId: snapshot.view?.humanPlayerId },
        });
      }
      if (snapshot.ai.active) clock += 3;
    });
    // Seed 9: the human moves last on its many-seats map (`pulp_wars-ykw.3`;
    // seed 2 did on the village-density map), so three AI turns run first.
    const launched = await controller.launch(setupV7(9, 3));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const progress = controller.progressAiTurns();
    await waitUntil(() => scheduler.activeCount() === 1);

    let priorIndex = requireView(controller.snapshot()).commandIndex;
    let callbacks = 0;
    while (scheduler.activeCount() > 0) {
      scheduler.runNext();
      callbacks += 1;
      await Promise.resolve();
      const nextIndex = requireView(controller.snapshot()).commandIndex;
      expect(nextIndex - priorIndex).toBeLessThanOrEqual(1);
      priorIndex = nextIndex;
    }
    const result = await progress;
    expect(result).toMatchObject({
      ok: true,
      acceptedCommands: 3,
      policySlices: 6,
    });
    if (!result.ok) throw new Error(result.diagnostic);
    expect(callbacks).toBe(7);
    expect(result.maximumSliceMilliseconds).toBeGreaterThanOrEqual(3);
    expect(result.view.viewer.id).toBe(result.view.humanPlayerId);
    expect(result.playerEventBatches).toHaveLength(3);
    expect(
      result.playerEventBatches.every(
        (batch) => batch.viewerId === result.view.humanPlayerId,
      ),
    ).toBe(true);
    expect(result).not.toHaveProperty("commands");
    expect(result).not.toHaveProperty("stateHash");
    // The seed-2 turn order runs the three AI seats as players 3, 2, 4.
    expect(policyViewerIds).toEqual([3, 2, 4]);
    expect(
      publicSnapshots
        .filter((snapshot) => snapshot.view !== null)
        .every(
          (snapshot) =>
            snapshot.view?.viewer.id === snapshot.view?.humanPlayerId,
        ),
    ).toBe(true);
    for (const snapshot of publicSnapshots) {
      for (const publicPlayer of snapshot.view?.players ?? []) {
        expect(publicPlayer).not.toHaveProperty("coins");
        expect(publicPlayer).not.toHaveProperty("researchedTechs");
        expect(publicPlayer).not.toHaveProperty("achievementEntitlements");
      }
    }
    unsubscribe();
    controller.destroy();
  });

  it("cancels a same-tick queued AI request before restart and ignores its stale callbacks", async () => {
    const scheduler = manualScheduler();
    const controller = new Ruleset7BrowserController({
      aiProgressScheduler: scheduler.schedule,
      createAiPolicyWork: immediateEndTurnWork,
    });
    // Seed 2: the AI moves first on its village-density map.
    const launched = await controller.launch(setupV7(2, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);

    const progress = controller.progressAiTurns();
    const restart = controller.restart();
    expect(await progress).toMatchObject({ ok: false, cancelled: true });
    expect(await restart).toMatchObject({
      ok: true,
      view: { commandIndex: 0, turnOrder: [2, 1] },
    });
    expect(scheduler.activeCount()).toBe(0);
    expect(requireView(controller.snapshot()).commandIndex).toBe(0);
    controller.destroy();
  });

  it("returns an accepted human boundary to the resumable menu without changing it", async () => {
    const storage = new MemoryStorage();
    const controller = new Ruleset7BrowserController({ storage });
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const dispatch = controller.dispatch(
      requireCommand(controller.snapshot(), "WAIT"),
    );
    const returning = controller.returnToMenu();
    expect(await dispatch).toMatchObject({ accepted: true });
    const boundary = requireView(controller.snapshot());

    expect(await returning).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { commandIndex: boundary.commandIndex },
      hasStoredSave: true,
    });
    expect(await controller.resume()).toBe(true);
    expect(requireView(controller.snapshot())).toEqual(boundary);
    controller.destroy();
  });

  it("serializes a same-tick menu request behind a pending launch", async () => {
    const controller = new Ruleset7BrowserController();
    const launch = controller.launch(setupV7(1, 1));
    const returning = controller.returnToMenu();
    expect(await launch).toMatchObject({ ok: true });
    expect(await returning).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { commandIndex: 0 },
    });
    controller.destroy();
  });

  it("cancels AI at its accepted prefix and ignores an already-issued stale callback", async () => {
    const storage = new MemoryStorage();
    let scheduled: (() => void) | null = null;
    const controller = new Ruleset7BrowserController({
      storage,
      aiProgressScheduler: (resume) => {
        scheduled = resume;
        return () => {};
      },
      createAiPolicyWork: (view) => immediateDecisionWork(view, "WAIT"),
    });
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    await dispatchKind(controller, "END_TURN");
    const progress = controller.progressAiTurns();
    await waitUntil(() => scheduled !== null);
    const firstScheduled = scheduled as unknown as (() => void) | null;
    if (firstScheduled === null) throw new Error("AI callback missing");
    firstScheduled();
    await waitUntil(
      () => requireView(controller.snapshot()).commandIndex === 2,
    );
    const stale = scheduled as unknown as (() => void) | null;
    const returned = controller.returnToMenu();
    expect(await progress).toMatchObject({
      ok: false,
      cancelled: true,
      acceptedCommands: 1,
    });
    expect(await returned).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { commandIndex: 2 },
    });
    stale?.();
    await Promise.resolve();
    expect(requireView(controller.snapshot()).commandIndex).toBe(2);
    expect(
      parseSaveV7(storage.getItem(SAVE_STORAGE_KEY_V7) ?? ""),
    ).toMatchObject({ kind: "VALID", save: { commandIndex: 2 } });
    controller.destroy();
  });

  it("keeps a queued accepted save when a replacement setup fails", async () => {
    const storage = new MemoryStorage();
    const saves = manualPersistenceScheduler();
    const controller = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => "2026-09-08T12:00:00.000Z",
      persistenceScheduler: saves.schedule,
    });
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const wait = requireCommand(controller.snapshot(), "WAIT");
    expect((await controller.dispatch(wait)).accepted).toBe(true);
    expect(saves.activeCount()).toBe(1);

    const invalid = {
      ...setupV7(9, 1),
      factions: ["NOT_A_FACTION", "NOT_A_FACTION"],
    } as unknown as MatchSetupV7;
    expect(
      await controller.launch(invalid, { replaceStoredMatch: true }),
    ).toMatchObject({ ok: false, code: "INVALID_SETUP" });
    expect(controller.flushPersistence()).toBe(true);
    const source = storage.getItem(SAVE_STORAGE_KEY_V7);
    if (source === null) throw new Error("accepted save missing");
    expect(parseSaveV7(source)).toMatchObject({
      kind: "VALID",
      save: { commandIndex: 1 },
    });
    controller.destroy();
  });

  it("restores the durable current-turn command count when AI resumes", async () => {
    const storage = new MemoryStorage();
    const firstScheduler = manualScheduler();
    const first = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => "2026-09-08T12:00:00.000Z",
      aiProgressScheduler: firstScheduler.schedule,
      createAiPolicyWork: (view) => immediateDecisionWork(view, "WAIT"),
    });
    const launched = await first.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    await dispatchKind(first, "END_TURN");
    const unsubscribe = first.subscribe((snapshot) => {
      if (snapshot.view?.commandIndex === 2) first.destroy();
    });
    const interrupted = first.progressAiTurns();
    await waitUntil(() => firstScheduler.activeCount() === 1);
    firstScheduler.runNext();
    expect(await interrupted).toMatchObject({ ok: false, cancelled: true });
    unsubscribe();

    const resumedCounts: number[] = [];
    const resumedScheduler = manualScheduler();
    const resumed = new Ruleset7BrowserController({
      storage,
      aiProgressScheduler: resumedScheduler.schedule,
      createAiPolicyWork: (view, acceptedCommandsThisTurn) => {
        resumedCounts.push(acceptedCommandsThisTurn);
        return immediateDecisionWork(view, "END_TURN");
      },
    });
    expect(resumed.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { commandIndex: 2, activeSeatIndex: 1, turnOrder: [1, 2] },
    });
    expect(await resumed.resume()).toBe(true);
    const progress = resumed.progressAiTurns();
    await waitUntil(() => resumedScheduler.activeCount() === 1);
    resumedScheduler.runNext();
    await waitUntil(() => resumedCounts.length === 1);
    expect(resumedCounts).toEqual([1]);
    resumed.destroy();
    expect(await progress).toMatchObject({ ok: false, cancelled: true });
  });

  it("round-trips a command-bearing mandatory reward without another Start Turn", async () => {
    const storage = new MemoryStorage();
    const controller = new Ruleset7BrowserController({
      storage,
      persistenceNow: () => "2026-09-08T12:00:00.000Z",
      createAiPolicyWork: immediateEndTurnWork,
      aiProgressScheduler: (resume) => {
        queueMicrotask(resume);
      },
    });
    // Seed 1: the human moves first and has Fertile Ground at its capital
    // on the many-seats board (`pulp_wars-ykw.3`; seed 3 before).
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    await dispatchKind(
      controller,
      "RESEARCH",
      (command) => command.kind === "RESEARCH" && command.tech === "GATHERING",
    );
    // `pulp_wars-if6`: a first turn has 5 Coins (7 before), so Farming (7)
    // waits for the second turn's income.
    await dispatchKind(controller, "END_TURN");
    const opened = await controller.progressAiTurns();
    if (!opened.ok) throw new Error(opened.diagnostic);
    await dispatchKind(
      controller,
      "RESEARCH",
      (command) => command.kind === "RESEARCH" && command.tech === "FARMING",
    );
    for (let round = 0; round < 4; round += 1) {
      await dispatchKind(controller, "END_TURN");
      const progressed = await controller.progressAiTurns();
      if (!progressed.ok) throw new Error(progressed.diagnostic);
    }
    await dispatchKind(controller, "BUILD_FARM");
    const boundary = requireView(controller.snapshot());
    expect(boundary.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
    });
    expect(await controller.returnToMenu()).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { pendingChoices: boundary.pendingChoices },
    });
    controller.destroy();

    const loaded = new Ruleset7BrowserController({ storage });
    expect(loaded.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: {
        commandIndex: boundary.commandIndex,
        round: boundary.round,
        pendingChoices: boundary.pendingChoices,
        viewer: { coins: boundary.viewer.coins },
      },
    });
    expect(await loaded.resume()).toBe(true);
    expect(requireView(loaded.snapshot()).pendingChoices).toEqual(
      boundary.pendingChoices,
    );
    loaded.destroy();
  });

  it("surfaces storage failures without losing the active public match", async () => {
    const controller = new Ruleset7BrowserController({
      storage: new WriteFailingStorage(),
      persistenceNow: () => "2026-09-08T12:00:00.000Z",
    });
    // Seed 44: the human moves first on its village-density map (seed 43 did
    // on revision 14).
    const launched = await controller.launch(setupV7(44, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    expect(controller.snapshot()).toMatchObject({
      phase: "ACTIVE",
      view: { commandIndex: 0 },
    });
    expect(controller.snapshot().saveWarning).toContain("write");
    const wait = requireCommand(controller.snapshot(), "WAIT");
    expect((await controller.dispatch(wait)).accepted).toBe(true);
    expect(requireView(controller.snapshot()).commandIndex).toBe(1);
    controller.destroy();
  });

  it("keeps the match active when menu persistence fails and allows a safe retry", async () => {
    const storage = new ToggleWriteStorage();
    const controller = new Ruleset7BrowserController({ storage });
    // Seed 44: the human moves first on its village-density map (seed 43 did
    // on revision 14).
    const launched = await controller.launch(setupV7(44, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    await dispatchKind(controller, "WAIT");
    const commandIndex = requireView(controller.snapshot()).commandIndex;
    storage.failWrites = true;

    expect(await controller.returnToMenu()).toBe(false);
    expect(controller.snapshot()).toMatchObject({
      phase: "ACTIVE",
      view: { commandIndex },
    });
    expect(controller.snapshot().saveWarning).toContain("write");

    storage.failWrites = false;
    expect(await controller.returnToMenu()).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      view: { commandIndex },
      saveWarning: null,
    });
    expect(await controller.resume()).toBe(true);
    expect(requireView(controller.snapshot()).commandIndex).toBe(commandIndex);
    controller.destroy();
  });

  it("keeps its event history mutable after exporting a player-safe log", async () => {
    const controller = new Ruleset7BrowserController();
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    const first = controller.exportSafeLog();
    if (first === null) throw new Error("safe log missing");
    expect(JSON.parse(first.source)).toMatchObject({
      log: {
        classification: "PLAYER_SAFE",
        eventBatches: [{ commandIndex: 0 }],
      },
    });

    expect(
      (await controller.dispatch(requireCommand(controller.snapshot(), "WAIT")))
        .accepted,
    ).toBe(true);
    const second = controller.exportSafeLog();
    if (second === null) throw new Error("updated safe log missing");
    expect(JSON.parse(second.source).log.eventBatches).toHaveLength(2);
    controller.destroy();
  });

  it("publishes each accepted public boundary once and isolates observer failures", async () => {
    const controller = new Ruleset7BrowserController({
      createAiPolicyWork: immediateEndTurnWork,
    });
    const observed: Array<{
      actor: "HUMAN" | "AI";
      commandIndex: number;
    }> = [];
    controller.subscribeAcceptedBoundary(() => {
      throw new Error("presentation observer failure");
    });
    const unsubscribe = controller.subscribeAcceptedBoundary((boundary) => {
      expect(Object.isFrozen(boundary)).toBe(true);
      expect(Object.isFrozen(boundary.beforeView)).toBe(true);
      expect(Object.isFrozen(boundary.afterView)).toBe(true);
      expect(Object.isFrozen(boundary.playerEvents)).toBe(true);
      expect(Object.isFrozen(boundary.playerEvents.events)).toBe(true);
      expect(boundary.beforeView.viewer.id).toBe(
        boundary.beforeView.humanPlayerId,
      );
      expect(boundary.afterView.viewer.id).toBe(
        boundary.afterView.humanPlayerId,
      );
      expect(boundary).not.toHaveProperty("command");
      expect(boundary).not.toHaveProperty("state");
      expect(boundary).not.toHaveProperty("stateHash");
      observed.push({
        actor: boundary.actor,
        commandIndex: boundary.afterView.commandIndex,
      });
    });
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    expect(
      (
        await controller.dispatch({
          kind: "ATTACK",
          unitId: 999_999 as UnitId,
          targetUnitId: 888_888 as UnitId,
        })
      ).accepted,
    ).toBe(false);
    expect(observed).toEqual([]);
    await dispatchKind(controller, "WAIT");
    await dispatchKind(controller, "END_TURN");
    const progress = await controller.progressAiTurns();
    expect(progress.ok).toBe(true);
    expect(observed.filter((entry) => entry.actor === "HUMAN")).toHaveLength(2);
    expect(observed.filter((entry) => entry.actor === "AI")).toHaveLength(1);
    unsubscribe();
    const prior = observed.length;
    await dispatchKind(controller, "WAIT");
    expect(observed).toHaveLength(prior);
    controller.destroy();
  });

  it("clears accepted-boundary subscribers on destroy", async () => {
    const controller = new Ruleset7BrowserController();
    let observed = 0;
    controller.subscribeAcceptedBoundary(() => {
      observed += 1;
    });
    controller.destroy();
    expect(await controller.launch(setupV7(1, 1))).toMatchObject({ ok: false });
    expect(observed).toBe(0);
  });
});

/**
 * Campaign progress (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md sections
 * 4.1 and 7.2): the controller records a chapter mission's win before any
 * subscriber (and so the Victory dialog) sees the outcome, and again when a
 * completed mission save is resumed.
 */
describe("Ruleset 7 browser controller campaign progress", () => {
  const savedAt = "2026-10-03T12:00:00.000Z";

  it("keeps the campaign key through save deletion", async () => {
    const storage = new MemoryStorage();
    const progress = JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 1,
      completed: { FRONTIER_1: { firstWonAt: savedAt, bestRounds: 12 } },
    });
    storage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7, progress);
    const controller = new Ruleset7BrowserController({ storage });
    const launched = await controller.launch(setupV7(1, 1));
    if (!launched.ok) throw new Error(launched.diagnostic);
    expect(await controller.deleteStoredSave()).toBe(true);
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(progress);
    controller.destroy();
  });
});

function setupV7(seed: number, aiCount: 1 | 2 | 3): MatchSetupV7 {
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    // pulp_wars-w5j.1: the browser launches only distinct factions.
    factions: distinctFactionsV7(aiCount + 1),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

function immediateDecisionWork<K extends CommandV7["kind"]>(
  view: PlayerViewV7,
  kind: K,
): Ruleset7PolicyWork {
  const command = queryPlayerCommandsV7(view).find(
    (candidate): candidate is Extract<CommandV7, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (command === undefined) throw new Error(`${kind} missing`);
  const decision = decisionV7(command);
  return { runSlice: () => decision };
}

function requireView(snapshot: Ruleset7BrowserSnapshot): PlayerViewV7 {
  if (snapshot.view === null) throw new Error("view missing");
  return snapshot.view;
}

function player(view: PlayerViewV7 | null, id: number): unknown {
  return view?.players.find((candidate) => candidate.id === id);
}

function requireCommand<K extends CommandV7["kind"]>(
  snapshot: Ruleset7BrowserSnapshot,
  kind: K,
): Extract<CommandV7, { readonly kind: K }> {
  const command = snapshot.offeredCommands.find(
    (candidate): candidate is Extract<CommandV7, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (command === undefined) throw new Error(`${kind} missing`);
  return command;
}

async function dispatchKind<K extends CommandV7["kind"]>(
  controller: Ruleset7BrowserController,
  kind: K,
  predicate: (command: CommandV7) => boolean = () => true,
): Promise<void> {
  const command = controller
    .snapshot()
    .offeredCommands.find(
      (candidate): candidate is Extract<CommandV7, { readonly kind: K }> =>
        candidate.kind === kind && predicate(candidate),
    );
  if (command === undefined) throw new Error(`${kind} missing`);
  const result = await controller.dispatch(command);
  if (!result.accepted) throw new Error(`${kind}: ${result.reason}`);
}

function manualScheduler(): {
  readonly schedule: Ruleset7AiProgressScheduler;
  activeCount(): number;
  runNext(): void;
} {
  const entries: { readonly task: () => void; cancelled: boolean }[] = [];
  return {
    schedule(task) {
      const entry = { task, cancelled: false };
      entries.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    activeCount: () => entries.filter((entry) => !entry.cancelled).length,
    runNext() {
      const entry = entries.find((candidate) => !candidate.cancelled);
      if (entry === undefined) throw new Error("scheduled callback missing");
      entry.cancelled = true;
      entry.task();
    },
  };
}

function manualPersistenceScheduler(): {
  readonly schedule: PersistenceScheduler;
  activeCount(): number;
} {
  const entries: { cancelled: boolean }[] = [];
  return {
    schedule() {
      const entry = { cancelled: false };
      entries.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    activeCount: () => entries.filter((entry) => !entry.cancelled).length,
  };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("timed out");
}

class WriteFailingStorage implements StorageAdapter {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error("write unavailable");
  }

  removeItem(): void {}
}

class ToggleWriteStorage extends MemoryStorage {
  failWrites = false;

  override setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("write unavailable");
    super.setItem(key, value);
  }
}
