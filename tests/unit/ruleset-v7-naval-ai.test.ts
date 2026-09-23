import { describe, expect, it } from "vitest";
import {
  findCoastOscillationV7,
  parseNavalPlayableMatrixSelectionV7,
} from "../../scripts/ruleset-v7-naval-playable-contract";
import {
  NormalPolicyWorkV7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  isPublicFuturePortSurfaceForPolicyV7,
  projectPublicUnitForPolicyV7,
  publicProjectedDamageForPolicyV7,
  publicThreatenedTilesForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  canonicalJson,
  applyCommandV7,
  playerId,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type PlayerViewV7,
  type GameStateV7,
  type PlayerId,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { exploredAllV7, initialV7, setupV7 } from "../fixtures/v7-builders";
import {
  disconnectedLandGlimpseNavalScenarioV7,
  isolatedNavalScenarioV7,
} from "../fixtures/v7-naval-ai-scenarios";
import { battleshipBombardmentV7 } from "../fixtures/v7-naval-builders";

describe("Ruleset 7 deterministic public naval Normal policy", () => {
  it("counts landing-command reveal as progress but detects a true coast cycle", () => {
    const passengerId = unitId(39);
    const landing = {
      command: {
        kind: "DISEMBARK",
        unitId: passengerId,
        at: { x: 0, y: 6 },
      },
      events: [{ kind: "UNIT_DISEMBARKED" }, { kind: "TILES_REVEALED" }],
    } as const;
    const inland = {
      command: {
        kind: "MOVE",
        unitId: passengerId,
        path: [{ x: 0, y: 5 }],
      },
      events: [{ kind: "UNIT_MOVED" }],
    } as const;
    const reembark = {
      command: {
        kind: "MOVE",
        unitId: passengerId,
        path: [{ x: 2, y: 3 }],
      },
      events: [{ kind: "UNIT_MOVED" }, { kind: "UNIT_EMBARKED" }],
    } as const;
    expect(findCoastOscillationV7([landing, inland, reembark])).toBeNull();
    expect(
      findCoastOscillationV7([
        { ...landing, events: [{ kind: "UNIT_DISEMBARKED" }] },
        inland,
        reembark,
      ]),
    ).toEqual({ unitId: 39, landingAt: "0,6" });
  });

  it("parses bounded partial naval matrix selection without claiming a full run", () => {
    expect(parseNavalPlayableMatrixSelectionV7([])).toEqual({
      skipMatrix: false,
      matrixStart: 0,
      partialMatrix: false,
    });
    expect(
      parseNavalPlayableMatrixSelectionV7([
        "--output=/tmp/evidence",
        "--matrix-start=37",
      ]),
    ).toEqual({ skipMatrix: false, matrixStart: 37, partialMatrix: true });
    expect(parseNavalPlayableMatrixSelectionV7(["--skip-matrix"])).toEqual({
      skipMatrix: true,
      matrixStart: 0,
      partialMatrix: false,
    });
    expect(() =>
      parseNavalPlayableMatrixSelectionV7([
        "--skip-matrix",
        "--matrix-start=37",
      ]),
    ).toThrow(/incompatible/);
    for (const value of ["", "-1", "40", "1.5", "9007199254740992"])
      expect(() =>
        parseNavalPlayableMatrixSelectionV7([`--matrix-start=${value}`]),
      ).toThrow(/safe integer from 0 to 39/);
  });

  it("researches Shorecraft, reserves one exact Port, and embarks through that Port", () => {
    const researchView = navalPolicyView([]);
    expect(chooseNormalCommandV7(researchView).command).toEqual({
      kind: "RESEARCH",
      tech: "SHORECRAFT",
    });

    const portView = navalPolicyView(["SHORECRAFT"]);
    const portCommands = queryPlayerCommandsV7(portView).filter(
      (command) => command.kind === "BUILD_PORT",
    );
    expect(portCommands).toContainEqual({
      kind: "BUILD_PORT",
      at: { x: 2, y: 1 },
    });
    expect(chooseNormalCommandV7(portView).command).toEqual({
      kind: "BUILD_PORT",
      at: { x: 2, y: 1 },
    });

    const embarkView = navalPolicyView(["SHORECRAFT"], true);
    const own = embarkView.units.find(
      (unit) => unit.ownerId === embarkView.viewer.id,
    );
    if (own === undefined) throw new Error("owned capture unit missing");
    expect(chooseNormalCommandV7(embarkView).command).toEqual({
      kind: "MOVE",
      unitId: own.id,
      path: [{ x: 2, y: 1 }],
    });
  });

  it("lands beside an occupied coastal objective on the nearest legal tile", () => {
    const { view, transportId } = occupiedCoastalObjectiveView();
    const disembarks = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "DISEMBARK",
    );
    expect(disembarks).not.toContainEqual({
      kind: "DISEMBARK",
      unitId: transportId,
      at: { x: 7, y: 4 },
    });
    expect(disembarks).toContainEqual({
      kind: "DISEMBARK",
      unitId: transportId,
      at: { x: 7, y: 5 },
    });

    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.filter(
        (candidate) => candidate.command.kind === "DISEMBARK",
      ),
    ).toMatchObject([
      {
        command: {
          kind: "DISEMBARK",
          unitId: transportId,
          at: { x: 7, y: 5 },
        },
        score: { priority: 1335 },
      },
    ]);
    expect(decision.command).toEqual({
      kind: "DISEMBARK",
      unitId: transportId,
      at: { x: 7, y: 5 },
    });
  });

  it("keeps a targetless transport aboard beside its owned-city frontier", () => {
    const view = targetlessOwnedCoastView();
    const transport = view.units.find(
      (unit) => unit.ownerId === view.viewer.id && unit.form === "EMBARKED",
    );
    if (transport === undefined) throw new Error("transport missing");
    const offeredLanding = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "DISEMBARK" && command.unitId === transport.id,
    );
    expect(offeredLanding).toBeDefined();
    if (offeredLanding === undefined) throw new Error("landing missing");
    expect(scoreCommandV7(view, offeredLanding).priority).toBe(1335);

    const decision = chooseNormalCommandV7(view);
    expect(
      decision.candidates.some(
        (candidate) =>
          candidate.command.kind === "DISEMBARK" &&
          candidate.command.unitId === transport.id,
      ),
    ).toBe(false);
  });

  it("plans before Shorecraft through Fish and Pearl Port surfaces", () => {
    const fixture = isolatedNavalScenarioV7(
      "PANGEA",
      9401,
      false,
      "SEA_SHORTCUT",
    );
    const source = viewForV7(fixture.state, fixture.subjectId);
    const ownedCities = new Set(
      source.cities
        .filter((city) => city.ownerId === source.viewer.id)
        .map((city) => city.id),
    );
    const coastKeys = new Set(
      source.board.tiles.flatMap((tile) =>
        tile.explored &&
        tile.terrain === "SHALLOW_WATER" &&
        tile.territoryCityId !== null &&
        ownedCities.has(tile.territoryCityId) &&
        source.board.tiles.some(
          (near) =>
            near.explored &&
            near.biome !== null &&
            near.territoryCityId === tile.territoryCityId &&
            Math.max(
              Math.abs(near.at.x - tile.at.x),
              Math.abs(near.at.y - tile.at.y),
            ) === 1,
        )
          ? [`${tile.at.x},${tile.at.y}`]
          : [],
      ),
    );
    expect(coastKeys.size).toBeGreaterThan(0);
    const resourceCoast: PlayerViewV7 = {
      ...source,
      board: {
        ...source.board,
        tiles: source.board.tiles.map((tile, index) =>
          tile.explored && coastKeys.has(`${tile.at.x},${tile.at.y}`)
            ? { ...tile, resource: index % 2 === 0 ? "FISH" : "PEARLS" }
            : tile,
        ),
      },
    };
    expect(
      [...coastKeys].every((key) => {
        const [x, y] = key.split(",").map(Number);
        if (x === undefined || y === undefined) return false;
        return isPublicFuturePortSurfaceForPolicyV7(resourceCoast, { x, y });
      }),
    ).toBe(true);
    expect(chooseNormalCommandV7(resourceCoast).command).toEqual({
      kind: "RESEARCH",
      tech: "SHORECRAFT",
    });
  });

  it("never treats an owned deep offshore cell as a future Port start", () => {
    const fixture = isolatedNavalScenarioV7(
      "PANGEA",
      9401,
      false,
      "SEA_SHORTCUT",
    );
    const source = viewForV7(fixture.state, fixture.subjectId);
    const city = source.cities.find(
      (item) => item.ownerId === source.viewer.id,
    );
    if (city === undefined) throw new Error("owned city missing");
    const offshore = source.board.tiles.find(
      (tile) =>
        tile.explored &&
        tile.biome === null &&
        Math.abs(tile.at.x - city.at.x) >= 3,
    );
    if (offshore?.explored !== true) throw new Error("offshore water missing");
    const noPortCoast: PlayerViewV7 = {
      ...source,
      board: {
        ...source.board,
        tiles: source.board.tiles.map((tile) => {
          if (!tile.explored) return tile;
          if (tile.at.x === offshore.at.x && tile.at.y === offshore.at.y)
            return {
              ...tile,
              terrain: "DEEP_WATER",
              territoryCityId: city.id,
              territoryOwnerId: source.viewer.id,
              resource: null,
              improvement: null,
            };
          if (
            tile.terrain === "SHALLOW_WATER" &&
            tile.territoryCityId !== null &&
            source.cities.some(
              (candidate) =>
                candidate.id === tile.territoryCityId &&
                candidate.ownerId === source.viewer.id,
            )
          )
            return {
              ...tile,
              territoryCityId: null,
              territoryOwnerId: null,
            };
          return tile;
        }),
      },
    };
    expect(isPublicFuturePortSurfaceForPolicyV7(noPortCoast, offshore.at)).toBe(
      false,
    );
    expect(
      noPortCoast.board.tiles.some(
        (tile) =>
          tile.explored &&
          isPublicFuturePortSurfaceForPolicyV7(noPortCoast, tile.at),
      ),
    ).toBe(false);
  });

  it("prepares naval analysis through bounded work slices with exact sync parity", () => {
    const view = navalPolicyView([]);
    const sync = chooseNormalCommandV7(structuredClone(view));
    let clock = 0;
    const work = new NormalPolicyWorkV7(
      structuredClone(view),
      () => (clock += 9),
    );
    let slices = 0;
    let result = work.runSlice(8);
    while (result === null && slices < 10_000) {
      slices += 1;
      result = work.runSlice(8);
    }
    expect(slices).toBeGreaterThan(view.board.tiles.length);
    expect(result).not.toBeNull();
    expect(canonicalJson(result)).toBe(canonicalJson(sync));
    expect(result?.prngDraws).toBe(0);
  });

  it("crosses toward frontier beside a disconnected public land glimpse", () => {
    const fixture = disconnectedLandGlimpseNavalScenarioV7();
    let state = fixture.state;
    let commandsThisTurn = 0;
    let port = false;
    let departure = false;
    let frontierProgress = false;
    let capture = false;
    expect(
      chooseNormalCommandV7(viewForV7(state, fixture.subjectId)).command,
    ).toMatchObject({ kind: "RESEARCH", tech: "SHORECRAFT" });
    for (let step = 0; step < 400 && state.outcome === null; step += 1) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("active actor missing");
      const view = viewForV7(state, actor);
      const command =
        actor === fixture.subjectId
          ? chooseNormalTurnCommandV7(
              view,
              commandsThisTurn,
              128,
              chooseNormalCommandV7(view),
            )
          : queryPlayerCommandsV7(view).find(
              (candidate) => candidate.kind === "END_TURN",
            );
      if (command === null || command === undefined)
        throw new Error("fixture policy returned no command");
      const passenger =
        "unitId" in command
          ? state.units.find((unit) => unit.id === command.unitId)
          : undefined;
      const applied = applyCommandV7(state, actor, command);
      if (!applied.accepted)
        throw new Error(`${command.kind}:${applied.error.code}`);
      if (actor === fixture.subjectId) {
        if (command.kind === "BUILD_PORT") port = true;
        if (applied.events.some((event) => event.kind === "UNIT_EMBARKED"))
          departure = true;
        if (
          command.kind === "MOVE" &&
          passenger?.form === "EMBARKED" &&
          applied.events.some((event) => event.kind === "TILES_REVEALED")
        )
          frontierProgress = true;
        if (
          command.kind === "CAPTURE" &&
          applied.events.some((event) => event.kind === "CITY_CAPTURED")
        )
          capture = true;
      }
      state = applied.state;
      commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
    }
    expect({ port, departure, frontierProgress, capture }).toEqual({
      port: true,
      departure: true,
      frontierProgress: true,
      capture: true,
    });
    expect(state.commandIndex).toBeLessThanOrEqual(400);
  });

  it("chooses the canonical reachable Port around an allied water barrier", () => {
    const view = alternatePortBarrierView();
    expect(
      view.board.tiles.filter(
        (tile) =>
          tile.explored &&
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== view.viewer.id &&
          tile.territoryOwnerId !== view.humanPlayerId,
      ),
    ).toHaveLength(3);
    expect(
      queryPlayerCommandsV7(view).flatMap((command) =>
        command.kind === "BUILD_PORT" ? [command.at] : [],
      ),
    ).toEqual(
      expect.arrayContaining([
        { x: 3, y: 0 },
        { x: 3, y: 3 },
      ]),
    );
    expect(chooseNormalCommandV7(view).command).toEqual({
      kind: "BUILD_PORT",
      at: { x: 3, y: 0 },
    });
  });

  it("moves an embarked unit through its own multi-cell water corridor", () => {
    const view = ownedWaterCorridorView();
    const transport = view.units.find(
      (unit) => unit.ownerId === view.viewer.id && unit.form === "EMBARKED",
    );
    if (transport === undefined) throw new Error("transport missing");
    expect(
      view.board.tiles
        .filter(
          (tile) =>
            tile.explored &&
            tile.biome === null &&
            tile.territoryOwnerId === view.viewer.id,
        )
        .map((tile) => tile.at),
    ).toEqual(
      expect.arrayContaining([
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ]),
    );
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toMatchObject({
      kind: "MOVE",
      unitId: transport.id,
    });
    if (decision.command?.kind !== "MOVE")
      throw new Error("transport move missing");
    expect(decision.command.path.at(-1)?.x).toBeGreaterThan(transport.at.x);
    expect(decision.candidates[0]?.score.priority).toBe(1230);
    expect(decision.candidates[0]?.score.objectiveValue).toBeGreaterThan(0);
  });

  it("reserves a Patrol Boat for visible danger before another transport departs", () => {
    const source = navalPolicyView(["SHORECRAFT"], true);
    const hostile = source.units.find(
      (unit) => unit.ownerId !== source.viewer.id,
    );
    if (hostile === undefined) throw new Error("hostile unit missing");
    const endangered = projectPublicUnitForPolicyV7(source, hostile.id, {
      role: "PATROL_BOAT",
      form: "NAVAL",
      at: { x: 3, y: 1 },
    });
    expect(chooseNormalCommandV7(endangered).command).toEqual(
      expect.objectContaining({
        kind: "TRAIN_NAVAL",
        role: "PATROL_BOAT",
        at: { x: 2, y: 1 },
      }),
    );
  });

  it("does not embark from an owned Port without a naval objective", () => {
    const source = navalPolicyView(["SHORECRAFT"], true);
    const noObjective: PlayerViewV7 = {
      ...source,
      cities: source.cities.filter((city) => city.ownerId === source.viewer.id),
      units: source.units.filter((unit) => unit.ownerId === source.viewer.id),
      board: {
        ...source.board,
        tiles: source.board.tiles.map((tile) =>
          tile.explored && tile.at.x === 2 && tile.at.y === 1
            ? tile
            : tile.explored
              ? {
                  ...tile,
                  biome: "PLAINS",
                  terrain: "GRASS",
                  resource: null,
                  improvement: null,
                }
              : tile,
        ),
      },
    };
    expect(
      queryPlayerCommandsV7(noObjective).some(
        (command) =>
          command.kind === "MOVE" &&
          noObjective.board.tiles.some(
            (tile) =>
              tile.explored &&
              tile.improvement === "PORT" &&
              command.path.at(-1)?.x === tile.at.x &&
              command.path.at(-1)?.y === tile.at.y,
          ),
      ),
    ).toBe(true);
    expect(
      chooseNormalCommandV7(noObjective).candidates.some(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          noObjective.board.tiles.some(
            (tile) =>
              tile.explored &&
              tile.improvement === "PORT" &&
              candidate.command.kind === "MOVE" &&
              candidate.command.path.at(-1)?.x === tile.at.x &&
              candidate.command.path.at(-1)?.y === tile.at.y,
          ),
      ),
    ).toBe(false);
  });

  it("keeps spare land capacity from spending reserved Shorecraft Coins", () => {
    const source = navalPolicyView([]);
    const own = source.units.find((unit) => unit.ownerId === source.viewer.id);
    if (own === undefined) throw new Error("owned unit missing");
    const moved = projectPublicUnitForPolicyV7(source, own.id, {
      form: "LAND",
      at: { x: 1, y: 0 },
    });
    const reserved: PlayerViewV7 = {
      ...moved,
      viewer: { ...moved.viewer, coins: 4 },
      cities: moved.cities.map((city) =>
        city.ownerId === source.viewer.id ? { ...city, level: 4 } : city,
      ),
    };
    expect(
      queryPlayerCommandsV7(reserved).some(
        (command) => command.kind === "TRAIN",
      ),
    ).toBe(true);
    expect(
      chooseNormalCommandV7(reserved).candidates.some(
        (candidate) => candidate.command.kind === "TRAIN",
      ),
    ).toBe(false);
  });

  it("does not spend reserved Navigation Coins on unrelated research", () => {
    const source = navalPolicyView(["SHORECRAFT"]);
    const reserved: PlayerViewV7 = {
      ...source,
      viewer: { ...source.viewer, coins: 6 },
    };
    expect(
      queryPlayerCommandsV7(reserved).some(
        (command) =>
          command.kind === "RESEARCH" && command.tech !== "NAVIGATION",
      ),
    ).toBe(true);
    expect(
      chooseNormalCommandV7(reserved).candidates.some(
        (candidate) =>
          candidate.command.kind === "RESEARCH" &&
          candidate.command.tech !== "NAVIGATION",
      ),
    ).toBe(false);
  });

  it("scores an embarked Horse Archer with transport movement facts", () => {
    const source = navalPolicyView(["SHORECRAFT"], true);
    const own = source.units.find((unit) => unit.ownerId === source.viewer.id);
    if (own === undefined) throw new Error("owned unit missing");
    const horse = projectPublicUnitForPolicyV7(source, own.id, {
      role: "HORSE_ARCHER",
      form: "EMBARKED",
      at: { x: 2, y: 1 },
    });
    const fighter = projectPublicUnitForPolicyV7(source, own.id, {
      role: "FIGHTER",
      form: "EMBARKED",
      at: { x: 2, y: 1 },
    });
    const move = queryPlayerCommandsV7(horse).find(
      (command) => command.kind === "MOVE" && command.unitId === own.id,
    );
    if (move?.kind !== "MOVE") throw new Error("transport move missing");
    expect(scoreCommandV7(horse, move)).toEqual(scoreCommandV7(fighter, move));
    expect(scoreCommandV7(horse, move).priority).not.toBe(905);
  });

  it("moves onto a useful visible hostile Port when no defense is needed", () => {
    const view = fleetPolicyView({
      ownAt: { x: 3, y: 1 },
      hostileAt: { x: 9, y: 9 },
      hostileForm: "LAND",
    });
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toMatchObject({ kind: "MOVE" });
    if (decision.command?.kind !== "MOVE")
      throw new Error("fleet move missing");
    expect(decision.command.path.at(-1)).toEqual({ x: 6, y: 1 });
    expect(decision.candidates[0]?.score.strategicValue).toBeGreaterThanOrEqual(
      18,
    );
  });

  it("clears a visible hostile vessel from an owned Port", () => {
    const view = fleetPolicyView({
      ownAt: { x: 3, y: 1 },
      hostileAt: { x: 2, y: 1 },
      hostileForm: "NAVAL",
    });
    const own = view.units.find((unit) => unit.ownerId === view.viewer.id);
    const hostile = view.units.find((unit) => unit.ownerId !== view.viewer.id);
    if (own === undefined || hostile === undefined)
      throw new Error("defense units missing");
    expect(chooseNormalCommandV7(view).command).toEqual({
      kind: "ATTACK",
      unitId: own.id,
      targetUnitId: hostile.id,
    });
  });

  it("leaves a hostile Port blockade to defend an owned Port", () => {
    const view = fleetPolicyView({
      ownAt: { x: 6, y: 1 },
      hostileAt: { x: 2, y: 1 },
      hostileForm: "NAVAL",
    });
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toMatchObject({ kind: "MOVE" });
    if (decision.command?.kind !== "MOVE")
      throw new Error("defense move missing");
    const destination = decision.command.path.at(-1);
    if (destination === undefined)
      throw new Error("defense destination missing");
    expect(
      Math.max(Math.abs(destination.x - 2), Math.abs(destination.y - 1)),
    ).toBeLessThan(4);
  });

  it("uses public form rules for transport damage and known land-water barriers", () => {
    const source = navalPolicyView(["SHORECRAFT"], true);
    const own = source.units.find((unit) => unit.ownerId === source.viewer.id);
    const hostile = source.units.find(
      (unit) => unit.ownerId !== source.viewer.id,
    );
    if (own === undefined || hostile === undefined)
      throw new Error("units missing");
    let land = projectPublicUnitForPolicyV7(source, hostile.id, {
      role: "RAIDER",
      form: "LAND",
      at: { x: 1, y: 0 },
    });
    land = projectPublicUnitForPolicyV7(land, own.id, {
      role: "GUARD",
      form: "LAND",
      at: { x: 2, y: 0 },
    });
    const landRaider = land.units.find((unit) => unit.id === hostile.id);
    const landGuard = land.units.find((unit) => unit.id === own.id);
    if (landRaider === undefined || landGuard === undefined)
      throw new Error("land pair missing");
    expect(publicThreatenedTilesForPolicyV7(land, landRaider)).toContainEqual(
      landGuard.at,
    );
    const landDamage = publicProjectedDamageForPolicyV7(
      land,
      landRaider,
      landGuard,
      landGuard.at,
    );

    let transport = projectPublicUnitForPolicyV7(land, hostile.id, {
      form: "EMBARKED",
      at: { x: 2, y: 1 },
    });
    const transportedRaider = transport.units.find(
      (unit) => unit.id === hostile.id,
    );
    if (transportedRaider === undefined) throw new Error("transport missing");
    expect(
      publicThreatenedTilesForPolicyV7(transport, transportedRaider),
    ).toEqual([]);
    expect(
      publicProjectedDamageForPolicyV7(
        transport,
        transportedRaider,
        landGuard,
        landGuard.at,
      ),
    ).toBe(0);

    transport = projectPublicUnitForPolicyV7(land, own.id, {
      form: "EMBARKED",
      at: { x: 2, y: 1 },
    });
    const transportedGuard = transport.units.find((unit) => unit.id === own.id);
    if (transportedGuard === undefined)
      throw new Error("guard transport missing");
    expect(
      publicProjectedDamageForPolicyV7(
        transport,
        landRaider,
        transportedGuard,
        transportedGuard.at,
      ),
    ).toBeGreaterThan(landDamage);

    let patrol = projectPublicUnitForPolicyV7(source, hostile.id, {
      role: "PATROL_BOAT",
      form: "NAVAL",
      at: { x: 2, y: 1 },
    });
    patrol = {
      ...patrol,
      board: {
        ...patrol.board,
        tiles: patrol.board.tiles.map((tile) =>
          tile.at.x === 3 && tile.at.y === 1
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
              }
            : tile,
        ),
      },
    };
    const patrolBoat = patrol.units.find((unit) => unit.id === hostile.id);
    if (patrolBoat === undefined) throw new Error("patrol missing");
    expect(
      publicThreatenedTilesForPolicyV7(patrol, patrolBoat),
    ).not.toContainEqual({ x: 4, y: 1 });
  });

  it("chooses and resolves a real Battleship coastal bombardment", () => {
    const fixture = battleshipBombardmentV7();
    const state = fixture.state;
    const view = viewForV7(state, state.humanPlayerId);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toEqual({
      kind: "ATTACK",
      unitId: fixture.attackerId,
      targetUnitId: fixture.defenderId,
    });
    if (decision.command === null) throw new Error("bombardment missing");
    const applied = applyCommandV7(
      state,
      state.humanPlayerId,
      decision.command,
    );
    if (!applied.accepted) throw new Error(JSON.stringify(applied));
    expect(applied).toMatchObject({
      accepted: true,
      events: expect.arrayContaining([
        expect.objectContaining({ kind: "COMBAT_RESOLVED" }),
      ]),
    });
  });

  it("keeps Dry Land free of water commands through a bounded clean observation", () => {
    const result = runAiMatchV7(setupV7(0), {
      maxRounds: 5,
      maxCommands: 100,
    });
    expect(result.errors).toEqual([]);
    expect(result.stalls).toEqual([]);
    for (const kind of [
      "HARVEST_FISH",
      "GATHER_PEARLS",
      "BUILD_PORT",
      "TRAIN_NAVAL",
      "DISEMBARK",
    ])
      expect(result.metrics.commandsByKind[kind]).toBe(0);
  });

  it.each([
    ["PANGEA", 9400, false, "ISOLATED"],
    ["PANGEA", 9401, false, "SEA_SHORTCUT"],
    ["CONTINENTS", 9402, true, "ISOLATED"],
    ["CONTINENTS", 9403, false, "SEA_SHORTCUT"],
    ["ARCHIPELAGO", 9404, false, "ISOLATED"],
    ["ARCHIPELAGO", 9405, true, "SEA_SHORTCUT"],
    ["LAKES", 9406, false, "ISOLATED"],
    ["LAKES", 9407, false, "SEA_SHORTCUT"],
  ] as const)(
    "completes the fixed partial-exploration %s naval sequence at seed %i",
    (mapType, seed, deepLane, geometry) => {
      const fixture = isolatedNavalScenarioV7(
        mapType,
        seed,
        deepLane,
        geometry,
      );
      let state = fixture.state;
      let commandsThisTurn = 0;
      let passengerId: number | null = null;
      let landingRound: number | null = null;
      let shorecraft = false;
      let navigation = false;
      let port = false;
      let departure = false;
      let landing = false;
      let frontierExploration = false;
      let captureWait = false;
      let patrolEscort = false;
      expect(
        state.players.find((player) => player.id === fixture.subjectId)
          ?.explored.length,
      ).toBeLessThan(state.board.tiles.length);
      if (geometry === "SEA_SHORTCUT") {
        const distances = initialPublicRouteDistances(state, fixture.subjectId);
        expect(distances.land).not.toBeNull();
        expect(distances.sea).not.toBeNull();
        expect((distances.sea ?? Infinity) + 3).toBeLessThan(
          distances.land ?? -Infinity,
        );
      }
      for (let step = 0; step < 400 && state.outcome === null; step += 1) {
        const actor = state.turnOrder[state.activeSeatIndex];
        if (actor === undefined) throw new Error("active actor missing");
        const view = viewForV7(state, actor);
        const command =
          actor === fixture.subjectId
            ? chooseNormalTurnCommandV7(
                view,
                commandsThisTurn,
                128,
                chooseNormalCommandV7(view),
              )
            : queryPlayerCommandsV7(view).find(
                (candidate) => candidate.kind === "END_TURN",
              );
        if (command === null || command === undefined)
          throw new Error("fixture policy returned no command");
        const priorUnit =
          "unitId" in command
            ? state.units.find((unit) => unit.id === command.unitId)
            : undefined;
        const beforeRound = state.round;
        const applied = applyCommandV7(state, actor, command);
        if (!applied.accepted)
          throw new Error(`${command.kind}:${applied.error.code}`);
        if (actor === fixture.subjectId) {
          if (command.kind === "RESEARCH" && command.tech === "SHORECRAFT")
            shorecraft = true;
          if (command.kind === "RESEARCH" && command.tech === "NAVIGATION")
            navigation = true;
          if (command.kind === "BUILD_PORT") port = true;
          const embarked = applied.events.find(
            (event) => event.kind === "UNIT_EMBARKED",
          );
          if (embarked?.kind === "UNIT_EMBARKED") {
            passengerId ??= embarked.unitId;
            if (embarked.unitId === passengerId) departure = true;
          }
          if (
            command.kind === "MOVE" &&
            priorUnit?.form === "EMBARKED" &&
            applied.events.some((event) => event.kind === "TILES_REVEALED")
          )
            frontierExploration = true;
          if (command.kind === "MOVE" && priorUnit?.role === "PATROL_BOAT") {
            const destination = command.path.at(-1);
            if (
              destination !== undefined &&
              applied.state.units.some(
                (unit) =>
                  unit.ownerId === fixture.subjectId &&
                  unit.form === "EMBARKED" &&
                  Math.max(
                    Math.abs(unit.at.x - destination.x),
                    Math.abs(unit.at.y - destination.y),
                  ) <= 1,
              )
            )
              patrolEscort = true;
          }
          if (command.kind === "DISEMBARK" && command.unitId === passengerId) {
            landing = true;
            landingRound = beforeRound;
          }
          if (
            command.kind === "CAPTURE" &&
            command.unitId === passengerId &&
            applied.events.some((event) => event.kind === "CITY_CAPTURED")
          )
            captureWait = landingRound !== null && beforeRound > landingRound;
        }
        state = applied.state;
        commandsThisTurn =
          command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
      }
      expect({
        shorecraft,
        navigation: deepLane ? navigation : true,
        port,
        departure,
        frontierExploration,
        landing,
        captureWait,
      }).toEqual({
        shorecraft: true,
        navigation: true,
        port: true,
        departure: true,
        frontierExploration: true,
        landing: true,
        captureWait: true,
      });
      expect(state.commandIndex).toBeLessThanOrEqual(400);
      if (mapType === "CONTINENTS" && geometry === "ISOLATED")
        expect(patrolEscort).toBe(true);
    },
    30_000,
  );
});

function navalPolicyView(
  researchedTechs: readonly TechnologyIdV7[],
  withPort = false,
): PlayerViewV7 {
  const state = exploredAllV7(initialV7(0));
  const source = viewForV7(state, state.humanPlayerId);
  const ownCity = source.cities.find(
    (city) => city.ownerId === source.viewer.id,
  );
  const hostileCity = source.cities.find(
    (city) => city.ownerId !== source.viewer.id,
  );
  const ownUnit = source.units.find(
    (unit) => unit.ownerId === source.viewer.id,
  );
  const hostileUnit = source.units.find(
    (unit) => unit.ownerId !== source.viewer.id,
  );
  if (
    ownCity === undefined ||
    hostileCity === undefined ||
    ownUnit === undefined ||
    hostileUnit === undefined
  )
    throw new Error("public fixture pieces missing");
  const ownAt = { x: 1, y: 1 } as const;
  const hostileAt = { x: 9, y: 9 } as const;
  const portAt = { x: 2, y: 1 } as const;
  const ownTerritory = (x: number, y: number) => x <= 2 && y <= 2;
  const hostileTerritory = (x: number, y: number) => x >= 8 && y >= 8;
  return {
    ...source,
    setup: { ...source.setup, mapType: "CONTINENTS" },
    viewer: {
      ...source.viewer,
      coins: 100,
      researchedTechs,
    },
    cities: source.cities.map((city) =>
      city.id === ownCity.id
        ? { ...city, at: ownAt }
        : city.id === hostileCity.id
          ? { ...city, at: hostileAt }
          : city,
    ),
    units: source.units.map((unit) =>
      unit.id === ownUnit.id
        ? { ...unit, at: ownAt, form: "LAND" as const }
        : unit.id === hostileUnit.id
          ? { ...unit, at: hostileAt, form: "LAND" as const }
          : unit,
    ),
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) => {
        const water =
          tile.at.x === 5 ||
          tile.at.x === 6 ||
          (tile.at.y === 1 && tile.at.x >= 2 && tile.at.x <= 6);
        const owned = ownTerritory(tile.at.x, tile.at.y);
        const hostile = hostileTerritory(tile.at.x, tile.at.y);
        return {
          at: tile.at,
          explored: true as const,
          biome: water ? null : ("PLAINS" as const),
          terrain: water
            ? tile.at.x === 6
              ? ("DEEP_WATER" as const)
              : ("SHALLOW_WATER" as const)
            : ("GRASS" as const),
          resource: null,
          improvement:
            withPort && tile.at.x === portAt.x && tile.at.y === portAt.y
              ? ("PORT" as const)
              : null,
          road: false,
          fieldDefense: false,
          fortificationLevel: 0,
          site:
            tile.at.x === ownAt.x && tile.at.y === ownAt.y
              ? ("CAPITAL" as const)
              : tile.at.x === hostileAt.x && tile.at.y === hostileAt.y
                ? ("CAPITAL" as const)
                : null,
          territoryCityId: owned ? ownCity.id : hostile ? hostileCity.id : null,
          territoryOwnerId: owned
            ? source.viewer.id
            : hostile
              ? hostileCity.ownerId
              : null,
        };
      }),
    },
    naval: {
      ownedPorts: withPort
        ? [{ at: portAt, cityId: ownCity.id, status: "ACTIVE" as const }]
        : [],
      tradeCityIds: [],
      networkCityIds: [ownCity.id],
      networkRoads: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
    treasureChests: [],
  };
}

function occupiedCoastalObjectiveView(): {
  readonly view: PlayerViewV7;
  readonly transportId: number;
} {
  const source = navalPolicyView(["SHORECRAFT", "NAVIGATION"], true);
  const transport = source.units.find(
    (unit) => unit.ownerId === source.viewer.id,
  );
  const hostile = source.units.find(
    (unit) => unit.ownerId !== source.viewer.id,
  );
  const hostileCity = source.cities.find(
    (city) => city.ownerId !== source.viewer.id,
  );
  if (
    transport === undefined ||
    hostile === undefined ||
    hostileCity === undefined
  )
    throw new Error("occupied coastal objective pieces missing");
  let view = projectPublicUnitForPolicyV7(source, transport.id, {
    form: "EMBARKED",
    at: { x: 6, y: 5 },
  });
  view = projectPublicUnitForPolicyV7(view, hostile.id, {
    form: "LAND",
    at: { x: 7, y: 4 },
  });
  return {
    transportId: transport.id,
    view: {
      ...view,
      viewer: { ...view.viewer, coins: 0 },
      cities: view.cities.map((city) =>
        city.id === hostileCity.id ? { ...city, at: { x: 7, y: 4 } } : city,
      ),
      board: {
        ...view.board,
        tiles: view.board.tiles.map((tile) => {
          if (!tile.explored || tile.at.x < 7) return tile;
          return {
            ...tile,
            biome: "PLAINS" as const,
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: false,
            fortificationLevel: 0,
            site:
              tile.at.x === 7 && tile.at.y === 4 ? ("CAPITAL" as const) : null,
            territoryCityId: hostileCity.id,
            territoryOwnerId: hostileCity.ownerId,
          };
        }),
      },
    },
  };
}

function targetlessOwnedCoastView(): PlayerViewV7 {
  const source = ownedWaterCorridorView();
  return {
    ...source,
    cities: source.cities.filter((city) => city.ownerId === source.viewer.id),
    units: source.units.filter((unit) => unit.ownerId === source.viewer.id),
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) =>
        tile.at.x === 2 && tile.at.y === 2
          ? { at: tile.at, explored: false as const }
          : tile,
      ),
    },
  };
}

function fleetPolicyView(options: {
  readonly ownAt: { readonly x: number; readonly y: number };
  readonly hostileAt: { readonly x: number; readonly y: number };
  readonly hostileForm: "LAND" | "NAVAL";
}): PlayerViewV7 {
  const source = navalPolicyView(["SHORECRAFT", "NAVIGATION"], true);
  const own = source.units.find((unit) => unit.ownerId === source.viewer.id);
  const hostile = source.units.find(
    (unit) => unit.ownerId !== source.viewer.id,
  );
  const hostileCity = source.cities.find(
    (city) => city.ownerId !== source.viewer.id,
  );
  if (own === undefined || hostile === undefined || hostileCity === undefined)
    throw new Error("fleet fixture pieces missing");
  let view = projectPublicUnitForPolicyV7(source, own.id, {
    role: "PATROL_BOAT",
    form: "NAVAL",
    at: options.ownAt,
  });
  view = projectPublicUnitForPolicyV7(view, hostile.id, {
    role: options.hostileForm === "NAVAL" ? "PATROL_BOAT" : "FIGHTER",
    form: options.hostileForm,
    at: options.hostileAt,
  });
  return {
    ...view,
    viewer: { ...view.viewer, coins: 0 },
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) => {
        if (!tile.explored) return tile;
        if (tile.at.x === 6 && tile.at.y === 1)
          return {
            ...tile,
            biome: null,
            terrain: "SHALLOW_WATER",
            improvement: "PORT",
            resource: null,
            territoryCityId: hostileCity.id,
            territoryOwnerId: hostileCity.ownerId,
          };
        return tile;
      }),
    },
    naval: {
      ...view.naval,
      ownedPorts: view.naval.ownedPorts.map((port) => ({
        ...port,
        status:
          options.hostileForm === "NAVAL" &&
          options.hostileAt.x === port.at.x &&
          options.hostileAt.y === port.at.y
            ? ("BLOCKADED" as const)
            : ("ACTIVE" as const),
      })),
    },
  };
}

function ownedWaterCorridorView(): PlayerViewV7 {
  const source = navalPolicyView(
    ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
    true,
  );
  const own = source.units.find((unit) => unit.ownerId === source.viewer.id);
  const city = source.cities.find((item) => item.ownerId === source.viewer.id);
  if (own === undefined || city === undefined)
    throw new Error("corridor pieces missing");
  const transport = projectPublicUnitForPolicyV7(source, own.id, {
    form: "EMBARKED",
    at: { x: 2, y: 1 },
  });
  return {
    ...transport,
    viewer: { ...transport.viewer, coins: 0 },
    board: {
      ...transport.board,
      tiles: transport.board.tiles.map((tile) =>
        tile.explored && tile.at.y === 1 && tile.at.x >= 2 && tile.at.x <= 5
          ? {
              ...tile,
              biome: null,
              terrain: "SHALLOW_WATER" as const,
              resource: null,
              improvement: tile.at.x === 2 ? ("PORT" as const) : null,
              site: null,
              road: false,
              territoryCityId: tile.at.x <= 4 ? city.id : null,
              territoryOwnerId: tile.at.x <= 4 ? transport.viewer.id : null,
            }
          : tile,
      ),
    },
    naval: {
      ...transport.naval,
      ownedPorts: [{ at: { x: 2, y: 1 }, cityId: city.id, status: "ACTIVE" }],
    },
  };
}

function alternatePortBarrierView(): PlayerViewV7 {
  const source = navalPolicyView(["SHORECRAFT"]);
  const originalOwnCity = source.cities.find(
    (city) => city.ownerId === source.viewer.id,
  );
  const originalHostileCity = source.cities.find(
    (city) => city.ownerId !== source.viewer.id,
  );
  if (originalOwnCity === undefined || originalHostileCity === undefined)
    throw new Error("cities missing");
  const humanId = originalOwnCity.ownerId;
  const viewerId = originalHostileCity.ownerId;
  const alliedId = playerId(3);
  return {
    ...source,
    setup: { ...source.setup, aiMode: "COOPERATIVE" },
    humanPlayerId: humanId,
    activeSeatIndex: 0,
    turnOrder: [viewerId, humanId],
    viewer: { ...source.viewer, id: viewerId },
    cities: source.cities.map((city) =>
      city.id === originalOwnCity.id
        ? { ...city, ownerId: viewerId, at: { x: 1, y: 1 }, expanded: true }
        : city.id === originalHostileCity.id
          ? { ...city, ownerId: humanId, at: { x: 9, y: 9 } }
          : city,
    ),
    units: source.units.map((unit) =>
      unit.ownerId === source.viewer.id
        ? { ...unit, ownerId: viewerId, at: { x: 1, y: 1 } }
        : { ...unit, ownerId: humanId, at: { x: 9, y: 9 } },
    ),
    board: {
      ...source.board,
      tiles: source.board.tiles.map((tile) => {
        const ownLand = tile.at.x <= 3;
        const hostileLand = tile.at.x >= 9;
        const candidate =
          (tile.at.x === 3 && tile.at.y === 0) ||
          (tile.at.x === 3 && tile.at.y === 3);
        const alliedBarrier =
          tile.at.x === 4 && tile.at.y >= 2 && tile.at.y <= 4;
        const water = !ownLand && !hostileLand ? true : candidate;
        return {
          at: tile.at,
          explored: true as const,
          biome: water ? null : ("PLAINS" as const),
          terrain: water ? ("SHALLOW_WATER" as const) : ("GRASS" as const),
          resource: null,
          improvement: null,
          road: false,
          fieldDefense: false,
          fortificationLevel: 0,
          site:
            tile.at.x === 1 && tile.at.y === 1
              ? ("CAPITAL" as const)
              : tile.at.x === 9 && tile.at.y === 9
                ? ("CAPITAL" as const)
                : null,
          territoryCityId: candidate
            ? originalOwnCity.id
            : ownLand
              ? originalOwnCity.id
              : hostileLand
                ? originalHostileCity.id
                : null,
          territoryOwnerId: alliedBarrier
            ? alliedId
            : candidate || ownLand
              ? viewerId
              : hostileLand
                ? humanId
                : null,
        };
      }),
    },
    naval: {
      ownedPorts: [],
      tradeCityIds: [],
      networkCityIds: [originalOwnCity.id],
      networkRoads: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
  };
}

function initialPublicRouteDistances(
  state: GameStateV7,
  subjectId: PlayerId,
): { readonly land: number | null; readonly sea: number | null } {
  const view = viewForV7(state, subjectId);
  const unit = view.units.find(
    (candidate) => candidate.ownerId === subjectId && candidate.form === "LAND",
  );
  const target = view.cities.find((city) => city.ownerId !== subjectId);
  if (unit === undefined || target === undefined)
    throw new Error("shortcut endpoints missing");
  const key = (at: { readonly x: number; readonly y: number }) =>
    `${at.x},${at.y}`;
  const neighbors = (at: { readonly x: number; readonly y: number }) =>
    view.board.tiles
      .filter(
        (tile) =>
          Math.max(Math.abs(tile.at.x - at.x), Math.abs(tile.at.y - at.y)) ===
          1,
      )
      .map((tile) => tile.at);
  const distance = (
    starts: readonly { readonly x: number; readonly y: number }[],
    targets: ReadonlySet<string>,
    passable: ReadonlySet<string>,
  ): number | null => {
    const queue = starts.map((at) => ({ at, steps: 0 }));
    const seen = new Set(queue.map((item) => key(item.at)));
    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      if (item === undefined) break;
      if (targets.has(key(item.at))) return item.steps;
      for (const at of neighbors(item.at)) {
        const atKey = key(at);
        if (!passable.has(atKey) || seen.has(atKey)) continue;
        seen.add(atKey);
        queue.push({ at, steps: item.steps + 1 });
      }
    }
    return null;
  };
  const land = new Set(
    view.board.tiles.flatMap((tile) =>
      tile.explored && tile.biome !== null ? [key(tile.at)] : [],
    ),
  );
  const targetComponent = new Set<string>();
  const componentQueue = [target.at];
  for (let index = 0; index < componentQueue.length; index += 1) {
    const at = componentQueue[index];
    if (at === undefined || targetComponent.has(key(at))) continue;
    targetComponent.add(key(at));
    for (const next of neighbors(at))
      if (land.has(key(next)) && !targetComponent.has(key(next)))
        componentQueue.push(next);
  }
  const water = new Set(
    view.board.tiles.flatMap((tile) =>
      tile.explored && tile.biome === null ? [key(tile.at)] : [],
    ),
  );
  const coastalTargetLand = view.board.tiles.filter(
    (tile) =>
      targetComponent.has(key(tile.at)) &&
      neighbors(tile.at).some((at) => water.has(key(at))),
  );
  const coastalDistances = coastalTargetLand.map((tile) => ({
    at: tile.at,
    distance: distance([tile.at], new Set([key(target.at)]), land),
  }));
  const closestCoast = Math.min(
    ...coastalDistances.flatMap((entry) =>
      entry.distance === null ? [] : [entry.distance],
    ),
  );
  const closestTargetCoast = new Set(
    coastalDistances.flatMap((entry) =>
      entry.distance === closestCoast ? [key(entry.at)] : [],
    ),
  );
  const seaGoals = new Set(
    view.board.tiles.flatMap((tile) =>
      water.has(key(tile.at)) &&
      neighbors(tile.at).some((at) => closestTargetCoast.has(key(at)))
        ? [key(tile.at)]
        : [],
    ),
  );
  const portStarts = view.board.tiles.flatMap((tile) =>
    tile.explored &&
    tile.biome === null &&
    tile.territoryCityId !== null &&
    view.cities.some(
      (city) => city.id === tile.territoryCityId && city.ownerId === subjectId,
    )
      ? [tile.at]
      : [],
  );
  return {
    land: distance([unit.at], new Set([key(target.at)]), land),
    sea: distance(portStarts, seaGoals, water),
  };
}
