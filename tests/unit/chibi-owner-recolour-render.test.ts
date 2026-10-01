import { describe, expect, it, vi } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_UNOWNED_OWNER_COLOUR_V7,
  createChibiArtResolverV7,
  type ChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  CHIBI_OWNER_KEY_COLOUR,
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";

/** 2 x 1 fixture: a key-red owner pixel and a red-brown shield pixel. */
function fixturePixels(): Uint8ClampedArray {
  return new Uint8ClampedArray([216, 38, 44, 255, 150, 40, 30, 255]);
}

describe("CHIBI owner-mask recolour", () => {
  it("recolours exactly the masked pixels with the owner colour and never hue-matches", () => {
    const teal = parseHexColourV7(RULESET7_PLAYER_COLORS.TEAL);
    if (teal === null) throw new Error("teal missing");
    const output = recolourOwnerPixelsV7({
      pixels: fixturePixels(),
      width: 2,
      height: 1,
      // Only the first pixel is owner area; the red-brown shield stays.
      mask: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]),
      maskWidth: 2,
      maskHeight: 1,
      owner: teal,
    });
    expect([...output.slice(0, 4)]).toEqual([teal.r, teal.g, teal.b, 255]);
    expect([...output.slice(4)]).toEqual([150, 40, 30, 255]);
    // An empty mask changes nothing, even on a pixel that is exactly the key colour.
    const unmasked = recolourOwnerPixelsV7({
      pixels: fixturePixels(),
      width: 2,
      height: 1,
      mask: new Uint8ClampedArray(8),
      maskWidth: 2,
      maskHeight: 1,
      owner: teal,
    });
    expect([...unmasked]).toEqual([...fixturePixels()]);
    expect(parseHexColourV7(CHIBI_OWNER_KEY_COLOUR)).toEqual({
      r: 216,
      g: 38,
      b: 44,
    });
  });

  it("keeps flat shading relative to the key colour and respects transparency", () => {
    const gold = parseHexColourV7(RULESET7_PLAYER_COLORS.GOLD);
    if (gold === null) throw new Error("gold missing");
    const output = recolourOwnerPixelsV7({
      // A half-bright shadow of the key and a transparent masked pixel.
      pixels: new Uint8ClampedArray([108, 19, 22, 255, 216, 38, 44, 0]),
      width: 2,
      height: 1,
      mask: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]),
      maskWidth: 2,
      maskHeight: 1,
      owner: gold,
    });
    expect([...output.slice(0, 4)]).toEqual([
      Math.round(gold.r / 2),
      Math.round(gold.g / 2),
      Math.round(gold.b / 2),
      255,
    ]);
    expect([...output.slice(4)]).toEqual([216, 38, 44, 0]);
  });

  it("drives an x2 density variant from the master mask with nearest-neighbour sampling", () => {
    const violet = parseHexColourV7(RULESET7_PLAYER_COLORS.VIOLET);
    if (violet === null) throw new Error("violet missing");
    const x2 = new Uint8ClampedArray(4 * 2 * 4);
    for (let y = 0; y < 2; y += 1)
      for (let x = 0; x < 4; x += 1)
        x2.set(
          x < 2 ? [216, 38, 44, 255] : [150, 40, 30, 255],
          (y * 4 + x) * 4,
        );
    const output = recolourOwnerPixelsV7({
      pixels: x2,
      width: 4,
      height: 2,
      mask: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]),
      maskWidth: 2,
      maskHeight: 1,
      owner: violet,
    });
    for (let y = 0; y < 2; y += 1)
      for (let x = 0; x < 4; x += 1)
        expect([...output.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 3)]).toEqual(
          x < 2 ? [violet.r, violet.g, violet.b] : [150, 40, 30],
        );
  });
});

describe("CHIBI art resolver", () => {
  const fighter: ChibiArtAssetV7 = {
    id: "chibi-test-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 2,
    height: 1,
    url: "/fixture/fighter.png",
    densityUrls: { 2: "/fixture/fighter@2x.png" },
    ownerMaskUrl: "/fixture/fighter-mask.png",
  };

  function environment(options: { readonly failMask?: boolean } = {}) {
    const pending = new Map<string, (ok: boolean) => void>();
    const surfaces: { readonly pixels: Uint8ClampedArray }[] = [];
    const env: ChibiRasterEnvironmentV7 = {
      loadImage: vi.fn((url: string, settle: (ok: boolean) => void) => {
        pending.set(url, settle);
        return { url } as unknown as CanvasImageSource;
      }),
      readPixels: vi.fn((image: CanvasImageSource, width: number) => {
        const url = (image as unknown as { url: string }).url;
        if (url.includes("mask"))
          return new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
        const base = fixturePixels();
        if (width === 2) return base;
        const doubled = new Uint8ClampedArray(4 * 2 * 4);
        for (let y = 0; y < 2; y += 1)
          for (let x = 0; x < 4; x += 1)
            doubled.set(
              base.slice(x < 2 ? 0 : 4, x < 2 ? 4 : 8),
              (y * 4 + x) * 4,
            );
        return doubled;
      }),
      createSurface: vi.fn((pixels: Uint8ClampedArray) => {
        const surface = { pixels };
        surfaces.push(surface);
        return surface as unknown as CanvasImageSource;
      }),
    };
    const settleAll = () => {
      for (const [url, settle] of [...pending]) {
        pending.delete(url);
        settle(!(options.failMask === true && url.includes("mask")));
      }
    };
    return { env, surfaces, settleAll };
  }

  it("falls back per subject, waits for loads and caches one recolour per owner and density", () => {
    const { env, surfaces, settleAll } = environment();
    const redraw = vi.fn();
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw,
      registry: buildChibiArtRegistryV7([fighter]).registry,
    });
    const request = {
      subject: "UNIT:FIGHTER" as const,
      at: { x: 1, y: 1 },
      ownerColor: RULESET7_PLAYER_COLORS.TEAL,
      deviceScale: 1,
    };
    expect(
      resolver.resolve({ ...request, subject: "UNIT:MARKSMAN" }).kind,
    ).toBe("MISSING");
    expect(resolver.resolve(request).kind).toBe("LOADING");
    settleAll();
    expect(resolver.resolve(request).kind).toBe("LOADING");
    settleAll();
    expect(redraw).toHaveBeenCalled();
    const teal = resolver.resolve(request);
    if (teal.kind !== "READY") throw new Error("teal not ready");
    expect(teal.density).toBe(1);
    expect(teal.smoothing).toBe(false);
    expect(teal.cacheKey).toBe(
      `chibi:chibi-test-fighter@1#${RULESET7_PLAYER_COLORS.TEAL}`,
    );
    const tealRgb = parseHexColourV7(RULESET7_PLAYER_COLORS.TEAL);
    expect([...(surfaces[0]?.pixels.slice(0, 3) ?? [])]).toEqual([
      tealRgb?.r,
      tealRgb?.g,
      tealRgb?.b,
    ]);
    expect(resolver.resolve(request)).toEqual(teal);
    expect(env.createSurface).toHaveBeenCalledTimes(1);
    const gold = resolver.resolve({
      ...request,
      ownerColor: RULESET7_PLAYER_COLORS.GOLD,
    });
    expect(gold.kind).toBe("READY");
    expect(env.createSurface).toHaveBeenCalledTimes(2);
    expect(gold).not.toEqual(teal);
    // DPR 2 at zoom 1 uses the x2 variant with the master mask.
    expect(resolver.resolve({ ...request, deviceScale: 2 }).kind).toBe(
      "LOADING",
    );
    settleAll();
    const dense = resolver.resolve({ ...request, deviceScale: 2 });
    if (dense.kind !== "READY") throw new Error("x2 not ready");
    expect(dense.density).toBe(2);
    expect(surfaces.at(-1)?.pixels).toHaveLength(4 * 2 * 4);
    // Mask pixels are read once per asset, never per owner.
    const maskReads = vi
      .mocked(env.readPixels)
      .mock.calls.filter(([image]) =>
        (image as unknown as { url: string }).url.includes("mask"),
      );
    expect(maskReads).toHaveLength(1);
  });

  it("uses the legacy fallback instead of raw key colour when a mask cannot load", () => {
    const { env, settleAll } = environment({ failMask: true });
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7([fighter]).registry,
    });
    const request = {
      subject: "UNIT:FIGHTER" as const,
      at: { x: 0, y: 0 },
      ownerColor: RULESET7_PLAYER_COLORS.CORAL,
      deviceScale: 1,
    };
    resolver.resolve(request);
    settleAll();
    resolver.resolve(request);
    settleAll();
    expect(resolver.resolve(request).kind).toBe("MISSING");
  });

  it("recolours a masked improvement without an owner to neutral stone, never the raw key", () => {
    const { env, surfaces, settleAll } = environment();
    const windmill: ChibiArtAssetV7 = {
      ...fighter,
      id: "chibi-test-windmill",
      subject: "IMPROVEMENT:WINDMILL",
      assetClass: "BUILDING",
    };
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7([windmill]).registry,
    });
    const request = {
      subject: "IMPROVEMENT:WINDMILL" as const,
      at: { x: 0, y: 0 },
      deviceScale: 1,
    };
    resolver.resolve(request);
    settleAll();
    resolver.resolve(request);
    settleAll();
    const unowned = resolver.resolve(request);
    if (unowned.kind !== "READY") throw new Error("windmill not ready");
    expect(unowned.cacheKey).toBe(
      `chibi:chibi-test-windmill@1#${CHIBI_UNOWNED_OWNER_COLOUR_V7}`,
    );
    const stone = parseHexColourV7(CHIBI_UNOWNED_OWNER_COLOUR_V7);
    expect([...(surfaces[0]?.pixels.slice(0, 3) ?? [])]).toEqual([
      stone?.r,
      stone?.g,
      stone?.b,
    ]);
    // The unmasked pixel keeps its own colour.
    expect([...(surfaces[0]?.pixels.slice(4, 7) ?? [])]).toEqual([150, 40, 30]);
  });

  it("draws every registered masked building of every batch in neutral stone on an unowned tile", () => {
    const buildings = CHIBI_ART_ASSETS_V7.filter(
      (asset) =>
        asset.subject.startsWith("IMPROVEMENT:") &&
        asset.ownerMaskUrl !== undefined,
    );
    // Batch 3 (reviewed mask overrides) and batch 4 (auto masks). The Farm
    // is a field of grain without an owner mask (pulp_wars-6gd.5).
    expect(buildings.map((asset) => asset.subject)).not.toContain(
      "IMPROVEMENT:FARM",
    );
    expect(buildings.map((asset) => asset.subject)).toEqual(
      expect.arrayContaining([
        "IMPROVEMENT:PORT",
        "IMPROVEMENT:MONUMENT",
        "IMPROVEMENT:WINDMILL",
        "IMPROVEMENT:SHIPYARD",
      ]),
    );
    const env: ChibiRasterEnvironmentV7 = {
      loadImage: (_url, settle) => {
        settle(true);
        return {} as CanvasImageSource;
      },
      readPixels: (_image, width, height) =>
        new Uint8ClampedArray(width * height * 4),
      createSurface: () => ({}) as CanvasImageSource,
    };
    const resolver = createChibiArtResolverV7({
      environment: env,
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7(buildings).registry,
    });
    for (const asset of buildings) {
      const unowned = resolver.resolve({
        subject: asset.subject,
        at: { x: 0, y: 0 },
        deviceScale: 1,
      });
      expect(unowned.kind === "READY" ? unowned.cacheKey : unowned.kind).toBe(
        `chibi:${asset.id}@1#${CHIBI_UNOWNED_OWNER_COLOUR_V7}`,
      );
    }
  });

  it("draws the Farm field as its master for every owner, never recoloured (pulp_wars-6gd.5)", () => {
    const farms = CHIBI_ART_ASSETS_V7.filter(
      (asset) => asset.subject === "IMPROVEMENT:FARM",
    );
    expect(farms.map((asset) => asset.id)).toEqual(["chibi-farm"]);
    expect(farms[0]?.ownerMaskUrl).toBeUndefined();
    const master = { master: true } as unknown as CanvasImageSource;
    const loaded: string[] = [];
    const createSurface = vi.fn(() => ({}) as CanvasImageSource);
    const resolver = createChibiArtResolverV7({
      environment: {
        loadImage: (url, settle) => {
          loaded.push(url);
          settle(true);
          return master;
        },
        readPixels: (_image, width, height) =>
          new Uint8ClampedArray(width * height * 4),
        createSurface,
      },
      redraw: vi.fn(),
      registry: buildChibiArtRegistryV7(farms).registry,
    });
    for (const ownerColor of [
      undefined,
      ...Object.values(RULESET7_PLAYER_COLORS),
    ]) {
      const farm = resolver.resolve({
        subject: "IMPROVEMENT:FARM",
        at: { x: 3, y: 2 },
        ownerColor,
        deviceScale: 1,
      });
      if (farm.kind !== "READY") throw new Error("the Farm did not resolve");
      expect(farm.image).toBe(master);
      expect(farm.cacheKey).toBe("chibi:chibi-farm@1");
    }
    // Only the master is requested: no mask raster, no recolour surface.
    expect(loaded).toEqual([farms[0]?.url]);
    expect(createSurface).not.toHaveBeenCalled();
  });
});
