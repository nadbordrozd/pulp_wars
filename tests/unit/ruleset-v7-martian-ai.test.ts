import { describe, expect, it } from "vitest";
import {
  BEAM_DOWN_PRIORITY_V7,
  LEGACY_MARTIAN_POLICY_OPTIONS_V7,
  MARTIAN_RESEARCH_PRIORITY_V7,
  MIND_CONTROL_ESCAPE_PRIORITY_V7,
  MIND_CONTROL_PRIORITY_V7,
  MOTHERSHIP_GUARD_PRIORITY_V7,
  RANGED_STEP_BACK_PRIORITY_V7,
  RAY_KITE_PRIORITY_V7,
  SHIELD_BREAK_PRIORITY_V7,
  TRACTOR_CAPTURE_PRIORITY_V7,
  martianArmyCountsV7,
  martianProductionAdjustmentV7,
  martianResearchV7,
  setMartianPolicyOptionsV7,
  type MartianPolicyOptionsV7,
} from "../../src/ai/v7-martian";
import { ARMY_STEP_BACK_PRIORITY_V7 } from "../../src/ai/v7-army";
import {
  queryCombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  attackV7,
  candidatesV7,
  moveCandidateV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { checkedV7 } from "../fixtures/v7-builders";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { withoutTechsV7 } from "../fixtures/v7-revision20";
import { candySeatKeepsOlderPolicyV7 } from "../fixtures/v7-older-policy";

// The Candy army seat (`pulp_wars-jdb.13`): this file pins the older
// policy on matches with a Candy seat, as it was written. No match
// reaches that policy through its factions any more, so the file takes
// the Candy out of the army factions (tests/fixtures/v7-older-policy.ts).
candySeatKeepsOlderPolicyV7();

// The Martian Normal AI (`pulp_wars-t6s.3`,
// docs/product/RULESET_7_MARTIANS.md section 12). Two-seat 11 x 11 field:
// seat 0 is the viewer (capital (8, 8)), seat 1 the opponent (capital
// (2, 8)); villages (5, 5), (8, 5), (5, 8); every other land tile is Grass.
//
// The Martian pass (`pulp_wars-w49.14`): a Martian seat against a Human one
// plays the army rules (`src/ai/v7-army.ts`). Under them a capturer steps
// onto a free village and stays there until it has captured it, so the
// positions that put a Grunt or a Ray Gunner on or beside the village
// (5, 5) stand on row 3 now, and a shooter's step back has the army
// priority (`ARMY_STEP_BACK_PRIORITY_V7`).

const own = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: { x, y }, ...extra });
const foe = (
  role: MartianPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 1, role, at: { x, y }, ...extra });

/** Seat 0 Martian (the viewer) against seat 1 Human. */
const asMartian = (pieces: readonly MartianPieceV7[]): GameStateV7 =>
  martianFieldV7(pieces, { factions: ["MARTIAN", "ORIGINAL"] });
/** Seat 0 Human (the viewer) against seat 1 Martian. */
const againstMartian = (pieces: readonly MartianPieceV7[]): GameStateV7 =>
  martianFieldV7(pieces, { factions: ["ORIGINAL", "MARTIAN"] });

const at = (x: number, y: number): CoordV7 => ({ x, y });
/** The field with its neutral villages turned into Grass. */
const withoutVillages = (state: GameStateV7): GameStateV7 =>
  checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.site === "VILLAGE"
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
              site: null,
            }
          : tile,
      ),
    },
  });
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;

describe("Martian Normal AI: heat rays", () => {
  it("fires a full-power ray from where the unit stands before any Move", () => {
    const state = asMartian([own("MARKSMAN", 5, 5), foe("FIGHTER", 3, 5)]);
    const ray = unitCandidatesV7(state, at(5, 5));
    expect(ray[0]?.command).toEqual(attackV7(state, at(5, 5), at(3, 5)));
    expect(
      queryCombatPreviewV7(
        viewerViewV7(state),
        unitIdAtV7(state, at(5, 5)),
        unitIdAtV7(state, at(3, 5)),
      )?.rayPower,
    ).toBe("FULL");
    // No routine Move of a ray unit that can fire at full power now.
    expect(unitCandidatesV7(state, at(5, 5), "MOVE")).toEqual([]);
  });

  it("holds its tile while a non-ray hostile unit is three tiles away", () => {
    const state = asMartian([own("MARKSMAN", 6, 3), foe("FIGHTER", 3, 3)]);
    expect(unitCandidatesV7(state, at(6, 3), "MOVE")).toEqual([]);
    // Without the approaching unit it walks.
    const free = asMartian([own("MARKSMAN", 6, 3), foe("FIGHTER", 1, 9)]);
    expect(unitCandidatesV7(free, at(6, 3), "MOVE").length).toBeGreaterThan(0);
  });

  it("steps a Cooling ray unit out of melee reach before its half shot", () => {
    const state = asMartian([
      own("MARKSMAN", 5, 3, { cooling: "COOLING" }),
      foe("FIGHTER", 4, 3),
    ]);
    const best = unitCandidatesV7(state, at(5, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ARMY_STEP_BACK_PRIORITY_V7);
    // Against a seat that does not play the army rules (a Candy one since
    // the Dinosaur pass, `pulp_wars-w49.15`): the kite priority.
    const other = martianFieldV7(
      [own("MARKSMAN", 5, 3, { cooling: "COOLING" }), foe("FIGHTER", 4, 3)],
      { factions: ["MARTIAN", "CANDY"] },
    );
    expect(unitCandidatesV7(other, at(5, 3))[0]?.score.priority).toBe(
      RAY_KITE_PRIORITY_V7,
    );
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 0 : Math.abs(end.x - 4)).toBe(2);
  });

  it("refuses a Pierce shot that kills an own unit without killing the target", () => {
    // A full-power Tripod ray on a Guard (15 HP) pierces the 2-HP Grunt
    // behind it (`pulp_wars-b5f.2`: from range 2, the Tripod's only range).
    const pieces = [
      own("CATAPULT", 7, 5),
      foe("GUARD", 5, 5),
      own("FIGHTER", 4, 5, { hp: 2, shield: 0 }),
    ];
    const state = asMartian(pieces);
    const shot = attackV7(state, at(7, 5), at(5, 5));
    expect(candidatesV7(state).map((item) => item.command)).not.toContainEqual(
      shot,
    );
    // With a hostile unit behind instead, it fires.
    const clean = asMartian([
      own("CATAPULT", 7, 5),
      foe("GUARD", 5, 5),
      foe("FIGHTER", 4, 5),
    ]);
    expect(candidatesV7(clean).map((item) => item.command)).toContainEqual(
      attackV7(clean, at(7, 5), at(5, 5)),
    );
  });
});

describe("Martian Normal AI: ranged play (`pulp_wars-b5f.2`)", () => {
  const withOptions = <T>(
    options: Partial<MartianPolicyOptionsV7>,
    run: () => T,
  ): T => {
    const previous = setMartianPolicyOptionsV7(options);
    try {
      return run();
    } finally {
      setMartianPolicyOptionsV7(previous);
    }
  };

  it("a Grunt next to a melee unit steps back to shoot from two tiles", () => {
    const state = asMartian([own("FIGHTER", 5, 3), foe("FIGHTER", 4, 3)]);
    const best = unitCandidatesV7(state, at(5, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(ARMY_STEP_BACK_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(
      end === undefined
        ? 0
        : Math.max(Math.abs(end.x - 4), Math.abs(end.y - 3)),
    ).toBe(2);
    // Against a seat that does not play the army rules (a Candy one since
    // the Dinosaur pass, `pulp_wars-w49.15`): the old priority.
    const other = martianFieldV7([own("FIGHTER", 5, 3), foe("FIGHTER", 4, 3)], {
      factions: ["MARTIAN", "CANDY"],
    });
    expect(unitCandidatesV7(other, at(5, 3))[0]?.score.priority).toBe(
      RANGED_STEP_BACK_PRIORITY_V7,
    );
    // The baseline policy shoots from where it stands (or holds).
    withOptions(LEGACY_MARTIAN_POLICY_OPTIONS_V7, () => {
      expect(
        unitCandidatesV7(other, at(5, 3)).some(
          (item) => item.score.priority === RANGED_STEP_BACK_PRIORITY_V7,
        ),
      ).toBe(false);
    });
  });

  it("a Grunt next to a hostile shooter that answers at range 2 stays", () => {
    const state = asMartian([own("FIGHTER", 5, 3), foe("MARKSMAN", 4, 3)]);
    expect(
      unitCandidatesV7(state, at(5, 3)).some(
        (item) =>
          item.command.kind === "MOVE" &&
          (item.score.priority === RANGED_STEP_BACK_PRIORITY_V7 ||
            item.score.priority === ARMY_STEP_BACK_PRIORITY_V7),
      ),
    ).toBe(false);
  });

  it("a Tripod with only an adjacent target strides away to fire from two tiles", () => {
    // Since the Tripod captures (`pulp_wars-ke95`), villages first keeps it
    // on the village (5, 5) and out of the Fighter's reach, so the scene has
    // no villages.
    const state = withoutVillages(
      asMartian([own("CATAPULT", 5, 5), foe("FIGHTER", 4, 5)]),
    );
    // The adjacent Fighter is not a target (minimum range 2).
    expect(unitCandidatesV7(state, at(5, 5), "ATTACK")).toEqual([]);
    const best = unitCandidatesV7(state, at(5, 5))[0];
    expect(best?.command.kind).toBe("MOVE");
    // (The army priority of the step back, which is also that of a
    // committed ranged unit's Move to a shot.)
    expect(best?.score.priority).toBe(ARMY_STEP_BACK_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(
      end === undefined
        ? 0
        : Math.max(Math.abs(end.x - 4), Math.abs(end.y - 5)),
    ).toBe(2);
  });
});

describe("Martian Normal AI: Saucer, Brain, and Mothership", () => {
  it("beams a freshly trained Grunt from the capital to the front", () => {
    const state = asMartian([
      // The Grunt trained this turn: exhausted on the capital center.
      own("FIGHTER", 8, 8, {
        activation: { moved: true, handled: true, captured: true },
      }),
      own("RAIDER", 4, 6),
      own("FIGHTER", 4, 7),
      // The villages have nearer capturers, so the new Grunt marches.
      own("FIGHTER", 8, 6),
      own("FIGHTER", 5, 6),
      foe("FIGHTER", 1, 3),
    ]);
    const saucer = unitCandidatesV7(state, at(4, 6));
    const best = saucer[0];
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_PRIORITY_V7);
    if (best?.command.kind === "BEAM_DOWN")
      expect(best.command.passengerUnitId).toBe(unitIdAtV7(state, at(8, 8)));
    // Before `pulp_wars-1wy.4` (Beam Down needed an unmoved carrier) the
    // Saucer waited unmoved where it could beam; it no longer has to
    // (`ruleset-v7-martian-mobility-ai.test.ts`).
    const previous = setMartianPolicyOptionsV7({ mobilityPlay: false });
    try {
      expect(unitCandidatesV7(state, at(4, 6), "MOVE")).toEqual([]);
    } finally {
      setMartianPolicyOptionsV7(previous);
    }
  });

  it("takes a Mind Control on the most valuable convertible target", () => {
    // (The third pass, `pulp_wars-9s0.14`: the Marksman has 6 HP, so that
    // it lives through the Fighter's hit once it is taken. At 4 HP it
    // would be killed at once, and the Brain takes the unit it keeps.)
    const state = asMartian([
      own("CAPTAIN", 5, 5),
      foe("FIGHTER", 4, 4, { hp: 5 }),
      foe("MARKSMAN", 6, 3, { hp: 6 }),
    ]);
    const best = unitCandidatesV7(state, at(5, 5))[0];
    expect(best?.command).toEqual({
      kind: "MIND_CONTROL",
      unitId: unitIdAtV7(state, at(5, 5)),
      targetUnitId: unitIdAtV7(state, at(6, 3)),
    });
    expect(best?.score.priority).toBe(MIND_CONTROL_PRIORITY_V7);
  });

  it("pulls a defender off a hostile center next to an own capturer", () => {
    const state = asMartian([
      own("KNIGHT", 4, 8),
      own("FIGHTER", 2, 7),
      foe("FIGHTER", 2, 8),
    ]);
    const best = candidatesV7(state)[0];
    expect(best?.command).toEqual({
      kind: "TRACTOR_BEAM",
      unitId: unitIdAtV7(state, at(4, 8)),
      targetUnitId: unitIdAtV7(state, at(2, 8)),
    });
    expect(best?.score.priority).toBe(TRACTOR_CAPTURE_PRIORITY_V7);
  });

  it("never pulls a hostile unit for nothing", () => {
    // `pulp_wars-1wy.4`: a Mothership that can still shoot pulls and then
    // shoots (`ruleset-v7-martian-mobility-ai.test.ts`); one that has shot
    // gains nothing from the pull.
    const state = asMartian([
      own("KNIGHT", 5, 5, {
        activation: { attacked: true, attacksUsed: 1, handled: true },
      }),
      foe("FIGHTER", 3, 3),
    ]);
    expect(
      candidatesV7(state).some((item) => item.command.kind === "TRACTOR_BEAM"),
    ).toBe(false);
    // The policy of `pulp_wars-1wy.3`: no pull for a fresh Mothership.
    const fresh = asMartian([own("KNIGHT", 5, 5), foe("FIGHTER", 3, 3)]);
    const previous = setMartianPolicyOptionsV7({ mobilityPlay: false });
    try {
      expect(
        candidatesV7(fresh).some(
          (item) => item.command.kind === "TRACTOR_BEAM",
        ),
      ).toBe(false);
    } finally {
      setMartianPolicyOptionsV7(previous);
    }
  });
});

describe("Martian Normal AI: machines and water", () => {
  it("does not end a walker's Move on water within reach of a hostile boat", () => {
    const state = martianFieldV7(
      [own("CATAPULT", 5, 2), foe("PATROL_BOAT", 8, 0, { form: "NAVAL" })],
      {
        factions: ["MARTIAN", "ORIGINAL"],
        water: [at(6, 1), at(6, 0), at(7, 0), at(7, 1), at(8, 0)],
      },
    );
    // Since the Tripod captures (`pulp_wars-ke95`), with villages on the
    // field it would hold back for them (villages first), so the scene has
    // none.
    const moves = unitCandidatesV7(withoutVillages(state), at(5, 2), "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    for (const item of moves) {
      const end = endOf(item.command);
      expect(end === undefined ? false : end.x >= 6 && end.y <= 1).toBe(false);
    }
  });
});

describe("Martian Normal AI: production and research", () => {
  it("values every role by HP plus twice its Shield and trains bodies first under threat", () => {
    const view = viewerViewV7(asMartian([own("FIGHTER", 7, 7)]));
    const counts = martianArmyCountsV7(view);
    // Grunt: Shield 2 (+4), and +14 in a threatened city (`pulp_wars-b5f.2`:
    // 12 before its cost rose to 3); in the preferred role its repetition
    // costs 5 a Grunt instead of 8 (+3 for the one).
    expect(
      martianProductionAdjustmentV7(
        view,
        "FIGHTER",
        counts,
        false,
        true,
        false,
      ),
    ).toBe(4);
    expect(
      martianProductionAdjustmentV7(view, "FIGHTER", counts, true, true, false),
    ).toBe(19);
    expect(
      martianProductionAdjustmentV7(view, "FIGHTER", counts, false, true, true),
    ).toBe(7);
    // The Projector, Saucer, and Brain wait while the city is threatened.
    for (const role of ["GUARD", "RAIDER", "CAPTAIN"] as const)
      expect(
        martianProductionAdjustmentV7(view, role, counts, true, true, true),
      ).toBeLessThan(-20);
    // Tripod and Mothership: bought when offered.
    expect(
      martianProductionAdjustmentV7(
        view,
        "CATAPULT",
        counts,
        false,
        true,
        true,
      ),
    ).toBe(4 + 30);
    expect(
      martianProductionAdjustmentV7(view, "KNIGHT", counts, false, true, true),
    ).toBe(8 + 30);
  });

  it("trains a Grunt, not a Projector, in a threatened city", () => {
    // Projector, Saucer, and Brain researched; no Tripod or Mothership.
    // (Against a Candy seat, which plays no army rules (the test used a
    // Dinosaur one until the Dinosaur pass, `pulp_wars-w49.15`): the rule of
    // `pulp_wars-t6s.3`.
    // Against a Human, Goblin, or Undead seat the army rules train the
    // best garrison, tests/unit/ruleset-v7-martian-pass.test.ts.)
    const state = martianFieldV7(
      [own("FIGHTER", 9, 6), foe("FIGHTER", 6, 8), foe("FIGHTER", 6, 7)],
      {
        factions: ["MARTIAN", "CANDY"],
        techs: {
          0: withoutTechsV7("MARTIAN", "SAWMILLING", "CHIVALRY"),
          1: withoutTechsV7("CANDY"),
        },
      },
    );
    const training = candidatesV7(state)
      .map((item) => item.command)
      .filter((command) => command.kind === "TRAIN");
    expect(training.length).toBeGreaterThan(0);
    for (const command of training)
      if (command.kind === "TRAIN") expect(command.role).toBe("FIGHTER");
  });

  it("researches toward its roles in order", () => {
    const base = asMartian([own("FIGHTER", 7, 7)]);
    const view = (techs: readonly string[]) => {
      const current = viewerViewV7(base);
      return {
        ...current,
        viewer: {
          ...current.viewer,
          researchedTechs: techs as typeof current.viewer.researchedTechs,
        },
      };
    };
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Shield
    // Projector is two technologies away (the root, then Force Fields), so
    // the Saucer's Scouting, one away, is the first of the early plan.
    expect(martianResearchV7(view([]), 1, 0, false)?.tech).toBe("SCOUTING");
    expect(martianResearchV7(view(["SCOUTING"]), 1, 0, false)?.tech).toBe(
      "DRILL",
    );
    expect(
      martianResearchV7(view(["SCOUTING", "DRILL"]), 1, 0, false)?.tech,
    ).toBe("FORTIFICATION");
    expect(
      martianResearchV7(
        view(["DRILL", "FORTIFICATION", "SCOUTING"]),
        1,
        3,
        false,
      ),
    ).toBeNull();
    // Marksmanship needs Hunting first.
    const middle = martianResearchV7(
      view(["DRILL", "FORTIFICATION", "SCOUTING"]),
      2,
      3,
      false,
    );
    expect(middle?.tech).toBe("HUNTING");
    expect(middle?.priority).toBe(MARTIAN_RESEARCH_PRIORITY_V7);
    expect(
      martianResearchV7(
        view(["DRILL", "FORTIFICATION", "SCOUTING", "HUNTING", "GATHERING"]),
        2,
        3,
        false,
      )?.tech,
    ).toBe("MARKSMANSHIP");
    // With a small army the role research waits behind training.
    expect(
      martianResearchV7(
        view(["DRILL", "FORTIFICATION", "SCOUTING"]),
        2,
        1,
        false,
      )?.priority,
    ).toBeLessThan(1080);
  });
});

describe("Normal AI against Martians", () => {
  it("finishes a shielded unit with two attackers instead of wounding two", () => {
    // Two Fighters: each hits a Grunt for 5 (Shield 2 first). Together they
    // kill the wounded Grunt (6 HP + Shield 2); the Shield Projector (12 HP
    // + Shield 3) survives both. (Until `pulp_wars-1wy.6` the second unit
    // was a fresh Grunt, which at 8 HP + Shield 2 now dies to the two hits
    // as well.)
    const state = againstMartian([
      own("FIGHTER", 5, 5),
      own("FIGHTER", 5, 3),
      foe("FIGHTER", 4, 4, { hp: 6 }),
      foe("GUARD", 6, 4),
    ]);
    const attacks = candidatesV7(state).filter(
      (item) => item.command.kind === "ATTACK",
    );
    const best = attacks[0];
    expect(best?.command.kind === "ATTACK" && best.command.targetUnitId).toBe(
      unitIdAtV7(state, at(4, 4)),
    );
    expect(best?.score.priority).toBe(SHIELD_BREAK_PRIORITY_V7);
  });

  it("keeps a wounded unit out of a ready Brain's reach", () => {
    const state = againstMartian([
      own("FIGHTER", 6, 3, { hp: 5 }),
      foe("CAPTAIN", 4, 3),
    ]);
    const best = unitCandidatesV7(state, at(6, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(MIND_CONTROL_ESCAPE_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 0 : Math.abs(end.x - 4)).toBeGreaterThan(2);
    // A healthy unit does not care.
    const healthy = againstMartian([
      own("FIGHTER", 6, 3),
      foe("CAPTAIN", 4, 3),
    ]);
    expect(
      unitCandidatesV7(healthy, at(6, 3)).every(
        (item) => item.score.priority !== MIND_CONTROL_ESCAPE_PRIORITY_V7,
      ),
    ).toBe(true);
  });

  it("puts a second unit next to a center a Mothership could empty", () => {
    const state = againstMartian([
      own("FIGHTER", 8, 8),
      own("FIGHTER", 6, 6),
      foe("KNIGHT", 5, 9),
    ]);
    const guard = moveCandidateV7(state, at(6, 6), at(7, 7));
    expect(guard?.score.priority).toBe(MOTHERSHIP_GUARD_PRIORITY_V7);
  });

  it("is unchanged without a Martian seat", () => {
    // Two Fighters on a wounded Fighter that one hit does not kill: no
    // Shield-break tier (1179). Tuning 5 (`pulp_wars-w49.4`): in a Human
    // mirror the two hits are a combined kill of army play (1172; an
    // ordinary chip, 900, before). Tuning 6 (`pulp_wars-w49.6`): the two
    // Fighters outweigh the wounded one and commit, so the hit is a
    // committed melee attack (1174).
    const state = martianFieldV7(
      [
        own("FIGHTER", 5, 5),
        own("FIGHTER", 5, 3),
        foe("FIGHTER", 4, 4, { hp: 8 }),
      ],
      { factions: ["ORIGINAL", "ORIGINAL"] },
    );
    const best = candidatesV7(state).find(
      (item) => item.command.kind === "ATTACK",
    );
    expect(best?.score.priority).toBe(1174);
  });
});
