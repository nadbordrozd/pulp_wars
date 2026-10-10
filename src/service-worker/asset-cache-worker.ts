import {
  ASSET_CACHE_PREFIX_V1,
  ASSET_MANIFEST_FILE_V1,
  assetCacheKeyV1,
  parseAssetManifestV1,
  type AssetManifestV1,
} from "./asset-manifest";

/**
 * The asset cache of the service worker (bead pulp_wars-2yc.11).
 *
 * The site is about a thousand small files on a host whose cache lifetime
 * is ten minutes: a return visit revalidated every one of them, a round
 * trip each, which on a slow link took as long as the first visit. The
 * worker keeps the files in a cache of its own and answers from it, so a
 * return visit costs one request (the manifest) and the game also starts
 * with no network at all.
 *
 * Nothing stale is ever served after a deploy:
 *
 * - Every page load fetches the page itself and the build's manifest from
 *   the network (never from a cache). The page is the network's copy
 *   whenever the network answers; the manifest lists each file with the
 *   hash of its bytes.
 * - A cache entry is one version of one file: its key holds the hash. A
 *   file is answered from the cache only under the hash the manifest names.
 * - A file fetched from the network is kept only when its bytes hash to the
 *   manifest's value, so a copy from the browser's HTTP cache, or from a
 *   host still serving the previous deploy, is passed on but never kept.
 * - Entries the manifest no longer names are deleted, so a deploy that
 *   changes ten files downloads ten files.
 *
 * The worker's own code holds no file list and no version: it changes only
 * when this logic does. Without a network the last manifest stands, which
 * is the build the cache holds.
 *
 * It can be turned off from the host: a manifest that says `"worker":
 * "off"`, one this code cannot read, or none at all (404) makes the worker
 * delete its caches, unregister and leave every request to the browser. A
 * fault while answering a request hands that request to the network.
 */

/** The cache. The suffix changes if the entry format ever does. */
export const ASSET_CACHE_NAME_V1 = "pulp-wars-assets-v1";
const CACHE_PREFIX = ASSET_CACHE_PREFIX_V1;
/** Where the last manifest is kept; never a file's key (no hash query). */
const STORED_MANIFEST = "?stored-asset-manifest";
/**
 * The page's message telling the worker to turn itself off (the build's
 * switch is off, or the visitor asked with `?no-cache-worker=1`).
 */
export const ASSET_CACHE_RETIRE_MESSAGE_V1 = "pulp-wars-asset-cache-retire";
/** The page's message asking the worker to fill its cache. */
export const ASSET_CACHE_WARM_MESSAGE_V1 = "pulp-wars-asset-cache-warm";
const WARM_LANES = 6;

/** The part of `Cache` the worker uses. */
export interface AssetCacheStoreV1 {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
  keys(): Promise<readonly { readonly url: string }[]>;
}

/** The part of `CacheStorage` the worker uses. */
export interface AssetCacheStorageV1 {
  open(name: string): Promise<AssetCacheStoreV1>;
  keys(): Promise<readonly string[]>;
  delete(name: string): Promise<boolean>;
}

export interface AssetCacheEnvironmentV1 {
  /** The worker's scope: the site's base, with its trailing slash. */
  readonly scope: string;
  readonly caches: AssetCacheStorageV1;
  fetch(
    url: string,
    init: { cache: RequestCache; signal?: AbortSignal },
  ): Promise<Response>;
  /** Lower-case hexadecimal SHA-256 of the bytes. */
  digest(bytes: ArrayBuffer): Promise<string>;
  /** Removes the worker's registration (`registration.unregister()`). */
  unregister(): Promise<unknown>;
}

/** What the worker reads of a request. */
export interface AssetRequestV1 {
  readonly method: string;
  readonly url: string;
  readonly mode: string;
  readonly headers: { get(name: string): string | null };
  /**
   * Aborted when the page gives the request up (a theme it no longer
   * plays): the worker then stops the download too and keeps nothing.
   */
  readonly signal?: AbortSignal;
}

export interface AssetCacheWorkerV1 {
  /** Takes over: drops caches of other formats, reads the manifest. */
  activate(): Promise<void>;
  /**
   * The answer to a request, or null when the request is not the worker's
   * (another origin, not a GET, a byte range, a file the manifest cannot
   * name): the browser then handles it as if there were no worker.
   * `network` performs the original request untouched.
   */
  respond(
    request: AssetRequestV1,
    network: () => Promise<Response>,
  ): Promise<Response> | null;
  /** Fetches and keeps those of `urls` the cache lacks; returns how many. */
  warm(urls: readonly string[]): Promise<number>;
  /** Background work in flight (purges); the worker stays alive for it. */
  idle(): Promise<void>;
  /** True once the worker was turned off: it answers nothing. */
  retired(): boolean;
  /**
   * Turns the worker off: its caches are deleted, its registration is
   * removed and every request from now on is the browser's.
   */
  retire(): Promise<void>;
}

export function createAssetCacheWorkerV1(
  environment: AssetCacheEnvironmentV1,
): AssetCacheWorkerV1 {
  const { scope, caches } = environment;
  const origin = new URL(scope).origin;
  const scopePath = new URL(scope).pathname;
  const manifestUrl = `${scope}${ASSET_MANIFEST_FILE_V1}`;

  /** The host turned the worker off; nothing is answered from here on. */
  let retired = false;
  /** The manifest in force; null until one was stored or fetched. */
  let current: AssetManifestV1 | null = null;
  let loading: Promise<AssetManifestV1 | null> | null = null;
  let background: Promise<unknown> = Promise.resolve();
  const inBackground = (work: Promise<unknown>): void => {
    background = Promise.allSettled([background, work]);
  };

  /** The cache; none once retired, so nothing is kept after the switch. */
  const open = async (): Promise<AssetCacheStoreV1> => {
    if (retired) throw new Error("Asset cache: retired");
    return caches.open(ASSET_CACHE_NAME_V1);
  };

  /** Deletes every entry the manifest does not name. */
  const purge = async (manifest: AssetManifestV1): Promise<void> => {
    const keep = new Set<string>([`${scope}${STORED_MANIFEST}`]);
    for (const [path, hash] of Object.entries(manifest.files))
      keep.add(assetCacheKeyV1(scope, path, hash));
    const cache = await open();
    for (const { url } of await cache.keys())
      if (!keep.has(url)) await cache.delete(url);
  };

  const adopt = async (manifest: AssetManifestV1): Promise<void> => {
    const changed = current?.build !== manifest.build;
    current = manifest;
    if (!changed) return;
    try {
      const cache = await open();
      await cache.put(
        `${scope}${STORED_MANIFEST}`,
        new Response(JSON.stringify(manifest), {
          headers: { "content-type": "application/json" },
        }),
      );
    } catch {
      // No storage: the manifest stands for this worker's lifetime.
    }
    inBackground(purge(manifest).catch(() => undefined));
  };

  /**
   * The kill switch: the caches go, the registration goes, and every
   * request from now on is the browser's. A worker the browser starts
   * again before its pages have closed reads the manifest and retires
   * again.
   */
  const retire = async (): Promise<void> => {
    retired = true;
    current = null;
    try {
      for (const name of await caches.keys())
        if (name.startsWith(CACHE_PREFIX)) await caches.delete(name);
    } catch {
      // Storage that cannot be read holds nothing to serve either.
    }
    try {
      await environment.unregister();
    } catch {
      // Still retired for this worker's lifetime.
    }
  };

  /**
   * The build's manifest, from the network and no cache. Null when the
   * host turned the worker off: the manifest says so, is not one this code
   * reads, or is gone. Throws when the network gave no answer to judge by
   * (offline, a server error): the worker then carries on as it was.
   */
  const refresh = async (): Promise<AssetManifestV1 | null> => {
    if (retired) return null;
    const response = await environment.fetch(manifestUrl, {
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 410) {
      await retire();
      return null;
    }
    if (response.status !== 200)
      throw new Error(`Asset manifest: HTTP ${response.status}`);
    let manifest: AssetManifestV1 | null;
    try {
      manifest = parseAssetManifestV1(await response.json());
    } catch {
      manifest = null;
    }
    if (manifest === null || manifest.worker !== "on") {
      await retire();
      return null;
    }
    await adopt(manifest);
    return manifest;
  };

  const stored = async (): Promise<AssetManifestV1 | null> => {
    try {
      const response = await (await open()).match(`${scope}${STORED_MANIFEST}`);
      if (response === undefined) return null;
      return parseAssetManifestV1(await response.json());
    } catch {
      return null;
    }
  };

  /**
   * The manifest in force: this worker's, else the stored one (the worker
   * was restarted), else a fresh one (the first visit). Null when there is
   * none to be had; the next request tries again.
   */
  const manifest = (): Promise<AssetManifestV1 | null> => {
    if (retired) return Promise.resolve(null);
    if (current !== null) return Promise.resolve(current);
    loading ??= (async () => {
      const kept = await stored();
      if (retired) return null;
      if (kept !== null) {
        current ??= kept;
        return current;
      }
      return refresh().catch(() => null);
    })().finally(() => {
      loading = null;
    });
    return loading;
  };

  /** A response of exactly these bytes; the type is all a page reads. */
  const responseOf = (bytes: ArrayBuffer, type: string | null): Response =>
    new Response(bytes, {
      status: 200,
      headers: type === null ? {} : { "content-type": type },
    });

  /** One file under the hash the manifest names for it. */
  const serve = async (
    path: string,
    hash: string,
    signal?: AbortSignal,
  ): Promise<Response> => {
    const key = assetCacheKeyV1(scope, path, hash);
    let cache: AssetCacheStoreV1 | null;
    try {
      cache = await open();
      const kept = await cache.match(key);
      if (kept !== undefined) return kept;
    } catch {
      // A broken cache: the network answers, nothing is kept.
      cache = null;
    }
    let passed: (() => Response) | null = null;
    // The browser's HTTP cache may still hold the previous deploy's copy
    // for a few minutes: when the first answer is not the manifest's
    // version, the second attempt revalidates with the server.
    for (const mode of ["default", "no-cache"] as const) {
      const response = await environment.fetch(`${scope}${path}`, {
        cache: mode,
        ...(signal === undefined ? {} : { signal }),
      });
      if (response.status !== 200) return response;
      const bytes = await response.arrayBuffer();
      const type = response.headers.get("content-type");
      if ((await environment.digest(bytes)).startsWith(hash)) {
        try {
          await cache?.put(key, responseOf(bytes, type));
        } catch {
          // Out of space: the file is served, not kept.
        }
        return responseOf(bytes, type);
      }
      passed = () => responseOf(bytes, type);
    }
    // The host serves another version than the manifest in force names: a
    // deploy landed after this page loaded. The file is passed on, never
    // kept, and the manifest is read again.
    inBackground(refresh().catch(() => undefined));
    return (passed as () => Response)();
  };

  /**
   * A page load. Online the page is always the network's copy, fetched
   * with no cache at the same time as the manifest (so a deploy, and the
   * switch, are seen at once); it is kept for a later load with no
   * network when it is the page the manifest names. Only when the network
   * gives no answer is the kept page of the build in the cache served.
   */
  const navigate = async (
    request: AssetRequestV1,
    network: () => Promise<Response>,
  ): Promise<Response> => {
    const [, page] = await Promise.all([
      refresh().catch(() => null),
      environment
        .fetch(scope, {
          cache: "no-store",
          ...(request.signal === undefined ? {} : { signal: request.signal }),
        })
        .catch(() => null),
    ]);
    if (page !== null) {
      // The network's copy, also when the manifest just turned the worker
      // off: the page of that build is the one that removes the worker,
      // and the browser's HTTP cache may still hold the page before it.
      if (page.status !== 200) return page;
      const bytes = await page.arrayBuffer();
      const type = page.headers.get("content-type");
      const hash = current?.files["index.html"];
      if (
        !retired &&
        hash !== undefined &&
        (await environment.digest(bytes)).startsWith(hash)
      ) {
        try {
          await (
            await open()
          ).put(
            assetCacheKeyV1(scope, "index.html", hash),
            responseOf(bytes, type),
          );
        } catch {
          // Not kept: the next load with no network has no page.
        }
      }
      return responseOf(bytes, type);
    }
    if (retired) return network();
    const known = await manifest();
    const hash = known?.files["index.html"];
    const kept =
      hash === undefined
        ? undefined
        : await (
            await open()
          ).match(assetCacheKeyV1(scope, "index.html", hash));
    return kept ?? network();
  };

  /** The manifest path of a URL in scope, or null. */
  const pathOf = (url: URL, navigation: boolean): string | null => {
    if (url.origin !== origin || !url.href.startsWith(scope)) return null;
    let path: string;
    try {
      path = decodeURIComponent(url.pathname.slice(scopePath.length));
    } catch {
      return null;
    }
    // A page load may carry a query (?ruleset=6); a file request may not.
    if (navigation) return path === "" || path === "index.html" ? path : null;
    return url.search === "" && path !== "" ? path : null;
  };

  return {
    async activate() {
      for (const name of await caches.keys())
        if (name.startsWith(CACHE_PREFIX) && name !== ASSET_CACHE_NAME_V1)
          await caches.delete(name);
      const fresh = await refresh().catch(() => manifest());
      if (fresh !== null) await purge(fresh).catch(() => undefined);
    },

    respond(request, network) {
      let navigation: boolean;
      let path: string | null;
      try {
        if (
          retired ||
          request.method !== "GET" ||
          request.headers.get("range") !== null
        )
          return null;
        navigation = request.mode === "navigate";
        path = pathOf(new URL(request.url), navigation);
      } catch {
        // Not a request this code can read: the browser's.
        return null;
      }
      if (path === null) return null;
      const file = path;
      return (async () => {
        // Whatever goes wrong in here (the cache, the hashing, the
        // worker's own fetch), the page still gets the network's answer.
        try {
          if (navigation) return await navigate(request, network);
          const known = await manifest();
          const hash =
            known !== null && Object.hasOwn(known.files, file)
              ? known.files[file]
              : undefined;
          if (hash === undefined) return network();
          return await serve(file, hash, request.signal);
        } catch {
          return network();
        }
      })();
    },

    async warm(urls) {
      const known = await manifest().catch(() => null);
      if (known === null) return 0;
      const cache = await open();
      const wanted: [string, string][] = [];
      for (const value of new Set(urls)) {
        let url: URL;
        try {
          url = new URL(value, scope);
        } catch {
          continue;
        }
        let path = pathOf(url, false);
        // The page itself: its file is index.html.
        if (path === null && pathOf(url, true) !== null) path = "index.html";
        if (path === null || !Object.hasOwn(known.files, path)) continue;
        const hash = known.files[path] as string;
        if (
          (await cache.match(assetCacheKeyV1(scope, path, hash))) === undefined
        )
          wanted.push([path, hash]);
      }
      let kept = 0;
      let next = 0;
      const lane = async (): Promise<void> => {
        for (;;) {
          const entry = wanted[next];
          if (entry === undefined) return;
          next += 1;
          try {
            await serve(entry[0], entry[1]);
            if (
              (await cache.match(
                assetCacheKeyV1(scope, entry[0], entry[1]),
              )) !== undefined
            )
              kept += 1;
          } catch {
            // Offline or a failed file: it is fetched when it is next asked for.
          }
        }
      };
      await Promise.all(Array.from({ length: WARM_LANES }, lane));
      return kept;
    },

    async idle() {
      await background;
    },

    retired: () => retired,

    retire,
  };
}
