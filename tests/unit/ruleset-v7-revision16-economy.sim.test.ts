// Whole-game simulations split out of
// ruleset-v7-revision16-economy.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  CITY_LEVEL_INCOME_CAP_V7,
  MARKET_INCOME_CAP_V7,
  applyCommandV7,
  createPlayableGameV7,
  playerIncomeV7,
  viewForV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { cityIncomeForViewerV7 } from "../../src/render/dom/app-view-v7";
import { setupV7 } from "../fixtures/v7-builders";

// Revision 16c (`pulp_wars-4gc`): the numeric economy deflation of
// docs/product/RULESET_7_REVISION_16.md section 6.2 (tier-2/3 research cost
// slopes, level income term capped at 4, Market capped at 3), tested as
// section 10.3 requires.

describe("ruleset-7 revision-16 income previews", () => {
  it("previews equal Start Turn income in natural play with capped levels and Markets", () => {
    // pulp_wars-w49.3: an 11 x 11 Pangea duel of 30 rounds (a few seconds)
    // replaces the 20 x 20 duel of 40 rounds, which took minutes. With
    // tuning 3 seed 7 runs to the round cap with a city above the income
    // cap from round 23 and a Market at its cap from round 18 (of seeds
    // 0-12, seeds 1, 5, 9, and 11 also do; seed 2, used at tuning 1, now
    // ends in round 27). With tuning 4 seed 7 has a capped Market and no
    // capped city; seed 2 runs to the round cap with a city above the
    // income cap from round 20 and a Market at its cap from round 16 (of
    // seeds 0-12, seeds 9 and 12 also do). With tuning 5
    // (`pulp_wars-w49.4`) two Human seats play the Normal AI's army play
    // and none of seeds 0-12 reaches both caps (most matches end before
    // round 28), so the match is Humans against Dinosaurs, which plays the
    // older policy: seed 7 runs to the round cap with a city above the
    // income cap from round 28 and a Market at its cap from round 26 (of
    // seeds 0-9, seed 9 also does). With the Dinosaur pass
    // (`pulp_wars-w49.15`) a Dinosaur seat plays the army rules too, and
    // that match ends before the round cap; the match is Humans against
    // Candy, which plays the older policy: of seeds 0-12, seeds 1 and 11
    // run to the round cap with a city above the income cap and a Market
    // at its cap (so do seed 5 against Dwarves and seeds 0, 1, and 5
    // against Ice Folk). The scan read only those three facts.
    // With the Industry reshuffle (`pulp_wars-w49.21`, 7r56: the defender
    // of every faction one technology later) every match of seeds 0-12
    // against Candy and against Ice Folk ends before the round cap; the
    // match is Humans against Dwarves, seed 8 (of seeds 0-12, seeds 4 and
    // 12 also run to the cap with both facts). With step two of the Dwarf
    // pass (`pulp_wars-w49.28`) a Dwarf seat plays the army rules and no
    // match of seeds 0-12 against Dwarves has a Market at its cap; the
    // match is Humans against Candy again, seed 8 (of seeds 0-12, seed 11
    // also runs to the cap with both facts).
    const setup: MatchSetupV7 = {
      ...setupV7(8, 1),
      width: 11,
      height: 11,
      mapType: "PANGEA",
      factions: ["ORIGINAL", "CANDY"],
    };
    const match = runAiMatchV7(setup, { maxRounds: 30, maxCommands: 30_000 });
    expect(match.errors).toEqual([]);
    expect(match.termination).toBe("ROUND_CAP");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let checkedEndTurns = 0;
    let cappedCityTurns = 0;
    let cappedMarketTurns = 0;
    let comparedAwards = 0;
    const uiIncome = (at: GameStateV7, playerId: PlayerId) => {
      const view = viewForV7(at, playerId);
      return at.cities
        .filter((city) => city.ownerId === playerId)
        .reduce(
          (total, city) => total + (cityIncomeForViewerV7(view, city.id) ?? 0),
          0,
        );
    };
    for (const record of match.commandLog) {
      if (record.command.kind === "END_TURN") {
        const view = viewForV7(state, record.playerId);
        const owned = state.cities.filter(
          (city) => city.ownerId === record.playerId,
        );
        // The DOM projection equals the engine's income for the same state.
        expect(uiIncome(state, record.playerId), `round ${state.round}`).toBe(
          playerIncomeV7(state, record.playerId).totalCoins,
        );
        checkedEndTurns += 1;
        cappedCityTurns += owned.filter(
          (city) => city.level > CITY_LEVEL_INCOME_CAP_V7,
        ).length;
        cappedMarketTurns += view.improvementValues.filter(
          (value) =>
            value.improvement === "MARKET" &&
            value.level === MARKET_INCOME_CAP_V7,
        ).length;
      }
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events as readonly DomainEventV7[]) {
        if (event.kind === "INCOME_PREVIEWED")
          expect(event.totalCoins).toBe(
            playerIncomeV7(state, event.playerId).totalCoins,
          );
        // The income the next player saw projected just before its turn
        // started is the income its Start Turn awards.
        if (event.kind === "INCOME_AWARDED") {
          expect(event.totalCoins, `round ${state.round}`).toBe(
            uiIncome(state, event.playerId),
          );
          comparedAwards += 1;
        }
      }
      state = result.state;
    }
    expect(checkedEndTurns).toBeGreaterThan(40);
    expect(comparedAwards).toBeGreaterThan(40);
    // The match exercises both caps.
    expect(cappedCityTurns).toBeGreaterThan(0);
    expect(cappedMarketTurns).toBeGreaterThan(0);
  }, 120_000);
});
