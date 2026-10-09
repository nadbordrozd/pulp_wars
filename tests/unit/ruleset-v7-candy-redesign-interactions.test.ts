import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseGameStateV7,
  unitScoreValueV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { collectScoreCreditsV7 } from "../../src/engine/v7/score";
import { checkedV7 } from "../fixtures/v7-builders";
import { candyFieldV7 } from "../fixtures/v7-candy";
import {
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { activeIdV7, at, attackV7 } from "../fixtures/v7-revision20";
import {
  round2ArenaV7,
  round2UnitAtV7,
  type Round2PieceV7,
} from "../fixtures/v7-round2-arena";

// The Candy redesign (`pulp_wars-jdb.12`) against what landed beside it:
// the score ledger (`7r65`), any unit captures (`7r64`), map curiosities
// round 2 (`7r66`: gates, the Wishing Well, camps, neutral units), and Ice
// Folk Freeze (`7r67`: Frozen). Small hand-built boards only.

const ledgerOf = (state: GameStateV7, playerId: PlayerId) => {
  const entry = state.scoreLedger.find((item) => item.playerId === playerId);
  if (entry === undefined) throw new Error("no ledger entry");
  return entry;
};

/** The attack's result, with the score credits it recorded. */
const creditedAttack = (state: GameStateV7, from: CoordV7, to: CoordV7) => {
  const command: CommandV7 = {
    kind: "ATTACK",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, to).id,
  };
  const { result, credits } = collectScoreCreditsV7(() =>
    applyCommandV7(state, activeIdV7(state), command),
  );
  if (!result.accepted) throw new Error(result.error.code);
  return { state: result.state, events: result.events, credits };
};

describe("the score ledger (7r65)", () => {
  it("credits a Ricochet kill once, through Plunder's credit records", () => {
    const state = candyFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 5) },
      { seat: 1, role: "GUARD", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
    ]);
    const victim = unitAtV7(state, at(4, 3));
    const value = unitScoreValueV7(state, victim);
    const candy = seatIdV7(state, 0);
    const human = seatIdV7(state, 1);
    const run = creditedAttack(state, at(5, 5), at(5, 3));
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: victim.id,
      cause: "RICOCHET",
    });
    // The main target survives: the one credit is the Ricochet's.
    expect(run.credits).toEqual([
      {
        creditedId: candy,
        victimOwnerId: human,
        victimUnitId: victim.id,
        value,
      },
    ]);
    expect(ledgerOf(run.state, candy).killValue).toBe(
      ledgerOf(state, candy).killValue + value,
    );
    expect(ledgerOf(run.state, human).lossValue).toBe(
      ledgerOf(state, human).lossValue + value,
    );
  });

  it("credits the target and every Thump kill of one Bunny attack once each", () => {
    const state = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 2 },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
    ]);
    const candy = seatIdV7(state, 0);
    const victims = [at(5, 3), at(6, 2), at(4, 2)].map((where) =>
      unitAtV7(state, where),
    );
    const run = creditedAttack(state, at(5, 4), at(5, 3));
    expect(
      run.events.filter(
        (event) => event.kind === "UNIT_DIED" && event.cause === "THUMP",
      ),
    ).toHaveLength(2);
    expect(
      run.credits.map((credit) => credit.victimUnitId).sort((a, b) => a - b),
    ).toEqual(victims.map((unit) => unit.id).sort((a, b) => a - b));
    const value = victims.reduce(
      (sum, unit) => sum + unitScoreValueV7(state, unit),
      0,
    );
    expect(ledgerOf(run.state, candy).killValue).toBe(
      ledgerOf(state, candy).killValue + value,
    );
  });

  it("moves no counter for a Re-bake (no death, no credit)", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
      ],
      { crumbs: [{ at: at(5, 1), role: "FIGHTER", turnsLeft: 2 }] },
    );
    const command: CommandV7 = {
      kind: "REBAKE",
      unitId: unitAtV7(state, at(5, 3)).id,
      from: at(5, 1),
      at: at(4, 3),
    };
    const { result, credits } = collectScoreCreditsV7(() =>
      playV7(state, command),
    );
    expect(credits).toEqual([]);
    expect(result.state.scoreLedger).toEqual(state.scoreLedger);
  });
});

describe("any unit captures (7r64)", () => {
  it("lets a re-baked copy baked onto a village capture it next turn", () => {
    const VILLAGE = at(5, 5);
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
      ],
      { crumbs: [{ at: at(5, 2), role: "CATAPULT", turnsLeft: 2 }] },
    );
    const human = activeIdV7(state);
    const baked = playV7(state, {
      kind: "REBAKE",
      unitId: unitAtV7(state, at(5, 4)).id,
      from: at(5, 2),
      at: VILLAGE,
    });
    const copy = unitAtV7(baked.state, VILLAGE);
    expect(copy).toMatchObject({ role: "CATAPULT", captureEligible: false });
    expect(offeredV7(baked.state, "CAPTURE")).toEqual([]);
    const back = endTurnUntilV7(baked.state, human).state;
    const capture: CommandV7 = { kind: "CAPTURE", unitId: copy.id };
    expect(offeredV7(back, "CAPTURE")).toContainEqual(capture);
    expect(applyCommandV7(back, human, capture).accepted).toBe(true);
  });
});

describe("map curiosities round 2 (7r66)", () => {
  // Player 1 (Candy) has its capital at (9, 15); the scene is around
  // (9, 9): the Wishing Well, a gate, a Downed Saucer camp centre, and its
  // neutral Grunt guard, with own Toffee Trooper Crumbs at (9, 7).
  const WELL = at(8, 8);
  const GATE = at(10, 8);
  const CAMP = at(8, 10);
  const GUARD = at(10, 9);
  const CRUMBS = at(9, 7);
  const arena = (pieces: readonly Round2PieceV7[]) => {
    const base = round2ArenaV7({
      factions: ["CANDY", "GOBLIN"],
      pieces,
      neutrals: [{ breed: "GRUNT", home: CAMP, at: GUARD }],
      curiosities: [
        { kind: "WISHING_WELL", at: WELL, tossedBy: [] },
        { kind: "GATE", at: GATE, partner: at(2, 2) },
        { kind: "GATE", at: at(2, 2), partner: GATE },
        { kind: "DOWNED_SAUCER", at: CAMP },
      ],
    });
    return checkedV7({
      ...base,
      crumbs: [
        {
          at: CRUMBS,
          role: "FIGHTER",
          ownerId: base.humanPlayerId,
          turnsLeft: 2,
        },
      ],
    });
  };

  it("never bakes a copy on a gate, the Well, a camp centre, or a neutral unit", () => {
    const state = arena([{ seat: 0, role: "CAPTAIN", at: at(9, 9) }]);
    const confectioner = round2UnitAtV7(state, at(9, 9));
    const placements = offeredV7(state, "REBAKE").map((command) =>
      command.kind === "REBAKE" ? command.at : null,
    );
    expect(placements.length).toBeGreaterThan(0);
    for (const blocked of [WELL, GATE, CAMP, GUARD]) {
      expect(placements, JSON.stringify(blocked)).not.toContainEqual(blocked);
      expect(
        rejectedV7(state, {
          kind: "REBAKE",
          unitId: confectioner.id,
          from: CRUMBS,
          at: blocked,
        }),
      ).toEqual({
        code: "REBAKE_NOT_LEGAL",
        params: { reason: "TILE" },
      });
    }
  });

  it("hops a Bunny over the Well, a gate, and a neutral unit without entering them, and never onto a neutral unit", () => {
    const state = arena([{ seat: 0, role: "KNIGHT", at: at(9, 9) }]);
    const bunny = round2UnitAtV7(state, at(9, 9));
    const human = activeIdV7(state);
    // Over the Well to (7, 7), over the gate to (11, 7), and over the
    // guard to (11, 9).
    for (const to of [at(7, 7), at(11, 7), at(11, 9)]) {
      const result = applyCommandV7(state, human, {
        kind: "MOVE",
        unitId: bunny.id,
        path: [to],
      });
      expect(result.accepted, JSON.stringify(to)).toBe(true);
      if (!result.accepted) continue;
      expect(round2UnitAtV7(result.state, to).id).toBe(bunny.id);
      expect(
        result.events.some((event) => event.kind === "GATE_TRAVERSED"),
      ).toBe(false);
    }
    // A hop that would land on the guard's tile is never offered or
    // accepted.
    const facing = arena([{ seat: 0, role: "KNIGHT", at: at(10, 11) }]);
    const other = round2UnitAtV7(facing, at(10, 11));
    expect(
      offeredV7(facing, "MOVE").some(
        (command) =>
          command.kind === "MOVE" &&
          command.unitId === other.id &&
          command.path.some((step) => step.x === GUARD.x && step.y === GUARD.y),
      ),
    ).toBe(false);
    expect(
      applyCommandV7(facing, human, {
        kind: "MOVE",
        unitId: other.id,
        path: [GUARD],
      }).accepted,
    ).toBe(false);
  });
});

describe("Ice Folk Freeze (7r67)", () => {
  it("sticks a Frozen target, which keeps both entries, and a Top-Up clears Frozen with them", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), frozen: { turnsLeft: 2 } },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    const yeti = unitAtV7(state, at(5, 2));
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.retaliation).toBe(false);
    expect(run.combat.stuckApplied).toBe("TARGET");
    expect(run.state.stuck).toEqual([{ unitId: yeti.id, endsLeft: 1 }]);
    expect(run.state.frozen.map((entry) => entry.unitId)).toContain(yeti.id);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(run.state)))).toEqual(
      run.state,
    );
  });

  it("refuses a Top-Up by a Frozen Confectioner and thaws a Frozen, Stuck own unit", () => {
    const frozenConfectioner = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3), frozen: { turnsLeft: 1 } },
        { seat: 0, role: "FIGHTER", at: at(5, 4), hp: 5 },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    const confectioner = unitAtV7(frozenConfectioner, at(5, 3));
    expect(offeredV7(frozenConfectioner, "TOP_UP")).toEqual([]);
    expect(
      rejectedV7(frozenConfectioner, {
        kind: "TOP_UP",
        unitId: confectioner.id,
        targetUnitId: unitAtV7(frozenConfectioner, at(5, 4)).id,
      }).code,
    ).toBe("UNIT_FROZEN");
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 4),
          frozen: { turnsLeft: 1 },
          stuck: 1,
          toothache: 2,
        },
        { seat: 1, role: "FIGHTER", at: at(1, 0) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    const result = playV7(state, {
      kind: "TOP_UP",
      unitId: unitAtV7(state, at(5, 3)).id,
      targetUnitId: unitAtV7(state, at(5, 4)).id,
    });
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_TOPPED_UP",
      amount: 0,
      cured: true,
    });
    expect(result.state.frozen).toEqual([]);
    expect(result.state.stuck).toEqual([]);
    expect(result.state.toothache).toEqual([]);
  });
});
