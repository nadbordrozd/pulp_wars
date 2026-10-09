// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  effectiveRoleRuleV7,
  previewRebakeV7,
  previewSugarRushV7,
  previewSugarTossV7,
  previewTopUpV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { targetHighlightStyleV7 } from "../../src/render/canvas/target-highlight-v7";
import {
  Ruleset7DomAppView,
  recruitmentRolePresentationV7,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  CANDY_FIELD_DEFENSE_EXPLANATION_V7,
  CANDY_HELP_RULES_V7,
  CRASHED_NOW_STATUS_V7,
  TOP_UP_LABEL_V7,
  TOP_UP_PICK_V7,
  TOP_UP_TOOLTIP_V7,
  HOME_SWEET_HOME_STATUS_V7,
  HOME_SWEET_HOME_UNLOCK_TEXT_V7,
  PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7,
  REBAKE_NO_COINS_V7,
  REBAKE_PICK_CRUMBS_V7,
  REBAKE_PICK_TILE_V7,
  REBAKE_TOOLTIP_V7,
  RUSH_PREVIEW_V7,
  SPLATTED_STATUS_V7,
  RUSHED_STATUS_V7,
  SUGAR_RUSH_CRASHED_V7,
  SUGAR_RUSH_MOVED_V7,
  SUGAR_RUSH_RUSHED_V7,
  SUGAR_RUSH_TOOLTIP_V7,
  SUGAR_TOSS_TOOLTIP_V7,
  candyRoleUnlockTextV7,
  crumbsTileLinesV7,
  rebakeTargetNameV7,
  sugarTossTargetNameV7,
  topUpBoardLabelV7,
} from "../../src/render/candy-presentation-v7";
import {
  CANDY_UI_V7,
  CANDY_VICTIM_V7,
  candyUiFieldV7,
  candyUiFixtureV7,
  candyVictimFixtureV7,
} from "../fixtures/v7-candy-ui";
import { martianUiFixtureV7 } from "../fixtures/v7-martian-ui";
import { HELP_SECTIONS_V7 } from "../../src/render/help-text-v7";

// Every Candy text and number expected below is read from the registry,
// the engine constants or a public preview of the same view: the balance
// bead (`pulp_wars-jdb.7`) may retune the faction.
const AT = CANDY_UI_V7;
const label = (role: Parameters<typeof effectiveRoleRuleV7>[0]): string =>
  effectiveRoleRuleV7(role, "CANDY").label;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const live = (): string =>
  document.querySelector("#v7-live")?.textContent ?? "";
/** A tile written out, as no player-facing text may. */
const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Candy setup", () => {
  it("offers Candy for every seat and launches it", async () => {
    const chosen = new SetupController();
    const app = mount(chosen, new RecordingBoardHost());
    const human = requiredElement<HTMLSelectElement>("#v7-faction-0");
    expect(
      [...human.options].find((option) => option.value === "CANDY")
        ?.textContent,
    ).toBe("Candy");
    human.value = "CANDY";
    human.dispatchEvent(new Event("change", { bubbles: true }));
    requiredButton("launch").click();
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]?.factions[0]).toBe("CANDY");
    app.destroy();
  });
});

describe("Candy unit dock", () => {
  it("shows Rushed, Home Sweet Home, Crashed and Splatted as chips with their sentence", () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, AT.rushedDonut);
    expect(chip("rushed")?.textContent).toBe("Rushed");
    expect(chip("home-sweet-home")?.title).toBe(HOME_SWEET_HOME_STATUS_V7);
    selectUnitAt(controller, host, AT.crashed);
    expect(chip("crashed")?.textContent).toBe("Crashed");
    expect(chip("crashed")?.title).toBe(CRASHED_NOW_STATUS_V7);
    expect(chip("crashed")?.getAttribute("aria-label")).toBe(
      CRASHED_NOW_STATUS_V7,
    );
    selectUnitAt(controller, host, AT.splatted);
    expect(chip("splatted")?.title).toBe(SPLATTED_STATUS_V7);
    selectUnitAt(controller, host, AT.gumdrop);
    expect(document.querySelector(".v7-candy-chip")).toBeNull();
    app.destroy();
  });

  it("shows a Rushed Chocolate Bunny's plain Rushed chip (Sugar Frenzy is gone)", () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, AT.rushedBear);
    const rushed = required(chip("rushed"));
    expect(rushed.title).toBe(RUSHED_STATUS_V7);
    expect(rushed.textContent).toBe("Rushed");
    expect(rushed.querySelectorAll(".v7-candy-pip")).toHaveLength(0);
    app.destroy();
  });

  it("names the Crumbs of a tile without naming the tile", () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    host.callbacks?.onSelection({ kind: "TILE", at: AT.crumbsBear });
    const crumbs = requiredElement<HTMLElement>("[data-crumbs]");
    const lines = crumbsTileLinesV7(
      required(controller.snapshot().view),
      AT.crumbsBear,
    );
    expect(crumbs.textContent).toBe(lines[0]);
    expect(crumbs.title).toBe(lines.join(". "));
    expect(crumbs.title).not.toMatch(COORDINATE);
    app.destroy();
  });

  it("explains the missing Field Defense", () => {
    const controller = new FixtureController(
      candyUiFieldV7([{ seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } }]),
    );
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, { x: 7, y: 8 });
    expect(requiredButton("candy-field-defense").title).toBe(
      CANDY_FIELD_DEFENSE_EXPLANATION_V7,
    );
    app.destroy();
  });
});

describe("Candy abilities through the dock and the board", () => {
  it("arms the Rush, shows the Rushed reach, and disarms without sending anything", () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const gumdrop = selectUnitAt(controller, host, AT.gumdrop);
    const rush = requiredButton("candy-sugar-rush");
    expect(rush.textContent).toBe("Sugar Rush");
    expect(rush.title).toBe(SUGAR_RUSH_TOOLTIP_V7);
    expect(rush.getAttribute("aria-pressed")).toBe("false");
    // The plain Sugar Rush command is no dock button any more.
    expect(document.querySelector('[data-action="command-sugar_rush"]')).toBe(
      null,
    );
    rush.click();
    // While it is armed the dock shows the aiming panel in place of the
    // actions: the icon and name, a "?", and Back. No tile.
    expect(document.querySelector('[data-action="candy-sugar-rush"]')).toBe(
      null,
    );
    const panel = requiredElement<HTMLElement>("[data-v7-candy-pick]");
    expect(panel.dataset.v7CandyPick).toBe("sugar_rush");
    expect(panel.querySelector(".v7-pick-title-text")?.textContent).toBe(
      "Sugar Rush",
    );
    expect(requiredButton("pick-info").title).toBe(SUGAR_RUSH_TOOLTIP_V7);
    expect(panel.textContent).not.toMatch(COORDINATE);
    const preview = required(
      previewSugarRushV7(required(controller.snapshot().view), gumdrop.id),
    );
    const plan = boardPlan(host);
    expect(
      plan.targets
        .filter((target) => target.family === "SUGAR_RUSH")
        .map((target) => target.at),
    ).toEqual(preview.destinations);
    expect(
      plan.targets.find((target) => target.family === "ATTACK")?.previewNote,
    ).toContain(RUSH_PREVIEW_V7);
    requiredButton("candy-pick-cancel").click();
    expect(document.querySelector("[data-v7-candy-pick]")).toBe(null);
    expect(controller.accepted).toEqual([]);
    expect(
      boardPlan(host).targets.some((target) => target.sugarRush !== undefined),
    ).toBe(false);
    // Escape disarms it too, and keeps the unit selected.
    requiredButton("candy-sugar-rush").click();
    expect(document.querySelector("[data-v7-candy-pick]")).not.toBe(null);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector("[data-v7-candy-pick]")).toBe(null);
    expect(
      requiredButton("candy-sugar-rush").getAttribute("aria-pressed"),
    ).toBe("false");
    expect(controller.accepted).toEqual([]);
    app.destroy();
  });

  it("sends SUGAR_RUSH and then the Move to a tile only the Rush reaches", async () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const gumdrop = selectUnitAt(controller, host, AT.gumdrop);
    requiredButton("candy-sugar-rush").click();
    const target = required(
      boardPlan(host).targets.find(
        (entry) => entry.sugarRush?.newReach === true,
      ),
    );
    host.callbacks?.onCommand(target);
    await waitUntil(() => controller.accepted.length === 2);
    expect(controller.accepted[0]).toEqual({
      kind: "SUGAR_RUSH",
      unitId: gumdrop.id,
    });
    expect(controller.accepted[1]?.kind).toBe("MOVE");
    expect(unitAt(controller, target.at).id).toBe(gumdrop.id);
    // The moved unit is Rushed, and says so.
    selectUnitAt(controller, host, target.at);
    expect(chip("rushed")?.textContent).toBe("Rushed");
    expect(requiredButton("candy-sugar-rush").dataset.disabledReason).toBe(
      SUGAR_RUSH_RUSHED_V7,
    );
    app.destroy();
  });

  it("sends SUGAR_RUSH and then the Attack for an attack in place", async () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const gumdrop = selectUnitAt(controller, host, AT.gumdrop);
    const enemy = unitAt(controller, AT.rushTarget);
    requiredButton("candy-sugar-rush").click();
    const attack = required(
      boardPlan(host).targets.find((entry) => entry.family === "ATTACK"),
    );
    host.callbacks?.onCommand(attack);
    await waitUntil(() => controller.accepted.length === 2);
    expect(controller.accepted).toEqual([
      { kind: "SUGAR_RUSH", unitId: gumdrop.id },
      { kind: "ATTACK", unitId: gumdrop.id, targetUnitId: enemy.id },
    ]);
    app.destroy();
  });

  it("names why a unit cannot Rush", () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    for (const [at, reason] of [
      [AT.movedGumdrop, SUGAR_RUSH_MOVED_V7],
      [AT.crashed, SUGAR_RUSH_CRASHED_V7],
      [AT.rushedBear, SUGAR_RUSH_RUSHED_V7],
    ] as const) {
      selectUnitAt(controller, host, at);
      const rush = requiredButton("candy-sugar-rush");
      expect(rush.getAttribute("aria-disabled")).toBe("true");
      expect(rush.dataset.disabledReason).toBe(reason);
      expect(rush.getAttribute("aria-label")).toBe(
        `Sugar Rush unavailable. ${reason}`,
      );
    }
    app.destroy();
  });

  it("re-bakes in two steps: the Crumbs, then the tile beside the Confectioner", async () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const confectioner = selectUnitAt(controller, host, AT.confectioner);
    // The Candy redesign: Top-Up replaced Frosting, and it is aimed from
    // its own button like Re-bake (no button per target).
    expect(document.querySelector('[data-action="command-tend_wounded"]')).toBe(
      null,
    );
    expect(document.querySelector('[data-action="command-top_up"]')).toBe(null);
    expect(requiredButton("candy-top-up").title).toBe(TOP_UP_TOOLTIP_V7);
    const rebake = requiredButton("candy-rebake");
    expect(rebake.title).toBe(REBAKE_TOOLTIP_V7);
    rebake.click();
    const preview = required(
      previewRebakeV7(required(controller.snapshot().view), confectioner.id),
    );
    // Bead pulp_wars-9im: no button per unit in the dock. The first step:
    // each pile in reach is a Place target, named by what it bakes back.
    expect(document.querySelector('[data-action^="rebake-"]')).toBe(null);
    expect(document.querySelector(".v7-candy-choice")).toBe(null);
    const panel = (): HTMLElement =>
      requiredElement<HTMLElement>("[data-v7-candy-pick]");
    expect(panel().dataset.rebakeStep).toBe("crumbs");
    expect(panel().textContent).toContain(REBAKE_PICK_CRUMBS_V7);
    const piles = [
      ...new Map(
        preview.options.map((option) => [
          `${option.from.x},${option.from.y}`,
          option,
        ]),
      ).values(),
    ];
    expect(
      boardPlan(host).targets.map((target) => [
        target.family,
        targetHighlightStyleV7(target.family),
        target.at,
      ]),
    ).toEqual(piles.map((option) => ["REBAKE_CRUMBS", "PLACE", option.from]));
    expect(panel().textContent).not.toMatch(COORDINATE);
    // Choosing a pile sends nothing and moves on to the tiles.
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find((target) =>
          same(target.at, AT.crumbsBear),
        ),
      ),
    );
    expect(controller.accepted).toEqual([]);
    expect(panel().dataset.rebakeStep).toBe("tile");
    expect(panel().textContent).toContain(REBAKE_PICK_TILE_V7);
    const tiles = preview.options.filter((option) =>
      same(option.from, AT.crumbsBear),
    );
    expect(
      boardPlan(host).targets.map((target) => [
        target.family,
        target.semanticLabel,
        target.at,
      ]),
    ).toEqual(
      tiles.map((option) => [
        "REBAKE",
        rebakeTargetNameV7(option.role, option.cost, option.hp),
        option.at,
      ]),
    );
    // Back returns to the piles; choosing the pile again, then a tile,
    // bakes.
    requiredButton("candy-pick-cancel").click();
    expect(panel().dataset.rebakeStep).toBe("crumbs");
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find((target) =>
          same(target.at, AT.crumbsBear),
        ),
      ),
    );
    host.callbacks?.onCommand(
      required(
        boardPlan(host).targets.find((target) =>
          same(target.at, AT.crumbsBear),
        ),
      ),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "REBAKE",
      unitId: confectioner.id,
      from: AT.crumbsBear,
      at: AT.crumbsBear,
    });
    await waitUntil(() =>
      live().includes(`Your ${label("CAPTAIN")} re-baked a ${label("KNIGHT")}`),
    );
    expect(unitAt(controller, AT.crumbsBear).role).toBe("KNIGHT");
    app.destroy();
  });

  it("tops up the unit picked on the board, each target with what it gets", async () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const confectioner = selectUnitAt(controller, host, AT.confectioner);
    const view = required(controller.snapshot().view);
    const preview = required(previewTopUpV7(view, confectioner.id));
    const button = requiredButton("candy-top-up");
    expect(button.getAttribute("aria-label")).toBe(
      `${TOP_UP_LABEL_V7}. ${TOP_UP_TOOLTIP_V7}`,
    );
    button.click();
    expect(host.lastModel?.interaction.candyPick).toEqual({
      kind: "TOP_UP",
      unitId: confectioner.id,
    });
    expect(
      requiredElement<HTMLElement>("[data-v7-candy-pick]").textContent,
    ).toContain(TOP_UP_PICK_V7);
    const targets = boardPlan(host).targets;
    expect(
      targets.map((target) => [
        target.family,
        targetHighlightStyleV7(target.family),
        target.previewLabel,
      ]),
    ).toEqual(
      preview.targets.map((entry) => [
        "TOP_UP",
        "SUPPORT",
        topUpBoardLabelV7(entry),
      ]),
    );
    host.callbacks?.onCommand(
      required(targets.find((target) => same(target.at, AT.topUpTarget))),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "TOP_UP",
      unitId: confectioner.id,
      targetUnitId: unitAt(controller, AT.topUpTarget).id,
    });
    await waitUntil(() =>
      live().includes(
        `Your ${label("CAPTAIN")} topped up a ${label("FIGHTER")}`,
      ),
    );
    app.destroy();
  });

  it("names why a Confectioner cannot Re-bake", () => {
    const controller = new FixtureController(candyUiFixtureV7({ coins: 0 }));
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, AT.confectioner);
    const rebake = requiredButton("candy-rebake");
    expect(rebake.getAttribute("aria-disabled")).toBe("true");
    expect(rebake.dataset.disabledReason).toBe(REBAKE_NO_COINS_V7);
    app.destroy();
  });

  it("shows a Gunner's moves, attacks and heals together, and tosses sugar to the unit picked on the board", async () => {
    const controller = new FixtureController(candyUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const gunner = selectUnitAt(controller, host, AT.gunner);
    const view = required(controller.snapshot().view);
    const preview = required(previewSugarTossV7(view, gunner.id));
    expect(preview.targets).toHaveLength(2);
    // Bead pulp_wars-9im: nothing is armed, and the board shows the
    // Gunner's Moves and the units it may heal, each in its own style and
    // on its own tile.
    expect(host.lastModel?.interaction.candyPick ?? null).toBe(null);
    const unarmed = boardPlan(host).targets;
    const styles = new Set(
      unarmed.map((target) => targetHighlightStyleV7(target.family)),
    );
    expect(styles.has("MOVE")).toBe(true);
    expect(styles.has("SUPPORT")).toBe(true);
    expect(
      new Set(unarmed.map((target) => `${target.at.x},${target.at.y}`)).size,
    ).toBe(unarmed.length);
    const heals = (): ReturnType<typeof boardPlan>["targets"] =>
      boardPlan(host).targets.filter(
        (target) => target.family === "SUGAR_TOSS",
      );
    expect(heals().map((target) => target.previewLabel)).toEqual(
      preview.targets.map((target) => `+${target.amount}`),
    );
    for (const target of preview.targets) {
      const unit = required(
        view.units.find((candidate) => candidate.id === target.unitId),
      );
      expect(
        required(heals().find((entry) => same(entry.at, unit.at)))
          .semanticLabel,
      ).toBe(
        sugarTossTargetNameV7(
          effectiveRoleRuleV7(unit.role, "CANDY").label,
          target.amount,
        ),
      );
    }
    // The one Sugar Toss button arms it: only the heals stay, and the dock
    // lists no unit.
    const toss = requiredButton("candy-sugar-toss");
    expect(toss.title).toBe(SUGAR_TOSS_TOOLTIP_V7);
    toss.click();
    expect(host.lastModel?.interaction.candyPick).toEqual({
      kind: "SUGAR_TOSS",
      unitId: gunner.id,
    });
    expect(document.querySelector('[data-action^="sugar-toss-"]')).toBe(null);
    expect(document.querySelector(".v7-candy-choice")).toBe(null);
    expect(boardPlan(host).targets.map((target) => target.family)).toEqual(
      preview.targets.map(() => "SUGAR_TOSS"),
    );
    // Escape disarms; the heals stay on the board beside the Moves.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(host.lastModel?.interaction.candyPick ?? null).toBe(null);
    expect(heals()).toHaveLength(2);
    const near = unitAt(controller, AT.tossNear);
    host.callbacks?.onCommand(
      required(heals().find((target) => same(target.at, AT.tossNear))),
    );
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]).toEqual({
      kind: "SUGAR_TOSS",
      unitId: gunner.id,
      targetUnitId: near.id,
    });
    await waitUntil(() => live().includes("tossed sugar to a"));
    expect(unitAt(controller, AT.tossNear).hp).toBe(near.hp + 2);
    // A Crashed Gunner names why it cannot toss.
    selectUnitAt(controller, host, AT.crashedGunner);
    expect(requiredButton("candy-sugar-toss").dataset.disabledReason).toBe(
      SUGAR_RUSH_CRASHED_V7,
    );
    app.destroy();
  });

  it("offers no Candy button to a Human viewer, and shows the Bounce on the board", () => {
    const controller = new FixtureController(candyVictimFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    selectUnitAt(controller, host, CANDY_VICTIM_V7.fighter);
    expect(document.querySelector("[data-candy-ability]")).toBe(null);
    const attack = required(
      boardPlan(host).targets.find((target) => target.family === "ATTACK"),
    );
    expect(attack.previewNote).toContain("Bounces back");
    expect(attack.previewNote).not.toMatch(COORDINATE);
    expect(attack.bounce?.blocked).toBe(false);
    app.destroy();
  });
});

describe("Candy Help and technology", () => {
  it("has the same short Help in a match with a Candy seat, with no Candy section", () => {
    // Bead pulp_wars-2yc.39: Help is high level; what a Candy unit does is
    // in its "?" and in the Gallery.
    for (const fixture of [candyUiFixtureV7, candyVictimFixtureV7]) {
      document.body.innerHTML = '<div id="app"></div>';
      const controller = new FixtureController(fixture());
      const app = mount(controller, new RecordingBoardHost());
      requiredButton("compact-menu").click();
      requiredButton("help").click();
      expect(
        [...document.querySelectorAll(".v7-help h3")].map(
          (node) => node.textContent,
        ),
      ).toEqual(HELP_SECTIONS_V7.map((section) => section.title));
      const help = document.querySelector(".v7-help")?.textContent ?? "";
      for (const [name] of CANDY_HELP_RULES_V7)
        expect(help).not.toContain(`${name}:`);
      expect(help).not.toMatch(COORDINATE);
      app.destroy();
    }
    document.body.innerHTML = '<div id="app"></div>';
    const martian = new FixtureController(martianUiFixtureV7());
    const app = mount(martian, new RecordingBoardHost());
    requiredButton("compact-menu").click();
    requiredButton("help").click();
    expect(document.querySelector(".v7-help-candy")).toBe(null);
    app.destroy();
  });

  it("names Home Sweet Home, Peppermint Surprise and the Candy units in the technology tree", () => {
    const app = mount(
      new FixtureController(candyUiFixtureV7()),
      new RecordingBoardHost(),
    );
    requiredButton("tech").click();
    const unlocks = (tech: string): (string | null)[] => {
      requiredButton(`tech-${tech}`).click();
      return [...document.querySelectorAll(".v7-tech-unlocks li")].map(
        (item) => item.textContent,
      );
    };
    expect(
      requiredButton("tech-fortification").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Home Sweet Home");
    // (The Industry reshuffle, 7r56: the defender is trained with it.)
    expect(unlocks("fortification")).toEqual([
      "Train Marshmallow (Bounce)",
      HOME_SWEET_HOME_UNLOCK_TEXT_V7,
    ]);
    expect(
      requiredButton("tech-explosives").querySelector(".v7-tech-name")
        ?.textContent,
    ).toBe("Peppermint Surprise");
    expect(unlocks("explosives")).toEqual(
      expect.arrayContaining([PEPPERMINT_SURPRISE_UNLOCK_TEXT_V7]),
    );
    expect(unlocks("administration")).toContain(
      candyRoleUnlockTextV7("CAPTAIN"),
    );
    // (The Industry reshuffle, 7r56: the root gives the Workshop.)
    expect(unlocks("drill")).toContain("Build workshop");
    expect(unlocks("drill")).not.toContain(candyRoleUnlockTextV7("GUARD"));
    app.destroy();
    const confectioner = recruitmentRolePresentationV7("CAPTAIN", "CANDY");
    expect(confectioner.label).toBe(label("CAPTAIN"));
    expect(
      confectioner.abilities.some((line) => line.startsWith("Top-Up:")),
    ).toBe(true);
    expect(
      confectioner.abilities.some((line) => line.startsWith("Re-bake:")),
    ).toBe(true);
    expect(
      recruitmentRolePresentationV7("GUARD", "CANDY").abilities.some((line) =>
        line.startsWith("Bouncy:"),
      ),
    ).toBe(true);
  });
});

function chip(status: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.v7-selection-dock [data-unit-status="${status}"]`,
  );
}

class SetupController implements Ruleset7ControllerPortV7 {
  readonly launched: MatchSetupV7[] = [];
  snapshot(): Ruleset7BrowserSnapshot {
    return {
      phase: "EMPTY",
      view: null,
      offeredCommands: [],
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: idleAi(),
    };
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.snapshot());
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async (setup) => {
    this.launched.push(setup);
    return {
      ok: false,
      code: "INVALID_SETUP",
      diagnostic: "Setup recorded",
    };
  };
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NOT_OFFERED",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "No restart",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

class FixtureController extends SetupController {
  readonly accepted: CommandV7[] = [];
  readonly #snapshotSubscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;

  constructor(state: GameStateV7) {
    super();
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  override snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  override subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#snapshotSubscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#snapshotSubscribers.delete(subscriber);
  }
  override subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }
  override readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    const beforeState = this.#state;
    const beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
    const result = applyCommandV7(
      beforeState,
      beforeState.humanPlayerId,
      command,
    );
    if (!result.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: result.error,
      };
    this.accepted.push(command);
    this.#state = result.state;
    const afterView = viewForV7(result.state, result.state.humanPlayerId);
    const playerEvents = projectEventsV7(
      beforeState,
      result.state,
      result.state.humanPlayerId,
      result.events,
    );
    this.#snapshot = activeSnapshot(result.state);
    const boundary = {
      actor: "HUMAN" as const,
      beforeView,
      afterView,
      playerEvents,
    };
    for (const subscriber of this.#boundarySubscribers) subscriber(boundary);
    for (const subscriber of this.#snapshotSubscribers)
      subscriber(this.#snapshot);
    return { accepted: true, beforeView, afterView, playerEvents };
  };
}

class RecordingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  lastModel: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.lastModel = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function activeSnapshot(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: idleAi(),
  };
}

function idleAi(): Ruleset7BrowserSnapshot["ai"] {
  return {
    active: false,
    fastForward: false,
    policySlices: 0,
    acceptedCommands: 0,
    lastSliceMilliseconds: 0,
    maximumSliceMilliseconds: 0,
  };
}

function mount(
  controller: Ruleset7ControllerPortV7,
  host: BoardHostV7,
): Ruleset7DomAppView {
  return new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: null },
  );
}

type PublicUnit = NonNullable<Ruleset7BrowserSnapshot["view"]>["units"][number];

function unitAt(controller: FixtureController, at: CoordV7): PublicUnit {
  return required(
    controller
      .snapshot()
      .view?.units.find((item) => item.at.x === at.x && item.at.y === at.y),
  );
}

function selectUnitAt(
  controller: FixtureController,
  host: RecordingBoardHost,
  at: CoordV7,
): PublicUnit {
  const unit = unitAt(controller, at);
  host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
  return unit;
}

/** The board plan the real host would build from the last model. */
function boardPlan(
  host: RecordingBoardHost,
): ReturnType<typeof buildBoardRenderPlanV7> {
  const model = required(host.lastModel);
  return buildBoardRenderPlanV7(
    model.view,
    model.offeredCommands,
    model.interaction,
  );
}

/**
 * The Candy redesign (`pulp_wars-jdb.12`): the Re-bake targets the board
 * plan shows, one per placement tile (the dearest offered Crumbs).
 */
function requiredButton(action: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(`[data-action="${action}"]`);
}

function requiredElement<T extends Element>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (result === null) throw new Error(`${selector} missing`);
  return result;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required Candy DOM fixture value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
