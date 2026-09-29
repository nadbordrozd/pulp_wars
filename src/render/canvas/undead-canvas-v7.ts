/**
 * Code-native revision-13 Undead placeholders (spec section 10.2): the Grave
 * marker, the Undead faction badge drawn over a Human sprite, and the ability
 * preview overlays. Sizes are world units (128 = one cell) scaled by zoom, so
 * both art sets share them.
 */

export type AbilityPreviewStyleV7 = "WAIL" | "RAISE" | "DEVOUR" | "SPLASH";

/** Legacy and CHIBI Undead badge frames, relative to the cell centre. */
export const UNDEAD_BADGE_FRAME_V7 = {
  legacy: { left: 12, top: 1, size: 23 },
  chibi: { left: -63, top: -63, size: 25 },
} as const;

const BONE = "#efe8cf";
const BADGE_FILL = "#231a2c";

/**
 * A grey headstone with an engraved cross on a brown mound. It is drawn
 * below units and above terrain, resources and improvements, and shares no
 * colour or shape with treasure chests or resources.
 */
export function drawGraveMarkerV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  highContrast: boolean,
): void {
  const z = (value: number): number => value * zoom;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = highContrast ? "#000000" : "#5a4636";
  context.strokeStyle = highContrast ? "#ffffff" : "#221a14";
  context.lineWidth = Math.max(1, z(2.5));
  context.beginPath();
  context.ellipse(x, y + z(30), z(34), z(11), 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = highContrast ? "#ffffff" : "#b8bcb5";
  context.strokeStyle = highContrast ? "#000000" : "#24282a";
  context.lineWidth = Math.max(1, z(3));
  context.beginPath();
  context.moveTo(x - z(17), y + z(30));
  context.lineTo(x - z(17), y - z(8));
  context.arc(x, y - z(8), z(17), Math.PI, 0);
  context.lineTo(x + z(17), y + z(30));
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = highContrast ? "#000000" : "#4a5054";
  context.lineWidth = Math.max(1, z(3.5));
  context.beginPath();
  context.moveTo(x, y - z(15));
  context.lineTo(x, y + z(13));
  context.moveTo(x - z(8), y - z(5));
  context.lineTo(x + z(8), y - z(5));
  context.stroke();
  context.restore();
}

/**
 * The Undead faction cue: a bone-white skull on a near-black disc with a
 * bone outline. Its colours are distinct from every owner colour, and the
 * owner seat badge stays on the opposite corner.
 */
export function drawUndeadBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  chibi: boolean,
): void {
  const frame = chibi
    ? UNDEAD_BADGE_FRAME_V7.chibi
    : UNDEAD_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  context.save();
  context.fillStyle = BADGE_FILL;
  context.strokeStyle = BONE;
  context.lineWidth = Math.max(1, 1.6 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = BONE;
  context.beginPath();
  context.arc(cx, cy - size * 0.07, size * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillRect(cx - size * 0.16, cy + size * 0.1, size * 0.32, size * 0.17);
  context.fillStyle = BADGE_FILL;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(
      cx + side * size * 0.11,
      cy - size * 0.06,
      size * 0.075,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillRect(
    cx - size * 0.015,
    cy + size * 0.12,
    Math.max(0.5, size * 0.03),
    size * 0.15,
  );
  context.restore();
}

const STYLE_COLORS: Readonly<
  Record<
    AbilityPreviewStyleV7,
    { readonly fill: string; readonly stroke: string }
  >
> = {
  WAIL: { fill: "rgba(176, 128, 255, 0.2)", stroke: "#c9a6ff" },
  RAISE: { fill: "rgba(120, 230, 150, 0.2)", stroke: "#8ff0a4" },
  DEVOUR: { fill: "rgba(255, 128, 104, 0.2)", stroke: "#ff9a84" },
  SPLASH: { fill: "rgba(255, 170, 70, 0.18)", stroke: "#ffb35c" },
};

/** Faint fill of one previewed area cell (Wail radius or splash ring). */
export function drawAbilityAreaCellV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  style: AbilityPreviewStyleV7,
): void {
  const size = 128 * zoom;
  context.save();
  context.fillStyle = STYLE_COLORS[style].fill;
  context.fillRect(x - size / 2, y - size / 2, size, size);
  context.restore();
}

/** Outline of one previewed area edge. */
export function abilityAreaStrokeV7(style: AbilityPreviewStyleV7): string {
  return STYLE_COLORS[style].stroke;
}

/**
 * A previewed ability target: a solid inner outline plus a short label such
 * as `−3`, `Rise` or `+4 HP`. Lethal damage uses a red label.
 */
export function drawAbilityTargetV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  style: AbilityPreviewStyleV7,
  label: string,
  lethal: boolean,
): void {
  const size = 128 * zoom;
  context.save();
  context.strokeStyle = STYLE_COLORS[style].stroke;
  context.lineWidth = 3 * zoom;
  context.setLineDash([]);
  context.strokeRect(
    x - size / 2 + 9 * zoom,
    y - size / 2 + 9 * zoom,
    size - 18 * zoom,
    size - 18 * zoom,
  );
  // Labels stay legible at the smallest zoom: never below 11 CSS px.
  const font = Math.max(11, 15 * zoom);
  const top = y - size / 2 + 2 * zoom;
  context.font = `${800} ${font}px system-ui`;
  context.textAlign = "center";
  const width = Math.max(
    font * 2.6,
    context.measureText(label).width + font * 0.7,
  );
  context.fillStyle = lethal ? "#8f1f22ee" : "#171722e6";
  context.fillRect(x - width / 2, top, width, font * 1.4);
  context.strokeStyle = STYLE_COLORS[style].stroke;
  context.lineWidth = Math.max(1, 1.5 * zoom);
  context.strokeRect(x - width / 2, top, width, font * 1.4);
  context.fillStyle = "#fff8df";
  context.fillText(label, x, top + font * 1.05);
  context.restore();
}

/** Second attack-preview line for Lifesteal and Infect outcomes. */
export function drawCombatPreviewNoteV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  note: string,
): void {
  context.save();
  context.font = `${700} ${10 * zoom}px system-ui`;
  context.textAlign = "center";
  const width = Math.max(
    90 * zoom,
    context.measureText(note).width + 10 * zoom,
  );
  context.fillStyle = "#2a1633ee";
  context.fillRect(x - width / 2, y + 57 * zoom, width, 16 * zoom);
  context.fillStyle = "#f3dcff";
  context.fillText(note, x, y + 69 * zoom);
  context.restore();
}
