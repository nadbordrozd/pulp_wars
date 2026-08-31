import { describe, expect, it } from "vitest";
import {
  BASIC_ECONOMIC_ACTIONS_V6,
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  appendReplayCommandV6,
  applyCommandV6,
  assignedUnitCountV6,
  canonicalHash,
  cityIncomeV6,
  cityUnitCapacityV6,
  createInitialMapStateV6,
  createPlayableGameV6,
  createReplayV6,
  parseEventV6,
  parseGameStateV6,
  playerIncomeV6,
  previewEconomicV6,
  queryPlayerCommandsV6,
  resolveCityGrowthV6,
  viewForV6,
  type BasicEconomicCommandKindV6,
  type GameStateV6,
  type MatchSetupV6,
  type PopulationContributionV6,
  type TechnologyId,
  type TileStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 7,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

const TECHS: Readonly<
  Record<BasicEconomicCommandKindV6, readonly TechnologyId[]>
> = {
  HARVEST_FRUIT: ["GATHERING"],
  HUNT_GAME: ["GATHERING", "HUNTING"],
  BUILD_FARM: ["GATHERING", "FARMING"],
  BUILD_LUMBER_CAMP: ["GATHERING", "HUNTING", "FORESTRY"],
  BUILD_MINE: ["GATHERING", "SURVEYING", "MINING"],
  BUILD_QUARRY: ["GATHERING", "SURVEYING", "QUARRYING"],
};

describe("ruleset-6 basic economy", () => {
  it("awards exact level income and the capital bonus on the first and later Start Turns", () => {
    const created = createPlayableGameV6(setup);
    if (!created.ok) throw new Error(created.error.code);
    const human = created.state.players[0];
    const opponent = created.state.players[1];
    expect(human?.coins).toBe(7);
    expect(opponent?.coins).toBe(5);
    expect(created.events).toEqual([
      { kind: "TURN_STARTED", playerId: human?.id, coins: 7 },
      {
        kind: "INCOME_AWARDED",
        playerId: human?.id,
        totalCoins: 2,
        cities: [{ cityId: created.state.cities[0]?.id, coins: 2 }],
      },
    ]);

    const ended = applyCommandV6(
      created.state,
      human?.id ?? created.state.humanPlayerId,
      { kind: "END_TURN" },
    );
    expect(ended.accepted).toBe(true);
    if (!ended.accepted) return;
    expect(ended.state.players[1]?.coins).toBe(7);
    expect(ended.events.map((event) => event.kind)).toEqual([
      "INCOME_PREVIEWED",
      "TURN_ENDED",
      "TURN_STARTED",
      "INCOME_AWARDED",
    ]);
  });

  it("gives besieged cities zero income without changing their level or capacity", () => {
    const state = baseState();
    const city = state.cities[0];
    const ownUnit = state.units.find((unit) => unit.ownerId === city?.ownerId);
    const hostile = state.units.find((unit) => unit.ownerId !== city?.ownerId);
    if (city === undefined || ownUnit === undefined || hostile === undefined) {
      throw new Error("fixture missing entities");
    }
    const besieged = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === ownUnit.id
          ? { ...unit, at: { x: city.at.x + 1, y: city.at.y } }
          : unit.id === hostile.id
            ? { ...unit, at: city.at }
            : unit,
      ),
    });
    expect(cityIncomeV6(besieged, must(besieged.cities[0]))).toBe(0);
    expect(playerIncomeV6(besieged, city.ownerId)).toMatchObject({
      totalCoins: 0,
    });
    expect(cityUnitCapacityV6(city)).toBe(2);
    expect(assignedUnitCountV6(besieged, city.id)).toBe(1);
  });

  it("applies negative population to income without regressing city level", () => {
    const state = baseState();
    const city = must(state.cities[0]);
    const damaged = checked({
      ...state,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, level: 3, population: -5 }
          : candidate,
      ),
    });
    const damagedCity = must(
      damaged.cities.find((candidate) => candidate.id === city.id),
    );
    expect(damagedCity.level).toBe(3);
    expect(damagedCity.population).toBe(-5);
    expect(cityIncomeV6(damaged, damagedCity)).toBe(0);
    expect(cityUnitCapacityV6(damagedCity)).toBe(4);
  });

  for (const kind of Object.keys(
    BASIC_ECONOMIC_ACTIONS_V6,
  ) as BasicEconomicCommandKindV6[]) {
    it(`applies ${kind} with its exact cost, target mutation, and attributed ledger entry`, () => {
      const fixture = basicFixture(kind);
      const beforeRandom = fixture.state.random;
      const beforeIndex = fixture.state.commandIndex;
      const result = applyCommandV6(
        fixture.state,
        fixture.state.humanPlayerId,
        {
          kind,
          at: fixture.at,
        },
      );
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
      const player = result.state.players.find(
        (candidate) => candidate.id === result.state.humanPlayerId,
      );
      const tile = tileAt(result.state, fixture.at);
      const contribution = result.state.populationContributions.at(-1);
      expect(player?.coins).toBe(20 - rule.cost);
      expect(tile).toMatchObject({
        resource: null,
        improvement: rule.improvement,
        road: true,
      });
      expect(contribution).toMatchObject({
        id: fixture.state.nextEntityId,
        cityId: fixture.cityId,
        category: rule.populationCategory,
        amount: rule.population,
        source: { at: fixture.at },
      });
      expect(
        viewForV6(result.state, result.state.humanPlayerId)
          .populationContributions,
      ).toContainEqual(contribution);
      const opponent = must(
        result.state.players.find(
          (candidate) => candidate.id !== result.state.humanPlayerId,
        ),
      );
      expect(
        viewForV6(result.state, opponent.id).populationContributions,
      ).not.toContainEqual(contribution);
      expect(result.state.nextEntityId).toBe(fixture.state.nextEntityId + 1);
      expect(result.state.commandIndex).toBe(beforeIndex + 1);
      expect(result.state.random).toEqual(beforeRandom);
      expect(result.events.map((event) => event.kind).slice(0, 2)).toEqual([
        kind === "HARVEST_FRUIT"
          ? "FRUIT_HARVESTED"
          : kind === "HUNT_GAME"
            ? "GAME_HUNTED"
            : "ECONOMIC_BUILDING_BUILT",
        "CITY_ECONOMY_CHANGED",
      ]);
      expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
      expect(parseGameStateV6(result.state)).toEqual(result.state);
    });
  }

  it("queues level events in exact order and basic buildings add no direct recurring Coins", () => {
    const fixture = basicFixture("BUILD_FARM");
    const beforeCity = must(
      fixture.state.cities.find((city) => city.id === fixture.cityId),
    );
    expect(cityIncomeV6(fixture.state, beforeCity)).toBe(2);
    const result = applyCommandV6(fixture.state, fixture.state.humanPlayerId, {
      kind: "BUILD_FARM",
      at: fixture.at,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const afterCity = must(
      result.state.cities.find((city) => city.id === fixture.cityId),
    );
    expect(afterCity).toMatchObject({
      level: 2,
      permanentPopulation: 0,
      economicPopulation: 2,
      population: 0,
    });
    expect(cityIncomeV6(result.state, afterCity)).toBe(3);
    expect(result.events.map((event) => event.kind)).toEqual([
      "ECONOMIC_BUILDING_BUILT",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
    ]);
    expect(result.state.pendingChoices).toEqual([
      {
        kind: "CITY_REWARD",
        cityId: fixture.cityId,
        reachedLevel: 2,
        candidates: ["SURVEY", "STOCKPILE"],
      },
    ]);
  });

  it("does not add recurring Coins when a basic improvement does not level its city", () => {
    let state = baseState();
    const city = must(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
    );
    const sites = state.board.tiles.filter(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    const existingAt = must(sites[0]).at;
    const targetAt = must(sites[1]).at;
    const contribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: 2,
      source: { kind: "IMPROVEMENT", improvement: "FARM", at: existingAt },
    };
    state = checked({
      ...state,
      nextEntityId: state.nextEntityId + 1,
      cities: state.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 2,
              economicPopulation: 2,
              population: 0,
            }
          : candidate,
      ),
      populationContributions: [contribution],
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          sameCoord(tile.at, existingAt)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: "FARM" as const,
              }
            : sameCoord(tile.at, targetAt)
              ? {
                  ...tile,
                  terrain: "FOREST" as const,
                  resource: null,
                  improvement: null,
                }
              : tile,
        ),
      },
    });
    state = withTechs(state, TECHS.BUILD_LUMBER_CAMP);
    state = withCoins(state, 20);
    expect(
      cityIncomeV6(
        state,
        must(state.cities.find((candidate) => candidate.id === city.id)),
      ),
    ).toBe(3);
    const result = applyCommandV6(state, state.humanPlayerId, {
      kind: "BUILD_LUMBER_CAMP",
      at: targetAt,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const after = must(
      result.state.cities.find((candidate) => candidate.id === city.id),
    );
    expect(after).toMatchObject({
      level: 2,
      economicPopulation: 3,
      population: 1,
    });
    expect(cityIncomeV6(result.state, after)).toBe(3);
    expect(result.events).not.toContainEqual(
      expect.objectContaining({ kind: "CITY_LEVELED_UP" }),
    );
  });

  it("uses N+1 thresholds, supports multi-level gains, negative progress, and non-regressing capacity", () => {
    const city = must(baseState().cities[0]);
    const grown = resolveCityGrowthV6(city, 20, 0);
    expect(grown.city).toMatchObject({ level: 6, population: 0 });
    expect(grown.reachedLevels).toEqual([2, 3, 4, 5, 6]);
    expect(grown.pendingChoices.map((choice) => choice.reachedLevel)).toEqual([
      2, 3, 4, 5, 6,
    ]);
    const damaged = resolveCityGrowthV6(grown.city, 2, 0);
    expect(damaged.city).toMatchObject({ level: 6, population: -18 });
    expect(damaged.reachedLevels).toEqual([]);
    expect(cityUnitCapacityV6(damaged.city)).toBe(7);
  });

  it("rejects atomically in the frozen tile-validation order", () => {
    const fixture = basicFixture("BUILD_MINE");
    const actor = fixture.state.humanPlayerId;
    const unknown = applyCommandV6(fixture.state, actor, {
      kind: "BUILD_MINE",
      at: { x: -1, y: -1 },
    });
    expectRejected(unknown, fixture.state, "TILE_NOT_FOUND");

    const unexploredState = checked({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !sameCoord(at, fixture.at),
              ),
            }
          : player,
      ),
    });
    expectRejected(
      applyCommandV6(unexploredState, actor, {
        kind: "BUILD_MINE",
        at: fixture.at,
      }),
      unexploredState,
      "TILE_UNEXPLORED",
    );

    const lockedState = withTechs(fixture.state, ["GATHERING"]);
    expectRejected(
      applyCommandV6(lockedState, actor, {
        kind: "BUILD_MINE",
        at: fixture.at,
      }),
      lockedState,
      "TECH_REQUIRED",
    );

    const invalidState = replaceTile(fixture.state, fixture.at, {
      terrain: "MOUNTAIN",
      resource: "STONE",
      improvement: null,
    });
    expectRejected(
      applyCommandV6(invalidState, actor, {
        kind: "BUILD_MINE",
        at: fixture.at,
      }),
      invalidState,
      "INVALID_TILE",
    );

    const city = must(
      fixture.state.cities.find((candidate) => candidate.id === fixture.cityId),
    );
    const enemyCity = must(
      fixture.state.cities.find((candidate) => candidate.ownerId !== actor),
    );
    const foreign = checked({
      ...fixture.state,
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          sameCoord(tile.at, fixture.at)
            ? { ...tile, territoryCityId: enemyCity.id }
            : tile,
        ),
      },
    });
    expectRejected(
      applyCommandV6(foreign, actor, { kind: "BUILD_MINE", at: fixture.at }),
      foreign,
      "TERRITORY_NOT_OWNED",
    );

    const ownUnit = must(
      fixture.state.units.find((unit) => unit.ownerId === actor),
    );
    const hostile = must(
      fixture.state.units.find((unit) => unit.ownerId !== actor),
    );
    const besieged = checked({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.id === ownUnit.id
          ? { ...unit, at: fixture.at }
          : unit.id === hostile.id
            ? { ...unit, at: city.at }
            : unit,
      ),
    });
    expectRejected(
      applyCommandV6(besieged, actor, { kind: "BUILD_MINE", at: fixture.at }),
      besieged,
      "CITY_BESIEGED",
    );

    const poor = withCoins(fixture.state, 4);
    expectRejected(
      applyCommandV6(poor, actor, { kind: "BUILD_MINE", at: fixture.at }),
      poor,
      "INSUFFICIENT_COINS",
    );

    const overflow = checked({
      ...fixture.state,
      commandIndex: Number.MAX_SAFE_INTEGER,
    });
    expectRejected(
      applyCommandV6(overflow, actor, { kind: "BUILD_MINE", at: fixture.at }),
      overflow,
      "INTEGER_OVERFLOW",
    );
  });

  it("applies common rejection gates before command-specific validation", () => {
    const fixture = basicFixture("HARVEST_FRUIT");
    const actor = fixture.state.humanPlayerId;
    const other = must(
      fixture.state.players.find((player) => player.id !== actor),
    );
    const ended = checked({
      ...fixture.state,
      outcome: { kind: "VICTORY" as const, winnerId: actor },
    });
    expectRejected(
      applyCommandV6(ended, other.id, {
        kind: "HARVEST_FRUIT",
        at: { x: -1, y: -1 },
      }),
      ended,
      "MATCH_ENDED",
    );

    const eliminated = checked({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === actor
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
    });
    expectRejected(
      applyCommandV6(eliminated, actor, {
        kind: "HARVEST_FRUIT",
        at: { x: -1, y: -1 },
      }),
      eliminated,
      "PLAYER_ELIMINATED",
    );
    expectRejected(
      applyCommandV6(fixture.state, other.id, {
        kind: "HARVEST_FRUIT",
        at: { x: -1, y: -1 },
      }),
      fixture.state,
      "NOT_ACTIVE_PLAYER",
    );

    const farm = basicFixture("BUILD_FARM");
    const grown = applyCommandV6(farm.state, actor, {
      kind: "BUILD_FARM",
      at: farm.at,
    });
    expect(grown.accepted).toBe(true);
    if (!grown.accepted) return;
    expectRejected(
      applyCommandV6(grown.state, actor, {
        kind: "HARVEST_FRUIT",
        at: { x: -1, y: -1 },
      }),
      grown.state,
      "PENDING_CHOICE",
    );
  });

  it("enumerates and previews only exact fog-safe public basic actions", () => {
    const fixture = basicFixture("BUILD_MINE");
    const view = viewForV6(fixture.state, fixture.state.humanPlayerId);
    const command = { kind: "BUILD_MINE", at: fixture.at } as const;
    expect(queryPlayerCommandsV6(view)).toContainEqual(command);
    expect(previewEconomicV6(view, command)).toEqual({
      ok: true,
      preview: {
        at: fixture.at,
        cost: 5,
        ownerCityId: fixture.cityId,
        populationDeltaByCity: [{ cityId: fixture.cityId, delta: 2 }],
        coinIncomeDeltaByCity: [{ cityId: fixture.cityId, delta: 1 }],
        resultingContribution: 2,
        levelsReached: [2],
        distinctTypes: ["MINE"],
        distinctFamilies: [],
        contributingTiles: [fixture.at],
        oppositePairAxes: [],
        capitalRoadConnected: false,
        buildingLimitReached: false,
        complete: true,
      },
    });

    const hiddenAt = must(
      fixture.state.board.tiles.find(
        (tile) => !view.viewer.explored.some((at) => sameCoord(at, tile.at)),
      ),
    ).at;
    const ore = replaceTile(fixture.state, hiddenAt, {
      terrain: "MOUNTAIN",
      resource: "ORE",
      improvement: null,
    });
    const stone = replaceTile(fixture.state, hiddenAt, {
      terrain: "MOUNTAIN",
      resource: "STONE",
      improvement: null,
    });
    const oreView = viewForV6(ore, ore.humanPlayerId);
    const stoneView = viewForV6(stone, stone.humanPlayerId);
    expect(oreView).toEqual(stoneView);
    expect(queryPlayerCommandsV6(oreView)).toEqual(
      queryPlayerCommandsV6(stoneView),
    );

    const visibleAt = fixture.at;
    const lockedOre = withTechs(
      replaceTile(fixture.state, visibleAt, {
        terrain: "MOUNTAIN",
        resource: "ORE",
        improvement: null,
      }),
      ["GATHERING"],
    );
    const lockedStone = withTechs(
      replaceTile(fixture.state, visibleAt, {
        terrain: "MOUNTAIN",
        resource: "STONE",
        improvement: null,
      }),
      ["GATHERING"],
    );
    const lockedOreView = viewForV6(lockedOre, lockedOre.humanPlayerId);
    const lockedStoneView = viewForV6(lockedStone, lockedStone.humanPlayerId);
    expect(lockedOreView).toEqual(lockedStoneView);
    expect(queryPlayerCommandsV6(lockedOreView)).toEqual(
      queryPlayerCommandsV6(lockedStoneView),
    );
  });

  it("captures a hostile city with its territory and stable population attribution", () => {
    let state = baseState();
    const actor = state.humanPlayerId;
    const target = must(state.cities.find((city) => city.ownerId !== actor));
    const sourceAt = must(
      state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === target.id && !sameCoord(tile.at, target.at),
      ),
    ).at;
    const permanentContribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: target.id,
      category: "PERMANENT",
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION",
        action: "HARVEST_FRUIT",
        at: sourceAt,
      },
    };
    const liveAt = must(
      state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === target.id &&
          !sameCoord(tile.at, target.at) &&
          !sameCoord(tile.at, sourceAt),
      ),
    ).at;
    const liveContribution: PopulationContributionV6 = {
      id: state.nextEntityId + 1,
      cityId: target.id,
      category: "LIVE",
      amount: 1,
      source: {
        kind: "IMPROVEMENT",
        improvement: "LUMBER_CAMP",
        at: liveAt,
      },
    };
    const captor = must(state.units.find((unit) => unit.ownerId === actor));
    const defender = must(
      state.units.find((unit) => unit.ownerId === target.ownerId),
    );
    state = checked({
      ...state,
      nextEntityId: state.nextEntityId + 2,
      cities: state.cities.map((city) =>
        city.id === target.id
          ? {
              ...city,
              level: 2,
              permanentPopulation: 1,
              economicPopulation: 1,
              population: 0,
              rewards: [{ reachedLevel: 2, reward: "SURVEY" as const }],
            }
          : city,
      ),
      populationContributions: [permanentContribution, liveContribution],
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          sameCoord(tile.at, liveAt)
            ? {
                ...tile,
                terrain: "FOREST" as const,
                resource: null,
                improvement: "LUMBER_CAMP" as const,
              }
            : tile,
        ),
      },
      units: state.units.map((unit) =>
        unit.id === captor.id
          ? { ...unit, at: target.at }
          : unit.id === defender.id
            ? { ...unit, at: sourceAt }
            : unit,
      ),
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: sortedCoords([...player.explored, target.at]),
            }
          : player,
      ),
    });
    expect(queryPlayerCommandsV6(viewForV6(state, actor))).toContainEqual({
      kind: "CAPTURE",
      unitId: captor.id,
    });
    const result = applyCommandV6(state, actor, {
      kind: "CAPTURE",
      unitId: captor.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(
      result.state.cities.find((city) => city.id === target.id)?.ownerId,
    ).toBe(actor);
    expect(
      result.state.board.tiles
        .filter((tile) => tile.territoryCityId === target.id)
        .every((tile) => tile.territoryCityId === target.id),
    ).toBe(true);
    expect(result.state.populationContributions).toEqual([
      permanentContribution,
      liveContribution,
    ]);
    expect(tileAt(result.state, liveAt).improvement).toBe("LUMBER_CAMP");
    expect(
      result.state.units.find((unit) => unit.id === captor.id)?.homeCityId,
    ).toBe(target.id);
    expect(
      result.state.players.find((player) => player.id === target.ownerId)
        ?.status,
    ).toBe("ELIMINATED");
    expect(result.state.outcome).toEqual({ kind: "VICTORY", winnerId: actor });
    expect(result.events.map((event) => event.kind)).toEqual([
      "CITY_CAPTURED",
      "TILES_REVEALED",
      "UNIT_DIED",
      "PLAYER_ELIMINATED",
      "MATCH_ENDED",
    ]);
  });

  it("turns a neutral village into a level-one city with a centered 3x3 footprint", () => {
    let state = baseState();
    const actor = state.humanPlayerId;
    const village = must(
      state.board.tiles.find((tile) => tile.site === "VILLAGE"),
    );
    const captor = must(state.units.find((unit) => unit.ownerId === actor));
    state = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === captor.id ? { ...unit, at: village.at } : unit,
      ),
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: sortedCoords([...player.explored, village.at]),
            }
          : player,
      ),
    });
    const result = applyCommandV6(state, actor, {
      kind: "CAPTURE",
      unitId: captor.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const captured = result.state.cities.find((city) =>
      sameCoord(city.at, village.at),
    );
    expect(captured).toMatchObject({
      ownerId: actor,
      level: 1,
      permanentPopulation: 0,
      economicPopulation: 0,
      population: 0,
      isCapital: false,
    });
    expect(tileAt(result.state, village.at).site).toBe("CITY");
    expect(
      result.state.board.tiles.filter(
        (tile) => tile.territoryCityId === captured?.id,
      ),
    ).toHaveLength(9);
    expect(
      result.state.units.find((unit) => unit.id === captor.id)?.homeCityId,
    ).toBe(captured?.id);
  });

  it("round-trips an accepted economy command through canonical replay and save", () => {
    const fixture = basicFixture("HUNT_GAME");
    const command = { kind: "HUNT_GAME", at: fixture.at } as const;
    const applied = applyCommandV6(
      fixture.state,
      fixture.state.humanPlayerId,
      command,
    );
    expect(applied.accepted).toBe(true);
    if (!applied.accepted) return;
    const replay = appendReplayCommandV6(
      createReplayV6(setup),
      command,
      applied.state,
    );
    expect(replay.checkpoints).toEqual([
      { index: 1, stateHash: canonicalHash(applied.state) },
    ]);
    const save = createSaveEnvelopeV6(
      { state: applied.state, replay },
      "2026-08-31T12:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(
      parseSaveV6(
        JSON.stringify({
          ...save,
          state: { ...save.state, populationContributions: [] },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });
});

function baseState(): GameStateV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function basicFixture(kind: BasicEconomicCommandKindV6): {
  readonly state: GameStateV6;
  readonly at: TileStateV6["at"];
  readonly cityId: GameStateV6["cities"][number]["id"];
} {
  let state = baseState();
  const city = must(
    state.cities.find((candidate) => candidate.ownerId === state.humanPlayerId),
  );
  const tile = must(
    state.board.tiles.find(
      (candidate) =>
        candidate.territoryCityId === city.id &&
        candidate.site === null &&
        !sameCoord(candidate.at, city.at),
    ),
  );
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  state = replaceTile(state, tile.at, {
    terrain: rule.terrain,
    resource: rule.resource,
    improvement: null,
    road: true,
  });
  state = withTechs(state, TECHS[kind]);
  state = withCoins(state, 20);
  return { state, at: tile.at, cityId: city.id };
}

function withTechs(
  state: GameStateV6,
  researchedTechs: readonly TechnologyId[],
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, researchedTechs }
        : player,
    ),
  });
}

function withCoins(state: GameStateV6, coins: number): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, coins } : player,
    ),
  });
}

function replaceTile(
  state: GameStateV6,
  at: TileStateV6["at"],
  replacement: Partial<TileStateV6>,
): GameStateV6 {
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        sameCoord(tile.at, at)
          ? { ...tile, ...replacement, at: tile.at }
          : tile,
      ),
    },
  });
}

function tileAt(state: GameStateV6, at: TileStateV6["at"]): TileStateV6 {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  if (tile === undefined) throw new Error("tile missing");
  return tile;
}

function checked(state: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(state);
  if (parsed === null) throw new Error("invalid test state");
  return parsed;
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
  expect(result.state.commandIndex).toBe(state.commandIndex);
  expect(result.state.random).toBe(state.random);
}

function sortedCoords(
  values: readonly TileStateV6["at"][],
): readonly TileStateV6["at"][] {
  return [
    ...new Map(values.map((at) => [`${at.y},${at.x}`, at])).values(),
  ].sort((left, right) => left.y - right.y || left.x - right.x);
}

function sameCoord(left: TileStateV6["at"], right: TileStateV6["at"]): boolean {
  return left.x === right.x && left.y === right.y;
}

function must<T>(value: T | undefined, message = "fixture value missing"): T {
  if (value === undefined) throw new Error(message);
  return value;
}
