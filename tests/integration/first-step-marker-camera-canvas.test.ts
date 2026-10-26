// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { viewForV7, type CoordV7 } from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import type { FirstStepMarkerV7 } from "../../src/render/first-steps-v7";
import { TUTORIAL_PLACES_V7 } from "../../src/render/tutorial-v7";
import { tutorialFixtureV7 } from "../fixtures/v7-tutorial-ui";

/**
 * Bead pulp_wars-2yc.115: when the coach's or the tutorial's marker comes up
 * on a new tile, the real board host pans the camera, at the same zoom, so
 * the tile (and the marker's `frame`, a tutorial step's scene) shows on the
 * screen; once per marker, so the player's own pan is never fought.
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const WIDTH = 390;
const HEIGHT = 600;

function setUp(zoomSteps: number) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const target: Record<PropertyKey, unknown> = {};
  const context = new Proxy(target, {
    get: (object, key) => (key in object ? object[key] : () => undefined),
    set: (object, key, value) => {
      object[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({
      width: WIDTH,
      height: HEIGHT,
      left: 0,
      top: 0,
      right: WIDTH,
      bottom: HEIGHT,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  const { state } = tutorialFixtureV7("RALLY");
  const model = (marker: FirstStepMarkerV7 | null): BoardHostModelV7 => ({
    matchInstanceId: 1,
    view: viewForV7(state, state.humanPlayerId),
    offeredCommands: [],
    interactive: true,
    motion: "REDUCED",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    firstStepMarker: marker,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  host.update(model(null));
  // Zoomed in, so the board is wider than the screen.
  for (let step = 0; step < zoomSteps; step += 1) host.zoom("IN");
  return { host, model };
}

const onScreen = (host: CanvasBoardHostV7, at: CoordV7): boolean => {
  const { x, y } = host.cellCentreCssPx(at);
  return x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT;
};

describe("the camera and the first-step marker", () => {
  it("brings a marker's tile on screen when it comes up, once", () => {
    const { host, model } = setUp(2);
    const far: CoordV7 = { x: 10, y: 0 };
    const near: CoordV7 = { x: 0, y: 10 };
    // Put the camera on one corner, then mark the other.
    host.update(model({ kind: "TILE", at: near, motion: "STILL" }));
    expect(onScreen(host, near)).toBe(true);
    expect(onScreen(host, far)).toBe(false);
    host.update(model({ kind: "TILE", at: far, motion: "STILL" }));
    expect(onScreen(host, far)).toBe(true);
    // The same marker again (another render) leaves the camera alone.
    const before = host.cellCentreCssPx(far);
    host.update(model({ kind: "TILE", at: far, motion: "STILL" }));
    expect(host.cellCentreCssPx(far)).toEqual(before);
  });

  it("frames the marker's scene with it: the Captain and the Knight's Goblins", () => {
    const { host, model } = setUp(1);
    host.update(model({ kind: "TILE", at: { x: 0, y: 10 }, motion: "STILL" }));
    expect(onScreen(host, TUTORIAL_PLACES_V7.goblin1)).toBe(false);
    host.update(
      model({
        kind: "UNIT",
        at: TUTORIAL_PLACES_V7.captain,
        motion: "STILL",
        frame: [TUTORIAL_PLACES_V7.knight, TUTORIAL_PLACES_V7.goblin1],
      }),
    );
    expect(onScreen(host, TUTORIAL_PLACES_V7.captain)).toBe(true);
    expect(onScreen(host, TUTORIAL_PLACES_V7.knight)).toBe(true);
    expect(onScreen(host, TUTORIAL_PLACES_V7.goblin1)).toBe(true);
  });
});
