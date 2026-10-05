import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import record from "../../src/assets/chibi-mountain-ranges.json";
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
import type { ChibiForestRasterEnvironmentV7 } from "../../src/render/canvas/chibi-forest-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  MASSIF_LOW_UP_V7,
  MASSIF_TALL_UP_V7,
  chibiMassifCellsV7,
  createChibiMassifArtV7,
  packMassifV7,
  type ChibiMassifArtSetV7,
  type MassifPlacementV7,
  type MassifVariantCountsV7,
} from "../../src/render/canvas/chibi-massif-v7";
import type { IceFolkBoardArtV7 } from "../../src/render/canvas/ice-folk-canvas-v7";

/**
 * pulp_wars-e9f and pulp_wars-2o7.1 (docs/art/COMPOSED_TERRAIN.md): a group
 * of Mountain cells is drawn as one massif. Every row is covered by ridges
 * and single mountains that fill their cells; a piece under another plain
 * Mountain is tall and rises over the row behind; Mines and feature cells
 * keep a mountain of their own and nothing covers them.
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

const COUNTS: MassifVariantCountsV7 = { low1: 8, low2: 8, tall1: 6, tall2: 6 };

const cells = (entries: readonly Entry[], mined = 0) =>
  chibiMassifCellsV7(entries, COUNTS, mined);

const coords = (rows: readonly string[]): [number, number][] =>
  rows.flatMap((row, y) =>
    [...row].flatMap((mark, x): [number, number][] =>
      mark === "M" ? [[x, y]] : [],
    ),
  );

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

describe("massif set", () => {
  it("ships low and tall ridges and single mountains, and one mined mountain", () => {
    const counts = { low1: 0, low2: 0, tall1: 0, tall2: 0 };
    const ids = new Set<string>();
    for (const piece of CHIBI_MOUNTAIN_ART_SET_V7.pieces) {
      ids.add(piece.id);
      const slot = `${piece.tall ? "tall" : "low"}${piece.columns}` as const;
      // Variants of a kind are numbered from 0 without a gap.
      expect(piece.variant).toBe(counts[slot]);
      counts[slot] += 1;
      expect(piece.width).toBe(piece.columns * 80);
      expect(piece.height).toBe(
        80 + (piece.tall ? MASSIF_TALL_UP_V7 : MASSIF_LOW_UP_V7),
      );
      expect(piece.id.includes("-tall-")).toBe(piece.tall);
      expect(piece.url).toContain(
        "assets/chibi/mountains/chibi-mountain-range-",
      );
    }
    expect(ids.size).toBe(CHIBI_MOUNTAIN_ART_SET_V7.pieces.length);
    // Nothing is mirrored since pulp_wars-2yc.1; one low ridge fewer.
    expect(counts).toEqual({ low1: 8, low2: 7, tall1: 6, tall2: 6 });
    expect(CHIBI_MOUNTAIN_ART_SET_V7.mined.map((piece) => piece.url)).toEqual([
      expect.stringContaining("chibi-mountain-range-mine-a.png"),
    ]);
  });
});

describe("massif cover", () => {
  const area = [
    "MMMMM..M",
    "MMMM.MMM",
    ".MMMMMM.",
    "MM..MMMM",
    "M.MMMMMM",
    "MMMMMM.M",
  ];
  const packed = packMassifV7(coords(area), COUNTS);
  const covered = (piece: MassifPlacementV7): string[] =>
    Array.from(
      { length: piece.columns },
      (_, column) => `${piece.x + column},${piece.y}`,
    );

  it("covers every cell exactly once, deterministically", () => {
    const seen = packed.flatMap(covered);
    expect([...seen].sort()).toEqual(
      coords(area)
        .map(([x, y]) => `${x},${y}`)
        .sort(),
    );
    expect(new Set(seen).size).toBe(seen.length);
    expect(packMassifV7(coords(area).reverse(), COUNTS)).toEqual(packed);
  });

  it("makes a piece tall exactly when every cell above it is Mountain", () => {
    const plain = new Set(coords(area).map(([x, y]) => `${x},${y}`));
    for (const piece of packed) {
      const above = Array.from({ length: piece.columns }, (_, column) =>
        plain.has(`${piece.x + column},${piece.y - 1}`),
      );
      expect(piece.tall, `${piece.x},${piece.y}`).toBe(above.every(Boolean));
      expect(piece.variant).toBeLessThan(
        piece.columns === 2
          ? piece.tall
            ? COUNTS.tall2
            : COUNTS.low2
          : piece.tall
            ? COUNTS.tall1
            : COUNTS.low1,
      );
    }
    // The top row of an area is always low.
    expect(packed.filter((piece) => piece.y === 0 && piece.tall)).toEqual([]);
  });

  it("uses ridges wherever two cells lie side by side, laid like bricks", () => {
    // A run of two is one ridge; three is a ridge and a single.
    expect(
      packMassifV7(coords(["MM"]), COUNTS).map((piece) => piece.columns),
    ).toEqual([2]);
    expect(
      packMassifV7(coords(["MMM"]), COUNTS)
        .map((piece) => piece.columns)
        .sort(),
    ).toEqual([1, 2]);
    // The user's block, two wide and three deep: one ridge per row, the
    // two front rows tall.
    expect(
      packMassifV7(coords(["MM", "MM", "MM"]), COUNTS).map((piece) => [
        piece.x,
        piece.y,
        piece.columns,
        piece.tall,
      ]),
    ).toEqual([
      [0, 0, 2, false],
      [0, 1, 2, true],
      [0, 2, 2, true],
    ]);
    // Four wide: the ridges of one row start a cell off those of the next.
    const wide = packMassifV7(coords(["MMMM", "MMMM"]), COUNTS);
    const starts = (y: number): number[] =>
      wide
        .filter((piece) => piece.y === y && piece.columns === 2)
        .map((piece) => piece.x);
    expect(starts(0)).not.toEqual(starts(1));
    // Without ridges in the set, every cell is a single mountain.
    expect(
      packMassifV7(coords(["MMM"]), { ...COUNTS, low2: 0, tall2: 0 }).map(
        (piece) => piece.columns,
      ),
    ).toEqual([1, 1, 1]);
  });

  it("never repeats a piece beside or under itself", () => {
    const at = new Map<string, MassifPlacementV7>();
    for (const piece of packed)
      for (const cell of covered(piece)) at.set(cell, piece);
    const same = (a: MassifPlacementV7, b: MassifPlacementV7): boolean =>
      a !== b &&
      a.columns === b.columns &&
      a.tall === b.tall &&
      a.variant === b.variant;
    for (const piece of packed) {
      const west = at.get(`${piece.x - 1},${piece.y}`);
      const north = at.get(`${piece.x},${piece.y - 1}`);
      if (west !== undefined) expect(same(piece, west)).toBe(false);
      if (north !== undefined) expect(same(piece, north)).toBe(false);
    }
  });
});

describe("massif cells of a plan", () => {
  it("covers Mountains only, never fog, Grass, Forest or a Mine", () => {
    const entries = board(["MMg", "MmF", "MM?"]);
    const result = cells(entries, 1);
    expect([...result.keys()].sort()).toEqual(
      ["0,0", "1,0", "0,1", "1,1", "0,2", "1,2"].sort(),
    );
    expect(result.get("1,1")).toMatchObject({ mined: 0, bodies: [] });
    for (const [at, cell] of result) {
      if (at === "1,1") continue;
      expect(cell.mined).toBeNull();
    }
    const drawn = [...result.values()].flatMap((cell) => cell.bodies);
    for (const piece of drawn)
      for (let column = 0; column < piece.columns; column += 1)
        expect(["0,0", "1,0", "0,1", "0,2", "1,2"]).toContain(
          `${piece.x + column},${piece.y}`,
        );
    // Without a mined mountain in the set, the Mine keeps its old art.
    expect(cells(entries, 0).has("1,1")).toBe(false);
  });

  it("keeps the piece south of a Mine or a feature low, so nothing covers them", () => {
    const entries = [
      ...board(["MmM", "MMM"]),
      {
        key: "resource:2,0",
        kind: "RESOURCE",
        layer: 3,
        at: { x: 2, y: 0 },
      } as Entry,
    ];
    const result = cells(entries, 1);
    // The feature cell: a low single mountain of its own.
    expect(result.get("2,0")?.bodies).toEqual([
      expect.objectContaining({ x: 2, y: 0, columns: 1, tall: false }),
    ]);
    const south = [...result.values()]
      .flatMap((cell) => cell.bodies)
      .filter((piece) => piece.y === 1);
    const over = (x: number): MassifPlacementV7 | undefined =>
      south.find((piece) => x >= piece.x && x < piece.x + piece.columns);
    // Under the plain Mountain the piece may be tall; under the Mine and
    // under the Ore it is low.
    expect(over(1)?.tall).toBe(false);
    expect(over(2)?.tall).toBe(false);
    // A low piece draws its band in the foreground; a tall one has none.
    for (const cell of result.values())
      for (const piece of cell.bodies)
        if (piece.tall)
          for (let column = 0; column < piece.columns; column += 1)
            expect(
              result.get(`${piece.x + column},${piece.y}`)?.band,
            ).toBeNull();
    expect(result.get("2,0")?.band).toMatchObject({ column: 0 });
  });
});

describe("the restyled set (pulp_wars-2yc.1)", () => {
  it("is lit from the left, piece by piece, and nothing is mirrored", () => {
    for (const piece of [...record.pieces, ...record.mines]) {
      // The bake's lighting QA: left half minus right half of every rock
      // face, in luma points; +1.5 or more is lit from the left.
      expect(piece.light.faces, piece.id).toBeGreaterThanOrEqual(1.5);
      for (const part of piece.parts)
        expect(Object.keys(part), piece.id).not.toContain("flip");
    }
  });

  it("records the restyle: slate outline, warm rock, cream snow, a cut foot", () => {
    const { restyle } = record.derive;
    expect(restyle.outline).toEqual([78, 68, 70]);
    expect(restyle.warm).toBeGreaterThan(0);
    expect(restyle.snow[0]).toBeGreaterThan(restyle.snow[2] ?? 255);
    expect(restyle.footRows[0]).toBeGreaterThan(0);
  });

  it("stands the mined mountain's interface master on Grass", () => {
    expect(record.sources.map((source) => source.path)).toContain(
      "public/assets/chibi/terrain/chibi-grass-1.png",
    );
    expect(record.sources.map((source) => source.path)).not.toContain(
      "public/assets/chibi/terrain/chibi-mountain-ground-1.png",
    );
  });
});

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
  set: ChibiMassifArtSetV7 = CHIBI_MOUNTAIN_ART_SET_V7,
  deferred = false,
) {
  return createChibiMassifArtV7({
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
  const layers = new Map<string, { ground: unknown; body: unknown }>();
  return {
    resolve: (request): ChibiResolutionV7 => {
      const asset = ASSETS.find((item) => item.subject === request.subject);
      if (asset === undefined) return { kind: "MISSING" };
      // One ground object per asset, as the resolver keeps its rasters.
      let own = layers.get(asset.id);
      if (own === undefined) {
        own = { ground: { ground: asset.id }, body: { body: asset.id } };
        layers.set(asset.id, own);
      }
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
                ground: own.ground as CanvasImageSource,
                body: own.body as CanvasImageSource,
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
  if (fake.url !== undefined) return "image";
  return `surface:${fake.width}x${fake.height}`;
};
const named = (calls: unknown[][]): unknown[][] =>
  calls.map((call) => [kindOf(call[0]), ...call.slice(1)]);

/** The destination rectangle of a draw call (5 or 9 arguments). */
const rect = (call: unknown[]): number[] =>
  (call.length === 5 ? call.slice(1) : call.slice(5)) as number[];

describe("massif drawing", () => {
  // Cell (x, y) has its top-left corner at (x * 80, 24 + y * 80).
  const X = 0;
  const Y = 24;
  const block = board(["MM", "MM"]);

  it("draws a block on Grass, a low ridge with its bands and a tall ridge over it", () => {
    const drawn = named(draw(block));
    // A massif stands on the cell's own Grass (pulp_wars-2yc.1), never on
    // the rocky ground tile, plain or darkened.
    expect(drawn.filter((call) => call[0] === "ground:mountain")).toEqual([]);
    expect(drawn.filter((call) => call[0] === "surface:80x80")).toEqual([]);
    expect(
      drawn.filter((call) => call[0] === "master:grass").map(rect),
    ).toEqual([
      [X, Y, 80, 80],
      [X + 80, Y, 80, 80],
      [X, Y + 80, 80, 80],
      [X + 80, Y + 80, 80, 80],
    ]);
    const pieces = drawn.filter(
      (call) => call[0] !== "master:grass" && !String(call[0]).startsWith("g"),
    );
    expect(pieces).toEqual([
      // The back row: a low ridge, its footprint in the body pass.
      ["surface:160x80", X, Y, 160, 80],
      // The front row: a tall ridge, drawn whole, 48 px over the back row.
      ["surface:160x128", X, Y + 80 - 48, 160, 128],
      // The low ridge's bands, cell by cell, in the foreground.
      ["surface:80x24", X, Y - 24, 80, 24],
      ["surface:80x24", X + 80, Y - 24, 80, 24],
    ]);
  });

  it("draws the user's 2 x 3 block as three ridges, each front row over the one behind", () => {
    const drawn = named(draw(board(["MM", "MM", "MM"])));
    expect(
      drawn
        .filter((call) => String(call[0]).startsWith("surface:160"))
        .map((call) => [call[0], ...rect(call)]),
    ).toEqual([
      ["surface:160x80", X, Y, 160, 80],
      ["surface:160x128", X, Y + 32, 160, 128],
      ["surface:160x128", X, Y + 112, 160, 128],
    ]);
  });

  it("keeps the single mountain while the set loads or is missing", () => {
    const single = [terrain(0, 0, "TERRAIN:MOUNTAIN")];
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

  it("draws a Mine as the mined mountain, and keeps the row south of it low", () => {
    const entries = board(["Mm", "MM"]);
    const drawn = named(draw(entries));
    const kinds = drawn.map((call) => call[0]);
    expect(kinds).not.toContain("body:mine");
    expect(kinds).not.toContain("master:mine");
    // The Mine's cell part after the Roads and its band in the foreground.
    expect(drawn).toContainEqual(["surface:80x80", X + 80, Y, 80, 80]);
    expect(drawn).toContainEqual(["surface:80x24", X + 80, Y - 24, 80, 24]);
    // Nothing tall rises over the Mine: the ridge south of it is low.
    expect(kinds).not.toContain("surface:160x128");
    expect(drawn).toContainEqual(["surface:160x80", X, Y + 80, 160, 80]);
    // Without the set, the old mined mountain is drawn as before.
    const before = named(draw(entries, { mountainArt: null }));
    expect(before.map((call) => call[0])).toContain("master:mine");
  });

  it("caps only the Snow columns of a piece", () => {
    const iceFolkArt = {
      snowTile: () => null,
      caps: (image: CanvasImageSource) =>
        ({ caps: image }) as unknown as CanvasImageSource,
      casing: () => null,
    } as unknown as IceFolkBoardArtV7;
    const mixed = block.map((entry) =>
      entry.at.x === 0 ? { ...entry, snow: { edges: 0, variant: 0 } } : entry,
    );
    expect(
      named(draw(mixed, { iceFolkArt })).filter((call) => call[0] === "caps"),
    ).toEqual([
      // The low ridge's west column, then the tall ridge's, then the band.
      ["caps", 0, 0, 80, 80, X, Y, 80, 80],
      ["caps", 0, 0, 80, 128, X, Y + 32, 80, 128],
      ["caps", X, Y - 24, 80, 24],
    ]);
  });

  it("stays within three image draws per Mountain cell on a full board", () => {
    const size = 24;
    const rows = Array.from({ length: size }, () => "M".repeat(size));
    const drawn = draw(board(rows));
    expect(drawn.length).toBeLessThanOrEqual(size * size * 3);
    expect(drawn.length).toBeGreaterThan(size * size);
  });

  it("never draws rock over a cell that has no Mountain entry, beyond the old 24 px band", () => {
    const rows = ["MM?", "MMg", "?MM"];
    const mountain = new Set(coords(rows).map(([x, y]) => `${x},${y}`));
    for (const call of named(draw(board(rows)))) {
      if (!String(call[0]).startsWith("surface")) continue;
      const [x = 0, y = 0, w = 0, h = 0] = rect(call);
      for (let cx = Math.floor(x / 80); cx * 80 < x + w; cx += 1) {
        // The lowest row the draw reaches is its footprint; a band (24 px
        // tall) lies over the row above the cell it belongs to.
        const footRow = Math.floor((y + h - (h === 24 ? 0 : 1) - 24) / 80);
        expect(mountain.has(`${cx},${footRow}`)).toBe(true);
        const top = y - 24 - footRow * 80;
        // Above its footprint: a 24 px band, or Mountain all the way up.
        if (top < -24) expect(mountain.has(`${cx},${footRow - 1}`)).toBe(true);
        expect(top).toBeGreaterThanOrEqual(-48);
      }
    }
  });
});
