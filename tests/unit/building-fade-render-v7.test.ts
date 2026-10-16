import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { viewForV7 } from "../../src/engine/index";
import {
  BUILDING_FADE_GROUNDS_V7,
  BUILDING_FADE_STRENGTHS_V7,
  BUILDING_FADE_V7,
  buildingFadeFromSearchV7,
  buildingFadeGroundV7,
  buildingFadeKeyV7,
  fadeBuildingPixelsV7,
  type BuildingFadeToneV7,
  type BuildingFadeV7,
} from "../../src/render/canvas/building-fade-v7";
import {
  boardBuildingFadeAppliesV7,
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  createSpriteSaturationCacheV7,
  desaturatePixelsV7,
  type SpriteSaturationCacheV7,
} from "../../src/render/canvas/sprite-saturation-v7";
import { cultFieldV7 } from "../fixtures/v7-cult";
import { patchTileV7 } from "../fixtures/v7-revision20";

const MEDIUM = BUILDING_FADE_STRENGTHS_V7.medium;
const toneOf = (
  strength: BuildingFadeV7,
  ground: keyof typeof BUILDING_FADE_GROUNDS_V7,
): BuildingFadeToneV7 => ({
  strength,
  ground: BUILDING_FADE_GROUNDS_V7[ground],
});

describe("the building fade parameter (pulp_wars-2yc.61)", () => {
  it("is the medium strength, set in one place, between light and strong", () => {
    expect(BUILDING_FADE_V7).toBe(BUILDING_FADE_STRENGTHS_V7.medium);
    expect(MEDIUM).toEqual({ saturation: 0.85, contrast: 0.8 });
    const { light, medium, strong } = BUILDING_FADE_STRENGTHS_V7;
    for (const key of ["saturation", "contrast"] as const) {
      expect(light[key]).toBeGreaterThan(medium[key]);
      expect(medium[key]).toBeGreaterThan(strong[key]);
      expect(strong[key]).toBeGreaterThan(0.5);
      expect(light[key]).toBeLessThan(1);
    }
  });

  it("reads ?building-fade= for off and the named strengths", () => {
    expect(buildingFadeFromSearchV7("")).toBe(BUILDING_FADE_V7);
    expect(buildingFadeFromSearchV7("?art=chibi")).toBe(BUILDING_FADE_V7);
    for (const off of ["0", "off", "FALSE"])
      expect(buildingFadeFromSearchV7(`?building-fade=${off}`)).toBeNull();
    expect(buildingFadeFromSearchV7("?building-fade=strong")).toBe(
      BUILDING_FADE_STRENGTHS_V7.strong,
    );
    expect(buildingFadeFromSearchV7("?building-fade=Light")).toBe(
      BUILDING_FADE_STRENGTHS_V7.light,
    );
    expect(buildingFadeFromSearchV7("?building-fade=bogus")).toBe(
      BUILDING_FADE_V7,
    );
    expect(buildingFadeFromSearchV7("?building-fade=toString")).toBe(
      BUILDING_FADE_V7,
    );
  });

  it("pulls toward the territory's ground, the default Grass otherwise", () => {
    expect(buildingFadeGroundV7("CULT")).toBe(BUILDING_FADE_GROUNDS_V7.CULT);
    expect(buildingFadeGroundV7("CANDY")).toBe(BUILDING_FADE_GROUNDS_V7.CANDY);
    expect(buildingFadeGroundV7(null)).toBe(BUILDING_FADE_GROUNDS_V7.NEUTRAL);
    expect(buildingFadeGroundV7(undefined)).toBe(
      BUILDING_FADE_GROUNDS_V7.NEUTRAL,
    );
  });

  it("keys each strength and ground apart, and no fade as empty", () => {
    expect(buildingFadeKeyV7(null)).toBe("");
    const keys = new Set([
      buildingFadeKeyV7(toneOf(MEDIUM, "NEUTRAL")),
      buildingFadeKeyV7(toneOf(MEDIUM, "CULT")),
      buildingFadeKeyV7(toneOf(BUILDING_FADE_STRENGTHS_V7.strong, "CULT")),
    ]);
    expect(keys.size).toBe(3);
    expect(buildingFadeKeyV7(toneOf(MEDIUM, "CULT"))).toBe(
      buildingFadeKeyV7({
        strength: { saturation: 0.85, contrast: 0.8 },
        ground: { ...BUILDING_FADE_GROUNDS_V7.CULT },
      }),
    );
  });
});

describe("fading building pixels (pulp_wars-2yc.61)", () => {
  it("mixes toward grey then toward the ground, keeps alpha and skips transparent pixels", () => {
    const ground = { r: 100, g: 150, b: 50 };
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, 20, 20, 20, 128, 9, 9, 9, 0,
    ]);
    const faded = fadeBuildingPixelsV7(pixels, {
      strength: { saturation: 0.5, contrast: 0.5 },
      ground,
    });
    // Red: grey 76.245; half way to grey (165.6, 38.1, 38.1); half way to
    // the ground (132.8, 94.1, 44.1).
    expect([...faded.slice(0, 4)]).toEqual([133, 94, 44, 255]);
    // A dark outline pixel is lifted toward the ground; its alpha stays.
    expect([...faded.slice(4, 8)]).toEqual([60, 85, 35, 128]);
    // A transparent pixel is untouched; the input is never modified.
    expect([...faded.slice(8, 12)]).toEqual([9, 9, 9, 0]);
    expect(pixels[0]).toBe(255);
    // Full strength kept is the identity.
    expect([
      ...fadeBuildingPixelsV7(pixels, {
        strength: { saturation: 1, contrast: 1 },
        ground,
      }),
    ]).toEqual([...pixels]);
  });

  it("keeps the order of light and shade (the light from the bottom-left survives)", () => {
    const lit = new Uint8ClampedArray([200, 160, 120, 255]);
    const shaded = new Uint8ClampedArray([110, 80, 60, 255]);
    const tone = toneOf(MEDIUM, "CULT");
    const luma = (p: Uint8ClampedArray) =>
      0.299 * (p[0] ?? 0) + 0.587 * (p[1] ?? 0) + 0.114 * (p[2] ?? 0);
    expect(luma(fadeBuildingPixelsV7(lit, tone))).toBeGreaterThan(
      luma(fadeBuildingPixelsV7(shaded, tone)),
    );
  });
});

describe("the faded copies in the sprite cache (pulp_wars-2yc.61)", () => {
  const environment = () => {
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
    return { readPixels, createSurface };
  };
  const sprite = () =>
    ({ width: 1, height: 1 }) as unknown as CanvasImageSource;

  it("builds one copy per sprite, fade and ground, and draws it again without pixel work", () => {
    const env = environment();
    const cache = createSpriteSaturationCacheV7(env);
    const image = sprite();
    expect(cache.resolve(image, 100, null)).toBe(image);
    expect(env.readPixels).not.toHaveBeenCalled();
    const cult = cache.resolve(image, 100, toneOf(MEDIUM, "CULT"));
    expect(cult).not.toBe(image);
    expect(cache.resolve(image, 100, toneOf(MEDIUM, "CULT"))).toBe(cult);
    expect(env.readPixels).toHaveBeenCalledTimes(1);
    const expected = fadeBuildingPixelsV7(
      new Uint8ClampedArray([200, 100, 0, 255]),
      toneOf(MEDIUM, "CULT"),
    );
    expect((cult as unknown as { pixels: number[] }).pixels).toEqual([
      ...expected,
    ]);
    // A shared building in a second territory in the same frame: both
    // copies stay.
    const grass = cache.resolve(image, 100, toneOf(MEDIUM, "NEUTRAL"));
    expect(grass).not.toBe(cult);
    expect(cache.resolve(image, 100, toneOf(MEDIUM, "CULT"))).toBe(cult);
    expect(cache.resolve(image, 100, toneOf(MEDIUM, "NEUTRAL"))).toBe(grass);
    expect(env.createSurface).toHaveBeenCalledTimes(2);
  });

  it("applies the saturation slider first and replaces the copies on a new level", () => {
    const env = environment();
    const cache = createSpriteSaturationCacheV7(env);
    const image = sprite();
    const tone = toneOf(MEDIUM, "NEUTRAL");
    const at60 = cache.resolve(image, 60, tone) as unknown as {
      pixels: number[];
    };
    // 60 percent: grey 118.5, so (167, 107, 47); then the fade.
    const desaturated = desaturatePixelsV7(
      new Uint8ClampedArray([200, 100, 0, 255]),
      60,
    );
    expect([...desaturated]).toEqual([167, 107, 47, 255]);
    expect(at60.pixels).toEqual([...fadeBuildingPixelsV7(desaturated, tone)]);
    cache.resolve(image, 30, tone);
    cache.resolve(image, 60, tone);
    expect(env.createSurface).toHaveBeenCalledTimes(3);
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
  entry("TERRAIN", 0, 0, "v7-terrain-grass-1", "TERRAIN:GRASS"),
  entry(
    "TERRAIN",
    1,
    0,
    "v7-terrain-mined-mountain-1",
    "TERRAIN:MINED_MOUNTAIN",
  ),
  entry("RESOURCE", 0, 0, "resource-fruit", "RESOURCE:FRUIT", { layer: 3 }),
  entry(
    "IMPROVEMENT",
    0,
    1,
    "building-square-sawmill",
    "IMPROVEMENT:CULT:SAWMILL",
    { factionGrass: "CULT" },
  ),
  entry("IMPROVEMENT", 1, 1, "building-square-market", "IMPROVEMENT:MARKET"),
  entry(
    "IMPROVEMENT",
    2,
    1,
    "building-square-monument",
    "IMPROVEMENT:MONUMENT",
  ),
  entry("SITE", 2, 0, "building-village", "SITE:VILLAGE"),
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

const rasters = new Map<string, CanvasImageSource>();
function raster(name: string): CanvasImageSource {
  const existing = rasters.get(name);
  if (existing !== undefined) return existing;
  const created = { chibi: name } as unknown as CanvasImageSource;
  rasters.set(name, created);
  return created;
}

function chibiArt(): ChibiBoardArtV7 {
  return {
    resolve: (request): ChibiResolutionV7 => {
      const tall = request.subject.startsWith("TERRAIN:M");
      const asset = {
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
        image: raster(request.subject),
        density: 1,
        smoothing: false,
        cacheKey: `chibi:${asset.id}`,
      };
    },
  };
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly drawn: unknown[];
} {
  const drawn: unknown[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                if (key === "drawImage") drawn.push(args[0]);
              },
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  return { context: context as CanvasRenderingContext2D, drawn };
}

/** A cache that tags each copy with its source, level and fade. */
function taggingCache(): SpriteSaturationCacheV7 {
  return {
    resolve: (image, percent, fade = null) =>
      ({ source: image, percent, fade }) as unknown as CanvasImageSource,
  };
}

function draw(buildingFade?: BuildingFadeV7 | null): unknown[] {
  const { context, drawn } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: 1, offsetX: 200, offsetY: 200 },
    plan,
    chibiArt: chibiArt(),
    saturation: { levels: { building: 100, city: 100 }, cache: taggingCache() },
    ...(buildingFade === undefined ? {} : { buildingFade }),
  });
  return drawn;
}

describe("the board draws faded improvements (pulp_wars-2yc.61)", () => {
  it("chooses the fade for improvements, not Monuments, Mines, cities, villages, units or markers", () => {
    const applies = (key: string) => {
      const found = ENTRIES.find((candidate) => candidate.key === key);
      if (found === undefined) throw new Error(`entry ${key} missing`);
      return boardBuildingFadeAppliesV7(found);
    };
    expect(applies("improvement:0,1")).toBe(true);
    expect(applies("improvement:1,1")).toBe(true);
    expect(applies("improvement:2,1")).toBe(false);
    for (const key of [
      "terrain:0,0",
      "terrain:1,0",
      "resource:0,0",
      "site:2,0",
      "city:1",
      "unit:7",
    ])
      expect(applies(key)).toBe(false);
    expect(
      boardBuildingFadeAppliesV7({
        key: "k",
        kind: "FIELD_DEFENSE",
        layer: 8,
        at: { x: 0, y: 0 },
      }),
    ).toBe(false);
  });

  it("without a fade draws every raster itself", () => {
    const drawn = draw();
    expect(drawn.length).toBeGreaterThan(0);
    for (const image of drawn)
      expect((image as { source?: unknown }).source).toBeUndefined();
    expect(draw(null)).toEqual(drawn);
  });

  it("draws each improvement from its faded copy toward its own ground, everything else unchanged", () => {
    const baseline = draw();
    const drawn = draw(MEDIUM);
    expect(drawn).toHaveLength(baseline.length);
    const faded = new Map<string, BuildingFadeToneV7 | null>();
    for (const [index, image] of drawn.entries()) {
      const copy = image as {
        source?: { chibi: string };
        fade?: BuildingFadeToneV7 | null;
        percent?: number;
      };
      if (copy.source === undefined) {
        expect(image).toBe(baseline[index]);
        continue;
      }
      expect(copy.source).toBe(baseline[index]);
      expect(copy.percent).toBe(100);
      faded.set(copy.source.chibi, copy.fade ?? null);
    }
    expect(faded).toEqual(
      new Map([
        ["IMPROVEMENT:CULT:SAWMILL", toneOf(MEDIUM, "CULT")],
        ["IMPROVEMENT:MARKET", toneOf(MEDIUM, "NEUTRAL")],
      ]),
    );
  });
});

describe("the plan names an improvement's ground (pulp_wars-2yc.61)", () => {
  it("gives improvements in a faction-ground territory that ground, and none to Human ones", () => {
    let state = cultFieldV7([]);
    // Seat 0 is the Cult (capital (8, 8)), seat 1 Human (capital (2, 8)).
    state = patchTileV7(state, { x: 9, y: 8 }, { improvement: "MARKET" });
    state = patchTileV7(state, { x: 3, y: 8 }, { improvement: "MARKET" });
    const view = viewForV7(state, state.humanPlayerId);
    const improvements = buildBoardRenderPlanV7(view, [], {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    }).entries.filter((item) => item.kind === "IMPROVEMENT");
    const at = (x: number) =>
      improvements.find((item) => item.at.x === x && item.at.y === 8);
    expect(at(9)?.factionGrass).toBe("CULT");
    expect(at(3)).toBeDefined();
    expect(at(3)?.factionGrass).toBeUndefined();
  });
});
