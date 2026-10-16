// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { withFavourV7 } from "../fixtures/v7-cult";
import {
  CULT_HUNGER_UI_V7,
  CULT_UI_V7,
  cultFavourUiFixtureV7,
  cultHungerUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";

/**
 * The Cult redesign's Favour display in the DOM (bead `pulp_wars-mch9.42`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 13): the HUD chip reads
 * "n / 30", is marked full at the cap and names the Heralds' Hunger in its
 * tooltip; a Sacrifice, a Seizure and an Offering say what they would lose
 * above the cap; a bound Herald's card shows "Hunger 2"; and End Turn asks
 * once when a Herald would go hungry and break loose. No match is played.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

const chip = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-match-hud .v7-favour");

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

describe("the Favour chip against the cap", () => {
  it("reads '7 / 30' and is not full", () => {
    const scene = rig(cultFavourUiFixtureV7());
    expect(chip().querySelector(".v7-favour-balance")?.textContent).toBe("7");
    expect(chip().querySelector(".v7-favour-cap")?.textContent).toBe("/ 30");
    expect(
      chip().querySelector(".v7-favour-cap")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(chip().getAttribute("aria-label")).toBe("7 of 30 Favour");
    expect(chip().dataset.full).toBeUndefined();
    expect(chip().dataset.hunger).toBeUndefined();
    expect(chip().title).not.toMatch(/Full|Hunger/);
    scene.app.destroy();
  });

  it("is marked full at the cap", () => {
    const scene = rig(withFavourV7(cultFavourUiFixtureV7(), 0, 30));
    expect(chip().textContent).toBe("30/ 30");
    expect(chip().dataset.full).toBe("true");
    expect(chip().getAttribute("aria-label")).toBe("30 of 30 Favour, full");
    expect(chip().title).toMatch(/Full: anything more is lost$/);
    scene.app.destroy();
  });

  it("names a bound Herald's Hunger in its tooltip", () => {
    const scene = rig(cultHungerUiFixtureV7(5));
    expect(chip().dataset.hunger).toBe("2");
    expect(chip().title).toMatch(/Hunger −2 a turn$/);
    expect(chip().getAttribute("aria-label")).toBe(
      "5 of 30 Favour. Hunger −2 a turn",
    );
    scene.app.destroy();
  });
});

describe("what a Sacrifice, a Seizure and an Offering lose above the cap", () => {
  it("labels each victim with the part that is lost", () => {
    const scene = rig(withFavourV7(cultFavourUiFixtureV7(), 0, 25));
    select(scene, CULT_UI_V7.summoner);
    requiredButton("cult-sacrifice").click();
    const sacrifices = boardPlan(scene.host).targets.map((target) => [
      target.previewLabel,
      target.semanticLabel,
    ]);
    expect(sacrifices).toContainEqual([
      "+12 (7 lost)",
      "Sacrifice this Thing in the Cellar: +12 Favour (7 lost). It is gone for good. Choose a unit of yours next to it",
    ]);
    // The Initiate's 2 still fit.
    expect(sacrifices.map(([label]) => label)).toContain("+2 Favour");
    requiredButton("cult-pick-cancel").click();
    requiredButton("cult-seize").click();
    expect(
      boardPlan(scene.host).targets.map((target) => target.previewLabel),
    ).toEqual(["+18 (13 lost)"]);
    scene.app.destroy();
  });

  it("adds a lost chip to the Offering", () => {
    const scene = rig(withFavourV7(cultFavourUiFixtureV7(), 0, 27));
    const capital = required(
      scene.view.cities.find((city) => city.ownerId === scene.view.viewer.id),
    );
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const offering = requiredButton("command-offering");
    expect(
      [...offering.querySelectorAll<HTMLElement>(".v7-economy-chip")].map(
        (entry) => entry.textContent,
      ),
    ).toEqual(["+6", "3 lost", "-2"]);
    expect(
      offering
        .querySelector(".v7-favour-lost-chip")
        ?.classList.contains("is-loss"),
    ).toBe(true);
    expect(offering.getAttribute("aria-label")).toBe(
      "Offering · +6 Favour (3 lost) · −2 population",
    );
    scene.app.destroy();
  });
});

describe("the Herald's Hunger", () => {
  it("shows 'Hunger 2' on the bound Herald's card", () => {
    const scene = rig(cultHungerUiFixtureV7(5));
    select(scene, CULT_HUNGER_UI_V7.herald);
    const hunger = requiredElement<HTMLElement>(
      '.v7-cult-chip[data-unit-status="hunger"]',
    );
    expect(hunger.textContent).toBe("Hunger 2");
    expect(hunger.title).toMatch(/eats 2 Favour/);
    // The Hunger bowl (ICON:HUD:CULT:HUNGER) stands before the words.
    expect(hunger.querySelector(".v7-cult-chip-icon")).not.toBeNull();
    scene.app.destroy();
  });

  it("asks once at End Turn when the next Start Turn cannot feed it", async () => {
    const scene = rig(cultHungerUiFixtureV7(1));
    requiredButton("end-turn").click();
    const dialog = requiredElement<HTMLElement>(".v7-end-turn-confirm");
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.getAttribute("aria-label")).toBe(
      "The Herald will go hungry and break loose. End turn?",
    );
    expect(
      [...dialog.querySelectorAll<HTMLElement>(".v7-cult-chip")].map(
        (entry) => [entry.dataset.unitStatus, entry.textContent],
      ),
    ).toEqual([["hunger", "Hunger 2"]]);
    expect(scene.controller.accepted).toEqual([]);
    requiredButton("end-turn-back").click();
    expect(document.querySelector(".v7-end-turn-confirm")).toBeNull();
    requiredButton("end-turn").click();
    requiredButton("end-turn-confirm").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({ kind: "END_TURN" });
    scene.app.destroy();
  });

  it("does not ask when the Favour, or the Summoner's trickle, feeds it", async () => {
    for (const fixture of [
      () => cultHungerUiFixtureV7(2),
      () => cultHungerUiFixtureV7(1, true),
    ]) {
      document.body.innerHTML = '<div id="app"></div>';
      const scene = rig(fixture());
      requiredButton("end-turn").click();
      expect(document.querySelector(".v7-end-turn-confirm")).toBeNull();
      await waitUntil(() => scene.controller.accepted.length === 1);
      scene.app.destroy();
    }
  });
});
