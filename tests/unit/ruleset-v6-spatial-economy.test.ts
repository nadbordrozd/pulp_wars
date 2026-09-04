import { describe, expect, it } from "vitest";
import {
  RULESET_6_ID,
  SPATIAL_ECONOMY_REVISION,
  SPATIAL_ECONOMIC_ACTIONS_V6,
  TECHNOLOGY_IDS,
  appendReplayCommandV6,
  applyCommandV6,
  canonicalHash,
  createInitialMapStateV6,
  createReplayV6,
  parseEventV6,
  parseGameStateV6,
  playerIncomeV6,
  previewEconomicV6,
  publicImprovementValueAtV6,
  queryPlayerCommandsV6,
  resolveCityGrowthV6,
  spatialContributionAtV6,
  viewForV6,
  type BoardStateV6,
  type CityStateV6,
  type CoordV6,
  type EconomicImprovementId,
  type GameStateV6,
  type MatchSetupV6,
  type PopulationContributionV6,
  type TileStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 41,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

type Building = {
  readonly at: CoordV6;
  readonly improvement: EconomicImprovementId;
  readonly city: number;
};

describe("ruleset-6 live spatial economy", () => {
  it.each([
    [
      "BUILD_WINDMILL",
      "WINDMILL",
      "MILLING",
      5,
      [{ x: 5, y: 4, improvement: "FARM" }],
      1,
    ],
    [
      "BUILD_SAWMILL",
      "SAWMILL",
      "SAWMILLING",
      5,
      [{ x: 5, y: 4, improvement: "LUMBER_CAMP" }],
      1,
    ],
    ["BUILD_FORGE", "FORGE", "METALLURGY", 5, [], 0],
    ["BUILD_STONEWORKS", "STONEWORKS", "MASONRY", 5, [], 0],
    [
      "BUILD_WORKSHOP",
      "WORKSHOP",
      "CRAFT",
      4,
      [
        { x: 5, y: 4, improvement: "FARM" },
        { x: 4, y: 5, improvement: "MINE" },
      ],
      2,
    ],
    [
      "BUILD_GRAND_WORKS",
      "GRAND_WORKS",
      "GRAND_WORKS",
      7,
      [
        { x: 5, y: 4, improvement: "WINDMILL" },
        { x: 4, y: 5, improvement: "SAWMILL" },
        { x: 6, y: 5, improvement: "FORGE" },
      ],
      6,
    ],
    [
      "BUILD_MARKET",
      "MARKET",
      "COMMERCE",
      7,
      [
        { x: 5, y: 4, improvement: "FARM" },
        { x: 4, y: 5, improvement: "LUMBER_CAMP" },
      ],
      2,
    ],
  ] as const)(
    "%s uses its exact cost and creates one canonical %s LIVE identity",
    (kind, improvement, technology, cost, contributors, expectedLevel) => {
      const target = { x: 5, y: 5 };
      let state = stateWithBuildings(
        contributors.map((value) => ({
          at: { x: value.x, y: value.y },
          improvement: value.improvement,
          city: 0,
        })),
      );
      state = replaceTileChecked(state, target, {
        territoryCityId: must(state.cities[0]).id,
        site: null,
        terrain: "GRASS",
        resource: null,
        improvement: null,
      });
      const result = applyCommandV6(state, state.humanPlayerId, {
        kind,
        at: target,
      });
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      expect(SPATIAL_ECONOMIC_ACTIONS_V6[kind]).toMatchObject({
        technology,
        cost,
        improvement,
      });
      expect(
        result.state.players.find((player) => player.id === state.humanPlayerId)
          ?.coins,
      ).toBe(100 - cost);
      expect(
        result.state.populationContributions.filter(
          (value) =>
            value.source.kind === "IMPROVEMENT" &&
            value.source.improvement === improvement &&
            same(value.source.at, target),
        ),
      ).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        kind: "ECONOMIC_BUILDING_BUILT",
        improvement,
        cost,
      });
      expect(
        publicImprovementValueAtV6(
          viewForV6(result.state, state.humanPlayerId),
          target,
        ),
      ).toEqual({
        at: target,
        improvement,
        level: expectedLevel,
        measure: improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
      });
    },
  );

  it.each([
    ["WINDMILL", "FARM"],
    ["SAWMILL", "LUMBER_CAMP"],
  ] as const)(
    "%s unions touching orthogonal components, ignores diagonal gaps and other cities, and caps at eight",
    (processor, basic) => {
      const center = { x: 5, y: 5 };
      const connected = [
        { x: 5, y: 4 },
        { x: 5, y: 3 },
        { x: 4, y: 3 },
        { x: 3, y: 3 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
        { x: 3, y: 6 },
        { x: 3, y: 7 },
        { x: 4, y: 7 },
        { x: 5, y: 7 },
      ];
      const disconnected = { x: 7, y: 7 };
      const foreign = { x: 6, y: 5 };
      const graph = graphFixture([
        { at: center, improvement: processor, city: 0 },
        ...connected.map((at) => ({
          at,
          improvement: basic,
          city: 0 as const,
        })),
        { at: disconnected, improvement: basic, city: 0 },
        { at: foreign, improvement: basic, city: 1 },
      ]);
      expect(spatialContributionAtV6(graph, center, processor)).toMatchObject({
        population: 8,
        placementCount: 10,
        contributingTiles: sorted(connected),
      });
    },
  );

  it("Forge covers zero through eight adjacent Mines with no artificial cap", () => {
    const center = { x: 5, y: 5 };
    const neighbors = surrounding(center);
    for (let count = 0; count <= 8; count += 1) {
      const graph = graphFixture([
        { at: center, improvement: "FORGE", city: 0 },
        ...neighbors.slice(0, count).map((at) => ({
          at,
          improvement: "MINE" as const,
          city: 0 as const,
        })),
      ]);
      expect(spatialContributionAtV6(graph, center, "FORGE").population).toBe(
        2 * count,
      );
    }
  });

  it("Stoneworks scores all cardinal and diagonal opposite axes, including an edge-degenerate shape", () => {
    const center = { x: 5, y: 5 };
    const full = graphFixture([
      { at: center, improvement: "STONEWORKS", city: 0 },
      ...surrounding(center).map((at) => ({
        at,
        improvement: "QUARRY" as const,
        city: 0 as const,
      })),
    ]);
    expect(spatialContributionAtV6(full, center, "STONEWORKS")).toMatchObject({
      population: 16,
      placementCount: 8,
      oppositePairAxes: [
        "NORTH_SOUTH",
        "EAST_WEST",
        "NORTHEAST_SOUTHWEST",
        "NORTHWEST_SOUTHEAST",
      ],
    });

    const edge = { x: 0, y: 0 };
    const degenerate = graphFixture([
      { at: edge, improvement: "STONEWORKS", city: 0 },
      { at: { x: 1, y: 0 }, improvement: "QUARRY", city: 0 },
      { at: { x: 0, y: 1 }, improvement: "QUARRY", city: 0 },
      { at: { x: 1, y: 1 }, improvement: "QUARRY", city: 0 },
    ]);
    expect(
      spatialContributionAtV6(degenerate, edge, "STONEWORKS"),
    ).toMatchObject({ population: 3, oppositePairAxes: [] });
  });

  it("Workshop and Grand Works count distinct same-owner cross-city types but exclude allied, hostile, and duplicate types", () => {
    const center = { x: 5, y: 5 };
    const workshop = graphFixture(
      [
        { at: center, improvement: "WORKSHOP", city: 0 },
        { at: { x: 4, y: 4 }, improvement: "FARM", city: 0 },
        { at: { x: 5, y: 4 }, improvement: "FARM", city: 1 },
        { at: { x: 6, y: 4 }, improvement: "MINE", city: 1 },
        { at: { x: 4, y: 5 }, improvement: "QUARRY", city: 2 },
      ],
      [1, 1, 2],
    );
    expect(spatialContributionAtV6(workshop, center, "WORKSHOP")).toMatchObject(
      {
        population: 2,
        distinctTypes: ["FARM", "MINE"],
        contributingTiles: sorted([
          { x: 4, y: 4 },
          { x: 5, y: 4 },
          { x: 6, y: 4 },
        ]),
      },
    );

    const grand = graphFixture(
      [
        { at: center, improvement: "GRAND_WORKS", city: 0 },
        { at: { x: 4, y: 4 }, improvement: "WINDMILL", city: 0 },
        { at: { x: 5, y: 4 }, improvement: "WINDMILL", city: 1 },
        { at: { x: 6, y: 4 }, improvement: "SAWMILL", city: 1 },
        { at: { x: 4, y: 5 }, improvement: "FORGE", city: 1 },
        { at: { x: 6, y: 5 }, improvement: "STONEWORKS", city: 2 },
      ],
      [1, 1, 2],
    );
    expect(spatialContributionAtV6(grand, center, "GRAND_WORKS")).toMatchObject(
      {
        population: 6,
        distinctTypes: ["WINDMILL", "SAWMILL", "FORGE"],
      },
    );
  });

  it("Market counts four distinct friendly families, ignores duplicates and foreign buildings, and pays Start Turn Coins", () => {
    const center = { x: 5, y: 5 };
    const graph = graphFixture(
      [
        { at: center, improvement: "MARKET", city: 0 },
        { at: { x: 4, y: 4 }, improvement: "FARM", city: 0 },
        { at: { x: 5, y: 4 }, improvement: "WINDMILL", city: 1 },
        { at: { x: 6, y: 4 }, improvement: "SAWMILL", city: 1 },
        { at: { x: 4, y: 5 }, improvement: "MINE", city: 1 },
        { at: { x: 6, y: 5 }, improvement: "STONEWORKS", city: 1 },
        { at: { x: 4, y: 6 }, improvement: "QUARRY", city: 2 },
      ],
      [1, 1, 2],
    );
    expect(spatialContributionAtV6(graph, center, "MARKET")).toMatchObject({
      marketIncome: 4,
      population: 0,
      distinctFamilies: ["AGRICULTURE", "TIMBER", "METAL", "STONE"],
      capitalRoadConnected: false,
    });

    const state = stateWithBuildings([
      { at: center, improvement: "MARKET", city: 0 },
      { at: { x: 4, y: 4 }, improvement: "FARM", city: 0 },
      { at: { x: 6, y: 4 }, improvement: "LUMBER_CAMP", city: 0 },
      { at: { x: 4, y: 6 }, improvement: "MINE", city: 0 },
      { at: { x: 6, y: 6 }, improvement: "QUARRY", city: 0 },
    ]);
    const city = must(
      state.cities.find((value) => value.ownerId === state.humanPlayerId),
    );
    expect(playerIncomeV6(state, state.humanPlayerId).cities).toContainEqual({
      cityId: city.id,
      coins: city.level + 1 + 4,
    });
  });

  it("Market preview reports exact family contributors and recurring Coin delta", () => {
    const target = { x: 5, y: 5 };
    let state = stateWithBuildings([
      { at: { x: 5, y: 4 }, improvement: "FARM", city: 0 },
      { at: { x: 4, y: 5 }, improvement: "MINE", city: 0 },
    ]);
    state = replaceTileChecked(state, target, {
      territoryCityId: must(state.cities[0]).id,
      site: null,
      resource: null,
      improvement: null,
    });
    const preview = previewEconomicV6(viewForV6(state, state.humanPlayerId), {
      kind: "BUILD_MARKET",
      at: target,
    });
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        resultingContribution: 0,
        populationDeltaByCity: [],
        coinIncomeDeltaByCity: [{ cityId: must(state.cities[0]).id, delta: 2 }],
        distinctFamilies: ["AGRICULTURE", "METAL"],
        contributingTiles: sorted([
          { x: 5, y: 4 },
          { x: 4, y: 5 },
        ]),
      },
    });
  });

  it("advanced builds enforce empty targets, ownership, siege, and pending-reward locks", () => {
    const target = { x: 5, y: 5 };
    let state = stateWithBuildings([]);
    const ownCity = must(
      state.cities.find((city) => city.ownerId === state.humanPlayerId),
    );
    const enemyCity = must(
      state.cities.find((city) => city.ownerId !== state.humanPlayerId),
    );
    state = replaceTileChecked(state, target, {
      territoryCityId: ownCity.id,
      site: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
    });
    const occupied = replaceTileChecked(state, target, { resource: "FRUIT" });
    expectRejected(
      applyCommandV6(occupied, occupied.humanPlayerId, {
        kind: "BUILD_FORGE",
        at: target,
      }),
      occupied,
      "INVALID_TILE",
    );
    const foreign = replaceTileChecked(state, target, {
      territoryCityId: enemyCity.id,
    });
    expectRejected(
      applyCommandV6(foreign, foreign.humanPlayerId, {
        kind: "BUILD_FORGE",
        at: target,
      }),
      foreign,
      "TERRITORY_NOT_OWNED",
    );
    const ownUnit = must(
      state.units.find((unit) => unit.ownerId === state.humanPlayerId),
    );
    const hostile = must(
      state.units.find((unit) => unit.ownerId !== state.humanPlayerId),
    );
    const besieged = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === ownUnit.id
          ? { ...unit, at: target }
          : unit.id === hostile.id
            ? { ...unit, at: ownCity.at }
            : unit,
      ),
    });
    expectRejected(
      applyCommandV6(besieged, besieged.humanPlayerId, {
        kind: "BUILD_FORGE",
        at: target,
      }),
      besieged,
      "CITY_BESIEGED",
    );
    const pending = checked({
      ...state,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: ownCity.id,
          reachedLevel: 2,
          candidates: ["SURVEY", "STOCKPILE"],
        },
      ],
    });
    expectRejected(
      applyCommandV6(pending, pending.humanPlayerId, {
        kind: "BUILD_FORGE",
        at: target,
      }),
      pending,
      "PENDING_CHOICE",
    );
  });

  it("enforces target, technology, limit, placement, and Coin gates in frozen order", () => {
    const target = { x: 5, y: 5 };
    const farm = { x: 5, y: 4 };
    let state = stateWithBuildings([
      { at: farm, improvement: "FARM", city: 0 },
    ]);
    state = replaceTileChecked(state, target, {
      territoryCityId: must(state.cities[0]).id,
      site: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
    });
    const actor = state.humanPlayerId;
    const locked = withPlayer(state, { researchedTechs: ["GATHERING"] });
    expectRejected(
      applyCommandV6(locked, actor, { kind: "BUILD_WINDMILL", at: target }),
      locked,
      "TECH_REQUIRED",
    );

    let noFarm = stateWithBuildings([]);
    const noFarmTarget = { x: 5, y: 5 };
    noFarm = replaceTileChecked(noFarm, noFarmTarget, {
      territoryCityId: must(noFarm.cities[0]).id,
      site: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
    });
    const unmet = applyCommandV6(noFarm, noFarm.humanPlayerId, {
      kind: "BUILD_WINDMILL",
      at: noFarmTarget,
    });
    expectRejected(unmet, noFarm, "PLACEMENT_REQUIREMENT_UNMET");
    if (!unmet.accepted) {
      expect(unmet.error.params).toMatchObject({ required: 1, count: 0 });
    }

    const poor = withPlayer(state, { coins: 4 });
    expectRejected(
      applyCommandV6(poor, actor, { kind: "BUILD_WINDMILL", at: target }),
      poor,
      "INSUFFICIENT_COINS",
    );

    const built = applyCommandV6(state, actor, {
      kind: "BUILD_WINDMILL",
      at: target,
    });
    expect(built.accepted).toBe(true);
    if (!built.accepted) return;
    const another = { x: 6, y: 5 };
    const limitState = replaceTileChecked(built.state, another, {
      territoryCityId: must(built.state.cities[0]).id,
      site: null,
      terrain: "GRASS",
      resource: null,
      improvement: null,
    });
    expectRejected(
      applyCommandV6(limitState, actor, {
        kind: "BUILD_WINDMILL",
        at: another,
      }),
      limitState,
      "CITY_BUILDING_LIMIT",
    );
  });

  it("builds a Windmill with preview/reducer parity and recomputes its stable LIVE identity after a later Farm", () => {
    const target = { x: 5, y: 5 };
    const firstFarm = { x: 5, y: 4 };
    const nextFarm = { x: 5, y: 3 };
    let state = stateWithBuildings([
      { at: firstFarm, improvement: "FARM", city: 0 },
    ]);
    const cityId = must(state.cities[0]).id;
    state = replaceTileChecked(state, target, {
      territoryCityId: cityId,
      site: null,
      resource: null,
      improvement: null,
    });
    state = replaceTileChecked(state, nextFarm, {
      territoryCityId: cityId,
      site: null,
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
      improvement: null,
    });
    const command = { kind: "BUILD_WINDMILL", at: target } as const;
    const view = viewForV6(state, state.humanPlayerId);
    expect(queryPlayerCommandsV6(view)).toContainEqual(command);
    const preview = previewEconomicV6(view, command);
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        resultingContribution: 1,
        populationDeltaByCity: [{ cityId, delta: 1 }],
        contributingTiles: [firstFarm],
      },
    });
    const built = applyCommandV6(state, state.humanPlayerId, command);
    expect(built.accepted).toBe(true);
    if (!built.accepted) return;
    const windmill = must(
      built.state.populationContributions.find(
        (value) =>
          value.source.kind === "IMPROVEMENT" &&
          value.source.improvement === "WINDMILL",
      ),
    );
    expect(windmill.amount).toBe(1);
    expect(
      publicImprovementValueAtV6(
        viewForV6(built.state, state.humanPlayerId),
        target,
      )?.level,
    ).toBe(1);
    const farmed = applyCommandV6(built.state, state.humanPlayerId, {
      kind: "BUILD_FARM",
      at: nextFarm,
    });
    expect(farmed.accepted).toBe(true);
    if (!farmed.accepted) return;
    expect(
      farmed.state.populationContributions.find(
        (value) => value.id === windmill.id,
      ),
    ).toMatchObject({ id: windmill.id, amount: 2 });
    expect(
      publicImprovementValueAtV6(
        viewForV6(farmed.state, state.humanPlayerId),
        target,
      )?.level,
    ).toBe(2);
    expect(farmed.events.map((event) => event.kind).slice(0, 2)).toEqual([
      "ECONOMIC_BUILDING_BUILT",
      "CITY_ECONOMY_CHANGED",
    ]);
    const pending = farmed.state.pendingChoices[0];
    const redevelopmentState =
      pending?.kind === "CITY_REWARD"
        ? applyCommandV6(farmed.state, state.humanPlayerId, {
            kind: "CHOOSE_CITY_REWARD",
            cityId: pending.cityId,
            reachedLevel: pending.reachedLevel,
            reward: pending.candidates[0] ?? "WALLS",
          })
        : null;
    if (redevelopmentState !== null)
      expect(redevelopmentState.accepted).toBe(true);
    const afterChoice =
      redevelopmentState?.accepted === true
        ? redevelopmentState.state
        : farmed.state;
    const firstRemoved = applyCommandV6(afterChoice, state.humanPlayerId, {
      kind: "REDEVELOP",
      at: nextFarm,
    });
    expect(firstRemoved.accepted).toBe(true);
    if (!firstRemoved.accepted) return;
    expect(
      publicImprovementValueAtV6(
        viewForV6(firstRemoved.state, state.humanPlayerId),
        target,
      )?.level,
    ).toBe(1);
    const allContributorsRemoved = applyCommandV6(
      firstRemoved.state,
      state.humanPlayerId,
      { kind: "REDEVELOP", at: firstFarm },
    );
    expect(allContributorsRemoved.accepted).toBe(true);
    if (!allContributorsRemoved.accepted) return;
    expect(
      publicImprovementValueAtV6(
        viewForV6(allContributorsRemoved.state, state.humanPlayerId),
        target,
      )?.level,
    ).toBe(0);
    const processorRemoved = applyCommandV6(
      allContributorsRemoved.state,
      state.humanPlayerId,
      { kind: "REDEVELOP", at: target },
    );
    expect(processorRemoved.accepted).toBe(true);
    if (!processorRemoved.accepted) return;
    expect(
      publicImprovementValueAtV6(
        viewForV6(processorRemoved.state, state.humanPlayerId),
        target,
      ),
    ).toBeNull();
  });

  it("a cross-border basic build updates both friendly cities atomically in ascending city/event order", () => {
    const workshopAt = { x: 5, y: 5 };
    const mineAt = { x: 5, y: 4 };
    const farmAt = { x: 4, y: 5 };
    let state = stateWithBuildings([
      { at: workshopAt, improvement: "WORKSHOP", city: 1 },
      { at: mineAt, improvement: "MINE", city: 1 },
    ]);
    const firstCity = must(state.cities[0]);
    const secondCity = must(state.cities[1]);
    state = checked({
      ...state,
      cities: state.cities.map((city) =>
        city.id === secondCity.id
          ? { ...city, ownerId: state.humanPlayerId }
          : city,
      ),
    });
    state = replaceTileChecked(state, farmAt, {
      territoryCityId: firstCity.id,
      site: null,
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
      improvement: null,
    });
    const command = { kind: "BUILD_FARM", at: farmAt } as const;
    const preview = previewEconomicV6(
      viewForV6(state, state.humanPlayerId),
      command,
    );
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: [
          { cityId: firstCity.id, delta: 2 },
          { cityId: secondCity.id, delta: 1 },
        ],
      },
    });
    const result = applyCommandV6(state, state.humanPlayerId, command);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(
      result.events
        .filter((event) => event.kind === "CITY_ECONOMY_CHANGED")
        .map((event) => event.cityId),
    ).toEqual([firstCity.id, secondCity.id]);
    const kinds = result.events.map((event) => event.kind);
    expect(kinds).toEqual([
      "ECONOMIC_BUILDING_BUILT",
      "CITY_ECONOMY_CHANGED",
      "CITY_ECONOMY_CHANGED",
      "CITY_LEVELED_UP",
      "CITY_REWARD_QUEUED",
    ]);
    expect(result.state.pendingChoices).toContainEqual({
      kind: "CITY_REWARD",
      cityId: firstCity.id,
      reachedLevel: 2,
      candidates: ["SURVEY", "STOCKPILE"],
    });
    expect(
      result.state.populationContributions.find(
        (value) =>
          value.source.kind === "IMPROVEMENT" &&
          value.source.improvement === "WORKSHOP",
      ),
    ).toMatchObject({ amount: 2 });
  });

  it("offers complete sorted Stoneworks preview data exactly matching resolution", () => {
    const target = { x: 5, y: 5 };
    const quarries = [
      { x: 5, y: 4 },
      { x: 5, y: 6 },
      { x: 4, y: 4 },
      { x: 6, y: 6 },
    ];
    let state = stateWithBuildings(
      quarries.map((at) => ({
        at,
        improvement: "QUARRY" as const,
        city: 0 as const,
      })),
    );
    state = replaceTileChecked(state, target, {
      territoryCityId: must(state.cities[0]).id,
      site: null,
      resource: null,
      improvement: null,
    });
    const command = { kind: "BUILD_STONEWORKS", at: target } as const;
    const preview = previewEconomicV6(
      viewForV6(state, state.humanPlayerId),
      command,
    );
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        resultingContribution: 8,
        contributingTiles: sorted(quarries),
        oppositePairAxes: ["NORTH_SOUTH", "NORTHWEST_SOUTHEAST"],
        complete: true,
      },
    });
    const result = applyCommandV6(state, state.humanPlayerId, command);
    expect(result.accepted).toBe(true);
    if (!result.accepted || !preview.ok) return;
    const fact = result.events[0];
    expect(fact).toMatchObject({
      kind: "ECONOMIC_BUILDING_BUILT",
      populationContribution: preview.preview.resultingContribution,
    });
  });

  it("capture atomically recomputes cross-border Workshop ownership effects before elimination", () => {
    const workshopAt = { x: 5, y: 5 };
    const mineAt = { x: 5, y: 4 };
    const farmAt = { x: 4, y: 5 };
    let state = stateWithBuildings([
      { at: workshopAt, improvement: "WORKSHOP", city: 1 },
      { at: mineAt, improvement: "MINE", city: 1 },
      { at: farmAt, improvement: "FARM", city: 0 },
    ]);
    const actor = state.humanPlayerId;
    const target = must(state.cities.find((city) => city.ownerId !== actor));
    const captor = must(state.units.find((unit) => unit.ownerId === actor));
    const defender = must(
      state.units.find((unit) => unit.ownerId === target.ownerId),
    );
    state = checked({
      ...state,
      units: state.units.map((unit) =>
        unit.id === captor.id
          ? { ...unit, at: target.at, captureEligible: true }
          : unit.id === defender.id
            ? { ...unit, at: { x: 0, y: 0 } }
            : unit,
      ),
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              explored: sorted([...player.explored, target.at]),
            }
          : player,
      ),
    });
    const beforeWorkshop = must(
      state.populationContributions.find(
        (value) =>
          value.source.kind === "IMPROVEMENT" &&
          value.source.improvement === "WORKSHOP",
      ),
    );
    expect(beforeWorkshop.amount).toBe(1);
    const result = applyCommandV6(state, actor, {
      kind: "CAPTURE",
      unitId: captor.id,
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(
      result.state.populationContributions.find(
        (value) => value.id === beforeWorkshop.id,
      ),
    ).toMatchObject({ id: beforeWorkshop.id, amount: 2 });
    const kinds = result.events.map((event) => event.kind);
    expect(kinds.indexOf("CITY_ECONOMY_CHANGED")).toBeGreaterThan(
      kinds.indexOf("CITY_CAPTURED"),
    );
    expect(kinds.indexOf("CITY_ECONOMY_CHANGED")).toBeLessThan(
      kinds.indexOf("PLAYER_ELIMINATED"),
    );
    expect(result.events.every((event) => parseEventV6(event).ok)).toBe(true);
  });

  it("round-trips a spatial build through strict state, replay, save, and a fixed canonical hash", () => {
    const target = { x: 5, y: 5 };
    let state = stateWithBuildings([
      { at: { x: 5, y: 4 }, improvement: "MINE", city: 0 },
      { at: { x: 4, y: 5 }, improvement: "MINE", city: 0 },
    ]);
    state = replaceTileChecked(state, target, {
      territoryCityId: must(state.cities[0]).id,
      site: null,
      resource: null,
      improvement: null,
    });
    const command = { kind: "BUILD_FORGE", at: target } as const;
    const result = applyCommandV6(state, state.humanPlayerId, command);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(parseGameStateV6(result.state)).toEqual(result.state);
    const replay = appendReplayCommandV6(
      createReplayV6(setup),
      command,
      result.state,
    );
    expect(replay.checkpoints[0]?.stateHash).toBe(canonicalHash(result.state));
    const save = createSaveEnvelopeV6(
      { state: result.state, replay },
      "2026-08-31T18:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    const parsed = parseSaveV6(JSON.stringify(save));
    if (parsed.kind !== "VALID") throw new Error("Expected valid save");
    expect(
      publicImprovementValueAtV6(
        viewForV6(parsed.save.state, parsed.save.state.humanPlayerId),
        target,
      ),
    ).toMatchObject({
      improvement: "FORGE",
      level: 4,
      measure: "POPULATION",
    });
    expect(canonicalHash(result.state)).toBe(
      "aa827bc602f8f4e057890cdbd19675074e50cf75bb809afb002d1ecc21b0e97e",
    );
    const forge = must(
      result.state.populationContributions.find(
        (value) =>
          value.source.kind === "IMPROVEMENT" &&
          value.source.improvement === "FORGE",
      ),
    );
    expect(
      parseGameStateV6({
        ...result.state,
        populationContributions: result.state.populationContributions.map(
          (value) =>
            value.id === forge.id
              ? { ...value, amount: value.amount + 1 }
              : value,
        ),
      }),
    ).toBeNull();
  });
});

function graphFixture(
  buildings: readonly Building[],
  owners: readonly number[] = [1, 2, 3],
): { readonly board: BoardStateV6; readonly cities: readonly CityStateV6[] } {
  const cities = owners.map((ownerId, index): CityStateV6 => ({
    id: (index + 1) as CityStateV6["id"],
    ownerId: ownerId as CityStateV6["ownerId"],
    at: { x: index, y: 10 },
    level: 1,
    permanentPopulation: 0,
    economicPopulation: 0,
    population: 0,
    isCapital: index === 0,
    expanded: false,
    rewards: [],
  }));
  const byCoord = new Map(buildings.map((value) => [key(value.at), value]));
  const tiles: TileStateV6[] = [];
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < 11; x += 1) {
      const building = byCoord.get(key({ x, y }));
      tiles.push({
        at: { x, y },
        terrain: "GRASS",
        resource: null,
        improvement: building?.improvement ?? null,
        road: false,
        site: null,
        territoryCityId:
          building === undefined
            ? (cities[0]?.id ?? null)
            : (cities[building.city]?.id ?? null),
      });
    }
  }
  return { board: { width: 11, height: 11, tiles }, cities };
}

function stateWithBuildings(buildings: readonly Building[]): GameStateV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  let state = created.state;
  const cities = state.cities;
  const buildingMap = new Map(buildings.map((value) => [key(value.at), value]));
  const board: BoardStateV6 = {
    ...state.board,
    tiles: state.board.tiles.map((tile) => {
      const building = buildingMap.get(key(tile.at));
      if (building === undefined) return tile;
      return {
        ...tile,
        terrain: terrainFor(building.improvement),
        resource: null,
        improvement: building.improvement,
        site: null,
        road: false,
        territoryCityId: must(cities[building.city]).id,
      };
    }),
  };
  let nextId = state.nextEntityId;
  const contributions: PopulationContributionV6[] = buildings.map(
    (building) => ({
      id: nextId++,
      cityId: must(cities[building.city]).id,
      category: "LIVE",
      amount: spatialContributionAtV6(
        { board, cities },
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
  const updatedCities = cities.map((city) => {
    const economicPopulation = contributions
      .filter((value) => value.cityId === city.id)
      .reduce((total, value) => total + value.amount, 0);
    return resolveCityGrowthV6(
      city,
      city.permanentPopulation,
      economicPopulation,
    ).city;
  });
  const allCoords = state.board.tiles.map((tile) => tile.at);
  state = checked({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(state.humanPlayerId),
    nextEntityId: nextId,
    board,
    cities: updatedCities,
    populationContributions: contributions,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            coins: 100,
            researchedTechs: TECHNOLOGY_IDS,
            explored: allCoords,
          }
        : player,
    ),
  });
  return state;
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

function replaceTileChecked(
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
  if (parsed === null) throw new Error("invalid spatial fixture state");
  return parsed;
}

function terrainFor(
  improvement: EconomicImprovementId,
): TileStateV6["terrain"] {
  if (improvement === "LUMBER_CAMP") return "FOREST";
  if (improvement === "MINE" || improvement === "QUARRY") return "MOUNTAIN";
  return "GRASS";
}

function surrounding(center: CoordV6): readonly CoordV6[] {
  const values: CoordV6[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx !== 0 || dy !== 0)
        values.push({ x: center.x + dx, y: center.y + dy });
    }
  }
  return sorted(values);
}

function sorted(values: readonly CoordV6[]): readonly CoordV6[] {
  return [...new Map(values.map((at) => [key(at), at])).values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

function key(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("missing fixture value");
  return value;
}
