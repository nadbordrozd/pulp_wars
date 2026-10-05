import { describe, expect, it } from "vitest";
import {
  homeSweetHomeSparesV7,
  previewSugarRushV7,
  queryCombatPreviewV7,
  queryThreatenedTilesV7,
  unitIsCrashedV7,
  unitIsRushedV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  candyFieldV7,
  candyRefusalV7,
  exchangeV7,
  rushAtV7,
} from "../fixtures/v7-candy";
import {
  applyOkV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  forestV7,
  kindsV7,
  movedV7,
  patchTileV7,
} from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): Sugar Rush and the Crash
// (docs/product/RULESET_7_CANDY.md section 5).

const FAR = { seat: 1, role: "FIGHTER", at: at(1, 1) } as const;

function rushCommand(state: GameStateV7, where: CoordV7): CommandV7 {
  return { kind: "SUGAR_RUSH", unitId: unitAtV7(state, where).id };
}

function endTurn(state: GameStateV7) {
  return applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
}

/** The tiles the unit on `from` is offered to end a `MOVE` on. */
function reach(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  const unit = unitAtV7(state, from);
  return offeredV7(state, "MOVE").flatMap((command) =>
    command.kind === "MOVE" && command.unitId === unit.id
      ? [command.path.at(-1) as CoordV7]
      : [],
  );
}

const farthest = (tiles: readonly CoordV7[], from: CoordV7): number =>
  Math.max(
    0,
    ...tiles.map((tile) =>
      Math.max(Math.abs(tile.x - from.x), Math.abs(tile.y - from.y)),
    ),
  );

describe("the Sugar Rush command (section 5.1)", () => {
  it("Rushes every Candy land role, with the event and nothing else changed", () => {
    for (const [role, move] of [
      ["FIGHTER", 2],
      ["RAIDER", 3],
      ["MARKSMAN", 2],
      ["GUARD", 2],
      ["CAPTAIN", 2],
      ["CATAPULT", 2],
      ["KNIGHT", 3],
      ["JUGGERNAUT", 2],
    ] as const) {
      const state = candyFieldV7([{ seat: 0, role, at: at(5, 3) }, FAR]);
      const unit = unitAtV7(state, at(5, 3));
      const result = playV7(state, rushCommand(state, at(5, 3)));
      expect(result.events, role).toEqual([
        {
          kind: "UNIT_SUGAR_RUSHED",
          playerId: activeIdV7(state),
          unitId: unit.id,
          move,
        },
      ]);
      expect(result.state.sugarRush).toEqual([
        { unitId: unit.id, phase: "RUSHED" },
      ]);
      expect(unitIsRushedV7(result.state, unit.id)).toBe(true);
      expect({
        ...result.state,
        sugarRush: [],
        commandIndex: state.commandIndex,
      }).toEqual(state);
    }
  });

  it("rejects each row in order, atomically", () => {
    // Row 2: a role without SUGAR_RUSH (a Human unit; a Candy boat).
    const human = candyFieldV7(
      [{ seat: 0, role: "FIGHTER", at: at(5, 3) }, FAR],
      {
        factions: ["ORIGINAL", "CANDY"],
      },
    );
    expect(rejectedV7(human, rushCommand(human, at(5, 3)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    const boat = candyFieldV7(
      [{ seat: 0, role: "PATROL_BOAT", at: at(5, 1), form: "NAVAL" }, FAR],
      { water: [at(5, 1), at(6, 1)] },
    );
    expect(rejectedV7(boat, rushCommand(boat, at(5, 1))).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    // Row 3: embarked.
    const afloat = candyFieldV7(
      [{ seat: 0, role: "FIGHTER", at: at(5, 1), form: "EMBARKED" }, FAR],
      { water: [at(5, 1), at(6, 1)] },
    );
    expect(rejectedV7(afloat, rushCommand(afloat, at(5, 1)))).toEqual({
      code: "SUGAR_RUSH_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    // Row 4: Crashed (reported before "already acted").
    const crashed = candyFieldV7([
      {
        seat: 0,
        role: "FIGHTER",
        at: at(5, 3),
        rush: "CRASHED",
        activation: movedV7(1),
      },
      FAR,
    ]);
    const crashedUnit = unitAtV7(crashed, at(5, 3));
    expect(rejectedV7(crashed, rushCommand(crashed, at(5, 3)))).toEqual({
      code: "UNIT_CRASHED",
      params: { unitId: crashedUnit.id },
    });
    // Row 5: already Rushed.
    const rushed = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
      FAR,
    ]);
    expect(rejectedV7(rushed, rushCommand(rushed, at(5, 3)))).toEqual({
      code: "SUGAR_RUSH_NOT_LEGAL",
      params: { reason: "RUSHED" },
    });
    // Row 6: moved, acted, or handled.
    for (const activation of [
      movedV7(1),
      { attacked: true, attacksUsed: 1 },
      { handled: true },
      { recovered: true },
      { specialActed: true },
    ]) {
      const acted = candyFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 3), activation },
        FAR,
      ]);
      expect(
        rejectedV7(acted, rushCommand(acted, at(5, 3))).code,
        JSON.stringify(activation),
      ).toBe("UNIT_ALREADY_ACTED");
    }
    // Not the actor's unit.
    const theirs = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      FAR,
    ]);
    expect(
      candyRefusalV7(theirs, rushCommand(theirs, at(1, 1))).code,
    ).toBeDefined();
  });

  it("a sluggish unit may Rush, and then either moves or acts", () => {
    const state = candyFieldV7(
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 1, role: "FIGHTER", at: at(5, 5) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    const rushed = playV7(state, rushCommand(state, at(5, 3))).state;
    const moved = playV7(rushed, {
      kind: "MOVE",
      unitId: unitAtV7(rushed, at(5, 3)).id,
      path: [at(5, 4)],
    }).state;
    expect(
      offeredV7(moved, "ATTACK").filter(
        (command) =>
          "unitId" in command &&
          command.unitId === unitAtV7(moved, at(5, 4)).id,
      ),
    ).toEqual([]);
  });

  it("offers exactly the accepted Rushes and previews the Rushed reach", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 0, role: "RAIDER", at: at(4, 5), activation: movedV7(1) },
      { seat: 0, role: "KNIGHT", at: at(6, 5), rush: "CRASHED" },
      { seat: 0, role: "GUARD", at: at(8, 7) },
      FAR,
    ]);
    const offered = expectOfferedAcceptedV7(state, "SUGAR_RUSH");
    expect(offered).toEqual([
      rushCommand(state, at(5, 3)),
      rushCommand(state, at(8, 7)),
    ]);
    const view = activeViewV7(state);
    const gumdrop = unitAtV7(state, at(5, 3));
    const preview = previewSugarRushV7(view, gumdrop.id);
    if (preview === null) throw new Error("no Rush preview");
    expect(preview).toMatchObject({
      unitId: gumdrop.id,
      move: 2,
      homeSweetHome: false,
    });
    const after = playV7(state, rushCommand(state, at(5, 3))).state;
    const sort = (tiles: readonly CoordV7[]) =>
      [...tiles].sort((left, right) => left.y - right.y || left.x - right.x);
    expect(sort(preview.destinations)).toEqual(sort(reach(after, at(5, 3))));
    const plain = reach(state, at(5, 3));
    expect(sort(preview.newDestinations)).toEqual(
      sort(
        preview.destinations.filter(
          (tile) => !plain.some((other) => sameV7(other, tile)),
        ),
      ),
    );
    expect(preview.newDestinations.length).toBeGreaterThan(0);
    // Next to its own center with Home Sweet Home: it would not Crash.
    expect(
      previewSugarRushV7(view, unitAtV7(state, at(8, 7)).id),
    ).toMatchObject({ homeSweetHome: true });
    // No preview for a unit that is not offered the Rush.
    expect(previewSugarRushV7(view, unitAtV7(state, at(4, 5)).id)).toBeNull();
    expect(previewSugarRushV7(view, unitAtV7(state, at(6, 5)).id)).toBeNull();
  });
});

describe("Rushed (section 5.2)", () => {
  it("gives +1 Move on the ordinary Move, with every stop rule unchanged", () => {
    const moves = (role: UnitRoleIdV7, rush: boolean): number => {
      const state = candyFieldV7([
        { seat: 0, role, at: at(5, 3), ...(rush ? { rush: "RUSHED" } : {}) },
        FAR,
      ]);
      return farthest(reach(state, at(5, 3)), at(5, 3));
    };
    expect([moves("FIGHTER", false), moves("FIGHTER", true)]).toEqual([1, 2]);
    expect([moves("RAIDER", false), moves("RAIDER", true)]).toEqual([2, 3]);
    expect([moves("KNIGHT", false), moves("KNIGHT", true)]).toEqual([2, 3]);
    // A Forest stops a Rushed Toffee Trooper on entering it.
    const forest = forestV7(
      candyFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
        FAR,
      ]),
      at(5, 4),
    );
    expect(reach(forest, at(5, 3))).toContainEqual(at(5, 4));
    expect(
      offeredV7(forest, "MOVE").some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.length === 2 &&
          sameV7(command.path[0] as CoordV7, at(5, 4)),
      ),
    ).toBe(false);
    // A zone of control stops it: no path through a tile next to an enemy.
    const zoc = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
      { seat: 1, role: "FIGHTER", at: at(5, 5) },
    ]);
    expect(
      offeredV7(zoc, "MOVE").some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.length === 2 &&
          sameV7(command.path[0] as CoordV7, at(5, 4)),
      ),
    ).toBe(false);
    // Deep snow stops a Rushed Candy ground unit on entering Snow.
    const snow = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 8), rush: "RUSHED" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    expect(reach(snow, at(4, 8))).toContainEqual(at(3, 8));
    expect(
      offeredV7(snow, "MOVE").some(
        (command) =>
          command.kind === "MOVE" &&
          command.path.length === 2 &&
          sameV7(command.path[0] as CoordV7, at(3, 8)),
      ),
    ).toBe(false);
  });

  it("moves a Rushed Donut Racer up to six tiles along a Road", () => {
    let state = candyFieldV7([
      { seat: 0, role: "RAIDER", at: at(2, 3), rush: "RUSHED" },
      FAR,
    ]);
    for (let x = 2; x <= 9; x += 1)
      state = patchTileV7(state, at(x, 3), { road: true });
    const tiles = reach(state, at(2, 3));
    expect(tiles).toContainEqual(at(8, 3));
    expect(tiles).not.toContainEqual(at(9, 3));
    const plain = candyFieldV7([
      { seat: 0, role: "RAIDER", at: at(2, 3) },
      FAR,
    ]);
    let roads = plain;
    for (let x = 2; x <= 9; x += 1)
      roads = patchTileV7(roads, at(x, 3), { road: true });
    expect(reach(roads, at(2, 3))).toContainEqual(at(6, 3));
    expect(reach(roads, at(2, 3))).not.toContainEqual(at(7, 3));
  });

  it("ends a Rushed Move by embarking at a dock, and the embarked unit still Crashes", () => {
    // A Port on the water tile (7, 7) of the Candy capital's territory.
    const field = (rush: boolean) => {
      const base = candyFieldV7(
        [
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 7),
            ...(rush ? { rush: "RUSHED" as const } : {}),
          },
          FAR,
        ],
        { water: [at(7, 7)] },
      );
      return applyOkV7(base, activeIdV7(base), {
        kind: "BUILD_PORT",
        at: at(7, 7),
      }).state;
    };
    // Two tiles away: only the Rushed budget reaches the dock.
    expect(reach(field(false), at(5, 7))).not.toContainEqual(at(7, 7));
    const state = field(true);
    expect(reach(state, at(5, 7))).toContainEqual(at(7, 7));
    const dock = offeredV7(state, "MOVE").find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === unitAtV7(state, at(5, 7)).id &&
        sameV7(command.path.at(-1) as CoordV7, at(7, 7)),
    );
    if (dock === undefined) throw new Error("no Move onto the dock");
    const moved = playV7(state, dock).state;
    expect(unitAtV7(moved, at(7, 7)).form).toBe("EMBARKED");
    // Embarked: it stays Rushed, cannot Rush again, and still Crashes (the
    // Port is next to its own center, so Home Sweet Home must be absent).
    expect(rushAtV7(moved, at(7, 7))).toBe("RUSHED");
    const ended = endTurn(moved);
    expect(rushAtV7(ended.state, at(7, 7))).toBeNull();
    expect(
      ended.events.find((event) => event.kind === "UNITS_CRASHED"),
    ).toMatchObject({ sparedUnitIds: [unitAtV7(moved, at(7, 7)).id] });
    // Away from every own center an embarked Rushed unit Crashes, and a
    // Crashed embarked unit may land.
    const afloat = candyFieldV7(
      [
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 1),
          form: "EMBARKED",
          rush: "RUSHED",
        },
        FAR,
      ],
      { water: [at(5, 1)] },
    );
    const afterCrash = endTurn(afloat).state;
    expect(rushAtV7(afterCrash, at(5, 1))).toBe("CRASHED");
    const candyTurn = endTurn(afterCrash).state;
    expect(rushAtV7(candyTurn, at(5, 1))).toBe("CRASHED");
    const landings = expectOfferedAcceptedV7(candyTurn, "DISEMBARK");
    expect(landings.length).toBeGreaterThan(0);
  });

  it("adds +1 Attack to the first attack only, at any range, never with Charge or Inspired, never on retaliation", () => {
    const duel = (
      role: UnitRoleIdV7,
      distance: number,
      extra: Record<string, unknown> = {},
    ) => {
      const state = candyFieldV7([
        { seat: 0, role, at: at(5, 2 + distance), rush: "RUSHED", ...extra },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ]);
      return exchangeV7(state, at(5, 2 + distance), at(5, 2));
    };
    const plain = (role: UnitRoleIdV7, distance: number) => {
      const state = candyFieldV7([
        { seat: 0, role, at: at(5, 2 + distance) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ]);
      return exchangeV7(state, at(5, 2 + distance), at(5, 2));
    };
    for (const [role, distance] of [
      ["FIGHTER", 1],
      ["MARKSMAN", 2],
      ["CATAPULT", 3],
      ["JUGGERNAUT", 1],
    ] as const) {
      const rushed = duel(role, distance);
      const ordinary = plain(role, distance);
      expect(rushed.sugarRushApplied, role).toBe(true);
      expect(ordinary.sugarRushApplied, role).toBe(false);
      expect(rushed.attack2, role).toBe(ordinary.attack2 + 2);
      expect(rushed.damageToDefender).toBeGreaterThan(
        ordinary.damageToDefender,
      );
    }
    // Not on a second attack (a continuation).
    expect(
      duel("KNIGHT", 1, { activation: { attacked: true, attacksUsed: 1 } })
        .sugarRushApplied,
    ).toBe(false);
    // Not with Charge: a Rushed Donut Racer that charges attacks at 3.
    const charge = duel("RAIDER", 1, { activation: movedV7(2) });
    expect([charge.sugarRushApplied, charge.attack2]).toEqual([false, 6]);
    expect(duel("RAIDER", 1).attack2).toBe(6);
    // Not with Inspired.
    const inspired = duel("FIGHTER", 1, { activation: { inspired: true } });
    expect(inspired.sugarRushApplied).toBe(false);
    expect(inspired.attack2).toBe(plain("FIGHTER", 1).attack2 + 2);
    // Never on retaliation: a Rushed defender strikes back as usual.
    const defended = (rush: boolean) => {
      const state = candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 2),
            ...(rush ? { rush: "RUSHED" } : {}),
          },
        ],
        { activeSeat: 1 },
      );
      return exchangeV7(state, at(5, 3), at(5, 2));
    };
    expect(defended(true).damageToAttacker).toBe(
      defended(false).damageToAttacker,
    );
    expect(defended(true).sugarRushApplied).toBe(false);
    // An embarked unit never has the bonus (it cannot attack at all).
  });

  it("resolves a Rushed attack exactly as previewed, and `assumeSugarRush` estimates it before the Rush", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const attacker = unitAtV7(state, at(5, 3));
    const target = unitAtV7(state, at(5, 2));
    const assumed = queryCombatPreviewV7(
      activeViewV7(state),
      attacker.id,
      target.id,
      { assumeSugarRush: true },
    );
    const rushed = playV7(state, rushCommand(state, at(5, 3))).state;
    const run = attackV7(rushed, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      sugarRushApplied: true,
      damageToDefender: 8,
      damageToAttacker: 4,
    });
    expect(assumed).toEqual(run.combat);
    // A Crashed unit is never assumed Rushed.
    const crashed = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "CRASHED" },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    expect(
      exchangeV7(crashed, at(5, 3), at(5, 2), { assumeSugarRush: true })
        .sugarRushApplied,
    ).toBe(false);
  });
});

describe("the Crash and Home Sweet Home (section 5.3)", () => {
  it("Crashes every Rushed unit at End Turn and ends the Crash at the owner's next End Turn", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
      { seat: 0, role: "RAIDER", at: at(6, 3), rush: "CRASHED" },
      { seat: 0, role: "KNIGHT", at: at(4, 3), rush: "RUSHED" },
      FAR,
    ]);
    const candy = activeIdV7(state);
    const first = endTurn(state);
    const crashedIds = [
      unitAtV7(state, at(5, 3)).id,
      unitAtV7(state, at(4, 3)).id,
    ].sort((left, right) => left - right);
    expect(
      first.events.filter((event) => event.kind === "UNITS_CRASHED"),
    ).toEqual([
      {
        kind: "UNITS_CRASHED",
        playerId: candy,
        crashedUnitIds: crashedIds,
        sparedUnitIds: [],
      },
    ]);
    const kinds = kindsV7(first.events);
    expect(kinds.indexOf("UNITS_CRASHED")).toBeLessThan(
      kinds.indexOf("INCOME_PREVIEWED"),
    );
    expect(first.state.sugarRush).toEqual(
      crashedIds.map((unitId) => ({ unitId, phase: "CRASHED" })),
    );
    // The enemy's End Turn changes nothing, and has no event.
    const second = endTurn(first.state);
    expect(kindsV7(second.events)).not.toContain("UNITS_CRASHED");
    expect(second.state.sugarRush).toEqual(first.state.sugarRush);
    // The Crash turn: the units cannot act; its End Turn ends the Crash with
    // no event.
    for (const unitId of crashedIds)
      expect(unitIsCrashedV7(second.state, unitId)).toBe(true);
    const third = endTurn(second.state);
    expect(kindsV7(third.events)).not.toContain("UNITS_CRASHED");
    expect(third.state.sugarRush).toEqual([]);
  });

  it("spares a Rushed unit on or next to an own center with Home Sweet Home, and not two tiles away", () => {
    const pieces = [
      { seat: 0, role: "FIGHTER", at: at(8, 8), rush: "RUSHED" },
      { seat: 0, role: "RAIDER", at: at(7, 7), rush: "RUSHED" },
      { seat: 0, role: "KNIGHT", at: at(8, 6), rush: "RUSHED" },
      FAR,
    ] as const;
    const state = candyFieldV7(pieces);
    const ids = pieces.slice(0, 3).map((piece) => unitAtV7(state, piece.at).id);
    expect(
      ids.map((id) =>
        homeSweetHomeSparesV7(
          state,
          state.units.find((unit) => unit.id === id) as never,
        ),
      ),
    ).toEqual([true, true, false]);
    const result = endTurn(state);
    expect(
      result.events.find((event) => event.kind === "UNITS_CRASHED"),
    ).toEqual({
      kind: "UNITS_CRASHED",
      playerId: activeIdV7(state),
      crashedUnitIds: [ids[2]],
      sparedUnitIds: [ids[0], ids[1]],
    });
    expect(result.state.sugarRush).toEqual([
      { unitId: ids[2], phase: "CRASHED" },
    ]);
    // Without Fortification nobody is spared; an enemy center spares nobody.
    const without = candyFieldV7(pieces, { techs: { 0: ["DRILL"] } });
    expect(endTurn(without).state.sugarRush).toHaveLength(3);
    const enemyCenter = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(3, 8), rush: "RUSHED" },
      FAR,
    ]);
    expect(endTurn(enemyCenter).state.sugarRush).toHaveLength(1);
  });

  it("follows the unit through Mind Control: a taken Crashed unit, and a unit Rushed by a controller", () => {
    // A Crashed Candy unit taken by a Brain loses its entry at the Martian
    // End Turn (the End Turn of whoever owns it then).
    const taken = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 5,
          rush: "CRASHED",
          controlledBy: at(5, 4),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const afterTaken = endTurn(taken);
    expect(afterTaken.state.sugarRush).toEqual([]);
    expect(kindsV7(afterTaken.events)).not.toContain("UNITS_CRASHED");
    // A controlled Candy unit Rushes for its controller and Crashes at the
    // controller's End Turn.
    const controlled = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 5,
          controlledBy: at(5, 4),
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const rushed = playV7(controlled, rushCommand(controlled, at(5, 3)));
    expect(rushAtV7(rushed.state, at(5, 3))).toBe("RUSHED");
    const crashed = endTurn(rushed.state);
    expect(rushAtV7(crashed.state, at(5, 3))).toBe("CRASHED");
    expect(
      crashed.events.find((event) => event.kind === "UNITS_CRASHED"),
    ).toMatchObject({
      playerId: seatIdV7(controlled, 0),
      crashedUnitIds: [unitAtV7(controlled, at(5, 3)).id],
    });
    // A unit a Martian Rushed and that was released during the Martian turn
    // (its `RUSHED` entry now on a Candy-owned unit, on the Martian turn) is
    // Crashed at that End Turn and recovers at its owner's next End Turn.
    const released = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), rush: "RUSHED" },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const martianEnd = endTurn(released);
    expect(rushAtV7(martianEnd.state, at(5, 3))).toBe("CRASHED");
    const candyEnd = endTurn(martianEnd.state);
    expect(candyEnd.state.sugarRush).toEqual([]);
  });

  it("refuses every primary action and Sugar Rush of a Crashed unit with UNIT_CRASHED, and offers none", () => {
    const base = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 6, rush: "CRASHED" },
        {
          seat: 0,
          role: "CAPTAIN",
          at: at(4, 3),
          rush: "CRASHED",
        },
        { seat: 0, role: "MARKSMAN", at: at(6, 3), rush: "CRASHED" },
        {
          seat: 0,
          role: "RAIDER",
          at: at(5, 5),
          rush: "CRASHED",
          captureEligible: true,
        },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { crumbs: [{ at: at(4, 4), role: "FIGHTER" }] },
    );
    const id = (where: CoordV7) => unitAtV7(base, where).id;
    const refused: readonly CommandV7[] = [
      { kind: "ATTACK", unitId: id(at(5, 3)), targetUnitId: id(at(5, 2)) },
      { kind: "RECOVER", unitId: id(at(5, 3)) },
      { kind: "SUGAR_RUSH", unitId: id(at(5, 3)) },
      { kind: "CAPTURE", unitId: id(at(5, 5)) },
      { kind: "PILLAGE", unitId: id(at(5, 3)) },
      { kind: "TEND_WOUNDED", unitId: id(at(4, 3)) },
      { kind: "REBAKE", unitId: id(at(4, 3)), at: at(4, 4) },
      {
        kind: "SUGAR_TOSS",
        unitId: id(at(6, 3)),
        targetUnitId: id(at(5, 3)),
      },
      { kind: "ATTACK", unitId: id(at(6, 3)), targetUnitId: id(at(5, 2)) },
    ];
    for (const command of refused)
      expect(rejectedV7(base, command), command.kind).toEqual({
        code: "UNIT_CRASHED",
        params: { unitId: "unitId" in command ? command.unitId : null },
      });
    // What a Crashed unit may do: Move, Wait, Disband (and Promote when
    // eligible), all offered and accepted.
    const offered = expectOfferedAcceptedV7(base);
    const kindsOf = (where: CoordV7) =>
      new Set(
        offered.flatMap((command) =>
          "unitId" in command && command.unitId === id(where)
            ? [command.kind]
            : [],
        ),
      );
    expect([...kindsOf(at(5, 3))].sort()).toEqual(["DISBAND", "MOVE", "WAIT"]);
    // It keeps its zone of control and retaliates.
    const enemyTurn = endTurn(base).state;
    const strike = exchangeV7(enemyTurn, at(5, 2), at(5, 3));
    expect(strike.retaliation).toBe(true);
    expect(strike.damageToAttacker).toBeGreaterThan(0);
  });

  it("a Crashed unit that also acted reports UNIT_CRASHED, and one on a hostile center cannot capture", () => {
    const state = candyFieldV7([
      {
        seat: 0,
        role: "FIGHTER",
        at: at(5, 5),
        rush: "CRASHED",
        captureEligible: true,
        activation: { attacked: true, attacksUsed: 1, handled: true },
      },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    const unit = unitAtV7(state, at(5, 5));
    for (const command of [
      {
        kind: "ATTACK",
        unitId: unit.id,
        targetUnitId: unitAtV7(state, at(5, 4)).id,
      },
      { kind: "CAPTURE", unitId: unit.id },
      { kind: "RECOVER", unitId: unit.id },
    ] as const)
      expect(rejectedV7(state, command).code, command.kind).toBe(
        "UNIT_CRASHED",
      );
  });

  it("recovers an idle Rushed unit at End Turn, then Crashes it", () => {
    const state = candyFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 4, rush: "RUSHED" },
      { seat: 0, role: "FIGHTER", at: at(6, 5), hp: 4, rush: "CRASHED" },
      FAR,
    ]);
    const result = endTurn(state);
    expect(unitAtV7(result.state, at(5, 3)).hp).toBeGreaterThan(4);
    expect(rushAtV7(result.state, at(5, 3))).toBe("CRASHED");
    // A Crashed unit that did not move recovers idle too.
    expect(unitAtV7(result.state, at(6, 5)).hp).toBeGreaterThan(4);
    expect(rushAtV7(result.state, at(6, 5))).toBeNull();
    const kinds = kindsV7(result.events);
    expect(kinds.lastIndexOf("UNIT_RECOVERED")).toBeLessThan(
      kinds.indexOf("UNITS_CRASHED"),
    );
  });

  it("removes the entry when its unit dies", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1, rush: "CRASHED" },
        { seat: 0, role: "FIGHTER", at: at(8, 3), rush: "RUSHED" },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.state.sugarRush).toEqual([
      { unitId: unitAtV7(state, at(8, 3)).id, phase: "RUSHED" },
    ]);
  });
});

describe("Rush perks (section 5.4)", () => {
  it("grants a Rushed Donut Racer Escape after an attack it survives, with the ordinary budget of 2", () => {
    const field = (rush: boolean, extra: Record<string, unknown> = {}) =>
      candyFieldV7(
        [
          {
            seat: 0,
            role: "RAIDER",
            at: at(5, 3),
            ...(rush ? { rush: "RUSHED" } : {}),
            ...extra,
          },
          { seat: 1, role: "GUARD", at: at(5, 2) },
        ],
        { factions: ["CANDY", "ICE_FOLK"] },
      );
    const plain = attackV7(field(false), at(5, 3), at(5, 2));
    expect(plain.combat.escapeAvailable).toBe(false);
    expect(plain.attacker?.activation.escapeAvailable).toBe(false);
    const rushed = attackV7(field(true), at(5, 3), at(5, 2));
    expect(rushed.combat.escapeAvailable).toBe(true);
    expect(rushed.attacker?.activation.escapeAvailable).toBe(true);
    const escapes = reach(rushed.state, at(5, 3));
    expect(escapes.length).toBeGreaterThan(0);
    expect(farthest(escapes, at(5, 3))).toBe(2);
    expectOfferedAcceptedV7(rushed.state, "MOVE");
    // Never for a sluggish Donut Racer.
    const sluggish = attackV7(
      field(true, { chill: { sluggish: true, turnsLeft: 2 } }),
      at(5, 3),
      at(5, 2),
    );
    expect(sluggish.combat.escapeAvailable).toBe(false);
    expect(reach(sluggish.state, at(5, 3))).toEqual([]);
  });

  it("gives a Rushed Chocolate Bunny Sugar Frenzy with at most two continuations", () => {
    const line = (rush: boolean, role: UnitRoleIdV7 = "KNIGHT") =>
      candyFieldV7(
        [
          {
            seat: 0,
            role,
            at: at(2, 3),
            ...(rush ? { rush: "RUSHED" } : {}),
          },
          { seat: 1, role: "FIGHTER", at: at(3, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(7, 3), hp: 1 },
        ],
        role === "KNIGHT" && rush ? {} : {},
      );
    const state = line(true);
    const first = attackV7(state, at(2, 3), at(3, 3));
    expect(first.combat).toMatchObject({
      sugarRushApplied: true,
      overrunAdvance: true,
      overrunContinues: true,
    });
    const second = attackV7(first.state, at(3, 3), at(4, 3));
    expect(second.combat).toMatchObject({
      sugarRushApplied: false,
      attack2: 6,
      overrunAdvance: true,
      overrunContinues: true,
    });
    const third = attackV7(second.state, at(4, 3), at(5, 3));
    expect(third.combat).toMatchObject({
      overrunAdvance: true,
      overrunContinues: false,
    });
    // After three kills in a row the fourth attack is not offered and is
    // rejected.
    const bear = unitAtV7(third.state, at(5, 3));
    expect(bear.role).toBe("KNIGHT");
    expect(bear.activation.attacksUsed).toBe(3);
    const fourth: CommandV7 = {
      kind: "ATTACK",
      unitId: bear.id,
      targetUnitId: unitAtV7(third.state, at(6, 3)).id,
    };
    expect(rejectedV7(third.state, fourth).code).toBe("UNIT_ALREADY_ACTED");
    // Not Rushed: no continuation at all.
    const plain = attackV7(line(false), at(2, 3), at(3, 3));
    expect(plain.combat.overrunContinues).toBe(false);
    expect(
      rejectedV7(plain.state, {
        kind: "ATTACK",
        unitId: unitAtV7(plain.state, at(3, 3)).id,
        targetUnitId: unitAtV7(plain.state, at(4, 3)).id,
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });

  it("keeps the Human Knight's Overrun uncapped", () => {
    let state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(3, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(7, 3), hp: 1 },
      ],
      { factions: ["ORIGINAL", "CANDY"] },
    );
    for (let x = 2; x <= 5; x += 1) {
      const run = attackV7(state, at(x, 3), at(x + 1, 3));
      expect(run.combat.overrunContinues, String(x)).toBe(true);
      state = run.state;
    }
    expect(unitAtV7(state, at(6, 3)).activation.attacksUsed).toBe(4);
  });
});

describe("threatened tiles of Candy units (section 13)", () => {
  it("gives a free Candy unit its Rushed reach, and a Rushed or Crashed one no attack reach", () => {
    const tiles = (rush?: "RUSHED" | "CRASHED") => {
      const state = candyFieldV7(
        [
          {
            seat: 0,
            role: "FIGHTER",
            at: at(5, 3),
            ...(rush === undefined ? {} : { rush }),
          },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
        { activeSeat: 1 },
      );
      return queryThreatenedTilesV7(
        viewForV7(state, seatIdV7(state, 1)),
        unitAtV7(state, at(5, 3)).id,
      );
    };
    const free = tiles();
    // Move 1 + 1 (Rush) + range 1: three tiles away.
    expect(free).toContainEqual(at(5, 6));
    expect(free).not.toContainEqual(at(5, 7));
    expect(tiles("RUSHED")).toEqual([]);
    expect(tiles("CRASHED")).toEqual([]);
    // A Human Fighter is unchanged: Move 1 + range 1.
    const human = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      {},
    );
    const reachOf = queryThreatenedTilesV7(
      viewForV7(human, seatIdV7(human, 0)),
      unitAtV7(human, at(5, 3)).id,
    );
    expect(reachOf).toContainEqual(at(5, 5));
    expect(reachOf).not.toContainEqual(at(5, 6));
  });
});
