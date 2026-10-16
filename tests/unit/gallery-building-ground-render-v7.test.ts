import { describe, expect, it } from "vitest";
import {
  GALLERY_TILE_BOX_V7,
  createGalleryArtV7,
  drawGalleryTileV7,
  type GalleryTileCellsV7,
} from "../../src/render/canvas/gallery-sprite-v7";
import {
  composePixelsOverV7,
  createGalleryTerrainArtV7,
} from "../../src/render/canvas/gallery-terrain-v7";
import {
  BUILDING_FADE_STRENGTHS_V7,
  buildingFadeGroundV7,
  type BuildingFadeToneV7,
} from "../../src/render/canvas/building-fade-v7";
import { galleryBuildingGroundV7 } from "../../src/render/gallery-presentation-v7";
import type { GalleryTerrainLayerV7 } from "../../src/render/gallery-terrain-presentation-v7";

/**
 * Bead pulp_wars-2yc.68: the Gallery's Buildings tab stands every building
 * on a cell of its faction's own ground, composed once per ground, and
 * fades the tile improvements as the board does.
 */

type Fake = { readonly url?: string; readonly pixels?: Uint8ClampedArray };

/** Each raster is one flat colour, read from its URL ("#rrggbbaa"). */
function colourOf(url: string): readonly number[] {
  const hex = /#([0-9a-f]{8})$/.exec(url)?.[1] ?? "ffffffff";
  return [0, 2, 4, 6].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

function environment() {
  const reads: string[] = [];
  return {
    reads,
    loadImage(url: string, settle: (ok: boolean) => void) {
      settle(true);
      return { url } as unknown as CanvasImageSource;
    },
    readPixels(image: CanvasImageSource, width: number, height: number) {
      const fake = image as unknown as Fake;
      reads.push(fake.url ?? "surface");
      if (fake.pixels !== undefined) return new Uint8ClampedArray(fake.pixels);
      const pixels = new Uint8ClampedArray(width * height * 4);
      const colour = colourOf(fake.url ?? "");
      for (let index = 0; index < pixels.length; index += 4)
        pixels.set(colour, index);
      return pixels;
    },
    createSurface: (pixels: Uint8ClampedArray, width: number, height: number) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
  };
}

const raster = (url: string): GalleryTerrainLayerV7 => ({
  kind: "RASTER",
  url,
  width: 80,
  height: 80,
});

describe("Gallery buildings on their faction's ground", () => {
  it("composes straight-alpha pixels source-over", () => {
    const under = new Uint8ClampedArray([10, 20, 30, 255, 0, 0, 0, 0]);
    composePixelsOverV7(
      under,
      new Uint8ClampedArray([210, 220, 230, 128, 50, 60, 70, 255]),
    );
    expect([...under.slice(0, 4)]).toEqual([110, 120, 130, 255]);
    expect([...under.slice(4)]).toEqual([50, 60, 70, 255]);
    // A transparent top leaves the pixel as it was.
    const kept = new Uint8ClampedArray([1, 2, 3, 4]);
    composePixelsOverV7(kept, new Uint8ClampedArray([9, 9, 9, 0]));
    expect([...kept]).toEqual([1, 2, 3, 4]);
  });

  it("composes a ground cell once and keeps it", () => {
    const env = environment();
    const art = createGalleryTerrainArtV7({
      environment: env,
      art: createGalleryArtV7(env, () => undefined),
      redraw: () => undefined,
    });
    const layers = [raster("ground#204060ff"), raster("wash#ffffff80")];
    const cell = art.cell(layers) as unknown as {
      pixels: Uint8ClampedArray;
      width: number;
      height: number;
    };
    expect(typeof cell).toBe("object");
    expect([cell.width, cell.height]).toEqual([80, 80]);
    // The half-white wash over the ground, everywhere in the cell.
    expect([...cell.pixels.slice(0, 4)]).toEqual([144, 160, 176, 255]);
    expect([...cell.pixels.slice(-4)]).toEqual([144, 160, 176, 255]);
    const reads = env.reads.length;
    // The same ground again is the same surface, with no pixel work.
    expect(art.cell([...layers])).toBe(cell);
    expect(env.reads).toHaveLength(reads);
    expect(art.cell([])).toBe("MISSING");
  });

  it("composes the Ice Folk Snow over the default Grass", () => {
    const env = environment();
    const art = createGalleryTerrainArtV7({
      environment: env,
      art: createGalleryArtV7(env, () => undefined),
      redraw: () => undefined,
    });
    const snow = galleryBuildingGroundV7("FARM", "ICE_FOLK");
    expect(snow.layers.map((layer) => layer.kind)).toEqual(["RASTER", "SNOW"]);
    expect(typeof art.cell(snow.layers)).toBe("object");
  });

  it("draws the composed ground under the faded building", () => {
    const env = environment();
    const art = createGalleryArtV7(env, () => undefined);
    const groundSurface = { url: "composed-ground" } as Fake;
    const fades: { image: CanvasImageSource; tone: BuildingFadeToneV7 }[] = [];
    const grounds: (readonly GalleryTerrainLayerV7[])[] = [];
    const cells: GalleryTileCellsV7 = {
      ground(layers) {
        grounds.push(layers);
        return groundSurface as unknown as CanvasImageSource;
      },
      fade(image, tone) {
        fades.push({ image, tone });
        return { url: "faded" } as unknown as CanvasImageSource;
      },
    };
    const drawn: { url: string; x: number; y: number; w: number }[] = [];
    const context = {
      setTransform: () => undefined,
      clearRect: () => undefined,
      beginPath: () => undefined,
      ellipse: () => undefined,
      fill: () => undefined,
      fillStyle: "",
      drawImage: (image: Fake, x: number, y: number, w: number) =>
        drawn.push({ url: image.url ?? "surface", x, y, w }),
      imageSmoothingEnabled: false,
    };
    const canvas = {
      style: {} as Record<string, string>,
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const ground = galleryBuildingGroundV7("FARM", "MARTIAN");
    const tone: BuildingFadeToneV7 = {
      strength: BUILDING_FADE_STRENGTHS_V7.medium,
      ground: buildingFadeGroundV7("MARTIAN"),
    };
    const state = drawGalleryTileV7(
      canvas,
      art,
      {
        subject: "IMPROVEMENT:MARTIAN:FARM",
        ground: null,
        groundLayers: ground.layers,
        fade: tone,
        scale: 1,
      },
      1,
      cells,
    );
    expect(state.kind).toBe("READY");
    expect(grounds).toEqual([ground.layers]);
    // The ground fills the cell, then the faded building stands on it.
    expect(drawn[0]).toEqual({
      url: "composed-ground",
      x: GALLERY_TILE_BOX_V7.cellCentreX - 40,
      y: GALLERY_TILE_BOX_V7.cellCentreY - 40,
      w: 80,
    });
    expect(drawn.at(-1)?.url).toBe("faded");
    expect(fades).toHaveLength(1);
    expect(fades[0]?.tone).toBe(tone);
    // Without a fade the building is drawn as it resolved.
    drawn.length = 0;
    drawGalleryTileV7(
      canvas,
      art,
      {
        subject: "CITY:MARTIAN:2",
        ground: null,
        groundLayers: ground.layers,
        fade: null,
        scale: 1,
      },
      1,
      cells,
    );
    expect(fades).toHaveLength(1);
    expect(drawn[0]?.url).toBe("composed-ground");
    expect(drawn.at(-1)?.url).not.toBe("faded");
  });
});
