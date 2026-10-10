import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  ASSET_CACHE_WORKER_ENABLED_V1,
  ASSET_CACHE_WORKER_FILE_V1,
  ASSET_HASH_LENGTH_V1,
  ASSET_MANIFEST_FILE_V1,
  ASSET_MANIFEST_FORMAT_V1,
  assetManifestExcludesV1,
  type AssetManifestV1,
} from "../../src/service-worker/asset-manifest.ts";

/**
 * The build's part of the asset cache (bead pulp_wars-2yc.11). After the
 * site is written it adds two files beside the page:
 *
 * - `sw.js`: the service worker, bundled from src/service-worker/entry.ts
 *   as one classic script. It names no file and no version, so its bytes
 *   change only when its logic does.
 * - `asset-manifest.json`: every file of the site with the SHA-256 of its
 *   bytes, and a build id hashed from that list. The worker fetches it on
 *   every visit; a deploy is whatever changed in it.
 *
 * Only `vite build` runs this: the development server and the tests have
 * no worker and no manifest.
 */

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** The manifest of a set of files, by path relative to the site's base. */
export function assetManifestOfFilesV1(
  files: ReadonlyMap<string, Uint8Array>,
  workerEnabled: boolean = ASSET_CACHE_WORKER_ENABLED_V1,
): AssetManifestV1 {
  const listed = [...files]
    .filter(([file]) => !assetManifestExcludesV1(file))
    .map(
      ([file, bytes]) =>
        [file, sha256(bytes).slice(0, ASSET_HASH_LENGTH_V1)] as const,
    )
    // Sorted by code unit, so the same files give the same manifest on
    // every machine.
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return {
    format: ASSET_MANIFEST_FORMAT_V1,
    version: 1,
    // The switch (ASSET_CACHE_WORKER_ENABLED_V1): "off" retires every
    // worker that reads this manifest.
    worker: workerEnabled ? "on" : "off",
    build: sha256(
      listed.map(([file, hash]) => `${file}\n${hash}\n`).join(""),
    ).slice(0, ASSET_HASH_LENGTH_V1),
    files: Object.fromEntries(listed),
  };
}

/** Every file under a folder, by its path with forward slashes. */
export function readSiteFilesV1(directory: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const entry of readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    files.set(
      path.relative(directory, file).split(path.sep).join("/"),
      readFileSync(file),
    );
  }
  return files;
}

/** Writes the manifest of a built site into it and returns it. */
export function writeAssetManifestV1(
  directory: string,
  workerEnabled: boolean = ASSET_CACHE_WORKER_ENABLED_V1,
): AssetManifestV1 {
  const manifest = assetManifestOfFilesV1(
    readSiteFilesV1(directory),
    workerEnabled,
  );
  writeFileSync(
    path.join(directory, ASSET_MANIFEST_FILE_V1),
    `${JSON.stringify(manifest)}\n`,
  );
  return manifest;
}

export function assetCachePlugin(): Plugin {
  let root = process.cwd();
  let outDir = "dist";
  let failed = false;
  return {
    name: "pulp-wars-asset-cache",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    buildEnd(error) {
      failed = error !== undefined;
    },
    async closeBundle() {
      if (failed) return;
      const { build } = await import("vite");
      await build({
        root,
        configFile: false,
        publicDir: false,
        logLevel: "warn",
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          lib: {
            entry: path.resolve(root, "src/service-worker/entry.ts"),
            formats: ["iife"],
            name: "PulpWarsAssetCache",
            fileName: () => ASSET_CACHE_WORKER_FILE_V1,
          },
        },
      });
      const manifest = writeAssetManifestV1(outDir);
      this.info(
        `asset cache: ${Object.keys(manifest.files).length} files, build ${manifest.build}, worker ${manifest.worker}`,
      );
    },
  };
}
