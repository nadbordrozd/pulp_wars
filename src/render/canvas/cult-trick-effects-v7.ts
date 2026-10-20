import type { CultEffectIdV7 } from "../../assets/chibi-art-v7";
import type { CoordV7 } from "../../engine/index";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import { chibiMasterScale } from "./chibi-geometry-v7";
import { CULT_PALETTE_V7 } from "./cult-channel-canvas-v7";
import type { CultFeedbackV7 } from "./cult-effects-v7";
import { drawCultSwapArrowsV7 } from "./cult-ritual-canvas-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectArtV7 } from "./support-presentation-v7";

/**
 * The cues of the Cult's rituals, hexes and tricks (bead
 * `pulp_wars-mch9.19`; docs/product/RULESET_7_CULTISTS.md section 14.3,
 * docs/art/factions/CULT.md "Effects"), drawn on the board's effects
 * overlay in `CULT_PALETTE_V7` by `drawCultFeedbackV7`:
 *
 * - **RITUAL_BEGUN:** the chalk ring spreads round the leader, and the
 *   mark lights.
 * - **RITUAL_FIZZLE:** the ring goes dark: grey smoke rises from it.
 * - **STARFALL:** a star streaks down onto the marked tile, then a burst
 *   spreads over its nine tiles.
 * - **HERALD:** a tall green pillar where the Herald arrives.
 * - **CONSUMED:** a puff of green smoke where the consumed unit stood.
 * - **PROCLAIM:** rings roll out of the city under a "KNEEL!".
 * - **RIBBIT:** a green spark flies from the Hexer (`from`) and pops.
 * - **SWITCHEROO:** a swirl on each of the two tiles and the arrows
 *   between them.
 * - **TENTACLE:** a teal splash where the Tentacle rises.
 * - **GRAB:** a teal ring closes round the unit it holds.
 * - **PAMPHLETS:** leaflets flutter up from the village.
 *
 * `progress` runs 0 to 1; reduced motion holds one still frame of each
 * where the cue reads. Each cue asks for its `EFFECT:*` sprite and draws it
 * over the code-drawn shape when the art has registered one.
 */
export const CULT_TRICK_EFFECTS_V7 = [
  "RITUAL_BEGUN",
  "RITUAL_FIZZLE",
  "STARFALL",
  "HERALD",
  "CONSUMED",
  "PROCLAIM",
  "RIBBIT",
  "SWITCHEROO",
  "TENTACLE",
  "GRAB",
  "PAMPHLETS",
] as const;
export type CultTrickEffectV7 = (typeof CULT_TRICK_EFFECTS_V7)[number];

export function isCultTrickEffectV7(
  effect: string,
): effect is CultTrickEffectV7 {
  return (CULT_TRICK_EFFECTS_V7 as readonly string[]).includes(effect);
}

export const CULT_TRICK_EFFECT_DURATIONS_V7: Readonly<
  Record<CultTrickEffectV7, number>
> = {
  RITUAL_BEGUN: 420,
  RITUAL_FIZZLE: 520,
  STARFALL: 700,
  HERALD: 620,
  CONSUMED: 420,
  PROCLAIM: 560,
  RIBBIT: 420,
  SWITCHEROO: 420,
  TENTACLE: 420,
  GRAB: 320,
  PAMPHLETS: 460,
};

/** The still frame of each cue under reduced motion. */
export const CULT_TRICK_STILL_PROGRESS_V7: Readonly<
  Record<CultTrickEffectV7, number>
> = {
  RITUAL_BEGUN: 0.6,
  RITUAL_FIZZLE: 0.4,
  STARFALL: 0.66,
  HERALD: 0.45,
  CONSUMED: 0.4,
  PROCLAIM: 0.45,
  RIBBIT: 0.7,
  SWITCHEROO: 0.4,
  TENTACLE: 0.45,
  GRAB: 0.5,
  PAMPHLETS: 0.45,
};

/** The sprite each cue asks the art for (docs/art/factions/CULT.md). */
export const CULT_TRICK_EFFECT_SPRITES_V7: Readonly<
  Partial<Record<CultTrickEffectV7, `EFFECT:${CultEffectIdV7}`>>
> = {
  RITUAL_FIZZLE: "EFFECT:RITUAL_FIZZLE",
  STARFALL: "EFFECT:STARFALL_BURST",
  HERALD: "EFFECT:SUMMON_POP",
  CONSUMED: "EFFECT:SACRIFICE_PUFF",
  PROCLAIM: "EFFECT:PROCLAIM",
  RIBBIT: "EFFECT:RIBBIT",
  SWITCHEROO: "EFFECT:SWITCHEROO",
  TENTACLE: "EFFECT:TENTACLE_SLAP",
  PAMPHLETS: "EFFECT:PAMPHLETS",
};

/** The falling star of a Star-fall, before its burst. */
export const CULT_STARFALL_STAR_SPRITE_V7 = "EFFECT:STARFALL_STAR" as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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

function blob(
  context: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  colour: string,
  alpha: number,
): void {
  if (alpha <= 0 || radius <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = colour;
  context.strokeStyle = CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(0.8, radius * 0.16);
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function star(
  context: CanvasRenderingContext2D,
  point: Point,
  size: number,
  alpha: number,
  colour: string = CULT_PALETTE_V7.wax,
): void {
  if (alpha <= 0 || size <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = colour;
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

/** A word that bursts over a tile: cream capitals on a dark casing. */
function shout(
  context: CanvasRenderingContext2D,
  point: Point,
  text: string,
  size: number,
  colour: string,
  alpha: number,
): void {
  if (alpha <= 0) return;
  context.save();
  context.globalAlpha *= alpha;
  context.font = `800 ${Math.max(11, size)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = CULT_PALETTE_V7.casing;
  context.lineWidth = Math.max(3, size * 0.3);
  context.strokeText(text, point.x, point.y);
  context.fillStyle = colour;
  context.fillText(text, point.x, point.y);
  context.restore();
}

/** Draws one ritual, hex or trick cue (see `drawCultFeedbackV7`). */
export function drawCultTrickFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: CultFeedbackV7 & { readonly effect: CultTrickEffectV7 },
  art: SupportEffectArtV7 | null = null,
): void {
  const boardZoom = camera.zoom;
  const zoom = boardZoom * 1.35;
  const progress = clamp01(feedback.progress);
  const centre = (at: CoordV7): Point => worldToScreen(projectGrid(at), camera);
  const step = chibiMasterScale(camera);
  const ratio =
    (art?.devicePixelRatio ?? 1) > 0 ? (art?.devicePixelRatio ?? 1) : 1;
  /** A registered sprite, centred on a point; false without one. */
  const sprite = (
    subject: `EFFECT:${CultEffectIdV7}` | undefined,
    point: Point,
    scale: number,
    alpha: number,
  ): boolean => {
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
  const own = CULT_TRICK_EFFECT_SPRITES_V7[feedback.effect];
  // Vivid for most of its time, then gone.
  const fade = 1 - progress ** 2.5;
  const effect = feedback.effect;
  context.save();
  context.setLineDash([]);
  if (effect === "SWITCHEROO") {
    const [first, second] = feedback.cells;
    if (first !== undefined && second !== undefined) {
      context.save();
      context.globalAlpha *= fade;
      drawCultSwapArrowsV7(context, centre(first), centre(second), boardZoom);
      context.restore();
    }
  }
  feedback.cells.forEach((at, index) => {
    const point = centre(at);
    if (effect === "RITUAL_BEGUN") {
      // The chalk runs round the feet (the leader's cell first), and a
      // ring lights on every other cell (the mark).
      const feet = { x: point.x, y: point.y + 34 * boardZoom };
      ring(
        context,
        index === 0 ? feet : point,
        (14 + 40 * Math.min(1, progress * 1.6)) * boardZoom,
        index === 0 ? CULT_PALETTE_V7.wax : CULT_PALETTE_V7.glow,
        3 * zoom,
        fade,
        index === 0 ? 0.36 : 1,
      );
      if (index === 0)
        for (const [dx, rise] of [
          [-34, 30],
          [0, 44],
          [34, 30],
        ] as const)
          star(
            context,
            {
              x: point.x + dx * zoom,
              y: point.y + (10 - rise * progress) * zoom,
            },
            5 * zoom,
            fade,
            CULT_PALETTE_V7.glow,
          );
    } else if (effect === "RITUAL_FIZZLE") {
      // The ring goes dark, and grey smoke rises from it.
      ring(
        context,
        { x: point.x, y: point.y + (index === 0 ? 34 * boardZoom : 0) },
        (index === 0 ? 50 : 40) * boardZoom,
        "#8a8f9a",
        2.6 * zoom,
        fade,
        index === 0 ? 0.36 : 1,
      );
      if (
        !sprite(own, { x: point.x, y: point.y - 20 * progress * zoom }, 1, fade)
      )
        for (const [dx, rise, size] of [
          [-16, 40, 9],
          [6, 56, 12],
          [20, 34, 8],
        ] as const)
          blob(
            context,
            {
              x: point.x + dx * zoom,
              y: point.y + (6 - rise * progress) * zoom,
            },
            (size + 5 * progress) * zoom,
            "#aab3c0",
            fade * 0.85,
          );
    } else if (effect === "STARFALL") {
      // The star falls from the upper right until it lands, then bursts
      // over the nine tiles.
      const fall = clamp01(progress / 0.42);
      const landed = clamp01((progress - 0.42) / 0.58);
      if (progress < 0.42) {
        const from = {
          x: point.x + 150 * (1 - fall) * zoom,
          y: point.y - 260 * (1 - fall) * zoom,
        };
        context.save();
        context.lineCap = "round";
        context.strokeStyle = CULT_PALETTE_V7.wax;
        context.globalAlpha *= 0.7;
        context.lineWidth = Math.max(2, 6 * zoom);
        context.beginPath();
        context.moveTo(from.x + 34 * zoom, from.y - 60 * zoom);
        context.lineTo(from.x, from.y);
        context.stroke();
        context.restore();
        if (!sprite(CULT_STARFALL_STAR_SPRITE_V7, from, 1.2, 1))
          star(context, from, 16 * zoom, 1);
      } else {
        const burst = 1 - landed ** 2;
        ring(
          context,
          point,
          (40 + 152 * landed) * boardZoom,
          CULT_PALETTE_V7.wax,
          5 * zoom,
          burst,
        );
        ring(
          context,
          point,
          (20 + 120 * landed) * boardZoom,
          CULT_PALETTE_V7.redLit,
          3 * zoom,
          burst * 0.9,
        );
        if (!sprite(own, point, 1.4 + landed * 1.2, burst))
          for (let spark = 0; spark < 8; spark += 1) {
            const angle = (spark / 8) * Math.PI * 2 + 0.3;
            const away = (26 + 130 * landed) * boardZoom;
            star(
              context,
              {
                x: point.x + Math.cos(angle) * away,
                y: point.y + Math.sin(angle) * away,
              },
              (9 - 3 * landed) * zoom,
              burst,
            );
          }
      }
    } else if (effect === "HERALD") {
      // A tall pillar of green light, and the ring at its foot.
      const lift = 60 * progress * zoom;
      context.save();
      context.globalAlpha *= fade * 0.5;
      context.fillStyle = CULT_PALETTE_V7.glow;
      context.fillRect(
        point.x - 26 * zoom,
        point.y + 24 * zoom - (90 + 80 * progress) * zoom,
        52 * zoom,
        (90 + 80 * progress) * zoom,
      );
      context.restore();
      ring(
        context,
        { x: point.x, y: point.y + 24 * zoom },
        (24 + 56 * progress) * zoom,
        CULT_PALETTE_V7.flame,
        4 * zoom,
        fade,
        0.42,
      );
      ring(
        context,
        { x: point.x, y: point.y + 24 * zoom - lift },
        (20 + 30 * progress) * zoom,
        CULT_PALETTE_V7.glow,
        2.6 * zoom,
        fade,
        0.42,
      );
      sprite(
        own,
        { x: point.x, y: point.y - lift * 0.5 },
        1.6 + progress,
        fade,
      );
    } else if (effect === "CONSUMED") {
      if (
        !sprite(
          own,
          { x: point.x, y: point.y - 24 * progress * zoom },
          1.1,
          fade,
        )
      )
        for (const [dx, rise, size] of [
          [-14, 34, 10],
          [4, 50, 13],
          [18, 30, 9],
        ] as const)
          blob(
            context,
            {
              x: point.x + dx * zoom,
              y: point.y + (8 - rise * progress) * zoom,
            },
            (size + 6 * progress) * zoom,
            CULT_PALETTE_V7.glow,
            fade * 0.9,
          );
    } else if (effect === "PROCLAIM") {
      for (const lag of [0, 0.22, 0.44]) {
        const wave = clamp01((progress - lag) / (1 - lag));
        ring(
          context,
          point,
          (26 + 70 * wave) * zoom,
          CULT_PALETTE_V7.purple,
          4 * zoom,
          (1 - wave) * 0.9,
        );
      }
      if (!sprite(own, { x: point.x, y: point.y - 44 * zoom }, 1.1, fade))
        shout(
          context,
          { x: point.x, y: point.y - (40 + 16 * progress) * zoom },
          "KNEEL!",
          (20 + 8 * Math.min(1, progress * 3)) * zoom,
          CULT_PALETTE_V7.wax,
          fade,
        );
    } else if (effect === "RIBBIT") {
      // The spark flies from the Hexer for the first third, then pops.
      const flight = clamp01(progress / 0.35);
      const pop = clamp01((progress - 0.35) / 0.65);
      if (feedback.from !== undefined && progress < 0.35) {
        const from = centre(feedback.from);
        star(
          context,
          {
            x: from.x + (point.x - from.x) * flight,
            y:
              from.y +
              (point.y - from.y) * flight -
              Math.sin(flight * Math.PI) * 30 * zoom,
          },
          8 * zoom,
          1,
          CULT_PALETTE_V7.flame,
        );
      } else {
        const gone = 1 - pop ** 2;
        ring(
          context,
          point,
          (14 + 40 * pop) * zoom,
          CULT_PALETTE_V7.flame,
          3.4 * zoom,
          gone,
        );
        if (!sprite(own, point, 1 + pop * 0.5, gone))
          for (let puff = 0; puff < 5; puff += 1) {
            const angle = (puff / 5) * Math.PI * 2 - 0.6;
            blob(
              context,
              {
                x: point.x + Math.cos(angle) * (10 + 30 * pop) * zoom,
                y: point.y + Math.sin(angle) * (10 + 30 * pop) * zoom,
              },
              (8 - 3 * pop) * zoom,
              CULT_PALETTE_V7.glow,
              gone,
            );
          }
      }
    } else if (effect === "SWITCHEROO") {
      ring(
        context,
        point,
        (38 - 20 * progress) * zoom,
        CULT_PALETTE_V7.glow,
        3 * zoom,
        fade,
      );
      sprite(own, point, 1, fade);
    } else if (effect === "TENTACLE") {
      ring(
        context,
        { x: point.x, y: point.y + 26 * zoom },
        (16 + 44 * progress) * zoom,
        CULT_PALETTE_V7.tealLit,
        3.6 * zoom,
        fade,
        0.4,
      );
      if (!sprite(own, point, 1 + progress * 0.3, fade))
        for (const [dx, rise] of [
          [-30, 44],
          [-10, 60],
          [12, 54],
          [30, 40],
        ] as const)
          blob(
            context,
            {
              x: point.x + dx * (0.6 + progress * 0.6) * zoom,
              y: point.y + (22 - rise * Math.sin(progress * Math.PI)) * zoom,
            },
            4.5 * zoom,
            CULT_PALETTE_V7.tealLit,
            fade,
          );
    } else if (effect === "GRAB") {
      // The coil closes: a teal ring shrinking onto the held unit.
      ring(
        context,
        { x: point.x, y: point.y + 14 * boardZoom },
        (64 - 34 * progress) * boardZoom,
        CULT_PALETTE_V7.tealLit,
        4.4 * zoom,
        fade,
        0.38,
      );
    } else if (effect === "PAMPHLETS") {
      if (
        !sprite(own, { x: point.x, y: point.y - 30 * progress * zoom }, 1, fade)
      ) {
        context.save();
        context.globalAlpha *= fade;
        context.fillStyle = CULT_PALETTE_V7.wax;
        context.strokeStyle = CULT_PALETTE_V7.casing;
        context.lineWidth = Math.max(0.8, 1.4 * zoom);
        for (const [dx, rise, turn] of [
          [-26, 46, -0.5],
          [-6, 62, 0.3],
          [14, 52, -0.2],
          [30, 38, 0.6],
        ] as const) {
          context.save();
          context.translate(
            point.x + dx * zoom,
            point.y + (10 - rise * progress) * zoom,
          );
          context.rotate(turn + progress * 2.2 * (turn < 0 ? -1 : 1));
          context.beginPath();
          context.rect(-6 * zoom, -8 * zoom, 12 * zoom, 16 * zoom);
          context.fill();
          context.stroke();
          context.restore();
        }
        context.restore();
      }
    }
  });
  context.restore();
}
