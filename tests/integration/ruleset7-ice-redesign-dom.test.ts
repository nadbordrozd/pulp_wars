// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { BOARD_PICK_PANEL_MAX_BUTTONS_V7 } from "../../src/render/canvas/target-highlight-v7";
import {
  CRACK_ICE_ALREADY_ACTED_V7,
  CRACK_ICE_LABEL_V7,
} from "../../src/render/frozen-sea-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { patchFrozenUnitV7 } from "../fixtures/v7-frozen-sea";
import {
  ICE_REDESIGN_UI_V7,
  iceBuildUiFixtureV7,
  iceCrackUiFixtureV7,
} from "../fixtures/v7-ice-redesign-ui";

// The frozen sea redesign's interface (bead pulp_wars-5ti.27;
// docs/ui/BOARD_TARGETING.md section 3.5): Crack Ice's one dock button, its
// aiming on the board and its reasons; the Ice Folk have no button.

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
const at = (coord: CoordV7): string => `${coord.x},${coord.y}`;
const UI = ICE_REDESIGN_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Crack Ice: armed and picked on the board", () => {
  it("has one button, shows each ice tile with its outcome, and cracks the picked one", async () => {
    const { controller, host, app, unitAt } = rig(iceCrackUiFixtureV7());
    const warrior = unitAt(UI.cracker);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: warrior.id });
    expect(document.querySelectorAll('[data-action="crack-ice"]')).toHaveLength(
      1,
    );
    const crack = requiredButton("crack-ice");
    expect(crack.textContent).toBe(CRACK_ICE_LABEL_V7);
    expect(crack.getAttribute("aria-pressed")).toBe("false");
    // No generic button per tile.
    expect(document.querySelector('[data-action^="command-crack"]')).toBeNull();
    crack.click();
    expect(host.lastModel?.interaction.freezePick).toEqual({
      kind: "CRACK_ICE",
      unitId: warrior.id,
    });
    const panel = requiredElement<HTMLElement>('[data-v7-freeze-pick="crack"]');
    expect(panel.dataset.boardTargets).toBe("3");
    const controls = [...panel.querySelectorAll("button")].map(
      (control) => control.dataset.action,
    );
    expect(controls).toEqual(["pick-info", "freeze-pick-cancel"]);
    expect(controls.length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    expect(panel.textContent ?? "").not.toMatch(COORDINATE);
    const targets = boardPlan(host).targets;
    expect(
      targets.map((target) => [at(target.at), target.previewLabel]),
    ).toEqual([
      [at(UI.west), "Break"],
      [at(UI.middle), "Break"],
      [at(UI.frozenShip), "Free the ship"],
    ]);
    // Escape disarms and returns the focus to the button; nothing was sent.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.freezePick ?? null).toBeNull();
    expect(controller.accepted).toEqual([]);
    // Pick the frozen ship's tile: the ice breaks and the boat floats free.
    requiredButton("crack-ice").click();
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find(
          (target) => at(target.at) === at(UI.frozenShip),
        ),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "CRACK_ICE",
      unitId: warrior.id,
      at: UI.frozenShip,
    });
    const after = required(controller.snapshot().view);
    expect(after.ice.some((entry) => at(entry.at) === at(UI.frozenShip))).toBe(
      false,
    );
    await waitUntil(
      () =>
        document
          .querySelector("#v7-live")
          ?.textContent?.includes("The ice broke: the ship floats free") ===
        true,
    );
    app.destroy();
  });

  it("is disabled with its reason once the unit has acted", () => {
    const state = iceCrackUiFixtureV7();
    const warrior = required(
      state.units.find((unit) => at(unit.at) === at(UI.cracker)),
    );
    const acted = rig(
      patchFrozenUnitV7(state, warrior.id, {
        activation: { ...warrior.activation, specialActed: true },
      }),
    );
    acted.host.callbacks?.onSelection({ kind: "UNIT", unitId: warrior.id });
    const crack = requiredButton("crack-ice");
    expect(crack.getAttribute("aria-disabled")).toBe("true");
    expect(crack.dataset.disabledReason).toBe(CRACK_ICE_ALREADY_ACTED_V7);
    crack.click();
    expect(acted.host.lastModel?.interaction.freezePick ?? null).toBeNull();
    acted.app.destroy();
  });

  it("gives an Ice Folk unit no Crack Ice button", () => {
    const { host, app, unitAt } = rig(iceBuildUiFixtureV7());
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(UI.yeti).id,
    });
    expect(document.querySelector('[data-action="crack-ice"]')).toBeNull();
    expect(document.querySelector('[data-action="freeze"]')).not.toBeNull();
    app.destroy();
  });
});
