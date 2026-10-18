import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import { KABOOM_MULTI_KILL_PRIORITY_V7 } from "../../src/ai/v7-goblin";
import {
  MIND_CONTROL_APPROACH_PRIORITY_V7,
  MIND_CONTROL_ESCAPE_PRIORITY_V7,
  MIND_CONTROL_PRIORITY_V7,
  CONTROLLED_CHIP_PRIORITY_V7,
  controlledRetainedValueV7,
  controlledUnitValueV7,
  martianFactsV7,
  martianRetainedValueV7,
  martianTargetBonusV7,
  mindControlExposedV7,
  mindControlValueV7,
  readyHostileBrainsV7,
  setMartianPolicyOptionsV7,
} from "../../src/ai/v7-martian";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "../../src/engine/index";
import {
  candidatesV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { candySeatKeepsOlderPolicyV7 } from "../fixtures/v7-older-policy";

// The Candy army seat (`pulp_wars-jdb.13`): this file pins the older
// policy on matches with a Candy seat, as it was written. No match
// reaches that policy through its factions any more, so the file takes
// the Candy out of the army factions (tests/fixtures/v7-older-policy.ts).
candySeatKeepsOlderPolicyV7();

// The Mind Control revision's Normal AI pass (`pulp_wars-b5f.3`,
// docs/product/RULESET_7_MIND_CONTROL.md sections 8 and 10). Two-seat
// 11 x 11 field (tests/fixtures/v7-martian.ts): seat 0 is the viewer
// (capital (8, 8)), seat 1 the opponent (capital (2, 8)); villages (5, 5),
// (8, 5), (5, 8); every other land tile is Grass.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** Seat 0 Martian (the viewer) against seat 1 of `opponent`. */
const asMartian = (
  pieces: readonly MartianPieceV7[],
  opponent: "ORIGINAL" | "GOBLIN" | "UNDEAD" | "CANDY" = "ORIGINAL",
): GameStateV7 => martianFieldV7(pieces, { factions: ["MARTIAN", opponent] });
/** Seat 0 of `viewer` (the viewer) against seat 1 Martian. */
const againstMartian = (
  pieces: readonly MartianPieceV7[],
  viewer: "ORIGINAL" | "GOBLIN" = "ORIGINAL",
): GameStateV7 => martianFieldV7(pieces, { factions: [viewer, "MARTIAN"] });

/** Runs `run` with the baseline (`mindControlPlay` off). */
function baseline<T>(run: () => T): T {
  const previous = setMartianPolicyOptionsV7({ mindControlPlay: false });
  try {
    return run();
  } finally {
    setMartianPolicyOptionsV7(previous);
  }
}

const unitAt = (view: PlayerViewV7, where: CoordV7): PublicUnitV7 => {
  const unit = view.units.find(
    (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${where.x},${where.y}`);
  return unit;
};

const mindControlOf = (state: GameStateV7, brain: CoordV7) =>
  unitCandidatesV7(state, brain, "MIND_CONTROL")[0];

describe("Mind Control AI: targets by what they become", () => {
  it("takes a 9-Coin Knight over a 2-Coin Fighter at equal HP", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 5 }),
      foe("KNIGHT", 6, 4, { hp: 5 }),
    ]);
    const best = mindControlOf(state, at(5, 5));
    expect(best?.command).toEqual({
      kind: "MIND_CONTROL",
      unitId: unitIdAtV7(state, at(5, 5)),
      targetUnitId: unitIdAtV7(state, at(6, 4)),
    });
    expect(best?.score.priority).toBe(MIND_CONTROL_PRIORITY_V7);
    // It is the Brain's first choice, above any kill.
    expect(unitCandidatesV7(state, at(5, 5))[0]?.command.kind).toBe(
      "MIND_CONTROL",
    );
  });

  it("counts kills, then breaks ties by the lower unit ID", () => {
    // A Fighter with 8 kills (2 + 8) is worth more than a Knight (9).
    const veteran = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 5, kills: 8 }),
      foe("KNIGHT", 6, 4, { hp: 5 }),
    ]);
    expect(
      (mindControlOf(veteran, at(5, 5))?.command as { targetUnitId: number })
        .targetUnitId,
    ).toBe(unitIdAtV7(veteran, at(4, 4)));
    // The baseline took the Knight (cost x 10 first).
    baseline(() =>
      expect(
        (mindControlOf(veteran, at(5, 5))?.command as { targetUnitId: number })
          .targetUnitId,
      ).toBe(unitIdAtV7(veteran, at(6, 4))),
    );
    // Two Fighters of equal value that each live through the other's hit:
    // the lower ID.
    const tie = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 6 }),
      foe("FIGHTER", 6, 4, { hp: 6 }),
    ]);
    const ids = [unitIdAtV7(tie, at(4, 4)), unitIdAtV7(tie, at(6, 4))];
    expect(
      (mindControlOf(tie, at(5, 5))?.command as { targetUnitId: number })
        .targetUnitId,
    ).toBe(Math.min(...ids));
    // The third pass (`pulp_wars-9s0.14`): the one at 3 HP would be killed
    // by the other the moment it is taken, so the Brain takes the one it
    // keeps (it was "the lower ID, whatever the HP").
    const doomed = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 3 }),
      foe("FIGHTER", 6, 4, { hp: 6 }),
    ]);
    expect(
      (mindControlOf(doomed, at(5, 5))?.command as { targetUnitId: number })
        .targetUnitId,
    ).toBe(unitIdAtV7(doomed, at(6, 4)));
  });

  it("discounts the abilities a target loses under control", () => {
    const view = viewerViewV7(
      asMartian(
        [
          own("CAPTAIN", 5, 5),
          foe("CAPTAIN", 4, 4, { hp: 5 }),
          foe("GUARD", 6, 4, { hp: 5 }),
          foe("FIGHTER", 6, 6, { hp: 5 }),
        ],
        "UNDEAD",
      ),
    );
    // Necromancer 5 - Raise Dead; Zombie 3 - Infect - Bite; Skeleton 2.
    expect(mindControlValueV7(view, unitAt(view, at(4, 4)))).toBe(4);
    expect(mindControlValueV7(view, unitAt(view, at(6, 4)))).toBe(1);
    expect(mindControlValueV7(view, unitAt(view, at(6, 6)))).toBe(2);
  });
});

describe("Mind Control AI: no setup hit (bolder abilities, 7r99)", () => {
  // `pulp_wars-w49.42`: a Brain takes any adjacent unit at any HP, so the
  // setup and focus-fire hits (1182, 1177) that wounded a target to 6 HP
  // are gone: a Grunt's hit on a unit the Brain takes this turn is never
  // ranked above the Mind Control, and the Brain takes the unit whole.
  it("takes a full-HP unit next to the Brain rather than hitting it first", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 4),
      own("FIGHTER", 3, 4),
      foe("KNIGHT", 4, 4),
    ]);
    const view = viewerViewV7(state);
    const brain = unitIdAtV7(state, at(5, 4));
    const knight = unitIdAtV7(state, at(4, 4));
    const take: CommandV7 = {
      kind: "MIND_CONTROL",
      unitId: brain,
      targetUnitId: knight,
    };
    expect(queryPlayerCommandsV7(view)).toContainEqual(take);
    expect(scoreCommandV7(view, take).priority).toBe(MIND_CONTROL_PRIORITY_V7);
    const hit: CommandV7 = {
      kind: "ATTACK",
      unitId: unitIdAtV7(state, at(3, 4)),
      targetUnitId: knight,
    };
    expect(scoreCommandV7(view, hit).priority).toBeLessThan(
      MIND_CONTROL_PRIORITY_V7,
    );
    expect(unitCandidatesV7(state, at(5, 4))[0]?.command).toEqual(take);
  });

  it("approaches an unwounded unit to take it", () => {
    // A full-HP Goblin (6 / 6 HP) is a target now; the Brain on (7, 4)
    // steps beside it.
    const state = asMartian(
      [own("CAPTAIN", 7, 4), foe("FIGHTER", 5, 4)],
      "GOBLIN",
    );
    expect(
      unitCandidatesV7(state, at(7, 4), "MOVE").some(
        (item) => item.score.priority >= MIND_CONTROL_APPROACH_PRIORITY_V7,
      ),
    ).toBe(true);
  });
});

describe("Mind Control AI: the most valuable adjacent unit, three at a time (7r99)", () => {
  it("takes a full-HP giant over a wounded Knight and a Fighter", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 3 }),
      foe("KNIGHT", 6, 4, { hp: 5 }),
      foe("JUGGERNAUT", 5, 6),
    ]);
    const view = viewerViewV7(state);
    // A giant has no cost: its Score value (12) is what it is worth.
    expect(mindControlValueV7(view, unitAt(view, at(5, 6)))).toBeGreaterThan(
      mindControlValueV7(view, unitAt(view, at(6, 4))),
    );
    expect(mindControlOf(state, at(5, 5))?.command).toEqual({
      kind: "MIND_CONTROL",
      unitId: unitIdAtV7(state, at(5, 5)),
      targetUnitId: unitIdAtV7(state, at(5, 6)),
    });
  });

  it("takes a ship next to the Brain", () => {
    const state = martianFieldV7(
      [
        own("CAPTAIN", 4, 3),
        foe("BATTLESHIP", 5, 3, { form: "NAVAL" }),
        foe("FIGHTER", 1, 1),
      ],
      { factions: ["MARTIAN", "ORIGINAL"], water: [at(5, 3)] },
    );
    expect(mindControlOf(state, at(4, 3))?.command).toEqual({
      kind: "MIND_CONTROL",
      unitId: unitIdAtV7(state, at(4, 3)),
      targetUnitId: unitIdAtV7(state, at(5, 3)),
    });
  });

  it("a Brain holding three neither takes nor approaches, and is no threat to others", () => {
    const pieces = [
      own("CAPTAIN", 7, 4),
      foe("FIGHTER", 7, 3, { controlledBy: at(7, 4) }),
      foe("FIGHTER", 8, 3, { controlledBy: at(7, 4) }),
      foe("FIGHTER", 8, 4, { controlledBy: at(7, 4) }),
      foe("KNIGHT", 5, 4),
    ];
    const state = asMartian(pieces);
    expect(mindControlOf(state, at(7, 4))).toBeUndefined();
    expect(
      unitCandidatesV7(state, at(7, 4), "MOVE").some(
        (item) => item.score.priority >= MIND_CONTROL_APPROACH_PRIORITY_V7,
      ),
    ).toBe(false);
    // Against Martians: the full Brain is not a ready hostile Brain.
    const human = againstMartian([
      foe("CAPTAIN", 7, 4),
      own("FIGHTER", 7, 3, { controlledBy: at(7, 4) }),
      own("FIGHTER", 8, 3, { controlledBy: at(7, 4) }),
      own("FIGHTER", 8, 4, { controlledBy: at(7, 4) }),
      own("KNIGHT", 5, 4),
    ]);
    const view = viewerViewV7(human);
    expect(
      readyHostileBrainsV7(
        view,
        martianFactsV7(view),
        (owner) => owner !== view.viewer.id,
      ),
    ).toEqual([]);
  });
});

describe("Mind Control AI: playing controlled units", () => {
  it("a controlled Goblin Kabooms when the Goblin policy would", () => {
    const state = asMartian(
      [
        own("CAPTAIN", 7, 2),
        foe("FIGHTER", 4, 2, { controlledBy: at(7, 2) }),
        // Warbosses (Orc Brutes are Blast-proof since the Goblin pass).
        foe("CAPTAIN", 3, 2, { hp: 3 }),
        foe("CAPTAIN", 5, 2, { hp: 3 }),
        foe("CAPTAIN", 4, 3, { hp: 3 }),
      ],
      "GOBLIN",
    );
    const goblin = unitIdAtV7(state, at(4, 2));
    const kaboom: CommandV7 = { kind: "KABOOM", unitId: goblin };
    expect(queryPlayerCommandsV7(viewerViewV7(state))).toContainEqual(kaboom);
    const score = scoreCommandV7(viewerViewV7(state), kaboom);
    expect(score.priority).toBe(KABOOM_MULTI_KILL_PRIORITY_V7);
    expect(unitCandidatesV7(state, at(4, 2))[0]?.command).toEqual(kaboom);
  });

  it("a controlled Goblin walks into a Kaboom by the Goblin rules", () => {
    // The Martian pass (`pulp_wars-w49.14`): a Martian seat against
    // Goblins plays the army rules, whose opening (villages first, ten
    // rounds) keeps a capturer out of the enemy's reach; round 12.
    const state: GameStateV7 = {
      ...asMartian(
        [
          own("CAPTAIN", 8, 2),
          foe("FIGHTER", 5, 2, { controlledBy: at(8, 2) }),
          foe("CAPTAIN", 3, 2, { hp: 3 }),
          foe("CAPTAIN", 3, 3, { hp: 3 }),
          foe("CAPTAIN", 3, 1, { hp: 3 }),
        ],
        "GOBLIN",
      ),
      round: 12,
    };
    const setups = (): number =>
      unitCandidatesV7(state, at(5, 2), "MOVE").filter(
        (item) => item.score.priority === 1177,
      ).length;
    expect(setups()).toBeGreaterThan(0);
    // The baseline played it by the viewer's (Martian) rules.
    baseline(() => expect(setups()).toBe(0));
  });

  // The Martian pass's correction (`pulp_wars-w49.14`): `DISBAND` on a
  // controlled unit is offered (it is Release); the policy still never
  // asks for it.
  it("never releases a controlled unit", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("KNIGHT", 5, 6, { hp: 4, controlledBy: at(5, 5) }),
    ]);
    const view = viewerViewV7(state);
    const knight = unitIdAtV7(state, at(5, 6));
    const disband: CommandV7 = { kind: "DISBAND", unitId: knight };
    expect(queryPlayerCommandsV7(view)).toContainEqual(disband);
    expect(scoreCommandV7(view, disband).priority).toBe(-1);
    expect(
      candidatesV7(state).some((item) => item.command.kind === "DISBAND"),
    ).toBe(false);
  });

  it("values a controlled unit by its kind cost scaled by HP", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("KNIGHT", 5, 6, { hp: 5, kills: 1, controlledBy: at(5, 5) }),
    ]);
    const view = viewerViewV7(state);
    const knight = unitAt(view, at(5, 6));
    const brain = unitAt(view, at(5, 5));
    const facts = martianFactsV7(view);
    // Knight cost 9, 13 HP (tuning 1, 7r46; 10 before): 36 x 5 / 13 = 13,
    // plus 5 HP and 2 for its kill.
    expect(controlledRetainedValueV7(view, knight)).toBe(20);
    expect(martianRetainedValueV7(view, facts, knight, 0)).toBe(20);
    // The Brain carries it.
    expect(martianRetainedValueV7(view, facts, brain, 28)).toBe(28 + 20);
    // The baseline: HP only (the Thrall).
    baseline(() =>
      expect(martianRetainedValueV7(view, facts, knight, 0)).toBe(5 + 2),
    );
  });

  it("drops the Thrall's front-row chip priority", () => {
    // (The Martian pass, `pulp_wars-w49.14`: against a seat that plays no
    // army rules (a Candy one since the Dinosaur pass, `pulp_wars-w49.15`), a
    // controlled Toffee Trooper. Against a Human seat the army rules give a
    // committed unit's hit its own priority, with or without the switch.)
    const state = asMartian(
      [
        own("CAPTAIN", 8, 2),
        foe("FIGHTER", 4, 4, { controlledBy: at(8, 2) }),
        foe("FIGHTER", 3, 4, { hp: 9 }),
      ],
      "CANDY",
    );
    const chip = unitCandidatesV7(state, at(4, 4), "ATTACK")[0];
    expect(chip).toBeDefined();
    expect(chip?.score.priority).not.toBe(CONTROLLED_CHIP_PRIORITY_V7);
    baseline(() =>
      expect(
        unitCandidatesV7(state, at(4, 4), "ATTACK")[0]?.score.priority,
      ).toBe(CONTROLLED_CHIP_PRIORITY_V7),
    );
  });
});

describe("Mind Control AI: against Martians", () => {
  it("doubles a hostile Brain's bonus when its unit was the viewer's own", () => {
    // Seat 1's Brain controls seat 0's Knight.
    const state = againstMartian([
      foe("CAPTAIN", 5, 5),
      own("KNIGHT", 5, 6, { hp: 4, controlledBy: at(5, 5) }),
      own("FIGHTER", 8, 8),
    ]);
    const human = viewerViewV7(state);
    const martianId = state.players.find(
      (player) => player.faction === "MARTIAN",
    )?.id;
    if (martianId === undefined) throw new Error("no Martian seat");
    const martian = viewForV7(state, martianId);
    const value = controlledUnitValueV7(human, unitAt(human, at(5, 6)));
    expect(value).toBe(9 * 4 + 4);
    expect(
      martianTargetBonusV7(
        human,
        martianFactsV7(human),
        unitAt(human, at(5, 5)),
      ),
    ).toBe(2 * value);
    // Not the viewer's own (here: seen by its controller): once.
    expect(
      martianTargetBonusV7(
        martian,
        martianFactsV7(martian),
        unitAt(martian, at(5, 5)),
      ),
    ).toBe(value);
    // The baseline: 8 plus its HP.
    baseline(() =>
      expect(
        martianTargetBonusV7(
          human,
          martianFactsV7(human),
          unitAt(human, at(5, 5)),
        ),
      ).toBe(8 + 4),
    );
  });

  it("steps the most valuable unit out of a ready Brain's reach first", () => {
    const state = againstMartian([
      own("KNIGHT", 6, 3, { hp: 5 }),
      own("FIGHTER", 6, 5, { hp: 5 }),
      foe("CAPTAIN", 4, 4),
    ]);
    const escapes = candidatesV7(state).filter(
      (item) => item.score.priority === MIND_CONTROL_ESCAPE_PRIORITY_V7,
    );
    expect(escapes.length).toBeGreaterThan(0);
    expect(
      escapes[0]?.command.kind === "MOVE" && escapes[0].command.unitId,
    ).toBe(unitIdAtV7(state, at(6, 3)));
  });

  it("treats every unit as exposed, unwounded, a giant, or a ship (7r99)", () => {
    // `pulp_wars-w49.42`: a full-HP Goblin (6 / 6) next to a ready Brain's
    // reach steps away too (the wounded test is gone).
    const state = againstMartian(
      [own("FIGHTER", 6, 3), foe("CAPTAIN", 4, 3)],
      "GOBLIN",
    );
    expect(
      unitCandidatesV7(state, at(6, 3)).some(
        (item) => item.score.priority === MIND_CONTROL_ESCAPE_PRIORITY_V7,
      ),
    ).toBe(true);
    const sea = martianFieldV7(
      [
        own("JUGGERNAUT", 6, 3),
        own("BATTLESHIP", 6, 5, { form: "NAVAL" }),
        foe("CAPTAIN", 4, 4),
        foe("FIGHTER", 1, 1),
      ],
      { factions: ["ORIGINAL", "MARTIAN"], water: [at(6, 5)] },
    );
    const view = viewerViewV7(sea);
    const brains = readyHostileBrainsV7(
      view,
      martianFactsV7(view),
      (owner) => owner !== view.viewer.id,
    );
    expect(brains).toHaveLength(1);
    for (const where of [at(6, 3), at(6, 5)]) {
      const unit = unitAt(view, where);
      expect(unit.hp).toBe(unit.maxHp);
      expect(
        mindControlExposedV7(view, unit, unit.at, unit.hp, brains),
        `${where.x},${where.y}`,
      ).toBe(true);
      // Three tiles from the Brain it is safe.
      expect(
        mindControlExposedV7(view, unit, at(7, where.y), unit.hp, brains),
      ).toBe(false);
    }
  });
});
