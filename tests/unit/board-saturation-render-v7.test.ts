import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  BOARD_SATURATION_STORAGE_KEY_V7,
  loadBoardSaturationV7,
  parseStoredBoardSaturationV7,
  storeBoardSaturationV7,
} from "../../src/app/board-saturation-v7";
import {
  boardSaturationGroupV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  DEFAULT_BOARD_SATURATION_V7,
  clampSaturationPercentV7,
  createSpriteSaturationCacheV7,
  desaturateHexColourV7,
  desaturatePixelsV7,
  type BoardSaturationV7,
  type SpriteSaturationCacheV7,
} from "../../src/render/canvas/sprite-saturation-v7";

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

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("board saturation setting (pulp_wars-x6c)", () => {
  it("clamps to 0-100 on the 5 percent step and defaults to 100", () => {
    expect(clampSaturationPercentV7(60)).toBe(60);
    expect(clampSaturationPercentV7(-20)).toBe(0);
    expect(clampSaturationPercentV7(250)).toBe(100);
    expect(clampSaturationPercentV7(62)).toBe(60);
    expect(clampSaturationPercentV7(63)).toBe(65);
    for (const invalid of [undefined, null, "40", Number.NaN, Infinity, {}])
      expect(clampSaturationPercentV7(invalid)).toBe(100);
  });

  it("tolerates missing, malformed and out-of-range stored values", () => {
    expect(parseStoredBoardSaturationV7(null)).toEqual(
      DEFAULT_BOARD_SATURATION_V7,
    );
    for (const malformed of ["", "{", "null", "7", '"x"', "[]"])
      expect(parseStoredBoardSaturationV7(malformed)).toEqual({
        building: 100,
        city: 100,
      });
    expect(parseStoredBoardSaturationV7('{"building":-5,"city":140}')).toEqual({
      building: 0,
      city: 100,
    });
    expect(parseStoredBoardSaturationV7('{"building":35}')).toEqual({
      building: 35,
      city: 100,
    });
    expect(
      parseStoredBoardSaturationV7('{"building":"30","city":null}'),
    ).toEqual({ building: 100, city: 100 });
  });

  it("persists under its own key and survives restricted storage", () => {
    const storage = memoryStorage();
    expect(loadBoardSaturationV7(storage)).toEqual({
      building: 100,
      city: 100,
    });
    expect(storeBoardSaturationV7(storage, { building: 30, city: 60 })).toBe(
      true,
    );
    expect(storage.getItem(BOARD_SATURATION_STORAGE_KEY_V7)).toBe(
      '{"building":30,"city":60}',
    );
    expect(loadBoardSaturationV7(storage)).toEqual({ building: 30, city: 60 });
    expect(loadBoardSaturationV7(null)).toEqual({ building: 100, city: 100 });
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => undefined,
    };
    expect(loadBoardSaturationV7(denied)).toEqual({ building: 100, city: 100 });
    expect(storeBoardSaturationV7(denied, { building: 0, city: 0 })).toBe(
      false,
    );
  });
});

describe("sprite desaturation (pulp_wars-x6c)", () => {
  it("mixes each pixel toward its luminance and keeps alpha", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 0, 255, 128, 40, 200, 90, 0,
    ]);
    expect([...desaturatePixelsV7(pixels, 100)]).toEqual([...pixels]);
    const grey = desaturatePixelsV7(pixels, 0);
    // 0.299 * 255 = 76; 0.114 * 255 = 29; a transparent pixel is untouched.
    expect([...grey]).toEqual([
      76, 76, 76, 255, 29, 29, 29, 128, 40, 200, 90, 0,
    ]);
    const half = desaturatePixelsV7(pixels, 50);
    expect([...half.slice(0, 4)]).toEqual([166, 38, 38, 255]);
    // The input is never modified.
    expect(pixels[0]).toBe(255);
    expect(desaturateHexColourV7("#ff0000", 100)).toBe("#ff0000");
    expect(desaturateHexColourV7("#ff0000", 0)).toBe("#4c4c4c");
    expect(desaturateHexColourV7("#ffffff", 0)).toBe("#ffffff");
    expect(desaturateHexColourV7("not-a-colour", 0)).toBe("not-a-colour");
  });

  it("builds one copy per sprite and level, replaces it on a new level and skips 100", () => {
    const readPixels = vi.fn(
      () => new Uint8ClampedArray([200, 100, 0, 255]) as Uint8ClampedArray,
    );
    const createSurface = vi.fn(
      (pixels: Uint8ClampedArray, width: number, height: number) =>
        ({
          pixels: [...pixels],
          width,
          height,
        }) as unknown as CanvasImageSource,
    );
    const cache = createSpriteSaturationCacheV7({ readPixels, createSurface });
    const sprite = { width: 1, height: 1 } as unknown as CanvasImageSource;
    expect(cache.resolve(sprite, 100)).toBe(sprite);
    expect(readPixels).not.toHaveBeenCalled();
    const at60 = cache.resolve(sprite, 60);
    expect(at60).not.toBe(sprite);
    // Redrawing at the same level does no pixel work.
    expect(cache.resolve(sprite, 60)).toBe(at60);
    expect(readPixels).toHaveBeenCalledTimes(1);
    expect(readPixels).toHaveBeenCalledWith(sprite, 1, 1);
    const at30 = cache.resolve(sprite, 30);
    expect(at30).not.toBe(at60);
    expect(createSurface).toHaveBeenCalledTimes(2);
    // Only the latest level is kept: going back rebuilds.
    cache.resolve(sprite, 60);
    expect(createSurface).toHaveBeenCalledTimes(3);
    // An HTML image reports its natural size.
    const image = {
      naturalWidth: 4,
      naturalHeight: 2,
      width: 0,
      height: 0,
    } as unknown as CanvasImageSource;
    cache.resolve(image, 0);
    expect(readPixels).toHaveBeenLastCalledWith(image, 4, 2);
  });

  it("falls back to the sprite itself when its pixels cannot be read", () => {
    const readPixels = vi.fn(() => null);
    const cache = createSpriteSaturationCacheV7({
      readPixels,
      createSurface: () => null,
    });
    const sprite = { width: 2, height: 2 } as unknown as CanvasImageSource;
    expect(cache.resolve(sprite, 40)).toBe(sprite);
    expect(cache.resolve(sprite, 40)).toBe(sprite);
    expect(readPixels).toHaveBeenCalledTimes(1);
    const unsized = {} as unknown as CanvasImageSource;
    expect(cache.resolve(unsized, 40)).toBe(unsized);
    expect(readPixels).toHaveBeenCalledTimes(1);
  });
});

function entry(
  kind: BoardRenderPlanEntryV7["kind"],
  x: number,
  y: number,
  assetId: string,
  artSubject: ArtSubjectV7,
  extra: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanEntryV7 {
  return {
    key: `${kind.toLowerCase()}:${x},${y}`,
    kind,
    layer: kind === "TERRAIN" ? 1 : kind === "UNIT" ? 5 : 4,
    at: { x, y },
    assetId,
    artSubject,
    ...extra,
  };
}

const ENTRIES: readonly BoardRenderPlanEntryV7[] = [
  entry("TERRAIN", 0, 0, "terrain-ruleset7-original-grass-1", "TERRAIN:GRASS"),
  entry(
    "TERRAIN",
    1,
    0,
    "terrain-ruleset7-revision3-mined-mountain-1",
    "TERRAIN:MINED_MOUNTAIN",
  ),
  entry(
    "TERRAIN",
    2,
    0,
    "terrain-ruleset7-revision3-mountain-1",
    "TERRAIN:MOUNTAIN",
  ),
  entry("RESOURCE", 0, 0, "resource-fruit", "RESOURCE:FRUIT", { layer: 3 }),
  entry("IMPROVEMENT", 0, 1, "building-windmill", "IMPROVEMENT:WINDMILL"),
  entry("IMPROVEMENT", 1, 1, "building-market", "IMPROVEMENT:MARKET"),
  entry("SITE", 2, 1, "building-village", "SITE:VILLAGE"),
  entry("CITY", 0, 2, "building-city-1", "CITY:1", {
    key: "city:1",
    ownerColor: "#f06762",
    value: 1,
    population: 1,
  }),
  entry("UNIT", 1, 2, "unit-fighter", "UNIT:FIGHTER", {
    key: "unit:7",
    ownerColor: "#f06762",
  }),
];

const plan: BoardRenderPlanV7 = { version: 7, entries: ENTRIES, targets: [] };

/** Legacy rasters, named by asset; tall terrain also has a raised body. */
const rasters = new Map<string, CanvasImageSource>();
/** One stable object per raster, as the real resolvers return. */
function raster(kind: string, name: string): CanvasImageSource {
  const key = `${kind}:${name}`;
  const existing = rasters.get(key);
  if (existing !== undefined) return existing;
  const created = { [kind]: name } as unknown as CanvasImageSource;
  rasters.set(key, created);
  return created;
}
const legacyImages = {
  resolve: (assetId: string) => raster("legacy", assetId),
  resolveTerrainGround: (assetId: string) => raster("ground", assetId),
  resolveRaisedTerrain: (assetId: string) => raster("raised", assetId),
};

function chibiArt(): ChibiBoardArtV7 {
  return {
    resolve: (request): ChibiResolutionV7 => {
      const tall = request.subject.startsWith("TERRAIN:M");
      const asset: ChibiArtAssetV7 = {
        id: `fixture-${request.subject}`,
        subject: request.subject,
        assetClass: request.subject.startsWith("TERRAIN:")
          ? tall
            ? "TALL_TERRAIN"
            : "TERRAIN"
          : request.subject.startsWith("UNIT:")
            ? "STANDARD_UNIT"
            : "SETTLEMENT",
        width: 80,
        height: tall ? 120 : 80,
        url: `/fixture/${request.subject}.png`,
      } as ChibiArtAssetV7;
      return {
        kind: "READY",
        asset,
        image: raster("chibi", request.subject),
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
      };
    },
  };
}

/** A cache that tags each copy with its source and level. */
function taggingCache(): SpriteSaturationCacheV7 & {
  readonly resolve: ReturnType<typeof vi.fn>;
} {
  return {
    resolve: vi.fn(
      (image: CanvasImageSource, percent: number) =>
        ({ desaturated: image, percent }) as unknown as CanvasImageSource,
    ),
  };
}

function draw(
  artSet: "CHIBI" | "LEGACY",
  saturation?: {
    readonly levels: BoardSaturationV7;
    readonly cache: SpriteSaturationCacheV7;
  },
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: 1, offsetX: 200, offsetY: 200 },
    plan,
    images: legacyImages,
    artSet,
    chibiArt: chibiArt(),
    ...(saturation === undefined ? {} : { saturation }),
  });
  return log;
}

const drawnImages = (log: readonly LogEntry[]): unknown[] =>
  log.filter((call) => call[0] === "drawImage").map((call) => call[1]);

describe("board drawing with saturation (pulp_wars-x6c)", () => {
  it("groups improvements, Mines and Field Defense as buildings, cities and Villages as cities, and nothing else", () => {
    const group = (key: string) => {
      const found = ENTRIES.find((candidate) => candidate.key === key);
      if (found === undefined) throw new Error(`entry ${key} missing`);
      return boardSaturationGroupV7(found);
    };
    expect(group("improvement:0,1")).toBe("BUILDING");
    expect(group("improvement:1,1")).toBe("BUILDING");
    expect(group("terrain:1,0")).toBe("BUILDING");
    expect(group("city:1")).toBe("CITY");
    expect(group("site:2,1")).toBe("CITY");
    expect(group("terrain:0,0")).toBeNull();
    expect(group("terrain:2,0")).toBeNull();
    expect(group("resource:0,0")).toBeNull();
    expect(group("unit:7")).toBeNull();
    const other = (kind: BoardRenderPlanEntryV7["kind"]) =>
      boardSaturationGroupV7({ key: "k", kind, layer: 1, at: { x: 0, y: 0 } });
    expect(other("FIELD_DEFENSE")).toBe("BUILDING");
    for (const kind of [
      "ROAD",
      "ROAD_JOIN",
      "TREASURE",
      "STATUS",
      "TARGET",
      "TERRITORY_BOUNDARY",
      "SELECTION",
      "GRAVE",
      "FOG",
    ] as const)
      expect(other(kind)).toBeNull();
    // A site that is not a Village follows no slider.
    expect(
      boardSaturationGroupV7({
        key: "k",
        kind: "SITE",
        layer: 4,
        at: { x: 0, y: 0 },
      }),
    ).toBeNull();
  });

  for (const artSet of ["CHIBI", "LEGACY"] as const) {
    it(`${artSet}: 100 percent requests no copy and draws exactly as without the setting`, () => {
      const cache = taggingCache();
      const baseline = draw(artSet);
      const atDefault = draw(artSet, {
        levels: { building: 100, city: 100 },
        cache,
      });
      expect(cache.resolve).not.toHaveBeenCalled();
      expect(atDefault).toEqual(baseline);
    });

    it(`${artSet}: buildings and cities draw their desaturated copy; units, terrain and resources keep their raster`, () => {
      const cache = taggingCache();
      const baseline = draw(artSet);
      const log = draw(artSet, { levels: { building: 30, city: 60 }, cache });
      const before = drawnImages(baseline);
      const after = drawnImages(log);
      expect(after).toHaveLength(before.length);
      const name = (image: unknown): string => {
        const source = image as Record<string, unknown>;
        return String(
          source.chibi ?? source.legacy ?? source.raised ?? source.ground,
        );
      };
      const changed = new Map<string, number>();
      for (const [index, image] of after.entries()) {
        const copy = image as { desaturated?: unknown; percent?: number };
        if (copy.desaturated === undefined) {
          // Untouched draws are the very same raster as before.
          expect(image).toBe(before[index]);
          continue;
        }
        expect(copy.desaturated).toBe(before[index]);
        changed.set(name(copy.desaturated), copy.percent ?? -1);
      }
      const expected =
        artSet === "CHIBI"
          ? new Map([
              ["TERRAIN:MINED_MOUNTAIN", 30],
              ["IMPROVEMENT:WINDMILL", 30],
              ["IMPROVEMENT:MARKET", 30],
              ["SITE:VILLAGE", 60],
              ["CITY:1", 60],
            ])
          : new Map([
              ["terrain-ruleset7-revision3-mined-mountain-1", 30],
              ["building-windmill", 30],
              ["building-market", 30],
              ["building-village", 60],
              ["building-city-1", 60],
            ]);
      expect(changed).toEqual(expected);
      const untouched = after
        .filter(
          (image) =>
            (image as { desaturated?: unknown }).desaturated === undefined,
        )
        .map(name);
      for (const kept of artSet === "CHIBI"
        ? [
            "TERRAIN:GRASS",
            "TERRAIN:MOUNTAIN",
            "RESOURCE:FRUIT",
            "UNIT:FIGHTER",
          ]
        : [
            "terrain-ruleset7-original-grass-1",
            "terrain-ruleset7-revision3-mountain-1",
            "resource-fruit",
            "unit-fighter",
          ])
        expect(untouched).toContain(kept);
      // Everything that is not an image draw is identical: geometry,
      // overlays, badges and pips do not move or change colour.
      const withoutImages = (entries: readonly LogEntry[]) =>
        entries.map((call) =>
          call[0] === "drawImage" ? ["drawImage", ...call.slice(2)] : call,
        );
      expect(withoutImages(log)).toEqual(withoutImages(baseline));
    });

    it(`${artSet}: each slider fades only its own group`, () => {
      const cache = taggingCache();
      draw(artSet, { levels: { building: 100, city: 0 }, cache });
      const levels = cache.resolve.mock.calls.map((call) => call[1] as number);
      expect(levels.length).toBeGreaterThan(0);
      expect(new Set(levels)).toEqual(new Set([0]));
      const sources = cache.resolve.mock.calls.map((call) =>
        JSON.stringify(call[0]),
      );
      expect(sources.some((source) => source.includes("windmill"))).toBe(false);
      expect(sources.some((source) => source.includes("WINDMILL"))).toBe(false);
    });
  }
});
