import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  armFastForwardExpression,
  stableControlPointExpression,
} from "../../scripts/browser-smoke-v7-controls";

const windows: JSDOM[] = [];
afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
});

function fixture() {
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only",
  });
  windows.push(dom);
  const { window } = dom;
  const { document } = window;
  Object.defineProperty(document, "readyState", { value: "complete" });
  const snapshot = {
    phase: "EMPTY",
    transitioning: false,
    ai: { active: false, fastForward: false },
    view: {
      commandIndex: 0,
      turnOrder: [2, 1],
      activeSeatIndex: 0,
      humanPlayerId: 1,
    },
  };
  window.__PULP_WARS_APP__ = { controller: { snapshot: () => snapshot } };
  const button = document.createElement("button");
  button.dataset.action = "fast-forward";
  button.scrollIntoView = vi.fn();
  button.getBoundingClientRect = () => new window.DOMRect(20, 30, 100, 40);
  document.elementFromPoint = () => button;
  const click = vi.fn(() => {
    snapshot.ai.fastForward = true;
  });
  button.addEventListener("click", click);
  const disconnect = vi.spyOn(window.MutationObserver.prototype, "disconnect");
  const clearTimeout = vi.spyOn(window, "clearTimeout");
  return {
    window,
    document,
    snapshot,
    button,
    click,
    disconnect,
    clearTimeout,
    arm: () => window.eval(armFastForwardExpression()),
    status: () =>
      window.__V7_FAST_FORWARD_CONTROL__ as {
        status: string;
        detail: string | null;
      },
    complete() {
      snapshot.phase = "ACTIVE";
      snapshot.ai.active = false;
      snapshot.view.commandIndex = 3;
      snapshot.view.activeSeatIndex = 1;
    },
  };
}

describe("transient Fast Forward control", () => {
  it("arms before launch and activates the offered control with an immediate public postcondition", async () => {
    const f = fixture();
    f.arm();
    expect(f.status().status).toBe("WAITING");
    f.snapshot.phase = "ACTIVE";
    f.snapshot.ai.active = true;
    f.document.body.append(f.button);
    await Promise.resolve();
    expect(f.click).toHaveBeenCalledOnce();
    expect(f.snapshot.ai.fastForward).toBe(true);
    expect(f.status().status).toBe("ACTIVATED");
    expect(f.disconnect).toHaveBeenCalled();
    expect(f.clearTimeout).toHaveBeenCalledOnce();
    f.complete();
    f.button.remove();
    await Promise.resolve();
    expect(f.status().status).toBe("ACTIVATED");
  });

  it("accepts a proved human return if AI completes before the observer runs", async () => {
    const f = fixture();
    f.arm();
    f.snapshot.phase = "ACTIVE";
    f.snapshot.ai.active = true;
    f.document.body.append(f.button);
    f.complete();
    f.button.remove();
    await Promise.resolve();
    expect(f.status().status).toBe("COMPLETED");
    expect(f.click).not.toHaveBeenCalled();
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.clearTimeout).toHaveBeenCalledOnce();
  });

  it.each(["missing", "disabled", "occluded", "hidden", "ineffective"])(
    "rejects an active AI's %s control instead of claiming completion",
    (defect) => {
      const f = fixture();
      f.snapshot.phase = "ACTIVE";
      f.snapshot.ai.active = true;
      if (defect !== "missing") f.document.body.append(f.button);
      if (defect === "disabled") f.button.disabled = true;
      if (defect === "occluded")
        f.document.elementFromPoint = () => f.document.body;
      if (defect === "hidden") f.button.style.visibility = "hidden";
      if (defect === "ineffective")
        f.button.removeEventListener("click", f.click);
      f.arm();
      expect(f.status().status).toBe("ERROR");
      expect(f.status().detail).toMatch(/Fast Forward/);
      expect(f.snapshot.ai.fastForward).toBe(false);
      expect(f.disconnect).toHaveBeenCalled();
      expect(f.clearTimeout).toHaveBeenCalledOnce();
    },
  );

  it.each(["empty", "transitioning", "ai-seat", "command-zero"])(
    "does not mistake %s for a completed AI turn and cleans up cancellation",
    (phase) => {
      const f = fixture();
      f.complete();
      if (phase === "empty") f.snapshot.phase = "EMPTY";
      if (phase === "transitioning") f.snapshot.transitioning = true;
      if (phase === "ai-seat") f.snapshot.view.activeSeatIndex = 0;
      if (phase === "command-zero") f.snapshot.view.commandIndex = 0;
      f.arm();
      expect(f.status().status).toBe("WAITING");
      f.window.eval("globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__()");
      expect(f.status().status).toBe("ERROR");
      expect(f.disconnect).toHaveBeenCalledOnce();
      expect(f.clearTimeout).toHaveBeenCalledOnce();
    },
  );
});

describe("pointer control readiness", () => {
  it("waits for fonts, scrolling, stable bounds and a matching hit target", async () => {
    const f = fixture();
    f.document.body.append(f.button);
    const fonts = { status: "loading" };
    Object.defineProperty(f.document, "fonts", { value: fonts });
    let frame = 0;
    f.window.requestAnimationFrame = (callback) => {
      frame += 1;
      if (frame === 3) fonts.status = "loaded";
      callback(frame);
      return frame;
    };
    f.button.getBoundingClientRect = () =>
      new f.window.DOMRect(frame < 5 ? frame * 10 : 50, 30, 100, 40);
    f.document.elementFromPoint = () =>
      frame < 7 ? f.document.body : f.button;
    const point = await f.window.eval(
      stableControlPointExpression('[data-action="fast-forward"]'),
    );
    expect(point).toEqual({ x: 100, y: 50 });
    expect(frame).toBe(8);
    expect(f.button.scrollIntoView).toHaveBeenCalledOnce();
  });

  it.each(["disabled", "occluded", "moving", "outside"])(
    "fails bounded readiness for a %s target",
    async (defect) => {
      const f = fixture();
      f.document.body.append(f.button);
      let frame = 0;
      f.window.requestAnimationFrame = (callback) => {
        frame += 1;
        callback(frame);
        return frame;
      };
      if (defect === "disabled") f.button.disabled = true;
      if (defect === "occluded")
        f.document.elementFromPoint = () => f.document.body;
      if (defect === "moving" || defect === "outside")
        f.button.getBoundingClientRect = () =>
          new f.window.DOMRect(
            defect === "outside" ? -1000 : frame,
            30,
            100,
            40,
          );
      await expect(
        f.window.eval(
          stableControlPointExpression('[data-action="fast-forward"]'),
        ),
      ).rejects.toThrow("did not become stable and hittable");
      expect(frame).toBe(120);
    },
  );
});
