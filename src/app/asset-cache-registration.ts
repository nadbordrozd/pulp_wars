import {
  ASSET_CACHE_RETIRE_MESSAGE_V1,
  ASSET_CACHE_WARM_MESSAGE_V1,
} from "../service-worker/asset-cache-worker";
import {
  ASSET_CACHE_ESCAPE_PARAMETER_V1,
  ASSET_CACHE_PREFIX_V1,
  ASSET_CACHE_WORKER_FILE_V1,
} from "../service-worker/asset-manifest";

/**
 * The page's side of the asset cache (bead pulp_wars-2yc.11): registers the
 * service worker of a deployed build and, on a visit the worker did not
 * serve from its first request, tells it which files the page loaded so it
 * can keep them (src/service-worker/asset-cache-worker.ts).
 *
 * It also takes the worker away again. A build made with the switch off
 * (`ASSET_CACHE_WORKER_ENABLED_V1`) unregisters any worker it finds and
 * deletes its caches, and so does any page loaded with `?no-cache-worker=1`,
 * for that browser.
 *
 * The development server and the tests run without a worker: every file
 * there comes from the server as it always did.
 */

/** What the page reads of a registration. */
export interface AssetCacheWorkerRegistrationV1 {
  readonly active?: { postMessage(message: unknown): void } | null;
  unregister(): Promise<boolean>;
}

/** What the registration reads of the browser; a test passes its own. */
export interface AssetCacheBrowserV1 {
  /** `navigator.serviceWorker`; absent where workers are unavailable. */
  readonly serviceWorker?:
    | {
        readonly controller: unknown;
        readonly ready: Promise<AssetCacheWorkerRegistrationV1>;
        register(url: string, options: { scope: string }): Promise<unknown>;
        /** The registration whose scope covers the URL, if any. */
        getRegistration(
          url: string,
        ): Promise<AssetCacheWorkerRegistrationV1 | undefined>;
      }
    | undefined;
  /** `caches`; absent where there is no cache storage. */
  readonly caches?:
    | {
        keys(): Promise<readonly string[]>;
        delete(name: string): Promise<boolean>;
      }
    | undefined;
  /** `performance`: the files this page has loaded. */
  readonly performance?:
    | {
        setResourceTimingBufferSize?(size: number): void;
        getEntriesByType(type: string): readonly { readonly name: string }[];
      }
    | undefined;
  /** `location.href`. */
  readonly href: string;
}

export interface AssetCacheRegistrationV1 {
  /** True when a worker was registered for this page. */
  readonly registered: boolean;
  /**
   * Settles when this page has finished taking the worker away (the switch
   * is off, or the escape was asked for): true when a registration or a
   * cache was removed. False at once when the page takes nothing away.
   */
  readonly removed: Promise<boolean>;
  /**
   * Called once the page's start has loaded its files: asks the worker to
   * keep those it did not see. Resolves to the number of files named.
   */
  pageLoaded(): Promise<number>;
}

/** More than the files of any look, so the list of loaded files is whole. */
const RESOURCE_BUFFER_SIZE = 4_000;

/** True when the page's address asks for the worker to be removed. */
export function assetCacheEscapeRequestedV1(href: string): boolean {
  try {
    return (
      new URL(href).searchParams.get(ASSET_CACHE_ESCAPE_PARAMETER_V1) === "1"
    );
  } catch {
    return false;
  }
}

/**
 * Unregisters the site's worker and deletes its caches in this browser.
 * A worker still serving this page is told to stop first, so it keeps
 * nothing more. Never throws; true when something was removed.
 */
export async function removeAssetCacheV1(
  browser: AssetCacheBrowserV1,
  base: string,
): Promise<boolean> {
  let removed = false;
  try {
    const registration = await browser.serviceWorker?.getRegistration(base);
    if (registration !== undefined) {
      try {
        registration.active?.postMessage({
          type: ASSET_CACHE_RETIRE_MESSAGE_V1,
        });
      } catch {
        // A worker that cannot be told is still unregistered below.
      }
      if (await registration.unregister()) removed = true;
    }
  } catch {
    // No worker support, or blocked: there is nothing registered to remove.
  }
  try {
    const caches = browser.caches;
    if (caches !== undefined)
      for (const name of await caches.keys())
        if (
          name.startsWith(ASSET_CACHE_PREFIX_V1) &&
          (await caches.delete(name))
        )
          removed = true;
  } catch {
    // Storage that cannot be read holds nothing the page could be served.
  }
  return removed;
}

export function startAssetCacheV1(options: {
  /** False under the development server: no worker there, none removed. */
  readonly deployed: boolean;
  /** The build's switch (`ASSET_CACHE_WORKER_ENABLED_V1`). */
  readonly workerEnabled: boolean;
  /** The site's base path, with its trailing slash. */
  readonly base: string;
  readonly browser: AssetCacheBrowserV1;
}): AssetCacheRegistrationV1 {
  const none: AssetCacheRegistrationV1 = {
    registered: false,
    removed: Promise.resolve(false),
    pageLoaded: () => Promise.resolve(0),
  };
  const { browser, base } = options;
  if (!options.deployed) return none;
  // The switch is off, or this visitor asked to be rid of the worker:
  // nothing is registered, and what is there is taken away.
  if (!options.workerEnabled || assetCacheEscapeRequestedV1(browser.href)) {
    const removed = removeAssetCacheV1(browser, base);
    return {
      registered: false,
      removed,
      // Once more when the page has loaded: a worker of an older version
      // may have kept files of this very load after the first sweep.
      async pageLoaded() {
        await removed;
        await removeAssetCacheV1(browser, base);
        return 0;
      },
    };
  }

  let container: AssetCacheBrowserV1["serviceWorker"];
  try {
    // Reading the container throws where storage is blocked.
    container = browser.serviceWorker;
  } catch {
    return none;
  }
  if (container === undefined) return none;
  // A page the worker already controls had every file through it. The
  // first visit (and a forced reload) loads some or all files past it.
  const controlledFromStart = container.controller != null;
  if (!controlledFromStart) {
    try {
      browser.performance?.setResourceTimingBufferSize?.(RESOURCE_BUFFER_SIZE);
    } catch {
      // The default buffer then names the first files only.
    }
  }
  try {
    // A failed registration leaves the page as it was without a worker.
    container
      .register(`${base}${ASSET_CACHE_WORKER_FILE_V1}`, { scope: base })
      .catch(() => undefined);
  } catch {
    return none;
  }
  return {
    registered: true,
    removed: Promise.resolve(false),
    async pageLoaded() {
      if (controlledFromStart) return 0;
      try {
        const origin = new URL(browser.href).origin;
        const scope = new URL(base, browser.href).href;
        const urls = [
          browser.href,
          ...(browser.performance?.getEntriesByType("resource") ?? []).map(
            (entry) => entry.name,
          ),
        ].filter(
          (url) => url.startsWith(scope) && new URL(url).origin === origin,
        );
        const registration = await container.ready;
        const active = registration.active ?? null;
        active?.postMessage({
          type: ASSET_CACHE_WARM_MESSAGE_V1,
          urls: [...new Set(urls)],
        });
        return active === null ? 0 : new Set(urls).size;
      } catch {
        return 0;
      }
    },
  };
}
