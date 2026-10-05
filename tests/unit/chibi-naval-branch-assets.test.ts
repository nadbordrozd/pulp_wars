import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiFallbackSubjectV7,
  navalArtRoleOfSubjectV7,
  seaIceArtSubjectV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-faction-art-manifest";
import {
  CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7,
  CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7,
  SUBMARINE_ANCHOR_V7,
} from "../../src/assets/chibi-naval-submarine-art-manifest";
import {
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import {
  SEA_ICE_EDGE_EAST_V7,
  SEA_ICE_EDGE_NORTH_V7,
  SEA_ICE_EDGE_SOUTH_V7,
  SEA_ICE_EDGE_V7,
  SEA_ICE_EDGE_WEST_V7,
  SEA_ICE_SNOW_V7,
  seaIceInsetV7,
  seaIceTileV7,
  type SeaIceRasterV7,
} from "../../src/assets/sea-ice-v7";
import { FACTION_IDS_V7, type FactionIdV7 } from "../../src/engine/index";
import { CHIBI_OVERLAY_FRAME_V7 } from "../../src/render/canvas/board-renderer-v7";
import { batchManifestProblems } from "../../scripts/art/chibi/batch-manifest";
import {
  loadBatchManifest,
  loadFragments,
  loadRecords,
  productionLayout,
  verifyAssetRecord,
} from "../../scripts/art/chibi/pipeline";
import {
  SEA_ICE_PALETTES,
  seaIcePalettePng,
} from "../../scripts/art/naval-branch/ice-palettes";
import {
  SUBMARINE_ASSET_IDS,
  SUBMERGED_FOAM,
  SUBMERGED_GHOST_ALPHA,
  SUBMERGED_SINK_ROWS,
  submergedAssetId,
  submergedSubmarineProblems,
  submergedSubmarineRaster,
} from "../../scripts/art/naval-branch/submerged";

const ROOT = process.cwd();
const BATCH = "naval-branch";

/** The seafaring factions: every faction but the Ice Folk. */
const SEAFARERS = FACTION_IDS_V7.filter((faction) => faction !== "ICE_FOLK");

const masterFile = (asset: { readonly url: string }): string =>
  path.join(ROOT, "public", asset.url.replace(/^.*?assets\//, "assets/"));

async function raster(file: string): Promise<SeaIceRasterV7> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data),
  };
}

const asRegistered = (asset: { readonly subject: string }): ChibiArtAssetV7 =>
  asset as unknown as ChibiArtAssetV7;

/** The assets of batch `naval-branch`, by id, as the shared manifest lists them. */
const BRANCH_IDS = [
  "chibi-submarine",
  "chibi-portrait-submarine",
  "chibi-icon-tech-seamanship",
  "chibi-icon-tech-submersibles",
  "chibi-icon-action-ram",
  "chibi-icon-action-board",
  "chibi-icon-action-torpedo",
  "chibi-ice-shallow-1",
  "chibi-ice-shallow-2",
  "chibi-ice-deep-1",
  "chibi-ice-deep-2",
  "chibi-overlay-icebound",
] as const;

describe("naval branch art (pulp_wars-5ti.6)", () => {
  it("registers every accepted asset of batch naval-branch in the shared manifest, and nothing else of it", async () => {
    const manifest = await loadBatchManifest(ROOT, BATCH);
    expect(batchManifestProblems(manifest, await loadFragments(ROOT))).toEqual(
      [],
    );
    expect(manifest.bead).toBe("pulp_wars-5ti.6");
    const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
    expect(Object.keys(records.assets).sort()).toEqual([...BRANCH_IDS].sort());
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual(
      [...BRANCH_IDS].sort(),
    );
    // Every recipe that was generated has a verdict.
    for (const recipe of manifest.recipes)
      expect(
        ["ACCEPTED", "REJECTED"],
        `${recipe.id}: ${records.recipes[recipe.id]?.review?.verdict}`,
      ).toContain(records.recipes[recipe.id]?.review?.verdict);
    for (const id of BRANCH_IDS) {
      const record = records.assets[id];
      const spec = manifest.assets.find((asset) => asset.id === id);
      const entry = CHIBI_ART_ASSETS_V7.find((asset) => asset.id === id);
      if (record === undefined || spec === undefined || entry === undefined)
        throw new Error(`${id}: not accepted or not registered`);
      expect(record.status, id).toBe("ACCEPTED");
      expect(entry.subject, id).toBe(spec.subject);
      expect([entry.width, entry.height], id).toEqual([
        record.master.width,
        record.master.height,
      ]);
      expect(chibiAnchorV7(entry), id).toEqual(record.anchor);
      expect(
        entry.url.endsWith(record.master.path.replace(/^public\//, "")),
        id,
      ).toBe(true);
      expect(chibiAssetProblemsV7(entry), id).toEqual([]);
      // Only the shared Submarine and its portrait carry the owner colour.
      expect(entry.ownerMaskUrl !== undefined, id).toBe(
        id === "chibi-submarine" || id === "chibi-portrait-submarine",
      );
      expect(record.mask?.qa.status ?? "NONE", id).toBe(
        entry.ownerMaskUrl === undefined ? "NONE" : "PASS",
      );
      expect(await verifyAssetRecord(ROOT, manifest, record), id).toEqual([]);
    }
  });

  it("gives every seafaring faction a Submarine and a portrait on the shared Submarine's canvas, anchor and waterline", async () => {
    expect(
      CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.map(
        (entry) => `${entry.faction} ${entry.kind} ${entry.role}`,
      ).sort(),
    ).toEqual(
      SEAFARERS.flatMap((faction) => [
        `${faction} PORTRAIT SUBMARINE`,
        `${faction} UNIT SUBMARINE`,
      ]).sort(),
    );
    // The faction naval list ends with them, so the live registry has them.
    expect(
      CHIBI_NAVAL_FACTION_ART_ASSETS_V7.slice(
        -CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7.length,
      ),
    ).toEqual(CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7);
    const shared = CHIBI_ART_ASSETS_V7.find(
      (asset) => asset.id === "chibi-submarine",
    );
    const patrolBoat = CHIBI_ART_ASSETS_V7.find(
      (asset) => asset.id === "chibi-patrol-boat",
    );
    if (shared === undefined || patrolBoat === undefined)
      throw new Error("the shared ships are gone");
    expect(chibiAnchorV7(shared)).toEqual(SUBMARINE_ANCHOR_V7);
    // The Patrol Boat's canvas and class (RULESET_7_NAVAL_BRANCH.md, 14.3).
    expect([shared.width, shared.height, shared.assetClass]).toEqual([
      patrolBoat.width,
      patrolBoat.height,
      patrolBoat.assetClass,
    ]);
    const live = chibiDirectionArtRegistryV7();
    for (const faction of SEAFARERS) {
      const unit = unitArtSubjectV7({
        role: "SUBMARINE",
        form: "NAVAL",
        faction,
      });
      const portrait = portraitSubjectV7("SUBMARINE", faction);
      expect(unit).toBe(
        faction === "ORIGINAL" ? "UNIT:SUBMARINE" : `UNIT:${faction}:SUBMARINE`,
      );
      expect(portrait).toBe(
        faction === "ORIGINAL"
          ? "PORTRAIT:SUBMARINE"
          : `PORTRAIT:${faction}:SUBMARINE`,
      );
      expect(live.variants(unit), unit).toHaveLength(1);
      expect(live.variants(portrait), portrait).toHaveLength(1);
      expect(chibiAnchorV7(live.variants(unit)[0] as ChibiArtAssetV7)).toEqual(
        SUBMARINE_ANCHOR_V7,
      );
    }
  });

  it("draws an Ice Folk Submarine as the shared one: they have no Submarine raster", () => {
    const live = chibiDirectionArtRegistryV7();
    const unit = unitArtSubjectV7({
      role: "SUBMARINE",
      form: "NAVAL",
      faction: "ICE_FOLK",
    });
    expect(unit).toBe("UNIT:ICE_FOLK:SUBMARINE");
    expect(live.variants(unit)).toEqual([]);
    expect(chibiFallbackSubjectV7(unit)).toBe("UNIT:SUBMARINE");
    expect(
      chibiFallbackSubjectV7(portraitSubjectV7("SUBMARINE", "ICE_FOLK")),
    ).toBe("PORTRAIT:SUBMARINE");
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(classic.variants("UNIT:SUBMARINE").map((asset) => asset.id)).toEqual(
      ["chibi-submarine"],
    );
    expect(
      classic.variants("PORTRAIT:SUBMARINE").map((asset) => asset.id),
    ).toEqual(["chibi-portrait-submarine"]);
  });

  it("keeps every Submarine, surfaced and submerged, clear of the HP bar and seat badge strips", async () => {
    const css = 80 / 128;
    const { hpBar, seatBadge } = CHIBI_OVERLAY_FRAME_V7;
    const frames = [
      [hpBar.left, hpBar.top, hpBar.width, hpBar.height],
      [seatBadge.left, seatBadge.top, seatBadge.size, seatBadge.size],
    ].map(([left = 0, top = 0, width = 0, height = 0]) => ({
      left: left * css - 1,
      top: top * css - 1,
      right: (left + width) * css + 1,
      bottom: (top + height) * css + 1,
    }));
    const shared = CHIBI_ART_ASSETS_V7.find(
      (asset) => asset.id === "chibi-submarine",
    );
    if (shared === undefined) throw new Error("the shared Submarine is gone");
    const sprites = [
      shared,
      ...[
        ...CHIBI_NAVAL_SUBMARINE_ART_ASSETS_V7,
        ...CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7,
      ]
        .filter((entry) => entry.kind === "UNIT")
        .map((entry) => asRegistered(entry.asset)),
    ];
    expect(sprites).toHaveLength(1 + 2 * SEAFARERS.length);
    for (const asset of sprites) {
      const master = await raster(masterFile(asset));
      const anchor = chibiAnchorV7(asset);
      let covered = 0;
      for (let py = 0; py < master.height; py += 1)
        for (let px = 0; px < master.width; px += 1) {
          if ((master.data[(py * master.width + px) * 4 + 3] ?? 0) < 128)
            continue;
          const x = px - anchor.x;
          const y = py - anchor.y;
          if (
            frames.some(
              (frame) =>
                x + 1 > frame.left &&
                x < frame.right &&
                y + 1 > frame.top &&
                y < frame.bottom,
            )
          )
            covered += 1;
        }
      expect({ id: asset.id, covered }).toEqual({ id: asset.id, covered: 0 });
    }
  });

  it("shows the two technologies with their icons for every faction, and registers the Ram, Board and Torpedo icons", () => {
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    for (const faction of FACTION_IDS_V7) {
      // The frozen sea (`pulp_wars-5ti.7`): the Ice Folk have no ship; their
      // Black Ice and Glacier cards show ice (registered stand-ins).
      expect(technologySubjectV7("SEAMANSHIP", faction), faction).toBe(
        faction === "ICE_FOLK" ? "EFFECT:COLD_SNAP" : "ICON:TECH:SEAMANSHIP",
      );
      expect(technologySubjectV7("SUBMERSIBLES", faction), faction).toBe(
        faction === "ICE_FOLK"
          ? "ICON:STATUS:FROZEN"
          : "ICON:TECH:SUBMERSIBLES",
      );
    }
    expect(technologySubjectV7("SHORECRAFT", "ICE_FOLK")).toBe(
      "ICON:STATUS:CHILLED",
    );
    expect(technologySubjectV7("NAVIGATION", "ICE_FOLK")).toBe(
      "EFFECT:SHATTER_SHARDS",
    );
    expect(technologySubjectV7("NAVAL_ENGINEERING", "ICE_FOLK")).toBe(
      "OVERLAY:ICEBOUND",
    );
    const icons: readonly (readonly [ArtSubjectV7, string])[] = [
      ["ICON:TECH:SEAMANSHIP", "chibi-icon-tech-seamanship"],
      ["ICON:TECH:SUBMERSIBLES", "chibi-icon-tech-submersibles"],
      ["ICON:ACTION:RAM", "chibi-icon-action-ram"],
      ["ICON:ACTION:BOARD", "chibi-icon-action-board"],
      ["ICON:ACTION:TORPEDO", "chibi-icon-action-torpedo"],
    ];
    for (const [subject, id] of icons) {
      expect(
        classic.variants(subject).map((asset) => asset.id),
        subject,
      ).toEqual([id]);
      expect(chibiFallbackSubjectV7(subject), subject).toBeNull();
    }
  });
});

describe("submerged Submarines (pulp_wars-5ti.6)", () => {
  it("lists one derived sprite per seafaring faction, in the live registry only", () => {
    expect(
      CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7.map((entry) => entry.asset.id),
    ).toEqual(SUBMARINE_ASSET_IDS.map(submergedAssetId));
    const live = chibiDirectionArtRegistryV7();
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    for (const faction of SEAFARERS) {
      const subject = unitArtSubjectV7({
        role: "SUBMARINE",
        form: "NAVAL",
        faction,
        submerged: true,
      });
      expect(subject).toBe(
        faction === "ORIGINAL"
          ? "UNIT:SUBMARINE_SUBMERGED"
          : `UNIT:${faction}:SUBMARINE_SUBMERGED`,
      );
      expect(navalArtRoleOfSubjectV7(subject)).toBe("SUBMARINE_SUBMERGED");
      expect(live.variants(subject), subject).toHaveLength(1);
      // The Classic look has none: it draws the shared Submarine surfaced.
      expect(classic.variants(subject), subject).toEqual([]);
      expect(chibiFallbackSubjectV7(subject)).toBe("UNIT:SUBMARINE");
    }
    // The Ice Folk have none either.
    const iceFolk = unitArtSubjectV7({
      role: "SUBMARINE",
      form: "NAVAL",
      faction: "ICE_FOLK",
      submerged: true,
    });
    expect(live.variants(iceFolk)).toEqual([]);
    expect(chibiFallbackSubjectV7(iceFolk)).toBe("UNIT:SUBMARINE");
  });

  it("asks for the submerged sprite only for a Submarine afloat, and only when asked", () => {
    const faction: FactionIdV7 = "GOBLIN";
    expect(
      unitArtSubjectV7({ role: "SUBMARINE", form: "NAVAL", faction }),
    ).toBe("UNIT:GOBLIN:SUBMARINE");
    expect(
      unitArtSubjectV7({
        role: "SUBMARINE",
        form: "NAVAL",
        faction,
        submerged: false,
      }),
    ).toBe("UNIT:GOBLIN:SUBMARINE");
    expect(
      unitArtSubjectV7({
        role: "PATROL_BOAT",
        form: "NAVAL",
        faction,
        submerged: true,
      }),
    ).toBe("UNIT:GOBLIN:PATROL_BOAT");
    expect(
      unitArtSubjectV7({
        role: "FIGHTER",
        form: "EMBARKED",
        faction,
        submerged: true,
      }),
    ).toBe("UNIT:GOBLIN:EMBARKED_TRANSPORT");
  });

  it("is exactly what the surfaced masters derive: sunk seven rows, a ghost under the waterline, foam on it", async () => {
    expect(await submergedSubmarineProblems(ROOT)).toEqual([]);
    for (const id of SUBMARINE_ASSET_IDS) {
      const master = await raster(
        path.join(ROOT, "public/assets/chibi/units", `${id}.png`),
      );
      const derived = submergedSubmarineRaster({
        width: master.width,
        height: master.height,
        data: new Uint8Array(master.data),
      });
      const alphaAt = (
        image: { readonly width: number; readonly data: ArrayLike<number> },
        x: number,
        y: number,
      ): number => image.data[(y * image.width + x) * 4 + 3] ?? 0;
      let waterline = -1;
      for (let y = master.height - 1; y >= 0 && waterline < 0; y -= 1)
        for (let x = 0; x < master.width; x += 1)
          if (alphaAt(master, x, y) >= 128) {
            waterline = y;
            break;
          }
      let foam = 0;
      let ghost = 0;
      for (let y = 0; y < master.height; y += 1)
        for (let x = 0; x < master.width; x += 1) {
          const o = (y * master.width + x) * 4;
          const alpha = derived.data[o + 3] ?? 0;
          const isFoam =
            derived.data[o] === SUBMERGED_FOAM.r &&
            derived.data[o + 1] === SUBMERGED_FOAM.g &&
            derived.data[o + 2] === SUBMERGED_FOAM.b;
          if (y === waterline && alpha > 0 && isFoam) foam += 1;
          if (y > waterline + 1) {
            // Under the foam nothing is solid: only the ghost of the hull.
            expect(alpha, `${id} ${x},${y}`).toBeLessThanOrEqual(
              SUBMERGED_GHOST_ALPHA,
            );
            if (alpha > 0) ghost += 1;
          }
          // Above the waterline the sprite is the master, seven rows lower.
          if (y < waterline && y >= SUBMERGED_SINK_ROWS)
            expect(alpha, `${id} ${x},${y}`).toBe(
              alphaAt(master, x, y - SUBMERGED_SINK_ROWS),
            );
        }
      expect(foam, id).toBeGreaterThan(20);
      expect(ghost, id).toBeGreaterThan(50);
    }
  });
});

describe("sea ice (pulp_wars-5ti.6)", () => {
  it("names the ice of each water and keeps the palettes' bytes", async () => {
    expect(seaIceArtSubjectV7("SHALLOW_WATER")).toBe("TERRAIN:ICE_SHALLOW");
    expect(seaIceArtSubjectV7("DEEP_WATER")).toBe("TERRAIN:ICE_DEEP");
    for (const palette of Object.values(SEA_ICE_PALETTES)) {
      const checkedIn = await readFile(path.join(ROOT, palette.path));
      expect(
        checkedIn.equals(await seaIcePalettePng(palette)),
        palette.path,
      ).toBe(true);
    }
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(
      classic.variants("TERRAIN:ICE_SHALLOW").map((asset) => asset.id),
    ).toEqual(["chibi-ice-shallow-1", "chibi-ice-shallow-2"]);
    expect(
      classic.variants("TERRAIN:ICE_DEEP").map((asset) => asset.id),
    ).toEqual(["chibi-ice-deep-1", "chibi-ice-deep-2"]);
    // The Icebound pack ice: the lower half of the ship's cell.
    const overlay = classic.variants("OVERLAY:ICEBOUND")[0];
    expect(overlay?.id).toBe("chibi-overlay-icebound");
    expect([overlay?.width, overlay?.height, overlay?.anchor]).toEqual([
      80,
      40,
      { x: 40, y: 0 },
    ]);
  });

  it("makes sheets that are opaque, flat and clearly apart: the deep ice bluer and darker", async () => {
    const mean = (image: SeaIceRasterV7): number[] => {
      const sum = [0, 0, 0];
      for (let index = 0; index < image.width * image.height; index += 1) {
        expect(image.data[index * 4 + 3]).toBe(255);
        for (let channel = 0; channel < 3; channel += 1)
          sum[channel] =
            (sum[channel] ?? 0) + (image.data[index * 4 + channel] ?? 0);
      }
      return sum.map((value) => value / (image.width * image.height));
    };
    const tile = (name: string): Promise<SeaIceRasterV7> =>
      raster(path.join(ROOT, "public/assets/chibi/terrain", `${name}.png`));
    const shallow = mean(await tile("chibi-ice-shallow-1"));
    const deep = mean(await tile("chibi-ice-deep-1"));
    const shallowWater = mean(await tile("chibi-shallow-water-1"));
    const deepWater = mean(await tile("chibi-deep-water-1"));
    const luma = (rgb: readonly number[]): number =>
      0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0);
    // Each ice is lighter than the water under it and than the other water.
    expect(luma(shallow)).toBeGreaterThan(luma(shallowWater) + 25);
    expect(luma(deep)).toBeGreaterThan(luma(deepWater) + 60);
    expect(luma(shallow)).toBeGreaterThan(luma(deep) + 25);
    // The two variants of an ice are windows of one field: the same colour.
    for (const name of ["chibi-ice-shallow", "chibi-ice-deep"]) {
      const a = mean(await tile(`${name}-1`));
      const b = mean(await tile(`${name}-2`));
      for (let channel = 0; channel < 3; channel += 1)
        expect(Math.abs((a[channel] ?? 0) - (b[channel] ?? 0))).toBeLessThan(2);
    }
  });

  it("cuts the floe edge only at open water, the same way every time", async () => {
    const sheet = await raster(
      path.join(ROOT, "public/assets/chibi/terrain/chibi-ice-deep-1.png"),
    );
    // Ice all round, or the shore: the sheet is untouched, so ice joins ice.
    expect(seaIceTileV7(sheet, 0, 0).data).toEqual(sheet.data);
    const sides = [
      SEA_ICE_EDGE_NORTH_V7,
      SEA_ICE_EDGE_EAST_V7,
      SEA_ICE_EDGE_SOUTH_V7,
      SEA_ICE_EDGE_WEST_V7,
    ];
    const depthFrom = (side: number, x: number, y: number): number =>
      side === SEA_ICE_EDGE_NORTH_V7
        ? y
        : side === SEA_ICE_EDGE_EAST_V7
          ? 79 - x
          : side === SEA_ICE_EDGE_SOUTH_V7
            ? 79 - y
            : x;
    for (const side of sides) {
      const tile = seaIceTileV7(sheet, side, 1);
      expect(seaIceTileV7(sheet, side, 1).data).toEqual(tile.data);
      let water = 0;
      let rim = 0;
      for (let y = 0; y < 80; y += 1)
        for (let x = 0; x < 80; x += 1) {
          const o = (y * 80 + x) * 4;
          const depth = depthFrom(side, x, y);
          if (tile.data[o + 3] === 0) {
            water += 1;
            // The water strip is never deeper than the largest inset.
            expect(depth, `${side} ${x},${y}`).toBeLessThan(
              SEA_ICE_EDGE_V7.maxInset,
            );
          } else if (
            depth >=
            SEA_ICE_EDGE_V7.maxInset + SEA_ICE_EDGE_V7.rimWidth + 1
          )
            // Past the rim and its line the sheet is the sheet.
            expect(
              [tile.data[o], tile.data[o + 1], tile.data[o + 2]],
              `${side} ${x},${y}`,
            ).toEqual([sheet.data[o], sheet.data[o + 1], sheet.data[o + 2]]);
          if (
            tile.data[o] === SEA_ICE_EDGE_V7.rim.r &&
            tile.data[o + 1] === SEA_ICE_EDGE_V7.rim.g &&
            tile.data[o + 2] === SEA_ICE_EDGE_V7.rim.b
          )
            rim += 1;
        }
      expect(water).toBeGreaterThanOrEqual(80 * SEA_ICE_EDGE_V7.minInset);
      expect(rim).toBeGreaterThanOrEqual(80 * SEA_ICE_EDGE_V7.rimWidth - 8);
      // Both ends of a side sit at the same inset, so the edge runs on.
      for (const variant of [0, 1]) {
        expect(seaIceInsetV7(side, 0, 80, variant)).toBe(
          SEA_ICE_EDGE_V7.endInset,
        );
        expect(seaIceInsetV7(side, 79, 80, variant)).toBe(
          SEA_ICE_EDGE_V7.endInset,
        );
      }
    }
    // Two open sides: the corner between them is rounded away.
    const corner = seaIceTileV7(
      sheet,
      SEA_ICE_EDGE_NORTH_V7 | SEA_ICE_EDGE_WEST_V7,
      0,
    );
    expect(corner.data[(5 * 80 + 5) * 4 + 3]).toBe(0);
    expect(corner.data[(40 * 80 + 40) * 4 + 3]).toBe(255);
  });

  it("dusts permanent ice with snow inside the tile's margin, so it still joins without a seam", async () => {
    const sheet = await raster(
      path.join(ROOT, "public/assets/chibi/terrain/chibi-ice-shallow-2.png"),
    );
    for (const variant of [0, 1]) {
      const plain = seaIceTileV7(sheet, 0, variant);
      const snowy = seaIceTileV7(sheet, 0, variant, true);
      let white = 0;
      for (let y = 0; y < 80; y += 1)
        for (let x = 0; x < 80; x += 1) {
          const o = (y * 80 + x) * 4;
          expect(snowy.data[o + 3]).toBe(255);
          const inMargin =
            x < SEA_ICE_SNOW_V7.margin - 1 ||
            y < SEA_ICE_SNOW_V7.margin - 4 ||
            x > 80 - SEA_ICE_SNOW_V7.margin ||
            y > 80 - SEA_ICE_SNOW_V7.margin + 4;
          const lifted = (channel: number): number =>
            Math.round(
              (plain.data[o + channel] ?? 0) * (1 - SEA_ICE_SNOW_V7.wash) +
                255 * SEA_ICE_SNOW_V7.wash,
            );
          // Along the sides only the even wash: no drift crosses a seam.
          if (inMargin)
            expect(
              [snowy.data[o], snowy.data[o + 1], snowy.data[o + 2]],
              `${variant} ${x},${y}`,
            ).toEqual([lifted(0), lifted(1), lifted(2)]);
          else if (
            snowy.data[o] === 255 &&
            snowy.data[o + 1] === 255 &&
            snowy.data[o + 2] === 255
          )
            white += 1;
        }
      // Four small drifts and a few sparkles.
      expect(white).toBeGreaterThan(120);
      expect(white).toBeLessThan(700);
    }
  });
});
