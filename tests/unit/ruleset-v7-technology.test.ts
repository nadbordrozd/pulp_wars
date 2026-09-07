import { describe, expect, it } from "vitest";
import {
  ORIGINAL_BASELINE_V3_NODES,
  ORIGINAL_BASELINE_V3_TREE,
  ORIGINAL_ROLE_RULES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  appendReplayCommandV7,
  assertRuleset7Registry,
  canonicalHash,
  createInitialMapStateV7,
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
  it("registers the exact ordered 25-node Original graph and start", () => {
    assertRuleset7Registry();
    expect(ORIGINAL_BASELINE_V3_NODES.map((node) => node.id)).toEqual(
      TECHNOLOGY_IDS_V7,
    );
    expect(ORIGINAL_BASELINE_V3_TREE).toMatchObject({
      id: "ORIGINAL_BASELINE_V3",
      faction: "ORIGINAL",
      startingTechIds: ["GATHERING"],
    });
    expect(ORIGINAL_BASELINE_V3_NODES.map((node) => node.branch)).toEqual([
      ...Array(5).fill("SETTLEMENT"),
      ...Array(5).fill("WILDS"),
      ...Array(5).fill("INDUSTRY"),
      ...Array(5).fill("MOBILITY"),
      ...Array(5).fill("WARFARE"),
    ]);
    expect(
      ORIGINAL_BASELINE_V3_NODES.filter((node) => node.tier === 1),
    ).toHaveLength(5);
    expect(
      ORIGINAL_BASELINE_V3_NODES.filter((node) => node.tier === 2),
    ).toHaveLength(10);
    expect(
      ORIGINAL_BASELINE_V3_NODES.filter((node) => node.tier === 3),
    ).toHaveLength(10);
    expect(
      initialV7().players.every(
        (player) =>
          player.researchedTechs.length === 1 &&
          player.researchedTechs[0] === "GATHERING",
      ),
    ).toBe(true);
    expect(Object.isFrozen(ORIGINAL_BASELINE_V3_NODES)).toBe(true);
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
      ["SCOUT", 4, 10, 3, 2, 2, 1, 1, "SCOUTING", true],
      ["ENVOY", 6, 7, 0, 1, 1, 2, 1, "CRAFT", true],
      ["MARKSMAN", 3, 10, 4, 2, 1, 2, 1, "MARKSMANSHIP", true],
      ["GUARD", 3, 15, 3, 6, 1, 1, 1, "DRILL", false],
      ["RAIDER", 4, 10, 4, 2, 2, 1, 1, "RAIDING", true],
      ["MEDIC", 4, 10, 1, 3, 1, 1, 1, "MEDICINE", true],
      ["CATAPULT", 8, 10, 7, 1, 1, 3, 2, "SAWMILLING", false],
      ["SABOTEUR", 7, 10, 4, 2, 2, 1, 1, "FIELDCRAFT", true],
      ["HEAVY", 7, 20, 7, 7, 1, 1, 1, "METALLURGY", true],
      ["LANCER", 9, 12, 6, 3, 3, 1, 1, "MANEUVER", true],
      ["BREACHER", 6, 10, 8, 2, 1, 1, 1, "EXPLOSIVES", false],
      ["JUGGERNAUT", null, 40, 8, 8, 1, 1, 1, null, true],
    ]);
    expect(Object.isFrozen(ORIGINAL_ROLE_RULES_V7)).toBe(true);
  });

  it("researches the entire graph for 180 coins without PRNG use", () => {
    let state = richV7(initialV7(), 1_000);
    const random = state.random;
    for (const tech of TECHNOLOGY_IDS_V7.slice(1)) {
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "RESEARCH",
        tech,
      });
      expect(result.accepted, tech).toBe(true);
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events).toHaveLength(1);
      expect(result.events.every((event) => parseEventV7(event).ok)).toBe(true);
      expect(result.state.random).toEqual(random);
      state = result.state;
    }
    expect(state.players[0]).toMatchObject({
      coins: 820,
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
      { kind: "RESEARCH", tech: "CRAFT" },
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "RESEARCH", tech: "SURVEYING" },
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
      treeId: "ORIGINAL_BASELINE_V3",
      hostileCaptureSpoilsCoins: 2,
      medicHealAmount: 6,
      friendlyIdleRecoveryAmount: 6,
      mountainMovement: true,
      scoutDetectionRadius: 2,
    });
    expect(capabilities.trainableRoles).toHaveLength(12);
    expect(capabilities.commands).toEqual(
      expect.arrayContaining(["BUILD_BARRACKS", "PILLAGE", "DISBAND"]),
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
    const created = createInitialMapStateV7(setup);
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
