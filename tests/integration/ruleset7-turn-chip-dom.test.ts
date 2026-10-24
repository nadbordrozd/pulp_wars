// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import {
  UNIT_ACTION_LEFT_LABEL_V7,
  UNIT_ACTION_LEFT_TOOLTIP_V7,
  UNIT_ATTACK_LEFT_LABEL_V7,
  UNIT_ATTACK_LEFT_TOOLTIP_V7,
  UNIT_DONE_LABEL_V7,
} from "../../src/render/blocked-actions-v7";
import { required, rig, waitUntil } from "../fixtures/v7-dom-rig";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * Bead `pulp_wars-2yc.109`: the dock's turn chip of a handled unit says
 * what is left: a beamed Grunt beside an enemy "Can attack · can't move",
 * the Mothership with its free pull left "Can act · can't move", a moved
 * unit out of reach "Done this turn".
 */
const own = (
  role: MartianPieceV7["role"],
  where: CoordV7,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: where, ...extra });

const field = (): GameStateV7 =>
  martianFieldV7([
    own("KNIGHT", at(2, 2)),
    own("FIGHTER", at(1, 1)),
    own("FIGHTER", at(2, 1)),
    own("FIGHTER", at(3, 1)),
    own("FIGHTER", at(8, 1), {
      activation: { moved: true, movedPathLength: 1, handled: true },
    }),
    { seat: 1, role: "FIGHTER", at: at(2, 6) },
  ]);

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function chip(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".v7-selection-dock .v7-done-chip",
  );
}

describe("the turn chip of a handled unit", () => {
  it("says a beamed unit can attack, the Mothership can act, and a spent unit is done", async () => {
    const scene = rig(field());
    const select = (where: CoordV7): void => {
      const unit = required(
        scene.controller
          .snapshot()
          .view?.units.find(
            (candidate) =>
              candidate.at.x === where.x && candidate.at.y === where.y,
          ),
      );
      scene.host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    };
    // A fresh unit has no turn chip.
    select(at(1, 1));
    expect(chip()).toBeNull();
    // A unit that moved with no enemy in reach is done.
    select(at(8, 1));
    expect(chip()?.textContent).toBe(UNIT_DONE_LABEL_V7);
    expect(chip()?.dataset.unitStatus).toBe("done");
    const mothership = scene.unitAt(at(2, 2));
    const ids = [at(1, 1), at(2, 1), at(3, 1)]
      .map((where) => scene.unitAt(where).id)
      .sort((left, right) => left - right);
    await scene.controller.dispatch({
      kind: "MASS_BEAM_DOWN",
      unitId: mothership.id,
      passengerUnitIds: ids,
      to: at(2, 5),
    });
    await waitUntil(() => scene.controller.accepted.length === 1);
    select(at(2, 5));
    expect(chip()?.textContent).toBe(UNIT_ATTACK_LEFT_LABEL_V7);
    expect(chip()?.dataset.unitStatus).toBe("attack-left");
    expect(chip()?.title).toBe(UNIT_ATTACK_LEFT_TOOLTIP_V7);
    expect(chip()?.getAttribute("aria-label")).toBe(
      `${UNIT_ATTACK_LEFT_LABEL_V7}. ${UNIT_ATTACK_LEFT_TOOLTIP_V7}`,
    );
    select(at(2, 2));
    expect(chip()?.textContent).toBe(UNIT_ACTION_LEFT_LABEL_V7);
    expect(chip()?.getAttribute("aria-label")).toBe(
      `${UNIT_ACTION_LEFT_LABEL_V7}. ${UNIT_ACTION_LEFT_TOOLTIP_V7}`,
    );
    scene.app.destroy();
  });
});
