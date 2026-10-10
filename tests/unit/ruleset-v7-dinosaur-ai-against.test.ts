import { describe, expect, it } from "vitest";
import { EGG_SMASH_SETUP_PRIORITY_V7 } from "../../src/ai/v7-dinosaur";
import {
  applyCommandV7,
  previewKaboomV7,
  queryCombatPreviewV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  dinosaurFieldV7,
  isCandidateV7,
  moveCandidateV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { withKillsV7, type EggPieceV7 } from "../fixtures/v7-dinosaur-arena";
import type { GoblinPieceV7 } from "../fixtures/v7-goblin-arena";
import { candySeatKeepsOlderPolicyV7 } from "../fixtures/v7-older-policy";

// The Candy army seat (`pulp_wars-jdb.13`): this file pins the older
// policy on matches with a Candy seat, as it was written. No match
// reaches that policy through its factions any more, so the file takes
// the Candy out of the army factions (tests/fixtures/v7-older-policy.ts).
candySeatKeepsOlderPolicyV7();

// Revision 19 (`pulp_wars-c87.5`): the Normal AI playing against Dinosaurs
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section 11). Seat 0 is the
// viewer (Human unless stated; capital (8, 8)); seat 1 is the Dinosaur seat
// (capital (2, 8), nest tiles x 1-3, y 7-9).

const HD = ["ORIGINAL", "DINOSAUR"] as const;
const own = (role: GoblinPieceV7["role"], x: number, y: number, hp?: number) =>
  ({
    seat: 0,
    role,
    at: { x, y },
    ...(hp === undefined ? {} : { hp }),
  }) as const;
const foe = (role: GoblinPieceV7["role"], x: number, y: number, hp?: number) =>
  ({
    seat: 1,
    role,
    at: { x, y },
    ...(hp === undefined ? {} : { hp }),
  }) as const;
const egg = (
  role: EggPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<EggPieceV7> = {},
): EggPieceV7 => ({ seat: 1, role, at: { x, y }, ...extra });
const human = (
  pieces: readonly GoblinPieceV7[],
  eggs: readonly EggPieceV7[] = [],
): GameStateV7 => dinosaurFieldV7(HD, pieces, { eggs });
/**
 * The Dinosaur pass (`pulp_wars-w49.15`): a Human seat against Dinosaurs
 * plays the army rules now, whose committed attacks and Moves have their
 * own scores. The scores of `pulp_wars-c87.5` are still those of a seat
 * that plays no army rules: a Candy one here since step two of the Dwarf
 * pass (`pulp_wars-w49.28`) made the Dwarf seats army seats too (a Dwarf
 * one before it).
 */
const DWARF_VIEWER = ["CANDY", "DINOSAUR"] as const;
const older = (
  pieces: readonly GoblinPieceV7[],
  eggs: readonly EggPieceV7[] = [],
): GameStateV7 => dinosaurFieldV7(DWARF_VIEWER, pieces, { eggs });

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: Eggs", () => {
  const fighter = { x: 4, y: 7 };
  const nest = { x: 3, y: 7 };

  it("destroys a reachable Egg", () => {
    const state = human([own("FIGHTER", 4, 7)], [egg("RAIDER", 3, 7)]);
    const smash = attackV7(state, fighter, nest);
    const best = unitCandidatesV7(state, fighter)[0];
    expect(best?.command).toEqual(smash);
    expect(best?.score.priority).toBe(1180);
    // The Raptor inside (4 * 4), the Egg's 6 HP, and its one turn left.
    expect(best?.score.strategicValue).toBe(16 + 6 + 2);
    expect(applyCommandV7(state, state.humanPlayerId, smash).accepted).toBe(
      true,
    );
  });

  it("does not chip an Egg that hatches next turn unless this turn's attacks destroy it", () => {
    // A 10-HP (Nesting) Egg survives one Fighter's 6 damage.
    const one = human(
      [own("FIGHTER", 4, 7)],
      [egg("RAIDER", 3, 7, { maxHp: 10 })],
    );
    expect(isCandidateV7(one, attackV7(one, fighter, nest))).toBe(false);
    // Two Fighters complete the destruction this turn.
    const two = human(
      [own("FIGHTER", 4, 7), own("FIGHTER", 4, 6)],
      [egg("RAIDER", 3, 7, { maxHp: 10 })],
    );
    expect(isCandidateV7(two, attackV7(two, fighter, nest))).toBe(true);
    expect(isCandidateV7(two, attackV7(two, { x: 4, y: 6 }, nest))).toBe(true);
    // A T-Rex Egg needs three more turns: its damage stays (Eggs never heal).
    const long = human(
      [own("FIGHTER", 4, 7)],
      [egg("KNIGHT", 3, 7, { maxHp: 10 })],
    );
    expect(isCandidateV7(long, attackV7(long, fighter, nest))).toBe(true);
    expect(scoreV7(long, attackV7(long, fighter, nest)).priority).toBe(900);
  });

  it("prefers the long-hatch Egg", () => {
    const state = human(
      [own("FIGHTER", 4, 8)],
      [egg("RAIDER", 3, 7), egg("KNIGHT", 3, 9)],
    );
    const from = { x: 4, y: 8 };
    const attacks = unitCandidatesV7(state, from, "ATTACK");
    expect(attacks.map((candidate) => candidate.command)).toEqual([
      attackV7(state, from, { x: 3, y: 9 }),
      attackV7(state, from, { x: 3, y: 7 }),
    ]);
    // T-Rex Egg (revision 20: cost 14, hatch 4): 14 * 4 + 6 HP + 2 * 4 turns.
    expect(attacks.map((candidate) => candidate.score.strategicValue)).toEqual([
      70, 24,
    ]);
  });

  it("steps next to an Egg it then destroys", () => {
    const state = human([own("FIGHTER", 5, 7)], [egg("RAIDER", 3, 7)]);
    const from = { x: 5, y: 7 };
    const setup = moveCandidateV7(state, from, { x: 4, y: 7 });
    expect(setup?.score.priority).toBe(EGG_SMASH_SETUP_PRIORITY_V7);
    expect(setup?.score.strategicValue).toBe(12);
    expect(unitCandidatesV7(state, from)[0]?.score.priority).toBe(
      EGG_SMASH_SETUP_PRIORITY_V7,
    );
    // A Nesting Egg that the Fighter cannot destroy is no reason to step in.
    const tough = human(
      [own("FIGHTER", 5, 7)],
      [egg("RAIDER", 3, 7, { maxHp: 10 })],
    );
    expect(
      unitCandidatesV7(tough, from, "MOVE").every(
        (candidate) => candidate.score.priority < EGG_SMASH_SETUP_PRIORITY_V7,
      ),
    ).toBe(true);
    // A Guard cannot attack after moving.
    const guard = human([own("GUARD", 5, 7)], [egg("RAIDER", 3, 7)]);
    expect(
      unitCandidatesV7(guard, from, "MOVE").every(
        (candidate) => candidate.score.priority < EGG_SMASH_SETUP_PRIORITY_V7,
      ),
    ).toBe(true);
  });

  it("does not advance a valuable unit onto a cheap Egg's tile into lethal reach", () => {
    // Two Cavemen reach the Egg's tile (3, 7) but not the Knight's (4, 6).
    const from = { x: 4, y: 6 };
    const guarded = (role: EggPieceV7["role"]): GameStateV7 =>
      human(
        [own("KNIGHT", 4, 6, 6), foe("FIGHTER", 2, 9), foe("FIGHTER", 1, 9)],
        [egg(role, 3, 7)],
      );
    const raptor = guarded("RAIDER");
    expect(isCandidateV7(raptor, attackV7(raptor, from, nest))).toBe(false);
    // A T-Rex Egg is worth the Knight.
    const rex = guarded("KNIGHT");
    expect(isCandidateV7(rex, attackV7(rex, from, nest))).toBe(true);
    // An unguarded Raptor Egg is destroyed.
    const open = human(
      [own("KNIGHT", 4, 6, 6), foe("FIGHTER", 10, 0)],
      [egg("RAIDER", 3, 7)],
    );
    expect(isCandidateV7(open, attackV7(open, from, nest))).toBe(true);
  });
});

// Revision 20 removed Stampede and its lanes: the estimates against a
// Triceratops's Charge! are covered by
// tests/unit/ruleset-v7-revision20-ai.test.ts.

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: growth", () => {
  const from = { x: 4, y: 3 };
  const to = { x: 5, y: 3 };

  it("does not feed a kill to a unit one kill from Big or Alpha", () => {
    // The 3-HP Fighter dies to the Raptor's retaliation.
    const strategic = (kills: number): number => {
      const state = withKillsV7(
        older([own("FIGHTER", 4, 3, 3), foe("RAIDER", 5, 3)]),
        to,
        kills,
      );
      const attack = attackV7(state, from, to);
      expect(
        queryCombatPreviewV7(
          viewerViewV7(state),
          attack.unitId,
          attack.targetUnitId,
        ),
      ).toMatchObject({ attackerDies: true, defenderDies: false });
      expect(isCandidateV7(state, attack)).toBe(false);
      return scoreV7(state, attack).strategicValue;
    };
    // Target value: Raptor 4 * 4 + HP (12, or 16 when Big) + 10 when grown.
    expect(strategic(0)).toBe(16 + 12 - 10);
    expect(strategic(1)).toBe(16 + 16 + 10);
    expect(strategic(2)).toBe(16 + 16 + 10 - 16);
  });

  it("discounts a Move into the lethal reach of a nearly grown unit", () => {
    // A full-HP Fighter three tiles down a Triceratops's row dies to the
    // Stampede, which would make that Triceratops Big.
    const state = older([own("FIGHTER", 6, 2), foe("SWORDSMAN", 2, 3)]);
    expect(
      moveCandidateV7(state, { x: 6, y: 2 }, { x: 5, y: 3 })?.score
        .strategicValue,
    ).toBe(-10);
    const grown = withKillsV7(state, { x: 2, y: 3 }, 1);
    expect(
      moveCandidateV7(grown, { x: 6, y: 2 }, { x: 5, y: 3 })?.score
        .strategicValue,
    ).toBe(0);
  });

  it("focuses fire on a grown unit when it can be killed", () => {
    const kill = (kills: number): number => {
      const state = withKillsV7(
        human([own("FIGHTER", 4, 3), foe("RAIDER", 5, 3)]),
        to,
        kills,
        1,
      );
      const score = scoreV7(state, attackV7(state, from, to));
      expect(score.priority).toBe(1180);
      return score.strategicValue;
    };
    // Each growth stage adds 10 to the kill.
    expect(kill(3)).toBe(kill(1) + 10);
    // Revision 20: a wounded dinosaur one kill from a stage would be fully
    // healed by it, so killing it first is worth half of that growth. At
    // 1 of 12 HP, Big restores 11 + 4 HP (37, halved to 18); at 1 of 16 HP
    // with two kills, Alpha restores 15 + 4 HP and adds Attack (53, 26).
    expect(kill(0)).toBe(kill(1) - 10 + 18);
    expect(kill(2)).toBe(kill(1) + 26);
  });
});

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: Armoured", () => {
  it("does not chip an Ankylosaurus for 1 damage", () => {
    const from = { x: 3, y: 3 };
    const to = { x: 5, y: 3 };
    const shot = (hp: number) => {
      const state = human([own("MARKSMAN", 3, 3, hp), foe("GUARD", 5, 3)]);
      const attack = attackV7(state, from, to);
      return {
        damage: queryCombatPreviewV7(
          viewerViewV7(state),
          attack.unitId,
          attack.targetUnitId,
        )?.damageToDefender,
        candidate: isCandidateV7(state, attack),
      };
    };
    // Section 6.3: the Marksman has 12 HP (was 10; the shots were 10, 6, 4).
    expect(shot(12)).toEqual({ damage: 3, candidate: true });
    expect(shot(7)).toEqual({ damage: 2, candidate: true });
    expect(shot(5)).toEqual({ damage: 1, candidate: false });
    // The same weak shot at a Human Guard (no armour) is still taken.
    const plain = dinosaurFieldV7(
      ["ORIGINAL", "ORIGINAL"],
      [own("MARKSMAN", 3, 3, 5), foe("GUARD", 5, 3)],
    );
    expect(isCandidateV7(plain, attackV7(plain, from, to))).toBe(true);
    // A final 1-damage hit that kills is taken.
    const last = human([own("MARKSMAN", 3, 3, 5), foe("GUARD", 5, 3, 1)]);
    expect(isCandidateV7(last, attackV7(last, from, to))).toBe(true);
  });
});

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: Goblin blasts", () => {
  const GD = ["GOBLIN", "DINOSAUR"] as const;

  it("values an Egg in a Kaboom at the unit inside", () => {
    // A Scrap Buggy next to a 4-HP Egg: its Kaboom destroys the Egg.
    const kaboom = (role: EggPieceV7["role"]) => {
      const state = dinosaurFieldV7(GD, [own("KNIGHT", 4, 7)], {
        eggs: [egg(role, 3, 7, { hp: 4 })],
      });
      const unitId = unitIdAtV7(state, { x: 4, y: 7 });
      expect(
        previewKaboomV7(viewerViewV7(state), unitId)?.totals,
      ).toMatchObject({ hostileKills: 1, friendlyKills: 0 });
      return scoreV7(state, { kind: "KABOOM", unitId });
    };
    // A T-Rex Egg is worth the Scrap Buggy; a Raptor Egg is not.
    const rex = kaboom("KNIGHT");
    expect(rex.priority).toBe(1178);
    expect(rex.strategicValue).toBeGreaterThan(0);
    expect(kaboom("RAIDER").priority).toBe(-1);
  });

  it("counts bomb splash on an Egg as a gain", () => {
    const bomb = (eggs: readonly EggPieceV7[]) => {
      const state = dinosaurFieldV7(
        GD,
        [own("MARKSMAN", 6, 5), foe("FIGHTER", 4, 7)],
        { eggs },
      );
      const attack = attackV7(state, { x: 6, y: 5 }, { x: 4, y: 7 });
      return {
        splash: queryCombatPreviewV7(
          viewerViewV7(state),
          attack.unitId,
          attack.targetUnitId,
        )?.splash.map((entry) => entry.damage),
        score: scoreV7(state, attack),
      };
    };
    const bare = bomb([]);
    const nest = bomb([egg("KNIGHT", 3, 7)]);
    expect(bare.splash).toEqual([]);
    expect(nest.splash).toEqual([3]);
    // Half of the T-Rex Egg (revision 20: 14 * 4 + 6 HP + 2 * 4 turns = 70):
    // 3 of 6 HP.
    expect(nest.score.strategicValue - bare.score.strategicValue).toBe(35);
    expect(nest.score.immediateValue - bare.score.immediateValue).toBe(30);
  });
});
