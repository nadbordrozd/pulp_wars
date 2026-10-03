/**
 * The unit assets of the live look, for the unit-shadow measurement and
 * review scripts (bead pulp_wars-jg1).
 */
import path from "node:path";
import process from "node:process";
import { createServer } from "vite";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
  ChibiArtRegistryV7,
} from "../../../src/assets/chibi-art-v7";

const ROOT = process.cwd();

/** Every asset module the live direction registry is built from. */
const MODULES = [
  [
    "/src/assets/chibi-direction-art-manifest.ts",
    ["CHIBI_DIRECTION_ART_ASSETS_V7", "CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7"],
  ],
  [
    "/src/assets/chibi-direction-undead-art-manifest.ts",
    ["CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7"],
  ],
  [
    "/src/assets/chibi-direction-dinosaur-art-manifest.ts",
    ["CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7"],
  ],
  [
    "/src/assets/chibi-direction-martian-art-manifest.ts",
    ["CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7"],
  ],
  [
    "/src/assets/chibi-direction-ice-folk-art-manifest.ts",
    ["CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7"],
  ],
  [
    "/src/assets/chibi-direction-dwarf-art-manifest.ts",
    ["CHIBI_DIRECTION_DWARF_ART_ASSETS_V7"],
  ],
] as const;

/**
 * The unit assets the live look draws first, one per subject, in manifest
 * order. The manifests build their URLs from Vite's import.meta.env, so
 * they are loaded through a Vite server rather than imported by tsx.
 */
export async function liveUnitAssetsV7(): Promise<ChibiArtAssetV7[]> {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const assets: ChibiArtAssetV7[] = [];
    for (const [file, names] of MODULES) {
      const module = await server.ssrLoadModule(file);
      for (const name of names)
        assets.push(...(module[name] as readonly ChibiArtAssetV7[]));
    }
    const naval = await server.ssrLoadModule(
      "/src/assets/chibi-naval-faction-art-manifest.ts",
    );
    assets.push(
      ...(
        naval.CHIBI_NAVAL_FACTION_ART_ASSETS_V7 as readonly {
          readonly asset: ChibiArtAssetV7;
        }[]
      ).map((entry) => entry.asset),
    );
    const human = await server.ssrLoadModule(
      "/src/assets/chibi-direction-art-manifest.ts",
    );
    const registry = human.chibiDirectionArtRegistryV7() as ChibiArtRegistryV7;
    const seen = new Set<ArtSubjectV7>();
    const live: ChibiArtAssetV7[] = [];
    for (const asset of assets) {
      if (!asset.subject.startsWith("UNIT:") || seen.has(asset.subject))
        continue;
      seen.add(asset.subject);
      const first = registry.variants(asset.subject)[0];
      if (first !== undefined) live.push(first);
    }
    return live;
  } finally {
    await server.close();
  }
}

/** The public file of an asset URL (`/assets/...` at the dev base `/`). */
export function publicFileOfUrlV7(url: string): string {
  return path.join(ROOT, "public", url.replace(/^\//, ""));
}
