import type {
  SaveEnvelopeV7,
  SaveReplayVerificationV7,
} from "../persistence/index";

/**
 * The check of a resumed save's command log (bead `pulp_wars-2yc.95`). The
 * browser resumes a save from its stored state at once (the state is checked
 * in full: schema, invariants, hash) and replays the log afterwards, off the
 * main thread, to check that it still leads to that state:
 *
 * - `NONE`: no resumed save (a new match, or nothing loaded);
 * - `PENDING`: the replay is running;
 * - `VERIFIED`: the log rebuilds exactly the stored state;
 * - `MISMATCH`: it does not (a hand-edited save, or a replay that no longer
 *   reproduces); play goes on from the stored state and a save warning
 *   says so;
 * - `UNCHECKED`: no worker could run it (none offered, or it failed).
 */
export type SavedHistoryCheckStatusV7 =
  "NONE" | "PENDING" | "VERIFIED" | "MISMATCH" | "UNCHECKED";

export interface SavedHistoryCheckV7 {
  readonly status: SavedHistoryCheckStatusV7;
  readonly diagnostic: string | null;
}

export interface SavedHistoryVerificationRunV7 {
  /** The verdict; null when the check could not run. Never rejects. */
  readonly result: Promise<SaveReplayVerificationV7 | null>;
  /** Stops the check (a new match, Delete save, teardown). */
  cancel(): void;
}

export type SavedHistoryVerifierV7 = (
  save: SaveEnvelopeV7,
) => SavedHistoryVerificationRunV7;

/** The save warning a `MISMATCH` shows. */
export const SAVED_HISTORY_MISMATCH_WARNING_V7 =
  "This game's move history does not lead to its saved board. Play goes on from the board as saved.";

/**
 * Runs the check in a Web Worker (`save-history-worker-v7.ts`), so a long
 * replay never blocks a frame; null where there is no Worker (Node, tests).
 * The save is serialised on a later task, after the resumed board's first
 * render.
 */
export function workerSavedHistoryVerifierV7(): SavedHistoryVerifierV7 | null {
  if (typeof Worker !== "function") return null;
  return (save) => {
    let worker: Worker | null = null;
    let settled = false;
    let resolveResult: (value: SaveReplayVerificationV7 | null) => void = () =>
      undefined;
    const result = new Promise<SaveReplayVerificationV7 | null>((resolve) => {
      resolveResult = resolve;
    });
    const finish = (value: SaveReplayVerificationV7 | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      worker = null;
      resolveResult(value);
    };
    const timer = setTimeout(() => {
      try {
        worker = new Worker(
          new URL("./save-history-worker-v7.ts", import.meta.url),
          { type: "module", name: "saved-history-check" },
        );
        worker.addEventListener("message", (event: MessageEvent<unknown>) => {
          finish(verificationOfMessageV7(event.data));
        });
        worker.addEventListener("error", () => finish(null));
        worker.addEventListener("messageerror", () => finish(null));
        worker.postMessage(JSON.stringify(save));
      } catch {
        finish(null);
      }
    }, 0);
    return { result, cancel: () => finish(null) };
  };
}

/** A worker's reply, read defensively; anything else counts as unchecked. */
export function verificationOfMessageV7(
  data: unknown,
): SaveReplayVerificationV7 | null {
  if (typeof data !== "object" || data === null) return null;
  const reply = data as { ok?: unknown; diagnostic?: unknown };
  if (reply.ok === true) return { ok: true };
  if (reply.ok === false && typeof reply.diagnostic === "string")
    return { ok: false, diagnostic: reply.diagnostic };
  return null;
}
