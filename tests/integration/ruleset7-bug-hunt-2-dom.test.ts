// @vitest-environment jsdom

// Bead pulp_wars-2yc.98 (the browser bug hunt, round 2): what the hunt's
// matches through the real interface found, each pinned on a small
// hand-built state (the Showcase board; no match is played).

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AiProgressScheduler,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import { resetPresentationFailureMemoryV7 } from "../../src/render/presentation-guard-v7";

const css = readFileSync("src/styles/v7.css", "utf8");

/** The declarations of the rule whose selector list is exactly `selector`. */
function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`no rule ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  resetPresentationFailureMemoryV7();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the match menu (pulp_wars-2yc.98)", () => {
  it("closes on a press outside it, not on one inside it", async () => {
    const rig = await mountRig();
    click('[data-action="compact-menu"]');
    expect(menu()).not.toBeNull();
    // A press inside (a sound slider's row, an item) keeps it open.
    press(menu()?.firstElementChild ?? null);
    expect(menu()).not.toBeNull();
    // A press on the toggle is the toggle's to handle.
    press(document.querySelector('[data-action="compact-menu"]'));
    expect(menu()).not.toBeNull();
    // A press on the board closes it at once, and the toggle opens it again
    // with the next tap (before, it stayed open and that tap closed it).
    press(document.querySelector("canvas.board-canvas-v7"));
    expect(menu()).toBeNull();
    expect(
      document
        .querySelector('[data-action="compact-menu"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    click('[data-action="compact-menu"]');
    expect(menu()).not.toBeNull();
    expect(document.querySelector('[data-action="main-menu"]')).not.toBeNull();
    rig.destroy();
  });

  it("closes with Escape and gives the focus back to its toggle", async () => {
    const rig = await mountRig();
    click('[data-action="compact-menu"]');
    expect(menu()).not.toBeNull();
    document
      .querySelector<HTMLElement>('[data-action="leaderboard"]')
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    await flush();
    expect(menu()).toBeNull();
    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe(
      "compact-menu",
    );
    // The match is untouched: still the human's turn, End Turn offered.
    expect(
      document.querySelector<HTMLButtonElement>('[data-action="end-turn"]')
        ?.disabled,
    ).toBe(false);
    rig.destroy();
  });

  it("scrolls on a short screen, so Save & quit stays in reach", () => {
    const declarations = rule(".v7-hud-menu");
    expect(declarations).toMatch(/max-height: calc\(100dvh - [\d.]+rem\);/);
    expect(declarations).toContain("overflow-y: auto;");
    expect(declarations).toContain("overscroll-behavior: contain;");
  });

  it("fits the room below its place, wherever the HUD's rows put it", async () => {
    // A Cultist's End Turn wraps to a second row on a phone turned sideways
    // (320 px tall): the menu hangs from 112 px, so it may be 196 px tall.
    const rig = await mountRig();
    const height = vi.spyOn(window, "innerHeight", "get").mockReturnValue(320);
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("v7-hud-menu"))
          return new DOMRect(400, 112, 240, 400);
        return original.call(this);
      },
    );
    click('[data-action="compact-menu"]');
    expect(menu()?.style.maxHeight).toBe("196px");
    // It stays where it hangs while it fits on the screen.
    expect(menu()?.style.left).toBe("");
    height.mockRestore();
    rig.destroy();
  });

  it("hangs from the left when the HUD wraps its toggle to the left", async () => {
    // A 320 px phone with no End Turn (a choice is up, or a narrow HUD):
    // the toggle sits at the left, and a menu hung from its right edge ran
    // off the screen's left edge, its names cut off.
    const rig = await mountRig();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("v7-hud-menu"))
          return this.style.left === "0px"
            ? new DOMRect(12, 112, 240, 300)
            : new DOMRect(-26, 112, 240, 300);
        return new DOMRect(0, 0, 0, 0);
      },
    );
    click('[data-action="compact-menu"]');
    expect(menu()?.style.left).toBe("0px");
    expect(menu()?.style.right).toBe("auto");
    rig.destroy();
  });

  it("widens with the UI size, so its words keep their room", () => {
    // Bead 2yc.98: at 200% a rem-wide menu broke "Achievements" in two and
    // ran "Music" under its slider.
    expect(rule(".v7-hud-menu")).toContain(
      "min-width: min(15em, calc(100vw - 1.5rem));",
    );
    expect(rule(".v7-menu-audio")).toContain(
      "grid-template-columns: minmax(6.5rem, auto) minmax(4rem, 1fr);",
    );
  });
});

describe("the tech screen's detail (pulp_wars-2yc.98)", () => {
  it("docks on the right under the screen's close button, never over it", () => {
    // The rule that places the right-docked detail (the last one of it).
    const selector = '\n.v7-tech-detail[data-dock="right"] {';
    const start = css.lastIndexOf(selector);
    const declarations = css.slice(start, css.indexOf("\n}", start));
    expect(declarations).toContain("top: calc(50% + 1.75rem);");
    expect(declarations).toContain("max-height: calc(100% - 5rem);");
  });
});

function menu(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".v7-hud-menu");
}

function click(selector: string): void {
  const target = document.querySelector<HTMLButtonElement>(selector);
  if (target === null) throw new Error(`missing ${selector}`);
  target.click();
}

/** A press (pointerdown) on `target`, as a finger or the mouse starts one. */
function press(target: Element | null): void {
  if (target === null) throw new Error("nothing to press");
  target.dispatchEvent(new Event("pointerdown", { bubbles: true }));
}

interface Rig {
  readonly view: Ruleset7DomAppView;
  destroy(): void;
}

async function mountRig(): Promise<Rig> {
  const schedule: Ruleset7AiProgressScheduler = () => () => {};
  const controller = new Ruleset7BrowserController({
    aiProgressScheduler: schedule,
  });
  const launched = await controller.launch(showcaseSetup());
  if (!launched.ok) throw new Error(launched.diagnostic);
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  const view = new Ruleset7DomAppView(document, root, controller, {
    boardHost: new StillBoardHost(),
    settingsStorage: null,
  });
  await flush();
  return {
    view,
    destroy() {
      view.destroy();
      controller.destroy();
    },
  };
}

/** The Showcase board: every seat starts with its whole roster. */
function showcaseSetup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(2),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/** A board that draws nothing and plays every boundary at once. */
class StillBoardHost implements BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

async function flush(): Promise<void> {
  for (let index = 0; index < 8; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
