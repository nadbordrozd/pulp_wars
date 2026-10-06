// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assetInventoryV7,
  assetPreloadUrlsV7,
  soundAssetUrlsV7,
} from "../../src/assets/asset-inventory-v7";
import type {
  AssetPreloadProgressV7,
  AssetPreloadResultV7,
  AssetPreloaderV7,
} from "../../src/app/asset-preloader-v7";
import { bootstrapPreloadedRuleset7App } from "../../src/app/v7-preload-boot";
import {
  STOCK_SOUND_ALL_CLIPS_V1,
  STOCK_SOUND_CLIPS_V1,
  STOCK_SOUND_PICKS_STORAGE_KEY_V1,
  stockSoundCandidateV1,
  stockSoundUrlV1,
} from "../../src/audio/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  lazyRasterLoadsV7,
  resetPreloadedRastersV7,
} from "../../src/render/canvas/preloaded-rasters-v7";
import { mountLoadingScreenV7 } from "../../src/render/dom/loading-screen-v7";

/**
 * The start of the game behind the asset preloader (bead pulp_wars-2yc.6):
 * nothing of the app (front screen or match) is in the document before the
 * preload resolves, the loading screen is an icon and a progress bar, and
 * a failed preload still starts the game.
 */
class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  callbacks: BoardHostCallbacksV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  resetInspectionCycle(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

/** A preloader whose preloads the test settles by hand. */
function manualPreloader(covered = false) {
  const requests: {
    readonly urls: readonly string[];
    readonly onProgress:
      ((progress: AssetPreloadProgressV7) => void) | undefined;
    readonly resolve: (result: AssetPreloadResultV7) => void;
    readonly reject: (error: Error) => void;
  }[] = [];
  const loaded = new Set<string>();
  const preloader: AssetPreloaderV7 = {
    covers: (urls) => covered || urls.every((url) => loaded.has(url)),
    preload: (urls, onProgress) =>
      new Promise((resolve, reject) => {
        requests.push({
          urls,
          onProgress,
          resolve: (result) => {
            for (const url of urls) loaded.add(url);
            resolve(result);
          },
          reject,
        });
      }),
  };
  return { preloader, requests };
}

const result = (total: number): AssetPreloadResultV7 => ({
  total,
  loaded: total,
  failed: [],
  unfinished: 0,
});

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

const query = (selector: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(selector);

function appShown(): boolean {
  return (
    query(".v7-front-screen") !== null ||
    query("[data-v7-setup]") !== null ||
    query("canvas") !== null ||
    query('[data-action="launch"]') !== null
  );
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  resetPreloadedRastersV7();
});
afterEach(() => resetPreloadedRastersV7());

describe("Ruleset 7 start behind the asset preloader", () => {
  it("shows only the loading screen until the preload resolves, then the game; the match draws after it", async () => {
    const { preloader, requests } = manualPreloader();
    const host = new Host();
    // The loading screen is silent: no AudioContext exists while the art
    // loads, nor when the app mounts (sound waits for a user gesture).
    let audioContexts = 0;
    Reflect.set(window, "AudioContext", function AudioContext() {
      audioContexts += 1;
    });
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    expect(audioContexts).toBe(0);
    // The whole live look, every faction, is asked for at once.
    expect(requests).toHaveLength(1);
    expect(requests[0]?.urls).toEqual(assetPreloadUrlsV7("LIVE"));
    expect(requests[0]?.urls).toHaveLength(assetInventoryV7("LIVE").length);

    // Icon and bar, no visible text, and nothing of the app.
    const loading = query("[data-v7-loading]");
    expect(loading).not.toBeNull();
    expect(loading?.textContent).toBe("");
    expect(loading?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const bar = query('[role="progressbar"]');
    expect(bar?.getAttribute("aria-label")).toBe("Loading");
    expect(bar?.getAttribute("aria-valuenow")).toBe("0");
    expect(appShown()).toBe(false);
    expect(host.model).toBeNull();

    requests[0]?.onProgress?.({ settled: 335, total: 670 });
    expect(bar?.getAttribute("aria-valuenow")).toBe("50");
    expect(bar?.querySelector<HTMLElement>("span")?.style.width).toBe("50%");
    // The bar never runs backwards.
    requests[0]?.onProgress?.({ settled: 100, total: 670 });
    expect(bar?.getAttribute("aria-valuenow")).toBe("50");
    await flush();
    expect(appShown()).toBe(false);

    requests[0]?.resolve(result(670));
    const app = await starting;
    expect(query("[data-v7-loading]")).toBeNull();
    expect(query("[data-v7-setup]")).not.toBeNull();
    expect(app.preload).toMatchObject({
      look: "LIVE",
      total: 670,
      loaded: 670,
    });
    expect(app.lazyAssetLoads()).toEqual(lazyRasterLoadsV7());
    expect(audioContexts).toBe(0);
    Reflect.deleteProperty(window, "AudioContext");

    // The match is drawn by the app mounted after the preload.
    expect(host.model).toBeNull();
    query('[data-action="launch"]')?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(host.model?.artSet).toBe("CHIBI");
    expect(query("canvas.board-canvas-v7")).not.toBeNull();
    app.destroy();
  });

  it("does not flash the loading screen when the art is already cached", async () => {
    const { preloader, requests } = manualPreloader();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    expect(query("[data-v7-loading]")).toBeNull();
    expect(appShown()).toBe(false);
    requests[0]?.resolve(result(670));
    const app = await starting;
    expect(query("[data-v7-loading]")).toBeNull();
    expect(query("[data-v7-setup]")).not.toBeNull();
    // The delayed loading screen never replaces the mounted game.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(query("[data-v7-loading]")).toBeNull();
    expect(query("[data-v7-setup]")).not.toBeNull();
    app.destroy();
  });

  it("starts the game when the preload fails", async () => {
    const { preloader, requests } = manualPreloader();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    requests[0]?.reject(new Error("offline"));
    const app = await starting;
    expect(query("[data-v7-loading]")).toBeNull();
    expect(query("[data-v7-setup]")).not.toBeNull();
    expect(app.preload).toMatchObject({ total: 0, loaded: 0 });
    app.destroy();
  });

  it("preloads the look in use: LEGACY for the legacy art set, the classic look when it is stored", async () => {
    const legacy = manualPreloader();
    const first = bootstrapPreloadedRuleset7App(document, {
      preloader: legacy.preloader,
      artSet: "LEGACY",
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    expect(legacy.requests[0]?.urls).toEqual(assetPreloadUrlsV7("LEGACY"));
    legacy.requests[0]?.resolve(result(1));
    (await first).destroy();

    document.body.innerHTML = '<div id="app"></div>';
    window.localStorage.setItem(
      "pulpWars.ruleset7.boardClassicLook.v1",
      '{"classic":true}',
    );
    const classic = manualPreloader();
    const second = bootstrapPreloadedRuleset7App(document, {
      preloader: classic.preloader,
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    expect(classic.requests[0]?.urls).toEqual(assetPreloadUrlsV7("CLASSIC"));
    classic.requests[0]?.resolve(result(1));
    (await second).destroy();
  });

  it("preloads the other look before the Classic look option switches to it", async () => {
    window.localStorage.setItem(
      "pulpWars.ruleset7.boardClassicLook.v1",
      '{"classic":true}',
    );
    const { preloader, requests } = manualPreloader();
    const host = new Host();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    requests[0]?.resolve(result(1));
    const app = await starting;
    query('[data-action="launch"]')?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);

    if (query('[data-action="settings"]') === null)
      query('[data-action="compact-menu"]')?.click();
    query('[data-action="settings"]')?.click();
    const toggle = document.querySelector<HTMLInputElement>("#v7-classic-look");
    expect(toggle?.checked).toBe(true);
    toggle?.click();
    // The live look's own art is not loaded yet: the board keeps the
    // classic look until it is.
    expect(requests).toHaveLength(2);
    expect(requests[1]?.urls).toEqual(assetPreloadUrlsV7("LIVE"));
    await flush();
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);
    requests[1]?.resolve(result(1));
    await waitUntil(
      () => host.model !== null && "visualDirection" in host.model,
    );
    expect(
      document.querySelector<HTMLInputElement>("#v7-classic-look")?.checked,
    ).toBe(false);

    // Back to the classic look: it is part of what is loaded, no wait.
    document.querySelector<HTMLInputElement>("#v7-classic-look")?.click();
    expect(requests).toHaveLength(2);
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);
    app.destroy();
  });
});

describe("loading screen", () => {
  it("is an icon over a progress bar and leaves the root empty when it goes", () => {
    const root = query("#app");
    if (root === null) throw new Error("#app missing");
    const screen = mountLoadingScreenV7(document, root);
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
    expect(root.textContent).toBe("");
    screen.update({ settled: 0, total: 0 });
    expect(
      root.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    ).toBe("100");
    screen.destroy();
    expect(root.childElementCount).toBe(0);
  });
});

/**
 * The recorded sound clips at the start (bead pulp_wars-2yc.20,
 * docs/ui/SOUND.md "Stock recordings"): asked for beside the art, never
 * waited for, and never in the way of the game starting.
 */
describe("Ruleset 7 start and the sound clips", () => {
  it("asks for every clip at once and does not wait for any of them", async () => {
    const { preloader, requests } = manualPreloader();
    const asked: (readonly string[])[] = [];
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
      randomSeed: () => 7,
      // Nothing ever answers: the clips are still loading.
      prefetchSounds: (urls) => asked.push(urls),
    });
    await flush();
    // Asked for while the loading screen shows, before the art is in.
    expect(query("[data-v7-loading]")).not.toBeNull();
    expect(asked).toEqual([soundAssetUrlsV7()]);
    expect(asked[0]?.length).toBeGreaterThan(0);
    // The art's own list has no sound file in it.
    expect(
      requests[0]?.urls.filter((url) => url.includes("assets/audio/")),
    ).toEqual([]);
    requests[0]?.resolve({
      total: 1,
      loaded: 1,
      failed: [],
      unfinished: 0,
    });
    const app = await starting;
    // The game is there although no clip has arrived.
    expect(query("[data-v7-loading]")).toBeNull();
    expect(appShown()).toBe(true);
    app.destroy();
  });

  it("asks for one clip a sound: its default, or the one this browser picked", async () => {
    const urlOf = (id: string, n: number): string => {
      const clip = stockSoundCandidateV1(id, n);
      if (clip === null) throw new Error(`${id} #${n}`);
      return stockSoundUrlV1(clip);
    };
    const start = async (): Promise<readonly string[]> => {
      const { preloader, requests } = manualPreloader();
      const asked: (readonly string[])[] = [];
      const starting = bootstrapPreloadedRuleset7App(document, {
        preloader,
        loadingScreenDelayMs: 0,
        storage: null,
        boardHost: new Host(),
        randomSeed: () => 7,
        prefetchSounds: (urls) => asked.push(urls),
      });
      await flush();
      requests[0]?.resolve({ total: 0, loaded: 0, failed: [], unfinished: 0 });
      (await starting).destroy();
      document.body.innerHTML = '<div id="app"></div>';
      expect(asked).toHaveLength(1);
      return asked[0] ?? [];
    };
    // Without a pick: the defaults, and no alternative.
    const defaults = await start();
    expect(defaults).toEqual(
      STOCK_SOUND_CLIPS_V1.map((clip) => stockSoundUrlV1(clip)),
    );
    expect(defaults.length).toBeLessThan(STOCK_SOUND_ALL_CLIPS_V1.length);
    expect(defaults).toContain(urlOf("impact.hit", 1));
    expect(defaults).not.toContain(urlOf("impact.hit", 2));
    expect(defaults).not.toContain(urlOf("unit.death", 1));
    // With stored picks: the picked recordings instead.
    window.localStorage.setItem(
      STOCK_SOUND_PICKS_STORAGE_KEY_V1,
      JSON.stringify({
        "impact.hit": 2,
        "unit.death": 1,
        "impact.heavy": 0,
        "impact.ice": 99,
      }),
    );
    const picked = await start();
    expect(picked).toContain(urlOf("impact.hit", 2));
    expect(picked).not.toContain(urlOf("impact.hit", 1));
    expect(picked).toContain(urlOf("unit.death", 1));
    expect(picked).not.toContain(urlOf("impact.heavy", 1));
    // A pick of a recording that does not exist is no pick.
    expect(picked).toContain(urlOf("impact.ice", 1));
    expect(picked.length).toBe(defaults.length);
  });

  it("starts the game when asking for the clips fails", async () => {
    const { preloader, requests } = manualPreloader();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
      randomSeed: () => 7,
      prefetchSounds: () => {
        throw new Error("no network");
      },
    });
    await flush();
    requests[0]?.resolve({ total: 0, loaded: 0, failed: [], unfinished: 0 });
    const app = await starting;
    expect(appShown()).toBe(true);
    app.destroy();
  });

  it("asks for no clip with ?stock-sounds=0", async () => {
    window.history.replaceState(null, "", "?stock-sounds=0");
    try {
      const { preloader, requests } = manualPreloader();
      const asked: (readonly string[])[] = [];
      const starting = bootstrapPreloadedRuleset7App(document, {
        preloader,
        loadingScreenDelayMs: 0,
        storage: null,
        boardHost: new Host(),
        randomSeed: () => 7,
        prefetchSounds: (urls) => asked.push(urls),
      });
      await flush();
      expect(asked).toEqual([[]]);
      expect(soundAssetUrlsV7(false)).toEqual([]);
      requests[0]?.resolve({ total: 0, loaded: 0, failed: [], unfinished: 0 });
      (await starting).destroy();
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});
