import { describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_ART_ATTACHMENTS,
  ACCEPTED_ART_URLS,
  CANDY_ACTION_ART_URLS,
  FACTION_BADGE_URLS,
  FACTION_HERO_URLS,
} from "../../src/assets/generated-art-manifest";
import {
  BOARD_ART_GEOMETRY,
  MOUNTAIN_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
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

  it("maps every board asset and the accepted Riding and Archery UI icons", () => {
    for (const id of PIXELLAB_BOARD_ART_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toMatch(/^\/assets\/pixellab\//);
    expect(ACCEPTED_ART_URLS["ui-tech-riding"]).toBe(
      "/assets/pixellab/ui/tech-riding.png",
    );
    expect(ACCEPTED_ART_URLS["ui-tech-archery"]).toBe(
      "/assets/pixellab/ui/tech-archery.png",
    );
    for (const id of PIXELLAB_PENDING_BOARD_ART_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toBeUndefined();
  });

  it("publishes the calibrated Archer weapon attachment without editing its raster", () => {
    expect(ACCEPTED_ART_ATTACHMENTS["unit-archer"]?.projectileOrigin).toEqual({
      x: 0.7,
      y: 0.37,
    });
    expect(
      ACCEPTED_ART_ATTACHMENTS["unit-candy-gumball-guard"]?.projectileOrigin,
    ).toEqual({ x: 0.6523, y: 0.5156 });
  });

  it("publishes the complete Candy UI and faction art family", () => {
    expect(FACTION_HERO_URLS.CANDY).toBe(
      "/assets/pixellab/ui/faction-candy-hero.png",
    );
    expect(FACTION_BADGE_URLS.CANDY).toBe(
      "/assets/pixellab/ui/faction-candy-badge.png",
    );
    expect(CANDY_ACTION_ART_URLS).toEqual({
      KAMIKAZE_ROLL: "/assets/pixellab/ui/action-kamikaze-roll.png",
      BUILD_CHOCOLATE_WALL:
        "/assets/pixellab/ui/action-build-chocolate-wall.png",
      CANDIFY: "/assets/pixellab/ui/action-candify.png",
      CHOOSE_CANDIFY_CITY: "/assets/pixellab/ui/action-choose-candify-city.png",
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
        PLACEMENT_ART_GEOMETRY.forest,
      ),
    ).toEqual({ x: 336, y: 212, width: 128, height: 148 });
    expect(
      anchoredDestinationRect(
        { x: 400, y: 300 },
        1,
        PLACEMENT_ART_GEOMETRY.candyWarrior,
      ),
    ).toEqual({ x: 355.2, y: 232.8, width: 89.6, height: 103.6 });
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

  it("grounds the corrected alpha bounds without changing their scale", () => {
    const forestBounds = [
      { left: 38, top: 51, right: 217, bottom: 217 },
      { left: 12, top: 84, right: 244, bottom: 222 },
      { left: 39, top: 28, right: 216, bottom: 222 },
      { left: 32, top: 8, right: 223, bottom: 222 },
    ].map((bounds) => displayBounds(bounds, PLACEMENT_ART_GEOMETRY.forest));

    expect(forestBounds).toEqual([
      { left: -45, top: -62.5, right: 44.5, bottom: 20.5 },
      { left: -58, top: -46, right: 58, bottom: 23 },
      { left: -44.5, top: -74, right: 44, bottom: 23 },
      { left: -48, top: -84, right: 47.5, bottom: 23 },
    ]);
    expect(
      displayBounds(
        { left: 53, top: 84, right: 202, bottom: 222 },
        PLACEMENT_ART_GEOMETRY.animal,
      ),
    ).toEqual({ left: -37.5, top: -46, right: 37, bottom: 23 });
    expect(
      displayBounds(
        { left: 83, top: 150, right: 172, bottom: 222 },
        PLACEMENT_ART_GEOMETRY.fruit,
      ),
    ).toEqual({ left: -22.5, top: -13, right: 22, bottom: 23 });
    expect(
      displayBounds(
        { left: 27, top: 4, right: 228, bottom: 222 },
        PLACEMENT_ART_GEOMETRY.candyWarrior,
      ),
    ).toEqual({ left: -35.35, top: -65.8, right: 35, bottom: 10.5 });
    expect(
      displayBounds(
        { left: 20, top: 18, right: 236, bottom: 252 },
        BOARD_ART_GEOMETRY.unit,
      ).bottom,
    ).toBe(10.5);
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
    expect(context.drawImage).toHaveBeenCalledWith(image, 336, 212, 128, 148);
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
          specialActed: false,
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
          specialActed: false,
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

  it("selects Candy unit art by owner faction while sharing Catapult art", () => {
    const images: HTMLImageElement[] = [];
    const documentRoot = {
      createElement: vi.fn(() => {
        const image = {
          addEventListener(): void {},
          alt: "",
          decoding: "auto",
          src: "",
        } as unknown as HTMLImageElement;
        images.push(image);
        return image;
      }),
    } as unknown as Document;
    const bindings = createPixelLabAssetBindings(documentRoot);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: "#ff737c",
      variant: 0,
    };
    const unit = {
      id: unitId(1),
      ownerId: playerId(1),
      homeCityId: cityId(1),
      type: "WARRIOR" as const,
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
        specialActed: false,
      },
    };

    bindings.drawUnit(context, options, unit, "CANDY");
    bindings.drawUnit(context, options, unit, "ORIGINAL");
    bindings.drawUnit(context, options, { ...unit, type: "CATAPULT" }, "CANDY");

    expect(images.map((image) => image.src)).toEqual([
      "/assets/pixellab/units/candy-warrior.png",
      "/assets/pixellab/units/warrior.png",
      "/assets/pixellab/units/catapult.png",
    ]);
  });

  it("lowers only the requested production classes and keeps their fallbacks aligned", () => {
    const images: Array<
      HTMLImageElement & { listeners: Map<string, () => void> }
    > = [];
    const documentRoot = {
      createElement: vi.fn(() => {
        const listeners = new Map<string, () => void>();
        const image = {
          addEventListener(type: string, listener: () => void): void {
            listeners.set(type, listener);
          },
          listeners,
          alt: "",
          decoding: "auto",
          src: "",
        } as HTMLImageElement & { listeners: Map<string, () => void> };
        images.push(image);
        return image;
      }),
    } as unknown as Document;
    const bindings = createPixelLabAssetBindings(documentRoot);
    const context = drawingContext();
    const options = {
      center: { x: 400, y: 300 },
      zoom: 1,
      ownerColor: null,
      variant: 0,
    };
    const warrior = {
      id: unitId(1),
      ownerId: playerId(1),
      homeCityId: cityId(1),
      capacityExempt: false,
      type: "WARRIOR" as const,
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
        specialActed: false,
      },
    };

    bindings.drawFruit(context, options);
    bindings.drawAnimal(context, options);
    bindings.drawForest(context, options);
    bindings.drawUnit(context, options, warrior, "CANDY");
    bindings.drawUnit(context, options, warrior, "ORIGINAL");
    bindings.drawUnit(
      context,
      options,
      { ...warrior, type: "ARCHER" },
      "CANDY",
    );
    bindings.drawOre(context, options);

    expect(context.translate).toHaveBeenCalledWith(400, 323);
    expect(context.translate).toHaveBeenCalledWith(400, 310.5);
    expect(context.translate).toHaveBeenCalledWith(400, 300);
    for (const image of images) image.listeners.get("load")?.();
    vi.mocked(context.drawImage).mockClear();

    bindings.drawFruit(context, options);
    bindings.drawAnimal(context, options);
    bindings.drawForest(context, options);
    bindings.drawUnit(context, options, warrior, "CANDY");
    bindings.drawUnit(context, options, warrior, "ORIGINAL");
    bindings.drawUnit(
      context,
      options,
      { ...warrior, type: "ARCHER" },
      "CANDY",
    );
    bindings.drawOre(context, options);

    expect(context.drawImage).toHaveBeenNthCalledWith(
      1,
      images[0],
      336,
      212,
      128,
      148,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      2,
      images[1],
      336,
      212,
      128,
      148,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      3,
      images[2],
      336,
      212,
      128,
      148,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      4,
      images[3],
      355.2,
      232.8,
      89.6,
      103.6,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      5,
      images[4],
      355.2,
      222.3,
      89.6,
      103.6,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      6,
      images[5],
      355.2,
      222.3,
      89.6,
      103.6,
    );
    expect(context.drawImage).toHaveBeenNthCalledWith(
      7,
      images[6],
      336,
      189,
      128,
      148,
    );
  });

  it("loads Chocolate Wall art at the low-object anchor with fallback", () => {
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
      ownerColor: "#ff737c",
      variant: 0,
    };

    bindings.drawChocolateWall(context, options);
    expect(image.src).toBe("/assets/pixellab/buildings/chocolate-wall.png");
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();
    listeners.get("load")?.();
    bindings.drawChocolateWall(context, options);
    expect(context.drawImage).toHaveBeenCalledWith(image, 336, 189, 128, 148);
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
    readonly offsetY?: number;
  },
): { left: number; top: number; right: number; bottom: number } {
  const scale = geometry.displayScale;
  const offsetY = geometry.offsetY ?? 0;
  return {
    left: round((bounds.left - geometry.anchor.x) * scale),
    top: round((bounds.top - geometry.anchor.y) * scale + offsetY),
    right: round((bounds.right - geometry.anchor.x) * scale),
    bottom: round((bounds.bottom - geometry.anchor.y) * scale + offsetY),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
