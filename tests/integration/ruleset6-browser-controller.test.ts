import { describe, expect, it } from "vitest";
import {
  RULESET6_AI_COMMANDS_PER_SLICE,
  Ruleset6BrowserController,
  type Ruleset6BrowserSnapshot,
} from "../../src/app/index";
import { chooseNormalCommandV6 } from "../../src/ai/index";
import {
  canonicalJson,
  previewEconomicV6,
  queryPlayerCommandsV6,
  type CommandV6,
  type FactionIdV6,
  type MatchSetupV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import {
  SAVE_STORAGE_KEY,
  type PersistenceScheduler,
  type StorageAdapter,
} from "../../src/persistence/index";

describe("ruleset-6 browser session controller", () => {
  it.each([
    ["ORIGINAL", "ORIGINAL_BASELINE"],
    ["CANDY", "CANDY_BASELINE_V1"],
  ] as const)(
    "launches a %s human seat with its exact public commands and previews",
    async (faction, treeId) => {
      const controller = new Ruleset6BrowserController();
      const launched = await controller.launch(setupV6(faction, 8));
      expect(launched.ok).toBe(true);

      const snapshot = controller.snapshot();
      expect(snapshot.phase).toBe("ACTIVE");
      expect(snapshot.view?.viewer).toMatchObject({
        controller: "HUMAN",
        faction,
        factionTreeId: treeId,
      });
      expect(snapshot.view?.schemaVersion).toBe(6);
      expect(snapshot.offeredCommands).toEqual(
        queryPlayerCommandsV6(requireView(snapshot)),
      );
      const economic = snapshot.offeredCommands.find(
        (command) => command.kind === "HARVEST_FRUIT",
      );
      expect(economic).toBeDefined();
      if (economic === undefined) throw new Error("Missing economic command");
      expect(controller.economicPreview(economic)).toEqual(
        previewEconomicV6(requireView(snapshot), economic),
      );
      expect(controller.economicPreview(economic)).toMatchObject({
        ok: true,
        preview: { complete: true, cost: 2 },
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.view)).toBe(true);
      expect(Object.isFrozen(snapshot.offeredCommands)).toBe(true);
      expect(Object.isFrozen(economic)).toBe(true);
      controller.destroy();
    },
  );

  it("accepts only an exact offered human command and appends replay hashes", async () => {
    const controller = new Ruleset6BrowserController();
    await controller.launch(setupV6("ORIGINAL", 42));
    const initial = controller.snapshot();
    const wait = requireCommand(initial, "WAIT");

    const accepted = await controller.dispatch(wait);
    expect(accepted).toMatchObject({ accepted: true, command: wait });
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.presentationBoundary).toMatchObject({
      actorId: initial.view?.viewer.id,
      command: wait,
      events: accepted.events,
      beforeView: { commandIndex: 0 },
      afterView: { commandIndex: 1 },
    });
    expect(controller.snapshot().commandIndex).toBe(1);
    expect(controller.exportReplay()).toMatchObject({
      version: 6,
      commands: [wait],
      checkpoints: [
        {
          index: 1,
          stateHash: controller.snapshot().stateHash,
        },
      ],
    });

    const rejected = await controller.dispatch(wait);
    expect(rejected).toEqual({ accepted: false, reason: "NOT_OFFERED" });
    expect(controller.snapshot().commandIndex).toBe(1);
    expect(controller.snapshot().stateHash).toBe(
      (accepted as Extract<typeof accepted, { accepted: true }>).stateHash,
    );
    controller.destroy();
  });

  it("drives Normal AI seats from observation-safe views back to the human", async () => {
    const observed: PlayerViewV6[] = [];
    const controller = new Ruleset6BrowserController({
      chooseAiCommand: (view) => {
        observed.push(view);
        expect("random" in view).toBe(false);
        expect("nextEntityId" in view).toBe(false);
        return chooseNormalCommandV6(view);
      },
    });
    await controller.launch(setupV6("CANDY", 42));
    const ended = await controller.dispatch(
      requireCommand(controller.snapshot(), "END_TURN"),
    );
    expect(ended.accepted).toBe(true);

    const progressed = await controller.progressAiTurns();
    expect(progressed.ok).toBe(true);
    expect(progressed.acceptedCommands).toBeGreaterThan(0);
    if (!progressed.ok) throw new Error(progressed.diagnostic);
    expect(progressed.presentationBoundaries).toHaveLength(
      progressed.acceptedCommands,
    );
    expect(
      progressed.presentationBoundaries?.every(
        (boundary, index, all) =>
          index === 0 ||
          boundary.beforeView.commandIndex ===
            all[index - 1]?.afterView.commandIndex,
      ),
    ).toBe(true);
    expect(observed.length).toBe(progressed.acceptedCommands);
    expect(controller.snapshot().view?.viewer.controller).toBe("HUMAN");
    expect(controller.snapshot().view?.viewer.faction).toBe("CANDY");
    expect(controller.exportReplay()?.commands).toHaveLength(
      controller.snapshot().commandIndex,
    );
    controller.destroy();
  });

  it("does not schedule cooperative work when progression is already at the human", async () => {
    let scheduleCalls = 0;
    const controller = new Ruleset6BrowserController({
      aiProgressScheduler: (resume) => {
        scheduleCalls += 1;
        resume();
      },
    });
    expect((await controller.launch(setupV6("ORIGINAL", 42))).ok).toBe(true);

    expect(await controller.progressAiTurns()).toMatchObject({
      ok: true,
      acceptedCommands: 0,
    });
    expect(scheduleCalls).toBe(0);
    controller.destroy();
  });

  it("yields repeatedly on a large multi-AI board without changing deterministic results", async () => {
    const setup = largeMultiAiSetupV6();
    const baseline = new Ruleset6BrowserController({
      aiProgressScheduler: (resume) => resume(),
    });
    const yieldedIndexes: number[] = [];
    let macrotaskOpportunities = 0;
    const responsive = new Ruleset6BrowserController({
      aiProgressScheduler: (resume) => {
        setTimeout(() => {
          macrotaskOpportunities += 1;
          yieldedIndexes.push(responsive.snapshot().commandIndex);
          resume();
        }, 0);
      },
    });
    const emittedIndexes: number[] = [];
    const unsubscribe = responsive.subscribe((snapshot) => {
      if (
        snapshot.transitioning &&
        snapshot.commandIndex > (emittedIndexes.at(-1) ?? -1)
      ) {
        emittedIndexes.push(snapshot.commandIndex);
      }
    });

    expect((await baseline.launch(setup)).ok).toBe(true);
    expect((await responsive.launch(setup)).ok).toBe(true);
    const initial = responsive.snapshot().view;
    expect(initial?.turnOrder[initial.activeSeatIndex]).not.toBe(
      initial?.viewer.id,
    );

    const baselineResult = await baseline.progressAiTurns();
    const responsiveResult = await responsive.progressAiTurns();
    expect(baselineResult.ok).toBe(true);
    expect(responsiveResult.ok).toBe(true);
    if (!baselineResult.ok || !responsiveResult.ok) {
      throw new Error("Large multi-AI progression failed");
    }
    expect(responsiveResult.acceptedCommands).toBeGreaterThan(2);
    expect(RULESET6_AI_COMMANDS_PER_SLICE).toBe(1);
    expect(macrotaskOpportunities).toBe(responsiveResult.acceptedCommands);
    expect(yieldedIndexes[0]).toBe(0);
    expect(yieldedIndexes).toEqual(
      Array.from(
        { length: responsiveResult.acceptedCommands },
        (_, index) => index,
      ),
    );
    expect(emittedIndexes).toEqual(
      Array.from(
        { length: responsiveResult.acceptedCommands + 1 },
        (_, index) => index,
      ),
    );
    expect(responsiveResult.stateHash).toBe(baselineResult.stateHash);
    expect(canonicalJson(responsive.exportReplay())).toBe(
      canonicalJson(baseline.exportReplay()),
    );
    expect(
      responsiveResult.presentationBoundaries.map(boundarySignature),
    ).toEqual(baselineResult.presentationBoundaries.map(boundarySignature));
    expect(responsive.snapshot()).toMatchObject({
      commandIndex: baseline.snapshot().commandIndex,
      stateHash: baseline.snapshot().stateHash,
      phase: baseline.snapshot().phase,
    });

    unsubscribe();
    responsive.destroy();
    baseline.destroy();
  });

  it("stops before another AI command when destroyed during a cooperative yield", async () => {
    const resumptions: (() => void)[] = [];
    const controller = new Ruleset6BrowserController({
      aiProgressScheduler: (resume) => resumptions.push(resume),
    });
    expect((await controller.launch(largeMultiAiSetupV6())).ok).toBe(true);

    const progress = controller.progressAiTurns();
    await waitUntil(() => resumptions.length === 1);
    controller.destroy();
    resumptions.shift()?.();

    expect(await progress).toEqual({
      ok: false,
      acceptedCommands: 0,
      diagnostic: "The ruleset-6 browser controller was destroyed.",
    });
    expect(controller.snapshot()).toMatchObject({
      phase: "ERROR",
      commandIndex: 0,
      diagnostic: "The ruleset-6 browser controller was destroyed.",
    });
  });

  it("serializes an asynchronous AI decision ahead of a queued restart", async () => {
    const firstDecision: { release?: () => void } = {};
    let calls = 0;
    const controller = new Ruleset6BrowserController({
      chooseAiCommand: async (view) => {
        calls += 1;
        if (calls === 1) {
          await new Promise<void>((resolve) => {
            firstDecision.release = resolve;
          });
        }
        return {
          difficulty: "NORMAL",
          candidates: [],
          command:
            queryPlayerCommandsV6(view).find(
              (command) => command.kind === "END_TURN",
            ) ?? null,
          prngDraws: 0,
        };
      },
    });
    const launch = await controller.launch(setupV6("ORIGINAL", 42));
    if (!launch.ok) throw new Error(launch.diagnostic);
    await controller.dispatch(
      requireCommand(controller.snapshot(), "END_TURN"),
    );

    const progress = controller.progressAiTurns();
    await waitUntil(() => firstDecision.release !== undefined);
    const restart = controller.restart();
    expect(controller.snapshot().transitioning).toBe(true);
    expect(controller.snapshot().commandIndex).toBe(1);
    const release = firstDecision.release;
    if (release === undefined) throw new Error("Missing AI release");
    release();
    expect((await progress).ok).toBe(true);
    const restarted = await restart;
    expect(restarted).toMatchObject({ ok: true, stateHash: launch.stateHash });
    expect(controller.snapshot().commandIndex).toBe(0);
    expect(controller.exportReplay()?.commands).toEqual([]);
    controller.destroy();
  });

  it("coalesces command autosaves, flushes, and resumes an exact v6 boundary", async () => {
    const storage = new MemoryStorage();
    const scheduled = scheduledTasks();
    const options = {
      storage,
      persistenceNow: () => "2026-08-31T12:00:00.000Z",
      persistenceScheduler: scheduled.schedule,
    } as const;
    const controller = new Ruleset6BrowserController(options);
    await controller.launch(setupV6("ORIGINAL", 42));
    expect(storage.writes).toBe(1);

    await controller.dispatch(requireCommand(controller.snapshot(), "WAIT"));
    const research = requireCommand(controller.snapshot(), "RESEARCH");
    await controller.dispatch(research);
    expect(storage.writes).toBe(1);
    expect(scheduled.activeCount()).toBe(1);
    const boundary = controller.snapshot();
    expect(controller.flushPersistence()).toBe(true);
    expect(storage.writes).toBe(2);
    expect(scheduled.activeCount()).toBe(0);
    controller.destroy();

    const resumed = new Ruleset6BrowserController(options);
    expect(resumed.snapshot()).toMatchObject({
      phase: "RESUMABLE",
      commandIndex: boundary.commandIndex,
      stateHash: boundary.stateHash,
      savedAt: "2026-08-31T12:00:00.000Z",
      recovery: null,
    });
    expect(await resumed.resume()).toBe(true);
    expect(resumed.snapshot().phase).toBe("ACTIVE");
    expect(resumed.exportReplay()?.commands).toHaveLength(
      boundary.commandIndex,
    );
    resumed.destroy();
  });

  it.each([
    JSON.stringify({
      format: "pulp-wars-save",
      version: 5,
      opaque: "legacy bytes",
    }),
    "{ definitely corrupt",
  ])(
    "preserves incompatible or corrupt bytes until explicit deletion",
    async (source) => {
      const storage = new MemoryStorage([[SAVE_STORAGE_KEY, source]]);
      const controller = new Ruleset6BrowserController({ storage });
      expect(controller.snapshot()).toMatchObject({
        phase: "RECOVERY",
        hasStoredSave: true,
      });
      expect(controller.snapshot().recovery?.kind).toMatch(
        /INCOMPATIBLE|CORRUPT/,
      );
      const launch = await controller.launch(setupV6("ORIGINAL", 42), {
        replaceStoredMatch: true,
      });
      expect(launch).toMatchObject({
        ok: false,
        code: "PRESERVED_SAVE_REQUIRES_DELETE",
      });
      expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(source);
      expect(storage.removals).toBe(0);

      expect(await controller.deleteStoredSave()).toBe(true);
      expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
      expect(storage.removals).toBe(1);
      controller.destroy();
    },
  );

  it("requires explicit replacement for a valid stored match and restarts deterministically", async () => {
    const storage = new MemoryStorage();
    const controller = new Ruleset6BrowserController({
      storage,
      persistenceNow: () => "2026-08-31T12:00:00.000Z",
    });
    const launched = await controller.launch(setupV6("ORIGINAL", 42));
    if (!launched.ok) throw new Error(launched.diagnostic);
    await controller.dispatch(requireCommand(controller.snapshot(), "WAIT"));
    const restarted = await controller.restart();
    expect(restarted).toMatchObject({
      ok: true,
      stateHash: launched.stateHash,
    });
    expect(controller.exportReplay()?.commands).toEqual([]);
    controller.destroy();

    const loaded = new Ruleset6BrowserController({ storage });
    expect(loaded.snapshot().phase).toBe("RESUMABLE");
    expect(await loaded.launch(setupV6("CANDY", 9))).toMatchObject({
      ok: false,
      code: "STORED_MATCH_REQUIRES_REPLACE",
    });
    expect(
      await loaded.launch(setupV6("CANDY", 9), {
        replaceStoredMatch: true,
      }),
    ).toMatchObject({ ok: true });
    expect(loaded.snapshot().view?.viewer.faction).toBe("CANDY");
    loaded.destroy();
  });

  it("requires explicit replacement for an in-memory match without storage", async () => {
    const controller = new Ruleset6BrowserController({ storage: null });
    const original = await controller.launch(setupV6("ORIGINAL", 42));
    if (!original.ok) throw new Error(original.diagnostic);

    expect(await controller.launch(setupV6("CANDY", 9))).toMatchObject({
      ok: false,
      code: "STORED_MATCH_REQUIRES_REPLACE",
    });
    expect(controller.snapshot()).toMatchObject({
      phase: "ACTIVE",
      stateHash: original.stateHash,
      hasStoredSave: false,
      view: { viewer: { faction: "ORIGINAL" } },
    });

    expect(
      await controller.launch(setupV6("CANDY", 9), {
        replaceStoredMatch: true,
      }),
    ).toMatchObject({ ok: true });
    expect(controller.snapshot().view?.viewer.faction).toBe("CANDY");
    controller.destroy();
  });

  it("surfaces v6 storage write failure without losing the active match", async () => {
    const storage = new WriteFailingStorage();
    const controller = new Ruleset6BrowserController({
      storage,
      persistenceNow: () => "2026-08-31T12:00:00.000Z",
    });
    const launched = await controller.launch(setupV6("ORIGINAL", 42));
    if (!launched.ok) throw new Error(launched.diagnostic);

    expect(controller.snapshot()).toMatchObject({
      phase: "ACTIVE",
      stateHash: launched.stateHash,
      commandIndex: 0,
      saveWarning: "Unable to write the saved match: disk unavailable",
    });
    const dispatched = await controller.dispatch(
      requireCommand(controller.snapshot(), "WAIT"),
    );
    expect(dispatched.accepted).toBe(true);
    expect(controller.snapshot()).toMatchObject({
      phase: "ACTIVE",
      commandIndex: 1,
    });
    expect(controller.flushPersistence()).toBe(false);
    expect(controller.snapshot().saveWarning).toBe(
      "Unable to write the saved match: disk unavailable",
    );
    controller.destroy();
  });
});

function setupV6(humanFaction: FactionIdV6, seed: number): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [
      humanFaction,
      humanFaction === "ORIGINAL" ? "CANDY" : "ORIGINAL",
    ],
  };
}

function largeMultiAiSetupV6(): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 25,
    height: 25,
    aiCount: 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY", "ORIGINAL", "CANDY"],
  };
}

function boundarySignature(
  boundary: Extract<
    Awaited<ReturnType<Ruleset6BrowserController["progressAiTurns"]>>,
    { readonly ok: true }
  >["presentationBoundaries"][number],
): unknown {
  return {
    actorId: boundary.actorId,
    command: boundary.command,
    events: boundary.events,
    beforeCommandIndex: boundary.beforeView.commandIndex,
    afterCommandIndex: boundary.afterView.commandIndex,
  };
}

function requireView(snapshot: Ruleset6BrowserSnapshot): PlayerViewV6 {
  if (snapshot.view === null) throw new Error("Missing player view");
  return snapshot.view;
}

function requireCommand<K extends CommandV6["kind"]>(
  snapshot: Ruleset6BrowserSnapshot,
  kind: K,
): Extract<CommandV6, { readonly kind: K }> {
  const command = snapshot.offeredCommands.find(
    (candidate): candidate is Extract<CommandV6, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (command === undefined) {
    throw new Error(
      `Missing ${kind}: ${canonicalJson(snapshot.offeredCommands)}`,
    );
  }
  return command;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for asynchronous controller transition");
}

class MemoryStorage implements StorageAdapter {
  readonly #values: Map<string, string>;
  writes = 0;
  removals = 0;

  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.#values = new Map(entries);
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.removals += 1;
    this.#values.delete(key);
  }
}

class WriteFailingStorage implements StorageAdapter {
  getItem(key: string): string | null {
    void key;
    return null;
  }

  setItem(key: string, value: string): void {
    void key;
    void value;
    throw new Error("disk unavailable");
  }

  removeItem(key: string): void {
    void key;
  }
}

function scheduledTasks(): {
  readonly schedule: PersistenceScheduler;
  activeCount(): number;
} {
  const tasks: { cancelled: boolean; readonly task: () => void }[] = [];
  return {
    schedule(task) {
      const entry = { cancelled: false, task };
      tasks.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    activeCount() {
      return tasks.filter((task) => !task.cancelled).length;
    },
  };
}
