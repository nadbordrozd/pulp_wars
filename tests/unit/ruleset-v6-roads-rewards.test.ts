import { describe, expect, it } from "vitest";
import {
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  appendReplayCommandV6,
  applyCommandV6,
  canonicalHash,
  cityFootprintContainsV6,
  createInitialMapStateV6,
  createReplayV6,
  growthSpentV6,
  isCapitalConnectedRoadV6,
  parseEventV6,
  parseGameStateV6,
  playerIncomeV6,
  previewEconomicV6,
  queryPlayerCommandsV6,
  resolveCityGrowthV6,
  spatialContributionAtV6,
  validateMovementPathV6,
  viewForV6,
  type CityStateV6,
  type CoordV6,
  type EconomicImprovementId,
  type GameStateV6,
  type MatchSetupV6,
  type PopulationContributionV6,
  type RewardIdV6,
  type TileStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 701,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

describe("ruleset-6 Roads, redevelopment, forest, and rewards", () => {
  it.each([
    ["CLEAR_FOREST", "FORESTRY", "FOREST_ACTION_INVALID_TILE"],
    ["REPLANT_FOREST", "FIELDCRAFT", "FOREST_ACTION_INVALID_TILE"],
    ["BUILD_ROAD", "ROADS", "INVALID_TILE"],
    ["REDEVELOP", "GRAND_WORKS", "REDEVELOP_INVALID_TARGET"],
  ] as const)(
    "%s uses tile, exploration, technology, public target, and ownership precedence atomically",
    (kind, technology, invalidCode) => {
      const state = baseState();
      const actor = state.humanPlayerId;
      const city = ownCity(state);
      const at = { x: city.at.x + 1, y: city.at.y };
      expectRejected(
        applyCommandV6(state, actor, { kind, at: { x: -1, y: -1 } }),
        state,
        "TILE_NOT_FOUND",
      );
      const hidden = withPlayer(state, { explored: [city.at] });
      expectRejected(
        applyCommandV6(hidden, actor, { kind, at }),
        hidden,
        "TILE_UNEXPLORED",
      );
      const locked = withPlayer(state, {
        researchedTechs:
          technology === "FORESTRY"
            ? ["GATHERING", "HUNTING"]
            : technology === "FIELDCRAFT"
              ? ["GATHERING", "HUNTING", "MARKSMANSHIP"]
              : technology === "ROADS"
                ? ["GATHERING", "SCOUTING"]
                : ["GATHERING", "CRAFT"],
      });
      expectRejected(
        applyCommandV6(locked, actor, { kind, at }),
        locked,
        "TECH_REQUIRED",
      );
      const invalidState =
        kind === "BUILD_ROAD" ? replaceTile(state, at, { road: true }) : state;
      expectRejected(
        applyCommandV6(invalidState, actor, { kind, at }),
        invalidState,
        invalidCode,
      );
    },
  );

  it("clears and replants exact empty terrain, retains Roads, and applies exact Coins", () => {
    let state = baseState();
    const city = ownCity(state);
    const at = { x: city.at.x + 1, y: city.at.y };
    state = replaceTile(state, at, {
      terrain: "FOREST",
      resource: null,
      improvement: null,
      site: null,
      road: true,
      territoryCityId: city.id,
    });
    const cleared = applyCommandV6(state, state.humanPlayerId, {
      kind: "CLEAR_FOREST",
      at,
    });
    expect(cleared.accepted).toBe(true);
    if (!cleared.accepted) return;
    expect(tileAt(cleared.state, at)).toMatchObject({
      terrain: "GRASS",
      road: true,
      resource: null,
      improvement: null,
    });
    expect(ownPlayer(cleared.state).coins).toBe(101);
    expect(cleared.events).toEqual([
      {
        kind: "FOREST_CLEARED",
        playerId: state.humanPlayerId,
        cityId: city.id,
        at,
        coinDelta: 1,
      },
    ]);
    const replanted = applyCommandV6(
      withPlayer(cleared.state, { coins: 100 }),
      state.humanPlayerId,
      { kind: "REPLANT_FOREST", at },
    );
    expect(replanted.accepted).toBe(true);
    if (!replanted.accepted) return;
    expect(tileAt(replanted.state, at)).toMatchObject({
      terrain: "FOREST",
      road: true,
    });
    expect(ownPlayer(replanted.state).coins).toBe(96);
    expect(replanted.events[0]).toMatchObject({
      kind: "FOREST_REPLANTED",
      coinDelta: 0,
    });
  });

  it("builds a coexisting Road, connects a Market live, and recomputes exact income", () => {
    let state = marketState();
    const city = ownCity(state);
    const roadAt = { x: city.at.x + 1, y: city.at.y };
    state = replaceTile(state, roadAt, {
      terrain: "GRASS",
      resource: "FRUIT",
      improvement: null,
      road: false,
      site: null,
      territoryCityId: city.id,
    });
    const marketAt = { x: city.at.x, y: city.at.y + 1 };
    expect(spatialContributionAtV6(state, marketAt, "MARKET")).toMatchObject({
      marketIncome: 2,
      capitalRoadConnected: false,
    });
    const preview = previewEconomicV6(viewForV6(state, state.humanPlayerId), {
      kind: "BUILD_ROAD",
      at: roadAt,
    });
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        cost: 2,
        capitalRoadConnected: true,
        coinIncomeDeltaByCity: [{ cityId: city.id, delta: 1 }],
      },
    });
    const beforeIncome = playerIncomeV6(state, state.humanPlayerId).totalCoins;
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "BUILD_ROAD",
      at: roadAt,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(tileAt(result.state, roadAt)).toMatchObject({
      resource: "FRUIT",
      road: true,
    });
    expect(
      isCapitalConnectedRoadV6(result.state, roadAt, state.humanPlayerId),
    ).toBe(true);
    expect(
      spatialContributionAtV6(result.state, marketAt, "MARKET"),
    ).toMatchObject({
      marketIncome: 3,
      capitalRoadConnected: true,
    });
    expect(playerIncomeV6(result.state, state.humanPlayerId).totalCoins).toBe(
      beforeIncome + 1,
    );
    expect(result.events.map((event) => event.kind)).toEqual([
      "ROAD_BUILT",
      "CITY_ECONOMY_CHANGED",
    ]);
  });

  it("uses only capital-connected orthogonal half-steps and preserves terrain termination", () => {
    let state = baseState();
    const city = ownCity(state);
    const unit = state.units.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    if (unit === undefined) throw new Error("missing unit");
    const first = { x: city.at.x + 1, y: city.at.y };
    const second = { x: city.at.x + 2, y: city.at.y };
    state = checked({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, first) || same(tile.at, second)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                site: null,
                road: true,
                territoryCityId: city.id,
              }
            : tile,
        ),
      },
      units: state.units.map((candidate) =>
        candidate.id === unit.id ? { ...candidate, at: city.at } : candidate,
      ),
    });
    expect(
      validateMovementPathV6(state, unitAt(state, unit.id), [first, second]),
    ).toMatchObject({
      legal: true,
      spentPoints2: 2,
      destination: second,
    });
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toContainEqual({
      kind: "MOVE",
      unitId: unit.id,
      path: [first, second],
    });
    const diagonal = { x: city.at.x + 1, y: city.at.y + 1 };
    state = replaceTile(state, diagonal, {
      road: true,
      site: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
      territoryCityId: city.id,
    });
    expect(
      validateMovementPathV6(state, unitAt(state, unit.id), [diagonal]),
    ).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    state = replaceTile(state, first, { terrain: "FOREST" });
    expect(
      validateMovementPathV6(state, unitAt(state, unit.id), [first, second]),
    ).toEqual({
      legal: false,
      reason: "FOREST_STOPS_MOVE",
    });
    const moved = applyCommandV6(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: unit.id,
      path: [first],
    });
    expect(moved.accepted).toBe(true);
    if (!moved.accepted) return;
    expect(moved.events[0]).toEqual({
      kind: "UNIT_MOVED",
      unitId: unit.id,
      path: [first],
    });
    expect(unitAt(moved.state, unit.id).activation).toMatchObject({
      moved: true,
      handled: true,
    });
    expect(moved.state.random).toEqual(state.random);
  });

  it.each(["OCCUPIED", "SURVEYING_REQUIRED"] as const)(
    "accepts a blind %s interruption without emitting an empty Move fact",
    (reason) => {
      let state = baseState();
      const city = ownCity(state);
      const unit = state.units.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      );
      const enemy = state.units.find(
        (candidate) => candidate.ownerId !== state.humanPlayerId,
      );
      if (unit === undefined || enemy === undefined) {
        throw new Error("missing blind movement fixture");
      }
      const target = { x: city.at.x + 1, y: city.at.y };
      state = checked({
        ...state,
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            same(tile.at, target)
              ? {
                  ...tile,
                  terrain:
                    reason === "SURVEYING_REQUIRED"
                      ? ("MOUNTAIN" as const)
                      : ("GRASS" as const),
                  resource: null,
                  improvement: null,
                  site: null,
                  territoryCityId: city.id,
                }
              : tile,
          ),
        },
        players: state.players.map((player) =>
          player.id === state.humanPlayerId
            ? {
                ...player,
                researchedTechs:
                  reason === "SURVEYING_REQUIRED"
                    ? (["GATHERING"] as const)
                    : player.researchedTechs,
                explored: [city.at],
              }
            : player,
        ),
        units: state.units.map((candidate) =>
          candidate.id === unit.id
            ? { ...candidate, at: city.at }
            : candidate.id === enemy.id && reason === "OCCUPIED"
              ? { ...candidate, at: target }
              : candidate,
        ),
      });
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "MOVE",
        unitId: unit.id,
        path: [target],
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(result.events.map((event) => event.kind)).toEqual([
        "UNIT_MOVE_INTERRUPTED",
        "TILES_REVEALED",
      ]);
      expect(result.events[0]).toMatchObject({ reason, at: target });
      expect(unitAt(result.state, unit.id)).toMatchObject({
        at: city.at,
        activation: { moved: true, handled: true, movedPathLength: 0 },
      });
      expect(result.state.random).toEqual(state.random);
    },
  );

  it("accepts newly revealed hostile ZOC as a truncated Move with retained event order", () => {
    let state = baseState();
    const city = ownCity(state);
    const unit = state.units.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    const enemy = state.units.find(
      (candidate) => candidate.ownerId !== state.humanPlayerId,
    );
    if (unit === undefined || enemy === undefined) {
      throw new Error("missing ZOC fixture");
    }
    const first = { x: city.at.x + 1, y: city.at.y };
    const second = { x: city.at.x + 2, y: city.at.y };
    const hiddenEnemy = { x: first.x, y: first.y - 1 };
    state = checked({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, first) || same(tile.at, second)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: false,
                site: null,
                territoryCityId: city.id,
              }
            : tile,
        ),
      },
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              explored: [city.at, first, second].sort(
                (left, right) => left.y - right.y || left.x - right.x,
              ),
            }
          : player,
      ),
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: city.at }
          : candidate.id === enemy.id
            ? { ...candidate, at: hiddenEnemy }
            : candidate,
      ),
    });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: unit.id,
      path: [first, second],
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNIT_MOVED",
      "UNIT_MOVE_INTERRUPTED",
      "TILES_REVEALED",
    ]);
    expect(result.events[0]).toEqual({
      kind: "UNIT_MOVED",
      unitId: unit.id,
      path: [first],
    });
    expect(result.events[1]).toMatchObject({
      kind: "UNIT_MOVE_INTERRUPTED",
      at: first,
      reason: "ZOC",
    });
    expect(unitAt(result.state, unit.id)).toMatchObject({
      at: first,
      activation: { moved: true, movedPathLength: 1, handled: true },
    });
  });

  it("keeps disconnected Road components offline and transfers Roads with captured territory", () => {
    let state = baseState();
    const city = ownCity(state);
    const remote = { x: city.at.x + 2, y: city.at.y + 2 };
    state = replaceTile(state, remote, {
      road: true,
      site: null,
      territoryCityId: city.id,
    });
    expect(isCapitalConnectedRoadV6(state, remote, state.humanPlayerId)).toBe(
      false,
    );

    const enemy = state.cities.find(
      (candidate) => candidate.ownerId !== state.humanPlayerId,
    );
    const captor = state.units.find(
      (candidate) => candidate.ownerId === state.humanPlayerId,
    );
    const defender = state.units.find(
      (candidate) => candidate.ownerId === enemy?.ownerId,
    );
    if (enemy === undefined || captor === undefined || defender === undefined) {
      throw new Error("missing capture fixture");
    }
    const transferredRoad = state.board.tiles.find(
      (tile) => tile.territoryCityId === enemy.id && !same(tile.at, enemy.at),
    );
    if (transferredRoad === undefined) throw new Error("missing road tile");
    state = checked({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          same(tile.at, transferredRoad.at) ? { ...tile, road: true } : tile,
        ),
      },
      units: state.units.map((unit) =>
        unit.id === captor.id
          ? { ...unit, at: enemy.at, captureEligible: true }
          : unit.id === defender.id
            ? { ...unit, at: transferredRoad.at }
            : unit,
      ),
    });
    const captured = applyCommandV6(state, state.humanPlayerId, {
      kind: "CAPTURE",
      unitId: captor.id,
    });
    expect(captured.accepted).toBe(true);
    if (!captured.accepted) return;
    expect(tileAt(captured.state, transferredRoad.at)).toMatchObject({
      road: true,
      territoryCityId: enemy.id,
    });
    expect(
      captured.state.cities.find((candidate) => candidate.id === enemy.id)
        ?.ownerId,
    ).toBe(state.humanPlayerId);
  });

  it("Redevelop removes the exact live identity without refund or resource resurrection and can make progress negative", () => {
    let state = marketState();
    const city = ownCity(state);
    const farmAt = { x: city.at.x - 1, y: city.at.y + 1 };
    const leveled: CityStateV6 = {
      ...city,
      level: 5,
      permanentPopulation: 0,
      economicPopulation: 4,
      population: -10,
      expanded: true,
      rewards: [
        { reachedLevel: 2, reward: "SURVEY" },
        { reachedLevel: 3, reward: "WALLS" },
        { reachedLevel: 4, reward: "EXPAND" },
        { reachedLevel: 5, reward: "TREASURY" },
      ],
    };
    state = checked({
      ...state,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id ? leveled : candidate,
      ),
    });
    const beforeCoins = ownPlayer(state).coins;
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "REDEVELOP",
      at: farmAt,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(tileAt(result.state, farmAt)).toMatchObject({
      resource: null,
      improvement: null,
    });
    expect(ownPlayer(result.state).coins).toBe(beforeCoins);
    const after = ownCity(result.state);
    expect(after).toMatchObject({
      level: 5,
      economicPopulation: 2,
      population: -12,
    });
    expect(after.rewards).toEqual(leveled.rewards);
    expect(result.events.map((event) => event.kind)).toEqual([
      "ECONOMIC_BUILDING_REMOVED",
      "CITY_ECONOMY_CHANGED",
    ]);
    expect(
      playerIncomeV6(result.state, state.humanPlayerId).cities[0]?.coins,
    ).toBe(0);
  });

  it.each([
    [2, "SURVEY"],
    [2, "STOCKPILE"],
    [3, "WALLS"],
    [3, "MILITIA"],
    [4, "EXPAND"],
    [5, "JUGGERNAUT"],
    [5, "TREASURY"],
  ] as const)(
    "resolves level %i reward %s from the mandatory FIFO head",
    (level, reward) => {
      let state = rewardState(level, 0);
      const city = ownCity(state);
      if (reward === "SURVEY")
        state = withPlayer(state, { explored: [city.at] });
      if (reward === "EXPAND") {
        const contested = { x: city.at.x + 2, y: city.at.y };
        const other = state.cities.find(
          (candidate) => candidate.ownerId !== city.ownerId,
        );
        state = checked({
          ...state,
          board: {
            ...state.board,
            tiles: state.board.tiles.map((tile) => {
              const distance = Math.max(
                Math.abs(tile.at.x - city.at.x),
                Math.abs(tile.at.y - city.at.y),
              );
              if (same(tile.at, contested))
                return { ...tile, territoryCityId: other?.id ?? null };
              return distance === 2 ? { ...tile, territoryCityId: null } : tile;
            }),
          },
        });
      }
      const randomBefore = state.random;
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: level,
        reward,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(result.state.pendingChoices).toHaveLength(0);
      expect(ownCity(result.state).rewards.at(-1)).toEqual({
        reachedLevel: level,
        reward,
      });
      expect(result.events[0]).toMatchObject({
        kind: "CITY_REWARD_CHOSEN",
        reward,
      });
      expect(result.state.random).toEqual(randomBefore);
      if (reward === "STOCKPILE")
        expect(ownPlayer(result.state).coins).toBe(104);
      if (reward === "TREASURY")
        expect(ownPlayer(result.state).coins).toBe(105);
      if (reward === "WALLS")
        expect(ownCity(result.state).rewards.at(-1)?.reward).toBe("WALLS");
      if (reward === "SURVEY")
        expect(ownPlayer(result.state).explored.length).toBeGreaterThan(1);
      if (reward === "MILITIA" || reward === "JUGGERNAUT") {
        const role = reward === "MILITIA" ? "FIGHTER" : "JUGGERNAUT";
        const granted = result.state.units.find(
          (unit) => unit.role === role && unit.id >= state.nextEntityId,
        );
        expect(granted).toMatchObject({
          homeCityId: city.id,
          role,
          activation: { handled: true },
        });
      }
      if (reward === "EXPAND") {
        expect(ownCity(result.state).expanded).toBe(true);
        expect(result.events[1]?.kind).toBe("CITY_TERRITORY_EXPANDED");
        expect(
          result.state.board.tiles.find(
            (tile) => tile.at.x === city.at.x + 2 && tile.at.y === city.at.y,
          )?.territoryCityId,
        ).not.toBe(city.id);
        expect(
          cityFootprintContainsV6(ownCity(result.state), {
            x: city.at.x + 2,
            y: city.at.y + 2,
          }),
        ).toBe(true);
      }
    },
  );

  it("clips corner Expand to on-board neutral cells and never steals assigned territory", () => {
    let state = rewardState(4, 0);
    const city = ownCity(state);
    const other = state.cities.find(
      (candidate) => candidate.ownerId !== city.ownerId,
    );
    const ownUnit = state.units.find(
      (candidate) => candidate.ownerId === city.ownerId,
    );
    if (other === undefined || ownUnit === undefined) {
      throw new Error("missing corner fixture");
    }
    const corner = { x: 0, y: 0 };
    const contested = { x: 2, y: 2 };
    state = checked({
      ...state,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id ? { ...candidate, at: corner } : candidate,
      ),
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) => {
          const distance = Math.max(tile.at.x, tile.at.y);
          if (same(tile.at, contested)) {
            return { ...tile, territoryCityId: other.id };
          }
          if (same(tile.at, corner)) {
            return {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              site: "CAPITAL" as const,
              territoryCityId: city.id,
            };
          }
          if (distance <= 1) {
            return { ...tile, site: null, territoryCityId: city.id };
          }
          if (tile.territoryCityId === city.id) {
            return {
              ...tile,
              site: same(tile.at, city.at) ? null : tile.site,
              territoryCityId: null,
            };
          }
          return tile;
        }),
      },
      units: state.units.map((unit) =>
        unit.id === ownUnit.id ? { ...unit, at: corner } : unit,
      ),
    });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 4,
      reward: "EXPAND",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const expanded = result.events.find(
      (event) => event.kind === "CITY_TERRITORY_EXPANDED",
    );
    if (expanded?.kind !== "CITY_TERRITORY_EXPANDED") {
      throw new Error("missing Expand event");
    }
    expect(expanded.tiles).toHaveLength(4);
    expect(tileAt(result.state, contested).territoryCityId).toBe(other.id);
    expect(
      result.state.board.tiles.filter(
        (tile) => tile.territoryCityId === city.id,
      ),
    ).toHaveLength(8);
  });

  it("Boom inserts cascade rewards ahead of the tail and repeated level-5+ choices resolve once", () => {
    let state = rewardState(4, 2);
    const city = ownCity(state);
    const other = state.cities.find(
      (candidate) => candidate.ownerId !== city.ownerId,
    );
    if (other === undefined) throw new Error("missing other city");
    state = checked({
      ...state,
      pendingChoices: [
        ...state.pendingChoices,
        {
          kind: "CITY_REWARD",
          cityId: other.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ],
    });
    const boom = applyCommandV6(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 4,
      reward: "BOOM",
    });
    expect(boom.accepted).toBe(true);
    if (!boom.accepted) return;
    expect(ownCity(boom.state)).toMatchObject({ level: 5, population: 0 });
    expect(
      boom.state.pendingChoices.map((choice) =>
        choice.kind === "CITY_REWARD"
          ? [choice.cityId, choice.reachedLevel]
          : [],
      ),
    ).toEqual([
      [city.id, 5],
      [other.id, 2],
    ]);
    expect(boom.events.map((event) => event.kind)).toEqual([
      "CITY_REWARD_CHOSEN",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
    ]);
    const treasury = applyCommandV6(boom.state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 5,
      reward: "TREASURY",
    });
    expect(treasury.accepted).toBe(true);
    if (!treasury.accepted) return;
    expect(
      ownCity(treasury.state).rewards.filter(
        (record) => record.reachedLevel >= 5,
      ),
    ).toEqual([{ reachedLevel: 5, reward: "TREASURY" }]);
  });

  it("resolves a repeated level-6 Juggernaut independently of level 5", () => {
    const state = rewardState(6, 0);
    const city = ownCity(state);
    expect(city.rewards.at(-1)).toEqual({
      reachedLevel: 5,
      reward: "TREASURY",
    });
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 6,
      reward: "JUGGERNAUT",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(ownCity(result.state).rewards.slice(-2)).toEqual([
      { reachedLevel: 5, reward: "TREASURY" },
      { reachedLevel: 6, reward: "JUGGERNAUT" },
    ]);
  });

  it("creates reward units fully exhausted until Start Turn without treating handled-only Wait as exhaustion", () => {
    const state = rewardState(3, 0);
    const city = ownCity(state);
    const granted = applyCommandV6(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 3,
      reward: "MILITIA",
    });
    expect(granted.accepted).toBe(true);
    if (!granted.accepted) return;
    const militia = granted.state.units.find(
      (unit) => unit.id >= state.nextEntityId && unit.role === "FIGHTER",
    );
    if (militia === undefined) throw new Error("missing Militia");
    expect(militia.activation).toEqual({
      moved: true,
      movedPathLength: 0,
      attacked: true,
      healed: true,
      recovered: true,
      captured: true,
      handled: true,
      specialActed: true,
    });
    expect(
      queryPlayerCommandsV6(
        viewForV6(granted.state, granted.state.humanPlayerId),
      ).some((command) => "unitId" in command && command.unitId === militia.id),
    ).toBe(false);
    expectRejected(
      applyCommandV6(granted.state, granted.state.humanPlayerId, {
        kind: "MOVE",
        unitId: militia.id,
        path: [city.at],
      }),
      granted.state,
      "UNIT_ALREADY_ACTED",
    );

    const waitingBase = baseState();
    const waitingUnit = waitingBase.units.find(
      (unit) => unit.ownerId === waitingBase.humanPlayerId,
    );
    if (waitingUnit === undefined) throw new Error("missing waiting unit");
    const waiting = checked({
      ...waitingBase,
      units: waitingBase.units.map((unit) =>
        unit.id === waitingUnit.id
          ? { ...unit, activation: { ...unit.activation, handled: true } }
          : unit,
      ),
    });
    expect(
      queryPlayerCommandsV6(viewForV6(waiting, waiting.humanPlayerId)).some(
        (command) =>
          command.kind === "MOVE" && command.unitId === waitingUnit.id,
      ),
    ).toBe(true);
  });

  it("keeps a blocked unit reward pending, preserves the Coin alternative, and preflights overflow", () => {
    let state = rewardState(3, 0);
    const city = ownCity(state);
    let next = state.nextEntityId;
    const walls = state.board.tiles
      .filter((tile) => tile.territoryCityId === city.id)
      .map((tile) => ({
        id: next++ as GameStateV6["chocolateWalls"][number]["id"],
        ownerId: city.ownerId,
        at: tile.at,
        hp: 10,
      }));
    const outside = state.board.tiles.find(
      (tile) =>
        tile.territoryCityId !== city.id &&
        tile.site === null &&
        !state.units.some((unit) => same(unit.at, tile.at)),
    );
    if (outside === undefined) {
      throw new Error("missing outside reward-block tile");
    }
    state = checked({
      ...state,
      nextEntityId: next,
      chocolateWalls: walls,
      units: state.units.map((unit) =>
        unit.ownerId === city.ownerId ? { ...unit, at: outside.at } : unit,
      ),
    });
    expect(
      queryPlayerCommandsV6(viewForV6(state, state.humanPlayerId)),
    ).toEqual([
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 3,
        reward: "WALLS",
      },
    ]);
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 3,
        reward: "MILITIA",
      }),
      state,
      "NO_REWARD_UNIT_PLACEMENT",
    );
    const wallsChoice = applyCommandV6(state, state.humanPlayerId, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 3,
      reward: "WALLS",
    });
    expect(wallsChoice.accepted).toBe(true);

    const stockpile = rewardState(2, 0);
    const overflow = withPlayer(stockpile, { coins: Number.MAX_SAFE_INTEGER });
    expectRejected(
      applyCommandV6(overflow, overflow.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: ownCity(overflow).id,
        reachedLevel: 2,
        reward: "STOCKPILE",
      }),
      overflow,
      "INTEGER_OVERFLOW",
    );
  });

  it("offers only fog-safe commands/previews and round-trips accepted state through replay/save/hash", () => {
    let state = baseState();
    const city = ownCity(state);
    const at = { x: city.at.x + 1, y: city.at.y };
    state = replaceTile(state, at, {
      terrain: "FOREST",
      resource: null,
      improvement: null,
      site: null,
      road: false,
      territoryCityId: city.id,
    });
    const view = viewForV6(state, state.humanPlayerId);
    const commands = queryPlayerCommandsV6(view);
    expect(commands).toContainEqual({ kind: "CLEAR_FOREST", at });
    expect(previewEconomicV6(view, { kind: "CLEAR_FOREST", at })).toMatchObject(
      {
        ok: true,
        preview: { complete: true, cost: 0 },
      },
    );
    const hidden = withPlayer(state, { explored: [city.at] });
    expect(
      queryPlayerCommandsV6(viewForV6(hidden, hidden.humanPlayerId)),
    ).not.toContainEqual({
      kind: "CLEAR_FOREST",
      at,
    });
    const command = { kind: "CLEAR_FOREST", at } as const;
    const result = applyCommandV6(state, state.humanPlayerId, command);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
    expect(parseGameStateV6(result.state)).toEqual(result.state);
    const replay = appendReplayCommandV6(
      createReplayV6(setup),
      command,
      result.state,
    );
    const save = createSaveEnvelopeV6(
      { state: result.state, replay },
      "2026-08-31T22:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(replay.checkpoints[0]?.stateHash).toBe(canonicalHash(result.state));
    expect(result.state.random).toEqual(state.random);
  });
});

function baseState(): GameStateV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  const all = created.state.board.tiles.map((tile) => tile.at);
  return checked({
    ...created.state,
    activeSeatIndex: created.state.turnOrder.indexOf(
      created.state.humanPlayerId,
    ),
    players: created.state.players.map((player) =>
      player.id === created.state.humanPlayerId
        ? {
            ...player,
            coins: 100,
            researchedTechs: TECHNOLOGY_IDS,
            explored: all,
          }
        : player,
    ),
  });
}

function marketState(): GameStateV6 {
  let state = baseState();
  const city = ownCity(state);
  const buildings = [
    {
      at: { x: city.at.x - 1, y: city.at.y + 1 },
      improvement: "FARM" as const,
    },
    {
      at: { x: city.at.x + 1, y: city.at.y + 1 },
      improvement: "MINE" as const,
    },
    { at: { x: city.at.x, y: city.at.y + 1 }, improvement: "MARKET" as const },
  ];
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((tile) => {
      const building = buildings.find((candidate) =>
        same(candidate.at, tile.at),
      );
      if (building === undefined) return tile;
      return {
        ...tile,
        terrain: terrainFor(building.improvement),
        resource: null,
        improvement: building.improvement,
        road: false,
        site: null,
        territoryCityId: city.id,
      };
    }),
  };
  let next = state.nextEntityId;
  const contributions: PopulationContributionV6[] = buildings.map(
    (building) => ({
      id: next++,
      cityId: city.id,
      category: "LIVE",
      amount: spatialContributionAtV6(
        { board, cities: state.cities },
        building.at,
        building.improvement,
      ).population,
      source: {
        kind: "IMPROVEMENT",
        improvement: building.improvement,
        at: building.at,
      },
    }),
  );
  const economicPopulation = contributions.reduce(
    (sum, value) => sum + value.amount,
    0,
  );
  const grown = resolveCityGrowthV6(city, 0, economicPopulation).city;
  state = checked({
    ...state,
    nextEntityId: next,
    board,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id ? grown : candidate,
    ),
    populationContributions: contributions,
  });
  return state;
}

function rewardState(level: number, progress: number): GameStateV6 {
  const state = baseState();
  const city = ownCity(state);
  const total = growthSpentV6(level) + progress;
  let next = state.nextEntityId;
  const sourceTiles = state.board.tiles
    .filter((tile) => !same(tile.at, city.at))
    .slice(0, total);
  const contributions: PopulationContributionV6[] = sourceTiles.map(
    (tile, index) => ({
      id: next++,
      cityId: city.id,
      category: "PERMANENT",
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION",
        action: index % 2 === 0 ? "HARVEST_FRUIT" : "HUNT_GAME",
        at: tile.at,
      },
    }),
  );
  const priorRewards = Array.from(
    { length: Math.max(0, level - 2) },
    (_, index) => {
      const reachedLevel = index + 2;
      const reward: RewardIdV6 =
        reachedLevel === 2
          ? "SURVEY"
          : reachedLevel === 3
            ? "WALLS"
            : reachedLevel === 4
              ? "EXPAND"
              : "TREASURY";
      return { reachedLevel, reward };
    },
  );
  const candidates =
    level === 2
      ? (["SURVEY", "STOCKPILE"] as const)
      : level === 3
        ? (["WALLS", "MILITIA"] as const)
        : level === 4
          ? (["EXPAND", "BOOM"] as const)
          : (["JUGGERNAUT", "TREASURY"] as const);
  return checked({
    ...state,
    nextEntityId: next,
    cities: state.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            level,
            permanentPopulation: total,
            economicPopulation: 0,
            population: progress,
            expanded: priorRewards.some((record) => record.reward === "EXPAND"),
            rewards: priorRewards,
          }
        : candidate,
    ),
    populationContributions: contributions,
    pendingChoices: [
      { kind: "CITY_REWARD", cityId: city.id, reachedLevel: level, candidates },
    ],
  });
}

function ownCity(state: GameStateV6): CityStateV6 {
  const city = state.cities.find(
    (candidate) => candidate.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("missing own city");
  return city;
}

function ownPlayer(state: GameStateV6): GameStateV6["players"][number] {
  const player = state.players.find(
    (candidate) => candidate.id === state.humanPlayerId,
  );
  if (player === undefined) throw new Error("missing own player");
  return player;
}

function unitAt(state: GameStateV6, id: number): GameStateV6["units"][number] {
  const unit = state.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("missing unit");
  return unit;
}

function withPlayer(
  state: GameStateV6,
  replacement: Partial<GameStateV6["players"][number]>,
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, ...replacement }
        : player,
    ),
  });
}

function replaceTile(
  state: GameStateV6,
  at: CoordV6,
  replacement: Partial<TileStateV6>,
): GameStateV6 {
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, ...replacement, at: tile.at } : tile,
      ),
    },
  });
}

function tileAt(state: GameStateV6, at: CoordV6): TileStateV6 {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (tile === undefined || !same(tile.at, at)) throw new Error("missing tile");
  return tile;
}

function terrainFor(
  improvement: EconomicImprovementId,
): TileStateV6["terrain"] {
  if (improvement === "LUMBER_CAMP") return "FOREST";
  if (improvement === "MINE" || improvement === "QUARRY") return "MOUNTAIN";
  return "GRASS";
}

function expectRejected(
  result: ReturnType<typeof applyCommandV6>,
  state: GameStateV6,
  code: string,
): void {
  expect(result).toMatchObject({
    accepted: false,
    error: { code },
    events: [],
  });
  expect(result.state).toBe(state);
}

function checked(state: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(state);
  if (parsed === null) throw new Error("invalid roads/rewards fixture");
  return parsed;
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
