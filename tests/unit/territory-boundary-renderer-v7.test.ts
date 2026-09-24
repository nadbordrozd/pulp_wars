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
    const shared = owned.filter(
      (entry) => entry.counterpartOwnerColor !== undefined,
    );
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((entry) => entry.ownerColor === "#f06762")).toBe(true);
    expect(
      shared.every((entry) => entry.counterpartOwnerColor === "#28b7a4"),
    ).toBe(true);

    const city = base.cities[0];
    if (city === undefined) throw new Error("Review city missing");
    const selected = buildBoardRenderPlanV7(base, [], {
      selection: { kind: "CITY", cityId: city.id },
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.filter(
      (entry) =>
        entry.kind === "TERRITORY_BOUNDARY" &&
        entry.boundaryStyle === "CITY" &&
        entry.counterpartOwnerColor !== undefined,
    );
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((entry) => entry.ownerColor === "#f06762")).toBe(
      true,
    );
    expect(
      selected.every((entry) => entry.counterpartOwnerColor === "#28b7a4"),
    ).toBe(true);
  });

  it.each(["OWNER", "CITY"] as const)(
    "interleaves both public owner colors on a shared %s edge",
    (boundaryStyle) => {
      const strokes: { style: string; dash: number[]; offset: number }[] = [];
      const target: Record<PropertyKey, unknown> = {
        strokeStyle: "",
        lineDashOffset: 0,
        dash: [] as number[],
      };
      target.setLineDash = vi.fn((dash: number[]) => {
        target.dash = dash;
      });
      target.stroke = vi.fn(() =>
        strokes.push({
          style: String(target.strokeStyle),
          dash: [...(target.dash as number[])],
          offset: Number(target.lineDashOffset),
        }),
      );
      const context = new Proxy(target, {
        get: (object, key) => (key in object ? object[key] : vi.fn()),
        set: (object, key, value) => {
          object[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
      drawBoardV7({
        context,
        viewport: { width: 300, height: 300 },
        devicePixelRatio: 1,
        camera: { zoom: 1, offsetX: 100, offsetY: 100 },
        plan: {
          version: 7,
          targets: [],
          entries: [
            {
              key: "terrain",
              kind: "TERRAIN",
              layer: 0,
              at: { x: 1, y: 1 },
              assetId: "terrain-square-grass-1",
            },
            {
              key: "shared",
              kind: "TERRITORY_BOUNDARY",
              layer: 7,
              at: { x: 1, y: 1 },
              edge: "EAST",
              boundaryStyle,
              ownerColor: "#f06762",
              counterpartOwnerColor: "#28b7a4",
            },
          ],
        },
        images: { resolve: () => null },
      });
      expect(strokes.slice(-3)).toEqual([
        { style: "#243633", dash: [12, 4], offset: -6 },
        { style: "#f06762", dash: [12, 20], offset: -6 },
        { style: "#28b7a4", dash: [12, 20], offset: -22 },
      ]);
      strokes.length = 0;
      drawBoardV7({
        context,
        viewport: { width: 300, height: 300 },
        devicePixelRatio: 1,
        camera: { zoom: 1, offsetX: 100, offsetY: 100 },
        plan: {
          version: 7,
          targets: [],
          entries: [
            {
              key: "terrain",
              kind: "TERRAIN",
              layer: 0,
              at: { x: 1, y: 1 },
              assetId: "terrain-square-grass-1",
            },
            {
              key: "single-owner",
              kind: "TERRITORY_BOUNDARY",
              layer: 7,
              at: { x: 1, y: 1 },
              edge: "EAST",
              boundaryStyle: "OWNER",
              ownerColor: "#f06762",
            },
          ],
        },
        images: { resolve: () => null },
      });
      expect(strokes.slice(-2)).toEqual([
        { style: "#243633", dash: [20, 12], offset: -6 },
        { style: "#f06762", dash: [20, 12], offset: -6 },
      ]);
    },
  );

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
