import {
  ASSET_CACHE_RETIRE_MESSAGE_V1,
  ASSET_CACHE_WARM_MESSAGE_V1,
  createAssetCacheWorkerV1,
  type AssetRequestV1,
} from "./asset-cache-worker";

/**
 * The service worker's script (bead pulp_wars-2yc.11): the build bundles
 * this file alone into `sw.js` beside the page
 * (scripts/build/asset-cache-plugin.ts). It only connects the browser's
 * events to the asset cache; the behaviour is in asset-cache-worker.ts.
 */
interface WorkerEventV1 {
  waitUntil(work: Promise<unknown>): void;
}
interface WorkerFetchEventV1 extends WorkerEventV1 {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerMessageEventV1 extends WorkerEventV1 {
  readonly data: unknown;
}
interface WorkerScopeV1 {
  readonly registration: {
    readonly scope: string;
    unregister(): Promise<boolean>;
  };
  readonly caches: CacheStorage;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(
    type: "install" | "activate",
    listener: (event: WorkerEventV1) => void,
  ): void;
  addEventListener(
    type: "fetch",
    listener: (event: WorkerFetchEventV1) => void,
  ): void;
  addEventListener(
    type: "message",
    listener: (event: WorkerMessageEventV1) => void,
  ): void;
}

const worker = globalThis as unknown as WorkerScopeV1;

const cache = createAssetCacheWorkerV1({
  scope: worker.registration.scope,
  caches: worker.caches,
  fetch: (url, init) => fetch(url, init),
  unregister: () => worker.registration.unregister(),
  digest: async (bytes) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
});

// A new worker replaces the old one at once: it holds no file list of its
// own, so it serves the same manifest and the same cache.
worker.addEventListener("install", (event) => {
  event.waitUntil(worker.skipWaiting());
});
worker.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Control first: the page that registered the worker is still
      // loading its art, and what it fetches from here on is kept.
      await worker.clients.claim();
      await cache.activate();
      await cache.idle();
    })(),
  );
});
worker.addEventListener("fetch", (event) => {
  let answer: Promise<Response> | null;
  try {
    const request: AssetRequestV1 = event.request;
    answer = cache.respond(request, () => fetch(event.request));
  } catch {
    // Not answered: the browser handles the request itself.
    return;
  }
  if (answer === null) return;
  // A fault in the cache must never cost the page a file.
  event.respondWith(answer.catch(() => fetch(event.request)));
  event.waitUntil(answer.then(() => cache.idle()).catch(() => undefined));
});
worker.addEventListener("message", (event) => {
  const data = event.data as { type?: unknown; urls?: unknown } | null;
  if (data === null || typeof data !== "object") return;
  if (data.type === ASSET_CACHE_RETIRE_MESSAGE_V1) {
    event.waitUntil(cache.retire());
    return;
  }
  if (data.type !== ASSET_CACHE_WARM_MESSAGE_V1 || !Array.isArray(data.urls))
    return;
  event.waitUntil(
    cache.warm(data.urls.filter((url) => typeof url === "string")),
  );
});
