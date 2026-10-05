/**
 * The asset-preload check of the Ruleset 7 browser smoke (bead
 * pulp_wars-2yc.6). The game preloads the art of its look behind the
 * loading screen; after that, a piece seen for the first time (a new unit
 * type, another faction's city, a Gallery sprite) must find its raster
 * already decoded. The app records every raster a loader had to fetch on
 * demand after the preload (`lazyAssetLoads`), which is the stand-in-then-
 * swap path: this check fails when the page it runs on recorded one, or
 * when the preload itself failed. It imports nothing from the source tree,
 * so it also runs against a deployed bundle.
 */
export interface PreloadSmokeDriverV7 {
  evaluate<T>(expression: string, awaitPromise?: boolean): Promise<T>;
}

interface PreloadEvidenceV7 {
  readonly look: string;
  readonly total: number;
  readonly loaded: number;
  readonly failed: number;
  readonly unfinished: number;
  readonly milliseconds: number;
  readonly loadingScreen: boolean;
  readonly lazy: readonly string[];
}

export async function assertPreloadedV7(
  driver: PreloadSmokeDriverV7,
  stage: string,
  look = "LIVE",
): Promise<string> {
  const evidence = await driver.evaluate<PreloadEvidenceV7 | null>(
    `(() => { const app = globalThis.__PULP_WARS_APP__; const preload = app?.preload; return preload === undefined ? null : { look: preload.look, total: preload.total, loaded: preload.loaded, failed: preload.failed.length, unfinished: preload.unfinished, milliseconds: preload.milliseconds, loadingScreen: document.querySelector('[data-v7-loading]') !== null, lazy: app.lazyAssetLoads() }; })()`,
  );
  if (
    evidence === null ||
    evidence.look !== look ||
    evidence.total < 300 ||
    evidence.loaded !== evidence.total ||
    evidence.failed !== 0 ||
    evidence.unfinished !== 0 ||
    evidence.loadingScreen ||
    evidence.lazy.length !== 0
  )
    throw new Error(
      `Asset preload check failed after ${stage}: ${JSON.stringify(evidence)}`,
    );
  return `${evidence.loaded} ${look} rasters preloaded in ${evidence.milliseconds} ms, none loaded on demand after ${stage}`;
}
