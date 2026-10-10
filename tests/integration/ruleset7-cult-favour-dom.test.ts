// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  favourOfV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  BOARD_PICK_PANEL_MAX_BUTTONS_V7,
  targetHighlightStyleV7,
} from "../../src/render/canvas/target-highlight-v7";
import {
  SEIZE_HEALTHY_V7,
  SEIZE_NO_HOLDER_V7,
  SUMMONER_ALREADY_ACTED_V7,
} from "../../src/render/cult-presentation-v7";
import { cultFieldV7 } from "../fixtures/v7-cult";
import {
  CULT_UI_V7,
  cultFavourUiFixtureV7,
  cultRivalUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import {
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  rig,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { at } from "../fixtures/v7-revision20";

/**
 * The Cult's Favour in the DOM (bead `pulp_wars-mch9.17`,
 * docs/ui/BOARD_TARGETING.md section 3.7): a Summoner has one Sacrifice and
 * one Seize button, each arms its aiming and the victim is picked on the
 * board (the Help ring on own units, the Attack mark on enemies, each with
 * the Favour it pays); a Cult player's Favour stands beside the Coins and
 * every Cult seat's in the leaderboard; a city's Offering shows what it pays
 * and costs.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function select(scene: ReturnType<typeof rig>, where: CoordV7): void {
  scene.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: scene.unitAt(where).id,
  });
}

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";

/** What a player reads or hears of a button: no raw ID, command, or tile. */
function expectPlainWords(button: HTMLElement): void {
  const words = [
    button.textContent ?? "",
    button.title,
    button.getAttribute("aria-label") ?? "",
    button.getAttribute("aria-description") ?? "",
  ].join(" | ");
  expect(words).not.toMatch(/[A-Z]{2,}_[A-Z]|\bu\d+\b|#\d+|\(\d+,\s*\d+\)/);
  expect(words).not.toMatch(/SACRIFICE|SEIZE|OFFERING|undefined|null|NaN/);
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

describe("Sacrifice is picked on the board", () => {
  it("arms with one button, marks each own unit with its Favour, and offers the picked one", async () => {
    const scene = rig(cultFavourUiFixtureV7());
    const { controller, host } = scene;
    const summoner = scene.unitAt(CULT_UI_V7.summoner);
    select(scene, CULT_UI_V7.summoner);
    // One Sacrifice and one Seize button, whatever the number of victims.
    const sacrifice = requiredButton("cult-sacrifice");
    expect(
      dock().querySelectorAll("[data-cult-ability]").length,
      "one button per ability",
    ).toBe(2);
    expect(
      dock().querySelector(
        '[data-action^="command-sacrifice"], [data-action^="command-seize"]',
      ),
    ).toBeNull();
    expect(sacrifice.textContent).toBe("Sacrifice");
    expect(sacrifice.getAttribute("aria-pressed")).toBe("false");
    expect(sacrifice.title.length).toBeGreaterThan(20);
    expectPlainWords(sacrifice);
    // Unarmed, no own unit is a target: a click on one selects it.
    expect(
      boardPlan(host).targets.filter(
        (target) => target.family === "SACRIFICE" || target.family === "SEIZE",
      ),
    ).toEqual([]);

    sacrifice.click();
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "SACRIFICE",
      unitId: summoner.id,
    });
    const panel = requiredElement<HTMLElement>("[data-v7-cult-pick]");
    expect(panel.dataset.v7CultPick).toBe("sacrifice");
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(panel.dataset.boardTargets).toBe("2");
    const controls = [...panel.querySelectorAll("button")].map(
      (control) => control.dataset.action,
    );
    expect(controls).toEqual(["pick-info", "cult-pick-cancel"]);
    expect(controls.length).toBeLessThanOrEqual(
      BOARD_PICK_PANEL_MAX_BUTTONS_V7,
    );
    // The dock names no victim.
    expect(dock().textContent ?? "").not.toMatch(/Thing|Initiate/);
    const targets = boardPlan(host).targets;
    expect(
      targets
        .map((target) => [target.family, target.at, target.previewLabel])
        .sort((left, right) => String(left[2]).localeCompare(String(right[2]))),
    ).toEqual([
      ["SACRIFICE", CULT_UI_V7.thing, "+12 Favour"],
      ["SACRIFICE", CULT_UI_V7.initiate, "+2 Favour"],
    ]);
    for (const target of targets) {
      expect(targetHighlightStyleV7(target.family)).toBe("SUPPORT");
      expect(target.semanticLabel).toMatch(/^Sacrifice this /);
      expect(target.semanticLabel).not.toMatch(/\d, ?\d/);
    }

    // Escape disarms and returns to the button; nothing was sent.
    escape();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(document.querySelector("[data-v7-cult-pick]")).toBeNull();
    expect(controller.accepted).toEqual([]);
    // Cancel does the same.
    requiredButton("cult-sacrifice").click();
    requiredButton("cult-pick-cancel").click();
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();

    // Pick the Thing on the board.
    requiredButton("cult-sacrifice").click();
    const thing = scene.unitAt(CULT_UI_V7.thing);
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find(
          (target) =>
            target.at.x === CULT_UI_V7.thing.x &&
            target.at.y === CULT_UI_V7.thing.y,
        ),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "SACRIFICE",
      unitId: summoner.id,
      victimUnitId: thing.id,
    });
    const view = required(controller.snapshot().view);
    expect(favourOfV7(view, view.viewer.id)).toBe(19);
    expect(view.units.some((unit) => unit.id === thing.id)).toBe(false);
    await waitUntil(() =>
      live().includes("Thing in the Cellar Sacrificed: +12 Favour"),
    );
    expect(host.lastModel?.interaction.cultPick ?? null).toBeNull();
    // Nothing on the page names a raw event or cause.
    expect(document.body.textContent ?? "").not.toMatch(
      /UNIT_SACRIFICED|FAVOUR_GAINED|UNIT_DIED|SACRIFICED\b/,
    );
    // The Summoner has acted: both buttons say so.
    select(scene, CULT_UI_V7.summoner);
    for (const action of ["cult-sacrifice", "cult-seize"]) {
      const spent = requiredButton(action);
      expect(spent.getAttribute("aria-disabled")).toBe("true");
      expect(spent.dataset.disabledReason).toBe(SUMMONER_ALREADY_ACTED_V7);
    }
    scene.app.destroy();
  });
});

describe("Seize is picked on the board", () => {
  it("marks the broken enemy with twice its value, greys the healthy one, and seizes the picked one", async () => {
    const scene = rig(cultFavourUiFixtureV7());
    const { controller, host } = scene;
    const summoner = scene.unitAt(CULT_UI_V7.summoner);
    const knight = scene.unitAt(CULT_UI_V7.knight);
    select(scene, CULT_UI_V7.summoner);
    const seize = requiredButton("cult-seize");
    expect(seize.textContent).toBe("Seize");
    expectPlainWords(seize);
    seize.click();
    expect(host.lastModel?.interaction.cultPick).toEqual({
      kind: "SEIZE",
      unitId: summoner.id,
    });
    expect(
      requiredElement<HTMLElement>("[data-v7-cult-pick]").dataset.boardTargets,
    ).toBe("1");
    const plan = boardPlan(host);
    // While it is armed its victim is the only target: no Move, no Attack.
    expect(
      plan.targets.map((target) => [
        target.family,
        target.at,
        target.previewLabel,
      ]),
    ).toEqual([["SEIZE", CULT_UI_V7.knight, "+18 Favour"]]);
    expect(targetHighlightStyleV7("SEIZE")).toBe("ATTACK");
    expect(plan.targets[0]?.semanticLabel).toBe(
      "Seize this Knight: +18 Favour. Your Initiate holds it down. Choose a broken enemy next to it",
    );
    // The healthy Fighter beside it keeps the engine's reason, in grey.
    expect(
      plan.entries
        .filter((entry) => entry.kind === "ABILITY_TARGET")
        .map((entry) => [entry.at, entry.label]),
    ).toEqual([[CULT_UI_V7.fighter, "Above 5 HP"]]);

    host.callbacks?.onCommand(required(plan.targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "SEIZE",
      unitId: summoner.id,
      victimUnitId: knight.id,
    });
    const view = required(controller.snapshot().view);
    expect(favourOfV7(view, view.viewer.id)).toBe(25);
    await waitUntil(() => live().includes("Knight Seized: +18 Favour"));
    expect(document.body.textContent ?? "").not.toMatch(
      /UNIT_SEIZED|FAVOUR_GAINED|Unit seized|Favour gained/,
    );
    scene.app.destroy();
  });

  it("is disabled with the engine's reason, and absent with no enemy beside the Summoner", () => {
    // A broken Knight nobody holds, and a healthy Fighter.
    const lonely = (pieces: Parameters<typeof cultFieldV7>[0]): GameStateV7 =>
      cultFieldV7([{ seat: 0, role: "CAPTAIN", at: at(5, 2) }, ...pieces]);
    let scene = rig(
      lonely([
        { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 5 },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ]),
    );
    select(scene, at(5, 2));
    let seize = requiredButton("cult-seize");
    expect(seize.getAttribute("aria-disabled")).toBe("true");
    expect(seize.dataset.disabledReason).toBe(SEIZE_NO_HOLDER_V7);
    expect(seize.getAttribute("aria-label")).toBe(
      `Seize unavailable. ${SEIZE_NO_HOLDER_V7}`,
    );
    seize.click();
    expect(scene.host.lastModel?.interaction.cultPick ?? null).toBeNull();
    expect(live()).toContain(SEIZE_NO_HOLDER_V7);
    // No own unit beside it: no Sacrifice button at all.
    expect(document.querySelector('[data-action="cult-sacrifice"]')).toBeNull();
    scene.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(lonely([{ seat: 1, role: "FIGHTER", at: at(4, 3) }]));
    select(scene, at(5, 2));
    seize = requiredButton("cult-seize");
    expect(seize.dataset.disabledReason).toBe(SEIZE_HEALTHY_V7);
    scene.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(lonely([]));
    select(scene, at(5, 2));
    expect(dock().querySelector("[data-cult-ability]")).toBeNull();
    scene.app.destroy();
  });

  it("shows no button on a unit that is not the viewer's Summoner", () => {
    const scene = rig(cultFavourUiFixtureV7());
    for (const where of [CULT_UI_V7.initiate, CULT_UI_V7.knight]) {
      select(scene, where);
      expect(dock().querySelector("[data-cult-ability]")).toBeNull();
    }
    scene.app.destroy();
  });
});

describe("Favour in the HUD and the leaderboard", () => {
  it("shows a Cult player's Favour beside the Coins, and none to another faction", () => {
    let scene = rig(cultFavourUiFixtureV7());
    const chip = requiredElement<HTMLElement>(".v7-match-hud .v7-favour");
    expect(chip.previousElementSibling?.classList.contains("v7-coins")).toBe(
      true,
    );
    expect(chip.querySelector(".v7-favour-balance")?.textContent).toBe("7");
    expect(chip.getAttribute("aria-label")).toBe("7 Favour");
    expect(chip.querySelector(".v7-favour-icon")).not.toBeNull();
    expect(chip.title).toMatch(/^Favour: /);
    scene.app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    scene = rig(cultRivalUiFixtureV7());
    expect(document.querySelector(".v7-favour")).toBeNull();
    scene.app.destroy();
  });

  it("shows every Cult seat's Favour in the leaderboard, to every player", () => {
    for (const [fixture, favour] of [
      [cultFavourUiFixtureV7, "7"],
      [cultRivalUiFixtureV7, "11"],
    ] as const) {
      document.body.innerHTML = '<div id="app"></div>';
      const scene = rig(fixture());
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", bubbles: true }),
      );
      const rows = [
        ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
      ];
      expect(rows.length).toBe(2);
      expect(
        rows.map(
          (row) =>
            row.querySelector<HTMLElement>(".v7-leaderboard-favour")?.dataset
              .favour ?? null,
        ),
        "only the Cult seat has a Favour stat",
      ).toEqual(
        rows.map((row) => (row.dataset.faction === "cult" ? favour : null)),
      );
      const stat = requiredElement<HTMLElement>(".v7-leaderboard-favour");
      expect(stat.textContent).toBe(`${favour} Favour`);
      expect(stat.querySelector(".v7-favour-icon")).not.toBeNull();
      scene.app.destroy();
    }
  });
});

describe("the Offering in the city panel", () => {
  it("shows what it pays and costs, plays it, and says what happened", async () => {
    const scene = rig(cultFavourUiFixtureV7());
    const capital = required(
      scene.view.cities.find((city) => city.ownerId === scene.view.viewer.id),
    );
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    const offering = requiredButton("command-offering");
    expect(offering.querySelector(".v7-action-label")?.textContent).toBe(
      "Offering",
    );
    const chips = [
      ...offering.querySelectorAll<HTMLElement>(".v7-economy-chip"),
    ];
    expect(chips.map((chip) => chip.textContent)).toEqual(["+3", "-2"]);
    expect(chips[0]?.classList.contains("v7-favour-chip")).toBe(true);
    expect(chips[0]?.querySelector(".v7-favour-icon")).not.toBeNull();
    expect(chips[1]?.classList.contains("is-loss")).toBe(true);
    expect(offering.getAttribute("aria-label")).toBe(
      "Offering · +3 Favour · −2 population",
    );
    expectPlainWords(offering);
    offering.click();
    await waitUntil(() => scene.controller.accepted.length === 1);
    expect(scene.controller.accepted[0]).toEqual({
      kind: "OFFERING",
      cityId: capital.id,
    });
    const view = required(scene.controller.snapshot().view);
    expect(favourOfV7(view, view.viewer.id)).toBe(10);
    expect(view.cities.find((city) => city.id === capital.id)).toMatchObject({
      population: 0,
      offeredPopulation: 2,
    });
    // The notice (and its toast) carries both numbers, with or without
    // motion.
    await waitUntil(() => live().includes("Offering: +3 Favour"));
    expect(live()).toMatch(/Offering: \+3 Favour, −2\s*population/);
    await waitUntil(
      () => document.querySelector(".v7-favour-balance")?.textContent === "10",
    );
    // The city action is spent: no second Offering.
    scene.host.callbacks?.onSelection({ kind: "CITY", cityId: capital.id });
    expect(
      document.querySelector('[data-action="command-offering"]'),
    ).toBeNull();
    scene.app.destroy();
  });
});

describe("the Summoner's and the Chosen's abilities", () => {
  it("are shown in plain words", () => {
    const scene = rig(
      cultFieldV7([
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 2) },
      ]),
    );
    for (const where of [at(5, 2), at(6, 2)]) {
      select(scene, where);
      expect(dock().textContent ?? "").not.toMatch(
        /SACRIFICE|SEIZE|MARTYR|SUMMONER_SUPPORT/,
      );
    }
    scene.app.destroy();
  });
});
