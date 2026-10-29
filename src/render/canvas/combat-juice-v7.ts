import type {
  CoordV7,
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../engine/index";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
} from "./attack-effects-v7";
import {
  chibiAnchorV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../assets/chibi-art-v7";
import { BOARD_LABEL_FONT_FAMILY_V7 } from "./board-label-font-v7";
import { chibiMasterScale } from "./chibi-geometry-v7";
import { GIANT_EFFECT_BEAT_V7 } from "./giant-effects-v7";
import { projectGrid, worldToScreen, type CameraState } from "./geometry";
import { FLYER_LIFT_MASTER_PX_V7 } from "./martian-canvas-v7";
import { unitShadowAnchorV7 } from "./unit-shadows-v7";
import type { CorePresentationStepV7 } from "./presentation-plan-v7";

/**
 * Combat juice (bead pulp_wars-2yc.80, docs/ui/UI_REVIEW_2026_10.md V1, V2
 * and V3): three small cues at the moment of a result, drawn on the board's
 * effects overlay on their own clock, so only that canvas repaints while
 * they play and no step of the playback waits for them.
 *
 * - **Damage number (V1).** Every hit, retaliation and splash the viewer
 *   sees floats a red "−6" in the board label face over the unit that took
 *   it: it pops in a little large over the head, rises to just above it
 *   (clear of the HP bar, at the base or in the left strip) and fades. Numbers
 *   that start together on different tiles start a beat apart; a second
 *   number on the same tile stacks above the first.
 * - **Death poof (V2).** A unit that dies flashes white, squashes and sinks
 *   into a dust puff with three sparks from its feet; a flyer drops to the
 *   ground first. It starts on the frame the unit leaves the board, the
 *   frame the death sound is timed from.
 * - **Spawn pop (V3).** A trained, granted or summoned unit drops in from a
 *   few pixels above, lands with a small squash and a dust ring at its
 *   feet, and settles; the board draws it again once it has landed.
 *
 * Presentation only: the state has changed already and nothing waits for a
 * cue. The fast animation speed halves them (never shorter than half, so a
 * number stays readable while playback catches up); Fast Forward plays no
 * presentation, so no cue. Reduced motion (the system's or the game's
 * Motion setting): nothing moves; a still number, a still dust cloud where
 * the unit stood and a still dust ring under a new unit hold for a moment,
 * then the overlay is clear.
 */

/** The damage number (V1). Lengths in ms, distances in world units. */
export const DAMAGE_FLOAT_V7 = {
  durationMs: 820,
  /** It pops in this large and shrinks to its size over `popShare`. */
  popScale: 1.45,
  popShare: 0.14,
  /** It is in by this share, fully opaque until `holdShare`, then fades. */
  appearShare: 0.05,
  holdShare: 0.5,
  /** Its centre starts this far above the cell's centre and rises. */
  startWorld: 46,
  riseWorld: 28,
  /** Reduced motion: it holds still this far up, for `reducedHoldMs`. */
  reducedRiseShare: 1,
  reducedHoldMs: 700,
  /** The type: world units at the camera's zoom, never under `minFontPx`. */
  fontWorld: 30,
  minFontPx: 16,
  /** A second number on the same tile sits this many type heights above. */
  stackLines: 0.95,
  /** Numbers starting together on different tiles start this far apart. */
  staggerMs: 60,
  maxStagger: 5,
  /** A retaliation answers the hit after this beat. */
  retaliationBeatMs: 110,
  /** A print red, an ink keyline and the Newsstand's hard offset shadow. */
  fill: "#f2402e",
  ink: "#1a1410",
} as const;

/** The death poof (V2). */
export const DEATH_POOF_V7 = {
  durationMs: 460,
  /** The white flash peaks here, then fades by `flashEnd`. */
  flashPeak: 0.12,
  flashEnd: 0.62,
  /** A small rise before the squash, until `squashFrom`. */
  squashFrom: 0.16,
  squashEnd: 0.6,
  /** The sprite is gone from `spriteFadeFrom` to `spriteFadeEnd`. */
  spriteFadeFrom: 0.46,
  spriteFadeEnd: 0.74,
  /** It sinks this many master px as it squashes. */
  sinkPx: 6,
  /** A flyer falls to the ground over this share first. */
  flyerDropShare: 0.28,
  /** The dust bursts from here to the end. */
  dustFrom: 0.1,
  puffs: 6,
  /** Reduced motion: the dust cloud at this progress, held still. */
  reducedProgress: 0.42,
  reducedHoldMs: 340,
} as const;

/** The spawn pop (V3). */
export const SPAWN_POP_V7 = {
  durationMs: 440,
  /** It falls from this many master px above its tile. */
  dropPx: 18,
  /** It lands here; squashes until `squashEnd`; settles by the end. */
  landShare: 0.42,
  squashEnd: 0.66,
  /** It is in (opaque) by this share of the fall. */
  appearShare: 0.3,
  /** Reduced motion: the dust ring at this progress, held still. */
  reducedProgress: 0.62,
  reducedHoldMs: 300,
} as const;

/** The dust of the poof and the pop: cream, its shade, the ink keyline. */
export const COMBAT_JUICE_DUST_V7 = {
  fill: "#efe2c0",
  light: "#fff8e6",
  shade: "#b9a47e",
  ink: "#3a2f25",
  spark: "#fff3b0",
} as const;

/**
 * How much a cue is shortened at the animation's time scale: the fast
 * speed halves it, a hurried playback never more than that.
 */
export function combatJuiceScaleV7(durationScale: number): number {
  return Math.min(1, Math.max(0.5, durationScale));
}

/** A hit to float: on `at`, `delayMs` (animation ms) after its step starts. */
export interface CombatJuiceHitV7 {
  readonly unitId: number;
  readonly at: CoordV7;
  readonly amount: number;
  readonly delayMs: number;
}

/** A unit whose death or arrival plays a cue, and its tile. */
export interface CombatJuiceUnitV7 {
  readonly unitId: number;
  readonly at: CoordV7;
}

const sameCell = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

/** The animation ms at which `#animate`'s eased progress reaches `eased`. */
function easedAtMs(durationMs: number, eased: number): number {
  return durationMs * (1 - Math.cbrt(1 - eased));
}

/**
 * The hits of `steps[index]` to float, timed from the step's start as the
 * board host plays it: the target and the attacker's retaliation when the
 * shot or the blow lands (the frame the board shows the result), a heat
 * ray's when it burns through, the Siege Hammer's on its blow, a damage
 * step's at once, an explosion's when its blast covers the units. A damage
 * step whose number an earlier cue of the boundary already floats (a
 * Thump's "−2", a giant's crush, stomp or trample) floats nothing more.
 * Pure: it reads the steps and the events projected for the viewer only.
 */
export function combatJuiceHitsForStepV7(
  steps: readonly CorePresentationStepV7[],
  index: number,
  envelope: PlayerEventEnvelopeV7,
): readonly CombatJuiceHitV7[] {
  const step = steps[index];
  if (step === undefined) return [];
  const combatBy = (attackerId: number) =>
    envelope.events.find(
      (event) =>
        event.kind === "COMBAT_RESOLVED" &&
        event.preview.attackerId === attackerId,
    );
  const exchange = (
    event: ReturnType<typeof combatBy>,
    from: CoordV7,
    to: CoordV7,
    hitMs: number,
  ): CombatJuiceHitV7[] => {
    if (event?.kind !== "COMBAT_RESOLVED") return [];
    const preview = event.preview;
    const hits: CombatJuiceHitV7[] = [];
    const struck = preview.damageToDefender + preview.defenderShieldDamage;
    if (struck > 0)
      hits.push({
        unitId: preview.targetUnitId,
        at: to,
        amount: struck,
        delayMs: hitMs,
      });
    const answered = preview.damageToAttacker + preview.attackerShieldDamage;
    if (answered > 0)
      hits.push({
        unitId: preview.attackerId,
        at: from,
        amount: answered,
        delayMs: hitMs + DAMAGE_FLOAT_V7.retaliationBeatMs,
      });
    return hits;
  };
  switch (step.kind) {
    case "MELEE":
    case "RANGED":
    case "CATAPULT": {
      // A shattered target bursts in its own cue.
      if (step.holdTarget === true) return [];
      const hitMs =
        step.attackEffect === undefined
          ? step.durationMs
          : ATTACK_EFFECT_DURATIONS_V7[step.attackEffect] *
            ATTACK_EFFECT_HIT_V7[step.attackEffect];
      return exchange(combatBy(step.unitId), step.from, step.to, hitMs);
    }
    case "MARTIAN": {
      if (
        step.effect !== "HEAT_RAY" ||
        step.unitId === undefined ||
        step.from === undefined
      )
        return [];
      const target = step.cells[0];
      if (target === undefined) return [];
      return exchange(
        combatBy(step.unitId),
        step.from,
        target,
        easedAtMs(step.durationMs, 0.35),
      );
    }
    case "GIANT": {
      if (step.effect !== "HAMMER") return [];
      const target = step.cells[0];
      const targetId = step.unitIds[0];
      if (target === undefined || targetId === undefined) return [];
      const event = envelope.events.find(
        (candidate) =>
          candidate.kind === "COMBAT_RESOLVED" &&
          candidate.preview.targetUnitId === targetId &&
          candidate.preview.siegeHammer,
      );
      return exchange(
        event,
        step.from,
        target,
        step.durationMs * GIANT_EFFECT_BEAT_V7.HAMMER,
      );
    }
    case "DAMAGE": {
      if (step.damage <= 0) return [];
      const floated = steps
        .slice(0, index)
        .some(
          (earlier) =>
            ((earlier.kind === "CANDY" && earlier.effect === "THUMP") ||
              (earlier.kind === "GIANT" &&
                (earlier.amounts?.length ?? 0) > 0)) &&
            earlier.cells.some((cell) => sameCell(cell, step.at)),
        );
      return floated
        ? []
        : [
            {
              unitId: step.unitId,
              at: step.at,
              amount: step.damage,
              delayMs: 0,
            },
          ];
    }
    case "EXPLOSION": {
      const delayMs = easedAtMs(step.durationMs, 0.45);
      return step.blasts.flatMap((blast) => {
        // A Bomb Chucker's bomb: its target's hit floats with the shot,
        // its splash with the damage steps that follow.
        if (blast.kind === "BOMB") return [];
        return envelope.events.flatMap((event) =>
          event.kind === "EXPLOSION_RESOLVED" &&
          event.wave === step.wave &&
          sameCell(event.at, blast.at)
            ? event.results
                .filter((result) => result.damage + result.shieldDamage > 0)
                .map((result) => ({
                  unitId: result.unitId,
                  at: result.at,
                  amount: result.damage + result.shieldDamage,
                  delayMs,
                }))
            : [],
        );
      });
    }
    default:
      return [];
  }
}

/**
 * Deaths that keep a cue of their own (a Shatter's burst, a halo that
 * shatters, a swallowed unit digested), or that are not a fall in battle (a
 * Sacrifice, the Great Summoning, a Tentacle sinking, a seat eliminated):
 * no poof.
 */
const NO_POOF_CAUSES_V7: ReadonlySet<string> = new Set([
  "SHATTER",
  "BRAIN_LOST",
  "DIGESTED",
  "SACRIFICED",
  "CONSUMED",
  "SANK",
  "ELIMINATION",
  "CITY_CAPTURED",
  "KABOOM",
]);

/**
 * The units of a boundary whose death plays a poof: each one the viewer saw
 * before it that died in it (not an Egg, which bursts its own shell, nor a
 * death with a cue of its own), on the tile where the playback last showed
 * it (the end of its last move, else where it stood).
 */
export function combatJuiceDeathsV7(
  before: PlayerViewV7,
  after: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  steps: readonly CorePresentationStepV7[],
): readonly CombatJuiceUnitV7[] {
  const deaths: CombatJuiceUnitV7[] = [];
  const seen = new Set<number>();
  for (const event of envelope.events) {
    if (event.kind !== "UNIT_DIED" || NO_POOF_CAUSES_V7.has(event.cause))
      continue;
    if (seen.has(event.unitId)) continue;
    const unit = before.units.find(
      (candidate) => candidate.id === event.unitId,
    );
    if (
      unit === undefined ||
      unit.form === "EGG" ||
      after.units.some((candidate) => candidate.id === unit.id)
    )
      continue;
    seen.add(unit.id);
    let at = unit.at;
    for (const step of steps)
      if (step.kind === "MOVE" && step.unitId === unit.id)
        at = step.path.at(-1) ?? at;
    deaths.push({ unitId: unit.id, at });
  }
  return deaths;
}

/**
 * Whether a projected event other than its reveal names `unitId`: a move,
 * a gate, a beam, a push, a hit or any cue of its own. A field named
 * `unitId` or `…UnitId`, a list named `unitIds` or `…UnitIds`, or an entry
 * of a list (`results`) that names it. The reward's own push
 * (`UNIT_SPAWN_DISPLACED`) does not count for the unit it brings in.
 */
function eventNamesUnitV7(event: object, unitId: number): boolean {
  if ("kind" in event && event.kind === "UNIT_SPAWN_DISPLACED")
    return "displacedUnitId" in event && event.displacedUnitId === unitId;
  for (const [key, value] of Object.entries(event)) {
    if (/(^u|U)nitId$/.test(key) && value === unitId) return true;
    if (Array.isArray(value))
      for (const entry of value as readonly unknown[]) {
        if (/(^u|U)nitIds$/.test(key) && entry === unitId) return true;
        if (
          typeof entry === "object" &&
          entry !== null &&
          eventNamesUnitV7(entry, unitId)
        )
          return true;
      }
  }
  return false;
}

/**
 * The units of a boundary that pop in, new in the view after it and on a
 * tile the viewer has explored:
 *
 * - the viewer's own trained unit (a land or a naval unit), a city's
 *   reward (the giant, a Militia, a held reward placed at the turn's
 *   start, one that pushed the unit on the center aside) and the unit a
 *   treasure chest gives (bead pulp_wars-b9mc), and a summoned daemon;
 * - another seat's new unit (an AI's recruit, reward or chest unit, whose
 *   event only its owner receives) on a tile the viewer had explored
 *   before the boundary, which no event but its reveal names: it did not
 *   walk, jump or come through a gate out of the fog, and it has no cue
 *   of its own (bead pulp_wars-b9mc).
 *
 * Other arrivals keep their own cue (an Egg laid, a hatchling, the risen
 * dead, an assembled Gunner).
 */
export function combatJuiceSpawnsV7(
  before: PlayerViewV7,
  after: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
): readonly CombatJuiceUnitV7[] {
  const spawns: CombatJuiceUnitV7[] = [];
  const exploredBefore = new Set(
    before.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  for (const event of envelope.events) {
    const unitId =
      event.kind === "UNIT_TRAINED" ||
      event.kind === "NAVAL_UNIT_TRAINED" ||
      event.kind === "UNIT_REWARD_GRANTED"
        ? event.unitId
        : event.kind === "TREASURE_CAPTURED"
          ? event.spawnedUnitId
          : event.kind === "DAEMON_SUMMONED"
            ? event.daemonUnitId
            : event.kind === "UNIT_REVEALED" &&
                exploredBefore.has(`${event.at.x},${event.at.y}`) &&
                !envelope.events.some(
                  (other) =>
                    other.kind !== "UNIT_REVEALED" &&
                    eventNamesUnitV7(other, event.unitId),
                )
              ? event.unitId
              : null;
    if (unitId === null || spawns.some((entry) => entry.unitId === unitId))
      continue;
    const unit = after.units.find((candidate) => candidate.id === unitId);
    if (
      unit === undefined ||
      before.units.some((candidate) => candidate.id === unitId)
    )
      continue;
    const tile = after.board.tiles.find((candidate) =>
      sameCell(candidate.at, unit.at),
    );
    if (tile?.explored !== true) continue;
    spawns.push({ unitId, at: unit.at });
  }
  return spawns;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const easeOut = (value: number): number => 1 - (1 - value) * (1 - value);
const easeIn = (value: number): number => value * value;

/** One frame of a damage number, or null when it is not on the board. */
export interface DamageFloatFrameV7 {
  /** How far its centre is above the cell's centre, world units. */
  readonly riseWorld: number;
  readonly alpha: number;
  readonly scale: number;
}

export function damageFloatFrameV7(
  elapsedMs: number,
  durationMs: number,
  still: boolean,
): DamageFloatFrameV7 | null {
  const spec = DAMAGE_FLOAT_V7;
  if (still)
    return elapsedMs >= 0 && elapsedMs < durationMs
      ? {
          riseWorld: spec.startWorld + spec.riseWorld * spec.reducedRiseShare,
          alpha: 1,
          scale: 1,
        }
      : null;
  const t = elapsedMs / durationMs;
  if (!(t >= 0 && t < 1)) return null;
  const alpha =
    t < spec.appearShare
      ? t / spec.appearShare
      : t < spec.holdShare
        ? 1
        : 1 - easeIn((t - spec.holdShare) / (1 - spec.holdShare));
  const scale =
    t < spec.popShare
      ? spec.popScale - (spec.popScale - 1) * easeOut(t / spec.popShare)
      : 1;
  return {
    riseWorld: spec.startWorld + spec.riseWorld * easeOut(t),
    alpha: clamp01(alpha),
    scale,
  };
}

/** A round lobe of dust round the feet, master px from the feet. */
export interface JuicePuffV7 {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

/** A spark's streak, master px from the body's middle. */
export interface JuiceSparkV7 {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly alpha: number;
}

/** How the sprite of a dying or arriving unit is drawn this frame. */
export interface JuiceSpriteFrameV7 {
  readonly alpha: number;
  /** The white of the flash laid over the sprite, 0 to 1. */
  readonly flash: number;
  /** About the feet. */
  readonly scaleX: number;
  readonly scaleY: number;
  /** Master px: down (sinking) is positive, up (lifted, falling) negative. */
  readonly offsetY: number;
}

export interface DeathPoofFrameV7 {
  readonly progress: number;
  readonly sprite: JuiceSpriteFrameV7 | null;
  readonly puffs: readonly JuicePuffV7[];
  readonly sparks: readonly JuiceSparkV7[];
}

/**
 * One frame of a death poof `elapsedMs` into it (`durationMs` long), or null
 * when it is over. `variant` turns the sparks a little from one unit to the
 * next; `flyerLiftPx` is how far above the ground the board drew a flyer.
 */
export function deathPoofFrameV7(
  elapsedMs: number,
  durationMs: number,
  still: boolean,
  variant = 0,
  flyerLiftPx = 0,
): DeathPoofFrameV7 | null {
  const spec = DEATH_POOF_V7;
  if (!(elapsedMs >= 0 && elapsedMs < durationMs)) return null;
  const t = still ? spec.reducedProgress : elapsedMs / durationMs;
  // The flash: in fast, then thinning while the unit squashes.
  const flash =
    t < spec.flashPeak
      ? t / spec.flashPeak
      : 1 - clamp01((t - spec.flashPeak) / (spec.flashEnd - spec.flashPeak));
  // A small start upwards, then the squash and sink about the feet.
  const rise =
    t < spec.squashFrom ? Math.sin((Math.PI * t) / spec.squashFrom) : 0;
  const squash = easeOut(
    clamp01((t - spec.squashFrom) / (spec.squashEnd - spec.squashFrom)),
  );
  const drop =
    flyerLiftPx > 0
      ? easeIn(clamp01(t / spec.flyerDropShare)) * flyerLiftPx
      : 0;
  const spriteAlpha =
    1 -
    clamp01(
      (t - spec.spriteFadeFrom) / (spec.spriteFadeEnd - spec.spriteFadeFrom),
    );
  const sprite: JuiceSpriteFrameV7 | null =
    still || spriteAlpha <= 0
      ? null
      : {
          alpha: spriteAlpha,
          flash: clamp01(flash),
          scaleX: 1 - 0.05 * rise + 0.32 * squash,
          scaleY: 1 + 0.07 * rise - 0.72 * squash,
          offsetY: -flyerLiftPx + drop + spec.sinkPx * squash,
        };
  const dust = clamp01((t - spec.dustFrom) / (1 - spec.dustFrom));
  const puffs: JuicePuffV7[] = [];
  if (t >= spec.dustFrom)
    for (let index = 0; index < spec.puffs; index += 1) {
      // Fanned along the ground and up, wider than tall.
      const angle = Math.PI * (1.04 + (0.92 * index) / (spec.puffs - 1));
      const reach = 5 + 15 * easeOut(dust);
      const lag = index % 2 === 0 ? 0 : 0.08;
      const local = clamp01((dust - lag) / (1 - lag));
      if (local <= 0) continue;
      puffs.push({
        x: Math.cos(angle) * reach * 1.25,
        y: Math.sin(angle) * reach * 0.55 - 5 * local,
        r: (4.5 + 5 * easeOut(local)) * (1 - 0.3 * local),
        alpha: local < 0.45 ? 1 : 1 - (local - 0.45) / 0.55,
      });
    }
  // The middle puff, the body's own dust, over the feet.
  if (t >= spec.dustFrom)
    puffs.push({
      x: 0,
      y: -3 - 4 * dust,
      r: 6 + 4 * easeOut(dust),
      alpha: dust < 0.4 ? 1 : 1 - (dust - 0.4) / 0.6,
    });
  const sparks: JuiceSparkV7[] = [];
  const sparkLocal = clamp01((t - 0.06) / 0.5);
  if (!still && sparkLocal > 0 && sparkLocal < 1)
    for (let index = 0; index < 3; index += 1) {
      const angle =
        -Math.PI / 2 + (index - 1) * 0.95 + ((variant % 5) - 2) * 0.08;
      const inner = 10 + 22 * easeOut(sparkLocal);
      const outer = inner + 10 * (1 - sparkLocal);
      sparks.push({
        x1: Math.cos(angle) * inner,
        y1: Math.sin(angle) * inner,
        x2: Math.cos(angle) * outer,
        y2: Math.sin(angle) * outer,
        alpha: 1 - sparkLocal,
      });
    }
  return { progress: t, sprite, puffs, sparks };
}

export interface SpawnPopFrameV7 {
  readonly progress: number;
  /** The new unit's sprite, or null when the board draws it. */
  readonly sprite: JuiceSpriteFrameV7 | null;
  /** The size of its ground shadow, 0 to 1 (while it falls). */
  readonly shadow: number;
  /** The dust ring round its feet, its size 0 to 1, or null. */
  readonly ring: { readonly size: number; readonly alpha: number } | null;
  readonly puffs: readonly JuicePuffV7[];
}

export function spawnPopFrameV7(
  elapsedMs: number,
  durationMs: number,
  still: boolean,
): SpawnPopFrameV7 | null {
  const spec = SPAWN_POP_V7;
  if (!(elapsedMs >= 0 && elapsedMs < durationMs)) return null;
  const t = still ? spec.reducedProgress : elapsedMs / durationMs;
  let sprite: JuiceSpriteFrameV7 | null = null;
  let shadow = 1;
  if (!still) {
    if (t < spec.landShare) {
      // Falling: a little stretched, faster as it goes.
      const fall = t / spec.landShare;
      shadow = 0.45 + 0.55 * fall;
      sprite = {
        alpha: clamp01(fall / spec.appearShare),
        flash: 0,
        scaleX: 0.94,
        scaleY: 1.07,
        offsetY: -spec.dropPx * (1 - fall * fall),
      };
    } else if (t < spec.squashEnd) {
      const squash = Math.sin(
        (Math.PI * (t - spec.landShare)) / (spec.squashEnd - spec.landShare),
      );
      sprite = {
        alpha: 1,
        flash: 0,
        scaleX: 1 + 0.18 * squash,
        scaleY: 1 - 0.17 * squash,
        offsetY: 0,
      };
    } else {
      const settle = (t - spec.squashEnd) / (1 - spec.squashEnd);
      const bounce = Math.sin(Math.PI * settle) * (1 - settle);
      sprite = {
        alpha: 1,
        flash: 0,
        scaleX: 1 - 0.04 * bounce,
        scaleY: 1 + 0.06 * bounce,
        offsetY: -2 * bounce,
      };
    }
  }
  const landed = (t - spec.landShare) / (1 - spec.landShare);
  const ring =
    landed > 0 && landed < 1
      ? { size: 0.35 + 0.65 * easeOut(landed), alpha: 0.9 * (1 - landed) }
      : null;
  const puffs: JuicePuffV7[] =
    landed > 0 && landed < 1
      ? [-1, 1].map((side) => ({
          x: side * (12 + 12 * easeOut(landed)),
          y: -2 - 4 * landed,
          r: 4 + 2.5 * easeOut(landed),
          alpha: landed < 0.4 ? 1 : 1 - (landed - 0.4) / 0.6,
        }))
      : [];
  return { progress: t, sprite, shadow, ring, puffs };
}

/**
 * A unit's own sprite as the board draws it, for a cue that moves it on the
 * overlay: its raster (and the raster's white silhouette, for the flash),
 * its size and anchor in master px, its feet (the middle of its ground
 * shadow), how it is placed on the cell, and its sprite scale.
 */
export interface CombatJuiceSpriteV7 {
  readonly image: CanvasImageSource;
  readonly silhouette: CanvasImageSource | null;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly feetX: number;
  readonly feetY: number;
  /** The shadow's radii, master px, or null afloat. */
  readonly shadow: { readonly rx: number; readonly ry: number } | null;
  /** On a settlement centre: drawn smaller, at the front right. */
  readonly garrison: boolean;
  /** Master px the board lifts a flyer by (0 for any other unit). */
  readonly flyerLiftPx: number;
  /** A grown Dinosaur, a Gingerbread Man. */
  readonly growth: number;
}

/**
 * The sprite of a unit for a cue, from the raster the board draws it with:
 * its feet are the middle of its measured ground shadow (the bottom middle
 * of its canvas without a measurement).
 */
export function combatJuiceSpriteOfV7(input: {
  readonly image: CanvasImageSource;
  readonly silhouette: CanvasImageSource | null;
  readonly asset: ChibiArtAssetV7;
  readonly subject: ArtSubjectV7;
  readonly garrison: boolean;
  readonly flyer: boolean;
  readonly growth: number;
}): CombatJuiceSpriteV7 {
  const { asset } = input;
  const anchor = chibiAnchorV7(asset);
  const measured = unitShadowAnchorV7(input.subject, asset.id);
  const shadow =
    measured?.shadow !== null &&
    measured?.shadow !== undefined &&
    measured.width > 0
      ? { ellipse: measured.shadow, scale: asset.width / measured.width }
      : null;
  return {
    image: input.image,
    silhouette: input.silhouette,
    width: asset.width,
    height: asset.height,
    anchorX: anchor.x,
    anchorY: anchor.y,
    feetX: shadow === null ? asset.width / 2 : shadow.ellipse.x * shadow.scale,
    feetY: shadow === null ? asset.height - 4 : shadow.ellipse.y * shadow.scale,
    shadow:
      shadow === null
        ? measured === null || measured.motion !== "AFLOAT"
          ? { rx: asset.width * 0.24, ry: asset.width * 0.08 }
          : null
        : {
            rx: shadow.ellipse.radiusX * shadow.scale,
            ry: shadow.ellipse.radiusY * shadow.scale,
          },
    garrison: input.garrison,
    flyerLiftPx: input.flyer ? FLYER_LIFT_MASTER_PX_V7 : 0,
    growth: input.growth,
  };
}

/** The garrison placement the board uses (chibi-geometry-v7). */
const GARRISON_SCALE_V7 = 0.75;
const GARRISON_RIGHT_V7 = 46;

/**
 * Where a sprite's feet and its drawn scale land on the screen for a unit on
 * `at`: the CSS px of the feet, and CSS px per master px.
 */
export function combatJuiceFeetV7(
  sprite: CombatJuiceSpriteV7,
  at: CoordV7,
  camera: CameraState,
): { readonly x: number; readonly y: number; readonly scale: number } {
  const centre = worldToScreen(projectGrid(at), camera);
  const master = chibiMasterScale(camera);
  if (sprite.garrison) {
    // Its canvas bottom on the cell's bottom edge, its right edge at the
    // garrison's right (chibiGarrisonDestinationRect).
    const scale = master * GARRISON_SCALE_V7 * sprite.growth;
    const bottom = centre.y + (sprite.height - sprite.anchorY) * master;
    const right = centre.x + GARRISON_RIGHT_V7 * camera.zoom;
    const left = right - sprite.width * scale;
    const top = bottom - sprite.height * scale;
    return {
      x: left + sprite.feetX * scale,
      y: top + sprite.feetY * scale,
      scale,
    };
  }
  // The anchor on the cell's centre; a grown sprite grows about its
  // canvas bottom, as on the board.
  const left = centre.x - sprite.anchorX * master;
  const top = centre.y - sprite.anchorY * master;
  const scale = master * sprite.growth;
  const width = sprite.width * master;
  const height = sprite.height * master;
  const grownLeft = left - (width * (sprite.growth - 1)) / 2;
  const grownTop = top - height * (sprite.growth - 1);
  return {
    x: grownLeft + sprite.feetX * scale,
    y: grownTop + sprite.feetY * scale,
    scale,
  };
}

/** A cue that plays now, on its own clock. */
export type CombatJuiceEntryV7 =
  | {
      readonly kind: "FLOAT";
      readonly at: CoordV7;
      readonly amount: number;
      /** When it was asked to start, before any stagger. */
      readonly requestedMs: number;
      readonly startMs: number;
      readonly durationMs: number;
      readonly still: boolean;
      /** Its line in a stack of numbers on one tile (0 the first). */
      readonly slot: number;
    }
  | {
      readonly kind: "POOF" | "POP";
      readonly unitId: number;
      readonly at: CoordV7;
      readonly startMs: number;
      readonly durationMs: number;
      readonly still: boolean;
      readonly sprite: CombatJuiceSpriteV7 | null;
    };

/**
 * The cues playing on one board: started by the board host, framed and
 * pruned from the clock it gives. Nothing here draws or asks for frames.
 */
export class CombatJuiceV7 {
  #entries: CombatJuiceEntryV7[] = [];

  get entries(): readonly CombatJuiceEntryV7[] {
    return this.#entries;
  }

  /**
   * Floats `amount` on `at` from `startMs`. A float that starts with others
   * on other tiles starts a beat after them; one on a tile whose number is
   * still up stacks above it.
   */
  addFloat(
    at: CoordV7,
    amount: number,
    startMs: number,
    durationMs: number,
    still: boolean,
  ): void {
    if (!(amount > 0)) return;
    const spec = DAMAGE_FLOAT_V7;
    const floats = this.#entries.filter(
      (entry): entry is Extract<CombatJuiceEntryV7, { kind: "FLOAT" }> =>
        entry.kind === "FLOAT",
    );
    // Numbers asked for at one moment on other tiles start a beat apart.
    const together = still
      ? 0
      : floats.filter(
          (entry) =>
            !sameCell(entry.at, at) &&
            Math.abs(entry.requestedMs - startMs) < 1,
        ).length;
    const start =
      startMs + spec.staggerMs * Math.min(together, spec.maxStagger);
    // A number on a tile whose number is still up stacks above it.
    const shown = (from: number, length: number): number =>
      from + length * (still ? 1 : spec.holdShare);
    const taken = new Set(
      floats
        .filter(
          (entry) =>
            sameCell(entry.at, at) &&
            start < shown(entry.startMs, entry.durationMs) &&
            entry.startMs < shown(start, durationMs),
        )
        .map((entry) => entry.slot),
    );
    let slot = 0;
    while (taken.has(slot)) slot += 1;
    this.#entries.push({
      kind: "FLOAT",
      at,
      amount,
      requestedMs: startMs,
      startMs: start,
      durationMs,
      still,
      slot,
    });
  }

  addUnitCue(
    kind: "POOF" | "POP",
    unitId: number,
    at: CoordV7,
    startMs: number,
    durationMs: number,
    still: boolean,
    sprite: CombatJuiceSpriteV7 | null,
  ): void {
    this.#entries = this.#entries.filter(
      (entry) =>
        entry.kind === "FLOAT" ||
        entry.kind !== kind ||
        entry.unitId !== unitId,
    );
    this.#entries.push({
      kind,
      unitId,
      at,
      startMs,
      durationMs,
      still,
      sprite,
    });
  }

  /** Drops the cues that are over at `nowMs`. */
  prune(nowMs: number): void {
    if (
      this.#entries.some((entry) => nowMs >= entry.startMs + entry.durationMs)
    )
      this.#entries = this.#entries.filter(
        (entry) => nowMs < entry.startMs + entry.durationMs,
      );
  }

  /** Drops the cues that have not started yet (a cancelled playback). */
  dropPending(nowMs: number): void {
    this.#entries = this.#entries.filter((entry) => entry.startMs <= nowMs);
  }

  clear(): void {
    this.#entries = [];
  }

  /** Whether a cue is still to play or playing at `nowMs`. */
  active(nowMs: number): boolean {
    return this.#entries.some(
      (entry) => nowMs < entry.startMs + entry.durationMs,
    );
  }

  /** Whether a cue that moves (not a still frame) plays at `nowMs`. */
  moving(nowMs: number): boolean {
    return this.#entries.some(
      (entry) => !entry.still && nowMs < entry.startMs + entry.durationMs,
    );
  }

  /** When the next still frame ends after `nowMs`, or null. */
  nextStillEndMs(nowMs: number): number | null {
    let next: number | null = null;
    for (const entry of this.#entries) {
      const end = entry.startMs + entry.durationMs;
      if (entry.still && end > nowMs && (next === null || end < next))
        next = end;
    }
    return next;
  }

  /**
   * The units a pop draws itself, so the board leaves them out until they
   * have landed (from the moment the pop is started).
   */
  hiddenUnitIds(nowMs: number): ReadonlySet<number> {
    const hidden = new Set<number>();
    for (const entry of this.#entries)
      if (
        entry.kind === "POP" &&
        !entry.still &&
        entry.sprite !== null &&
        nowMs < entry.startMs + entry.durationMs
      )
        hidden.add(entry.unitId);
    return hidden;
  }
}

/** A puff of dust: three outlined lobes, the light from the bottom left. */
function drawDust(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  keyline: number,
): void {
  const colours = COMBAT_JUICE_DUST_V7;
  context.beginPath();
  for (const [dx, dy, size] of [
    [-0.55, 0.18, 0.72],
    [0.55, 0.22, 0.7],
    [0, -0.08, 1],
  ] as const) {
    context.moveTo(x + dx * radius + size * radius, y + dy * radius);
    context.arc(
      x + dx * radius,
      y + dy * radius,
      size * radius,
      0,
      Math.PI * 2,
    );
  }
  context.strokeStyle = colours.ink;
  context.lineWidth = keyline;
  context.stroke();
  context.fillStyle = colours.fill;
  context.fill();
  // The shade away from the light, the pale rim towards it.
  context.fillStyle = colours.shade;
  context.beginPath();
  context.arc(
    x + radius * 0.32,
    y - radius * 0.3,
    radius * 0.42,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = colours.light;
  context.beginPath();
  context.arc(
    x - radius * 0.38,
    y + radius * 0.28,
    radius * 0.34,
    0,
    Math.PI * 2,
  );
  context.fill();
}

/** Draws a unit's sprite moved by a cue frame about its feet. */
function drawJuiceSprite(
  context: CanvasRenderingContext2D,
  sprite: CombatJuiceSpriteV7,
  feet: { readonly x: number; readonly y: number; readonly scale: number },
  frame: JuiceSpriteFrameV7,
): void {
  if (frame.alpha <= 0) return;
  const width = sprite.width * feet.scale;
  const height = sprite.height * feet.scale;
  context.save();
  context.imageSmoothingEnabled = false;
  context.translate(feet.x, feet.y + frame.offsetY * feet.scale);
  context.scale(frame.scaleX, frame.scaleY);
  const left = -sprite.feetX * feet.scale;
  const top = -sprite.feetY * feet.scale;
  context.globalAlpha = frame.alpha;
  context.drawImage(sprite.image, left, top, width, height);
  if (frame.flash > 0 && sprite.silhouette !== null) {
    context.globalAlpha = frame.alpha * frame.flash;
    context.drawImage(sprite.silhouette, left, top, width, height);
  }
  context.restore();
}

function drawShadow(
  context: CanvasRenderingContext2D,
  sprite: CombatJuiceSpriteV7,
  feet: { readonly x: number; readonly y: number; readonly scale: number },
  size: number,
): void {
  if (sprite.shadow === null || size <= 0) return;
  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = COMBAT_JUICE_DUST_V7.ink;
  context.beginPath();
  context.ellipse(
    feet.x,
    feet.y,
    sprite.shadow.rx * feet.scale * size,
    sprite.shadow.ry * feet.scale * size,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

/** The feet of a cue without a sprite: the bottom of a standard unit. */
function plainFeet(
  at: CoordV7,
  camera: CameraState,
): { readonly x: number; readonly y: number; readonly scale: number } {
  const centre = worldToScreen(projectGrid(at), camera);
  const master = chibiMasterScale(camera);
  return { x: centre.x, y: centre.y + 34 * master, scale: master };
}

/**
 * Draws the poofs and pops playing at `nowMs` (under the other cues), on the
 * effects overlay in CSS px. Returns how many it drew.
 */
export function drawCombatJuiceUnitsV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entries: readonly CombatJuiceEntryV7[],
  nowMs: number,
): number {
  let drawn = 0;
  for (const entry of entries) {
    if (entry.kind === "FLOAT") continue;
    const elapsed = nowMs - entry.startMs;
    const sprite = entry.sprite;
    const feet =
      sprite === null
        ? plainFeet(entry.at, camera)
        : combatJuiceFeetV7(sprite, entry.at, camera);
    const keyline = Math.max(1, 1.6 * feet.scale);
    if (entry.kind === "POOF") {
      const frame = deathPoofFrameV7(
        elapsed,
        entry.durationMs,
        entry.still,
        entry.unitId,
        sprite?.flyerLiftPx ?? 0,
      );
      if (frame === null) continue;
      drawn += 1;
      context.save();
      if (frame.sprite !== null && sprite !== null)
        drawJuiceSprite(context, sprite, feet, frame.sprite);
      for (const puff of frame.puffs) {
        context.globalAlpha = clamp01(puff.alpha) * (entry.still ? 0.85 : 1);
        drawDust(
          context,
          feet.x + puff.x * feet.scale,
          feet.y + puff.y * feet.scale,
          puff.r * feet.scale,
          keyline,
        );
      }
      const middle = {
        x: feet.x,
        y:
          feet.y -
          (sprite === null ? 20 : (sprite.feetY - sprite.anchorY) * 0.6 + 14) *
            feet.scale,
      };
      context.lineCap = "round";
      for (const spark of frame.sparks) {
        context.globalAlpha = clamp01(spark.alpha);
        context.strokeStyle = COMBAT_JUICE_DUST_V7.ink;
        context.lineWidth = Math.max(2, 4.4 * feet.scale);
        context.beginPath();
        context.moveTo(
          middle.x + spark.x1 * feet.scale,
          middle.y + spark.y1 * feet.scale,
        );
        context.lineTo(
          middle.x + spark.x2 * feet.scale,
          middle.y + spark.y2 * feet.scale,
        );
        context.stroke();
        context.strokeStyle = COMBAT_JUICE_DUST_V7.spark;
        context.lineWidth = Math.max(1, 2.4 * feet.scale);
        context.stroke();
      }
      context.restore();
      continue;
    }
    const frame = spawnPopFrameV7(elapsed, entry.durationMs, entry.still);
    if (frame === null) continue;
    drawn += 1;
    context.save();
    if (frame.sprite !== null && sprite !== null) {
      drawShadow(context, sprite, feet, frame.shadow);
      drawJuiceSprite(context, sprite, feet, frame.sprite);
    }
    if (frame.ring !== null) {
      const rx =
        (sprite?.shadow?.rx ?? 18) * 1.5 * feet.scale * frame.ring.size;
      context.globalAlpha = clamp01(frame.ring.alpha);
      context.strokeStyle = COMBAT_JUICE_DUST_V7.ink;
      context.lineWidth = Math.max(2, 4 * feet.scale);
      context.beginPath();
      context.ellipse(feet.x, feet.y, rx, rx * 0.36, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = COMBAT_JUICE_DUST_V7.fill;
      context.lineWidth = Math.max(1, 2.2 * feet.scale);
      context.stroke();
    }
    for (const puff of frame.puffs) {
      context.globalAlpha = clamp01(puff.alpha);
      drawDust(
        context,
        feet.x + puff.x * feet.scale,
        feet.y + puff.y * feet.scale,
        puff.r * feet.scale,
        keyline,
      );
    }
    context.restore();
  }
  return drawn;
}

/**
 * Draws the damage numbers playing at `nowMs` (over every other cue), on
 * the effects overlay in CSS px. Returns how many it drew.
 */
export function drawCombatJuiceFloatsV7(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entries: readonly CombatJuiceEntryV7[],
  nowMs: number,
): number {
  const spec = DAMAGE_FLOAT_V7;
  let drawn = 0;
  for (const entry of entries) {
    if (entry.kind !== "FLOAT") continue;
    const frame = damageFloatFrameV7(
      nowMs - entry.startMs,
      entry.durationMs,
      entry.still,
    );
    if (frame === null || frame.alpha <= 0) continue;
    drawn += 1;
    const base = Math.max(spec.minFontPx, spec.fontWorld * camera.zoom);
    const font = base * frame.scale;
    const centre = worldToScreen(projectGrid(entry.at), camera);
    const x = centre.x;
    const y =
      centre.y -
      frame.riseWorld * camera.zoom -
      entry.slot * base * spec.stackLines;
    const text = `−${entry.amount}`;
    const offset = Math.max(1.5, font * 0.09);
    context.save();
    context.globalAlpha = frame.alpha;
    context.font = `800 ${font.toFixed(1)}px ${BOARD_LABEL_FONT_FAMILY_V7}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = Math.max(3, font * 0.24);
    // The hard offset shadow of the Newsstand, then the keyline and the red.
    context.fillStyle = spec.ink;
    context.strokeStyle = spec.ink;
    context.strokeText(text, x + offset, y + offset);
    context.fillText(text, x + offset, y + offset);
    context.strokeText(text, x, y);
    context.fillStyle = spec.fill;
    context.fillText(text, x, y);
    context.restore();
  }
  return drawn;
}
