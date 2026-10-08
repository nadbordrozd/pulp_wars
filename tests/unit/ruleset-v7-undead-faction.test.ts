import { describe, expect, it } from "vitest";
import {
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  SHARED_BASELINE_NODES_V7,
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
import {
  allTechsV7,
  checkedV7,
  exploredAllV7,
  mirrorOptionV7,
} from "../fixtures/v7-builders";
import {
  createRevision13MapStateV7,
  revision13PlayableGameV7,
} from "../fixtures/v7-revision13-map";

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
  it("pins the current identity, frozen faction and tree orders, and bindings", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r59");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r59.current");
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
    expect(factionTreeIdV7("ORIGINAL")).toBe("ORIGINAL_BASELINE_V5");
    expect(factionTreeIdV7("UNDEAD")).toBe("UNDEAD_BASELINE_V1");
    expect(FACTION_DISPLAY_NAMES_V7).toEqual({
      ORIGINAL: "Human",
      UNDEAD: "Undead",
      GOBLIN: "Goblin",
      DINOSAUR: "Dinosaur",
      MARTIAN: "Martian",
      ICE_FOLK: "Ice Folk",
      DWARF: "Dwarf",
      CANDY: "Candy",
    });
    expect(Object.keys(RULESET_7.factionTrees)).toEqual([
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
    expect(FACTION_TREES_V7.UNDEAD.faction).toBe("UNDEAD");
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(() => factionTreeV7("NOT_A_FACTION" as FactionIdV7)).toThrow(
      RangeError,
    );
    expect(() =>
      effectiveRoleRuleV7("FIGHTER", "NOT_A_FACTION" as FactionIdV7),
    ).toThrow(RangeError);
  });

  it("cleans obsolete keys through v7r58 and preserves the r59 save", () => {
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r58.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).toHaveLength(58);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r12.current", "r12"],
      ["pulpWars.save.v7r13.current", "r13"],
      ["pulpWars.save.v7r14.current", "r14"],
      ["pulpWars.save.v7r15.current", "r15"],
      ["pulpWars.save.v7r16.current", "r16"],
      ["pulpWars.save.v7r17.current", "r17"],
      ["pulpWars.save.v7r18.current", "r18"],
      ["pulpWars.save.v7r19.current", "r19"],
      ["pulpWars.save.v7r20.current", "r20"],
      ["pulpWars.save.v7r21.current", "r21"],
      ["pulpWars.save.v7r22.current", "r22"],
      ["pulpWars.save.v7r23.current", "r23"],
      ["pulpWars.save.v7r24.current", "r24"],
      ["pulpWars.save.v7r25.current", "r25"],
      ["pulpWars.save.v7r26.current", "r26"],
      ["pulpWars.save.v7r27.current", "r27"],
      ["pulpWars.save.v7r28.current", "r28"],
      ["pulpWars.save.v7r29.current", "r29"],
      ["pulpWars.save.v7r30.current", "r30"],
      ["pulpWars.save.v7r31.current", "r31"],
      ["pulpWars.save.v7r32.current", "r32"],
      ["pulpWars.save.v7r33.current", "r33"],
      ["pulpWars.save.v7r34.current", "r34"],
      ["pulpWars.save.v7r35.current", "r35"],
      ["pulpWars.save.v7r36.current", "r36"],
      ["pulpWars.save.v7r37.current", "r37"],
      ["pulpWars.save.v7r38.current", "r38"],
      ["pulpWars.save.v7r39.current", "r39"],
      ["pulpWars.save.v7r40.current", "r40"],
      ["pulpWars.save.v7r41.current", "r41"],
      ["pulpWars.save.v7r42.current", "r42"],
      ["pulpWars.save.v7r43.current", "r43"],
      ["pulpWars.save.v7r44.current", "r44"],
      ["pulpWars.save.v7r45.current", "r45"],
      ["pulpWars.save.v7r46.current", "r46"],
      ["pulpWars.save.v7r47.current", "r47"],
      [SAVE_STORAGE_KEY_V7, "r47"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r12.current",
        "pulpWars.save.v7r13.current",
        "pulpWars.save.v7r14.current",
        "pulpWars.save.v7r15.current",
        "pulpWars.save.v7r16.current",
        "pulpWars.save.v7r17.current",
        "pulpWars.save.v7r18.current",
        "pulpWars.save.v7r19.current",
        "pulpWars.save.v7r20.current",
        "pulpWars.save.v7r21.current",
        "pulpWars.save.v7r22.current",
        "pulpWars.save.v7r23.current",
        "pulpWars.save.v7r24.current",
        "pulpWars.save.v7r25.current",
        "pulpWars.save.v7r26.current",
        "pulpWars.save.v7r27.current",
        "pulpWars.save.v7r28.current",
        "pulpWars.save.v7r29.current",
        "pulpWars.save.v7r30.current",
        "pulpWars.save.v7r31.current",
        "pulpWars.save.v7r32.current",
        "pulpWars.save.v7r33.current",
        "pulpWars.save.v7r34.current",
        "pulpWars.save.v7r35.current",
        "pulpWars.save.v7r36.current",
        "pulpWars.save.v7r37.current",
        "pulpWars.save.v7r38.current",
        "pulpWars.save.v7r39.current",
        "pulpWars.save.v7r40.current",
        "pulpWars.save.v7r41.current",
        "pulpWars.save.v7r42.current",
        "pulpWars.save.v7r43.current",
        "pulpWars.save.v7r44.current",
        "pulpWars.save.v7r45.current",
        "pulpWars.save.v7r46.current",
        "pulpWars.save.v7r47.current",
      ],
      removedCount: 36,
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
      ["ORIGINAL", "NOT_A_FACTION"],
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
      // Revision 20 section 6.3: the Human Fighter has 12 HP; the Skeleton
      // keeps 10.
      const maxHp =
        playerOf(state, unit.ownerId).faction === "UNDEAD" ? 10 : 12;
      expect(unit).toMatchObject({ role: "FIGHTER", hp: maxHp, maxHp });
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
        withPlayer({
          faction: "NOT_A_FACTION",
          factionTreeId: "UNDEAD_BASELINE_V1",
        }),
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
        // Units differ only in the maximum HP of their owner's faction
        // (revision 20 section 6.3: Human Fighter 12, Skeleton 10).
        const withoutHp = (unit: UnitStateV7) => ({
          ...unit,
          hp: null,
          maxHp: null,
        });
        expect(other.units.map(withoutHp)).toEqual(
          reference.units.map(withoutHp),
        );
        for (const unit of other.units) {
          const maxHp = effectiveRoleRuleV7(
            unit.role,
            playerOf(other, unit.ownerId).faction,
          ).maxHp;
          expect([unit.hp, unit.maxHp]).toEqual([maxHp, maxHp]);
        }
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
  }, 600_000);
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
        // Revision 15 (Undead fragility): 18 HP.
        18,
        4,
        4,
        1,
        1,
        1,
        1,
        "FORTIFICATION",
        false,
        ["ATTACK", "CAPTURE", "INFECT", "BITE"],
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
        // Revision 14 (L2): Attack 3.
        6,
        2,
        1,
        3,
        2,
        1,
        "SAWMILLING",
        false,
        ["ATTACK", "PLAGUE"],
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
        // The Undead pass (`pulp_wars-w49.13`, 7r51): Escape.
        ["ATTACK", "LIFESTEAL", "UNANSWERED", "ESCAPE"],
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
        // The Undead pass (7r51): Infect.
        ["ATTACK", "CAPTURE", "PUSH", "INFECT"],
      ],
      PATROL_BOAT: [
        "Patrol Boat",
        5,
        10,
        4,
        4,
        2,
        1,
        1,
        2,
        "SHORECRAFT",
        true,
        // The naval branch (`pulp_wars-5ti.2`): the Ram (with Seamanship).
        ["ATTACK", "RAM"],
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
      // The naval branch (`pulp_wars-5ti.2`): the shared Submarine.
      SUBMARINE: [
        "Submarine",
        9,
        12,
        8,
        4,
        2,
        1,
        1,
        2,
        "SUBMERSIBLES",
        true,
        ["ATTACK", "SUBMERGED", "TORPEDO"],
      ],
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Wight, the Undead
      // heavy line unit, at Metallurgy (6 Coins, 14 HP, Attack 3, Defense
      // 2.5).
      SWORDSMAN: [
        "Wight",
        6,
        14,
        6,
        5,
        1,
        1,
        1,
        1,
        "METALLURGY",
        true,
        ["ATTACK", "CAPTURE"],
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

  it("keeps the Human registration at its revision-12 values apart from the revision-20 HP", () => {
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
      // Revision 20 section 6.3 (`pulp_wars-0hi.3`): Fighter, Raider, and
      // Marksman 12 HP (were 10), Guard 17 (was 15).
      ["Fighter", 2, 12, 4, 4, 1, 1, 1, "ATTACK+CAPTURE"],
      ["Raider", 4, 12, 4, 2, 2, 1, 1, "ATTACK+CAPTURE+CHARGE+ESCAPE"],
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): Marksman 4 Coins, Catapult
      // Attack 3, Knight 13 HP.
      ["Marksman", 4, 12, 4, 2, 1, 2, 1, "ATTACK+CAPTURE"],
      ["Guard", 3, 17, 3, 6, 1, 1, 1, "ATTACK+CAPTURE"],
      ["Captain", 5, 10, 2, 2, 1, 1, 1, "ATTACK+RALLY+TEND_WOUNDED"],
      ["Catapult", 8, 10, 6, 1, 1, 3, 2, "ATTACK"],
      ["Knight", 9, 13, 8, 2, 3, 1, 1, "ATTACK+CAPTURE+OVERRUN"],
      ["Juggernaut", null, 40, 8, 8, 1, 1, 1, "ATTACK+CAPTURE+PUSH"],
      ["Patrol Boat", 5, 10, 4, 4, 2, 1, 1, "ATTACK+RAM"],
      ["Battleship", 16, 25, 12, 8, 2, 3, 1, "ATTACK"],
      // The naval branch (`pulp_wars-5ti.2`).
      ["Submarine", 9, 12, 8, 4, 2, 1, 1, "ATTACK+SUBMERGED+TORPEDO"],
      // Tuning 5 (`pulp_wars-w49.4`); the Champion at 6 Coins since the
      // ninth unit (`pulp_wars-w49.17`, 7r55).
      ["Champion", 6, 15, 7, 5, 1, 1, 1, "ATTACK+CAPTURE"],
    ]);
  });

  it("differs from the Human graph only in the Administration, Chivalry, and Explosives unlocks", () => {
    expect(UNDEAD_BASELINE_V1_NODES).toHaveLength(
      SHARED_BASELINE_NODES_V7.length,
    );
    SHARED_BASELINE_NODES_V7.forEach((human, index) => {
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
      // The Undead pass, correction (`pulp_wars-w49.13`): Pestilence.
      else if (human.id === "EXPLOSIVES")
        expect(undead.unlocks).toEqual([
          ...human.unlocks,
          { kind: "PESTILENCE" },
        ]);
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
    // (The Swordsman of tuning 5 is the Humans' alone.)
    expect(undead.trainableRoles).toEqual(
      human.trainableRoles.filter((role) => role !== "SWORDSMAN"),
    );
    expect(undead.roleSightRadius).toEqual({ RAIDER: 2 });
    const all = technologyCapabilitiesV7(
      SHARED_BASELINE_NODES_V7.map((node) => node.id),
      "UNDEAD",
    );
    // (The ninth unit, 7r55: every faction has the heavy line role.)
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
      // The Industry reshuffle (7r56): the defender, at Fortification.
      FORTIFICATION: "Zombie",
      // The ninth unit (7r55).
      METALLURGY: "Wight",
      SHORECRAFT: "Patrol Boat",
      NAVAL_ENGINEERING: "Battleship",
      SUBMERSIBLES: "Submarine",
    });
    expect(labels(humanTree)).toEqual({
      ADMINISTRATION: "Captain",
      SAWMILLING: "Catapult",
      MARKSMANSHIP: "Marksman",
      SCOUTING: "Raider",
      CHIVALRY: "Knight",
      FORTIFICATION: "Guard",
      // The ninth unit (7r55): the Champion, at Metallurgy.
      METALLURGY: "Champion",
      SHORECRAFT: "Patrol Boat",
      NAVAL_ENGINEERING: "Battleship",
      SUBMERSIBLES: "Submarine",
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

  it("grants the owner's Skeleton for Militia and Abomination for the level-6 reward", () => {
    for (const [reward, role, label] of [
      ["MILITIA", "FIGHTER", "Skeleton"],
      ["JUGGERNAUT", "JUGGERNAUT", "Abomination"],
    ] as const) {
      for (const faction of ["UNDEAD", "ORIGINAL"] as const) {
        // Skeleton 10, Fighter 12 (revision 20 section 6.3), both 40.
        const maxHp = effectiveRoleRuleV7(role, faction).maxHp;
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
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): a chest gives a tier 3 unit
      // only from round 15 (a Ghoul or a Raider before it).
      state = checkedV7({
        ...state,
        round: 15,
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

  it("gives the Lich Catapult range, no attack after moving, its own Attack, and splash", () => {
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
      // Revision 14 (L2): Attack 3.
      attack2: 6,
      minimumRange: 2,
      maximumRange: 3,
      advances: false,
      // Revision 13 section 6.7: the Guard next to the primary target is
      // splashed for max(1, ceil(primary damage / 2)).
      splash: [{ unitId: near.id, at: near.at, damage: 4, dies: false }],
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
    // Tuning 2 (7r47): the Human Knight captures; the Vampire does not.
    // Tuning 5: the Swordsman captures (the Undead table only copies the
    // Human role and never fields it).
    expect(captures("ORIGINAL")).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "KNIGHT",
      "JUGGERNAUT",
      "SWORDSMAN",
    ]);
    expect(captures("UNDEAD")).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "JUGGERNAUT",
      "SWORDSMAN",
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
    expect([zombie.maxHp, guard.maxHp]).toEqual([18, 17]);
    const patched = (id: UnitStateV7["id"], patch: Partial<UnitStateV7>) =>
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          unit.id === id ? { ...unit, ...patch } : unit,
        ),
      });
    expect(patched(zombie.id, { maxHp: 15, hp: 15 })).toBeNull();
    expect(patched(guard.id, { maxHp: 18, hp: 18 })).toBeNull();
    expect(
      patched(zombie.id, { veteran: true, kills: 3, maxHp: 23 }),
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

describe("ruleset-7 all-Human parity digests", () => {
  // Digests of fixed-seed all-Human headless matches with the ruleset
  // identity normalized, first recorded from the revision-12 code (commit
  // 3dddcdd). Revisions 13-15 reproduced them unchanged: revision 14 changes
  // all-Human play only through the village table (VL) and income (E2);
  // these matches start on their revision-13 boards and never reach the E2
  // caps. Revision 16 (`pulp_wars-wwc`) changes all-Human play only through
  // the Normal AI opening (growth-first research and growth harvests before
  // other spending, section 3.6); with those two policy rules disabled the
  // matches still reproduced the revision-12 digests exactly, so the command,
  // event, state, and view digests below are re-recorded from the revision-16
  // code while the map and post-generation PRNG digests are unchanged.
  // Revision 16b (`pulp_wars-zsa`) changes them again only through 2-tile
  // boats (Patrol Boat and embarked Move 2, DISEMBARK spending one point, and
  // the Normal AI's one-cell landing approach, section 5): with Move 3, no
  // landing budget, and no approach bonus restored, both matches reproduced
  // the revision-16a digests exactly. The map and post-generation PRNG
  // digests are unchanged; seed 7 no longer ends by round 17 (its Continents
  // invasion is slower) and now reaches the 30-round cap.
  // Revision 16c (`pulp_wars-4gc`) changes them again only through the
  // economy numbers (research cost slopes, level income cap 4, Market cap
  // 3): the cc5c184 tree with the revision-16b numbers reproduced the
  // revision-16b digests exactly. Map and post-generation PRNG digests,
  // rounds, and terminations are unchanged; seed 7 has 238 commands (was
  // 241) and seed 1234 has 362 (was 363).
  // Revision 17 (`pulp_wars-0ao.2`, identity `pulp-wars-poc-7r17`) reproduces
  // every digest below unchanged: its only all-Human difference is the
  // neutral combat-preview field `gangUp: 0`, removed before hashing like the
  // revision-13 and revision-14 neutral fields.
  // `pulp_wars-0ao.15` (landing ends the activation for every faction,
  // revisions 6 and 16) changes the command, event, final state, view, and
  // command digests: in the 64841f1 matches the Normal AI attacked with a
  // unit it had just landed (seed 7 first at command 55, seed 1234 first at
  // command 342), and each match's first divergence is exactly that Attack,
  // now illegal. With only the old landing activation restored in the
  // reducer, both matches reproduced the previous digests exactly. Map and
  // post-generation PRNG digests, rounds, and terminations are unchanged;
  // seed 7 has 331 commands (was 238) and seed 1234 has 359 (was 362).
  // Revision 18 (`pulp_wars-6gd.2`, identity `pulp-wars-poc-7r18`) changes
  // the command, event, final state, view, and command digests through the
  // movement rules only (friendly pass-through and the Road half cost by
  // origin, with the Normal AI's matching route estimates): the 7r18 tree
  // with `src/engine/v7/movement.ts`, `src/ai/v7.ts`, and
  // `src/ai/v7-endgame.ts` restored to 9b33b7e reproduced the previous
  // digests exactly. Map and post-generation PRNG digests are unchanged;
  // seed 7 now ends by conquest in round 25 with 264 commands (was the
  // 30-round cap with 331) and seed 1234 has 357 commands (was 359).
  // Revision 19 (`pulp_wars-c87.2`, identity `pulp-wars-poc-7r19`) reproduces
  // every digest below unchanged: its only all-Human differences are the
  // empty `eggs` list of the state and the view and the neutral
  // combat-preview fields `stampede: 0`, `acid: false`,
  // `defenderArmoured: false`, and `attackerArmoured: false`, removed before
  // hashing like the earlier neutral fields.
  // Revision 20 (`pulp_wars-0hi.2`, identity `pulp-wars-poc-7r20`) also
  // reproduces every digest: `stampede: 0` is replaced by the neutral
  // `runUp: 0` and `fortificationIgnored: 0`, removed the same way, and
  // neither match promotes a wounded unit (a Promotion now fully heals).
  // Revision 21 (`pulp_wars-9s0.4`, identity `pulp-wars-poc-7r21`) re-pins
  // the command, event, final state, view, and command digests of both
  // matches; map and post-generation PRNG digests are unchanged. Cause: the
  // four new achievements. Each match was compared command by command with
  // the 7r20 tree (93b7823): commands, events, and the state without the
  // four new entitlements are identical until a seat unlocks Sea Dog (seed
  // 7: command 147, round 15, after 146 identical commands; seed 1234:
  // command 234, round 13, after 233), and its Monument changes the match
  // from there. Seed 7 now reaches the 30-round cap with 339 commands (was a
  // conquest in round 25 with 264); seed 1234 still has 357 commands. The
  // four new entitlements and progress entries are removed before hashing.
  // `pulp_wars-9s0.1` (Normal AI campaign plan: jobs by land route, waves,
  // the military share; no rule or identity change) re-pins the command,
  // event, final state, view, and command digests of both matches; map and
  // post-generation PRNG digests are unchanged. Each match was compared
  // command by command with the previous policy (a158cfd): seed 7 first
  // differs at command 26 and seed 1234 at command 18, each a scouting Move
  // to a different tile (two scouts take separate stretches of frontier by
  // route; before, every unit walked to the nearest unexplored tile). Seed 7
  // still reaches the 30-round cap, with 448 commands (was 339); seed 1234
  // has 381 commands (was 357).
  // The Martian revision (`pulp_wars-t6s.2`) reproduces every digest below
  // unchanged: its only all-Human differences are the four empty side lists
  // of the state and the view (`shields`, `cooling`, `mindControlled`,
  // `mindControlCooldowns`), the neutral combat-preview fields
  // `rayPower: "NONE"`, `coolingApplied: false`, `defenderShieldDamage: 0`,
  // and `attackerShieldDamage: 0`, and the neutral `shieldDamage: 0` of
  // splash entries, all removed before hashing like the earlier neutral
  // fields.
  // The Ice Folk revision (`pulp_wars-7g3.3`) reproduces every digest below
  // unchanged as well: its only all-Human differences are the empty
  // `chilled` list of the state and the view, the tile flags `snow: false`
  // and `blizzard: false` of every explored view tile, the `chill: null`
  // unit stat, `curedChill: false` in Tend results, and the eight neutral
  // combat-preview fields (`shatters`, `coldBloodApplied`,
  // `rockfallApplied`, `plantedApplied`, `blizzardHalved`, `snowCover`,
  // `sweep`, `hiddenBlizzardPossible`, all false), removed before hashing.
  // `pulp_wars-0hi.3` (revision 20 section 6.3: Human Fighter, Raider, and
  // Marksman 12 HP, Guard 17) re-pins the command, event, final state, view,
  // and command digests of both matches; map and post-generation PRNG
  // digests are unchanged. Every match with a Human seat changes: the
  // starting Fighter already has 12 HP, every exchange with a Human unit
  // resolves on different HP ratios, and the policy values the Human roles
  // by their HP. Seed 7 is now a conquest in round 22 with 232 commands (was
  // the 30-round cap with 448); seed 1234 has 386 commands (was 381).
  // `pulp_wars-if6` (7r41: 3 starting Coins instead of 5, tier 3 technology
  // base cost 9 instead of 12) re-pins the command, event, final state,
  // view, and command digests of both matches; map and post-generation PRNG
  // digests are unchanged. Every opening changes: a first turn has 5 Coins,
  // so no seat buys a unit on it. Seed 7 now reaches the 30-round cap with
  // 466 commands (was a conquest in round 22 with 232); seed 1234 has 341
  // commands (was 386).
  // Tuning 1 (`pulp_wars-w49.3`, 7r46: retaliation, technology costs, the
  // reward and economy numbers) re-pins the same digests of both matches;
  // map and post-generation PRNG digests are unchanged. Seed 7 reaches the
  // cap with 387 commands (was 466) and researches Seamanship, so its
  // combats carry Rams; seed 1234 has 337 commands (was 341). The `ram`,
  // `torpedo`, and `fortificationIgnored` preview fields are hashed now.
  const BASELINE = [
    {
      seed: 7,
      size: 11,
      aiCount: 1,
      aiMode: "RIVAL",
      mapType: "CONTINENTS",
      maxRounds: 30,
      // Tuning 3 (`pulp_wars-w49.3`: the Knight's Attack 4, Forest cover
      // from Forestry, land trade): the match now ends in round 25 (it ran
      // to the cap, 387 commands), and every digest below was recomputed.
      // Tuning 4 (`pulp_wars-w49.3`: research priced by the technologies
      // owned, the reward ladder, land trade 1): the match ends in round 19
      // (206 commands), and every digest below was recomputed.
      // Tuning 5 (`pulp_wars-w49.4`: the Normal AI's army play, the Guard
      // open to ranged attacks, the Swordsman): the match ends in round 23
      // (301 commands), and every digest below was recomputed.
      // Tuning 6 (`pulp_wars-w49.6`: research at 1 Coin a technology owned,
      // the reward unit beside the center, the Normal AI's assault,
      // expansion, and research order): the match ends in round 25 (271
      // commands; round 20 and 228 before the correction pass gave each
      // faction its own research order), and every digest below was
      // recomputed.
      // Tuning 7 (`pulp_wars-w49.10`: the Normal AI's local assault,
      // growth at the unit limit, wartime spending, and target choice):
      // the match ends in round 26 (331 commands), and every digest below
      // but the human's final commands was recomputed.
      // Tuning 8 (`pulp_wars-w49.11`: the capture of a reached center,
      // research on a clock while at war, group sizes): the match ends in
      // round 25 (296 commands), and the same digests were recomputed.
      // Its correction pass: round 24 (284 commands), recomputed.
      // The Martian pass's correction (`pulp_wars-w49.14`: the Human seat's
      // economy-first opening, growth at war, no Guards against shooters,
      // no Knight ahead of its line): round 23 (275 commands), recomputed.
      // The economy rejig (`pulp_wars-w49.16`, 7r54): 218 commands and 19
      // rounds (275 and 23); the hashes below were recomputed with it.
      acceptedCommands: 218,
      rounds: 19,
      termination: "OUTCOME",
      mapHash:
        "251ae814b9c22679f8ed6b288c0a9ae2a06574b84b5b719521970f6f24a3e51c",
      postGenerationPrngHash:
        "a988ca340180a5f62984e0aad88733fb8a247a35228089f59202d66c969776e1",
      commandHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 87c815…d153).
        "9ae0c1b18105562b526d6aafa4319e18157c3616ad8cb35b404f5160fd2044ae",
      eventHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 21337f…0b84).
        "05b2427ec56eea9978eabcf43eebd5315e6d2de8105105a3f1c7555368dff4b7",
      normalizedFinalStateHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // d8241e…d3d1).
        "e437ed39e489e3babb2a459a0bd1d2aecada1759bf77f50157becbc1b018a639",
      normalizedHumanViewHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 0c4cbb…f9c2).
        "654061f7965b6325c09fca47042ae10c38bfeb4788ef0100b45b5738033cba5e",
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
      // Tuning 4: 309 commands (337 before), recomputed.
      // Tuning 5: 313 commands, recomputed.
      // Tuning 6 (`pulp_wars-w49.6`): 354 commands, recomputed.
      // Tuning 7 (`pulp_wars-w49.10`): 365 commands, recomputed.
      // Tuning 8 (`pulp_wars-w49.11`): 364 commands, recomputed.
      // The economy rejig (`pulp_wars-w49.16`, 7r54): 338 commands (364);
      // the hashes below were recomputed with it.
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56: the Guard at
      // Fortification, one technology behind the root, and the Workshop at
      // the root): 357 commands (338); the five digests of play below were
      // recomputed, and the map and the post-generation PRNG digests are
      // unchanged. (The seed-7 match above is unchanged: no seat of it
      // buys the root.)
      // Step two of the Human pass (`pulp_wars-w49.22`: what a Human seat
      // of the Normal AI trains in a threatened city and with Coins kept
      // for a technology): 365 commands (357); the five digests of play
      // below were recomputed, the map and the post-generation PRNG
      // digests are unchanged, and so is the seed-7 match above.
      acceptedCommands: 365,
      rounds: 19,
      termination: "ROUND_CAP",
      mapHash:
        "a336769650f1bebe201dce1d1db118a695454f4ff534e90fbdf91f4b18cc5ea5",
      postGenerationPrngHash:
        "b11910d95aeab8c56bbf6f72f63d4e6f6b30f7e43f842d8354e7badf23e1050c",
      commandHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // f0241a…e2f2).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 29fd88…71a3).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 253847…8b8c).
        "dac6168851b4b6fe1495b56bc3affad1dc0abc9e83da965b10f3746eaa827a74",
      eventHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 6194fb…cc7c).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // a75ebd…9f75).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 72340f…2f4c).
        "c9421318c670efc61653ce082663d3b68b27647a6e9957fe59a0978859013ede",
      normalizedFinalStateHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 1f799a…0828).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 9c21de…5fb4).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 4638a2…1bc5).
        "8a36e1e2e4951ae35e442d07ebfcae35db6ce5a9bd08085fee2c74a211d60864",
      normalizedHumanViewHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 6111b8…5070).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 7825d2…a1b8).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 800648…83f9).
        "92c4d78c157733325e29f7d855741fd069a93583f6b35c41e73e0e4294eac25f",
      normalizedHumanCommandsHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 75cd99…98bf).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 881121…ae25).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // b7c041…ae40).
        "d6186d19f519841d5cd69e3f72e624fe8d8db49fa8875f73bb05eb9bfad21e5a",
    },
  ] as const;

  for (const baseline of BASELINE)
    it(`reproduces the revision-16 all-Human match for seed ${baseline.seed} apart from identity`, () => {
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
        // pulp_wars-w5j.1: a Human mirror through the test only option.
        allowDuplicateFactions: true,
        mapType: baseline.mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
        curiosities: false,
      };
      const result = runAiMatchV7(setup, {
        maxRounds: baseline.maxRounds,
        initialGame: revision13PlayableGameV7(setup),
      });
      // Revision 13 adds the neutral `graves: []` field to state and view;
      // parity is defined apart from identity and neutral values.
      const humanView = viewForV7(result.state, result.state.humanPlayerId);
      expect(result.state.graves).toEqual([]);
      expect(humanView.graves).toEqual([]);
      expect(result.metrics.eventsByKind.GRAVE_CREATED).toBe(0);
      expect(result.metrics.eventsByKind.UNIT_INFECTED).toBe(0);
      // Revision 14 afflictions never occur without Undead units.
      expect(result.state.plagued).toEqual([]);
      expect(result.state.bitten).toEqual([]);
      expect(humanView.plagued).toEqual([]);
      expect(humanView.bitten).toEqual([]);
      for (const kind of [
        "PLAGUE_DAMAGED",
        "PLAGUE_SPREAD",
        "PLAGUE_CLEARED",
        "BITTEN_UNIT_RISEN",
      ] as const)
        expect(result.metrics.eventsByKind[kind] ?? 0).toBe(0);
      // Revision 13 adds neutral Lifesteal/Infect fields to every combat
      // preview; they must be neutral and are removed before hashing.
      // Revision 14 adds neutral Plague/Bitten preview fields and Tend cure
      // flags; they must be neutral and are removed before hashing too.
      const neutralEvents = result.events.map((event) => {
        if (event.kind === "WOUNDED_TENDED")
          return {
            ...event,
            results: event.results.map(
              ({ curedPlague, curedBitten, curedChill, ...rest }) => {
                expect({ curedPlague, curedBitten, curedChill }).toEqual({
                  curedPlague: false,
                  curedBitten: false,
                  curedChill: false,
                });
                return rest;
              },
            ),
          };
        if (event.kind !== "COMBAT_RESOLVED") return event;
        const {
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
          plagued,
          attackerBitten,
          defenderBitten,
          attackerBittenRises,
          defenderBittenRises,
          gangUp,
          runUp,
          fortificationIgnored,
          acid,
          defenderArmoured,
          attackerArmoured,
          rayPower,
          coolingApplied,
          defenderShieldDamage,
          attackerShieldDamage,
          splash: shieldedSplash,
          shatters,
          coldBloodApplied,
          rockfallApplied,
          plantedApplied,
          blizzardHalved,
          snowCover,
          sweep,
          hiddenBlizzardPossible,
          dugIn,
          unflinchingApplied,
          platedApplied,
          sugarRushApplied,
          splatApplied,
          bounce,
          bounceTo,
          ram,
          torpedo,
          iceCover,
          icebound,
          shockDamage,
          crackApplied,
          frostbiteApplied,
          ...previewWithoutSplash
        } = event.preview;
        // The ninth unit (`pulp_wars-w49.17`, 7r55): three neutral fields
        // (no Human unit has a Shock Field, cracks, or frostbites).
        expect([shockDamage, crackApplied, frostbiteApplied]).toEqual([
          0,
          false,
          false,
        ]);
        // The frozen sea (pulp_wars-5ti.3): two neutral fields.
        expect([iceCover, icebound]).toEqual([false, false]);
        // The naval branch (pulp_wars-5ti.2): two fields that were neutral
        // while no seat researched Seamanship or Submersibles. Since tuning
        // 1 (`pulp_wars-w49.3`, 7r46: cheaper technology with many cities)
        // the seed-7 match researches Seamanship and rams, so they stay in
        // the hashed preview (below), like `fortificationIgnored`, which a
        // Breach now sets in an all-Human match.
        // The Candy revision (pulp_wars-jdb.3): four neutral fields.
        expect([sugarRushApplied, splatApplied, bounce, bounceTo]).toEqual([
          false,
          false,
          "NONE",
          null,
        ]);
        // The Dwarf revision (pulp_wars-78i.3): three neutral fields.
        expect([dugIn, unflinchingApplied, platedApplied]).toEqual([
          false,
          false,
          false,
        ]);
        // The Ice Folk revision: eight neutral combat-preview fields.
        expect([
          shatters,
          coldBloodApplied,
          rockfallApplied,
          plantedApplied,
          blizzardHalved,
          snowCover,
          sweep,
          hiddenBlizzardPossible,
        ]).toEqual([false, false, false, false, false, false, false, false]);
        // The Martian revision: the four neutral combat-preview fields and
        // the neutral `shieldDamage: 0` of every splash entry.
        expect({
          rayPower,
          coolingApplied,
          defenderShieldDamage,
          attackerShieldDamage,
        }).toEqual({
          rayPower: "NONE",
          coolingApplied: false,
          defenderShieldDamage: 0,
          attackerShieldDamage: 0,
        });
        const preview = {
          ...previewWithoutSplash,
          ram,
          torpedo,
          fortificationIgnored,
          splash: shieldedSplash.map(({ shieldDamage, ...entry }) => {
            expect(shieldDamage).toBe(0);
            return entry;
          }),
        };
        expect({
          runUp,
          acid,
          defenderArmoured,
          attackerArmoured,
        }).toEqual({
          runUp: 0,
          acid: false,
          defenderArmoured: false,
          attackerArmoured: false,
        });
        expect({
          gangUp,
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
          plagued,
          attackerBitten,
          defenderBitten,
          attackerBittenRises,
          defenderBittenRises,
        }).toEqual({
          gangUp: 0,
          attackerHeal: 0,
          defenderHeal: 0,
          attackerInfected: false,
          defenderInfected: false,
          plagued: [],
          attackerBitten: false,
          defenderBitten: false,
          attackerBittenRises: false,
          defenderBittenRises: false,
        });
        return { ...event, preview };
      });
      expect(
        result.events.some((event) => event.kind === "COMBAT_RESOLVED"),
      ).toBe(true);
      expect(result.metrics.eventHash).toBe(canonicalHash(result.events));
      const normalize = (value: unknown): unknown => {
        const {
          graves: _graves,
          plagued: _plagued,
          bitten: _bitten,
          eggs,
          shields,
          cooling,
          mindControlled,
          mindControlCooldowns,
          chilled,
          burrowed,
          surfacedThisTurn,
          bombedThisTurn,
          ...rest
        } = value as {
          graves: unknown;
          plagued: unknown;
          bitten: unknown;
          eggs: unknown;
          shields: unknown;
          cooling: unknown;
          mindControlled: unknown;
          mindControlCooldowns: unknown;
          chilled: unknown;
          burrowed: unknown;
          surfacedThisTurn: unknown;
          bombedThisTurn: unknown;
        };
        void _graves;
        void _plagued;
        void _bitten;
        expect(eggs).toEqual([]);
        // The Martian revision: four empty side lists in state and view.
        expect({
          shields,
          cooling,
          mindControlled,
          mindControlCooldowns,
        }).toEqual({
          shields: [],
          cooling: [],
          mindControlled: [],
          mindControlCooldowns: [],
        });
        // The Ice Folk revision: the empty Chill list, and the neutral tile
        // flags and unit stat, removed (any other value fails the match).
        expect(chilled).toEqual([]);
        // The Dwarf revision (pulp_wars-78i.3): three empty lists.
        expect([burrowed, surfacedThisTurn, bombedThisTurn]).toEqual([
          [],
          [],
          [],
        ]);
        let winterValues = 0;
        const neutral = JSON.parse(
          JSON.stringify(rest).replaceAll(RULESET_7_ID, "IDENTITY"),
          function (key, item: unknown) {
            if ((key === "snow" || key === "blizzard") && item === false)
              return undefined;
            if (key === "chill" && item === null) return undefined;
            // pulp_wars-5ti.2: the two naval-branch unit facts of a view, at
            // their neutral values (no seat ever holds Submersibles or
            // Seamanship here, so nothing is submerged; the boarding
            // threshold is a constant of the ship).
            if (key === "submerged" && item === false) return undefined;
            if (key === "boardableAt") return undefined;
            // The Patrol Boat's ability list names Ram (naval branch
            // section 2.1); it does nothing before Seamanship.
            if (key === "abilities" && Array.isArray(item))
              return item.filter((ability) => ability !== "RAM");
            // pulp_wars-ykw.2: the map revision a setup names (V3 since the
            // village density); the digests hash the name they were taken
            // with, like the identity.
            if (key === "mapGenerationRevision")
              return "REGIONAL_BIOMES_NAVAL_V2";
            // pulp_wars-w5j.1: the test only mirror option in the setup of
            // this all-Human match; parity is defined apart from it.
            if (key === "allowDuplicateFactions" && item === true)
              return undefined;
            // pulp_wars-737.2: the setup's `curiosities: false` and the empty
            // curiosity list of state and view (any other value fails).
            if (
              key === "curiosities" &&
              (item === false || (Array.isArray(item) && item.length === 0))
            )
              return undefined;
            // pulp_wars-5ti.3: the empty ice list of state and view (an
            // all-Human match never Freezes).
            if (key === "ice" && Array.isArray(item) && item.length === 0)
              return undefined;
            // pulp_wars-737.3: the empty Monster list of state and view.
            if (key === "monsters" && Array.isArray(item) && item.length === 0)
              return undefined;
            // pulp_wars-1wy.3: the empty per-turn Martian lists of state
            // and view (an all-Human match never fills them).
            if (
              (key === "beamedThisTurn" || key === "tractorUsedThisTurn") &&
              Array.isArray(item) &&
              item.length === 0
            )
              return undefined;
            // pulp_wars-jdb.3: the four empty Candy lists of state and view
            // (an all-Human match never fills them).
            if (
              (key === "sugarRush" ||
                key === "crumbs" ||
                key === "splattedThisTurn" ||
                key === "tossedThisTurn" ||
                // pulp_wars-w49.15: the empty hunted list (Pack Hunt).
                key === "huntedThisTurn") &&
              Array.isArray(item) &&
              item.length === 0
            )
              return undefined;
            // The ninth unit (`pulp_wars-w49.17`, 7r55): the empty
            // `ninthUnit` record of state and view (an all-Human match has
            // no Wight, Stegosaurus, or Whirligig).
            if (key === "ninthUnit") {
              expect(item).toEqual({
                wightGraves: [],
                risenWights: [],
                crackedThisTurn: [],
                struckThisTurn: [],
              });
              return undefined;
            }
            if (key === "snow" || key === "blizzard" || key === "chill")
              winterValues += 1;
            return item;
          },
        ) as {
          players: { achievementEntitlements?: unknown[] }[];
          viewer?: { achievementEntitlements: unknown[] };
          achievementProgress?: unknown[];
        };
        expect(winterValues).toBe(0);
        // Revision 21 appends four entitlements (and, in a view, four
        // progress entries) after the revision-5 three; they are removed
        // before hashing.
        const trimmed = <T extends { achievementEntitlements?: unknown[] }>(
          player: T,
        ): T =>
          player.achievementEntitlements === undefined
            ? player
            : {
                ...player,
                achievementEntitlements: player.achievementEntitlements.slice(
                  0,
                  3,
                ),
              };
        return {
          ...neutral,
          players: neutral.players.map(trimmed),
          ...(neutral.viewer === undefined
            ? {}
            : { viewer: trimmed(neutral.viewer) }),
          ...(neutral.achievementProgress === undefined
            ? {}
            : { achievementProgress: neutral.achievementProgress.slice(0, 3) }),
        };
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
          // pulp_wars-5ti.2: apart from the Research offers for the two
          // naval-branch technologies.
          queryPlayerCommandsV7(
            result.state,
            result.state.humanPlayerId,
          ).filter(
            (command) =>
              command.kind !== "RESEARCH" ||
              (command.tech !== "SEAMANSHIP" &&
                command.tech !== "SUBMERSIBLES"),
          ),
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
    }, 600_000);
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
  }, 600_000);
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
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

function initialWith(factions: readonly FactionIdV7[], seed = 2): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions, seed));
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
  // The economy rejig (`pulp_wars-w49.16`, 7r54): the giant is a level-6
  // reward (level 5 before). Level 6 takes 20 population and the capital
  // holds seven Farms (14), so six Farm tiles also carry a hunt (1
  // permanent population each), as in `rewardStateV7`.
  const reachedLevel = reward === "MILITIA" ? 3 : 6;
  const addedPopulation = reward === "MILITIA" ? 6 : 14;
  const addedPermanent = reward === "MILITIA" ? 0 : 6;
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
  const huntTiles = growthTiles.slice(0, addedPermanent);
  const grown = resolveCityGrowthV7(
    city,
    city.permanentPopulation + addedPermanent,
    economicPopulation,
  ).city;
  const state = checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + growthTiles.length + huntTiles.length,
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
                    { reachedLevel: 4, reward: "TREASURY_6" as const },
                    { reachedLevel: 5, reward: "TREASURY" as const },
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
      ...huntTiles.map((tile, index) => ({
        id: base.nextEntityId + growthTiles.length + index,
        cityId: city.id,
        category: "PERMANENT" as const,
        amount: 1,
        source: {
          kind: "RESOURCE_ACTION" as const,
          action: "HUNT_GAME" as const,
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
