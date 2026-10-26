// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { focusedCultPreviewV7 } from "../../src/render/canvas/board-renderer-v7";
import { tileActionsAtV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  AWESTRUCK_REASON_V7,
  IDOL_HALVED_PREVIEW_V7,
} from "../../src/render/cult-channel-presentation-v7";
import {
  CULT_RITUAL_UI_V7,
  CULT_TRICK_UI_V7,
  CULT_WARDEN_UI_V7,
  cultJoinUiFixtureV7,
  cultTricksUiFixtureV7,
  cultWardenRivalUiFixtureV7,
  cultWardenUiFixtureV7,
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
 * The Cult redesign's U-R2 in the DOM (bead `pulp_wars-mch9.43`;
 * docs/product/RULESET_7_CULT_REDESIGN.md section 13): the warden's chips
 * and board marks for its owner and its victim, the halved shot and the
 * Awestruck greys of the board the real host draws, the join icon on the
 * dock's button and the Stargazer's badge with the live preview of a join,
 * and Switcheroo's reach of 4 while aimed.
 */

const W = CULT_WARDEN_UI_V7;
const R = CULT_RITUAL_UI_V7;
const T = CULT_TRICK_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

type Scene = ReturnType<typeof rig>;

const key = (at: CoordV7): string => `${at.x},${at.y}`;

function select(scene: Scene, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const chips = (): readonly (readonly [string | undefined, string | null])[] =>
  [...dock().querySelectorAll<HTMLElement>(".v7-cult-chip")].map((chip) => [
    chip.dataset.unitStatus,
    chip.textContent,
  ]);

describe("the warden on the cards", () => {
  it("names the shield wall on each covered unit and Awestruck on each held enemy", () => {
    const scene = rig(cultWardenUiFixtureV7());
    for (const [where, expected] of [
      [W.initiate, [["shielded", "Shielded"]]],
      [W.stargazer, [["shielded", "Shielded"]]],
      [W.bearer, [["idol", "Idol raised"]]],
      [W.hexer, []],
      [W.knight, [["awestruck", "Awestruck"]]],
      [W.fighter, [["awestruck", "Awestruck"]]],
      [W.archer, []],
    ] as const) {
      select(scene, where);
      expect(chips()).toEqual(expected);
      for (const chip of dock().querySelectorAll<HTMLElement>(".v7-cult-chip"))
        expect(chip.title.length).toBeGreaterThan(20);
    }
    scene.app.destroy();
  });
});

describe("the warden on its victim's board", () => {
  it("halves the Archer's shot at a shielded unit and says so", () => {
    const scene = rig(cultWardenRivalUiFixtureV7());
    select(scene, W.archer);
    const plan = boardPlan(scene.host);
    const shot = required(
      plan.targets.find(
        (target) =>
          target.family === "ATTACK" && key(target.at) === key(W.initiate),
      ),
    );
    expect(shot.previewNote ?? "").toContain(IDOL_HALVED_PREVIEW_V7);
    // The shielded unit wears the small idol, for its enemy too.
    expect(
      plan.entries.some(
        (entry) =>
          entry.kind === "UNIT" &&
          key(entry.at) === key(W.initiate) &&
          entry.cult?.shielded === true,
      ),
    ).toBe(true);
    scene.app.destroy();
  });

  it("leaves an Awestruck Knight only the Idol Bearer, with the others grey and its chip", () => {
    const scene = rig(cultWardenRivalUiFixtureV7());
    select(scene, W.knight);
    expect(chips()).toEqual([["awestruck", "Awestruck"]]);
    const plan = boardPlan(scene.host);
    expect(
      plan.targets
        .filter((target) => target.family === "ATTACK")
        .map((target) => key(target.at)),
    ).toEqual([key(W.bearer)]);
    expect(
      plan.entries
        .filter((entry) => entry.label === AWESTRUCK_REASON_V7)
        .map((entry) => key(entry.at))
        .sort(),
    ).toEqual([key(W.initiate), key(W.hexer)].sort());
    expect(
      plan.entries.some(
        (entry) =>
          entry.cultLink?.kind === "TAUNT" && key(entry.at) === key(W.knight),
      ),
    ).toBe(true);
    scene.app.destroy();
  });
});

describe("join the chant", () => {
  it("draws the join icon on the dock's button and the Stargazer's badge, previews the joined star, and joins", async () => {
    const scene = rig(cultJoinUiFixtureV7());
    const { controller, host } = scene;
    select(scene, R.chanter);
    const button = requiredButton("cult-join-chant");
    // One button: no second, generic command button for the join.
    expect(
      [...dock().querySelectorAll("button")].filter((node) =>
        /join/i.test(node.textContent ?? ""),
      ),
    ).toEqual([button]);
    expect(button.querySelector<HTMLElement>("img")?.dataset.chibiSubject).toBe(
      "ICON:ACTION:JOIN_CHANT",
    );
    // Nothing aimed: the badge on the Stargazer, its preview on focus.
    const model = required(host.lastModel);
    const badge = required(tileActionsAtV7(model.tileActions, R.stargazer));
    expect(badge.actions.map((action) => [action.id, action.raster])).toEqual([
      ["JOIN_CHANT", "ICON:ACTION:JOIN_CHANT"],
    ]);
    const unarmed = boardPlan(host);
    const hover = required(focusedCultPreviewV7(unarmed, R.stargazer));
    expect(
      (hover.marks ?? []).find((mark) => key(mark.at) === key(R.starKnight)),
    ).toMatchObject({ label: "−8", lethal: true });
    // The dock's button joins the only Stargazer at once, with no aiming
    // and no confirmation (`pulp_wars-mch9.61`; two Stargazers are picked
    // on the board: tests/integration/ruleset7-cult-join-instant-dom.test.ts).
    const ritualBefore = required(controller.snapshot().view).cult.rituals[0];
    expect(ritualBefore?.chanters).toBe(0);
    button.click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]?.kind).toBe("JOIN_CHANT");
    expect(required(controller.snapshot().view).cult.rituals[0]?.chanters).toBe(
      1,
    );
    scene.app.destroy();
  });
});

describe("Switcheroo's reach", () => {
  it("outlines the 4 tiles round the Familiar while it is aimed", () => {
    const scene = rig(cultTricksUiFixtureV7());
    select(scene, T.familiar);
    requiredButton("cult-switcheroo").click();
    const plan = boardPlan(scene.host);
    const reach = plan.entries.filter((entry) =>
      entry.key.startsWith("ability-area:SWITCHEROO_RANGE:"),
    );
    expect(reach.length).toBeGreaterThan(25);
    for (const entry of reach)
      expect(
        Math.max(
          Math.abs(entry.at.x - T.familiar.x),
          Math.abs(entry.at.y - T.familiar.y),
        ),
      ).toBeLessThanOrEqual(4);
    expect(
      plan.targets.some((target) => key(target.at) === key(T.caller)),
    ).toBe(true);
    scene.app.destroy();
  });
});
