import { BOARD_CLASSIC_LOOK_STORAGE_KEY_V7 } from "../../src/app/board-visual-direction-v7";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import type { StorageAdapter } from "../../src/persistence/index";
import type {
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";

/**
 * Board art for renderer tests that need pieces drawn (bead
 * pulp_wars-67q.15: Ruleset 7 has one art set, and a board drawn without
 * art shows code-drawn stand-ins). Every subject is ready at once, as an
 * image whose `id` is the subject (with the asset's size), so a recording
 * context can name it.
 * Forests and Mountains are tall terrain with their two layers (images
 * `ground:<subject>` and `body:<subject>`).
 */
export function readyBoardArtV7(
  options: {
    /** Subjects reported as having no raster (drawn as stand-ins). */
    readonly missing?: (subject: ArtSubjectV7) => boolean;
  } = {},
): ChibiBoardArtV7 {
  const assets = new Map<ArtSubjectV7, ChibiArtAssetV7>();
  const images = new Map<ArtSubjectV7, CanvasImageSource>();
  return {
    resolve(request): ChibiResolutionV7 {
      if (options.missing?.(request.subject) === true)
        return { kind: "MISSING" };
      let asset = assets.get(request.subject);
      if (asset === undefined) {
        asset = boardArtAssetV7(request.subject);
        assets.set(request.subject, asset);
        images.set(request.subject, {
          id: request.subject,
          width: asset.width,
          height: asset.height,
        } as unknown as CanvasImageSource);
      }
      return {
        kind: "READY",
        asset,
        image: images.get(request.subject) as CanvasImageSource,
        density: 1,
        smoothing: false,
        cacheKey: `fixture:${request.subject}:${request.ownerColor ?? ""}`,
        ...(asset.assetClass === "TALL_TERRAIN"
          ? {
              layers: {
                ground: {
                  id: `ground:${request.subject}`,
                } as unknown as CanvasImageSource,
                body: {
                  id: `body:${request.subject}`,
                } as unknown as CanvasImageSource,
              },
            }
          : {}),
      };
    },
  };
}

/** A master-sized fixture asset of the subject's class. */
export function boardArtAssetV7(subject: ArtSubjectV7): ChibiArtAssetV7 {
  const kind = subject.split(":")[0] ?? "";
  const [assetClass, width, height] = (
    kind === "UNIT"
      ? ["STANDARD_UNIT", 64, 64]
      : kind === "CITY" || kind === "SITE"
        ? ["SETTLEMENT", 96, 96]
        : kind === "TERRAIN"
          ? /FOREST|MOUNTAIN/.test(subject)
            ? ["TALL_TERRAIN", 80, 104]
            : ["TERRAIN", 80, 80]
          : kind === "RESOURCE"
            ? ["RESOURCE", 80, 80]
            : kind === "PORTRAIT"
              ? ["PORTRAIT", 48, 48]
              : kind === "ICON" || kind === "STATUS"
                ? ["ICON", 32, 32]
                : ["BUILDING", 80, 80]
  ) as [ChibiArtAssetV7["assetClass"], number, number];
  return {
    id: `fixture-${subject}`,
    subject,
    assetClass,
    width,
    height,
    url: `/fixture/${subject}.png`,
  };
}

/** Settings storage of a browser that chose "Classic look (previous art)". */
export function classicLookStorageV7(): StorageAdapter {
  const values = new Map<string, string>([
    [BOARD_CLASSIC_LOOK_STORAGE_KEY_V7, '{"classic":true}'],
  ]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}
