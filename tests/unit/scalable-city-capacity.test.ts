import { describe, expect, it } from "vitest";
import {
  DEMO_MATCH_SETUP,
  appendReplayCommand,
  applyCommand,
  canonicalHash,
  cityAssignedCountedUnitCount,
  cityAssignedExemptUnitCount,
  cityHasTrainingCapacity,
  createGame,
  createReplay,
  growCity,
  queryPlayerCommands,
  unitId,
  viewFor,
  type CityState,
  type Command,
  type GameState,
  type PlayerId,
} from "../../src/engine/index";
import { createSaveEnvelope, parseSave } from "../../src/persistence/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

function activeContext(state: GameState): {
  readonly playerId: PlayerId;
  readonly city: CityState;
} {
  const playerId = state.turnOrder[state.activeSeatIndex];
  const city = state.cities.find((candidate) => candidate.ownerId === playerId);
  if (playerId === undefined || city === undefined)
    throw new Error("Missing active city fixture");
  return { playerId, city };
}

function replaceCity(
  state: GameState,
  cityId: CityState["id"],
  patch: Partial<CityState>,
): GameState {
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.id === cityId ? { ...city, ...patch } : city,
    ),
  };
}

describe("uncapped city progression", () => {
  it("uses current level plus one repeatedly and emits only reached reward levels", () => {
    const state = gameStateBuilder();
    const { city } = activeContext(state);
    const developed: CityState = {
      ...city,
      level: 3,
      population: 3,
      rewardLevel2: "WORKSHOP",
      rewardLevel3: "CITY_WALL",
    };
    expect(growCity(developed, 9)).toEqual({
      city: { ...developed, level: 5, population: 3 },
      reachedLevels: [4, 5],
    });
    expect(growCity({ ...developed, level: 4, population: 4 }, 1)).toEqual({
      city: { ...developed, level: 5, population: 0 },
      reachedLevels: [5],
    });
  });

  it("harvests through level 4 without a max-level rejection or new reward", () => {
    const original = gameStateBuilder();
    const { playerId, city } = activeContext(original);
    const fruit = original.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.resource === "FRUIT",
    );
    if (fruit === undefined) throw new Error("Missing city fruit");
    const state = {
      ...replaceCity(original, city.id, {
        level: 3,
        population: 3,
        rewardLevel2: "WORKSHOP",
        rewardLevel3: "CITY_WALL",
      }),
      players: original.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              stars: 20,
              researchedTechs: ["ORGANIZATION" as const],
            }
          : player,
      ),
    };
    const result = applyCommand(state, {
      kind: "HARVEST_FRUIT",
      at: fruit.at,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(
      result.state.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({ level: 4, population: 0 });
    expect(result.state.pendingChoice).toBeNull();
    expect(result.events.map((event) => event.kind)).toEqual([
      "FRUIT_HARVESTED",
      "CITY_LEVELED_UP",
    ]);
    expect(result.events[1]).toEqual({
      kind: "CITY_LEVELED_UP",
      cityId: city.id,
      level: 4,
    });
  });

  it("rejects safe-integer overflow atomically without spending or consuming", () => {
    const original = gameStateBuilder();
    const { playerId, city } = activeContext(original);
    const fruit = original.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.resource === "FRUIT",
    );
    if (fruit === undefined) throw new Error("Missing city fruit");
    const state = {
      ...replaceCity(original, city.id, {
        level: Number.MAX_SAFE_INTEGER,
        population: 0,
        rewardLevel2: null,
        rewardLevel3: null,
      }),
      players: original.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              stars: 20,
              researchedTechs: ["ORGANIZATION" as const],
            }
          : player,
      ),
    };
    const before = canonicalHash(state);
    const result = applyCommand(state, {
      kind: "HARVEST_FRUIT",
      at: fruit.at,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INTEGER_OVERFLOW", params: { cityId: city.id } },
    });
    if (result.ok) throw new Error("Expected overflow rejection");
    expect(result.state).toBe(state);
    expect(canonicalHash(result.state)).toBe(before);
    expect(
      result.state.board.tiles.find(
        (tile) => tile.at.x === fruit.at.x && tile.at.y === fruit.at.y,
      )?.resource,
    ).toBe("FRUIT");
  });

  it("rejects an overflowing next Start Turn income before mutating End Turn", () => {
    const original = gameStateBuilder();
    const nextIndex =
      (original.activeSeatIndex + 1) % original.turnOrder.length;
    const nextId = original.turnOrder[nextIndex];
    const nextCity = original.cities.find((city) => city.ownerId === nextId);
    if (nextId === undefined || nextCity === undefined)
      throw new Error("Missing next-turn income fixture");
    const state: GameState = {
      ...replaceCity(original, nextCity.id, {
        level: Number.MAX_SAFE_INTEGER - 1,
        population: 0,
      }),
      players: original.players.map((player) =>
        player.id === nextId ? { ...player, stars: 1 } : player,
      ),
    };
    const before = canonicalHash(state);
    const result = applyCommand(state, { kind: "END_TURN" });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INTEGER_OVERFLOW", params: { playerId: nextId } },
    });
    if (result.ok) throw new Error("Expected income overflow rejection");
    expect(result.state).toBe(state);
    expect(canonicalHash(result.state)).toBe(before);
  });
});

describe("assigned training capacity", () => {
  it("marks every ordinary founder exempt and allows one counted level-1 trainee", () => {
    const original = gameStateBuilder();
    expect(original.units.every((unit) => unit.capacityExempt)).toBe(true);
    const { playerId, city } = activeContext(original);
    const founder = original.units.find(
      (unit) => unit.ownerId === playerId && unit.homeCityId === city.id,
    );
    if (founder === undefined) throw new Error("Missing founder");
    const state: GameState = {
      ...original,
      units: original.units.map((unit) =>
        unit.id === founder.id
          ? { ...unit, at: { x: city.at.x + 1, y: city.at.y } }
          : unit,
      ),
    };
    expect(cityAssignedCountedUnitCount(state, city.id)).toBe(0);
    expect(cityAssignedExemptUnitCount(state, city.id)).toBe(1);
    expect(cityHasTrainingCapacity(state, city)).toBe(true);
    const trained = applyCommand(state, {
      kind: "TRAIN",
      cityId: city.id,
      unit: "WARRIOR",
    });
    if (!trained.ok) throw new Error(trained.error.code);
    expect(trained.state.units.at(-1)).toMatchObject({
      homeCityId: city.id,
      capacityExempt: false,
      ready: false,
      activation: { handled: true },
    });
    expect(cityAssignedCountedUnitCount(trained.state, city.id)).toBe(1);
    expect(cityAssignedExemptUnitCount(trained.state, city.id)).toBe(1);
    expect(cityHasTrainingCapacity(trained.state, city)).toBe(false);

    const vacated: GameState = {
      ...trained.state,
      units: trained.state.units.map((unit) =>
        unit.id === trained.state.units.at(-1)?.id
          ? { ...unit, at: { x: city.at.x, y: city.at.y + 1 } }
          : unit,
      ),
    };
    const blocked = applyCommand(vacated, {
      kind: "TRAIN",
      cityId: city.id,
      unit: "WARRIOR",
    });
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
  });

  it("preserves legal equality and over-capacity states without destroying units", () => {
    const original = gameStateBuilder();
    const { playerId, city } = activeContext(original);
    const founder = original.units.find((unit) => unit.ownerId === playerId);
    if (founder === undefined) throw new Error("Missing founder");
    const counted = [unitId(200), unitId(201)].map((id, index) => ({
      ...founder,
      id,
      at: { x: city.at.x + index + 1, y: city.at.y + 1 },
      capacityExempt: false,
    }));
    const over: GameState = {
      ...original,
      nextEntityId: 202,
      units: [...original.units, ...counted],
    };
    expect(cityAssignedCountedUnitCount(over, city.id)).toBe(2);
    expect(cityHasTrainingCapacity(over, city)).toBe(false);
    const ended = applyCommand(over, { kind: "END_TURN" });
    expect(ended.ok).toBe(true);
    if (!ended.ok) throw new Error(ended.error.code);
    expect(ended.state.units).toHaveLength(over.units.length);
  });

  it("projects exact owned counts, redacts rivals, and preserves Demo 3+1 / 4+0", () => {
    const created = createGame(DEMO_MATCH_SETUP);
    if (!created.ok) throw new Error(created.error.code);
    const humanView = viewFor(created.state, created.state.humanPlayerId);
    const humanCities = humanView.cities.filter(
      (city) => city.ownerId === humanView.viewer.id,
    );
    expect(
      humanCities.map((city) => [
        city.id,
        city.assignedCounted,
        city.assignedExempt,
      ]),
    ).toEqual([
      [1, 3, 1],
      [7, 4, 0],
    ]);
    expect(
      humanView.cities
        .filter((city) => city.ownerId !== humanView.viewer.id)
        .every(
          (city) =>
            city.assignedCounted === undefined &&
            city.assignedExempt === undefined,
        ),
    ).toBe(true);
    expect(
      humanView.units
        .filter((unit) => unit.ownerId === humanView.viewer.id)
        .every((unit) => typeof unit.capacityExempt === "boolean"),
    ).toBe(true);
    expect(
      humanView.units
        .filter((unit) => unit.ownerId !== humanView.viewer.id)
        .every((unit) => !("capacityExempt" in unit)),
    ).toBe(true);
    const unoccupied: GameState = {
      ...created.state,
      units: created.state.units.map((unit) =>
        humanCities.some(
          (city) =>
            city.id === unit.homeCityId &&
            city.at.x === unit.at.x &&
            city.at.y === unit.at.y,
        )
          ? { ...unit, at: { x: 24, y: 24 } }
          : unit,
      ),
    };
    const trainCities = queryPlayerCommands(
      viewFor(unoccupied, unoccupied.humanPlayerId),
    )
      .map(({ command }) => command)
      .filter(
        (command): command is Extract<Command, { readonly kind: "TRAIN" }> =>
          command.kind === "TRAIN",
      )
      .map((command) => command.cityId);
    expect(trainCities).not.toContain(1);
    expect(trainCities).not.toContain(7);
  });

  it("round-trips a trained non-exempt assignment through replay and save", () => {
    const setup = setupBuilder({ seed: 0x6173 });
    const created = createGame(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplay(setup);
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("Missing active player");
    const city = state.cities.find((candidate) => candidate.ownerId === actor);
    const founder = state.units.find(
      (candidate) => candidate.ownerId === actor,
    );
    if (city === undefined || founder === undefined)
      throw new Error("Missing training context");
    const move = queryPlayerCommands(viewFor(state, actor))
      .map(({ command }) => command)
      .find(
        (command): command is Extract<Command, { readonly kind: "MOVE" }> =>
          command.kind === "MOVE" && command.unitId === founder.id,
      );
    if (move === undefined) throw new Error("Missing founder move");
    const moved = applyCommand(state, move);
    if (!moved.ok) throw new Error(moved.error.code);
    state = moved.state;
    replay = appendReplayCommand(replay, move, state);
    const train: Command = { kind: "TRAIN", cityId: city.id, unit: "WARRIOR" };
    const trained = applyCommand(state, train);
    if (!trained.ok) throw new Error(trained.error.code);
    state = trained.state;
    replay = appendReplayCommand(replay, train, state);
    const trainedUnit = state.units.at(-1);
    expect(trainedUnit).toMatchObject({
      homeCityId: city.id,
      capacityExempt: false,
    });
    const envelope = createSaveEnvelope(
      {
        state,
        replay,
        tallies: { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 },
        playerTallies: state.players.map((player) => ({
          playerId: player.id,
          kills: 0,
          losses: 0,
          citiesCaptured: 0,
        })),
      },
      "2026-08-15T20:00:00.000Z",
    );
    const loaded = parseSave(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID")
      throw new Error("Expected the v5 save to load.");
    expect(loaded.save.state.units.at(-1)).toEqual(trainedUnit);
    expect(loaded.save.stateHash).toBe(canonicalHash(state));

    const withoutCapacityExemption = JSON.stringify(envelope).replace(
      '"capacityExempt":true,',
      "",
    );
    expect(withoutCapacityExemption).not.toBe(JSON.stringify(envelope));
    expect(parseSave(withoutCapacityExemption)).toMatchObject({
      kind: "CORRUPT",
    });
  });
});
