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
 */

const reportedV7 = new Set<string>();
let failureCountV7 = 0;

/** Logs `error` from `where` once per distinct message; never throws. */
export function reportPresentationFailureV7(
  where: string,
  error: unknown,
): void {
  failureCountV7 += 1;
  try {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    const key = `${where}|${message}`;
    if (reportedV7.has(key)) return;
    if (reportedV7.size > 64) reportedV7.clear();
    reportedV7.add(key);
    globalThis.console?.error?.(
      `Pulp Wars presentation failure in ${where}; the game goes on.`,
      error,
    );
  } catch {
    // Logging is best effort.
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
