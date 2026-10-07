import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import { KABOOM_MULTI_KILL_PRIORITY_V7 } from "../../src/ai/v7-goblin";
import {
  MIND_CONTROL_ESCAPE_PRIORITY_V7,
  MIND_CONTROL_FOCUS_PRIORITY_V7,
  MIND_CONTROL_PRIORITY_V7,
  MIND_CONTROL_SETUP_PRIORITY_V7,
  CONTROLLED_CHIP_PRIORITY_V7,
  controlledRetainedValueV7,
  controlledUnitValueV7,
  martianFactsV7,
  martianRetainedValueV7,
  martianTargetBonusV7,
  mindControlValueV7,
  setMartianPolicyOptionsV7,
} from "../../src/ai/v7-martian";
import {
  queryCombatPreviewV7,
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
  opponent: "ORIGINAL" | "GOBLIN" | "UNDEAD" = "ORIGINAL",
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
    // Two Fighters of equal value: the lower ID, whatever the HP.
    const tie = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 3 }),
      foe("FIGHTER", 6, 4, { hp: 6 }),
    ]);
    const ids = [unitIdAtV7(tie, at(4, 4)), unitIdAtV7(tie, at(6, 4))];
    expect(
      (mindControlOf(tie, at(5, 5))?.command as { targetUnitId: number })
        .targetUnitId,
    ).toBe(Math.min(...ids));
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

describe("Mind Control AI: the setup", () => {
  // A Grunt hits a wounded Fighter that a ready Brain can reach.
  const setupField = (controlled: boolean): GameStateV7 =>
    asMartian([
      own("CAPTAIN", 5, 5),
      own("FIGHTER", 3, 4),
      foe("FIGHTER", 2, 4, { hp: 8 }),
      ...(controlled ? [foe("FIGHTER", 6, 6, { controlledBy: at(5, 5) })] : []),
    ]);

  it("wounds a target into the Brain's reach, but not at the limit", () => {
    const state = setupField(false);
    const grunt = unitIdAtV7(state, at(3, 4));
    const target = unitIdAtV7(state, at(2, 4));
    const preview = queryCombatPreviewV7(viewerViewV7(state), grunt, target);
    expect(preview?.defenderDies).toBe(false);
    expect(8 - (preview?.damageToDefender ?? 0)).toBeLessThanOrEqual(6);
    const hit: CommandV7 = {
      kind: "ATTACK",
      unitId: grunt,
      targetUnitId: target,
    };
    expect(scoreCommandV7(viewerViewV7(state), hit).priority).toBe(
      MIND_CONTROL_SETUP_PRIORITY_V7,
    );
    // The Brain already controls a unit (limit 1): no setup hit.
    const limited = setupField(true);
    expect(
      scoreCommandV7(viewerViewV7(limited), {
        kind: "ATTACK",
        unitId: unitIdAtV7(limited, at(3, 4)),
        targetUnitId: unitIdAtV7(limited, at(2, 4)),
      }).priority,
    ).toBeLessThan(MIND_CONTROL_SETUP_PRIORITY_V7);
  });

  it("focuses two hits on a valuable target to wound it into control", () => {
    // A full-HP Guard (17 HP, worth 3): no single Grunt hit leaves it at
    // 6 or less, but two do; the Brain stands within reach.
    const state = asMartian([
      own("CAPTAIN", 5, 4),
      own("FIGHTER", 3, 3),
      own("FIGHTER", 3, 5),
      foe("GUARD", 3, 4, { hp: 12 }),
    ]);
    const view = viewerViewV7(state);
    const target = unitIdAtV7(state, at(3, 4));
    const first = unitIdAtV7(state, at(3, 3));
    const second = unitIdAtV7(state, at(3, 5));
    const one = queryCombatPreviewV7(view, first, target);
    const two = queryCombatPreviewV7(view, second, target);
    const left =
      12 - (one?.damageToDefender ?? 0) - (two?.damageToDefender ?? 0);
    expect(12 - (one?.damageToDefender ?? 0)).toBeGreaterThan(6);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(6);
    const hit: CommandV7 = {
      kind: "ATTACK",
      unitId: first,
      targetUnitId: target,
    };
    expect(scoreCommandV7(view, hit).priority).toBe(
      MIND_CONTROL_FOCUS_PRIORITY_V7,
    );
    baseline(() =>
      expect(scoreCommandV7(view, hit).priority).toBeLessThan(
        MIND_CONTROL_FOCUS_PRIORITY_V7,
      ),
    );
  });

  it("does not approach or set up an unwounded unit", () => {
    // A full-HP Goblin (6 / 6 HP) is not a Mind Control target.
    const state = asMartian(
      [own("CAPTAIN", 7, 5), foe("FIGHTER", 3, 5)],
      "GOBLIN",
    );
    expect(
      unitCandidatesV7(state, at(7, 5), "MOVE").some(
        (item) => item.score.priority >= 1183,
      ),
    ).toBe(false);
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
    const state = asMartian(
      [
        own("CAPTAIN", 8, 2),
        foe("FIGHTER", 5, 2, { controlledBy: at(8, 2) }),
        foe("CAPTAIN", 3, 2, { hp: 3 }),
        foe("CAPTAIN", 3, 3, { hp: 3 }),
        foe("CAPTAIN", 3, 1, { hp: 3 }),
      ],
      "GOBLIN",
    );
    const setups = (): number =>
      unitCandidatesV7(state, at(5, 2), "MOVE").filter(
        (item) => item.score.priority === 1177,
      ).length;
    expect(setups()).toBeGreaterThan(0);
    // The baseline played it by the viewer's (Martian) rules.
    baseline(() => expect(setups()).toBe(0));
  });

  it("never disbands a controlled unit", () => {
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("KNIGHT", 5, 6, { hp: 4, controlledBy: at(5, 5) }),
    ]);
    const view = viewerViewV7(state);
    const knight = unitIdAtV7(state, at(5, 6));
    const disband: CommandV7 = { kind: "DISBAND", unitId: knight };
    expect(queryPlayerCommandsV7(view)).not.toContainEqual(disband);
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
    const state = asMartian([
      own("CAPTAIN", 8, 2),
      foe("FIGHTER", 4, 4, { controlledBy: at(8, 2) }),
      foe("FIGHTER", 3, 4, { hp: 9 }),
    ]);
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

  it("steps the most valuable wounded unit out of a ready Brain's reach first", () => {
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

  it("leaves an unwounded unit alone (the wounded test)", () => {
    // A full-HP Goblin (6 / 6) cannot be Mind Controlled.
    const state = againstMartian(
      [own("FIGHTER", 6, 3), foe("CAPTAIN", 4, 3)],
      "GOBLIN",
    );
    const escapes = (): number =>
      unitCandidatesV7(state, at(6, 3)).filter(
        (item) => item.score.priority === MIND_CONTROL_ESCAPE_PRIORITY_V7,
      ).length;
    expect(escapes()).toBe(0);
    baseline(() => expect(escapes()).toBeGreaterThan(0));
    // Wounded, it steps away.
    const wounded = againstMartian(
      [own("FIGHTER", 6, 3, { hp: 5 }), foe("CAPTAIN", 4, 3)],
      "GOBLIN",
    );
    expect(
      unitCandidatesV7(wounded, at(6, 3)).some(
        (item) => item.score.priority === MIND_CONTROL_ESCAPE_PRIORITY_V7,
      ),
    ).toBe(true);
  });
});
