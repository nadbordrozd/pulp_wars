import { describe, expect, it, vi } from "vitest";
import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_ROAD_STROKES_V7,
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
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";

/**
 * pulp_wars-yyy: in the CHIBI art set a Road (or a corner join) on Forest,
 * Mountain or Mine passes under the tree or rock body, as in LEGACY. The
 * cell draws its ground tile, then Roads, then the body's owning cell, then
 * pieces; the upward overflow keeps its row-ordered foreground slot.
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
  resolveTerrainGround: (assetId: string) =>
    ({ legacyGround: assetId }) as unknown as CanvasImageSource,
  resolveRaisedTerrain: (assetId: string) =>
    ({ legacyRaised: assetId }) as unknown as CanvasImageSource,
};

const tall = (
  subject: ArtSubjectV7,
  id: string,
  layers = true,
): ChibiArtAssetV7 => ({
  id,
  subject,
  assetClass: "TALL_TERRAIN",
  width: 80,
  height: 104,
  url: `/fixture/${id}.png`,
  ...(layers
    ? {
        layers: {
          bodyUrl: `/fixture/${id}.body.png`,
          groundUrl: "/fixture/grass-1.png",
        },
      }
    : {}),
});

const forest = tall("TERRAIN:FOREST", "forest");
const mountain = tall("TERRAIN:MOUNTAIN", "mountain");
const mine = tall("TERRAIN:MINED_MOUNTAIN", "mine");
const fighter: ChibiArtAssetV7 = {
  id: "fighter",
  subject: "UNIT:FIGHTER",
  assetClass: "STANDARD_UNIT",
  width: 56,
  height: 80,
  url: "/fixture/fighter.png",
};

/** Ready rasters; tall terrain carries its loaded layers unless `bare`. */
function fakeChibi(
  assets: readonly ChibiArtAssetV7[],
  options: { readonly bare?: boolean } = {},
): ChibiBoardArtV7 {
  return {
    resolve: vi.fn((request): ChibiResolutionV7 => {
      const asset = assets.find(
        (candidate) => candidate.subject === request.subject,
      );
      if (asset === undefined) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset,
        image: { chibi: asset.id } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
        ...(asset.layers === undefined || options.bare === true
          ? {}
          : {
              layers: {
                ground: { ground: asset.id } as unknown as CanvasImageSource,
                body: { body: asset.id } as unknown as CanvasImageSource,
              },
            }),
      };
    }),
  };
}

function terrain(
  x: number,
  y: number,
  subject: ArtSubjectV7,
  assetId: string,
): BoardRenderPlanEntryV7 {
  return {
    key: `terrain:${x},${y}`,
    kind: "TERRAIN",
    layer: 1,
    at: { x, y },
    assetId,
    artSubject: subject,
  };
}

function road(
  x: number,
  y: number,
  neighbours: readonly { x: number; y: number }[],
): BoardRenderPlanEntryV7 {
  return {
    key: `road:${x},${y}`,
    kind: "ROAD",
    layer: 2,
    at: { x, y },
    roadNeighbors: neighbours,
  };
}

const plan = (
  entries: readonly BoardRenderPlanEntryV7[],
): BoardRenderPlanV7 => ({
  version: 7,
  entries,
  targets: [],
});

function draw(
  built: BoardRenderPlanV7,
  artSet: "LEGACY" | "CHIBI" | undefined,
  chibiArt?: ChibiBoardArtV7,
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: {
      offsetX: 40,
      offsetY: 64,
      zoom: artSet === "CHIBI" ? chibiCameraZoom(1) : 1,
    },
    plan: built,
    images: legacyImages,
    ...(artSet === undefined ? {} : { artSet }),
    ...(chibiArt === undefined ? {} : { chibiArt }),
  });
  return log;
}

/** Image draws and road strokes, in drawing order. */
function events(log: readonly LogEntry[]): unknown[][] {
  return log.flatMap((call): unknown[][] => {
    if (call[0] === "drawImage") return [call.slice(1)];
    if (call[0] === "set" && call[1] === "strokeStyle")
      return [["stroke", call[2]]];
    return [];
  });
}

const [casing, fill] = CHIBI_ROAD_STROKES_V7;
// Cell (1,1) at zoom 1: centre (120, 144); an 80 x 104 tall master is
// drawn at (80, 80), its owning cell at (80, 104).
const CELL = [80, 104, 80, 80] as const;
const OVERFLOW = [0, 0, 80, 24, 80, 80, 80, 24] as const;

describe("CHIBI Roads under tall terrain", () => {
  it("draws ground, then Roads, then the body, then pieces and the overflow", () => {
    const built = plan([
      terrain(1, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-1"),
      road(1, 1, [{ x: 2, y: 1 }]),
      {
        key: "unit:1,1",
        kind: "UNIT",
        layer: 5,
        at: { x: 1, y: 1 },
        assetId: "unit-original-fighter",
        artSubject: "UNIT:FIGHTER",
      },
    ]);
    const drawn = events(draw(built, "CHIBI", fakeChibi([forest, fighter])));
    expect(drawn).toEqual([
      // Ground pass: the ground tile fills the owning cell.
      [{ ground: forest.id }, 0, 0, 80, 80, ...CELL],
      ["stroke", casing[0]],
      ["stroke", fill[0]],
      // After every Road: the body's owning cell covers the path.
      [{ body: forest.id }, 0, 24, 80, 80, ...CELL],
      // Foreground: the master's upward overflow, then the unit on top.
      [{ chibi: forest.id }, ...OVERFLOW],
      [{ chibi: fighter.id }, 92, 104, 56, 80],
    ]);
  });

  it("routes Roads under Forest, Mountain and Mine bodies, and under a corner join", () => {
    const built = plan([
      terrain(0, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-1"),
      terrain(
        1,
        1,
        "TERRAIN:MOUNTAIN",
        "terrain-ruleset7-revision3-mountain-1",
      ),
      terrain(
        2,
        1,
        "TERRAIN:MINED_MOUNTAIN",
        "terrain-ruleset7-revision3-mined-mountain-1",
      ),
      terrain(3, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-2"),
      {
        key: "road-join:3,1",
        kind: "ROAD_JOIN",
        layer: 1.9,
        at: { x: 3, y: 1 },
        roadJoins: [
          [
            { x: 4, y: 1 },
            { x: 3, y: 2 },
          ],
        ],
      },
      road(0, 1, [{ x: 1, y: 1 }]),
      road(1, 1, [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ]),
      road(2, 1, [{ x: 1, y: 1 }]),
    ]);
    const drawn = events(
      draw(built, "CHIBI", fakeChibi([forest, mountain, mine])),
    );
    const index = (predicate: (event: unknown[]) => boolean): number[] =>
      drawn.flatMap((event, at) => (predicate(event) ? [at] : []));
    const layer = (event: unknown[], kind: string): boolean =>
      typeof event[0] === "object" &&
      event[0] !== null &&
      kind in (event[0] as object);
    const grounds = index((event) => layer(event, "ground"));
    const bodies = index((event) => layer(event, "body"));
    const strokes = index((event) => event[0] === "stroke");
    expect(grounds).toHaveLength(4);
    expect(bodies).toHaveLength(4);
    expect(strokes).toHaveLength(8);
    expect(Math.max(...grounds)).toBeLessThan(Math.min(...strokes));
    expect(Math.max(...strokes)).toBeLessThan(Math.min(...bodies));
    expect(
      bodies.map((at) => (drawn[at]?.[0] as { body: string }).body),
    ).toEqual(["forest", "mountain", "mine", "forest"]);
    // Nothing draws the whole master cell under a Road.
    expect(
      drawn.some(
        (event) => layer(event, "chibi") && event[2] === 24 && event[4] === 80,
      ),
    ).toBe(false);
  });

  it("leaves tall terrain without a Road exactly as before", () => {
    const built = plan([
      terrain(1, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-1"),
      terrain(
        2,
        1,
        "TERRAIN:MOUNTAIN",
        "terrain-ruleset7-revision3-mountain-1",
      ),
      road(3, 1, []),
    ]);
    const withLayers = draw(built, "CHIBI", fakeChibi([forest, mountain]));
    const withoutLayers = draw(
      built,
      "CHIBI",
      fakeChibi([
        tall("TERRAIN:FOREST", "forest", false),
        tall("TERRAIN:MOUNTAIN", "mountain", false),
      ]),
    );
    expect(withLayers).toEqual(withoutLayers);
    expect(events(withLayers).slice(0, 2)).toEqual([
      [{ chibi: forest.id }, 0, 24, 80, 80, ...CELL],
      [{ chibi: mountain.id }, 0, 24, 80, 80, 160, 104, 80, 80],
    ]);
  });

  it("draws the whole master under a Road while its layers are not loaded", () => {
    const built = plan([
      terrain(1, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-1"),
      road(1, 1, [{ x: 2, y: 1 }]),
    ]);
    expect(
      events(draw(built, "CHIBI", fakeChibi([forest], { bare: true }))),
    ).toEqual([
      [{ chibi: forest.id }, 0, 24, 80, 80, ...CELL],
      ["stroke", casing[0]],
      ["stroke", fill[0]],
      [{ chibi: forest.id }, ...OVERFLOW],
    ]);
  });

  it("keeps LEGACY byte-identical: ground, Road, raised body", () => {
    const built = plan([
      terrain(1, 1, "TERRAIN:FOREST", "terrain-ruleset7-original-forest-1"),
      road(1, 1, [{ x: 2, y: 1 }]),
    ]);
    const legacy = draw(built, undefined);
    expect(draw(built, "LEGACY", fakeChibi([forest]))).toEqual(legacy);
    expect(
      events(legacy).map((event) =>
        typeof event[0] === "object" ? event[0] : event,
      ),
    ).toEqual([
      { legacyGround: "terrain-ruleset7-original-forest-1" },
      ["stroke", "#69472e"],
      ["stroke", "#a57a4c"],
      { legacyRaised: "terrain-ruleset7-original-forest-1" },
    ]);
  });
});

describe("CHIBI tall-terrain layer loading", () => {
  function environment(failing: readonly string[] = []) {
    const pending = new Map<string, (ok: boolean) => void>();
    const env: ChibiRasterEnvironmentV7 = {
      loadImage: vi.fn((url: string, settle: (ok: boolean) => void) => {
        pending.set(url, settle);
        return { url } as unknown as CanvasImageSource;
      }),
      readPixels: vi.fn(() => null),
      createSurface: vi.fn(() => null),
    };
    const settleAll = () => {
      for (const [url, settle] of [...pending]) {
        pending.delete(url);
        settle(!failing.includes(url));
      }
    };
    return { env, settleAll };
  }
  const request = {
    subject: "TERRAIN:FOREST" as const,
    at: { x: 0, y: 0 },
    deviceScale: 1,
  };

  it("offers the ground and body once both are loaded, and redraws", () => {
    const { env, settleAll } = environment();
    const redraw = vi.fn();
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw,
      registry: buildChibiArtRegistryV7([forest]).registry,
    });
    expect(resolver.resolve(request).kind).toBe("LOADING");
    settleAll();
    const first = resolver.resolve(request);
    expect(first).toMatchObject({ kind: "READY" });
    expect(first.kind === "READY" && first.layers).toBe(undefined);
    settleAll();
    expect(redraw).toHaveBeenCalled();
    const ready = resolver.resolve(request);
    if (ready.kind !== "READY") throw new Error("forest not ready");
    expect(ready.layers).toEqual({
      ground: { url: "/fixture/grass-1.png" },
      body: { url: "/fixture/forest.body.png" },
    });
    // A fractional scale still uses the density-1 master and its layers.
    const small = resolver.resolve({ ...request, deviceScale: 0.75 });
    expect(small.kind === "READY" && small.layers).toEqual(ready.layers);
  });

  it("keeps drawing the whole master when a layer fails to load", () => {
    const { env, settleAll } = environment(["/fixture/forest.body.png"]);
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7([forest]).registry,
    });
    resolver.resolve(request);
    settleAll();
    resolver.resolve(request);
    settleAll();
    const ready = resolver.resolve(request);
    expect(ready.kind).toBe("READY");
    expect(ready.kind === "READY" && ready.layers).toBe(undefined);
  });

  it("rejects layers on anything but tall terrain", () => {
    const { problems } = buildChibiArtRegistryV7([
      {
        id: "grass",
        subject: "TERRAIN:GRASS",
        assetClass: "TERRAIN",
        width: 80,
        height: 80,
        url: "/fixture/grass.png",
        layers: { bodyUrl: "/b.png", groundUrl: "/g.png" },
      },
    ]);
    expect(problems.join("\n")).toContain(
      "only tall terrain has ground and body layers",
    );
  });
});
