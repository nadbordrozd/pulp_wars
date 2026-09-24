import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  effectiveRoleRuleV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  viewForV7,
} from "../../src/engine/index";
import { withPortV7 } from "../fixtures/v7-naval-builders";

describe("ruleset-7 naval combat", () => {
  it("freezes exact Patrol Boat and Battleship statistics", () => {
    expect(effectiveRoleRuleV7("PATROL_BOAT")).toMatchObject({
      cost: 5,
      maxHp: 10,
      attack2: 4,
      defense2: 4,
      move: 3,
      range: 1,
      mayUsePrimaryActionAfterMove: true,
    });
    expect(effectiveRoleRuleV7("BATTLESHIP")).toMatchObject({
      cost: 16,
      maxHp: 25,
      attack2: 12,
      defense2: 8,
      move: 2,
      range: 3,
      mayUsePrimaryActionAfterMove: false,
    });
  });

  it("uses no terrain defense afloat and never advances a ship", () => {
    const fixture = withPortV7(9201);
    const attacker = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    const defender = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (attacker === undefined || defender === undefined)
      throw new Error("units missing");
    const target = { x: fixture.portAt.x + 1, y: fixture.portAt.y };
    const state = {
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === target.x && tile.at.y === target.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      units: fixture.state.units.map((unit) =>
        unit.id === attacker.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "BATTLESHIP" as const,
              form: "NAVAL" as const,
              hp: 25,
              maxHp: 25,
            }
          : unit.id === defender.id
            ? {
                ...unit,
                at: target,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
              }
            : unit,
      ),
    } as typeof fixture.state;
    const navalAttacker = state.units.find((unit) => unit.id === attacker.id);
    const navalDefender = state.units.find((unit) => unit.id === defender.id);
    if (navalAttacker === undefined || navalDefender === undefined)
      throw new Error("naval units missing");
    expect(
      calculateCombatPreviewV7(state, navalAttacker.id, navalDefender.id),
    ).toMatchObject({
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      advances: false,
    });
  });

  it("rejects native naval roles through the land TRAIN command", () => {
    const fixture = withPortV7(9202);
    const city = fixture.state.cities.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    expect(
      applyCommandV7(fixture.state, fixture.state.humanPlayerId, {
        kind: "TRAIN",
        cityId: city.id,
        role: "PATROL_BOAT",
      }),
    ).toMatchObject({ accepted: false });
  });

  it("gives transports Defense 1, Move 3, Sight 1, no attack, range, abilities, or retaliation", () => {
    const fixture = withPortV7(9203);
    const passenger = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    const attacker = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    if (passenger === undefined || attacker === undefined)
      throw new Error("units missing");
    const shore = { x: fixture.portAt.x + 1, y: fixture.portAt.y };
    const state = {
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          tile.at.x === shore.x && tile.at.y === shore.y
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      units: fixture.state.units.map((unit) =>
        unit.id === passenger.id
          ? {
              ...unit,
              at: fixture.portAt,
              role: "FIGHTER" as const,
              form: "EMBARKED" as const,
            }
          : unit.id === attacker.id
            ? { ...unit, at: shore }
            : unit,
      ),
    } as typeof fixture.state;
    const preview = calculateCombatPreviewV7(state, attacker.id, passenger.id);
    expect(preview).toMatchObject({
      defense2: 2,
      retaliation: false,
      advances: false,
    });
    expect(
      queryCombatPreviewV7(
        viewForV7(state, state.humanPlayerId),
        attacker.id,
        passenger.id,
      ),
    ).toEqual(preview);
    const stats = publicUnitStatsV7(
      state,
      state.units.find((unit) => unit.id === passenger.id) ?? passenger,
    );
    expect(stats).toMatchObject({
      minimumRange: 0,
      maximumRange: 0,
      abilities: [],
    });
    expect(
      Object.fromEntries(
        stats.stats.map((stat) => [
          stat.id,
          stat.total.numerator / stat.total.denominator,
        ]),
      ),
    ).toMatchObject({
      ATTACK: 0,
      DEFENSE: 1,
      MOVE: 3,
      RANGE: 0,
      SIGHT: 1,
    });
  });

  it("recovers ships by 4 only at an owned active Port and rejects Captain Tend afloat", () => {
    const fixture = withPortV7(9204);
    const unit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("unit missing");
    const shipState = {
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.state.humanPlayerId
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "MILLING",
              ),
            }
          : player,
      ),
      units: fixture.state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              at: fixture.portAt,
              role: "PATROL_BOAT" as const,
              form: "NAVAL" as const,
              hp: 4,
            }
          : candidate,
      ),
    } as typeof fixture.state;
    const four = applyCommandV7(shipState, shipState.humanPlayerId, {
      kind: "RECOVER",
      unitId: unit.id,
    });
    expect(four).toMatchObject({
      accepted: true,
      events: [{ kind: "UNIT_RECOVERED", amount: 4 }],
    });

    const neutralAt = shipState.board.tiles.find(
      (tile) =>
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) === 1 &&
        !shipState.units.some(
          (candidate) =>
            candidate.id !== unit.id &&
            candidate.at.x === tile.at.x &&
            candidate.at.y === tile.at.y,
        ),
    )?.at;
    if (neutralAt === undefined) throw new Error("neutral water missing");
    const neutral = {
      ...shipState,
      board: {
        ...shipState.board,
        tiles: shipState.board.tiles.map((tile) =>
          tile.at.x === neutralAt.x && tile.at.y === neutralAt.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                road: false,
                site: null,
                territoryCityId: null,
              }
            : tile,
        ),
      },
      units: shipState.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, at: neutralAt } : candidate,
      ),
    } as typeof shipState;
    expect(
      applyCommandV7(neutral, neutral.humanPlayerId, {
        kind: "RECOVER",
        unitId: unit.id,
      }),
    ).toMatchObject({
      accepted: true,
      events: [{ kind: "UNIT_RECOVERED", amount: 4 }],
    });
    const ended = applyCommandV7(neutral, neutral.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    const opponent = ended.state.turnOrder[ended.state.activeSeatIndex];
    if (opponent === undefined) throw new Error("opponent missing");
    const returned = applyCommandV7(ended.state, opponent, {
      kind: "END_TURN",
    });
    expect(returned.accepted).toBe(true);
    if (returned.accepted)
      expect(
        returned.state.units.find((candidate) => candidate.id === unit.id)?.hp,
      ).toBe(8);

    const recoveryState = {
      ...shipState,
      players: fixture.state.players,
    } as typeof fixture.state;
    const six = applyCommandV7(recoveryState, recoveryState.humanPlayerId, {
      kind: "RECOVER",
      unitId: unit.id,
    });
    expect(six).toMatchObject({
      accepted: true,
      events: [{ kind: "UNIT_RECOVERED", amount: 4 }],
    });

    const farWater = fixture.state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) >= 3,
    );
    if (farWater === undefined) throw new Error("far tile missing");
    const noPort = {
      ...shipState,
      board: {
        ...shipState.board,
        tiles: shipState.board.tiles.map((tile) =>
          tile.at.x === farWater.at.x && tile.at.y === farWater.at.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
      units: shipState.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: farWater.at }
          : candidate,
      ),
    } as typeof fixture.state;
    expect(
      applyCommandV7(noPort, noPort.humanPlayerId, {
        kind: "RECOVER",
        unitId: unit.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "RECOVER_NOT_LEGAL" } });
    const second = fixture.state.units.find(
      (candidate) => candidate.ownerId !== fixture.state.humanPlayerId,
    );
    if (second === undefined) throw new Error("second unit missing");
    const medicState = {
      ...fixture.state,
      units: fixture.state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, role: "CAPTAIN" as const }
          : candidate.id === second.id
            ? {
                ...candidate,
                ownerId: fixture.state.humanPlayerId,
                homeCityId: unit.homeCityId,
                at: fixture.portAt,
                role: "PATROL_BOAT" as const,
                form: "NAVAL" as const,
                hp: 4,
              }
            : candidate,
      ),
    } as typeof fixture.state;
    expect(
      applyCommandV7(medicState, medicState.humanPlayerId, {
        kind: "TEND_WOUNDED",
        unitId: unit.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });
  });

  it("allows Patrol Boat move then fire but makes Battleship choose move or fire", () => {
    const fixture = withPortV7(9205);
    const attacker = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.state.humanPlayerId,
    );
    const defender = fixture.state.units.find(
      (unit) => unit.ownerId !== fixture.state.humanPlayerId,
    );
    if (attacker === undefined || defender === undefined)
      throw new Error("units missing");
    const step = { x: fixture.portAt.x + 1, y: fixture.portAt.y };
    const target = { x: fixture.portAt.x + 2, y: fixture.portAt.y };
    const stateFor = (role: "PATROL_BOAT" | "BATTLESHIP") =>
      ({
        ...fixture.state,
        board: {
          ...fixture.state.board,
          tiles: fixture.state.board.tiles.map((tile) =>
            (tile.at.x === step.x && tile.at.y === step.y) ||
            (tile.at.x === target.x && tile.at.y === target.y)
              ? {
                  ...tile,
                  biome: null,
                  terrain: "SHALLOW_WATER" as const,
                  resource: null,
                  improvement: null,
                  site: null,
                }
              : tile,
          ),
        },
        units: fixture.state.units.map((unit) =>
          unit.id === attacker.id
            ? {
                ...unit,
                at: fixture.portAt,
                role,
                form: "NAVAL" as const,
                hp: role === "BATTLESHIP" ? 25 : 10,
                maxHp: role === "BATTLESHIP" ? 25 : 10,
              }
            : unit.id === defender.id
              ? {
                  ...unit,
                  at: target,
                  role: "PATROL_BOAT" as const,
                  form: "NAVAL" as const,
                }
              : unit,
        ),
      }) as typeof fixture.state;
    for (const [role, accepted] of [
      ["PATROL_BOAT", true],
      ["BATTLESHIP", false],
    ] as const) {
      const state = stateFor(role);
      const moved = applyCommandV7(state, state.humanPlayerId, {
        kind: "MOVE",
        unitId: attacker.id,
        path: [step],
      });
      expect(moved.accepted).toBe(true);
      if (!moved.accepted) continue;
      expect(
        applyCommandV7(moved.state, moved.state.humanPlayerId, {
          kind: "ATTACK",
          unitId: attacker.id,
          targetUnitId: defender.id,
        }).accepted,
      ).toBe(accepted);
    }
  });
});
