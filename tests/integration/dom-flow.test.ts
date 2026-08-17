// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapApp, type BootstrappedApp } from "../../src/app/bootstrap";
import {
  DEMO_MATCH_SETUP,
  RULESET_ID,
  canonicalHash,
  createGame,
  demoScenarioIssues,
  queryPlayerCommands,
  seedFromText,
  type Command,
  type GameState,
  type MatchSetup,
} from "../../src/engine/index";
import { SAVE_STORAGE_KEY, parseSave } from "../../src/persistence/index";
import type {
  BoardHost,
  BoardHostCallbacks,
  BoardHostModel,
  BoardSelection,
  InspectionActivationCycle,
} from "../../src/render/canvas/board-host";
import {
  resolveInspectionActivation,
  spatialCommandAt,
} from "../../src/render/canvas/board-host";
import type { Point } from "../../src/render/canvas/geometry";
import { captureReadyStateBuilder } from "../fixtures/builders";

let app: BootstrappedApp | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.restoreAllMocks();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("semantic POC screen flow", () => {
  it("keeps Canvas/backing/camera geometry identical across tile, unit, and city docks", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement): DOMRect {
        const board =
          this.classList.contains("board-host") ||
          this.classList.contains("board-canvas");
        const width = board ? 390 : 0;
        const height = board ? 844 : 0;
        return {
          x: 0,
          y: 0,
          top: 0,
          right: width,
          bottom: height,
          left: 0,
          width,
          height,
          toJSON: () => ({}),
        };
      },
    );
    const state = created(setup({ seed: 73 }));
    const human = state.players.find((player) => player.controller === "HUMAN");
    const city = state.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const unit = state.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (city === undefined || unit === undefined)
      throw new Error("Missing selection fixtures");
    app = bootMatch(undefined, state);
    click("Zoom in");

    const geometry = (): {
      readonly css: readonly [number, number];
      readonly backing: readonly [number, number];
      readonly cameraPoint: Point | null;
    } => {
      const canvas = document.querySelector<HTMLCanvasElement>(".board-canvas");
      if (canvas === null) throw new Error("Missing Canvas");
      const bounds = canvas.getBoundingClientRect();
      return {
        css: [bounds.width, bounds.height],
        backing: [canvas.width, canvas.height],
        cameraPoint: app?.view.boardScreenPoint(city.at) ?? null,
      };
    };

    chooseInspector(`unit:${unit.id}`);
    expect(document.querySelector(".unit-action-dock")).not.toBeNull();
    const unitGeometry = geometry();
    chooseInspector(`city:${city.id}`);
    expect(document.querySelector(".city-action-dock")).not.toBeNull();
    const cityGeometry = geometry();
    const tileOption = document.querySelector<HTMLOptionElement>(
      "select[aria-label='Choose a map coordinate or object'] option[value^='tile:']",
    );
    if (tileOption === null) throw new Error("Missing tile inspection option");
    chooseInspector(tileOption.value);
    expect(document.querySelector(".tile-action-dock")).not.toBeNull();
    const tileGeometry = geometry();

    expect(unitGeometry).toEqual({
      css: [390, 844],
      backing: [780, 1688],
      cameraPoint: unitGeometry.cameraPoint,
    });
    expect(cityGeometry).toEqual(unitGeometry);
    expect(tileGeometry).toEqual(unitGeometry);
    expect(document.querySelector(".board-stage")?.parentElement).toBe(
      document.querySelector(".match-shell"),
    );
    expect(document.querySelector(".match-actions")?.parentElement).toBe(
      document.querySelector(".match-shell"),
    );
    expect(
      document.querySelector(
        ".readiness-halo, .readiness-badge, .wait-badge, [data-readiness-marker]",
      ),
    ).toBeNull();
  });

  // The largest 25x25 semantic map needs bounded headroom on contended runners.
  it("launches the visible Demo Match, exposes both docks through click cycling, and autosaves exactly", () => {
    const boardHost = new RecordingBoardHost();
    app = bootstrapApp(document, {
      initialRoute: "HUB",
      boardHost,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
      persistenceNow: () => "2026-08-15T14:00:00.000Z",
    });
    expect(document.querySelector(".demo-match-card")?.textContent).toContain(
      "Huge 25 × 25",
    );
    expect(document.querySelector(".demo-match-card")?.textContent).toContain(
      "eight ready units",
    );
    click("Demo Match");
    expect(dialog()?.textContent).toContain("Start Demo Match?");
    expect(dialog()?.textContent).toContain("seed decafbad");
    click("Start Demo Match");

    const snapshot = app.controller.snapshot();
    if (snapshot.match === null) throw new Error("Missing demo match");
    expect(snapshot.match.setup).toEqual(DEMO_MATCH_SETUP);
    expect(snapshot.route).toBe("MATCH");
    expect(demoScenarioIssues(snapshot.match)).toEqual([]);
    expect(canonicalHash(snapshot.match)).toBe(
      "33e7131617587013ffbe21384391f77c615970821c86178dcc905e4cdd8d734d",
    );
    expect(boardHost.latest()?.interactive).toBe(true);
    const human = snapshot.match.players.find(
      (player) => player.id === snapshot.match?.humanPlayerId,
    );
    const city = snapshot.match.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const warrior = snapshot.match.units.find(
      (unit) =>
        unit.ownerId === human?.id &&
        unit.type === "WARRIOR" &&
        unit.at.x === city?.at.x &&
        unit.at.y === city.at.y,
    );
    const archer = snapshot.match.units.find(
      (unit) => unit.ownerId === human?.id && unit.type === "ARCHER",
    );
    if (city === undefined || warrior === undefined || archer === undefined)
      throw new Error("Missing derived Demo dock fixtures");

    chooseCoordinate(warrior.at.x, warrior.at.y);
    const unitDock = document.querySelector<HTMLElement>(".unit-action-dock");
    expect(unitDock?.textContent).toContain("Warrior");
    expect(unitDock?.textContent).toContain(
      "Choose a highlighted tile to move",
    );
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    chooseCoordinate(warrior.at.x, warrior.at.y);
    const cityDock = document.querySelector<HTMLElement>(".city-action-dock");
    expect(cityDock?.textContent).toContain("City 1");
    expect(cityDock?.textContent).toContain("3/3");
    expect(cityDock?.textContent).toContain("Founders1");
    expect(cityDock?.textContent).toContain("Workshop · City Wall");
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    chooseCoordinate(archer.at.x, archer.at.y);
    expect(document.querySelector(".unit-action-dock")?.textContent).toContain(
      "Archer",
    );

    const saved = parseSave(localStorage.getItem(SAVE_STORAGE_KEY) ?? "");
    expect(saved.kind).toBe("VALID");
    if (saved.kind !== "VALID") throw new Error("Demo autosave did not load");
    expect(saved.save.stateHash).toBe(canonicalHash(snapshot.match));
  }, 15_000);

  it("does not replace an existing match until Demo Match confirmation", () => {
    const standard = created(setup({ seed: 19 }));
    app = bootMatch(undefined, standard);
    app.controller.exitToHub();
    click("Demo Match");
    expect(dialog()?.textContent).toContain("Replace current match?");
    expect(dialog()?.textContent).toContain(
      "This replaces the current saved match",
    );
    expect(app.controller.snapshot().match).toBe(standard);
    click("Cancel");
    expect(app.controller.snapshot().match).toBe(standard);
    click("Demo Match");
    click("Replace Save & Start Demo");
    expect(app.controller.snapshot().match?.setup.scenario).toBe("DEMO");
  });

  it("reveals an already-complete cached faction hero and preserves the error fallback", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
      true,
    );
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
      1024,
    );
    app = bootstrapApp(document, {
      initialRoute: "FACTION",
      prefersReducedMotion: true,
    });
    expect(
      document.querySelector<HTMLElement>(".faction-preview .faction-original")
        ?.dataset.loaded,
    ).toBe("true");

    app.destroy();
    app = null;
    vi.restoreAllMocks();
    app = bootstrapApp(document, {
      initialRoute: "FACTION",
      prefersReducedMotion: true,
    });
    const hero = document.querySelector<HTMLElement>(
      ".faction-preview .faction-original",
    );
    const image = hero?.querySelector<HTMLImageElement>(".faction-hero-art");
    image?.dispatchEvent(new Event("error"));
    expect(image?.hidden).toBe(true);
    expect(hero?.dataset.loaded).toBeUndefined();
    expect(hero?.querySelector(".faction-portrait-fallback")).not.toBeNull();
  });

  it.each([
    [1, 11],
    [2, 14],
    [3, 16],
  ] as const)(
    "resolves %i AI to its documented Auto board",
    (aiCount, expectedSize) => {
      app = bootstrapApp(document, {
        initialRoute: "SETUP",
        randomSeed: () => 1,
        aiStepDelayMs: 100_000,
        prefersReducedMotion: true,
      });
      radio("ai-count", String(aiCount)).click();
      click("Continue");
      click("Start Conquest");
      click("Confirm Start");
      expect(app.controller.snapshot().match?.setup).toMatchObject({
        aiCount,
        width: expectedSize,
        height: expectedSize,
        seed: 1,
      });
    },
  );

  it.each([1, 2, 3] as const)(
    "offers explicit Huge for %i AI without changing Auto",
    (aiCount) => {
      app = bootstrapApp(document, {
        initialRoute: "SETUP",
        randomSeed: () => 25,
        aiStepDelayMs: 100_000,
        prefersReducedMotion: true,
      });
      radio("ai-count", String(aiCount)).click();
      const autoSize = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
      expect(document.body.textContent).toContain(
        `Auto · ${autoSize} × ${autoSize}`,
      );
      expect(radio("board-size", "25").disabled).toBe(false);
      radio("board-size", "25").click();
      expect(document.body.textContent).toContain("Resolved board: 25 × 25");
      click("Continue");
      click("Start Conquest");
      expect(dialog()?.textContent).toContain(`${aiCount} AI · 25 × 25`);
      click("Confirm Start");
      expect(app.controller.snapshot().match?.setup).toMatchObject({
        aiCount,
        width: 25,
        height: 25,
      });
    },
  );

  it("preserves visible faction choices and defaults newly added AI seats", () => {
    app = bootstrapApp(document, {
      initialRoute: "SETUP",
      randomSeed: () => 5,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    radio("ai-count", "3").click();
    click("Continue");
    expect(document.querySelectorAll(".faction-seat-row")).toHaveLength(4);
    radio("faction-seat-0", "CANDY").click();
    radio("faction-seat-2", "CANDY").click();
    radio("faction-seat-3", "CANDY").click();
    click("Back");
    radio("ai-count", "1").click();
    click("Continue");
    expect(document.querySelectorAll(".faction-seat-row")).toHaveLength(2);
    expect(radio("faction-seat-0", "CANDY").checked).toBe(true);
    expect(radio("faction-seat-1", "ORIGINAL").checked).toBe(true);
    click("Back");
    radio("ai-count", "3").click();
    click("Continue");
    expect(radio("faction-seat-0", "CANDY").checked).toBe(true);
    expect(radio("faction-seat-1", "ORIGINAL").checked).toBe(true);
    expect(radio("faction-seat-2", "ORIGINAL").checked).toBe(true);
    expect(radio("faction-seat-3", "ORIGINAL").checked).toBe(true);
    expect(radio("faction-seat-3", "CANDY").getAttribute("aria-label")).toBe(
      "AI 3: Candy",
    );
  });

  it("starts and autosaves explicit cooperative Large, then preserves it on restart", () => {
    app = bootstrapApp(document, {
      initialRoute: "SETUP",
      randomSeed: () => 20,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    radio("ai-count", "2").click();
    radio("ai-relations", "COOPERATIVE").click();
    radio("board-size", "20").click();
    expect(document.body.textContent).toContain("Large · 20 × 20");
    expect(document.body.textContent).toContain("Resolved board: 20 × 20");
    click("Continue");
    click("Start Conquest");
    expect(dialog()?.textContent).toContain("Cooperate against you");
    click("Confirm Start");
    const initial = app.controller.snapshot().match;
    expect(initial?.setup).toMatchObject({
      aiCount: 2,
      aiMode: "COOPERATIVE",
      width: 20,
      height: 20,
      seed: 20,
    });
    const initialHash = initial === null ? null : canonicalHash(initial);
    click("Settings");
    click("Restart Same Match");
    click("Restart Match");
    expect(canonicalHash(app.controller.snapshot().match)).toBe(initialHash);
    const saved = parseSave(localStorage.getItem(SAVE_STORAGE_KEY) ?? "");
    expect(saved).toMatchObject({
      kind: "VALID",
      save: { setup: { aiMode: "COOPERATIVE", width: 20, height: 20 } },
    });
  });

  it("moves through every front-of-game beat and starts an exact deterministic setup", () => {
    app = boot({ randomSeed: () => 1 });
    expect(heading()).toBe("Pulp Wars");
    vi.advanceTimersByTime(0);
    expect(button("New Conquest").disabled).toBe(false);
    click("New Conquest");
    expect(heading()).toBe("Single Player");
    expect(document.body.textContent).toContain("Perfection");
    expect(document.body.textContent).toContain("not included");
    click("Choose Conquest");
    expect(heading()).toBe("Conquest Setup");

    radio("ai-count", "3").click();
    expect(radio("board-size", "11").disabled).toBe(true);
    expect(radio("board-size", "14").disabled).toBe(true);
    expect(document.body.textContent).toContain("Resolved board: 16 × 16");
    const seed = input("seed-input");
    seed.value = "  Pulp 🚀  ";
    seed.dispatchEvent(new Event("input", { bubbles: true }));
    radio("human-color", "TEAL").click();
    click("Continue");
    expect(heading()).toBe("Choose Factions");
    expect(document.body.textContent).toContain("You");
    expect(document.body.textContent).toContain("AI 3");
    expect(document.body.textContent).toContain("Original");
    expect(document.body.textContent).toContain("Candy");
    expect(
      document.querySelector<HTMLImageElement>(".faction-hero-art")?.src,
    ).toContain("/assets/pixellab/ui/faction-hero.png");

    radio("faction-seat-0", "CANDY").click();
    radio("faction-seat-2", "CANDY").click();
    const candyPreview = document.querySelector<HTMLImageElement>(
      ".faction-preview .faction-candy.faction-preview-portrait .faction-hero-art",
    );
    expect(candyPreview?.src).toContain(
      "/assets/pixellab/ui/faction-candy-hero.png",
    );
    expect(candyPreview?.closest(".faction-seat-portrait")).toBeNull();
    expect(
      document.querySelector<HTMLImageElement>(
        ".faction-seat-portrait.faction-candy .faction-hero-art",
      )?.src,
    ).toContain("/assets/pixellab/ui/faction-candy-badge.png");

    click("Start Conquest");
    expect(dialog()?.textContent).toContain("3 AI · 16 × 16 · Normal parity");
    expect(dialog()?.textContent).toContain("You: Candy");
    expect(dialog()?.textContent).toContain("AI 2: Candy");
    expect(dialog()?.textContent).toContain(
      seedHex(seedFromText("  Pulp 🚀  ")),
    );
    click("Confirm Start");
    const snapshot = app.controller.snapshot();
    expect(snapshot.route).toBe("MATCH");
    expect(snapshot.match?.setup).toMatchObject({
      aiCount: 3,
      width: 16,
      height: 16,
      humanColor: "TEAL",
      factions: ["CANDY", "ORIGINAL", "CANDY", "ORIGINAL"],
      seed: seedFromText("  Pulp 🚀  "),
    });
    expect(document.querySelector("canvas[role=application]")).not.toBeNull();
    expect(document.querySelector("[data-hud=stars]")?.textContent).toMatch(
      /★ \d+ \(\+\d+\)/,
    );
  });

  it("randomizes an empty seed once and preserves it through cancel and confirmation", () => {
    app = boot({ randomSeed: () => 0xdead_beef });
    vi.advanceTimersByTime(0);
    click("New Conquest");
    click("Choose Conquest");
    click("Continue");
    click("Start Conquest");
    expect(dialog()?.textContent).toContain("deadbeef");
    click("Cancel");
    expect(input("seed-input", false)).toBeNull();
    click("Start Conquest");
    expect(dialog()?.textContent).toContain("deadbeef");
    click("Confirm Start");
    expect(app.controller.snapshot().match?.setup.seed).toBe(0xdead_beef);
  });

  it("opens view-only overlays during an AI turn and fast-forwards back to the human", () => {
    app = bootMatch(setup({ seed: 0 }));
    const snapshot = app.controller.snapshot();
    expect(snapshot.view?.turnOrder[snapshot.view.activeSeatIndex]).not.toBe(
      snapshot.view?.viewer.id,
    );
    expect(document.body.textContent).toContain("is thinking");
    expect(button("End Turn", false)).toBeNull();
    click("Tech");
    expect(dialog()?.textContent).toContain("View only during AI presentation");
    techNode("climbing").click();
    expect(dialog()?.textContent).toContain("View only");
    expect(button("Research Climbing · 5 stars", false)).toBeNull();
    click("Close");
    click("Stats");
    expect(dialog()?.textContent).toContain("Capture all rival cities");
    expect(dialog()?.textContent).toContain(
      "Kills are combat defeats; losses include units removed during elimination cleanup.",
    );
    click("Close");
    click("Fast Forward");
    expect(
      app.controller.snapshot().view?.turnOrder[
        app.controller.snapshot().view?.activeSeatIndex ?? 0
      ],
    ).toBe(app.controller.snapshot().view?.viewer.id);
    expect(document.body.textContent).toContain("Your Turn");
  });
});

describe("HUD, command wiring, and contextual panels", () => {
  it("gives semantic coordinate activation the same unit-first city cycle", () => {
    const boardHost = new RecordingBoardHost();
    const state = created(setup({ seed: 3 }));
    app = bootMatchWithBoard(state, boardHost);
    const view = app.controller.snapshot().view;
    const unit = view?.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    const city = view?.cities.find(
      (candidate) => unit !== undefined && sameTestCoord(candidate.at, unit.at),
    );
    if (unit === undefined || city === undefined)
      throw new Error("Missing colocated semantic fixtures");

    chooseCoordinate(unit.at.x, unit.at.y);
    expect(boardHost.latest()?.selected).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
    chooseCoordinate(unit.at.x, unit.at.y);
    expect(boardHost.latest()?.selected).toEqual({
      kind: "CITY",
      cityId: city.id,
    });
    expect(document.querySelector(".unit-action-dock")).toBeNull();
    expect(document.querySelector(".city-action-dock")).not.toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
    chooseCoordinate(unit.at.x, unit.at.y);
    expect(boardHost.latest()?.selected).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
  });

  it("executes a semantic Move on one activation with its canonical path named", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const state = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(state, boardHost);
    const view = app.controller.snapshot().view;
    const unit = view?.units.find(
      (candidate) => candidate.ownerId === human.id,
    );
    const move =
      view === null
        ? undefined
        : queryPlayerCommands(view)
            .map(({ command }) => command)
            .find(
              (
                command,
              ): command is Extract<Command, { readonly kind: "MOVE" }> =>
                command.kind === "MOVE" && command.unitId === unit?.id,
            );
    const destination = move?.path.at(-1);
    if (unit === undefined || move === undefined || destination === undefined)
      throw new Error("Missing semantic movement fixture");
    boardHost.select({ kind: "UNIT", unitId: unit.id });
    const option = document.querySelector<HTMLOptionElement>(
      `option[value="coordinate:${destination.x}:${destination.y}"]`,
    );
    expect(option?.textContent).toContain("Move once by");
    const inspector = document.querySelector<HTMLSelectElement>(
      "select[aria-label='Choose a map coordinate or object']",
    );
    inspector?.focus();
    const before = app.controller.snapshot().match?.commandIndex;
    chooseCoordinate(destination.x, destination.y);
    const after = app.controller.snapshot();
    expect(after.match?.commandIndex).toBe((before ?? 0) + 1);
    expect(
      after.match?.units.find((candidate) => candidate.id === unit.id)?.at,
    ).toEqual(destination);
    expect(after.overlay).toEqual({ name: "NONE" });
    expect(document.activeElement).toBe(
      document.querySelector(
        "select[aria-label='Choose a map coordinate or object']",
      ),
    );
  });

  it("names and executes an exact semantic Attack without a confirmation modal", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const attacker = base.units.find((unit) => unit.ownerId === human?.id);
    const defender = base.units.find((unit) => unit.ownerId !== human?.id);
    if (human === undefined || attacker === undefined || defender === undefined)
      throw new Error("Missing combat fixture");
    const target = base.board.tiles.find(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - attacker.at.x),
          Math.abs(tile.at.y - attacker.at.y),
        ) === 1 &&
        human.explored.some((at) => sameTestCoord(at, tile.at)) &&
        !base.cities.some((city) => sameTestCoord(city.at, tile.at)),
    );
    if (target === undefined) throw new Error("Missing attack target");
    const state: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          sameTestCoord(tile.at, target.at)
            ? {
                ...tile,
                terrain: "GRASS",
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      units: base.units.map((unit) =>
        unit.id === defender.id ? { ...unit, at: target.at } : unit,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(state, boardHost);
    boardHost.select({ kind: "UNIT", unitId: attacker.id });
    const option = document.querySelector<HTMLOptionElement>(
      `option[value="coordinate:${target.at.x}:${target.at.y}"]`,
    );
    expect(option?.textContent).toContain("Attack once");
    expect(option?.textContent).toContain("defender damage");
    expect(option?.textContent).toMatch(/defender (survives|defeated)/);
    expect(option?.textContent).toContain("retaliation damage");
    expect(option?.textContent).toMatch(/attacker (survives|defeated)/);
    expect(option?.textContent).toMatch(/attacker (advances|does not advance)/);
    const before = app.controller.snapshot().match?.commandIndex;
    chooseCoordinate(target.at.x, target.at.y);
    const after = app.controller.snapshot();
    expect(after.match?.commandIndex).toBe((before ?? 0) + 1);
    expect(after.overlay).toEqual({ name: "NONE" });
    expect(dialog()).toBeNull();
    expect(after.combatPresentation).not.toBeNull();
  });

  it("shows and dispatches only the exact selected unit's concise capture", () => {
    const initial = captureReadyStateBuilder(1, created(setup({ seed: 3 })));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const captureUnit = initial.units.find(
      (unit) => unit.ownerId === human?.id && unit.captureEligible,
    );
    if (human === undefined || captureUnit === undefined)
      throw new Error("Missing capture fixture");
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("Missing capture view");
    const offered = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command) =>
          command.kind === "CAPTURE" && command.unitId === captureUnit.id,
      );
    if (offered?.kind !== "CAPTURE")
      throw new Error("Missing offered capture command");
    const request = vi.spyOn(app.controller, "requestCommand");

    expect(dialog()).toBeNull();
    expect(document.querySelector(".capture-action")).toBeNull();
    expect(document.querySelector(".unit-action-dock")).toBeNull();
    boardHost.select({ kind: "UNIT", unitId: captureUnit.id });
    const capture = document.querySelector<HTMLButtonElement>(
      ".unit-action-dock .capture-action",
    );
    expect(capture?.textContent).toBe("Capture Village");
    expect(capture?.textContent).not.toMatch(/\d+,\s*\d+|\bwith\b/);
    expect(capture?.disabled).toBe(false);
    capture?.focus();
    expect(document.activeElement).toBe(capture);
    const before = app.controller.snapshot().match?.commandIndex ?? 0;
    capture?.click();

    const after = app.controller.snapshot();
    expect(request).toHaveBeenCalledWith(offered);
    expect(after.match?.commandIndex).toBe(before + 1);
    expect(
      after.match?.cities.find(
        (city) =>
          city.at.x === captureUnit.at.x && city.at.y === captureUnit.at.y,
      ),
    ).toMatchObject({ ownerId: human.id, level: 1 });
    expect(document.querySelector(".capture-action")).toBeNull();
    expect(after.assertiveAnnouncement).toContain("captured");
  });

  it("keeps simultaneous captures unambiguous through selection with no global leakage", () => {
    const initial = captureReadyStateBuilder(2, created(setup({ seed: 3 })));
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("Missing simultaneous capture view");
    const offered = queryPlayerCommands(view)
      .map(({ command }) => command)
      .filter(
        (command): command is Extract<Command, { readonly kind: "CAPTURE" }> =>
          command.kind === "CAPTURE",
      );
    expect(offered).toHaveLength(2);
    expect(document.querySelector(".capture-action")).toBeNull();

    const first = offered[0];
    const second = offered[1];
    if (first === undefined || second === undefined)
      throw new Error("Missing simultaneous captures");
    boardHost.select({ kind: "UNIT", unitId: first.unitId });
    expect(document.querySelectorAll(".capture-action")).toHaveLength(1);
    expect(
      document.querySelector(".unit-action-dock")?.getAttribute("aria-label"),
    ).toMatch(/^Selected /);

    boardHost.select({ kind: "UNIT", unitId: second.unitId });
    expect(document.querySelectorAll(".capture-action")).toHaveLength(1);
    expect(document.querySelectorAll(".capture-action")).toHaveLength(1);
    const secondUnit = initial.units.find((unit) => unit.id === second.unitId);
    click("Capture Village");
    expect(
      app.controller
        .snapshot()
        .match?.cities.find(
          (city) =>
            city.at.x === secondUnit?.at.x && city.at.y === secondUnit?.at.y,
        )?.ownerId,
    ).toBe(app.controller.snapshot().view?.viewer.id);

    boardHost.select(null);
    expect(document.querySelector(".unit-action-dock")).toBeNull();
    expect(document.querySelector(".capture-action")).toBeNull();
  });

  it("labels a selected enemy-city capture without IDs or coordinates", () => {
    const villageState = captureReadyStateBuilder(
      1,
      created(setup({ seed: 3 })),
    );
    const human = villageState.players.find(
      (player) => player.controller === "HUMAN",
    );
    const captureUnit = villageState.units.find(
      (unit) => unit.ownerId === human?.id && unit.captureEligible,
    );
    const enemyCity = villageState.cities.find(
      (city) => city.ownerId !== human?.id,
    );
    if (captureUnit === undefined || enemyCity === undefined)
      throw new Error("Missing city-capture fixture");
    const initial: GameState = {
      ...villageState,
      cities: villageState.cities.map((city) =>
        city.id === enemyCity.id ? { ...city, at: captureUnit.at } : city,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    boardHost.select({ kind: "UNIT", unitId: captureUnit.id });

    expect(button("Capture City").disabled).toBe(false);
    expect(
      document.querySelector(".unit-action-dock")?.textContent,
    ).not.toContain(`City ${enemyCity.id}`);
    expect(document.querySelectorAll(".capture-action")).toHaveLength(1);
  });

  it("updates immediate and map-target guidance for eligible, ineligible, and cleared units", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const humanUnit = base.units.find((unit) => unit.ownerId === human?.id);
    const otherUnit = base.units.find((unit) => unit.id !== humanUnit?.id);
    if (
      human === undefined ||
      humanUnit === undefined ||
      otherUnit === undefined
    )
      throw new Error("Missing selected-action fixtures");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: base.units.map((unit) =>
        unit.id === humanUnit.id
          ? { ...unit, hp: unit.maxHp - 2, kills: 3 }
          : unit.id === otherUnit.id
            ? {
                ...unit,
                ownerId: human.id,
                ready: false,
                activation: { ...unit.activation, handled: true },
              }
            : unit,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);

    boardHost.select({ kind: "UNIT", unitId: humanUnit.id });
    expect(button("Recover").disabled).toBe(false);
    expect(button("Promote").disabled).toBe(false);
    expect(document.querySelector(".unit-dock-hint")?.textContent).toContain(
      "highlighted tile to move",
    );
    expect(
      [...document.querySelectorAll("button")].some((candidate) =>
        candidate.textContent?.startsWith("Move to "),
      ),
    ).toBe(false);

    boardHost.select({ kind: "UNIT", unitId: otherUnit.id });
    expect(document.querySelector(".capture-action")).toBeNull();
    expect(document.querySelector(".unit-dock-hint")?.textContent).toBe(
      "No actions available.",
    );
    boardHost.select({ kind: "TILE", at: humanUnit.at });
    expect(document.querySelector(".unit-action-dock")).toBeNull();
  });

  it("dispatches the exact selected unit's Recover and Promote commands and restores map focus", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const humanUnit = base.units.find((unit) => unit.ownerId === human?.id);
    if (human === undefined || humanUnit === undefined)
      throw new Error("Missing direct unit action fixtures");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
      units: base.units.map((unit) =>
        unit.id === humanUnit.id
          ? { ...unit, hp: unit.maxHp - 2, kills: 3 }
          : unit,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("Missing direct unit action view");
    const offered = queryPlayerCommands(view).map(({ command }) => command);
    const recover = offered.find(
      (command) =>
        command.kind === "RECOVER" && command.unitId === humanUnit.id,
    );
    const promote = offered.find(
      (command) =>
        command.kind === "PROMOTE" && command.unitId === humanUnit.id,
    );
    if (recover === undefined || promote === undefined)
      throw new Error("Missing direct Recover/Promote commands");
    const request = vi.spyOn(app.controller, "requestCommand");

    boardHost.select({ kind: "UNIT", unitId: humanUnit.id });
    button("Recover").click();
    expect(request).toHaveBeenLastCalledWith(recover);
    expect(document.querySelector(".unit-dock-state")?.textContent).toContain(
      "Recovered",
    );
    button("Promote").click();
    expect(request).toHaveBeenLastCalledWith(promote);
    expect(document.querySelector(".unit-dock-state")?.textContent).toContain(
      "Veteran",
    );
    expect(boardHost.latest()?.selected).toEqual({
      kind: "UNIT",
      unitId: humanUnit.id,
    });
    expect(app.controller.snapshot().match?.commandIndex).toBe(
      initial.commandIndex + 2,
    );
  });

  it("offers exact Wait, marks only attention handled, and leaves map actions available", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const unit = initial.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (human === undefined || unit === undefined)
      throw new Error("Missing Wait dock fixture");
    const state = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(state, boardHost);
    boardHost.select({ kind: "UNIT", unitId: unit.id });

    const wait = button("Wait");
    expect(wait.disabled).toBe(false);
    expect(document.querySelector(".unit-dock-state")?.textContent).toContain(
      "Needs action",
    );
    wait.click();

    expect(document.querySelector(".unit-dock-state")?.textContent).toContain(
      "Handled",
    );
    expect(button("Wait", false)).toBeNull();
    expect(document.querySelector(".unit-dock-hint")?.textContent).toContain(
      "highlighted tile to move",
    );
    expect(app.controller.endTurnWarnings()).not.toContain(
      "Units need attention",
    );
    expect(
      app.controller
        .snapshot()
        .match?.units.find((candidate) => candidate.id === unit.id),
    ).toMatchObject({
      at: unit.at,
      hp: unit.hp,
      ready: unit.ready,
      activation: {
        moved: false,
        attacked: false,
        recovered: false,
        captured: false,
        handled: true,
      },
    });
  });

  it.each([
    ["ready", {}, /You · Needs action · Ready/],
    [
      "moved",
      {
        type: "DEFENDER",
        activation: {
          moved: true,
          attacked: false,
          recovered: false,
          captured: false,
          handled: true,
          escapeAvailable: false,
          specialActed: false,
        },
      },
      /Moved · cannot attack \(no Dash\)/,
    ],
    [
      "attacked",
      {
        activation: {
          moved: false,
          attacked: true,
          recovered: false,
          captured: false,
          handled: true,
          escapeAvailable: false,
          specialActed: false,
        },
      },
      /Attacked/,
    ],
    [
      "recovered",
      {
        ready: false,
        activation: {
          moved: false,
          attacked: false,
          recovered: true,
          captured: false,
          handled: true,
          escapeAvailable: false,
          specialActed: false,
        },
      },
      /Recovered/,
    ],
    [
      "captured",
      {
        ready: false,
        activation: {
          moved: false,
          attacked: false,
          recovered: false,
          captured: true,
          handled: true,
          escapeAvailable: false,
          specialActed: false,
        },
      },
      /Captured/,
    ],
    [
      "promoted",
      { ready: false, veteran: true },
      /Veteran · Needs action · Acted/,
    ],
    [
      "actionless",
      {
        ready: false,
        activation: {
          moved: false,
          attacked: false,
          recovered: false,
          captured: false,
          handled: true,
          escapeAvailable: false,
          specialActed: false,
        },
      },
      /Handled · Acted · No actions available/,
    ],
  ] as const)(
    "shows the selected friendly unit's %s state without a modal",
    (_label, patch, expected) => {
      const base = created(setup({ seed: 3 }));
      const human = base.players.find(
        (player) => player.controller === "HUMAN",
      );
      const unit = base.units.find(
        (candidate) => candidate.ownerId === human?.id,
      );
      if (human === undefined || unit === undefined)
        throw new Error("Missing unit-state fixture");
      const initial: GameState = {
        ...base,
        activeSeatIndex: base.turnOrder.indexOf(human.id),
        players: base.players.map((player) =>
          player.id === human.id
            ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
            : player,
        ),
        units: base.units.map((candidate) =>
          candidate.id === unit.id ? { ...candidate, ...patch } : candidate,
        ),
      };
      const boardHost = new RecordingBoardHost();
      app = bootMatchWithBoard(initial, boardHost);
      boardHost.select({ kind: "UNIT", unitId: unit.id });

      expect(document.querySelector(".unit-dock-state")?.textContent).toMatch(
        expected,
      );
      expect(document.querySelector(".modal-unit")).toBeNull();
      expect(document.querySelector(".modal-backdrop")).toBeNull();
      expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
      expect(boardHost.latest()?.interactive).toBe(true);
    },
  );

  it("shows an enemy's visible stats and state without leaking player commands", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const enemy = base.units.find((unit) => unit.ownerId !== human?.id);
    if (human === undefined || enemy === undefined)
      throw new Error("Missing enemy unit fixture");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    boardHost.select({ kind: "UNIT", unitId: enemy.id });

    const dock = document.querySelector(".unit-action-dock");
    expect(dock?.textContent).toContain(`Enemy · Player ${enemy.ownerId}`);
    expect(dock?.textContent).toContain("Attack");
    expect(dock?.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelector(".modal-backdrop")).toBeNull();
  });

  it("shows a visible rival city summary without leaking commands or blocking the map", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const rivalCity = base.cities.find((city) => city.ownerId !== human?.id);
    if (human === undefined || rivalCity === undefined)
      throw new Error("Missing rival city fixture");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(initial, boardHost);
    boardHost.select({ kind: "CITY", cityId: rivalCity.id });

    const dock = document.querySelector(".city-action-dock");
    expect(dock?.textContent).toContain(`Player ${rivalCity.ownerId}`);
    expect(dock?.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
    expect(boardHost.latest()?.interactive).toBe(true);
  });

  it("clears a dock-focused unit selection with Escape instead of opening Settings", () => {
    const boardHost = new RecordingBoardHost();
    const state = created(setup({ seed: 3 }));
    const human = state.players.find((player) => player.controller === "HUMAN");
    const unit = state.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (unit === undefined) throw new Error("Missing Escape selection fixture");
    app = bootMatchWithBoard(state, boardHost);
    boardHost.select({ kind: "UNIT", unitId: unit.id });
    const dockControl = document.querySelector<HTMLElement>(
      ".unit-action-dock button",
    );
    (
      dockControl ?? document.querySelector<HTMLElement>(".unit-action-dock")
    )?.focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(document.querySelector(".unit-action-dock")).toBeNull();
    expect(boardHost.latest()?.selected).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
  });

  it("presents a semantic compact tree and purchases from its separate detail sheet", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human player");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id ? { ...player, stars: 20 } : player,
      ),
    };
    app = bootMatch(undefined, initial);
    const before = app.controller.snapshot().match;
    expect(before).not.toBeNull();
    click("Tech");
    const tree = document.querySelector<HTMLElement>("[role=tree]");
    expect(tree?.getAttribute("aria-label")).toBe("Technology dependency tree");
    expect(tree?.getAttribute("aria-describedby")).toBe("tech-relationships");
    expect(tree?.querySelectorAll("[role=treeitem]")).toHaveLength(9);
    expect(tree?.querySelectorAll("[role=group]")).toHaveLength(4);
    expect(tree?.querySelectorAll(".tech-connector")).toHaveLength(5);
    expect(document.querySelector(".tech-detail")).toBeNull();
    expect(tree?.textContent).not.toContain("Move onto mountains");
    expect(tree?.textContent).not.toContain("Train Riders");
    expect(
      document.querySelectorAll<HTMLImageElement>(".tech-node-art:not(span)"),
    ).toHaveLength(9);
    expect(document.querySelectorAll(".tech-node-art-fallback")).toHaveLength(
      9,
    );
    const ridingArt = techNode("riding").querySelector<HTMLImageElement>(
      ".tech-node-art:not(span)",
    );
    const ridingFallback = techNode("riding").querySelector<HTMLElement>(
      ".tech-node-art-fallback",
    );
    expect(ridingArt?.getAttribute("src")).toBe(
      "/assets/pixellab/ui/tech-riding.png",
    );
    expect(ridingFallback?.hidden).toBe(false);
    ridingArt?.dispatchEvent(new Event("load"));
    expect(ridingFallback?.hidden).toBe(true);
    ridingArt?.dispatchEvent(new Event("error"));
    expect(ridingArt?.hidden).toBe(true);
    expect(ridingFallback?.hidden).toBe(false);
    expect(
      techNode("archery")
        .querySelector<HTMLImageElement>(".tech-node-art:not(span)")
        ?.getAttribute("src"),
    ).toBe("/assets/pixellab/ui/tech-archery.png");
    expect(techNode("forestry").querySelector("img")?.getAttribute("src")).toBe(
      "/assets/pixellab/ui/tech-forestry.png",
    );
    expect(
      techNode("mathematics").querySelector("img")?.getAttribute("src"),
    ).toBe("/assets/pixellab/ui/tech-mathematics.png");
    expect(techNode("mining").getAttribute("aria-label")).toContain(
      "locked; requires Climbing, costs 6 stars",
    );

    techNode("mining").click();
    expect(document.activeElement).toBe(techNode("mining"));
    expect(techNode("mining").getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Locked · research Climbing first",
    );
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Build Mines for 5 stars",
    );
    expect(button("Research Mining · 6 stars", false)).toBeNull();

    techNode("forestry").click();
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Build Lumber Mills on empty Forest for 3 stars and +1 population",
    );
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Locked · research Hunting first",
    );
    techNode("mathematics").click();
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Attack 4 reaches 3 tiles and defeats a full-health Warrior without a defense bonus in one hit",
    );
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Locked · research Forestry first",
    );

    techNode("climbing").focus();
    techNode("climbing").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(document.activeElement).toBe(techNode("climbing"));
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "None · root technology",
    );
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Current cost5 stars",
    );
    const request = vi.spyOn(app.controller, "requestCommand");
    click("Research Climbing · 5 stars");
    expect(request).toHaveBeenCalledWith({
      kind: "RESEARCH",
      tech: "CLIMBING",
    });
    expect(dialog()?.textContent).toContain("Research technology?");
    click("Cancel");
    expect(dialog()?.textContent).toContain("Technology");
    expect(document.activeElement).toBe(techNode("climbing"));
    click("Research Climbing · 5 stars");
    click("Confirm Research");
    const after = app.controller.snapshot().match;
    expect(after?.commandIndex).toBe((before?.commandIndex ?? 0) + 1);
    expect(
      after?.players.find((player) => player.controller === "HUMAN")
        ?.researchedTechs,
    ).toContain("CLIMBING");
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "StatusResearched",
    );
    expect(techNode("climbing").dataset.state).toBe("researched");
    expect(techNode("climbing").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(techNode("climbing"));
    expect(techNode("mining").dataset.state).toBe("available");
    expect(techNode("mining").getAttribute("aria-label")).toContain(
      "available to research, costs 6 stars",
    );
  });

  it("shows owned-city dynamic prices and separates insufficient stars from prerequisites", () => {
    const base = created(setup({ seed: 2 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    const secondCity = base.cities.find((city) => city.ownerId !== human?.id);
    if (human === undefined || secondCity === undefined)
      throw new Error("Missing technology cost fixture");
    const initial: GameState = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(human.id),
      players: base.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 5,
              explored: base.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      cities: base.cities.map((city) =>
        city.id === secondCity.id ? { ...city, ownerId: human.id } : city,
      ),
    };
    app = bootMatch(undefined, initial);
    click("Tech");
    expect(techNode("climbing").dataset.state).toBe("unaffordable");
    expect(techNode("climbing").getAttribute("aria-label")).toContain(
      "gaining 1 more stars",
    );
    expect(techNode("climbing").textContent).toContain("★ 6");
    expect(techNode("mining").dataset.state).toBe("locked");
    expect(techNode("mining").textContent).toContain("★ 8");
    techNode("climbing").click();
    expect(document.querySelector(".tech-detail")?.textContent).toContain(
      "Need 1 more stars",
    );
    expect(button("Research Climbing · 6 stars", false)).toBeNull();
  });

  it("shows a compact actionless city dock without a modal or coordinate-heavy clutter", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (human === undefined || city === undefined)
      throw new Error("Missing city-growth fixture");
    app = bootMatch(undefined, initial);
    chooseInspector(`city:${city.id}`);

    const dock = document.querySelector<HTMLElement>(".city-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
    expect(dock?.getAttribute("aria-labelledby")).toBe(
      `selected-city-${city.id}-title`,
    );
    expect(dock?.querySelectorAll(".city-dock-stat")).toHaveLength(6);
    expect(dock?.textContent).toContain("Player 1 · Capital");
    expect(dock?.textContent).toContain("No training available.");
    expect(dock?.querySelectorAll(".city-dock-empty")).toHaveLength(1);
    expect(dock?.querySelectorAll("button")).toHaveLength(0);
    expect(dock?.textContent).not.toContain("Territory tiles");
    expect(dock?.textContent).not.toContain("Requires");
    expect(dock?.textContent).not.toMatch(/\d+,\d+/);

    const progress = dock?.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute("role")).toBe("progressbar");
    expect(progress?.getAttribute("aria-valuenow")).toBe("0");
    expect(progress?.getAttribute("aria-valuemax")).toBe("2");
    expect(progress?.getAttribute("aria-valuetext")).toBe(
      "0 of 2 population toward level 2",
    );
    dock?.focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector(".city-action-dock")).toBeNull();
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("board");
  });

  it("offers an exact affordable Mine only from the selected ore tile", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const oreTile = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.resource === "ORE" &&
        tile.improvement === null,
    );
    if (human === undefined || city === undefined || oreTile === undefined)
      throw new Error("Missing affordable growth fixture");
    const affordable: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 5,
              researchedTechs: ["CLIMBING", "MINING"],
            }
          : player,
      ),
    };
    app = bootMatch(undefined, affordable);
    chooseCoordinate(oreTile.at.x, oreTile.at.y);
    const tileDock = document.querySelector<HTMLElement>(".tile-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
    expect(tileDock?.textContent).toContain(`Grows City ${city.id}`);
    expect(tileDock?.textContent).toContain(
      "Available now · owned territory · Mining researched · 5 stars available",
    );
    const tileMine = tileDock?.querySelector<HTMLButtonElement>(".mine-action");
    expect(tileMine).not.toBeNull();
    expect(tileMine?.textContent).toBe("MBuild Mine★ 5 · +2 pop");
    expect(tileMine?.getAttribute("aria-label")).toBe(
      `Build Mine at ${oreTile.at.x}, ${oreTile.at.y} for 5 stars; adds 2 population to City ${city.id}`,
    );
    expect(tileMine?.getAttribute("aria-describedby")).toBe(
      `tile-${oreTile.at.x}-${oreTile.at.y}-mine-status`,
    );

    chooseInspector(`city:${city.id}`);
    expect(document.querySelector(".city-action-dock .mine-action")).toBeNull();
    expect(
      document.querySelector(".city-action-dock .fruit-action"),
    ).toBeNull();
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    chooseCoordinate(oreTile.at.x, oreTile.at.y);
    document
      .querySelector<HTMLButtonElement>(".tile-action-dock .mine-action")
      ?.click();

    const after = app.controller.snapshot().match;
    expect(after?.players.find((player) => player.id === human.id)?.stars).toBe(
      0,
    );
    expect(
      after?.board.tiles.find(
        (tile) => tile.at.x === oreTile.at.x && tile.at.y === oreTile.at.y,
      ),
    ).toMatchObject({ resource: null, improvement: "MINE" });
    expect(
      after?.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({ level: 2, population: 0 });
    expect(after?.pendingChoice).toEqual({
      kind: "CITY_REWARD",
      cityId: city.id,
      level: 2,
    });
    expect(dialog()?.textContent).toContain(
      "A resource action increased this city's population, level, base income, and unit capacity",
    );
  });

  it("offers Hunt and Lumber only on their exact Forest tiles with public facts", () => {
    const initial = created(setup({ seed: 2 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const animal = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.terrain === "FOREST" &&
        tile.resource === "ANIMAL",
    );
    if (human === undefined || city === undefined || animal === undefined)
      throw new Error("Missing Forest growth fixture");
    const affordable: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 20,
              researchedTechs: ["HUNTING", "FORESTRY"],
            }
          : player,
      ),
    };
    app = bootMatch(undefined, affordable);
    chooseCoordinate(animal.at.x, animal.at.y);
    const tileDock = document.querySelector<HTMLElement>(".tile-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(tileDock?.textContent).toContain("Forest · Animal");
    expect(tileDock?.textContent).toContain("1 movement · ends move");
    expect(tileDock?.textContent).toContain("1.5× with Archery");
    expect(tileDock?.textContent).toContain(
      "Available now · owned territory · Hunting researched · 20 stars available",
    );
    expect(
      document.querySelector<HTMLOptionElement>(
        `option[value='coordinate:${animal.at.x}:${animal.at.y}']`,
      )?.textContent,
    ).toContain(
      `Forest · Animal · Your City ${city.id} territory · Hunt Animal available`,
    );
    const hunt = tileDock?.querySelector<HTMLButtonElement>(".animal-action");
    expect(hunt?.textContent).toBe("HHunt Animal★ 2 · +1 pop");
    expect(hunt?.getAttribute("aria-label")).toBe(
      `Hunt Animal at ${animal.at.x}, ${animal.at.y} for 2 stars; adds 1 population to City ${city.id}`,
    );

    chooseInspector(`city:${city.id}`);
    expect(
      document.querySelector(".city-action-dock .animal-action"),
    ).toBeNull();
    expect(
      document.querySelector(".city-action-dock .lumber-action"),
    ).toBeNull();
    chooseCoordinate(animal.at.x, animal.at.y);
    document
      .querySelector<HTMLButtonElement>(".tile-action-dock .animal-action")
      ?.click();

    const afterHunt = app.controller.snapshot().match;
    expect(
      afterHunt?.players.find((player) => player.id === human.id)?.stars,
    ).toBe(18);
    expect(
      afterHunt?.board.tiles.find((tile) => sameTestCoord(tile.at, animal.at)),
    ).toMatchObject({
      terrain: "FOREST",
      resource: null,
      improvement: null,
    });
    expect(
      afterHunt?.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({ level: 1, population: 1 });
    const lumber = document.querySelector<HTMLButtonElement>(
      ".tile-action-dock .lumber-action",
    );
    expect(lumber?.textContent).toBe("LBuild Lumber Mill★ 3 · +1 pop");
    expect(lumber?.getAttribute("aria-label")).toBe(
      `Build Lumber Mill at ${animal.at.x}, ${animal.at.y} for 3 stars; adds 1 population to City ${city.id}`,
    );
    lumber?.click();
    expect(
      app.controller
        .snapshot()
        .match?.board.tiles.find((tile) => sameTestCoord(tile.at, animal.at)),
    ).toMatchObject({
      terrain: "FOREST",
      resource: null,
      improvement: "LUMBER_MILL",
    });
    expect(dialog()?.textContent).toContain("hunt Animals");
    expect(dialog()?.textContent).toContain("build a Lumber Mill or Mine");
  });

  it("shows only exact training controls in a rich-state city dock", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const homeUnit = initial.units.find(
      (unit) => unit.ownerId === human?.id && unit.homeCityId === city?.id,
    );
    const openTile = initial.board.tiles.find(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.site === null &&
        !initial.cities.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ) &&
        !initial.units.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ),
    );
    if (
      human === undefined ||
      city === undefined ||
      homeUnit === undefined ||
      openTile === undefined
    )
      throw new Error("Missing rich selected-city fixture");
    const rich: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 40,
              researchedTechs: [
                "CLIMBING",
                "MINING",
                "RIDING",
                "HUNTING",
                "FORESTRY",
                "ARCHERY",
                "ORGANIZATION",
                "STRATEGY",
                "MATHEMATICS",
              ],
            }
          : player,
      ),
      units: initial.units.map((unit) =>
        unit.id === homeUnit.id ? { ...unit, at: openTile.at } : unit,
      ),
    };
    app = bootMatch(undefined, rich);
    chooseInspector(`city:${city.id}`);
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("Missing rich city player view");
    const cityCommands = [
      ...document.querySelectorAll<HTMLButtonElement>(
        ".city-action-dock .city-dock-command",
      ),
    ];
    expect(cityCommands).toHaveLength(5);
    expect(
      document.querySelector(".city-action-dock .fruit-action"),
    ).toBeNull();
    expect(document.querySelector(".city-action-dock .mine-action")).toBeNull();
    expect(
      document.querySelectorAll(".city-action-dock .city-train-action"),
    ).toHaveLength(5);
    expect(cityCommands.every((candidate) => !candidate.disabled)).toBe(true);
    const dock = document.querySelector(".city-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(dock?.textContent).not.toContain("Requires");
    expect(dock?.textContent).not.toMatch(/\d+,\s*\d+/);
    for (const command of cityCommands)
      expect(command.getAttribute("aria-label")?.length).toBeGreaterThan(12);

    const training = [
      ...document.querySelectorAll<HTMLButtonElement>(
        ".city-action-dock .city-train-action",
      ),
    ];
    expect(
      training.every((command) => !command.textContent?.includes("Train")),
    ).toBe(true);
    for (const command of training) {
      expect(command.childElementCount).toBe(3);
      expect(
        command.querySelector("img.city-command-art")?.getAttribute("src"),
      ).toMatch(
        /^\/assets\/pixellab\/units\/(warrior|rider|archer|defender|catapult)\.png$/,
      );
      expect(command.querySelector("strong")?.textContent).toMatch(
        /^(Warrior|Rider|Archer|Defender|Catapult)$/,
      );
      expect(command.querySelector(".city-command-meta")?.textContent).toMatch(
        /^★ \d+$/,
      );
      expect(command.getAttribute("aria-label")).toMatch(/^Train /);
    }
    const catapult = training.find((candidate) =>
      candidate.textContent?.includes("Catapult"),
    );
    expect(catapult?.textContent).toBe("Catapult★ 8");
    expect(catapult?.querySelector("img")?.getAttribute("src")).toBe(
      "/assets/pixellab/units/catapult.png",
    );
    expect(catapult?.querySelector(".city-command-art-catapult")).toBeNull();
    expect(catapult?.getAttribute("aria-label")).toBe(
      `Train Catapult in City ${city.id} for 8 stars`,
    );
  });

  it("shows siege and chosen rewards as stats with one concise empty state", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const friendly = initial.units.find((unit) => unit.ownerId === human?.id);
    const enemy = initial.units.find((unit) => unit.ownerId !== human?.id);
    const openTile = initial.board.tiles.find(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.site === null &&
        !initial.cities.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ) &&
        !initial.units.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ),
    );
    if (
      human === undefined ||
      city === undefined ||
      friendly === undefined ||
      enemy === undefined ||
      openTile === undefined
    )
      throw new Error("Missing besieged selected-city fixture");
    const besieged: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      cities: initial.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 3,
              rewardLevel2: "WORKSHOP",
              rewardLevel3: "CITY_WALL",
            }
          : candidate,
      ),
      units: initial.units.map((unit) =>
        unit.id === friendly.id
          ? { ...unit, at: openTile.at }
          : unit.id === enemy.id
            ? { ...unit, at: city.at }
            : unit,
      ),
    };
    app = bootMatch(undefined, besieged);
    chooseInspector(`city:${city.id}`);
    const dock = document.querySelector(".city-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(dock?.textContent).toContain("Capital · Besieged");
    expect(dock?.textContent).toContain("RewardsWorkshop · City Wall");
    expect(
      dock
        ?.querySelector<HTMLElement>(".city-dock-stat[aria-label^='Income:']")
        ?.getAttribute("aria-label"),
    ).toContain("No income while besieged");
    expect(dock?.querySelectorAll(".city-dock-command")).toHaveLength(0);
    expect(dock?.querySelectorAll(".city-dock-empty")).toHaveLength(1);
  });

  it("distinguishes and harvests affordable fruit from accessible tile inspection", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const fruit = initial.board.tiles.find(
      (tile) => tile.territoryCityId === city?.id && tile.resource === "FRUIT",
    );
    const ordinary = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.terrain === "MOUNTAIN" &&
        tile.resource === null,
    );
    if (
      human === undefined ||
      city === undefined ||
      fruit === undefined ||
      ordinary === undefined
    )
      throw new Error("Missing fruit UI fixture");
    const affordable: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 2,
              researchedTechs: ["ORGANIZATION"],
            }
          : player,
      ),
    };
    app = bootMatch(undefined, affordable);
    chooseCoordinate(ordinary.at.x, ordinary.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Mountain · no ore",
    );
    expect(document.querySelector(".tile-action-dock .mine-action")).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    chooseCoordinate(fruit.at.x, fruit.at.y);
    const dock = document.querySelector<HTMLElement>(".tile-action-dock");
    expect(dock?.textContent).toContain(`Grows City ${city.id}`);
    expect(dock?.textContent).toContain(
      "Available now · owned territory · Organization researched · 2 stars available",
    );
    const harvest = dock?.querySelector<HTMLButtonElement>(".fruit-action");
    expect(harvest).not.toBeNull();
    expect(harvest?.textContent).toBe("FHarvest Fruit★ 2 · +1 pop");
    expect(harvest?.getAttribute("aria-describedby")).toBe(
      `tile-${fruit.at.x}-${fruit.at.y}-fruit-status`,
    );
    harvest?.click();
    const after = app.controller.snapshot().match;
    expect(after?.players.find((player) => player.id === human.id)?.stars).toBe(
      0,
    );
    expect(
      after?.board.tiles.find(
        (tile) => tile.at.x === fruit.at.x && tile.at.y === fruit.at.y,
      ),
    ).toMatchObject({ resource: null, improvement: null });
    expect(
      after?.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      level: 1,
      population: 1,
    });
    expect(
      document.querySelector(".tile-action-dock .fruit-action"),
    ).toBeNull();
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Grass · None",
    );
    expect(dialog()).toBeNull();
  });

  it("keeps every tile kind fog-safe, non-blocking, and separate from city actions", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const unit = initial.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const fruit = initial.board.tiles.find(
      (tile) => tile.territoryCityId === city?.id && tile.resource === "FRUIT",
    );
    const oreTiles = initial.board.tiles.filter(
      (tile) => tile.territoryCityId === city?.id && tile.resource === "ORE",
    );
    const ordinaryMountain = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.terrain === "MOUNTAIN" &&
        tile.resource === null,
    );
    const plainTiles = initial.board.tiles.filter(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.resource === null &&
        tile.site === null &&
        tile.improvement === null &&
        !initial.cities.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ) &&
        !initial.units.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ),
    );
    const hidden = initial.board.tiles.find(
      (tile) =>
        human !== undefined &&
        !human.explored.some((at) => sameTestCoord(at, tile.at)) &&
        !sameTestCoord(tile.at, plainTiles[0]?.at ?? { x: -1, y: -1 }) &&
        !sameTestCoord(tile.at, plainTiles[1]?.at ?? { x: -1, y: -1 }),
    );
    const ore = oreTiles[0];
    const minedOre = oreTiles[1];
    const occupied = plainTiles[0];
    const plain = plainTiles[1];
    if (
      human === undefined ||
      city === undefined ||
      unit === undefined ||
      fruit === undefined ||
      ore === undefined ||
      minedOre === undefined ||
      ordinaryMountain === undefined ||
      occupied === undefined ||
      plain === undefined ||
      hidden === undefined
    )
      throw new Error("Missing comprehensive tile-dock fixture");
    const state: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              explored: initial.board.tiles
                .filter((tile) => !sameTestCoord(tile.at, hidden.at))
                .map((tile) => tile.at),
            }
          : player,
      ),
      board: {
        ...initial.board,
        tiles: initial.board.tiles.map((tile) =>
          sameTestCoord(tile.at, minedOre.at)
            ? { ...tile, resource: null, improvement: "MINE" as const }
            : tile,
        ),
      },
      units: initial.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: occupied.at }
          : candidate,
      ),
    };
    const boardHost = new RecordingBoardHost();
    app = bootMatchWithBoard(state, boardHost);

    chooseCoordinate(plain.at.x, plain.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Grass · None",
    );
    expect(document.querySelector(".tile-action-dock button")).toBeNull();

    chooseCoordinate(fruit.at.x, fruit.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Organization required",
    );
    expect(
      document.querySelector(".tile-action-dock .fruit-action"),
    ).toBeNull();

    chooseCoordinate(ore.at.x, ore.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Mining required",
    );
    expect(document.querySelector(".tile-action-dock .mine-action")).toBeNull();

    chooseCoordinate(ordinaryMountain.at.x, ordinaryMountain.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Mountain · no ore",
    );

    chooseCoordinate(minedOre.at.x, minedOre.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Mountain · Mine",
    );
    expect(document.querySelector(".tile-action-dock button")).toBeNull();

    chooseCoordinate(occupied.at.x, occupied.at.y);
    expect(document.querySelector(".unit-action-dock")).not.toBeNull();
    chooseCoordinate(occupied.at.x, occupied.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Warrior · Player 1",
    );

    chooseCoordinate(city.at.x, city.at.y);
    expect(document.querySelector(".city-action-dock")).not.toBeNull();
    expect(
      document.querySelector(".city-action-dock .fruit-action"),
    ).toBeNull();
    expect(document.querySelector(".city-action-dock .mine-action")).toBeNull();

    chooseCoordinate(hidden.at.x, hidden.at.y);
    const fogDock = document.querySelector<HTMLElement>(".tile-action-dock");
    expect(fogDock?.textContent).toBe(
      `Tile ${hidden.at.x}, ${hidden.at.y}Unexplored`,
    );
    expect(fogDock?.querySelector("button")).toBeNull();
    expect(fogDock?.textContent).not.toMatch(
      /Grass|Mountain|Fruit|Ore|Mine|Village|Player|City/,
    );
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(app.controller.snapshot().overlay).toEqual({ name: "NONE" });
    expect(boardHost.latest()?.interactive).toBe(true);

    fogDock?.focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(document.querySelector(".tile-action-dock")).toBeNull();
    expect(boardHost.latest()?.selected).toBeNull();
  });

  it("describes rival, siege, and pending-reward resource locks without fake buttons", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const rivalCity = initial.cities.find(
      (candidate) => candidate.ownerId !== human?.id,
    );
    const ore = initial.board.tiles.find(
      (tile) => tile.territoryCityId === city?.id && tile.resource === "ORE",
    );
    const rivalOre = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === rivalCity?.id && tile.resource === "ORE",
    );
    const friendly = initial.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    const enemy = initial.units.find(
      (candidate) => candidate.ownerId !== human?.id,
    );
    const open = initial.board.tiles.find(
      (tile) =>
        tile.terrain === "GRASS" &&
        tile.resource === null &&
        tile.site === null &&
        !initial.cities.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ) &&
        !initial.units.some((candidate) =>
          sameTestCoord(candidate.at, tile.at),
        ),
    );
    if (
      human === undefined ||
      city === undefined ||
      rivalCity === undefined ||
      ore === undefined ||
      rivalOre === undefined ||
      friendly === undefined ||
      enemy === undefined ||
      open === undefined
    )
      throw new Error("Missing tile-lock fixture");
    const unlocked: GameState = {
      ...initial,
      activeSeatIndex: initial.turnOrder.indexOf(human.id),
      players: initial.players.map((player) =>
        player.id === human.id
          ? {
              ...player,
              stars: 20,
              researchedTechs: ["CLIMBING", "MINING"],
              explored: initial.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
    };
    app = bootMatch(undefined, unlocked);
    chooseCoordinate(rivalOre.at.x, rivalOre.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Rival territory",
    );
    expect(document.querySelector(".tile-action-dock button")).toBeNull();

    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const pending: GameState = {
      ...unlocked,
      cities: unlocked.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, level: 2 } : candidate,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    app = bootMatch(undefined, pending);
    chooseCoordinate(ore.at.x, ore.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "Choose the pending city reward first",
    );
    expect(document.querySelector(".tile-action-dock button")).toBeNull();
    expect(dialog()?.textContent).toContain("This choice is required");

    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const besieged: GameState = {
      ...unlocked,
      units: unlocked.units.map((candidate) =>
        candidate.id === friendly.id
          ? { ...candidate, at: open.at }
          : candidate.id === enemy.id
            ? { ...candidate, at: city.at }
            : candidate,
      ),
    };
    app = bootMatch(undefined, besieged);
    chooseCoordinate(ore.at.x, ore.at.y);
    expect(document.querySelector(".tile-action-dock")?.textContent).toContain(
      "City is besieged",
    );
    expect(document.querySelector(".tile-action-dock button")).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
  });

  it("renders unit stats in the non-modal dock, plus compact city and tile facts", () => {
    app = bootMatch(setup({ seed: 3 }));
    const view = app.controller.snapshot().view;
    const humanUnit = view?.units.find(
      (unit) => unit.ownerId === view.viewer.id,
    );
    const humanCity = view?.cities.find(
      (city) => city.ownerId === view.viewer.id,
    );
    expect(humanUnit).toBeDefined();
    expect(humanCity).toBeDefined();
    chooseInspector(`unit:${humanUnit?.id ?? 0}`);
    const dock = document.querySelector(".unit-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-unit")).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(dock?.textContent).toContain("HP");
    expect(dock?.textContent).toContain("Attack");
    expect(dock?.textContent).toContain("Defense");
    expect(dock?.textContent).toContain("Move");
    expect(dock?.textContent).toContain("Range");
    expect(
      [...(dock?.querySelectorAll("button") ?? [])].some((candidate) =>
        candidate.textContent?.startsWith("Move to "),
      ),
    ).toBe(false);
    if (view === null || humanUnit === undefined)
      throw new Error("Missing unit movement fixture");
    const move = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command) => command.kind === "MOVE" && command.unitId === humanUnit.id,
      );
    if (move === undefined) throw new Error("Missing offered move command");
    app.controller.requestCommand(move);

    chooseInspector(`city:${humanCity?.id ?? 0}`);
    const cityDock = document.querySelector(".city-action-dock");
    expect(dialog()).toBeNull();
    expect(cityDock?.textContent).toContain("Capacity");
    expect(cityDock?.textContent).not.toContain("Territory tiles");
    const trainWarrior = ariaButton(
      `Train Warrior in City ${humanCity?.id ?? 0} for 2 stars`,
    );
    expect(trainWarrior.disabled).toBe(false);
    expect(trainWarrior.textContent).toBe("Warrior★ 2");
    const beforeTrain = app.controller.snapshot().match?.commandIndex;
    trainWarrior.click();
    expect(app.controller.snapshot().match?.commandIndex).toBe(
      (beforeTrain ?? 0) + 1,
    );
    const explored = app.controller
      .snapshot()
      .view?.board.tiles.find((tile) => tile.explored);
    chooseInspector(`tile:${explored?.at.x ?? 0}:${explored?.at.y ?? 0}`);
    const tileDock = document.querySelector(".tile-action-dock");
    expect(dialog()).toBeNull();
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    expect(tileDock?.textContent).toContain(
      `Tile ${explored?.at.x ?? 0}, ${explored?.at.y ?? 0}`,
    );
    expect(tileDock?.textContent).toContain("Movement");
    expect(tileDock?.textContent).toContain("Defense");
  });

  it("warns before ending with units needing attention, then presents and advances AI", () => {
    app = bootMatch(setup({ seed: 3 }));
    click("End Turn");
    expect(dialog()?.textContent).toContain("Units need attention");
    click("Keep Playing");
    expect(document.body.textContent).toContain("Your Turn");
    click("End Turn");
    click("End Anyway");
    expect(document.body.textContent).toContain("is thinking");
    expect(button("Fast Forward").disabled).toBe(false);
  });

  it("does not claim a handled moved unit needs attention when only economy remains", () => {
    app = bootMatch(setup({ seed: 3 }));
    const view = app.controller.snapshot().view;
    const humanUnit = view?.units.find(
      (unit) => unit.ownerId === view.viewer.id,
    );
    if (view === null || humanUnit === undefined)
      throw new Error("Missing human unit");
    const move = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command) => command.kind === "MOVE" && command.unitId === humanUnit.id,
      );
    if (move === undefined) throw new Error("Missing move command");
    app.controller.requestCommand(move);

    click("End Turn");
    expect(dialog()?.textContent).toContain("Affordable training remains");
    expect(dialog()?.textContent).not.toContain("Units need attention");
  });
});

describe("blocking, result, focus, and accessibility behavior", () => {
  it("clears DOM selection for Restart while preserving it across ordinary remounts", () => {
    const boardHost = new RecordingBoardHost();
    const state = created(setup({ seed: 3 }));
    const human = state.players.find((player) => player.controller === "HUMAN");
    const unit = state.units.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (unit === undefined) throw new Error("Missing unit");
    app = bootstrapApp(document, {
      initialRoute: "MATCH",
      initialMatch: state,
      boardHost,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    boardHost.select({ kind: "UNIT", unitId: unit.id });
    click("Settings");
    expect(boardHost.latest()?.selected).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
    const initialId = boardHost.latest()?.matchInstanceId;
    click("Resume");
    expect(boardHost.latest()?.matchInstanceId).toBe(initialId);
    expect(boardHost.latest()?.selected).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
    click("Settings");
    click("Restart Same Match");
    click("Restart Match");
    expect(boardHost.latest()?.matchInstanceId).toBe((initialId ?? 0) + 1);
    expect(boardHost.latest()?.selected).toBeNull();
  });

  it("makes an authoritative city reward non-dismissible and applies one legal choice", () => {
    const initial = created(setup({ seed: 3 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (city === undefined) throw new Error("Missing fixture city");
    const rewardState: GameState = {
      ...initial,
      cities: initial.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, level: 2, population: 0 }
          : candidate,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    app = bootMatch(undefined, rewardState);
    expect(dialog()?.textContent).toContain(`City ${city.id} reached level 2`);
    expect(dialog()?.textContent).toContain(
      "increased this city's population, level, base income, and unit capacity",
    );
    expect(dialog()?.textContent).toContain("Base income2 stars");
    expect(dialog()?.textContent).toContain("Unit capacity2");
    expect(dialog()?.textContent).toContain("Population0 / 3 toward level 3");
    expect(dialog()?.textContent).toContain(
      "cannot train units, harvest Fruit, hunt Animals, build a Lumber Mill or Mine, or End Turn",
    );
    expect(
      [
        ...document.querySelectorAll<HTMLImageElement>(".reward-choice-art"),
      ].map((image) => image.getAttribute("src")),
    ).toEqual([
      "/assets/pixellab/ui/reward-workshop.png",
      "/assets/pixellab/ui/reward-survey.png",
    ]);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(dialog()?.textContent).toContain("This choice is required");
    click("Workshop · +1 income each turn");
    expect(app.controller.snapshot().match?.pendingChoice).toBeNull();
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("board");
    expect(
      app.controller
        .snapshot()
        .match?.cities.find((candidate) => candidate.id === city.id)
        ?.rewardLevel2,
    ).toBe("WORKSHOP");
  });

  it("wires both level-three reward icons while retaining text choices", () => {
    const initial = created(setup({ seed: 2 }));
    const human = initial.players.find(
      (player) => player.controller === "HUMAN",
    );
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === human?.id,
    );
    if (city === undefined) throw new Error("Missing fixture city");
    const rewardState: GameState = {
      ...initial,
      cities: initial.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, level: 3, population: 0 }
          : candidate,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 3 },
    };
    app = bootMatch(undefined, rewardState);
    expect(
      [
        ...document.querySelectorAll<HTMLImageElement>(".reward-choice-art"),
      ].map((image) => image.getAttribute("src")),
    ).toEqual([
      "/assets/pixellab/ui/reward-resources.png",
      "/assets/pixellab/ui/reward-city-wall.png",
    ]);
    click("Resources · +5 stars now");
    expect(
      app.controller
        .snapshot()
        .match?.cities.find((candidate) => candidate.id === city.id)
        ?.rewardLevel3,
    ).toBe("RESOURCES");
  });

  it("supports settings focus return, keyboard overlays, and exact delete confirmation", () => {
    app = bootMatch(setup({ seed: 3 }));
    const settings = button("Settings");
    settings.focus();
    settings.click();
    expect(dialog()?.getAttribute("aria-modal")).toBe("true");
    click("Resume");
    expect(document.activeElement?.textContent).toBe("Settings");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "t", bubbles: true }),
    );
    expect(dialog()?.textContent).toContain("Technology");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    click("Settings");
    click("Delete Save");
    expect(dialog()?.textContent).toContain("Delete current saved match?");
    expect(dialog()?.querySelectorAll("button")[0]?.textContent).toBe("Cancel");
    click("Cancel");
    expect(app.controller.snapshot().match).not.toBeNull();
    for (const control of document.querySelectorAll<HTMLButtonElement>(
      "button",
    )) {
      expect(
        (control.textContent ?? control.getAttribute("aria-label") ?? "").trim()
          .length,
      ).toBeGreaterThan(0);
    }
  });

  it("renders victory, final map, restart confirmation, and no fabricated score", () => {
    const base = created(setup({ seed: 3 }));
    const human = base.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const won: GameState = {
      ...base,
      outcome: { kind: "VICTORY", winnerId: human.id },
    };
    app = bootMatch(undefined, won, "RESULT");
    expect(heading()).toBe("Victory");
    expect(document.body.textContent).not.toContain("Domination");
    expect(document.body.textContent).not.toContain("Score");
    expect(document.body.textContent).toContain(
      "Defeated counts your combat kills. Lost counts every removed unit, including elimination cleanup.",
    );
    click("View Final Map");
    expect(document.body.textContent).toContain("Final Map");
    click("Results");
    click("Play Again");
    expect(dialog()?.textContent).toContain("identical setup and seed");
    click("Cancel");
    click("New Conquest");
    expect(heading()).toBe("Conquest Setup");
    expect(input("seed-input").value).toBe("");
  });
});

function boot(
  options: { readonly randomSeed?: () => number } = {},
): BootstrappedApp {
  return bootstrapApp(document, {
    splashDurationMs: 0,
    aiStepDelayMs: 100_000,
    prefersReducedMotion: true,
    ...options,
  });
}

function bootMatch(
  customSetup?: MatchSetup,
  initialState?: GameState,
  initialRoute: "MATCH" | "RESULT" = "MATCH",
): BootstrappedApp {
  return bootstrapApp(document, {
    initialMatch: initialState ?? created(customSetup ?? setup()),
    initialRoute,
    aiStepDelayMs: 100_000,
    prefersReducedMotion: true,
  });
}

function bootMatchWithBoard(
  initialState: GameState,
  boardHost: BoardHost,
): BootstrappedApp {
  return bootstrapApp(document, {
    initialMatch: initialState,
    initialRoute: "MATCH",
    boardHost,
    aiStepDelayMs: 100_000,
    prefersReducedMotion: true,
  });
}

function setup(overrides: Partial<MatchSetup> = {}): MatchSetup {
  const aiCount = overrides.aiCount ?? 1;
  return {
    rulesetId: RULESET_ID,
    seed: 3,
    width: 11,
    height: 11,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    ...overrides,
    factions:
      overrides.factions ??
      Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
  };
}

function created(matchSetup: MatchSetup): GameState {
  const result = createGame(matchSetup);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function click(label: string): void {
  button(label).click();
}

function button(label: string, required = true): HTMLButtonElement {
  const found =
    [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent === label,
    ) ?? null;
  if (found === null && required)
    throw new Error(`Missing button: ${label}\n${document.body.textContent}`);
  return found as HTMLButtonElement;
}

function ariaButton(label: string): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
  ].find((candidate) => candidate.getAttribute("aria-label") === label);
  if (found === undefined) throw new Error(`Missing ARIA button: ${label}`);
  return found;
}

function techNode(tech: string): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(
    `.tech-node[data-tech="${tech}"]`,
  );
  if (found === null) throw new Error(`Missing technology node: ${tech}`);
  return found;
}

function input(id: string): HTMLInputElement;
function input(id: string, required: false): HTMLInputElement | null;
function input(id: string, required = true): HTMLInputElement | null {
  const found = document.querySelector<HTMLInputElement>(`#${id}`);
  if (found === null && required) throw new Error(`Missing input: ${id}`);
  return found;
}

function radio(name: string, value: string): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(
    `input[name="${name}"][value="${value}"]`,
  );
  if (found === null) throw new Error(`Missing radio ${name}=${value}`);
  return found;
}

function chooseInspector(value: string): void {
  const select = document.querySelector<HTMLSelectElement>(
    "select[aria-label='Choose a map coordinate or object']",
  );
  if (select === null) throw new Error("Missing board inspector");
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function chooseCoordinate(x: number, y: number): void {
  const select = document.querySelector<HTMLSelectElement>(
    "select[aria-label='Choose a map coordinate or object']",
  );
  if (select === null) throw new Error("Missing coordinate activator");
  select.value = `coordinate:${x}:${y}`;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-modal]");
}

function heading(): string | null {
  return document.querySelector("h1")?.textContent ?? null;
}

function seedHex(seed: number): string {
  return (seed >>> 0).toString(16).padStart(8, "0");
}

function sameTestCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

class RecordingBoardHost implements BoardHost {
  readonly updates: BoardHostModel[] = [];
  #callbacks: BoardHostCallbacks | null = null;
  #cycle: InspectionActivationCycle | null = null;
  #commandIndex: number | null = null;

  mount(_container: HTMLElement, callbacks: BoardHostCallbacks): void {
    this.#callbacks = callbacks;
  }

  update(model: BoardHostModel): void {
    if (
      this.#commandIndex !== null &&
      this.#commandIndex !== model.view.commandIndex
    )
      this.#cycle = null;
    this.#commandIndex = model.view.commandIndex;
    this.updates.push(model);
  }

  activate(at: { readonly x: number; readonly y: number }): void {
    const model = this.latest();
    if (model === undefined) return;
    if (model.interactive && model.selected?.kind === "UNIT") {
      const command = spatialCommandAt(model.view, model.selected.unitId, at);
      if (command !== null) {
        this.#callbacks?.onCommand(command);
        return;
      }
    }
    const activation = resolveInspectionActivation(model.view, at, this.#cycle);
    this.#cycle = activation.cycle;
    this.#callbacks?.onSelection(activation.selection);
  }

  resetActivationCycle(): void {
    this.#cycle = null;
  }

  zoom(): void {}

  focus(): void {}

  screenPoint(): Point | null {
    return null;
  }

  destroy(): void {}

  select(selection: BoardSelection | null): void {
    this.#callbacks?.onSelection(selection);
  }

  latest(): BoardHostModel | undefined {
    return this.updates.at(-1);
  }
}
