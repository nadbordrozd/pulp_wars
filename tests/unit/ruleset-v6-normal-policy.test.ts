import { describe, expect, it } from "vitest";
import { chooseNormalCommandV6, scoreCommandV6 } from "../../src/ai/v6";
import type { CityId, PlayerId, UnitId } from "../../src/engine/model/ids";
import type { CommandV6 } from "../../src/engine/v6/commands";
import {
  previewEconomicV6,
  queryCombatPreviewV6,
  scorePublicSpatialPlanV6,
} from "../../src/engine/v6/query";
import {
  TECHNOLOGY_IDS,
  type CityStateV6,
  type CoordV6,
  type EconomicImprovementId,
  type FactionIdV6,
  type PlayerStateV6,
  type ResourceId,
  type TechnologyId,
  type TerrainIdV6,
  type UnitRoleId,
  type UnitStateV6,
} from "../../src/engine/v6/types";
import type {
  PlayerTileViewV6,
  PlayerViewV6,
  PublicPlayerStateV6,
} from "../../src/engine/v6/view";

const OWN = 1 as PlayerId;
const ENEMY = 2 as PlayerId;
const CITY = 11 as CityId;
const ENEMY_CITY = 12 as CityId;
const OWN_UNIT = 21 as UnitId;
const ENEMY_UNIT = 22 as UnitId;

function activation(
  overrides: Partial<UnitStateV6["activation"]> = {},
): UnitStateV6["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    healed: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
    ...overrides,
  };
}

function unit(
  id: UnitId,
  ownerId: PlayerId,
  role: UnitRoleId,
  at: CoordV6,
  overrides: Partial<UnitStateV6> = {},
): UnitStateV6 {
  const maxHp =
    role === "GUARD" || role === "HEAVY" ? 15 : role === "JUGGERNAUT" ? 40 : 10;
  return {
    id,
    ownerId,
    homeCityId: ownerId === OWN ? CITY : ENEMY_CITY,
    role,
    at,
    hp: maxHp,
    maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: activation(),
    ...overrides,
  };
}

function city(
  id: CityId,
  ownerId: PlayerId,
  at: CoordV6,
  overrides: Partial<CityStateV6> = {},
): CityStateV6 {
  return {
    id,
    ownerId,
    at,
    level: 1,
    permanentPopulation: 0,
    economicPopulation: 0,
    population: 0,
    isCapital: id === CITY,
    expanded: false,
    rewards: [],
    ...overrides,
  };
}

function player(
  id: PlayerId,
  faction: FactionIdV6,
  researchedTechs: readonly TechnologyId[],
  coins = 100,
): PublicPlayerStateV6 {
  return {
    id,
    seat: id === OWN ? 0 : 1,
    controller: id === OWN ? "HUMAN" : "AI",
    color: id === OWN ? "CORAL" : "TEAL",
    faction,
    factionTreeId:
      faction === "CANDY" ? "CANDY_BASELINE_V1" : "ORIGINAL_BASELINE",
    status: "ACTIVE",
    coins,
    researchedTechs,
  };
}

function baseView(
  options: {
    readonly faction?: FactionIdV6;
    readonly techs?: readonly TechnologyId[];
    readonly coins?: number;
  } = {},
): PlayerViewV6 {
  const faction = options.faction ?? "ORIGINAL";
  const techs = options.techs ?? TECHNOLOGY_IDS;
  const ownCity = city(CITY, OWN, { x: 5, y: 5 });
  const rivalCity = city(
    ENEMY_CITY,
    ENEMY,
    { x: 9, y: 9 },
    { isCapital: true },
  );
  const tiles: PlayerTileViewV6[] = [];
  const explored: CoordV6[] = [];
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < 11; x += 1) {
      const at = { x, y };
      explored.push(at);
      const own = Math.max(Math.abs(x - 5), Math.abs(y - 5)) <= 2;
      const rival = Math.max(Math.abs(x - 9), Math.abs(y - 9)) <= 1;
      tiles.push({
        at,
        explored: true,
        terrain: "GRASS",
        resource: null,
        improvement: null,
        road: false,
        site:
          x === 5 && y === 5
            ? "CAPITAL"
            : x === 9 && y === 9
              ? "CAPITAL"
              : null,
        territoryCityId: own ? CITY : rival ? ENEMY_CITY : null,
        territoryOwnerId: own ? OWN : rival ? ENEMY : null,
      });
    }
  }
  const publicOwn = player(OWN, faction, techs, options.coins);
  const viewer: PlayerStateV6 = { ...publicOwn, explored };
  return {
    schemaVersion: 6,
    rulesetId: "pulp-wars-poc-6",
    commandIndex: 0,
    setup: {
      rulesetId: "pulp-wars-poc-6",
      mapGenerationRevision: "SPATIAL_ECONOMY",
      seed: 0,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [faction, "ORIGINAL"],
    },
    humanPlayerId: OWN,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: [OWN, ENEMY],
    viewer,
    players: [publicOwn, player(ENEMY, "ORIGINAL", TECHNOLOGY_IDS)],
    leaderboard: [
      {
        playerId: OWN,
        seat: 0,
        controller: "HUMAN",
        color: "CORAL",
        faction,
        status: "ACTIVE",
        isViewer: true,
        cityCount: 1,
        livingUnitCount: 1,
      },
      {
        playerId: ENEMY,
        seat: 1,
        controller: "AI",
        color: "TEAL",
        faction: "ORIGINAL",
        status: "ACTIVE",
        isViewer: false,
        cityCount: 1,
        livingUnitCount: 1,
      },
    ],
    board: { width: 11, height: 11, tiles },
    cities: [ownCity, rivalCity],
    populationContributions: [],
    improvementValues: [],
    units: [
      unit(OWN_UNIT, OWN, "FIGHTER", ownCity.at),
      unit(ENEMY_UNIT, ENEMY, "FIGHTER", rivalCity.at),
    ],
    unitStats: [],
    chocolateWalls: [],
    treasureChests: [],
    pendingChoices: [],
    outcome: null,
  };
}

function withViewer(
  view: PlayerViewV6,
  changes: Partial<PlayerStateV6>,
): PlayerViewV6 {
  const viewer = { ...view.viewer, ...changes };
  return {
    ...view,
    viewer,
    players: view.players.map((candidate) =>
      candidate.id === viewer.id
        ? {
            id: viewer.id,
            seat: viewer.seat,
            controller: viewer.controller,
            color: viewer.color,
            faction: viewer.faction,
            factionTreeId: viewer.factionTreeId,
            status: viewer.status,
            coins: viewer.coins,
            researchedTechs: viewer.researchedTechs,
          }
        : candidate,
    ),
  };
}

interface TileChanges {
  readonly at: CoordV6;
  readonly terrain?: TerrainIdV6;
  readonly resource?: ResourceId | null;
  readonly improvement?: EconomicImprovementId | null;
  readonly road?: boolean;
  readonly site?: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryCityId?: CityId | null;
  readonly territoryOwnerId?: PlayerId | null;
  readonly explored?: boolean;
  readonly diplomaticBlock?: "ALLIED_TERRITORY";
}

function withTiles(
  view: PlayerViewV6,
  changes: readonly TileChanges[],
): PlayerViewV6 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) => {
        const change = changes.find((candidate) => same(candidate.at, tile.at));
        if (change === undefined) return tile;
        if (change.explored === false) {
          return {
            at: tile.at,
            explored: false,
            ...(change.diplomaticBlock === undefined
              ? {}
              : { diplomaticBlock: change.diplomaticBlock }),
          };
        }
        if (!tile.explored) throw new Error("Cannot reveal without full facts");
        return { ...tile, ...change, explored: true };
      }),
    },
  };
}

function withOwnCity(
  view: PlayerViewV6,
  changes: Partial<CityStateV6>,
): PlayerViewV6 {
  return {
    ...view,
    cities: view.cities.map((candidate) =>
      candidate.id === CITY ? { ...candidate, ...changes } : candidate,
    ),
  };
}

function scored(
  view: PlayerViewV6,
  predicate: (command: CommandV6) => boolean,
) {
  const candidate = chooseNormalCommandV6(view).candidates.find(({ command }) =>
    predicate(command),
  );
  if (candidate === undefined) throw new Error("Missing scored candidate");
  return candidate;
}

function commandAt(kind: CommandV6["kind"], at: CoordV6) {
  return (command: CommandV6): boolean =>
    command.kind === kind && "at" in command && same(command.at, at);
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

describe("ruleset-6 exact Normal reward and research policy", () => {
  it.each([
    [2, 3, false, "STOCKPILE"],
    [2, 4, false, "SURVEY"],
    [3, 10, false, "WALLS"],
    [3, 10, true, "MILITIA"],
    [4, 10, false, "BOOM"],
    [5, 10, false, "JUGGERNAUT"],
  ] as const)(
    "chooses the documented level-%i reward boundary",
    (level, coins, threatened, reward) => {
      let view = baseView({ coins });
      view = {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: CITY,
            reachedLevel: level,
            candidates:
              level === 2
                ? ["SURVEY", "STOCKPILE"]
                : level === 3
                  ? ["WALLS", "MILITIA"]
                  : level === 4
                    ? ["EXPAND", "BOOM"]
                    : ["JUGGERNAUT", "TREASURY"],
          },
        ],
        units: threatened
          ? [
              ...view.units.filter((candidate) => candidate.id !== ENEMY_UNIT),
              unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 4 }),
            ]
          : view.units,
      };
      const decision = chooseNormalCommandV6(view);
      expect(decision.command).toMatchObject({
        kind: "CHOOSE_CITY_REWARD",
        reward,
      });
      expect(decision.candidates[0]?.score.priority).toBe(1300);
    },
  );

  it("chooses Expand for four public neutral cells and Treasury after a Juggernaut", () => {
    let expand = baseView();
    expand = withTiles(
      expand,
      [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 6, y: 3 },
      ].map((at) => ({ at, territoryCityId: null, territoryOwnerId: null })),
    );
    expand = {
      ...expand,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: CITY,
          reachedLevel: 4,
          candidates: ["EXPAND", "BOOM"],
        },
      ],
    };
    expect(chooseNormalCommandV6(expand).command).toMatchObject({
      reward: "EXPAND",
    });

    const treasury: PlayerViewV6 = {
      ...baseView(),
      units: [unit(OWN_UNIT, OWN, "JUGGERNAUT", { x: 5, y: 5 })],
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: CITY,
          reachedLevel: 5,
          candidates: ["JUGGERNAUT", "TREASURY"],
        },
      ],
    };
    expect(chooseNormalCommandV6(treasury).command).toMatchObject({
      reward: "TREASURY",
    });
  });

  it("separates shortest economic, missing-role, and other research", () => {
    let view = baseView({ techs: ["GATHERING"], coins: 100 });
    view = withTiles(view, [
      {
        at: { x: 4, y: 5 },
        resource: "FERTILE_GROUND",
      },
    ]);
    expect(
      scored(
        view,
        (command) => command.kind === "RESEARCH" && command.tech === "FARMING",
      ).score.priority,
    ).toBe(1160);
    expect(
      scored(
        view,
        (command) => command.kind === "RESEARCH" && command.tech === "SCOUTING",
      ).score.priority,
    ).toBe(1060);
    expect(
      scored(
        view,
        (command) => command.kind === "RESEARCH" && command.tech === "HUNTING",
      ).score.priority,
    ).toBe(1040);

    let milling = withViewer(view, {
      researchedTechs: ["GATHERING", "FARMING"],
    });
    milling = withOwnCity(
      withTiles(milling, [
        { at: { x: 4, y: 5 }, resource: null, improvement: "FARM" },
        { at: { x: 4, y: 4 }, improvement: null },
      ]),
      { level: 2, economicPopulation: 2, population: 0 },
    );
    expect(
      scored(
        milling,
        (command) => command.kind === "RESEARCH" && command.tech === "MILLING",
      ).score.priority,
    ).toBe(1160);
  });

  it("uses mechanical roles for Original and Candy general/threatened production", () => {
    const empty = { x: 4, y: 4 };
    let original: PlayerViewV6 = {
      ...baseView(),
      units: [unit(OWN_UNIT, OWN, "FIGHTER", empty)],
    };
    expect(
      scored(original, (command) => command.kind === "TRAIN").command,
    ).toMatchObject({ role: "SCOUT" });
    original = {
      ...original,
      units: [
        ...original.units,
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 4 }),
      ],
    };
    expect(
      scored(original, (command) => command.kind === "TRAIN").command,
    ).toMatchObject({ role: "GUARD" });

    const candyBase = baseView({ faction: "CANDY" });
    const candy: PlayerViewV6 = {
      ...withOwnCity(candyBase, { level: 2 }),
      units: [
        unit(OWN_UNIT, OWN, "FIGHTER", empty),
        unit(31 as UnitId, OWN, "SCOUT", { x: 3, y: 4 }),
      ],
    };
    expect(
      scored(candy, (command) => command.kind === "TRAIN").command,
    ).toMatchObject({ role: "RAIDER" });
  }, 10_000);
});

describe("ruleset-6 exact Normal economy policy", () => {
  it("assigns level, recurring, productive-basic, processor, and Grand Works priorities", () => {
    const target = { x: 4, y: 5 };
    let level = baseView({ techs: ["GATHERING"], coins: 100 });
    level = {
      ...withTiles(level, [{ at: target, resource: "FRUIT" }]),
      cities: level.cities.map((value) =>
        value.id === CITY
          ? { ...value, permanentPopulation: 1, population: 1 }
          : value,
      ),
    };
    expect(
      scored(level, commandAt("HARVEST_FRUIT", target)).score.priority,
    ).toBe(1210);

    let farm = withOwnCity(baseView({ techs: ["GATHERING", "FARMING"] }), {
      level: 2,
      population: 0,
    });
    farm = withTiles(farm, [{ at: target, resource: "FERTILE_GROUND" }]);
    expect(scored(farm, commandAt("BUILD_FARM", target)).score.priority).toBe(
      1140,
    );

    let market = withOwnCity(baseView(), {
      level: 2,
      economicPopulation: 4,
      population: 2,
    });
    market = withTiles(market, [
      { at: target, improvement: null },
      { at: { x: 3, y: 4 }, improvement: "FARM" },
      { at: { x: 4, y: 4 }, improvement: "MINE" },
    ]);
    expect(
      scored(market, commandAt("BUILD_MARKET", target)).score.priority,
    ).toBe(1200);

    let processor = withOwnCity(baseView(), {
      level: 2,
      economicPopulation: 2,
      population: 0,
    });
    processor = withTiles(processor, [
      { at: target, improvement: null },
      { at: { x: 4, y: 4 }, improvement: "FARM" },
    ]);
    expect(
      scored(processor, commandAt("BUILD_WINDMILL", target)).score.priority,
    ).toBeGreaterThanOrEqual(1140);

    let diversity = withOwnCity(baseView(), {
      level: 3,
      economicPopulation: 4,
      population: -1,
    });
    diversity = withTiles(diversity, [
      { at: target, improvement: null },
      { at: { x: 3, y: 4 }, improvement: "FARM" },
      { at: { x: 4, y: 4 }, improvement: "MINE" },
    ]);
    const workshop = scored(diversity, commandAt("BUILD_WORKSHOP", target));
    expect(workshop.score.priority).toBe(1200);
    expect(workshop.score.immediateValue).toBeGreaterThan(0);

    let grand = baseView();
    grand = withTiles(grand, [
      { at: target, improvement: null },
      { at: { x: 3, y: 4 }, improvement: "WINDMILL" },
      { at: { x: 4, y: 4 }, improvement: "SAWMILL" },
      { at: { x: 3, y: 5 }, improvement: "FORGE" },
    ]);
    const grandCandidate = scored(
      grand,
      commandAt("BUILD_GRAND_WORKS", target),
    );
    expect(grandCandidate.score.priority).toBe(1210);
    expect(grandCandidate.score.immediateValue).toBeGreaterThan(0);
  }, 10_000);

  it("uses priority 1120 for the exact Market-capital Road connection", () => {
    const road = { x: 6, y: 5 };
    let view = withOwnCity(baseView(), {
      level: 3,
      economicPopulation: 6,
      population: 1,
    });
    view = withTiles(view, [
      { at: { x: 7, y: 5 }, improvement: "MARKET" },
      { at: { x: 7, y: 4 }, improvement: "FARM" },
      { at: { x: 7, y: 6 }, improvement: "MINE" },
      { at: road, road: false },
    ]);
    const candidate = scored(view, commandAt("BUILD_ROAD", road));
    expect(previewEconomicV6(view, candidate.command)).toMatchObject({
      ok: true,
      preview: { capitalRoadConnected: true },
    });
    expect(candidate.score.priority).toBe(1120);
  });

  it("preserves future value for Replant/Redevelop and applies the exact Clear +1-Coin boundary", () => {
    const target = { x: 4, y: 5 };
    const replant = baseView();
    const replantScore = scorePublicSpatialPlanV6(replant, {
      kind: "REPLANT_FOREST",
      at: target,
    });
    expect(replantScore).toBeGreaterThan(0);
    expect(
      scored(replant, commandAt("REPLANT_FOREST", target)).score.priority,
    ).toBe(1100);

    const redevelop = withOwnCity(
      withTiles(baseView(), [
        {
          at: target,
          improvement: "QUARRY",
          terrain: "GRASS",
          resource: "FERTILE_GROUND",
        },
      ]),
      { economicPopulation: 1, population: 1 },
    );
    const redevelopScore = scorePublicSpatialPlanV6(redevelop, {
      kind: "REDEVELOP",
      at: target,
    });
    expect(redevelopScore).toBeGreaterThan(0);
    expect(
      scored(redevelop, commandAt("REDEVELOP", target)).score.priority,
    ).toBe(1100);

    let blockedClear = baseView({
      techs: ["GATHERING", "HUNTING", "FORESTRY"],
      coins: 1,
    });
    blockedClear = withTiles(blockedClear, [
      { at: target, terrain: "FOREST" },
      { at: { x: 6, y: 5 }, resource: "FRUIT" },
    ]);
    expect(
      scorePublicSpatialPlanV6(blockedClear, {
        kind: "CLEAR_FOREST",
        at: target,
      }),
    ).toBeLessThan(0);
    expect(
      chooseNormalCommandV6(blockedClear).candidates.some(({ command }) =>
        commandAt("CLEAR_FOREST", target)(command),
      ),
    ).toBe(false);

    const enabledClear = {
      ...blockedClear,
      cities: blockedClear.cities.map((value) =>
        value.id === CITY
          ? { ...value, permanentPopulation: 1, population: 1 }
          : value,
      ),
    };
    expect(
      scored(enabledClear, commandAt("CLEAR_FOREST", target)).score.priority,
    ).toBe(1140);
  });
});

describe("ruleset-6 exact Normal combat and Candy policy", () => {
  it.each([
    [true, 1, 1280],
    [true, 10, 1240],
    [false, 1, 1180],
    [false, 10, 900],
  ] as const)(
    "scores threat=%s hp=%i at priority %i",
    (threat, hp, priority) => {
      const ownAt = threat ? { x: 5, y: 5 } : { x: 2, y: 2 };
      const enemyAt = threat ? { x: 5, y: 4 } : { x: 3, y: 2 };
      const view: PlayerViewV6 = {
        ...baseView(),
        units: [
          unit(OWN_UNIT, OWN, "FIGHTER", ownAt),
          unit(ENEMY_UNIT, ENEMY, "FIGHTER", enemyAt, { hp }),
        ],
      };
      expect(
        scored(view, (command) => command.kind === "ATTACK").score.priority,
      ).toBe(priority);
    },
  );

  it("prioritizes threatened/general Heal and low/ordinary Recover", () => {
    const medic = unit(OWN_UNIT, OWN, "MEDIC", { x: 4, y: 5 });
    const defender = unit(
      31 as UnitId,
      OWN,
      "FIGHTER",
      { x: 5, y: 5 },
      { hp: 3 },
    );
    const threatened: PlayerViewV6 = {
      ...baseView(),
      units: [
        medic,
        defender,
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 4 }),
      ],
    };
    expect(
      scored(threatened, (command) => command.kind === "HEAL_ADJACENT").score
        .priority,
    ).toBe(1270);
    const calm = { ...threatened, units: [medic, defender] };
    expect(
      scored(calm, (command) => command.kind === "HEAL_ADJACENT").score
        .priority,
    ).toBe(500);

    for (const [hp, priority] of [
      [4, 400],
      [6, 300],
    ] as const) {
      const recovery = {
        ...baseView(),
        units: [unit(OWN_UNIT, OWN, "FIGHTER", { x: 5, y: 5 }, { hp })],
      };
      expect(
        scored(recovery, (command) => command.kind === "RECOVER").score
          .priority,
      ).toBe(priority);
    }
  }, 10_000);

  it("uses public Charge and Breach previews", () => {
    const charge: PlayerViewV6 = {
      ...baseView(),
      units: [
        unit(
          OWN_UNIT,
          OWN,
          "RAIDER",
          { x: 2, y: 2 },
          { activation: activation({ moved: true, movedPathLength: 2 }) },
        ),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 3, y: 2 }),
      ],
    };
    const attack = scored(
      charge,
      (command) => command.kind === "ATTACK",
    ).command;
    if (attack.kind !== "ATTACK") throw new Error("Missing Charge attack");
    expect(
      queryCombatPreviewV6(charge, attack.unitId, attack.target)?.chargeApplied,
    ).toBe(true);

    const fortifiedEnemy = city(
      ENEMY_CITY,
      ENEMY,
      { x: 9, y: 9 },
      {
        isCapital: true,
        rewards: [{ reachedLevel: 3, reward: "WALLS" }],
      },
    );
    const breach: PlayerViewV6 = {
      ...baseView(),
      cities: [city(CITY, OWN, { x: 5, y: 5 }), fortifiedEnemy],
      units: [
        unit(OWN_UNIT, OWN, "BREACHER", { x: 8, y: 9 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 9, y: 9 }),
      ],
    };
    const breached = scored(breach, (command) => command.kind === "ATTACK");
    expect(breached.score.strategicValue).toBe(1);
  });

  it("adds Push value only for the three documented public positions", () => {
    const irrelevant: PlayerViewV6 = {
      ...baseView(),
      cities: [city(CITY, OWN, { x: 5, y: 5 })],
      units: [
        unit(OWN_UNIT, OWN, "HEAVY", { x: 1, y: 1 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 2, y: 1 }),
      ],
    };
    expect(
      scored(irrelevant, (command) => command.kind === "ATTACK").score
        .strategicValue,
    ).toBe(0);

    const offOwnedCity: PlayerViewV6 = {
      ...baseView(),
      units: [
        unit(OWN_UNIT, OWN, "HEAVY", { x: 4, y: 5 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 5 }),
      ],
    };
    expect(
      scored(offOwnedCity, (command) => command.kind === "ATTACK").score
        .strategicValue,
    ).toBe(4);

    const lowerDefense: PlayerViewV6 = {
      ...baseView(),
      units: [
        unit(OWN_UNIT, OWN, "HEAVY", { x: 8, y: 9 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 9, y: 9 }),
      ],
    };
    expect(
      scored(lowerDefense, (command) => command.kind === "ATTACK").score
        .strategicValue,
    ).toBe(1);

    const blockingBase = baseView();
    let blocking: PlayerViewV6 = {
      ...blockingBase,
      units: [
        unit(OWN_UNIT, OWN, "HEAVY", { x: 0, y: 0 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 1, y: 1 }),
      ],
    };
    blocking = withTiles(blocking, [{ at: { x: 2, y: 0 }, site: "VILLAGE" }]);
    const blockingAttack = scored(
      blocking,
      (command) => command.kind === "ATTACK",
    );
    if (blockingAttack.command.kind !== "ATTACK") {
      throw new Error("Missing blocking Push attack");
    }
    expect(
      queryCombatPreviewV6(
        blocking,
        blockingAttack.command.unitId,
        blockingAttack.command.target,
      )?.push,
    ).toBe("WILL_PUSH");
    expect(blockingAttack.score.strategicValue).toBe(1);
  });

  it("allows only safe visible Roll value and excludes friendly/allied or blocked-fog lines", () => {
    const candy = baseView({ faction: "CANDY" });
    const safe: PlayerViewV6 = {
      ...candy,
      units: [
        unit(OWN_UNIT, OWN, "RAIDER", { x: 2, y: 2 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 4, y: 2 }),
      ],
    };
    expect(
      scored(
        safe,
        (command) =>
          command.kind === "KAMIKAZE_ROLL" && command.direction === "EAST",
      ).score.priority,
    ).toBe(880);
    const friendly = {
      ...safe,
      units: [
        ...safe.units,
        unit(31 as UnitId, OWN, "FIGHTER", { x: 3, y: 2 }),
      ],
    };
    expect(
      chooseNormalCommandV6(friendly).candidates.some(
        ({ command }) =>
          command.kind === "KAMIKAZE_ROLL" && command.direction === "EAST",
      ),
    ).toBe(false);
    const allied: PlayerViewV6 = {
      ...safe,
      humanPlayerId: 99 as PlayerId,
      setup: { ...safe.setup, aiMode: "COOPERATIVE" },
      viewer: { ...safe.viewer, controller: "AI" },
      players: safe.players.map((candidate) => ({
        ...candidate,
        controller: "AI" as const,
      })),
    };
    expect(
      chooseNormalCommandV6(allied).candidates.some(
        ({ command }) =>
          command.kind === "KAMIKAZE_ROLL" && command.direction === "EAST",
      ),
    ).toBe(false);
    const blocked = withTiles(safe, [
      {
        at: { x: 3, y: 2 },
        explored: false,
        diplomaticBlock: "ALLIED_TERRITORY",
      },
    ]);
    expect(
      chooseNormalCommandV6(blocked).candidates.some(
        ({ command }) =>
          command.kind === "KAMIKAZE_ROLL" && command.direction === "EAST",
      ),
    ).toBe(false);
  }, 10_000);

  it("uses traversable shortest paths instead of geometric Wall approximation", () => {
    const open: PlayerViewV6 = {
      ...baseView({ faction: "CANDY", techs: ["GATHERING"] }),
      cities: [city(CITY, OWN, { x: 5, y: 5 })],
      units: [
        unit(OWN_UNIT, OWN, "GUARD", { x: 4, y: 4 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 3 }),
      ],
    };
    expect(
      chooseNormalCommandV6(open).candidates.some(
        ({ command }) => command.kind === "BUILD_CHOCOLATE_WALL",
      ),
    ).toBe(false);
  });

  it("orders exact Wall blocks by economics, terrain, coordinates, and unit IDs", () => {
    let view = baseView({ faction: "CANDY", techs: ["GATHERING"] });
    const explored = new Set(["3,5", "4,5", "5,5", "5,3", "5,4", "4,6", "6,4"]);
    view = {
      ...view,
      cities: [city(CITY, OWN, { x: 5, y: 5 })],
      units: [
        unit(OWN_UNIT, OWN, "GUARD", { x: 4, y: 6 }),
        unit(31 as UnitId, OWN, "GUARD", { x: 6, y: 4 }),
        unit(ENEMY_UNIT, ENEMY, "FIGHTER", { x: 5, y: 3 }),
        unit(32 as UnitId, ENEMY, "FIGHTER", { x: 3, y: 5 }),
      ],
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) =>
          explored.has(`${tile.at.y},${tile.at.x}`)
            ? tile
            : { at: tile.at, explored: false as const },
        ),
      },
    };
    const economicAvoidance = withTiles(view, [
      { at: { x: 5, y: 4 }, terrain: "GRASS", resource: "FRUIT" },
      {
        at: { x: 4, y: 5 },
        terrain: "MOUNTAIN",
        resource: null,
        road: true,
      },
    ]);
    const avoidedWalls = chooseNormalCommandV6(
      economicAvoidance,
    ).candidates.filter(
      ({ command }) => command.kind === "BUILD_CHOCOLATE_WALL",
    );
    expect(avoidedWalls[0]?.score.strategicValue).toBe(1);
    expect(avoidedWalls[0]?.command).toMatchObject({ at: { x: 4, y: 5 } });

    const terrainTie = withTiles(view, [
      { at: { x: 5, y: 4 }, terrain: "GRASS", resource: null },
      { at: { x: 4, y: 5 }, terrain: "FOREST", resource: null },
    ]);
    const terrainWalls = chooseNormalCommandV6(terrainTie).candidates.filter(
      ({ command }) => command.kind === "BUILD_CHOCOLATE_WALL",
    );
    expect(terrainWalls[0]?.command).toMatchObject({ at: { x: 5, y: 4 } });
    expect(terrainWalls[0]?.score.futureValue).toBeGreaterThan(
      terrainWalls.find(
        ({ command }) =>
          command.kind === "BUILD_CHOCOLATE_WALL" &&
          same(command.at, { x: 4, y: 5 }),
      )?.score.futureValue ?? 0,
    );

    const coordinateTie = withTiles(view, [
      { at: { x: 5, y: 4 }, terrain: "GRASS", resource: null },
      { at: { x: 4, y: 5 }, terrain: "GRASS", resource: null },
    ]);
    expect(
      chooseNormalCommandV6(coordinateTie).candidates.find(
        ({ command }) => command.kind === "BUILD_CHOCOLATE_WALL",
      )?.command,
    ).toMatchObject({ at: { x: 5, y: 4 } });

    const twoEngineers: PlayerViewV6 = {
      ...coordinateTie,
      units: [
        ...coordinateTie.units,
        unit(20 as UnitId, OWN, "GUARD", { x: 4, y: 4 }),
      ],
    };
    const sameTarget = chooseNormalCommandV6(twoEngineers).candidates.filter(
      ({ command }) =>
        command.kind === "BUILD_CHOCOLATE_WALL" &&
        same(command.at, { x: 5, y: 4 }),
    );
    expect(
      sameTarget.map(({ command }) =>
        command.kind === "BUILD_CHOCOLATE_WALL" ? command.unitId : null,
      ),
    ).toEqual([20, 31]);
  });

  it("scores hostile above neutral Candify and resolves tied city IDs canonically", () => {
    const candy = baseView({ faction: "CANDY" });
    let hostile: PlayerViewV6 = {
      ...withOwnCity(candy, { expanded: true }),
      units: [unit(OWN_UNIT, OWN, "JUGGERNAUT", { x: 6, y: 5 })],
    };
    hostile = withTiles(hostile, [
      {
        at: { x: 6, y: 5 },
        territoryCityId: ENEMY_CITY,
        territoryOwnerId: ENEMY,
      },
    ]);
    expect(
      scored(hostile, (command) => command.kind === "CANDIFY").score.priority,
    ).toBe(1020);
    const neutral = withTiles(hostile, [
      { at: { x: 6, y: 5 }, territoryCityId: null, territoryOwnerId: null },
    ]);
    expect(
      scored(neutral, (command) => command.kind === "CANDIFY").score.priority,
    ).toBe(1000);

    const choice: PlayerViewV6 = {
      ...neutral,
      cities: [
        city(CITY, OWN, { x: 5, y: 5 }, { expanded: true }),
        city(13 as CityId, OWN, { x: 7, y: 7 }, { expanded: true }),
      ],
      pendingChoices: [
        {
          kind: "CANDIFY_CITY",
          unitId: OWN_UNIT,
          candidateCityIds: [13 as CityId, CITY],
        },
      ],
    };
    expect(chooseNormalCommandV6(choice).command).toMatchObject({
      kind: "CHOOSE_CANDIFY_CITY",
      cityId: CITY,
    });
  });

  it("uses every frozen tuple field for canonical equal-priority ties", () => {
    const view: PlayerViewV6 = {
      ...baseView(),
      units: [unit(OWN_UNIT, OWN, "FIGHTER", { x: 5, y: 5 })],
    };
    const moves = chooseNormalCommandV6(view).candidates.filter(
      ({ command }) => command.kind === "MOVE",
    );
    for (let index = 1; index < moves.length; index += 1) {
      const previous = moves[index - 1];
      const current = moves[index];
      if (previous === undefined || current === undefined) continue;
      expect(previous.tuple).toHaveLength(11);
      expect(previous.tuple.join(",") >= current.tuple.join(",")).toBeTypeOf(
        "boolean",
      );
    }
    expect(
      scoreCommandV6(view, { kind: "END_TURN" }).deterministicTieBreak,
    ).toEqual([-31, 1, 1, 0, 0]);
  });
});
