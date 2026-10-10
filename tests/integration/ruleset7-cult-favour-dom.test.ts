// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  favourOfV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { cultFieldV7, withFarmsV7 } from "../fixtures/v7-cult";
import { requiredElement, rig, waitUntil } from "../fixtures/v7-dom-rig";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult's Favour in the DOM (`pulp_wars-mch9.4`): the engine offers a
 * Sacrifice, a Seizure, and an Offering, and the dock shows them with its
 * generic action buttons until the interface bead (`pulp_wars-mch9.17`)
 * gives them their own targeting and the Favour its place in the HUD. This
 * holds the stand-in to three things: nothing throws, a button is named by
 * its victim's unit and what it pays (never a raw command, ID, or tile), and
 * pressing it plays the command and its new events through the app.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

/**
 * A Cult player (seat 0, the human): a Summoner with an Initiate and the
 * Thing beside it and a broken Human Knight between the Summoner and the
 * Initiate; its capital is level 2 with 2 population.
 */
function favourMatch(): GameStateV7 {
  return withFarmsV7(
    cultFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 0, role: "JUGGERNAUT", at: at(4, 1) },
      { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 5 },
    ]),
    0,
    2,
  );
}

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

/** What a player reads or hears of a button: no raw ID, command, or tile. */
function expectPlainWords(button: HTMLElement): void {
  const words = [
    button.textContent ?? "",
    button.title,
    button.getAttribute("aria-label") ?? "",
    button.getAttribute("aria-description") ?? "",
  ].join(" | ");
  expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(words).not.toMatch(/SACRIFICE|SEIZE|OFFERING|undefined|null|NaN/);
}

describe("the dock's stand-in for the Cult's offerings", () => {
  it("names a Sacrifice and a Seizure by the victim's unit and its Favour", () => {
    const scene = rig(favourMatch());
    select(scene, at(5, 2));
    const sacrifice = [
      ...dock().querySelectorAll<HTMLButtonElement>(
        '[data-action="command-sacrifice"]',
      ),
    ];
    // One button for the Thing beside it (the Initiate is two tiles away).
    expect(
      sacrifice.map((button) => [
        button.querySelector(".v7-action-label")?.textContent,
        button.querySelector(".v7-economy-chip")?.textContent,
      ]),
    ).toEqual([["Sacrifice Thing in the Cellar", "+12 Favour"]]);
    const seize = [
      ...dock().querySelectorAll<HTMLButtonElement>(
        '[data-action="command-seize"]',
      ),
    ];
    expect(
      seize.map((button) => [
        button.querySelector(".v7-action-label")?.textContent,
        button.querySelector(".v7-economy-chip")?.textContent,
      ]),
    ).toEqual([["Seize Knight", "+18 Favour"]]);
    for (const button of [...sacrifice, ...seize]) {
      expect(button.disabled).toBe(false);
      expect(button.title.length).toBeGreaterThan(20);
      expectPlainWords(button);
    }
    expect(sacrifice[0]?.getAttribute("aria-label")).toBe(
      "Sacrifice Thing in the Cellar · +12 Favour",
    );
    scene.app.destroy();
  });

  it("plays a Seizure from its button, and the events through the app", async () => {
    const scene = rig(favourMatch());
    select(scene, at(5, 2));
    requiredElement<HTMLButtonElement>('[data-action="command-seize"]').click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "SEIZE" });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(favourOfV7(view, view.viewer.id)).toBe(18);
    expect(view.units.some((unit) => unit.role === "KNIGHT")).toBe(false);
    // Nothing on the page names a raw event or cause.
    expect(document.body.textContent ?? "").not.toMatch(
      /UNIT_SEIZED|FAVOUR_GAINED|UNIT_DIED|SACRIFICED|Unit seized|Favour gained/,
    );
    // The Summoner has acted: no second offering.
    select(scene, at(5, 2));
    expect(
      dock().querySelector(
        '[data-action="command-seize"], [data-action="command-sacrifice"]',
      ),
    ).toBeNull();
    scene.app.destroy();
  });

  it("plays a Sacrifice from its button", async () => {
    const scene = rig(favourMatch());
    select(scene, at(5, 2));
    requiredElement<HTMLButtonElement>(
      '[data-action="command-sacrifice"]',
    ).click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({ kind: "SACRIFICE" });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(favourOfV7(view, view.viewer.id)).toBe(12);
    expect(view.units.some((unit) => unit.role === "JUGGERNAUT")).toBe(false);
    scene.app.destroy();
  });

  it("offers the Offering in the city panel, with what it pays and costs", async () => {
    const scene = rig(favourMatch());
    const capital = scene.view.cities.find(
      (city) => city.ownerId === scene.view.viewer.id,
    );
    if (capital === undefined) throw new Error("no Cult capital");
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const offering = requiredElement<HTMLButtonElement>(
      '[data-action="command-offering"]',
    );
    expect(offering.querySelector(".v7-action-label")?.textContent).toBe(
      "Offering",
    );
    expect(offering.querySelector(".v7-economy-chip")?.textContent).toBe(
      "+3 Favour · −2 population",
    );
    expectPlainWords(offering);
    offering.click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "OFFERING",
      cityId: capital.id,
    });
    const view = scene.controller.snapshot().view;
    if (view === null) throw new Error("no view");
    expect(favourOfV7(view, view.viewer.id)).toBe(3);
    expect(view.cities.find((city) => city.id === capital.id)).toMatchObject({
      population: 0,
      offeredPopulation: 2,
    });
    // The city action is spent: no second Offering, and no training.
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    expect(
      document.querySelector('[data-action="command-offering"]'),
    ).toBeNull();
    scene.app.destroy();
  });

  it("shows the Summoner's and the Chosen's new abilities in plain words", () => {
    const scene = rig(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 2) },
      ]),
    );
    for (const where of [at(5, 2), at(6, 2)]) {
      select(scene, where);
      expect(dock().textContent ?? "").not.toMatch(
        /SACRIFICE|SEIZE|MARTYR|SUMMONER_SUPPORT/,
      );
    }
    scene.app.destroy();
  });
});
