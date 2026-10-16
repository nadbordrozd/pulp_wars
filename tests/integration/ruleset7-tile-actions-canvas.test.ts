// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import * as badges from "../../src/render/canvas/tile-action-badges-v7";
import { tileActionPlanForSelectionV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  TILE_ACTIONS_UI_V7 as A,
  tileActionsHexerFixtureV7,
} from "../fixtures/v7-tile-actions-ui";

/**
 * Tile actions on the real board host (bead pulp_wars-2yc.60): the badges
 * are drawn over the board with the selected unit's actions, a tap or
 * Enter on a badged tile goes to the app with the tile's place on screen,
 * Tab stops on every badged tile, the cursor names each action without a
 * coordinate, and a tile without badges keeps its one-tap pick.
 */

afterEach(() => vi.restoreAllMocks());

function scene(state: GameStateV7, unitAt: CoordV7) {
  const view = viewForV7(state, state.humanPlayerId);
  const commands = queryPlayerCommandsV7(view);
  const unit = view.units.find(
    (candidate) => candidate.at.x === unitAt.x && candidate.at.y === unitAt.y,
  );
  if (unit === undefined) throw new Error("No unit there");
  const model: BoardHostModelV7 = {
    matchInstanceId: 1,
    view,
    offeredCommands: commands,
    interactive: true,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: { kind: "UNIT", unitId: unit.id },
      selectedUnitId: unit.id,
      selectedAchievement: null,
    },
    tileActions: tileActionPlanForSelectionV7(view, commands, unit.id),
  };
  return { view, model };
}

function hostRig(model: BoardHostModelV7) {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => {},
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as CanvasRenderingContext2D,
  );
  vi.spyOn(renderer, "drawBoardV7").mockImplementation(() => {});
  const drawn = vi
    .spyOn(badges, "drawTileActionBadgesV7")
    .mockImplementation(() => {});
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
  });
  const callbacks = {
    onSelection: vi.fn(),
    onCommand: vi.fn(),
    onTileActions: vi.fn(),
  };
  const host = new CanvasBoardHostV7(document);
  host.mount(container, callbacks);
  host.update(model);
  const canvas = container.querySelector<HTMLCanvasElement>(
    "canvas.board-canvas-v7",
  );
  if (canvas === null) throw new Error("Missing board canvas");
  return {
    host,
    canvas,
    callbacks,
    drawn,
    description: (): string =>
      container.querySelector("p.sr-only")?.textContent ?? "",
  };
}

const key = (canvas: HTMLCanvasElement, name: string): boolean => {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  canvas.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("tile actions on the board host", () => {
  it("draws the selected unit's badges over the board", () => {
    const { model } = scene(tileActionsHexerFixtureV7(), A.hexer);
    const rig = hostRig(model);
    rig.host.activate(A.hexer);
    expect(rig.drawn).toHaveBeenCalled();
    expect(rig.drawn.mock.calls.at(-1)?.[1]).toBe(model.tileActions);
    rig.host.destroy();
  });

  it("hands a badged tile's tap to the app with its place on screen", () => {
    const { model } = scene(tileActionsHexerFixtureV7(), A.hexer);
    const rig = hostRig(model);
    rig.host.activate(A.hexed);
    expect(rig.callbacks.onTileActions).toHaveBeenCalledTimes(1);
    const [where, anchor] = rig.callbacks.onTileActions.mock.calls[0] ?? [];
    expect(where).toEqual(A.hexed);
    expect(anchor).toMatchObject({
      size: expect.any(Number),
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(rig.callbacks.onCommand).not.toHaveBeenCalled();
    rig.host.destroy();
  });

  it("keeps a plain Move's one tap", () => {
    const { model, view } = scene(tileActionsHexerFixtureV7(), A.hexer);
    const rig = hostRig(model);
    const plan = renderer.buildBoardRenderPlanV7(
      view,
      model.offeredCommands,
      model.interaction,
    );
    const moveTile = plan.targets.find(
      (target) =>
        target.family === "MOVE" &&
        model.tileActions?.tiles.every(
          (tile) => tile.at.x !== target.at.x || tile.at.y !== target.at.y,
        ),
    );
    if (moveTile === undefined) throw new Error("No plain Move");
    rig.host.activate(moveTile.at);
    expect(rig.callbacks.onTileActions).not.toHaveBeenCalled();
    expect(rig.callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(rig.callbacks.onCommand.mock.calls[0]?.[0]).toMatchObject({
      family: "MOVE",
    });
    rig.host.destroy();
  });

  it("stops Tab on a badged tile, names its actions, and opens it with Enter", () => {
    const { model } = scene(tileActionsHexerFixtureV7(), A.hexer);
    const rig = hostRig(model);
    const stops: string[] = [];
    while (key(rig.canvas, "Tab")) stops.push(rig.description());
    const hexed = stops.find((words) => words.includes("Ribbit"));
    expect(hexed).toBeDefined();
    expect(hexed).toContain("Available: Attack");
    for (const words of stops) expect(words).not.toMatch(/\d+, ?\d+/);
    // Back to the hexed Knight, and Enter opens its actions.
    rig.host.activate(A.hexed);
    rig.callbacks.onTileActions.mockClear();
    key(rig.canvas, "Enter");
    expect(rig.callbacks.onTileActions).toHaveBeenCalledTimes(1);
    rig.host.destroy();
  });

  it("does nothing new while the board does not take input", () => {
    const { model } = scene(tileActionsHexerFixtureV7(), A.hexer);
    const rig = hostRig({ ...model, interactive: false });
    rig.host.activate(A.hexed);
    expect(rig.callbacks.onTileActions).not.toHaveBeenCalled();
    rig.host.destroy();
  });
});
