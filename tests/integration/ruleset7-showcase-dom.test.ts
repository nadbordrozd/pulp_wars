// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";

/**
 * Revision 18 section 5.6 (`pulp_wars-6gd.3`): the Showcase setup option. It
 * is the last Map choice, forces 16 x 16, hides the seed control, and gives
 * both back when another map is chosen.
 */

const DESCRIPTION =
  "A fixed demo map: three developed cities, every unit, all technology, map revealed.";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 Showcase setup option", () => {
  it("is the last Map option, described, with Continents still the default", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const map = requiredSelect("v7-map-type");
    expect([...map.options].map((option) => option.value)).toEqual([
      "DRY_LAND",
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
      "SHOWCASE",
    ]);
    expect(map.options[map.options.length - 1]?.textContent).toBe("Showcase");
    expect(map.value).toBe("CONTINENTS");
    expect(description()).toBe("Two or three large landmasses.");
    expect(requiredSelect("v7-board-size").disabled).toBe(false);
    expect(seedChoice().hidden).toBe(false);
    expect(form().dataset.v7Showcase).toBe("false");
    choose("v7-map-type", "SHOWCASE");
    expect(description()).toBe(DESCRIPTION);
    expect(form().dataset.v7Showcase).toBe("true");
    app.destroy();
  });

  it("forces 16 × 16 and hides the seed control, then restores both", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const size = requiredSelect("v7-board-size");
    const map = requiredSelect("v7-map-type");
    const launch = requiredButton('[data-action="launch"]');
    // The player's own choices: 20 x 20 and a typed seed.
    choose("v7-board-size", "20");
    requiredButton('[data-action="seed-mode-seed"]').click();
    requiredInput("v7-seed").value = "77";

    choose("v7-map-type", "SHOWCASE");
    // The form is updated in place: no control is replaced.
    expect(requiredSelect("v7-board-size")).toBe(size);
    expect(requiredSelect("v7-map-type")).toBe(map);
    expect(requiredButton('[data-action="launch"]')).toBe(launch);
    expect([...size.options].map((option) => option.value)).toEqual(["16"]);
    expect(size.value).toBe("16");
    expect(size.options[0]?.textContent).toBe("16 × 16");
    expect(size.disabled).toBe(true);
    expect(seedChoice().hidden).toBe(true);

    // Opponents, Mode and the faction selects keep working (the colour
    // choice is gone: a faction's colour is fixed, bead pulp_wars-b5f.4), and
    // changing them does not undo the forced size.
    choose("v7-ai-count", "3");
    expect(document.querySelectorAll("[data-v7-factions] select")).toHaveLength(
      4,
    );
    choose("v7-ai-mode", "COOPERATIVE");
    expect(document.getElementById("v7-color")).toBeNull();
    choose("v7-faction-0", "GOBLIN");
    expect([...size.options].map((option) => option.value)).toEqual(["16"]);
    expect(size.disabled).toBe(true);
    expect(seedChoice().hidden).toBe(true);
    choose("v7-ai-count", "1");

    choose("v7-map-type", "LAKES");
    expect(description()).toBe("Mostly land, broken up by lakes.");
    expect(size.disabled).toBe(false);
    expect([...size.options].map((option) => option.value)).toEqual([
      "11",
      "14",
      "16",
      "20",
      "25",
    ]);
    // The earlier size and seed choice come back.
    expect(size.value).toBe("20");
    expect(seedChoice().hidden).toBe(false);
    expect(seedChoice().dataset.seedMode).toBe("seed");
    expect(requiredInput("v7-seed").value).toBe("77");
    expect(requiredInput("v7-seed").closest("label")?.hidden).toBe(false);
    app.destroy();
  });

  it("launches a 16 × 16 Showcase with a valid seed whatever the hidden seed field holds", async () => {
    const randomSeed = vi.fn(() => 123);
    const app = bootstrapRuleset7App(document, { storage: null, randomSeed });
    requiredButton('[data-action="seed-mode-seed"]').click();
    requiredInput("v7-seed").value = "not a seed";
    choose("v7-ai-count", "2");
    choose("v7-map-type", "SHOWCASE");
    choose("v7-faction-0", "UNDEAD");
    choose("v7-faction-1", "GOBLIN");
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector("#v7-alert")?.textContent ?? "").toBe("");
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("public view missing");
    expect(view.setup).toMatchObject({
      mapType: "SHOWCASE",
      width: 16,
      height: 16,
      seed: 0,
      aiCount: 2,
      factions: ["UNDEAD", "GOBLIN", "ORIGINAL"],
    });
    expect(randomSeed).not.toHaveBeenCalled();
    expect(
      view.units.filter((unit) => unit.ownerId === view.viewer.id),
    ).toHaveLength(10);
    expect(
      view.cities.filter((city) => city.ownerId === view.viewer.id),
    ).toHaveLength(3);
    expect(view.viewer.researchedTechs).toHaveLength(23);
    expect(view.board.tiles.every((tile) => tile.explored)).toBe(true);
    app.destroy();
  });

  it("saves, resumes with the Showcase label, and restarts the same setup", async () => {
    const app = bootstrapRuleset7App(document);
    choose("v7-map-type", "SHOWCASE");
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const launched = app.controller.snapshot().view;
    if (launched === null) throw new Error("public view missing");
    expect(launched.viewer.coins).toBe(21);
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    // In a match the map label reads "Showcase".
    expect(document.querySelector(".v7-resume-summary")?.textContent).toBe(
      "Turn 1 · 21 coins · Showcase",
    );
    app.destroy();

    // A fresh page load reads the stored Showcase match back.
    document.body.innerHTML = '<div id="app"></div>';
    const next = bootstrapRuleset7App(document);
    await waitUntil(() => next.controller.snapshot().phase === "RESUMABLE");
    requiredButton('[data-action="resume"]').click();
    await waitUntil(
      () =>
        next.controller.snapshot().phase === "ACTIVE" &&
        !next.controller.snapshot().transitioning,
    );
    const resumed = next.controller.snapshot().view;
    expect(resumed?.setup).toEqual(launched.setup);
    expect(resumed?.units).toEqual(launched.units);
    expect(resumed?.cities).toEqual(launched.cities);

    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    requiredButton('[data-action="restart"]').click();
    await waitUntil(
      () =>
        next.controller.snapshot().phase === "ACTIVE" &&
        !next.controller.snapshot().transitioning,
    );
    const restarted = next.controller.snapshot().view;
    expect(restarted?.setup).toEqual(launched.setup);
    expect(restarted?.commandIndex).toBe(0);
    expect(
      restarted?.units.filter((unit) => unit.ownerId === restarted.viewer.id),
    ).toHaveLength(10);
    next.destroy();
  });
});

function form(): HTMLFormElement {
  const node = document.querySelector<HTMLFormElement>(".v7-setup-form");
  if (node === null) throw new Error("Missing setup form");
  return node;
}

function seedChoice(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".v7-seed-choice");
  if (node === null) throw new Error("Missing seed choice");
  return node;
}

function description(): string {
  return document.querySelector(".v7-map-type-description")?.textContent ?? "";
}

function choose(id: string, value: string): void {
  const select = requiredSelect(id);
  select.value = value;
  if (select.value !== value) throw new Error(`#${id} has no ${value}`);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function requiredSelect(id: string): HTMLSelectElement {
  const node = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function requiredInput(id: string): HTMLInputElement {
  const node = document.querySelector<HTMLInputElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
