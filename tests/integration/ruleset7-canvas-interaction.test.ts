// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  type CityId,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
  viewForV7,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { checkedV7, exploredAllV7, initialV7 } from "../fixtures/v7-builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Ruleset 7 Canvas interaction", () => {
  it("mounts one stable Canvas host and updates selection without changing its node", async () => {
    const host = new RecordingBoardHost();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    document
      .querySelector<HTMLButtonElement>('[data-action="launch"]')
      ?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(host.mount).toHaveBeenCalledTimes(1);
    const firstContainer = host.container;
    const unit = app.controller
      .snapshot()
      .view?.units.find(
        (candidate) =>
          candidate.ownerId === app.controller.snapshot().view?.viewer.id,
      );
    if (unit === undefined) throw new Error("Owned unit missing");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(host.mount).toHaveBeenCalledTimes(1);
    expect(host.container).toBe(firstContainer);
    expect(document.querySelector(".v7-selection-dock")).not.toBeNull();
    expect(document.body.textContent).toContain("Needs action");
    expect(document.querySelectorAll(".v7-unit-stats dt")).toHaveLength(6);
    const ability =
      document.querySelector<HTMLButtonElement>(".v7-ability-tag");
    ability?.click();
    expect(document.querySelector(".v7-ability-card")).not.toBeNull();
    const wait = document.querySelector<HTMLButtonElement>(
      '[data-action="command-wait"]',
    );
    wait?.click();
    await waitUntil(() => host.presentBoundary.mock.calls.length === 1);
    expect(host.update.mock.calls.some(([model]) => !model.interactive)).toBe(
      true,
    );
    app.destroy();
  });

  it("keeps paired Farm halves independently selectable and fog-protected", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.append(container);
    const host = new CanvasBoardHostV7(document);
    const selections = vi.fn();
    host.mount(container, { onSelection: selections, onCommand: vi.fn() });
    const state = exploredAllV7(initialV7(7722));
    const base = viewForV7(state, state.humanPlayerId);
    const occupied = new Set([
      ...base.units.map((unit) => `${unit.at.x},${unit.at.y}`),
      ...base.cities.map((city) => `${city.at.x},${city.at.y}`),
    ]);
    const left = base.board.tiles.find(
      (tile) =>
        tile.explored &&
        !occupied.has(`${tile.at.x},${tile.at.y}`) &&
        base.board.tiles.some(
          (right) =>
            right.explored &&
            right.at.x === tile.at.x + 1 &&
            right.at.y === tile.at.y &&
            !occupied.has(`${right.at.x},${right.at.y}`),
        ),
    );
    if (left === undefined) throw new Error("vacant adjacent tiles missing");
    const right = { x: left.at.x + 1, y: left.at.y };
    const pairView: PlayerViewV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.explored &&
          ((tile.at.x === left.at.x && tile.at.y === left.at.y) ||
            (tile.at.x === right.x && tile.at.y === right.y))
            ? {
                ...tile,
                improvement: "FARM" as const,
                territoryCityId: 1 as CityId,
              }
            : tile,
        ),
      },
    };
    const model = (view: PlayerViewV7): BoardHostModelV7 => ({
      matchInstanceId: 1,
      view,
      offeredCommands: [],
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    host.update(model(pairView));
    host.activate(left.at);
    host.activate(right);
    expect(selections.mock.calls.map(([selection]) => selection)).toEqual([
      { kind: "TILE", at: left.at },
      { kind: "TILE", at: right },
    ]);
    const foggedView: PlayerViewV7 = {
      ...pairView,
      board: {
        ...pairView.board,
        tiles: pairView.board.tiles.map((tile) =>
          tile.at.x === right.x && tile.at.y === right.y
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    };
    host.update(model(foggedView));
    host.activate(right);
    expect(selections.mock.calls[2]?.[0]).toEqual({ kind: "TILE", at: right });
    const foggedEntries = buildBoardRenderPlanV7(foggedView, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.filter(
      (entry) => entry.at.x === right.x && entry.at.y === right.y,
    );
    expect(foggedEntries).toContainEqual(
      expect.objectContaining({ kind: "FOG" }),
    );
    expect(foggedEntries.some((entry) => entry.kind === "IMPROVEMENT")).toBe(
      false,
    );
    host.destroy();
  });

  it("uses occupant-first cycling while exact map commands take activation priority", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.append(container);
    const host = new CanvasBoardHostV7(document);
    const selections = vi.fn();
    const commands = vi.fn();
    host.mount(container, { onSelection: selections, onCommand: commands });
    const state = initialV7(1519);
    const view = viewForV7(state, state.humanPlayerId);
    const unit = view.units.find(
      (candidate) => candidate.ownerId === view.viewer.id,
    );
    if (unit === undefined) throw new Error("owned unit missing");
    const offered = queryPlayerCommandsV7(view);
    host.update({
      matchInstanceId: 1,
      view,
      offeredCommands: offered,
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("canvas missing");
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    const down = new MouseEvent("pointerdown", {
      bubbles: true,
      clientX: 400,
      clientY: 300,
    });
    const up = new MouseEvent("pointerup", {
      bubbles: true,
      clientX: 400,
      clientY: 300,
    });
    for (const event of [down, up]) {
      Object.defineProperty(event, "pointerId", { value: 1 });
      Object.defineProperty(event, "pointerType", { value: "touch" });
    }
    canvas.dispatchEvent(down);
    canvas.dispatchEvent(up);
    expect(selections.mock.calls[0]?.[0]).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
    const capital = view.cities.find((city) => sameCoord(city.at, unit.at));
    if (capital === undefined) throw new Error("unit city missing");
    expect(selections.mock.calls[1]?.[0]).toEqual({
      kind: "CITY",
      cityId: capital.id,
    });
    const advancedView = { ...view, commandIndex: view.commandIndex + 1 };
    host.update({
      matchInstanceId: 1,
      view: advancedView,
      offeredCommands: [],
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    host.activate(unit.at);
    expect(selections.mock.calls[2]?.[0]).toEqual({
      kind: "UNIT",
      unitId: unit.id,
    });
    const replacementId = (unit.id + 100) as typeof unit.id;
    const replacedView: PlayerViewV7 = {
      ...advancedView,
      units: advancedView.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, id: replacementId }
          : candidate,
      ),
    };
    host.update({
      matchInstanceId: 1,
      view: replacedView,
      offeredCommands: [],
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    host.activate(unit.at);
    expect(selections.mock.calls[3]?.[0]).toEqual({
      kind: "UNIT",
      unitId: replacementId,
    });
    const revealedOnFog: PlayerViewV7 = {
      ...replacedView,
      board: {
        ...replacedView.board,
        tiles: replacedView.board.tiles.map((tile) =>
          sameCoord(tile.at, unit.at)
            ? { at: tile.at, explored: false as const }
            : tile,
        ),
      },
    };
    host.update({
      matchInstanceId: 1,
      view: revealedOnFog,
      offeredCommands: [],
      interactive: false,
      motion: "REDUCED",
      animationSpeed: "FAST",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    host.activate(unit.at);
    expect(container.querySelector(".sr-only")?.textContent).toContain(
      "Explicitly revealed unit on unexplored terrain",
    );

    const move = offered.find(
      (command) => command.kind === "MOVE" && command.unitId === unit.id,
    );
    if (move?.kind !== "MOVE") throw new Error("move missing");
    host.update({
      matchInstanceId: 1,
      view,
      offeredCommands: offered,
      interactive: true,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: { kind: "UNIT", unitId: unit.id },
        selectedUnitId: unit.id,
        selectedAchievement: null,
      },
    });
    const destination = move.path.at(-1);
    if (destination === undefined) throw new Error("destination missing");
    host.activate(destination);
    expect(commands).toHaveBeenCalledWith(
      expect.objectContaining({ command: move }),
    );
    const priorSelections = selections.mock.calls.length;
    for (const event of [
      pointerEvent("pointerdown", 7, 300, 300),
      pointerEvent("pointerdown", 8, 500, 300),
      pointerEvent("pointermove", 8, 560, 300),
      pointerEvent("pointerup", 8, 560, 300),
      pointerEvent("pointerup", 7, 300, 300),
    ])
      canvas.dispatchEvent(event);
    expect(selections).toHaveBeenCalledTimes(priorSelections);
    host.destroy();
  });

  it("locks focus to a mandatory level reward and drains it with one choice", async () => {
    const host = new RecordingBoardHost();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    const seed = document.querySelector<HTMLInputElement>("#v7-seed");
    if (seed === null) throw new Error("seed missing");
    seed.value = "7";
    document
      .querySelector<HTMLButtonElement>('[data-action="launch"]')
      ?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    for (let index = 0; index < 2; index += 1) {
      const harvest = app.controller
        .snapshot()
        .offeredCommands.find((command) => command.kind === "HARVEST_FRUIT");
      if (harvest?.kind !== "HARVEST_FRUIT") throw new Error("harvest missing");
      host.callbacks?.onSelection({ kind: "TILE", at: harvest.at });
      document
        .querySelector<HTMLButtonElement>(
          '[data-action="command-harvest_fruit"]',
        )
        ?.click();
      await waitUntil(
        () => app.controller.snapshot().view?.commandIndex === index + 1,
      );
    }
    const modal = document.querySelector<HTMLElement>(
      "[data-mandatory-choice]",
    );
    expect(modal).not.toBeNull();
    expect(
      document.querySelector<HTMLButtonElement>('[data-action="tech"]')
        ?.disabled,
    ).toBe(true);
    const choices = [
      ...(modal?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ];
    expect(document.activeElement).toBe(choices[0]);
    const last = choices.at(-1);
    last?.focus();
    last?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(document.activeElement).toBe(choices[0]);
    choices
      .find((choice) => choice.dataset.action === "reward-stockpile")
      ?.click();
    await waitUntil(
      () => app.controller.snapshot().view?.pendingChoices.length === 0,
    );
    expect(document.querySelector("[data-mandatory-choice]")).toBeNull();
    app.destroy();
  });

  it("presents accepted AI boundaries while the policy run is still live", async () => {
    const host = new RecordingBoardHost();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    const seed = document.querySelector<HTMLInputElement>("#v7-seed");
    if (seed === null) throw new Error("seed missing");
    seed.value = "0";
    document
      .querySelector<HTMLButtonElement>('[data-action="launch"]')
      ?.click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        app.controller.snapshot().ai.active === false &&
        (app.controller.snapshot().view?.commandIndex ?? 0) > 0,
    );
    expect(host.presentBoundary).toHaveBeenCalled();
    expect(host.presentBoundary.mock.calls[0]?.[2].viewerId).toBe(
      app.controller.snapshot().view?.viewer.id,
    );
    app.destroy();
  });

  it("cannot resurrect the shell when destroyed during a deferred presentation", async () => {
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrame;
        nextFrame += 1;
        frames.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const host = new DeferredBoardHost();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      boardHost: host,
    });
    document
      .querySelector<HTMLButtonElement>('[data-action="launch"]')
      ?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    const owned = app.controller
      .snapshot()
      .view?.units.find(
        (unit) => unit.ownerId === app.controller.snapshot().view?.viewer.id,
      );
    if (owned === undefined) throw new Error("Owned unit missing");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: owned.id });
    const wait = document.querySelector<HTMLButtonElement>(
      '[data-action="command-wait"]',
    );
    if (wait === null) throw new Error("Wait action missing");
    wait.click();
    await waitUntil(() => host.presentBoundary.mock.calls.length === 1);
    expect(frames.size).toBe(1);

    app.destroy();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(host.finishPresentations).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(document.querySelector("#app")?.childElementCount).toBe(0);
  });

  it("settles animation promises on finish, match replacement and Fast mode", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    let now = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrame;
        nextFrame += 1;
        frames.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.append(container);
    const state = exploredAllV7(initialV7(1530));
    const before = viewForV7(state, state.humanPlayerId);
    const move = queryPlayerCommandsV7(before).find(
      (command) => command.kind === "MOVE",
    );
    if (move?.kind !== "MOVE") throw new Error("move missing");
    const moved = applyCommandV7(state, state.humanPlayerId, move);
    if (!moved.accepted) throw new Error(moved.error.code);
    const after = viewForV7(moved.state, state.humanPlayerId);
    const envelope = projectEventsV7(
      state,
      moved.state,
      state.humanPlayerId,
      moved.events,
    );
    const host = new CanvasBoardHostV7(document);
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    const model: BoardHostModelV7 = {
      matchInstanceId: 1,
      view: after,
      offeredCommands: queryPlayerCommandsV7(after),
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    };
    host.update(model);
    const finished = host.presentBoundary(before, after, envelope);
    expect(frames.size).toBe(1);
    host.finishPresentations();
    await expect(finished).resolves.toBeUndefined();
    await Promise.resolve();
    expect(frames.size).toBe(0);

    const replaced = host.presentBoundary(before, after, envelope);
    expect(frames.size).toBe(1);
    host.update({ ...model, matchInstanceId: 2 });
    await expect(replaced).resolves.toBeUndefined();
    await Promise.resolve();
    expect(frames.size).toBe(0);

    host.update({ ...model, matchInstanceId: 2, animationSpeed: "FAST" });
    const priorRequests = vi.mocked(window.requestAnimationFrame).mock.calls
      .length;
    const fast = host.presentBoundary(before, after, envelope);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(
      priorRequests + 1,
    );
    host.finishPresentations();
    await expect(fast).resolves.toBeUndefined();
    await Promise.resolve();
    expect(frames.size).toBe(0);
    now += 1_000;
    host.destroy();
  });

  it("keeps pre-impact HP visible until a ranged projectile lands", async () => {
    let now = 0;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        const id = nextFrame;
        nextFrame += 1;
        frames.set(id, callback);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const healthRatios: number[] = [];
    const arrowPoints: { readonly x: number; readonly y: number }[] = [];
    const impactRadii: number[] = [];
    const sceneAlphas: number[] = [];
    const target: Record<PropertyKey, unknown> = { fillStyle: "" };
    target.fillRect = vi.fn(
      (_x: number, _y: number, width: number, height: number) => {
        if (target.fillStyle === "#65d889" && height > 0)
          healthRatios.push(width / height);
      },
    );
    target.moveTo = vi.fn((x: number, y: number) => arrowPoints.push({ x, y }));
    target.arc = vi.fn((_x: number, _y: number, radius: number) =>
      impactRadii.push(radius),
    );
    const context = new Proxy(target, {
      get: (object, key) => (key in object ? object[key] : vi.fn()),
      set: (object, key, value) => {
        object[key] = value;
        if (key === "globalAlpha" && typeof value === "number")
          sceneAlphas.push(value);
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.append(container);
    let state = exploredAllV7(initialV7(1531));
    const attacker = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId,
    );
    const defender = state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId,
    );
    if (attacker === undefined || defender === undefined)
      throw new Error("units missing");
    state = checkedV7({
      ...state,
      units: [
        {
          ...attacker,
          role: "MARKSMAN",
          hp: 10,
          maxHp: 10,
          at: { x: 4, y: 4 },
        },
        {
          ...defender,
          role: "GUARD",
          hp: 1,
          maxHp: 15,
          at: { x: 5, y: 4 },
        },
      ],
    });
    const before = viewForV7(state, state.humanPlayerId);
    const attacked = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: defender.id,
    });
    if (!attacked.accepted) throw new Error(attacked.error.code);
    const after = viewForV7(attacked.state, state.humanPlayerId);
    const afterDefender = after.units.find((unit) => unit.id === defender.id);
    expect(afterDefender).toBeUndefined();
    const envelope = projectEventsV7(
      state,
      attacked.state,
      state.humanPlayerId,
      attacked.events,
    );
    const host = new CanvasBoardHostV7(document);
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    host.update({
      matchInstanceId: 1,
      view: after,
      offeredCommands: [],
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    healthRatios.length = 0;
    const presentation = host.presentBoundary(before, after, envelope);
    const projectile = takeFrame(frames);
    now = 1_000;
    projectile(now);
    expect(arrowPoints.length).toBeGreaterThanOrEqual(3);
    expect(new Set(arrowPoints.map((point) => point.y)).size).toBeGreaterThan(
      1,
    );
    const dyingHealthRatio = 48 / 15 / 5;
    expect(
      healthRatios.some(
        (ratio) => Math.abs(ratio - dyingHealthRatio) < 0.00001,
      ),
    ).toBe(true);
    await waitUntil(() => frames.size === 1);
    healthRatios.length = 0;
    const impact = takeFrame(frames);
    now = 1_047;
    impact(now);
    expect(impactRadii.some((radius) => radius > 20)).toBe(true);
    host.finishPresentations();
    await presentation;
    expect(
      healthRatios.some(
        (ratio) => Math.abs(ratio - dyingHealthRatio) < 0.00001,
      ),
    ).toBe(false);
    expect(healthRatios.length).toBeGreaterThanOrEqual(1);
    expect(healthRatios.every((ratio) => ratio === 48 / 5)).toBe(true);

    host.update({
      matchInstanceId: 1,
      view: after,
      offeredCommands: [],
      interactive: false,
      motion: "REDUCED",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    sceneAlphas.length = 0;
    const reduced = host.presentBoundary(before, after, envelope);
    const crossfade = takeFrame(frames);
    now = 1_117;
    crossfade(now);
    expect(sceneAlphas.some((alpha) => alpha > 0 && alpha < 1)).toBe(true);
    host.finishPresentations();
    await reduced;
    host.destroy();
  });
});

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

class RecordingBoardHost implements BoardHostV7 {
  readonly mount = vi.fn(
    (container: HTMLElement, callbacks: BoardHostCallbacksV7) => {
      this.container = container;
      this.callbacks = callbacks;
      container.append(document.createElement("canvas"));
    },
  );
  readonly update = vi.fn((model: BoardHostModelV7) => {
    void model;
  });
  readonly activate = vi.fn();
  readonly resetInspectionCycle = vi.fn();
  readonly zoom = vi.fn();
  readonly focus = vi.fn();
  readonly destroy = vi.fn();
  readonly finishPresentations = vi.fn();
  readonly presentBoundary = vi.fn(
    async (
      before: PlayerViewV7,
      after: PlayerViewV7,
      events: PlayerEventEnvelopeV7,
    ) => {
      void before;
      void after;
      void events;
    },
  );
  container: HTMLElement | null = null;
  callbacks: BoardHostCallbacksV7 | null = null;
}

class DeferredBoardHost extends RecordingBoardHost {
  #frame: number | null = null;
  #resolve: (() => void) | null = null;

  override readonly presentBoundary = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        this.#resolve = resolve;
        this.#frame = window.requestAnimationFrame(() => {});
      }),
  );

  override readonly finishPresentations = vi.fn(() => {
    if (this.#frame !== null) window.cancelAnimationFrame(this.#frame);
    this.#frame = null;
    this.#resolve?.();
    this.#resolve = null;
  });

  override readonly destroy = vi.fn(() => this.finishPresentations());
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

function takeFrame(
  frames: Map<number, FrameRequestCallback>,
): FrameRequestCallback {
  const entry = frames.entries().next().value as
    readonly [number, FrameRequestCallback] | undefined;
  if (entry === undefined) throw new Error("animation frame missing");
  frames.delete(entry[0]);
  return entry[1];
}

function pointerEvent(
  kind: string,
  pointerId: number,
  clientX: number,
  clientY: number,
): MouseEvent {
  const event = new MouseEvent(kind, { bubbles: true, clientX, clientY });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  Object.defineProperty(event, "pointerType", { value: "touch" });
  return event;
}
