import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parseGameStateV7,
  previewBoardV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitFactionV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  rejectV7,
  seatV7,
  type NavalArenaUnitV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 4.2): Board. A ship with
// Seamanship next to a hostile ship at a third of its maximum HP or less
// captures it; the prize is patched up to one HP above that line.

const BOARDER: CoordV7 = { x: 5, y: 4 };
const TARGET: CoordV7 = { x: 5, y: 5 };
const NO_SEAMANSHIP: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];

interface SceneOptions {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  readonly boarderRole?: UnitRoleIdV7;
  readonly targetRole?: UnitRoleIdV7;
  readonly targetAt?: CoordV7;
  readonly targetHp?: number;
  readonly extra?: readonly NavalArenaUnitV7[];
  readonly third?: {
    readonly faction: FactionIdV7;
    readonly explored?: boolean;
  };
  readonly aiMode?: "RIVAL" | "COOPERATIVE";
}

function scene(options: SceneOptions = {}) {
  const targetAt = options.targetAt ?? TARGET;
  const base = navalArenaV7({
    ...(options.factions === undefined ? {} : { factions: options.factions }),
    technologies: options.technologies ?? [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
    units: [
      { seat: 0, role: options.boarderRole ?? "PATROL_BOAT", at: BOARDER },
      { seat: 1, role: options.targetRole ?? "PATROL_BOAT", at: targetAt },
      ...(options.extra ?? []),
    ],
    ...(options.third === undefined ? {} : { third: options.third }),
    ...(options.aiMode === undefined ? {} : { aiMode: options.aiMode }),
  });
  const boarderId = navalUnitAtV7(base, BOARDER).id;
  const targetId = navalUnitAtV7(base, targetAt).id;
  const state =
    options.targetHp === undefined
      ? base
      : patchNavalUnitV7(base, targetId, { hp: options.targetHp });
  return { state, boarderId, targetId };
}

function board(fixture: {
  readonly boarderId: number;
  readonly targetId: number;
}): CommandV7 {
  return {
    kind: "BOARD",
    unitId: fixture.boarderId as never,
    targetUnitId: fixture.targetId as never,
  };
}

function offeredBoards(state: GameStateV7, seat: 0 | 1) {
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id)).filter(
    (command) => command.kind === "BOARD",
  );
}

describe("BOARD legality, in the spec's order", () => {
  it("rows 1 to 3: the actor's unit, a ship, and Seamanship", () => {
    const fixture = scene({ targetHp: 3 });
    // Row 1: the ordinary unit errors.
    expect(
      rejectV7(fixture.state, 0, {
        kind: "BOARD",
        unitId: 999 as never,
        targetUnitId: fixture.targetId as never,
      }).code,
    ).toBe("UNIT_NOT_FOUND");
    expect(
      rejectV7(fixture.state, 0, {
        kind: "BOARD",
        unitId: fixture.targetId as never,
        targetUnitId: fixture.boarderId as never,
      }).code,
    ).toBe("UNIT_NOT_OWNED");
    // Row 2 comes before row 3: a land unit of a seat without Seamanship.
    const landlubber = scene({
      technologies: [NO_SEAMANSHIP, NAVAL_TECHS_V7],
      targetHp: 3,
    });
    const fighter = navalUnitAtV7(landlubber.state, { x: 5, y: 2 });
    expect(
      rejectV7(landlubber.state, 0, {
        kind: "BOARD",
        unitId: fighter.id,
        targetUnitId: landlubber.targetId as never,
      }),
    ).toEqual({ code: "BOARD_NOT_LEGAL", params: { reason: "NOT_A_SHIP" } });
    // An embarked land unit is not a ship either.
    const transport = scene({
      targetHp: 3,
      extra: [{ seat: 0, role: "RAIDER", at: { x: 2, y: 1 } }],
    });
    const raider = navalUnitAtV7(transport.state, { x: 2, y: 1 });
    const afloat = patchNavalUnitV7(transport.state, raider.id, {
      form: "EMBARKED",
      at: { x: 4, y: 5 },
    });
    expect(
      rejectV7(afloat, 0, {
        kind: "BOARD",
        unitId: raider.id,
        targetUnitId: transport.targetId as never,
      }),
    ).toEqual({ code: "BOARD_NOT_LEGAL", params: { reason: "NOT_A_SHIP" } });
    // Row 3: a ship of a seat without Seamanship (before every target row:
    // the target named here does not even exist).
    expect(
      rejectV7(landlubber.state, 0, {
        kind: "BOARD",
        unitId: landlubber.boarderId as never,
        targetUnitId: 999 as never,
      }),
    ).toEqual({ code: "TECH_REQUIRED", params: { tech: "SEAMANSHIP" } });
    expect(offeredBoards(landlubber.state, 0)).toEqual([]);
  });

  it("row 4: a ship that attacked cannot board, a Patrol Boat that moved can, a Battleship that moved cannot", () => {
    const fixture = scene({
      targetHp: 3,
      extra: [{ seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } }],
    });
    const other = navalUnitAtV7(fixture.state, { x: 6, y: 5 });
    const attacked = acceptV7(fixture.state, 0, {
      kind: "ATTACK",
      unitId: fixture.boarderId as never,
      targetUnitId: other.id,
    });
    expect(rejectV7(attacked.state, 0, board(fixture))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: fixture.boarderId },
    });
    expect(offeredBoards(attacked.state, 0)).toEqual([]);
    // A Patrol Boat may act after moving.
    const movedBoat = patchNavalUnitV7(fixture.state, fixture.boarderId, {
      activation: movedActivationV7(
        navalUnitV7(fixture.state, fixture.boarderId),
      ),
    });
    expect(acceptV7(movedBoat, 0, board(fixture)).events[0]).toMatchObject({
      kind: "SHIP_BOARDED",
    });
    // A Battleship may not (`unitMayActAfterMoveV7`), but boards unmoved.
    const battleship = scene({ boarderRole: "BATTLESHIP", targetHp: 3 });
    const movedBattleship = patchNavalUnitV7(
      battleship.state,
      battleship.boarderId,
      {
        activation: movedActivationV7(
          navalUnitV7(battleship.state, battleship.boarderId),
        ),
      },
    );
    expect(rejectV7(movedBattleship, 0, board(battleship)).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    expect(offeredBoards(movedBattleship, 0)).toEqual([]);
    expect(acceptV7(battleship.state, 0, board(battleship)).events[0]).toEqual(
      expect.objectContaining({ kind: "SHIP_BOARDED", hp: 4 }),
    );
    // Every ship role boards: a Submarine too.
    const submarine = scene({ boarderRole: "SUBMARINE", targetHp: 3 });
    expect(offeredBoards(submarine.state, 0)).toEqual([board(submarine)]);
  });

  it("rows 5 and 6: a target the actor can see, and a hostile one", () => {
    const fixture = scene({
      targetHp: 3,
      extra: [{ seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 4 } }],
    });
    expect(
      rejectV7(fixture.state, 0, {
        kind: "BOARD",
        unitId: fixture.boarderId as never,
        targetUnitId: 999 as never,
      }),
    ).toEqual({ code: "TARGET_NOT_FOUND", params: { targetUnitId: 999 } });
    // The target's tile is not explored by the actor: it cannot see it.
    const actor = seatV7(fixture.state, 0).id;
    const unseen: GameStateV7 = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === TARGET.x && at.y === TARGET.y),
              ),
            }
          : player,
      ),
    };
    expect(parseGameStateV7(unseen)).not.toBeNull();
    expect(rejectV7(unseen, 0, board(fixture))).toEqual({
      code: "TARGET_NOT_FOUND",
      params: { targetUnitId: fixture.targetId },
    });
    expect(offeredBoards(unseen, 0)).toEqual([]);
    expect(
      previewBoardV7(
        viewForV7(unseen, actor),
        fixture.boarderId as never,
        fixture.targetId as never,
      ),
    ).toBeNull();
    // An own ship, however damaged, is never boarded.
    const own = navalUnitAtV7(fixture.state, { x: 4, y: 4 });
    const ownWounded = patchNavalUnitV7(fixture.state, own.id, { hp: 1 });
    expect(
      rejectV7(ownWounded, 0, {
        kind: "BOARD",
        unitId: fixture.boarderId as never,
        targetUnitId: own.id,
      }).code,
    ).toBe("TARGET_ALLIED");
  });

  it("rows 7 to 9: a ship, in reach, at a third of its maximum HP or less, in that order", () => {
    // Row 7: a transport, however damaged and wherever it is.
    const transport = scene({
      targetHp: 3,
      extra: [{ seat: 1, role: "RAIDER", at: { x: 2, y: 9 } }],
    });
    const raider = navalUnitAtV7(transport.state, { x: 2, y: 9 });
    for (const at of [
      { x: 4, y: 5 },
      { x: 8, y: 6 },
    ]) {
      const afloat = patchNavalUnitV7(transport.state, raider.id, {
        form: "EMBARKED",
        at,
        hp: 1,
      });
      expect(
        rejectV7(afloat, 0, {
          kind: "BOARD",
          unitId: transport.boarderId as never,
          targetUnitId: raider.id,
        }),
      ).toEqual({
        code: "BOARD_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
    }
    // A land unit on the shore is immune too.
    const shore = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 7 } },
        { seat: 1, role: "RAIDER", at: { x: 2, y: 8 } },
      ],
    });
    const landed = navalUnitAtV7(shore, { x: 2, y: 8 });
    expect(
      rejectV7(patchNavalUnitV7(shore, landed.id, { hp: 1 }), 0, {
        kind: "BOARD",
        unitId: navalUnitAtV7(shore, { x: 2, y: 7 }).id,
        targetUnitId: landed.id,
      }),
    ).toEqual({ code: "BOARD_NOT_LEGAL", params: { reason: "TARGET_IMMUNE" } });
    // Row 8 before row 9: a healthy ship two tiles away is out of range.
    const far = scene({ targetAt: { x: 5, y: 6 } });
    expect(rejectV7(far.state, 0, board(far))).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    const farWounded = scene({ targetAt: { x: 5, y: 6 }, targetHp: 1 });
    expect(rejectV7(farWounded.state, 0, board(farWounded))).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    expect(offeredBoards(farWounded.state, 0)).toEqual([]);
    // Row 9: the thresholds floor(maxHp / 3): Patrol Boat 3, Submarine 4,
    // Battleship 8; a promoted ship (+5 maximum HP) 5, 5, 10.
    for (const [role, line] of [
      ["PATROL_BOAT", 3],
      ["SUBMARINE", 4],
      ["BATTLESHIP", 8],
    ] as const) {
      const healthy = scene({ targetRole: role, targetHp: line + 1 });
      expect(rejectV7(healthy.state, 0, board(healthy)), role).toEqual({
        code: "BOARD_NOT_LEGAL",
        params: { reason: "TARGET_HEALTHY" },
      });
      expect(offeredBoards(healthy.state, 0)).toEqual([]);
      const crippled = scene({ targetRole: role, targetHp: line });
      expect(offeredBoards(crippled.state, 0)).toEqual([board(crippled)]);
      expect(acceptV7(crippled.state, 0, board(crippled)).events[0]).toEqual(
        expect.objectContaining({ kind: "SHIP_BOARDED", hp: line + 1 }),
      );
      const unit = navalUnitV7(healthy.state, healthy.targetId);
      const promotedLine = Math.floor((unit.maxHp + 5) / 3);
      const promoted = (hp: number) =>
        patchNavalUnitV7(healthy.state, healthy.targetId, {
          maxHp: unit.maxHp + 5,
          veteran: true,
          kills: 3,
          hp,
        });
      expect(promotedLine, role).toBe(role === "BATTLESHIP" ? 10 : 5);
      expect(
        rejectV7(promoted(promotedLine + 1), 0, board(healthy)).params,
      ).toEqual({ reason: "TARGET_HEALTHY" });
      expect(
        acceptV7(promoted(promotedLine), 0, board(healthy)).events[0],
      ).toEqual(
        expect.objectContaining({ kind: "SHIP_BOARDED", hp: promotedLine + 1 }),
      );
    }
  });

  it("is refused for the seat that is not active, like every command", () => {
    const fixture = scene({ targetHp: 3 });
    expect(
      rejectV7(fixture.state, 1, {
        kind: "BOARD",
        unitId: fixture.targetId as never,
        targetUnitId: fixture.boarderId as never,
      }).code,
    ).toBe("NOT_ACTIVE_PLAYER");
  });

  it("row 10: a prize on Deep Water needs the actor's Navigation (it keeps its tile)", () => {
    // `pulp_wars-5ti.3`: no seat owns a ship on Deep Water without
    // Navigation, so this Board was offered and then refused as an invalid
    // state. A boarder on Shallow Water next to a target on Deep Water.
    const build = (technologies: readonly TechnologyIdV7[]) => {
      const base = navalArenaV7({
        technologies: [technologies, NAVAL_TECHS_V7],
        units: [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
        ],
      });
      const target = navalUnitAtV7(base, { x: 2, y: 4 });
      return {
        state: patchNavalUnitV7(base, target.id, { hp: 1 }),
        command: {
          kind: "BOARD",
          unitId: navalUnitAtV7(base, { x: 2, y: 3 }).id,
          targetUnitId: target.id,
        } satisfies CommandV7,
      };
    };
    const offered = (state: GameStateV7) =>
      queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).filter(
        (command) => command.kind === "BOARD",
      );
    const without = build(["SHORECRAFT", "SEAMANSHIP"]);
    expect(rejectV7(without.state, 0, without.command)).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: { reason: "DEEP_WATER" },
    });
    expect(offered(without.state)).toEqual([]);
    const withNavigation = build(["SHORECRAFT", "NAVIGATION", "SEAMANSHIP"]);
    expect(offered(withNavigation.state)).toEqual([withNavigation.command]);
    const result = acceptV7(withNavigation.state, 0, withNavigation.command);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });
});

describe("BOARD result", () => {
  it("hands the prize over: owner, orphan, exhausted, patched HP, the rest kept; its kind follows its new owner", () => {
    const fixture = scene({ factions: ["GOBLIN", "ORIGINAL"], targetHp: 2 });
    const veteran = patchNavalUnitV7(fixture.state, fixture.targetId, {
      kills: 4,
      hp: 2,
    });
    const before = navalUnitV7(veteran, fixture.targetId);
    const actor = seatV7(veteran, 0);
    const former = seatV7(veteran, 1);
    expect(unitFactionV7(veteran, before)).toBe("ORIGINAL");
    const view = viewForV7(veteran, actor.id);
    const preview = previewBoardV7(
      view,
      fixture.boarderId as never,
      fixture.targetId as never,
    );
    expect(preview).toEqual({
      unitId: fixture.boarderId,
      targetUnitId: fixture.targetId,
      fromPlayerId: former.id,
      hpAfter: 4,
    });
    const result = acceptV7(veteran, 0, board(fixture));
    const prize = navalUnitV7(result.state, fixture.targetId);
    expect(prize).toEqual({
      ...before,
      ownerId: actor.id,
      homeCityId: null,
      hp: 4,
      captureEligible: false,
      // The exhausted activation (as for a mind-controlled unit).
      activation: {
        moved: true,
        movedPathLength: 0,
        attacked: true,
        attacksUsed: 1,
        tendedThisTurn: false,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        recovered: true,
        captured: true,
        handled: true,
        specialActed: true,
      },
    });
    expect(prize.hp).toBe(preview?.hpAfter);
    // "Refit under a new flag": it is now a Goblin ship of the same role.
    expect(unitFactionV7(result.state, prize)).toBe("GOBLIN");
    // The boarder used its primary action and is handled.
    expect(navalUnitV7(result.state, fixture.boarderId)).toMatchObject({
      kills: 0,
      activation: { specialActed: true, handled: true, attacked: false },
    });
    expect(
      queryPlayerCommandsV7(viewForV7(result.state, actor.id)).filter(
        (command) =>
          "unitId" in command &&
          (command.unitId === fixture.boarderId ||
            command.unitId === fixture.targetId),
      ),
      // Neither acts again this turn. The prize kept its 4 kills, so the
      // ordinary Promotion is offered to its new owner.
    ).toEqual([{ kind: "PROMOTE", unitId: fixture.targetId }]);
    expect(parseGameStateV7(result.state)).not.toBeNull();
    // Not a kill: no death, Grave, growth, or Plunder (the Goblin seat has
    // no Commerce here; the event list is exact anyway).
    expect(result.events.map((event) => event.kind)).toEqual(["SHIP_BOARDED"]);
    expect(result.events[0]).toEqual({
      kind: "SHIP_BOARDED",
      playerId: actor.id,
      unitId: fixture.boarderId,
      targetUnitId: fixture.targetId,
      fromPlayerId: former.id,
      at: TARGET,
      hp: 4,
    });
    expect(parseEventV7(result.events[0])).toMatchObject({ ok: true });
    expect(result.state.graves).toEqual([]);
    // No Coins change hands.
    expect(seatV7(result.state, 0).coins).toBe(actor.coins);
    expect(seatV7(result.state, 1).coins).toBe(former.coins);
  });

  it("pays no Plunder to a Goblin boarder and credits no kill", () => {
    const fixture = scene({
      factions: ["GOBLIN", "ORIGINAL"],
      technologies: [
        [...NAVAL_TECHS_V7, "SCOUTING", "ROADS", "COMMERCE"],
        NAVAL_TECHS_V7,
      ],
      targetHp: 3,
    });
    const result = acceptV7(fixture.state, 0, board(fixture));
    expect(
      result.events.some((event) => event.kind === "PLUNDER_AWARDED"),
    ).toBe(false);
    expect(seatV7(result.state, 0).coins).toBe(seatV7(fixture.state, 0).coins);
    expect(navalUnitV7(result.state, fixture.boarderId).kills).toBe(0);
  });

  it("cannot be boarded back without a new hit, and then can", () => {
    // Seat 1 has a second Patrol Boat next to the ship seat 0 takes.
    const retake = scene({
      targetHp: 3,
      extra: [{ seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 6 } }],
    });
    const avenger = navalUnitAtV7(retake.state, { x: 6, y: 6 });
    const captured = acceptV7(retake.state, 0, board(retake));
    const theirs = acceptV7(captured.state, 0, { kind: "END_TURN" });
    const again: CommandV7 = {
      kind: "BOARD",
      unitId: avenger.id,
      targetUnitId: retake.targetId as never,
    };
    expect(rejectV7(theirs.state, 1, again)).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: { reason: "TARGET_HEALTHY" },
    });
    expect(offeredBoards(theirs.state, 1)).toEqual([]);
    // After a hit that leaves it at or below its line, it can.
    const hit = patchNavalUnitV7(theirs.state, retake.targetId, { hp: 3 });
    expect(offeredBoards(hit, 1)).toEqual([again]);
    const retaken = acceptV7(hit, 1, again);
    expect(navalUnitV7(retaken.state, retake.targetId)).toMatchObject({
      ownerId: seatV7(hit, 1).id,
      homeCityId: null,
      hp: 4,
    });
  });

  it("counts the prize for Sea Dog and Muster of its new owner", () => {
    const fixture = scene({
      technologies: [[...NAVAL_TECHS_V7, "DRILL"], NAVAL_TECHS_V7],
      targetRole: "SUBMARINE",
      targetHp: 4,
      extra: [{ seat: 0, role: "BATTLESHIP", at: { x: 2, y: 4 } }],
    });
    const actor = seatV7(fixture.state, 0);
    const entitlement = (state: GameStateV7, achievement: string) =>
      seatV7(state, 0).achievementEntitlements.find(
        (entry) => entry.achievement === achievement,
      )?.unlocked;
    expect(entitlement(fixture.state, "SEA_DOG")).toBe(false);
    expect(entitlement(fixture.state, "MUSTER")).toBe(false);
    const result = acceptV7(fixture.state, 0, board(fixture));
    // Fighter, Patrol Boat, Battleship, and the prize Submarine: four
    // trainable roles and three ships.
    expect(result.events).toContainEqual({
      kind: "ACHIEVEMENT_UNLOCKED",
      playerId: actor.id,
      achievement: "SEA_DOG",
    });
    expect(result.events).toContainEqual({
      kind: "ACHIEVEMENT_UNLOCKED",
      playerId: actor.id,
      achievement: "MUSTER",
    });
    expect(entitlement(result.state, "SEA_DOG")).toBe(true);
    expect(entitlement(result.state, "MUSTER")).toBe(true);
  });

  it("blockades its former owner's dock when the prize stands on it", () => {
    const port = NAVAL_ARENA_PORTS_V7[1];
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: port.x, y: port.y - 1 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } },
      ],
    });
    const boarder = navalUnitAtV7(base, { x: port.x, y: port.y - 1 });
    const docked = navalUnitAtV7(base, { x: 2, y: 6 });
    // Seat 1's wounded boat lies in its own Port.
    const state = patchNavalUnitV7(base, docked.id, { at: port, hp: 2 });
    const former = seatV7(state, 1);
    const city = state.cities.find((entry) => entry.ownerId === former.id);
    if (city === undefined) throw new Error("no city");
    const result = acceptV7(state, 0, {
      kind: "BOARD",
      unitId: boarder.id,
      targetUnitId: docked.id,
    });
    expect(result.events).toContainEqual({
      kind: "PORT_BLOCKADE_CHANGED",
      playerId: former.id,
      cityId: city.id,
      at: port,
      activeBefore: true,
      activeAfter: false,
    });
    // The blockaded dock gives 0 population (2 with Harbours before).
    expect(
      result.state.cities.find((entry) => entry.id === city.id)
        ?.economicPopulation,
    ).toBe(city.economicPopulation - 2);
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });

  it("reveals the prize's sight for its new owner", () => {
    const fixture = scene({ targetHp: 3 });
    const actor = seatV7(fixture.state, 0).id;
    // The actor has not explored the row two tiles south of the prize.
    const hiddenRow = 7;
    const fogged: GameStateV7 = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: player.explored.filter((at) => at.y < hiddenRow),
            }
          : player,
      ),
    };
    expect(parseGameStateV7(fogged)).not.toBeNull();
    const result = acceptV7(fogged, 0, board(fixture));
    const revealed = result.events.find(
      (event) => event.kind === "TILES_REVEALED",
    );
    // A Patrol Boat sees 2 tiles: (3..7, 7) are new.
    expect(revealed).toEqual({
      kind: "TILES_REVEALED",
      playerId: actor,
      tiles: [3, 4, 5, 6, 7].map((x) => ({ x, y: hiddenRow })),
    });
    expect(
      seatV7(result.state, 0).explored.filter((at) => at.y === hiddenRow),
    ).toHaveLength(5);
  });
});

describe("BOARD offers, preview, and projection", () => {
  it("offers BOARD for every legal pair and previews exactly those", () => {
    const fixture = scene({
      targetHp: 3,
      extra: [
        { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 5, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 4 } },
      ],
    });
    const submarine = navalUnitAtV7(fixture.state, { x: 5, y: 6 });
    const battleship = navalUnitAtV7(fixture.state, { x: 4, y: 6 });
    const state = patchNavalUnitV7(fixture.state, submarine.id, { hp: 4 });
    // The Patrol Boat (5, 4) reaches the boat on (5, 5); the Battleship
    // (4, 6) reaches both the boat and the Submarine (5, 6).
    const expected: CommandV7[] = [
      {
        kind: "BOARD",
        unitId: fixture.boarderId as never,
        targetUnitId: fixture.targetId as never,
      },
      {
        kind: "BOARD",
        unitId: battleship.id,
        targetUnitId: fixture.targetId as never,
      },
      { kind: "BOARD", unitId: battleship.id, targetUnitId: submarine.id },
    ];
    const offered = offeredBoards(state, 0);
    expect(offered).toHaveLength(3);
    expect(offered).toEqual(expect.arrayContaining(expected));
    const view = viewForV7(state, seatV7(state, 0).id);
    for (const command of offered) {
      if (command.kind !== "BOARD") continue;
      const preview = previewBoardV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      const result = acceptV7(state, 0, command);
      expect(preview).toEqual({
        unitId: command.unitId,
        targetUnitId: command.targetUnitId,
        fromPlayerId: seatV7(state, 1).id,
        hpAfter: navalUnitV7(result.state, command.targetUnitId).hp,
      });
    }
    // Not offered: the Patrol Boat cannot reach the Submarine.
    expect(
      previewBoardV7(view, fixture.boarderId as never, submarine.id),
    ).toBeNull();
    // The other seat is offered nothing on this turn.
    expect(offeredBoards(state, 1)).toEqual([]);
  });

  it("projects SHIP_BOARDED to the actor, the former owner, and viewers that see the tile, and to nobody else", () => {
    for (const explored of [false, true]) {
      const fixture = scene({
        targetHp: 3,
        third: { faction: "GOBLIN", explored },
      });
      const result = acceptV7(fixture.state, 0, board(fixture));
      const kinds = (seat: 0 | 1 | 2) =>
        projectEventsV7(
          fixture.state,
          result.state,
          seatV7(fixture.state, seat).id,
          result.events,
        ).events.map((event) => event.kind);
      expect(kinds(0)).toContain("SHIP_BOARDED");
      expect(kinds(1)).toContain("SHIP_BOARDED");
      // The bystander learns of it only when it has explored the tile.
      expect(kinds(2).includes("SHIP_BOARDED")).toBe(explored);
      if (!explored) expect(kinds(2)).toEqual([]);
      const bystander = viewForV7(result.state, seatV7(fixture.state, 2).id);
      expect(bystander.units.some((unit) => unit.id === fixture.targetId)).toBe(
        explored,
      );
    }
    // The former owner is told even when it has not explored the tile.
    const fixture = scene({ targetHp: 3 });
    const former = seatV7(fixture.state, 1).id;
    const blind: GameStateV7 = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === former
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === TARGET.x && at.y === TARGET.y),
              ),
            }
          : player,
      ),
    };
    const result = acceptV7(blind, 0, board(fixture));
    expect(
      projectEventsV7(blind, result.state, former, result.events).events,
    ).toContainEqual(expect.objectContaining({ kind: "SHIP_BOARDED" }));
  });
});
