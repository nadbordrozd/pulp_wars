import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANVAS_LOSS_SETTLE_MS_V7,
  canvasLossGenerationV7,
  contextLostV7,
  onCanvasContentLossV7,
  watchCanvasLossV7,
} from "../../src/render/canvas/canvas-loss-v7";

/**
 * Bug pulp_wars-urs0: a lost GPU context clears every GPU-backed canvas of
 * the page, the board's kept copies of its art among them. A watched
 * canvas reports the restore, and the page's listeners hear of one loss
 * once, however many canvases it cleared and over however many tasks the
 * browser restores them.
 */
describe("canvas content loss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells each listener of a loss once, after its last restore", async () => {
    const canvases = Array.from({ length: 3 }, () => new EventTarget());
    for (const canvas of canvases) watchCanvasLossV7(canvas);
    // Watching a canvas twice does not report it twice.
    watchCanvasLossV7(canvases[0] as EventTarget);
    const heard: string[] = [];
    const stopA = onCanvasContentLossV7(() => heard.push("a"));
    const stopB = onCanvasContentLossV7(() => heard.push("b"));
    const before = canvasLossGenerationV7();

    // The browser restores the canvases of one loss over several tasks.
    canvases[0]?.dispatchEvent(new Event("contextrestored"));
    canvases[0]?.dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7 - 20);
    canvases[1]?.dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7 - 20);
    canvases[2]?.dispatchEvent(new Event("contextrestored"));
    expect(heard).toEqual([]);
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    expect(heard).toEqual(["a", "b"]);
    expect(canvasLossGenerationV7()).toBe(before + 1);

    // A later loss is heard again; an unsubscribed listener hears nothing.
    stopA();
    canvases[1]?.dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    expect(heard).toEqual(["a", "b", "b"]);
    expect(canvasLossGenerationV7()).toBe(before + 2);
    stopB();
  });

  it("goes on to the other listeners when one throws", async () => {
    const canvas = new EventTarget();
    watchCanvasLossV7(canvas);
    const heard: string[] = [];
    const stopA = onCanvasContentLossV7(() => {
      throw new Error("broken listener");
    });
    const stopB = onCanvasContentLossV7(() => heard.push("b"));
    canvas.dispatchEvent(new Event("contextrestored"));
    await vi.advanceTimersByTimeAsync(CANVAS_LOSS_SETTLE_MS_V7);
    expect(heard).toEqual(["b"]);
    stopA();
    stopB();
  });

  it("reads a lost context, and never throws on one that cannot say", () => {
    expect(contextLostV7({ isContextLost: () => true })).toBe(true);
    expect(contextLostV7({ isContextLost: () => false })).toBe(false);
    expect(contextLostV7({})).toBe(false);
    expect(contextLostV7(null)).toBe(false);
    expect(
      contextLostV7({
        isContextLost: () => {
          throw new Error("no");
        },
      }),
    ).toBe(false);
    // An object without listeners is not watched (and does not throw).
    expect(() => watchCanvasLossV7({})).not.toThrow();
  });
});
