import type { CoordV7 } from "../../engine/index";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";

/**
 * Code-native revision-17 explosion cues (docs/art/factions/GOBLIN.md,
 * "Explosion effects"; spec section 11.4 allows a code-native effect). A
 * blast is a cartoon "bang": a spiky white-and-cream star flash inside a
 * ring of round soot-grey smoke puffs with small dark iron scraps flying
 * out. It bursts on the exploding unit's tile and swells to cover the 3 × 3
 * area, then the puffs drift up and fade; a small soot puff with two scraps
 * pops over every hit unit. A Bomb Chucker's bomb is a smaller burst on its
 * target. Explosions are unowned, so the palette is white, cream, pale
 * spark, light grey, soot grey and charcoal: no player colour, no orange.
 */

export interface ExplosionBlastV7 {
  readonly at: CoordV7;
  /** KABOOM and DEATH swell over the 3 × 3 area; BOMB is a smaller burst. */
  readonly kind: "KABOOM" | "DEATH" | "BOMB";
  /** Cells of the units this blast hits (own units included). */
  readonly hits: readonly CoordV7[];
}

export interface ExplosionFeedbackV7 {
  /** 1-based chain wave; every blast of a wave bursts together. */
  readonly wave: number;
  readonly blasts: readonly ExplosionBlastV7[];
  /** 0 to 1. */
  readonly progress: number;
}

export const GOBLIN_BLAST_PALETTE_V7 = {
  white: "#ffffff",
  cream: "#efe6c8",
  spark: "#fff8d0",
  lightGrey: "#c9cbd0",
  soot: "#8b8e96",
  charcoal: "#2b2d33",
} as const;

const PALETTE = GOBLIN_BLAST_PALETTE_V7;

/**
 * Draws one wave of blasts on the effects overlay. Reduced motion freezes
 * every burst at its midpoint, as for the Undead cues.
 */
export function drawExplosionFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: ExplosionFeedbackV7,
  reducedMotion: boolean,
): void {
  const progress = reducedMotion ? 0.5 : clamp01(feedback.progress);
  for (const blast of feedback.blasts)
    drawBlastV7(context, camera, blast, progress);
  for (const blast of feedback.blasts)
    for (const hit of blast.hits)
      drawHitPuffV7(
        context,
        worldToScreen(projectGrid(hit), camera),
        camera.zoom,
        progress,
        hit.x * 31 + hit.y * 17,
      );
}

function drawBlastV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  blast: ExplosionBlastV7,
  progress: number,
): void {
  const center = worldToScreen(projectGrid(blast.at), camera);
  const cell = 128 * camera.zoom;
  const bomb = blast.kind === "BOMB";
  // Swell over the first 45%, hold, then fade over the last 40%.
  const swell = easeOut(Math.min(1, progress / 0.45));
  const fade = progress < 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.4);
  // A full blast covers the 3 × 3 area (1.5 cells from the centre).
  const reach = (bomb ? 0.75 : 1.5) * cell;
  context.save();
  // The 3 × 3 area flashes in cream so the blast's reach reads at a glance.
  if (!bomb) {
    context.globalAlpha = 0.45 * fade * swell;
    context.fillStyle = PALETTE.spark;
    context.fillRect(center.x - reach, center.y - reach, reach * 2, reach * 2);
    context.globalAlpha = 0.9 * fade * swell;
    context.strokeStyle = PALETTE.charcoal;
    context.lineWidth = Math.max(1.5, 3 * camera.zoom);
    context.setLineDash([10 * camera.zoom, 6 * camera.zoom]);
    context.strokeRect(
      center.x - reach,
      center.y - reach,
      reach * 2,
      reach * 2,
    );
    context.setLineDash([]);
  }
  // Soot puffs ring the flash and drift up as they fade.
  const puffs = bomb ? 5 : 8;
  const puffRing = reach * (0.55 + 0.35 * swell);
  const drift = progress * 0.35 * cell;
  context.globalAlpha = fade;
  for (let index = 0; index < puffs; index += 1) {
    const angle = (index / puffs) * Math.PI * 2 + 0.3;
    const radius = (bomb ? 0.13 : 0.2) * cell * (0.6 + 0.5 * swell);
    drawPuffV7(
      context,
      center.x + Math.cos(angle) * puffRing,
      center.y + Math.sin(angle) * puffRing - drift,
      radius,
      camera.zoom,
    );
  }
  // The spiky star flash: white outside, cream inside, a pale spark core.
  const starAlpha =
    progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) / 0.35);
  if (starAlpha > 0) {
    context.globalAlpha = starAlpha;
    const outer = reach * (0.35 + 0.6 * swell);
    starPath(context, center.x, center.y, outer, outer * 0.55, 12, progress);
    context.fillStyle = PALETTE.white;
    context.fill();
    context.strokeStyle = PALETTE.charcoal;
    context.lineWidth = Math.max(1.5, 3 * camera.zoom);
    context.lineJoin = "miter";
    context.stroke();
    starPath(
      context,
      center.x,
      center.y,
      outer * 0.62,
      outer * 0.36,
      10,
      progress + 0.5,
    );
    context.fillStyle = PALETTE.cream;
    context.fill();
    context.beginPath();
    context.arc(center.x, center.y, outer * 0.22, 0, Math.PI * 2);
    context.fillStyle = PALETTE.spark;
    context.fill();
  }
  // Small dark iron scraps fly outwards and spin.
  context.globalAlpha = fade;
  const scraps = bomb ? 4 : 7;
  for (let index = 0; index < scraps; index += 1) {
    const angle = (index / scraps) * Math.PI * 2 + 0.9;
    const distance = reach * (0.3 + 0.95 * easeOut(progress));
    drawScrapV7(
      context,
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance - drift * 0.5,
      (bomb ? 5 : 7) * camera.zoom,
      angle + progress * 9,
      camera.zoom,
    );
  }
  context.restore();
}

/** One small soot puff with two scraps over a hit unit. */
function drawHitPuffV7(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  seed: number,
): void {
  // The puff pops as the blast arrives (a third of the way in).
  if (progress < 0.3) return;
  const local = Math.min(1, (progress - 0.3) / 0.7);
  const alpha = local < 0.6 ? 1 : Math.max(0, 1 - (local - 0.6) / 0.4);
  const cell = 128 * zoom;
  context.save();
  context.globalAlpha = alpha;
  const y = center.y - 0.18 * cell - local * 0.15 * cell;
  drawPuffV7(context, center.x, y, 0.16 * cell * (0.7 + 0.4 * local), zoom);
  for (const side of [-1, 1])
    drawScrapV7(
      context,
      center.x + side * (0.2 + 0.2 * local) * cell,
      y - (0.1 + 0.15 * local) * cell,
      5 * zoom,
      seed + side * local * 6,
      zoom,
    );
  context.restore();
}

/** A round soot cloud: three overlapping lobes with a light top. */
function drawPuffV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  zoom: number,
): void {
  const lobes = [
    [-0.55, 0.15, 0.7],
    [0.55, 0.2, 0.72],
    [0, -0.1, 1],
  ] as const;
  context.beginPath();
  for (const [dx, dy, scale] of lobes) {
    context.moveTo(x + dx * radius + scale * radius, y + dy * radius);
    context.arc(
      x + dx * radius,
      y + dy * radius,
      scale * radius,
      0,
      Math.PI * 2,
    );
  }
  context.strokeStyle = PALETTE.charcoal;
  context.lineWidth = Math.max(1.5, 3 * zoom);
  context.stroke();
  context.fillStyle = PALETTE.soot;
  context.fill();
  context.beginPath();
  context.arc(
    x - radius * 0.2,
    y - radius * 0.35,
    radius * 0.45,
    0,
    Math.PI * 2,
  );
  context.fillStyle = PALETTE.lightGrey;
  context.fill();
}

function drawScrapV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  zoom: number,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = PALETTE.charcoal;
  context.fillRect(-size / 2, -size / 3, size, (size * 2) / 3);
  context.fillStyle = PALETTE.lightGrey;
  context.fillRect(
    -size / 2 + zoom,
    -size / 3 + zoom,
    Math.max(1, size / 3),
    Math.max(1, size / 4),
  );
  context.restore();
}

function starPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
  twist: number,
): void {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (index / (points * 2)) * Math.PI * 2 + twist * 0.2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/**
 * A Bomb Chucker's bomb in flight: a round black bomb with a lit cream fuse
 * and a pale spark.
 */
export function drawBombProjectileV7(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  progress: number,
): void {
  const radius = 8 * zoom;
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = PALETTE.charcoal;
  context.fill();
  context.strokeStyle = PALETTE.cream;
  context.lineWidth = Math.max(1, 1.5 * zoom);
  context.stroke();
  context.beginPath();
  context.moveTo(x + radius * 0.5, y - radius * 0.8);
  context.quadraticCurveTo(
    x + radius * 1.1,
    y - radius * 1.5,
    x + radius * 1.4,
    y - radius * 1.3,
  );
  context.strokeStyle = PALETTE.cream;
  context.lineWidth = Math.max(1, 2 * zoom);
  context.stroke();
  const flicker = 0.8 + 0.4 * Math.abs(Math.sin(progress * 30));
  starPath(
    context,
    x + radius * 1.45,
    y - radius * 1.35,
    radius * 0.7 * flicker,
    radius * 0.3,
    5,
    progress * 5,
  );
  context.fillStyle = PALETTE.spark;
  context.fill();
  context.restore();
}

function easeOut(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
