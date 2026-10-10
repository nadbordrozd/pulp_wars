import { describe, expect, it } from "vitest";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import {
  BERSERK_MOVE_BONUS_V7,
  GOBLIN_BASELINE_V1_NODES,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  parseGameStateV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  unitIsBerserkV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Goblin explosions and Berserk (`pulp_wars-w49.35`,
// docs/product/RULESET_7_CURRENT.md sections 18.4, 18.5, and 18.10): the
// death blasts are 3 harder (Bomb Chucker 5, Rocket Cart 7, Scrap Buggy 7),
// the Goblin's Kaboom is 6 (the other Kabooms unchanged), and the Orc
// Warboss's `RALLY` is Berserk (WAAAGH! before): every other own land-form
// unit within Chebyshev 2 that has not moved this turn gets +1 Move and
// ignores hostile zones of control until the end of the turn.
//
// Two-seat arena (seed-2 Dry Land, 11 x 11): seat 0 (Goblin) capital (8, 8),
// seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8). Rows 0 to 4 are
// cleared to Grass below, so terrain never stops a Move.

const at = (x: number, y: number): CoordV7 => ({ x, y });

function arena(
  pieces: readonly GoblinPieceV7[],
  water: readonly CoordV7[] = [],
): GameStateV7 {
  const base = goblinArenaV7(["GOBLIN", "ORIGINAL"], pieces, { water });
  return checkedV7({
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.at.y <= 4 &&
        tile.site === null &&
        !water.some((where) => where.x === tile.at.x && where.y === tile.at.y)
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

const WARBOSS = at(1, 2);
const RIDER = at(2, 2);
const GOBLIN = at(1, 4);
// Two enemy Fighters with a gap between them: (3, 2), (4, 2), and (5, 2) are
// all in their zones of control.
const ENEMIES = [at(4, 1), at(4, 3)];

const pieces = (): GoblinPieceV7[] => [
  { seat: 0, role: "CAPTAIN", at: WARBOSS },
  { seat: 0, role: "RAIDER", at: RIDER },
  { seat: 0, role: "FIGHTER", at: GOBLIN },
  ...ENEMIES.map((where): GoblinPieceV7 => ({
    seat: 1,
    role: "FIGHTER",
    at: where,
  })),
];

const berserk = (state: GameStateV7, where: CoordV7) =>
  applyOkV7(state, state.humanPlayerId, {
    kind: "RALLY",
    unitId: unitAtV7(state, where).id,
  });

const move = (
  state: GameStateV7,
  where: CoordV7,
  ...path: CoordV7[]
): CommandV7 => ({ kind: "MOVE", unitId: unitAtV7(state, where).id, path });

const moveResult = (
  state: GameStateV7,
  where: CoordV7,
  ...path: CoordV7[]
): ReturnType<typeof applyCommandV7> =>
  applyCommandV7(state, state.humanPlayerId, move(state, where, ...path));

/** Whether the command is offered (a Move: one to the same destination). */
const offers = (state: GameStateV7, command: CommandV7): boolean =>
  queryPlayerCommandsV7(state, state.humanPlayerId).some((offered) =>
    command.kind === "MOVE" && offered.kind === "MOVE"
      ? offered.unitId === command.unitId &&
        JSON.stringify(offered.path.at(-1)) ===
          JSON.stringify(command.path.at(-1))
      : JSON.stringify(offered) === JSON.stringify(command),
  );

describe("the identity (pulp_wars-w49.35)", () => {
  // The giants' signatures (`pulp_wars-w49.30`) took 7r62 after it, and
  // the reward ladder rework (`pulp_wars-zypi`) 7r63, and any unit can
  // capture (`pulp_wars-ke95`) 7r64, and score and modes (`pulp_wars-kaw6.2`)
  // 7r65, and map curiosities round 2 (`pulp_wars-737.14`) 7r66, and Ice
  // Folk Freeze (`pulp_wars-w49.37`) 7r67, and the Candy redesign
  // (`pulp_wars-jdb.12`) 7r68, and the Monument skin rule
  // (`pulp_wars-eu3r.3`) 7r69, and the Vampire and Banshee rework
  // (`pulp_wars-ty6i`) 7r70.
  it("was 7r61 after 7r60, whose save keys are obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r72");
    expect(PRIOR_RULESET_7_IDS.slice(-12, -10)).toEqual([
      "pulp-wars-poc-7r60",
      "pulp-wars-poc-7r61",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r72.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-12, -10)).toEqual([
      "pulpWars.save.v7r60.current",
      "pulpWars.save.v7r61.current",
    ]);
  });
});

describe("Goblin death blasts and Kaboom (pulp_wars-w49.35)", () => {
  it("registers the death blasts 3 harder and only the Goblin's Kaboom 1 harder", () => {
    expect(
      (
        [
          "FIGHTER",
          "RAIDER",
          "MARKSMAN",
          "CATAPULT",
          "KNIGHT",
          "GUARD",
          "CAPTAIN",
          "JUGGERNAUT",
          "SWORDSMAN",
        ] as const
      ).map((role) => {
        const mechanics = roleMechanicsV7(role, "GOBLIN");
        return [role, mechanics.kaboomDamage, mechanics.deathBlastDamage];
      }),
    ).toEqual([
      ["FIGHTER", 6, null],
      ["RAIDER", 4, null],
      ["MARKSMAN", 4, 5],
      ["CATAPULT", 5, 7],
      ["KNIGHT", 5, 7],
      ["GUARD", null, null],
      ["CAPTAIN", null, null],
      ["JUGGERNAUT", null, null],
      ["SWORDSMAN", null, null],
    ]);
  });

  it("blasts 5, 7, and 7 when a Bomb Chucker, Rocket Cart, or Scrap Buggy is killed", () => {
    for (const [role, damage] of [
      ["MARKSMAN", 5],
      ["CATAPULT", 7],
      ["KNIGHT", 7],
    ] as const) {
      // A Human Archer two tiles away kills the 1-HP exploder; the blast
      // hits a Human Champion and an own Ogre beside it (enough HP for both).
      const state = goblinArenaV7(
        ["GOBLIN", "ORIGINAL"],
        [
          { seat: 0, role, at: at(4, 2), hp: 1 },
          { seat: 0, role: "SWORDSMAN", at: at(5, 2) },
          { seat: 1, role: "SWORDSMAN", at: at(3, 2) },
          { seat: 1, role: "MARKSMAN", at: at(4, 4) },
        ],
        { activeSeat: 1 },
      );
      const ogre = unitAtV7(state, at(5, 2));
      const champion = unitAtV7(state, at(3, 2));
      const result = applyOkV7(state, seatIdV7(state, 1), {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(4, 4)).id,
        targetUnitId: unitAtV7(state, at(4, 2)).id,
      });
      const blasts = result.events.filter(
        (
          event,
        ): event is Extract<DomainEventV7, { kind: "EXPLOSION_RESOLVED" }> =>
          event.kind === "EXPLOSION_RESOLVED",
      );
      expect(
        blasts.map((event) => [event.role, event.cause, event.damage]),
        role,
      ).toEqual([[role, "DEATH", damage]]);
      expect(
        blasts[0]?.results.map((entry) => [entry.unitId, entry.damage]),
        role,
      ).toEqual([
        [champion.id, damage],
        [ogre.id, damage],
      ]);
      expect(unitAtV7(result.state, at(5, 2)).hp).toBe(ogre.hp - damage);
    }
  });
});

describe("Goblin Berserk targets (pulp_wars-w49.35)", () => {
  it("reaches own unmoved land units of any role within 2, never embarked units, boats, enemies, or the Warboss itself", () => {
    const state = arena(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2) },
        // In reach (Chebyshev 2): a support, a siege, a mythic, a line unit.
        { seat: 0, role: "CAPTAIN", at: at(3, 1) },
        { seat: 0, role: "CATAPULT", at: at(7, 4) },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        // A unit that already attacked but never moved is a target too.
        {
          seat: 0,
          role: "MARKSMAN",
          at: at(4, 0),
          activation: { attacked: true, attacksUsed: 1 },
        },
        // Moved this turn.
        {
          seat: 0,
          role: "FIGHTER",
          at: at(4, 3),
          activation: { moved: true, movedPathLength: 1 },
        },
        // Out of reach.
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        // Afloat in reach.
        { seat: 0, role: "FIGHTER", at: at(6, 1), form: "EMBARKED" },
        { seat: 0, role: "PATROL_BOAT", at: at(7, 1), form: "NAVAL" },
        // An enemy in reach.
        { seat: 1, role: "FIGHTER", at: at(6, 2) },
      ],
      [at(6, 1), at(7, 1)],
    );
    const boss = unitAtV7(state, at(5, 2));
    const expected = [at(3, 1), at(7, 4), at(6, 3), at(5, 4), at(4, 0)]
      .map((where) => unitAtV7(state, where).id)
      .sort((left, right) => left - right);
    expect(offers(state, { kind: "RALLY", unitId: boss.id })).toBe(true);
    const result = berserk(state, at(5, 2));
    expect(result.events).toEqual([
      { kind: "UNITS_RALLIED", captainId: boss.id, unitIds: expected },
    ]);
    expect(result.state.berserkThisTurn).toEqual(expected);
    // The Warboss used its primary action; nobody is Inspired (no WAAAGH!).
    expect(unitAtV7(result.state, at(5, 2)).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(result.state.units.some((unit) => unit.activation.inspired)).toBe(
      false,
    );
    expect(unitIsBerserkV7(result.state, boss.id)).toBe(false);
    // The public view of the owner carries the list.
    expect(
      viewForV7(result.state, result.state.humanPlayerId).berserkThisTurn,
    ).toEqual(expected);
  });

  it("lets another Warboss send the first one Berserk, and never targets a unit twice", () => {
    const state = arena([
      { seat: 0, role: "CAPTAIN", at: at(3, 2) },
      { seat: 0, role: "CAPTAIN", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "FIGHTER", at: at(8, 1) },
    ]);
    const first = unitAtV7(state, at(3, 2)).id;
    const second = unitAtV7(state, at(4, 2)).id;
    const goblin = unitAtV7(state, at(3, 3)).id;
    const once = berserk(state, at(3, 2));
    expect(once.state.berserkThisTurn).toEqual(
      [second, goblin].sort((a, b) => a - b),
    );
    // The second Warboss has only the first one left to reach.
    const twice = berserk(once.state, at(4, 2));
    expect(twice.events).toEqual([
      { kind: "UNITS_RALLIED", captainId: second, unitIds: [first] },
    ]);
    expect(twice.state.berserkThisTurn).toEqual(
      [first, second, goblin].sort((a, b) => a - b),
    );
    // With every unit in reach already Berserk, a Warboss has no target.
    const lone = arena([
      { seat: 0, role: "CAPTAIN", at: at(3, 2) },
      { seat: 0, role: "CAPTAIN", at: at(4, 2) },
      { seat: 1, role: "FIGHTER", at: at(8, 1) },
    ]);
    const after = berserk(lone, at(3, 2)).state;
    const other = unitAtV7(after, at(4, 2)).id;
    const otherFirst = unitAtV7(after, at(3, 2)).id;
    const done = berserk(after, at(4, 2)).state;
    expect(done.berserkThisTurn).toEqual(
      [other, otherFirst].sort((a, b) => a - b),
    );
    const rejected = applyCommandV7(
      checkedV7({
        ...done,
        units: done.units.map((unit) =>
          unit.id === other
            ? {
                ...unit,
                activation: {
                  ...unit.activation,
                  specialActed: false,
                  handled: false,
                },
              }
            : unit,
        ),
      }),
      done.humanPlayerId,
      { kind: "RALLY", unitId: other },
    );
    expect(rejected).toMatchObject({
      accepted: false,
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
  });

  it("rejects a Berserk with no unmoved own land unit in reach", () => {
    const state = arena([
      { seat: 0, role: "CAPTAIN", at: at(3, 2) },
      {
        seat: 0,
        role: "FIGHTER",
        at: at(4, 2),
        activation: { moved: true, movedPathLength: 1 },
      },
      { seat: 0, role: "FIGHTER", at: at(6, 2) },
      { seat: 1, role: "FIGHTER", at: at(3, 3) },
    ]);
    const boss = unitAtV7(state, at(3, 2)).id;
    expect(offers(state, { kind: "RALLY", unitId: boss })).toBe(false);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "RALLY",
        unitId: boss,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
  });
});

describe("Goblin Berserk movement (pulp_wars-w49.35)", () => {
  it("gives +1 Move to the ordinary Move", () => {
    expect(BERSERK_MOVE_BONUS_V7).toBe(1);
    const state = arena(pieces());
    // A Goblin (Move 1) cannot make two steps.
    expect(moveResult(state, GOBLIN, at(2, 4), at(3, 4))).toMatchObject({
      accepted: false,
      error: {
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "BUDGET_EXCEEDED" },
      },
    });
    expect(offers(state, move(state, GOBLIN, at(2, 4), at(3, 4)))).toBe(false);
    const raged = berserk(state, WARBOSS).state;
    const twoSteps = move(raged, GOBLIN, at(2, 4), at(3, 4));
    expect(offers(raged, twoSteps)).toBe(true);
    expect(applyOkV7(raged, raged.humanPlayerId, twoSteps).state).toSatisfy(
      (after: GameStateV7) =>
        unitAtV7(after, at(3, 4)).activation.movedPathLength === 2,
    );
    // Three steps are still too many.
    expect(
      moveResult(raged, GOBLIN, at(2, 4), at(3, 4), at(4, 4)),
    ).toMatchObject({
      accepted: false,
      error: { params: { reason: "BUDGET_EXCEEDED" } },
    });
    // The public stats show the extra Move and the status.
    const stats = publicUnitStatsV7(raged, unitAtV7(raged, GOBLIN));
    expect(stats.stats.find((entry) => entry.id === "MOVE")?.modifiers).toEqual(
      [
        {
          value: { numerator: 1, denominator: 1 },
          source: "BERSERK",
          sourceLabel: "Berserk",
          description:
            "Orc Warboss Berserk adds 1 Move until the end of the turn.",
        },
      ],
    );
    expect(stats.statuses).toContain(
      "Berserk: +1 Move, ignores zones of control this turn",
    );
  });

  it("ignores hostile zones of control, passing between enemies, in the reducer and the public view", () => {
    const state = arena(pieces());
    const path = [at(3, 2), at(4, 2), at(5, 2)];
    // A Wolf Rider (Move 2) entering a zone of control stops there.
    expect(moveResult(state, RIDER, at(3, 2), at(4, 2))).toMatchObject({
      accepted: false,
      error: { params: { reason: "ZOC_STOPS_MOVE" } },
    });
    expect(offers(state, move(state, RIDER, ...path))).toBe(false);
    const raged = berserk(state, WARBOSS).state;
    const rider = unitAtV7(raged, RIDER);
    const view = viewForV7(raged, raged.humanPlayerId);
    const publicRider = view.units.find((unit) => unit.id === rider.id);
    if (publicRider === undefined) throw new Error("rider missing");
    expect(validatePlayerMovementPathV7(view, publicRider, path)).toMatchObject(
      { legal: true, destination: at(5, 2), stopped: false },
    );
    const command = move(raged, RIDER, ...path);
    expect(offers(raged, command)).toBe(true);
    const moved = applyOkV7(raged, raged.humanPlayerId, command);
    expect(unitAtV7(moved.state, at(5, 2)).id).toBe(rider.id);
    // Attacks afterwards follow the ordinary rules (a Wolf Rider may attack
    // after it moved).
    expect(
      offers(moved.state, {
        kind: "ATTACK",
        unitId: rider.id,
        targetUnitId: unitAtV7(moved.state, at(4, 1)).id,
      }),
    ).toBe(true);
  });

  it("still never enters an occupied tile or ends on an own unit", () => {
    const raged = berserk(arena(pieces()), WARBOSS).state;
    // Through an enemy.
    expect(
      moveResult(raged, RIDER, at(3, 1), at(4, 1), at(5, 1)),
    ).toMatchObject({
      accepted: false,
      error: { params: { reason: "OCCUPIED" } },
    });
    // Onto the Warboss.
    expect(moveResult(raged, GOBLIN, at(1, 3), WARBOSS)).toMatchObject({
      accepted: false,
      error: { params: { reason: "OCCUPIED" } },
    });
    // Through the Warboss (an own unit) is the ordinary rule.
    expect(moveResult(raged, RIDER, WARBOSS, at(0, 2)).accepted).toBe(true);
  });

  it("lasts until the end of the turn", () => {
    const raged = berserk(arena(pieces()), WARBOSS).state;
    const riderId = unitAtV7(raged, RIDER).id;
    const ended = applyOkV7(raged, raged.humanPlayerId, { kind: "END_TURN" });
    expect(ended.state.berserkThisTurn).toEqual([]);
    const next = endTurnUntilV7(ended.state, raged.humanPlayerId).state;
    expect(next.berserkThisTurn).toEqual([]);
    expect(unitIsBerserkV7(next, riderId)).toBe(false);
    expect(moveResult(next, RIDER, at(3, 2), at(4, 2))).toMatchObject({
      accepted: false,
      error: { params: { reason: "ZOC_STOPS_MOVE" } },
    });
    expect(moveResult(next, GOBLIN, at(2, 4), at(3, 4))).toMatchObject({
      accepted: false,
      error: { params: { reason: "BUDGET_EXCEEDED" } },
    });
  });

  it("is stored in the state, survives a save mid-turn, and leaves with a unit that leaves the board", () => {
    const raged = berserk(arena(pieces()), WARBOSS).state;
    const restored = parseGameStateV7(JSON.parse(JSON.stringify(raged)));
    if (restored === null) throw new Error("not restored");
    expect(restored.berserkThisTurn).toEqual(raged.berserkThisTurn);
    expect(
      applyCommandV7(
        restored,
        restored.humanPlayerId,
        move(restored, RIDER, at(3, 2), at(4, 2), at(5, 2)),
      ).accepted,
    ).toBe(true);
    // Only the active seat's units on the board, and only with a Goblin seat.
    const enemyId = unitAtV7(raged, ENEMIES[0] as CoordV7).id;
    expect(
      parseGameStateV7({
        ...raged,
        berserkThisTurn: [...raged.berserkThisTurn, enemyId].sort(
          (a, b) => a - b,
        ),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...raged,
        berserkThisTurn: [...raged.berserkThisTurn, 999 as UnitId],
      }),
    ).toBeNull();
    const human = goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(8, 1) },
      ],
    );
    expect(
      parseGameStateV7({
        ...human,
        berserkThisTurn: [unitAtV7(human, at(2, 2)).id],
      }),
    ).toBeNull();
    // A Berserk Goblin's Kaboom (the ordinary rules) takes it off the list.
    const goblinId = unitAtV7(raged, GOBLIN).id;
    const boom = applyOkV7(raged, raged.humanPlayerId, {
      kind: "KABOOM",
      unitId: goblinId,
    });
    expect(boom.state.berserkThisTurn).not.toContain(goblinId);
    expect(boom.state.berserkThisTurn).toContain(unitAtV7(raged, RIDER).id);
  });
});

describe("WAAAGH! is gone (pulp_wars-w49.35)", () => {
  it("unlocks Berserk at Administration and inspires nobody", () => {
    const administration = GOBLIN_BASELINE_V1_NODES.find(
      (node) => node.id === "ADMINISTRATION",
    );
    expect(administration?.unlocks).toContainEqual({
      kind: "BERSERK_SUPPORT",
    });
    expect(JSON.stringify(GOBLIN_BASELINE_V1_NODES)).not.toContain("WAAAGH");
    expect(roleMechanicsV7("CAPTAIN", "GOBLIN")).toMatchObject({
      rallyRadius: 2,
      rallyEffect: "BERSERK",
    });
    const raged = berserk(arena(pieces()), WARBOSS).state;
    for (const unit of raged.units) {
      expect(unit.activation.inspired).toBe(false);
      expect(
        JSON.stringify(publicUnitStatsV7(raged, unit)).includes("WAAAGH"),
      ).toBe(false);
    }
  });

  it("keeps the Normal AI legal with Berserk on the board", () => {
    let state = arena([
      ...pieces(),
      { seat: 0, role: "FIGHTER", at: at(2, 4) },
      { seat: 0, role: "MARKSMAN", at: at(0, 2) },
    ]);
    // The Goblin seat as the AI: its whole turn, every command accepted.
    const actor = state.humanPlayerId;
    const kinds: string[] = [];
    for (let count = 0; count < 60; count += 1) {
      const command = chooseNormalTurnCommandV7(
        viewForV7(state, actor),
        kinds.length,
      );
      if (command === null) throw new Error("no command");
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind} rejected: ${result.error.code}`);
      state = result.state;
      kinds.push(command.kind);
      if (command.kind === "END_TURN") break;
    }
    expect(kinds.at(-1)).toBe("END_TURN");
    expect(state.berserkThisTurn).toEqual([]);
  }, 120_000);
});
