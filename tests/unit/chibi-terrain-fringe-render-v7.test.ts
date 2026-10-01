import { describe, expect, it, vi } from "vitest";
import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  createChibiArtResolverV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
  type ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  CHIBI_FRINGE_CUT,
  CHIBI_FRINGE_EAST,
  CHIBI_FRINGE_END_DEPTH,
  CHIBI_FRINGE_KEEP,
  CHIBI_FRINGE_MAX_CORNER,
  CHIBI_FRINGE_MAX_DEPTH,
  CHIBI_FRINGE_NORTH,
  CHIBI_FRINGE_RIM,
  CHIBI_FRINGE_SOUTH,
  CHIBI_FRINGE_VARIANTS,
  CHIBI_FRINGE_WEST,
  applyChibiFringeMaskV7,
  chibiFringeMaskV7,
  chibiFringeVariantV7,
  chibiMountainFringeEdgesV7,
} from "../../src/render/canvas/chibi-terrain-fringe-v7";

/**
 * pulp_wars-6gd.7: the rocky Mountain ground is cut back to a ragged edge
 * where a Mountain borders other land, and nowhere else.
 */

const ALL =
  CHIBI_FRINGE_NORTH |
  CHIBI_FRINGE_EAST |
  CHIBI_FRINGE_SOUTH |
  CHIBI_FRINGE_WEST;
const SIZE = 80;

function edges(
  rows: readonly string[],
  x: number,
  y: number,
  subject: ArtSubjectV7 = "TERRAIN:MOUNTAIN",
): number {
  const subjects: Record<string, ArtSubjectV7> = {
    M: "TERRAIN:MOUNTAIN",
    m: "TERRAIN:MINED_MOUNTAIN",
    g: "TERRAIN:GRASS",
    f: "TERRAIN:FOREST",
    s: "TERRAIN:SHALLOW_WATER",
    d: "TERRAIN:DEEP_WATER",
  };
  // "?" is fog: no terrain entry, like a cell off the board.
  return chibiMountainFringeEdgesV7(
    subject,
    { x, y },
    (at) => subjects[rows[at.y]?.[at.x] ?? "?"],
  );
}

/** Cut depth from an edge at offset t: one past the deepest cut pixel
 * (loose stones inside the cut are kept ground and do not shorten it). */
function depth(mask: Uint8Array, side: number, t: number): number {
  let deepest = 0;
  for (let d = 0; d < SIZE / 2; d += 1) {
    const x =
      side === CHIBI_FRINGE_WEST
        ? d
        : side === CHIBI_FRINGE_EAST
          ? SIZE - 1 - d
          : t;
    const y =
      side === CHIBI_FRINGE_NORTH
        ? d
        : side === CHIBI_FRINGE_SOUTH
          ? SIZE - 1 - d
          : t;
    if (mask[y * SIZE + x] === CHIBI_FRINGE_CUT) deepest = d + 1;
  }
  return deepest;
}

describe("CHIBI Mountain fringe edges", () => {
  it("exposes every edge of a lone Mountain on Grass", () => {
    expect(edges(["ggg", "gMg", "ggg"], 1, 1)).toBe(ALL);
  });

  it("keeps edges between Mountains and Mined Mountains interior", () => {
    const rows = ["gggg", "gMmg", "gMMg", "gggg"];
    expect(edges(rows, 1, 1)).toBe(CHIBI_FRINGE_NORTH | CHIBI_FRINGE_WEST);
    expect(edges(rows, 2, 1, "TERRAIN:MINED_MOUNTAIN")).toBe(
      CHIBI_FRINGE_NORTH | CHIBI_FRINGE_EAST,
    );
    expect(edges(rows, 2, 2)).toBe(CHIBI_FRINGE_SOUTH | CHIBI_FRINGE_EAST);
    // The centre of a 3 x 3 block has no exposed edge.
    expect(edges(["MMM", "MMM", "MMM"], 1, 1)).toBe(0);
  });

  it("fringes against Forest but not water, fog or the board edge", () => {
    expect(edges(["?f?", "sMd", "?g?"], 1, 1)).toBe(
      CHIBI_FRINGE_NORTH | CHIBI_FRINGE_SOUTH,
    );
    expect(edges(["M?", "sd"], 0, 0)).toBe(0);
  });

  it("never fringes a cell that is not a Mountain", () => {
    expect(edges(["ggg", "ggg", "ggg"], 1, 1, "TERRAIN:GRASS")).toBe(0);
    expect(edges(["ggg", "gfg", "ggg"], 1, 1, "TERRAIN:FOREST")).toBe(0);
    expect(
      chibiMountainFringeEdgesV7(
        undefined,
        { x: 1, y: 1 },
        () => "TERRAIN:GRASS",
      ),
    ).toBe(0);
  });
});

describe("CHIBI Mountain fringe mask", () => {
  it("is deterministic and bounded to a few variants", () => {
    for (let variant = 0; variant < CHIBI_FRINGE_VARIANTS; variant += 1)
      expect(chibiFringeMaskV7(variant, ALL, SIZE)).toEqual(
        chibiFringeMaskV7(variant, ALL, SIZE),
      );
    const variants = new Set<number>();
    for (let x = -20; x < 20; x += 1)
      for (let y = -20; y < 20; y += 1) {
        const variant = chibiFringeVariantV7({ x, y });
        expect(variant).toBe(chibiFringeVariantV7({ x, y }));
        variants.add(variant);
      }
    expect([...variants].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(chibiFringeMaskV7(0, ALL, SIZE)).not.toEqual(
      chibiFringeMaskV7(1, ALL, SIZE),
    );
  });

  it("cuts nothing without an exposed edge", () => {
    expect(
      chibiFringeMaskV7(3, 0, SIZE).every((v) => v === CHIBI_FRINGE_KEEP),
    ).toBe(true);
  });

  it("cuts only along exposed edges and leaves interior edges whole", () => {
    for (let variant = 0; variant < CHIBI_FRINGE_VARIANTS; variant += 1) {
      const mask = chibiFringeMaskV7(variant, CHIBI_FRINGE_NORTH, SIZE);
      const depths = Array.from({ length: SIZE }, (_, t) =>
        depth(mask, CHIBI_FRINGE_NORTH, t),
      );
      expect(Math.min(...depths)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...depths)).toBeLessThanOrEqual(CHIBI_FRINGE_MAX_DEPTH);
      // A ragged outline, not a straight inset.
      expect(new Set(depths).size).toBeGreaterThan(3);
      // Nothing below the deepest cut and its rim is touched:
      // every pixel there is plain kept ground.
      for (let y = CHIBI_FRINGE_MAX_DEPTH + 1; y < SIZE; y += 1)
        for (let x = 0; x < SIZE; x += 1)
          expect(mask[y * SIZE + x]).toBe(CHIBI_FRINGE_KEEP);
      // The interior east, west and south edges are whole below the cut.
      for (let t = CHIBI_FRINGE_MAX_DEPTH + 1; t < SIZE; t += 1) {
        expect(depth(mask, CHIBI_FRINGE_WEST, t)).toBe(0);
        expect(depth(mask, CHIBI_FRINGE_EAST, t)).toBe(0);
        expect(depth(mask, CHIBI_FRINGE_SOUTH, t)).toBe(0);
      }
    }
  });

  it("meets the next Mountain cell at the same depth in every variant", () => {
    for (const side of [
      CHIBI_FRINGE_NORTH,
      CHIBI_FRINGE_EAST,
      CHIBI_FRINGE_SOUTH,
      CHIBI_FRINGE_WEST,
    ])
      for (let variant = 0; variant < CHIBI_FRINGE_VARIANTS; variant += 1) {
        const mask = chibiFringeMaskV7(variant, side, SIZE);
        expect(depth(mask, side, 0)).toBe(CHIBI_FRINGE_END_DEPTH);
        expect(depth(mask, side, SIZE - 1)).toBe(CHIBI_FRINGE_END_DEPTH);
      }
  });

  it("rounds the convex corners of a lone Mountain and keeps its middle", () => {
    for (let variant = 0; variant < CHIBI_FRINGE_VARIANTS; variant += 1) {
      const mask = chibiFringeMaskV7(variant, ALL, SIZE);
      for (const [x, y] of [
        [0, 0],
        [SIZE - 1, 0],
        [0, SIZE - 1],
        [SIZE - 1, SIZE - 1],
      ] as const)
        expect(mask[y * SIZE + x]).toBe(CHIBI_FRINGE_CUT);
      for (
        let y = CHIBI_FRINGE_MAX_CORNER;
        y < SIZE - CHIBI_FRINGE_MAX_CORNER;
        y += 1
      )
        for (
          let x = CHIBI_FRINGE_MAX_CORNER;
          x < SIZE - CHIBI_FRINGE_MAX_CORNER;
          x += 1
        )
          expect(mask[y * SIZE + x]).toBe(CHIBI_FRINGE_KEEP);
      // A corner between an exposed and an interior edge stays square.
      const north = chibiFringeMaskV7(variant, CHIBI_FRINGE_NORTH, SIZE);
      expect(north[20 * SIZE + 0]).toBe(CHIBI_FRINGE_KEEP);
    }
  });

  it("outlines the cut with a rim and applies it to the pixels", () => {
    const mask = chibiFringeMaskV7(2, ALL, SIZE);
    for (let y = 0; y < SIZE; y += 1)
      for (let x = 0; x < SIZE; x += 1) {
        const at = (dx: number, dy: number): number | undefined =>
          x + dx < 0 || x + dx >= SIZE
            ? undefined
            : mask[(y + dy) * SIZE + x + dx];
        const touchesCut = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)].includes(
          CHIBI_FRINGE_CUT,
        );
        if (mask[y * SIZE + x] !== CHIBI_FRINGE_CUT)
          expect(mask[y * SIZE + x]).toBe(
            touchesCut ? CHIBI_FRINGE_RIM : CHIBI_FRINGE_KEEP,
          );
      }
    const pixels = new Uint8ClampedArray(SIZE * SIZE * 4).fill(200);
    const cut = applyChibiFringeMaskV7(pixels, mask);
    expect(pixels.every((value) => value === 200)).toBe(true);
    mask.forEach((value, index) => {
      const rgba = [...cut.slice(index * 4, index * 4 + 4)];
      expect(rgba).toEqual(
        value === CHIBI_FRINGE_CUT
          ? [200, 200, 200, 0]
          : value === CHIBI_FRINGE_RIM
            ? [132, 132, 132, 200]
            : [200, 200, 200, 200],
      );
    });
  });
});

// ------------------------------------------------------------ renderer

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

const tall = (subject: ArtSubjectV7, id: string): ChibiArtAssetV7 => ({
  id,
  subject,
  assetClass: "TALL_TERRAIN",
  width: 80,
  height: 104,
  url: `/fixture/${id}.png`,
  layers: {
    bodyUrl: `/fixture/${id}.body.png`,
    groundUrl: "/fixture/rock.png",
  },
});
const mountain = tall("TERRAIN:MOUNTAIN", "mountain");
const mine = tall("TERRAIN:MINED_MOUNTAIN", "mine");
const grass: ChibiArtAssetV7 = {
  id: "grass",
  subject: "TERRAIN:GRASS",
  assetClass: "TERRAIN",
  width: 80,
  height: 80,
  url: "/fixture/grass.png",
};

function fakeChibi(options: { readonly fringe: boolean }): ChibiBoardArtV7 & {
  readonly resolveFringedGround: ReturnType<typeof vi.fn>;
} {
  const assets = [mountain, mine, grass];
  const resolveFringedGround = vi.fn(
    (request: { at: { x: number; y: number }; edges: number }) =>
      options.fringe
        ? ({
            fringed: `${request.at.x},${request.at.y}:${request.edges}`,
          } as unknown as CanvasImageSource)
        : null,
  );
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = assets.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset,
        image: { chibi: asset.id } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
        ...(asset.layers === undefined
          ? {}
          : {
              layers: {
                ground: { ground: asset.id } as unknown as CanvasImageSource,
                body: { body: asset.id } as unknown as CanvasImageSource,
              },
            }),
      };
    },
    resolveFringedGround,
  };
}

const terrain = (
  x: number,
  y: number,
  subject: ArtSubjectV7,
): BoardRenderPlanEntryV7 => ({
  key: `terrain:${x},${y}`,
  kind: "TERRAIN",
  layer: 1,
  at: { x, y },
  assetId: `terrain-fixture-${subject.slice("TERRAIN:".length).toLowerCase()}`,
  artSubject: subject,
});

function draw(
  entries: readonly BoardRenderPlanEntryV7[],
  chibiArt: ChibiBoardArtV7,
  artSet: "CHIBI" | "LEGACY" = "CHIBI",
  zoomStep: 0.75 | 1 = 1,
  devicePixelRatio = 1,
): unknown[][] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio,
    camera: {
      offsetX: 40,
      offsetY: 64,
      zoom: artSet === "CHIBI" ? chibiCameraZoom(zoomStep) : 1,
    },
    plan: { version: 7, entries, targets: [] },
    images: {
      resolve: (assetId: string) =>
        ({ legacy: assetId }) as unknown as CanvasImageSource,
    },
    artSet,
    chibiArt,
  });
  return log.flatMap((call): unknown[][] =>
    call[0] === "drawImage" ? [call.slice(1)] : [],
  );
}

// Cell (1,1) at zoom 1: owning cell at (80, 104), overflow above it.
const CELL = [80, 104, 80, 80] as const;

describe("CHIBI Mountain fringe drawing", () => {
  const lone = [
    terrain(1, 0, "TERRAIN:GRASS"),
    terrain(0, 1, "TERRAIN:GRASS"),
    terrain(1, 1, "TERRAIN:MOUNTAIN"),
    terrain(2, 1, "TERRAIN:GRASS"),
    terrain(1, 2, "TERRAIN:GRASS"),
  ];

  it("draws Grass, the fringed ground and the body for a lone Mountain", () => {
    const art = fakeChibi({ fringe: true });
    const drawn = draw(lone, art).filter(
      (call) => call[5] === 80 && (call[6] === 104 || call[8] === 24),
    );
    expect(drawn).toEqual([
      [{ chibi: "grass" }, 0, 0, 80, 80, ...CELL],
      [{ fringed: `1,1:${ALL}` }, 0, 0, 80, 80, ...CELL],
      [{ body: "mountain" }, 0, 24, 80, 80, ...CELL],
      // Foreground: the master's upward overflow, unchanged.
      [{ chibi: "mountain" }, 0, 0, 80, 24, 80, 80, 80, 24],
    ]);
    expect(art.resolveFringedGround).toHaveBeenCalledTimes(1);
  });

  it("draws the same calls on every frame", () => {
    const art = fakeChibi({ fringe: true });
    expect(draw(lone, art)).toEqual(draw(lone, art));
  });

  it("leaves a Mountain inside a range and beside water or fog square", () => {
    const art = fakeChibi({ fringe: true });
    const drawn = draw(
      [
        terrain(0, 1, "TERRAIN:SHALLOW_WATER"),
        terrain(1, 1, "TERRAIN:MOUNTAIN"),
        terrain(2, 1, "TERRAIN:MINED_MOUNTAIN"),
        terrain(3, 1, "TERRAIN:GRASS"),
      ],
      art,
    );
    // (1,1): water, a Mine and fog around it; the whole master is drawn.
    expect(drawn).toContainEqual([
      { chibi: "mountain" },
      0,
      24,
      80,
      80,
      ...CELL,
    ]);
    // (2,1): only its east edge borders land.
    expect(art.resolveFringedGround.mock.calls).toEqual([
      [{ asset: mine, at: { x: 2, y: 1 }, edges: CHIBI_FRINGE_EAST }],
    ]);
    expect(drawn).toContainEqual([
      { fringed: `2,1:${CHIBI_FRINGE_EAST}` },
      0,
      0,
      80,
      80,
      160,
      104,
      80,
      80,
    ]);
  });

  it("draws a Road between the fringed ground and the body", () => {
    const art = fakeChibi({ fringe: true });
    const { context, log } = recordingContext();
    drawBoardV7({
      context,
      viewport: { width: 800, height: 600 },
      devicePixelRatio: 1,
      camera: { offsetX: 40, offsetY: 64, zoom: chibiCameraZoom(1) },
      plan: {
        version: 7,
        entries: [
          ...lone,
          {
            key: "road:1,1",
            kind: "ROAD",
            layer: 2,
            at: { x: 1, y: 1 },
            roadNeighbors: [{ x: 2, y: 1 }],
          },
        ],
        targets: [],
      },
      images: { resolve: () => null },
      artSet: "CHIBI",
      chibiArt: art,
    });
    const order = log.flatMap((call): string[] => {
      if (call[0] === "stroke") return ["road"];
      if (call[0] !== "drawImage") return [];
      const image = call[1] as Record<string, string>;
      return "fringed" in image ? ["fringed"] : "body" in image ? ["body"] : [];
    });
    expect(order[0]).toBe("fringed");
    expect(order.at(-1)).toBe("body");
    expect(order.slice(1, -1).every((item) => item === "road")).toBe(true);
    expect(order.length).toBeGreaterThan(2);
  });

  it("falls back to the square master while the fringe is not ready", () => {
    const drawn = draw(lone, fakeChibi({ fringe: false }));
    expect(drawn).toContainEqual([
      { chibi: "mountain" },
      0,
      24,
      80,
      80,
      ...CELL,
    ]);
    expect(drawn.some((call) => "body" in (call[0] as object))).toBe(false);
  });

  it("shares the neighbours' device-pixel edges at zoom 0.75 and DPR 1 to 3", () => {
    for (const devicePixelRatio of [1, 1.5, 2, 3]) {
      const drawn = draw(
        lone,
        fakeChibi({ fringe: true }),
        "CHIBI",
        0.75,
        devicePixelRatio,
      );
      const rect = (key: string, id?: string): unknown[][] =>
        drawn
          .filter(
            (call) =>
              key in (call[0] as object) &&
              (id === undefined ||
                (call[0] as Record<string, string>)[key] === id) &&
              call[4] === 80,
          )
          .map((call) => call.slice(5));
      const [fringedRect] = rect("fringed");
      const grassRects = rect("chibi", "grass");
      const [bodyRect] = rect("body");
      if (fringedRect === undefined) throw new Error("no fringed ground");
      // The fringed ground, its Grass and its body share one rect...
      expect(grassRects).toContainEqual(fringedRect);
      expect(bodyRect).toEqual(fringedRect);
      const [x, y, width, height] = fringedRect as number[];
      for (const value of [x, y, width, height])
        expect((value ?? 0) * devicePixelRatio).toBeCloseTo(
          Math.round((value ?? 0) * devicePixelRatio),
          9,
        );
      // ...whose right edge is the east Grass cell's left edge.
      expect(
        grassRects.some(
          (other) =>
            Math.abs((other[0] as number) - ((x ?? 0) + (width ?? 0))) < 1e-9,
        ),
      ).toBe(true);
    }
  });

  it("never asks for a fringe in the LEGACY art set", () => {
    const art = fakeChibi({ fringe: true });
    draw(lone, art, "LEGACY");
    expect(art.resolveFringedGround).not.toHaveBeenCalled();
  });
});

describe("CHIBI fringed ground rasters", () => {
  function setup() {
    const pending = new Map<string, (ok: boolean) => void>();
    const environment: ChibiRasterEnvironmentV7 = {
      loadImage: vi.fn((url: string, settle: (ok: boolean) => void) => {
        pending.set(url, settle);
        return { url } as unknown as CanvasImageSource;
      }),
      readPixels: vi.fn(
        (_image: CanvasImageSource, width: number, height: number) =>
          new Uint8ClampedArray(width * height * 4).fill(255),
      ),
      createSurface: vi.fn(
        (pixels: Uint8ClampedArray, width: number, height: number) =>
          ({ pixels, width, height }) as unknown as CanvasImageSource,
      ),
    };
    const resolver = createChibiArtResolverV7({
      environment,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7([mountain]).registry,
    });
    const settle = () => {
      for (const [url, done] of [...pending]) {
        pending.delete(url);
        done(true);
      }
    };
    return { environment, resolver, settle };
  }

  it("cuts the ground once per variant and edge set, and caches it", () => {
    const { environment, resolver, settle } = setup();
    const request = { asset: mountain, at: { x: 4, y: 7 }, edges: ALL };
    expect(resolver.resolveFringedGround?.(request)).toBe(null);
    settle();
    const first = resolver.resolveFringedGround?.(request) as unknown as {
      pixels: Uint8ClampedArray;
      width: number;
      height: number;
    };
    expect(first.width).toBe(80);
    expect(first.height).toBe(80);
    const expected = applyChibiFringeMaskV7(
      new Uint8ClampedArray(80 * 80 * 4).fill(255),
      chibiFringeMaskV7(chibiFringeVariantV7(request.at), ALL, 80),
    );
    expect(first.pixels).toEqual(expected);
    // Same cell, same raster object: nothing is rebuilt per frame.
    expect(resolver.resolveFringedGround?.(request)).toBe(first);
    expect(environment.createSurface).toHaveBeenCalledTimes(1);
    expect(environment.readPixels).toHaveBeenCalledTimes(1);
    resolver.resolveFringedGround?.({ ...request, edges: CHIBI_FRINGE_NORTH });
    expect(environment.createSurface).toHaveBeenCalledTimes(2);
    expect(environment.readPixels).toHaveBeenCalledTimes(1);
    expect(resolver.resolveFringedGround?.({ ...request, edges: 0 })).toBe(
      null,
    );
  });

  it("stays square when the ground cannot be read", () => {
    const { environment, resolver, settle } = setup();
    vi.mocked(environment.readPixels).mockReturnValue(null);
    const request = { asset: mountain, at: { x: 0, y: 0 }, edges: ALL };
    resolver.resolveFringedGround?.(request);
    settle();
    expect(resolver.resolveFringedGround?.(request)).toBe(null);
    expect(resolver.resolveFringedGround?.(request)).toBe(null);
    expect(environment.readPixels).toHaveBeenCalledTimes(1);
  });
});
