import { describe, expect, it } from "vitest";
import { bombThreatAtV7, dwarfFactsV7 } from "../../src/ai/v7-dwarf";
import {
  BOMB_DAMAGE_V7,
  BOMB_RANGE_V7,
  DIVE_BOMB_DAMAGE_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  previewBombRunV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { heldUnitsAfterV7 } from "../../src/render/canvas/board-host-v7";
import {
  bombFlightPathV7,
  corePresentationPlanV7,
} from "../../src/render/canvas/presentation-plan-v7";
import { bombV7, dwarfFieldV7, offeredOfV7 } from "../fixtures/v7-dwarf";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { playV7 } from "../fixtures/v7-martian";
import { activeIdV7, at } from "../fixtures/v7-revision20";

// The Gyrocopter pass (`pulp_wars-w49.44`, `pulp-wars-poc-7r102`;
// docs/product/RULESET_7_CURRENT.md section 22.5): a Bomb Run flies over a
// visible enemy within 2, drops a bomb of 6 (7 with Dive), and lands on the
// Gyrocopter's own tile or any tile an ordinary Move of it could end on
// (before: within 2 of the target and strictly farther from the start, so
// it always ended among the enemy). The field is tests/fixtures/v7-dwarf.ts:
// an 11 x 11 board, seat 0 (Dwarf) capital (8, 8) with territory x 7-9,
// y 7-9; seat 1 (Human) capital (2, 8) with territory x 1-3, y 7-9;
// villages (5, 5), (8, 5), (5, 8); open Grass elsewhere; every technology
// unless a test removes Raiding; every tile explored.

const NO_DIVE = TECHNOLOGY_IDS_V7.filter(
  (tech) => tech !== "RAIDING" && tech !== "CHIVALRY",
);

function bombed(
  events: readonly DomainEventV7[],
): Extract<DomainEventV7, { kind: "UNIT_BOMBED" }> {
  const event = events.find((item) => item.kind === "UNIT_BOMBED");
  if (event?.kind !== "UNIT_BOMBED") throw new Error("no bomb");
  return event;
}

function runsOf(
  state: GameStateV7,
  from: { x: number; y: number },
): readonly Extract<CommandV7, { kind: "BOMB_RUN" }>[] {
  return offeredOfV7(state, from, "BOMB_RUN").filter(
    (command): command is Extract<CommandV7, { kind: "BOMB_RUN" }> =>
      command.kind === "BOMB_RUN",
  );
}

describe("the Gyrocopter pass: identity", () => {
  // Map curiosities round 3 A (`pulp_wars-737.20`) took 7r103 after it, and
  // round 3 B (`pulp_wars-737.21`) 7r104.
  it("was pulp-wars-poc-7r102, after 7r101 in the prior list", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r107");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r107.current");
    expect(PRIOR_RULESET_7_IDS.slice(-6, -4)).toEqual([
      "pulp-wars-poc-7r101",
      "pulp-wars-poc-7r102",
    ]);
  });
});

describe("the Gyrocopter pass: the bomb (section 22.5)", () => {
  it("drops 6, 7 with Dive, within 2", () => {
    expect([BOMB_RANGE_V7, BOMB_DAMAGE_V7, DIVE_BOMB_DAMAGE_V7]).toEqual([
      2, 6, 7,
    ]);
  });

  it("with one Hammerer hit after it, kills a fresh Fighter on open ground (5 left it at 1)", () => {
    // A fresh Human Fighter (12 HP, Defense 2) bombed for 6 is at 6 HP. A
    // fresh Hammerer (Attack 2) then deals round(2 / (2 + 2 * 6 / 12) * 2 *
    // 4.5) = 6: the kill. With the old bomb of 5 the Fighter was at 7 and
    // the same hit dealt round(2 / (2 + 2 * 7 / 12) * 9) = 6, leaving 1.
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 5) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { techs: { 0: NO_DIVE } },
    );
    const fighter = unitAtV7(state, at(5, 4));
    const bombedState = playV7(
      state,
      bombV7(state, at(5, 2), at(5, 4), at(5, 2)),
    ).state;
    expect(unitAtV7(bombedState, at(5, 4)).hp).toBe(fighter.hp - 6);
    const hit = playV7(bombedState, {
      kind: "ATTACK",
      unitId: unitAtV7(bombedState, at(5, 5)).id,
      targetUnitId: fighter.id,
    });
    expect(hit.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DIED", unitId: fighter.id }),
    );
  });
});

describe("the Gyrocopter pass: the landing (section 22.5 row 10)", () => {
  // The Gyrocopter at (6, 5), next to its own territory (x 7-9, y 7-9); the
  // enemy Fighter 2 tiles north of it.
  const state = dwarfFieldV7([
    { seat: 0, role: "RAIDER", at: at(6, 5) },
    { seat: 1, role: "FIGHTER", at: at(6, 3) },
    { seat: 1, role: "FIGHTER", at: at(1, 1) },
  ]);
  const gyro = unitAtV7(state, at(6, 5));
  const target = unitAtV7(state, at(6, 3));

  it("offers its own tile and every tile its Move reaches, back into its own land too", () => {
    const landings = runsOf(state, at(6, 5)).map((command) => command.to);
    expect(landings).toContainEqual(at(6, 5));
    // Its own territory, 2 and 3 tiles back from the start.
    expect(landings).toContainEqual(at(7, 7));
    expect(landings).toContainEqual(at(9, 8));
    // Beyond the target, as before.
    expect(landings).toContainEqual(at(6, 2));
    // Not 4 from the start.
    expect(landings).not.toContainEqual(at(6, 9));
    for (const to of landings)
      expect(
        Math.max(Math.abs(to.x - 6), Math.abs(to.y - 5)),
      ).toBeLessThanOrEqual(3);
  });

  it("previews exactly what each landing plays, and every offered run is accepted", () => {
    for (const command of runsOf(state, at(6, 5))) {
      const preview = previewBombRunV7(
        viewForV7(state, activeIdV7(state)),
        command,
      );
      if (preview === null) throw new Error("no preview");
      const result = applyCommandV7(state, activeIdV7(state), command);
      if (!result.accepted) throw new Error(result.error.code);
      const event = bombed(result.events);
      expect({
        damage: preview.damage,
        shieldDamage: preview.shieldDamage,
        kills: preview.kills,
        to: preview.to,
      }).toEqual({
        damage: event.damage,
        shieldDamage: event.shieldDamage,
        kills: event.killed,
        to: event.to,
      });
      expect(event.damage).toBe(DIVE_BOMB_DAMAGE_V7);
      expect(
        result.state.units.find((unit) => unit.id === gyro.id)?.at,
      ).toEqual(command.to);
    }
  });

  it("lands back home out of the Fighter's reach next turn", () => {
    // From (6, 5) the Fighter at (6, 3) reaches 2 tiles (Move 1, range 1):
    // the start is in reach; (6, 8), 3 back in its own land, is not.
    const view = viewForV7(state, activeIdV7(state));
    const home = previewBombRunV7(
      view,
      bombV7(state, at(6, 5), at(6, 3), at(6, 5)),
    );
    const back = previewBombRunV7(
      view,
      bombV7(state, at(6, 5), at(6, 3), at(6, 8)),
    );
    expect(home?.landingThreat).toBeGreaterThan(0);
    expect(back?.landingThreat).toBe(0);
    const played = playV7(state, bombV7(state, at(6, 5), at(6, 3), at(6, 8)));
    expect(bombed(played.events)).toMatchObject({
      from: at(6, 5),
      to: at(6, 8),
      at: at(6, 3),
      targetUnitId: target.id,
    });
  });
});

describe("the Gyrocopter pass: the threat it poses to other seats", () => {
  it("counts the Dive bomb on every tile within 2 of a Gyrocopter, and nothing farther", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 6) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const human = seatIdV7(state, 1);
    const view = viewForV7(state, human);
    const facts = dwarfFactsV7(view, (owner) => owner !== human);
    expect(bombThreatAtV7(facts, at(5, 4))).toBe(DIVE_BOMB_DAMAGE_V7);
    expect(bombThreatAtV7(facts, at(7, 4))).toBe(DIVE_BOMB_DAMAGE_V7);
    expect(bombThreatAtV7(facts, at(5, 5))).toBe(0);
  });
});

describe("the Gyrocopter pass: the flight on the board", () => {
  it("flies one tile a step, diagonally first", () => {
    expect(bombFlightPathV7(at(4, 0), at(2, 2))).toEqual([
      at(4, 0),
      at(3, 1),
      at(2, 2),
    ]);
    expect(bombFlightPathV7(at(6, 3), at(6, 8))).toEqual([
      at(6, 3),
      at(6, 4),
      at(6, 5),
      at(6, 6),
      at(6, 7),
      at(6, 8),
    ]);
    expect(bombFlightPathV7(at(5, 2), at(2, 3))).toEqual([
      at(5, 2),
      at(4, 3),
      at(3, 3),
      at(2, 3),
    ]);
  });

  it("flies out over the target, waits there while the bomb falls, then flies on", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(6, 5) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const viewer = activeIdV7(state);
    const gyro = unitAtV7(state, at(6, 5));
    const command = bombV7(state, at(6, 5), at(6, 3), at(7, 7));
    expect(queryPlayerCommandsV7(viewForV7(state, viewer))).toContainEqual(
      command,
    );
    const result = applyCommandV7(state, viewer, command);
    if (!result.accepted) throw new Error(result.error.code);
    const steps = corePresentationPlanV7(
      viewForV7(state, viewer),
      projectEventsV7(state, result.state, viewer, result.events),
      viewForV7(result.state, viewer),
    );
    expect(steps.map((step) => step.kind)).toEqual([
      "MOVE",
      "DWARF",
      "DAMAGE",
      "MOVE",
    ]);
    expect(steps[0]).toMatchObject({
      unitId: gyro.id,
      path: [at(6, 5), at(6, 4), at(6, 3)],
      flight: true,
    });
    expect(steps[1]).toMatchObject({ effect: "BOMB", cells: [at(6, 3)] });
    expect(steps[3]).toMatchObject({
      unitId: gyro.id,
      path: [at(6, 3), at(7, 4), at(7, 5), at(7, 6), at(7, 7)],
      flight: true,
    });
    // The board holds the Gyrocopter at its start before the first leg
    // and over the target while the bomb falls and the damage shows.
    expect(heldUnitsAfterV7(steps, 0).get(gyro.id)).toEqual(at(6, 3));
    expect(heldUnitsAfterV7(steps, 1).get(gyro.id)).toEqual(at(6, 3));
    expect(heldUnitsAfterV7(steps, 2).get(gyro.id)).toEqual(at(6, 3));
    expect(heldUnitsAfterV7(steps, 3).has(gyro.id)).toBe(false);
    // The second leg is as long as its path: the walking pace.
    const first = steps[0];
    const last = steps[3];
    if (first?.kind !== "MOVE" || last?.kind !== "MOVE")
      throw new Error("no legs");
    expect(last.durationMs).toBeGreaterThan(first.durationMs);
  });
});
