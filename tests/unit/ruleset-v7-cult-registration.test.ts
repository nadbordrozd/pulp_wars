import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7, inspectNormalArmyV7 } from "../../src/ai/v7";
import { ARMY_PLAY_FACTIONS_V7 } from "../../src/ai/v7-army";
import {
  CULT_BASELINE_V1_TREE,
  CULT_ROLE_MECHANICS_V7,
  CULT_ROLE_RULES_V7,
  CULT_SUMMONED_ROLE_RULES_V7,
  FACTION_DISPLAY_NAMES_V7,
  FACTION_IDS_V7,
  FACTION_RULES_V7,
  FACTION_TREES_V7,
  FACTION_TREE_IDS_V7,
  HERALD_CONTROL_V7,
  HERALD_FAVOUR_COST_V7,
  HIDDEN_FACTION_IDS_V7,
  HORROR_CONTROL_V7,
  HORROR_FAVOUR_COST_V7,
  MAP_GENERATION_REVISION_V7,
  MILITIA_FIGHTERS_V7,
  NAVAL_ROLE_IDS_V7,
  OFFERED_FACTION_IDS_V7,
  ORIGINAL_ROLE_RULES_V7,
  PRIOR_RULESET_7_IDS,
  REWARD_UNIT_LEVEL_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SHARED_BASELINE_NODES_V7,
  STARTING_FIGHTERS_V7,
  SUMMONED_ROLE_IDS_V7,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  allowedBoardSizesV7,
  applyCommandV7,
  assertRuleset7Registry,
  autoBoardSizeV7,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  distinctFactionsV7,
  effectiveRoleRuleV7,
  factionRulesV7,
  factionTreeIdV7,
  factionUnlocksRoleV7,
  isLivingUnitV7,
  maxSeatCountV7,
  maxSeatsV7,
  parseGameStateV7,
  parseMatchSetupV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  seatCapacityV7,
  summonedRoleRuleV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  treasureUnitRoleForRoundV7,
  unitFactionV7,
  unitRoleRuleV7,
  validateMatchSetupV7,
  viewForV7,
  type BoardSizeV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type MapTypeV7,
  type MatchSetupV7,
  type NavalRoleIdV7,
  type SummonedRoleIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
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
import { at, attackV7, fieldV7, movedV7 } from "../fixtures/v7-revision20";

/**
 * The Cultists of the Ancient Ones, engine bead E1 (`pulp_wars-mch9.3`,
 * docs/product/RULESET_7_CULTISTS.md sections 4, 11, 17.8, and 19): the
 * ninth faction is REGISTERED. It has its nine land roles with the spec's
 * numbers, the IDs and numbers of its three summoned units, its tree and
 * its names, its start and its rewards, and a match may seat nine players.
 * None of its own rules exists yet (Favour, Sacrifice, the channel, the
 * rituals, the hexes: beads E2 to E6), the browser does not offer it, and
 * the Normal AI plays a Cult seat by its older, faction-neutral policy
 * (bead A1 puts it on the army policy).
 *
 * Every state here is built by hand or by map generation; no match is
 * played.
 */

type LandRole = Exclude<UnitRoleIdV7, NavalRoleIdV7>;
const LAND_ROLES = UNIT_ROLE_IDS_V7.filter(
  (role): role is LandRole =>
    !(NAVAL_ROLE_IDS_V7 as readonly string[]).includes(role),
);

function playable(setup: MatchSetupV7): GameStateV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function generatedSetup(
  mapType: MapTypeV7,
  size: BoardSizeV7,
  factions: readonly FactionIdV7[],
  seed = 7,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  };
}

describe("the Cult registration: identity", () => {
  // The Cult's Favour (`pulp_wars-mch9.4`) took 7r72, the AI head start
  // (`pulp_wars-w49.39`) 7r73, and the Cult's channel (`pulp_wars-mch9.5`)
  // 7r74, and the Cult's Unbound (`pulp_wars-mch9.6`) 7r75, so 7r71 is a
  // prior identity.
  it("was 7r71 after 7r70, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r76");
    expect(PRIOR_RULESET_7_IDS.slice(-6, -4)).toEqual([
      "pulp-wars-poc-7r70",
      "pulp-wars-poc-7r71",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r76.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-6, -4)).toEqual([
      "pulpWars.save.v7r70.current",
      "pulpWars.save.v7r71.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("rejects a 7r70 setup, state, and save without migration", () => {
    const setup = goblinSetupV7(["CULT", "ORIGINAL"]);
    const state = playable(setup);
    const oldSetup = { ...setup, rulesetId: "pulp-wars-poc-7r70" };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r70",
        setup: oldSetup,
      }),
    ).toBeNull();
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-10T12:00:00.000Z",
    );
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: "pulp-wars-poc-7r70",
          setup: oldSetup,
          state: { ...save.state, rulesetId: "pulp-wars-poc-7r70" },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });
});

describe("the Cult registration: the ninth faction", () => {
  it("is the last faction, bound to its tree and shown as Cultists", () => {
    expect(FACTION_IDS_V7).toHaveLength(9);
    expect(FACTION_IDS_V7.at(-1)).toBe("CULT");
    expect(FACTION_IDS_V7.indexOf("CANDY")).toBe(7);
    expect(FACTION_TREE_IDS_V7.at(-1)).toBe("CULT_BASELINE_V1");
    expect(factionTreeIdV7("CULT")).toBe("CULT_BASELINE_V1");
    expect(FACTION_TREES_V7.CULT).toBe(CULT_BASELINE_V1_TREE);
    expect(CULT_BASELINE_V1_TREE.roleRules).toBe(CULT_ROLE_RULES_V7);
    expect(CULT_BASELINE_V1_TREE.roleMechanics).toBe(CULT_ROLE_MECHANICS_V7);
    expect(CULT_BASELINE_V1_TREE.startingTechIds).toEqual([]);
    expect(FACTION_DISPLAY_NAMES_V7.CULT).toBe("Cultists");
    expect(() => assertRuleset7Registry()).not.toThrow();
  });

  it("has no faction-wide rule of another faction, and a Familiar in a chest", () => {
    expect(FACTION_RULES_V7.CULT).toEqual({
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    });
    expect(factionRulesV7("CULT")).toBe(FACTION_RULES_V7.CULT);
    // The Familiar's technology is tier 1, so every round's chest gives it.
    for (const round of [1, 14, 15, 30])
      expect(treasureUnitRoleForRoundV7("CULT", round)).toBe("RAIDER");
  });

  it("is hidden from the browser: every other faction is offered, in order", () => {
    expect(HIDDEN_FACTION_IDS_V7).toEqual(["CULT"]);
    expect(OFFERED_FACTION_IDS_V7).toEqual(
      FACTION_IDS_V7.filter((faction) => faction !== "CULT"),
    );
    expect(OFFERED_FACTION_IDS_V7).toHaveLength(8);
  });
});

/**
 * Section 4.1, in the spec's whole units: cost, HP, Attack, Defense, Move,
 * range (minimum to maximum), Sight, technology, and whether it may use its
 * action after a Move.
 */
const ROSTER: Readonly<
  Record<
    LandRole,
    readonly [
      label: string,
      cost: number | null,
      hp: number,
      attack: number,
      defense: number,
      move: number,
      range: readonly [number, number],
      sight: number,
      technology: TechnologyIdV7 | null,
      afterMove: boolean,
    ]
  >
> = {
  FIGHTER: ["Initiate", 2, 10, 2, 1.5, 1, [1, 1], 1, null, true],
  GUARD: ["Idol Bearer", 3, 16, 1.5, 2.5, 1, [1, 1], 1, "FORTIFICATION", false],
  RAIDER: ["Familiar", 3, 8, 2, 1, 2, [1, 1], 2, "SCOUTING", true],
  MARKSMAN: ["Hexer", 4, 9, 2, 1, 1, [1, 2], 1, "MARKSMANSHIP", true],
  CAPTAIN: ["Summoner", 5, 10, 1, 1, 1, [1, 1], 1, "ADMINISTRATION", true],
  // "No attack of its own": Attack 0 and no reach.
  CATAPULT: ["Stargazer", 8, 10, 0, 0.5, 1, [1, 0], 1, "SAWMILLING", false],
  KNIGHT: ["Caller", 8, 12, 2.5, 1, 2, [1, 1], 1, "CHIVALRY", true],
  SWORDSMAN: ["Chosen", 6, 15, 3.5, 2, 1, [1, 1], 1, "METALLURGY", true],
  JUGGERNAUT: [
    "Thing in the Cellar",
    null,
    40,
    4,
    3.5,
    1,
    [1, 1],
    1,
    null,
    true,
  ],
};

describe("the Cult registration: the nine land roles (section 4.1)", () => {
  it("gives every land role the spec's name and numbers", () => {
    expect(LAND_ROLES).toHaveLength(9);
    for (const role of LAND_ROLES) {
      const rule = effectiveRoleRuleV7(role, "CULT");
      expect(
        [
          rule.label,
          rule.cost,
          rule.maxHp,
          rule.attack2 / 2,
          rule.defense2 / 2,
          rule.move,
          [rule.minimumRange, rule.range],
          rule.sightRadius,
          rule.technology,
          rule.mayUsePrimaryActionAfterMove,
        ],
        role,
      ).toEqual(ROSTER[role]);
      // A role ID means a job: the tactical label is the Human role's.
      expect(rule.tacticalRole, role).toBe(
        ORIGINAL_ROLE_RULES_V7[role].tacticalRole,
      );
      expect(rule.role).toBe(role);
    }
    expect(
      new Set(LAND_ROLES.map((role) => effectiveRoleRuleV7(role, "CULT").label))
        .size,
    ).toBe(9);
  });

  it("sails the shared ships", () => {
    for (const role of NAVAL_ROLE_IDS_V7) {
      expect(effectiveRoleRuleV7(role, "CULT")).toEqual(
        ORIGINAL_ROLE_RULES_V7[role],
      );
      expect(factionUnlocksRoleV7("CULT", role)).toBe(true);
    }
    expect(roleMechanicsV7("BATTLESHIP", "CULT").splash).toBe(true);
  });

  // The Summoner's Sacrifice and Seize and the Chosen's Martyr arrived
  // with the Favour bead (`pulp_wars-mch9.4`); Summon, Channel, Behold!,
  // and Anchor with the channel (`pulp_wars-mch9.5`).
  it("registers only the abilities that work today: no Cult rule is named before its bead", () => {
    const abilities = Object.fromEntries(
      LAND_ROLES.map((role) => [
        role,
        effectiveRoleRuleV7(role, "CULT").abilities,
      ]),
    );
    expect(abilities).toEqual({
      FIGHTER: ["ATTACK", "CAPTURE", "CHANNEL"],
      // Charge with Raiding; no Escape. The Familiar never channels.
      RAIDER: ["ATTACK", "CAPTURE", "CHARGE"],
      MARKSMAN: ["ATTACK", "CAPTURE", "CHANNEL"],
      GUARD: ["ATTACK", "CAPTURE", "CHANNEL", "BEHOLD"],
      // No Rally and no Tend Wounded; Sacrifice, Seize, and Summon.
      CAPTAIN: ["ATTACK", "CAPTURE", "SACRIFICE", "SEIZE", "SUMMON", "CHANNEL"],
      // No attack of its own.
      CATAPULT: ["CAPTURE", "CHANNEL"],
      // No Overrun.
      KNIGHT: ["ATTACK", "CAPTURE", "CHANNEL"],
      SWORDSMAN: ["ATTACK", "CAPTURE", "MARTYR", "CHANNEL"],
      // No Push; its signature is Anchor.
      JUGGERNAUT: ["ATTACK", "CAPTURE", "ANCHOR"],
    });
    // Every land unit captures (`pulp_wars-ke95`).
    for (const role of LAND_ROLES)
      expect(abilities[role], role).toContain("CAPTURE");
  });

  it("builds no Field Defense, keeps the Hexer and the Stargazer from advancing, and copies no other faction's mechanic", () => {
    const human = FACTION_TREES_V7.ORIGINAL.roleMechanics;
    for (const role of UNIT_ROLE_IDS_V7) {
      const mechanics = roleMechanicsV7(role, "CULT");
      expect(mechanics.buildsFieldDefense, role).toBe(false);
      expect(mechanics.advancesAfterKill, role).toBe(
        role !== "MARKSMAN" && role !== "CATAPULT",
      );
      // The Human Guard is open to ranged attacks, the Human Raider slips
      // past zones of control, and the Juggernaut crushes: not the Cult's.
      expect(mechanics.rangedDefense2, role).toBeNull();
      expect(mechanics.ignoresZocStops, role).toBe(false);
      expect(mechanics.crushDamage, role).toBe(0);
      // The Stargazer has no attack, so it wrecks no Field Defense by one.
      expect(mechanics.demolishesFieldDefense, role).toBe(false);
      // The Cult's own mechanics so far (`pulp_wars-mch9.4`): the robed
      // cultists and the Chosen's Martyr; and (`pulp_wars-mch9.5`) the
      // Thing's Anchor.
      expect(mechanics, role).toEqual({
        ...human[role],
        buildsFieldDefense: false,
        rangedDefense2: null,
        ignoresZocStops: false,
        crushDamage: 0,
        demolishesFieldDefense: false,
        robed: !["RAIDER", "JUGGERNAUT", ...NAVAL_ROLE_IDS_V7].includes(role),
        martyrFavour: role === "SWORDSMAN" ? 6 : 0,
        anchorStrands: role === "JUGGERNAUT" ? 2 : 0,
      });
      expect(mechanics.capacitySlots, role).toBe(1);
      expect(mechanics.movementMode, role).toBe("GROUND");
    }
  });

  it("counts every Cult unit as living, and as the Cult's kind", () => {
    const state = fieldV7(
      LAND_ROLES.map((role, index) => ({
        seat: 0,
        role,
        at: at(1 + index, 1),
      })),
      { factions: ["CULT", "ORIGINAL"] },
    );
    for (const unit of state.units) {
      expect(unitFactionV7(state, unit), unit.role).toBe("CULT");
      expect(isLivingUnitV7(state, unit), unit.role).toBe(true);
      expect(unitRoleRuleV7(state, unit).label, unit.role).toBe(
        ROSTER[unit.role as LandRole][0],
      );
    }
  });
});

describe("the Cult registration: the three summoned units (section 4.2)", () => {
  it("names them outside the unit roles, in the frozen order", () => {
    expect(SUMMONED_ROLE_IDS_V7).toEqual(["HORROR", "HERALD", "TENTACLE"]);
    for (const id of SUMMONED_ROLE_IDS_V7) {
      // Never trained, hired, found, or rewarded: no faction's role table
      // has a slot for it, the Cult's included.
      expect((UNIT_ROLE_IDS_V7 as readonly string[]).includes(id), id).toBe(
        false,
      );
      expect(Object.keys(CULT_ROLE_RULES_V7), id).not.toContain(id);
      expect(summonedRoleRuleV7(id).id).toBe(id);
    }
    expect(Object.keys(CULT_SUMMONED_ROLE_RULES_V7)).toEqual([
      ...SUMMONED_ROLE_IDS_V7,
    ]);
    expect(() => summonedRoleRuleV7("SPIDER" as SummonedRoleIdV7)).toThrow(
      RangeError,
    );
  });

  it("registers the spec's numbers: price, Control, HP, Attack, Defense, Move, value", () => {
    const row = (id: SummonedRoleIdV7) => {
      const rule = summonedRoleRuleV7(id);
      return [
        rule.label,
        rule.favourCost,
        rule.control,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        rule.value,
      ];
    };
    expect(row("HORROR")).toEqual(["Horror", 5, 1, 18, 4, 2, 2, 6]);
    expect(row("HERALD")).toEqual(["Herald", 20, 3, 60, 7, 4, 2, 24]);
    // Wild from birth: no price in Favour, no Control, worth nothing.
    expect(row("TENTACLE")).toEqual(["Tentacle", null, null, 8, 3, 1, 0, 0]);
    expect([HORROR_FAVOUR_COST_V7, HERALD_FAVOUR_COST_V7]).toEqual([5, 20]);
    expect([HORROR_CONTROL_V7, HERALD_CONTROL_V7]).toEqual([1, 3]);
    // A daemon moves like a Martian walker; the Tentacle is rooted.
    expect(summonedRoleRuleV7("HORROR").movementMode).toBe("STRIDE");
    expect(summonedRoleRuleV7("HERALD").movementMode).toBe("STRIDE");
    expect(summonedRoleRuleV7("TENTACLE").movementMode).toBe("GROUND");
    // The Herald is above every unit in the game (variance rule 1).
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const rule = effectiveRoleRuleV7(role, faction);
        const herald = summonedRoleRuleV7("HERALD");
        expect(herald.maxHp, `${faction} ${role}`).toBeGreaterThan(rule.maxHp);
      }
  });

  it("is a registry only: no state can hold a summoned unit yet", () => {
    const state = fieldV7([{ seat: 0, role: "FIGHTER", at: at(4, 4) }], {
      factions: ["CULT", "ORIGINAL"],
    });
    for (const role of SUMMONED_ROLE_IDS_V7)
      expect(
        parseGameStateV7({
          ...state,
          units: state.units.map((unit) => ({ ...unit, role })),
        }),
        role,
      ).toBeNull();
  });
});

describe("the Cult registration: the tree and its names (section 11)", () => {
  const unlocksOf = (tech: TechnologyIdV7): readonly string[] =>
    (
      CULT_BASELINE_V1_TREE.nodes.find((node) => node.id === tech)?.unlocks ??
      []
    ).map((unlock) =>
      unlock.kind === "COMMAND"
        ? unlock.command
        : unlock.kind === "UNIT_ROLE"
          ? `UNIT:${unlock.role}`
          : unlock.kind,
    );

  it("is the shared graph without Captain support, Overrun, and Field Defense", () => {
    expect(CULT_BASELINE_V1_TREE.nodes.map((node) => node.id)).toEqual(
      TECHNOLOGY_IDS_V7,
    );
    for (const [index, node] of CULT_BASELINE_V1_TREE.nodes.entries()) {
      const shared = SHARED_BASELINE_NODES_V7[index];
      expect([node.tier, node.branch, node.prerequisites], node.id).toEqual([
        shared?.tier,
        shared?.branch,
        shared?.prerequisites,
      ]);
      // `pulp_wars-mch9.4`: the Summoner's support stands where the
      // Captain's did, and Harvest Rites adds the Offering.
      expect(node.unlocks, node.id).toEqual([
        ...(shared?.unlocks ?? []).flatMap((unlock) =>
          unlock.kind === "CAPTAIN_SUPPORT"
            ? [{ kind: "SUMMONER_SUPPORT" }]
            : unlock.kind === "OVERRUN" ||
                (unlock.kind === "COMMAND" &&
                  unlock.command === "BUILD_FIELD_DEFENSE")
              ? []
              : [unlock],
        ),
        ...(node.id === "FARMING" ? [{ kind: "OFFERING" }] : []),
      ]);
    }
    // Leadership: the Summoner with its Sacrifice and Seize, the Market,
    // and Disband.
    expect(unlocksOf("ADMINISTRATION")).toEqual(
      expect.arrayContaining([
        "UNIT:CAPTAIN",
        "SUMMONER_SUPPORT",
        "BUILD_MARKET",
        "DISBAND",
      ]),
    );
    expect(unlocksOf("ADMINISTRATION")).toHaveLength(4);
    // Harvest Rites: the Farm and the Offering.
    expect(unlocksOf("FARMING")).toContain("OFFERING");
    // Callers: the Caller and Cultivate Forest; no Overrun.
    expect(unlocksOf("CHIVALRY")).toEqual(["UNIT:KNIGHT", "CULTIVATE_FOREST"]);
    // Warding Circles: the Idol Bearer; no Field Defense.
    expect(unlocksOf("FORTIFICATION")).toEqual(["UNIT:GUARD"]);
    // Raiding keeps Pillage and the Familiar's Charge.
    expect(unlocksOf("RAIDING")).toEqual(["PILLAGE", "CHARGE_BONUS"]);
    // The Stars Are Right keeps Blast Mountain and Breach.
    expect(unlocksOf("EXPLOSIVES")).toEqual([
      "BLAST_MOUNTAIN",
      "MELEE_FIELD_DEMOLITION",
    ]);
    // Pathfinding: the Hexer sees its own range.
    expect(unlocksOf("FIELDCRAFT")).toContain("ROLE_SIGHT");
  });

  it("names its nodes for their rites and units, and keeps every ID", () => {
    const named: Partial<Record<TechnologyIdV7, string>> = {
      FARMING: "Harvest Rites",
      SAWMILLING: "Stargazers",
      MARKSMANSHIP: "Hexers",
      SCOUTING: "Familiars",
      CHIVALRY: "Callers",
      METALLURGY: "The Chosen",
      FORTIFICATION: "Warding Circles",
      EXPLOSIVES: "The Stars Are Right",
    };
    for (const tech of TECHNOLOGY_IDS_V7)
      expect(technologyDisplayNameV7(tech, "CULT"), tech).toBe(
        named[tech] ?? technologyDisplayNameV7(tech, "ORIGINAL"),
      );
    // The shared names it keeps.
    expect(technologyDisplayNameV7("ADMINISTRATION", "CULT")).toBe(
      "Leadership",
    );
    expect(technologyDisplayNameV7("MILLING", "CULT")).toBe("Milling");
    expect(technologyDisplayNameV7("FIELDCRAFT", "CULT")).toBe("Pathfinding");
  });

  it("reads the same capabilities as the Humans, less Field Defense, with the Offering", () => {
    const all = [...TECHNOLOGY_IDS_V7];
    const cult = technologyCapabilitiesV7(all, "CULT");
    const human = technologyCapabilitiesV7(all, "ORIGINAL");
    expect(cult).toEqual({
      ...human,
      treeId: "CULT_BASELINE_V1",
      commands: human.commands.filter(
        (command) => command !== "BUILD_FIELD_DEFENSE",
      ),
      roleBindings: CULT_ROLE_RULES_V7,
      // Harvest Rites (`pulp_wars-mch9.4`).
      offering: true,
    });
    expect(cult.trainableRoles).toEqual(
      UNIT_ROLE_IDS_V7.filter((role) => role !== "JUGGERNAUT"),
    );
    expect(cult.breach).toBe(true);
    expect(cult.roleSightRadius).toEqual({ RAIDER: 2, MARKSMAN: 2 });
    expect(technologyCapabilitiesV7([], "CULT").trainableRoles).toEqual([
      "FIGHTER",
    ]);
  });

  it("trains each unit with its own technology only, at its own price", () => {
    for (const role of LAND_ROLES) {
      const rule = effectiveRoleRuleV7(role, "CULT");
      if (rule.cost === null) continue;
      const train = (techs: readonly TechnologyIdV7[]) => {
        const state = fieldV7([], {
          factions: ["CULT", "ORIGINAL"],
          techs: { 0: techs, 1: [] },
        });
        const actor = seatIdV7(state, 0);
        const command: CommandV7 = {
          kind: "TRAIN",
          cityId: cityOfV7(state, 0).id,
          role,
        };
        return { state, actor, command };
      };
      if (rule.technology !== null) {
        const without = train([]);
        expect(
          queryPlayerCommandsV7(viewForV7(without.state, without.actor)),
          role,
        ).not.toContainEqual(without.command);
        const refused = applyCommandV7(
          without.state,
          without.actor,
          without.command,
        );
        expect(refused.accepted, role).toBe(false);
        if (!refused.accepted)
          expect([refused.error.code, refused.error.params], role).toEqual([
            "TECH_REQUIRED",
            { tech: rule.technology },
          ]);
      }
      const chain = (tech: TechnologyIdV7 | null): TechnologyIdV7[] => {
        if (tech === null) return [];
        const node = CULT_BASELINE_V1_TREE.nodes.find(
          (item) => item.id === tech,
        );
        return [...(node?.prerequisites ?? []).flatMap(chain), tech];
      };
      const { state, actor, command } = train(chain(rule.technology));
      expect(
        queryPlayerCommandsV7(viewForV7(state, actor)),
        role,
      ).toContainEqual(command);
      const result = applyOkV7(state, actor, command);
      const coins = (item: GameStateV7): number =>
        item.players.find((player) => player.id === actor)?.coins ?? 0;
      expect(coins(state) - coins(result.state), role).toBe(rule.cost);
      const made = newUnitsV7(state, result.state);
      expect(made, role).toHaveLength(1);
      expect(made[0], role).toMatchObject({
        role,
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        form: "LAND",
      });
      expect(
        parseGameStateV7(JSON.parse(JSON.stringify(result.state))),
      ).toEqual(result.state);
    }
    // The Thing in the Cellar is a reward only.
    expect(factionUnlocksRoleV7("CULT", "JUGGERNAUT")).toBe(false);
  });

  it("offers no Field Defense with Warding Circles, to the Initiate or the Idol Bearer", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(8, 7) },
        { seat: 0, role: "GUARD", at: at(9, 7) },
      ],
      { factions: ["CULT", "ORIGINAL"] },
    );
    const actor = seatIdV7(state, 0);
    const commands = queryPlayerCommandsV7(viewForV7(state, actor));
    expect(
      commands.filter((command) => command.kind === "BUILD_FIELD_DEFENSE"),
    ).toEqual([]);
    const refused = applyCommandV7(state, actor, {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: unitAtV7(state, at(8, 7)).id,
    });
    expect(refused.accepted).toBe(false);
    // A Human seat on the same field builds one.
    const human = fieldV7([{ seat: 0, role: "FIGHTER", at: at(8, 7) }], {
      factions: ["ORIGINAL", "CULT"],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(human, seatIdV7(human, 0))).some(
        (command) => command.kind === "BUILD_FIELD_DEFENSE",
      ),
    ).toBe(true);
  });
});

describe("the Cult registration: the start and the rewards (section 4.3)", () => {
  it("starts with one Initiate on its capital, 3 Coins, and no technology", () => {
    expect(STARTING_FIGHTERS_V7.CULT).toBe(1);
    const state = playable(goblinSetupV7(["ORIGINAL", "CULT"]));
    const cult = state.players.find((player) => player.faction === "CULT");
    if (cult === undefined) throw new Error("no Cult seat");
    expect(cult.factionTreeId).toBe("CULT_BASELINE_V1");
    expect(cult.researchedTechs).toEqual([]);
    // 3 Coins, and its first Start Turn income of 2 when it moves first.
    expect(cult.coins).toBe(state.turnOrder[0] === cult.id ? 5 : 3);
    const capital = state.cities.find(
      (city) => city.ownerId === cult.id && city.isCapital,
    );
    expect(state.units.filter((unit) => unit.ownerId === cult.id)).toEqual([
      expect.objectContaining({
        role: "FIGHTER",
        form: "LAND",
        at: capital?.at,
        hp: 10,
        maxHp: 10,
      }),
    ]);
  });

  it("generates the same map whatever seat plays the Cult", () => {
    const mapOf = (factions: readonly FactionIdV7[]): string => {
      const created = createInitialMapStateV7(goblinSetupV7(factions, 11));
      if (!created.ok) throw new Error(created.error.code);
      const { state } = created;
      return canonicalHash({
        board: state.board,
        cities: state.cities.map((city) => ({ at: city.at, id: city.id })),
        treasureChests: state.treasureChests,
        turnOrder: state.turnOrder,
        random: state.random,
        units: state.units.map((unit) => ({ at: unit.at, id: unit.id })),
      });
    };
    const reference = mapOf(["ORIGINAL", "UNDEAD"]);
    expect(mapOf(["CULT", "ORIGINAL"])).toBe(reference);
    expect(mapOf(["ORIGINAL", "CULT"])).toBe(reference);
  });

  it("gives two Initiates for the Militia, the Goblin precedent", () => {
    expect(MILITIA_FIGHTERS_V7.CULT).toBe(2);
    const fixture = rewardStateV7("MILITIA", "CULT");
    const owner = seatIdV7(fixture.state, 0);
    const result = applyOkV7(fixture.state, owner, {
      ...fixture.command,
      reward: "MILITIA",
    });
    const granted = result.events.filter(
      (event) => event.kind === "UNIT_REWARD_GRANTED",
    );
    expect(granted.map((event) => "role" in event && event.role)).toEqual([
      "FIGHTER",
      "FIGHTER",
    ]);
    const initiates = newUnitsV7(fixture.state, result.state);
    expect(initiates).toHaveLength(2);
    for (const unit of initiates) {
      expect(unit).toMatchObject({
        ownerId: owner,
        role: "FIGHTER",
        hp: 10,
        maxHp: 10,
      });
      expect(unitRoleRuleV7(result.state, unit).label).toBe("Initiate");
    }
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
      result.state,
    );
  });

  it("gives the reveal and a Familiar for the Scouts", () => {
    expect(SURVEY_RAIDERS_V7.CULT).toBe(1);
    // A Cult capital that reaches level 3 with three Farms, through the
    // level-2 Stockpile.
    const base = goblinArenaV7(
      ["CULT", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { techs: { 0: ["GATHERING", "FARMING"], 1: [] }, coins: 50 },
    );
    const actor = seatIdV7(base, 0);
    const capital = cityOfV7(base, 0);
    const farms = [at(8, 9), at(7, 9), at(9, 9)];
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          farms.some((farm) => tile.at.x === farm.x && tile.at.y === farm.y)
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
              }
            : tile,
        ),
      },
    };
    let built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: at(8, 9) });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
      candidates: ["STOCKPILE", "MILITIA"],
    });
    built = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "STOCKPILE",
    });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(7, 9) });
    built = applyOkV7(built.state, actor, { kind: "BUILD_FARM", at: at(9, 9) });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 3,
      candidates: ["SURVEY", "WALLS"],
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 3,
      reward: "SURVEY",
    });
    expect(
      chosen.events.find((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toMatchObject({ role: "RAIDER", reachedLevel: 3 });
    const familiar = newUnitsV7(built.state, chosen.state);
    expect(familiar).toHaveLength(1);
    expect(familiar[0]).toMatchObject({ role: "RAIDER", hp: 8, maxHp: 8 });
    expect(unitRoleRuleV7(chosen.state, familiar[0] as never).label).toBe(
      "Familiar",
    );
  });

  it("gives a Thing in the Cellar for the giant reward", () => {
    expect(REWARD_UNIT_LEVEL_V7).toBe(5);
    const fixture = rewardStateV7("JUGGERNAUT", "CULT");
    const owner = seatIdV7(fixture.state, 0);
    const result = applyOkV7(fixture.state, owner, {
      ...fixture.command,
      reward: "JUGGERNAUT",
    });
    const things = newUnitsV7(fixture.state, result.state);
    expect(things).toHaveLength(1);
    expect(things[0]).toMatchObject({
      ownerId: owner,
      role: "JUGGERNAUT",
      hp: 40,
      maxHp: 40,
    });
    expect(unitRoleRuleV7(result.state, things[0] as never).label).toBe(
      "Thing in the Cellar",
    );
  });
});

describe("the Cult registration: the numbers in a fight (section 10)", () => {
  /** `attacker` (seat 0) attacks `defender` (seat 1) on open ground. */
  const duel = (
    attacker: readonly [FactionIdV7, UnitRoleIdV7],
    defender: readonly [FactionIdV7, UnitRoleIdV7],
    distance: 1 | 2 = 1,
  ) => {
    const state = fieldV7(
      [
        { seat: 0, role: attacker[1], at: at(5, 2) },
        { seat: 1, role: defender[1], at: at(5, 2 + distance) },
      ],
      { factions: [attacker[0], defender[0]] },
    );
    const run = attackV7(state, at(5, 2), at(5, 2 + distance));
    return [run.combat.damageToDefender, run.combat.damageToAttacker];
  };

  it("resolves the spec's head-to-head table through the engine", () => {
    // Line: the Initiate against the Fighter.
    expect(duel(["CULT", "FIGHTER"], ["ORIGINAL", "FIGHTER"])).toEqual([5, 5]);
    expect(duel(["ORIGINAL", "FIGHTER"], ["CULT", "FIGHTER"])).toEqual([5, 3]);
    // Defender: softer up close, sturdier at range.
    expect(duel(["ORIGINAL", "FIGHTER"], ["CULT", "GUARD"])).toEqual([4, 6]);
    expect(duel(["ORIGINAL", "MARKSMAN"], ["CULT", "GUARD"], 2)).toEqual([
      4, 0,
    ]);
    // Fast: the Familiar and the Raider.
    expect(duel(["CULT", "RAIDER"], ["ORIGINAL", "MARKSMAN"])).toEqual([6, 2]);
    expect(duel(["ORIGINAL", "RAIDER"], ["CULT", "RAIDER"])).toEqual([6, 2]);
    // Ranged: the Marksman's shot; a Knight kills a Hexer.
    expect(duel(["CULT", "MARKSMAN"], ["ORIGINAL", "FIGHTER"], 2)).toEqual([
      5, 0,
    ]);
    expect(duel(["ORIGINAL", "KNIGHT"], ["CULT", "MARKSMAN"])).toEqual([9, 0]);
    // Support: a Captain's body.
    expect(duel(["ORIGINAL", "MARKSMAN"], ["CULT", "CAPTAIN"], 2)).toEqual([
      6, 0,
    ]);
    expect(duel(["ORIGINAL", "KNIGHT"], ["CULT", "CAPTAIN"])).toEqual([10, 0]);
    // Breakthrough: much weaker than a Knight in its own fight.
    expect(duel(["CULT", "KNIGHT"], ["ORIGINAL", "MARKSMAN"])).toEqual([8, 1]);
    expect(duel(["ORIGINAL", "KNIGHT"], ["CULT", "KNIGHT"])).toEqual([12, 0]);
    // Heavy line: Defense half a point under the Champion's.
    expect(duel(["CULT", "SWORDSMAN"], ["ORIGINAL", "SWORDSMAN"])).toEqual([
      9, 5,
    ]);
    expect(duel(["ORIGINAL", "SWORDSMAN"], ["CULT", "SWORDSMAN"])).toEqual([
      10, 3,
    ]);
    // The giants.
    expect(duel(["CULT", "JUGGERNAUT"], ["ORIGINAL", "JUGGERNAUT"])).toEqual([
      9, 9,
    ]);
    expect(duel(["ORIGINAL", "JUGGERNAUT"], ["CULT", "JUGGERNAUT"])).toEqual([
      10, 7,
    ]);
  });

  it("gives the Stargazer no attack and no answer, and lets it capture", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      ],
      { factions: ["CULT", "ORIGINAL"] },
    );
    const actor = seatIdV7(state, 0);
    const stargazer = unitAtV7(state, at(5, 2));
    const commands = queryPlayerCommandsV7(viewForV7(state, actor));
    expect(
      commands.filter(
        (command) =>
          command.kind === "ATTACK" && command.unitId === stargazer.id,
      ),
    ).toEqual([]);
    const refused = applyCommandV7(state, actor, {
      kind: "ATTACK",
      unitId: stargazer.id,
      targetUnitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(refused.accepted).toBe(false);
    // Attacked from the next tile and from two tiles, it never strikes back.
    for (const from of [at(5, 3), at(5, 4)]) {
      const foe = fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(5, 2) },
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "MARKSMAN", at: at(5, 4) },
        ],
        { factions: ["CULT", "ORIGINAL"], activeSeat: 1 },
      );
      const run = attackV7(foe, from, at(5, 2));
      expect(run.combat.damageToAttacker).toBe(0);
      expect(run.combat.retaliation).toBe(false);
    }
    // It captures a village like every land unit.
    const village = fieldV7(
      [
        {
          seat: 0,
          role: "CATAPULT",
          at: at(5, 5),
          captureEligible: true,
        },
      ],
      { factions: ["CULT", "ORIGINAL"] },
    );
    expect(
      queryPlayerCommandsV7(viewForV7(village, seatIdV7(village, 0))),
    ).toContainEqual({
      kind: "CAPTURE",
      unitId: unitAtV7(village, at(5, 5)).id,
    });
  });

  it("holds the Idol Bearer to the Guard's rule: no attack after a Move", () => {
    const pieces = (moved: boolean) =>
      fieldV7(
        [
          {
            seat: 0,
            role: "GUARD",
            at: at(5, 2),
            ...(moved ? { activation: movedV7(1) } : {}),
          },
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
        ],
        { factions: ["CULT", "ORIGINAL"] },
      );
    const attacks = (state: GameStateV7) =>
      queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, 0))).filter(
        (command) => command.kind === "ATTACK",
      );
    expect(attacks(pieces(false))).toHaveLength(1);
    expect(attacks(pieces(true))).toEqual([]);
  });

  it("gives the Familiar the Charge with Raiding, and no Escape", () => {
    const charge = (techs: readonly TechnologyIdV7[]) => {
      const state = fieldV7(
        [
          {
            seat: 0,
            role: "RAIDER",
            at: at(5, 2),
            activation: movedV7(2),
          },
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
        ],
        { factions: ["CULT", "ORIGINAL"], techs: { 0: techs } },
      );
      return attackV7(state, at(5, 2), at(5, 3));
    };
    const plain = charge(["SCOUTING"]);
    const charged = charge(["SCOUTING", "RAIDING"]);
    expect(charged.combat.damageToDefender).toBeGreaterThan(
      plain.combat.damageToDefender,
    );
    // No Escape: its Move is spent once it has attacked.
    expect(charged.attacker?.activation.escapeAvailable).toBe(false);
    expect(
      queryPlayerCommandsV7(
        viewForV7(charged.state, seatIdV7(charged.state, 0)),
      ).filter((command) => command.kind === "MOVE"),
    ).toEqual([]);
  });
});

describe("the Cult registration: nine seats (section 17.8)", () => {
  it("lets a match seat two to nine players, one per faction", () => {
    expect(maxSeatCountV7()).toBe(9);
    expect(distinctFactionsV7(9)).toEqual(FACTION_IDS_V7);
    // The default factions of two to eight seats never include the Cult.
    for (let seats = 2; seats <= 8; seats += 1)
      expect(distinctFactionsV7(seats), String(seats)).not.toContain("CULT");
    const nine = generatedSetup("DRY_LAND", 25, FACTION_IDS_V7);
    expect(nine.aiCount).toBe(8);
    expect(validateMatchSetupV7(nine)).toEqual({ ok: true, setup: nine });
    // A tenth seat is refused, with or without the mirror flag.
    const ten = {
      ...nine,
      aiCount: 9,
      factions: [...FACTION_IDS_V7, "ORIGINAL" as const],
    };
    expect(validateMatchSetupV7(ten).ok).toBe(false);
    expect(
      validateMatchSetupV7({ ...ten, allowDuplicateFactions: true }).ok,
    ).toBe(false);
    // Two Cult seats need the headless and test only mirror flag.
    const mirror = generatedSetup("DRY_LAND", 11, ["CULT", "CULT"]);
    const refused = validateMatchSetupV7(mirror);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe("DUPLICATE_FACTION");
    expect(
      validateMatchSetupV7({ ...mirror, allowDuplicateFactions: true }).ok,
    ).toBe(true);
  });

  it("holds nine seats where the board holds nine, and eight where it holds eight", () => {
    // `P(w, type)` of the map scale: the cells that reach nine, and the
    // cells that stay below it.
    const capacity = (width: BoardSizeV7, mapType: MapTypeV7): number =>
      seatCapacityV7(width, mapType as never);
    expect(capacity(11, "DRY_LAND")).toBe(9);
    expect(capacity(11, "PANGEA")).toBe(8);
    expect(capacity(11, "CONTINENTS")).toBe(6);
    expect(capacity(11, "LAKES")).toBe(2);
    expect(capacity(11, "ARCHIPELAGO")).toBe(4);
    expect(capacity(14, "ARCHIPELAGO")).toBe(8);
    const reachesNine: readonly (readonly [BoardSizeV7, MapTypeV7])[] = [
      [11, "DRY_LAND"],
      [14, "DRY_LAND"],
      [14, "PANGEA"],
      [14, "CONTINENTS"],
      [14, "LAKES"],
      ...([16, 20, 25] as const).flatMap((width) =>
        (
          ["DRY_LAND", "PANGEA", "CONTINENTS", "ARCHIPELAGO", "LAKES"] as const
        ).map((mapType): readonly [BoardSizeV7, MapTypeV7] => [width, mapType]),
      ),
    ];
    for (const [width, mapType] of reachesNine) {
      expect(maxSeatsV7(width, mapType), `${width} ${mapType}`).toBe(9);
      expect(
        validateMatchSetupV7(generatedSetup(mapType, width, FACTION_IDS_V7)).ok,
        `${width} ${mapType}`,
      ).toBe(true);
    }
    for (const [width, mapType, most] of [
      [11, "PANGEA", 8],
      [11, "CONTINENTS", 6],
      [11, "LAKES", 2],
      [11, "ARCHIPELAGO", 4],
      [14, "ARCHIPELAGO", 8],
    ] as const) {
      expect(maxSeatsV7(width, mapType), `${width} ${mapType}`).toBe(most);
      expect(
        validateMatchSetupV7(generatedSetup(mapType, width, FACTION_IDS_V7)).ok,
        `${width} ${mapType}`,
      ).toBe(false);
    }
    // The Showcase has four strips whatever the faction count.
    expect(maxSeatsV7(16, "SHOWCASE")).toBe(4);
    expect(allowedBoardSizesV7("DRY_LAND", 9)).toEqual([11, 14, 16, 20, 25]);
    expect(allowedBoardSizesV7("ARCHIPELAGO", 9)).toEqual([16, 20, 25]);
    expect(allowedBoardSizesV7("PANGEA", 9)).toEqual([14, 16, 20, 25]);
    expect(allowedBoardSizesV7("DRY_LAND", 10)).toEqual([]);
  });

  it("picks 25 x 25 as the auto size of eight and nine seats", () => {
    expect(
      [2, 3, 4, 5, 6, 7, 8, 9].map((seats) => autoBoardSizeV7(seats)),
    ).toEqual([11, 14, 16, 20, 20, 20, 25, 25]);
    // 20 x 20 gives nine seats 44 tiles each, under the 56 of the auto size.
    expect(Math.floor((20 * 20) / 9)).toBe(44);
    for (const mapType of [
      "DRY_LAND",
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ] as const)
      expect(autoBoardSizeV7(9, mapType), mapType).toBe(25);
    expect(autoBoardSizeV7(10)).toBeNull();
  });

  it.each([
    ["DRY_LAND", 25],
    ["DRY_LAND", 11],
    ["PANGEA", 14],
    ["CONTINENTS", 20],
    ["ARCHIPELAGO", 16],
    ["LAKES", 25],
  ] as const)(
    "generates a nine-seat %s board at %i with nine capitals and the Cult on the ninth seat",
    { timeout: 120_000 },
    (mapType, size) => {
      const state = playable(generatedSetup(mapType, size, FACTION_IDS_V7));
      expect(state.players).toHaveLength(9);
      expect(state.players.map((player) => player.faction)).toEqual(
        FACTION_IDS_V7,
      );
      expect(new Set(state.players.map((player) => player.color)).size).toBe(9);
      expect(state.turnOrder).toHaveLength(9);
      expect(state.cities.filter((city) => city.isCapital)).toHaveLength(9);
      const cult = state.players[8];
      expect(cult?.faction).toBe("CULT");
      expect(
        state.units.filter((unit) => unit.ownerId === cult?.id),
      ).toHaveLength(1);
      expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(
        state,
      );
      // Every seat's view and offered commands build.
      for (const player of state.players)
        expect(
          queryPlayerCommandsV7(viewForV7(state, player.id)).length,
          player.faction,
        ).toBeGreaterThanOrEqual(0);
    },
  );
});

describe("the Cult registration: saves and replays", () => {
  it("round-trips a Cult state through the state schema and the save envelope", () => {
    const setup = goblinSetupV7(["CULT", "ORIGINAL"]);
    const state = playable(setup);
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-10T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    // A player bound to the wrong tree is refused.
    expect(
      parseGameStateV7({
        ...state,
        players: state.players.map((player) =>
          player.faction === "CULT"
            ? { ...player, factionTreeId: "ORIGINAL_BASELINE_V5" }
            : player,
        ),
      }),
    ).toBeNull();
  });
});

describe("the Cult registration: the Normal AI does not fall over a Cult seat", () => {
  /** Plays the active seat's whole turn with the Normal AI. */
  function turn(start: GameStateV7): readonly CommandV7[] {
    let state = start;
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const commands: CommandV7[] = [];
    for (let step = 0; step < 200; step += 1) {
      const view = viewForV7(state, actor);
      const command = chooseNormalCommandV7(view).command;
      if (command === null) throw new Error("the policy chose nothing");
      // The policy only ever picks an offered command.
      expect(queryPlayerCommandsV7(view)).toContainEqual(command);
      commands.push(command);
      if (command.kind === "END_TURN") return commands;
      state = applyOkV7(state, actor, command).state;
    }
    throw new Error("the turn did not end");
  }

  const midGame = (
    factions: readonly [FactionIdV7, FactionIdV7],
    active: number,
  ) =>
    fieldV7(
      [
        ...LAND_ROLES.filter((role) => role !== "JUGGERNAUT").map(
          (role, index) => ({
            seat: 0,
            role,
            at: at(6 + (index % 4), 5 + Math.floor(index / 4)),
          }),
        ),
        { seat: 0, role: "JUGGERNAUT" as const, at: at(8, 7) },
        { seat: 1, role: "FIGHTER" as const, at: at(4, 5) },
        { seat: 1, role: "MARKSMAN" as const, at: at(3, 6) },
        { seat: 1, role: "KNIGHT" as const, at: at(3, 7) },
        { seat: 1, role: "GUARD" as const, at: at(2, 8) },
      ],
      { factions, activeSeat: active, coins: 30 },
    );

  it("keeps the Cult off the army policy until its own AI bead", () => {
    expect(ARMY_PLAY_FACTIONS_V7).not.toContain("CULT");
    const state = midGame(["CULT", "ORIGINAL"], 0);
    for (const seat of [0, 1])
      expect(
        inspectNormalArmyV7(viewForV7(state, seatIdV7(state, seat))).army,
        String(seat),
      ).toBe(false);
  });

  it("chooses an offered command for a Cult seat at its start", () => {
    const state = playable(goblinSetupV7(["CULT", "ORIGINAL"]));
    const cult = state.players.find((player) => player.faction === "CULT");
    if (cult === undefined) throw new Error("no Cult seat");
    const active = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(cult.id),
    });
    const view = viewForV7(active, cult.id);
    const decision = chooseNormalCommandV7(view);
    expect(decision.command).not.toBeNull();
    expect(queryPlayerCommandsV7(view)).toContainEqual(decision.command);
  });

  it("plays a whole turn of a Cult seat with every unit on the board", () => {
    const commands = turn(midGame(["CULT", "ORIGINAL"], 0));
    expect(commands.at(-1)?.kind).toBe("END_TURN");
  });

  it("plays a whole turn of a seat facing the Cult", () => {
    for (const faction of ["ORIGINAL", "GOBLIN", "CANDY"] as const) {
      const commands = turn(midGame([faction, "CULT"], 0));
      expect(commands.at(-1)?.kind, faction).toBe("END_TURN");
    }
  });

  it("chooses an offered command for every seat of a nine-seat match", () => {
    const state = playable(generatedSetup("DRY_LAND", 25, FACTION_IDS_V7, 3));
    for (const player of state.players) {
      const active = checkedV7({
        ...state,
        activeSeatIndex: state.turnOrder.indexOf(player.id),
      });
      const view = viewForV7(active, player.id);
      expect(queryPlayerCommandsV7(view), player.faction).toContainEqual(
        chooseNormalCommandV7(view).command,
      );
    }
  });
});
