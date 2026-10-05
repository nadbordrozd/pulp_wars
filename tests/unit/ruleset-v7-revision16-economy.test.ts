import { describe, expect, it } from "vitest";
import {
  CITY_LEVEL_INCOME_CAP_V7,
  MARKET_INCOME_CAP_V7,
  TECHNOLOGY_IDS_V7,
  TECHNOLOGY_RESEARCH_COST_V7,
  applyCommandV7,
  cityIncomeV7,
  cityLevelIncomeV7,
  createPlayableGameV7,
  factionTreeV7,
  marketCoinsV7,
  marketIncomeForCityV7,
  playerIncomeV7,
  playerTechnologyResearchCostV7,
  previewEconomicV7,
  queryTechnologyTreeV7,
  technologyResearchCostV7,
  viewForV7,
  type CityStateV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { cityIncomeForViewerV7 } from "../../src/render/dom/app-view-v7";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
  setupV7,
} from "../fixtures/v7-builders";

// Revision 16c (`pulp_wars-4gc`): the numeric economy deflation of
// docs/product/RULESET_7_REVISION_16.md section 6.2 (tier-2/3 research cost
// slopes, level income term capped at 4, Market capped at 3), tested as
// section 10.3 requires.

/**
 * Section 6.2 prices, `C` = 1..8 cities: [tier 1, tier 2, tier 3]. The tier
 * 3 column is the early economy tweak's (`pulp_wars-if6`, 7r41): base 9
 * instead of revision 16's 12, the step of 5 unchanged
 * (docs/product/RULESET_7_CURRENT.md section 6.1).
 */
const RESEARCH_COST_TABLE: readonly (readonly [number, number, number])[] = [
  [5, 7, 9],
  [6, 10, 14],
  [7, 13, 19],
  [8, 16, 24],
  [9, 19, 29],
  [10, 22, 34],
  [11, 25, 39],
  [12, 28, 44],
];

describe("ruleset-7 revision-16 research costs", () => {
  it("prices every tier at C = 1-8 as section 6.2 states", () => {
    expect(TECHNOLOGY_RESEARCH_COST_V7).toEqual({
      1: { base: 5, step: 1 },
      2: { base: 7, step: 3 },
      3: { base: 9, step: 5 },
    });
    expect(
      RESEARCH_COST_TABLE.map((_, index) =>
        ([1, 2, 3] as const).map((tier) =>
          technologyResearchCostV7(tier, index + 1),
        ),
      ),
    ).toEqual(RESEARCH_COST_TABLE);
  });

  it("keeps the free opener: the first tier-1 technology costs 0 at any C", () => {
    for (let cities = 1; cities <= 8; cities += 1) {
      const [tier1, tier2, tier3] = RESEARCH_COST_TABLE[cities - 1] ?? [];
      expect(playerTechnologyResearchCostV7(1, cities, 0)).toBe(0);
      // Only tier 1 is free, and only while nothing is researched.
      expect(playerTechnologyResearchCostV7(2, cities, 0)).toBe(tier2);
      expect(playerTechnologyResearchCostV7(3, cities, 0)).toBe(tier3);
      expect(playerTechnologyResearchCostV7(1, cities, 1)).toBe(tier1);
      expect(playerTechnologyResearchCostV7(2, cities, 1)).toBe(tier2);
      expect(playerTechnologyResearchCostV7(3, cities, 5)).toBe(tier3);
    }
  });

  it("prices the whole tree as the section 6.2 table (one tier-1 free)", () => {
    const whole = (cities: number, dryLand: boolean) =>
      factionTreeV7("ORIGINAL")
        .nodes.filter((node) => !dryLand || node.branch !== "NAVAL")
        .reduce(
          (total, node) => total + technologyResearchCostV7(node.tier, cities),
          0,
        ) - technologyResearchCostV7(1, cities);
    expect(factionTreeV7("ORIGINAL").nodes).toHaveLength(25);
    expect([1, 2, 3, 5, 6, 8].map((cities) => whole(cities, false))).toEqual([
      180, 264, 348, 516, 600, 768,
    ]);
    // Dry Land has 20 technologies (no Naval branch of five).
    expect(whole(1, true)).toBe(180 - 5 - 7 - 9 - 7 - 9);
  });

  it("offers the revision-16 costs in the public tree and charges them", () => {
    const initial = richV7(initialV7(), 1_000);
    const opened = initialV7().players.find(
      (player) => player.id === initial.humanPlayerId,
    );
    expect(opened?.researchedTechs).toEqual([]);
    const tree = queryTechnologyTreeV7(
      viewForV7(initial, initial.humanPlayerId),
    );
    const costOf = (id: TechnologyIdV7) =>
      tree.nodes.find((node) => node.id === id)?.cost;
    // One city: the free opener, then 7 and 9 (12 before `pulp_wars-if6`).
    expect(costOf("GATHERING")).toBe(0);
    expect(costOf("FARMING")).toBe(7);
    expect(costOf("COMMERCE")).toBe(9);

    let state = initial;
    for (const tech of ["GATHERING", "FARMING"] as const) {
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "RESEARCH",
        tech,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events[0]).toMatchObject({
        kind: "TECH_RESEARCHED",
        cost: tech === "GATHERING" ? 0 : 7,
      });
      state = result.state;
    }
    expect(
      state.players.find((player) => player.id === state.humanPlayerId)?.coins,
    ).toBe(1_000 - 7);
  });
});

describe("ruleset-7 revision-16 income caps", () => {
  it("caps the level term of city income at 4", () => {
    expect(CITY_LEVEL_INCOME_CAP_V7).toBe(4);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(cityLevelIncomeV7)).toEqual([
      1, 2, 3, 4, 4, 4, 4, 4,
    ]);
    const state = initialV7();
    const capital = required(
      state.cities.find((city) => city.ownerId === state.humanPlayerId),
    );
    const at = (level: number) =>
      cityIncomeV7(state, { ...capital, level, population: 0 });
    // Level term + capital 1; levels 5+ keep rewards but add no income.
    expect([1, 3, 4, 5, 6, 9].map(at)).toEqual([2, 4, 5, 5, 5, 5]);
  });

  it("pays a Market 1-3 Coins with and without Commerce", () => {
    expect(MARKET_INCOME_CAP_V7).toBe(3);
    expect([1, 2, 3, 4].map(marketCoinsV7)).toEqual([1, 2, 3, 3]);
    for (const commerce of [false, true]) {
      const paid = [1, 2, 3].map((families) => {
        const fixture = marketFixture(families, commerce);
        const view = viewForV7(fixture.state, fixture.state.humanPlayerId);
        const preview = previewEconomicV7(view, {
          kind: "BUILD_MARKET",
          at: MARKET_AT,
        });
        if (!preview.ok) throw new Error(preview.error);
        const result = applyCommandV7(
          fixture.state,
          fixture.state.humanPlayerId,
          { kind: "BUILD_MARKET", at: MARKET_AT },
        );
        if (!result.accepted) throw new Error(result.error.code);
        const built = result.events.find(
          (event) => event.kind === "ECONOMIC_BUILDING_BUILT",
        );
        const city = required(
          result.state.cities.find((item) => item.id === fixture.capital.id),
        );
        return {
          event:
            built?.kind === "ECONOMIC_BUILDING_BUILT" && built.marketIncome,
          preview: preview.preview.coinIncomeDeltaByCity,
          city: marketIncomeForCityV7(result.state, city),
          // The Market adds exactly its Coins to the city's Start Turn income.
          income:
            cityIncomeV7(result.state, city) -
            cityIncomeV7(fixture.state, fixture.capital),
        };
      });
      // 1 + adjacent families (1, 2, 3), capped at 3.
      expect(paid, `commerce ${commerce}`).toEqual(
        [2, 3, 3].map((coins) => ({
          event: coins,
          preview: [{ cityId: expect.any(Number) as number, delta: coins }],
          city: coins,
          income: coins,
        })),
      );
      // A Market whose contributors are gone pays the base 1.
      const lone = marketFixture(0, commerce, true);
      expect(marketIncomeForCityV7(lone.state, lone.capital)).toBe(1);
    }
  });
});

describe("ruleset-7 revision-16 income previews", () => {
  it("previews equal Start Turn income in natural play with capped levels and Markets", () => {
    const setup: MatchSetupV7 = {
      // pulp_wars-0hi.3: with the revision-20 section 6.3 Human HP the
      // seed-4 match ends in round 36; seed 0 reaches the cap (of seeds 0-7,
      // so do 2, 5, 6, and 7).
      ...setupV7(0, 1),
      // A 20 x 20 duel lasts past round 40, with level 5+ cities and Markets.
      width: 20,
      height: 20,
      mapType: "PANGEA",
    };
    const match = runAiMatchV7(setup, { maxRounds: 40, maxCommands: 30_000 });
    expect(match.errors).toEqual([]);
    expect(match.termination).toBe("ROUND_CAP");
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let checkedEndTurns = 0;
    let cappedCityTurns = 0;
    let cappedMarketTurns = 0;
    let comparedAwards = 0;
    const uiIncome = (at: GameStateV7, playerId: PlayerId) => {
      const view = viewForV7(at, playerId);
      return at.cities
        .filter((city) => city.ownerId === playerId)
        .reduce(
          (total, city) => total + (cityIncomeForViewerV7(view, city.id) ?? 0),
          0,
        );
    };
    for (const record of match.commandLog) {
      if (record.command.kind === "END_TURN") {
        const view = viewForV7(state, record.playerId);
        const owned = state.cities.filter(
          (city) => city.ownerId === record.playerId,
        );
        // The DOM projection equals the engine's income for the same state.
        expect(uiIncome(state, record.playerId), `round ${state.round}`).toBe(
          playerIncomeV7(state, record.playerId).totalCoins,
        );
        checkedEndTurns += 1;
        cappedCityTurns += owned.filter(
          (city) => city.level > CITY_LEVEL_INCOME_CAP_V7,
        ).length;
        cappedMarketTurns += view.improvementValues.filter(
          (value) =>
            value.improvement === "MARKET" &&
            value.level === MARKET_INCOME_CAP_V7,
        ).length;
      }
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events as readonly DomainEventV7[]) {
        if (event.kind === "INCOME_PREVIEWED")
          expect(event.totalCoins).toBe(
            playerIncomeV7(state, event.playerId).totalCoins,
          );
        // The income the next player saw projected just before its turn
        // started is the income its Start Turn awards.
        if (event.kind === "INCOME_AWARDED") {
          expect(event.totalCoins, `round ${state.round}`).toBe(
            uiIncome(state, event.playerId),
          );
          comparedAwards += 1;
        }
      }
      state = result.state;
    }
    expect(checkedEndTurns).toBeGreaterThan(40);
    expect(comparedAwards).toBeGreaterThan(40);
    // The match exercises both caps.
    expect(cappedCityTurns).toBeGreaterThan(0);
    expect(cappedMarketTurns).toBeGreaterThan(0);
  }, 600_000);
});

const MARKET_AT: CoordV7 = { x: 2, y: 7 };

/**
 * The seed-7290 capital with a Market site at (2, 7) and 0-3 adjacent
 * economic families (Farm, Lumber Camp, Mine), with or without Commerce.
 * With `built`, the Market already stands on the site.
 */
function marketFixture(
  families: number,
  commerce: boolean,
  built = false,
): { readonly state: GameStateV7; readonly capital: CityStateV7 } {
  const base = richV7(allTechsV7(exploredAllV7(initialV7(7_290))));
  const capital = required(
    base.cities.find((city) => city.ownerId === base.humanPlayerId),
  );
  const contributors = [
    { at: { x: 1, y: 7 }, improvement: "FARM" as const, amount: 2 },
    { at: { x: 1, y: 8 }, improvement: "LUMBER_CAMP" as const, amount: 1 },
    { at: { x: 3, y: 7 }, improvement: "MINE" as const, amount: 2 },
  ].slice(0, families);
  const economic = contributors.reduce((sum, item) => sum + item.amount, 0);
  const withoutCommerce = TECHNOLOGY_IDS_V7.filter(
    (tech) => tech !== "COMMERCE",
  );
  // Grow the capital from its contributors (levels 2 and 3 cost 2 and 3).
  let level = 1;
  let spent = 0;
  while (economic - spent >= level + 1) {
    level += 1;
    spent += level;
  }
  const city: CityStateV7 = {
    ...capital,
    level,
    economicPopulation: economic,
    population: economic - spent,
    rewards: (
      [
        { reachedLevel: 2, reward: "SURVEY" },
        { reachedLevel: 3, reward: "WALLS" },
      ] as const
    ).filter((reward) => reward.reachedLevel <= level),
  };
  const state = checkedV7({
    ...base,
    players: base.players.map((player) =>
      player.id === base.humanPlayerId && !commerce
        ? { ...player, researchedTechs: withoutCommerce }
        : player,
    ),
    cities: base.cities.map((item) => (item.id === capital.id ? city : item)),
    nextEntityId: (base.nextEntityId +
      contributors.length) as GameStateV7["nextEntityId"],
    populationContributions: contributors.map((contributor, index) => ({
      id: (base.nextEntityId + index) as GameStateV7["nextEntityId"],
      cityId: capital.id,
      category: "LIVE" as const,
      amount: contributor.amount,
      source: {
        kind: "IMPROVEMENT" as const,
        improvement: contributor.improvement,
        at: contributor.at,
      },
    })),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const contributor = contributors.find((item) => same(item.at, tile.at));
        if (contributor !== undefined)
          return {
            ...tile,
            terrain:
              contributor.improvement === "MINE"
                ? ("MOUNTAIN" as const)
                : contributor.improvement === "LUMBER_CAMP"
                  ? ("FOREST" as const)
                  : ("GRASS" as const),
            resource:
              contributor.improvement === "MINE"
                ? ("ORE" as const)
                : contributor.improvement === "FARM"
                  ? ("FERTILE_GROUND" as const)
                  : null,
            improvement: contributor.improvement,
            road: false,
          };
        if (same(tile.at, MARKET_AT))
          return {
            ...tile,
            terrain: "GRASS" as const,
            resource: null,
            improvement: built ? ("MARKET" as const) : null,
            road: false,
          };
        // No other improvement or Road beside the site.
        if (
          Math.abs(tile.at.x - MARKET_AT.x) <= 1 &&
          Math.abs(tile.at.y - MARKET_AT.y) <= 1 &&
          tile.site === null
        )
          return { ...tile, improvement: null, road: false };
        return tile;
      }),
    },
  });
  return { state, capital: city };
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}
