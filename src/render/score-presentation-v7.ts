import {
  PERFECTION_ROUNDS_V7,
  SCORE_ACHIEVEMENT_POINTS_V7,
  SCORE_ARMY_POINTS_PER_COIN_V7,
  SCORE_CITY_LEVEL_POINTS_V7,
  SCORE_HP_PER_DAMAGE_POINT_V7,
  SCORE_KILL_POINTS_PER_COIN_V7,
  SCORE_TECH_TIER_POINTS_V7,
  SCORE_TERRITORY_POINTS_V7,
  type GameModeV7,
  type PlayerId,
  type ScoreBreakdownV7,
  type ScoreQueryV7,
  type StarGradeV7,
} from "../engine/index";

/**
 * Score and modes, the leaderboard and end of match (`pulp_wars-kaw6.3`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 8): the words and the
 * order the DOM shows, read from the public score query only. The score is
 * shown in every mode; only Perfection is decided by it.
 */

export type ScoreLineKeyV7 =
  | "territory"
  | "cities"
  | "technology"
  | "achievements"
  | "army"
  | "kills"
  | "losses"
  | "damage"
  | "cap"
  | "total";

/** One line of a breakdown: a plain-language factor, its count, its points. */
export interface ScoreLineV7 {
  readonly key: ScoreLineKeyV7;
  readonly label: string;
  /** How the points were counted ("9 tiles × 2"). */
  readonly detail: string;
  /** Signed points (negative for Losses and Damage taken). */
  readonly points: number;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function coins(count: number): string {
  return plural(count, "Coin", "Coins");
}

/**
 * Section 3.1, one line per factor in the order of the table (the six
 * positive factors, then the two penalties), the cap when it gave points
 * back, and the score. Every factor is listed, a zero one too, so the
 * breakdown always explains the whole formula.
 */
export function scoreBreakdownLinesV7(
  score: ScoreBreakdownV7,
): readonly ScoreLineV7[] {
  const lines: ScoreLineV7[] = [
    {
      key: "territory",
      label: "Territory",
      detail: `${plural(score.territory.count, "tile", "tiles")} × ${SCORE_TERRITORY_POINTS_V7}`,
      points: score.territory.points,
    },
    {
      key: "cities",
      label: "City levels",
      detail: `${plural(score.cities.count, "level", "levels")} × ${SCORE_CITY_LEVEL_POINTS_V7}`,
      points: score.cities.points,
    },
    {
      key: "technology",
      label: "Technology",
      detail: `${plural(score.technology.count, "tier", "tiers")} researched × ${SCORE_TECH_TIER_POINTS_V7}`,
      points: score.technology.points,
    },
    {
      key: "achievements",
      label: "Achievements",
      detail: `${score.achievements.count} × ${SCORE_ACHIEVEMENT_POINTS_V7}`,
      points: score.achievements.points,
    },
    {
      key: "army",
      label: "Army",
      detail:
        SCORE_ARMY_POINTS_PER_COIN_V7 === 1
          ? `units worth ${coins(score.army.count)}`
          : `units worth ${coins(score.army.count)} × ${SCORE_ARMY_POINTS_PER_COIN_V7}`,
      points: score.army.points,
    },
    {
      key: "kills",
      label: "Kills",
      detail: `enemy units worth ${coins(score.kills.count)} × ${SCORE_KILL_POINTS_PER_COIN_V7}`,
      points: score.kills.points,
    },
    {
      key: "losses",
      label: "Losses",
      detail: `your units worth ${coins(score.losses.count)} died`,
      points: score.losses.points,
    },
    {
      key: "damage",
      label: "Damage taken",
      detail: `${score.damage.count} HP lost, −1 per ${SCORE_HP_PER_DAMAGE_POINT_V7}`,
      points: score.damage.points,
    },
  ];
  if (score.capReturned > 0)
    lines.push({
      key: "cap",
      label: "Penalty cap",
      detail: "losses and damage take at most half",
      points: score.capReturned,
    });
  lines.push({
    key: "total",
    label: "Score",
    detail: "",
    points: score.total,
  });
  return lines;
}

/** "+46", "−4" (a true minus sign), "0". */
export function signedPointsV7(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${Math.abs(points)}`;
  return "0";
}

/** "1 point", "312 points". */
export function pointsLabelV7(points: number): string {
  return plural(points, "point", "points");
}

/**
 * Section 4.2: the round in Perfection, "Round 12 of 30" (null in
 * Domination, where the HUD keeps "Turn 12").
 */
export function scoreRoundLabelV7(
  score: Pick<ScoreQueryV7, "round" | "roundLimit">,
): string | null {
  if (score.roundLimit === null) return null;
  return `Round ${Math.min(score.round, score.roundLimit)} of ${score.roundLimit}`;
}

/** The rounds still to play after this one: "18 rounds left", "Final round". */
export function roundsLeftLabelV7(
  score: Pick<ScoreQueryV7, "roundsLeft">,
): string | null {
  if (score.roundsLeft === null) return null;
  if (score.roundsLeft === 0) return "Final round";
  return `${plural(score.roundsLeft, "round", "rounds")} left`;
}

/**
 * The leaderboard's lede (sections 4.2 and 8). Domination names the goal
 * first: the score only sums up how each side is doing.
 */
export function scoreLedeV7(gameMode: GameModeV7): string {
  return gameMode === "PERFECTION"
    ? `Highest score after round ${PERFECTION_ROUNDS_V7} wins.`
    : "Capture every enemy city to win. The score sums up how each side is doing.";
}

/**
 * The leaderboard order. Domination keeps the turn order of the view;
 * Perfection ranks by score as section 4.2 does (players still in the
 * match first, more points, then more cities, then the turn order;
 * eliminated players after them), so the row numbers are the standings.
 * Territory, the ranking's second tie-break, is not public, so a tie the
 * score and the cities do not break keeps the turn order.
 */
export function leaderboardOrderV7<
  T extends {
    readonly playerId: PlayerId;
    readonly status: "ACTIVE" | "ELIMINATED";
    readonly score: number;
    readonly cityCount: number;
  },
>(gameMode: GameModeV7, entries: readonly T[]): readonly T[] {
  if (gameMode !== "PERFECTION") return entries;
  const place = new Map(entries.map((entry, index) => [entry.playerId, index]));
  return [...entries].sort(
    (left, right) =>
      Number(left.status === "ELIMINATED") -
        Number(right.status === "ELIMINATED") ||
      (left.status === "ELIMINATED"
        ? 0
        : right.score - left.score || right.cityCount - left.cityCount) ||
      (place.get(left.playerId) ?? 0) - (place.get(right.playerId) ?? 0),
  );
}

/** A rating threshold in hundredths as the screen shows it: "1.50". */
export function ratingThresholdV7(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** Section 8: "×1.83 the best rival's score". */
export function ratingTextV7(grade: Pick<StarGradeV7, "rating">): string {
  return `×${grade.rating.display} the best rival's score`;
}

/** "2 of 3 stars", with ", flawless" for the glow. */
export function starsLabelV7(
  grade: Pick<StarGradeV7, "stars" | "glow">,
): string {
  return `${grade.stars} of 3 stars${grade.glow ? ", flawless" : ""}`;
}

/** One condition of the grade on the end screen, met or missed. */
export interface GradeConditionLineV7 {
  readonly key:
    "win" | "two" | "three" | "conquest" | "difficulty" | "flawless";
  /** The stars the condition belongs to. */
  readonly stars: 1 | 2 | 3;
  readonly text: string;
  readonly met: boolean;
}

/**
 * Section 8: the conditions met and missed, star by star. The hardest
 * difficulty is listed only when it was missed (Normal is the only, and so
 * the hardest, difficulty today, section 5.5), and the flawless glow only
 * when earned (nothing explains it before, section 7).
 */
export function gradeConditionLinesV7(
  grade: StarGradeV7,
): readonly GradeConditionLineV7[] {
  const two = ratingThresholdV7(grade.thresholds.twoStarsHundredths);
  const three = ratingThresholdV7(grade.thresholds.threeStarsHundredths);
  const lines: GradeConditionLineV7[] = [
    { key: "win", stars: 1, text: "Win", met: grade.conditions.victory },
    {
      key: "two",
      stars: 2,
      text: `Score ${two} times the best rival's`,
      met: grade.conditions.twoStarRating,
    },
    {
      key: "three",
      stars: 3,
      text: `Score ${three} times the best rival's`,
      met: grade.conditions.threeStarRating,
    },
  ];
  if (grade.conditions.everyRivalEliminatedByYou !== null)
    lines.push({
      key: "conquest",
      stars: 3,
      text: "Take every rival's last city yourself",
      met: grade.conditions.everyRivalEliminatedByYou,
    });
  if (!grade.conditions.hardestDifficulty)
    lines.push({
      key: "difficulty",
      stars: 3,
      text: "Play on the hardest difficulty",
      met: false,
    });
  if (grade.glow)
    lines.push({
      key: "flawless",
      stars: 3,
      text: "Flawless: you lost no unit and no city",
      met: true,
    });
  return lines;
}
