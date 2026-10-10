import { describe, expect, it } from "vitest";
import {
  assetGroupOfSubjectV7,
  assetInventoryV7,
  assetTiersV7,
  chibiAssetUrlsV7,
  factionAssetUrlsV7,
  frontTierSubjectV7,
  liveFallbackOnlyAssetV7,
  type AssetLookV7,
} from "../../src/assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtAssetsV7 } from "../../src/assets/chibi-direction-art-manifest";
import { portraitSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import {
  backgroundPreloadUrlsV7,
  startAssetTiersV7,
  startPreloadUrlsV7,
} from "../../src/app/v7-preload-boot";
import { createAssetPreloaderV7 } from "../../src/app/asset-preloader-v7";
import { FACTION_IDS_V7, type FactionIdV7 } from "../../src/engine/index";
import {
  resolveChibiWithFallbackV7,
  type ChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { createGalleryArtV7 } from "../../src/render/canvas/gallery-sprite-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { createChibiDomArtV7 } from "../../src/render/dom/chibi-dom-art-v7";
import { titleSceneAssetUrlsV7 } from "../../src/render/title-scene-v7";

/**
 * The asset tiers (bead pulp_wars-2yc.42): the start blocks on the FRONT
 * tier, each faction's own art loads in the background and before a board
 * that shows the faction, and the live look leaves to the classic look the
 * default rasters it draws only in place of a failed direction raster.
 */
const LOOKS: readonly AssetLookV7[] = ["LIVE", "CLASSIC"];
const FACTIONS = FACTION_IDS_V7.filter(
  (faction): faction is Exclude<FactionIdV7, "ORIGINAL"> =>
    faction !== "ORIGINAL",
);

describe("asset tiers", () => {
  it("puts every file of a look in exactly one tier", () => {
    for (const look of LOOKS) {
      const scene = titleSceneAssetUrlsV7();
      const tiers = assetTiersV7(look, scene);
      const lists = [tiers.front, ...Object.values(tiers.factions)];
      const all = lists.flat();
      // No file twice, within a tier or across tiers.
      expect(new Set(all).size, look).toBe(all.length);
      // The inventory, and the scene's files where it does not list them.
      expect(new Set(all)).toEqual(
        new Set([...scene, ...assetInventoryV7(look).map(({ url }) => url)]),
      );
    }
  });

  it("blocks the title on the scene, the shared art and what every screen asks for", () => {
    const scene = titleSceneAssetUrlsV7();
    const tiers = assetTiersV7("LIVE", scene);
    const front = new Set(tiers.front);
    // The scene heads the tier, in its order.
    expect(tiers.front.slice(0, scene.length)).toEqual(scene);
    const inventory = assetInventoryV7("LIVE");
    for (const entry of inventory)
      if (entry.group === "SHARED")
        expect(front.has(entry.url), entry.url).toBe(true);
    // Each faction's emblem (its Fighter portrait) and the territory
    // grounds (the board loads the set whole) are asked for whoever plays;
    // so are the effect sprites a board asks for when it mounts, which are
    // shared art.
    const registered = [
      ...CHIBI_ART_ASSETS_V7.filter((asset) => !liveFallbackOnlyAssetV7(asset)),
      ...chibiDirectionArtAssetsV7(),
    ];
    for (const faction of FACTIONS) {
      const emblem = portraitSubjectV7("FIGHTER", faction);
      expect(frontTierSubjectV7(emblem), emblem).toBe(true);
    }
    let emblems = 0;
    let effects = 0;
    for (const asset of registered) {
      const effect = asset.subject.startsWith("EFFECT:");
      if (effect) {
        effects += 1;
        expect(assetGroupOfSubjectV7(asset.subject), asset.subject).toBe(
          "SHARED",
        );
      }
      const emblem =
        assetGroupOfSubjectV7(asset.subject) !== "SHARED" &&
        frontTierSubjectV7(asset.subject);
      if (emblem) emblems += 1;
      if (emblem || effect)
        for (const url of chibiAssetUrlsV7(asset))
          expect(front.has(url), url).toBe(true);
    }
    expect(emblems).toBeGreaterThanOrEqual(7);
    expect(effects).toBeGreaterThan(10);
    for (const tile of FACTION_GRASS_TILES_V7)
      expect(front.has(tile.url), tile.url).toBe(true);
    // A faction's units, cities and buildings are not: only the few the
    // scene draws.
    const sceneUrls = new Set(scene);
    for (const asset of chibiDirectionArtAssetsV7()) {
      if (assetGroupOfSubjectV7(asset.subject) === "SHARED") continue;
      if (!/^(UNIT|CITY|IMPROVEMENT):/.test(asset.subject)) continue;
      if (sceneUrls.has(asset.url)) continue;
      expect(front.has(asset.url), asset.url).toBe(false);
    }
    // About a third of the look's bytes-carrying files, not all of it.
    expect(tiers.front.length).toBeLessThan(inventory.length / 2);
    expect(tiers.front.length).toBeGreaterThan(250);
  });

  it("gives a board the tiers of exactly its factions", () => {
    const tiers = startAssetTiersV7("LIVE");
    const groups = new Map(
      assetInventoryV7("LIVE").map((entry) => [entry.url, entry.group]),
    );
    for (const faction of FACTIONS) {
      const urls = factionAssetUrlsV7(tiers, [faction]);
      expect(urls).toEqual(tiers.factions[faction] ?? []);
      for (const url of urls) expect(groups.get(url), url).toBe(faction);
    }
    // Every offered faction has art of its own to wait for.
    for (const faction of ["UNDEAD", "GOBLIN", "ICE_FOLK", "CULT"] as const)
      expect(factionAssetUrlsV7(tiers, [faction]).length).toBeGreaterThan(5);
    // The Humans draw the shared art: nothing to wait for.
    expect(factionAssetUrlsV7(tiers, ["ORIGINAL"])).toEqual([]);
    expect(factionAssetUrlsV7(tiers, [])).toEqual([]);
    // A match: its factions' tiers, each once, whatever the seat order.
    const duel = factionAssetUrlsV7(tiers, ["GOBLIN", "ORIGINAL", "UNDEAD"]);
    expect(duel).toEqual([
      ...(tiers.factions.GOBLIN ?? []),
      ...(tiers.factions.UNDEAD ?? []),
    ]);
    expect(
      factionAssetUrlsV7(tiers, ["UNDEAD", "UNDEAD", "GOBLIN", "UNDEAD"]),
    ).toHaveLength(duel.length);
    expect(duel.some((url) => url.includes("martian"))).toBe(false);
    // The Gallery (every faction) is everything the title did not wait for.
    expect(new Set(factionAssetUrlsV7(tiers, FACTION_IDS_V7))).toEqual(
      new Set(backgroundPreloadUrlsV7("LIVE")),
    );
    expect(
      new Set([
        ...startPreloadUrlsV7("LIVE"),
        ...backgroundPreloadUrlsV7("LIVE"),
      ]),
    ).toEqual(
      new Set([
        ...titleSceneAssetUrlsV7(),
        ...assetInventoryV7("LIVE").map(({ url }) => url),
      ]),
    );
    // The classic look has faction tiers of its own files.
    const classic = startAssetTiersV7("CLASSIC");
    expect(factionAssetUrlsV7(classic, ["UNDEAD"]).length).toBeGreaterThan(5);
    expect(
      factionAssetUrlsV7(classic, ["UNDEAD"]).some((url) =>
        url.includes("chibi-direction-"),
      ),
    ).toBe(false);
  });
});

/** A raster environment that records what is asked and may fail files. */
function recordingEnvironment(fails: (url: string) => boolean = () => false) {
  const asked = new Set<string>();
  const environment: ChibiRasterEnvironmentV7 = {
    loadImage(url, settle) {
      asked.add(url);
      settle(!fails(url));
      return { url } as unknown as CanvasImageSource;
    },
    readPixels: (_image, width, height) =>
      new Uint8ClampedArray(width * height * 4).fill(255),
    createSurface: (pixels, width, height) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
  };
  return { asked, environment };
}

/**
 * Every subject either registry knows, and each shared unit, portrait and
 * city subject as every faction would ask for it (`UNIT:CULT:PATROL_BOAT`),
 * which is how a faction without a raster of its own reaches a stand-in.
 */
function everySubject(): ArtSubjectV7[] {
  const subjects = new Set<string>();
  for (const asset of [...CHIBI_ART_ASSETS_V7, ...chibiDirectionArtAssetsV7()])
    subjects.add(asset.subject);
  for (const subject of [...subjects]) {
    const parts = subject.split(":");
    if (parts.length !== 2 || !/^(UNIT|PORTRAIT|CITY)$/.test(parts[0] ?? ""))
      continue;
    for (const faction of FACTIONS)
      subjects.add(`${parts[0]}:${faction}:${parts[1]}`);
  }
  return [...subjects] as ArtSubjectV7[];
}

const POINTS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 3 },
  { x: 5, y: 4 },
];

/** Resolves every subject as the live board and the live interface do. */
function resolveEverything(environment: ChibiRasterEnvironmentV7): void {
  const board = createGalleryArtV7(environment, () => undefined);
  const dom = createChibiDomArtV7({
    environment: { ...environment, encode: () => "data:," },
    onChange: () => undefined,
    preferred: LIVE_DIRECTION_ART_REGISTRY_V7,
  });
  for (const subject of everySubject())
    for (const at of POINTS)
      for (const ownerColor of [undefined, "#3355cc"]) {
        for (const deviceScale of [1, 2, 3])
          resolveChibiWithFallbackV7(board, {
            subject,
            at,
            ownerColor,
            deviceScale,
          });
        dom.resolve({ subject, at, ownerColor });
      }
}

describe("classic rasters the live look leaves out", () => {
  const fallbackOnly = new Set(
    CHIBI_ART_ASSETS_V7.filter(liveFallbackOnlyAssetV7).flatMap(
      chibiAssetUrlsV7,
    ),
  );

  it("are never asked for by the live board or the live interface", () => {
    const { asked, environment } = recordingEnvironment();
    resolveEverything(environment);
    // The resolvers were really exercised: direction art and default art.
    expect(asked.size).toBeGreaterThan(600);
    expect([...asked].some((url) => url.includes("chibi-direction-"))).toBe(
      true,
    );
    expect([...asked].filter((url) => fallbackOnly.has(url))).toEqual([]);
    // And everything they did ask for is in the live look's inventory.
    const live = new Set(assetInventoryV7("LIVE").map(({ url }) => url));
    expect([...asked].filter((url) => !live.has(url))).toEqual([]);
  });

  it("stand in, loaded on demand, when a direction raster fails", () => {
    const { asked, environment } = recordingEnvironment((url) =>
      url.includes("chibi-direction-"),
    );
    resolveEverything(environment);
    const reached = [...asked].filter((url) => fallbackOnly.has(url));
    // The default art of the failed subjects: most of what was left out.
    expect(reached.length).toBeGreaterThan(fallbackOnly.size / 2);
  });

  it("are the classic look's own: a switch to it loads them", () => {
    const classic = new Set(assetInventoryV7("CLASSIC").map(({ url }) => url));
    const live = new Set(assetInventoryV7("LIVE").map(({ url }) => url));
    for (const url of fallbackOnly) {
      expect(classic.has(url), url).toBe(true);
      expect(live.has(url), url).toBe(false);
    }
    // The title scene is the live look's art in every look.
    for (const url of titleSceneAssetUrlsV7())
      expect(fallbackOnly.has(url), url).toBe(false);
  });
});

describe("asset preloader lanes shared between preloads", () => {
  function harness(concurrency: number) {
    const pending: { url: string; settle: (ok: boolean) => void }[] = [];
    const stored = new Set<string>();
    const calls: string[] = [];
    const preloader = createAssetPreloaderV7<string>({
      concurrency,
      load: (url) => {
        calls.push(url);
        return new Promise((resolve, reject) => {
          pending.push({
            url,
            settle: (ok) => (ok ? resolve(url) : reject(new Error("failed"))),
          });
        });
      },
      store: { has: (url) => stored.has(url), set: (url) => stored.add(url) },
      warn: () => undefined,
      setTimer: () => 0,
      clearTimer: () => undefined,
    });
    const tick = async (): Promise<void> => {
      for (let index = 0; index < 8; index += 1) await Promise.resolve();
    };
    /** Settles the files in flight, oldest first, until none is left. */
    const drain = async (ok: (url: string) => boolean = () => true) => {
      await tick();
      while (pending.length > 0) {
        const next = pending.shift();
        next?.settle(ok(next.url));
        await tick();
      }
    };
    return { preloader, pending, stored, calls, tick, drain };
  }
  const names = (prefix: string, count: number): string[] =>
    Array.from({ length: count }, (_, index) => `/${prefix}/${index}.png`);

  it("starts an urgent preload ahead of the files a background preload queued", async () => {
    const h = harness(2);
    const background = h.preloader.preload(names("bg", 6));
    await h.tick();
    expect(h.calls).toEqual(["/bg/0.png", "/bg/1.png"]);
    // A board asks for its faction: two new files and one the background
    // has queued. They take the next lanes, in the board's order.
    const progress: number[] = [];
    const board = h.preloader.preload(
      ["/board/0.png", "/bg/4.png", "/board/1.png"],
      ({ settled }) => progress.push(settled),
      { urgent: true },
    );
    await h.tick();
    // Nothing in flight is interrupted, and no lane is added.
    expect(h.pending.map((entry) => entry.url)).toEqual([
      "/bg/0.png",
      "/bg/1.png",
    ]);
    h.pending.shift()?.settle(true);
    h.pending.shift()?.settle(true);
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual([
      "/board/0.png",
      "/bg/4.png",
    ]);
    h.pending.shift()?.settle(true);
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual([
      "/bg/4.png",
      "/board/1.png",
    ]);
    h.pending.shift()?.settle(true);
    h.pending.shift()?.settle(true);
    await h.tick();
    // The board has its files while the background still has three to go.
    expect(await board).toEqual({
      total: 3,
      loaded: 3,
      failed: [],
      unfinished: 0,
    });
    expect(progress).toEqual([0, 1, 2, 3]);
    expect(h.pending.map((entry) => entry.url)).toEqual([
      "/bg/2.png",
      "/bg/3.png",
    ]);
    await h.drain();
    expect((await background).loaded).toBe(6);
    // Each file was fetched once, whoever asked.
    expect(new Set(h.calls).size).toBe(h.calls.length);
    expect(h.calls).toHaveLength(8);
  });

  it("joins a file already in flight instead of fetching it again", async () => {
    const h = harness(4);
    const first = h.preloader.preload(names("a", 3));
    await h.tick();
    const second = h.preloader.preload(["/a/1.png", "/a/2.png"], undefined, {
      urgent: true,
    });
    await h.drain();
    expect((await first).loaded).toBe(3);
    expect(await second).toMatchObject({ total: 2, loaded: 2 });
    expect(h.calls).toEqual(names("a", 3));
  });

  it("reports what is left to wait for: nothing once each file is in or has failed", async () => {
    const h = harness(4);
    const list = names("f", 3);
    expect(h.preloader.settled?.(list)).toBe(false);
    const done = h.preloader.preload(list);
    await h.tick();
    expect(h.preloader.settled?.(list)).toBe(false);
    // 1 fails both attempts: it loads on demand, and nothing waits for it.
    await h.drain((url) => url !== "/f/1.png");
    expect((await done).failed).toEqual(["/f/1.png"]);
    expect(h.preloader.covers(list)).toBe(false);
    expect(h.preloader.settled?.(list)).toBe(true);
    expect(h.preloader.settled?.([...list, "/f/9.png"])).toBe(false);
    // Asked for again, a failed file is tried again and may arrive.
    const again = h.preloader.preload(list);
    await h.drain();
    expect(await again).toMatchObject({ total: 1, loaded: 1 });
    expect(h.preloader.covers(list)).toBe(true);
    expect(h.preloader.settled?.(list)).toBe(true);
  });

  it("keeps the front of one preload ahead of its rest while another preload runs", async () => {
    const h = harness(3);
    const start = h.preloader.preload(names("s", 5), undefined, { front: 2 });
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual(names("s", 2));
    h.pending.shift()?.settle(true);
    h.pending.shift()?.settle(true);
    await h.tick();
    expect(h.pending.map((entry) => entry.url)).toEqual(names("s", 5).slice(2));
    await h.drain();
    expect((await start).loaded).toBe(5);
  });
});
