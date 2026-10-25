import type { PlayerId } from "../model/ids";
import { matchDifficultyV7 } from "./difficulty";
import { gameKindOfV7 } from "./game-kind";
import { scoreRankingV7, scoresV7, type PlayerScoreV7 } from "./score";
import {
  PERFECTION_ROUNDS_V7,
  gameModeOfV7,
  type DifficultyV7,
  type GameKindV7,
  type GameModeV7,
  type GameStateV7,
  type ScoreRound30SnapshotV7,
} from "./types";

/**
 * Skirmish stars (docs/product/RULESET_7_SCORE_AND_STARS.md section 5,
 * `pulp_wars-2yc.69`; to be tuned): a win earns stars by the difficulty and
 * the score. The difficulty caps the stars (`maxStars`); the score at the
 * rating moment, against two fixed thresholds that grow with the board's
 * land, earns the stars up to the cap.
 *
 * Back of the envelope (section 5.2): a decent win by about round 25 on a
 * quick-start board scores about `300 + 3.3 × land`. The board part (city
 * levels and territory) is about 40 points per city at the end, one city
 * per 12 land tiles, so about 3.3 per land tile; the rest (technology
 * about 160, achievements 80, army 45, kills 70, less about 50 of losses
 * and damage) is about 300 whatever the board. So 3 stars ask for about
 * that decent win (`300 + 3 × land`: 570 on Continents 14 x 14, 687 on
 * Pangea 14 x 14) and 2 stars for about two thirds of it (`200 + 2 ×
 * land`: 380 and 458), a scrappy win staying at 1.
 */
export const SKIRMISH_STARS_V7 = Object.freeze({
  /**
   * The most stars a win can earn on each difficulty. Easy
   * (`pulp_wars-q6cc`): half of Normal's, rounded down, but at least the
   * win's star, so 1; and an Easy win never glows.
   */
  maxStars: Object.freeze({
    EASY: 1,
    NORMAL: 1,
    HARD: 2,
    HARDER: 2,
    BRUTAL: 3,
  }) satisfies Readonly<Record<DifficultyV7, 1 | 2 | 3>>,
  /** The score for the second star: `base + perLandTile × land`. */
  twoStars: Object.freeze({ base: 200, perLandTile: 2 }),
  /** The score for the third star: `base + perLandTile × land`. */
  threeStars: Object.freeze({ base: 300, perLandTile: 3 }),
} as const);

/** The scores for the second and third stars on a board with this land. */
export function skirmishStarThresholdsV7(landTiles: number): {
  readonly twoStars: number;
  readonly threeStars: number;
} {
  const { twoStars, threeStars } = SKIRMISH_STARS_V7;
  return {
    twoStars: twoStars.base + twoStars.perLandTile * landTiles,
    threeStars: threeStars.base + threeStars.perLandTile * landTiles,
  };
}

/**
 * The inputs of the grade (section 5): computed by the engine from the
 * state at the end of the match ({@link starGradeInputsV7}); the grade
 * itself is the pure {@link starGradeV7}.
 */
export interface StarGradeInputsV7 {
  readonly gameMode: GameModeV7;
  /**
   * The human won (`VICTORY` for the human seat): every rival eliminated in
   * Domination, the highest score in Perfection.
   */
  readonly victory: boolean;
  /** `aiCount` at setup. */
  readonly rivals: number;
  /** The difficulty, read back from the setup's head start. */
  readonly difficulty: DifficultyV7;
  /** The board's land tiles (every tile that is not water). */
  readonly landTiles: number;
  /** The human's score at the rating moment (section 5.1). */
  readonly yourScore: number;
  /**
   * The highest rival peak at the rating moment. It earns no star; the
   * ratio is kept for the tribe records' `bestRating` (section 6).
   */
  readonly bestRivalPeak: number;
  /** The round of the rating moment (at most `PERFECTION_ROUNDS_V7`). */
  readonly ratingRound: number;
  /** The human lost no unit and no city (section 5.4). */
  readonly flawless: boolean;
}

/** One condition of the grade, met or missed (section 8 shows them). */
export interface StarGradeConditionsV7 {
  readonly victory: boolean;
  /** The score reached the 2-star threshold (whatever the difficulty). */
  readonly twoStarScore: boolean;
  /** The score reached the 3-star threshold (whatever the difficulty). */
  readonly threeStarScore: boolean;
  readonly flawless: boolean;
}

/** Section 5: the grade of a finished match for the human seat. */
export interface StarGradeV7 {
  readonly stars: 0 | 1 | 2 | 3;
  /**
   * The hidden glow: a flawless win with at least the 2-star score, on any
   * difficulty but Easy (`pulp_wars-q6cc`). It adds no star.
   */
  readonly glow: boolean;
  readonly difficulty: DifficultyV7;
  /** The most stars a win can earn on this difficulty. */
  readonly maxStars: 1 | 2 | 3;
  /** The human's score at the rating moment, the number the grade reads. */
  readonly score: number;
  /** The scores for the second and third stars on this board. */
  readonly thresholds: {
    readonly twoStars: number;
    readonly threeStars: number;
  };
  /**
   * The ratio `yourScore ÷ bestRivalPeak` as an exact fraction, and
   * rounded down to two decimals (`display`, for example "2.41"). It earns
   * nothing; the tribe records keep the best one (section 6).
   */
  readonly rating: {
    readonly numerator: number;
    readonly denominator: number;
    readonly hundredths: number;
    readonly display: string;
  };
  readonly ratingRound: number;
  readonly conditions: StarGradeConditionsV7;
}

/**
 * Section 5.3: 0 stars without a win; a win earns 1 star, a second with
 * the 2-star score and a third with the 3-star score, never more than the
 * difficulty allows (Easy and Normal 1, Hard and Harder 2, Brutal 3). The
 * glow is a flawless win with at least the 2-star score, on any difficulty
 * but Easy.
 */
export function starGradeV7(inputs: StarGradeInputsV7): StarGradeV7 {
  for (const value of [
    inputs.rivals,
    inputs.landTiles,
    inputs.yourScore,
    inputs.bestRivalPeak,
    inputs.ratingRound,
  ])
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError("grade inputs must be non-negative integers");
  const maxStars = SKIRMISH_STARS_V7.maxStars[inputs.difficulty];
  const thresholds = skirmishStarThresholdsV7(inputs.landTiles);
  const score = inputs.yourScore;
  const twoStarScore = score >= thresholds.twoStars;
  const threeStarScore = score >= thresholds.threeStars;
  const earned: 1 | 2 | 3 = threeStarScore ? 3 : twoStarScore ? 2 : 1;
  const stars: 0 | 1 | 2 | 3 = !inputs.victory
    ? 0
    : (Math.min(earned, maxStars) as 1 | 2 | 3);
  const glow =
    inputs.victory &&
    inputs.flawless &&
    twoStarScore &&
    inputs.difficulty !== "EASY";
  // A rival's peak is never 0 (every player starts with a city); a 0 here
  // (a hand-built state) is read as 1.
  const denominator = Math.max(1, inputs.bestRivalPeak);
  const hundredths = Math.floor((score * 100) / denominator);
  return {
    stars,
    glow,
    difficulty: inputs.difficulty,
    maxStars,
    score,
    thresholds,
    rating: {
      numerator: score,
      denominator,
      hundredths,
      display: `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`,
    },
    ratingRound: inputs.ratingRound,
    conditions: {
      victory: inputs.victory,
      twoStarScore,
      threeStarScore,
      flawless: inputs.flawless,
    },
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
   * Section 5.8 (`pulp_wars-2yc.103`): a regular or a custom game
   * (`gameKindOfV7`). A custom game earns no stars.
   */
  readonly gameKind: GameKindV7;
  /**
   * Section 6: whether a win may be recorded in the tribe stars: a regular
   * game (section 5.8), so a generated map, not the Showcase or a mission,
   * and never a mirror setup.
   */
  readonly recordable: boolean;
}

/**
 * Section 5.1: the grade inputs of the human seat, from a finished match.
 * The rating moment is the end of the match if it ended at or before the
 * round end of round 30 (your final score, and each rival's highest peak, a
 * rival's final score counting when higher), and otherwise the stored
 * `round30` snapshots. The difficulty is read back from the setup's head
 * start ({@link matchDifficultyV7}) and the land counted on the board.
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
    difficulty: matchDifficultyV7(state.setup),
    landTiles: state.board.tiles.filter(
      (tile) =>
        tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER",
    ).length,
    yourScore: snapshot?.score ?? totals.get(human) ?? 0,
    bestRivalPeak: Math.max(0, ...rivals.map((player) => rivalPeak(player.id))),
    ratingRound:
      snapshot !== null
        ? PERFECTION_ROUNDS_V7
        : Math.min(state.round, PERFECTION_ROUNDS_V7),
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
  const gameKind = gameKindOfV7(state.setup);
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
    gameKind,
    recordable:
      gameKind === "REGULAR" &&
      state.setup.mapType !== "SHOWCASE" &&
      state.setup.mapType !== "MISSION" &&
      state.setup.allowDuplicateFactions !== true,
  };
}
