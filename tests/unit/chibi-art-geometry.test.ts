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
  CHIBI_GARRISON_RIGHT,
  CHIBI_GARRISON_SCALE,
  CHIBI_ZOOM_STEPS,
  adjacentChibiZoomStep,
  chibiBoardWorldBounds,
  chibiCameraZoom,
  chibiDestinationRect,
  chibiGarrisonDestinationRect,
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
  cellWorldBounds,
  frameCameraOnArea,
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

  it("draws a garrisoned unit at 0.75 with its feet on the cell's bottom edge and its right edge at the pip column", () => {
    for (const step of CHIBI_ZOOM_STEPS) {
      for (const candidate of [
        asset(),
        asset({
          id: "chibi-test-knight",
          subject: "UNIT:KNIGHT",
          assetClass: "LARGE_UNIT",
          width: 72,
          height: 88,
        }),
        asset({
          id: "chibi-test-giant",
          subject: "UNIT:JUGGERNAUT",
          assetClass: "GIANT_UNIT",
          width: 88,
          height: 104,
        }),
      ]) {
        const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(step) };
        const centre = { x: 400, y: 300 };
        const normal = chibiDestinationRect(centre, camera, candidate, 1);
        const rect = chibiGarrisonDestinationRect(centre, camera, candidate, 3);
        expect(CHIBI_GARRISON_SCALE).toBe(0.75);
        expect(rect.width).toBeCloseTo(normal.width * 0.75);
        expect(rect.height).toBeCloseTo(normal.height * 0.75);
        // Same feet line as the full-size unit: the cell's bottom edge.
        expect(rect.y + rect.height).toBeCloseTo(centre.y + 40 * step, 0);
        // Right edge on or just inside the pip column, on whole device px.
        const pipColumn = centre.x + CHIBI_GARRISON_RIGHT * camera.zoom;
        expect(rect.x + rect.width).toBeLessThanOrEqual(pipColumn + 1e-9);
        expect(rect.x + rect.width).toBeGreaterThan(pipColumn - 1 / 3);
        expect(Math.abs(rect.x * 3 - Math.round(rect.x * 3))).toBeLessThan(
          1e-9,
        );
        // The settlement's left side stays uncovered (cell left is -40 x step).
        expect(rect.x).toBeGreaterThan(centre.x - 40 * step);
        if (candidate.assetClass === "STANDARD_UNIT")
          expect(rect.x).toBeGreaterThanOrEqual(centre.x - 14 * step);
      }
    }
  });

  it("frames a new match's explored area in the visible band without empty off-board margins", () => {
    const board = { width: 11, height: 11 };
    const bounds = chibiBoardWorldBounds(board);
    // Explored 5 x 5 around a capital one row below the map's top row.
    const area = cellWorldBounds(
      Array.from({ length: 25 }, (_, index) => ({
        x: 1 + (index % 5),
        y: 1 + Math.floor(index / 5),
      })),
    );
    expect(area).toEqual({ left: 64, top: 64, right: 704, bottom: 704 });
    if (area === null) throw new Error("Explored area missing");
    expect(cellWorldBounds([])).toBeNull();
    const focus = projectGrid({ x: 3, y: 3 });
    // Phone: 390 x 844, HUD to 76 px, a 256 px dock reserve at the bottom.
    const phone = { width: 390, height: 844 };
    const fitted = fitChibiCamera(board, phone);
    expect(chibiZoomStepForCamera(fitted)).toBe(0.75);
    const band = { top: 76, bottom: 844 - 256 };
    const framed = frameCameraOnArea(fitted, {
      area,
      focus,
      board: bounds,
      viewport: phone,
      band,
    });
    expect(framed.zoom).toBe(fitted.zoom);
    // The board is taller than the band, so its top edge (with the chibi
    // upward overflow) meets the HUD instead of leaving an empty band.
    expect(framed.offsetY + bounds.top * framed.zoom).toBeCloseTo(band.top);
    // Every explored cell is inside the visible band above the dock.
    const topLeft = worldToScreen({ x: area.left, y: area.top }, framed);
    const bottomRight = worldToScreen(
      { x: area.right, y: area.bottom },
      framed,
    );
    expect(topLeft.y).toBeGreaterThanOrEqual(band.top);
    expect(bottomRight.y).toBeLessThanOrEqual(band.bottom);
    // Horizontally the board is wider than the phone: the area is centred.
    expect((topLeft.x + bottomRight.x) / 2).toBeCloseTo(phone.width / 2);

    // Mid-map explored area on a huge board: centred in the band exactly.
    const huge = { width: 25, height: 25 };
    const midArea = cellWorldBounds([
      { x: 10, y: 10 },
      { x: 14, y: 14 },
    ]);
    const midFramed = frameCameraOnArea(fitChibiCamera(huge, phone), {
      area: midArea,
      focus: projectGrid({ x: 12, y: 12 }),
      board: chibiBoardWorldBounds(huge),
      viewport: phone,
      band,
    });
    expect(worldToScreen(projectGrid({ x: 12, y: 12 }), midFramed)).toEqual({
      x: phone.width / 2,
      y: (band.top + band.bottom) / 2,
    });

    // An explored area larger than the band falls back to the focus point.
    const wide = cellWorldBounds([
      { x: 0, y: 5 },
      { x: 24, y: 19 },
    ]);
    const focusFramed = frameCameraOnArea(fitChibiCamera(huge, phone), {
      area: wide,
      focus: projectGrid({ x: 12, y: 12 }),
      board: chibiBoardWorldBounds(huge),
      viewport: phone,
      band,
    });
    expect(worldToScreen(projectGrid({ x: 12, y: 12 }), focusFramed)).toEqual({
      x: phone.width / 2,
      y: (band.top + band.bottom) / 2,
    });

    // Desktop: the 0.75 board fits, so it stays wholly inside the region
    // with the explored area as close to the centre as that allows.
    const desktop = { width: 1440, height: 900 };
    const desktopFramed = frameCameraOnArea(fitChibiCamera(board, desktop), {
      area,
      focus,
      board: bounds,
      viewport: desktop,
      band: { top: 76, bottom: 900 },
    });
    const boardTop = desktopFramed.offsetY + bounds.top * desktopFramed.zoom;
    const boardBottom =
      desktopFramed.offsetY + bounds.bottom * desktopFramed.zoom;
    expect(boardTop).toBeGreaterThanOrEqual(76);
    expect(boardBottom).toBeCloseTo(900);
    const areaCentre = worldToScreen(
      { x: (area.left + area.right) / 2, y: 0 },
      desktopFramed,
    );
    expect(areaCentre.x).toBeCloseTo(720);

    // A degenerate band (no measurable layout) uses the whole canvas.
    const whole = frameCameraOnArea(fitChibiCamera(huge, phone), {
      area: null,
      focus: projectGrid({ x: 12, y: 12 }),
      board: chibiBoardWorldBounds(huge),
      viewport: phone,
      band: { top: 0, bottom: 0 },
    });
    expect(worldToScreen(projectGrid({ x: 12, y: 12 }), whole)).toEqual({
      x: phone.width / 2,
      y: phone.height / 2,
    });
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
