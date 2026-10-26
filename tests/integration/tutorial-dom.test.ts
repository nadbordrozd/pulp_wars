// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  queryPlayerCommandsV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  TUTORIAL_FAREWELL_V7,
  TUTORIAL_PLACES_V7,
  TUTORIAL_REFUSED_V7,
  TUTORIAL_STEPS_V7,
  TUTORIAL_STORAGE_KEY_V7,
  parseTutorialProgressV7,
  serializeTutorialProgressV7,
  type TutorialStepIdV7,
} from "../../src/render/tutorial-v7";
import type { StorageAdapter } from "../../src/persistence/index";
import {
  FixtureController,
  RecordingBoardHost,
  boardPlan,
  required,
  requiredButton,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";
import {
  TutorialStorageV7,
  tutorialFixtureV7,
} from "../fixtures/v7-tutorial-ui";

/**
 * The tutorial in the interface (beads pulp_wars-0yxy and pulp_wars-2yc.115,
 * docs/ui/SCREEN_FLOW.md "Tutorial"): the menu's Tutorial button, the line
 * with its step counter, Next and Skip tutorial, the marker and the ringed
 * HUD button or `?`, and the forcing: at each step the interface offers the
 * step's commands and nothing else, and End turn is closed until its own
 * step. Every state is hand-built by applying the script's commands; no AI
 * runs.
 */
const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

function open(state: GameStateV7, storage: StorageAdapter | null) {
  const controller = new FixtureController(state);
  const host = new RecordingBoardHost();
  const app = new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: host, settingsStorage: storage },
  );
  return { controller, host, app };
}

function openAt(step: TutorialStepIdV7) {
  const fixture = tutorialFixtureV7(step);
  return { ...open(fixture.state, fixture.storage), storage: fixture.storage };
}

const line = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    '.v7-match-hud [data-v7-region="tutorial"]',
  );
const lineText = (): string | null =>
  line()?.querySelector(".v7-first-step-text")?.textContent ?? null;
const counter = (): string | null =>
  line()?.querySelector(".v7-tutorial-counter")?.textContent ?? null;
const action = (name: string): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`);
const stored = (storage: TutorialStorageV7) =>
  parseTutorialProgressV7(storage.getItem(TUTORIAL_STORAGE_KEY_V7));
const stepLine = (id: TutorialStepIdV7) =>
  required(TUTORIAL_STEPS_V7.find((step) => step.id === id));
const indexOf = (id: TutorialStepIdV7): number =>
  TUTORIAL_STEPS_V7.findIndex((step) => step.id === id);
/** "5/36": the counter at a step. */
const numberAt = (id: TutorialStepIdV7): string =>
  `${String(indexOf(id) + 1)}/${String(TUTORIAL_STEPS_V7.length)}`;
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 8; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

function unitAt(controller: FixtureController, at: CoordV7) {
  const view = required(controller.snapshot().view);
  return required(
    view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y),
  );
}

function capital(controller: FixtureController) {
  const view = required(controller.snapshot().view);
  return required(
    view.cities.find(
      (city) => city.ownerId === view.viewer.id && city.isCapital,
    ),
  );
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("the Tutorial button of the main menu", () => {
  const menuActions = (): readonly (string | undefined)[] =>
    [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-main-menu button"),
    ].map((item) => item.dataset.action);

  it("is first and primary for a first-time player, and starts the tutorial", async () => {
    const app = bootstrapRuleset7App(document);
    expect(menuActions()).toEqual([
      "tutorial",
      "new-game",
      "campaign",
      "gallery",
      "front-settings",
      "about",
    ]);
    const tutorial = requiredButton("tutorial");
    expect(tutorial.textContent).toBe("Tutorial");
    expect(tutorial.classList.contains("is-primary")).toBe(true);
    expect(requiredButton("new-game").classList.contains("is-primary")).toBe(
      false,
    );
    tutorial.click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning &&
        line() !== null,
    );
    expect(app.controller.snapshot().view?.setup).toMatchObject({
      mapType: "MISSION",
      mission: { id: "TUTORIAL_1" },
      factions: ["ORIGINAL", "GOBLIN"],
      width: 11,
    });
    expect(counter()).toBe("1/36");
    expect(lineText()).toBe(stepLine("HARVEST").line);
    expect(
      parseTutorialProgressV7(
        window.localStorage.getItem(TUTORIAL_STORAGE_KEY_V7),
      ),
    ).toEqual({ completed: false, step: 0 });
    // The real controller offers everything; the interface only the step.
    expect(app.controller.snapshot().offeredCommands.length).toBeGreaterThan(5);
    expect(requiredButton("end-turn").disabled).toBe(true);
    // The first step is on the board: the Tech button is not pointed at.
    expect(requiredButton("tech").dataset.firstStep).toBeUndefined();
    app.destroy();
  });

  it("is an ordinary second button once the tutorial was finished or skipped", () => {
    window.localStorage.setItem(
      TUTORIAL_STORAGE_KEY_V7,
      serializeTutorialProgressV7({ completed: true, step: null }),
    );
    const app = bootstrapRuleset7App(document);
    expect(menuActions()).toEqual([
      "new-game",
      "tutorial",
      "campaign",
      "gallery",
      "front-settings",
      "about",
    ]);
    expect(requiredButton("tutorial").classList.contains("is-primary")).toBe(
      false,
    );
    expect(requiredButton("new-game").classList.contains("is-primary")).toBe(
      true,
    );
    app.destroy();
  });

  it("asks before it replaces a saved game, and starts over at the first step", async () => {
    const app = bootstrapRuleset7App(document);
    requiredButton("tutorial").click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning &&
        line() !== null,
    );
    // Skip, then save and quit: a saved game is waiting on the menu.
    requiredButton("tutorial-skip").click();
    expect(line()).toBeNull();
    requiredButton("compact-menu").click();
    requiredButton("main-menu").click();
    await waitUntil(() => action("resume") !== null);
    expect(menuActions()).toEqual([
      "resume",
      "new-game",
      "tutorial",
      "campaign",
      "gallery",
      "front-settings",
      "about",
    ]);
    requiredButton("tutorial").click();
    await settle();
    // Nothing was started; the button asks.
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    expect(requiredButton("tutorial").textContent).toBe("Replace saved game?");
    requiredButton("tutorial").click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning &&
        line() !== null,
    );
    expect(counter()).toBe("1/36");
    expect(
      parseTutorialProgressV7(
        window.localStorage.getItem(TUTORIAL_STORAGE_KEY_V7),
      ),
    ).toEqual({ completed: true, step: 0 });
    app.destroy();
  });
});

describe("the tutorial's line and cue", () => {
  it("shows the step's number, its text, Skip tutorial, and no Next on a command step", () => {
    const { host, app } = openAt("CRAFTING");
    const cue = required(line());
    expect(document.querySelectorAll(".v7-first-step")).toHaveLength(1);
    expect(cue.dataset.tutorialStep).toBe("crafting");
    expect(cue.getAttribute("role")).toBe("status");
    expect(counter()).toBe("16/36");
    expect(
      cue.querySelector(".v7-tutorial-counter")?.getAttribute("aria-label"),
    ).toBe("Step 16 of 36");
    expect(lineText()).toBe(stepLine("CRAFTING").line);
    expect(requiredButton("tutorial-skip").textContent).toBe("Skip tutorial");
    expect(action("tutorial-next")).toBeNull();
    // No dialog: nothing dims or blocks the board.
    expect(cue.getAttribute("aria-modal")).toBeNull();
    expect(document.querySelector(".v7-scrim")).toBeNull();
    expect(host.lastModel?.interactive).toBe(true);
    // The Tech button is pointed at; the board has no marker for it.
    expect(requiredButton("tech").dataset.firstStep).toBe("pulse");
    expect(host.lastModel?.firstStepMarker).toBeNull();
    app.destroy();
  });

  it("marks the fruit, then the Fighter and its village, the city, and the Goblin", () => {
    const harvest = openAt("HARVEST");
    expect(harvest.host.lastModel?.firstStepMarker).toEqual({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
      motion: "HOP",
    });
    harvest.host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
    });
    expect(lineText()).toBe(stepLine("HARVEST").selectedLine);
    expect(harvest.host.lastModel?.firstStepMarker).toBeNull();
    harvest.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';

    const move = openAt("MOVE");
    expect(move.host.lastModel?.firstStepMarker).toMatchObject({
      kind: "UNIT",
      at: TUTORIAL_PLACES_V7.walker,
    });
    move.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(move.controller, TUTORIAL_PLACES_V7.walker).id,
    });
    expect(lineText()).toBe(stepLine("MOVE").selectedLine);
    expect(move.host.lastModel?.firstStepMarker).toMatchObject({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.village,
    });
    move.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';

    const train = openAt("TRAIN");
    expect(train.host.lastModel?.firstStepMarker).toMatchObject({
      kind: "CITY",
      at: TUTORIAL_PLACES_V7.capital,
    });
    train.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';

    const attack = openAt("ATTACK");
    attack.host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(attack.controller, TUTORIAL_PLACES_V7.attacker).id,
    });
    expect(lineText()).toBe(stepLine("ATTACK").selectedLine);
    expect(attack.host.lastModel?.firstStepMarker).toMatchObject({
      kind: "UNIT",
      at: TUTORIAL_PLACES_V7.enemy,
    });
    attack.app.destroy();
  });

  it("never shows a coordinate, and the coach stays silent under it", () => {
    for (const step of TUTORIAL_STEPS_V7) {
      document.body.innerHTML = '<div id="app"></div>';
      const { app } = openAt(step.id);
      expect(document.querySelectorAll(".v7-first-step")).toHaveLength(1);
      expect(
        document.querySelector('[data-v7-region="first-step"]'),
      ).toBeNull();
      expect(line()?.textContent).not.toMatch(COORDINATE);
      expect(counter()).toBe(
        `${TUTORIAL_STEPS_V7.indexOf(step) + 1}/${TUTORIAL_STEPS_V7.length}`,
      );
      app.destroy();
    }
  });
});

describe("the tutorial's forcing", () => {
  it("research: only Crafting can be researched, its screen says so, and the Ore is then marked", async () => {
    const { controller, host, storage, app } = openAt("CRAFTING");
    expect(requiredButton("end-turn").disabled).toBe(true);
    expect(requiredButton("end-turn").dataset.tutorialGated).toBe("true");
    requiredButton("tech").click();
    const hint = requiredElement<HTMLElement>(
      '[data-v7-region="overlay-tech"] [data-v7-region="tutorial"]',
    );
    expect(hint.textContent).toBe(
      `${numberAt("CRAFTING")}${stepLine("CRAFTING").techLine}`,
    );
    expect(requiredButton("tech-drill").dataset.firstStep).toBe("pulse");
    expect(
      requiredButton("tech-marksmanship").dataset.firstStep,
    ).toBeUndefined();
    // Another technology: its details, and no Research button.
    requiredButton("tech-marksmanship").click();
    expect(action("research-marksmanship")).toBeNull();
    requiredButton("tech-drill").click();
    requiredButton("research-drill").click();
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(() => counter() === numberAt("ORE"));
    // The screen closed by itself; the next step is on the board: the Ore
    // Crafting revealed, marked.
    expect(
      document.querySelector('[data-v7-region="overlay-tech"]'),
    ).toBeNull();
    expect(lineText()).toBe(stepLine("ORE").line);
    expect(host.lastModel?.firstStepMarker).toMatchObject({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.ore,
    });
    const ore = required(controller.snapshot().view).board.tiles.find(
      (tile) =>
        tile.at.x === TUTORIAL_PLACES_V7.ore.x &&
        tile.at.y === TUTORIAL_PLACES_V7.ore.y,
    );
    expect(ore).toMatchObject({ resource: "ORE" });
    expect(requiredButton("tutorial-next").textContent).toBe("Next");
    expect(stored(storage)).toEqual({
      completed: false,
      step: indexOf("ORE"),
    });
    app.destroy();
  });

  it("harvest: the fruit has its action; the city trains nothing and another fruit has none", () => {
    const { controller, host, app } = openAt("HARVEST");
    // The engine offers a train, a move and an attack now.
    const offered = queryPlayerCommandsV7(required(controller.snapshot().view));
    expect(offered.map((command) => command.kind)).toEqual(
      expect.arrayContaining(["TRAIN", "MOVE", "ATTACK", "END_TURN"]),
    );
    // The interface is given the harvest alone.
    expect(host.lastModel?.offeredCommands).toEqual([
      { kind: "HARVEST_FRUIT", at: TUTORIAL_PLACES_V7.fruit },
    ]);
    host.callbacks?.onSelection({
      kind: "CITY",
      cityId: capital(controller).id,
    });
    expect(action("command-train")).toBeNull();
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 3, y: 9 } });
    expect(action("command-harvest_fruit")).toBeNull();
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.walker).id,
    });
    expect(boardPlan(host).targets).toEqual([]);
    host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
    });
    expect(requiredButton("command-harvest_fruit").disabled).toBe(false);
    expect(requiredButton("end-turn").disabled).toBe(true);
    app.destroy();
  });

  it("refuses a command the step does not expect before it reaches the engine", async () => {
    const { controller, host, app } = openAt("MOVE");
    const view = required(controller.snapshot().view);
    const walker = unitAt(controller, TUTORIAL_PLACES_V7.walker);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: walker.id });
    // The board shows one target: the village.
    const targets = boardPlan(host).targets;
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      family: "MOVE",
      at: TUTORIAL_PLACES_V7.village,
    });
    // A target the unforced board would have: another tile to move to.
    const model = required(host.lastModel);
    const elsewhere = required(
      buildBoardRenderPlanV7(
        view,
        queryPlayerCommandsV7(view),
        model.interaction,
      ).targets.find(
        (target) =>
          target.family === "MOVE" &&
          !(
            target.at.x === TUTORIAL_PLACES_V7.village.x &&
            target.at.y === TUTORIAL_PLACES_V7.village.y
          ),
      ),
    );
    host.callbacks?.onCommand(elsewhere);
    await settle();
    expect(controller.accepted).toEqual([]);
    expect(
      document.querySelector('[data-v7-region="toast"]')?.textContent,
    ).toBe(TUTORIAL_REFUSED_V7);
    expect(counter()).toBe(numberAt("MOVE"));
    // The step's own target goes through.
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    expect(controller.accepted[0]?.kind).toBe("MOVE");
    await waitUntil(() => counter() === numberAt("TRAIN"));
    app.destroy();
  });

  it("the explanation offers nothing but Next", async () => {
    const { controller, host, storage, app } = openAt("RESOURCES");
    expect(counter()).toBe(numberAt("RESOURCES"));
    expect(lineText()).toBe(stepLine("RESOURCES").line);
    expect(lineText()).toMatch(/Coins/);
    expect(lineText()).toMatch(/population/);
    expect(host.lastModel?.offeredCommands).toEqual([]);
    expect(host.lastModel?.firstStepMarker).toBeNull();
    expect(requiredButton("end-turn").disabled).toBe(true);
    host.callbacks?.onSelection({
      kind: "CITY",
      cityId: capital(controller).id,
    });
    expect(action("command-train")).toBeNull();
    requiredButton("tutorial-next").click();
    expect(counter()).toBe(numberAt("MOVE"));
    expect(action("tutorial-next")).toBeNull();
    expect(stored(storage)).toEqual({
      completed: false,
      step: indexOf("MOVE"),
    });
    expect(controller.accepted).toEqual([]);
    app.destroy();
  });

  it("End turn opens at its own step and is the only thing offered there", () => {
    const { host, app } = openAt("END_TURN_1");
    expect(counter()).toBe(numberAt("END_TURN_1"));
    const end = requiredButton("end-turn");
    expect(end.disabled).toBe(false);
    expect(end.dataset.tutorialGated).toBeUndefined();
    expect(end.dataset.firstStep).toBe("pulse");
    expect(host.lastModel?.offeredCommands).toEqual([{ kind: "END_TURN" }]);
    app.destroy();
  });

  it("Skip tutorial turns the match into an ordinary game at once", () => {
    const { controller, host, storage, app } = openAt("HARVEST");
    requiredButton("tutorial-skip").click();
    expect(line()).toBeNull();
    expect(stored(storage)).toEqual({ completed: true, step: null });
    expect(requiredButton("end-turn").disabled).toBe(false);
    expect(requiredButton("end-turn").dataset.tutorialGated).toBeUndefined();
    expect(host.lastModel?.offeredCommands).toEqual(
      controller.snapshot().offeredCommands,
    );
    host.callbacks?.onSelection({
      kind: "CITY",
      cityId: capital(controller).id,
    });
    expect(requiredButton("command-train").disabled).toBe(false);
    app.destroy();
  });

  it("the whole first turn is played through the interface, one thing a step", async () => {
    const { controller, host, storage, app } = openAt("HARVEST");
    host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fruit,
    });
    requiredButton("command-harvest_fruit").click();
    await waitUntil(() => counter() === numberAt("RESOURCES"));
    requiredButton("tutorial-next").click();
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.walker).id,
    });
    host.callbacks?.onCommand(required(boardPlan(host).targets[0]));
    await waitUntil(() => counter() === numberAt("TRAIN"));
    host.callbacks?.onSelection({
      kind: "CITY",
      cityId: capital(controller).id,
    });
    expect(lineText()).toBe(stepLine("TRAIN").selectedLine);
    requiredButton("command-train").click();
    await waitUntil(() => counter() === numberAt("DETAILS"));
    // The card: the Fighter, then its ringed ?; the card opens and the
    // explanation comes up once it is closed.
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.attacker).id,
    });
    requiredButton("unit-help").click();
    expect(action("close-unit-help")).not.toBeNull();
    expect(line()).toBeNull();
    requiredButton("close-unit-help").click();
    expect(counter()).toBe(numberAt("DETAILS_INFO"));
    requiredButton("tutorial-next").click();
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.attacker).id,
    });
    const attack = boardPlan(host).targets;
    expect(attack).toHaveLength(1);
    expect(attack[0]).toMatchObject({ at: TUTORIAL_PLACES_V7.enemy });
    host.callbacks?.onCommand(required(attack[0]));
    await waitUntil(() => counter() === numberAt("END_TURN_1"));
    expect(lineText()).toBe(stepLine("END_TURN_1").line);
    requiredButton("end-turn").click();
    await waitUntil(() => controller.accepted.length === 5);
    expect(controller.accepted.map((command) => command.kind)).toEqual([
      "HARVEST_FRUIT",
      "MOVE",
      "TRAIN",
      "ATTACK",
      "END_TURN",
    ]);
    // The opponent's turn: the record waits at the capture, with no line.
    await waitUntil(() => stored(storage).step === indexOf("CAPTURE"));
    expect(line()).toBeNull();
    app.destroy();
  });

  it("the card step marks the Fighter, then rings its ? without covering it", () => {
    const { controller, host, storage, app } = openAt("DETAILS");
    expect(host.lastModel?.firstStepMarker).toMatchObject({
      kind: "UNIT",
      at: TUTORIAL_PLACES_V7.attacker,
    });
    expect(host.lastModel?.offeredCommands).toEqual([]);
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.attacker).id,
    });
    expect(lineText()).toBe(stepLine("DETAILS").selectedLine);
    expect(host.lastModel?.firstStepMarker).toBeNull();
    const help = requiredButton("unit-help");
    expect(help.dataset.firstStep).toBe("pulse");
    // The line is in the HUD, the ? in the dock: the line covers nothing.
    expect(help.closest('[data-v7-region="tutorial"]')).toBeNull();
    expect(required(line()).closest(".v7-match-hud")).not.toBeNull();
    // Another unit's card does nothing for the step.
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.village).id,
    });
    expect(requiredButton("unit-help").dataset.firstStep).toBeUndefined();
    requiredButton("unit-help").click();
    expect(stored(storage).step).toBe(indexOf("DETAILS"));
    app.destroy();
  });

  it("a city's reward comes up during the tutorial without the choices that place a unit", async () => {
    const { controller, host, app } = openAt("FARM");
    host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.fertile,
    });
    requiredButton("command-build_farm").click();
    await waitUntil(() => action("reward-walls") !== null);
    // Level 3: Walls, never the Scouts and their Raider.
    expect(action("reward-survey")).toBeNull();
    requiredButton("reward-walls").click();
    await waitUntil(() => controller.accepted.length === 2);
    expect(controller.accepted.map((command) => command.kind)).toEqual([
      "BUILD_FARM",
      "CHOOSE_CITY_REWARD",
    ]);
    await waitUntil(() => counter() === numberAt("END_TURN_2"));
    app.destroy();
  });

  it("a later step of the turn may come first; the line stays with the first", async () => {
    const { controller, host, storage, app } = openAt("WINDMILL");
    // The board is given the Windmill's tile and the forest, nothing else.
    expect(
      host.lastModel?.offeredCommands.map((command) => command.kind),
    ).toEqual(["BUILD_WINDMILL", "BUILD_LUMBER_CAMP"]);
    host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.forest,
    });
    requiredButton("command-build_lumber_camp").click();
    await waitUntil(() => controller.accepted.length === 1);
    await settle();
    expect(counter()).toBe(numberAt("WINDMILL"));
    expect(lineText()).toBe(stepLine("WINDMILL").line);
    expect(stored(storage)).toEqual({
      completed: false,
      step: indexOf("WINDMILL"),
      ahead: [indexOf("LUMBER_CAMP")],
    });
    host.callbacks?.onSelection({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.windmill,
    });
    requiredButton("command-build_windmill").click();
    await waitUntil(() => counter() === numberAt("WINDMILL_INFO"));
    expect(host.lastModel?.firstStepMarker).toMatchObject({
      kind: "TILE",
      at: TUTORIAL_PLACES_V7.windmill,
    });
    requiredButton("tutorial-next").click();
    // The Lumber Camp is done: the turn's end is next.
    expect(counter()).toBe(numberAt("END_TURN_3"));
    app.destroy();
  });

  it("the Knight's third kill ends the tutorial: the farewell line, then an ordinary game", async () => {
    const { controller, host, storage, app } = openAt("OVERRUN_3");
    expect(counter()).toBe("36/36");
    expect(host.lastModel?.firstStepMarker).toMatchObject({
      kind: "UNIT",
      at: TUTORIAL_PLACES_V7.goblin2,
    });
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(controller, TUTORIAL_PLACES_V7.goblin2).id,
    });
    expect(lineText()).toBe(stepLine("OVERRUN_3").selectedLine);
    const targets = boardPlan(host).targets;
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ at: TUTORIAL_PLACES_V7.goblin3 });
    host.callbacks?.onCommand(required(targets[0]));
    await waitUntil(() => controller.accepted.length === 1);
    await waitUntil(() => line()?.dataset.tutorialStep === "done");
    expect(lineText()).toBe(TUTORIAL_FAREWELL_V7);
    expect(action("tutorial-skip")).toBeNull();
    expect(stored(storage)).toEqual({ completed: true, step: null });
    // Nothing is forced any more (once the attack has been shown).
    await waitUntil(() => !requiredButton("end-turn").disabled);
    expect(requiredButton("end-turn").dataset.tutorialGated).toBeUndefined();
    expect(host.lastModel?.offeredCommands).toEqual(
      controller.snapshot().offeredCommands,
    );
    requiredButton("tutorial-dismiss").click();
    expect(line()).toBeNull();
    app.destroy();
  });

  it("forces nothing in another match, whatever the record says", () => {
    const storage = new TutorialStorageV7();
    storage.setItem(
      TUTORIAL_STORAGE_KEY_V7,
      serializeTutorialProgressV7({ completed: false, step: 4 }),
    );
    const state = martianUiFieldV7(
      [{ seat: 0, role: "FIGHTER", at: { x: 8, y: 7 } }],
      { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [], 1: [] }, coins: 20 },
    );
    const { controller, host, app } = open(state, storage);
    expect(line()).toBeNull();
    expect(host.lastModel?.offeredCommands).toEqual(
      controller.snapshot().offeredCommands,
    );
    expect(requiredButton("end-turn").disabled).toBe(false);
    // The record is left as it was.
    expect(stored(storage)).toEqual({ completed: false, step: 4 });
    app.destroy();
  });

  it("gives up, without trapping the player, when the step cannot be done", () => {
    // The record says "Mine" on the first turn's board: no Engineering, so
    // neither the Mine nor the climb of its group can be done.
    const fixture = tutorialFixtureV7("HARVEST");
    fixture.storage.setItem(
      TUTORIAL_STORAGE_KEY_V7,
      serializeTutorialProgressV7({ completed: false, step: indexOf("MINE") }),
    );
    const { controller, host, app } = open(fixture.state, fixture.storage);
    expect(line()).toBeNull();
    expect(stored(fixture.storage)).toEqual({ completed: true, step: null });
    expect(host.lastModel?.offeredCommands).toEqual(
      controller.snapshot().offeredCommands,
    );
    expect(requiredButton("end-turn").disabled).toBe(false);
    app.destroy();
  });
});
