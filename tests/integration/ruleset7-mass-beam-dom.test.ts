// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import type { MapCommandTargetV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  BEAMING_BADGE_V7,
  BEAM_BADGE_V7,
  MASS_BEAM_DOWN_FULL_V7,
} from "../../src/render/martian-presentation-v7";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * `pulp_wars-8vmy`: a Mass Beam Down's passengers are picked on the board.
 * The Mothership at (2, 2) has three Grunts beside it and a Ray Gunner two
 * tiles south; the nearest three go unless the player taps others.
 */
const MOTHERSHIP = at(2, 2);
const GRUNTS = [at(1, 1), at(2, 1), at(3, 1)] as const;
const GUNNER = at(2, 4);
const TILE = at(2, 5);

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

function aim() {
  const scene = rig(field());
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(MOTHERSHIP).id,
  });
  requiredButton("martian-mass-beam-down").click();
  const targetAt = (
    where: CoordV7,
    family: MapCommandTargetV7["family"],
  ): MapCommandTargetV7 =>
    required(
      boardPlan(scene.host).targets.find(
        (target) => target.family === family && same(target.at, where),
      ),
    );
  const tap = (where: CoordV7): void => {
    const target = required(
      boardPlan(scene.host).targets.find((candidate) =>
        same(candidate.at, where),
      ),
    );
    scene.host.callbacks?.onCommand(target);
  };
  const labelsOf = (label: string): CoordV7[] =>
    boardPlan(scene.host)
      .entries.filter(
        (entry) =>
          entry.kind === "ABILITY_TARGET" &&
          entry.key.startsWith("ability-target:BEAM_PASSENGER:") &&
          entry.label === label,
      )
      .map((entry) => entry.at);
  const landings = (): (string | undefined)[] =>
    boardPlan(scene.host)
      .entries.filter((entry) => entry.key.includes("MASS_BEAM_LANDING"))
      .map((entry) => entry.label);
  const line = (): string =>
    requiredElement<HTMLElement>(".v7-mass-beam-count").textContent ?? "";
  const live = (): string =>
    document.querySelector("#v7-live")?.textContent ?? "";
  return { ...scene, targetAt, tap, labelsOf, landings, line, live };
}

describe("Mass Beam Down: the passengers picked on the board", () => {
  it("starts with the nearest three, refuses a fourth, toggles, previews and beams the chosen set", async () => {
    const scene = aim();
    // Every unit it may take wears the Help ring; the nearest three the
    // "Beam" badge; the panel says how many go and how to change them.
    expect(
      boardPlan(scene.host)
        .targets.filter(
          (target) => target.family === "MASS_BEAM_DOWN_PASSENGER",
        )
        .map((target) => target.at),
    ).toEqual([...GRUNTS, GUNNER]);
    expect(scene.labelsOf(BEAM_BADGE_V7)).toEqual(GRUNTS);
    expect(scene.line()).toBe("Beam 3 of 3: tap your units to choose");
    expect(
      requiredElement<HTMLElement>(".v7-mass-beam-count").dataset.massBeamCount,
    ).toBe("3");
    // No per-passenger buttons in the dock.
    expect(
      document.querySelectorAll(".v7-martian-pick button").length,
    ).toBeLessThanOrEqual(3);
    // A fourth unit is refused with a short notice.
    scene.tap(GUNNER);
    expect(scene.live()).toBe(`${MASS_BEAM_DOWN_FULL_V7}.`);
    expect(document.querySelector(".v7-toast")?.textContent).toBe(
      `${MASS_BEAM_DOWN_FULL_V7}.`,
    );
    expect(scene.labelsOf(BEAM_BADGE_V7)).toEqual(GRUNTS);
    // Leave a Grunt behind, take the Ray Gunner.
    scene.tap(GRUNTS[1]);
    expect(scene.line()).toBe("Beam 2 of 3: tap your units to choose");
    expect(scene.labelsOf(BEAM_BADGE_V7)).toEqual([GRUNTS[0], GRUNTS[2]]);
    scene.tap(GUNNER);
    expect(scene.line()).toBe("Beam 3 of 3: tap your units to choose");
    expect(scene.labelsOf(BEAM_BADGE_V7)).toEqual([
      GRUNTS[0],
      GRUNTS[2],
      GUNNER,
    ]);
    // A tile shows the landing of the chosen set.
    scene.tap(TILE);
    expect(scene.targetAt(TILE, "MASS_BEAM_DOWN").previewLabel).toBe(
      "Beam 3 units",
    );
    expect(scene.labelsOf(BEAMING_BADGE_V7)).toEqual([
      GRUNTS[0],
      GRUNTS[2],
      GUNNER,
    ]);
    expect(scene.landings().sort()).toEqual(["Grunt", "Grunt", "Ray Gunner"]);
    // Toggling with a tile chosen updates its preview.
    scene.tap(GRUNTS[0]);
    expect(scene.line()).toBe("Beam 2 of 3: tap your units to choose");
    expect(scene.targetAt(TILE, "MASS_BEAM_DOWN").previewLabel).toBe(
      "Beam 2 units",
    );
    expect(scene.landings().sort()).toEqual(["Grunt", "Ray Gunner"]);
    // The confirm beams the chosen set.
    requiredButton("martian-mass-beam-confirm").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "MASS_BEAM_DOWN",
      unitId: scene.unitAt(MOTHERSHIP).id,
      passengerUnitIds: [scene.unitAt(GRUNTS[2]).id, scene.unitAt(GUNNER).id],
      to: TILE,
    });
    scene.app.destroy();
  });

  it("beams the default three when the tile is chosen twice, like before", async () => {
    const scene = aim();
    scene.tap(TILE);
    scene.tap(TILE);
    await waitUntil(() => scene.controller.accepted.length === 1);
    const accepted = scene.controller.accepted[0];
    expect(accepted?.kind).toBe("MASS_BEAM_DOWN");
    if (accepted?.kind !== "MASS_BEAM_DOWN") throw new Error("kind");
    expect(accepted.passengerUnitIds).toEqual(
      GRUNTS.map((where) => scene.unitAt(where).id).sort((a, b) => a - b),
    );
    scene.app.destroy();
  });

  it("offers no tile with nobody picked, and Escape steps back to the passengers", () => {
    const scene = aim();
    scene.tap(TILE);
    expect(
      document.querySelector('[data-action="martian-mass-beam-confirm"]'),
    ).not.toBeNull();
    // Escape steps back from the tile and keeps the selection.
    scene.tap(GRUNTS[0]);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(
      document.querySelector('[data-action="martian-mass-beam-confirm"]'),
    ).toBeNull();
    expect(scene.line()).toBe("Beam 2 of 3: tap your units to choose");
    for (const where of [GRUNTS[1], GRUNTS[2]]) scene.tap(where);
    expect(scene.line()).toBe("Beam 0 of 3: tap your units to choose");
    expect(
      boardPlan(scene.host).targets.some(
        (target) => target.family === "MASS_BEAM_DOWN",
      ),
    ).toBe(false);
    // The passengers stay tappable.
    scene.tap(GUNNER);
    expect(scene.line()).toBe("Beam 1 of 3: tap your units to choose");
    expect(
      boardPlan(scene.host).targets.some(
        (target) => target.family === "MASS_BEAM_DOWN",
      ),
    ).toBe(true);
    scene.app.destroy();
  });
});
