import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  isNeutralOwnerV7,
  parseEventV7,
  previewStampedeV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  unitScoreValueV7,
} from "../../src/engine/index";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { activeIdV7, at, kindsV7, moveV7 } from "../fixtures/v7-revision20";
import { round2ArenaV7, round2UnitAtV7 } from "../fixtures/v7-round2-arena";

// Ice Folk Freeze (`pulp_wars-w49.37`, docs/product/RULESET_7_CURRENT.md
// section 21.18): the Mammoth's Stampede. The Ice Folk field: seat 0's
// capital (8, 8), seat 1's (2, 8), villages (5, 5), (8, 5), (5, 8); every
// other land tile outside a territory is open Grass.

/** A Mammoth of seat 0 on (2, 2) and the given pieces. */
const field = (more: readonly IcePieceV7[]): GameStateV7 =>
  iceFieldV7([{ seat: 0, role: "SWORDSMAN", at: at(2, 2) }, ...more]);

const stampede = (state: GameStateV7, to: CoordV7): CommandV7 => ({
  kind: "STAMPEDE",
  unitId: unitAtV7(state, at(2, 2)).id,
  at: to,
});

describe("the Mammoth's Stampede (section 21.18)", () => {
  it("charges three tiles, hits a hostile unit in its way for 3, and shoves it to the clockwise side", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(3, 2) }]);
    const mammoth = unitAtV7(state, at(2, 2));
    const fighter = unitAtV7(state, at(3, 2));
    const result = playV7(state, stampede(state, at(5, 2)));
    expect(result.events[0]).toEqual({
      kind: "MAMMOTH_STAMPEDED",
      playerId: seatIdV7(state, 0),
      unitId: mammoth.id,
      from: at(2, 2),
      to: at(5, 2),
      path: [at(3, 2), at(4, 2), at(5, 2)],
      results: [
        {
          unitId: fighter.id,
          at: at(3, 2),
          damage: 3,
          shieldDamage: 0,
          dies: false,
          // East is the charge; the clockwise side of (3, 2) is (3, 3).
          shovedTo: at(3, 3),
        },
      ],
    });
    const after = unitAtV7(result.state, at(5, 2));
    expect(after.id).toBe(mammoth.id);
    // No retaliation; the Mammoth is spent for the turn.
    expect(after.hp).toBe(mammoth.hp);
    expect(after.activation).toMatchObject({
      moved: true,
      specialActed: true,
      handled: true,
    });
    expect(
      offeredV7(result.state).filter(
        (command) => "unitId" in command && command.unitId === mammoth.id,
      ),
    ).toEqual([]);
    const shoved = unitAtV7(result.state, at(3, 3));
    expect(shoved).toMatchObject({ id: fighter.id, hp: fighter.hp - 3 });
  });

  it("shoves to the other side when the clockwise side is taken, and goes diagonally", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
      // The clockwise side of (3, 3) on a south-east charge is (2, 4).
      { seat: 0, role: "FIGHTER", at: at(2, 4) },
    ]);
    const fighter = unitAtV7(state, at(3, 3));
    const result = playV7(state, stampede(state, at(4, 4)));
    expect(result.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      path: [at(3, 3), at(4, 4)],
      to: at(4, 4),
      results: [{ unitId: fighter.id, shovedTo: at(4, 2) }],
    });
    expect(unitAtV7(result.state, at(4, 2)).id).toBe(fighter.id);
  });

  it("kills a unit the hit leaves at 0 and goes on through its tile, credited with the kill", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(3, 2), hp: 2 }]);
    const mammoth = unitAtV7(state, at(2, 2));
    const fighter = unitAtV7(state, at(3, 2));
    const result = playV7(state, stampede(state, at(4, 2)));
    expect(result.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      to: at(4, 2),
      results: [{ unitId: fighter.id, damage: 2, dies: true, shovedTo: null }],
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "UNIT_DIED",
        unitId: fighter.id,
        cause: "STAMPEDE",
      }),
    );
    expect(unitAtV7(result.state, at(4, 2))).toMatchObject({
      id: mammoth.id,
      kills: mammoth.kills + 1,
    });
  });

  it("stops before a unit it cannot shove, which still takes the hit", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
      { seat: 0, role: "FIGHTER", at: at(3, 1) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
    ]);
    const fighter = unitAtV7(state, at(3, 2));
    const result = playV7(state, stampede(state, at(5, 2)));
    expect(result.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      from: at(2, 2),
      to: at(2, 2),
      path: [],
      results: [{ unitId: fighter.id, damage: 3, shovedTo: null }],
    });
    expect(unitAtV7(result.state, at(3, 2)).hp).toBe(fighter.hp - 3);
    expect(unitAtV7(result.state, at(2, 2)).activation.moved).toBe(true);
  });

  it("refuses a bent or long line, a path through an own unit or a settlement center, a moved or spent Mammoth, and another role", () => {
    const state = field([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 3) },
    ]);
    expect(rejectedV7(state, stampede(state, at(4, 3)))).toEqual({
      code: "STAMPEDE_NOT_LEGAL",
      params: { reason: "DIRECTION" },
    });
    expect(rejectedV7(state, stampede(state, at(6, 2))).params).toEqual({
      reason: "DIRECTION",
    });
    // An own Yeti on (4, 2) closes the line beyond it.
    expect(rejectedV7(state, stampede(state, at(5, 2))).params).toEqual({
      reason: "BLOCKED",
    });
    expect(offeredV7(state, "STAMPEDE")).toContainEqual(
      stampede(state, at(3, 2)),
    );
    // The village center (5, 5) closes the diagonal beyond (4, 4).
    expect(rejectedV7(state, stampede(state, at(5, 5))).params).toEqual({
      reason: "BLOCKED",
    });
    expect(offeredV7(state, "STAMPEDE")).toContainEqual(
      stampede(state, at(4, 4)),
    );
    // A Mammoth that moved.
    const moved = moveV7(state, at(2, 2), [at(2, 3)]).state;
    expect(
      rejectedV7(moved, {
        kind: "STAMPEDE",
        unitId: unitAtV7(moved, at(2, 3)).id,
        at: at(2, 1),
      }),
    ).toEqual({ code: "STAMPEDE_NOT_LEGAL", params: { reason: "MOVED" } });
    // A Mammoth that attacked.
    const attacked = applyOkV7(state, activeIdV7(state), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(2, 2)).id,
      targetUnitId: unitAtV7(state, at(1, 3)).id,
    }).state;
    expect(rejectedV7(attacked, stampede(attacked, at(2, 1))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    // A Yeti has no Stampede.
    expect(
      rejectedV7(state, {
        kind: "STAMPEDE",
        unitId: unitAtV7(state, at(4, 2)).id,
        at: at(4, 1),
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
  });

  it("offers every open end of every line, each accepted, and previews the visible hits", () => {
    const state = field([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(2, 3), hp: 2 },
    ]);
    const offered = offeredV7(state, "STAMPEDE");
    expect(offered.length).toBeGreaterThan(8);
    for (const command of offered) {
      const result = applyCommandV7(state, activeIdV7(state), command);
      expect(result.accepted, JSON.stringify(command)).toBe(true);
      if (result.accepted)
        for (const event of result.events)
          expect(parseEventV7(event).ok, event.kind).toBe(true);
    }
    const view = viewForV7(state, activeIdV7(state));
    const mammoth = unitAtV7(state, at(2, 2));
    expect(previewStampedeV7(view, mammoth.id, at(2, 5))).toEqual({
      unitId: mammoth.id,
      at: at(2, 5),
      path: [at(2, 3), at(2, 4), at(2, 5)],
      hits: [
        {
          unitId: unitAtV7(state, at(2, 3)).id,
          at: at(2, 3),
          damage: 2,
          dies: true,
          shieldDamage: 0,
        },
      ],
    });
    expect(previewStampedeV7(view, mammoth.id, at(4, 3))).toBeNull();
    const result = playV7(state, stampede(state, at(2, 5)));
    expect(kindsV7(result.events)).toContain("UNIT_DIED");
    expect(unitAtV7(result.state, at(2, 5)).id).toBe(mammoth.id);
  });
});

describe("the Stampede and the score and curiosities rules (7r65, 7r66)", () => {
  it("scores a Stampede kill once: a Kill for the Mammoth's seat and a loss for the victim's", () => {
    const state = field([{ seat: 1, role: "FIGHTER", at: at(3, 2), hp: 2 }]);
    const victim = unitAtV7(state, at(3, 2));
    const value = unitScoreValueV7(state, victim);
    expect(value).toBeGreaterThan(0);
    const ledgerOf = (after: GameStateV7, seat: number) =>
      after.scoreLedger.find(
        (entry) => entry.playerId === seatIdV7(after, seat),
      );
    const result = playV7(state, stampede(state, at(4, 2)));
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: victim.id,
      cause: "STAMPEDE",
    });
    expect(ledgerOf(result.state, 0)).toMatchObject({
      killValue: (ledgerOf(state, 0)?.killValue ?? 0) + value,
      lossValue: 0,
    });
    expect(ledgerOf(result.state, 1)).toMatchObject({
      lossValue: (ledgerOf(state, 1)?.lossValue ?? 0) + value,
      hpLost: 2,
      flawless: false,
    });
  });

  it("hits a neutral camp guard, never shoves it, stops before it, and is provoked against", () => {
    const P1 = 1 as PlayerId;
    const arena = round2ArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      pieces: [{ seat: 0, role: "SWORDSMAN", at: at(3, 8) }],
      neutrals: [{ breed: "ZOMBIE", home: at(5, 9), at: at(5, 8) }],
      curiosities: [{ kind: "GRAVEYARD", at: at(5, 9) }],
    });
    const mammoth = round2UnitAtV7(arena, at(3, 8));
    const zombie = round2UnitAtV7(arena, at(5, 8));
    expect(isNeutralOwnerV7(zombie.ownerId)).toBe(true);
    const result = applyCommandV7(arena, P1, {
      kind: "STAMPEDE",
      unitId: mammoth.id,
      at: at(6, 8),
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events[0]).toMatchObject({
      kind: "MAMMOTH_STAMPEDED",
      to: at(4, 8),
      path: [at(4, 8)],
      results: [{ unitId: zombie.id, damage: 3, dies: false, shovedTo: null }],
    });
    expect(round2UnitAtV7(result.state, at(5, 8)).id).toBe(zombie.id);
    expect(
      result.state.monsters.find((entry) => entry.unitId === zombie.id)
        ?.provokedBy,
    ).toEqual([mammoth.id]);
  });
});
