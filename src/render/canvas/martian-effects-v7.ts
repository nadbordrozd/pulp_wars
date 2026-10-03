import type { CoordV7 } from "../../engine/index";
import { MARTIAN_PALETTE_V7 } from "../../assets/chibi-direction-martian-presentation";
import type { MartianEffectIdV7 } from "../../assets/chibi-art-v7";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * Martian cues on the board's effects overlay (bead pulp_wars-t6s.4,
 * docs/art/factions/MARTIAN.md "Ability effects" and "Suggestions for the
 * code-drawn markers"). The beams are drawn in code, as MARTIAN.md
 * recommends (a long thin shape a 48 px raster cannot hold); the effect
 * sprites of the Martian art are drawn where they read well: the heat-ray
 * impact flash, the Shield flare, the Mind Control spiral, and the Beam
 * Down and Tractor Beam sprites as small end caps. Without a loaded sprite
 * (LEGACY, the classic look, still loading) each cue is code-drawn alone.
 * `progress` runs 0 to 1; reduced motion freezes a cue at its midpoint (the
 * host passes 0.5).
 */
export type MartianFeedbackEffectV7 =
  /** A heat ray from the shooter to its target (and a Pierce victim). */
  | "HEAT_RAY"
  /** A hit absorbed by a Shield: a crescent turned to the attacker. */
  | "SHIELD_FLARE"
  /** The Beam Down column on the arrival tile. */
  | "BEAM_DOWN"
  /** The Tractor Beam cone from the Mothership to the pulled unit. */
  | "TRACTOR_BEAM"
  /** The Mind Control spiral over the victim, and a ring round the Brain. */
  | "MIND_CONTROL"
  /** A Thrall collapsing when its Brain is lost. */
  | "THRALL_COLLAPSE";

export interface MartianFeedbackV7 {
  readonly effect: MartianFeedbackEffectV7;
  /** The cue's cells: the target(s), the arrival tile, the collapsing units. */
  readonly cells: readonly CoordV7[];
  /** The source: the shooter, the Saucer, the Mothership or the Brain. */
  readonly from?: CoordV7;
  /** HEAT_RAY: the Pierce victim's cell (a thinner second beam). */
  readonly pierce?: CoordV7;
  /** HEAT_RAY: a full-power ray (a wider beam). */
  readonly fullPower?: boolean;
  readonly progress: number;
}

/** The Martian effect sprites the host loads before the first cue. */
export const MARTIAN_EFFECT_SUBJECTS_V7: readonly `EFFECT:${MartianEffectIdV7}`[] =
  [
    "EFFECT:HEAT_RAY",
    "EFFECT:SHIELD_FLARE",
    "EFFECT:BEAM_DOWN",
    "EFFECT:TRACTOR_BEAM",
    "EFFECT:MIND_CONTROL",
  ];

const { magenta, magentaGlow, magentaPale, magentaDark, chrome } =
  MARTIAN_PALETTE_V7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 → 1 → 0 over the cue, with a flat top. */
function swell(progress: number): number {
  return clamp01(Math.min(progress / 0.25, (1 - progress) / 0.3));
}

export function drawMartianFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: MartianFeedbackV7,
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
    subject: `EFFECT:${MartianEffectIdV7}`,
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
  /** A glowing beam: a dark casing, the magenta body and a white core. */
  const beam = (
    from: { readonly x: number; readonly y: number },
    to: { readonly x: number; readonly y: number },
    width: number,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.lineCap = "round";
    for (const [colour, scale] of [
      [magentaDark, 1.9],
      [magenta, 1.2],
      [magentaGlow, 0.7],
      ["#ffffff", 0.3],
    ] as const) {
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, width * scale);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.restore();
  };
  /** The code-drawn impact flash: a pale star in a magenta ring. */
  const flash = (
    point: { readonly x: number; readonly y: number },
    radius: number,
    alpha: number,
  ): void => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = magentaGlow;
    context.strokeStyle = magentaDark;
    context.lineWidth = Math.max(1, radius * 0.12);
    context.beginPath();
    for (let spike = 0; spike < 12; spike += 1) {
      const r = spike % 2 === 0 ? radius : radius * 0.5;
      const angle = (spike / 12) * Math.PI * 2 - Math.PI / 2;
      const px = point.x + Math.cos(angle) * r;
      const py = point.y + Math.sin(angle) * r;
      if (spike === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(point.x, point.y, radius * 0.28, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };
  // The units' bodies are about 22 world units above the cell centre.
  const body = (at: CoordV7): { readonly x: number; readonly y: number } => {
    const point = centre(at);
    return { x: point.x, y: point.y - 22 * zoom };
  };
  context.save();
  if (feedback.effect === "HEAT_RAY") {
    const from = feedback.from;
    const target = feedback.cells[0];
    if (from !== undefined && target !== undefined) {
      const start = body(from);
      const end = body(target);
      // The beam reaches the target in the first third, holds, then fades.
      const reach = clamp01(progress / 0.3);
      const fade = clamp01((1 - progress) / 0.35);
      const tip = {
        x: start.x + (end.x - start.x) * reach,
        y: start.y + (end.y - start.y) * reach,
      };
      const width = (feedback.fullPower === true ? 6 : 3.5) * zoom;
      beam(start, tip, width, fade);
      if (reach >= 1) {
        const pierce = feedback.pierce;
        if (pierce !== undefined) beam(end, body(pierce), width * 0.55, fade);
        const impact = clamp01((progress - 0.3) / 0.7);
        const alpha = 1 - impact * 0.9;
        if (!sprite("EFFECT:HEAT_RAY", end, 1 + impact * 0.4, alpha))
          flash(end, (18 + 14 * impact) * zoom, alpha);
        if (pierce !== undefined) {
          const point = body(pierce);
          if (!sprite("EFFECT:HEAT_RAY", point, 0.55 + impact * 0.2, alpha))
            flash(point, (10 + 7 * impact) * zoom, alpha);
        }
      }
    }
  } else if (feedback.effect === "SHIELD_FLARE") {
    const alpha = swell(progress);
    for (const at of feedback.cells) {
      const point = body(at);
      const towards =
        feedback.from === undefined
          ? -Math.PI / 2
          : Math.atan2(
              centre(feedback.from).y - centre(at).y,
              centre(feedback.from).x - centre(at).x,
            );
      if (
        !sprite(
          "EFFECT:SHIELD_FLARE",
          point,
          1 + progress * 0.15,
          alpha,
          towards - Math.PI / 2,
        )
      ) {
        // A crescent of the Shield's magenta, turned to the attacker.
        context.save();
        context.globalAlpha *= alpha;
        context.lineCap = "round";
        for (const [colour, width] of [
          [magentaDark, 9],
          [magenta, 5],
          [magentaPale, 2],
        ] as const) {
          context.strokeStyle = colour;
          context.lineWidth = Math.max(1, width * zoom);
          context.beginPath();
          context.arc(
            point.x,
            point.y,
            (30 + 6 * progress) * zoom,
            towards - 0.9,
            towards + 0.9,
          );
          context.stroke();
        }
        context.restore();
      }
    }
  } else if (feedback.effect === "BEAM_DOWN") {
    const alpha = swell(progress);
    for (const at of feedback.cells) {
      const point = centre(at);
      // The column comes down from above the cell in the first third and
      // stands on the arrival tile while the unit appears.
      const width = 30 * zoom * (0.6 + 0.4 * alpha);
      const top = point.y - 150 * zoom;
      const ground =
        top + (point.y + 36 * zoom - top) * clamp01(progress / 0.3);
      context.save();
      context.globalAlpha *= alpha * 0.7;
      const gradient = context.createLinearGradient(0, top, 0, ground);
      gradient.addColorStop(0, "rgba(255, 143, 214, 0)");
      gradient.addColorStop(0.35, magentaGlow);
      gradient.addColorStop(1, magentaPale);
      context.fillStyle = gradient;
      context.fillRect(point.x - width / 2, top, width, ground - top);
      context.restore();
      // Sparkles rising inside the column.
      context.save();
      context.globalAlpha *= alpha;
      context.fillStyle = "#ffffff";
      for (const [dx, phase] of [
        [-0.3, 0],
        [0.25, 0.35],
        [0, 0.7],
      ] as const) {
        const rise = (progress + phase) % 1;
        context.fillRect(
          point.x + dx * width - zoom,
          ground - rise * (ground - top) - zoom,
          2.5 * zoom,
          2.5 * zoom,
        );
      }
      context.restore();
      // The ring at its foot: the sprite's ring as an end cap, else code.
      const foot = { x: point.x, y: ground - 4 * zoom };
      if (
        !sprite(
          "EFFECT:BEAM_DOWN",
          { x: foot.x, y: foot.y - 14 * zoom },
          1,
          alpha,
        )
      ) {
        context.save();
        context.globalAlpha *= alpha;
        context.strokeStyle = magenta;
        context.lineWidth = Math.max(1, 3 * zoom);
        context.beginPath();
        context.ellipse(foot.x, foot.y, 30 * zoom, 8 * zoom, 0, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
    }
  } else if (feedback.effect === "TRACTOR_BEAM") {
    const from = feedback.from;
    const target = feedback.cells[0];
    if (from !== undefined && target !== undefined) {
      const start = body(from);
      const end = centre(target);
      const alpha = swell(progress);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const spread = 30 * zoom;
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      context.save();
      context.globalAlpha *= alpha * 0.5;
      context.fillStyle = magentaGlow;
      context.beginPath();
      context.moveTo(start.x + nx * 5 * zoom, start.y + ny * 5 * zoom);
      context.lineTo(end.x + nx * spread, end.y + ny * spread);
      context.lineTo(end.x - nx * spread, end.y - ny * spread);
      context.lineTo(start.x - nx * 5 * zoom, start.y - ny * 5 * zoom);
      context.closePath();
      context.fill();
      context.restore();
      // Three white hoops moving toward the ship.
      context.save();
      context.globalAlpha *= alpha;
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(1, 2.2 * zoom);
      for (const phase of [0, 1 / 3, 2 / 3]) {
        const along = 1 - ((progress * 1.5 + phase) % 1);
        const px = start.x + (end.x - start.x) * along;
        const py = start.y + (end.y - start.y) * along;
        const radius = (5 + 25 * along) * zoom;
        context.beginPath();
        context.ellipse(px, py, radius * 0.35, radius, angle, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
      sprite("EFFECT:TRACTOR_BEAM", end, 0.8, alpha * 0.8, angle + Math.PI / 2);
    }
  } else if (feedback.effect === "MIND_CONTROL") {
    const alpha = swell(progress);
    if (feedback.from !== undefined) {
      const brain = body(feedback.from);
      context.save();
      context.globalAlpha *= alpha;
      context.strokeStyle = magentaGlow;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.beginPath();
      context.arc(brain.x, brain.y, (26 + 8 * progress) * zoom, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    for (const at of feedback.cells) {
      const point = body(at);
      if (
        !sprite(
          "EFFECT:MIND_CONTROL",
          point,
          1.2,
          alpha,
          progress * Math.PI * 2,
        )
      ) {
        context.save();
        context.globalAlpha *= alpha;
        context.strokeStyle = magenta;
        context.lineWidth = Math.max(1, 3 * zoom);
        context.beginPath();
        for (let index = 0; index <= 48; index += 1) {
          const t = index / 48;
          const angle = t * Math.PI * 5 + progress * Math.PI * 2;
          const radius = t * 26 * zoom;
          const px = point.x + Math.cos(angle) * radius;
          const py = point.y + Math.sin(angle) * radius;
          if (index === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.stroke();
        context.restore();
      }
    }
  } else if (feedback.effect === "THRALL_COLLAPSE") {
    const alpha = 1 - progress;
    for (const at of feedback.cells) {
      const point = body(at);
      // The control helmet's light goes out: a chrome ring shrinks, sparks
      // fall.
      context.save();
      context.globalAlpha *= alpha;
      context.strokeStyle = chrome;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.beginPath();
      context.arc(
        point.x,
        point.y - 10 * zoom,
        (22 - 14 * progress) * zoom,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.fillStyle = magenta;
      for (const dx of [-14, 0, 14])
        context.fillRect(
          point.x + dx * zoom - 1.5 * zoom,
          point.y + (-4 + 40 * progress) * zoom,
          3 * zoom,
          3 * zoom,
        );
      context.restore();
    }
  }
  context.restore();
}
