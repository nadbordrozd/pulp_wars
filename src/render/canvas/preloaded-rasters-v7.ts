/**
 * Rasters the asset preloader has fetched and decoded (bead pulp_wars-2yc.6,
 * src/app/asset-preloader-v7.ts), by URL. The board and interface loaders
 * ask here first: a preloaded raster is handed over at once, so the piece
 * is drawn with its final art in the frame that first shows it instead of
 * a stand-in that is swapped when the file arrives.
 *
 * One store per page, shared by every board host and view (the Gallery and
 * its preview mount their own). A URL that is not here, because nothing was
 * preloaded (tests, the art reviews) or because its preload failed, loads
 * the way it always did, with its fallback.
 */
const ready = new Map<string, HTMLImageElement>();
const lazy = new Set<string>();
let complete = false;

/** The decoded raster of a URL, or null when it was not preloaded. */
export function preloadedRasterV7(url: string): HTMLImageElement | null {
  return ready.get(url) ?? null;
}

export function storePreloadedRasterV7(
  url: string,
  image: HTMLImageElement,
): void {
  ready.set(url, image);
}

/** The preload has ended: a later load on demand is recorded. */
export function markRasterPreloadCompleteV7(): void {
  complete = true;
}

/**
 * A loader fetches `url` on demand. After the preload this is the path the
 * preload exists to avoid, so the URLs are kept for the browser smoke and
 * the tests (a failed preload and a raster outside the look's inventory
 * both show up here).
 */
export function noteLazyRasterV7(url: string): void {
  if (complete) lazy.add(url);
}

export function lazyRasterLoadsV7(): readonly string[] {
  return [...lazy];
}

export function preloadedRasterCountV7(): number {
  return ready.size;
}

/** Tests only: forget every raster and the lazy-load record. */
export function resetPreloadedRastersV7(): void {
  ready.clear();
  lazy.clear();
  complete = false;
}
