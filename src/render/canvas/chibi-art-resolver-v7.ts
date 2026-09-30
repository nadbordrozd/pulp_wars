import {
  buildChibiArtRegistryV7,
  chibiFallbackSubjectV7,
  chibiOverflowV7,
  chibiVariantV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
} from "../../assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../assets/chibi-art-manifest";
import { chibiRasterForDeviceScale } from "./chibi-geometry-v7";
import type { Point } from "./geometry";
import { parseHexColourV7, recolourOwnerPixelsV7 } from "./owner-recolour-v7";

export type ChibiResolutionV7 =
  /** No usable chibi raster: draw the legacy asset at chibi geometry. */
  | { readonly kind: "MISSING" }
  /** A registered raster (or its mask) is still loading: draw nothing yet. */
  | { readonly kind: "LOADING" }
  | {
      readonly kind: "READY";
      readonly asset: ChibiArtAssetV7;
      readonly image: CanvasImageSource;
      /** Raster density: 1 for the master, 2 or 3 for a manifest variant. */
      readonly density: 1 | 2 | 3;
      readonly smoothing: boolean;
      /** Stable per asset, density and owner; used by effect caches. */
      readonly cacheKey: string;
      /**
       * Tall terrain with checked-in layers, once both are loaded: the 80 x
       * 80 ground tile and the transparent body (master size, density 1),
       * so a Road can be drawn between them. Absent while they load, if one
       * fails, or for a density variant; the master is drawn whole instead.
       */
      readonly layers?: ChibiTallTerrainImagesV7;
      /**
       * Tall terrain at a smoothed (fractional) scale: the master's owning
       * cell and upward overflow, and the body layer's owning cell once it
       * is loaded, as separate rasters. Bilinear filtering of a source
       * sub-rectangle reads the rows across its edge, so drawing the cell
       * from the whole master blended the transparent overflow row into
       * the cell's top device row: a faint seam (pulp_wars-51t). Absent at
       * whole scales, for a density variant, and when pixel readback
       * fails; the master is then drawn by sub-rectangle.
       */
      readonly parts?: ChibiTallTerrainPartsV7;
    };

export interface ChibiTallTerrainImagesV7 {
  readonly ground: CanvasImageSource;
  readonly body: CanvasImageSource;
}

export interface ChibiTallTerrainPartsV7 {
  /** Master rows below the upward overflow (80 x 80 at density 1). */
  readonly cell: CanvasImageSource;
  /** Master rows of the upward overflow. */
  readonly overflow: CanvasImageSource;
  /** Body-layer rows below the upward overflow, when the body is loaded. */
  readonly bodyCell?: CanvasImageSource;
}

/**
 * Owner colour for a masked CHIBI piece drawn without an owner, such as an
 * improvement on a tile outside every city's territory: a neutral warm
 * stone grey, distinct from the four player colours.
 */
export const CHIBI_UNOWNED_OWNER_COLOUR_V7 = "#9c968a";

export interface ChibiArtRequestV7 {
  readonly subject: ArtSubjectV7;
  readonly at: Point;
  readonly ownerColor?: string | undefined;
  /** Device pixels per master pixel: zoom step x devicePixelRatio. */
  readonly deviceScale: number;
}

export interface ChibiBoardArtV7 {
  resolve(request: ChibiArtRequestV7): ChibiResolutionV7;
}

export interface ChibiEntryResolutionV7 {
  readonly resolution: ChibiResolutionV7;
  /**
   * True when a faction subject (for example `UNIT:UNDEAD:FIGHTER`) resolved
   * to its own raster (ready or still loading). False for a stand-in: the
   * shared subject's raster, or the legacy asset.
   */
  readonly factionArt: boolean;
}

/**
 * Resolves a subject and, when a faction subject has no usable raster
 * (none registered, or its load failed), its shared stand-in subject from
 * chibiFallbackSubjectV7: an Undead unit without Undead art draws the Human
 * sprite of its role.
 */
export function resolveChibiWithFallbackV7(
  art: ChibiBoardArtV7,
  request: ChibiArtRequestV7,
): ChibiEntryResolutionV7 {
  const own = art.resolve(request);
  const fallback = chibiFallbackSubjectV7(request.subject);
  if (fallback === null) return { resolution: own, factionArt: false };
  if (own.kind !== "MISSING") return { resolution: own, factionArt: true };
  return {
    resolution: art.resolve({ ...request, subject: fallback }),
    factionArt: false,
  };
}

/** Browser seams, injectable so the loading and recolour cache are testable. */
export interface ChibiRasterEnvironmentV7 {
  loadImage(url: string, settle: (ok: boolean) => void): CanvasImageSource;
  readPixels(
    image: CanvasImageSource,
    width: number,
    height: number,
  ): Uint8ClampedArray | null;
  createSurface(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): CanvasImageSource | null;
}

export function browserChibiRasterEnvironmentV7(
  documentRoot: Document,
): ChibiRasterEnvironmentV7 {
  return {
    loadImage(url, settle) {
      const image = documentRoot.createElement("img");
      image.addEventListener("load", () => settle(true));
      image.addEventListener("error", () => settle(false));
      image.src = url;
      return image;
    },
    readPixels(image, width, height) {
      try {
        const canvas = documentRoot.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context === null) return null;
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        return context.getImageData(0, 0, width, height).data;
      } catch {
        return null;
      }
    },
    createSurface(pixels, width, height) {
      try {
        const canvas = documentRoot.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context === null) return null;
        const data = context.createImageData(width, height);
        data.data.set(pixels);
        context.putImageData(data, 0, 0);
        return canvas;
      } catch {
        return null;
      }
    },
  };
}

type RasterRecord =
  | { readonly state: "LOADING"; readonly image: CanvasImageSource }
  | { readonly state: "READY"; readonly image: CanvasImageSource }
  | { readonly state: "FAILED" };

/**
 * Resolves CHIBI rasters by subject. Owner recolour runs once per asset,
 * density and owner colour through the checked-in mask and is cached; a
 * failed load or pixel readback falls back to the legacy asset rather than
 * ever showing the raw key colour.
 */
export function createChibiArtResolverV7(input: {
  readonly environment: ChibiRasterEnvironmentV7;
  readonly redraw: () => void;
  readonly registry?: ChibiArtRegistryV7;
}): ChibiBoardArtV7 {
  const registry =
    input.registry ?? buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
  const rasters = new Map<string, RasterRecord>();
  const maskPixels = new Map<string, Uint8ClampedArray>();
  const recoloured = new Map<string, CanvasImageSource>();
  // Row slices of a loaded raster, keyed by URL; null once readback failed.
  const slices = new Map<
    string,
    { cell: CanvasImageSource; overflow: CanvasImageSource } | null
  >();
  const slice = (
    url: string,
    image: CanvasImageSource,
    asset: ChibiArtAssetV7,
  ): { cell: CanvasImageSource; overflow: CanvasImageSource } | null => {
    const cached = slices.get(url);
    if (cached !== undefined) return cached;
    const { width, height } = asset;
    const up = chibiOverflowV7(asset).up;
    const pixels = input.environment.readPixels(image, width, height);
    const cell =
      pixels === null
        ? null
        : input.environment.createSurface(
            pixels.slice(up * width * 4),
            width,
            height - up,
          );
    const overflow =
      pixels === null
        ? null
        : input.environment.createSurface(
            pixels.slice(0, up * width * 4),
            width,
            up,
          );
    const result =
      cell === null || overflow === null ? null : { cell, overflow };
    slices.set(url, result);
    return result;
  };
  const raster = (url: string): RasterRecord => {
    const existing = rasters.get(url);
    if (existing !== undefined) return existing;
    const outcome: {
      settled: boolean | null;
      image: CanvasImageSource | null;
    } = { settled: null, image: null };
    const image = input.environment.loadImage(url, (ok) => {
      outcome.settled = ok;
      const loaded = outcome.image;
      // A synchronous settle is recorded below, after loadImage returns.
      if (loaded === null) return;
      rasters.set(
        url,
        ok ? { state: "READY", image: loaded } : { state: "FAILED" },
      );
      input.redraw();
    });
    outcome.image = image;
    // Synchronous environments may settle during loadImage itself.
    const record: RasterRecord =
      outcome.settled === null
        ? { state: "LOADING", image }
        : outcome.settled
          ? { state: "READY", image }
          : { state: "FAILED" };
    rasters.set(url, record);
    return record;
  };
  return {
    resolve(request) {
      const asset = chibiVariantV7(
        registry.variants(request.subject),
        request.at,
      );
      if (asset === null) return { kind: "MISSING" };
      const choice = chibiRasterForDeviceScale(asset, request.deviceScale);
      const source = raster(choice.url);
      if (source.state === "FAILED") return { kind: "MISSING" };
      if (source.state === "LOADING") return { kind: "LOADING" };
      const baseKey = `chibi:${asset.id}@${choice.density}`;
      // A masked piece without an owner (an improvement on a tile no city
      // owns) is recoloured to a neutral stone, never drawn in the raw key.
      const ownerColor =
        request.ownerColor ??
        (asset.ownerMaskUrl === undefined
          ? undefined
          : CHIBI_UNOWNED_OWNER_COLOUR_V7);
      const owner =
        ownerColor === undefined ? null : parseHexColourV7(ownerColor);
      if (asset.ownerMaskUrl === undefined || owner === null) {
        const layers =
          asset.layers === undefined || choice.density !== 1
            ? undefined
            : {
                ground: raster(asset.layers.groundUrl),
                body: raster(asset.layers.bodyUrl),
              };
        const loadedLayers =
          layers?.ground.state === "READY" && layers.body.state === "READY"
            ? { ground: layers.ground.image, body: layers.body.image }
            : undefined;
        const master =
          choice.smoothing &&
          choice.density === 1 &&
          asset.assetClass === "TALL_TERRAIN" &&
          chibiOverflowV7(asset).up > 0
            ? slice(choice.url, source.image, asset)
            : null;
        const body =
          master === null || loadedLayers === undefined
            ? null
            : slice(asset.layers?.bodyUrl ?? "", loadedLayers.body, asset);
        return {
          kind: "READY",
          asset,
          image: source.image,
          density: choice.density,
          smoothing: choice.smoothing,
          cacheKey: baseKey,
          ...(loadedLayers === undefined ? {} : { layers: loadedLayers }),
          ...(master === null
            ? {}
            : {
                parts: {
                  cell: master.cell,
                  overflow: master.overflow,
                  ...(body === null ? {} : { bodyCell: body.cell }),
                },
              }),
        };
      }
      const cacheKey = `${baseKey}#${ownerColor ?? ""}`;
      const cached = recoloured.get(cacheKey);
      if (cached !== undefined)
        return {
          kind: "READY",
          asset,
          image: cached,
          density: choice.density,
          smoothing: choice.smoothing,
          cacheKey,
        };
      const mask = raster(asset.ownerMaskUrl);
      if (mask.state === "FAILED") return { kind: "MISSING" };
      if (mask.state === "LOADING") return { kind: "LOADING" };
      let maskData = maskPixels.get(asset.ownerMaskUrl);
      if (maskData === undefined) {
        const read = input.environment.readPixels(
          mask.image,
          asset.width,
          asset.height,
        );
        if (read === null) return { kind: "MISSING" };
        maskData = read;
        maskPixels.set(asset.ownerMaskUrl, maskData);
      }
      const width = asset.width * choice.density;
      const height = asset.height * choice.density;
      const pixels = input.environment.readPixels(source.image, width, height);
      if (pixels === null) return { kind: "MISSING" };
      const surface = input.environment.createSurface(
        recolourOwnerPixelsV7({
          pixels,
          width,
          height,
          mask: maskData,
          maskWidth: asset.width,
          maskHeight: asset.height,
          owner,
        }),
        width,
        height,
      );
      if (surface === null) return { kind: "MISSING" };
      recoloured.set(cacheKey, surface);
      return {
        kind: "READY",
        asset,
        image: surface,
        density: choice.density,
        smoothing: choice.smoothing,
        cacheKey,
      };
    },
  };
}
