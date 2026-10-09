import type { PlayerId } from "../model/ids";
import { scoreRankingV7, scoresV7, type PlayerScoreV7 } from "./score";
import {
  PERFECTION_ROUNDS_V7,
  gameModeOfV7,
  type GameModeV7,
  type GameStateV7,
  type MatchSetupV7,
  type ScoreRound30SnapshotV7,
} from "./types";

/**
 * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 5.5):
 * the hardest AI difficulty a setup can choose. Normal is the only one
 * today, so every match meets the condition; the AI head start
 * (`pulp_wars-w49.7`) is the expected lever and updates this constant.
 */
export const HARDEST_AI_DIFFICULTY_V7: MatchSetupV7["aiDifficulty"] = "NORMAL";

/**
 * Section 5.2: the rating thresholds in hundredths for `rivals` rivals at
 * setup: 2 stars at `1.5 + 0.25 × max(0, 3 − rivals)`, 3 stars at
 * `2.0 + 0.5 × max(0, 3 − rivals)`.
 */
export function starThresholdsV7(rivals: number): {
  readonly twoStarsHundredths: number;
  readonly threeStarsHundredths: number;
} {
  const missing = Math.max(0, 3 - rivals);
  return {
    twoStarsHundredths: 150 + 25 * missing,
    threeStarsHundredths: 200 + 50 * missing,
  };
}

/**
 * The inputs of the grade (section 5): computed by the engine from the
 * state at the end of the match ({@link starGradeInputsV7}); the grade
 * itself is the pure {@link starGradeV7}.
 */
export interface StarGradeInputsV7 {
  readonly gameMode: GameModeV7;
  /** The human won (`VICTORY` for the human seat). */
  readonly victory: boolean;
  /** `aiCount` at setup. */
  readonly rivals: number;
  /** The setup is on the hardest difficulty (section 5.5). */
  readonly hardestDifficulty: boolean;
  /** The human's score at the rating moment (section 5.1). */
  readonly yourScore: number;
  /** The highest rival peak at the rating moment. */
  readonly bestRivalPeak: number;
  /** The round of the rating moment (at most `PERFECTION_ROUNDS_V7`). */
  readonly ratingRound: number;
  /** Every rival was eliminated by the human's capture. */
  readonly everyRivalEliminatedByYou: boolean;
  /** The human lost no unit and no city (section 5.4). */
  readonly flawless: boolean;
}

/** One condition of the grade, met or missed (section 8 shows them). */
export interface StarGradeConditionsV7 {
  readonly victory: boolean;
  readonly twoStarRating: boolean;
  readonly threeStarRating: boolean;
  readonly hardestDifficulty: boolean;
  /** Domination only; null in Perfection, which asks for no eliminations. */
  readonly everyRivalEliminatedByYou: boolean | null;
  readonly flawless: boolean;
}

/** Section 5: the grade of a finished match for the human seat. */
export interface StarGradeV7 {
  readonly stars: 0 | 1 | 2 | 3;
  /** The hidden glow: a flawless win with at least the 2-star rating. */
  readonly glow: boolean;
  /**
   * The rating `yourScore ÷ bestRivalPeak` as an exact fraction, and
   * rounded down to two decimals (`display`, for example "2.41").
   */
  readonly rating: {
    readonly numerator: number;
    readonly denominator: number;
    readonly hundredths: number;
    readonly display: string;
  };
  readonly ratingRound: number;
  readonly thresholds: {
    readonly twoStarsHundredths: number;
    readonly threeStarsHundredths: number;
  };
  readonly conditions: StarGradeConditionsV7;
}

/**
 * Section 5.3: the grade is the highest row whose conditions hold. 0 stars
 * for a defeat; 1 for a victory; 2 with the 2-star rating; 3 with the
 * 3-star rating on the hardest difficulty and, in Domination, every rival
 * eliminated by your capture; 3 and the glow for a flawless victory with at
 * least the 2-star rating, on any difficulty. Thresholds compare the exact
 * fraction (`your × 100 ≥ threshold × rival`).
 */
export function starGradeV7(inputs: StarGradeInputsV7): StarGradeV7 {
  for (const value of [
    inputs.rivals,
    inputs.yourScore,
    inputs.bestRivalPeak,
    inputs.ratingRound,
  ])
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError("grade inputs must be non-negative integers");
  // Section 5.1: a rival's peak is never 0 (every player starts with a
  // city); a 0 here (a hand-built state) is read as 1.
  const denominator = Math.max(1, inputs.bestRivalPeak);
  const numerator = inputs.yourScore;
  const thresholds = starThresholdsV7(inputs.rivals);
  const meets = (hundredths: number): boolean =>
    numerator * 100 >= hundredths * denominator;
  const twoStarRating = meets(thresholds.twoStarsHundredths);
  const threeStarRating = meets(thresholds.threeStarsHundredths);
  const domination = inputs.gameMode === "DOMINATION";
  const conditions: StarGradeConditionsV7 = {
    victory: inputs.victory,
    twoStarRating,
    threeStarRating,
    hardestDifficulty: inputs.hardestDifficulty,
    everyRivalEliminatedByYou: domination
      ? inputs.everyRivalEliminatedByYou
      : null,
    flawless: inputs.flawless,
  };
  const glow = inputs.victory && inputs.flawless && twoStarRating;
  const stars: 0 | 1 | 2 | 3 = !inputs.victory
    ? 0
    : glow ||
        (threeStarRating &&
          inputs.hardestDifficulty &&
          (!domination || inputs.everyRivalEliminatedByYou))
      ? 3
      : twoStarRating
        ? 2
        : 1;
  const hundredths = Math.floor((numerator * 100) / denominator);
  return {
    stars,
    glow,
    rating: {
      numerator,
      denominator,
      hundredths,
      display: `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`,
    },
    ratingRound: inputs.ratingRound,
    thresholds,
    conditions,
  };
}

/** Section 9.3: one player at the end of the match. */
export interface MatchSummaryPlayerV7 {
  readonly playerId: PlayerId;
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly score: PlayerScoreV7;
  readonly peakScore: number;
  readonly round30: ScoreRound30SnapshotV7 | null;
  readonly eliminatedBy: PlayerId | null;
  readonly flawless: boolean;
}

/**
 * Section 9.3: the end of a match: every player's final breakdown in rank
 * order (the Perfection ranking of section 4.2, which also orders a
 * Domination result), the grade inputs of the human seat, and its grade.
 */
export interface MatchSummaryV7 {
  readonly gameMode: GameModeV7;
  readonly endRound: number;
  readonly decidedBy: "SCORE" | "ELIMINATION";
  readonly ranking: readonly PlayerId[];
  readonly players: readonly MatchSummaryPlayerV7[];
  readonly gradeInputs: StarGradeInputsV7;
  readonly grade: StarGradeV7;
  /**
   * Section 6: whether a win may be recorded in the tribe stars (a generated
   * map, not the Showcase or a mission, and never a mirror setup).
   */
  readonly recordable: boolean;
}

/**
 * Section 5.1: the grade inputs of the human seat, from a finished match.
 * The rating moment is the end of the match if it ended at or before the
 * round end of round 30 (your final score against each rival's highest
 * peak, a rival's final score counting when higher), and otherwise the
 * stored `round30` snapshots.
 */
export function starGradeInputsV7(
  state: GameStateV7,
  scores: readonly PlayerScoreV7[] = scoresV7(state),
): StarGradeInputsV7 {
  const human = state.humanPlayerId;
  const ledger = new Map(
    state.scoreLedger.map((entry) => [entry.playerId, entry] as const),
  );
  const totals = new Map(
    scores.map((entry) => [entry.playerId, entry.total] as const),
  );
  const own = ledger.get(human);
  const snapshot = own?.round30 ?? null;
  const rivals = state.players.filter((player) => player.id !== human);
  const rivalPeak = (id: PlayerId): number => {
    const entry = ledger.get(id);
    if (snapshot !== null) return entry?.round30?.peakScore ?? 0;
    return Math.max(entry?.peakScore ?? 0, totals.get(id) ?? 0);
  };
  const outcome = state.outcome;
  return {
    gameMode: gameModeOfV7(state.setup),
    victory: outcome?.kind === "VICTORY" && outcome.winnerId === human,
    rivals: state.setup.aiCount,
    hardestDifficulty: state.setup.aiDifficulty === HARDEST_AI_DIFFICULTY_V7,
    yourScore: snapshot?.score ?? totals.get(human) ?? 0,
    bestRivalPeak: Math.max(0, ...rivals.map((player) => rivalPeak(player.id))),
    ratingRound:
      snapshot !== null
        ? PERFECTION_ROUNDS_V7
        : Math.min(state.round, PERFECTION_ROUNDS_V7),
    everyRivalEliminatedByYou: rivals.every(
      (player) =>
        player.status === "ELIMINATED" &&
        ledger.get(player.id)?.eliminatedBy === human,
    ),
    flawless: own?.flawless === true,
  };
}

/** Section 9.3: the end-of-match summary, or null while the match runs. */
export function matchSummaryV7(state: GameStateV7): MatchSummaryV7 | null {
  const outcome = state.outcome;
  if (outcome === null) return null;
  const scores = scoresV7(state);
  const byId = new Map(scores.map((entry) => [entry.playerId, entry]));
  const ledger = new Map(
    state.scoreLedger.map((entry) => [entry.playerId, entry] as const),
  );
  const ranking =
    outcome.kind !== "HEADLESS_VICTORY" && outcome.ranking !== undefined
      ? outcome.ranking
      : scoreRankingV7(state, scores);
  const gradeInputs = starGradeInputsV7(state, scores);
  return {
    gameMode: gradeInputs.gameMode,
    endRound: state.round,
    decidedBy:
      outcome.kind !== "HEADLESS_VICTORY" && outcome.decidedBy === "SCORE"
        ? "SCORE"
        : "ELIMINATION",
    ranking,
    players: ranking.map((playerId): MatchSummaryPlayerV7 => {
      const player = state.players.find((item) => item.id === playerId);
      const entry = ledger.get(playerId);
      const score = byId.get(playerId);
      if (player === undefined || score === undefined)
        throw new RangeError(`Unknown ranked player: ${playerId}`);
      return {
        playerId,
        status: player.status,
        score,
        peakScore: entry?.peakScore ?? 0,
        round30: entry?.round30 ?? null,
        eliminatedBy: entry?.eliminatedBy ?? null,
        flawless: entry?.flawless === true,
      };
    }),
    gradeInputs,
    grade: starGradeV7(gradeInputs),
    recordable:
      state.setup.mapType !== "SHOWCASE" &&
      state.setup.mapType !== "MISSION" &&
      state.setup.allowDuplicateFactions !== true,
  };
}
