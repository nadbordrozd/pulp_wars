import {
  NEUTRAL_KIND_V7,
  isAfloatFormV7,
  unitFactionV7,
  unitFliesV7,
  unitRoleMechanicsV7,
  type CoordV7,
  type FactionIdV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../engine/index";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
  RICOCHET_LANDS_V7,
  THUMP_HIT_V7,
  type AttackEffectIdV7,
} from "../render/canvas/attack-effects-v7";
import type {
  CorePresentationStepV7,
  PresentationStepCueV7,
  SupportEffectV7,
} from "../render/canvas/presentation-plan-v7";
import type { SoundIdV1 } from "./sound-manifest";
import { roadLinkChangesV7 } from "../render/feedback-plan-v7";
import {
  GIANT_EFFECT_BEAT_V7,
  GIANT_EFFECT_DURATIONS_V7,
  type GiantFeedbackEffectV7,
} from "../render/canvas/giant-effects-v7";

/**
 * Which sounds an accepted command makes (bead pulp_wars-2yc.10,
 * docs/ui/SOUND.md). Both functions read only what the visuals read: the
 * viewer's own before and after views, the events projected for the viewer,
 * and the presentation steps built from them. So a sound is timed with the
 * animation it belongs to, and what the viewer cannot see makes no sound.
 * Pure functions: no audio, no clock.
 */

export interface SoundCueV1 {
  readonly id: SoundIdV1;
  /** Milliseconds after the step (or the boundary phase) starts. */
  readonly delayMs: number;
  /** Level of this play, 0 to 1 (default 1). */
  readonly gain?: number;
}

export type { PresentationStepCueV7 };

const ATTACK_EFFECT_SOUNDS: Readonly<
  Record<
    AttackEffectIdV7,
    { readonly launch: SoundIdV1; readonly impact: SoundIdV1 }
  >
> = {
  NECRO_BOLT: { launch: "attack.magic", impact: "impact.hit" },
  // The user's own recording (2026-10-14), one take cut in two: its launch
  // and its impact, 275 ms apart in the original and 278 ms in the
  // animation, so the impact stays on the hit at every animation speed.
  FIREWORK_ROCKET: { launch: "attack.rocket", impact: "impact.rocket" },
  GATLING_BURST: { launch: "attack.gatling", impact: "impact.hit" },
  CANNON_BLAST: { launch: "attack.cannon", impact: "impact.heavy" },
  ICE_BOULDER: { launch: "attack.siege", impact: "impact.ice" },
  HARPOON: { launch: "attack.ranged", impact: "impact.hit" },
  PIE_THROW: { launch: "attack.siege", impact: "impact.splat" },
  GUMBALL_SHOT: { launch: "attack.pop", impact: "impact.hit" },
  // Bead pulp_wars-eu3r.4: the Battleship's broadside and its area blast.
  BROADSIDE: { launch: "attack.cannon", impact: "impact.explosion" },
};

/**
 * The giants' signatures (`pulp_wars-w49.32`): each cue's opening sound (or
 * none) and the sound of its beat, at GIANT_EFFECT_BEAT_V7.
 */
const GIANT_EFFECT_SOUNDS_V7: Readonly<
  Record<
    GiantFeedbackEffectV7,
    { readonly start: SoundIdV1 | null; readonly hit: SoundIdV1 }
  >
> = {
  CRUSH: { start: null, hit: "impact.heavy" },
  SWALLOW: { start: "support.drain", hit: "special.pop" },
  DIGEST: { start: null, hit: "support.dark" },
  REGURGITATE: { start: "support.dark", hit: "impact.splat" },
  TOSS: { start: "attack.siege", hit: "special.puff" },
  STOMP: { start: null, hit: "impact.explosion" },
  TRAMPLE: { start: null, hit: "impact.heavy" },
  SHARDS: { start: "special.freeze", hit: "impact.ice" },
  HAMMER: { start: "attack.melee", hit: "impact.heavy" },
  BREAK_OFF: { start: "special.pop", hit: "special.sparkle" },
};

const SUPPORT_SOUNDS: Readonly<Record<SupportEffectV7, SoundIdV1>> = {
  RALLY: "support.rally",
  TEND: "support.heal",
  RAISE: "support.dark",
  DEVOUR: "support.dark",
  WAIL: "support.dark",
  INFECT: "support.dark",
  GRAVE: "support.dark",
  PLAGUE: "support.dark",
  CURE: "support.heal",
  BITTEN: "support.dark",
  SPLASH: "impact.splash",
  LIFESTEAL: "support.drain",
  REGENERATE: "support.heal",
  RECOVER: "support.heal",
  FOUNTAIN: "support.heal",
  BLESSING: "special.sparkle",
  SALVAGE: "economy.coin",
  BOUNTY: "economy.coin",
  // Map curiosities round 2: the gate burst and the Coin in the Well.
  GATE: "special.sparkle",
  WELL: "economy.coin",
  // The Vampire and Banshee rework (`pulp_wars-iqhp`): the bats' flutter,
  // the Feast's drain, and the Terror's dark sting.
  BAT_SWIRL: "special.puff",
  FEAST: "support.drain",
  TERROR: "support.dark",
};

/**
 * Another player's building in the viewer's sight is heard at this share
 * of the level of the viewer's own.
 */
export const OTHER_PLAYER_BUILD_GAIN_V7 = 0.6;

/** The lunge reaches its target at this share of a melee step. */
const MELEE_HIT_SHARE = 0.56;
/** A death is heard just after the blow that caused it. */
const DEATH_AFTER_HIT_MS = 60;

/** A hurt sound is heard just after the blow, a little before a death. */
const HURT_AFTER_HIT_MS = 40;

/** Each faction's hurt sound (bead pulp_wars-2yc.52). */
const FACTION_HURT_SOUNDS_V7: Readonly<Record<FactionIdV7, SoundIdV1>> = {
  ORIGINAL: "unit.hurt.human",
  UNDEAD: "unit.hurt.undead",
  GOBLIN: "unit.hurt.goblin",
  DINOSAUR: "unit.hurt.dinosaur",
  MARTIAN: "unit.hurt.martian",
  ICE_FOLK: "unit.hurt.icefolk",
  DWARF: "unit.hurt.dwarf",
  CANDY: "unit.hurt.candy",
  CULT: "unit.hurt.cultist",
};

/**
 * The hurt sound of a damaged unit (bead pulp_wars-2yc.52), from what the
 * viewer sees of it: a Cult summoning (an Imp, a Horror, a Gibbering Mass,
 * the Herald, a Tentacle) is a daemon, the neutral Giant Spider a monster, any faction's giant a
 * giant, every other unit its kind's faction (the faction of its original
 * owner while it is mind-controlled, as its art). A unit neither view
 * holds is the plain `unit.hurt`.
 */
export function hurtSoundOfUnitV7(
  views: readonly PlayerViewV7[],
  find: { readonly unitId: number } | { readonly at: CoordV7 },
): SoundIdV1 {
  for (const view of views) {
    const unit = view.units.find((candidate) =>
      "unitId" in find
        ? candidate.id === find.unitId
        : candidate.at.x === find.at.x && candidate.at.y === find.at.y,
    );
    if (unit === undefined) continue;
    if (unit.summoned !== undefined) return "unit.hurt.daemon";
    const kind = unitFactionV7(view, unit);
    if (kind === NEUTRAL_KIND_V7) return "unit.hurt.monster";
    if (unit.role === "JUGGERNAUT") return "unit.hurt.giant";
    return FACTION_HURT_SOUNDS_V7[kind];
  }
  return "unit.hurt";
}

/**
 * The target's hurt sound when the attack by `unitId` in this boundary
 * damaged it and it lived; null otherwise (a kill sounds the death).
 */
function attackHurt(
  cue: PresentationStepCueV7,
  unitId: number,
): SoundIdV1 | null {
  for (const event of cue.envelope.events)
    if (event.kind === "COMBAT_RESOLVED" && event.preview.attackerId === unitId)
      return event.preview.damageToDefender > 0 &&
        !event.preview.defenderDies &&
        !deadUnitIds(cue.envelope).has(event.preview.targetUnitId)
        ? hurtSoundOfUnitV7([cue.before, cue.after], {
            unitId: event.preview.targetUnitId,
          })
        : null;
  return null;
}

/** The units that died in this boundary, as far as the viewer was told. */
function deadUnitIds(envelope: PlayerEventEnvelopeV7): ReadonlySet<number> {
  const dead = new Set<number>();
  for (const event of envelope.events)
    if (event.kind === "UNIT_DIED") dead.add(event.unitId);
  return dead;
}

/** Whether the attack by `unitId` in this boundary killed either side. */
function attackKills(cue: PresentationStepCueV7, unitId: number): boolean {
  const dead = deadUnitIds(cue.envelope);
  if (dead.size === 0) return false;
  for (const event of cue.envelope.events)
    if (event.kind === "COMBAT_RESOLVED" && event.preview.attackerId === unitId)
      return dead.has(event.preview.targetUnitId) || dead.has(unitId);
  return false;
}

/**
 * Another player's move (bead pulp_wars-2yc.57) is heard at this share of
 * the level of the viewer's own: an enemy turn moves many units.
 */
export const OTHER_PLAYER_MOVE_GAIN_V7 = 0.7;

/**
 * A move of this many tiles or more is heard twice, from its start and
 * from its middle; a shorter one once.
 */
export const MOVE_SOUND_REPEAT_TILES_V7 = 3;

/**
 * How a moving unit sounds (bead pulp_wars-2yc.57), from what the viewer
 * sees of it at the end of the move (else at its start): a ship or an
 * embarked unit (any afloat form) the oar and water of `unit.step.naval`,
 * a flyer (a land-form unit whose kind flies: the Saucer, the Mothership,
 * the Gyrocopter) nothing, and every other unit, mounted units, striders
 * and giants too, the soft shuffle of `unit.step`. A unit neither view
 * holds is `unit.step`.
 */
export function moveSoundOfUnitV7(
  views: readonly PlayerViewV7[],
  unitId: number,
): SoundIdV1 | null {
  for (const view of views) {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (unit === undefined) continue;
    if (isAfloatFormV7(unit.form)) return "unit.step.naval";
    if (unitFliesV7(view, unit)) return null;
    return "unit.step";
  }
  return "unit.step";
}

/**
 * Themed naval branches (`pulp_wars-5ti.18`): the attack sound of a step
 * whose attacker is a sea beast afloat, or null for every other attacker.
 * The Dinosaur Plesiosaur's torpedo is a bite (`attack.plesiosaur`); the
 * Cult Kraken's (`pulp_wars-5ti.22`), the beast that Drags, a lash of a
 * tentacle (`attack.kraken`).
 */
export function seaBeastAttacksV7(
  views: readonly PlayerViewV7[],
  unitId: number,
): "attack.plesiosaur" | "attack.kraken" | null {
  for (const view of views) {
    const unit = view.units.find((candidate) => candidate.id === unitId);
    if (unit === undefined) continue;
    if (unit.form !== "NAVAL") return null;
    const mechanics = unitRoleMechanicsV7(view, unit);
    if (!mechanics.seaBeast) return null;
    return mechanics.dragsAfloat ? "attack.kraken" : "attack.plesiosaur";
  }
  return null;
}

/**
 * The sounds of a Move step (bead pulp_wars-2yc.57): one soft footstep
 * shuffle or oar dip as the unit sets off, and a second from the middle of
 * a long move, every player's alike, another player's a little quieter. A
 * push or a knock-back slide is silent, and so is a move the viewer sees
 * only one tile of: the plan cuts an enemy's move where it enters the
 * unexplored, so what the viewer cannot see makes no sound.
 */
function moveSoundCuesV7(
  cue: PresentationStepCueV7,
  step: Extract<CorePresentationStepV7, { readonly kind: "MOVE" }>,
): readonly SoundCueV1[] {
  if (step.pushSlide === true || step.path.length < 2) return [];
  const id = moveSoundOfUnitV7([cue.after, cue.before], step.unitId);
  if (id === null) return [];
  const gain = step.followCamera === true ? OTHER_PLAYER_MOVE_GAIN_V7 : 1;
  const tiles = step.path.length - 1;
  const at = (delayMs: number): SoundCueV1 =>
    gain === 1 ? { id, delayMs } : { id, delayMs, gain };
  return tiles >= MOVE_SOUND_REPEAT_TILES_V7
    ? [at(0), at(step.durationMs / 2)]
    : [at(0)];
}

/**
 * The sounds of one presentation step, timed from the step's start. The
 * delays are in the animation's own milliseconds; the caller scales them
 * with the animation speed.
 */
export function soundCuesForStepV7(
  cue: PresentationStepCueV7,
): readonly SoundCueV1[] {
  const step = cue.step;
  switch (step.kind) {
    case "MOVE":
      return moveSoundCuesV7(cue, step);
    case "MELEE":
    case "RANGED":
    case "CATAPULT": {
      const kills = attackKills(cue, step.unitId);
      // Bead pulp_wars-2yc.52: a target that lives through the blow is
      // heard taking it, in the voice of its kind.
      const hurt = attackHurt(cue, step.unitId);
      if (step.attackEffect !== undefined) {
        const sounds = ATTACK_EFFECT_SOUNDS[step.attackEffect];
        const hitMs =
          ATTACK_EFFECT_DURATIONS_V7[step.attackEffect] *
          ATTACK_EFFECT_HIT_V7[step.attackEffect];
        return [
          { id: sounds.launch, delayMs: 0 },
          // A shattered target keeps for its Shatter step.
          ...(step.holdTarget === true
            ? []
            : [
                { id: sounds.impact, delayMs: hitMs },
                ...(hurt === null
                  ? []
                  : [{ id: hurt, delayMs: hitMs + HURT_AFTER_HIT_MS }]),
                // The Candy redesign: a ricochet pops again on the next unit.
                ...(step.ricochet === undefined
                  ? []
                  : [
                      {
                        id: "special.boing" as const,
                        delayMs: hitMs + 40,
                      },
                      {
                        id: sounds.impact,
                        delayMs:
                          ATTACK_EFFECT_DURATIONS_V7[step.attackEffect] *
                          RICOCHET_LANDS_V7,
                      },
                    ]),
                ...(kills
                  ? [
                      {
                        id: "unit.death" as const,
                        delayMs: hitMs + DEATH_AFTER_HIT_MS,
                      },
                    ]
                  : []),
              ]),
        ];
      }
      const launch: SoundIdV1 =
        step.kind === "MELEE"
          ? (seaBeastAttacksV7([cue.before, cue.after], step.unitId) ??
            "attack.melee")
          : step.kind === "RANGED"
            ? "attack.ranged"
            : "attack.siege";
      const hitMs =
        step.kind === "MELEE"
          ? step.durationMs * MELEE_HIT_SHARE
          : step.durationMs;
      // A bomb's burst and an acid blob's splash are steps of their own.
      const lands = step.holdTarget !== true && step.projectile === undefined;
      return [
        { id: launch, delayMs: 0 },
        ...(lands
          ? [
              {
                id:
                  step.kind === "CATAPULT"
                    ? ("impact.heavy" as const)
                    : ("impact.hit" as const),
                delayMs: hitMs,
              },
              ...(hurt === null
                ? []
                : [{ id: hurt, delayMs: hitMs + HURT_AFTER_HIT_MS }]),
            ]
          : []),
        ...(kills && step.holdTarget !== true
          ? [
              {
                id: "unit.death" as const,
                delayMs: hitMs + DEATH_AFTER_HIT_MS,
              },
            ]
          : []),
      ];
    }
    case "DAMAGE":
      return [
        {
          id: hurtSoundOfUnitV7([cue.before, cue.after], {
            unitId: step.unitId,
          }),
          delayMs: 0,
        },
        ...(step.lethal
          ? [{ id: "unit.death" as const, delayMs: DEATH_AFTER_HIT_MS }]
          : []),
      ];
    case "EXPLOSION":
      return [{ id: "impact.explosion", delayMs: 0 }];
    case "BUILD":
      // Another player's building, seen by the viewer: quieter than one's own.
      return [
        { id: "economy.build", delayMs: 0, gain: OTHER_PLAYER_BUILD_GAIN_V7 },
      ];
    case "SUPPORT":
      // The Vampire and Banshee rework: the bats flutter up, then off.
      if (step.effect === "BAT_SWIRL")
        return [
          { id: "special.puff", delayMs: 0 },
          { id: "special.puff", delayMs: step.durationMs * 0.5, gain: 0.7 },
        ];
      return [{ id: SUPPORT_SOUNDS[step.effect], delayMs: 0 }];
    case "WINDMILL_HEALING":
      return [{ id: "support.heal", delayMs: step.sourceDurationMs }];
    case "MARTIAN":
      switch (step.effect) {
        case "HEAT_RAY": {
          const hitMs = step.durationMs * 0.5;
          const hurt =
            step.unitId === undefined ? null : attackHurt(cue, step.unitId);
          return [
            { id: "attack.ray", delayMs: 0 },
            { id: "impact.hit", delayMs: hitMs },
            ...(hurt === null
              ? []
              : [{ id: hurt, delayMs: hitMs + HURT_AFTER_HIT_MS }]),
            ...(step.unitId !== undefined && attackKills(cue, step.unitId)
              ? [
                  {
                    id: "unit.death" as const,
                    delayMs: hitMs + DEATH_AFTER_HIT_MS,
                  },
                ]
              : []),
          ];
        }
        case "SHIELD_FLARE":
          return [{ id: "impact.shield", delayMs: 0 }];
        case "BEAM_DOWN":
        case "TRACTOR_BEAM":
          return [{ id: "special.beam", delayMs: 0 }];
        case "MIND_CONTROL":
          return [{ id: "special.mind", delayMs: 0 }];
        case "CONTROL_RELEASE":
          return [{ id: "impact.ice", delayMs: 0 }];
      }
      return [];
    case "ICE_FOLK":
      switch (step.effect) {
        case "SHATTER":
          return [
            { id: "special.freeze", delayMs: 0 },
            { id: "impact.ice", delayMs: step.durationMs * 0.5 },
          ];
        case "ICE_CRUSH":
          return [{ id: "impact.ice", delayMs: 0 }];
        case "COLD_SNAP":
        case "COLD_AURA":
        case "ICE_FREEZE":
        case "FROST":
          return [{ id: "special.freeze", delayMs: 0 }];
        // Ice Folk Freeze (`pulp_wars-w49.38`): the Frost Bolt's whoosh and
        // its freeze; the Stampede's thunder and a thud on each unit hit.
        case "FROST_BOLT":
          return [
            { id: "attack.ranged", delayMs: 0 },
            { id: "special.freeze", delayMs: step.durationMs * 0.45 },
          ];
        case "STAMPEDE":
          return [
            { id: "impact.heavy", delayMs: 0 },
            ...(step.hits ?? []).map((_, index) => ({
              id: "impact.hit" as const,
              delayMs:
                step.durationMs *
                0.75 *
                Math.min(1, (index + 1) / Math.max(1, step.cells.length)),
            })),
          ];
        case "BOLAS":
          return [
            { id: "attack.ranged", delayMs: 0 },
            { id: "special.freeze", delayMs: step.durationMs * 0.5 },
          ];
        case "SWEEP":
          return [{ id: "attack.melee", delayMs: 0 }];
        case "ICE_MELT":
          return [{ id: "impact.splash", delayMs: 0 }];
        // The frozen sea redesign (`pulp_wars-5ti.27`): Crack Ice, a break
        // and a crack alike.
        case "ICE_CRACK":
        case "ICE_BREAK":
          return [{ id: "special.ice-crack", delayMs: 0 }];
        case "PRIZE_FLAG":
          return [{ id: "support.rally", delayMs: 0 }];
      }
      return [];
    case "DWARF":
      switch (step.effect) {
        case "TUNNEL":
          return [{ id: "special.burrow", delayMs: 0 }];
        case "ERUPTION":
          return [{ id: "impact.explosion", delayMs: 0 }];
        case "BOMB":
          return [{ id: "impact.explosion", delayMs: step.durationMs * 0.4 }];
        case "ASSEMBLE":
        case "REPAIR":
          return [{ id: "economy.build", delayMs: 0 }];
        case "KNOCKBACK":
          return [{ id: "special.puff", delayMs: 0 }];
        // Dwarf crowd control (`pulp_wars-w49.34`).
        case "WHIRL":
          return [{ id: "attack.melee", delayMs: 0 }];
        case "BARRICADE":
          return [{ id: "economy.build", delayMs: 0 }];
        case "SPLINTERS":
          return [{ id: "impact.hit", delayMs: 0 }];
      }
      return [];
    case "CULT":
      // The Cultists (beads pulp_wars-mch9.18 and pulp_wars-mch9.19). The
      // signature events have sounds of their own (bead pulp_wars-mch9.24,
      // the `cult.*` ids); the rest keep the sounds the game already had.
      switch (step.effect) {
        case "SUMMON":
          return [{ id: "cult.summon", delayMs: 0 }];
        case "STRAND_SNAP":
          return [{ id: "cult.snap", delayMs: 0 }];
        case "BOO":
          return [{ id: "special.boing", delayMs: 0 }];
        case "UNBOUND":
          return [{ id: "cult.unbound", delayMs: 0 }];
        case "STRAND_FORMED":
          return [];
        case "RITUAL_BEGUN":
          return [{ id: "support.dark", delayMs: 0 }];
        case "RITUAL_FIZZLE":
          return [{ id: "special.puff", delayMs: 0 }];
        case "STARFALL":
          // The star's whistle, then its burst over the nine tiles.
          return [
            { id: "cult.starfall", delayMs: 0 },
            { id: "impact.explosion", delayMs: step.durationMs * 0.42 },
          ];
        case "HERALD":
          return [{ id: "cult.herald", delayMs: 0 }];
        case "CONSUMED":
          return [{ id: "special.puff", delayMs: 0 }];
        case "PROCLAIM":
          return [{ id: "cult.proclaim", delayMs: 0 }];
        case "RIBBIT":
          // A frog turning back (bead pulp_wars-mch9.26): the puff alone.
          if (step.undone === true) return [{ id: "special.puff", delayMs: 0 }];
          // The croak as the frog jumps out of the puff.
          return [{ id: "cult.ribbit", delayMs: step.durationMs * 0.35 }];
        case "SWITCHEROO":
          return [{ id: "special.sparkle", delayMs: 0 }];
        case "TENTACLE":
          return [{ id: "cult.tentacle", delayMs: 0 }];
        case "GRAB":
          return [{ id: "special.boing", delayMs: 0 }];
        case "PAMPHLETS":
          return [{ id: "cult.pamphlets", delayMs: 0 }];
      }
      return [];
    case "CANDY":
      switch (step.effect) {
        case "RUSH":
        case "REBAKE":
          return [{ id: "special.sparkle", delayMs: 0 }];
        case "CRASH":
          return [{ id: "special.dizzy", delayMs: 0 }];
        case "WAKE":
          return [{ id: "special.pop", delayMs: 0 }];
        case "SUGAR_TOSS":
          return [{ id: "support.heal", delayMs: step.durationMs * 0.4 }];
        case "SPLAT":
          return [{ id: "impact.splat", delayMs: 0 }];
        case "BOUNCE":
          return [{ id: "special.boing", delayMs: 0 }];
        case "PEPPERMINT": {
          const at = step.cells[0];
          return [
            { id: "special.pop", delayMs: 0 },
            {
              id:
                at === undefined
                  ? "unit.hurt"
                  : hurtSoundOfUnitV7([cue.before, cue.after], { at }),
              delayMs: 40,
            },
          ];
        }
        case "CRUMBS_EATEN":
          return [{ id: "economy.harvest", delayMs: 0 }];
        // The Candy redesign: the Bunny's stomp, then the ring's hits.
        case "THUMP":
          return [
            { id: "impact.heavy", delayMs: 0 },
            { id: "special.puff", delayMs: step.durationMs * THUMP_HIT_V7 },
          ];
        case "TOP_UP":
          return [
            { id: "special.sparkle", delayMs: 0 },
            { id: "support.heal", delayMs: step.durationMs * 0.4 },
          ];
      }
      return [];
    case "GIANT": {
      // The giants' signatures (`pulp_wars-w49.32`): each cue's sound at
      // its beat (the thud, the gulp, the throw and landing, the slam).
      const durationMs = GIANT_EFFECT_DURATIONS_V7[step.effect];
      const hitMs = durationMs * GIANT_EFFECT_BEAT_V7[step.effect];
      const sounds = GIANT_EFFECT_SOUNDS_V7[step.effect];
      const hammerKills =
        step.effect === "HAMMER" &&
        [...deadUnitIds(cue.envelope)].some((id) => step.unitIds.includes(id));
      return [
        ...(sounds.start === null ? [] : [{ id: sounds.start, delayMs: 0 }]),
        { id: sounds.hit, delayMs: hitMs },
        ...(hammerKills
          ? [{ id: "unit.death" as const, delayMs: hitMs + DEATH_AFTER_HIT_MS }]
          : []),
      ];
    }
    case "DINOSAUR":
      switch (step.effect) {
        case "CHARGE_HIT":
          return [{ id: "impact.heavy", delayMs: 0 }];
        case "ACID_HIT":
          return [{ id: "impact.splat", delayMs: 0 }];
        case "EGG_LAID":
          return [{ id: "special.pop", delayMs: 0 }];
        case "HATCH":
        case "EGG_DESTROYED":
          return [{ id: "special.hatch", delayMs: 0 }];
        case "HATCH_CALL":
          return [{ id: "support.rally", delayMs: 0 }];
        case "GROW":
          return [{ id: "unit.levelup", delayMs: 0 }];
      }
      return [];
    case "VISIBILITY_CROSSFADE":
    case "TACTICAL_STATUS":
    case "DISBAND":
      return [];
  }
}

export interface BoundarySoundCuesV7 {
  /** Heard when the command is accepted (the viewer's own instant actions). */
  readonly start: readonly SoundCueV1[];
  /** Heard after the board has played the boundary's animations. */
  readonly end: readonly SoundCueV1[];
  /**
   * The few `end` sounds also heard when the animations are skipped (Fast
   * Forward): the viewer's turn starting, and the end of the match.
   */
  readonly essential: readonly SoundCueV1[];
}

/**
 * The sounds of a boundary that no presentation step carries: the viewer's
 * own economy and city events, the turn changing, achievements and the end
 * of the match. Other players' economy is silent (the viewer does not see
 * their treasury); their buildings in sight are heard through BUILD steps.
 */
export function soundCuesForBoundaryV7(
  before: PlayerViewV7,
  envelope: PlayerEventEnvelopeV7,
  after: PlayerViewV7,
): BoundarySoundCuesV7 {
  const viewer = after.viewer.id;
  const start: SoundIdV1[] = [];
  const end: SoundIdV1[] = [];
  const essential: SoundIdV1[] = [];
  const ownCity = (cityId: number): boolean =>
    [...after.cities, ...before.cities].some(
      (city) => city.id === cityId && city.ownerId === viewer,
    );
  const ownUnit = (unitId: number): boolean =>
    [...after.units, ...before.units].some(
      (unit) => unit.id === unitId && unit.ownerId === viewer,
    );
  for (const event of envelope.events) {
    switch (event.kind) {
      case "TURN_ENDED":
        if (event.playerId === viewer) start.push("turn.end");
        break;
      case "TURN_STARTED":
        if (event.playerId === viewer) essential.push("turn.start");
        break;
      case "TECH_RESEARCHED":
        if (event.playerId === viewer) start.push("research.complete");
        break;
      case "FRUIT_HARVESTED":
      case "GAME_HUNTED":
      case "FISH_HARVESTED":
      case "PEARLS_GATHERED":
        if (event.playerId === viewer) start.push("economy.harvest");
        break;
      case "ECONOMIC_BUILDING_BUILT":
      case "PORT_BUILT":
      case "SHIPYARD_BUILT":
      case "ROAD_BUILT":
      case "FIELD_DEFENSE_BUILT":
      case "FOREST_CLEARED":
      case "FOREST_REPLANTED":
      case "FOREST_CULTIVATED":
      case "MOUNTAIN_BLASTED":
        if (event.playerId === viewer) start.push("economy.build");
        break;
      // The user, 2026-10-14: "for monument let's not have a sound effect
      // at all". A Monument is silent; `achievement.monument` stays in the
      // Gallery, marked as not played.
      case "MONUMENT_BUILT":
        break;
      case "UNIT_TRAINED":
      case "NAVAL_UNIT_TRAINED":
      case "UNIT_REWARD_GRANTED":
        if (event.playerId === viewer) start.push("unit.train");
        break;
      case "CITY_REWARD_CHOSEN":
        if (event.playerId === viewer) start.push("reward.chosen");
        break;
      case "UNIT_SACRIFICED":
        // The Cultists (bead pulp_wars-mch9.24): the viewer's own offering.
        if (event.playerId === viewer) start.push("cult.sacrifice");
        break;
      case "UNIT_SEIZED":
        // Heard by the Cult that seized and by the owner of the victim.
        if (event.playerId === viewer || event.victimOwnerId === viewer)
          start.push("cult.sacrifice");
        break;
      case "UNIT_DISBANDED":
        if (event.playerId === viewer && event.coinDelta > 0)
          start.push("economy.coin");
        break;
      case "CITY_CAPTURED":
        if (event.to === viewer)
          end.push(event.from === null ? "village.capture" : "city.capture");
        else if (event.from === viewer) end.push("city.lost");
        break;
      case "CITY_LEVELED_UP":
        if (ownCity(event.cityId)) end.push("city.levelup");
        break;
      case "UNIT_PROMOTED":
        if (ownUnit(event.unitId)) end.push("unit.levelup");
        break;
      case "TREASURE_CAPTURED":
        if (event.playerId === viewer) end.push("economy.treasure");
        break;
      case "SPOILS_AWARDED":
      case "PLUNDER_AWARDED":
      case "CITY_REWARD_AUTOMATICALLY_GRANTED":
        if (event.playerId === viewer) end.push("economy.coin");
        break;
      case "INCOME_AWARDED":
        if (event.playerId === viewer && event.totalCoins > 0)
          end.push("economy.coin");
        break;
      case "ACHIEVEMENT_UNLOCKED":
        if (event.playerId === viewer) end.push("achievement.unlocked");
        break;
      case "MATCH_ENDED":
        // The same reading as the results dialog's title.
        if (event.outcome.kind === "VICTORY") essential.push("match.victory");
        else if (event.outcome.kind === "DEFEAT")
          essential.push("match.defeat");
        break;
      default:
        break;
    }
  }
  // The end of the match is the last word: nothing plays over its tune.
  const matchEnd = essential.find(
    (id) => id === "match.victory" || id === "match.defeat",
  );
  if (matchEnd !== undefined)
    return {
      start: sequence(start),
      end: [{ id: matchEnd, delayMs: 0 }],
      essential: [{ id: matchEnd, delayMs: 0 }],
    };
  const roadLinked = roadLinkChangesV7(before, after).linked.length > 0;
  return {
    start: sequence(start),
    end: [
      ...sequence([...end, ...essential]),
      ...(roadLinked
        ? [
            {
              id: ROAD_LINK_SOUND_V7,
              delayMs: 0,
              gain: ROAD_LINK_SOUND_GAIN_V7,
            },
          ]
        : []),
    ],
    essential: sequence(essential),
  };
}

/**
 * Bead pulp_wars-v56v: a new Road link's soft sparkle as its population
 * icons land (the DOM shell moves it to the first landing). One per
 * boundary however many cities link; a lost link is silent.
 */
export const ROAD_LINK_SOUND_V7: SoundIdV1 = "special.sparkle";
export const ROAD_LINK_SOUND_GAIN_V7 = 0.5;

/** Distinct sounds of one phase, a short beat apart so each is heard. */
function sequence(ids: readonly SoundIdV1[]): readonly SoundCueV1[] {
  return [...new Set(ids)].map((id, index) => ({ id, delayMs: index * 140 }));
}
