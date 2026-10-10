import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assetCachePlugin,
  assetManifestOfFilesV1,
  writeAssetManifestV1,
} from "../../scripts/build/asset-cache-plugin";
import {
  ASSET_CACHE_WORKER_FILE_V1,
  ASSET_MANIFEST_FILE_V1,
  assetCacheKeyV1,
  parseAssetManifestV1,
} from "../../src/service-worker/asset-manifest";
import viteConfig from "../../vite.config";

/**
 * The build's asset manifest (bead pulp_wars-2yc.11): what it lists, how a
 * build is identified, and what the service worker accepts as a manifest.
 */
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const sha16 = (text: string): string =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

const FILES = new Map([
  ["index.html", bytes("<html></html>")],
  ["assets/index-Dgv0Tiah.js", bytes("boot()")],
  ["assets/chibi/units/knight.png", bytes("knight")],
  ["assets/audio/click-1.m4a", bytes("click")],
]);

describe("asset manifest of a build", () => {
  it("lists every file of the site with the hash of its bytes, sorted", () => {
    const manifest = assetManifestOfFilesV1(FILES);
    expect(manifest.format).toBe("pulp-wars-asset-manifest");
    expect(manifest.version).toBe(1);
    // The switch as shipped: the worker is on.
    expect(manifest.worker).toBe("on");
    expect(manifest.files).toEqual({
      "assets/audio/click-1.m4a": sha16("click"),
      "assets/chibi/units/knight.png": sha16("knight"),
      "assets/index-Dgv0Tiah.js": sha16("boot()"),
      "index.html": sha16("<html></html>"),
    });
    expect(Object.keys(manifest.files)).toEqual(
      [...Object.keys(manifest.files)].sort(),
    );
    expect(manifest.build).toMatch(/^[0-9a-f]{16}$/);
    expect(parseAssetManifestV1(JSON.parse(JSON.stringify(manifest)))).toEqual(
      manifest,
    );
  });

  it("leaves out the worker, the manifest itself and hidden files", () => {
    const manifest = assetManifestOfFilesV1(
      new Map([
        ...FILES,
        [ASSET_CACHE_WORKER_FILE_V1, bytes("worker")],
        [ASSET_MANIFEST_FILE_V1, bytes("{}")],
        [".DS_Store", bytes("finder")],
        ["assets/.DS_Store", bytes("finder")],
      ]),
    );
    expect(manifest).toEqual(assetManifestOfFilesV1(FILES));
  });

  it("identifies the build by its files: the same files give the same id, any change another", () => {
    const build = assetManifestOfFilesV1(FILES).build;
    expect(assetManifestOfFilesV1(new Map([...FILES].reverse())).build).toBe(
      build,
    );
    const changed = new Map(FILES).set(
      "assets/chibi/units/knight.png",
      bytes("knight, repainted"),
    );
    const renamed = new Map(FILES);
    renamed.delete("assets/index-Dgv0Tiah.js");
    renamed.set("assets/index-ZZZZZZZZ.js", bytes("boot()"));
    const added = new Map(FILES).set("assets/new.png", bytes("new"));
    const ids = [changed, renamed, added].map(
      (files) => assetManifestOfFilesV1(files).build,
    );
    expect(new Set([build, ...ids]).size).toBe(4);
    // Only the changed file's entry differs: the others are found again
    // in the worker's cache under the same key.
    const before = assetManifestOfFilesV1(FILES).files;
    const after = assetManifestOfFilesV1(changed).files;
    expect(
      Object.keys(after).filter((file) => after[file] !== before[file]),
    ).toEqual(["assets/chibi/units/knight.png"]);
    const scope = "https://example.test/pulp_wars/";
    expect(
      assetCacheKeyV1(scope, "index.html", after["index.html"] as string),
    ).toBe(
      assetCacheKeyV1(scope, "index.html", before["index.html"] as string),
    );
    expect(
      assetCacheKeyV1(scope, "index.html", after["index.html"] as string),
    ).toBe(`${scope}index.html?sha256=${sha16("<html></html>")}`);
  });
});

describe("the switch in the manifest", () => {
  it('writes "off" when the build\'s switch is off, and nothing else changes', () => {
    const on = assetManifestOfFilesV1(FILES, true);
    const off = assetManifestOfFilesV1(FILES, false);
    expect(on.worker).toBe("on");
    expect(off).toEqual({ ...on, worker: "off" });
    // Both are manifests the worker reads; it acts on the field.
    expect(parseAssetManifestV1(JSON.parse(JSON.stringify(off)))?.worker).toBe(
      "off",
    );
    // The default is the one constant.
    expect(assetManifestOfFilesV1(FILES)).toEqual(on);
    const source = readFileSync("src/service-worker/asset-manifest.ts", "utf8");
    expect(source).toContain(
      "export const ASSET_CACHE_WORKER_ENABLED_V1 = true;",
    );
  });
});

describe("asset manifest written into a built site", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0))
      rmSync(folder, { recursive: true, force: true });
  });

  it("covers the folder's files by forward-slash path and does not list itself on a rebuild", () => {
    const site = mkdtempSync(path.join(tmpdir(), "pulp-wars-manifest-"));
    folders.push(site);
    mkdirSync(path.join(site, "assets", "chibi"), { recursive: true });
    writeFileSync(path.join(site, "index.html"), "<html></html>");
    writeFileSync(path.join(site, "sw.js"), "worker");
    writeFileSync(path.join(site, "assets", "chibi", "knight.png"), "knight");
    const manifest = writeAssetManifestV1(site);
    expect(manifest.files).toEqual({
      "assets/chibi/knight.png": sha16("knight"),
      "index.html": sha16("<html></html>"),
    });
    const written = readFileSync(
      path.join(site, ASSET_MANIFEST_FILE_V1),
      "utf8",
    );
    expect(parseAssetManifestV1(JSON.parse(written))).toEqual(manifest);
    // Writing again over the first manifest gives the same bytes.
    writeAssetManifestV1(site);
    expect(readFileSync(path.join(site, ASSET_MANIFEST_FILE_V1), "utf8")).toBe(
      written,
    );
    // A build with the switch off says so in the file the worker fetches.
    writeAssetManifestV1(site, false);
    expect(
      JSON.parse(readFileSync(path.join(site, ASSET_MANIFEST_FILE_V1), "utf8")),
    ).toEqual({ ...manifest, worker: "off" });
  });
});

describe("asset manifest as the worker reads it", () => {
  const good = assetManifestOfFilesV1(FILES);
  const hash = sha16("x");

  it("rejects anything that is not a manifest of this format", () => {
    for (const bad of [
      null,
      "manifest",
      [],
      { ...good, format: "something-else" },
      { ...good, version: 2 },
      { ...good, worker: undefined },
      { ...good, worker: "maybe" },
      { ...good, worker: true },
      { ...good, build: "short" },
      { ...good, build: undefined },
      { ...good, files: null },
      { ...good, files: { "index.html": "nothex" } },
      { ...good, files: { "index.html": hash.toUpperCase() } },
      { ...good, files: { "index.html": 7 } },
    ])
      expect(parseAssetManifestV1(bad)).toBeNull();
  });

  it("rejects paths that could name anything but a file under the site", () => {
    for (const file of [
      "",
      "/index.html",
      "../secret.png",
      "assets/../../secret.png",
      "assets//knight.png",
      "assets\\knight.png",
      "assets/knight.png?v=2",
      "assets/knight.png#top",
      "https://elsewhere.test/a.png",
      ASSET_CACHE_WORKER_FILE_V1,
      ASSET_MANIFEST_FILE_V1,
      "assets/.hidden",
    ])
      expect(
        parseAssetManifestV1({ ...good, files: { [file]: hash } }),
        file,
      ).toBeNull();
    expect(
      parseAssetManifestV1({ ...good, files: { "assets/a b.png": hash } }),
    ).not.toBeNull();
  });
});

describe("build configuration", () => {
  const config = (command: "build" | "serve") =>
    typeof viteConfig === "function"
      ? viteConfig({ command, mode: "test", isPreview: false })
      : viteConfig;

  it("adds the worker and manifest to a build only, under the Pages base", async () => {
    const plugin = assetCachePlugin();
    expect(plugin.name).toBe("pulp-wars-asset-cache");
    // Not the development server, not the tests.
    expect(plugin.apply).toBe("build");
    const build = await config("build");
    expect(build.base).toBe("/pulp_wars/");
    expect(
      (build.plugins ?? [])
        .flat()
        .map((entry) =>
          entry !== null && typeof entry === "object" && "name" in entry
            ? entry.name
            : null,
        ),
    ).toContain("pulp-wars-asset-cache");
    expect((await config("serve")).base).toBe("/");
  });

  it("builds the worker from a script that pulls in nothing of the game", () => {
    const imports = (file: string): string[] =>
      [...readFileSync(file, "utf8").matchAll(/from\s+"([^"]+)"/g)].map(
        (match) => match[1] as string,
      );
    expect(imports("src/service-worker/entry.ts")).toEqual([
      "./asset-cache-worker",
    ]);
    expect(imports("src/service-worker/asset-cache-worker.ts")).toEqual([
      "./asset-manifest",
    ]);
    expect(imports("src/service-worker/asset-manifest.ts")).toEqual([]);
  });
});
