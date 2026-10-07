// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import {
  drawFirstStepMarkerV7,
  firstStepMarkerWidthCssPxV7,
} from "../../src/render/canvas/feedback-canvas-v7";
import {
  FIRST_STEP_HOP_AMPLITUDE_CSS_PX_V7,
  FIRST_STEP_HOP_MS_V7,
  FIRST_STEP_HOP_PERIOD_MS_V7,
  firstStepHopCssPxV7,
} from "../../src/render/canvas/feedback-motion-v7";
import { TILE_WIDTH, projectGrid } from "../../src/render/canvas/geometry";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  FIRST_STEPS_STORAGE_KEY_V7,
  parseFirstStepsProgressV7,
  type FirstStepMarkerV7,
} from "../../src/render/first-steps-v7";
import type { StorageAdapter } from "../../src/persistence/index";
import { replaceTileV7 } from "../fixtures/v7-builders";
import {
  FixtureController,
  RecordingBoardHost,
  boardPlan,
  requiredButton,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";

/**
 * First steps in the interface and on the board (bead pulp_wars-2yc.39,
 * docs/ui/SCREEN_FLOW.md "First steps"): one coach line with a small
 * dismiss, one marker or one pulsing HUD button, the record of this browser
 * profile, the Hints toggle, and the marker the real board host draws.
 *
 * The arena: the viewer's capital at (8, 8), its land x 7-9, y 7-9.
 */
const CAPITAL: CoordV7 = { x: 8, y: 8 };
const BESIDE: CoordV7 = { x: 8, y: 7 };
const FRUIT: CoordV7 = { x: 7, y: 7 };
const COORDINATE = /\(\s*\d+\s*,\s*\d+\s*\)|\b\d+\s*,\s*\d+\b/;

function match(
  options: { readonly unit?: boolean; readonly coins?: number } = {},
): GameStateV7 {
  const state = martianUiFieldV7(
    options.unit === false ? [] : [{ seat: 0, role: "FIGHTER", at: BESIDE }],
    {
      factions: ["ORIGINAL", "UNDEAD"],
      techs: { 0: [], 1: [] },
      coins: options.coins ?? 20,
    },
  );
  return replaceTileV7(state, FRUIT, { resource: "FRUIT" });
}

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function open(state: GameStateV7, storage: StorageAdapter | null = null) {
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

const line = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-v7-region="first-step"]');
const lineText = (): string | null =>
  document.querySelector(".v7-first-step-text")?.textContent ?? null;
const stored = (storage: MemoryStorage) =>
  parseFirstStepsProgressV7(storage.getItem(FIRST_STEPS_STORAGE_KEY_V7));
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 8; turn += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("first steps in the interface", () => {
  it("shows one coach line and one board marker for the next useful thing", () => {
    const { host, app } = open(match());
    const cue = line();
    expect(cue).not.toBeNull();
    expect(document.querySelectorAll(".v7-first-step")).toHaveLength(1);
    expect(cue?.dataset.firstStep).toBe("train");
    expect(cue?.getAttribute("role")).toBe("status");
    expect(lineText()).toBe("Tap your city to train a unit");
    expect(host.lastModel?.firstStepMarker).toEqual({
      kind: "CITY",
      at: CAPITAL,
      motion: "HOP",
    });
    // Neither HUD button is pointed at while the board marker is.
    expect(requiredButton("tech").dataset.firstStep).toBeUndefined();
    expect(requiredButton("end-turn").dataset.firstStep).toBeUndefined();
    // The line is no dialog and takes no click of its own: only its small
    // dismiss is a control, and nothing dims or blocks the board.
    expect(cue?.getAttribute("aria-modal")).toBeNull();
    expect(cue?.onclick).toBeNull();
    expect(cue?.querySelectorAll("button")).toHaveLength(1);
    expect(document.querySelector(".v7-scrim")).toBeNull();
    expect(host.lastModel?.interactive).toBe(true);
    expect(cue?.textContent).not.toMatch(COORDINATE);
    expect(
      requiredButton("first-step-dismiss").getAttribute("aria-label"),
    ).toBe("Dismiss hint");
    app.destroy();
  });

  it("follows the selection: the Train list, then a unit's Move tiles", () => {
    const { controller, host, app } = open(match());
    const view = controller.snapshot().view;
    const city = view?.cities.find((item) => item.ownerId === view.viewer.id);
    const unit = view?.units.find((item) => item.ownerId === view.viewer.id);
    if (city === undefined || unit === undefined) throw new Error("fixture");
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    expect(lineText()).toBe("Pick a unit to train");
    expect(host.lastModel?.firstStepMarker).toBeNull();
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    expect(lineText()).toBe("Pick a highlighted tile to move");
    expect(host.lastModel?.firstStepMarker).toBeNull();
    host.callbacks?.onSelection(null);
    expect(lineText()).toBe("Tap your city to train a unit");
    app.destroy();
  });

  it("counts what the player does in the browser profile, and retires a step", async () => {
    const storage = new MemoryStorage();
    const { controller, host, app } = open(match(), storage);
    const view = controller.snapshot().view;
    const city = view?.cities.find((item) => item.ownerId === view.viewer.id);
    if (city === undefined) throw new Error("fixture");
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    requiredButton("command-train").click();
    await waitUntil(() => controller.accepted.length === 1);
    await settle();
    expect(controller.accepted[0]?.kind).toBe("TRAIN");
    expect(stored(storage).done.TRAIN).toBe(1);
    // The record is this profile's, not the save's: a new view reads it.
    app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const again = open(match(), storage);
    expect(lineText()).toBe("Tap your city to train a unit");
    // Dismissing the line retires its step for good; the next step shows.
    requiredButton("first-step-dismiss").click();
    expect(stored(storage).done.TRAIN).toBe(2);
    expect(line()?.dataset.firstStep).toBe("move");
    expect(lineText()).toBe("Tap a ringed unit to move it");
    again.app.destroy();
  });

  it("says a unit is out of moves once its command leaves it without a Move", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const storage = new MemoryStorage();
    const { controller, host, app } = open(match(), storage);
    const snapshot = controller.snapshot();
    const unit = snapshot.view?.units.find(
      (item) => item.ownerId === snapshot.view?.viewer.id,
    );
    if (unit === undefined) throw new Error("fixture");
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
    const move = boardPlan(host).targets.find(
      (target) => target.family === "MOVE",
    );
    if (move === undefined) throw new Error("fixture");
    host.callbacks?.onCommand(move);
    await vi.waitFor(() => expect(controller.accepted).toHaveLength(1));
    await vi.waitFor(() => expect(line()?.dataset.firstStep).toBe("unit_done"));
    expect(lineText()).toBe("No bright ring: this unit has moved");
    expect(host.lastModel?.firstStepMarker).toBeNull();
    expect(stored(storage).done.MOVE).toBe(1);
    expect(stored(storage).done.UNIT_DONE).toBe(1);
    // It goes away by itself after a few seconds, for the next step.
    await vi.advanceTimersByTimeAsync(6_100);
    expect(line()?.dataset.firstStep).not.toBe("unit_done");
    app.destroy();
  });

  it("pulses the Tech button for the free first technology, naming the resource it unlocks", () => {
    const storage = new MemoryStorage();
    const { host, app } = open(match({ unit: false }), storage);
    requiredButton("first-step-dismiss").click();
    expect(line()?.dataset.firstStep).toBe("research");
    expect(lineText()).toBe("Research Gathering to harvest your fruit");
    expect(requiredButton("tech").dataset.firstStep).toBe("pulse");
    expect(requiredButton("end-turn").dataset.firstStep).toBeUndefined();
    expect(host.lastModel?.firstStepMarker).toBeNull();
    // While the technology screen is open the coach is silent.
    requiredButton("tech").click();
    expect(line()).toBeNull();
    requiredButton("close-overlay").click();
    expect(line()?.dataset.firstStep).toBe("research");
    app.destroy();
  });

  it("emphasises End turn when nothing useful is left", () => {
    const state = martianUiFieldV7([], {
      factions: ["ORIGINAL", "UNDEAD"],
      techs: { 0: ["GATHERING"], 1: [] },
      coins: 0,
    });
    const { app } = open(state);
    expect(lineText()).toBe("All done: end your turn");
    expect(requiredButton("end-turn").dataset.firstStep).toBe("pulse");
    expect(requiredButton("tech").dataset.firstStep).toBeUndefined();
    app.destroy();
  });

  it("stands still in reduced motion: a still marker and a still ring", () => {
    const { host, app } = open(match({ unit: false }));
    requiredButton("compact-menu").click();
    requiredButton("settings").click();
    const motion = requiredElement<HTMLSelectElement>("#v7-motion");
    motion.value = "REDUCED";
    motion.dispatchEvent(new Event("change", { bubbles: true }));
    requiredButton("close-overlay").click();
    expect(requiredElement<HTMLElement>(".v7-app-shell").dataset.motion).toBe(
      "reduced",
    );
    expect(host.lastModel?.firstStepMarker).toEqual({
      kind: "CITY",
      at: CAPITAL,
      motion: "STILL",
    });
    requiredButton("first-step-dismiss").click();
    expect(requiredButton("tech").dataset.firstStep).toBe("still");
    app.destroy();
  });

  it("Settings has a Hints toggle: off silences the coach, on starts it over", () => {
    const storage = new MemoryStorage();
    const { host, app } = open(match(), storage);
    requiredButton("first-step-dismiss").click();
    expect(stored(storage).done.TRAIN).toBe(2);
    requiredButton("compact-menu").click();
    requiredButton("settings").click();
    const hints = requiredButton("hints");
    expect(hints.textContent).toBe("Hints: on");
    expect(hints.getAttribute("aria-pressed")).toBe("true");
    hints.click();
    expect(requiredButton("hints").textContent).toBe("Hints: off");
    expect(requiredButton("hints").getAttribute("aria-pressed")).toBe("false");
    expect(stored(storage).enabled).toBe(false);
    requiredButton("close-overlay").click();
    expect(line()).toBeNull();
    expect(host.lastModel?.firstStepMarker).toBeNull();
    expect(requiredButton("tech").dataset.firstStep).toBeUndefined();
    // On again: from the first step, with nothing learnt.
    requiredButton("compact-menu").click();
    requiredButton("settings").click();
    requiredButton("hints").click();
    expect(stored(storage)).toMatchObject({ enabled: true, turns: 0 });
    expect(stored(storage).done.TRAIN).toBe(0);
    requiredButton("close-overlay").click();
    expect(lineText()).toBe("Tap your city to train a unit");
    app.destroy();
  });

  it("stays out of the way of a profile that has learnt the steps", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      FIRST_STEPS_STORAGE_KEY_V7,
      JSON.stringify({
        version: 1,
        enabled: true,
        done: { TRAIN: 2, MOVE: 2, RESEARCH: 2, RESOURCE: 2, END_TURN: 3 },
        turns: 4,
      }),
    );
    const { host, app } = open(match(), storage);
    expect(line()).toBeNull();
    expect(host.lastModel?.firstStepMarker).toBeNull();
    app.destroy();
  });
});

describe("the first-steps marker on the board", () => {
  const state = match();
  const view = viewForV7(state, state.humanPlayerId);

  function mountHost(marker: FirstStepMarkerV7 | null) {
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
    host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
    const model = (
      patch: Partial<BoardHostModelV7> = {},
    ): BoardHostModelV7 => ({
      matchInstanceId: 1,
      view,
      offeredCommands: queryPlayerCommandsV7(view),
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: true,
      motion: "FULL",
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      firstStepMarker: marker,
      ...patch,
    });
    host.update(model());
    const canvas = requiredElement<HTMLCanvasElement>("canvas");
    return { host, model, canvas };
  }

  /** A 2D context that records what is filled, and in which colour. */
  function recordingContext() {
    const fills: { colour: string; points: [number, number][] }[] = [];
    let path: [number, number][] = [];
    const context = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineJoin: "miter",
      save: () => undefined,
      restore: () => undefined,
      beginPath: () => {
        path = [];
      },
      moveTo: (x: number, y: number) => path.push([x, y]),
      lineTo: (x: number, y: number) => path.push([x, y]),
      closePath: () => undefined,
      fill: () =>
        fills.push({ colour: String(context.fillStyle), points: [...path] }),
      stroke: () => undefined,
    };
    return {
      context: context as unknown as CanvasRenderingContext2D,
      fills,
    };
  }

  it("hops over the city in full motion and keeps the board's loop running", () => {
    const { host, canvas } = mountHost({
      kind: "CITY",
      at: CAPITAL,
      motion: "HOP",
    });
    expect(canvas.dataset.firstStepMarker).toBe("city");
    expect(canvas.dataset.firstStepMotion).toBe("hop");
    expect(host.feedback.wantsAmbientFrames()).toBe(true);
    // One hop per loop, then rest: never below the resting place.
    const offsets = Array.from({ length: 23 }, (_, index) =>
      firstStepHopCssPxV7(index * 50, false),
    );
    expect(offsets[0]).toBe(0);
    expect(Math.min(...offsets)).toBeLessThan(
      -FIRST_STEP_HOP_AMPLITUDE_CSS_PX_V7 * 0.8,
    );
    expect(Math.max(...offsets)).toBeLessThanOrEqual(0);
    expect(firstStepHopCssPxV7(FIRST_STEP_HOP_MS_V7 + 100, false)).toBe(0);
    expect(firstStepHopCssPxV7(FIRST_STEP_HOP_PERIOD_MS_V7 + 100, false)).toBe(
      firstStepHopCssPxV7(100, false),
    );
    const frame = host.feedback.firstStepMarkerFrame(150);
    expect(frame).toMatchObject({ kind: "CITY", at: CAPITAL });
    expect(frame?.hopCssPx).toBeLessThan(0);
    host.destroy();
  });

  it("is a still marker in reduced motion", () => {
    const { host, model, canvas } = mountHost({
      kind: "TILE",
      at: FRUIT,
      motion: "STILL",
    });
    expect(canvas.dataset.firstStepMarker).toBe("tile");
    expect(canvas.dataset.firstStepMotion).toBe("still");
    expect(host.feedback.wantsAmbientFrames()).toBe(false);
    expect(host.feedback.firstStepMarkerFrame(150)).toEqual({
      kind: "TILE",
      at: FRUIT,
      hopCssPx: 0,
    });
    // The Motion setting wins over a marker asked to hop.
    host.update(
      model({
        motion: "REDUCED",
        firstStepMarker: { kind: "TILE", at: FRUIT, motion: "HOP" },
      }),
    );
    expect(canvas.dataset.firstStepMotion).toBe("still");
    expect(host.feedback.firstStepMarkerFrame(150)?.hopCssPx).toBe(0);
    expect(firstStepHopCssPxV7(150, true)).toBe(0);
    host.destroy();
  });

  it("is not drawn while the board takes no input, or with no marker", () => {
    const { host, model, canvas } = mountHost({
      kind: "CITY",
      at: CAPITAL,
      motion: "HOP",
    });
    host.update(model({ interactive: false }));
    expect(canvas.dataset.firstStepMarker).toBeUndefined();
    expect(host.feedback.firstStepMarkerFrame()).toBeNull();
    expect(host.feedback.wantsAmbientFrames()).toBe(false);
    host.update(model({ firstStepMarker: null }));
    expect(canvas.dataset.firstStepMarker).toBeUndefined();
    expect(host.feedback.firstStepMarkerFrame()).toBeNull();
    host.destroy();
  });

  it("draws a yellow arrow on a hard shadow, pointing down at the tile", () => {
    const { host } = mountHost({ kind: "CITY", at: CAPITAL, motion: "STILL" });
    const { context, fills } = recordingContext();
    const camera = { offsetX: 40, offsetY: 20, zoom: 1 };
    host.feedback.drawAbove(context, camera, () => null);
    // The shadow first, then the plate.
    expect(fills.map((fill) => fill.colour)).toEqual(["#1a1410", "#ffcf3a"]);
    const plate = fills[1]?.points ?? [];
    const centre = projectGrid(CAPITAL);
    const tip = plate[0];
    expect(tip?.[0]).toBeCloseTo(camera.offsetX + centre.x);
    // The tip is above the tile's centre and inside the tile.
    expect(tip?.[1]).toBeLessThan(camera.offsetY + centre.y);
    expect(tip?.[1]).toBeGreaterThan(camera.offsetY + centre.y - TILE_WIDTH);
    // Every other point is above the tip: the arrow points down.
    for (const [, y] of plate.slice(1)) expect(y).toBeLessThan(tip?.[1] ?? 0);
    const xs = plate.map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      firstStepMarkerWidthCssPxV7(1),
    );
    host.destroy();
  });

  it("keeps a readable size zoomed out, and is black on white in high contrast", () => {
    expect(firstStepMarkerWidthCssPxV7(1)).toBe(46);
    expect(firstStepMarkerWidthCssPxV7(0.2)).toBe(26);
    const { context, fills } = recordingContext();
    drawFirstStepMarkerV7(context, 100, 100, 1, { highContrast: true });
    expect(fills.map((fill) => fill.colour)).toEqual(["#000000", "#ffffff"]);
  });
});
