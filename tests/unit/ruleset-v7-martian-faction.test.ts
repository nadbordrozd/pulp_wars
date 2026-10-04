import { describe, expect, it } from "vitest";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  FORCE_FIELD_SHIELD_V7,
  MARTIAN_BASELINE_V1_NODES,
  MARTIAN_ROLE_MECHANICS_V7,
  MARTIAN_ROLE_RULES_V7,
  MILITIA_FIGHTERS_V7,
  ORIGINAL_BASELINE_V5_NODES,
  ORIGINAL_ROLE_RULES_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7,
  RULESET_7_ID,
  SHIELD_CAP_V7,
  SHOWCASE_UNIT_TEMPLATES_V7,
  STARTING_FIGHTERS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  appendReplayCommandV7,
  applyCommandV7,
  assertRuleset7Registry,
  assignedUnitCountV7,
  canonicalHash,
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
  parseReplayFileV7,
  parseReplayJsonV7,
  playerIncomeV7,
  previewCityCapacityV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  roleMechanicsV7,
  runReplayV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
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
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  shieldAtV7,
} from "../fixtures/v7-martian";
import { at, kindsV7, movedV7 } from "../fixtures/v7-revision20";

// The Martian revision (`pulp_wars-t6s.2`): identity, registration, roster,
// technology, starting units, substitutions, the Showcase, the declared
// shapes, public unit stats, and persistence
// (docs/product/RULESET_7_MARTIANS.md sections 2 to 4, 10.9, 10.10, and 11).

/** The revision number of this identity (`pulp-wars-poc-7rNN`). */
const REVISION = 37;
const ID = `pulp-wars-poc-7r${REVISION}`;
const PREVIOUS_ID = `pulp-wars-poc-7r${REVISION - 1}`;

function must<T>(value: T | undefined, what = "value"): T {
  if (value === undefined) throw new Error(`${what} missing`);
  return value;
}

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

describe("the Martian revision identity", () => {
  it("is the next identity, with a gap-free prior list ending in the previous one, and its save key", () => {
    expect(RULESET_7_ID).toBe(ID);
    expect(RULESET_7.id).toBe(ID);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${REVISION}.current`);
    expect([...PRIOR_RULESET_7_IDS]).toEqual([
      "pulp-wars-poc-7",
      ...Array.from(
        { length: REVISION - 2 },
        (_, index) => `pulp-wars-poc-7r${index + 2}`,
      ),
    ]);
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe(PREVIOUS_ID);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect([...OBSOLETE_SAVE_STORAGE_KEYS_V7]).toEqual([
      "pulpWars.save.v7.current",
      ...Array.from(
        { length: REVISION - 2 },
        (_, index) => `pulpWars.save.v7r${index + 2}.current`,
      ),
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through the previous identity's and preserves everything else", () => {
    const previousKey = `pulpWars.save.v7r${REVISION - 1}.current`;
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r19.current", "r19"],
      [previousKey, "previous"],
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: ["pulpWars.save.v7r19.current", previousKey],
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

  it("rejects the previous identity's setups, states, replays, and saves without migration", () => {
    const setup = goblinSetupV7(["MARTIAN", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.rulesetId).toBe(ID);
    const oldSetup = { ...setup, rulesetId: PREVIOUS_ID };
    expect(parseMatchSetupV7(setup)).not.toBeNull();
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: PREVIOUS_ID,
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
      "2026-10-02T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: PREVIOUS_ID,
          setup: oldSetup,
          state: { ...save.state, rulesetId: PREVIOUS_ID },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("Martian faction registration (sections 2 and 11)", () => {
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
    ]);
    expect(FACTION_TREE_IDS_V7).toEqual([
      "ORIGINAL_BASELINE_V5",
      "UNDEAD_BASELINE_V1",
      "GOBLIN_BASELINE_V1",
      "DINOSAUR_BASELINE_V1",
      "MARTIAN_BASELINE_V1",
      "ICE_FOLK_BASELINE_V1",
      "DWARF_BASELINE_V1",
    ]);
    expect(factionTreeIdV7("MARTIAN")).toBe("MARTIAN_BASELINE_V1");
    expect(FACTION_TREES_V7.MARTIAN).toMatchObject({
      id: "MARTIAN_BASELINE_V1",
      faction: "MARTIAN",
      startingTechIds: [],
    });
    expect(RULESET_7.factionTrees.MARTIAN.roleRules).toBe(
      MARTIAN_ROLE_RULES_V7,
    );
    expect(FACTION_DISPLAY_NAMES_V7.MARTIAN).toBe("Martian");
    // The registry assertion accepts the fifth tree unchanged.
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(factionRulesV7("MARTIAN")).toMatchObject({
      treasureUnitRole: "RAIDER",
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      restless: false,
    });
    expect([FORCE_FIELD_SHIELD_V7, SHIELD_CAP_V7]).toEqual([4, 4]);
    expect([STARTING_FIGHTERS_V7.MARTIAN, MILITIA_FIGHTERS_V7.MARTIAN]).toEqual(
      [1, 1],
    );
  });

  it("has the new kinds at the stated positions (48 command and 76 event kinds; the Ice Folk revision adds two and one, the Dwarf revision three and four)", () => {
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(53);
    const hatch = COMMAND_KIND_ORDER_V7.indexOf("HATCH");
    expect(COMMAND_KIND_ORDER_V7.slice(hatch, hatch + 4)).toEqual([
      "HATCH",
      "BEAM_DOWN",
      "MIND_CONTROL",
      "TRACTOR_BEAM",
    ]);
    // The Mind Control revision adds UNIT_RELEASED after UNIT_MIND_CONTROLLED.
    // Map curiosities (pulp_wars-737.2) add FOUNTAIN_HEALED, SHRINE_CLAIMED,
    // and WRECK_SALVAGED (85 event kinds); the Giant Spider (pulp_wars-737.3)
    // MONSTER_REGENERATED, NEUTRAL_TURN_STARTED, NEUTRAL_TURN_ENDED, and
    // MONSTER_BOUNTY_AWARDED (89).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(89);
    const after = (kind: string) =>
      DOMAIN_EVENT_KIND_ORDER_V7[
        DOMAIN_EVENT_KIND_ORDER_V7.indexOf(kind as never) + 1
      ];
    // The Giant Spider's regeneration follows the Trolls'.
    expect(after("UNITS_REGENERATED")).toBe("MONSTER_REGENERATED");
    expect(after("MONSTER_REGENERATED")).toBe("SHIELDS_RECHARGED");
    expect(after("UNIT_DISEMBARKED")).toBe("UNIT_BEAMED");
    expect(after("UNIT_INFECTED")).toBe("UNIT_MIND_CONTROLLED");
    expect(after("UNIT_MIND_CONTROLLED")).toBe("UNIT_RELEASED");
    expect(after("UNIT_PUSHED")).toBe("UNIT_PULLED");
    // The Dwarf revision inserts UNIT_TUNNELLED after UNIT_PULLED.
    expect(after("UNIT_PULLED")).toBe("UNIT_TUNNELLED");
    // The player event order inherits these positions.
    const playerAfter = (kind: string) =>
      PLAYER_EVENT_KIND_ORDER_V7[
        PLAYER_EVENT_KIND_ORDER_V7.indexOf(kind as never) + 1
      ];
    expect(playerAfter("MONSTER_REGENERATED")).toBe("SHIELDS_RECHARGED");
    expect(playerAfter("UNIT_DISEMBARKED")).toBe("UNIT_BEAMED");
    expect(playerAfter("UNIT_INFECTED")).toBe("UNIT_MIND_CONTROLLED");
    expect(playerAfter("UNIT_PUSHED")).toBe("UNIT_PULLED");
  });

  it("parses the three commands and the four events strictly", () => {
    const commands: readonly CommandV7[] = [
      {
        kind: "BEAM_DOWN",
        unitId: 5 as never,
        passengerUnitId: 6 as never,
        to: at(3, 4),
      },
      { kind: "MIND_CONTROL", unitId: 5 as never, targetUnitId: 7 as never },
      { kind: "TRACTOR_BEAM", unitId: 5 as never, targetUnitId: 7 as never },
    ];
    for (const command of commands) {
      expect(parseCommandV7(command), command.kind).toEqual({
        ok: true,
        value: command,
      });
      expect(parseCommandV7({ ...command, extra: 1 }).ok, command.kind).toBe(
        false,
      );
      const { unitId: _unitId, ...missing } = command as unknown as Record<
        string,
        unknown
      >;
      void _unitId;
      expect(parseCommandV7(missing).ok, command.kind).toBe(false);
    }
    expect(
      parseCommandV7({ kind: "BEAM_DOWN", unitId: 5, passengerUnitId: 6 }).ok,
    ).toBe(false);
    const events: readonly unknown[] = [
      {
        kind: "SHIELDS_RECHARGED",
        playerId: 1,
        results: [{ unitId: 5, shield: 2 }],
      },
      {
        kind: "UNIT_BEAMED",
        playerId: 1,
        unitId: 5,
        passengerUnitId: 6,
        from: at(8, 8),
        to: at(3, 4),
      },
      {
        kind: "UNIT_MIND_CONTROLLED",
        playerId: 1,
        unitId: 5,
        targetUnitId: 7,
        targetOwnerId: 2,
        targetRole: "KNIGHT",
        at: at(3, 4),
        hp: 6,
      },
      {
        kind: "UNIT_RELEASED",
        unitId: 7,
        brainUnitId: 5,
        fromPlayerId: 1,
        toPlayerId: 2,
        at: at(3, 4),
      },
      {
        kind: "UNIT_PULLED",
        sourceUnitId: 5,
        targetUnitId: 7,
        from: at(6, 2),
        to: at(5, 2),
        path: [at(5, 2)],
      },
      // `pulp_wars-1wy.3`: a Heavy Tractor Beam's two-tile path.
      {
        kind: "UNIT_PULLED",
        sourceUnitId: 5,
        targetUnitId: 7,
        from: at(7, 2),
        to: at(5, 2),
        path: [at(6, 2), at(5, 2)],
      },
      { kind: "UNIT_DIED", unitId: 5, cause: "BRAIN_LOST" },
    ];
    for (const event of events) {
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(true);
      expect(
        parseEventV7({ ...(event as object), extra: 1 }).ok,
        JSON.stringify(event),
      ).toBe(false);
    }
    expect(
      parseEventV7({
        kind: "SHIELDS_RECHARGED",
        playerId: 1,
        results: [{ unitId: 5, shield: 5 }],
      }).ok,
    ).toBe(false);
    expect(
      parseEventV7({
        kind: "UNIT_MIND_CONTROLLED",
        playerId: 1,
        unitId: 5,
        targetUnitId: 7,
        targetOwnerId: 2,
        targetRole: "KNIGHT",
        at: at(3, 4),
        hp: 0,
      }).ok,
    ).toBe(false);
    // The Mind Control revision: the target keeps its ID (no `thrallUnitId`),
    // and a release goes from one player to another.
    expect(
      parseEventV7({
        kind: "UNIT_MIND_CONTROLLED",
        playerId: 1,
        unitId: 5,
        targetUnitId: 7,
        targetOwnerId: 2,
        targetRole: "KNIGHT",
        thrallUnitId: 9,
        at: at(3, 4),
        hp: 6,
      }).ok,
    ).toBe(false);
    expect(
      parseEventV7({
        kind: "UNIT_RELEASED",
        unitId: 7,
        brainUnitId: 5,
        fromPlayerId: 1,
        toPlayerId: 1,
        at: at(3, 4),
      }).ok,
    ).toBe(false);
  });

  it("accepts Martian seats in every combination and rejects a faction/tree mismatch", () => {
    for (const factions of [
      ["MARTIAN", "ORIGINAL"],
      ["ORIGINAL", "MARTIAN"],
      ["MARTIAN", "UNDEAD"],
      ["GOBLIN", "MARTIAN"],
      ["DINOSAUR", "MARTIAN"],
      ["MARTIAN", "MARTIAN"],
      ["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"],
      ["DINOSAUR", "MARTIAN", "MARTIAN", "GOBLIN"],
    ] as const)
      expect(parseMatchSetupV7(goblinSetupV7(factions))?.factions).toEqual(
        factions,
      );
    const created = createPlayableGameV7(
      goblinSetupV7(["ORIGINAL", "MARTIAN"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["MARTIAN", "MARTIAN_BASELINE_V1"],
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
        withPlayer({ faction: "GOBLIN", factionTreeId: "MARTIAN_BASELINE_V1" }),
      ),
    ).toBeNull();
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 1));
    expect([tree.id, tree.faction]).toEqual(["MARTIAN_BASELINE_V1", "MARTIAN"]);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(view.players.map((player) => player.faction)).toEqual([
      "ORIGINAL",
      "MARTIAN",
    ]);
    expect(view.players.map((player) => player.factionTreeId)).toEqual([
      "ORIGINAL_BASELINE_V5",
      "MARTIAN_BASELINE_V1",
    ]);
    expect(view.leaderboard.map((entry) => entry.faction).sort()).toEqual([
      "MARTIAN",
      "ORIGINAL",
    ]);
  });

  it("generates identical boards, turn orders, treasure, and PRNG with Martian seats", () => {
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
      const martians = humans.map(() => "MARTIAN" as const);
      const mixed = humans.map(
        (_, seat): FactionIdV7 =>
          (["MARTIAN", "UNDEAD", "DINOSAUR", "GOBLIN"] as const)[seat % 4] ??
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
      expect(reference.shields).toEqual([]);
      for (const factions of [martians, mixed]) {
        const other = create(factions);
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect(other.nextEntityId).toBe(reference.nextEntityId);
        expect(
          other.units.map((unit) => [
            unit.id,
            unit.ownerId,
            unit.at,
            unit.role,
          ]),
        ).toEqual(
          reference.units.map((unit) => [
            unit.id,
            unit.ownerId,
            unit.at,
            unit.role,
          ]),
        );
        // The only difference: the starting Grunts' Shields.
        expect(other.shields).toEqual(
          other.units
            .filter(
              (unit) =>
                other.players.find((player) => player.id === unit.ownerId)
                  ?.faction === "MARTIAN",
            )
            .map((unit) => ({ unitId: unit.id, shield: 2 })),
        );
        expect([
          other.cooling,
          other.mindControlled,
          other.mindControlCooldowns,
        ]).toEqual([[], [], []]);
      }
    }
  });
});

// label, role, technology, cost, slots, HP, Shield, attack2, defense2, Move,
// minimum range, range, Sight, attack after Move, abilities, movement mode,
// advances after a kill, builds Field Defense
const ROSTER = [
  [
    "Grunt",
    "FIGHTER",
    null,
    // `pulp_wars-b5f.2`: the ray pistol, range 1–2 (was 1), paid for with
    // cost 3 (was 2). `pulp_wars-1wy.3` (M4): Attack 2 (`4`, was 1.5) and
    // 9 HP (was 10).
    3,
    1,
    9,
    2,
    4,
    3,
    1,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE"],
    "GROUND",
    true,
    false,
  ],
  [
    "Saucer",
    "RAIDER",
    "SCOUTING",
    4,
    1,
    8,
    2,
    3,
    2,
    3,
    1,
    1,
    2,
    true,
    // `pulp_wars-1wy.3` (M2): the Saucer has the Tractor Beam.
    ["ATTACK", "CHARGE", "FLY", "BEAM_DOWN", "TRACTOR_BEAM"],
    "FLY",
    false,
    false,
  ],
  [
    "Ray Gunner",
    "MARKSMAN",
    "MARKSMANSHIP",
    4,
    1,
    8,
    2,
    6,
    2,
    1,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE", "HEAT_RAY"],
    "GROUND",
    true,
    false,
  ],
  [
    "Shield Projector",
    "GUARD",
    "DRILL",
    4,
    1,
    12,
    3,
    3,
    5,
    1,
    1,
    1,
    1,
    false,
    ["ATTACK", "CAPTURE", "FORCE_FIELD"],
    "GROUND",
    true,
    false,
  ],
  [
    "Brain",
    "CAPTAIN",
    "ADMINISTRATION",
    5,
    1,
    8,
    2,
    2,
    2,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "RALLY", "MIND_CONTROL"],
    "GROUND",
    true,
    false,
  ],
  [
    "Tripod",
    "CATAPULT",
    "SAWMILLING",
    9,
    1,
    12,
    2,
    8,
    2,
    2,
    // `pulp_wars-b5f.2`: range exactly 2 (minimum range 2, was 1) and
    // Sight 2 (was 1).
    2,
    2,
    2,
    true,
    ["ATTACK", "STRIDE", "HEAT_RAY", "PIERCE"],
    "STRIDE",
    false,
    false,
  ],
  [
    "Mothership",
    "KNIGHT",
    "CHIVALRY",
    // `pulp_wars-1wy.3` (M3): cost 8 (was 10) and Beam Down.
    8,
    2,
    16,
    4,
    5,
    4,
    2,
    1,
    1,
    1,
    true,
    ["ATTACK", "FLY", "BEAM_DOWN", "TRACTOR_BEAM"],
    "FLY",
    false,
    false,
  ],
  [
    "Colossus",
    "JUGGERNAUT",
    null,
    null,
    2,
    32,
    3,
    8,
    // `pulp_wars-t6s.5`: Defense 2.5 (contract 3; section 16.5).
    5,
    1,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE", "PUSH", "STRIDE", "HEAT_RAY"],
    "STRIDE",
    true,
    false,
  ],
] as const;

describe("Martian roster (section 3)", () => {
  it("registers every value of the section 3 table", () => {
    expect(ROSTER.map((row) => row[1])).toEqual(UNIT_ROLE_IDS_V7.slice(0, 8));
    for (const [
      label,
      role,
      technology,
      cost,
      capacitySlots,
      maxHp,
      shield,
      attack2,
      defense2,
      move,
      minimumRange,
      range,
      sightRadius,
      mayUsePrimaryActionAfterMove,
      abilities,
      movementMode,
      advancesAfterKill,
      buildsFieldDefense,
    ] of ROSTER) {
      const rule = effectiveRoleRuleV7(role, "MARTIAN");
      expect(rule, label).toEqual({
        role,
        label,
        tacticalRole: ORIGINAL_ROLE_RULES_V7[role].tacticalRole,
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
      expect(roleMechanicsV7(role, "MARTIAN"), label).toMatchObject({
        capacitySlots,
        shield,
        movementMode,
        advancesAfterKill,
        buildsFieldDefense,
        hatchTurns: null,
        splash: false,
        // `pulp_wars-1wy.3` (M3): only the Mothership's pull is Heavy.
        heavyTractorBeam: role === "KNIGHT",
      });
      expect(MARTIAN_ROLE_MECHANICS_V7[role]).toBe(
        roleMechanicsV7(role, "MARTIAN"),
      );
    }
    // The boats are the Human boats: no Shield, one slot.
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
      expect(effectiveRoleRuleV7(role, "MARTIAN")).toEqual(
        effectiveRoleRuleV7(role, "ORIGINAL"),
      );
      expect(roleMechanicsV7(role, "MARTIAN")).toEqual(
        roleMechanicsV7(role, "ORIGINAL"),
      );
    }
  });

  it("no other faction has a Shield, a movement mode, or a Martian ability", () => {
    const martianAbilities = [
      "HEAT_RAY",
      "PIERCE",
      "FORCE_FIELD",
      "BEAM_DOWN",
      "MIND_CONTROL",
      "TRACTOR_BEAM",
      "FLY",
      "STRIDE",
    ];
    // The Dwarf revision (`pulp_wars-78i.3`): the Gyrocopter flies under
    // the Martian flyer rule (`FLY`); it is the one exception.
    for (const faction of FACTION_IDS_V7.filter((id) => id !== "MARTIAN"))
      for (const role of UNIT_ROLE_IDS_V7) {
        const gyrocopter = faction === "DWARF" && role === "RAIDER";
        expect(
          roleMechanicsV7(role, faction),
          `${faction} ${role}`,
        ).toMatchObject({
          shield: 0,
          movementMode: gyrocopter ? "FLY" : "GROUND",
        });
        expect(
          effectiveRoleRuleV7(role, faction).abilities.filter(
            (ability) =>
              martianAbilities.includes(ability) &&
              !(gyrocopter && ability === "FLY"),
          ),
        ).toEqual([]);
      }
    // No Martian unit has Escape, Overrun, Tend Wounded, or a Dinosaur,
    // Goblin, or Undead ability.
    expect(
      [
        ...new Set(
          UNIT_ROLE_IDS_V7.flatMap(
            (role) => effectiveRoleRuleV7(role, "MARTIAN").abilities,
          ),
        ),
      ].sort(),
    ).toEqual(
      [
        "ATTACK",
        "CAPTURE",
        "CHARGE",
        "PUSH",
        "RALLY",
        ...martianAbilities,
        ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP.abilities,
        ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT.abilities,
      ]
        .filter((ability, index, all) => all.indexOf(ability) === index)
        .sort(),
    );
  });

  it("trains every Martian land unit except the Colossus on the city center, with a full Shield", () => {
    for (const [, role, , cost, , maxHp, shield] of ROSTER) {
      const state = goblinArenaV7(
        ["MARTIAN", "ORIGINAL"],
        [{ seat: 1, role: "FIGHTER", at: at(1, 1) }],
        // No Metallurgy: no Arms Industry discount.
        {
          techs: {
            0: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "METALLURGY"),
          },
        },
      );
      const city = cityOfV7(state, 0);
      const command: CommandV7 = { kind: "TRAIN", cityId: city.id, role };
      const offered = queryPlayerCommandsV7(state, state.humanPlayerId);
      if (cost === null) {
        expect(offered).not.toContainEqual(command);
        expect(
          applyCommandV7(state, state.humanPlayerId, command).accepted,
        ).toBe(false);
        continue;
      }
      expect(offered, role).toContainEqual(command);
      const result = applyOkV7(state, state.humanPlayerId, command);
      const trained = newUnitsV7(state, result.state);
      expect(trained).toHaveLength(1);
      expect(trained[0], role).toMatchObject({
        role,
        form: "LAND",
        at: city.at,
        hp: maxHp,
        maxHp,
        homeCityId: city.id,
      });
      expect(shieldAtV7(result.state, city.at), role).toBe(shield);
      expect(
        (state.players[0]?.coins ?? 0) - (result.state.players[0]?.coins ?? 0),
        role,
      ).toBe(cost);
    }
  });

  it("never offers Field Defense, Tend Wounded, or Overrun to a Martian seat", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "GUARD", at: at(7, 7) },
      { seat: 0, role: "CAPTAIN", at: at(9, 7) },
      { seat: 0, role: "FIGHTER", at: at(9, 8), hp: 3 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const kinds = new Set(offeredV7(state).map((command) => command.kind));
    expect(kinds.has("BUILD_FIELD_DEFENSE")).toBe(false);
    expect(kinds.has("TEND_WOUNDED")).toBe(false);
    expect(
      rejectedV7(state, {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(state, at(8, 7)).id,
      }).code,
    ).toBeDefined();
    // A Mothership that kills does not advance or attack again.
    const knight = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 1 },
    ]);
    const result = playV7(knight, {
      kind: "ATTACK",
      unitId: unitAtV7(knight, at(4, 3)).id,
      targetUnitId: unitAtV7(knight, at(5, 3)).id,
    });
    const ship = unitAtV7(result.state, at(4, 3));
    expect(ship.activation.overrunActive).toBe(false);
    expect(offeredV7(result.state, "ATTACK")).toEqual([]);
  });

  it("refunds half the printed cost on Disband and never disbands a Colossus", () => {
    for (const [role, refund] of [
      ["FIGHTER", 1],
      ["RAIDER", 2],
      ["MARKSMAN", 2],
      ["GUARD", 2],
      ["CAPTAIN", 2],
      ["CATAPULT", 4],
      // `pulp_wars-1wy.3` (M3): the Mothership costs 8.
      ["KNIGHT", 4],
    ] as const) {
      const state = martianFieldV7([
        { seat: 0, role, at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]);
      const result = playV7(state, {
        kind: "DISBAND",
        unitId: unitAtV7(state, at(4, 3)).id,
      });
      expect(result.events[0], role).toMatchObject({
        kind: "UNIT_DISBANDED",
        role,
        coinDelta: refund,
      });
      // The Shield, Cooling, and cooldown entries end with the unit.
      expect(result.state.shields).toEqual([]);
    }
    const state = martianFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      rejectedV7(state, {
        kind: "DISBAND",
        unitId: unitAtV7(state, at(4, 3)).id,
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
  });

  it("promotes like every faction, without changing the Shield", () => {
    const state = martianFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(4, 3), kills: 3, hp: 3, shield: 1 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const result = playV7(state, {
      kind: "PROMOTE",
      unitId: unitAtV7(state, at(4, 3)).id,
    });
    expect(unitAtV7(result.state, at(4, 3))).toMatchObject({
      veteran: true,
      maxHp: 13,
      hp: 13,
    });
    expect(shieldAtV7(result.state, at(4, 3))).toBe(1);
  });

  it("counts the Martian trainable roles for Muster: a controlled unit counts its role, the Colossus is excluded", () => {
    const state = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 3) },
      // A Human Fighter the Brain controls counts the FIGHTER role (the
      // Mind Control revision section 4.1).
      { seat: 1, role: "FIGHTER", at: at(5, 3), controlledBy: at(4, 3), hp: 4 },
      { seat: 0, role: "RAIDER", at: at(6, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(7, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      achievementProgressV7(state, seatIdV7(state, 0)).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 3 });
    expect(
      UNIT_ROLE_IDS_V7.filter(
        (role) => effectiveRoleRuleV7(role, "MARTIAN").cost !== null,
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
    ]);
    // The leaderboard unit count includes controlled units.
    const view = viewForV7(state, seatIdV7(state, 1));
    expect(
      view.leaderboard.find((entry) => entry.faction === "MARTIAN"),
    ).toMatchObject({ livingUnitCount: 4 });
  });

  it("capacity is the slot sum: the Mothership and the Colossus use two", () => {
    const state = martianFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
      { seat: 0, role: "CATAPULT", at: at(6, 3) },
      { seat: 0, role: "CAPTAIN", at: at(7, 3) },
      { seat: 1, role: "FIGHTER", at: at(7, 4), controlledBy: at(7, 3), hp: 4 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const city = cityOfV7(state, 0);
    expect(assignedUnitCountV7(state, city.id)).toBe(6);
    expect(
      previewCityCapacityV7(state, city.id)?.roleSlots.filter(
        (entry) => entry.slots === 2,
      ),
    ).toEqual([{ role: "KNIGHT", slots: 2 }]);
  });
});

describe("Martian technology (section 4)", () => {
  it("differs from the Human graph in four unlock entries and two display names", () => {
    expect(MARTIAN_BASELINE_V1_NODES).toHaveLength(
      ORIGINAL_BASELINE_V5_NODES.length,
    );
    ORIGINAL_BASELINE_V5_NODES.forEach((human, index) => {
      const martian = MARTIAN_BASELINE_V1_NODES[index];
      if (martian === undefined) throw new Error("node missing");
      expect([
        martian.id,
        martian.branch,
        martian.tier,
        martian.prerequisites,
        martian.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        human.unlockedRoles,
      ]);
      if (human.id === "ADMINISTRATION")
        expect(martian.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "BRAIN_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "CHIVALRY")
        expect(martian.unlocks).toEqual(
          human.unlocks.filter((unlock) => unlock.kind !== "OVERRUN"),
        );
      else if (human.id === "FORTIFICATION")
        expect(martian.unlocks).toEqual([{ kind: "FORCE_FIELDS" }]);
      else if (human.id === "EXPLOSIVES")
        expect(martian.unlocks).toEqual([
          ...human.unlocks,
          { kind: "DISINTEGRATOR" },
        ]);
      else expect(martian.unlocks).toEqual(human.unlocks);
    });
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.MARTIAN).toEqual({
      FORTIFICATION: "Force Fields",
      EXPLOSIVES: "Disintegrator",
    });
  });

  it("reads the two effects through capabilities, never a raw technology test", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [
          faction,
          capabilities.shieldsRechargeAtEndTurn,
          capabilities.raysIgnoreFortification,
        ];
      }),
    ).toEqual([
      ["ORIGINAL", false, false],
      ["UNDEAD", false, false],
      ["GOBLIN", false, false],
      ["DINOSAUR", false, false],
      ["MARTIAN", true, true],
      ["ICE_FOLK", false, false],
      ["DWARF", false, false],
    ]);
    const some = (...techs: (typeof TECHNOLOGY_IDS_V7)[number][]) =>
      technologyCapabilitiesV7(techs, "MARTIAN");
    expect(some("DRILL")).toMatchObject({
      shieldsRechargeAtEndTurn: false,
      raysIgnoreFortification: false,
    });
    expect(some("DRILL", "FORTIFICATION")).toMatchObject({
      shieldsRechargeAtEndTurn: true,
      raysIgnoreFortification: false,
    });
    // Everything else is the Human table, minus Field Defense.
    const martian = technologyCapabilitiesV7(all, "MARTIAN");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    expect(martian.trainableRoles).toEqual(human.trainableRoles);
    expect(martian.roleSightRadius).toEqual(human.roleSightRadius);
    expect(martian.commands).toEqual(
      human.commands.filter((command) => command !== "BUILD_FIELD_DEFENSE"),
    );
    expect(martian.mountainMovement).toBe(true);
    expect(martian.landTradeIncomeCoins).toBe(human.landTradeIncomeCoins);
  });

  it("every technology keeps a live unlock for a Martian seat (the section 4 audit)", () => {
    for (const node of MARTIAN_BASELINE_V1_NODES)
      expect(
        node.unlocks.length + node.unlockedRoles.length,
        node.id,
      ).toBeGreaterThan(0);
    // The rows that name a Martian effect.
    const role = (tech: string) =>
      UNIT_ROLE_IDS_V7.filter(
        (id) => effectiveRoleRuleV7(id, "MARTIAN").technology === tech,
      ).map((id) => effectiveRoleRuleV7(id, "MARTIAN").label);
    expect(role("SCOUTING")).toEqual(["Saucer"]);
    expect(role("MARKSMANSHIP")).toEqual(["Ray Gunner"]);
    expect(role("DRILL")).toEqual(["Shield Projector"]);
    expect(role("ADMINISTRATION")).toEqual(["Brain"]);
    expect(role("SAWMILLING")).toEqual(["Tripod"]);
    expect(role("CHIVALRY")).toEqual(["Mothership"]);
    // Raiding: Strafe (Charge) for the Saucer.
    const state = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 3), activation: movedV7(2) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
    ]);
    const stats = publicUnitStatsV7(state, unitAtV7(state, at(4, 3)));
    expect(
      stats.stats
        .find((stat) => stat.id === "ATTACK")
        ?.modifiers.map((term) => [term.source, term.sourceLabel]),
    ).toEqual([["CHARGE", "Strafe"]]);
    // The engine bead's unlock texts for the three new kinds (the Martian UI
    // bead owns the full presentation).
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 0));
    const text = (tech: string) =>
      technologyEffectGroupsV7(
        tree.nodes.find((item) => item.id === tech)?.effects ?? [],
        tree.faction,
      ).flatMap((group) => group.items);
    expect(text("FORTIFICATION")).toEqual([
      "Shields also recharge at the end of your turn",
    ]);
    expect(text("EXPLOSIVES")).toContain(
      "Heat rays ignore Walls and Field Defense",
    );
    expect(text("ADMINISTRATION").join()).toContain("Mind Control");
    expect(technologyNameV7("FORTIFICATION", tree.faction)).toBe(
      "Force Fields",
    );
    expect(technologyNameV7("EXPLOSIVES", tree.faction)).toBe("Disintegrator");
    for (const tech of TECHNOLOGY_IDS_V7)
      if (tech !== "FORTIFICATION" && tech !== "EXPLOSIVES")
        expect(technologyNameV7(tech, "MARTIAN")).toBe(
          technologyNameV7(tech, "ORIGINAL"),
        );
  });
});

describe("Martian starting units and substitutions (section 10.10)", () => {
  it("starts a Martian seat with one Grunt at full HP and Shield, 5 Coins, and no technology", () => {
    for (const [seed, mapType, factions] of [
      [3, "PANGEA", ["MARTIAN", "ORIGINAL"]],
      [4, "ARCHIPELAGO", ["GOBLIN", "MARTIAN"]],
      [9, "LAKES", ["MARTIAN", "MARTIAN"]],
      [11, "CONTINENTS", ["UNDEAD", "MARTIAN", "DINOSAUR", "GOBLIN"]],
    ] as const) {
      const initial = createInitialMapStateV7({
        ...goblinSetupV7(factions, seed),
        mapType,
      });
      if (!initial.ok) throw new Error(initial.error.code);
      const { state } = initial;
      expect([
        state.cooling,
        state.mindControlled,
        state.mindControlCooldowns,
      ]).toEqual([[], [], []]);
      factions.forEach((faction, seat) => {
        const player = state.players[seat];
        const capital = state.cities[seat];
        if (player === undefined || capital === undefined)
          throw new Error("seat missing");
        const own = state.units.filter((unit) => unit.ownerId === player.id);
        if (faction !== "MARTIAN") {
          for (const unit of own)
            expect(
              state.shields.some((entry) => entry.unitId === unit.id),
            ).toBe(false);
          return;
        }
        expect([player.coins, player.researchedTechs]).toEqual([5, []]);
        expect(own).toHaveLength(1);
        expect(own[0]).toMatchObject({
          role: "FIGHTER",
          form: "LAND",
          at: capital.at,
          homeCityId: capital.id,
          hp: 9,
          maxHp: 9,
          kills: 0,
          veteran: false,
        });
        expect(unitRoleRuleV7(state, must(own[0])).label).toBe("Grunt");
        expect(shieldAtV7(state, capital.at)).toBe(2);
      });
    }
  });

  it("grants one exhausted Grunt with a full Shield for Militia", () => {
    const fixture = rewardStateV7("MILITIA", "MARTIAN");
    const city = cityOfV7(fixture.state, 0);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const created = newUnitsV7(fixture.state, result.state);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      role: "FIGHTER",
      form: "LAND",
      at: city.at,
      hp: 9,
      maxHp: 9,
      homeCityId: city.id,
      activation: { moved: true, attacked: true, handled: true },
    });
    expect(shieldAtV7(result.state, city.at)).toBe(2);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
  });

  it("grants a two-slot Colossus for the level-5 reward, over capacity, with Shield 3", () => {
    // Level 5 with Planning: 7 slots. Three Motherships use 6; a Grunt 1.
    const fixture = rewardStateV7("JUGGERNAUT", "MARTIAN", [
      { role: "KNIGHT", at: at(4, 3) },
      { role: "KNIGHT", at: at(5, 3) },
      { role: "KNIGHT", at: at(6, 3) },
      { role: "FIGHTER", at: at(4, 2) },
    ]);
    const city = cityOfV7(fixture.state, 0);
    expect(cityUnitCapacityV7(fixture.state, city)).toBe(7);
    expect(assignedUnitCountV7(fixture.state, city.id)).toBe(7);
    const result = applyOkV7(
      fixture.state,
      fixture.state.humanPlayerId,
      fixture.command,
    );
    const created = newUnitsV7(fixture.state, result.state);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      role: "JUGGERNAUT",
      form: "LAND",
      at: city.at,
      hp: 32,
      maxHp: 32,
      homeCityId: city.id,
    });
    expect(unitRoleRuleV7(result.state, must(created[0])).label).toBe(
      "Colossus",
    );
    expect(shieldAtV7(result.state, city.at)).toBe(3);
    expect(previewCityCapacityV7(result.state, city.id)).toMatchObject({
      capacity: 7,
      assigned: 9,
      available: 0,
      overCapacity: 2,
    });
  });

  describe("treasure", () => {
    const unitSeed = (() => {
      let seed = 0;
      while (
        nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
          .value !== 1
      )
        seed += 1;
      return seed;
    })();
    const treasure = (
      mover: UnitRoleIdV7,
      extra: readonly UnitRoleIdV7[],
    ): {
      readonly before: GameStateV7;
      readonly after: GameStateV7;
      readonly events: readonly DomainEventV7[];
    } => {
      // No technology: a level-1 capital holds 2 slots.
      const arena = martianFieldV7(
        [
          { seat: 0, role: mover, at: at(4, 3) },
          ...extra.map((role, index) => ({
            seat: 0,
            role,
            at: at(4 + index, 1),
          })),
          { seat: 1, role: "FIGHTER" as const, at: at(1, 1) },
        ],
        { techs: { 0: [] } },
      );
      const before = checkedV7({
        ...arena,
        random: { ...arena.random, state: unitSeed },
        treasureChests: [at(5, 3)],
      });
      const result = applyOkV7(before, seatIdV7(before, 0), {
        kind: "MOVE",
        unitId: unitAtV7(before, at(4, 3)).id,
        path: [at(5, 3)],
      });
      return { before, after: result.state, events: result.events };
    };

    it("spawns a Saucer with a full Shield when a city has a free slot, keeping the KNIGHT literal", () => {
      const { before, after, events } = treasure("FIGHTER", []);
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
      const saucer = must(created[0]);
      expect(saucer).toMatchObject({
        role: "RAIDER",
        form: "LAND",
        hp: 8,
        maxHp: 8,
        kills: 0,
        homeCityId: cityOfV7(before, 0).id,
        activation: { handled: true },
      });
      expect(unitRoleRuleV7(after, saucer).label).toBe("Saucer");
      expect(shieldAtV7(after, saucer.at)).toBe(2);
    });

    it("gives 5 Coins when no city has a free slot", () => {
      // The mover and a second Grunt fill the 2-slot capital.
      const full = treasure("FIGHTER", ["FIGHTER"]);
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
    });

    it("a flyer takes a chest by ending a Move on it", () => {
      const { events } = treasure("RAIDER", []);
      expect(kindsV7(events)).toContain("TREASURE_CAPTURED");
    });
  });
});

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
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  curiosities: false,
});

describe("Martian Showcase (section 2.4)", () => {
  it("gives a Martian seat the ten roster units on the same tiles, homes, and IDs, at full Shield", () => {
    const create = (factions: readonly FactionIdV7[]) => {
      const created = createInitialMapStateV7(showcase(factions));
      if (!created.ok) throw new Error(created.error.code);
      return created.state;
    };
    const state = create(["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    const reference = create(["ORIGINAL", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(state.board).toEqual(reference.board);
    expect(state.cities).toEqual(reference.cities);
    expect(state.populationContributions).toEqual(
      reference.populationContributions,
    );
    expect(state.nextEntityId).toBe(reference.nextEntityId);
    const shape = (source: GameStateV7) =>
      source.units.map((unit) => [
        unit.id,
        unit.ownerId,
        unit.role,
        unit.form,
        unit.at,
        unit.homeCityId,
      ]);
    expect(shape(state)).toEqual(shape(reference));
    const martianId = seatIdV7(state, 0);
    const own = state.units.filter((unit) => unit.ownerId === martianId);
    expect(own.map((unit) => unit.role)).toEqual(
      SHOWCASE_UNIT_TEMPLATES_V7.map((entry) => entry.role),
    );
    for (const unit of own) {
      const rule = effectiveRoleRuleV7(unit.role, "MARTIAN");
      expect(unit).toMatchObject({
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
      });
    }
    // Full Shields for the eight land roles, none for the boats or others.
    expect(state.shields).toEqual(
      own
        .filter((unit) => roleMechanicsV7(unit.role, "MARTIAN").shield > 0)
        .map((unit) => ({
          unitId: unit.id,
          shield: roleMechanicsV7(unit.role, "MARTIAN").shield,
        })),
    );
    expect(state.shields).toHaveLength(8);
    expect([
      state.cooling,
      state.mindControlled,
      state.mindControlCooldowns,
    ]).toEqual([[], [], []]);
    expect(
      state.players.find((player) => player.id === martianId)?.researchedTechs,
    ).toEqual(TECHNOLOGY_IDS_V7);
    // Capital 7 of 7 (Grunt 1, Brain 1, Tripod 1, Mothership 2, Colossus 2),
    // North 3 of 6, Coast 2 of 5.
    expect(
      state.cities
        .filter((city) => city.ownerId === martianId)
        .map((city) => [
          assignedUnitCountV7(state, city.id),
          cityUnitCapacityV7(state, city),
        ]),
    ).toEqual([
      [7, 7],
      [3, 6],
      [2, 5],
    ]);
    expect(playerIncomeV7(state, martianId).totalCoins).toBe(16);
  });

  it("the first Start Turn recharges under the Force Field, and every ability can be tried on the first turn", () => {
    const created = createPlayableGameV7(
      showcase(["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const martianId = seatIdV7(state, 0);
    expect(state.turnOrder[state.activeSeatIndex]).toBe(martianId);
    const own = (role: UnitRoleIdV7) =>
      must(
        state.units.find(
          (unit) => unit.ownerId === martianId && unit.role === role,
        ),
        role,
      );
    // The Ray Gunner stands next to the Shield Projector: Shield 4.
    const shield = (role: UnitRoleIdV7) =>
      state.shields.find((entry) => entry.unitId === own(role).id)?.shield;
    expect(shield("MARKSMAN")).toBe(4);
    expect(shield("GUARD")).toBe(3);
    expect(shield("RAIDER")).toBe(2);
    const offered = queryPlayerCommandsV7(viewForV7(state, martianId));
    const kinds = new Set(offered.map((command) => command.kind));
    expect(kinds.has("BEAM_DOWN")).toBe(true);
    expect(kinds.has("TRACTOR_BEAM")).toBe(true);
    expect(kinds.has("ATTACK")).toBe(true);
    // The Grunt on the capital center is a passenger of the Saucer and of
    // the Mothership (`pulp_wars-1wy.3`: every carrier, and every own unit
    // in a city or within two tiles of the carrier).
    for (const carrier of ["RAIDER", "KNIGHT"] as const)
      expect(
        offered.some(
          (command) =>
            command.kind === "BEAM_DOWN" &&
            command.unitId === own(carrier).id &&
            command.passengerUnitId === own("FIGHTER").id,
        ),
        carrier,
      ).toBe(true);
    // Both pullers have a target.
    expect(
      new Set(
        offered.flatMap((command) =>
          command.kind === "TRACTOR_BEAM" ? [command.unitId] : [],
        ),
      ).size,
    ).toBeGreaterThanOrEqual(1);
    // The capital is full: it cannot train until a slot frees.
    const capital = must(
      state.cities.find((city) => city.ownerId === martianId && city.isCapital),
      "capital",
    );
    expect(
      offered.some(
        (command) => command.kind === "TRAIN" && command.cityId === capital.id,
      ),
    ).toBe(false);
    for (const command of offered)
      expect(
        applyCommandV7(state, martianId, command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });
});

describe("Martian public unit stats (section 11)", () => {
  it("carries the martian block exactly for units of a Martian seat", () => {
    const state = martianFieldV7(
      [
        {
          seat: 0,
          role: "CATAPULT",
          at: at(4, 3),
          shield: 1,
          cooling: "COOLING",
        },
        { seat: 0, role: "MARKSMAN", at: at(6, 3), activation: movedV7(1) },
        { seat: 0, role: "GUARD", at: at(7, 3) },
        { seat: 0, role: "CAPTAIN", at: at(4, 5), cooldown: 1 },
        // A Human Fighter the Brain controls (the Mind Control revision).
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 5),
          controlledBy: at(4, 5),
          hp: 4,
        },
        { seat: 0, role: "KNIGHT", at: at(6, 5) },
        { seat: 0, role: "PATROL_BOAT", at: at(9, 2), form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [at(9, 2)] },
    );
    const stats = (where: CoordV7) =>
      publicUnitStatsV7(state, unitAtV7(state, where));
    const brainId = unitAtV7(state, at(4, 5)).id;
    expect(stats(at(4, 3)).martian).toEqual({
      shield: 1,
      shieldMaximum: 2,
      capacitySlots: 1,
      movementMode: "STRIDE",
      rayPower: "HALF",
      cooling: true,
      pierce: true,
      forceField: false,
      mindControl: null,
    });
    expect(stats(at(6, 3)).martian).toMatchObject({
      shield: 2,
      rayPower: "HALF",
      cooling: false,
      pierce: false,
      movementMode: "GROUND",
    });
    expect(stats(at(7, 3)).martian).toMatchObject({
      shield: 3,
      shieldMaximum: 3,
      forceField: true,
      rayPower: null,
    });
    expect(stats(at(4, 5)).martian?.mindControl).toEqual({
      cooldown: 1,
      controlled: 1,
      controlLimit: 1,
    });
    // A controlled Human unit has no Martian block; its control is public.
    expect(stats(at(5, 5))).not.toHaveProperty("martian");
    expect(stats(at(5, 5)).mindControl).toEqual({
      brainUnitId: brainId,
      originalOwnerId: seatIdV7(state, 1),
    });
    expect(stats(at(6, 5)).martian).toMatchObject({
      shield: 4,
      shieldMaximum: 4,
      capacitySlots: 2,
      movementMode: "FLY",
    });
    // A boat of a Martian seat has the block with no Shield.
    expect(stats(at(9, 2)).martian).toMatchObject({
      shield: 0,
      shieldMaximum: 0,
    });
    expect(stats(at(1, 1))).not.toHaveProperty("martian");
    // The Attack row lists HALF_POWER; a Shield row follows the HP row.
    const tripod = stats(at(4, 3));
    expect(
      tripod.stats
        .find((stat) => stat.id === "ATTACK")
        ?.modifiers.map((term) => term.source),
    ).toEqual(["HALF_POWER"]);
    const ids = tripod.stats.map((stat) => stat.id);
    expect(ids[ids.indexOf("HP") + 1]).toBe("SHIELD");
    // A controlled Human unit and a boat have no Shield row; a Human unit
    // has none either.
    for (const where of [at(5, 5), at(9, 2), at(1, 1)])
      expect(stats(where).stats.map((stat) => stat.id)).not.toContain("SHIELD");
    // Labels.
    expect(unitRoleRuleV7(state, unitAtV7(state, at(4, 3))).label).toBe(
      "Tripod",
    );
  });

  it("hides a controlled unit's Brain in a view that cannot see it", () => {
    const state = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(4, 5) },
      { seat: 1, role: "FIGHTER", at: at(5, 5), controlledBy: at(4, 5), hp: 4 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const hidden = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 1
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 4 && where.y === 5),
              ),
            }
          : player,
      ),
    });
    const view = viewForV7(hidden, seatIdV7(hidden, 1));
    const controlled = view.units.find(
      (unit) => unit.at.x === 5 && unit.at.y === 5,
    );
    expect(controlled).toBeDefined();
    expect(view.mindControlled).toEqual([
      {
        unitId: must(controlled).id,
        brainUnitId: null,
        originalOwnerId: seatIdV7(state, 1),
      },
    ]);
    expect(
      view.unitStats.find((entry) => entry.unitId === must(controlled).id)
        ?.mindControl,
    ).toEqual({ brainUnitId: null, originalOwnerId: seatIdV7(state, 1) });
  });
});

describe("Martian persistence (section 15)", () => {
  it("round-trips a match with every Martian list non-empty through replay, save, and hashes", () => {
    const setup = showcase(["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    const martianId = seatIdV7(state, 0);
    const kinds = new Set<string>();
    const play = (command: CommandV7) => {
      const actor = must(state.turnOrder[state.activeSeatIndex], "actor");
      expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
        command,
      );
      const result = applyCommandV7(state, actor, command);
      if (!result.accepted)
        throw new Error(`${command.kind}: ${result.error.code}`);
      for (const event of result.events) {
        expect(parseEventV7(event).ok, event.kind).toBe(true);
        kinds.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, command, state);
    };
    const own = (role: UnitRoleIdV7) =>
      must(
        state.units.find(
          (unit) => unit.ownerId === martianId && unit.role === role,
        ),
        role,
      ).id;
    const enemyAt = (where: CoordV7) => unitAtV7(state, where).id;
    // The Colossus fires a full-power ray: it is Cooling next turn.
    play({
      kind: "ATTACK",
      unitId: own("JUGGERNAUT"),
      targetUnitId: enemyAt(at(5, 9)),
    });
    // The Saucer beams the Grunt from the capital center.
    play({
      kind: "BEAM_DOWN",
      unitId: own("RAIDER"),
      passengerUnitId: own("FIGHTER"),
      to: at(2, 6),
    });
    // The Tripod walks up and fires at half power at the Human Raider.
    const tripodMove = queryPlayerCommandsV7(viewForV7(state, martianId)).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === own("CATAPULT") &&
        command.path.at(-1)?.x === 3 &&
        command.path.at(-1)?.y === 6,
    );
    if (tripodMove === undefined) throw new Error("Tripod Move missing");
    play(tripodMove);
    play({
      kind: "ATTACK",
      unitId: own("CATAPULT"),
      targetUnitId: enemyAt(at(5, 5)),
    });
    expect(unitAtV7(state, at(5, 5)).hp).toBeLessThanOrEqual(6);
    // The Mothership pulls the Brain toward the front; the Brain walks on
    // and takes the weakened Raider.
    play({
      kind: "TRACTOR_BEAM",
      unitId: own("KNIGHT"),
      targetUnitId: own("CAPTAIN"),
    });
    const brainMove = queryPlayerCommandsV7(viewForV7(state, martianId)).find(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === own("CAPTAIN") &&
        command.path.at(-1)?.x === 3 &&
        command.path.at(-1)?.y === 7,
    );
    if (brainMove === undefined) throw new Error("Brain Move missing");
    play(brainMove);
    play({
      kind: "MIND_CONTROL",
      unitId: own("CAPTAIN"),
      targetUnitId: enemyAt(at(5, 5)),
    });
    // Everyone ends the turn; the Martian seat's second turn starts.
    for (let seat = 0; seat < 4; seat += 1) play({ kind: "END_TURN" });
    expect(state.turnOrder[state.activeSeatIndex]).toBe(martianId);
    expect(state.shields.length).toBeGreaterThan(0);
    expect(state.cooling).toEqual([
      { unitId: own("JUGGERNAUT"), firedThisTurn: false },
    ]);
    expect(state.mindControlled).toHaveLength(1);
    expect(state.mindControlCooldowns).toEqual([
      { unitId: own("CAPTAIN"), turnsRemaining: 1 },
    ]);
    for (const kind of [
      "UNIT_BEAMED",
      "UNIT_PULLED",
      "UNIT_MIND_CONTROLLED",
      "SHIELDS_RECHARGED",
    ])
      expect(kinds.has(kind), kind).toBe(true);

    // State, replay, and save round trips.
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const stateHash = canonicalHash(state);
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-02T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    // A save whose Martian lists were tampered with is not valid.
    for (const key of [
      "shields",
      "cooling",
      "mindControlled",
      "mindControlCooldowns",
    ]) {
      const tampered = JSON.parse(JSON.stringify(save)) as {
        state: Record<string, unknown>;
      };
      tampered.state[key] = [];
      expect(parseSaveV7(JSON.stringify(tampered)).kind, key).not.toBe("VALID");
    }
  });
});
