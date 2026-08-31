import type { ReplayFileV6, GameStateV6 } from "../engine/index";
import {
  MAX_SAVE_BYTES_V6,
  createSaveEnvelopeV6,
  parseSaveV6,
  type SaveEnvelopeV6,
  type SaveLoadResultV6,
} from "./v6";
import type {
  PersistenceScheduler,
  PersistenceWriteResult,
  StorageAdapter,
} from "./index";

const SAVE_STORAGE_KEY_V6 = "pulpWars.save.current";

const defaultSchedulerV6: PersistenceScheduler = (task) => {
  const timer = setTimeout(task, 0);
  return () => clearTimeout(timer);
};

export interface BrowserSaveInputV6 {
  readonly state: GameStateV6;
  readonly replay: ReplayFileV6;
}

export type BrowserSaveLoadResultV6 =
  | { readonly kind: "NONE" }
  | { readonly kind: "VALID"; readonly save: SaveEnvelopeV6 }
  | {
      readonly kind: "CORRUPT" | "INCOMPATIBLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

/**
 * Browser-only v6 save repository. Parsing and envelope construction remain
 * pure; this class owns the single-key storage and coalescing write queue.
 */
export class BrowserPersistenceV6 {
  readonly #storage: StorageAdapter;
  readonly #now: () => string;
  readonly #schedule: PersistenceScheduler;
  readonly #onAsyncFailure: (diagnostic: string) => void;
  #pendingSave: SaveEnvelopeV6 | null = null;
  #cancelScheduled: (() => void) | null = null;

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
    this.#schedule = options.schedule ?? defaultSchedulerV6;
    this.#onAsyncFailure = options.onAsyncFailure ?? (() => undefined);
  }

  loadSave(): BrowserSaveLoadResultV6 {
    let source: string | null;
    try {
      source = this.#storage.getItem(SAVE_STORAGE_KEY_V6);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: persistenceDiagnosticV6(
          "Unable to read the saved match",
          error,
        ),
      };
    }
    if (source === null) return { kind: "NONE" };
    const parsed: SaveLoadResultV6 = parseSaveV6(source);
    return parsed;
  }

  queueSave(input: BrowserSaveInputV6): string {
    this.#pendingSave = createSaveEnvelopeV6(input, this.#now());
    if (this.#cancelScheduled === null) {
      this.#cancelScheduled = this.#schedule(() => {
        this.#cancelScheduled = null;
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
      if (new TextEncoder().encode(serialized).byteLength > MAX_SAVE_BYTES_V6) {
        return {
          ok: false,
          diagnostic: `Autosave exceeds the ${MAX_SAVE_BYTES_V6}-byte POC limit.`,
        };
      }
      this.#storage.setItem(SAVE_STORAGE_KEY_V6, serialized);
      this.#pendingSave = null;
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: persistenceDiagnosticV6(
          "Unable to write the saved match",
          error,
        ),
      };
    }
  }

  deleteSave(): PersistenceWriteResult {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#pendingSave = null;
    try {
      this.#storage.removeItem(SAVE_STORAGE_KEY_V6);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: persistenceDiagnosticV6(
          "Unable to delete the saved match",
          error,
        ),
      };
    }
  }

  destroy(): void {
    this.#cancelScheduled?.();
    this.#cancelScheduled = null;
    this.#pendingSave = null;
  }
}

function persistenceDiagnosticV6(prefix: string, error: unknown): string {
  return error instanceof Error ? `${prefix}: ${error.message}` : prefix;
}
