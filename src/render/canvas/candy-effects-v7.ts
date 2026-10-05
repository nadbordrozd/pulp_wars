import type { CoordV7 } from "../../engine/index";
import { CANDY_PALETTE_V7 } from "../../assets/chibi-direction-candy-presentation";
import type { CandyEffectIdV7 } from "../../assets/chibi-art-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * Candy cues on the board's effects overlay (bead pulp_wars-jdb.6,
 * docs/art/factions/CANDY.md "Effects"). The effect sprites of the Candy
 * art (EFFECT:SPLAT, EFFECT:SUGAR_TOSS, EFFECT:REBAKE_PUFF,
 * EFFECT:PEPPERMINT_POP, EFFECT:BOUNCE) are drawn where they read well;
 * without a loaded sprite (LEGACY, the classic look, still loading) each
 * cue is code-drawn alone. `progress` runs 0 to 1 over the cue's duration
 * (CANDY_EFFECT_DURATIONS_V7); reduced motion holds one frame
 * (candyReducedMotionProgressV7) where the cue reads.
 */
export type CandyFeedbackEffectV7 =
  /** A unit goes on a Sugar Rush: sparkles burst round it. */
  | "RUSH"
  /** The Crash starts: a dizzy swirl settles over each crashed unit. */
  | "CRASH"
  /** The Crash ends: the swirl pops away. */
  | "WAKE"
  /** A Re-bake: the whisk, an oven puff, the unit pops out. */
  | "REBAKE"
  /** A Sugar Toss: a sweet thrown in an arc, a rising "+n". */
  | "SUGAR_TOSS"
  /** A Pie Launcher's Splat: cream over the target. */
  | "SPLAT"
  /** A Bounce: a spring under the attacker where it lands. */
  | "BOUNCE"
  /** Peppermint Surprise: a pop under the unit that ate the Crumbs. */
  | "PEPPERMINT"
  /** Crumbs eaten without the Surprise: the pile scatters. */
  | "CRUMBS_EATEN";

export const CANDY_FEEDBACK_EFFECTS_V7: readonly CandyFeedbackEffectV7[] = [
  "RUSH",
  "CRASH",
  "WAKE",
  "REBAKE",
  "SUGAR_TOSS",
  "SPLAT",
  "BOUNCE",
  "PEPPERMINT",
  "CRUMBS_EATEN",
];

export interface CandyFeedbackV7 {
  readonly effect: CandyFeedbackEffectV7;
  /**
   * The cue's cells: RUSH the unit, CRASH and WAKE each unit, REBAKE the
   * Crumbs tile, SUGAR_TOSS the healed unit, SPLAT the target, BOUNCE the
   * landing tile, PEPPERMINT and CRUMBS_EATEN the Crumbs tile.
   */
  readonly cells: readonly CoordV7[];
  /** The source: the Confectioner (REBAKE), the Gunner (SUGAR_TOSS). */
  readonly from?: CoordV7;
  /** SUGAR_TOSS: the HP healed; PEPPERMINT: the damage. */
  readonly amount?: number;
  readonly progress: number;
}

/** The duration of each cue in ms. */
export const CANDY_EFFECT_DURATIONS_V7: Readonly<
  Record<CandyFeedbackEffectV7, number>
> = {
  RUSH: 420,
  CRASH: 520,
  WAKE: 320,
  REBAKE: 620,
  SUGAR_TOSS: 520,
  SPLAT: 380,
  BOUNCE: 340,
  PEPPERMINT: 460,
  CRUMBS_EATEN: 300,
};

/** The progress a reduced-motion hold shows: each cue at its fullest. */
export function candyReducedMotionProgressV7(
  effect: CandyFeedbackEffectV7,
): number {
  return effect === "SUGAR_TOSS"
    ? 0.72
    : effect === "REBAKE"
      ? 0.6
      : effect === "BOUNCE"
        ? 0.35
        : 0.5;
}

/** The Candy effect sprites the host loads before the first cue. */
export const CANDY_EFFECT_SUBJECTS_V7: readonly `EFFECT:${CandyEffectIdV7}`[] =
  [
    "EFFECT:GUMBALL_SHOT",
    "EFFECT:PIE",
    "EFFECT:SPLAT",
    "EFFECT:SUGAR_TOSS",
    "EFFECT:REBAKE_PUFF",
    "EFFECT:PEPPERMINT_POP",
    "EFFECT:BOUNCE",
  ];

const { caramel, milkChocolate, white, cream, biscuit, outline } =
  CANDY_PALETTE_V7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 → 1 → 0 over a span, with a flat top. */
function swell(progress: number): number {
  return clamp01(Math.min(progress / 0.2, (1 - progress) / 0.3));
}

/** The share of a Sugar Toss at which the sweet lands. */
export const SUGAR_TOSS_LANDS_V7 = 0.62;

/** Where a tossed sweet is at `progress`: its arc from the Gunner. */
export function sugarTossPointV7(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  progress: number,
  arc: number,
): { readonly x: number; readonly y: number } {
  const t = clamp01(progress / SUGAR_TOSS_LANDS_V7);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * arc,
  };
}

export function drawCandyFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: CandyFeedbackV7,
  art: SupportEffectArtV7 | null = null,
): void {
  const zoom = camera.zoom;
  const progress = clamp01(feedback.progress);
  const centre = (at: CoordV7): { readonly x: number; readonly y: number } =>
    worldToScreen(projectGrid(at), camera);
  const step = chibiMasterScale(camera);
  const ratio =
    (art?.devicePixelRatio ?? 1) > 0 ? (art?.devicePixelRatio ?? 1) : 1;
  /** Draws a loaded effect sprite centred on a point; false without one. */
  const sprite = (
    subject: `EFFECT:${CandyEffectIdV7}`,
    point: { readonly x: number; readonly y: number },
    scale: number,
    alpha: number,
  ): boolean => {
    const image = art?.image(subject) ?? null;
    if (image === null) return false;
    if (alpha <= 0) return true;
    const size = step * scale;
    const width = image.width * size;
    const height = image.height * size;
    context.save();
    context.globalAlpha *= Math.min(1, alpha);
    context.imageSmoothingEnabled = !isWholeScale(size * ratio);
    context.drawImage(
      image.image,
      Math.round((point.x - width / 2) * ratio) / ratio,
      Math.round((point.y - height / 2) * ratio) / ratio,
      width,
      height,
    );
    context.restore();
    return true;
  };
  /** A code-drawn puff: overlapping discs. */
  const puff = (
    point: { readonly x: number; readonly y: number },
    radius: number,
    colour: string,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = colour;
    context.strokeStyle = outline;
    context.lineWidth = Math.max(0.8, 1.2 * zoom);
    for (const [dx, dy, r] of [
      [0, 0, 1],
      [-0.7, 0.25, 0.7],
      [0.7, 0.25, 0.7],
      [0, -0.55, 0.65],
    ] as const) {
      context.beginPath();
      context.arc(
        point.x + dx * radius,
        point.y + dy * radius,
        r * radius,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.restore();
  };
  /** A four-point sparkle. */
  const sparkle = (
    point: { readonly x: number; readonly y: number },
    radius: number,
    alpha: number,
    colour: string = white,
  ): void => {
    if (alpha <= 0 || radius <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = colour;
    context.strokeStyle = milkChocolate;
    context.lineWidth = Math.max(0.8, 1 * zoom);
    context.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      const reach = index % 2 === 0 ? radius : radius * 0.34;
      const x = point.x + Math.cos(angle) * reach;
      const y = point.y + Math.sin(angle) * reach;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  };
  /** A dizzy swirl: a caramel spiral in a dark casing, turned by `turn`. */
  const swirl = (
    point: { readonly x: number; readonly y: number },
    radius: number,
    turn: number,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.lineCap = "round";
    for (const [width, colour] of [
      [Math.max(2, 5 * zoom), outline],
      [Math.max(1, 2.6 * zoom), caramel],
    ] as const) {
      context.lineWidth = width;
      context.strokeStyle = colour;
      context.beginPath();
      for (let index = 0; index <= 40; index += 1) {
        const t = index / 40;
        const angle = turn + t * Math.PI * 3.5;
        const r = radius * t;
        const x = point.x + Math.cos(angle) * r;
        const y = point.y + Math.sin(angle) * r * 0.55;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();
  };
  /** A floated number ("+2", "−3"). */
  const float = (
    point: { readonly x: number; readonly y: number },
    text: string,
    colour: string,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.font = `800 ${Math.max(11, 20 * zoom)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = Math.max(2, 4 * zoom);
    context.lineJoin = "round";
    context.strokeStyle = outline;
    context.strokeText(text, point.x, point.y);
    context.fillStyle = colour;
    context.fillText(text, point.x, point.y);
    context.restore();
  };
  // Effects sit on the ground half of a cell, where the units' feet are.
  const ground = (at: CoordV7): { readonly x: number; readonly y: number } => {
    const point = centre(at);
    return { x: point.x, y: point.y + 18 * zoom };
  };
  const body = (at: CoordV7): { readonly x: number; readonly y: number } => {
    const point = centre(at);
    return { x: point.x, y: point.y - 22 * zoom };
  };
  const head = (at: CoordV7): { readonly x: number; readonly y: number } => {
    const point = centre(at);
    return { x: point.x, y: point.y - 62 * zoom };
  };
  context.save();
  if (feedback.effect === "RUSH") {
    for (const at of feedback.cells) {
      const point = body(at);
      const alpha = swell(progress);
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2 + 0.3;
        const reach = (14 + 34 * progress) * zoom;
        sparkle(
          {
            x: point.x + Math.cos(angle) * reach,
            y: point.y + Math.sin(angle) * reach * 0.8,
          },
          (index % 2 === 0 ? 9 : 6) * zoom * (1 - 0.4 * progress),
          alpha,
          index % 3 === 0 ? caramel : white,
        );
      }
    }
  } else if (feedback.effect === "CRASH" || feedback.effect === "WAKE") {
    const wake = feedback.effect === "WAKE";
    for (const at of feedback.cells) {
      const point = head(at);
      if (wake) {
        // The swirl unwinds and pops into two sparkles.
        swirl(point, (18 - 8 * progress) * zoom, progress * 5, 1 - progress);
        for (const side of [-1, 1])
          sparkle(
            {
              x: point.x + side * (10 + 16 * progress) * zoom,
              y: point.y - 10 * progress * zoom,
            },
            6 * zoom,
            swell(progress),
          );
      } else {
        // The swirl drops onto the head and settles.
        const drop = (1 - clamp01(progress / 0.5)) * 26 * zoom;
        swirl(
          { x: point.x, y: point.y - drop },
          (10 + 10 * clamp01(progress / 0.5)) * zoom,
          progress * 7,
          clamp01(progress / 0.25) *
            (progress > 0.85 ? (1 - progress) / 0.15 : 1),
        );
      }
    }
  } else if (feedback.effect === "REBAKE") {
    const at = feedback.cells[0];
    if (at !== undefined) {
      const point = body(at);
      // The whisk: a line of sugar from the Confectioner, then the oven puff.
      if (feedback.from !== undefined && progress < 0.45) {
        const from = body(feedback.from);
        const local = progress / 0.45;
        context.save();
        context.globalAlpha *= swell(local);
        context.strokeStyle = cream;
        context.lineCap = "round";
        context.lineWidth = Math.max(2, 4 * zoom);
        context.setLineDash([2 * zoom, 8 * zoom]);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(
          from.x + (point.x - from.x) * local,
          from.y + (point.y - from.y) * local,
        );
        context.stroke();
        context.restore();
      }
      if (progress >= 0.3) {
        const local = (progress - 0.3) / 0.7;
        const lifted = { x: point.x, y: point.y - 14 * step * local };
        if (!sprite("EFFECT:REBAKE_PUFF", lifted, 1 + 0.5 * local, 1 - local))
          puff(lifted, 16 * zoom * (1 + local), cream, 0.8 * (1 - local));
        for (const side of [-1, 1])
          sparkle(
            {
              x: point.x + side * (16 + 12 * local) * zoom,
              y: point.y - 8 * zoom,
            },
            6 * zoom,
            swell(local),
          );
      }
    }
  } else if (feedback.effect === "SUGAR_TOSS") {
    const at = feedback.cells[0];
    if (at !== undefined) {
      const target = body(at);
      const from = feedback.from === undefined ? target : body(feedback.from);
      if (progress < SUGAR_TOSS_LANDS_V7) {
        const point = sugarTossPointV7(from, target, progress, 46 * zoom);
        if (!sprite("EFFECT:SUGAR_TOSS", point, 0.8, 1)) {
          // A wrapped sweet: a caramel ball with two twists.
          context.save();
          context.fillStyle = caramel;
          context.strokeStyle = outline;
          context.lineWidth = Math.max(0.8, 1.2 * zoom);
          context.beginPath();
          context.arc(point.x, point.y, 6 * zoom, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.fillStyle = white;
          for (const side of [-1, 1]) {
            context.beginPath();
            context.moveTo(point.x + side * 5 * zoom, point.y);
            context.lineTo(point.x + side * 11 * zoom, point.y - 4 * zoom);
            context.lineTo(point.x + side * 11 * zoom, point.y + 4 * zoom);
            context.closePath();
            context.fill();
            context.stroke();
          }
          context.restore();
        }
      } else {
        const local =
          (progress - SUGAR_TOSS_LANDS_V7) / (1 - SUGAR_TOSS_LANDS_V7);
        for (let index = 0; index < 5; index += 1) {
          const angle = (index / 5) * Math.PI * 2;
          sparkle(
            {
              x: target.x + Math.cos(angle) * (8 + 18 * local) * zoom,
              y: target.y + Math.sin(angle) * (8 + 18 * local) * zoom * 0.8,
            },
            6 * zoom,
            1 - local,
            index % 2 === 0 ? caramel : white,
          );
        }
        if (feedback.amount !== undefined && feedback.amount > 0)
          float(
            { x: target.x, y: target.y - (18 + 20 * local) * zoom },
            `+${feedback.amount}`,
            "#b6f5c8",
            local < 0.75 ? 1 : (1 - local) / 0.25,
          );
      }
    }
  } else if (feedback.effect === "SPLAT") {
    for (const at of feedback.cells) {
      const point = body(at);
      const alpha = progress < 0.6 ? 1 : (1 - progress) / 0.4;
      const scale = 0.7 + 0.5 * clamp01(progress / 0.3);
      if (!sprite("EFFECT:SPLAT", point, scale, alpha)) {
        puff(point, 16 * zoom * scale, white, alpha);
        puff(
          { x: point.x, y: point.y + 6 * zoom },
          8 * zoom * scale,
          cream,
          alpha,
        );
      }
    }
  } else if (feedback.effect === "BOUNCE") {
    for (const at of feedback.cells) {
      const point = ground(at);
      // The spring squashes and stretches under the bounced unit.
      const stretch =
        1 + 0.35 * Math.sin(progress * Math.PI * 3) * (1 - progress);
      const alpha = progress < 0.7 ? 1 : (1 - progress) / 0.3;
      if (!sprite("EFFECT:BOUNCE", point, stretch, alpha)) {
        context.save();
        context.globalAlpha *= alpha;
        context.lineCap = "round";
        for (const [width, colour] of [
          [Math.max(2, 5 * zoom), outline],
          [Math.max(1, 2.6 * zoom), caramel],
        ] as const) {
          context.lineWidth = width;
          context.strokeStyle = colour;
          context.beginPath();
          for (let coil = 0; coil <= 6; coil += 1) {
            const x = point.x + (coil % 2 === 0 ? -9 : 9) * zoom;
            const y = point.y - coil * 4 * zoom * stretch;
            if (coil === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.stroke();
        }
        context.restore();
      }
    }
  } else if (feedback.effect === "PEPPERMINT") {
    for (const at of feedback.cells) {
      const point = ground(at);
      const alpha = progress < 0.55 ? 1 : (1 - progress) / 0.45;
      const scale = 0.6 + 0.8 * clamp01(progress / 0.35);
      if (!sprite("EFFECT:PEPPERMINT_POP", point, scale, alpha)) {
        puff(point, 14 * zoom * scale, white, alpha);
        for (let index = 0; index < 6; index += 1) {
          const angle = (index / 6) * Math.PI * 2;
          sparkle(
            {
              x: point.x + Math.cos(angle) * 20 * zoom * scale,
              y: point.y + Math.sin(angle) * 14 * zoom * scale,
            },
            5 * zoom,
            alpha,
            index % 2 === 0 ? "#5fb891" : white,
          );
        }
      }
      if (feedback.amount !== undefined && feedback.amount > 0)
        float(
          { x: point.x, y: point.y - (40 + 18 * progress) * zoom },
          `−${feedback.amount}`,
          "#fff1d0",
          alpha,
        );
    }
  } else {
    // CRUMBS_EATEN: the pile scatters.
    for (const at of feedback.cells) {
      const point = ground(at);
      context.save();
      context.globalAlpha *= 1 - progress;
      context.strokeStyle = outline;
      context.lineWidth = Math.max(0.8, 1 * zoom);
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2 + 0.2;
        const reach = (6 + 22 * progress) * zoom;
        context.fillStyle = index % 2 === 0 ? biscuit : cream;
        context.beginPath();
        context.arc(
          point.x + Math.cos(angle) * reach,
          point.y +
            Math.sin(angle) * reach * 0.6 -
            10 * zoom * Math.sin(progress * Math.PI),
          Math.max(1.5, 3 * zoom),
          0,
          Math.PI * 2,
        );
        context.fill();
        context.stroke();
      }
      context.restore();
    }
  }
  context.restore();
}
