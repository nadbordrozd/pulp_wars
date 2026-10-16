// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installMatchGestureGuardV7,
  viewportWithMaximumScaleV7,
} from "../../src/render/dom/match-gesture-guard-v7";

/**
 * Phone gestures in a match (bead pulp_wars-2yc.72): a pinch or a drag
 * moves only the board's camera or the technology tree, never the page,
 * so the HUD, the dock and the technology detail keep their place and size
 * on screen.
 */
const css = readFileSync("src/styles/v7.css", "utf8");
const html = readFileSync("index.html", "utf8");

/** The declarations of the rule whose selector list is exactly `selector`. */
function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`Missing ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}

describe("Ruleset 7 phone gestures", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("keeps the browser's pinch zoom for the front screens", () => {
    const viewport = /<meta name="viewport" content="([^"]+)"/.exec(html)?.[1];
    expect(viewport).toBe("width=device-width, initial-scale=1.0");
    expect(html).not.toMatch(/user-scalable|maximum-scale/);
  });

  it("lets every element of a match pan but never zoom the page", () => {
    expect(rule(":where(.v7-match-shell, .v7-match-shell *)")).toContain(
      "touch-action: pan-x pan-y;",
    );
    // The board and the tree (and the tree's shell, where touches land
    // while a detail makes the tree inert) take every touch themselves.
    expect(rule(".v7-tech-graph-shell")).toContain("touch-action: none;");
    expect(rule(".v7-tech-graph")).toContain("touch-action: none;");
    const page = rule(
      "html:has(.v7-match-shell),\nhtml:has(.v7-match-shell) body",
    );
    expect(page).toContain("overflow: hidden;");
    expect(page).toContain("overscroll-behavior: none;");
    // Pinned to the screen: the HUD and the dock cannot scroll away.
    const root = rule(".v7-match-root");
    expect(root).toContain("position: fixed;");
    expect(root).toContain("inset: 0;");
  });

  it("cancels iOS gesture events and two-finger moves, not one-finger drags", () => {
    const shell = document.createElement("div");
    const inner = document.createElement("div");
    shell.append(inner);
    document.body.append(shell);
    const remove = installMatchGestureGuardV7(shell);

    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      inner.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    const twoFingers = touchMove(2);
    inner.dispatchEvent(twoFingers);
    expect(twoFingers.defaultPrevented).toBe(true);
    const oneFinger = touchMove(1);
    inner.dispatchEvent(oneFinger);
    expect(oneFinger.defaultPrevented).toBe(false);

    remove();
    const after = new Event("gesturestart", {
      bubbles: true,
      cancelable: true,
    });
    inner.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("puts back a page zoom when a match opens and whenever the page zooms in one", () => {
    vi.useFakeTimers();
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0";
    document.head.append(meta);
    const visualViewport = Object.assign(new EventTarget(), { scale: 2.5 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    try {
      const shell = document.createElement("div");
      document.body.append(shell);
      const remove = installMatchGestureGuardV7(shell);
      expect(meta.content).toBe(
        "width=device-width, initial-scale=1.0, maximum-scale=1",
      );
      vi.advanceTimersByTime(300);
      expect(meta.content).toBe("width=device-width, initial-scale=1.0");

      visualViewport.scale = 1;
      visualViewport.dispatchEvent(new Event("resize"));
      expect(meta.content).toBe("width=device-width, initial-scale=1.0");
      visualViewport.scale = 1.8;
      visualViewport.dispatchEvent(new Event("resize"));
      expect(meta.content).toContain("maximum-scale=1");
      // A removal mid-reset still puts the viewport back.
      remove();
      vi.advanceTimersByTime(300);
      expect(meta.content).toBe("width=device-width, initial-scale=1.0");
      visualViewport.dispatchEvent(new Event("resize"));
      expect(meta.content).toBe("width=device-width, initial-scale=1.0");
    } finally {
      Reflect.deleteProperty(window, "visualViewport");
    }
  });

  it("replaces any maximum scale of the viewport", () => {
    expect(
      viewportWithMaximumScaleV7("width=device-width, maximum-scale=3"),
    ).toBe("width=device-width, maximum-scale=1");
  });
});

function touchMove(touches: number): Event {
  const event = new Event("touchmove", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: { length: touches },
  });
  return event;
}
