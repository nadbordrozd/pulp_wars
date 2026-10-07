import { describe, expect, it } from "vitest";
import {
  CANDY_BASELINE_V1_NODES,
  CANDY_ROLE_MECHANICS_V7,
  CANDY_ROLE_RULES_V7,
  CRUMBS_TURNS_V7,
  FACTION_IDS_V7,
  HOME_SWEET_HOME_RADIUS_V7,
  MILITIA_FIGHTERS_V7,
  MIND_CONTROLLED_LOST_ABILITIES_V7,
  SHARED_BASELINE_NODES_V7,
  ORIGINAL_ROLE_RULES_V7,
  PEPPERMINT_DAMAGE_V7,
  RULESET_7,
  SHOWCASE_UNIT_TEMPLATES_V7,
  STARTING_FIGHTERS_V7,
  SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
  SUGAR_RUSH_ATTACK2_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  SUGAR_TOSS_HEAL_V7,
  SUGAR_TOSS_RANGE_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  achievementProgressV7,
  applyCommandV7,
  createPlayableGameV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  isLivingUnitV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  rebakeHpV7,
  rebakePriceV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  viewForV7,
  type CommandV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import { candyFieldV7 } from "../fixtures/v7-candy";
import { cityOfV7, newUnitsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { at } from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): registration, roster, technology,
// substitutions, the declared shapes, and the public unit stats
// (docs/product/RULESET_7_CANDY.md sections 2 to 4, 12.11, 12.15, 12.16, and
// 13). The identity is pinned in ruleset-v7-candy-identity.test.ts and the
// battle tables in ruleset-v7-candy-numbers.test.ts.

function must<T>(value: T | undefined, what = "value"): T {
  if (value === undefined) throw new Error(`${what} missing`);
  return value;
}

// label, role, technology, cost, HP, attack2, defense2, Move, minimum range,
// range, Sight, attack after Move, abilities
const ROSTER = [
  [
    "Toffee Trooper",
    "FIGHTER",
    null,
    2,
    10,
    4,
    4,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "SUGAR_RUSH"],
  ],
  [
    "Donut Racer",
    "RAIDER",
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
    ["ATTACK", "CAPTURE", "CHARGE", "SUGAR_RUSH"],
  ],
  [
    "Gumball Gunner",
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
    ["ATTACK", "CAPTURE", "SUGAR_RUSH", "SUGAR_TOSS"],
  ],
  [
    "Marshmallow",
    "GUARD",
    "FORTIFICATION",
    4,
    18,
    3,
    5,
    1,
    1,
    1,
    1,
    false,
    ["ATTACK", "CAPTURE", "SUGAR_RUSH", "BOUNCE"],
  ],
  [
    "Confectioner",
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
    ["ATTACK", "TEND_WOUNDED", "REBAKE", "SUGAR_RUSH"],
  ],
  [
    "Pie Launcher",
    "CATAPULT",
    "SAWMILLING",
    8,
    10,
    6,
    1,
    1,
    2,
    3,
    1,
    false,
    ["ATTACK", "SUGAR_RUSH", "SPLAT"],
  ],
  [
    "Chocolate Bunny",
    "KNIGHT",
    "CHIVALRY",
    9,
    14,
    6,
    3,
    2,
    1,
    1,
    1,
    true,
    ["ATTACK", "SUGAR_RUSH"],
  ],
  [
    "Gingerbread Giant",
    "JUGGERNAUT",
    null,
    null,
    40,
    8,
    7,
    1,
    1,
    1,
    1,
    true,
    ["ATTACK", "CAPTURE", "PUSH", "SUGAR_RUSH", "BOUNCE"],
  ],
] as const;

const LAND_ROLES = UNIT_ROLE_IDS_V7.slice(0, 8);
const TRAINABLE = LAND_ROLES.filter((role) => role !== "JUGGERNAUT");

describe("Candy registration (sections 2 and 13)", () => {
  it("registers the faction rules, the starting and Militia counts, and the constants", () => {
    expect(RULESET_7.factionTrees.CANDY.roleRules).toBe(CANDY_ROLE_RULES_V7);
    expect(factionRulesV7("CANDY")).toEqual({
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    });
    expect([STARTING_FIGHTERS_V7.CANDY, MILITIA_FIGHTERS_V7.CANDY]).toEqual([
      1, 1,
    ]);
    expect([
      SUGAR_RUSH_MOVE_BONUS_V7,
      SUGAR_RUSH_ATTACK2_V7,
      HOME_SWEET_HOME_RADIUS_V7,
      CRUMBS_TURNS_V7,
      PEPPERMINT_DAMAGE_V7,
      SUGAR_TOSS_HEAL_V7,
      SUGAR_TOSS_RANGE_V7,
      SUGAR_FRENZY_MAX_CONTINUATIONS_V7,
    ]).toEqual([1, 2, 1, 3, 3, 2, 2, 2]);
    expect(MIND_CONTROLLED_LOST_ABILITIES_V7).toContain("REBAKE");
  });

  it("parses the three commands and the seven events strictly", () => {
    const commands: readonly CommandV7[] = [
      { kind: "SUGAR_RUSH", unitId: 5 as never },
      { kind: "REBAKE", unitId: 5 as never, at: at(3, 3) },
      { kind: "SUGAR_TOSS", unitId: 5 as never, targetUnitId: 6 as never },
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
    expect(parseCommandV7({ kind: "REBAKE", unitId: 5 }).ok).toBe(false);
    expect(parseCommandV7({ kind: "SUGAR_TOSS", unitId: 5 }).ok).toBe(false);
    const valid: readonly unknown[] = [
      {
        kind: "UNITS_CRASHED",
        playerId: 1,
        crashedUnitIds: [5, 7],
        sparedUnitIds: [],
      },
      {
        kind: "UNITS_CRASHED",
        playerId: 1,
        crashedUnitIds: [],
        sparedUnitIds: [6],
      },
      { kind: "CRUMBS_STALE", playerId: 1, tiles: [at(4, 2), at(1, 3)] },
      {
        kind: "UNIT_REBAKED",
        playerId: 1,
        unitId: 5,
        rebakedUnitId: 9,
        role: "KNIGHT",
        at: at(3, 3),
        cityId: 2,
        cost: 5,
        hp: 7,
      },
      { kind: "UNIT_SUGAR_RUSHED", playerId: 1, unitId: 5, move: 2 },
      {
        kind: "SUGAR_TOSSED",
        playerId: 1,
        unitId: 5,
        targetUnitId: 6,
        amount: 2,
        hpAfter: 7,
      },
      {
        kind: "CRUMBS_EATEN",
        playerId: 1,
        at: at(3, 3),
        role: "FIGHTER",
        unitId: 8,
        damage: 3,
        shieldDamage: 0,
        dies: false,
      },
      { kind: "CRUMBS_LEFT", playerId: 1, at: at(3, 3), role: "FIGHTER" },
      { kind: "UNIT_DIED", unitId: 5, cause: "PEPPERMINT" },
    ];
    for (const event of valid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(true);
    const invalid: readonly unknown[] = [
      { kind: "UNIT_SUGAR_RUSHED", playerId: 1, unitId: 5, move: 2, extra: 1 },
      // Unsorted unit IDs, a unit in both lists, and an empty event.
      {
        kind: "UNITS_CRASHED",
        playerId: 1,
        crashedUnitIds: [7, 5],
        sparedUnitIds: [],
      },
      {
        kind: "UNITS_CRASHED",
        playerId: 1,
        crashedUnitIds: [],
        sparedUnitIds: [],
      },
      // Unsorted tiles, no tile.
      { kind: "CRUMBS_STALE", playerId: 1, tiles: [at(1, 3), at(4, 2)] },
      { kind: "CRUMBS_STALE", playerId: 1, tiles: [] },
      // The Golem and a boat leave no Crumbs.
      { kind: "CRUMBS_LEFT", playerId: 1, at: at(3, 3), role: "JUGGERNAUT" },
      { kind: "CRUMBS_LEFT", playerId: 1, at: at(3, 3), role: "PATROL_BOAT" },
      { kind: "UNIT_DIED", unitId: 5, cause: "CRUMBS" },
    ];
    for (const event of invalid)
      expect(parseEventV7(event).ok, JSON.stringify(event)).toBe(false);
  });

  it("binds a Candy seat to its tree in state, view, and leaderboard", () => {
    const created = createPlayableGameV7(goblinSetupV7(["ORIGINAL", "CANDY"]));
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(
      state.players.map((player) => [player.faction, player.factionTreeId]),
    ).toEqual([
      ["ORIGINAL", "ORIGINAL_BASELINE_V5"],
      ["CANDY", "CANDY_BASELINE_V1"],
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
    expect([tree.id, tree.faction]).toEqual(["CANDY_BASELINE_V1", "CANDY"]);
    const view = viewForV7(state, seatIdV7(state, 0));
    expect(view.players.map((player) => player.faction)).toEqual([
      "ORIGINAL",
      "CANDY",
    ]);
    expect(view.leaderboard.map((entry) => entry.faction).sort()).toEqual([
      "CANDY",
      "ORIGINAL",
    ]);
    expect([
      view.sugarRush,
      view.crumbs,
      view.splattedThisTurn,
      view.tossedThisTurn,
    ]).toEqual([[], [], [], []]);
  });
});

describe("Candy roster (section 3)", () => {
  it("registers every value of the section 3 table", () => {
    expect(ROSTER.map((row) => row[1])).toEqual(LAND_ROLES);
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
    ] of ROSTER) {
      expect(effectiveRoleRuleV7(role, "CANDY"), label).toEqual({
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
      expect(roleMechanicsV7(role, "CANDY"), label).toMatchObject({
        capacitySlots: 1,
        shield: 0,
        buildsFieldDefense: false,
        construct: false,
        movementMode: "GROUND",
        advancesAfterKill: role !== "CATAPULT",
        leavesCrumbs: role !== "JUGGERNAUT",
        rushPerk:
          role === "RAIDER"
            ? "ESCAPE"
            : role === "KNIGHT"
              ? "SUGAR_FRENZY"
              : null,
      });
      expect(CANDY_ROLE_MECHANICS_V7[role]).toBe(
        roleMechanicsV7(role, "CANDY"),
      );
    }
    // The boats are the Human boats: no Candy rule applies to them.
    for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
      expect(effectiveRoleRuleV7(role, "CANDY")).toEqual(
        effectiveRoleRuleV7(role, "ORIGINAL"),
      );
      expect(roleMechanicsV7(role, "CANDY")).toMatchObject({
        leavesCrumbs: false,
        rushPerk: null,
      });
      expect(effectiveRoleRuleV7(role, "CANDY").abilities).not.toContain(
        "SUGAR_RUSH",
      );
    }
  });

  it("no other faction has a Candy ability or mechanic", () => {
    const candyAbilities = ["SUGAR_RUSH", "BOUNCE", "SPLAT", "REBAKE"];
    for (const faction of FACTION_IDS_V7.filter((id) => id !== "CANDY"))
      for (const role of UNIT_ROLE_IDS_V7) {
        expect(
          roleMechanicsV7(role, faction),
          `${faction} ${role}`,
        ).toMatchObject({ rushPerk: null, leavesCrumbs: false });
        expect(
          effectiveRoleRuleV7(role, faction).abilities.filter(
            (ability) =>
              candyAbilities.includes(ability) || ability === "SUGAR_TOSS",
          ),
        ).toEqual([]);
      }
  });

  it("every Candy unit is living", () => {
    const state = candyFieldV7(
      LAND_ROLES.map((role, index) => ({
        seat: 0,
        role,
        at: at(1 + index, 2),
      })),
    );
    for (const unit of state.units)
      expect(isLivingUnitV7(state, unit), unit.role).toBe(true);
  });

  it("has the Re-bake prices and HP of the section 3 table", () => {
    expect(
      UNIT_ROLE_IDS_V7.map((role) => [
        role,
        rebakePriceV7(role),
        rebakeHpV7(role),
      ]).filter(([, price]) => price !== null),
    ).toEqual([
      ["FIGHTER", 1, 5],
      ["RAIDER", 2, 5],
      ["MARKSMAN", 2, 4],
      ["GUARD", 2, 9],
      ["CAPTAIN", 3, 5],
      ["CATAPULT", 4, 5],
      ["KNIGHT", 5, 7],
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the Jawbreaker, half of
      // its 6 Coins and half of its 16 HP.
      ["SWORDSMAN", 3, 8],
    ]);
  });

  it("trains every Candy land unit except the Golem on the city center", () => {
    for (const [, role, , cost, maxHp] of ROSTER) {
      const state = goblinArenaV7(
        ["CANDY", "ORIGINAL"],
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
      // A fresh unit cannot Rush (it is exhausted).
      expect(
        offeredV7(result.state, "SUGAR_RUSH").some(
          (rush) => "unitId" in rush && rush.unitId === trained[0]?.id,
        ),
      ).toBe(false);
    }
  });

  it("never offers Field Defense or Rally to a Candy seat, and a Chocolate Bunny that is not Rushed has no Overrun", () => {
    const state = candyFieldV7([
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
    const bear = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
    ]);
    const killed = playV7(bear, {
      kind: "ATTACK",
      unitId: unitAtV7(bear, at(4, 3)).id,
      targetUnitId: unitAtV7(bear, at(5, 3)).id,
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

  it("refunds half the printed cost on Disband, Crashed or not, and never disbands a Golem", () => {
    for (const [role, refund] of [
      ["FIGHTER", 1],
      ["RAIDER", 1],
      ["MARKSMAN", 1],
      ["GUARD", 2],
      ["CAPTAIN", 2],
      ["CATAPULT", 4],
      ["KNIGHT", 4],
    ] as const)
      for (const rush of [undefined, "CRASHED"] as const) {
        const state = candyFieldV7([
          { seat: 0, role, at: at(4, 3), ...(rush ? { rush } : {}) },
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
        // The entry goes with the unit, and a Disband leaves no Crumbs.
        expect([result.state.sugarRush, result.state.crumbs]).toEqual([[], []]);
      }
    const state = candyFieldV7([
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

  it("counts the Candy trainable roles on the board for Muster", () => {
    const state = candyFieldV7([
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

  it("has the Candy Showcase roster: one unit per role", () => {
    // (Every role: the heavy line role is every faction's since 7r55.)
    expect(SHOWCASE_UNIT_TEMPLATES_V7.map((entry) => entry.role)).toEqual(
      UNIT_ROLE_IDS_V7,
    );
    expect(TRAINABLE).toHaveLength(7);
  });
});

describe("Candy technology (section 4)", () => {
  it("differs from the Human graph in four unlock entries and two display names", () => {
    expect(CANDY_BASELINE_V1_NODES).toHaveLength(
      SHARED_BASELINE_NODES_V7.length,
    );
    SHARED_BASELINE_NODES_V7.forEach((human, index) => {
      const candy = must(CANDY_BASELINE_V1_NODES[index], "node");
      expect([
        candy.id,
        candy.branch,
        candy.tier,
        candy.prerequisites,
        candy.unlockedRoles,
      ]).toEqual([
        human.id,
        human.branch,
        human.tier,
        human.prerequisites,
        human.unlockedRoles,
      ]);
      if (human.id === "ADMINISTRATION")
        expect(candy.unlocks).toEqual(
          human.unlocks.map((unlock) =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? { kind: "CONFECTIONER_SUPPORT" }
              : unlock,
          ),
        );
      else if (human.id === "CHIVALRY")
        expect(candy.unlocks).toEqual(
          human.unlocks.filter((unlock) => unlock.kind !== "OVERRUN"),
        );
      else if (human.id === "FORTIFICATION")
        expect(candy.unlocks).toEqual([
          { kind: "HOME_SWEET_HOME" },
          // The Industry reshuffle (7r56): the defender is here.
          { kind: "UNIT_ROLE", role: "GUARD" },
        ]);
      else if (human.id === "EXPLOSIVES")
        expect(candy.unlocks).toEqual([
          ...human.unlocks,
          { kind: "PEPPERMINT_SURPRISE" },
        ]);
      else expect(candy.unlocks).toEqual(human.unlocks);
    });
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7.CANDY).toEqual({
      FORTIFICATION: "Home Sweet Home",
      EXPLOSIVES: "Peppermint Surprise",
      // The ninth unit (7r55): the nodes named for their unit.
      MARKSMANSHIP: "Gumball Gunners",
      SAWMILLING: "Pie Launchers",
      CHIVALRY: "Chocolate Bunnies",
      METALLURGY: "Jawbreakers",
    });
    expect(technologyNameV7("FORTIFICATION", "CANDY")).toBe("Home Sweet Home");
    expect(technologyNameV7("EXPLOSIVES", "CANDY")).toBe("Peppermint Surprise");
    expect(technologyNameV7("FORTIFICATION", "ORIGINAL")).toBe("Fortification");
  });

  it("reads the two effects through capabilities, never a raw technology test", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    expect(
      FACTION_IDS_V7.map((faction) => {
        const capabilities = technologyCapabilitiesV7(all, faction);
        return [faction, capabilities.homeSweetHome, capabilities.crumbsBite];
      }),
    ).toEqual([
      ["ORIGINAL", false, 0],
      ["UNDEAD", false, 0],
      ["GOBLIN", false, 0],
      ["DINOSAUR", false, 0],
      ["MARTIAN", false, 0],
      ["ICE_FOLK", false, 0],
      ["DWARF", false, 0],
      ["CANDY", true, 3],
    ]);
    const some = (...techs: (typeof TECHNOLOGY_IDS_V7)[number][]) =>
      technologyCapabilitiesV7(techs, "CANDY");
    expect(some()).toMatchObject({ homeSweetHome: false, crumbsBite: 0 });
    expect(some("DRILL", "FORTIFICATION")).toMatchObject({
      homeSweetHome: true,
      crumbsBite: 0,
    });
    expect(some("DRILL", "FORTIFICATION", "EXPLOSIVES")).toMatchObject({
      homeSweetHome: true,
      crumbsBite: 3,
    });
    const candy = technologyCapabilitiesV7(all, "CANDY");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    // (The ninth unit, 7r55: every faction has the heavy line role.)
    expect(candy.trainableRoles).toEqual(human.trainableRoles);
    expect(candy.commands).toEqual(
      human.commands.filter((command) => command !== "BUILD_FIELD_DEFENSE"),
    );
    expect(candy.commands).toContain("BLAST_MOUNTAIN");
  });

  it("every technology keeps a live unlock for a Candy seat, with the viewer's unlock text", () => {
    for (const node of CANDY_BASELINE_V1_NODES)
      expect(
        node.unlocks.length + node.unlockedRoles.length,
        node.id,
      ).toBeGreaterThan(0);
    const role = (tech: string) =>
      UNIT_ROLE_IDS_V7.filter(
        (id) => effectiveRoleRuleV7(id, "CANDY").technology === tech,
      ).map((id) => effectiveRoleRuleV7(id, "CANDY").label);
    expect(role("SCOUTING")).toEqual(["Donut Racer"]);
    expect(role("MARKSMANSHIP")).toEqual(["Gumball Gunner"]);
    expect(role("FORTIFICATION")).toEqual(["Marshmallow"]);
    expect(role("ADMINISTRATION")).toEqual(["Confectioner"]);
    expect(role("SAWMILLING")).toEqual(["Pie Launcher"]);
    expect(role("CHIVALRY")).toEqual(["Chocolate Bunny"]);
    const state = candyFieldV7([
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
        .join("; ");
    expect(text("FORTIFICATION")).toContain("Crash");
    expect(text("FORTIFICATION")).not.toContain("Field Defense");
    expect(text("EXPLOSIVES")).toContain("Crumbs");
    expect(text("ADMINISTRATION")).toContain("Frost");
    expect(text("ADMINISTRATION")).toContain("Re-bake");
    expect(text("ADMINISTRATION")).not.toContain("Rally");
    expect(text("CHIVALRY")).not.toContain("Overrun");
  });
});

describe("Candy public unit stats (section 13)", () => {
  it("carries the four flags and the candy block", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3), rush: "RUSHED" },
        { seat: 0, role: "RAIDER", at: at(5, 3), rush: "CRASHED" },
        { seat: 0, role: "MARKSMAN", at: at(6, 3), hp: 5, tossed: true },
        { seat: 0, role: "GUARD", at: at(4, 4) },
        { seat: 0, role: "CAPTAIN", at: at(5, 4) },
        { seat: 0, role: "CATAPULT", at: at(6, 4) },
        { seat: 0, role: "KNIGHT", at: at(4, 5) },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 5) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), splatted: true },
      ],
      { techs: { 0: ["DRILL", "FORTIFICATION"] } },
    );
    const view = viewForV7(state, seatIdV7(state, 1));
    const stats = (where: { x: number; y: number }) =>
      must(
        view.unitStats.find(
          (entry) => entry.unitId === unitAtV7(state, where).id,
        ),
        "stats",
      );
    // The view's stats are the canonical ones.
    expect(stats(at(4, 3))).toEqual(
      publicUnitStatsV7(state, unitAtV7(state, at(4, 3))),
    );
    expect(stats(at(4, 3))).toMatchObject({
      rushed: true,
      crashed: false,
      splatted: false,
      tossedThisTurn: false,
      candy: {
        sugarRush: true,
        rushPerk: null,
        bounces: false,
        splats: false,
        rebake: { cost: 1, hp: 5 },
        homeSweetHome: true,
        crumbsBite: 0,
      },
    });
    expect(stats(at(5, 3))).toMatchObject({
      rushed: false,
      crashed: true,
      candy: { rushPerk: "ESCAPE", rebake: { cost: 2, hp: 5 } },
    });
    expect(stats(at(6, 3))).toMatchObject({ tossedThisTurn: true });
    expect(stats(at(4, 4)).candy).toMatchObject({
      bounces: true,
      rebake: { cost: 2, hp: 9 },
    });
    expect(stats(at(6, 4)).candy).toMatchObject({ splats: true });
    expect(stats(at(4, 5)).candy).toMatchObject({ rushPerk: "SUGAR_FRENZY" });
    expect(stats(at(6, 5)).candy).toMatchObject({
      bounces: true,
      rebake: null,
    });
    // A unit of another kind has the flags and no block.
    expect(stats(at(5, 2))).toMatchObject({ splatted: true, rushed: false });
    expect(stats(at(5, 2)).candy).toBeUndefined();
    // A match without a Candy seat has neither the flags nor the block.
    const other = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const plain = publicUnitStatsV7(other, unitAtV7(other, at(4, 3)));
    for (const key of [
      "rushed",
      "crashed",
      "splatted",
      "tossedThisTurn",
      "candy",
    ])
      expect(key in plain, key).toBe(false);
  });

  it("starts a Golem reward and a treasure Donut Racer from the registration", () => {
    const roles = (role: UnitRoleIdV7) => effectiveRoleRuleV7(role, "CANDY");
    expect(roles(factionRulesV7("CANDY").treasureUnitRole).label).toBe(
      "Donut Racer",
    );
    expect(roles("JUGGERNAUT").cost).toBeNull();
  });
});
