import { describe, expect, it } from "vitest";
import {
  EGG_SMASH_SETUP_PRIORITY_V7,
  LANE_BLOCK_PRIORITY_V7,
} from "../../src/ai/v7-dinosaur";
import {
  inspectNormalTacticalFactsV7,
  publicThreatenedTilesForPolicyV7,
} from "../../src/ai/v7";
import {
  applyCommandV7,
  previewKaboomV7,
  queryCombatPreviewV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  dinosaurFieldV7,
  forestTileV7,
  mountainTileV7,
  isCandidateV7,
  moveCandidateV7,
  publicUnitAtV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { withKillsV7, type EggPieceV7 } from "../fixtures/v7-dinosaur-arena";
import type { GoblinPieceV7 } from "../fixtures/v7-goblin-arena";

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
const key = (at: CoordV7): string => `${at.x},${at.y}`;

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
    // T-Rex Egg: 10 * 4 + 6 HP + 2 * 3 turns.
    expect(attacks.map((candidate) => candidate.score.strategicValue)).toEqual([
      52, 24,
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

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: Stampede lanes", () => {
  it("includes open lanes in a hostile Triceratops's threat envelope", () => {
    const state = human([own("FIGHTER", 6, 2), foe("CATAPULT", 2, 3)]);
    const triceratops = publicUnitAtV7(state, { x: 2, y: 3 });
    const reach = new Set(
      publicThreatenedTilesForPolicyV7(viewerViewV7(state), triceratops).map(
        key,
      ),
    );
    // Adjacent tiles, and distance 2 and 3 in the eight directions.
    for (const at of ["3,3", "4,3", "5,3", "4,5", "5,6", "2,5", "2,6", "0,1"])
      expect(reach.has(at), at).toBe(true);
    // Not off the lines, and not beyond three tiles.
    for (const at of ["4,4", "5,4", "6,3", "3,5"])
      expect(reach.has(at), at).toBe(false);
    // A Mountain on (3, 3) closes the row; a Forest there does not
    // (pulp_wars-c87.8: Forest lane tiles are open).
    const wooded = new Set(
      publicThreatenedTilesForPolicyV7(
        viewerViewV7(forestTileV7(state, { x: 3, y: 3 })),
        triceratops,
      ).map(key),
    );
    expect(wooded.has("4,3")).toBe(true);
    expect(wooded.has("5,3")).toBe(true);
    const closed = mountainTileV7(state, { x: 3, y: 3 });
    const closedReach = new Set(
      publicThreatenedTilesForPolicyV7(viewerViewV7(closed), triceratops).map(
        key,
      ),
    );
    expect(closedReach.has("4,3")).toBe(false);
    expect(closedReach.has("5,3")).toBe(false);
    expect(closedReach.has("4,5")).toBe(true);
    // A Human Catapult has no lanes: only its range band.
    const catapult = dinosaurFieldV7(
      ["ORIGINAL", "ORIGINAL"],
      [own("FIGHTER", 6, 2), foe("CATAPULT", 2, 3)],
    );
    const band = publicThreatenedTilesForPolicyV7(
      viewerViewV7(catapult),
      publicUnitAtV7(catapult, { x: 2, y: 3 }),
    ).map(key);
    expect(band).not.toContain("3,3");
    expect(band).toContain("5,4");
  });

  it("steps out of a lane when an equally good tile exists", () => {
    // From (6, 2), three Moves make the same progress; (5, 3) is three tiles
    // down the Triceratops's row (Attack 3 + 2: lethal to a Fighter).
    const state = human([own("FIGHTER", 6, 2), foe("CATAPULT", 2, 3)]);
    const from = { x: 6, y: 2 };
    const lane = moveCandidateV7(state, from, { x: 5, y: 3 });
    const clear = moveCandidateV7(state, from, { x: 6, y: 3 });
    expect(lane?.score.safetyValue).toBe(-10);
    expect(clear?.score.safetyValue).toBe(0);
    expect(lane?.score.objectiveValue).toBe(clear?.score.objectiveValue);
    expect(unitCandidatesV7(state, from)[0]?.command).toEqual(clear?.command);
    // With the lane closed by a Mountain the tile is as safe as the others.
    const closed = mountainTileV7(state, { x: 3, y: 3 });
    expect(
      moveCandidateV7(closed, from, { x: 5, y: 3 })?.score.safetyValue,
    ).toBe(0);
  });

  it("blocks the lane to a defended own center with a cheap unit", () => {
    // The Triceratops on (5, 8) aims down the row at the Guard on (8, 8).
    const state = human([
      own("GUARD", 8, 8),
      own("FIGHTER", 7, 7),
      foe("CATAPULT", 5, 8),
    ]);
    expect(
      inspectNormalTacticalFactsV7(viewerViewV7(state)).threats.map(
        (threat) => threat.unitId,
      ),
    ).toEqual([unitIdAtV7(state, { x: 5, y: 8 })]);
    const from = { x: 7, y: 7 };
    const block = moveCandidateV7(state, from, { x: 6, y: 8 });
    expect(block?.score.priority).toBe(LANE_BLOCK_PRIORITY_V7);
    // Next to the Triceratops: it has no run left at all.
    expect(block?.score.strategicValue).toBe(14);
    expect(unitCandidatesV7(state, from)[0]).toEqual(block);
    // (7, 8) would be hit by a two-tile Stampede: lethal, so not taken.
    expect(
      moveCandidateV7(state, from, { x: 7, y: 8 })?.score.priority ?? 0,
    ).toBeLessThan(LANE_BLOCK_PRIORITY_V7);
    // Four tiles away there is no lane to block.
    const far = human([
      own("GUARD", 8, 8),
      own("FIGHTER", 7, 7),
      foe("CATAPULT", 4, 8),
    ]);
    expect(
      unitCandidatesV7(far, from, "MOVE").every(
        (candidate) => candidate.score.priority < LANE_BLOCK_PRIORITY_V7,
      ),
    ).toBe(true);
    // A unit worth more than the defender is not spent as a blocker.
    const knight = human([
      own("FIGHTER", 8, 8),
      own("KNIGHT", 7, 7),
      foe("CATAPULT", 5, 8),
    ]);
    expect(
      unitCandidatesV7(knight, from, "MOVE").every(
        (candidate) => candidate.score.priority !== LANE_BLOCK_PRIORITY_V7,
      ),
    ).toBe(true);
  });
});

describe("ruleset-7 revision-19 Normal AI against Dinosaurs: growth", () => {
  const from = { x: 4, y: 3 };
  const to = { x: 5, y: 3 };

  it("does not feed a kill to a unit one kill from Big or Alpha", () => {
    // The 3-HP Fighter dies to the Raptor's retaliation.
    const strategic = (kills: number): number => {
      const state = withKillsV7(
        human([own("FIGHTER", 4, 3, 3), foe("RAIDER", 5, 3)]),
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
    const state = human([own("FIGHTER", 6, 2), foe("CATAPULT", 2, 3)]);
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
    expect(kill(1)).toBe(kill(0) + 10);
    expect(kill(3)).toBe(kill(0) + 20);
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
    expect(shot(10)).toEqual({ damage: 3, candidate: true });
    expect(shot(6)).toEqual({ damage: 2, candidate: true });
    expect(shot(4)).toEqual({ damage: 1, candidate: false });
    // The same weak shot at a Human Guard (no armour) is still taken.
    const plain = dinosaurFieldV7(
      ["ORIGINAL", "ORIGINAL"],
      [own("MARKSMAN", 3, 3, 4), foe("GUARD", 5, 3)],
    );
    expect(isCandidateV7(plain, attackV7(plain, from, to))).toBe(true);
    // A final 1-damage hit that kills is taken.
    const last = human([own("MARKSMAN", 3, 3, 4), foe("GUARD", 5, 3, 1)]);
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
    // Half of the T-Rex Egg (10 * 4 + 6 HP + 2 * 3 turns = 52): 3 of 6 HP.
    expect(nest.score.strategicValue - bare.score.strategicValue).toBe(26);
    expect(nest.score.immediateValue - bare.score.immediateValue).toBe(30);
  });
});
