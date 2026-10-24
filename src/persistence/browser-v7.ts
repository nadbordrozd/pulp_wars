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

export const OBSOLETE_SAVE_STORAGE_KEYS_V7 = Object.freeze([
  "pulpWars.save.v7.current",
  "pulpWars.save.v7r2.current",
  "pulpWars.save.v7r3.current",
  "pulpWars.save.v7r4.current",
  "pulpWars.save.v7r5.current",
  "pulpWars.save.v7r6.current",
  "pulpWars.save.v7r7.current",
  "pulpWars.save.v7r8.current",
  "pulpWars.save.v7r9.current",
  "pulpWars.save.v7r10.current",
  "pulpWars.save.v7r11.current",
  "pulpWars.save.v7r12.current",
  "pulpWars.save.v7r13.current",
  "pulpWars.save.v7r14.current",
  "pulpWars.save.v7r15.current",
  "pulpWars.save.v7r16.current",
  "pulpWars.save.v7r17.current",
  "pulpWars.save.v7r18.current",
  "pulpWars.save.v7r19.current",
  "pulpWars.save.v7r20.current",
  "pulpWars.save.v7r21.current",
  "pulpWars.save.v7r22.current",
  "pulpWars.save.v7r23.current",
  "pulpWars.save.v7r24.current",
  "pulpWars.save.v7r25.current",
  "pulpWars.save.v7r26.current",
  "pulpWars.save.v7r27.current",
  "pulpWars.save.v7r28.current",
  "pulpWars.save.v7r29.current",
  "pulpWars.save.v7r30.current",
  "pulpWars.save.v7r31.current",
  "pulpWars.save.v7r32.current",
  "pulpWars.save.v7r33.current",
  "pulpWars.save.v7r34.current",
  "pulpWars.save.v7r35.current",
  "pulpWars.save.v7r36.current",
  "pulpWars.save.v7r37.current",
  "pulpWars.save.v7r38.current",
  "pulpWars.save.v7r39.current",
  "pulpWars.save.v7r40.current",
  "pulpWars.save.v7r41.current",
  "pulpWars.save.v7r42.current",
  "pulpWars.save.v7r43.current",
  "pulpWars.save.v7r44.current",
  "pulpWars.save.v7r45.current",
  "pulpWars.save.v7r46.current",
  "pulpWars.save.v7r47.current",
  "pulpWars.save.v7r48.current",
  "pulpWars.save.v7r49.current",
  "pulpWars.save.v7r50.current",
  "pulpWars.save.v7r51.current",
  "pulpWars.save.v7r52.current",
  "pulpWars.save.v7r53.current",
  "pulpWars.save.v7r54.current",
  "pulpWars.save.v7r55.current",
  "pulpWars.save.v7r56.current",
  "pulpWars.save.v7r57.current",
  "pulpWars.save.v7r58.current",
  "pulpWars.save.v7r59.current",
  "pulpWars.save.v7r60.current",
  "pulpWars.save.v7r61.current",
  "pulpWars.save.v7r62.current",
  "pulpWars.save.v7r63.current",
  "pulpWars.save.v7r64.current",
  "pulpWars.save.v7r65.current",
  "pulpWars.save.v7r66.current",
  "pulpWars.save.v7r67.current",
  "pulpWars.save.v7r68.current",
  "pulpWars.save.v7r69.current",
  "pulpWars.save.v7r70.current",
  "pulpWars.save.v7r71.current",
  "pulpWars.save.v7r72.current",
  "pulpWars.save.v7r73.current",
  "pulpWars.save.v7r74.current",
  "pulpWars.save.v7r75.current",
  "pulpWars.save.v7r76.current",
  "pulpWars.save.v7r77.current",
  "pulpWars.save.v7r78.current",
  "pulpWars.save.v7r79.current",
  "pulpWars.save.v7r80.current",
  "pulpWars.save.v7r81.current",
  "pulpWars.save.v7r82.current",
  "pulpWars.save.v7r83.current",
  "pulpWars.save.v7r84.current",
  "pulpWars.save.v7r85.current",
  "pulpWars.save.v7r86.current",
  "pulpWars.save.v7r87.current",
  "pulpWars.save.v7r88.current",
  "pulpWars.save.v7r89.current",
  "pulpWars.save.v7r90.current",
  "pulpWars.save.v7r91.current",
  "pulpWars.save.v7r92.current",
  "pulpWars.save.v7r93.current",
  "pulpWars.save.v7r94.current",
  "pulpWars.save.v7r95.current",
  "pulpWars.save.v7r96.current",
  "pulpWars.save.v7r97.current",
  "pulpWars.save.v7r98.current",
  "pulpWars.save.v7r99.current",
  "pulpWars.save.v7r100.current",
  "pulpWars.save.v7r101.current",
  "pulpWars.save.v7r102.current",
  "pulpWars.save.v7r103.current",
  "pulpWars.save.v7r104.current",
  "pulpWars.save.v7r105.current",
  "pulpWars.save.v7r106.current",
  "pulpWars.save.v7r107.current",
  "pulpWars.save.v7r108.current",
  "pulpWars.save.v7r109.current",
] as const);

export interface ObsoleteSaveCleanupResultV7 {
  readonly removedKeys: readonly (typeof OBSOLETE_SAVE_STORAGE_KEYS_V7)[number][];
  readonly removedCount: number;
  readonly warning: string | null;
}

/** Removes only known incompatible development keys and reports removals. */
export function cleanupObsoleteRuleset7Saves(
  storage: StorageAdapter | null,
): ObsoleteSaveCleanupResultV7 {
  if (storage === null)
    return { removedKeys: [], removedCount: 0, warning: null };
  const removedKeys: (typeof OBSOLETE_SAVE_STORAGE_KEYS_V7)[number][] = [];
  const failures: string[] = [];
  for (const key of OBSOLETE_SAVE_STORAGE_KEYS_V7) {
    let present: boolean;
    try {
      present = storage.getItem(key) !== null;
    } catch (error) {
      failures.push(persistenceDiagnosticV7(`Unable to inspect ${key}`, error));
      continue;
    }
    if (!present) continue;
    try {
      storage.removeItem(key);
      removedKeys.push(key);
    } catch (error) {
      failures.push(persistenceDiagnosticV7(`Unable to remove ${key}`, error));
    }
  }
  return {
    removedKeys,
    removedCount: removedKeys.length,
    warning:
      failures.length === 0
        ? null
        : `Obsolete Ruleset 7 save cleanup was incomplete: ${failures.join("; ")}`,
  };
}

/**
 * The autosave key of the retired prototypes: Ruleset 6 and the legacy game
 * before it shared this one key (bead pulp_wars-lky5). Nothing reads it any
 * more.
 */
export const RETIRED_RULESET_SAVE_STORAGE_KEYS_V7 = Object.freeze([
  "pulpWars.save.current",
] as const);

/**
 * Removes a retired prototype's saved game. It is quiet on purpose: no
 * notice, no warning, and a storage that refuses is left alone.
 */
export function clearRetiredRulesetSavesV7(
  storage: StorageAdapter | null,
): void {
  if (storage === null) return;
  for (const key of RETIRED_RULESET_SAVE_STORAGE_KEYS_V7) {
    try {
      if (storage.getItem(key) !== null) storage.removeItem(key);
    } catch {
      // Nothing to report: the key belongs to a game that no longer exists.
    }
  }
}

/** Browser-only current-revision repository. It owns exactly the v7r110 save key. */
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
    // The command log is not replayed here (bead pulp_wars-2yc.95): the
    // stored state is checked in full and resumed at once, and the browser
    // controller checks the history afterwards, off the main thread
    // (`verifySaveReplayV7`).
    const parsed: SaveLoadResultV7 = parseSaveV7(source, { replay: "DEFER" });
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
