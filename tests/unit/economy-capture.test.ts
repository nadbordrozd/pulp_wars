import { describe, expect, it } from "vitest";
import {
  applyCommand,
  canonicalHash,
  cityCapacity,
  cityAssignedCountedUnitCount,
  cityAssignedExemptUnitCount,
  cityHasTrainingCapacity,
  cityId,
  citySupportedUnitCount,
  createGame,
  friendlyCityDefenseBonus,
  getRuleset,
  growCity,
  isCityBesieged,
  legalCommands,
  playerIncome,
  technologyCost,
  unitId,
  unitTypeIsUnlocked,
  viewFor,
  wallId,
  type CityState,
  type GameState,
  type PlayerId,
  type PlayerState,
  type UnitState,
} from "../../src/engine/index";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

function activeContext(state: GameState): {
  readonly playerId: PlayerId;
  readonly player: PlayerState;
  readonly city: CityState;
  readonly unit: UnitState;
} {
  const playerId = state.turnOrder[state.activeSeatIndex];
  const player = state.players.find((candidate) => candidate.id === playerId);
  const city = state.cities.find((candidate) => candidate.ownerId === playerId);
  const unit = state.units.find((candidate) => candidate.ownerId === playerId);
  if (
    playerId === undefined ||
    player === undefined ||
    city === undefined ||
    unit === undefined
  ) {
    throw new Error("Missing active fixture context");
  }
  return { playerId, player, city, unit };
}

function replacePlayer(
  state: GameState,
  playerId: PlayerId,
  update: Partial<PlayerState>,
): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, ...update } : player,
    ),
  };
}

function replaceCity(
  state: GameState,
  cityIdToReplace: CityState["id"],
  update: Partial<CityState>,
): GameState {
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.id === cityIdToReplace ? { ...city, ...update } : city,
    ),
  };
}

describe("economy and technology rules", () => {
  it("publishes the exact integer-only POC constants and nine-node graph", () => {
    const rules = getRuleset("pulp-wars-poc-5");
    expect(rules).toMatchObject({
      startingStars: 5,
      technologyBaseCost: 4,
      capitalIncomeBonus: 1,
      workshopIncomeBonus: 1,
      fruitCost: 2,
      fruitPopulation: 1,
      animalCost: 2,
      animalPopulation: 1,
      lumberMillCost: 3,
      lumberMillPopulation: 1,
      mineCost: 5,
      minePopulation: 2,
      resourcesRewardStars: 5,
      surveyRadius: 3,
      captureRevealRadius: 1,
      normalCityDefense: { numerator: 3, denominator: 2 },
      cityWallDefense: { numerator: 4, denominator: 1 },
      cityLevels: [
        { level: 1, populationRequired: 0, rewards: [] },
        {
          level: 2,
          populationRequired: 2,
          rewards: ["WORKSHOP", "SURVEY"],
        },
        {
          level: 3,
          populationRequired: 3,
          rewards: ["RESOURCES", "CITY_WALL"],
        },
      ],
      unitUnlocks: {
        WARRIOR: null,
        ARCHER: "ARCHERY",
        DEFENDER: "STRATEGY",
        RIDER: "RIDING",
        CATAPULT: "MATHEMATICS",
      },
    });
    expect(rules?.technologies).toEqual([
      { id: "CLIMBING", tier: 1, prerequisites: [] },
      { id: "RIDING", tier: 1, prerequisites: [] },
      { id: "HUNTING", tier: 1, prerequisites: [] },
      { id: "ORGANIZATION", tier: 1, prerequisites: [] },
      { id: "MINING", tier: 2, prerequisites: ["CLIMBING"] },
      { id: "FORESTRY", tier: 2, prerequisites: ["HUNTING"] },
      { id: "ARCHERY", tier: 2, prerequisites: ["HUNTING"] },
      { id: "STRATEGY", tier: 2, prerequisites: ["ORGANIZATION"] },
      { id: "MATHEMATICS", tier: 3, prerequisites: ["FORESTRY"] },
    ]);
    expect(Object.isFrozen(rules?.technologies)).toBe(true);
  });

  it("awards first-turn capital income once and previews current next-turn income", () => {
    const created = createGame(setupBuilder());
    if (!created.ok) throw new Error(created.error.code);
    const { playerId, player } = activeContext(created.state);
    expect(player.stars).toBe(7);
    expect(created.events.slice(-2)).toEqual([
      { kind: "TURN_STARTED", playerId, income: 2 },
      {
        kind: "INCOME_AWARDED",
        playerId,
        total: 2,
        cities: [{ cityId: activeContext(created.state).city.id, amount: 2 }],
      },
    ]);
    const researched = applyCommand(created.state, {
      kind: "RESEARCH",
      tech: "CLIMBING",
    });
    if (!researched.ok) throw new Error(researched.error.code);
    expect(
      researched.state.players.find((candidate) => candidate.id === playerId)
        ?.stars,
    ).toBe(2);
    const ended = applyCommand(researched.state, { kind: "END_TURN" });
    if (!ended.ok) throw new Error(ended.error.code);
    expect(ended.events[0]).toMatchObject({
      kind: "INCOME_PREVIEWED",
      playerId,
      total: 2,
    });
  });

  it("applies capital and Workshop income and zeros besieged cities and previews", () => {
    const original = gameStateBuilder(setupBuilder({ seed: 3 }));
    const { playerId, city } = activeContext(original);
    let state = replaceCity(original, city.id, {
      level: 2,
      rewardLevel2: "WORKSHOP",
    });
    expect(playerIncome(state, playerId)).toEqual([
      { cityId: city.id, amount: 4 },
    ]);
    const enemy = state.units.find((unit) => unit.ownerId !== playerId);
    if (enemy === undefined) throw new Error("Missing enemy");
    state = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === enemy.id ? { ...unit, at: city.at } : unit,
      ),
    };
    const besiegedCity = state.cities.find((item) => item.id === city.id);
    if (besiegedCity === undefined) throw new Error("Missing city");
    expect(isCityBesieged(state, besiegedCity)).toBe(true);
    expect(playerIncome(state, playerId)).toEqual([
      { cityId: city.id, amount: 0 },
    ]);
    const ended = applyCommand(state, { kind: "END_TURN" });
    if (!ended.ok) throw new Error(ended.error.code);
    expect(ended.events[0]).toEqual({
      kind: "INCOME_PREVIEWED",
      playerId,
      total: 0,
      cities: [{ cityId: city.id, amount: 0 }],
    });
  });

  it("prices technology by tier and owned cities and enforces prerequisites, stars, and permanence", () => {
    const original = gameStateBuilder();
    const { playerId, player, city } = activeContext(original);
    const extraCity: CityState = {
      ...city,
      id: cityId(100),
      at: { x: 0, y: 0 },
      isCapital: false,
    };
    let state = replacePlayer(
      {
        ...original,
        nextEntityId: 101,
        cities: [...original.cities, extraCity],
      },
      playerId,
      { stars: 20 },
    );
    expect(technologyCost(state, playerId, "RIDING")).toBe(6);
    expect(technologyCost(state, playerId, "MINING")).toBe(8);
    const missing = applyCommand(state, { kind: "RESEARCH", tech: "MINING" });
    expect(missing).toMatchObject({
      ok: false,
      error: { code: "TECH_PREREQUISITE_MISSING" },
    });
    expect(missing.state).toBe(state);
    const climbing = applyCommand(state, {
      kind: "RESEARCH",
      tech: "CLIMBING",
    });
    if (!climbing.ok) throw new Error(climbing.error.code);
    expect(climbing.events).toEqual([
      { kind: "TECH_RESEARCHED", playerId, tech: "CLIMBING", cost: 6 },
    ]);
    expect(
      climbing.state.players.find((candidate) => candidate.id === playerId),
    ).toMatchObject({ stars: 14, researchedTechs: ["CLIMBING"] });
    state = climbing.state;
    const mining = applyCommand(state, { kind: "RESEARCH", tech: "MINING" });
    if (!mining.ok) throw new Error(mining.error.code);
    expect(mining.events).toEqual([
      { kind: "TECH_RESEARCHED", playerId, tech: "MINING", cost: 8 },
    ]);
    const duplicate = applyCommand(mining.state, {
      kind: "RESEARCH",
      tech: "MINING",
    });
    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: "TECH_ALREADY_RESEARCHED" },
    });
    expect(duplicate.state).toBe(mining.state);
    expect(unitTypeIsUnlocked(player, "WARRIOR")).toBe(true);
    expect(unitTypeIsUnlocked(player, "ARCHER")).toBe(false);
  });

  it("builds two mines, resolves growth and mandatory rewards, and preserves locks", () => {
    const original = gameStateBuilder(setupBuilder({ seed: 3 }));
    const { playerId, city } = activeContext(original);
    let state = replacePlayer(original, playerId, {
      stars: 20,
      researchedTechs: ["CLIMBING", "MINING"],
    });
    const ores = state.board.tiles.filter(
      (tile) => tile.territoryCityId === city.id && tile.resource === "ORE",
    );
    expect(ores).toHaveLength(2);
    const firstOre = ores[0];
    if (firstOre === undefined) throw new Error("Missing first ore");
    const first = applyCommand(state, { kind: "BUILD_MINE", at: firstOre.at });
    if (!first.ok) throw new Error(first.error.code);
    state = first.state;
    expect(state.pendingChoice).toEqual({
      kind: "CITY_REWARD",
      cityId: city.id,
      level: 2,
    });
    expect(state.cities.find((item) => item.id === city.id)).toMatchObject({
      level: 2,
      population: 0,
    });
    expect(
      state.board.tiles.find(
        (tile) => tile.at.x === firstOre.at.x && tile.at.y === firstOre.at.y,
      ),
    ).toMatchObject({ resource: null, improvement: "MINE" });
    const locked = applyCommand(state, { kind: "END_TURN" });
    expect(locked).toMatchObject({
      ok: false,
      error: { code: "PENDING_CHOICE" },
    });
    expect(locked.state).toBe(state);
    expect(
      legalCommands(state, playerId).map(({ command }) => command),
    ).toEqual([
      { kind: "CHOOSE_CITY_REWARD", cityId: city.id, reward: "WORKSHOP" },
      { kind: "CHOOSE_CITY_REWARD", cityId: city.id, reward: "SURVEY" },
    ]);
    const workshop = applyCommand(state, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reward: "WORKSHOP",
    });
    if (!workshop.ok) throw new Error(workshop.error.code);
    state = workshop.state;
    const fruit = state.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.resource === "FRUIT",
    );
    if (fruit === undefined) throw new Error("Missing fruit");
    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              researchedTechs: [...player.researchedTechs, "ORGANIZATION"],
            }
          : player,
      ),
    };
    const harvested = applyCommand(state, {
      kind: "HARVEST_FRUIT",
      at: fruit.at,
    });
    if (!harvested.ok) throw new Error(harvested.error.code);
    state = harvested.state;
    const secondOre = ores[1];
    if (secondOre === undefined) throw new Error("Missing second ore");
    const mined = applyCommand(state, { kind: "BUILD_MINE", at: secondOre.at });
    if (!mined.ok) throw new Error(mined.error.code);
    state = mined.state;
    expect(state.cities.find((item) => item.id === city.id)).toMatchObject({
      level: 3,
      population: 0,
      rewardLevel2: "WORKSHOP",
    });
    expect(state.pendingChoice).toEqual({
      kind: "CITY_REWARD",
      cityId: city.id,
      level: 3,
    });
    const resources = applyCommand(state, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reward: "RESOURCES",
    });
    if (!resources.ok) throw new Error(resources.error.code);
    expect(resources.state.pendingChoice).toBeNull();
    expect(
      resources.state.players.find((player) => player.id === playerId)?.stars,
    ).toBe(13);
  });

  it("supports multi-threshold growth, Survey, City Wall, and capacity selectors", () => {
    const state = gameStateBuilder();
    const { playerId, city, unit } = activeContext(state);
    expect(growCity(city, 5)).toMatchObject({
      city: { level: 3, population: 0 },
      reachedLevels: [2, 3],
    });
    expect(cityCapacity(city)).toBe(1);
    expect(citySupportedUnitCount(state, city.id)).toBe(1);
    expect(cityAssignedCountedUnitCount(state, city.id)).toBe(0);
    expect(cityAssignedExemptUnitCount(state, city.id)).toBe(1);
    expect(cityHasTrainingCapacity(state, city)).toBe(true);
    const atCapacity: GameState = {
      ...state,
      units: [
        ...state.units,
        {
          ...unit,
          id: unitId(100),
          homeCityId: city.id,
          at: { x: 0, y: 0 },
          capacityExempt: false,
        },
      ],
    };
    expect(citySupportedUnitCount(atCapacity, city.id)).toBe(2);
    expect(cityAssignedCountedUnitCount(atCapacity, city.id)).toBe(1);
    expect(cityHasTrainingCapacity(atCapacity, city)).toBe(false);
    const walled = replaceCity(state, city.id, {
      level: 3,
      rewardLevel2: "WORKSHOP",
      rewardLevel3: "CITY_WALL",
    });
    expect(friendlyCityDefenseBonus(walled, unit)).toEqual({
      numerator: 4,
      denominator: 1,
    });

    let surveyState = replaceCity(state, city.id, {
      level: 2,
      rewardLevel2: null,
    });
    surveyState = replacePlayer(surveyState, playerId, { explored: [city.at] });
    surveyState = {
      ...surveyState,
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    const survey = applyCommand(surveyState, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reward: "SURVEY",
    });
    if (!survey.ok) throw new Error(survey.error.code);
    expect(
      survey.state.players.find((player) => player.id === playerId)?.explored,
    ).toHaveLength(36);
    expect(survey.events.map((event) => event.kind)).toEqual([
      "CITY_REWARD_CHOSEN",
      "TILES_REVEALED",
    ]);
  });

  it("prevents a besieged city from resolving its pending reward", () => {
    const original = gameStateBuilder();
    const { playerId, city } = activeContext(original);
    const enemy = original.units.find((unit) => unit.ownerId !== playerId);
    if (enemy === undefined) throw new Error("Missing enemy");
    const state: GameState = {
      ...replaceCity(original, city.id, { level: 2 }),
      units: original.units.map((unit) =>
        unit.id === enemy.id ? { ...unit, at: city.at } : unit,
      ),
      pendingChoice: { kind: "CITY_REWARD", cityId: city.id, level: 2 },
    };
    const result = applyCommand(state, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reward: "WORKSHOP",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CITY_BESIEGED" },
    });
    expect(result.state).toBe(state);
    expect(legalCommands(state, playerId)).toEqual([]);
  });

  it("rejects mining in besieged territory before it can create a deadlocked reward", () => {
    const original = gameStateBuilder();
    const { playerId, city, unit } = activeContext(original);
    const enemy = original.units.find(
      (candidate) => candidate.ownerId !== playerId,
    );
    const ore = original.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.resource === "ORE",
    );
    if (enemy === undefined || ore === undefined) {
      throw new Error("Missing siege fixture entities");
    }
    const state = replacePlayer(
      {
        ...original,
        units: original.units.map((candidate) =>
          candidate.id === enemy.id
            ? { ...candidate, at: city.at }
            : candidate.id === unit.id
              ? { ...candidate, at: { x: 0, y: 0 } }
              : candidate,
        ),
      },
      playerId,
      {
        stars: 20,
        researchedTechs: ["CLIMBING", "MINING"],
      },
    );
    const playerBefore = state.players.find((player) => player.id === playerId);
    const cityBefore = state.cities.find(
      (candidate) => candidate.id === city.id,
    );
    const oreBefore = state.board.tiles.find(
      (tile) => tile.at.x === ore.at.x && tile.at.y === ore.at.y,
    );
    const result = applyCommand(state, { kind: "BUILD_MINE", at: ore.at });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CITY_BESIEGED", params: { cityId: city.id } },
    });
    expect(result.state).toBe(state);
    expect(result.state.players.find((player) => player.id === playerId)).toBe(
      playerBefore,
    );
    expect(
      result.state.cities.find((candidate) => candidate.id === city.id),
    ).toBe(cityBefore);
    expect(
      result.state.board.tiles.find(
        (tile) => tile.at.x === ore.at.x && tile.at.y === ore.at.y,
      ),
    ).toBe(oreBefore);
    expect(result.state.pendingChoice).toBeNull();
    expect(
      legalCommands(state, playerId).some(
        ({ command }) =>
          command.kind === "BUILD_MINE" &&
          command.at.x === ore.at.x &&
          command.at.y === ore.at.y,
      ),
    ).toBe(false);
  });

  it("keeps ore visible without Mining while legal enumeration reveals no hidden actions", () => {
    const state = gameStateBuilder();
    const { playerId, player, city } = activeContext(state);
    const ore = state.board.tiles.find(
      (tile) => tile.territoryCityId === city.id && tile.resource === "ORE",
    );
    if (ore === undefined) throw new Error("Missing ore");
    const view = viewFor(state, playerId);
    expect(
      view.board.tiles.find(
        (tile) => tile.at.x === ore.at.x && tile.at.y === ore.at.y,
      ),
    ).toMatchObject({ explored: true, resource: "ORE" });
    expect(
      legalCommands(state, playerId).some(
        ({ command }) => command.kind === "BUILD_MINE",
      ),
    ).toBe(false);
    const hidden = replacePlayer(state, playerId, {
      explored: player.explored.filter(
        (at) => at.x !== ore.at.x || at.y !== ore.at.y,
      ),
      researchedTechs: ["CLIMBING", "MINING"],
      stars: 20,
    });
    expect(
      legalCommands(hidden, playerId).some(
        ({ command }) =>
          command.kind === "BUILD_MINE" &&
          command.at.x === ore.at.x &&
          command.at.y === ore.at.y,
      ),
    ).toBe(false);
  });
});

describe("capture and elimination", () => {
  it("requires next-start eligibility and creates a persistent city and territory", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = activeContext(original);
    const village = original.board.tiles.find(
      (tile) => tile.site === "VILLAGE",
    );
    if (village === undefined) throw new Error("Missing village");
    let state: GameState = {
      ...original,
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: village.at, captureEligible: false }
          : candidate,
      ),
    };
    const early = applyCommand(state, { kind: "CAPTURE", unitId: unit.id });
    expect(early).toMatchObject({
      ok: false,
      error: { code: "CAPTURE_NOT_ELIGIBLE" },
    });
    expect(early.state).toBe(state);
    state = {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, captureEligible: true }
          : candidate,
      ),
    };
    const starsBefore = state.players.find(
      (player) => player.id === playerId,
    )?.stars;
    const captured = applyCommand(state, { kind: "CAPTURE", unitId: unit.id });
    if (!captured.ok) throw new Error(captured.error.code);
    const newCity = captured.state.cities.find(
      (city) => city.at.x === village.at.x && city.at.y === village.at.y,
    );
    expect(newCity).toMatchObject({
      ownerId: playerId,
      level: 1,
      population: 0,
      isCapital: false,
      rewardLevel2: null,
      rewardLevel3: null,
    });
    expect(captured.state.nextEntityId).toBe(state.nextEntityId + 1);
    expect(
      captured.state.board.tiles.filter(
        (tile) => tile.territoryCityId === newCity?.id,
      ),
    ).toHaveLength(9);
    expect(
      captured.state.units.find((candidate) => candidate.id === unit.id),
    ).toMatchObject({
      homeCityId: newCity?.id,
      ready: false,
      captureEligible: false,
      activation: { captured: true },
    });
    expect(
      captured.state.players.find((player) => player.id === playerId)?.stars,
    ).toBe(starsBefore);
    expect(captured.events[0]).toMatchObject({
      kind: "CITY_CAPTURED",
      from: null,
      to: playerId,
    });
  });

  it("preserves captured city state and improvements, rehomes the capturer, and orphans former support", () => {
    const original = gameStateBuilder(setupBuilder({ seed: 3 }));
    const { playerId, unit } = activeContext(original);
    const enemyCity = original.cities.find((city) => city.ownerId !== playerId);
    if (enemyCity === undefined) throw new Error("Missing enemy city");
    const formerOwner = enemyCity.ownerId;
    const extraCity: CityState = {
      ...enemyCity,
      id: cityId(100),
      at: { x: 0, y: 0 },
      isCapital: false,
    };
    const formerUnit = original.units.find(
      (candidate) => candidate.ownerId === formerOwner,
    );
    if (formerUnit === undefined) throw new Error("Missing former unit");
    const orphanCandidate: UnitState = {
      ...formerUnit,
      id: unitId(101),
      at: { x: 0, y: 1 },
      homeCityId: enemyCity.id,
    };
    const mineTile = original.board.tiles.find(
      (tile) =>
        tile.territoryCityId === enemyCity.id && tile.resource === "ORE",
    );
    if (mineTile === undefined) throw new Error("Missing city ore");
    const lumberTile = original.board.tiles.find(
      (tile) =>
        tile.territoryCityId === enemyCity.id &&
        tile.terrain === "FOREST" &&
        (tile.at.x !== mineTile.at.x || tile.at.y !== mineTile.at.y),
    );
    if (lumberTile === undefined) throw new Error("Missing city forest");
    const wallTile = original.board.tiles.find(
      (tile) =>
        tile.territoryCityId === enemyCity.id &&
        tile.site === null &&
        !original.units.some(
          (candidate) =>
            candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
        ) &&
        (tile.at.x !== mineTile.at.x || tile.at.y !== mineTile.at.y) &&
        (tile.at.x !== lumberTile.at.x || tile.at.y !== lumberTile.at.y),
    );
    if (wallTile === undefined) throw new Error("Missing captured wall tile");
    let state: GameState = {
      ...replaceCity(original, enemyCity.id, {
        level: 3,
        population: 2,
        rewardLevel2: "WORKSHOP",
        rewardLevel3: "CITY_WALL",
      }),
      cities: [
        ...replaceCity(original, enemyCity.id, {
          level: 3,
          population: 2,
          rewardLevel2: "WORKSHOP",
          rewardLevel3: "CITY_WALL",
        }).cities,
        extraCity,
      ],
      board: {
        ...original.board,
        tiles: original.board.tiles.map((tile) => {
          if (tile.at.x === mineTile.at.x && tile.at.y === mineTile.at.y) {
            return { ...tile, resource: null, improvement: "MINE" as const };
          }
          if (tile.at.x === lumberTile.at.x && tile.at.y === lumberTile.at.y) {
            return {
              ...tile,
              resource: null,
              improvement: "LUMBER_MILL" as const,
            };
          }
          return tile;
        }),
      },
      units: [
        ...original.units.map((candidate) =>
          candidate.id === unit.id
            ? {
                ...candidate,
                at: enemyCity.at,
                captureEligible: true,
              }
            : candidate.ownerId === formerOwner
              ? { ...candidate, at: { x: 0, y: 2 } }
              : candidate,
        ),
        orphanCandidate,
      ],
      chocolateWalls: [
        {
          id: wallId(102),
          ownerId: formerOwner,
          at: wallTile.at,
          hp: 10,
        },
      ],
      nextEntityId: 103,
    };
    const cityBeforeCapture = state.cities.find(
      (city) => city.id === enemyCity.id,
    );
    if (cityBeforeCapture === undefined) throw new Error("Missing enemy city");
    expect(isCityBesieged(state, cityBeforeCapture)).toBe(true);
    const result = applyCommand(state, { kind: "CAPTURE", unitId: unit.id });
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    expect(state.cities.find((city) => city.id === enemyCity.id)).toMatchObject(
      {
        ownerId: playerId,
        level: 3,
        population: 2,
        isCapital: true,
        rewardLevel2: "WORKSHOP",
        rewardLevel3: "CITY_WALL",
      },
    );
    expect(
      state.board.tiles.find(
        (tile) => tile.at.x === mineTile.at.x && tile.at.y === mineTile.at.y,
      ),
    ).toMatchObject({
      improvement: "MINE",
      resource: null,
      territoryCityId: enemyCity.id,
    });
    expect(
      state.board.tiles.find(
        (tile) =>
          tile.at.x === lumberTile.at.x && tile.at.y === lumberTile.at.y,
      ),
    ).toMatchObject({
      improvement: "LUMBER_MILL",
      resource: null,
      territoryCityId: enemyCity.id,
    });
    expect(
      state.units.find((candidate) => candidate.id === unit.id),
    ).toMatchObject({
      homeCityId: enemyCity.id,
      capacityExempt: unit.capacityExempt,
    });
    expect(
      state.units.find((candidate) => candidate.id === orphanCandidate.id),
    ).toMatchObject({
      ownerId: formerOwner,
      homeCityId: null,
      capacityExempt: orphanCandidate.capacityExempt,
    });
    expect(
      state.players.find((player) => player.id === formerOwner)?.status,
    ).toBe("ACTIVE");
    expect(state.chocolateWalls).toEqual([
      {
        id: wallId(102),
        ownerId: formerOwner,
        at: wallTile.at,
        hp: 10,
      },
    ]);
    const cityAfterCapture = state.cities.find(
      (city) => city.id === enemyCity.id,
    );
    if (cityAfterCapture === undefined)
      throw new Error("Missing captured city");
    expect(isCityBesieged(state, cityAfterCapture)).toBe(false);
    expect(state.outcome).toBeNull();
  });

  it("eliminates the last-city owner, removes units in ID order, and produces exact human outcomes", () => {
    const original = gameStateBuilder();
    const human = original.players.find(
      (player) => player.controller === "HUMAN",
    );
    const ai = original.players.find((player) => player.controller === "AI");
    if (human === undefined || ai === undefined)
      throw new Error("Missing seats");
    const humanCity = original.cities.find((city) => city.ownerId === human.id);
    const aiUnit = original.units.find((unit) => unit.ownerId === ai.id);
    if (humanCity === undefined || aiUnit === undefined)
      throw new Error("Missing entities");
    const originalHumanUnit = original.units.find(
      (unit) => unit.ownerId === human.id,
    );
    if (originalHumanUnit === undefined) throw new Error("Missing human unit");
    const extraHumanUnit: UnitState = {
      ...originalHumanUnit,
      id: unitId(100),
      at: { x: 0, y: 0 },
    };
    const wallTile = original.board.tiles.find(
      (tile) =>
        tile.territoryCityId === humanCity.id &&
        tile.site === null &&
        !original.units.some(
          (candidate) =>
            candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
        ) &&
        !(tile.at.x === 0 && tile.at.y === 0) &&
        !(tile.at.x === 0 && tile.at.y === 1),
    );
    if (wallTile === undefined) throw new Error("Missing eliminated wall tile");
    const aiSeat = original.turnOrder.indexOf(ai.id);
    const state: GameState = {
      ...original,
      nextEntityId: 102,
      activeSeatIndex: aiSeat,
      units: [
        extraHumanUnit,
        ...original.units.map((unit) =>
          unit.id === aiUnit.id
            ? { ...unit, at: humanCity.at, captureEligible: true }
            : unit.ownerId === human.id
              ? { ...unit, at: { x: 0, y: 1 } }
              : unit,
        ),
      ],
      chocolateWalls: [
        {
          id: wallId(101),
          ownerId: human.id,
          at: wallTile.at,
          hp: 10,
        },
      ],
    };
    const result = applyCommand(state, { kind: "CAPTURE", unitId: aiUnit.id });
    if (!result.ok) throw new Error(result.error.code);
    expect(
      result.state.players.find((player) => player.id === human.id)?.status,
    ).toBe("ELIMINATED");
    expect(result.state.units.some((unit) => unit.ownerId === human.id)).toBe(
      false,
    );
    expect(result.state.chocolateWalls).toEqual([
      {
        id: wallId(101),
        ownerId: human.id,
        at: wallTile.at,
        hp: 10,
      },
    ]);
    const deathIds = result.events
      .filter((event) => event.kind === "UNIT_DIED")
      .map((event) => event.unitId);
    expect(deathIds).toEqual([...deathIds].sort((left, right) => left - right));
    expect(result.state.outcome).toEqual({
      kind: "DEFEAT",
      humanId: human.id,
      defeatedByPlayerId: ai.id,
    });
    expect(result.events.at(-1)).toEqual({
      kind: "MATCH_ENDED",
      outcome: result.state.outcome,
    });
  });

  it("reports Victory when the human captures the final rival city", () => {
    const original = gameStateBuilder();
    const human = original.players.find(
      (player) => player.controller === "HUMAN",
    );
    const ai = original.players.find((player) => player.controller === "AI");
    if (human === undefined || ai === undefined)
      throw new Error("Missing seats");
    const target = original.cities.find((city) => city.ownerId === ai.id);
    const unit = original.units.find(
      (candidate) => candidate.ownerId === human.id,
    );
    if (target === undefined || unit === undefined)
      throw new Error("Missing entities");
    const state: GameState = {
      ...original,
      activeSeatIndex: original.turnOrder.indexOf(human.id),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: target.at, captureEligible: true }
          : candidate.ownerId === ai.id
            ? { ...candidate, at: { x: 0, y: 0 } }
            : candidate,
      ),
    };
    const result = applyCommand(state, { kind: "CAPTURE", unitId: unit.id });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.outcome).toEqual({
      kind: "VICTORY",
      winnerId: human.id,
    });
  });

  it("uses the headless winner outcome when no seat is human", () => {
    const original = gameStateBuilder();
    const { playerId, unit } = activeContext(original);
    const target = original.cities.find((city) => city.ownerId !== playerId);
    if (target === undefined) throw new Error("Missing target");
    const state: GameState = {
      ...original,
      players: original.players.map((player) => ({
        ...player,
        controller: "AI",
      })),
      units: original.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: target.at, captureEligible: true }
          : candidate.ownerId === target.ownerId
            ? { ...candidate, at: { x: 0, y: 0 } }
            : candidate,
      ),
    };
    const result = applyCommand(state, { kind: "CAPTURE", unitId: unit.id });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.outcome).toEqual({
      kind: "HEADLESS_VICTORY",
      winnerId: playerId,
    });
  });

  it("enumerates only commands accepted by the shared predicates and rejects atomically", () => {
    const state = gameStateBuilder();
    const { playerId } = activeContext(state);
    for (const summary of legalCommands(state, playerId)) {
      expect(applyCommand(state, summary.command).ok).toBe(true);
    }
    const randomBefore = state.random;
    const invalid = applyCommand(state, { kind: "RESEARCH", tech: "MINING" });
    expect(invalid.ok).toBe(false);
    expect(invalid.state).toBe(state);
    expect(invalid.state.random).toBe(randomBefore);
    expect(invalid.state.commandIndex).toBe(state.commandIndex);
    expect("events" in invalid).toBe(false);
    const first = legalCommands(state, playerId);
    const second = legalCommands(state, playerId);
    expect(first).toEqual(second);
    expect(canonicalHash(state)).toBe(canonicalHash(state));
  });
});
