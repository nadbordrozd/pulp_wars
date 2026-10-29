import type { CommandV7 } from "../engine/v7/commands";
import { queryCombatPreviewV7 } from "../engine/v7/query";
import {
  nextBounded,
  randomState,
  seedFromText,
} from "../engine/random/random";
import {
  isHumanPlayerIdV7,
  isNeutralOwnerV7,
  type CoordV7,
} from "../engine/v7/types";
import type { PlayerViewV7 } from "../engine/v7/view";

/**
 * Easy mode (`pulp_wars-q6cc`, docs/architecture/NORMAL_AI.md "Easy mode"):
 * the personality of an AI seat. The user: "the AI is slightly dumber or
 * specifically less aggressive". A setup whose `aiDifficulty` is `EASY`
 * gives every AI seat (every seat but the human's, seat 0) the Easy
 * personality; every other setup, and the human seat of an Easy setup
 * (played by the AI in headless matches), plays Normal.
 *
 * The personality is a thin layer: the policy reads it at a handful of
 * points and the Normal personality is the identity at every one of them,
 * so a Normal decision is byte-identical to the policy without it.
 *
 * 1. **The weight to commit** (`armyAssaultModeV7`, `commitForcePercent`):
 *    every weight an army needs against a position, in percent of
 *    Normal's. Easy needs 40% more: 210% of the position's weight instead
 *    of 150% to commit, 140% instead of 100% once the battle is joined.
 * 2. **No focus fire** (`armyFocusV7`): Easy has no focus, so a committed
 *    unit takes a losing exchange only once the battle is joined or when
 *    it is lost anyway, and no hit chases the target the others can kill.
 * 3. **The campaign plan** (`CampaignTemperV7`): a wave of five units at
 *    home sets out instead of three, and the rest follow once three are
 *    out instead of two; a RUSH wave is three units instead of one; a
 *    front is sent with twice the strength that holds it instead of one
 *    and a half. In a skirmish an Easy seat marches on no enemy city
 *    before round 10 (the quiet opening).
 * 4. **Directives** (`activeMissionDirectiveV7`): a mission's `RUSH` or
 *    `ASSAULT` (also a `GUARD`'s others) starts two rounds later, and an
 *    `ASSAULT` weighs the position at its target like any other instead of
 *    going in at any weight. Every other directive is unchanged, and the
 *    mission's hostile waves come as written.
 * 5. **The decision** (`easyDecisionV7`, after scoring). Away from home
 *    (a target more than two tiles from every own city center; near home
 *    the seat defends as Normal does): in a skirmish's quiet opening no
 *    attack on a player's unit; afterwards a unit below half its HP makes
 *    no attack that does not kill, and a healthy unit only an exchange
 *    that deals more than it takes (it pulls back or rests instead of
 *    trading). And with a 15% chance per decision the seat takes the
 *    second-best candidate of the same priority and kind instead of the
 *    best, for a Move, an Attack, a unit trained or a technology: never
 *    End Turn, an ability that spends the unit, or an attack that kills
 *    the attacker without a kill. The chance is drawn from a Mulberry32 stream seeded by
 *    the match seed, the seat, and the command index, so a match replays
 *    exactly; nothing draws from the match's own PRNG.
 */
export interface AiPersonalityV7 {
  readonly id: "NORMAL" | "EASY";
  /** Every weight the army needs to commit, in percent of Normal's. */
  readonly commitForcePercent: number;
  /** Whether a committed army focuses its fire (`armyFocusV7`). */
  readonly focusFire: boolean;
  /** The campaign plan's numbers; null for Normal's own constants. */
  readonly temper: CampaignTemperV7 | null;
  /** Rounds a mission's RUSH or ASSAULT starts late. */
  readonly directiveDelayRounds: number;
  /** Whether an ASSAULT goes in at its target whatever the weight. */
  readonly assaultAtAnyWeight: boolean;
  /** Below this percent of its HP a unit makes no attack that does not kill. */
  readonly woundedHoldPercent: number;
  /**
   * Away from home, an attack that does not kill must deal more than it
   * takes (no even or losing trades).
   */
  readonly tradesOnlyAhead: boolean;
  /** The chance, in percent, of the second-best candidate. */
  readonly mistakePercent: number;
}

/**
 * The campaign plan's numbers under a personality (`src/ai/v7-campaign.ts`
 * reads them in place of its constants when given).
 */
export interface CampaignTemperV7 {
  /** In a skirmish, no march on an enemy city before this round. */
  readonly quietUntilRound: number;
  /** `CAMPAIGN_WAVE_SIZE_V7` (3). */
  readonly waveSize: number;
  /** `CAMPAIGN_WAVE_OUT_V7` (2). */
  readonly waveOut: number;
  /** A RUSH wave (1). */
  readonly rushWave: number;
  /** `CAMPAIGN_FRONT_NEED_RATIO_V7` (150). */
  readonly frontNeedRatio: number;
}

export const NORMAL_AI_PERSONALITY_V7: AiPersonalityV7 = Object.freeze({
  id: "NORMAL",
  commitForcePercent: 100,
  focusFire: true,
  temper: null,
  directiveDelayRounds: 0,
  assaultAtAnyWeight: true,
  woundedHoldPercent: 0,
  tradesOnlyAhead: false,
  mistakePercent: 0,
});

export const EASY_AI_PERSONALITY_V7: AiPersonalityV7 = Object.freeze({
  id: "EASY",
  commitForcePercent: 140,
  focusFire: false,
  temper: Object.freeze({
    quietUntilRound: 10,
    waveSize: 5,
    waveOut: 3,
    rushWave: 3,
    frontNeedRatio: 200,
  }),
  directiveDelayRounds: 2,
  assaultAtAnyWeight: false,
  woundedHoldPercent: 50,
  tradesOnlyAhead: true,
  mistakePercent: 15,
});

/** A unit this close to an own city center counts as near home. */
export const EASY_HOME_RADIUS_V7 = 2;

/**
 * The personality of the viewer's seat: Easy for an AI seat of an `EASY`
 * setup, Normal otherwise. A human seat of an online match (`humanSeats`,
 * `pulp_wars-eqc6.1`) is never an AI seat.
 */
export function aiPersonalityForViewV7(
  view: Pick<PlayerViewV7, "setup" | "viewer" | "humanPlayerId">,
): AiPersonalityV7 {
  return view.setup.aiDifficulty === "EASY" &&
    view.viewer.id !== view.humanPlayerId &&
    !isHumanPlayerIdV7(view.setup, view.viewer.id)
    ? EASY_AI_PERSONALITY_V7
    : NORMAL_AI_PERSONALITY_V7;
}

/** The campaign plan's numbers of the viewer's seat, or null for Normal. */
export function campaignTemperForViewV7(
  view: Pick<PlayerViewV7, "setup" | "viewer" | "humanPlayerId">,
): CampaignTemperV7 | null {
  const temper = aiPersonalityForViewV7(view).temper;
  if (temper === null) return null;
  // The quiet opening is a skirmish's: a mission keeps its own clock.
  return view.setup.mapType === "MISSION"
    ? { ...temper, quietUntilRound: 0 }
    : temper;
}

/**
 * The draw of one decision, 0 to 99: Mulberry32 seeded by the match seed,
 * the seat and the command index (the engine's PRNG functions on a stream
 * of its own; the match's PRNG is never touched).
 */
export function easyDecisionDrawV7(
  view: Pick<PlayerViewV7, "setup" | "viewer" | "commandIndex">,
): number {
  const seed =
    (seedFromText(`easy:${view.viewer.id}:${view.commandIndex}`) ^
      view.setup.seed) >>>
    0;
  return nextBounded(randomState(seed), 100).value;
}

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** Whether a tile is within `EASY_HOME_RADIUS_V7` of an own city center. */
function nearHomeV7(view: PlayerViewV7, at: CoordV7): boolean {
  return view.cities.some(
    (city) =>
      city.ownerId === view.viewer.id &&
      chebyshev(city.at, at) <= EASY_HOME_RADIUS_V7,
  );
}

/**
 * Whether the personality drops this attack (point 5), away from home: in
 * the quiet opening any attack on a player's unit; afterwards a wounded
 * unit's attack that does not kill, and an exchange that does not come
 * out ahead.
 */
function easyRefusesV7(
  view: PlayerViewV7,
  personality: AiPersonalityV7,
  quietUntilRound: number,
  command: CommandV7,
): boolean {
  if (command.kind !== "ATTACK") return false;
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  // Only a player's unit: a Monster or a neutral camp is fair game.
  if (
    target === undefined ||
    isNeutralOwnerV7(target.ownerId) ||
    nearHomeV7(view, target.at)
  )
    return false;
  if (view.round < quietUntilRound) return true;
  const actor = view.units.find((unit) => unit.id === command.unitId);
  if (actor === undefined) return false;
  const preview = queryCombatPreviewV7(view, command.unitId, target.id);
  if (preview === null) return true;
  if (preview.defenderDies) return false;
  // A wounded unit makes no attack that does not kill; a healthy one only
  // an exchange that deals more than it takes.
  return (
    100 * actor.hp < personality.woundedHoldPercent * actor.maxHp ||
    (personality.tradesOnlyAhead &&
      preview.damageToAttacker >= preview.damageToDefender)
  );
}

/**
 * The kinds a mistake may swap, each only for another of its own kind: a
 * Move, an Attack (never one that kills the attacker without a kill), a
 * unit trained, a technology researched. Never End Turn, a city reward, an
 * ability that spends or risks the unit (a Kaboom, a bomb), or a capture.
 */
const EASY_MISTAKE_KINDS_V7: ReadonlySet<CommandV7["kind"]> = new Set([
  "MOVE",
  "ATTACK",
  "TRAIN",
  "RESEARCH",
]);

/** An attack that kills its attacker without a kill. */
function suicidalV7(view: PlayerViewV7, command: CommandV7): boolean {
  if (command.kind !== "ATTACK") return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return preview === null || (preview.attackerDies && !preview.defenderDies);
}

/**
 * Point 5: the scored candidates (best first) as the personality plays
 * them, and whether a draw was made. Normal returns them unchanged.
 * Never removes End Turn or a pending choice: only attacks are dropped,
 * so a legal command always remains.
 */
export function easyDecisionV7<
  T extends {
    readonly command: CommandV7;
    readonly score: { readonly priority: number };
  },
>(
  view: PlayerViewV7,
  candidates: readonly T[],
): { readonly candidates: readonly T[]; readonly draws: 0 | 1 } {
  const personality = aiPersonalityForViewV7(view);
  if (personality.id === "NORMAL") return { candidates, draws: 0 };
  const quiet = campaignTemperForViewV7(view)?.quietUntilRound ?? 0;
  const kept = candidates.filter(
    (candidate) => !easyRefusesV7(view, personality, quiet, candidate.command),
  );
  const best = kept[0];
  if (best === undefined || !EASY_MISTAKE_KINDS_V7.has(best.command.kind))
    return { candidates: kept, draws: 0 };
  if (easyDecisionDrawV7(view) >= personality.mistakePercent)
    return { candidates: kept, draws: 1 };
  const index = kept.findIndex(
    (candidate, at) =>
      at > 0 &&
      candidate.score.priority === best.score.priority &&
      candidate.command.kind === best.command.kind &&
      !suicidalV7(view, candidate.command),
  );
  if (index < 0) return { candidates: kept, draws: 1 };
  const swapped = [...kept];
  const second = swapped[index] as T;
  swapped.splice(index, 1);
  swapped.unshift(second);
  return { candidates: swapped, draws: 1 };
}
