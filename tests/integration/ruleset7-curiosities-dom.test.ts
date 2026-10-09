// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";

/**
 * Map curiosities (`pulp_wars-737.2`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 3): the setup screen's
 * "Curiosities" checkbox. It is checked by default, hidden while the
 * Showcase is the map (which launches with `curiosities: false`), and its
 * value is the launched setup's `curiosities` (the board, the dock and Help:
 * ruleset7-curiosities-ui-dom.test.ts). The Giant Spider (`pulp_wars-737.3`):
 * the browser controller plays Normal rounds with its neutral turns.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 Curiosities setup option", () => {
  it("is a checked checkbox labelled Curiosities, hidden for the Showcase and back with its choice", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const box = checkbox();
    expect(box.checked).toBe(true);
    expect(box.closest("label")?.textContent?.trim()).toBe("Curiosities");
    toggle(false);
    choose("v7-map-type", "SHOWCASE");
    expect(choice().hidden).toBe(true);
    choose("v7-map-type", "PANGEA");
    expect(choice().hidden).toBe(false);
    expect(checkbox().checked).toBe(false);
    app.destroy();
  });

  it("launches with the option on by default and off when unchecked", async () => {
    for (const checked of [true, false]) {
      document.body.innerHTML = '<div id="app"></div>';
      const app = bootstrapRuleset7App(document, {
        storage: null,
        randomSeed: () => 5,
      });
      if (!checked) toggle(false);
      button('[data-action="launch"]').click();
      await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
      const view = app.controller.snapshot().view;
      if (view === null) throw new Error("public view missing");
      expect(view.setup.curiosities).toBe(checked);
      app.destroy();
    }
  });

  it("launches the Showcase with the option off whatever the hidden checkbox says", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    expect(checkbox().checked).toBe(true);
    choose("v7-map-type", "SHOWCASE");
    button('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("public view missing");
    expect(view.setup).toMatchObject({
      mapType: "SHOWCASE",
      curiosities: false,
    });
    expect(view.curiosities).toEqual([]);
    app.destroy();
  });
});

function checkbox(): HTMLInputElement {
  const node = document.querySelector<HTMLInputElement>("#v7-curiosities");
  if (node === null || node.type !== "checkbox")
    throw new Error("Missing #v7-curiosities checkbox");
  return node;
}

function choice(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".v7-curiosities-choice");
  if (node === null) throw new Error("Missing curiosities choice");
  return node;
}

function toggle(checked: boolean): void {
  const box = checkbox();
  box.checked = checked;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

function choose(id: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing #${id}`);
  select.value = value;
  if (select.value !== value) throw new Error(`#${id} has no ${value}`);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function button(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
