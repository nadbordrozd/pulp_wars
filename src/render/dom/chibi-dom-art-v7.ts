import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
  type ChibiArtRegistryV7,
  type ChibiPointV7,
} from "../../assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../assets/chibi-art-manifest";
import {
  browserChibiRasterEnvironmentV7,
  createChibiArtResolverV7,
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
} from "../canvas/chibi-art-resolver-v7";

/**
 * The DOM side of the CHIBI art set (bead pulp_wars-67q.11). Docks, action
 * tiles, technology cards, rewards and dialogs ask for an art subject; a
 * subject with a usable registered raster is drawn from it, anything else
 * keeps its legacy art, the same per-subject fallback as the canvas. Owned
 * rasters are recoloured through their checked-in mask with the same
 * resolver the board uses (a masked piece without an owner gets the neutral
 * stone grey, never the raw key colour), trimmed to their painted pixels and
 * handed to an <img> as a data URL.
 */

export interface ChibiDomBoxV7 {
  /** CSS px at the default root font size (the boxes are rem-sized). */
  readonly width: number;
  readonly height: number;
}

/** Nominal art boxes of the Ruleset 7 interface (see src/styles/v7.css). */
export const CHIBI_DOM_BOXES_V7 = {
  /** Selection dock identity: the 112 x 130 viewport scaled by 0.64. */
  dock: { width: 72, height: 82 },
  /** Technology cards and detail, unit and recruit dialog headers. */
  card: { width: 72, height: 72 },
  /** Action, command and train tiles. */
  action: { width: 48, height: 48 },
  /** Mandatory city-reward buttons. */
  reward: { width: 80, height: 80 },
  /** Leaderboard city count. */
  leaderboard: { width: 26, height: 26 },
} as const satisfies Readonly<Record<string, ChibiDomBoxV7>>;

/**
 * Whole and half steps only: masters are drawn 1:1 in 48 px tiles and 1.5x
 * in 72 px cards, which lands on whole device pixels on DPR 2 screens.
 * Art too large for its box at 1x is fitted smoothly instead.
 */
const CRISP_SCALES = [4, 3, 2.5, 2, 1.5, 1] as const;

export function chibiDomScaleV7(
  size: { readonly width: number; readonly height: number },
  box: ChibiDomBoxV7,
): number {
  for (const scale of CRISP_SCALES)
    if (size.width * scale <= box.width && size.height * scale <= box.height)
      return scale;
  return Math.min(box.width / size.width, box.height / size.height);
}

export type ChibiDomResolutionV7 =
  /** No usable raster: keep the legacy art. */
  | { readonly kind: "MISSING" }
  /** A raster or its mask is loading; the DOM redraws when it settles. */
  | { readonly kind: "LOADING"; readonly factionArt: boolean }
  | {
      readonly kind: "READY";
      readonly asset: ChibiArtAssetV7;
      /** Trimmed (and recoloured) art; a data URL or the master URL. */
      readonly url: string;
      /** Size of the painted pixels in master px. */
      readonly width: number;
      readonly height: number;
      /** A faction subject (for example Undead) drew its own raster. */
      readonly factionArt: boolean;
    };

export interface ChibiDomArtRequestV7 {
  readonly subject: ArtSubjectV7;
  readonly ownerColor?: string | undefined;
  /** Picks the cosmetic variant like the map does; defaults to (0, 0). */
  readonly at?: ChibiPointV7;
}

export interface ChibiDomArtV7 {
  resolve(request: ChibiDomArtRequestV7): ChibiDomResolutionV7;
}

export interface ChibiDomEnvironmentV7 extends ChibiRasterEnvironmentV7 {
  /** Encodes a surface from createSurface as an image URL, or null. */
  encode(surface: CanvasImageSource): string | null;
}

export function browserChibiDomEnvironmentV7(
  documentRoot: Document,
): ChibiDomEnvironmentV7 {
  return {
    ...browserChibiRasterEnvironmentV7(documentRoot),
    encode(surface) {
      try {
        return "toDataURL" in surface && typeof surface.toDataURL === "function"
          ? (surface as HTMLCanvasElement).toDataURL("image/png")
          : null;
      } catch {
        return null;
      }
    },
  };
}

interface TrimmedArt {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/** Bounds of the pixels with any opacity, or null for an empty raster. */
export function paintedBoundsV7(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if ((pixels[(y * width + x) * 4 + 3] ?? 0) > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return right < 0
    ? null
    : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function createChibiDomArtV7(input: {
  readonly environment: ChibiDomEnvironmentV7;
  /** Called when a raster settles; the view redraws. */
  readonly onChange: () => void;
  readonly registry?: ChibiArtRegistryV7;
  /**
   * Art resolved before `registry`, subject by subject (the new visual
   * direction's portraits, cities and improvements). A subject it does not
   * register, or whose raster failed to load, takes the registry's art, and
   * only then a faction subject's shared stand-in: an Undead portrait never
   * becomes the preferred Human one.
   */
  readonly preferred?: ChibiArtRegistryV7;
}): ChibiDomArtV7 {
  const standard = createChibiArtResolverV7({
    environment: input.environment,
    redraw: input.onChange,
    registry:
      input.registry ?? buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry,
  });
  const preferred =
    input.preferred === undefined
      ? null
      : createChibiArtResolverV7({
          environment: input.environment,
          redraw: input.onChange,
          registry: input.preferred,
        });
  const art: ChibiBoardArtV7 =
    preferred === null
      ? standard
      : {
          resolve(request) {
            const first = preferred.resolve(request);
            return first.kind === "MISSING" ? standard.resolve(request) : first;
          },
        };
  const trimmed = new Map<string, TrimmedArt | null>();
  const trim = (
    asset: ChibiArtAssetV7,
    image: CanvasImageSource,
    cacheKey: string,
    recoloured: boolean,
  ): TrimmedArt | null => {
    const cached = trimmed.get(cacheKey);
    if (cached !== undefined) return cached;
    const pixels = input.environment.readPixels(
      image,
      asset.width,
      asset.height,
    );
    let result: TrimmedArt | null;
    if (pixels === null)
      // An untouched master still shows untrimmed; a recolour never does.
      result = recoloured
        ? null
        : { url: asset.url, width: asset.width, height: asset.height };
    else {
      const bounds = paintedBoundsV7(pixels, asset.width, asset.height);
      if (bounds === null) result = null;
      else {
        const cropped = new Uint8ClampedArray(bounds.width * bounds.height * 4);
        for (let y = 0; y < bounds.height; y += 1) {
          const from = ((bounds.top + y) * asset.width + bounds.left) * 4;
          cropped.set(
            pixels.subarray(from, from + bounds.width * 4),
            y * bounds.width * 4,
          );
        }
        const surface = input.environment.createSurface(
          cropped,
          bounds.width,
          bounds.height,
        );
        const url = surface === null ? null : input.environment.encode(surface);
        result =
          url === null
            ? recoloured
              ? null
              : { url: asset.url, width: asset.width, height: asset.height }
            : { url, width: bounds.width, height: bounds.height };
      }
    }
    trimmed.set(cacheKey, result);
    return result;
  };
  return {
    resolve(request) {
      const { resolution, factionArt } = resolveChibiWithFallbackV7(art, {
        subject: request.subject,
        at: request.at ?? { x: 0, y: 0 },
        ownerColor: request.ownerColor,
        // DOM art uses the DPR 1 master; the browser scales it.
        deviceScale: 1,
      });
      if (resolution.kind === "MISSING") return resolution;
      if (resolution.kind === "LOADING") return { kind: "LOADING", factionArt };
      const result = trim(
        resolution.asset,
        resolution.image,
        resolution.cacheKey,
        resolution.asset.ownerMaskUrl !== undefined,
      );
      return result === null
        ? { kind: "MISSING" }
        : {
            kind: "READY",
            asset: resolution.asset,
            factionArt,
            ...result,
          };
    },
  };
}

/**
 * The <img> for a READY resolution, sized to a crisp scale for its box, or
 * an empty placeholder of the box size while the raster loads.
 */
export function chibiDomImageV7(
  documentRoot: Document,
  resolution: Exclude<ChibiDomResolutionV7, { readonly kind: "MISSING" }>,
  box: ChibiDomBoxV7,
  subject: ArtSubjectV7,
): HTMLImageElement {
  const image = documentRoot.createElement("img");
  image.className = "v7-art-frame v7-chibi-art";
  image.alt = "";
  image.dataset.artSet = "chibi";
  image.dataset.chibiSubject = subject;
  const rem = (px: number): string => `${Number((px / 16).toFixed(4))}rem`;
  if (resolution.kind === "LOADING") {
    image.dataset.chibiState = "loading";
    image.style.width = rem(box.width);
    image.style.height = rem(box.height);
    return image;
  }
  const scale = chibiDomScaleV7(resolution, box);
  image.src = resolution.url;
  image.dataset.chibiAssetId = resolution.asset.id;
  image.dataset.chibiScale = String(Number(scale.toFixed(3)));
  // Upscales stay pixel-crisp; a fitted downscale is smoothed instead.
  if (scale < 1) image.dataset.chibiSmooth = "true";
  image.style.width = rem(resolution.width * scale);
  image.style.height = rem(resolution.height * scale);
  return image;
}
