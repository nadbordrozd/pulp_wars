// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseNormalCommandV6 } from "../../src/ai/index";
import {
  bootstrapRuleset6App,
  type Ruleset6BrowserController,
  type Ruleset6BrowserSnapshot,
} from "../../src/app/index";
import {
  canonicalHash,
  canonicalJson,
  createPlayableGameV6,
  queryPlayerCommandsV6,
  runReplayV6,
  TECHNOLOGY_IDS,
  unitId,
  viewForV6,
  type CommandV6,
  type DomainEventV6,
  type MatchSetupV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import type {
  BoardHostV6,
  CanvasBoardHostCallbacksV6,
  CanvasBoardHostModelV6,
} from "../../src/render/canvas/board-host-v6";
import type { MapCommandTargetV6 } from "../../src/render/canvas/render-plan-v6";
import {
  Ruleset6DomAppView,
  type Ruleset6BrowserControllerPort,
} from "../../src/render/dom/app-view-v6";
import {
  SAVE_STORAGE_KEY,
  parseSaveV6,
  type StorageAdapter,
} from "../../src/persistence/index";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

const ECONOMIC_COMMAND_KINDS = [
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;

describe("playable ruleset-6 DOM shell", () => {
  it("boots the production v6 setup, constrains sizes, and launches explicit Candy seats", async () => {
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: host,
    });
    expect(document.querySelector("[data-v6-setup]")).not.toBeNull();
    expect(document.body.textContent).toContain("spatial economy");

    changeSelect("v6-ai-count", "3");
    expect(selectValues("v6-board-size")).toEqual(["16", "20", "25"]);
    expect(document.querySelectorAll("[data-faction-seat]")).toHaveLength(4);
    changeSelect("v6-ai-count", "1");
    changeSelect("v6-faction-0", "CANDY");
    changeSelect("v6-faction-1", "CANDY");
    changeSelect("v6-color", "TEAL");
    setInput("v6-seed", "9");
    submit("[data-v6-setup]");
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");

    expect(app.controller.snapshot().view?.viewer).toMatchObject({
      faction: "CANDY",
      factionTreeId: "CANDY_BASELINE_V1",
      color: "TEAL",
    });
    expect(app.controller.snapshot().view?.setup.factions).toEqual([
      "CANDY",
      "CANDY",
    ]);
    expect(host.model?.view.schemaVersion).toBe(6);
    expect(document.body.textContent).toContain("Coins");
    expect(document.body.textContent).toContain("Round");
    expect(document.querySelector("[data-tech-tree]")).toBeNull();
    expect(document.querySelector("[data-action=end-turn]")).not.toBeNull();
    expect(document.body.textContent).toContain("Candy match launched.");
    app.destroy();
    expect(host.destroyCalls).toBeGreaterThan(0);
    expect(document.querySelector("#app")?.children).toHaveLength(0);
  });

  it("advances the exact AI-first Candy launch, replacement, and restart boundary once", async () => {
    const storage = new MemoryStorage();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
      persistenceNow: () => "2026-08-31T20:00:00.000Z",
    });
    const firstProgress = vi.spyOn(first.controller, "progressAiTurns");
    configureAiFirstCandyLaunch();
    submit("[data-v6-setup]");
    await waitForHumanTurn(first.controller, 3);

    const launchBoundary = first.controller.snapshot();
    expect(firstProgress).toHaveBeenCalledTimes(1);
    expect(launchBoundary).toMatchObject({
      phase: "ACTIVE",
      transitioning: false,
      commandIndex: 3,
      stateHash:
        "56fc6cb52c2babc1947d77843220dbb03d871c715aee01098f1066fe197b5928",
      view: {
        turnOrder: [2, 1],
        activeSeatIndex: 1,
        viewer: { id: 1, faction: "CANDY" },
      },
    });
    expect(document.querySelector("#v6-live")?.textContent).toBe(
      "AI completed 3 actions. Your turn.",
    );
    expect(document.body.textContent).not.toContain("AI turn");
    const replay = first.controller.exportReplay();
    if (replay === null) throw new Error("Missing AI-first replay");
    expect(replay.commands).toHaveLength(launchBoundary.commandIndex);
    expect(runReplayV6(replay)).toMatchObject({
      acceptedCommands: launchBoundary.commandIndex,
      stateHash: launchBoundary.stateHash,
    });
    expectPersistedBoundary(storage, launchBoundary);

    click("[data-action=restart]");
    await waitUntil(
      () =>
        firstProgress.mock.calls.length === 2 &&
        first.controller.snapshot().stateHash === launchBoundary.stateHash &&
        first.controller.snapshot().transitioning === false,
    );
    expect(firstProgress).toHaveBeenCalledTimes(2);
    expect(first.controller.snapshot().commandIndex).toBe(3);
    expect(first.controller.exportReplay()?.commands).toHaveLength(3);
    expectPersistedBoundary(storage, first.controller.snapshot());
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const replacement = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
      persistenceNow: () => "2026-08-31T20:01:00.000Z",
    });
    expect(replacement.controller.snapshot().phase).toBe("RESUMABLE");
    const replacementProgress = vi.spyOn(
      replacement.controller,
      "progressAiTurns",
    );
    click("[data-action=show-replace]");
    configureAiFirstCandyLaunch();
    submit("[data-v6-setup]");
    await waitForHumanTurn(replacement.controller, 3);
    expect(replacementProgress).toHaveBeenCalledTimes(1);
    expect(replacement.controller.snapshot().stateHash).toBe(
      launchBoundary.stateHash,
    );
    expectPersistedBoundary(storage, replacement.controller.snapshot());
    replacement.destroy();
  });

  it("leaves human-first launch unchanged and never progresses rejected launch or restart", async () => {
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: new FakeBoardHostV6(),
    });
    const progress = vi.spyOn(app.controller, "progressAiTurns");
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        app.controller.snapshot().transitioning === false,
    );
    expect(app.controller.snapshot()).toMatchObject({
      commandIndex: 0,
      view: { turnOrder: [1, 2], activeSeatIndex: 0, viewer: { id: 1 } },
    });
    expect(progress).not.toHaveBeenCalled();

    vi.spyOn(app.controller, "restart").mockResolvedValue({
      ok: false,
      code: "INVALID_SETUP",
      diagnostic: "Synthetic restart rejection.",
    });
    click("[data-action=restart]");
    await waitUntil(() =>
      Boolean(
        document.body.textContent?.includes("Synthetic restart rejection."),
      ),
    );
    expect(progress).not.toHaveBeenCalled();
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const rejected = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: new FakeBoardHostV6(),
    });
    const rejectedProgress = vi.spyOn(rejected.controller, "progressAiTurns");
    vi.spyOn(rejected.controller, "launch").mockResolvedValue({
      ok: false,
      code: "INVALID_SETUP",
      diagnostic: "Synthetic launch rejection.",
    });
    submit("[data-v6-setup]");
    await waitUntil(() =>
      Boolean(
        document.body.textContent?.includes("Synthetic launch rejection."),
      ),
    );
    expect(rejectedProgress).not.toHaveBeenCalled();
    rejected.destroy();
  });

  it("publishes AI transition state and is safe to destroy during initial progression", async () => {
    let releaseFirstDecision: (() => void) | undefined;
    let firstDecision = true;
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: new FakeBoardHostV6(),
      chooseAiCommand: async (view) => {
        if (firstDecision) {
          firstDecision = false;
          await new Promise<void>((resolve) => {
            releaseFirstDecision = resolve;
          });
        }
        return chooseNormalCommandV6(view);
      },
    });
    const progress = vi.spyOn(app.controller, "progressAiTurns");
    configureAiFirstCandyLaunch();
    submit("[data-v6-setup]");
    await waitUntil(() => releaseFirstDecision !== undefined);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(app.controller.snapshot().transitioning).toBe(true);
    expect(document.body.textContent).toContain("Thinking…");
    expect(document.querySelector("#v6-live")?.textContent).toBe(
      "AI turns are progressing…",
    );

    app.destroy();
    releaseFirstDecision?.();
    await waitUntil(() => app.controller.snapshot().transitioning === false);
    expect(document.querySelector("#app")?.children).toHaveLength(0);
    expect(progress).toHaveBeenCalledTimes(1);
  });

  it("surfaces an AI-first progression failure without queuing a second operation", async () => {
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: new FakeBoardHostV6(),
      chooseAiCommand: () => ({
        difficulty: "NORMAL",
        candidates: [],
        command: null,
        prngDraws: 0,
      }),
    });
    const progress = vi.spyOn(app.controller, "progressAiTurns");
    configureAiFirstCandyLaunch();
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ERROR" &&
        app.controller.snapshot().transitioning === false &&
        document
          .querySelector("#v6-alert")
          ?.textContent?.includes("AI progression stopped") === true,
    );
    expect(progress).toHaveBeenCalledTimes(1);
    expect(app.controller.snapshot()).toMatchObject({
      phase: "ERROR",
      commandIndex: 0,
      diagnostic: "Normal AI produced no exact public command.",
    });
    expect(document.querySelector("#v6-alert")?.textContent).toBe(
      "AI progression stopped: Normal AI produced no exact public command.",
    );
    app.destroy();
  });

  it("keeps Move and Attack on exact map dispatch while omitting positional and Research buttons", async () => {
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: host,
    });
    submit("[data-v6-setup]");
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const initial = app.controller.snapshot();
    const unit = initial.view?.units.find(
      (candidate) => candidate.ownerId === initial.view?.viewer.id,
    );
    if (unit === undefined) throw new Error("Missing owned unit");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(document.querySelector('[data-command-kind="MOVE"]')).toBeNull();
    expect(document.querySelector('[data-command-kind="ATTACK"]')).toBeNull();
    expect(document.querySelector('[data-command-kind="RESEARCH"]')).toBeNull();
    expect(document.querySelector("[data-tech-tree]")).toBeNull();
    expect(document.querySelector(".v6-all-actions")).toBeNull();

    const research = requireCommand(initial, "RESEARCH");
    const end = requireCommand(initial, "END_TURN");
    host.callbacks?.onCommandCandidates(
      [target(research, unit.at), target(end, unit.at)],
      unit.at,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(app.controller.snapshot().commandIndex).toBe(0);

    const move = requireCommand(initial, "MOVE");
    host.callbacks?.onCommandCandidates(
      [target(move, move.path.at(-1) ?? unit.at)],
      move.path.at(-1) ?? unit.at,
    );
    await waitUntil(() => app.controller.snapshot().commandIndex === 1);
    expect(app.controller.exportReplay()?.commands.at(-1)).toEqual(move);
    app.destroy();
  });

  it("resumes, restarts, deletes, recovers corrupt saves, and flushes on lifecycle boundaries", async () => {
    const storage = new MemoryStorage();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
      persistenceNow: () => "2026-08-31T18:00:00.000Z",
    });
    submit("[data-v6-setup]");
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    window.dispatchEvent(new Event("pagehide"));
    expect(storage.writes).toBeGreaterThan(0);
    const hash = first.controller.snapshot().stateHash;
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const resumed = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    expect(resumed.controller.snapshot().phase).toBe("RESUMABLE");
    click("[data-action=resume]");
    await waitUntil(() => resumed.controller.snapshot().phase === "ACTIVE");
    expect(resumed.controller.snapshot().stateHash).toBe(hash);
    click("[data-action=restart]");
    await waitUntil(() => resumed.controller.snapshot().commandIndex === 0);
    click("[data-action=delete-save]");
    await waitUntil(() => resumed.controller.snapshot().phase === "EMPTY");
    expect(storage.removals).toBe(1);
    expect(document.body.textContent).toContain("Saved match deleted.");
    resumed.destroy();

    storage.setItem("pulpWars.save.current", "{ corrupt");
    document.body.innerHTML = '<div id="app"></div>';
    const recovery = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    expect(recovery.controller.snapshot().phase).toBe("RECOVERY");
    expect(document.body.textContent).toContain("Nothing was overwritten");
    click("[data-action=delete-save]");
    await waitUntil(() => recovery.controller.snapshot().phase === "EMPTY");
    recovery.destroy();
  });

  it("publishes a new host identity and final success render for command-zero restart and replacement", async () => {
    const storage = new MemoryStorage();
    const firstHost = new FakeBoardHostV6();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: firstHost,
    });
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        document.body.textContent?.includes("Original match launched.") ===
        true,
    );
    expect(firstHost.updateIds.at(-1)).toBe(1);
    expect(first.controller.snapshot().commandIndex).toBe(0);

    click("[data-action=restart]");
    await waitUntil(() => firstHost.updateIds.at(-1) === 2);
    expect(first.controller.snapshot().commandIndex).toBe(0);
    expect(document.body.textContent).toContain(
      "The match restarted from its original setup.",
    );
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const replacementHost = new FakeBoardHostV6();
    const replacement = bootstrapRuleset6App(document, {
      storage,
      boardHost: replacementHost,
    });
    expect(replacement.controller.snapshot().phase).toBe("RESUMABLE");
    click("[data-action=show-replace]");
    setInput("v6-seed", "8");
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        document.body.textContent?.includes("Original match launched.") ===
        true,
    );
    expect(replacement.controller.snapshot().view?.setup.seed).toBe(8);
    expect(replacementHost.updateIds).toContain(0);
    expect(replacementHost.updateIds.at(-1)).toBe(1);
    replacement.destroy();
  });

  it("isolates unit, city, and tile actions with exact art and accessible fallbacks", async () => {
    const view = publicView("CANDY");
    const commands = commandCatalogue(view);
    const fake = new FakeController(view, commands);
    const host = new FakeBoardHostV6();
    const root = requireElement("#app");
    const app = new Ruleset6DomAppView(document, root, fake, {
      boardHost: host,
    });
    expect(renderedCommandKinds()).toEqual(new Set(["END_TURN"]));
    expect(document.body.textContent).not.toContain("Research Farming");
    expect(document.body.textContent).not.toContain("All offered actions");

    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (unit === undefined || city === undefined)
      throw new Error("Missing public entities");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(renderedCommandKinds()).toEqual(
      new Set([
        "KAMIKAZE_ROLL",
        "HEAL_ADJACENT",
        "RECOVER",
        "CAPTURE",
        "PROMOTE",
        "WAIT",
        "BUILD_CHOCOLATE_WALL",
        "CANDIFY",
        "END_TURN",
      ]),
    );
    expect(document.querySelector('[data-command-kind="MOVE"]')).toBeNull();
    expect(document.querySelector('[data-command-kind="ATTACK"]')).toBeNull();
    expect(document.querySelector('[data-command-kind="RESEARCH"]')).toBeNull();
    expect(document.querySelector('[data-command-kind="TRAIN"]')).toBeNull();
    const contextButtons = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Selection actions"] button',
      ),
    ];
    expect(contextButtons.length).toBeGreaterThan(0);
    for (const action of contextButtons) {
      expect(action.ariaLabel).toBeTruthy();
      expect(action.querySelector(".v6-command-symbol")).not.toBeNull();
      expect(
        action.querySelector(".v6-command-label")?.textContent,
      ).toBeTruthy();
    }
    expect(
      document.querySelector<HTMLImageElement>(
        '[data-command-kind="CAPTURE"] [data-symbol-kind="accepted-raster"] img',
      )?.src,
    ).toContain("assets/pixellab/buildings/village.png");
    expect(
      document.querySelector(
        '[data-command-kind="WAIT"] [data-symbol-kind="code-native-fallback"]',
      ),
    ).not.toBeNull();
    const rollFamily = document.querySelector<HTMLButtonElement>(
      '[data-command-family="KAMIKAZE_ROLL"]',
    );
    rollFamily?.click();
    expect(host.model?.interaction.targetMode).toEqual({
      kind: "KAMIKAZE_ROLL",
      unitId: unit.id,
    });

    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    expect(renderedCommandKinds()).toEqual(new Set(["TRAIN", "END_TURN"]));
    const train = document.querySelector<HTMLButtonElement>(
      '[data-command-kind="TRAIN"]',
    );
    expect(train?.textContent).toContain("Candy Warrior · 2 Coins");
    expect(train?.ariaLabel).toBe("Train Candy Warrior for 2 Coins");
    expect(train?.querySelector<HTMLImageElement>("img")?.src).toContain(
      "assets/pixellab/units/candy-warrior.png",
    );
    const scoutTrain: CommandV6 = {
      kind: "TRAIN",
      cityId: city.id,
      role: "SCOUT",
    };
    fake.setSnapshot({
      ...fake.snapshot(),
      offeredCommands: [scoutTrain, { kind: "END_TURN" }],
    });
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    const scout = document.querySelector<HTMLButtonElement>(
      '[data-command-kind="TRAIN"]',
    );
    expect(scout?.textContent).toContain("Jelly Scout · 3 Coins");
    expect(
      scout?.querySelector('[data-symbol-kind="code-native-fallback"]'),
    ).not.toBeNull();
    fake.setSnapshot({ ...fake.snapshot(), offeredCommands: commands });

    host.callbacks?.onSelection({ kind: "TILE", at: city.at });
    expect(renderedCommandKinds()).toEqual(
      new Set([
        "HARVEST_FRUIT",
        "HUNT_GAME",
        "BUILD_FARM",
        "BUILD_LUMBER_CAMP",
        "BUILD_MINE",
        "BUILD_QUARRY",
        "BUILD_WINDMILL",
        "BUILD_SAWMILL",
        "BUILD_FORGE",
        "BUILD_STONEWORKS",
        "BUILD_WORKSHOP",
        "BUILD_GRAND_WORKS",
        "BUILD_MARKET",
        "CLEAR_FOREST",
        "REPLANT_FOREST",
        "BUILD_ROAD",
        "REDEVELOP",
        "END_TURN",
      ]),
    );
    const farm = commands.find((command) => command.kind === "BUILD_FARM");
    if (farm === undefined) throw new Error("Missing farm command");
    commandButton(farm).click();
    await waitUntil(() => fake.dispatch.mock.calls.length === 1);
    expect(fake.dispatch).toHaveBeenLastCalledWith(farm);
    expect(document.body.textContent).not.toContain("Map preview");
    expect(host.model?.interaction).toMatchObject({
      targetMode: null,
      economicPreview: null,
    });
    fake.dispatch.mockClear();

    host.callbacks?.onSelection({ kind: "TILE", at: { x: 10, y: 10 } });
    expect(renderedCommandKinds()).toEqual(new Set(["END_TURN"]));

    const move = commands.find((command) => command.kind === "MOVE");
    const attack = commands.find((command) => command.kind === "ATTACK");
    const wait = commands.find((command) => command.kind === "WAIT");
    if (move === undefined || attack === undefined || wait === undefined)
      throw new Error("Missing positional catalogue commands");
    host.callbacks?.onCommandCandidates(
      [target(wait, unit.at), target(move, unit.at)],
      unit.at,
    );
    await waitUntil(() => fake.dispatch.mock.calls.length === 1);
    expect(fake.dispatch).toHaveBeenLastCalledWith(move);
    host.callbacks?.onCommandCandidates([target(attack, unit.at)], unit.at);
    await waitUntil(() => fake.dispatch.mock.calls.length === 2);
    expect(fake.dispatch).toHaveBeenLastCalledWith(attack);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "E" }));
    await waitUntil(() => fake.dispatch.mock.calls.length === 3);
    expect(fake.dispatch).toHaveBeenLastCalledWith({ kind: "END_TURN" });

    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    const waitButton = commandButton(wait);
    waitButton.focus();
    waitButton.click();
    await waitUntil(() => fake.dispatch.mock.calls.length === 4);
    expect(fake.dispatch).toHaveBeenLastCalledWith(wait);

    const rivalUnit = view.units.find(
      (candidate) => candidate.ownerId !== view.viewer.id,
    );
    if (rivalUnit !== undefined) {
      host.callbacks?.onSelection({ kind: "UNIT", unitId: rivalUnit.id });
      expect(renderedCommandKinds()).toEqual(new Set(["END_TURN"]));
    }

    app.destroy();
  });

  it("dispatches every selected-tile economy command directly for pointer, keyboard, and touch activation", async () => {
    const view = publicView("ORIGINAL");
    const commands = commandCatalogue(view);
    const economicCommands = commands.filter((command) =>
      ECONOMIC_COMMAND_KINDS.some((kind) => command.kind === kind),
    );
    const fake = new FakeController(view, commands);
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("Missing owned city");
    host.callbacks?.onSelection({ kind: "TILE", at: city.at });

    for (const [index, command] of economicCommands.entries()) {
      const action = commandButton(command);
      if (index % 3 === 0) {
        action.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            detail: 1,
          }),
        );
      } else if (index % 3 === 1) {
        action.focus();
        action.click();
      } else {
        const touchClick = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          detail: 1,
        });
        Object.defineProperty(touchClick, "pointerType", { value: "touch" });
        action.dispatchEvent(touchClick);
      }
      await waitUntil(() => fake.dispatch.mock.calls.length === index + 1);
      expect(fake.dispatch).toHaveBeenLastCalledWith(command);
      expect(host.model?.interaction).toMatchObject({
        targetMode: null,
        economicPreview: null,
      });
      expect(document.body.textContent).not.toContain("Map preview");
      expect(document.querySelector(".v6-command-dialog")).toBeNull();
    }

    expect(economicCommands).toHaveLength(ECONOMIC_COMMAND_KINDS.length);
    expect(fake.economicPreview).not.toHaveBeenCalled();

    fake.dispatch.mockResolvedValueOnce({
      accepted: false,
      reason: "NOT_OFFERED",
    });
    const rejectedCommand = economicCommands[0];
    if (rejectedCommand === undefined)
      throw new Error("Missing rejected economy command");
    commandButton(rejectedCommand).click();
    await waitUntil(() =>
      Boolean(
        document.body.textContent?.includes("Action rejected: NOT_OFFERED"),
      ),
    );
    expect(document.body.textContent).not.toContain("Map preview");
    expect(host.model?.interaction.economicPreview).toBeNull();
    app.destroy();
  });

  it("records one replay boundary when a real selected-tile action button is activated", async () => {
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage: null,
      boardHost: host,
    });
    setInput("v6-seed", "8");
    submit("[data-v6-setup]");
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    const before = app.controller.snapshot();
    const harvest = requireCommand(before, "HARVEST_FRUIT");
    const dispatch = vi.spyOn(app.controller, "dispatch");
    host.callbacks?.onSelection({ kind: "TILE", at: harvest.at });

    commandButton(harvest).click();
    await waitUntil(
      () =>
        app.controller.snapshot().commandIndex === before.commandIndex + 1 &&
        !app.controller.snapshot().transitioning,
    );

    const after = app.controller.snapshot();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(harvest);
    expect(after.stateHash).not.toBe(before.stateHash);
    expect(app.controller.exportReplay()?.commands).toHaveLength(
      after.commandIndex,
    );
    expect(app.controller.exportReplay()?.commands.at(-1)).toEqual(harvest);
    expect(host.model?.interaction).toMatchObject({
      targetMode: null,
      economicPreview: null,
    });
    expect(document.querySelector(".v6-command-dialog")).toBeNull();
    app.destroy();
  });

  it("projects exact offered MOVE readiness and disables animation gates for modal, result, error, and reduced motion", () => {
    const initial = publicView("ORIGINAL");
    const unit = initial.units.find(
      (candidate) => candidate.ownerId === initial.viewer.id,
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === initial.viewer.id,
    );
    if (unit === undefined || city === undefined)
      throw new Error("Missing owned unit or city");
    const view: PlayerViewV6 = {
      ...initial,
      units: initial.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: { ...candidate.activation, handled: true },
            }
          : candidate,
      ),
    };
    const move = {
      kind: "MOVE",
      unitId: unit.id,
      path: [{ x: unit.at.x + 1, y: unit.at.y }],
    } as const satisfies CommandV6;
    const fake = new FakeController(view, [
      move,
      { kind: "WAIT", unitId: unit.id },
    ]);
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
      prefersReducedMotion: true,
    });

    expect(host.model).toMatchObject({
      interactive: true,
      motion: "REDUCED",
      interaction: { readyUnitIds: [unit.id] },
    });
    fake.setSnapshot({
      ...fake.snapshot(),
      offeredCommands: [{ kind: "WAIT", unitId: unit.id }],
    });
    expect(host.model?.interaction.readyUnitIds).toEqual([]);

    fake.setSnapshot({
      ...fake.snapshot(),
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: city.id,
            reachedLevel: 2,
            candidates: ["SURVEY", "STOCKPILE"],
          },
        ],
      },
      offeredCommands: [move],
    });
    expect(host.model).toMatchObject({
      interactive: false,
      interaction: { readyUnitIds: [unit.id] },
    });

    fake.setSnapshot({
      ...fake.snapshot(),
      phase: "COMPLETE",
      view,
      offeredCommands: [move],
    });
    expect(host.model?.interactive).toBe(false);
    fake.setSnapshot({ ...fake.snapshot(), phase: "ERROR" });
    expect(host.model?.interactive).toBe(false);
    app.destroy();
    expect(host.destroyCalls).toBe(1);
  });

  it("queues only accepted public ranged events, locks input, and drains by key", async () => {
    const initial = publicView("ORIGINAL");
    const baseAttacker = initial.units.find(
      (unit) => unit.ownerId === initial.viewer.id,
    );
    const enemyPlayer = initial.players.find(
      (player) => player.id !== initial.viewer.id,
    );
    if (baseAttacker === undefined || enemyPlayer === undefined)
      throw new Error("Missing combat fixture");
    const attacker = { ...baseAttacker, role: "MARKSMAN" as const };
    const defender = {
      ...attacker,
      id: unitId(attacker.id + 90_000),
      ownerId: enemyPlayer.id,
      at: { x: attacker.at.x + 2, y: attacker.at.y },
    };
    const view: PlayerViewV6 = { ...initial, units: [attacker, defender] };
    const attack = {
      kind: "ATTACK",
      unitId: attacker.id,
      target: { kind: "UNIT", unitId: defender.id },
    } as const satisfies CommandV6;
    const event = {
      kind: "COMBAT_RESOLVED",
      preview: {
        attackerId: attacker.id,
        target: attack.target,
        attack2: 4,
        chargeApplied: false,
        defenseBonusNumerator: 1,
        defenseBonusDenominator: 1,
        breachApplied: false,
        push: "BLOCKED",
        damageToDefender: 5,
        damageToAttacker: 2,
        defenderDies: false,
        attackerDies: false,
        advances: false,
        noRetaliationReason: null,
      },
    } as const;
    const fake = new FakeController(view, [attack]);
    fake.dispatch.mockImplementationOnce(async (command) => {
      fake.setSnapshot({
        ...fake.snapshot(),
        commandIndex: view.commandIndex + 1,
        view: {
          ...view,
          commandIndex: view.commandIndex + 1,
          units: [
            { ...attacker, hp: attacker.hp - 2 },
            { ...defender, hp: defender.hp - 5 },
          ],
        },
      });
      return {
        accepted: true,
        command,
        events: [event],
        stateHash: "accepted-combat",
        presentationBoundary: fakeBoundary(
          view,
          fake.snapshot().view ?? view,
          command,
          [event],
        ),
      };
    });
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    host.callbacks?.onCommandCandidates(
      [target(attack, defender.at)],
      defender.at,
    );
    await waitUntil(() => host.model?.combatPresentation !== null);
    expect(host.model).toMatchObject({
      interactive: false,
      combatPresentation: {
        key: `${view.commandIndex + 1}:0:${attacker.id}`,
        kind: "RANGED",
        projectile: "ARROW",
        attacker: { id: attacker.id, at: attacker.at },
        target: { id: defender.id, at: defender.at },
        damaged: [{ id: defender.id }, { id: attacker.id }],
      },
    });
    const key = host.model?.combatPresentation?.key;
    if (key === undefined) throw new Error("Missing combat key");
    host.callbacks?.onCombatPresentationComplete?.("stale-key");
    expect(host.model?.combatPresentation?.key).toBe(key);
    host.callbacks?.onCombatPresentationComplete?.(key);
    expect(host.model?.combatPresentation ?? null).toBeNull();
    expect(host.model?.interactive).toBe(true);
    app.destroy();

    const rejectedFake = new FakeController(view, [attack]);
    rejectedFake.dispatch.mockResolvedValueOnce({
      accepted: false,
      reason: "NOT_OFFERED",
    });
    const rejectedHost = new FakeBoardHostV6();
    const rejectedApp = new Ruleset6DomAppView(
      document,
      requireElement("#app"),
      rejectedFake,
      { boardHost: rejectedHost },
    );
    rejectedHost.callbacks?.onCommandCandidates(
      [target(attack, defender.at)],
      defender.at,
    );
    await waitUntil(() => rejectedFake.dispatch.mock.calls.length === 1);
    expect(rejectedHost.model?.combatPresentation ?? null).toBeNull();
    rejectedApp.destroy();
  });

  it("queues rapid AI combat boundaries and Fast Forward drains presentation only", async () => {
    const initial = publicView("ORIGINAL");
    const human = initial.units.find(
      (unit) => unit.ownerId === initial.viewer.id,
    );
    const aiPlayer = initial.players.find(
      (player) => player.id !== initial.viewer.id,
    );
    if (human === undefined || aiPlayer === undefined)
      throw new Error("Missing AI combat fixture");
    const ai = {
      ...human,
      id: unitId(human.id + 80_000),
      ownerId: aiPlayer.id,
      role: "MARKSMAN" as const,
      at: { x: human.at.x + 2, y: human.at.y },
    };
    const view: PlayerViewV6 = { ...initial, units: [human, ai] };
    const end = { kind: "END_TURN" } as const satisfies CommandV6;
    const attack = {
      kind: "ATTACK",
      unitId: ai.id,
      target: { kind: "UNIT", unitId: human.id },
    } as const satisfies CommandV6;
    const combat = {
      kind: "COMBAT_RESOLVED",
      preview: {
        attackerId: ai.id,
        target: attack.target,
        attack2: 4,
        chargeApplied: false,
        defenseBonusNumerator: 1,
        defenseBonusDenominator: 1,
        breachApplied: false,
        push: "BLOCKED",
        damageToDefender: 4,
        damageToAttacker: 1,
        defenderDies: false,
        attackerDies: false,
        advances: false,
        noRetaliationReason: null,
      },
    } as const;
    const fake = new FakeController(view, [end]);
    const aiTurn: PlayerViewV6 = {
      ...view,
      activeSeatIndex: 1,
      commandIndex: 1,
    };
    fake.dispatch.mockImplementationOnce(async (command) => {
      fake.setSnapshot({
        ...fake.snapshot(),
        view: aiTurn,
        commandIndex: 1,
        offeredCommands: [],
      });
      return {
        accepted: true,
        command,
        events: [],
        stateHash: "after-end",
        presentationBoundary: fakeBoundary(
          view,
          fake.snapshot().view ?? view,
          command,
        ),
      };
    });
    fake.progressAiTurns.mockImplementationOnce(async () => {
      const afterFirst = { ...aiTurn, commandIndex: 2 };
      const afterSecond = { ...view, commandIndex: 3 };
      fake.setSnapshot({
        ...fake.snapshot(),
        view: afterSecond,
        commandIndex: 3,
        offeredCommands: [end],
      });
      return {
        ok: true,
        acceptedCommands: 2,
        events: [combat, combat],
        stateHash: "after-ai",
        presentationBoundaries: [
          {
            actorId: aiPlayer.id,
            command: attack,
            events: [combat],
            beforeView: aiTurn,
            afterView: afterFirst,
          },
          {
            actorId: aiPlayer.id,
            command: attack,
            events: [combat],
            beforeView: afterFirst,
            afterView: afterSecond,
          },
        ],
      };
    });
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    requireElement('[data-action="end-turn"]').click();
    await waitUntil(
      () => host.model?.combatPresentation?.actorController === "AI",
    );
    const stateBeforeSkip = fake.snapshot().stateHash;
    expect(host.model?.combatPresentation?.key).toBe(`2:0:${ai.id}`);
    expect(host.model?.combatPresentation).toMatchObject({
      kind: "RANGED",
      projectile: aiPlayer.faction === "CANDY" ? "GUMBALL" : "ARROW",
    });
    const fastForward = requireElement('[data-action="fast-forward-combat"]');
    fastForward.click();
    expect(host.model?.combatPresentation ?? null).toBeNull();
    expect(fake.snapshot().stateHash).toBe(stateBeforeSkip);
    expect(fake.snapshot().commandIndex).toBe(3);
    app.destroy();
  });

  it("opens the dedicated 25-node tree, researches only its exact detail command, and preserves the match session", async () => {
    const storage = new MemoryStorage();
    const host = new FakeBoardHostV6();
    const app = bootstrapRuleset6App(document, {
      storage,
      boardHost: host,
      persistenceNow: () => "2026-09-01T12:00:00.000Z",
    });
    submit("[data-v6-setup]");
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const before = app.controller.snapshot();
    const matchInstanceId = host.updateIds.at(-1);
    const dispatch = vi.spyOn(app.controller, "dispatch");
    expect(document.querySelector('[data-action="open-tech"]')).not.toBeNull();
    expect(document.querySelector('[data-command-kind="RESEARCH"]')).toBeNull();

    const mapTech = requireElement('[data-action="open-tech"]');
    const unmountsBeforeTech = host.unmountCalls;
    mapTech.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector("[data-tech-screen]")).not.toBeNull();
    expect(document.activeElement).toBe(
      document.querySelector('[data-action="close-tech"]'),
    );
    expect(host.destroyCalls).toBe(0);
    expect(host.unmountCalls).toBeGreaterThan(unmountsBeforeTech);
    expect(app.controller.snapshot()).toMatchObject({
      commandIndex: before.commandIndex,
      stateHash: before.stateHash,
    });

    const cards = [
      ...document.querySelectorAll<HTMLButtonElement>("button[data-tech]"),
    ];
    expect(cards.map((card) => card.dataset.tech)).toEqual(TECHNOLOGY_IDS);
    expect(cards).toHaveLength(25);
    expect(document.querySelectorAll("[data-tech-branch]")).toHaveLength(5);
    expect(
      [...document.querySelectorAll("[data-tech-branch]")].map(
        (branch) => branch.querySelectorAll("button[data-tech]").length,
      ),
    ).toEqual([5, 5, 5, 5, 5]);
    for (const card of cards) {
      expect(card.ariaLabel).toMatch(/costs \d+ Coins/);
      expect(
        card.querySelector(".v6-tech-card-name")?.textContent,
      ).toBeTruthy();
      expect(card.querySelector(".v6-tech-card-cost")?.textContent).toContain(
        "Coins",
      );
      expect(
        card.querySelector(".v6-tech-card-state")?.textContent,
      ).toBeTruthy();
      expect(card.querySelector(".v6-tech-card-symbol")).not.toBeNull();
    }
    expect(
      document.querySelector(
        '[data-tech="HUNTING"] [data-symbol-kind="accepted-raster"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(
        '[data-tech="FARMING"] [data-symbol-kind="code-native-fallback"]',
      ),
    ).not.toBeNull();

    click('[data-tech="HUNTING"]');
    const detail = requireElement("[data-tech-detail]");
    expect(document.activeElement).toBe(detail);
    expect(detail.getAttribute("role")).toBe("dialog");
    expect(detail.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelectorAll("[data-tech-detail]")).toHaveLength(1);
    expect(detail.textContent).toContain("PrerequisiteNone — root technology");
    expect(detail.textContent).toContain("Reveals Game on explored tiles.");
    const offered = before.offeredCommands.find(
      (command): command is Extract<CommandV6, { readonly kind: "RESEARCH" }> =>
        command.kind === "RESEARCH" && command.tech === "HUNTING",
    );
    expect(offered).toEqual({ kind: "RESEARCH", tech: "HUNTING" });
    if (offered === undefined) throw new Error("Missing Hunting research");
    const research = document.querySelector<HTMLButtonElement>(
      '[data-action="research-tech"]',
    );
    expect(research?.dataset.command).toBe(canonicalJson(offered));
    expect(
      document.querySelectorAll('[data-command-kind="RESEARCH"]'),
    ).toHaveLength(1);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(
      document.querySelector('[data-action="close-tech-detail"]'),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(research);
    research?.click();
    await waitUntil(
      () =>
        app.controller.snapshot().commandIndex === 1 &&
        !app.controller.snapshot().transitioning,
    );
    expect(dispatch).toHaveBeenCalledWith(offered);
    const expectedCoins = (before.view?.viewer.coins ?? 0) - 5;
    expect(app.controller.snapshot().view?.viewer).toMatchObject({
      coins: expectedCoins,
    });
    expect(app.controller.snapshot().view?.viewer.researchedTechs).toContain(
      "HUNTING",
    );
    expect(document.querySelector("[data-tech-detail]")?.textContent).toContain(
      "Researched",
    );
    expect(document.querySelector('[data-action="research-tech"]')).toBeNull();
    expect(document.activeElement).toBe(
      document.querySelector("[data-tech-detail]"),
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector("[data-tech-detail]")).toBeNull();
    expect(document.activeElement).toBe(
      document.querySelector('[data-tech="HUNTING"]'),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector("[data-tech-screen]")).toBeNull();
    expect(document.activeElement).toBe(
      document.querySelector('[data-action="open-tech"]'),
    );
    expect(document.body.textContent).toContain(`Coins${expectedCoins}`);
    expect(host.updateIds.at(-1)).toBe(matchInstanceId);
    window.dispatchEvent(new Event("pagehide"));
    expectPersistedBoundary(storage, app.controller.snapshot());
    app.destroy();
  });

  it("uses faction-aware Candy unlocks and view-only detail sheets", () => {
    const original = publicView("CANDY");
    const view: PlayerViewV6 = {
      ...original,
      viewer: {
        ...original.viewer,
        coins: 100,
        researchedTechs: ["GATHERING", "SCOUTING", "FORTIFICATION"],
      },
    };
    const commands: readonly CommandV6[] = [
      { kind: "RESEARCH", tech: "RAIDING" },
      { kind: "RESEARCH", tech: "EXPLOSIVES" },
    ];
    const fake = new FakeController(view, commands);
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: new FakeBoardHostV6(),
    });
    click('[data-action="open-tech"]');
    expect(document.querySelectorAll("button[data-tech]")).toHaveLength(25);
    expect(document.body.textContent).toContain(
      "Candy Warrior is the baseline role",
    );

    click('[data-tech="RAIDING"]');
    expect(document.querySelector("[data-tech-detail]")?.textContent).toContain(
      "Unlocks Donut: costs 3 Coins and uses Kamikaze Roll, Candify, and Capture; it does not Attack or Charge.",
    );
    expect(
      document.querySelectorAll('[data-action="research-tech"]'),
    ).toHaveLength(1);
    click('[data-action="close-tech-detail"]');
    click('[data-tech="EXPLOSIVES"]');
    const explosives =
      document.querySelector("[data-tech-detail]")?.textContent;
    expect(explosives).toContain("Unlocks the Candy Crusher role for 5 Coins.");
    expect(explosives).not.toContain("Catapult");
    click('[data-action="close-tech-detail"]');
    click('[data-tech="MILLING"]');
    const milling = document.querySelector("[data-tech-detail]")?.textContent;
    expect(milling).toContain(
      "Windmill formula: +1 live population per Farm in the touching orthogonally connected same-city cluster, capped at +8.",
    );
    expect(document.querySelector('[data-action="research-tech"]')).toBeNull();
    app.destroy();
  });

  it("drains mandatory reward and Candify queues serially while blocking every outside input", async () => {
    const view = publicView("CANDY");
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined || unit === undefined)
      throw new Error("Missing public entities");
    const survey = {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "SURVEY",
    } as const satisfies CommandV6;
    const stockpile = {
      ...survey,
      reward: "STOCKPILE",
    } as const satisfies CommandV6;
    const candify = {
      kind: "CHOOSE_CANDIFY_CITY",
      unitId: unit.id,
      cityId: city.id,
    } as const satisfies CommandV6;
    const end = { kind: "END_TURN" } as const satisfies CommandV6;
    const fake = new FakeController(view, [end]);
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    const staleTech = requireElement('[data-action="open-tech"]');
    staleTech.focus();

    const queuedCandify = {
      kind: "CANDIFY_CITY",
      unitId: unit.id,
      candidateCityIds: [city.id],
    } as const;
    fake.setSnapshot({
      ...fake.snapshot(),
      view: {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: city.id,
            reachedLevel: 2,
            candidates: ["SURVEY", "STOCKPILE"],
          },
          queuedCandify,
        ],
      },
      offeredCommands: [stockpile, end, candify, survey],
    });
    const dialog = requireElement("[data-mandatory-choice]");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.textContent).toContain("Choose a city reward");
    expect(document.body.textContent).toContain("Choice 1 of 2");
    expect(renderedCommandKinds()).toEqual(new Set(["CHOOSE_CITY_REWARD"]));
    const rewardButtons = [
      ...document.querySelectorAll<HTMLButtonElement>(
        "[data-mandatory-choice-action]",
      ),
    ];
    expect(rewardButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("Survey"),
      expect.stringContaining("Stockpile"),
    ]);
    expect(
      rewardButtons[0]?.querySelector("[data-symbol-kind=accepted-raster]"),
    ).not.toBeNull();
    expect(
      rewardButtons[1]?.querySelector(
        "[data-symbol-kind=code-native-fallback]",
      ),
    ).not.toBeNull();
    expect(document.activeElement).toBe(rewardButtons[0]);
    expect(host.model?.interactive).toBe(false);
    expect(document.querySelector(".v6-action-dock")).toBeNull();

    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "T", bubbles: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "E", bubbles: true }),
    );
    requireElement("[data-mandatory-choice-overlay]").dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    staleTech.click();
    host.callbacks?.onSelection({ kind: "TILE", at: city.at });
    host.callbacks?.onCommandCandidates([target(end, city.at)], city.at);
    expect(escape.defaultPrevented).toBe(true);
    expect(document.querySelector("[data-tech-screen]")).toBeNull();
    expect(fake.dispatch).not.toHaveBeenCalled();
    expect(document.querySelector("[data-mandatory-choice]")).not.toBeNull();

    rewardButtons[1]?.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(rewardButtons[0]);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(rewardButtons[1]);

    fake.dispatch.mockImplementationOnce(async (command) => {
      fake.setSnapshot({
        ...fake.snapshot(),
        view: { ...view, pendingChoices: [queuedCandify] },
        offeredCommands: [candify],
      });
      return {
        accepted: true,
        command,
        events: [],
        stateHash: "after-reward",
        presentationBoundary: fakeBoundary(
          view,
          fake.snapshot().view ?? view,
          command,
        ),
      };
    });
    rewardButtons[0]?.click();
    await waitUntil(
      () =>
        document.querySelector("[data-mandatory-choice=CANDIFY_CITY]") !== null,
    );
    expect(document.body.textContent).toContain("Choose city for Candify");
    expect(document.body.textContent).toContain("Choose a Candify city");
    expect(document.body.textContent).toContain("Choice 1 of 1");
    expect(document.body.textContent).toContain("explored assigned territory");
    const candifyButton = requireElement(
      '[data-command-kind="CHOOSE_CANDIFY_CITY"]',
    );
    expect(document.activeElement).toBe(candifyButton);
    expect(
      candifyButton.querySelector("[data-symbol-kind=accepted-raster]"),
    ).not.toBeNull();

    fake.dispatch.mockImplementationOnce(async (command) => {
      fake.setSnapshot({
        ...fake.snapshot(),
        view: { ...view, pendingChoices: [] },
        offeredCommands: [end],
      });
      return {
        accepted: true,
        command,
        events: [],
        stateHash: "after-candify",
        presentationBoundary: fakeBoundary(
          view,
          fake.snapshot().view ?? view,
          command,
        ),
      };
    });
    candifyButton.click();
    await waitUntil(
      () => document.querySelector("[data-mandatory-choice]") === null,
    );
    expect(fake.dispatch.mock.calls.map(([command]) => command)).toEqual([
      survey,
      candify,
    ]);
    expect(host.model?.interactive).toBe(true);
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "open-tech",
    );
    app.destroy();
  });

  it("shows public unavailable reward reasons without inventing command controls", () => {
    const view = publicView("CANDY");
    const city = view.cities.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (city === undefined) throw new Error("Missing owned city");
    const treasury = {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 5,
      reward: "TREASURY",
    } as const satisfies CommandV6;
    const fake = new FakeController(view, [treasury]);
    const pending = {
      ...view,
      pendingChoices: [
        {
          kind: "CITY_REWARD" as const,
          cityId: city.id,
          reachedLevel: 5,
          candidates: ["JUGGERNAUT" as const, "TREASURY" as const],
        },
      ],
    };
    fake.setSnapshot({ ...fake.snapshot(), view: pending });
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: new FakeBoardHostV6(),
    });

    const unavailable = requireElement(
      '[data-choice-option="reward-juggernaut"]',
    );
    expect(unavailable.getAttribute("aria-disabled")).toBe("true");
    expect(unavailable.textContent).toContain(
      "Unavailable — no traversable city tile is open for the reward unit.",
    );
    expect(unavailable.hasAttribute("data-command")).toBe(false);
    expect(document.querySelectorAll("[data-command-kind]")).toHaveLength(1);
    expect(document.activeElement).toBe(
      document.querySelector('[data-choice-option="reward-treasury"]'),
    );
    app.destroy();
  });

  it("reconstructs the first mandatory popup and its focus from a persisted command boundary", async () => {
    const storage = new MemoryStorage();
    const first = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    setInput("v6-seed", "20");
    submit("[data-v6-setup]");
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    for (let harvest = 0; harvest < 2; harvest += 1) {
      const result = await first.controller.dispatch(
        requireCommand(first.controller.snapshot(), "HARVEST_FRUIT"),
      );
      expect(result.accepted).toBe(true);
    }
    expect(first.controller.snapshot().view?.pendingChoices).toHaveLength(1);
    expect(first.controller.flushPersistence()).toBe(true);
    const storedQueue = first.controller.snapshot().view?.pendingChoices;
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const restored = bootstrapRuleset6App(document, {
      storage,
      boardHost: new FakeBoardHostV6(),
    });
    expect(restored.controller.snapshot().phase).toBe("RESUMABLE");
    expect(restored.controller.snapshot().view?.pendingChoices).toEqual(
      storedQueue,
    );
    click('[data-action="resume"]');
    await waitUntil(
      () => document.querySelector("[data-mandatory-choice]") !== null,
    );
    expect(document.body.textContent).toContain("Choice 1 of 1");
    expect(document.activeElement).toBe(
      document.querySelector("[data-mandatory-choice-action]"),
    );
    restored.destroy();
  });

  it("keeps map interaction observation-safe and makes completion read-only", async () => {
    const fixture = createPlayableGameV6(setup("ORIGINAL", 42));
    if (!fixture.ok) throw new Error(fixture.error.code);
    const view = viewForV6(fixture.state, fixture.state.humanPlayerId);
    const hash = canonicalHash(fixture.state);
    const fake = new FakeController(view, queryPlayerCommandsV6(view));
    const host = new FakeBoardHostV6();
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: host,
    });
    expect(host.model?.view).toBe(view);
    host.callbacks?.onSelection({ kind: "TILE", at: { x: 0, y: 0 } });
    expect(canonicalHash(fixture.state)).toBe(hash);

    fake.setSnapshot({
      ...fake.snapshot(),
      phase: "COMPLETE",
      offeredCommands: [],
      view: {
        ...view,
        outcome: { kind: "VICTORY", winnerId: view.viewer.id },
      },
    });
    expect(host.model?.interactive).toBe(false);
    expect(document.body.textContent).toContain("Final map · read only");
    expect(document.body.textContent).toContain("Victory");
    app.destroy();
  });

  it("does not expose Technology for a completed defeated viewer with no owned city", () => {
    const view = publicView("ORIGINAL");
    const rival = view.players.find((player) => player.id !== view.viewer.id);
    if (rival === undefined) throw new Error("Missing rival player");
    const fake = new FakeController(view, queryPlayerCommandsV6(view));
    const app = new Ruleset6DomAppView(document, requireElement("#app"), fake, {
      boardHost: new FakeBoardHostV6(),
    });
    const staleActiveTech = document.querySelector<HTMLButtonElement>(
      '[data-action="open-tech"]',
    );
    expect(staleActiveTech).not.toBeNull();
    fake.setSnapshot({
      ...fake.snapshot(),
      phase: "COMPLETE",
      offeredCommands: [],
      view: {
        ...view,
        cities: view.cities.filter((city) => city.ownerId !== view.viewer.id),
        outcome: {
          kind: "DEFEAT",
          humanId: view.viewer.id,
          defeatedByPlayerId: rival.id,
        },
      },
    });
    const completedBoundary = fake.snapshot();
    expect(document.body.textContent).toContain("Defeat");
    expect(document.querySelector('[data-action="open-tech"]')).toBeNull();

    staleActiveTech?.click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "t",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.querySelector("[data-tech-screen]")).toBeNull();
    expect(fake.snapshot()).toBe(completedBoundary);
    expect(fake.dispatch).not.toHaveBeenCalled();
    app.destroy();
  });
});

class FakeBoardHostV6 implements BoardHostV6 {
  callbacks: CanvasBoardHostCallbacksV6 | null = null;
  model: CanvasBoardHostModelV6 | null = null;
  destroyCalls = 0;
  readonly updateIds: Array<number | string> = [];
  unmountCalls = 0;

  mount(_container: HTMLElement, callbacks: CanvasBoardHostCallbacksV6): void {
    this.callbacks = callbacks;
  }
  unmount(): void {
    this.unmountCalls += 1;
    this.callbacks = null;
  }
  update(model: CanvasBoardHostModelV6): void {
    this.model = model;
    this.updateIds.push(model.matchInstanceId);
  }
  activate(): void {}
  select(): void {}
  resetActivationCycle(): void {}
  zoom(): void {}
  focus(): void {}
  screenPoint(): null {
    return null;
  }
  destroy(): void {
    this.destroyCalls += 1;
    this.callbacks = null;
    this.model = null;
  }
}

class FakeController implements Ruleset6BrowserControllerPort {
  #snapshot: Ruleset6BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset6BrowserSnapshot) => void
  >();

  constructor(view: PlayerViewV6, commands: readonly CommandV6[]) {
    this.#snapshot = {
      phase: "ACTIVE",
      view,
      offeredCommands: commands,
      commandIndex: view.commandIndex,
      stateHash: "public-test-state",
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
    };
  }
  snapshot(): Ruleset6BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset6BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#subscribers.delete(subscriber);
  }
  setSnapshot(snapshot: Ruleset6BrowserSnapshot): void {
    this.#snapshot = snapshot;
    this.#subscribers.forEach((subscriber) => subscriber(snapshot));
  }
  launch = vi.fn<Ruleset6BrowserController["launch"]>();
  resume = vi.fn<Ruleset6BrowserController["resume"]>();
  dispatch = vi.fn<Ruleset6BrowserController["dispatch"]>(async (command) => {
    const view = this.#snapshot.view;
    if (view === null) return { accepted: false, reason: "NO_ACTIVE_MATCH" };
    return {
      accepted: true,
      command,
      events: [],
      stateHash: "public-test-state",
      presentationBoundary: fakeBoundary(view, view, command),
    };
  });
  progressAiTurns = vi.fn<Ruleset6BrowserController["progressAiTurns"]>();
  restart = vi.fn<Ruleset6BrowserController["restart"]>();
  deleteStoredSave = vi.fn<Ruleset6BrowserController["deleteStoredSave"]>();
  economicPreview = vi.fn<Ruleset6BrowserController["economicPreview"]>(() => ({
    ok: false,
    error: "NOT_OFFERED",
  }));
}

function fakeBoundary(
  beforeView: PlayerViewV6,
  afterView: PlayerViewV6,
  command: CommandV6,
  events: readonly DomainEventV6[] = [],
) {
  return {
    actorId:
      beforeView.turnOrder[beforeView.activeSeatIndex] ?? beforeView.viewer.id,
    command,
    events,
    beforeView,
    afterView,
  };
}

class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();
  writes = 0;
  removals = 0;
  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes += 1;
    this.#values.set(key, value);
  }
  removeItem(key: string): void {
    this.removals += 1;
    this.#values.delete(key);
  }
}

function publicView(faction: "ORIGINAL" | "CANDY"): PlayerViewV6 {
  const created = createPlayableGameV6(setup(faction, 42));
  if (!created.ok) throw new Error(created.error.code);
  return viewForV6(created.state, created.state.humanPlayerId);
}

function setup(faction: "ORIGINAL" | "CANDY", seed: number): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
  };
}

function commandCatalogue(view: PlayerViewV6): readonly CommandV6[] {
  const unit = view.units.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  const city = view.cities.find(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  if (unit === undefined || city === undefined)
    throw new Error("Missing public entities");
  const at = city.at;
  return [
    { kind: "MOVE", unitId: unit.id, path: [at] },
    {
      kind: "ATTACK",
      unitId: unit.id,
      target: { kind: "UNIT", unitId: unit.id },
    },
    { kind: "KAMIKAZE_ROLL", unitId: unit.id, direction: "NORTH" },
    { kind: "HEAL_ADJACENT", unitId: unit.id, targetUnitId: unit.id },
    { kind: "RECOVER", unitId: unit.id },
    { kind: "CAPTURE", unitId: unit.id },
    { kind: "PROMOTE", unitId: unit.id },
    { kind: "WAIT", unitId: unit.id },
    { kind: "BUILD_CHOCOLATE_WALL", unitId: unit.id, at },
    { kind: "CANDIFY", unitId: unit.id },
    { kind: "RESEARCH", tech: "FARMING" },
    ...ECONOMIC_COMMAND_KINDS.map((kind) => ({ kind, at })),
    { kind: "TRAIN", cityId: city.id, role: "FIGHTER" },
    { kind: "CHOOSE_CANDIFY_CITY", unitId: unit.id, cityId: city.id },
    {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "SURVEY",
    },
    { kind: "END_TURN" },
  ];
}

function target(
  command: CommandV6,
  at: { x: number; y: number },
): MapCommandTargetV6 {
  return { family: "SELF_ABILITY", at, id: 1, ownerId: 1, command };
}

function requireCommand<K extends CommandV6["kind"]>(
  snapshot: Ruleset6BrowserSnapshot,
  kind: K,
): CommandV6 & { readonly kind: K } {
  const command = snapshot.offeredCommands.find(
    (candidate): candidate is CommandV6 & { readonly kind: K } =>
      candidate.kind === kind,
  );
  if (command === undefined) throw new Error(`Missing ${kind}`);
  return command;
}

function commandButton(command: CommandV6): HTMLButtonElement {
  const encoded = canonicalJson(command);
  const nodes = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-command]"),
  ];
  const button = nodes.find((node) => node.dataset.command === encoded);
  if (button === undefined)
    throw new Error(`Missing command button ${encoded}`);
  return button;
}

function renderedCommandKinds(): Set<string | undefined> {
  return new Set(
    [...document.querySelectorAll<HTMLElement>("[data-command-kind]")].map(
      (node) => node.dataset.commandKind,
    ),
  );
}

function requireElement(selector: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function changeSelect(id: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing ${id}`);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setInput(id: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`Missing ${id}`);
  input.value = value;
}

function configureAiFirstCandyLaunch(): void {
  changeSelect("v6-ai-count", "1");
  changeSelect("v6-ai-mode", "RIVAL");
  changeSelect("v6-board-size", "11");
  changeSelect("v6-faction-0", "CANDY");
  changeSelect("v6-faction-1", "CANDY");
  setInput("v6-seed", "314159");
}

function selectValues(id: string): readonly string[] {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`Missing ${id}`);
  return [...select.options].map((option) => option.value);
}

function submit(selector: string): void {
  const form = document.querySelector<HTMLFormElement>(selector);
  if (form === null) throw new Error(`Missing ${selector}`);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function click(selector: string): void {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  node.click();
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for DOM shell transition");
}

async function waitForHumanTurn(
  controller: Ruleset6BrowserController,
  minimumCommandIndex: number,
): Promise<void> {
  await waitUntil(() => {
    const snapshot = controller.snapshot();
    const view = snapshot.view;
    return (
      snapshot.phase === "ACTIVE" &&
      !snapshot.transitioning &&
      snapshot.commandIndex >= minimumCommandIndex &&
      view !== null &&
      view.turnOrder[view.activeSeatIndex] === view.viewer.id
    );
  });
}

function expectPersistedBoundary(
  storage: MemoryStorage,
  snapshot: Ruleset6BrowserSnapshot,
): void {
  const source = storage.getItem(SAVE_STORAGE_KEY);
  if (source === null) throw new Error("Missing persisted AI-first boundary");
  const loaded = parseSaveV6(source);
  expect(loaded.kind).toBe("VALID");
  if (loaded.kind !== "VALID") throw new Error(loaded.diagnostic);
  expect(loaded.save).toMatchObject({
    commandIndex: snapshot.commandIndex,
    stateHash: snapshot.stateHash,
  });
  expect(canonicalHash(loaded.save.state)).toBe(snapshot.stateHash);
  expect(loaded.save.acceptedCommands).toHaveLength(snapshot.commandIndex);
}
