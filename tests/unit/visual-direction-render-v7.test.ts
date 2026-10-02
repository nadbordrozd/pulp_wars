import { describe, expect, it, vi } from "vitest";
import {
  BOARD_CLASSIC_LOOK_STORAGE_KEY_V7,
  RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7,
  loadBoardClassicLookV7,
  parseStoredBoardClassicLookV7,
  storeBoardClassicLookV7,
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
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../../src/render/canvas/live-board-look-v7";
import type { SpriteSaturationCacheV7 } from "../../src/render/canvas/sprite-saturation-v7";
import {
  HUMAN_DEMO_SAMPLE_ASSETS_V7,
  VISUAL_DIRECTION_SAMPLE_SETS_V7,
  visualDirectionSampleRegistryV7,
} from "../../src/render/canvas/visual-direction-samples-v7";
import {
  BASELINE_DIRECTION_V7,
  DIRECTION_FLAG_ANCHORS_V7,
  DIRECTED_BASE_HP_BAR_TOP_V7,
  HUMAN_DEMO_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  RECOMMENDED_DIRECTION_V7,
  darkerColourV7,
  directionUnitAfloatV7,
  drawDirectedFlagV7,
  drawDirectedPieceChromeV7,
  drawDirectedUnitBaseV7,
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

describe("classic look setting (pulp_wars-3tq.6)", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      values,
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
      },
    };
  };

  it("is off, so the new look is drawn, unless the stored value says classic: true", () => {
    expect(parseStoredBoardClassicLookV7(null)).toBe(false);
    for (const malformed of ["", "{", "null", "true", "1", "[]", "{}"])
      expect(parseStoredBoardClassicLookV7(malformed)).toBe(false);
    expect(parseStoredBoardClassicLookV7('{"classic":"yes"}')).toBe(false);
    expect(parseStoredBoardClassicLookV7('{"classic":false}')).toBe(false);
    expect(parseStoredBoardClassicLookV7('{"classic":true}')).toBe(true);
  });

  it("persists under its own key and survives restricted storage", () => {
    const { values, storage } = memory();
    expect(loadBoardClassicLookV7(storage)).toBe(false);
    expect(storeBoardClassicLookV7(storage, true)).toBe(true);
    expect(values.get(BOARD_CLASSIC_LOOK_STORAGE_KEY_V7)).toBe(
      '{"classic":true}',
    );
    expect(loadBoardClassicLookV7(storage)).toBe(true);
    expect(storeBoardClassicLookV7(storage, false)).toBe(true);
    expect(loadBoardClassicLookV7(storage)).toBe(false);
    expect(loadBoardClassicLookV7(null)).toBe(false);
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadBoardClassicLookV7(denied)).toBe(false);
    expect(storeBoardClassicLookV7(denied, true)).toBe(false);
  });

  it("never lets the retired experiment key force the classic look, and removes it", () => {
    expect(BOARD_CLASSIC_LOOK_STORAGE_KEY_V7).not.toBe(
      RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7,
    );
    for (const stored of [
      '{"recommended":false}',
      '{"recommended":true}',
      "garbage",
    ]) {
      const { values, storage } = memory();
      values.set(RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7, stored);
      expect(loadBoardClassicLookV7(storage), stored).toBe(false);
      expect(values.has(RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7)).toBe(
        false,
      );
    }
    // A classic choice made since is kept when the retired key is dropped.
    const { values, storage } = memory();
    values.set(
      RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7,
      '{"recommended":true}',
    );
    values.set(BOARD_CLASSIC_LOOK_STORAGE_KEY_V7, '{"classic":true}');
    expect(loadBoardClassicLookV7(storage)).toBe(true);
    expect([...values.keys()]).toEqual([BOARD_CLASSIC_LOOK_STORAGE_KEY_V7]);
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

describe("Human demo of the visual direction (pulp_wars-3tq.3)", () => {
  const at = { x: 0, y: 0 };
  const sampleArt = (
    subjects: readonly ArtSubjectV7[],
  ): ChibiBoardArtV7 & { readonly requests: ChibiArtRequestV7[] } => {
    const requests: ChibiArtRequestV7[] = [];
    return {
      requests,
      resolve: (request) => {
        requests.push(request);
        return subjects.includes(request.subject)
          ? {
              kind: "READY",
              asset: { id: `sample-${request.subject}` } as ChibiArtAssetV7,
              image: raster(`sample:${request.subject}`),
              density: 1,
              smoothing: false,
              cacheKey: `sample:${request.subject}`,
            }
          : { kind: "MISSING" };
      },
    };
  };

  it("draws a re-created building or city sample as authored, without tone or pixel work", () => {
    const base = chibiArt();
    const readPixels = vi.fn(environment.readPixels);
    const art = createDirectedChibiArtV7({
      base,
      direction: HUMAN_DEMO_DIRECTION_V7,
      environment: { ...environment, readPixels },
      samples: sampleArt(["IMPROVEMENT:WINDMILL", "CITY:1", "UNIT:FIGHTER"]),
    });
    for (const subject of [
      "IMPROVEMENT:WINDMILL",
      "CITY:1",
      "UNIT:FIGHTER",
    ] as const) {
      const resolved = art.resolve({
        subject,
        at,
        ownerColor: CORAL,
        deviceScale: 1,
      });
      expect(resolved.kind === "READY" && resolved.image).toBe(
        raster(`sample:${subject}`),
      );
      expect(resolved.kind === "READY" && resolved.cacheKey).toBe(
        `sample:${subject}`,
      );
    }
    expect(readPixels).not.toHaveBeenCalled();
    // A building without a sample still recedes by tone, in the faction
    // colour; the study's direction never asks for building samples.
    const forge = art.resolve({
      subject: "IMPROVEMENT:FORGE",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(forge.kind === "READY" && forge.cacheKey).toContain("|tone:");
    const study = createDirectedChibiArtV7({
      base,
      direction: RECOMMENDED_DIRECTION_V7,
      environment,
      samples: sampleArt(["IMPROVEMENT:WINDMILL"]),
    });
    const mill = study.resolve({
      subject: "IMPROVEMENT:WINDMILL",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(mill.kind === "READY" && mill.image).not.toBe(
      raster("sample:IMPROVEMENT:WINDMILL"),
    );
  });

  it("gives a Human unit without a sample the faction crimson, and leaves a ship's sail to the player", () => {
    const base = chibiArt();
    const art = createDirectedChibiArtV7({
      base,
      direction: HUMAN_DEMO_DIRECTION_V7,
      environment,
    });
    art.resolve({
      subject: "UNIT:GUARD",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(base.requests.at(-1)?.ownerColor).toBe(
      HUMAN_DEMO_DIRECTION_V7.unit.owner,
    );
    for (const subject of [
      "UNIT:PATROL_BOAT",
      "UNIT:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT",
      "UNIT:UNDEAD:FIGHTER",
    ] as const) {
      art.resolve({ subject, at, ownerColor: CORAL, deviceScale: 1 });
      expect(base.requests.at(-1)?.ownerColor, subject).toBe(CORAL);
    }
    expect(directionUnitAfloatV7("UNIT:PATROL_BOAT")).toBe(true);
    expect(directionUnitAfloatV7("UNIT:FIGHTER")).toBe(false);
    expect(directionUnitAfloatV7(undefined)).toBe(false);
  });

  it("registers every demo sample, with a sample for each improvement and city tier", () => {
    for (const set of [
      "STUDY",
      "DEMO",
      "STYLE_A",
      "STYLE_B",
      "PRODUCTION",
    ] as const) {
      expect(VISUAL_DIRECTION_SAMPLE_SETS_V7[set].length).toBeGreaterThan(0);
      expect(() => visualDirectionSampleRegistryV7(set)).not.toThrow();
    }
    const registry = visualDirectionSampleRegistryV7();
    for (const subject of [
      "UNIT:FIGHTER",
      "UNIT:MARKSMAN",
      "UNIT:KNIGHT",
      "IMPROVEMENT:FARM",
      "IMPROVEMENT:LUMBER_CAMP",
      "IMPROVEMENT:WINDMILL",
      "IMPROVEMENT:SAWMILL",
      "IMPROVEMENT:FORGE",
      "IMPROVEMENT:WORKSHOP",
      "IMPROVEMENT:MARKET",
      "IMPROVEMENT:MONUMENT",
      "IMPROVEMENT:PORT",
      "IMPROVEMENT:SHIPYARD",
      "CITY:1",
      "CITY:2",
      "CITY:3",
    ] as const)
      expect(registry.variants(subject), subject).toHaveLength(1);
    // The Farm fills its square cell exactly; no improvement overflows
    // upward and a city by 8 px at most (today's reach 24), so a unit
    // north of a city keeps its base.
    const farm = registry.variants("IMPROVEMENT:FARM")[0];
    expect([farm?.width, farm?.height]).toEqual([80, 80]);
    for (const asset of HUMAN_DEMO_SAMPLE_ASSETS_V7)
      if (!asset.subject.startsWith("UNIT:"))
        expect(asset.height, asset.id).toBeLessThanOrEqual(
          asset.subject.startsWith("CITY:") ? 88 : 80,
        );
    // Every pennant anchor belongs to a demo sample or to its production
    // successor (bead pulp_wars-3tq.5) and lies inside it.
    const anchors = Object.entries(DIRECTION_FLAG_ANCHORS_V7);
    expect(anchors.length).toBeGreaterThan(0);
    for (const [id, anchor] of anchors) {
      const asset = [
        ...HUMAN_DEMO_SAMPLE_ASSETS_V7,
        ...VISUAL_DIRECTION_SAMPLE_SETS_V7.PRODUCTION,
      ].find((candidate) => candidate.id === id);
      expect(asset, id).toBeDefined();
      if (asset === undefined) continue;
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.x).toBeLessThan(asset.width);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.y + anchor.pole).toBeLessThan(asset.height);
    }
    // No pennant on a field of wheat, a windmill or a forge.
    for (const id of [
      "chibi-demo-farm",
      "chibi-demo-windmill",
      "chibi-demo-forge",
    ])
      expect(DIRECTION_FLAG_ANCHORS_V7[id], id).toBeUndefined();
    for (const id of [
      "chibi-demo-city-1",
      "chibi-demo-city-2",
      "chibi-demo-city-3",
    ])
      expect(DIRECTION_FLAG_ANCHORS_V7[id], id).toBeDefined();
  });

  it("draws a pennant in the player colour only on an anchored, owned piece", () => {
    const rect = { x: 100, y: 100, width: 80, height: 80 };
    const pennant = (
      direction: BoardVisualDirectionV7,
      piece: BoardRenderPlanEntryV7,
      id: string,
    ) => {
      const { context, log } = recordingContext();
      const drawn = drawDirectedFlagV7(context, direction, piece, id, rect, 1);
      return { drawn, log };
    };
    const city = entry("CITY", 0, 0, "building-city-1", "CITY:1", {
      ownerColor: CORAL,
      ownerSeat: 0,
      capital: true,
    });
    const flown = pennant(HUMAN_DEMO_DIRECTION_V7, city, "chibi-demo-city-1");
    expect(flown.drawn).toBe(true);
    const fills = flown.log
      .filter((call) => call[0] === "set" && call[1] === "fillStyle")
      .map((call) => call[2]);
    expect(fills).toContain(CORAL);
    // The capital's seat shape is gold.
    expect(fills).toContain("#f4c542");
    // Nothing at all is drawn without an anchor, an owner or the setting.
    for (const [direction, piece, id] of [
      [HUMAN_DEMO_DIRECTION_V7, city, "chibi-city-1"],
      [
        HUMAN_DEMO_DIRECTION_V7,
        entry("CITY", 0, 0, "building-city-1", "CITY:1", { ownerSeat: 0 }),
        "chibi-demo-city-1",
      ],
      [BASELINE_DIRECTION_V7, city, "chibi-demo-city-1"],
      [
        HUMAN_DEMO_DIRECTION_V7,
        entry("IMPROVEMENT", 0, 0, "building-farm", "IMPROVEMENT:FARM", {
          ownerColor: CORAL,
        }),
        "chibi-demo-farm",
      ],
      [
        HUMAN_DEMO_DIRECTION_V7,
        entry("UNIT", 0, 0, "unit-fighter", "UNIT:FIGHTER", {
          ownerColor: CORAL,
        }),
        "chibi-demo-city-1",
      ],
    ] as const) {
      const none = pennant(direction, piece, id);
      expect(none.drawn).toBe(false);
      expect(none.log).toEqual([]);
    }
  });

  it("draws a plate with a rim in a darker player tone, and a round unfilled ring under a ship", () => {
    const sprite = { x: 0, y: 0, width: 56, height: 80 };
    const base = (piece: BoardRenderPlanEntryV7) => {
      const { context, log } = recordingContext();
      drawDirectedUnitBaseV7(
        context,
        HUMAN_DEMO_DIRECTION_V7,
        piece,
        sprite,
        1,
      );
      return log;
    };
    const fills = (log: readonly LogEntry[]) =>
      log
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2]);
    const count = (log: readonly LogEntry[], name: string) =>
      log.filter((call) => call[0] === name).length;
    expect(darkerColourV7("#ffffff")).toBe("#737373");
    const teal = "#28b7a4";
    const fighter = base(
      entry("UNIT", 0, 0, "unit-fighter", "UNIT:FIGHTER", {
        ownerColor: teal,
        ownerSeat: 1,
      }),
    );
    // Seat 2's plate is pointed: a path, no ellipse; no near-black outline.
    expect(count(fighter, "ellipse")).toBe(0);
    expect(count(fighter, "fill")).toBe(2);
    expect(fills(fighter)).toEqual([darkerColourV7(teal), teal]);
    const ready = base(
      entry("UNIT", 0, 0, "unit-fighter", "UNIT:FIGHTER", {
        ownerColor: teal,
        ownerSeat: 0,
        ready: true,
      }),
    );
    expect(fills(ready)).toContain("#fff6cf");
    const ship = base(
      entry("UNIT", 0, 0, "unit-patrol-boat", "UNIT:PATROL_BOAT", {
        ownerColor: teal,
        ownerSeat: 1,
      }),
    );
    // Whatever the seat, the ship's ring is an ellipse and nothing is filled.
    expect(count(ship, "ellipse")).toBe(1);
    expect(count(ship, "fill")).toBe(0);
    expect(count(ship, "stroke")).toBe(2);
  });

  it("the demo direction draws the board with plates, pennants and no stock chrome", () => {
    const directed = draw(HUMAN_DEMO_DIRECTION_V7);
    const fills = directed
      .filter((call) => call[0] === "set" && call[1] === "fillStyle")
      .map((call) => call[2]);
    expect(fills).toContain(darkerColourV7(CORAL));
    expect(directed.filter((call) => call[0] === "fillText")).toHaveLength(0);
    expect(fills).not.toContain("#65d889");
  });
});

describe("live default look (pulp_wars-3tq.6)", () => {
  const at = { x: 0, y: 0 };
  const fills = (log: readonly LogEntry[]) =>
    log
      .filter((call) => call[0] === "set" && call[1] === "fillStyle")
      .map((call) => call[2]);
  /** The direction's own art for the given subjects; MISSING otherwise. */
  const directionArt = (
    subjects: readonly ArtSubjectV7[],
    state: "READY" | "LOADING" = "READY",
  ): ChibiBoardArtV7 => ({
    resolve: (request) =>
      !subjects.includes(request.subject)
        ? { kind: "MISSING" }
        : state === "LOADING"
          ? { kind: "LOADING" }
          : {
              kind: "READY",
              asset: {
                id: `chibi-direction-${request.subject}`,
                subject: request.subject,
                assetClass: request.subject.startsWith("UNIT:")
                  ? "STANDARD_UNIT"
                  : "SETTLEMENT",
                width: 80,
                height: 80,
                url: `/direction/${request.subject}.png`,
              } as ChibiArtAssetV7,
              image: raster(`direction:${request.subject}`),
              density: 1,
              smoothing: false,
              cacheKey: `direction:${request.subject}`,
            },
  });
  const drawLive = (
    entries: readonly BoardRenderPlanEntryV7[],
    options: {
      readonly samples?: ChibiBoardArtV7;
      readonly saturation?: SpriteSaturationCacheV7;
      readonly classic?: boolean;
    } = {},
  ): { readonly log: LogEntry[]; readonly images: unknown[] } => {
    const { context, log } = recordingContext();
    const base = chibiArt();
    drawBoardV7({
      context,
      viewport: { width: 800, height: 600 },
      devicePixelRatio: 1,
      camera: { zoom: 1, offsetX: 200, offsetY: 200 },
      plan: { version: 7, entries, targets: [] },
      images: { resolve: () => null },
      artSet: "CHIBI",
      chibiArt: base,
      reducedMotion: true,
      ...(options.saturation === undefined
        ? {}
        : {
            saturation: {
              levels: { building: 40, city: 60 },
              cache: options.saturation,
            },
          }),
      ...(options.classic === true
        ? {}
        : {
            direction: {
              spec: LIVE_DIRECTION_V7,
              art: createDirectedChibiArtV7({
                base,
                direction: LIVE_DIRECTION_V7,
                environment,
                ...(options.samples === undefined
                  ? {}
                  : { samples: options.samples }),
              }),
            },
          }),
    });
    return {
      log,
      images: log
        .filter((call) => call[0] === "drawImage")
        .map((call) => call[1]),
    };
  };

  it("is what the game passes for the CHIBI set, and nothing for LEGACY or the classic look", () => {
    expect(liveBoardLookV7("CHIBI")).toEqual({
      visualDirection: LIVE_DIRECTION_V7,
      visualDirectionArt: LIVE_DIRECTION_ART_REGISTRY_V7,
    });
    expect(liveBoardLookV7("CHIBI", true)).toEqual({});
    expect(liveBoardLookV7("LEGACY")).toEqual({});
    expect(liveBoardLookV7(undefined)).toEqual({});
    expect(LIVE_DIRECTION_V7).toMatchObject({
      unit: { base: "PLATE", baseShape: "SEAT", samples: true },
      building: { samples: true, flags: true },
      city: { samples: true, banner: true, factionCities: "CLASSIC" },
      chrome: {
        hp: "DAMAGED",
        hpPlacement: "BASE",
        badge: "NONE",
        ready: "BASE",
        roads: "CALM",
        borders: "SOLID",
      },
    });
    // The art is registered up front, with the rest of the CHIBI set.
    expect(LIVE_DIRECTION_ART_REGISTRY_V7.variants("CITY:2")[0]?.id).toBe(
      "chibi-direction-city-2",
    );
  });

  it("the classic look draws exactly the pre-direction frame", () => {
    // The classic look passes no direction; a direction that changes
    // nothing issues the same canvas calls, so no hook leaks into it.
    const classic = drawLive(ENTRIES, { classic: true }).log;
    expect(classic).toEqual(draw());
    expect(classic).toEqual(draw(BASELINE_DIRECTION_V7));
    // And the live default is a different frame.
    expect(drawLive(ENTRIES).log).not.toEqual(classic);
  });

  it("draws the direction's art for a Human piece, nothing while it loads, and the classic asset when it fails", () => {
    const fighter = entry("UNIT", 1, 2, "unit-fighter", "UNIT:FIGHTER", {
      key: "unit:7",
      ownerColor: CORAL,
      ownerSeat: 0,
      hp: 10,
      maxHp: 10,
    });
    const ready = drawLive([fighter], {
      samples: directionArt(["UNIT:FIGHTER"]),
    });
    expect(ready.images).toEqual([raster("direction:UNIT:FIGHTER")]);
    // Still loading: no sprite at all, never a flash of the previous art.
    const loading = drawLive([fighter], {
      samples: directionArt(["UNIT:FIGHTER"], "LOADING"),
    });
    expect(loading.images).toEqual([]);
    // The raster failed (MISSING): the classic asset of that piece, in the
    // faction's fixed colour, so the board is never left without it.
    const failed = drawLive([fighter], { samples: directionArt([]) });
    expect(failed.images).toEqual([
      raster(`UNIT:FIGHTER#${LIVE_DIRECTION_V7.unit.owner}`),
    ]);
  });

  it("leaves the other factions unconverted: player-coloured units on plates, classic cities with the crown and no pennant", () => {
    const base = chibiArt();
    const readPixels = vi.fn(environment.readPixels);
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment: { ...environment, readPixels },
      samples: directionArt(["UNIT:FIGHTER", "CITY:1", "CITY:2", "CITY:3"]),
    });
    for (const subject of [
      "UNIT:UNDEAD:FIGHTER",
      "UNIT:GOBLIN:KNIGHT",
      "UNIT:DINOSAUR:EGG",
      "CITY:UNDEAD:1",
      "CITY:GOBLIN:2",
      "CITY:DINOSAUR:3",
    ] as const) {
      const resolved = art.resolve({
        subject,
        at,
        ownerColor: CORAL,
        deviceScale: 1,
      });
      // The classic raster in the player's colour: no Human roof tint, no
      // crimson garment, no tone.
      expect(base.requests.at(-1)?.ownerColor, subject).toBe(CORAL);
      expect(resolved.kind === "READY" && resolved.image, subject).toBe(
        raster(`${subject}#${CORAL}`),
      );
      expect(resolved.kind === "READY" && resolved.cacheKey, subject).toBe(
        `chibi:fixture-${subject}#${CORAL}`,
      );
    }
    expect(readPixels).not.toHaveBeenCalled();
    // The study's direction still tones and recolours nothing of theirs
    // but does tone their cities; the live default does not.
    const study = createDirectedChibiArtV7({
      base,
      direction: HUMAN_DEMO_DIRECTION_V7,
      environment,
    }).resolve({
      subject: "CITY:UNDEAD:1",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(study.kind === "READY" && study.cacheKey).toContain("|tone:");

    const chrome = (
      piece: BoardRenderPlanEntryV7,
      flagDrawn: boolean,
      direction = LIVE_DIRECTION_V7,
    ) => {
      const { context, log } = recordingContext();
      const handled = drawDirectedPieceChromeV7(
        context,
        direction,
        piece,
        0,
        0,
        1,
        false,
        flagDrawn,
      );
      return { handled, log };
    };
    const undeadCapital = entry(
      "CITY",
      0,
      0,
      "building-city-1",
      "CITY:UNDEAD:1",
      {
        ownerColor: CORAL,
        ownerSeat: 1,
        capital: true,
      },
    );
    const faction = chrome(undeadCapital, false);
    // No seat badge, the stock capital crown, and no pennant drawn.
    expect(faction.handled).toEqual({ badge: true, hp: false, crown: false });
    expect(faction.log.filter((call) => call[0] === "fill")).toEqual([]);
    expect(faction.log.filter((call) => call[0] === "stroke")).toEqual([]);
    // The study's direction gives the same city a corner pennant.
    const studied = chrome(undeadCapital, false, HUMAN_DEMO_DIRECTION_V7);
    expect(studied.handled.crown).toBe(true);
    expect(fills(studied.log)).toContain(CORAL);
    // A Human city: its pennant is on the art (flagDrawn) and carries the
    // capital's gold shape, so the crown and the badge are both replaced.
    const humanCapital = entry("CITY", 0, 0, "building-city-1", "CITY:1", {
      ownerColor: CORAL,
      ownerSeat: 0,
      capital: true,
    });
    expect(chrome(humanCapital, true).handled).toEqual({
      badge: true,
      hp: false,
      crown: true,
    });
    // A Human city whose direction raster failed has no anchor: it keeps a
    // player marker, the corner pennant.
    const fallback = chrome(humanCapital, false);
    expect(fallback.handled.crown).toBe(true);
    expect(fills(fallback.log)).toContain(CORAL);
  });

  it("draws other factions' units and the Egg on the board with a plate, without a seat number", () => {
    const pieces = [
      entry("UNIT", 0, 0, "unit-fighter", "UNIT:UNDEAD:FIGHTER", {
        key: "unit:1",
        ownerColor: CORAL,
        ownerSeat: 2,
        faction: "UNDEAD",
        hp: 10,
        maxHp: 10,
      }),
      entry("UNIT", 1, 0, "unit-fighter", "UNIT:DINOSAUR:EGG", {
        key: "unit:2",
        ownerColor: "#28b7a4",
        ownerSeat: 1,
        faction: "DINOSAUR",
        hp: 6,
        maxHp: 6,
        egg: { turnsRemaining: 2 },
      }),
    ] as readonly BoardRenderPlanEntryV7[];
    const live = drawLive(pieces);
    expect(live.images).toEqual([
      raster(`UNIT:UNDEAD:FIGHTER#${CORAL}`),
      raster("UNIT:DINOSAUR:EGG##28b7a4"),
    ]);
    expect(fills(live.log)).toContain(darkerColourV7(CORAL));
    expect(fills(live.log)).toContain(darkerColourV7("#28b7a4"));
    // The only text left is the Egg's countdown.
    expect(
      live.log.filter((call) => call[0] === "fillText").map((call) => call[1]),
    ).toEqual(["2"]);
    // Full health: no HP bar for either.
    expect(fills(live.log)).not.toContain("#65d889");
    expect(fills(live.log)).not.toContain("#101718");
  });

  it("keeps the damaged HP bar on the base, clear of the cell's bottom edge", () => {
    const { context, log } = recordingContext();
    const handled = drawDirectedPieceChromeV7(
      context,
      LIVE_DIRECTION_V7,
      entry("UNIT", 0, 0, "unit-fighter", "UNIT:FIGHTER", {
        ownerColor: CORAL,
        ownerSeat: 0,
        hp: 2,
        maxHp: 10,
      }),
      0,
      0,
      1,
    );
    expect(handled.hp).toBe(true);
    const rects = log.filter((call) => call[0] === "fillRect");
    // The dark track, then the red fill of a unit below one third.
    expect(rects[0]).toEqual([
      "fillRect",
      -27,
      DIRECTED_BASE_HP_BAR_TOP_V7,
      54,
      8,
    ]);
    expect(fills(log)).toEqual(["#101718", "#f0625a"]);
    // The cell's edge is 64 world units below its centre; the territory
    // border's casing and the selection outline reach about 4 units in.
    expect(DIRECTED_BASE_HP_BAR_TOP_V7 + 8).toBeLessThanOrEqual(60);
    // A full-health unit draws no bar at all.
    const full = recordingContext();
    drawDirectedPieceChromeV7(
      full.context,
      LIVE_DIRECTION_V7,
      entry("UNIT", 0, 0, "unit-fighter", "UNIT:FIGHTER", {
        ownerColor: CORAL,
        ownerSeat: 0,
        hp: 10,
        maxHp: 10,
      }),
      0,
      0,
      1,
    );
    expect(full.log.filter((call) => call[0] === "fillRect")).toEqual([]);
  });

  it("keeps the saturation sliders working on the new buildings and cities", () => {
    const resolved: [unknown, number][] = [];
    const faded = raster("faded");
    const cache: SpriteSaturationCacheV7 = {
      resolve: (image, percent) => {
        resolved.push([image, percent]);
        return faded;
      },
    };
    const pieces = ENTRIES.filter(
      (item) => item.kind === "IMPROVEMENT" || item.kind === "CITY",
    );
    const live = drawLive(pieces, {
      samples: directionArt(["IMPROVEMENT:WINDMILL", "CITY:1"]),
      saturation: cache,
    });
    // The direction's own rasters go through the saturation cache at the
    // slider levels, and the faded copies are what is drawn.
    expect(resolved).toEqual([
      [raster("direction:IMPROVEMENT:WINDMILL"), 40],
      [raster("direction:CITY:1"), 60],
    ]);
    expect(live.images).toEqual([faded, faded]);
  });
});
