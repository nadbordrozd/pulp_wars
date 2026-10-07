import { describe, expect, it } from "vitest";
import {
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  GOBLIN_BASELINE_V1_NODES,
  GOBLIN_ROLE_MECHANICS_V7,
  GOBLIN_ROLE_RULES_V7,
  SHARED_BASELINE_NODES_V7,
  ORIGINAL_ROLE_MECHANICS_V7,
  ORIGINAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7,
  RULESET_7_ID,
  STARTING_FIGHTERS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  UNDEAD_ROLE_MECHANICS_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  appendReplayCommandV7,
  applyCommandV7,
  assertRuleset7Registry,
  canonicalHash,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  factionTreeIdV7,
  nextBounded,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  parseReplayJsonV7,
  previewCityCapacityV7,
  recomputeLiveEconomyV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  resolveCityGrowthV7,
  roleMechanicsV7,
  runReplayV7,
  startingCompanionCellV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  type BoardStateV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PopulationContributionV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

// Revision 17 (`pulp_wars-0ao.2`): identity, Goblin registration, roster,
// starting units, substitutions, Warrens, per-viewer technology text, and
// persistence (docs/product/RULESET_7_REVISION_17_GOBLINS.md sections 2-5, 8,
// 9, and 13).

describe("ruleset-7 revision-17 identity", () => {
  it("keeps r16 among the prior identities after the r50 identity and cleans the r16 key", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r50");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r50.current");
    expect(PRIOR_RULESET_7_IDS.at(-34)).toBe("pulp-wars-poc-7r16");
    expect(PRIOR_RULESET_7_IDS).toHaveLength(49);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-34)).toBe(
      "pulpWars.save.v7r16.current",
    );
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r16.current", "r16"],
      [SAVE_STORAGE_KEY_V7, "r20"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: ["pulpWars.save.v7r16.current"],
      removedCount: 1,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.unrelated",
    ]);
  });

  it("rejects r16 setups, states, replays, and saves without migration", () => {
    const setup = goblinSetupV7(["GOBLIN", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r16" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r16",
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
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-30T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r16",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r16" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 Goblin faction registration", () => {
  it("freezes the faction and tree orders, binding, and display name", () => {
    expect(FACTION_IDS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      // The Dwarf revision (`pulp_wars-78i.3`).
      "DWARF",
      "CANDY",
    ]);
    expect(FACTION_TREE_IDS_V7).toEqual([
      "ORIGINAL_BASELINE_V5",
      "UNDEAD_BASELINE_V1",
      "GOBLIN_BASELINE_V1",
      "DINOSAUR_BASELINE_V1",
      "MARTIAN_BASELINE_V1",
      "ICE_FOLK_BASELINE_V1",
      "DWARF_BASELINE_V1",
      "CANDY_BASELINE_V1",
    ]);
    expect(factionTreeIdV7("GOBLIN")).toBe("GOBLIN_BASELINE_V1");
    expect(FACTION_TREES_V7.GOBLIN.faction).toBe("GOBLIN");
    expect(RULESET_7.factionTrees.GOBLIN.roleRules).toBe(GOBLIN_ROLE_RULES_V7);
    expect(FACTION_DISPLAY_NAMES_V7.GOBLIN).toBe("Goblin");
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(
      FACTION_IDS_V7.map((faction) => [
        faction,
        factionRulesV7(faction).cityCapacityBonus,
        factionRulesV7(faction).gangUpMaximum,
        factionRulesV7(faction).restless,
      ]),
    ).toEqual([
      ["ORIGINAL", 0, 0, false],
      ["UNDEAD", 0, 0, true],
      ["GOBLIN", 1, 2, false],
      ["DINOSAUR", 0, 0, false],
      ["MARTIAN", 0, 0, false],
      ["ICE_FOLK", 0, 0, false],
      ["DWARF", 0, 0, false],
      ["CANDY", 0, 0, false],
    ]);
  });

  it("accepts Goblin seats in every combination and rejects a faction/tree mismatch", () => {
    for (const factions of [
      ["GOBLIN", "ORIGINAL"],
      ["ORIGINAL", "GOBLIN"],
      ["GOBLIN", "UNDEAD"],
      ["UNDEAD", "GOBLIN"],
      ["GOBLIN", "GOBLIN"],
      ["GOBLIN", "ORIGINAL", "UNDEAD"],
    ] as const)
      expect(parseMatchSetupV7(goblinSetupV7(factions))?.factions).toEqual(
        factions,
      );
    expect(
      parseMatchSetupV7({
        ...goblinSetupV7(["GOBLIN", "ORIGINAL"]),
        factions: ["goblin", "ORIGINAL"],
      }),
    ).toBeNull();
    const created = createPlayableGameV7(goblinSetupV7(["ORIGINAL", "GOBLIN"]));
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["GOBLIN", "GOBLIN_BASELINE_V1"],
    ]);
    const withPlayer = (patch: Record<string, unknown>) => ({
      ...state,
      players: state.players.map((player, index) =>
        index === 1 ? { ...player, ...patch } : player,
      ),
    });
    expect(
      parseGameStateV7(withPlayer({ factionTreeId: "ORIGINAL_BASELINE_V5" })),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withPlayer({ faction: "UNDEAD", factionTreeId: "GOBLIN_BASELINE_V1" }),
      ),
    ).toBeNull();
    const view = queryTechnologyTreeV7(state, seatIdV7(state, 1));
    expect([view.id, view.faction]).toEqual(["GOBLIN_BASELINE_V1", "GOBLIN"]);
  });

  it("generates identical boards, turn orders, treasure, and PRNG with Goblin seats", () => {
    for (const [seed, mapType, aiCount] of [
      [1, "DRY_LAND", 1],
      [42, "CONTINENTS", 2],
      [77, "ARCHIPELAGO", 3],
      [123, "LAKES", 1],
      [5, "PANGEA", 3],
    ] as const) {
      const humans = Array.from(
        { length: aiCount + 1 },
        () => "ORIGINAL" as const,
      );
      const goblins = humans.map(() => "GOBLIN" as const);
      const mixed = humans.map((_, seat): FactionIdV7 =>
        seat % 3 === 0 ? "GOBLIN" : seat % 3 === 1 ? "UNDEAD" : "ORIGINAL",
      );
      const create = (factions: readonly FactionIdV7[]) => {
        const created = createInitialMapStateV7({
          ...goblinSetupV7(factions, seed),
          mapType,
          width: aiCount === 1 ? 11 : 16,
          height: aiCount === 1 ? 11 : 16,
        });
        if (!created.ok) throw new Error(created.error.code);
        return created.state;
      };
      const reference = create(humans);
      for (const factions of [goblins, mixed]) {
        const other = create(factions);
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect(
          other.players.map((player) => player.originalCapitalCityId),
        ).toEqual(
          reference.players.map((player) => player.originalCapitalCityId),
        );
        // Every seat's first unit keeps the all-Human ID and tile.
        expect(
          other.units
            .slice(0, reference.units.length)
            .map((unit) => [unit.id, unit.ownerId, unit.at]),
        ).toEqual(
          reference.units.map((unit) => [unit.id, unit.ownerId, unit.at]),
        );
      }
    }
  });
});

describe("ruleset-7 Goblin roster", () => {
  type Row = readonly [
    string,
    string,
    string | null,
    number | null,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    boolean,
    readonly string[],
    number | null,
    number | null,
  ];
  // Section 3: label, tactical role, technology, cost, HP, attack2,
  // defense2, Move, range, minimum range, Sight, attack after move,
  // abilities, Kaboom damage, death-blast damage. `pulp_wars-0ao.7` tuned
  // the Goblin's attack2 (4 -> 3), defense2 (2 -> 1), and Kaboom (4 -> 5),
  // and the death blasts (Bomb Chucker 3 -> 2, Rocket Cart and Scrap Buggy
  // 5 -> 4).
  const ROSTER: Readonly<Record<UnitRoleIdV7, Row>> = {
    FIGHTER: [
      "Goblin",
      "LINE",
      null,
      1,
      6,
      3,
      1,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE", "KABOOM"],
      5,
      null,
    ],
    RAIDER: [
      "Wolf Rider",
      "SKIRMISHER",
      "SCOUTING",
      3,
      10,
      4,
      2,
      2,
      1,
      1,
      2,
      true,
      ["ATTACK", "CAPTURE", "CHARGE", "KABOOM"],
      4,
      null,
    ],
    MARKSMAN: [
      "Bomb Chucker",
      "RANGED",
      "MARKSMANSHIP",
      3,
      8,
      4,
      2,
      1,
      2,
      2,
      1,
      true,
      ["ATTACK", "CAPTURE", "KABOOM"],
      4,
      2,
    ],
    GUARD: [
      "Orc Brute",
      "DEFENDER",
      "DRILL",
      3,
      15,
      4,
      5,
      1,
      1,
      1,
      1,
      false,
      ["ATTACK", "CAPTURE"],
      null,
      null,
    ],
    CAPTAIN: [
      "Orc Warboss",
      "SUPPORT",
      "ADMINISTRATION",
      5,
      12,
      4,
      2,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "RALLY"],
      null,
      null,
    ],
    CATAPULT: [
      "Rocket Cart",
      "SIEGE",
      "SAWMILLING",
      7,
      8,
      7,
      1,
      1,
      3,
      2,
      1,
      false,
      ["ATTACK", "KABOOM"],
      5,
      4,
    ],
    KNIGHT: [
      "Scrap Buggy",
      "BREAKTHROUGH",
      "CHIVALRY",
      8,
      10,
      6,
      2,
      3,
      1,
      1,
      1,
      true,
      ["ATTACK", "OVERRUN", "KABOOM"],
      5,
      4,
    ],
    JUGGERNAUT: [
      "Troll",
      "MYTHIC",
      null,
      null,
      40,
      8,
      6,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE", "PUSH", "REGENERATE"],
      null,
      null,
    ],
    PATROL_BOAT: [
      "Patrol Boat",
      "NAVAL_SCREEN",
      "SHORECRAFT",
      5,
      10,
      4,
      4,
      2,
      1,
      1,
      2,
      true,
      // The naval branch (`pulp_wars-5ti.2`): the Ram (with Seamanship).
      ["ATTACK", "RAM"],
      null,
      null,
    ],
    BATTLESHIP: [
      "Battleship",
      "NAVAL_CAPITAL",
      "NAVAL_ENGINEERING",
      16,
      25,
      12,
      8,
      2,
      3,
      1,
      3,
      false,
      ["ATTACK"],
      null,
      null,
    ],
    // The naval branch (`pulp_wars-5ti.2`): the shared Submarine.
    SUBMARINE: [
      "Submarine",
      "NAVAL_HUNTER",
      "SUBMERSIBLES",
      9,
      12,
      8,
      4,
      2,
      1,
      1,
      2,
      true,
      ["ATTACK", "SUBMERGED", "TORPEDO"],
      null,
      null,
    ],
    // Tuning 5 (`pulp_wars-w49.4`): the Human Swordsman's role, which the
    // Goblin tree never unlocks and no Goblin seat trains (no cost).
    SWORDSMAN: [
      "Swordsman",
      "LINE",
      "ENGINEERING",
      null,
      15,
      7,
      5,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE"],
      null,
      null,
    ],
  };

  it("registers every value of the section-3 table", () => {
    for (const role of UNIT_ROLE_IDS_V7) {
      const rule = effectiveRoleRuleV7(role, "GOBLIN");
      const mechanics = roleMechanicsV7(role, "GOBLIN");
      expect(rule).toBe(GOBLIN_ROLE_RULES_V7[role]);
      expect(mechanics).toBe(GOBLIN_ROLE_MECHANICS_V7[role]);
      expect(rule.role).toBe(role);
      expect([
        rule.label,
        rule.tacticalRole,
        rule.technology,
        rule.cost,
        rule.maxHp,
        rule.attack2,
        rule.defense2,
        rule.move,
        rule.range,
        rule.minimumRange,
        rule.sightRadius,
        rule.mayUsePrimaryActionAfterMove,
        rule.abilities,
        mechanics.kaboomDamage,
        mechanics.deathBlastDamage,
      ]).toEqual(ROSTER[role]);
      expect(rule.tacticalRole).toBe(ORIGINAL_ROLE_RULES_V7[role].tacticalRole);
    }
    // Capture: Goblin, Wolf Rider, Bomb Chucker, Orc Brute, Troll (and the
    // copied Human Swordsman role, which no Goblin seat fields).
    expect(
      UNIT_ROLE_IDS_V7.filter((role) =>
        GOBLIN_ROLE_RULES_V7[role].abilities.includes("CAPTURE"),
      ),
    ).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "JUGGERNAUT",
      "SWORDSMAN",
    ]);
    // Boats are the Human boats.
    expect(GOBLIN_ROLE_RULES_V7.PATROL_BOAT).toEqual(
      ORIGINAL_ROLE_RULES_V7.PATROL_BOAT,
    );
    expect(GOBLIN_ROLE_RULES_V7.BATTLESHIP).toEqual(
      ORIGINAL_ROLE_RULES_V7.BATTLESHIP,
    );
    expect(GOBLIN_ROLE_MECHANICS_V7.PATROL_BOAT).toEqual(
      ORIGINAL_ROLE_MECHANICS_V7.PATROL_BOAT,
    );
    expect(GOBLIN_ROLE_MECHANICS_V7.BATTLESHIP).toEqual(
      ORIGINAL_ROLE_MECHANICS_V7.BATTLESHIP,
    );
  });

  it("registers the Goblin role mechanics and keeps Human and Undead mechanics", () => {
    expect(
      UNIT_ROLE_IDS_V7.map((role) => {
        const mechanics = GOBLIN_ROLE_MECHANICS_V7[role];
        return [
          role,
          mechanics.advancesAfterKill,
          mechanics.splash,
          mechanics.splashTargets,
          mechanics.buildsFieldDefense,
          mechanics.rallyRadius,
          mechanics.rallyReachesSupportAndSiege,
          mechanics.regeneration,
        ];
      }),
    ).toEqual([
      ["FIGHTER", true, false, "HOSTILE", false, 1, false, 0],
      ["RAIDER", true, false, "HOSTILE", false, 1, false, 0],
      // Revision 17: the Bomb Chucker's bomb splashes every unit.
      ["MARKSMAN", true, true, "ALL", false, 1, false, 0],
      ["GUARD", true, false, "HOSTILE", true, 1, false, 0],
      ["CAPTAIN", true, false, "HOSTILE", false, 2, true, 0],
      ["CATAPULT", false, false, "HOSTILE", false, 1, false, 0],
      ["KNIGHT", true, false, "HOSTILE", false, 1, false, 0],
      ["JUGGERNAUT", true, false, "HOSTILE", false, 1, false, 4],
      ["PATROL_BOAT", true, false, "HOSTILE", false, 1, false, 0],
      ["BATTLESHIP", true, true, "HOSTILE", false, 1, false, 0],
      ["SUBMARINE", true, false, "HOSTILE", false, 1, false, 0],
      ["SWORDSMAN", true, false, "HOSTILE", false, 1, false, 0],
    ]);
    for (const table of [ORIGINAL_ROLE_MECHANICS_V7, UNDEAD_ROLE_MECHANICS_V7])
      for (const role of UNIT_ROLE_IDS_V7)
        expect([
          table[role].splashTargets,
          table[role].buildsFieldDefense,
          table[role].rallyRadius,
          table[role].rallyReachesSupportAndSiege,
          table[role].kaboomDamage,
          table[role].deathBlastDamage,
          table[role].regeneration,
        ]).toEqual([
          "HOSTILE",
          role === "FIGHTER" || role === "GUARD",
          1,
          false,
          null,
          null,
          0,
        ]);
  });

  it("refunds floor(cost / 2) on Disband, offering and accepting a 0-Coin Goblin Disband", () => {
    expect(
      (
        [
          "FIGHTER",
          "RAIDER",
          "MARKSMAN",
          "GUARD",
          "CAPTAIN",
          "CATAPULT",
          "KNIGHT",
        ] as const
      ).map((role) =>
        Math.floor((effectiveRoleRuleV7(role, "GOBLIN").cost ?? 0) / 2),
      ),
    ).toEqual([0, 1, 1, 1, 2, 3, 4]);
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "KNIGHT", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const goblin = unitAtV7(state, { x: 4, y: 3 });
    const command: CommandV7 = { kind: "DISBAND", unitId: goblin.id };
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
      command,
    );
    const result = applyOkV7(state, state.humanPlayerId, command);
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_DISBANDED",
      role: "FIGHTER",
      coinDelta: 0,
    });
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    const buggy = applyOkV7(state, state.humanPlayerId, {
      kind: "DISBAND",
      unitId: unitAtV7(state, { x: 5, y: 3 }).id,
    });
    expect(buggy.events[0]).toMatchObject({ coinDelta: 4 });
  });

  it("counts the Goblin trainable roles for Muster and excludes the Troll", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "MARKSMAN", at: { x: 5, y: 3 } },
        { seat: 0, role: "CATAPULT", at: { x: 6, y: 3 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 7, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    expect(
      achievementProgressV7(state, state.humanPlayerId).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 3 });
  });
});

describe("ruleset-7 Goblin technology", () => {
  it("differs from the Human graph only in the Administration and Commerce unlocks", () => {
    expect(GOBLIN_BASELINE_V1_NODES).toHaveLength(
      SHARED_BASELINE_NODES_V7.length,
    );
    SHARED_BASELINE_NODES_V7.forEach((human, index) => {
      const goblin = GOBLIN_BASELINE_V1_NODES[index];
      if (goblin === undefined) throw new Error("node missing");
      expect([
        goblin.id,
        goblin.branch,
        goblin.tier,
        goblin.prerequisites,
        goblin.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        human.unlockedRoles,
      ]);
      if (human.id === "ADMINISTRATION")
        expect(goblin.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "WAAAGH_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "COMMERCE")
        // Tuning 3 (`pulp_wars-w49.3`): Commerce also hires, in every tree.
        expect(goblin.unlocks).toEqual([
          { kind: "PLUNDER", coins: 2 },
          { kind: "COMMAND", command: "HIRE" },
        ]);
      else expect(goblin.unlocks).toEqual(human.unlocks);
    });
    // Chivalry keeps Overrun (labelled Ram for Goblins).
    expect(
      GOBLIN_BASELINE_V1_NODES.find((node) => node.id === "CHIVALRY")?.unlocks,
    ).toContainEqual({ kind: "OVERRUN" });
  });

  it("swaps land trade for Plunder in the Goblin capabilities only", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [
          faction,
          capabilities.landTradeIncomeCoins,
          capabilities.plunderCoins,
        ];
      }),
    ).toEqual([
      // Tuning 4 (`pulp_wars-w49.3`): land trade pays 1 Coin (2 since
      // tuning 1).
      ["ORIGINAL", 1, 0],
      ["UNDEAD", 1, 0],
      ["GOBLIN", 0, 2],
      ["DINOSAUR", 1, 0],
      ["MARTIAN", 1, 0],
      ["ICE_FOLK", 1, 0],
      ["DWARF", 1, 0],
      ["CANDY", 1, 0],
    ]);
    const goblin = technologyCapabilitiesV7(all, "GOBLIN");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    // (The Swordsman of tuning 5 is the Humans' alone.)
    expect(goblin.trainableRoles).toEqual(
      human.trainableRoles.filter((role) => role !== "SWORDSMAN"),
    );
    expect(goblin.roleSightRadius).toEqual({ RAIDER: 2, MARKSMAN: 2 });
    expect(goblin.forestMovementFreedomRoles).toEqual(["RAIDER", "MARKSMAN"]);
    expect(technologyCapabilitiesV7(["ROADS"], "GOBLIN").plunderCoins).toBe(0);
  });

  it("names and describes technologies from the viewer's faction", () => {
    // Goblin Commerce is renamed (and, in revision 19, Dinosaur
    // Fortification; in revision 20, Dinosaur Explosives); the UI's
    // `technologyNameV7` applies these overrides
    // (tests/unit/ruleset7-goblin-presentation.test.ts).
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7).toEqual({
      ORIGINAL: {},
      UNDEAD: {},
      GOBLIN: { COMMERCE: "Plunder" },
      DINOSAUR: { FORTIFICATION: "Nesting", EXPLOSIVES: "Wallbreaker" },
      MARTIAN: { FORTIFICATION: "Force Fields", EXPLOSIVES: "Disintegrator" },
      ICE_FOLK: {
        FORTIFICATION: "Deep Winter",
        EXPLOSIVES: "Brittle",
        // The frozen sea (naval branch section 2.2).
        SHORECRAFT: "Rime",
        NAVIGATION: "Pack Ice",
        NAVAL_ENGINEERING: "Icebound",
        SEAMANSHIP: "Black Ice",
        SUBMERSIBLES: "Glacier",
      },
      DWARF: { FORTIFICATION: "Dig In", EXPLOSIVES: "Blasting Charges" },
      CANDY: {
        FORTIFICATION: "Home Sweet Home",
        EXPLOSIVES: "Peppermint Surprise",
      },
    });
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const text = (viewer: number, tech: string) => {
      const tree = queryTechnologyTreeV7(state, seatIdV7(state, viewer));
      const node = tree.nodes.find((item) => item.id === tech);
      if (node === undefined) throw new Error("node missing");
      return technologyEffectGroupsV7(node.effects, tree.faction).flatMap(
        (group) => group.items,
      );
    };
    const hire =
      "Hire: each Market hires one extra unit a turn on its tile, at 1.5× the price; its city may hold 1 unit above its limit";
    expect(text(0, "COMMERCE")).toEqual([
      hire,
      "+2 Coins for each enemy unit your units or blasts kill",
    ]);
    expect(text(1, "COMMERCE")).toEqual([
      hire,
      "Each city linked by Road to another of your cities: +1 Coin each turn",
    ]);
    expect(text(0, "ADMINISTRATION")).toEqual([
      "Train Orc Warboss",
      "Disband",
      "Build market",
      "Orc Warbosses WAAAGH! troops within 2 tiles",
    ]);
    expect(text(0, "SAWMILLING")).toContain("Train Rocket Cart");
    expect(text(0, "MARKSMANSHIP")).toEqual(["Train Bomb Chucker"]);
    expect(text(0, "SCOUTING")).toContain("Train Wolf Rider");
    expect(text(0, "CHIVALRY")).toContain("Train Scrap Buggy");
    expect(text(0, "DRILL")).toContain("Train Orc Brute");
  });
});

describe("ruleset-7 Goblin starting units", () => {
  // `pulp_wars-0ao.7` tuned the Goblin seat's starting Goblins from two to
  // one (section 14.1 bounds 1-2), so no second starting Goblin is created;
  // the ring-cell rule a second Goblin would use stays covered by the
  // `startingCompanionCellV7` test below.
  it("starts every seat, Goblin included, with one Fighter on its capital", () => {
    expect(STARTING_FIGHTERS_V7).toEqual({
      ORIGINAL: 1,
      UNDEAD: 1,
      GOBLIN: 1,
      DINOSAUR: 1,
      MARTIAN: 1,
      ICE_FOLK: 1,
      DWARF: 1,
      CANDY: 1,
    });
    let checkedSeats = 0;
    for (const [seed, mapType, factions] of [
      [3, "PANGEA", ["GOBLIN", "ORIGINAL"]],
      [4, "ARCHIPELAGO", ["ORIGINAL", "GOBLIN"]],
      [9, "LAKES", ["GOBLIN", "GOBLIN"]],
      [11, "CONTINENTS", ["UNDEAD", "GOBLIN", "ORIGINAL", "GOBLIN"]],
    ] as const) {
      const setup: MatchSetupV7 = {
        ...goblinSetupV7(factions, seed),
        mapType,
      };
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      const { state } = created;
      const seats = factions.length;
      // Capital and first-unit IDs are those of an all-Human setup.
      expect(state.units.map((unit) => unit.id)).toEqual(
        Array.from({ length: seats }, (_, seat) => seat * 2 + 2),
      );
      factions.forEach((faction, seat) => {
        const player = state.players[seat];
        const capital = state.cities[seat];
        if (player === undefined || capital === undefined)
          throw new Error("seat missing");
        const own = state.units.filter((unit) => unit.ownerId === player.id);
        expect(own).toHaveLength(STARTING_FIGHTERS_V7[faction]);
        const rule = effectiveRoleRuleV7("FIGHTER", faction);
        for (const unit of own)
          expect(unit).toMatchObject({
            role: "FIGHTER",
            form: "LAND",
            at: capital.at,
            hp: rule.maxHp,
            maxHp: rule.maxHp,
            homeCityId: capital.id,
            kills: 0,
            veteran: false,
          });
        if (faction === "GOBLIN") checkedSeats += 1;
      });
      expect(state.nextEntityId).toBe(seats * 2 + 1);
    }
    expect(checkedSeats).toBe(6);
  });

  it("gives the starting Goblin a fresh activation, 3 Coins, and no technology", () => {
    const setup = goblinSetupV7(["GOBLIN", "ORIGINAL"], 3);
    const initial = createInitialMapStateV7(setup);
    if (!initial.ok) throw new Error(initial.error.code);
    expect(
      initial.state.players.map((player) => [
        player.coins,
        player.researchedTechs,
      ]),
    ).toEqual([
      [3, []],
      [3, []],
    ]);
    for (const unit of initial.state.units)
      expect(unit.activation).toEqual({
        moved: false,
        movedPathLength: 0,
        attacked: false,
        attacksUsed: 0,
        tendedThisTurn: false,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        recovered: false,
        captured: false,
        handled: false,
        specialActed: false,
      });
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const active = state.turnOrder[state.activeSeatIndex];
    const goblinSeat = state.players[0];
    if (goblinSeat === undefined) throw new Error("seat missing");
    const goblins = state.units.filter(
      (unit) => unit.ownerId === goblinSeat.id,
    );
    expect(goblins).toHaveLength(STARTING_FIGHTERS_V7.GOBLIN);
    if (active === goblinSeat.id)
      for (const goblin of goblins)
        expect(goblin.activation).toMatchObject({
          moved: false,
          attacked: false,
          handled: false,
          specialActed: false,
        });
    const view = queryPlayerCommandsV7(state, goblinSeat.id);
    if (active === goblinSeat.id)
      for (const goblin of goblins)
        expect(
          view.some(
            (command) =>
              command.kind === "MOVE" && command.unitId === goblin.id,
          ),
        ).toBe(true);
  });

  it("finds a second starting Goblin's ring cell, or none (no compensation)", () => {
    const board = syntheticBoard((at) =>
      at.x === 1 && at.y === 1
        ? "MOUNTAIN"
        : at.x === 3 && at.y === 3
          ? "FOREST"
          : at.y === 3
            ? "SHALLOW_WATER"
            : at.x === 2 || at.y === 2
              ? "GRASS"
              : "MOUNTAIN",
    );
    const capital = { x: 2, y: 2 };
    // Open cells in (y, x) order: (2,1), (1,2), (3,2), (3,3).
    expect(startingCompanionCellV7(board, capital, [], [])).toEqual({
      x: 2,
      y: 1,
    });
    expect(
      startingCompanionCellV7(
        board,
        capital,
        [{ x: 2, y: 1 }],
        [{ x: 1, y: 2 }],
      ),
    ).toEqual({ x: 3, y: 2 });
    expect(
      startingCompanionCellV7(
        board,
        capital,
        [
          { x: 2, y: 1 },
          { x: 3, y: 2 },
        ],
        [
          { x: 1, y: 2 },
          { x: 3, y: 3 },
        ],
      ),
    ).toBeNull();
    // Corner capitals are clipped to the board.
    expect(startingCompanionCellV7(board, { x: 0, y: 0 }, [], [])).toBeNull();
  });
});

describe("ruleset-7 Goblin reward substitutions", () => {
  it("grants two exhausted Goblins for Militia, the second on the first open adjacent cell", () => {
    const fixture = rewardState("MILITIA", []);
    const city = humanCity(fixture.state);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const granted = result.events.filter(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    expect(granted).toHaveLength(2);
    const created = newUnits(fixture.state, result.state);
    expect(created.map((unit) => unit.id)).toEqual(
      granted.map((event) =>
        event.kind === "UNIT_REWARD_GRANTED" ? event.unitId : -1,
      ),
    );
    const [first, second] = created;
    if (first === undefined || second === undefined)
      throw new Error("Militia Goblins missing");
    expect(first.at).toEqual(city.at);
    expect(second.at).toEqual(firstOpenAdjacent(fixture.state, city.at, []));
    for (const unit of [first, second]) {
      expect(unit).toMatchObject({
        role: "FIGHTER",
        hp: 6,
        maxHp: 6,
        homeCityId: city.id,
      });
      expect(unit.activation).toMatchObject({
        moved: true,
        attacked: true,
        handled: true,
        specialActed: true,
      });
      expect(unitRoleRuleV7(result.state, unit).label).toBe("Goblin");
    }
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    // An Undead Militia stays one unit (a Human one is two since tuning 3;
    // tests/unit/ruleset-v7-tuning-3.test.ts).
    for (const faction of ["UNDEAD"] as const) {
      const other = rewardState("MILITIA", [], faction);
      const done = applyOkV7(
        other.state,
        other.state.humanPlayerId,
        other.command,
      );
      expect(newUnits(other.state, done.state)).toHaveLength(1);
    }
  });

  // Tuning 6 (`pulp_wars-w49.6`, 7r49): the occupant stays on the center;
  // both Goblins appear beside it (the first used to take the center and
  // displace the occupant).
  it("leaves a center occupant where it is and places both Goblins beside it", () => {
    const fixture = rewardState("MILITIA", ["CENTER"]);
    const city = humanCity(fixture.state);
    const occupant = unitAtV7(fixture.state, city.at);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    expect(result.state.units.find((unit) => unit.id === occupant.id)).toEqual(
      occupant,
    );
    const firstCell = firstOpenAdjacent(fixture.state, city.at, []);
    if (firstCell === undefined) throw new Error("no open cell");
    const [first, second] = newUnits(fixture.state, result.state);
    expect(first?.at).toEqual(firstCell);
    expect(second?.at).toEqual(
      firstOpenAdjacent(fixture.state, city.at, [firstCell]),
    );
    expect(result.events.map((event) => event.kind)).not.toContain(
      "UNIT_SPAWN_DISPLACED",
    );
  });

  it("grants only one Goblin when no adjacent cell is open", () => {
    const fixture = rewardState("MILITIA", ["RING"]);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    expect(newUnits(fixture.state, result.state)).toHaveLength(1);
    expect(
      result.events.filter((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toHaveLength(1);
  });

  it("grants a Troll for the level-5 reward", () => {
    const fixture = rewardState("JUGGERNAUT", []);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const created = newUnits(fixture.state, result.state);
    expect(created).toHaveLength(1);
    const troll = created[0];
    if (troll === undefined) throw new Error("Troll missing");
    expect(troll).toMatchObject({ role: "JUGGERNAUT", hp: 40, maxHp: 40 });
    expect(unitRoleRuleV7(result.state, troll).label).toBe("Troll");
  });

  it("grants a Scrap Buggy with Ram from a treasure chest", () => {
    let seed = 0;
    while (
      nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
        .value !== 1
    )
      seed += 1;
    let state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): a chest gives a tier 3 unit only
    // from round 15 (a Wolf Rider before it).
    state = checkedV7({
      ...state,
      round: 15,
      random: { ...state.random, state: seed },
      treasureChests: [{ x: 5, y: 3 }],
    });
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "MOVE",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      path: [{ x: 5, y: 3 }],
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        kind: "TREASURE_CAPTURED",
        requestedReward: "KNIGHT",
        grantedReward: "KNIGHT",
      }),
    );
    const buggy = result.state.units.find((unit) => unit.role === "KNIGHT");
    if (buggy === undefined) throw new Error("treasure unit missing");
    const rule = unitRoleRuleV7(result.state, buggy);
    expect(rule.label).toBe("Scrap Buggy");
    expect(rule.abilities).toContain("OVERRUN");
    expect(buggy.maxHp).toBe(10);
  });
});

describe("ruleset-7 Goblin training cost", () => {
  it("never lowers the 1-Coin Goblin below 1 with an active Forge (offer equals charge)", () => {
    const base = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
    );
    const actor = base.humanPlayerId;
    const city = cityOf(base, 0);
    const forgeAt = { x: 9, y: 7 };
    const mineAt = { x: 9, y: 8 };
    const contributions: PopulationContributionV7[] = [
      {
        id: base.nextEntityId,
        cityId: city.id,
        category: "LIVE",
        amount: 1,
        source: { kind: "IMPROVEMENT", improvement: "MINE", at: mineAt },
      },
      {
        id: base.nextEntityId + 1,
        cityId: city.id,
        category: "LIVE",
        amount: 1,
        source: { kind: "IMPROVEMENT", improvement: "FORGE", at: forgeAt },
      },
    ];
    const candidate: GameStateV7 = {
      ...base,
      nextEntityId: base.nextEntityId + contributions.length,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          sameV7(tile.at, forgeAt) || sameV7(tile.at, mineAt)
            ? {
                ...tile,
                biome: "HIGHLANDS" as const,
                terrain: "MOUNTAIN" as const,
                resource: sameV7(tile.at, mineAt) ? ("ORE" as const) : null,
                improvement: sameV7(tile.at, mineAt)
                  ? ("MINE" as const)
                  : ("FORGE" as const),
                road: false,
              }
            : tile,
        ),
      },
      populationContributions: contributions,
    };
    const economy = recomputeLiveEconomyV7(
      base,
      candidate,
      candidate.populationContributions,
    );
    const forged = (coins: number) =>
      checkedV7({
        ...candidate,
        players: candidate.players.map((player) =>
          player.id === actor ? { ...player, coins } : player,
        ),
        cities: economy.cities.map((item) =>
          item.id === city.id
            ? {
                ...item,
                level: 2,
                population:
                  item.permanentPopulation + item.economicPopulation - 2,
                rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
              }
            : item,
        ),
        populationContributions: economy.populationContributions,
      });
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    };
    const broke = forged(0);
    expect(queryPlayerCommandsV7(broke, actor)).not.toContainEqual(train);
    expect(applyCommandV7(broke, actor, train)).toMatchObject({
      accepted: false,
      error: { code: "INSUFFICIENT_COINS", params: { cost: 1 } },
    });
    const one = forged(1);
    expect(queryPlayerCommandsV7(one, actor)).toContainEqual(train);
    expect(applyOkV7(one, actor, train).events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_TRAINED", cost: 1 }),
    );
    // The Forge still discounts the other Goblin roles by 1.
    expect(
      applyOkV7(forged(2), actor, { ...train, role: "RAIDER" }).events,
    ).toContainEqual(
      expect.objectContaining({ kind: "UNIT_TRAINED", cost: 2 }),
    );
  });
});

describe("ruleset-7 Goblin Warrens", () => {
  it("adds one capacity to every Goblin-owned city on every capacity surface", () => {
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { techs: { 0: [], 1: [] } },
    );
    const goblinCity = cityOf(state, 0);
    const humanCityState = cityOf(state, 1);
    expect(cityUnitCapacityV7(state, goblinCity)).toBe(goblinCity.level + 2);
    expect(cityUnitCapacityV7(state, humanCityState)).toBe(
      humanCityState.level + 1,
    );
    expect(previewCityCapacityV7(state, goblinCity.id)).toMatchObject({
      capacity: goblinCity.level + 2,
      assigned: 1,
      available: goblinCity.level + 1,
    });
    const planned = checkedV7({
      ...state,
      players: state.players.map((player) => ({
        ...player,
        researchedTechs: ["GATHERING", "ADMINISTRATION", "PLANNING"],
      })),
    });
    expect(cityUnitCapacityV7(planned, goblinCity)).toBe(goblinCity.level + 3);
    expect(cityUnitCapacityV7(planned, humanCityState)).toBe(
      humanCityState.level + 2,
    );
  });

  it("trains up to the Warrens capacity and rejects the next unit", () => {
    // A level-1 Goblin capital holds 3 units (level + 1 + Warrens).
    let state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "FIGHTER", at: { x: 5, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      { techs: { 0: [] } },
    );
    const city = cityOf(state, 0);
    expect(city.level).toBe(1);
    const train: CommandV7 = {
      kind: "TRAIN",
      cityId: city.id,
      role: "FIGHTER",
    };
    expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
      train,
    );
    state = applyOkV7(state, state.humanPlayerId, train).state;
    const spent = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        sameV7(unit.at, city.at) ? { ...unit, at: { x: 3, y: 3 } } : unit,
      ),
      cities: state.cities.map((candidate) => ({
        ...candidate,
        cityActionAvailable: true,
      })),
    });
    expect(applyCommandV7(spent, spent.humanPlayerId, train)).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
    expect(
      queryPlayerCommandsV7(spent, spent.humanPlayerId),
    ).not.toContainEqual(train);
  });

  it("follows the current owner: gained on a Goblin capture, lost when a Goblin city is captured", () => {
    for (const [factions, capturerSeat] of [
      [["GOBLIN", "ORIGINAL"], 0],
      [["ORIGINAL", "GOBLIN"], 0],
    ] as const) {
      const target = cityOf(
        goblinArenaV7(factions, [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        ]),
        1,
      );
      const state = goblinArenaV7(factions, [
        {
          seat: capturerSeat,
          role: "FIGHTER",
          at: target.at,
          captureEligible: true,
        },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ]);
      const before = cityUnitCapacityV7(state, target);
      const captured = applyOkV7(state, state.humanPlayerId, {
        kind: "CAPTURE",
        unitId: unitAtV7(state, target.at).id,
      });
      const after = captured.state.cities.find((city) => city.id === target.id);
      if (after === undefined) throw new Error("city missing");
      expect(after.ownerId).toBe(state.humanPlayerId);
      const goblinCapturer = factions[capturerSeat] === "GOBLIN";
      expect(cityUnitCapacityV7(captured.state, after) - before).toBe(
        goblinCapturer ? 1 : -1,
      );
    }
  });
});

describe("ruleset-7 Goblin persistence", () => {
  it("round-trips Goblin seats through save, replay, and checkpoint hashes", () => {
    const setup = goblinSetupV7(["GOBLIN", "UNDEAD"], 7);
    const match = runAiMatchV7(setup, { maxRounds: 8 });
    expect(match.errors).toEqual([]);
    expect(match.stalls).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events)
        expect(parseEventV7(event).ok).toBe(true);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.factions).toEqual(["GOBLIN", "UNDEAD"]);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-30T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    const swapped = JSON.parse(JSON.stringify(save)) as {
      state: { players: { faction: string; factionTreeId: string }[] };
    };
    const goblinSeat = swapped.state.players[0];
    if (goblinSeat === undefined) throw new Error("seat missing");
    goblinSeat.faction = "ORIGINAL";
    goblinSeat.factionTreeId = "ORIGINAL_BASELINE_V5";
    expect(parseSaveV7(JSON.stringify(swapped)).kind).not.toBe("VALID");
  }, 600_000);

  it("finishes headless Goblin matches without errors or stalls", () => {
    for (const factions of [
      ["GOBLIN", "ORIGINAL"],
      ["UNDEAD", "GOBLIN"],
      ["GOBLIN", "GOBLIN"],
    ] as const) {
      const match = runAiMatchV7(
        { ...goblinSetupV7(factions, 1), mapType: "PANGEA" },
        { maxRounds: 60 },
      );
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(["OUTCOME", "ROUND_CAP"]).toContain(match.termination);
    }
  }, 600_000);
});

class MemoryStorage implements StorageAdapter {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries);
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

/** An 11×11 board whose terrain is given by `terrainAt`. */
function syntheticBoard(
  terrainAt: (at: CoordV7) => "GRASS" | "FOREST" | "MOUNTAIN" | "SHALLOW_WATER",
): BoardStateV7 {
  return {
    width: 11,
    height: 11,
    tiles: Array.from({ length: 121 }, (_, index) => {
      const at = { x: index % 11, y: Math.floor(index / 11) };
      const terrain = terrainAt(at);
      return {
        at,
        biome: terrain === "SHALLOW_WATER" ? null : ("PLAINS" as const),
        terrain,
        resource: null,
        improvement: null,
        road: false,
        fieldDefense: false,
        site: null,
        territoryCityId: null,
      };
    }),
  };
}

function cityOf(state: GameStateV7, seat: number) {
  const ownerId = seatIdV7(state, seat);
  const city = state.cities.find((candidate) => candidate.ownerId === ownerId);
  if (city === undefined) throw new Error("city missing");
  return city;
}

function humanCity(state: GameStateV7) {
  return cityOf(state, 0);
}

function newUnits(before: GameStateV7, after: GameStateV7) {
  return after.units
    .filter((unit) => !before.units.some((old) => old.id === unit.id))
    .sort((left, right) => left.id - right.id);
}

/** The reward displacement rule from the test side (land, free, not a chest). */
function firstOpenAdjacent(
  state: GameStateV7,
  center: CoordV7,
  taken: readonly CoordV7[],
): CoordV7 | undefined {
  for (let y = center.y - 1; y <= center.y + 1; y += 1)
    for (let x = center.x - 1; x <= center.x + 1; x += 1) {
      const at = { x, y };
      if (sameV7(at, center)) continue;
      const tile = state.board.tiles.find((item) => sameV7(item.at, at));
      if (
        tile !== undefined &&
        tile.biome !== null &&
        !state.treasureChests.some((chest) => sameV7(chest, at)) &&
        !taken.some((other) => sameV7(other, at)) &&
        !state.units.some((unit) => sameV7(unit.at, at))
      )
        return at;
    }
  return undefined;
}

/**
 * A Goblin (or other) seat-0 capital ready to choose `reward`, with every
 * technology (Engineering makes Mountains enterable). `CENTER` puts an own
 * Goblin on the city center; `RING` fills every adjacent cell with own
 * units.
 */
function rewardState(
  reward: "MILITIA" | "JUGGERNAUT",
  blockers: readonly ("CENTER" | "RING")[],
  faction: FactionIdV7 = "GOBLIN",
): {
  readonly state: GameStateV7;
  readonly command: Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }>;
} {
  const factions = [faction, "ORIGINAL"] as const;
  const probe = goblinArenaV7(factions, []);
  const city = cityOf(probe, 0);
  const ring: CoordV7[] = [];
  for (let y = city.at.y - 1; y <= city.at.y + 1; y += 1)
    for (let x = city.at.x - 1; x <= city.at.x + 1; x += 1)
      if (x !== city.at.x || y !== city.at.y) ring.push({ x, y });
  const base = goblinArenaV7(factions, [
    { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
    ...(blockers.includes("CENTER")
      ? [{ seat: 0, role: "FIGHTER" as const, at: city.at }]
      : []),
    ...(blockers.includes("RING")
      ? ring.map((at) => ({ seat: 0, role: "FIGHTER" as const, at }))
      : []),
  ]);
  const reachedLevel = reward === "MILITIA" ? 3 : 5;
  const addedPopulation = reward === "MILITIA" ? 6 : 14;
  const growthTiles = base.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null,
    )
    .slice(0, addedPopulation / 2);
  if (growthTiles.length !== addedPopulation / 2)
    throw new Error("reward growth tiles missing");
  const economicPopulation = city.economicPopulation + addedPopulation;
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation,
    economicPopulation,
  ).city;
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + growthTiles.length,
    cities: base.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...grown,
            economicPopulation,
            cityActionAvailable: true,
            rewards:
              reward === "MILITIA"
                ? [{ reachedLevel: 2, reward: "SURVEY" as const }]
                : [
                    { reachedLevel: 2, reward: "SURVEY" as const },
                    { reachedLevel: 3, reward: "WALLS" as const },
                    { reachedLevel: 4, reward: "TREASURY_6" as const },
                  ],
          }
        : candidate,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        growthTiles.some((growth) => sameV7(growth.at, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: growthTiles.map((tile, index) => ({
      id: base.nextEntityId + index,
      cityId: city.id,
      category: "LIVE" as const,
      amount: 2,
      source: {
        kind: "IMPROVEMENT" as const,
        improvement: "FARM" as const,
        at: tile.at,
      },
    })),
    pendingChoices: [
      {
        kind: "CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel,
        candidates:
          reward === "MILITIA"
            ? (["WALLS", "MILITIA"] as const)
            : (["JUGGERNAUT", "TREASURY", "BARRACKS"] as const),
      },
    ],
  });
  return {
    state,
    command: {
      kind: "CHOOSE_CITY_REWARD",
      cityId: city.id,
      reachedLevel,
      reward,
    },
  };
}
