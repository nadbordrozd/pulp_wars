import { afterEach, describe, expect, it } from "vitest";
import {
  createAssetPreloaderV7,
  type AssetPreloadProgressV7,
} from "../../src/app/asset-preloader-v7";
import {
  browserChibiRasterEnvironmentV7,
  createChibiArtResolverV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { buildChibiArtRegistryV7 } from "../../src/assets/chibi-art-v7";
import { createBoardImageResolverV7 } from "../../src/render/canvas/board-renderer-v7";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  lazyRasterLoadsV7,
  markRasterPreloadCompleteV7,
  preloadedRasterV7,
  resetPreloadedRastersV7,
  storePreloadedRasterV7,
} from "../../src/render/canvas/preloaded-rasters-v7";

/**
 * The asset preloader (bead pulp_wars-2yc.6) with a fake loader: progress,
 * bounded concurrency, failure tolerance, and the store the board and
 * interface loaders read.
 */
interface Pending {
  readonly url: string;
  resolve(): void;
  reject(): void;
}

function harness() {
  const pending: Pending[] = [];
  const stored = new Map<string, string>();
  const warnings: string[] = [];
  const timers: { callback: () => void; ms: number; live: boolean }[] = [];
  let inFlight = 0;
  let peak = 0;
  const calls: string[] = [];
  const load = (url: string): Promise<string> => {
    calls.push(url);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    return new Promise((resolve, reject) => {
      pending.push({
        url,
        resolve: () => {
          inFlight -= 1;
          resolve(`decoded:${url}`);
        },
        reject: () => {
          inFlight -= 1;
          reject(new Error("failed"));
        },
      });
    });
  };
  const options = {
    load,
    store: {
      has: (url: string) => stored.has(url),
      set: (url: string, raster: string) => void stored.set(url, raster),
    },
    warn: (message: string) => void warnings.push(message),
    setTimer: (callback: () => void, ms: number) => {
      const timer = { callback, ms, live: true };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer: unknown) => {
      (timer as { live: boolean }).live = false;
    },
  };
  const tick = async (): Promise<void> => {
    for (let index = 0; index < 5; index += 1) await Promise.resolve();
  };
  /** Settles loads as they start until none is waiting. */
  const drain = async (
    outcome: (url: string, attempt: number) => boolean = () => true,
  ): Promise<void> => {
    const attempts = new Map<string, number>();
    await tick();
    while (pending.length > 0) {
      const next = pending.shift();
      if (next === undefined) break;
      const attempt = (attempts.get(next.url) ?? 0) + 1;
      attempts.set(next.url, attempt);
      if (outcome(next.url, attempt)) next.resolve();
      else next.reject();
      await tick();
    }
  };
  const fire = (ms: number): void => {
    for (const timer of timers.filter(
      (entry) => entry.live && entry.ms === ms,
    )) {
      timer.live = false;
      timer.callback();
    }
  };
  return {
    options,
    pending,
    stored,
    warnings,
    calls,
    tick,
    drain,
    fire,
    peak: () => peak,
  };
}

const urls = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `/art/${index}.png`);

describe("asset preloader", () => {
  it("loads every distinct raster into the store and reports progress", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({ ...h.options, concurrency: 4 });
    const progress: AssetPreloadProgressV7[] = [];
    const list = [...urls(10), "/art/3.png", "/art/7.png"];
    expect(preloader.covers(list)).toBe(false);
    const done = preloader.preload(list, (update) => progress.push(update));
    await h.drain();
    expect(await done).toEqual({
      total: 10,
      loaded: 10,
      failed: [],
      unfinished: 0,
    });
    expect(h.calls).toHaveLength(10);
    expect([...h.stored.keys()].sort()).toEqual(urls(10).sort());
    expect(h.stored.get("/art/4.png")).toBe("decoded:/art/4.png");
    // Starts at nothing, never goes back, ends at everything.
    expect(progress[0]).toEqual({ settled: 0, total: 10 });
    expect(progress.at(-1)).toEqual({ settled: 10, total: 10 });
    expect(progress.map((update) => update.settled)).toEqual(
      Array.from({ length: 11 }, (_, index) => index),
    );
    expect(h.warnings).toEqual([]);
    expect(preloader.covers(list)).toBe(true);
  });

  it("keeps at most `concurrency` rasters in flight", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({ ...h.options, concurrency: 3 });
    const done = preloader.preload(urls(20));
    await h.tick();
    expect(h.pending).toHaveLength(3);
    await h.drain();
    await done;
    expect(h.peak()).toBe(3);
    expect(h.calls).toHaveLength(20);
  });

  it("retries a failed raster once, then reports it once and goes on", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({ ...h.options, concurrency: 2 });
    const progress: AssetPreloadProgressV7[] = [];
    const done = preloader.preload(urls(6), (update) => progress.push(update));
    // 1 fails twice (reported), 4 fails once and then loads.
    await h.drain(
      (url, attempt) =>
        !(url === "/art/1.png" || (url === "/art/4.png" && attempt === 1)),
    );
    const result = await done;
    expect(result).toEqual({
      total: 6,
      loaded: 5,
      failed: ["/art/1.png"],
      unfinished: 0,
    });
    expect(h.stored.has("/art/1.png")).toBe(false);
    expect(h.stored.has("/art/4.png")).toBe(true);
    expect(h.calls.filter((url) => url === "/art/1.png")).toHaveLength(2);
    expect(h.calls.filter((url) => url === "/art/4.png")).toHaveLength(2);
    expect(h.warnings).toHaveLength(1);
    expect(h.warnings[0]).toContain("1 of 6");
    expect(h.warnings[0]).toContain("/art/1.png");
    expect(progress.at(-1)).toEqual({ settled: 6, total: 6 });
  });

  it("survives a loader that throws and a raster that never arrives", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({
      ...h.options,
      load: (url) => {
        if (url === "/art/0.png") throw new Error("no image support");
        return h.options.load(url);
      },
      concurrency: 2,
      assetTimeoutMs: 500,
      budgetMs: 9_000,
    });
    const done = preloader.preload(urls(3));
    await h.tick();
    // 1 loads; 2 hangs: both of its attempts time out.
    h.pending.find((entry) => entry.url === "/art/1.png")?.resolve();
    await h.tick();
    h.fire(500);
    await h.tick();
    h.fire(500);
    await h.tick();
    const result = await done;
    expect(result.loaded).toBe(1);
    expect([...result.failed].sort()).toEqual(["/art/0.png", "/art/2.png"]);
    expect(h.warnings).toHaveLength(1);
  });

  it("stops waiting when the time budget runs out; late rasters still reach the store", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({
      ...h.options,
      concurrency: 2,
      assetTimeoutMs: 500,
      budgetMs: 9_000,
    });
    const progress: AssetPreloadProgressV7[] = [];
    const done = preloader.preload(urls(4), (update) => progress.push(update));
    await h.tick();
    h.pending.shift()?.resolve();
    await h.tick();
    h.fire(9_000);
    expect(await done).toEqual({
      total: 4,
      loaded: 1,
      failed: [],
      unfinished: 3,
    });
    const reported = progress.length;
    await h.drain();
    expect(h.stored.size).toBe(4);
    // The caller has moved on: no progress after the preload resolved.
    expect(progress).toHaveLength(reported);
  });

  it("loads the front alone, then the rest; progress counts every file", async () => {
    const h = harness();
    const preloader = createAssetPreloaderV7({ ...h.options, concurrency: 8 });
    const progress: AssetPreloadProgressV7[] = [];
    const done = preloader.preload(
      urls(12),
      (update) => progress.push(update),
      { front: 3 },
    );
    await h.tick();
    // Eight lanes, but only the three front files are in flight.
    expect(h.pending.map((entry) => entry.url)).toEqual(urls(3));
    h.pending.shift()?.resolve();
    h.pending.shift()?.resolve();
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual(["/art/2.png"]);
    h.pending.shift()?.resolve();
    await h.tick();
    // The front has settled: every lane starts on the rest.
    expect(h.pending.map((entry) => entry.url)).toEqual(urls(11).slice(3));
    await h.drain();
    expect(await done).toEqual({
      total: 12,
      loaded: 12,
      failed: [],
      unfinished: 0,
    });
    expect(h.peak()).toBe(8);
    expect(progress.map((update) => update.settled)).toEqual(
      Array.from({ length: 13 }, (_, index) => index),
    );
    expect(progress.every((update) => update.total === 12)).toBe(true);
  });

  it("a failed front file releases the rest; a stuck one only until the hold runs out", async () => {
    const failing = harness();
    const first = createAssetPreloaderV7({
      ...failing.options,
      concurrency: 4,
    });
    const failed = first.preload(urls(6), undefined, { front: 1 });
    await failing.tick();
    failing.pending.shift()?.reject();
    await failing.tick();
    // Its second attempt is still the only file in flight.
    expect(failing.pending.map((entry) => entry.url)).toEqual(["/art/0.png"]);
    failing.pending.shift()?.reject();
    await failing.tick();
    expect(failing.pending).toHaveLength(4);
    await failing.drain();
    expect((await failed).failed).toEqual(["/art/0.png"]);

    const stuck = harness();
    const second = createAssetPreloaderV7({
      ...stuck.options,
      concurrency: 4,
      frontHoldMs: 700,
    });
    const held = second.preload(urls(6), undefined, { front: 2 });
    await stuck.tick();
    stuck.pending.shift()?.resolve();
    await stuck.tick();
    expect(stuck.pending.map((entry) => entry.url)).toEqual(["/art/1.png"]);
    stuck.fire(700);
    await stuck.tick();
    // The stuck file keeps its lane; the other three take the rest.
    expect(stuck.pending.map((entry) => entry.url)).toEqual([
      "/art/1.png",
      "/art/2.png",
      "/art/3.png",
      "/art/4.png",
    ]);
    await stuck.drain();
    expect((await held).loaded).toBe(6);
    expect(stuck.peak()).toBe(4);
  });

  it("holds nothing back when the front is already stored or is the whole list", async () => {
    const h = harness();
    h.stored.set("/art/0.png", "decoded");
    h.stored.set("/art/1.png", "decoded");
    const preloader = createAssetPreloaderV7({ ...h.options, concurrency: 3 });
    const done = preloader.preload(urls(6), undefined, { front: 2 });
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual(urls(5).slice(2));
    await h.drain();
    expect((await done).total).toBe(4);

    const whole = harness();
    const all = createAssetPreloaderV7({ ...whole.options, concurrency: 3 });
    const finished = all.preload(urls(5), undefined, { front: 9 });
    await whole.tick();
    expect(whole.pending).toHaveLength(3);
    await whole.drain();
    expect((await finished).loaded).toBe(5);
  });

  it("has nothing to do for rasters already in the store", async () => {
    const h = harness();
    h.stored.set("/art/0.png", "decoded");
    h.stored.set("/art/1.png", "decoded");
    const preloader = createAssetPreloaderV7(h.options);
    const progress: AssetPreloadProgressV7[] = [];
    expect(
      await preloader.preload(urls(2), (update) => progress.push(update)),
    ).toEqual({ total: 0, loaded: 0, failed: [], unfinished: 0 });
    expect(h.calls).toEqual([]);
    expect(progress).toEqual([{ settled: 0, total: 0 }]);
  });
});

describe("preloaded rasters", () => {
  afterEach(() => resetPreloadedRastersV7());

  /** A document whose images never load: only the store can settle one. */
  function inertDocument(): { document: Document; created: string[] } {
    const created: string[] = [];
    const document = {
      createElement: () => {
        const image = {
          addEventListener: () => undefined,
          set src(value: string) {
            created.push(value);
          },
        };
        return image;
      },
    } as unknown as Document;
    return { document, created };
  }

  it("hands a preloaded raster to a loader at once; anything else loads on demand", () => {
    const { document, created } = inertDocument();
    const decoded = { decoded: true } as unknown as HTMLImageElement;
    storePreloadedRasterV7("/ready.png", decoded);
    expect(preloadedRasterV7("/ready.png")).toBe(decoded);
    const environment = browserChibiRasterEnvironmentV7(document);
    const settled: boolean[] = [];
    expect(environment.loadImage("/ready.png", (ok) => settled.push(ok))).toBe(
      decoded,
    );
    expect(settled).toEqual([true]);
    expect(created).toEqual([]);
    // Before the preload ends a load on demand is ordinary and not recorded.
    environment.loadImage("/early.png", () => undefined);
    expect(lazyRasterLoadsV7()).toEqual([]);
    markRasterPreloadCompleteV7();
    environment.loadImage("/late.png", () => undefined);
    environment.loadImage("/late.png", () => undefined);
    expect(created).toEqual(["/early.png", "/late.png", "/late.png"]);
    expect(lazyRasterLoadsV7()).toEqual(["/late.png"]);
  });

  it("draws a preloaded sprite on the first resolve, with no loading state and no redraw", () => {
    const { document } = inertDocument();
    const asset = {
      id: "fighter",
      subject: "UNIT:FIGHTER",
      assetClass: "STANDARD_UNIT",
      width: 56,
      height: 80,
      url: "/fighter.png",
      fixedColours: true,
    } as const;
    const request = {
      subject: asset.subject,
      at: { x: 0, y: 0 },
      deviceScale: 1,
    };
    const resolver = (redraw: () => void) =>
      createChibiArtResolverV7({
        environment: browserChibiRasterEnvironmentV7(document),
        registry: buildChibiArtRegistryV7([asset]).registry,
        redraw,
      });
    // Not preloaded: the piece waits for its file (the first-sight flicker).
    expect(resolver(() => undefined).resolve(request).kind).toBe("LOADING");
    const decoded = { decoded: true } as unknown as HTMLImageElement;
    storePreloadedRasterV7(asset.url, decoded);
    let redraws = 0;
    const first = resolver(() => (redraws += 1)).resolve(request);
    expect(first.kind).toBe("READY");
    expect(first.kind === "READY" && first.image).toBe(decoded);
    expect(redraws).toBe(0);
  });

  it("gives the fallback (PixelLab) board resolver a preloaded raster on the first ask", () => {
    const { document, created } = inertDocument();
    const [id, url] = Object.entries(ACCEPTED_ART_URLS)[0] ?? ["", ""];
    let redraws = 0;
    const lazy = createBoardImageResolverV7(document, () => (redraws += 1));
    expect(lazy.resolve(id)).toBeNull();
    expect(created).toEqual([url]);
    const decoded = { decoded: true } as unknown as HTMLImageElement;
    storePreloadedRasterV7(url, decoded);
    const ready = createBoardImageResolverV7(document, () => (redraws += 1));
    expect(ready.resolve(id)).toBe(decoded);
    expect(ready.resolve(id)).toBe(decoded);
    expect(created).toEqual([url]);
    expect(redraws).toBe(0);
  });
});
