import type {
  GalleryTerrainLayerV7,
  GalleryTerrainSwatchV7,
} from "../gallery-terrain-presentation-v7";
import {
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
} from "./chibi-art-resolver-v7";
import {
  GALLERY_TILE_BOX_V7,
  galleryPiecePlacementV7,
} from "./gallery-sprite-v7";
import { createIceFolkBoardArtV7 } from "./ice-folk-canvas-v7";

/**
 * The Gallery's terrain swatches (bead pulp_wars-2yc.3): one terrain tile
 * or one composed piece, drawn from the same rasters and through the same
 * resolvers as the board (the live look's toned terrain, the Ice Folk Snow
 * and sea ice builders). A swatch is a still of the art; how the board
 * lays terrain out is shown by the detail's sample board.
 */
export type GalleryTerrainStateV7 = "READY" | "LOADING" | "MISSING";

export interface GalleryTerrainArtV7 {
  draw(
    canvas: HTMLCanvasElement,
    swatch: GalleryTerrainSwatchV7,
    scale: number,
    devicePixelRatio: number,
  ): GalleryTerrainStateV7;
}

/** The swatch canvas in master px. */
export function galleryTerrainBoxV7(swatch: GalleryTerrainSwatchV7): {
  readonly width: number;
  readonly height: number;
} {
  return swatch.box.kind === "TILE"
    ? { width: GALLERY_TILE_BOX_V7.width, height: GALLERY_TILE_BOX_V7.height }
    : { width: swatch.box.width, height: swatch.box.height };
}

/** Every side of a floe meets open water. */
const ALL_SIDES = 15;

export function createGalleryTerrainArtV7(input: {
  readonly environment: ChibiRasterEnvironmentV7;
  /** The live look's art chain (createGalleryArtV7). */
  readonly art: ChibiBoardArtV7;
  readonly redraw: () => void;
}): GalleryTerrainArtV7 {
  const { environment, art } = input;
  const iceFolk = createIceFolkBoardArtV7(environment);
  const rasters = new Map<
    string,
    { state: GalleryTerrainStateV7; image: CanvasImageSource | null }
  >();
  const raster = (
    url: string,
  ): { state: GalleryTerrainStateV7; image: CanvasImageSource | null } => {
    const known = rasters.get(url);
    if (known !== undefined) return known;
    const record: {
      state: GalleryTerrainStateV7;
      image: CanvasImageSource | null;
    } = { state: "LOADING", image: null };
    rasters.set(url, record);
    let returned = false;
    record.image = environment.loadImage(url, (ok) => {
      record.state = ok ? "READY" : "MISSING";
      // A synchronous settle (a preloaded raster) needs no redraw.
      if (returned) input.redraw();
    });
    returned = true;
    return record;
  };

  type Drawn = {
    readonly image: CanvasImageSource;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** A layer's image and place in the box, or why it cannot be drawn. */
  const resolve = (
    layer: GalleryTerrainLayerV7,
    piece: boolean,
    deviceScale: number,
  ): Drawn | GalleryTerrainStateV7 => {
    const cell = {
      x: GALLERY_TILE_BOX_V7.cellCentreX - GALLERY_TILE_BOX_V7.cell / 2,
      y: GALLERY_TILE_BOX_V7.cellCentreY - GALLERY_TILE_BOX_V7.cell / 2,
      width: GALLERY_TILE_BOX_V7.cell,
      height: GALLERY_TILE_BOX_V7.cell,
    };
    const subject = (
      name: Extract<GalleryTerrainLayerV7, { kind: "SUBJECT" }>["subject"],
      at: { readonly x: number; readonly y: number },
    ) =>
      resolveChibiWithFallbackV7(art, { subject: name, at, deviceScale })
        .resolution;
    if (layer.kind === "RASTER") {
      const record = raster(layer.url);
      if (record.state !== "READY" || record.image === null)
        return record.state === "READY" ? "MISSING" : record.state;
      return {
        image: record.image,
        // A piece fills its own box; a tile raster sits on the cell, its
        // overflow above it.
        x: piece ? 0 : cell.x,
        y: piece ? 0 : cell.y + cell.height - layer.height,
        width: layer.width,
        height: layer.height,
      };
    }
    if (layer.kind === "SUBJECT") {
      const resolution = subject(layer.subject, layer.at);
      if (resolution.kind !== "READY") return resolution.kind;
      const at = galleryPiecePlacementV7(resolution.asset);
      return {
        image: resolution.image,
        x: at.x,
        y: at.y,
        width: resolution.asset.width,
        height: resolution.asset.height,
      };
    }
    if (layer.kind === "SNOW") {
      const image = iceFolk.snowTile(0, layer.variant);
      return image === null ? "MISSING" : { image, ...cell };
    }
    const sheet = subject(layer.sheet, { x: 0, y: 0 });
    if (sheet.kind !== "READY") return sheet.kind;
    const image = iceFolk.seaIce(sheet.image, ALL_SIDES, 0, layer.permanent);
    return image === null ? "MISSING" : { image, ...cell };
  };

  return {
    draw(canvas, swatch, scale, devicePixelRatio) {
      const box = galleryTerrainBoxV7(swatch);
      const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
      canvas.style.width = `${box.width * scale}px`;
      canvas.style.height = `${box.height * scale}px`;
      const width = Math.round(box.width * scale * dpr);
      const height = Math.round(box.height * scale * dpr);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const deviceScale = scale * dpr;
      const layers = swatch.layers.map((layer) =>
        resolve(layer, swatch.box.kind === "PIECE", deviceScale),
      );
      if (layers.length === 0) return "MISSING";
      if (layers.includes("LOADING")) return "LOADING";
      if (layers.includes("MISSING")) return "MISSING";
      let context: CanvasRenderingContext2D | null;
      try {
        context = canvas.getContext("2d");
      } catch {
        context = null;
      }
      if (context === null) return "MISSING";
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.imageSmoothingEnabled = !Number.isInteger(deviceScale);
      for (const layer of layers)
        if (typeof layer !== "string")
          context.drawImage(
            layer.image,
            layer.x,
            layer.y,
            layer.width,
            layer.height,
          );
      return "READY";
    },
  };
}
