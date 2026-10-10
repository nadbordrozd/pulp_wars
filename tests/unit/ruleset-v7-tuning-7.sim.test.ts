// Whole-game simulations split out of
// ruleset-v7-tuning-7.test.ts (`pulp_wars-bwry`): they
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
 * Tuning 7 (`pulp_wars-w49.10`, identity unchanged at `pulp-wars-poc-7r76`;
 * docs/product/RULESET_7_TUNING_HUMAN.md section 14, the Normal AI of a
 * Human, Undead, or Goblin seat): it commits against the enemy in front of
 * it and keeps committing after the line breaks, every faction's seat
 * grows, the fast units land with the infantry, the siege units go under
 * fire and stay off the enemy's melee units, Coins go to units while an
 * enemy army is in the field, the abilities are used, and the free army
 * marches on one neighbour. The five defects of the round-6 hand play are
 * at the end.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8), which `bare` removes where a
 * test is about something else. Every tile is explored by both seats.
 */

describe("2. every faction's seat grows", () => {
  it("an Undead seat in a real opening (dry land 14 x 14, seed 4, against the Human AI) researches a growth technology and builds on it", () => {
    // The map of the hand-played game `r6d`, where the Undead AI stood at
    // five units on two cities from round 6 to round 12 and its capital
    // never grew. Both seats play the Normal policy for eighteen rounds;
    // nothing is read but what the Undead seat bought.
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
    const bought: string[] = [];
    // The Undead pass (`pulp_wars-w49.13`, 7r51): eighteen rounds (sixteen
    // before). With a quarter Zombies and the Banshees and Skeletons that
    // go with them the seat trains in rounds 15 and 16 and builds its
    // first Mine in round 17 and a Workshop in round 18.
    while (state.outcome === null && state.round <= 18) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("no actor");
      for (let accepted = 0; accepted < 128; accepted += 1) {
        const view = viewForV7(state, actor);
        const command = chooseNormalTurnCommandV7(
          view,
          accepted,
          128,
          chooseNormalCommandV7(view),
        );
        if (command === null) throw new Error("no command");
        if (actor === undead.id)
          bought.push(
            command.kind === "RESEARCH"
              ? `RESEARCH ${command.tech}`
              : command.kind,
          );
        const result = applyCommandV7(state, actor, command);
        if (!result.accepted) throw new Error(result.error.code);
        state = result.state;
        if (command.kind === "END_TURN" || state.outcome !== null) break;
      }
    }
    // A growth technology and a building of it. Tuning 8, correction
    // pass (`pulp_wars-w49.11`): the Banshee's technology came before it
    // (the first two units of the order, then the one growth technology:
    // Engineering, with a Mine in round 17).
    // The Undead pass, correction (`pulp_wars-w49.13`): economy first. The
    // growth its land can use comes right after the Zombie, before the
    // Banshee: Forestry by way of Hunting (the land is Forest), a Lumber
    // Camp on it, then Marksmanship, and Sawmilling (the Lich) by round 18.
    // The economy rejig (`pulp_wars-w49.16`, 7r54): research is priced by
    // the cities owned (1 / 2 / 3 Coins a city), so this seat, which
    // takes its villages first, has Marksmanship inside the window and
    // Sawmilling (tier 3) and Administration after it.
    expect(bought.filter((kind) => kind.startsWith("RESEARCH"))).toEqual([
      "RESEARCH GATHERING",
      // Step two of the Undead pass (`pulp_wars-w49.24`): one growth
      // technology before the Zombie's two while no enemy is in sight
      // (Hunting, in round 3, for the Game in its land), and units before
      // research while the seat is short of them.
      "RESEARCH HUNTING",
      "RESEARCH DRILL",
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Zombie is
      // at Fortification, bought right after the root.
      "RESEARCH FORTIFICATION",
      "RESEARCH FORESTRY",
      "RESEARCH MARKSMANSHIP",
    ]);
    expect(bought.indexOf("BUILD_LUMBER_CAMP")).toBeGreaterThan(
      bought.indexOf("RESEARCH FORESTRY"),
    );
    expect(bought.indexOf("BUILD_LUMBER_CAMP")).toBeLessThan(
      bought.indexOf("RESEARCH MARKSMANSHIP"),
    );
  }, 120_000);
});

/**
 * The round the capital falls to each attacker (the `RETREAT` script).
 * Tuning 8 (`pulp_wars-w49.11`): 5, 5, and 7 (round 7: 7, 5, and 7); the
 * Human attacker's Raider now stays on the center it rides onto. The
 * Goblin pass (`pulp_wars-w49.12`, 7r50): the Goblin attacker in round 7 (5
 * before): its Bomb Chuckers no longer kill a retreating unit in one throw
 * with two helpers beside it. The Undead pass (`pulp_wars-w49.13`, 7r51):
 * the Undead attacker in round 8 (7 before): its Vampires strike and fly
 * back (Escape), so it loses 8 units where it lost more and takes a
 * round longer. Its correction: round 7 again (its Liches do not plague
 * without Pestilence and its Ghouls have Carrion). Step two of the Goblin
 * pass (`pulp_wars-w49.23`): the Goblin attacker in round 6 (7 before): its
 * combined kills count Gang Up and its helpers come up before the blow.
 */
const RETREAT_ROUNDS = [5, 6, 7] as const;

describe("the bounded lab runs", () => {
  // The `RETREAT` script of tests/fixtures/v7-breakthrough-lab.ts: the
  // defender gives ground one tile a turn and shoots. Measured on revision
  // 2 of the lab (docs/product/RULESET_7_TUNING_HUMAN.md section 14.2):
  // the round-6 policy took the capital in rounds 4 and 6, the Goblin
  // attacker having no turn without an attack against this script, and in
  // round 9 as the Undead; the hand player's stall is the constructed
  // position above, not this script.
  it.each([
    ["LAB_BREAKTHROUGH", RETREAT_ROUNDS[0]],
    ["LAB_BREAKTHROUGH_GOBLIN", RETREAT_ROUNDS[1]],
    ["LAB_BREAKTHROUGH_UNDEAD", RETREAT_ROUNDS[2]],
  ] as const)(
    "%s: against a defender that gives ground and shoots, the capital falls in round %i and no turn passes without an attack",
    (id, capital) => {
      const result = runBreakthroughLabV7(id, 14, "RETREAT");
      expect(result.capitalFellInRound, id).toBe(capital);
      expect(result.turnsWithoutAttack, id).toBe(0);
    },
    120_000,
  );
});
