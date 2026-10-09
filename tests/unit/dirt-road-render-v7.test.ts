import { describe, expect, it, vi } from "vitest";
import type { CoordV7 } from "../../src/engine/index";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  CHIBI_ROAD_STROKES_V7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  DIRT_ROAD_V7,
  dirtRoadBendV7,
  dirtRoadLinkV7,
  dirtRoadOutlineV7,
  dirtRoadPointV7,
  dirtRoadWidthV7,
  drawDirtRoadV7,
} from "../../src/render/canvas/dirt-road-v7";
import { TILE_WIDTH } from "../../src/render/canvas/geometry";
import {
  BASELINE_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "../../src/render/canvas/visual-direction-v7";

/**
 * Dirt-path Roads of the live look (bead pulp_wars-g6b5): brown, slightly
 * irregular, deterministic from the cells, continuous across cells.
 */

interface Shape {
  readonly fillStyle: unknown;
  readonly points: readonly (readonly [number, number])[];
}

/** Records every filled path (with its colour) and every stroke. */
function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly fills: Shape[];
  readonly strokes: Shape[];
  readonly log: unknown[][];
} {
  const fills: Shape[] = [];
  const strokes: Shape[] = [];
  const log: unknown[][] = [];
  let points: [number, number][] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get: (target, key) => {
      if (key === "canvas") return undefined;
      if (key in target) return target[key as string];
      return (...args: unknown[]) => {
        log.push([String(key), ...args]);
        if (key === "beginPath") points = [];
        if (key === "moveTo" || key === "lineTo")
          points.push([Number(args[0]), Number(args[1])]);
        if (key === "fill")
          fills.push({ fillStyle: target.fillStyle, points: [...points] });
        if (key === "stroke")
          strokes.push({ fillStyle: target.strokeStyle, points: [...points] });
      };
    },
    set: (target, key, value) => {
      log.push(["set", String(key), value]);
      target[key as string] = value;
      return true;
    },
  });
  return {
    context: context as unknown as CanvasRenderingContext2D,
    fills,
    strokes,
    log,
  };
}

function readyChibi(): ChibiBoardArtV7 {
  return {
    resolve: vi.fn((request): ChibiResolutionV7 => ({
      kind: "READY",
      asset: {
        id: `fixture-${request.subject}`,
        subject: request.subject as ArtSubjectV7,
        assetClass: "TERRAIN",
        width: 80,
        height: 80,
        url: `/fixture/${request.subject}.png`,
      },
      image: { chibi: request.subject } as unknown as CanvasImageSource,
      density: 1,
      smoothing: false,
      cacheKey: request.subject,
    })),
  };
}

function plan(entries: readonly BoardRenderPlanEntryV7[]): BoardRenderPlanV7 {
  return { version: 7, entries, targets: [] };
}

function draw(
  built: BoardRenderPlanV7,
  direction: BoardVisualDirectionV7 = LIVE_DIRECTION_V7,
  zoom = 0.625,
): ReturnType<typeof recordingContext> {
  const recording = recordingContext();
  const chibiArt = readyChibi();
  drawBoardV7({
    context: recording.context,
    viewport: { width: 1000, height: 800 },
    devicePixelRatio: 1,
    camera: { offsetX: 64, offsetY: 64, zoom },
    plan: built,
    images: { resolve: () => null },
    artSet: "CHIBI",
    chibiArt,
    reducedMotion: true,
    direction: { spec: direction, art: chibiArt },
  });
  return recording;
}

const at = (x: number, y: number): CoordV7 => ({ x, y });

/** Every link shape of a few neighbourhoods, orthogonal and diagonal. */
const LINKS = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((x) =>
    [0, 1, 2, 3, 4, 5].flatMap((y) => [
      dirtRoadLinkV7(at(x, y), at(x + 1, y)),
      dirtRoadLinkV7(at(x, y), at(x, y + 1)),
      dirtRoadLinkV7(at(x, y), at(x + 1, y + 1)),
      dirtRoadLinkV7(at(x + 1, y), at(x, y + 1)),
    ]),
  ),
];
const T_SAMPLES = Array.from({ length: 41 }, (_, index) => index / 40);

describe("Dirt-path Roads (bead pulp_wars-g6b5)", () => {
  it("is a brown dirt palette with a darker edge than its fill", () => {
    const lightness = (hex: string): number =>
      [1, 3, 5]
        .map((index) => parseInt(hex.slice(index, index + 2), 16))
        .reduce((sum, channel) => sum + channel, 0);
    for (const colour of [
      DIRT_ROAD_V7.casing,
      DIRT_ROAD_V7.fill,
      DIRT_ROAD_V7.rut,
    ]) {
      const [r, g, b] = [1, 3, 5].map((index) =>
        parseInt(colour.slice(index, index + 2), 16),
      ) as [number, number, number];
      // Warm brown: red over green over blue.
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
    }
    expect(lightness(DIRT_ROAD_V7.casing)).toBeLessThan(
      lightness(DIRT_ROAD_V7.rut),
    );
    expect(lightness(DIRT_ROAD_V7.rut)).toBeLessThan(
      lightness(DIRT_ROAD_V7.fill),
    );
    expect(DIRT_ROAD_V7.fillWidth + DIRT_ROAD_V7.widthWobble).toBeLessThan(
      DIRT_ROAD_V7.casingWidth - DIRT_ROAD_V7.widthWobble,
    );
  });

  it("gives a link the same shape whichever cell asks, on every call", () => {
    for (const link of LINKS) {
      const again = dirtRoadLinkV7(link.to, link.from);
      expect(again).toEqual(link);
      expect(dirtRoadLinkV7(link.from, link.to)).toEqual(link);
      expect(dirtRoadOutlineV7(again, "FILL")).toEqual(
        dirtRoadOutlineV7(link, "FILL"),
      );
    }
    // Different links differ: the wobble is not one fixed curve.
    expect(new Set(LINKS.map((link) => link.bend.join())).size).toBe(
      LINKS.length,
    );
  });

  it("bends only slightly, straight out of each cell centre", () => {
    let largest = 0;
    for (const link of LINKS) {
      for (const t of T_SAMPLES) {
        const bend = Math.abs(dirtRoadBendV7(link, t));
        largest = Math.max(largest, bend);
        expect(bend).toBeLessThanOrEqual(DIRT_ROAD_V7.wobble);
      }
      // At both centres: no offset and no slope, so straight runs and
      // junction hubs meet without a kink.
      for (const end of [0, 1]) {
        expect(dirtRoadBendV7(link, end)).toBeCloseTo(0, 9);
        const near = end === 0 ? 1e-4 : 1 - 1e-4;
        expect(Math.abs(dirtRoadBendV7(link, near)) / 1e-4).toBeLessThan(1e-2);
        const centre = end === 0 ? link.from : link.to;
        const point = dirtRoadPointV7(link, end);
        expect(point.x).toBeCloseTo(centre.x * TILE_WIDTH, 9);
        expect(point.y).toBeCloseTo(centre.y * TILE_WIDTH, 9);
      }
    }
    // Visible, but ever so slightly: a few world units of a 128-unit cell.
    expect(largest).toBeGreaterThan(DIRT_ROAD_V7.wobble * 0.5);
  });

  it("swells and narrows a little, and is its base width at each centre", () => {
    for (const link of LINKS)
      for (const layer of ["CASING", "FILL"] as const) {
        const base =
          layer === "CASING"
            ? DIRT_ROAD_V7.casingWidth
            : DIRT_ROAD_V7.fillWidth;
        expect(dirtRoadWidthV7(link, layer, 0)).toBeCloseTo(base, 9);
        expect(dirtRoadWidthV7(link, layer, 1)).toBeCloseTo(base, 9);
        for (const t of T_SAMPLES)
          expect(
            Math.abs(dirtRoadWidthV7(link, layer, t) - base),
          ).toBeLessThanOrEqual(DIRT_ROAD_V7.widthWobble);
      }
  });

  it("keeps an orthogonal link inside its two cells and puts flecks well inside one", () => {
    for (const link of LINKS) {
      const diagonal = link.from.x !== link.to.x && link.from.y !== link.to.y;
      if (!diagonal)
        for (const point of dirtRoadOutlineV7(link, "CASING")) {
          // Across the link, never past the cells' shared side band.
          const across =
            link.from.y === link.to.y
              ? Math.abs(point.y - link.from.y * TILE_WIDTH)
              : Math.abs(point.x - link.from.x * TILE_WIDTH);
          expect(across).toBeLessThan(TILE_WIDTH / 2 - 40);
        }
      for (const fleck of link.flecks) {
        const centre = dirtRoadPointV7(link, fleck.t, fleck.offset);
        const cell = fleck.t < 0.5 ? link.from : link.to;
        const inset = Math.min(
          TILE_WIDTH / 2 - Math.abs(centre.x - cell.x * TILE_WIDTH),
          TILE_WIDTH / 2 - Math.abs(centre.y - cell.y * TILE_WIDTH),
        );
        expect(inset).toBeGreaterThan(fleck.size + 10);
      }
    }
    expect(LINKS.some((link) => link.flecks.length > 0)).toBe(true);
  });

  it("draws the same path from both cells of a link, each clipped to its own", () => {
    const worldOf = (
      fills: readonly Shape[],
      cell: CoordV7,
      zoom: number,
    ): (readonly [number, number])[][] =>
      fills.map((shape) =>
        shape.points.map(
          ([x, y]) =>
            [
              Math.round(((x - 500) / zoom + cell.x * TILE_WIDTH) * 1e6) / 1e6,
              Math.round(((y - 400) / zoom + cell.y * TILE_WIDTH) * 1e6) / 1e6,
            ] as const,
        ),
      );
    for (const [a, b] of [
      [at(3, 4), at(4, 4)],
      [at(3, 4), at(4, 5)],
      [at(5, 2), at(4, 3)],
    ] as const)
      for (const zoom of [0.625, 1.75])
        for (const layer of ["CASING", "FILL"] as const) {
          const fromA = recordingContext();
          drawDirtRoadV7(
            fromA.context,
            { at: a, neighbours: [b], joins: [], isolated: false },
            500,
            400,
            zoom,
            layer,
          );
          const fromB = recordingContext();
          drawDirtRoadV7(
            fromB.context,
            { at: b, neighbours: [a], joins: [], isolated: false },
            500,
            400,
            zoom,
            layer,
          );
          // A corner cell of a diagonal link draws it as a join.
          const corner = at(a.x, b.y);
          const fromCorner = recordingContext();
          drawDirtRoadV7(
            fromCorner.context,
            { at: corner, neighbours: [], joins: [[a, b]], isolated: false },
            500,
            400,
            zoom,
            layer,
          );
          const shapeA = worldOf(fromA.fills, a, zoom)[0];
          expect(shapeA?.length).toBeGreaterThan(30);
          expect(worldOf(fromB.fills, b, zoom)[0]).toEqual(shapeA);
          expect(worldOf(fromCorner.fills, corner, zoom)[0]).toEqual(shapeA);
          // Each draws clipped to its own square.
          const clip = (log: unknown[][]) =>
            log.find((call) => call[0] === "rect");
          expect(clip(fromA.log)).toEqual([
            "rect",
            500 - 64 * zoom,
            400 - 64 * zoom,
            128 * zoom,
            128 * zoom,
          ]);
          expect(
            fromA.log.findIndex((call) => call[0] === "clip"),
          ).toBeLessThan(fromA.log.findIndex((call) => call[0] === "fill"));
        }
  });

  it("draws the live look's every casing, then every dirt fill with its flecks, identically on each redraw", () => {
    const roads = plan([
      {
        key: "road-join:1,1",
        kind: "ROAD_JOIN",
        layer: 1.9,
        at: at(1, 1),
        roadJoins: [[at(0, 1), at(1, 0)]],
      },
      {
        key: "road:1,1",
        kind: "ROAD",
        layer: 2,
        at: at(1, 1),
        roadNeighbors: [at(2, 1), at(1, 2), at(2, 2)],
      },
      {
        key: "road:2,1",
        kind: "ROAD",
        layer: 2,
        at: at(2, 1),
        roadNeighbors: [at(1, 1)],
      },
      { key: "road:4,4", kind: "ROAD", layer: 2, at: at(4, 4) },
    ]);
    const first = draw(roads);
    const colours = first.fills.map((shape) => shape.fillStyle);
    const lastCasing = colours.lastIndexOf(DIRT_ROAD_V7.casing);
    const firstFill = colours.indexOf(DIRT_ROAD_V7.fill);
    expect(lastCasing).toBeGreaterThan(-1);
    expect(firstFill).toBeGreaterThan(lastCasing);
    // Five link layers (join, three spokes, one spoke) per pass.
    expect(
      colours.filter((colour) => colour === DIRT_ROAD_V7.casing),
    ).toHaveLength(5);
    expect(
      colours.filter((colour) => colour === DIRT_ROAD_V7.fill),
    ).toHaveLength(5);
    // No cobblestone or black casing of the BOLD look.
    const strokeColours = first.strokes.map((shape) => shape.fillStyle);
    for (const [colour] of CHIBI_ROAD_STROKES_V7)
      expect([...colours, ...strokeColours]).not.toContain(colour);
    // The isolated Road keeps a short dirt patch, casing then fill.
    expect(strokeColours.slice(0, 1)).toEqual([DIRT_ROAD_V7.casing]);
    expect(strokeColours).toContain(DIRT_ROAD_V7.fill);
    // Never random per frame.
    expect(draw(roads).log).toEqual(first.log);
    // At another zoom every point scales about the camera origin.
    const zoomed = draw(roads, LIVE_DIRECTION_V7, 1.25);
    expect(zoomed.fills).toHaveLength(first.fills.length);
    for (const [index, shape] of first.fills.entries())
      for (const [point, [x, y]] of shape.points.entries()) {
        const [zx, zy] = zoomed.fills[index]?.points[point] ?? [NaN, NaN];
        expect((zx - 64) / 1.25).toBeCloseTo((x - 64) / 0.625, 6);
        expect((zy - 64) / 1.25).toBeCloseTo((y - 64) / 0.625, 6);
      }
  });

  it("leaves the BOLD look's straight cobblestone strokes as they were", () => {
    const roads = plan([
      {
        key: "road:1,1",
        kind: "ROAD",
        layer: 2,
        at: at(1, 1),
        roadNeighbors: [at(2, 1)],
      },
    ]);
    const bold = draw(roads, BASELINE_DIRECTION_V7);
    expect(bold.fills).toEqual([]);
    expect(bold.strokes.map((shape) => shape.fillStyle)).toEqual(
      CHIBI_ROAD_STROKES_V7.map(([colour]) => colour),
    );
  });
});
