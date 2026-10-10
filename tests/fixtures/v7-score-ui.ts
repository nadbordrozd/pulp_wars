import {
  createPlayableGameV7,
  factionTreeV7,
  scoreRankingV7,
  scoresV7,
  type FactionIdV7,
  type GameModeV7,
  type GameStateV7,
  type PlayerId,
  type ScoreLedgerEntryV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { browserSetupV7, checkedV7 } from "./v7-builders";

/**
 * Score and modes, UI fixtures (`pulp_wars-kaw6.3`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 8): hand-built states
 * of a four-seat generated board (seed 4127: the human Humans at seat 0,
 * then Undead, Goblin, and Dinosaur) with each seat's technologies,
 * achievements, city levels, and score ledger set by hand so the
 * leaderboard and the end of match show different scores, a capped
 * penalty, and every factor. No command is played and no match is run.
 * Used by the DOM and presentation tests and by
 * scripts/browser-score-review-v7.ts.
 */
export const SCORE_UI_SEED_V7 = 4127;

interface SeatPlanV7 {
  readonly techs: number;
  readonly achievements: number;
  readonly capitalLevel: number;
  readonly ledger: Pick<
    ScoreLedgerEntryV7,
    "killValue" | "lossValue" | "hpLost" | "flawless"
  >;
}

/**
 * Per seat: the human leads; the Undead fought hard and lost much (its
 * penalty is capped at half its points); the Goblins are close behind the
 * human; the Dinosaurs never fought.
 */
const SEAT_PLANS_V7: readonly SeatPlanV7[] = [
  {
    techs: 9,
    achievements: 2,
    capitalLevel: 4,
    ledger: { killValue: 14, lossValue: 4, hpLost: 23, flawless: false },
  },
  {
    techs: 2,
    achievements: 0,
    capitalLevel: 2,
    ledger: { killValue: 2, lossValue: 30, hpLost: 61, flawless: false },
  },
  {
    techs: 7,
    achievements: 1,
    capitalLevel: 4,
    ledger: { killValue: 10, lossValue: 8, hpLost: 34, flawless: false },
  },
  {
    techs: 5,
    achievements: 1,
    capitalLevel: 3,
    ledger: { killValue: 0, lossValue: 0, hpLost: 0, flawless: true },
  },
];

const LEVEL_REWARDS_V7 = [
  { reachedLevel: 2, reward: "STOCKPILE" },
  { reachedLevel: 3, reward: "WALLS" },
  { reachedLevel: 4, reward: "BOOM" },
] as const;

/** The first `count` technologies of the faction's tree that can be held. */
function researchableTechsV7(
  faction: FactionIdV7,
  count: number,
): readonly TechnologyIdV7[] {
  const held: TechnologyIdV7[] = [];
  const nodes = factionTreeV7(faction).nodes;
  while (held.length < count) {
    const next = nodes.find(
      (node) =>
        !held.includes(node.id) &&
        node.prerequisites.every((prerequisite) => held.includes(prerequisite)),
    );
    if (next === undefined) break;
    held.push(next.id);
  }
  return held;
}

/** The mid-match scene: round `round`, the human's turn. */
export function scoreUiStateV7(
  gameMode: GameModeV7 = "DOMINATION",
  round = 12,
  aiMode: "RIVAL" | "COOPERATIVE" = "RIVAL",
): GameStateV7 {
  const created = createPlayableGameV7({
    ...browserSetupV7(SCORE_UI_SEED_V7, 3),
    gameMode,
    aiMode,
  });
  if (!created.ok) throw new Error("score UI fixture setup failed");
  const base = created.state;
  const planOf = (id: PlayerId): SeatPlanV7 => {
    const seat = base.players.find((player) => player.id === id)?.seat ?? 0;
    const plan = SEAT_PLANS_V7[seat];
    if (plan === undefined) throw new Error("score UI fixture seat missing");
    return plan;
  };
  // Each level's growth is held as permanent Hunt population, one per
  // territory tile of the city (a level-4 city's nine tiles hold its 9).
  const growth = (level: number): number => (level * (level + 1)) / 2 - 1;
  const contributions = base.cities.flatMap((city) =>
    base.board.tiles
      .filter((tile) => tile.territoryCityId === city.id)
      .slice(0, growth(planOf(city.ownerId).capitalLevel))
      .map((tile) => ({ cityId: city.id, at: tile.at })),
  );
  const state: GameStateV7 = {
    ...base,
    round,
    nextEntityId: base.nextEntityId + contributions.length,
    populationContributions: [
      ...base.populationContributions,
      ...contributions.map((entry, index) => ({
        id: base.nextEntityId + index,
        cityId: entry.cityId,
        category: "PERMANENT" as const,
        amount: 1,
        source: {
          kind: "RESOURCE_ACTION" as const,
          action: "HUNT_GAME" as const,
          at: entry.at,
        },
      })),
    ],
    activeSeatIndex: base.turnOrder.indexOf(base.humanPlayerId),
    players: base.players.map((player) => {
      const plan = planOf(player.id);
      return {
        ...player,
        researchedTechs: researchableTechsV7(player.faction, plan.techs),
        achievementEntitlements: player.achievementEntitlements.map(
          (entry, index) =>
            index < plan.achievements ? { ...entry, unlocked: true } : entry,
        ),
      };
    }),
    cities: base.cities.map((city) => {
      const level = planOf(city.ownerId).capitalLevel;
      return {
        ...city,
        level,
        // The growth a level took (`level × (level + 1) / 2 − 1`), and one
        // record per reward level, as the parser asks.
        population: 0,
        permanentPopulation: growth(level),
        economicPopulation: 0,
        rewards: LEVEL_REWARDS_V7.filter(
          (record) => record.reachedLevel <= level,
        ),
        cityActionAvailable: city.ownerId === base.humanPlayerId,
      };
    }),
    scoreLedger: base.scoreLedger.map((entry) => ({
      ...entry,
      ...planOf(entry.playerId).ledger,
    })),
  };
  return withPeaksV7(checkedV7(state));
}

/** Every peak at least the current score (a past round end's total). */
function withPeaksV7(state: GameStateV7, extra = 6): GameStateV7 {
  const totals = new Map(
    scoresV7(state).map((entry) => [entry.playerId, entry.total] as const),
  );
  return checkedV7({
    ...state,
    scoreLedger: state.scoreLedger.map((entry) => ({
      ...entry,
      peakScore: (totals.get(entry.playerId) ?? 0) + extra,
    })),
  });
}

/**
 * A Domination victory at round 18: every rival's capital was taken by the
 * human (each rival eliminated by the human), so the grade can reach 3
 * stars when the rating allows. `flawless` clears the human's losses (it
 * lost no unit and no city, section 5.4): 3 stars and the glow.
 */
export function scoreDominationVictoryV7(flawless = false): GameStateV7 {
  const live = scoreUiStateV7("DOMINATION", 18);
  const human = live.humanPlayerId;
  const state: GameStateV7 = {
    ...live,
    players: live.players.map((player) =>
      player.id === human ? player : { ...player, status: "ELIMINATED" },
    ),
    cities: live.cities.map((city) => ({ ...city, ownerId: human })),
    units: live.units.filter((unit) => unit.ownerId === human),
    scoreLedger: live.scoreLedger.map((entry, index) =>
      entry.playerId === human
        ? flawless
          ? { ...entry, lossValue: 0, flawless: true }
          : entry
        : { ...entry, eliminatedBy: human, eliminatedAt: 100 + index },
    ),
    outcome: { kind: "VICTORY", winnerId: human },
  };
  return checkedV7(state);
}

/**
 * A Perfection match decided by score after round 30. `humanWins` keeps the
 * human first; otherwise the Goblin seat outscores it (the human is second).
 */
export function scorePerfectionEndV7(humanWins: boolean): GameStateV7 {
  let live = scoreUiStateV7("PERFECTION", 30);
  if (!humanWins) {
    const goblin = live.players.find((player) => player.faction === "GOBLIN");
    if (goblin === undefined) throw new Error("score UI fixture goblin");
    live = withPeaksV7({
      ...live,
      players: live.players.map((player) =>
        player.id === goblin.id
          ? {
              ...player,
              achievementEntitlements: player.achievementEntitlements.map(
                (entry, index) =>
                  index < 4 ? { ...entry, unlocked: true } : entry,
              ),
            }
          : player,
      ),
    });
  }
  const scores = scoresV7(live);
  const ranking = scoreRankingV7(live, scores);
  const human = live.humanPlayerId;
  const first = ranking[0];
  if (first === undefined) throw new Error("score UI fixture ranking");
  const totals = new Map(
    scores.map((entry) => [entry.playerId, entry.total] as const),
  );
  const state: GameStateV7 = {
    ...live,
    scoreLedger: live.scoreLedger.map((entry) => ({
      ...entry,
      round30: {
        score: totals.get(entry.playerId) ?? 0,
        peakScore: entry.peakScore,
      },
    })),
    outcome:
      first === human
        ? { kind: "VICTORY", winnerId: human, decidedBy: "SCORE", ranking }
        : {
            kind: "DEFEAT",
            humanId: human,
            defeatedByPlayerId: first,
            decidedBy: "SCORE",
            ranking,
          },
  };
  return checkedV7(state);
}

/** The browser review's scenes (zero-argument, for the fixture mount). */
export const scoreDominationLiveFixtureV7 = (): GameStateV7 =>
  scoreUiStateV7("DOMINATION", 12);
export const scoreDominationVictoryFixtureV7 = (): GameStateV7 =>
  scoreDominationVictoryV7(false);
export const scoreFlawlessVictoryFixtureV7 = (): GameStateV7 =>
  scoreDominationVictoryV7(true);
export const scorePerfectionLiveFixtureV7 = (): GameStateV7 =>
  scoreUiStateV7("PERFECTION", 12);
/** The same scenes with the AIs allied (`pulp_wars-2yc.45`). */
export const scoreDominationAlliedFixtureV7 = (): GameStateV7 =>
  scoreUiStateV7("DOMINATION", 12, "COOPERATIVE");
export const scorePerfectionAlliedFixtureV7 = (): GameStateV7 =>
  scoreUiStateV7("PERFECTION", 12, "COOPERATIVE");
export const scorePerfectionVictoryFixtureV7 = (): GameStateV7 =>
  scorePerfectionEndV7(true);
export const scorePerfectionDefeatFixtureV7 = (): GameStateV7 =>
  scorePerfectionEndV7(false);
