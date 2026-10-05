import {
  preloadedRasterV7,
  storePreloadedRasterV7,
} from "../render/canvas/preloaded-rasters-v7";

/**
 * The asset preloader (bead pulp_wars-2yc.6): fetches and decodes a list of
 * rasters, a bounded number at a time, and hands each to a store the board
 * and interface loaders read (src/render/canvas/preloaded-rasters-v7.ts).
 * The inventory of a look comes from src/assets/asset-inventory-v7.ts.
 *
 * A raster that fails (after one retry) or outlasts its timeout never holds
 * the game back: it is reported once, left out of the store, and the piece
 * that needs it loads it on demand with its usual fallback. The whole
 * preload also has a time budget; rasters still in flight when it runs out
 * keep loading and reach the store when they arrive.
 */

export interface AssetPreloadProgressV7 {
  /** Rasters settled so far, loaded or failed. */
  readonly settled: number;
  readonly total: number;
}

export interface AssetPreloadResultV7 {
  /** Distinct rasters asked for that were not already in the store. */
  readonly total: number;
  readonly loaded: number;
  readonly failed: readonly string[];
  /** Rasters still loading when the time budget ran out. */
  readonly unfinished: number;
}

/** Fetches and decodes one raster; rejects when it cannot be shown. */
export type RasterLoaderV7<Raster> = (url: string) => Promise<Raster>;

export interface RasterStoreV7<Raster> {
  has(url: string): boolean;
  set(url: string, raster: Raster): void;
}

export interface AssetPreloaderOptionsV7<Raster> {
  readonly load: RasterLoaderV7<Raster>;
  readonly store: RasterStoreV7<Raster>;
  /** Rasters in flight at once. */
  readonly concurrency?: number;
  /** A raster slower than this counts as failed. */
  readonly assetTimeoutMs?: number;
  /** `preload` resolves after this long whatever is still in flight. */
  readonly budgetMs?: number;
  /** Receives the one failure report of a preload. */
  readonly warn?: (message: string) => void;
  readonly setTimer?: (callback: () => void, ms: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
}

export interface AssetPreloaderV7 {
  preload(
    urls: readonly string[],
    onProgress?: (progress: AssetPreloadProgressV7) => void,
  ): Promise<AssetPreloadResultV7>;
  /** True when every URL is in the store: nothing to wait for. */
  covers(urls: readonly string[]): boolean;
}

/**
 * The files are small (2 kB on average), so a preload is bound by round
 * trips, not bytes: 24 in flight uses an HTTP/2 connection well, and
 * HTTP/1.1 still caps itself at the browser's six connections.
 */
export const ASSET_PRELOAD_CONCURRENCY_V7 = 24;
export const ASSET_PRELOAD_ASSET_TIMEOUT_MS_V7 = 15_000;
export const ASSET_PRELOAD_BUDGET_MS_V7 = 30_000;

export function createAssetPreloaderV7<Raster>(
  options: AssetPreloaderOptionsV7<Raster>,
): AssetPreloaderV7 {
  const { load, store } = options;
  const concurrency = Math.max(
    1,
    Math.floor(options.concurrency ?? ASSET_PRELOAD_CONCURRENCY_V7),
  );
  const assetTimeoutMs =
    options.assetTimeoutMs ?? ASSET_PRELOAD_ASSET_TIMEOUT_MS_V7;
  const budgetMs = options.budgetMs ?? ASSET_PRELOAD_BUDGET_MS_V7;
  const warn =
    options.warn ?? ((message: string): void => console.warn(message));
  const setTimer =
    options.setTimer ??
    ((callback: () => void, ms: number): unknown =>
      globalThis.setTimeout(callback, ms));
  const clearTimer =
    options.clearTimer ??
    ((timer: unknown): void =>
      globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>));

  /** One raster: a second attempt after a failure, a timeout on each. */
  const fetchOne = async (url: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const outcome = await new Promise<Raster | null>((resolve) => {
        let done = false;
        const finish = (raster: Raster | null): void => {
          if (done) return;
          done = true;
          clearTimer(timer);
          resolve(raster);
        };
        const timer = setTimer(() => finish(null), assetTimeoutMs);
        let pending: Promise<Raster>;
        try {
          pending = load(url);
        } catch {
          finish(null);
          return;
        }
        pending.then(finish, () => finish(null));
      });
      if (outcome !== null) {
        store.set(url, outcome);
        return true;
      }
    }
    return false;
  };

  return {
    covers(urls) {
      return urls.every((url) => store.has(url));
    },
    preload(urls, onProgress) {
      const queue = [...new Set(urls)].filter((url) => !store.has(url));
      const total = queue.length;
      const failed: string[] = [];
      let settled = 0;
      let next = 0;
      let resolved = false;
      return new Promise<AssetPreloadResultV7>((resolve) => {
        const finish = (): void => {
          if (resolved) return;
          resolved = true;
          clearTimer(budget);
          if (failed.length > 0)
            warn(
              `Asset preload: ${failed.length} of ${total} images failed and load on demand: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? ", ..." : ""}`,
            );
          resolve({
            total,
            loaded: settled - failed.length,
            failed: [...failed],
            unfinished: total - settled,
          });
        };
        const budget = setTimer(finish, budgetMs);
        const pump = (): void => {
          const url = queue[next];
          if (url === undefined) return;
          next += 1;
          void fetchOne(url).then((ok) => {
            if (!ok) failed.push(url);
            settled += 1;
            if (!resolved) onProgress?.({ settled, total });
            if (settled === total) finish();
            else pump();
          });
        };
        onProgress?.({ settled, total });
        if (total === 0) finish();
        for (let lane = 0; lane < Math.min(concurrency, total); lane += 1)
          pump();
      });
    },
  };
}

/**
 * The browser's loader: an image element whose file is fetched and decoded
 * off the main thread before it is handed over, so drawing it the first
 * time costs no decode.
 */
export function browserRasterLoaderV7(
  documentRoot: Document,
): RasterLoaderV7<HTMLImageElement> {
  return (url) => {
    const image = documentRoot.createElement("img");
    image.decoding = "async";
    image.src = url;
    if (typeof image.decode === "function")
      return image.decode().then(() => image);
    return new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () =>
        reject(new Error(`Image failed: ${url}`)),
      );
    });
  };
}

/** The page's preloader, filling the store the board and interface read. */
export function browserAssetPreloaderV7(
  documentRoot: Document,
  options: Partial<AssetPreloaderOptionsV7<HTMLImageElement>> = {},
): AssetPreloaderV7 {
  return createAssetPreloaderV7({
    load: browserRasterLoaderV7(documentRoot),
    store: {
      has: (url) => preloadedRasterV7(url) !== null,
      set: storePreloadedRasterV7,
    },
    ...options,
  });
}
