// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import { tileActionsAtV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  DRAGGED_LABEL_V7,
  SUMMON_MASS_NEEDS_TECH_V7,
  SUMMON_PICK_KIND_V7,
} from "../../src/render/cult-channel-presentation-v7";
import {
  CULT_SUMMONS_RIVAL_UI_V7,
  CULT_SUMMONS_UI_V7,
  cultSummonsLockedUiFixtureV7,
  cultSummonsRivalUiFixtureV7,
  cultSummonsUiFixtureV7,
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
 * The Cult redesign's U-R3 in the DOM (bead `pulp_wars-mch9.44`;
 * docs/product/RULESET_7_CULT_REDESIGN.md section 13): the Summon button's
 * chooser of Imp, Horror and Mass with their prices, helpers and reasons;
 * each summon's badge and the tile chooser's priced rows; the Imp's and
 * the Mass's cards; and Dragged on a unit's card. No match is played.
 */

const A = CULT_SUMMONS_UI_V7;
const R = CULT_SUMMONS_RIVAL_UI_V7;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

type Scene = ReturnType<typeof rig>;

function select(scene: Scene, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const ANCHOR = { x: 200, y: 160, size: 96 } as const;

function tap(scene: Scene, where: CoordV7): void {
  const handler = scene.host.callbacks?.onTileActions;
  if (handler === undefined) throw new Error("No tile action callback");
  handler(where, ANCHOR);
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";

/** What a player reads or hears: no raw ID, command, or tile. */
function expectPlainWords(element: HTMLElement): void {
  const words = [
    element.textContent ?? "",
    ...[...element.querySelectorAll("[title], [aria-label]"), element].flatMap(
      (node) => [
        node.getAttribute("title") ?? "",
        node.getAttribute("aria-label") ?? "",
      ],
    ),
  ].join(" | ");
  expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(words).not.toMatch(/\d+,\s*\d+|SUMMON|undefined|null|NaN/);
}

describe("the summon chooser in the dock", () => {
  it("opens from the one Summon button with Imp, Horror and Mass, each priced, and arms the chosen one", async () => {
    const scene = rig(cultSummonsUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.summoner);
    // One Summon button, whatever is offered.
    expect(
      [...dock().querySelectorAll<HTMLElement>("[data-cult-ability]")].filter(
        (node) => node.dataset.cultAbility === "summon",
      ),
    ).toHaveLength(1);
    requiredButton("cult-summon").click();
    expect(live()).toContain(SUMMON_PICK_KIND_V7);
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    const rows = [
      ...panel.querySelectorAll<HTMLElement>(".v7-summon-choice"),
    ].map((row) => [
      row.dataset.action,
      row.querySelector(".v7-action-label")?.textContent,
      row.querySelector(".v7-favour-chip")?.textContent,
      row.querySelector(".v7-summon-helper-chip") !== null,
      row.getAttribute("aria-disabled"),
      row.querySelector<HTMLElement>("img")?.dataset.chibiSubject,
    ]);
    expect(rows).toEqual([
      ["cult-summon-imp", "Imp", "−2", false, null, "ICON:ACTION:SUMMON_IMP"],
      [
        "cult-summon-horror",
        "Horror",
        "−4",
        true,
        null,
        "ICON:ACTION:SUMMON_HORROR",
      ],
      ["cult-summon-mass", "Mass", "−5", true, null, "ICON:ACTION:SUMMON_MASS"],
    ]);
    // The panel holds the info, three summons and Cancel: within the
    // aiming panel's limit, and naming no tile.
    expect(
      [...panel.querySelectorAll("button")].map((node) => node.dataset.action),
    ).toEqual([
      "pick-info",
      "cult-summon-imp",
      "cult-summon-horror",
      "cult-summon-mass",
      "cult-pick-cancel",
    ]);
    expectPlainWords(panel);
    // The Imp: no helper to pick, straight to its tiles; the panel heads
    // with the Imp's icon.
    requiredButton("cult-summon-imp").click();
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "SUMMON",
      unitId: scene.unitAt(A.summoner).id,
      daemon: "IMP",
      helperUnitId: null,
    });
    const aimed = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(aimed.dataset.summon).toBe("imp");
    const targets = boardPlan(host).targets;
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target.family).toBe("SUMMON");
      expect(target.command).toMatchObject({ kind: "SUMMON", daemon: "IMP" });
    }
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toMatchObject({
      kind: "SUMMON",
      daemon: "IMP",
    });
    scene.app.destroy();
  });

  it("shows a locked Mass with its technology, and refuses it with the reason", () => {
    const scene = rig(cultSummonsLockedUiFixtureV7());
    select(scene, A.summoner);
    requiredButton("cult-summon").click();
    const mass = requiredButton("cult-summon-mass");
    expect(mass.getAttribute("aria-disabled")).toBe("true");
    expect(mass.classList.contains("is-blocked")).toBe(true);
    expect(mass.dataset.disabledReason).toBe(SUMMON_MASS_NEEDS_TECH_V7);
    expect(mass.querySelector(".v7-summon-reason")?.textContent).toBe(
      SUMMON_MASS_NEEDS_TECH_V7,
    );
    // Its price and its helper are still shown.
    expect(mass.querySelector(".v7-favour-chip")?.textContent).toBe("−5");
    expect(mass.querySelector(".v7-summon-helper-chip")).not.toBeNull();
    mass.click();
    expect(scene.host.lastModel?.interaction.cultPick).toMatchObject({
      kind: "SUMMON",
      daemon: null,
    });
    expect(live()).toContain(SUMMON_MASS_NEEDS_TECH_V7);
    expect(
      requiredButton("cult-summon-imp").getAttribute("aria-disabled"),
    ).toBeNull();
    scene.app.destroy();
  });
});

describe("the summons on their tiles", () => {
  it("badges each tile with every summon there and opens the tile chooser with their icons and prices", async () => {
    const scene = rig(cultSummonsUiFixtureV7());
    const { controller, host } = scene;
    select(scene, A.summoner);
    const model = required(host.lastModel);
    const tile = { x: A.summoner.x, y: A.summoner.y + 1 };
    const badges = required(tileActionsAtV7(model.tileActions, tile));
    expect(badges.actions.map((action) => [action.id, action.raster])).toEqual([
      ["MOVE", undefined],
      ["SUMMON_IMP", "ICON:ACTION:SUMMON_IMP"],
      ["SUMMON_HORROR", "ICON:ACTION:SUMMON_HORROR"],
      ["SUMMON_MASS", "ICON:ACTION:SUMMON_MASS"],
      // The Summoner's Tentacle (every technology) shares the tile.
      ["TENTACLE", undefined],
    ]);
    tap(scene, tile);
    const chooser = requiredElement<HTMLElement>(
      '[data-v7-region="tile-chooser"]',
    );
    const rows = [
      ...chooser.querySelectorAll<HTMLElement>("[role=menuitem]"),
    ].map((row) => [
      row.dataset.tileAction,
      row.querySelector(".v7-tile-choice-label")?.textContent,
      row.querySelector(".v7-favour-chip")?.textContent ?? null,
      row.querySelector<HTMLElement>("img")?.dataset.chibiSubject ?? null,
    ]);
    expect(rows).toEqual([
      ["move", "Move", null, null],
      ["summon_imp", "Summon Imp", "−2", "ICON:ACTION:SUMMON_IMP"],
      ["summon_horror", "Summon Horror", "−4", "ICON:ACTION:SUMMON_HORROR"],
      ["summon_mass", "Summon Mass", "−5", "ICON:ACTION:SUMMON_MASS"],
      ["tentacle", "Tentacle", null, null],
    ]);
    expectPlainWords(chooser);
    // The Mass's row: its one helper is seated, so the tap summons there.
    requiredButton("tile-choice-summon-mass").click();
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "SUMMON",
      unitId: scene.unitAt(A.summoner).id,
      daemon: "MASS",
      helperUnitId: scene.unitAt(A.helper).id,
      at: tile,
    });
    scene.app.destroy();
  });
});

describe("the Imp's and the Mass's cards", () => {
  it("lists Brood and Swarm with their icons on an Imp's card, Doorstep and Drag on the Mass's", () => {
    const scene = rig(cultSummonsUiFixtureV7());
    for (const [where, abilities] of [
      [A.broodImp, ["brood", "swarm"]],
      [A.mass, ["doorstep", "drag"]],
    ] as const) {
      select(scene, where);
      // A held daemon's chip carries the icon of what holds it.
      const control = dock().querySelector<HTMLElement>(
        '[data-unit-status="control"]',
      );
      expect(control).not.toBeNull();
      requiredButton("unit-help").click();
      const lines = [
        ...document.querySelectorAll<HTMLElement>(
          ".v7-unit-help-dialog .v7-unit-ability",
        ),
      ];
      for (const ability of abilities) {
        const line = lines.find((entry) => entry.dataset.ability === ability);
        expect(line, ability).toBeDefined();
        expect(
          line?.querySelector<HTMLElement>("img")?.dataset.chibiSubject,
        ).toBe(`ICON:ACTION:${ability.toUpperCase()}`);
      }
      requiredButton("close-unit-help").click();
    }
    scene.app.destroy();
  });

  it("puts Dragged on the card of a unit beside a hostile Mass", () => {
    const scene = rig(cultSummonsRivalUiFixtureV7());
    select(scene, R.dragged);
    const chip = dock().querySelector<HTMLElement>(
      '[data-unit-status="dragged"]',
    );
    expect(chip?.textContent).toContain(DRAGGED_LABEL_V7);
    // A harm done to the unit: the loss colour, as a hex's chip.
    expect(chip?.dataset.harm).toBe("true");
    select(scene, R.free);
    expect(dock().querySelector('[data-unit-status="dragged"]')).toBeNull();
    scene.app.destroy();
  });
});
