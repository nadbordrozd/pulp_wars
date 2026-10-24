import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  UNIT_ACTION_LEFT_LABEL_V7,
  UNIT_ATTACK_LEFT_LABEL_V7,
  UNIT_DONE_LABEL_V7,
  unitTurnChipV7,
} from "../../src/render/blocked-actions-v7";
import { statusGlossaryV7 } from "../../src/render/unit-glossary-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { MARTIAN_UI_V7, martianUiFixtureV7 } from "../fixtures/v7-martian-ui";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// Bead `pulp_wars-2yc.109`: the dock's turn chip says what a handled unit
// (its Move spent) can still do, from the engine's offer: "Can attack ·
// can't move", "Can act · can't move", or "Done this turn" only when
// nothing is left. The field (tests/fixtures/v7-martian.ts): 11 x 11, seat 0
// Martian, seat 1 Human with its capital at (2, 8).

const own = (
  role: MartianPieceV7["role"],
  where: CoordV7,
  extra: Partial<MartianPieceV7> = {},
): MartianPieceV7 => ({ seat: 0, role, at: where, ...extra });
const foe = (role: MartianPieceV7["role"], where: CoordV7): MartianPieceV7 => ({
  seat: 1,
  role,
  at: where,
});

function chipAt(state: GameStateV7, where: CoordV7) {
  const view = viewForV7(state, activeIdV7(state));
  const unit = unitAtV7(state, where);
  const viewed = view.units.find((candidate) => candidate.id === unit.id);
  if (viewed === undefined) throw new Error("unit not in view");
  return unitTurnChipV7(viewed, queryPlayerCommandsV7(view));
}

function played(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

const MOVED = { moved: true, movedPathLength: 1, handled: true };

describe("the dock's turn chip of a handled unit", () => {
  it("says a unit that moved can still attack, and Done only when no target is left", () => {
    const state = martianFieldV7([
      own("FIGHTER", at(4, 4), { activation: MOVED }),
      own("FIGHTER", at(7, 2), { activation: MOVED }),
      foe("FIGHTER", at(4, 5)),
    ]);
    expect(chipAt(state, at(4, 4))).toEqual({
      status: "attack-left",
      label: UNIT_ATTACK_LEFT_LABEL_V7,
      tooltip: "It cannot move again this turn, but it can still attack",
    });
    expect(UNIT_ATTACK_LEFT_LABEL_V7).toBe("Can attack · can't move");
    expect(chipAt(state, at(7, 2))?.label).toBe(UNIT_DONE_LABEL_V7);
    // The attack spends what was left.
    const attacked = played(state, {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(4, 4)).id,
      targetUnitId: unitAtV7(state, at(4, 5)).id,
    });
    const after = attacked.units.find(
      (unit) => unit.id === unitAtV7(state, at(4, 4)).id,
    );
    if (after === undefined) throw new Error("attacker died");
    expect(chipAt(attacked, after.at)?.label).toBe(UNIT_DONE_LABEL_V7);
  });

  it("says a unit set down by Mass Beam Down can still attack, not Done", () => {
    const state = martianFieldV7([
      own("KNIGHT", at(2, 2)),
      own("FIGHTER", at(1, 1)),
      own("FIGHTER", at(2, 1)),
      own("FIGHTER", at(3, 1)),
      foe("FIGHTER", at(2, 6)),
    ]);
    const ids = [at(1, 1), at(2, 1), at(3, 1)]
      .map((where) => unitAtV7(state, where).id)
      .sort((left, right) => left - right);
    const beamed = played(state, {
      kind: "MASS_BEAM_DOWN",
      unitId: unitAtV7(state, at(2, 2)).id,
      passengerUnitIds: ids,
      to: at(2, 5),
    });
    // Every Grunt lands within its ray's reach of the enemy.
    for (const where of [at(2, 5), at(1, 4), at(2, 4)])
      expect(chipAt(beamed, where)?.status, `${where.x}/${where.y}`).toBe(
        "attack-left",
      );
    // The Mothership used its action, not its free Tractor Beam (a beamed
    // Grunt two tiles away may be pulled).
    expect(chipAt(beamed, at(2, 2))?.status).toBe("action-left");
  });

  it("says a unit set down by a Saucer's Beam Down can still attack or act, and Done only when nothing is left", () => {
    const state = martianUiFixtureV7();
    const view = viewForV7(state, activeIdV7(state));
    const saucer = unitAtV7(state, MARTIAN_UI_V7.saucer).id;
    const beams = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "BEAM_DOWN" }> =>
        command.kind === "BEAM_DOWN" && command.unitId === saucer,
    );
    // Each passenger on each landing tile: a Grunt beside an enemy may
    // attack, the Brain may still Rally, a Grunt out of reach is done.
    const landed = beams
      .map((command) => ({ command, after: played(state, command) }))
      .map(({ command, after }) => ({
        chip: chipAt(after, command.to),
        command,
      }));
    expect(landed.length).toBeGreaterThan(0);
    expect(new Set(landed.map(({ chip }) => chip?.status ?? null))).toEqual(
      new Set(["attack-left", "action-left", "done"]),
    );
  });

  it("names an action that is not an attack, and stays quiet for an unhandled unit or outside the turn", () => {
    const activation = {
      moved: true,
      movedPathLength: 1,
      attacked: true,
      attacksUsed: 1,
      tendedThisTurn: false,
      inspired: false,
      overrunActive: false,
      escapeAvailable: false,
      recovered: false,
      captured: false,
      handled: true,
      specialActed: false,
    };
    const unit = { id: 7 as never, activation };
    const pull: CommandV7 = {
      kind: "TRACTOR_BEAM",
      unitId: 7 as never,
      targetUnitId: 9 as never,
    };
    const disband: CommandV7 = { kind: "DISBAND", unitId: 7 as never };
    expect(unitTurnChipV7(unit, [pull, disband])?.label).toBe(
      UNIT_ACTION_LEFT_LABEL_V7,
    );
    // Disband and Promote do not count: nothing is left.
    expect(
      unitTurnChipV7(unit, [disband, { kind: "PROMOTE", unitId: 7 as never }])
        ?.label,
    ).toBe(UNIT_DONE_LABEL_V7);
    // Another unit's command is not its own.
    expect(unitTurnChipV7(unit, [{ ...pull, unitId: 8 as never }])?.label).toBe(
      UNIT_DONE_LABEL_V7,
    );
    // An Overrun, a Feast or a second shot keeps the unit unhandled: its
    // own status chip says it may attack again.
    expect(
      unitTurnChipV7(
        { ...unit, activation: { ...activation, handled: false } },
        [pull],
      ),
    ).toBeNull();
    // Outside the viewer's turn nothing is offered and nothing is said.
    expect(unitTurnChipV7(unit, [])).toBeNull();
  });

  it("explains each chip in the unit's details", () => {
    expect(statusGlossaryV7("attack-left")?.name).toBe(
      UNIT_ATTACK_LEFT_LABEL_V7,
    );
    expect(statusGlossaryV7("action-left")?.name).toBe(
      UNIT_ACTION_LEFT_LABEL_V7,
    );
    expect(statusGlossaryV7("done")?.name).toBe(UNIT_DONE_LABEL_V7);
  });
});
