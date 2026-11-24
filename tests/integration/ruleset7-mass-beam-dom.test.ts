// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import type { MapCommandTargetV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BEAMING_BADGE_V7,
  MOTHERSHIP_BEAMS_SPENT_V7,
  MOTHERSHIP_BEAM_PICK_TILE_V7,
} from "../../src/render/martian-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * The Mothership's Beam Down in the dock and on the board. `pulp_wars-8vmy`
 * picked a Mass Beam Down's passengers on the board; since `pulp_wars-eg3k`
 * (7r146) the Mothership beams one unit at a time, three times a turn, with
 * the Saucer's flow. The Mothership at (2, 2) has three Grunts beside it and
 * a Ray Gunner two tiles south.
 */
const MOTHERSHIP = at(2, 2);
const GRUNTS = [at(1, 1), at(2, 1), at(3, 1)] as const;
const GUNNER = at(2, 4);
const LANDINGS = [at(1, 5), at(2, 5), at(3, 5)] as const;

const own = (role: MartianPieceV7["role"], where: CoordV7): MartianPieceV7 => ({
  seat: 0,
  role,
  at: where,
});

const field = (): GameStateV7 =>
  martianFieldV7([
    own("KNIGHT", MOTHERSHIP),
    ...GRUNTS.map((where) => own("FIGHTER", where)),
    own("MARKSMAN", GUNNER),
  ]);

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function scene() {
  const base = rig(field());
  const select = (): void =>
    base.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: base.unitAt(MOTHERSHIP).id,
    });
  const tap = (where: CoordV7, family: MapCommandTargetV7["family"]): void =>
    base.host.callbacks?.onCommand(
      required(
        boardPlan(base.host).targets.find(
          (target) => target.family === family && same(target.at, where),
        ),
      ),
    );
  const label = (): string =>
    requiredButton("martian-beam-down").querySelector(".v7-action-label")
      ?.textContent ?? "";
  const live = (): string =>
    document.querySelector("#v7-live")?.textContent ?? "";
  return { ...base, select, tap, label, live };
}

describe("the Mothership's Beam Down: one unit a beam, three a turn", () => {
  it("counts its beams down on its one button, each a passenger then a tile on the board", async () => {
    const run = scene();
    run.select();
    expect(run.label()).toBe("Beam Down (3 left)");
    // No Mass Beam Down button, no multi-select line.
    expect(
      document.querySelector('[data-action="martian-mass-beam-down"]'),
    ).toBeNull();
    expect(document.querySelector(".v7-mass-beam-count")).toBeNull();
    for (const [index, landing] of LANDINGS.entries()) {
      // The dock waits for the last beam's landing to play.
      await waitUntil(() => !requiredButton("martian-beam-down").disabled);
      requiredButton("martian-beam-down").click();
      const passenger = GRUNTS[index] as CoordV7;
      run.tap(passenger, "BEAM_DOWN_PASSENGER");
      expect(run.live()).toBe(`${MOTHERSHIP_BEAM_PICK_TILE_V7}.`);
      // The picked Grunt wears "Beaming"; its tiles are the targets.
      expect(
        boardPlan(run.host)
          .entries.filter((entry) => entry.label === BEAMING_BADGE_V7)
          .map((entry) => entry.at),
      ).toEqual([passenger]);
      run.tap(landing, "BEAM_DOWN");
      await waitUntil(() => run.controller.accepted.length === index + 1);
      expect(run.controller.accepted[index]).toEqual({
        kind: "BEAM_DOWN",
        unitId: run.unitAt(MOTHERSHIP).id,
        passengerUnitId: run.unitAt(passenger).id,
        to: landing,
      });
      run.select();
      if (index < LANDINGS.length - 1)
        await waitUntil(() => run.label() === `Beam Down (${2 - index} left)`);
    }
    // All three spent: the button stays, disabled, and says why.
    await waitUntil(() => run.label() === "Beam Down (0 left)");
    const spent = requiredButton("martian-beam-down");
    expect(spent.getAttribute("aria-disabled")).toBe("true");
    expect(spent.dataset.disabledReason).toBe(MOTHERSHIP_BEAMS_SPENT_V7);
    run.app.destroy();
  });

  it("steps back from the tiles to the passengers with Escape", () => {
    const run = scene();
    run.select();
    requiredButton("martian-beam-down").click();
    run.tap(GUNNER, "BEAM_DOWN_PASSENGER");
    expect(
      boardPlan(run.host).targets.every(
        (target) => target.family === "BEAM_DOWN",
      ),
    ).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    const passengers = boardPlan(run.host).targets;
    expect(
      passengers.every((target) => target.family === "BEAM_DOWN_PASSENGER"),
    ).toBe(true);
    expect(passengers.map((target) => target.at)).toEqual(
      expect.arrayContaining([...GRUNTS, GUNNER]),
    );
    run.app.destroy();
  });
});
