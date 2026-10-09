import type { CoordV7, GiantSignatureV7 } from "../../engine/index";
import { CANDY_PALETTE_V7 } from "../../assets/chibi-direction-candy-presentation";
import { DWARF_PALETTE_V7 } from "../../assets/chibi-direction-dwarf-presentation";
import { ICE_FOLK_PALETTE_V7 } from "../../assets/chibi-direction-ice-folk-presentation";
import { MARTIAN_PALETTE_V7 } from "../../assets/chibi-direction-martian-presentation";
import {
  ATTACK_EFFECT_SCALE_V7,
  NECRO_BOLT_VIOLET_V7,
} from "./attack-effects-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import {
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
  type CameraState,
} from "./geometry";

/**
 * The giants' signature cues on the board's effects overlay
 * (`pulp_wars-w49.32`, docs/product/RULESET_7_GIANTS.md section 10,
 * docs/art/ATTACK_EFFECTS.md "The giants' signatures"). Code-drawn in the
 * manner of the attack cues of attack-effects-v7: a pure plan of each
 * frame's geometry (`giantEffectPlanV7`), its drawing
 * (`drawGiantFeedbackV7`), a duration, the share at which the board shows
 * the result, and the one frame reduced motion holds. Each faction's cue
 * takes its faction's palette, and every number on it is the event's.
 *
 * | Signature      | Cue          |
 * | -------------- | ------------ |
 * | Crushing Shove | `CRUSH`      |
 * | Swallow        | `SWALLOW`, then `DIGEST` at each Start Turn and `REGURGITATE` |
 * | Goblin Toss    | `TOSS`       |
 * | Thunder Stomp  | `STOMP`      |
 * | Overstride     | `TRAMPLE`    |
 * | Glacial Smash  | `SHARDS`     |
 * | Siege Hammer   | `HAMMER`     |
 * | Break Off      | `BREAK_OFF`  |
 */
export type GiantFeedbackEffectV7 =
  /** The push stops short with a thud: a crack ring, "−3" on each unit. */
  | "CRUSH"
  /** A gulp: the victim shrinks into the Abomination. */
  | "SWALLOW"
  /** Start Turn: bubbles and the digest's "−4" over the Abomination. */
  | "DIGEST"
  /** The digested victim spat out as a Zombie. */
  | "REGURGITATE"
  /** The Goblin arcs over the board, cartwheeling, and lands in dust. */
  | "TOSS"
  /** A foot slam, a ground ring over the 3 x 3, dust; the board shakes. */
  | "STOMP"
  /** A stamp puff and "−3" on each unit the Colossus stepped over. */
  | "TRAMPLE"
  /** The Glacial Smash: a bigger burst, shards flying to the eight tiles. */
  | "SHARDS"
  /** The Siege Hammer's blow; on a walled centre the Walls crumble. */
  | "HAMMER"
  /** Gingerbread chunks roll to their tiles and the men pop up. */
  | "BREAK_OFF";

export const GIANT_FEEDBACK_EFFECTS_V7: readonly GiantFeedbackEffectV7[] = [
  "CRUSH",
  "SWALLOW",
  "DIGEST",
  "REGURGITATE",
  "TOSS",
  "STOMP",
  "TRAMPLE",
  "SHARDS",
  "HAMMER",
  "BREAK_OFF",
];

/** The cue of each of the eight signatures. */
export const GIANT_SIGNATURE_CUES_V7: Readonly<
  Record<GiantSignatureV7, GiantFeedbackEffectV7>
> = {
  CRUSH: "CRUSH",
  SWALLOW: "SWALLOW",
  TOSS: "TOSS",
  STOMP: "STOMP",
  OVERSTRIDE: "TRAMPLE",
  GLACIAL_SMASH: "SHARDS",
  SIEGE_HAMMER: "HAMMER",
  BREAK_OFF: "BREAK_OFF",
};

/** The duration of each cue in ms (the fast speed halves it). */
export const GIANT_EFFECT_DURATIONS_V7: Readonly<
  Record<GiantFeedbackEffectV7, number>
> = {
  CRUSH: 420,
  SWALLOW: 640,
  DIGEST: 520,
  REGURGITATE: 560,
  TOSS: 640,
  STOMP: 560,
  TRAMPLE: 420,
  SHARDS: 520,
  HAMMER: 560,
  BREAK_OFF: 640,
};

/**
 * The share of each cue from which the board shows the result (before it,
 * the view before the command): the gulp, the Goblin's landing, the slam,
 * the spit's landing, the men's pop. 0: the result from the start.
 */
export const GIANT_EFFECT_HIT_V7: Readonly<
  Record<GiantFeedbackEffectV7, number>
> = {
  CRUSH: 0,
  SWALLOW: 0.62,
  DIGEST: 0,
  REGURGITATE: 0.55,
  TOSS: 0.78,
  STOMP: 0.24,
  TRAMPLE: 0,
  SHARDS: 0,
  HAMMER: 0,
  BREAK_OFF: 0.55,
};

/**
 * The beat of each cue (share of it): the thud of a crush, the gulp, the
 * Goblin's landing, the slam of a Stomp, the hammer's blow, the men's pop.
 * Its sound is heard here.
 */
export const GIANT_EFFECT_BEAT_V7: Readonly<
  Record<GiantFeedbackEffectV7, number>
> = {
  CRUSH: 0.26,
  SWALLOW: 0.62,
  DIGEST: 0.1,
  REGURGITATE: 0.55,
  TOSS: 0.78,
  STOMP: 0.24,
  TRAMPLE: 0.05,
  SHARDS: 0.04,
  HAMMER: 0.3,
  BREAK_OFF: 0.55,
};

/**
 * The frame reduced motion holds for each cue: the crack ring with its
 * numbers, the victim half swallowed, the Goblin at the top of its arc,
 * the ring over the 3 x 3, the shards in flight, the Walls breaking, the
 * chunks on their way.
 */
export function giantReducedMotionProgressV7(
  effect: GiantFeedbackEffectV7,
): number {
  switch (effect) {
    case "CRUSH":
      return 0.42;
    case "SWALLOW":
      return 0.48;
    case "DIGEST":
      return 0.45;
    case "REGURGITATE":
      return 0.42;
    case "TOSS":
      return 0.42;
    case "STOMP":
      return 0.42;
    case "TRAMPLE":
      return 0.5;
    case "SHARDS":
      return 0.38;
    case "HAMMER":
      return 0.44;
    case "BREAK_OFF":
      return 0.42;
  }
}

/** Whether the cue shakes the whole board (the Stomp, never reduced). */
export function giantBoardShakeCssPxV7(
  effect: GiantFeedbackEffectV7,
  progress: number,
): number {
  if (effect !== "STOMP") return 0;
  const local = phase(
    progress,
    GIANT_EFFECT_BEAT_V7.STOMP,
    GIANT_EFFECT_BEAT_V7.STOMP + 0.3,
  );
  return local === null ? 0 : Math.sin(local * Math.PI * 7) * (1 - local) * 5;
}

export interface GiantFeedbackV7 {
  readonly effect: GiantFeedbackEffectV7;
  /**
   * The giant's cell (the Juggernaut, the Abomination, the Troll, the
   * Brontosaurus, the Colossus, the Gingerbread Giant); SHARDS the
   * shattered unit's cell; HAMMER the Titan's.
   */
  readonly from: CoordV7;
  /**
   * The cue's cells: CRUSH the defender and the unit behind it; SWALLOW
   * the victim; REGURGITATE the Zombie's tile; TOSS the Goblin's tile and
   * its landing; STOMP and TRAMPLE each unit hit; SHARDS the eight tiles
   * around; HAMMER the target; BREAK_OFF the two tiles. DIGEST none.
   */
  readonly cells: readonly CoordV7[];
  /** The "−N" of each cell (CRUSH, STOMP, TRAMPLE) or of the DIGEST. */
  readonly amounts?: readonly number[];
  /** SHARDS: the units the shards freeze (a frost sparkle on each). */
  readonly marks?: readonly CoordV7[];
  /** HAMMER: the target stood on a walled centre and the Walls fall. */
  readonly walls?: boolean;
  /** SWALLOW, DIGEST, REGURGITATE: the live look's Undead violet. */
  readonly undeadViolet?: boolean;
  /**
   * TOSS: the thrown Goblin's own sprite and its drawn size in CSS px (the
   * CHIBI art; without it a code-drawn Goblin cartwheels).
   */
  readonly sprite?: GiantSpriteV7;
  readonly progress: number;
  /** Drawn size per world unit over the zoom (LEGACY passes 1). */
  readonly scale?: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A unit's sprite a cue draws in flight, at its drawn size in CSS px. */
export interface GiantSpriteV7 {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

/** A rising number ("−3") and its fade. */
export interface GiantFloatPlanV7 {
  readonly at: Point;
  readonly text: string;
  readonly alpha: number;
}

/** Something thrown or rolled along an arc. */
export interface GiantFlightPlanV7 {
  readonly at: Point;
  /** Turns of the cartwheel or roll so far, in radians. */
  readonly spin: number;
  readonly flight: number;
}

/** A burst (a star, a puff, a crack) and 0 to 1 through its fade. */
export interface GiantBurstPlanV7 {
  readonly at: Point;
  readonly local: number;
}

/** What one frame of a giant cue draws, in screen pixels. */
export interface GiantEffectPlanV7 {
  readonly effect: GiantFeedbackEffectV7;
  /** CSS px per world unit (the zoom times the cue scale). */
  readonly unit: number;
  readonly zoom: number;
  /** The giant's cell centre (on the ground). */
  readonly from: Point;
  /** The cells' centres (on the ground). */
  readonly cells: readonly Point[];
  /** The Goblin, the chunks, the spit, the shards, in flight. */
  readonly flights: readonly GiantFlightPlanV7[];
  /** The crack, the slam, the landings, the pops, the stamps. */
  readonly bursts: readonly GiantBurstPlanV7[];
  /** STOMP: the ground ring's half size and 0 to 1 through it. */
  readonly ring: {
    readonly at: Point;
    readonly halfSize: number;
    readonly local: number;
  } | null;
  readonly floats: readonly GiantFloatPlanV7[];
  /** SWALLOW: the maw and its swirl, 0 to 1 (null outside it). */
  readonly maw: number | null;
  /** HAMMER: the hammer's swing, 0 (raised) to 1 (struck), or null. */
  readonly swing: number | null;
  /** HAMMER on Walls, BREAK_OFF's crack: 0 to 1 through the crumble. */
  readonly crumble: number | null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function phase(progress: number, from: number, to: number): number | null {
  return progress < from || progress > to
    ? null
    : (progress - from) / (to - from);
}

function easeOut(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

/** How far a unit's chest is above its cell centre (world units). */
const BODY_LIFT = 18;

/** The arc of a thrown Goblin, a rolled chunk and the spit (world units). */
const TOSS_ARC = 120;
const SPIT_ARC = 54;
const CHUNK_HOP = 18;

/**
 * The geometry of one frame of a giant cue. Pure, so tests can read it.
 */
export function giantEffectPlanV7(
  feedback: GiantFeedbackV7,
  camera: CameraState,
): GiantEffectPlanV7 {
  const zoom = camera.zoom;
  const unit = zoom * (feedback.scale ?? ATTACK_EFFECT_SCALE_V7);
  const progress = clamp01(feedback.progress);
  const effect = feedback.effect;
  const centre = (at: CoordV7): Point => worldToScreen(projectGrid(at), camera);
  const from = centre(feedback.from);
  const cells = feedback.cells.map(centre);
  const flights: GiantFlightPlanV7[] = [];
  const bursts: GiantBurstPlanV7[] = [];
  const floats: GiantFloatPlanV7[] = [];
  const amounts = feedback.amounts ?? [];
  const impact = GIANT_EFFECT_BEAT_V7[effect];
  /** A "−N" rising from `at` from `start` to the end of the cue. */
  const float = (
    at: Point,
    amount: number | undefined,
    start: number,
  ): void => {
    if (amount === undefined) return;
    const local = phase(progress, start, 1);
    if (local === null) return;
    floats.push({
      at: { x: at.x, y: at.y - (BODY_LIFT + 26 + 30 * easeOut(local)) * zoom },
      text: `−${amount}`,
      alpha: local < 0.75 ? 1 : 1 - (local - 0.75) / 0.25,
    });
  };
  /** A point along an arc from `start` to `end` at `t`. */
  const arc = (start: Point, end: Point, t: number, height: number): Point => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t - Math.sin(Math.PI * t) * height * zoom,
  });
  let ring: GiantEffectPlanV7["ring"] = null;
  let maw: number | null = null;
  let swing: number | null = null;
  let crumble: number | null = null;
  switch (effect) {
    case "CRUSH": {
      // The thud on the edge the defender could not cross, and "−3" on
      // the defender and the unit behind it.
      const target = cells[0];
      const targetCell = feedback.cells[0];
      if (target !== undefined && targetCell !== undefined) {
        const dx = Math.sign(targetCell.x - feedback.from.x);
        const dy = Math.sign(targetCell.y - feedback.from.y);
        const edge = {
          x: target.x + (dx * TILE_WIDTH * zoom) / 2,
          y: target.y + (dy * TILE_WIDTH * zoom) / 2 - BODY_LIFT * zoom,
        };
        const local = phase(progress, impact, 1);
        if (local !== null) bursts.push({ at: edge, local });
      }
      cells.forEach((at, index) => float(at, amounts[index], impact + 0.02));
      break;
    }
    case "SWALLOW": {
      maw = phase(progress, 0, 0.8);
      const victim = cells[0];
      if (victim !== undefined) {
        // Wisps spiral from the victim into the Abomination.
        for (let wisp = 0; wisp < 3; wisp += 1) {
          const local = phase(progress, 0.08 + wisp * 0.08, 0.62 + wisp * 0.04);
          if (local === null) continue;
          const point = arc(
            { x: victim.x, y: victim.y - BODY_LIFT * zoom },
            { x: from.x, y: from.y - (BODY_LIFT + 4) * zoom },
            easeOut(local),
            16 + wisp * 10,
          );
          flights.push({ at: point, spin: local * Math.PI * 3, flight: local });
        }
      }
      const gulp = phase(progress, impact, 1);
      if (gulp !== null)
        bursts.push({ at: { x: from.x, y: from.y - 6 * zoom }, local: gulp });
      break;
    }
    case "DIGEST": {
      // Bubbles rise from the belly; the digest's number above it.
      for (let bubble = 0; bubble < 5; bubble += 1) {
        const local = phase(progress, bubble * 0.1, 0.5 + bubble * 0.1);
        if (local === null) continue;
        flights.push({
          at: {
            x: from.x + (bubble - 2) * 9 * zoom,
            y: from.y + (8 - 70 * local) * zoom,
          },
          spin: local,
          flight: local,
        });
      }
      float({ x: from.x, y: from.y + 10 * zoom }, amounts[0], 0.1);
      break;
    }
    case "REGURGITATE": {
      const tile = cells[0];
      if (tile !== undefined) {
        const local = phase(progress, 0.08, impact);
        if (local !== null)
          flights.push({
            at: arc(
              { x: from.x, y: from.y - (BODY_LIFT + 14) * zoom },
              { x: tile.x, y: tile.y - 8 * zoom },
              local,
              SPIT_ARC,
            ),
            spin: local * Math.PI * 2,
            flight: local,
          });
        const splat = phase(progress, impact, 1);
        if (splat !== null)
          bursts.push({
            at: { x: tile.x, y: tile.y - 8 * zoom },
            local: splat,
          });
      }
      maw = phase(progress, 0, impact);
      break;
    }
    case "TOSS": {
      const start = cells[0];
      const end = cells[1];
      if (start !== undefined && end !== undefined) {
        const local = phase(progress, 0.04, impact);
        if (local !== null)
          flights.push({
            at: arc(
              { x: start.x, y: start.y - BODY_LIFT * zoom },
              { x: end.x, y: end.y - BODY_LIFT * zoom },
              local,
              TOSS_ARC,
            ),
            // Two and a half cartwheels, toward the landing.
            spin: local * Math.PI * 5 * (end.x >= start.x ? 1 : -1),
            flight: local,
          });
        const dust = phase(progress, impact, 1);
        if (dust !== null) bursts.push({ at: end, local: dust });
        // The Troll's heave: a swoosh at its side.
        const heave = phase(progress, 0, 0.22);
        if (heave !== null) bursts.push({ at: start, local: heave });
      }
      break;
    }
    case "STOMP": {
      const slam = phase(progress, impact, 0.86);
      if (slam !== null)
        ring = {
          at: from,
          halfSize: 1.5 * TILE_WIDTH * zoom * (0.3 + 0.7 * easeOut(slam)),
          local: slam,
        };
      // The foot: raised before the slam, its dust after.
      const lift = phase(progress, 0, impact);
      if (lift !== null) bursts.push({ at: from, local: -lift });
      const dust = phase(progress, impact, 1);
      if (dust !== null)
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1)
            if (dx !== 0 || dy !== 0)
              bursts.push({
                at: centre({
                  x: feedback.from.x + dx,
                  y: feedback.from.y + dy,
                }),
                local: dust,
              });
      cells.forEach((at, index) => float(at, amounts[index], impact + 0.04));
      break;
    }
    case "TRAMPLE": {
      cells.forEach((at, index) => {
        const start = impact + index * 0.14;
        const local = phase(progress, start, 1);
        if (local !== null) bursts.push({ at, local });
        float(at, amounts[index], start + 0.04);
      });
      break;
    }
    case "SHARDS": {
      const burst = phase(progress, 0, 0.55);
      if (burst !== null)
        bursts.push({
          at: { x: from.x, y: from.y - BODY_LIFT * zoom },
          local: burst,
        });
      cells.forEach((at, index) => {
        const local = phase(progress, impact + (index % 3) * 0.02, 0.62);
        if (local !== null)
          flights.push({
            at: arc(
              { x: from.x, y: from.y - BODY_LIFT * zoom },
              { x: at.x, y: at.y - 10 * zoom },
              easeOut(local),
              22,
            ),
            spin:
              Math.atan2(at.y - from.y, at.x - from.x) + local * Math.PI * 0.5,
            flight: local,
          });
      });
      const frost = phase(progress, 0.5, 1);
      if (frost !== null)
        for (const at of (feedback.marks ?? []).map(centre))
          bursts.push({ at, local: 1 + frost });
      break;
    }
    case "HAMMER": {
      swing = clamp01(progress / impact);
      const target = cells[0];
      if (target !== undefined) {
        const local = phase(progress, impact, 1);
        if (local !== null)
          bursts.push({
            at: { x: target.x, y: target.y - BODY_LIFT * zoom },
            local,
          });
      }
      // The Walls stand round the centre until the blow, then crumble.
      if (feedback.walls === true)
        crumble = progress < impact ? 0 : phase(progress, impact, 1);
      break;
    }
    case "BREAK_OFF": {
      crumble = phase(progress, 0, 0.3);
      cells.forEach((at, index) => {
        const local = phase(progress, 0.12 + index * 0.04, impact);
        if (local !== null)
          flights.push({
            at: arc(
              { x: from.x, y: from.y - 8 * zoom },
              { x: at.x, y: at.y - 6 * zoom },
              local,
              CHUNK_HOP + 14 * Math.abs(Math.sin(local * Math.PI * 2)),
            ),
            spin: local * Math.PI * 4 * (at.x >= from.x ? 1 : -1),
            flight: local,
          });
        const pop = phase(progress, impact + index * 0.04, 1);
        if (pop !== null)
          bursts.push({
            at: { x: at.x, y: at.y - BODY_LIFT * zoom },
            local: pop,
          });
      });
      break;
    }
  }
  return {
    effect,
    unit,
    zoom,
    from,
    cells,
    flights,
    bursts,
    ring,
    floats,
    maw,
    swing,
    crumble,
  };
}

/** A unit the cue moves: its sprite's scale and sideways shift. */
export interface GiantUnitPulseV7 {
  readonly unitId: number;
  readonly scale: number;
  readonly offsetXCssPx?: number;
}

/**
 * The units a cue moves while it plays (the board host draws them): the
 * crushed pair jolt at the thud, the victim shrinks toward the
 * Abomination, the stomped units shake, the new Zombie and Gingerbread
 * Men pop up. `unitIds` are the step's, in the order of its cells.
 */
export function giantUnitPulsesV7(
  step: {
    readonly effect: GiantFeedbackEffectV7;
    readonly unitIds: readonly number[];
    readonly from: CoordV7;
    readonly cells: readonly CoordV7[];
    /** The giant itself: it rears, heaves, gulps or wobbles. */
    readonly actorUnitId?: number;
  },
  progress: number,
  zoom: number,
): readonly GiantUnitPulseV7[] {
  const impact = GIANT_EFFECT_BEAT_V7[step.effect];
  const pulses: GiantUnitPulseV7[] = [];
  const actor = step.actorUnitId;
  if (actor !== undefined) {
    if (step.effect === "STOMP") {
      // The Brontosaurus rears up, then slams down and squashes.
      const rear = phase(progress, 0, impact);
      const land = phase(progress, impact, impact + 0.2);
      if (rear !== null)
        pulses.push({ unitId: actor, scale: 1 + 0.14 * easeOut(rear) });
      else if (land !== null)
        pulses.push({
          unitId: actor,
          scale: 0.92 + 0.08 * easeOut(land),
        });
    } else if (step.effect === "SWALLOW" || step.effect === "TOSS") {
      // The gulp bulges the Abomination; the heave squashes the Troll.
      const local =
        step.effect === "SWALLOW"
          ? phase(progress, impact - 0.04, impact + 0.22)
          : phase(progress, 0, 0.24);
      if (local !== null)
        pulses.push({
          unitId: actor,
          scale:
            1 +
            (step.effect === "SWALLOW" ? 0.1 : -0.08) *
              Math.sin(Math.PI * local),
        });
    } else if (step.effect === "BREAK_OFF") {
      // The Giant shudders as the chunks come away.
      const local = phase(progress, 0, 0.3);
      if (local !== null)
        pulses.push({
          unitId: actor,
          scale: 1,
          offsetXCssPx: Math.sin(local * Math.PI * 6) * (1 - local) * 4 * zoom,
        });
    }
  }
  const jolt = (start: number, strength: number): number | null => {
    const local = phase(progress, start, start + 0.3);
    return local === null
      ? null
      : Math.sin(local * Math.PI * 5) * (1 - local) * strength * zoom;
  };
  step.unitIds.forEach((unitId, index) => {
    switch (step.effect) {
      case "CRUSH":
      case "STOMP":
      case "TRAMPLE": {
        const start =
          step.effect === "TRAMPLE" ? impact + index * 0.14 : impact;
        const offset = jolt(start, step.effect === "CRUSH" ? 7 : 5);
        if (offset !== null)
          pulses.push({ unitId, scale: 1, offsetXCssPx: offset });
        break;
      }
      case "SWALLOW": {
        const local = phase(progress, 0.12, impact);
        if (local === null) break;
        const cell = step.cells[index];
        const toward =
          cell === undefined ? 0 : Math.sign(step.from.x - cell.x) * 1;
        pulses.push({
          unitId,
          scale: Math.max(0.05, 1 - easeOut(local) * 0.95),
          offsetXCssPx: toward * easeOut(local) * 40 * zoom,
        });
        break;
      }
      case "REGURGITATE":
      case "BREAK_OFF": {
        const local = phase(progress, impact + index * 0.04, impact + 0.3);
        if (local === null) break;
        pulses.push({
          unitId,
          scale:
            local < 0.6
              ? 0.3 + (1.12 - 0.3) * (local / 0.6)
              : 1.12 - 0.12 * ((local - 0.6) / 0.4),
        });
        break;
      }
      default:
        break;
    }
  });
  return pulses;
}

// ------------------------------------------------------------- palettes ---

const INK = "#10131c";
const WHITE = "#ffffff";
const DAMAGE_RED = "#ff5a4f";
/** Human steel and the Juggernaut's dust (docs/art/factions: Human). */
const HUMAN = { steel: "#b9c3cf", gold: "#fddb21", dust: "#d8c9a6" } as const;
/** The Undead's classic pale blue (the Classic look and LEGACY). */
const UNDEAD_CLASSIC: UndeadPaletteV7 = {
  dark: "#3a4558",
  mid: "#7f8ca0",
  lit: "#a9bdd8",
  pale: "#d2e2f6",
  outline: "#18202c",
};

/** The Undead cue colours (the live look's violet or the classic blue). */
interface UndeadPaletteV7 {
  readonly dark: string;
  readonly mid: string;
  readonly lit: string;
  readonly pale: string;
  readonly outline: string;
}
/** Goblin olive and charcoal (docs/art/factions/GOBLIN.md). */
const GOBLIN = {
  skin: "#9aa83e",
  skinShade: "#6c7a2a",
  charcoal: "#33363d",
  cream: "#efe6c8",
  dust: "#d9c9a3",
  dustShade: "#a8956c",
} as const;
/** Dinosaur sand, hide and basalt. */
const DINOSAUR = {
  sand: "#debb78",
  hide: "#cda461",
  basalt: "#5b616c",
  charcoal: "#33363d",
  foot: "#4d4a44",
} as const;
const ICE = ICE_FOLK_PALETTE_V7;
const DWARF = DWARF_PALETTE_V7;
const CANDY = CANDY_PALETTE_V7;
const MARTIAN = MARTIAN_PALETTE_V7;
/** Wall stone (the Walls reward). */
const STONE = { lit: "#c9c2b4", mid: "#8f877a", dark: "#5a544b" } as const;

// --------------------------------------------------------------- shapes ---

function circle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  context.beginPath();
  context.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
}

function starPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
  twist = 0,
): void {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2 + twist;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/** A round dust puff: three lobes with a light top. */
function puff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  light: string,
  outline: string,
  unit: number,
): void {
  context.beginPath();
  for (const [dx, dy, scale] of [
    [-0.55, 0.15, 0.7],
    [0.55, 0.2, 0.72],
    [0, -0.1, 1],
  ] as const) {
    context.moveTo(x + dx * radius + scale * radius, y + dy * radius);
    context.arc(
      x + dx * radius,
      y + dy * radius,
      scale * radius,
      0,
      Math.PI * 2,
    );
  }
  context.strokeStyle = outline;
  context.lineWidth = Math.max(1, 1.4 * unit);
  context.stroke();
  context.fillStyle = fill;
  context.fill();
  circle(context, x - radius * 0.2, y - radius * 0.35, radius * 0.42);
  context.fillStyle = light;
  context.fill();
}

/** A rounded square path centred on `at`. */
function roundedSquare(
  context: CanvasRenderingContext2D,
  at: Point,
  half: number,
  corner: number,
): void {
  context.beginPath();
  context.roundRect(at.x - half, at.y - half, half * 2, half * 2, corner);
}

/** "−3" rising, in red with a dark casing and a white rim. */
function drawFloats(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  fill = DAMAGE_RED,
): void {
  const size = Math.max(15, 28 * plan.zoom);
  context.font = `900 ${size}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const entry of plan.floats) {
    context.save();
    context.globalAlpha *= entry.alpha;
    context.lineJoin = "round";
    context.lineWidth = Math.max(3, size * 0.32);
    context.strokeStyle = INK;
    context.strokeText(entry.text, entry.at.x, entry.at.y);
    context.lineWidth = Math.max(1, size * 0.1);
    context.strokeStyle = WHITE;
    context.strokeText(entry.text, entry.at.x, entry.at.y);
    context.fillStyle = fill;
    context.fillText(entry.text, entry.at.x, entry.at.y);
    context.restore();
  }
}

/**
 * Draws one frame of a giant cue on the effects overlay.
 */
export function drawGiantFeedbackV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  feedback: GiantFeedbackV7,
): void {
  const plan = giantEffectPlanV7(feedback, camera);
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  const violet: UndeadPaletteV7 =
    feedback.undeadViolet === true ? NECRO_BOLT_VIOLET_V7 : UNDEAD_CLASSIC;
  switch (plan.effect) {
    case "CRUSH":
      drawCrush(context, plan);
      break;
    case "SWALLOW":
      drawSwallow(context, plan, violet);
      break;
    case "DIGEST":
      drawDigest(context, plan, violet);
      break;
    case "REGURGITATE":
      drawRegurgitate(context, plan, violet);
      break;
    case "TOSS":
      drawToss(context, plan, feedback.sprite ?? null);
      break;
    case "STOMP":
      drawStomp(context, plan);
      break;
    case "TRAMPLE":
      drawTrample(context, plan);
      break;
    case "SHARDS":
      drawShards(context, plan);
      break;
    case "HAMMER":
      drawHammer(context, plan, feedback.walls === true);
      break;
    case "BREAK_OFF":
      drawBreakOff(context, plan);
      break;
  }
  context.restore();
}

/** The crush: a white star and a jagged crack ring on the blocked edge. */
function drawCrush(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
): void {
  const u = plan.unit;
  for (const burst of plan.bursts) {
    const local = burst.local;
    const fade = local < 0.6 ? 1 : 1 - (local - 0.6) / 0.4;
    context.save();
    context.globalAlpha *= fade;
    // The crack ring: a jagged ring that runs out from the thud.
    const radius = (14 + 38 * easeOut(Math.min(1, local / 0.6))) * u;
    context.beginPath();
    for (let index = 0; index <= 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const jag = index % 2 === 0 ? 1 : 0.78;
      const px = burst.at.x + Math.cos(angle) * radius * jag;
      const py = burst.at.y + Math.sin(angle) * radius * jag * 0.7;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.lineWidth = Math.max(2, 5 * u);
    context.strokeStyle = INK;
    context.stroke();
    context.lineWidth = Math.max(1, 2.5 * u);
    context.strokeStyle = HUMAN.steel;
    context.stroke();
    // The thud: a white star with a gold heart, fading fast.
    if (local < 0.45) {
      const star = (1 - local / 0.45) * 30 * u;
      starPath(context, burst.at.x, burst.at.y, star, star * 0.45, 6);
      context.fillStyle = WHITE;
      context.fill();
      context.lineWidth = Math.max(1, 1.6 * u);
      context.strokeStyle = INK;
      context.stroke();
      circle(context, burst.at.x, burst.at.y, star * 0.3);
      context.fillStyle = HUMAN.gold;
      context.fill();
    }
    // Two puffs of dust thrown up the edge.
    for (const side of [-1, 1]) {
      puff(
        context,
        burst.at.x + side * radius * 0.9,
        burst.at.y + 6 * u - local * 10 * u,
        (5 + 6 * local) * u,
        HUMAN.dust,
        "#efe4c8",
        INK,
        u,
      );
    }
    context.restore();
  }
  drawFloats(context, plan);
}

/** The gulp: a dark maw on the Abomination and wisps spiralling into it. */
function drawSwallow(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  palette: UndeadPaletteV7,
): void {
  const u = plan.unit;
  const belly = { x: plan.from.x, y: plan.from.y - 6 * plan.zoom };
  if (plan.maw !== null) {
    const open = Math.sin(Math.PI * Math.min(1, plan.maw * 1.15));
    context.save();
    context.globalAlpha *= 0.85;
    context.beginPath();
    context.ellipse(
      belly.x,
      belly.y,
      18 * u * open + 2,
      12 * u * open + 1,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = palette.outline;
    context.fill();
    context.lineWidth = Math.max(1.5, 3 * u);
    context.strokeStyle = palette.mid;
    context.stroke();
    // A swirl inside the maw.
    context.beginPath();
    for (let index = 0; index <= 24; index += 1) {
      const t = index / 24;
      const angle = t * Math.PI * 3 + plan.maw * Math.PI * 4;
      const radius = (1 - t) * 14 * u * open;
      const px = belly.x + Math.cos(angle) * radius;
      const py = belly.y + Math.sin(angle) * radius * 0.66;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.lineWidth = Math.max(1, 2 * u);
    context.strokeStyle = palette.lit;
    context.stroke();
    context.restore();
  }
  for (const wisp of plan.flights) {
    const size = (7 - 4 * wisp.flight) * u;
    context.save();
    context.globalAlpha *= 0.9 - 0.5 * wisp.flight;
    circle(context, wisp.at.x, wisp.at.y, size + 2 * u);
    context.fillStyle = palette.dark;
    context.fill();
    circle(context, wisp.at.x, wisp.at.y, size);
    context.fillStyle = palette.lit;
    context.fill();
    circle(context, wisp.at.x - size * 0.3, wisp.at.y - size * 0.3, size * 0.4);
    context.fillStyle = palette.pale;
    context.fill();
    context.restore();
  }
  // The gulp: a ring bulging out round the belly, and a small burp of
  // bubbles.
  for (const burst of plan.bursts) {
    const local = burst.local;
    context.save();
    context.globalAlpha *= 1 - local;
    context.beginPath();
    context.ellipse(
      burst.at.x,
      burst.at.y,
      (16 + 24 * easeOut(local)) * u,
      (11 + 14 * easeOut(local)) * u,
      0,
      0,
      Math.PI * 2,
    );
    context.lineWidth = Math.max(2, 4 * u * (1 - local) + 1);
    context.strokeStyle = palette.lit;
    context.stroke();
    for (let bubble = 0; bubble < 3; bubble += 1) {
      circle(
        context,
        burst.at.x + (bubble - 1) * 10 * u,
        burst.at.y - (24 + 30 * local + bubble * 6) * u,
        (3 + bubble) * u,
      );
      context.fillStyle = palette.pale;
      context.fill();
      context.lineWidth = Math.max(1, 1 * u);
      context.strokeStyle = palette.dark;
      context.stroke();
    }
    context.restore();
  }
}

/** The digest: violet bubbles from the belly and its "−4". */
function drawDigest(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  palette: UndeadPaletteV7,
): void {
  const u = plan.unit;
  for (const bubble of plan.flights) {
    context.save();
    context.globalAlpha *= 1 - bubble.flight * 0.8;
    const size = (4 + 3 * bubble.flight) * u;
    circle(context, bubble.at.x, bubble.at.y, size);
    context.fillStyle = palette.lit;
    context.fill();
    context.lineWidth = Math.max(1, 1.2 * u);
    context.strokeStyle = palette.dark;
    context.stroke();
    circle(
      context,
      bubble.at.x - size * 0.3,
      bubble.at.y - size * 0.35,
      size * 0.3,
    );
    context.fillStyle = palette.pale;
    context.fill();
    context.restore();
  }
  drawFloats(context, plan, palette.lit);
}

/** The spit: a violet glob arcs to the tile and splats. */
function drawRegurgitate(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  palette: UndeadPaletteV7,
): void {
  const u = plan.unit;
  if (plan.maw !== null) {
    const open = Math.sin(Math.PI * plan.maw);
    context.beginPath();
    context.ellipse(
      plan.from.x,
      plan.from.y - (BODY_LIFT + 14) * plan.zoom,
      12 * u * open + 1,
      8 * u * open + 1,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = palette.outline;
    context.fill();
  }
  for (const glob of plan.flights) {
    const size = 9 * u;
    context.save();
    context.translate(glob.at.x, glob.at.y);
    context.rotate(glob.spin);
    context.beginPath();
    context.ellipse(0, 0, size * 1.2, size * 0.85, 0, 0, Math.PI * 2);
    context.fillStyle = palette.mid;
    context.fill();
    context.lineWidth = Math.max(1, 2 * u);
    context.strokeStyle = palette.outline;
    context.stroke();
    circle(context, -size * 0.35, -size * 0.25, size * 0.35);
    context.fillStyle = palette.pale;
    context.fill();
    context.restore();
  }
  for (const burst of plan.bursts) {
    const local = burst.local;
    context.save();
    context.globalAlpha *= 1 - local * 0.9;
    const spread = (14 + 26 * easeOut(local)) * u;
    for (let drop = 0; drop < 7; drop += 1) {
      const angle = (drop / 7) * Math.PI * 2 + 0.3;
      circle(
        context,
        burst.at.x + Math.cos(angle) * spread,
        burst.at.y + Math.sin(angle) * spread * 0.55,
        (5 - 3 * local) * u,
      );
      context.fillStyle = palette.lit;
      context.fill();
    }
    context.beginPath();
    context.ellipse(
      burst.at.x,
      burst.at.y,
      spread * 0.6,
      spread * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = palette.mid;
    context.fill();
    context.restore();
  }
}

/** A code-drawn Goblin, cartwheeling: olive limbs spread like a star. */
function drawCartwheelGoblin(
  context: CanvasRenderingContext2D,
  at: Point,
  spin: number,
  u: number,
): void {
  context.save();
  context.translate(at.x, at.y);
  context.rotate(spin);
  const limb = 14 * u;
  context.lineWidth = Math.max(2, 5.5 * u);
  context.strokeStyle = INK;
  for (const angle of [0.6, 2.2, 3.9, 5.5]) {
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Math.cos(angle) * limb, Math.sin(angle) * limb);
    context.stroke();
  }
  context.lineWidth = Math.max(1, 3.2 * u);
  context.strokeStyle = GOBLIN.skin;
  for (const angle of [0.6, 2.2, 3.9, 5.5]) {
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Math.cos(angle) * limb, Math.sin(angle) * limb);
    context.stroke();
  }
  // The body: a charcoal tunic.
  context.beginPath();
  context.ellipse(0, 2 * u, 7 * u, 8 * u, 0, 0, Math.PI * 2);
  context.fillStyle = GOBLIN.charcoal;
  context.fill();
  context.lineWidth = Math.max(1, 1.6 * u);
  context.strokeStyle = INK;
  context.stroke();
  // The head with its long sideways ears, the faction's signature.
  context.fillStyle = GOBLIN.skinShade;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 4 * u, -11 * u);
    context.lineTo(side * 14 * u, -15 * u);
    context.lineTo(side * 4 * u, -6 * u);
    context.closePath();
    context.fill();
    context.stroke();
  }
  circle(context, 0, -10 * u, 6.5 * u);
  context.fillStyle = GOBLIN.skin;
  context.fill();
  context.stroke();
  context.fillStyle = GOBLIN.cream;
  for (const side of [-1, 1]) {
    circle(context, side * 2.4 * u, -11 * u, 1.3 * u);
    context.fill();
  }
  context.restore();
}

/** The toss: the Troll's heave, the cartwheeling Goblin, the dust. */
function drawToss(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  sprite: GiantSpriteV7 | null,
): void {
  const u = plan.unit;
  const start = plan.cells[0];
  const end = plan.cells[1];
  for (const burst of plan.bursts) {
    const local = burst.local;
    if (burst.at === start) {
      // The heave: a cream swoosh over the Goblin's tile as it is flung.
      context.save();
      context.globalAlpha *= 1 - local;
      context.beginPath();
      context.arc(
        burst.at.x,
        burst.at.y - BODY_LIFT * plan.zoom,
        26 * u,
        Math.PI * (1.1 - 0.3 * local),
        Math.PI * (1.8 + 0.2 * local),
      );
      context.lineWidth = Math.max(3, 6 * u);
      context.strokeStyle = GOBLIN.charcoal;
      context.stroke();
      context.lineWidth = Math.max(2, 3.5 * u);
      context.strokeStyle = GOBLIN.cream;
      context.stroke();
      context.restore();
    } else if (burst.at === end) {
      // The landing: dust thrown out on both sides.
      context.save();
      context.globalAlpha *= local < 0.6 ? 1 : 1 - (local - 0.6) / 0.4;
      for (const side of [-1, 0, 1])
        puff(
          context,
          burst.at.x + side * (14 + 18 * easeOut(local)) * u,
          burst.at.y + (side === 0 ? -4 : 2) * u - local * 8 * u,
          (7 + 5 * local - Math.abs(side) * 1.5) * u,
          GOBLIN.dust,
          "#f1e6c6",
          GOBLIN.dustShade,
          u,
        );
      context.restore();
    }
  }
  for (const goblin of plan.flights) {
    // Its shadow runs along the ground under the arc.
    if (start !== undefined && end !== undefined) {
      const ground = {
        x: start.x + (end.x - start.x) * goblin.flight,
        y: start.y + (end.y - start.y) * goblin.flight + 22 * plan.zoom,
      };
      context.save();
      context.globalAlpha *= 0.3;
      context.beginPath();
      context.ellipse(ground.x, ground.y, 14 * u, 5 * u, 0, 0, Math.PI * 2);
      context.fillStyle = GOBLIN.charcoal;
      context.fill();
      context.restore();
    }
    if (sprite === null)
      drawCartwheelGoblin(context, goblin.at, goblin.spin, u * 2.2);
    else {
      // The Goblin's own sprite cartwheels about its middle.
      context.save();
      context.translate(goblin.at.x, goblin.at.y);
      context.rotate(goblin.spin);
      context.imageSmoothingEnabled = true;
      context.drawImage(
        sprite.image,
        -sprite.width / 2,
        -sprite.height / 2,
        sprite.width,
        sprite.height,
      );
      context.restore();
    }
  }
}

/** The Stomp: the foot's shadow, the slam's ground ring, dust and numbers. */
function drawStomp(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
): void {
  const u = plan.unit;
  for (const burst of plan.bursts) {
    if (burst.local >= 0) continue;
    // Before the slam: the raised foot's shadow darkens on the ground.
    const lift = -burst.local;
    context.save();
    context.globalAlpha *= 0.25 + 0.45 * lift;
    context.beginPath();
    context.ellipse(
      burst.at.x,
      burst.at.y + 14 * plan.zoom,
      30 * u * (1.2 - 0.4 * lift),
      11 * u,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = DINOSAUR.charcoal;
    context.fill();
    context.restore();
  }
  if (plan.ring !== null) {
    const local = plan.ring.local;
    context.save();
    // The 3 x 3 flushes sand, then a rounded ground ring runs out to it.
    context.globalAlpha *= 0.28 * (1 - local);
    roundedSquare(
      context,
      plan.ring.at,
      1.5 * TILE_WIDTH * plan.zoom,
      18 * plan.zoom,
    );
    context.fillStyle = DINOSAUR.sand;
    context.fill();
    context.restore();
    context.save();
    context.globalAlpha *= 1 - local * 0.85;
    roundedSquare(context, plan.ring.at, plan.ring.halfSize, 22 * plan.zoom);
    context.lineWidth = Math.max(3, 9 * u * (1 - local) + 2);
    context.strokeStyle = "rgba(16, 19, 28, 0.55)";
    context.stroke();
    context.lineWidth = Math.max(2, 5 * u * (1 - local) + 1);
    context.strokeStyle = DINOSAUR.sand;
    context.stroke();
    // Ground cracks from the foot.
    if (local < 0.7) {
      context.lineWidth = Math.max(1.5, 3 * u);
      context.strokeStyle = DINOSAUR.basalt;
      for (let crack = 0; crack < 6; crack += 1) {
        const angle = (crack / 6) * Math.PI * 2 + 0.4;
        const length = (24 + 30 * easeOut(local / 0.7)) * u;
        context.beginPath();
        context.moveTo(plan.ring.at.x, plan.ring.at.y + 10 * plan.zoom);
        context.lineTo(
          plan.ring.at.x + Math.cos(angle) * length * 0.5 + 4 * u,
          plan.ring.at.y + 10 * plan.zoom + Math.sin(angle) * length * 0.25,
        );
        context.lineTo(
          plan.ring.at.x + Math.cos(angle) * length,
          plan.ring.at.y + 10 * plan.zoom + Math.sin(angle) * length * 0.5,
        );
        context.stroke();
      }
    }
    context.restore();
  }
  for (const burst of plan.bursts) {
    if (burst.local < 0) continue;
    const local = burst.local;
    context.save();
    context.globalAlpha *= local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    // Dust kicked up at the ground line, in front of the units' feet,
    // thrown outward from the slam.
    const away = Math.sign(burst.at.x - plan.from.x) || 1;
    puff(
      context,
      burst.at.x + away * 10 * easeOut(local) * u,
      burst.at.y + 40 * plan.zoom - local * 12 * u,
      (6 + 8 * easeOut(local)) * u,
      DINOSAUR.sand,
      "#f2deb2",
      DINOSAUR.basalt,
      u,
    );
    context.restore();
  }
  drawFloats(context, plan);
}

/** The trample: a stamp of dust and a footprint on each unit stepped over. */
function drawTrample(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
): void {
  const u = plan.unit;
  for (const burst of plan.bursts) {
    const local = burst.local;
    context.save();
    context.globalAlpha *= local < 0.55 ? 1 : 1 - (local - 0.55) / 0.45;
    // The Colossus's footprint: a chrome-rimmed oval with three toes.
    const ground = { x: burst.at.x, y: burst.at.y + 18 * plan.zoom };
    context.beginPath();
    context.ellipse(ground.x, ground.y, 22 * u, 9 * u, 0, 0, Math.PI * 2);
    context.fillStyle = MARTIAN.gunmetal;
    context.fill();
    context.lineWidth = Math.max(1.5, 2.5 * u);
    context.strokeStyle = MARTIAN.magenta;
    context.stroke();
    for (const toe of [-1, 0, 1]) {
      circle(context, ground.x + toe * 12 * u, ground.y - 8 * u, 3.5 * u);
      context.fillStyle = MARTIAN.chromeShade;
      context.fill();
    }
    // The stamp's dust ring, thrown out.
    const spread = (16 + 22 * easeOut(local)) * u;
    for (const side of [-1, 1])
      puff(
        context,
        ground.x + side * spread,
        ground.y - 6 * u - local * 6 * u,
        (6 + 4 * local) * u,
        "#d9d3c7",
        "#f1ede4",
        MARTIAN.gunmetal,
        u,
      );
    // A magenta flash at the stamp.
    if (local < 0.35) {
      const star = (1 - local / 0.35) * 16 * u;
      starPath(
        context,
        burst.at.x,
        burst.at.y - BODY_LIFT * plan.zoom,
        star,
        star * 0.45,
        5,
      );
      context.fillStyle = MARTIAN.magentaPale;
      context.fill();
      context.lineWidth = Math.max(1, 1.5 * u);
      context.strokeStyle = MARTIAN.magentaDark;
      context.stroke();
    }
    context.restore();
  }
  drawFloats(context, plan);
}

/** The Glacial Smash: a big ice burst and shards to the eight tiles. */
function drawShards(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
): void {
  const u = plan.unit;
  for (const burst of plan.bursts) {
    if (burst.local > 1) continue;
    const local = burst.local;
    context.save();
    context.globalAlpha *= local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    const outer = (18 + 34 * easeOut(local)) * u;
    starPath(
      context,
      burst.at.x,
      burst.at.y,
      outer,
      outer * 0.42,
      8,
      local * 0.6,
    );
    context.fillStyle = ICE.icePale;
    context.fill();
    context.lineWidth = Math.max(1.5, 2.5 * u);
    context.strokeStyle = ICE.iceDark;
    context.stroke();
    circle(context, burst.at.x, burst.at.y, outer * 0.32);
    context.fillStyle = WHITE;
    context.fill();
    // A frost ring at its edge.
    context.beginPath();
    context.arc(burst.at.x, burst.at.y, outer * 1.2, 0, Math.PI * 2);
    context.lineWidth = Math.max(1, 2 * u * (1 - local));
    context.strokeStyle = ICE.iceGlow;
    context.stroke();
    context.restore();
  }
  for (const shard of plan.flights) {
    context.save();
    context.translate(shard.at.x, shard.at.y);
    context.rotate(shard.spin);
    context.globalAlpha *=
      shard.flight < 0.8 ? 1 : 1 - (shard.flight - 0.8) / 0.2;
    const length = 13 * u;
    context.beginPath();
    context.moveTo(length, 0);
    context.lineTo(-length * 0.4, length * 0.35);
    context.lineTo(-length * 0.7, 0);
    context.lineTo(-length * 0.4, -length * 0.35);
    context.closePath();
    context.fillStyle = ICE.ice;
    context.fill();
    context.lineWidth = Math.max(1, 1.6 * u);
    context.strokeStyle = ICE.outline;
    context.stroke();
    context.beginPath();
    context.moveTo(length * 0.7, 0);
    context.lineTo(-length * 0.2, -length * 0.15);
    context.strokeStyle = ICE.icePale;
    context.stroke();
    context.restore();
  }
  // The freeze on each unit the shards caught: a frost sparkle.
  for (const burst of plan.bursts) {
    if (burst.local <= 1) continue;
    const local = burst.local - 1;
    context.save();
    context.globalAlpha *= local < 0.6 ? 1 : 1 - (local - 0.6) / 0.4;
    const size = (8 + 8 * Math.sin(Math.PI * local)) * u;
    starPath(
      context,
      burst.at.x,
      burst.at.y - (BODY_LIFT + 18) * plan.zoom,
      size,
      size * 0.3,
      6,
    );
    context.fillStyle = ICE.icePale;
    context.fill();
    context.lineWidth = Math.max(1, 1.4 * u);
    context.strokeStyle = ICE.iceDark;
    context.stroke();
    context.restore();
  }
}

/** The Siege Hammer: a brass hammer's blow; Walls crumble into rubble. */
function drawHammer(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
  walls: boolean,
): void {
  const u = plan.unit;
  const target = plan.cells[0];
  if (target === undefined) return;
  // The wall ring: twelve crenellated stone blocks round the centre's
  // ground, thrown out and tumbling down as the Walls fall.
  if (walls && plan.crumble !== null) {
    const crumble = plan.crumble;
    const half = 0.44 * TILE_WIDTH * plan.zoom;
    const ground = { x: target.x, y: target.y + 6 * plan.zoom };
    const fade = crumble < 0.6 ? 1 : 1 - (crumble - 0.6) / 0.4;
    // A low rampart in front of the centre's unit and up its two sides
    // (the overlay is drawn over the unit, so no stone crosses its face).
    const rampart: readonly Point[] = [
      { x: -0.8, y: 0.62 },
      { x: -0.4, y: 0.68 },
      { x: 0, y: 0.7 },
      { x: 0.4, y: 0.68 },
      { x: 0.8, y: 0.62 },
      { x: -0.98, y: 0.3 },
      { x: 0.98, y: 0.3 },
      { x: -1.02, y: -0.04 },
      { x: 1.02, y: -0.04 },
    ];
    for (const [block, spot] of rampart.entries()) {
      const base = { x: spot.x * half, y: spot.y * half };
      const out = Math.hypot(base.x, base.y) || 1;
      const fly = easeOut(crumble);
      const at = {
        x: ground.x + base.x + (base.x / out) * 30 * u * fly,
        y:
          ground.y +
          base.y +
          (base.y / out) * 12 * u * fly -
          18 * u * Math.sin(Math.PI * Math.min(1, crumble * 1.4)) +
          30 * u * crumble * crumble,
      };
      context.save();
      context.globalAlpha *= fade;
      context.translate(at.x, at.y);
      context.rotate(crumble * (block % 2 === 0 ? 2.2 : -1.8));
      const w = 20 * u * (1 - 0.3 * crumble);
      const h = 13 * u * (1 - 0.3 * crumble);
      context.fillStyle = block % 2 === 1 ? STONE.mid : STONE.lit;
      context.fillRect(-w / 2, -h / 2, w, h);
      // A crenel notch while the block still stands.
      if (crumble < 0.15) {
        context.fillStyle = STONE.dark;
        context.fillRect(-w * 0.12, -h / 2, w * 0.24, h * 0.35);
      }
      context.lineWidth = Math.max(1, 1.6 * u);
      context.strokeStyle = INK;
      context.strokeRect(-w / 2, -h / 2, w, h);
      context.restore();
    }
    if (crumble > 0) {
      context.save();
      context.globalAlpha *= fade;
      for (const side of [-1, 0, 1])
        puff(
          context,
          ground.x + side * half * 0.75,
          ground.y + 14 * plan.zoom - crumble * 16 * u,
          (8 + 12 * crumble) * u,
          STONE.lit,
          "#e6e0d4",
          STONE.dark,
          u,
        );
      context.restore();
    }
  }
  // The hammer swings down onto the target from the Titan's side: a brass
  // head on a leather-bound haft, pivoting over the target's shoulder.
  if (plan.swing !== null && plan.swing < 1) {
    const side = target.x >= plan.from.x ? -1 : 1;
    const strike = { x: target.x, y: target.y - (BODY_LIFT + 14) * plan.zoom };
    const pivot = { x: strike.x + side * 52 * u, y: strike.y - 46 * u };
    const reach = Math.hypot(strike.x - pivot.x, strike.y - pivot.y);
    const strikeAngle = Math.atan2(strike.y - pivot.y, strike.x - pivot.x);
    const raised = strikeAngle + side * 2.1;
    const swing = plan.swing * plan.swing;
    const angle = raised + (strikeAngle - raised) * swing;
    const head = {
      x: pivot.x + Math.cos(angle) * reach,
      y: pivot.y + Math.sin(angle) * reach,
    };
    context.save();
    context.lineWidth = Math.max(3, 7 * u);
    context.strokeStyle = INK;
    context.beginPath();
    context.moveTo(pivot.x, pivot.y);
    context.lineTo(head.x, head.y);
    context.stroke();
    context.lineWidth = Math.max(2, 4 * u);
    context.strokeStyle = DWARF.leather;
    context.stroke();
    // A motion smear behind the falling head.
    if (swing > 0.3) {
      context.beginPath();
      context.arc(
        pivot.x,
        pivot.y,
        reach,
        Math.min(angle, angle - side * 0.6),
        Math.max(angle, angle - side * 0.6),
      );
      context.lineWidth = Math.max(2, 10 * u);
      context.strokeStyle = "rgba(255, 243, 176, 0.45)";
      context.stroke();
    }
    context.translate(head.x, head.y);
    context.rotate(angle + Math.PI / 2);
    const w = 34 * u;
    const h = 20 * u;
    context.fillStyle = DWARF.copper;
    context.fillRect(-w / 2, -h / 2, w, h);
    context.fillStyle = DWARF.copperShade;
    context.fillRect(-w / 2, h * 0.1, w, h * 0.4);
    context.fillStyle = DWARF.ironRim;
    context.fillRect(-w / 2 - 4 * u, -h / 2, 6 * u, h);
    context.fillRect(w / 2 - 2 * u, -h / 2, 6 * u, h);
    context.lineWidth = Math.max(1.5, 2.2 * u);
    context.strokeStyle = INK;
    context.strokeRect(-w / 2 - 4 * u, -h / 2, w + 8 * u, h);
    context.restore();
  }
  // The blow: an iron star and copper sparks.
  for (const burst of plan.bursts) {
    const local = burst.local;
    context.save();
    context.globalAlpha *= local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    const star = (10 + 14 * easeOut(Math.min(1, local / 0.4))) * u;
    const top = { x: burst.at.x, y: burst.at.y - 14 * plan.zoom };
    starPath(context, top.x, top.y, star, star * 0.42, 8, 0.2);
    context.fillStyle = DWARF.steam;
    context.fill();
    context.lineWidth = Math.max(1.5, 2 * u);
    context.strokeStyle = DWARF.iron;
    context.stroke();
    for (let spark = 0; spark < 8; spark += 1) {
      const angle = (spark / 8) * Math.PI * 2 + 0.2;
      const distance = (18 + 34 * easeOut(local)) * u;
      circle(
        context,
        burst.at.x + Math.cos(angle) * distance,
        burst.at.y + Math.sin(angle) * distance * 0.75 + 16 * u * local * local,
        2.6 * u * (1 - local) + 0.6,
      );
      context.fillStyle = spark % 2 === 0 ? DWARF.copper : DWARF.lampLit;
      context.fill();
    }
    context.restore();
  }
}

/** A gingerbread chunk: a biscuit lump with a white icing squiggle. */
function drawChunk(
  context: CanvasRenderingContext2D,
  at: Point,
  spin: number,
  u: number,
): void {
  context.save();
  context.translate(at.x, at.y);
  context.rotate(spin);
  const r = 18 * u;
  context.beginPath();
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const radius = r * (index % 2 === 0 ? 1 : 0.84);
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fillStyle = CANDY.biscuit;
  context.fill();
  context.lineWidth = Math.max(1.4, 2.4 * u);
  context.strokeStyle = CANDY.outline;
  context.stroke();
  // Icing.
  context.beginPath();
  context.moveTo(-r * 0.55, -r * 0.1);
  context.quadraticCurveTo(-r * 0.25, -r * 0.55, 0, -r * 0.1);
  context.quadraticCurveTo(r * 0.25, r * 0.35, r * 0.55, -r * 0.1);
  context.lineWidth = Math.max(1, 2 * u);
  context.strokeStyle = CANDY.white;
  context.stroke();
  // A gumdrop button.
  circle(context, 0, r * 0.35, r * 0.18);
  context.fillStyle = CANDY.mint;
  context.fill();
  context.restore();
}

/** The Break Off: crumbs from the Giant, chunks rolling, the men pop up. */
function drawBreakOff(
  context: CanvasRenderingContext2D,
  plan: GiantEffectPlanV7,
): void {
  const u = plan.unit;
  if (plan.crumble !== null) {
    // Crumbs fall from the Giant's side as the chunks break away.
    const local = plan.crumble;
    context.save();
    context.globalAlpha *= 1 - local * 0.6;
    for (let crumb = 0; crumb < 6; crumb += 1) {
      const angle = (crumb / 6) * Math.PI * 2;
      circle(
        context,
        plan.from.x + Math.cos(angle) * (18 + 14 * local) * u,
        plan.from.y -
          20 * u +
          Math.sin(angle) * 10 * u +
          26 * u * local * local,
        2.6 * u,
      );
      context.fillStyle = crumb % 2 === 0 ? CANDY.biscuit : CANDY.caramel;
      context.fill();
    }
    // The crack on the Giant.
    context.beginPath();
    context.moveTo(plan.from.x - 10 * u, plan.from.y - 34 * u);
    context.lineTo(plan.from.x - 2 * u, plan.from.y - 26 * u);
    context.lineTo(plan.from.x - 8 * u, plan.from.y - 18 * u);
    context.lineTo(plan.from.x + 2 * u, plan.from.y - 10 * u);
    context.lineWidth = Math.max(1.5, 2.6 * u);
    context.strokeStyle = CANDY.chocolate;
    context.stroke();
    context.restore();
  }
  for (const chunk of plan.flights) drawChunk(context, chunk.at, chunk.spin, u);
  // The pop: a sugar star, sprinkles and a ring of icing.
  for (const burst of plan.bursts) {
    const local = burst.local;
    context.save();
    context.globalAlpha *= local < 0.5 ? 1 : 1 - (local - 0.5) / 0.5;
    const star = (12 + 18 * easeOut(local)) * u;
    starPath(context, burst.at.x, burst.at.y, star, star * 0.45, 5);
    context.fillStyle = CANDY.white;
    context.fill();
    context.lineWidth = Math.max(1, 1.8 * u);
    context.strokeStyle = CANDY.milkChocolate;
    context.stroke();
    for (let sprinkle = 0; sprinkle < 8; sprinkle += 1) {
      const angle = (sprinkle / 8) * Math.PI * 2 + 0.3;
      const distance = (16 + 26 * easeOut(local)) * u;
      context.save();
      context.translate(
        burst.at.x + Math.cos(angle) * distance,
        burst.at.y + Math.sin(angle) * distance * 0.8,
      );
      context.rotate(angle);
      context.fillStyle =
        sprinkle % 3 === 0
          ? CANDY.mint
          : sprinkle % 3 === 1
            ? CANDY.faction
            : CANDY.caramel;
      context.fillRect(-3 * u, -1.2 * u, 6 * u, 2.4 * u);
      context.restore();
    }
    context.restore();
  }
}
