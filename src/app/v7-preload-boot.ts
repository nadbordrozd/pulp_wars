import {
  assetLookV7,
  assetPreloadUrlsV7,
  assetTiersV7,
  factionAssetUrlsV7,
  soundAssetUrlsV7,
  type AssetLookV7,
  type AssetTiersV7,
} from "../assets/asset-inventory-v7";
import { soundFileBytesV1 } from "../audio/sound-file-store";
import { loadStockSoundPicksV1 } from "../audio/stock-sound-picks";
import { stockSoundsEnabledV1 } from "../audio/stock-sounds";
import { SETTINGS_STORAGE_KEY, parseSettings } from "../persistence/index";
import { browserChibiRasterEnvironmentV7 } from "../render/canvas/chibi-art-resolver-v7";
import {
  lazyRasterLoadsV7,
  markRasterPreloadCompleteV7,
} from "../render/canvas/preloaded-rasters-v7";
import { mountLoadingScreenV7 } from "../render/dom/loading-screen-v7";
import { titleSceneAssetUrlsV7 } from "../render/title-scene-v7";
import { resolveArtSetV7 } from "./art-set-v7";
import {
  browserAssetPreloaderV7,
  type AssetPreloadProgressV7,
  type AssetPreloadResultV7,
  type AssetPreloaderV7,
} from "./asset-preloader-v7";
import { loadBoardClassicLookV7 } from "./board-visual-direction-v7";
import { loadInterfaceFontsV7 } from "./interface-fonts-v7";
import {
  bootstrapRuleset7App,
  browserStorageV7,
  type BootstrapRuleset7Options,
  type BootstrappedRuleset7App,
} from "./v7-bootstrap";

/**
 * The game's start (bead pulp_wars-2yc.6): preload art behind the loading
 * screen, then mount the app. Every screen is drawn by the app mounted
 * here (title and setup, Resume, the campaign, a match, the Showcase, the
 * Gallery), so each of them finds its art already loaded and decoded.
 *
 * The look loads in tiers (bead pulp_wars-2yc.42, `assetTiersV7`). The
 * start blocks on the FRONT tier only: the loading screen's scene, the
 * shared art and the factions' emblems, which is everything the screens
 * before a match draw. Once the app is mounted the sound clips are asked
 * for, and after them each faction's own art, in the background. A board
 * is drawn only when the art of its factions is in: the app asks
 * `ensureFactionAssets` before it shows a match or the Gallery and waits
 * behind the loading plate for whatever is still on its way, which then
 * takes the next free lanes. So a board still never draws a stand-in for
 * art that is downloading.
 *
 * The classic look's own rasters load when the player switches to it
 * (`ensureLookAssets`). A failed raster never stops the start: the app
 * mounts when the preload settles or its time budget runs out.
 *
 * The loading screen is the title scene with the progress bar over it
 * (bead pulp_wars-502h): the scene's own files come first in the one
 * preload, so the scene is drawn after about a quarter of it while the bar
 * shows the rest.
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
   * Called once the app is mounted. A promise it returns is waited for,
   * no longer than `soundHoldMs`, before the factions' art starts.
   */
  readonly prefetchSounds?: (urls: readonly string[]) => unknown;
  /** The longest the factions' art waits for the sound clips. */
  readonly soundHoldMs?: number;
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
  /**
   * True when the background has finished too: every file of the look the
   * page started in is loaded (or has failed and loads on demand).
   */
  assetsSettled(): boolean;
  /** Settles when the background load of the factions' art has ended. */
  readonly background: Promise<void>;
}

export const LOADING_SCREEN_DELAY_MS_V7 = 150;
/**
 * The clips are 0.3 MB, two seconds of a "Fast 3G" link: the factions' art
 * leaves them the link that long, so the first click after the title has
 * its recording, and no longer when they are slow.
 */
export const SOUND_PREFETCH_HOLD_MS_V7 = 4_000;

/**
 * The tiers the start loads a look in: the loading screen's scene heads
 * the FRONT tier (the classic look gains the scene's direction rasters,
 * which its title screen draws too).
 */
export function startAssetTiersV7(look: AssetLookV7): AssetTiersV7 {
  return assetTiersV7(look, titleSceneAssetUrlsV7());
}

/**
 * The files the start waits for, in order: the FRONT tier, the scene
 * first, each file once.
 */
export function startPreloadUrlsV7(look: AssetLookV7): readonly string[] {
  return startAssetTiersV7(look).front;
}

/** The files the background loads after the title: each faction's tier. */
export function backgroundPreloadUrlsV7(look: AssetLookV7): readonly string[] {
  return Object.values(startAssetTiersV7(look).factions).flat();
}

/** Motion as the app will mount it: the stored setting, else the system's. */
function startMotionV7(
  documentRoot: Document,
  settingsStorage: BootstrapRuleset7Options["settingsStorage"],
): "FULL" | "REDUCED" {
  let motion: "FULL" | "REDUCED" =
    documentRoot.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches === true
      ? "REDUCED"
      : "FULL";
  try {
    const stored = settingsStorage?.getItem(SETTINGS_STORAGE_KEY);
    if (stored !== null && stored !== undefined) {
      const parsed = parseSettings(stored);
      if (parsed.kind === "VALID") motion = parsed.settings.motion;
    }
  } catch {
    // Restricted storage: the system's preference stands.
  }
  return motion;
}

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
  const look = assetLookV7(loadBoardClassicLookV7(settingsStorage));
  const preloader = options.preloader ?? browserAssetPreloaderV7(documentRoot);
  const now = options.now ?? ((): number => performance.now());

  const started = now();
  // The interface faces load beside the art: board labels need them drawn.
  const fonts = loadInterfaceFontsV7(documentRoot);
  let screen: ReturnType<typeof mountLoadingScreenV7> | null = null;
  let progress: AssetPreloadProgressV7 | null = null;
  const tiersByLook = new Map<AssetLookV7, AssetTiersV7>();
  const tiersOf = (wanted: AssetLookV7): AssetTiersV7 => {
    let tiers = tiersByLook.get(wanted);
    if (tiers === undefined) {
      tiers = startAssetTiersV7(wanted);
      tiersByLook.set(wanted, tiers);
    }
    return tiers;
  };
  const urls = tiersOf(look).front;
  const sceneUrls = titleSceneAssetUrlsV7();
  const show = (): void => {
    screen = mountLoadingScreenV7(documentRoot, root, {
      motion: startMotionV7(documentRoot, settingsStorage),
      scene: {
        environment: browserChibiRasterEnvironmentV7(documentRoot),
        ready: () => preloader.covers(sceneUrls),
      },
    });
    if (progress !== null) screen.update(progress);
  };
  const delay = options.loadingScreenDelayMs ?? LOADING_SCREEN_DELAY_MS_V7;
  const timer = delay <= 0 ? null : globalThis.setTimeout(show, delay);
  if (timer === null) show();
  let result: AssetPreloadResultV7;
  try {
    result = await preloader.preload(
      urls,
      (update) => {
        progress = update;
        screen?.update(update);
      },
      // The scene's files load alone first, so the loading screen shows
      // the scene as early as the link allows (pulp_wars-2yc.11).
      { front: new Set(sceneUrls).size },
    );
  } catch {
    // A broken preloader must not keep the game from starting: every
    // raster then loads on demand, as it did before preloading.
    result = { total: 0, loaded: 0, failed: [], unfinished: 0 };
  } finally {
    await fonts;
    if (timer !== null) globalThis.clearTimeout(timer);
    (screen as ReturnType<typeof mountLoadingScreenV7> | null)?.destroy();
    markRasterPreloadCompleteV7();
  }

  /** Null when nothing of `wanted` is left to wait for. */
  const settled = (wanted: readonly string[]): boolean =>
    preloader.settled?.(wanted) ?? preloader.covers(wanted);
  const waitFor = (
    wanted: readonly string[],
    onProgress?: (progress: AssetPreloadProgressV7) => void,
  ): Promise<unknown> | null =>
    settled(wanted)
      ? null
      : // Something on screen waits: ahead of the background's files.
        preloader.preload(wanted, onProgress, { urgent: true });

  const app = bootstrapRuleset7App(documentRoot, {
    ...options,
    artSet,
    settingsStorage,
    ensureLookAssets: (next) => waitFor(assetPreloadUrlsV7(next)),
    ensureFactionAssets: (next, factions, onProgress) =>
      waitFor(factionAssetUrlsV7(tiersOf(next), factions), onProgress),
  });

  // The app is on screen. Now the sound clips (never waited for by a
  // screen: a sound whose clip has not arrived plays its synthesised
  // fallback), which no longer share the link with the title's art, and
  // after them each faction's art.
  let sounds: unknown = undefined;
  try {
    // Of a sound with several recordings, the one this browser picked.
    const clips = soundAssetUrlsV7(
      stockSoundsEnabledV1(browser?.location.search ?? ""),
      loadStockSoundPicksV1(settingsStorage),
    );
    if (options.prefetchSounds !== undefined)
      sounds = options.prefetchSounds(clips);
    else if (browser !== null && typeof browser.fetch === "function")
      sounds = Promise.allSettled(
        clips.map((url) =>
          soundFileBytesV1(url, (file) => browser.fetch(file)),
        ),
      );
  } catch {
    // Sound files are optional; the game starts without them.
  }
  const rest = Object.values(tiersOf(look).factions).flat();
  const background = (async (): Promise<void> => {
    try {
      if (sounds instanceof Promise)
        await Promise.race([
          sounds.catch(() => undefined),
          new Promise((resolve) =>
            globalThis.setTimeout(
              resolve,
              options.soundHoldMs ?? SOUND_PREFETCH_HOLD_MS_V7,
            ),
          ),
        ]);
      if (!settled(rest)) await preloader.preload(rest);
    } catch {
      // A board then waits for its factions itself, or loads on demand.
    }
  })();
  return {
    ...app,
    preload: { ...result, look, milliseconds: Math.round(now() - started) },
    lazyAssetLoads: lazyRasterLoadsV7,
    assetsSettled: () => settled(rest),
    background,
  };
}
