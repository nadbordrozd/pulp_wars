import type {
  CandyEffectIdV7,
  ChibiEffectIdV7,
  CuriosityEffectIdV7,
  CuriosityRound2EffectIdV7,
  DwarfEffectIdV7,
  IceFolkEffectIdV7,
  MartianEffectIdV7,
} from "../../assets/chibi-art-v7";
import type { CoordV7 } from "../../engine/index";
import { chibiMasterScale, isWholeScale } from "./chibi-geometry-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import type { SupportCueUnitV7, SupportEffectV7 } from "./presentation-plan-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import {
  drawBatSwirlCueV7,
  drawFeastCueV7,
  drawTerrorCueV7,
} from "./vampire-banshee-canvas-v7";

export interface SupportFeedbackV7 {
  readonly effect: SupportEffectV7;
  readonly actor: {
    readonly unitId: number | null;
    readonly at: CoordV7;
    /** REGENERATE and RECOVER: the HP regained, floated as "+N". */
    readonly amount?: number;
  };
  readonly recipients: readonly SupportCueUnitV7[];
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

/**
 * The CHIBI rasters a support cue may draw (bead pulp_wars-vkq.14): the
 * Undead effect sprites and the Plague marker, which doubles as the Plague
 * puff at 1:1.
 */
export type SupportEffectSubjectV7 =
  | "STATUS:PLAGUED"
  | `EFFECT:${ChibiEffectIdV7}`
  /** The Martian effect sprites (bead pulp_wars-t6s.4, martian-effects-v7). */
  | `EFFECT:${MartianEffectIdV7}`
  /** The Ice Folk effect sprites (bead pulp_wars-7g3.6, ice-folk-effects-v7). */
  | `EFFECT:${IceFolkEffectIdV7}`
  /** The Dwarf effect sprites (bead pulp_wars-78i.6, dwarf-effects-v7). */
  | `EFFECT:${DwarfEffectIdV7}`
  /** The Candy effect sprites (bead pulp_wars-jdb.6, candy-effects-v7). */
  | `EFFECT:${CandyEffectIdV7}`
  /** The map curiosity effect sprites (bead pulp_wars-737.6). */
  | `EFFECT:${CuriosityEffectIdV7}`
  /** The round-2 curiosity effect sprites (bead pulp_wars-737.16). */
  | `EFFECT:${CuriosityRound2EffectIdV7}`;

/** The curiosity cues' sprites, loaded only in a match with the option on. */
export const CURIOSITY_EFFECT_SUBJECTS_V7: readonly SupportEffectSubjectV7[] = [
  "EFFECT:FOUNTAIN_HEAL",
  "EFFECT:SHRINE_BLESSING",
  "EFFECT:SALVAGE_COINS",
  // Round 2 (bead pulp_wars-737.16).
  "EFFECT:GATE_TRAVERSE",
  "EFFECT:COIN_SPLASH",
];

export const SUPPORT_EFFECT_SUBJECTS_V7: readonly SupportEffectSubjectV7[] = [
  "EFFECT:WAIL",
  "EFFECT:SPLASH",
  "EFFECT:RAISE",
  "EFFECT:WISP",
  "EFFECT:CURE",
  "STATUS:PLAGUED",
];

export interface SupportEffectImageV7 {
  readonly image: CanvasImageSource;
  /** Master size in master pixels (CSS px at chibi zoom step 1). */
  readonly width: number;
  readonly height: number;
}

/**
 * CHIBI only: resolves a loaded effect raster, or null (LEGACY, still
 * loading, missing or failed), in which case the code-drawn cue is kept.
 */
export interface SupportEffectArtV7 {
  image(subject: SupportEffectSubjectV7): SupportEffectImageV7 | null;
  readonly devicePixelRatio: number;
  /**
   * The colour of the code-drawn rings and glows that go with the sprites.
   * The default look passes the Undead violet (bead pulp_wars-3tq.12);
   * without it they keep the classic pale blue-white.
   */
  readonly glow?: string;
}

/** Pale blue-white of the classic Undead palette. */
const CHIBI_UNDEAD_GLOW = "#d2e2f6";

/**
 * The Undead accent of the new visual direction as a glow: the lightened
 * violet of the trim (docs/art/factions/UNDEAD.md), for the Wail rings, the
 * Raise Dead rays and the lifesteal orb drawn in code beside the sprites.
 */
export const UNDEAD_VIOLET_GLOW_V7 = "#c9a6ff";

/**
 * Draws the short support cue on its own overlay, without repainting the
 * board. With CHIBI effect art each Undead cue draws its sprite, moved,
 * scaled and faded by code; reduced motion freezes the cue at its midpoint.
 */
export function drawSupportFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: SupportFeedbackV7,
  reducedMotion: boolean,
  art: SupportEffectArtV7 | null = null,
): void {
  const progress = reducedMotion ? 0.5 : feedback.progress;
  const fade = reducedMotion ? 0.82 : Math.sin(Math.PI * progress);
  const recipients = feedback.recipients.map((recipient) => recipient.at);
  const sprites = art === null ? null : spriteDrawer(context, camera, art);
  if (feedback.effect === "WAIL")
    drawWailWave(
      context,
      worldToScreen(projectGrid(feedback.actor.at), camera),
      camera.zoom,
      progress,
      fade,
      sprites === null ? UNDEAD_PULSE_COLORS.WAIL : sprites.glow,
    );
  // The Vampire and Banshee rework (`pulp_wars-iqhp`): the Bat Escape's
  // swirl, the Feast and the Terror, code-drawn in every art set.
  if (feedback.effect === "BAT_SWIRL") {
    const landing = feedback.recipients[0];
    drawBatSwirlCueV7(
      context,
      worldToScreen(projectGrid(feedback.actor.at), camera),
      landing === undefined
        ? null
        : worldToScreen(projectGrid(landing.at), camera),
      camera.zoom,
      progress,
      fade,
    );
    return;
  }
  if (feedback.effect === "FEAST") {
    drawFeastCueV7(
      context,
      worldToScreen(projectGrid(feedback.actor.at), camera),
      camera.zoom,
      progress,
      fade,
      feedback.actor.amount,
    );
    return;
  }
  if (feedback.effect === "TERROR") {
    for (const at of recipients)
      drawTerrorCueV7(
        context,
        worldToScreen(projectGrid(at), camera),
        camera.zoom,
        progress,
        fade,
      );
    return;
  }
  if (feedback.effect === "LIFESTEAL") {
    for (const from of recipients)
      drawLifesteal(
        context,
        worldToScreen(projectGrid(from), camera),
        worldToScreen(projectGrid(feedback.actor.at), camera),
        camera.zoom,
        progress,
        fade,
        sprites,
      );
    return;
  }
  // Recover (section 10) is the same ring and "+N" on each recovered unit.
  if (feedback.effect === "REGENERATE" || feedback.effect === "RECOVER") {
    for (const unit of [feedback.actor, ...feedback.recipients])
      drawRegeneration(
        context,
        worldToScreen(projectGrid(unit.at), camera),
        camera.zoom,
        progress,
        fade,
        unit.amount,
      );
    return;
  }
  // Map curiosities: the Fountain's droplets, the Shrine's star and the
  // coins of a Wreck or a bounty, each with its ring and rising "+N".
  if (feedback.effect === "GATE" || feedback.effect === "WELL") {
    for (const unit of [feedback.actor, ...feedback.recipients])
      drawRound2CuriosityCue(
        context,
        worldToScreen(projectGrid(unit.at), camera),
        camera.zoom,
        feedback.effect,
        progress,
        fade,
        unit.amount,
        sprites,
      );
    return;
  }
  if (
    feedback.effect === "FOUNTAIN" ||
    feedback.effect === "BLESSING" ||
    feedback.effect === "SALVAGE" ||
    feedback.effect === "BOUNTY"
  ) {
    drawCuriosityCue(
      context,
      worldToScreen(projectGrid(feedback.actor.at), camera),
      camera.zoom,
      feedback.effect,
      progress,
      fade,
      feedback.actor.amount,
      sprites,
    );
    return;
  }
  for (const at of [feedback.actor.at, ...recipients]) {
    const actor = same(at, feedback.actor.at);
    const center = worldToScreen(projectGrid(at), camera);
    if (feedback.effect === "RALLY")
      drawRally(context, center, camera.zoom, progress, fade, actor);
    else if (feedback.effect === "TEND")
      drawTend(context, center, camera.zoom, progress, fade, actor);
    else if (
      sprites === null ||
      !drawUndeadSprite(sprites, feedback.effect, center, actor, progress, fade)
    ) {
      if (feedback.effect !== "WAIL" || !actor)
        drawUndeadPulse(
          context,
          center,
          camera.zoom,
          progress,
          fade,
          sprites !== null &&
            (feedback.effect === "RAISE" || feedback.effect === "WAIL")
            ? sprites.glow
            : UNDEAD_PULSE_COLORS[feedback.effect],
          (feedback.effect === "RAISE" && !actor) ||
            feedback.effect === "BITTEN",
        );
    }
  }
}

interface SpriteDrawer {
  /** CSS px per master px: the chibi zoom step. */
  readonly step: number;
  /** Colour of the code-drawn glows beside the sprites. */
  readonly glow: string;
  /** False when the subject has no loaded raster. */
  draw(
    subject: SupportEffectSubjectV7,
    center: { readonly x: number; readonly y: number },
    /** Animation scale on top of the zoom step (1 = master size). */
    scale: number,
    alpha: number,
  ): boolean;
}

/**
 * Draws a sprite centred on a CSS point at master size x zoom step x scale,
 * snapped to device pixels; nearest-neighbour while the device scale is
 * whole, smoothed while it is fractional (zoom 0.75, mid-animation).
 */
function spriteDrawer(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  art: SupportEffectArtV7,
): SpriteDrawer {
  const step = chibiMasterScale(camera);
  const ratio = art.devicePixelRatio > 0 ? art.devicePixelRatio : 1;
  const draw: SpriteDrawer["draw"] = (subject, center, scale, alpha) => {
    const sprite = art.image(subject);
    if (sprite === null) return false;
    if (alpha <= 0) return true;
    const size = step * scale;
    const width = sprite.width * size;
    const height = sprite.height * size;
    context.save();
    context.globalAlpha = Math.min(1, alpha);
    context.imageSmoothingEnabled = !isWholeScale(size * ratio);
    context.drawImage(
      sprite.image,
      Math.round((center.x - width / 2) * ratio) / ratio,
      Math.round((center.y - height / 2) * ratio) / ratio,
      width,
      height,
    );
    context.restore();
    return true;
  };
  return { step, draw, glow: art.glow ?? CHIBI_UNDEAD_GLOW };
}

/**
 * The CHIBI Undead cues (sizes in master px, so they follow the zoom
 * step): WAIL fans out from the Banshee and pulses on each hit; SPLASH
 * bursts on the Lich's target and smaller on each splashed unit; RAISE
 * lifts bone hands out of each Grave; INFECT and BITTEN swirl three wisps
 * up the risen Zombie; PLAGUE puffs the miasma cloud; CURE twinkles over
 * the unit's head. False when the effect has no sprite (or it is not
 * loaded), so the caller draws the code cue.
 */
function drawUndeadSprite(
  sprites: SpriteDrawer,
  effect: SupportEffectV7,
  center: { readonly x: number; readonly y: number },
  actor: boolean,
  progress: number,
  fade: number,
): boolean {
  const { draw, step: unit } = sprites;
  const at = (dx: number, dy: number) => ({
    x: center.x + dx,
    y: center.y + dy,
  });
  switch (effect) {
    case "WAIL":
      return actor
        ? draw("EFFECT:WAIL", at(0, -10 * unit), 1 + 0.7 * progress, fade)
        : // A hit unit hears the shriek above its head.
          draw("EFFECT:WAIL", at(0, (-30 - 4 * progress) * unit), 0.6, fade);
    case "SPLASH":
      return draw(
        "EFFECT:SPLASH",
        at(0, -6 * unit),
        actor ? 0.75 + 0.45 * progress : 0.55 + 0.3 * progress,
        fade,
      );
    case "RAISE":
      if (actor) return false;
      return draw(
        "EFFECT:RAISE",
        at(0, (6 + 14 * (1 - easeOut(progress))) * unit),
        1,
        fade,
      );
    case "INFECT":
    case "BITTEN": {
      let drawn = false;
      // Three wisps spiral up the body, one above the other, shrinking and
      // fading as they climb, so they never bunch on the face.
      for (let wisp = 0; wisp < 3; wisp += 1) {
        const angle = progress * Math.PI * 2 + (wisp * Math.PI * 2) / 3;
        drawn =
          draw(
            "EFFECT:WISP",
            at(
              Math.cos(angle) * 22 * unit,
              (22 - progress * 40 - wisp * 14) * unit,
            ),
            1 - wisp * 0.15,
            fade * (1 - wisp * 0.2),
          ) || drawn;
      }
      return drawn;
    }
    case "PLAGUE":
      return draw(
        "STATUS:PLAGUED",
        at(0, (-6 - progress * 12) * unit),
        0.85 + 0.25 * progress,
        fade,
      );
    case "CURE":
      return draw("EFFECT:CURE", at(0, (-14 - progress * 8) * unit), 1, fade);
    default:
      return false;
  }
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) * (1 - progress);
}

/**
 * Lifesteal: two wisps arc from the drained unit to the healed Vampire.
 * CHIBI draws the wisp sprite; LEGACY (or a missing raster) a pale blue
 * orb with a dark outline, never red.
 */
function drawLifesteal(
  context: CanvasRenderingContext2D,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  sprites: SpriteDrawer | null,
): void {
  for (const lag of [0, 0.22]) {
    const t = Math.max(0, Math.min(1, progress * 1.25 - lag));
    const point = {
      x: from.x + (to.x - from.x) * t,
      y:
        from.y +
        (to.y - from.y) * t -
        Math.sin(Math.PI * t) * 34 * zoom -
        10 * zoom,
    };
    const alpha = fade * (lag === 0 ? 1 : 0.7);
    if (sprites?.draw("EFFECT:WISP", point, 1, alpha) === true) continue;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = sprites?.glow ?? CHIBI_UNDEAD_GLOW;
    context.strokeStyle = "#1b2230";
    context.lineWidth = Math.max(1, 2 * zoom);
    context.beginPath();
    context.arc(point.x, point.y, Math.max(2, 8 * zoom), 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }
}

const UNDEAD_PULSE_COLORS: Readonly<
  Record<
    Exclude<
      SupportEffectV7,
      | "RALLY"
      | "TEND"
      | "REGENERATE"
      | "RECOVER"
      | "FOUNTAIN"
      | "BLESSING"
      | "SALVAGE"
      | "BOUNTY"
      | "GATE"
      | "WELL"
      | "BAT_SWIRL"
      | "FEAST"
      | "TERROR"
    >,
    string
  >
> = {
  RAISE: "#8ff0a4",
  DEVOUR: "#ff9a84",
  WAIL: "#c9a6ff",
  INFECT: "#a6e36b",
  GRAVE: "#d9dcd4",
  PLAGUE: "#9db77a",
  CURE: "#c5fff2",
  BITTEN: "#e0525a",
  SPLASH: "#ffb35c",
  LIFESTEAL: "#d2e2f6",
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
  color: string,
): void {
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = color;
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

/** Green of the regeneration float, distinct from the teal heal ring. */
export const REGENERATION_TEXT_COLOR_V7 = "#9dffb0";

/**
 * Revision 17 Troll regeneration (bead pulp_wars-0ao.12): the Tend heal
 * ring and sparkles on the Troll, plus a bold "+N" that rises from its head
 * and fades. Reduced motion holds it at its midpoint (`progress` 0.5), so
 * the "+N" stays still and readable.
 */
function drawRegeneration(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  amount: number | undefined,
): void {
  drawTend(context, center, zoom, progress, fade, true);
  if (amount === undefined || amount <= 0) return;
  // Never below 15 CSS px, so the number reads at the smallest zoom; it
  // starts just above the head and rises as it fades.
  const font = Math.max(15, 24 * zoom);
  const y = center.y - (50 + 20 * progress) * zoom;
  context.save();
  // The float stays fully opaque for its first half, then fades.
  context.globalAlpha = progress <= 0.5 ? 1 : Math.max(0, fade * 1.15);
  context.font = `900 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, font * 0.22);
  context.strokeStyle = "#103019";
  context.strokeText(`+${amount}`, center.x, y);
  context.fillStyle = REGENERATION_TEXT_COLOR_V7;
  context.fillText(`+${amount}`, center.x, y);
  context.restore();
}

/** Coin gold of the salvage and bounty floats (the HUD coin's colour). */
export const CURIOSITY_COIN_TEXT_COLOR_V7 = "#ffd75a";

/**
 * Map curiosities (bead pulp_wars-737.6). FOUNTAIN: the heal ring, three
 * white droplets rising over the unit, and a green "+N". BLESSING: a pale
 * ring and the white star falling onto the unit it Promotes. SALVAGE and
 * BOUNTY: gold coins rising with a gold "+N". Without the sprite (LEGACY,
 * the classic look, still loading) the ring and the float are the cue; the
 * blessing draws a code star.
 */
function drawCuriosityCue(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  effect: "FOUNTAIN" | "BLESSING" | "SALVAGE" | "BOUNTY",
  progress: number,
  fade: number,
  amount: number | undefined,
  sprites: SpriteDrawer | null,
): void {
  const unit = sprites?.step ?? zoom * 1.6;
  if (effect === "FOUNTAIN") {
    drawRegeneration(context, center, zoom, progress, fade, amount);
    sprites?.draw(
      "EFFECT:FOUNTAIN_HEAL",
      { x: center.x, y: center.y - (8 + 14 * progress) * unit },
      1,
      fade,
    );
    return;
  }
  if (effect === "BLESSING") {
    const radius = (36 - 10 * progress) * zoom;
    context.save();
    context.globalAlpha = fade;
    context.strokeStyle = "#fff6dc";
    context.lineWidth = Math.max(2, 3 * zoom);
    context.beginPath();
    context.arc(center.x, center.y - 5 * zoom, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    const at = {
      x: center.x,
      y: center.y - (30 - 16 * easeOut(progress)) * unit,
    };
    if (
      sprites?.draw(
        "EFFECT:SHRINE_BLESSING",
        at,
        1,
        Math.min(1, fade * 1.3),
      ) !== true
    )
      drawCodeStar(context, at, 13 * unit, fade);
    return;
  }
  const at = { x: center.x, y: center.y - (10 + 18 * progress) * unit };
  if (sprites?.draw("EFFECT:SALVAGE_COINS", at, 1, fade) !== true) {
    context.save();
    context.globalAlpha = fade;
    context.fillStyle = CURIOSITY_COIN_TEXT_COLOR_V7;
    context.strokeStyle = "#3a2a08";
    context.lineWidth = Math.max(1, 2 * zoom);
    context.beginPath();
    context.arc(at.x, at.y, 8 * unit, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }
  if (amount !== undefined && amount > 0)
    drawFloat(
      context,
      center,
      zoom,
      progress,
      fade,
      `+${amount}`,
      CURIOSITY_COIN_TEXT_COLOR_V7,
      "#3a2a08",
    );
}

/**
 * Map curiosities round 2 (bead pulp_wars-737.16). GATE: a pale ring
 * spinning in and the white spiral burst over each gate. WELL: the Coin
 * dropping into a white splash, and a gold "+N" when the toss paid Coins.
 * Without the sprite (LEGACY, the classic look, still loading) the ring
 * (or a gold coin and a splash ring) is the cue.
 */
function drawRound2CuriosityCue(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  effect: "GATE" | "WELL",
  rawProgress: number,
  fade: number,
  amount: number | undefined,
  sprites: SpriteDrawer | null,
): void {
  const unit = sprites?.step ?? zoom * 1.6;
  // A held or reduced-motion cue may pass a progress outside [0, 1]; the
  // rings' radii stay positive.
  const progress = Math.max(0, Math.min(1, rawProgress));
  if (effect === "GATE") {
    context.save();
    context.globalAlpha = fade;
    context.strokeStyle = "#ece8ff";
    context.lineWidth = Math.max(2, 4 * zoom);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y + 6 * zoom,
      (44 - 24 * progress) * zoom,
      (22 - 12 * progress) * zoom,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
    sprites?.draw(
      "EFFECT:GATE_TRAVERSE",
      { x: center.x, y: center.y - 10 * unit },
      1,
      fade,
    );
    return;
  }
  const at = {
    x: center.x,
    y: center.y - (16 - 10 * easeOut(progress)) * unit,
  };
  if (sprites?.draw("EFFECT:COIN_SPLASH", at, 1, fade) !== true) {
    context.save();
    context.globalAlpha = fade;
    context.strokeStyle = "#ffffff";
    context.lineWidth = Math.max(1, 2 * zoom);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y + 6 * zoom,
      (10 + 22 * progress) * zoom,
      (4 + 8 * progress) * zoom,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.fillStyle = CURIOSITY_COIN_TEXT_COLOR_V7;
    context.strokeStyle = "#3a2a08";
    context.beginPath();
    context.arc(at.x, at.y, 6 * unit, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }
  if (amount !== undefined && amount > 0)
    drawFloat(
      context,
      center,
      zoom,
      progress,
      fade,
      `+${amount}`,
      CURIOSITY_COIN_TEXT_COLOR_V7,
      "#3a2a08",
    );
}

function drawCodeStar(
  context: CanvasRenderingContext2D,
  at: { readonly x: number; readonly y: number },
  radius: number,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, alpha));
  context.fillStyle = "#fff6dc";
  context.strokeStyle = "#3a3431";
  context.lineWidth = Math.max(1, radius * 0.14);
  context.lineJoin = "round";
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const reach = point % 2 === 0 ? radius : radius * 0.45;
    const x = at.x + Math.cos(angle) * reach;
    const y = at.y + Math.sin(angle) * reach;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

/** A bold rising "+N" over a unit's head, in the style of drawRegeneration. */
function drawFloat(
  context: CanvasRenderingContext2D,
  center: { readonly x: number; readonly y: number },
  zoom: number,
  progress: number,
  fade: number,
  label: string,
  colour: string,
  outline: string,
): void {
  const font = Math.max(15, 24 * zoom);
  const y = center.y - (50 + 20 * progress) * zoom;
  context.save();
  context.globalAlpha = progress <= 0.5 ? 1 : Math.max(0, fade * 1.15);
  context.font = `900 ${font}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, font * 0.22);
  context.strokeStyle = outline;
  context.strokeText(label, center.x, y);
  context.fillStyle = colour;
  context.fillText(label, center.x, y);
  context.restore();
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
