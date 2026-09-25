import { describe, expect, it } from "vitest";
import { scoreCommandV7 } from "../../src/ai/v7";
import { cityId, playerId } from "../../src/engine/model/ids";
import {
  ORIGINAL_BASELINE_V5_NODES,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  previewEconomicV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  spatialContributionAtV7,
  validateMovementPathV7,
  viewForV7,
  type CoordV7,
  type EconomyGraphV7,
  type GameStateV7,
  type ImprovementIdV7,
  type PlayerViewV7,
  type PopulationContributionV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

describe("Ruleset 7 revision 9 Industry and shared adjacency", () => {
  it("uses the r9 identity and the two exact Industry branches", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r10");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r10.current");
    expect(TECHNOLOGY_IDS_V7).toEqual(
      expect.arrayContaining([
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ]),
    );
    const lane = ORIGINAL_BASELINE_V5_NODES.filter(
      (node) => node.branch === "INDUSTRY",
    );
    expect(
      lane.map((node) => [node.id, node.tier, node.prerequisites]),
    ).toEqual([
      ["DRILL", 1, []],
      ["ENGINEERING", 2, ["DRILL"]],
      ["METALLURGY", 3, ["ENGINEERING"]],
      ["FORTIFICATION", 2, ["DRILL"]],
      ["EXPLOSIVES", 3, ["FORTIFICATION"]],
    ]);
    expect(lane[0]?.unlocks).toEqual(
      expect.arrayContaining([
        { kind: "UNIT_ROLE", role: "GUARD" },
        { kind: "FIRST_HOSTILE_CAPTURE_SPOILS", coins: 2 },
      ]),
    );
    expect(lane[1]?.unlocks).toEqual(
      expect.arrayContaining([
        { kind: "COMMAND", command: "BUILD_MINE" },
        { kind: "COMMAND", command: "BUILD_WORKSHOP" },
        { kind: "COMMAND", command: "REDEVELOP" },
        { kind: "RESOURCE_REVEAL", resources: ["ORE"] },
        { kind: "MOUNTAIN_MOVEMENT" },
      ]),
    );
    expect(lane[2]?.unlocks).toEqual(
      expect.arrayContaining([
        { kind: "COMMAND", command: "BUILD_FORGE" },
        { kind: "ARMS_INDUSTRY_DISCOUNT", coins: 1 },
      ]),
    );
    expect(lane[3]?.unlocks).toContainEqual({
      kind: "COMMAND",
      command: "BUILD_FIELD_DEFENSE",
    });
    expect(lane[4]?.unlocks).toEqual(
      expect.arrayContaining([
        { kind: "COMMAND", command: "PILLAGE" },
        { kind: "COMMAND", command: "BLAST_MOUNTAIN" },
      ]),
    );
  });

  it("lets Engineering reveal Ore and enter Mountains", () => {
    const base = exploredAllV7(initialV7(8_807));
    const unit = base.units.find(
      (candidate) => candidate.ownerId === base.humanPlayerId,
    );
    if (unit === undefined) throw new Error("human unit missing");
    const destination = eightNeighbors(unit.at).find(
      (at) =>
        at.x >= 0 &&
        at.y >= 0 &&
        at.x < base.board.width &&
        at.y < base.board.height &&
        !base.units.some((candidate) => same(candidate.at, at)),
    );
    if (destination === undefined)
      throw new Error("mountain destination missing");
    const state = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: ["GATHERING", "DRILL", "ENGINEERING"],
            }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, destination)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: "MOUNTAIN" as const,
                resource: "ORE" as const,
                improvement: null,
                site: null,
              }
            : tile,
        ),
      },
    });
    const mover = state.units.find((candidate) => candidate.id === unit.id);
    if (mover === undefined) throw new Error("mover missing");
    expect(validateMovementPathV7(state, mover, [destination])).toMatchObject({
      legal: true,
    });
    expect(
      viewForV7(state, state.humanPlayerId).board.tiles.find((tile) =>
        same(tile.at, destination),
      ),
    ).toMatchObject({ terrain: "MOUNTAIN", resource: "ORE" });
  });

  it.each([
    ["WINDMILL", "FARM", 8],
    ["SAWMILL", "LUMBER_CAMP", 8],
    ["FORGE", "MINE", 6],
  ] as const)(
    "%s counts only eight-neighbor same-owner %s contributors and keeps its cap %i",
    (processor, basic, cap) => {
      const graph = adjacencyGraph(processor, basic);
      const result = spatialContributionAtV7(graph, { x: 3, y: 3 }, processor);
      expect(result.contributingTiles).toEqual([
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ]);
      expect(result.population).toBe(2);
      expect(result.placementCount).toBe(2);

      const saturated = graphWithImprovements(
        processor,
        eightNeighbors({ x: 3, y: 3 }).map((at, index) => ({
          at,
          improvement: basic,
          city: cityId(index + 1),
        })),
      );
      expect(
        spatialContributionAtV7(saturated, { x: 3, y: 3 }, processor)
          .population,
      ).toBe(cap);
    },
  );

  it("lets one Lumber Camp boost two, three, and four distinct cities' Sawmills", () => {
    const camp = { x: 3, y: 3 };
    const positions = [
      { x: 3, y: 2 },
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 2, y: 3 },
    ];
    for (const count of [2, 3, 4]) {
      const graph = graphWithImprovements("SAWMILL", [
        { at: camp, improvement: "LUMBER_CAMP", city: cityId(1) },
        ...positions.slice(0, count).map((at, index) => ({
          at,
          improvement: "SAWMILL" as const,
          city: cityId(index + 2),
        })),
      ]);
      expect(
        positions
          .slice(0, count)
          .map(
            (at) => spatialContributionAtV7(graph, at, "SAWMILL").population,
          ),
      ).toEqual(Array(count).fill(1));
    }
  });

  it("recomputes both processor cities when a shared Camp is built, redeveloped, or captured", () => {
    const fixture = sharedCampState();
    const build = { kind: "BUILD_LUMBER_CAMP", at: fixture.camp } as const;
    const buildPreview = previewEconomicV7(
      viewForV7(fixture.before, fixture.before.humanPlayerId),
      build,
    );
    expect(buildPreview).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: expect.arrayContaining([
          { cityId: fixture.firstCityId, delta: 2 },
          { cityId: fixture.secondCityId, delta: 1 },
        ]),
      },
    });
    const built = applyCommandV7(
      fixture.before,
      fixture.before.humanPlayerId,
      build,
    );
    if (!built.accepted) throw new Error(built.error.code);
    expect(amountAt(built.state.populationContributions, fixture.left)).toBe(1);
    expect(amountAt(built.state.populationContributions, fixture.right)).toBe(
      1,
    );
    expect(cityDelta(fixture.before, built.state, fixture.firstCityId)).toBe(2);
    expect(cityDelta(fixture.before, built.state, fixture.secondCityId)).toBe(
      1,
    );

    let builtState = built.state;
    while (builtState.pendingChoices[0] !== undefined) {
      const pending = builtState.pendingChoices[0];
      const choice = applyCommandV7(builtState, builtState.humanPlayerId, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: pending.cityId,
        reachedLevel: pending.reachedLevel,
        reward: pending.candidates[0] ?? "TREASURY",
      });
      if (!choice.accepted) throw new Error(choice.error.code);
      builtState = choice.state;
    }
    const remove = { kind: "REDEVELOP", at: fixture.camp } as const;
    expect(
      previewEconomicV7(
        viewForV7(builtState, builtState.humanPlayerId),
        remove,
      ),
    ).toMatchObject({
      ok: true,
      preview: {
        populationDeltaByCity: expect.arrayContaining([
          { cityId: fixture.firstCityId, delta: -2 },
          { cityId: fixture.secondCityId, delta: -1 },
        ]),
      },
    });
    const redeveloped = applyCommandV7(
      builtState,
      builtState.humanPlayerId,
      remove,
    );
    if (!redeveloped.accepted) throw new Error(redeveloped.error.code);
    expect(
      amountAt(redeveloped.state.populationContributions, fixture.left),
    ).toBe(0);
    expect(
      amountAt(redeveloped.state.populationContributions, fixture.right),
    ).toBe(0);

    const capturedCities = builtState.cities.map((city) =>
      city.id === fixture.secondCityId
        ? { ...city, ownerId: fixture.enemyId }
        : city,
    );
    const captured = recomputeLiveEconomyV7(
      builtState,
      { board: builtState.board, cities: capturedCities },
      builtState.populationContributions,
    );
    expect(amountAt(captured.populationContributions, fixture.left)).toBe(1);
    expect(amountAt(captured.populationContributions, fixture.right)).toBe(0);
  });

  it.each([
    ["BUILD_WINDMILL", "FARM", "GRASS", 0],
    ["BUILD_SAWMILL", "LUMBER_CAMP", "FOREST", 0],
    ["BUILD_FORGE", "MINE", "MOUNTAIN", -1],
  ] as const)(
    "offers, previews, and scores cross-city diagonal %s placement",
    (kind, basic, basicTerrain, expectedImmediateValue) => {
      const { view, target, contributor } = crossCityProcessorView(
        basic,
        basicTerrain,
      );
      const command = { kind, at: target };
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      expect(previewEconomicV7(view, command)).toMatchObject({
        ok: true,
        preview: {
          resultingContribution: 1,
          contributingTiles: [contributor],
        },
      });
      expect(scoreCommandV7(view, command)).toMatchObject({
        immediateValue: expectedImmediateValue,
      });
      expect(scoreCommandV7(view, command).priority).toBeGreaterThan(0);
    },
  );
});

function adjacencyGraph(
  processor: "WINDMILL" | "SAWMILL" | "FORGE",
  basic: "FARM" | "LUMBER_CAMP" | "MINE",
): EconomyGraphV7 {
  return graphWithImprovements(processor, [
    { at: { x: 2, y: 2 }, improvement: basic, city: cityId(2) },
    { at: { x: 3, y: 2 }, improvement: basic, city: cityId(3) },
    // This contributor is connected to the north tile but two steps away.
    { at: { x: 3, y: 1 }, improvement: basic, city: cityId(4) },
    // This adjacent contributor belongs to the other player.
    { at: { x: 4, y: 3 }, improvement: basic, city: cityId(9) },
  ]);
}

function graphWithImprovements(
  processor: "WINDMILL" | "SAWMILL" | "FORGE",
  entries: readonly {
    readonly at: CoordV7;
    readonly improvement: ImprovementIdV7;
    readonly city: ReturnType<typeof cityId>;
  }[],
): EconomyGraphV7 {
  const owner = playerId(1);
  const enemy = playerId(2);
  const cities = Array.from({ length: 9 }, (_, index) => ({
    id: cityId(index + 1),
    ownerId: index === 8 ? enemy : owner,
    at: { x: index % 7, y: Math.floor(index / 7) },
    isCapital: index === 0,
  }));
  const byCoord = new Map(
    [
      {
        at: { x: 3, y: 3 },
        improvement: processor as ImprovementIdV7,
        city: cityId(1),
      },
      ...entries,
    ].map((entry) => [`${entry.at.y},${entry.at.x}`, entry]),
  );
  return {
    board: {
      width: 7,
      height: 7,
      tiles: Array.from({ length: 49 }, (_, index) => {
        const at = { x: index % 7, y: Math.floor(index / 7) };
        const entry = byCoord.get(`${at.y},${at.x}`);
        return {
          at,
          improvement: entry?.improvement ?? null,
          road: false,
          territoryCityId: entry?.city ?? cityId(1),
        };
      }),
    },
    cities,
  };
}

function sharedCampState(): {
  readonly before: GameStateV7;
  readonly firstCityId: GameStateV7["cities"][number]["id"];
  readonly secondCityId: GameStateV7["cities"][number]["id"];
  readonly enemyId: GameStateV7["players"][number]["id"];
  readonly camp: CoordV7;
  readonly left: CoordV7;
  readonly right: CoordV7;
} {
  const initial = exploredAllV7(initialV7(8_808));
  const humanUnit = initial.units.find(
    (unit) => unit.ownerId === initial.humanPlayerId,
  );
  const village = initial.board.tiles.find(
    (tile) =>
      tile.site === "VILLAGE" &&
      !initial.units.some((unit) => same(unit.at, tile.at)),
  );
  if (humanUnit === undefined || village === undefined)
    throw new Error("capture fixture missing");
  const captureReady: GameStateV7 = {
    ...initial,
    treasureChests: initial.treasureChests.filter(
      (chest) => !same(chest, village.at),
    ),
    units: initial.units.map((unit) =>
      unit.id === humanUnit.id
        ? {
            ...unit,
            at: village.at,
            captureEligible: true,
            activation: {
              moved: false,
              movedPathLength: 0,
              attacked: false,
              attacksUsed: 0,
              tendedThisTurn: false,
              inspired: false,
              overrunActive: false,
              recovered: false,
              captured: false,
              handled: false,
              specialActed: false,
            },
          }
        : unit,
    ),
  };
  const capture = applyCommandV7(captureReady, initial.humanPlayerId, {
    kind: "CAPTURE",
    unitId: humanUnit.id,
  });
  if (!capture.accepted) throw new Error(`capture: ${capture.error.code}`);
  const base = allTechsV7(exploredAllV7(capture.state));
  const owned = base.cities.filter(
    (city) => city.ownerId === base.humanPlayerId,
  );
  const first = owned[0];
  const second = owned[1];
  const enemy = base.players.find((player) => player.id !== base.humanPlayerId);
  if (first === undefined || second === undefined || enemy === undefined)
    throw new Error("fixture entities missing");
  const camp = base.board.tiles.find(
    (tile) =>
      tile.at.x > 0 &&
      tile.at.x < base.board.width - 1 &&
      tile.site === null &&
      !base.units.some((unit) => same(unit.at, tile.at)) &&
      !base.treasureChests.some((chest) => same(chest, tile.at)) &&
      [tile.at.x - 1, tile.at.x + 1].every((x) => {
        const adjacent = base.board.tiles[tile.at.y * base.board.width + x];
        return (
          adjacent?.site === null &&
          !base.units.some((unit) => same(unit.at, adjacent.at)) &&
          !base.treasureChests.some((chest) => same(chest, adjacent.at))
        );
      }),
  )?.at;
  if (camp === undefined) throw new Error("economy fixture location missing");
  const left = { x: camp.x - 1, y: camp.y };
  const right = { x: camp.x + 1, y: camp.y };
  const board = {
    ...base.board,
    tiles: base.board.tiles.map((tile) => {
      const patch = same(tile.at, left)
        ? { territoryCityId: first.id, improvement: "SAWMILL" as const }
        : same(tile.at, right)
          ? { territoryCityId: second.id, improvement: "SAWMILL" as const }
          : same(tile.at, camp)
            ? {
                territoryCityId: first.id,
                terrain: "FOREST" as const,
                resource: null,
                improvement: null,
              }
            : null;
      return patch === null
        ? tile
        : {
            ...tile,
            ...patch,
            biome: "WOODLAND" as const,
            resource: null,
            road: false,
            fieldDefense: false,
            site: null,
          };
    }),
  };
  const firstContributionId = base.nextEntityId;
  const processorContributions: PopulationContributionV7[] = [
    {
      id: firstContributionId,
      cityId: first.id,
      category: "LIVE",
      amount: 0,
      source: { kind: "IMPROVEMENT", improvement: "SAWMILL", at: left },
    },
    {
      id: firstContributionId + 1,
      cityId: second.id,
      category: "LIVE",
      amount: 0,
      source: { kind: "IMPROVEMENT", improvement: "SAWMILL", at: right },
    },
  ];
  const recalculated = recomputeLiveEconomyV7(
    base,
    { board, cities: base.cities },
    processorContributions,
  );
  const before = checkedV7({
    ...base,
    board,
    cities: recalculated.cities,
    nextEntityId: firstContributionId + 2,
    populationContributions: recalculated.populationContributions,
    players: base.players.map((player) => ({
      ...player,
      coins: player.id === base.humanPlayerId ? 1_000 : player.coins,
    })),
  });
  return {
    before,
    firstCityId: first.id,
    secondCityId: second.id,
    enemyId: enemy.id,
    camp,
    left,
    right,
  };
}

function cityDelta(
  before: GameStateV7,
  after: GameStateV7,
  city: GameStateV7["cities"][number]["id"],
): number {
  const prior = before.cities.find((candidate) => candidate.id === city);
  const next = after.cities.find((candidate) => candidate.id === city);
  if (prior === undefined || next === undefined)
    throw new Error("city missing");
  return next.economicPopulation - prior.economicPopulation;
}

function crossCityProcessorView(
  basic: "FARM" | "LUMBER_CAMP" | "MINE",
  basicTerrain: "GRASS" | "FOREST" | "MOUNTAIN",
): {
  readonly view: PlayerViewV7;
  readonly target: CoordV7;
  readonly contributor: CoordV7;
} {
  const base = allTechsV7(exploredAllV7(initialV7(8_809)));
  const raw = viewForV7(base, base.humanPlayerId);
  const first = raw.cities[0];
  const second = raw.cities[1];
  if (first === undefined || second === undefined)
    throw new Error("fixture cities missing");
  const target = { x: 5, y: 5 };
  const contributor = { x: 6, y: 6 };
  const view: PlayerViewV7 = {
    ...raw,
    viewer: { ...raw.viewer, coins: 1_000 },
    leaderboard: raw.leaderboard.map((entry) =>
      entry.isViewer ? { ...entry, cityCount: 2 } : { ...entry, cityCount: 0 },
    ),
    cities: raw.cities.map((city) => ({
      ...city,
      ownerId: raw.viewer.id,
    })),
    units: [],
    board: {
      ...raw.board,
      tiles: raw.board.tiles.map((tile) => {
        if (same(tile.at, target))
          return {
            ...tile,
            explored: true,
            biome: "WOODLAND" as const,
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            site: null,
            territoryCityId: first.id,
            territoryOwnerId: raw.viewer.id,
          };
        if (same(tile.at, contributor))
          return {
            ...tile,
            explored: true,
            biome: "WOODLAND" as const,
            terrain: basicTerrain,
            resource: null,
            improvement: basic,
            site: null,
            territoryCityId: second.id,
            territoryOwnerId: raw.viewer.id,
          };
        return { ...tile, explored: true };
      }) as PlayerViewV7["board"]["tiles"],
    },
  };
  return { view, target, contributor };
}

function amountAt(
  contributions: readonly PopulationContributionV7[],
  at: CoordV7,
): number | undefined {
  return contributions.find(
    (contribution) =>
      contribution.source.kind === "IMPROVEMENT" &&
      same(contribution.source.at, at),
  )?.amount;
}

function eightNeighbors(at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0) result.push({ x: at.x + dx, y: at.y + dy });
  return result;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}
