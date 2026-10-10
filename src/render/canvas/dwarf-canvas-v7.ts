/**
 * Code-drawn Dwarf board cues (docs/product/RULESET_7_DWARVES.md section
 * 16.1, docs/art/factions/DWARF.md "Code-drawn pieces", bead
 * pulp_wars-78i.6): the gear badge over Human stand-in art (LEGACY and the
 * classic look), the Dig In earthwork (dwarfDigInMarkerV7, a sandbag wall
 * in front of the unit's feet and heaps of dug earth behind it, on the
 * unit's shadow anchor since bead pulp_wars-78i.9), the clockwork gear at the HP
 * bar's end, the mound for LEGACY and the classic look (no raster there),
 * the mound's surfacing chip, and the eruption ring round a Mole's eight
 * tiles (DWARF_MOUND_V7). The earthwork rasters come from the pure function
 * of chibi-direction-dwarf-presentation.ts and are built once per width and
 * cached (DwarfBoardArtV7). Sizes are world units (128 = one cell) scaled
 * by zoom unless a name says CSS px or master px.
 */

import {
  DWARF_DIG_IN_HEAP_RISE_V7,
  DWARF_DIG_IN_WALL_SHARE_V7,
  DWARF_MOUND_V7,
  DWARF_PALETTE_V7,
  dwarfDigInMarkerV7,
} from "../../assets/chibi-direction-dwarf-presentation";
import type { ChibiRasterEnvironmentV7 } from "./chibi-art-resolver-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
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

/** The cached Dig In earthwork rasters, one pair per wall width. */
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

/** A unit's ground shadow in CSS px (directedUnitShadowGeometryV7). */
export interface DigInGroundV7 {
  readonly centreX: number;
  readonly centreY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/**
 * The Dig In earthwork of a unit (bead pulp_wars-78i.9): `back` (drawn
 * before the sprite: heaps of dug earth) or `front` (after it: the sandbag
 * wall). `ground` is the unit's ground shadow in CSS px, from the measured
 * anchor the shadow and the ready ring use (unit-shadows-v7.ts), and
 * `pixelScale` the CSS px per master px of the drawn sprite. The wall is
 * DWARF_DIG_IN_WALL_SHARE_V7 of the shadow's width, centred on it, with its
 * foot on the shadow's front edge, so it covers the feet while the ready
 * ring's ends and front arc still show. Without the cached art (tests
 * without a canvas) a plain code-drawn wall and heaps stand in.
 */
export function drawDigInEarthworkV7(
  context: CanvasRenderingContext2D,
  art: DwarfBoardArtV7 | undefined,
  ground: DigInGroundV7,
  pixelScale: number,
  layer: "back" | "front",
): void {
  const masterWidth = Math.max(
    16,
    Math.round((2 * ground.radiusX * DWARF_DIG_IN_WALL_SHARE_V7) / pixelScale),
  );
  const pieces = art?.earthwork(masterWidth);
  const image = pieces === undefined ? null : pieces[layer];
  const width = masterWidth * pixelScale;
  const height = (pieces?.height ?? 10) * pixelScale;
  const left = Math.round(ground.centreX - width / 2);
  const top = Math.round(ground.centreY + ground.radiusY - height);
  context.save();
  if (image !== null && image !== undefined) {
    context.imageSmoothingEnabled = false;
    context.drawImage(image, left, top, width, height);
    context.restore();
    return;
  }
  // Code stand-in: two earth heaps behind, a low sandbag wall in front.
  context.lineJoin = "round";
  context.strokeStyle = DWARF_PALETTE_V7.outline;
  context.lineWidth = Math.max(1, pixelScale);
  if (layer === "back") {
    context.fillStyle = DWARF_PALETTE_V7.earth;
    const foot = top + height - DWARF_DIG_IN_HEAP_RISE_V7 * pixelScale;
    for (const cx of [left + 3 * pixelScale, left + width - 3 * pixelScale]) {
      context.beginPath();
      context.ellipse(cx, foot, 5 * pixelScale, 3 * pixelScale, 0, Math.PI, 0);
      context.closePath();
      context.fill();
      context.stroke();
    }
  } else {
    const wallTop = top + height * 0.3;
    context.fillStyle = DWARF_PALETTE_V7.sandbag;
    context.beginPath();
    context.roundRect(left, wallTop, width, top + height - wallTop, [
      3 * pixelScale,
      3 * pixelScale,
      pixelScale,
      pixelScale,
    ]);
    context.fill();
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

/**
 * Bead pulp_wars-78i.9: the rope from a seated Tunnel passenger to its
 * Mole (cell centres `from` and `to`, CSS px), sagging between their
 * lower bodies, with a hammer-head pip on the Mole's end of the rope.
 */
export function drawTunnelTetherV7(
  context: CanvasRenderingContext2D,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  zoom: number,
  highContrast = false,
): void {
  const lift = 18 * zoom;
  const ax = from.x;
  const ay = from.y + lift;
  const bx = to.x;
  const by = to.y + lift;
  const sag = 16 * zoom;
  const cx = (ax + bx) / 2;
  const cy = (ay + by) / 2 + sag;
  const rope = (): void => {
    context.beginPath();
    context.moveTo(ax, ay);
    context.quadraticCurveTo(cx, cy, bx, by);
  };
  context.save();
  context.lineCap = "round";
  rope();
  context.strokeStyle = DWARF_PALETTE_V7.outline;
  context.lineWidth = Math.max(2.5, 6 * zoom);
  context.stroke();
  rope();
  context.strokeStyle = highContrast ? "#ffffff" : DWARF_PALETTE_V7.sandbag;
  context.lineWidth = Math.max(1.5, 3.5 * zoom);
  context.stroke();
  // The twist of the rope.
  rope();
  context.strokeStyle = DWARF_PALETTE_V7.sandbagShade;
  context.lineWidth = Math.max(1, 2 * zoom);
  context.setLineDash([3 * zoom, 4 * zoom]);
  context.stroke();
  context.restore();
  // The pip: a hammer head on the Mole's end of the rope.
  const t = 0.8;
  const px = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx;
  const py = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
  drawPassengerPipV7(context, px, py, zoom, highContrast);
}

/** The passenger pip: a small hammer head on a leather disc at (x, y). */
export function drawPassengerPipV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast = false,
): void {
  const radius = Math.max(6, 11 * zoom);
  context.save();
  context.lineJoin = "round";
  context.fillStyle = highContrast ? "#000000" : DWARF_PALETTE_V7.leather;
  context.strokeStyle = highContrast ? "#ffffff" : DWARF_PALETTE_V7.copper;
  context.lineWidth = Math.max(1.2, radius * 0.18);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // The handle, then the iron head across its top.
  context.fillStyle = DWARF_PALETTE_V7.earthLight;
  context.fillRect(
    x - radius * 0.12,
    y - radius * 0.2,
    radius * 0.24,
    radius * 0.75,
  );
  context.fillStyle = highContrast ? "#ffffff" : DWARF_PALETTE_V7.ironRim;
  context.strokeStyle = DWARF_PALETTE_V7.outline;
  context.lineWidth = Math.max(0.8, radius * 0.1);
  context.beginPath();
  context.rect(
    x - radius * 0.55,
    y - radius * 0.55,
    radius * 1.1,
    radius * 0.45,
  );
  context.fill();
  context.stroke();
  context.restore();
}

/** The Barricade's timber (DWARF_PALETTE_V7 has no wood). */
const BARRICADE_WOOD_V7 = { light: "#b9844f", mid: "#8d5c34", dark: "#5a3820" };

/**
 * The Barricade's HP bar, in world units from the cell's centre: the unit
 * HP bar's place in the CHIBI look (CHIBI_OVERLAY_FRAME_V7.hpBar), a
 * vertical bar in the cell's left strip, with the HP as a number above it.
 */
export const BARRICADE_HP_BAR_V7 = {
  left: -63,
  top: -36,
  width: 10,
  height: 76,
} as const;

/**
 * Dwarf crowd control (`pulp_wars-w49.34`): a standing Barricade, drawn in
 * code in every look (no raster exists): a heap of earth, four sharpened
 * timber stakes bound by two riveted iron bands, the owner's pennant on
 * the right-hand stake, cracks once it is at half HP or less, and in the
 * cell's left strip a segmented HP bar (one segment per HP) with the HP
 * as a number. `x`, `y` are the cell's centre; sizes are world units (128
 * = one cell) times `zoom`.
 */
export function drawBarricadeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly hp: number;
    readonly maxHp: number;
    readonly ownerColor: string;
    readonly highContrast: boolean;
    /**
     * False leaves out the HP bar and number: the board draws them later,
     * over the target marks (`drawBarricadeHpV7`, bead pulp_wars-eu3r.9).
     */
    readonly withHp?: boolean;
  },
): void {
  // The structure is drawn a fifth larger than its master sizes, centred
  // a little right of the cell's centre, clear of the HP bar.
  const scale = 1.2;
  const ox = x + 6 * zoom;
  const z = (value: number): number => value * zoom * scale;
  const ink = options.highContrast ? "#ffffff" : DWARF_PALETTE_V7.outline;
  const line = Math.max(1, z(2.2));
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  // The heap of earth the stakes are driven into.
  context.fillStyle = DWARF_PALETTE_V7.earthDark;
  context.strokeStyle = ink;
  context.lineWidth = line;
  context.beginPath();
  context.ellipse(ox, y + z(16), z(48), z(12), 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = DWARF_PALETTE_V7.earth;
  context.beginPath();
  context.ellipse(ox - z(6), y + z(13), z(34), z(6), 0, 0, Math.PI * 2);
  context.fill();
  // Four sharpened stakes, alternately tall and short.
  const stakes = [-33, -11, 11, 33] as const;
  const halfWidth = 8.5;
  stakes.forEach((dx, index) => {
    const top = index % 2 === 0 ? -34 : -26;
    const left = ox + z(dx - halfWidth);
    const right = ox + z(dx + halfWidth);
    const foot = y + z(16);
    const shoulder = y + z(top + 10);
    context.beginPath();
    context.moveTo(left, foot);
    context.lineTo(left, shoulder);
    context.lineTo(ox + z(dx), y + z(top));
    context.lineTo(right, shoulder);
    context.lineTo(right, foot);
    context.closePath();
    context.fillStyle = BARRICADE_WOOD_V7.mid;
    context.fill();
    // The lit left face of the stake.
    context.save();
    context.clip();
    context.fillStyle = BARRICADE_WOOD_V7.light;
    context.fillRect(left, y + z(top), z(halfWidth * 0.8), foot - y - z(top));
    context.restore();
    context.strokeStyle = ink;
    context.lineWidth = line;
    context.stroke();
    // The grain.
    context.strokeStyle = BARRICADE_WOOD_V7.dark;
    context.lineWidth = Math.max(0.8, z(1.2));
    context.beginPath();
    context.moveTo(ox + z(dx + 3), shoulder + z(4));
    context.lineTo(ox + z(dx + 3), foot - z(6));
    context.stroke();
  });
  // Two iron bands with copper rivets where they cross a stake.
  for (const band of [-8, 5] as const) {
    const top = y + z(band);
    context.fillStyle = DWARF_PALETTE_V7.iron;
    context.strokeStyle = ink;
    context.lineWidth = line;
    context.beginPath();
    context.rect(ox - z(44), top, z(88), z(7));
    context.fill();
    context.stroke();
    context.strokeStyle = DWARF_PALETTE_V7.ironRim;
    context.lineWidth = Math.max(0.8, z(1.2));
    context.beginPath();
    context.moveTo(ox - z(42), top + z(1.5));
    context.lineTo(ox + z(42), top + z(1.5));
    context.stroke();
    context.fillStyle = options.highContrast
      ? "#ffffff"
      : DWARF_PALETTE_V7.copper;
    for (const dx of stakes) {
      context.beginPath();
      context.arc(
        ox + z(dx),
        top + z(3.5),
        Math.max(1, z(2.2)),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  // Cracks once half its HP is gone.
  const share = Math.max(0, Math.min(1, options.hp / options.maxHp));
  if (share <= 0.5) {
    context.strokeStyle = ink;
    context.lineWidth = Math.max(1, z(1.8));
    for (const [dx, from] of [
      [-11, -20],
      [33, -26],
      ...(share <= 0.3 ? ([[-33, -24]] as const) : []),
    ] as const) {
      context.beginPath();
      context.moveTo(ox + z(dx - 3), y + z(from));
      context.lineTo(ox + z(dx + 2), y + z(from + 6));
      context.lineTo(ox + z(dx - 2), y + z(from + 11));
      context.lineTo(ox + z(dx + 3), y + z(from + 17));
      context.stroke();
    }
  }
  // The owner's pennant on the right-hand stake.
  const poleX = ox + z(33);
  const poleTop = y - z(50);
  context.strokeStyle = ink;
  context.lineWidth = Math.max(1, z(3));
  context.beginPath();
  context.moveTo(poleX, y - z(34));
  context.lineTo(poleX, poleTop);
  context.stroke();
  context.fillStyle = options.ownerColor;
  context.lineWidth = line;
  context.beginPath();
  context.moveTo(poleX, poleTop);
  context.lineTo(poleX - z(20), poleTop + z(6));
  context.lineTo(poleX, poleTop + z(12));
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
  if (options.withHp !== false) drawBarricadeHpV7(context, x, y, zoom, options);
}

/**
 * A Barricade's HP: a vertical segmented bar in the cell's left strip,
 * filling from the bottom, and its number above it. The board draws it
 * after the target marks, so an attack bracket's corner never hides the
 * number (bead pulp_wars-eu3r.9).
 */
export function drawBarricadeHpV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly hp: number;
    readonly maxHp: number;
    readonly highContrast: boolean;
  },
): void {
  const share = Math.max(0, Math.min(1, options.hp / options.maxHp));
  context.save();
  const bar = BARRICADE_HP_BAR_V7;
  const barLeft = x + bar.left * zoom;
  const barTop = y + bar.top * zoom;
  const barWidth = bar.width * zoom;
  const barHeight = bar.height * zoom;
  const inset = Math.max(1, zoom);
  context.fillStyle = "#101718";
  context.fillRect(barLeft, barTop, barWidth, barHeight);
  const inner = (barHeight - 2 * inset) * share;
  context.fillStyle = share > 0.3 ? "#65d889" : "#f2a13a";
  context.fillRect(
    barLeft + inset,
    barTop + barHeight - inset - inner,
    barWidth - 2 * inset,
    inner,
  );
  context.strokeStyle = "#101718";
  context.lineWidth = Math.max(0.6, zoom);
  for (let segment = 1; segment < options.maxHp; segment += 1) {
    const sy =
      barTop + inset + ((barHeight - 2 * inset) * segment) / options.maxHp;
    context.beginPath();
    context.moveTo(barLeft + inset, sy);
    context.lineTo(barLeft + barWidth - inset, sy);
    context.stroke();
  }
  const font = Math.max(10, 17 * zoom);
  context.font = `800 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.lineWidth = Math.max(2.5, 4 * zoom);
  context.strokeStyle = "#101718";
  const number = String(options.hp);
  const numberX = barLeft + barWidth / 2 + 2 * zoom;
  const numberY = barTop - 4 * zoom;
  context.strokeText(number, numberX, numberY);
  context.fillStyle = options.highContrast ? "#ffffff" : "#fff8df";
  context.fillText(number, numberX, numberY);
  context.restore();
}
