// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, PlayerViewV7 } from "../../src/engine/index";
import {
  CULT_RITUAL_UI_V7,
  CULT_TWO_STARS_UI_V7,
  cultJoinUiFixtureV7,
  cultTwoStarsJoinUiFixtureV7,
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
 * Join the chant with no confirmation, reversible like Wait (bead
 * `pulp_wars-mch9.61`; the user, 2026-10-26: "joining the chant of a star
 * gazer should not require confirmation. unless there is more than one
 * available chanting stargazer then you have to click on the right one").
 * The dock's button joins the only Stargazer at once; with two it aims and
 * a tap on one joins. A joiner keeps its orders: a Move takes it out of the
 * chant, and so does a join of the other star.
 */

const R = CULT_RITUAL_UI_V7;
const B = CULT_TWO_STARS_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

type Scene = ReturnType<typeof rig>;

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The unit on `where` as the controller's latest view has it. */
function unitIdAt(scene: Scene, where: CoordV7): number {
  const view = required(scene.controller.snapshot().view);
  return required(view.units.find((unit) => key(unit.at) === key(where))).id;
}

function select(scene: Scene, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: unitIdAt(scene, where) as never,
  });
}

const view = (scene: Scene): PlayerViewV7 =>
  required(scene.controller.snapshot().view);

/** The chanters of the star its Stargazer on `gazer` leads. */
function chantersOf(scene: Scene, gazer: CoordV7): readonly number[] {
  const leader = unitIdAt(scene, gazer);
  return required(
    view(scene).cult.rituals.find((ritual) => ritual.leaderUnitId === leader),
  ).chanterUnitIds;
}

const chips = (): readonly (string | undefined)[] =>
  [
    ...requiredElement<HTMLElement>(
      ".v7-selection-dock",
    ).querySelectorAll<HTMLElement>(".v7-cult-chip"),
  ].map((chip) => chip.dataset.unitStatus);

/**
 * Waits until the last command has been presented: the board host is given
 * the offered commands again.
 */
async function settled(scene: Scene): Promise<void> {
  await waitUntil(
    () => (scene.host.lastModel?.offeredCommands.length ?? 0) > 0,
  );
}

const aimingPanel = (): Element | null =>
  document.querySelector('[data-v7-cult-pick="join-chant"]');

describe("join the chant: one Stargazer", () => {
  it("joins at once from the dock, with no aiming and no confirmation", async () => {
    const scene = rig(cultJoinUiFixtureV7());
    select(scene, R.chanter);
    expect(chips()).toEqual([]);
    requiredButton("cult-join-chant").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "JOIN_CHANT",
      unitId: unitIdAt(scene, R.chanter),
      leaderUnitId: unitIdAt(scene, R.stargazer),
    });
    expect(aimingPanel()).toBeNull();
    expect(chantersOf(scene, R.stargazer)).toEqual([
      unitIdAt(scene, R.chanter),
    ]);
    // The chip says so, and the button is gone (no second join of it).
    select(scene, R.chanter);
    expect(chips()).toEqual(["chanting"]);
    expect(
      document.querySelector('[data-action="cult-join-chant"]'),
    ).toBeNull();
    scene.app.destroy();
  });

  it("lets the joiner still move: the Move takes it out of the chant", async () => {
    const scene = rig(cultJoinUiFixtureV7());
    select(scene, R.chanter);
    requiredButton("cult-join-chant").click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    // The player changes their mind: the joiner is selected again and is
    // offered its Move tiles (once the join has been presented).
    const moveTarget = () =>
      boardPlan(scene.host).targets.find(
        (target) => target.family === "MOVE" && key(target.at) === "3,1",
      );
    await settled(scene);
    select(scene, R.chanter);
    const move = required(moveTarget());
    scene.host.callbacks?.onCommand(move);
    await waitUntil(() => scene.controller.accepted.length === 2);
    expect(scene.controller.accepted[1]?.kind).toBe("MOVE");
    expect(chantersOf(scene, R.stargazer)).toEqual([]);
    select(scene, { x: 3, y: 1 });
    expect(chips()).toEqual([]);
    scene.app.destroy();
  });
});

describe("join the chant: two Stargazers", () => {
  it("aims on the board, and a tap on one Stargazer joins it", async () => {
    const scene = rig(cultTwoStarsJoinUiFixtureV7());
    select(scene, R.secondChanter);
    requiredButton("cult-join-chant").click();
    // Nothing is sent yet: both Stargazers are highlighted.
    expect(scene.controller.accepted).toEqual([]);
    expect(aimingPanel()).not.toBeNull();
    const armed = boardPlan(scene.host);
    const targets = armed.targets.filter(
      (target) => target.family === "JOIN_CHANT",
    );
    expect(targets.map((target) => key(target.at)).sort()).toEqual(
      [key(R.stargazer), key(B.secondStargazer)].sort(),
    );
    // A tap joins at once: no second confirmation.
    scene.host.callbacks?.onCommand(
      required(
        targets.find((target) => key(target.at) === key(B.secondStargazer)),
      ),
    );
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toMatchObject({
      kind: "JOIN_CHANT",
      leaderUnitId: unitIdAt(scene, B.secondStargazer),
    });
    expect(chantersOf(scene, B.secondStargazer)).toEqual([
      unitIdAt(scene, R.secondChanter),
    ]);
    expect(aimingPanel()).toBeNull();
    scene.app.destroy();
  });

  it("lets a joiner join the other star instead", async () => {
    const scene = rig(cultTwoStarsJoinUiFixtureV7());
    const joiner = unitIdAt(scene, R.secondChanter);
    select(scene, R.secondChanter);
    requiredButton("cult-join-chant").click();
    const first = required(
      boardPlan(scene.host).targets.find(
        (target) =>
          target.family === "JOIN_CHANT" && key(target.at) === key(R.stargazer),
      ),
    );
    scene.host.callbacks?.onCommand(first);
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(chantersOf(scene, R.stargazer)).toEqual([joiner]);
    // Selected again, only the other star is left to join: the button
    // joins it at once, and the first star loses the chanter.
    await settled(scene);
    select(scene, R.secondChanter);
    expect(chips()).toEqual(["chanting"]);
    requiredButton("cult-join-chant").click();
    await waitUntil(() => scene.controller.accepted.length === 2);
    expect(scene.controller.accepted[1]).toEqual({
      kind: "JOIN_CHANT",
      unitId: joiner,
      leaderUnitId: unitIdAt(scene, B.secondStargazer),
    });
    expect(chantersOf(scene, R.stargazer)).toEqual([]);
    expect(chantersOf(scene, B.secondStargazer)).toEqual([joiner]);
    scene.app.destroy();
  });
});
