import type { CultEffectIdV7 } from "../../assets/chibi-art-v7";
import type { CoordV7 } from "../../engine/index";
import { chibiMasterScale } from "./chibi-geometry-v7";
import { CULT_PALETTE_V7, drawCultStrandV7 } from "./cult-channel-canvas-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * The cues of the Cult's channel (bead `pulp_wars-mch9.18`;
 * docs/product/RULESET_7_CULTISTS.md section 14.3, docs/art/factions/CULT.md
 * "Effects"), drawn on the board's effects overlay in `CULT_PALETTE_V7`:
 *
 * - **SUMMON:** a green ring bursts upward from the tile with cream stars.
 * - **STRAND_FORMED:** a bright bead runs along the new strand from the
 *   channeller (`from`) to its daemon.
 * - **STRAND_SNAP:** the strand that was flashes red and its two halves
 *   recoil from a parted link.
 * - **IDOL:** the chalk ring spreads from the Idol Bearer to its eight
 *   tiles.
 * - **BOO:** a ring of startle lines jumps out of the Horror.
 * - **UNBOUND:** the collar bursts: a red ring and chain links flying.
 *
 * `progress` runs 0 to 1; reduced motion holds one still frame of each
 * (`cultReducedMotionProgressV7`) where the cue reads. Each cue also asks
 * for its `EFFECT:*` sprite and draws it over the code-drawn shape when the
 * art has registered one.
 */
export type CultFeedbackEffectV7 =
  "SUMMON" | "STRAND_FORMED" | "STRAND_SNAP" | "IDOL" | "BOO" | "UNBOUND";

export interface CultFeedbackV7 {
  readonly effect: CultFeedbackEffectV7;
  /** The cue's cells: the daemon's tile, the Horror's, the Idol Bearer's. */
  readonly cells: readonly CoordV7[];
  /** STRAND_FORMED and STRAND_SNAP: the channeller's cell. */
  readonly from?: CoordV7;
  readonly progress: number;
}

export const CULT_EFFECT_DURATIONS_V7: Readonly<
  Record<CultFeedbackEffectV7, number>
> = {
  SUMMON: 420,
  STRAND_FORMED: 260,
  STRAND_SNAP: 380,
  IDOL: 320,
  BOO: 360,
  UNBOUND: 620,
};

/** The still frame of each cue under reduced motion. */
export function cultReducedMotionProgressV7(
  effect: CultFeedbackEffectV7,
): number {
  return effect === "STRAND_SNAP"
    ? 0.3
    : effect === "STRAND_FORMED"
      ? 0.5
      : 0.45;
}

/** The sprite each cue asks the art for (docs/art/factions/CULT.md). */
export const CULT_EFFECT_SPRITES_V7: Readonly<
  Partial<Record<CultFeedbackEffectV7, `EFFECT:${CultEffectIdV7}`>>
> = {
  SUMMON: "EFFECT:SUMMON_POP",
  STRAND_SNAP: "EFFECT:STRAND_SNAP",
  BOO: "EFFECT:BOO",
  UNBOUND: "EFFECT:UNBOUND",
};

/** The channel cues' sprites, loaded only in a match with a Cult seat. */
export const CULT_EFFECT_SUBJECTS_V7: readonly `EFFECT:${CultEffectIdV7}`[] =
  Object.values(CULT_EFFECT_SPRITES_V7);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface Point {
  readonly x: number;
  readonly y: number;
}

function ring(
  context: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  colour: string,
  width: number,
  alpha: number,
  squash = 1,
): void {
  if (alpha <= 0 || radius <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  for (const [stroke, lineWidth] of [
    [CULT_PALETTE_V7.casing, width * 2],
    [colour, width],
  ] as const) {
    context.strokeStyle = stroke;
    context.lineWidth = Math.max(1, lineWidth);
    context.beginPath();
    context.ellipse(
      point.x,
      point.y,
      radius,
      radius * squash,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();
}

/** A small four-pointed star. */
function star(
  context: CanvasRenderingContext2D,
  point: Point,
  size: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = CULT_PALETTE_V7.wax;
  context.strokeStyle = CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(0.8, size * 0.16);
  context.lineJoin = "round";
  context.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const radius = index % 2 === 0 ? size : size * 0.38;
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
    const x = point.x + Math.cos(angle) * radius;
    const y = point.y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

/** Half a chain link: an open arc, flung at `angle`. */
function halfLink(
  context: CanvasRenderingContext2D,
  point: Point,
  size: number,
  angle: number,
  colour: string,
  alpha: number,
): void {
  if (alpha <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.lineCap = "round";
  for (const [stroke, width] of [
    [CULT_PALETTE_V7.casing, size * 0.62],
    [colour, size * 0.32],
  ] as const) {
    context.strokeStyle = stroke;
    context.lineWidth = Math.max(1, width);
    context.beginPath();
    context.arc(0, 0, size * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
    context.stroke();
  }
  context.restore();
}

export function drawCultFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: CultFeedbackV7,
  art: SupportEffectArtV7 | null = null,
): void {
  // Cue sizes are tuned on a 128-unit cell and drawn 1.35x, so each cue
  // reads at the smallest zoom; a strand keeps the board's own scale.
  const boardZoom = camera.zoom;
  const zoom = boardZoom * 1.35;
  const progress = clamp01(feedback.progress);
  const centre = (at: CoordV7): Point => worldToScreen(projectGrid(at), camera);
  const step = chibiMasterScale(camera);
  const ratio =
    (art?.devicePixelRatio ?? 1) > 0 ? (art?.devicePixelRatio ?? 1) : 1;
  /** The cue's registered sprite, centred on a point; false without one. */
  const sprite = (point: Point, scale: number, alpha: number): boolean => {
    const subject = CULT_EFFECT_SPRITES_V7[feedback.effect];
    const image = subject === undefined ? null : (art?.image(subject) ?? null);
    if (image === null) return false;
    if (alpha <= 0) return true;
    const size = step * scale;
    const width = image.width * size;
    const height = image.height * size;
    context.save();
    context.globalAlpha *= Math.min(1, alpha);
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
  // Vivid for most of its time, then gone.
  const fade = 1 - progress ** 2.5;
  context.save();
  context.setLineDash([]);
  for (const at of feedback.cells) {
    const point = centre(at);
    if (feedback.effect === "SUMMON") {
      // The ring rises and widens; four stars fly up with it.
      const lift = 34 * progress * zoom;
      ring(
        context,
        { x: point.x, y: point.y + 24 * zoom - lift },
        (18 + 34 * progress) * zoom,
        CULT_PALETTE_V7.flame,
        3.2 * zoom,
        fade,
        0.42,
      );
      ring(
        context,
        { x: point.x, y: point.y + 24 * zoom },
        (14 + 40 * progress) * zoom,
        CULT_PALETTE_V7.glow,
        2 * zoom,
        fade * 0.8,
        0.42,
      );
      for (const [dx, rise] of [
        [-30, 46],
        [-10, 64],
        [14, 58],
        [32, 42],
      ] as const)
        star(
          context,
          {
            x: point.x + dx * zoom,
            y: point.y + (16 - rise * progress) * zoom,
          },
          6 * zoom,
          fade,
        );
      sprite({ x: point.x, y: point.y - lift * 0.5 }, 1 + progress * 0.4, fade);
    } else if (feedback.effect === "STRAND_FORMED") {
      if (feedback.from === undefined) continue;
      // A bead of light runs down the chain to the daemon.
      const from = centre(feedback.from);
      const a = { x: from.x, y: from.y - 12 * boardZoom };
      const b = { x: point.x, y: point.y - 4 * boardZoom };
      const bead = {
        x: a.x + (b.x - a.x) * progress,
        y: a.y + (b.y - a.y) * progress,
      };
      context.save();
      context.fillStyle = CULT_PALETTE_V7.wax;
      context.strokeStyle = CULT_PALETTE_V7.flame;
      context.lineWidth = Math.max(1, 2.4 * zoom);
      context.beginPath();
      context.arc(bead.x, bead.y, Math.max(3, 6.5 * zoom), 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    } else if (feedback.effect === "STRAND_SNAP") {
      if (feedback.from === undefined) continue;
      // The strand that was, red and fading (the flash), then its parted
      // link flying apart at the middle.
      const from = centre(feedback.from);
      context.save();
      context.globalAlpha *= clamp01(1 - progress * 1.4);
      drawCultStrandV7(context, from, point, boardZoom, false);
      context.restore();
      const middle = {
        x: (from.x + point.x) / 2,
        y: (from.y + point.y) / 2 - 8 * boardZoom,
      };
      const flash = clamp01(1 - progress * 3);
      if (flash > 0) {
        context.save();
        context.globalAlpha *= flash;
        context.fillStyle = "#ffffff";
        context.beginPath();
        context.arc(
          middle.x,
          middle.y,
          (10 + 26 * progress) * zoom,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.restore();
      }
      if (!sprite(middle, 1, fade)) {
        const away = (16 + 30 * progress) * zoom;
        const angle = Math.atan2(point.y - from.y, point.x - from.x);
        for (const side of [-1, 1])
          halfLink(
            context,
            {
              x: middle.x + Math.cos(angle) * away * side,
              y:
                middle.y + Math.sin(angle) * away * side - 22 * progress * zoom,
            },
            11 * zoom,
            angle + (side === 1 ? 0 : Math.PI) + progress * 2.4 * side,
            CULT_PALETTE_V7.redLit,
            fade,
          );
      }
    } else if (feedback.effect === "IDOL") {
      // The chalk spreads out to the ring's place.
      const size = (64 + 128 * progress) * boardZoom;
      context.save();
      context.globalAlpha *= fade;
      context.strokeStyle = CULT_PALETTE_V7.casing;
      context.lineWidth = Math.max(2, 6 * zoom);
      context.strokeRect(point.x - size, point.y - size, size * 2, size * 2);
      context.strokeStyle = CULT_PALETTE_V7.wax;
      context.lineWidth = Math.max(1, 3 * zoom);
      context.strokeRect(point.x - size, point.y - size, size * 2, size * 2);
      context.restore();
    } else if (feedback.effect === "BOO") {
      // Startle lines: sixteen short spokes jumping outward.
      if (!sprite(point, 1.1 + progress * 0.9, fade)) {
        const inner = (40 + 34 * progress) * zoom;
        const outer = inner + (14 + 10 * progress) * zoom;
        context.save();
        context.globalAlpha *= fade;
        context.lineCap = "round";
        for (const [stroke, width] of [
          [CULT_PALETTE_V7.casing, 7 * zoom],
          [CULT_PALETTE_V7.wax, 3.4 * zoom],
        ] as const) {
          context.strokeStyle = stroke;
          context.lineWidth = Math.max(1, width);
          context.beginPath();
          for (let spoke = 0; spoke < 16; spoke += 1) {
            const angle = (spoke / 16) * Math.PI * 2;
            const reach = spoke % 2 === 0 ? outer : outer - 7 * zoom;
            context.moveTo(
              point.x + Math.cos(angle) * inner,
              point.y + Math.sin(angle) * inner,
            );
            context.lineTo(
              point.x + Math.cos(angle) * reach,
              point.y + Math.sin(angle) * reach,
            );
          }
          context.stroke();
        }
        context.restore();
      }
    } else {
      // UNBOUND: a red ring bursts from the collar and six links fly.
      ring(
        context,
        point,
        (20 + 52 * progress) * zoom,
        CULT_PALETTE_V7.redLit,
        4 * zoom,
        fade,
      );
      ring(
        context,
        point,
        (12 + 34 * progress) * zoom,
        CULT_PALETTE_V7.brass,
        2.4 * zoom,
        fade * 0.9,
      );
      if (!sprite(point, 1 + progress * 0.8, fade))
        for (let link = 0; link < 6; link += 1) {
          const angle = (link / 6) * Math.PI * 2 + 0.4;
          const away = (18 + 50 * progress) * zoom;
          halfLink(
            context,
            {
              x: point.x + Math.cos(angle) * away,
              y: point.y + Math.sin(angle) * away - 18 * progress * zoom,
            },
            9 * zoom,
            angle + progress * 3,
            CULT_PALETTE_V7.brass,
            fade,
          );
        }
    }
  }
  context.restore();
}
