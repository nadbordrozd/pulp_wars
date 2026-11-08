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
  FROZEN_UI_V7,
  frozenShipUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";
import {
  NAVAL_UI_V7,
  navalBoardingUiFixtureV7,
  navalRamUiFixtureV7,
} from "../fixtures/v7-naval-ui";

// The naval branch interface (bead pulp_wars-5ti.7, first part): a Board on
// the real board host, and the plan it hands the renderer. One tile, one
// meaning (`pulp_wars-3u8d`, 7r131): the Board is the selected ship's
// Attack mark on a prize, so nothing is armed.

afterEach(() => vi.restoreAllMocks());

describe("Board on the board host", () => {
  it("marks each prize as an Attack that boards, named without coordinates", () => {
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
    rig.host.update({ ...base, interaction: selected });
    // Each prize is an Attack target whose preview is the capture.
    for (const prize of NAVAL_UI_V7.prizes) {
      const target = rig
        .plan()
        .targets.find(
          (candidate) =>
            candidate.at.x === prize.x && candidate.at.y === prize.y,
        );
      expect(target, `${prize.x}/${prize.y}`).toMatchObject({
        family: "ATTACK",
        previewLabel: "Board: captures the ship",
        command: {
          kind: "ATTACK",
          unitId: boarder.id,
          targetUnitId: unitAt(view, prize).id,
        },
      });
      expect(target?.semanticLabel).toContain("becomes yours with 4 HP");
      expect(target?.semanticLabel).not.toMatch(/\b\d{1,2}, ?\d{1,2}\b/);
    }
    expect(callbacks.onCommand).not.toHaveBeenCalled();
    rig.host.destroy();
  });

  it("describes an ice tile under the cursor without coordinates", () => {
    const state = frozenShipUiFixtureV7();
    const view = viewForV7(state, state.humanPlayerId);
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
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    });
    rig.host.activate(FROZEN_UI_V7.permanent);
    const description =
      document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? "";
    // The frozen sea redesign (`pulp_wars-5ti.25`): ice is permanent; the
    // viewer's Glacier makes it thick.
    expect(description).toContain("Thick: two Cracks break it.");
    expect(description).not.toMatch(/\b\d{1,2}, ?\d{1,2}\b/);
    // The plan the renderer gets carries the ice cells.
    expect(
      rig.plan().entries.filter((entry) => entry.seaIce !== undefined),
    ).toHaveLength(view.ice.length);
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
