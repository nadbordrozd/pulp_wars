import { describe, expect, it } from "vitest";
import {
  EMBARKED_LANDING_MAX_SPENT_V7,
  EMBARKED_MOVE_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  embarkedMovementSpentV7,
  publicUnitStatsV7,
  queryLandingPreviewV7,
  queryPlayerCommandsV7,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  LANDING_AFTER_MOVE_LABEL_V7,
  LANDING_NOW_LABEL_V7,
} from "../../src/render/canvas/board-renderer-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  READY_ACTIVATION_V7,
  embarkedLandingV7,
} from "../fixtures/v7-naval-builders";

// Revision 16b (`pulp_wars-zsa`): Patrol Boats and embarked units have Move 2,
// and DISEMBARK spends one of those points (legal while the Move this turn
// spent at most one), docs/product/RULESET_7_REVISION_16.md sections 5 and
// 10.2.

describe("ruleset-7 revision-16 boat and transport Move values", () => {
  it("gives Patrol Boats and embarked units Move 2 for both factions and keeps the others", () => {
    expect(EMBARKED_MOVE_V7).toBe(2);
    expect(EMBARKED_LANDING_MAX_SPENT_V7).toBe(1);
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      expect(effectiveRoleRuleV7("PATROL_BOAT", faction).move).toBe(2);
      expect(effectiveRoleRuleV7("BATTLESHIP", faction).move).toBe(2);
      // Knight (Human) and Vampire (Undead) keep Move 3 on land.
      expect(effectiveRoleRuleV7("KNIGHT", faction).move).toBe(3);
      const fixture = embarkedLandingV7(9601, faction);
      const unit = unitOf(fixture.state, fixture.unitId);
      const stats = publicUnitStatsV7(fixture.state, unit);
      expect(moveStat(stats)).toBe(2);
      // The public view carries the same Move 2.
      const view = viewForV7(fixture.state, fixture.state.humanPlayerId);
      const published = view.unitStats.find(
        (entry) => entry.unitId === fixture.unitId,
      );
      expect(published === undefined ? null : moveStat(published)).toBe(2);
    }
    expect(effectiveRoleRuleV7("KNIGHT", "UNDEAD").label).toBe("Vampire");
  });

  it("rejects a three-cell water path as BUDGET_EXCEEDED for transports and Patrol Boats", () => {
    const fixture = embarkedLandingV7();
    const path = [...fixture.water];
    for (const variant of [
      fixture.state,
      patchUnit(fixture.state, fixture.unitId, {
        role: "PATROL_BOAT",
        form: "NAVAL",
        hp: 10,
        maxHp: 10,
      }),
    ]) {
      const unit = unitOf(variant, fixture.unitId);
      expect(validateMovementPathV7(variant, unit, path)).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
      const view = viewForV7(variant, variant.humanPlayerId);
      const publicUnit = view.units.find((item) => item.id === unit.id);
      if (publicUnit === undefined) throw new Error("public unit missing");
      expect(validatePlayerMovementPathV7(view, publicUnit, path)).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
      const before = JSON.stringify(variant);
      expect(
        applyCommandV7(variant, variant.humanPlayerId, {
          kind: "MOVE",
          unitId: unit.id,
          path,
        }),
      ).toMatchObject({ accepted: false });
      expect(JSON.stringify(variant)).toBe(before);
      // Two cells stay legal.
      expect(
        applyCommandV7(variant, variant.humanPlayerId, {
          kind: "MOVE",
          unitId: unit.id,
          path: path.slice(0, 2),
        }),
      ).toMatchObject({ accepted: true });
      const moves = queryPlayerCommandsV7(view).filter(
        (command) => command.kind === "MOVE" && command.unitId === unit.id,
      );
      expect(moves.length).toBeGreaterThan(0);
      expect(
        moves.every(
          (command) => command.kind === "MOVE" && command.path.length <= 2,
        ),
      ).toBe(true);
    }
  });
});

describe("ruleset-7 revision-16 landing reach", () => {
  it("lands directly from the start cell", () => {
    const fixture = embarkedLandingV7();
    const landed = accept(fixture.state, {
      kind: "DISEMBARK",
      unitId: fixture.unitId,
      at: fixture.direct,
    });
    expect(unitOf(landed.state, fixture.unitId)).toMatchObject({
      form: "LAND",
      at: fixture.direct,
      captureEligible: false,
      activation: { moved: true, handled: true },
    });
  });

  it("moves one water cell and then lands, keeping capture eligibility unchanged", () => {
    const fixture = embarkedLandingV7();
    const moved = accept(fixture.state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0]],
    });
    const afloat = unitOf(moved.state, fixture.unitId);
    expect(afloat.activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
      handled: false,
    });
    expect(embarkedMovementSpentV7(afloat.activation)).toBe(1);
    expect(offeredLandings(moved.state, fixture.unitId)).toContainEqual(
      fixture.afterMove,
    );
    const landed = accept(moved.state, {
      kind: "DISEMBARK",
      unitId: fixture.unitId,
      at: fixture.afterMove,
    });
    expect(landed.events[0]).toEqual({
      kind: "UNIT_DISEMBARKED",
      playerId: fixture.state.humanPlayerId,
      unitId: fixture.unitId,
      passengerRole: afloat.role,
      from: fixture.water[0],
      to: fixture.afterMove,
    });
    expect(unitOf(landed.state, fixture.unitId)).toMatchObject({
      form: "LAND",
      at: fixture.afterMove,
      captureEligible: false,
      activation: { moved: true, handled: true },
    });
    expect(
      queryPlayerCommandsV7(
        viewForV7(landed.state, landed.state.humanPlayerId),
      ).some(
        (command) =>
          (command.kind === "MOVE" ||
            command.kind === "DISEMBARK" ||
            command.kind === "CAPTURE") &&
          command.unitId === fixture.unitId,
      ),
    ).toBe(false);
  });

  it("rejects DISEMBARK after a two-cell Move with MOVEMENT_ILLEGAL and no state change", () => {
    const fixture = embarkedLandingV7();
    const moved = accept(fixture.state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0], fixture.water[1]],
    });
    expect(
      embarkedMovementSpentV7(unitOf(moved.state, fixture.unitId).activation),
    ).toBe(2);
    expect(offeredLandings(moved.state, fixture.unitId)).toEqual([]);
    const before = JSON.stringify(moved.state);
    for (const at of [fixture.afterMove, fixture.beyond]) {
      const result = applyCommandV7(moved.state, moved.state.humanPlayerId, {
        kind: "DISEMBARK",
        unitId: fixture.unitId,
        at,
      });
      expect(result).toMatchObject({
        accepted: false,
        error: { code: "MOVEMENT_ILLEGAL" },
      });
      if (!result.accepted) expect(result.state).toBe(moved.state);
    }
    expect(JSON.stringify(moved.state)).toBe(before);
  });

  it.each([
    // A hidden embarked unit projects no ZOC: the Move meets its cell, and
    // the event names the blocked cell.
    ["OCCUPIED", "FIGHTER", "EMBARKED", 1],
    // A hidden Patrol Boat is seen from the first cell: newly seen ZOC stops
    // the Move there.
    ["ZOC", "PATROL_BOAT", "NAVAL", 0],
  ] as const)(
    "still lands after a Move interrupted after one cell (%s)",
    (reason, role, form, eventCell) => {
      const fixture = embarkedLandingV7();
      const hostile = fixture.state.units.find(
        (unit) => unit.ownerId !== fixture.state.humanPlayerId,
      );
      if (hostile === undefined) throw new Error("hostile unit missing");
      // The second water cell is unexplored, so its occupant is hidden.
      const patched = patchUnit(fixture.state, hostile.id, {
        role,
        form,
        at: fixture.water[1],
        hp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
        maxHp: effectiveRoleRuleV7(role, "ORIGINAL").maxHp,
      });
      const state = checkedV7({
        ...patched,
        players: patched.players.map((player) =>
          player.id === patched.humanPlayerId
            ? {
                ...player,
                explored: player.explored.filter(
                  (at) => !same(at, fixture.water[1]),
                ),
              }
            : player,
        ),
      });
      const view = viewForV7(state, state.humanPlayerId);
      expect(view.units.some((unit) => unit.id === hostile.id)).toBe(false);
      const path = [fixture.water[0], fixture.water[1]];
      expect(
        queryPlayerCommandsV7(view).some(
          (command) =>
            command.kind === "MOVE" &&
            command.unitId === fixture.unitId &&
            JSON.stringify(command.path) === JSON.stringify(path),
        ),
      ).toBe(true);
      const moved = accept(state, {
        kind: "MOVE",
        unitId: fixture.unitId,
        path,
      });
      expect(moved.events).toContainEqual({
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: fixture.unitId,
        at: fixture.water[eventCell],
        reason,
      });
      expect(unitOf(moved.state, fixture.unitId)).toMatchObject({
        at: fixture.water[0],
        activation: { moved: true, movedPathLength: 1, handled: false },
      });
      accept(moved.state, {
        kind: "DISEMBARK",
        unitId: fixture.unitId,
        at: fixture.afterMove,
      });
    },
  );

  it("does not let hostile ZOC block landing", () => {
    const fixture = embarkedLandingV7();
    const hostile = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (hostile === undefined) throw new Error("hostile unit missing");
    // A hostile Fighter next to the first water cell and both landing cells.
    const zocAt = { x: fixture.water[0].x, y: fixture.direct.y };
    const state = patchUnit(fixture.state, hostile.id, {
      role: "FIGHTER",
      form: "LAND",
      at: zocAt,
      hp: 12,
      maxHp: 12,
    });
    expect(
      viewForV7(state, state.humanPlayerId).units.some(
        (unit) => unit.id === hostile.id,
      ),
    ).toBe(true);
    accept(state, {
      kind: "DISEMBARK",
      unitId: fixture.unitId,
      at: fixture.direct,
    });
    const moved = accept(state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0]],
    });
    accept(moved.state, {
      kind: "DISEMBARK",
      unitId: fixture.unitId,
      at: fixture.afterMove,
    });
  });
});

// Revisions 6 and 16 (`pulp_wars-0ao.15`): landing ends the unit's activation
// for every faction. After DISEMBARK the landed unit is offered nothing, and
// every further unit command is rejected atomically with the existing codes.
describe("ruleset-7 landing ends the activation", () => {
  for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const)
    it(`offers and accepts nothing more for a landed ${faction} unit`, () => {
      const water = [at(0, 0), at(0, 1), at(0, 2), at(1, 0)];
      const landing = at(1, 1);
      const enemyAt = at(2, 1);
      const arena = (form: "EMBARKED" | "LAND", where: CoordV7) =>
        goblinArenaV7(
          [faction, "ORIGINAL"],
          [
            { seat: 0, role: "FIGHTER", at: where, form, hp: 5 },
            { seat: 1, role: "FIGHTER", at: enemyAt },
          ],
          { water },
        );
      const state = arena("EMBARKED", at(0, 1));
      const seat = seatIdV7(state, 0);
      const mover = unitAtV7(state, at(0, 1)).id;
      const enemy = unitAtV7(state, enemyAt).id;
      const offeredFor = (current: GameStateV7, unitId: number) =>
        queryPlayerCommandsV7(current, seat).filter(
          (command) => "unitId" in command && command.unitId === unitId,
        );
      expect(offeredFor(state, mover)).toContainEqual({
        kind: "DISEMBARK",
        unitId: mover,
        at: landing,
      });
      // Control: an unmoved land unit on the landing cell may attack, Recover
      // (not a Restless Undead unit outside its territory), and Disband
      // there, so the rejections below come from the landing.
      const ready = arena("LAND", landing);
      const kinds = offeredFor(ready, unitAtV7(ready, landing).id).map(
        (command) => command.kind,
      );
      for (const kind of ["ATTACK", "DISBAND", "MOVE", "WAIT"])
        expect(kinds).toContain(kind);
      if (faction !== "UNDEAD") expect(kinds).toContain("RECOVER");
      if (faction === "GOBLIN") expect(kinds).toContain("KABOOM");

      const landed = applyOkV7(state, seat, {
        kind: "DISEMBARK",
        unitId: mover,
        at: landing,
      }).state;
      expect(unitAtV7(landed, landing)).toMatchObject({
        id: mover,
        form: "LAND",
        activation: { moved: true, handled: true },
      });
      expect(offeredFor(landed, mover)).toEqual([]);
      const reject = (command: CommandV7) => {
        const result = applyCommandV7(landed, seat, command);
        if (result.accepted) throw new Error(`${command.kind} accepted`);
        expect(result.state).toBe(landed);
        expect(result.events).toEqual([]);
        return result.error;
      };
      const acted = { code: "UNIT_ALREADY_ACTED", params: { unitId: mover } };
      expect(
        reject({ kind: "ATTACK", unitId: mover, targetUnitId: enemy }),
      ).toEqual(acted);
      expect(reject({ kind: "DISBAND", unitId: mover })).toEqual(acted);
      expect(reject({ kind: "RECOVER", unitId: mover })).toEqual(acted);
      expect(reject({ kind: "MOVE", unitId: mover, path: [at(2, 2)] })).toEqual(
        acted,
      );
      expect(reject({ kind: "WAIT", unitId: mover })).toEqual({
        code: "UNIT_ALREADY_HANDLED",
        params: { unitId: mover },
      });
      expect(
        reject({ kind: "DISEMBARK", unitId: mover, at: at(2, 2) }),
      ).toEqual({ code: "MOVEMENT_ILLEGAL", params: {} });
      expect(reject({ kind: "KABOOM", unitId: mover })).toEqual(
        faction === "GOBLIN"
          ? acted
          : { code: "UNIT_ROLE_INVALID", params: { role: "FIGHTER" } },
      );
    });
});

describe("ruleset-7 revision-16 landing queries and preview", () => {
  it("offers DISEMBARK exactly when the engine accepts it, at 0, 1, and 2 points spent", () => {
    const fixture = embarkedLandingV7();
    const states = [
      fixture.state,
      accept(fixture.state, {
        kind: "MOVE",
        unitId: fixture.unitId,
        path: [fixture.water[0]],
      }).state,
      accept(fixture.state, {
        kind: "MOVE",
        unitId: fixture.unitId,
        path: [fixture.water[0], fixture.water[1]],
      }).state,
    ];
    const offeredCounts: number[] = [];
    for (const state of states) {
      const unit = unitOf(state, fixture.unitId);
      const offered = offeredLandings(state, fixture.unitId);
      offeredCounts.push(offered.length);
      for (let y = unit.at.y - 1; y <= unit.at.y + 1; y += 1)
        for (let x = unit.at.x - 1; x <= unit.at.x + 1; x += 1) {
          const at = { x, y };
          const result = applyCommandV7(state, state.humanPlayerId, {
            kind: "DISEMBARK",
            unitId: fixture.unitId,
            at,
          });
          expect(result.accepted, `${x},${y}`).toBe(
            offered.some((item) => item.x === x && item.y === y),
          );
        }
    }
    expect(offeredCounts[0]).toBeGreaterThan(0);
    expect(offeredCounts[1]).toBeGreaterThan(0);
    expect(offeredCounts[2]).toBe(0);
  });

  it("previews direct landings and one-step landings via the first water cell in (y, x) order", () => {
    const fixture = embarkedLandingV7();
    const view = viewForV7(fixture.state, fixture.state.humanPlayerId);
    const preview = queryLandingPreviewV7(view, fixture.unitId);
    if (preview === null) throw new Error("landing preview missing");
    expect(preview.direct).toContainEqual(fixture.direct);
    expect(preview.direct).toEqual(
      offeredLandings(fixture.state, fixture.unitId),
    );
    const after = preview.afterMove.map((item) => item.at);
    expect(after).toContainEqual(fixture.afterMove);
    expect(after).not.toContainEqual(fixture.beyond);
    expect(after).not.toContainEqual(fixture.direct);
    // (x + 2, y - 1) touches only the first water cell; (x + 2, y + 1) too.
    const upper = preview.afterMove.find((item) =>
      same(item.at, fixture.afterMove),
    );
    expect(upper).toEqual({
      at: fixture.afterMove,
      move: {
        kind: "MOVE",
        unitId: fixture.unitId,
        path: [fixture.water[0]],
      },
      disembark: {
        kind: "DISEMBARK",
        unitId: fixture.unitId,
        at: fixture.afterMove,
      },
    });
    // Every preview entry is exactly a legal Move-then-land pair, and every
    // intermediate cell is the first offered one-cell Move destination in
    // (y, x) order adjacent to the landing cell.
    const oneCellMoves = queryPlayerCommandsV7(view)
      .flatMap((command) =>
        command.kind === "MOVE" &&
        command.unitId === fixture.unitId &&
        command.path.length === 1
          ? [command.path[0] as CoordV7]
          : [],
      )
      .sort((left, right) => left.y - right.y || left.x - right.x);
    for (const entry of preview.afterMove) {
      expect(entry.move.path[0]).toEqual(
        oneCellMoves.find(
          (at) =>
            Math.max(
              Math.abs(at.x - entry.at.x),
              Math.abs(at.y - entry.at.y),
            ) === 1,
        ),
      );
      const moved = accept(fixture.state, entry.move);
      accept(moved.state, entry.disembark);
    }
    // After a one-cell Move only direct cells remain; after two, none.
    const one = accept(fixture.state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0]],
    }).state;
    const oneView = viewForV7(one, one.humanPlayerId);
    expect(queryLandingPreviewV7(oneView, fixture.unitId)).toMatchObject({
      afterMove: [],
    });
    expect(
      queryLandingPreviewV7(oneView, fixture.unitId)?.direct,
    ).toContainEqual(fixture.afterMove);
    const two = accept(fixture.state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0], fixture.water[1]],
    }).state;
    expect(
      queryLandingPreviewV7(viewForV7(two, two.humanPlayerId), fixture.unitId),
    ).toEqual({ unitId: fixture.unitId, direct: [], afterMove: [] });
    // Not an embarked own unit: no preview.
    const landed = accept(fixture.state, {
      kind: "DISEMBARK",
      unitId: fixture.unitId,
      at: fixture.direct,
    }).state;
    expect(
      queryLandingPreviewV7(
        viewForV7(landed, landed.humanPlayerId),
        fixture.unitId,
      ),
    ).toBeNull();
  });

  it("marks both landing styles on the board and composes the two-command landing", () => {
    const fixture = embarkedLandingV7();
    const view = viewForV7(fixture.state, fixture.state.humanPlayerId);
    const commands = queryPlayerCommandsV7(view);
    const interaction = {
      selection: { kind: "UNIT" as const, unitId: fixture.unitId },
      selectedUnitId: fixture.unitId,
      selectedAchievement: null,
    };
    const plan = buildBoardRenderPlanV7(view, commands, interaction);
    const direct = plan.targets.find((target) =>
      same(target.at, fixture.direct),
    );
    expect(direct).toMatchObject({
      family: "DISEMBARK",
      previewLabel: LANDING_NOW_LABEL_V7,
      command: { kind: "DISEMBARK", at: fixture.direct },
    });
    expect(direct?.followUp).toBeUndefined();
    const twoStep = plan.targets.find((target) =>
      same(target.at, fixture.afterMove),
    );
    expect(twoStep).toMatchObject({
      family: "LANDING_AFTER_MOVE",
      previewLabel: LANDING_AFTER_MOVE_LABEL_V7,
      command: { kind: "MOVE", path: [fixture.water[0]] },
      followUp: { kind: "DISEMBARK", at: fixture.afterMove },
    });
    expect(plan.targets.some((target) => same(target.at, fixture.beyond))).toBe(
      false,
    );
    expect(LANDING_NOW_LABEL_V7).toBe("Land now");
    expect(LANDING_AFTER_MOVE_LABEL_V7).toBe("Move 1, then land");
    // After a one-cell Move only "Land now" markers remain.
    const one = accept(fixture.state, {
      kind: "MOVE",
      unitId: fixture.unitId,
      path: [fixture.water[0]],
    }).state;
    const oneView = viewForV7(one, one.humanPlayerId);
    const onePlan = buildBoardRenderPlanV7(
      oneView,
      queryPlayerCommandsV7(oneView),
      interaction,
    );
    expect(onePlan.targets.length).toBeGreaterThan(0);
    expect(
      onePlan.targets.every((target) => target.family === "DISEMBARK"),
    ).toBe(true);
  });
});

function accept(
  state: GameStateV7,
  command: CommandV7,
): Extract<ReturnType<typeof applyCommandV7>, { accepted: true }> {
  const result = applyCommandV7(state, state.humanPlayerId, command);
  if (!result.accepted)
    throw new Error(`${command.kind}: ${JSON.stringify(result.error)}`);
  return result;
}

function offeredLandings(state: GameStateV7, unitId: number): CoordV7[] {
  return queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId))
    .flatMap((command) =>
      command.kind === "DISEMBARK" && command.unitId === unitId
        ? [command.at]
        : [],
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function unitOf(state: GameStateV7, unitId: number): UnitStateV7 {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new Error(`unit ${unitId} missing`);
  return unit;
}

function patchUnit(
  state: GameStateV7,
  unitId: number,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId
        ? { ...unit, activation: READY_ACTIVATION_V7, ...patch }
        : unit,
    ),
  });
}

function moveStat(stats: {
  readonly stats: readonly {
    readonly id: string;
    readonly total: {
      readonly numerator: number;
      readonly denominator: number;
    };
  }[];
}): number | null {
  const move = stats.stats.find((stat) => stat.id === "MOVE");
  return move === undefined
    ? null
    : move.total.numerator / move.total.denominator;
}

function at(x: number, y: number): CoordV7 {
  return { x, y };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
