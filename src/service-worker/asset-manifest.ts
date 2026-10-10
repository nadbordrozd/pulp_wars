/**
 * The asset manifest of a build (bead pulp_wars-2yc.11): every file of the
 * deployed site with the SHA-256 of its bytes. The build writes it beside
 * the page (scripts/build/asset-cache-plugin.ts); the service worker
 * (asset-cache-worker.ts) reads it on every visit and serves from its cache
 * only a file whose bytes it has checked against the hash listed here.
 *
 * Paths are relative to the site's base ("index.html",
 * "assets/chibi/units/knight.png"), so the same manifest serves the site
 * under `/pulp_wars/` and under `/`.
 */
export const ASSET_MANIFEST_FILE_V1 = "asset-manifest.json";
export const ASSET_CACHE_WORKER_FILE_V1 = "sw.js";
export const ASSET_MANIFEST_FORMAT_V1 = "pulp-wars-asset-manifest";
/**
 * THE SWITCH. Set this to false and deploy to turn the service worker off
 * everywhere: the build then writes `"worker": "off"` into its manifest and
 * the page no longer registers the worker. On a visitor's next visit the
 * worker they already have reads that manifest, deletes its caches and
 * unregisters itself, and the page removes any registration it finds
 * (docs/architecture/CLIENT_ARCHITECTURE.md, "How to turn the worker off").
 */
export const ASSET_CACHE_WORKER_ENABLED_V1 = true;
/** One visitor's escape: a page loaded with this query removes the worker. */
export const ASSET_CACHE_ESCAPE_PARAMETER_V1 = "no-cache-worker";
/** Every cache of the worker starts with this; the suffix is its format. */
export const ASSET_CACHE_PREFIX_V1 = "pulp-wars-assets-";
/** Hexadecimal digits of the SHA-256 kept per file: 64 bits. */
export const ASSET_HASH_LENGTH_V1 = 16;

export interface AssetManifestV1 {
  readonly format: typeof ASSET_MANIFEST_FORMAT_V1;
  readonly version: 1;
  /**
   * "off" tells every worker that reads the manifest to delete its caches
   * and unregister. A worker treats a manifest it cannot read the same way.
   */
  readonly worker: "on" | "off";
  /** Identity of the build: a hash over every path and file hash. */
  readonly build: string;
  /** Path relative to the base, to the first hex digits of its SHA-256. */
  readonly files: Readonly<Record<string, string>>;
}

const HASH = new RegExp(`^[0-9a-f]{${ASSET_HASH_LENGTH_V1}}$`);

/** Files the worker never serves: the browser must always fetch them. */
export function assetManifestExcludesV1(path: string): boolean {
  return (
    path === ASSET_MANIFEST_FILE_V1 ||
    path === ASSET_CACHE_WORKER_FILE_V1 ||
    path.split("/").some((part) => part.startsWith("."))
  );
}

function safePath(path: string): boolean {
  return (
    path !== "" &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("?") &&
    !path.includes("#") &&
    path.split("/").every((part) => part !== "" && part !== "..")
  );
}

/** The manifest of parsed JSON, or null when it is not one this code reads. */
export function parseAssetManifestV1(value: unknown): AssetManifestV1 | null {
  if (typeof value !== "object" || value === null) return null;
  const { format, version, worker, build, files } = value as Record<
    string,
    unknown
  >;
  if (
    format !== ASSET_MANIFEST_FORMAT_V1 ||
    version !== 1 ||
    (worker !== "on" && worker !== "off") ||
    typeof build !== "string" ||
    !HASH.test(build) ||
    typeof files !== "object" ||
    files === null
  )
    return null;
  for (const [path, hash] of Object.entries(files))
    if (
      !safePath(path) ||
      assetManifestExcludesV1(path) ||
      typeof hash !== "string" ||
      !HASH.test(hash)
    )
      return null;
  return {
    format,
    version,
    worker,
    build,
    files: files as Record<string, string>,
  };
}

/**
 * The cache entry of one version of one file. The hash is part of the key,
 * so a file that changes in a deploy is a different entry and one that does
 * not is found again.
 */
export function assetCacheKeyV1(
  scope: string,
  path: string,
  hash: string,
): string {
  return `${scope}${path}?sha256=${hash}`;
}
