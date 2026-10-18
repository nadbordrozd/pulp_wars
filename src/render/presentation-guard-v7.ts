/**
 * The presentation guard (bead pulp_wars-2yc.93): a failure while the
 * board draws or a boundary plays is logged and survived, never left to
 * lock the interface. Before it, one exception in a playback step left the
 * playback chain rejected, the interface busy for good (no command, no End
 * Turn) and a drag accelerating, because the pan's bookkeeping came after
 * the draw that threw.
 *
 * Each distinct failure is logged once (a frame that throws would
 * otherwise log sixty times a second); every failure is counted, for
 * review tooling and tests.
 *
 * Bead pulp_wars-2yc.96: a phone has no console, so the guard also keeps
 * the last PRESENTATION_FAILURE_MEMORY_V7 failures in memory (error,
 * trimmed stack, where, the playback step and the last few commands and
 * events) and tells its listeners, the app view's notice and "Copy error
 * report", of each new one.
 */

import type { Ruleset7PresentationFailureV7 } from "../app/v7-debug-export";

/** A failure the guard survived, as the error report shows it. */
export type PresentationFailureRecordV7 = Ruleset7PresentationFailureV7;

export const PRESENTATION_FAILURE_MEMORY_V7 = 5;
const ACTIVITY_MEMORY_V7 = 8;
const STACK_LINES_V7 = 12;
const STACK_CHARACTERS_V7 = 1600;
const MESSAGE_CHARACTERS_V7 = 400;

const reportedV7 = new Set<string>();
let failureCountV7 = 0;
const recentFailuresV7: PresentationFailureRecordV7[] = [];
const activityV7: string[] = [];
let stepV7: string | null = null;
const listenersV7 = new Set<(failure: PresentationFailureRecordV7) => void>();

/** Logs `error` from `where` once per distinct message; never throws. */
export function reportPresentationFailureV7(
  where: string,
  error: unknown,
): void {
  failureCountV7 += 1;
  let record: PresentationFailureRecordV7 | null = null;
  try {
    record = rememberFailureV7(where, error);
  } catch {
    // Remembering is best effort.
  }
  try {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    const key = `${where}|${message}`;
    if (!reportedV7.has(key)) {
      if (reportedV7.size > 64) reportedV7.clear();
      reportedV7.add(key);
      globalThis.console?.error?.(
        `Pulp Wars presentation failure in ${where}; the game goes on.`,
        error,
      );
    }
  } catch {
    // Logging is best effort.
  }
  if (record === null) return;
  for (const listener of [...listenersV7]) {
    try {
      listener(record);
    } catch {
      // A listener (the notice) never turns a survived failure into a new one.
    }
  }
}

/** How many presentation failures were survived (review tooling, tests). */
export function presentationFailureCountV7(): number {
  return failureCountV7;
}

/** Runs `action`, reporting and swallowing what it throws. */
export function guardPresentationV7(where: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    reportPresentationFailureV7(where, error);
  }
}

/** The last few failures this session, oldest first. */
export function recentPresentationFailuresV7(): readonly PresentationFailureRecordV7[] {
  return recentFailuresV7.map((failure) => ({
    ...failure,
    recent: [...failure.recent],
  }));
}

/**
 * Calls `listener` with each failure from now on; returns the function that
 * stops it.
 */
export function subscribePresentationFailuresV7(
  listener: (failure: PresentationFailureRecordV7) => void,
): () => void {
  listenersV7.add(listener);
  return () => {
    listenersV7.delete(listener);
  };
}

/**
 * A breadcrumb for the report: a command sent, a boundary's events queued
 * ("command MOVE", "AI events UNIT_MOVED,UNIT_ATTACKED"). The last
 * ACTIVITY_MEMORY_V7 are kept; never throws.
 */
export function notePresentationActivityV7(label: string): void {
  try {
    activityV7.push(label.slice(0, 160));
    if (activityV7.length > ACTIVITY_MEMORY_V7) activityV7.shift();
  } catch {
    // Best effort.
  }
}

/** The playback step now playing (its kind), or null between playbacks. */
export function notePresentationStepV7(step: string | null): void {
  stepV7 = step;
}

/** Tests only: forgets the remembered failures, breadcrumbs and step. */
export function resetPresentationFailureMemoryV7(): void {
  recentFailuresV7.length = 0;
  activityV7.length = 0;
  stepV7 = null;
  reportedV7.clear();
}

function rememberFailureV7(
  where: string,
  error: unknown,
): PresentationFailureRecordV7 {
  const name =
    error instanceof Error
      ? error.name
      : error === null
        ? "null"
        : typeof error;
  const message = (
    error instanceof Error ? error.message : safeStringV7(error)
  ).slice(0, MESSAGE_CHARACTERS_V7);
  const stack = error instanceof Error ? trimStackV7(error.stack) : null;
  const last = recentFailuresV7[recentFailuresV7.length - 1];
  // A frame that throws every frame is one entry with a count.
  if (
    last !== undefined &&
    last.where === where &&
    last.name === name &&
    last.message === message &&
    last.step === stepV7
  ) {
    const repeated = { ...last, count: last.count + 1 };
    recentFailuresV7[recentFailuresV7.length - 1] = repeated;
    return repeated;
  }
  const record: PresentationFailureRecordV7 = {
    at: new Date().toISOString(),
    where,
    step: stepV7,
    name,
    message,
    stack,
    recent: [...activityV7],
    count: 1,
  };
  recentFailuresV7.push(record);
  if (recentFailuresV7.length > PRESENTATION_FAILURE_MEMORY_V7)
    recentFailuresV7.shift();
  return record;
}

function safeStringV7(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "(unprintable)";
  }
}

/** The stack's first lines, without the message line it repeats. */
function trimStackV7(stack: string | undefined): string | null {
  if (typeof stack !== "string" || stack === "") return null;
  const lines = stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  // V8 starts the stack with "Name: message"; the report has it already.
  if (lines[0] !== undefined && !/^at\s|@/.test(lines[0])) lines.shift();
  const kept = lines.slice(0, STACK_LINES_V7).join("\n");
  return kept === "" ? null : kept.slice(0, STACK_CHARACTERS_V7);
}
