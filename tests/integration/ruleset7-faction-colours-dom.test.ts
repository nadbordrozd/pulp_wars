// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";

/**
 * Faction colours (bead pulp_wars-b5f.4): the setup offers no colour, and
 * the interface shows each player in its faction's permanent colour.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 faction colours in the interface", () => {
  it("offers no colour choice and launches with the engine's first seat colour", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    expect(document.getElementById("v7-color")).toBeNull();
    expect(
      [...document.querySelectorAll(".v7-setup-form label")].some((label) =>
        /colou?r/i.test(label.textContent ?? ""),
      ),
    ).toBe(false);
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup.humanColor).toBe("CORAL");
    app.destroy();
  });

  it("draws every leaderboard row in its faction's colour", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    choose("v7-ai-count", "3");
    choose("v7-map-type", "SHOWCASE");
    choose("v7-faction-0", "DWARF");
    choose("v7-faction-1", "MARTIAN");
    choose("v7-faction-2", "ICE_FOLK");
    choose("v7-faction-3", "UNDEAD");
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("public view missing");
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="leaderboard"]').click();
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ];
    expect(rows).toHaveLength(4);
    const shown = rows.map((row) => ({
      faction: row.dataset.faction,
      colour: row.style.getPropertyValue("--player"),
      swatch: row.querySelector(".v7-player-swatch") !== null,
    }));
    expect(shown).toEqual(
      view.leaderboard.map((entry) => ({
        faction: entry.faction.toLowerCase(),
        colour: FACTION_COLOURS_V7[entry.faction],
        swatch: true,
      })),
    );
    expect(new Set(shown.map((row) => row.colour)).size).toBe(4);
    // The seat colour data hook is gone.
    expect(rows.every((row) => row.dataset.color === undefined)).toBe(true);
    app.destroy();
  });
});

function choose(id: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing #${id}`);
  select.value = value;
  if (select.value !== value) throw new Error(`#${id} has no ${value}`);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function requiredButton(selector: string): HTMLButtonElement {
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
