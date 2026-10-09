import type { ArtSubjectV7 } from "../../assets/chibi-art-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";

/**
 * The giants' signatures on the board (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10): the Gingerbread Man's
 * sprite scale and the Abomination's belly badge. Sizes are world units
 * (128 to a cell, its centre at 0, 0) scaled by the zoom.
 */

/**
 * A Gingerbread Man (`variant: "GINGERBREAD_MAN"`) is the Gingerbread
 * Giant's own sprite drawn at this share of its size: 88 x 104 becomes
 * about 53 x 62, a little smaller than a Toffee Trooper's 56 x 80, so the
 * two broken-off men read as small copies of their Giant.
 */
export const GINGERBREAD_MAN_SPRITE_SCALE_V7 = 0.6;

/** UNIT only: what an Abomination holds, for its belly badge. */
export interface SwallowedBadgeV7 {
  /** The victim's portrait (drawn inside the badge). */
  readonly portraitSubject: ArtSubjectV7;
  /** The victim's sprite, its head and shoulders drawn without a portrait. */
  readonly artSubject: ArtSubjectV7;
  /** The victim's owner colour (the badge's rim). */
  readonly ownerColor: string | undefined;
  readonly hp: number;
  readonly maxHp: number;
}

/** The belly badge's frame: on the lower front of the giant's body. */
export const SWALLOWED_BADGE_FRAME_V7 = {
  legacy: { left: 6, top: 2, size: 36 },
  chibi: { left: 8, top: 0, size: 44 },
} as const;

const BELLY = "#3c2a4d";
const BELLY_LIT = "#6d4a86";
const INK = "#10131c";
const CREAM = "#f8f2df";

/**
 * The belly badge (section 10): a round dark belly with the victim's
 * sprite inside (a plain silhouette while it has none) in a rim of its
 * owner's colour, and its HP in a small pill under it.
 */
export function drawSwallowedBadgeV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  badge: SwallowedBadgeV7,
  options: {
    readonly chibi: boolean;
    readonly image: CanvasImageSource | null;
    /** `image` is the victim's portrait (else its sprite). */
    readonly portrait?: boolean;
    readonly highContrast?: boolean;
  },
): void {
  const frame = options.chibi
    ? SWALLOWED_BADGE_FRAME_V7.chibi
    : SWALLOWED_BADGE_FRAME_V7.legacy;
  const size = frame.size * zoom;
  const cx = x + (frame.left + frame.size / 2) * zoom;
  const cy = y + (frame.top + frame.size / 2) * zoom;
  const radius = size / 2;
  const highContrast = options.highContrast ?? false;
  context.save();
  // The belly and the owner's rim.
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = highContrast ? "#000000" : BELLY;
  context.fill();
  context.lineWidth = Math.max(1.4, 2.4 * zoom);
  context.strokeStyle = INK;
  context.stroke();
  context.beginPath();
  context.arc(cx, cy, radius - 1.6 * zoom, 0, Math.PI * 2);
  context.lineWidth = Math.max(1, 2 * zoom);
  context.strokeStyle = highContrast ? "#ffffff" : (badge.ownerColor ?? CREAM);
  context.stroke();
  // The victim inside, clipped to the belly.
  context.save();
  context.beginPath();
  context.arc(cx, cy, radius - 2.6 * zoom, 0, Math.PI * 2);
  context.clip();
  if (!highContrast) {
    const glow = context.createRadialGradient(
      cx,
      cy - radius * 0.3,
      0,
      cx,
      cy,
      radius,
    );
    glow.addColorStop(0, BELLY_LIT);
    glow.addColorStop(1, BELLY);
    context.fillStyle = glow;
    context.fillRect(cx - radius, cy - radius, size, size);
  }
  if (options.image !== null) {
    const image = options.image as { width?: number; height?: number };
    const width = Number(image.width ?? 1) || 1;
    const height = Number(image.height ?? 1) || 1;
    context.imageSmoothingEnabled = true;
    if (options.portrait === true) {
      // The portrait fills the belly.
      const scale = size / Math.min(width, height);
      context.drawImage(
        options.image,
        cx - (width * scale) / 2,
        cy - (height * scale) / 2,
        width * scale,
        height * scale,
      );
    } else {
      // The victim's head and shoulders fill the belly.
      const scale = (size * 1.25) / Math.max(width, height * 0.75);
      context.drawImage(
        options.image,
        cx - (width * scale) / 2,
        cy - radius * 0.85,
        width * scale,
        height * scale,
      );
    }
  } else {
    context.fillStyle = badge.ownerColor ?? CREAM;
    context.beginPath();
    context.arc(cx, cy - radius * 0.22, radius * 0.3, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(
      cx,
      cy + radius * 0.55,
      radius * 0.55,
      radius * 0.42,
      0,
      Math.PI,
      0,
    );
    context.fill();
  }
  context.restore();
  // The victim's HP in a pill under the belly.
  const label = String(badge.hp);
  const fontSize = Math.max(8, 13 * zoom);
  context.font = `800 ${fontSize}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const pillWidth = context.measureText(label).width + 8 * zoom;
  const pillHeight = fontSize + 3 * zoom;
  const pillY = cy + radius - 1 * zoom;
  context.beginPath();
  context.roundRect(
    cx - pillWidth / 2,
    pillY - pillHeight / 2,
    pillWidth,
    pillHeight,
    pillHeight / 2,
  );
  context.fillStyle = highContrast ? "#000000" : INK;
  context.fill();
  context.lineWidth = Math.max(1, 1.2 * zoom);
  context.strokeStyle = highContrast ? "#ffffff" : CREAM;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.fillText(label, cx, pillY + 0.5 * zoom);
  context.restore();
}
