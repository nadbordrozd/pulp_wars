import { describe, expect, it, vi } from "vitest";
import { queryPlayerCommandsV7, viewForV7 } from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  territoryBoundarySegments,
  type TileEdge,
} from "../../src/render/canvas/geometry";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

describe("Ruleset 7 board renderer", () => {
  it("keeps square row depth, unit-over-improvement, accepted sites and map targets", () => {
    const state = exploredAllV7(initialV7(1516));
    const view = viewForV7(state, state.humanPlayerId);
    const owned = view.units.find((unit) => unit.ownerId === view.viewer.id);
    expect(owned).toBeDefined();
    const unitAt = owned?.at;
    if (unitAt === undefined) throw new Error("owned unit missing");
    const overlapView = {
      ...view,
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          tile.at.x === unitAt.x && tile.at.y === unitAt.y && tile.explored
            ? {
                ...tile,
                improvement: "FARM" as const,
                resource: null,
                road: true,
              }
            : tile.at.x === 0 && tile.at.y === 0
              ? {
                  ...tile,
                  terrain: "FOREST" as const,
                  resource: "GAME" as const,
                  improvement: null,
                }
              : tile.at.x === 0 && tile.at.y === 1
                ? {
                    ...tile,
                    terrain: "GRASS" as const,
                    resource: "FERTILE_GROUND" as const,
                    improvement: null,
                  }
                : tile,
        ),
      },
    };
    const plan = buildBoardRenderPlanV7(
      overlapView,
      queryPlayerCommandsV7(view),
      {
        selection:
          owned === undefined ? null : { kind: "UNIT", unitId: owned.id },
        selectedUnitId: owned?.id ?? null,
        selectedAchievement: null,
        cursor: { x: 0, y: 1 },
      },
    );
    expect(plan.version).toBe(7);
    expect(plan.entries.some((entry) => entry.kind === "CITY")).toBe(true);
    expect(plan.entries.some((entry) => entry.kind === "UNIT")).toBe(true);
    expect(
      plan.entries.find((entry) => entry.key === `unit:${owned?.id}`),
    ).toMatchObject({ ownerColor: "#f06762", ownerSeat: 0 });
    for (let index = 1; index < plan.entries.length; index += 1) {
      const prior = plan.entries[index - 1];
      const next = plan.entries[index];
      expect(
        prior === undefined ||
          next === undefined ||
          prior.at.y < next.at.y ||
          (prior.at.y === next.at.y && prior.at.x <= next.at.x),
      ).toBe(true);
    }
    const byCell = new Map<string, (typeof plan.entries)[number][]>();
    for (const entry of plan.entries) {
      const key = `${entry.at.x},${entry.at.y}`;
      byCell.set(key, [...(byCell.get(key) ?? []), entry]);
    }
    for (const entries of byCell.values()) {
      const improvement = entries.findIndex(
        (entry) => entry.kind === "IMPROVEMENT",
      );
      const unit = entries.findIndex((entry) => entry.kind === "UNIT");
      if (improvement >= 0 && unit >= 0)
        expect(unit).toBeGreaterThan(improvement);
    }
    const overlap = byCell.get(`${unitAt.x},${unitAt.y}`) ?? [];
    expect(overlap.some((entry) => entry.kind === "IMPROVEMENT")).toBe(true);
    expect(overlap.some((entry) => entry.kind === "ROAD")).toBe(true);
    expect(overlap.some((entry) => entry.kind === "UNIT")).toBe(true);
    expect(
      overlap.findIndex((entry) => entry.kind === "IMPROVEMENT"),
    ).toBeLessThan(overlap.findIndex((entry) => entry.kind === "ROAD"));
    const forestIndex = plan.entries.findIndex(
      (entry) => entry.assetId === "terrain-square-original-forest-1",
    );
    const gameIndex = plan.entries.findIndex(
      (entry) =>
        entry.assetId === "terrain-square-original-animal" &&
        entry.at.x === 0 &&
        entry.at.y === 0,
    );
    const fertileIndex = plan.entries.findIndex(
      (entry) =>
        entry.assetId === "terrain-square-fertile-ground" &&
        entry.at.x === 0 &&
        entry.at.y === 1,
    );
    expect(forestIndex).toBeGreaterThanOrEqual(0);
    expect(gameIndex).toBeGreaterThan(forestIndex);
    expect(fertileIndex).toBeGreaterThan(gameIndex);
    expect(plan.entries).toContainEqual(
      expect.objectContaining({ kind: "CURSOR", at: { x: 0, y: 1 } }),
    );
    expect(plan.targets.every((target) => target.at !== undefined)).toBe(true);
  });

  it("uses calibrated accepted aspect ratios for units, processors and cities", () => {
    const entries: BoardRenderPlanEntryV7[] = [
      imageEntry("standard", "UNIT", "unit-original-fighter", 0, 0),
      imageEntry("catapult", "UNIT", "unit-original-catapult", 1, 0),
      imageEntry("giant", "UNIT", "unit-original-juggernaut", 2, 0),
      imageEntry("processor", "IMPROVEMENT", "building-square-windmill", 3, 0),
      { ...imageEntry("city", "CITY", "building-city-2", 4, 0), value: 2 },
    ];
    const drawImage = vi.fn();
    const context = drawingContext(drawImage);
    drawBoardV7({
      context,
      viewport: { width: 800, height: 300 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 150, zoom: 1 },
      plan: { version: 7, entries, targets: [] },
      images: { resolve: () => ({}) as CanvasImageSource },
    });
    const dimensions = drawImage.mock.calls.map((call) => call.slice(3, 5));
    for (const [actual, expected] of dimensions.flatMap((pair, index) =>
      pair.map(
        (value, axis) =>
          [
            value as number,
            [
              [64, 74],
              [92.16, 92.16],
              [96, 112],
              [115.2, 115.2],
              [115.2, 115.2],
            ][index]?.[axis] ?? 0,
          ] as const,
      ),
    ))
      expect(actual).toBeCloseTo(expected);
  });

  it("draws single and pair Farm crops at exact ground-cell rectangles", () => {
    const drawImage = vi.fn();
    drawBoardV7({
      context: drawingContext(drawImage),
      viewport: { width: 400, height: 300 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 1 },
      plan: {
        version: 7,
        targets: [],
        entries: [
          imageEntry(
            "farm-single",
            "IMPROVEMENT",
            "building-ruleset7-farm-single",
            0,
            0,
          ),
          {
            ...imageEntry(
              "farm-left",
              "IMPROVEMENT",
              "building-ruleset7-farm-pair-horizontal",
              1,
              0,
            ),
            sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
          },
          {
            ...imageEntry(
              "farm-right",
              "IMPROVEMENT",
              "building-ruleset7-farm-pair-horizontal",
              2,
              0,
            ),
            sourceCrop: { x: 256, y: 0, width: 256, height: 256 },
          },
          {
            ...imageEntry(
              "farm-top",
              "IMPROVEMENT",
              "building-ruleset7-farm-pair-vertical",
              0,
              1,
            ),
            sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
          },
          {
            ...imageEntry(
              "farm-bottom",
              "IMPROVEMENT",
              "building-ruleset7-farm-pair-vertical",
              0,
              2,
            ),
            sourceCrop: { x: 0, y: 256, width: 256, height: 256 },
          },
        ],
      },
      images: { resolve: () => ({}) as CanvasImageSource },
    });
    expect(drawImage).toHaveBeenCalledTimes(5);
    expect(drawImage.mock.calls[0]?.slice(1)).toEqual([36, 36, 128, 128]);
    expect(
      drawImage.mock.calls.slice(1).map((call) => call.slice(1, 5)),
    ).toEqual([
      [0, 0, 256, 256],
      [256, 0, 256, 256],
      [0, 0, 256, 256],
      [0, 256, 256, 256],
    ]);
    expect(drawImage.mock.calls.slice(1).map((call) => call.slice(5))).toEqual([
      [164, 36, 128, 128],
      [292, 36, 128, 128],
      [36, 164, 128, 128],
      [36, 292, 128, 128],
    ]);
    for (const call of drawImage.mock.calls.slice(1)) {
      expect(call).toHaveLength(9);
      expect(call[7]).toBe(128);
      expect(call[8]).toBe(128);
    }
  });

  it("derives the exact road mask from public orthogonal connectivity", () => {
    const state = exploredAllV7(initialV7(1518));
    const view = viewForV7(state, state.humanPlayerId);
    const center = { x: 5, y: 5 };
    const roadView = {
      ...view,
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          tile.explored
            ? {
                ...tile,
                road:
                  (tile.at.x === 5 && tile.at.y === 5) ||
                  (tile.at.x === 5 && tile.at.y === 4) ||
                  (tile.at.x === 6 && tile.at.y === 5),
              }
            : tile,
        ),
      },
    };
    const plan = buildBoardRenderPlanV7(roadView, [], {
      selection: { kind: "TILE", at: center },
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(
      plan.entries.find(
        (entry) =>
          entry.kind === "ROAD" && entry.at.x === 5 && entry.at.y === 5,
      )?.assetId,
    ).toBe("terrain-square-road-mask-1100");
  });

  it("emits one public contour winner per physical owner, city, or potential edge", () => {
    const state = exploredAllV7(initialV7(1519));
    const base = viewForV7(state, state.humanPlayerId);
    const city = base.cities.find(
      (candidate) => candidate.ownerId === base.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    const hidden = base.board.tiles.find(
      (tile) =>
        tile.explored &&
        tile.territoryCityId === city.id &&
        (tile.at.x !== city.at.x || tile.at.y !== city.at.y),
    );
    if (hidden === undefined) throw new Error("territory tile missing");
    const view = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === hidden.at.x && tile.at.y === hidden.at.y
            ? ({ at: tile.at, explored: false as const } as const)
            : tile,
        ),
      },
    };
    const ambient = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.filter((entry) => entry.kind === "TERRITORY_BOUNDARY");
    expect(ambient.length).toBeGreaterThan(0);
    expect(ambient.every((entry) => entry.boundaryStyle === "OWNER")).toBe(
      true,
    );
    const plan = buildBoardRenderPlanV7(view, [], {
      selection: { kind: "CITY", cityId: city.id },
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const boundaries = plan.entries.filter(
      (entry) => entry.kind === "TERRITORY_BOUNDARY",
    );
    const physicalEdges = boundaries.map((entry) =>
      testEdgeKey(entry.at, entry.edge ?? "NORTH"),
    );
    expect(new Set(physicalEdges).size).toBe(physicalEdges.length);
    expect(
      boundaries.every(
        (entry) => entry.at.x !== hidden.at.x || entry.at.y !== hidden.at.y,
      ),
    ).toBe(true);

    const observableAssigned = view.board.tiles
      .filter((tile) => tile.explored && tile.territoryCityId === city.id)
      .map((tile) => tile.at);
    const selected = boundaries.filter(
      (entry) => entry.boundaryStyle === "CITY",
    );
    expect(selected).toHaveLength(
      territoryBoundarySegments(observableAssigned).length,
    );
    expect(
      boundaries.some((entry) => entry.boundaryStyle === "POTENTIAL"),
    ).toBe(!city.expanded);
  });

  it("wraps the ninth processor pip onto a second row", () => {
    const fillRect = vi.fn();
    const context = drawingContext(vi.fn(), fillRect);
    drawBoardV7({
      context,
      viewport: { width: 300, height: 300 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 1 },
      plan: {
        version: 7,
        entries: [
          {
            key: "value",
            kind: "VALUE",
            at: { x: 0, y: 0 },
            layer: 6,
            value: 9,
            label: "POPULATION",
          },
        ],
        targets: [],
      },
      images: { resolve: () => null },
    });
    const pips = fillRect.mock.calls.filter(
      (call) => call[2] === 6 && call[3] === 6,
    );
    expect(pips).toHaveLength(9);
    expect(pips[8]?.[1]).toBeGreaterThan(pips[7]?.[1] as number);
  });

  it("uses sprite-attached readiness rhythm only for units with offered Move", () => {
    const state = exploredAllV7(initialV7(1524));
    const view = viewForV7(state, state.humanPlayerId);
    const owned = view.units.find((unit) => unit.ownerId === view.viewer.id);
    if (owned === undefined) throw new Error("owned unit missing");
    const waitOnly = buildBoardRenderPlanV7(
      view,
      [{ kind: "WAIT", unitId: owned.id }],
      {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
    );
    expect(
      waitOnly.entries.find((entry) => entry.key === `unit:${owned.id}`)?.ready,
    ).toBe(false);

    const drawImage = vi.fn();
    const ellipse = vi.fn();
    const alphaValues: number[] = [];
    const context = drawingContext(
      drawImage,
      vi.fn(),
      { ellipse },
      (key, value) => {
        if (key === "globalAlpha" && typeof value === "number")
          alphaValues.push(value);
      },
    );
    drawBoardV7({
      context,
      viewport: { width: 300, height: 300 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 1 },
      plan: {
        version: 7,
        entries: [
          {
            ...imageEntry("unit:1", "UNIT", "unit-original-fighter", 0, 0),
            ready: true,
          },
        ],
        targets: [],
      },
      images: { resolve: () => ({}) as CanvasImageSource },
      readinessElapsedMs: 800,
      reducedMotion: false,
      highContrast: false,
    });
    expect(drawImage.mock.calls[0]?.[3]).toBeCloseTo(64 * 1.08);
    expect(drawImage.mock.calls[0]?.[4]).toBeCloseTo(74 * 1.08);
    expect(alphaValues.some((alpha) => Math.abs(alpha - 0.62) < 0.00001)).toBe(
      true,
    );
    expect(ellipse).not.toHaveBeenCalled();

    const selectedImage = vi.fn();
    drawBoardV7({
      context: drawingContext(selectedImage),
      viewport: { width: 300, height: 300 },
      devicePixelRatio: 1,
      camera: { offsetX: 100, offsetY: 100, zoom: 1 },
      plan: {
        version: 7,
        entries: [imageEntry("unit:1", "UNIT", "unit-original-fighter", 0, 0)],
        targets: [],
      },
      images: { resolve: () => ({}) as CanvasImageSource },
      selectionJump: { unitId: 1, elapsedMs: 120, speed: "NORMAL" },
      reducedMotion: false,
    });
    const baselineTop = 100 + 18 - 222 * 0.25;
    expect(selectedImage.mock.calls[0]?.[2]).toBeCloseTo(baselineTop - 12);
  });
});

function imageEntry(
  key: string,
  kind: BoardRenderPlanEntryV7["kind"],
  assetId: string,
  x: number,
  y: number,
): BoardRenderPlanEntryV7 {
  return { key, kind, assetId, at: { x, y }, layer: 1 };
}

function testEdgeKey(
  at: { readonly x: number; readonly y: number },
  edge: TileEdge,
): string {
  if (edge === "NORTH") return `h:${at.x}:${at.y}`;
  if (edge === "SOUTH") return `h:${at.x}:${at.y + 1}`;
  if (edge === "WEST") return `v:${at.x}:${at.y}`;
  return `v:${at.x + 1}:${at.y}`;
}

function drawingContext(
  drawImage: ReturnType<typeof vi.fn>,
  fillRect: ReturnType<typeof vi.fn> = vi.fn(),
  methods: Readonly<Record<string, ReturnType<typeof vi.fn>>> = {},
  onSet: (key: PropertyKey, value: unknown) => void = () => {},
): CanvasRenderingContext2D {
  const functions = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === "canvas"
          ? undefined
          : key === "drawImage"
            ? drawImage
            : key === "fillRect"
              ? fillRect
              : (methods[String(key)] ?? vi.fn()),
      set: (target, key, value) => {
        onSet(key, value);
        return Reflect.set(target, key, value);
      },
    },
  );
  return functions as CanvasRenderingContext2D;
}
