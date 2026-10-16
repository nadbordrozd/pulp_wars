// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type BootstrappedRuleset7App,
} from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";

/**
 * Styled pickers (bead `pulp_wars-2yc.65`): the menus show no native
 * dropdown. A list picker is a combobox button with a listbox; a short list
 * is a row of pressed buttons; the hidden select keeps the value.
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

let app: BootstrappedRuleset7App | null = null;

function boot(): BootstrappedRuleset7App {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    storage: null,
    settingsStorage: null,
    boardHost: new Host(),
    randomSeed: () => 7,
    randomDraw: () => 0,
  });
  return app;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

function key(target: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const control = (): HTMLButtonElement =>
  required<HTMLButtonElement>("#v7-map-type-control");
const list = (): HTMLElement => required("#v7-map-type-list");
const activeOption = (): string =>
  document.getElementById(control().getAttribute("aria-activedescendant") ?? "")
    ?.textContent ?? "";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  app?.destroy();
  app = null;
});

describe("Styled pickers in the menus", () => {
  it("shows no native select on the new-game, Settings and campaign screens", async () => {
    boot();
    const check = (): void => {
      const selects = [...document.querySelectorAll("select")];
      for (const field of selects) {
        expect(field.hidden, field.id).toBe(true);
        expect(field.getAttribute("aria-hidden"), field.id).toBe("true");
        expect(field.tabIndex, field.id).toBe(-1);
        const picker = field.closest(".v7-picker-field");
        expect(picker, field.id).not.toBeNull();
        expect(
          picker?.querySelector(
            '.v7-picker-button[role="combobox"], .v7-picker[role="group"]',
          ),
          field.id,
        ).not.toBeNull();
      }
    };
    press("new-game");
    press("setup-advanced");
    check();
    press("front-back");
    await settle();
    press("front-settings");
    for (const id of ["v7-motion", "v7-animation-speed", "v7-ui-scale"])
      expect(document.querySelector(`#${id}`), id).not.toBeNull();
    check();
    press("front-back");
    await settle();
    press("campaign");
    check();
  });

  it("is a labelled combobox that opens a listbox", () => {
    boot();
    press("new-game");
    press("setup-advanced");
    const button = control();
    expect(button.getAttribute("role")).toBe("combobox");
    expect(button.getAttribute("aria-haspopup")).toBe("listbox");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe("v7-map-type-list");
    expect(
      document.getElementById(button.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Map");
    expect(button.textContent).toBe("Continents");
    expect(list().hidden).toBe(true);
    // The name opens it too (the label's control is the button).
    expect(button.closest("label")?.htmlFor).toBe(button.id);
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(list().hidden).toBe(false);
    expect(list().getAttribute("role")).toBe("listbox");
    const options = [...list().querySelectorAll('[role="option"]')];
    expect(options.map((option) => option.textContent)).toEqual([
      "Dry land",
      "Pangea",
      "Continents",
      "Archipelago",
      "Lakes",
      "Showcase",
    ]);
    expect(
      options.map((option) => option.getAttribute("aria-selected")),
    ).toEqual(["false", "false", "true", "false", "false", "false"]);
    expect(activeOption()).toBe("Continents");
    button.click();
    expect(list().hidden).toBe(true);
  });

  it("moves with the arrow keys, Home, End and a letter, picks with Enter and closes with Escape", async () => {
    boot();
    press("new-game");
    press("setup-advanced");
    const button = control();
    button.focus();
    expect(key(button, "ArrowDown").defaultPrevented).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(activeOption()).toBe("Continents");
    key(button, "ArrowDown");
    expect(activeOption()).toBe("Archipelago");
    key(button, "End");
    expect(activeOption()).toBe("Showcase");
    key(button, "Home");
    expect(activeOption()).toBe("Dry land");
    key(button, "l");
    expect(activeOption()).toBe("Lakes");
    key(button, "Enter");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(required<HTMLSelectElement>("#v7-map-type").value).toBe("LAKES");
    expect(button.textContent).toBe("Lakes");
    // The form heard the change: the map's sentence follows.
    expect(required(".v7-map-type-description").textContent).toBe(
      "Mostly land, broken up by lakes.",
    );
    expect(document.activeElement).toBe(button);
    // Escape closes the list and stays on the screen.
    key(button, " ");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    key(button, "ArrowUp");
    key(button, "Escape");
    await settle();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(required<HTMLSelectElement>("#v7-map-type").value).toBe("LAKES");
    expect(required(".v7-front-screen").dataset.v7Front).toBe("setup");
    // A closed picker leaves Escape to the screen: back to the menu.
    key(button, "Escape");
    await settle();
    expect(required(".v7-front-screen").dataset.v7Front).toBe("menu");
  });

  it("skips and refuses a disabled option, and closes on a press outside", () => {
    boot();
    press("new-game");
    press("setup-advanced");
    press("ai-count-8");
    const button = control();
    button.click();
    const showcase = required('#v7-map-type-list [data-value="SHOWCASE"]');
    expect(showcase.getAttribute("aria-disabled")).toBe("true");
    expect(showcase.textContent).toBe("Showcase (up to 3 opponents)");
    key(button, "End");
    expect(activeOption()).toBe("Lakes");
    showcase.click();
    expect(required<HTMLSelectElement>("#v7-map-type").value).toBe(
      "CONTINENTS",
    );
    expect(button.getAttribute("aria-expanded")).toBe("true");
    // A press on the list keeps it open; one elsewhere closes it.
    list().dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    required(".v7-front-title").dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    );
    expect(button.getAttribute("aria-expanded")).toBe("false");
    // A click on an option picks it.
    button.click();
    required('#v7-map-type-list [data-value="PANGEA"]').click();
    expect(required<HTMLSelectElement>("#v7-map-type").value).toBe("PANGEA");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows a short list as a row of pressed buttons: Alliances, Motion and Animation speed", async () => {
    boot();
    press("new-game");
    press("setup-advanced");
    const alliances = required("#v7-ai-mode").closest<HTMLElement>("label");
    const group = alliances?.querySelector(".v7-picker");
    expect(group?.getAttribute("role")).toBe("group");
    expect(
      document.getElementById(group?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Alliances");
    expect(group?.getAttribute("title")).toBe(
      "AIs allied: every opponent is allied against you.",
    );
    expect(
      [...(group?.querySelectorAll("button") ?? [])].map((node) => [
        node.textContent,
        node.getAttribute("aria-pressed"),
      ]),
    ).toEqual([
      ["Free-for-all", "true"],
      ["AIs allied", "false"],
    ]);
    press("ai-mode-cooperative");
    expect(required<HTMLSelectElement>("#v7-ai-mode").value).toBe(
      "COOPERATIVE",
    );
    expect(
      required('[data-action="ai-mode-cooperative"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    press("front-back");
    await settle();
    press("front-settings");
    press("motion-reduced");
    await settle();
    expect(required<HTMLSelectElement>("#v7-motion").value).toBe("REDUCED");
    expect(required(".v7-app-shell").dataset.motion).toBe("reduced");
    expect(
      required('[data-action="motion-reduced"]').getAttribute("aria-pressed"),
    ).toBe("true");
    press("animation-speed-fast");
    await settle();
    expect(required<HTMLSelectElement>("#v7-animation-speed").value).toBe(
      "FAST",
    );
    // UI size is a list.
    required("#v7-ui-scale-control").click();
    required('#v7-ui-scale-list [data-value="1.25"]').click();
    await settle();
    expect(required<HTMLSelectElement>("#v7-ui-scale").value).toBe("1.25");
  });

  it("keeps a list open through a redraw of the match's Settings and picks from it", async () => {
    const running = boot();
    press("launch");
    for (let index = 0; index < 400; index += 1) {
      const snapshot = running.controller.snapshot();
      if (snapshot.phase === "ACTIVE" && !snapshot.transitioning) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    press("compact-menu");
    press("settings");
    const scale = (): HTMLButtonElement =>
      required<HTMLButtonElement>("#v7-ui-scale-control");
    const before = scale();
    before.click();
    expect(before.getAttribute("aria-expanded")).toBe("true");
    // Another setting redraws the panel; the open list stays open.
    press("high-contrast");
    await settle();
    expect(scale().getAttribute("aria-expanded")).toBe("true");
    key(scale(), "ArrowDown");
    key(scale(), "Enter");
    await settle();
    expect(required<HTMLSelectElement>("#v7-ui-scale").value).toBe("1.25");
    expect(scale().getAttribute("aria-expanded")).toBe("false");
    expect(scale().textContent).toBe("125%");
  });

  it("rings a size the setup moved by itself", () => {
    boot();
    press("new-game");
    press("setup-advanced");
    const size = required<HTMLSelectElement>("#v7-board-size");
    size.value = "11";
    size.dispatchEvent(new Event("change", { bubbles: true }));
    press("ai-count-8");
    expect(required("#v7-board-size-control").dataset.moved).toBe("true");
    expect(required(".v7-setup-note").textContent).toMatch(/^Size changed to/);
  });

  it("styles the pickers in the house style, phone-sized", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const rule = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      expect(start, selector).toBeGreaterThanOrEqual(0);
      return css.slice(start, css.indexOf("}", start));
    };
    // The Control recipe: raised plate, small ink rule, small radius and drop.
    const button = rule(".v7-picker-button");
    for (const part of [
      "background: var(--pw-surface-raised)",
      "border: var(--pw-line-w-sm) solid var(--pw-line)",
      "border-radius: var(--pw-radius-sm)",
      "box-shadow: var(--pw-shadow-sm)",
      "min-height: 44px",
    ])
      expect(button).toContain(part);
    // Hovered or open: yellow; chosen: ink.
    expect(css).toMatch(
      /\.v7-picker-button\[aria-expanded="true"\] \{\s*background: var\(--pw-yellow\);/,
    );
    expect(rule('.v7-picker-option[aria-selected="true"]')).toContain(
      "background: var(--pw-ink)",
    );
    expect(rule(".v7-picker-option")).toContain("min-height: 44px");
    expect(rule(".v7-picker-segment")).toContain("min-height: 44px");
    // The list fits a phone and scrolls inside itself.
    const listRule = rule(".v7-picker-list");
    expect(listRule).toContain("max-width: min(22rem, calc(100vw - 2rem))");
    expect(listRule).toContain("overflow-y: auto");
    expect(rule(".v7-picker-list[hidden]")).toContain("display: none");
    expect(css).toMatch(
      /\.v7-picker-field\[hidden\],\s*\.v7-picker-store \{\s*display: none;/,
    );
  });
});
