import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_FOREST_ART_SET_V7,
  type ChibiForestArtSetV7,
} from "../../src/assets/chibi-forest-pieces-manifest";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  FOREST_SHAPES_V7,
  forestPlacementCellsV7,
  forestShapeRectsV7,
  packForestBlockV7,
  type ForestPlacementV7,
  type ForestVariantCountsV7,
} from "../../src/render/canvas/chibi-forest-packing-v7";
import {
  chibiForestCellsV7,
  CHIBI_FOREST_GLADE_V7,
  chibiForestGladeAlphaV7,
  createChibiForestArtV7,
  type ChibiForestRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-forest-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";

/**
 * pulp_wars-maw.3 (docs/art/COMPOSED_FORESTS.md): a group of Forest cells
 * is drawn as one forest of multi-tile pieces. The packing is deterministic
 * and local, never reads fog, keeps features readable, and the old single
 * clump stays whenever the piece set is missing.
 */

const ALL: ForestVariantCountsV7 = {
  "1x1": 3,
  "2x1": 3,
  "1x2": 3,
  "2x2": 3,
  "L-NW": 2,
  "L-NE": 2,
  "L-SW": 2,
  "L-SE": 2,
};

function rng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

const id = (p: ForestPlacementV7): string =>
  `${p.shape}@${p.x},${p.y}#${p.variant}`;

function packAll(
  forest: (x: number, y: number) => boolean,
  size: number,
  variants = ALL,
): ForestPlacementV7[] {
  const pieces: ForestPlacementV7[] = [];
  for (let by = 0; by < Math.ceil(size / 2); by += 1)
    for (let bx = 0; bx < Math.ceil(size / 2); bx += 1)
      pieces.push(...packForestBlockV7(forest, bx, by, variants));
  return pieces;
}

describe("forest packing", () => {
  it("covers every Forest cell exactly once and nothing else", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const random = rng(seed);
      const size = 12;
      const cells = Array.from({ length: size * size }, () => random() < 0.6);
      const forest = (x: number, y: number): boolean =>
        x >= 0 &&
        y >= 0 &&
        x < size &&
        y < size &&
        cells[y * size + x] === true;
      const covered = new Map<string, number>();
      for (const piece of packAll(forest, size))
        for (const [x, y] of forestPlacementCellsV7(piece))
          covered.set(`${x},${y}`, (covered.get(`${x},${y}`) ?? 0) + 1);
      for (let y = 0; y < size; y += 1)
        for (let x = 0; x < size; x += 1)
          expect(covered.get(`${x},${y}`) ?? 0).toBe(forest(x, y) ? 1 : 0);
    }
  });

  it("is deterministic: the same cells always pack the same way", () => {
    const forest = (x: number, y: number): boolean => (x * 7 + y * 3) % 5 !== 0;
    expect(packAll(forest, 14).map(id)).toEqual(packAll(forest, 14).map(id));
  });

  it("re-picks only the edited cell's 2 x 2 block", () => {
    const random = rng(77);
    const size = 14;
    const cells = Array.from({ length: size * size }, () => random() < 0.7);
    const forest = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < size && y < size && cells[y * size + x] === true;
    let before = new Set(packAll(forest, size).map(id));
    for (let edit = 0; edit < 300; edit += 1) {
      const x = Math.floor(random() * size);
      const y = Math.floor(random() * size);
      cells[y * size + x] = !cells[y * size + x];
      const pieces = packAll(forest, size);
      const after = new Set(pieces.map(id));
      const changed = pieces.filter((piece) => !before.has(id(piece)));
      for (const piece of changed)
        for (const [cx, cy] of forestPlacementCellsV7(piece)) {
          expect(Math.floor(cx / 2)).toBe(Math.floor(x / 2));
          expect(Math.floor(cy / 2)).toBe(Math.floor(y / 2));
        }
      before = after;
    }
  });

  it("uses a mix of shapes, and only shapes that have a variant", () => {
    const pieces = packAll(() => true, 20);
    const shapes = new Set(pieces.map((piece) => piece.shape));
    expect(shapes.size).toBeGreaterThanOrEqual(6);
    const plain = packAll(() => true, 20, {
      ...ALL,
      "2x2": 0,
      "L-NW": 0,
      "L-NE": 0,
      "L-SW": 0,
      "L-SE": 0,
    });
    expect(
      new Set(plain.map((piece) => piece.shape).filter((s) => s.length > 3)),
    ).toEqual(new Set());
    expect(plain.some((piece) => piece.shape === "2x2")).toBe(false);
  });

  it("splits every footprint into rectangles of whole cells", () => {
    expect(forestShapeRectsV7("2x2")).toEqual([{ x: 0, y: 0, w: 2, h: 2 }]);
    expect(forestShapeRectsV7("L-NE")).toEqual([
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0, y: 1, w: 2, h: 1 },
    ]);
    for (const shape of Object.keys(
      FOREST_SHAPES_V7,
    ) as (keyof typeof FOREST_SHAPES_V7)[]) {
      const cells = forestShapeRectsV7(shape).reduce(
        (sum, rect) => sum + rect.w * rect.h,
        0,
      );
      expect(cells).toBe(
        FOREST_SHAPES_V7[shape].join("").replaceAll(".", "").length,
      );
    }
  });
});

// ------------------------------------------------------------ plan roles

type Entry = BoardRenderPlanEntryV7;

function terrain(x: number, y: number, subject: ArtSubjectV7): Entry {
  return {
    key: `terrain:${x},${y}`,
    kind: "TERRAIN",
    layer: 1,
    at: { x, y },
    assetId:
      subject === "TERRAIN:FOREST"
        ? "terrain-ruleset7-original-forest-1"
        : "terrain-ruleset7-original-grass-1",
    artSubject: subject,
  };
}

/**
 * "F" Forest, "g" Grass, "?" fog (no entry), "L" Forest under a Lumber Camp
 * (drawn as Grass). `ox`, `oy` move the board's top-left cell.
 */
function board(rows: readonly string[], ox = 0, oy = 0): Entry[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): Entry[] =>
      mark === "?"
        ? []
        : [
            terrain(
              ox + x,
              oy + y,
              mark === "F" ? "TERRAIN:FOREST" : "TERRAIN:GRASS",
            ),
          ],
    ),
  );
}

const feature = (kind: Entry["kind"], x: number, y: number): Entry => ({
  key: `${kind}:${x},${y}`,
  kind,
  layer: 3,
  at: { x, y },
  assetId: "feature",
});

describe("forest cells of a plan", () => {
  it("gives a role to explored Forest cells only", () => {
    const cells = chibiForestCellsV7(board(["FF?", "FLg", "??F"]), ALL, 4);
    expect([...cells.keys()].sort()).toEqual(["0,0", "0,1", "1,0", "2,2"]);
  });

  it("never packs a piece over fog, Grass or a cleared Forest cell", () => {
    const random = rng(5);
    for (let round = 0; round < 30; round += 1) {
      const rows = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => {
          const roll = random();
          return roll < 0.55 ? "F" : roll < 0.7 ? "?" : roll < 0.85 ? "g" : "L";
        }).join(""),
      );
      const cells = chibiForestCellsV7(board(rows), ALL, 4);
      for (const cell of cells.values())
        for (const piece of cell.bodies)
          for (const [x, y] of forestPlacementCellsV7(piece))
            expect(rows[y]?.[x]).toBe("F");
    }
  });

  it("keeps a clearing under a village and a glade under a resource", () => {
    const entries = [
      ...board(["FFFF", "FFFF"]),
      feature("SITE", 1, 0),
      feature("RESOURCE", 2, 1),
    ];
    const cells = chibiForestCellsV7(entries, ALL, 4);
    expect(cells.get("1,0")).toMatchObject({ clearing: true, glade: false });
    expect(cells.get("1,0")?.bodies).toEqual([]);
    expect(cells.get("2,1")).toMatchObject({ clearing: false, glade: true });
    // The clearing is not part of any piece, and no seam clump touches it.
    for (const cell of cells.values())
      for (const piece of cell.bodies)
        expect(forestPlacementCellsV7(piece)).not.toContainEqual([1, 0]);
    expect(cells.get("0,0")?.eastSeam).toBeNull();
    expect(cells.get("1,1")?.northSeam).toBeNull();
  });

  it("closes seams only between two different pieces", () => {
    const cells = chibiForestCellsV7(
      board(["FFFF", "FFFF", "FFFF", "FFFF"]),
      ALL,
      4,
    );
    const pieceAt = new Map<string, ForestPlacementV7>();
    for (const cell of cells.values())
      for (const piece of cell.bodies)
        for (const [x, y] of forestPlacementCellsV7(piece))
          pieceAt.set(`${x},${y}`, piece);
    for (const [key, cell] of cells) {
      const [x = 0, y = 0] = key.split(",").map(Number);
      const own = pieceAt.get(key);
      const east = pieceAt.get(`${x + 1},${y}`);
      const north = pieceAt.get(`${x},${y - 1}`);
      expect(cell.eastSeam !== null).toBe(east !== undefined && east !== own);
      expect(cell.northSeam !== null).toBe(
        north !== undefined && north !== own,
      );
    }
    // Blocks are 2 x 2, so the seam between columns 1 and 2 always exists.
    expect(cells.get("1,0")?.eastSeam).not.toBeNull();
    expect(cells.get("0,2")?.northSeam).not.toBeNull();
  });

  it("fringes the floor only along edges without Forest", () => {
    const cells = chibiForestCellsV7(board(["gFg", "FFF", "g?g"]), ALL, 4);
    expect(cells.get("1,1")?.edges).toBe(4); // south only (fog)
    expect(cells.get("1,0")?.edges).toBe(1 | 2 | 8);
  });
});

// ------------------------------------------------------------------ art

interface FakeImage {
  readonly url?: string;
  readonly surface?: number;
  readonly width?: number;
  readonly height?: number;
  readonly caps?: FakeImage;
}

function fakeEnvironment(options: { failing?: string; deferred?: true } = {}): {
  readonly environment: ChibiForestRasterEnvironmentV7;
  readonly settle: () => void;
  readonly surfaces: FakeImage[];
} {
  const pending: (() => void)[] = [];
  const surfaces: FakeImage[] = [];
  return {
    surfaces,
    settle: () => {
      for (const run of pending.splice(0)) run();
    },
    environment: {
      loadImage(url, settle) {
        const done = (): void => settle(url !== options.failing);
        if (options.deferred === true) pending.push(done);
        else done();
        return { url } as unknown as CanvasImageSource;
      },
      readPixels: (_image, width, height) =>
        new Uint8ClampedArray(width * height * 4).fill(200),
      createSurface(_pixels, width, height) {
        const surface = { surface: surfaces.length, width, height };
        surfaces.push(surface);
        return surface as unknown as CanvasImageSource;
      },
    },
  };
}

describe("forest piece set", () => {
  it("ships three variants of the common shapes and two of each L", () => {
    const counts = new Map<string, number>();
    for (const piece of CHIBI_FOREST_ART_SET_V7.pieces) {
      counts.set(piece.shape, (counts.get(piece.shape) ?? 0) + 1);
      const rows = FOREST_SHAPES_V7[piece.shape];
      expect(piece.width).toBe((rows[0]?.length ?? 0) * 80);
      expect(piece.height).toBe(rows.length * 80 + 24);
      expect(piece.url).toContain("assets/chibi/forest/");
    }
    expect(Object.fromEntries(counts)).toEqual(ALL);
    expect(CHIBI_FOREST_ART_SET_V7.clumps.length).toBe(4);
  });

  it("is unavailable until every raster has loaded", () => {
    const redraw = vi.fn();
    const { environment, settle } = fakeEnvironment({ deferred: true });
    const art = createChibiForestArtV7({
      environment,
      redraw,
      set: CHIBI_FOREST_ART_SET_V7,
    });
    expect(art.resolve()).toBeNull();
    expect(redraw).not.toHaveBeenCalled();
    settle();
    expect(redraw).toHaveBeenCalledTimes(1);
    const ready = art.resolve();
    expect(ready?.variants).toEqual(ALL);
    expect(ready?.clumps.length).toBe(4);
    expect(art.resolve()).toBe(ready);
  });

  it("stays unavailable when one raster fails to load", () => {
    const failing = CHIBI_FOREST_ART_SET_V7.pieces[3]?.url ?? "";
    const art = createChibiForestArtV7({
      ...fakeEnvironment({ failing }),
      redraw: vi.fn(),
      set: CHIBI_FOREST_ART_SET_V7,
    });
    expect(art.resolve()).toBeNull();
    expect(art.resolve()).toBeNull();
  });

  it("slices footprints and bands, and caches the floor and the glade", () => {
    const { environment } = fakeEnvironment();
    const art = createChibiForestArtV7({
      environment,
      redraw: vi.fn(),
      set: CHIBI_FOREST_ART_SET_V7,
    }).resolve();
    if (art === null) throw new Error("art not ready");
    const size = (image: CanvasImageSource | null | undefined) => {
      const sized = image as FakeImage | null | undefined;
      return [sized?.width, sized?.height];
    };
    expect(art.body("2x2", 0).map((part) => size(part.image))).toEqual([
      [160, 160],
    ]);
    expect(art.body("L-NE", 0).map((part) => size(part.image))).toEqual([
      [80, 80],
      [160, 80],
    ]);
    expect(size(art.band("2x2", 0, 0, 0))).toEqual([160, 24]);
    // An L has one band per column: over its top cell and over the cell
    // beside the missing one.
    expect(size(art.band("L-NE", 0, 0, 0))).toEqual([80, 24]);
    expect(size(art.band("L-NE", 0, 1, 1))).toEqual([80, 24]);
    expect(art.band("L-NE", 0, 1, 0)).toBeNull();
    expect(art.floor({ x: 3, y: 4 }, 0)).toBe(art.floor({ x: 9, y: 9 }, 0));
    expect(art.floor({ x: 3, y: 4 }, 5)).toBe(art.floor({ x: 3, y: 4 }, 5));
    const ground = { url: "ground" } as unknown as CanvasImageSource;
    const other = { url: "other" } as unknown as CanvasImageSource;
    expect(art.glade(ground)).toBe(art.glade(ground));
    expect(art.glade(ground)).not.toBe(art.glade(other));
    expect(size(art.glade(ground))).toEqual([80, 80]);
  });

  it("uses the softened seam clumps whole", () => {
    for (const clump of CHIBI_FOREST_ART_SET_V7.clumps) {
      expect(clump.url).toContain("assets/chibi/forest/chibi-forest-seam-");
      expect(clump.width).toBeLessThanOrEqual(80);
      // The tallest clump is one pixel taller than a cell.
      expect(clump.height).toBeLessThanOrEqual(81);
    }
  });

  it("opens a round glade with a soft edge about the centre of the cell", () => {
    const { x: cx, y: cy, core, rim } = CHIBI_FOREST_GLADE_V7;
    // Centred on the cell, where the resource sits, and inside the cell.
    expect([cx, cy]).toEqual([40, 40]);
    expect(rim).toBeLessThan(40);
    expect(core).toBeLessThan(rim);
    let open = 0;
    let part = 0;
    for (let y = 0; y < 80; y += 1)
      for (let x = 0; x < 80; x += 1) {
        const alpha = chibiForestGladeAlphaV7(x, y);
        const radius = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(1);
        // Fully open ground under the animal, forest outside the rim.
        if (radius <= core) expect(alpha).toBe(1);
        if (radius >= rim) expect(alpha).toBe(0);
        // Round: the same from the left, the right, above and below
        // (the old glade ran down to the cell's bottom edge).
        expect(chibiForestGladeAlphaV7(79 - x, y)).toBe(alpha);
        expect(chibiForestGladeAlphaV7(x, 79 - y)).toBe(alpha);
        expect(chibiForestGladeAlphaV7(y, x)).toBe(alpha);
        if (alpha === 1) open += 1;
        else if (alpha > 0) part += 1;
      }
    // The edge fades: it never jumps from ground to trees.
    for (let x = 40; x < 79; x += 1)
      expect(
        chibiForestGladeAlphaV7(x, 40) - chibiForestGladeAlphaV7(x + 1, 40),
      ).toBeLessThan(0.2);
    // Nothing at the edges or in the corners of the cell.
    for (let i = 0; i < 80; i += 1)
      for (const [x, y] of [
        [i, 0],
        [i, 79],
        [0, i],
        [79, i],
      ] as const)
        expect(chibiForestGladeAlphaV7(x, y)).toBe(0);
    // A small opening (the cell is 6,400 px) with a wide soft rim.
    expect(open).toBeGreaterThan(700);
    expect(open).toBeLessThan(1100);
    expect(part).toBeGreaterThan(open);
  });

  it("fades the ground of a glade out towards its rim", () => {
    const pixels: Uint8ClampedArray[] = [];
    const { environment } = fakeEnvironment();
    const art = createChibiForestArtV7({
      environment: {
        ...environment,
        createSurface(data, width, height) {
          pixels.push(new Uint8ClampedArray(data));
          return environment.createSurface(data, width, height);
        },
      },
      redraw: vi.fn(),
      set: CHIBI_FOREST_ART_SET_V7,
    }).resolve();
    if (art === null) throw new Error("art not ready");
    const before = pixels.length;
    art.glade({ url: "ground" } as unknown as CanvasImageSource);
    const glade = pixels[before];
    if (glade === undefined) throw new Error("no glade surface");
    const at = (x: number, y: number): number[] => [
      ...glade.slice((y * 80 + x) * 4, (y * 80 + x) * 4 + 4),
    ];
    // The fake ground is 200 in every channel: colour kept, alpha scaled.
    expect(at(40, 40)).toEqual([200, 200, 200, 200]);
    expect(at(0, 0)).toEqual([200, 200, 200, 0]);
    expect(at(40, 79)).toEqual([200, 200, 200, 0]);
    const rim = at(40 + 23, 40)[3] ?? 0;
    expect(rim).toBeGreaterThan(0);
    expect(rim).toBeLessThan(200);
  });
});

// ------------------------------------------------------------- drawing

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
      set: (target, key, value) => Reflect.set(target, key, value),
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

const forestAsset: ChibiArtAssetV7 = {
  id: "forest",
  subject: "TERRAIN:FOREST",
  assetClass: "TALL_TERRAIN",
  width: 80,
  height: 104,
  url: "/fixture/forest.png",
  layers: {
    bodyUrl: "/fixture/forest.body.png",
    groundUrl: "/fixture/grass-1.png",
  },
};
const grassAsset: ChibiArtAssetV7 = {
  id: "grass",
  subject: "TERRAIN:GRASS",
  assetClass: "TERRAIN",
  width: 80,
  height: 80,
  url: "/fixture/grass.png",
};
const fighterAsset: ChibiArtAssetV7 = {
  id: "fighter",
  subject: "UNIT:FIGHTER",
  assetClass: "STANDARD_UNIT",
  width: 56,
  height: 80,
  url: "/fixture/fighter.png",
};
const gameAsset: ChibiArtAssetV7 = {
  id: "game",
  subject: "RESOURCE:GAME",
  assetClass: "RESOURCE",
  width: 48,
  height: 48,
  url: "/fixture/game.png",
};

const GROUND = { ground: "forest" };
const BODY = { body: "forest" };
const MASTER = { chibi: "forest" };

function fakeChibi(): ChibiBoardArtV7 {
  const assets = [forestAsset, grassAsset, fighterAsset, gameAsset];
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = assets.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset,
        image:
          asset === forestAsset
            ? (MASTER as unknown as CanvasImageSource)
            : ({ chibi: asset.id } as unknown as CanvasImageSource),
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
        ...(asset.layers === undefined
          ? {}
          : {
              layers: {
                ground: GROUND as unknown as CanvasImageSource,
                body: BODY as unknown as CanvasImageSource,
              },
            }),
      };
    },
  };
}

/** A small set: one variant of 1x1, 2x1, 1x2 and 2x2, and one clump. */
const SMALL_SET: ChibiForestArtSetV7 = {
  pieces: CHIBI_FOREST_ART_SET_V7.pieces.filter(
    (piece) => piece.variant === 0 && !piece.shape.startsWith("L"),
  ),
  clumps: CHIBI_FOREST_ART_SET_V7.clumps.slice(0, 1),
};

function readyForest(set = SMALL_SET) {
  const { environment } = fakeEnvironment();
  const art = createChibiForestArtV7({ environment, redraw: vi.fn(), set });
  if (art.resolve() === null) throw new Error("forest art not ready");
  return art;
}

function draw(
  entries: readonly Entry[],
  options: {
    readonly artSet?: "LEGACY" | "CHIBI";
    readonly forestArt?: ReturnType<typeof readyForest> | null;
    readonly iceFolkArt?: IceFolkBoardArtV7;
  } = {},
): unknown[][] {
  const { context, log } = recordingContext();
  const built: BoardRenderPlanV7 = { version: 7, entries, targets: [] };
  const artSet = options.artSet ?? "CHIBI";
  drawBoardV7({
    context,
    viewport: { width: 2400, height: 2400 },
    devicePixelRatio: 1,
    camera: {
      offsetX: 40,
      offsetY: 64,
      zoom: artSet === "CHIBI" ? chibiCameraZoom(1) : 1,
    },
    plan: built,
    images: legacyImages,
    artSet,
    chibiArt: fakeChibi(),
    ...(options.forestArt === null
      ? {}
      : { forestArt: options.forestArt ?? readyForest() }),
    ...(options.iceFolkArt === undefined
      ? {}
      : { iceFolkArt: options.iceFolkArt }),
  });
  return log
    .filter((call) => call[0] === "drawImage")
    .map((call) => call.slice(1));
}

const kindOf = (image: unknown): string => {
  const fake = image as FakeImage & {
    ground?: string;
    body?: string;
    chibi?: string;
    caps?: unknown;
  };
  if (fake.caps !== undefined) return "caps";
  if (fake.ground !== undefined) return "ground";
  if (fake.body !== undefined) return "clump-body";
  if (fake.chibi !== undefined) return `chibi:${fake.chibi}`;
  if (fake.url !== undefined)
    return fake.url.includes("seam") ? "seam" : "image";
  return `surface:${fake.width}x${fake.height}`;
};

/**
 * A block the small set packs as one 2 x 2 piece, and one it packs as
 * something else; the choice is a hash of the block, so they are searched.
 */
const SMALL_COUNTS: ForestVariantCountsV7 = {
  ...ALL,
  "1x1": 1,
  "2x1": 1,
  "1x2": 1,
  "2x2": 1,
  "L-NW": 0,
  "L-NE": 0,
  "L-SW": 0,
  "L-SE": 0,
};

function fullBlock(): { readonly ox: number; readonly oy: number } {
  for (let by = 0; by < 12; by += 1)
    for (let bx = 0; bx < 12; bx += 1) {
      const pieces = packForestBlockV7(
        (x, y) => Math.floor(x / 2) === bx && Math.floor(y / 2) === by,
        bx,
        by,
        SMALL_COUNTS,
      );
      if (pieces.length === 1 && pieces[0]?.shape === "2x2")
        return { ox: 2 * bx, oy: 2 * by };
    }
  throw new Error("no block packs as a 2 x 2 piece");
}

describe("composed forest drawing", () => {
  const { ox, oy } = fullBlock();
  // Cell (0, 0) is at (0, 24) for this camera.
  const X = ox * 80;
  const Y = 24 + oy * 80;
  const block = board(["FF", "FF"], ox, oy);
  const named = (calls: unknown[][]): unknown[][] =>
    calls.map((call) => [kindOf(call[0]), ...call.slice(1)]);

  it("draws a full block as one 2 x 2 piece over shaded ground", () => {
    expect(named(draw(block))).toEqual([
      // Ground pass, cell by cell: the ground tile, then the shade.
      ["ground", 0, 0, 80, 80, X, Y, 80, 80],
      ["surface:80x80", X, Y, 80, 80],
      ["ground", 0, 0, 80, 80, X + 80, Y, 80, 80],
      ["surface:80x80", X + 80, Y, 80, 80],
      ["ground", 0, 0, 80, 80, X, Y + 80, 80, 80],
      ["surface:80x80", X, Y + 80, 80, 80],
      ["ground", 0, 0, 80, 80, X + 80, Y + 80, 80, 80],
      ["surface:80x80", X + 80, Y + 80, 80, 80],
      // After the Roads: the piece's footprint, at its last cell's turn.
      ["surface:160x160", X, Y, 160, 160],
      // Foreground: its upward band, 24 px above the top row.
      ["surface:160x24", X, Y - 24, 160, 24],
    ]);
  });

  it("keeps the single clump when the piece set is missing or loading", () => {
    const expected = [
      ["chibi:forest", 0, 24, 80, 80, X, Y, 80, 80],
      ["chibi:forest", 0, 0, 80, 24, X, Y - 24, 80, 24],
    ];
    const single = [terrain(ox, oy, "TERRAIN:FOREST")];
    const { environment } = fakeEnvironment({ deferred: true });
    const loading = createChibiForestArtV7({
      environment,
      redraw: vi.fn(),
      set: SMALL_SET,
    });
    for (const forestArt of [null, loading])
      expect(named(draw(single, { forestArt }))).toEqual(expected);
  });

  it("leaves the LEGACY art set alone", () => {
    const withForest = draw(block, { artSet: "LEGACY" });
    const without = draw(block, { artSet: "LEGACY", forestArt: null });
    expect(withForest).toEqual(without);
    expect(withForest.map((call) => kindOf(call[0]))).not.toContain(
      "surface:160x160",
    );
  });

  it("draws a unit over the trees of its own cell", () => {
    const unit: Entry = {
      key: `unit:${ox},${oy}`,
      kind: "UNIT",
      layer: 5,
      at: { x: ox, y: oy },
      assetId: "unit",
      artSubject: "UNIT:FIGHTER",
    };
    const kinds = draw([...block, unit]).map((call) => kindOf(call[0]));
    expect(kinds.indexOf("chibi:fighter")).toBeGreaterThan(
      kinds.indexOf("surface:160x160"),
    );
    // The piece's only foreground part is its 24 px band above the block.
    expect(kinds.filter((kind) => kind === "surface:160x24").length).toBe(1);
  });

  it("opens a glade under a resource, between the trees and the animal", () => {
    const game: Entry = {
      key: `resource:${ox + 1},${oy + 1}`,
      kind: "RESOURCE",
      layer: 3,
      at: { x: ox + 1, y: oy + 1 },
      assetId: "resource",
      artSubject: "RESOURCE:GAME",
    };
    const drawn = named(draw([...block, game]));
    const kinds = drawn.map((call) => call[0]);
    // The last 80 x 80 surface over the cell (the first is its shade).
    const glade = drawn
      .map(
        (call) =>
          call[0] === "surface:80x80" &&
          call[1] === X + 80 &&
          call[2] === Y + 80,
      )
      .lastIndexOf(true);
    // The cell is still part of the 2 x 2 piece; the glade lies over it.
    expect(kinds).toContain("surface:160x160");
    expect(glade).toBeGreaterThan(kinds.indexOf("surface:160x160"));
    expect(kinds.indexOf("chibi:game")).toBeGreaterThan(glade);
  });

  it("keeps the old clump on a cell with a village", () => {
    const village = feature("SITE", ox, oy);
    const drawn = named(draw([...board(["FF"], ox, oy), village]));
    // (ox, oy) is a clearing: ground, shade, the clump's body after the
    // Roads and its overflow in the foreground, exactly as before.
    expect(drawn).toContainEqual(["clump-body", 0, 24, 80, 80, X, Y, 80, 80]);
    expect(drawn).toContainEqual([
      "chibi:forest",
      0,
      0,
      80,
      24,
      X,
      Y - 24,
      80,
      24,
    ]);
    // Its neighbour is a 1 x 1 piece, and no seam clump joins the two.
    expect(drawn.map((call) => call[0])).not.toContain("seam");
  });

  it("joins neighbouring pieces with seam clumps drawn under them", () => {
    const clump = SMALL_SET.clumps[0];
    if (clump === undefined) throw new Error("no clump");
    const entries = board(["FFFF", "FFFF", "FFFF", "FFFF"], ox, oy);
    const cells = chibiForestCellsV7(entries, SMALL_COUNTS, 1);
    const expected = [...cells.values()].reduce(
      (sum, cell) =>
        sum +
        (cell.eastSeam === null ? 0 : 1) +
        (cell.northSeam === null ? 0 : 1),
      0,
    );
    const drawn = named(draw(entries));
    const seam = "seam";
    const seams = drawn.filter((call) => call[0] === seam);
    // At least the two cells of each edge between the four blocks.
    expect(expected).toBeGreaterThanOrEqual(8);
    expect(seams.length).toBe(expected);
    // The east seam of the block's first row: astride the block's east
    // edge, its top at the row's top, drawn before the 2 x 2 piece.
    const first = drawn.findIndex(
      (call) =>
        call[0] === seam &&
        call[1] === X + 160 - Math.round(clump.width / 2) &&
        call[2] === Y + Math.max(0, 80 - clump.height),
    );
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(
      drawn.findIndex(
        (call) =>
          call[0] === "surface:160x160" && call[1] === X && call[2] === Y,
      ),
    );
  });

  it("caps every tree of a Snow cell", () => {
    const caps = vi.fn(
      (image: CanvasImageSource) =>
        ({ caps: image }) as unknown as CanvasImageSource,
    );
    const iceFolkArt = {
      snowTile: () => null,
      caps,
      casing: () => null,
    } as unknown as IceFolkBoardArtV7;
    const snowy = block.map((entry) => ({
      ...entry,
      snow: { edges: 0, variant: 0 },
    }));
    // Caps go on cell by cell: the four cells of the footprint, then the
    // two columns of the band.
    const capped = named(draw(snowy, { iceFolkArt }));
    expect(capped.filter((call) => call[0] === "caps")).toEqual([
      ["caps", 0, 0, 80, 80, X, Y, 80, 80],
      ["caps", 80, 0, 80, 80, X + 80, Y, 80, 80],
      ["caps", 0, 80, 80, 80, X, Y + 80, 80, 80],
      ["caps", 80, 80, 80, 80, X + 80, Y + 80, 80, 80],
      ["caps", 0, 0, 80, 24, X, Y - 24, 80, 24],
      ["caps", 80, 0, 80, 24, X + 80, Y - 24, 80, 24],
    ]);
    expect(
      draw(block, { iceFolkArt }).map((call) => kindOf(call[0])),
    ).not.toContain("caps");
  });

  it("caps only the Snow cells of a piece that spans a Snow border", () => {
    const iceFolkArt = {
      snowTile: () => null,
      caps: (image: CanvasImageSource) =>
        ({ caps: image }) as unknown as CanvasImageSource,
      casing: () => null,
    } as unknown as IceFolkBoardArtV7;
    // Only the block's north-west cell is Snow.
    const mixed = block.map((entry) =>
      entry.at.x === ox && entry.at.y === oy
        ? { ...entry, snow: { edges: 0, variant: 0 } }
        : entry,
    );
    const drawn = named(draw(mixed, { iceFolkArt }));
    expect(drawn).toContainEqual(["surface:160x160", X, Y, 160, 160]);
    expect(drawn.filter((call) => call[0] === "caps")).toEqual([
      ["caps", 0, 0, 80, 80, X, Y, 80, 80],
      ["caps", 0, 0, 80, 24, X, Y - 24, 80, 24],
    ]);
  });

  it("stays within five image draws per Forest cell on a full board", () => {
    const size = 24;
    const rows = Array.from({ length: size }, () => "F".repeat(size));
    const drawn = draw(board(rows), {
      forestArt: readyForest(CHIBI_FOREST_ART_SET_V7),
    });
    // Ground and shade (2), a share of a piece and its band, seam clumps.
    expect(drawn.length).toBeLessThanOrEqual(size * size * 5);
    expect(drawn.length).toBeGreaterThan(size * size * 2);
  });

  it("never draws a tree over a cell that has no Forest entry", () => {
    // Fog on the east and south: every draw stays inside the block (plus
    // the 24 px band above its top row).
    for (const call of draw(board(["FF?", "FF?", "???"], ox, oy))) {
      const [x, y, w, h] = call.length === 5 ? call.slice(1) : call.slice(5);
      expect(x as number).toBeGreaterThanOrEqual(X);
      expect((x as number) + (w as number)).toBeLessThanOrEqual(X + 160);
      expect(y as number).toBeGreaterThanOrEqual(Y - 24);
      expect((y as number) + (h as number)).toBeLessThanOrEqual(Y + 160);
    }
  });
});
