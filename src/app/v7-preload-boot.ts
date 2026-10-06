import {
  assetLookV7,
  assetPreloadUrlsV7,
  soundAssetUrlsV7,
  type AssetLookV7,
} from "../assets/asset-inventory-v7";
import { prefetchSoundFilesV1 } from "../audio/sound-file-store";
import { loadStockSoundPicksV1 } from "../audio/stock-sound-picks";
import { stockSoundsEnabledV1 } from "../audio/stock-sounds";
import {
  lazyRasterLoadsV7,
  markRasterPreloadCompleteV7,
} from "../render/canvas/preloaded-rasters-v7";
import { mountLoadingScreenV7 } from "../render/dom/loading-screen-v7";
import { resolveArtSetV7 } from "./art-set-v7";
import {
  browserAssetPreloaderV7,
  type AssetPreloadProgressV7,
  type AssetPreloadResultV7,
  type AssetPreloaderV7,
} from "./asset-preloader-v7";
import { loadBoardClassicLookV7 } from "./board-visual-direction-v7";
import {
  bootstrapRuleset7App,
  browserStorageV7,
  type BootstrapRuleset7Options,
  type BootstrappedRuleset7App,
} from "./v7-bootstrap";

/**
 * The game's start (bead pulp_wars-2yc.6): preload the art of the look in
 * use behind the loading screen, then mount the app. Every screen is drawn
 * by the app mounted here (title and setup, Resume, the campaign, a match,
 * the Showcase, the Gallery), so each of them finds its art already loaded
 * and decoded.
 *
 * One blocking phase, the whole look (every faction: the Gallery and an
 * eight-player match show them all). The LEGACY set is loaded only when
 * `?art=legacy` selects it; the classic look is part of the live look's
 * inventory. A failed raster never stops the start: the app mounts when
 * the preload settles or its time budget runs out.
 */
export interface PreloadedBootOptionsV7 extends BootstrapRuleset7Options {
  /** The preloader; the browser's (image elements, decoded) by default. */
  readonly preloader?: AssetPreloaderV7;
  /**
   * The loading screen appears only when the preload takes longer than
   * this, so a warm cache does not flash it. 150 ms by default.
   */
  readonly loadingScreenDelayMs?: number;
  readonly now?: () => number;
  /**
   * Starts fetching the sound files and returns at once; the browser's
   * `fetch` into the sound file store by default (a test passes its own).
   */
  readonly prefetchSounds?: (urls: readonly string[]) => void;
}

export interface PreloadedRuleset7App extends BootstrappedRuleset7App {
  readonly preload: AssetPreloadResultV7 & {
    readonly look: AssetLookV7;
    readonly milliseconds: number;
  };
  /**
   * Rasters a loader fetched on demand after the preload: none when every
   * piece found its art preloaded (the browser smoke asserts it).
   */
  lazyAssetLoads(): readonly string[];
}

export const LOADING_SCREEN_DELAY_MS_V7 = 150;

export async function bootstrapPreloadedRuleset7App(
  documentRoot: Document,
  options: PreloadedBootOptionsV7 = {},
): Promise<PreloadedRuleset7App> {
  const root = documentRoot.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const browser = documentRoot.defaultView;
  const settingsStorage =
    options.settingsStorage === undefined
      ? browserStorageV7(browser)
      : options.settingsStorage;
  const artSet =
    options.artSet ??
    resolveArtSetV7(browser?.location.search ?? "", settingsStorage);
  const look = assetLookV7(artSet, loadBoardClassicLookV7(settingsStorage));
  const preloader = options.preloader ?? browserAssetPreloaderV7(documentRoot);
  const now = options.now ?? ((): number => performance.now());

  // The sound clips are asked for beside the art and never waited for: the
  // first screen does not depend on them, and a sound whose clip has not
  // arrived plays its synthesised fallback.
  try {
    // Of a sound with several recordings, the one this browser picked.
    const sounds = soundAssetUrlsV7(
      stockSoundsEnabledV1(browser?.location.search ?? ""),
      loadStockSoundPicksV1(settingsStorage),
    );
    if (options.prefetchSounds !== undefined) options.prefetchSounds(sounds);
    else if (browser !== null && typeof browser.fetch === "function")
      prefetchSoundFilesV1(sounds, (url) => browser.fetch(url));
  } catch {
    // Sound files are optional; the game starts without them.
  }

  const started = now();
  let screen: ReturnType<typeof mountLoadingScreenV7> | null = null;
  let progress: AssetPreloadProgressV7 | null = null;
  const show = (): void => {
    screen = mountLoadingScreenV7(documentRoot, root);
    if (progress !== null) screen.update(progress);
  };
  const delay = options.loadingScreenDelayMs ?? LOADING_SCREEN_DELAY_MS_V7;
  const timer = delay <= 0 ? null : globalThis.setTimeout(show, delay);
  if (timer === null) show();
  let result: AssetPreloadResultV7;
  try {
    result = await preloader.preload(assetPreloadUrlsV7(look), (update) => {
      progress = update;
      screen?.update(update);
    });
  } catch {
    // A broken preloader must not keep the game from starting: every
    // raster then loads on demand, as it did before preloading.
    result = { total: 0, loaded: 0, failed: [], unfinished: 0 };
  } finally {
    if (timer !== null) globalThis.clearTimeout(timer);
    (screen as ReturnType<typeof mountLoadingScreenV7> | null)?.destroy();
    markRasterPreloadCompleteV7();
  }

  const app = bootstrapRuleset7App(documentRoot, {
    ...options,
    artSet,
    settingsStorage,
    ensureLookAssets: (next) => {
      const urls = assetPreloadUrlsV7(next);
      return preloader.covers(urls) ? null : preloader.preload(urls);
    },
  });
  return {
    ...app,
    preload: { ...result, look, milliseconds: Math.round(now() - started) },
    lazyAssetLoads: lazyRasterLoadsV7,
  };
}
