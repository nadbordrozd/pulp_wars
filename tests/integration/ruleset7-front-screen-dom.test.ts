// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { SETTINGS_STORAGE_KEY } from "../../src/persistence/index";

/**
 * The front screens (beads pulp_wars-2yc.4 and pulp_wars-2yc.9): the logo
 * over the title scene, the grouped menu with every control in its old
 * order, and the Gallery and Settings entries.
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
    // The campaign screen and back: the same scene element, not a new one.
    required<HTMLButtonElement>('[data-action="mode-campaign"]').click();
    expect(required(".v7-campaign .v7-title-scene")).toBe(scene);
    required<HTMLButtonElement>('[data-action="mode-skirmish"]').click();
    expect(required("[data-v7-setup] .v7-title-scene")).toBe(scene);
  });

  it("groups the menu without moving a control", () => {
    mount();
    expect(
      [...document.querySelectorAll(".v7-setup-heading")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual(["Players", "Map"]);
    // Reading and tab order: mode, players, map, seed, factions, Play, then
    // the entries.
    const order = [
      ...required("[data-v7-setup]").querySelectorAll<HTMLElement>(
        "button, select, input, a",
      ),
    ]
      .filter((node) => node.closest("[hidden]") === null)
      .map((node) => node.id || node.dataset.action || node.tagName);
    expect(order).toEqual([
      "mode-skirmish",
      "mode-campaign",
      "v7-ai-count",
      "v7-ai-mode",
      "v7-board-size",
      "v7-map-type",
      "v7-curiosities",
      "seed-mode-new",
      "seed-mode-seed",
      "v7-faction-0",
      "v7-faction-1",
      "launch",
      "gallery",
      "front-settings",
      "A",
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

  it("opens Settings on the front screen: motion, UI size, contrast and sound", () => {
    mount({ settingsStorage: window.localStorage });
    const entry = (): HTMLButtonElement =>
      required<HTMLButtonElement>('[data-action="front-settings"]');
    expect(entry().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("#v7-front-settings")).toBeNull();
    entry().click();
    expect(entry().getAttribute("aria-expanded")).toBe("true");
    const panel = required("#v7-front-settings");
    expect(panel.getAttribute("aria-label")).toBe("Settings");
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
    const motion = required<HTMLSelectElement>("#v7-motion");
    motion.value = "REDUCED";
    motion.dispatchEvent(new Event("change", { bubbles: true }));
    const stored = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}",
    ) as { settings?: { motion?: string; uiScale?: number } };
    expect(stored.settings).toMatchObject({ motion: "REDUCED", uiScale: 1.5 });
    required<HTMLButtonElement>('[data-action="high-contrast"]').click();
    expect(required(".v7-front-shell").dataset.contrast).toBe("high");
    // The panel stays open through its own changes, and closes on request.
    expect(document.querySelector("#v7-front-settings")).not.toBeNull();
    entry().click();
    expect(document.querySelector("#v7-front-settings")).toBeNull();
  });

  it("leaves the scene when a match starts and shows it again with Continue", async () => {
    const first = mount();
    required<HTMLButtonElement>('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-title-scene")).toBeNull();
    expect(document.querySelector(".v7-front-shell")).toBeNull();
    first.destroy();
    const second = mount();
    expect(second.controller.snapshot().phase).toBe("RESUMABLE");
    expect(document.querySelector("[data-v7-setup]")).toBeNull();
    required(".v7-front-screen > .v7-title .v7-title-scene");
    expect(required('[data-action="resume"]').classList).toContain(
      "primary-action",
    );
    expect(required(".v7-resume-summary").textContent).toContain("Turn 1");
    required('[data-action="gallery"]');
    required('[data-action="front-settings"]');
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
