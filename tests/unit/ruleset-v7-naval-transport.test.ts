import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  createInitialMapStateV7,
} from "../../src/engine/index";
import { checkedV7, setupV7 } from "../fixtures/v7-builders";
import { withPortV7 } from "../fixtures/v7-naval-builders";

describe("ruleset-7 naval transport", () => {
  it("embarks and lands the same entity while preserving role, HP, kills, and veteran state", () => {
    const fixture = withPortV7(9301);
    const unit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("unit missing");
    const prepared = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, hp: 7, maxHp: 15, kills: 3, veteran: true }
          : candidate,
      ),
    });
    const embarked = applyCommandV7(prepared, prepared.humanPlayerId, {
      kind: "EMBARK",
      unitId: unit.id,
      portAt: fixture.portAt,
    });
    expect(embarked.accepted).toBe(true);
    if (!embarked.accepted) return;
    const afloat = embarked.state.units.find(
      (candidate) => candidate.id === unit.id,
    );
    expect(afloat).toMatchObject({
      id: unit.id,
      role: unit.role,
      form: "EMBARKED",
      hp: 7,
      kills: 3,
      veteran: true,
    });
    const nextWater = embarked.state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        Math.max(
          Math.abs(tile.at.x - fixture.portAt.x),
          Math.abs(tile.at.y - fixture.portAt.y),
        ) === 1 &&
        Math.max(
          Math.abs(tile.at.x - unit.at.x),
          Math.abs(tile.at.y - unit.at.y),
        ) === 1 &&
        (tile.at.x !== unit.at.x || tile.at.y !== unit.at.y),
    );
    if (nextWater === undefined) throw new Error("next water missing");
    const landingAt = embarked.state.board.tiles.find(
      (tile) =>
        tile.site === null &&
        tile.biome !== null &&
        tile.terrain !== "MOUNTAIN" &&
        Math.max(
          Math.abs(tile.at.x - nextWater.at.x),
          Math.abs(tile.at.y - nextWater.at.y),
        ) === 1,
    )?.at;
    if (landingAt === undefined) throw new Error("landing tile missing");
    const reset = checkedV7({
      ...embarked.state,
      board: {
        ...embarked.state.board,
        tiles: embarked.state.board.tiles.map((tile) =>
          tile.at.x === nextWater.at.x && tile.at.y === nextWater.at.y
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER" as const,
                resource: null,
                improvement: null,
                site: null,
              }
            : tile.at.x === landingAt.x && tile.at.y === landingAt.y
              ? {
                  ...tile,
                  biome: "PLAINS" as const,
                  terrain: "GRASS" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                  site: "VILLAGE" as const,
                  territoryCityId: null,
                }
              : tile,
        ),
      },
      units: embarked.state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: {
                ...candidate.activation,
                moved: false,
                handled: false,
              },
            }
          : candidate,
      ),
    });
    const moved = applyCommandV7(reset, reset.humanPlayerId, {
      kind: "MOVE",
      unitId: unit.id,
      path: [nextWater.at],
    });
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    const landed = applyCommandV7(moved.state, moved.state.humanPlayerId, {
      kind: "DISEMBARK",
      unitId: unit.id,
      at: landingAt,
    });
    expect(landed.accepted).toBe(true);
    if (landed.accepted)
      expect(
        landed.state.units.find((candidate) => candidate.id === unit.id),
      ).toMatchObject({
        id: unit.id,
        role: unit.role,
        form: "LAND",
        at: landingAt,
        hp: 7,
        kills: 3,
        veteran: true,
      });
    if (!landed.accepted) return;
    const ai = landed.state.turnOrder.find(
      (playerId) => playerId !== landed.state.humanPlayerId,
    );
    if (ai === undefined) throw new Error("AI missing");
    const endedHuman = applyCommandV7(
      landed.state,
      landed.state.humanPlayerId,
      { kind: "END_TURN" },
    );
    expect(endedHuman.accepted).toBe(true);
    if (!endedHuman.accepted) return;
    const endedAi = applyCommandV7(endedHuman.state, ai, { kind: "END_TURN" });
    expect(endedAi.accepted).toBe(true);
    if (!endedAi.accepted) return;
    expect(
      applyCommandV7(endedAi.state, endedAi.state.humanPlayerId, {
        kind: "CAPTURE",
        unitId: unit.id,
      }),
    ).toMatchObject({ accepted: true });
  });

  it("rejects embark after a Horse Archer shot", () => {
    const fixture = withPortV7(9302);
    const unit = fixture.state.units.find(
      (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("unit missing");
    const state = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              role: "HORSE_ARCHER" as const,
              activation: {
                ...candidate.activation,
                attacked: true,
                attacksUsed: 1 as const,
              },
            }
          : candidate,
      ),
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "EMBARK",
        unitId: unit.id,
        portAt: fixture.portAt,
      }),
    ).toMatchObject({ accepted: false });
  });

  it("rejects an AI landing in formal allied territory", () => {
    const setup = { ...setupV7(9303, 2), aiMode: "COOPERATIVE" as const };
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const ais = created.state.players.filter(
      (player) => player.controller === "AI",
    );
    const actor = ais[0];
    const ally = ais[1];
    if (actor === undefined || ally === undefined)
      throw new Error("AI players missing");
    const actorUnit = created.state.units.find(
      (unit) => unit.ownerId === actor.id,
    );
    const allyCity = created.state.cities.find(
      (city) => city.ownerId === ally.id,
    );
    if (actorUnit === undefined || allyCity === undefined)
      throw new Error("AI entities missing");
    const water = { x: allyCity.at.x - 1, y: allyCity.at.y };
    const state = checkedV7({
      ...created.state,
      activeSeatIndex: created.state.turnOrder.indexOf(actor.id),
      players: created.state.players.map((player) => ({
        ...player,
        researchedTechs: TECHNOLOGY_IDS_V7,
      })),
      board: {
        ...created.state.board,
        tiles: created.state.board.tiles.map((tile) =>
          tile.at.x === water.x && tile.at.y === water.y
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
      units: created.state.units.map((unit) =>
        unit.id === actorUnit.id
          ? { ...unit, at: water, form: "EMBARKED" as const }
          : unit.ownerId === ally.id &&
              unit.at.x === allyCity.at.x &&
              unit.at.y === allyCity.at.y
            ? { ...unit, at: { x: allyCity.at.x + 1, y: allyCity.at.y } }
            : unit,
      ),
    });
    expect(
      applyCommandV7(state, actor.id, {
        kind: "DISEMBARK",
        unitId: actorUnit.id,
        at: allyCity.at,
      }),
    ).toMatchObject({ accepted: false });
  });
});
