import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  chibiAnchorV7,
  chibiAssetProblemsV7,
} from "../../src/assets/chibi-art-v7";
import {
  GOBLIN_PLACEHOLDER_PALETTE,
  GOBLIN_PLACEHOLDER_RECORDS,
  GOBLIN_PLACEHOLDER_REPLACED_BY,
  GOBLIN_PLACEHOLDER_SPECS_V7,
  extractedMaskMatches,
  offPalettePixels,
  renderGoblinPlaceholdersV7,
} from "../../scripts/art/chibi/goblin-placeholders";
import { maskToRgba, rgbaToMask } from "../../scripts/art/chibi/owner-mask";
import { pixelSha256, readRaster } from "../../scripts/art/chibi/pipeline";

// Bead pulp_wars-0ao.4: programmatic Goblin placeholders (spec section 11.4,
// docs/art/factions/GOBLIN.md "Placeholders").

interface PlaceholderRecord {
  readonly id: string;
  readonly subject: string;
  readonly assetClass: string;
  readonly anchor: "default" | { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
  readonly status: string;
  readonly replacedBy: string;
  readonly master: { readonly path: string; readonly pixelSha256: string };
  readonly mask: { readonly path: string; readonly pixelSha256: string };
  readonly maskQa: { readonly status: string; readonly coverage: number };
}

const LAND_ROLES = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
] as const;

async function storedRecords(): Promise<{
  readonly kind: string;
  readonly pixelLab: boolean;
  readonly replacedBy: string;
  readonly assets: readonly PlaceholderRecord[];
}> {
  return JSON.parse(await readFile(GOBLIN_PLACEHOLDER_RECORDS, "utf8"));
}

describe("Goblin placeholder sprites", () => {
  const renders = renderGoblinPlaceholdersV7();

  it("covers the eight Goblin land roles once, and no ship", () => {
    expect(GOBLIN_PLACEHOLDER_SPECS_V7.map((spec) => spec.role).sort()).toEqual(
      [...LAND_ROLES].sort(),
    );
    expect(GOBLIN_PLACEHOLDER_SPECS_V7.map((spec) => spec.name)).toEqual([
      "Goblin",
      "Wolf Rider",
      "Bomb Chucker",
      "Orc Brute",
      "Orc Warboss",
      "Rocket Cart",
      "Scrap Buggy",
      "Troll",
    ]);
  });

  it("re-renders the checked-in masters, masks and records exactly", async () => {
    const stored = await storedRecords();
    expect(stored.kind).toBe("PROGRAMMATIC_PLACEHOLDER");
    expect(stored.pixelLab).toBe(false);
    expect(stored.replacedBy).toBe(GOBLIN_PLACEHOLDER_REPLACED_BY);
    expect(stored.assets.map((record) => record.id)).toEqual(
      renders.map((render) => render.spec.id),
    );
    for (const render of renders) {
      const record = stored.assets.find((entry) => entry.id === render.spec.id);
      if (record === undefined) throw new Error(render.spec.id);
      expect(record.status).toBe("PLACEHOLDER");
      expect(record.subject).toBe(`UNIT:GOBLIN:${render.spec.role}`);
      const master = await readRaster(record.master.path);
      const mask = await readRaster(record.mask.path);
      expect(pixelSha256(master), render.spec.id).toBe(
        pixelSha256(render.master),
      );
      expect(pixelSha256(master)).toBe(record.master.pixelSha256);
      const expectedMask = {
        width: render.mask.width,
        height: render.mask.height,
        data: maskToRgba(render.mask),
      };
      expect(pixelSha256(mask), render.spec.id).toBe(pixelSha256(expectedMask));
      expect(pixelSha256(mask)).toBe(record.mask.pixelSha256);
      expect(rgbaToMask(mask).bits).toEqual(render.mask.bits);
      expect(record.maskQa).toMatchObject({
        status: "PASS",
        coverage: render.qa.coverage,
      });
    }
  });

  it("uses only the GOBLIN.md palette, a black outline and a 20-40% key-colour owner area", () => {
    const black = [0, 0, 0];
    const fuse = [
      GOBLIN_PLACEHOLDER_PALETTE.cream,
      GOBLIN_PLACEHOLDER_PALETTE.spark,
    ].map((value) => {
      const parsed = Number.parseInt(value.slice(1), 16);
      return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
    });
    for (const render of renders) {
      const { spec, master, qa } = render;
      expect(offPalettePixels(master), spec.id).toBe(0);
      expect(qa.status, spec.id).toBe("PASS");
      expect(qa.coverageOnTarget, spec.id).toBe(true);
      expect(qa.coverage).toBeGreaterThanOrEqual(0.2);
      expect(qa.coverage).toBeLessThanOrEqual(0.4);
      // The mask is exactly the key-colour pixels, as the pipeline extracts.
      expect(extractedMaskMatches(render), spec.id).toBe(true);
      // The silhouette edge is the black outline; only the unoutlined
      // cream fuses and pale sparks may sit on it.
      const opaque = (x: number, y: number): boolean =>
        x >= 0 &&
        y >= 0 &&
        x < master.width &&
        y < master.height &&
        (master.data[(y * master.width + x) * 4 + 3] ?? 0) > 0;
      let edge = 0;
      let outlined = 0;
      for (let y = 0; y < master.height; y += 1)
        for (let x = 0; x < master.width; x += 1) {
          if (!opaque(x, y)) continue;
          if (
            opaque(x - 1, y) &&
            opaque(x + 1, y) &&
            opaque(x, y - 1) &&
            opaque(x, y + 1)
          )
            continue;
          const offset = (y * master.width + x) * 4;
          const rgb = [...master.data.slice(offset, offset + 3)];
          if (fuse.some((colour) => rgb.every((v, i) => v === colour[i])))
            continue;
          edge += 1;
          if (rgb.every((value, index) => value === black[index]))
            outlined += 1;
        }
      expect(outlined / edge, spec.id).toBe(1);
      // Opaque pixels are fully opaque: crisp pixel edges.
      for (let index = 3; index < master.data.length; index += 4)
        expect([0, 255]).toContain(master.data[index]);
    }
    expect(GOBLIN_PLACEHOLDER_PALETTE.key).toBe("#d8262c");
  });

  it("registers each placeholder as UNIT:GOBLIN:<ROLE> on its Human role's canvas, marked for replacement", async () => {
    const stored = await storedRecords();
    const goblin = CHIBI_ART_ASSETS_V7.filter((asset) =>
      asset.subject.startsWith("UNIT:GOBLIN:"),
    );
    expect(goblin.map((asset) => asset.subject).sort()).toEqual(
      LAND_ROLES.map((role) => `UNIT:GOBLIN:${role}`).sort(),
    );
    for (const asset of goblin) {
      const role = asset.subject.slice("UNIT:GOBLIN:".length);
      const human = CHIBI_ART_ASSETS_V7.find(
        (entry) => entry.subject === `UNIT:${role}`,
      );
      if (human === undefined) throw new Error(role);
      // Same class and canvas as the Human sprite, and its anchor height,
      // so the chibi unit scale contract holds; an anchor may move at most
      // 4 px right to clear the overlays (as for the Undead Ghoul).
      expect({
        assetClass: asset.assetClass,
        width: asset.width,
        height: asset.height,
      }).toEqual({
        assetClass: human.assetClass,
        width: human.width,
        height: human.height,
      });
      const anchor = chibiAnchorV7(asset);
      const humanAnchor = chibiAnchorV7(human);
      expect(anchor.y).toBe(humanAnchor.y);
      expect(humanAnchor.x - anchor.x).toBeGreaterThanOrEqual(0);
      expect(humanAnchor.x - anchor.x).toBeLessThanOrEqual(4);
      expect(chibiAssetProblemsV7(asset)).toEqual([]);
      expect(asset.placeholder).toEqual({
        records: GOBLIN_PLACEHOLDER_RECORDS,
        replacedBy: GOBLIN_PLACEHOLDER_REPLACED_BY,
      });
      const record = stored.assets.find((entry) => entry.id === asset.id);
      if (record === undefined) throw new Error(asset.id);
      expect(record.subject).toBe(asset.subject);
      expect(record.anchor).toEqual(asset.anchor ?? "default");
      expect(record.assetClass).toBe(asset.assetClass);
      expect([record.width, record.height]).toEqual([
        asset.width,
        asset.height,
      ]);
      const url = (file: string) => file.replace(/^public\//, "");
      expect(asset.url.endsWith(url(record.master.path)), asset.id).toBe(true);
      expect(asset.ownerMaskUrl?.endsWith(url(record.mask.path))).toBe(true);
    }
    // Only the Goblin placeholders carry the marker; ships have no Goblin art.
    for (const asset of CHIBI_ART_ASSETS_V7) {
      expect(asset.placeholder === undefined).toBe(
        !asset.subject.startsWith("UNIT:GOBLIN:"),
      );
      expect(asset.subject).not.toMatch(
        /^UNIT:GOBLIN:(PATROL_BOAT|BATTLESHIP)$/,
      );
    }
  });
});
