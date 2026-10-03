// @vitest-environment jsdom

import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  BOARD_PRESENTATION_BUSY_UNITS_V7,
  buildBoardPresentationFixtureV7,
  mixedTerrainV7,
  readyUnitCountV7,
  type BoardPresentationFixtureV7,
} from "../../scripts/board-presentation-fixture-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  centerCameraOn,
  fitCamera,
  projectGrid,
} from "../../src/render/canvas/geometry";

/** A recording 2D context; jsdom has no Canvas backend. */
function recordingContext(canvas: HTMLCanvasElement) {
  const drawImage = vi.fn();
  const context = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === "canvas") return canvas;
        if (key === "drawImage") return drawImage;
        if (key === "measureText")
          return (text: string) => ({ width: text.length * 6 });
        if (key === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1 });
        return vi.fn();
      },
    },
  ) as CanvasRenderingContext2D;
  return { context, drawImage };
}

/**
 * One iteration of the probe's direct draw
 * (`scripts/benchmark-board-presentation-v7.ts`): plan the board with the
 * first unit selected and draw it once at a fixed readiness time.
 */
function drawOnce(fixture: BoardPresentationFixtureV7) {
  const { view, offeredCommands } = fixture;
  const first = view.units[0];
  if (first === undefined) throw new Error("fixture has no unit");
  const plan = buildBoardRenderPlanV7(view, offeredCommands, {
    selection: { kind: "UNIT", unitId: first.id },
    selectedUnitId: first.id,
    selectedAchievement: null,
    cursor: first.at,
  });
  const capital = view.cities.find(
    (city) => city.ownerId === view.viewer.id && city.isCapital,
  );
  if (capital === undefined) throw new Error("fixture has no capital");
  const viewport = { width: 1440, height: 1000 };
  // Offscreen glow surfaces get recording contexts too.
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement) {
      return recordingContext(this).context;
    } as unknown as HTMLCanvasElement["getContext"]);
  onTestFinished(() => getContext.mockRestore());
  const recorded = recordingContext(document.createElement("canvas"));
  drawBoardV7({
    context: recorded.context,
    viewport,
    devicePixelRatio: 1,
    camera: centerCameraOn(
      fitCamera(view.board, viewport),
      projectGrid(capital.at),
      viewport,
    ),
    plan,
    images: { resolve: () => ({}) as CanvasImageSource },
    readinessElapsedMs: 800,
  });
  return { plan, drawImage: recorded.drawImage };
}

describe("board presentation benchmark fixture (pulp_wars-9s0.11)", () => {
  it.each([
    ["busy Grass", undefined],
    ["mixed Forest/Mountain", mixedTerrainV7],
  ] as const)(
    "projects the %s fixture through the engine and draws it once",
    (_label, terrainAt) => {
      const fixture = buildBoardPresentationFixtureV7(terrainAt);
      const { view, offeredCommands } = fixture;

      expect(view.board.width).toBe(25);
      expect(view.board.tiles).toHaveLength(625);
      expect(view.board.tiles.every((tile) => tile.explored)).toBe(true);
      expect(Array.isArray(view.board.territoryBorders)).toBe(true);
      expect(view.board.territoryBorders.length).toBeGreaterThan(0);
      expect(view.units).toHaveLength(BOARD_PRESENTATION_BUSY_UNITS_V7);
      expect(readyUnitCountV7(fixture)).toBe(BOARD_PRESENTATION_BUSY_UNITS_V7);
      expect(offeredCommands.length).toBeGreaterThanOrEqual(
        BOARD_PRESENTATION_BUSY_UNITS_V7,
      );
      if (terrainAt !== undefined)
        expect(
          view.board.tiles.some(
            (tile) => tile.explored && tile.terrain === "MOUNTAIN",
          ),
        ).toBe(true);

      const { plan, drawImage } = drawOnce(fixture);
      expect(
        plan.entries.filter((entry) => entry.kind === "UNIT" && entry.ready),
      ).toHaveLength(BOARD_PRESENTATION_BUSY_UNITS_V7);
      expect(drawImage).toHaveBeenCalled();
    },
  );
});
