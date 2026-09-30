// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChibiArtAssetV7 } from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  BoardGlowCacheV7,
  dilationOffsetsV7,
  type GlowSpecV7,
} from "../../src/render/canvas/glow-cache-v7";
import {
  parseHexColourV7,
  RULESET7_PLAYER_COLORS,
} from "../../src/render/canvas/owner-recolour-v7";
import {
  READINESS_PULSE_DURATION_MS,
  READINESS_V7_CORE_COLOR,
  READINESS_V7_HALO_COLOR,
  READINESS_V7_HIGH_CONTRAST_CORE_COLOR,
  READINESS_V7_HIGH_CONTRAST_RIM_COLOR,
  READINESS_V7_RIM_COLOR,
  readinessUnitStyleV7,
  type ReadinessUnitStyleV7,
} from "../../src/render/canvas/readiness-presentation";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Everything that shapes a cached outline raster (not its opacity). */
function rasterShape(style: ReadinessUnitStyleV7) {
  const shape = (layer: ReadinessUnitStyleV7["core"]) => ({
    color: layer.color,
    widthCssPx: layer.widthCssPx,
    rimColor: layer.rimColor,
    rimCssPx: layer.rimCssPx,
    blurCssPx: layer.blurCssPx,
  });
  return { halo: shape(style.halo), core: shape(style.core) };
}

function luminance(hex: string): number {
  const rgb = parseHexColourV7(hex);
  if (rgb === null) throw new Error(`bad colour ${hex}`);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
}

function contrast(left: string, right: string): number {
  const [a, b] = [luminance(left), luminance(right)].sort((x, y) => y - x);
  return ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
}

describe("Ruleset 7 ready-unit outline style (pulp_wars-q8b)", () => {
  it("never fades or scales the sprite and keeps a thick legible band at every zoom", () => {
    for (const scale of [0.5, 0.75, 1, 1.5, 2])
      for (const elapsed of [0, 400, 800, 1_200])
        for (const reduced of [false, true])
          for (const highContrast of [false, true]) {
            const style = readinessUnitStyleV7(
              elapsed,
              reduced,
              highContrast,
              scale,
            );
            expect(style).toMatchObject({ opacity: 1, scale: 1 });
            // At least 3 CSS px of band plus a 1 CSS px rim, even at 0.5.
            expect(style.core.widthCssPx).toBeGreaterThanOrEqual(3);
            expect(style.core.rimCssPx).toBeGreaterThanOrEqual(1);
            expect(style.core.widthCssPx).toBeGreaterThanOrEqual(4 * scale);
            // The aura starts at the rim's outer edge and blurs beyond it.
            expect(style.halo.widthCssPx).toBe(
              style.core.widthCssPx + style.core.rimCssPx,
            );
            expect(style.halo.blurCssPx).toBeGreaterThan(0);
            expect(style.halo.rimColor).toBeNull();
            expect(style.core.blurCssPx).toBe(0);
          }
  });

  it("pulses only composite opacity, so each outline raster is phase-free", () => {
    const at = (elapsed: number) =>
      readinessUnitStyleV7(elapsed, false, false, 0.75);
    const start = at(0);
    const quarter = at(400);
    const peak = at(800);
    for (const elapsed of [123, 400, 800, 1_599])
      expect(rasterShape(at(elapsed))).toEqual(rasterShape(start));
    expect(start.halo.alpha).toBeCloseTo(0.3, 10);
    expect(quarter.halo.alpha).toBeCloseTo(0.65, 10);
    expect(peak.halo.alpha).toBeCloseTo(1, 10);
    expect(start.core.alpha).toBeCloseTo(0.88, 10);
    expect(peak.core.alpha).toBeCloseTo(1, 10);
    // The band never drops below a strong, near-solid opacity.
    for (let elapsed = 0; elapsed < 1_600; elapsed += 50)
      expect(at(elapsed).core.alpha).toBeGreaterThanOrEqual(0.88);
    expect(at(READINESS_PULSE_DURATION_MS)).toEqual(start);
    expect(at(-800)).toEqual(peak);
  });

  it("uses warm white with a dark rim and gold aura, distinct from every owner colour", () => {
    const style = readinessUnitStyleV7(0, false, false, 1);
    expect(style.core.color).toBe(READINESS_V7_CORE_COLOR);
    expect(style.core.rimColor).toBe(READINESS_V7_RIM_COLOR);
    expect(style.halo.color).toBe(READINESS_V7_HALO_COLOR);
    // The band is far brighter than its rim, and the rim separates it from
    // any owner colour or terrain it touches.
    expect(
      contrast(READINESS_V7_CORE_COLOR, READINESS_V7_RIM_COLOR),
    ).toBeGreaterThan(12);
    for (const owner of Object.values(RULESET7_PLAYER_COLORS)) {
      expect(contrast(READINESS_V7_CORE_COLOR, owner)).toBeGreaterThan(1.5);
      expect(contrast(READINESS_V7_RIM_COLOR, owner)).toBeGreaterThan(3.5);
    }
  });

  it("is one static strong frame in Reduced motion", () => {
    const frames = [0, 400, 800, 12_345].map((elapsed) =>
      readinessUnitStyleV7(elapsed, true, false, 0.75),
    );
    for (const frame of frames) expect(frame).toEqual(frames[0]);
    expect(frames[0]?.core.alpha).toBe(1);
    expect(frames[0]?.halo.alpha).toBe(0.9);
    const highContrast = [0, 800].map((elapsed) =>
      readinessUnitStyleV7(elapsed, true, true, 0.75),
    );
    expect(highContrast[1]).toEqual(highContrast[0]);
    expect(highContrast[0]?.core.alpha).toBe(1);
  });

  it("is a solid white band with a thicker black rim in high contrast", () => {
    for (const elapsed of [0, 400, 800]) {
      const style = readinessUnitStyleV7(elapsed, false, true, 1);
      expect(style.core).toMatchObject({
        color: READINESS_V7_HIGH_CONTRAST_CORE_COLOR,
        rimColor: READINESS_V7_HIGH_CONTRAST_RIM_COLOR,
        alpha: 1,
      });
      expect(style.core.rimCssPx).toBeGreaterThan(
        readinessUnitStyleV7(elapsed, false, false, 1).core.rimCssPx,
      );
      expect(style.halo.color).toBe(READINESS_V7_HIGH_CONTRAST_CORE_COLOR);
    }
    expect(
      contrast(
        READINESS_V7_HIGH_CONTRAST_CORE_COLOR,
        READINESS_V7_HIGH_CONTRAST_RIM_COLOR,
      ),
    ).toBe(21);
  });
});

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

const fighter: ChibiArtAssetV7 = {
  id: "fixture-fighter",
  subject: "UNIT:FIGHTER",
  assetClass: "STANDARD_UNIT",
  width: 56,
  height: 80,
  url: "/fixture/fighter.png",
};

const chibiArt: ChibiBoardArtV7 = {
  resolve: (request) =>
    request.subject === fighter.subject
      ? {
          kind: "READY",
          asset: fighter,
          image: { chibi: fighter.id } as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: `chibi:${fighter.id}`,
        }
      : { kind: "MISSING" },
};

function unit(x: number, ready: boolean): BoardRenderPlanEntryV7 {
  return {
    key: `unit:${x + 1}`,
    kind: "UNIT",
    layer: 5,
    at: { x, y: 0 },
    assetId: "unit-original-fighter",
    artSubject: "UNIT:FIGHTER",
    ready,
  };
}

function drawReady(options: {
  readonly artSet: "CHIBI" | "LEGACY";
  readonly zoom: number;
  readonly elapsedMs: number;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
}) {
  const { context, log } = recordingContext();
  const glowDraws: {
    readonly assetId: string;
    readonly glow: GlowSpecV7;
    readonly at: number;
  }[] = [];
  const glowCache = {
    draw: (
      _context: CanvasRenderingContext2D,
      _image: CanvasImageSource,
      assetId: string,
      _rect: unknown,
      glow: GlowSpecV7,
    ) => {
      glowDraws.push({ assetId, glow, at: log.length });
      log.push(["glow", assetId]);
    },
  } as unknown as BoardGlowCacheV7;
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { offsetX: 100, offsetY: 100, zoom: options.zoom },
    plan: { version: 7, entries: [unit(0, true), unit(1, false)], targets: [] },
    images: {
      resolve: (assetId: string) =>
        ({ legacy: assetId }) as unknown as CanvasImageSource,
    },
    artSet: options.artSet,
    chibiArt,
    glowCache,
    readinessElapsedMs: options.elapsedMs,
    reducedMotion: options.reducedMotion ?? false,
    highContrast: options.highContrast ?? false,
  });
  return { log, glowDraws };
}

describe("Ruleset 7 ready-unit outline drawing", () => {
  for (const artSet of ["CHIBI", "LEGACY"] as const)
    it(`draws the aura then the band before an opaque, unscaled ${artSet} sprite`, () => {
      const step = 0.75;
      const zoom = artSet === "CHIBI" ? chibiCameraZoom(step) : step;
      const { log, glowDraws } = drawReady({ artSet, zoom, elapsedMs: 0 });
      const expected = readinessUnitStyleV7(0, false, false, step);
      // Only the ready unit is outlined: two layers, aura first.
      expect(glowDraws.map((call) => call.glow)).toEqual([
        {
          color: expected.halo.color,
          alpha: 1,
          blur: expected.halo.blurCssPx,
          outline: {
            width: expected.halo.widthCssPx,
            rim: 0,
            rimColor: null,
          },
        },
        {
          color: expected.core.color,
          alpha: 1,
          blur: 0,
          outline: {
            width: expected.core.widthCssPx,
            rim: expected.core.rimCssPx,
            rimColor: expected.core.rimColor,
          },
        },
      ]);
      // Each layer is composited at its pulse opacity inside save/restore.
      for (const [index, layer] of [expected.halo, expected.core].entries()) {
        const at = glowDraws[index]?.at ?? -1;
        expect(log[at - 2]).toEqual(["save"]);
        expect(log[at - 1]).toEqual(["set", "globalAlpha", layer.alpha]);
        expect(log[at + 1]).toEqual(["restore"]);
      }
      const sprites = log.filter(
        (call) =>
          call[0] === "drawImage" &&
          ((call[1] as { chibi?: string; legacy?: string }).chibi ??
            (call[1] as { legacy?: string }).legacy) !== undefined,
      );
      expect(sprites).toHaveLength(2);
      const readySprite = log.indexOf(sprites[0] as LogEntry);
      expect(readySprite).toBeGreaterThan(glowDraws[1]?.at ?? Infinity);
      const alphaBefore = log
        .slice(0, readySprite)
        .filter((call) => call[0] === "set" && call[1] === "globalAlpha");
      expect(alphaBefore.at(-1)?.[2]).toBe(1);
      // Ready and handled sprites share one size: nothing is enlarged.
      expect(sprites[0]?.slice(4)).toEqual(sprites[1]?.slice(4));
    });

  it("follows the sprite's own scale: the CHIBI step, not the world zoom", () => {
    const chibi = drawReady({
      artSet: "CHIBI",
      zoom: chibiCameraZoom(1),
      elapsedMs: 0,
    });
    const legacy = drawReady({ artSet: "LEGACY", zoom: 1, elapsedMs: 0 });
    expect(chibi.glowDraws[1]?.glow.outline?.width).toBe(4);
    expect(legacy.glowDraws[1]?.glow.outline?.width).toBe(4);
    const zoomed = drawReady({
      artSet: "CHIBI",
      zoom: chibiCameraZoom(2),
      elapsedMs: 0,
    });
    expect(zoomed.glowDraws[1]?.glow.outline?.width).toBe(8);
  });

  it("requests the same rasters every frame and only changes composite opacity", () => {
    const frames = [0, 300, 800, 1_300].map((elapsedMs) =>
      drawReady({ artSet: "CHIBI", zoom: chibiCameraZoom(1), elapsedMs }),
    );
    for (const frame of frames)
      expect(frame.glowDraws.map((call) => call.glow)).toEqual(
        frames[0]?.glowDraws.map((call) => call.glow),
      );
    const haloAlpha = (frame: (typeof frames)[number]) =>
      frame.log[(frame.glowDraws[0]?.at ?? 0) - 1]?.[2];
    expect(haloAlpha(frames[2] as (typeof frames)[number])).toBeGreaterThan(
      Number(haloAlpha(frames[0] as (typeof frames)[number])),
    );
  });

  it("draws Reduced motion and high contrast as static strong outlines", () => {
    const reduced = [0, 800].map((elapsedMs) =>
      drawReady({
        artSet: "LEGACY",
        zoom: 0.75,
        elapsedMs,
        reducedMotion: true,
      }),
    );
    expect(reduced[1]?.log).toEqual(reduced[0]?.log);
    const contrasted = drawReady({
      artSet: "CHIBI",
      zoom: chibiCameraZoom(0.75),
      elapsedMs: 400,
      highContrast: true,
    });
    expect(contrasted.glowDraws[1]?.glow).toMatchObject({
      color: READINESS_V7_HIGH_CONTRAST_CORE_COLOR,
      outline: { rimColor: READINESS_V7_HIGH_CONTRAST_RIM_COLOR },
    });
    const coreAt = contrasted.glowDraws[1]?.at ?? 0;
    expect(contrasted.log[coreAt - 1]).toEqual(["set", "globalAlpha", 1]);
  });
});

describe("glow cache silhouette outlines", () => {
  it("dilates with dense concentric rings that reach the full radius", () => {
    expect(dilationOffsetsV7(0)).toEqual([[0, 0]]);
    for (const radius of [1, 2.5, 6, 11]) {
      const offsets = dilationOffsetsV7(radius);
      expect(offsets[0]).toEqual([0, 0]);
      const distances = offsets.map(([x, y]) => Math.hypot(x, y));
      expect(Math.max(...distances)).toBeCloseTo(radius, 10);
      // Rings are at most 3 device px apart, and points on the outer ring
      // at most 1.25 device px apart.
      const rings = [...new Set(distances.map((d) => d.toFixed(6)))];
      expect(rings.length - 1).toBe(Math.max(1, Math.ceil(radius / 3)));
      const outer = offsets.filter(
        ([x, y]) => Math.abs(Math.hypot(x, y) - radius) < 1e-9,
      );
      expect((Math.PI * 2 * radius) / outer.length).toBeLessThanOrEqual(1.25);
    }
  });

  it("paints rim then band from dilated silhouettes, removes the sprite, and caches by shape", () => {
    const calls: {
      readonly canvas: HTMLCanvasElement;
      readonly call: LogEntry;
    }[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        return new Proxy(
          {},
          {
            get: (target, key) =>
              key === "canvas"
                ? this
                : key in target
                  ? Reflect.get(target, key)
                  : (...args: unknown[]) => {
                      calls.push({
                        canvas: this,
                        call: [String(key), ...args],
                      });
                    },
            set: (target, key, value) => {
              calls.push({ canvas: this, call: ["set", String(key), value] });
              return Reflect.set(target, key, value);
            },
          },
        ) as unknown as CanvasRenderingContext2D;
      } as unknown as typeof HTMLCanvasElement.prototype.getContext,
    );
    const main = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "getTransform"
            ? () => ({ a: 2, b: 0, c: 0, d: 2 })
            : (...args: unknown[]) => {
                calls.push({
                  canvas: null as unknown as HTMLCanvasElement,
                  call: ["main:" + String(key), ...args],
                });
              },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    const cache = new BoardGlowCacheV7(document);
    const image = { sprite: true } as unknown as CanvasImageSource;
    const rect = { x: 10, y: 20, width: 42, height: 60 };
    const core: GlowSpecV7 = {
      color: READINESS_V7_CORE_COLOR,
      alpha: 1,
      blur: 0,
      outline: { width: 3, rim: 1, rimColor: READINESS_V7_RIM_COLOR },
    };
    cache.draw(main, image, "fighter", rect, core);
    const fills = calls
      .filter(({ call }) => call[0] === "set" && call[1] === "fillStyle")
      .map(({ call }) => call[2]);
    // Rim (outer, dilated by 4 CSS px = 8 device px) first, then the band.
    expect(fills).toEqual([READINESS_V7_RIM_COLOR, READINESS_V7_CORE_COLOR]);
    const spriteDraws = calls.filter(
      ({ call }) => call[0] === "drawImage" && call[1] === image,
    );
    const outer = dilationOffsetsV7(8).length;
    const inner = dilationOffsetsV7(6).length;
    // Both dilations, plus the final destination-out of the sprite itself.
    expect(spriteDraws).toHaveLength(outer + inner + 1);
    const erase = calls.findIndex(
      ({ call }) =>
        call[0] === "set" &&
        call[1] === "globalCompositeOperation" &&
        call[2] === "destination-out",
    );
    expect(
      calls.indexOf(spriteDraws.at(-1) as (typeof calls)[number]),
    ).toBeGreaterThan(erase);
    // Padding covers band + rim (8 device px) plus a 2 px margin.
    const composite = calls.filter(({ call }) => call[0] === "main:drawImage");
    expect(composite).toHaveLength(1);
    expect(composite[0]?.call.slice(2)).toEqual([5, 15, 52, 70]);
    // Same shape again: served from cache without repainting.
    const before = calls.length;
    cache.draw(main, image, "fighter", rect, core);
    expect(
      calls.slice(before).filter(({ call }) => call[0] === "drawImage"),
    ).toHaveLength(0);
    // A different band width is a different raster.
    cache.draw(main, image, "fighter", rect, {
      ...core,
      outline: { width: 4, rim: 1, rimColor: READINESS_V7_RIM_COLOR },
    });
    expect(
      calls.slice(before).filter(({ call }) => call[0] === "drawImage").length,
    ).toBeGreaterThan(0);
    cache.clear();
    expect(cache.byteLength).toBe(0);
  });
});
