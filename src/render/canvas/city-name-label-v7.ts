import { TILE_HEIGHT, TILE_WIDTH } from "./geometry";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * The name plate under a city on the board (bead `pulp_wars-2yc.30`): a
 * small dark plate with the name in the board's label face and an edge in
 * the owner's colour. It hangs just below the city's cell, in the free top
 * strip of the cell underneath (a standard piece is bottom-aligned and
 * leaves that strip empty), so it covers neither the city, its population
 * pips, the capital crown nor a unit standing in the city.
 *
 * Every position is a function of the city's draw position, never of its
 * tile: a caller that moves the city sprite (a hop, a shake) passes the
 * moved centre and the plate moves with it.
 */
export interface CityDrawPositionV7 {
  /** The centre of the city's cell as drawn, in CSS px. */
  readonly x: number;
  readonly y: number;
}

export interface CityNameLabelLayoutV7 {
  /** False when the board is too small on screen for a legible name. */
  readonly visible: boolean;
  /** 0 to 1: the plate fades out as the board shrinks. */
  readonly alpha: number;
  /** Horizontal centre of the plate. */
  readonly centerX: number;
  /** Top edge of the plate. */
  readonly top: number;
  readonly height: number;
  readonly fontPx: number;
  readonly paddingX: number;
  readonly radius: number;
  readonly edgeWidth: number;
  /** The widest the plate may grow: one cell and a little. */
  readonly maxWidth: number;
}

/** Below this cell size on screen the name is hidden. */
export const CITY_NAME_HIDDEN_CELL_PX_V7 = 40;
/** From this cell size up the name is fully opaque. */
export const CITY_NAME_OPAQUE_CELL_PX_V7 = 52;
export const CITY_NAME_MIN_FONT_PX_V7 = 10;
export const CITY_NAME_MAX_FONT_PX_V7 = 15;

/**
 * Where the plate goes for a city drawn at `city`, at camera scale `zoom`
 * (CSS px per world unit; a cell is 128 world units). The type grows with
 * the board between 10 and 15 px, so it stays legible zoomed out and does
 * not balloon zoomed in.
 */
export function cityNameLabelLayoutV7(
  city: CityDrawPositionV7,
  zoom: number,
): CityNameLabelLayoutV7 {
  const cell = TILE_WIDTH * zoom;
  const fontPx = Math.max(
    CITY_NAME_MIN_FONT_PX_V7,
    Math.min(CITY_NAME_MAX_FONT_PX_V7, cell * 0.145),
  );
  const alpha = Math.max(
    0,
    Math.min(
      1,
      (cell - CITY_NAME_HIDDEN_CELL_PX_V7) /
        (CITY_NAME_OPAQUE_CELL_PX_V7 - CITY_NAME_HIDDEN_CELL_PX_V7),
    ),
  );
  const height = Math.round(fontPx * 1.36);
  return {
    visible: alpha > 0,
    alpha,
    centerX: city.x,
    top: city.y + (TILE_HEIGHT / 2) * zoom + Math.max(1, cell * 0.015),
    height,
    fontPx,
    paddingX: fontPx * 0.5,
    radius: height / 2,
    edgeWidth: Math.max(1.25, fontPx * 0.13),
    maxWidth: cell * 1.3,
  };
}

/** The label face: the interface's body face, heavy, as on the board's other labels. */
export function cityNameLabelFontV7(fontPx: number): string {
  return `800 ${fontPx}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
}

export const CITY_NAME_LABEL_COLOURS_V7 = Object.freeze({
  plate: "rgba(23, 37, 41, 0.86)",
  text: "#fff8df",
  highContrastPlate: "#000000",
  highContrastText: "#ffffff",
  /** The edge of a city whose owner colour is not known. */
  neutralEdge: "#f8f2df",
});

function plate(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(left + r, top);
  context.arcTo(left + width, top, left + width, top + height, r);
  context.arcTo(left + width, top + height, left, top + height, r);
  context.arcTo(left, top + height, left, top, r);
  context.arcTo(left, top, left + width, top, r);
  context.closePath();
}

/**
 * Draws a city's name plate. `city` is the city's draw position this frame.
 * Returns the plate's rectangle, or null when nothing was drawn.
 */
export function drawCityNameLabelV7(
  context: CanvasRenderingContext2D,
  city: CityDrawPositionV7,
  zoom: number,
  name: string,
  options: {
    readonly ownerColor?: string;
    readonly highContrast?: boolean;
    /** Multiplies the plate's own fade (the scene's alpha). */
    readonly alpha?: number;
  } = {},
): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} | null {
  const layout = cityNameLabelLayoutV7(city, zoom);
  if (!layout.visible || name === "") return null;
  const highContrast = options.highContrast ?? false;
  context.save();
  context.globalAlpha = layout.alpha * (options.alpha ?? 1);
  context.font = cityNameLabelFontV7(layout.fontPx);
  context.textAlign = "center";
  context.textBaseline = "middle";
  // A context without text metrics (a recording canvas) gets an estimate.
  const measured = context.measureText(name) as TextMetrics | undefined;
  const textWidth = measured?.width ?? name.length * layout.fontPx * 0.6;
  const width = Math.min(layout.maxWidth, textWidth + layout.paddingX * 2);
  const left = layout.centerX - width / 2;
  plate(context, left, layout.top, width, layout.height, layout.radius);
  context.fillStyle = highContrast
    ? CITY_NAME_LABEL_COLOURS_V7.highContrastPlate
    : CITY_NAME_LABEL_COLOURS_V7.plate;
  context.fill();
  context.lineWidth = layout.edgeWidth;
  context.strokeStyle =
    options.ownerColor ?? CITY_NAME_LABEL_COLOURS_V7.neutralEdge;
  context.stroke();
  context.fillStyle = highContrast
    ? CITY_NAME_LABEL_COLOURS_V7.highContrastText
    : CITY_NAME_LABEL_COLOURS_V7.text;
  context.fillText(
    name,
    layout.centerX,
    layout.top + layout.height / 2 + layout.fontPx * 0.04,
    width - layout.paddingX,
  );
  context.restore();
  return { left, top: layout.top, width, height: layout.height };
}
