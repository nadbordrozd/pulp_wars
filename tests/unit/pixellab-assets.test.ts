import { describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_ART_ATTACHMENTS,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";
import {
  BOARD_ART_GEOMETRY,
  MOUNTAIN_ART_GEOMETRY,
  PIXELLAB_BOARD_ART_IDS,
  PIXELLAB_PENDING_BOARD_ART_IDS,
  SETTLEMENT_ART_GEOMETRY,
  anchoredDestinationRect,
  cityArtLevel,
  createPixelLabAssetBindings,
} from "../../src/render/canvas/pixellab-asset-bindings";
import { cityId, playerId, unitId } from "../../src/engine/index";

describe("accepted PixelLab renderer binding", () => {
  it("reuses level-three raster geometry for every scalable city level", () => {
    expect(cityArtLevel(1)).toBe(1);
    expect(cityArtLevel(2)).toBe(2);
    expect(cityArtLevel(3)).toBe(3);
    expect(cityArtLevel(4)).toBe(3);
    expect(cityArtLevel(4_096)).toBe(3);
  });

  it("maps every board asset and excludes rejected UI attempts", () => {
    for (const id of PIXELLAB_BOARD_ART_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toMatch(/^\/assets\/pixellab\//);
    expect(ACCEPTED_ART_URLS["ui-tech-riding"]).toBeUndefined();
    expect(ACCEPTED_ART_URLS["ui-tech-archery"]).toBeUndefined();
    for (const id of PIXELLAB_PENDING_BOARD_ART_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toBeUndefined();
  });

  it("publishes the calibrated Archer weapon attachment without editing its raster", () => {
    expect(ACCEPTED_ART_ATTACHMENTS["unit-archer"]?.projectileOrigin).toEqual({
      x: 0.7,
      y: 0.37,
    });
  });

  it("uses the calibrated per-class display size and ground registration", () => {
    expect(
      anchoredDestinationRect({ x: 400, y: 300 }, 1, BOARD_ART_GEOMETRY.ground),
    ).toEqual({ x: 336, y: 263, width: 128, height: 74 });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        BOARD_ART_GEOMETRY.lowObject,
      ),
    ).toEqual({ x: 336, y: 189, width: 128, height: 148 });
    expect(
      anchoredDestinationRect({ x: 400, y: 300 }, 1, MOUNTAIN_ART_GEOMETRY[0]),
    ).toEqual({ x: 346.24, y: 224.82, width: 107.52, height: 124.32 });
    expect(
      anchoredDestinationRect({ x: 400, y: 300 }, 1, MOUNTAIN_ART_GEOMETRY[2]),
    ).toEqual({ x: 348.8, y: 225.6, width: 102.4, height: 118.4 });
    expect(
      anchoredDestinationRect({ x: 400, y: 300 }, 1, BOARD_ART_GEOMETRY.unit),
    ).toEqual({ x: 355.2, y: 222.3, width: 89.6, height: 103.6 });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        BOARD_ART_GEOMETRY.siegeUnit,
      ),
    ).toEqual({
      x: 342.4,
      y: 300 - 288 * 0.3,
      width: 384 * 0.3,
      height: 384 * 0.3,
    });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        SETTLEMENT_ART_GEOMETRY.village,
      ),
    ).toEqual({ x: 336, y: 212, width: 128, height: 148 });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        SETTLEMENT_ART_GEOMETRY.cities[1],
      ),
    ).toEqual({
      x: 342.4,
      y: 229.2,
      width: 384 * 0.3,
      height: 384 * 0.3,
    });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        SETTLEMENT_ART_GEOMETRY.cities[3],
      ),
    ).toEqual({
      x: 342.4,
      y: 227.10000000000002,
      width: 384 * 0.3,
      height: 384 * 0.3,
    });
  });

  it("constrains every mountain variant and grounds every settlement level", () => {
    const acceptedUnitBounds = [
      { width: 216, height: 234 },
      { width: 161, height: 227 },
      { width: 224, height: 218 },
      { width: 177, height: 233 },
    ];
    const mountainBounds = [
      { left: 7, top: 40, right: 249, bottom: 251 },
      { left: 7, top: 40, right: 249, bottom: 251 },
      { left: 20, top: 30, right: 235, bottom: 262 },
    ];
    const settlementBounds = [
      {
        bounds: { left: 52, top: 49, right: 229, bottom: 237 },
        geometry: SETTLEMENT_ART_GEOMETRY.village,
      },
      {
        bounds: { left: 24, top: 51, right: 360, bottom: 337 },
        geometry: SETTLEMENT_ART_GEOMETRY.cities[1],
      },
      {
        bounds: { left: 14, top: 8, right: 372, bottom: 344 },
        geometry: SETTLEMENT_ART_GEOMETRY.cities[2],
      },
      {
        bounds: { left: 14, top: 8, right: 372, bottom: 344 },
        geometry: SETTLEMENT_ART_GEOMETRY.cities[3],
      },
    ];

    expect(
      Math.max(
        ...acceptedUnitBounds.map(
          ({ width }) => width * BOARD_ART_GEOMETRY.unit.displayScale,
        ),
      ),
    ).toBeLessThanOrEqual(78.4);
    expect(
      Math.max(
        ...acceptedUnitBounds.map(
          ({ height }) => height * BOARD_ART_GEOMETRY.unit.displayScale,
        ),
      ),
    ).toBeLessThanOrEqual(81.9);
    const mountains = mountainBounds.map((bounds, index) => {
      const geometry = MOUNTAIN_ART_GEOMETRY[index];
      if (geometry === undefined) throw new Error(`Missing mountain ${index}`);
      return displayBounds(bounds, geometry);
    });
    expect(mountains).toEqual([
      { left: -50.82, top: -58.38, right: 50.82, bottom: 30.24 },
      { left: -50.82, top: -58.38, right: 50.82, bottom: 30.24 },
      { left: -43.2, top: -62.4, right: 42.8, bottom: 30.4 },
    ]);
    for (const [index, bounds] of mountains.entries()) {
      expect(MOUNTAIN_ART_GEOMETRY[index]?.lowerDiamondClip).toBe(true);
      expect(bounds.left).toBeGreaterThanOrEqual(-52);
      expect(bounds.right).toBeLessThanOrEqual(52);
      expect(bounds.top).toBeGreaterThanOrEqual(-63);
      expect(bounds.bottom).toBeLessThanOrEqual(31);
    }

    const settlements = settlementBounds.map(({ bounds, geometry }) =>
      displayBounds(bounds, geometry),
    );
    expect(settlements).toEqual([
      { left: -38, top: -63.5, right: 50.5, bottom: 30.5 },
      { left: -50.4, top: -55.5, right: 50.4, bottom: 30.3 },
      { left: -53.4, top: -70.5, right: 54, bottom: 30.3 },
      { left: -53.4, top: -70.5, right: 54, bottom: 30.3 },
    ]);
    for (const bounds of settlements) {
      expect(bounds.right - bounds.left).toBeLessThanOrEqual(107.4);
      expect(bounds.bottom).toBeGreaterThanOrEqual(30);
      expect(bounds.bottom).toBeLessThanOrEqual(30.5);
    }
  });

  it("clips mountain foreground alpha to the owning lower diamond", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      addEventListener(type: string, listener: () => void): void {
        listeners.set(type, listener);
      },
      alt: "",
      decoding: "auto",
      src: "",
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const bindings = createPixelLabAssetBindings(documentRoot);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: null,
      variant: 2,
    };

    bindings.drawMountain(context, options);
    listeners.get("load")?.();
    bindings.drawMountain(context, options);

    expect(context.rect).toHaveBeenCalledWith(348.8, 225.6, 102.4, 74.4);
    expect(context.moveTo).toHaveBeenCalledWith(336, 300);
    expect(context.lineTo).toHaveBeenCalledWith(400, 337);
    expect(context.lineTo).toHaveBeenCalledWith(464, 300);
    expect(context.clip).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      348.8,
      225.6,
      102.4,
      118.4,
    );
  });

  it("draws a code-native fallback until the accepted image loads, then redraws", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      addEventListener(type: string, listener: () => void): void {
        listeners.set(type, listener);
      },
      alt: "",
      decoding: "auto",
      src: "",
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const redraw = vi.fn();
    const bindings = createPixelLabAssetBindings(documentRoot, redraw);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: null,
      variant: 0,
    };

    bindings.drawGrass(context, options);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();

    listeners.get("load")?.();
    bindings.drawGrass(context, options);
    expect(redraw).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(image, 336, 263, 128, 74);
  });

  it("retains the code-native fallback after an accepted image load error", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      addEventListener(type: string, listener: () => void): void {
        listeners.set(type, listener);
      },
      alt: "",
      decoding: "auto",
      src: "",
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const redraw = vi.fn();
    const bindings = createPixelLabAssetBindings(documentRoot, redraw);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: null,
      variant: 0,
    };

    bindings.drawGrass(context, options);
    listeners.get("error")?.();
    bindings.drawGrass(context, options);

    expect(redraw).toHaveBeenCalledOnce();
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
  });

  it("uses accepted Fruit art at the low-object anchor and keeps fallback loading/error only", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      addEventListener(type: string, listener: () => void): void {
        listeners.set(type, listener);
      },
      alt: "",
      decoding: "auto",
      src: "",
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const redraw = vi.fn();
    const bindings = createPixelLabAssetBindings(documentRoot, redraw);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: null,
      variant: 0,
    };

    bindings.drawFruit(context, options);
    expect(image.src).toMatch(/\/assets\/pixellab\/terrain\/fruit\.png$/);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalled();

    listeners.get("load")?.();
    bindings.drawFruit(context, options);
    expect(redraw).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(image, 336, 189, 128, 148);
  });

  it("loads accepted Catapult art at the explicit siege geometry", () => {
    const listeners = new Map<string, () => void>();
    const image = {
      addEventListener(type: string, listener: () => void): void {
        listeners.set(type, listener);
      },
      alt: "",
      decoding: "auto",
      src: "",
    } as unknown as HTMLImageElement;
    const documentRoot = {
      createElement: vi.fn(() => image),
    } as unknown as Document;
    const bindings = createPixelLabAssetBindings(documentRoot);
    const context = drawingContext();
    bindings.drawUnit(
      context,
      {
        center: { x: 400, y: 300 },
        zoom: 1,
        ownerColor: null,
        variant: 0,
      },
      {
        id: unitId(1),
        ownerId: playerId(1),
        homeCityId: cityId(1),
        capacityExempt: false,
        type: "CATAPULT",
        at: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        kills: 0,
        veteran: false,
        ready: true,
        captureEligible: false,
        activation: {
          moved: false,
          attacked: false,
          recovered: false,
          captured: false,
          handled: false,
          escapeAvailable: false,
        },
      },
    );
    expect(documentRoot.createElement).toHaveBeenCalledOnce();
    expect(context.drawImage).not.toHaveBeenCalled();
    listeners.get("load")?.();
    bindings.drawUnit(
      context,
      {
        center: { x: 400, y: 300 },
        zoom: 1,
        ownerColor: null,
        variant: 0,
      },
      {
        id: unitId(1),
        ownerId: playerId(1),
        homeCityId: cityId(1),
        capacityExempt: false,
        type: "CATAPULT",
        at: { x: 1, y: 1 },
        hp: 10,
        maxHp: 10,
        kills: 0,
        veteran: false,
        ready: true,
        captureEligible: false,
        activation: {
          moved: false,
          attacked: false,
          recovered: false,
          captured: false,
          handled: false,
          escapeAvailable: false,
        },
      },
    );
    const destination = anchoredDestinationRect(
      { x: 400, y: 300 },
      1,
      BOARD_ART_GEOMETRY.siegeUnit,
    );
    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      destination.x,
      destination.y,
      destination.width,
      destination.height,
    );
    expect(context.fillRect).toHaveBeenCalled();
  });
});

function drawingContext(): CanvasRenderingContext2D {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function displayBounds(
  bounds: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  },
  geometry: {
    readonly anchor: { readonly x: number; readonly y: number };
    readonly displayScale: number;
  },
): { left: number; top: number; right: number; bottom: number } {
  const scale = geometry.displayScale;
  return {
    left: round((bounds.left - geometry.anchor.x) * scale),
    top: round((bounds.top - geometry.anchor.y) * scale),
    right: round((bounds.right - geometry.anchor.x) * scale),
    bottom: round((bounds.bottom - geometry.anchor.y) * scale),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
