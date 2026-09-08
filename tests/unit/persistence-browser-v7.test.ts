import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  createPlayableGameV7,
  createReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  BrowserPersistenceV7,
  SAVE_STORAGE_KEY,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  type PersistenceScheduler,
  type StorageAdapter,
} from "../../src/persistence/index";

const OLD_V7_KEY = "pulpWars.save.v7.current";

describe("Ruleset 7 browser persistence", () => {
  it("reads, writes, and deletes only the revision-2 key", () => {
    const oldV7 = "old-v7-bytes";
    const v6 = "v6-bytes";
    const storage = new MemoryStorage([
      [OLD_V7_KEY, oldV7],
      [SAVE_STORAGE_KEY, v6],
    ]);
    const repository = new BrowserPersistenceV7(storage, {
      now: () => "2026-09-08T12:00:00.000Z",
    });
    expect(repository.loadSave()).toEqual({ kind: "NONE" });
    const input = saveInput();
    repository.queueSave(input);
    expect(repository.flushSave()).toEqual({ ok: true });
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).not.toBeNull();
    expect(storage.getItem(OLD_V7_KEY)).toBe(oldV7);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v6);

    expect(repository.deleteSave()).toEqual({ ok: true });
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    expect(storage.getItem(OLD_V7_KEY)).toBe(oldV7);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(v6);
  });

  it("preserves incompatible r1 bytes and never consults the old development key", () => {
    const input = saveInput();
    const current = createSaveEnvelopeV7(input, "2026-09-08T12:00:00.000Z");
    const r1 = JSON.stringify({
      ...current,
      rulesetId: "pulp-wars-poc-7",
      setup: { ...current.setup, rulesetId: "pulp-wars-poc-7" },
    });
    const storage = new MemoryStorage([
      [SAVE_STORAGE_KEY_V7, r1],
      [OLD_V7_KEY, "unparsed old development bytes"],
      [SAVE_STORAGE_KEY, "untouched v6 bytes"],
    ]);
    const repository = new BrowserPersistenceV7(storage);
    expect(repository.loadSave()).toMatchObject({ kind: "INCOMPATIBLE" });
    expect(storage.readKeys).toEqual([SAVE_STORAGE_KEY_V7]);
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBe(r1);
    expect(storage.getItem(OLD_V7_KEY)).toBe("unparsed old development bytes");
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe("untouched v6 bytes");
  });

  it("coalesces writes and cancels a stale scheduled callback", () => {
    const storage = new MemoryStorage();
    const scheduled = scheduledTasks();
    const repository = new BrowserPersistenceV7(storage, {
      now: () => "2026-09-08T12:00:00.000Z",
      schedule: scheduled.schedule,
    });
    repository.queueSave(saveInput());
    repository.queueSave(saveInput());
    expect(scheduled.active()).toHaveLength(1);
    repository.discardPendingSave();
    expect(scheduled.active()).toHaveLength(0);
    scheduled.runAllIncludingCancelled();
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
  });

  it("surfaces storage failures without throwing", () => {
    const readFailure = new BrowserPersistenceV7(new ThrowingStorage("read"));
    expect(readFailure.loadSave()).toMatchObject({ kind: "STORAGE_ERROR" });

    const writeFailure = new BrowserPersistenceV7(
      new ThrowingStorage("write"),
      { now: () => "2026-09-08T12:00:00.000Z" },
    );
    writeFailure.queueSave(saveInput());
    expect(writeFailure.flushSave()).toMatchObject({ ok: false });

    const deleteFailure = new BrowserPersistenceV7(
      new ThrowingStorage("delete"),
    );
    expect(deleteFailure.deleteSave()).toMatchObject({ ok: false });
  });
});

function setup(): MatchSetupV7 {
  return {
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
}

function saveInput() {
  const matchSetup = setup();
  const created = createPlayableGameV7(matchSetup);
  if (!created.ok) throw new Error(created.error.code);
  return { state: created.state, replay: createReplayV7(matchSetup) };
}

class MemoryStorage implements StorageAdapter {
  readonly values: Map<string, string>;
  readonly readKeys: string[] = [];

  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries);
  }

  getItem(key: string): string | null {
    this.readKeys.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class ThrowingStorage implements StorageAdapter {
  constructor(readonly operation: "read" | "write" | "delete") {}

  getItem(): string | null {
    if (this.operation === "read") throw new Error("read unavailable");
    return null;
  }

  setItem(): void {
    if (this.operation === "write") throw new Error("write unavailable");
  }

  removeItem(): void {
    if (this.operation === "delete") throw new Error("delete unavailable");
  }
}

function scheduledTasks(): {
  readonly schedule: PersistenceScheduler;
  active(): readonly (() => void)[];
  runAllIncludingCancelled(): void;
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
    active: () =>
      entries.filter((entry) => !entry.cancelled).map((entry) => entry.task),
    runAllIncludingCancelled: () => {
      for (const entry of entries) entry.task();
    },
  };
}
