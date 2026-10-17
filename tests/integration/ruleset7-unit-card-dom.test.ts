// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { statSumTextV7 } from "../../src/render/unit-card-presentation-v7";
import { required, requiredElement, rig } from "../fixtures/v7-dom-rig";
import { UNIT_CARD_UI_V7, unitCardFixtureV7 } from "../fixtures/v7-unit-card";
import {
  closeDetailsV7,
  openDockDetailsV7,
  openUnitDetailsV7,
} from "../fixtures/v7-unit-card-dom";

/**
 * The compact unit card (bead pulp_wars-2yc.86, docs/ui/SCREEN_FLOW.md
 * "Compact unit card"): the selected unit's dock is its portrait, name,
 * HP, status chips and actions; the "?" opens the details (role, faction,
 * the six stats, ability sentences); a status chip's popover says what it
 * does to the numbers, exactly. A city's dock likewise keeps its numbers
 * and production and puts the rest in its details.
 */

const AT = UNIT_CARD_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function select(scene: ReturnType<typeof rig>, at: CoordV7): number {
  const unit = scene.unitAt(at);
  scene.host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit.id;
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const chip = (status: string): HTMLElement =>
  requiredElement<HTMLElement>(
    `.v7-selection-dock .v7-unit-status-cues [data-unit-status="${status}"]`,
  );

const popover = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".v7-status-popover");

describe("Compact unit card", () => {
  it("shows a plain unit as portrait, name, HP and actions only", () => {
    const scene = rig(unitCardFixtureV7());
    select(scene, AT.plain);
    const card = dock();
    expect(card.dataset.card).toBe("compact");
    const identity = requiredElement<HTMLElement>(
      ".v7-selection-dock > .v7-identity",
    );
    expect(identity.classList.contains("v7-identity-compact")).toBe(true);
    expect(identity.querySelector(".v7-identity-art")).not.toBeNull();
    expect(identity.querySelector("h2")?.textContent).toBe("Fighter");
    const hp = required(identity.querySelector<HTMLElement>(".v7-unit-hp"));
    expect(hp.textContent).toBe("12/12");
    expect(hp.getAttribute("aria-label")).toBe("HP 12 of 12");
    expect(hp.querySelector<HTMLElement>(".v7-unit-hp-fill")?.style.width).toBe(
      "100%",
    );
    // No chips, no role, no faction, no stats, no ability sentence.
    expect(card.querySelector(".v7-unit-status-cues")).toBeNull();
    for (const selector of [
      ".v7-tactical-role",
      ".v7-faction-chip",
      ".v7-identity-owner",
      ".v7-unit-stats",
      ".v7-stat",
      ".v7-giant-signature",
      ".v7-glossary-list",
    ])
      expect(card.querySelector(selector), selector).toBeNull();
    expect(
      [...card.querySelectorAll<HTMLElement>(".v7-context-action")].map(
        (action) => action.dataset.action,
      ),
    ).toEqual([
      "command-disband",
      "command-wait",
      "command-build_field_defense",
    ]);
    scene.app.destroy();
  });

  it("keeps a phone's unit card one slim row whose actions scroll sideways", () => {
    const scene = rig(unitCardFixtureV7());
    select(scene, AT.plain);
    // The name, its "?" and the HP form the head beside the portrait.
    const head = requiredElement<HTMLElement>(
      ".v7-selection-dock > .v7-identity > .v7-identity-head",
    );
    expect(
      [...head.children].map((child) => child.className.split(" ")[0]),
    ).toEqual(["", "v7-unit-help", "v7-unit-hp"]);
    expect(head.querySelector("h2")?.textContent).toBe("Fighter");
    scene.app.destroy();
    // The narrow-screen rules: the identity's parts join the dock's grid,
    // and the action row never wraps.
    const css = readFileSync("src/styles/v7.css", "utf8");
    const phone = css.slice(css.indexOf("@media (max-width: 800px) {"));
    const unit =
      '.v7-selection-dock[data-card="compact"][data-selection-kind="unit"]';
    expect(phone).toContain(
      `${unit}\n    > .v7-identity {\n    display: contents;`,
    );
    const actions = phone.slice(
      phone.indexOf(`${unit}\n    > .v7-context-actions {`),
    );
    expect(actions.slice(0, actions.indexOf("}"))).toMatch(
      /flex-wrap: nowrap;[\s\S]*overflow-x: auto;/,
    );
  });

  it("opens the details: role, the six stats and the ability sentences", () => {
    const scene = rig(unitCardFixtureV7());
    select(scene, AT.inspired);
    const details = openUnitDetailsV7();
    expect(details.getAttribute("aria-modal")).toBe("true");
    expect(details.querySelector("h2")?.textContent).toBe("Knight");
    expect(details.querySelector(".v7-tactical-role")?.textContent).toBe(
      "Breakthrough",
    );
    expect(
      [...details.querySelectorAll<HTMLElement>(".v7-unit-stats .v7-stat")].map(
        (row) => row.dataset.stat,
      ),
    ).toEqual(["hp", "attack", "defense", "move", "range", "sight"]);
    // The terms are read here (not buttons any more): Veteran's +5 HP and
    // Inspired's +1 Attack.
    expect(
      [...details.querySelectorAll<HTMLElement>(".v7-stat-modifier")].map(
        (term) => [term.tagName, term.dataset.modifierSource, term.textContent],
      ),
    ).toEqual([
      ["SPAN", "promotion", "+5"],
      ["SPAN", "inspired", "+1"],
    ]);
    // Its ability, then what its chips mean.
    expect(
      details.querySelector('.v7-unit-ability[data-glossary="OVERRUN"]'),
    ).not.toBeNull();
    expect(
      [
        ...details.querySelectorAll<HTMLElement>(
          ".v7-unit-status-notes [data-tactical-state]",
        ),
      ].map((note) => note.dataset.tacticalState),
    ).toEqual(["idle-recovery", "inspired", "veteran"]);
    closeDetailsV7();
    expect(document.querySelector(".v7-unit-help-dialog")).toBeNull();
    scene.app.destroy();
  });

  it("lists the statuses as chips whose popovers give the exact numbers", () => {
    const scene = rig(unitCardFixtureV7());
    const knightId = select(scene, AT.inspired);
    expect(
      [
        ...dock().querySelectorAll<HTMLElement>(
          ".v7-unit-status-cues [data-unit-status]",
        ),
      ].map((cue) => [cue.dataset.unitStatus, cue.textContent]),
    ).toEqual([
      ["idle-recovery", "+4 at End Turn if idle"],
      ["inspired", "Inspired"],
      ["veteran", "Veteran"],
    ]);
    const inspired = chip("inspired");
    expect(inspired.getAttribute("role")).toBe("button");
    expect(inspired.tabIndex).toBe(0);
    expect(inspired.getAttribute("aria-expanded")).toBe("false");
    expect(popover()).toBeNull();

    inspired.click();
    const stats = required(
      scene.controller
        .snapshot()
        .view?.unitStats.find((entry) => entry.unitId === knightId),
    );
    const attack = required(stats.stats.find((entry) => entry.id === "ATTACK"));
    const sum = required(statSumTextV7(attack));
    const base = attack.base.value.numerator / attack.base.value.denominator;
    expect(sum).toBe(`Attack ${base} + 1 = ${base + 1}`);
    const open = required(popover());
    expect(open.getAttribute("role")).toBe("dialog");
    expect(open.getAttribute("aria-label")).toBe("Inspired");
    expect(open.querySelector(".v7-status-popover-title")?.textContent).toBe(
      "Inspired",
    );
    expect(
      [...open.querySelectorAll<HTMLElement>(".v7-status-popover-effect")].map(
        (line) => [
          line.dataset.effectStat,
          line.querySelector(".v7-status-popover-change")?.textContent,
          line.querySelector(".v7-status-popover-sum")?.textContent,
        ],
      ),
    ).toEqual([["attack", "+1 Attack", sum]]);
    expect(open.querySelector(".v7-status-popover-text")?.textContent).toBe(
      "Its next attack this turn hits harder.",
    );
    // It floats beside the dock, not inside it (the dock may scroll).
    expect(dock().contains(open)).toBe(false);
    expect(chip("inspired").getAttribute("aria-expanded")).toBe("true");

    // A second chip: Veteran's HP.
    chip("veteran").click();
    const veteran = required(popover());
    expect(veteran.getAttribute("aria-label")).toBe("Veteran");
    expect(veteran.textContent).toContain("+5 Max HP");
    expect(veteran.textContent).toContain("Max HP 13 + 5 = 18");
    expect(chip("inspired").getAttribute("aria-expanded")).toBe("false");

    // A tap on the chip again closes it.
    chip("veteran").click();
    expect(popover()).toBeNull();

    // A chip that changes no number on the card: its one sentence only.
    chip("idle-recovery").click();
    expect(popover()?.querySelector(".v7-status-popover-effect")).toBeNull();
    expect(
      popover()?.querySelector(".v7-status-popover-text")?.textContent,
    ).toBe(chip("idle-recovery").title);

    // A press outside closes it; one on the popover does not.
    required(popover()).dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    );
    expect(popover()).not.toBeNull();
    requiredElement<HTMLElement>(".v7-selection-dock h2").dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    );
    expect(popover()).toBeNull();
    expect(chip("idle-recovery").getAttribute("aria-expanded")).toBe("false");

    // Enter opens it from the keyboard and Escape closes it.
    chip("inspired").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(popover()?.getAttribute("aria-label")).toBe("Inspired");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(popover()).toBeNull();
    // Escape closed only the popover: the unit stays selected.
    expect(document.querySelector(".v7-selection-dock h2")?.textContent).toBe(
      "Knight",
    );

    // Another selection closes it too.
    chip("inspired").click();
    select(scene, AT.plain);
    expect(popover()).toBeNull();
    scene.app.destroy();
  });

  it("shows an enemy unit with its Shield chip and no actions", () => {
    const scene = rig(unitCardFixtureV7());
    select(scene, AT.enemy);
    const card = dock();
    expect(card.dataset.card).toBe("compact");
    expect(card.dataset.hasActions).toBe("false");
    expect(card.querySelector(".v7-identity-owner")).toBeNull();
    expect(card.querySelector(".v7-unit-hp")?.textContent).toBe("8/8");
    expect(chip("shield").textContent).toBe("Shield 2 / 2");
    chip("shield").click();
    expect(popover()?.textContent).toContain("Takes damage before HP.");
    // Its owner, faction and stats are in the details.
    const details = openUnitDetailsV7();
    expect(details.querySelector(".v7-identity-owner")?.textContent).toBe(
      "Martians",
    );
    expect(details.querySelector(".v7-faction-chip")?.textContent).toBe(
      "Martian",
    );
    expect(details.querySelector('[data-stat="shield"]')).not.toBeNull();
    scene.app.destroy();
  });

  it("keeps a city's numbers and production, and puts the rest in its details", () => {
    const scene = rig(unitCardFixtureV7());
    const capital = required(
      scene.view.cities.find(
        (city) => city.isCapital && city.ownerId === scene.view.viewer.id,
      ),
    );
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const card = dock();
    expect(card.dataset.card).toBe("compact");
    const stats = requiredElement<HTMLElement>(
      ".v7-selection-dock > .v7-identity > .v7-city-stats",
    );
    expect(
      [...stats.children].map((row) => row.getAttribute("data-stat")),
    ).toEqual(["level", "population", "units", "income"]);
    expect(card.querySelectorAll(".v7-train-card").length).toBeGreaterThan(0);
    const details = openDockDetailsV7();
    expect(details.getAttribute("aria-modal")).toBe("true");
    expect(details.querySelector("h2")?.textContent).toBe(
      card.querySelector("h2")?.textContent,
    );
    expect(
      [...(details.querySelector(".v7-city-stats")?.children ?? [])].map(
        (row) => row.getAttribute("data-stat"),
      ),
    ).toContain("city-action");
    // Escape closes the details and leaves the city selected.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector(".v7-dock-details-dialog")).toBeNull();
    expect(document.querySelector(".v7-selection-dock")).not.toBeNull();
    scene.app.destroy();
  });
});
