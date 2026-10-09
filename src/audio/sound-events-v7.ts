import type { PlayerEventEnvelopeV7, PlayerViewV7 } from "../engine/index";
import {
  ATTACK_EFFECT_DURATIONS_V7,
  ATTACK_EFFECT_HIT_V7,
  RICOCHET_LANDS_V7,
  THUMP_HIT_V7,
  type AttackEffectIdV7,
} from "../render/canvas/attack-effects-v7";
import type {
  PresentationStepCueV7,
  SupportEffectV7,
} from "../render/canvas/presentation-plan-v7";
import type { SoundIdV1 } from "./sound-manifest";
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
  FIREWORK_ROCKET: { launch: "attack.rocket", impact: "impact.explosion" },
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
      // The viewer's own unit takes a quiet step. Other players' moves,
      // pushes and one-frame camera steps are silent.
      return step.followCamera === true ||
        step.pushSlide === true ||
        step.path.length < 2
        ? []
        : [{ id: "unit.step", delayMs: 0 }];
    case "MELEE":
    case "RANGED":
    case "CATAPULT": {
      const kills = attackKills(cue, step.unitId);
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
          ? "attack.melee"
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
        { id: "unit.hurt", delayMs: 0 },
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
      return [{ id: SUPPORT_SOUNDS[step.effect], delayMs: 0 }];
    case "WINDMILL_HEALING":
      return [{ id: "support.heal", delayMs: step.sourceDurationMs }];
    case "MARTIAN":
      switch (step.effect) {
        case "HEAT_RAY": {
          const hitMs = step.durationMs * 0.5;
          return [
            { id: "attack.ray", delayMs: 0 },
            { id: "impact.hit", delayMs: hitMs },
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
        case "PEPPERMINT":
          return [
            { id: "special.pop", delayMs: 0 },
            { id: "unit.hurt", delayMs: 40 },
          ];
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
      case "MONUMENT_BUILT":
        // Another player's Monument is projected as a building only.
        if (event.visibility === "FULL" && event.playerId === viewer)
          start.push("achievement.monument");
        break;
      case "UNIT_TRAINED":
      case "NAVAL_UNIT_TRAINED":
      case "UNIT_REWARD_GRANTED":
        if (event.playerId === viewer) start.push("unit.train");
        break;
      case "CITY_REWARD_CHOSEN":
        if (event.playerId === viewer) start.push("reward.chosen");
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
  return {
    start: sequence(start),
    end: sequence([...end, ...essential]),
    essential: sequence(essential),
  };
}

/** Distinct sounds of one phase, a short beat apart so each is heard. */
function sequence(ids: readonly SoundIdV1[]): readonly SoundCueV1[] {
  return [...new Set(ids)].map((id, index) => ({ id, delayMs: index * 140 }));
}
