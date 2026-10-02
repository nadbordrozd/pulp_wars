import type { CoordV7 } from "../../engine/index";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import { DINOSAUR_CUE_COLORS_V7 } from "./dinosaur-canvas-v7";

/**
 * Code-native revision-19 Dinosaur cues (docs/art/factions/DINOSAUR.md
 * "Effects"), drawn on the board's effects overlay. They are unowned and
 * limited to white, cream, light grey, basalt grey and charcoal, so no cue
 * reads as a player colour. `progress` runs 0 to 1; reduced motion freezes
 * a cue at its midpoint (the host passes 0.5).
 */
export type DinosaurEffectV7 =
  /**
   * A spiky star flash and two dust puffs on the target of a Charge! made
   * after a run-up (revision 20; the former Stampede hit).
   */
  | "CHARGE_HIT"
  /** Three small pale puffs where a Spitter's acid lands. */
  | "ACID_HIT"
  /** The Egg pops in (the sprite bounces; nothing is drawn here). */
  | "EGG_LAID"
  /** A zigzag crack, then six shell chips flying up. */
  | "HATCH"
  /** Two rings spreading from the Shaman's drum to the Egg. */
  | "HATCH_CALL"
  /** Shell chips scattering and one pale dust puff. */
  | "EGG_DESTROYED"
  /** The grown sprite pulses (nothing is drawn here). */
  | "GROW";

export interface DinosaurFeedbackV7 {
  readonly effect: DinosaurEffectV7;
  /** The cue's cells: the target, or the Egg tiles. */
  readonly cells: readonly CoordV7[];
  /** HATCH_CALL: the Shaman's cell. */
  readonly from?: CoordV7;
  readonly progress: number;
}

const { white, cream, lightGrey, charcoal } = DINOSAUR_CUE_COLORS_V7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** One round pale dust puff: light grey under cream, a thin charcoal edge. */
function drawPuff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  if (alpha <= 0 || radius <= 0) return;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = lightGrey;
  context.strokeStyle = charcoal;
  context.lineWidth = Math.max(1, radius * 0.12);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = cream;
  context.beginPath();
  context.arc(
    x - radius * 0.18,
    y - radius * 0.2,
    radius * 0.68,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

/** A small cream shell chip (a triangle) with a charcoal edge. */
function drawChip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = cream;
  context.strokeStyle = charcoal;
  context.lineWidth = Math.max(1, size * 0.18);
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(-size * 0.6, size * 0.45);
  context.lineTo(0, -size * 0.6);
  context.lineTo(size * 0.6, size * 0.45);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

export function drawDinosaurFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: DinosaurFeedbackV7,
): void {
  // Cue sizes are tuned on a 128-unit cell and drawn 1.4x, so each cue
  // reads at the smallest zoom while staying inside its own cell.
  const zoom = camera.zoom * 1.4;
  const progress = clamp01(feedback.progress);
  const centre = (at: CoordV7): { readonly x: number; readonly y: number } =>
    worldToScreen(projectGrid(at), camera);
  context.save();
  if (feedback.effect === "CHARGE_HIT") {
    for (const at of feedback.cells) {
      const point = centre(at);
      const alpha = 1 - progress;
      const outer = (22 + 20 * progress) * zoom;
      const inner = outer * 0.45;
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = cream;
      context.strokeStyle = charcoal;
      context.lineWidth = Math.max(1, 2.4 * zoom);
      context.lineJoin = "miter";
      context.beginPath();
      for (let spike = 0; spike < 16; spike += 1) {
        const radius = spike % 2 === 0 ? outer : inner;
        const angle = (spike / 16) * Math.PI * 2 - Math.PI / 2;
        const px = point.x + Math.cos(angle) * radius;
        const py = point.y + Math.sin(angle) * radius;
        if (spike === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = white;
      context.beginPath();
      context.arc(point.x, point.y, inner * 0.55, 0, Math.PI * 2);
      context.fill();
      context.restore();
      for (const side of [-1, 1])
        drawPuff(
          context,
          point.x + side * (24 + 12 * progress) * zoom,
          point.y + 30 * zoom,
          (9 + 10 * progress) * zoom,
          alpha * 0.85,
        );
    }
  } else if (feedback.effect === "ACID_HIT") {
    for (const at of feedback.cells) {
      const point = centre(at);
      for (const [dx, dy] of [
        [-16, 4],
        [14, -2],
        [0, -18],
      ] as const)
        drawPuff(
          context,
          point.x + dx * zoom,
          point.y + (dy - 10 * progress) * zoom,
          (6 + 7 * progress) * zoom,
          (1 - progress) * 0.9,
        );
    }
  } else if (feedback.effect === "HATCH") {
    for (const at of feedback.cells) {
      const point = centre(at);
      const shellY = point.y + 11 * zoom;
      if (progress < 0.5) {
        // The zigzag crack runs across the shell.
        const reach = clamp01(progress / 0.4);
        const points: readonly (readonly [number, number])[] = [
          [-16, -2],
          [-8, 5],
          [-1, -4],
          [7, 5],
          [15, -2],
        ];
        const shown = Math.max(2, Math.round(reach * points.length));
        context.strokeStyle = "#000000";
        context.lineWidth = Math.max(1.5, 2.6 * zoom);
        context.lineJoin = "miter";
        context.beginPath();
        for (const [index, [dx, dy]] of points.slice(0, shown).entries()) {
          const px = point.x + dx * zoom;
          const py = shellY + dy * zoom;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.stroke();
      }
      if (progress >= 0.4) {
        const flight = clamp01((progress - 0.4) / 0.6);
        for (let chip = 0; chip < 6; chip += 1) {
          const angle = -Math.PI * (0.12 + (chip / 5) * 0.76);
          const distance = (16 + 34 * flight) * zoom;
          drawChip(
            context,
            point.x + Math.cos(angle) * distance,
            shellY + Math.sin(angle) * distance,
            (9 - 2 * flight) * zoom,
            angle + flight * 2 + chip,
            1 - flight,
          );
        }
      }
    }
  } else if (feedback.effect === "HATCH_CALL") {
    const from = feedback.from;
    const to = feedback.cells[0];
    if (from !== undefined && to !== undefined) {
      const start = centre(from);
      const end = centre(to);
      const reach = Math.hypot(end.x - start.x, end.y - start.y);
      for (const delay of [0, 0.3]) {
        const ring = clamp01((progress - delay) / (1 - delay));
        if (ring <= 0) continue;
        const radius = Math.max(4 * zoom, reach * ring);
        context.save();
        context.globalAlpha = 1 - ring * 0.7;
        for (const [color, width] of [
          [charcoal, 6 * zoom],
          [cream, 3 * zoom],
        ] as const) {
          context.strokeStyle = color;
          context.lineWidth = Math.max(1, width);
          context.beginPath();
          context.arc(start.x, start.y, radius, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
    }
  } else if (feedback.effect === "EGG_DESTROYED") {
    for (const at of feedback.cells) {
      const point = centre(at);
      const shellY = point.y + 11 * zoom;
      drawPuff(
        context,
        point.x,
        shellY + 12 * zoom,
        (12 + 16 * progress) * zoom,
        (1 - progress) * 0.8,
      );
      for (let chip = 0; chip < 7; chip += 1) {
        const angle = (chip / 7) * Math.PI * 2 + 0.4;
        const distance = (10 + 36 * progress) * zoom;
        drawChip(
          context,
          point.x + Math.cos(angle) * distance,
          shellY + Math.sin(angle) * distance * 0.8,
          (9 - 3 * progress) * zoom,
          angle + progress * 3,
          1 - progress,
        );
      }
    }
  }
  context.restore();
}
