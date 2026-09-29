import { describe, expect, it } from "vitest";
import {
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  ORIGINAL_BASELINE_V5_NODES,
  ORIGINAL_ROLE_RULES_V7,
  RULESET_7,
  RULESET_7_ID,
  UNDEAD_BASELINE_V1_NODES,
  UNDEAD_ROLE_RULES_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  appendReplayCommandV7,
  applyCommandV7,
  assertRuleset7Registry,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionTreeIdV7,
  factionTreeV7,
  nextBounded,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  parseReplayJsonV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyCapabilitiesV7,
  queryTechnologyTreeV7,
  resolveCityGrowthV7,
  runReplayV7,
  technologyCapabilitiesV7,
  unitId,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type UnitRoleIdV7,
  type UnitStateV7,
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
import { allTechsV7, checkedV7, exploredAllV7 } from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
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
};

describe("ruleset-7 revision-13 identity and faction registration", () => {
  it("pins the r13 identity, frozen faction and tree orders, and bindings", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r13");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r13.current");
    expect(FACTION_IDS_V7).toEqual(["ORIGINAL", "UNDEAD"]);
    expect(FACTION_TREE_IDS_V7).toEqual([
      "ORIGINAL_BASELINE_V5",
      "UNDEAD_BASELINE_V1",
    ]);
    expect(factionTreeIdV7("ORIGINAL")).toBe("ORIGINAL_BASELINE_V5");
    expect(factionTreeIdV7("UNDEAD")).toBe("UNDEAD_BASELINE_V1");
    expect(FACTION_DISPLAY_NAMES_V7).toEqual({
      ORIGINAL: "Human",
      UNDEAD: "Undead",
    });
    expect(Object.keys(RULESET_7.factionTrees)).toEqual(["ORIGINAL", "UNDEAD"]);
    expect(FACTION_TREES_V7.UNDEAD.faction).toBe("UNDEAD");
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(() => factionTreeV7("CANDY" as FactionIdV7)).toThrow(RangeError);
    expect(() =>
      effectiveRoleRuleV7("FIGHTER", "CANDY" as FactionIdV7),
    ).toThrow(RangeError);
  });

  it("cleans obsolete keys through v7r12 and preserves the r13 save", () => {
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r12.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toHaveLength(12);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r11.current", "r11"],
      ["pulpWars.save.v7r12.current", "r12"],
      [SAVE_STORAGE_KEY_V7, "r13"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r11.current",
        "pulpWars.save.v7r12.current",
      ],
      removedCount: 2,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
    ]);
  });

  it("rejects revision-12 setups, states, replays, and saves without migration", () => {
    const setup = setupWith(["ORIGINAL", "UNDEAD"], 9);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r12" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({ ...created.state, rulesetId: "pulp-wars-poc-7r12" }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r12",
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
      "2026-09-29T10:00:00.000Z",
    );
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r12",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r12" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 per-seat factions", () => {
  it("accepts every faction combination and rejects unknown factions", () => {
    for (const factions of [
      ["ORIGINAL", "ORIGINAL"],
      ["ORIGINAL", "UNDEAD"],
      ["UNDEAD", "ORIGINAL"],
      ["UNDEAD", "UNDEAD"],
    ] as const)
      expect(parseMatchSetupV7(setupWith(factions))?.factions).toEqual(
        factions,
      );
    expect(
      parseMatchSetupV7(
        setupWith(["UNDEAD", "ORIGINAL", "UNDEAD", "UNDEAD"], 5),
      )?.factions,
    ).toEqual(["UNDEAD", "ORIGINAL", "UNDEAD", "UNDEAD"]);
    for (const factions of [
      ["ORIGINAL", "CANDY"],
      ["undead", "ORIGINAL"],
      ["UNDEAD"],
      ["UNDEAD", "UNDEAD", "UNDEAD"],
    ])
      expect(
        parseMatchSetupV7({ ...setupWith(["ORIGINAL", "ORIGINAL"]), factions }),
      ).toBeNull();
  });

  it("binds each seat's faction and tree and starts it with its own FIGHTER", () => {
    const created = createPlayableGameV7(
      setupWith(["UNDEAD", "ORIGINAL", "UNDEAD"], 11),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [
        player.seat,
        player.faction,
        player.factionTreeId,
        player.researchedTechs,
      ]),
    ).toEqual([
      [0, "UNDEAD", "UNDEAD_BASELINE_V1", []],
      [1, "ORIGINAL", "ORIGINAL_BASELINE_V5", []],
      [2, "UNDEAD", "UNDEAD_BASELINE_V1", []],
    ]);
    for (const unit of state.units) {
      expect(unit).toMatchObject({ role: "FIGHTER", hp: 10, maxHp: 10 });
      expect(unitRoleRuleV7(state, unit).label).toBe(
        playerOf(state, unit.ownerId).faction === "UNDEAD"
          ? "Skeleton"
          : "Fighter",
      );
    }
    const view = viewForV7(state, state.humanPlayerId);
    expect(
      view.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["UNDEAD", "UNDEAD_BASELINE_V1"],
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["UNDEAD", "UNDEAD_BASELINE_V1"],
    ]);
    expect(
      Object.fromEntries(
        view.leaderboard.map((entry) => [entry.playerId, entry.faction]),
      ),
    ).toEqual(
      Object.fromEntries(
        state.players.map((player) => [player.id, player.faction]),
      ),
    );
  });

  it("rejects a player whose faction or tree disagrees with the setup", () => {
    const created = createPlayableGameV7(setupWith(["ORIGINAL", "UNDEAD"], 3));
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(parseGameStateV7(state)).toEqual(state);
    const withPlayer = (patch: Record<string, unknown>) => ({
      ...state,
      players: state.players.map((player, index) =>
        index === 1 ? { ...player, ...patch } : player,
      ),
    });
    expect(
      parseGameStateV7(
        withPlayer({
          faction: "ORIGINAL",
          factionTreeId: "ORIGINAL_BASELINE_V5",
        }),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7(withPlayer({ factionTreeId: "ORIGINAL_BASELINE_V5" })),
    ).toBeNull();
    expect(
      parseGameStateV7(
        withPlayer({ faction: "CANDY", factionTreeId: "UNDEAD_BASELINE_V1" }),
      ),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        setup: { ...state.setup, factions: ["ORIGINAL", "ORIGINAL"] },
      }),
    ).toBeNull();
  });

  it("generates identical boards, turn orders, treasure, and PRNG for any factions", () => {
    for (const [seed, mapType, aiCount] of [
      [1, "DRY_LAND", 1],
      [42, "CONTINENTS", 2],
      [77, "ARCHIPELAGO", 3],
      [123, "LAKES", 1],
    ] as const) {
      const humans = Array.from(
        { length: aiCount + 1 },
        () => "ORIGINAL" as const,
      );
      const mixed = humans.map((_, seat) =>
        seat % 2 === 0 ? ("UNDEAD" as const) : ("ORIGINAL" as const),
      );
      const undead = humans.map(() => "UNDEAD" as const);
      const [reference, ...others] = [humans, mixed, undead].map((factions) => {
        const created = createInitialMapStateV7({
          ...setupWith(factions, seed),
          mapType,
        });
        if (!created.ok) throw new Error(created.error.code);
        return created.state;
      });
      for (const other of others) {
        if (reference === undefined || other === undefined)
          throw new Error("state missing");
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect(other.units).toEqual(reference.units);
        expect(other.nextEntityId).toBe(reference.nextEntityId);
        expect(other.players.map(withoutFaction)).toEqual(
          reference.players.map(withoutFaction),
        );
      }
    }
  });

  it("round-trips mixed factions through save, replay, and checkpoint hashes", () => {
    const setup = setupWith(["UNDEAD", "ORIGINAL"], 7);
    const match = runAiMatchV7(setup, { maxRounds: 8 });
    expect(match.errors).toEqual([]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);

    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.factions).toEqual(["UNDEAD", "ORIGINAL"]);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.state.players.map((player) => player.faction)).toEqual([
      "UNDEAD",
      "ORIGINAL",
    ]);
    const swapped = JSON.parse(JSON.stringify(save)) as {
      state: { players: { faction: string; factionTreeId: string }[] };
    };
    const undeadSeat = swapped.state.players[0];
    if (undeadSeat === undefined) throw new Error("seat missing");
    undeadSeat.faction = "ORIGINAL";
    undeadSeat.factionTreeId = "ORIGINAL_BASELINE_V5";
    expect(parseSaveV7(JSON.stringify(swapped)).kind).not.toBe("VALID");
    // Changing only the replay setup changes the canonical start and every
    // checkpoint, so the replay no longer verifies.
    expect(() =>
      runReplayV7({
        ...replay,
        setup: { ...replay.setup, factions: ["ORIGINAL", "ORIGINAL"] },
      }),
    ).toThrow();
  });
});

describe("ruleset-7 Undead roster and technology registration", () => {
  it("registers every Undead role value from the revision-13 roster", () => {
    const expected: Record<
      UnitRoleIdV7,
      readonly [
        string,
        number | null,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        string | null,
        boolean,
        readonly string[],
      ]
    > = {
      FIGHTER: [
        "Skeleton",
        2,
        10,
        4,
        4,
        1,
        1,
        1,
        1,
        null,
        true,
        ["ATTACK", "CAPTURE"],
      ],
      RAIDER: [
        "Ghoul",
        3,
        10,
        4,
        2,
        2,
        1,
        1,
        2,
        "SCOUTING",
        true,
        ["ATTACK", "CAPTURE", "CHARGE", "DEVOUR"],
      ],
      MARKSMAN: [
        "Banshee",
        3,
        8,
        2,
        2,
        1,
        0,
        0,
        1,
        "MARKSMANSHIP",
        true,
        ["CAPTURE", "WAIL"],
      ],
      GUARD: [
        "Zombie",
        3,
        20,
        4,
        4,
        1,
        1,
        1,
        1,
        "DRILL",
        false,
        ["ATTACK", "CAPTURE", "INFECT"],
      ],
      CAPTAIN: [
        "Necromancer",
        5,
        10,
        2,
        2,
        1,
        1,
        1,
        1,
        "ADMINISTRATION",
        true,
        ["ATTACK", "RALLY", "RAISE_DEAD"],
      ],
      CATAPULT: [
        "Lich",
        8,
        10,
        5,
        2,
        1,
        3,
        2,
        1,
        "SAWMILLING",
        false,
        ["ATTACK"],
      ],
      KNIGHT: [
        "Vampire",
        9,
        10,
        6,
        2,
        3,
        1,
        1,
        1,
        "CHIVALRY",
        true,
        ["ATTACK", "LIFESTEAL"],
      ],
      JUGGERNAUT: [
        "Abomination",
        null,
        40,
        8,
        8,
        1,
        1,
        1,
        1,
        null,
        true,
        ["ATTACK", "CAPTURE", "PUSH"],
      ],
      PATROL_BOAT: [
        "Patrol Boat",
        5,
        10,
        4,
        4,
        3,
        1,
        1,
        2,
        "SHORECRAFT",
        true,
        ["ATTACK"],
      ],
      BATTLESHIP: [
        "Battleship",
        16,
        25,
        12,
        8,
        2,
        3,
        1,
        3,
        "NAVAL_ENGINEERING",
        false,
        ["ATTACK"],
      ],
    };
    for (const role of UNIT_ROLE_IDS_V7) {
      const rule = effectiveRoleRuleV7(role, "UNDEAD");
      expect(rule).toBe(UNDEAD_ROLE_RULES_V7[role]);
      expect([
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2,
        rule.defense2,
        rule.move,
        rule.range,
        rule.minimumRange,
        rule.sightRadius,
        rule.technology,
        rule.mayUsePrimaryActionAfterMove,
        rule.abilities,
      ]).toEqual(expected[role]);
      expect(rule.role).toBe(role);
      expect(rule.tacticalRole).toBe(ORIGINAL_ROLE_RULES_V7[role].tacticalRole);
    }
    expect(UNDEAD_ROLE_RULES_V7.PATROL_BOAT).toEqual(
      ORIGINAL_ROLE_RULES_V7.PATROL_BOAT,
    );
    expect(UNDEAD_ROLE_RULES_V7.BATTLESHIP).toEqual(
      ORIGINAL_ROLE_RULES_V7.BATTLESHIP,
    );
    // Disband refunds floor(cost / 2): Skeleton through Vampire 1,1,1,1,2,4,4.
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
        Math.floor((effectiveRoleRuleV7(role, "UNDEAD").cost ?? 0) / 2),
      ),
    ).toEqual([1, 1, 1, 1, 2, 4, 4]);
  });

  it("keeps the Human registration at its revision-12 values", () => {
    expect(
      UNIT_ROLE_IDS_V7.map((role) => {
        const rule = effectiveRoleRuleV7(role, "ORIGINAL");
        return [
          rule.label,
          rule.cost,
          rule.maxHp,
          rule.attack2,
          rule.defense2,
          rule.move,
          rule.range,
          rule.minimumRange,
          rule.abilities.join("+"),
        ];
      }),
    ).toEqual([
      ["Fighter", 2, 10, 4, 4, 1, 1, 1, "ATTACK+CAPTURE"],
      ["Raider", 4, 10, 4, 2, 2, 1, 1, "ATTACK+CAPTURE+CHARGE+ESCAPE"],
      ["Marksman", 3, 10, 4, 2, 1, 2, 1, "ATTACK+CAPTURE"],
      ["Guard", 3, 15, 3, 6, 1, 1, 1, "ATTACK+CAPTURE"],
      ["Captain", 5, 10, 2, 2, 1, 1, 1, "ATTACK+RALLY+TEND_WOUNDED"],
      ["Catapult", 8, 10, 7, 1, 1, 3, 2, "ATTACK"],
      ["Knight", 9, 10, 6, 2, 3, 1, 1, "ATTACK+OVERRUN"],
      ["Juggernaut", null, 40, 8, 8, 1, 1, 1, "ATTACK+CAPTURE+PUSH"],
      ["Patrol Boat", 5, 10, 4, 4, 3, 1, 1, "ATTACK"],
      ["Battleship", 16, 25, 12, 8, 2, 3, 1, "ATTACK"],
    ]);
  });

  it("differs from the Human graph only in the Administration and Chivalry unlocks", () => {
    expect(UNDEAD_BASELINE_V1_NODES).toHaveLength(
      ORIGINAL_BASELINE_V5_NODES.length,
    );
    ORIGINAL_BASELINE_V5_NODES.forEach((human, index) => {
      const undead = UNDEAD_BASELINE_V1_NODES[index];
      if (undead === undefined) throw new Error("node missing");
      expect([
        undead.id,
        undead.branch,
        undead.tier,
        undead.prerequisites,
      ]).toEqual([human.id, human.branch, human.tier, human.prerequisites]);
      expect(undead.unlockedRoles).toEqual(human.unlockedRoles);
      if (human.id === "ADMINISTRATION")
        expect(undead.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "NECROMANCER_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "CHIVALRY")
        expect(undead.unlocks).toEqual(
          human.unlocks.filter((unlock) => unlock.kind !== "OVERRUN"),
        );
      else expect(undead.unlocks).toEqual(human.unlocks);
    });
  });

  it("resolves technology capabilities through the faction registration", () => {
    const human = technologyCapabilitiesV7(
      ["SCOUTING", "CHIVALRY"],
      "ORIGINAL",
    );
    const undead = technologyCapabilitiesV7(["CHIVALRY", "SCOUTING"], "UNDEAD");
    expect(human.treeId).toBe("ORIGINAL_BASELINE_V5");
    expect(undead.treeId).toBe("UNDEAD_BASELINE_V1");
    expect(undead.roleBindings).toBe(UNDEAD_ROLE_RULES_V7);
    expect(human.roleBindings).toBe(ORIGINAL_ROLE_RULES_V7);
    expect(undead).toBe(
      technologyCapabilitiesV7(["SCOUTING", "CHIVALRY"], "UNDEAD"),
    );
    expect(undead.trainableRoles).toEqual(human.trainableRoles);
    expect(undead.roleSightRadius).toEqual({ RAIDER: 2 });
    const all = technologyCapabilitiesV7(
      ORIGINAL_BASELINE_V5_NODES.map((node) => node.id),
      "UNDEAD",
    );
    expect(all.trainableRoles).toEqual(
      UNIT_ROLE_IDS_V7.filter((role) => role !== "JUGGERNAUT"),
    );
    expect(all.forestMovementFreedomRoles).toEqual(["RAIDER", "MARKSMAN"]);
  });

  it("serves each viewer its own tree, unlocks, and role labels", () => {
    const state = arena(["UNDEAD", "ORIGINAL"], []);
    const enemyId = enemyOf(state);
    const undeadTree = queryTechnologyTreeV7(state, state.humanPlayerId);
    const humanTree = queryTechnologyTreeV7(state, enemyId);
    expect([undeadTree.id, undeadTree.faction]).toEqual([
      "UNDEAD_BASELINE_V1",
      "UNDEAD",
    ]);
    expect([humanTree.id, humanTree.faction]).toEqual([
      "ORIGINAL_BASELINE_V5",
      "ORIGINAL",
    ]);
    expect(undeadTree.roleBindings).toBe(UNDEAD_ROLE_RULES_V7);
    const labels = (tree: typeof undeadTree) =>
      Object.fromEntries(
        tree.nodes
          .filter((node) => node.unlockedRoleRules.length > 0)
          .map((node) => [
            node.id,
            node.unlockedRoleRules.map((rule) => rule.label).join(","),
          ]),
      );
    expect(labels(undeadTree)).toEqual({
      ADMINISTRATION: "Necromancer",
      SAWMILLING: "Lich",
      MARKSMANSHIP: "Banshee",
      SCOUTING: "Ghoul",
      CHIVALRY: "Vampire",
      DRILL: "Zombie",
      SHORECRAFT: "Patrol Boat",
      NAVAL_ENGINEERING: "Battleship",
    });
    expect(labels(humanTree)).toEqual({
      ADMINISTRATION: "Captain",
      SAWMILLING: "Catapult",
      MARKSMANSHIP: "Marksman",
      SCOUTING: "Raider",
      CHIVALRY: "Knight",
      DRILL: "Guard",
      SHORECRAFT: "Patrol Boat",
      NAVAL_ENGINEERING: "Battleship",
    });
    const effects = (tree: typeof undeadTree, id: string) =>
      tree.nodes.find((node) => node.id === id)?.effects.map((e) => e.kind);
    expect(effects(undeadTree, "ADMINISTRATION")).toContain(
      "NECROMANCER_SUPPORT",
    );
    expect(effects(undeadTree, "ADMINISTRATION")).not.toContain(
      "CAPTAIN_SUPPORT",
    );
    expect(effects(undeadTree, "CHIVALRY")).not.toContain("OVERRUN");
    expect(effects(humanTree, "ADMINISTRATION")).toContain("CAPTAIN_SUPPORT");
    expect(effects(humanTree, "CHIVALRY")).toContain("OVERRUN");
    expect(
      queryTechnologyCapabilitiesV7(state, state.humanPlayerId).treeId,
    ).toBe("UNDEAD_BASELINE_V1");

    const administration = undeadTree.nodes.find(
      (node) => node.id === "ADMINISTRATION",
    );
    const fieldcraft = undeadTree.nodes.find(
      (node) => node.id === "FIELDCRAFT",
    );
    if (administration === undefined || fieldcraft === undefined)
      throw new Error("node missing");
    const text = (
      effects: typeof administration.effects,
      faction: FactionIdV7,
    ) =>
      technologyEffectGroupsV7(effects, faction).flatMap(
        (group) => group.items,
      );
    expect(text(administration.effects, "UNDEAD")).toEqual(
      expect.arrayContaining([
        "Train Necromancer",
        "Necromancers Frenzy nearby troops or Raise Dead",
      ]),
    );
    expect(text(fieldcraft.effects, "UNDEAD")).toEqual(
      expect.arrayContaining([
        "Ghoul and Banshee move freely through forest",
        "Banshee sight 2",
      ]),
    );
    expect(text(fieldcraft.effects, "ORIGINAL")).toEqual(
      expect.arrayContaining([
        "Raider and Marksman move freely through forest",
        "Marksman sight 2",
      ]),
    );
  });
});

describe("ruleset-7 Undead training and substitutions", () => {
  it("trains every trainable Undead role at its own cost and HP", () => {
    for (const role of [
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
    ] as const) {
      const state = trainingState(["UNDEAD", "ORIGINAL"]);
      const cityId = humanCity(state).id;
      const rule = effectiveRoleRuleV7(role, "UNDEAD");
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "TRAIN",
        cityId,
        role,
      });
      if (!result.accepted) throw new Error(`${role}: ${result.error.code}`);
      expect(result.events[0]).toMatchObject({
        kind: "UNIT_TRAINED",
        role,
        cost: rule.cost,
      });
      expect(result.events.every((event) => parseEventV7(event).ok)).toBe(true);
      const trained = result.state.units.find(
        (unit) => !state.units.some((before) => before.id === unit.id),
      );
      expect(trained).toMatchObject({
        role,
        hp: rule.maxHp,
        maxHp: rule.maxHp,
      });
    }
  });

  it("offers and charges the Ghoul at 3 Coins while the Human Raider stays at 4", () => {
    const undead = withCoins(trainingState(["UNDEAD", "ORIGINAL"]), 3);
    const human = withCoins(trainingState(["ORIGINAL", "UNDEAD"]), 3);
    const offersRaider = (state: GameStateV7) =>
      queryPlayerCommandsV7(state, state.humanPlayerId).some(
        (command) => command.kind === "TRAIN" && command.role === "RAIDER",
      );
    expect(offersRaider(undead)).toBe(true);
    expect(offersRaider(human)).toBe(false);
    expect(
      applyCommandV7(human, human.humanPlayerId, {
        kind: "TRAIN",
        cityId: humanCity(human).id,
        role: "RAIDER",
      }),
    ).toMatchObject({ accepted: false, error: { code: "INSUFFICIENT_COINS" } });
    const trained = applyCommandV7(undead, undead.humanPlayerId, {
      kind: "TRAIN",
      cityId: humanCity(undead).id,
      role: "RAIDER",
    });
    if (!trained.accepted) throw new Error(trained.error.code);
    expect(playerOf(trained.state, undead.humanPlayerId).coins).toBe(0);
  });

  it("refunds half of the Undead cost on Disband", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "RAIDER", at: { x: 2, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 5, y: 5 } },
      ],
    );
    const ghoul = ownUnit(state, "RAIDER");
    const before = playerOf(state, state.humanPlayerId).coins;
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "DISBAND",
      unitId: ghoul.id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_DISBANDED",
      coinDelta: 1,
    });
    expect(parseEventV7(result.events[0]).ok).toBe(true);
    expect(playerOf(result.state, state.humanPlayerId).coins).toBe(before + 1);
  });

  it("grants the owner's Skeleton for Militia and Abomination for the level-5 reward", () => {
    for (const [reward, role, maxHp, label] of [
      ["MILITIA", "FIGHTER", 10, "Skeleton"],
      ["JUGGERNAUT", "JUGGERNAUT", 40, "Abomination"],
    ] as const) {
      for (const faction of ["UNDEAD", "ORIGINAL"] as const) {
        const fixture = rewardState(faction, reward);
        const result = applyCommandV7(
          fixture.state,
          fixture.state.humanPlayerId,
          fixture.command,
        );
        if (!result.accepted) throw new Error(result.error.code);
        expect(result.events).toContainEqual(
          expect.objectContaining({ kind: "UNIT_REWARD_GRANTED", role }),
        );
        const granted = result.state.units.find(
          (unit) =>
            !fixture.state.units.some((before) => before.id === unit.id),
        );
        if (granted === undefined) throw new Error("reward unit missing");
        expect(granted).toMatchObject({ role, hp: maxHp, maxHp });
        expect(unitRoleRuleV7(result.state, granted).label).toBe(
          faction === "UNDEAD"
            ? label
            : effectiveRoleRuleV7(role, "ORIGINAL").label,
        );
      }
    }
  });

  it("grants a Vampire from a treasure chest to an Undead seat", () => {
    let seed = 0;
    while (
      nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
        .value !== 1
    )
      seed += 1;
    for (const faction of ["UNDEAD", "ORIGINAL"] as const) {
      let state = arena(
        [faction, "ORIGINAL"],
        [
          { own: true, role: "FIGHTER", at: { x: 1, y: 1 } },
          { own: false, role: "FIGHTER", at: { x: 9, y: 9 } },
        ],
      );
      state = checkedV7({
        ...state,
        random: { ...state.random, state: seed },
        treasureChests: [{ x: 2, y: 1 }],
        board: patchTiles(state, [{ x: 2, y: 1 }]),
      });
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "MOVE",
        unitId: ownUnit(state, "FIGHTER").id,
        path: [{ x: 2, y: 1 }],
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events).toContainEqual(
        expect.objectContaining({
          kind: "TREASURE_CAPTURED",
          requestedReward: "KNIGHT",
          grantedReward: "KNIGHT",
        }),
      );
      const knight = result.state.units.find((unit) => unit.role === "KNIGHT");
      if (knight === undefined) throw new Error("treasure unit missing");
      const rule = unitRoleRuleV7(result.state, knight);
      expect(rule.label).toBe(faction === "UNDEAD" ? "Vampire" : "Knight");
      expect(rule.abilities.includes("OVERRUN")).toBe(faction === "ORIGINAL");
      expect(knight.maxHp).toBe(rule.maxHp);
    }
  });

  it("counts Undead trainable roles for Muster and excludes the Abomination", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "FIGHTER", at: { x: 1, y: 1 } },
        { own: true, role: "RAIDER", at: { x: 2, y: 2 } },
        { own: true, role: "MARKSMAN", at: { x: 3, y: 2 } },
        { own: true, role: "JUGGERNAUT", at: { x: 4, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 9, y: 9 } },
      ],
    );
    expect(
      achievementProgressV7(state, state.humanPlayerId).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 3 });
  });
});

describe("ruleset-7 role rules resolve through the owner's faction", () => {
  it("gives the Human Knight Overrun and the Vampire none", () => {
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      const state = arena(
        [faction, "ORIGINAL"],
        [
          { own: true, role: "KNIGHT", at: { x: 2, y: 2 } },
          { own: false, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 1 },
          { own: false, role: "GUARD", at: { x: 4, y: 2 } },
        ],
      );
      const knight = ownUnit(state, "KNIGHT");
      const target = enemyUnitAt(state, { x: 3, y: 2 });
      const overrun = faction === "ORIGINAL";
      expect(
        queryCombatPreviewV7(state, state.humanPlayerId, knight.id, target.id),
      ).toMatchObject({
        defenderDies: true,
        advances: true,
        overrunAdvance: overrun,
        overrunContinues: overrun,
      });
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: knight.id,
        targetUnitId: target.id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events[0]).toMatchObject({
        kind: "COMBAT_RESOLVED",
        preview: {
          advances: true,
          overrunAdvance: overrun,
          overrunContinues: overrun,
          attacksRemaining: overrun ? 1 : 0,
        },
      });
      const after = result.state.units.find((unit) => unit.id === knight.id);
      expect(after?.at).toEqual({ x: 3, y: 2 });
      expect(after?.activation.overrunActive).toBe(overrun);
      const guard = enemyUnitAt(result.state, { x: 4, y: 2 });
      expect(
        applyCommandV7(result.state, state.humanPlayerId, {
          kind: "ATTACK",
          unitId: knight.id,
          targetUnitId: guard.id,
        }).accepted,
      ).toBe(overrun);
    }
  });

  it("keeps Human Overrun against Undead defenders in a mixed match", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { own: true, role: "KNIGHT", at: { x: 2, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 1 },
        { own: false, role: "GUARD", at: { x: 4, y: 2 } },
      ],
    );
    const result = applyCommandV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: ownUnit(state, "KNIGHT").id,
      targetUnitId: enemyUnitAt(state, { x: 3, y: 2 }).id,
    });
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.events[0]).toMatchObject({
      kind: "COMBAT_RESOLVED",
      preview: { overrunContinues: true },
    });
  });

  it("gives the Human Raider Escape and the Ghoul none", () => {
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      const state = arena(
        [faction, "ORIGINAL"],
        [
          { own: true, role: "RAIDER", at: { x: 2, y: 2 } },
          { own: false, role: "GUARD", at: { x: 3, y: 2 } },
        ],
      );
      const raider = ownUnit(state, "RAIDER");
      const target = enemyUnitAt(state, { x: 3, y: 2 });
      const escape = faction === "ORIGINAL";
      expect(
        queryCombatPreviewV7(state, state.humanPlayerId, raider.id, target.id)
          ?.escapeAvailable,
      ).toBe(escape);
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: raider.id,
        targetUnitId: target.id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(
        result.state.units.find((unit) => unit.id === raider.id)?.activation
          .escapeAvailable,
      ).toBe(escape);
      expect(
        queryPlayerCommandsV7(result.state, state.humanPlayerId).some(
          (command) => command.kind === "MOVE" && command.unitId === raider.id,
        ),
      ).toBe(escape);
    }
  });

  it("advances the Human Guard after a kill but never the Zombie", () => {
    for (const faction of ["ORIGINAL", "UNDEAD"] as const) {
      const state = arena(
        [faction, "ORIGINAL"],
        [
          { own: true, role: "GUARD", at: { x: 2, y: 2 } },
          { own: false, role: "FIGHTER", at: { x: 3, y: 2 }, hp: 1 },
        ],
      );
      const guard = ownUnit(state, "GUARD");
      const target = enemyUnitAt(state, { x: 3, y: 2 });
      const advances = faction === "ORIGINAL";
      expect(
        queryCombatPreviewV7(state, state.humanPlayerId, guard.id, target.id),
      ).toMatchObject({ defenderDies: true, advances });
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: guard.id,
        targetUnitId: target.id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(
        result.state.units.find((unit) => unit.id === guard.id)?.at,
      ).toEqual(advances ? { x: 3, y: 2 } : { x: 2, y: 2 });
      expect(result.events.some((event) => event.kind === "UNIT_MOVED")).toBe(
        advances,
      );
    }
  });

  it("gives the Banshee no Attack and no retaliation", () => {
    const own = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "MARKSMAN", at: { x: 2, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    );
    const banshee = ownUnit(own, "MARKSMAN");
    const target = enemyUnitAt(own, { x: 3, y: 2 });
    expect(
      queryPlayerCommandsV7(own, own.humanPlayerId).some(
        (command) => command.kind === "ATTACK",
      ),
    ).toBe(false);
    expect(
      queryCombatPreviewV7(own, own.humanPlayerId, banshee.id, target.id),
    ).toBeNull();
    expect(
      applyCommandV7(own, own.humanPlayerId, {
        kind: "ATTACK",
        unitId: banshee.id,
        targetUnitId: target.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "ATTACK_NOT_LEGAL", params: { reason: "NO_ATTACK" } },
    });
    expect(publicUnitStatsV7(own, banshee)).toMatchObject({
      minimumRange: 0,
      maximumRange: 0,
      abilities: ["CAPTURE", "WAIL"],
    });

    for (const faction of ["UNDEAD", "ORIGINAL"] as const) {
      const state = arena(
        ["ORIGINAL", faction],
        [
          { own: true, role: "FIGHTER", at: { x: 2, y: 2 } },
          { own: false, role: "MARKSMAN", at: { x: 3, y: 2 } },
        ],
      );
      const fighter = ownUnit(state, "FIGHTER");
      const marksman = enemyUnitAt(state, { x: 3, y: 2 });
      const result = applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: fighter.id,
        targetUnitId: marksman.id,
      });
      if (!result.accepted) throw new Error(result.error.code);
      expect(result.events[0]).toMatchObject({
        kind: "COMBAT_RESOLVED",
        preview: {
          defenderDies: false,
          retaliation: faction === "ORIGINAL",
          ...(faction === "UNDEAD"
            ? { damageToAttacker: 0, noRetaliationReason: "OUT_OF_RANGE" }
            : {}),
        },
      });
    }
  });

  it("gives the Lich Catapult range, no attack after moving, and its own Attack", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "CATAPULT", at: { x: 2, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 4, y: 2 } },
        { own: false, role: "GUARD", at: { x: 3, y: 3 } },
      ],
    );
    const lich = ownUnit(state, "CATAPULT");
    const far = enemyUnitAt(state, { x: 4, y: 2 });
    const near = enemyUnitAt(state, { x: 3, y: 3 });
    const attacks = queryPlayerCommandsV7(state, state.humanPlayerId).filter(
      (command): command is Extract<CommandV7, { kind: "ATTACK" }> =>
        command.kind === "ATTACK",
    );
    expect(attacks.map((command) => command.targetUnitId)).toEqual([far.id]);
    expect(
      queryCombatPreviewV7(state, state.humanPlayerId, lich.id, far.id),
    ).toMatchObject({
      attack2: 5,
      minimumRange: 2,
      maximumRange: 3,
      advances: false,
      splash: [],
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: lich.id,
        targetUnitId: near.id,
      }).accepted,
    ).toBe(false);
    const moved = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === lich.id
          ? {
              ...unit,
              activation: { ...READY, moved: true, movedPathLength: 1 },
            }
          : unit,
      ),
    });
    expect(
      applyCommandV7(moved, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: lich.id,
        targetUnitId: far.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ALREADY_ACTED" },
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "ATTACK",
        unitId: lich.id,
        targetUnitId: far.id,
      }).accepted,
    ).toBe(true);
  });

  it("limits Frenzy to adjacent own attackers that are not support, siege, or Banshee", () => {
    const onlyIneligible = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { own: true, role: "MARKSMAN", at: { x: 3, y: 2 } },
        { own: true, role: "CATAPULT", at: { x: 2, y: 3 } },
        { own: true, role: "CAPTAIN", at: { x: 1, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 9, y: 9 } },
      ],
    );
    const necromancer = required(
      onlyIneligible.units.find(
        (unit) => unit.role === "CAPTAIN" && same(unit.at, { x: 2, y: 2 }),
      ),
    );
    expect(
      queryPlayerCommandsV7(onlyIneligible, onlyIneligible.humanPlayerId).some(
        (command) =>
          command.kind === "RALLY" && command.unitId === necromancer.id,
      ),
    ).toBe(false);
    expect(
      applyCommandV7(onlyIneligible, onlyIneligible.humanPlayerId, {
        kind: "RALLY",
        unitId: necromancer.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "HEAL_TARGET_NOT_FOUND" },
    });

    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { own: true, role: "MARKSMAN", at: { x: 3, y: 2 } },
        { own: true, role: "FIGHTER", at: { x: 2, y: 3 }, hp: 5 },
        { own: true, role: "GUARD", at: { x: 1, y: 2 } },
        { own: false, role: "FIGHTER", at: { x: 9, y: 9 } },
      ],
    );
    const caster = ownUnit(state, "CAPTAIN");
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).filter(
        (command) =>
          (command.kind === "RALLY" || command.kind === "TEND_WOUNDED") &&
          command.unitId === caster.id,
      ),
    ).toEqual([{ kind: "RALLY", unitId: caster.id }]);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "TEND_WOUNDED",
        unitId: caster.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID" },
    });
    const rallied = applyCommandV7(state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: caster.id,
    });
    if (!rallied.accepted) throw new Error(rallied.error.code);
    const skeleton = ownUnit(state, "FIGHTER");
    const zombie = ownUnit(state, "GUARD");
    expect(rallied.events[0]).toEqual({
      kind: "UNITS_RALLIED",
      captainId: caster.id,
      unitIds: [skeleton.id, zombie.id].sort((a, b) => a - b),
    });
    const frenzied = required(
      rallied.state.units.find((unit) => unit.id === skeleton.id),
    );
    expect(frenzied.activation.inspired).toBe(true);
    expect(
      rallied.state.units.find((unit) => unit.role === "MARKSMAN")?.activation
        .inspired,
    ).toBe(false);
    const stats = publicUnitStatsV7(rallied.state, frenzied);
    expect(stats.statuses).toContain("Frenzied: +1 next Attack");
    expect(
      stats.stats
        .find((stat) => stat.id === "ATTACK")
        ?.modifiers.map((modifier) => [modifier.source, modifier.sourceLabel]),
    ).toEqual([["INSPIRED", "Frenzied"]]);
  });

  it("keeps Human Rally and Tend Wounded for a Human Captain in a mixed match", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { own: true, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { own: true, role: "MARKSMAN", at: { x: 3, y: 2 }, hp: 5 },
        { own: false, role: "FIGHTER", at: { x: 9, y: 9 } },
      ],
    );
    const captain = ownUnit(state, "CAPTAIN");
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId).filter(
        (command) =>
          (command.kind === "RALLY" || command.kind === "TEND_WOUNDED") &&
          command.unitId === captain.id,
      ),
    ).toEqual([
      { kind: "RALLY", unitId: captain.id },
      { kind: "TEND_WOUNDED", unitId: captain.id },
    ]);
    const rallied = applyCommandV7(state, state.humanPlayerId, {
      kind: "RALLY",
      unitId: captain.id,
    });
    if (!rallied.accepted) throw new Error(rallied.error.code);
    expect(rallied.events[0]).toEqual({
      kind: "UNITS_RALLIED",
      captainId: captain.id,
      unitIds: [ownUnit(state, "MARKSMAN").id],
    });
    expect(
      publicUnitStatsV7(rallied.state, ownUnit(rallied.state, "MARKSMAN"))
        .statuses,
    ).toContain("Inspired: +1 next Attack");
  });

  it("resolves capture, maximum HP, and activation validation per owner", () => {
    const captures = (faction: FactionIdV7) =>
      UNIT_ROLE_IDS_V7.filter((role) =>
        effectiveRoleRuleV7(role, faction).abilities.includes("CAPTURE"),
      );
    expect(captures("UNDEAD")).toEqual(captures("ORIGINAL"));
    expect(captures("UNDEAD")).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "JUGGERNAUT",
    ]);

    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { own: true, role: "GUARD", at: { x: 2, y: 2 } },
        { own: false, role: "GUARD", at: { x: 5, y: 5 } },
      ],
    );
    const zombie = ownUnit(state, "GUARD");
    const guard = enemyUnitAt(state, { x: 5, y: 5 });
    expect([zombie.maxHp, guard.maxHp]).toEqual([20, 15]);
    const patched = (id: UnitStateV7["id"], patch: Partial<UnitStateV7>) =>
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          unit.id === id ? { ...unit, ...patch } : unit,
        ),
      });
    expect(patched(zombie.id, { maxHp: 15, hp: 15 })).toBeNull();
    expect(patched(guard.id, { maxHp: 20, hp: 20 })).toBeNull();
    expect(
      patched(zombie.id, { veteran: true, kills: 3, maxHp: 25 }),
    ).not.toBeNull();

    const layout: readonly UnitSpec[] = [
      { own: true, role: "KNIGHT", at: { x: 2, y: 2 } },
      { own: true, role: "RAIDER", at: { x: 3, y: 3 } },
      { own: false, role: "FIGHTER", at: { x: 5, y: 5 } },
    ];
    const withActivation = (
      state: GameStateV7,
      role: UnitRoleIdV7,
      activation: Partial<UnitStateV7["activation"]>,
    ) => {
      const unit = ownUnit(state, role);
      return parseGameStateV7({
        ...state,
        units: state.units.map((candidate) =>
          candidate.id === unit.id
            ? {
                ...candidate,
                activation: { ...candidate.activation, ...activation },
              }
            : candidate,
        ),
      });
    };
    const overrun = { attacked: true, attacksUsed: 1, overrunActive: true };
    const escape = { attacked: true, attacksUsed: 1, escapeAvailable: true };
    const undead = arena(["UNDEAD", "ORIGINAL"], layout);
    const human = arena(["ORIGINAL", "UNDEAD"], layout);
    expect(withActivation(undead, "KNIGHT", overrun)).toBeNull();
    expect(withActivation(human, "KNIGHT", overrun)).not.toBeNull();
    expect(withActivation(undead, "RAIDER", escape)).toBeNull();
    expect(withActivation(human, "RAIDER", escape)).not.toBeNull();
  });
});

describe("ruleset-7 all-Human parity with revision 12", () => {
  // Digests of fixed-seed all-Human headless matches recorded from the
  // revision-12 code (commit 3dddcdd) with the ruleset identity normalized.
  const BASELINE = [
    {
      seed: 7,
      size: 11,
      aiCount: 1,
      aiMode: "RIVAL",
      mapType: "CONTINENTS",
      maxRounds: 30,
      acceptedCommands: 118,
      rounds: 16,
      termination: "OUTCOME",
      mapHash:
        "251ae814b9c22679f8ed6b288c0a9ae2a06574b84b5b719521970f6f24a3e51c",
      postGenerationPrngHash:
        "a988ca340180a5f62984e0aad88733fb8a247a35228089f59202d66c969776e1",
      commandHash:
        "d92f2f8b8c0f94f98415e1461943bcc1b20a94447cc7443e485a292cbaebaee8",
      eventHash:
        "8f9cee8beccde319f6a8c4c867461ee72035d00c32e5f0f2f6941a850d5d2515",
      normalizedFinalStateHash:
        "36b0f384f6795a82a03f8ac58aa8c6de20e7bbe4e1b5481b615f11310f310b26",
      normalizedHumanViewHash:
        "7c1c3de01dc510204a05d72a7ce144d69141a4f6459dfe236e6e2e3a9b75d24a",
      normalizedHumanCommandsHash:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    {
      seed: 1234,
      size: 14,
      aiCount: 2,
      aiMode: "COOPERATIVE",
      mapType: "ARCHIPELAGO",
      maxRounds: 18,
      acceptedCommands: 329,
      rounds: 19,
      termination: "ROUND_CAP",
      mapHash:
        "a336769650f1bebe201dce1d1db118a695454f4ff534e90fbdf91f4b18cc5ea5",
      postGenerationPrngHash:
        "b11910d95aeab8c56bbf6f72f63d4e6f6b30f7e43f842d8354e7badf23e1050c",
      commandHash:
        "f59fdb4f2bef6be842c6b44d6beea02fc82cad23cab3f19560a4f4b6608c7541",
      eventHash:
        "f06cc10a9ba2ed58ab9b2e3ec54b4533810cdcf5b48234a6db5c062b781e9def",
      normalizedFinalStateHash:
        "3ec6b95efd93d4b827ae62735c2552477417f1f4ef2a0fe59e7c4f993549d6d9",
      normalizedHumanViewHash:
        "b0962b73e99d464ab8ae3219c71b95dd3d52a86dcc3a09612357ba4f32b776e8",
      normalizedHumanCommandsHash:
        "dbbba8646e5e9a23421de0864b7aa3e94342a1d034731f2e0f3d8b2259f62f2d",
    },
  ] as const;

  for (const baseline of BASELINE)
    it(`reproduces the revision-12 match for seed ${baseline.seed} apart from identity`, () => {
      const setup: MatchSetupV7 = {
        rulesetId: RULESET_7_ID,
        seed: baseline.seed,
        width: baseline.size,
        height: baseline.size,
        aiCount: baseline.aiCount,
        aiDifficulty: "NORMAL",
        aiMode: baseline.aiMode,
        humanColor: "CORAL",
        factions: Array.from(
          { length: baseline.aiCount + 1 },
          () => "ORIGINAL" as const,
        ),
        mapType: baseline.mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
      };
      const result = runAiMatchV7(setup, { maxRounds: baseline.maxRounds });
      // Revision 13 adds the neutral `graves: []` field to state and view;
      // parity is defined apart from identity and neutral values.
      const humanView = viewForV7(result.state, result.state.humanPlayerId);
      expect(result.state.graves).toEqual([]);
      expect(humanView.graves).toEqual([]);
      expect(result.metrics.eventsByKind.GRAVE_CREATED).toBe(0);
      expect(result.metrics.eventsByKind.UNIT_INFECTED).toBe(0);
      // Revision 13 adds neutral Lifesteal/Infect fields to every combat
      // preview; they must be neutral and are removed before hashing.
      const neutralEvents = result.events.map((event) => {
        if (event.kind !== "COMBAT_RESOLVED") return event;
        const {
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
          ...preview
        } = event.preview;
        expect({
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
        }).toEqual({
          attackerHeal: 0,
          defenderHeal: 0,
          attackerInfected: false,
          defenderInfected: false,
        });
        return { ...event, preview };
      });
      expect(
        result.events.some((event) => event.kind === "COMBAT_RESOLVED"),
      ).toBe(true);
      expect(result.metrics.eventHash).toBe(canonicalHash(result.events));
      const normalize = (value: unknown): unknown => {
        const { graves: _graves, ...rest } = value as { graves: unknown };
        void _graves;
        return JSON.parse(
          JSON.stringify(rest).replaceAll(RULESET_7_ID, "IDENTITY"),
        ) as unknown;
      };
      expect({
        acceptedCommands: result.acceptedCommands,
        rounds: result.rounds,
        termination: result.termination,
        mapHash: result.metrics.mapHash,
        postGenerationPrngHash: result.metrics.postGenerationPrngHash,
        commandHash: result.metrics.commandHash,
        eventHash: canonicalHash(neutralEvents),
        normalizedFinalStateHash: canonicalHash(normalize(result.state)),
        normalizedHumanViewHash: canonicalHash(normalize(humanView)),
        normalizedHumanCommandsHash: canonicalHash(
          queryPlayerCommandsV7(result.state, result.state.humanPlayerId),
        ),
      }).toEqual({
        acceptedCommands: baseline.acceptedCommands,
        rounds: baseline.rounds,
        termination: baseline.termination,
        mapHash: baseline.mapHash,
        postGenerationPrngHash: baseline.postGenerationPrngHash,
        commandHash: baseline.commandHash,
        eventHash: baseline.eventHash,
        normalizedFinalStateHash: baseline.normalizedFinalStateHash,
        normalizedHumanViewHash: baseline.normalizedHumanViewHash,
        normalizedHumanCommandsHash: baseline.normalizedHumanCommandsHash,
      });
    });
});

describe("ruleset-7 Normal AI with Undead seats", () => {
  it("plays Undead-vs-Undead and Undead-vs-Human matches deterministically without errors", () => {
    for (const factions of [
      ["UNDEAD", "UNDEAD"],
      ["ORIGINAL", "UNDEAD"],
    ] as const) {
      const setup = setupWith(factions, 7);
      const first = runAiMatchV7(setup, { maxRounds: 12 });
      expect(first.errors).toEqual([]);
      expect(first.stalls).toEqual([]);
      expect(first.acceptedCommands).toBeGreaterThan(20);
      expect(parseGameStateV7(first.state)).not.toBeNull();
      expect(runAiMatchV7(setup, { maxRounds: 12 }).stateHash).toBe(
        first.stateHash,
      );
    }
  });
});

interface UnitSpec {
  readonly own: boolean;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

function initialWith(factions: readonly FactionIdV7[], seed = 2): GameStateV7 {
  const created = createInitialMapStateV7(setupWith(factions, seed));
  if (!created.ok) throw new Error(created.error.code);
  const humanTurnIndex = created.state.turnOrder.indexOf(
    created.state.humanPlayerId,
  );
  return checkedV7({
    ...created.state,
    activeSeatIndex: humanTurnIndex,
    cities: created.state.cities.map((city) =>
      city.ownerId === created.state.humanPlayerId
        ? { ...city, cityActionAvailable: true }
        : city,
    ),
  });
}

/** A seed-2 board with every technology and a chosen unit layout. */
function arena(
  factions: readonly FactionIdV7[],
  specs: readonly UnitSpec[],
): GameStateV7 {
  const base = exploredAllV7(allTechsV7(initialWith(factions)));
  if (specs.length === 0) return base;
  const enemy = enemyOf(base);
  const cityCenters = new Set(base.cities.map((city) => key(city.at)));
  const units = specs.map((spec, index): UnitStateV7 => {
    if (cityCenters.has(key(spec.at))) throw new Error("arena on a city");
    const ownerId = spec.own ? base.humanPlayerId : enemy;
    const faction = playerOf(base, ownerId).faction;
    const rule = effectiveRoleRuleV7(spec.role, faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId,
      homeCityId:
        base.cities.find((city) => city.ownerId === ownerId)?.id ?? null,
      role: spec.role,
      form: "LAND",
      at: spec.at,
      hp: spec.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const used = specs.map((spec) => spec.at);
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + specs.length,
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !used.some((at) => same(at, chest)),
    ),
    board: patchTiles(base, used),
  });
}

function trainingState(factions: readonly FactionIdV7[]): GameStateV7 {
  const base = allTechsV7(initialWith(factions));
  return checkedV7({
    ...base,
    units: base.units.filter((unit) => unit.ownerId !== base.humanPlayerId),
  });
}

function withCoins(state: GameStateV7, coins: number): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId ? { ...player, coins } : player,
    ),
  });
}

function rewardState(
  faction: FactionIdV7,
  reward: "MILITIA" | "JUGGERNAUT",
): {
  readonly state: GameStateV7;
  readonly command: Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }>;
} {
  const base = trainingState([faction, "ORIGINAL"]);
  const city = humanCity(base);
  const reachedLevel = reward === "MILITIA" ? 3 : 5;
  const addedPopulation = reward === "MILITIA" ? 6 : 14;
  const growthTiles = base.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        tile.site === null &&
        tile.improvement === null &&
        !same(tile.at, city.at),
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
            rewards:
              reward === "MILITIA"
                ? [{ reachedLevel: 2, reward: "SURVEY" as const }]
                : [
                    { reachedLevel: 2, reward: "SURVEY" as const },
                    { reachedLevel: 3, reward: "WALLS" as const },
                    { reachedLevel: 4, reward: "TREASURY_8" as const },
                  ],
          }
        : candidate,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        growthTiles.some((growth) => same(growth.at, tile.at))
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
    populationContributions: [
      ...base.populationContributions,
      ...growthTiles.map((tile, index) => ({
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
    ],
    pendingChoices: [
      {
        kind: "CITY_REWARD" as const,
        cityId: city.id,
        reachedLevel,
        candidates:
          reward === "MILITIA"
            ? (["WALLS", "MILITIA"] as const)
            : (["JUGGERNAUT", "TREASURY"] as const),
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

function patchTiles(
  state: GameStateV7,
  coords: readonly CoordV7[],
): GameStateV7["board"] {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      coords.some((at) => same(at, tile.at))
        ? {
            ...tile,
            biome: tile.biome ?? "PLAINS",
            terrain: "GRASS" as const,
            resource: null,
            improvement: null,
            site: null,
            road: false,
            fieldDefense: false,
          }
        : tile,
    ),
  };
}

function withoutFaction(player: GameStateV7["players"][number]) {
  const { faction: _faction, factionTreeId: _tree, ...rest } = player;
  void _faction;
  void _tree;
  return rest;
}

function playerOf(state: GameStateV7, id: PlayerId) {
  return required(state.players.find((player) => player.id === id));
}

function enemyOf(state: GameStateV7): PlayerId {
  return required(
    state.players.find((player) => player.id !== state.humanPlayerId),
  ).id;
}

function humanCity(state: GameStateV7): GameStateV7["cities"][number] {
  return required(
    state.cities.find((city) => city.ownerId === state.humanPlayerId),
  );
}

function ownUnit(state: GameStateV7, role: UnitRoleIdV7): UnitStateV7 {
  return required(
    state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.role === role,
    ),
  );
}

function enemyUnitAt(state: GameStateV7, at: CoordV7): UnitStateV7 {
  return required(
    state.units.find(
      (unit) => unit.ownerId !== state.humanPlayerId && same(unit.at, at),
    ),
  );
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture value missing");
  return value;
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

class MemoryStorage implements StorageAdapter {
  readonly values: Map<string, string>;

  constructor(entries: readonly (readonly [string, string])[]) {
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
