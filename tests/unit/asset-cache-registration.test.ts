import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assetCacheEscapeRequestedV1,
  removeAssetCacheV1,
  startAssetCacheV1,
  type AssetCacheBrowserV1,
} from "../../src/app/asset-cache-registration";
import {
  ASSET_CACHE_RETIRE_MESSAGE_V1,
  ASSET_CACHE_WARM_MESSAGE_V1,
} from "../../src/service-worker/asset-cache-worker";
import {
  ASSET_CACHE_ESCAPE_PARAMETER_V1,
  ASSET_CACHE_WORKER_ENABLED_V1,
} from "../../src/service-worker/asset-manifest";

/**
 * The page's side of the asset cache (bead pulp_wars-2yc.11): a deployed
 * build registers the worker under the site's base; the development server
 * and a browser without workers do not; a build with the switch off, and a
 * page loaded with `?no-cache-worker=1`, take the worker away.
 */
function browser(
  options: {
    controlled?: boolean;
    active?: boolean;
    register?: () => Promise<unknown>;
    /** A worker of an earlier visit is registered. */
    installed?: boolean;
    href?: string;
  } = {},
) {
  const registered: { url: string; scope: string }[] = [];
  const messages: { type: string; urls?: string[] }[] = [];
  const asked: string[] = [];
  let unregistered = 0;
  let bufferSize = 0;
  const caches = new Set(
    options.installed === true
      ? ["pulp-wars-assets-v1", "pulp-wars-assets-v0", "someone-else"]
      : ["someone-else"],
  );
  const registration = {
    active:
      options.active === false
        ? null
        : {
            postMessage: (message: unknown) =>
              void messages.push(message as { type: string; urls?: string[] }),
          },
    unregister: async () => {
      unregistered += 1;
      return true;
    },
  };
  const value: AssetCacheBrowserV1 = {
    serviceWorker: {
      controller: options.controlled === true ? {} : null,
      ready: Promise.resolve(registration),
      register: (url, { scope }) => {
        registered.push({ url, scope });
        return (options.register ?? (() => Promise.resolve({})))();
      },
      getRegistration: async (url) => {
        asked.push(url);
        return options.installed === true && unregistered === 0
          ? registration
          : undefined;
      },
    },
    caches: {
      keys: async () => [...caches],
      delete: async (name) => caches.delete(name),
    },
    performance: {
      setResourceTimingBufferSize: (size) => {
        bufferSize = size;
      },
      getEntriesByType: (type) =>
        type !== "resource"
          ? []
          : [
              "https://example.test/pulp_wars/assets/index-AAAA.js",
              "https://example.test/pulp_wars/assets/chibi/knight.png",
              "https://example.test/pulp_wars/assets/chibi/knight.png",
              "https://example.test/other-site/a.png",
              "https://fonts.elsewhere.test/pulp_wars/font.woff2",
            ].map((name) => ({ name })),
    },
    href: options.href ?? "https://example.test/pulp_wars/?ruleset=7",
  };
  return {
    value,
    registered,
    messages,
    asked,
    caches,
    unregistered: () => unregistered,
    bufferSize: () => bufferSize,
  };
}

const start = (
  b: ReturnType<typeof browser>,
  options: { deployed?: boolean; workerEnabled?: boolean } = {},
) =>
  startAssetCacheV1({
    deployed: options.deployed ?? true,
    workerEnabled: options.workerEnabled ?? true,
    base: "/pulp_wars/",
    browser: b.value,
  });

describe("asset cache registration", () => {
  it("registers the worker of a deployed build under the site's base and removes nothing", async () => {
    const b = browser({ installed: true });
    const cache = start(b);
    expect(cache.registered).toBe(true);
    expect(b.registered).toEqual([
      { url: "/pulp_wars/sw.js", scope: "/pulp_wars/" },
    ]);
    expect(await cache.removed).toBe(false);
    expect(b.unregistered()).toBe(0);
    expect(b.caches.has("pulp-wars-assets-v1")).toBe(true);
  });

  it("does nothing under the development server or without worker support", async () => {
    const dev = browser({ installed: true });
    const off = start(dev, { deployed: false });
    expect(off.registered).toBe(false);
    expect(dev.registered).toEqual([]);
    expect(await off.pageLoaded()).toBe(0);
    expect(dev.messages).toEqual([]);
    // Not even with the switch off or the escape: nothing of the
    // development server's is touched.
    expect(await off.removed).toBe(false);
    expect(
      await start(dev, { deployed: false, workerEnabled: false }).removed,
    ).toBe(false);
    expect(dev.unregistered()).toBe(0);

    const none = startAssetCacheV1({
      deployed: true,
      workerEnabled: true,
      base: "/pulp_wars/",
      browser: { href: "https://example.test/pulp_wars/" },
    });
    expect(none.registered).toBe(false);
    const blocked = startAssetCacheV1({
      deployed: true,
      workerEnabled: true,
      base: "/pulp_wars/",
      browser: {
        get serviceWorker(): never {
          throw new Error("SecurityError");
        },
        href: "https://example.test/pulp_wars/",
      },
    });
    expect(blocked.registered).toBe(false);
    expect(await blocked.pageLoaded()).toBe(0);
  });

  it("a failed registration leaves the page as it was", async () => {
    const rejecting = browser({
      register: () => Promise.reject(new Error("SecurityError")),
    });
    expect(() => start(rejecting)).not.toThrow();
    const throwing = browser({
      register: () => {
        throw new Error("TypeError");
      },
    });
    expect(start(throwing).registered).toBe(false);
  });

  it("on a visit the worker did not serve, names the site's loaded files to it once the page has started", async () => {
    const b = browser();
    const cache = start(b);
    // The whole look is about a thousand files: the default list is 250.
    expect(b.bufferSize()).toBeGreaterThanOrEqual(2_000);
    expect(b.messages).toEqual([]);
    expect(await cache.pageLoaded()).toBe(3);
    expect(b.messages).toEqual([
      {
        type: ASSET_CACHE_WARM_MESSAGE_V1,
        urls: [
          "https://example.test/pulp_wars/?ruleset=7",
          "https://example.test/pulp_wars/assets/index-AAAA.js",
          "https://example.test/pulp_wars/assets/chibi/knight.png",
        ],
      },
    ]);
  });

  it("says nothing on a visit the worker served from its first request", async () => {
    const b = browser({ controlled: true });
    const cache = start(b);
    expect(b.registered).toHaveLength(1);
    expect(b.bufferSize()).toBe(0);
    expect(await cache.pageLoaded()).toBe(0);
    expect(b.messages).toEqual([]);

    expect(await start(browser({ active: false })).pageLoaded()).toBe(0);
  });
});

describe("turning the worker off from the page", () => {
  it("a build with the switch off registers nothing, unregisters the worker it finds and deletes its caches", async () => {
    const b = browser({ installed: true, controlled: true });
    const cache = start(b, { workerEnabled: false });
    expect(cache.registered).toBe(false);
    expect(await cache.removed).toBe(true);
    expect(b.registered).toEqual([]);
    expect(b.asked).toEqual(["/pulp_wars/"]);
    expect(b.unregistered()).toBe(1);
    // The worker serving this very page is told to stop and keep nothing.
    expect(b.messages).toEqual([{ type: ASSET_CACHE_RETIRE_MESSAGE_V1 }]);
    // Every format of the worker's cache, and nobody else's.
    expect([...b.caches]).toEqual(["someone-else"]);
    // A worker too old to know the word kept files of this load: they go
    // when the page has loaded.
    b.caches.add("pulp-wars-assets-v1");
    expect(await cache.pageLoaded()).toBe(0);
    expect([...b.caches]).toEqual(["someone-else"]);
    expect(b.unregistered()).toBe(1);
    expect(b.messages).toHaveLength(1);

    // A browser that never had the worker: nothing to remove.
    const clean = browser();
    expect(await start(clean, { workerEnabled: false }).removed).toBe(false);
    expect(clean.registered).toEqual([]);
  });

  it("?no-cache-worker=1 removes the worker and its caches for that browser and does not register it on that load", async () => {
    const b = browser({
      installed: true,
      controlled: true,
      href: "https://example.test/pulp_wars/?ruleset=7&no-cache-worker=1",
    });
    const cache = start(b);
    expect(cache.registered).toBe(false);
    expect(await cache.removed).toBe(true);
    expect(b.registered).toEqual([]);
    expect(b.unregistered()).toBe(1);
    expect(b.messages).toEqual([{ type: ASSET_CACHE_RETIRE_MESSAGE_V1 }]);
    expect([...b.caches]).toEqual(["someone-else"]);
    expect(await cache.pageLoaded()).toBe(0);
    expect(b.messages).toHaveLength(1);
  });

  it("reads the escape only as that exact parameter", () => {
    expect(ASSET_CACHE_ESCAPE_PARAMETER_V1).toBe("no-cache-worker");
    const at = (query: string): boolean =>
      assetCacheEscapeRequestedV1(`https://example.test/pulp_wars/${query}`);
    expect(at("?no-cache-worker=1")).toBe(true);
    expect(at("?art=legacy&no-cache-worker=1#top")).toBe(true);
    expect(at("")).toBe(false);
    expect(at("?no-cache-worker=0")).toBe(false);
    expect(at("?no-cache-worker")).toBe(false);
    expect(at("?cache-worker=1")).toBe(false);
    expect(assetCacheEscapeRequestedV1("not a url")).toBe(false);
  });

  it("never throws while removing, whatever the browser refuses", async () => {
    const refusing: AssetCacheBrowserV1 = {
      get serviceWorker(): never {
        throw new Error("SecurityError");
      },
      get caches(): never {
        throw new Error("SecurityError");
      },
      href: "https://example.test/pulp_wars/",
    };
    expect(await removeAssetCacheV1(refusing, "/pulp_wars/")).toBe(false);
    const half = browser({ installed: true });
    const failing: AssetCacheBrowserV1 = {
      ...half.value,
      serviceWorker: {
        controller: null,
        ready: Promise.resolve({ unregister: async () => true }),
        register: async () => ({}),
        getRegistration: async () => {
          throw new Error("InvalidStateError");
        },
      },
    };
    // The registration could not be read; the caches still go.
    expect(await removeAssetCacheV1(failing, "/pulp_wars/")).toBe(true);
    expect([...half.caches]).toEqual(["someone-else"]);
  });

  it("is wired to the build's switch and the page's address in the page's entry", () => {
    // The shipped state: on.
    expect(ASSET_CACHE_WORKER_ENABLED_V1).toBe(true);
    const main = readFileSync("src/main.ts", "utf8");
    expect(main).toContain("deployed: import.meta.env.PROD");
    expect(main).toContain("workerEnabled: ASSET_CACHE_WORKER_ENABLED_V1");
    expect(main).toContain("base: import.meta.env.BASE_URL");
    expect(main).toContain("href: globalThis.location.href");
    expect(main).toContain("void assetCache.pageLoaded();");
  });
});
