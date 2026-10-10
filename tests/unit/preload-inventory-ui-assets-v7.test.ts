import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assetGroupOfSubjectV7,
  assetInventoryForFactionsV7,
  assetInventoryV7,
  assetLookV7,
  assetPreloadUrlsV7,
  chibiAssetUrlsV7,
  liveFallbackOnlyAssetV7,
} from "../../src/assets/asset-inventory-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { chibiDirectionArtAssetsV7 } from "../../src/assets/chibi-direction-art-manifest";
import { FACTION_IDS_V7, OFFERED_FACTION_IDS_V7 } from "../../src/engine/index";

/**
 * The asset preloader's inventory (bead pulp_wars-2yc.6): complete against
 * every manifest module under src/assets, so a raster added to a manifest
 * cannot be left to load on first sight.
 */
const ASSETS_DIRECTORY = path.resolve("src/assets");

/** Every string ending in .png reachable from a module's exported data. */
function rasterUrls(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") return /\.png$/.test(value) ? [value] : [];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return (
    Array.isArray(value) ? value : Object.values(value as object)
  ).flatMap((entry) => rasterUrls(entry, seen));
}

async function manifestRasterUrls(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const file of readdirSync(ASSETS_DIRECTORY).sort()) {
    if (!file.endsWith(".ts") || file === "asset-inventory-v7.ts") continue;
    const module = (await import(
      /* @vite-ignore */ path.join(ASSETS_DIRECTORY, file)
    )) as Record<string, unknown>;
    for (const url of rasterUrls(Object.values(module))) found.set(url, file);
  }
  return found;
}

const urlsOf = (look: Parameters<typeof assetInventoryV7>[0]): Set<string> =>
  new Set(assetInventoryV7(look).map((entry) => entry.url));

describe("Ruleset 7 asset inventory", () => {
  it("covers every raster a manifest under src/assets exports", async () => {
    const manifests = await manifestRasterUrls();
    // The scan sees the manifests: the CHIBI set and the PixelLab set.
    expect(manifests.size).toBeGreaterThan(900);
    // The CHIBI set: the live look and the classic look's own rasters.
    const chibi = new Set([...urlsOf("LIVE"), ...urlsOf("CLASSIC")]);
    const legacy = urlsOf("LEGACY");
    const uncovered: string[] = [];
    for (const [url, file] of manifests) {
      const covered = url.includes("assets/chibi/")
        ? chibi.has(url)
        : url.includes("assets/pixellab/")
          ? legacy.has(url)
          : false;
      if (!covered) uncovered.push(`${file}: ${url}`);
    }
    expect(uncovered).toEqual([]);
    // And nothing in an inventory comes from anywhere but a manifest.
    for (const url of [...chibi, ...legacy])
      expect(manifests.has(url), url).toBe(true);
  });

  it("lists only files that exist, each once", () => {
    for (const look of ["LIVE", "CLASSIC", "LEGACY"] as const) {
      const entries = assetInventoryV7(look);
      expect(new Set(entries.map((entry) => entry.url)).size).toBe(
        entries.length,
      );
      for (const { url } of entries)
        expect(existsSync(path.join("public", url)), url).toBe(true);
    }
  });

  it("lists every file of a raster: densities, owner mask and layers", () => {
    expect(
      chibiAssetUrlsV7({
        id: "x",
        subject: "TERRAIN:FOREST",
        assetClass: "TALL_TERRAIN",
        width: 80,
        height: 104,
        url: "/x.png",
        densityUrls: { 2: "/x@2.png", 3: "/x@3.png" },
        ownerMaskUrl: "/x.mask.png",
        layers: { bodyUrl: "/x.body.png", groundUrl: "/ground.png" },
      }),
    ).toEqual([
      "/x.png",
      "/x@2.png",
      "/x@3.png",
      "/x.mask.png",
      "/x.body.png",
      "/ground.png",
    ]);
    const live = urlsOf("LIVE");
    const classic = urlsOf("CLASSIC");
    for (const asset of chibiDirectionArtAssetsV7())
      for (const url of chibiAssetUrlsV7(asset))
        expect(live.has(url), url).toBe(true);
    for (const asset of CHIBI_ART_ASSETS_V7)
      for (const url of chibiAssetUrlsV7(asset)) {
        expect(classic.has(url), url).toBe(true);
        if (!liveFallbackOnlyAssetV7(asset))
          expect(live.has(url), url).toBe(true);
      }
    expect(
      CHIBI_ART_ASSETS_V7.some((asset) => asset.ownerMaskUrl !== undefined),
    ).toBe(true);
  });

  it("keeps the looks apart: the live look holds the classic art it draws, LEGACY is the PixelLab set", () => {
    const live = urlsOf("LIVE");
    const classic = urlsOf("CLASSIC");
    const legacy = urlsOf("LEGACY");
    // What the live look leaves to the classic look (pulp_wars-2yc.42):
    // the default raster of a unit, city or improvement whose subject
    // the direction draws. Nothing else of the classic look.
    const fallbackOnly = new Set(
      CHIBI_ART_ASSETS_V7.filter(liveFallbackOnlyAssetV7).flatMap(
        chibiAssetUrlsV7,
      ),
    );
    expect(fallbackOnly.size).toBeGreaterThan(80);
    for (const url of classic)
      expect(live.has(url), url).toBe(!fallbackOnly.has(url));
    const directed = new Set(
      chibiDirectionArtAssetsV7().map((asset) => asset.subject),
    );
    for (const asset of CHIBI_ART_ASSETS_V7) {
      if (!liveFallbackOnlyAssetV7(asset)) continue;
      expect(directed.has(asset.subject), asset.subject).toBe(true);
      expect(asset.subject, asset.subject).toMatch(
        /^(UNIT|CITY|IMPROVEMENT):|^SITE:VILLAGE$/,
      );
    }
    // The shared ships stand in for a faction without ships of its own,
    // and terrain, icons, effects and portraits are drawn from the
    // default art by the board.
    const kept = (subject: string): boolean =>
      CHIBI_ART_ASSETS_V7.filter((asset) => asset.subject === subject).every(
        (asset) => !liveFallbackOnlyAssetV7(asset),
      );
    for (const subject of [
      "UNIT:PATROL_BOAT",
      "UNIT:BATTLESHIP",
      "PORTRAIT:SUBMARINE",
      "PORTRAIT:FIGHTER",
      "TERRAIN:MINED_MOUNTAIN",
      "TERRAIN:GRASS",
      "ICON:HUD:COIN",
    ])
      expect(kept(subject), subject).toBe(true);
    expect(live.size).toBeGreaterThan(classic.size);
    // The direction's own art is what the classic look leaves out.
    const direction = chibiDirectionArtAssetsV7().map((asset) => asset.url);
    expect(direction.some((url) => !classic.has(url))).toBe(true);
    for (const url of legacy) {
      expect(url).toContain("assets/pixellab/");
      expect(live.has(url)).toBe(false);
    }
    expect(assetLookV7("CHIBI")).toBe("LIVE");
    expect(assetLookV7("CHIBI", true)).toBe("CLASSIC");
    expect(assetLookV7("LEGACY")).toBe("LEGACY");
    expect(assetLookV7("LEGACY", true)).toBe("LEGACY");
  });

  it("groups art by faction and gives a match only its factions' art", () => {
    expect(assetGroupOfSubjectV7("UNIT:UNDEAD:FIGHTER")).toBe("UNDEAD");
    expect(assetGroupOfSubjectV7("CITY:GOBLIN:2")).toBe("GOBLIN");
    expect(assetGroupOfSubjectV7("TERRAIN:UNDEAD:GRASS")).toBe("UNDEAD");
    expect(assetGroupOfSubjectV7("PORTRAIT:ICE_FOLK:GUARD")).toBe("ICE_FOLK");
    // The Humans draw the shared subjects.
    expect(assetGroupOfSubjectV7("UNIT:FIGHTER")).toBe("SHARED");
    expect(assetGroupOfSubjectV7("ICON:ACTION:RAM")).toBe("SHARED");

    const all = assetInventoryV7("LIVE");
    const groups = new Set(all.map((entry) => entry.group));
    for (const faction of OFFERED_FACTION_IDS_V7)
      if (faction !== "ORIGINAL")
        expect(groups.has(faction), faction).toBe(true);
    expect(groups.has("SHARED")).toBe(true);

    const duel = assetInventoryForFactionsV7("LIVE", ["ORIGINAL", "UNDEAD"]);
    expect(new Set(duel.map((entry) => entry.group))).toEqual(
      new Set(["SHARED", "UNDEAD"]),
    );
    expect(duel.length).toBeLessThan(all.length);
    const shared = all.filter((entry) => entry.group === "SHARED");
    expect(assetInventoryForFactionsV7("LIVE", ["ORIGINAL"])).toEqual(shared);
    for (const entry of shared) expect(duel).toContainEqual(entry);
    expect(
      duel.some((entry) => entry.url.includes("chibi-direction-undead")),
    ).toBe(true);
    expect(duel.some((entry) => entry.url.includes("goblin"))).toBe(false);
    // Every faction in play is the whole look.
    expect(assetInventoryForFactionsV7("LIVE", FACTION_IDS_V7)).toEqual(all);
    // The hidden Cult has its unit art since bead pulp_wars-mch9.15: a match
    // of the offered factions loads everything but the Cult's files.
    expect(assetInventoryForFactionsV7("LIVE", OFFERED_FACTION_IDS_V7)).toEqual(
      all.filter((entry) => entry.group !== "CULT"),
    );
    expect(all.some((entry) => entry.group === "CULT")).toBe(true);
  });

  it("preloads the shared art first", () => {
    const order = assetPreloadUrlsV7("LIVE");
    const all = assetInventoryV7("LIVE");
    expect(new Set(order)).toEqual(new Set(all.map((entry) => entry.url)));
    const shared = all.filter((entry) => entry.group === "SHARED").length;
    const groupOf = new Map(all.map((entry) => [entry.url, entry.group]));
    expect(
      order.slice(0, shared).every((url) => groupOf.get(url) === "SHARED"),
    ).toBe(true);
    expect(
      order.slice(shared).every((url) => groupOf.get(url) !== "SHARED"),
    ).toBe(true);
  });
});
