import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, inspectNormalArmyV7 } from "../../src/ai/v7";
import {
  ACHIEVEMENT_IDS_V7,
  ACHIEVEMENT_REQUIRED_TECH_V7,
  CONQUEROR_CAPTURES_V7,
  ENGINEER_MILL_OUTPUT_V7,
  ICE_SEA_DOG_UNITS_V7,
  LAND_BARON_CITIES_V7,
  MONUMENT_POPULATION_V7,
  MUSTER_KINDS_V7,
  PRIOR_RULESET_7_IDS,
  REWARD_UNIT_LEVEL_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SEA_DOG_SHIPS_V7,
  SLAYER_KILLS_V7,
  TECHNOLOGY_RESEARCH_COST_V7,
  applyCommandV7,
  cityEconomicMiracleIncomeV7,
  cityIncomeV7,
  playerIncomeV7,
  ECONOMIC_MIRACLE_COINS_V7,
  effectiveRoleRuleV7,
  explorerTilesRequiredV7,
  growthSpentV7,
  parseEventV7,
  parseGameStateV7,
  playerTechnologyResearchCostV7,
  previewEconomicV7,
  previewMonumentV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  resolveCityGrowthV7,
  rewardCandidatesForLevelV7,
  spatialContributionAtV7,
  technologyResearchCostV7,
  viewForV7,
  type AchievementIdV7,
  type CityStateV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type EconomyGraphV7,
  type FactionIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type RewardIdV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  ACHIEVEMENT_GOALS_V7,
  ACHIEVEMENT_HELP_TIP_V7,
} from "../../src/render/achievement-presentation-v7";
import {
  ECONOMY_REJIG_HELP_TIP_V7,
  researchPriceRuleTextV7,
  rewardGiantHelpTipV7,
  rewardGiantOfferTextV7,
} from "../../src/render/economy-presentation-v7";
import { ICE_SEA_DOG_GOAL_V7 } from "../../src/render/frozen-sea-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { rewardStateV7, withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import {
  READY_V7,
  applyOkV7,
  endTurnUntilV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { acceptV7, navalUnitAtV7 } from "../fixtures/v7-naval-branch";
import {
  at,
  attackV7,
  fieldV7,
  patchTileV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * The economy rejig (`pulp_wars-w49.16`, `pulp-wars-poc-7r73`;
 * docs/product/RULESET_7_ECONOMY_REJIG.md, and Part C of
 * docs/product/RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md): mills count
 * contributors across their owner's cities, Monuments give 3, research is
 * priced per city, the achievements are harder and need no technology, and
 * every city offers its faction's giant once from level 6 (since
 * `pulp_wars-zypi` at every level from 5, with no once-per-city limit).
 *
 * The four-seat field (tests/fixtures/v7-revision20.ts, 16 by 16): seat 0's
 * capital is on (13, 4) with territory x 12-14, y 3-5; the villages are on
 * (10, 4), (7, 4), (13, 10), (10, 10), (4, 7), and (4, 10); the other
 * capitals on (4, 4), (13, 13), and (4, 13). A captured village holds the
 * 3 by 3 around its center, so the capital and the village on (10, 4)
 * touch along x 11 | 12.
 */

const FOUR: readonly FactionIdV7[] = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
];
const CAPITAL = at(13, 4);
const VILLAGES: readonly CoordV7[] = [
  at(10, 4),
  at(7, 4),
  at(13, 10),
  at(10, 10),
  at(4, 7),
  at(4, 10),
];
const ENEMY_CAPITALS: readonly CoordV7[] = [at(4, 4), at(13, 13), at(4, 13)];

type Events = readonly DomainEventV7[];
interface Step {
  readonly state: GameStateV7;
  readonly events: Events;
}

const unlocks = (events: Events): readonly AchievementIdV7[] =>
  events.flatMap((event) =>
    event.kind === "ACHIEVEMENT_UNLOCKED" ? [event.achievement] : [],
  );
const entitled = (
  state: GameStateV7,
  seat: number,
  achievement: AchievementIdV7,
): boolean =>
  state.players
    .find((player) => player.seat === seat)
    ?.achievementEntitlements.find((item) => item.achievement === achievement)
    ?.unlocked === true;
const progress = (
  state: GameStateV7,
  seat: number,
  achievement: AchievementIdV7,
): unknown =>
  viewForV7(state, seatIdV7(state, seat)).achievementProgress.find(
    (item) => item.achievement === achievement,
  );
const cityAt = (state: GameStateV7, where: CoordV7): CityStateV7 => {
  const city = state.cities.find((item) => sameV7(item.at, where));
  if (city === undefined) throw new Error("no city there");
  return city;
};
const coinsOf = (state: GameStateV7, seat = 0): number =>
  state.players.find((player) => player.seat === seat)?.coins ?? 0;

/** Applies an accepted command; its events and state pass the schemas. */
function applied(state: GameStateV7, seat: number, command: CommandV7): Step {
  const result = applyOkV7(state, seatIdV7(state, seat), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
}

/**
 * A reward that puts no unit on the board and no population in the city,
 * for each level (the Economic Miracle at level 4 since the reward ladder
 * rework, `pulp_wars-zypi`; the 6-Coin Treasury before).
 */
const QUIET_REWARD: Readonly<Record<number, RewardIdV7>> = {
  2: "STOCKPILE",
  3: "WALLS",
  4: "ECONOMIC_MIRACLE",
};

/** Applies `command`, then takes a quiet reward for every level it reaches. */
function build(state: GameStateV7, command: CommandV7): GameStateV7 {
  let current = applied(state, 0, command).state;
  for (;;) {
    const choice = current.pendingChoices[0];
    if (choice === undefined) return current;
    current = applied(current, 0, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: choice.cityId,
      reachedLevel: choice.reachedLevel,
      reward: QUIET_REWARD[choice.reachedLevel] ?? "TREASURY",
    }).state;
  }
}

const capturer = (seat: number, where: CoordV7) =>
  ({ seat, role: "FIGHTER", at: where, captureEligible: true }) as const;

function capture(state: GameStateV7, where: CoordV7): Step {
  const unit = unitAtV7(state, where);
  return applyOkV7(state, unit.ownerId, { kind: "CAPTURE", unitId: unit.id });
}

interface EmpireOptions {
  readonly techs?: readonly TechnologyIdV7[];
  readonly coins?: number;
  readonly faction?: FactionIdV7;
}

/**
 * Seat 0 with `cities` cities: its capital, then the villages, then the
 * other seats' capitals, each captured by a Fighter standing on it.
 */
function empire(cities: number, options: EmpireOptions = {}): GameStateV7 {
  const targets = [...VILLAGES, ...ENEMY_CAPITALS].slice(0, cities - 1);
  let state = fieldV7(
    targets.map((where) => capturer(0, where)),
    {
      factions: [options.faction ?? "ORIGINAL", ...FOUR.slice(1)],
      ...(options.techs === undefined ? {} : { techs: { 0: options.techs } }),
      ...(options.coins === undefined ? {} : { coins: options.coins }),
    },
  );
  for (const where of targets) state = capture(state, where).state;
  expect(
    state.cities.filter((city) => city.ownerId === seatIdV7(state, 0)),
  ).toHaveLength(cities);
  return state;
}

/** A new capture-ready Fighter of `seat` on `where`, replacing any unit. */
function standing(
  state: GameStateV7,
  seat: number,
  where: CoordV7,
): GameStateV7 {
  const owner = state.players.find((player) => player.seat === seat);
  if (owner === undefined) throw new Error("seat missing");
  const rule = effectiveRoleRuleV7("FIGHTER", owner.faction);
  const unit: UnitStateV7 = {
    id: state.nextEntityId as never,
    ownerId: owner.id,
    homeCityId: null,
    role: "FIGHTER",
    form: "LAND",
    at: where,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: true,
    activation: { ...READY_V7 },
  };
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + 1,
    units: [...state.units.filter((item) => !sameV7(item.at, where)), unit],
  });
}

/**
 * `city` one population short of `level`, with the rewards of the levels
 * below it taken (`rewards` overrides them). Level 6 takes 20 population,
 * more than the eight tiles of a 3 by 3 city yield, so the difference is
 * booked as permanent population (1 a tile, a hunt) on neutral tiles away
 * from every settlement, which the city is given.
 */
function oneShortOf(
  state: GameStateV7,
  where: CoordV7,
  level: number,
  rewards: Readonly<Record<number, RewardIdV7>> = {},
): GameStateV7 {
  const city = cityAt(state, where);
  const total = growthSpentV7(level - 1) + level - 1;
  const near = (tile: { readonly at: CoordV7 }): boolean =>
    Math.max(
      Math.abs(tile.at.x - city.at.x),
      Math.abs(tile.at.y - city.at.y),
    ) <= 1;
  // The hunts an earlier call booked for this city are taken back first.
  const kept = state.populationContributions.filter(
    (entry) =>
      !(
        entry.cityId === city.id &&
        entry.category === "PERMANENT" &&
        !near({ at: entry.source.at })
      ),
  );
  const released = state.board.tiles.map((tile) =>
    tile.territoryCityId === city.id && !near(tile)
      ? { ...tile, territoryCityId: null }
      : tile,
  );
  const booked = kept
    .filter((entry) => entry.cityId === city.id)
    .reduce(
      (sum, entry) => ({
        permanent:
          sum.permanent + (entry.category === "PERMANENT" ? entry.amount : 0),
        live: sum.live + (entry.category === "LIVE" ? entry.amount : 0),
      }),
      { permanent: 0, live: 0 },
    );
  const missing = total - booked.permanent - booked.live;
  if (missing <= 0) throw new Error("the city is already that large");
  const sites = state.board.tiles
    .filter((tile) => tile.site !== null)
    .map((tile) => tile.at);
  const hunts = released
    .filter(
      (tile) =>
        tile.territoryCityId === null &&
        tile.site === null &&
        tile.biome !== null &&
        !sites.some(
          (site) =>
            Math.max(
              Math.abs(site.x - tile.at.x),
              Math.abs(site.y - tile.at.y),
            ) <= 2,
        ) &&
        !state.units.some((unit) => sameV7(unit.at, tile.at)),
    )
    .reverse()
    .slice(0, missing);
  if (hunts.length !== missing) throw new Error("not enough neutral tiles");
  const grown = resolveCityGrowthV7(
    { ...city, level: 1, population: 0 },
    booked.permanent + missing,
    booked.live,
  ).city;
  expect(grown.level).toBe(level - 1);
  expect(grown.population).toBe(level - 1);
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + missing,
    pendingChoices: [],
    board: {
      ...state.board,
      tiles: released.map((tile) =>
        hunts.some((hunt) => sameV7(hunt.at, tile.at))
          ? { ...tile, territoryCityId: city.id }
          : tile,
      ),
    },
    cities: state.cities.map((item) =>
      item.id === city.id
        ? {
            ...grown,
            cityActionAvailable: true,
            rewards: Array.from({ length: level - 2 }, (_, index) => ({
              reachedLevel: index + 2,
              reward:
                rewards[index + 2] ?? QUIET_REWARD[index + 2] ?? "TREASURY",
            })),
          }
        : item,
    ),
    populationContributions: [
      ...kept,
      ...[...hunts].reverse().map((tile, index) => ({
        id: state.nextEntityId + index,
        cityId: city.id,
        category: "PERMANENT" as const,
        amount: 1,
        source: {
          kind: "RESOURCE_ACTION" as const,
          action: "HUNT_GAME" as const,
          at: tile.at,
        },
      })),
    ],
  });
}

/** Fruit on a free tile of the city's land, harvested: +1 population. */
function harvest(state: GameStateV7, where: CoordV7): Step {
  const city = cityAt(state, where);
  const free = state.board.tiles.find(
    (tile) =>
      tile.territoryCityId === city.id &&
      tile.site === null &&
      tile.improvement === null &&
      !state.units.some((unit) => sameV7(unit.at, tile.at)),
  );
  if (free === undefined) throw new Error("no free tile");
  const fruited = patchTileV7(state, free.at, {
    terrain: "GRASS",
    biome: "PLAINS",
    resource: "FRUIT",
  });
  return applied(fruited, 0, { kind: "HARVEST_FRUIT", at: free.at });
}

describe("the economy rejig: identity", () => {
  it("is 7r54, with 7r53 the last prior identity and an obsolete save key", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r73");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r73.current");
    expect(PRIOR_RULESET_7_IDS.at(-20)).toBe("pulp-wars-poc-7r53");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-20)).toBe(
      "pulpWars.save.v7r53.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const state = fieldV7([], { factions: ["ORIGINAL", "UNDEAD"] });
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r53",
        setup: { ...state.setup, rulesetId: "pulp-wars-poc-7r53" },
      }),
    ).toBeNull();
  });
});

describe("C.1: a mill counts every contributor of its owner next to it", () => {
  /**
   * Two cities three tiles apart on a 6 by 3 strip: city 1 owns x 0-2
   * (center (1, 1)), city 2 owns x 3-5 (center (4, 1)). A third city, when
   * `owners` names three, takes the column x 5.
   */
  const graph = (
    improvements: Readonly<Record<string, ImprovementIdV7>>,
    owners: readonly number[] = [1, 1],
  ): EconomyGraphV7 => ({
    board: {
      width: 6,
      height: 3,
      tiles: Array.from({ length: 18 }, (_, index) => {
        const x = index % 6;
        const y = Math.floor(index / 6);
        return {
          at: { x, y },
          improvement: improvements[`${x},${y}`] ?? null,
          road: false,
          territoryCityId: (owners.length === 3 && x === 5
            ? 3
            : x < 3
              ? 1
              : 2) as never,
        };
      }),
    },
    cities: owners.map((ownerId, index) => ({
      id: (index + 1) as never,
      ownerId: ownerId as never,
      at: { x: index === 2 ? 5 : 1 + 3 * index, y: index === 2 ? 0 : 1 },
      isCapital: index === 0,
    })),
  });
  const output = (
    value: EconomyGraphV7,
    x: number,
    y: number,
    improvement: ImprovementIdV7,
  ) => spatialContributionAtV7(value, { x, y }, improvement);
  /** `basic` on the listed tiles and `mill` on (2, 1) and (3, 1). */
  const facing = (
    mill: ImprovementIdV7,
    basic: ImprovementIdV7,
    tiles: readonly string[],
    mills: readonly string[] = ["2,1", "3,1"],
  ) =>
    graph({
      ...Object.fromEntries(tiles.map((tile) => [tile, basic])),
      ...Object.fromEntries(mills.map((tile) => [tile, mill])),
    });
  const EIGHT = ["1,0", "2,0", "3,0", "4,0", "1,2", "2,2", "3,2", "4,2"];

  it.each([
    ["SAWMILL", "LUMBER_CAMP"],
    ["WINDMILL", "FARM"],
    ["FORGE", "MINE"],
  ] as const)(
    "one %s per city counts a shared %s for both cities",
    (mill, basic) => {
      // The contributor (3, 0) stands on city 2's land and touches both.
      const value = facing(mill, basic, ["3,0"]);
      expect(output(value, 2, 1, mill).population).toBe(1);
      expect(output(value, 3, 1, mill).population).toBe(1);
      expect(output(value, 2, 1, mill).contributingTiles).toEqual([
        { x: 3, y: 0 },
      ]);
      expect(output(value, 3, 1, mill).contributingTiles).toEqual([
        { x: 3, y: 0 },
      ]);
      // The contributor's own population is its own city's, once.
      expect(output(value, 3, 0, basic).population).toBe(
        basic === "LUMBER_CAMP" ? 1 : 2,
      );
    },
  );

  it("the worked layouts: one city alone, one mill on the border, two mills facing", () => {
    // One city alone: a Sawmill with four Camps on its own land, 4 + 4.
    const alone = facing(
      "SAWMILL",
      "LUMBER_CAMP",
      ["1,0", "2,0", "1,2", "2,2"],
      ["2,1"],
    );
    expect(output(alone, 2, 1, "SAWMILL").population).toBe(4);
    // One mill on the border: four Camps on its land and three on the
    // neighbour's, 7 (this already counted before the rejig).
    const border = facing(
      "SAWMILL",
      "LUMBER_CAMP",
      ["1,0", "2,0", "1,2", "2,2", "3,0", "3,1", "3,2"],
      ["2,1"],
    );
    expect(output(border, 2, 1, "SAWMILL").population).toBe(7);
    // Two mills facing each other, four Camps a city, four of the eight
    // touching both: each Sawmill 6 (4 before), so each city 4 + 6 = 10
    // and the pair 20 (16 before).
    const pair = facing("SAWMILL", "LUMBER_CAMP", EIGHT);
    expect(output(pair, 2, 1, "SAWMILL").population).toBe(6);
    expect(output(pair, 3, 1, "SAWMILL").population).toBe(6);
    expect(output(pair, 2, 1, "SAWMILL").contributingTiles).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ]);
    // The same with Farms and Windmills: each city 8 + 6 = 14.
    const farms = facing("WINDMILL", "FARM", EIGHT);
    expect(output(farms, 2, 1, "WINDMILL").population).toBe(6);
    expect(output(farms, 3, 1, "WINDMILL").population).toBe(6);
  });

  it("keeps the caps: 8 for a Windmill or Sawmill, 6 for a Forge, 4 for a Workshop", () => {
    const seven = ["1,0", "2,0", "3,0", "1,2", "2,2", "3,2", "3,1"];
    expect(
      output(facing("FORGE", "MINE", seven, ["2,1"]), 2, 1, "FORGE"),
    ).toMatchObject({ population: 6, placementCount: 7 });
    expect(
      output(facing("WINDMILL", "FARM", seven, ["2,1"]), 2, 1, "WINDMILL")
        .population,
    ).toBe(7);
    const workshop = graph({
      "2,1": "WORKSHOP",
      "1,0": "FARM",
      "3,0": "LUMBER_CAMP",
      "3,2": "MINE",
      "2,0": "FARM",
    });
    expect(output(workshop, 2, 1, "WORKSHOP").population).toBe(4);
  });

  it("a Workshop counts the kinds on a neighbouring city's land", () => {
    // Its own city has a Farm; the Lumber Camp and the Mine are city 2's.
    const value = graph({
      "2,1": "WORKSHOP",
      "1,0": "FARM",
      "3,0": "LUMBER_CAMP",
      "3,2": "MINE",
    });
    expect(output(value, 2, 1, "WORKSHOP")).toMatchObject({
      population: 4,
      distinctTypes: ["FARM", "LUMBER_CAMP", "MINE"],
      placementCount: 3,
    });
    // With only the neighbour's Camp next to it: 1 + 1 (0 before: no
    // placement).
    const lone = graph({ "2,1": "WORKSHOP", "3,0": "LUMBER_CAMP" });
    expect(output(lone, 2, 1, "WORKSHOP")).toMatchObject({
      population: 2,
      placementCount: 1,
    });
    // Two Workshops share one contributor.
    const shared = graph({
      "2,1": "WORKSHOP",
      "3,1": "WORKSHOP",
      "3,0": "LUMBER_CAMP",
    });
    expect(output(shared, 2, 1, "WORKSHOP").population).toBe(2);
    expect(output(shared, 3, 1, "WORKSHOP").population).toBe(2);
  });

  it("never counts another owner's contributors, so a captured city's Farms change sides at once", () => {
    const tiles = { "2,1": "WINDMILL", "2,0": "FARM", "3,0": "FARM" } as const;
    expect(output(graph(tiles, [1, 1]), 2, 1, "WINDMILL").population).toBe(2);
    // City 2 belongs to another player: its Farm no longer counts.
    expect(output(graph(tiles, [1, 2]), 2, 1, "WINDMILL").population).toBe(1);
    // A mill left with no contributor stays, with no output.
    expect(
      output(
        graph({ "2,1": "WINDMILL", "3,0": "FARM" }, [1, 2]),
        2,
        1,
        "WINDMILL",
      ),
    ).toMatchObject({ population: 0, placementCount: 0 });
  });

  it("Markets do not change: one building counts for one Market, its own city's first", () => {
    // One Farm of city 2 between the Markets of two cities.
    const value = graph({ "2,1": "MARKET", "3,0": "FARM", "3,1": "MARKET" });
    expect(output(value, 3, 1, "MARKET")).toMatchObject({
      marketIncome: 2,
      distinctFamilies: ["AGRICULTURE"],
    });
    expect(output(value, 2, 1, "MARKET")).toMatchObject({
      marketIncome: 1,
      distinctFamilies: [],
      placementCount: 0,
    });
    // A third city's Farm counts for the first Market in reading order.
    const third = graph(
      { "4,1": "MARKET", "5,0": "FARM", "4,0": "MARKET" },
      [1, 1, 1],
    );
    // (4, 0) and (4, 1) are both city 2's tiles; a city has one Market, so
    // put the second Market in city 1 instead.
    expect(output(third, 4, 0, "MARKET").marketIncome).toBe(2);
    // The same Farm feeds a Windmill of every city next to it and still
    // only that one Market.
    const both = graph({
      "2,1": "WINDMILL",
      "3,1": "WINDMILL",
      "3,0": "FARM",
      "2,0": "MARKET",
      "4,0": "MARKET",
    });
    expect(output(both, 2, 1, "WINDMILL").population).toBe(1);
    expect(output(both, 3, 1, "WINDMILL").population).toBe(1);
    expect(output(both, 4, 0, "MARKET").marketIncome).toBe(2);
    expect(output(both, 2, 0, "MARKET").marketIncome).toBe(2);
    expect(output(both, 2, 0, "MARKET").distinctFamilies).toEqual([
      "AGRICULTURE",
    ]);
  });

  describe("in a match", () => {
    /** Fertile Ground on the four tiles that touch (11, 4) and (12, 4). */
    const SHARED = [at(11, 3), at(12, 3), at(11, 5), at(12, 5)];
    const farmed = (): GameStateV7 => {
      let state = empire(2);
      for (const where of SHARED)
        state = patchTileV7(state, where, { resource: "FERTILE_GROUND" });
      for (const where of SHARED)
        state = build(state, { kind: "BUILD_FARM", at: where });
      return state;
    };
    const millAt = (state: GameStateV7, where: CoordV7) =>
      state.populationContributions.find(
        (entry) => entry.category === "LIVE" && sameV7(entry.source.at, where),
      )?.amount;

    it("two cities' Windmills both count the four Farms between them, and the preview says so", () => {
      const state = farmed();
      const human = seatIdV7(state, 0);
      const capital = cityAt(state, CAPITAL);
      const village = cityAt(state, VILLAGES[0] as CoordV7);
      const first = { kind: "BUILD_WINDMILL", at: at(12, 4) } as const;
      const firstPreview = previewEconomicV7(viewForV7(state, human), first);
      expect(firstPreview.ok && firstPreview.preview).toMatchObject({
        resultingContribution: 4,
        contributingTiles: [...SHARED].sort(
          (left, right) => left.y - right.y || left.x - right.x,
        ),
      });
      const one = build(state, first);
      expect(millAt(one, at(12, 4))).toBe(4);
      // The village's Windmill on the facing tile: 4 as well, and the
      // capital's keeps its 4 (it dropped to 2 before the rejig, when the
      // village's Farms went to the village's own Windmill).
      const second = { kind: "BUILD_WINDMILL", at: at(11, 4) } as const;
      const secondPreview = previewEconomicV7(viewForV7(one, human), second);
      if (!secondPreview.ok) throw new Error("the second Windmill is offered");
      expect(secondPreview.preview.resultingContribution).toBe(4);
      expect(secondPreview.preview.populationDeltaByCity).toEqual([
        { cityId: village.id, delta: 4 },
      ]);
      expect(
        secondPreview.preview.outputTransitions.filter(
          (transition) => !sameV7(transition.at, at(11, 4)),
        ),
      ).toEqual([]);
      const two = build(one, second);
      expect(millAt(two, at(12, 4))).toBe(4);
      expect(millAt(two, at(11, 4))).toBe(4);
      // Each city: two Farms (2 each) and its Windmill (4).
      expect(cityAt(two, capital.at).economicPopulation).toBe(8);
      expect(cityAt(two, village.at).economicPopulation).toBe(8);
      // The public view shows the same numbers.
      const values = viewForV7(two, human).improvementValues.filter(
        (value) => value.improvement === "WINDMILL",
      );
      expect(values.map((value) => value.level)).toEqual([4, 4]);
      // Still one Windmill per city.
      expect(
        queryPlayerCommandsV7(viewForV7(two, human)).some(
          (command) => command.kind === "BUILD_WINDMILL",
        ),
      ).toBe(false);
    });

    it("offers and accepts a Workshop next to a neighbouring city's Farm only", () => {
      let state = patchTileV7(empire(2), at(11, 3), {
        resource: "FERTILE_GROUND",
      });
      state = build(state, { kind: "BUILD_FARM", at: at(11, 3) });
      const human = seatIdV7(state, 0);
      // (12, 4) is the capital's tile; the only Farm next to it is the
      // village's.
      const workshop = { kind: "BUILD_WORKSHOP", at: at(12, 4) } as const;
      expect(queryPlayerCommandsV7(viewForV7(state, human))).toContainEqual(
        workshop,
      );
      const preview = previewEconomicV7(viewForV7(state, human), workshop);
      expect(preview.ok && preview.preview.resultingContribution).toBe(2);
      const built = build(state, workshop);
      expect(millAt(built, at(12, 4))).toBe(2);
      // A tile with no contributor of the player next to it is refused.
      expect(queryPlayerCommandsV7(viewForV7(state, human))).not.toContainEqual(
        { kind: "BUILD_WORKSHOP", at: at(14, 4) },
      );
      const refused = applyCommandV7(state, human, {
        kind: "BUILD_WORKSHOP",
        at: at(14, 4),
      });
      expect(refused.accepted).toBe(false);
    });
  });
});

describe("C.2: a Monument gives 3 population", () => {
  it("is 3 in the rule, the preview, the event, and the texts", () => {
    expect(MONUMENT_POPULATION_V7).toBe(3);
    expect(ACHIEVEMENT_HELP_TIP_V7).toContain("+3 population");
    const state = fieldV7([{ seat: 1, role: "FIGHTER", at: at(1, 1) }], {
      factions: ["ORIGINAL", "UNDEAD"],
    });
    const human = seatIdV7(state, 0);
    const command = queryPlayerCommandsV7(viewForV7(state, human)).find(
      (candidate) => candidate.kind === "BUILD_MONUMENT",
    );
    if (command?.kind !== "BUILD_MONUMENT") throw new Error("no Monument");
    const before = state.cities.find((city) => city.ownerId === human);
    if (before === undefined) throw new Error("no capital");
    expect(before).toMatchObject({ level: 1, population: 0 });
    const preview = previewMonumentV7(viewForV7(state, human), command);
    // A level-1 city needs 2: level 2, and 1 of the 3 toward level 3.
    expect(preview.ok && preview.preview).toMatchObject({
      populationAdded: 3,
      levelsReached: [2],
    });
    const result = applied(state, 0, command);
    expect(result.events[0]).toMatchObject({
      kind: "MONUMENT_BUILT",
      populationAdded: 3,
    });
    const after = result.state.cities.find((city) => city.id === before.id);
    expect(after).toMatchObject({ level: 2, population: 1 });
    expect(
      spatialContributionAtV7(result.state, command.at, "MONUMENT").population,
    ).toBe(3);
    // A stored Monument of 2 is not a valid state.
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...result.state,
            populationContributions: result.state.populationContributions.map(
              (entry) =>
                entry.source.kind === "MONUMENT"
                  ? { ...entry, amount: 2 }
                  : entry,
            ),
          }),
        ),
      ),
    ).toBeNull();
  });

  it.each([
    [1, 2, 1],
    [2, 3, 0],
    [3, 3, 3],
    [4, 4, 3],
  ])(
    "takes a level-%i city with an empty meter to level %i with %i on the meter",
    (level, reached, meter) => {
      const spent = growthSpentV7(level);
      const city = {
        level,
        permanentPopulation: spent,
        economicPopulation: 0,
        population: 0,
      } as CityStateV7;
      const grown = resolveCityGrowthV7(city, spent, MONUMENT_POPULATION_V7);
      expect(grown.city.level).toBe(reached);
      expect(grown.city.population).toBe(meter);
    },
  );
});

describe("C.3: research is priced per city", () => {
  const TABLE: Readonly<Record<number, readonly [number, number, number]>> = {
    1: [5, 7, 9],
    3: [7, 11, 15],
    5: [9, 15, 21],
    8: [12, 21, 30],
    12: [16, 29, 42],
  };
  const tiers = [1, 2, 3] as const;

  it("is the tier base 5 / 7 / 9 plus 1 / 2 / 3 Coins per city beyond the first", () => {
    expect(TECHNOLOGY_RESEARCH_COST_V7).toEqual({
      1: { base: 5, step: 1 },
      2: { base: 7, step: 2 },
      3: { base: 9, step: 3 },
    });
    for (const [cities, prices] of Object.entries(TABLE))
      expect(
        tiers.map((tier) => technologyResearchCostV7(tier, Number(cities))),
        `${cities} cities`,
      ).toEqual(prices);
    // No city (never in a match) prices as one.
    expect(tiers.map((tier) => technologyResearchCostV7(tier, 0))).toEqual([
      5, 7, 9,
    ]);
    expect(() => technologyResearchCostV7(3, -1)).toThrow("INVALID_CITY_COUNT");
    expect(() => technologyResearchCostV7(3, Number.MAX_SAFE_INTEGER)).toThrow(
      "INTEGER_OVERFLOW",
    );
  });

  it("does not depend on the technologies owned; only the free opener reads them", () => {
    for (const [cities, prices] of Object.entries(TABLE))
      for (const owned of [1, 3, 8, 14, 20])
        expect(
          tiers.map((tier) =>
            playerTechnologyResearchCostV7(tier, owned, Number(cities)),
          ),
          `${cities} cities, ${owned} technologies`,
        ).toEqual(prices);
    // The first technology of a match is free, whatever the cities.
    for (const cities of [1, 3, 12]) {
      expect(playerTechnologyResearchCostV7(1, 0, cities)).toBe(0);
      expect(playerTechnologyResearchCostV7(2, 0, cities)).toBe(
        technologyResearchCostV7(2, cities),
      );
    }
    expect(researchPriceRuleTextV7(3)).toBe(
      "Tier 3: 9 Coins, +3 for each city you own beyond your first",
    );
    expect(ECONOMY_REJIG_HELP_TIP_V7).toContain(
      "1 / 2 / 3 Coins more (tier 1 / 2 / 3) for each city you own beyond your first",
    );
  });

  it.each([1, 3, 5, 8])(
    "the technology tree of a player with %i cities shows the price it is charged",
    (cities) => {
      const prices = TABLE[cities] as readonly [number, number, number];
      for (const techs of [
        ["GATHERING"] as readonly TechnologyIdV7[],
        withoutTechsV7("ORIGINAL", "CHIVALRY", "EXPLOSIVES", "COMMERCE"),
      ]) {
        const state = empire(cities, { techs, coins: 1000 });
        const human = seatIdV7(state, 0);
        const tree = queryTechnologyTreeV7(viewForV7(state, human));
        expect(tree.ownedCityCount).toBe(cities);
        const open = tree.nodes.filter((node) => node.state !== "OWNED");
        expect(open.length).toBeGreaterThan(0);
        for (const node of open)
          expect(node.cost, node.id).toBe(prices[node.tier - 1]);
        for (const node of open.filter((item) => item.state === "AVAILABLE")) {
          const result = applied(state, 0, {
            kind: "RESEARCH",
            tech: node.id,
          });
          expect(coinsOf(state) - coinsOf(result.state), node.id).toBe(
            prices[node.tier - 1],
          );
        }
      }
    },
  );

  it("refuses a player one Coin short, and follows the cities the player owns now", () => {
    const techs: readonly TechnologyIdV7[] = ["GATHERING"];
    const node = queryTechnologyTreeV7(
      viewForV7(empire(3, { techs }), seatIdV7(empire(3, { techs }), 0)),
    ).nodes.find((item) => item.tier === 2 && item.state === "AVAILABLE");
    if (node === undefined) throw new Error("no tier 2 offer");
    const short = empire(3, { techs, coins: 10 });
    const refused = applyCommandV7(short, seatIdV7(short, 0), {
      kind: "RESEARCH",
      tech: node.id,
    });
    expect(refused.accepted).toBe(false);
    if (!refused.accepted)
      expect(refused.error).toMatchObject({
        code: "INSUFFICIENT_COINS",
        params: { cost: 11 },
      });
    expect(
      queryPlayerCommandsV7(viewForV7(short, seatIdV7(short, 0))),
    ).not.toContainEqual({ kind: "RESEARCH", tech: node.id });
    const exact = empire(3, { techs, coins: 11 });
    expect(
      coinsOf(applied(exact, 0, { kind: "RESEARCH", tech: node.id }).state),
    ).toBe(0);
    // A fourth city (a captured village) raises the same technology by 2;
    // there is no rule against researching before the capture.
    const before = fieldV7([capturer(0, VILLAGES[0] as CoordV7)], {
      factions: FOUR,
      techs: { 0: techs },
    });
    const cost = (state: GameStateV7): number | undefined =>
      queryTechnologyTreeV7(viewForV7(state, seatIdV7(state, 0))).nodes.find(
        (item) => item.id === node.id,
      )?.cost;
    expect(cost(before)).toBe(7);
    expect(cost(capture(before, VILLAGES[0] as CoordV7).state)).toBe(9);
  });
});

describe("C.4: the achievements", () => {
  it("names the seven criteria, none with a technology", () => {
    expect(ACHIEVEMENT_REQUIRED_TECH_V7).toEqual(
      Object.fromEntries(
        ACHIEVEMENT_IDS_V7.map((achievement) => [achievement, null]),
      ),
    );
    expect({
      CONQUEROR_CAPTURES_V7,
      ENGINEER_MILL_OUTPUT_V7,
      ICE_SEA_DOG_UNITS_V7,
      LAND_BARON_CITIES_V7,
      MUSTER_KINDS_V7,
      SEA_DOG_SHIPS_V7,
      SLAYER_KILLS_V7,
    }).toEqual({
      CONQUEROR_CAPTURES_V7: 1,
      ENGINEER_MILL_OUTPUT_V7: 7,
      ICE_SEA_DOG_UNITS_V7: 5,
      LAND_BARON_CITIES_V7: 8,
      MUSTER_KINDS_V7: 6,
      SEA_DOG_SHIPS_V7: 5,
      SLAYER_KILLS_V7: 7,
    });
    expect(
      [
        [14, 14],
        [11, 11],
        [20, 20],
        [16, 16],
        [25, 25],
      ].map(([width, height]) =>
        explorerTilesRequiredV7({ width: width ?? 0, height: height ?? 0 }),
      ),
    ).toEqual([98, 61, 200, 128, 313]);
    expect(ACHIEVEMENT_GOALS_V7).toEqual({
      EXPLORER: "Explore half the map.",
      ENGINEER: "Get one mill to 7 population.",
      MUSTER: "Field 6 unit types you can train.",
      CONQUEROR: "Capture an enemy capital.",
      LAND_BARON: "Own 8 cities at once.",
      SEA_DOG: "Own 5 warships at once.",
      SLAYER: "Get 7 kills with one unit.",
    });
    expect(ICE_SEA_DOG_GOAL_V7).toBe("Hold the ice with 5 units at once.");
    const state = fieldV7([], { factions: ["ORIGINAL", "UNDEAD"] });
    expect(viewForV7(state, seatIdV7(state, 0)).achievementProgress).toEqual([
      {
        achievement: "EXPLORER",
        currentExploredTiles: 121,
        requiredExploredTiles: 61,
      },
      { achievement: "ENGINEER", currentMaximumOutput: 0, requiredOutput: 7 },
      {
        achievement: "MUSTER",
        currentDistinctTrainableRoles: 0,
        requiredDistinctTrainableRoles: 6,
      },
      { achievement: "CONQUEROR", current: 0, required: 1 },
      { achievement: "LAND_BARON", current: 1, required: 8 },
      { achievement: "SEA_DOG", current: 0, required: 5 },
      { achievement: "SLAYER", current: 0, required: 7 },
    ]);
  });

  it("Explorer: half the map's tiles, rounded up, with no technology", () => {
    // An 11 by 11 board: 61 of 121. Seat 0 owns no technology at all.
    const base = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [] } },
    );
    const human = seatIdV7(base, 0);
    /** Seat 0 with exactly `count` explored tiles, none near (8, 1). */
    const exploring = (count: number): GameStateV7 =>
      checkedV7({
        ...base,
        players: base.players.map((player) =>
          player.id === human
            ? {
                ...player,
                explored: base.board.tiles
                  .map((tile) => tile.at)
                  .filter((where) => where.y >= 5)
                  .slice(0, count),
                achievementEntitlements: player.achievementEntitlements.map(
                  (entry) => ({ ...entry, unlocked: false, spent: false }),
                ),
              }
            : player,
        ),
      });
    const move = (state: GameStateV7): Step =>
      applied(state, 0, {
        kind: "MOVE",
        unitId: unitAtV7(state, at(8, 2)).id,
        path: [at(8, 1)],
      });
    // The step reveals the 3 by 3 around (8, 1): rows 0 to 2, nine tiles.
    const below = move(exploring(51));
    expect(progress(below.state, 0, "EXPLORER")).toEqual({
      achievement: "EXPLORER",
      currentExploredTiles: 60,
      requiredExploredTiles: 61,
    });
    expect(unlocks(below.events)).toEqual([]);
    expect(entitled(below.state, 0, "EXPLORER")).toBe(false);
    const reached = move(exploring(52));
    expect(progress(reached.state, 0, "EXPLORER")).toMatchObject({
      currentExploredTiles: 61,
    });
    expect(unlocks(reached.events)).toEqual(["EXPLORER"]);
    expect(entitled(reached.state, 0, "EXPLORER")).toBe(true);
  });

  it("Land Baron: 8 cities held at once", () => {
    const seven = empire(7, { techs: [] });
    expect(progress(seven, 0, "LAND_BARON")).toEqual({
      achievement: "LAND_BARON",
      current: 7,
      required: 8,
    });
    expect(entitled(seven, 0, "LAND_BARON")).toBe(false);
    expect(unlocks(endTurnUntilV7(seven, seatIdV7(seven, 0)).events)).toEqual(
      [],
    );
    // The eighth is another seat's capital: Conqueror and Land Baron, in
    // canonical order, in the one capture.
    const eighth = capture(
      standing(seven, 0, ENEMY_CAPITALS[0] as CoordV7),
      ENEMY_CAPITALS[0] as CoordV7,
    );
    expect(unlocks(eighth.events)).toEqual(["CONQUEROR", "LAND_BARON"]);
    expect(progress(eighth.state, 0, "LAND_BARON")).toMatchObject({
      current: 8,
    });
  });

  it("Muster: 6 kinds the player can train on the board, with no technology; the giant does not count", () => {
    const kinds = [
      "FIGHTER",
      "GUARD",
      "RAIDER",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
    ] as const;
    const mustered = (count: number): GameStateV7 =>
      fieldV7(
        [
          ...kinds.slice(0, count).map((role, index) => ({
            seat: 0,
            role,
            at: at(4 + index, 2),
          })),
          // A second unit of a kind and the reward giant add nothing.
          { seat: 0, role: "FIGHTER" as const, at: at(4, 3) },
          { seat: 0, role: "JUGGERNAUT" as const, at: at(5, 3) },
          { seat: 1, role: "FIGHTER" as const, at: at(1, 1) },
        ],
        { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [] } },
      );
    const five = mustered(5);
    expect(progress(five, 0, "MUSTER")).toEqual({
      achievement: "MUSTER",
      currentDistinctTrainableRoles: 5,
      requiredDistinctTrainableRoles: 6,
    });
    expect(unlocks(endTurnUntilV7(five, seatIdV7(five, 0)).events)).toEqual([]);
    const six = mustered(6);
    const cycle = endTurnUntilV7(six, seatIdV7(six, 0));
    expect(unlocks(cycle.events)).toEqual(["MUSTER"]);
    expect(entitled(cycle.state, 0, "MUSTER")).toBe(true);
  });

  it("Engineer: one mill at 7, with no Engineering", () => {
    // A Sawmill on the capital's border tile with seven Lumber Camps
    // around it, three of them on the village's land.
    const CAMPS = [
      at(11, 3),
      at(12, 3),
      at(13, 3),
      at(11, 4),
      at(11, 5),
      at(12, 5),
      at(13, 5),
    ];
    let state = empire(2, {
      techs: withoutTechsV7("ORIGINAL", "ENGINEERING"),
    });
    for (const where of CAMPS)
      state = patchTileV7(state, where, { terrain: "FOREST" });
    for (const where of CAMPS.slice(0, 6))
      state = build(state, { kind: "BUILD_LUMBER_CAMP", at: where });
    const sawmill = applied(state, 0, {
      kind: "BUILD_SAWMILL",
      at: at(12, 4),
    });
    expect(progress(sawmill.state, 0, "ENGINEER")).toEqual({
      achievement: "ENGINEER",
      currentMaximumOutput: 6,
      requiredOutput: 7,
    });
    expect(unlocks(sawmill.events)).toEqual([]);
    let grown = sawmill.state;
    while (grown.pendingChoices[0] !== undefined)
      grown = applied(grown, 0, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: grown.pendingChoices[0].cityId,
        reachedLevel: grown.pendingChoices[0].reachedLevel,
        reward:
          QUIET_REWARD[grown.pendingChoices[0].reachedLevel] ?? "TREASURY",
      }).state;
    const seventh = applied(grown, 0, {
      kind: "BUILD_LUMBER_CAMP",
      at: CAMPS[6] as CoordV7,
    });
    expect(progress(seventh.state, 0, "ENGINEER")).toMatchObject({
      currentMaximumOutput: 7,
    });
    expect(unlocks(seventh.events)).toEqual(["ENGINEER"]);
  });

  it("Conqueror: an enemy capital, not a village, another enemy city, or the player's own capital taken back", () => {
    // Seat 1 (Undead, capital (4, 4)) takes the village on (7, 4).
    const VILLAGE = VILLAGES[1] as CoordV7;
    const start = fieldV7([capturer(1, VILLAGE)], {
      factions: FOUR,
      activeSeat: 1,
      techs: { 0: [] },
    });
    const taken = capture(start, VILLAGE);
    expect(unlocks(taken.events)).toEqual([]);
    const human = seatIdV7(start, 0);
    const mine = endTurnUntilV7(taken.state, human).state;
    // Seat 0 captures that city from seat 1: an enemy city, not a capital.
    const city = capture(standing(mine, 0, VILLAGE), VILLAGE);
    expect(cityAt(city.state, VILLAGE).ownerId).toBe(human);
    expect(unlocks(city.events)).toEqual([]);
    expect(entitled(city.state, 0, "CONQUEROR")).toBe(false);
    expect(progress(city.state, 0, "CONQUEROR")).toEqual({
      achievement: "CONQUEROR",
      current: 0,
      required: 1,
    });
    // A neutral village is no enemy city either.
    const village = capture(
      standing(city.state, 0, VILLAGES[0] as CoordV7),
      VILLAGES[0] as CoordV7,
    );
    expect(unlocks(village.events)).toEqual([]);
    // Seat 1 takes seat 0's capital, and seat 0 takes it back: its own
    // first capital is not an enemy capital.
    const theirs = endTurnUntilV7(village.state, seatIdV7(start, 1)).state;
    const lost = capture(standing(theirs, 1, CAPITAL), CAPITAL);
    // (For seat 1 it is one: an enemy capital.)
    expect(unlocks(lost.events)).toEqual(["CONQUEROR"]);
    const again = endTurnUntilV7(lost.state, human).state;
    const back = capture(standing(again, 0, CAPITAL), CAPITAL);
    expect(cityAt(back.state, CAPITAL).ownerId).toBe(human);
    expect(unlocks(back.events)).toEqual([]);
    // Seat 1's capital is.
    const capital = capture(
      standing(back.state, 0, ENEMY_CAPITALS[0] as CoordV7),
      ENEMY_CAPITALS[0] as CoordV7,
    );
    expect(unlocks(capital.events)).toEqual(["CONQUEROR"]);
    expect(progress(capital.state, 0, "CONQUEROR")).toMatchObject({
      current: 1,
    });
  });

  it("Sea Dog: 5 warships at once", () => {
    const water = [at(4, 1), at(5, 1), at(6, 1), at(7, 1), at(8, 1)];
    const ships = (count: number): GameStateV7 =>
      fieldV7(
        water.slice(0, count).map((where, index) => ({
          seat: 0,
          role:
            index === 1 ? ("BATTLESHIP" as const) : ("PATROL_BOAT" as const),
          at: where,
          form: "NAVAL" as const,
        })),
        { factions: ["ORIGINAL", "UNDEAD"], water, techs: { 0: [] } },
      );
    const four = ships(4);
    expect(progress(four, 0, "SEA_DOG")).toEqual({
      achievement: "SEA_DOG",
      current: 4,
      required: 5,
    });
    expect(unlocks(endTurnUntilV7(four, seatIdV7(four, 0)).events)).toEqual([]);
    const five = ships(5);
    expect(unlocks(endTurnUntilV7(five, seatIdV7(five, 0)).events)).toEqual([
      "SEA_DOG",
    ]);
  });

  it("Sea Dog for the Ice Folk: 5 units on the ice at once", () => {
    const ICE = [at(1, 3), at(2, 3), at(5, 3), at(6, 3)];
    const state = frozenArenaV7({
      units: [
        ...ICE.map((where) => ({
          seat: 0 as const,
          role: "FIGHTER" as const,
          at: where,
        })),
        { seat: 0, role: "RAIDER", at: at(3, 2) },
      ],
      ice: [{ at: at(3, 3) }],
    });
    expect(
      viewForV7(state, seatIdV7(state, 0)).achievementProgress.find(
        (entry) => entry.achievement === "SEA_DOG",
      ),
    ).toEqual({ achievement: "SEA_DOG", current: 4, required: 5 });
    expect(entitled(state, 0, "SEA_DOG")).toBe(false);
    const result = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: navalUnitAtV7(state, at(3, 2)).id,
      path: [at(3, 3)],
    });
    expect(unlocks(result.events)).toContain("SEA_DOG");
  });

  it("Slayer: 7 kills with one unit", () => {
    const duel = (kills: number): GameStateV7 =>
      withKillsV7(
        fieldV7(
          [
            { seat: 0, role: "FIGHTER", at: at(5, 3) },
            { seat: 1, role: "FIGHTER", at: at(5, 2), hp: 1 },
          ],
          { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [] } },
        ),
        at(5, 3),
        kills,
      );
    expect(progress(duel(5), 0, "SLAYER")).toEqual({
      achievement: "SLAYER",
      current: 5,
      required: 7,
    });
    const sixth = attackV7(duel(5), at(5, 3), at(5, 2));
    expect(sixth.attacker?.kills).toBe(6);
    expect(unlocks(sixth.events)).toEqual([]);
    const seventh = attackV7(duel(6), at(5, 3), at(5, 2));
    expect(seventh.attacker?.kills).toBe(7);
    expect(unlocks(seventh.events)).toEqual(["SLAYER"]);
  });
});

// The reward ladder rework (`pulp_wars-zypi`): every level from 5 offers
// the giant or the Treasury, in every city, with no once-per-city limit
// (the economy rejig offered it once per city from level 6).
// tests/unit/ruleset-v7-tuning-4.test.ts lists the whole ladder and Scouts.
describe("the reward ladder: the giant in every city at every level from 5", () => {
  it("level 4 offers no giant; level 5 and every later level the giant or the Treasury", () => {
    expect(REWARD_UNIT_LEVEL_V7).toBe(5);
    expect(rewardCandidatesForLevelV7(4)).toEqual(["BOOM", "ECONOMIC_MIRACLE"]);
    for (const level of [5, 6, 7, 9])
      expect(rewardCandidatesForLevelV7(level)).toEqual([
        "JUGGERNAUT",
        "TREASURY",
      ]);
    expect(rewardGiantOfferTextV7("Troll")).toBe(
      "From level 5, every level of this city offers a free Troll or 10 Coins",
    );
    expect(rewardGiantHelpTipV7("Colossus")).toBe(
      "Every city can take a free Colossus or 10 Coins as the reward of every level from 5.",
    );
  });

  it("a second and a third city are each offered the giant at level 5, not at 4, and again at 6", () => {
    const SECOND = VILLAGES[0] as CoordV7;
    const THIRD = VILLAGES[1] as CoordV7;
    const start = empire(3);
    const human = seatIdV7(start, 0);
    const giants = (state: GameStateV7): readonly UnitStateV7[] =>
      state.units.filter(
        (unit) => unit.ownerId === human && unit.role === "JUGGERNAUT",
      );
    let state = start;
    for (const where of [SECOND, THIRD]) {
      const city = cityAt(state, where);
      expect(city.isCapital).toBe(false);
      // Level 4: the Population Boom or the Economic Miracle, no giant.
      const four = harvest(oneShortOf(state, where, 4), where);
      expect(cityAt(four.state, where).level).toBe(4);
      expect(four.events).toContainEqual({
        kind: "CITY_REWARD_QUEUED",
        cityId: city.id,
        reachedLevel: 4,
        candidates: ["BOOM", "ECONOMIC_MIRACLE"],
      });
      const early = applyCommandV7(four.state, human, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 4,
        reward: "JUGGERNAUT",
      });
      expect(early.accepted).toBe(false);
      // A stored level-4 choice that offers the giant is not a valid state.
      expect(
        parseGameStateV7(
          JSON.parse(
            JSON.stringify({
              ...four.state,
              pendingChoices: [
                {
                  ...four.state.pendingChoices[0],
                  candidates: ["JUGGERNAUT", "TREASURY"],
                },
              ],
            }),
          ),
        ),
      ).toBeNull();
      // Level 5: the giant or the Treasury.
      const five = harvest(oneShortOf(state, where, 5), where);
      expect(cityAt(five.state, where).level).toBe(5);
      expect(five.state.pendingChoices).toEqual([
        {
          kind: "CITY_REWARD",
          cityId: city.id,
          reachedLevel: 5,
          candidates: ["JUGGERNAUT", "TREASURY"],
        },
      ]);
      const before = giants(five.state).length;
      const taken = applied(five.state, 0, {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 5,
        reward: "JUGGERNAUT",
      });
      expect(taken.events).toContainEqual(
        expect.objectContaining({
          kind: "UNIT_REWARD_GRANTED",
          cityId: city.id,
          reachedLevel: 5,
          role: "JUGGERNAUT",
        }),
      );
      expect(giants(taken.state)).toHaveLength(before + 1);
      const giant = giants(taken.state).at(-1);
      expect(giant?.homeCityId).toBe(city.id);
      // The Fighter that captured the city still stands on its center, so
      // the giant is placed beside it.
      expect(unitAtV7(taken.state, where).role).toBe("FIGHTER");
      expect(
        Math.max(
          Math.abs((giant?.at.x ?? 0) - where.x),
          Math.abs((giant?.at.y ?? 0) - where.y),
        ),
      ).toBe(1);
      // Level 6 in the same city: the giant again.
      const six = harvest(
        oneShortOf(taken.state, where, 6, { 5: "JUGGERNAUT" }),
        where,
      );
      expect(six.state.pendingChoices[0]?.candidates).toEqual([
        "JUGGERNAUT",
        "TREASURY",
      ]);
      state = taken.state;
    }
    // Two cities, two giants, and the first capital took none.
    expect(giants(state)).toHaveLength(2);
  });

  it("a city that took the Treasury at level 5 is offered the giant at level 6, beside an occupied center", () => {
    const SECOND = VILLAGES[0] as CoordV7;
    const start = standing(empire(2), 0, SECOND);
    const human = seatIdV7(start, 0);
    const city = cityAt(start, SECOND);
    const six = harvest(
      oneShortOf(start, SECOND, 6, { 5: "TREASURY" }),
      SECOND,
    );
    expect(six.state.pendingChoices[0]).toMatchObject({
      reachedLevel: 6,
      candidates: ["JUGGERNAUT", "TREASURY"],
    });
    const taken = applied(six.state, 0, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 6,
      reward: "JUGGERNAUT",
    });
    const giant = taken.state.units.find(
      (unit) => unit.ownerId === human && unit.role === "JUGGERNAUT",
    );
    if (giant === undefined) throw new Error("no giant");
    // The Fighter keeps the center; the giant stands beside it.
    expect(unitAtV7(taken.state, SECOND).role).toBe("FIGHTER");
    expect(
      Math.max(
        Math.abs(giant.at.x - SECOND.x),
        Math.abs(giant.at.y - SECOND.y),
      ),
    ).toBe(1);
  });

  it("the Economic Miracle adds a Coin to its city's income every turn, and the AI picks a legal reward at every level", () => {
    const SECOND = VILLAGES[0] as CoordV7;
    const start = empire(2);
    const human = seatIdV7(start, 0);
    const four = harvest(oneShortOf(start, SECOND, 4), SECOND).state;
    const city = cityAt(four, SECOND);
    expect(four.pendingChoices[0]).toMatchObject({
      reachedLevel: 4,
      candidates: ["BOOM", "ECONOMIC_MIRACLE"],
    });
    const decision = chooseNormalCommandV7(viewForV7(four, human)).command;
    expect(decision).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 4,
    });
    expect(["BOOM", "ECONOMIC_MIRACLE"]).toContain(
      decision?.kind === "CHOOSE_CITY_REWARD" ? decision.reward : null,
    );
    const miracle = applied(four, 0, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 4,
      reward: "ECONOMIC_MIRACLE",
    });
    expect(miracle.events[0]).toMatchObject({
      kind: "CITY_REWARD_CHOSEN",
      reward: "ECONOMIC_MIRACLE",
      coinDelta: 0,
    });
    const after = cityAt(miracle.state, SECOND);
    expect(after.rewards.at(-1)).toEqual({
      reachedLevel: 4,
      reward: "ECONOMIC_MIRACLE",
    });
    expect(cityEconomicMiracleIncomeV7(after)).toBe(ECONOMIC_MIRACLE_COINS_V7);
    expect(ECONOMIC_MIRACLE_COINS_V7).toBe(1);
    expect(after.level).toBe(city.level);
    expect(after.population).toBe(city.population);
    expect(cityIncomeV7(miracle.state, after)).toBe(
      cityIncomeV7(four, city) + 1,
    );
    // The income the owner collects at its next turn includes it.
    expect(
      playerIncomeV7(miracle.state, human).cities.find(
        (entry) => entry.cityId === city.id,
      )?.coins,
    ).toBe(cityIncomeV7(four, city) + 1);
    // The AI at every other level picks one of the offered rewards.
    for (const level of [2, 3, 5]) {
      const pending = harvest(oneShortOf(start, SECOND, level), SECOND).state;
      const choice = pending.pendingChoices[0];
      expect(choice?.reachedLevel).toBe(level);
      const picked = chooseNormalCommandV7(viewForV7(pending, human)).command;
      expect(picked?.kind, String(level)).toBe("CHOOSE_CITY_REWARD");
      expect(choice?.candidates, String(level)).toContain(
        picked?.kind === "CHOOSE_CITY_REWARD" ? picked.reward : null,
      );
    }
  });

  it("a level-5 giant is a valid event and a level-4 giant is not", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "GOBLIN");
    expect(fixture.command.reachedLevel).toBe(6);
    const result = applied(fixture.state, 0, fixture.command);
    const granted = result.events.find(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    if (granted === undefined) throw new Error("no giant");
    expect(parseEventV7(granted).ok).toBe(true);
    expect(parseEventV7({ ...granted, reachedLevel: 5 }).ok).toBe(true);
    expect(parseEventV7({ ...granted, reachedLevel: 4 }).ok).toBe(false);
  });
});

describe("the Normal AI under the rejig", () => {
  const rewardOf = (state: GameStateV7): string => {
    const decision = chooseNormalCommandV7(
      viewForV7(state, seatIdV7(state, 0)),
    );
    if (decision.command === null) throw new Error("no decision");
    return decision.command.kind === "CHOOSE_CITY_REWARD"
      ? decision.command.reward
      : decision.command.kind;
  };

  it.each(["ORIGINAL", "GOBLIN", "UNDEAD", "MARTIAN"] as const)(
    "a %s seat takes the giant when its city offers it, with no Coins and no threat",
    (faction) => {
      const fixture = rewardStateV7("JUGGERNAUT", faction);
      const poor = checkedV7({
        ...fixture.state,
        players: fixture.state.players.map((player) =>
          player.seat === 0 ? { ...player, coins: 0 } : player,
        ),
      });
      expect(rewardOf(poor)).toBe("JUGGERNAUT");
    },
  );

  // The reward ladder rework (`pulp_wars-zypi`): the giant at level 5 when
  // the city has a free slot, the Treasury when the seat already fields a
  // giant for every city.
  it("takes the giant at level 5, and the Treasury once it fields a giant for every city", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL");
    const city = fixture.state.cities.find(
      (item) => item.id === fixture.command.cityId,
    );
    if (city === undefined) throw new Error("no city");
    // The same capital one level lower: 15 of its 20 population (five of
    // its six hunts are taken back).
    const hunts = fixture.state.populationContributions
      .filter((entry) => entry.category === "PERMANENT")
      .slice(0, 5);
    const five = checkedV7({
      ...fixture.state,
      cities: fixture.state.cities.map((item) =>
        item.id === city.id
          ? {
              ...resolveCityGrowthV7(
                { ...city, level: 1, population: 0 },
                city.permanentPopulation - 5,
                city.economicPopulation,
              ).city,
              rewards: city.rewards.filter((entry) => entry.reachedLevel < 5),
            }
          : item,
      ),
      populationContributions: fixture.state.populationContributions.filter(
        (entry) => !hunts.includes(entry),
      ),
      pendingChoices: [
        {
          kind: "CITY_REWARD" as const,
          cityId: city.id,
          reachedLevel: 5,
          candidates: ["JUGGERNAUT", "TREASURY"] as const,
        },
      ],
    });
    expect(rewardOf(five)).toBe("JUGGERNAUT");
    // Level 6, after its level-5 giant: one city, one giant, the Treasury.
    const taken = applied(five, 0, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 5,
      reward: "JUGGERNAUT",
    }).state;
    const six = checkedV7({
      ...fixture.state,
      nextEntityId: taken.nextEntityId,
      units: taken.units,
      cities: fixture.state.cities.map((item) =>
        item.id === city.id
          ? {
              ...item,
              rewards: item.rewards.map((entry) =>
                entry.reachedLevel === 5
                  ? { ...entry, reward: "JUGGERNAUT" as const }
                  : entry,
              ),
            }
          : item,
      ),
    });
    expect(rewardOf(six)).toBe("TREASURY");
  });

  it("reads the price of its next technology from its cities", () => {
    const techs: readonly TechnologyIdV7[] = ["GATHERING"];
    for (const cities of [1, 3, 5]) {
      const state = empire(cities, { techs, faction: "UNDEAD" });
      const view = viewForV7(state, seatIdV7(state, 0));
      const research = inspectNormalArmyV7(view).research;
      if (research === null) throw new Error("no research target");
      const node = queryTechnologyTreeV7(view).nodes.find(
        (item) => item.id === research.tech,
      );
      if (node === undefined) throw new Error("no such node");
      expect(research.cost).toBe(node.cost);
      expect(research.cost).toBe(technologyResearchCostV7(node.tier, cities));
    }
  });
});
