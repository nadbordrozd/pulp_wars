import { beforeEach, describe, expect, it, vi } from "vitest";
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
  DIRT_ROAD_GRID_V7,
  DIRT_ROAD_PIXEL_V7,
  DIRT_ROAD_REACH_V7,
  DIRT_ROAD_V7,
  clearDirtRoadCacheV7,
  dirtRoadBendV7,
  dirtRoadEdgeNoiseV7,
  dirtRoadLinkV7,
  dirtRoadPixelsV7,
  dirtRoadPointV7,
  dirtRoadRunsV7,
  drawDirtRoadV7,
  type DirtRoadCellV7,
} from "../../src/render/canvas/dirt-road-v7";
import { TILE_WIDTH } from "../../src/render/canvas/geometry";
import {
  BASELINE_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "../../src/render/canvas/visual-direction-v7";

/**
 * Dirt-track Roads of the live look (beads pulp_wars-g6b5 and
 * pulp_wars-2yc.43): brown, with a rough edge and an uneven fill, painted on
 * the terrain's pixel grid; deterministic from the cells and continuous
 * across them.
 */

const SIZE = DIRT_ROAD_GRID_V7;
const P = DIRT_ROAD_PIXEL_V7;
const UNIT = TILE_WIDTH / SIZE;
const at = (x: number, y: number): CoordV7 => ({ x, y });
const key = (cell: CoordV7): string => `${cell.x},${cell.y}`;
const isDirt = (value: number | undefined): boolean =>
  value !== undefined && value >= P.DIRT;

const CASING_COLOURS: readonly string[] = [
  DIRT_ROAD_V7.casing,
  DIRT_ROAD_V7.casingSoft,
  DIRT_ROAD_V7.crumb,
];
const FILL_COLOURS: readonly string[] = [
  DIRT_ROAD_V7.fill,
  DIRT_ROAD_V7.fillDark,
  DIRT_ROAD_V7.fillLight,
  DIRT_ROAD_V7.rut,
  DIRT_ROAD_V7.pebble,
];

/**
 * The entries the board plan makes for a set of road cells: a Road entry
 * for each cell, linked to its eight neighbours, and a corner join wherever
 * a cell's horizontal and vertical neighbours are both roads.
 */
function network(cells: readonly CoordV7[]): readonly DirtRoadCellV7[] {
  const roads = new Set(cells.map(key));
  const entries: DirtRoadCellV7[] = [];
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  for (let y = Math.min(...ys) - 1; y <= Math.max(...ys) + 1; y += 1)
    for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x += 1) {
      const joins: (readonly [CoordV7, CoordV7])[] = [];
      for (const dx of [-1, 1])
        for (const dy of [-1, 1])
          if (roads.has(key(at(x + dx, y))) && roads.has(key(at(x, y + dy))))
            joins.push([at(x + dx, y), at(x, y + dy)]);
      if (joins.length > 0)
        entries.push({ at: at(x, y), neighbours: [], joins, isolated: false });
      if (!roads.has(key(at(x, y)))) continue;
      const neighbours: CoordV7[] = [];
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          if ((dx !== 0 || dy !== 0) && roads.has(key(at(x + dx, y + dy))))
            neighbours.push(at(x + dx, y + dy));
      entries.push({
        at: at(x, y),
        neighbours,
        joins: [],
        isolated: neighbours.length === 0,
      });
    }
  return entries;
}

/** Whether a pixel of the world's grid is dirt once every entry is drawn. */
function dirtOfWorld(
  entries: readonly DirtRoadCellV7[],
): (gx: number, gy: number) => boolean {
  const dirt = new Set<string>();
  for (const entry of entries) {
    const pixels = dirtRoadPixelsV7(entry);
    for (let row = 0; row < SIZE; row += 1)
      for (let column = 0; column < SIZE; column += 1)
        if (isDirt(pixels[row * SIZE + column]))
          dirt.add(`${entry.at.x * SIZE + column},${entry.at.y * SIZE + row}`);
  }
  return (gx, gy) => dirt.has(`${gx},${gy}`);
}

/** The dirt pixels reached from `start` by steps up, down, left and right. */
function reachFrom(
  dirt: (gx: number, gy: number) => boolean,
  start: readonly [number, number],
): Set<string> {
  const seen = new Set<string>([start.join()]);
  const queue: (readonly [number, number])[] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop() as readonly [number, number];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = [x + dx, y + dy] as const;
      if (seen.has(next.join()) || !dirt(next[0], next[1])) continue;
      seen.add(next.join());
      queue.push(next);
    }
  }
  return seen;
}

const centreOf = (cell: CoordV7): readonly [number, number] => [
  cell.x * SIZE + SIZE / 2,
  cell.y * SIZE + SIZE / 2,
];

/** The first and last dirt row of each column of a cell (or null). */
function dirtSpans(pixels: Uint8Array): (readonly [number, number] | null)[] {
  return Array.from({ length: SIZE }, (_, column) => {
    let first = -1;
    let last = -1;
    for (let row = 0; row < SIZE; row += 1)
      if (isDirt(pixels[row * SIZE + column])) {
        if (first < 0) first = row;
        last = row;
      }
    return first < 0 ? null : ([first, last] as const);
  });
}

/** A horizontal run through the middle cell of three. */
const straight = (x: number, y: number): DirtRoadCellV7 => ({
  at: at(x, y),
  neighbours: [at(x - 1, y), at(x + 1, y)],
  joins: [],
  isolated: false,
});

/** Records every call and property write of a context without a canvas. */
function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly rects: { colour: unknown; rect: readonly number[] }[];
  readonly strokes: unknown[];
  readonly log: unknown[][];
} {
  const rects: { colour: unknown; rect: readonly number[] }[] = [];
  const strokes: unknown[] = [];
  const log: unknown[][] = [];
  const state: Record<string, unknown> = {};
  const context = new Proxy(state, {
    get: (target, name) => {
      if (name === "canvas") return undefined;
      if (name in target) return target[name as string];
      return (...args: unknown[]) => {
        log.push([String(name), ...args]);
        if (name === "fillRect")
          rects.push({ colour: target.fillStyle, rect: args as number[] });
        if (name === "stroke") strokes.push(target.strokeStyle);
      };
    },
    set: (target, name, value) => {
      log.push(["set", String(name), value]);
      target[name as string] = value;
      return true;
    },
  });
  return {
    context: context as unknown as CanvasRenderingContext2D,
    rects,
    strokes,
    log,
  };
}

/** A context on a canvas of a document that hands out recording canvases. */
function spriteContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly sprites: { width: number; height: number; rects: number }[];
  readonly draws: { args: readonly unknown[]; smoothing: boolean }[];
} {
  const sprites: { width: number; height: number; rects: number }[] = [];
  const draws: { args: readonly unknown[]; smoothing: boolean }[] = [];
  const documentRoot = {
    createElement: () => {
      const sprite = { width: 0, height: 0, rects: 0 };
      sprites.push(sprite);
      return Object.assign(sprite, {
        getContext: () => ({
          fillStyle: "",
          fillRect: () => {
            sprite.rects += 1;
          },
        }),
      });
    },
  };
  const context = {
    canvas: { ownerDocument: documentRoot },
    imageSmoothingEnabled: true,
    drawImage: (...args: unknown[]) => {
      draws.push({ args, smoothing: context.imageSmoothingEnabled });
    },
  };
  return {
    context: context as unknown as CanvasRenderingContext2D,
    sprites,
    draws,
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

/** A run of straight cells, enough to judge the look as a whole. */
const RUN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((x) =>
  dirtRoadPixelsV7(straight(x, 3)),
);

describe("Dirt-track Roads (beads pulp_wars-g6b5, pulp_wars-2yc.43)", () => {
  beforeEach(() => clearDirtRoadCacheV7());

  it("is a brown dirt palette, darkest at the edge and in the ruts", () => {
    const channels = (hex: string): [number, number, number] =>
      [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [
        number,
        number,
        number,
      ];
    const lightness = (hex: string): number =>
      channels(hex).reduce((sum, channel) => sum + channel, 0);
    for (const colour of [...CASING_COLOURS, ...FILL_COLOURS]) {
      const [r, g, b] = channels(colour);
      // Warm brown: red over green over blue.
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
    }
    const ordered = [
      DIRT_ROAD_V7.casing,
      DIRT_ROAD_V7.rut,
      DIRT_ROAD_V7.fillDark,
      DIRT_ROAD_V7.fill,
      DIRT_ROAD_V7.fillLight,
      DIRT_ROAD_V7.pebble,
    ].map(lightness);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    expect(new Set(ordered).size).toBe(ordered.length);
    // The dirt keeps a dark gap to the Martian dust, the brownest ground.
    expect(lightness("#b98c6a") - lightness(DIRT_ROAD_V7.fill)).toBeGreaterThan(
      60,
    );
  });

  it("gives a link the same shape whichever cell asks, on every call", () => {
    for (const link of LINKS) {
      expect(dirtRoadLinkV7(link.to, link.from)).toEqual(link);
      expect(dirtRoadLinkV7(link.from, link.to)).toEqual(link);
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

  it("follows the link's curve: every dirt pixel lies near it, and it is dirt all along", () => {
    for (const [a, b] of [
      [at(3, 4), at(4, 4)],
      [at(3, 4), at(3, 5)],
      [at(3, 4), at(4, 5)],
      [at(5, 2), at(4, 3)],
    ] as const) {
      const link = dirtRoadLinkV7(a, b);
      const curve = Array.from({ length: 401 }, (_, index) =>
        dirtRoadPointV7(link, index / 400),
      );
      for (const cell of [a, b]) {
        const pixels = dirtRoadPixelsV7({
          at: cell,
          neighbours: [cell === a ? b : a],
          joins: [],
          isolated: false,
        });
        const widest = DIRT_ROAD_V7.halfWidth + DIRT_ROAD_V7.roughness;
        for (let row = 0; row < SIZE; row += 1)
          for (let column = 0; column < SIZE; column += 1) {
            if (!isDirt(pixels[row * SIZE + column])) continue;
            const wx = (cell.x - 0.5) * TILE_WIDTH + (column + 0.5) * UNIT;
            const wy = (cell.y - 0.5) * TILE_WIDTH + (row + 0.5) * UNIT;
            const distance = Math.min(
              ...curve.map((point) => Math.hypot(point.x - wx, point.y - wy)),
            );
            expect(distance / UNIT).toBeLessThan(widest + 0.05);
          }
        // The pixel under every point of the curve inside the cell is dirt.
        for (const point of curve) {
          const column = Math.floor(
            (point.x - (cell.x - 0.5) * TILE_WIDTH) / UNIT,
          );
          const row = Math.floor(
            (point.y - (cell.y - 0.5) * TILE_WIDTH) / UNIT,
          );
          if (column < 0 || row < 0 || column >= SIZE || row >= SIZE) continue;
          expect(isDirt(pixels[row * SIZE + column])).toBe(true);
        }
      }
    }
  });

  it("has a rough edge: bites and bulges, never a straight line", () => {
    const { halfWidth, roughness } = DIRT_ROAD_V7;
    for (let gx = 0; gx < 400; gx += 7)
      for (let gy = 0; gy < 400; gy += 11)
        expect(Math.abs(dirtRoadEdgeNoiseV7(gx, gy))).toBeLessThanOrEqual(
          roughness,
        );
    const tops: number[] = [];
    const widths: number[] = [];
    for (const pixels of RUN)
      for (const span of dirtSpans(pixels)) {
        // The path never breaks: every column of a straight run has dirt.
        expect(span).not.toBeNull();
        const [first, last] = span as readonly [number, number];
        tops.push(first);
        widths.push(last - first + 1);
      }
    // The dirt is never thinner than the base width less the roughness.
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(
      Math.floor(2 * (halfWidth - roughness)) - 1,
    );
    expect(Math.max(...widths)).toBeLessThanOrEqual(
      Math.ceil(2 * (halfWidth + roughness)) + 1,
    );
    // It swells and narrows by several pixels along the run.
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThanOrEqual(4);
    // The upper edge wanders over several rows and steps often: its longest
    // level stretch is a small part of one cell.
    expect(new Set(tops).size).toBeGreaterThanOrEqual(5);
    let steps = 0;
    let level = 1;
    let longestLevel = 1;
    for (let index = 1; index < tops.length; index += 1)
      if (tops[index] === tops[index - 1]) {
        level += 1;
        longestLevel = Math.max(longestLevel, level);
      } else {
        steps += 1;
        level = 1;
      }
    expect(steps).toBeGreaterThan(tops.length / 6);
    expect(longestLevel).toBeLessThan(SIZE / 3);
    // A step of the edge is a pixel or two: chunky, not torn.
    for (let index = 1; index < tops.length; index += 1)
      expect(
        Math.abs((tops[index] as number) - (tops[index - 1] as number)),
      ).toBeLessThanOrEqual(3);
  });

  it("has an edge line with gaps and a few crumbs of dirt outside it", () => {
    const counts = new Map<number, number>();
    for (const pixels of RUN)
      for (const value of pixels)
        counts.set(value, (counts.get(value) ?? 0) + 1);
    const count = (value: number): number => counts.get(value) ?? 0;
    const edge = count(P.EDGE) + count(P.EDGE_SOFT);
    // About one pixel of edge line on each side of the run.
    expect(edge).toBeGreaterThan(RUN.length * SIZE * 2 * 0.8);
    expect(edge).toBeLessThan(RUN.length * SIZE * 2 * 2);
    expect(count(P.EDGE)).toBeGreaterThan(count(P.EDGE_SOFT));
    expect(count(P.EDGE_SOFT)).toBeGreaterThan(edge * 0.1);
    // Crumbs: present in every few cells, never a spray.
    expect(count(P.CRUMB)).toBeGreaterThan(RUN.length * 2);
    expect(count(P.CRUMB)).toBeLessThan(edge * 0.25);
    // Gaps in the edge line: a dirt pixel with the ground straight above.
    let gaps = 0;
    for (const pixels of RUN)
      for (const [column, span] of dirtSpans(pixels).entries())
        if (span !== null && pixels[(span[0] - 1) * SIZE + column] === P.CLEAR)
          gaps += 1;
    expect(gaps).toBeGreaterThan(RUN.length * 2);
    expect(gaps).toBeLessThan(RUN.length * SIZE * 0.2);
  });

  it("has an uneven fill: patches of light and dark earth, ruts along the run, pebbles", () => {
    const counts = new Map<number, number>();
    for (const pixels of RUN)
      for (const value of pixels)
        counts.set(value, (counts.get(value) ?? 0) + 1);
    const count = (value: number): number => counts.get(value) ?? 0;
    const dirt =
      count(P.DIRT) +
      count(P.DIRT_DARK) +
      count(P.DIRT_LIGHT) +
      count(P.RUT) +
      count(P.PEBBLE);
    // No tone is the whole fill, and each patch tone is a real share.
    expect(count(P.DIRT) / dirt).toBeLessThan(0.6);
    expect(count(P.DIRT_DARK) / dirt).toBeGreaterThan(0.12);
    expect(count(P.DIRT_LIGHT) / dirt).toBeGreaterThan(0.12);
    expect(count(P.RUT) / dirt).toBeGreaterThan(0.04);
    expect(count(P.RUT) / dirt).toBeLessThan(0.2);
    expect(count(P.PEBBLE)).toBeGreaterThan(RUN.length);
    expect(count(P.PEBBLE) / dirt).toBeLessThan(0.03);
    // Patches, not salt and pepper: most light pixels touch another one.
    let light = 0;
    let joined = 0;
    for (const pixels of RUN)
      for (let row = 1; row < SIZE - 1; row += 1)
        for (let column = 1; column < SIZE - 1; column += 1) {
          if (pixels[row * SIZE + column] !== P.DIRT_LIGHT) continue;
          light += 1;
          if (
            pixels[row * SIZE + column - 1] === P.DIRT_LIGHT ||
            pixels[row * SIZE + column + 1] === P.DIRT_LIGHT ||
            pixels[(row - 1) * SIZE + column] === P.DIRT_LIGHT ||
            pixels[(row + 1) * SIZE + column] === P.DIRT_LIGHT
          )
            joined += 1;
        }
    expect(joined / light).toBeGreaterThan(0.8);
    // Ruts run along the direction of travel: on a horizontal run a rut
    // pixel has a rut pixel beside it far more often than above it.
    let along = 0;
    let across = 0;
    for (const pixels of RUN)
      for (let row = 1; row < SIZE; row += 1)
        for (let column = 1; column < SIZE; column += 1) {
          if (pixels[row * SIZE + column] !== P.RUT) continue;
          if (pixels[row * SIZE + column - 1] === P.RUT) along += 1;
          if (pixels[(row - 1) * SIZE + column] === P.RUT) across += 1;
        }
    expect(along).toBeGreaterThan(across * 4);
    // The cell centre is churned earth: no rut within a few pixels of it.
    for (const pixels of RUN)
      for (let column = SIZE / 2 - 6; column < SIZE / 2 + 6; column += 1)
        for (let row = SIZE / 2 - 3; row < SIZE / 2 + 3; row += 1)
          if (pixels[row * SIZE + column] === P.RUT)
            // Only as the shadow of a pebble to its lower left.
            expect(pixels[(row + 1) * SIZE + column - 1]).toBe(P.PEBBLE);
  });

  it("is the same on every call, and a link is unchanged by its cells' other links", () => {
    const cell = straight(4, 2);
    const first = dirtRoadPixelsV7(cell);
    expect(dirtRoadPixelsV7(straight(4, 2))).toEqual(first);
    expect(dirtRoadRunsV7(cell, "FILL")).toEqual(dirtRoadRunsV7(cell, "FILL"));
    // Another cell is another piece of the world: not a repeated tile.
    expect(dirtRoadPixelsV7(straight(5, 2))).not.toEqual(first);
    // A new neighbour only adds: the dirt that was there stays dirt, and
    // away from the new link no pixel changes at all.
    const joined = dirtRoadPixelsV7({
      ...cell,
      neighbours: [...cell.neighbours, at(4, 1)],
    });
    let added = 0;
    for (let row = 0; row < SIZE; row += 1)
      for (let column = 0; column < SIZE; column += 1) {
        const index = row * SIZE + column;
        if (isDirt(first[index])) expect(isDirt(joined[index])).toBe(true);
        else if (isDirt(joined[index])) added += 1;
        const nearNewLink =
          row < SIZE / 2 + DIRT_ROAD_REACH_V7 + 1 &&
          Math.abs(column + 0.5 - SIZE / 2) <
            DIRT_ROAD_REACH_V7 + DIRT_ROAD_V7.wobble / UNIT + 1;
        if (!nearNewLink) expect(joined[index]).toBe(first[index]);
      }
    expect(added).toBeGreaterThan(100);
  });

  it("stays one connected path across cell edges, junctions, bends, diagonals and dead ends", () => {
    for (const cells of [
      // A straight run and a column.
      [at(0, 0), at(1, 0), at(2, 0), at(3, 0)],
      [at(2, 0), at(2, 1), at(2, 2)],
      // A bend, a T and a cross (with the diagonal shortcuts they bring).
      [at(0, 0), at(1, 0), at(1, 1)],
      [at(0, 1), at(1, 1), at(2, 1), at(1, 0)],
      [at(0, 1), at(1, 1), at(2, 1), at(1, 0), at(1, 2)],
      // Diagonal runs both ways, and a zigzag.
      [at(0, 0), at(1, 1), at(2, 2)],
      [at(2, 0), at(1, 1), at(0, 2)],
      [at(0, 0), at(1, 1), at(2, 0), at(3, 1)],
      // Negative coordinates are just more world.
      [at(-2, -1), at(-1, -1), at(-1, 0)],
    ]) {
      const entries = network(cells);
      const dirt = dirtOfWorld(entries);
      const reached = reachFrom(dirt, centreOf(cells[0] as CoordV7));
      for (const cell of cells)
        expect(reached.has(centreOf(cell).join())).toBe(true);
    }
    // Across a shared side the two cells' dirt lines up to within the
    // roughness of one pixel step.
    for (let x = 0; x < 8; x += 1) {
      const west = dirtSpans(dirtRoadPixelsV7(straight(x, 5)))[SIZE - 1];
      const east = dirtSpans(dirtRoadPixelsV7(straight(x + 1, 5)))[0];
      expect(west).not.toBeNull();
      expect(east).not.toBeNull();
      expect(Math.abs((west?.[0] ?? 0) - (east?.[0] ?? 0))).toBeLessThanOrEqual(
        2,
      );
      expect(Math.abs((west?.[1] ?? 0) - (east?.[1] ?? 0))).toBeLessThanOrEqual(
        2,
      );
    }
  });

  it("keeps a link to its own side of the cell, ends a dead end at the centre and gives a lone Road a small patch", () => {
    const reach = Math.ceil(DIRT_ROAD_REACH_V7 + DIRT_ROAD_V7.wobble / UNIT);
    // The side band of the old strokes: 24 world units from the centre line.
    expect(reach * UNIT).toBeLessThan(TILE_WIDTH / 2 - 40);
    for (let x = 0; x < 6; x += 1) {
      // A dead end (or the last explored Road before the fog): linked to
      // the west only. Nothing, not even a crumb, lies east of the centre
      // beyond the track's own reach, so no stub points at a hidden Road.
      const deadEnd = dirtRoadPixelsV7({
        at: at(x, 2),
        neighbours: [at(x - 1, 2)],
        joins: [],
        isolated: false,
      });
      for (let row = 0; row < SIZE; row += 1)
        for (let column = 0; column < SIZE; column += 1) {
          if (deadEnd[row * SIZE + column] === P.CLEAR) continue;
          expect(column).toBeLessThan(SIZE / 2 + reach);
          expect(Math.abs(row + 0.5 - SIZE / 2)).toBeLessThan(reach);
        }
      // It is a dead end of the very path a through road has: west of the
      // centre the two are the same pixels.
      const through = dirtRoadPixelsV7(straight(x, 2));
      for (let row = 0; row < SIZE; row += 1)
        for (let column = 0; column < SIZE / 2 - reach; column += 1)
          expect(deadEnd[row * SIZE + column]).toBe(
            through[row * SIZE + column],
          );
      expect(isDirt(deadEnd[(SIZE / 2) * SIZE + SIZE / 2])).toBe(true);
      // A Road with no neighbour: a patch round the centre.
      const lone = dirtRoadPixelsV7({
        at: at(x, 2),
        neighbours: [],
        joins: [],
        isolated: true,
      });
      let dirt = 0;
      for (let row = 0; row < SIZE; row += 1)
        for (let column = 0; column < SIZE; column += 1) {
          if (lone[row * SIZE + column] === P.CLEAR) continue;
          expect(Math.abs(column + 0.5 - SIZE / 2)).toBeLessThan(
            reach + 4 / UNIT,
          );
          expect(Math.abs(row + 0.5 - SIZE / 2)).toBeLessThan(reach);
          if (isDirt(lone[row * SIZE + column])) dirt += 1;
        }
      expect(dirt).toBeGreaterThan(40);
    }
    // No links and not isolated (a city with no Road beside it): nothing.
    expect(
      dirtRoadPixelsV7({
        at: at(1, 1),
        neighbours: [],
        joins: [],
        isolated: false,
      }).some((value) => value !== P.CLEAR),
    ).toBe(false);
    // A corner join paints only the corner the diagonal crosses.
    const join = dirtRoadPixelsV7({
      at: at(1, 1),
      neighbours: [],
      joins: [[at(0, 1), at(1, 0)]],
      isolated: false,
    });
    let joinDirt = 0;
    for (let row = 0; row < SIZE; row += 1)
      for (let column = 0; column < SIZE; column += 1) {
        if (join[row * SIZE + column] === P.CLEAR) continue;
        expect(row + column).toBeLessThan(2 * reach);
        if (isDirt(join[row * SIZE + column])) joinDirt += 1;
      }
    expect(joinDirt).toBeGreaterThan(4);
  });

  it("splits a cell into a dark underlay and the dirt, as runs of whole pixels", () => {
    const cell = straight(2, 2);
    const pixels = dirtRoadPixelsV7(cell);
    const paint = (layer: "CASING" | "FILL"): Map<number, string> => {
      const painted = new Map<number, string>();
      for (const run of dirtRoadRunsV7(cell, layer)) {
        expect(Number.isInteger(run.x) && Number.isInteger(run.y)).toBe(true);
        expect(run.length).toBeGreaterThanOrEqual(1);
        expect(run.x + run.length).toBeLessThanOrEqual(SIZE);
        for (let column = run.x; column < run.x + run.length; column += 1) {
          // No pixel is painted twice in a layer.
          expect(painted.has(run.y * SIZE + column)).toBe(false);
          painted.set(run.y * SIZE + column, run.colour);
        }
      }
      return painted;
    };
    const casing = paint("CASING");
    const fill = paint("FILL");
    for (let index = 0; index < pixels.length; index += 1) {
      const value = pixels[index] as number;
      // The underlay covers every painted pixel, dark under the dirt.
      expect(casing.has(index)).toBe(value !== P.CLEAR);
      expect(fill.has(index)).toBe(isDirt(value));
      if (isDirt(value)) {
        expect(casing.get(index)).toBe(DIRT_ROAD_V7.casing);
        expect(FILL_COLOURS).toContain(fill.get(index));
      } else if (value !== P.CLEAR)
        expect(CASING_COLOURS).toContain(casing.get(index));
    }
  });

  it("draws a layer as one cached sprite, snapped to the cell like its ground tile", () => {
    const cell = straight(3, 4);
    const frame = spriteContext();
    // Zoom step 1 (80 CSS px a cell) on a DPR-1 screen, off the pixel grid.
    drawDirtRoadV7(frame.context, cell, 500.3, 400.4, 0.625, "CASING", 1);
    drawDirtRoadV7(frame.context, cell, 500.3, 400.4, 0.625, "FILL", 1);
    expect(frame.sprites).toHaveLength(2);
    expect(frame.draws).toHaveLength(2);
    for (const [index, sprite] of frame.sprites.entries()) {
      // Cut to the painted pixels, out to a multiple of four art pixels.
      expect(sprite.width).toBe(SIZE);
      expect(sprite.height % 4).toBe(0);
      expect(sprite.height).toBeLessThan(SIZE / 2);
      expect(sprite.rects).toBeGreaterThan(20);
      const [image, x, y, width, height] = frame.draws[index]?.args as [
        unknown,
        number,
        number,
        number,
        number,
      ];
      expect(image).toBe(sprite);
      // One art pixel is one screen pixel, on whole pixels, unsmoothed.
      expect(x).toBe(460);
      expect(Number.isInteger(y)).toBe(true);
      expect(width).toBe(sprite.width);
      expect(height).toBe(sprite.height);
      expect(frame.draws[index]?.smoothing).toBe(false);
    }
    // The caller's smoothing setting is put back.
    expect(frame.context.imageSmoothingEnabled).toBe(true);
    // A second frame, and a frame at another zoom or camera, paint nothing
    // new: the same two sprites are drawn again.
    drawDirtRoadV7(frame.context, cell, 500.3, 400.4, 0.625, "FILL", 1);
    drawDirtRoadV7(frame.context, cell, 120, 90, 1.25, "FILL", 2);
    drawDirtRoadV7(frame.context, cell, 120, 90, 0.46875, "CASING", 1);
    expect(frame.sprites).toHaveLength(2);
    expect(frame.draws.map((entry) => entry.args[0])).toEqual([
      frame.sprites[0],
      frame.sprites[1],
      frame.sprites[1],
      frame.sprites[1],
      frame.sprites[0],
    ]);
    // Zoom step 2 at DPR 2 is a whole scale; step 0.75 is not, and is
    // smoothed like the ground.
    expect(frame.draws[3]?.smoothing).toBe(false);
    expect(frame.draws[3]?.args[3]).toBe(SIZE * 2);
    expect(frame.draws[4]?.smoothing).toBe(true);
    expect(frame.draws[4]?.args[3]).toBe(SIZE * 0.75);
    // A cell with other links is another sprite pair.
    drawDirtRoadV7(
      frame.context,
      { ...cell, neighbours: [at(2, 4)] },
      500,
      400,
      0.625,
      "FILL",
      1,
    );
    expect(frame.sprites).toHaveLength(4);
  });

  it("draws the same pixels from both cells of a link, each inside its own square", () => {
    for (const zoom of [0.625, 1.25]) {
      const cells = [at(3, 4), at(4, 4)] as const;
      const drawn = new Map<string, unknown>();
      for (const cell of cells) {
        const recording = recordingContext();
        const x = 500 + (cell.x - 3) * TILE_WIDTH * zoom;
        drawDirtRoadV7(
          recording.context,
          {
            at: cell,
            neighbours: [cell === cells[0] ? cells[1] : cells[0]],
            joins: [],
            isolated: false,
          },
          x,
          400,
          zoom,
          "FILL",
        );
        expect(recording.rects.length).toBeGreaterThan(20);
        const scale = (TILE_WIDTH * zoom) / SIZE;
        for (const { colour, rect } of recording.rects) {
          const [left, top, width, height] = rect as [
            number,
            number,
            number,
            number,
          ];
          // Inside the cell's own square.
          expect(left).toBeGreaterThanOrEqual(x - 64 * zoom - 1e-9);
          expect(left + width).toBeLessThanOrEqual(x + 64 * zoom + 1e-9);
          expect(height).toBeCloseTo(scale, 9);
          for (let step = 0; step < Math.round(width / scale); step += 1) {
            const pixel = `${Math.round((left - 500) / scale) + step},${Math.round((top - 400) / scale)}`;
            expect(drawn.has(pixel)).toBe(false);
            drawn.set(pixel, colour);
          }
        }
      }
      // Together they are the world's dirt for that link.
      const dirt = dirtOfWorld(
        cells.map((cell) => ({
          at: cell,
          neighbours: [cell === cells[0] ? cells[1] : cells[0]],
          joins: [],
          isolated: false,
        })),
      );
      for (const pixel of drawn.keys()) {
        const [x, y] = pixel.split(",").map(Number) as [number, number];
        expect(dirt(x + 3 * SIZE + SIZE / 2, y + 4 * SIZE + SIZE / 2)).toBe(
          true,
        );
      }
    }
  });

  it("draws the live look's every underlay, then every dirt fill, identically on each redraw", () => {
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
    const colours = first.rects.map((entry) => entry.colour);
    const lastCasing = Math.max(
      ...CASING_COLOURS.map((colour) => colours.lastIndexOf(colour)),
    );
    const firstFill = Math.min(
      ...FILL_COLOURS.map((colour) => colours.indexOf(colour)).filter(
        (index) => index >= 0,
      ),
    );
    expect(lastCasing).toBeGreaterThan(-1);
    expect(firstFill).toBeGreaterThan(lastCasing);
    for (const colour of [...CASING_COLOURS, ...FILL_COLOURS])
      expect(colours).toContain(colour);
    // No cobblestone or black casing of the BOLD look, and no strokes.
    for (const [colour] of CHIBI_ROAD_STROKES_V7)
      expect([...colours, ...first.strokes]).not.toContain(colour);
    // The isolated Road's patch is drawn in its own square (cell 4,4).
    const patch = first.rects.filter(
      ({ colour, rect }) =>
        colour === DIRT_ROAD_V7.fill && (rect[0] as number) > 64 + 3.5 * 80,
    );
    expect(patch.length).toBeGreaterThan(2);
    for (const { rect } of patch) {
      expect(rect[0]).toBeGreaterThan(64 + 4 * 80 - 20);
      expect(rect[1]).toBeGreaterThan(64 + 4 * 80 - 20);
    }
    // Never random per frame.
    expect(draw(roads).log).toEqual(first.log);
    // At another zoom every pixel scales about the camera origin.
    const zoomed = draw(roads, LIVE_DIRECTION_V7, 1.25);
    const roadRects = (
      recording: ReturnType<typeof recordingContext>,
    ): typeof recording.rects =>
      recording.rects.filter(({ colour }) =>
        [...CASING_COLOURS, ...FILL_COLOURS].includes(String(colour)),
      );
    const small = roadRects(first);
    const large = roadRects(zoomed);
    expect(large).toHaveLength(small.length);
    for (const [index, { colour, rect }] of small.entries()) {
      expect(large[index]?.colour).toBe(colour);
      const scaled = large[index]?.rect ?? [];
      expect(((scaled[0] as number) - 64) / 2).toBeCloseTo(
        (rect[0] as number) - 64,
        6,
      );
      expect(((scaled[1] as number) - 64) / 2).toBeCloseTo(
        (rect[1] as number) - 64,
        6,
      );
      expect((scaled[2] as number) / 2).toBeCloseTo(rect[2] as number, 6);
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
    for (const colour of [...CASING_COLOURS, ...FILL_COLOURS])
      expect(bold.rects.map((entry) => entry.colour)).not.toContain(colour);
    expect(bold.strokes).toEqual(
      CHIBI_ROAD_STROKES_V7.map(([colour]) => colour),
    );
  });
});
