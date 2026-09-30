/**
 * Code-native revision-13 Undead placeholders (spec section 10.2): the Grave
 * marker, the Undead faction badge drawn over a Human sprite, and the ability
 * preview overlays. Sizes are world units (128 = one cell) scaled by zoom, so
 * both art sets share them.
 */

export type AbilityPreviewStyleV7 =
  "WAIL" | "RAISE" | "DEVOUR" | "SPLASH" | "TEND";

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

/**
 * Revision 14 status markers (Plague and Bitten), public to every viewer.
 * The subject names the art slot: vkq.14 may register a raster for it, in
 * which case the renderer passes that image and the code-drawn glyph is
 * skipped. Slot 0 takes the first affliction, slot 1 the second.
 */
export type AfflictionSubjectV7 = "STATUS:PLAGUED" | "STATUS:BITTEN";

export function afflictionSubjectV7(
  affliction: "PLAGUE" | "BITTEN",
): AfflictionSubjectV7 {
  return affliction === "PLAGUE" ? "STATUS:PLAGUED" : "STATUS:BITTEN";
}

/**
 * Marker frames relative to the cell centre (world units, 128 = one cell),
 * stacked downwards. LEGACY: left of the sprite, between the Field Defense
 * symbol and the owner seat badge. CHIBI: just right of the unit's own
 * vertical HP bar, below the top-left Undead badge and Field Defense corner
 * and above the seat badge, so they read as the unit's own and never meet
 * another overlay.
 */
export const AFFLICTION_MARKER_FRAME_V7 = {
  legacy: [
    { left: -45, top: -31, size: 21 },
    { left: -45, top: -9, size: 21 },
  ],
  chibi: [
    { left: -52, top: -36, size: 26 },
    { left: -52, top: -8, size: 26 },
  ],
} as const;

/** Master size of a CHIBI marker raster (STATUS class, bead vkq.14). */
export const AFFLICTION_RASTER_MASTER_PX_V7 = 32;
/**
 * World units a CHIBI marker raster covers: 16 CSS px at zoom step 1
 * (camera.zoom 0.625), the frame's 26 rounded down to whole CSS pixels.
 */
export const AFFLICTION_RASTER_WORLD_SIZE_V7 = 25.6;

const MARKER_OUTLINE = "#0d0f0c";
/** Dark slate token behind a CHIBI marker raster. */
const MARKER_TOKEN = "#20242e";

const PLAGUE_COLORS = {
  disc: "#1b1e19",
  rim: "#d4dbc4",
  cloud: "#a4bb86",
  cloudShade: "#6b7c59",
  outline: "#10160c",
} as const;

const BITE_COLORS = {
  disc: "#4a1519",
  rim: "#f0d6c0",
  tooth: "#f7eddc",
  blood: "#e2434b",
} as const;

/** Draws one affliction marker (or its registered raster) in its slot. */
export function drawAfflictionMarkerV7(
  context: CanvasRenderingContext2D,
  subject: AfflictionSubjectV7,
  x: number,
  y: number,
  zoom: number,
  options: {
    readonly chibi: boolean;
    readonly slot: number;
    readonly highContrast: boolean;
    readonly raster?: CanvasImageSource | null;
    /** Snaps a raster to whole device pixels (default 1). */
    readonly devicePixelRatio?: number;
  },
): void {
  const frames = options.chibi
    ? AFFLICTION_MARKER_FRAME_V7.chibi
    : AFFLICTION_MARKER_FRAME_V7.legacy;
  const frame = frames[Math.min(options.slot, frames.length - 1)] ?? frames[0];
  const size = frame.size * zoom;
  const left = x + frame.left * zoom;
  const top = y + frame.top * zoom;
  context.save();
  if (options.raster !== undefined && options.raster !== null) {
    // A CHIBI marker is a 32 x 32 master drawn at 16 CSS px per zoom step
    // (AFFLICTION_RASTER_WORLD_SIZE_V7), centred in the frame and snapped
    // to device pixels: nearest-neighbour where that is 1:1 or a whole
    // upscale (DPR 2 at zoom 1), smoothed otherwise.
    const ratio =
      options.devicePixelRatio !== undefined && options.devicePixelRatio > 0
        ? options.devicePixelRatio
        : 1;
    const drawn = options.chibi ? AFFLICTION_RASTER_WORLD_SIZE_V7 * zoom : size;
    const snap = (value: number): number => Math.round(value * ratio) / ratio;
    const deviceScale = (drawn * ratio) / AFFLICTION_RASTER_MASTER_PX_V7;
    context.imageSmoothingEnabled = !(
      Math.abs(deviceScale - Math.round(deviceScale)) < 1e-6 &&
      Math.round(deviceScale) >= 1
    );
    if (options.chibi) {
      // A dark token with a bone rim, like the Undead badge, keeps the
      // small marker legible on grass, forest and water.
      context.fillStyle = MARKER_TOKEN;
      context.strokeStyle = BONE;
      context.lineWidth = Math.max(1, 1.2 * zoom);
      context.beginPath();
      context.arc(
        left + size / 2,
        top + size / 2,
        size / 2 + 0.6 * zoom,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.drawImage(
      options.raster,
      snap(left + (size - drawn) / 2),
      snap(top + (size - drawn) / 2),
      drawn,
      drawn,
    );
    context.restore();
    return;
  }
  const cx = left + size / 2;
  const cy = top + size / 2;
  const hc = options.highContrast;
  const plague = subject === "STATUS:PLAGUED";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = hc
    ? "#000000"
    : plague
      ? PLAGUE_COLORS.disc
      : BITE_COLORS.disc;
  context.strokeStyle = hc
    ? "#ffffff"
    : plague
      ? PLAGUE_COLORS.rim
      : BITE_COLORS.rim;
  // A dark outer ring keeps the disc readable on grass, sand and snow; the
  // light inner rim keeps it readable on dark forest and water.
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fill();
  const rim = context.strokeStyle;
  context.strokeStyle = hc ? "#000000" : MARKER_OUTLINE;
  context.lineWidth = Math.max(1.5, 3 * zoom);
  context.stroke();
  context.strokeStyle = rim;
  context.lineWidth = Math.max(1, 1.4 * zoom);
  context.beginPath();
  context.arc(cx, cy, size / 2 - 1.2 * zoom, 0, Math.PI * 2);
  context.stroke();
  if (plague) drawPlagueCloud(context, cx, cy, size, zoom, hc);
  else drawBiteMark(context, cx, cy, size, hc);
  context.restore();
}

/** A green-grey miasma cloud with two falling drops. */
function drawPlagueCloud(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  zoom: number,
  hc: boolean,
): void {
  const s = size;
  const puffs: readonly (readonly [number, number, number])[] = [
    [-0.16, -0.02, 0.13],
    [0.0, -0.11, 0.16],
    [0.17, -0.01, 0.12],
    [0.02, 0.05, 0.14],
  ];
  context.fillStyle = hc ? "#ffffff" : PLAGUE_COLORS.cloud;
  context.strokeStyle = hc ? "#ffffff" : PLAGUE_COLORS.outline;
  context.lineWidth = Math.max(1, 1.2 * zoom);
  context.beginPath();
  for (const [dx, dy, r] of puffs) {
    context.moveTo(cx + dx * s + r * s, cy + dy * s);
    context.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
  }
  context.stroke();
  context.fill();
  if (!hc) {
    context.fillStyle = PLAGUE_COLORS.cloudShade;
    context.beginPath();
    context.ellipse(
      cx + 0.02 * s,
      cy + 0.14 * s,
      0.22 * s,
      0.06 * s,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = hc ? "#ffffff" : PLAGUE_COLORS.rim;
  for (const dx of [-0.12, 0.13]) {
    context.beginPath();
    context.arc(
      cx + dx * s,
      cy + 0.33 * s,
      Math.max(0.6, 0.055 * s),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

/** Two opposing rows of teeth closing on a red wound. */
function drawBiteMark(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  hc: boolean,
): void {
  const s = size;
  if (!hc) {
    context.fillStyle = BITE_COLORS.blood;
    context.beginPath();
    context.ellipse(cx, cy, 0.27 * s, 0.09 * s, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = hc ? "#ffffff" : BITE_COLORS.tooth;
  const tooth = (tipX: number, baseY: number, tipY: number, half: number) => {
    context.beginPath();
    context.moveTo(tipX - half, baseY);
    context.lineTo(tipX, tipY);
    context.lineTo(tipX + half, baseY);
    context.closePath();
    context.fill();
  };
  // Upper jaw: four teeth pointing down along a shallow arc.
  for (const [dx, lift] of [
    [-0.24, 0.05],
    [-0.08, 0],
    [0.08, 0],
    [0.24, 0.05],
  ] as const)
    tooth(
      cx + dx * s,
      cy - (0.26 - lift) * s,
      cy - (0.02 - lift * 0.4) * s,
      0.075 * s,
    );
  // Lower jaw: three teeth pointing up, offset between the upper ones.
  for (const [dx, lift] of [
    [-0.16, 0.04],
    [0, 0],
    [0.16, 0.04],
  ] as const)
    tooth(
      cx + dx * s,
      cy + (0.26 - lift) * s,
      cy + (0.03 + lift * 0.4) * s,
      0.075 * s,
    );
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
  TEND: { fill: "rgba(103, 229, 202, 0.18)", stroke: "#67e5ca" },
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
