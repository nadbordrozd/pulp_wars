import { describe, expect, it } from "vitest";
import {
  EGG_GUARD_PRIORITY_V7,
  FIRST_LINEBREAKER_UNIT_BIAS_V7,
  GROWN_RETREAT_PRIORITY_V7,
  HATCH_APPROACH_PRIORITY_V7,
  HATCH_LAST_TURN_PRIORITY_V7,
  HATCH_PRIORITY_V7,
  HATCH_THREATENED_PRIORITY_V7,
  SIGNATURE_RESEARCH_PRIORITY_V7,
  dinosaurMatchForPolicyV7,
  dinosaurProductionAdjustmentV7,
  layEggAdjustmentV7,
} from "../../src/ai/v7-dinosaur";
import {
  publicProjectedDamageForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  applyCommandV7,
  queryCombatPreviewV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  candidatesV7,
  dinosaurFieldV7,
  dinosaurTechsWithoutV7,
  forestTileV7,
  isCandidateV7,
  moveCandidateV7,
  productionCandidatesV7,
  publicUnitAtV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { cityOfV7, withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import type { GoblinPieceV7 } from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.5`): the Normal AI playing Dinosaurs
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md section 11). Seat 0 is the
// Dinosaur viewer (capital (8, 8), level 1, capacity 3 with Planning); seat 1
// is Human (capital (2, 8)). See tests/fixtures/v7-dinosaur-ai.ts.

const DH = ["DINOSAUR", "ORIGINAL"] as const;
const NO_NESTING = { techs: { 0: dinosaurTechsWithoutV7("FORTIFICATION") } };

const dino = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof dinosaurFieldV7>[2] = {},
): GameStateV7 => dinosaurFieldV7(DH, pieces, options);
/**
 * The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur seat against Humans
 * plays the army rules now (tests/unit/ruleset-v7-dinosaur-pass.test.ts),
 * whose Moves and research have their own priorities. The priorities of
 * `pulp_wars-c87.5` are still those of a Dinosaur seat in a match with a
 * faction that plays no army rules: a Candy seat here since step two of
 * the Dwarf pass (`pulp_wars-w49.28`) made the Dwarf seats army seats too
 * (a Dwarf seat before it).
 */
const DW = ["DINOSAUR", "CANDY"] as const;
const older = (
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof dinosaurFieldV7>[2] = {},
): GameStateV7 => dinosaurFieldV7(DW, pieces, options);

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

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: gate", () => {
  it("is on exactly in a match with a Dinosaur seat", () => {
    expect(dinosaurMatchForPolicyV7(viewerViewV7(dino([])))).toBe(true);
    expect(
      dinosaurMatchForPolicyV7(
        viewerViewV7(dinosaurFieldV7(["ORIGINAL", "DINOSAUR"], [])),
      ),
    ).toBe(true);
    for (const factions of [
      ["ORIGINAL", "UNDEAD"],
      ["GOBLIN", "ORIGINAL"],
    ] as const)
      expect(
        dinosaurMatchForPolicyV7(viewerViewV7(dinosaurFieldV7(factions, []))),
      ).toBe(false);
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: production", () => {
  it("trains a Caveman, not an Egg or a Shaman, in a threatened city with an empty center", () => {
    // The Fighter on (6, 8) reaches the center (8, 8) next turn.
    const threatened = dino([own("FIGHTER", 10, 10), foe("FIGHTER", 6, 8)]);
    expect(productionCandidatesV7(threatened)).toEqual([
      { kind: "TRAIN", cityId: cityOfV7(threatened, 0).id, role: "FIGHTER" },
    ]);
    // With no enemy in reach the same city lays an Egg.
    const calm = dino([own("FIGHTER", 10, 10), foe("FIGHTER", 1, 1)]);
    expect(productionCandidatesV7(calm).map((command) => command.kind)).toEqual(
      ["LAY_EGG"],
    );
  });

  it("does not lay an Egg that visible enemies destroy before it hatches", () => {
    // A 6-HP Egg dies to one Fighter hit. The center is garrisoned, so only
    // Eggs are offered. Two Fighters reach every nest tile.
    const doomed = dino(
      [own("FIGHTER", 8, 8), foe("FIGHTER", 6, 8), foe("FIGHTER", 10, 8)],
      NO_NESTING,
    );
    expect(productionCandidatesV7(doomed)).toEqual([]);
    // One Fighter reaches only x <= 8: the Egg goes behind the city.
    const side = dino([own("FIGHTER", 8, 8), foe("FIGHTER", 6, 8)], NO_NESTING);
    const laid = productionCandidatesV7(side);
    expect(laid).toHaveLength(1);
    expect(laid[0]).toMatchObject({ kind: "LAY_EGG", at: { x: 9, y: 7 } });
    expect(
      applyCommandV7(side, side.humanPlayerId, laid[0] as CommandV7).accepted,
    ).toBe(true);
  });

  it("nests away from visible enemies and next to own units", () => {
    // (9, 7), (9, 8), and (9, 9) are equally far from the Fighter; the own
    // Caveman on (10, 9) stands next to (9, 8) and (9, 9).
    const beside = dino([own("FIGHTER", 10, 9), foe("FIGHTER", 1, 1)]);
    expect(productionCandidatesV7(beside)[0]).toMatchObject({
      kind: "LAY_EGG",
      at: { x: 9, y: 8 },
    });
    const alone = dino([own("FIGHTER", 5, 1), foe("FIGHTER", 1, 1)]);
    expect(productionCandidatesV7(alone)[0]).toMatchObject({
      kind: "LAY_EGG",
      at: { x: 9, y: 7 },
    });
  });

  it("counts hatch delay, slots in a small city, the first Triceratops, and the first Shaman", () => {
    const city = { freeSlots: 3, capacity: 3, threatened: false };
    const state = dino([foe("FIGHTER", 1, 1)], NO_NESTING);
    const view = viewerViewV7(state);
    const cityId = cityOfV7(state, 0).id;
    const lay = (role: GoblinPieceV7["role"]): CommandV7 => ({
      kind: "LAY_EGG",
      cityId,
      role,
      at: { x: 9, y: 9 },
    });
    const adjust = (command: CommandV7, facts = city, from = view): number =>
      command.kind === "LAY_EGG" || command.kind === "TRAIN"
        ? dinosaurProductionAdjustmentV7(from, command, facts)
        : Number.NaN;
    // Hatch 1, 2, and 4 turns (revision 20: the T-Rex hatches in 4): one
    // point per turn beyond the first.
    expect(adjust(lay("RAIDER"))).toBe(0);
    expect(adjust(lay("GUARD"))).toBe(-1);
    expect(adjust(lay("KNIGHT"))).toBe(-3);
    // A two-slot Egg that takes the last slots of a small city.
    expect(adjust(lay("KNIGHT"), { ...city, freeSlots: 2 })).toBe(-7);
    expect(adjust(lay("KNIGHT"), { ...city, freeSlots: 2, capacity: 5 })).toBe(
      -3,
    );
    expect(adjust(lay("GUARD"), { ...city, freeSlots: 1 })).toBe(-1);
    // The first Charge! unit (revision 20: the former first Stampede unit).
    // A Triceratops Egg hatches in two turns again, so it has a delay cost
    // of 1, and it is a two-slot Egg.
    expect(FIRST_LINEBREAKER_UNIT_BIAS_V7).toBe(20);
    expect(adjust(lay("SWORDSMAN"))).toBe(FIRST_LINEBREAKER_UNIT_BIAS_V7 - 1);
    expect(adjust(lay("SWORDSMAN"), { ...city, freeSlots: 2 })).toBe(
      FIRST_LINEBREAKER_UNIT_BIAS_V7 - 1 - 4,
    );
    const withTriceratops = viewerViewV7(
      dino([own("SWORDSMAN", 5, 1), foe("FIGHTER", 1, 1)], NO_NESTING),
    );
    expect(adjust(lay("SWORDSMAN"), city, withTriceratops)).toBe(-1);
    // Nesting no longer shortens the delay (the Dinosaur pass's
    // correction, 7r53).
    const nesting = viewerViewV7(dino([foe("FIGHTER", 1, 1)]));
    expect(adjust(lay("KNIGHT"), city, nesting)).toBe(-3);
    expect(layEggAdjustmentV7(nesting, lay("KNIGHT"), true)).toBe(-48);
    expect(layEggAdjustmentV7(view, lay("KNIGHT"), true)).toBe(-48);
    expect(layEggAdjustmentV7(view, lay("KNIGHT"), false)).toBe(0);
    // Shaman: by need, never as the defender of a threatened city.
    const shaman: CommandV7 = { kind: "TRAIN", cityId, role: "CAPTAIN" };
    expect(adjust(shaman)).toBe(0);
    expect(adjust(shaman, { ...city, threatened: true })).toBe(-30);
    const longEgg = viewerViewV7(
      dino([foe("FIGHTER", 1, 1)], {
        eggs: [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 9 } }],
      }),
    );
    expect(adjust(shaman, city, longEgg)).toBe(10);
    const army = viewerViewV7(
      dino([
        own("FIGHTER", 5, 1),
        own("FIGHTER", 6, 1),
        own("RAIDER", 7, 1),
        foe("FIGHTER", 1, 1),
      ]),
    );
    expect(adjust(shaman, city, army)).toBe(10);
    const owned = viewerViewV7(
      dino([foe("FIGHTER", 1, 1), own("CAPTAIN", 5, 1)], {
        eggs: [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 9 } }],
      }),
    );
    expect(adjust(shaman, city, owned)).toBe(0);
    expect(adjust({ kind: "TRAIN", cityId, role: "FIGHTER" })).toBe(0);
    // Another faction's production is never adjusted.
    const human = dinosaurFieldV7(["ORIGINAL", "DINOSAUR"], []);
    expect(
      adjust(
        { kind: "TRAIN", cityId: cityOfV7(human, 0).id, role: "CAPTAIN" },
        { ...city, threatened: true },
        viewerViewV7(human),
      ),
    ).toBe(0);
  });

  it("abandons an Egg only to free the slot a threatened, empty city needs for a defender", () => {
    // Caveman (1 slot) + T-Rex Egg (2 slots) fill the capacity of 3 (a
    // seat without Nesting, which adds a slot since revision 20).
    const egg = [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 9 } }] as const;
    const emergency = dino([own("FIGHTER", 10, 10), foe("FIGHTER", 6, 8)], {
      eggs: egg,
      ...NO_NESTING,
    });
    const abandon: CommandV7 = {
      kind: "DISBAND",
      unitId: unitIdAtV7(emergency, { x: 9, y: 9 }),
    };
    expect(productionCandidatesV7(emergency)).toEqual([abandon]);
    expect(scoreV7(emergency, abandon).priority).toBe(1261);
    const after = applyCommandV7(emergency, emergency.humanPlayerId, abandon);
    expect(after.accepted).toBe(true);
    if (after.accepted)
      expect(productionCandidatesV7(after.state)).toEqual([
        { kind: "TRAIN", cityId: cityOfV7(emergency, 0).id, role: "FIGHTER" },
      ]);
    // A defended center, or no threat, is no emergency.
    const guarded = dino([own("FIGHTER", 8, 8), foe("FIGHTER", 6, 8)], {
      eggs: egg,
      ...NO_NESTING,
    });
    expect(productionCandidatesV7(guarded)).toEqual([]);
    const calm = dino([own("FIGHTER", 10, 10), foe("FIGHTER", 1, 1)], {
      eggs: egg,
      ...NO_NESTING,
    });
    expect(
      productionCandidatesV7(calm).some(
        (command) => command.kind === "DISBAND",
      ),
    ).toBe(false);
    // An Egg that visible enemies will destroy is still not abandoned.
    const doomed = dino(
      [own("FIGHTER", 8, 8), foe("FIGHTER", 10, 7), foe("FIGHTER", 10, 6)],
      { eggs: [{ seat: 0, role: "RAIDER", at: { x: 9, y: 8 } }] },
    );
    expect(
      productionCandidatesV7(doomed).some(
        (command) => command.kind === "DISBAND",
      ),
    ).toBe(false);
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: Egg protection", () => {
  const egg = [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 7 } }] as const;
  // pulp_wars-9s0.1: a capturer's first job is the nearest unclaimed
  // village. With an own unit on each village, the Fighter under test
  // marches on the enemy capital (2, 8), so its routine Moves lead west.
  const camp = [
    own("FIGHTER", 5, 5),
    own("FIGHTER", 8, 5),
    own("FIGHTER", 5, 8),
  ] as const;

  it("moves a guard next to an Egg that a visible enemy reaches before it hatches", () => {
    // (The older policy, against a Dwarf seat: see `older`.)
    // The Fighter on (10, 4) is three tiles from the Egg, which needs three
    // turns; no own unit stands next to the Egg.
    const state = older(
      [...camp, own("FIGHTER", 10, 9), foe("FIGHTER", 10, 4)],
      { eggs: egg },
    );
    const guard = moveCandidateV7(state, { x: 10, y: 9 }, { x: 10, y: 8 });
    expect(guard?.score.priority).toBe(EGG_GUARD_PRIORITY_V7);
    // A quarter of the Egg's protection value (68 * 2 / 4 = 34).
    expect(guard?.score.strategicValue).toBe(8);
    expect(
      moveCandidateV7(state, { x: 10, y: 9 }, { x: 9, y: 9 })?.score.priority,
    ).toBe(700);
    // With a guard already there, or no enemy in sight, it is a routine Move.
    const guarded = older(
      [
        ...camp,
        own("FIGHTER", 10, 9),
        own("FIGHTER", 8, 7),
        foe("FIGHTER", 10, 4),
      ],
      { eggs: egg },
    );
    expect(
      moveCandidateV7(guarded, { x: 10, y: 9 }, { x: 10, y: 8 }),
    ).toBeUndefined();
    const calm = older([...camp, own("FIGHTER", 10, 9), foe("FIGHTER", 1, 1)], {
      eggs: egg,
    });
    expect(
      moveCandidateV7(calm, { x: 10, y: 9 }, { x: 10, y: 8 }),
    ).toBeUndefined();
  });

  it("keeps the sole guard beside an Egg until it hatches", () => {
    // (The older policy, against a Dwarf seat: see `older`.)
    // The Fighter on (10, 5) reaches the Egg on (9, 7) next turn.
    const state = older(
      [...camp, own("FIGHTER", 10, 8), foe("FIGHTER", 10, 5)],
      { eggs: egg },
    );
    const ends = unitCandidatesV7(state, { x: 10, y: 8 }, "MOVE").flatMap(
      (candidate) =>
        candidate.command.kind === "MOVE"
          ? candidate.command.path.slice(-1)
          : [],
    );
    // Only Moves that stay next to the Egg remain.
    expect(ends.length).toBeGreaterThan(0);
    expect(
      ends.every(
        (to) => Math.max(Math.abs(to.x - 9), Math.abs(to.y - 7)) === 1,
      ),
    ).toBe(true);
    // Without the threat the guard is free to leave.
    const calm = older([...camp, own("FIGHTER", 10, 8), foe("FIGHTER", 1, 1)], {
      eggs: egg,
    });
    expect(
      moveCandidateV7(calm, { x: 10, y: 8 }, { x: 9, y: 9 }),
    ).toBeDefined();
    expect(
      moveCandidateV7(state, { x: 10, y: 8 }, { x: 9, y: 9 }),
    ).toBeUndefined();
    // It also stays while the enemy is two turns away (the Fighter on
    // (10, 4) is three tiles from the Egg), but not for one farther off.
    const near = older(
      [...camp, own("FIGHTER", 10, 8), foe("FIGHTER", 10, 4)],
      {
        eggs: egg,
      },
    );
    expect(
      moveCandidateV7(near, { x: 10, y: 8 }, { x: 9, y: 9 }),
    ).toBeUndefined();
    const distant = older(
      [...camp, own("FIGHTER", 10, 8), foe("FIGHTER", 10, 3)],
      { eggs: egg },
    );
    expect(
      moveCandidateV7(distant, { x: 10, y: 8 }, { x: 9, y: 9 }),
    ).toBeDefined();
  });

  it("values an attack on a unit that can reach an own Egg at the Egg inside", () => {
    const pieces = [own("FIGHTER", 10, 8), foe("FIGHTER", 10, 7, 1)];
    const bare = dino(pieces);
    const nest = dino(pieces, { eggs: egg });
    const from = { x: 10, y: 8 };
    const to = { x: 10, y: 7 };
    // T-Rex Egg (revision 20: cost 14, hatch 4):
    // floor((14 * 4 + 28) * 2 / (1 + 4 turns)) = 33.
    expect(
      scoreV7(nest, attackV7(nest, from, to)).strategicValue -
        scoreV7(bare, attackV7(bare, from, to)).strategicValue,
    ).toBe(33);
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: Grow", () => {
  it("adds the growth to a kill by a unit one kill from Big or Alpha", () => {
    const strategic = (kills: number): number => {
      const state = withKillsV7(
        dino([own("RAIDER", 2, 3), foe("FIGHTER", 3, 3, 1)]),
        { x: 2, y: 3 },
        kills,
      );
      const score = scoreV7(
        state,
        attackV7(state, { x: 2, y: 3 }, { x: 3, y: 3 }),
      );
      expect(score.priority).toBe(1180);
      return score.strategicValue;
    };
    const plain = strategic(1);
    expect(strategic(0)).toBe(plain + 10);
    expect(strategic(2)).toBe(plain + 16);
    expect(strategic(3)).toBe(plain);
    // A Caveman does not grow: the Raptor's kill ranks first on equal damage.
    const caveman = dino([own("FIGHTER", 2, 3), foe("FIGHTER", 3, 3, 1)]);
    expect(
      scoreV7(caveman, attackV7(caveman, { x: 2, y: 3 }, { x: 3, y: 3 }))
        .strategicValue,
    ).toBe(plain);
  });

  it("heals a grown unit earlier than an ungrown one", () => {
    // Both are below two thirds and above half of their maximum HP.
    const big = withKillsV7(
      dino([own("RAIDER", 9, 9), foe("FIGHTER", 1, 1)]),
      { x: 9, y: 9 },
      1,
      9,
    );
    const small = dino([own("RAIDER", 9, 9, 7), foe("FIGHTER", 1, 1)]);
    const recover = (state: GameStateV7): number =>
      scoreV7(state, {
        kind: "RECOVER",
        unitId: unitIdAtV7(state, { x: 9, y: 9 }),
      }).priority;
    expect(recover(big)).toBe(930);
    expect(recover(small)).toBe(300);
  });

  it("moves a grown unit out of visible lethal reach and never routinely into it", () => {
    // (The older policy, against a Dwarf seat: see `older`.)
    const hurt = (
      kills: number,
      at: { x: number; y: number },
      fighter = { x: 5, y: 3 },
    ) =>
      withKillsV7(
        older([
          own("RAIDER", at.x, at.y),
          foe("FIGHTER", fighter.x, fighter.y),
        ]),
        at,
        kills,
        5,
      );
    // A 5-HP Raptor two tiles from a Fighter dies next turn.
    const from = { x: 3, y: 3 };
    const safe = { x: 2, y: 4 };
    expect(moveCandidateV7(hurt(1, from), from, safe)?.score.priority).toBe(
      GROWN_RETREAT_PRIORITY_V7,
    );
    // pulp_wars-9s0.1: the ungrown Raptor has no such retreat (the step
    // away from its village job is no routine Move either).
    expect(moveCandidateV7(hurt(0, from), from, safe)?.score.priority).not.toBe(
      GROWN_RETREAT_PRIORITY_V7,
    );
    // From safety, a Move into that reach is offered to the ungrown Raptor
    // only.
    const back = { x: 5, y: 1 };
    const into = { x: 4, y: 2 };
    const fighter = { x: 5, y: 4 };
    expect(moveCandidateV7(hurt(0, back, fighter), back, into)).toBeDefined();
    expect(moveCandidateV7(hurt(1, back, fighter), back, into)).toBeUndefined();
    // It heals instead.
    expect(
      unitCandidatesV7(hurt(1, back, fighter), back)[0]?.command.kind,
    ).toBe("RECOVER");
  });

  it("does not trade a grown unit cheaply", () => {
    // The Raptor's hit on the Fighter costs it 4 HP; with the Marksman's
    // shot the visible enemies then kill a Big Raptor (16 HP).
    const state = (kills: number, marksman: boolean): GameStateV7 =>
      withKillsV7(
        dino([
          own("RAIDER", 3, 3),
          foe("FIGHTER", 4, 3),
          ...(marksman ? [foe("MARKSMAN", 5, 2)] : []),
        ]),
        { x: 3, y: 3 },
        kills,
      );
    const attack = (candidate: GameStateV7): boolean =>
      isCandidateV7(
        candidate,
        attackV7(candidate, { x: 3, y: 3 }, { x: 4, y: 3 }),
      );
    expect(attack(state(1, true))).toBe(false);
    expect(attack(state(1, false))).toBe(true);
    expect(attack(state(0, true))).toBe(true);
  });
});

// Revision 20 removed Stampede: the Triceratops's Charge! policy is covered
// by tests/unit/ruleset-v7-revision20-ai.test.ts.

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: signature research", () => {
  // pulp_wars-c87.8: with two cities, the next technology toward the
  // Triceratops (Sawmilling) or the T-Rex (Chivalry) goes before land
  // production (1080).
  const research = (
    tech: "SAWMILLING" | "METALLURGY" | "CHIVALRY" | "RAIDING",
  ): CommandV7 => ({
    kind: "RESEARCH",
    tech,
  });
  const priority = (
    state: GameStateV7,
    cityCount: number,
    command: CommandV7,
  ): number => {
    const view = viewerViewV7(state);
    return scoreCommandV7(
      {
        ...view,
        leaderboard: view.leaderboard.map((entry) =>
          entry.isViewer ? { ...entry, cityCount } : entry,
        ),
      },
      command,
    ).priority;
  };
  const without = (
    factions: readonly [
      "DINOSAUR" | "ORIGINAL",
      "DINOSAUR" | "ORIGINAL" | "CANDY",
    ],
    ...techs: Parameters<typeof dinosaurTechsWithoutV7>
  ): GameStateV7 =>
    dinosaurFieldV7(factions, [own("FIGHTER", 8, 8), foe("FIGHTER", 1, 1)], {
      techs: { 0: dinosaurTechsWithoutV7(...techs) },
    });

  it("researches toward the Triceratops first, then the T-Rex, once it owns two cities", () => {
    // (The signature research of `pulp_wars-c87.8`, against a Dwarf
    // seat: an army seat follows the army's order instead.)
    const both = without(DW, "METALLURGY", "CHIVALRY");
    // Both chains are one technology long: the Triceratops goes first.
    expect(priority(both, 2, research("METALLURGY"))).toBe(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    expect(priority(both, 2, research("CHIVALRY"))).toBeLessThan(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    // With one city nothing is raised.
    expect(priority(both, 1, research("METALLURGY"))).toBeLessThan(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    // With Metallurgy known, the T-Rex is next.
    const tRex = without(DW, "CHIVALRY");
    expect(priority(tRex, 2, research("CHIVALRY"))).toBe(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
  });

  it("takes the shorter chain first and raises its next technology", () => {
    // (The signature research of `pulp_wars-c87.8`, against a Dwarf
    // seat: an army seat follows the army's order instead.)
    // The T-Rex needs Raiding and Chivalry, the Triceratops only Metallurgy (7r55).
    const short = without(DW, "METALLURGY", "RAIDING");
    expect(priority(short, 2, research("METALLURGY"))).toBe(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    expect(priority(short, 2, research("RAIDING"))).toBeLessThan(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    // The Triceratops needs Engineering and Metallurgy, the T-Rex only Chivalry.
    const long = without(DW, "ENGINEERING", "CHIVALRY");
    expect(priority(long, 2, research("CHIVALRY"))).toBe(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
    // Metallurgy known, Raiding missing: Raiding is the next step to the T-Rex.
    const raiding = without(DW, "RAIDING");
    expect(priority(raiding, 2, research("RAIDING"))).toBe(
      SIGNATURE_RESEARCH_PRIORITY_V7,
    );
  });

  it("changes nothing for a Human seat", () => {
    // Against a Dinosaur seat a Human seat keeps the old research order
    // (below the signature priority). In a Human mirror its army play
    // (tuning 5, `pulp_wars-w49.4`) researches toward its fighting roles at
    // a priority of its own, never the Dinosaur one.
    const human = without(["ORIGINAL", "DINOSAUR"], "SAWMILLING", "CHIVALRY");
    for (const tech of ["SAWMILLING", "CHIVALRY"] as const)
      expect(priority(human, 2, research(tech))).toBeLessThan(
        SIGNATURE_RESEARCH_PRIORITY_V7,
      );
    const mirror = without(["ORIGINAL", "ORIGINAL"], "SAWMILLING", "CHIVALRY");
    for (const tech of ["SAWMILLING", "CHIVALRY"] as const)
      expect(priority(mirror, 2, research(tech))).not.toBe(
        SIGNATURE_RESEARCH_PRIORITY_V7,
      );
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: Hatch", () => {
  const shaman = { x: 9, y: 8 };

  it("hatches the most valuable eligible Egg, and a one-turn Egg only at leisure", () => {
    const state = dino([own("CAPTAIN", 9, 8), foe("FIGHTER", 1, 1)], {
      eggs: [
        { seat: 0, role: "KNIGHT", at: { x: 9, y: 7 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 9 } },
        { seat: 0, role: "RAIDER", at: { x: 8, y: 9 } },
      ],
    });
    const hatches = unitCandidatesV7(state, shaman, "HATCH");
    expect(
      hatches.map((candidate) => [
        candidate.command.kind === "HATCH"
          ? publicUnitAtV7(
              state,
              state.units.find(
                (unit) =>
                  candidate.command.kind === "HATCH" &&
                  unit.id === candidate.command.eggUnitId,
              )?.at ?? shaman,
            ).role
          : null,
        candidate.score.priority,
        candidate.score.strategicValue,
      ]),
    ).toEqual([
      // T-Rex (revision 20): 14 * 4 + 28 + 10 * 4 turns; Ankylosaurus:
      // 5 * 4 + 20 + 20.
      ["KNIGHT", HATCH_PRIORITY_V7, 124],
      ["GUARD", HATCH_PRIORITY_V7, 60],
      ["RAIDER", HATCH_LAST_TURN_PRIORITY_V7, 38],
    ]);
    expect(unitCandidatesV7(state, shaman)[0]).toEqual(hatches[0]);
  });

  it("hatches a threatened Egg first", () => {
    // The Fighter on (10, 10) can hit the Ankylosaurus Egg on (9, 9).
    const state = dino([own("CAPTAIN", 9, 8), foe("FIGHTER", 10, 10)], {
      eggs: [
        { seat: 0, role: "KNIGHT", at: { x: 9, y: 7 } },
        { seat: 0, role: "GUARD", at: { x: 9, y: 9 } },
      ],
    });
    const best = unitCandidatesV7(state, shaman)[0];
    expect(best?.command).toEqual({
      kind: "HATCH",
      unitId: unitIdAtV7(state, shaman),
      eggUnitId: unitIdAtV7(state, { x: 9, y: 9 }),
    });
    expect(best?.score.priority).toBe(HATCH_THREATENED_PRIORITY_V7);
    expect(best?.score.strategicValue).toBe(60 + 20);
    expect(
      best === undefined
        ? false
        : applyCommandV7(state, state.humanPlayerId, best.command).accepted,
    ).toBe(true);
  });

  it("walks a Shaman to an Egg it can hatch and keeps it by a long Egg", () => {
    const from = { x: 10, y: 10 };
    const state = dino([own("CAPTAIN", 10, 10), foe("FIGHTER", 1, 1)], {
      eggs: [{ seat: 0, role: "KNIGHT", at: { x: 9, y: 8 } }],
    });
    const approach = moveCandidateV7(state, from, { x: 9, y: 9 });
    expect(approach?.score.priority).toBe(HATCH_APPROACH_PRIORITY_V7);
    // A quarter of the T-Rex inside (revision 20: 14 * 4 + 28 = 84).
    expect(approach?.score.strategicValue).toBe(21);
    // A Move that does not approach the Egg ranks below it. (It scored 700
    // before `pulp_wars-ke95`; since the Shaman captures, the policy no
    // longer offers it that ordinary Move at all.)
    expect(
      moveCandidateV7(state, from, { x: 9, y: 10 })?.score.priority ?? 0,
    ).toBeLessThan(HATCH_APPROACH_PRIORITY_V7);
    // An Egg laid this turn cannot be hatched yet: the Shaman only stands by.
    const fresh = dino([own("CAPTAIN", 10, 10), foe("FIGHTER", 1, 1)], {
      eggs: [
        { seat: 0, role: "KNIGHT", at: { x: 9, y: 8 }, laidThisTurn: true },
      ],
    });
    expect(moveCandidateV7(fresh, from, { x: 9, y: 9 })?.score.priority).toBe(
      EGG_GUARD_PRIORITY_V7,
    );
    // Beside such an Egg it does not wander off.
    const beside = dino([own("CAPTAIN", 9, 9), foe("FIGHTER", 1, 1)], {
      eggs: [
        { seat: 0, role: "KNIGHT", at: { x: 9, y: 8 }, laidThisTurn: true },
      ],
    });
    expect(
      moveCandidateV7(beside, { x: 9, y: 9 }, { x: 10, y: 10 }),
    ).toBeUndefined();
    // With no Egg it moves like any Captain.
    const idle = dino([own("CAPTAIN", 9, 9), foe("FIGHTER", 1, 1)]);
    expect(
      unitCandidatesV7(idle, { x: 9, y: 9 }, "MOVE").length,
    ).toBeGreaterThan(0);
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: estimates", () => {
  const estimate = (
    state: GameStateV7,
    from: { x: number; y: number },
    to: { x: number; y: number },
    options: { readonly maximumCharge?: boolean } = {},
  ): number =>
    publicProjectedDamageForPolicyV7(
      viewerViewV7(state),
      publicUnitAtV7(state, from),
      publicUnitAtV7(state, to),
      to,
      options,
    );
  const previewed = (
    state: GameStateV7,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): number | undefined =>
    queryCombatPreviewV7(
      viewerViewV7(state),
      unitIdAtV7(state, from),
      unitIdAtV7(state, to),
    )?.damageToDefender;

  it("applies Acid: a Spitter ignores Forest cover", () => {
    const from = { x: 3, y: 3 };
    const to = { x: 5, y: 3 };
    const open = dino([own("MARKSMAN", 3, 3), foe("FIGHTER", 5, 3)]);
    const forest = forestTileV7(open, to);
    expect(estimate(forest, from, to)).toBe(5);
    expect(estimate(forest, from, to)).toBe(estimate(open, from, to));
    expect(estimate(forest, from, to)).toBe(previewed(forest, from, to));
    // A Human Marksman's shot is reduced by the same Forest.
    const human = forestTileV7(
      dinosaurFieldV7(
        ["ORIGINAL", "DINOSAUR"],
        [own("MARKSMAN", 3, 3), foe("FIGHTER", 5, 3)],
      ),
      to,
    );
    expect(estimate(human, from, to)).toBe(previewed(human, from, to));
    expect(estimate(human, from, to)).toBeLessThan(5);
    // The policy prefers the Spitter target whose cover Acid ignores.
    expect(
      scoreV7(forest, attackV7(forest, from, to)).strategicValue -
        scoreV7(open, attackV7(open, from, to)).strategicValue,
    ).toBe(3);
  });

  it("applies Armoured: one less damage to an Ankylosaurus", () => {
    const state = dinosaurFieldV7(
      ["ORIGINAL", "DINOSAUR"],
      [own("FIGHTER", 3, 3), foe("GUARD", 4, 3), foe("FIGHTER", 3, 4)],
    );
    const from = { x: 3, y: 3 };
    expect(estimate(state, from, { x: 4, y: 3 })).toBe(3);
    expect(estimate(state, from, { x: 4, y: 3 })).toBe(
      previewed(state, from, { x: 4, y: 3 }),
    );
    // A Human Guard has the same Defense and no armour.
    const human = dinosaurFieldV7(
      ["ORIGINAL", "ORIGINAL"],
      [own("FIGHTER", 3, 3), foe("GUARD", 4, 3)],
    );
    expect(estimate(human, from, { x: 4, y: 3 })).toBe(
      previewed(human, from, { x: 4, y: 3 }),
    );
  });

  it("applies Alpha: +1 Attack in the threat estimate, with Pounce on top", () => {
    const raptor = (kills: number): GameStateV7 =>
      withKillsV7(
        dinosaurFieldV7(
          ["ORIGINAL", "DINOSAUR"],
          [own("GUARD", 3, 3), foe("RAIDER", 4, 3)],
        ),
        { x: 4, y: 3 },
        kills,
      );
    const hit = (kills: number, maximumCharge: boolean): number =>
      estimate(
        raptor(kills),
        { x: 4, y: 3 },
        { x: 3, y: 3 },
        { maximumCharge },
      );
    expect(hit(3, false)).toBeGreaterThan(hit(0, false));
    expect(hit(3, true)).toBeGreaterThan(hit(0, true));
    expect(hit(3, true)).toBeGreaterThan(hit(3, false));
  });
});

describe("ruleset-7 revision-19 Normal AI as Dinosaurs: candidates stay legal", () => {
  it("offers only commands the engine accepts in a busy Dinosaur position", () => {
    const pieces = [
      own("SWORDSMAN", 1, 3),
      own("CAPTAIN", 9, 8),
      own("RAIDER", 3, 5),
      foe("GUARD", 4, 3),
      foe("FIGHTER", 6, 6),
    ];
    const state = dino(pieces, {
      eggs: [{ seat: 0, role: "GUARD", at: { x: 9, y: 9 } }],
    });
    const candidates = candidatesV7(state);
    expect(candidates.length).toBeGreaterThan(5);
    for (const candidate of candidates)
      expect(
        applyCommandV7(state, state.humanPlayerId, candidate.command).accepted,
        JSON.stringify(candidate.command),
      ).toBe(true);
  });
});
