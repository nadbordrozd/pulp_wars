import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  cityUnitCapacityV7,
  previewCityCapacityV7,
  previewDisbandV7,
  type GameStateV7,
  type UnitStateV7,
  unitId,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  replaceTileV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 conflict economy and capacity", () => {
  it("gives every owned city exactly one Fortification capacity", () => {
    const state = allTechsV7(initialV7());
    const city = state.cities.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    if (city === undefined) throw new Error("city missing");
    expect(cityUnitCapacityV7(state, city)).toBe(city.level + 2);
    expect(previewCityCapacityV7(state, city.id)).toMatchObject({
      capacity: city.level + 2,
      assigned: 1,
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

  it("restores a production marker once when hostile Pillage destroys its improvement", () => {
    let state = exploredAllV7(allTechsV7(initialV7(1_308)));
    const human = required(state.players[0], "human missing");
    const enemy = required(state.players[1], "enemy missing");
    const city = required(
      state.cities.find((item) => item.ownerId === human.id),
      "city missing",
    );
    const tile = required(
      state.board.tiles.find(
        (item) =>
          item.territoryCityId === city.id &&
          item.site === null &&
          !state.units.some((unit) => key(unit.at) === key(item.at)) &&
          !state.treasureChests.some((chest) => key(chest) === key(item.at)),
      ),
      "mine tile missing",
    );
    state = replaceTileV7(state, tile.at, {
      terrain: "MOUNTAIN",
      resource: null,
      improvement: null,
    });
    const built = applyCommandV7(state, human.id, {
      kind: "BUILD_MINE",
      at: tile.at,
    });
    if (!built.accepted) throw new Error(built.error.code);
    const pending = required(built.state.pendingChoices[0], "reward missing");
    const rewarded = applyCommandV7(built.state, human.id, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: pending.cityId,
      reachedLevel: pending.reachedLevel,
      reward: "STOCKPILE",
    });
    if (!rewarded.accepted) throw new Error(rewarded.error.code);
    const enemyUnit = required(
      rewarded.state.units.find((unit) => unit.ownerId === enemy.id),
      "pillager missing",
    );
    const staged = checkedV7({
      ...rewarded.state,
      activeSeatIndex: rewarded.state.turnOrder.indexOf(enemy.id),
      units: rewarded.state.units.map((unit) =>
        unit.id === enemyUnit.id
          ? { ...unit, at: tile.at, activation: readyActivation() }
          : unit,
      ),
    });
    const pillaged = applyCommandV7(staged, enemy.id, {
      kind: "PILLAGE",
      unitId: enemyUnit.id,
    });
    if (!pillaged.accepted) throw new Error(pillaged.error.code);
    expect(pillaged.events[0]).toMatchObject({
      kind: "IMPROVEMENT_PILLAGED",
      improvement: "MINE",
      resourceRestored: null,
    });
    expect(
      pillaged.state.board.tiles.find((item) => key(item.at) === key(tile.at)),
    ).toMatchObject({ improvement: null, resource: null });
    const reset = checkedV7({
      ...pillaged.state,
      units: pillaged.state.units.map((unit) =>
        unit.id === enemyUnit.id
          ? { ...unit, activation: readyActivation() }
          : unit,
      ),
    });
    expect(
      applyCommandV7(reset, enemy.id, {
        kind: "PILLAGE",
        unitId: enemyUnit.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "PILLAGE_INVALID_TARGET" },
      events: [],
    });
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
    let staged = stageHostileCapture(allTechsV7(initialV7(114)), false);
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
    staged = checkedV7({
      ...staged,
      players: staged.players.map((player) =>
        player.id === target.ownerId
          ? { ...player, researchedTechs: ["GATHERING"] }
          : player,
      ),
    });
    expect(previewCityCapacityV7(staged, target.id)).toMatchObject({
      capacity: 2,
      assigned: 1,
    });
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
  return checkedV7({
    ...state,
    board: state.board,
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
