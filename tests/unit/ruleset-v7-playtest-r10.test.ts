import { describe, expect, it } from "vitest";
import { publicThreatenedTilesForPolicyV7 } from "../../src/ai/v7";
import { collectAcceptedTelemetryV7 } from "../../src/headless/v7";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  cityUnitCapacityV7,
  parseEventV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  reachablePlayerMovementPathsV7,
  unitId,
  validateMovementPathV7,
  validatePlayerMovementPathV7,
  viewForV7,
  type CoordV7,
  type CityId,
  type GameStateV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
} from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
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
};

describe("Ruleset 7 revision 10 playtest corrections", () => {
  it("uses the exact r10 identity while retaining numeric schema 7", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r10");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r10.current");
    expect(initialV7().schemaVersion).toBe(7);
  });

  it("moves two cells on disconnected diagonal Roads and bypasses a Forest stop", () => {
    const base = controlledMoverState(10_001);
    const actor = base.humanPlayerId;
    const mover = ownUnit(base);
    const [origin, forest, destination] = disconnectedRoadLine(base);
    const state = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) => ![origin, forest, destination].some((at) => same(at, chest)),
      ),
      units: base.units.map((unit) =>
        unit.id === mover.id
          ? { ...unit, at: origin, activation: READY }
          : unit,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          [origin, forest, destination].some((at) => same(at, tile.at))
            ? {
                ...tile,
                biome: "WOODLAND" as const,
                terrain: same(tile.at, forest)
                  ? ("FOREST" as const)
                  : ("GRASS" as const),
                resource: null,
                improvement: null,
                road: true,
                site: null,
                territoryCityId: null,
              }
            : tile,
        ),
      },
    });
    const path = [forest, destination];
    expect(validateMovementPathV7(state, ownUnit(state), path)).toMatchObject({
      legal: true,
      spentPoints2: 2,
      stopped: false,
    });
    const view = viewForV7(state, actor);
    const publicMover = required(
      view.units.find((unit) => unit.id === mover.id),
      "public mover missing",
    );
    expect(validatePlayerMovementPathV7(view, publicMover, path)).toMatchObject(
      { legal: true, spentPoints2: 2, stopped: false },
    );
    expect(
      reachablePlayerMovementPathsV7(view, publicMover).some((entry) =>
        same(entry.destination, destination),
      ),
    ).toBe(true);
    const moved = applyCommandV7(state, actor, {
      kind: "MOVE",
      unitId: mover.id,
      path,
    });
    if (!moved.accepted) throw new Error(moved.error.code);
    expect(moved.state.units.find((unit) => unit.id === mover.id)?.at).toEqual(
      destination,
    );
  });

  it("keeps Engineering and fog restrictions on Road movement", () => {
    const base = controlledMoverState(10_003);
    const mover = ownUnit(base);
    const [mountain, beyond] = canonicalNeighbors(base, mover.at).slice(0, 2);
    if (mountain === undefined || beyond === undefined)
      throw new Error("road cells missing");
    const withoutEngineering = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              researchedTechs: ["GATHERING", "SCOUTING", "ROADS"],
            }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          same(tile.at, mountain) || same(tile.at, beyond)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: same(tile.at, mountain)
                  ? ("MOUNTAIN" as const)
                  : ("GRASS" as const),
                resource: null,
                improvement: null,
                road: true,
                site: null,
              }
            : tile,
        ),
      },
    });
    expect(
      validateMovementPathV7(withoutEngineering, ownUnit(withoutEngineering), [
        mountain,
      ]),
    ).toMatchObject({ legal: false, reason: "ENGINEERING_REQUIRED" });
    const fogged = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter((at) => !same(at, mountain)),
            }
          : player,
      ),
    });
    const fogView = viewForV7(fogged, fogged.humanPlayerId);
    const fogMover = required(
      fogView.units.find((unit) => unit.id === mover.id),
      "fog mover missing",
    );
    expect(
      validatePlayerMovementPathV7(fogView, fogMover, [mountain, beyond]),
    ).toMatchObject({ legal: false, reason: "UNEXPLORED_INTERMEDIATE" });
  });

  it("keeps occupancy and ZOC restrictions on Road movement", () => {
    const base = controlledMoverState(10_004);
    const mover = ownUnit(base);
    const enemy = required(
      base.units.find((unit) => unit.ownerId !== base.humanPlayerId),
      "enemy missing",
    );
    const [origin, intermediate, destination] = disconnectedRoadLine(base);
    const roadState = checkedV7({
      ...base,
      treasureChests: base.treasureChests.filter(
        (chest) =>
          ![origin, intermediate, destination].some((at) => same(at, chest)),
      ),
      units: base.units.map((unit) =>
        unit.id === mover.id
          ? { ...unit, at: origin, activation: READY }
          : unit,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          [origin, intermediate, destination].some((at) => same(at, tile.at))
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: true,
                site: null,
                territoryCityId: null,
              }
            : tile,
        ),
      },
    });
    const blocker = {
      ...mover,
      id: unitId(roadState.nextEntityId),
      homeCityId: null,
      at: intermediate,
    };
    const occupied = checkedV7({
      ...roadState,
      nextEntityId: roadState.nextEntityId + 1,
      units: [...roadState.units, blocker].sort((a, b) => a.id - b.id),
    });
    expect(
      validateMovementPathV7(occupied, ownUnit(occupied), [
        intermediate,
        destination,
      ]),
    ).toMatchObject({ legal: false, reason: "OCCUPIED" });

    const flank = required(
      canonicalNeighbors(roadState, intermediate).find(
        (at) =>
          !same(at, origin) &&
          !same(at, intermediate) &&
          !same(at, destination) &&
          !roadState.units.some((unit) => same(unit.at, at)),
      ),
      "ZOC flank missing",
    );
    const zoc = checkedV7({
      ...roadState,
      units: roadState.units.map((unit) =>
        unit.id === enemy.id ? { ...unit, at: flank } : unit,
      ),
    });
    expect(
      validateMovementPathV7(zoc, ownUnit(zoc), [intermediate, destination]),
    ).toMatchObject({ legal: false, reason: "ZOC_STOPS_MOVE" });
  });

  it("keeps enemy threat Roads owner-aware when viewer technology differs", () => {
    const base = controlledMoverState(10_005);
    const actor = base.humanPlayerId;
    const enemy = required(
      base.units.find((unit) => unit.ownerId !== actor),
      "enemy missing",
    );
    const at = { x: 5, y: 5 };
    const road = [at, { x: 6, y: 5 }, { x: 7, y: 5 }];
    const enemyCity = required(
      base.cities.find((city) => city.ownerId === enemy.ownerId),
      "enemy city missing",
    );
    const state = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === enemy.id
          ? { ...unit, role: "RAIDER" as const, at, activation: READY }
          : unit,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          road.some((cell) => same(cell, tile.at))
            ? {
                ...tile,
                biome: "WOODLAND" as const,
                terrain: same(tile.at, road[1] as CoordV7)
                  ? ("FOREST" as const)
                  : ("GRASS" as const),
                resource: null,
                improvement: null,
                road: true,
                site: null,
                territoryCityId: enemyCity.id,
              }
            : distance(tile.at, at) <= 3 && tile.site === null
              ? {
                  ...tile,
                  biome: "WOODLAND" as const,
                  terrain: "FOREST" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                }
              : tile,
        ),
      },
    });
    const withoutViewerRoads = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === actor
          ? {
              ...player,
              researchedTechs: ["GATHERING"],
            }
          : player,
      ),
    });
    const threats = (candidate: GameStateV7) => {
      const view = viewForV7(candidate, actor);
      const publicEnemy = required(
        view.units.find((unit) => unit.id === enemy.id),
        "public enemy missing",
      );
      return publicThreatenedTilesForPolicyV7(view, publicEnemy);
    };
    expect(threats(withoutViewerRoads)).toEqual(threats(state));
    const viewerCity = required(
      state.cities.find((city) => city.ownerId === actor),
      "viewer city missing",
    );
    const viewerOwnedRoads = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          road.some((cell) => same(cell, tile.at))
            ? { ...tile, territoryCityId: viewerCity.id }
            : tile,
        ),
      },
    });
    expect(threats(viewerOwnedRoads)).not.toContainEqual({ x: 8, y: 5 });
    expect(threats(state)).toContainEqual({ x: 8, y: 5 });
  });

  it("trains at the occupied center and pushes the prior unit in y/x order without resetting it", () => {
    const fixture = occupiedTrainingState(10_007);
    const [mountain, expected] = canonicalNeighbors(
      fixture.state,
      fixture.cityAt,
    ).slice(0, 2);
    if (mountain === undefined || expected === undefined)
      throw new Error("spawn neighbors missing");
    const state = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.actor
          ? {
              ...player,
              researchedTechs: ["GATHERING"],
              explored: [fixture.cityAt],
            }
          : player,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          same(tile.at, mountain)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: "MOUNTAIN" as const,
                resource: null,
              }
            : tile,
        ),
      },
    });
    const command = {
      kind: "TRAIN" as const,
      cityId: fixture.cityId,
      role: "FIGHTER" as const,
    };
    expect(
      queryPlayerCommandsV7(viewForV7(state, fixture.actor)),
    ).toContainEqual(command);
    const result = applyCommandV7(state, fixture.actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    const displaced = required(
      result.state.units.find((unit) => unit.id === fixture.occupantId),
      "displaced unit missing",
    );
    expect(displaced.at).toEqual(expected);
    expect(displaced.homeCityId).toBe(fixture.otherCityId);
    expect(displaced.activation).toEqual(fixture.activation);
    expect(displaced.captureEligible).toBe(false);
    expect(
      result.state.units.find(
        (unit) =>
          unit.id !== fixture.occupantId && same(unit.at, fixture.cityAt),
      ),
    ).toMatchObject({ role: "FIGHTER", activation: { handled: true } });
    const displacement = required(
      result.events.find((event) => event.kind === "UNIT_SPAWN_DISPLACED"),
      "displacement event missing",
    );
    expect(displacement).toMatchObject({
      displacedUnitId: fixture.occupantId,
      from: fixture.cityAt,
      to: expected,
    });
    expect(parseEventV7(displacement)).toMatchObject({ ok: true });
    expect(result.events.some((event) => event.kind === "UNIT_DIED")).toBe(
      false,
    );
    expect(result.events.some((event) => event.kind === "TILES_REVEALED")).toBe(
      true,
    );
    expect(
      projectEventsV7(state, result.state, fixture.actor, result.events).events,
    ).toContainEqual(displacement);
    const observer = required(
      state.players.find(
        (player) =>
          player.id !== fixture.actor && player.status !== "ELIMINATED",
      ),
      "observer missing",
    );
    expect(
      viewForV7(state, observer.id).units.some(
        (unit) => unit.id === fixture.occupantId,
      ),
    ).toBe(false);
    const observerEvents = projectEventsV7(
      state,
      result.state,
      observer.id,
      result.events,
    ).events;
    expect(
      observerEvents.some((event) => event.kind === "UNIT_SPAWN_DISPLACED"),
    ).toBe(false);
    expect(JSON.stringify(observerEvents)).not.toContain(
      String(fixture.occupantId),
    );
  });

  it("uses a Mountain push destination with Engineering and reveals its sight bonus", () => {
    const fixture = occupiedTrainingState(10_009);
    const destination = required(
      canonicalNeighbors(fixture.state, fixture.cityAt)[0],
      "spawn neighbor missing",
    );
    const state = checkedV7({
      ...fixture.state,
      players: fixture.state.players.map((player) =>
        player.id === fixture.actor
          ? { ...player, explored: [fixture.cityAt] }
          : player,
      ),
      board: {
        ...fixture.state.board,
        tiles: fixture.state.board.tiles.map((tile) =>
          same(tile.at, destination)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: "MOUNTAIN" as const,
                resource: null,
              }
            : tile,
        ),
      },
    });
    const result = applyCommandV7(state, fixture.actor, {
      kind: "TRAIN",
      cityId: fixture.cityId,
      role: "FIGHTER",
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.state.units.find((unit) => unit.id === fixture.occupantId)?.at,
    ).toEqual(destination);
    const player = required(
      result.state.players.find((candidate) => candidate.id === fixture.actor),
      "actor missing",
    );
    const displacedOnlySight = required(
      result.state.board.tiles
        .map((tile) => tile.at)
        .find(
          (at) =>
            distance(at, destination) === 2 && distance(at, fixture.cityAt) > 1,
        ),
      "displaced-only sight tile missing",
    );
    expect(
      state.players.find((candidate) => candidate.id === fixture.actor)
        ?.explored,
    ).not.toContainEqual(displacedOnlySight);
    expect(player.explored).toContainEqual(displacedOnlySight);
  });

  it("removes the center occupant without death or refund when every adjacent cell is blocked", () => {
    const fixture = occupiedTrainingState(10_011);
    let nextId = fixture.state.nextEntityId;
    const blockers = canonicalNeighbors(fixture.state, fixture.cityAt).map(
      (at) => ({
        ...required(
          fixture.state.units.find((unit) => unit.id === fixture.occupantId),
          "occupant missing",
        ),
        id: unitId(nextId++),
        homeCityId: null,
        at,
        activation: READY,
      }),
    );
    const state = checkedV7({
      ...fixture.state,
      nextEntityId: nextId,
      units: [...fixture.state.units, ...blockers].sort((a, b) => a.id - b.id),
    });
    const beforeCoins = required(
      state.players.find((player) => player.id === fixture.actor),
      "actor missing",
    ).coins;
    const result = applyCommandV7(state, fixture.actor, {
      kind: "TRAIN",
      cityId: fixture.cityId,
      role: "FIGHTER",
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(
      result.state.units.some((unit) => unit.id === fixture.occupantId),
    ).toBe(false);
    expect(result.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_SPAWN_DISPLACED", to: null }),
    );
    expect(result.events.some((event) => event.kind === "UNIT_DIED")).toBe(
      false,
    );
    expect(
      required(
        result.state.players.find((player) => player.id === fixture.actor),
        "actor missing",
      ).coins,
    ).toBeLessThan(beforeCoins);
    const metrics = collectAcceptedTelemetryV7(
      state,
      [],
      [
        {
          before: state,
          after: result.state,
          actorId: fixture.actor,
          command: {
            kind: "TRAIN",
            cityId: fixture.cityId,
            role: "FIGHTER",
          },
          events: result.events,
        },
      ],
    );
    expect(metrics.roles.losses.FIGHTER).toBe(1);
    expect(metrics.roles.kills.FIGHTER).toBe(0);
  });

  it("rolls back allocation and command-index overflow before displacement", () => {
    const fixture = occupiedTrainingState(10_013);
    for (const state of [
      checkedV7({ ...fixture.state, nextEntityId: Number.MAX_SAFE_INTEGER }),
      checkedV7({ ...fixture.state, commandIndex: Number.MAX_SAFE_INTEGER }),
    ]) {
      const result = applyCommandV7(state, fixture.actor, {
        kind: "TRAIN",
        cityId: fixture.cityId,
        role: "FIGHTER",
      });
      expect(result).toMatchObject({
        accepted: false,
        error: { code: "INTEGER_OVERFLOW" },
        events: [],
      });
      expect(result.state).toBe(state);
      expect(
        result.state.units.find((unit) => unit.id === fixture.occupantId)?.at,
      ).toEqual(fixture.cityAt);
    }
  });

  it("keeps besieged, capacity, and cost precedence for occupied-center training", () => {
    const fixture = occupiedTrainingState(10_014);
    const command = {
      kind: "TRAIN" as const,
      cityId: fixture.cityId,
      role: "FIGHTER" as const,
    };
    const enemy = required(
      fixture.state.units.find((unit) => unit.ownerId !== fixture.actor),
      "enemy missing",
    );
    const besieged = checkedV7({
      ...fixture.state,
      units: fixture.state.units
        .filter((unit) => unit.id !== fixture.occupantId)
        .map((unit) =>
          unit.id === enemy.id ? { ...unit, at: fixture.cityAt } : unit,
        ),
    });
    expect(applyCommandV7(besieged, fixture.actor, command)).toMatchObject({
      accepted: false,
      error: { code: "CITY_BESIEGED" },
    });

    const city = required(
      fixture.state.cities.find((candidate) => candidate.id === fixture.cityId),
      "city missing",
    );
    const capacity = cityUnitCapacityV7(fixture.state, city);
    let nextId = fixture.state.nextEntityId;
    const template = required(
      fixture.state.units.find((unit) => unit.id === fixture.occupantId),
      "occupant missing",
    );
    const assigned = canonicalNeighbors(fixture.state, fixture.cityAt)
      .slice(0, capacity - 1)
      .map((at) => ({
        ...template,
        id: unitId(nextId++),
        homeCityId: fixture.cityId,
        at,
      }));
    const atCapacity = checkedV7({
      ...fixture.state,
      nextEntityId: nextId,
      players: fixture.state.players.map((player) =>
        player.id === fixture.actor ? { ...player, coins: 0 } : player,
      ),
      units: [
        ...fixture.state.units.map((unit) =>
          unit.id === fixture.occupantId
            ? { ...unit, homeCityId: fixture.cityId }
            : unit,
        ),
        ...assigned,
      ].sort((left, right) => left.id - right.id),
    });
    expect(applyCommandV7(atCapacity, fixture.actor, command)).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });

    const withoutCoins = checkedV7({
      ...fixture.state,
      commandIndex: Number.MAX_SAFE_INTEGER,
      players: fixture.state.players.map((player) =>
        player.id === fixture.actor ? { ...player, coins: 0 } : player,
      ),
    });
    expect(applyCommandV7(withoutCoins, fixture.actor, command)).toMatchObject({
      accepted: false,
      error: { code: "INSUFFICIENT_COINS" },
    });
  });

  it.each(["FIGHTER", "GUARD"] as const)(
    "requires an unmoved full-turn %s to Fortify",
    (role) => {
      const base = controlledMoverState(10_015);
      const unit = ownUnit(base);
      const state = checkedV7({
        ...base,
        units: base.units.map((candidate) =>
          candidate.id === unit.id
            ? {
                ...candidate,
                role,
                hp: role === "GUARD" ? 15 : 10,
                maxHp: role === "GUARD" ? 15 : 10,
                activation: {
                  ...READY,
                  moved: true,
                  movedPathLength: 1,
                  handled: true,
                },
              }
            : candidate,
        ),
      });
      const command = {
        kind: "BUILD_FIELD_DEFENSE" as const,
        unitId: unit.id,
      };
      expect(
        queryPlayerCommandsV7(viewForV7(state, state.humanPlayerId)),
      ).not.toContainEqual(command);
      const result = applyCommandV7(state, state.humanPlayerId, command);
      expect(result).toMatchObject({
        accepted: false,
        error: { code: "UNIT_ALREADY_ACTED" },
        events: [],
      });
      expect(result.state).toBe(state);
    },
  );

  it("consumes the full turn when an unmoved Fighter Fortifies", () => {
    const state = controlledMoverState(10_017);
    const unit = ownUnit(state);
    const fortified = applyCommandV7(state, state.humanPlayerId, {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: unit.id,
    });
    if (!fortified.accepted) throw new Error(fortified.error.code);
    const commands = queryPlayerCommandsV7(
      viewForV7(fortified.state, state.humanPlayerId),
    );
    expect(
      commands.some(
        (command) =>
          "unitId" in command &&
          command.unitId === unit.id &&
          (command.kind === "MOVE" || command.kind === "ATTACK"),
      ),
    ).toBe(false);
    const destination = required(
      canonicalNeighbors(fortified.state, unit.at)[0],
      "move destination missing",
    );
    expect(
      applyCommandV7(fortified.state, state.humanPlayerId, {
        kind: "MOVE",
        unitId: unit.id,
        path: [destination],
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
      events: [],
    });
  });
});

function controlledMoverState(seed: number): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(seed)));
  const actor = base.humanPlayerId;
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === actor),
    "city missing",
  );
  const mover = ownUnit(base);
  const at = city.at;
  return checkedV7({
    ...base,
    treasureChests: base.treasureChests.filter(
      (chest) =>
        Math.max(Math.abs(chest.x - at.x), Math.abs(chest.y - at.y)) > 3,
    ),
    units: base.units.map((unit) =>
      unit.id === mover.id ? { ...unit, at, activation: READY } : unit,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        Math.max(Math.abs(tile.at.x - at.x), Math.abs(tile.at.y - at.y)) <= 3
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

function occupiedTrainingState(seed: number): {
  readonly state: GameStateV7;
  readonly actor: PlayerId;
  readonly cityId: CityId;
  readonly cityAt: CoordV7;
  readonly otherCityId: CityId;
  readonly occupantId: UnitStateV7["id"];
  readonly activation: UnitStateV7["activation"];
} {
  const base = exploredAllV7(allTechsV7(initialV7(seed, 2)));
  const actor = base.humanPlayerId;
  const city = required(
    base.cities.find((candidate) => candidate.ownerId === actor),
    "city missing",
  );
  const donorPlayer = required(
    base.players.find((candidate) => candidate.id !== actor),
    "donor missing",
  );
  const otherCity = required(
    base.cities.find((candidate) => candidate.ownerId === donorPlayer.id),
    "other city missing",
  );
  const occupant = ownUnit(base);
  const activation = {
    ...READY,
    moved: true,
    movedPathLength: 2,
    handled: true,
  };
  const neighborKeys = new Set(canonicalNeighbors(base, city.at).map(key));
  return {
    actor,
    cityId: city.id,
    cityAt: city.at,
    otherCityId: otherCity.id,
    occupantId: occupant.id,
    activation,
    state: checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === donorPlayer.id
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
      cities: base.cities.map((candidate) =>
        candidate.id === otherCity.id
          ? { ...candidate, ownerId: actor }
          : candidate,
      ),
      treasureChests: base.treasureChests.filter(
        (chest) => !neighborKeys.has(key(chest)),
      ),
      units: base.units
        .filter((unit) => unit.ownerId !== donorPlayer.id)
        .map((unit) =>
          unit.id === occupant.id
            ? {
                ...unit,
                homeCityId: otherCity.id,
                at: city.at,
                captureEligible: true,
                activation,
              }
            : unit,
        ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          neighborKeys.has(key(tile.at))
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                fieldDefense: false,
              }
            : tile,
        ),
      },
    }),
  };
}

function canonicalNeighbors(state: GameStateV7, center: CoordV7): CoordV7[] {
  return state.board.tiles
    .map((tile) => tile.at)
    .filter(
      (at) =>
        !same(at, center) &&
        Math.max(Math.abs(at.x - center.x), Math.abs(at.y - center.y)) === 1,
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function disconnectedRoadLine(
  state: GameStateV7,
): readonly [CoordV7, CoordV7, CoordV7] {
  const directions = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
  ] as const;
  const occupied = new Set(state.units.map((unit) => key(unit.at)));
  const actorCities = state.cities.filter(
    (city) => city.ownerId === state.humanPlayerId,
  );
  for (const tile of state.board.tiles)
    for (const direction of directions) {
      const line = [0, 1, 2].map((step) => ({
        x: tile.at.x + direction.x * step,
        y: tile.at.y + direction.y * step,
      })) as [CoordV7, CoordV7, CoordV7];
      if (
        line.every((at) => {
          const candidate = state.board.tiles.find((item) => same(item.at, at));
          return (
            candidate !== undefined &&
            candidate.site === null &&
            !occupied.has(key(at)) &&
            actorCities.every((city) => distance(at, city.at) > 1)
          );
        })
      )
        return line;
    }
  throw new Error("disconnected Road line missing");
}

function ownUnit(state: GameStateV7): UnitStateV7 {
  return required(
    state.units.find((unit) => unit.ownerId === state.humanPlayerId),
    "own unit missing",
  );
}

function key(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function distance(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
