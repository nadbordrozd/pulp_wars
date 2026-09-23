import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  createInitialMapStateV7,
  nextBounded,
  parseGameStateV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  viewForV7,
  type CommandV7,
  type CityId,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type UnitId,
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
      kind: "MOVE",
      unitId: unit.id,
      path: [fixture.portAt],
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
        tile.improvement === null &&
        (tile.at.x !== fixture.portAt.x || tile.at.y !== fixture.portAt.y) &&
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
                moved: false,
                movedPathLength: 0,
                attacked: false,
                attacksUsed: 0,
                healed: false,
                recovered: false,
                captured: false,
                handled: false,
                specialActed: false,
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
        kind: "MOVE",
        unitId: unit.id,
        path: [fixture.portAt],
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

  it.each(["DISEMBARK", "MOVE"] as const)(
    "restores foreign Port growth after %s and defers its reward to the owner's turn",
    (kind) => {
      const fixture = blockedForeignPortV7(kind === "DISEMBARK" ? 9330 : 9331);
      const command: CommandV7 =
        kind === "DISEMBARK"
          ? {
              kind,
              unitId: fixture.blockerId,
              at: fixture.landingAt,
            }
          : {
              kind,
              unitId: fixture.blockerId,
              path: [fixture.waterAt],
            };
      expect(
        queryPlayerCommandsV7(viewForV7(fixture.state, fixture.actorId)),
      ).toContainEqual(command);
      const departed = applyCommandV7(fixture.state, fixture.actorId, command);
      expect(departed.accepted).toBe(true);
      if (!departed.accepted) return;
      expect(departed.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "CITY_LEVELED_UP",
            cityId: fixture.portCityId,
            level: 2,
          }),
        ]),
      );
      expect(departed.events).not.toContainEqual(
        expect.objectContaining({ kind: "CITY_REWARD_QUEUED" }),
      );
      expect(departed.state.pendingChoices).toEqual([]);
      const liveCommands = queryPlayerCommandsV7(
        viewForV7(departed.state, fixture.actorId),
      );
      expect(liveCommands).toContainEqual({ kind: "END_TURN" });
      expect(
        liveCommands.some(
          (candidate) => candidate.kind === "CHOOSE_CITY_REWARD",
        ),
      ).toBe(false);

      const ownerTurn = applyCommandV7(departed.state, fixture.actorId, {
        kind: "END_TURN",
      });
      expect(ownerTurn.accepted).toBe(true);
      if (!ownerTurn.accepted) return;
      expect(ownerTurn.events).toContainEqual(
        expect.objectContaining({
          kind: "CITY_REWARD_QUEUED",
          cityId: fixture.portCityId,
          reachedLevel: 2,
        }),
      );
      expect(ownerTurn.state.pendingChoices).toEqual([
        {
          kind: "CITY_REWARD",
          cityId: fixture.portCityId,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ]);
      const reward = applyCommandV7(ownerTurn.state, fixture.portOwnerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: fixture.portCityId,
        reachedLevel: 2,
        reward: "STOCKPILE",
      });
      expect(reward.accepted).toBe(true);

      const foreignPrompt = {
        ...structuredClone(ownerTurn.state),
        activeSeatIndex: ownerTurn.state.turnOrder.indexOf(fixture.actorId),
      };
      expect(parseGameStateV7(foreignPrompt)).toBeNull();
    },
  );

  it("settles immediate owner rewards when combat removes a Port blockade", () => {
    const fixture = blockedForeignPortV7(9332);
    const blocker = fixture.state.units.find(
      (unit) => unit.id === fixture.blockerId,
    );
    const ownerUnit = fixture.state.units.find(
      (unit) => unit.ownerId === fixture.portOwnerId,
    );
    if (blocker === undefined || ownerUnit === undefined)
      throw new Error("combat units missing");
    const state = checkedV7({
      ...fixture.state,
      activeSeatIndex: fixture.state.turnOrder.indexOf(fixture.portOwnerId),
      units: fixture.state.units.map((unit) =>
        unit.id === blocker.id
          ? { ...unit, hp: 1 }
          : unit.id === ownerUnit.id
            ? {
                ...unit,
                at: fixture.waterAt,
                role: "BATTLESHIP" as const,
                form: "NAVAL" as const,
                hp: 25,
                maxHp: 25,
              }
            : unit,
      ),
    });
    const attacked = applyCommandV7(state, fixture.portOwnerId, {
      kind: "ATTACK",
      unitId: ownerUnit.id,
      targetUnitId: blocker.id,
    });
    expect(attacked.accepted).toBe(true);
    if (!attacked.accepted) return;
    expect(attacked.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "UNIT_DIED", unitId: blocker.id }),
        expect.objectContaining({
          kind: "CITY_LEVELED_UP",
          cityId: fixture.portCityId,
          level: 2,
        }),
        expect.objectContaining({
          kind: "CITY_REWARD_QUEUED",
          cityId: fixture.portCityId,
          reachedLevel: 2,
        }),
      ]),
    );
    expect(attacked.state.pendingChoices[0]).toMatchObject({
      cityId: fixture.portCityId,
      reachedLevel: 2,
    });
  });

  it.each(["COINS", "HEAVY"] as const)(
    "resolves a %s treasure reward when an embarked passenger lands",
    (reward) => {
      const fixture = blockedForeignPortV7(reward === "COINS" ? 9333 : 9334);
      let randomState = 0;
      const expectedDraw = reward === "COINS" ? 0 : 1;
      while (
        nextBounded(
          { algorithm: "MULBERRY32", version: 1, state: randomState },
          2,
        ).value !== expectedDraw
      )
        randomState += 1;
      const afloat = fixture.state.units.find(
        (unit) => unit.id === fixture.blockerId,
      );
      if (afloat === undefined) throw new Error("passenger missing");
      const state = checkedV7({
        ...fixture.state,
        random: { ...fixture.state.random, state: randomState },
        treasureChests: [fixture.landingAt],
        players: fixture.state.players.map((player) =>
          player.id === fixture.actorId
            ? {
                ...player,
                explored: [fixture.landingAt, afloat.at].sort(
                  (left, right) => left.y - right.y || left.x - right.x,
                ),
              }
            : player,
        ),
        units: fixture.state.units.map((unit) =>
          unit.id === fixture.blockerId ? { ...unit, homeCityId: null } : unit,
        ),
      });
      const expectedRandom = nextBounded(state.random, 2).random;
      const exploredBefore = state.players.find(
        (player) => player.id === fixture.actorId,
      )?.explored;
      const beforeCoins = state.players.find(
        (player) => player.id === fixture.actorId,
      )?.coins;
      const landed = applyCommandV7(state, fixture.actorId, {
        kind: "DISEMBARK",
        unitId: fixture.blockerId,
        at: fixture.landingAt,
      });
      expect(landed.accepted).toBe(true);
      if (!landed.accepted) return;
      expect(landed.state.random).toEqual(expectedRandom);
      expect(landed.state.treasureChests).not.toContainEqual(fixture.landingAt);
      expect(landed.events).toContainEqual(
        expect.objectContaining({
          kind: "TREASURE_CAPTURED",
          requestedReward: reward,
          grantedReward: reward,
        }),
      );
      if (reward === "COINS")
        expect(
          landed.state.players.find((player) => player.id === fixture.actorId)
            ?.coins,
        ).toBe((beforeCoins ?? 0) + 5);
      else {
        const spawned = landed.state.units.find(
          (unit) =>
            unit.ownerId === fixture.actorId &&
            unit.role === "HEAVY" &&
            unit.id !== fixture.blockerId,
        );
        expect(spawned?.activation).toMatchObject({
          moved: true,
          attacked: true,
          healed: true,
          recovered: true,
          captured: true,
          handled: true,
          specialActed: true,
        });
        const newlyExplored =
          landed.state.players
            .find((player) => player.id === fixture.actorId)
            ?.explored.filter(
              (at) =>
                !exploredBefore?.some(
                  (known) => known.x === at.x && known.y === at.y,
                ),
            ) ?? [];
        expect(
          newlyExplored.some(
            (at) =>
              Math.max(
                Math.abs(at.x - fixture.landingAt.x),
                Math.abs(at.y - fixture.landingAt.y),
              ) > 1,
          ),
        ).toBe(true);
        expect(landed.events).toContainEqual(
          expect.objectContaining({ kind: "TILES_REVEALED" }),
        );
      }
    },
  );
});

function blockedForeignPortV7(seed: number): {
  readonly state: GameStateV7;
  readonly actorId: PlayerId;
  readonly blockerId: UnitId;
  readonly portOwnerId: PlayerId;
  readonly portCityId: CityId;
  readonly landingAt: CoordV7;
  readonly waterAt: CoordV7;
} {
  const fixture = withPortV7(seed);
  const city = fixture.state.cities.find(
    (candidate) => candidate.ownerId === fixture.state.humanPlayerId,
  );
  const blocker = fixture.state.units.find(
    (unit) => unit.ownerId !== fixture.state.humanPlayerId,
  );
  if (city === undefined || blocker === undefined)
    throw new Error("blocked Port fixture entities missing");
  const adjacent = fixture.state.board.tiles.filter(
    (tile) =>
      Math.max(
        Math.abs(tile.at.x - fixture.portAt.x),
        Math.abs(tile.at.y - fixture.portAt.y),
      ) === 1 &&
      tile.site === null &&
      tile.improvement === null &&
      !fixture.state.units.some(
        (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
      ),
  );
  const landing = adjacent.find(
    (tile) => tile.biome !== null && tile.terrain !== "MOUNTAIN",
  );
  const water = adjacent.find(
    (tile) =>
      tile !== landing &&
      fixture.state.populationContributions.every(
        (entry) =>
          entry.source.at.x !== tile.at.x || entry.source.at.y !== tile.at.y,
      ),
  );
  if (landing === undefined || water === undefined)
    throw new Error("blocked Port departure tiles missing");
  const contribution = {
    id: fixture.state.nextEntityId,
    cityId: city.id,
    category: "PERMANENT" as const,
    amount: 1,
    source: {
      kind: "RESOURCE_ACTION" as const,
      action: "HARVEST_FRUIT" as const,
      at: city.at,
    },
  };
  const board = {
    ...fixture.state.board,
    tiles: fixture.state.board.tiles.map((tile) =>
      tile.at.x === water.at.x && tile.at.y === water.at.y
        ? {
            ...tile,
            biome: null,
            terrain: "SHALLOW_WATER" as const,
            resource: null,
            improvement: null,
            road: false,
            site: null,
          }
        : tile,
    ),
  };
  const units = fixture.state.units.map((unit) =>
    unit.id === blocker.id
      ? {
          ...unit,
          at: fixture.portAt,
          form: "EMBARKED" as const,
          captureEligible: false,
          activation: {
            ...unit.activation,
            moved: false,
            handled: false,
          },
        }
      : unit,
  );
  const contributions = [
    ...fixture.state.populationContributions,
    contribution,
  ];
  const economy = recomputeLiveEconomyV7(
    fixture.state,
    { board, cities: fixture.state.cities, units },
    contributions,
  );
  const state = checkedV7({
    ...fixture.state,
    activeSeatIndex: fixture.state.turnOrder.indexOf(blocker.ownerId),
    nextEntityId: fixture.state.nextEntityId + 1,
    board,
    players: fixture.state.players.map((player) => ({
      ...player,
      researchedTechs: TECHNOLOGY_IDS_V7,
      explored: board.tiles.map((tile) => tile.at),
    })),
    cities: economy.cities,
    units,
    populationContributions: economy.populationContributions,
    treasureChests: fixture.state.treasureChests.filter(
      (at) =>
        (at.x !== landing.at.x || at.y !== landing.at.y) &&
        (at.x !== water.at.x || at.y !== water.at.y),
    ),
  });
  return {
    state,
    actorId: blocker.ownerId,
    blockerId: blocker.id,
    portOwnerId: city.ownerId,
    portCityId: city.id,
    landingAt: landing.at,
    waterAt: water.at,
  };
}
