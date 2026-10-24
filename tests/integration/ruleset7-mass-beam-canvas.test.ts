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
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import type { MartianPickV7 } from "../../src/render/canvas/martian-board-plan-v7";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

/**
 * `pulp_wars-8vmy`: the keyboard reaches a Mass Beam Down's passengers as
 * it reaches every board target: Tab steps through the units it may take
 * and the landing tiles in reading order, the cursor line names each, and
 * Enter takes the focused unit or leaves it behind.
 */
const MOTHERSHIP = at(2, 2);
const GRUNTS = [at(1, 1), at(2, 1), at(3, 1)] as const;
const GUNNER = at(2, 4);

const own = (role: MartianPieceV7["role"], where: CoordV7): MartianPieceV7 => ({
  seat: 0,
  role,
  at: where,
});

afterEach(() => vi.restoreAllMocks());

function hostRig() {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
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
  vi.spyOn(renderer, "drawBoardV7").mockImplementation(() => {});
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
  const callbacks = { onSelection: vi.fn(), onCommand: vi.fn() };
  const host = new CanvasBoardHostV7(document);
  host.mount(container, callbacks);
  const canvas = container.querySelector<HTMLCanvasElement>(
    "canvas.board-canvas-v7",
  );
  if (canvas === null) throw new Error("Missing board canvas");
  return {
    host,
    canvas,
    callbacks,
    description: (): string =>
      container.querySelector("p.sr-only")?.textContent ?? "",
  };
}

function model(view: PlayerViewV7, pick: MartianPickV7): BoardHostModelV7 {
  return {
    matchInstanceId: 1,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    interactive: true,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: { kind: "UNIT", unitId: pick.unitId },
      selectedUnitId: pick.unitId,
      selectedAchievement: null,
      martianPick: pick,
    },
  };
}

describe("Mass Beam Down passengers on the keyboard", () => {
  it("tabs to each unit it may take, names it, and toggles it with Enter", () => {
    const state = martianFieldV7([
      own("KNIGHT", MOTHERSHIP),
      ...GRUNTS.map((where) => own("FIGHTER", where)),
      own("MARKSMAN", GUNNER),
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const unitAt = (where: CoordV7) =>
      view.units.find((unit) => unit.at.x === where.x && unit.at.y === where.y);
    const mothership = unitAt(MOTHERSHIP);
    if (mothership === undefined) throw new Error("no Mothership");
    const rig = hostRig();
    rig.host.update(
      model(view, {
        kind: "MASS_BEAM_DOWN",
        unitId: mothership.id,
        chosen: null,
      }),
    );
    const key = (name: string): void => {
      rig.canvas.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: name,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    // Reading order: the top row's tiles and Grunts come first; Tab until
    // the first Grunt is focused.
    let steps = 0;
    while (!rig.description().includes("Beaming the Grunt") && steps < 40) {
      key("Tab");
      steps += 1;
    }
    expect(rig.description()).toMatch(
      /^Beaming the Grunt, (\d+) of \1 HP\. Choose again to leave it behind\./,
    );
    expect(rig.description()).not.toMatch(/\d+, ?\d+/);
    key("Enter");
    expect(rig.callbacks.onCommand).toHaveBeenCalledTimes(1);
    expect(rig.callbacks.onCommand.mock.calls[0]?.[0]).toMatchObject({
      family: "MASS_BEAM_DOWN_PASSENGER",
      at: GRUNTS[0],
      command: {
        kind: "MASS_BEAM_DOWN",
        unitId: mothership.id,
        passengerUnitIds: [unitAt(GRUNTS[0])?.id],
      },
    });
    // The Ray Gunner is a stop too, and says why it stays behind.
    while (!rig.description().includes("Ray Gunner") && steps < 80) {
      key("Tab");
      steps += 1;
    }
    expect(rig.description()).toContain(
      "stays behind. Up to 3 units: leave one behind first",
    );
    rig.host.destroy();
  });
});
