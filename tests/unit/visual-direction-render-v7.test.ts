import { describe, expect, it, vi } from "vitest";
import {
  BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7,
  loadBoardVisualDirectionV7,
  parseStoredBoardVisualDirectionV7,
  storeBoardVisualDirectionV7,
} from "../../src/app/board-visual-direction-v7";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiArtRequestV7,
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  BASELINE_DIRECTION_V7,
  RECOMMENDED_DIRECTION_V7,
  UNCHANGED_TONE_V7,
  createDirectedChibiArtV7,
  directionSubjectGroupV7,
  haloPixelsV7,
  meanColourV7,
  terrainPivotV7,
  tonePixelsV7,
  type BoardVisualDirectionV7,
} from "../../src/render/canvas/visual-direction-v7";

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

const CORAL = "#f06762";
const ENTRIES: readonly BoardRenderPlanEntryV7[] = [
  entry("TERRAIN", 0, 0, "terrain-ruleset7-original-grass-1", "TERRAIN:GRASS"),
  entry("TERRAIN", 1, 0, "terrain-ruleset7-original-grass-1", "TERRAIN:GRASS"),
  { key: "road:1,0", kind: "ROAD", layer: 2, at: { x: 1, y: 0 } },
  entry("IMPROVEMENT", 0, 1, "building-windmill", "IMPROVEMENT:WINDMILL", {
    ownerColor: CORAL,
  }),
  entry("CITY", 0, 2, "building-city-1", "CITY:1", {
    key: "city:1",
    ownerColor: CORAL,
    ownerSeat: 0,
    capital: true,
    value: 1,
    population: 1,
  }),
  entry("UNIT", 1, 2, "unit-fighter", "UNIT:FIGHTER", {
    key: "unit:7",
    ownerColor: CORAL,
    ownerSeat: 0,
    hp: 10,
    maxHp: 10,
    ready: true,
  }),
  entry("UNIT", 2, 2, "unit-fighter", "UNIT:FIGHTER", {
    key: "unit:8",
    ownerColor: "#28b7a4",
    ownerSeat: 1,
    hp: 4,
    maxHp: 10,
  }),
  {
    key: "territory-owner:h:0:0",
    kind: "TERRITORY_BOUNDARY",
    layer: 7,
    at: { x: 0, y: 0 },
    edge: "NORTH",
    boundaryStyle: "OWNER",
    ownerColor: CORAL,
  },
];
const plan: BoardRenderPlanV7 = { version: 7, entries: ENTRIES, targets: [] };

const rasters = new Map<string, CanvasImageSource>();
function raster(name: string): CanvasImageSource {
  const existing = rasters.get(name);
  if (existing !== undefined) return existing;
  const created = { name, width: 2, height: 2 } as unknown as CanvasImageSource;
  rasters.set(name, created);
  return created;
}

function chibiArt(): ChibiBoardArtV7 & {
  readonly requests: ChibiArtRequestV7[];
} {
  const requests: ChibiArtRequestV7[] = [];
  return {
    requests,
    resolve: (request): ChibiResolutionV7 => {
      requests.push(request);
      const asset = {
        id:
          request.subject === "UNIT:FIGHTER"
            ? "chibi-fighter"
            : `fixture-${request.subject}`,
        subject: request.subject,
        assetClass: request.subject.startsWith("TERRAIN:")
          ? "TERRAIN"
          : request.subject.startsWith("UNIT:")
            ? "STANDARD_UNIT"
            : "SETTLEMENT",
        width: 80,
        height: 80,
        url: `/fixture/${request.subject}.png`,
      } as ChibiArtAssetV7;
      return {
        kind: "READY",
        asset,
        image: raster(`${request.subject}#${request.ownerColor ?? ""}`),
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}#${request.ownerColor ?? ""}`,
      };
    },
  };
}

const environment = {
  readPixels: (_image: CanvasImageSource, width: number, height: number) =>
    new Uint8ClampedArray(width * height * 4).fill(200),
  createSurface: (pixels: Uint8ClampedArray, width: number, height: number) =>
    ({ pixels: [...pixels], width, height }) as unknown as CanvasImageSource,
};

function draw(direction?: BoardVisualDirectionV7): LogEntry[] {
  const { context, log } = recordingContext();
  const base = chibiArt();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: 1, offsetX: 200, offsetY: 200 },
    plan,
    images: { resolve: () => null },
    artSet: "CHIBI",
    chibiArt: base,
    reducedMotion: true,
    ...(direction === undefined
      ? {}
      : {
          direction: {
            spec: direction,
            art: createDirectedChibiArtV7({ base, direction, environment }),
          },
        }),
  });
  return log;
}

describe("visual direction setting (pulp_wars-3tq.1)", () => {
  it("is off unless the stored value says recommended: true", () => {
    expect(parseStoredBoardVisualDirectionV7(null)).toBe(false);
    for (const malformed of ["", "{", "null", "true", "1", "[]", "{}"])
      expect(parseStoredBoardVisualDirectionV7(malformed)).toBe(false);
    expect(parseStoredBoardVisualDirectionV7('{"recommended":"yes"}')).toBe(
      false,
    );
    expect(parseStoredBoardVisualDirectionV7('{"recommended":true}')).toBe(
      true,
    );
  });

  it("persists under its own key and survives restricted storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
    expect(loadBoardVisualDirectionV7(storage)).toBe(false);
    expect(storeBoardVisualDirectionV7(storage, true)).toBe(true);
    expect(values.get(BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7)).toBe(
      '{"recommended":true}',
    );
    expect(loadBoardVisualDirectionV7(storage)).toBe(true);
    expect(loadBoardVisualDirectionV7(null)).toBe(false);
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => undefined,
    };
    expect(loadBoardVisualDirectionV7(denied)).toBe(false);
    expect(storeBoardVisualDirectionV7(denied, true)).toBe(false);
  });
});

describe("sprite toning (pulp_wars-3tq.1)", () => {
  const pixels = new Uint8ClampedArray([
    200, 40, 40, 255, 0, 0, 0, 255, 0, 0, 0, 0, 60, 180, 90, 255,
  ]);

  it("leaves an unchanged tone byte-identical and never edits its input", () => {
    expect([...tonePixelsV7(pixels, 2, 2, UNCHANGED_TONE_V7)]).toEqual([
      ...pixels,
    ]);
    tonePixelsV7(pixels, 2, 2, { ...UNCHANGED_TONE_V7, saturation: 0 });
    expect(pixels[0]).toBe(200);
  });

  it("desaturates toward luma, keeps alpha and skips transparent pixels", () => {
    const grey = tonePixelsV7(pixels, 2, 2, {
      ...UNCHANGED_TONE_V7,
      saturation: 0,
    });
    // 0.299 * 200 + 0.587 * 40 + 0.114 * 40 = 87.84
    expect([...grey.slice(0, 4)]).toEqual([88, 88, 88, 255]);
    expect([...grey.slice(8, 12)]).toEqual([0, 0, 0, 0]);
  });

  it("pulls contrast toward the mean colour, or toward a given pivot", () => {
    const mean = meanColourV7(pixels);
    expect(mean.map(Math.round)).toEqual([87, 73, 43]);
    const flat = tonePixelsV7(pixels, 2, 2, {
      ...UNCHANGED_TONE_V7,
      contrast: 0,
    });
    expect([...flat.slice(0, 3)]).toEqual(mean.map(Math.round));
    const pivoted = tonePixelsV7(
      pixels,
      2,
      2,
      { ...UNCHANGED_TONE_V7, contrast: 0 },
      1,
      [10, 20, 30],
    );
    expect([...pivoted.slice(0, 3)]).toEqual([10, 20, 30]);
    expect(meanColourV7(new Uint8ClampedArray(4))).toEqual([128, 128, 128]);
  });

  it("recolours only the dark outline toward the fill beside it", () => {
    const soft = tonePixelsV7(pixels, 2, 2, {
      ...UNCHANGED_TONE_V7,
      outline: 100,
    });
    // The black pixel becomes half the mean of its two opaque neighbours.
    expect([...soft.slice(4, 8)]).toEqual([65, 55, 33, 255]);
    expect([...soft.slice(0, 4)]).toEqual([...pixels.slice(0, 4)]);
  });

  it("lightens toward white, and shrinks toward the bottom centre", () => {
    const light = tonePixelsV7(pixels, 2, 2, {
      ...UNCHANGED_TONE_V7,
      lightness: 50,
    });
    expect([...light.slice(0, 3)]).toEqual([228, 148, 148]);
    const opaque = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const small = tonePixelsV7(opaque, 4, 4, {
      ...UNCHANGED_TONE_V7,
      scale: 50,
    });
    const alphaAt = (x: number, y: number) => small[(y * 4 + x) * 4 + 3];
    expect([alphaAt(0, 0), alphaAt(1, 0), alphaAt(0, 3)]).toEqual([0, 0, 0]);
    expect([alphaAt(1, 3), alphaAt(2, 3), alphaAt(1, 2)]).toEqual([
      255, 255, 255,
    ]);
  });

  it("adds a halo only on transparent pixels beside the silhouette", () => {
    const halo = haloPixelsV7(pixels, 2, 2);
    expect([...halo.slice(8, 12)]).toEqual([255, 246, 222, 235]);
    expect([...halo.slice(0, 4)]).toEqual([...pixels.slice(0, 4)]);
  });

  it("groups subjects and gives land terrain its ground's pivot", () => {
    expect(directionSubjectGroupV7("UNIT:FIGHTER")).toBe("UNIT");
    expect(directionSubjectGroupV7("UNIT:GOBLIN:FIGHTER")).toBe("UNIT");
    expect(directionSubjectGroupV7("IMPROVEMENT:FARM")).toBe("BUILDING");
    expect(directionSubjectGroupV7("CITY:2")).toBe("CITY");
    expect(directionSubjectGroupV7("SITE:VILLAGE")).toBe("CITY");
    expect(directionSubjectGroupV7("TERRAIN:FOREST")).toBe("TERRAIN");
    expect(directionSubjectGroupV7("RESOURCE:FRUIT")).toBe("TERRAIN");
    expect(directionSubjectGroupV7("GRAVE")).toBeNull();
    expect(terrainPivotV7("TERRAIN:FOREST")).toEqual(
      terrainPivotV7("TERRAIN:GRASS"),
    );
    expect(terrainPivotV7("TERRAIN:MINED_MOUNTAIN")).toEqual(
      terrainPivotV7("TERRAIN:MOUNTAIN"),
    );
    expect(terrainPivotV7("TERRAIN:SHALLOW_WATER")).toBeUndefined();
  });
});

describe("directed chibi art (pulp_wars-3tq.1)", () => {
  it("passes every resolution through untouched for the baseline direction", () => {
    const base = chibiArt();
    const readPixels = vi.fn(environment.readPixels);
    const art = createDirectedChibiArtV7({
      base,
      direction: BASELINE_DIRECTION_V7,
      environment: { ...environment, readPixels },
    });
    for (const subject of [
      "UNIT:FIGHTER",
      "IMPROVEMENT:WINDMILL",
      "CITY:1",
      "TERRAIN:GRASS",
      "GRAVE",
    ] as const) {
      const request = {
        subject,
        at: { x: 0, y: 0 },
        ownerColor: CORAL,
        deviceScale: 1,
      };
      expect(art.resolve(request)).toEqual(base.resolve(request));
    }
    expect(readPixels).not.toHaveBeenCalled();
  });

  it("recolours Human owner areas to the faction colour, keeps an accent, and tones buildings once", () => {
    const base = chibiArt();
    const createSurface = vi.fn(environment.createSurface);
    const art = createDirectedChibiArtV7({
      base,
      direction: { ...RECOMMENDED_DIRECTION_V7 },
      environment: { ...environment, createSurface },
    });
    const at = { x: 0, y: 0 };
    const mill = art.resolve({
      subject: "IMPROVEMENT:WINDMILL",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    // The base was asked for the faction roof colour, not the player's.
    expect(base.requests.at(-1)?.ownerColor).toBe(
      RECOMMENDED_DIRECTION_V7.building.owner,
    );
    expect(mill.kind).toBe("READY");
    if (mill.kind !== "READY") return;
    expect(mill.image).not.toBe(raster(`IMPROVEMENT:WINDMILL#${CORAL}`));
    expect(mill.cacheKey).toContain("|tone:");
    const surfaces = createSurface.mock.calls.length;
    art.resolve({
      subject: "IMPROVEMENT:WINDMILL",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    // A second frame does no pixel work.
    expect(createSurface).toHaveBeenCalledTimes(surfaces);
    const fighter = art.resolve({
      subject: "UNIT:FIGHTER",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(fighter.kind === "READY" && fighter.cacheKey).toContain(
      `|accent:${CORAL}`,
    );
    // Another faction's unit keeps its player-coloured sprite.
    const goblin = art.resolve({
      subject: "UNIT:GOBLIN:FIGHTER",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(base.requests.at(-1)?.ownerColor).toBe(CORAL);
    expect(goblin.kind === "READY" && goblin.image).toBe(
      raster(`UNIT:GOBLIN:FIGHTER#${CORAL}`),
    );
  });

  it("draws the exploration sample for a unit that has one", () => {
    const base = chibiArt();
    const sampleImage = raster("sample");
    const samples: ChibiBoardArtV7 = {
      resolve: (request) =>
        request.subject === "UNIT:FIGHTER"
          ? {
              kind: "READY",
              asset: { id: "sample" } as ChibiArtAssetV7,
              image: sampleImage,
              density: 1,
              smoothing: false,
              cacheKey: "sample",
            }
          : { kind: "MISSING" },
    };
    const art = createDirectedChibiArtV7({
      base,
      direction: RECOMMENDED_DIRECTION_V7,
      environment,
      samples,
    });
    const request = { at: { x: 0, y: 0 }, ownerColor: CORAL, deviceScale: 1 };
    const fighter = art.resolve({ ...request, subject: "UNIT:FIGHTER" });
    expect(fighter.kind === "READY" && fighter.image).toBe(sampleImage);
    const guard = art.resolve({ ...request, subject: "UNIT:GUARD" });
    expect(guard.kind === "READY" && guard.image).not.toBe(sampleImage);
  });
});

describe("board drawing with a visual direction (pulp_wars-3tq.1)", () => {
  it("draws exactly the stock frame for the baseline direction", () => {
    expect(draw(BASELINE_DIRECTION_V7)).toEqual(draw());
  });

  it("the recommended direction adds bases, moves the ready cue to them and drops the badge and the full HP bar", () => {
    const stock = draw();
    const directed = draw(RECOMMENDED_DIRECTION_V7);
    const fills = (log: readonly LogEntry[]) =>
      log
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2]);
    const count = (log: readonly LogEntry[], name: string) =>
      log.filter((call) => call[0] === name).length;
    // One base per unit, in the owner's colour, and the ready rim.
    expect(count(stock, "ellipse")).toBe(0);
    expect(
      count(directed, "ellipse") + count(directed, "closePath"),
    ).toBeGreaterThan(0);
    expect(fills(directed)).toContain("#fff6cf");
    expect(fills(directed)).toContain("#28b7a4");
    // The stock seat number is drawn for the city and both units; the
    // direction draws none.
    const seatNumbers = (log: readonly LogEntry[]) =>
      log.filter((call) => call[0] === "fillText").length;
    expect(seatNumbers(stock)).toBe(3);
    expect(seatNumbers(directed)).toBe(0);
    // Only the damaged unit keeps an HP bar: the stock full-health green
    // (#65d889) is gone and the low-health bar is drawn once.
    expect(fills(stock).filter((fill) => fill === "#65d889")).toHaveLength(2);
    expect(fills(directed)).not.toContain("#65d889");
    expect(fills(directed).filter((fill) => fill === "#f1c94b")).toHaveLength(
      1,
    );
    // The stock dashed territory border becomes a solid line.
    const dashes = (log: readonly LogEntry[]) =>
      log.filter(
        (call) => call[0] === "setLineDash" && (call[1] as number[]).length > 0,
      ).length;
    expect(dashes(stock)).toBeGreaterThan(0);
    expect(dashes(directed)).toBe(0);
  });
});
