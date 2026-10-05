import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ASSEMBLE_COST_V7,
  BLASTING_ERUPTION_DAMAGE_V7,
  BOMB_DAMAGE_V7,
  BOMB_RANGE_V7,
  COMMAND_KIND_ORDER_V7,
  DIG_IN_RADIUS_V7,
  DIVE_BOMB_DAMAGE_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  DWARF_BASELINE_V1_NODES,
  DWARF_ROLE_MECHANICS_V7,
  DWARF_ROLE_RULES_V7,
  ERUPTION_DAMAGE_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  GUNNER_UNMOVED_SHOTS_V7,
  MILITIA_FIGHTERS_V7,
  ORIGINAL_BASELINE_V5_NODES,
  ORIGINAL_ROLE_RULES_V7,
  PLATED_CAP_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
  REPAIR_MACHINE_V7,
  RULESET_7,
  SHOWCASE_UNIT_TEMPLATES_V7,
  STARTING_FIGHTERS_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  TUNNEL_RANGE_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  applyCommandV7,
  assertRuleset7Registry,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  distinctFactionsV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  factionTreeIdV7,
  nextBounded,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  playerIncomeV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  unitRoleRuleV7,
  validateMatchSetupV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { checkedV7, mirrorOptionV7 } from "../fixtures/v7-builders";
import {
  cityOfV7,
  newUnitsV7,
  rewardStateV7,
} from "../fixtures/v7-dinosaur-arena";
import { dwarfFieldV7 } from "../fixtures/v7-dwarf";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): registration, roster, technology,
// starting units, substitutions, the unique-factions rule, the Showcase,
// the declared shapes, and the public unit stats
// (docs/product/RULESET_7_DWARVES.md sections 2 to 4, 13.12 to 13.14, and
// 14). The identity is pinned in ruleset-v7-dwarf-identity.test.ts.

function must<T>(value: T | undefined, what = "value"): T {
  if (value === undefined) throw new Error(`${what} missing`);
  return value;
}

describe("Dwarf faction registration (sections 2 and 14)", () => {
  it("freezes the faction and tree orders, binding, display name, and faction rules", () => {
    expect(FACTION_IDS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
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
    expect(factionTreeIdV7("DWARF")).toBe("DWARF_BASELINE_V1");
    expect(FACTION_TREES_V7.DWARF).toMatchObject({
      id: "DWARF_BASELINE_V1",
      faction: "DWARF",
      startingTechIds: [],
    });
    expect(RULESET_7.factionTrees.DWARF.roleRules).toBe(DWARF_ROLE_RULES_V7);
    expect(FACTION_DISPLAY_NAMES_V7.DWARF).toBe("Dwarf");
    // The registry assertion accepts the seventh tree unchanged.
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(factionRulesV7("DWARF")).toEqual({
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    });
    expect([STARTING_FIGHTERS_V7.DWARF, MILITIA_FIGHTERS_V7.DWARF]).toEqual([
      1, 1,
    ]);
    expect([
      TUNNEL_RANGE_V7,
      ERUPTION_DAMAGE_V7,
      BLASTING_ERUPTION_DAMAGE_V7,
      BOMB_RANGE_V7,
      BOMB_DAMAGE_V7,
      DIVE_BOMB_DAMAGE_V7,
      GUNNER_UNMOVED_SHOTS_V7,
      DIG_IN_RADIUS_V7,
      REPAIR_MACHINE_V7,
      ASSEMBLE_COST_V7,
      PLATED_CAP_V7,
      // The coarse balance (`pulp_wars-78i.7`): the bomb 5, Dive 6.
    ]).toEqual([3, 2, 3, 2, 5, 6, 2, 1, 4, 4, 4]);
  });

  it("has 53 command kinds and 81 event kinds, with the new kinds at the stated positions", () => {
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(58);
    const snap = COMMAND_KIND_ORDER_V7.indexOf("FREEZE");
    expect(COMMAND_KIND_ORDER_V7.slice(snap, snap + 4)).toEqual([
      "FREEZE", // the frozen sea (pulp_wars-5ti.3), after COLD_SNAP
      "TUNNEL",
      "BOMB_RUN",
      "ASSEMBLE",
    ]);
    // The Mind Control revision adds UNIT_RELEASED (82 event kinds).
    // Map curiosities (pulp_wars-737.2) add FOUNTAIN_HEALED, SHRINE_CLAIMED,
    // and WRECK_SALVAGED (85 event kinds); the Giant Spider (pulp_wars-737.3)
    // MONSTER_REGENERATED, NEUTRAL_TURN_STARTED, NEUTRAL_TURN_ENDED, and
    // MONSTER_BOUNTY_AWARDED (89); the Candy revision seven more (96).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(100);
    const after = (order: readonly string[], kind: string) =>
      order[order.indexOf(kind) + 1];
    for (const order of [
      DOMAIN_EVENT_KIND_ORDER_V7,
      PLAYER_EVENT_KIND_ORDER_V7,
    ] as readonly (readonly string[])[]) {
      expect(after(order, "UNIT_TRAINED")).toBe("UNIT_ASSEMBLED");
      expect(after(order, "UNIT_PULLED")).toBe("UNIT_TUNNELLED");
      expect(after(order, "UNIT_TUNNELLED")).toBe("UNIT_SURFACED");
      expect(after(order, "COMBAT_RESOLVED")).toBe("UNIT_BOMBED");
    }
  });

  it("parses the three commands and the four events and the new literals strictly", () => {
    const commands: readonly CommandV7[] = [
      { kind: "TUNNEL", unitId: 5 as never, to: at(3, 3), rider: null },
      {
        kind: "TUNNEL",
        unitId: 5 as never,
        to: at(3, 3),
        rider: { unitId: 6 as never, to: at(4, 3) },
      },
      {
        kind: "BOMB_RUN",
        unitId: 5 as never,
        targetUnitId: 7 as never,
        to: at(3, 3),
      },
      { kind: "ASSEMBLE", unitId: 5 as never, to: at(3, 3) },
    ];
    for (const command of commands) {
      expect(parseCommandV7(command), command.kind).toEqual({
        ok: true,
        value: command,
      });
      expect(parseCommandV7({ ...command, extra: 1 }).ok, command.kind).toBe(
        false,
      );
    }
    expect(parseCommandV7({ kind: "TUNNEL", unitId: 5, to: at(3, 3) }).ok).toBe(
      false,
    );
    expect(
      parseCommandV7({
        kind: "TUNNEL",
        unitId: 5,
        to: at(3, 3),
        rider: { unitId: 6 },
      }).ok,
    ).toBe(false);
    expect(parseCommandV7({ kind: "ASSEMBLE", unitId: 5 }).ok).toBe(false);
    const surfaced = {
      kind: "UNIT_SURFACED",
      playerId: 1,
      unitId: 5,
      at: at(3, 3),
      riderUnitId: 6,
      riderAt: at(4, 3),
      eruptionDamage: 2,
      results: [
        { unitId: 7, at: at(2, 2), damage: 2, dies: false, shieldDamage: 0 },
        { unitId: 9, at: at(3, 2), damage: 0, dies: false, shieldDamage: 2 },
      ],
    };
    const valid: readonly unknown[] = [
      surfaced,
      { ...surfaced, riderUnitId: null, riderAt: null, results: [] },
      {
        kind: "UNIT_TUNNELLED",
        playerId: 1,
        unitId: 5,
        from: at(1, 1),
        to: at(3, 3),
        riderUnitId: null,
        riderFrom: null,
        riderTo: null,
      },
      {
        kind: "UNIT_TUNNELLED",
        playerId: 1,
        unitId: 5,
        from: at(1, 1),
        to: at(3, 3),
        riderUnitId: 6,
        riderFrom: at(2, 1),
        riderTo: at(4, 3),
      },
      {
        kind: "UNIT_BOMBED",
        playerId: 1,
        unitId: 5,
        from: at(1, 1),
        to: at(3, 3),
        targetUnitId: 7,
        at: at(2, 2),
        damage: 4,
        shieldDamage: 0,
        killed: false,
      },
      {
        kind: "UNIT_ASSEMBLED",
        playerId: 1,
        unitId: 5,
        assembledUnitId: 8,
        at: at(3, 3),
        cityId: 2,
        cost: 4,
      },
      { kind: "UNIT_DIED", unitId: 5, cause: "BOMB" },
      { kind: "UNIT_DIED", unitId: 5, cause: "ERUPTION" },
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 3), reason: "UNDERMINED" },
      {
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: 5,
        at: at(3, 3),
        reason: "MOUND",
      },
    ];
    for (const event of valid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(true);
    const invalid: readonly unknown[] = [
      { ...surfaced, extra: 1 },
      // Unsorted results, a rider without its tile.
      { ...surfaced, results: [...surfaced.results].reverse() },
      { ...surfaced, riderAt: null },
      { kind: "UNIT_DIED", unitId: 5, cause: "DIG_IN" },
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 3), reason: "BOMB" },
    ];
    for (const event of invalid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(false);
  });

  it("accepts Dwarf seats next to every other faction and rejects a faction/tree mismatch", () => {
    for (const factions of [
      ["DWARF", "ORIGINAL"],
      ["ORIGINAL", "DWARF"],
      ["DWARF", "UNDEAD"],
      ["GOBLIN", "DWARF"],
      ["DINOSAUR", "DWARF"],
      ["DWARF", "MARTIAN"],
      ["ICE_FOLK", "DWARF"],
      ["DWARF", "MARTIAN", "UNDEAD", "ICE_FOLK"],
    ] as const)
      expect(parseMatchSetupV7(goblinSetupV7(factions))?.factions).toEqual(
        factions,
      );
    const created = createPlayableGameV7(goblinSetupV7(["ORIGINAL", "DWARF"]));
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["DWARF", "DWARF_BASELINE_V1"],
    ]);
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player, index) =>
          index === 1
            ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V5" }
            : player,
        ),
      }),
    ).toBeNull();
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 1));
    expect([tree.id, tree.faction]).toEqual(["DWARF_BASELINE_V1", "DWARF"]);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(view.players.map((player) => player.faction)).toEqual([
      "ORIGINAL",
      "DWARF",
    ]);
    expect(view.leaderboard.map((entry) => entry.faction).sort()).toEqual([
      "DWARF",
      "ORIGINAL",
    ]);
    expect([view.burrowed, view.surfacedThisTurn, view.bombedThisTurn]).toEqual(
      [[], [], []],
    );
    expect([
      state.burrowed,
      state.surfacedThisTurn,
      state.bombedThisTurn,
    ]).toEqual([[], [], []]);
  });

  it("generates identical boards, turn orders, treasure, and PRNG with Dwarf seats", () => {
    for (const [seed, mapType, aiCount] of [
      [1, "DRY_LAND", 1],
      [42, "CONTINENTS", 2],
      [77, "ARCHIPELAGO", 3],
      [5, "PANGEA", 3],
    ] as const) {
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
      const others = (
        ["ORIGINAL", "UNDEAD", "GOBLIN", "MARTIAN"] as const
      ).slice(0, aiCount + 1);
      const reference = create(others);
      for (const seat of [0, aiCount]) {
        const factions = others.map((faction, index): FactionIdV7 =>
          index === seat ? "DWARF" : faction,
        );
        const other = create(factions);
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect([other.burrowed, other.surfacedThisTurn]).toEqual([[], []]);
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
      }
    }
  });

  // Turned round by the Dwarf UI bead (pulp_wars-78i.6): the setup screen
  // offers the Dwarves, last.
  it("is offered by the setup screen since the UI bead", () => {
    const source = readFileSync("src/render/dom/app-view-v7.ts", "utf8");
    const factions = source.slice(
      source.indexOf("const FACTIONS: readonly FactionIdV7[] = ["),
      source.indexOf("];", source.indexOf("const FACTIONS:")),
    );
    expect(factions).toContain('"ICE_FOLK"');
    // The Candy engine bead (pulp_wars-jdb.3) offers the Candy after them.
    expect(factions).toContain('"DWARF"');
    expect(factions.trim().endsWith('"CANDY",')).toBe(true);
  });
});

describe("Dwarf seats under the unique-factions rule (section 13.14)", () => {
  // Built by hand: `goblinSetupV7` adds the mirror option to a mirror.
  const setupOf = (factions: readonly FactionIdV7[]): MatchSetupV7 => {
    const aiCount = (factions.length - 1) as 1 | 2 | 3;
    const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
    return {
      rulesetId: RULESET_7.id,
      seed: 2,
      width: size,
      height: size,
      aiCount,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [...factions],
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    };
  };

  it("accepts a Dwarf seat with the other six factions in four-seat setups", () => {
    const others = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
    ] as const;
    for (let first = 0; first < others.length; first += 3) {
      const factions: readonly FactionIdV7[] = [
        ...others.slice(first, first + 3),
        "DWARF",
      ];
      const setup = setupOf(factions);
      expect(validateMatchSetupV7(setup)).toMatchObject({ ok: true });
      const created = createPlayableGameV7(setup);
      expect(created.ok, factions.join()).toBe(true);
    }
    // Every other faction faces the Dwarves in a two-seat setup.
    for (const other of others) {
      expect(validateMatchSetupV7(setupOf(["DWARF", other])).ok).toBe(true);
      expect(validateMatchSetupV7(setupOf([other, "DWARF"])).ok).toBe(true);
    }
  });

  it("refuses a duplicate Dwarf seat unless the test only mirror option is set", () => {
    const setup = setupOf(["DWARF", "ORIGINAL", "DWARF"]);
    expect(validateMatchSetupV7(setup)).toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_FACTION",
        params: { faction: "DWARF", seats: [0, 2] },
      },
    });
    expect(createPlayableGameV7(setup)).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_FACTION" },
    });
    const mirror = { ...setup, ...mirrorOptionV7(setup.factions) };
    expect(mirror.allowDuplicateFactions).toBe(true);
    expect(validateMatchSetupV7(mirror).ok).toBe(true);
  });

  it("keeps the Dwarves last in the distinct defaults", () => {
    expect(distinctFactionsV7(4)).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
    ]);
    expect(distinctFactionsV7(7)).toEqual(FACTION_IDS_V7.slice(0, 7));
    expect(distinctFactionsV7(2, ["DWARF", "DWARF"])).toEqual([
      "DWARF",
      "ORIGINAL",
    ]);
  });
});

// label, role, technology, cost, HP, attack2, defense2, Move, minimum
// range, range, Sight, attack after Move, abilities, advances after a kill
const ROSTER = [
  [
    "Hammerer",
    "FIGHTER",
    null,
    2,
    12,
    4,
    4,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "RIDES_TUNNEL", "DIG_IN"],
    true,
  ],
  [
    "Gyrocopter",
    "RAIDER",
    "SCOUTING",
    4,
    8,
    3,
    2,
    3,
    1,
    1,
    2,
    true,
    ["FLY", "BOMB_RUN"],
    false,
  ],
  [
    "Clockwork Gunner",
    "MARKSMAN",
    "MARKSMANSHIP",
    3,
    10,
    3,
    2,
    1,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE", "CLOCKWORK", "TWIN_SHOT"],
    false,
  ],
  [
    "Steam Mole",
    "GUARD",
    "DRILL",
    5,
    16,
    4,
    5,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "TUNNEL", "ERUPTION", "DIG_IN"],
    true,
  ],
  [
    "Engineer",
    "CAPTAIN",
    "ADMINISTRATION",
    5,
    10,
    2,
    2,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "TEND_WOUNDED", "ASSEMBLE"],
    true,
  ],
  [
    "Steam Cannon",
    "CATAPULT",
    "SAWMILLING",
    8,
    10,
    7,
    1,
    1,
    2,
    3,
    1,
    false,
    ["ATTACK", "KNOCKBACK"],
    false,
  ],
  [
    "Steam Tank",
    "KNIGHT",
    "CHIVALRY",
    9,
    16,
    6,
    4,
    2,
    1,
    1,
    1,
    true,
    ["ATTACK", "PLATED"],
    true,
  ],
  [
    "Brass Titan",
    "JUGGERNAUT",
    null,
    null,
    36,
    8,
    6,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "PUSH", "CLOCKWORK"],
    true,
  ],
] as const;

describe("Dwarf roster (section 3)", () => {
  it("registers every value of the section 3 table", () => {
    expect(ROSTER.map((row) => row[1])).toEqual(UNIT_ROLE_IDS_V7.slice(0, 8));
    for (const [
      label,
      role,
      technology,
      cost,
      maxHp,
      attack2,
      defense2,
      move,
      minimumRange,
      range,
      sightRadius,
      mayUsePrimaryActionAfterMove,
      abilities,
      advancesAfterKill,
    ] of ROSTER) {
      expect(effectiveRoleRuleV7(role, "DWARF"), label).toEqual({
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
      expect(roleMechanicsV7(role, "DWARF"), label).toMatchObject({
        capacitySlots: 1,
        shield: 0,
        advancesAfterKill,
        buildsFieldDefense: false,
        hatchTurns: null,
        splash: false,
      });
      expect(DWARF_ROLE_MECHANICS_V7[role]).toBe(
        roleMechanicsV7(role, "DWARF"),
      );
    }
    const mechanics = (role: UnitRoleIdV7) => roleMechanicsV7(role, "DWARF");
    const roles = (test: (role: UnitRoleIdV7) => boolean) =>
      UNIT_ROLE_IDS_V7.filter(test);
    expect(roles((role) => mechanics(role).construct)).toEqual([
      "MARKSMAN",
      "JUGGERNAUT",
    ]);
    expect(roles((role) => mechanics(role).unflinchingAttack)).toEqual([
      "MARKSMAN",
      "JUGGERNAUT",
    ]);
    expect(roles((role) => mechanics(role).repairsAsMachine)).toEqual([
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CATAPULT",
      "KNIGHT",
      "JUGGERNAUT",
    ]);
    expect(roles((role) => mechanics(role).digsIn)).toEqual([
      "FIGHTER",
      "GUARD",
    ]);
    expect(roles((role) => mechanics(role).ridesTunnel)).toEqual(["FIGHTER"]);
    expect(roles((role) => mechanics(role).bombs)).toEqual(["RAIDER"]);
    expect(roles((role) => mechanics(role).knockback)).toEqual(["CATAPULT"]);
    expect(roles((role) => mechanics(role).tunnelRange > 0)).toEqual(["GUARD"]);
    expect(mechanics("GUARD").tunnelRange).toBe(3);
    expect(mechanics("MARKSMAN").unmovedShots).toBe(2);
    expect(mechanics("KNIGHT").plated).toBe(4);
    expect(mechanics("CAPTAIN").repairMachineHeal).toBe(4);
    expect(mechanics("RAIDER").movementMode).toBe("FLY");
    expect(
      roles(
        (role) =>
          role !== "RAIDER" && mechanics(role).movementMode !== "GROUND",
      ),
    ).toEqual([]);
    // The boats are the Human boats.
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
      expect(effectiveRoleRuleV7(role, "DWARF")).toEqual(
        effectiveRoleRuleV7(role, "ORIGINAL"),
      );
      expect(roleMechanicsV7(role, "DWARF")).toEqual(
        roleMechanicsV7(role, "ORIGINAL"),
      );
    }
  });

  it("no other faction has a Dwarf ability or mechanic", () => {
    const dwarfAbilities = [
      "RIDES_TUNNEL",
      "DIG_IN",
      "BOMB_RUN",
      "CLOCKWORK",
      "TWIN_SHOT",
      "TUNNEL",
      "ERUPTION",
      "ASSEMBLE",
      "KNOCKBACK",
      "PLATED",
    ];
    for (const faction of FACTION_IDS_V7.filter((id) => id !== "DWARF"))
      for (const role of UNIT_ROLE_IDS_V7) {
        expect(
          roleMechanicsV7(role, faction),
          `${faction} ${role}`,
        ).toMatchObject({
          construct: false,
          unflinchingAttack: false,
          repairsAsMachine: false,
          repairMachineHeal: null,
          digsIn: false,
          tunnelRange: 0,
          ridesTunnel: false,
          bombs: false,
          unmovedShots: 1,
          knockback: false,
          plated: null,
        });
        expect(
          effectiveRoleRuleV7(role, faction).abilities.filter((ability) =>
            dwarfAbilities.includes(ability),
          ),
        ).toEqual([]);
      }
  });

  it("trains every Dwarf land unit except the Brass Titan on the city center", () => {
    for (const [, role, , cost, maxHp] of ROSTER) {
      const state = goblinArenaV7(
        ["DWARF", "ORIGINAL"],
        [{ seat: 1, role: "FIGHTER", at: at(1, 1) }],
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
        activation: { moved: true, handled: true },
      });
      expect(
        (state.players[0]?.coins ?? 0) - (result.state.players[0]?.coins ?? 0),
        role,
      ).toBe(cost);
    }
  });

  it("never offers Field Defense or Rally to a Dwarf seat, and the Steam Tank has no Overrun", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "GUARD", at: at(7, 7) },
      { seat: 0, role: "CAPTAIN", at: at(9, 7) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const kinds = new Set(offeredV7(state).map((command) => command.kind));
    for (const kind of ["BUILD_FIELD_DEFENSE", "RALLY"])
      expect(kinds.has(kind as never), kind).toBe(false);
    expect(
      rejectedV7(state, {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(state, at(8, 7)).id,
      }).code,
    ).toBeDefined();
    expect(
      rejectedV7(state, { kind: "RALLY", unitId: unitAtV7(state, at(9, 7)).id })
        .code,
    ).toBe("UNIT_ROLE_INVALID");
    const tank = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
    ]);
    const killed = playV7(tank, {
      kind: "ATTACK",
      unitId: unitAtV7(tank, at(4, 3)).id,
      targetUnitId: unitAtV7(tank, at(5, 3)).id,
    });
    const advanced = unitAtV7(killed.state, at(5, 3));
    expect(advanced.role).toBe("KNIGHT");
    expect(advanced.activation.overrunActive).toBe(false);
    expect(
      offeredV7(killed.state, "ATTACK").filter(
        (command) => "unitId" in command && command.unitId === advanced.id,
      ),
    ).toEqual([]);
  });

  it("refunds half the printed cost on Disband and never disbands a Brass Titan", () => {
    for (const [role, refund] of [
      ["FIGHTER", 1],
      ["RAIDER", 2],
      ["MARKSMAN", 1],
      ["GUARD", 2],
      ["CAPTAIN", 2],
      ["CATAPULT", 4],
      ["KNIGHT", 4],
    ] as const) {
      const state = dwarfFieldV7([
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
    }
    const state = dwarfFieldV7([
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

  it("counts the Dwarf trainable roles on the board for Muster", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(4, 3) },
      { seat: 0, role: "RAIDER", at: at(5, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      achievementProgressV7(state, seatIdV7(state, 0)).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 2 });
  });
});

describe("Dwarf technology (section 4)", () => {
  it("differs from the Human graph in six unlock entries and two display names", () => {
    expect(DWARF_BASELINE_V1_NODES).toHaveLength(
      ORIGINAL_BASELINE_V5_NODES.length,
    );
    ORIGINAL_BASELINE_V5_NODES.forEach((human, index) => {
      const dwarf = must(DWARF_BASELINE_V1_NODES[index], "node");
      expect([
        dwarf.id,
        dwarf.branch,
        dwarf.tier,
        dwarf.prerequisites,
        dwarf.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        human.unlockedRoles,
      ]);
      if (human.id === "ADMINISTRATION")
        expect(dwarf.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "ENGINEER_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "MARKSMANSHIP")
        expect(dwarf.unlocks).toEqual([...human.unlocks, { kind: "ASSEMBLE" }]);
      else if (human.id === "RAIDING")
        expect(dwarf.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CHARGE_BONUS" ? { kind: "DIVE" } : unlock,
          ),
        );
      else if (human.id === "CHIVALRY")
        expect(dwarf.unlocks).toEqual(
          human.unlocks.filter((unlock) => unlock.kind !== "OVERRUN"),
        );
      else if (human.id === "FORTIFICATION")
        expect(dwarf.unlocks).toEqual([{ kind: "DIG_IN" }]);
      else if (human.id === "EXPLOSIVES")
        expect(dwarf.unlocks).toEqual([
          ...human.unlocks,
          { kind: "BLASTING_CHARGES" },
        ]);
      else expect(dwarf.unlocks).toEqual(human.unlocks);
    });
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.DWARF).toEqual({
      FORTIFICATION: "Dig In",
      EXPLOSIVES: "Blasting Charges",
    });
  });

  it("reads the five effects through capabilities, never a raw technology test", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [
          faction,
          capabilities.digIn,
          capabilities.assemble,
          capabilities.bombDamage,
          capabilities.eruptionDamage,
          capabilities.cannonIgnoresFortification,
        ];
      }),
    ).toEqual([
      ["ORIGINAL", false, false, 5, 2, false],
      ["UNDEAD", false, false, 5, 2, false],
      ["GOBLIN", false, false, 5, 2, false],
      ["DINOSAUR", false, false, 5, 2, false],
      ["MARTIAN", false, false, 5, 2, false],
      ["ICE_FOLK", false, false, 5, 2, false],
      ["DWARF", true, true, 6, 3, true],
      ["CANDY", false, false, 5, 2, false],
    ]);
    const some = (...techs: (typeof TECHNOLOGY_IDS_V7)[number][]) =>
      technologyCapabilitiesV7(techs, "DWARF");
    expect(some()).toMatchObject({
      digIn: false,
      assemble: false,
      bombDamage: 5,
      eruptionDamage: 2,
      cannonIgnoresFortification: false,
    });
    expect(some("DRILL", "FORTIFICATION")).toMatchObject({
      digIn: true,
      eruptionDamage: 2,
    });
    expect(some("DRILL", "FORTIFICATION", "EXPLOSIVES")).toMatchObject({
      eruptionDamage: 3,
      cannonIgnoresFortification: true,
    });
    expect(some("HUNTING", "MARKSMANSHIP")).toMatchObject({ assemble: true });
    expect(some("SCOUTING", "RAIDING")).toMatchObject({ bombDamage: 6 });
    const dwarf = technologyCapabilitiesV7(all, "DWARF");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    expect(dwarf.trainableRoles).toEqual(human.trainableRoles);
    expect(dwarf.commands).toEqual(
      human.commands.filter((command) => command !== "BUILD_FIELD_DEFENSE"),
    );
    expect(dwarf.commands).toContain("BLAST_MOUNTAIN");
  });

  it("every technology keeps a live unlock for a Dwarf seat (the section 4 audit)", () => {
    for (const node of DWARF_BASELINE_V1_NODES)
      expect(
        node.unlocks.length + node.unlockedRoles.length,
        node.id,
      ).toBeGreaterThan(0);
    const role = (tech: string) =>
      UNIT_ROLE_IDS_V7.filter(
        (id) => effectiveRoleRuleV7(id, "DWARF").technology === tech,
      ).map((id) => effectiveRoleRuleV7(id, "DWARF").label);
    expect(role("SCOUTING")).toEqual(["Gyrocopter"]);
    expect(role("MARKSMANSHIP")).toEqual(["Clockwork Gunner"]);
    expect(role("DRILL")).toEqual(["Steam Mole"]);
    expect(role("ADMINISTRATION")).toEqual(["Engineer"]);
    expect(role("SAWMILLING")).toEqual(["Steam Cannon"]);
    expect(role("CHIVALRY")).toEqual(["Steam Tank"]);
    const state = dwarfFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 0));
    const text = (tech: string) =>
      technologyEffectGroupsV7(
        tree.nodes.find((item) => item.id === tech)?.effects ?? [],
        tree.faction,
      )
        .flatMap((group) => group.items)
        .join();
    expect(text("FORTIFICATION")).toContain("dug in");
    expect(text("EXPLOSIVES")).toContain("Eruptions deal 3");
    expect(text("ADMINISTRATION")).toContain("Repair");
    expect(text("MARKSMANSHIP")).toContain("Assemble");
    expect(text("RAIDING")).toContain("Dive");
    expect(technologyNameV7("FORTIFICATION", "DWARF")).toBe("Dig In");
    expect(technologyNameV7("EXPLOSIVES", "DWARF")).toBe("Blasting Charges");
    for (const tech of TECHNOLOGY_IDS_V7)
      if (tech !== "FORTIFICATION" && tech !== "EXPLOSIVES")
        expect(technologyNameV7(tech, "DWARF")).toBe(
          technologyNameV7(tech, "ORIGINAL"),
        );
  });
});

describe("Dwarf starting units and substitutions (section 13.13)", () => {
  it("starts a Dwarf seat with one Hammerer at full HP, 3 Coins, and no technology", () => {
    for (const [seed, mapType, factions] of [
      [3, "PANGEA", ["DWARF", "ORIGINAL"]],
      [11, "CONTINENTS", ["UNDEAD", "DWARF", "MARTIAN", "GOBLIN"]],
    ] as const) {
      const initial = createInitialMapStateV7({
        ...goblinSetupV7(factions, seed),
        mapType,
      });
      if (!initial.ok) throw new Error(initial.error.code);
      const { state } = initial;
      factions.forEach((faction, seat) => {
        if (faction !== "DWARF") return;
        const player = must(state.players[seat]);
        const capital = must(state.cities[seat]);
        expect([player.coins, player.researchedTechs]).toEqual([3, []]);
        const own = state.units.filter((unit) => unit.ownerId === player.id);
        expect(own).toHaveLength(1);
        expect(own[0]).toMatchObject({
          role: "FIGHTER",
          form: "LAND",
          at: capital.at,
          homeCityId: capital.id,
          hp: 12,
          maxHp: 12,
        });
        expect(unitRoleRuleV7(state, must(own[0])).label).toBe("Hammerer");
      });
    }
  });

  it("grants one exhausted Hammerer for Militia and a Brass Titan for the level-5 reward", () => {
    const militia = rewardStateV7("MILITIA", "DWARF");
    const militiaCity = cityOfV7(militia.state, 0);
    const militiaResult = applyOkV7(
      militia.state,
      militia.state.humanPlayerId,
      militia.command,
    );
    const hammerers = newUnitsV7(militia.state, militiaResult.state);
    expect(hammerers).toHaveLength(1);
    expect(hammerers[0]).toMatchObject({
      role: "FIGHTER",
      at: militiaCity.at,
      hp: 12,
      activation: { moved: true, attacked: true, handled: true },
    });
    const titan = rewardStateV7("JUGGERNAUT", "DWARF");
    const titanResult = applyOkV7(
      titan.state,
      titan.state.humanPlayerId,
      titan.command,
    );
    const created = newUnitsV7(titan.state, titanResult.state);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ role: "JUGGERNAUT", hp: 36, maxHp: 36 });
    expect(unitRoleRuleV7(titanResult.state, must(created[0])).label).toBe(
      "Brass Titan",
    );
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
    const treasure = (extra: readonly UnitRoleIdV7[]) => {
      const arena = dwarfFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
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

    it("spawns a Gyrocopter when a city has a free slot, keeping the KNIGHT literal", () => {
      const { before, after, events } = treasure([]);
      expect(
        events.find((item) => item.kind === "TREASURE_CAPTURED"),
      ).toMatchObject({ requestedReward: "KNIGHT", grantedReward: "KNIGHT" });
      const created = newUnitsV7(before, after);
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ role: "RAIDER", hp: 8, maxHp: 8 });
      expect(unitRoleRuleV7(after, must(created[0])).label).toBe("Gyrocopter");
    });

    it("gives 5 Coins when no city has a free slot", () => {
      const full = treasure(["FIGHTER"]);
      expect(
        full.events.find((item) => item.kind === "TREASURE_CAPTURED"),
      ).toMatchObject({ grantedReward: "COINS", coinDelta: 5 });
      expect(newUnitsV7(full.before, full.after)).toEqual([]);
    });
  });
});

const showcase = (factions: readonly FactionIdV7[]): MatchSetupV7 => ({
  rulesetId: RULESET_7.id,
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

describe("Dwarf Showcase (section 2.4)", () => {
  const create = (factions: readonly FactionIdV7[]): GameStateV7 => {
    const created = createPlayableGameV7(showcase(factions));
    if (!created.ok) throw new Error(created.error.code);
    return created.state;
  };

  it("gives a Dwarf seat the ten roster units on the same tiles, homes, and IDs", () => {
    const initial = (factions: readonly FactionIdV7[]) => {
      const created = createInitialMapStateV7(showcase(factions));
      if (!created.ok) throw new Error(created.error.code);
      return created.state;
    };
    const state = initial(["DWARF", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    // A Martian reference: an Ice Folk seat has no ships since the frozen
    // sea (`pulp_wars-5ti.3`).
    const reference = initial(["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(state.board).toEqual(reference.board);
    expect(state.cities).toEqual(reference.cities);
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
    const dwarfId = seatIdV7(state, 0);
    const own = state.units.filter((unit) => unit.ownerId === dwarfId);
    expect(own.map((unit) => unit.role)).toEqual(
      SHOWCASE_UNIT_TEMPLATES_V7.map((entry) => entry.role),
    );
    for (const unit of own)
      expect(unit.hp).toBe(effectiveRoleRuleV7(unit.role, "DWARF").maxHp);
    expect([
      state.burrowed,
      state.surfacedThisTurn,
      state.bombedThisTurn,
    ]).toEqual([[], [], []]);
    expect(
      state.players.find((player) => player.id === dwarfId)?.researchedTechs,
    ).toEqual(TECHNOLOGY_IDS_V7);
    expect(
      state.cities
        .filter((city) => city.ownerId === dwarfId)
        .map((city) => [
          assignedUnitCountV7(state, city.id),
          cityUnitCapacityV7(state, city),
        ]),
    ).toEqual([
      [5, 7],
      [3, 6],
      [3, 6],
    ]);
    // 19 since land trade pays 2 Coins (tuning 1, 7r46; 17 before).
    expect(playerIncomeV7(state, dwarfId).totalCoins).toBe(19);
  });

  it("offers a Tunnel, an Assemble, and a Cannon shot with a blocked Knockback on turn 1; every offered command is accepted", () => {
    const state = create(["DWARF", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    const dwarfId = seatIdV7(state, 0);
    expect(state.turnOrder[state.activeSeatIndex]).toBe(dwarfId);
    const view = viewForV7(state, dwarfId);
    const offered = queryPlayerCommandsV7(view);
    const kinds = new Set(offered.map((command) => command.kind));
    expect(kinds.has("TUNNEL")).toBe(true);
    expect(kinds.has("ASSEMBLE")).toBe(true);
    const own = (role: UnitRoleIdV7) =>
      must(
        state.units.find(
          (unit) => unit.ownerId === dwarfId && unit.role === role,
        ),
        role,
      );
    // The Hammerer on the Walled capital center has fortification 3 once
    // it stays (Walls 2 + Dig In 1); the Mole on the neutral row is not dug
    // in.
    const hammerer = own("FIGHTER");
    const capital = must(
      state.cities.find((city) => city.ownerId === dwarfId && city.isCapital),
    );
    expect(hammerer.at).toEqual(capital.at);
    expect(publicUnitStatsV7(state, hammerer).dwarf).toMatchObject({
      dugIn: true,
      digsIn: true,
    });
    expect(publicUnitStatsV7(state, own("GUARD")).dwarf).toMatchObject({
      dugIn: false,
      digsIn: true,
      tunnelRange: 3,
      eruptionDamage: 3,
    });
    expect(publicUnitStatsV7(state, own("RAIDER")).dwarf).toMatchObject({
      bombDamage: 6,
      machine: true,
      construct: false,
    });
    const cannon = own("CATAPULT");
    const shots = offered.filter(
      (command) => command.kind === "ATTACK" && command.unitId === cannon.id,
    );
    expect(shots.length).toBeGreaterThan(0);
    for (const command of offered)
      expect(
        applyCommandV7(state, dwarfId, command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });
});

describe("Dwarf public unit stats (section 14)", () => {
  it("carries the per-turn flags for every unit and the dwarf block for units of a Dwarf seat", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "MARKSMAN", at: at(4, 3) },
      { seat: 0, role: "KNIGHT", at: at(6, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(6, 5) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const stats = (where: { x: number; y: number }) =>
      publicUnitStatsV7(state, unitAtV7(state, where));
    expect(stats(at(8, 7)).dwarf).toEqual({
      construct: false,
      machine: false,
      dugIn: true,
      digsIn: true,
      shotsLeft: null,
      plated: null,
      tunnelRange: 0,
      eruptionDamage: 3,
      bombDamage: 6,
      burrowed: false,
    });
    expect(stats(at(4, 3)).dwarf).toMatchObject({
      construct: true,
      machine: true,
      dugIn: false,
      shotsLeft: 2,
    });
    expect(stats(at(6, 3)).dwarf).toMatchObject({ plated: 4, machine: true });
    expect(stats(at(6, 5)).dwarf).toMatchObject({ construct: true });
    expect(stats(at(1, 1)).dwarf).toBeUndefined();
    expect(stats(at(1, 1))).toMatchObject({
      bombedThisTurn: false,
      surfacedThisTurn: false,
    });
    // Without a Dwarf seat neither key is present.
    const human = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
    );
    const plain = publicUnitStatsV7(human, unitAtV7(human, at(4, 3)));
    expect("bombedThisTurn" in plain).toBe(false);
    expect("dwarf" in plain).toBe(false);
  });
});
