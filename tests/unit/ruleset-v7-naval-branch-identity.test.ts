import { describe, expect, it } from "vitest";
import {
  BOARDING_HP_DIVISOR_V7,
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  HARBOUR_POPULATION_V7,
  MISSION_REGISTRY_V7,
  NAVAL_ROLE_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RAM_BONUS2_V7,
  RULESET_7_ID,
  SHOWCASE_UNIT_TEMPLATES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  assertRuleset7Registry,
  boardableAtV7,
  boardedHpV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  forbiddenTechnologiesV7,
  isNavalRoleV7,
  parseCommandV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  roleMechanicsV7,
  showcaseStripCenterXV7,
  technologyCapabilitiesV7,
  technologyResearchCostV7,
  validateMissionDefinitionV7,
  viewForV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";
import {
  NAVAL_TECHS_V7,
  navalArenaSetupV7,
  navalArenaV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step I (`pulp_wars-5ti.2`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 2, 3, and 12): identity
// 7r43, the two technologies, the Submarine role, the `BOARD` command, the
// `SHIP_BOARDED` event, Dry Land, missions, and the Showcase.

/**
 * The factions with ships: every faction but the Ice Folk, whose tree has
 * the frozen sea instead (tests/unit/ruleset-v7-frozen-sea-identity.test.ts).
 */
const SEAFARING_FACTIONS = FACTION_IDS_V7.filter(
  (faction) => faction !== "ICE_FOLK",
);

const NAVAL_BRANCH = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const satisfies readonly TechnologyIdV7[];

// The identity of this step was `7r43`. Engine step II (`pulp_wars-5ti.3`,
// tests/unit/ruleset-v7-frozen-sea-identity.test.ts) made it a prior
// identity; the current one is pinned there.
describe("the naval branch identity (7r43, engine step I)", () => {
  it("put 7r43 right after 7r42 in the gap-free prior list, with both save keys obsolete", () => {
    expect(PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r43")).toBe(
      PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r42") + 1,
    );
    expect(PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r42")).toBe(41);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toContain(
      "pulpWars.save.v7r42.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toContain(
      "pulpWars.save.v7r43.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("rejects a 7r42 setup, state, replay, and save without migration", () => {
    const setup = goblinSetupV7(["ORIGINAL", "UNDEAD"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(state.rulesetId).toBe(RULESET_7_ID);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r42" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r42",
        setup: oldSetup,
      }),
    ).toBeNull();
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-05T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r42",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r42" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("the naval branch shapes", () => {
  it("appends the two technologies, the Submarine role, BOARD, and SHIP_BOARDED where the spec puts them", () => {
    expect(TECHNOLOGY_IDS_V7).toHaveLength(25);
    expect(TECHNOLOGY_IDS_V7.slice(-5)).toEqual(NAVAL_BRANCH);
    expect(NAVAL_TECHS_V7).toEqual(NAVAL_BRANCH);
    // Earlier indices are unchanged.
    expect(TECHNOLOGY_IDS_V7.indexOf("NAVAL_ENGINEERING")).toBe(22);
    expect(UNIT_ROLE_IDS_V7.slice(-3)).toEqual([
      "PATROL_BOAT",
      "BATTLESHIP",
      "SUBMARINE",
    ]);
    expect(NAVAL_ROLE_IDS_V7).toEqual([
      "PATROL_BOAT",
      "BATTLESHIP",
      "SUBMARINE",
    ]);
    expect(UNIT_ROLE_IDS_V7.filter((role) => isNavalRoleV7(role))).toEqual(
      NAVAL_ROLE_IDS_V7,
    );
    expect(
      COMMAND_KIND_ORDER_V7[COMMAND_KIND_ORDER_V7.indexOf("ATTACK") + 1],
    ).toBe("BOARD");
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7[
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_MIND_CONTROLLED") + 1
      ],
    ).toBe("SHIP_BOARDED");
    expect(RAM_BONUS2_V7).toBe(2);
    expect(BOARDING_HP_DIVISOR_V7).toBe(3);
    expect(HARBOUR_POPULATION_V7).toBe(1);
  });

  it("parses BOARD strictly and TRAIN_NAVAL for the three ship roles only", () => {
    expect(
      parseCommandV7({ kind: "BOARD", unitId: 4, targetUnitId: 9 }),
    ).toEqual({
      ok: true,
      value: { kind: "BOARD", unitId: 4, targetUnitId: 9 },
    });
    for (const bad of [
      { kind: "BOARD", unitId: 4 },
      { kind: "BOARD", unitId: 4, targetUnitId: 9, at: { x: 1, y: 1 } },
      { kind: "BOARD", unitId: 0, targetUnitId: 9 },
      { kind: "BOARD", unitId: 4, targetUnitId: "9" },
    ])
      expect(parseCommandV7(bad)).toMatchObject({ ok: false });
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(
        parseCommandV7({
          kind: "TRAIN_NAVAL",
          cityId: 1,
          at: { x: 4, y: 3 },
          role,
        }),
      ).toMatchObject({ ok: true });
    expect(
      parseCommandV7({
        kind: "TRAIN_NAVAL",
        cityId: 1,
        at: { x: 4, y: 3 },
        role: "FIGHTER",
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("the five-node Naval branch in every tree", () => {
  it("registers Seamanship and Submersibles with the Settlement shape, the Human unlocks, and the ordinary costs for every faction", () => {
    expect(() => assertRuleset7Registry()).not.toThrow();
    for (const faction of SEAFARING_FACTIONS) {
      const tree = factionTreeV7(faction);
      const naval = tree.nodes.filter((node) => node.branch === "NAVAL");
      expect(
        naval.map((node) => node.id),
        faction,
      ).toEqual(NAVAL_BRANCH);
      expect(
        naval.map((node) => [node.id, node.tier, node.prerequisites]),
        faction,
      ).toEqual([
        ["SHORECRAFT", 1, []],
        ["NAVIGATION", 2, ["SHORECRAFT"]],
        ["NAVAL_ENGINEERING", 3, ["NAVIGATION"]],
        ["SEAMANSHIP", 2, ["SHORECRAFT"]],
        ["SUBMERSIBLES", 3, ["SEAMANSHIP"]],
      ]);
      const node = (id: TechnologyIdV7) =>
        tree.nodes.find((entry) => entry.id === id);
      // Every seafaring tree (the Ice Folk tree has the frozen sea) has the
      // Human unlocks.
      expect(node("SEAMANSHIP")?.unlocks, faction).toEqual([
        { kind: "RAM" },
        { kind: "COMMAND", command: "BOARD" },
      ]);
      expect(node("SUBMERSIBLES")?.unlocks, faction).toEqual([
        { kind: "UNIT_ROLE", role: "SUBMARINE" },
        { kind: "HARBOURS", population: 1 },
      ]);
      expect(node("SUBMERSIBLES")?.unlockedRoles, faction).toEqual([
        "SUBMARINE",
      ]);
      // The three existing technologies keep their unlocks.
      expect(node("NAVAL_ENGINEERING")?.unlocks, faction).toEqual([
        { kind: "UNIT_ROLE", role: "BATTLESHIP" },
        { kind: "COMMAND", command: "BUILD_SHIPYARD" },
        { kind: "NAVAL_TRAINING_DISCOUNT", coins: 2 },
      ]);
    }
    // Costs follow the ordinary tier formula (tier 3 base 9 since 7r41; the
    // per-city steps 2 and 2 since tuning 1, 7r46).
    expect(
      [1, 2, 3].map((cities) => technologyResearchCostV7(2, cities)),
    ).toEqual([7, 9, 11]);
    expect(
      [1, 2, 3].map((cities) => technologyResearchCostV7(3, cities)),
    ).toEqual([9, 11, 13]);
  });

  it("registers the same Submarine and the rammer Patrol Boat for every faction", () => {
    for (const faction of SEAFARING_FACTIONS) {
      expect(effectiveRoleRuleV7("SUBMARINE", faction), faction).toEqual({
        role: "SUBMARINE",
        label: "Submarine",
        tacticalRole: "NAVAL_HUNTER",
        cost: 9,
        maxHp: 12,
        attack2: 8,
        defense2: 4,
        move: 2,
        range: 1,
        minimumRange: 1,
        sightRadius: 2,
        technology: "SUBMERSIBLES",
        mayUsePrimaryActionAfterMove: true,
        abilities: ["ATTACK", "SUBMERGED", "TORPEDO"],
      });
      expect(effectiveRoleRuleV7("PATROL_BOAT", faction).abilities).toEqual([
        "ATTACK",
        "RAM",
      ]);
      expect(effectiveRoleRuleV7("BATTLESHIP", faction).abilities).toEqual([
        "ATTACK",
      ]);
      // No faction rule applies to a boat: one slot, no splash, no Shield,
      // no blast, no growth, no Crumbs.
      expect(roleMechanicsV7("SUBMARINE", faction), faction).toMatchObject({
        capacitySlots: 1,
        splash: false,
        shield: 0,
        kaboomDamage: null,
        deathBlastDamage: null,
        hatchTurns: null,
        regeneration: 0,
        movementMode: "GROUND",
        leavesCrumbs: false,
        construct: false,
      });
    }
    expect([10, 12, 25, 15, 17, 30].map(boardableAtV7)).toEqual([
      3, 4, 8, 5, 5, 10,
    ]);
    expect([10, 12, 25].map(boardedHpV7)).toEqual([4, 5, 9]);
  });

  it("derives ram, boarding, the Submarine, and Harbours from the capabilities, never from a raw technology", () => {
    for (const faction of SEAFARING_FACTIONS) {
      const none = technologyCapabilitiesV7(["SHORECRAFT"], faction);
      expect([none.ram, none.boarding, none.harbourPopulation]).toEqual([
        false,
        false,
        0,
      ]);
      expect(none.trainableRoles).not.toContain("SUBMARINE");
      const seamanship = technologyCapabilitiesV7(
        ["SHORECRAFT", "SEAMANSHIP"],
        faction,
      );
      expect([
        seamanship.ram,
        seamanship.boarding,
        seamanship.harbourPopulation,
      ]).toEqual([true, true, 0]);
      expect(seamanship.commands).toContain("BOARD");
      expect(seamanship.trainableRoles).not.toContain("SUBMARINE");
      const submersibles = technologyCapabilitiesV7(
        ["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"],
        faction,
      );
      expect(submersibles.harbourPopulation).toBe(1);
      expect(submersibles.trainableRoles).toContain("SUBMARINE");
    }
  });

  it("shows the branch in the public technology tree with states, prerequisites, and costs", () => {
    for (const faction of SEAFARING_FACTIONS) {
      const other: FactionIdV7 = faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL";
      const state = navalArenaV7({
        factions: [faction, other],
        technologies: [["SHORECRAFT"], []],
        units: [],
      });
      const tree = queryTechnologyTreeV7(state, state.humanPlayerId);
      const byId = new Map(tree.nodes.map((node) => [node.id, node]));
      expect(tree.nodes.filter((node) => node.branch === "NAVAL")).toHaveLength(
        5,
      );
      expect(byId.get("SEAMANSHIP"), faction).toMatchObject({
        tier: 2,
        prerequisites: ["SHORECRAFT"],
        missingPrerequisites: [],
        state: "AVAILABLE",
        cost: 7,
        affordable: true,
      });
      expect(byId.get("SUBMERSIBLES"), faction).toMatchObject({
        tier: 3,
        prerequisites: ["SEAMANSHIP"],
        missingPrerequisites: ["SEAMANSHIP"],
        state: "BLOCKED",
        cost: 9,
        affordable: false,
      });
      expect(
        byId.get("SUBMERSIBLES")?.unlockedRoleRules.map((rule) => rule.label),
      ).toEqual(["Submarine"]);
      const offered = queryPlayerCommandsV7(
        viewForV7(state, state.humanPlayerId),
      ).flatMap((command) =>
        command.kind === "RESEARCH" ? [command.tech] : [],
      );
      expect(offered).toContain("SEAMANSHIP");
      expect(offered).not.toContain("SUBMERSIBLES");
    }
  });

  it("researches Seamanship then Submersibles, and refuses Submersibles first", () => {
    const state = navalArenaV7({
      technologies: [["SHORECRAFT"], []],
      units: [],
    });
    const actor = state.humanPlayerId;
    const early = applyResearch(state, "SUBMERSIBLES");
    expect(early).toMatchObject({
      accepted: false,
      error: {
        code: "TECH_PREREQUISITE_MISSING",
        params: { tech: "SUBMERSIBLES", prerequisite: "SEAMANSHIP" },
      },
    });
    const first = applyResearch(state, "SEAMANSHIP");
    if (!first.accepted) throw new Error(first.error.code);
    expect(first.events[0]).toEqual({
      kind: "TECH_RESEARCHED",
      playerId: actor,
      tech: "SEAMANSHIP",
      cost: 7,
    });
    const second = applyResearch(first.state, "SUBMERSIBLES");
    if (!second.accepted) throw new Error(second.error.code);
    // Tier 3 as the third technology: 9 + 2 (tuning 4).
    expect(second.events[0]).toMatchObject({ tech: "SUBMERSIBLES", cost: 11 });
    // The stored list keeps the frozen technology order.
    expect(
      second.state.players.find((player) => player.id === actor)
        ?.researchedTechs,
    ).toEqual(["SHORECRAFT", "SEAMANSHIP", "SUBMERSIBLES"]);
    expect(parseGameStateV7(second.state)).not.toBeNull();
  });

  it("rejects a state whose player has Submersibles without Seamanship", () => {
    const state = navalArenaV7({ units: [] });
    const broken = {
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? { ...player, researchedTechs: ["SHORECRAFT", "SUBMERSIBLES"] }
          : player,
      ),
    };
    expect(parseGameStateV7(broken)).toBeNull();
  });
});

describe("the naval branch on Dry Land, in missions, and in the Showcase", () => {
  it("forbids all five Naval technologies on Dry Land and offers none", () => {
    const setup: MatchSetupV7 = goblinSetupV7(["ORIGINAL", "UNDEAD"]);
    expect(setup.mapType).toBe("DRY_LAND");
    expect([...forbiddenTechnologiesV7(setup).entries()]).toEqual(
      NAVAL_BRANCH.map((tech) => [tech, "DRY_LAND"]),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const actor =
      created.state.turnOrder[created.state.activeSeatIndex] ??
      created.state.humanPlayerId;
    const tree = queryTechnologyTreeV7(created.state, actor);
    // Other technologies are offered, so the absence below is meaningful.
    expect(
      queryPlayerCommandsV7(viewForV7(created.state, actor)).some(
        (command) => command.kind === "RESEARCH",
      ),
    ).toBe(true);
    expect(
      tree.nodes
        .filter((node) => node.branch === "NAVAL")
        .map((node) => node.state),
    ).toEqual(["DISABLED", "DISABLED", "DISABLED", "DISABLED", "DISABLED"]);
    for (const tech of ["SEAMANSHIP", "SUBMERSIBLES"] as const)
      expect(applyResearch(created.state, tech)).toMatchObject({
        accepted: false,
        error: { code: "TECH_REQUIRED", params: { tech, reason: "DRY_LAND" } },
      });
    expect(
      queryPlayerCommandsV7(viewForV7(created.state, actor)).some(
        (command) =>
          command.kind === "RESEARCH" &&
          (NAVAL_BRANCH as readonly string[]).includes(command.tech),
      ),
    ).toBe(false);
    // A water setup forbids none.
    expect(
      forbiddenTechnologiesV7(navalArenaSetupV7(["ORIGINAL", "UNDEAD"])).size,
    ).toBe(0);
  });

  it("keeps every mission's forbidden list closed: Shorecraft is forbidden with the whole branch", () => {
    let navalForbidden = 0;
    for (const mission of MISSION_REGISTRY_V7) {
      expect(() => validateMissionDefinitionV7(mission)).not.toThrow();
      if (!mission.forbiddenTechnologies.includes("SHORECRAFT")) continue;
      navalForbidden += 1;
      for (const tech of NAVAL_BRANCH)
        expect(mission.forbiddenTechnologies, mission.id).toContain(tech);
    }
    expect(navalForbidden).toBeGreaterThan(0);
    const dry = MISSION_REGISTRY_V7.find((mission) =>
      mission.forbiddenTechnologies.includes("SHORECRAFT"),
    );
    if (dry === undefined) throw new Error("no naval-forbidden mission");
    // The pre-branch list (three technologies) no longer closes.
    for (const dropped of ["SEAMANSHIP", "SUBMERSIBLES"] as const)
      expect(() =>
        validateMissionDefinitionV7({
          ...dry,
          forbiddenTechnologies: dry.forbiddenTechnologies.filter(
            (tech) => tech !== dropped && tech !== "SUBMERSIBLES",
          ),
        }),
      ).toThrow(
        dropped === "SEAMANSHIP"
          ? /SEAMANSHIP must be forbidden/
          : /SUBMERSIBLES must be forbidden/,
      );
  });

  it("gives every Showcase seat one Submarine on the Deep Water tile east of its Battleship", () => {
    expect(SHOWCASE_UNIT_TEMPLATES_V7.at(-1)).toEqual({
      role: "SUBMARINE",
      dx: 1,
      y: 13,
      home: "COAST",
    });
    const factions: readonly FactionIdV7[] = [
      "ORIGINAL",
      "DWARF",
      "CANDY",
      "MARTIAN",
    ];
    const setup: MatchSetupV7 = {
      ...goblinSetupV7(["ORIGINAL", "UNDEAD"]),
      width: 16,
      height: 16,
      aiCount: 3,
      factions: [...factions],
      mapType: "SHOWCASE",
    };
    const created = createInitialMapStateV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(parseGameStateV7(state)).not.toBeNull();
    state.players.forEach((player, seat) => {
      const cx = showcaseStripCenterXV7(seat, 3);
      const submarines = state.units.filter(
        (unit) => unit.ownerId === player.id && unit.role === "SUBMARINE",
      );
      expect(submarines).toHaveLength(1);
      const submarine = submarines[0];
      const coast = state.cities.find(
        (city) => city.ownerId === player.id && city.at.y === 11,
      );
      expect(submarine).toMatchObject({
        form: "NAVAL",
        at: { x: cx + 1, y: 13 },
        hp: 12,
        maxHp: 12,
        homeCityId: coast?.id,
      });
      const battleship = state.units.find(
        (unit) => unit.ownerId === player.id && unit.role === "BATTLESHIP",
      );
      expect(battleship?.at).toEqual({ x: cx, y: 13 });
      const tile = state.board.tiles.find(
        (entry) => entry.at.x === cx + 1 && entry.at.y === 13,
      );
      expect(tile).toMatchObject({
        terrain: "DEEP_WATER",
        resource: null,
        improvement: null,
      });
      // Every technology is researched, so the docks carry Harbours: the
      // Port 2 and the Shipyard 3, and the Coast city is level 4.
      expect(player.researchedTechs).toEqual(TECHNOLOGY_IDS_V7);
      expect(coast).toMatchObject({ level: 4 });
      const docks = state.populationContributions.filter(
        (entry) =>
          entry.cityId === coast?.id &&
          entry.source.kind === "IMPROVEMENT" &&
          (entry.source.improvement === "PORT" ||
            entry.source.improvement === "SHIPYARD"),
      );
      expect(
        docks.map((entry) => [
          entry.source.kind === "IMPROVEMENT" ? entry.source.improvement : null,
          entry.amount,
        ]),
      ).toEqual([
        ["PORT", 2],
        ["SHIPYARD", 3],
      ]);
    });
  });
});

function applyResearch(state: GameStateV7, tech: TechnologyIdV7) {
  const actor = state.turnOrder[state.activeSeatIndex] ?? state.humanPlayerId;
  return applyCommandV7(state, actor, { kind: "RESEARCH", tech });
}
