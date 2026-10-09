// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { SETTINGS_STORAGE_KEY } from "../../src/persistence/index";

/**
 * The front screens (beads pulp_wars-2yc.4, pulp_wars-2yc.9 and
 * pulp_wars-2yc.18): the main menu's buttons over the title scene, its
 * keyboard, and the screens it opens (the grouped setup form with every
 * control in its old order, Settings) with their way back.
 */
class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement): void {
    container.replaceChildren(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

function mount(
  options: Parameters<typeof bootstrapRuleset7App>[1] = {},
): ReturnType<typeof bootstrapRuleset7App> {
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    boardHost: new Host(),
    randomSeed: () => 7,
    ...options,
  });
  return app;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

/** The focused control's action (focus moves after the current task). */
function focused(): string | undefined {
  return (document.activeElement as HTMLElement | null)?.dataset.action;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function key(name: string, target: Element | null = null): void {
  (target ?? document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      bubbles: true,
      cancelable: true,
    }),
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("Ruleset 7 front screen", () => {
  it("puts the logo over the title scene and keeps the scene across redraws", () => {
    mount();
    const brand = required(".v7-front-screen > .v7-brand");
    expect(brand.classList.contains("v7-title")).toBe(true);
    expect(brand.querySelector("h1")?.textContent).toBe("Pulp Wars");
    const scene = required(".v7-title .v7-title-scene");
    // A picture only: hidden from assistive technology, never focusable.
    expect(scene.getAttribute("aria-hidden")).toBe("true");
    expect(scene.querySelectorAll("canvas")).toHaveLength(1);
    expect(scene.querySelector("[tabindex], button, a")).toBeNull();
    expect(required(".v7-app-shell").classList).toContain("v7-front-shell");
    // Every screen of the menu and back: the same scene element.
    press("campaign");
    expect(required(".v7-campaign .v7-title-scene")).toBe(scene);
    press("front-back");
    press("new-game");
    expect(required('[data-v7-front="setup"] .v7-title-scene')).toBe(scene);
    press("front-back");
    expect(required('[data-v7-front="menu"] .v7-title-scene')).toBe(scene);
  });

  it("is a title screen: the actions are large buttons over the picture", () => {
    mount();
    const screen = required(".v7-front-screen");
    expect(screen.dataset.v7Front).toBe("menu");
    expect(screen.classList).toContain("v7-titled");
    const menu = required("nav.v7-main-menu");
    expect(menu.getAttribute("aria-label")).toBe("Main menu");
    // Laid over the scene itself: no panel, form or dialog around them.
    expect(menu.parentElement).toBe(screen);
    expect(menu.closest("form, dialog, [role='dialog'], section")).toBeNull();
    const items = [...menu.querySelectorAll<HTMLButtonElement>("button")];
    expect(items.map((item) => item.dataset.action)).toEqual([
      "new-game",
      "campaign",
      "gallery",
      "front-settings",
    ]);
    expect(items.map((item) => item.textContent)).toEqual([
      "New game",
      "Campaign",
      "Gallery",
      "Settings",
    ]);
    for (const item of items) {
      expect(item.classList).toContain("v7-menu-button");
      // An icon beside each word.
      expect(item.querySelector("svg")).not.toBeNull();
    }
    expect(items[0]?.classList).toContain("is-primary");
    // Nothing else is shown: the setup form waits, hidden, for New game.
    expect(required(".v7-setup-form").closest("[hidden]")).not.toBeNull();
    expect(document.querySelector(".v7-front-panel")).toBeNull();
    const shown = [
      ...screen.querySelectorAll<HTMLElement>("button, select, input, a"),
    ]
      .filter((node) => node.closest("[hidden]") === null)
      .map((node) => node.id || node.dataset.action || node.tagName);
    expect(shown).toEqual([
      "new-game",
      "campaign",
      "gallery",
      "front-settings",
      "A",
    ]);
    // No coordinates on the front screen.
    expect(screen.textContent).not.toMatch(/\(\d+\s*,\s*\d+\)/);
  });

  it("selects the first button on entry and moves with the arrow keys", async () => {
    mount();
    await settle();
    expect(focused()).toBe("new-game");
    key("ArrowDown");
    expect(focused()).toBe("campaign");
    key("ArrowDown");
    key("ArrowDown");
    expect(focused()).toBe("front-settings");
    // The stack wraps both ways; Home and End go to its ends.
    key("ArrowDown");
    expect(focused()).toBe("new-game");
    key("ArrowUp");
    expect(focused()).toBe("front-settings");
    key("Home");
    expect(focused()).toBe("new-game");
    key("End");
    expect(focused()).toBe("front-settings");
    // With nothing focused the arrows enter the menu.
    (document.activeElement as HTMLElement).blur();
    key("ArrowUp", document.body);
    expect(focused()).toBe("front-settings");
    // A match's shortcuts do nothing here.
    key("t");
    key("?");
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });

  it("opens each screen as a panel with a way back; Escape returns too", async () => {
    mount();
    for (const [action, front, heading] of [
      ["new-game", "setup", "New game"],
      ["campaign", "campaign", "Campaign"],
      ["front-settings", "settings", "Settings"],
    ] as const) {
      press(action);
      await settle();
      expect(required(".v7-front-screen").dataset.v7Front).toBe(front);
      expect(document.querySelector(".v7-main-menu")).toBeNull();
      const panel = required(".v7-front-panel");
      expect(panel.getAttribute("aria-labelledby")).toBe("v7-front-title");
      expect(required("#v7-front-title").textContent).toBe(heading);
      // Focus lands on the way back, whose name says where it goes.
      expect(focused()).toBe("front-back");
      expect(
        required('[data-action="front-back"]').getAttribute("aria-label"),
      ).toBe("Main menu");
      press("front-back");
      await settle();
      expect(required(".v7-front-screen").dataset.v7Front).toBe("menu");
      // Back on the button that opened the screen.
      expect(focused()).toBe(action);
      press(action);
      key("Escape");
      await settle();
      expect(required(".v7-front-screen").dataset.v7Front).toBe("menu");
      expect(focused()).toBe(action);
    }
  });

  it("groups the setup form without moving a control", () => {
    mount();
    press("new-game");
    expect(
      [...document.querySelectorAll(".v7-setup-heading")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(["Game mode", "Your tribe", "Players", "Map"]);
    expect(required(".v7-setup-form").closest("[hidden]")).toBeNull();
    // Reading and tab order: back, the game mode and your tribe
    // (RULESET_7_SCORE_AND_STARS.md section 7), players, map, seed, the
    // opponents' factions, Play. The tribe grid replaces "Your faction".
    const order = [
      ...required("[data-v7-setup]").querySelectorAll<HTMLElement>(
        "button, select, input, a",
      ),
    ]
      .filter((node) => node.closest("[hidden]") === null)
      .map((node) => node.id || node.dataset.action || node.tagName);
    expect(order).toEqual([
      "front-back",
      "game-mode-domination",
      "game-mode-perfection",
      "star-rules",
      "tribe-original",
      "tribe-undead",
      "tribe-goblin",
      "tribe-dinosaur",
      "tribe-martian",
      "tribe-ice-folk",
      "tribe-dwarf",
      "tribe-candy",
      "v7-ai-count",
      "v7-ai-mode",
      "v7-board-size",
      "v7-map-type",
      "v7-curiosities",
      "seed-mode-new",
      "seed-mode-seed",
      "v7-faction-1",
      "launch",
    ]);
    expect(required('[data-action="launch"]').textContent).toBe("Play");
    expect(required('[data-action="launch"]').classList).toContain(
      "primary-action",
    );
    // Each seat is a card with its faction's emblem.
    const seats = [...document.querySelectorAll<HTMLElement>(".v7-setup-seat")];
    expect(seats.map((seat) => seat.dataset.faction)).toEqual([
      "ORIGINAL",
      "UNDEAD",
    ]);
    for (const seat of seats)
      expect(seat.querySelector(".v7-faction-emblem")).not.toBeNull();
    // No coordinates on the front screen.
    expect(required(".v7-front-screen").textContent).not.toMatch(
      /\(\d+\s*,\s*\d+\)/,
    );
  });

  it("opens Settings from the menu: motion, UI size, contrast and sound", () => {
    mount({ settingsStorage: window.localStorage });
    expect(document.querySelector("#v7-front-settings")).toBeNull();
    press("front-settings");
    const panel = required("#v7-front-settings");
    for (const id of ["v7-motion", "v7-animation-speed", "v7-ui-scale"])
      expect(panel.querySelector(`#${id}`), id).not.toBeNull();
    expect(panel.querySelector('[data-action="high-contrast"]')).not.toBeNull();
    expect(panel.querySelector('[data-action="sound-toggle"]')).not.toBeNull();
    // No match-only action.
    expect(panel.querySelector('[data-action="restart"]')).toBeNull();
    const scale = required<HTMLSelectElement>("#v7-ui-scale");
    scale.value = "1.5";
    scale.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      required(".v7-front-shell").style.getPropertyValue("--ui-scale"),
    ).toBe("1.5");
    expect(required(".v7-front-shell").dataset.motion).toBe("full");
    const motion = required<HTMLSelectElement>("#v7-motion");
    motion.value = "REDUCED";
    motion.dispatchEvent(new Event("change", { bubbles: true }));
    // The menu's own motion (a button stepping forward) follows the setting.
    expect(required(".v7-front-shell").dataset.motion).toBe("reduced");
    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}",
    ) as { settings?: { motion?: string; uiScale?: number } };
    expect(stored.settings).toMatchObject({ motion: "REDUCED", uiScale: 1.5 });
    required<HTMLButtonElement>('[data-action="high-contrast"]').click();
    expect(required(".v7-front-shell").dataset.contrast).toBe("high");
    // The panel stays open through its own changes, and closes on request.
    expect(document.querySelector("#v7-front-settings")).not.toBeNull();
    press("front-back");
    expect(document.querySelector("#v7-front-settings")).toBeNull();
    expect(required(".v7-front-shell").dataset.contrast).toBe("high");
  });

  it("leaves the scene when a match starts and shows it again with Continue", async () => {
    const first = mount();
    press("new-game");
    press("launch");
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-title-scene")).toBeNull();
    expect(document.querySelector(".v7-front-shell")).toBeNull();
    first.destroy();
    const second = mount();
    expect(second.controller.snapshot().phase).toBe("RESUMABLE");
    expect(document.querySelector("[data-v7-setup]")).toBeNull();
    required(".v7-front-screen > .v7-title .v7-title-scene");
    // Continue leads the menu and carries the saved game's summary.
    const items = [
      ...required(".v7-main-menu").querySelectorAll<HTMLButtonElement>(
        "button",
      ),
    ];
    expect(items.map((item) => item.dataset.action)).toEqual([
      "resume",
      "new-game",
      "campaign",
      "gallery",
      "front-settings",
    ]);
    const resume = required('[data-action="resume"]');
    expect(resume.classList).toContain("is-primary");
    expect(required('[data-action="new-game"]').classList).not.toContain(
      "is-primary",
    );
    expect(resume.querySelector(".v7-menu-button-label")?.textContent).toBe(
      "Continue",
    );
    expect(required(".v7-resume-summary").textContent).toContain("Turn 1");
    await settle();
    expect(focused()).toBe("resume");
    // New game opens the setup, which replaces the save only on Play.
    press("new-game");
    expect(required('[data-action="launch"]').textContent).toBe(
      "Start new game",
    );
    expect(second.controller.snapshot().phase).toBe("RESUMABLE");
    press("front-back");
    // Delete save is out of the stack, at the foot of the screen.
    const remove = required('.v7-menu-footer [data-action="delete-save"]');
    expect(remove.textContent).toBe("Delete save");
    remove.click();
    await waitUntil(() => second.controller.snapshot().phase === "EMPTY");
    await settle();
    expect(document.querySelector('[data-action="resume"]')).toBeNull();
    expect(focused()).toBe("new-game");
  });

  it("Save & quit in a match returns to the menu with Continue selected", async () => {
    const mounted = mount();
    press("new-game");
    press("launch");
    await waitUntil(() => mounted.controller.snapshot().phase === "ACTIVE");
    await waitUntil(
      () => document.querySelector('[data-action="compact-menu"]') !== null,
    );
    press("compact-menu");
    expect(required('[data-action="main-menu"]').textContent).toBe(
      "Save & quit",
    );
    press("main-menu");
    await waitUntil(() => mounted.controller.snapshot().phase === "RESUMABLE");
    await settle();
    expect(required(".v7-front-screen").dataset.v7Front).toBe("menu");
    expect(focused()).toBe("resume");
    press("resume");
    await waitUntil(() => mounted.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-front-shell")).toBeNull();
  });

  it("keeps the plain logo for the LEGACY art set, whose art the scene is not", () => {
    mount({ artSet: "LEGACY" });
    const brand = required(".v7-brand");
    expect(brand.classList.contains("v7-title")).toBe(false);
    expect(document.querySelector(".v7-title-scene")).toBeNull();
    expect(brand.querySelector("h1")?.textContent).toBe("Pulp Wars");
    required('[data-action="front-settings"]');
  });
});
