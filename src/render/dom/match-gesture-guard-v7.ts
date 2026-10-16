/**
 * Keeps the browser's own page zoom and page scroll out of a match (bead
 * pulp_wars-2yc.72): on a phone a pinch or a drag moves only the board's
 * camera or the technology tree, never the page, so the HUD at the top and
 * the dock at the bottom stay where they are.
 *
 * The style sheet does most of it: every element of the match shell allows
 * only panning (`touch-action: pan-x pan-y`, so a scrolling dock still
 * scrolls), the board and the tree take every touch (`touch-action: none`)
 * for their own cameras, and the page under a match cannot scroll. This
 * guard adds what CSS cannot do:
 *
 * - iOS Safari zooms the page on its own gesture events, inside scrolling
 *   panels too, whatever `touch-action` says; cancelling them (and any
 *   two-finger `touchmove`) stops that. Pointer events, which the board and
 *   the tree read, are not affected.
 * - A page zoom the player brought in from the front screens (which keep
 *   pinch zoom for reading) would leave the HUD off screen with no way to
 *   pinch back out, so a zoomed page is put back to its normal scale when a
 *   match opens and whenever it zooms during one, by briefly capping the
 *   viewport's `maximum-scale` at 1.
 *
 * The viewport meta tag itself keeps user scaling enabled.
 */

const IOS_GESTURE_EVENTS_V7 = [
  "gesturestart",
  "gesturechange",
  "gestureend",
] as const;

/** A visual viewport scale above this counts as a page zoom. */
const ZOOMED_SCALE_V7 = 1.001;

/** How long `maximum-scale=1` stays on the viewport while it un-zooms. */
const ZOOM_RESET_MILLISECONDS_V7 = 250;

/**
 * Installs the guard on the match shell; the returned function removes it
 * (and the viewport listener) again.
 */
export function installMatchGestureGuardV7(shell: HTMLElement): () => void {
  const document = shell.ownerDocument;
  const window = document.defaultView;
  const cancel = (event: Event): void => {
    if (event.cancelable) event.preventDefault();
  };
  const cancelMultiTouch = (event: TouchEvent): void => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault();
  };
  const options: AddEventListenerOptions = { passive: false };
  for (const type of IOS_GESTURE_EVENTS_V7)
    shell.addEventListener(type, cancel, options);
  shell.addEventListener("touchmove", cancelMultiTouch, options);
  const visualViewport = window?.visualViewport ?? null;
  let resetTimer: number | null = null;
  const unzoom = (): void => {
    if (resetTimer !== null) return;
    if ((visualViewport?.scale ?? 1) <= ZOOMED_SCALE_V7) return;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    if (meta === null || window === null) return;
    const original = meta.content;
    meta.content = viewportWithMaximumScaleV7(original);
    resetTimer = window.setTimeout(() => {
      resetTimer = null;
      meta.content = original;
    }, ZOOM_RESET_MILLISECONDS_V7);
  };
  visualViewport?.addEventListener("resize", unzoom);
  unzoom();
  // A pending restore still runs after removal, so the cap never sticks.
  return () => {
    for (const type of IOS_GESTURE_EVENTS_V7)
      shell.removeEventListener(type, cancel, options);
    shell.removeEventListener("touchmove", cancelMultiTouch, options);
    visualViewport?.removeEventListener("resize", unzoom);
  };
}

/** The viewport content with `maximum-scale=1` in place of any cap. */
export function viewportWithMaximumScaleV7(content: string): string {
  const parts = content
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "" && !/^maximum-scale\s*=/i.test(part));
  parts.push("maximum-scale=1");
  return parts.join(", ");
}
