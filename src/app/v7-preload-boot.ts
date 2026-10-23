import {
  assetLookV7,
  assetPreloadUrlsV7,
  assetTiersV7,
  factionAssetUrlsV7,
  soundAssetUrlsV7,
  type AssetLookV7,
  type AssetTiersV7,
} from "../assets/asset-inventory-v7";
import {
  loadAudioSettingsV1,
  type AudioSettingsV1,
} from "../audio/audio-settings";
import { playableSoundV1 } from "../audio/playable-sound";
import { SOUND_TITLE_THEME_ID_V1 } from "../audio/sound-manifest";
import { soundFileBytesV1 } from "../audio/sound-file-store";
import {
  loadStockSoundPicksV1,
  type StockSoundPicksV1,
} from "../audio/stock-sound-picks";
import { stockSoundsEnabledV1 } from "../audio/stock-sounds";
import { SETTINGS_STORAGE_KEY, parseSettings } from "../persistence/index";
import { browserChibiRasterEnvironmentV7 } from "../render/canvas/chibi-art-resolver-v7";
import {
  lazyRasterLoadsV7,
  markRasterPreloadCompleteV7,
} from "../render/canvas/preloaded-rasters-v7";
import { mountLoadingScreenV7 } from "../render/dom/loading-screen-v7";
import { titleSceneAssetUrlsV7 } from "../render/title-scene-v7";
import { clearStoredArtSetV7 } from "./art-set-v7";
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
 * before a match draw, and the sound the start plays (bead
 * pulp_wars-2yc.107): the title theme and the clips, asked for once the
 * scene is in and counted in the same bar, waited for no longer than
 * `soundHoldMs` after the art. Once the app is mounted the music starts
 * where the browser allows it (else with the first gesture), and each
 * faction's own art loads in the background. A board
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
   * Fetches one sound file of the start (`startSoundUrlsV7`: the title
   * theme, then the clips) and settles when it has arrived or failed; the
   * browser's `fetch` into the sound file store by default (a test passes
   * its own). Asked for once the loading screen's scene is in.
   */
  readonly fetchSound?: (url: string) => Promise<unknown>;
  /**
   * The longest the loading screen waits for the sound files once the art
   * is in; the game then starts and they go on loading.
   */
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
 * The title theme is 1.4 MB and the clips 0.3 MB: on a "Fast 3G" link
 * (180 kB/s) they need about four seconds more than the art. The loading
 * screen waits for them that long at most; a slower link starts the game
 * without them, and the music starts when its file is in.
 */
export const SOUND_PRELOAD_HOLD_MS_V7 = 5_000;

/**
 * The sound files the start loads with the art (bead pulp_wars-2yc.107),
 * as the stored preference allows: the title theme when Music is on and
 * above zero, and when Sound is on one clip a sound (its default
 * recording, or the one this browser picked; none with `?stock-sounds=0`).
 */
export function startSoundUrlsV7(
  settings: AudioSettingsV1,
  stockSounds = true,
  picks: StockSoundPicksV1 = {},
): { readonly music: readonly string[]; readonly clips: readonly string[] } {
  const title = playableSoundV1(SOUND_TITLE_THEME_ID_V1)?.source;
  const music =
    settings.musicEnabled && settings.musicVolume > 0 && title?.kind === "FILE"
      ? [title.url]
      : [];
  const clips = settings.enabled ? soundAssetUrlsV7(stockSounds, picks) : [];
  return { music, clips };
}

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
  clearStoredArtSetV7(settingsStorage);
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

  // The sound the start plays (bead pulp_wars-2yc.107): the title theme
  // and the clips, counted in the bar with the art. A sound file is never
  // what keeps the game from starting.
  let soundUrls: readonly string[] = [];
  let fetchSound: ((url: string) => Promise<unknown>) | null = null;
  try {
    if (options.fetchSound !== undefined) fetchSound = options.fetchSound;
    else if (browser !== null && typeof browser.fetch === "function")
      fetchSound = (url) =>
        soundFileBytesV1(url, (file) => browser.fetch(file));
    if (fetchSound !== null) {
      const { music, clips } = startSoundUrlsV7(
        loadAudioSettingsV1(settingsStorage),
        stockSoundsEnabledV1(browser?.location.search ?? ""),
        // Of a sound with several recordings, the one this browser picked.
        loadStockSoundPicksV1(settingsStorage),
      );
      soundUrls = [...new Set([...music, ...clips])];
    }
  } catch {
    soundUrls = [];
  }
  let artProgress: AssetPreloadProgressV7 | null = null;
  let soundSettled = 0;
  let loadingEnded = false;
  const report = (): void => {
    if (loadingEnded) return;
    progress = {
      settled: (artProgress?.settled ?? 0) + soundSettled,
      total: (artProgress?.total ?? 0) + soundUrls.length,
    };
    screen?.update(progress);
  };
  let soundDone: Promise<unknown> | null = null;
  /** Asks for every sound file once; the scene's art has the link first. */
  const startSound = (): Promise<unknown> => {
    soundDone ??= Promise.all(
      soundUrls.map((url) => {
        let pending: Promise<unknown>;
        try {
          pending = Promise.resolve(fetchSound?.(url));
        } catch {
          pending = Promise.resolve();
        }
        return pending
          .catch(() => undefined)
          .then(() => {
            soundSettled += 1;
            report();
          });
      }),
    );
    return soundDone;
  };

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
    // A scene already in (a warm cache) leaves the link to the sound now.
    if (preloader.covers(sceneUrls)) void startSound();
    result = await preloader.preload(
      urls,
      (update) => {
        artProgress = update;
        // The scene is in: the sound shares the link with the rest.
        if (soundDone === null && preloader.covers(sceneUrls))
          void startSound();
        report();
      },
      // The scene's files load alone first, so the loading screen shows
      // the scene as early as the link allows (pulp_wars-2yc.11).
      { front: new Set(sceneUrls).size },
    );
  } catch {
    // A broken preloader must not keep the game from starting: every
    // raster then loads on demand, as it did before preloading.
    result = { total: 0, loaded: 0, failed: [], unfinished: 0 };
  }
  try {
    // The art is in: the sound has `soundHoldMs` more, then the game
    // starts and the files go on loading.
    let hold: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      startSound(),
      new Promise((resolve) => {
        hold = globalThis.setTimeout(
          resolve,
          options.soundHoldMs ?? SOUND_PRELOAD_HOLD_MS_V7,
        );
      }),
    ]);
    globalThis.clearTimeout(hold);
  } catch {
    // Sound files are optional; the game starts without them.
  } finally {
    await fonts;
    loadingEnded = true;
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
    settingsStorage,
    ensureLookAssets: (next) => waitFor(assetPreloadUrlsV7(next)),
    ensureFactionAssets: (next, factions, onProgress) =>
      waitFor(factionAssetUrlsV7(tiersOf(next), factions), onProgress),
  });

  // The app is on screen with its theme set: the music starts now where
  // the browser allows sound without a gesture, else with the first one
  // (its theme then already decoded). A sound file still on its way (a
  // slow link) is played when it arrives.
  try {
    app.view.audio.startWhenAllowed();
  } catch {
    // Sound is optional; the game goes on without it.
  }
  // Then each faction's art, in the background.
  const rest = Object.values(tiersOf(look).factions).flat();
  const background = (async (): Promise<void> => {
    try {
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
