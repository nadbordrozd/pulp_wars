import type { CoordV7 } from "../../engine/index";
import {
  ICE_FOLK_PALETTE_V7,
  ICE_FOLK_SHATTER_TIMELINE_V7,
} from "../../assets/chibi-direction-ice-folk-presentation";
import type { IceFolkEffectIdV7 } from "../../assets/chibi-art-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * Ice Folk cues on the board's effects overlay (bead pulp_wars-7g3.6,
 * docs/art/factions/ICE_FOLK.md "Ability effects" and the Shatter
 * timeline). The effect sprites of the Ice Folk art are drawn where they
 * read well: the Shatter burst and its melting shards, the Cold Snap ring,
 * the thrown Bolas and the frost forming on a chilled unit. Without a
 * loaded sprite (LEGACY, the classic look, still loading) each cue is
 * code-drawn alone. `progress` runs 0 to 1 over the cue's duration
 * (ICE_FOLK_EFFECT_DURATIONS_V7); reduced motion freezes a cue at its
 * midpoint (the host passes 0.5).
 */
export type IceFolkFeedbackEffectV7 =
  /** A unit shattered: the burst and the shards (the casing is the board's). */
  | "SHATTER"
  /** A Cold Snap: the frost ring from the Witch, then frost on each target. */
  | "COLD_SNAP"
  /** A Bolas: the spinning bolas from the Sled, then frost on its target. */
  | "BOLAS"
  /** A Cold Aura: a flash over the Giant's eight tiles, frost on each target. */
  | "COLD_AURA"
  /** A Mammoth's Sweep: a white arc across the three tiles in front of it. */
  | "SWEEP"
  /**
   * The frozen sea (bead pulp_wars-5ti.7): a Freeze spreading over its
   * tiles, ice melting into floes, and the crush closing on a frozen ship.
   */
  | "ICE_FREEZE"
  | "ICE_MELT"
  | "ICE_CRUSH"
  /**
   * The naval branch: a boarded ship's flag changes from its former
   * owner's colour to its captor's (code-drawn, like the cues above; it
   * rides the same overlay step).
   */
  | "PRIZE_FLAG";

export interface IceFolkFeedbackV7 {
  readonly effect: IceFolkFeedbackEffectV7;
  /** The cue's cells: the shattered unit, the chilled units, the swept tiles. */
  readonly cells: readonly CoordV7[];
  /** The source: the Sled, the Witch, the Giant or the Mammoth. */
  readonly from?: CoordV7;
  /** SHATTER: the shattered unit (the board draws its casing until it bursts). */
  readonly unitId?: number;
  /** PRIZE_FLAG: the former owner's colour and the captor's. */
  readonly fromColour?: string;
  readonly toColour?: string;
  readonly progress: number;
}

/** The duration of each cue in ms (the Shatter's is its timeline's end). */
export const ICE_FOLK_EFFECT_DURATIONS_V7: Readonly<
  Record<IceFolkFeedbackEffectV7, number>
> = {
  SHATTER: Math.max(...ICE_FOLK_SHATTER_TIMELINE_V7.map((step) => step.toMs)),
  COLD_SNAP: 700,
  BOLAS: 560,
  COLD_AURA: 460,
  SWEEP: 300,
  ICE_FREEZE: 520,
  ICE_MELT: 480,
  ICE_CRUSH: 460,
  PRIZE_FLAG: 560,
};

/** The Shatter timeline's step boundaries, in ms from the hit. */
export const SHATTER_TIMES_V7 = (() => {
  const step = (name: string) => {
    const found = ICE_FOLK_SHATTER_TIMELINE_V7.find(
      (entry) => entry.step === name,
    );
    if (found === undefined) throw new Error(`Shatter step ${name} missing`);
    return found;
  };
  return {
    freeze: step("FREEZE"),
    crack: step("CRACK"),
    burst: step("BURST"),
    shards: step("SHARDS"),
  } as const;
})();

/** The Ice Folk effect sprites the host loads before the first cue. */
export const ICE_FOLK_EFFECT_SUBJECTS_V7: readonly `EFFECT:${IceFolkEffectIdV7}`[] =
  [
    "EFFECT:SHATTER",
    "EFFECT:SHATTER_SHARDS",
    "EFFECT:COLD_SNAP",
    "EFFECT:BOLAS",
    "EFFECT:FROST_HIT",
  ];

const { ice, iceGlow, icePale, iceDark, outline } = ICE_FOLK_PALETTE_V7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 → 1 → 0 over a span, with a flat top. */
function swell(progress: number): number {
  return clamp01(Math.min(progress / 0.25, (1 - progress) / 0.3));
}

/**
 * The board state of a Shatter at `elapsedMs`: the casing's height share,
 * the cracks' growth, the sprite's shake, and whether the sprite is gone.
 */
export function shatterBoardCueV7(elapsedMs: number): {
  readonly casing: boolean;
  readonly cracks: number;
  readonly shakeCssPx: number;
  readonly gone: boolean;
} {
  const { crack, burst } = SHATTER_TIMES_V7;
  if (elapsedMs >= burst.fromMs)
    return { casing: false, cracks: 0, shakeCssPx: 0, gone: true };
  const cracking = elapsedMs >= crack.fromMs;
  return {
    casing: true,
    cracks: cracking
      ? clamp01((elapsedMs - crack.fromMs) / (crack.toMs - crack.fromMs))
      : 0,
    shakeCssPx: cracking ? (Math.floor(elapsedMs / 30) % 2 === 0 ? 1 : -1) : 0,
    gone: false,
  };
}

export function drawIceFolkFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: IceFolkFeedbackV7,
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
    subject: `EFFECT:${IceFolkEffectIdV7}`,
    point: { readonly x: number; readonly y: number },
    scale: number,
    alpha: number,
    rotation = 0,
  ): boolean => {
    const image = art?.image(subject) ?? null;
    if (image === null) return false;
    if (alpha <= 0) return true;
    const size = step * scale;
    const width = image.width * size;
    const height = image.height * size;
    context.save();
    context.globalAlpha *= Math.min(1, alpha);
    context.imageSmoothingEnabled =
      rotation !== 0 || !isWholeScale(size * ratio);
    context.translate(point.x, point.y);
    context.rotate(rotation);
    context.drawImage(
      image.image,
      Math.round((-width / 2) * ratio) / ratio,
      Math.round((-height / 2) * ratio) / ratio,
      width,
      height,
    );
    context.restore();
    return true;
  };
  // The units' bodies are about 22 world units above the cell centre.
  const body = (at: CoordV7): { readonly x: number; readonly y: number } => {
    const point = centre(at);
    return { x: point.x, y: point.y - 22 * zoom };
  };
  /** Frost forming on a unit: the sprite, else a pale snowflake ring. */
  const frostHit = (at: CoordV7, local: number): void => {
    const alpha = swell(local);
    if (alpha <= 0) return;
    const point = body(at);
    if (sprite("EFFECT:FROST_HIT", point, 1.1 + 0.2 * local, alpha)) return;
    context.save();
    context.globalAlpha *= alpha;
    context.strokeStyle = icePale;
    context.lineWidth = Math.max(1, 3 * zoom);
    context.lineCap = "round";
    const radius = (16 + 10 * local) * zoom;
    for (let spoke = 0; spoke < 6; spoke += 1) {
      const angle = (spoke / 6) * Math.PI * 2 + local;
      context.beginPath();
      context.moveTo(
        point.x + Math.cos(angle) * radius * 0.35,
        point.y + Math.sin(angle) * radius * 0.35,
      );
      context.lineTo(
        point.x + Math.cos(angle) * radius,
        point.y + Math.sin(angle) * radius,
      );
      context.stroke();
    }
    context.restore();
  };
  context.save();
  if (feedback.effect === "SHATTER") {
    const elapsed = progress * ICE_FOLK_EFFECT_DURATIONS_V7.SHATTER;
    const { burst, shards } = SHATTER_TIMES_V7;
    for (const at of feedback.cells) {
      const point = body(at);
      if (elapsed >= burst.fromMs && elapsed <= burst.toMs) {
        const local = (elapsed - burst.fromMs) / (burst.toMs - burst.fromMs);
        // A white flash at the moment of the burst.
        if (local < 0.35) {
          context.save();
          context.globalAlpha *= 1 - local / 0.35;
          context.fillStyle = "#ffffff";
          context.beginPath();
          context.arc(
            point.x,
            point.y,
            (20 + 30 * local) * zoom,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.restore();
        }
        // An ice ring that snaps outward over the whole cell: the burst
        // reads at a glance, also at the small zoom steps.
        context.save();
        context.globalAlpha *= 1 - local;
        context.strokeStyle = iceGlow;
        context.lineWidth = Math.max(1, (5 - 3 * local) * zoom);
        context.beginPath();
        context.arc(point.x, point.y, (24 + 40 * local) * zoom, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        const alpha = 1 - 0.5 * local;
        if (!sprite("EFFECT:SHATTER", point, 0.7 + 0.55 * local, alpha)) {
          context.save();
          context.globalAlpha *= alpha;
          context.fillStyle = iceGlow;
          context.strokeStyle = iceDark;
          context.lineWidth = Math.max(1, 1.5 * zoom);
          const radius = (18 + 22 * local) * zoom;
          context.beginPath();
          for (let spike = 0; spike < 16; spike += 1) {
            const r = spike % 2 === 0 ? radius : radius * 0.45;
            const angle = (spike / 16) * Math.PI * 2;
            const px = point.x + Math.cos(angle) * r;
            const py = point.y + Math.sin(angle) * r;
            if (spike === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
          }
          context.closePath();
          context.fill();
          context.stroke();
          context.restore();
        }
      }
      if (elapsed >= shards.fromMs && elapsed <= shards.toMs) {
        const local = (elapsed - shards.fromMs) / (shards.toMs - shards.fromMs);
        const fall = 8 * step * local;
        const alpha = 1 - local;
        if (
          !sprite(
            "EFFECT:SHATTER_SHARDS",
            { x: point.x, y: point.y + fall },
            1 + 0.7 * local,
            alpha,
          )
        ) {
          // Code-drawn shards: small ice triangles flying out and falling.
          context.save();
          context.globalAlpha *= alpha;
          context.fillStyle = icePale;
          context.strokeStyle = ice;
          context.lineWidth = Math.max(0.8, zoom);
          for (let shard = 0; shard < 8; shard += 1) {
            const angle = (shard / 8) * Math.PI * 2 + 0.3;
            const distance = (14 + 34 * local) * zoom;
            const sx = point.x + Math.cos(angle) * distance;
            const sy = point.y + Math.sin(angle) * distance + fall;
            const size = 6 * zoom;
            context.beginPath();
            context.moveTo(sx, sy - size);
            context.lineTo(sx + size * 0.6, sy + size * 0.5);
            context.lineTo(sx - size * 0.6, sy + size * 0.5);
            context.closePath();
            context.fill();
            context.stroke();
          }
          context.restore();
        }
      }
    }
  } else if (feedback.effect === "COLD_SNAP") {
    const from = feedback.from;
    // The ring grows from the Witch's tile to five tiles across over the
    // first 450 ms, then frost forms on each target.
    const duration = ICE_FOLK_EFFECT_DURATIONS_V7.COLD_SNAP;
    const ringShare = 450 / duration;
    if (from !== undefined && progress <= ringShare + 0.08) {
      const local = clamp01(progress / ringShare);
      const point = centre(from);
      const cells = 1 + 4 * local;
      const alpha = local < 0.85 ? 1 : clamp01((1 - local) / 0.15 + 0.2);
      // The ring sprite is 48 master px; scale it to `cells` cells across.
      const scale = (cells * 80) / 48;
      if (!sprite("EFFECT:COLD_SNAP", point, scale, alpha * 0.9)) {
        context.save();
        context.globalAlpha *= alpha;
        context.strokeStyle = iceGlow;
        context.lineWidth = Math.max(1.5, 5 * zoom * (1 - local * 0.5));
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          (cells * 128 * zoom) / 2.2,
          0,
          Math.PI * 2,
        );
        context.stroke();
        context.strokeStyle = "#ffffff";
        context.lineWidth = Math.max(1, 2 * zoom);
        context.stroke();
        context.restore();
      }
    }
    const hit = (progress - (ringShare - 0.1)) / (1 - (ringShare - 0.1));
    if (hit > 0) for (const at of feedback.cells) frostHit(at, clamp01(hit));
  } else if (feedback.effect === "BOLAS") {
    const from = feedback.from;
    const target = feedback.cells[0];
    const flight = 0.55;
    if (from !== undefined && target !== undefined && progress < flight) {
      const local = progress / flight;
      const start = body(from);
      const end = body(target);
      const point = {
        x: start.x + (end.x - start.x) * local,
        y:
          start.y +
          (end.y - start.y) * local -
          Math.sin(Math.PI * local) * 40 * zoom,
      };
      if (!sprite("EFFECT:BOLAS", point, 1, 1, local * Math.PI * 6)) {
        // Two ice weights on a cord, spinning.
        const angle = local * Math.PI * 6;
        const arm = 12 * zoom;
        context.save();
        context.strokeStyle = "#e8dcc2";
        context.lineWidth = Math.max(1, 1.6 * zoom);
        context.beginPath();
        context.moveTo(
          point.x - Math.cos(angle) * arm,
          point.y - Math.sin(angle) * arm,
        );
        context.lineTo(
          point.x + Math.cos(angle) * arm,
          point.y + Math.sin(angle) * arm,
        );
        context.stroke();
        context.fillStyle = ice;
        context.strokeStyle = outline;
        for (const sign of [-1, 1]) {
          context.beginPath();
          context.arc(
            point.x + sign * Math.cos(angle) * arm,
            point.y + sign * Math.sin(angle) * arm,
            4.5 * zoom,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.stroke();
        }
        context.restore();
      }
    }
    if (target !== undefined && progress >= flight - 0.05)
      frostHit(
        target,
        clamp01((progress - (flight - 0.05)) / (1 - flight + 0.05)),
      );
  } else if (feedback.effect === "COLD_AURA") {
    const from = feedback.from;
    if (from !== undefined && progress < 0.5) {
      // A 200 ms ice-glow flash over the Giant's eight tiles.
      const alpha = swell(progress / 0.5) * 0.3;
      context.save();
      context.globalAlpha *= alpha;
      context.fillStyle = iceGlow;
      const size = 128 * zoom;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const point = centre({ x: from.x + dx, y: from.y + dy });
          context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        }
      context.restore();
    }
    if (progress >= 0.3)
      for (const at of feedback.cells)
        frostHit(at, clamp01((progress - 0.3) / 0.7));
  } else if (feedback.effect === "SWEEP") {
    const from = feedback.from;
    const middle = feedback.cells[0];
    if (from !== undefined && middle !== undefined) {
      const origin = body(from);
      const angleTo = (at: CoordV7): number => {
        const point = body(at);
        return Math.atan2(point.y - origin.y, point.x - origin.x);
      };
      const mid = angleTo(middle);
      const spread = Math.PI / 4 + 0.2;
      const startAngle = mid - spread;
      const sweep = 2 * spread * clamp01(progress / 0.7);
      const alpha = 1 - clamp01((progress - 0.6) / 0.4);
      const radius = 118 * zoom;
      context.save();
      context.globalAlpha *= alpha;
      context.lineCap = "round";
      for (const [colour, width] of [
        [iceDark, 14],
        ["#ffffff", 8],
      ] as const) {
        context.strokeStyle = colour;
        context.lineWidth = Math.max(1, width * zoom);
        context.beginPath();
        context.arc(origin.x, origin.y, radius, startAngle, startAngle + sweep);
        context.stroke();
      }
      context.restore();
    }
  } else if (feedback.effect === "ICE_FREEZE") {
    // The frozen sea: frost spreads from the Freezing unit, tile by tile
    // (the nearest first), as a pale wash that settles into the new ice.
    const from = feedback.from;
    const size = 128 * zoom;
    const ordered = [...feedback.cells].sort((left, right) => {
      if (from === undefined) return 0;
      const distance = (at: CoordV7): number =>
        Math.max(Math.abs(at.x - from.x), Math.abs(at.y - from.y));
      return distance(left) - distance(right);
    });
    ordered.forEach((at, index) => {
      const start = (index / Math.max(1, ordered.length)) * 0.45;
      const local = clamp01((progress - start) / 0.55);
      if (local <= 0 || local >= 1) return;
      const point = centre(at);
      context.save();
      context.globalAlpha *= swell(local) * 0.75;
      context.fillStyle = "#ffffff";
      const grown = size * (0.35 + 0.65 * local);
      context.fillRect(point.x - grown / 2, point.y - grown / 2, grown, grown);
      context.strokeStyle = iceGlow;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.lineCap = "round";
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = (spoke / 6) * Math.PI * 2;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(
          point.x + Math.cos(angle) * grown * 0.42,
          point.y + Math.sin(angle) * grown * 0.42,
        );
        context.stroke();
      }
      context.restore();
    });
  } else if (feedback.effect === "ICE_MELT") {
    // The ice gives way: a fading pale sheet that breaks into drifting
    // floes over the open water.
    const size = 128 * zoom;
    for (const at of feedback.cells) {
      const point = centre(at);
      context.save();
      context.globalAlpha *= (1 - progress) * 0.7;
      context.fillStyle = icePale;
      const drift = progress * 14 * zoom;
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const floe = size * (0.4 - 0.18 * progress);
        context.fillRect(
          point.x + dx * (size * 0.22 + drift) - floe / 2,
          point.y + dy * (size * 0.22 + drift) - floe / 2,
          floe,
          floe,
        );
      }
      context.restore();
    }
  } else if (feedback.effect === "ICE_CRUSH") {
    // The crush: cracks snap across each frozen ship's tile and the ice
    // closes in from both sides.
    const size = 128 * zoom;
    for (const at of feedback.cells) {
      const point = centre(at);
      const squeeze = swell(progress) * 14 * zoom;
      context.save();
      context.globalAlpha *= 1 - clamp01((progress - 0.7) / 0.3);
      context.fillStyle = "#ffffff";
      for (const side of [-1, 1] as const)
        context.fillRect(
          point.x + side * (size * 0.36 - squeeze) - 5 * zoom,
          point.y - size * 0.05,
          10 * zoom,
          size * 0.42,
        );
      context.strokeStyle = iceDark;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.lineCap = "round";
      context.lineJoin = "round";
      const reach = clamp01(progress / 0.5);
      for (const side of [-1, 1] as const) {
        context.beginPath();
        context.moveTo(point.x, point.y + size * 0.18);
        context.lineTo(
          point.x + side * size * 0.16 * reach,
          point.y + size * (0.18 - 0.1 * reach),
        );
        context.lineTo(
          point.x + side * size * 0.3 * reach,
          point.y + size * (0.18 + 0.06 * reach),
        );
        context.stroke();
      }
      context.restore();
    }
  } else if (feedback.effect === "PRIZE_FLAG") {
    // The naval branch: a boarded ship's flag changes. The old colour's
    // pennant drops and the captor's rises on a short mast over the hull.
    for (const at of feedback.cells) {
      const point = body(at);
      const mastTop = point.y - 34 * zoom;
      const mastFoot = point.y + 6 * zoom;
      context.save();
      context.globalAlpha *= 1 - clamp01((progress - 0.8) / 0.2);
      context.strokeStyle = outline;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(point.x, mastFoot);
      context.lineTo(point.x, mastTop);
      context.stroke();
      const pennant = (colour: string, heightShare: number): void => {
        const y = mastFoot + (mastTop - mastFoot) * heightShare;
        context.fillStyle = colour;
        context.strokeStyle = outline;
        context.lineWidth = Math.max(1, 1.5 * zoom);
        context.beginPath();
        context.moveTo(point.x, y);
        context.lineTo(point.x + 22 * zoom, y + 7 * zoom);
        context.lineTo(point.x, y + 14 * zoom);
        context.closePath();
        context.fill();
        context.stroke();
      };
      // The old flag comes down in the first half, the new one goes up.
      if (progress < 0.5)
        pennant(feedback.fromColour ?? "#9c968a", 1 - progress * 2);
      else pennant(feedback.toColour ?? "#ffffff", (progress - 0.5) * 2);
      context.restore();
    }
  }
  context.restore();
}
