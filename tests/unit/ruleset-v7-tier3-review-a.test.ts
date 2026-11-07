import { describe, expect, it } from "vitest";
import {
  effectiveRoleRuleV7,
  roleMechanicsV7,
  viewForV7,
  type CoordV7,
} from "../../src/engine/index";
import {
  dinosaurFieldV7,
  productionCandidatesV7,
} from "../fixtures/v7-dinosaur-ai";

// The tier-3 review A (`pulp_wars-1pwz`, RULESET_7_CURRENT.md "Tier-3
// review (2026-10-25)"): the Goblin, Dinosaur, and Ice Folk Knight,
// Champion, and Catapult classes. Two units changed: the Sabretooth hunted
// the frozen line (Cold Blood and Overrun), and the T-Rex costs 11 (14).
// The Ice Folk roster rework (`pulp_wars-s55m.4`, 7r125) replaced the
// Sabretooth with the Frost Wyrm (ruleset-v7-frost-wyrm-s55m4.test.ts), so
// only the T-Rex is pinned here.

const at = (x: number, y: number): CoordV7 => ({ x, y });

describe("the tier-3 review A: the T-Rex costs 11", () => {
  it("costs 11 (14 before); its Egg, refund, and hatch time follow", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "DINOSAUR")).toMatchObject({
      label: "T-Rex",
      cost: 11,
      maxHp: 28,
      attack2: 8,
      defense2: 4,
      move: 2,
      abilities: ["ATTACK", "CAPTURE", "OVERRUN", "GROW"],
    });
    expect(roleMechanicsV7("KNIGHT", "DINOSAUR")).toMatchObject({
      capacitySlots: 2,
      hatchTurns: 4,
    });
  });

  it("the Normal AI lays a T-Rex Egg on 12 Coins when its army lacks one", () => {
    // A Dinosaur army (a Triceratops, two of the capital's four slots)
    // against Humans with shooters in sight (two fragile targets: the
    // breakthrough share is a quarter) and no T-Rex. At 14 Coins the Egg was
    // out of reach of these 12.
    const state = dinosaurFieldV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: at(10, 10) },
        { seat: 1, role: "MARKSMAN", at: at(1, 1) },
        { seat: 1, role: "CATAPULT", at: at(2, 1) },
      ],
      { coins: 12 },
    );
    expect(viewForV7(state, state.humanPlayerId).viewer.coins).toBe(12);
    expect(productionCandidatesV7(state)[0]).toMatchObject({
      kind: "LAY_EGG",
      role: "KNIGHT",
    });
  });
});
