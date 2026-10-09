import type { PlayerId } from "../model/ids";
import type { PlayerScoreV7 } from "./score";
import type {
  MatchSummaryV7,
  StarGradeInputsV7,
  StarGradeV7,
} from "./star-grade";
import type { FactionIdV7, GameModeV7 } from "./types";
import type { PlayerViewV7 } from "./view";

/**
 * Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section 9.3):
 * the public score query the UI reads. It reads only the view.
 */
export interface ScoreQueryV7 {
  readonly gameMode: GameModeV7;
  readonly round: number;
  /** `PERFECTION_ROUNDS_V7` in Perfection ("Round 23 of 30"), else null. */
  readonly roundLimit: number | null;
  readonly roundsLeft: number | null;
  /** Every player's total and peak, in leaderboard (turn) order. */
  readonly totals: readonly {
    readonly playerId: PlayerId;
    readonly isViewer: boolean;
    readonly status: "ACTIVE" | "ELIMINATED";
    readonly score: number;
    readonly peakScore: number;
  }[];
  /** The viewer's own breakdown. */
  readonly own: PlayerScoreV7 | null;
  /** The breakdowns the viewer may see: its own, every player's at the end. */
  readonly breakdowns: readonly PlayerScoreV7[];
  readonly summary: MatchSummaryV7 | null;
}

export function queryScoreV7(view: PlayerViewV7): ScoreQueryV7 {
  const peaks = new Map(
    view.score.peaks.map((entry) => [entry.playerId, entry.peakScore]),
  );
  return {
    gameMode: view.score.gameMode,
    round: view.round,
    roundLimit: view.score.roundLimit,
    roundsLeft: view.score.roundsLeft,
    totals: view.leaderboard.map((entry) => ({
      playerId: entry.playerId,
      isViewer: entry.isViewer,
      status: entry.status,
      score: entry.score,
      peakScore: peaks.get(entry.playerId) ?? 0,
    })),
    own:
      view.score.breakdowns.find(
        (entry) => entry.playerId === view.viewer.id,
      ) ?? null,
    breakdowns: view.score.breakdowns,
    summary: view.score.summary,
  };
}

/**
 * Section 9.3: the human seat's grade once the match is over (null while
 * it runs): stars, glow, the rating as an exact fraction and to two
 * decimals, the rating round, the thresholds, each condition, the inputs,
 * and what the tribe records need (the human's faction, the mode, and
 * whether the setup may record at all, section 6).
 */
export interface StarGradeQueryV7 {
  readonly gameMode: GameModeV7;
  readonly faction: FactionIdV7;
  readonly recordable: boolean;
  readonly inputs: StarGradeInputsV7;
  readonly grade: StarGradeV7;
}

export function queryStarGradeV7(view: PlayerViewV7): StarGradeQueryV7 | null {
  const summary = view.score.summary;
  if (summary === null) return null;
  const human = view.players.find((player) => player.id === view.humanPlayerId);
  if (human === undefined) return null;
  return {
    gameMode: summary.gameMode,
    faction: human.faction,
    recordable: summary.recordable,
    inputs: summary.gradeInputs,
    grade: summary.grade,
  };
}
