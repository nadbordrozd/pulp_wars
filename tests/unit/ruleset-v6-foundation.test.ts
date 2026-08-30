import { describe, expect, it } from "vitest";
import {
  BASELINE_TECHNOLOGY_NODES_V6,
  CANDY_BASELINE_TREE_V1,
  COMMAND_KIND_ORDER_V6,
  ECONOMIC_IMPROVEMENT_IDS,
  FACTION_IDS_V6,
  FACTION_TREE_IDS,
  GAME_STATE_SCHEMA_VERSION_6,
  ORIGINAL_BASELINE_TREE,
  REPLAY_FORMAT_VERSION_6,
  RESOURCE_IDS,
  REWARD_IDS_V6,
  RULESET_6,
  RULESET_6_ID,
  SAVE_FORMAT_VERSION_6,
  SPATIAL_ECONOMY_REVISION,
  TECHNOLOGY_IDS,
  TERRAIN_IDS_V6,
  UNIT_ROLE_IDS,
  assertRuleset6Registry,
  compareCommandsV6,
  effectiveRoleRuleV6,
  getFactionTechnologyTreeV6,
  parseCommandEnvelopeV6,
  parseCommandV6,
  parseEventEnvelopeV6,
  parseMatchSetupV6,
  parseReplayFileV6,
  technologyResearchCostV6,
  validateFactionTechnologyTreeV6,
  type FactionTechnologyTreeV6,
  type MatchSetupV6,
} from "../../src/engine/index";

const setup: MatchSetupV6 = {
  rulesetId: RULESET_6_ID,
  seed: 0,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
  mapGenerationRevision: SPATIAL_ECONOMY_REVISION,
};

describe("ruleset-6 deterministic foundation", () => {
  it("publishes the v6 identifiers and every frozen semantic order", () => {
    expect(GAME_STATE_SCHEMA_VERSION_6).toBe(6);
    expect(SAVE_FORMAT_VERSION_6).toBe(6);
    expect(REPLAY_FORMAT_VERSION_6).toBe(6);
    expect(RULESET_6).toMatchObject({
      id: "pulp-wars-poc-6",
      version: 6,
      startingCoins: 5,
    });
    expect(FACTION_IDS_V6).toEqual(["ORIGINAL", "CANDY"]);
    expect(FACTION_TREE_IDS).toEqual([
      "ORIGINAL_BASELINE",
      "CANDY_BASELINE_V1",
    ]);
    expect(TERRAIN_IDS_V6).toEqual(["GRASS", "FOREST", "MOUNTAIN"]);
    expect(RESOURCE_IDS).toEqual([
      "FRUIT",
      "GAME",
      "FERTILE_GROUND",
      "ORE",
      "STONE",
    ]);
    expect(ECONOMIC_IMPROVEMENT_IDS).toHaveLength(11);
    expect(UNIT_ROLE_IDS).toHaveLength(9);
    expect(TECHNOLOGY_IDS).toHaveLength(25);
    expect(REWARD_IDS_V6).toEqual([
      "SURVEY",
      "STOCKPILE",
      "WALLS",
      "MILITIA",
      "EXPAND",
      "BOOM",
      "JUGGERNAUT",
      "TREASURY",
    ]);
    expect(COMMAND_KIND_ORDER_V6).toHaveLength(32);
    for (const value of [
      FACTION_IDS_V6,
      FACTION_TREE_IDS,
      TERRAIN_IDS_V6,
      RESOURCE_IDS,
      ECONOMIC_IMPROVEMENT_IDS,
      UNIT_ROLE_IDS,
      TECHNOLOGY_IDS,
      REWARD_IDS_V6,
      COMMAND_KIND_ORDER_V6,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it("registers explicit immutable Original and Candy baseline trees", () => {
    expect(() => assertRuleset6Registry()).not.toThrow();
    expect(ORIGINAL_BASELINE_TREE.id).toBe("ORIGINAL_BASELINE");
    expect(CANDY_BASELINE_TREE_V1.id).toBe("CANDY_BASELINE_V1");
    expect(ORIGINAL_BASELINE_TREE).not.toBe(CANDY_BASELINE_TREE_V1);
    expect(ORIGINAL_BASELINE_TREE.nodes).toBe(BASELINE_TECHNOLOGY_NODES_V6);
    expect(CANDY_BASELINE_TREE_V1.nodes).toBe(BASELINE_TECHNOLOGY_NODES_V6);
    expect(ORIGINAL_BASELINE_TREE.startingTechIds).toEqual(["GATHERING"]);
    expect(CANDY_BASELINE_TREE_V1.startingTechIds).toEqual(["GATHERING"]);
    expect(Object.isFrozen(ORIGINAL_BASELINE_TREE.roleRules)).toBe(true);
    expect(Object.isFrozen(CANDY_BASELINE_TREE_V1.roleRules)).toBe(true);
    expect(getFactionTechnologyTreeV6("MISSING")).toBeUndefined();
    expect(
      validateFactionTechnologyTreeV6({
        ...CANDY_BASELINE_TREE_V1,
        nodes: CANDY_BASELINE_TREE_V1.nodes.slice(0, -1),
      }),
    ).toBe(false);
    const incompleteRoles: Record<string, unknown> = {
      ...CANDY_BASELINE_TREE_V1.roleRules,
    };
    Reflect.deleteProperty(incompleteRoles, "JUGGERNAUT");
    expect(
      validateFactionTechnologyTreeV6({
        ...CANDY_BASELINE_TREE_V1,
        roleRules: incompleteRoles,
      } as unknown as FactionTechnologyTreeV6),
    ).toBe(false);
    expect(effectiveRoleRuleV6("ORIGINAL", "RAIDER")).toMatchObject({
      label: "Raider",
      cost: 4,
      attack2: 5,
      defense2: 3,
      move: 2,
    });
    expect(effectiveRoleRuleV6("CANDY", "RAIDER")).toMatchObject({
      label: "Donut",
      cost: 3,
      attack2: 0,
      defense2: 2,
      move: 1,
      range: 0,
    });
    expect(effectiveRoleRuleV6("CANDY", "JUGGERNAUT")).toMatchObject({
      label: "Sugar Titan",
      maxHp: 40,
      attack2: 8,
      defense2: 8,
    });
  });

  it("uses exact city-scaled research costs", () => {
    expect(
      [1, 2, 3].map((tier) => technologyResearchCostV6(tier as 1 | 2 | 3, 1)),
    ).toEqual([5, 7, 9]);
    expect(
      [1, 2, 3].map((tier) => technologyResearchCostV6(tier as 1 | 2 | 3, 4)),
    ).toEqual([8, 13, 18]);
    expect(() => technologyResearchCostV6(1, 0)).toThrow(RangeError);
  });

  it("accepts only exact marked non-scenario v6 setups", () => {
    expect(parseMatchSetupV6(setup)).toEqual(setup);
    expect(
      parseMatchSetupV6({
        ...setup,
        mapGenerationRevision: "REDUCED_VILLAGES",
      }),
    ).toBeNull();
    expect(
      parseMatchSetupV6({ ...setup, mapGenerationRevision: undefined }),
    ).toBeNull();
    const unmarked: Record<string, unknown> = { ...setup };
    Reflect.deleteProperty(unmarked, "mapGenerationRevision");
    expect(parseMatchSetupV6(unmarked)).toBeNull();
    expect(parseMatchSetupV6({ ...setup, scenario: "DEMO" })).toBeNull();
    expect(
      parseMatchSetupV6({ ...setup, rulesetId: "pulp-wars-poc-5" }),
    ).toBeNull();
    const sparseFactions: unknown[] = ["ORIGINAL", "CANDY"];
    Reflect.deleteProperty(sparseFactions, "1");
    expect(
      parseMatchSetupV6({ ...setup, factions: sparseFactions }),
    ).toBeNull();
  });

  it("accepts exact Coin-facing v6 event envelopes and rejects v5/Stars fields", () => {
    expect(
      parseEventEnvelopeV6({
        format: "pulp-wars-events",
        version: 6,
        commandIndex: 1,
        events: [
          { kind: "TURN_STARTED", playerId: 1, coins: 7 },
          {
            kind: "CITY_REWARD_QUEUED",
            cityId: 3,
            reachedLevel: 2,
            candidates: ["SURVEY", "STOCKPILE"],
          },
        ],
      }),
    ).toMatchObject({ ok: true, value: { version: 6 } });
    expect(
      parseEventEnvelopeV6({
        format: "pulp-wars-events",
        version: 5,
        commandIndex: 1,
        events: [],
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseEventEnvelopeV6({
        format: "pulp-wars-events",
        version: 6,
        commandIndex: 1,
        events: [{ kind: "TURN_STARTED", playerId: 1, stars: 7 }],
      }),
    ).toMatchObject({ ok: false });
  });

  it("parses only exact v6 command shapes and canonicalizes their order", () => {
    expect(
      parseCommandEnvelopeV6({
        format: "pulp-wars-command",
        version: 6,
        command: { kind: "TRAIN", cityId: 1, role: "HEAVY" },
      }),
    ).toMatchObject({ ok: true, value: { version: 6 } });
    expect(
      parseCommandV6({ kind: "TRAIN", cityId: 1, unit: "CATAPULT" }).ok,
    ).toBe(false);
    expect(parseCommandV6({ kind: "HUNT_ANIMAL", at: { x: 1, y: 2 } }).ok).toBe(
      false,
    );
    expect(
      parseCommandV6({ kind: "ESCAPE_MOVE", unitId: 1, path: [] }).ok,
    ).toBe(false);
    const commands = [
      { kind: "END_TURN" } as const,
      { kind: "RESEARCH", tech: "MINING" } as const,
      { kind: "RESEARCH", tech: "FARMING" } as const,
      { kind: "BUILD_FARM", at: { x: 1, y: 2 } } as const,
      { kind: "BUILD_FARM", at: { x: 2, y: 1 } } as const,
    ];
    expect([...commands].sort(compareCommandsV6)).toEqual([
      commands[2],
      commands[1],
      commands[4],
      commands[3],
      commands[0],
    ]);
  });

  it("classifies every recognized pre-v6 replay as incompatible", () => {
    for (const version of [1, 2, 3, 4, 5]) {
      expect(
        parseReplayFileV6({ format: "pulp-wars-replay", version }),
      ).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
    }
    expect(
      parseReplayFileV6({
        format: "pulp-wars-replay",
        version: 6,
        setup,
        commands: [],
        checkpoints: [],
      }),
    ).toMatchObject({ kind: "VALID", replay: { version: 6 } });
  });
});
