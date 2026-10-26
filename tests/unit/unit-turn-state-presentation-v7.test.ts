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
  CAN_ATTACK_CUE_V7,
  unitTurnStatesV7,
} from "../../src/render/canvas/unit-turn-state-v7";
import {
  drawReadyGroundCueV7,
  type ReadyCueFrameV7,
} from "../../src/render/canvas/feedback-canvas-v7";
import { unitTurnChipV7 } from "../../src/render/blocked-actions-v7";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { martianFieldV7, type MartianPieceV7 } from "../fixtures/v7-martian";
import { MARTIAN_UI_V7, martianUiFixtureV7 } from "../fixtures/v7-martian-ui";
import { activeIdV7, at } from "../fixtures/v7-revision20";
import {
  CAN_ATTACK_RING_UI_V7,
  canAttackRingFixtureV7,
} from "../fixtures/v7-can-attack-ring";

// Bead `pulp_wars-2yc.110`: the board's turn states of the viewer's units,
// READY (FRESH or ACTIVE, the yet-to-move rings), ATTACK (it has acted but an
// attack is still offered: the "can attack" ring) and SPENT, from the engine's
// offer, the source of the dock's turn chip. The field
// (tests/fixtures/v7-martian.ts): 11 x 11, seat 0 Martian, seat 1 Human.

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

const MOVED = { moved: true, movedPathLength: 1, handled: true };

function statesOf(state: GameStateV7) {
  const view = viewForV7(state, state.humanPlayerId);
  const commands = queryPlayerCommandsV7(view);
  const states = unitTurnStatesV7(view, commands);
  return {
    view,
    commands,
    states,
    at: (where: CoordV7) => states.get(unitAtV7(state, where).id),
  };
}

function played(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

describe("the board's turn states of the viewer's units", () => {
  it("tells a ready unit, a moved unit with a target and a moved unit without one apart", () => {
    const state = martianFieldV7([
      own("FIGHTER", at(6, 6)),
      own("FIGHTER", at(4, 4), { activation: MOVED }),
      own("FIGHTER", at(7, 2), { activation: MOVED }),
      foe("FIGHTER", at(4, 5)),
    ]);
    const { at: stateAt, view, commands } = statesOf(state);
    expect(CAN_ATTACK_CUE_V7).toBe(true);
    expect(stateAt(at(6, 6))).toBe("FRESH");
    expect(stateAt(at(4, 4))).toBe("ATTACK");
    expect(stateAt(at(7, 2))).toBe("SPENT");
    // The dock's chip agrees with the ring on every own unit.
    for (const unit of view.units.filter(
      (candidate) => candidate.ownerId === view.viewer.id,
    )) {
      const chip = unitTurnChipV7(unit, commands)?.status ?? null;
      expect(chip === "attack-left").toBe(
        unitTurnStatesV7(view, commands).get(unit.id) === "ATTACK",
      );
    }
    // The attack spends what was left.
    const attacker = unitAtV7(state, at(4, 4)).id;
    const after = played(state, {
      kind: "ATTACK",
      unitId: attacker,
      targetUnitId: unitAtV7(state, at(4, 5)).id,
    });
    const moved = after.units.find((unit) => unit.id === attacker);
    if (moved === undefined) throw new Error("attacker died");
    expect(statesOf(after).at(moved.at)).toBe("SPENT");
  });

  it("never gives an enemy unit a state, even one that could be attacked", () => {
    const state = martianFieldV7([
      own("FIGHTER", at(4, 4), { activation: MOVED }),
      foe("FIGHTER", at(4, 5)),
      foe("FIGHTER", at(8, 8)),
    ]);
    const { states, view } = statesOf(state);
    for (const unit of view.units)
      if (unit.ownerId !== view.viewer.id)
        expect(states.has(unit.id), `${unit.id}`).toBe(false);
    expect([...states.values()]).toEqual(["ATTACK"]);
  });

  it("shows the units set down by a Mass Beam Down beside an enemy as able to attack", () => {
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
    const { at: stateAt } = statesOf(beamed);
    for (const where of [at(2, 5), at(1, 4), at(2, 4)])
      expect(stateAt(where), `${where.x}/${where.y}`).toBe("ATTACK");
    // The Mothership used its action; its free Tractor Beam is no attack.
    expect(stateAt(at(2, 2))).toBe("SPENT");
  });

  it("shows a unit beamed down by a Saucer as able to attack only beside a target", () => {
    const state = martianUiFixtureV7();
    const view = viewForV7(state, activeIdV7(state));
    const saucer = unitAtV7(state, MARTIAN_UI_V7.saucer).id;
    const beams = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "BEAM_DOWN" }> =>
        command.kind === "BEAM_DOWN" && command.unitId === saucer,
    );
    const landed = beams.map((command) => {
      const after = played(state, command);
      const { at: stateAt, view: afterView, commands } = statesOf(after);
      const unit = afterView.units.find(
        (candidate) => candidate.id === command.passengerUnitId,
      );
      if (unit === undefined) throw new Error("passenger lost");
      return {
        state: stateAt(command.to),
        chip: unitTurnChipV7(unit, commands)?.status ?? null,
      };
    });
    expect(landed.length).toBeGreaterThan(0);
    for (const { state: turn, chip } of landed)
      expect(turn).toBe(chip === "attack-left" ? "ATTACK" : "SPENT");
    expect(new Set(landed.map(({ state: turn }) => turn))).toEqual(
      new Set(["ATTACK", "SPENT"]),
    );
  });

  it("shows a unit with an Overrun, a Feast or a second shot pending as able to attack, not ready", () => {
    const activation = {
      moved: true,
      movedPathLength: 1,
      attacked: true,
      attacksUsed: 1,
      tendedThisTurn: false,
      inspired: false,
      overrunActive: true,
      escapeAvailable: false,
      recovered: false,
      captured: false,
      handled: false,
      specialActed: false,
    };
    const state = martianFieldV7([
      own("FIGHTER", at(4, 4)),
      foe("FIGHTER", at(4, 5)),
    ]);
    const view = viewForV7(state, state.humanPlayerId);
    const unit = unitAtV7(state, at(4, 4));
    const pending = {
      ...view,
      units: view.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, activation } : candidate,
      ),
    };
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: unit.id,
      targetUnitId: unitAtV7(state, at(4, 5)).id,
    };
    expect(unitTurnStatesV7(pending, [attack]).get(unit.id)).toBe("ATTACK");
    // With nothing left to hit it keeps the thin ring of an unhandled unit.
    expect(unitTurnStatesV7(pending, [{ kind: "END_TURN" }]).get(unit.id)).toBe(
      "ACTIVE",
    );
    // A unit that has not acted and cannot move but can attack is ready.
    expect(unitTurnStatesV7(view, [attack]).get(unit.id)).toBe("ACTIVE");
    // Wait, Promote, Disband and a non-attack action do not count.
    const handled = {
      ...view,
      units: view.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, activation: { ...activation, handled: true } }
          : candidate,
      ),
    };
    const neutral: readonly CommandV7[] = [
      { kind: "WAIT", unitId: unit.id },
      { kind: "PROMOTE", unitId: unit.id },
      { kind: "DISBAND", unitId: unit.id },
      {
        kind: "TRACTOR_BEAM",
        unitId: unit.id,
        targetUnitId: attack.targetUnitId,
      },
      { kind: "KABOOM", unitId: unit.id },
    ];
    expect(unitTurnStatesV7(handled, neutral).get(unit.id)).toBe("SPENT");
    // An attack-type ability with a target counts.
    expect(
      unitTurnStatesV7(handled, [
        {
          kind: "BOMB_RUN",
          unitId: unit.id,
          targetUnitId: attack.targetUnitId,
          to: at(4, 6),
        },
      ]).get(unit.id),
    ).toBe("ATTACK");
    // Another unit's attack is not its own.
    expect(
      unitTurnStatesV7(handled, [{ ...attack, unitId: 999 as never }]).get(
        unit.id,
      ),
    ).toBe("SPENT");
    // Switched off, the bead's test cue leaves the states as before.
    expect(unitTurnStatesV7(handled, [attack], false).get(unit.id)).toBe(
      "SPENT",
    );
    expect(unitTurnStatesV7(pending, [attack], false).get(unit.id)).toBe(
      "ACTIVE",
    );
  });

  it("shows the three states side by side on the review fixture", () => {
    const state = canAttackRingFixtureV7();
    const { at: stateAt } = statesOf(state);
    const tiles = CAN_ATTACK_RING_UI_V7;
    expect(stateAt(tiles.ready)).toBe("FRESH");
    expect(stateAt(tiles.attack)).toBe("ATTACK");
    expect(stateAt(tiles.attackKnight)).toBe("ATTACK");
    expect(stateAt(tiles.spent)).toBe("SPENT");
    expect(stateAt(tiles.foe)).toBeUndefined();
  });

  it("has no states outside the viewer's turn", () => {
    const state = martianFieldV7(
      [
        own("FIGHTER", at(4, 4), { activation: MOVED }),
        foe("FIGHTER", at(4, 5)),
      ],
      { activeSeat: 1 },
    );
    const view = viewForV7(state, state.humanPlayerId);
    const unit = unitAtV7(state, at(4, 4));
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: unit.id,
      targetUnitId: unitAtV7(state, at(4, 5)).id,
    };
    expect(unitTurnStatesV7(view, []).size).toBe(0);
    expect(unitTurnStatesV7(view, [attack]).size).toBe(0);
  });
});

describe("the can-attack ring", () => {
  type LogEntry = readonly unknown[];
  function recordingContext(): {
    readonly context: CanvasRenderingContext2D;
    readonly log: LogEntry[];
  } {
    const log: LogEntry[] = [];
    const context = new Proxy(
      { globalAlpha: 1 },
      {
        get: (target, key) =>
          key in target
            ? Reflect.get(target, key)
            : (...args: unknown[]) => {
                log.push([String(key), ...args]);
              },
        set: (target, key, value) => {
          log.push(["set", String(key), value]);
          return Reflect.set(target, key, value);
        },
      },
    );
    return { context: context as unknown as CanvasRenderingContext2D, log };
  }
  const ground = { centreX: 50, centreY: 80, radiusX: 22, radiusY: 8 };
  const cue = (state: ReadyCueFrameV7["state"]): ReadyCueFrameV7 => ({
    state,
    pulse: 0.5,
    ownerColour: "#f06762",
    highContrast: false,
  });
  const strokes = (log: readonly LogEntry[]) =>
    log
      .filter((entry) => entry[0] === "set" && entry[1] === "strokeStyle")
      .map((entry) => entry[2]);

  it("is a dashed red ring, unlike the solid cream ready rings, and nothing when spent", () => {
    const attack = recordingContext();
    drawReadyGroundCueV7(attack.context, ground, 1, cue("ATTACK"));
    expect(strokes(attack.log)).toEqual(["#10131c", "#ff655f"]);
    const dashes = attack.log.filter((entry) => entry[0] === "setLineDash");
    expect(dashes.length).toBeGreaterThan(0);
    const pattern = dashes[0]?.[1] as readonly number[];
    expect(pattern).toHaveLength(2);
    expect(pattern.every((length) => length > 0)).toBe(true);
    // Still: the pulse moves nothing (no ripple, no pool).
    const still = recordingContext();
    drawReadyGroundCueV7(still.context, ground, 1, {
      ...cue("ATTACK"),
      pulse: 0,
    });
    expect(still.log).toEqual(attack.log);
    expect(attack.log.some((entry) => entry[0] === "fill")).toBe(false);
    for (const ready of ["FRESH", "ACTIVE"] as const) {
      const ring = recordingContext();
      drawReadyGroundCueV7(ring.context, ground, 1, cue(ready));
      expect(strokes(ring.log)).not.toContain("#ff655f");
      expect(ring.log.some((entry) => entry[0] === "setLineDash")).toBe(false);
    }
    const spent = recordingContext();
    drawReadyGroundCueV7(spent.context, ground, 1, cue("SPENT"));
    expect(spent.log).toEqual([]);
  });
});
