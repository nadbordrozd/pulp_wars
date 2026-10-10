import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BLIZZARD_RADIUS_V7,
  BOLAS_RANGE_V7,
  BRITTLE_SHATTER_HP_V7,
  COLD_BLOOD_BONUS2_V7,
  COLD_SNAP_RANGE_V7,
  COMMAND_KIND_ORDER_V7,
  FROST_BOLT_RANGE_V7,
  GLACIER_ICE_MOVE_BONUS_V7,
  STAMPEDE_DAMAGE_V7,
  STAMPEDE_RANGE_V7,
  DEEP_WINTER_RADIUS_V7,
  DEEP_WINTER_RECOVER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  ICE_FOLK_BASELINE_V1_NODES,
  ICE_FOLK_ROLE_MECHANICS_V7,
  ICE_FOLK_ROLE_RULES_V7,
  MILITIA_FIGHTERS_V7,
  SHARED_BASELINE_NODES_V7,
  ORIGINAL_ROLE_RULES_V7,
  PLANTED_BONUS2_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
  ROCKFALL_ATTACK2_V7,
  RULESET_7,
  isNavalRoleV7,
  SHATTER_HP_V7,
  SHOWCASE_UNIT_TEMPLATES_V7,
  showcaseUnitRoleV7,
  STARTING_FIGHTERS_V7,
  SWEEP_DAMAGE_V7,
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
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { SETUP_FACTIONS_V7 } from "../../src/render/setup-options-v7";
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
import { iceFieldV7 } from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): registration, roster,
// technology, starting units, substitutions, the Showcase, the declared
// shapes, and the public unit stats (docs/product/RULESET_7_ICE_FOLK.md
// sections 2 to 4, 10.6, 10.11, 10.12, and 11). The identity is pinned in
// ruleset-v7-ice-folk-identity.test.ts.

function must<T>(value: T | undefined, what = "value"): T {
  if (value === undefined) throw new Error(`${what} missing`);
  return value;
}

describe("Ice Folk faction registration (sections 2 and 11)", () => {
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
    expect(factionTreeIdV7("ICE_FOLK")).toBe("ICE_FOLK_BASELINE_V1");
    expect(FACTION_TREES_V7.ICE_FOLK).toMatchObject({
      id: "ICE_FOLK_BASELINE_V1",
      faction: "ICE_FOLK",
      startingTechIds: [],
    });
    expect(RULESET_7.factionTrees.ICE_FOLK.roleRules).toBe(
      ICE_FOLK_ROLE_RULES_V7,
    );
    expect(FACTION_DISPLAY_NAMES_V7.ICE_FOLK).toBe("Ice Folk");
    // The registry assertion accepts the sixth tree unchanged.
    expect(() => assertRuleset7Registry()).not.toThrow();
    expect(factionRulesV7("ICE_FOLK")).toEqual({
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: true,
    });
    for (const faction of FACTION_IDS_V7)
      expect(factionRulesV7(faction).snow, faction).toBe(
        faction === "ICE_FOLK",
      );
    expect([
      STARTING_FIGHTERS_V7.ICE_FOLK,
      MILITIA_FIGHTERS_V7.ICE_FOLK,
    ]).toEqual([1, 1]);
    expect([
      SHATTER_HP_V7,
      BRITTLE_SHATTER_HP_V7,
      BOLAS_RANGE_V7,
      COLD_SNAP_RANGE_V7,
      BLIZZARD_RADIUS_V7,
      DEEP_WINTER_RADIUS_V7,
      DEEP_WINTER_RECOVER_V7,
      SWEEP_DAMAGE_V7,
      ROCKFALL_ATTACK2_V7,
      PLANTED_BONUS2_V7,
      COLD_BLOOD_BONUS2_V7,
    ]).toEqual([3, 4, 2, 1, 1, 2, 6, 2, 3, 2, 1]);
    // Ice Folk Freeze (`pulp_wars-w49.37`): Cold Snap reaches the eight
    // tiles around the Witch (2 before), the Frost Bolt 2; the Stampede goes
    // 3 tiles and hits for 3; Glacier adds 1 Move on an ice path.
    expect([
      FROST_BOLT_RANGE_V7,
      STAMPEDE_RANGE_V7,
      STAMPEDE_DAMAGE_V7,
      GLACIER_ICE_MOVE_BONUS_V7,
    ]).toEqual([2, 3, 3, 1]);
  });

  // The Dwarf revision (`pulp_wars-78i.3`) adds three command kinds after
  // COLD_SNAP and four event kinds (ruleset-v7-dwarf-faction.test.ts).
  it("has 53 command kinds and 81 event kinds, with the new kinds at the stated positions", () => {
    // Tuning 3 (`pulp_wars-w49.3`) adds HIRE after TRAIN_NAVAL (59), and
    // tuning 4 DRILL_UNIT after PROMOTE (60), which tuning 5
    // (`pulp_wars-w49.4`) removes again (59).
    // Dwarf crowd control (`pulp_wars-w49.33`): three more commands (62).
    // The giants' signatures (`pulp_wars-w49.30`) add SWALLOW, TOSS,
    // STOMP, and BREAK_OFF after RECOVER (66). Map curiosities round 2
    // (`pulp_wars-737.14`) add TOSS_COIN (67). Ice Folk Freeze
    // (`pulp_wars-w49.37`) adds FROST_BOLT and STAMPEDE after BREAK_OFF (69).
    // The Candy redesign (`pulp_wars-jdb.12`) adds TOP_UP after
    // TOSS_COIN (70).
    // The Cult's Favour (`pulp_wars-mch9.4`) adds SACRIFICE and SEIZE
    // after STAMPEDE and OFFERING after LAY_EGG (73).
    // The Cult's channel (`pulp_wars-mch9.5`) adds SUMMON, CHANNEL, BEHOLD,
    // ANCHOR, and BOO after SEIZE (78).
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(78);
    const breakOff = COMMAND_KIND_ORDER_V7.indexOf("BREAK_OFF");
    expect(COMMAND_KIND_ORDER_V7.slice(breakOff, breakOff + 11)).toEqual([
      "BREAK_OFF",
      "FROST_BOLT",
      "STAMPEDE",
      // The Cult's Favour (`pulp_wars-mch9.4`), after the Freeze block.
      "SACRIFICE",
      "SEIZE",
      // The Cult's channel (`pulp_wars-mch9.5`).
      "SUMMON",
      "CHANNEL",
      "BEHOLD",
      "ANCHOR",
      "BOO",
      "CAPTURE",
    ]);
    const tractor = COMMAND_KIND_ORDER_V7.indexOf("TRACTOR_BEAM");
    expect(COMMAND_KIND_ORDER_V7.slice(tractor, tractor + 4)).toEqual([
      "TRACTOR_BEAM",
      "THROW_BOLAS",
      "COLD_SNAP",
      "FREEZE", // the frozen sea (pulp_wars-5ti.3) inserts FREEZE after COLD_SNAP
    ]);
    // The Mind Control revision adds UNIT_RELEASED (82 event kinds).
    // Map curiosities (pulp_wars-737.2) add FOUNTAIN_HEALED, SHRINE_CLAIMED,
    // and WRECK_SALVAGED (85 event kinds); the Giant Spider (pulp_wars-737.3)
    // MONSTER_REGENERATED, NEUTRAL_TURN_STARTED, NEUTRAL_TURN_ENDED, and
    // MONSTER_BOUNTY_AWARDED (89); the Candy revision seven more (96).
    // The ninth unit (`pulp_wars-w49.17`, 7r55): WIGHT_RISEN (101).
    // Dwarf crowd control (`pulp_wars-w49.33`): four more events (105).
    // The giants' signatures (`pulp_wars-w49.30`) add ten event kinds in
    // one block after UNIT_SURFACED (115). Map curiosities round 2
    // (`pulp_wars-737.14`) add four (119). Ice Folk Freeze
    // (`pulp_wars-w49.37`) renames UNITS_CHILLED to UNITS_FROZEN in place
    // and adds MAMMOTH_STAMPEDED after GIANT_BROKE_OFF (120).
    // The Candy redesign (`pulp_wars-jdb.12`) adds UNIT_TOPPED_UP,
    // TILES_GLAZED, UNIT_STUCK, TOOTHACHE_GIVEN, RICOCHETED, and THUMPED
    // (126).
    // The Cult's Favour (`pulp_wars-mch9.4`) adds UNIT_SACRIFICED,
    // UNIT_SEIZED, OFFERING_MADE, and FAVOUR_GAINED (130).
    // The Cult's channel (`pulp_wars-mch9.5`) adds ten kinds after
    // FAVOUR_GAINED, from FAVOUR_SPENT to DAEMON_UNBOUND (140).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(140);
    const after = (order: readonly string[], kind: string) =>
      order[order.indexOf(kind) + 1];
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "UNITS_RALLIED")).toBe(
      "UNITS_FROZEN",
    );
    // The Candy revision inserts UNIT_SUGAR_RUSHED after UNITS_FROZEN.
    expect(after(DOMAIN_EVENT_KIND_ORDER_V7, "UNIT_SUGAR_RUSHED")).toBe(
      "WOUNDED_TENDED",
    );
    expect(after(PLAYER_EVENT_KIND_ORDER_V7, "UNITS_RALLIED")).toBe(
      "UNITS_FROZEN",
    );
  });

  it("parses the commands and the new events and literals strictly", () => {
    const commands: readonly CommandV7[] = [
      { kind: "THROW_BOLAS", unitId: 5 as never, targetUnitId: 7 as never },
      { kind: "COLD_SNAP", unitId: 5 as never },
      // Ice Folk Freeze (`pulp_wars-w49.37`).
      { kind: "FROST_BOLT", unitId: 5 as never, targetUnitId: 7 as never },
      { kind: "STAMPEDE", unitId: 5 as never, at: at(3, 3) },
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
    expect(parseCommandV7({ kind: "THROW_BOLAS", unitId: 5 }).ok).toBe(false);
    expect(
      parseCommandV7({ kind: "COLD_SNAP", unitId: 5, targetUnitId: 7 }).ok,
    ).toBe(false);
    const frozen = {
      kind: "UNITS_FROZEN",
      playerId: 1,
      sourceUnitId: 5,
      source: "COLD_SNAP",
      results: [
        { unitId: 7, turnsLeft: 1 },
        { unitId: 9, turnsLeft: 2 },
      ],
    };
    const valid: readonly unknown[] = [
      frozen,
      { ...frozen, source: "BOLAS", results: [frozen.results[0]] },
      { ...frozen, source: "FROST_BOLT", results: [frozen.results[0]] },
      { ...frozen, source: "COLD_AURA" },
      {
        kind: "MAMMOTH_STAMPEDED",
        playerId: 1,
        unitId: 5,
        from: at(2, 2),
        to: at(4, 2),
        path: [at(3, 2), at(4, 2)],
        results: [
          {
            unitId: 7,
            at: at(3, 2),
            damage: 3,
            shieldDamage: 0,
            dies: false,
            shovedTo: at(3, 3),
          },
        ],
      },
      { kind: "UNIT_DIED", unitId: 5, cause: "STAMPEDE" },
      { kind: "UNIT_DIED", unitId: 5, cause: "SHATTER" },
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 3), reason: "TRAMPLE" },
      {
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: 5,
        at: at(3, 3),
        reason: "SNOW",
      },
      {
        kind: "WOUNDED_TENDED",
        captainId: 5,
        results: [
          {
            unitId: 7,
            amount: 0,
            hpAfter: 10,
            curedPlague: false,
            curedBitten: false,
            curedFrozen: true,
          },
        ],
      },
    ];
    for (const event of valid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(true);
    const invalid: readonly unknown[] = [
      { ...frozen, extra: 1 },
      { ...frozen, source: "WAIL" },
      { ...frozen, results: [] },
      // Unsorted, duplicated, the source itself, a thawing result.
      { ...frozen, results: [...frozen.results].reverse() },
      { ...frozen, results: [frozen.results[0], frozen.results[0]] },
      {
        ...frozen,
        results: [{ unitId: 5, turnsLeft: 1 }],
      },
      {
        ...frozen,
        results: [{ unitId: 7, turnsLeft: 0 }],
      },
      // The Ice Folk revision's Chill shape is gone.
      {
        ...frozen,
        results: [{ unitId: 7, sluggish: true, turnsLeft: 2 }],
      },
      {
        kind: "MAMMOTH_STAMPEDED",
        playerId: 1,
        unitId: 5,
        from: at(2, 2),
        to: at(4, 2),
        path: [at(3, 2), at(4, 2)],
        results: [
          {
            unitId: 7,
            at: at(3, 2),
            damage: 4,
            shieldDamage: 0,
            dies: false,
            shovedTo: null,
          },
        ],
      },
      { ...frozen, sourceUnitId: null },
      {
        kind: "WOUNDED_TENDED",
        captainId: 5,
        results: [
          {
            unitId: 7,
            amount: 0,
            hpAfter: 10,
            curedPlague: false,
            curedBitten: false,
          },
        ],
      },
      {
        kind: "WOUNDED_TENDED",
        captainId: 5,
        results: [
          {
            unitId: 7,
            amount: 0,
            hpAfter: 10,
            curedPlague: false,
            curedBitten: false,
            curedFrozen: false,
          },
        ],
      },
    ];
    for (const event of invalid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(false);
  });

  it("accepts Ice Folk seats in every combination and rejects a faction/tree mismatch", () => {
    for (const factions of [
      ["ICE_FOLK", "ORIGINAL"],
      ["ORIGINAL", "ICE_FOLK"],
      ["ICE_FOLK", "UNDEAD"],
      ["GOBLIN", "ICE_FOLK"],
      ["DINOSAUR", "ICE_FOLK"],
      ["ICE_FOLK", "MARTIAN"],
      ["ICE_FOLK", "ICE_FOLK"],
      ["ICE_FOLK", "MARTIAN", "UNDEAD", "GOBLIN"],
    ] as const)
      expect(parseMatchSetupV7(goblinSetupV7(factions))?.factions).toEqual(
        factions,
      );
    const created = createPlayableGameV7(
      goblinSetupV7(["ORIGINAL", "ICE_FOLK"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["ICE_FOLK", "ICE_FOLK_BASELINE_V1"],
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
    expect([tree.id, tree.faction]).toEqual([
      "ICE_FOLK_BASELINE_V1",
      "ICE_FOLK",
    ]);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(view.players.map((player) => player.faction)).toEqual([
      "ORIGINAL",
      "ICE_FOLK",
    ]);
    expect(view.leaderboard.map((entry) => entry.faction).sort()).toEqual([
      "ICE_FOLK",
      "ORIGINAL",
    ]);
    expect(view.frozen).toEqual([]);
  });

  it("generates identical boards, turn orders, treasure, and PRNG with Ice Folk seats", () => {
    for (const [seed, mapType, aiCount] of [
      [1, "DRY_LAND", 1],
      [42, "CONTINENTS", 2],
      [77, "ARCHIPELAGO", 3],
      [5, "PANGEA", 3],
    ] as const) {
      const humans = Array.from(
        { length: aiCount + 1 },
        () => "ORIGINAL" as const,
      );
      const ice = humans.map(() => "ICE_FOLK" as const);
      const mixed = humans.map(
        (_, seat): FactionIdV7 =>
          (["ICE_FOLK", "MARTIAN", "DINOSAUR", "GOBLIN"] as const)[seat % 4] ??
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
      expect(reference.frozen).toEqual([]);
      for (const factions of [ice, mixed]) {
        const other = create(factions);
        expect(other.board).toEqual(reference.board);
        expect(other.turnOrder).toEqual(reference.turnOrder);
        expect(other.treasureChests).toEqual(reference.treasureChests);
        expect(other.random).toEqual(reference.random);
        expect(other.cities).toEqual(reference.cities);
        expect(other.frozen).toEqual([]);
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

  // Turned round by the UI bead (`pulp_wars-7g3.6`): the setup screen's
  // FACTIONS constant offers ICE_FOLK last, labelled "Ice Folk".
  it("is registered and offered by the setup screen since the UI bead", () => {
    // The Cultists (`pulp_wars-mch9.3`): the screen's list is the engine's
    // offered factions, which leave the hidden Cult out.
    const source = readFileSync("src/render/dom/app-view-v7.ts", "utf8");
    expect(source).toContain(
      "const FACTIONS: readonly FactionIdV7[] = SETUP_FACTIONS_V7;",
    );
    expect(SETUP_FACTIONS_V7).toContain("ICE_FOLK");
    expect(source).toContain('ICE_FOLK: "Ice Folk"');
  });
});

// label, role, technology, cost, HP, attack2, defense2, Move, minimum
// range, range, Sight, attack after Move, abilities, advances after a kill
const ROSTER = [
  [
    "Yeti",
    "FIGHTER",
    null,
    2,
    // The coarse balance (`pulp_wars-7g3.7`): 9 HP and Defense 1.5.
    9,
    4,
    3,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "MOUNTAIN_BORN", "ROCKFALL"],
    true,
  ],
  [
    "Sled",
    "RAIDER",
    "SCOUTING",
    // Ice Folk Freeze (`pulp_wars-w49.37`): 4 Coins (3 before).
    4,
    10,
    4,
    2,
    2,
    1,
    1,
    2,
    true,
    ["ATTACK", "CAPTURE", "CHARGE", "BOLAS"],
    true,
  ],
  [
    "Snow Hunter",
    "MARKSMAN",
    "MARKSMANSHIP",
    3,
    8,
    4,
    2,
    1,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE", "COLD_BLOOD"],
    true,
  ],
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Musk Ox is the defender
  // the Mammoth was (4 Coins, 16 HP, Attack 1.5, Defense 2.5, never
  // attacks after moving). The Mammoth is the heavy line role, asserted
  // below the table.
  [
    "Musk Ox",
    "GUARD",
    "FORTIFICATION",
    4,
    16,
    3,
    // Ice Folk Freeze: Defense 2 (2.5 before).
    4,
    1,
    1,
    1,
    1,
    false,
    ["ATTACK", "CAPTURE"],
    true,
  ],
  [
    "Ice Witch",
    "CAPTAIN",
    "ADMINISTRATION",
    // Ice Folk Freeze: 6 Coins and 10 HP (5 and 12 before).
    6,
    10,
    2,
    2,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "BLIZZARD", "COLD_SNAP", "FROST_BOLT"],
    true,
  ],
  [
    "Boulder Yeti",
    "CATAPULT",
    "SAWMILLING",
    // Ice Folk Freeze: 9 Coins and 10 HP (8 and 12 before).
    9,
    10,
    4,
    3,
    2,
    1,
    2,
    1,
    true,
    ["ATTACK", "CAPTURE", "BOULDERS", "MOUNTAIN_BORN"],
    false,
  ],
  [
    "Sabretooth",
    "KNIGHT",
    "CHIVALRY",
    9,
    14,
    6,
    2,
    3,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "PROWL"],
    true,
  ],
  [
    "Frost Giant",
    "JUGGERNAUT",
    null,
    null,
    // Ice Folk Freeze: 36 HP (40 before).
    36,
    8,
    8,
    1,
    1,
    1,
    1,
    true,
    // The giants' signatures (`pulp_wars-w49.30`): Glacial Smash instead of
    // Push, and the Frost Giant never advances.
    ["ATTACK", "CAPTURE", "COLD_AURA", "MOUNTAIN_BORN", "GLACIAL_SMASH"],
    false,
  ],
] as const;

describe("Ice Folk roster (section 3)", () => {
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
      expect(effectiveRoleRuleV7(role, "ICE_FOLK"), label).toEqual({
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
        // The frozen sea (naval branch section 8.4): every Ice Folk land
        // role lists Freeze last; it does nothing before Rime.
        abilities: [...abilities, "FREEZE"],
      });
      expect(roleMechanicsV7(role, "ICE_FOLK"), label).toMatchObject({
        capacitySlots: 1,
        shield: 0,
        movementMode: "GROUND",
        advancesAfterKill,
        buildsFieldDefense: false,
        hatchTurns: null,
        splash: false,
      });
      expect(ICE_FOLK_ROLE_MECHANICS_V7[role]).toBe(
        roleMechanicsV7(role, "ICE_FOLK"),
      );
    }
    // The ninth unit (7r55): the Mammoth, with the numbers it had as the
    // defender role, at Metallurgy and a `LINE` unit.
    expect(effectiveRoleRuleV7("SWORDSMAN", "ICE_FOLK")).toEqual({
      role: "SWORDSMAN",
      label: "Mammoth",
      tacticalRole: "LINE",
      // Ice Folk Freeze: 7 Coins (6 before) and Stampede.
      cost: 7,
      maxHp: 20,
      attack2: 5,
      defense2: 4,
      move: 1,
      range: 1,
      minimumRange: 1,
      sightRadius: 1,
      technology: "METALLURGY",
      mayUsePrimaryActionAfterMove: true,
      abilities: [
        "ATTACK",
        "CAPTURE",
        "SWEEP",
        "TRAMPLE",
        "STAMPEDE",
        "FREEZE",
      ],
    });
    // The role mechanics of section 11.
    const mechanics = (role: UnitRoleIdV7) => roleMechanicsV7(role, "ICE_FOLK");
    expect(mechanics("GUARD")).toMatchObject({
      frostbite: true,
      sweepDamage: 0,
      tramplesFieldDefense: false,
    });
    expect(
      UNIT_ROLE_IDS_V7.filter((role) => mechanics(role).mountainBorn),
    ).toEqual(["FIGHTER", "CATAPULT", "JUGGERNAUT"]);
    expect(UNIT_ROLE_IDS_V7.filter((role) => mechanics(role).glides)).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "JUGGERNAUT",
      "SWORDSMAN",
    ]);
    expect(
      UNIT_ROLE_IDS_V7.filter((role) => mechanics(role).ignoresZocStops),
    ).toEqual(["KNIGHT"]);
    expect(mechanics("SWORDSMAN")).toMatchObject({
      sweepDamage: SWEEP_DAMAGE_V7,
      tramplesFieldDefense: true,
    });
    expect(mechanics("CATAPULT")).toMatchObject({
      ignoresFortification: true,
      plantedBonus2: PLANTED_BONUS2_V7,
    });
    expect(mechanics("FIGHTER").rockfallAttack2).toBe(ROCKFALL_ATTACK2_V7);
    expect(mechanics("MARKSMAN").coldBloodBonus2).toBe(COLD_BLOOD_BONUS2_V7);
    // The boats are the Human boats.
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
      expect(effectiveRoleRuleV7(role, "ICE_FOLK")).toEqual(
        effectiveRoleRuleV7(role, "ORIGINAL"),
      );
      expect(roleMechanicsV7(role, "ICE_FOLK")).toEqual(
        roleMechanicsV7(role, "ORIGINAL"),
      );
    }
  });

  it("no other faction has an Ice Folk ability or mechanic", () => {
    const iceAbilities = [
      "MOUNTAIN_BORN",
      "ROCKFALL",
      "BOLAS",
      "COLD_BLOOD",
      "SWEEP",
      "TRAMPLE",
      "BLIZZARD",
      "COLD_SNAP",
      "BOULDERS",
      "PROWL",
      "COLD_AURA",
    ];
    for (const faction of FACTION_IDS_V7.filter((id) => id !== "ICE_FOLK"))
      for (const role of UNIT_ROLE_IDS_V7) {
        expect(
          roleMechanicsV7(role, faction),
          `${faction} ${role}`,
        ).toMatchObject({
          mountainBorn: false,
          glides: false,
          // Tuning 4 (`pulp_wars-w49.3`): the Human Raider slips past zones
          // of control too (a mechanic, not the Prowl ability). The Vampire
          // and Banshee rework (`pulp_wars-ty6i`, 7r70): so does the Undead
          // Banshee (its own ability, Ethereal, on the same mechanic).
          ignoresZocStops:
            (faction === "ORIGINAL" && role === "RAIDER") ||
            (faction === "UNDEAD" && role === "MARKSMAN"),
          sweepDamage: 0,
          tramplesFieldDefense: false,
          ignoresFortification: false,
          plantedBonus2: 0,
          rockfallAttack2: 0,
          coldBloodBonus2: 0,
        });
        expect(
          effectiveRoleRuleV7(role, faction).abilities.filter((ability) =>
            iceAbilities.includes(ability),
          ),
        ).toEqual([]);
      }
    // No Ice Folk unit has Escape, Overrun, Rally, or Tend Wounded.
    const all = new Set(
      UNIT_ROLE_IDS_V7.flatMap(
        (role) => effectiveRoleRuleV7(role, "ICE_FOLK").abilities,
      ),
    );
    for (const ability of ["ESCAPE", "OVERRUN", "RALLY", "TEND_WOUNDED"])
      expect(all.has(ability as never), ability).toBe(false);
  });

  it("trains every Ice Folk land unit except the Frost Giant on the city center", () => {
    for (const [, role, , cost, maxHp] of ROSTER) {
      const state = goblinArenaV7(
        ["ICE_FOLK", "ORIGINAL"],
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
      });
      expect(
        (state.players[0]?.coins ?? 0) - (result.state.players[0]?.coins ?? 0),
        role,
      ).toBe(cost);
      expect(result.state.frozen).toEqual([]);
    }
  });

  it("never offers Field Defense, Rally, Tend Wounded, Overrun, or Escape to an Ice Folk seat", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "GUARD", at: at(7, 7) },
      { seat: 0, role: "CAPTAIN", at: at(9, 7) },
      { seat: 0, role: "FIGHTER", at: at(9, 8), hp: 3 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const kinds = new Set(offeredV7(state).map((command) => command.kind));
    for (const kind of ["BUILD_FIELD_DEFENSE", "TEND_WOUNDED", "RALLY"])
      expect(kinds.has(kind as never), kind).toBe(false);
    expect(
      rejectedV7(state, {
        kind: "BUILD_FIELD_DEFENSE",
        unitId: unitAtV7(state, at(8, 7)).id,
      }).code,
    ).toBeDefined();
    for (const kind of ["RALLY", "TEND_WOUNDED"] as const)
      expect(
        rejectedV7(state, { kind, unitId: unitAtV7(state, at(9, 7)).id }).code,
        kind,
      ).toBe("UNIT_ROLE_INVALID");
    // A Sabretooth that kills does not advance-and-attack again (no Overrun),
    // and a Sled that survives has no Escape.
    const knight = iceFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3) },
      { seat: 0, role: "RAIDER", at: at(4, 1) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 1) },
    ]);
    const killed = playV7(knight, {
      kind: "ATTACK",
      unitId: unitAtV7(knight, at(4, 3)).id,
      targetUnitId: unitAtV7(knight, at(5, 3)).id,
    });
    const cat = unitAtV7(killed.state, at(5, 3));
    expect(cat.activation.overrunActive).toBe(false);
    expect(
      offeredV7(killed.state, "ATTACK").filter(
        (command) => "unitId" in command && command.unitId === cat.id,
      ),
    ).toEqual([]);
    const sled = playV7(killed.state, {
      kind: "ATTACK",
      unitId: unitAtV7(killed.state, at(4, 1)).id,
      targetUnitId: unitAtV7(killed.state, at(5, 1)).id,
    });
    expect(unitAtV7(sled.state, at(4, 1)).activation.escapeAvailable).toBe(
      false,
    );
  });

  it("refunds half the printed cost on Disband and never disbands a Frost Giant", () => {
    for (const [role, refund] of [
      ["FIGHTER", 1],
      // Ice Folk Freeze (`pulp_wars-w49.37`): half of the Sled's 4, the
      // Witch's 6, the Boulder Yeti's 9, and the Mammoth's 7.
      ["RAIDER", 2],
      ["MARKSMAN", 1],
      // (7r55: the Musk Ox, half of 4.)
      ["GUARD", 2],
      ["CAPTAIN", 3],
      ["CATAPULT", 4],
      ["KNIGHT", 4],
      ["SWORDSMAN", 3],
    ] as const) {
      const state = iceFieldV7([
        {
          seat: 0,
          role,
          at: at(4, 3),
          frozen: { turnsLeft: 1 },
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ]);
      // A Frozen unit may Disband (section 10.11); the entry goes with it.
      const result = playV7(state, {
        kind: "DISBAND",
        unitId: unitAtV7(state, at(4, 3)).id,
      });
      expect(result.events[0], role).toMatchObject({
        kind: "UNIT_DISBANDED",
        role,
        coinDelta: refund,
      });
      expect(result.state.frozen).toEqual([]);
    }
    const state = iceFieldV7([
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

  it("promotes like every faction (3 kills, +5 HP, a full heal) and counts Muster roles", () => {
    const state = iceFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(4, 3), kills: 3, hp: 3 },
      { seat: 0, role: "RAIDER", at: at(5, 3) },
      { seat: 0, role: "JUGGERNAUT", at: at(6, 3) },
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
    expect(
      achievementProgressV7(state, seatIdV7(state, 0)).find(
        (entry) => entry.achievement === "MUSTER",
      ),
    ).toMatchObject({ currentDistinctTrainableRoles: 2 });
  });
});

describe("Ice Folk technology (section 4)", () => {
  it("differs from the Human graph in four unlock entries and two display names", () => {
    expect(ICE_FOLK_BASELINE_V1_NODES).toHaveLength(
      SHARED_BASELINE_NODES_V7.length,
    );
    SHARED_BASELINE_NODES_V7.forEach((human, index) => {
      const ice = must(ICE_FOLK_BASELINE_V1_NODES[index], "node");
      expect([
        ice.id,
        ice.branch,
        ice.tier,
        ice.prerequisites,
        ice.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        // The frozen sea (naval branch sections 2.2 and 8.11): no ship.
        human.unlockedRoles.filter((role) => !isNavalRoleV7(role)),
      ]);
      const ICE_NAVAL: Readonly<Record<string, readonly unknown[]>> = {
        SHORECRAFT: [{ kind: "FREEZE", depth: "SHALLOW" }],
        NAVIGATION: [{ kind: "FREEZE", depth: "DEEP" }],
        NAVAL_ENGINEERING: [{ kind: "ICEBOUND" }],
        SEAMANSHIP: [{ kind: "BLACK_ICE" }],
        SUBMERSIBLES: [{ kind: "GLACIER", iceTurns: 5 }],
      };
      if (human.branch === "NAVAL") {
        // The five Naval nodes keep their economic unlocks, lose every
        // ship, the Ram, and Board, and gain the ice unlocks.
        expect(ice.unlocks, human.id).toEqual([
          ...human.unlocks.filter(
            (unlock) =>
              !(unlock.kind === "UNIT_ROLE" && isNavalRoleV7(unlock.role)) &&
              unlock.kind !== "RAM" &&
              !(unlock.kind === "COMMAND" && unlock.command === "BOARD"),
          ),
          ...must(ICE_NAVAL[human.id], human.id),
        ]);
        return;
      }
      if (human.id === "ADMINISTRATION")
        expect(ice.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "WITCH_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "CHIVALRY")
        expect(ice.unlocks).toEqual(
          human.unlocks.filter((unlock) => unlock.kind !== "OVERRUN"),
        );
      else if (human.id === "FORTIFICATION")
        expect(ice.unlocks).toEqual([
          { kind: "DEEP_WINTER" },
          // The Industry reshuffle (7r56): the defender is here.
          { kind: "UNIT_ROLE", role: "GUARD" },
        ]);
      else if (human.id === "EXPLOSIVES")
        expect(ice.unlocks).toEqual([...human.unlocks, { kind: "BRITTLE" }]);
      else expect(ice.unlocks).toEqual(human.unlocks);
    });
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.ICE_FOLK).toEqual({
      FORTIFICATION: "Deep Winter",
      EXPLOSIVES: "Brittle",
      // The frozen sea (naval branch section 2.2).
      SHORECRAFT: "Rime",
      NAVIGATION: "Pack Ice",
      NAVAL_ENGINEERING: "Icebound",
      SEAMANSHIP: "Black Ice",
      SUBMERSIBLES: "Glacier",
      // The ninth unit (7r55): the nodes named for their unit.
      SAWMILLING: "Boulders",
      CHIVALRY: "Sabretooths",
      METALLURGY: "Mammoths",
    });
  });

  it("reads the two effects through capabilities, never a raw technology test", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [
          faction,
          capabilities.deepWinter,
          capabilities.shatterThreshold,
        ];
      }),
    ).toEqual([
      ["ORIGINAL", false, 3],
      ["UNDEAD", false, 3],
      ["GOBLIN", false, 3],
      ["DINOSAUR", false, 3],
      ["MARTIAN", false, 3],
      ["ICE_FOLK", true, 4],
      ["DWARF", false, 3],
      ["CANDY", false, 3],
      ["CULT", false, 3],
    ]);
    const some = (...techs: (typeof TECHNOLOGY_IDS_V7)[number][]) =>
      technologyCapabilitiesV7(techs, "ICE_FOLK");
    expect(some("DRILL")).toMatchObject({
      deepWinter: false,
      shatterThreshold: 3,
    });
    expect(some("DRILL", "FORTIFICATION")).toMatchObject({
      deepWinter: true,
      shatterThreshold: 3,
    });
    expect(some("DRILL", "FORTIFICATION", "EXPLOSIVES")).toMatchObject({
      deepWinter: true,
      shatterThreshold: 4,
    });
    const ice = technologyCapabilitiesV7(all, "ICE_FOLK");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    // The frozen sea (naval branch section 8.11): no ship and no Board.
    // (The ninth unit, 7r55: every faction has the heavy line role.)
    expect(ice.trainableRoles).toEqual(
      human.trainableRoles.filter((role) => !isNavalRoleV7(role)),
    );
    expect(ice.commands).toEqual(
      human.commands.filter(
        (command) => command !== "BUILD_FIELD_DEFENSE" && command !== "BOARD",
      ),
    );
    expect(ice.commands).toContain("BLAST_MOUNTAIN");
    expect(ice.mountainMovement).toBe(true);
  });

  it("every technology keeps a live unlock for an Ice Folk seat (the section 4 audit)", () => {
    for (const node of ICE_FOLK_BASELINE_V1_NODES)
      expect(
        node.unlocks.length + node.unlockedRoles.length,
        node.id,
      ).toBeGreaterThan(0);
    const role = (tech: string) =>
      UNIT_ROLE_IDS_V7.filter(
        (id) => effectiveRoleRuleV7(id, "ICE_FOLK").technology === tech,
      ).map((id) => effectiveRoleRuleV7(id, "ICE_FOLK").label);
    expect(role("SCOUTING")).toEqual(["Sled"]);
    expect(role("MARKSMANSHIP")).toEqual(["Snow Hunter"]);
    expect(role("FORTIFICATION")).toEqual(["Musk Ox"]);
    expect(role("METALLURGY")).toEqual(["Mammoth"]);
    expect(role("ADMINISTRATION")).toEqual(["Ice Witch"]);
    expect(role("SAWMILLING")).toEqual(["Boulder Yeti"]);
    expect(role("CHIVALRY")).toEqual(["Sabretooth"]);
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 0));
    const text = (tech: string) =>
      technologyEffectGroupsV7(
        tree.nodes.find((item) => item.id === tech)?.effects ?? [],
        tree.faction,
      ).flatMap((group) => group.items);
    expect(text("FORTIFICATION").join()).toContain("Snow spreads");
    expect(text("EXPLOSIVES").join()).toContain("Shatter at 4 HP or less");
    expect(text("ADMINISTRATION").join()).toContain("Cold Snap");
    expect(technologyNameV7("FORTIFICATION", "ICE_FOLK")).toBe("Deep Winter");
    expect(technologyNameV7("EXPLOSIVES", "ICE_FOLK")).toBe("Brittle");
    // The frozen sea (naval branch section 2.2): the five Naval names.
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyNameV7(tech, "ICE_FOLK")),
    ).toEqual(["Rime", "Pack Ice", "Icebound", "Black Ice", "Glacier"]);
    for (const tech of TECHNOLOGY_IDS_V7)
      if (
        tech !== "FORTIFICATION" &&
        tech !== "EXPLOSIVES" &&
        SHARED_BASELINE_NODES_V7.find((node) => node.id === tech)?.branch !==
          "NAVAL" &&
        // The ninth unit (7r55): the nodes named for their unit.
        !Object.hasOwn(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.ICE_FOLK, tech)
      )
        expect(technologyNameV7(tech, "ICE_FOLK")).toBe(
          technologyNameV7(tech, "ORIGINAL"),
        );
  });
});

describe("Ice Folk starting units and substitutions (section 10.12)", () => {
  it("starts an Ice Folk seat with one Yeti at full HP, 3 Coins, and no technology", () => {
    for (const [seed, mapType, factions] of [
      [3, "PANGEA", ["ICE_FOLK", "ORIGINAL"]],
      [9, "LAKES", ["ICE_FOLK", "ICE_FOLK"]],
      [11, "CONTINENTS", ["UNDEAD", "ICE_FOLK", "MARTIAN", "GOBLIN"]],
    ] as const) {
      const initial = createInitialMapStateV7({
        ...goblinSetupV7(factions, seed),
        mapType,
      });
      if (!initial.ok) throw new Error(initial.error.code);
      const { state } = initial;
      factions.forEach((faction, seat) => {
        if (faction !== "ICE_FOLK") return;
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
          hp: 9,
          maxHp: 9,
        });
        expect(unitRoleRuleV7(state, must(own[0])).label).toBe("Yeti");
      });
      expect(state.frozen).toEqual([]);
    }
  });

  it("grants one exhausted Yeti for Militia and a Frost Giant for the level-5 reward", () => {
    const militia = rewardStateV7("MILITIA", "ICE_FOLK");
    const militiaCity = cityOfV7(militia.state, 0);
    const militiaResult = applyOkV7(
      militia.state,
      militia.state.humanPlayerId,
      militia.command,
    );
    const yetis = newUnitsV7(militia.state, militiaResult.state);
    expect(yetis).toHaveLength(1);
    expect(yetis[0]).toMatchObject({
      role: "FIGHTER",
      at: militiaCity.at,
      hp: 9,
      activation: { moved: true, attacked: true, handled: true },
    });
    const giant = rewardStateV7("JUGGERNAUT", "ICE_FOLK");
    const giantResult = applyOkV7(
      giant.state,
      giant.state.humanPlayerId,
      giant.command,
    );
    const created = newUnitsV7(giant.state, giantResult.state);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ role: "JUGGERNAUT", hp: 36, maxHp: 36 });
    expect(unitRoleRuleV7(giantResult.state, must(created[0])).label).toBe(
      "Frost Giant",
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
      // No technology: a level-1 capital holds 2 slots.
      const arena = iceFieldV7(
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

    it("spawns a Sled when a city has a free slot, keeping the KNIGHT literal", () => {
      const { before, after, events } = treasure([]);
      const event = events.find((item) => item.kind === "TREASURE_CAPTURED");
      expect(event).toMatchObject({
        requestedReward: "KNIGHT",
        grantedReward: "KNIGHT",
        knightFallback: false,
      });
      const created = newUnitsV7(before, after);
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ role: "RAIDER", hp: 10, maxHp: 10 });
      expect(unitRoleRuleV7(after, must(created[0])).label).toBe("Sled");
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

describe("Ice Folk Showcase (section 2.4)", () => {
  it("gives an Ice Folk seat the ten roster units on the same tiles, homes, and IDs", () => {
    const create = (factions: readonly FactionIdV7[]) => {
      const created = createInitialMapStateV7(showcase(factions));
      if (!created.ok) throw new Error(created.error.code);
      return created.state;
    };
    const state = create(["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    const reference = create(["ORIGINAL", "ORIGINAL", "UNDEAD", "GOBLIN"]);
    expect(state.board).toEqual(reference.board);
    expect(state.cities).toEqual(reference.cities);
    const iceId = seatIdV7(state, 0);
    // The ninth unit (7r55): the Mammoth stands where it stood (the
    // defender's tile, as the heavy role) and the Musk Ox on the ninth
    // unit's tile (`showcaseUnitRoleV7`).
    const shape = (source: GameStateV7) =>
      source.units.map((unit) => [
        unit.id,
        unit.ownerId,
        source !== state && unit.ownerId === iceId
          ? showcaseUnitRoleV7(unit.role, "ICE_FOLK")
          : unit.role,
        unit.form,
        unit.at,
        unit.homeCityId,
      ]);
    // The frozen sea (naval branch section 3.3): an Ice Folk seat has no
    // ship; the IDs of its three boats stay unused.
    expect(shape(state)).toEqual(
      shape(reference).filter(
        ([, ownerId, , form]) => !(ownerId === iceId && form === "NAVAL"),
      ),
    );
    const own = state.units.filter((unit) => unit.ownerId === iceId);
    expect(own.map((unit) => unit.role)).toEqual(
      SHOWCASE_UNIT_TEMPLATES_V7.map((entry) => entry.role)
        .filter((role) => !isNavalRoleV7(role))
        .map((role) => showcaseUnitRoleV7(role, "ICE_FOLK")),
    );
    for (const unit of own)
      expect(unit.hp).toBe(effectiveRoleRuleV7(unit.role, "ICE_FOLK").maxHp);
    // No unit is Chilled at setup; every technology is researched.
    expect(state.frozen).toEqual([]);
    expect(
      state.players.find((player) => player.id === iceId)?.researchedTechs,
    ).toEqual(TECHNOLOGY_IDS_V7);
    // Capital 5 of 7, North 3 of 6, Coast 0 of 6 (every role one slot; the
    // Coast city is level 4 for the three boats an Ice Folk seat does not
    // have, naval branch section 3.3).
    expect(
      state.cities
        .filter((city) => city.ownerId === iceId)
        .map((city) => [
          assignedUnitCountV7(state, city.id),
          cityUnitCapacityV7(state, city),
        ]),
    ).toEqual([
      [5, 7],
      // (7r55: North also homes the Musk Ox.)
      [4, 6],
      [0, 6],
    ]);
    // 21: land trade pays 2 Coins (tuning 1, 7r46; 17 before) and since
    // tuning 3 the linked capital earns it too (19 before); 18 since
    // tuning 4 (land trade pays 1 Coin); 20 since the reward ladder rework
    // (`pulp_wars-zypi`: North's and Coast's Economic Miracle, +1 each).
    expect(playerIncomeV7(state, iceId).totalCoins).toBe(20);
  });

  it("every Ice Folk ability can be offered on the first turns, and every offered command is accepted", () => {
    const created = createPlayableGameV7(
      showcase(["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    const iceId = seatIdV7(state, 0);
    expect(state.turnOrder[state.activeSeatIndex]).toBe(iceId);
    const view = viewForV7(state, iceId);
    // Deep Winter: the capital's footprint and the neutral ring are Snow.
    const capital = must(
      state.cities.find((city) => city.ownerId === iceId && city.isCapital),
      "capital",
    );
    const snowAt = (where: CoordV7) =>
      view.board.tiles.find(
        (tile) => tile.at.x === where.x && tile.at.y === where.y,
      );
    expect(snowAt(capital.at)).toMatchObject({ snow: true });
    // The Yeti on the Walled capital center has fortification 2 and no Snow
    // cover; a unit on a neutral Snow row has cover.
    const yeti = must(
      state.units.find(
        (unit) => unit.ownerId === iceId && unit.role === "FIGHTER",
      ),
    );
    expect(publicUnitStatsV7(state, yeti).iceFolk).toMatchObject({
      onSnow: true,
      snowCover: false,
    });
    const offered = queryPlayerCommandsV7(view);
    for (const command of offered)
      expect(
        applyCommandV7(state, iceId, command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });
});

describe("Ice Folk public unit stats (section 11)", () => {
  it("carries frozen for every unit and the iceFolk block for units of an Ice Folk seat", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7) },
      { seat: 0, role: "CATAPULT", at: at(4, 3) },
      { seat: 0, role: "CAPTAIN", at: at(6, 3) },
      { seat: 0, role: "SWORDSMAN", at: at(6, 5) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 2),
        frozen: { turnsLeft: 1 },
      },
      { seat: 1, role: "MARKSMAN", at: at(1, 1) },
    ]);
    const stats = (where: CoordV7) =>
      publicUnitStatsV7(state, unitAtV7(state, where));
    expect(stats(at(5, 2)).frozen).toEqual({ turnsLeft: 1 });
    expect(stats(at(1, 1)).frozen).toBeNull();
    expect(stats(at(1, 1))).not.toHaveProperty("iceFolk");
    expect(stats(at(8, 7)).iceFolk).toEqual({
      onSnow: true,
      inBlizzard: false,
      snowCover: true,
      glides: true,
      mountainBorn: true,
      shatterThreshold: 4,
      rockfall: false,
      planted: null,
      sweepDamage: 0,
      blizzard: false,
      // The frozen sea (naval branch section 12).
      onIce: false,
      slides: true,
      iceCover: false,
    });
    expect(stats(at(4, 3)).iceFolk).toMatchObject({
      planted: true,
      mountainBorn: true,
      onSnow: false,
    });
    // The Witch's Blizzard: her tile and the eight around it.
    expect(stats(at(6, 3)).iceFolk).toMatchObject({
      blizzard: true,
      onSnow: true,
      inBlizzard: true,
      snowCover: true,
    });
    expect(stats(at(6, 5)).iceFolk).toMatchObject({ sweepDamage: 2 });
    // The Attack row lists Planted for an unmoved Boulder Yeti; the Defense
    // row lists Snow cover.
    expect(
      stats(at(4, 3))
        .stats.find((stat) => stat.id === "ATTACK")
        ?.modifiers.map((term) => term.source),
    ).toEqual(["PLANTED"]);
    expect(
      stats(at(8, 7))
        .stats.find((stat) => stat.id === "DEFENSE")
        ?.modifiers.map((term) => [term.source, term.sourceLabel]),
    ).toEqual([["SNOW", "Snow cover"]]);
  });
});
