import { describe, expect, it } from "vitest";
import {
  ALPHA_ATTACK2_V7,
  COMMAND_KIND_ORDER_V7,
  DINOSAUR_BASELINE_V1_NODES,
  DINOSAUR_ROLE_MECHANICS_V7,
  DINOSAUR_ROLE_RULES_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  EGG_DEFENSE2_V7,
  EGG_HP_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  MILITIA_FIGHTERS_V7,
  SHARED_BASELINE_NODES_V7,
  ORIGINAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7,
  RULESET_7_ID,
  SHOWCASE_UNIT_TEMPLATES_V7,
  showcaseUnitRoleV7,
  STARTING_FIGHTERS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  applyCommandV7,
  assertRuleset7Registry,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  factionTreeIdV7,
  nextBounded,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parsePlayerEventEnvelopeV7,
  parseReplayFileV7,
  playerIncomeV7,
  previewCityCapacityV7,
  projectEventsV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { unitArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import {
  cityOfV7,
  newUnitsV7,
  rewardStateV7,
} from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.2`): identity, Dinosaur registration, roster,
// technology text, starting units, substitutions, the Showcase, the declared
// Egg and Stampede shapes, and persistence
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md sections 2-4, 9.7, 9.8,
// 10, and 14). Slots, Grow, Wild, Acid, and Armoured are covered in
// tests/unit/ruleset-v7-dinosaur-rules.test.ts.

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

const EGG_LAID_ROLES: readonly UnitRoleIdV7[] = [
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CATAPULT",
  "KNIGHT",
  "SWORDSMAN",
];

describe("ruleset-7 revision-19 identity", () => {
  it("keeps r18 among the gap-free prior identities after the r55 identity, and the save key", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r72");
    expect(RULESET_7.id).toBe("pulp-wars-poc-7r72");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r72.current");
    expect([...PRIOR_RULESET_7_IDS]).toEqual([
      "pulp-wars-poc-7",
      ...Array.from(
        { length: 70 },
        (_, index) => `pulp-wars-poc-7r${index + 2}`,
      ),
    ]);
    expect(PRIOR_RULESET_7_IDS.at(-54)).toBe("pulp-wars-poc-7r18");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect([...OBSOLETE_SAVE_STORAGE_KEYS_V7]).toEqual([
      "pulpWars.save.v7.current",
      ...Array.from(
        { length: 70 },
        (_, index) => `pulpWars.save.v7r${index + 2}.current`,
      ),
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through v7r18 and preserves everything else", () => {
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r17.current", "r17"],
      ["pulpWars.save.v7r18.current", "r18"],
      [SAVE_STORAGE_KEY_V7, "r20"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r17.current",
        "pulpWars.save.v7r18.current",
      ],
      removedCount: 2,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.artSet.v1",
      "pulpWars.unrelated",
    ]);
  });

  it("rejects r18 setups, states, replays, and saves without migration", () => {
    const setup = goblinSetupV7(["DINOSAUR", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.rulesetId).toBe("pulp-wars-poc-7r72");
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r18" };
    expect(parseMatchSetupV7(setup)).not.toBeNull();
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: "pulp-wars-poc-7r18",
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
      "2026-10-01T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r18",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r18" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("ruleset-7 Dinosaur faction registration", () => {
  it("freezes the faction and tree orders, binding, display name, and faction rules", () => {
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
      "CULT",
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
      "CULT_BASELINE_V1",
    ]);
    expect(FACTION_IDS_V7.map(factionTreeIdV7)).toEqual(FACTION_TREE_IDS_V7);
    expect(FACTION_TREES_V7.DINOSAUR.faction).toBe("DINOSAUR");
    expect(RULESET_7.factionTrees.DINOSAUR.roleRules).toBe(
      DINOSAUR_ROLE_RULES_V7,
    );
    expect(FACTION_DISPLAY_NAMES_V7).toEqual({
      ORIGINAL: "Human",
      UNDEAD: "Undead",
      GOBLIN: "Goblin",
      DINOSAUR: "Dinosaur",
      MARTIAN: "Martian",
      ICE_FOLK: "Ice Folk",
      DWARF: "Dwarf",
      CANDY: "Candy",
      CULT: "Cultists",
    });
    // The registry assertion accepts the fourth tree unchanged.
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(
      FACTION_IDS_V7.map((faction) => [
        faction,
        factionRulesV7(faction).treasureUnitRole,
        factionRulesV7(faction).cityCapacityBonus,
        factionRulesV7(faction).gangUpMaximum,
        factionRulesV7(faction).restless,
      ]),
    ).toEqual([
      ["ORIGINAL", "KNIGHT", 0, 0, false],
      ["UNDEAD", "KNIGHT", 0, 0, true],
      ["GOBLIN", "KNIGHT", 1, 2, false],
      ["DINOSAUR", "RAIDER", 0, 0, false],
      ["MARTIAN", "RAIDER", 0, 0, false],
      ["ICE_FOLK", "RAIDER", 0, 0, false],
      ["DWARF", "RAIDER", 0, 0, false],
      ["CANDY", "RAIDER", 0, 0, false],
      // The Cultists (`pulp_wars-mch9.3`): the chest unit is a Familiar.
      ["CULT", "RAIDER", 0, 0, false],
    ]);
    expect([
      EGG_HP_V7,
      EGG_DEFENSE2_V7,
      GROWTH_KILLS_V7,
      GROWTH_HP_V7,
      ALPHA_ATTACK2_V7,
    ]).toEqual([6, 2, [1, 3], 4, 2]);
  });

  it("accepts Dinosaur seats in every combination and rejects a faction/tree mismatch", () => {
    for (const factions of [
      ["DINOSAUR", "ORIGINAL"],
      ["ORIGINAL", "DINOSAUR"],
      ["DINOSAUR", "UNDEAD"],
      ["GOBLIN", "DINOSAUR"],
      ["DINOSAUR", "DINOSAUR"],
      ["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"],
    ] as const)
      expect(parseMatchSetupV7(goblinSetupV7(factions))?.factions).toEqual(
        factions,
      );
    expect(
      parseMatchSetupV7({
        ...goblinSetupV7(["DINOSAUR", "ORIGINAL"]),
        factions: ["DINOSAUR", "NOT_A_FACTION"],
      }),
    ).toBeNull();
    const created = createPlayableGameV7(
      goblinSetupV7(["ORIGINAL", "DINOSAUR"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["DINOSAUR", "DINOSAUR_BASELINE_V1"],
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
        withPlayer({
          faction: "GOBLIN",
          factionTreeId: "DINOSAUR_BASELINE_V1",
        }),
      ),
    ).toBeNull();
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 1));
    expect([tree.id, tree.faction]).toEqual([
      "DINOSAUR_BASELINE_V1",
      "DINOSAUR",
    ]);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(view.players.map((player) => player.faction)).toEqual([
      "ORIGINAL",
      "DINOSAUR",
    ]);
    expect(view.leaderboard.map((entry) => entry.faction)).toEqual(
      state.turnOrder.map(
        (id) => state.players.find((player) => player.id === id)?.faction,
      ),
    );
  });

  it("generates identical boards, turn orders, treasure, and PRNG with Dinosaur seats", () => {
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
      const dinosaurs = humans.map(() => "DINOSAUR" as const);
      const mixed = humans.map(
        (_, seat): FactionIdV7 =>
          (["DINOSAUR", "UNDEAD", "GOBLIN", "ORIGINAL"] as const)[seat % 4] ??
          "ORIGINAL",
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
      for (const factions of [dinosaurs, mixed]) {
        const other = create(factions);
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect(other.nextEntityId).toBe(reference.nextEntityId);
        expect(other.eggs).toEqual([]);
        expect(
          other.units.map((unit) => [unit.id, unit.ownerId, unit.at]),
        ).toEqual(
          reference.units.map((unit) => [unit.id, unit.ownerId, unit.at]),
        );
      }
    }
  });
});

describe("ruleset-7 Dinosaur roster", () => {
  // Section 3: label, role, technology, cost, hatch, slots, HP, attack2,
  // defense2, move, minimum range, range, sight, attack after move,
  // abilities, tactical role.
  type Row = readonly [
    string,
    UnitRoleIdV7,
    string | null,
    number | null,
    number | null,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    boolean,
    readonly string[],
    string,
  ];
  const ROSTER: readonly Row[] = [
    // pulp_wars-c87.8: Caveman HP 12 (was 10), Triceratops hatch time 1
    // (was 2) and 1 slot (was 2); see the tuning record, section 15.4 of the
    // contract.
    [
      "Caveman",
      "FIGHTER",
      null,
      2,
      null,
      1,
      10,
      4,
      4,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE"],
      "LINE",
    ],
    [
      "Raptor",
      "RAIDER",
      "SCOUTING",
      4,
      1,
      1,
      12,
      5,
      2,
      2,
      1,
      1,
      2,
      true,
      ["ATTACK", "CAPTURE", "CHARGE", "GROW"],
      "SKIRMISHER",
    ],
    [
      "Spitter",
      "MARKSMAN",
      "MARKSMANSHIP",
      4,
      1,
      1,
      10,
      4,
      2,
      1,
      1,
      2,
      1,
      true,
      ["ATTACK", "CAPTURE", "ACID", "GROW"],
      "RANGED",
    ],
    [
      "Ankylosaurus",
      "GUARD",
      "FORTIFICATION",
      5,
      2,
      1,
      20,
      4,
      6,
      1,
      1,
      1,
      1,
      false,
      ["ATTACK", "CAPTURE", "ARMOURED", "GROW"],
      "DEFENDER",
    ],
    [
      "Shaman",
      "CAPTAIN",
      "ADMINISTRATION",
      5,
      null,
      1,
      10,
      2,
      2,
      1,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE", "RALLY", "TEND_WOUNDED", "HATCH"],
      "SUPPORT",
    ],
    [
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Stegosaurus is the
      // siege role the Triceratops left: hatch 2, 1 slot, 12 HP, Attack
      // 2.5, Defense 1, Move 1, range 2 to 3, never attacks after moving.
      "Stegosaurus",
      "CATAPULT",
      "SAWMILLING",
      7,
      2,
      1,
      12,
      5,
      2,
      1,
      2,
      3,
      1,
      false,
      ["ATTACK", "CAPTURE", "GROW"],
      "SIEGE",
    ],
    [
      // Revision 20 section 3: cost 14 (was 10), hatch 4 (was 3).
      "T-Rex",
      "KNIGHT",
      "CHIVALRY",
      14,
      4,
      2,
      28,
      8,
      4,
      2,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE", "OVERRUN", "GROW"],
      "BREAKTHROUGH",
    ],
    [
      "Brontosaurus",
      "JUGGERNAUT",
      null,
      null,
      null,
      2,
      45,
      7,
      8,
      1,
      1,
      1,
      1,
      true,
      // The giants' signatures (`pulp_wars-w49.30`): Thunder Stomp instead
      // of Push.
      ["ATTACK", "CAPTURE", "GROW", "STOMP"],
      "MYTHIC",
    ],
    [
      "Patrol Boat",
      "PATROL_BOAT",
      "SHORECRAFT",
      5,
      null,
      1,
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
      "NAVAL_SCREEN",
    ],
    [
      "Battleship",
      "BATTLESHIP",
      "NAVAL_ENGINEERING",
      16,
      null,
      1,
      25,
      12,
      8,
      2,
      1,
      3,
      3,
      false,
      ["ATTACK"],
      "NAVAL_CAPITAL",
    ],
    // The naval branch (`pulp_wars-5ti.2`): the shared Submarine.
    [
      "Submarine",
      "SUBMARINE",
      "SUBMERSIBLES",
      9,
      null,
      1,
      12,
      8,
      4,
      2,
      1,
      1,
      2,
      true,
      ["ATTACK", "SUBMERGED", "TORPEDO"],
      "NAVAL_HUNTER",
    ],
    // The ninth unit (7r55): the Triceratops is the heavy line role, at
    // Metallurgy, a `LINE` unit. Its numbers are those of revision 20
    // section 2.1: hatch 2, 2 slots, 20 HP, Move 2, attacks after moving,
    // Charge! (`LINEBREAKER`).
    [
      "Triceratops",
      "SWORDSMAN",
      "METALLURGY",
      8,
      2,
      2,
      20,
      6,
      4,
      2,
      1,
      1,
      1,
      true,
      ["ATTACK", "CAPTURE", "LINEBREAKER", "GROW"],
      "LINE",
    ],
  ];

  it("registers every value of the section 3 table", () => {
    expect(ROSTER.map((row) => row[1])).toEqual(UNIT_ROLE_IDS_V7);
    for (const [
      label,
      role,
      technology,
      cost,
      hatchTurns,
      capacitySlots,
      maxHp,
      attack2,
      defense2,
      move,
      minimumRange,
      range,
      sightRadius,
      mayUsePrimaryActionAfterMove,
      abilities,
      tacticalRole,
    ] of ROSTER) {
      expect(effectiveRoleRuleV7(role, "DINOSAUR"), label).toEqual({
        role,
        label,
        tacticalRole,
        cost,
        maxHp,
        attack2,
        defense2,
        move,
        range,
        minimumRange,
        sightRadius,
        technology,
        mayUsePrimaryActionAfterMove,
        abilities,
      });
      expect(roleMechanicsV7(role, "DINOSAUR"), label).toMatchObject({
        capacitySlots,
        hatchTurns,
      });
      // Tactical-role metadata equals that of the same mechanical role.
      expect(tacticalRole).toBe(ORIGINAL_ROLE_RULES_V7[role].tacticalRole);
    }
  });

  it("registers the Dinosaur engine mechanics and leaves every other faction on one slot", () => {
    expect(
      UNIT_ROLE_IDS_V7.map((role) => {
        const mechanics = DINOSAUR_ROLE_MECHANICS_V7[role];
        return [
          role,
          mechanics.capacitySlots,
          mechanics.hatchTurns,
          mechanics.runUpBonus2,
          mechanics.armourReduction,
          mechanics.buildsFieldDefense,
          mechanics.advancesAfterKill,
          mechanics.splash,
        ];
      }),
    ).toEqual([
      ["FIGHTER", 1, null, 0, 0, false, true, false],
      ["RAIDER", 1, 1, 0, 0, false, true, false],
      ["MARKSMAN", 1, 1, 0, 0, false, true, false],
      ["GUARD", 1, 2, 0, 1, false, true, false],
      ["CAPTAIN", 1, null, 0, 0, false, true, false],
      ["CATAPULT", 1, 2, 0, 0, false, false, false],
      ["KNIGHT", 2, 4, 0, 0, false, true, false],
      ["JUGGERNAUT", 2, null, 0, 0, false, true, false],
      ["PATROL_BOAT", 1, null, 0, 0, false, true, false],
      ["BATTLESHIP", 1, null, 0, 0, false, true, true],
      ["SUBMARINE", 1, null, 0, 0, false, true, false],
      ["SWORDSMAN", 2, 2, 2, 0, false, true, false],
    ]);
    for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN"] as const)
      for (const role of UNIT_ROLE_IDS_V7) {
        expect(roleMechanicsV7(role, faction)).toMatchObject({
          capacitySlots: 1,
          hatchTurns: null,
          runUpBonus2: 0,
          armourReduction: 0,
        });
        // No other faction has a Dinosaur ability.
        expect(
          effectiveRoleRuleV7(role, faction).abilities.filter((ability) =>
            ["LINEBREAKER", "HATCH", "ACID", "ARMOURED", "GROW"].includes(
              ability,
            ),
          ),
        ).toEqual([]);
      }
    // The egg-laid roles are exactly the roles with a hatch time.
    expect(
      UNIT_ROLE_IDS_V7.filter(
        (role) => roleMechanicsV7(role, "DINOSAUR").hatchTurns !== null,
      ),
    ).toEqual(EGG_LAID_ROLES);
  });

  it("keeps the Human boats' rules and maps Dinosaur units and boats to their own art subject", () => {
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const)
      expect(effectiveRoleRuleV7(role, "DINOSAUR")).toEqual(
        effectiveRoleRuleV7(role, "ORIGINAL"),
      );
    expect(
      unitArtSubjectV7({ role: "KNIGHT", form: "LAND", faction: "DINOSAUR" }),
    ).toBe("UNIT:DINOSAUR:KNIGHT");
    expect(
      unitArtSubjectV7({
        role: "BATTLESHIP",
        form: "NAVAL",
        faction: "DINOSAUR",
      }),
      // The Dinosaurs' own ships since bead pulp_wars-w5j.3 (same rules).
    ).toBe("UNIT:DINOSAUR:BATTLESHIP");
    expect(
      unitArtSubjectV7({
        role: "RAIDER",
        form: "EMBARKED",
        faction: "DINOSAUR",
      }),
    ).toBe("UNIT:DINOSAUR:EMBARKED_TRANSPORT");
  });

  it("refunds half the printed cost on Disband and never disbands a Brontosaurus", () => {
    const refunds = [
      ["FIGHTER", 1],
      ["RAIDER", 2],
      ["MARKSMAN", 2],
      ["GUARD", 2],
      ["CAPTAIN", 2],
      ["SWORDSMAN", 4],
      // The Stegosaurus (7r55): half of 7, rounded down.
      ["CATAPULT", 3],
      // Revision 20: half of 14.
      ["KNIGHT", 7],
    ] as const;
    for (const [role, refund] of refunds) {
      const state = goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role, at: { x: 4, y: 3 } },
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
      );
      const command: CommandV7 = {
        kind: "DISBAND",
        unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      };
      expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
        command,
      );
      const result = applyOkV7(state, state.humanPlayerId, command);
      expect(result.events[0], role).toMatchObject({
        kind: "UNIT_DISBANDED",
        role,
        coinDelta: refund,
      });
      expect(parseEventV7(result.events[0]).ok).toBe(true);
    }
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "JUGGERNAUT", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const disband: CommandV7 = {
      kind: "DISBAND",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
    };
    expect(
      queryPlayerCommandsV7(state, state.humanPlayerId),
    ).not.toContainEqual(disband);
    expect(applyCommandV7(state, state.humanPlayerId, disband)).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID" },
    });
  });

  it("counts the Dinosaur trainable roles for Muster and excludes the Brontosaurus", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 0, role: "RAIDER", at: { x: 5, y: 3 } },
        { seat: 0, role: "SWORDSMAN", at: { x: 6, y: 3 } },
        { seat: 0, role: "JUGGERNAUT", at: { x: 7, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    expect(
      achievementProgressV7(state, state.humanPlayerId).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 3 });
    expect(
      UNIT_ROLE_IDS_V7.filter(
        (role) => effectiveRoleRuleV7(role, "DINOSAUR").cost !== null,
      ),
    ).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "PATROL_BOAT",
      "BATTLESHIP",
      "SUBMARINE",
      "SWORDSMAN",
    ]);
  });
});

describe("ruleset-7 Dinosaur technology", () => {
  it("differs from the Human graph only in the Fortification and Explosives unlocks", () => {
    expect(DINOSAUR_BASELINE_V1_NODES).toHaveLength(
      SHARED_BASELINE_NODES_V7.length,
    );
    SHARED_BASELINE_NODES_V7.forEach((human, index) => {
      const dinosaur = DINOSAUR_BASELINE_V1_NODES[index];
      if (dinosaur === undefined) throw new Error("node missing");
      expect([
        dinosaur.id,
        dinosaur.branch,
        dinosaur.tier,
        dinosaur.prerequisites,
        dinosaur.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        human.unlockedRoles,
      ]);
      // Revision 20: Nesting also grants a city slot, and Explosives
      // (Wallbreaker) keeps both Human unlocks and adds `WALLBREAKER`.
      if (human.id === "FORTIFICATION")
        expect(dinosaur.unlocks).toEqual([
          // The Dinosaur pass, correction (7r53): no turn off the hatch.
          { kind: "NESTING", eggHp: 4, hatchTurns: 0, citySlots: 1 },
          // The Industry reshuffle (7r56): the defender is here.
          { kind: "UNIT_ROLE", role: "GUARD" },
        ]);
      else if (human.id === "EXPLOSIVES")
        expect(dinosaur.unlocks).toEqual([
          ...human.unlocks,
          { kind: "WALLBREAKER" },
        ]);
      else expect(dinosaur.unlocks).toEqual(human.unlocks);
    });
    const unlocks = (tech: string) =>
      DINOSAUR_BASELINE_V1_NODES.find((node) => node.id === tech)?.unlocks;
    expect(unlocks("ADMINISTRATION")).toContainEqual({
      kind: "CAPTAIN_SUPPORT",
    });
    expect(unlocks("CHIVALRY")).toContainEqual({ kind: "OVERRUN" });
    expect(unlocks("RAIDING")).toContainEqual({
      kind: "CHARGE_BONUS",
      attack: 1,
      minimumMove: 2,
    });
  });

  it("reads Nesting through the two Egg capabilities and never unlocks Field Defense", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [
          faction,
          capabilities.eggHpBonus,
          capabilities.eggHatchTurnReduction,
          capabilities.commands.includes("BUILD_FIELD_DEFENSE"),
        ];
      }),
    ).toEqual([
      ["ORIGINAL", 0, 0, true],
      ["UNDEAD", 0, 0, true],
      ["GOBLIN", 0, 0, true],
      ["DINOSAUR", 4, 0, false],
      // The Martian Fortification is Force Fields: no Field Defense either.
      ["MARTIAN", 0, 0, false],
      // The Ice Folk Fortification is Deep Winter: no Field Defense.
      ["ICE_FOLK", 0, 0, false],
      // The Dwarf Fortification is Dig In: no Field Defense.
      ["DWARF", 0, 0, false],
      ["CANDY", 0, 0, false],
      // The Cult Fortification is Warding Circles: no Field Defense.
      ["CULT", 0, 0, false],
    ]);
    const drill = technologyCapabilitiesV7(["DRILL"], "DINOSAUR");
    expect([drill.eggHpBonus, drill.eggHatchTurnReduction]).toEqual([0, 0]);
    // Everything else is the Human table.
    const dinosaur = technologyCapabilitiesV7(all, "DINOSAUR");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    // (The ninth unit, 7r55: every faction has the heavy line role.)
    expect(dinosaur.trainableRoles).toEqual(human.trainableRoles);
    expect(dinosaur.roleSightRadius).toEqual({ RAIDER: 2, MARKSMAN: 2 });
    expect(dinosaur.forestMovementFreedomRoles).toEqual(["RAIDER", "MARKSMAN"]);
    // Tuning 4: Commerce pays 1 Coin per linked city (2 since tuning 1).
    expect(dinosaur.landTradeIncomeCoins).toBe(1);
    expect(dinosaur.plunderCoins).toBe(0);
    expect(dinosaur.commands).toEqual(
      human.commands.filter((command) => command !== "BUILD_FIELD_DEFENSE"),
    );
  });

  it("names and describes technologies from the viewer's faction", () => {
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.DINOSAUR).toEqual({
      FORTIFICATION: "Nesting",
      EXPLOSIVES: "Wallbreaker",
      // The Dinosaur pass, correction: the technology of the Chopping Block.
      SAWMILLING: "Timber",
      // The ninth unit (7r55): the nodes named for their building or unit.
      MILLING: "Grinding",
      MARKSMANSHIP: "Spitters",
      CHIVALRY: "T-Rex",
      METALLURGY: "Triceratops",
    });
    expect(
      FACTION_IDS_V7.map((faction) => technologyNameV7("EXPLOSIVES", faction)),
    ).toEqual([
      "Explosives",
      // The Undead pass, correction (`pulp_wars-w49.13`).
      "Pestilence",
      "Explosives",
      "Wallbreaker",
      "Disintegrator",
      "Brittle",
      "Blasting Charges",
      "Peppermint Surprise",
      "The Stars Are Right",
    ]);
    expect(
      FACTION_IDS_V7.map((faction) =>
        technologyNameV7("FORTIFICATION", faction),
      ),
    ).toEqual([
      "Fortification",
      "Fortification",
      "Fortification",
      "Nesting",
      "Force Fields",
      "Deep Winter",
      "Dig In",
      "Home Sweet Home",
      "Warding Circles",
    ]);
    for (const tech of TECHNOLOGY_IDS_V7)
      if (
        tech !== "FORTIFICATION" &&
        tech !== "EXPLOSIVES" &&
        tech !== "SAWMILLING" &&
        // The ninth unit (7r55): the nodes named for a building or unit.
        !Object.hasOwn(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.DINOSAUR, tech)
      )
        expect(technologyNameV7(tech, "DINOSAUR")).toBe(
          technologyNameV7(tech, "ORIGINAL"),
        );
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
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
    expect(text(0, "FORTIFICATION")).toEqual([
      // The Industry reshuffle (7r56): the defender is laid with Nesting.
      "Ankylosaurus Egg",
      "Eggs have +4 HP; +1 unit slot in every city",
    ]);
    expect(text(0, "EXPLOSIVES")).toEqual([
      "Blast Mountain (3 Coins): a Mountain in your territory or next to one of your units becomes Grass, and every unit on it or next to it takes 5 damage, yours too except the one that sets it; in your territory its city gains +1 population",
      "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense",
      // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): and the run-up.
      "A Triceratops's run-up counts 2 tiles (up to +2 Attack); dinosaurs ignore City Walls",
    ]);
    expect(text(1, "EXPLOSIVES")).toEqual([
      "Blast Mountain (3 Coins): a Mountain in your territory or next to one of your units becomes Grass, and every unit on it or next to it takes 5 damage, yours too except the one that sets it; in your territory its city gains +1 population",
      "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense",
    ]);
    // The ninth unit (7r55): the Triceratops is at Metallurgy and the
    // Stegosaurus at Sawmilling.
    expect(text(0, "METALLURGY")).toContain("Triceratops Egg (Charge!)");
    expect(text(0, "SAWMILLING")[0]).toContain("Stegosaurus Egg");
    expect(text(1, "FORTIFICATION")).toEqual([
      "Train Guard",
      "Build Field Defense: +2 Defense for the unit on it; the builder keeps its move and attack",
    ]);
    expect(text(0, "ADMINISTRATION")).toEqual([
      "Train Shaman",
      "Disband",
      "Build market",
      "Shamans beat War Drums or Tend nearby troops, and Hatch Eggs",
    ]);

    expect(text(0, "MARKSMANSHIP")).toEqual(["Spitter Egg"]);
    expect(text(0, "SCOUTING")).toEqual(["Raptor Egg", "Raptor sight 2"]);
    // The Industry reshuffle (7r56): the root gives the Workshop, and the
    // Ankylosaurus Egg is at Nesting (above).
    expect(text(0, "DRILL")).toEqual([
      "Build workshop",
      "Workshop: grows with varied neighbors",
      "Reveals Ore",
      "+2 Coins for each city you capture",
    ]);
    expect(text(0, "CHIVALRY")).toEqual(
      expect.arrayContaining([
        "T-Rex Egg",
        "Rampage: T-Rexes advance after a kill and may attack again",
      ]),
    );
    expect(text(0, "RAIDING")).toContain(
      "Pounce: Raptors gain +1 Attack after moving 2+ cells",
    );
    expect(text(0, "FIELDCRAFT")).toEqual(
      expect.arrayContaining([
        "Raptor and Spitter move freely through forest",
        "Spitter sight 2",
      ]),
    );
    // A Human viewer of the same match reads the Human text.
    expect(text(1, "CHIVALRY")).toContain(
      "Knights advance after a kill and may attack again",
    );
    expect(text(1, "RAIDING")).toContain(
      "Raiders gain +1 Attack after moving 2+ cells",
    );
  });

  it("labels Inspired as War Drums, Overrun as Rampage, and Charge as Pounce in public unit stats", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "RAIDER",
          at: { x: 4, y: 3 },
          activation: { moved: true, movedPathLength: 2, inspired: true },
        },
        {
          seat: 0,
          role: "KNIGHT",
          at: { x: 6, y: 3 },
          activation: {
            attacked: true,
            attacksUsed: 1,
            overrunActive: true,
          },
        },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    const raptor = publicUnitStatsV7(state, unitAtV7(state, { x: 4, y: 3 }));
    const attack = raptor.stats.find((stat) => stat.id === "ATTACK");
    expect(
      attack?.modifiers.map((term) => [term.source, term.sourceLabel]),
    ).toEqual([
      ["CHARGE", "Pounce"],
      ["INSPIRED", "War Drums"],
    ]);
    expect(attack?.total).toEqual({ numerator: 9, denominator: 2 });
    expect(raptor.statuses).toEqual([
      "War Drums: +1 Attack on the next attack",
    ]);
    expect(
      publicUnitStatsV7(state, unitAtV7(state, { x: 6, y: 3 })).statuses,
    ).toEqual(["Rampage: attack again"]);
    // The `dinosaur` block exists exactly for units of a Dinosaur seat.
    expect(raptor.dinosaur).toEqual({
      capacitySlots: 1,
      growthStage: 0,
      killsToNextStage: 1,
      armourReduction: 0,
      acid: false,
      runUpBonus: 0,
      runUpMaximum: 0,
      egg: null,
    });
    expect(
      publicUnitStatsV7(state, unitAtV7(state, { x: 1, y: 1 })),
    ).not.toHaveProperty("dinosaur");
  });
});

describe("ruleset-7 Dinosaur starting units and substitutions", () => {
  it("starts a Dinosaur seat with one Caveman, 3 Coins, no technology, and no Egg", () => {
    expect(STARTING_FIGHTERS_V7.DINOSAUR).toBe(1);
    expect(MILITIA_FIGHTERS_V7.DINOSAUR).toBe(1);
    for (const [seed, mapType, factions] of [
      [3, "PANGEA", ["DINOSAUR", "ORIGINAL"]],
      [4, "ARCHIPELAGO", ["GOBLIN", "DINOSAUR"]],
      [9, "LAKES", ["DINOSAUR", "DINOSAUR"]],
      [11, "CONTINENTS", ["UNDEAD", "DINOSAUR", "ORIGINAL", "GOBLIN"]],
    ] as const) {
      const initial = createInitialMapStateV7({
        ...goblinSetupV7(factions, seed),
        mapType,
      });
      if (!initial.ok) throw new Error(initial.error.code);
      const { state } = initial;
      expect(state.eggs).toEqual([]);
      expect(state.units).toHaveLength(factions.length);
      factions.forEach((faction, seat) => {
        const player = state.players[seat];
        const capital = state.cities[seat];
        const unit = state.units[seat];
        if (player === undefined || capital === undefined || unit === undefined)
          throw new Error("seat missing");
        expect([player.coins, player.researchedTechs]).toEqual([3, []]);
        expect(unit).toMatchObject({
          id: seat * 2 + 2,
          ownerId: player.id,
          role: "FIGHTER",
          form: "LAND",
          at: capital.at,
          homeCityId: capital.id,
          kills: 0,
          veteran: false,
        });
        if (faction === "DINOSAUR") {
          expect([unit.hp, unit.maxHp]).toEqual([10, 10]);
          expect(unitRoleRuleV7(state, unit).label).toBe("Caveman");
        }
      });
    }
  });

  it("grants one exhausted Caveman for Militia", () => {
    const fixture = rewardStateV7("MILITIA", "DINOSAUR");
    const city = cityOfV7(fixture.state, 0);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const created = newUnitsV7(fixture.state, result.state);
    expect(created).toHaveLength(1);
    const caveman = created[0];
    if (caveman === undefined) throw new Error("Caveman missing");
    expect(caveman).toMatchObject({
      role: "FIGHTER",
      form: "LAND",
      at: city.at,
      // pulp_wars-0hi.3: Caveman HP 10 (12 between c87.8 and 0hi.3).
      hp: 10,
      maxHp: 10,
      homeCityId: city.id,
    });
    expect(caveman.activation).toMatchObject({
      moved: true,
      attacked: true,
      handled: true,
    });
    expect(unitRoleRuleV7(result.state, caveman).label).toBe("Caveman");
    expect(
      result.events.filter((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toEqual([
      expect.objectContaining({ role: "FIGHTER", unitId: caveman.id }),
    ]);
    expect(result.state.eggs).toEqual([]);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
  });

  it("grants a hatched 2-slot Brontosaurus for the level-6 reward, over capacity", () => {
    // Three T-Rexes and two Cavemen already use 8 of the capital's 9 slots
    // (level 6 since the economy rejig, 7r54; Planning, and since revision
    // 20 Nesting).
    const fixture = rewardStateV7("JUGGERNAUT", "DINOSAUR", [
      { role: "KNIGHT", at: { x: 4, y: 3 } },
      { role: "KNIGHT", at: { x: 5, y: 3 } },
      { role: "KNIGHT", at: { x: 6, y: 3 } },
      { role: "FIGHTER", at: { x: 4, y: 2 } },
      { role: "FIGHTER", at: { x: 5, y: 2 } },
    ]);
    const city = cityOfV7(fixture.state, 0);
    expect(cityUnitCapacityV7(fixture.state, city)).toBe(9);
    expect(assignedUnitCountV7(fixture.state, city.id)).toBe(8);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const created = newUnitsV7(fixture.state, result.state);
    expect(created).toHaveLength(1);
    const brontosaurus = created[0];
    if (brontosaurus === undefined) throw new Error("Brontosaurus missing");
    expect(brontosaurus).toMatchObject({
      role: "JUGGERNAUT",
      form: "LAND",
      at: city.at,
      hp: 45,
      maxHp: 45,
      kills: 0,
      homeCityId: city.id,
    });
    expect(unitRoleRuleV7(result.state, brontosaurus).label).toBe(
      "Brontosaurus",
    );
    expect(assignedUnitCountV7(result.state, city.id)).toBe(10);
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 9,
      assigned: 10,
      available: 0,
      overCapacity: 1,
    });
    expect(result.state.eggs).toEqual([]);
  });

  describe("treasure", () => {
    const knightSeed = (() => {
      let seed = 0;
      while (
        nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
          .value !== 1
      )
        seed += 1;
      return seed;
    })();
    const treasure = (
      faction: FactionIdV7,
      extra: readonly UnitRoleIdV7[],
      round = 1,
    ): {
      readonly before: GameStateV7;
      readonly after: GameStateV7;
      readonly events: readonly DomainEventV7[];
    } => {
      // No technology: a level-1 capital holds 2 slots.
      const arena = goblinArenaV7(
        [faction, "ORIGINAL"],
        [
          { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
          ...extra.map((role, index) => ({
            seat: 0,
            role,
            at: { x: 4 + index, y: 1 },
          })),
          { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
        ],
        { techs: { 0: [] } },
      );
      const before = checkedV7({
        ...arena,
        round,
        random: { ...arena.random, state: knightSeed },
        treasureChests: [{ x: 5, y: 3 }],
      });
      const result = applyOkV7(before, before.humanPlayerId, {
        kind: "MOVE",
        unitId: unitAtV7(before, { x: 4, y: 3 }).id,
        path: [{ x: 5, y: 3 }],
      });
      return { before, after: result.state, events: result.events };
    };

    it("spawns a Raptor with a free slot and keeps the KNIGHT reward literal", () => {
      const { before, after, events } = treasure("DINOSAUR", []);
      const event = events.find((item) => item.kind === "TREASURE_CAPTURED");
      expect(event).toMatchObject({
        requestedReward: "KNIGHT",
        grantedReward: "KNIGHT",
        knightFallback: false,
        coinDelta: 0,
      });
      expect(parseEventV7(event).ok).toBe(true);
      const created = newUnitsV7(before, after);
      expect(created).toHaveLength(1);
      const raptor = created[0];
      if (raptor === undefined) throw new Error("treasure unit missing");
      expect(raptor).toMatchObject({
        role: "RAIDER",
        form: "LAND",
        hp: 12,
        maxHp: 12,
        kills: 0,
        homeCityId: cityOfV7(before, 0).id,
      });
      expect(raptor.activation.handled).toBe(true);
      expect(unitRoleRuleV7(after, raptor).label).toBe("Raptor");
      expect(after.eggs).toEqual([]);
    });

    it("falls back to 5 Coins when no city has a free slot", () => {
      // The mover and a second Caveman fill the 2-slot capital.
      const full = treasure("DINOSAUR", ["FIGHTER"]);
      expect(
        full.events.find((item) => item.kind === "TREASURE_CAPTURED"),
      ).toMatchObject({
        requestedReward: "KNIGHT",
        grantedReward: "COINS",
        knightFallback: true,
        coinDelta: 5,
        spawnedUnitId: null,
      });
      expect(newUnitsV7(full.before, full.after)).toEqual([]);
      // A 2-slot unit fills (and exceeds) it as well.
      const big = treasure("DINOSAUR", ["KNIGHT"]);
      expect(assignedUnitCountV7(big.before, cityOfV7(big.before, 0).id)).toBe(
        3,
      );
      expect(
        big.events.find((item) => item.kind === "TREASURE_CAPTURED"),
      ).toMatchObject({ grantedReward: "COINS", knightFallback: true });
    });

    it("keeps the KNIGHT role for Human, Undead, and Goblin seats from round 15", () => {
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): before round 15 a chest gives
      // these seats their RAIDER-role unit, as it always gives a Dinosaur.
      for (const [faction, label, early] of [
        ["ORIGINAL", "Knight", "Raider"],
        ["UNDEAD", "Vampire", "Ghoul"],
        ["GOBLIN", "Scrap Buggy", "Wolf Rider"],
      ] as const) {
        const { before, after } = treasure(faction, [], 15);
        const created = newUnitsV7(before, after);
        expect(created.map((unit) => unit.role)).toEqual(["KNIGHT"]);
        const unit = created[0];
        if (unit === undefined) throw new Error("treasure unit missing");
        expect(unitRoleRuleV7(after, unit).label).toBe(label);
        const first = treasure(faction, [], 14);
        const earlyUnits = newUnitsV7(first.before, first.after);
        expect(earlyUnits.map((item) => item.role)).toEqual(["RAIDER"]);
        const earlyUnit = earlyUnits[0];
        if (earlyUnit === undefined) throw new Error("treasure unit missing");
        expect(unitRoleRuleV7(first.after, earlyUnit).label).toBe(early);
      }
    });
  });

  it("trains the Caveman and the Shaman with TRAIN and never an egg-laid role", () => {
    for (const role of ["FIGHTER", "CAPTAIN"] as const) {
      const state = goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
      );
      const city = cityOfV7(state, 0);
      const train: CommandV7 = { kind: "TRAIN", cityId: city.id, role };
      expect(queryPlayerCommandsV7(state, state.humanPlayerId)).toContainEqual(
        train,
      );
      const result = applyOkV7(state, state.humanPlayerId, train);
      const rule = effectiveRoleRuleV7(role, "DINOSAUR");
      expect(result.events[0]).toMatchObject({
        kind: "UNIT_TRAINED",
        role,
        cost: rule.cost,
        at: city.at,
      });
      expect(parseEventV7(result.events[0]).ok).toBe(true);
      const trained = unitAtV7(result.state, city.at);
      expect(trained).toMatchObject({
        role,
        form: "LAND",
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        homeCityId: city.id,
      });
      // Exhausted until its owner's next Start Turn, then ready.
      expect(trained.activation.handled).toBe(true);
      const next = endTurnUntilV7(result.state, state.humanPlayerId).state;
      expect(unitAtV7(next, city.at).activation.handled).toBe(false);
      expect(result.state.eggs).toEqual([]);
    }
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
    );
    // Section 6.3: `TRAIN` with an egg-laid role is rejected for a Dinosaur
    // seat and never offered; the same roles stay trainable for a Human.
    for (const role of EGG_LAID_ROLES) {
      const train: CommandV7 = {
        kind: "TRAIN",
        cityId: cityOfV7(state, 0).id,
        role,
      };
      expect(
        queryPlayerCommandsV7(state, state.humanPlayerId),
      ).not.toContainEqual(train);
      expect(applyCommandV7(state, state.humanPlayerId, train)).toEqual({
        accepted: false,
        state,
        events: [],
        error: { code: "UNIT_ROLE_INVALID", params: { role } },
      });
    }
    const human = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }],
    );
    for (const role of EGG_LAID_ROLES)
      expect(
        applyCommandV7(human, human.humanPlayerId, {
          kind: "TRAIN",
          cityId: cityOfV7(human, 0).id,
          role,
        }).accepted,
      ).toBe(true);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "TRAIN",
        cityId: cityOfV7(state, 0).id,
        role: "JUGGERNAUT",
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "UNIT_ROLE_INVALID" },
    });
  });
});

describe("ruleset-7 Dinosaur Showcase", () => {
  const showcase = (factions: readonly FactionIdV7[]): MatchSetupV7 => ({
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 16,
    height: 16,
    aiCount: (factions.length - 1) as 1 | 2 | 3,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });

  it("gives a Dinosaur seat ten hatched stage-0 units on the same tiles, homes, and IDs", () => {
    const create = (factions: readonly FactionIdV7[]) => {
      const created = createInitialMapStateV7(showcase(factions));
      if (!created.ok) throw new Error(created.error.code);
      return created.state;
    };
    const state = create(["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    const reference = create(["ORIGINAL", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(state.board).toEqual(reference.board);
    expect(state.cities).toEqual(reference.cities);
    expect(state.populationContributions).toEqual(
      reference.populationContributions,
    );
    expect(state.nextEntityId).toBe(reference.nextEntityId);
    expect(state.eggs).toEqual([]);
    expect(
      state.units.map((unit) => [
        unit.id,
        unit.ownerId,
        unit.role,
        unit.form,
        unit.at,
        unit.homeCityId,
      ]),
    ).toEqual(
      // The ninth unit (7r55): the Triceratops stands where it stood (the
      // siege unit's tile, as the heavy role) and the Stegosaurus on the
      // ninth unit's tile (`showcaseUnitRoleV7`).
      reference.units.map((unit) => [
        unit.id,
        unit.ownerId,
        unit.ownerId === seatIdV7(reference, 0)
          ? showcaseUnitRoleV7(unit.role, "DINOSAUR")
          : unit.role,
        unit.form,
        unit.at,
        unit.homeCityId,
      ]),
    );
    const dinosaurId = seatIdV7(state, 0);
    const own = state.units.filter((unit) => unit.ownerId === dinosaurId);
    expect(own.map((unit) => unit.role)).toEqual(
      SHOWCASE_UNIT_TEMPLATES_V7.map((entry) =>
        showcaseUnitRoleV7(entry.role, "DINOSAUR"),
      ),
    );
    for (const unit of own) {
      const rule = effectiveRoleRuleV7(unit.role, "DINOSAUR");
      expect(unit).toMatchObject({
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
      });
      expect(unit.form).not.toBe("EGG");
      const stats = publicUnitStatsV7(state, unit);
      expect(stats.dinosaur?.growthStage).toBe(
        rule.abilities.includes("GROW") ? 0 : null,
      );
      expect(stats.dinosaur?.egg).toBeNull();
    }
    // Every technology is researched, so Nesting is too.
    expect(
      state.players.find((player) => player.id === dinosaurId)?.researchedTechs,
    ).toEqual(TECHNOLOGY_IDS_V7);
    // Used slots (revision 20 section 4.1): the Triceratops uses two slots
    // again and Nesting adds a slot to every city, so the capital starts
    // exactly full at 8 of 8 and North at 3 of 7. The naval branch
    // (`pulp_wars-5ti.2`): the Coast city is level 4 (Harbours) and homes
    // the Submarine too, so it is at 3 of 7.
    const slots = state.cities
      .filter((city) => city.ownerId === dinosaurId)
      .map((city) => [
        assignedUnitCountV7(state, city.id),
        cityUnitCapacityV7(state, city),
      ]);
    // (7r55: North also homes the Stegosaurus, 4 of 7.)
    expect(slots).toEqual([
      [8, 8],
      [4, 7],
      [3, 7],
    ]);
    // The other seats keep one slot per unit.
    expect(
      state.cities
        .filter((city) => city.ownerId === seatIdV7(state, 1))
        .map((city) => assignedUnitCountV7(state, city.id)),
    ).toEqual([5, 4, 3]);
    // The first income is the Human one (19 since land trade pays 2 Coins;
    // tuning 1, 7r46).
    // Tuning 3: 21, since the linked capital earns land trade too.
    // Tuning 4: 18, since land trade pays 1 Coin. 20 since the reward
    // ladder rework (`pulp_wars-zypi`): North's and Coast's level-4 record
    // is the Economic Miracle (+1 Coin each).
    expect(playerIncomeV7(state, dinosaurId).totalCoins).toBe(20);
    expect(playerIncomeV7(reference, dinosaurId).totalCoins).toBe(20);
  });

  it("cannot train or lay in the over-capacity capital but can in North and at the Coast docks", () => {
    const created = createPlayableGameV7(showcase(["DINOSAUR", "ORIGINAL"]));
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const [capital, north, coast] = state.cities.filter(
      (city) => city.ownerId === state.humanPlayerId,
    );
    if (capital === undefined || north === undefined || coast === undefined)
      throw new Error("city missing");
    const commands = queryPlayerCommandsV7(state, state.humanPlayerId);
    const trains = commands.filter(
      (command) => command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL",
    );
    expect(trains.some((command) => command.cityId === capital.id)).toBe(false);
    expect(
      applyCommandV7(state, state.humanPlayerId, {
        kind: "TRAIN",
        cityId: capital.id,
        role: "FIGHTER",
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "CITY_SPAWN_OCCUPIED" },
    });
    // The Caveman and the Shaman are the only trained land roles.
    expect(
      trains
        .filter(
          (command) => command.kind === "TRAIN" && command.cityId === north.id,
        )
        .map((command) => (command.kind === "TRAIN" ? command.role : null)),
    ).toEqual(["FIGHTER", "CAPTAIN"]);
    // The Showcase starts with hatched units only; North and the Coast can
    // lay every Egg from the first turn (section 2.4), the capital none.
    expect(state.eggs).toEqual([]);
    expect(state.units.every((unit) => unit.form !== "EGG")).toBe(true);
    const lays = commands.flatMap((command) =>
      command.kind === "LAY_EGG" ? [command] : [],
    );
    expect(lays.some((command) => command.cityId === capital.id)).toBe(false);
    for (const city of [north, coast])
      expect([
        ...new Set(
          lays
            .filter((command) => command.cityId === city.id)
            .map((command) => command.role),
        ),
      ]).toEqual([
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CATAPULT",
        "KNIGHT",
        "SWORDSMAN",
      ]);
    for (const command of lays) {
      const result = applyCommandV7(state, state.humanPlayerId, command);
      expect(result.accepted).toBe(true);
      if (result.accepted) expect(result.state.eggs).toHaveLength(1);
    }
    expect(
      new Set(
        trains.flatMap((command) =>
          command.kind === "TRAIN_NAVAL" && command.cityId === coast.id
            ? [command.role]
            : [],
        ),
      ),
    ).toEqual(new Set(["PATROL_BOAT", "BATTLESHIP", "SUBMARINE"]));
    for (const command of trains)
      expect(applyCommandV7(state, state.humanPlayerId, command).accepted).toBe(
        true,
      );
  });
});

describe("ruleset-7 revision-19 declared shapes", () => {
  it("orders and parses the two Dinosaur commands, which only a Dinosaur seat is offered", () => {
    // Revision 20 removed `STAMPEDE` (it sat between KABOOM and HATCH). The
    // Martian revision inserts its three commands right after HATCH, and
    // the Ice Folk revision its two right after TRACTOR_BEAM; the Dwarf
    // revision its three right after COLD_SNAP.
    expect(
      COMMAND_KIND_ORDER_V7.slice(
        COMMAND_KIND_ORDER_V7.indexOf("KABOOM"),
        COMMAND_KIND_ORDER_V7.indexOf("KABOOM") + 8,
      ),
    ).toEqual([
      "KABOOM",
      "HATCH",
      "BEAM_DOWN",
      "MIND_CONTROL",
      "TRACTOR_BEAM",
      "THROW_BOLAS",
      "COLD_SNAP",
      "FREEZE", // the frozen sea (pulp_wars-5ti.3) inserts FREEZE after COLD_SNAP
    ]);
    expect(
      COMMAND_KIND_ORDER_V7.slice(
        COMMAND_KIND_ORDER_V7.indexOf("TRAIN_NAVAL"),
        COMMAND_KIND_ORDER_V7.indexOf("TRAIN_NAVAL") + 5,
      ),
      // Tuning 3 (`pulp_wars-w49.3`) adds HIRE after TRAIN_NAVAL. The
      // Cult's Favour (`pulp_wars-mch9.4`) adds OFFERING after LAY_EGG.
    ).toEqual([
      "TRAIN_NAVAL",
      "HIRE",
      "LAY_EGG",
      "OFFERING",
      "BUILD_FIELD_DEFENSE",
    ]);
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 4, y: 5 } },
        // A third unit fills the capital's four slots (level 1, Planning,
        // Nesting; the Triceratops uses two).
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 } },
      ],
    );
    const city = cityOfV7(state, 0);
    const commands = [
      {
        kind: "HATCH",
        unitId: unitAtV7(state, { x: 4, y: 5 }).id,
        eggUnitId: unitAtV7(state, { x: 4, y: 3 }).id,
      },
      {
        kind: "LAY_EGG",
        cityId: city.id,
        role: "RAIDER",
        at: { x: city.at.x + 1, y: city.at.y },
      },
    ] as const;
    for (const command of commands) {
      expect(parseCommandV7(command)).toEqual({ ok: true, value: command });
      expect(parseCommandV7({ ...command, extra: 1 }).ok).toBe(false);
      expect(
        applyCommandV7(state, state.humanPlayerId, {
          ...command,
          extra: 1,
        } as never),
      ).toMatchObject({ accepted: false, error: { code: "INVALID_COMMAND" } });
    }
    // A `STAMPEDE` command is an unknown kind since revision 20.
    const stampede = {
      kind: "STAMPEDE",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      targetUnitId: unitAtV7(state, { x: 6, y: 3 }).id,
    };
    expect(parseCommandV7(stampede).ok).toBe(false);
    expect(
      applyCommandV7(state, state.humanPlayerId, stampede as never),
    ).toMatchObject({ accepted: false, error: { code: "INVALID_COMMAND" } });
    expect(parseCommandV7({ kind: "HATCH", unitId: 1 }).ok).toBe(false);
    expect(
      parseCommandV7({
        kind: "LAY_EGG",
        cityId: 1,
        role: "EGG",
        at: { x: 1, y: 1 },
      }).ok,
    ).toBe(false);
    // Both are rejected by their own rules here (no Egg next to the Shaman,
    // a full city).
    expect(
      applyCommandV7(state, state.humanPlayerId, commands[0]),
    ).toMatchObject({
      accepted: false,
      error: { code: "HATCH_NOT_LEGAL", params: { reason: "NO_EGG" } },
    });
    expect(
      applyCommandV7(state, state.humanPlayerId, commands[1]),
    ).toMatchObject({
      accepted: false,
      error: { code: "CITY_CAPACITY_FULL" },
    });
    // A Human seat with the same pieces is offered none of them, and they
    // are rejected for it.
    const human = goblinArenaV7(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { seat: 0, role: "CAPTAIN", at: { x: 4, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 3 } },
      ],
    );
    expect(
      queryPlayerCommandsV7(human, human.humanPlayerId).filter((command) =>
        ["HATCH", "LAY_EGG"].includes(command.kind),
      ),
    ).toEqual([]);
    for (const command of commands)
      expect(applyCommandV7(human, human.humanPlayerId, command)).toMatchObject(
        {
          accepted: false,
          error: { code: "UNIT_ROLE_INVALID" },
        },
      );
  });

  it("orders and parses the three new events, the Egg death cause, and the preview fields", () => {
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("NAVAL_UNIT_TRAINED"),
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("NAVAL_UNIT_TRAINED") + 4,
      ),
    ).toEqual([
      "NAVAL_UNIT_TRAINED",
      "EGG_LAID",
      "EGG_HATCHED",
      "UNIT_EMBARKED",
    ]);
    expect(
      DOMAIN_EVENT_KIND_ORDER_V7.slice(
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_PROMOTED"),
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf("UNIT_PROMOTED") + 3,
      ),
    ).toEqual(["UNIT_PROMOTED", "UNIT_GREW", "UNIT_DIED"]);
    const laid = {
      kind: "EGG_LAID",
      playerId: 1,
      cityId: 1,
      unitId: 9,
      role: "KNIGHT",
      cost: 14,
      at: { x: 7, y: 8 },
      hp: 6,
      turnsRemaining: 4,
    };
    const hatched = {
      kind: "EGG_HATCHED",
      playerId: 1,
      unitId: 9,
      role: "KNIGHT",
      at: { x: 7, y: 8 },
      cause: "TIME",
      sourceUnitId: null,
    };
    // Revision 20: growing fully heals, so `hp` equals `maxHp`.
    const grew = { kind: "UNIT_GREW", unitId: 9, stage: 2, maxHp: 36, hp: 36 };
    for (const event of [
      laid,
      { ...laid, hp: 10, turnsRemaining: 1 },
      hatched,
      { ...hatched, cause: "SHAMAN", sourceUnitId: 4 },
      grew,
      { ...grew, stage: 1 },
      { kind: "UNIT_DIED", unitId: 9, cause: "CITY_CAPTURED" },
    ])
      expect(parseEventV7(event)).toEqual({ ok: true, value: event });
    for (const event of [
      { ...laid, hp: 7 },
      { ...laid, turnsRemaining: 0 },
      { ...laid, turnsRemaining: 5 },
      { ...laid, cost: 0 },
      { ...hatched, cause: "SHAMAN" },
      { ...hatched, sourceUnitId: 4 },
      { ...hatched, cause: "SHAMAN", sourceUnitId: 9 },
      { ...grew, stage: 0 },
      { ...grew, stage: 3 },
      { ...grew, hp: 37 },
      { ...grew, hp: 30 },
      { ...grew, extra: 1 },
      { kind: "UNIT_DIED", unitId: 9, cause: "EGG" },
    ])
      expect(parseEventV7(event).ok).toBe(false);
    // Another viewer's EGG_LAID hides the cost (Coins are owner-private).
    const envelope = (events: readonly unknown[]) => ({
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: 2,
      commandIndex: 3,
      events,
    });
    expect(
      parsePlayerEventEnvelopeV7(
        envelope([{ ...laid, cost: null }, laid, hatched, grew]),
      ).ok,
    ).toBe(true);
    expect(
      parsePlayerEventEnvelopeV7(envelope([{ ...hatched, cost: null }])).ok,
    ).toBe(false);
  });

  it("emits the neutral preview fields and the empty Egg lists in a match without a Dinosaur seat", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
    );
    expect(state.eggs).toEqual([]);
    expect(viewForV7(state, state.humanPlayerId).eggs).toEqual([]);
    const result = applyOkV7(state, state.humanPlayerId, {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 4, y: 3 }).id,
      targetUnitId: unitAtV7(state, { x: 5, y: 3 }).id,
    });
    const combat = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(combat.preview).toMatchObject({
      runUp: 0,
      fortificationIgnored: 0,
      acid: false,
      defenderArmoured: false,
      attackerArmoured: false,
    });
    expect(parseEventV7(combat).ok).toBe(true);
    for (const patch of [
      { runUp: 3 },
      // 4 is valid since tuning 4 (Walls 2 and a Field Defense 2).
      { fortificationIgnored: 5 },
      { stampede: 0 },
      { acid: true, fortificationIgnored: 1 },
      { noRetaliationReason: "STAMPEDE" },
      { acid: "no" },
      { defenderArmoured: 0 },
      { acid: true, fortificationLevel: 1 },
      { noRetaliationReason: "EGG" },
    ])
      expect(
        parseEventV7({ ...combat, preview: { ...combat.preview, ...patch } })
          .ok,
      ).toBe(false);
    expect(
      parseEventV7({
        ...combat,
        preview: { ...combat.preview, runUp: 2, fortificationIgnored: 3 },
      }).ok,
    ).toBe(true);
    const { runUp: _runUp, ...withoutRunUp } = combat.preview;
    void _runUp;
    expect(parseEventV7({ ...combat, preview: withoutRunUp }).ok).toBe(false);
    const { fortificationIgnored: _ignored, ...withoutIgnored } =
      combat.preview;
    void _ignored;
    expect(parseEventV7({ ...combat, preview: withoutIgnored }).ok).toBe(false);
    expect(result.state.eggs).toEqual([]);
    // The projected event keeps the fields.
    const projected = projectEventsV7(
      state,
      result.state,
      seatIdV7(state, 1),
      result.events,
    );
    expect(
      projected.events.find((event) => event.kind === "COMBAT_RESOLVED"),
    ).toMatchObject({
      preview: { runUp: 0, fortificationIgnored: 0, acid: false },
    });
  });

  it("requires the `eggs` state key and a real Egg unit for every entry", () => {
    const state = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "RAIDER", at: { x: 7, y: 7 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
    );
    expect(parseGameStateV7(state)).toEqual(state);
    const { eggs: _eggs, ...withoutEggs } = state;
    void _eggs;
    expect(parseGameStateV7(withoutEggs)).toBeNull();
    const raptor = unitAtV7(state, { x: 7, y: 7 });
    const entry = { unitId: raptor.id, turnsRemaining: 1, laidThisTurn: true };
    // An entry without an Egg unit is rejected, and so is a full-HP unit
    // relabelled as an Egg (an Egg has 6 or 10 maximum HP and is exhausted).
    expect(parseGameStateV7({ ...state, eggs: [entry] })).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        eggs: [entry],
        units: state.units.map((unit) =>
          unit.id === raptor.id ? { ...unit, form: "EGG" } : unit,
        ),
      }),
    ).toBeNull();
    for (const bad of [
      { ...entry, turnsRemaining: 0 },
      { ...entry, turnsRemaining: 4 },
      { ...entry, laidThisTurn: 1 },
      { unitId: raptor.id, turnsRemaining: 1 },
      { ...entry, extra: 1 },
    ])
      expect(parseGameStateV7({ ...state, eggs: [bad] })).toBeNull();
    expect(parseGameStateV7({ ...state, eggs: null })).toBeNull();
    const view = viewForV7(state, state.humanPlayerId);
    expect(view.eggs).toEqual([]);
    expect(view.units.map((unit) => unit.form)).toEqual(["LAND", "LAND"]);
  });
});
