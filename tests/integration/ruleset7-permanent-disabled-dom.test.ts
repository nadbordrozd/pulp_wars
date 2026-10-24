// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type {
  CoordV7,
  FactionIdV7,
  PlayerViewV7,
} from "../../src/engine/index";
import { candyFieldDefenseBlockedV7 } from "../../src/render/candy-presentation-v7";
import { dinosaurFieldDefenseBlockedV7 } from "../../src/render/dinosaur-presentation-v7";
import { disabledReasonPermanenceV7 } from "../../src/render/disabled-reasons-v7";
import { dwarfFieldDefenseBlockedV7 } from "../../src/render/dwarf-presentation-v7";
import { goblinFieldDefenseBlockedV7 } from "../../src/render/goblin-presentation-v7";
import { iceFolkFieldDefenseBlockedV7 } from "../../src/render/ice-folk-presentation-v7";
import {
  MARTIAN_FIELD_DEFENSE_EXPLANATION_V7,
  martianFieldDefenseBlockedV7,
} from "../../src/render/martian-presentation-v7";
import { goblinArenaV7 } from "../fixtures/v7-goblin-arena";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";
import { rig } from "../fixtures/v7-dom-rig";

/**
 * Bead pulp_wars-2yc.108 (the user, 2026-10-24: a greyed ability button on
 * a Martian unit said "Martians can't do X"; "we shouldn't show such
 * stuff"): the dock shows a disabled action only for a reason that can
 * change. Each state below is one where the old dock showed a greyed
 * Fortify (the faction's own predicate still says the Human Fighter's Field
 * Defense would be offered here).
 */
const GRUNT_AT: CoordV7 = { x: 8, y: 9 };
const BRAIN_AT: CoordV7 = { x: 7, y: 8 };

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

function dockActions(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      ".v7-selection-dock button[data-action]",
    ),
  ];
}

function expectNoPermanentlyDisabled(): void {
  for (const action of dockActions()) {
    if (action.getAttribute("aria-disabled") !== "true") continue;
    expect(
      disabledReasonPermanenceV7(action.dataset.disabledReason ?? ""),
      action.dataset.action,
    ).toBe("SITUATIONAL");
  }
}

describe("permanently impossible actions are not shown", () => {
  it("shows a Martian Grunt no greyed Fortify, and keeps the Brain's situational Mind Control", () => {
    const state = martianUiFieldV7([
      { seat: 0, role: "FIGHTER", at: GRUNT_AT },
      { seat: 0, role: "CAPTAIN", at: BRAIN_AT, cooldown: 2 },
    ]);
    const { host, view, unitAt } = rig(state);
    const grunt = unitAt(GRUNT_AT);
    // The old dock's condition holds: a Human Fighter would fortify here.
    expect(martianFieldDefenseBlockedV7(view, grunt.id)).toBe(true);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: grunt.id });
    expect(document.querySelector(".v7-selection-dock h2")?.textContent).toBe(
      "Grunt",
    );
    expect(
      document.querySelector('[data-action="martian-field-defense"]'),
    ).toBe(null);
    expect(
      document.querySelector(
        `[title="${MARTIAN_FIELD_DEFENSE_EXPLANATION_V7}"]`,
      ),
    ).toBe(null);
    expect(dockActions().length).toBeGreaterThan(0);
    expectNoPermanentlyDisabled();
    // A reason that passes with time still shows, disabled, with its words.
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unitAt(BRAIN_AT).id });
    const control = document.querySelector<HTMLElement>(
      '[data-action="martian-mind-control"]',
    );
    expect(control?.getAttribute("aria-disabled")).toBe("true");
    expect(control?.dataset.disabledReason).toMatch(/^Recovering: /);
    expect(control?.getAttribute("aria-label")).toMatch(
      /^Mind Control unavailable\. Recovering: /,
    );
    expectNoPermanentlyDisabled();
  });

  const cases: readonly {
    readonly faction: FactionIdV7;
    readonly blocked: (view: PlayerViewV7, unitId: number) => boolean;
  }[] = [
    { faction: "ICE_FOLK", blocked: iceFolkFieldDefenseBlockedV7 },
    { faction: "GOBLIN", blocked: goblinFieldDefenseBlockedV7 },
    { faction: "DINOSAUR", blocked: dinosaurFieldDefenseBlockedV7 },
    { faction: "DWARF", blocked: dwarfFieldDefenseBlockedV7 },
    { faction: "CANDY", blocked: candyFieldDefenseBlockedV7 },
  ];
  for (const { faction, blocked } of cases)
    it(`shows a ${faction} Fighter no greyed Fortify`, () => {
      const state = goblinArenaV7(
        [faction, "ORIGINAL"],
        [{ seat: 0, role: "FIGHTER", at: GRUNT_AT }],
      );
      const { host, view, unitAt } = rig(state);
      const fighter = unitAt(GRUNT_AT);
      expect(blocked(view, fighter.id)).toBe(true);
      host.callbacks?.onSelection({ kind: "UNIT", unitId: fighter.id });
      expect(document.querySelector('[data-action$="field-defense"]')).toBe(
        null,
      );
      expect(dockActions().length).toBeGreaterThan(0);
      expectNoPermanentlyDisabled();
    });
});
