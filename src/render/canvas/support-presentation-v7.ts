import type { CoordV7 } from "../../engine/index";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportEffectV7 } from "./presentation-plan-v7";

export interface SupportFeedbackV7 {
  readonly effect: SupportEffectV7;
  readonly actor: { readonly unitId: number | null; readonly at: CoordV7 };
  readonly recipients: readonly {
    readonly unitId: number;
    readonly at: CoordV7;
  }[];
  readonly progress: number;
}

export interface WindmillHealingFeedbackV7 {
  readonly phase: "SOURCES" | "RECIPIENTS";
  readonly sources: readonly CoordV7[];
  readonly recipients: readonly {
    readonly unitId: number;
    readonly at: CoordV7;
  }[];
  readonly progress: number;
}

/** Draws the short support cue on its own overlay, without repainting the board. */
export function drawSupportFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: SupportFeedbackV7,
  reducedMotion: boolean,
): void {
  const progress = reducedMotion ? 0.5 : feedback.progress;
  const fade = reducedMotion ? 0.82 : Math.sin(Math.PI * progress);
  const recipients = feedback.recipients.map((recipient) => recipient.at);
  if (feedback.effect === "WAIL")
    drawWailWave(
      context,
      worldToScreen(projectGrid(feedback.actor.at), camera),
      camera.zoom,
      progress,
      fade,
    );
  for (const at of [feedback.actor.at, ...recipients]) {
    const actor = same(at, feedback.actor.at);
    const center = worldToScreen(projectGrid(at), camera);
    if (feedback.effect === "RALLY")
      drawRally(context, center, camera.zoom, progress, fade, actor);
    else if (feedback.effect === "TEND")
      drawTend(context, center, camera.zoom, progress, fade, actor);
    else if (feedback.effect !== "WAIL" || !actor)
      drawUndeadPulse(
        context,
        center,
        camera.zoom,
        progress,
        fade,
        UNDEAD_PULSE_COLORS[feedback.effect],
        (feedback.effect === "RAISE" && !actor) || feedback.effect === "BITTEN",
      );
  }
}

const UNDEAD_PULSE_COLORS: Readonly<
  Record<Exclude<SupportEffectV7, "RALLY" | "TEND">, string>
> = {
  RAISE: "#8ff0a4",
  DEVOUR: "#ff9a84",
  WAIL: "#c9a6ff",
  INFECT: "#a6e36b",
  GRAVE: "#d9dcd4",
  PLAGUE: "#9db77a",
  CURE: "#c5fff2",
  BITTEN: "#e0525a",
};

/** Revision 13: a contracting ring, with rising rays for raised Skeletons. */
function drawUndeadPulse(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  color: string,
  rising: boolean,
): void {
  const radius = Math.max(1, 32 * zoom - progress * 12 * zoom);
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, 3.5 * zoom);
  context.beginPath();
  context.arc(center.x, center.y - 5 * zoom, radius, 0, Math.PI * 2);
  context.stroke();
  if (rising)
    for (const offset of [-12, 0, 12]) {
      const x = center.x + offset * zoom;
      const base = center.y + 18 * zoom;
      context.beginPath();
      context.moveTo(x, base);
      context.lineTo(x, base - (20 + progress * 18) * zoom);
      context.stroke();
    }
  context.restore();
}

/** Revision 13: Wail rings expanding to the two-tile radius. */
function drawWailWave(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
): void {
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = UNDEAD_PULSE_COLORS.WAIL;
  context.lineWidth = Math.max(2, 3 * zoom);
  for (const phase of [0, 0.33, 0.66]) {
    const share = Math.max(0, Math.min(1, progress + phase));
    context.beginPath();
    context.arc(center.x, center.y, share * 2.5 * 128 * zoom, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

/** Draws a fixed-duration source-to-recipient Windmill cue on the effects canvas. */
export function drawWindmillHealingFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: WindmillHealingFeedbackV7,
  reducedMotion: boolean,
): void {
  const progress = reducedMotion ? 0.5 : feedback.progress;
  const fade = reducedMotion ? 0.82 : Math.sin(Math.PI * progress);
  const targets =
    feedback.phase === "SOURCES"
      ? feedback.sources
      : feedback.recipients.map((recipient) => recipient.at);
  for (const at of targets) {
    const center = worldToScreen(projectGrid(at), camera);
    const radius =
      (feedback.phase === "SOURCES" ? 30 : 24) * camera.zoom +
      (reducedMotion ? 0 : progress * 10 * camera.zoom);
    context.save();
    context.globalAlpha = fade;
    context.strokeStyle = feedback.phase === "SOURCES" ? "#ffe17a" : "#67e5ca";
    context.lineWidth = Math.max(2, 3 * camera.zoom);
    context.beginPath();
    context.arc(center.x, center.y - 5 * camera.zoom, radius, 0, Math.PI * 2);
    context.stroke();
    if (feedback.phase === "SOURCES") {
      const rotation = reducedMotion ? 0 : progress * Math.PI * 1.5;
      for (let arm = 0; arm < 4; arm += 1) {
        const angle = rotation + arm * (Math.PI / 2);
        context.beginPath();
        context.moveTo(center.x, center.y - 5 * camera.zoom);
        context.lineTo(
          center.x + Math.cos(angle) * radius * 0.72,
          center.y - 5 * camera.zoom + Math.sin(angle) * radius * 0.72,
        );
        context.stroke();
      }
    } else {
      const arm = 7 * camera.zoom;
      context.beginPath();
      context.moveTo(center.x - arm, center.y - 5 * camera.zoom);
      context.lineTo(center.x + arm, center.y - 5 * camera.zoom);
      context.moveTo(center.x, center.y - 5 * camera.zoom - arm);
      context.lineTo(center.x, center.y - 5 * camera.zoom + arm);
      context.stroke();
    }
    context.restore();
  }
}

function drawRally(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  actor: boolean,
): void {
  const radius = (actor ? 27 : 22) * zoom + progress * 13 * zoom;
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = actor ? "#ffe17a" : "#ffbd59";
  context.lineWidth = Math.max(2, 3.5 * zoom);
  context.beginPath();
  context.arc(
    center.x,
    center.y - 5 * zoom,
    radius,
    Math.PI * 1.1,
    Math.PI * 1.9,
  );
  context.stroke();
  for (const direction of [-1, 1]) {
    const x = center.x + direction * radius * 0.64;
    const y = center.y - radius * 0.64 - 5 * zoom;
    context.beginPath();
    context.moveTo(x - direction * 7 * zoom, y + 6 * zoom);
    context.lineTo(x, y);
    context.lineTo(x - direction * 2 * zoom, y + 9 * zoom);
    context.stroke();
  }
  context.restore();
}

function drawTend(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  actor: boolean,
): void {
  const radius = (actor ? 35 : 30) * zoom - progress * 10 * zoom;
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = actor ? "#c5fff2" : "#67e5ca";
  context.lineWidth = Math.max(2, 3 * zoom);
  context.beginPath();
  context.arc(center.x, center.y - 5 * zoom, radius, 0, Math.PI * 2);
  context.stroke();
  const sparkleRadius = Math.max(12 * zoom, radius * 0.68);
  for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
    const x = center.x + Math.cos(angle) * sparkleRadius;
    const y = center.y - 5 * zoom + Math.sin(angle) * sparkleRadius;
    const dx = Math.cos(angle) * 5 * zoom;
    const dy = Math.sin(angle) * 5 * zoom;
    context.beginPath();
    context.moveTo(x - dx, y - dy);
    context.lineTo(x + dx, y + dy);
    context.stroke();
  }
  context.restore();
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
