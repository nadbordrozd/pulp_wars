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
import {
  backgroundPreloadUrlsV7,
  bootstrapPreloadedRuleset7App,
  startAssetTiersV7,
  startPreloadUrlsV7,
} from "../../src/app/v7-preload-boot";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import { factionAssetUrlsV7 } from "../../src/assets/asset-inventory-v7";
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
  storePreloadedRasterV7,
} from "../../src/render/canvas/preloaded-rasters-v7";
import type { ChibiRasterEnvironmentV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { mountLoadingScreenV7 } from "../../src/render/dom/loading-screen-v7";
import { titleSceneAssetUrlsV7 } from "../../src/render/title-scene-v7";

/**
 * The start of the game behind the asset preloader (bead pulp_wars-2yc.6):
 * nothing of the app (front screen or match) is in the document before the
 * preload resolves, the loading screen is the title scene with a progress
 * bar over it (bead pulp_wars-502h), and a failed preload still starts the
 * game.
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
    /** Files asked to load alone first (the loading screen's scene). */
    readonly front: number;
    /** Asked for by something on screen: ahead of the background. */
    readonly urgent: boolean;
    readonly resolve: (result: AssetPreloadResultV7) => void;
    readonly reject: (error: Error) => void;
  }[] = [];
  const loaded = new Set<string>();
  const preloader: AssetPreloaderV7 = {
    covers: (urls) => covered || urls.every((url) => loaded.has(url)),
    preload: (urls, onProgress, options) =>
      new Promise((resolve, reject) => {
        requests.push({
          urls,
          onProgress,
          front: options?.front ?? 0,
          urgent: options?.urgent === true,
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
    // Only the FRONT tier of the live look is asked for before the title
    // (pulp_wars-2yc.42): the loading screen's scene first, then the
    // shared art, each file once. No faction's own art yet.
    expect(requests).toHaveLength(1);
    expect(requests[0]?.urls).toEqual(startPreloadUrlsV7("LIVE"));
    expect(requests[0]?.urls).toEqual(startAssetTiersV7("LIVE").front);
    expect(requests[0]?.urls.length).toBeLessThan(
      assetInventoryV7("LIVE").length / 2,
    );
    const scene = titleSceneAssetUrlsV7();
    expect(requests[0]?.urls.slice(0, scene.length)).toEqual(scene);
    // The scene's files load alone before the rest (pulp_wars-2yc.11).
    expect(requests[0]?.front).toBe(scene.length);
    expect(new Set(scene).size).toBe(scene.length);
    const background = backgroundPreloadUrlsV7("LIVE");
    expect(background.length).toBeGreaterThan(300);
    for (const url of background) expect(requests[0]?.urls).not.toContain(url);

    // The labelled bar on its plate over the backdrop, and nothing of the
    // app; the scene waits for its rasters.
    const loading = query("[data-v7-loading]");
    expect(loading).not.toBeNull();
    expect(loading?.dataset.scene).toBe("waiting");
    expect(loading?.querySelector(".v7-title-scene")).toBeNull();
    expect(loading?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const bar = query('[role="progressbar"]');
    const labelId = bar?.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId ?? "")?.textContent).toBe("Loading");
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

    // With the title up, the factions' art loads in the background: every
    // file the title did not wait for, behind nothing urgent.
    await waitUntil(() => requests.length === 2);
    expect(requests[1]?.urls).toEqual(background);
    expect(requests[1]?.urgent).toBe(false);
    expect(app.assetsSettled()).toBe(false);
    requests[1]?.resolve(result(background.length));
    await app.background;
    expect(app.assetsSettled()).toBe(true);

    // The match is drawn by the app mounted after the preload; its
    // factions' art is in, so it is drawn at once.
    expect(host.model).toBeNull();
    query('[data-action="launch"]')?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    await waitUntil(() => host.model !== null);
    expect(host.model?.artSet).toBe("CHIBI");
    expect(query("canvas.board-canvas-v7")).not.toBeNull();
    expect(requests).toHaveLength(2);
    expect(query("[data-v7-art-wait]")).toBeNull();
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

  it("shows the scene once the preloader holds its rasters, with the stored motion; none for the legacy set", async () => {
    window.localStorage.setItem(
      "pulpWars.settings.v1",
      JSON.stringify({
        format: "pulp-wars-settings",
        version: 1,
        settings: {
          uiScale: 1,
          motion: "REDUCED",
          animationSpeed: "NORMAL",
          highContrast: false,
        },
      }),
    );
    const { preloader, requests } = manualPreloader();
    const held = new Set<string>();
    const covering: AssetPreloaderV7 = {
      covers: (urls) => urls.every((url) => held.has(url)),
      preload: (urls, onProgress) => preloader.preload(urls, onProgress),
    };
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader: covering,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    const loading = query("[data-v7-loading]");
    expect(query(".v7-app-shell")?.dataset.motion).toBe("reduced");
    expect(loading?.dataset.scene).toBe("waiting");
    const scene = titleSceneAssetUrlsV7();
    // All but one of the scene's files: still the plain backdrop.
    for (const url of scene.slice(1)) held.add(url);
    requests[0]?.onProgress?.({ settled: scene.length - 1, total: 900 });
    expect(loading?.querySelector(".v7-title-scene")).toBeNull();
    held.add(scene[0] ?? "");
    requests[0]?.onProgress?.({ settled: scene.length, total: 900 });
    expect(loading?.dataset.scene).toBe("ready");
    expect(loading?.querySelector(".v7-title-scene")).not.toBeNull();
    requests[0]?.resolve(result(900));
    const app = await starting;
    expect(query("[data-v7-loading]")).toBeNull();
    app.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const legacy = manualPreloader(true);
    const second = bootstrapPreloadedRuleset7App(document, {
      preloader: legacy.preloader,
      artSet: "LEGACY",
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
    });
    await flush();
    expect(query("[data-v7-loading]")?.dataset.scene).toBe("none");
    legacy.requests[0]?.resolve(result(1));
    (await second).destroy();
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
    // The legacy art set has no scene: its own inventory, as it was.
    expect(legacy.requests[0]?.urls).toEqual(assetPreloadUrlsV7("LEGACY"));
    expect(startPreloadUrlsV7("LEGACY")).toEqual(assetPreloadUrlsV7("LEGACY"));
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
    // The classic look's FRONT tier after the scene, which its title
    // screen draws with the direction's art; its factions' art after the
    // title. Together: the scene and the classic look's inventory.
    expect(classic.requests[0]?.urls).toEqual(startPreloadUrlsV7("CLASSIC"));
    classic.requests[0]?.resolve(result(1));
    const classicApp = await second;
    await waitUntil(() => classic.requests.length === 2);
    expect(classic.requests[1]?.urls).toEqual(
      backgroundPreloadUrlsV7("CLASSIC"),
    );
    expect(
      new Set([
        ...(classic.requests[0]?.urls ?? []),
        ...(classic.requests[1]?.urls ?? []),
      ]),
    ).toEqual(
      new Set([...titleSceneAssetUrlsV7(), ...assetPreloadUrlsV7("CLASSIC")]),
    );
    classicApp.destroy();
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
    // The classic look's factions are in before the match is launched.
    await waitUntil(() => requests.length === 2);
    requests[1]?.resolve(result(1));
    await app.background;
    query('[data-action="launch"]')?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    await waitUntil(() => host.model !== null);
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);

    if (query('[data-action="settings"]') === null)
      query('[data-action="compact-menu"]')?.click();
    query('[data-action="settings"]')?.click();
    const toggle = document.querySelector<HTMLInputElement>("#v7-classic-look");
    expect(toggle?.checked).toBe(true);
    toggle?.click();
    // The live look's own art is not loaded yet: the board keeps the
    // classic look until it is. The whole look, every faction, and ahead
    // of anything the background still has queued.
    expect(requests).toHaveLength(3);
    expect(requests[2]?.urls).toEqual(assetPreloadUrlsV7("LIVE"));
    expect(requests[2]?.urgent).toBe(true);
    await flush();
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);
    requests[2]?.resolve(result(1));
    await waitUntil(
      () => host.model !== null && "visualDirection" in host.model,
    );
    expect(
      document.querySelector<HTMLInputElement>("#v7-classic-look")?.checked,
    ).toBe(false);

    // Back to the classic look: it was loaded at the start, no wait.
    document.querySelector<HTMLInputElement>("#v7-classic-look")?.click();
    expect(requests).toHaveLength(3);
    expect(host.model !== null && "visualDirection" in host.model).toBe(false);
    app.destroy();
  });

  it("loads the classic look's own rasters when a page started in the live look switches to it", async () => {
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
    await waitUntil(() => requests.length === 2);
    requests[1]?.resolve(result(1));
    await app.background;
    query('[data-action="launch"]')?.click();
    await waitUntil(() => host.model !== null);
    expect(host.model !== null && "visualDirection" in host.model).toBe(true);

    if (query('[data-action="settings"]') === null)
      query('[data-action="compact-menu"]')?.click();
    query('[data-action="settings"]')?.click();
    document.querySelector<HTMLInputElement>("#v7-classic-look")?.click();
    // The live look did not preload the default rasters it never draws
    // (pulp_wars-2yc.42): the board keeps the live look until they are in.
    expect(requests).toHaveLength(3);
    expect(requests[2]?.urls).toEqual(assetPreloadUrlsV7("CLASSIC"));
    const loaded = new Set([
      ...(requests[0]?.urls ?? []),
      ...(requests[1]?.urls ?? []),
    ]);
    const missing = (requests[2]?.urls ?? []).filter((url) => !loaded.has(url));
    expect(missing.length).toBeGreaterThan(80);
    expect(missing.length).toBeLessThan(200);
    await flush();
    expect(host.model !== null && "visualDirection" in host.model).toBe(true);
    requests[2]?.resolve(result(missing.length));
    await waitUntil(
      () => host.model !== null && !("visualDirection" in host.model),
    );
    // The board of the classic look needs no wait of its own: its
    // factions came with the look.
    expect(requests).toHaveLength(3);
    expect(query("[data-v7-art-wait]")).toBeNull();
    app.destroy();
  });
});

/**
 * A board waits for its factions' art (bead pulp_wars-2yc.42): the title
 * no longer does, so a match or the Gallery opened before the background
 * has finished is held behind the loading plate, and is drawn whole.
 */
describe("Ruleset 7 board entry and the factions' art", () => {
  const bar = (): HTMLElement | null =>
    query("[data-v7-art-wait] [role='progressbar']");

  it("holds a new game's board until its factions are in, behind the plate, and plays no turn meanwhile", async () => {
    const { preloader, requests } = manualPreloader();
    const host = new Host();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    requests[0]?.resolve(result(1));
    const app = await starting;
    await waitUntil(() => requests.length === 2);
    // The background is still loading. A new game, Humans against the
    // Undead by default:
    query('[data-action="new-game"]')?.click();
    query('[data-action="launch"]')?.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    await waitUntil(() => requests.length === 3);
    const setup = query("[data-v7-setup]");
    expect(setup).not.toBeNull();
    const factions =
      app.controller.snapshot().view?.players.map((player) => player.faction) ??
      [];
    expect(factions).toEqual(["ORIGINAL", "UNDEAD"]);
    // Exactly those factions' tiers, ahead of the background's queue.
    const tiers = startAssetTiersV7("LIVE");
    expect(requests[2]?.urls).toEqual(tiers.factions.UNDEAD);
    expect(requests[2]?.urls).toEqual(factionAssetUrlsV7(tiers, factions));
    expect(requests[2]?.urgent).toBe(true);
    // No board: the screen that asked stays where it was, out of reach.
    expect(host.model).toBeNull();
    expect(query("canvas.board-canvas-v7")).toBeNull();
    expect(query("[data-v7-setup]")).toBe(setup);
    expect(setup?.closest("[inert]")).not.toBeNull();
    // A wait this short shows no plate yet; a longer one does.
    expect(query("[data-v7-art-wait]")).toBeNull();
    await waitUntil(() => query("[data-v7-art-wait]") !== null);
    expect(query("[data-v7-art-wait]")?.closest("[inert]")).toBeNull();
    expect(
      query("[data-v7-art-wait]")?.closest(".v7-app-shell"),
    ).not.toBeNull();
    expect(query("[data-v7-setup]")).toBe(setup);
    const label = bar()?.getAttribute("aria-labelledby") ?? "";
    expect(document.getElementById(label)?.textContent).toBe("Loading");
    expect(bar()?.getAttribute("aria-valuenow")).toBe("0");
    requests[2]?.onProgress?.({ settled: 18, total: 72 });
    expect(bar()?.getAttribute("aria-valuenow")).toBe("25");
    // Keys do nothing behind the plate, and a redraw keeps the hold.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await flush();
    expect(requests).toHaveLength(3);
    expect(host.model).toBeNull();
    expect(app.controller.snapshot().view?.commandIndex).toBe(0);

    requests[2]?.resolve(result(72));
    await waitUntil(() => host.model !== null);
    expect(query("[data-v7-art-wait]")).toBeNull();
    expect(query("[inert]")).toBeNull();
    expect(query("canvas.board-canvas-v7")).not.toBeNull();
    expect(host.model?.artSet).toBe("CHIBI");
    app.destroy();
  });

  it("draws the screens before a match from the FRONT tier alone, and a match from its factions' tiers", async () => {
    // A preloader that fills the page's store, as the browser's does.
    const { preloader, requests } = manualPreloader();
    const settle = (index: number): void => {
      const request = requests[index];
      if (request === undefined) throw new Error(`No preload ${index}`);
      for (const url of request.urls)
        storePreloadedRasterV7(url, document.createElement("img"));
      request.resolve(result(request.urls.length));
    };
    const host = new Host();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    settle(0);
    const app = await starting;
    await waitUntil(() => requests.length === 2);
    // No faction's own art is in. The menu, the new-game screen with its
    // tribe picker and seats, the campaign and the settings ask for none.
    for (const page of ["new-game", "campaign", "front-settings"]) {
      query(`[data-action="${page}"]`)?.click();
      await flush();
      expect(
        query(".v7-faction-emblem img") ?? query(".v7-front-page"),
      ).not.toBeNull();
      query('[data-action="front-back"]')?.click();
      await flush();
    }
    expect(app.lazyAssetLoads()).toEqual([]);
    // A match against the Undead: with their tier in, its interface (the
    // HUD, the docks, the leaderboard) asks for nothing more.
    query('[data-action="new-game"]')?.click();
    query('[data-action="launch"]')?.click();
    await waitUntil(() => requests.length === 3);
    settle(2);
    await waitUntil(() => host.model !== null);
    await flush();
    expect(app.lazyAssetLoads()).toEqual([]);
    app.destroy();
  });

  it("opens the Gallery when every faction's art is in", async () => {
    const { preloader, requests } = manualPreloader();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: new Host(),
      galleryDemoHost: () => new Host(),
      randomSeed: () => 7,
    });
    await flush();
    requests[0]?.resolve(result(1));
    const app = await starting;
    await waitUntil(() => requests.length === 2);
    query('[data-action="gallery"]')?.click();
    await waitUntil(() => requests.length === 3);
    expect(requests[2]?.urls).toEqual(
      factionAssetUrlsV7(startAssetTiersV7("LIVE"), FACTION_IDS_V7),
    );
    expect(new Set(requests[2]?.urls)).toEqual(
      new Set(backgroundPreloadUrlsV7("LIVE")),
    );
    expect(requests[2]?.urgent).toBe(true);
    expect(query('[data-phase="gallery"]')).toBeNull();
    expect(query(".v7-main-menu")?.closest("[inert]")).not.toBeNull();
    // A second click while it waits asks for nothing more.
    query('[data-action="gallery"]')?.click();
    expect(requests).toHaveLength(3);
    requests[2]?.resolve(result(1));
    await waitUntil(() => query('[data-phase="gallery"]') !== null);
    expect(query("[data-v7-art-wait]")).toBeNull();
    app.destroy();
  });

  it("does not wait when the art is loaded, or for the legacy art set", async () => {
    // Everything in the store (a return visit): no request, no plate.
    const warm = manualPreloader(true);
    const host = new Host();
    const first = bootstrapPreloadedRuleset7App(document, {
      preloader: warm.preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    warm.requests[0]?.resolve(result(0));
    const app = await first;
    await app.background;
    expect(warm.requests).toHaveLength(1);
    query('[data-action="launch"]')?.click();
    await waitUntil(() => host.model !== null);
    expect(warm.requests).toHaveLength(1);
    expect(query("[data-v7-art-wait]")).toBeNull();
    app.destroy();

    // LEGACY has no faction tier: the title waited for the whole set.
    document.body.innerHTML = '<div id="app"></div>';
    const legacy = manualPreloader();
    const legacyHost = new Host();
    const second = bootstrapPreloadedRuleset7App(document, {
      preloader: legacy.preloader,
      artSet: "LEGACY",
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: legacyHost,
      randomSeed: () => 7,
    });
    await flush();
    legacy.requests[0]?.resolve(result(1));
    const legacyApp = await second;
    await legacyApp.background;
    query('[data-action="launch"]')?.click();
    await waitUntil(() => legacyHost.model !== null);
    expect(legacy.requests).toHaveLength(1);
    legacyApp.destroy();
  });

  it("holds a resumed game's board the same way", async () => {
    // A first visit leaves a saved game against the Undead.
    const warm = manualPreloader(true);
    const first = bootstrapPreloadedRuleset7App(document, {
      preloader: warm.preloader,
      loadingScreenDelayMs: 0,
      storage: window.localStorage,
      boardHost: new Host(),
      randomSeed: () => 7,
    });
    await flush();
    warm.requests[0]?.resolve(result(0));
    const before = await first;
    query('[data-action="launch"]')?.click();
    await waitUntil(() => before.controller.snapshot().phase === "ACTIVE");
    before.destroy();

    // The next visit: the title is up, the factions' art is not in yet.
    document.body.innerHTML = '<div id="app"></div>';
    const { preloader, requests } = manualPreloader();
    const host = new Host();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: window.localStorage,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    requests[0]?.resolve(result(1));
    const app = await starting;
    expect(app.controller.snapshot().phase).toBe("RESUMABLE");
    await waitUntil(() => requests.length === 2);
    query('[data-action="resume"]')?.click();
    await waitUntil(() => requests.length === 3);
    expect(requests[2]?.urls).toEqual(
      startAssetTiersV7("LIVE").factions.UNDEAD,
    );
    expect(requests[2]?.urgent).toBe(true);
    await flush();
    expect(app.controller.snapshot().phase).toBe("ACTIVE");
    expect(host.model).toBeNull();
    expect(query(".v7-main-menu")?.closest("[inert]")).not.toBeNull();
    requests[2]?.resolve(result(1));
    await waitUntil(() => host.model !== null);
    expect(query("[inert]")).toBeNull();
    app.destroy();
  });

  it("draws the board all the same when the wait fails", async () => {
    const { preloader, requests } = manualPreloader();
    const host = new Host();
    const starting = bootstrapPreloadedRuleset7App(document, {
      preloader,
      loadingScreenDelayMs: 0,
      storage: null,
      boardHost: host,
      randomSeed: () => 7,
    });
    await flush();
    requests[0]?.resolve(result(1));
    const app = await starting;
    await waitUntil(() => requests.length === 2);
    query('[data-action="launch"]')?.click();
    await waitUntil(() => requests.length === 3);
    expect(host.model).toBeNull();
    requests[2]?.reject(new Error("offline"));
    await waitUntil(() => host.model !== null);
    expect(query("[data-v7-art-wait]")).toBeNull();
    app.destroy();
  });
});

describe("loading screen", () => {
  const environment: ChibiRasterEnvironmentV7 = {
    loadImage: (_url, settle) => {
      settle(true);
      return {} as CanvasImageSource;
    },
    readPixels: () => null,
    createSurface: () => null,
  };

  it("is a labelled progress bar on a plate and leaves the root empty when it goes", () => {
    const root = query("#app");
    if (root === null) throw new Error("#app missing");
    const screen = mountLoadingScreenV7(document, root);
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
    expect(query(".v7-loading-plate [role='progressbar']")).not.toBeNull();
    // Without a scene the plain backdrop stays.
    expect(query("[data-v7-loading]")?.dataset.scene).toBe("none");
    expect(query(".v7-loading-label")?.textContent).toBe("Loading");
    // The percentage repeats the bar's value and is hidden from it.
    const percent = query(".v7-loading-percent");
    expect(percent?.getAttribute("aria-hidden")).toBe("true");
    expect(percent?.textContent).toBe("0%");
    screen.update({ settled: 21, total: 50 });
    expect(percent?.textContent).toBe("42%");
    screen.update({ settled: 0, total: 0 });
    expect(
      root.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    ).toBe("100");
    expect(percent?.textContent).toBe("100%");
    screen.destroy();
    expect(root.childElementCount).toBe(0);
  });

  it("shows the title scene whole once its rasters are in, never before", () => {
    const root = query("#app");
    if (root === null) throw new Error("#app missing");
    let ready = false;
    let asked = 0;
    const screen = mountLoadingScreenV7(document, root, {
      motion: "REDUCED",
      scene: {
        environment,
        ready: () => {
          asked += 1;
          return ready;
        },
      },
    });
    const main = query("[data-v7-loading]");
    expect(main?.dataset.scene).toBe("waiting");
    expect(query(".v7-title-scene")).toBeNull();
    expect(query(".v7-app-shell")?.dataset.motion).toBe("reduced");
    screen.update({ settled: 5, total: 900 });
    expect(query(".v7-title-scene")).toBeNull();
    ready = true;
    screen.update({ settled: 90, total: 900 });
    expect(main?.dataset.scene).toBe("ready");
    const scene = query(".v7-title-scene");
    // Behind the plate, hidden from assistive technology.
    expect(main?.firstElementChild).toBe(scene);
    expect(scene?.getAttribute("aria-hidden")).toBe("true");
    // Asked no more once it is shown.
    const before = asked;
    screen.update({ settled: 500, total: 900 });
    expect(asked).toBe(before);
    expect(root.querySelectorAll(".v7-title-scene")).toHaveLength(1);
    screen.destroy();
    expect(root.childElementCount).toBe(0);
  });

  it("starts with the scene when it is already in", () => {
    const root = query("#app");
    if (root === null) throw new Error("#app missing");
    const screen = mountLoadingScreenV7(document, root, {
      scene: { environment, ready: () => true },
    });
    expect(query("[data-v7-loading]")?.dataset.scene).toBe("ready");
    expect(query(".v7-app-shell")?.dataset.motion).toBe("full");
    screen.destroy();
  });
});

/**
 * The recorded sound clips at the start (bead pulp_wars-2yc.20,
 * docs/ui/SOUND.md "Stock recordings"): asked for once the app is mounted
 * (bead pulp_wars-2yc.42: they no longer share the link with the title's
 * art), never waited for by a screen, and never in the way of the game
 * starting.
 */
describe("Ruleset 7 start and the sound clips", () => {
  it("asks for every clip once the app is mounted and does not wait for any of them", async () => {
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
    // Not while the loading screen shows: the title's art has the link.
    expect(query("[data-v7-loading]")).not.toBeNull();
    expect(asked).toEqual([]);
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
    // The game is there, and with it the clips are asked for, all at once;
    // none has arrived.
    expect(query("[data-v7-loading]")).toBeNull();
    expect(appShown()).toBe(true);
    expect(asked).toEqual([soundAssetUrlsV7()]);
    expect(asked[0]?.length).toBeGreaterThan(0);
    app.destroy();
  });

  it("gives the clips the link first: the factions' art starts when they are in, or after the hold", async () => {
    const start = async (soundHoldMs: number) => {
      const manual = manualPreloader();
      let clipsIn: () => void = () => undefined;
      const starting = bootstrapPreloadedRuleset7App(document, {
        preloader: manual.preloader,
        loadingScreenDelayMs: 0,
        storage: null,
        boardHost: new Host(),
        randomSeed: () => 7,
        soundHoldMs,
        prefetchSounds: () =>
          new Promise<void>((resolve) => {
            clipsIn = resolve;
          }),
      });
      await flush();
      manual.requests[0]?.resolve(result(1));
      const app = await starting;
      return { app, requests: manual.requests, clipsIn: () => clipsIn() };
    };
    // The clips are on their way: no faction art is asked for yet.
    const waiting = await start(60_000);
    await flush();
    expect(waiting.requests).toHaveLength(1);
    waiting.clipsIn();
    await waitUntil(() => waiting.requests.length === 2);
    expect(waiting.requests[1]?.urls).toEqual(backgroundPreloadUrlsV7("LIVE"));
    waiting.app.destroy();

    // Slow clips hold the art back no longer than the hold.
    document.body.innerHTML = '<div id="app"></div>';
    const slow = await start(20);
    await flush();
    expect(slow.requests).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 40));
    await waitUntil(() => slow.requests.length === 2);
    slow.app.destroy();
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
      expect(asked).toHaveLength(0);
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
      requests[0]?.resolve({ total: 0, loaded: 0, failed: [], unfinished: 0 });
      const app = await starting;
      expect(asked).toEqual([[]]);
      expect(soundAssetUrlsV7(false)).toEqual([]);
      app.destroy();
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});
