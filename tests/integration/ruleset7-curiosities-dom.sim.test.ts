// @vitest-environment jsdom

// Whole-game simulations split out of
// ruleset7-curiosities-dom.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { beforeEach, describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  RULESET_7_ID,
  createPlayableGameV7,
  type MatchSetupV7,
} from "../../src/engine/index";

/**
 * Map curiosities (`pulp_wars-737.2`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 3): the setup screen's
 * "Curiosities" checkbox. It is checked by default, hidden while the
 * Showcase is the map (which launches with `curiosities: false`), and its
 * value is the launched setup's `curiosities` (the board, the dock and Help:
 * ruleset7-curiosities-ui-dom.test.ts). The Giant Spider (`pulp_wars-737.3`):
 * the browser controller plays Normal rounds with its neutral turns.
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 Giant Spider in the browser controller (pulp_wars-737.3)", () => {
  it("plays Normal rounds of a match with a Spider, its neutral turns included", async () => {
    // 16 x 16 Dry Land seed 8 with two opponents draws a Giant Spider
    // (seed 7 before the village density, `pulp_wars-ykw.2`; seed 11 until
    // the round-2 kinds joined the kind draw, `pulp_wars-737.14`); the
    // board draws it since pulp_wars-737.6.
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 8,
      width: 16,
      height: 16,
      aiCount: 2,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD", "GOBLIN"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: true,
    };
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.monsters).toHaveLength(1);
    const controller = new Ruleset7BrowserController({
      storage: null,
      policySliceMilliseconds: 60_000,
      aiProgressScheduler: (resume) => {
        queueMicrotask(resume);
      },
    });
    const launched = await controller.launch(setup);
    if (!launched.ok) throw new Error(launched.diagnostic);
    let neutralTurns = 0;
    controller.subscribeAcceptedBoundary((boundary) => {
      for (const event of boundary.playerEvents.events)
        if (event.kind === "NEUTRAL_TURN_ENDED") neutralTurns += 1;
    });
    for (let round = 0; round < 4; round += 1) {
      const view = controller.snapshot().view;
      if (view === null) throw new Error("public view missing");
      if (view.turnOrder[view.activeSeatIndex] === view.humanPlayerId) {
        const ended = await controller.dispatch({ kind: "END_TURN" });
        expect(ended.accepted).toBe(true);
      }
      const progressed = await controller.progressAiTurns();
      expect(progressed.ok, JSON.stringify(progressed)).toBe(true);
      expect(controller.snapshot().diagnostic).toBeNull();
    }
    expect(controller.snapshot().view?.round).toBeGreaterThanOrEqual(4);
    expect(neutralTurns).toBeGreaterThanOrEqual(3);
    controller.destroy();
  }, 120_000);
});
