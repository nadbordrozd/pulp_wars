import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  canonicalJson,
  COMMAND_KIND_ORDER_V7,
  createInitialMapStateV7,
  createPlayableGameV7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  effectiveRoleRuleV7,
  IMPROVEMENT_IDS_V7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  V7_MATCH_MAX_COMMANDS_DEFAULT,
  V7_MATCH_MAX_ROUNDS_DEFAULT,
  V7_PUBLIC_EQUALITY_COMMAND_LIMIT,
  collectAcceptedTelemetryV7,
  runAiMatchV7,
  type AcceptedTelemetryTransitionV7,
} from "../../src/headless/v7";
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  initialV7,
  richV7,
  setupV7,
} from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 revision-3 AI headless runner", () => {
  it("retains the v7 safety caps and imports no presentation layer", () => {
    expect(V7_MATCH_MAX_COMMANDS_DEFAULT).toBe(30_000);
    expect(V7_MATCH_MAX_ROUNDS_DEFAULT).toBe(750);
    expect(V7_PUBLIC_EQUALITY_COMMAND_LIMIT).toBe(32);
    const source = readFileSync("src/headless/v7.ts", "utf8");
    expect(source).not.toMatch(
      /from ["'].*(?:presentation|browser|canvas|dom)/i,
    );
  });

  it("publishes complete zero-filled command, event, tech, role, and improvement inventories", () => {
    const metrics = collectAcceptedTelemetryV7(initialV7(0), [], []);
    expect(TECHNOLOGY_IDS_V7).toHaveLength(21);
    expect(UNIT_ROLE_IDS_V7).toHaveLength(12);
    expect(IMPROVEMENT_IDS_V7).toHaveLength(10);
    expect(Object.keys(metrics.commandsByKind)).toEqual(COMMAND_KIND_ORDER_V7);
    expect(Object.keys(metrics.eventsByKind)).toEqual(
      DOMAIN_EVENT_KIND_ORDER_V7,
    );
    expect(Object.keys(metrics.research.adoption)).toEqual(TECHNOLOGY_IDS_V7);
    expect(Object.keys(metrics.research.firstRound)).toEqual(TECHNOLOGY_IDS_V7);
    for (const inventory of [
      metrics.roles.trained,
      metrics.roles.actions,
      metrics.roles.damage,
      metrics.roles.kills,
      metrics.roles.losses,
      metrics.roles.captures,
      metrics.roles.trainingCoins,
      metrics.roles.survivors,
      metrics.roles.survivalPerCoin,
    ])
      expect(Object.keys(inventory)).toEqual(UNIT_ROLE_IDS_V7);
    for (const inventory of [
      metrics.improvements.built,
      metrics.improvements.removed,
      metrics.improvements.liveOutputHistogram,
      metrics.improvements.outages,
      metrics.improvements.resumptions,
    ])
      expect(Object.keys(inventory)).toEqual(IMPROVEMENT_IDS_V7);
    for (const inventory of [
      metrics.resources.generated,
      metrics.resources.converted,
      metrics.resources.restored,
      metrics.resources.rebuilt,
    ])
      expect(Object.keys(inventory)).toEqual(RESOURCE_IDS_V7);
    expect(Object.keys(metrics.rewards)).toEqual(REWARD_IDS_V7);
  });

  it("records a deterministic structured cap without rejection or stall", () => {
    const setup = setupV7(0);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const initialActivePlayerId =
      created.state.turnOrder[created.state.activeSeatIndex];
    if (initialActivePlayerId === undefined)
      throw new Error("Initial active player missing");
    const progress: unknown[] = [];
    const first = runAiMatchV7(setup, {
      maxCommands: 3,
      maxRounds: 5,
      progressEveryCommands: 2,
      onProgress: (item) => progress.push(item),
    });
    const second = runAiMatchV7(setup, {
      maxCommands: 3,
      maxRounds: 5,
    });
    expect(first).toMatchObject({
      termination: "COMMAND_CAP",
      acceptedCommands: 3,
      errors: [],
      stalls: [],
      metrics: {
        rulesetId: "pulp-wars-poc-7r3",
        commandCapHits: 1,
      },
    });
    expect(first.metrics.observation.hiddenInformationViolations).toBe(0);
    expect(progress).toEqual([
      {
        acceptedCommands: 2,
        round: 1,
        activePlayerId: initialActivePlayerId,
      },
    ]);
    expect(first.commandLog.map((entry) => entry.command.kind)).toEqual([
      "RESEARCH",
      "HARVEST_FRUIT",
      "MOVE",
    ]);
    expect(
      canonicalJson({
        commandHash: first.metrics.commandHash,
        eventHash: first.metrics.eventHash,
        checkpointHash: first.metrics.checkpointHash,
        finalHash: first.metrics.finalHash,
      }),
    ).toBe(
      canonicalJson({
        commandHash: second.metrics.commandHash,
        eventHash: second.metrics.eventHash,
        checkpointHash: second.metrics.checkpointHash,
        finalHash: second.metrics.finalHash,
      }),
    );
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(() =>
      runAiMatchV7(setupV7(0), {
        maxCommands: 1,
        progressEveryCommands: 0,
      }),
    ).toThrow(/progressEveryCommands must be a positive safe integer/);
  });

  it("counts restoration and only the subsequent same-site build as rebuild", () => {
    const staged = richV7(allTechsV7(initialV7(71)));
    const city = staged.cities.find(
      (candidate) => candidate.ownerId === staged.humanPlayerId,
    );
    const farmTile = staged.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.improvement === null &&
        tile.site === null &&
        !staged.treasureChests.some((chest) => same(chest, tile.at)) &&
        !staged.units.some(
          (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
        ),
    );
    if (city === undefined || farmTile === undefined)
      throw new Error("Farm fixture tile missing");
    const initial = checkedV7({
      ...staged,
      board: {
        ...staged.board,
        tiles: staged.board.tiles.map((tile) =>
          tile.at.x === farmTile.at.x && tile.at.y === farmTile.at.y
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
              }
            : tile,
        ),
      },
    });
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    let state = initial;
    const firstBuild = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    ).find(
      (
        command,
      ): command is CommandV7 & {
        readonly kind: "BUILD_FARM";
        readonly at: CoordV7;
      } => command.kind === "BUILD_FARM",
    );
    if (firstBuild === undefined) throw new Error("Farm site missing");
    state = accept(state, state.humanPlayerId, firstBuild, transitions);
    state = drainRewards(state, transitions);
    state = accept(
      state,
      state.humanPlayerId,
      { kind: "REDEVELOP", at: firstBuild.at },
      transitions,
    );
    accept(state, state.humanPlayerId, firstBuild, transitions);
    const metrics = collectAcceptedTelemetryV7(initial, [], transitions);
    expect(metrics.resources.converted.FERTILE_GROUND).toBe(2);
    expect(metrics.resources.restored.FERTILE_GROUND).toBe(1);
    expect(metrics.resources.rebuilt.FERTILE_GROUND).toBe(1);
    expect(metrics.improvements.built.FARM).toBe(2);
    expect(metrics.improvements.removed.FARM).toBe(1);
  });

  it("reconciles every positive coin delta from accepted events", () => {
    const initial = coinTelemetryState();
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    const city = initial.cities.find(
      (candidate) => candidate.ownerId === initial.humanPlayerId,
    );
    const fighter = initial.units.find(
      (unit) =>
        unit.ownerId === initial.humanPlayerId && unit.role === "FIGHTER",
    );
    const forest = initial.board.tiles.find(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.terrain === "FOREST" &&
        tile.improvement === null &&
        tile.site === null,
    );
    const chest = initial.treasureChests[0];
    if (
      city === undefined ||
      fighter === undefined ||
      forest === undefined ||
      chest === undefined
    )
      throw new Error("Coin telemetry fixture missing");
    let state = accept(
      initial,
      initial.humanPlayerId,
      {
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 2,
        reward: "STOCKPILE",
      },
      transitions,
    );
    state = accept(
      state,
      state.humanPlayerId,
      { kind: "CLEAR_FOREST", at: forest.at },
      transitions,
    );
    accept(
      state,
      state.humanPlayerId,
      { kind: "MOVE", unitId: fighter.id, path: [chest] },
      transitions,
    );
    const events = transitions.flatMap((transition) => transition.events);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "CITY_REWARD_CHOSEN",
          coinDelta: 4,
        }),
        expect.objectContaining({ kind: "FOREST_CLEARED", coinDelta: 1 }),
        expect.objectContaining({ kind: "TREASURE_CAPTURED", coinDelta: 5 }),
      ]),
    );
    expect(
      collectAcceptedTelemetryV7(initial, [], transitions).economy.coinsEarned,
    ).toBe(events.reduce((total, event) => total + earnedCoins(event), 0));
  });

  it.each([
    ["chosen", false],
    ["automatic", true],
  ] as const)("counts %s Treasury rewards as earned coins", (_, blocked) => {
    const fixture = treasuryRewardState(blocked);
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    const state = accept(
      fixture.state,
      fixture.state.humanPlayerId,
      { kind: "BUILD_GRAND_WORKS", at: fixture.buildAt },
      transitions,
    );
    if (!blocked)
      accept(
        state,
        state.humanPlayerId,
        {
          kind: "CHOOSE_CITY_REWARD",
          cityId: fixture.cityId,
          reachedLevel: 5,
          reward: "TREASURY",
        },
        transitions,
      );
    const events = transitions.flatMap((transition) => transition.events);
    expect(events).toContainEqual(
      blocked
        ? expect.objectContaining({
            kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
            coins: 12,
          })
        : expect.objectContaining({
            kind: "CITY_REWARD_CHOSEN",
            reward: "TREASURY",
            coinDelta: 12,
          }),
    );
    expect(
      collectAcceptedTelemetryV7(fixture.state, [], transitions).economy
        .coinsEarned,
    ).toBe(12);
  });

  it("counts explicit and automatic recovery between Catapult volleys", () => {
    const initial = catapultVolleyState();
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    const catapults = initial.units.filter(
      (unit) => unit.ownerId === initial.humanPlayerId,
    );
    const targets = initial.units.filter(
      (unit) => unit.ownerId !== initial.humanPlayerId,
    );
    if (catapults.length !== 2 || targets.length !== 2)
      throw new Error("Catapult volley fixture missing");
    const recoveringTarget = targets[0];
    if (recoveringTarget === undefined)
      throw new Error("Recovery target missing");
    const recoveryPlayerId: PlayerId = recoveringTarget.ownerId;
    const recoveringUnitId: UnitStateV7["id"] = recoveringTarget.id;
    let state = initial;
    for (let index = 0; index < 2; index += 1) {
      const catapult = catapults[index];
      const target = targets[index];
      if (catapult === undefined || target === undefined)
        throw new Error("Volley pair missing");
      state = accept(
        state,
        initial.humanPlayerId,
        { kind: "ATTACK", unitId: catapult.id, targetUnitId: target.id },
        transitions,
      );
    }
    state = accept(
      state,
      initial.humanPlayerId,
      { kind: "END_TURN" },
      transitions,
    );
    state = accept(
      state,
      recoveryPlayerId,
      { kind: "RECOVER", unitId: recoveringUnitId },
      transitions,
    );
    state = accept(state, recoveryPlayerId, { kind: "END_TURN" }, transitions);
    for (let index = 0; index < 2; index += 1) {
      const catapult = catapults[index];
      const target = targets[index];
      if (catapult === undefined || target === undefined)
        throw new Error("Second volley pair missing");
      state = accept(
        state,
        initial.humanPlayerId,
        { kind: "ATTACK", unitId: catapult.id, targetUnitId: target.id },
        transitions,
      );
    }
    const recoveries = transitions
      .flatMap((transition) => transition.events)
      .filter(
        (event): event is Extract<DomainEventV7, { kind: "UNIT_RECOVERED" }> =>
          event.kind === "UNIT_RECOVERED" &&
          targets.some((target) => target.id === event.unitId),
      );
    expect(recoveries.map((event) => event.automatic).sort()).toEqual([
      false,
      true,
    ]);
    expect(
      collectAcceptedTelemetryV7(initial, [], transitions).catapult
        .healingBetweenVolleys,
    ).toBe(recoveries.reduce((total, event) => total + event.amount, 0));
  });

  it("counts both Horse Archer shots and attributes retaliation to defender role", () => {
    const initial = combatTelemetryState();
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    let state = initial;
    const horseArcher = state.units.find(
      (unit) => unit.role === "HORSE_ARCHER",
    );
    const victims = state.units.filter(
      (unit) => unit.ownerId !== state.humanPlayerId && unit.role === "FIGHTER",
    );
    const fighter = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.role === "FIGHTER",
    );
    const guard = state.units.find((unit) => unit.role === "GUARD");
    if (
      horseArcher === undefined ||
      victims.length !== 2 ||
      fighter === undefined ||
      guard === undefined
    )
      throw new Error("Combat telemetry fixture missing");
    state = accept(
      state,
      state.humanPlayerId,
      {
        kind: "ATTACK",
        unitId: horseArcher.id,
        targetUnitId: victims[0]?.id as UnitStateV7["id"],
      },
      transitions,
    );
    state = accept(
      state,
      state.humanPlayerId,
      {
        kind: "ATTACK",
        unitId: horseArcher.id,
        targetUnitId: victims[1]?.id as UnitStateV7["id"],
      },
      transitions,
    );
    const beforeRetaliation = viewForV7(state, state.humanPlayerId);
    const preview = queryCombatPreviewV7(
      beforeRetaliation,
      fighter.id,
      guard.id,
    );
    if (preview === null || preview.damageToAttacker <= 0)
      throw new Error("Retaliation preview missing");
    state = accept(
      state,
      state.humanPlayerId,
      { kind: "ATTACK", unitId: fighter.id, targetUnitId: guard.id },
      transitions,
    );
    const metrics = collectAcceptedTelemetryV7(initial, [], transitions);
    expect(metrics.horseArcher).toMatchObject({
      activations: 1,
      shots: 2,
      firstShots: 1,
      secondShots: 1,
      splitFireChoices: 1,
      advanceViolations: 0,
      shotsPerActivation: { "2": 1 },
    });
    expect(metrics.roles.damage.GUARD).toBe(preview.damageToAttacker);
    expect(metrics.roles.kills.HORSE_ARCHER).toBe(1);
    expect(metrics.roles.losses.FIGHTER).toBe(1);
  });

  it("samples Blackout and exposure once at the actual target turn boundary", () => {
    const initial = blackoutTelemetryState();
    const transitions: AcceptedTelemetryTransitionV7[] = [];
    let state = initial;
    const source = state.units[0];
    const target = state.cities.find(
      (city) => city.ownerId !== source?.ownerId,
    );
    if (source === undefined || target === undefined)
      throw new Error("Blackout fixture missing");
    state = accept(
      state,
      source.ownerId,
      { kind: "BLACKOUT_CITY", unitId: source.id, cityId: target.id },
      transitions,
    );
    const beforeTurn = collectAcceptedTelemetryV7(initial, [], transitions);
    expect(beforeTurn.saboteur.detectedTurns).toBe(0);
    expect(beforeTurn.saboteur.concealedTurns).toBe(0);
    expect(beforeTurn.economy.oneCoinFloorAwards).toBe(0);

    while (activePlayer(state) !== target.ownerId)
      state = accept(
        state,
        activePlayer(state),
        { kind: "END_TURN" },
        transitions,
      );
    const metrics = collectAcceptedTelemetryV7(initial, [], transitions);
    const activated = transitions
      .flatMap((transition) => transition.events)
      .find((event) => event.kind === "BLACKOUT_ACTIVATED");
    expect(activated?.kind).toBe("BLACKOUT_ACTIVATED");
    if (activated?.kind !== "BLACKOUT_ACTIVATED") return;
    expect(metrics.saboteur.suppressionCoins).toBe(activated.suppressedCoins);
    expect(metrics.saboteur.actionsDenied).toBeGreaterThan(0);
    expect(metrics.saboteur.detectedTurns).toBe(1);
    expect(metrics.saboteur.exposedTurnsBySource.BLACKOUT).toBe(1);
    expect(metrics.economy.oneCoinFloorAwards).toBe(0);
  });
});

function accept(
  state: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  transitions: AcceptedTelemetryTransitionV7[],
): GameStateV7 {
  const applied = applyCommandV7(state, actorId, command);
  if (!applied.accepted)
    throw new Error(`${command.kind}:${applied.error.code}`);
  transitions.push({
    before: state,
    after: applied.state,
    actorId,
    command,
    events: applied.events,
  });
  return applied.state;
}

function drainRewards(
  initial: GameStateV7,
  transitions: AcceptedTelemetryTransitionV7[],
): GameStateV7 {
  let state = initial;
  while (state.pendingChoices.length > 0) {
    const choice = queryPlayerCommandsV7(
      viewForV7(state, state.humanPlayerId),
    )[0];
    if (choice === undefined) throw new Error("Reward command missing");
    state = accept(state, state.humanPlayerId, choice, transitions);
  }
  return state;
}

function combatTelemetryState(): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(13)));
  const enemy = base.players.find((player) => player.id !== base.humanPlayerId);
  if (enemy === undefined) throw new Error("Enemy missing");
  const specs = [
    ["HORSE_ARCHER", { x: 2, y: 5 }, base.humanPlayerId, 10],
    ["FIGHTER", { x: 3, y: 5 }, enemy.id, 1],
    ["FIGHTER", { x: 4, y: 5 }, enemy.id, 10],
    ["FIGHTER", { x: 5, y: 5 }, base.humanPlayerId, 10],
    ["GUARD", { x: 6, y: 5 }, enemy.id, 15],
  ] as const;
  const units = specs.map(([role, at, ownerId, hp], index) =>
    makeUnit(base, base.nextEntityId + index, ownerId, role, at, hp),
  );
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + units.length,
    units,
    treasureChests: [],
    board: clearOccupiedTiles(
      base,
      units.map((unit) => unit.at),
    ),
  });
}

function blackoutTelemetryState(): GameStateV7 {
  const setup = setupV7(7_102);
  const created = createInitialMapStateV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const sourceOwner = activePlayer(base);
  const targetOwner = base.turnOrder.find((id) => id !== sourceOwner);
  const sourceCity = base.cities.find((city) => city.ownerId === sourceOwner);
  const targetCity = base.cities.find((city) => city.ownerId === targetOwner);
  if (
    targetOwner === undefined ||
    sourceCity === undefined ||
    targetCity === undefined
  )
    throw new Error("Blackout owners missing");
  const at = base.board.tiles.find(
    (tile) =>
      distance(tile.at, targetCity.at) === 1 &&
      !base.cities.some((city) => same(city.at, tile.at)),
  )?.at;
  if (at === undefined) throw new Error("Blackout position missing");
  const source = makeUnit(
    base,
    base.nextEntityId,
    sourceOwner,
    "SABOTEUR",
    at,
    10,
  );
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + 1,
    players: base.players.map((player) =>
      player.id === sourceOwner
        ? { ...player, explored: base.board.tiles.map((tile) => tile.at) }
        : player,
    ),
    units: [source],
  });
}

function coinTelemetryState(): GameStateV7 {
  const base = richV7(
    fixtureWithUnits([["FIGHTER", { x: 5, y: 5 }, true, 10]]),
  );
  const city = base.cities.find(
    (candidate) => candidate.ownerId === base.humanPlayerId,
  );
  const chest = { x: 6, y: 5 };
  const contributionTiles = base.board.tiles
    .filter((tile) => tile.territoryCityId === city?.id)
    .slice(0, 2);
  const forest = base.board.tiles.find(
    (tile) =>
      tile.territoryCityId === city?.id &&
      tile.site === null &&
      !same(tile.at, chest) &&
      !same(tile.at, { x: 5, y: 5 }) &&
      !contributionTiles.some((item) => same(item.at, tile.at)),
  );
  if (
    city === undefined ||
    contributionTiles.length !== 2 ||
    forest === undefined
  )
    throw new Error("Coin state setup missing");
  const contributionStart = base.nextEntityId;
  return checkedV7({
    ...base,
    random: { ...base.random, state: 0 },
    nextEntityId: contributionStart + 2,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            level: 2,
            permanentPopulation: 2,
            economicPopulation: 0,
            population: 0,
            rewards: [],
          }
        : candidate,
    ),
    populationContributions: contributionTiles.map((tile, index) => ({
      id: contributionStart + index,
      cityId: city.id,
      category: "PERMANENT" as const,
      amount: 1,
      source: {
        kind: "RESOURCE_ACTION" as const,
        action: "HARVEST_FRUIT" as const,
        at: tile.at,
      },
    })),
    treasureChests: [chest],
    pendingChoices: [
      {
        kind: "CITY_REWARD",
        cityId: city.id,
        reachedLevel: 2,
        candidates: ["SURVEY", "STOCKPILE"],
      },
    ],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, forest.at)
          ? {
              ...tile,
              terrain: "FOREST" as const,
              resource: null,
              improvement: null,
              site: null,
            }
          : same(tile.at, chest)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                site: null,
              }
            : tile,
      ),
    },
  });
}

function catapultVolleyState(): GameStateV7 {
  return fixtureWithUnits([
    ["CATAPULT", { x: 3, y: 4 }, true, 10],
    ["CATAPULT", { x: 3, y: 7 }, true, 10],
    ["GUARD", { x: 5, y: 4 }, false, 15],
    ["GUARD", { x: 5, y: 7 }, false, 15],
  ]);
}

function treasuryRewardState(blocked: boolean): {
  readonly state: GameStateV7;
  readonly cityId: GameStateV7["cities"][number]["id"];
  readonly buildAt: CoordV7;
} {
  const base = richV7(exploredAllV7(allTechsV7(initialV7(7_113))));
  const city = base.cities.find(
    (candidate) => candidate.ownerId === base.humanPlayerId,
  );
  const center = base.board.tiles.find((tile) => {
    const positions = [
      tile.at,
      { x: tile.at.x, y: tile.at.y - 1 },
      { x: tile.at.x - 1, y: tile.at.y - 1 },
      { x: tile.at.x + 1, y: tile.at.y },
      { x: tile.at.x + 1, y: tile.at.y - 1 },
    ];
    return (
      tile.at.x > 0 &&
      tile.at.x < base.board.width - 1 &&
      tile.at.y > 0 &&
      positions.every(
        (at) =>
          base.board.tiles.find((candidate) => same(candidate.at, at))?.site ===
          null,
      )
    );
  })?.at;
  if (city === undefined || center === undefined)
    throw new Error("Treasury fixture missing");
  const windmillAt = { x: center.x, y: center.y - 1 };
  const farmAt = { x: center.x - 1, y: center.y - 1 };
  const forgeAt = { x: center.x + 1, y: center.y };
  const mineAt = { x: center.x + 1, y: center.y - 1 };
  const improvements = new Map([
    [key(center), "GRAND_WORKS" as const],
    [key(windmillAt), "WINDMILL" as const],
    [key(farmAt), "FARM" as const],
    [key(forgeAt), "FORGE" as const],
    [key(mineAt), "MINE" as const],
  ]);
  const contributionSpecs = [
    [windmillAt, "WINDMILL", 1],
    [farmAt, "FARM", 2],
    [forgeAt, "FORGE", 3],
    [mineAt, "MINE", 4],
  ] as const;
  const contributionId = base.nextEntityId;
  const stagedBoard = {
    ...base.board,
    tiles: base.board.tiles.map((tile) => {
      const improvement = improvements.get(key(tile.at));
      return improvement === undefined
        ? tile
        : {
            ...tile,
            site: null,
            territoryCityId: city.id,
            terrain:
              improvement === "FARM"
                ? ("GRASS" as const)
                : improvement === "MINE"
                  ? ("MOUNTAIN" as const)
                  : tile.terrain,
            resource: null,
            improvement: improvement === "GRAND_WORKS" ? null : improvement,
          };
    }),
  };
  const territory = stagedBoard.tiles.filter(
    (tile) => tile.territoryCityId === city.id,
  );
  const blockers = blocked
    ? territory.map((tile, index) =>
        makeUnit(
          base,
          contributionId + contributionSpecs.length + index,
          base.humanPlayerId,
          "FIGHTER",
          tile.at,
          10,
        ),
      )
    : [];
  return {
    cityId: city.id,
    buildAt: center,
    state: checkedV7({
      ...base,
      nextEntityId: contributionId + contributionSpecs.length + blockers.length,
      cities: base.cities.map((candidate) =>
        candidate.id === city.id
          ? {
              ...candidate,
              level: 4,
              permanentPopulation: 0,
              economicPopulation: 10,
              population: 1,
              expanded: true,
              rewards: [
                { reachedLevel: 2, reward: "STOCKPILE" as const },
                { reachedLevel: 3, reward: "WALLS" as const },
                { reachedLevel: 4, reward: "EXPAND" as const },
              ],
            }
          : candidate,
      ),
      populationContributions: contributionSpecs.map(
        ([at, improvement, amount], index) => ({
          id: contributionId + index,
          cityId: city.id,
          category: "LIVE" as const,
          amount,
          source: {
            kind: "IMPROVEMENT" as const,
            improvement,
            at,
          },
        }),
      ),
      units: blockers,
      treasureChests: [],
      board: stagedBoard,
    }),
  };
}

type TelemetryUnitSpec = readonly [
  role: UnitRoleIdV7,
  at: CoordV7,
  own: boolean,
  hp: number,
];

function fixtureWithUnits(specs: readonly TelemetryUnitSpec[]): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialV7(13)));
  const enemy = base.players.find((player) => player.id !== base.humanPlayerId);
  if (enemy === undefined) throw new Error("Enemy missing");
  const units = specs.map(([role, at, own, hp], index) =>
    makeUnit(
      base,
      base.nextEntityId + index,
      own ? base.humanPlayerId : enemy.id,
      role,
      at,
      hp,
    ),
  );
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + units.length,
    units,
    treasureChests: [],
    board: clearOccupiedTiles(
      base,
      units.map((unit) => unit.at),
    ),
  });
}

function earnedCoins(event: DomainEventV7): number {
  switch (event.kind) {
    case "INCOME_AWARDED":
      return event.totalCoins;
    case "FOREST_CLEARED":
    case "TREASURE_CAPTURED":
    case "CITY_REWARD_CHOSEN":
    case "IMPROVEMENT_PILLAGED":
    case "UNIT_DISBANDED":
      return Math.max(0, event.coinDelta);
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
    case "SPOILS_AWARDED":
      return event.coins;
    default:
      return 0;
  }
}

function makeUnit(
  state: GameStateV7,
  id: number,
  ownerId: PlayerId,
  role: UnitRoleIdV7,
  at: CoordV7,
  hp: number,
): UnitStateV7 {
  const rule = effectiveRoleRuleV7(role);
  return {
    id: id as UnitStateV7["id"],
    ownerId,
    homeCityId:
      state.cities.find((city) => city.ownerId === ownerId)?.id ?? null,
    role,
    at,
    hp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
    activation: READY,
    blackoutEligibleRound: role === "SABOTEUR" ? 1 : null,
  };
}

function clearOccupiedTiles(state: GameStateV7, occupied: readonly CoordV7[]) {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      occupied.some((at) => same(at, tile.at))
        ? {
            ...tile,
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
          }
        : tile,
    ),
  };
}

function activePlayer(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new Error("Active player missing");
  return id;
}

const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const key = (at: CoordV7) => `${at.y},${at.x}`;
