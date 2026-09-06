import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseGameStateV7,
  previewCityCapacityV7,
  previewDisbandV7,
  previewPillageV7,
  type GameStateV7,
  type UnitStateV7,
  unitId,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 conflict economy and capacity", () => {
  it("builds one adjacent Barracks for no population and one live capacity", () => {
    const state = exploredAllV7(allTechsV7(initialV7(111)));
    const city = state.cities.find(
      (item) => item.ownerId === state.humanPlayerId,
    );
    const tile = state.board.tiles.find(
      (item) =>
        item.territoryCityId === city?.id &&
        item.site === null &&
        item.resource === null &&
        item.improvement === null &&
        Math.max(
          Math.abs(item.at.x - city.at.x),
          Math.abs(item.at.y - city.at.y),
        ) === 1,
    );
    if (city === undefined || tile === undefined)
      throw new Error("fixture missing");
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_BARRACKS",
      at: tile.at,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events).toEqual([
      {
        kind: "ECONOMIC_BUILDING_BUILT",
        playerId: state.humanPlayerId,
        cityId: city.id,
        at: tile.at,
        improvement: "BARRACKS",
        cost: 6,
        populationContribution: 0,
        marketIncome: 0,
        capacityDelta: 1,
      },
    ]);
    expect(result.state.populationContributions).toEqual(
      state.populationContributions,
    );
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 3,
      assigned: 1,
      available: 2,
      overCapacity: 0,
    });
    const secondTile = result.state.board.tiles.find(
      (item) =>
        item.territoryCityId === city.id &&
        item.site === null &&
        item.resource === null &&
        item.improvement === null &&
        Math.max(
          Math.abs(item.at.x - city.at.x),
          Math.abs(item.at.y - city.at.y),
        ) === 1,
    );
    if (secondTile === undefined) throw new Error("second tile missing");
    expect(
      applyCommandV7(result.state, state.humanPlayerId, {
        kind: "BUILD_BARRACKS",
        at: secondTile.at,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "CITY_BUILDING_LIMIT" },
    });
  });

  it("trains an unlocked unit at exact cost into available city capacity", () => {
    let state = allTechsV7(initialV7(110));
    const human = required(state.players[0], "human missing");
    const city = required(
      state.cities.find((item) => item.ownerId === human.id),
      "city missing",
    );
    const resident = required(
      state.units.find((unit) => unit.ownerId === human.id),
      "resident missing",
    );
    const occupied = new Set(state.units.map((unit) => key(unit.at)));
    const destination = required(
      state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          !occupied.has(key(tile.at)) &&
          !state.treasureChests.some((chest) => key(chest) === key(tile.at)),
      ),
      "resident destination missing",
    );
    state = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === resident.id ? { ...unit, at: destination.at } : unit,
      ),
    });
    const beforeCoins = human.coins;
    const result = applyCommandV7(state, human.id, {
      kind: "TRAIN",
      cityId: city.id,
      role: "CATAPULT",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events).toEqual([
      expect.objectContaining({
        kind: "UNIT_TRAINED",
        cityId: city.id,
        role: "CATAPULT",
        cost: 8,
        at: city.at,
      }),
    ]);
    expect(result.state.players[0]?.coins).toBe(beforeCoins - 8);
    expect(
      result.state.units.find((unit) => unit.role === "CATAPULT"),
    ).toMatchObject({
      homeCityId: city.id,
      hp: 10,
      maxHp: 10,
      activation: { handled: true, specialActed: true },
    });
  });

  it("allows legal over-capacity after hostile Pillage destroys Barracks", () => {
    let state = allTechsV7(initialV7(112));
    const human = required(state.players[0], "human missing");
    const enemy = required(state.players[1], "enemy missing");
    const city = required(
      state.cities.find((item) => item.ownerId === human.id),
      "city missing",
    );
    const sites = state.board.tiles
      .filter(
        (item) =>
          item.territoryCityId === city.id &&
          item.site === null &&
          item.resource === null,
      )
      .slice(0, 3);
    if (sites.length < 3) throw new Error("sites missing");
    const enemyUnit = required(
      state.units.find((item) => item.ownerId === enemy.id),
      "enemy unit missing",
    );
    const barracksSite = required(sites[0], "barracks site missing");
    const firstExtraSite = required(sites[1], "first extra site missing");
    const secondExtraSite = required(sites[2], "second extra site missing");
    const extra1 = freshFighter(
      state.nextEntityId,
      human.id,
      city.id,
      firstExtraSite.at,
    );
    const extra2 = freshFighter(
      state.nextEntityId + 1,
      human.id,
      city.id,
      secondExtraSite.at,
    );
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 2,
      activeSeatIndex: state.turnOrder.indexOf(enemy.id),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === barracksSite.at.x && tile.at.y === barracksSite.at.y
            ? { ...tile, improvement: "BARRACKS" }
            : tile,
        ),
      },
      units: [
        ...state.units.filter((item) => item.id !== enemyUnit.id),
        { ...enemyUnit, at: barracksSite.at, activation: readyActivation() },
        extra1,
        extra2,
      ],
    });
    expect(previewCityCapacityV7(state, city.id)).toMatchObject({
      capacity: 3,
      assigned: 3,
    });
    expect(previewPillageV7(state, enemy.id, enemyUnit.id)).toMatchObject({
      improvement: "BARRACKS",
      coinDelta: 1,
      capacityDelta: -1,
    });
    const result = applyCommandV7(state, enemy.id, {
      kind: "PILLAGE",
      unitId: enemyUnit.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 2,
      assigned: 3,
      overCapacity: 1,
    });
    expect(
      result.state.units.filter((item) => item.homeCityId === city.id),
    ).toHaveLength(3);
    expect(parseGameStateV7(result.state)).toEqual(result.state);
  });

  it("cancels ordered capacity reservations immediately after Barracks removal", () => {
    let state = exploredAllV7(allTechsV7(initialV7(117)));
    const human = required(state.players[0], "human missing");
    const enemy = required(state.players[1], "enemy missing");
    const city = required(
      state.cities.find((item) => item.ownerId === human.id),
      "city missing",
    );
    const enemyUnit = required(
      state.units.find((item) => item.ownerId === enemy.id),
      "enemy unit missing",
    );
    const blocked = new Set([
      ...state.units.map((unit) => `${unit.at.y},${unit.at.x}`),
      ...state.treasureChests.map((at) => `${at.y},${at.x}`),
    ]);
    const sourceTile = state.board.tiles.find(
      (tile) => tile.site === null && !blocked.has(`${tile.at.y},${tile.at.x}`),
    );
    const targetTile =
      sourceTile === undefined
        ? undefined
        : state.board.tiles.find(
            (tile) =>
              tile.site === null &&
              !blocked.has(`${tile.at.y},${tile.at.x}`) &&
              Math.max(
                Math.abs(tile.at.x - sourceTile.at.x),
                Math.abs(tile.at.y - sourceTile.at.y),
              ) === 1,
          );
    const barracksTile = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        !blocked.has(`${tile.at.y},${tile.at.x}`) &&
        !(tile.at.x === sourceTile?.at.x && tile.at.y === sourceTile?.at.y) &&
        !(tile.at.x === targetTile?.at.x && tile.at.y === targetTile?.at.y) &&
        Math.max(
          Math.abs(tile.at.x - city.at.x),
          Math.abs(tile.at.y - city.at.y),
        ) === 1,
    );
    if (
      sourceTile === undefined ||
      targetTile === undefined ||
      barracksTile === undefined
    )
      throw new Error("reservation fixture missing");
    const envoy = {
      ...freshFighter(state.nextEntityId, human.id, city.id, sourceTile.at),
      role: "ENVOY" as const,
      hp: 7,
      maxHp: 7,
    };
    const markId = state.nextEntityId + 1;
    state = checkedV7({
      ...state,
      commandIndex: 1,
      nextEntityId: markId + 1,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          tile.at.x === barracksTile.at.x && tile.at.y === barracksTile.at.y
            ? {
                ...tile,
                site: null,
                resource: null,
                improvement: "BARRACKS",
              }
            : tile,
        ),
      },
      units: [
        ...state.units.filter((unit) => unit.id !== enemyUnit.id),
        envoy,
        { ...enemyUnit, at: targetTile.at },
      ].sort((a, b) => a.id - b.id),
      defectionMarks: [
        {
          id: markId,
          sourceUnitId: envoy.id,
          targetUnitId: enemyUnit.id,
          initiatingPlayerId: human.id,
          recordedTargetOwnerId: enemy.id,
          reservedHomeCityId: city.id,
          offeredAtCommandIndex: 1,
          phase: "WAITING_FOR_REPLY",
        },
      ],
    });
    expect(previewCityCapacityV7(state, city.id)).toMatchObject({
      capacity: 3,
      assigned: 2,
      reserved: 1,
    });
    const result = applyCommandV7(state, human.id, {
      kind: "REDEVELOP",
      at: barracksTile.at,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events.slice(0, 2)).toEqual([
      expect.objectContaining({
        kind: "ECONOMIC_BUILDING_REMOVED",
        improvement: "BARRACKS",
        capacityDelta: -1,
      }),
      {
        kind: "DEFECTION_CANCELLED",
        markId,
        reason: "CAPACITY_LOST",
      },
    ]);
    expect(result.state.defectionMarks).toEqual([]);
  });

  it("refunds floor half cost for trainable Disband and excludes reward units", () => {
    let state = allTechsV7(initialV7(113));
    const human = required(state.players[0], "human missing");
    const city = required(
      state.cities.find((item) => item.ownerId === human.id),
      "city missing",
    );
    const at = required(
      state.board.tiles.find(
        (item) => item.territoryCityId === city.id && item.site === null,
      ),
      "unit tile missing",
    ).at;
    const heavy = {
      ...freshFighter(state.nextEntityId, human.id, city.id, at),
      role: "HEAVY" as const,
      hp: 20,
      maxHp: 20,
    };
    state = checkedV7({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      units: [...state.units, heavy],
    });
    expect(previewDisbandV7(state, human.id, heavy.id)).toMatchObject({
      refund: 3,
      homeCityId: city.id,
    });
    const beforeCoins = human.coins;
    const result = applyCommandV7(state, human.id, {
      kind: "DISBAND",
      unitId: heavy.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events[0]).toEqual({
      kind: "UNIT_DISBANDED",
      playerId: human.id,
      unitId: heavy.id,
      role: "HEAVY",
      coinDelta: 3,
    });
    expect(result.state.players[0]?.coins).toBe(beforeCoins + 3);
    const juggernaut = {
      ...heavy,
      id: unitId(result.state.nextEntityId),
      role: "JUGGERNAUT" as const,
      hp: 40,
      maxHp: 40,
    };
    const withReward = checkedV7({
      ...result.state,
      nextEntityId: result.state.nextEntityId + 1,
      units: [...result.state.units, juggernaut],
    });
    expect(
      applyCommandV7(withReward, human.id, {
        kind: "DISBAND",
        unitId: juggernaut.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_ROLE_INVALID" } });
  });

  it("awards Spoils once per hostile city and never for neutral villages", () => {
    const staged = stageHostileCapture(allTechsV7(initialV7(114)), false);
    const actor = staged.humanPlayerId;
    const unit = required(
      staged.units.find((item) => item.ownerId === actor),
      "capture unit missing",
    );
    const target = required(
      staged.cities.find(
        (item) => item.at.x === unit.at.x && item.at.y === unit.at.y,
      ),
      "capture target missing",
    );
    const result = applyCommandV7(staged, actor, {
      kind: "CAPTURE",
      unitId: unit.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events).toEqual(
      expect.arrayContaining([
        {
          kind: "SPOILS_AWARDED",
          playerId: actor,
          cityId: target.id,
          coins: 2,
        },
      ]),
    );
    expect(result.state.players[0]?.spoilsClaimedCityIds).toContain(target.id);
    expect(previewCityCapacityV7(result.state, target.id)).toMatchObject({
      capacity: 3,
      assigned: 1,
    });

    const repeated = stageHostileCapture(allTechsV7(initialV7(115)), true);
    const repeatedUnit = required(
      repeated.units.find((item) => item.ownerId === repeated.humanPlayerId),
      "repeat unit missing",
    );
    const noRepeat = applyCommandV7(repeated, repeated.humanPlayerId, {
      kind: "CAPTURE",
      unitId: repeatedUnit.id,
    });
    expect(noRepeat.accepted).toBe(true);
    if (noRepeat.accepted)
      expect(
        noRepeat.events.some((event) => event.kind === "SPOILS_AWARDED"),
      ).toBe(false);

    const neutral = stageVillageCapture(allTechsV7(initialV7(116)));
    const neutralUnit = required(
      neutral.units.find((item) => item.ownerId === neutral.humanPlayerId),
      "neutral capture unit missing",
    );
    const captured = applyCommandV7(neutral, neutral.humanPlayerId, {
      kind: "CAPTURE",
      unitId: neutralUnit.id,
    });
    expect(captured.accepted).toBe(true);
    if (captured.accepted)
      expect(
        captured.events.some((event) => event.kind === "SPOILS_AWARDED"),
      ).toBe(false);
  });

  it("rejects Spoils and Disband overflow atomically without consuming PRNG", () => {
    let capture = stageHostileCapture(allTechsV7(initialV7(118)), false);
    capture = checkedV7({
      ...capture,
      players: capture.players.map((player) =>
        player.id === capture.humanPlayerId
          ? { ...player, coins: Number.MAX_SAFE_INTEGER }
          : player,
      ),
    });
    const captureUnit = required(
      capture.units.find((unit) => unit.ownerId === capture.humanPlayerId),
      "overflow capture unit missing",
    );
    const captureRandom = capture.random;
    const captureResult = applyCommandV7(capture, capture.humanPlayerId, {
      kind: "CAPTURE",
      unitId: captureUnit.id,
    });
    expect(captureResult).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
    });
    expect(captureResult.state).toBe(capture);
    expect(captureResult.state.random).toEqual(captureRandom);

    let disband = allTechsV7(initialV7(119));
    const fighter = required(
      disband.units.find((unit) => unit.ownerId === disband.humanPlayerId),
      "overflow disband unit missing",
    );
    disband = checkedV7({
      ...disband,
      players: disband.players.map((player) =>
        player.id === disband.humanPlayerId
          ? { ...player, coins: Number.MAX_SAFE_INTEGER }
          : player,
      ),
    });
    const disbandRandom = disband.random;
    const disbandResult = applyCommandV7(disband, disband.humanPlayerId, {
      kind: "DISBAND",
      unitId: fighter.id,
    });
    expect(disbandResult).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
    });
    expect(disbandResult.state).toBe(disband);
    expect(disbandResult.state.random).toEqual(disbandRandom);
  });
});

function stageHostileCapture(
  state: GameStateV7,
  claimed: boolean,
): GameStateV7 {
  const human = required(state.players[0], "human missing");
  const enemy = required(state.players[1], "enemy missing");
  const target = required(
    state.cities.find((item) => item.ownerId === enemy.id),
    "target city missing",
  );
  const attacker = required(
    state.units.find((item) => item.ownerId === human.id),
    "attacker missing",
  );
  const defender = required(
    state.units.find((item) => item.ownerId === enemy.id),
    "defender missing",
  );
  const retreat = required(
    state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === target.id &&
        tile.site === null &&
        tile.at.x !== target.at.x &&
        tile.terrain !== "MOUNTAIN",
    ),
    "retreat missing",
  );
  const barracks = required(
    state.board.tiles.find(
      (tile) =>
        tile.territoryCityId === target.id &&
        tile.site === null &&
        !(tile.at.x === retreat.at.x && tile.at.y === retreat.at.y),
    ),
    "barracks tile missing",
  );
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.at.x === barracks.at.x && tile.at.y === barracks.at.y
          ? { ...tile, resource: null, improvement: "BARRACKS" }
          : tile,
      ),
    },
    players: state.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            explored: [...player.explored, target.at].sort(
              (a, b) => a.y - b.y || a.x - b.x,
            ),
            spoilsClaimedCityIds: claimed ? [target.id] : [],
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.id === attacker.id
        ? {
            ...unit,
            at: target.at,
            captureEligible: true,
            activation: readyActivation(),
          }
        : unit.id === defender.id
          ? { ...unit, at: retreat.at }
          : unit,
    ),
  });
}
function stageVillageCapture(state: GameStateV7): GameStateV7 {
  const human = required(state.players[0], "human missing");
  const attacker = required(
    state.units.find((item) => item.ownerId === human.id),
    "attacker missing",
  );
  const village = required(
    state.board.tiles.find((tile) => tile.site === "VILLAGE"),
    "village missing",
  );
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === human.id
        ? {
            ...player,
            explored: [...player.explored, village.at].sort(
              (a, b) => a.y - b.y || a.x - b.x,
            ),
          }
        : player,
    ),
    units: state.units.map((unit) =>
      unit.id === attacker.id
        ? {
            ...unit,
            at: village.at,
            captureEligible: true,
            activation: readyActivation(),
          }
        : unit,
    ),
  });
}
function freshFighter(
  id: number,
  ownerId: UnitStateV7["ownerId"],
  homeCityId: NonNullable<UnitStateV7["homeCityId"]>,
  at: UnitStateV7["at"],
): UnitStateV7 {
  return {
    id: unitId(id),
    ownerId,
    homeCityId,
    role: "FIGHTER",
    at,
    hp: 10,
    maxHp: 10,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: readyActivation(),
    blackoutEligibleRound: null,
  };
}
function readyActivation(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    pursuitPhase: "NONE",
    healed: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

const key = (at: UnitStateV7["at"]): string => `${at.y},${at.x}`;
