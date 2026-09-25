import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  canonicalHash,
  marketIncomeForCityV7,
  parseEventV7,
  parseGameStateV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  resolveCityGrowthV7,
  roadPopulationForCityV7,
  startTurnEconomyV7,
  viewForV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { coastalV7, withPortV7 } from "../fixtures/v7-naval-builders";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
} from "../fixtures/v7-builders";

describe("Ruleset 7 revision 11 city logistics", () => {
  it("uses one private city action across land, naval, and Land Grant", () => {
    const fixture = withPortV7(11_001);
    const actor = fixture.state.humanPlayerId;
    const city = required(
      fixture.state.cities.find((candidate) => candidate.ownerId === actor),
      "human city missing",
    );
    const starter = required(
      fixture.state.units.find((unit) => unit.ownerId === actor),
      "starter missing",
    );
    const empty = required(
      fixture.state.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.improvement === null &&
          !same(tile.at, city.at) &&
          !same(tile.at, fixture.portAt) &&
          !fixture.state.units.some((unit) => same(unit.at, tile.at)),
      ),
      "empty city tile missing",
    );
    const prepared = allTechsV7(richV7(fixture.state, 1_000));
    const growthTiles = prepared.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          tile.improvement === null &&
          !same(tile.at, fixture.portAt),
      )
      .slice(0, 3);
    expect(growthTiles).toHaveLength(3);
    const economicPopulation = city.economicPopulation + 6;
    const grown = resolveCityGrowthV7(
      city,
      city.permanentPopulation,
      economicPopulation,
    ).city;
    const base = checkedV7({
      ...prepared,
      nextEntityId: (prepared.nextEntityId + 3) as GameStateV7["nextEntityId"],
      cities: prepared.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...grown,
              economicPopulation,
              rewards: [
                { reachedLevel: 2, reward: "SURVEY" as const },
                { reachedLevel: 3, reward: "MILITIA" as const },
              ],
            }
          : candidate,
      ),
      board: {
        ...prepared.board,
        tiles: prepared.board.tiles.map((tile) =>
          growthTiles.some((growth) => same(growth.at, tile.at))
            ? { ...tile, improvement: "FARM" as const, resource: null }
            : tile,
        ),
      },
      populationContributions: [
        ...prepared.populationContributions,
        ...growthTiles.map((tile, index) => ({
          id: (prepared.nextEntityId + index) as GameStateV7["nextEntityId"],
          cityId: city.id,
          category: "LIVE" as const,
          amount: 2,
          source: {
            kind: "IMPROVEMENT" as const,
            improvement: "FARM" as const,
            at: tile.at,
          },
        })),
      ],
      units: prepared.units.map((unit) =>
        unit.id === starter.id ? { ...unit, at: empty.at } : unit,
      ),
    });
    const view = viewForV7(base, actor);
    expect(
      view.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      cityActionAvailable: true,
    });
    const opponent = required(
      base.players.find((player) => player.id !== actor),
      "opponent missing",
    );
    const observed = {
      ...base,
      players: base.players.map((player) =>
        player.id === opponent.id
          ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
          : player,
      ),
    };
    expect(
      viewForV7(observed, opponent.id).cities.find(
        (candidate) => candidate.id === city.id,
      ),
    ).not.toHaveProperty("cityActionAvailable");

    const commands = queryPlayerCommandsV7(view);
    const firstByKind = {
      TRAIN: required(
        commands.find(
          (command) => command.kind === "TRAIN" && command.cityId === city.id,
        ),
        "land training missing",
      ),
      TRAIN_NAVAL: required(
        commands.find(
          (command) =>
            command.kind === "TRAIN_NAVAL" && command.cityId === city.id,
        ),
        "naval training missing",
      ),
      LAND_GRANT: required(
        commands.find(
          (command) =>
            command.kind === "LAND_GRANT" && command.cityId === city.id,
        ),
        "Land Grant missing",
      ),
    } as const;
    for (const first of Object.values(firstByKind)) {
      const accepted = applyCommandV7(base, actor, first);
      expect(accepted.accepted, first.kind).toBe(true);
      if (!accepted.accepted) continue;
      expect(
        accepted.state.cities.find((candidate) => candidate.id === city.id),
      ).toMatchObject({ cityActionAvailable: false });
      expect(
        queryPlayerCommandsV7(viewForV7(accepted.state, actor)).filter(
          (command) =>
            "cityId" in command &&
            command.cityId === city.id &&
            ["TRAIN", "TRAIN_NAVAL", "LAND_GRANT"].includes(command.kind),
        ),
      ).toEqual([]);
      for (const attempted of Object.values(firstByKind)) {
        const rejected = applyCommandV7(accepted.state, actor, attempted);
        expect(rejected).toMatchObject({
          accepted: false,
          state: accepted.state,
          events: [],
          error: { code: "CITY_ACTION_SPENT", params: { cityId: city.id } },
        });
      }
    }
  });

  it("resets city actions on the ordinary end-turn path and rejects missing schema fields", () => {
    const base = exploredAllV7(richV7(initialV7(11_002), 100));
    const actor = base.humanPlayerId;
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
      "human city missing",
    );
    const starter = required(
      base.units.find((unit) => unit.ownerId === actor),
      "starter missing",
    );
    const destination = required(
      base.board.tiles.find(
        (tile) =>
          tile.territoryCityId === city.id &&
          tile.site === null &&
          !same(tile.at, city.at) &&
          !base.units.some((unit) => same(unit.at, tile.at)),
      ),
      "destination missing",
    );
    const ready = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === starter.id ? { ...unit, at: destination.at } : unit,
      ),
    });
    const train = required(
      queryPlayerCommandsV7(viewForV7(ready, actor)).find(
        (command) => command.kind === "TRAIN" && command.cityId === city.id,
      ),
      "training missing",
    );
    const spent = accept(ready, actor, train);
    const ended = accept(spent, actor, { kind: "END_TURN" });
    const opponent = required(
      ended.turnOrder[ended.activeSeatIndex],
      "opponent turn missing",
    );
    const returned = accept(ended, opponent, { kind: "END_TURN" });
    expect(
      returned.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({
      cityActionAvailable: true,
    });
    const serialized = JSON.parse(JSON.stringify(returned)) as Record<
      string,
      unknown
    >;
    const cities = serialized.cities as Record<string, unknown>[];
    delete required(cities[0], "city missing").cityActionAvailable;
    expect(parseGameStateV7(serialized)).toBeNull();
    expect(canonicalHash(spent)).not.toBe(canonicalHash(returned));
  });

  it("creates a captured city with its action unavailable", () => {
    const base = exploredAllV7(initialV7(11_008));
    const actor = base.humanPlayerId;
    const unit = required(
      base.units.find((candidate) => candidate.ownerId === actor),
      "unit missing",
    );
    const village = required(
      base.board.tiles.find(
        (tile) =>
          tile.biome !== null &&
          tile.terrain !== "MOUNTAIN" &&
          tile.territoryCityId === null &&
          tile.site === null &&
          !base.units.some((candidate) => same(candidate.at, tile.at)),
      ),
      "village tile missing",
    );
    const state = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) => !same(chest, village.at),
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, village.at)
            ? {
                ...tile,
                site: "VILLAGE" as const,
                resource: null,
                improvement: null,
                road: false,
                fieldDefense: false,
              }
            : tile,
        ),
      },
      units: base.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, at: village.at, captureEligible: true }
          : candidate,
      ),
    });
    const captured = applyCommandV7(state, actor, {
      kind: "CAPTURE",
      unitId: unit.id,
    });
    expect(captured.accepted).toBe(true);
    if (!captured.accepted) return;
    const city = required(
      captured.state.cities.find((candidate) => same(candidate.at, village.at)),
      "captured city missing",
    );
    expect(city.cityActionAvailable).toBe(false);
    expect(
      queryPlayerCommandsV7(viewForV7(captured.state, actor)).filter(
        (command) => "cityId" in command && command.cityId === city.id,
      ),
    ).toEqual([]);
  });

  it("sets hostile city capture and recapture unavailable for each new owner", () => {
    const base = exploredAllV7(initialV7(11_009, 2));
    const actor = base.humanPlayerId;
    const opponents = base.players.filter((player) => player.id !== actor);
    const opponent = required(opponents[0], "opponent missing");
    const recapturer = required(opponents[1], "recapturer missing");
    const hostileCity = required(
      base.cities.find((city) => city.ownerId === opponent.id),
      "hostile city missing",
    );
    const attacker = required(
      base.units.find((unit) => unit.ownerId === actor),
      "attacker missing",
    );
    const defender = required(
      base.units.find((unit) => unit.ownerId === opponent.id),
      "defender missing",
    );
    const recapturingUnit = required(
      base.units.find((unit) => unit.ownerId === recapturer.id),
      "recapturing unit missing",
    );
    const holdings = base.board.tiles
      .filter(
        (tile) =>
          tile.biome !== null &&
          tile.territoryCityId === null &&
          tile.site === null &&
          !base.units.some((unit) => same(unit.at, tile.at)),
      )
      .slice(0, 2);
    const holding = required(holdings[0], "holding tile missing");
    const secondHolding = required(holdings[1], "second holding tile missing");
    const invasion = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) => !holdings.some((tile) => same(chest, tile.at)),
      ),
      units: base.units.map((unit) =>
        unit.id === attacker.id
          ? { ...unit, at: hostileCity.at, captureEligible: true }
          : unit.id === defender.id
            ? { ...unit, at: holding.at }
            : unit.id === recapturingUnit.id
              ? { ...unit, at: secondHolding.at }
              : unit,
      ),
    });
    const captured = accept(invasion, actor, {
      kind: "CAPTURE",
      unitId: attacker.id,
    });
    expect(
      captured.cities.find((city) => city.id === hostileCity.id),
    ).toMatchObject({ ownerId: actor, cityActionAvailable: false });
    const recaptureSetup = checkedV7({
      ...captured,
      activeSeatIndex: captured.turnOrder.indexOf(recapturer.id),
      units: captured.units.map((unit) =>
        unit.id === attacker.id
          ? { ...unit, at: secondHolding.at, captureEligible: false }
          : unit.id === recapturingUnit.id
            ? {
                ...unit,
                at: hostileCity.at,
                captureEligible: true,
                activation: {
                  ...unit.activation,
                  moved: false,
                  captured: false,
                  handled: false,
                },
              }
            : unit,
      ),
    });
    const recaptured = accept(recaptureSetup, recapturer.id, {
      kind: "CAPTURE",
      unitId: recapturingUnit.id,
    });
    expect(
      recaptured.cities.find((city) => city.id === hostileCity.id),
    ).toMatchObject({ ownerId: recapturer.id, cityActionAvailable: false });
  });

  it("allows reward choice and reward spawning after the city action is spent", () => {
    const original = exploredAllV7(allTechsV7(richV7(initialV7(11_010), 100)));
    const actor = original.humanPlayerId;
    const city = required(
      original.cities.find((candidate) => candidate.ownerId === actor),
      "city missing",
    );
    const starter = required(
      original.units.find((unit) => unit.ownerId === actor),
      "starter missing",
    );
    const owned = original.board.tiles.filter(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    const destination = required(
      owned.find(
        (tile) =>
          !same(tile.at, city.at) &&
          !original.units.some((unit) => same(unit.at, tile.at)),
      ),
      "destination missing",
    );
    const farms = owned
      .filter(
        (tile) =>
          !same(tile.at, city.at) &&
          !same(tile.at, destination.at) &&
          !original.units.some((unit) => same(unit.at, tile.at)),
      )
      .slice(0, 3);
    expect(farms).toHaveLength(3);
    const base = checkedV7({
      ...original,
      treasureChests: original.treasureChests.filter(
        (chest) => !farms.some((farm) => same(chest, farm.at)),
      ),
      board: {
        ...original.board,
        tiles: original.board.tiles.map((tile) =>
          farms.some((farm) => same(tile.at, farm.at))
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
              }
            : tile,
        ),
      },
      units: original.units.map((unit) =>
        unit.id === starter.id ? { ...unit, at: destination.at } : unit,
      ),
    });
    const trained = accept(base, actor, {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    });
    const firstFarm = required(farms[0], "first farm missing");
    const grown = accept(trained, actor, {
      kind: "BUILD_FARM",
      at: firstFarm.at,
    });
    expect(grown.pendingChoices[0]).toMatchObject({
      cityId: city.id,
      reachedLevel: 2,
    });
    const levelTwo = applyCommandV7(grown, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 2,
      reward: "SURVEY",
    });
    expect(levelTwo.accepted).toBe(true);
    if (!levelTwo.accepted) return;
    const secondFarm = required(farms[1], "second farm missing");
    const thirdFarm = required(farms[2], "third farm missing");
    const moreGrowth = accept(
      accept(levelTwo.state, actor, { kind: "BUILD_FARM", at: secondFarm.at }),
      actor,
      { kind: "BUILD_FARM", at: thirdFarm.at },
    );
    expect(moreGrowth.pendingChoices[0]).toMatchObject({
      cityId: city.id,
      reachedLevel: 3,
    });
    const rewarded = applyCommandV7(moreGrowth, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel: 3,
      reward: "MILITIA",
    });
    expect(rewarded.accepted).toBe(true);
    if (!rewarded.accepted) return;
    expect(rewarded.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_REWARD_GRANTED", role: "FIGHTER" }),
    );
    expect(
      rewarded.state.cities.find((candidate) => candidate.id === city.id),
    ).toMatchObject({ cityActionAvailable: false });
  });

  it("heals every form once from ordered overlapping Windmills without an output gate", () => {
    const base = initialV7(11_003);
    const actor = base.humanPlayerId;
    const player = required(
      base.players.find((candidate) => candidate.id === actor),
      "player missing",
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
      "city missing",
    );
    const template = required(
      base.units.find((unit) => unit.ownerId === actor),
      "unit missing",
    );
    const sources = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ] as const;
    const units: UnitStateV7[] = [
      unit(template, 101, "LAND", { x: 2, y: 1 }, 1),
      unit(template, 102, "NAVAL", { x: 1, y: 2 }, 7),
      unit(template, 103, "EMBARKED", { x: 3, y: 2 }, 9),
      unit(template, 104, "LAND", { x: 1, y: 1 }, 2),
    ];
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          sources.some((at) => same(at, tile.at))
            ? {
                ...tile,
                improvement: "WINDMILL" as const,
                territoryCityId: city.id,
              }
            : tile,
        ),
      },
      units,
    };
    const started = startTurnEconomyV7(state, player, false);
    expect(started.events.map((event) => event.kind)).toEqual([
      "TURN_STARTED",
      "WINDMILL_HEALING_RESOLVED",
      "WINDMILL_HEALING_RESOLVED",
      "INCOME_AWARDED",
    ]);
    const healing = started.events.filter(
      (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
    );
    expect(healing).toEqual([
      {
        kind: "WINDMILL_HEALING_RESOLVED",
        playerId: actor,
        cityId: city.id,
        at: sources[0],
        results: [
          { unitId: 101, amount: 6, hpAfter: 7 },
          { unitId: 102, amount: 3, hpAfter: 10 },
        ],
      },
      {
        kind: "WINDMILL_HEALING_RESOLVED",
        playerId: actor,
        cityId: city.id,
        at: sources[1],
        results: [{ unitId: 103, amount: 1, hpAfter: 10 }],
      },
    ]);
    expect(started.state.units.map(({ id, hp }) => [id, hp])).toEqual([
      [101, 7],
      [102, 10],
      [103, 10],
      [104, 2],
    ]);
    expect(
      started.state.units.find((candidate) => candidate.id === 101)?.activation,
    ).toEqual(template.activation);
    expect(healing.every((event) => parseEventV7(event).ok)).toBe(true);
  });

  it("heals on the real END_TURN path from a strict zero-output Windmill state", () => {
    const base = exploredAllV7(initialV7(11_011));
    const actor = base.humanPlayerId;
    const opponent = required(
      base.players.find((player) => player.id !== actor),
      "opponent missing",
    );
    const city = required(
      base.cities.find((candidate) => candidate.ownerId === actor),
      "city missing",
    );
    const target = required(
      base.units.find((unit) => unit.ownerId === actor),
      "target missing",
    );
    const candidates = base.board.tiles.filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        !base.units.some((unit) => same(unit.at, tile.at)),
    );
    const windmill = required(candidates[0], "Windmill tile missing");
    const targetTile = required(
      candidates.find(
        (tile) =>
          !same(tile.at, windmill.at) &&
          Math.max(
            Math.abs(tile.at.x - windmill.at.x),
            Math.abs(tile.at.y - windmill.at.y),
          ) === 1,
      ),
      "adjacent target tile missing",
    );
    const state = checkedV7({
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(opponent.id),
      nextEntityId: (base.nextEntityId + 1) as GameStateV7["nextEntityId"],
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, windmill.at)
            ? { ...tile, improvement: "WINDMILL" as const, resource: null }
            : tile,
        ),
      },
      populationContributions: [
        ...base.populationContributions,
        {
          id: base.nextEntityId,
          cityId: city.id,
          category: "LIVE",
          amount: 0,
          source: {
            kind: "IMPROVEMENT",
            improvement: "WINDMILL",
            at: windmill.at,
          },
        },
      ],
      units: base.units.map((unit) =>
        unit.id === target.id ? { ...unit, at: targetTile.at, hp: 2 } : unit,
      ),
    });
    const result = applyCommandV7(state, opponent.id, { kind: "END_TURN" });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "TURN_STARTED",
        "WINDMILL_HEALING_RESOLVED",
        "INCOME_AWARDED",
      ]),
    );
    expect(
      result.events.find((event) => event.kind === "WINDMILL_HEALING_RESOLVED"),
    ).toMatchObject({
      at: windmill.at,
      results: [{ unitId: target.id, amount: 6, hpAfter: 8 }],
    });
    expect(
      result.events.findIndex((event) => event.kind === "TURN_STARTED"),
    ).toBeLessThan(
      result.events.findIndex(
        (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
      ),
    );
    expect(
      result.events.findIndex(
        (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
      ),
    ).toBeLessThan(
      result.events.findIndex((event) => event.kind === "INCOME_AWARDED"),
    );
  });

  it("excludes enemy and formal-ally units from Windmill healing", () => {
    const base = initialV7(11_012, 2);
    const ais = base.players.filter((player) => player.controller === "AI");
    const owner = required(ais[0], "owner AI missing");
    const ally = required(ais[1], "ally AI missing");
    const ownerCity = required(
      base.cities.find((city) => city.ownerId === owner.id),
      "owner city missing",
    );
    const source = { x: 2, y: 2 };
    const template = required(base.units[0], "template missing");
    const state: GameStateV7 = {
      ...base,
      setup: { ...base.setup, aiMode: "COOPERATIVE" },
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, source)
            ? {
                ...tile,
                improvement: "WINDMILL" as const,
                territoryCityId: ownerCity.id,
              }
            : tile,
        ),
      },
      units: [
        {
          ...template,
          id: unitId(401),
          ownerId: owner.id,
          at: { x: 1, y: 2 },
          hp: 1,
        },
        {
          ...template,
          id: unitId(402),
          ownerId: ally.id,
          at: { x: 2, y: 1 },
          hp: 1,
        },
        {
          ...template,
          id: unitId(403),
          ownerId: base.humanPlayerId,
          at: { x: 3, y: 2 },
          hp: 1,
        },
        {
          ...template,
          id: unitId(404),
          ownerId: owner.id,
          at: { x: 2, y: 3 },
          hp: 10,
        },
      ],
    };
    const started = startTurnEconomyV7(state, owner, false);
    const event = required(
      started.events.find(
        (candidate) => candidate.kind === "WINDMILL_HEALING_RESOLVED",
      ),
      "healing event missing",
    );
    expect(event).toMatchObject({
      results: [{ unitId: 401, amount: 6, hpAfter: 7 }],
    });
    expect(started.state.units.map((unit) => [unit.id, unit.hp])).toEqual([
      [401, 7],
      [402, 1],
      [403, 1],
      [404, 10],
    ]);
  });

  it("projects Windmill healing only when source and recipient are visible", () => {
    const base = exploredAllV7(initialV7(11_004));
    const actor = base.humanPlayerId;
    const observer = required(
      base.players.find((player) => player.id !== actor),
      "observer missing",
    );
    const source = { x: 2, y: 2 };
    const visibleAt = { x: 2, y: 3 };
    const hiddenAt = { x: 3, y: 2 };
    const template = required(
      base.units.find((unit) => unit.ownerId === actor),
      "unit missing",
    );
    const units = [
      unit(template, 201, "LAND", visibleAt, 4),
      unit(template, 202, "LAND", hiddenAt, 4),
    ];
    const before: GameStateV7 = {
      ...base,
      players: base.players.map((player) =>
        player.id === observer.id
          ? { ...player, explored: [source, visibleAt] }
          : player,
      ),
      units,
    };
    const after: GameStateV7 = {
      ...before,
      units: units.map((candidate) => ({ ...candidate, hp: 10 })),
    };
    const event: Extract<DomainEventV7, { kind: "WINDMILL_HEALING_RESOLVED" }> =
      {
        kind: "WINDMILL_HEALING_RESOLVED",
        playerId: actor,
        cityId: required(
          base.cities.find((city) => city.ownerId === actor),
          "city missing",
        ).id,
        at: source,
        results: [
          { unitId: unitId(201), amount: 6, hpAfter: 10 },
          { unitId: unitId(202), amount: 6, hpAfter: 10 },
        ],
      };
    expect(projectEventsV7(before, after, actor, [event]).events).toEqual([
      event,
    ]);
    expect(projectEventsV7(before, after, observer.id, [event]).events).toEqual(
      [{ ...event, results: [event.results[0]] }],
    );
    const hiddenSource = {
      ...before,
      players: before.players.map((player) =>
        player.id === observer.id
          ? { ...player, explored: [visibleAt] }
          : player,
      ),
    };
    const hiddenAfter = {
      ...after,
      players: after.players.map((player) =>
        player.id === observer.id
          ? { ...player, explored: [visibleAt] }
          : player,
      ),
    };
    expect(
      projectEventsV7(hiddenSource, hiddenAfter, observer.id, [event]).events,
    ).toEqual([]);
  });

  it("adds reversible Roads population before Commerce and doubles Markets with Commerce", () => {
    const generated = exploredAllV7(initialV7(11_005));
    const actor = generated.humanPlayerId;
    const capital = required(
      generated.cities.find(
        (city) =>
          city.id ===
          generated.players.find((player) => player.id === actor)
            ?.originalCapitalCityId,
      ),
      "capital missing",
    );
    const candidates = generated.board.tiles
      .filter(
        (tile) =>
          tile.biome !== null &&
          tile.terrain === "GRASS" &&
          tile.site === null &&
          tile.improvement === null &&
          !generated.treasureChests.some((at) => same(at, tile.at)) &&
          !generated.units.some((unit) => same(unit.at, tile.at)) &&
          Math.max(
            Math.abs(tile.at.x - capital.at.x),
            Math.abs(tile.at.y - capital.at.y),
          ) >= 4,
      )
      .sort(
        (left, right) =>
          Math.max(
            Math.abs(right.at.x - capital.at.x),
            Math.abs(right.at.y - capital.at.y),
          ) -
          Math.max(
            Math.abs(left.at.x - capital.at.x),
            Math.abs(left.at.y - capital.at.y),
          ),
      );
    const otherAAt = required(candidates[0], "first road city tile missing").at;
    const otherBAt = required(
      candidates.find(
        (tile) =>
          Math.max(
            Math.abs(tile.at.x - otherAAt.x),
            Math.abs(tile.at.y - otherAAt.y),
          ) >= 4,
      ),
      "second road city tile missing",
    ).at;
    const otherA: GameStateV7["cities"][number] = {
      ...capital,
      id: generated.nextEntityId as GameStateV7["cities"][number]["id"],
      at: otherAAt,
      isCapital: false,
      cityActionAvailable: true,
    };
    const otherB: GameStateV7["cities"][number] = {
      ...capital,
      id: (generated.nextEntityId + 1) as GameStateV7["cities"][number]["id"],
      at: otherBAt,
      isCapital: false,
      cityActionAvailable: true,
    };
    const otherCities = [otherA, otherB] as const;
    const roadsTech = checkedV7({
      ...generated,
      players: generated.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              coins: 1_000,
              researchedTechs: ["GATHERING", "SCOUTING", "ROADS"] as const,
            }
          : player,
      ),
    });
    const citiesOnly = checkedV7({
      ...roadsTech,
      nextEntityId: (roadsTech.nextEntityId + 2) as GameStateV7["nextEntityId"],
      cities: [...roadsTech.cities, otherA, otherB],
      board: {
        ...roadsTech.board,
        tiles: roadsTech.board.tiles.map((tile) =>
          same(tile.at, otherA.at)
            ? {
                ...tile,
                territoryCityId: otherA.id,
                resource: null,
                site: "CITY" as const,
              }
            : same(tile.at, otherB.at)
              ? {
                  ...tile,
                  territoryCityId: otherB.id,
                  resource: null,
                  site: "CITY" as const,
                }
              : tile,
        ),
      },
    });
    const capitalPath = pathAvoidingSites(generated, otherA.at, capital.at);
    const componentRoute = [
      ...pathAvoidingSites(generated, otherA.at, otherB.at),
      ...capitalPath,
    ];
    const gap = required(capitalPath.at(-2), "capital route gap missing");
    const route = new Set(componentRoute.map(coordKey));
    const roadsOnlyInput: GameStateV7 = {
      ...citiesOnly,
      board: {
        ...citiesOnly.board,
        tiles: citiesOnly.board.tiles.map((tile) =>
          route.has(coordKey(tile.at)) &&
          !same(tile.at, gap) &&
          (same(tile.at, capital.at) ||
            Math.max(
              Math.abs(tile.at.x - capital.at.x),
              Math.abs(tile.at.y - capital.at.y),
            ) > 1)
            ? tile.site === null
              ? { ...tile, territoryCityId: null, road: true }
              : tile
            : same(tile.at, gap)
              ? {
                  ...tile,
                  territoryCityId: null,
                  road: false,
                  site: null,
                }
              : tile,
        ),
      },
    };
    expect(roadPopulationForCityV7(roadsOnlyInput, capital)).toBe(0);
    const roadsOnlyEconomy = recomputeLiveEconomyV7(
      roadsOnlyInput,
      roadsOnlyInput,
      roadsOnlyInput.populationContributions,
    );
    const roadsOnly = checkedV7({
      ...roadsOnlyInput,
      cities: roadsOnlyEconomy.cities,
      populationContributions: roadsOnlyEconomy.populationContributions,
    });
    expect(
      required(
        roadsOnly.players.find((player) => player.id === actor),
        "actor missing",
      ).researchedTechs,
    ).not.toContain("COMMERCE");
    expect(roadPopulationForCityV7(roadsOnly, capital)).toBe(0);

    const connectedResult = applyCommandV7(roadsOnly, actor, {
      kind: "BUILD_ROAD",
      at: gap,
    });
    expect(connectedResult.accepted).toBe(true);
    if (!connectedResult.accepted) return;
    expect(connectedResult.events[0]).toMatchObject({
      kind: "ROAD_BUILT",
      at: gap,
    });
    expect(roadPopulationForCityV7(connectedResult.state, capital)).toBe(2);
    expect(
      otherCities.map(
        (city) =>
          required(
            connectedResult.state.cities.find(
              (candidate) => candidate.id === city.id,
            ),
            "connected city missing",
          ).economicPopulation,
      ),
    ).toEqual([1, 1]);
    expect(
      connectedResult.events.filter(
        (event) => event.kind === "CITY_REWARD_QUEUED",
      ),
    ).toHaveLength(1);
    const rewarded = accept(connectedResult.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    const boardWithoutGap = {
      ...rewarded.board,
      tiles: rewarded.board.tiles.map((tile) =>
        same(tile.at, gap) ? { ...tile, road: false } : tile,
      ),
    };
    const disconnectedEconomy = recomputeLiveEconomyV7(
      rewarded,
      { board: boardWithoutGap, cities: rewarded.cities },
      rewarded.populationContributions,
    );
    const disconnected = checkedV7({
      ...rewarded,
      board: boardWithoutGap,
      cities: disconnectedEconomy.cities,
      populationContributions: disconnectedEconomy.populationContributions,
    });
    expect(roadPopulationForCityV7(disconnected, capital)).toBe(0);
    const reconnected = applyCommandV7(disconnected, actor, {
      kind: "BUILD_ROAD",
      at: gap,
    });
    expect(reconnected.accepted).toBe(true);
    if (!reconnected.accepted) return;
    expect(roadPopulationForCityV7(reconnected.state, capital)).toBe(2);
    expect(
      reconnected.events.some((event) => event.kind === "CITY_REWARD_QUEUED"),
    ).toBe(false);

    const marketFixture = coastalV7(11_006).state;
    const marketCity = required(
      marketFixture.cities.find((city) => city.ownerId === actor),
      "market city missing",
    );
    const marketAt = required(
      marketFixture.board.tiles.find(
        (tile) =>
          tile.territoryCityId === marketCity.id &&
          tile.site === null &&
          !marketFixture.units.some((unit) => same(unit.at, tile.at)),
      ),
      "market tile missing",
    ).at;
    const marketState = {
      ...marketFixture,
      players: marketFixture.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: [
                "GATHERING",
                "ADMINISTRATION",
                "ROADS",
                "COMMERCE",
              ] as const,
            }
          : player,
      ),
      board: {
        ...marketFixture.board,
        tiles: marketFixture.board.tiles.map((tile) =>
          same(tile.at, marketAt)
            ? { ...tile, improvement: "MARKET" as const, resource: null }
            : tile,
        ),
      },
    };
    expect(
      marketIncomeForCityV7(marketState, marketCity),
    ).toBeGreaterThanOrEqual(2);
    const withoutCommerce = {
      ...marketState,
      players: marketState.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: player.researchedTechs.filter(
                (tech) => tech !== "COMMERCE",
              ),
            }
          : player,
      ),
    };
    expect(marketIncomeForCityV7(marketState, marketCity)).toBe(
      marketIncomeForCityV7(withoutCommerce, marketCity) * 2,
    );
  });

  it("assigns Pillage only to Raiding for all seven normal land roles", () => {
    const base = exploredAllV7(allTechsV7(initialV7(11_007)));
    const actor = base.humanPlayerId;
    const enemyCity = required(
      base.cities.find((city) => city.ownerId !== actor),
      "enemy city missing",
    );
    const template = required(
      base.units.find((unit) => unit.ownerId === actor),
      "unit missing",
    );
    const roles: readonly UnitRoleIdV7[] = [
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
    ];
    const targets = base.board.tiles
      .filter((tile) => tile.territoryCityId === enemyCity.id)
      .slice(0, roles.length);
    expect(targets).toHaveLength(roles.length);
    const units = roles.map((role, index) => ({
      ...template,
      id: unitId(300 + index),
      role,
      at: required(targets[index], "target missing").at,
    }));
    const state: GameStateV7 = {
      ...base,
      units,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          targets.some((target) => same(target.at, tile.at))
            ? { ...tile, improvement: "MARKET" as const, resource: null }
            : tile,
        ),
      },
    };
    const offered = queryPlayerCommandsV7(viewForV7(state, actor));
    for (const candidate of units)
      expect(offered).toContainEqual({ kind: "PILLAGE", unitId: candidate.id });
    const explosivesOnly = {
      ...state,
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: TECHNOLOGY_IDS_V7.filter(
                (technology) =>
                  technology !== "RAIDING" && technology !== "CHIVALRY",
              ),
            }
          : player,
      ),
    };
    expect(
      queryPlayerCommandsV7(viewForV7(explosivesOnly, actor)).filter(
        (command) => command.kind === "PILLAGE",
      ),
    ).toEqual([]);
  });

  it("publishes the exact revision-11 identity", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r11");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r11.current");
  });
});

function unit(
  template: UnitStateV7,
  id: number,
  form: UnitStateV7["form"],
  at: UnitStateV7["at"],
  hp: number,
): UnitStateV7 {
  return { ...template, id: unitId(id), form, at, hp, maxHp: 10 };
}

function unitId(value: number): UnitStateV7["id"] {
  return value as UnitStateV7["id"];
}

function coordKey(at: { readonly x: number; readonly y: number }): string {
  return `${at.y},${at.x}`;
}

function pathAvoidingSites(
  state: GameStateV7,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): readonly { readonly x: number; readonly y: number }[] {
  const queue = [from];
  const prior = new Map<string, { readonly x: number; readonly y: number }>();
  const seen = new Set([coordKey(from)]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = required(queue[index], "road search item missing");
    if (same(current, to)) break;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const next = { x: current.x + dx, y: current.y + dy };
        const tile = state.board.tiles.find((candidate) =>
          same(candidate.at, next),
        );
        const nextKey = coordKey(next);
        if (
          tile === undefined ||
          tile.biome === null ||
          seen.has(nextKey) ||
          (tile.site !== null && !same(next, to) && !same(next, from))
        )
          continue;
        seen.add(nextKey);
        prior.set(nextKey, current);
        queue.push(next);
      }
  }
  if (!seen.has(coordKey(to))) throw new Error("road path missing");
  const reversed = [to];
  let current = to;
  while (!same(current, from)) {
    current = required(
      prior.get(coordKey(current)),
      "road predecessor missing",
    );
    reversed.push(current);
  }
  return reversed.reverse();
}

function accept(
  state: GameStateV7,
  actor: GameStateV7["humanPlayerId"],
  command: Parameters<typeof applyCommandV7>[2],
): GameStateV7 {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted) throw new Error(result.error.code);
  return result.state;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function same(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
