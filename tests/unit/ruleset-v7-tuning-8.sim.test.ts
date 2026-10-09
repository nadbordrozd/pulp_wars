// Whole-game simulations split out of
// ruleset-v7-tuning-8.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  RULESET_7_ID,
  applyCommandV7,
  createPlayableGameV7,
  viewForV7,
} from "../../src/engine/index";
import { runBreakthroughLabV7 } from "../fixtures/v7-breakthrough-lab";

/**
 * Tuning 8 (`pulp_wars-w49.11`, identity unchanged at `pulp-wars-poc-7r69`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 15, the Normal AI of a
 * Human, Undead, or Goblin seat). Round 7 was played by hand four times
 * (`r7a` to `r7d`); every position below is one of those games, or the
 * smallest position that shows the same decision:
 *
 * 1. it captures what it reaches (a unit on an enemy center stays, the
 *    others cover it, and a center the shots empty is entered in the same
 *    turn);
 * 2. it researches while at war (on a clock), buys no economy technology
 *    in an assault, and a rich seat buys its dear units;
 * 3. it sends a group sized to the defenders at a held city and no lone
 *    unit, and its shooters go for the enemy's siege units;
 * 4. a Goblin seat explores and expands, throws its bombs before its own
 *    units close in, blows up in a cluster, calls WAAAGH! only before
 *    attacks, and pulls a spent fast unit back;
 * 5. a small seat grows its capital, counterattacks at home, and attacks
 *    with a unit that is lost anyway.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8),
 * seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8). Three-seat field
 * (14 x 14): capitals (2, 2), (11, 11), (11, 2). Every tile is explored by
 * every seat.
 */

// ---------------------------------------------------------------------------
// A scene: a local position of a hand-played game, rebuilt on a field. The
// cities are villages a unit of their owner captures during the setup (so
// that territory, levels, and Walls are the engine's own), the units and
// the terrain around them are placed as they stood, and the seat that is to
// move starts its turn.
// ---------------------------------------------------------------------------

describe("2. research while at war", () => {
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): by round 15 (round 14
  // before). The Zombie costs the seat one technology more (the root, then
  // Fortification), and Marksmanship comes a round later.
  // Step two of the Human pass (`pulp_wars-w49.22`): by round 16. The Human
  // seat of this match fields four Marksmen in round 11 (three before) and
  // the Undead seat buys Forestry in round 15 and Marksmanship in round 16
  // (rounds 14 and 15 before); nothing in an Undead seat's policy changed.
  // Step two of the Undead pass (`pulp_wars-w49.24`): by round 18, with
  // seventeen units trained by round 16 where it trained fewer than ten.
  // The Undead seat trains before it researches while it is short of
  // units: Hunting in round 3, Crafting 7, Fortification 11, Forestry 14,
  // Marksmanship 18.
  it("an Undead seat on the map of the hand-played game buys a ranged-unit technology by round 18, and keeps training", () => {
    // `r7d`: dry land 14 x 14, seed 4, Humans against the Undead Normal
    // AI. There the Undead seat bought Gathering, Drill, and Engineering in
    // twenty-one rounds, never Hunting or Marksmanship, and its capital
    // stood at level 2 with 0 of 3 population for twelve rounds. Here both
    // seats play the Normal policy; nothing is read but what the Undead
    // seat bought and how its capital grew.
    const created = createPlayableGameV7({
      rulesetId: RULESET_7_ID,
      seed: 4,
      width: 14,
      height: 14,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: true,
    });
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    const undead = state.players.find((player) => player.faction === "UNDEAD");
    if (undead === undefined) throw new Error("no Undead seat");
    const researched: string[] = [];
    let trained = 0;
    let idleTurns = 0;
    while (state.outcome === null && state.round <= 18) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      let bought = 0;
      for (let accepted = 0; accepted < 128; accepted += 1) {
        const view = viewForV7(state, actor);
        const command = chooseNormalTurnCommandV7(
          view,
          accepted,
          128,
          chooseNormalCommandV7(view),
        );
        if (command === null) throw new Error("no command");
        if (actor === undead.id) {
          if (command.kind === "RESEARCH") researched.push(command.tech);
          if (command.kind === "TRAIN") trained += 1;
          if (command.kind === "RESEARCH" || command.kind === "TRAIN")
            bought += 1;
        }
        const result = applyCommandV7(state, actor, command);
        if (!result.accepted) throw new Error(result.error.code);
        state = result.state;
        if (command.kind === "END_TURN" || state.outcome !== null) break;
      }
      if (actor === undead.id && bought === 0) idleTurns += 1;
    }
    expect(researched).toContain("HUNTING");
    expect(researched).toContain("MARKSMANSHIP");
    expect(researched.length).toBeGreaterThanOrEqual(5);
    expect(trained).toBeGreaterThanOrEqual(15);
    // It bought a unit or a technology in all but a few of its turns (five
    // of sixteen since step two of the Human pass: rounds 4 and 5, and
    // rounds 12 to 14, in which it keeps its Coins for Forestry; four of
    // fifteen before; three of eighteen at most since step two of the
    // Undead pass, which keeps no Coins while the seat is short of units).
    expect(idleTurns).toBeLessThanOrEqual(3);
  }, 120_000);
});
// APPEND-MARKER

describe("the bounded lab runs", () => {
  // The third script of tests/fixtures/v7-breakthrough-lab.ts, `STANDOFF`:
  // the defender gives ground, its Catapults end up behind the capital,
  // and the capital retrains a cheap garrison on its center every turn
  // (what the hand player of `r7a` did). Against it the round-7 policy took
  // the capital in rounds 6, 7, and 8 with 4, 11, and 8 units lost
  // (docs/product/RULESET_7_TUNING_HUMAN.md section 15.2), round 8 as
  // first written in rounds 6, 8, and 8, and after its correction pass in
  // rounds 6, 7, and 8 (the Goblin attacker's bombs are thrown from the
  // first step into range); the hand
  // player's four turns with an empty center are the position of
  // "r7a round 9" above, not this script. The Undead pass
  // (`pulp_wars-w49.13`, 7r51): the Undead attacker in round 7 (8
  // before; its Vampires reach the Catapults behind the capital and
  // come back). The reward ladder rework (`pulp_wars-zypi`): the Goblin
  // attacker in round 6 (7 before: the level rewards on offer, and so the
  // seats' choices, changed).
  it.each([
    ["LAB_BREAKTHROUGH", 6],
    ["LAB_BREAKTHROUGH_GOBLIN", 6],
    ["LAB_BREAKTHROUGH_UNDEAD", 7],
  ] as const)(
    "%s: against a defender that stands off with Catapults and retrains its garrison, the capital falls in round %i and no turn passes without an attack",
    (id, capital) => {
      const result = runBreakthroughLabV7(id, 14, "STANDOFF");
      expect(result.capitalFellInRound, id).toBe(capital);
      expect(result.turnsWithoutAttack, id).toBe(0);
    },
    120_000,
  );
});

// ---------------------------------------------------------------------------
// The correction pass after the hand play of round 8 (`r8a`, `r8c`, `r8d`,
// `r8e`; docs/product/RULESET_7_TUNING_HUMAN.md section 15.11).
// ---------------------------------------------------------------------------
