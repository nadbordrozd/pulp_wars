import type { CoordV7 } from "../../engine/index";
import {
  DWARF_BOMB_TIMELINE_V7,
  DWARF_ERUPTION_TIMELINE_V7,
  DWARF_PALETTE_V7,
} from "../../assets/chibi-direction-dwarf-presentation";
import type { DwarfEffectIdV7 } from "../../assets/chibi-art-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * Dwarf cues on the board's effects overlay (bead pulp_wars-78i.6,
 * docs/art/factions/DWARF.md "The mound and the eruption" and "Effects").
 * The four effect sprites of the Dwarf art (EFFECT:ERUPTION,
 * EFFECT:BOMB_BLAST, EFFECT:STEAM_PUFF, EFFECT:REPAIR_SPARKS) are drawn
 * where they read well; without a loaded sprite (LEGACY, the classic look,
 * still loading) each cue is code-drawn alone. `progress` runs 0 to 1 over
 * the cue's duration (DWARF_EFFECT_DURATIONS_V7). The eruption follows
 * DWARF_ERUPTION_TIMELINE_V7 (the burst at the Mole, smaller bursts round
 * its eight tiles clockwise from the north, a dust puff); the bomb follows
 * the fall and blast of DWARF_BOMB_TIMELINE_V7 (the flight is the
 * Gyrocopter's own move). The timelines' 1 px board and mound shakes are
 * left out: the cues stay calm.
 */
export type DwarfFeedbackEffectV7 =
  /** A Mole dives in: dirt and steam at its start, a trail to its mound. */
  | "TUNNEL"
  /** A Mole surfaces: the burst, the ring over its eight tiles, the dust. */
  | "ERUPTION"
  /** A Gyrocopter's bomb falls on its target and blasts. */
  | "BOMB"
  /** An Engineer winds up a new Clockwork Gunner: a key turning, steam. */
  | "ASSEMBLE"
  /** An Engineer's Repair: sparks on each repaired unit. */
  | "REPAIR"
  /** A Steam Cannon's Knockback: a puff where the target lands. */
  | "KNOCKBACK"
  /**
   * Dwarf crowd control (`pulp_wars-w49.34`): a Whirligig's Whirl (spinning
   * hammer arcs round it, then a hit flash on every target), a Barricade
   * built (earth and steam), and a Barricade hit (flying splinters).
   */
  | "WHIRL"
  | "BARRICADE"
  | "SPLINTERS";

export interface DwarfFeedbackV7 {
  readonly effect: DwarfFeedbackEffectV7;
  /**
   * The cue's cells: TUNNEL the Mole's start then its mound (and the
   * rider's), ERUPTION the Mole's tile, BOMB the target, ASSEMBLE the new
   * Gunner, REPAIR the repaired units, KNOCKBACK the landing tile, WHIRL
   * the Whirligig then every unit it hit, BARRICADE the new Barricade,
   * SPLINTERS the Barricade hit.
   */
  readonly cells: readonly CoordV7[];
  /** The source: the Engineer (ASSEMBLE), the Gyrocopter's landing (BOMB). */
  readonly from?: CoordV7;
  readonly progress: number;
}

/** The duration of each cue in ms. */
export const DWARF_EFFECT_DURATIONS_V7: Readonly<
  Record<DwarfFeedbackEffectV7, number>
> = {
  TUNNEL: 560,
  ERUPTION: DWARF_ERUPTION_TIMELINE_V7.end,
  BOMB: DWARF_BOMB_TIMELINE_V7.end - DWARF_BOMB_TIMELINE_V7.fall.from,
  ASSEMBLE: 520,
  REPAIR: 480,
  KNOCKBACK: 320,
  WHIRL: 560,
  BARRICADE: 480,
  SPLINTERS: 360,
};

/** The progress a reduced-motion hold shows: the eruption's peak frame. */
export function dwarfReducedMotionProgressV7(
  effect: DwarfFeedbackEffectV7,
): number {
  return effect === "ERUPTION"
    ? DWARF_ERUPTION_TIMELINE_V7.peak / DWARF_ERUPTION_TIMELINE_V7.end
    : 0.5;
}

/** The Dwarf effect sprites the host loads before the first cue. */
export const DWARF_EFFECT_SUBJECTS_V7: readonly `EFFECT:${DwarfEffectIdV7}`[] =
  [
    "EFFECT:ERUPTION",
    "EFFECT:BOMB_BLAST",
    "EFFECT:STEAM_PUFF",
    "EFFECT:REPAIR_SPARKS",
  ];

/** The eight neighbours clockwise from the north (the ring's stagger). */
export const ERUPTION_RING_ORDER_V7: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

const { earthDark, earth, earthLight, steam, copper, outline } =
  DWARF_PALETTE_V7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 → 1 → 0 over a span, with a flat top. */
function swell(progress: number): number {
  return clamp01(Math.min(progress / 0.25, (1 - progress) / 0.3));
}

/** Alpha that holds until `fadeFrom` of a phase, then fades to 0. */
function holdThenFade(local: number, fadeFrom: number): number {
  return local <= fadeFrom ? 1 : clamp01((1 - local) / (1 - fadeFrom));
}

/**
 * The eruption's state at `elapsedMs` (DWARF_ERUPTION_TIMELINE_V7): whether
 * the units are back (the board shows the view after), and the shares of
 * the burst, the ring bursts and the dust.
 */
export function eruptionCueV7(elapsedMs: number): {
  readonly surfaced: boolean;
  readonly burst: number | null;
  readonly ring: readonly (number | null)[];
  readonly dust: number | null;
  readonly hit: boolean;
} {
  const t = DWARF_ERUPTION_TIMELINE_V7;
  const phase = (from: number, to: number): number | null =>
    elapsedMs < from || elapsedMs > to
      ? null
      : (elapsedMs - from) / (to - from);
  return {
    surfaced: elapsedMs >= t.surface,
    burst: phase(t.burst.from, t.burst.to),
    ring: ERUPTION_RING_ORDER_V7.map((_, index) => {
      const from = t.ring.from + index * t.ring.stagger;
      return phase(from, from + t.ring.duration);
    }),
    dust: phase(t.dust.from, t.dust.to),
    hit: elapsedMs >= t.hit,
  };
}

export function drawDwarfFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: DwarfFeedbackV7,
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
    subject: `EFFECT:${DwarfEffectIdV7}`,
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
    }
    context.restore();
  };
  /** A code-drawn burst of earth clods round a point. */
  const clods = (
    point: { readonly x: number; readonly y: number },
    radius: number,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.strokeStyle = outline;
    context.lineWidth = Math.max(0.8, 1.2 * zoom);
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2 + 0.4;
      const distance = radius * (index % 2 === 0 ? 1 : 0.65);
      context.fillStyle = index % 3 === 0 ? earthLight : earth;
      context.beginPath();
      context.arc(
        point.x + Math.cos(angle) * distance,
        point.y + Math.sin(angle) * distance * 0.7,
        Math.max(1.5, radius * 0.16),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
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
  context.save();
  if (feedback.effect === "ERUPTION") {
    const t = DWARF_ERUPTION_TIMELINE_V7;
    const elapsed = progress * t.end;
    const cue = eruptionCueV7(elapsed);
    for (const at of feedback.cells) {
      const point = ground(at);
      if (cue.dust !== null) {
        const local = cue.dust;
        const scale =
          t.dust.scaleFrom + (t.dust.scaleTo - t.dust.scaleFrom) * local;
        const lifted = { x: point.x, y: point.y - t.dust.rise * step * local };
        if (!sprite("EFFECT:STEAM_PUFF", lifted, scale, 0.8 * (1 - local)))
          puff(lifted, 14 * zoom * scale, steam, 0.6 * (1 - local));
      }
      cue.ring.forEach((local, index) => {
        if (local === null) return;
        const offset = ERUPTION_RING_ORDER_V7[index];
        if (offset === undefined) return;
        const cell = ground({ x: at.x + offset[0], y: at.y + offset[1] });
        const scale =
          t.ring.scaleFrom + (t.ring.scaleTo - t.ring.scaleFrom) * local;
        const lifted = { x: cell.x, y: cell.y - t.ring.rise * step * local };
        const alpha = t.ring.alphaFrom * holdThenFade(local, t.ring.fadeFrom);
        if (!sprite("EFFECT:ERUPTION", lifted, scale, alpha))
          clods(lifted, 16 * zoom * scale, alpha);
      });
      if (cue.burst !== null) {
        const local = cue.burst;
        const scale =
          t.burst.scaleFrom + (t.burst.scaleTo - t.burst.scaleFrom) * local;
        const lifted = { x: point.x, y: point.y - t.burst.rise * step * local };
        const alpha = t.burst.alphaFrom * holdThenFade(local, t.burst.fadeFrom);
        if (!sprite("EFFECT:ERUPTION", lifted, scale, alpha)) {
          clods(lifted, 24 * zoom * scale, alpha);
          puff(lifted, 10 * zoom * scale, earthDark, alpha * 0.8);
        }
      }
    }
  } else if (feedback.effect === "BOMB") {
    const t = DWARF_BOMB_TIMELINE_V7;
    const elapsed = t.fall.from + progress * DWARF_EFFECT_DURATIONS_V7.BOMB;
    const target = feedback.cells[0];
    if (target !== undefined) {
      const point = body(target);
      if (elapsed < t.fall.to) {
        // The bomb: a black ball with a copper band, falling 24 px.
        const local = (elapsed - t.fall.from) / (t.fall.to - t.fall.from);
        const y = point.y - t.fall.drop * step * (1 - local) - 10 * zoom;
        const radius = 6 * zoom;
        context.save();
        context.fillStyle = "#18191d";
        context.strokeStyle = outline;
        context.lineWidth = Math.max(0.8, 1.2 * zoom);
        context.beginPath();
        context.arc(point.x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.strokeStyle = copper;
        context.lineWidth = Math.max(0.8, 1.6 * zoom);
        context.beginPath();
        context.moveTo(point.x - radius, y);
        context.lineTo(point.x + radius, y);
        context.stroke();
        context.restore();
      }
      if (elapsed >= t.blast.from) {
        const local = (elapsed - t.blast.from) / (t.blast.to - t.blast.from);
        const scale =
          t.blast.scaleFrom + (t.blast.scaleTo - t.blast.scaleFrom) * local;
        const alpha = holdThenFade(local, 0.5);
        if (!sprite("EFFECT:BOMB_BLAST", point, scale * 1.4, alpha)) {
          puff(point, 18 * zoom * scale, "#f6c06a", alpha);
          puff(point, 10 * zoom * scale, "#fff1c9", alpha);
        }
        if (local > 0.35)
          sprite(
            "EFFECT:STEAM_PUFF",
            { x: point.x, y: point.y - 14 * step * local },
            1 + local,
            0.7 * (1 - local),
          );
      }
    }
  } else if (feedback.effect === "TUNNEL") {
    const [from, to, riderFrom, riderTo] = feedback.cells;
    const pairs: (readonly [CoordV7 | undefined, CoordV7 | undefined])[] = [
      [from, to],
      [riderFrom, riderTo],
    ];
    for (const [start, end] of pairs) {
      if (start !== undefined && progress < 0.6) {
        // The dive: dirt thrown up and a steam puff at the start.
        const local = progress / 0.6;
        const point = ground(start);
        clods(point, (12 + 14 * local) * zoom, 1 - local);
        if (
          !sprite(
            "EFFECT:STEAM_PUFF",
            { x: point.x, y: point.y - 10 * zoom * local },
            1 + local,
            0.85 * (1 - local),
          )
        )
          puff(point, 12 * zoom, steam, 0.6 * (1 - local));
      }
      if (start !== undefined && end !== undefined) {
        // The trail: a dotted dirt line from the start to the mound.
        const a = ground(start);
        const b = ground(end);
        const local = clamp01((progress - 0.15) / 0.6);
        const alpha = progress > 0.8 ? clamp01((1 - progress) / 0.2) : 1;
        context.save();
        context.globalAlpha *= alpha;
        context.strokeStyle = earth;
        context.lineCap = "round";
        context.lineWidth = Math.max(2, 5 * zoom);
        context.setLineDash([2 * zoom, 9 * zoom]);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(a.x + (b.x - a.x) * local, a.y + (b.y - a.y) * local);
        context.stroke();
        context.restore();
      }
      if (end !== undefined && progress >= 0.7) {
        const local = (progress - 0.7) / 0.3;
        clods(ground(end), (10 + 10 * local) * zoom, 1 - local);
      }
    }
  } else if (feedback.effect === "ASSEMBLE") {
    const at = feedback.cells[0];
    if (at !== undefined) {
      const point = body(at);
      // A wind-up key turning over the new Gunner, then a puff of steam.
      if (progress < 0.7) {
        const local = progress / 0.7;
        const angle = local * Math.PI * 3;
        const key = { x: point.x + 14 * zoom, y: point.y - 4 * zoom };
        context.save();
        context.globalAlpha *= swell(local);
        context.translate(key.x, key.y);
        context.rotate(angle);
        context.fillStyle = copper;
        context.strokeStyle = outline;
        context.lineWidth = Math.max(0.8, 1.4 * zoom);
        for (const sign of [-1, 1]) {
          context.beginPath();
          context.ellipse(
            sign * 7 * zoom,
            0,
            6 * zoom,
            4 * zoom,
            0,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.stroke();
        }
        context.fillRect(-1.5 * zoom, -1.5 * zoom, 3 * zoom, 10 * zoom);
        context.restore();
      }
      if (progress >= 0.35) {
        const local = (progress - 0.35) / 0.65;
        const lifted = { x: point.x, y: point.y - 16 * step * local };
        if (!sprite("EFFECT:STEAM_PUFF", lifted, 1 + local, 1 - local))
          puff(lifted, 14 * zoom * (1 + local), steam, 0.7 * (1 - local));
      }
    }
  } else if (feedback.effect === "REPAIR") {
    for (const at of feedback.cells) {
      const point = body(at);
      const alpha = swell(progress);
      if (!sprite("EFFECT:REPAIR_SPARKS", point, 1 + 0.3 * progress, alpha)) {
        context.save();
        context.globalAlpha *= alpha;
        context.strokeStyle = "#ffe08a";
        context.lineWidth = Math.max(1, 2 * zoom);
        context.lineCap = "round";
        for (let spark = 0; spark < 6; spark += 1) {
          const angle = (spark / 6) * Math.PI * 2 + progress * 2;
          const inner = 6 * zoom;
          const outer = (14 + 10 * progress) * zoom;
          context.beginPath();
          context.moveTo(
            point.x + Math.cos(angle) * inner,
            point.y + Math.sin(angle) * inner,
          );
          context.lineTo(
            point.x + Math.cos(angle) * outer,
            point.y + Math.sin(angle) * outer,
          );
          context.stroke();
        }
        context.restore();
      }
    }
  } else if (feedback.effect === "WHIRL") {
    const [whirligig, ...targets] = feedback.cells;
    if (whirligig !== undefined) {
      // Three broad hammer swooshes sweep round the Whirligig over its
      // eight tiles, widening as it spins: dark under, steam, copper edge.
      const point = body(whirligig);
      const alpha = clamp01(Math.min(progress / 0.12, (1 - progress) / 0.35));
      const radius = (52 + 22 * progress) * zoom;
      context.save();
      context.globalAlpha *= alpha;
      context.lineCap = "round";
      for (let arc = 0; arc < 3; arc += 1) {
        const start = progress * Math.PI * 3 + (arc * Math.PI * 2) / 3;
        for (const [colour, width] of [
          [outline, 15],
          [steam, 10],
          [copper, 4],
        ] as const) {
          context.strokeStyle = colour;
          context.lineWidth = Math.max(1.5, width * zoom);
          context.beginPath();
          context.ellipse(
            point.x,
            point.y + 14 * zoom,
            radius,
            radius * 0.6,
            0,
            start,
            start + Math.PI * 0.42,
          );
          context.stroke();
        }
      }
      context.restore();
    }
    // Each target flashes as the hammers land: a burst of rays.
    if (progress >= 0.3) {
      const local = (progress - 0.3) / 0.7;
      for (const at of targets) {
        const point = body(at);
        context.save();
        context.globalAlpha *= clamp01((1 - local) * 1.4);
        context.lineCap = "round";
        for (const [colour, width] of [
          [outline, 7],
          ["#fff1c9", 4],
        ] as const) {
          context.strokeStyle = colour;
          context.lineWidth = Math.max(1.5, width * zoom);
          for (let ray = 0; ray < 8; ray += 1) {
            const angle = (ray / 8) * Math.PI * 2 + 0.2;
            const inner = (10 + 8 * local) * zoom;
            const outer = (26 + 16 * local) * zoom;
            context.beginPath();
            context.moveTo(
              point.x + Math.cos(angle) * inner,
              point.y + Math.sin(angle) * inner,
            );
            context.lineTo(
              point.x + Math.cos(angle) * outer,
              point.y + Math.sin(angle) * outer,
            );
            context.stroke();
          }
        }
        context.restore();
      }
    }
  } else if (feedback.effect === "BARRICADE") {
    // Earth thrown up as the stakes go in, then a puff of steam.
    const at = feedback.cells[0];
    if (at !== undefined) {
      const point = ground(at);
      clods(point, (14 + 18 * progress) * zoom, 1 - progress);
      const lifted = { x: point.x, y: point.y - 18 * step * progress };
      if (
        !sprite("EFFECT:STEAM_PUFF", lifted, 1 + progress, 0.9 * (1 - progress))
      )
        puff(lifted, 14 * zoom * (1 + progress), steam, 0.7 * (1 - progress));
    }
  } else if (feedback.effect === "SPLINTERS") {
    // Splinters of timber fly off the Barricade that was hit, with a puff
    // of its earth.
    const at = feedback.cells[0];
    if (at !== undefined) {
      const point = body(at);
      clods(ground(at), (16 + 14 * progress) * zoom, 1 - progress);
      context.save();
      context.globalAlpha *= clamp01((1 - progress) * 1.3);
      context.strokeStyle = outline;
      context.lineWidth = Math.max(1, 2 * zoom);
      for (let chip = 0; chip < 12; chip += 1) {
        const angle = (chip / 12) * Math.PI * 2 + 0.3;
        const distance =
          (14 + 46 * progress) * zoom * (chip % 2 === 0 ? 1 : 0.72);
        const cx = point.x + Math.cos(angle) * distance;
        const cy =
          point.y +
          Math.sin(angle) * distance * 0.75 +
          26 * zoom * progress ** 2;
        context.save();
        context.translate(cx, cy);
        context.rotate(angle + progress * 7);
        context.fillStyle = chip % 3 === 0 ? "#b9844f" : "#8d5c34";
        context.beginPath();
        context.rect(-9 * zoom, -2.5 * zoom, 18 * zoom, 5 * zoom);
        context.fill();
        context.stroke();
        context.restore();
      }
      context.restore();
    }
  } else {
    // KNOCKBACK: a puff of steam where the target lands.
    const at = feedback.cells[0];
    if (at !== undefined) {
      const point = ground(at);
      const lifted = { x: point.x, y: point.y - 10 * step * progress };
      if (
        !sprite("EFFECT:STEAM_PUFF", lifted, 0.9 + 0.6 * progress, 1 - progress)
      )
        puff(lifted, 12 * zoom * (1 + progress), steam, 0.7 * (1 - progress));
    }
  }
  context.restore();
}
