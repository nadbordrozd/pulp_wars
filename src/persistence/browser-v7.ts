import type { GameStateV7, ReplayFileV7 } from "../engine/index";
import {
  MAX_SAVE_BYTES_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
  type SaveEnvelopeV7,
  type SaveLoadResultV7,
} from "./v7";
import type {
  PersistenceScheduler,
  PersistenceWriteResult,
  StorageAdapter,
} from "./index";

const defaultSchedulerV7: PersistenceScheduler = (task) => {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
};

export interface BrowserSaveInputV7 {
  readonly state: GameStateV7;
  readonly replay: ReplayFileV7;
}

export type BrowserSaveLoadResultV7 =
  | { readonly kind: "NONE" }
  | { readonly kind: "VALID"; readonly save: SaveEnvelopeV7 }
  | {
      readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

/** Browser-only revision-2 repository. It owns exactly the v7r2 save key. */
export class BrowserPersistenceV7 {
  readonly #storage: StorageAdapter;
  readonly #now: () => string;
  readonly #schedule: PersistenceScheduler;
  readonly #onAsyncFailure: (diagnostic: string) => void;
  #pendingSave: SaveEnvelopeV7 | null = null;
  #cancelScheduled: (() => void) | null = null;
  #generation = 0;

  constructor(
    storage: StorageAdapter,
    options: {
      readonly now?: () => string;
      readonly schedule?: PersistenceScheduler;
      readonly onAsyncFailure?: (diagnostic: string) => void;
    } = {},
  ) {
    this.#storage = storage;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#schedule = options.schedule ?? defaultSchedulerV7;
    this.#onAsyncFailure = options.onAsyncFailure ?? (() => undefined);
  }

  loadSave(): BrowserSaveLoadResultV7 {
    let source: string | null;
    try {
      source = this.#storage.getItem(SAVE_STORAGE_KEY_V7);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: persistenceDiagnosticV7(
          "Unable to read the Ruleset 7 saved match",
          error,
        ),
      };
    }
    if (source === null) return { kind: "NONE" };
    const parsed: SaveLoadResultV7 = parseSaveV7(source);
    return parsed;
  }

  queueSave(input: BrowserSaveInputV7): string {
    this.#pendingSave = createSaveEnvelopeV7(input, this.#now());
    if (this.#cancelScheduled === null) {
      const generation = this.#generation;
      this.#cancelScheduled = this.#schedule(() => {
        this.#cancelScheduled = null;
        if (generation !== this.#generation) return;
        const result = this.flushSave();
        if (!result.ok) this.#onAsyncFailure(result.diagnostic);
      });
    }
    return this.#pendingSave.savedAt;
  }

  flushSave(): PersistenceWriteResult {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    const pending = this.#pendingSave;
    if (pending === null) return { ok: true };
    try {
      const serialized = JSON.stringify(pending);
      if (new TextEncoder().encode(serialized).byteLength > MAX_SAVE_BYTES_V7) {
        return {
          ok: false,
          diagnostic: `Autosave exceeds the ${MAX_SAVE_BYTES_V7}-byte POC limit.`,
        };
      }
      this.#storage.setItem(SAVE_STORAGE_KEY_V7, serialized);
      this.#pendingSave = null;
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: persistenceDiagnosticV7(
          "Unable to write the Ruleset 7 saved match",
          error,
        ),
      };
    }
  }

  /** Cancels a queued write before a replacement installs another match. */
  discardPendingSave(): void {
    this.#generation += 1;
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#pendingSave = null;
  }

  deleteSave(): PersistenceWriteResult {
    this.discardPendingSave();
    try {
      this.#storage.removeItem(SAVE_STORAGE_KEY_V7);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: persistenceDiagnosticV7(
          "Unable to delete the Ruleset 7 saved match",
          error,
        ),
      };
    }
  }

  destroy(): void {
    this.discardPendingSave();
  }
}

function persistenceDiagnosticV7(prefix: string, error: unknown): string {
  return error instanceof Error ? `${prefix}: ${error.message}` : prefix;
}
