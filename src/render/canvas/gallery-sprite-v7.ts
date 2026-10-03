import {
  chibiAnchorV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../assets/chibi-art-v7";
import {
  createChibiArtResolverV7,
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
} from "./chibi-art-resolver-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "./live-board-look-v7";
import { unitShadowAnchorV7 } from "./unit-shadows-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
  directionUnitAfloatV7,
} from "./visual-direction-v7";

/**
 * The Gallery's sprite tiles (bead pulp_wars-ic8): one board cell drawn
 * like the live CHIBI board draws it, so sprites compare as players see
 * them. The art resolves through the same chain as the board host (the
 * live direction's own rasters, then the default art, toned and recoloured
 * by the live visual direction), the unit stands on its measured ground
 * shadow (unit-shadows-v7.ts), and the cell's ground is the terrain tile
 * the piece stands on in play: Grass, Shallow Water for ships, Ports and
 * Shipyards, Forest for a Lumber Camp.
 */

/** The tile canvas in master px: the 80 px cell plus the art's overflow. */
export const GALLERY_TILE_BOX_V7 = {
  width: 96,
  height: 112,
  /** The owning cell's centre: the anchor of every piece. */
  cellCentreX: 48,
  cellCentreY: 72,
  cell: 80,
} as const;

/** The art chain of the live board look (see CanvasBoardHostV7). */
export function createGalleryArtV7(
  environment: ChibiRasterEnvironmentV7,
  redraw: () => void,
): ChibiBoardArtV7 {
  return createDirectedChibiArtV7({
    base: createChibiArtResolverV7({ environment, redraw }),
    direction: LIVE_DIRECTION_V7,
    environment,
    samples: createChibiArtResolverV7({
      environment,
      registry: LIVE_DIRECTION_ART_REGISTRY_V7,
      redraw,
    }),
  });
}

export interface GalleryTileRequestV7 {
  readonly subject: ArtSubjectV7;
  /** The terrain under the piece, or null when its art has its own. */
  readonly ground: ArtSubjectV7 | null;
  readonly ownerColor?: string | undefined;
  /** CSS px per master px. */
  readonly scale: number;
}

export type GalleryTileStateV7 =
  /** Drawn; `factionArt` is false when a shared stand-in was drawn. */
  | { readonly kind: "READY"; readonly factionArt: boolean }
  /** A raster is loading; the art's redraw callback fires when it settles. */
  | { readonly kind: "LOADING" }
  /** No CHIBI raster (or no canvas): nothing drawn. */
  | { readonly kind: "MISSING" };

/** Where a piece's master canvas sits in the tile box (master px). */
export function galleryPiecePlacementV7(asset: ChibiArtAssetV7): {
  readonly x: number;
  readonly y: number;
} {
  const anchor = chibiAnchorV7(asset);
  return {
    x: GALLERY_TILE_BOX_V7.cellCentreX - anchor.x,
    y: GALLERY_TILE_BOX_V7.cellCentreY - anchor.y,
  };
}

/**
 * The ground shadow of a unit in master px within the tile box, or null
 * (afloat units, every other piece). A flyer's is the flyer's own shadow.
 */
export function galleryUnitShadowV7(
  subject: ArtSubjectV7,
  asset: ChibiArtAssetV7,
): {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
} | null {
  if (!subject.startsWith("UNIT:") || directionUnitAfloatV7(subject))
    return null;
  const at = galleryPiecePlacementV7(asset);
  const anchor = unitShadowAnchorV7(subject, asset.id);
  if (anchor?.shadow !== undefined && anchor.shadow !== null)
    return {
      x: at.x + anchor.shadow.x,
      y: at.y + anchor.shadow.y,
      radiusX: anchor.shadow.radiusX,
      radiusY: anchor.shadow.radiusY,
    };
  // No measured anchor (a stand-in raster): the generic shadow of the
  // board, under the canvas's bottom centre.
  const radiusX = Math.min(asset.width * 0.5, 28) * 0.78;
  const radiusY = radiusX * 0.34;
  return {
    x: at.x + asset.width / 2,
    y: at.y + asset.height - radiusY - 1,
    radiusX,
    radiusY,
  };
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

/**
 * Draws one tile into `canvas`: its ground, the unit's shadow and the
 * piece, at `request.scale` CSS px per master px and the device's pixel
 * ratio. The canvas keeps its CSS size whatever the state, so the table
 * never jumps while rasters load.
 */
export function drawGalleryTileV7(
  canvas: HTMLCanvasElement,
  art: ChibiBoardArtV7,
  request: GalleryTileRequestV7,
  devicePixelRatio: number,
): GalleryTileStateV7 {
  const box = GALLERY_TILE_BOX_V7;
  const scale = request.scale;
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  canvas.style.width = `${box.width * scale}px`;
  canvas.style.height = `${box.height * scale}px`;
  const width = Math.round(box.width * scale * dpr);
  const height = Math.round(box.height * scale * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const deviceScale = scale * dpr;
  const resolve = (subject: ArtSubjectV7, ownerColor?: string) =>
    resolveChibiWithFallbackV7(art, {
      subject,
      at: { x: 0, y: 0 },
      ownerColor,
      deviceScale,
    });
  const piece = resolve(request.subject, request.ownerColor);
  const ground =
    request.ground === null ? null : resolve(request.ground).resolution;
  if (piece.resolution.kind === "LOADING" || ground?.kind === "LOADING")
    return { kind: "LOADING" };
  // Ask for a context only with a piece to draw (and never in a DOM
  // without canvas support, where nothing resolves).
  if (piece.resolution.kind !== "READY") return { kind: "MISSING" };
  const context = context2d(canvas);
  if (context === null) return { kind: "MISSING" };
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  // Pixel art stays crisp at whole scales, as on the board.
  context.imageSmoothingEnabled = !Number.isInteger(deviceScale);
  if (ground?.kind === "READY") {
    const at = galleryPiecePlacementV7(ground.asset);
    context.drawImage(
      ground.image,
      at.x,
      at.y,
      ground.asset.width,
      ground.asset.height,
    );
  }
  const { asset, image } = piece.resolution;
  const shadow = galleryUnitShadowV7(request.subject, asset);
  if (shadow !== null) {
    context.beginPath();
    context.ellipse(
      shadow.x,
      shadow.y,
      shadow.radiusX,
      shadow.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = DIRECTED_GROUND_SHADOW_COLOUR_V7;
    context.fill();
  }
  const at = galleryPiecePlacementV7(asset);
  context.drawImage(image, at.x, at.y, asset.width, asset.height);
  return { kind: "READY", factionArt: piece.factionArt };
}
