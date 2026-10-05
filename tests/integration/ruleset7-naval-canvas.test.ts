// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostCallbacksV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import {
  NAVAL_UI_V7,
  navalBoardingUiFixtureV7,
  navalRamUiFixtureV7,
} from "../fixtures/v7-naval-ui";

// The naval branch interface (bead pulp_wars-5ti.7, first part): the
// keyboard path to an aimed Board on the real board host, and the plan it
// hands the renderer.

afterEach(() => vi.restoreAllMocks());

describe("Board on the board host", () => {
  it("steps through the prizes with Tab, names each without coordinates, and Enter boards", () => {
    const state = navalBoardingUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const boarder = unitAt(view, NAVAL_UI_V7.boarder);
    const callbacks = { onSelection: vi.fn(), onCommand: vi.fn() };
    const rig = hostRig(view, callbacks);
    const base = {
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interactive: true,
      motion: "REDUCED" as const,
      animationSpeed: "NORMAL" as const,
      presentationPaused: false,
      highContrast: false,
    };
    const selected = {
      selection: { kind: "UNIT" as const, unitId: boarder.id },
      selectedUnitId: boarder.id,
      selectedAchievement: null,
    };
    const tab = (shiftKey = false): boolean => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      rig.canvas.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const description = (): string =>
      document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? "";
    rig.host.update({
      ...base,
      interaction: {
        ...selected,
        navalPick: { kind: "BOARD", unitId: boarder.id },
      },
    });
    // The armed Board's two prizes are the only targets of the plan.
    expect(rig.plan().targets.map((target) => target.family)).toEqual([
      "BOARD",
      "BOARD",
    ]);
    for (const prize of NAVAL_UI_V7.prizes) {
      expect(tab(), `${prize.x}/${prize.y}`).toBe(true);
      expect(description()).toMatch(/^Board: capture this /);
      expect(description()).toContain("becomes yours with 4 HP");
      expect(description()).not.toMatch(/\b\d{1,2}, ?\d{1,2}\b/);
    }
    // Past the last prize Tab leaves the board; Shift+Tab steps back.
    expect(tab()).toBe(false);
    expect(tab(true)).toBe(true);
    rig.canvas.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(callbacks.onCommand.mock.calls[0]?.[0]).toMatchObject({
      family: "BOARD",
      command: {
        kind: "BOARD",
        unitId: boarder.id,
        targetUnitId: unitAt(view, NAVAL_UI_V7.prizes[0]).id,
      },
    });
    rig.host.destroy();
  });

  it("hands the renderer the ram's shove and the ship markers", () => {
    const state = navalRamUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
    const rammer = unitAt(view, NAVAL_UI_V7.rammer);
    const rig = hostRig(view);
    rig.host.update({
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interactive: true,
      motion: "REDUCED",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      interaction: {
        selection: { kind: "UNIT", unitId: rammer.id },
        selectedUnitId: rammer.id,
        selectedAchievement: null,
      },
    });
    const attack = rig
      .plan()
      .targets.find((target) => target.family === "ATTACK");
    expect(attack?.knockback).toEqual({
      to: NAVAL_UI_V7.shoveTo,
      blocked: false,
    });
    expect(attack?.previewNote).toBe("Bow Ram +1 · Shoves back");
    rig.host.destroy();
  });
});

function unitAt(view: PlayerViewV7, at: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("unit missing");
  return unit;
}

function hostRig(
  view: PlayerViewV7,
  callbacks: BoardHostCallbacksV7 = {
    onSelection: vi.fn(),
    onCommand: vi.fn(),
  },
) {
  let plan: renderer.BoardRenderPlanV7 = {
    version: 7,
    entries: [],
    targets: [],
  };
  let nextFrame = 1;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(
    () => nextFrame++,
  );
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => undefined,
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as CanvasRenderingContext2D,
  );
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    plan = input.plan;
  });
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
  const host = new CanvasBoardHostV7(document);
  host.mount(container, callbacks);
  const model: BoardHostModelV7 = {
    matchInstanceId: 1,
    view,
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
  };
  host.update(model);
  const canvas = container.querySelector<HTMLCanvasElement>(
    "canvas.board-canvas-v7",
  );
  if (canvas === null) throw new Error("Missing board canvas");
  return { host, canvas, plan: () => plan };
}
