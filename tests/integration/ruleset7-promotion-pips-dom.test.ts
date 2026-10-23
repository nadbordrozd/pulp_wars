// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { GROWTH_KILLS_V7 } from "../../src/engine/index";
import { growthChipTextV7 } from "../../src/render/dinosaur-presentation-v7";
import { required, requiredElement, rig } from "../fixtures/v7-dom-rig";
import {
  DINOSAUR_SHOWCASE_V7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import {
  UNIT_CARD_UI_V7,
  unitCardFixtureV7,
  unitCardPromotionFixtureV7,
} from "../fixtures/v7-unit-card";
import {
  closeDetailsV7,
  openUnitDetailsV7,
} from "../fixtures/v7-unit-card-dom";

/**
 * Bead pulp_wars-2yc.106: every unit that can be Promoted shows its kills
 * toward the Promotion as three small pips beside its name in the dock, lit
 * per kill; a tap explains them like a status chip. A veteran, a dinosaur
 * (it grows instead, and keeps its growth chip) and an Egg show none.
 */

const AT = UNIT_CARD_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function select(scene: ReturnType<typeof rig>, at: CoordV7): void {
  const unit = scene.unitAt(at);
  scene.host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
}

const pips = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    ".v7-selection-dock .v7-identity-head > .v7-promotion-pips",
  );

const lit = (element: HTMLElement): readonly string[] =>
  [...element.querySelectorAll<HTMLElement>(".v7-promotion-pip")].map(
    (pip) => pip.dataset.lit ?? "",
  );

const popover = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".v7-status-popover");

const GAIN = "+5 maximum HP and a full heal";

describe("Promotion pips", () => {
  it("shows two of three kills beside the name and explains them on a tap", () => {
    const scene = rig(unitCardPromotionFixtureV7());
    select(scene, AT.plain);
    const row = required(pips());
    expect(lit(row)).toEqual(["true", "true", "false"]);
    expect(row.dataset.kills).toBe("2");
    expect(row.dataset.ready).toBeUndefined();
    expect(row.getAttribute("role")).toBe("button");
    expect(row.tabIndex).toBe(0);
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.getAttribute("aria-label")).toBe(
      `Promotion: 2 of 3 kills. At 3 kills it can be promoted once: ${GAIN}.`,
    );
    // It sits in the head, in the name's row: no chip row is added for it,
    // and the HP keeps its own text.
    const head = requiredElement<HTMLElement>(
      ".v7-selection-dock .v7-identity-head",
    );
    expect(head.dataset.promotion).toBe("true");
    expect(document.querySelector(".v7-unit-status-cues")).toBeNull();
    expect(head.querySelector(".v7-unit-hp")?.textContent).toBe("12/12");

    row.click();
    const open = required(popover());
    expect(open.dataset.statusPopover).toBe("promotion");
    expect(open.getAttribute("aria-label")).toBe("Promotion: 2 of 3 kills");
    expect(open.querySelector(".v7-status-popover-title")?.textContent).toBe(
      "Promotion: 2 of 3 kills",
    );
    expect(open.querySelector(".v7-status-popover-effect")).toBeNull();
    expect(open.querySelector(".v7-status-popover-text")?.textContent).toBe(
      `At 3 kills it can be promoted once: ${GAIN}.`,
    );
    expect(required(pips()).getAttribute("aria-expanded")).toBe("true");
    // A press on the pips is not a press outside; a second tap closes it.
    required(pips()).dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(popover()).not.toBeNull();
    required(pips()).click();
    expect(popover()).toBeNull();
    // Enter opens it from the keyboard; a press outside closes it.
    required(pips()).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(popover()).not.toBeNull();
    requiredElement<HTMLElement>(".v7-selection-dock h2").dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    );
    expect(popover()).toBeNull();
    expect(required(pips()).getAttribute("aria-expanded")).toBe("false");
    scene.app.destroy();
  });

  it("names the count in the unit's details", () => {
    const scene = rig(unitCardPromotionFixtureV7());
    select(scene, AT.plain);
    const details = openUnitDetailsV7();
    const note = required(
      details.querySelector<HTMLElement>(
        '.v7-unit-status-notes [data-tactical-state="promotion"]',
      ),
    );
    expect(note.querySelector("strong")?.textContent).toBe(
      "Promotion: 2 of 3 kills",
    );
    expect(note.querySelector("span")?.textContent).toContain("promoted");
    closeDetailsV7();
    scene.app.destroy();
  });

  it("shows no kills on a fresh unit and every pip on a rival that waits", () => {
    const fresh = rig(unitCardFixtureV7());
    select(fresh, AT.plain);
    expect(lit(required(pips()))).toEqual(["false", "false", "false"]);
    expect(required(pips()).getAttribute("aria-label")).toBe(
      `Promotion: 0 of 3 kills. At 3 kills it can be promoted once: ${GAIN}.`,
    );
    fresh.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const scene = rig(unitCardPromotionFixtureV7());
    select(scene, AT.enemy);
    const row = required(pips());
    expect(lit(row)).toEqual(["true", "true", "true"]);
    expect(row.dataset.ready).toBe("true");
    expect(row.getAttribute("aria-label")).toBe(
      `Promotion: 3 of 3 kills. It can be promoted now: ${GAIN}.`,
    );
    // Its Shield chip keeps its row.
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-unit-status-cues [data-unit-status]",
        ),
      ].map((chip) => chip.dataset.unitStatus),
    ).toEqual(["shield"]);
    scene.app.destroy();
  });

  it("shows none on a veteran, a dinosaur that grows, or an Egg", () => {
    const scene = rig(unitCardPromotionFixtureV7());
    select(scene, AT.inspired);
    expect(pips()).toBeNull();
    expect(
      requiredElement<HTMLElement>(".v7-selection-dock .v7-identity-head")
        .dataset.promotion,
    ).toBeUndefined();
    expect(
      document.querySelector(
        '.v7-unit-status-cues [data-unit-status="veteran"]',
      )?.textContent,
    ).toBe("Veteran");
    scene.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const dinosaurs = rig(dinosaurShowcaseFixtureV7());
    select(dinosaurs, DINOSAUR_SHOWCASE_V7.ankylosaurus);
    expect(pips()).toBeNull();
    // The dinosaur's own count is unchanged.
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-selection-dock .v7-dinosaur-chip",
        ),
      ].map((chip) => [chip.dataset.unitStatus, chip.textContent]),
    ).toContainEqual(["growth", growthChipTextV7(0, GROWTH_KILLS_V7[0])]);
    select(dinosaurs, DINOSAUR_SHOWCASE_V7.tRexEgg);
    expect(pips()).toBeNull();
    dinosaurs.app.destroy();
  });

  it("keeps the pips in the name's row on a phone, over the ?", () => {
    const css = readFileSync("src/styles/v7.css", "utf8");
    const phone = css.slice(css.indexOf("@media (max-width: 800px) {"));
    const head =
      '.v7-selection-dock[data-card="compact"][data-selection-kind="unit"]\n    > .v7-identity\n    > .v7-identity-head[data-promotion="true"] {';
    const rule = phone.slice(phone.indexOf(head));
    expect(phone).toContain(head);
    expect(rule.slice(0, rule.indexOf("}"))).toContain(
      'grid-template-areas:\n      "name pips"\n      "line help";',
    );
  });
});
