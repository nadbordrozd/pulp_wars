import { describe, expect, it } from "vitest";
import {
  CHIBI_CLASS_GEOMETRY_V7,
  CHIBI_TILE_CSS_PX,
  buildChibiArtRegistryV7,
  chibiAnchorV7,
  chibiAssetProblemsV7,
  chibiOverflowV7,
  chibiVariantV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  CHIBI_ZOOM_STEPS,
  adjacentChibiZoomStep,
  chibiCameraZoom,
  chibiDestinationRect,
  chibiMasterScale,
  chibiRasterForDeviceScale,
  chibiTileCssPx,
  chibiZoomStepForCamera,
  fitChibiCamera,
  fitChibiZoomStep,
  nearestChibiZoomStep,
  snapCameraToDevicePixels,
  zoomChibiCameraAt,
} from "../../src/render/canvas/chibi-geometry-v7";
import {
  pickGridTile,
  projectGrid,
  worldToScreen,
} from "../../src/render/canvas/geometry";

function asset(overrides: Partial<ChibiArtAssetV7> = {}): ChibiArtAssetV7 {
  return {
    id: "chibi-test-fighter",
    subject: "UNIT:FIGHTER",
    assetClass: "STANDARD_UNIT",
    width: 56,
    height: 80,
    url: "/fixture/fighter.png",
    ownerMaskUrl: "/fixture/fighter-mask.png",
    ...overrides,
  };
}

function unmasked(overrides: Partial<ChibiArtAssetV7>): ChibiArtAssetV7 {
  const { id, subject, assetClass, width, height, url } = asset(overrides);
  return { id, subject, assetClass, width, height, url };
}

describe("CHIBI geometry and zoom steps", () => {
  it("draws an 80 CSS px cell at zoom 1 and integer device scales on DPR 2", () => {
    expect(CHIBI_TILE_CSS_PX).toBe(80);
    expect(CHIBI_ZOOM_STEPS).toEqual([0.75, 1, 1.5, 2]);
    const tiles = CHIBI_ZOOM_STEPS.map((step) =>
      chibiTileCssPx({ offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(step) }),
    );
    expect(tiles).toEqual([60, 80, 120, 160]);
    for (const step of [1, 1.5, 2] as const)
      expect(Number.isInteger(80 * step * 2)).toBe(true);
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(1) };
    expect(chibiMasterScale(camera)).toBe(1);
    const a = worldToScreen(projectGrid({ x: 0, y: 0 }), camera);
    const b = worldToScreen(projectGrid({ x: 1, y: 0 }), camera);
    expect(b.x - a.x).toBe(80);
    expect(
      pickGridTile({ x: 39, y: 0 }, camera, { width: 4, height: 4 }),
    ).toEqual({ x: 0, y: 0 });
    expect(
      pickGridTile({ x: 41, y: 0 }, camera, { width: 4, height: 4 }),
    ).toEqual({ x: 1, y: 0 });
  });

  it("steps through the discrete zoom list and snaps arbitrary scales to the nearest step", () => {
    expect(adjacentChibiZoomStep(0.75, "OUT")).toBe(0.75);
    expect(adjacentChibiZoomStep(0.75, "IN")).toBe(1);
    expect(adjacentChibiZoomStep(1, "IN")).toBe(1.5);
    expect(adjacentChibiZoomStep(1.5, "IN")).toBe(2);
    expect(adjacentChibiZoomStep(2, "IN")).toBe(2);
    expect(adjacentChibiZoomStep(2, "OUT")).toBe(1.5);
    expect(nearestChibiZoomStep(0.3)).toBe(0.75);
    expect(nearestChibiZoomStep(1.1)).toBe(1);
    expect(nearestChibiZoomStep(1.3)).toBe(1.5);
    expect(nearestChibiZoomStep(9)).toBe(2);
    for (const step of CHIBI_ZOOM_STEPS)
      expect(
        chibiZoomStepForCamera({
          offsetX: 3,
          offsetY: 4,
          zoom: chibiCameraZoom(step),
        }),
      ).toBe(step);
    const camera = { offsetX: 10, offsetY: 20, zoom: chibiCameraZoom(1) };
    const fixed = { x: 300, y: 200 };
    const zoomed = zoomChibiCameraAt(camera, 0.75, fixed);
    expect(chibiZoomStepForCamera(zoomed)).toBe(0.75);
    expect(zoomed.zoom).toBeCloseTo(0.46875);
    const before = (fixed.x - camera.offsetX) / camera.zoom;
    const after = (fixed.x - zoomed.offsetX) / zoomed.zoom;
    expect(after).toBeCloseTo(before);
  });

  it("fits small boards at the normal play view and never below 0.75, letting larger boards scroll", () => {
    const desktop = { width: 1440, height: 900 };
    expect(fitChibiZoomStep({ width: 11, height: 11 }, desktop)).toBe(0.75);
    expect(fitChibiZoomStep({ width: 8, height: 8 }, desktop)).toBe(1);
    expect(
      fitChibiZoomStep(
        { width: 11, height: 11 },
        { width: 2560, height: 1440 },
      ),
    ).toBe(1);
    expect(fitChibiZoomStep({ width: 25, height: 25 }, desktop)).toBe(0.75);
    expect(
      fitChibiZoomStep({ width: 25, height: 25 }, { width: 390, height: 844 }),
    ).toBe(0.75);
    const huge = fitChibiCamera({ width: 25, height: 25 }, desktop);
    expect(chibiTileCssPx(huge)).toBe(60);
    // 25 cells x 60 px overflow a 1440 px viewport, so the board scrolls.
    expect(25 * chibiTileCssPx(huge)).toBeGreaterThan(desktop.width);
  });

  it("snaps camera offsets to whole device pixels", () => {
    expect(
      snapCameraToDevicePixels(
        { offsetX: 10.3, offsetY: -4.76, zoom: 0.625 },
        2,
      ),
    ).toEqual({ offsetX: 10.5, offsetY: -5, zoom: 0.625 });
    expect(
      snapCameraToDevicePixels({ offsetX: 10.3, offsetY: 4.2, zoom: 0.625 }, 3),
    ).toEqual({ offsetX: 31 / 3, offsetY: 13 / 3, zoom: 0.625 });
  });

  it("selects the master or an x2/x3 variant for nearest-neighbour integer scaling", () => {
    const master = asset();
    const dense = asset({
      densityUrls: {
        2: "/fixture/fighter@2x.png",
        3: "/fixture/fighter@3x.png",
      },
    });
    expect(chibiRasterForDeviceScale(master, 1)).toEqual({
      url: "/fixture/fighter.png",
      density: 1,
      smoothing: false,
    });
    expect(chibiRasterForDeviceScale(master, 2)).toEqual({
      url: "/fixture/fighter.png",
      density: 1,
      smoothing: false,
    });
    expect(chibiRasterForDeviceScale(dense, 2).density).toBe(2);
    expect(chibiRasterForDeviceScale(dense, 3).density).toBe(3);
    expect(chibiRasterForDeviceScale(dense, 4).density).toBe(2);
    expect(chibiRasterForDeviceScale(dense, 6).density).toBe(3);
    // Zoom 0.75 on DPR 2 is allowed to be soft.
    expect(chibiRasterForDeviceScale(dense, 1.5)).toEqual({
      url: "/fixture/fighter.png",
      density: 1,
      smoothing: true,
    });
  });
});

describe("CHIBI anchors and allowed overflow", () => {
  it("bottom-centres units, settlements, buildings and tall terrain and centres terrain and resources", () => {
    expect(chibiAnchorV7(asset())).toEqual({ x: 28, y: 40 });
    expect(chibiOverflowV7(asset())).toEqual({
      left: 0,
      right: 0,
      up: 0,
      down: 0,
    });
    const city = asset({
      id: "chibi-test-city",
      subject: "CITY:2",
      assetClass: "SETTLEMENT",
      width: 96,
      height: 104,
    });
    expect(chibiAnchorV7(city)).toEqual({ x: 48, y: 64 });
    expect(chibiOverflowV7(city)).toEqual({
      left: 8,
      right: 8,
      up: 24,
      down: 0,
    });
    const forest = unmasked({
      id: "chibi-test-forest",
      subject: "TERRAIN:FOREST",
      assetClass: "TALL_TERRAIN",
      width: 80,
      height: 104,
    });
    expect(chibiOverflowV7(forest)).toEqual({
      left: 0,
      right: 0,
      up: 24,
      down: 0,
    });
    const resource = asset({
      id: "chibi-test-fruit",
      subject: "RESOURCE:FRUIT",
      assetClass: "RESOURCE",
      width: 44,
      height: 44,
    });
    expect(chibiAnchorV7(resource)).toEqual({ x: 22, y: 22 });
    for (const candidate of [asset(), city, forest, resource])
      expect(chibiAssetProblemsV7(candidate)).toEqual([]);
  });

  it("places the anchor on the cell centre and bottom-aligns units to the cell", () => {
    const camera = { offsetX: 0.3, offsetY: 0, zoom: chibiCameraZoom(1) };
    const centre = { x: 200.3, y: 120 };
    const rect = chibiDestinationRect(centre, camera, asset(), 2);
    expect(rect).toEqual({ x: 172.5, y: 80, width: 56, height: 80 });
    expect(rect.y + rect.height).toBe(centre.y + 40);
    const doubled = chibiDestinationRect(
      { x: 200, y: 120 },
      { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(2) },
      asset({
        id: "chibi-test-city",
        subject: "CITY:1",
        assetClass: "SETTLEMENT",
        width: 96,
        height: 104,
      }),
      1,
    );
    expect(doubled).toEqual({ x: 104, y: -8, width: 192, height: 208 });
    expect(doubled.y + doubled.height).toBe(120 + 80);
  });

  it("rejects canvases and anchors beyond the direction's overflow limits", () => {
    const problems = (overrides: Partial<ChibiArtAssetV7>) =>
      chibiAssetProblemsV7(asset(overrides)).join("\n");
    expect(problems({ width: 64 })).toMatch(/exceeds 56 x 80/);
    expect(
      problems({ assetClass: "SETTLEMENT", subject: "CITY:1", width: 104 }),
    ).toMatch(/exceeds 96 x 104|side overflow/);
    expect(
      problems({
        assetClass: "SETTLEMENT",
        subject: "CITY:1",
        width: 96,
        height: 104,
        anchor: { x: 40, y: 64 },
      }),
    ).toMatch(/side overflow 16 exceeds 8/);
    expect(
      problems({
        assetClass: "SETTLEMENT",
        subject: "CITY:1",
        width: 96,
        height: 96,
        anchor: { x: 48, y: 40 },
      }),
    ).toMatch(/below its cell/);
    expect(
      problems({
        subject: "TERRAIN:GRASS",
        assetClass: "TERRAIN",
        width: 80,
        height: 72,
      }),
    ).toMatch(/exactly 80 x 80/);
    expect(
      problems({
        subject: "TERRAIN:GRASS",
        assetClass: "TALL_TERRAIN",
        width: 80,
        height: 104,
      }),
    ).toMatch(/class does not fit/);
    expect(chibiAssetProblemsV7(unmasked({})).join("\n")).toMatch(/owner mask/);
    for (const [assetClass, limits] of Object.entries(CHIBI_CLASS_GEOMETRY_V7))
      expect(limits.maxSideOverflow, assetClass).toBeLessThanOrEqual(8);
  });

  it("builds a registry with deterministic variants and keeps the checked-in manifest valid", () => {
    const grass = [1, 2, 3].map((index) =>
      unmasked({
        id: `chibi-test-grass-${index}`,
        subject: "TERRAIN:GRASS",
        assetClass: "TERRAIN",
        width: 80,
        height: 80,
      }),
    );
    const { registry, problems } = buildChibiArtRegistryV7([
      ...grass,
      asset({ id: "chibi-test-grass-1" }),
      asset({ id: "chibi-bad", width: 200 }),
    ]);
    expect(problems.join("\n")).toMatch(/duplicate asset id/);
    expect(problems.join("\n")).toMatch(/chibi-bad/);
    expect(registry.variants("TERRAIN:GRASS")).toHaveLength(3);
    expect(registry.variants("UNIT:FIGHTER")).toEqual([]);
    expect(registry.variants("UNIT:MARKSMAN")).toEqual([]);
    const picked = chibiVariantV7(registry.variants("TERRAIN:GRASS"), {
      x: 2,
      y: 5,
    });
    expect(picked?.id).toBe(`chibi-test-grass-${((2 * 31 + 5 * 17) % 3) + 1}`);
    expect(buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).problems).toEqual([]);
  });
});
