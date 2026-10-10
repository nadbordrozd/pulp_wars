import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ASSET_CACHE_NAME_V1,
  createAssetCacheWorkerV1,
  type AssetCacheEnvironmentV1,
  type AssetCacheStorageV1,
  type AssetCacheStoreV1,
  type AssetRequestV1,
} from "../../src/service-worker/asset-cache-worker";
import {
  ASSET_HASH_LENGTH_V1,
  assetCacheKeyV1,
  type AssetManifestV1,
} from "../../src/service-worker/asset-manifest";

/**
 * The service worker's asset cache (bead pulp_wars-2yc.11) against a fake
 * host, a fake browser HTTP cache and a fake cache storage: what a visit
 * costs the network, that no file of a previous deploy is ever served or
 * kept once the manifest names another version, what a page load is
 * answered with, that a fault never costs the page a file, and that the
 * host can turn the worker off.
 */
const SCOPE = "https://example.test/pulp_wars/";

const sha = (text: string): string =>
  createHash("sha256").update(text).digest("hex");
const short = (text: string): string =>
  sha(text).slice(0, ASSET_HASH_LENGTH_V1);

function manifestOf(
  files: Record<string, string>,
  worker: "on" | "off" = "on",
): AssetManifestV1 {
  const hashed = Object.fromEntries(
    Object.entries(files).map(([path, body]) => [path, short(body)]),
  );
  return {
    format: "pulp-wars-asset-manifest",
    version: 1,
    worker,
    build: short(JSON.stringify(hashed)),
    files: hashed,
  };
}

function fakeCaches() {
  const stores = new Map<string, Map<string, { body: string; type: string }>>();
  let failPuts = false;
  let failMatches = false;
  const storage: AssetCacheStorageV1 = {
    async open(name) {
      let entries = stores.get(name);
      if (entries === undefined) {
        entries = new Map();
        stores.set(name, entries);
      }
      const kept = entries;
      const store: AssetCacheStoreV1 = {
        async match(key) {
          if (failMatches) throw new Error("InvalidStateError");
          const entry = kept.get(key);
          return entry === undefined
            ? undefined
            : new Response(entry.body, {
                headers: { "content-type": entry.type },
              });
        },
        async put(key, response) {
          if (failPuts) throw new Error("QuotaExceededError");
          kept.set(key, {
            body: await response.text(),
            type: response.headers.get("content-type") ?? "",
          });
        },
        async delete(key) {
          return kept.delete(key);
        },
        async keys() {
          return [...kept.keys()].map((url) => ({ url }));
        },
      };
      return store;
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
  return {
    storage,
    stores,
    /** Keys of the files kept (the stored manifest left out). */
    kept: (): string[] =>
      [...(stores.get(ASSET_CACHE_NAME_V1)?.keys() ?? [])]
        .filter((key) => key.includes("?sha256="))
        .sort(),
    failPuts: (fail: boolean): void => {
      failPuts = fail;
    },
    failMatches: (fail: boolean): void => {
      failMatches = fail;
    },
  };
}

/** The host, with the browser's HTTP cache in front of it. */
function fakeNetwork(files: Record<string, string>) {
  let site = { ...files };
  let manifest: { status: number; body: string } = {
    status: 200,
    body: JSON.stringify(manifestOf(site)),
  };
  let online = true;
  /** What the browser's HTTP cache answers to a default-mode fetch. */
  const httpCache = new Map<string, string>();
  const calls: string[] = [];
  const fetch = async (
    url: string,
    init: { cache: RequestCache; signal?: AbortSignal },
  ): Promise<Response> => {
    const asked = url.slice(SCOPE.length);
    calls.push(`${asked === "" ? "(page)" : asked} ${init.cache}`);
    if (init.signal?.aborted === true)
      throw new DOMException("The page gave the request up", "AbortError");
    if (!online) throw new TypeError("Failed to fetch");
    if (asked === "asset-manifest.json")
      return new Response(manifest.body, {
        status: manifest.status,
        headers: { "content-type": "application/json" },
      });
    // The base's address is the page.
    const path = asked === "" ? "index.html" : asked;
    const cached = init.cache === "default" ? httpCache.get(path) : undefined;
    const body = cached ?? site[path];
    if (body === undefined) return new Response("gone", { status: 404 });
    return new Response(body, {
      headers: {
        "content-type": path.endsWith(".html") ? "text/html" : "image/png",
        "content-encoding-was": "gzip",
      },
    });
  };
  return {
    fetch,
    calls,
    httpCache,
    manifest: (): AssetManifestV1 =>
      JSON.parse(manifest.body) as AssetManifestV1,
    /** A deploy: the host serves these files and their manifest. */
    deploy(next: Record<string, string>, announce = true): void {
      site = { ...next };
      if (announce)
        manifest = { status: 200, body: JSON.stringify(manifestOf(site)) };
    },
    /** The manifest alone changes (the files lag, or it says "off"). */
    announce(next: Record<string, string>, worker: "on" | "off" = "on"): void {
      manifest = {
        status: 200,
        body: JSON.stringify(manifestOf(next, worker)),
      };
    },
    /** The host answers the manifest's address with exactly this. */
    answerManifest(status: number, body: string): void {
      manifest = { status, body };
    },
    setOnline(value: boolean): void {
      online = value;
    },
    /** Network calls since the last look. */
    take(): string[] {
      return calls.splice(0);
    },
  };
}

function workerOn(
  network: ReturnType<typeof fakeNetwork>,
  caches: ReturnType<typeof fakeCaches>,
  overrides: Partial<AssetCacheEnvironmentV1> = {},
) {
  let unregistered = 0;
  const worker = createAssetCacheWorkerV1({
    scope: SCOPE,
    caches: caches.storage,
    fetch: network.fetch,
    digest: async (bytes) =>
      createHash("sha256").update(new Uint8Array(bytes)).digest("hex"),
    unregister: async () => {
      unregistered += 1;
      return true;
    },
    ...overrides,
  });
  const passed: string[] = [];
  const request = (
    path: string,
    extra: Partial<AssetRequestV1> & { range?: string } = {},
  ): AssetRequestV1 => ({
    method: extra.method ?? "GET",
    url: extra.url ?? `${SCOPE}${path}`,
    mode: extra.mode ?? "no-cors",
    headers: {
      get: (name) => (name === "range" ? (extra.range ?? null) : null),
    },
  });
  /** What the browser would do with the request itself. */
  const ask = (
    path: string,
    extra: Partial<AssetRequestV1> & { range?: string } = {},
  ): Promise<Response> | null =>
    worker.respond(request(path, extra), async () => {
      passed.push(path);
      return new Response(`network:${path}`);
    });
  /** The body the page receives for a file. */
  const get = async (path: string): Promise<string> => {
    const answer = ask(path);
    if (answer === null) throw new Error(`${path}: not the worker's`);
    return (await answer).text();
  };
  /** A page load: the body of the page. */
  const navigate = async (query = ""): Promise<string> => {
    const answer = ask("", { mode: "navigate", url: `${SCOPE}${query}` });
    if (answer === null) throw new Error("navigation: not the worker's");
    const body = await (await answer).text();
    await worker.idle();
    return body;
  };
  return {
    worker,
    ask,
    get,
    navigate,
    passed,
    unregistered: () => unregistered,
  };
}

const SITE = {
  "index.html": "<html>one</html>",
  "assets/app-AAAA.js": "console.log(1)",
  "assets/chibi/knight.png": "knight-v1",
  "assets/chibi/grass.png": "grass-v1",
};
const keysOf = (manifest: AssetManifestV1): string[] =>
  Object.entries(manifest.files)
    .map(([path, hash]) => assetCacheKeyV1(SCOPE, path, hash))
    .sort();

describe("service worker asset cache", () => {
  it("keeps each file under its hash and answers a second request without the network", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { get } = workerOn(network, caches);

    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    // The first request of a first visit reads the manifest, from no cache.
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "assets/chibi/knight.png default",
    ]);
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "assets/chibi/knight.png", short("knight-v1")),
    ]);

    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    expect(await get("assets/chibi/grass.png")).toBe("grass-v1");
    expect(network.take()).toEqual(["assets/chibi/grass.png default"]);
  });

  it("serves only the type of a kept file, not the transfer's other headers", async () => {
    const network = fakeNetwork(SITE);
    const { ask } = workerOn(network, fakeCaches());
    const first = await ask("assets/chibi/knight.png");
    const second = await ask("assets/chibi/knight.png");
    for (const response of [first, second]) {
      expect(response?.status).toBe(200);
      expect(response?.headers.get("content-type")).toBe("image/png");
      expect(response?.headers.get("content-encoding-was")).toBeNull();
    }
  });

  it("a return visit costs two small requests, the manifest and the page; every other file comes from the cache", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const first = workerOn(network, caches);
    expect(await first.navigate()).toBe("<html>one</html>");
    for (const path of Object.keys(SITE)) await first.get(path);
    network.take();

    // Later: the browser has stopped the worker; a new one starts.
    const later = workerOn(network, caches);
    expect(await later.navigate("?ruleset=7")).toBe("<html>one</html>");
    for (const [path, body] of Object.entries(SITE))
      expect(await later.get(path)).toBe(body);
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "(page) no-store",
    ]);
  });

  it("after a deploy serves the new version of every changed file and downloads only those", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const before = workerOn(network, caches);
    await before.navigate();
    for (const path of Object.keys(SITE)) await before.get(path);

    network.deploy({
      "index.html": "<html>two</html>",
      "assets/app-BBBB.js": "console.log(2)",
      "assets/chibi/knight.png": "knight-v2",
      "assets/chibi/grass.png": "grass-v1",
    });
    network.take();

    const after = workerOn(network, caches);
    expect(await after.navigate()).toBe("<html>two</html>");
    expect(await after.get("assets/app-BBBB.js")).toBe("console.log(2)");
    expect(await after.get("assets/chibi/knight.png")).toBe("knight-v2");
    expect(await after.get("assets/chibi/grass.png")).toBe("grass-v1");
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "(page) no-store",
      "assets/app-BBBB.js default",
      "assets/chibi/knight.png default",
    ]);
    // The previous deploy's versions are gone from the cache.
    expect(caches.kept()).toEqual(keysOf(network.manifest()));
  });

  it("never keeps the previous version handed over by the browser's HTTP cache", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { get } = workerOn(network, caches);
    // The host has the new knight; the HTTP cache still answers the old.
    network.deploy({ ...SITE, "assets/chibi/knight.png": "knight-v2" });
    network.httpCache.set("assets/chibi/knight.png", "knight-v1");

    expect(await get("assets/chibi/knight.png")).toBe("knight-v2");
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "assets/chibi/knight.png default",
      "assets/chibi/knight.png no-cache",
    ]);
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "assets/chibi/knight.png", short("knight-v2")),
    ]);
  });

  it("passes on, and does not keep, a file of a host that serves another build than the manifest; then reads the manifest again", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { worker, get } = workerOn(network, caches);
    await get("assets/chibi/grass.png");
    network.take();

    // A deploy lands while the page is open.
    network.deploy({ ...SITE, "assets/chibi/knight.png": "knight-v2" });
    expect(await get("assets/chibi/knight.png")).toBe("knight-v2");
    await worker.idle();
    expect(network.take()).toEqual([
      "assets/chibi/knight.png default",
      "assets/chibi/knight.png no-cache",
      "asset-manifest.json no-store",
    ]);
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "assets/chibi/grass.png", short("grass-v1")),
    ]);
    // Under the manifest just read the new version is kept.
    expect(await get("assets/chibi/knight.png")).toBe("knight-v2");
    expect(await get("assets/chibi/knight.png")).toBe("knight-v2");
    expect(network.take()).toEqual(["assets/chibi/knight.png default"]);
  });

  it("does not keep a file while the host still serves the build before the manifest's", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { worker, get } = workerOn(network, caches);
    // The manifest is ahead of the files (a deploy still spreading).
    network.announce({ ...SITE, "assets/chibi/knight.png": "knight-v2" });
    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    await worker.idle();
    expect(caches.kept()).toEqual([]);
    // Once the host catches up the manifest's version is served and kept.
    network.deploy({ ...SITE, "assets/chibi/knight.png": "knight-v2" });
    expect(await get("assets/chibi/knight.png")).toBe("knight-v2");
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "assets/chibi/knight.png", short("knight-v2")),
    ]);
  });

  it("leaves alone what is not its own", async () => {
    const network = fakeNetwork(SITE);
    const { ask, passed } = workerOn(network, fakeCaches());
    expect(ask("assets/chibi/knight.png", { method: "POST" })).toBeNull();
    expect(ask("assets/chibi/knight.png", { range: "bytes=0-99" })).toBeNull();
    expect(
      ask("x", { url: "https://elsewhere.test/pulp_wars/index.html" }),
    ).toBeNull();
    expect(ask("x", { url: "https://example.test/other/a.png" })).toBeNull();
    expect(ask("x", { url: `${SCOPE}assets/chibi/knight.png?v=2` })).toBeNull();
    expect(ask("x", { url: `${SCOPE}%E0%A4%A.png` })).toBeNull();
    expect(
      ask("x", { mode: "navigate", url: `${SCOPE}docs/page.html` }),
    ).toBeNull();
    // The worker's own script and the manifest are never in a manifest;
    // neither is a file the build does not know: the network answers.
    for (const path of ["sw.js", "asset-manifest.json", "assets/new.png"])
      expect(await (await ask(path))?.text()).toBe(`network:${path}`);
    expect(passed).toEqual(["sw.js", "asset-manifest.json", "assets/new.png"]);
    expect(
      network.calls.filter((call) => !call.startsWith("asset-manifest")),
    ).toEqual([]);
  });

  it("hands every request to the network while no manifest can be had", async () => {
    const network = fakeNetwork(SITE);
    network.setOnline(false);
    const caches = fakeCaches();
    const { ask, passed } = workerOn(network, caches);
    expect(await (await ask("assets/chibi/knight.png"))?.text()).toBe(
      "network:assets/chibi/knight.png",
    );
    expect(await (await ask("", { mode: "navigate" }))?.text()).toBe(
      "network:",
    );
    expect(passed).toEqual(["assets/chibi/knight.png", ""]);
    expect(caches.kept()).toEqual([]);
  });

  it("passes a missing file on and serves a file it has no room to keep", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { get, ask } = workerOn(network, caches);
    await get("index.html");
    network.deploy({ "index.html": SITE["index.html"] }, false);
    expect((await ask("assets/chibi/knight.png"))?.status).toBe(404);

    network.deploy(SITE);
    caches.failPuts(true);
    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "index.html", short(SITE["index.html"])),
    ]);
  });

  it("stops a download the page has given up and keeps nothing of it", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { worker, get } = workerOn(network, caches);
    await get("index.html");
    const page = new AbortController();
    page.abort();
    const answer = worker.respond(
      {
        method: "GET",
        url: `${SCOPE}assets/chibi/knight.png`,
        mode: "cors",
        headers: { get: () => null },
        signal: page.signal,
      },
      // The browser's own request is aborted with the page's signal too.
      async () => {
        throw new DOMException("The page gave the request up", "AbortError");
      },
    );
    await expect(answer).rejects.toThrow("gave the request up");
    expect(network.take().at(-1)).toBe("assets/chibi/knight.png default");
    expect(caches.kept()).toEqual([
      assetCacheKeyV1(SCOPE, "index.html", short(SITE["index.html"])),
    ]);
  });

  it("on taking over drops caches of other formats and entries no manifest names", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const stale = assetCacheKeyV1(SCOPE, "assets/chibi/knight.png", short("x"));
    const store = await caches.storage.open(ASSET_CACHE_NAME_V1);
    await store.put(stale, new Response("knight-v0"));
    await (
      await caches.storage.open("pulp-wars-assets-v0")
    ).put("old", new Response("old"));
    await (
      await caches.storage.open("someone-else")
    ).put("theirs", new Response("theirs"));
    const { worker } = workerOn(network, caches);
    await worker.activate();
    await worker.idle();
    expect([...caches.stores.keys()].sort()).toEqual([
      ASSET_CACHE_NAME_V1,
      "someone-else",
    ]);
    expect(caches.kept()).toEqual([]);
  });

  it("fills the cache with the files a page loaded before the worker served it", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { worker, get } = workerOn(network, caches);
    await get("assets/chibi/grass.png");
    network.take();
    expect(
      await worker.warm([
        `${SCOPE}?ruleset=7`,
        `${SCOPE}assets/app-AAAA.js`,
        `${SCOPE}assets/chibi/knight.png`,
        `${SCOPE}assets/chibi/knight.png`,
        `${SCOPE}assets/chibi/grass.png`,
        `${SCOPE}assets/unknown.png`,
        `${SCOPE}sw.js`,
        "https://elsewhere.test/a.png",
        "not a url at all://",
      ]),
    ).toBe(3);
    expect(network.take().sort()).toEqual([
      "assets/app-AAAA.js default",
      "assets/chibi/knight.png default",
      "index.html default",
    ]);
    expect(caches.kept()).toEqual(keysOf(network.manifest()));
    // Nothing left to fetch.
    expect(await worker.warm([`${SCOPE}assets/chibi/knight.png`])).toBe(0);
    expect(network.take()).toEqual([]);
  });
});

describe("service worker: the page itself", () => {
  /** A worker whose cache already holds the page and the manifest. */
  async function visited() {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const first = workerOn(network, caches);
    await first.navigate();
    await first.get("assets/app-AAAA.js");
    network.take();
    return { network, caches };
  }
  const pageKey = (body: string): string =>
    assetCacheKeyV1(SCOPE, "index.html", short(body));

  it("online, a page load is answered with the network's copy, fetched with no cache, though the cache holds the page", async () => {
    const { network, caches } = await visited();
    expect(caches.kept()).toContain(pageKey("<html>one</html>"));
    const { ask } = workerOn(network, caches);
    const response = await ask("", {
      mode: "navigate",
      url: `${SCOPE}index.html?ruleset=7`,
    });
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("text/html");
    expect(await response?.text()).toBe("<html>one</html>");
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "(page) no-store",
    ]);
  });

  it("online, the host's page is served the moment it changes, even when the manifest cannot be read or still names the old page", async () => {
    // The manifest's address fails: the page is still the network's.
    const failing = await visited();
    failing.network.deploy({ ...SITE, "index.html": "<html>two</html>" });
    failing.network.answerManifest(503, "busy");
    const a = workerOn(failing.network, failing.caches);
    expect(await a.navigate()).toBe("<html>two</html>");
    expect(a.worker.retired()).toBe(false);

    // The page is ahead of the manifest (a deploy still spreading): the
    // new page is served and not kept under the old page's name.
    const lagging = await visited();
    lagging.network.deploy(
      { ...SITE, "index.html": "<html>two</html>" },
      false,
    );
    const b = workerOn(lagging.network, lagging.caches);
    expect(await b.navigate()).toBe("<html>two</html>");
    expect(lagging.caches.kept()).toContain(pageKey("<html>one</html>"));
    expect(lagging.caches.kept()).not.toContain(pageKey("<html>two</html>"));

    // The host's own error page is passed on as it is.
    const broken = await visited();
    broken.network.deploy({ "assets/app-AAAA.js": "console.log(1)" }, false);
    const c = workerOn(broken.network, broken.caches);
    expect((await c.ask("", { mode: "navigate" }))?.status).toBe(404);
  });

  it("with no network, a page load is answered with the kept page of the build in the cache, and its files with it", async () => {
    const { network, caches } = await visited();
    network.setOnline(false);
    const offline = workerOn(network, caches);
    expect(await offline.navigate()).toBe("<html>one</html>");
    expect(await offline.get("assets/app-AAAA.js")).toBe("console.log(1)");
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "(page) no-store",
    ]);
    expect(offline.passed).toEqual([]);
    // A file the cache lacks is the browser's to fail, as with no worker.
    expect(await offline.get("assets/chibi/grass.png")).toBe(
      "network:assets/chibi/grass.png",
    );
  });

  it("with no network and no kept page, the page load is the browser's", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const first = workerOn(network, caches);
    // The manifest is known, the page was never kept.
    await first.get("assets/chibi/knight.png");
    network.setOnline(false);
    const offline = workerOn(network, caches);
    expect(await offline.navigate()).toBe("network:");
  });
});

describe("service worker: a fault never costs the page a file", () => {
  it("hands the request to the network when the worker's own handling throws", async () => {
    // The hashing fails.
    const hashing = fakeNetwork(SITE);
    const a = workerOn(hashing, fakeCaches(), {
      digest: async () => {
        throw new Error("crypto unavailable");
      },
    });
    expect(await a.get("assets/chibi/knight.png")).toBe(
      "network:assets/chibi/knight.png",
    );
    expect(await a.navigate()).toBe("network:");

    // The worker's own fetch of a file fails though the manifest is known.
    const fetching = fakeNetwork(SITE);
    const b = workerOn(fetching, fakeCaches());
    await b.get("assets/chibi/grass.png");
    fetching.setOnline(false);
    expect(await b.get("assets/chibi/knight.png")).toBe(
      "network:assets/chibi/knight.png",
    );

    // Cache storage cannot be opened at all.
    const storage = fakeNetwork(SITE);
    const c = workerOn(storage, fakeCaches(), {
      caches: {
        open: async () => {
          throw new Error("SecurityError");
        },
        keys: async () => {
          throw new Error("SecurityError");
        },
        delete: async () => false,
      },
    });
    expect(await c.get("assets/chibi/knight.png")).toBe("knight-v1");
    expect(await c.navigate()).toBe("<html>one</html>");
    expect(c.passed).toEqual([]);
  });

  it("serves from the network when the cache cannot be read, and treats an unreadable request as the browser's", async () => {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    const { worker, get, navigate } = workerOn(network, caches);
    await navigate();
    await get("assets/chibi/knight.png");
    caches.failMatches(true);
    expect(await get("assets/chibi/knight.png")).toBe("knight-v1");
    expect(await navigate()).toBe("<html>one</html>");
    network.setOnline(false);
    // Nothing readable and no network: the browser's own answer.
    expect(await get("assets/chibi/knight.png")).toBe(
      "network:assets/chibi/knight.png",
    );
    expect(await navigate()).toBe("network:");

    const network2 = async (): Promise<Response> => new Response("network");
    expect(
      worker.respond(
        {
          method: "GET",
          url: "::not a url::",
          mode: "no-cors",
          headers: { get: () => null },
        },
        network2,
      ),
    ).toBeNull();
    expect(
      worker.respond(
        {
          method: "GET",
          url: `${SCOPE}assets/chibi/knight.png`,
          mode: "no-cors",
          headers: {
            get: () => {
              throw new Error("headers unreadable");
            },
          },
        },
        network2,
      ),
    ).toBeNull();
  });
});

describe("service worker: the kill switch", () => {
  /** A worker with a full cache, as a visitor's browser holds it. */
  async function installed() {
    const network = fakeNetwork(SITE);
    const caches = fakeCaches();
    await (
      await caches.storage.open("someone-else")
    ).put("theirs", new Response("theirs"));
    const first = workerOn(network, caches);
    await first.navigate();
    for (const path of Object.keys(SITE)) await first.get(path);
    expect(caches.kept()).toHaveLength(4);
    network.take();
    return { network, caches };
  }

  it('a manifest that says "off" makes the worker delete its caches, unregister and answer nothing', async () => {
    const { network, caches } = await installed();
    // One deploy with the switch off; the visitor comes back.
    const off = { ...SITE, "index.html": "<html>off build</html>" };
    network.deploy(off);
    network.announce(off, "off");
    const visit = workerOn(network, caches);
    // The page load that reads the manifest gets that build's page, fresh
    // from the host (the browser's HTTP cache may hold the page before
    // it, which would register the worker again): it is the page that
    // removes the registration.
    expect(await visit.navigate()).toBe("<html>off build</html>");
    expect(visit.passed).toEqual([]);
    expect(visit.worker.retired()).toBe(true);
    expect(visit.unregistered()).toBe(1);
    expect([...caches.stores.keys()]).toEqual(["someone-else"]);
    // From then on no request is the worker's.
    expect(visit.ask("assets/chibi/knight.png")).toBeNull();
    expect(visit.ask("", { mode: "navigate" })).toBeNull();
    expect(await visit.worker.warm([`${SCOPE}assets/chibi/knight.png`])).toBe(
      0,
    );
    expect([...caches.stores.keys()]).toEqual(["someone-else"]);
    expect(network.take()).toEqual([
      "asset-manifest.json no-store",
      "(page) no-store",
    ]);
  });

  it("a manifest it does not recognise, or none at all, turns it off the same way", async () => {
    const on = manifestOf(SITE);
    const unrecognised: [number, string][] = [
      [200, JSON.stringify({ ...on, version: 2 })],
      [200, JSON.stringify({ ...on, format: "another-format" })],
      [200, JSON.stringify({ ...on, worker: undefined })],
      [200, JSON.stringify({ ...on, worker: "maybe" })],
      [200, JSON.stringify({ ...on, files: ["index.html"] })],
      [200, "<html>not json</html>"],
      [200, "null"],
      [404, "Not Found"],
      [410, "Gone"],
    ];
    for (const [status, body] of unrecognised) {
      const { network, caches } = await installed();
      network.answerManifest(status, body);
      const visit = workerOn(network, caches);
      expect(await visit.navigate(), body).toBe("<html>one</html>");
      expect(network.take(), body).toEqual([
        "asset-manifest.json no-store",
        "(page) no-store",
      ]);
      expect(visit.worker.retired(), body).toBe(true);
      expect(visit.unregistered(), body).toBe(1);
      expect([...caches.stores.keys()], body).toEqual(["someone-else"]);
      expect(visit.ask("assets/chibi/knight.png"), body).toBeNull();
    }
  });

  it("is turned off by the first file request too, and that request and those in flight go to the network", async () => {
    const { network, caches } = await installed();
    network.announce(SITE, "off");
    // The browser restarts the worker for a file of an open page: with
    // the stored manifest it still serves; the switch is read on the next
    // page load or when it takes over.
    const restarted = workerOn(network, caches);
    expect(await restarted.get("assets/chibi/knight.png")).toBe("knight-v1");
    await restarted.worker.activate();
    expect(restarted.worker.retired()).toBe(true);
    expect([...caches.stores.keys()]).toEqual(["someone-else"]);

    // A worker started after the caches are gone has no manifest: its
    // first request reads the switch and goes to the network.
    const later = workerOn(network, caches);
    const [first, second] = await Promise.all([
      later.get("assets/chibi/knight.png"),
      later.get("assets/chibi/grass.png"),
    ]);
    expect([first, second]).toEqual([
      "network:assets/chibi/knight.png",
      "network:assets/chibi/grass.png",
    ]);
    expect(later.worker.retired()).toBe(true);
    expect(later.unregistered()).toBe(1);
    expect([...caches.stores.keys()]).toEqual(["someone-else"]);
  });

  it("stays on when the manifest merely cannot be fetched: no network, or a server error", async () => {
    for (const fail of [
      (network: ReturnType<typeof fakeNetwork>) => network.setOnline(false),
      (network: ReturnType<typeof fakeNetwork>) =>
        network.answerManifest(500, "Internal Server Error"),
      (network: ReturnType<typeof fakeNetwork>) =>
        network.answerManifest(503, JSON.stringify(manifestOf(SITE, "off"))),
    ]) {
      const { network, caches } = await installed();
      fail(network);
      const visit = workerOn(network, caches);
      expect(await visit.navigate()).toBe("<html>one</html>");
      expect(await visit.get("assets/chibi/knight.png")).toBe("knight-v1");
      expect(visit.worker.retired()).toBe(false);
      expect(visit.unregistered()).toBe(0);
      expect(caches.kept()).toHaveLength(4);
    }
  });

  it("still leaves every request to the browser when it cannot unregister or clear its caches", async () => {
    const { network, caches } = await installed();
    network.announce(SITE, "off");
    const visit = workerOn(network, caches, {
      unregister: async () => {
        throw new Error("InvalidStateError");
      },
      caches: {
        ...caches.storage,
        delete: async () => {
          throw new Error("QuotaExceededError");
        },
      },
    });
    expect(await visit.navigate()).toBe("<html>one</html>");
    expect(visit.worker.retired()).toBe(true);
    expect(visit.ask("assets/chibi/knight.png")).toBeNull();
  });

  it("is turned off by the page's word as well: caches gone, registration gone, nothing answered or kept", async () => {
    const { network, caches } = await installed();
    const visit = workerOn(network, caches);
    expect(await visit.get("assets/chibi/knight.png")).toBe("knight-v1");
    // A file still on its way when the word comes is served, not kept.
    network.deploy({ ...SITE, "assets/new.png": "new" });
    await visit.navigate();
    const flying = visit.ask("assets/new.png");
    await visit.worker.retire();
    expect(await (await flying)?.text()).toBe("new");
    expect(visit.worker.retired()).toBe(true);
    expect(visit.unregistered()).toBe(1);
    expect([...caches.stores.keys()]).toEqual(["someone-else"]);
    expect(visit.ask("assets/chibi/knight.png")).toBeNull();
    expect(visit.ask("", { mode: "navigate" })).toBeNull();
  });
});
