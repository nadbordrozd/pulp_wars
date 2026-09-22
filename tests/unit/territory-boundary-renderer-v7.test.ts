import { describe, expect, it, vi } from "vitest";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import { territoryReviewFixtureV7 } from "../fixtures/ruleset7-territory-review";

describe("square territory boundary presentation", () => {
  it("uses only public border segments and never reads hidden tile fields", () => {
    const base = territoryReviewFixtureV7();
    const view = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.explored
            ? tile
            : new Proxy(tile, {
                get(target, key) {
                  if (key !== "at" && key !== "explored")
                    throw new Error(`Read hidden tile field: ${String(key)}`);
                  return Reflect.get(target, key);
                },
              }),
        ),
      },
    };
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const owned = plan.entries.filter(
      (entry) =>
        entry.kind === "TERRITORY_BOUNDARY" && entry.ownerId === base.viewer.id,
    );
    expect(owned).toHaveLength(12);
    for (const entry of owned) {
      expect(entry.boundaryStyle).toBe("OWNER");
      expect(
        (entry.edge === "SOUTH" && entry.at.y === 0) ||
          (entry.edge === "EAST" && entry.at.x === 3) ||
          (entry.edge === "SOUTH" && entry.at.y === 3) ||
          (entry.edge === "EAST" && entry.at.x === 0),
      ).toBe(true);
    }
  });

  it.each([0.625, 1, 1.75])(
    "clips to explored ground and opens public Road crossings at %sx",
    (zoom) => {
      const view = territoryReviewFixtureV7();
      const city = view.cities[0];
      if (!city) throw new Error("Review city missing");
      const plan = buildBoardRenderPlanV7(view, [], {
        selection: { kind: "CITY", cityId: city.id },
        selectedUnitId: null,
        selectedAchievement: null,
      });
      const operations: { kind: string; args: unknown[] }[] = [];
      let style = "";
      const context = new Proxy(
        {},
        {
          get: (_target, key) =>
            vi.fn((...args: unknown[]) => {
              operations.push({ kind: String(key), args: [...args, style] });
            }),
          set: (_target, key, value) => {
            if (key === "strokeStyle") style = String(value);
            return true;
          },
        },
      ) as CanvasRenderingContext2D;
      drawBoardV7({
        context,
        viewport: { width: 1440, height: 1000 },
        devicePixelRatio: 1,
        camera: { zoom, offsetX: 64, offsetY: 64 },
        plan,
        images: { resolve: () => null },
      });
      // Locate the explored-ground mask used by the first territory casing.
      // Earlier per-cell Road clips are independent of this boundary mask.
      const firstBoundaryStroke = operations.findIndex(
        (op) => op.kind === "stroke" && op.args.at(-1) === "#243633",
      );
      expect(firstBoundaryStroke).toBeGreaterThan(0);
      const groundClip = operations
        .slice(0, firstBoundaryStroke)
        .reduce(
          (last, op, index) =>
            op.kind === "clip" && op.args[0] !== "evenodd" ? index : last,
          -1,
        );
      expect(groundClip).toBeGreaterThan(0);
      const groundPath = operations
        .slice(0, groundClip)
        .reduce(
          (last, op, index) => (op.kind === "beginPath" ? index : last),
          -1,
        );
      const groundRects = operations
        .slice(groundPath + 1, groundClip)
        .filter((op) => op.kind === "rect");
      expect(groundRects).toHaveLength(
        view.board.tiles.filter((tile) => tile.explored).length,
      );
      for (const tile of view.board.tiles.filter((tile) => !tile.explored)) {
        expect(groundRects.map((op) => op.args.slice(0, 4))).not.toContainEqual(
          [
            64 + (tile.at.x - 0.5) * 128 * zoom,
            64 + (tile.at.y - 0.5) * 128 * zoom,
            128 * zoom,
            128 * zoom,
          ],
        );
      }
      const roadGates = operations.filter(
        (op) => op.kind === "rect" && op.args[2] === 24 * zoom,
      );
      expect(roadGates.length).toBeGreaterThan(0);
      expect(
        operations.filter(
          (op) => op.kind === "clip" && op.args[0] === "evenodd",
        ).length,
      ).toBe(roadGates.length);
      const lastBoundaryStroke = operations.reduce(
        (last, op, index) => (op.kind === "stroke" ? index : last),
        -1,
      );
      const selectionOutline = operations.findIndex(
        (op) => op.kind === "strokeRect" && op.args.at(-1) === "#fff6b0",
      );
      expect(selectionOutline).toBeGreaterThan(lastBoundaryStroke);
    },
  );
});
