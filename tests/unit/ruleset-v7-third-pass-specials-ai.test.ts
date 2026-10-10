import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  COLD_SNAP_PRIORITY_V7,
  WITCH_MOVE_PRIORITY_V7,
  witchMoveKeyV7,
} from "../../src/ai/v7-ice-folk";
import {
  MIND_CONTROL_ESCAPE_PRIORITY_V7,
  MIND_CONTROL_PRIORITY_V7,
  MIND_CONTROL_SAFE_STEP_PRIORITY_V7,
  MIND_CONTROL_UNHELD_VALUE_WEIGHT_V7,
  MIND_CONTROL_VALUE_WEIGHT_V7,
  mindControlValueV7,
} from "../../src/ai/v7-martian";
import {
  applyCommandV7,
  queryCombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  publicUnitAtV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";

// The third pass of the Normal AI (`pulp_wars-9s0.14`): Mind Control used
// on purpose, and the Ice Witch's Cold Snap set up on purpose
// (docs/architecture/NORMAL_AI.md, "Third pass"). Two-seat 11 x 11 field
// (tests/fixtures/v7-martian.ts): seat 0 is the viewer (capital (8, 8)),
// seat 1 the opponent (capital (2, 8)); villages (5, 5), (8, 5), (5, 8);
// every other land tile is Grass; every seat has every technology. No test
// plays a match: each asks for one decision, and where the order of a turn
// matters applies the policy's own command and asks again.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const own = <Piece extends MartianPieceV7>(
  role: Piece["role"],
  x: number,
  y: number,
  extra: Partial<Piece> = {},
): Piece => ({ seat: 0, role, at: at(x, y), ...extra }) as Piece;
const foe = <Piece extends MartianPieceV7>(
  role: Piece["role"],
  x: number,
  y: number,
  extra: Partial<Piece> = {},
): Piece => ({ seat: 1, role, at: at(x, y), ...extra }) as Piece;

const endOf = (command: CommandV7 | undefined): CoordV7 | undefined =>
  command?.kind === "MOVE" ? command.path.at(-1) : undefined;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

/** The viewer's best command of a unit in this decision, applied. */
function step(state: GameStateV7): {
  readonly command: CommandV7;
  readonly state: GameStateV7;
} {
  const command = chooseNormalCommandV7(viewerViewV7(state)).candidates.find(
    (item) => "unitId" in item.command,
  )?.command;
  if (command === undefined) throw new Error("no command");
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return { command, state: result.state };
}

// ---------------------------------------------------------------------------
// Mind Control.
// ---------------------------------------------------------------------------

describe("Mind Control on purpose (pulp_wars-9s0.14)", () => {
  const asMartian = (pieces: readonly MartianPieceV7[]): GameStateV7 =>
    martianFieldV7(pieces, { factions: ["MARTIAN", "ORIGINAL"] });
  const BRAIN = at(5, 5);
  const mindControlOf = (state: GameStateV7) =>
    unitCandidatesV7(state, BRAIN, "MIND_CONTROL")[0];

  // A wounded Champion two tiles from the Brain with two of its own side's
  // Fighters beside it, and a wounded Marksman on the other side with
  // nobody near (no unit of the enemy reaches it in one turn).
  const DEAR = at(6, 3);
  const CHEAP = at(3, 5);
  const pieces = (fighters: boolean, hp = 3): MartianPieceV7[] => [
    own("CAPTAIN", BRAIN.x, BRAIN.y),
    foe("SWORDSMAN", DEAR.x, DEAR.y, { hp }),
    foe("MARKSMAN", CHEAP.x, CHEAP.y, { hp: 4 }),
    ...(fighters ? [foe("FIGHTER", 7, 2), foe("FIGHTER", 6, 2)] : []),
  ];

  it("takes the dearest unit when it keeps it", () => {
    // (At 6 HP the Champion lives through the Marksman's shot.)
    const state = asMartian(pieces(false, 6));
    const view = viewerViewV7(state);
    const dear = mindControlValueV7(view, publicUnitAtV7(state, DEAR));
    const cheap = mindControlValueV7(view, publicUnitAtV7(state, CHEAP));
    expect(dear).toBeGreaterThan(cheap);
    const best = mindControlOf(state);
    expect(best?.command).toMatchObject({
      targetUnitId: unitIdAtV7(state, DEAR),
    });
    expect(best?.score).toMatchObject({
      priority: MIND_CONTROL_PRIORITY_V7,
      strategicValue: MIND_CONTROL_VALUE_WEIGHT_V7 * dear,
    });
  });

  it("takes the unit it keeps before a dearer one that dies at once", () => {
    // Taken, the Champion stands exhausted at 3 HP beside two Fighters of
    // the seat it came from: they kill it in their turn. It is only taken
    // from them (half the value); the Marksman is kept.
    const state = asMartian(pieces(true));
    const view = viewerViewV7(state);
    const dear = mindControlValueV7(view, publicUnitAtV7(state, DEAR));
    const cheap = mindControlValueV7(view, publicUnitAtV7(state, CHEAP));
    expect(dear).toBeGreaterThan(cheap);
    expect(MIND_CONTROL_VALUE_WEIGHT_V7 * cheap).toBeGreaterThan(
      MIND_CONTROL_UNHELD_VALUE_WEIGHT_V7 * dear,
    );
    const offered = unitCandidatesV7(state, BRAIN, "MIND_CONTROL");
    expect(offered[0]?.command).toMatchObject({
      targetUnitId: unitIdAtV7(state, CHEAP),
    });
    expect(offered[0]?.score.strategicValue).toBe(
      MIND_CONTROL_VALUE_WEIGHT_V7 * cheap,
    );
    expect(
      offered.find(
        (item) =>
          item.command.kind === "MIND_CONTROL" &&
          item.command.targetUnitId === unitIdAtV7(state, DEAR),
      )?.score.strategicValue,
    ).toBe(MIND_CONTROL_UNHELD_VALUE_WEIGHT_V7 * dear);
  });

  it("still takes a unit that dies at once when it is the only one: it is taken from the enemy", () => {
    const state = asMartian(
      pieces(true).filter((piece) => piece.role !== "MARKSMAN"),
    );
    expect(mindControlOf(state)?.command).toMatchObject({
      kind: "MIND_CONTROL",
      targetUnitId: unitIdAtV7(state, DEAR),
    });
    expect(mindControlOf(state)?.score.priority).toBe(MIND_CONTROL_PRIORITY_V7);
  });

  // Five Marksmen three tiles east of the Brain: each steps one tile and
  // shoots from two, so they reach (5, 5) and no tile of column 4.
  const battery = (): MartianPieceV7[] =>
    [2, 3, 4, 5, 6].map((y) => foe("MARKSMAN", 8, y));

  it("steps out of lethal reach first, to a tile that keeps the target in range, and takes it from there", () => {
    const TARGET = at(4, 3);
    const state = asMartian([
      own("CAPTAIN", BRAIN.x, BRAIN.y),
      foe("FIGHTER", TARGET.x, TARGET.y, { hp: 4 }),
      ...battery(),
    ]);
    // The Mind Control is on offer where it stands.
    expect(mindControlOf(state)).toBeDefined();
    const first = unitCandidatesV7(state, BRAIN)[0];
    expect(first?.command.kind).toBe("MOVE");
    expect(first?.score.priority).toBe(MIND_CONTROL_SAFE_STEP_PRIORITY_V7);
    const end = endOf(first?.command);
    expect(end?.x).toBe(4);
    expect(chebyshev(end ?? BRAIN, TARGET)).toBeLessThanOrEqual(2);
    // Then the Mind Control, from the safe tile.
    const moved = step(state);
    expect(moved.command).toEqual(first?.command);
    const second = step(moved.state);
    expect(second.command).toMatchObject({
      kind: "MIND_CONTROL",
      targetUnitId: unitIdAtV7(state, TARGET),
    });
  });

  it("takes the unit where it stands when it is safe there", () => {
    const state = asMartian([
      own("CAPTAIN", BRAIN.x, BRAIN.y),
      foe("FIGHTER", 4, 3, { hp: 4 }),
    ]);
    expect(unitCandidatesV7(state, BRAIN)[0]?.command.kind).toBe(
      "MIND_CONTROL",
    );
  });

  it("with a unit under its control it leaves lethal reach: the unit goes back when the Brain dies", () => {
    const state = asMartian([
      own("CAPTAIN", BRAIN.x, BRAIN.y),
      foe("FIGHTER", 5, 6, { controlledBy: BRAIN }),
      ...battery(),
    ]);
    const first = unitCandidatesV7(state, BRAIN)[0];
    expect(first?.command.kind).toBe("MOVE");
    expect(first?.score.priority).toBeGreaterThanOrEqual(
      MIND_CONTROL_ESCAPE_PRIORITY_V7,
    );
    expect(endOf(first?.command)?.x).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// The Ice Witch.
// ---------------------------------------------------------------------------

describe("the Witch's Cold Snap on purpose (pulp_wars-9s0.14)", () => {
  // Round 20: past the opening, whose "villages first" rule keeps every
  // unit out of the enemy's reach while the field's villages are free.
  const asIce = (pieces: readonly IcePieceV7[]): GameStateV7 => ({
    ...iceFieldV7(pieces, { factions: ["ICE_FOLK", "ORIGINAL"] }),
    round: 20,
  });
  const againstIce = (pieces: readonly IcePieceV7[]): GameStateV7 => ({
    ...iceFieldV7(pieces, { factions: ["ORIGINAL", "ICE_FOLK"] }),
    round: 20,
  });
  const WITCH = at(5, 3);

  it("the key ranks a Cold Snap worth casting before the escort, by the danger it leaves", () => {
    const state = asIce([own("CAPTAIN", 5, 3), foe("FIGHTER", 5, 1)]);
    const view = viewerViewV7(state);
    const witch = publicUnitAtV7(state, WITCH);
    const hostile = (owner: number): boolean => owner !== view.viewer.id;
    const plain = witchMoveKeyV7(view, witch, at(5, 2), 5, 0, hostile);
    // As it was: beside an enemy counts against the tile.
    expect(plain).toEqual([1, 0, 0, 0, 1, 0, -5]);
    expect(
      witchMoveKeyV7(view, witch, at(5, 2), 5, 0, hostile, {
        value: 2,
        danger: 0,
      }),
    ).toEqual([1, 2, 0, 1, 1, 0, -0]);
    // A Cold Snap that leaves her in lethal reach, or freezes nothing new,
    // changes nothing.
    for (const snap of [
      { value: 2, danger: witch.hp },
      { value: 0, danger: 0 },
    ])
      expect(
        witchMoveKeyV7(view, witch, at(5, 2), 5, 0, hostile, snap),
      ).toEqual(plain);
  });

  it("she steps beside the enemies and freezes them: Move, Cold Snap, in that order", () => {
    // Two Fighters two tiles in front of her. Since Ice Folk Freeze the
    // Cold Snap reaches only the tiles around her, and she never went there.
    const state = asIce([
      own("CAPTAIN", 5, 3),
      own("FIGHTER", 4, 3),
      own("FIGHTER", 6, 3),
      foe("FIGHTER", 5, 1),
      foe("FIGHTER", 6, 1),
    ]);
    const first = step(state);
    expect(first.command).toMatchObject({ kind: "MOVE" });
    expect(first.command).toMatchObject({
      unitId: unitIdAtV7(state, WITCH),
    });
    const end = endOf(first.command) ?? WITCH;
    expect(chebyshev(end, at(5, 1))).toBe(1);
    expect(chebyshev(end, at(6, 1))).toBe(1);
    expect(unitCandidatesV7(state, WITCH)[0]?.score.priority).toBe(
      WITCH_MOVE_PRIORITY_V7,
    );
    const second = step(first.state);
    expect(second.command).toMatchObject({ kind: "COLD_SNAP" });
    expect(second.state.frozen.map((entry) => entry.unitId).sort()).toEqual(
      [unitIdAtV7(state, at(5, 1)), unitIdAtV7(state, at(6, 1))].sort(),
    );
  });

  it("she stays and casts when the enemy has come up to her", () => {
    // (Before the third pass her Move ranked first and stepped her off the
    // adjacent enemy.)
    const state = asIce([
      own("CAPTAIN", 6, 2),
      own("FIGHTER", 5, 2),
      own("FIGHTER", 7, 2),
      foe("FIGHTER", 6, 1),
    ]);
    const best = unitCandidatesV7(state, at(6, 2))[0];
    expect(best?.command.kind).toBe("COLD_SNAP");
    expect(best?.score.priority).toBe(COLD_SNAP_PRIORITY_V7);
  });

  it("she does not step beside an enemy where the ones she does not freeze kill her", () => {
    // The same Fighter, and five Marksmen two tiles from the tiles beside
    // it: frozen or not, the Fighter is not what kills her there.
    const state = asIce([
      own("CAPTAIN", 5, 4),
      foe("FIGHTER", 5, 2),
      ...[3, 4, 5, 6, 7].map((x) => foe("MARKSMAN", x, 0)),
    ]);
    for (const item of unitCandidatesV7(state, at(5, 4), "MOVE"))
      expect(chebyshev(endOf(item.command) ?? WITCH, at(5, 2))).toBeGreaterThan(
        1,
      );
  });

  it("the Cold Snap opens the Shatter: the unit beside it kills what it could only wound", () => {
    // A Fighter wounded so that the Yeti's hit leaves it at the Shatter
    // threshold (4 with Brittle): not Frozen it lives and strikes back.
    const pieces = (hp: number): IcePieceV7[] => [
      own("CAPTAIN", 5, 4),
      own("FIGHTER", 4, 3),
      foe("FIGHTER", 5, 2, { hp }),
    ];
    const fresh = asIce(pieces(10));
    const hit = queryCombatPreviewV7(
      viewerViewV7(fresh),
      unitIdAtV7(fresh, at(4, 3)),
      unitIdAtV7(fresh, at(5, 2)),
    );
    if (hit === null) throw new Error("no preview");
    const state = asIce(pieces(hit.damageToDefender + 4));
    const yeti = unitIdAtV7(state, at(4, 3));
    const target = unitIdAtV7(state, at(5, 2));
    expect(
      queryCombatPreviewV7(viewerViewV7(state), yeti, target)?.defenderDies,
    ).toBe(false);
    // The Witch steps beside it, freezes it, and the Yeti shatters it.
    const moved = step(state);
    expect(moved.command).toMatchObject({ kind: "MOVE" });
    const frozen = step(moved.state);
    expect(frozen.command).toMatchObject({ kind: "COLD_SNAP" });
    const blow = step(frozen.state);
    expect(blow.command).toEqual({
      kind: "ATTACK",
      unitId: yeti,
      targetUnitId: target,
    });
    expect(blow.state.units.some((unit) => unit.id === target)).toBe(false);
  });

  it("an army seat kills a hostile Witch with the hits of two units", () => {
    // The other reading of "Witch kills" (`pulp_wars-9s0.8` counted how
    // often the Witch died): the combined kill of the army rules takes her
    // when two units make it, with a Yeti to chip beside them.
    const state = againstIce([
      own("MARKSMAN", 5, 5),
      own("KNIGHT", 4, 4),
      own("FIGHTER", 6, 4),
      foe("CAPTAIN", 5, 3, { hp: 8 }),
      foe("FIGHTER", 7, 3),
    ]);
    const witch = unitIdAtV7(state, at(5, 3));
    let next = state;
    for (let count = 0; count < 4; count += 1) {
      if (!next.units.some((unit) => unit.id === witch)) break;
      const played = step(next);
      expect(played.command).toMatchObject({
        kind: "ATTACK",
        targetUnitId: witch,
      });
      next = played.state;
    }
    expect(next.units.some((unit) => unit.id === witch)).toBe(false);
  });
});
