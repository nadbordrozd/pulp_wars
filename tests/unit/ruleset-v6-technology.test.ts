import { describe, expect, it } from "vitest";
import {
  BASELINE_TECHNOLOGY_NODES_V6,
  BASIC_ECONOMIC_ACTIONS_V6,
  CANDY_BASELINE_TREE_V1,
  COMMAND_KIND_ORDER_V6,
  ORIGINAL_BASELINE_TREE,
  RULESET_6_ID,
  SPATIAL_ECONOMIC_ACTIONS_V6,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  appendReplayCommandV6,
  applyCommandV6,
  canonicalHash,
  createInitialMapStateV6,
  createReplayV6,
  parseEventV6,
  parseGameStateV6,
  queryPlayerCommandsV6,
  queryTechnologyCapabilitiesV6,
  queryTechnologyTreeV6,
  viewForV6,
  type CommandV6,
  type FactionIdV6,
  type GameStateV6,
  type MatchSetupV6,
  type TechnologyId,
  type TileStateV6,
} from "../../src/engine/index";
import { createSaveEnvelopeV6, parseSaveV6 } from "../../src/persistence/index";

const originalSetup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 19,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

describe("ruleset-6 technology", () => {
  it("publishes the exact five-branch 25-node graph and typed unlock table", () => {
    expect(
      BASELINE_TECHNOLOGY_NODES_V6.map((node) => ({
        id: node.id,
        branch: node.branch,
        tier: node.tier,
        prerequisites: node.prerequisites,
        unlocks: node.unlocks,
      })),
    ).toEqual(EXACT_TECHNOLOGY_TABLE);
    expect(BASELINE_TECHNOLOGY_NODES_V6.map((node) => node.id)).toEqual(
      TECHNOLOGY_IDS,
    );
    expect(Object.isFrozen(BASELINE_TECHNOLOGY_NODES_V6)).toBe(true);
    expect(
      BASELINE_TECHNOLOGY_NODES_V6.every(
        (node) => Object.isFrozen(node) && Object.isFrozen(node.unlocks),
      ),
    ).toBe(true);
    expect(canonicalHash(ORIGINAL_BASELINE_TREE.nodes)).toBe(
      canonicalHash(CANDY_BASELINE_TREE_V1.nodes),
    );
  });

  it.each([
    ["ORIGINAL", "ORIGINAL_BASELINE"],
    ["CANDY", "CANDY_BASELINE_V1"],
  ] as const)(
    "researches every node through the explicit %s registry without PRNG use",
    (faction, treeId) => {
      let state = withCoins(initialState(faction), 1_000);
      const randomBefore = state.random;
      let spent = 0;
      for (const tech of TECHNOLOGY_IDS.slice(1)) {
        const before = player(state).coins;
        const result = applyCommandV6(state, state.humanPlayerId, {
          kind: "RESEARCH",
          tech,
        });
        expect(result.accepted, tech).toBe(true);
        if (!result.accepted) throw new Error(result.error.code);
        expect(result.events).toEqual([
          {
            kind: "TECH_RESEARCHED",
            playerId: state.humanPlayerId,
            tech,
            cost:
              result.events[0]?.kind === "TECH_RESEARCHED"
                ? result.events[0].cost
                : -1,
          },
        ]);
        expect(result.events.every((event) => parseEventV6(event).ok)).toBe(
          true,
        );
        expect(result.state.commandIndex).toBe(state.commandIndex + 1);
        expect(result.state.random).toEqual(randomBefore);
        spent += before - player(result.state).coins;
        state = result.state;
      }
      expect(player(state)).toMatchObject({
        faction,
        factionTreeId: treeId,
        researchedTechs: TECHNOLOGY_IDS,
        coins: 1_000 - 180,
      });
      expect(spent).toBe(180);
      expect(parseGameStateV6(state)).toEqual(state);
    },
  );

  it("uses current empire size for one- and multi-city public and reducer costs", () => {
    let oneCity = withCoins(initialState("ORIGINAL"), 20);
    expect(
      queryTechnologyTreeV6(
        viewForV6(oneCity, oneCity.humanPlayerId),
      ).nodes.find((node) => node.id === "HUNTING"),
    ).toMatchObject({ cost: 5, state: "AVAILABLE", affordable: true });

    const secondCity = must(
      oneCity.cities.find((city) => city.ownerId !== oneCity.humanPlayerId),
    );
    oneCity = checked({
      ...oneCity,
      cities: oneCity.cities.map((city) =>
        city.id === secondCity.id
          ? { ...city, ownerId: oneCity.humanPlayerId }
          : city,
      ),
      players: oneCity.players.map((candidate) =>
        candidate.id === oneCity.humanPlayerId
          ? {
              ...candidate,
              explored: sortedCoords([...candidate.explored, secondCity.at]),
            }
          : candidate,
      ),
    });
    expect(
      queryTechnologyTreeV6(
        viewForV6(oneCity, oneCity.humanPlayerId),
      ).nodes.find((node) => node.id === "HUNTING"),
    ).toMatchObject({ cost: 6, state: "AVAILABLE", affordable: true });
    const result = applyCommandV6(oneCity, oneCity.humanPlayerId, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.events).toEqual([
      {
        kind: "TECH_RESEARCHED",
        playerId: oneCity.humanPlayerId,
        tech: "HUNTING",
        cost: 6,
      },
    ]);
    expect(player(result.state).coins).toBe(14);
  });

  it("enforces common and research-specific rejection order atomically", () => {
    const actorState = withCoins(initialState("ORIGINAL"), 0);
    const actor = actorState.humanPlayerId;
    const unknown = {
      kind: "RESEARCH",
      tech: "MISSING",
    } as unknown as CommandV6;
    const ended = checked({
      ...actorState,
      outcome: { kind: "VICTORY" as const, winnerId: actor },
    });
    expectRejected(applyCommandV6(ended, actor, unknown), ended, "MATCH_ENDED");
    expectRejected(
      applyCommandV6(actorState, actor, unknown),
      actorState,
      "TECH_NOT_FOUND",
    );

    const overflow = checked({
      ...actorState,
      commandIndex: Number.MAX_SAFE_INTEGER,
    });
    expectRejected(
      applyCommandV6(overflow, actor, {
        kind: "RESEARCH",
        tech: "GATHERING",
      }),
      overflow,
      "TECH_ALREADY_RESEARCHED",
    );
    expectRejected(
      applyCommandV6(overflow, actor, { kind: "RESEARCH", tech: "MILLING" }),
      overflow,
      "TECH_PREREQUISITE_MISSING",
    );
    expectRejected(
      applyCommandV6(overflow, actor, { kind: "RESEARCH", tech: "HUNTING" }),
      overflow,
      "INSUFFICIENT_COINS",
    );
    const richOverflow = withCoins(overflow, 20);
    expectRejected(
      applyCommandV6(richOverflow, actor, {
        kind: "RESEARCH",
        tech: "HUNTING",
      }),
      richOverflow,
      "INTEGER_OVERFLOW",
    );
  });

  it("returns owned, available, and blocked public nodes and exact research commands", () => {
    const state = initialState("ORIGINAL");
    const view = viewForV6(state, state.humanPlayerId);
    const tree = queryTechnologyTreeV6(view);
    expect(tree).toMatchObject({
      id: "ORIGINAL_BASELINE",
      faction: "ORIGINAL",
      ownedCityCount: 1,
    });
    expect(tree.nodes).toHaveLength(25);
    expect(tree.nodes.find((node) => node.id === "GATHERING")).toMatchObject({
      state: "OWNED",
      cost: 5,
      affordable: false,
    });
    expect(tree.nodes.find((node) => node.id === "FARMING")).toMatchObject({
      state: "AVAILABLE",
      missingPrerequisites: [],
      cost: 7,
      affordable: false,
    });
    expect(tree.nodes.find((node) => node.id === "MILLING")).toMatchObject({
      state: "BLOCKED",
      missingPrerequisites: ["FARMING"],
      cost: 9,
    });
    expect(
      queryPlayerCommandsV6(view).filter(
        (command) => command.kind === "RESEARCH",
      ),
    ).toEqual([
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "RESEARCH", tech: "SURVEYING" },
      { kind: "RESEARCH", tech: "SCOUTING" },
      { kind: "RESEARCH", tech: "DRILL" },
    ]);
  });

  it("resolves Candy unit slots without changing graph, prerequisites, or costs", () => {
    const original = queryTechnologyTreeV6(
      viewForV6(
        initialState("ORIGINAL"),
        initialState("ORIGINAL").humanPlayerId,
      ),
    );
    const candyState = initialState("CANDY");
    const candy = queryTechnologyTreeV6(
      viewForV6(candyState, candyState.humanPlayerId),
    );
    expect(candy.nodes.map(publicGraphNode)).toEqual(
      original.nodes.map(publicGraphNode),
    );
    expect(
      candy.nodes.find((node) => node.id === "RAIDING")?.unlockedRoleRules,
    ).toEqual([
      expect.objectContaining({
        role: "RAIDER",
        label: "Donut",
        cost: 3,
        attack2: 0,
        abilities: expect.arrayContaining(["KAMIKAZE_ROLL", "CANDIFY"]),
      }),
    ]);
    expect(
      original.nodes.find((node) => node.id === "RAIDING")?.unlockedRoleRules,
    ).toEqual([
      expect.objectContaining({
        role: "RAIDER",
        label: "Raider",
        cost: 4,
        attack2: 5,
        abilities: expect.arrayContaining(["CHARGE"]),
      }),
    ]);
    expect(candy.roleBindings.BREACHER.label).toBe("Candy Crusher");
    expect(candy.roleBindings.JUGGERNAUT.label).toBe("Sugar Titan");
  });

  it("shows Game before Hunting while Hunting alone gates Hunt Game", () => {
    let state = withCoins(initialState("ORIGINAL"), 30);
    const city = must(
      state.cities.find(
        (candidate) => candidate.ownerId === state.humanPlayerId,
      ),
    );
    const targets = state.board.tiles.filter(
      (tile) => tile.territoryCityId === city.id && tile.site === null,
    );
    const fruitAt = must(targets[0]).at;
    const gameAt = must(targets[1]).at;
    const oreAt = must(targets[2]).at;
    state = replaceTiles(state, [
      [fruitAt, { terrain: "GRASS", resource: "FRUIT", improvement: null }],
      [gameAt, { terrain: "FOREST", resource: "GAME", improvement: null }],
      [oreAt, { terrain: "MOUNTAIN", resource: "ORE", improvement: null }],
    ]);
    const before = viewForV6(state, state.humanPlayerId);
    expect(publicTile(before, fruitAt).resource).toBe("FRUIT");
    expect(publicTile(before, gameAt).resource).toBe("GAME");
    expect(publicTile(before, oreAt).resource).toBe("UNKNOWN_RESOURCE");
    expect(queryPlayerCommandsV6(before)).not.toContainEqual({
      kind: "HUNT_GAME",
      at: gameAt,
    });
    expectRejected(
      applyCommandV6(state, state.humanPlayerId, {
        kind: "HUNT_GAME",
        at: gameAt,
      }),
      state,
      "TECH_REQUIRED",
    );

    const hunted = applyCommandV6(state, state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(hunted.accepted).toBe(true);
    if (!hunted.accepted) return;
    const huntingView = viewForV6(hunted.state, hunted.state.humanPlayerId);
    expect(publicTile(huntingView, gameAt).resource).toBe("GAME");
    expect(publicTile(huntingView, oreAt).resource).toBe("UNKNOWN_RESOURCE");
    expect(queryPlayerCommandsV6(huntingView)).toContainEqual({
      kind: "HUNT_GAME",
      at: gameAt,
    });

    const surveyed = applyCommandV6(hunted.state, hunted.state.humanPlayerId, {
      kind: "RESEARCH",
      tech: "SURVEYING",
    });
    expect(surveyed.accepted).toBe(true);
    if (!surveyed.accepted) return;
    expect(
      publicTile(viewForV6(surveyed.state, surveyed.state.humanPlayerId), oreAt)
        .resource,
    ).toBe("ORE");
    expect(surveyed.events).toHaveLength(1);
    expect(player(surveyed.state).explored).toEqual(player(state).explored);
  });

  it("binds every implemented economy gate and every downstream typed capability", () => {
    const commandTechnology = new Map<string, TechnologyId>(
      BASELINE_TECHNOLOGY_NODES_V6.flatMap((node) =>
        node.unlocks.flatMap((unlock) =>
          unlock.kind === "COMMAND"
            ? ([[unlock.command, node.id]] as const)
            : [],
        ),
      ),
    );
    for (const rule of [
      ...Object.values(BASIC_ECONOMIC_ACTIONS_V6),
      ...Object.values(SPATIAL_ECONOMIC_ACTIONS_V6),
    ]) {
      expect(commandTechnology.get(rule.command), rule.command).toBe(
        rule.technology,
      );
    }

    const state = withTechs(withCoins(initialState("ORIGINAL"), 1_000), [
      ...TECHNOLOGY_IDS,
    ]);
    const capabilities = queryTechnologyCapabilitiesV6(
      viewForV6(state, state.humanPlayerId),
    );
    expect(capabilities).toMatchObject({
      treeId: "ORIGINAL_BASELINE",
      resourceReveals: ["FRUIT", "FERTILE_GROUND", "ORE", "STONE"],
      connectedFarmVisuals: true,
      forestMovementFreedomRoles: ["SCOUT", "MARKSMAN"],
      mountainMovement: true,
      highGroundVisionRadiusBonus: 1,
      roleSightRadius: { SCOUT: 2 },
      roadMovement: {
        ordinaryStepCost2: 2,
        connectedOrthogonalStepCost2: 1,
      },
      marketCapitalRoadBonusCoins: 1,
      ignoreHostileZocRoles: ["SCOUT", "RAIDER"],
      friendlyCityFortification: {
        roles: ["FIGHTER", "GUARD"],
        defenseNumerator: 2,
        defenseDenominator: 1,
      },
      medicHealAmount: 6,
      friendlyIdleRecoveryAmount: 6,
    });
    expect(capabilities.commands).toEqual(
      COMMAND_KIND_ORDER_V6.filter((kind) => commandTechnology.has(kind)),
    );
    expect(capabilities.trainableRoles).toEqual([
      "SCOUT",
      "MARKSMAN",
      "GUARD",
      "RAIDER",
      "MEDIC",
      "HEAVY",
      "BREACHER",
    ]);
    expect(
      capabilities.economicFormulas.map((effect) => effect.improvement),
    ).toEqual([
      "WINDMILL",
      "WORKSHOP",
      "GRAND_WORKS",
      "SAWMILL",
      "FORGE",
      "STONEWORKS",
      "MARKET",
    ]);
    expect(Object.keys(capabilities.roleBindings)).toHaveLength(9);
  });

  it("round-trips accepted research through replay, save, and canonical hashes", () => {
    const state = initialState("ORIGINAL");
    const command = { kind: "RESEARCH", tech: "HUNTING" } as const;
    const applied = applyCommandV6(state, state.humanPlayerId, command);
    expect(applied.accepted).toBe(true);
    if (!applied.accepted) return;
    const replay = appendReplayCommandV6(
      createReplayV6(originalSetup),
      command,
      applied.state,
    );
    expect(replay.checkpoints).toEqual([
      { index: 1, stateHash: canonicalHash(applied.state) },
    ]);
    const save = createSaveEnvelopeV6(
      { state: applied.state, replay },
      "2026-08-31T20:00:00.000Z",
    );
    expect(parseSaveV6(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    expect(
      parseSaveV6(
        JSON.stringify({
          ...save,
          state: {
            ...save.state,
            players: save.state.players.map((candidate) =>
              candidate.id === save.state.humanPlayerId
                ? { ...candidate, researchedTechs: ["GATHERING"] }
                : candidate,
            ),
          },
        }),
      ),
    ).toMatchObject({ kind: "CORRUPT" });
  });
});

const EXACT_TECHNOLOGY_TABLE = [
  node(
    "GATHERING",
    "SETTLEMENT",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["FRUIT", "FERTILE_GROUND"] },
      { kind: "COMMAND", command: "HARVEST_FRUIT" },
    ],
  ),
  node(
    "FARMING",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "COMMAND", command: "BUILD_FARM" },
      { kind: "CONNECTED_FARM_VISUALS" },
    ],
  ),
  node(
    "MILLING",
    "SETTLEMENT",
    3,
    ["FARMING"],
    [
      { kind: "COMMAND", command: "BUILD_WINDMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WINDMILL",
        formula: "CONNECTED_ORTHOGONAL_CLUSTER",
      },
    ],
  ),
  node(
    "CRAFT",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
    ],
  ),
  node(
    "GRAND_WORKS",
    "SETTLEMENT",
    3,
    ["CRAFT"],
    [
      { kind: "COMMAND", command: "BUILD_GRAND_WORKS" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "GRAND_WORKS",
        formula: "DISTINCT_PROCESSOR_TYPES",
      },
      { kind: "COMMAND", command: "REDEVELOP" },
    ],
  ),
  node("HUNTING", "WILDS", 1, [], [{ kind: "COMMAND", command: "HUNT_GAME" }]),
  node(
    "FORESTRY",
    "WILDS",
    2,
    ["HUNTING"],
    [
      { kind: "COMMAND", command: "BUILD_LUMBER_CAMP" },
      { kind: "COMMAND", command: "CLEAR_FOREST" },
    ],
  ),
  node(
    "SAWMILLING",
    "WILDS",
    3,
    ["FORESTRY"],
    [
      { kind: "COMMAND", command: "BUILD_SAWMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "SAWMILL",
        formula: "CONNECTED_ORTHOGONAL_CLUSTER",
      },
    ],
  ),
  node(
    "MARKSMANSHIP",
    "WILDS",
    2,
    ["HUNTING"],
    [{ kind: "UNIT_ROLE", role: "MARKSMAN" }],
  ),
  node(
    "FIELDCRAFT",
    "WILDS",
    3,
    ["MARKSMANSHIP"],
    [
      { kind: "FOREST_MOVEMENT_FREEDOM", roles: ["SCOUT", "MARKSMAN"] },
      { kind: "COMMAND", command: "REPLANT_FOREST" },
    ],
  ),
  node(
    "SURVEYING",
    "INDUSTRY",
    1,
    [],
    [
      { kind: "MOUNTAIN_MOVEMENT" },
      { kind: "RESOURCE_REVEAL", resources: ["ORE", "STONE"] },
      { kind: "HIGH_GROUND_VISION", radiusBonus: 1 },
    ],
  ),
  node(
    "MINING",
    "INDUSTRY",
    2,
    ["SURVEYING"],
    [{ kind: "COMMAND", command: "BUILD_MINE" }],
  ),
  node(
    "METALLURGY",
    "INDUSTRY",
    3,
    ["MINING"],
    [
      { kind: "COMMAND", command: "BUILD_FORGE" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "FORGE",
        formula: "ADJACENT_MINES",
      },
      { kind: "UNIT_ROLE", role: "HEAVY" },
    ],
  ),
  node(
    "QUARRYING",
    "INDUSTRY",
    2,
    ["SURVEYING"],
    [{ kind: "COMMAND", command: "BUILD_QUARRY" }],
  ),
  node(
    "MASONRY",
    "INDUSTRY",
    3,
    ["QUARRYING"],
    [
      { kind: "COMMAND", command: "BUILD_STONEWORKS" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "STONEWORKS",
        formula: "ADJACENT_QUARRIES_AND_OPPOSITE_PAIRS",
      },
    ],
  ),
  node(
    "SCOUTING",
    "MOBILITY",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "SCOUT" },
      { kind: "ROLE_SIGHT", role: "SCOUT", radius: 2 },
    ],
  ),
  node(
    "ROADS",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [
      { kind: "COMMAND", command: "BUILD_ROAD" },
      {
        kind: "ROAD_MOVEMENT",
        ordinaryStepCost2: 2,
        connectedOrthogonalStepCost2: 1,
      },
    ],
  ),
  node(
    "COMMERCE",
    "MOBILITY",
    3,
    ["ROADS"],
    [
      { kind: "COMMAND", command: "BUILD_MARKET" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "MARKET",
        formula: "DISTINCT_ECONOMIC_FAMILIES",
      },
      { kind: "MARKET_CAPITAL_ROAD_BONUS", coins: 1 },
    ],
  ),
  node(
    "RAIDING",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [{ kind: "UNIT_ROLE", role: "RAIDER" }],
  ),
  node(
    "MANEUVER",
    "MOBILITY",
    3,
    ["RAIDING"],
    [{ kind: "IGNORE_HOSTILE_ZOC", roles: ["SCOUT", "RAIDER"] }],
  ),
  node("DRILL", "WARFARE", 1, [], [{ kind: "UNIT_ROLE", role: "GUARD" }]),
  node(
    "FORTIFICATION",
    "WARFARE",
    2,
    ["DRILL"],
    [
      {
        kind: "FRIENDLY_CITY_FORTIFICATION",
        roles: ["FIGHTER", "GUARD"],
        defenseNumerator: 2,
        defenseDenominator: 1,
      },
    ],
  ),
  node(
    "EXPLOSIVES",
    "WARFARE",
    3,
    ["FORTIFICATION"],
    [{ kind: "UNIT_ROLE", role: "BREACHER" }],
  ),
  node(
    "MEDICINE",
    "WARFARE",
    2,
    ["DRILL"],
    [
      { kind: "UNIT_ROLE", role: "MEDIC" },
      { kind: "MEDIC_HEAL", amount: 4 },
    ],
  ),
  node(
    "RECOVERY",
    "WARFARE",
    3,
    ["MEDICINE"],
    [
      { kind: "MEDIC_HEAL", amount: 6 },
      { kind: "FRIENDLY_IDLE_RECOVERY", amount: 6 },
    ],
  ),
] as const;

function node(
  id: string,
  branch: string,
  tier: number,
  prerequisites: readonly string[],
  unlocks: readonly object[],
): object {
  return { id, branch, tier, prerequisites, unlocks };
}

function publicGraphNode(
  nodeView: ReturnType<typeof queryTechnologyTreeV6>["nodes"][number],
): object {
  return {
    id: nodeView.id,
    branch: nodeView.branch,
    tier: nodeView.tier,
    prerequisites: nodeView.prerequisites,
    missingPrerequisites: nodeView.missingPrerequisites,
    state: nodeView.state,
    cost: nodeView.cost,
    affordable: nodeView.affordable,
    effects: nodeView.effects,
  };
}

function initialState(faction: FactionIdV6): GameStateV6 {
  const setup: MatchSetupV6 = {
    ...originalSetup,
    factions:
      faction === "ORIGINAL" ? ["ORIGINAL", "CANDY"] : ["CANDY", "ORIGINAL"],
  };
  const created = createInitialMapStateV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function player(state: GameStateV6): GameStateV6["players"][number] {
  return must(
    state.players.find((candidate) => candidate.id === state.humanPlayerId),
  );
}

function withCoins(state: GameStateV6, coins: number): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === state.humanPlayerId
        ? { ...candidate, coins }
        : candidate,
    ),
  });
}

function withTechs(
  state: GameStateV6,
  researchedTechs: readonly TechnologyId[],
): GameStateV6 {
  return checked({
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === state.humanPlayerId
        ? { ...candidate, researchedTechs }
        : candidate,
    ),
  });
}

function replaceTiles(
  state: GameStateV6,
  replacements: readonly (readonly [TileStateV6["at"], Partial<TileStateV6>])[],
): GameStateV6 {
  return checked({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const replacement = replacements.find(([at]) => sameCoord(at, tile.at));
        return replacement === undefined
          ? tile
          : { ...tile, ...replacement[1], at: tile.at };
      }),
    },
  });
}

function publicTile(
  view: ReturnType<typeof viewForV6>,
  at: TileStateV6["at"],
): Extract<
  ReturnType<typeof viewForV6>["board"]["tiles"][number],
  { explored: true }
> {
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  if (tile?.explored !== true) throw new Error("expected explored tile");
  return tile;
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
  expect(result.state.commandIndex).toBe(state.commandIndex);
  expect(result.state.random).toBe(state.random);
}

function checked(state: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(state);
  if (parsed === null) throw new Error("invalid test state");
  return parsed;
}

function sortedCoords(
  values: readonly TileStateV6["at"][],
): readonly TileStateV6["at"][] {
  return [
    ...new Map(values.map((at) => [`${at.y},${at.x}`, at])).values(),
  ].sort((left, right) => left.y - right.y || left.x - right.x);
}

function sameCoord(left: TileStateV6["at"], right: TileStateV6["at"]): boolean {
  return left.x === right.x && left.y === right.y;
}

function must<T>(value: T | undefined, message = "fixture value missing"): T {
  if (value === undefined) throw new Error(message);
  return value;
}
