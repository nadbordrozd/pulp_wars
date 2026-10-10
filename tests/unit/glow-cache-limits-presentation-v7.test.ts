// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BoardGlowCacheV7,
  drawUncachedGlowV7,
  type GlowSpecV7,
} from "../../src/render/canvas/glow-cache-v7";
import { readinessUnitStyleV7 } from "../../src/render/canvas/readiness-presentation";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

/**
 * A small model of Canvas content (jsdom has no Canvas backend): a surface is
 * the ordered list of what was painted on it since it was last cleared, each
 * entry carrying the full paint state and, for a painted surface, that
 * surface's own content at the time. Two surfaces with equal lists hold the
 * same pixels; a stale, unclear or wrongly sized glow raster changes the list.
 */
class CanvasModel {
  readonly #surfaces = new Map<
    HTMLCanvasElement,
    { width: number; height: number; painted: string[] }
  >();
  readonly #contexts = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();
  readonly #images = new Map<object, string>();

  image(name: string): CanvasImageSource {
    const image = {};
    this.#images.set(image, name);
    return image as CanvasImageSource;
  }

  /** Resizing a Canvas clears it, as in a browser. */
  #surface(canvas: HTMLCanvasElement) {
    let surface = this.#surfaces.get(canvas);
    if (
      surface === undefined ||
      surface.width !== canvas.width ||
      surface.height !== canvas.height
    ) {
      surface = { width: canvas.width, height: canvas.height, painted: [] };
      this.#surfaces.set(canvas, surface);
    }
    return surface;
  }

  content(canvas: HTMLCanvasElement): string {
    const surface = this.#surface(canvas);
    return `${surface.width}x${surface.height}[${surface.painted.join("|")}]`;
  }

  /** Backing bytes of every Canvas that still holds pixels, except `skip`. */
  liveBytes(skip: HTMLCanvasElement): number {
    let bytes = 0;
    for (const canvas of this.#surfaces.keys())
      if (canvas !== skip) bytes += canvas.width * canvas.height * 4;
    return bytes;
  }

  context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const existing = this.#contexts.get(canvas);
    if (existing !== undefined) return existing;
    const initial = {
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      shadowColor: "rgba(0, 0, 0, 0)",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillStyle: "#000000",
      transform: [1, 0, 0, 1, 0, 0],
    };
    let state = structuredClone(initial);
    const stack: (typeof initial)[] = [];
    const paint = (what: string) =>
      this.#surface(canvas).painted.push(`${what}@${JSON.stringify(state)}`);
    const describe = (source: unknown): string =>
      source instanceof HTMLCanvasElement
        ? this.content(source)
        : (this.#images.get(source as object) ?? "unknown");
    const methods: Record<string, unknown> = {
      canvas,
      save: () => stack.push(structuredClone(state)),
      restore: () => {
        state = stack.pop() ?? structuredClone(initial);
      },
      setTransform: (...matrix: number[]) => {
        state.transform = matrix;
      },
      getTransform: () => {
        const [a, b, c, d, e, f] = state.transform;
        return { a, b, c, d, e, f };
      },
      clearRect: (x: number, y: number, width: number, height: number) => {
        const surface = this.#surface(canvas);
        const identity = state.transform.join() === "1,0,0,1,0,0";
        if (
          identity &&
          x <= 0 &&
          y <= 0 &&
          x + width >= surface.width &&
          y + height >= surface.height
        )
          surface.painted = [];
        else paint(`clear(${x},${y},${width},${height})`);
      },
      fillRect: (...rect: number[]) => paint(`fill(${rect.join()})`),
      drawImage: (source: unknown, ...rect: number[]) =>
        paint(`image(${describe(source)};${rect.join()})`),
    };
    const context = new Proxy(methods, {
      get: (target, key: string) => {
        if (key in target) return target[key];
        if (key in state) return state[key as keyof typeof state];
        throw new Error(`Canvas model has no ${key}`);
      },
      set: (_target, key: string, value: never) => {
        if (!(key in state)) throw new Error(`Canvas model has no ${key}`);
        state[key as keyof typeof state] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    this.#contexts.set(canvas, context);
    return context;
  }
}

function installModel(): CanvasModel {
  const model = new CanvasModel();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return model.context(this);
    } as never,
  );
  return model;
}

interface GlowDraw {
  readonly image: CanvasImageSource;
  readonly assetId: string;
  readonly rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly glow: GlowSpecV7;
  readonly alpha: number;
}

/**
 * Five frames of a board with ready units, as the renderer draws them: each
 * unit gets the halo layer then the core layer of `readinessUnitStyleV7`
 * (phase-free rasters, only the composite opacity pulses). Two sprites share
 * a size and one is larger; a last sprite carries a plain glow whose raster
 * changes every frame, which makes the cache repaint a same-size surface.
 */
function frames(model: CanvasModel): GlowDraw[][] {
  const units = [
    { assetId: "fighter", x: 40, width: 31.5, height: 40.25 },
    { assetId: "archer", x: 90, width: 31.5, height: 40.25 },
    { assetId: "fighter", x: 140, width: 31.5, height: 40.25 },
    { assetId: "giant", x: 190, width: 52, height: 61 },
  ].map((unit) => ({ ...unit, image: model.image(unit.assetId) }));
  const pulsing = model.image("pulsing");
  return [800, 801, 802, 803, 804].map((elapsedMs, frame) => {
    const style = readinessUnitStyleV7(elapsedMs, false, false, 1);
    const draws: GlowDraw[] = [];
    for (const unit of units)
      for (const layer of [style.halo, style.core])
        draws.push({
          image: unit.image,
          assetId: unit.assetId,
          rect: { x: unit.x, y: 30, width: unit.width, height: unit.height },
          glow: {
            color: layer.color,
            alpha: 1,
            blur: layer.blurCssPx,
            outline: {
              width: layer.widthCssPx,
              rim: layer.rimCssPx,
              rimColor: layer.rimColor,
            },
          },
          alpha: layer.alpha,
        });
    draws.push({
      image: pulsing,
      assetId: "pulsing",
      rect: { x: 250, y: 30, width: 31.5, height: 40.25 },
      glow: { color: "#fff09a", alpha: 0.5 + frame / 10, blur: 2 },
      alpha: 1,
    });
    return draws;
  });
}

function destination(model: CanvasModel, pixelScale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 320 * pixelScale;
  canvas.height = 120 * pixelScale;
  const context = model.context(canvas);
  context.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  return { canvas, context };
}

describe("Ruleset 7 board glow cache under every byte limit", () => {
  for (const pixelScale of [1, 2])
    it(`paints what the uncached path paints and stays inside its limit at pixel scale ${pixelScale}`, () => {
      const model = installModel();
      const sequence = frames(model);

      // The reference: no cache, one frame after another.
      const reference = destination(model, pixelScale);
      const expected: string[] = [];
      for (const frame of sequence) {
        reference.context.clearRect(0, 0, 320, 120);
        for (const draw of frame) {
          reference.context.save();
          reference.context.globalAlpha = draw.alpha;
          drawUncachedGlowV7(
            reference.context,
            draw.image,
            draw.rect,
            draw.glow,
          );
          reference.context.restore();
        }
        expected.push(model.content(reference.canvas));
      }
      expect(new Set(expected).size).toBe(sequence.length);

      // The byte sizes of this sequence's surfaces, from an unbounded cache.
      const sizes: number[] = [];
      {
        const probe = destination(model, pixelScale);
        const cache = new BoardGlowCacheV7(document);
        let before = 0;
        for (const draw of sequence[0] ?? []) {
          cache.draw(
            probe.context,
            draw.image,
            draw.assetId,
            draw.rect,
            draw.glow,
          );
          if (cache.byteLength > before) sizes.push(cache.byteLength - before);
          before = cache.byteLength;
        }
        cache.clear();
      }
      const smallest = Math.min(...sizes);
      const largest = Math.max(...sizes);
      const oneFrame = sizes.reduce((sum, bytes) => sum + bytes, 0);
      // Halo and core of a unit, the two same-size sprites, and the giant.
      expect(sizes.length).toBeGreaterThanOrEqual(6);
      expect(smallest).toBeLessThan(largest);

      const limits = [
        0,
        1,
        smallest - 1,
        smallest,
        smallest + 1,
        largest - 1,
        largest,
        // Below one unit's halo and core together (bead pulp_wars-9s0.15).
        (sizes[0] ?? 0) + (sizes[1] ?? 0) - 1,
        (sizes[0] ?? 0) + (sizes[1] ?? 0),
        Math.floor(oneFrame / 2),
        oneFrame - 1,
        oneFrame,
        24 * 1024 * 1024,
      ];
      for (const limit of limits) {
        const target = destination(model, pixelScale);
        const cache = new BoardGlowCacheV7(document, limit);
        const baseline = model.liveBytes(target.canvas);
        sequence.forEach((frame, index) => {
          target.context.clearRect(0, 0, 320, 120);
          for (const draw of frame) {
            target.context.save();
            target.context.globalAlpha = draw.alpha;
            cache.draw(
              target.context,
              draw.image,
              draw.assetId,
              draw.rect,
              draw.glow,
            );
            target.context.restore();
            expect(cache.byteLength, `limit ${limit}`).toBeLessThanOrEqual(
              limit,
            );
            // Everything the cache holds is counted, apart from its one
            // shared outline mask, which is never larger than a surface.
            const held = model.liveBytes(target.canvas) - baseline;
            expect(held, `limit ${limit}`).toBeGreaterThanOrEqual(
              cache.byteLength,
            );
            expect(
              held - cache.byteLength,
              `limit ${limit}`,
            ).toBeLessThanOrEqual(Math.min(limit, largest));
          }
          expect(
            model.content(target.canvas),
            `limit ${limit}, frame ${index}`,
          ).toBe(expected[index]);
        });
        if (limit < smallest) expect(cache.byteLength).toBe(0);
        cache.clear();
        expect(cache.byteLength).toBe(0);
        expect(model.liveBytes(target.canvas) - baseline).toBe(0);
      }
    });
});
