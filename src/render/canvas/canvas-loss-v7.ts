/**
 * Lost canvas contents (bug pulp_wars-urs0). The board draws most of its
 * pieces (every terrain tile, city and building of the live look, the
 * coast, the roads, the sky) from canvas copies it builds once and keeps:
 * toned, recoloured, sliced or faded copies of the art. When the browser
 * loses its GPU context (its GPU process restarts or runs out of memory,
 * which a reload with a heavy page still in memory can bring about) every
 * GPU-backed canvas of the page is cleared. The kept copies then draw as
 * nothing, and since they are kept they never come back: the board shows
 * its units, which are drawn from image elements the browser restores
 * itself, over an empty map.
 *
 * The browser tells of it with `contextlost` and `contextrestored` on each
 * canvas. A canvas watched here reports the restore (when its context can
 * be drawn on again, blank) and every listener hears of it once per loss,
 * however many canvases it cleared; the board host then throws its copies
 * away, builds them again and redraws.
 */

const listeners = new Set<() => void>();
const watched = new WeakSet<object>();
let generation = 0;
let settling: ReturnType<typeof setTimeout> | null = null;

/**
 * The browser restores the canvases of one loss over several tasks: the
 * listeners hear of it once this long after the last restore, so the copies
 * are built again once, not once per batch of canvases.
 */
export const CANVAS_LOSS_SETTLE_MS_V7 = 120;

/** How many losses the page has seen; tests and the review read it. */
export function canvasLossGenerationV7(): number {
  return generation;
}

/** Hears of each loss once; returns the unsubscribe. */
export function onCanvasContentLossV7(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A canvas's contents were lost: every listener hears of it once, after
 * the events of the canvases lost with it (a loss clears hundreds at once).
 */
export function noteCanvasContentLossV7(): void {
  if (settling === null) generation += 1;
  else globalThis.clearTimeout(settling);
  settling = globalThis.setTimeout(() => {
    settling = null;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // One listener's failure never keeps the others from rebuilding.
      }
    }
  }, CANVAS_LOSS_SETTLE_MS_V7);
}

/** Reports a loss of `canvas`'s contents (a canvas is watched once). */
export function watchCanvasLossV7(canvas: object): void {
  if (watched.has(canvas)) return;
  const target = canvas as Partial<Pick<HTMLCanvasElement, "addEventListener">>;
  if (typeof target.addEventListener !== "function") return;
  watched.add(canvas);
  target.addEventListener("contextrestored", noteCanvasContentLossV7);
}

/** True when `context` reports its contents lost (never throws). */
export function contextLostV7(context: unknown): boolean {
  try {
    const probe = context as { isContextLost?: () => boolean } | null;
    return typeof probe?.isContextLost === "function" && probe.isContextLost();
  } catch {
    return false;
  }
}
