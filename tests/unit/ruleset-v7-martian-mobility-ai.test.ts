import { describe, expect, it } from "vitest";
import {
  BEAM_DOWN_ATTACK_PRIORITY_V7,
  BEAM_DOWN_EXTRACT_PRIORITY_V7,
  BEAM_DOWN_KILL_PRIORITY_V7,
  BEAM_DOWN_PRIORITY_V7,
  CARRIER_RESCUE_MOVE_PRIORITY_V7,
  DEFAULT_MARTIAN_POLICY_OPTIONS_V7,
  LEGACY_MARTIAN_POLICY_OPTIONS_V7,
  MOTHERSHIP_GUARD_PRIORITY_V7,
  MOTHERSHIP_TARGET_BONUS_V7,
  SAUCER_BIAS_V7,
  SHOOTER_CONTACT_COST_V7,
  SURPLUS_COST_V7,
  TRACTOR_CAPTURE_MOVE_PRIORITY_V7,
  TRACTOR_CAPTURE_PRIORITY_V7,
  TRACTOR_FREE_PRIORITY_V7,
  TRACTOR_KILL_SETUP_PRIORITY_V7,
  martianArmyCountsV7,
  martianFactsV7,
  martianProductionAdjustmentV7,
  martianTargetBonusV7,
  setMartianPolicyOptionsV7,
  type MartianPolicyOptionsV7,
} from "../../src/ai/v7-martian";
import {
  queryPlayerCommandsV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { MONSTER_LAIR_V7, monsterArenaV7 } from "../fixtures/v7-monster-arena";
import {
  candidatesV7,
  moveCandidateV7,
  publicUnitAtV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import {
  martianFieldV7,
  playV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";

// The Martian mobility play (`pulp_wars-1wy.4`,
// docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md section 9) on the rules of
// `pulp_wars-1wy.3`. Two-seat 11 x 11 field: seat 0 is the viewer (capital
// (8, 8)), seat 1 the opponent (capital (2, 8)); villages (5, 5), (8, 5),
// (5, 8); every other land tile is Grass.

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
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
/** A unit that has shot this turn. */
const FIRED = { attacked: true, attacksUsed: 1, handled: true } as const;

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
/** The policy of `pulp_wars-1wy.3` (the head-to-head baseline). */
const baseline = <T>(run: () => T): T =>
  withOptions({ mobilityPlay: false }, run);

describe("Martian mobility play: the switch", () => {
  it("is on by default and off in the legacy options", () => {
    expect(DEFAULT_MARTIAN_POLICY_OPTIONS_V7.mobilityPlay).toBe(true);
    expect(LEGACY_MARTIAN_POLICY_OPTIONS_V7.mobilityPlay).toBe(false);
  });
});

describe("Martian mobility play: the Tractor Beam", () => {
  it("the Mothership pulls with its free beam before it moves or shoots, then shoots what it pulled", () => {
    // Three tiles away: the heavy pull sets the Fighter down next to the
    // Mothership, whose own attack then takes more than half of it.
    const state = asMartian([own("KNIGHT", 5, 3), foe("FIGHTER", 8, 3)]);
    const pull = {
      kind: "TRACTOR_BEAM",
      unitId: unitIdAtV7(state, at(5, 3)),
      targetUnitId: unitIdAtV7(state, at(8, 3)),
    } as const;
    const best = unitCandidatesV7(state, at(5, 3))[0];
    expect(best?.command).toEqual(pull);
    expect(best?.score.priority).toBe(TRACTOR_FREE_PRIORITY_V7);
    // The baseline flew in (1175) and never pulled: its pull was scored
    // without the Mothership's own attack.
    baseline(() => {
      const candidates = unitCandidatesV7(state, at(5, 3));
      expect(candidates[0]?.command.kind).toBe("MOVE");
      expect(
        candidates.some((item) => item.command.kind === "TRACTOR_BEAM"),
      ).toBe(false);
    });
    let pulled = playV7(state, pull).state;
    expect(publicUnitAtV7(pulled, at(6, 3)).id).toBe(pull.targetUnitId);
    // It then shoots what it pulled (the generic Knight rule may first
    // shift it to another tile next to the target).
    const mothership = (
      current: GameStateV7,
    ): ReturnType<typeof candidatesV7>[number] | undefined =>
      candidatesV7(current).find(
        (item) =>
          "unitId" in item.command && item.command.unitId === pull.unitId,
      );
    let next = mothership(pulled);
    if (next?.command.kind === "MOVE") {
      pulled = playV7(pulled, next.command).state;
      next = mothership(pulled);
    }
    expect(next?.command).toEqual({
      kind: "ATTACK",
      unitId: pull.unitId,
      targetUnitId: pull.targetUnitId,
    });
  });

  it("the Mothership does not pull a unit it cannot follow up on", () => {
    // It has shot already: the pull would only bring the Fighter closer.
    const state = asMartian([
      own("KNIGHT", 5, 3, { activation: FIRED }),
      foe("FIGHTER", 8, 3),
    ]);
    expect(
      candidatesV7(state).some((item) => item.command.kind === "TRACTOR_BEAM"),
    ).toBe(false);
  });

  it("a Saucer's pull does not count its own attack", () => {
    // The Saucer spends its action on the pull, so a 2-HP Fighter pulled
    // next to it alone is not a kill (the baseline counted the Saucer).
    const alone = asMartian([
      own("RAIDER", 5, 3),
      foe("FIGHTER", 7, 3, { hp: 2 }),
    ]);
    expect(
      candidatesV7(alone).some((item) => item.command.kind === "TRACTOR_BEAM"),
    ).toBe(false);
    baseline(() =>
      expect(
        unitCandidatesV7(alone, at(5, 3), "TRACTOR_BEAM")[0]?.score.priority,
      ).toBe(TRACTOR_KILL_SETUP_PRIORITY_V7),
    );
  });

  it("a Saucer pulls a target into a Grunt's range for the kill", () => {
    // The Grunt (range 2) stands three tiles from the 5-HP Fighter; the
    // pull brings it to two, where the Grunt's shot (5) kills.
    const state = asMartian([
      own("RAIDER", 5, 3),
      own("FIGHTER", 4, 2),
      foe("FIGHTER", 7, 3, { hp: 5 }),
    ]);
    const pull = unitCandidatesV7(state, at(5, 3))[0];
    expect(pull?.command.kind).toBe("TRACTOR_BEAM");
    expect(pull?.score.priority).toBe(TRACTOR_KILL_SETUP_PRIORITY_V7);
    if (pull === undefined) return;
    const pulled = playV7(state, pull.command).state;
    const shot = unitCandidatesV7(pulled, at(4, 2))[0];
    expect(shot?.command.kind).toBe("ATTACK");
    expect(shot?.score.priority).toBe(1180);
  });

  it("a puller flies to the tile its beam empties a hostile center from, pulls, and the Grunt steps on", () => {
    // The Human capital (2, 8) holds a Fighter; an own Grunt stands next to
    // it and the Saucer far away.
    let state = asMartian([
      own("RAIDER", 7, 6),
      own("FIGHTER", 2, 7),
      foe("FIGHTER", 2, 8),
    ]);
    const saucer = unitIdAtV7(state, at(7, 6));
    const grunt = unitIdAtV7(state, at(2, 7));
    const defender = unitIdAtV7(state, at(2, 8));
    const fly = candidatesV7(state).find((item) => "unitId" in item.command);
    expect(fly?.command.kind).toBe("MOVE");
    expect(fly?.score.priority).toBe(TRACTOR_CAPTURE_MOVE_PRIORITY_V7);
    const landing = fly === undefined ? undefined : endOf(fly.command);
    expect(landing === undefined ? 0 : gap(landing, at(2, 8))).toBe(2);
    // The baseline had no such Move.
    baseline(() =>
      expect(
        unitCandidatesV7(state, at(7, 6)).some(
          (item) => item.score.priority >= TRACTOR_CAPTURE_MOVE_PRIORITY_V7,
        ),
      ).toBe(false),
    );
    if (fly === undefined) return;
    state = playV7(state, fly.command).state;
    const pull = candidatesV7(state).find((item) => "unitId" in item.command);
    expect(pull?.command).toEqual({
      kind: "TRACTOR_BEAM",
      unitId: saucer,
      targetUnitId: defender,
    });
    expect(pull?.score.priority).toBe(TRACTOR_CAPTURE_PRIORITY_V7);
    if (pull === undefined) return;
    state = playV7(state, pull.command).state;
    const step = candidatesV7(state).find((item) => "unitId" in item.command);
    expect(step?.command.kind).toBe("MOVE");
    if (step?.command.kind === "MOVE") {
      expect(step.command.unitId).toBe(grunt);
      expect(endOf(step.command)).toEqual(at(2, 8));
    }
  });

  it("a puller does not fly to a center no own capturer can step on", () => {
    const state = asMartian([own("RAIDER", 7, 6), foe("FIGHTER", 2, 8)]);
    expect(
      unitCandidatesV7(state, at(7, 6)).some(
        (item) => item.score.priority === TRACTOR_CAPTURE_MOVE_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("Martian mobility play: Beam Down", () => {
  // The Saucer on (6, 3); the passenger behind it on (8, 2), whose job is
  // the village (8, 5); a Fighter on (7, 6) that no Move of the passenger
  // brings into its range; a Grunt on (9, 4) near the landing.
  const delivery = (hp?: number): GameStateV7 =>
    asMartian([
      own("RAIDER", 6, 3),
      own("FIGHTER", 8, 2),
      own("FIGHTER", 9, 4, { activation: { moved: true, handled: true } }),
      foe("FIGHTER", 7, 6, hp === undefined ? {} : { hp }),
    ]);

  it("delivers a passenger to a tile it shoots from on arrival", () => {
    const state = delivery();
    const best = unitCandidatesV7(state, at(6, 3))[0];
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_ATTACK_PRIORITY_V7);
    if (best?.command.kind !== "BEAM_DOWN") return;
    expect(best.command.passengerUnitId).toBe(unitIdAtV7(state, at(8, 2)));
    // From two tiles: the Fighter cannot answer.
    expect(gap(best.command.to, at(7, 6))).toBe(2);
    // The passenger counts as moved and still shoots.
    const landed = playV7(state, best.command).state;
    const shot = unitCandidatesV7(landed, best.command.to).find(
      (item) => item.command.kind === "ATTACK",
    );
    expect(shot?.command).toMatchObject({
      targetUnitId: unitIdAtV7(state, at(7, 6)),
    });
    // The baseline beamed no unit that could still act.
    baseline(() =>
      expect(unitCandidatesV7(state, at(6, 3), "BEAM_DOWN")).toEqual([]),
    );
  });

  it("delivers for a kill with the kills", () => {
    const state = delivery(4);
    const best = unitCandidatesV7(state, at(6, 3))[0];
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_KILL_PRIORITY_V7);
  });

  it("a carrier that has flown still delivers", () => {
    const state = asMartian([
      own("RAIDER", 6, 3, { activation: { moved: true, handled: true } }),
      own("FIGHTER", 8, 2),
      own("FIGHTER", 9, 4, { activation: { moved: true, handled: true } }),
      foe("FIGHTER", 7, 6),
    ]);
    const best = unitCandidatesV7(state, at(6, 3))[0];
    expect(best?.command.kind).toBe("BEAM_DOWN");
    expect(best?.score.priority).toBe(BEAM_DOWN_ATTACK_PRIORITY_V7);
  });

  it("does not lift a unit off a settlement center for a shot", () => {
    // The passenger stands on the village (8, 5) it is taking.
    const state = asMartian([
      own("RAIDER", 6, 5),
      own("FIGHTER", 8, 5),
      own("FIGHTER", 5, 3, { activation: { moved: true, handled: true } }),
      foe("FIGHTER", 3, 5),
    ]);
    expect(
      unitCandidatesV7(state, at(6, 5), "BEAM_DOWN").filter(
        (item) =>
          item.command.kind === "BEAM_DOWN" &&
          item.command.passengerUnitId === unitIdAtV7(state, at(8, 5)),
      ),
    ).toEqual([]);
  });

  // A Grunt that has fired, at 4 HP with no Shield, in reach of two
  // Fighters (5 and 6).
  const spent = [
    own("FIGHTER", 4, 3, { hp: 4, shield: 0, activation: FIRED }),
    foe("FIGHTER", 2, 3),
    foe("FIGHTER", 2, 2),
  ];

  it("extracts a unit that has fired from lethal reach", () => {
    const state = asMartian([own("RAIDER", 6, 3), ...spent]);
    const beams = unitCandidatesV7(state, at(6, 3), "BEAM_DOWN");
    expect(beams.length).toBeGreaterThan(0);
    for (const item of beams) {
      expect(item.score.priority).toBe(BEAM_DOWN_EXTRACT_PRIORITY_V7);
      if (item.command.kind !== "BEAM_DOWN") continue;
      expect(item.command.passengerUnitId).toBe(unitIdAtV7(state, at(4, 3)));
      // Out of both Fighters' reach (Move 1, range 1).
      expect(gap(item.command.to, at(2, 3))).toBeGreaterThan(2);
    }
    baseline(() =>
      expect(unitCandidatesV7(state, at(6, 3), "BEAM_DOWN")).toEqual([]),
    );
  });

  it("does not extract a unit that is safe where it stands", () => {
    const state = asMartian([
      own("RAIDER", 6, 3),
      own("FIGHTER", 4, 3, { activation: FIRED }),
      foe("FIGHTER", 2, 3),
    ]);
    expect(unitCandidatesV7(state, at(6, 3), "BEAM_DOWN")).toEqual([]);
  });

  it("a carrier flies to within pick-up range of a unit to extract", () => {
    const state = asMartian([own("RAIDER", 9, 3), ...spent]);
    const best = unitCandidatesV7(state, at(9, 3))[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(CARRIER_RESCUE_MOVE_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end === undefined ? 9 : gap(end, at(4, 3))).toBeLessThanOrEqual(2);
    if (best === undefined) return;
    // Then it extracts.
    const flown = playV7(state, best.command).state;
    const next = unitCandidatesV7(flown, end ?? at(9, 3)).find(
      (item) => item.command.kind === "BEAM_DOWN",
    );
    expect(next?.score.priority).toBe(BEAM_DOWN_EXTRACT_PRIORITY_V7);
    // The Mothership is a carrier too.
    const heavy = asMartian([own("KNIGHT", 8, 3), ...spent]);
    expect(
      unitCandidatesV7(heavy, at(8, 3), "MOVE").some(
        (item) => item.score.priority === CARRIER_RESCUE_MOVE_PRIORITY_V7,
      ),
    ).toBe(true);
  });
});

describe("Martian mobility play: carriers and shooters", () => {
  it("an unmoved Saucer with a Beam Down worth taking may still fly", () => {
    // The scenario of `ruleset-v7-martian-ai.test.ts`: the baseline Saucer
    // made no routine Move while it could beam.
    const state = asMartian([
      own("FIGHTER", 8, 8, {
        activation: { moved: true, handled: true, captured: true },
      }),
      own("RAIDER", 4, 6),
      own("FIGHTER", 4, 7),
      own("FIGHTER", 8, 6),
      own("FIGHTER", 5, 6),
      foe("FIGHTER", 1, 3),
    ]);
    const saucer = unitCandidatesV7(state, at(4, 6));
    expect(saucer[0]?.command.kind).toBe("BEAM_DOWN");
    // The beam is still taken first; the staging Moves stay below it.
    const moves = saucer.filter((item) => item.command.kind === "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    for (const item of moves)
      expect(item.score.priority).toBeLessThan(BEAM_DOWN_PRIORITY_V7);
    baseline(() =>
      expect(unitCandidatesV7(state, at(4, 6), "MOVE")).toEqual([]),
    );
  });

  it("a Grunt's routine Move next to a melee unit costs 8", () => {
    // (The Martian pass, `pulp_wars-w49.14`: against a seat that plays no
    // army rules, a Candy one since the Dinosaur pass, `pulp_wars-w49.15`.
    // Against a Human one the army rules offer a Grunt with a shot no
    // routine Move toward the enemy at all.)
    const state = martianFieldV7([own("FIGHTER", 6, 3), foe("FIGHTER", 4, 3)], {
      factions: ["MARTIAN", "CANDY"],
    });
    const contact = moveCandidateV7(state, at(6, 3), at(5, 4));
    const apart = moveCandidateV7(state, at(6, 3), at(6, 4));
    expect(apart?.score.strategicValue).toBe(0);
    expect(contact?.score.strategicValue).toBe(-SHOOTER_CONTACT_COST_V7);
    baseline(() =>
      expect(
        moveCandidateV7(state, at(6, 3), at(5, 4))?.score.strategicValue,
      ).toBe(0),
    );
  });
});

describe("Martian mobility play: production", () => {
  it("trains one Saucer for every three front units", () => {
    const adjustment = (
      pieces: readonly MartianPieceV7[],
      threatened = false,
    ) => {
      const view = viewerViewV7(asMartian(pieces));
      return martianProductionAdjustmentV7(
        view,
        "RAIDER",
        martianArmyCountsV7(view),
        threatened,
        true,
        true,
      );
    };
    const grunts = [own("FIGHTER", 7, 7), own("FIGHTER", 7, 6)];
    // The Saucer's Shield (2) is worth 4 in every case.
    expect(adjustment(grunts)).toBe(4 + SAUCER_BIAS_V7);
    expect(adjustment([...grunts, own("RAIDER", 6, 6)])).toBe(
      4 - SURPLUS_COST_V7,
    );
    // Four front units: the second Saucer (the baseline charged for it
    // below six front units).
    const four = [
      ...grunts,
      own("FIGHTER", 6, 7),
      own("FIGHTER", 6, 5),
      own("RAIDER", 6, 6),
    ];
    expect(adjustment(four)).toBe(4 + SAUCER_BIAS_V7);
    baseline(() => expect(adjustment(four)).toBe(4 - SURPLUS_COST_V7));
    // Bodies first in a threatened city.
    expect(adjustment(grunts, true)).toBeLessThan(-20);
    // No front unit: no carrier yet.
    expect(adjustment([own("GUARD", 7, 7)])).toBe(4 - SURPLUS_COST_V7);
  });
});

describe("Martian mobility play: map curiosities", () => {
  it("a carrier sets no unit down on the Giant Spider's provoke tiles", () => {
    // The four-seat arena with the Spider on (7, 7). The Saucer on (9, 6)
    // could set the Grunt down on (8, 5), (8, 6), or (8, 7), each two tiles
    // from the 4-HP Fighter on (6, 5); (8, 6) and (8, 7) are next to the
    // Spider.
    const state = monsterArenaV7(
      [
        { seat: 0, role: "RAIDER", at: at(9, 6) },
        { seat: 0, role: "FIGHTER", at: at(11, 6) },
        { seat: 1, role: "FIGHTER", at: at(6, 5), hp: 4 },
      ],
      {
        grass: [at(8, 5), at(8, 6), at(8, 7), at(10, 5), at(10, 6), at(10, 7)],
      },
      ["MARTIAN", "UNDEAD", "GOBLIN", "CANDY"],
    );
    const view = viewerViewV7(state);
    const offered = queryPlayerCommandsV7(view).flatMap((command) =>
      command.kind === "BEAM_DOWN" ? [command.to] : [],
    );
    expect(offered).toContainEqual(at(8, 6));
    const beams = unitCandidatesV7(state, at(9, 6), "BEAM_DOWN").flatMap(
      (item) => (item.command.kind === "BEAM_DOWN" ? [item.command.to] : []),
    );
    expect(beams).toContainEqual(at(8, 5));
    for (const to of beams) expect(gap(to, MONSTER_LAIR_V7)).toBeGreaterThan(1);
  });
});

describe("Normal AI against the Martian mobility", () => {
  it("puts a second unit next to a center a Saucer could empty", () => {
    // The Saucer is five tiles from the capital (Move 3, reach 2).
    const state = againstMartian([
      own("FIGHTER", 8, 8),
      own("FIGHTER", 6, 6),
      foe("RAIDER", 4, 9),
    ]);
    expect(moveCandidateV7(state, at(6, 6), at(7, 7))?.score.priority).toBe(
      MOTHERSHIP_GUARD_PRIORITY_V7,
    );
    baseline(() =>
      expect(
        moveCandidateV7(state, at(6, 6), at(7, 7))?.score.priority,
      ).not.toBe(MOTHERSHIP_GUARD_PRIORITY_V7),
    );
    // A Saucer out of reach is no reason.
    const far = againstMartian([
      own("FIGHTER", 8, 8),
      own("FIGHTER", 6, 6),
      foe("RAIDER", 2, 9),
    ]);
    expect(moveCandidateV7(far, at(6, 6), at(7, 7))?.score.priority).not.toBe(
      MOTHERSHIP_GUARD_PRIORITY_V7,
    );
  });

  it("guards against a Mothership from five tiles (Move 2, reach 3)", () => {
    const state = againstMartian([
      own("FIGHTER", 8, 8),
      own("FIGHTER", 6, 6),
      foe("KNIGHT", 3, 9),
    ]);
    expect(moveCandidateV7(state, at(6, 6), at(7, 7))?.score.priority).toBe(
      MOTHERSHIP_GUARD_PRIORITY_V7,
    );
    baseline(() =>
      expect(
        moveCandidateV7(state, at(6, 6), at(7, 7))?.score.priority,
      ).not.toBe(MOTHERSHIP_GUARD_PRIORITY_V7),
    );
  });

  it("values a hostile Mothership as a carrier", () => {
    const state = againstMartian([own("FIGHTER", 6, 6), foe("KNIGHT", 5, 5)]);
    const view = viewerViewV7(state);
    const bonus = (): number =>
      martianTargetBonusV7(
        view,
        martianFactsV7(view),
        publicUnitAtV7(state, at(5, 5)),
      );
    expect(bonus() - baseline(bonus)).toBe(MOTHERSHIP_TARGET_BONUS_V7);
  });
});
