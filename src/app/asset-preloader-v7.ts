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
 *
 * Every preload of one preloader shares its lanes (bead pulp_wars-2yc.42):
 * the start's, the background's (the faction tiers) and a board's wait for
 * its factions. A file asked for twice is fetched once, and an `urgent`
 * preload is started ahead of everything still waiting for a lane.
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
  /**
   * The longest the files after a preload's `front` wait for it; then they
   * start whatever of the front is still in flight.
   */
  readonly frontHoldMs?: number;
  /** Receives the one failure report of a preload. */
  readonly warn?: (message: string) => void;
  readonly setTimer?: (callback: () => void, ms: number) => unknown;
  readonly clearTimer?: (timer: unknown) => void;
}

export interface AssetPreloadCallOptionsV7 {
  /**
   * The first `front` URLs load alone: no later file starts until they
   * have all settled (or the hold runs out). Many files in flight share
   * the link evenly, so without this a large early file (the title scene's
   * backdrop) would finish among the last.
   */
  readonly front?: number;
  /**
   * Something on screen waits for these files (a board about to be drawn):
   * they take the next free lanes, ahead of files a background preload
   * has queued.
   */
  readonly urgent?: boolean;
}

export interface AssetPreloaderV7 {
  preload(
    urls: readonly string[],
    onProgress?: (progress: AssetPreloadProgressV7) => void,
    options?: AssetPreloadCallOptionsV7,
  ): Promise<AssetPreloadResultV7>;
  /** True when every URL is in the store: nothing to wait for. */
  covers(urls: readonly string[]): boolean;
  /**
   * True when no URL is left to wait for: each is in the store or has
   * failed (after its retry; it then loads on demand). A preloader without
   * it (a test's) is asked `covers`.
   */
  settled?(urls: readonly string[]): boolean;
}

/**
 * The files are small (2.6 kB on average), so each lane spends most of its
 * time waiting for a round trip, not receiving bytes: the first load is as
 * fast as the link only when enough files are in flight to keep it busy.
 * At 24 a throttled link stood two thirds idle (pulp_wars-2yc.11: 111 kB/s
 * asked of a 180 kB/s "Fast 3G" link, 380 kB/s of a 1 MB/s "Fast 4G" one);
 * 64 fills both and stays under the 100 streams an HTTP/2 host allows on
 * one connection, with room for the sounds and fonts. HTTP/1.1 still caps
 * itself at the browser's six connections.
 */
export const ASSET_PRELOAD_CONCURRENCY_V7 = 64;
export const ASSET_PRELOAD_ASSET_TIMEOUT_MS_V7 = 15_000;
export const ASSET_PRELOAD_BUDGET_MS_V7 = 30_000;
/**
 * A front that has not settled by now no longer holds the rest back: one
 * stuck file must not cost the whole preload its budget. The title scene
 * needs about 4 s on "Fast 3G" and 13 s on "Slow 3G".
 */
export const ASSET_PRELOAD_FRONT_HOLD_MS_V7 = 12_000;

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
  const frontHoldMs = options.frontHoldMs ?? ASSET_PRELOAD_FRONT_HOLD_MS_V7;
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

  // One queue for every preload of this preloader. A file is in `jobs`
  // from the moment it is asked for until it has settled; `waiting` holds
  // those without a lane yet, the urgent ones first.
  const jobs = new Map<string, Promise<boolean>>();
  const starters = new Map<string, () => void>();
  const waiting: string[] = [];
  const failures = new Set<string>();
  let urgentWaiting = 0;
  let flying = 0;
  /** Starts files until the lanes are full or nothing waits. */
  const pump = (): void => {
    while (flying < concurrency) {
      const url = waiting.shift();
      if (url === undefined) return;
      if (urgentWaiting > 0) urgentWaiting -= 1;
      const start = starters.get(url);
      starters.delete(url);
      flying += 1;
      start?.();
    }
  };
  /** The one fetch of a file, shared by every preload that names it. */
  const request = (url: string, urgent: boolean): Promise<boolean> => {
    const known = jobs.get(url);
    if (known !== undefined) {
      // Still waiting for a lane: an urgent caller moves it forward.
      const index = urgent && starters.has(url) ? waiting.indexOf(url) : -1;
      if (index >= urgentWaiting) {
        waiting.splice(index, 1);
        waiting.splice(urgentWaiting, 0, url);
        urgentWaiting += 1;
      }
      return known;
    }
    const job = new Promise<boolean>((resolve) => {
      starters.set(url, () => {
        void fetchOne(url).then((ok) => {
          flying -= 1;
          jobs.delete(url);
          if (ok) failures.delete(url);
          else failures.add(url);
          resolve(ok);
          pump();
        });
      });
    });
    jobs.set(url, job);
    if (urgent) {
      waiting.splice(urgentWaiting, 0, url);
      urgentWaiting += 1;
    } else waiting.push(url);
    return job;
  };

  return {
    covers(urls) {
      return urls.every((url) => store.has(url));
    },
    settled(urls) {
      return urls.every((url) => store.has(url) || failures.has(url));
    },
    preload(urls, onProgress, call = {}) {
      const distinct = [...new Set(urls)];
      const ahead = new Set(
        distinct.slice(0, Math.max(0, Math.floor(call.front ?? 0))),
      );
      const queue = distinct.filter((url) => !store.has(url));
      const total = queue.length;
      const front = queue.filter((url) => ahead.has(url));
      const rest = queue.filter((url) => !ahead.has(url));
      const urgent = call.urgent === true;
      const failed: string[] = [];
      let settled = 0;
      let resolved = false;
      // The rest waits for the front, when there is one and a rest.
      let held = front.length > 0 && rest.length > 0;
      return new Promise<AssetPreloadResultV7>((resolve) => {
        const finish = (): void => {
          if (resolved) return;
          resolved = true;
          clearTimer(budget);
          if (hold !== undefined) clearTimer(hold);
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
        /** Asks for files; each reports here when it has settled. */
        const ask = (list: readonly string[]): void => {
          for (const url of list)
            void request(url, urgent).then((ok) => {
              if (!ok) failed.push(url);
              settled += 1;
              if (!resolved) onProgress?.({ settled, total });
              if (settled === total) {
                finish();
                return;
              }
              // Only the front was asked for while it held the rest.
              if (held && settled >= front.length) release();
            });
          pump();
        };
        const release = (): void => {
          if (!held) return;
          held = false;
          ask(rest);
        };
        const hold = held ? setTimer(release, frontHoldMs) : undefined;
        onProgress?.({ settled, total });
        if (total === 0) finish();
        ask(held ? front : queue);
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
