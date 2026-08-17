// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canonicalHash,
  queryPlayerCommands,
  unitId,
  viewFor,
  type Command,
} from "../../src/engine/index";
import {
  CanvasBoardHost,
  boardAnimationNeeded,
  resolveInspectionActivation,
  spatialCommandAt,
  type BoardSelection,
} from "../../src/render/canvas/board-host";
import {
  fitCamera,
  projectGrid,
  worldToScreen,
} from "../../src/render/canvas/geometry";
import type { BoardAssetBindings } from "../../src/render/canvas/asset-bindings";
import { gameStateBuilder } from "../fixtures/builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 2,
  });
});

describe("Canvas board interaction boundary", () => {
  it("runs readiness animation only for interactive full-motion active-human attention", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const humanTurn = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
    };
    const view = viewFor(humanTurn, human.id);
    const model = {
      matchInstanceId: 1,
      view,
      interactive: true,
      motion: "FULL" as const,
      selected: null,
    };
    expect(boardAnimationNeeded(model)).toBe(true);
    expect(boardAnimationNeeded({ ...model, motion: "REDUCED" })).toBe(false);
    expect(boardAnimationNeeded({ ...model, interactive: false })).toBe(false);
    expect(
      boardAnimationNeeded({
        ...model,
        view: {
          ...view,
          units: view.units.map((unit) =>
            unit.ownerId === human.id
              ? {
                  ...unit,
                  activation: { ...unit.activation, handled: true },
                }
              : unit,
          ),
        },
      }),
    ).toBe(false);
    expect(
      boardAnimationNeeded({
        ...model,
        view: {
          ...view,
          activeSeatIndex: (view.activeSeatIndex + 1) % view.turnOrder.length,
        },
      }),
    ).toBe(false);
  });

  it("keeps one shared sprite phase across selection/remount/Promote and stops at handled boundaries", () => {
    let now = 100;
    vi.spyOn(window.performance, "now").mockImplementation(() => now);
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn(() => 1),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
    const alphaStack: number[] = [];
    const contextTarget: Record<PropertyKey, unknown> = { globalAlpha: 1 };
    const context = new Proxy(contextTarget, {
      get(target, property): unknown {
        if (property === "save")
          return (): void => {
            alphaStack.push(Number(target.globalAlpha ?? 1));
          };
        if (property === "restore")
          return (): void => {
            target.globalAlpha = alphaStack.pop() ?? 1;
          };
        if (property === "measureText") return () => ({ width: 20 });
        if (property in target) return target[property];
        return (): void => {};
      },
      set(target, property, value): boolean {
        target[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);

    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const humanTurn = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
    };
    const view = viewFor(humanTurn, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const sampled: Array<{ readonly id: number; readonly alpha: number }> = [];
    const assets = {
      drawGrass(): void {},
      drawMountain(): void {},
      drawOre(): void {},
      drawFruit(): void {},
      drawAnimal(): void {},
      drawMine(): void {},
      drawLumberMill(): void {},
      drawChocolateWall(): void {},
      drawForest(): void {},
      drawVillage(): void {},
      drawCityBack(): void {},
      drawCityFront(): void {},
      drawUnit(drawingContext, _options, drawnUnit): void {
        sampled.push({ id: drawnUnit.id, alpha: drawingContext.globalAlpha });
      },
      drawUnitOwnerCue(): void {},
    } satisfies BoardAssetBindings;
    const host = new CanvasBoardHost(document, assets);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    const callbacks = {
      onSelection(): void {},
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    };
    const sample = (): number => {
      const value = sampled.filter((entry) => entry.id === unit.id).at(-1);
      if (value === undefined) throw new Error("Unit raster was not drawn");
      return value.alpha;
    };
    host.mount(container, callbacks);
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      motion: "FULL",
      selected: null,
    });
    expect(sample()).toBe(1);

    now = 900;
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      motion: "FULL",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBe(0.62);

    now = 1_000;
    host.destroy();
    host.mount(container, callbacks);
    host.update({
      matchInstanceId: 1,
      view: { ...view, commandIndex: view.commandIndex + 1 },
      interactive: true,
      motion: "FULL",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBeLessThan(0.65);

    now = 1_100;
    const handledView = {
      ...view,
      commandIndex: view.commandIndex + 2,
      units: view.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: { ...candidate.activation, handled: true },
            }
          : candidate,
      ),
    };
    host.update({
      matchInstanceId: 1,
      view: handledView,
      interactive: true,
      motion: "FULL",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBe(1);

    now = 1_300;
    host.update({
      matchInstanceId: 1,
      view: { ...view, round: view.round + 1 },
      interactive: true,
      motion: "FULL",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBe(1);

    now = 2_100;
    host.update({
      matchInstanceId: 1,
      view: { ...view, round: view.round + 1 },
      interactive: true,
      motion: "REDUCED",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBe(1);
    host.destroy();

    now = 2_500;
    const reloadedHost = new CanvasBoardHost(document, assets);
    reloadedHost.mount(container, callbacks);
    reloadedHost.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      motion: "FULL",
      selected: { kind: "UNIT", unitId: unit.id },
    });
    expect(sample()).toBe(1);
    reloadedHost.destroy();
  });

  it("runs one bounded unit-selection jump without moving camera, picking, cues, or state", () => {
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
    const target: Record<PropertyKey, unknown> = { globalAlpha: 1 };
    const context = new Proxy(target, {
      get(current, property): unknown {
        if (property === "measureText") return () => ({ width: 20 });
        if (property in current) return current[property];
        return (): void => {};
      },
      set(current, property, value): boolean {
        current[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);

    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const base = viewFor(state, human.id);
    const unit = base.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const view = {
      ...base,
      units: base.units.map((candidate) => ({
        ...candidate,
        activation: { ...candidate.activation, handled: true },
      })),
    };
    const centers: Array<{ readonly x: number; readonly y: number }> = [];
    const cues: Array<{ readonly x: number; readonly y: number }> = [];
    const assets = {
      drawGrass(): void {},
      drawMountain(): void {},
      drawOre(): void {},
      drawFruit(): void {},
      drawAnimal(): void {},
      drawMine(): void {},
      drawLumberMill(): void {},
      drawChocolateWall(): void {},
      drawForest(): void {},
      drawVillage(): void {},
      drawCityBack(): void {},
      drawCityFront(): void {},
      drawUnit(_context, options, drawn): void {
        if (drawn.id === unit.id) centers.push(options.center);
      },
      drawUnitOwnerCue(_context, options, drawn): void {
        if (drawn.id === unit.id) cues.push(options.center);
      },
    } satisfies BoardAssetBindings;
    const host = new CanvasBoardHost(document, assets);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    let selected: BoardSelection | null = null;
    host.mount(container, {
      onSelection(value): void {
        selected = value;
      },
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    });
    host.update({
      matchInstanceId: 1,
      view,
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      selected,
    });
    const anchor = host.screenPoint(unit.at);
    const stateHash = canonicalHash(state);
    if (anchor === null) throw new Error("Missing unit anchor");

    host.select({ kind: "UNIT", unitId: unit.id });
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });
    expect(frames.size).toBe(1);
    expect(host.screenPoint(unit.at)).toEqual(anchor);
    expect(canonicalHash(state)).toBe(stateHash);

    const apexFrame = [...frames.entries()][0];
    if (apexFrame === undefined) throw new Error("Missing apex RAF");
    frames.delete(apexFrame[0]);
    now = 120;
    apexFrame[1](now);
    const zoom = fitCamera(view.board, { width: 1024, height: 592 }).zoom;
    expect(centers.at(-1)).toEqual({
      x: anchor.x,
      y: anchor.y - 12 * zoom,
    });
    expect(cues.at(-1)).toEqual(anchor);
    expect(host.screenPoint(unit.at)).toEqual(anchor);
    expect(frames.size).toBe(1);

    const settledFrame = [...frames.entries()][0];
    if (settledFrame === undefined) throw new Error("Missing settle RAF");
    frames.delete(settledFrame[0]);
    now = 240;
    settledFrame[1](now);
    expect(centers.at(-1)).toEqual(anchor);
    expect(cues.at(-1)).toEqual(anchor);
    expect(frames.size).toBe(0);
    expect(canonicalHash(state)).toBe(stateHash);

    const requestCount = vi.mocked(window.requestAnimationFrame).mock.calls
      .length;
    host.select({ kind: "UNIT", unitId: unit.id });
    expect(vi.mocked(window.requestAnimationFrame)).toHaveBeenCalledTimes(
      requestCount,
    );
    const secondUnit = {
      ...unit,
      id: unitId(unit.id + 10_000),
      at: { x: unit.at.x + 1, y: unit.at.y },
    };
    host.update({
      matchInstanceId: 1,
      view: { ...view, units: [...view.units, secondUnit] },
      interactive: false,
      motion: "FULL",
      animationSpeed: "NORMAL",
      selected,
    });
    host.select({ kind: "UNIT", unitId: secondUnit.id });
    expect(vi.mocked(window.requestAnimationFrame)).toHaveBeenCalledTimes(
      requestCount + 1,
    );
    expect(frames.size).toBe(1);
    host.destroy();
    expect(frames.size).toBe(0);
  });

  it("suppresses selection motion and RAF in Reduced motion", () => {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn(() => 1),
    });
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const view = viewFor(state, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, {
      onSelection(): void {},
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    });
    host.update({
      matchInstanceId: 1,
      view,
      interactive: false,
      motion: "REDUCED",
      selected: null,
    });
    host.select({ kind: "UNIT", unitId: unit.id });
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(
      boardAnimationNeeded(
        {
          matchInstanceId: 1,
          view,
          interactive: false,
          motion: "REDUCED",
          selected: { kind: "UNIT", unitId: unit.id },
        },
        true,
      ),
    ).toBe(false);
    host.destroy();
  });

  it.each([
    "mouse",
    "touch",
    "keyboard",
    "semantic-coordinate",
    "semantic-unit",
  ] as const)(
    "starts selection motion through the shared %s selection path",
    (channel) => {
      const request = vi.fn(() => 1);
      Object.defineProperty(window, "requestAnimationFrame", {
        configurable: true,
        value: request,
      });
      Object.defineProperty(window, "cancelAnimationFrame", {
        configurable: true,
        value: vi.fn(),
      });
      const context = new Proxy(
        { globalAlpha: 1 } as Record<PropertyKey, unknown>,
        {
          get(target, property): unknown {
            if (property === "measureText") return () => ({ width: 20 });
            if (property in target) return target[property];
            return (): void => {};
          },
          set(target, property, value): boolean {
            target[property] = value;
            return true;
          },
        },
      ) as unknown as CanvasRenderingContext2D;
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(
        context,
      );
      const state = gameStateBuilder();
      const human = state.players.find(
        (player) => player.controller === "HUMAN",
      );
      if (human === undefined) throw new Error("Missing human");
      const base = viewFor(state, human.id);
      const unit = base.units.find(
        (candidate) => candidate.ownerId === human.id,
      );
      if (unit === undefined) throw new Error("Missing unit");
      const view = {
        ...base,
        units: base.units.map((candidate) => ({
          ...candidate,
          activation: { ...candidate.activation, handled: true },
        })),
      };
      let selected: BoardSelection | null = null;
      const host = new CanvasBoardHost(document);
      const container = document.querySelector<HTMLElement>("#host");
      if (container === null) throw new Error("Missing host");
      host.mount(container, {
        onSelection(value): void {
          selected = value;
        },
        onInspect(): void {},
        onCommand(): void {},
        onZoom(): void {},
      });
      host.update({
        matchInstanceId: 1,
        view,
        interactive: false,
        motion: "FULL",
        selected,
      });
      const canvas = container.querySelector("canvas");
      const point = host.screenPoint(unit.at);
      if (canvas === null || point === null) throw new Error("Missing Canvas");

      if (channel === "mouse" || channel === "touch") {
        pointer(canvas, "pointerdown", 1, point.x, point.y, channel);
        pointer(canvas, "pointerup", 1, point.x, point.y, channel);
      } else if (channel === "keyboard") {
        key(canvas, "Enter");
      } else if (channel === "semantic-coordinate") {
        host.activate(unit.at);
      } else {
        host.select({ kind: "UNIT", unitId: unit.id });
      }

      expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });
      expect(request).toHaveBeenCalledTimes(1);
      host.destroy();
    },
  );

  it("cancels a pending selection jump across locks and lifecycle boundaries", () => {
    let nextFrame = 1;
    const frames = new Set<number>();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn(() => {
        const id = nextFrame;
        nextFrame += 1;
        frames.add(id);
        return id;
      }),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn((id: number) => frames.delete(id)),
    });
    const context = new Proxy(
      { globalAlpha: 1 } as Record<PropertyKey, unknown>,
      {
        get(target, property): unknown {
          if (property === "measureText") return () => ({ width: 20 });
          if (property in target) return target[property];
          return (): void => {};
        },
        set(target, property, value): boolean {
          target[property] = value;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const base = viewFor(state, human.id);
    const unit = base.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const view = {
      ...base,
      units: base.units.map((candidate) => ({
        ...candidate,
        activation: { ...candidate.activation, handled: true },
      })),
    };
    let selected: BoardSelection | null = null;
    const callbacks = {
      onSelection(value: BoardSelection | null): void {
        selected = value;
      },
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    };
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, callbacks);
    const update = (
      overrides: Partial<Parameters<CanvasBoardHost["update"]>[0]> = {},
    ): void =>
      host.update({
        matchInstanceId: 1,
        view,
        interactive: false,
        motion: "FULL",
        selected,
        ...overrides,
      });
    update();

    host.select({ kind: "UNIT", unitId: unit.id });
    expect(frames.size).toBe(1);
    update({ motion: "REDUCED" });
    expect(frames.size).toBe(0);

    update({ motion: "FULL", selected: null });
    selected = null;
    host.select({ kind: "UNIT", unitId: unit.id });
    expect(frames.size).toBe(1);
    host.mount(container, callbacks);
    update();
    expect(frames.size).toBe(0);

    update({ selected: null });
    selected = null;
    host.select({ kind: "UNIT", unitId: unit.id });
    expect(frames.size).toBe(1);
    update({
      view: {
        ...view,
        units: view.units.filter((candidate) => candidate.id !== unit.id),
      },
    });
    expect(frames.size).toBe(0);

    update({ selected: null });
    selected = null;
    host.select({ kind: "UNIT", unitId: unit.id });
    expect(frames.size).toBe(1);
    update({ matchInstanceId: 2 });
    expect(frames.size).toBe(0);
    host.destroy();
    expect(frames.size).toBe(0);
  });

  it("preserves camera for ordinary remounts and resets it for a new same-size match instance", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const view = viewFor(state, human.id);
    const capital = view.cities.find(
      (city) => city.ownerId === human.id && city.isCapital,
    );
    if (capital === undefined) throw new Error("Missing capital");
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    const callbacks = {
      onSelection(): void {},
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    };
    host.mount(container, callbacks);
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      selected: null,
    });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("Missing Canvas");
    const initialPoint = host.screenPoint(capital.at);
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -1,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }),
    );
    const zoomedPoint = host.screenPoint(capital.at);
    expect(zoomedPoint).not.toEqual(initialPoint);

    host.destroy();
    host.mount(container, callbacks);
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      selected: null,
    });
    expect(host.screenPoint(capital.at)).toEqual(zoomedPoint);

    host.update({
      matchInstanceId: 2,
      view,
      interactive: true,
      selected: null,
    });
    expect(host.screenPoint(capital.at)).toEqual(initialPoint);
  });

  it("executes a keyboard movement on its first activation and preserves camera state", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const humanTurn = {
      ...state,
      activeSeatIndex: state.turnOrder.findIndex((id) => id === human.id),
    };
    const view = viewFor(humanTurn, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const move = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      );
    if (move === undefined) throw new Error("Missing movement command");
    let selected: BoardSelection | null = null;
    const commands: Command[] = [];
    const inspected: BoardSelection[] = [];
    const zooms: string[] = [];
    const callbacks = {
      onSelection(selection: BoardSelection | null): void {
        selected = selection;
      },
      onInspect(selection: BoardSelection): void {
        inspected.push(selection);
      },
      onCommand(command: Command): void {
        commands.push(command);
      },
      onZoom(direction: "IN" | "OUT"): void {
        zooms.push(direction);
      },
    };
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, callbacks);
    host.update({ matchInstanceId: 1, view, interactive: true, selected });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("Missing Canvas");
    expect(canvas.width).toBe(2048);
    expect(canvas.height).toBe(1184);

    key(canvas, "Enter");
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });
    host.update({ matchInstanceId: 1, view, interactive: true, selected });
    moveCursor(canvas, unit.at, move.path.at(-1) ?? unit.at);
    key(canvas, " ");
    expect(commands).toEqual([move]);
    expect(inspected).toEqual([]);

    host.destroy();
    host.mount(container, callbacks);
    host.update({ matchInstanceId: 1, view, interactive: true, selected });
    const remounted = container.querySelector("canvas");
    if (remounted === null) throw new Error("Missing remounted Canvas");
    expect(commands).toEqual([move]);
    expect(inspected).toEqual([]);
    key(remounted, "Escape");
    expect(selected).toBeNull();

    remounted.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -1,
        clientX: 300,
        clientY: 200,
        bubbles: true,
      }),
    );
    expect(zooms).toContain("IN");
    expect(
      container.querySelector("#map-cursor-description")?.textContent,
    ).toContain("Map cursor");
  });

  it("cycles a city occupant unit-first and never commands while view-only", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const view = viewFor(state, human.id);
    let selected: BoardSelection | null = null;
    const inspected: BoardSelection[] = [];
    const commands: Command[] = [];
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, {
      onSelection(selection): void {
        selected = selection;
      },
      onInspect(selection): void {
        inspected.push(selection);
      },
      onCommand(command): void {
        commands.push(command);
      },
      onZoom(): void {},
    });
    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("Missing Canvas");
    key(canvas, "Enter");
    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    key(canvas, "Enter");
    expect(selected).toEqual({
      kind: "CITY",
      cityId: view.cities.find((city) =>
        view.units.some(
          (unit) =>
            unit.at.x === city.at.x &&
            unit.at.y === city.at.y &&
            unit.ownerId === human.id,
        ),
      )?.id,
    });
    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    key(canvas, "Enter");
    expect(selected).toEqual({
      kind: "UNIT",
      unitId: view.units.find((unit) => unit.ownerId === human.id)?.id,
    });
    expect(inspected).toEqual([]);
    expect(commands).toEqual([]);
    expect(canvas.getAttribute("aria-disabled")).toBe("true");
  });

  it("keeps a pending second activation across remounts and resets it on Escape, revision, match, and disappearance", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const view = viewFor(state, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    let selected: BoardSelection | null = null;
    const callbacks = {
      onSelection(selection: BoardSelection | null): void {
        selected = selection;
      },
      onInspect(): void {},
      onCommand(): void {},
      onZoom(): void {},
    };
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, callbacks);
    host.update({ matchInstanceId: 1, view, interactive: false, selected });

    host.activate(unit.at);
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });
    host.destroy();
    host.mount(container, callbacks);
    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    host.activate(unit.at);
    const city = view.cities.find(
      (candidate) =>
        candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
    );
    if (city === undefined) throw new Error("Missing colocated city");
    expect(selected).toEqual({ kind: "CITY", cityId: city.id });

    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("Missing Canvas");
    key(canvas, "Escape");
    host.activate(unit.at);
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });

    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    host.update({
      matchInstanceId: 1,
      view: { ...view, commandIndex: view.commandIndex + 1 },
      interactive: false,
      selected,
    });
    host.activate(unit.at);
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });

    host.update({ matchInstanceId: 1, view, interactive: false, selected });
    host.update({ matchInstanceId: 2, view, interactive: false, selected });
    host.activate(unit.at);
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });

    host.update({ matchInstanceId: 2, view, interactive: false, selected });
    host.update({
      matchInstanceId: 2,
      view: {
        ...view,
        units: view.units.filter((candidate) => candidate.id !== unit.id),
      },
      interactive: false,
      selected: null,
    });
    host.update({
      matchInstanceId: 2,
      view,
      interactive: false,
      selected: null,
    });
    host.activate(unit.at);
    expect(selected).toEqual({ kind: "UNIT", unitId: unit.id });
  });

  it("resolves friendly, enemy, plain-tile, and fog-safe inspection cycles from PlayerView only", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const base = viewFor(state, human.id);
    const friendly = base.units.find((unit) => unit.ownerId === human.id);
    const enemy = state.units.find((unit) => unit.ownerId !== human.id);
    const plain = base.board.tiles.find(
      (tile) =>
        tile.explored &&
        !base.cities.some(
          (city) => city.at.x === tile.at.x && city.at.y === tile.at.y,
        ),
    );
    if (friendly === undefined || enemy === undefined || plain === undefined)
      throw new Error("Missing cycle fixtures");
    const plainView = {
      ...base,
      units: base.units.map((unit) =>
        unit.id === friendly.id ? { ...unit, at: plain.at } : unit,
      ),
    };
    const first = resolveInspectionActivation(plainView, plain.at, null);
    expect(first.selection).toEqual({ kind: "UNIT", unitId: friendly.id });
    const second = resolveInspectionActivation(
      plainView,
      plain.at,
      first.cycle,
    );
    expect(second.selection).toEqual({ kind: "TILE", at: plain.at });
    expect(
      resolveInspectionActivation(plainView, plain.at, second.cycle).selection,
    ).toEqual({
      kind: "UNIT",
      unitId: friendly.id,
    });

    const enemyAt = plain.at;
    const enemyView = {
      ...base,
      units: [
        ...base.units.filter((unit) => unit.id !== enemy.id),
        { ...enemy, at: enemyAt },
      ],
    };
    expect(
      resolveInspectionActivation(enemyView, enemyAt, null).selection,
    ).toEqual({
      kind: "UNIT",
      unitId: enemy.id,
    });

    const hidden = base.board.tiles.find((tile) => !tile.explored);
    if (hidden === undefined) throw new Error("Missing hidden tile");
    expect(resolveInspectionActivation(base, hidden.at, null)).toEqual({
      selection: { kind: "TILE", at: hidden.at },
      cycle: null,
    });
  });

  it("keeps an exact offered attack ahead of enemy inspection cycling", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    const enemyPlayer = state.players.find(
      (player) => player.controller === "AI",
    );
    const attacker = state.units.find((unit) => unit.ownerId === human?.id);
    const enemy = state.units.find((unit) => unit.ownerId === enemyPlayer?.id);
    if (
      human === undefined ||
      enemyPlayer === undefined ||
      attacker === undefined ||
      enemy === undefined
    )
      throw new Error("Missing attack fixtures");
    const target = state.board.tiles.find(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - attacker.at.x),
          Math.abs(tile.at.y - attacker.at.y),
        ) === 1 &&
        !state.cities.some(
          (city) => city.at.x === tile.at.x && city.at.y === tile.at.y,
        ),
    );
    if (target === undefined) throw new Error("Missing attack target");
    const attackState = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === target.at.x && tile.at.y === target.at.y
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      units: state.units.map((unit) =>
        unit.id === enemy.id ? { ...unit, at: target.at } : unit,
      ),
    };
    const view = viewFor(attackState, human.id);
    const attack = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === attacker.id &&
          command.target.kind === "UNIT" &&
          command.target.unitId === enemy.id,
      );
    if (attack === undefined) throw new Error("Missing offered attack");
    let selected: BoardSelection | null = {
      kind: "UNIT",
      unitId: attacker.id,
    };
    const commands: Command[] = [];
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, {
      onSelection(selection): void {
        selected = selection;
      },
      onInspect(): void {},
      onCommand(command): void {
        commands.push(command);
      },
      onZoom(): void {},
    });
    host.update({ matchInstanceId: 1, view, interactive: true, selected });
    host.activate(target.at);

    expect(commands).toEqual([attack]);
    expect(selected).toEqual({ kind: "UNIT", unitId: attacker.id });
  });

  it("resolves only exact query-offered positional commands and keeps their canonical paths", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const active = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
    };
    const view = viewFor(active, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const move = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === unit.id,
      );
    if (move === undefined) throw new Error("Missing move");
    const destination = move.path.at(-1);
    if (destination === undefined) throw new Error("Missing destination");
    expect(spatialCommandAt(view, unit.id, destination)).toEqual(move);
    expect(spatialCommandAt(view, unit.id, unit.at)).toBeNull();
    expect(
      spatialCommandAt(
        {
          ...view,
          commandIndex: view.commandIndex + 1,
          outcome: { kind: "VICTORY", winnerId: human.id },
        },
        unit.id,
        destination,
      ),
    ).toBeNull();
  });

  it.each(["mouse", "touch"] as const)(
    "dispatches an offered Move on the first %s tap and ignores a drag",
    (pointerType) => {
      const state = gameStateBuilder();
      const human = state.players.find(
        (player) => player.controller === "HUMAN",
      );
      if (human === undefined) throw new Error("Missing human");
      const active = {
        ...state,
        activeSeatIndex: state.turnOrder.indexOf(human.id),
      };
      const view = viewFor(active, human.id);
      const unit = view.units.find(
        (candidate) => candidate.ownerId === human.id,
      );
      if (unit === undefined) throw new Error("Missing unit");
      const move = queryPlayerCommands(view)
        .map(({ command }) => command)
        .find(
          (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
            command.kind === "MOVE" && command.unitId === unit.id,
        );
      const destination = move?.path.at(-1);
      if (move === undefined || destination === undefined)
        throw new Error("Missing movement fixture");
      const commands: Command[] = [];
      const host = new CanvasBoardHost(document);
      const container = document.querySelector<HTMLElement>("#host");
      if (container === null) throw new Error("Missing host");
      host.mount(container, {
        onSelection(): void {},
        onInspect(): void {},
        onCommand(command): void {
          commands.push(command);
        },
        onZoom(): void {},
      });
      host.update({
        matchInstanceId: 1,
        view,
        interactive: true,
        selected: { kind: "UNIT", unitId: unit.id },
      });
      const canvas = container.querySelector("canvas");
      const point = host.screenPoint(destination);
      if (canvas === null || point === null) throw new Error("Missing Canvas");
      pointer(canvas, "pointerdown", 1, point.x, point.y, pointerType);
      pointer(canvas, "pointerup", 1, point.x, point.y, pointerType);
      expect(commands).toEqual([move]);

      pointer(canvas, "pointerdown", 2, point.x, point.y, pointerType);
      pointer(canvas, "pointermove", 2, point.x + 30, point.y, pointerType);
      pointer(canvas, "pointerup", 2, point.x + 30, point.y, pointerType);
      expect(commands).toEqual([move]);
    },
  );

  it("dispatches an exact Escape Move on one activation", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const active = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(human.id),
    };
    const base = viewFor(active, human.id);
    const unit = base.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const view = {
      ...base,
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              type: "RIDER" as const,
              activation: {
                ...candidate.activation,
                attacked: true,
                escapeAvailable: true,
                specialActed: false,
              },
            }
          : candidate,
      ),
    };
    const escape = queryPlayerCommands(view)
      .map(({ command }) => command)
      .find(
        (
          command,
        ): command is Extract<Command, { readonly kind: "ESCAPE_MOVE" }> =>
          command.kind === "ESCAPE_MOVE" && command.unitId === unit.id,
      );
    const destination = escape?.path.at(-1);
    if (escape === undefined || destination === undefined)
      throw new Error("Missing Escape Move");
    const commands: Command[] = [];
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, {
      onSelection(): void {},
      onInspect(): void {},
      onCommand(command): void {
        commands.push(command);
      },
      onZoom(): void {},
    });
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      selected: { kind: "UNIT", unitId: unit.id },
    });
    host.activate(destination);
    expect(commands).toEqual([escape]);
  });

  it("distinguishes pointer taps from drags and handles two-touch pinch zoom", () => {
    const state = gameStateBuilder();
    const human = state.players.find((player) => player.controller === "HUMAN");
    if (human === undefined) throw new Error("Missing human");
    const view = viewFor(state, human.id);
    const unit = view.units.find((candidate) => candidate.ownerId === human.id);
    if (unit === undefined) throw new Error("Missing unit");
    const selected: (BoardSelection | null)[] = [];
    const zooms: string[] = [];
    const host = new CanvasBoardHost(document);
    const container = document.querySelector<HTMLElement>("#host");
    if (container === null) throw new Error("Missing host");
    host.mount(container, {
      onSelection(selection): void {
        selected.push(selection);
      },
      onInspect(): void {},
      onCommand(): void {},
      onZoom(direction): void {
        zooms.push(direction);
      },
    });
    host.update({
      matchInstanceId: 1,
      view,
      interactive: true,
      selected: null,
    });
    const canvas = container.querySelector("canvas");
    if (canvas === null) throw new Error("Missing Canvas");
    const camera = fitCamera(view.board, { width: 1024, height: 592 });
    const center = worldToScreen(projectGrid(unit.at), camera);
    pointer(canvas, "pointerdown", 1, center.x, center.y, "mouse");
    pointer(canvas, "pointerup", 1, center.x, center.y, "mouse");
    expect(selected).toEqual([{ kind: "UNIT", unitId: unit.id }]);

    const city = view.cities.find(
      (candidate) =>
        candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
    );
    if (city === undefined) throw new Error("Missing colocated city");
    pointer(canvas, "pointerdown", 3, center.x, center.y, "touch");
    pointer(canvas, "pointerup", 3, center.x, center.y, "touch");
    expect(selected).toEqual([
      { kind: "UNIT", unitId: unit.id },
      { kind: "CITY", cityId: city.id },
    ]);

    pointer(canvas, "pointerdown", 2, center.x, center.y, "mouse");
    pointer(canvas, "pointermove", 2, center.x + 40, center.y + 20, "mouse");
    pointer(canvas, "pointerup", 2, center.x + 40, center.y + 20, "mouse");
    expect(selected).toHaveLength(2);

    pointer(canvas, "pointerdown", 10, 300, 220, "touch");
    pointer(canvas, "pointerdown", 11, 500, 220, "touch");
    pointer(canvas, "pointermove", 11, 560, 220, "touch");
    pointer(canvas, "pointerup", 11, 560, 220, "touch");
    pointer(canvas, "pointerup", 10, 300, 220, "touch");
    expect(zooms).toContain("IN");
    expect(selected).toHaveLength(2);
  });
});

function key(
  target: HTMLCanvasElement,
  keyValue: string,
  shiftKey = false,
): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: keyValue,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function moveCursor(
  canvas: HTMLCanvasElement,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0) {
    const keyValue =
      dx === dy
        ? dx > 0
          ? "ArrowDown"
          : "ArrowUp"
        : dx > 0
          ? "ArrowRight"
          : "ArrowLeft";
    key(canvas, keyValue, true);
  } else if (dx !== 0) {
    key(canvas, dx > 0 ? "ArrowRight" : "ArrowLeft");
  } else if (dy !== 0) {
    key(canvas, dy > 0 ? "ArrowDown" : "ArrowUp");
  }
}

function pointer(
  target: HTMLCanvasElement,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
  pointerType: "mouse" | "touch",
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}
