// Whole-game simulations split out of
// ruleset-v7-tuning-6.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { runBreakthroughLabV7 } from "../fixtures/v7-breakthrough-lab";

/**
 * Tuning 6 (`pulp_wars-w49.6`, identity `pulp-wars-poc-7r73`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 13): the Normal AI breaks
 * a line with numbers, expands and grows, researches toward its army and
 * buys its dear units, and keeps its discipline; research costs 1 Coin more
 * per technology owned (2 before); an unseen attacker's damage reaches the
 * victim's owner; a reward unit leaves the garrison on its center.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8), which `bare` removes where a
 * test is about something else. Every tile is explored by both seats.
 */

describe("LAB_BREAKTHROUGH: numbers against a prepared line", () => {
  /** The round the capital falls to each attacker (the `HOLD` script). */
  // The Goblin pass (`pulp_wars-w49.12`, 7r50): the Goblin attacker takes
  // it in round 6 (7 before; a bomb gets no Gang Up, the Brutes are
  // Blast-proof, and a spent Buggy crashes).
  // The Undead pass (`pulp_wars-w49.13`, 7r51): the Undead attacker takes
  // it in round 8 (7 before) and loses 10 units (its Vampires fly back
  // after their strike instead of standing in the line).
  // The economy rejig (`pulp_wars-w49.16`, 7r54): the Goblin attacker
  // takes it in round 7 again (6): its six cities make its next
  // technology dearer, and the Coins it keeps for it train fewer units.
  // The ninth unit (`pulp_wars-w49.17`, 7r55; revision 3 of the lab): the
  // Goblin attacker takes it in round 6 again (its order now holds the
  // Ogre's technologies, and the player's Champions are the same units).
  const HOLD_ROUNDS = [6, 6, 8] as const;

  // The bounded run (tests/fixtures/v7-breakthrough-lab.ts, the `HOLD`
  // script): what a competent player does cheaply (the correction pass; the
  // first script never moved or trained, and the round-5 policy beat it
  // too): focused fire, every favourable attack, a melee unit in every
  // city that can train, and the units behind the line walk to its gaps.
  //
  // Measured on revision 1 of the lab (docs/product/
  // RULESET_7_TUNING_HUMAN.md section 13.2): the round-6 policy took the
  // capital in rounds 7, 8, and 8 and lost 7, 15, and 12 units; the round-5
  // policy in rounds 9, 10, and 9. Tuning 7 (`pulp_wars-w49.10`) moved the
  // capital one tile toward the line so that the Field Defenses count
  // (revision 2 of the lab), and its policy holds the fast units back for
  // the infantry: on revision 2 the round-6 policy took the capital in
  // rounds 7, 7, and 7 and lost 7, 11, and 8 units; the round-7 policy
  // takes it in the rounds pinned here (section 14.2 has both tables).
  it.each([
    ["LAB_BREAKTHROUGH", 3, HOLD_ROUNDS[0]],
    ["LAB_BREAKTHROUGH_GOBLIN", 3, HOLD_ROUNDS[1]],
    ["LAB_BREAKTHROUGH_UNDEAD", 3, HOLD_ROUNDS[2]],
  ] as const)(
    "%s: with twice the value the AI is on the line in round %i and takes the walled capital in round %i",
    (id, crossed, capital) => {
      const result = runBreakthroughLabV7(id, 12, "HOLD");
      expect(result.crossedInRound, id).toBe(crossed);
      expect(result.capitalFellInRound, id).toBe(capital);
    },
    120_000,
  );
});
