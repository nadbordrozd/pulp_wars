import { describe, expect, it } from "vitest";
import {
  ORIGINAL_BASELINE_V5_NODES,
  ORIGINAL_BASELINE_V5_TREE,
  ORIGINAL_ROLE_RULES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  appendReplayCommandV7,
  assertRuleset7Registry,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  queryPlayerCommandsV7,
  queryTechnologyCapabilitiesV7,
  queryTechnologyTreeV7,
  runReplayV7,
  technologyResearchCostV7,
} from "../../src/engine/index";
import { checkedV7, initialV7, richV7, setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 technology", () => {
  it("registers the exact ordered 23-node five-branch graph and start", () => {
    assertRuleset7Registry();
    expect(ORIGINAL_BASELINE_V5_NODES.map((node) => node.id)).toEqual(
      TECHNOLOGY_IDS_V7,
    );
    expect(ORIGINAL_BASELINE_V5_TREE).toMatchObject({
      id: "ORIGINAL_BASELINE_V5",
      faction: "ORIGINAL",
      startingTechIds: ["GATHERING"],
    });
    expect(ORIGINAL_BASELINE_V5_NODES.map((node) => node.branch)).toEqual([
      ...Array(5).fill("SETTLEMENT"),
      ...Array(5).fill("WILDS"),
      ...Array(5).fill("MOBILITY"),
      ...Array(5).fill("INDUSTRY"),
      ...Array(3).fill("NAVAL"),
    ]);
    expect(
      ORIGINAL_BASELINE_V5_NODES.filter((node) => node.tier === 1),
    ).toHaveLength(5);
    expect(
      ORIGINAL_BASELINE_V5_NODES.filter((node) => node.tier === 2),
    ).toHaveLength(9);
    expect(
      ORIGINAL_BASELINE_V5_NODES.filter((node) => node.tier === 3),
    ).toHaveLength(9);
    expect(
      initialV7().players.every(
        (player) =>
          player.researchedTechs.length === 1 &&
          player.researchedTechs[0] === "GATHERING",
      ),
    ).toBe(true);
    expect(Object.isFrozen(ORIGINAL_BASELINE_V5_NODES)).toBe(true);
  });

  it("uses the exact city-scaled formula without unsafe arithmetic", () => {
    expect(
      [1, 2, 3].map((tier) => technologyResearchCostV7(tier as 1 | 2 | 3, 1)),
    ).toEqual([5, 7, 9]);
    expect(
      [1, 2, 3].map((tier) => technologyResearchCostV7(tier as 1 | 2 | 3, 4)),
    ).toEqual([8, 13, 18]);
    expect(() => technologyResearchCostV7(3, Number.MAX_SAFE_INTEGER)).toThrow(
      "INTEGER_OVERFLOW",
    );
  });

  it("binds every Original role to its exact immutable v7 roster values", () => {
    expect(
      UNIT_ROLE_IDS_V7.map((id) => {
        const rule = ORIGINAL_ROLE_RULES_V7[id];
        return [
          id,
          rule.cost,
          rule.maxHp,
          rule.attack2,
          rule.defense2,
          rule.move,
          rule.range,
          rule.minimumRange,
          rule.technology,
          rule.mayUsePrimaryActionAfterMove,
        ];
      }),
    ).toEqual([
      ["FIGHTER", 2, 10, 4, 4, 1, 1, 1, null, true],
      ["RAIDER", 4, 10, 4, 2, 2, 1, 1, "SCOUTING", true],
      ["MARKSMAN", 3, 10, 4, 2, 1, 2, 1, "MARKSMANSHIP", true],
      ["GUARD", 3, 15, 3, 6, 1, 1, 1, "DRILL", false],
      ["CAPTAIN", 5, 10, 2, 2, 1, 1, 1, "ADMINISTRATION", true],
      ["CATAPULT", 8, 10, 7, 1, 1, 3, 2, "SAWMILLING", false],
      ["KNIGHT", 9, 10, 6, 2, 3, 1, 1, "CHIVALRY", true],
      ["JUGGERNAUT", null, 40, 8, 8, 1, 1, 1, null, true],
      ["PATROL_BOAT", 5, 10, 4, 4, 3, 1, 1, "SHORECRAFT", true],
      ["BATTLESHIP", 16, 25, 12, 8, 2, 3, 1, "NAVAL_ENGINEERING", false],
    ]);
    expect(Object.isFrozen(ORIGINAL_ROLE_RULES_V7)).toBe(true);
  });

  it("researches the entire graph for 164 coins without PRNG use", () => {
    let state = richV7(
      checkedV7({
        ...initialV7(),
        setup: { ...initialV7().setup, mapType: "CONTINENTS" },
      }),
      1_000,
    );
    const random = state.random;
    for (const tech of TECHNOLOGY_IDS_V7.slice(1)) {
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "RESEARCH",
        tech,
      });
      expect(result.accepted, tech).toBe(true);
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events[0]).toMatchObject({
        kind: "TECH_RESEARCHED",
        playerId: state.humanPlayerId,
        tech,
      });
      expect(result.events.slice(1).map((event) => event.kind)).toEqual(
        tech === "ROADS" ? ["SEA_NETWORK_CHANGED"] : [],
      );
      expect(result.events.every((event) => parseEventV7(event).ok)).toBe(true);
      expect(result.state.random).toEqual(random);
      state = result.state;
    }
    expect(state.players[0]).toMatchObject({
      coins: 836,
      researchedTechs: TECHNOLOGY_IDS_V7,
    });
  });

  it("publishes available tree state and typed dual-use capabilities", () => {
    const state = richV7(initialV7(), 20);
    const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
    expect(tree.nodes.find((node) => node.id === "GATHERING")).toMatchObject({
      state: "OWNED",
      cost: 5,
    });
    expect(tree.nodes.find((node) => node.id === "FARMING")).toMatchObject({
      state: "AVAILABLE",
      cost: 7,
      affordable: true,
    });
    expect(tree.nodes.find((node) => node.id === "MILLING")).toMatchObject({
      state: "BLOCKED",
      missingPrerequisites: ["FARMING"],
    });
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).filter(
        (command) => command.kind === "RESEARCH",
      ),
    ).toEqual([
      { kind: "RESEARCH", tech: "FARMING" },
      { kind: "RESEARCH", tech: "ADMINISTRATION" },
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "RESEARCH", tech: "SCOUTING" },
      { kind: "RESEARCH", tech: "DRILL" },
    ]);
    const fullyKnown = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, researchedTechs: TECHNOLOGY_IDS_V7 }
          : player,
      ),
    });
    const capabilities = queryTechnologyCapabilitiesV7(
      fullyKnown,
      state.humanPlayerId,
    );
    expect(capabilities).toMatchObject({
      treeId: "ORIGINAL_BASELINE_V5",
      hostileCaptureSpoilsCoins: 2,
      adjacentStartTurnHealingAmount: 6,
      landRoadPopulationAmount: 1,
      marketIncomeMultiplier: 2,
      armsIndustryDiscountCoins: 1,
      landTradeIncomeCoins: 1,
      seaTradeIncomeCoins: 1,
      mountainMovement: true,
      ownedCityCapacityBonus: 1,
    });
    expect(
      tree.nodes.find((node) => node.id === "PLANNING")?.effects,
    ).toContainEqual({ kind: "OWNED_CITY_CAPACITY_BONUS", capacity: 1 });
    expect(
      tree.nodes.find((node) => node.id === "RAIDING")?.effects,
    ).toContainEqual({ kind: "CHARGE_BONUS", attack: 1, minimumMove: 2 });
    expect(
      tree.nodes.find((node) => node.id === "EXPLOSIVES")?.effects,
    ).toContainEqual({ kind: "MELEE_FIELD_DEMOLITION" });
    expect(
      tree.nodes.find((node) => node.id === "NAVAL_ENGINEERING")?.effects,
    ).toContainEqual({ kind: "NAVAL_TRAINING_DISCOUNT", coins: 2 });
    expect(capabilities.trainableRoles).toHaveLength(9);
    expect(capabilities.commands).toEqual(
      expect.arrayContaining(["BUILD_MINE", "PILLAGE", "DISBAND"]),
    );
  });

  it("replays supported research commands deterministically and rejects atomically", () => {
    const setup = setupV7(92);
    const initial = richV7(initialV7(92), 20);
    const wrongPrerequisite = applyCommandV7(initial, initial.humanPlayerId, {
      kind: "RESEARCH",
      tech: "MILLING",
    });
    expect(wrongPrerequisite).toMatchObject({
      accepted: false,
      error: { code: "TECH_PREREQUISITE_MISSING" },
      events: [],
    });
    expect(wrongPrerequisite.state).toBe(initial);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const base = created.state;
    const actor = base.turnOrder[base.activeSeatIndex];
    if (actor === undefined) throw new Error("active actor missing");
    const applied = applyCommandV7(base, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(applied.accepted).toBe(true);
    if (!applied.accepted) return;
    const replay = appendReplayCommandV7(
      createReplayV7(setup),
      { kind: "RESEARCH", tech: "HUNTING" },
      applied.state,
    );
    expect(runReplayV7(replay)).toMatchObject({
      acceptedCommands: 1,
      stateHash: canonicalHash(applied.state),
    });
    const overflow = checkedV7({
      ...base,
      commandIndex: Number.MAX_SAFE_INTEGER,
    });
    const overflowResult = applyCommandV7(overflow, actor, {
      kind: "RESEARCH",
      tech: "HUNTING",
    });
    expect(overflowResult).toMatchObject({
      accepted: false,
      error: { code: "INTEGER_OVERFLOW" },
    });
    expect(overflowResult.state).toBe(overflow);
  });
});
