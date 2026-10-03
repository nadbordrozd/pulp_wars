/**
 * Code-drawn Dwarf board cues (docs/product/RULESET_7_DWARVES.md section
 * 16.1, docs/art/factions/DWARF.md "Code-drawn pieces", bead
 * pulp_wars-78i.6): the gear badge over Human stand-in art (LEGACY and the
 * classic look), the Dig In earthwork (dwarfDigInMarkerV7, a bank of earth
 * behind the unit and sandbags in front of it), the clockwork gear at the HP
 * bar's end, the mound for LEGACY and the classic look (no raster there),
 * the mound's surfacing chip, and the eruption ring round a Mole's eight
 * tiles (DWARF_MOUND_V7). The earthwork rasters come from the pure function
 * of chibi-direction-dwarf-presentation.ts and are built once per width and
 * cached (DwarfBoardArtV7). Sizes are world units (128 = one cell) scaled
 * by zoom unless a name says CSS px or master px.
 */

import {
  DWARF_MOUND_V7,
  DWARF_PALETTE_V7,
  dwarfDigInMarkerV7,
} from "../../assets/chibi-direction-dwarf-presentation";
import type { ChibiRasterEnvironmentV7 } from "./chibi-art-resolver-v7";
import { UNDEAD_BADGE_FRAME_V7 } from "./undead-canvas-v7";

/** The Dwarf badge sits in the Undead badge's corner, like every faction's. */
export const DWARF_BADGE_FRAME_V7 = UNDEAD_BADGE_FRAME_V7;

/** The mound's surfacing chip: right of the heap's top, like the Egg's. */
export const MOUND_CHIP_FRAME_V7 = {
  legacy: { cx: 31, cy: 4, radius: 12 },
  chibi: { cx: 38, cy: 2, radius: 13 },
} as const;

/** Smallest chip radius in CSS px. */
export const MOUND_CHIP_MIN_RADIUS_CSS_PX_V7 = 7;

const INK = "#171722";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A cog of `teeth` teeth centred on (cx, cy), filled and outlined. */
function cogPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  teeth = 8,
): void {
  context.beginPath();
  const inner = radius * 0.74;
  for (let index = 0; index < teeth * 2; index += 1) {
    const r = index % 2 === 0 ? radius : inner;
    const from = ((index - 0.32) / (teeth * 2)) * Math.PI * 2;
    const to = ((index + 0.32) / (teeth * 2)) * Math.PI * 2;
    const ax = cx + Math.cos(from) * r;
    const ay = cy + Math.sin(from) * r;
    if (index === 0) context.moveTo(ax, ay);
    else context.lineTo(ax, ay);
    context.lineTo(cx + Math.cos(to) * r, cy + Math.sin(to) * r);
  }
  context.closePath();
}

/**
 * The Dwarf faction cue over Human stand-in art: a copper cog with a soot
 * hub on a dark leather disc (the hammer-and-cog emblem's cog). Copper and
 * leather are off every owner colour; the cog shares no shape with the
 * other factions' badges.
 */
export function drawDwarfBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? DWARF_BADGE_FRAME_V7.chibi
    : DWARF_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  context.save();
  context.fillStyle = DWARF_PALETTE_V7.leather;
  context.strokeStyle = DWARF_PALETTE_V7.ironRim;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  drawClockworkGearV7(context, cx, cy, size * 0.34);
  context.restore();
}

/**
 * The clockwork glyph (DWARF.md "Clockwork glyph"): a copper cog with a
 * soot hub and a dark outline, `radius` CSS px.
 */
export function drawClockworkGearV7(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  highContrast = false,
): void {
  context.save();
  context.lineJoin = "round";
  cogPath(context, cx, cy, radius);
  context.fillStyle = highContrast ? "#ffffff" : DWARF_PALETTE_V7.copper;
  context.fill();
  context.strokeStyle = DWARF_PALETTE_V7.outline;
  context.lineWidth = Math.max(0.8, radius * 0.18);
  context.stroke();
  context.fillStyle = DWARF_PALETTE_V7.iron;
  context.beginPath();
  context.arc(cx, cy, radius * 0.36, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** The cached Dig In earthwork rasters, one pair per ring width. */
export interface DwarfBoardArtV7 {
  /** The two layers of the earthwork of `width` master px, or null. */
  earthwork(width: number): {
    readonly back: CanvasImageSource | null;
    readonly front: CanvasImageSource | null;
    readonly width: number;
    readonly height: number;
  };
}

export function createDwarfBoardArtV7(
  environment: ChibiRasterEnvironmentV7,
): DwarfBoardArtV7 {
  const cache = new Map<number, ReturnType<DwarfBoardArtV7["earthwork"]>>();
  return {
    earthwork(width) {
      const cached = cache.get(width);
      if (cached !== undefined) return cached;
      const marker = dwarfDigInMarkerV7(width);
      const result = {
        back: environment.createSurface(
          marker.back.data,
          marker.back.width,
          marker.back.height,
        ),
        front: environment.createSurface(
          marker.front.data,
          marker.front.width,
          marker.front.height,
        ),
        width,
        height: marker.height,
      };
      cache.set(width, result);
      return result;
    },
  };
}

/**
 * The Dig In earthwork round a unit: `back` (drawn before the sprite) or
 * `front` (after it). `rect` is the sprite rectangle, `masterScale` CSS px
 * per master px; the ring is the sprite's width minus 8 master px wide and
 * sits on its foot line (1 master px above the canvas bottom), as in the
 * art review. Without the cached art (tests without a canvas) a plain
 * code-drawn bank and wall stand in.
 */
export function drawDigInEarthworkV7(
  context: CanvasRenderingContext2D,
  art: DwarfBoardArtV7 | undefined,
  rect: Rect,
  masterScale: number,
  layer: "back" | "front",
): void {
  const masterWidth = Math.max(16, Math.round(rect.width / masterScale) - 8);
  const footFromBottom = 1;
  const pieces = art?.earthwork(masterWidth);
  const image = pieces === undefined ? null : pieces[layer];
  const width = masterWidth * masterScale;
  const height =
    (pieces?.height ?? Math.round(masterWidth * 0.38) * 2 + 9) * masterScale;
  const left = rect.x + (rect.width - width) / 2;
  const top = rect.y + rect.height - height - footFromBottom * masterScale;
  context.save();
  if (image !== null && image !== undefined) {
    context.imageSmoothingEnabled = false;
    context.drawImage(image, left, top, width, height);
    context.restore();
    return;
  }
  // Code stand-in: an earth arc behind, a sandbag arc in front.
  const cx = left + width / 2;
  const cy = top + height * 0.55;
  context.lineCap = "round";
  if (layer === "back") {
    context.strokeStyle = DWARF_PALETTE_V7.earth;
    context.lineWidth = Math.max(1.5, 3 * masterScale);
    context.beginPath();
    context.ellipse(cx, cy, width / 2 - 2, height * 0.3, 0, Math.PI, 0);
    context.stroke();
  } else {
    context.strokeStyle = DWARF_PALETTE_V7.outline;
    context.lineWidth = Math.max(2.5, 6 * masterScale);
    context.beginPath();
    context.ellipse(cx, cy, width / 2 - 2, height * 0.3, 0, 0, Math.PI);
    context.stroke();
    context.strokeStyle = DWARF_PALETTE_V7.sandbag;
    context.lineWidth = Math.max(1.5, 4 * masterScale);
    context.stroke();
  }
  context.restore();
}

/**
 * The mound in LEGACY and the classic look (no raster there; the live look
 * draws `UNIT:DWARF:MOUND` or `MOUND_RIDER`): a heap of dark earth with a
 * copper drill tip, and for a rider a hammer head beside it, centred on the
 * cell's lower half.
 */
export function drawCodeMoundV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: { readonly rider: boolean; readonly highContrast: boolean },
): void {
  const { earthDark, earth, earthLight, copper, copperShade, iron, ironRim } =
    DWARF_PALETTE_V7;
  const cx = x;
  // The heap ends above the legacy HP bar's row (y + 25).
  const base = y + 21 * zoom;
  const rx = 32 * zoom;
  const ry = 24 * zoom;
  context.save();
  context.lineJoin = "round";
  context.lineWidth = Math.max(1, 2.4 * zoom);
  context.strokeStyle = options.highContrast ? "#ffffff" : INK;
  // The heap.
  context.fillStyle = earthDark;
  context.beginPath();
  context.ellipse(cx, base, rx, ry, 0, Math.PI, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = earth;
  context.beginPath();
  context.ellipse(
    cx - 4 * zoom,
    base - 2 * zoom,
    rx * 0.66,
    ry * 0.7,
    0,
    Math.PI,
    0,
  );
  context.closePath();
  context.fill();
  context.fillStyle = earthLight;
  for (const [dx, dy] of [
    [-18, -12],
    [10, -18],
    [20, -6],
  ] as const) {
    context.beginPath();
    context.arc(cx + dx * zoom, base + dy * zoom, 2.6 * zoom, 0, Math.PI * 2);
    context.fill();
  }
  // The drill tip breaking through.
  const tipX = cx + (options.rider ? -8 : 0) * zoom;
  const tipTop = base - ry - 16 * zoom;
  context.fillStyle = copper;
  context.beginPath();
  context.moveTo(tipX, tipTop);
  context.lineTo(tipX + 10 * zoom, base - ry + 6 * zoom);
  context.lineTo(tipX - 10 * zoom, base - ry + 6 * zoom);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = copperShade;
  context.lineWidth = Math.max(0.8, 1.6 * zoom);
  for (const share of [0.45, 0.7]) {
    const yy = tipTop + (base - ry + 6 * zoom - tipTop) * share;
    const half = 10 * zoom * share;
    context.beginPath();
    context.moveTo(tipX - half, yy);
    context.lineTo(tipX + half, yy);
    context.stroke();
  }
  if (options.rider) {
    // The iron head of a war hammer beside the drill.
    const hx = cx + 16 * zoom;
    const hy = base - ry + 2 * zoom;
    context.strokeStyle = options.highContrast ? "#ffffff" : INK;
    context.lineWidth = Math.max(1, 2.4 * zoom);
    context.fillStyle = earthLight;
    context.fillRect(hx - 1.5 * zoom, hy - 6 * zoom, 3 * zoom, 16 * zoom);
    context.fillStyle = iron;
    context.beginPath();
    context.rect(hx - 9 * zoom, hy - 14 * zoom, 18 * zoom, 9 * zoom);
    context.fill();
    context.stroke();
    context.strokeStyle = ironRim;
    context.lineWidth = Math.max(0.8, 1.2 * zoom);
    context.beginPath();
    context.moveTo(hx - 8 * zoom, hy - 13 * zoom);
    context.lineTo(hx + 8 * zoom, hy - 13 * zoom);
    context.stroke();
  }
  context.restore();
}

/**
 * The mound's surfacing chip: a dark earth disc with a light rim and an
 * upward arrow out of a ground line ("surfaces at the start of its owner's
 * next turn; nothing can touch it until then").
 */
export function drawMoundChipV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: { readonly chibi: boolean; readonly highContrast: boolean },
): void {
  const frame = options.chibi
    ? MOUND_CHIP_FRAME_V7.chibi
    : MOUND_CHIP_FRAME_V7.legacy;
  const radius = Math.max(MOUND_CHIP_MIN_RADIUS_CSS_PX_V7, frame.radius * zoom);
  const cx = x + frame.cx * zoom;
  const cy = y + frame.cy * zoom;
  context.save();
  context.fillStyle = options.highContrast
    ? "#000000"
    : DWARF_PALETTE_V7.earthDark;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#000000";
  context.lineWidth = Math.max(2, radius * 0.3);
  context.stroke();
  context.strokeStyle = options.highContrast
    ? "#ffffff"
    : DWARF_PALETTE_V7.earthLight;
  context.lineWidth = Math.max(1.2, radius * 0.18);
  context.stroke();
  context.strokeStyle = options.highContrast
    ? "#ffffff"
    : DWARF_PALETTE_V7.steam;
  context.lineWidth = Math.max(1.2, radius * 0.2);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(cx - radius * 0.5, cy + radius * 0.45);
  context.lineTo(cx + radius * 0.5, cy + radius * 0.45);
  context.moveTo(cx, cy + radius * 0.3);
  context.lineTo(cx, cy - radius * 0.5);
  context.moveTo(cx - radius * 0.35, cy - radius * 0.18);
  context.lineTo(cx, cy - radius * 0.52);
  context.lineTo(cx + radius * 0.35, cy - radius * 0.18);
  context.stroke();
  context.restore();
}

/**
 * The eruption ring (DWARF_MOUND_V7.eruptionRing): a dashed earth-light
 * outline round the Mole's eight tiles (the 3 x 3 block about `centre`),
 * inset 3 master px, with rounded corners. `cell` is one cell in CSS px.
 */
export function drawEruptionRingV7(
  context: CanvasRenderingContext2D,
  centre: { readonly x: number; readonly y: number },
  cell: number,
  highContrast = false,
): void {
  const ring = DWARF_MOUND_V7.eruptionRing;
  const scale = cell / 80;
  const inset = ring.inset * scale;
  const left = centre.x - cell * 1.5 + inset;
  const top = centre.y - cell * 1.5 + inset;
  const size = cell * 3 - inset * 2;
  const radius = ring.cornerRadius * scale;
  context.save();
  context.lineJoin = "round";
  const path = (): void => {
    context.beginPath();
    context.moveTo(left + radius, top);
    context.arcTo(left + size, top, left + size, top + size, radius);
    context.arcTo(left + size, top + size, left, top + size, radius);
    context.arcTo(left, top + size, left, top, radius);
    context.arcTo(left, top, left + size, top, radius);
    context.closePath();
  };
  // A dark casing under the dashes keeps the line on Grass and Snow alike.
  path();
  context.globalAlpha *= 0.5;
  context.strokeStyle = DWARF_PALETTE_V7.outline;
  context.lineWidth = (ring.width + 2) * scale;
  context.stroke();
  context.globalAlpha /= 0.5;
  path();
  context.globalAlpha *= highContrast ? 1 : ring.alpha;
  context.strokeStyle = highContrast ? "#ffffff" : ring.colour;
  context.lineWidth = ring.width * scale;
  context.setLineDash(ring.dash.map((value) => value * scale));
  context.stroke();
  context.restore();
}
