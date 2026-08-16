import type { CityState, PlayerUnitView } from "../../engine/index";
import type { Point } from "./geometry";

export interface DrawAssetOptions {
  readonly center: Point;
  readonly zoom: number;
  readonly ownerColor: string | null;
  readonly variant: number;
}

/**
 * Swappable renderer boundary for ane.10. Asset implementations receive the
 * documented untrimmed-canvas ground anchor as `center`; image bindings can be
 * installed without changing projection, picking, simulation, or commands.
 */
export interface BoardAssetBindings {
  drawGrass(context: CanvasRenderingContext2D, options: DrawAssetOptions): void;
  drawMountain(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
  ): void;
  drawOre(context: CanvasRenderingContext2D, options: DrawAssetOptions): void;
  drawFruit(context: CanvasRenderingContext2D, options: DrawAssetOptions): void;
  drawAnimal(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
  ): void;
  drawMine(context: CanvasRenderingContext2D, options: DrawAssetOptions): void;
  drawLumberMill(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
  ): void;
  drawForest(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
  ): void;
  drawVillage(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
  ): void;
  drawCityBack(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
    city: CityState,
  ): void;
  drawCityFront(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
    city: CityState,
  ): void;
  drawUnit(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
    unit: PlayerUnitView,
  ): void;
  drawUnitOwnerCue(
    context: CanvasRenderingContext2D,
    options: DrawAssetOptions,
    unit: PlayerUnitView,
  ): void;
}

const INK = "#19282a";

export const CODE_NATIVE_PLACEHOLDER_ASSETS: BoardAssetBindings = {
  drawGrass(context, options): void {
    const { center, zoom, variant } = options;
    diamond(
      context,
      center,
      128 * zoom,
      74 * zoom,
      "#79ad61",
      "#28483d",
      2 * zoom,
    );
    context.save();
    context.globalAlpha = 0.18;
    context.fillStyle = variant % 2 === 0 ? "#d4df79" : "#4e8d55";
    context.beginPath();
    context.ellipse(
      center.x + (variant - 1.5) * 11 * zoom,
      center.y + 7 * zoom,
      16 * zoom,
      5 * zoom,
      -0.25,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  },

  drawMountain(context, options): void {
    const { center, zoom, variant } = options;
    const shift = (variant - 1.5) * 3 * zoom;
    context.save();
    context.lineJoin = "round";
    context.lineWidth = 5 * zoom;
    context.strokeStyle = INK;
    context.fillStyle = "#7f8791";
    context.beginPath();
    context.moveTo(center.x - 49 * zoom, center.y + 9 * zoom);
    context.lineTo(center.x - 7 * zoom + shift, center.y - 93 * zoom);
    context.lineTo(center.x + 51 * zoom, center.y + 10 * zoom);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#b9c1c4";
    context.beginPath();
    context.moveTo(center.x - 7 * zoom + shift, center.y - 93 * zoom);
    context.lineTo(center.x - 24 * zoom, center.y - 48 * zoom);
    context.lineTo(center.x - 3 * zoom, center.y - 59 * zoom);
    context.lineTo(center.x + 14 * zoom, center.y - 44 * zoom);
    context.closePath();
    context.fill();
    context.restore();
  },

  drawOre(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.fillStyle = "#ffd951";
    context.strokeStyle = INK;
    context.lineWidth = 3 * zoom;
    for (const [dx, dy] of [
      [-24, -13],
      [-10, -21],
      [5, -12],
    ] as const) {
      context.beginPath();
      context.moveTo(center.x + dx * zoom, center.y + dy * zoom);
      context.lineTo(center.x + (dx + 7) * zoom, center.y + (dy - 10) * zoom);
      context.lineTo(center.x + (dx + 14) * zoom, center.y + dy * zoom);
      context.lineTo(center.x + (dx + 7) * zoom, center.y + (dy + 6) * zoom);
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.restore();
  },

  // Loading/error fallback for the accepted PixelLab Fruit world marker.
  drawFruit(context, options): void {
    const { center, zoom, variant } = options;
    context.save();
    context.lineJoin = "round";
    context.lineWidth = 3 * zoom;
    context.strokeStyle = INK;
    context.fillStyle = "#3d8d49";
    context.beginPath();
    context.ellipse(
      center.x + (variant % 2 === 0 ? 4 : -4) * zoom,
      center.y - 22 * zoom,
      11 * zoom,
      6 * zoom,
      -0.45,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    for (const [dx, dy] of [
      [-13, -10],
      [0, -15],
      [13, -9],
    ] as const) {
      context.fillStyle = "#f05a4f";
      context.beginPath();
      context.arc(
        center.x + dx * zoom,
        center.y + dy * zoom,
        9 * zoom,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.strokeStyle = "#315a35";
    context.beginPath();
    context.moveTo(center.x, center.y - 15 * zoom);
    context.lineTo(center.x + 2 * zoom, center.y - 28 * zoom);
    context.stroke();
    context.restore();
  },

  drawAnimal(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.translate(center.x, center.y);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = 3 * zoom;
    context.strokeStyle = INK;
    context.fillStyle = "#b67b4d";
    context.beginPath();
    context.ellipse(0, -22 * zoom, 25 * zoom, 15 * zoom, 0.12, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.ellipse(
      23 * zoom,
      -19 * zoom,
      13 * zoom,
      10 * zoom,
      0.2,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    for (const x of [-14, 10] as const) {
      context.beginPath();
      context.moveTo(x * zoom, -12 * zoom);
      context.lineTo((x - 2) * zoom, 0);
      context.stroke();
    }
    context.fillStyle = "#edf0e8";
    context.beginPath();
    context.moveTo(30 * zoom, -17 * zoom);
    context.lineTo(38 * zoom, -12 * zoom);
    context.lineTo(30 * zoom, -10 * zoom);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  },

  drawMine(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.strokeStyle = INK;
    context.lineWidth = 5 * zoom;
    context.fillStyle = "#5e4640";
    context.fillRect(
      center.x - 30 * zoom,
      center.y - 31 * zoom,
      60 * zoom,
      35 * zoom,
    );
    context.strokeRect(
      center.x - 30 * zoom,
      center.y - 31 * zoom,
      60 * zoom,
      35 * zoom,
    );
    context.fillStyle = "#171a20";
    context.beginPath();
    context.arc(center.x, center.y - 11 * zoom, 13 * zoom, Math.PI, 0);
    context.lineTo(center.x + 13 * zoom, center.y + 3 * zoom);
    context.lineTo(center.x - 13 * zoom, center.y + 3 * zoom);
    context.closePath();
    context.fill();
    context.restore();
  },

  drawLumberMill(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.translate(center.x, center.y);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = INK;
    context.lineWidth = 4 * zoom;
    context.fillStyle = "#9a6644";
    context.fillRect(-33 * zoom, -31 * zoom, 66 * zoom, 25 * zoom);
    context.strokeRect(-33 * zoom, -31 * zoom, 66 * zoom, 25 * zoom);
    context.fillStyle = "#d8d2bd";
    context.beginPath();
    context.arc(6 * zoom, -33 * zoom, 18 * zoom, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      context.beginPath();
      context.moveTo(6 * zoom, -33 * zoom);
      context.lineTo(
        (6 + Math.cos(angle) * 17) * zoom,
        (-33 + Math.sin(angle) * 17) * zoom,
      );
      context.stroke();
    }
    context.restore();
  },

  drawForest(context, options): void {
    const { center, zoom, variant } = options;
    context.save();
    context.translate(center.x, center.y);
    context.lineJoin = "round";
    context.strokeStyle = INK;
    context.lineWidth = 4 * zoom;
    const offsets = [
      [-38 + (variant % 2) * 4, 7, 19],
      [2, -25, 22],
      [38 - (variant % 3) * 3, 7, 18],
    ] as const;
    for (const [x, y, radius] of offsets) {
      context.fillStyle = "#76533d";
      context.fillRect((x - 4) * zoom, (y - 39) * zoom, 8 * zoom, 39 * zoom);
      context.strokeRect((x - 4) * zoom, (y - 39) * zoom, 8 * zoom, 39 * zoom);
      context.fillStyle = variant % 2 === 0 ? "#4f8f54" : "#578d4d";
      context.beginPath();
      context.arc(x * zoom, (y - 51) * zoom, radius * zoom, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  },

  drawVillage(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.strokeStyle = INK;
    context.lineWidth = 4 * zoom;
    context.fillStyle = "#f2cb72";
    context.fillRect(
      center.x - 24 * zoom,
      center.y - 35 * zoom,
      48 * zoom,
      35 * zoom,
    );
    context.strokeRect(
      center.x - 24 * zoom,
      center.y - 35 * zoom,
      48 * zoom,
      35 * zoom,
    );
    context.fillStyle = "#c85b4b";
    context.beginPath();
    context.moveTo(center.x - 32 * zoom, center.y - 34 * zoom);
    context.lineTo(center.x, center.y - 61 * zoom);
    context.lineTo(center.x + 32 * zoom, center.y - 34 * zoom);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  },

  drawCityBack(context, options, city): void {
    const { center, zoom, ownerColor } = options;
    const artLevel = Math.min(3, city.level);
    const width = (50 + artLevel * 13) * zoom;
    const height = (42 + artLevel * 17) * zoom;
    context.save();
    context.fillStyle = ownerColor ?? "#aab0b0";
    context.strokeStyle = INK;
    context.lineWidth = 5 * zoom;
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(center.x - width / 2, center.y);
    context.lineTo(center.x - width / 2, center.y - height);
    context.lineTo(center.x, center.y - height - 24 * zoom);
    context.lineTo(center.x + width / 2, center.y - height);
    context.lineTo(center.x + width / 2, center.y);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#f5db82";
    for (let index = 0; index < artLevel; index += 1)
      context.fillRect(
        center.x - (artLevel - 1) * 12 * zoom + index * 24 * zoom - 6 * zoom,
        center.y - height * 0.55,
        12 * zoom,
        15 * zoom,
      );
    context.restore();
  },

  drawCityFront(context, options): void {
    const { center, zoom } = options;
    context.save();
    context.strokeStyle = INK;
    context.lineWidth = 4 * zoom;
    context.fillStyle = "#55494a";
    context.fillRect(
      center.x - 32 * zoom,
      center.y - 8 * zoom,
      64 * zoom,
      10 * zoom,
    );
    context.strokeRect(
      center.x - 32 * zoom,
      center.y - 8 * zoom,
      64 * zoom,
      10 * zoom,
    );
    context.restore();
  },

  drawUnit(context, options, unit): void {
    const { center, zoom } = options;
    if (unit.type === "CATAPULT") {
      drawTemporaryCatapult(context, center, zoom);
      return;
    }
    const body = "#bfc8ca";
    context.save();
    context.translate(center.x, center.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = INK;
    context.lineWidth = 5 * zoom;
    context.fillStyle = body;
    context.beginPath();
    context.ellipse(0, -39 * zoom, 24 * zoom, 31 * zoom, 0.12, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#f0c38c";
    context.beginPath();
    context.arc(0, -72 * zoom, 18 * zoom, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    drawUnitSignature(context, unit.type, zoom);
    context.beginPath();
    context.moveTo(-11 * zoom, -15 * zoom);
    context.lineTo(-15 * zoom, 0);
    context.moveTo(11 * zoom, -15 * zoom);
    context.lineTo(15 * zoom, 0);
    context.stroke();
    context.restore();
  },

  drawUnitOwnerCue(context, options): void {
    drawOwnerCue(context, options);
  },
};

function drawOwnerCue(
  context: CanvasRenderingContext2D,
  options: DrawAssetOptions,
): void {
  if (options.ownerColor === null) return;
  const { center, zoom, ownerColor } = options;
  context.save();
  context.fillStyle = ownerColor;
  context.strokeStyle = INK;
  context.lineWidth = Math.max(1, 1.5 * zoom);
  context.beginPath();
  context.moveTo(center.x - 29 * zoom, center.y - 7 * zoom);
  context.lineTo(center.x - 20 * zoom, center.y - 12 * zoom);
  context.lineTo(center.x - 11 * zoom, center.y - 7 * zoom);
  context.lineTo(center.x - 20 * zoom, center.y - 2 * zoom);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawUnitSignature(
  context: CanvasRenderingContext2D,
  type: PlayerUnitView["type"],
  zoom: number,
): void {
  context.fillStyle = "#edf0e8";
  if (type === "WARRIOR") {
    context.beginPath();
    context.moveTo(19 * zoom, -60 * zoom);
    context.lineTo(45 * zoom, -92 * zoom);
    context.lineTo(50 * zoom, -87 * zoom);
    context.lineTo(26 * zoom, -52 * zoom);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (type === "ARCHER") {
    context.beginPath();
    context.arc(25 * zoom, -48 * zoom, 31 * zoom, -1.25, 1.25);
    context.stroke();
    context.beginPath();
    context.moveTo(35 * zoom, -77 * zoom);
    context.lineTo(35 * zoom, -19 * zoom);
    context.stroke();
  } else if (type === "DEFENDER") {
    context.fillStyle = "#708ba0";
    context.beginPath();
    context.moveTo(10 * zoom, -63 * zoom);
    context.lineTo(45 * zoom, -55 * zoom);
    context.lineTo(39 * zoom, -19 * zoom);
    context.lineTo(15 * zoom, -13 * zoom);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (type === "RIDER") {
    context.fillStyle = "#dfb26f";
    context.beginPath();
    context.ellipse(
      8 * zoom,
      -25 * zoom,
      37 * zoom,
      20 * zoom,
      0.18,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(31 * zoom, -35 * zoom);
    context.lineTo(45 * zoom, -51 * zoom);
    context.stroke();
  }
}

/** Temporary, intentionally code-native siege silhouette pending approved art. */
function drawTemporaryCatapult(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
): void {
  context.save();
  context.translate(center.x, center.y);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = INK;
  context.lineWidth = 5 * zoom;
  context.fillStyle = "#a7784f";
  context.fillRect(-35 * zoom, -40 * zoom, 70 * zoom, 25 * zoom);
  context.strokeRect(-35 * zoom, -40 * zoom, 70 * zoom, 25 * zoom);
  for (const x of [-24, 24] as const) {
    context.beginPath();
    context.arc(x * zoom, -10 * zoom, 13 * zoom, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.beginPath();
  context.moveTo(-17 * zoom, -43 * zoom);
  context.lineTo(29 * zoom, -91 * zoom);
  context.lineTo(36 * zoom, -84 * zoom);
  context.lineTo(-6 * zoom, -38 * zoom);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#edf0e8";
  context.beginPath();
  context.arc(34 * zoom, -92 * zoom, 9 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function diamond(
  context: CanvasRenderingContext2D,
  center: Point,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  lineWidth: number,
): void {
  context.save();
  context.beginPath();
  context.moveTo(center.x, center.y - height / 2);
  context.lineTo(center.x + width / 2, center.y);
  context.lineTo(center.x, center.y + height / 2);
  context.lineTo(center.x - width / 2, center.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}
