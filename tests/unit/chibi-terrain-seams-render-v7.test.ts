import { describe, expect, it, vi } from "vitest";
import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  createChibiArtResolverV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
  type ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  CHIBI_ZOOM_STEPS,
  chibiCameraZoom,
  chibiDestinationRect,
  chibiMasterScale,
  chibiTerrainPartRect,
  snapCameraToDevicePixels,
  type ChibiDestinationRectV7,
} from "../../src/render/canvas/chibi-geometry-v7";
import { TILE_WIDTH, type CameraState } from "../../src/render/canvas/geometry";

/**
 * pulp_wars-51t: at CHIBI zoom 0.75 on DPR 2 and 3 screens a faint
 * horizontal seam crossed the top of every Forest and Mountain cell. The
 * owning cell was drawn from a sub-rectangle of the tall master with
 * bilinear smoothing, which blended the transparent overflow row above it
 * into the cell's top device row. Tall terrain now draws each part from its
 * own raster at smoothed scales, and every terrain edge lands on a whole
 * device pixel from a boundary it shares with its neighbour.
 */

type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                log.push([String(key), ...args]);
              },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

const legacyImages = {
  resolve: (assetId: string) =>
    ({ legacy: assetId }) as unknown as CanvasImageSource,
};

const tall = (subject: ArtSubjectV7, id: string): ChibiArtAssetV7 => ({
  id,
  subject,
  assetClass: "TALL_TERRAIN",
  width: 80,
  height: 104,
  url: `/fixture/${id}.png`,
  layers: {
    bodyUrl: `/fixture/${id}.body.png`,
    groundUrl: "/fixture/grass.png",
  },
});
const forest = tall("TERRAIN:FOREST", "forest");
const mountain = tall("TERRAIN:MOUNTAIN", "mountain");
const grass: ChibiArtAssetV7 = {
  id: "grass",
  subject: "TERRAIN:GRASS",
  assetClass: "TERRAIN",
  width: 80,
  height: 80,
  url: "/fixture/grass.png",
};

const tag = (kind: string, id: string) =>
  ({ [kind]: id }) as unknown as CanvasImageSource;

/** Ready rasters as the resolver offers them at the given smoothing. */
function fakeChibi(options: {
  readonly smoothing: boolean;
  readonly parts: boolean;
}): ChibiBoardArtV7 {
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = [forest, mountain, grass].find(
        (candidate) => candidate.subject === request.subject,
      );
      if (asset === undefined) return { kind: "MISSING" };
      const isTall = asset.assetClass === "TALL_TERRAIN";
      return {
        kind: "READY",
        asset,
        image: tag("chibi", asset.id),
        density: 1,
        smoothing: options.smoothing,
        cacheKey: `chibi:${asset.id}`,
        ...(isTall
          ? {
              layers: {
                ground: tag("ground", asset.id),
                body: tag("body", asset.id),
              },
            }
          : {}),
        ...(isTall && options.parts
          ? {
              parts: {
                cell: tag("cell", asset.id),
                overflow: tag("overflow", asset.id),
                bodyCell: tag("bodyCell", asset.id),
              },
            }
          : {}),
      };
    },
  };
}

function terrain(
  x: number,
  y: number,
  subject: ArtSubjectV7,
): BoardRenderPlanEntryV7 {
  return {
    key: `terrain:${x},${y}`,
    kind: "TERRAIN",
    layer: 1,
    at: { x, y },
    // Tall terrain is recognised by its legacy asset id.
    assetId:
      subject === "TERRAIN:FOREST"
        ? "terrain-ruleset7-original-forest-1"
        : subject === "TERRAIN:MOUNTAIN"
          ? "terrain-ruleset7-revision3-mountain-1"
          : "terrain-ruleset7-original-grass-1",
    artSubject: subject,
  };
}

const plan = (
  entries: readonly BoardRenderPlanEntryV7[],
): BoardRenderPlanV7 => ({ version: 7, entries, targets: [] });

function draw(
  entries: readonly BoardRenderPlanEntryV7[],
  input: {
    readonly step: number;
    readonly devicePixelRatio: number;
    readonly chibiArt: ChibiBoardArtV7;
    readonly offsetX?: number;
    readonly offsetY?: number;
  },
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: input.devicePixelRatio,
    camera: {
      offsetX: input.offsetX ?? 40,
      offsetY: input.offsetY ?? 64,
      zoom: chibiCameraZoom(input.step as 0.75),
    },
    plan: plan(entries),
    images: legacyImages,
    artSet: "CHIBI",
    chibiArt: input.chibiArt,
  });
  return log;
}

const imageDraws = (log: readonly LogEntry[]): unknown[][] =>
  log.filter((call) => call[0] === "drawImage").map((call) => call.slice(1));

describe("CHIBI tall terrain at zoom 0.75", () => {
  // Cell (1,1) at step 0.75: 60 CSS px cells, centre (100, 124). The 80 x
  // 104 master's origin is (70, 76); its 24-row overflow is 18 CSS px tall.
  const CELL = [70, 94, 60, 60] as const;
  const OVERFLOW = [70, 76, 60, 18] as const;

  it("draws the owning cell and the overflow from their own rasters, smoothed", () => {
    const log = draw([terrain(1, 1, "TERRAIN:FOREST")], {
      step: 0.75,
      devicePixelRatio: 3,
      chibiArt: fakeChibi({ smoothing: true, parts: true }),
    });
    expect(imageDraws(log)).toEqual([
      [tag("cell", "forest"), 0, 0, 80, 80, ...CELL],
      [tag("overflow", "forest"), 0, 0, 80, 24, ...OVERFLOW],
    ]);
    const smoothing = log.filter(
      (call) => call[0] === "set" && call[1] === "imageSmoothingEnabled",
    );
    expect(smoothing.map((call) => call[2])).toEqual([true, true]);
  });

  it("draws the body's owning cell from its own raster over a Road", () => {
    const log = draw(
      [
        terrain(1, 1, "TERRAIN:MOUNTAIN"),
        {
          key: "road:1,1",
          kind: "ROAD",
          layer: 2,
          at: { x: 1, y: 1 },
          roadNeighbors: [{ x: 2, y: 1 }],
        },
      ],
      {
        step: 0.75,
        devicePixelRatio: 2,
        chibiArt: fakeChibi({ smoothing: true, parts: true }),
      },
    );
    expect(imageDraws(log)).toEqual([
      // The 80 x 80 ground tile is a whole image already.
      [tag("ground", "mountain"), 0, 0, 80, 80, ...CELL],
      [tag("bodyCell", "mountain"), 0, 0, 80, 80, ...CELL],
      [tag("overflow", "mountain"), 0, 0, 80, 24, ...OVERFLOW],
    ]);
  });

  it("falls back to master sub-rectangles when no part rasters exist", () => {
    const log = draw([terrain(1, 1, "TERRAIN:FOREST")], {
      step: 0.75,
      devicePixelRatio: 3,
      chibiArt: fakeChibi({ smoothing: true, parts: false }),
    });
    expect(imageDraws(log)).toEqual([
      [tag("chibi", "forest"), 0, 24, 80, 80, ...CELL],
      [tag("chibi", "forest"), 0, 0, 80, 24, ...OVERFLOW],
    ]);
  });

  it("keeps whole scales drawing master sub-rectangles exactly as before", () => {
    for (const devicePixelRatio of [1, 2, 3]) {
      const log = draw([terrain(1, 1, "TERRAIN:FOREST")], {
        step: 1,
        devicePixelRatio,
        chibiArt: fakeChibi({ smoothing: false, parts: false }),
      });
      // Step 1: centre (120, 144), master origin (80, 80), 1:1.
      expect(imageDraws(log)).toEqual([
        [tag("chibi", "forest"), 0, 24, 80, 80, 80, 104, 80, 80],
        [tag("chibi", "forest"), 0, 0, 80, 24, 80, 80, 80, 24],
      ]);
    }
  });
});

describe("CHIBI terrain cells abut on whole device pixels", () => {
  const subjects: readonly ArtSubjectV7[] = [
    "TERRAIN:GRASS",
    "TERRAIN:FOREST",
    "TERRAIN:MOUNTAIN",
  ];
  const entries: BoardRenderPlanEntryV7[] = [];
  for (let y = 0; y < 4; y += 1)
    for (let x = 0; x < 5; x += 1)
      entries.push(terrain(x, y, subjects[(x + 2 * y) % 3] ?? "TERRAIN:GRASS"));

  interface DeviceRect {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  }

  /** Terrain draws keyed by cell, as device-pixel edges. */
  function deviceRects(
    log: readonly LogEntry[],
    devicePixelRatio: number,
  ): Map<string, { cell?: DeviceRect; overflow?: DeviceRect }> {
    const rects = new Map<
      string,
      { cell?: DeviceRect; overflow?: DeviceRect }
    >();
    // Draw order: every cell's ground part in plan order, then overflows.
    let groundIndex = 0;
    let overflowIndex = 0;
    const tallEntries = entries.filter(
      (entry) => entry.artSubject !== "TERRAIN:GRASS",
    );
    for (const call of imageDraws(log)) {
      const [x = NaN, y = NaN, w = NaN, h = NaN] = call.slice(5) as number[];
      const device: DeviceRect = {
        left: x * devicePixelRatio,
        top: y * devicePixelRatio,
        right: (x + w) * devicePixelRatio,
        bottom: (y + h) * devicePixelRatio,
      };
      const isOverflow = call[4] === 24;
      const entry = isOverflow
        ? tallEntries[overflowIndex++]
        : entries[groundIndex++];
      const key = `${entry?.at.x},${entry?.at.y}`;
      rects.set(key, {
        ...rects.get(key),
        [isOverflow ? "overflow" : "cell"]: device,
      });
    }
    return rects;
  }

  const cases = [
    { devicePixelRatio: 1, offsetX: 40, offsetY: 64 },
    { devicePixelRatio: 2, offsetX: 13.37, offsetY: 41.9 },
    { devicePixelRatio: 3, offsetX: 7.21, offsetY: 99.5 },
  ];
  for (const { devicePixelRatio, offsetX, offsetY } of cases)
    it(`leaves no gap or overlap at zoom 0.75 on DPR ${devicePixelRatio}`, () => {
      const log = draw(entries, {
        step: 0.75,
        devicePixelRatio,
        offsetX,
        offsetY,
        chibiArt: fakeChibi({ smoothing: true, parts: true }),
      });
      const rects = deviceRects(log, devicePixelRatio);
      expect(rects.size).toBe(20);
      expect(
        [...rects.values()].filter((rect) => rect.overflow !== undefined),
      ).toHaveLength(13);
      const cellSize = 60 * devicePixelRatio;
      const whole = (rect: DeviceRect) => {
        for (const edge of Object.values(rect))
          expect(Math.abs(edge - Math.round(edge))).toBeLessThan(1e-9);
      };
      for (const [key, { cell, overflow }] of rects) {
        const [x = NaN, y = NaN] = key.split(",").map(Number);
        if (cell === undefined) throw new Error(`no cell part for ${key}`);
        whole(cell);
        expect(cell.right - cell.left).toBeCloseTo(cellSize, 9);
        expect(cell.bottom - cell.top).toBeCloseTo(cellSize, 9);
        if (overflow !== undefined) {
          whole(overflow);
          // The overflow meets its own cell on the shared split row.
          expect(overflow.bottom).toBeCloseTo(cell.top, 9);
          expect([overflow.left, overflow.right]).toEqual([
            cell.left,
            cell.right,
          ]);
          expect(overflow.bottom - overflow.top).toBeCloseTo(
            18 * devicePixelRatio,
            9,
          );
        }
        const right = rects.get(`${x + 1},${y}`)?.cell;
        if (right !== undefined) expect(right.left).toBeCloseTo(cell.right, 9);
        const below = rects.get(`${x},${y + 1}`)?.cell;
        if (below !== undefined) expect(below.top).toBeCloseTo(cell.bottom, 9);
      }
    });
});

describe("chibiTerrainPartRect", () => {
  const camera = (step: number, offsetX: number, offsetY: number) => ({
    zoom: chibiCameraZoom(step as 0.75),
    offsetX,
    offsetY,
  });
  const centre = (cam: CameraState, x: number, y: number) => ({
    x: cam.offsetX + x * TILE_WIDTH * cam.zoom,
    y: cam.offsetY + y * TILE_WIDTH * cam.zoom,
  });
  const device = (rect: ChibiDestinationRectV7, ratio: number) => ({
    left: Math.round(rect.x * ratio),
    top: Math.round(rect.y * ratio),
    right: Math.round((rect.x + rect.width) * ratio),
    bottom: Math.round((rect.y + rect.height) * ratio),
  });

  it("equals the anchored master rect wherever it is already on whole device pixels", () => {
    for (const step of CHIBI_ZOOM_STEPS)
      for (const ratio of [1, 2, 3]) {
        const cam = snapCameraToDevicePixels(camera(step, 31.4, 17.7), ratio);
        const scale = chibiMasterScale(cam);
        for (const asset of [forest, grass]) {
          const at = centre(cam, 2, 3);
          const master = chibiDestinationRect(at, cam, asset, ratio);
          const up = asset === forest ? 24 : 0;
          expect(chibiTerrainPartRect(at, cam, asset, ratio, "CELL")).toEqual({
            x: master.x,
            y: master.y + up * scale,
            width: master.width,
            height: (asset.height - up) * scale,
          });
          if (up > 0)
            expect(
              chibiTerrainPartRect(at, cam, asset, ratio, "OVERFLOW"),
            ).toEqual({ ...master, height: up * scale });
        }
      }
  });

  it("shares every boundary even at a fractional device pixel ratio", () => {
    for (const ratio of [1.25, 1.75, 2.625])
      for (const step of CHIBI_ZOOM_STEPS) {
        const cam = snapCameraToDevicePixels(camera(step, 12.3, 45.6), ratio);
        for (let y = 0; y < 3; y += 1)
          for (let x = 0; x < 3; x += 1) {
            const here = device(
              chibiTerrainPartRect(
                centre(cam, x, y),
                cam,
                forest,
                ratio,
                "CELL",
              ),
              ratio,
            );
            const overflow = device(
              chibiTerrainPartRect(
                centre(cam, x, y),
                cam,
                forest,
                ratio,
                "OVERFLOW",
              ),
              ratio,
            );
            const right = device(
              chibiTerrainPartRect(
                centre(cam, x + 1, y),
                cam,
                grass,
                ratio,
                "CELL",
              ),
              ratio,
            );
            const below = device(
              chibiTerrainPartRect(
                centre(cam, x, y + 1),
                cam,
                grass,
                ratio,
                "CELL",
              ),
              ratio,
            );
            expect(overflow.bottom).toBe(here.top);
            expect(right.left).toBe(here.right);
            expect(below.top).toBe(here.bottom);
          }
      }
  });
});

describe("CHIBI tall-terrain part rasters", () => {
  /** Pixels whose red channel is the row index; surfaces record their rows. */
  function environment(options: { readonly readable: boolean }) {
    const pending = new Map<string, (ok: boolean) => void>();
    const env: ChibiRasterEnvironmentV7 = {
      loadImage: vi.fn((url: string, settle: (ok: boolean) => void) => {
        pending.set(url, settle);
        return { url } as unknown as CanvasImageSource;
      }),
      readPixels: vi.fn((image, width, height) => {
        if (!options.readable) return null;
        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let row = 0; row < height; row += 1)
          for (let column = 0; column < width; column += 1)
            pixels.set([row, 0, 0, 255], (row * width + column) * 4);
        void image;
        return pixels;
      }),
      createSurface: vi.fn(
        (pixels, width, height) =>
          ({
            width,
            height,
            firstRow: pixels[0],
            lastRow: pixels[(height - 1) * width * 4],
            length: pixels.length,
          }) as unknown as CanvasImageSource,
      ),
    };
    const settleAll = () => {
      for (const [url, settle] of [...pending]) {
        pending.delete(url);
        settle(true);
      }
    };
    return { env, settleAll };
  }
  const request = (subject: ArtSubjectV7, deviceScale: number) => ({
    subject,
    at: { x: 0, y: 0 },
    deviceScale,
  });
  const surface = (width: number, height: number, first: number) => ({
    width,
    height,
    firstRow: first,
    lastRow: first + height - 1,
    length: width * height * 4,
  });

  function ready(readable = true) {
    const { env, settleAll } = environment({ readable });
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7([forest, grass]).registry,
    });
    // Master, then both layers.
    for (let i = 0; i < 3; i += 1) {
      resolver.resolve(request("TERRAIN:FOREST", 2.25));
      settleAll();
    }
    return { env, resolver };
  }

  it("slices the master and the body at the overflow row at a smoothed scale", () => {
    const { resolver } = ready();
    const small = resolver.resolve(request("TERRAIN:FOREST", 2.25));
    if (small.kind !== "READY") throw new Error("forest not ready");
    expect(small.smoothing).toBe(true);
    expect(small.parts).toEqual({
      cell: surface(80, 80, 24),
      overflow: surface(80, 24, 0),
      bodyCell: surface(80, 80, 24),
    });
  });

  it("offers no parts at whole scales or for flat terrain", () => {
    const { resolver } = ready();
    for (const deviceScale of [1, 2, 3]) {
      const whole = resolver.resolve(request("TERRAIN:FOREST", deviceScale));
      expect(whole.kind === "READY" && whole.parts).toBe(undefined);
    }
    resolver.resolve(request("TERRAIN:GRASS", 2.25));
    const flat = resolver.resolve(request("TERRAIN:GRASS", 2.25));
    expect(flat.kind).toBe("READY");
    expect(flat.kind === "READY" && flat.parts).toBe(undefined);
  });

  it("reads each raster once and keeps the sub-rectangle draw when readback fails", () => {
    const { env, resolver } = ready(false);
    const calls = vi.mocked(env.readPixels).mock.calls.length;
    for (let i = 0; i < 3; i += 1) {
      const small = resolver.resolve(request("TERRAIN:FOREST", 0.75));
      expect(small.kind === "READY" && small.parts).toBe(undefined);
    }
    expect(vi.mocked(env.readPixels).mock.calls.length).toBe(calls);
  });
});
