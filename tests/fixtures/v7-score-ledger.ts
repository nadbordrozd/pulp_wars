import { expect } from "vitest";
import { scoresV7, type GameStateV7 } from "../../src/engine/index";

/**
 * Score and modes (`pulp_wars-kaw6.2`, docs/product/RULESET_7_SCORE_AND_STARS.md
 * section 3.3): the `scoreLedger` of a new match: zero counters, flawless,
 * nobody eliminated, no round-30 snapshot, and the starting score as each
 * player's peak (`exactPeak`: the score of `state` itself, true for an
 * initial map state; after the first Start Turn the peak is still the map
 * state's score, so only its sign is checked). Pins of initial states leave
 * the ledger out after this check, so the score changed no pinned board.
 */
export function expectInitialScoreLedgerV7(
  state: GameStateV7,
  ledger: GameStateV7["scoreLedger"] = state.scoreLedger,
  exactPeak = true,
): void {
  const scores = scoresV7({ ...state, scoreLedger: ledger });
  expect(
    ledger.map((entry) => ({
      ...entry,
      peakScore: exactPeak ? entry.peakScore : entry.peakScore > 0,
    })),
  ).toEqual(
    state.players.map((player, index) => ({
      playerId: player.id,
      killValue: 0,
      lossValue: 0,
      hpLost: 0,
      flawless: true,
      eliminatedBy: null,
      eliminatedAt: null,
      peakScore: exactPeak ? scores[index]?.total : true,
      round30: null,
    })),
  );
}
