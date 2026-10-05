import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import type { ChibiForestArtSetV7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { CHIBI_MOUNTAIN_ART_SET_V7 } from "../../src/assets/chibi-mountain-ranges-manifest";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
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
  packRangeCoverV7,
  type ForestVariantCountsV7,
} from "../../src/render/canvas/chibi-forest-packing-v7";
import {
  chibiForestCellsV7,
  createChibiForestArtV7,
  type ChibiForestRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-forest-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";

/**
 * pulp_wars-e9f (docs/art/COMPOSED_TERRAIN.md): a group of Mountain cells
 * is drawn as ranges of multi-tile pieces, with the packing and drawing of
 * the composed forests. Mines and other features keep the single mountain.
 */

type Entry = BoardRenderPlanEntryV7;

function terrain(x: number, y: number, subject: ArtSubjectV7): Entry {
  return {
    key: `terrain:${x},${y}`,
    kind: "TERRAIN",
    layer: 1,
    at: { x, y },
    assetId: "terrain-ruleset7-revision3-mountain-1",
    artSubject: subject,
  };
}

/** "M" Mountain, "m" Mined Mountain, "g" Grass, "F" Forest, "?" fog. */
function board(rows: readonly string[], ox = 0, oy = 0): Entry[] {
  const subjects: Record<string, ArtSubjectV7> = {
    M: "TERRAIN:MOUNTAIN",
    m: "TERRAIN:MINED_MOUNTAIN",
    g: "TERRAIN:GRASS",
    F: "TERRAIN:FOREST",
  };
  return rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): Entry[] => {
      const subject = subjects[mark];
      return subject === undefined ? [] : [terrain(ox + x, oy + y, subject)];
    }),
  );
}

const COUNTS: ForestVariantCountsV7 = {
  "1x1": 2,
  "2x1": 4,
  "1x2": 3,
  "2x2": 3,
  "L-NW": 0,
  "L-NE": 0,
  "L-SW": 0,
  "L-SE": 0,
};

const cells = (entries: readonly Entry[]) =>
  chibiForestCellsV7(entries, COUNTS, 0, "MOUNTAIN");

describe("mined mountain in the art registry", () => {
  it("is what the live look shows for a Mine, in the interface too", () => {
    const registry = chibiDirectionArtRegistryV7();
    const variants = registry.variants("TERRAIN:MINED_MOUNTAIN");
    expect(variants.map((asset) => asset.id)).toEqual([
      "chibi-mountain-range-mine-a",
    ]);
    const [mine] = variants;
    expect(mine).toMatchObject({
      assetClass: "TALL_TERRAIN",
      width: 80,
      height: 104,
    });
    expect(mine?.url).toContain("chibi-mountain-range-mine-a.master.png");
    expect(mine?.layers?.bodyUrl).toContain("chibi-mountain-range-mine-a.png");
    expect(mine?.layers?.groundUrl).toContain("chibi-mountain-ground-1.png");
  });
});

describe("mountain range set", () => {
  it("ships ranges of four shapes and no join pieces", () => {
    const counts = new Map<string, number>();
    for (const piece of CHIBI_MOUNTAIN_ART_SET_V7.pieces) {
      counts.set(piece.shape, (counts.get(piece.shape) ?? 0) + 1);
      const rows = FOREST_SHAPES_V7[piece.shape];
      expect(piece.width).toBe((rows[0]?.length ?? 0) * 80);
      expect(piece.height).toBe(rows.length * 80 + 24);
      expect(piece.url).toContain(
        "assets/chibi/mountains/chibi-mountain-range-",
      );
    }
    expect(Object.fromEntries(counts)).toEqual({
      "1x1": 2,
      "2x1": 4,
      "1x2": 3,
      "2x2": 3,
    });
    expect(CHIBI_MOUNTAIN_ART_SET_V7.clumps).toEqual([]);
    // One mined mountain in the range style (bead pulp_wars-6kn).
    expect(CHIBI_MOUNTAIN_ART_SET_V7.mined?.map((piece) => piece.url)).toEqual([
      expect.stringContaining("chibi-mountain-range-mine-a.png"),
    ]);
  });
});

describe("range cover", () => {
  const grid = (rows: readonly string[]): [number, number][] =>
    rows.flatMap((row, y) =>
      [...row].flatMap((mark, x): [number, number][] =>
        mark === "M" ? [[x, y]] : [],
      ),
    );

  it("covers every cell exactly once, deterministically, without Ls", () => {
    let state = 7;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    for (let round = 0; round < 40; round += 1) {
      const rows = Array.from({ length: 12 }, () =>
        Array.from({ length: 12 }, () => (random() < 0.6 ? "M" : ".")).join(""),
      );
      const cellsIn = grid(rows);
      const pieces = packRangeCoverV7(cellsIn, COUNTS);
      expect(packRangeCoverV7([...cellsIn].reverse(), COUNTS)).toEqual(pieces);
      const covered = new Map<string, number>();
      for (const piece of pieces) {
        expect(piece.shape.startsWith("L")).toBe(false);
        expect(piece.variant).toBeLessThan(COUNTS[piece.shape]);
        for (const [x, y] of forestPlacementCellsV7(piece))
          covered.set(`${x},${y}`, (covered.get(`${x},${y}`) ?? 0) + 1);
      }
      expect(covered.size).toBe(cellsIn.length);
      for (const count of covered.values()) expect(count).toBe(1);
      for (const [x, y] of cellsIn) expect(covered.has(`${x},${y}`)).toBe(true);
    }
  });

  it("chains ridges along a row and keeps singles rare", () => {
    // A one-cell-high range of nine cells: four ridges and one single.
    const row = packRangeCoverV7(grid(["MMMMMMMMM"]), COUNTS);
    expect(row.map((piece) => piece.shape)).toEqual([
      "2x1",
      "2x1",
      "2x1",
      "2x1",
      "1x1",
    ]);
    // One-cell-wide ranges are north-south ridges; a single mountain only
    // where the three ridge variants are all taken by neighbours or the
    // column has an odd cell left.
    const column = packRangeCoverV7(grid(["M", "M", "M", "M", "M"]), COUNTS);
    expect(column.map((piece) => piece.shape)).toEqual(["1x2", "1x2", "1x1"]);
    expect(column[0]?.variant).not.toBe(column[1]?.variant);
    // A full 12 x 12 area mixes massifs and rows of ridges, with no
    // single mountain and no north-south ridge.
    const full = packRangeCoverV7(
      grid(Array.from({ length: 12 }, () => "M".repeat(12))),
      COUNTS,
    );
    const shapes = full.map((piece) => piece.shape);
    const massifs = shapes.filter((shape) => shape === "2x2").length;
    const ridges = shapes.filter((shape) => shape === "2x1").length;
    expect(massifs).toBeGreaterThanOrEqual(8);
    expect(ridges).toBeGreaterThanOrEqual(8);
    expect(massifs * 4 + ridges * 2).toBe(144);
  });
});

describe("range cover neighbours", () => {
  it("never puts two like north-south ridges or two like singles side by side", () => {
    let state = 31;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    for (let round = 0; round < 40; round += 1) {
      const cellsIn: [number, number][] = [];
      for (let y = 0; y < 12; y += 1)
        for (let x = 0; x < 12; x += 1)
          if (random() < 0.45) cellsIn.push([x, y]);
      const at = new Map<string, string>();
      packRangeCoverV7(cellsIn, COUNTS).forEach((piece, index) => {
        for (const [x, y] of forestPlacementCellsV7(piece))
          at.set(`${x},${y}`, `${piece.shape}#${piece.variant}@${index}`);
      });
      for (const [key, value] of at) {
        const [x = 0, y = 0] = key.split(",").map(Number);
        const [kind, index] = value.split("@");
        if (kind?.startsWith("2x")) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          const other = at.get(`${x + dx},${y + dy}`);
          if (other === undefined) continue;
          const [otherKind, otherIndex] = other.split("@");
          if (otherIndex !== index) expect(otherKind).not.toBe(kind);
        }
      }
    }
  });
});

describe("mountain cells of a plan", () => {
  it("packs Mountains only, deterministically", () => {
    const entries = board(["MMFg", "MMMM", "gMM?"]);
    const packed = cells(entries);
    expect([...packed.keys()].sort()).toEqual(
      ["0,0", "0,1", "1,0", "1,1", "1,2", "2,1", "2,2", "3,1"].sort(),
    );
    expect([...cells(entries).entries()]).toEqual([...packed.entries()]);
    // Forest cells are not Mountain cells and the reverse.
    expect([
      ...chibiForestCellsV7(entries, COUNTS, 0, "FOREST").keys(),
    ]).toEqual(["2,0"]);
  });

  it("never packs a range over fog, Grass, Forest or a Mine", () => {
    let state = 99;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    for (let round = 0; round < 30; round += 1) {
      const rows = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => {
          const roll = random();
          return roll < 0.55
            ? "M"
            : roll < 0.65
              ? "m"
              : roll < 0.78
                ? "?"
                : roll < 0.9
                  ? "g"
                  : "F";
        }).join(""),
      );
      for (const cell of cells(board(rows)).values())
        for (const piece of cell.bodies)
          for (const [x, y] of forestPlacementCellsV7(piece))
            expect(rows[y]?.[x]).toBe("M");
    }
  });

  const feature = (kind: Entry["kind"], x: number, y: number): Entry => ({
    key: `${kind}:${x},${y}`,
    kind,
    layer: 3,
    at: { x, y },
    assetId: "feature",
  });

  it("draws a feature cell as a single range-style mountain, outside every range", () => {
    const packed = cells([
      ...board(["MMMM", "MMMM"]),
      feature("RESOURCE", 0, 0),
      feature("CURIOSITY", 3, 1),
    ]);
    for (const [x, y] of [
      [0, 0],
      [3, 1],
    ] as const) {
      const cell = packed.get(`${x},${y}`);
      expect(cell).toMatchObject({
        clearing: false,
        glade: false,
        mined: null,
      });
      expect(cell?.bodies).toEqual([
        { shape: "1x1", x, y, variant: (x + y) % 2 },
      ]);
    }
    const all = [...packed.values()].flatMap((cell) => cell.bodies);
    const covering = (x: number, y: number): number =>
      all.filter((piece) =>
        forestPlacementCellsV7(piece).some(([cx, cy]) => cx === x && cy === y),
      ).length;
    for (let y = 0; y < 2; y += 1)
      for (let x = 0; x < 4; x += 1) expect(covering(x, y)).toBe(1);
  });

  it("gives a Mine's cell a mined mountain when the set has one", () => {
    const entries = board(["Mm", "MM"]);
    expect(cells(entries).has("1,0")).toBe(false);
    const withMines = chibiForestCellsV7(entries, COUNTS, 0, "MOUNTAIN", 2);
    const mine = withMines.get("1,0");
    expect(mine).toMatchObject({ clearing: false, bodies: [], bands: [] });
    expect([0, 1]).toContain(mine?.mined);
    // No range covers the Mine's cell.
    for (const cell of withMines.values())
      for (const piece of cell.bodies)
        expect(forestPlacementCellsV7(piece)).not.toContainEqual([1, 0]);
  });
});

// ------------------------------------------------------------- drawing

interface FakeImage {
  readonly url?: string;
  readonly surface?: number;
  readonly width?: number;
  readonly height?: number;
}

function fakeEnvironment(deferred = false): {
  readonly environment: ChibiForestRasterEnvironmentV7;
} {
  let surfaces = 0;
  return {
    environment: {
      loadImage(url, settle) {
        if (!deferred) settle(true);
        return { url } as unknown as CanvasImageSource;
      },
      readPixels: (_image, width, height) =>
        new Uint8ClampedArray(width * height * 4).fill(200),
      createSurface(_pixels, width, height) {
        surfaces += 1;
        return {
          surface: surfaces,
          width,
          height,
        } as unknown as CanvasImageSource;
      },
    },
  };
}

function art(
  set: ChibiForestArtSetV7 = CHIBI_MOUNTAIN_ART_SET_V7,
  deferred = false,
) {
  return createChibiForestArtV7({
    ...fakeEnvironment(deferred),
    redraw: vi.fn(),
    set,
  });
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
    groundUrl: "/fixture/ground.png",
  },
});
const ASSETS = [
  tall("TERRAIN:MOUNTAIN", "mountain"),
  tall("TERRAIN:MINED_MOUNTAIN", "mine"),
  tall("TERRAIN:FOREST", "forest"),
  {
    id: "grass",
    subject: "TERRAIN:GRASS",
    assetClass: "TERRAIN",
    width: 80,
    height: 80,
    url: "/fixture/grass.png",
  },
] as const satisfies readonly ChibiArtAssetV7[];

function fakeChibi(): ChibiBoardArtV7 {
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = ASSETS.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      return {
        kind: "READY",
        asset,
        image: { master: asset.id } as unknown as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
        ...("layers" in asset
          ? {
              layers: {
                ground: { ground: asset.id } as unknown as CanvasImageSource,
                body: { body: asset.id } as unknown as CanvasImageSource,
              },
            }
          : {}),
      };
    },
  };
}

function draw(
  entries: readonly Entry[],
  options: {
    readonly artSet?: "LEGACY" | "CHIBI";
    readonly mountainArt?: ReturnType<typeof art> | null;
    readonly iceFolkArt?: IceFolkBoardArtV7;
  } = {},
): unknown[][] {
  const log: unknown[][] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                if (key === "drawImage") log.push(args);
              },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  ) as CanvasRenderingContext2D;
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
    images: {
      resolve: (assetId: string) =>
        ({ legacy: assetId }) as unknown as CanvasImageSource,
      resolveTerrainGround: (assetId: string) =>
        ({ legacyGround: assetId }) as unknown as CanvasImageSource,
      resolveRaisedTerrain: (assetId: string) =>
        ({ legacyRaised: assetId }) as unknown as CanvasImageSource,
    },
    artSet,
    chibiArt: fakeChibi(),
    ...(options.mountainArt === null
      ? {}
      : { mountainArt: options.mountainArt ?? art() }),
    ...(options.iceFolkArt === undefined
      ? {}
      : { iceFolkArt: options.iceFolkArt }),
  });
  return log;
}

const kindOf = (image: unknown): string => {
  const fake = image as FakeImage & {
    ground?: string;
    body?: string;
    master?: string;
    caps?: unknown;
  };
  if (fake.caps !== undefined) return "caps";
  if (fake.ground !== undefined) return `ground:${fake.ground}`;
  if (fake.body !== undefined) return `body:${fake.body}`;
  if (fake.master !== undefined) return `master:${fake.master}`;
  if (fake.url !== undefined)
    return fake.url.includes("join") ? "join" : "image";
  return `surface:${fake.width}x${fake.height}`;
};
const named = (calls: unknown[][]): unknown[][] =>
  calls.map((call) => [kindOf(call[0]), ...call.slice(1)]);

/** An origin whose lone 2 x 2 block the cover packs as one massif. */
function fullBlock(): { readonly ox: number; readonly oy: number } {
  for (let oy = 0; oy < 12; oy += 1)
    for (let ox = 0; ox < 12; ox += 1) {
      const pieces = packRangeCoverV7(
        [
          [ox, oy],
          [ox + 1, oy],
          [ox, oy + 1],
          [ox + 1, oy + 1],
        ],
        COUNTS,
      );
      if (pieces.length === 1 && pieces[0]?.shape === "2x2") return { ox, oy };
    }
  throw new Error("no origin packs as a 2 x 2 range");
}

describe("composed mountain drawing", () => {
  const { ox, oy } = fullBlock();
  const X = ox * 80;
  const Y = 24 + oy * 80;
  const block = board(["MM", "MM"], ox, oy);

  it("draws a full block as its four grounds and one 2 x 2 range", () => {
    const drawn = named(draw(block));
    // The ground of every cell is drawn as before (the rocky tile).
    expect(drawn.filter((call) => call[0] === "ground:mountain").length).toBe(
      4,
    );
    // No single mountain body, no shade: the range and its band only.
    expect(
      drawn.filter((call) => !String(call[0]).startsWith("ground")),
    ).toEqual([
      ["surface:160x160", X, Y, 160, 160],
      ["surface:160x24", X, Y - 24, 160, 24],
    ]);
  });

  it("keeps the single mountain while the set loads or is missing", () => {
    const single = [terrain(ox, oy, "TERRAIN:MOUNTAIN")];
    const expected = named(draw(single, { mountainArt: null }));
    expect(expected.map((call) => call[0])).toContain("master:mountain");
    expect(
      named(
        draw(single, { mountainArt: art(CHIBI_MOUNTAIN_ART_SET_V7, true) }),
      ),
    ).toEqual(expected);
  });

  it("leaves the LEGACY art set alone", () => {
    expect(draw(block, { artSet: "LEGACY" })).toEqual(
      draw(block, { artSet: "LEGACY", mountainArt: null }),
    );
  });

  it("draws a Mine as the range-style mined mountain over its old ground", () => {
    const entries = board(["Mm", "MM"], ox, oy);
    const drawn = named(draw(entries));
    // The Mine's cell: its ground as before, then the mined mountain's
    // cell part after the Roads and its band in the foreground.
    expect(drawn).toContainEqual([
      "ground:mine",
      0,
      0,
      80,
      80,
      X + 80,
      Y,
      80,
      80,
    ]);
    const kinds = drawn.map((call) => call[0]);
    expect(kinds).not.toContain("body:mine");
    expect(kinds).not.toContain("master:mine");
    expect(drawn).toContainEqual(["surface:80x80", X + 80, Y, 80, 80]);
    expect(drawn).toContainEqual(["surface:80x24", X + 80, Y - 24, 80, 24]);
    expect(kinds).not.toContain("surface:160x160");
    // Without the set, the old mined mountain is drawn as before.
    const before = named(draw(entries, { mountainArt: null }));
    expect(before.map((call) => call[0])).toContain("master:mine");
  });

  it("caps only the Snow cells of a range", () => {
    const iceFolkArt = {
      snowTile: () => null,
      caps: (image: CanvasImageSource) =>
        ({ caps: image }) as unknown as CanvasImageSource,
      casing: () => null,
    } as unknown as IceFolkBoardArtV7;
    const mixed = block.map((entry) =>
      entry.at.x === ox && entry.at.y === oy
        ? { ...entry, snow: { edges: 0, variant: 0 } }
        : entry,
    );
    expect(
      named(draw(mixed, { iceFolkArt })).filter((call) => call[0] === "caps"),
    ).toEqual([
      ["caps", 0, 0, 80, 80, X, Y, 80, 80],
      ["caps", 0, 0, 80, 24, X, Y - 24, 80, 24],
    ]);
  });

  it("stays within three image draws per Mountain cell on a full board", () => {
    const size = 24;
    const rows = Array.from({ length: size }, () => "M".repeat(size));
    const drawn = draw(board(rows));
    expect(drawn.length).toBeLessThanOrEqual(size * size * 3);
    expect(drawn.length).toBeGreaterThan(size * size);
  });

  it("never draws a range over a cell that has no Mountain entry", () => {
    for (const call of draw(board(["MM?", "MM?", "???"], ox, oy))) {
      const [x, y, w, h] = call.length === 5 ? call.slice(1) : call.slice(5);
      expect(x as number).toBeGreaterThanOrEqual(X);
      expect((x as number) + (w as number)).toBeLessThanOrEqual(X + 160);
      expect(y as number).toBeGreaterThanOrEqual(Y - 24);
      expect((y as number) + (h as number)).toBeLessThanOrEqual(Y + 160);
    }
  });
});
