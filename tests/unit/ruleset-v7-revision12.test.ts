import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  normalOpeningScoresV7,
  normalOpeningTechnologyV7,
  scoreCommandV7,
} from "../../src/ai/index";
import {
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  parseReplayFileV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  runReplayV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerViewV7,
  type ReplayFileV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { raiderEscapePublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";
import {
  checkedV7,
  exploredAllV7,
  initialV7,
  setupV7,
} from "../fixtures/v7-builders";

describe("ruleset-7 revision-12 identity", () => {
  it("keeps rejecting r11 after the r54 identity and cleans every obsolete Ruleset-7 key", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r65");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r65.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-11)).toBe(
      "pulpWars.save.v7r54.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);

    const state = initialV7();
    expect(state.rulesetId).toBe("pulp-wars-poc-7r65");
    expect(
      parseGameStateV7({ ...state, rulesetId: "pulp-wars-poc-7r11" }),
    ).toBeNull();
    const oldSetup = { ...state.setup, rulesetId: "pulp-wars-poc-7r11" };
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    expect(
      parseSaveV7(
        JSON.stringify({
          format: "pulp-wars-save",
          version: 7,
          rulesetId: "pulp-wars-poc-7r11",
          setup: oldSetup,
          state: { ...state, rulesetId: "pulp-wars-poc-7r11", setup: oldSetup },
          randomState: state.random,
          acceptedCommands: [],
          commandIndex: 0,
          stateHash: "0".repeat(64),
          savedAt: "2026-09-28T12:00:00.000Z",
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 revision-12 free opening technology", () => {
  it("starts every seat with no technology and offers every tier-1 opener for free", () => {
    const state = initialV7();
    expect(
      state.players.every((player) => player.researchedTechs.length === 0),
    ).toBe(true);
    const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
    expect(
      tree.nodes
        .filter((node) => node.tier === 1)
        .map((node) => [node.id, node.state, node.cost, node.affordable]),
    ).toEqual([
      ["GATHERING", "AVAILABLE", 0, true],
      ["HUNTING", "AVAILABLE", 0, true],
      ["SCOUTING", "AVAILABLE", 0, true],
      ["DRILL", "AVAILABLE", 0, true],
      // Dry Land keeps Naval visible but never offered, at its ordinary cost.
      ["SHORECRAFT", "DISABLED", 5, false],
    ]);
    expect(tree.nodes.find((node) => node.id === "FARMING")).toMatchObject({
      state: "BLOCKED",
      cost: 7,
      missingPrerequisites: ["GATHERING"],
    });
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).filter(
        (command) => command.kind === "RESEARCH",
      ),
    ).toEqual([
      { kind: "RESEARCH", tech: "GATHERING" },
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "RESEARCH", tech: "SCOUTING" },
      { kind: "RESEARCH", tech: "DRILL" },
    ]);
  });

  it("offers Shorecraft as a free opener on water maps", () => {
    const view = withSetupMapType(
      viewForV7(initialV7(), initialV7().humanPlayerId),
      "CONTINENTS",
    );
    expect(
      queryTechnologyTreeV7(view).nodes.find(
        (node) => node.id === "SHORECRAFT",
      ),
    ).toMatchObject({ state: "AVAILABLE", cost: 0, affordable: true });
  });

  it("records a zero-cost first research and restores the ordinary formula afterward", () => {
    const state = broke(initialV7());
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(first.events[0]).toEqual({
      kind: "TECH_RESEARCHED",
      playerId: state.humanPlayerId,
      tech: "HUNTING",
      cost: 0,
    });
    expect(first.events.every((event) => parseEventV7(event).ok)).toBe(true);
    expect(human(first.state).coins).toBe(0);
    const tree = queryTechnologyTreeV7(first.state, state.humanPlayerId);
    expect(tree.nodes.find((node) => node.id === "SCOUTING")).toMatchObject({
      state: "AVAILABLE",
      cost: 5,
      affordable: false,
    });
    expect(
      applyCommandV7(first.state, state.humanPlayerId, {
        kind: "RESEARCH",
        tech: "SCOUTING",
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "INSUFFICIENT_COINS", params: { cost: 5 } },
    });
  });

  it("is not forced: other work and End Turn stay available and the opener waits", () => {
    const state = initialV7();
    const commands = queryPlayerCommandsV7(state, state.humanPlayerId);
    expect(commands).toContainEqual({ kind: "END_TURN" });
    expect(commands.some((command) => command.kind === "MOVE")).toBe(true);
    let later = state;
    for (let guard = 0; guard < 8; guard += 1) {
      const actor = later.turnOrder[later.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      if (actor === later.humanPlayerId && later.round > state.round) break;
      const ended = applyCommandV7(later, actor, { kind: "END_TURN" });
      if (!ended.accepted) throw new Error(ended.error.code);
      later = ended.state;
    }
    expect(later.round).toBeGreaterThan(state.round);
    const research = applyCommandV7(broke(later), later.humanPlayerId, {
      kind: "RESEARCH",
      tech: "SCOUTING",
    });
    expect(research).toMatchObject({
      accepted: true,
      events: [expect.objectContaining({ tech: "SCOUTING", cost: 0 })],
    });
  });
});

describe("ruleset-7 revision-12 resource visibility", () => {
  it("shows Fruit from the start but masks Fertile Ground until Gathering", () => {
    const { state, fruit, fertile } = resourceFixture();
    const before = viewForV7(state, state.humanPlayerId);
    expect(viewTile(before, fruit)).toMatchObject({ resource: "FRUIT" });
    expect(viewTile(before, fertile)).toMatchObject({ resource: null });
    expect(JSON.stringify(before.board)).not.toContain("FERTILE_GROUND");
    expect(
      queryPlayerCommandsV7(before).some(
        (command) => command.kind === "HARVEST_FRUIT",
      ),
    ).toBe(false);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "HARVEST_FRUIT",
        at: fruit,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "TECH_REQUIRED", params: { tech: "GATHERING" } },
    });

    const gathered = applyCommandV7(state, state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "GATHERING",
    });
    if (!gathered.accepted) throw new Error(gathered.error.code);
    const after = viewForV7(gathered.state, state.humanPlayerId);
    expect(viewTile(after, fertile)).toMatchObject({
      resource: "FERTILE_GROUND",
    });
    expect(queryPlayerCommandsV7(after)).toContainEqual({
      kind: "HARVEST_FRUIT",
      at: fruit,
    });
  });

  it("masks cultivated Fertile Ground in projected events for viewers without Gathering", () => {
    const { state, forest } = resourceFixture();
    const cultivator = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, researchedTechs: ["SCOUTING", "RAIDING", "CHIVALRY"] }
          : player,
      ),
    });
    const result = applyCommandV7(cultivator, state.humanPlayerId, {
      kind: "CULTIVATE_FOREST",
      at: forest,
    });
    if (!result.accepted) throw new Error(result.error.code);
    const canonical = result.events.find(
      (event) => event.kind === "FOREST_CULTIVATED",
    );
    expect(canonical).toMatchObject({ resourceAfter: "FERTILE_GROUND" });
    const projected = projectEventsV7(
      cultivator,
      result.state,
      state.humanPlayerId,
      result.events,
    );
    expect(
      projected.events.find((event) => event.kind === "FOREST_CULTIVATED"),
    ).toMatchObject({ resourceAfter: null });
    expect(JSON.stringify(projected)).not.toContain("FERTILE_GROUND");
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });
    expect(
      viewTile(viewForV7(result.state, state.humanPlayerId), forest),
    ).toMatchObject({ terrain: "GRASS", resource: null });
  });

  it("drops masked Fertile Ground only for the Replant Forest terrain-transform exception", () => {
    const { state, fertile } = resourceFixture();
    const replanter = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              coins: 100,
              researchedTechs: ["HUNTING", "MARKSMANSHIP", "FIELDCRAFT"],
            }
          : player,
      ),
    });
    const offered = queryPlayerCommandsV7(replanter, state.humanPlayerId);
    expect(offered).toContainEqual({ kind: "REPLANT_FOREST", at: fertile });
    const result = applyCommandV7(replanter, state.humanPlayerId, {
      kind: "REPLANT_FOREST",
      at: fertile,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(tileAt(result.state, fertile)).toMatchObject({
      terrain: "FOREST",
      resource: null,
    });
    const gathered = checkedV7({
      ...replanter,
      players: replanter.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              researchedTechs: [
                "GATHERING",
                "HUNTING",
                "MARKSMANSHIP",
                "FIELDCRAFT",
              ],
            }
          : player,
      ),
    });
    expect(
      queryPlayerCommandsV7(gathered, state.humanPlayerId),
    ).not.toContainEqual({ kind: "REPLANT_FOREST", at: fertile });
    expect(
      applyCommandV7(gathered, state.humanPlayerId, {
        kind: "REPLANT_FOREST",
        at: fertile,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "FOREST_ACTION_INVALID_TILE" },
    });
  });
});

describe("ruleset-7 revision-12 resources kept under improvements", () => {
  it("keeps Fertile Ground under a Farm, hides it, and re-exposes it on Redevelop", () => {
    const { state, fertile } = resourceFixture();
    const farmer = withHumanTechs(state, [
      "GATHERING",
      "FARMING",
      "DRILL",
      "ENGINEERING",
    ]);
    const farmed = settled(farmer, { kind: "BUILD_FARM", at: fertile });
    expect(tileAt(farmed.state, fertile)).toMatchObject({
      improvement: "FARM",
      resource: "FERTILE_GROUND",
    });
    const view = viewForV7(farmed.state, state.humanPlayerId);
    expect(viewTile(view, fertile)).toMatchObject({
      improvement: "FARM",
      resource: null,
    });
    expect(
      queryPlayerCommandsV7(view).some(
        (command) =>
          "at" in command &&
          same(command.at, fertile) &&
          command.kind !== "REDEVELOP" &&
          command.kind !== "BUILD_ROAD",
      ),
    ).toBe(false);
    expect(
      applyCommandV7(farmed.state, state.humanPlayerId, {
        kind: "BUILD_FARM",
        at: fertile,
      }),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_TILE" } });
    const round = parseGameStateV7(
      JSON.parse(JSON.stringify(farmed.state)) as unknown,
    );
    expect(round).toEqual(farmed.state);
    expect(
      parseGameStateV7(withTile(farmed.state, fertile, { resource: null })),
    ).toBeNull();

    const removed = apply(farmed.state, { kind: "REDEVELOP", at: fertile });
    expect(
      removed.events.find(
        (event) => event.kind === "ECONOMIC_BUILDING_REMOVED",
      ),
    ).toMatchObject({ resourceRestored: "FERTILE_GROUND" });
    expect(removed.events.every((event) => parseEventV7(event).ok)).toBe(true);
    expect(tileAt(removed.state, fertile)).toMatchObject({
      improvement: null,
      resource: "FERTILE_GROUND",
    });
    const after = viewForV7(removed.state, state.humanPlayerId);
    expect(viewTile(after, fertile)).toMatchObject({
      resource: "FERTILE_GROUND",
    });
    expect(queryPlayerCommandsV7(after)).toContainEqual({
      kind: "BUILD_FARM",
      at: fertile,
    });
  });

  it("keeps Ore under a Mine and re-exposes it on Redevelop", () => {
    const { state, fertile } = resourceFixture();
    const mountain = withTile(
      withHumanTechs(state, ["DRILL", "ENGINEERING"]),
      fertile,
      { terrain: "MOUNTAIN", resource: "ORE" },
    );
    const mined = settled(checkedV7(mountain), {
      kind: "BUILD_MINE",
      at: fertile,
    });
    expect(tileAt(mined.state, fertile)).toMatchObject({
      improvement: "MINE",
      resource: "ORE",
    });
    expect(
      viewTile(viewForV7(mined.state, state.humanPlayerId), fertile),
    ).toMatchObject({ resource: null });
    const removed = apply(mined.state, { kind: "REDEVELOP", at: fertile });
    expect(tileAt(removed.state, fertile)).toMatchObject({
      improvement: null,
      resource: "ORE",
    });
    expect(
      viewTile(viewForV7(removed.state, state.humanPlayerId), fertile),
    ).toMatchObject({ resource: "ORE" });
  });

  it("re-exposes Fertile Ground when a hostile unit pillages the Farm", () => {
    const { state, fertile } = resourceFixture();
    const farmed = settled(withHumanTechs(state, ["GATHERING", "FARMING"]), {
      kind: "BUILD_FARM",
      at: fertile,
    });
    const ended = apply(farmed.state, { kind: "END_TURN" });
    const enemyId = ended.state.turnOrder[ended.state.activeSeatIndex];
    if (enemyId === undefined || enemyId === state.humanPlayerId)
      throw new Error("enemy turn missing");
    const raiderUnit = ended.state.units.find(
      (item) => item.ownerId === enemyId,
    );
    if (raiderUnit === undefined) throw new Error("enemy unit missing");
    const staged = checkedV7({
      ...ended.state,
      players: ended.state.players.map((player) =>
        player.id === enemyId
          ? { ...player, researchedTechs: ["SCOUTING", "RAIDING"] }
          : player,
      ),
      units: ended.state.units.map((item) =>
        item.id === raiderUnit.id
          ? { ...item, at: fertile, captureEligible: false }
          : item,
      ),
    });
    const pillaged = applyCommandV7(staged, enemyId, {
      kind: "PILLAGE",
      unitId: raiderUnit.id,
    });
    if (!pillaged.accepted) throw new Error(pillaged.error.code);
    expect(
      pillaged.events.find((event) => event.kind === "IMPROVEMENT_PILLAGED"),
    ).toMatchObject({
      improvement: "FARM",
      resourceRestored: "FERTILE_GROUND",
    });
    expect(tileAt(pillaged.state, fertile)).toMatchObject({
      improvement: null,
      resource: "FERTILE_GROUND",
    });
    // The pillager lacks Gathering, so its projection keeps the mask.
    const projected = projectEventsV7(
      staged,
      pillaged.state,
      enemyId,
      pillaged.events,
    );
    expect(
      projected.events.find((event) => event.kind === "IMPROVEMENT_PILLAGED"),
    ).toMatchObject({ resourceRestored: null });
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });
  });

  it("keeps masked Fertile Ground under a Monument and exposes it after removal with Gathering", () => {
    const { state, fertile } = resourceFixture();
    const builder = checkedV7({
      ...withHumanTechs(state, ["SCOUTING", "DRILL", "ENGINEERING"]),
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              coins: 20,
              researchedTechs: ["SCOUTING", "DRILL", "ENGINEERING"],
              achievementEntitlements: player.achievementEntitlements.map(
                (entitlement) =>
                  entitlement.achievement === "EXPLORER"
                    ? { ...entitlement, unlocked: true }
                    : entitlement,
              ),
            }
          : player,
      ),
    });
    const view = viewForV7(builder, state.humanPlayerId);
    expect(viewTile(view, fertile)).toMatchObject({ resource: null });
    expect(queryPlayerCommandsV7(view)).toContainEqual({
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
      at: fertile,
    });
    const built = settled(builder, {
      kind: "BUILD_MONUMENT",
      achievement: "EXPLORER",
      at: fertile,
    });
    expect(tileAt(built.state, fertile)).toMatchObject({
      improvement: "MONUMENT",
      resource: "FERTILE_GROUND",
    });
    const gathered = withHumanTechs(built.state, [
      "GATHERING",
      "SCOUTING",
      "DRILL",
      "ENGINEERING",
    ]);
    expect(
      viewTile(viewForV7(gathered, state.humanPlayerId), fertile),
    ).toMatchObject({ improvement: "MONUMENT", resource: null });
    expect(
      parseGameStateV7(JSON.parse(JSON.stringify(gathered)) as unknown),
    ).toEqual(gathered);

    const removedMasked = apply(built.state, {
      kind: "REDEVELOP",
      at: fertile,
    });
    expect(tileAt(removedMasked.state, fertile)).toMatchObject({
      improvement: null,
      resource: "FERTILE_GROUND",
    });
    expect(
      viewTile(viewForV7(removedMasked.state, state.humanPlayerId), fertile),
    ).toMatchObject({ resource: null });
    const maskedProjection = projectEventsV7(
      built.state,
      removedMasked.state,
      state.humanPlayerId,
      removedMasked.events,
    );
    expect(JSON.stringify(maskedProjection)).not.toContain("FERTILE_GROUND");
    expect(parsePlayerEventEnvelopeV7(maskedProjection)).toMatchObject({
      ok: true,
    });

    const removed = apply(gathered, { kind: "REDEVELOP", at: fertile });
    expect(
      removed.events.find(
        (event) => event.kind === "ECONOMIC_BUILDING_REMOVED",
      ),
    ).toMatchObject({
      improvement: "MONUMENT",
      resourceRestored: "FERTILE_GROUND",
    });
    expect(removed.events.every((event) => parseEventV7(event).ok)).toBe(true);
    expect(
      viewTile(viewForV7(removed.state, state.humanPlayerId), fertile),
    ).toMatchObject({ improvement: null, resource: "FERTILE_GROUND" });
  });

  it("rejects resources an improvement can never hide", () => {
    const { state, fertile, forest } = resourceFixture();
    expect(
      parseGameStateV7(
        withTile(state, forest, {
          improvement: "LUMBER_CAMP",
          resource: "GAME",
        }),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withTile(state, fertile, {
          improvement: "WORKSHOP",
          resource: "FRUIT",
        }),
      ),
    ).toBeNull();
  });
});

describe("ruleset-7 revision-12 Normal AI opening research", () => {
  it("keeps the opening heuristic on public-view imports only", () => {
    const source = readFileSync("src/ai/v7-opening.ts", "utf8");
    expect(
      [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]),
    ).toEqual([
      "../engine/v7/query",
      "../engine/v7/types",
      "../engine/v7/view",
    ]);
    expect(source).not.toMatch(/GameStateV7|random|Math\.random|Date/);
  });

  it.each([
    ["fruit-rich plains", "GATHERING"],
    ["forest and game", "HUNTING"],
    ["highland", "DRILL"],
    ["coastal", "SHORECRAFT"],
    ["barren", "SCOUTING"],
    ["threatened barren", "DRILL"],
  ] as const)("chooses the opener for %s surroundings", (name, expected) => {
    const view = surroundings(name);
    expect(normalOpeningTechnologyV7(view)).toBe(expected);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: expected });
    expect(decision.prngDraws).toBe(0);
    expect(
      decision.candidates.filter(
        (candidate) => candidate.command.kind === "RESEARCH",
      ),
    ).toHaveLength(1);
  });

  it("never offers Shorecraft on Dry Land even beside water", () => {
    const view = withSetupMapType(surroundings("coastal"), "DRY_LAND");
    expect(normalOpeningScoresV7(view).map((item) => item.tech)).not.toContain(
      "SHORECRAFT",
    );
    expect(normalOpeningTechnologyV7(view)).not.toBe("SHORECRAFT");
  });

  it("breaks exact ties by frozen technology order", () => {
    const base = surroundings("barren");
    const noCapital: PlayerViewV7 = {
      ...base,
      viewer: { ...base.viewer, originalCapitalCityId: 999 as never },
    };
    expect(normalOpeningScoresV7(noCapital)).toEqual([
      { tech: "GATHERING", score: 0 },
      { tech: "HUNTING", score: 0 },
      { tech: "SCOUTING", score: 0 },
      { tech: "DRILL", score: 0 },
    ]);
  });

  it("stops scoring openers once any technology is researched", () => {
    const base = surroundings("fruit-rich plains");
    const later: PlayerViewV7 = {
      ...base,
      viewer: { ...base.viewer, researchedTechs: ["HUNTING"] },
    };
    expect(normalOpeningScoresV7(later)).toEqual([]);
    expect(normalOpeningTechnologyV7(later)).toBeNull();
  });

  it("researches the free opener first on a natural first AI turn", () => {
    const created = createPlayableGameV7(setupV7(71));
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    const aiId = state.players.find(
      (player) => player.id !== state.humanPlayerId,
    )?.id;
    if (state.turnOrder[state.activeSeatIndex] !== aiId) {
      const ended = applyCommandV7(state, state.humanPlayerId, {
        kind: "END_TURN",
      });
      if (!ended.accepted) throw new Error(ended.error.code);
      state = ended.state;
    }
    if (aiId === undefined) throw new Error("AI missing");
    const view = viewForV7(state, aiId);
    const opener = normalOpeningTechnologyV7(view);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).toEqual({ kind: "RESEARCH", tech: opener });
    if (decision.command === null) throw new Error("decision missing");
    const applied = applyCommandV7(state, aiId, decision.command);
    expect(applied).toMatchObject({
      accepted: true,
      events: [expect.objectContaining({ kind: "TECH_RESEARCHED", cost: 0 })],
    });
  });
});

describe("ruleset-7 revision-12 Raider Escape", () => {
  it("grants one fresh Move 2 after a surviving attack and then handles the Raider", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    expect(
      queryCombatPreviewV7(
        fixture.state,
        fixture.state.humanPlayerId,
        raider.id,
        guard.id,
      ),
    ).toMatchObject({ escapeAvailable: true, attackerDies: false });
    const attacked = apply(fixture.state, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    const resolved = combat(attacked.events);
    expect(resolved.preview).toMatchObject({
      escapeAvailable: true,
      attackerDies: false,
      overrunContinues: false,
    });
    expect(attacked.events.every((event) => parseEventV7(event).ok)).toBe(true);
    expect(unit(attacked.state, raider.id).activation).toMatchObject({
      attacked: true,
      attacksUsed: 1,
      escapeAvailable: true,
      handled: false,
    });
    const offered = raiderCommands(attacked.state, raider.id);
    expect([...new Set(offered.map((command) => command.kind))].sort()).toEqual(
      ["MOVE", "WAIT"],
    );
    const far = offered.find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" &&
        distance(command.path.at(-1) ?? raider.at, raider.at) === 2,
    );
    if (far === undefined) throw new Error("two-cell escape missing");
    const escaped = apply(attacked.state, far);
    expect(unit(escaped.state, raider.id)).toMatchObject({
      at: far.path.at(-1),
      activation: {
        moved: true,
        movedPathLength: 0,
        escapeAvailable: false,
        handled: true,
      },
    });
    expect(raiderCommands(escaped.state, raider.id)).toEqual([]);
    expect(
      applyCommandV7(escaped.state, escaped.state.humanPlayerId, {
        kind: "MOVE",
        unitId: raider.id,
        path: [raider.at],
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_ALREADY_ACTED" } });
  });

  it("refreshes a full Move after a prior move without refreshing Charge", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    const moved = apply(fixture.state, {
      kind: "MOVE",
      unitId: raider.id,
      path: [{ x: 4, y: 3 }],
    });
    expect(unit(moved.state, raider.id).activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
    });
    const attacked = apply(moved.state, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    expect(combat(attacked.events).preview).toMatchObject({
      chargeApplied: false,
      escapeAvailable: true,
    });
    const escape = raiderCommands(attacked.state, raider.id).find(
      (command) =>
        command.kind === "MOVE" &&
        command.path.length === 2 &&
        same(command.path.at(-1), { x: 3, y: 5 }),
    );
    if (escape === undefined) throw new Error("fresh Move 2 escape missing");
    const escaped = apply(attacked.state, escape);
    expect(unit(escaped.state, raider.id).activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
      attacksUsed: 1,
      inspired: false,
      escapeAvailable: false,
      handled: true,
    });
  });

  it("allows escape after a melee kill and ordinary advance", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    const weak = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((item) =>
        item.id === guard.id ? { ...item, hp: 1 } : item,
      ),
    });
    const attacked = apply(weak, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    expect(combat(attacked.events).preview).toMatchObject({
      defenderDies: true,
      advances: true,
      escapeAvailable: true,
    });
    expect(unit(attacked.state, raider.id)).toMatchObject({
      at: guard.at,
      activation: { escapeAvailable: true, handled: false },
    });
    expect(
      raiderCommands(attacked.state, raider.id).some(
        (command) => command.kind === "MOVE",
      ),
    ).toBe(true);
  });

  it("grants nothing when the Raider dies, to other roles, or after non-Attack actions", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    const fragile = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((item) =>
        item.id === raider.id ? { ...item, hp: 1 } : item,
      ),
    });
    const died = apply(fragile, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    expect(combat(died.events).preview).toMatchObject({
      attackerDies: true,
      escapeAvailable: false,
    });

    const fighter = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((item) =>
        item.id === raider.id ? { ...item, role: "FIGHTER" as const } : item,
      ),
    });
    const fought = apply(fighter, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    expect(combat(fought.events).preview.escapeAvailable).toBe(false);
    expect(unit(fought.state, raider.id).activation).toMatchObject({
      escapeAvailable: false,
      handled: true,
    });

    const wounded = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((item) =>
        item.id === raider.id ? { ...item, hp: 5 } : item,
      ),
    });
    const recovered = apply(wounded, { kind: "RECOVER", unitId: raider.id });
    expect(unit(recovered.state, raider.id).activation.escapeAvailable).toBe(
      false,
    );
    expect(raiderCommands(recovered.state, raider.id)).toEqual([]);
  });

  it("lets the player decline with Wait and expires at End Turn", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    const attacked = apply(fixture.state, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    const waited = apply(attacked.state, { kind: "WAIT", unitId: raider.id });
    expect(unit(waited.state, raider.id).activation).toMatchObject({
      escapeAvailable: false,
      handled: true,
    });
    expect(raiderCommands(waited.state, raider.id)).toEqual([]);

    const ended = apply(attacked.state, { kind: "END_TURN" });
    expect(unit(ended.state, raider.id).activation.escapeAvailable).toBe(false);
  });

  it("hashes, validates, and projects the canonical activation flag", () => {
    const tactical = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(tactical.state);
    // The opponent has explored the whole board, so it observes the Raider.
    const fixture = {
      state: checkedV7({
        ...tactical.state,
        players: tactical.state.players.map((player) => ({
          ...player,
          explored: tactical.state.board.tiles.map((tile) => tile.at),
        })),
      }),
    };
    const attacked = apply(fixture.state, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    const roundTrip = parseGameStateV7(
      JSON.parse(JSON.stringify(attacked.state)) as unknown,
    );
    expect(roundTrip).toEqual(attacked.state);
    const withoutFlag = withActivation(attacked.state, raider.id, {
      escapeAvailable: false,
    });
    expect(canonicalHash(withoutFlag)).not.toBe(canonicalHash(attacked.state));
    for (const invalid of [
      { ...unit(attacked.state, raider.id).activation, handled: true },
      {
        ...unit(attacked.state, raider.id).activation,
        attacked: false,
        attacksUsed: 0,
      },
    ])
      expect(
        parseGameStateV7(
          replaceUnit(attacked.state, raider.id, { activation: invalid }),
        ),
      ).toBeNull();
    expect(
      parseGameStateV7(
        replaceUnit(attacked.state, raider.id, { role: "FIGHTER" }),
      ),
    ).toBeNull();

    const enemyId = guard.ownerId;
    const enemyView = viewForV7(attacked.state, enemyId);
    expect(
      enemyView.units.find((item) => item.id === raider.id)?.activation,
    ).toMatchObject({ escapeAvailable: true });
    expect(
      viewForV7(attacked.state, attacked.state.humanPlayerId).unitStats.find(
        (entry) => entry.unitId === raider.id,
      )?.statuses,
    ).toContain("Escape: may move again");
    const projected = projectEventsV7(
      fixture.state,
      attacked.state,
      enemyId,
      attacked.events,
    );
    expect(parsePlayerEventEnvelopeV7(projected)).toMatchObject({ ok: true });
    expect(
      projected.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({ preview: { escapeAvailable: true } });

    const hidden = checkedV7({
      ...attacked.state,
      players: attacked.state.players.map((player) =>
        player.id === enemyId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => distance(at, unit(attacked.state, raider.id).at) > 0,
              ),
            }
          : player,
      ),
    });
    expect(
      viewForV7(hidden, enemyId).units.some((item) => item.id === raider.id),
    ).toBe(false);
  });

  it("round-trips a natural escape through replay and save", () => {
    // Revision 16 maps and openings differ (growth floor, growth-first AI
    // opening); seed 5 showed a natural escape within the same command cap
    // (seed 13 did on revision-14/15 maps, seed 3 on revision-13 maps).
    // pulp_wars-9s0.1: with the campaign plan the seed-5 Raider scouts
    // elsewhere; seed 1 shows a natural escape within the cap. On the
    // many-seats boards (`pulp_wars-ykw.3`) seed 2 does (of seeds 0-15:
    // 2, 8, 10, and 14). With tuning 1 (`pulp_wars-w49.3`, 7r46) seed 8
    // does (of seeds 0-15: 8, 10, and 14). With tuning 6
    // (`pulp_wars-w49.6`) seed 2 does (of seeds 0-15: 1, 2, 7, 9, 12, 13,
    // and 14).
    const setup = setupV7(2);
    const natural = runAiMatchV7(setup, { maxRounds: 40, maxCommands: 110 });
    const index = natural.commandLog.findIndex((entry) =>
      entry.events.some(
        (event) =>
          event.kind === "COMBAT_RESOLVED" && event.preview.escapeAvailable,
      ),
    );
    expect(index).toBeGreaterThanOrEqual(0);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state: GameStateV7 = created.state;
    let replay: ReplayFileV7 = createReplayV7(setup);
    for (const entry of natural.commandLog.slice(0, index + 1)) {
      const actor = state.turnOrder[state.activeSeatIndex];
      if (actor === undefined) throw new Error("actor missing");
      const result = applyCommandV7(state, actor, entry.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, entry.command, state);
    }
    expect(state.units.some((item) => item.activation.escapeAvailable)).toBe(
      true,
    );
    expect(canonicalHash(runReplayV7(replay).state)).toBe(canonicalHash(state));
    const envelope = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-28T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(envelope));
    expect(loaded.kind).toBe("VALID");
    if (loaded.kind !== "VALID") return;
    expect(canonicalHash(loaded.save.state)).toBe(canonicalHash(state));
  }, 600_000);

  it("uses the escape Move only toward a strictly safer visible tile", () => {
    const fixture = raiderEscapePublicFixtureV7();
    const { raider, guard } = pieces(fixture.state);
    const attacked = apply(fixture.state, {
      kind: "ATTACK",
      unitId: raider.id,
      targetUnitId: guard.id,
    });
    const view = viewForV7(attacked.state, attacked.state.humanPlayerId);
    const moves = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" && command.unitId === raider.id,
    );
    const stay = moves.find(
      (command) => distance(command.path.at(-1) ?? raider.at, guard.at) === 1,
    );
    const away = moves.find(
      (command) => distance(command.path.at(-1) ?? raider.at, guard.at) >= 2,
    );
    if (stay === undefined || away === undefined)
      throw new Error("escape options missing");
    expect(scoreCommandV7(view, stay).priority).toBe(-1);
    const retreat = scoreCommandV7(view, away);
    expect(retreat.priority).toBeGreaterThanOrEqual(1195);
    expect(retreat.strategicValue).toBeGreaterThan(0);
    const decision = chooseNormalCommandV7(view);
    const raiderMoves = decision.candidates.filter(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === raider.id,
    );
    expect(raiderMoves.length).toBeGreaterThan(0);
    expect(
      raiderMoves.every(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          distance(candidate.command.path.at(-1) ?? raider.at, guard.at) >= 2,
      ),
    ).toBe(true);
    expect(
      scoreCommandV7(viewForV7(fixture.state, fixture.state.humanPlayerId), {
        kind: "ATTACK",
        unitId: raider.id,
        targetUnitId: guard.id,
      }).strategicValue,
    ).toBeGreaterThan(
      scoreCommandV7(
        viewForV7(
          replaceUnit(fixture.state, raider.id, { role: "FIGHTER" }),
          fixture.state.humanPlayerId,
        ),
        { kind: "ATTACK", unitId: raider.id, targetUnitId: guard.id },
      ).strategicValue,
    );
  });
});

type Surroundings =
  | "fruit-rich plains"
  | "forest and game"
  | "highland"
  | "coastal"
  | "barren"
  | "threatened barren";

/** A public view whose capital surroundings (Chebyshev 2) are replaced. */
function surroundings(kind: Surroundings): PlayerViewV7 {
  const state = exploredAllV7(initialV7(71));
  const base = viewForV7(state, state.humanPlayerId);
  const capital = base.cities.find(
    (city) => city.id === base.viewer.originalCapitalCityId,
  );
  if (capital === undefined) throw new Error("capital missing");
  const ring = base.board.tiles
    .filter(
      (tile) =>
        distance(tile.at, capital.at) <= 2 && !same(tile.at, capital.at),
    )
    .map((tile) => tile.at);
  const patch = (index: number): Record<string, unknown> => {
    switch (kind) {
      case "fruit-rich plains":
        return { terrain: "GRASS", resource: index < 3 ? "FRUIT" : null };
      case "forest and game":
        return { terrain: "FOREST", resource: index < 4 ? "GAME" : null };
      case "highland":
        return { terrain: "MOUNTAIN", resource: null };
      case "coastal":
        return index % 2 === 0
          ? {
              terrain: "SHALLOW_WATER",
              biome: null,
              resource: index < 6 ? "FISH" : null,
            }
          : { terrain: "GRASS", resource: null };
      case "barren":
      case "threatened barren":
        return { terrain: "GRASS", resource: null };
    }
  };
  const view: PlayerViewV7 = {
    ...base,
    setup: {
      ...base.setup,
      mapType: kind === "coastal" ? "CONTINENTS" : base.setup.mapType,
    },
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) => {
        const index = ring.findIndex((at) => same(at, tile.at));
        return index < 0 || !tile.explored
          ? tile
          : ({
              ...tile,
              biome: "PLAINS",
              improvement: null,
              site: null,
              road: false,
              ...patch(index),
            } as typeof tile);
      }),
    },
    units: base.units.filter((item) => item.ownerId === base.viewer.id),
  };
  if (kind !== "threatened barren") return view;
  const enemy = base.units.find((item) => item.ownerId !== base.viewer.id);
  if (enemy === undefined) throw new Error("enemy missing");
  const threatAt = ring
    .filter((at) => distance(at, capital.at) === 2)
    .slice(0, 4);
  return {
    ...view,
    units: [
      ...view.units,
      ...threatAt.map((at, offset) => ({
        ...enemy,
        id: (10_000 + offset) as typeof enemy.id,
        at,
      })),
    ],
  };
}

function resourceFixture(): {
  readonly state: GameStateV7;
  readonly fruit: CoordV7;
  readonly fertile: CoordV7;
  readonly forest: CoordV7;
} {
  const base = initialV7(71);
  const city = base.cities.find((item) => item.ownerId === base.humanPlayerId);
  if (city === undefined) throw new Error("city missing");
  const candidates = base.board.tiles.filter(
    (tile) =>
      tile.territoryCityId === city.id &&
      tile.site === null &&
      !base.units.some((item) => same(item.at, tile.at)) &&
      !base.treasureChests.some((chest) => same(chest, tile.at)),
  );
  const [fruit, fertile, forest] = candidates.map((tile) => tile.at);
  if (fruit === undefined || fertile === undefined || forest === undefined)
    throw new Error("territory tiles missing");
  const state = checkedV7({
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        same(tile.at, fruit)
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: "FRUIT" as const,
              improvement: null,
              road: false,
            }
          : same(tile.at, fertile)
            ? {
                ...tile,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
                road: false,
              }
            : same(tile.at, forest)
              ? {
                  ...tile,
                  terrain: "FOREST" as const,
                  resource: null,
                  improvement: null,
                  road: false,
                }
              : tile,
      ),
    },
  });
  return { state: broke(state, 20), fruit, fertile, forest };
}

function withHumanTechs(
  state: GameStateV7,
  researchedTechs: GameStateV7["players"][number]["researchedTechs"],
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, coins: Math.max(player.coins, 20), researchedTechs }
        : player,
    ),
  });
}

function withTile(
  state: GameStateV7,
  at: CoordV7,
  patch: Partial<GameStateV7["board"]["tiles"][number]>,
): GameStateV7 {
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, ...patch } : tile,
      ),
    },
  };
}

function broke(state: GameStateV7, coins = 0): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, coins } : player,
    ),
  });
}

function withSetupMapType(
  view: PlayerViewV7,
  mapType: PlayerViewV7["setup"]["mapType"],
): PlayerViewV7 {
  return { ...view, setup: { ...view.setup, mapType } };
}

function pieces(state: GameStateV7): {
  readonly raider: UnitStateV7;
  readonly guard: UnitStateV7;
} {
  const raider = state.units.find((item) => item.role === "RAIDER");
  const guard = state.units.find((item) => item.role === "GUARD");
  if (raider === undefined || guard === undefined)
    throw new Error("escape fixture missing");
  return { raider, guard };
}

function apply(
  state: GameStateV7,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("actor missing");
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind}: ${result.error.code}`);
  return result;
}

/** Apply, then resolve any level-up reward with its first option. */
function settled(
  state: GameStateV7,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  let result = apply(state, command);
  for (let guard = 0; guard < 8; guard += 1) {
    const head = result.state.pendingChoices[0];
    const reward = head?.candidates[0];
    if (head === undefined || reward === undefined) return result;
    result = apply(result.state, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: head.cityId,
      reachedLevel: head.reachedLevel,
      reward,
    });
  }
  throw new Error("reward guard exhausted");
}

function combat(
  events: readonly DomainEventV7[],
): Extract<DomainEventV7, { kind: "COMBAT_RESOLVED" }> {
  const event = events.find(
    (item): item is Extract<DomainEventV7, { kind: "COMBAT_RESOLVED" }> =>
      item.kind === "COMBAT_RESOLVED",
  );
  if (event === undefined) throw new Error("combat missing");
  return event;
}

function raiderCommands(
  state: GameStateV7,
  raiderId: UnitStateV7["id"],
): readonly CommandV7[] {
  return queryPlayerCommandsV7(state, state.humanPlayerId).filter(
    (command) => "unitId" in command && command.unitId === raiderId,
  );
}

function unit(state: GameStateV7, id: UnitStateV7["id"]): UnitStateV7 {
  const found = state.units.find((item) => item.id === id);
  if (found === undefined) throw new Error("unit missing");
  return found;
}

function replaceUnit(
  state: GameStateV7,
  id: UnitStateV7["id"],
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return {
    ...state,
    units: state.units.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

function withActivation(
  state: GameStateV7,
  id: UnitStateV7["id"],
  patch: Partial<UnitStateV7["activation"]>,
): GameStateV7 {
  return replaceUnit(state, id, {
    activation: { ...unit(state, id).activation, ...patch },
  });
}

function human(state: GameStateV7) {
  const found = state.players.find(
    (player) => player.id === state.humanPlayerId,
  );
  if (found === undefined) throw new Error("human missing");
  return found;
}

function tileAt(state: GameStateV7, at: CoordV7) {
  return state.board.tiles[at.y * state.board.width + at.x];
}

function viewTile(view: PlayerViewV7, at: CoordV7) {
  return view.board.tiles[at.y * view.board.width + at.x];
}

function distance(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV7 | undefined, right: CoordV7): boolean {
  return left !== undefined && left.x === right.x && left.y === right.y;
}
