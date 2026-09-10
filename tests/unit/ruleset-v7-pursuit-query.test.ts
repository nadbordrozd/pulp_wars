import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
} from "../../src/engine/index";
import { horseArcherPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";

describe("ruleset-7 Horse Archer public queries", () => {
  it("publishes exactly two attack uses without a Pursuit phase", () => {
    const fixture = horseArcherPublicFixtureV7();
    const archer = required(
      fixture.view.units.find(
        (unit) =>
          unit.ownerId === fixture.view.viewer.id &&
          unit.role === "HORSE_ARCHER",
      ),
      "Horse Archer missing",
    );
    const attacks = fixture.offeredCommands.filter(
      (command) => command.kind === "ATTACK" && command.unitId === archer.id,
    );
    expect(attacks).toHaveLength(2);
    const first = required(attacks[0], "first attack missing");
    if (first.kind !== "ATTACK") return;
    expect(
      queryCombatPreviewV7(fixture.view, archer.id, first.targetUnitId),
    ).toMatchObject({
      attacksUsed: 1,
      attacksRemaining: 1,
      advances: false,
    });
  });

  it("keeps only attack-specific readiness after the first shot", () => {
    const fixture = horseArcherPublicFixtureV7();
    const archer = required(
      fixture.state.units.find(
        (unit) =>
          unit.ownerId === fixture.state.humanPlayerId &&
          unit.role === "HORSE_ARCHER",
      ),
      "Horse Archer missing",
    );
    const target = required(
      fixture.state.units.find((unit) => unit.ownerId !== archer.ownerId),
      "target missing",
    );
    const first = applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
      kind: "ATTACK",
      unitId: archer.id,
      targetUnitId: target.id,
    });
    if (!first.accepted) throw new Error(first.error.code);
    const view = viewForV7(first.state, fixture.state.humanPlayerId);
    const own = queryPlayerCommandsV7(view).filter(
      (command) => "unitId" in command && command.unitId === archer.id,
    );
    expect(own.filter((command) => command.kind === "ATTACK")).toHaveLength(2);
    expect(own.some((command) => command.kind === "MOVE")).toBe(false);
    expect(own.some((command) => command.kind === "RECOVER")).toBe(false);
    expect(own.some((command) => command.kind === "BLACKOUT_CITY")).toBe(false);
  });

  it("reports no remaining attack after the second shot", () => {
    const fixture = horseArcherPublicFixtureV7();
    const archer = required(
      fixture.state.units.find(
        (unit) =>
          unit.ownerId === fixture.state.humanPlayerId &&
          unit.role === "HORSE_ARCHER",
      ),
      "Horse Archer missing",
    );
    let state = fixture.state;
    for (let shot = 0; shot < 2; shot += 1) {
      const attack = queryPlayerCommandsV7(state, state.humanPlayerId).find(
        (command) => command.kind === "ATTACK" && command.unitId === archer.id,
      );
      if (attack?.kind !== "ATTACK")
        throw new Error("Horse Archer shot missing");
      const result = applyCommandV7(state, state.humanPlayerId, attack);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
    }
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).some(
        (command) => command.kind === "ATTACK" && command.unitId === archer.id,
      ),
    ).toBe(false);
  });
});

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
