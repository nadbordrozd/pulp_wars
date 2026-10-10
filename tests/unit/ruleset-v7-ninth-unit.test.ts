import { describe, expect, it } from "vitest";
import {
  ARMY_RESEARCH_ROLES_V7,
  armyClassV7,
  armyRoleScoreV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import { candyProductionAdjustmentV7 } from "../../src/ai/v7-candy";
import { policySiegeRuleV7 } from "../../src/ai/v7-dinosaur";
import { dwarfProductionAdjustmentV7 } from "../../src/ai/v7-dwarf";
import { iceFolkProductionAdjustmentV7 } from "../../src/ai/v7-ice-folk";
import {
  NINTH_GRAVE_DENIAL_VALUE_V7,
  NINTH_HEAVYWEIGHT_VALUE_V7,
  NINTH_OWN_GRAVE_COST_V7,
  NINTH_SHOCK_SCREEN_VALUE_V7,
  heavyweightMoveValueV7,
  ninthUnitMoveValueV7,
  ownWightGraveHeldV7,
  shockScreenMoveValueV7,
  wightGraveMoveValueV7,
  whirlMoveValueV7,
  NINTH_WHIRL_TARGET_VALUE_V7,
} from "../../src/ai/v7-ninth-unit";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  NINTH_UNIT_STAND_INS_V7,
  chibiFallbackSubjectV7,
  ninthUnitStandInLetterV7,
  ninthUnitStandInSubjectV7,
  unitArtRoleV7,
  unitArtSubjectV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import { portraitSubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import {
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  HUMAN_ONLY_ROLES_V7,
  NAVAL_ROLE_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SHOCK_FIELD_DAMAGE_V7,
  TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7,
  TECHNOLOGY_IDS_V7,
  TECHNOLOGY_SHARED_DISPLAY_NAMES_V7,
  UNIT_ROLE_IDS_V7,
  WIGHT_RISE_AGAIN_HP_V7,
  applyCommandV7,
  assertRuleset7Registry,
  effectiveRoleRuleV7,
  factionTreeV7,
  factionUnlocksRoleV7,
  gangUpBonusV7,
  isEggLaidRoleV7,
  isNavalRoleV7,
  isRallyTargetV7,
  parseEventV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  rebakePriceV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  unitIsBlastProofV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { technologyNameV7 } from "../../src/render/goblin-presentation-v7";
import {
  ninthUnitCombatNotesV7,
  ninthUnitHelpRulesV7,
  ninthUnitRecruitNotesV7,
} from "../../src/render/ninth-unit-presentation-v7";
import { recruitmentRolePresentationV7 } from "../../src/render/role-presentation-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { candyFieldV7, type CandyPieceV7 } from "../fixtures/v7-candy";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { shieldAtV7 } from "../fixtures/v7-martian";
import {
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  moveV7,
  movedV7,
  tileV7,
} from "../fixtures/v7-revision20";

/**
 * The ninth unit (`pulp_wars-w49.17`, identity `pulp-wars-poc-7r55`;
 * docs/product/RULESET_7_NINTH_UNIT.md, from Parts A and B of
 * docs/product/RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md): every faction
 * has nine land units, the heavy line unit of each is at Metallurgy, four
 * factions have a new heavy and three moved a unit into the slot and got a
 * new unit for the job it left, and the technologies have new display
 * names.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8). Every other land tile is open
 * Grass, every tile is explored by both seats, and each seat has every
 * land technology and 100 Coins unless a test says otherwise.
 */

const LAND_ROLES = UNIT_ROLE_IDS_V7.filter((role) => !isNavalRoleV7(role));

type Job =
  | "BASIC_LINE"
  | "DEFENDER"
  | "FAST"
  | "RANGED"
  | "SUPPORT"
  | "SIEGE"
  | "BREAKTHROUGH"
  | "HEAVY_LINE"
  | "REWARD_GIANT";

/** The job a role ID means in every faction (the nine jobs). */
const JOB_OF_ROLE: Readonly<Record<string, Job>> = {
  FIGHTER: "BASIC_LINE",
  GUARD: "DEFENDER",
  RAIDER: "FAST",
  MARKSMAN: "RANGED",
  CAPTAIN: "SUPPORT",
  CATAPULT: "SIEGE",
  KNIGHT: "BREAKTHROUGH",
  SWORDSMAN: "HEAVY_LINE",
  JUGGERNAUT: "REWARD_GIANT",
};
const TACTICAL_OF_JOB: Readonly<Record<Job, string>> = {
  BASIC_LINE: "LINE",
  DEFENDER: "DEFENDER",
  FAST: "SKIRMISHER",
  RANGED: "RANGED",
  SUPPORT: "SUPPORT",
  SIEGE: "SIEGE",
  BREAKTHROUGH: "BREAKTHROUGH",
  HEAVY_LINE: "LINE",
  REWARD_GIANT: "MYTHIC",
};

/** The nine-jobs table of the design (A.3), by faction. */
const JOBS: Readonly<Record<FactionIdV7, Readonly<Record<Job, string>>>> = {
  ORIGINAL: {
    BASIC_LINE: "Fighter",
    DEFENDER: "Guard",
    FAST: "Raider",
    RANGED: "Marksman",
    SUPPORT: "Captain",
    SIEGE: "Catapult",
    BREAKTHROUGH: "Knight",
    HEAVY_LINE: "Champion",
    REWARD_GIANT: "Juggernaut",
  },
  UNDEAD: {
    BASIC_LINE: "Skeleton",
    DEFENDER: "Zombie",
    FAST: "Ghoul",
    RANGED: "Banshee",
    SUPPORT: "Necromancer",
    SIEGE: "Lich",
    BREAKTHROUGH: "Vampire",
    HEAVY_LINE: "Wight",
    REWARD_GIANT: "Abomination",
  },
  GOBLIN: {
    BASIC_LINE: "Goblin",
    DEFENDER: "Orc Brute",
    FAST: "Wolf Rider",
    RANGED: "Bomb Chucker",
    SUPPORT: "Orc Warboss",
    SIEGE: "Rocket Cart",
    BREAKTHROUGH: "Scrap Buggy",
    HEAVY_LINE: "Ogre",
    REWARD_GIANT: "Troll",
  },
  DINOSAUR: {
    BASIC_LINE: "Caveman",
    DEFENDER: "Ankylosaurus",
    FAST: "Raptor",
    RANGED: "Spitter",
    SUPPORT: "Shaman",
    SIEGE: "Stegosaurus",
    BREAKTHROUGH: "T-Rex",
    HEAVY_LINE: "Triceratops",
    REWARD_GIANT: "Brontosaurus",
  },
  MARTIAN: {
    BASIC_LINE: "Grunt",
    DEFENDER: "Shield Projector",
    FAST: "Saucer",
    RANGED: "Ray Gunner",
    SUPPORT: "Brain",
    SIEGE: "Tripod",
    BREAKTHROUGH: "Mothership",
    HEAVY_LINE: "Shock Trooper",
    REWARD_GIANT: "Colossus",
  },
  ICE_FOLK: {
    BASIC_LINE: "Yeti",
    DEFENDER: "Musk Ox",
    FAST: "Sled",
    RANGED: "Snow Hunter",
    SUPPORT: "Ice Witch",
    SIEGE: "Boulder Yeti",
    BREAKTHROUGH: "Sabretooth",
    HEAVY_LINE: "Mammoth",
    REWARD_GIANT: "Frost Giant",
  },
  DWARF: {
    BASIC_LINE: "Hammerer",
    DEFENDER: "Steam Mole",
    FAST: "Gyrocopter",
    RANGED: "Clockwork Gunner",
    SUPPORT: "Engineer",
    SIEGE: "Steam Cannon",
    BREAKTHROUGH: "Whirligig",
    HEAVY_LINE: "Steam Tank",
    REWARD_GIANT: "Brass Titan",
  },
  CANDY: {
    BASIC_LINE: "Toffee Trooper",
    DEFENDER: "Marshmallow",
    FAST: "Donut Racer",
    RANGED: "Gumball Gunner",
    SUPPORT: "Confectioner",
    SIEGE: "Pie Launcher",
    BREAKTHROUGH: "Chocolate Bunny",
    HEAVY_LINE: "Jawbreaker",
    REWARD_GIANT: "Gingerbread Giant",
  },
  // The Cultists (`pulp_wars-mch9.3`, RULESET_7_CULTISTS.md section 4.1).
  CULT: {
    BASIC_LINE: "Initiate",
    DEFENDER: "Idol Bearer",
    FAST: "Familiar",
    RANGED: "Hexer",
    SUPPORT: "Summoner",
    SIEGE: "Stargazer",
    BREAKTHROUGH: "Caller",
    HEAVY_LINE: "Chosen",
    REWARD_GIANT: "Thing in the Cellar",
  },
};

/** The technology of each job's role (the same node in every tree). */
const TECH_OF_JOB: Readonly<Record<Job, TechnologyIdV7 | null>> = {
  BASIC_LINE: null,
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): Fortification
  // (the root, `DRILL`, until 7r55).
  DEFENDER: "FORTIFICATION",
  FAST: "SCOUTING",
  RANGED: "MARKSMANSHIP",
  SUPPORT: "ADMINISTRATION",
  SIEGE: "SAWMILLING",
  BREAKTHROUGH: "CHIVALRY",
  HEAVY_LINE: "METALLURGY",
  REWARD_GIANT: null,
};

interface Numbers {
  readonly cost: number;
  readonly maxHp: number;
  readonly attack2: number;
  readonly defense2: number;
  readonly move: number;
  readonly range: readonly [number, number];
  readonly afterMove: boolean;
  readonly captures: boolean;
}
/** The numbers of design A.3 (the heavy of each faction). */
const HEAVY: Readonly<Record<FactionIdV7, Numbers>> = {
  // The Champion: the Swordsman's numbers, 6 Coins (5 before).
  ORIGINAL: num(6, 15, 7, 5, 1),
  GOBLIN: num(5, 16, 5, 4, 1),
  UNDEAD: num(6, 14, 6, 5, 1),
  MARTIAN: num(6, 12, 6, 4, 1),
  // The three moved units keep their numbers. Every land unit captures
  // since `pulp_wars-ke95` (the Triceratops and the Steam Tank did not).
  DINOSAUR: num(8, 20, 6, 4, 2),
  // Ice Folk Freeze (`pulp_wars-w49.37`): the Mammoth costs 7 (6 before).
  ICE_FOLK: num(7, 20, 5, 4, 1),
  DWARF: num(9, 16, 6, 4, 2),
  CANDY: num(6, 16, 6, 5, 1),
  // The Chosen: the Champion with half a Defense less.
  CULT: num(6, 15, 7, 4, 1),
};
function num(
  cost: number,
  maxHp: number,
  attack2: number,
  defense2: number,
  move: number,
): Numbers {
  return {
    cost,
    maxHp,
    attack2,
    defense2,
    move,
    range: [1, 1],
    afterMove: true,
    captures: true,
  };
}
const numbersOf = (role: UnitRoleIdV7, faction: FactionIdV7): Numbers => {
  const rule = effectiveRoleRuleV7(role, faction);
  return {
    cost: rule.cost ?? -1,
    maxHp: rule.maxHp,
    attack2: rule.attack2,
    defense2: rule.defense2,
    move: rule.move,
    range: [rule.minimumRange, rule.range],
    afterMove: rule.mayUsePrimaryActionAfterMove,
    captures: rule.abilities.includes("CAPTURE"),
  };
};

const field = (
  pieces: readonly CandyPieceV7[],
  options: Parameters<typeof candyFieldV7>[1] = {},
): GameStateV7 =>
  candyFieldV7(pieces, { factions: ["ORIGINAL", "ORIGINAL"], ...options });

const offered = (state: GameStateV7, seat = 0): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, seat)));

const previewOf = (state: GameStateV7, from: CoordV7, to: CoordV7) => {
  const active = state.turnOrder[state.activeSeatIndex];
  if (active === undefined) throw new Error("no active seat");
  const result = queryCombatPreviewV7(
    viewForV7(state, active),
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
  );
  if (result === null) throw new Error("no preview");
  return result;
};

const maybeUnitAt = (state: GameStateV7, where: CoordV7) =>
  state.units.find(
    (unit) => unit.at.x === where.x && unit.at.y === where.y && unit.hp > 0,
  );

/** The chain of technologies up to and including `tech`, prerequisites first. */
function chainTo(faction: FactionIdV7, tech: TechnologyIdV7): TechnologyIdV7[] {
  const nodes = factionTreeV7(faction).nodes;
  const result: TechnologyIdV7[] = [];
  const visit = (id: TechnologyIdV7): void => {
    if (result.includes(id)) return;
    const node = nodes.find((item) => item.id === id);
    for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
    result.push(id);
  };
  visit(tech);
  return result;
}

const productionOf = (
  commands: readonly CommandV7[],
  role: UnitRoleIdV7,
): readonly CommandV7[] =>
  commands.filter(
    (command) =>
      (command.kind === "TRAIN" || command.kind === "LAY_EGG") &&
      command.role === role,
  );

describe("the ninth unit: identity", () => {
  it("was 7r55 after 7r54, with both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r71");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r71.current");
    expect(PRIOR_RULESET_7_IDS.at(-17)).toBe("pulp-wars-poc-7r54");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-17)).toBe(
      "pulpWars.save.v7r54.current",
    );
    const state = field([]);
    expect(
      parseGameStateV7({
        ...state,
        rulesetId: "pulp-wars-poc-7r54",
        setup: { ...state.setup, rulesetId: "pulp-wars-poc-7r54" },
      }),
    ).toBeNull();
    // A 7r54 state has no `ninthUnit`; this identity requires it.
    const { ninthUnit: _ninthUnit, ...older } = state;
    void _ninthUnit;
    expect(parseGameStateV7(older)).toBeNull();
    // Dwarf crowd control (`pulp_wars-w49.33`): Three Hammers and its struck
    // pairs are gone (the Whirl replaced them).
    expect(state.ninthUnit).toEqual({
      wightGraves: [],
      risenWights: [],
      crackedThisTurn: [],
    });
    expect(() => assertRuleset7Registry()).not.toThrow();
    // One event kind is new: a Wight climbing out of its Grave. Dwarf crowd
    // control (`pulp_wars-w49.33`) added four more (a Whirl and the three
    // Barricade events).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toContain("WIGHT_RISEN");
    // The giants' signatures (`pulp_wars-w49.30`) add ten event kinds in
    // one block after UNIT_SURFACED (115). Map curiosities round 2
    // (`pulp_wars-737.14`) add four (119).
    // Ice Folk Freeze (`pulp_wars-w49.37`) renames UNITS_CHILLED to
    // UNITS_FROZEN in place and adds MAMMOTH_STAMPEDED (120).
    // The Candy redesign (`pulp_wars-jdb.12`) adds UNIT_TOPPED_UP,
    // TILES_GLAZED, UNIT_STUCK, TOOTHACHE_GIVEN, RICOCHETED, and THUMPED
    // (126).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(126);
  });
});

describe("the ninth unit: nine land units and nine jobs for every faction", () => {
  it("gives every faction exactly nine land roles, one per job, with the design's units", () => {
    expect(LAND_ROLES).toHaveLength(9);
    expect(new Set(LAND_ROLES.map((role) => JOB_OF_ROLE[role])).size).toBe(9);
    expect(HUMAN_ONLY_ROLES_V7).toEqual([]);
    for (const faction of FACTION_IDS_V7) {
      const names = new Set<string>();
      for (const role of LAND_ROLES) {
        const job = JOB_OF_ROLE[role] as Job;
        const rule = effectiveRoleRuleV7(role, faction);
        expect(rule.label, `${faction} ${job}`).toBe(JOBS[faction][job]);
        // A role ID means a job: its tactical label is the job's.
        expect(rule.tacticalRole, `${faction} ${job}`).toBe(
          TACTICAL_OF_JOB[job],
        );
        expect(rule.technology, `${faction} ${job}`).toBe(TECH_OF_JOB[job]);
        // Every unit but the reward giant has a price; the giant has none.
        expect(rule.cost === null, `${faction} ${job}`).toBe(
          job === "REWARD_GIANT",
        );
        // Every unit of the roster can be produced by its own faction.
        expect(factionUnlocksRoleV7(faction, role), `${faction} ${job}`).toBe(
          job !== "REWARD_GIANT",
        );
        names.add(rule.label);
      }
      // Nine different units.
      expect(names.size, faction).toBe(9);
    }
  });

  it("unlocks the heavy at Metallurgy in every tree and no unit at Engineering", () => {
    for (const faction of FACTION_IDS_V7) {
      const nodes = factionTreeV7(faction).nodes;
      const node = (id: TechnologyIdV7) => {
        const found = nodes.find((item) => item.id === id);
        if (found === undefined) throw new Error(id);
        return found;
      };
      expect(node("METALLURGY").unlockedRoles, faction).toEqual(["SWORDSMAN"]);
      expect(node("ENGINEERING").unlockedRoles, faction).toEqual([]);
      // Metallurgy keeps the Forge and Arms Industry.
      expect(
        node("METALLURGY").unlocks.map((unlock) => unlock.kind),
        faction,
      ).toEqual([
        "COMMAND",
        "ECONOMIC_FORMULA",
        "ARMS_INDUSTRY_DISCOUNT",
        "UNIT_ROLE",
      ]);
      // Engineering keeps Mountains, the Mine, and Redevelop (the Workshop
      // left it for the root at 7r56, the Industry reshuffle).
      expect(
        node("ENGINEERING").unlocks.map((unlock) =>
          unlock.kind === "COMMAND" ? unlock.command : unlock.kind,
        ),
        faction,
      ).toEqual([
        "MOUNTAIN_MOVEMENT",
        "HIGH_GROUND_VISION",
        "BUILD_MINE",
        "REDEVELOP",
      ]);
      // Each land unit's node unlocks that unit and no other.
      for (const role of LAND_ROLES) {
        const tech = effectiveRoleRuleV7(role, faction).technology;
        if (tech === null) continue;
        expect(node(tech).unlockedRoles, `${faction} ${role}`).toEqual([role]);
      }
    }
  });

  it("gives each heavy the design's numbers", () => {
    for (const faction of FACTION_IDS_V7)
      expect(numbersOf("SWORDSMAN", faction), faction).toEqual(HEAVY[faction]);
    // The three backfills.
    expect(numbersOf("CATAPULT", "DINOSAUR")).toEqual({
      cost: 7,
      maxHp: 12,
      attack2: 5,
      defense2: 2,
      move: 1,
      range: [2, 3],
      afterMove: false,
      captures: true,
    });
    expect(numbersOf("GUARD", "ICE_FOLK")).toEqual({
      cost: 4,
      maxHp: 16,
      attack2: 3,
      // Ice Folk Freeze (`pulp_wars-w49.37`): Defense 2 (2.5 before).
      defense2: 4,
      move: 1,
      range: [1, 1],
      afterMove: false,
      captures: true,
    });
    expect(numbersOf("KNIGHT", "DWARF")).toEqual({
      cost: 9,
      maxHp: 12,
      attack2: 6,
      defense2: 3,
      move: 3,
      range: [1, 1],
      afterMove: true,
      captures: true,
    });
  });

  it("gives each new unit its one mechanic and no other faction's", () => {
    const mechanic = (faction: FactionIdV7, role: UnitRoleIdV7) => {
      const value = roleMechanicsV7(role, faction);
      return [
        value.gangUpWeight > 1 ? "HEAVYWEIGHT" : null,
        value.riseAgainHp !== null ? "RISE_AGAIN" : null,
        value.shockFieldDamage > 0 ? "SHOCK_FIELD" : null,
        value.immovable ? "ROCK_HARD" : null,
        value.cracksArmour ? "THAGOMIZER" : null,
        value.frostbite ? "FROSTBITE" : null,
        value.whirl ? "WHIRL" : null,
      ].filter((item) => item !== null);
    };
    const expected: Readonly<Record<string, readonly string[]>> = {
      "GOBLIN SWORDSMAN": ["HEAVYWEIGHT"],
      "UNDEAD SWORDSMAN": ["RISE_AGAIN"],
      "MARTIAN SWORDSMAN": ["SHOCK_FIELD"],
      "CANDY SWORDSMAN": ["ROCK_HARD"],
      "DINOSAUR CATAPULT": ["THAGOMIZER"],
      "ICE_FOLK GUARD": ["FROSTBITE"],
      "DWARF KNIGHT": ["WHIRL"],
    };
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(mechanic(faction, role), `${faction} ${role}`).toEqual(
          expected[`${faction} ${role}`] ?? [],
        );
    expect(roleMechanicsV7("SWORDSMAN", "GOBLIN").gangUpWeight).toBe(2);
    expect(roleMechanicsV7("SWORDSMAN", "UNDEAD").riseAgainHp).toBe(
      WIGHT_RISE_AGAIN_HP_V7,
    );
    expect(WIGHT_RISE_AGAIN_HP_V7).toBe(7);
    expect(roleMechanicsV7("SWORDSMAN", "MARTIAN").shockFieldDamage).toBe(3);
    expect(SHOCK_FIELD_DAMAGE_V7).toBe(3);
    expect(roleMechanicsV7("SWORDSMAN", "MARTIAN").shield).toBe(3);
    expect(roleMechanicsV7("KNIGHT", "DWARF").whirl).toBe(true);
  });

  it("keeps the rules of the three moved units with the unit, under the heavy role", () => {
    // The Triceratops: Charge!, the run-up, two slots, an Egg of two turns,
    // growth, out of War Drums, and Field Defense destroyed; it captures
    // since `pulp_wars-ke95`.
    const triceratops = roleMechanicsV7("SWORDSMAN", "DINOSAUR");
    expect(effectiveRoleRuleV7("SWORDSMAN", "DINOSAUR").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "LINEBREAKER",
      "GROW",
    ]);
    expect(triceratops).toMatchObject({
      capacitySlots: 2,
      hatchTurns: 2,
      runUpBonus2: 2,
      rallyExcluded: true,
      demolishesFieldDefense: true,
      advancesAfterKill: true,
    });
    expect(isEggLaidRoleV7("SWORDSMAN", "DINOSAUR")).toBe(true);
    // The Stegosaurus in the role it left: one slot, an Egg of two turns.
    expect(effectiveRoleRuleV7("CATAPULT", "DINOSAUR").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "GROW",
    ]);
    expect(roleMechanicsV7("CATAPULT", "DINOSAUR")).toMatchObject({
      capacitySlots: 1,
      hatchTurns: 2,
      runUpBonus2: 0,
      advancesAfterKill: false,
      demolishesFieldDefense: true,
      rallyExcluded: false,
    });
    // The Mammoth: Sweep, Trample, Glide, Freeze, attacks after moving;
    // Ice Folk Freeze (`pulp_wars-w49.37`) adds its Stampede.
    expect(effectiveRoleRuleV7("SWORDSMAN", "ICE_FOLK").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "SWEEP",
      "TRAMPLE",
      "STAMPEDE",
      "FREEZE",
    ]);
    expect(roleMechanicsV7("SWORDSMAN", "ICE_FOLK")).toMatchObject({
      sweepDamage: 2,
      tramplesFieldDefense: true,
      glides: true,
      buildsFieldDefense: false,
    });
    // The Musk Ox has neither; it Glides and Freezes like every Ice Folk
    // land unit but the Sabretooth and builds no Field Defense.
    expect(effectiveRoleRuleV7("GUARD", "ICE_FOLK").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "FREEZE",
    ]);
    expect(roleMechanicsV7("GUARD", "ICE_FOLK")).toMatchObject({
      sweepDamage: 0,
      tramplesFieldDefense: false,
      glides: true,
      buildsFieldDefense: false,
    });
    // The Steam Tank: Plated 4, a machine; it captures since `pulp_wars-ke95`.
    expect(effectiveRoleRuleV7("SWORDSMAN", "DWARF").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "PLATED",
    ]);
    expect(roleMechanicsV7("SWORDSMAN", "DWARF")).toMatchObject({
      plated: 4,
      repairsAsMachine: true,
      construct: false,
    });
    // The Whirligig: a construct and a machine, never advances, not Plated;
    // Dwarf crowd control (`pulp_wars-w49.33`): it Whirls.
    expect(effectiveRoleRuleV7("KNIGHT", "DWARF").abilities).toEqual([
      "ATTACK",
      "CAPTURE",
      "CLOCKWORK",
      "WHIRL",
    ]);
    expect(roleMechanicsV7("KNIGHT", "DWARF")).toMatchObject({
      plated: null,
      construct: true,
      unflinchingAttack: true,
      repairsAsMachine: true,
      advancesAfterKill: false,
    });
    // Only the `CATAPULT` role of each faction and the Triceratops destroy
    // Field Defense with every attack; only the Triceratops is kept out of
    // a Rally by a flag. (The Cult's `CATAPULT` role, the Stargazer of
    // `pulp_wars-mch9.3`, has no attack and so destroys none.)
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7) {
        const value = roleMechanicsV7(role, faction);
        expect(value.demolishesFieldDefense, `${faction} ${role}`).toBe(
          (role === "CATAPULT" && faction !== "CULT") ||
            (faction === "DINOSAUR" && role === "SWORDSMAN"),
        );
        expect(value.rallyExcluded, `${faction} ${role}`).toBe(
          faction === "DINOSAUR" && role === "SWORDSMAN",
        );
      }
  });
});

describe("the ninth unit: production", () => {
  it("offers each faction's heavy with Metallurgy only, at its own price, to that faction", () => {
    for (const faction of FACTION_IDS_V7) {
      const without = chainTo(faction, "ENGINEERING");
      const withTech = chainTo(faction, "METALLURGY");
      const build = (techs: readonly TechnologyIdV7[]) =>
        field([], {
          factions: [faction, "ORIGINAL"],
          techs: { 0: techs, 1: [] },
        });
      expect(
        productionOf(offered(build(without)), "SWORDSMAN"),
        faction,
      ).toEqual([]);
      const state = build(withTech);
      const commands = productionOf(offered(state), "SWORDSMAN");
      expect(commands.length, faction).toBeGreaterThan(0);
      // A Dinosaur heavy is laid as an Egg; every other one is trained.
      expect(commands[0]?.kind, faction).toBe(
        faction === "DINOSAUR" ? "LAY_EGG" : "TRAIN",
      );
      const actor = seatIdV7(state, 0);
      const before = state.players.find((player) => player.id === actor);
      const result = applyOkV7(state, actor, commands[0] as CommandV7);
      const after = result.state.players.find((player) => player.id === actor);
      expect((before?.coins ?? 0) - (after?.coins ?? 0), faction).toBe(
        HEAVY[faction].cost,
      );
      const made = result.state.units.find(
        (unit) => !state.units.some((old) => old.id === unit.id),
      );
      expect(made?.role, faction).toBe("SWORDSMAN");
      expect(made?.maxHp, faction).toBe(
        faction === "DINOSAUR" ? made?.maxHp : HEAVY[faction].maxHp,
      );
      for (const event of result.events)
        expect(parseEventV7(event).ok, event.kind).toBe(true);
    }
  });

  it("offers the three backfills at the technology the moved unit left", () => {
    const cases: readonly (readonly [
      FactionIdV7,
      UnitRoleIdV7,
      TechnologyIdV7,
      number,
    ])[] = [
      ["DINOSAUR", "CATAPULT", "SAWMILLING", 7],
      // (The Musk Ox went on to Deep Winter with every defender at 7r56.)
      ["ICE_FOLK", "GUARD", "FORTIFICATION", 4],
      ["DWARF", "KNIGHT", "CHIVALRY", 9],
    ];
    for (const [faction, role, tech, cost] of cases) {
      const chain = chainTo(faction, tech);
      const build = (techs: readonly TechnologyIdV7[]) =>
        field([], {
          factions: [faction, "ORIGINAL"],
          techs: { 0: techs, 1: [] },
        });
      expect(
        productionOf(offered(build(chain.slice(0, -1))), role),
        faction,
      ).toEqual([]);
      const state = build(chain);
      const commands = productionOf(offered(state), role);
      expect(commands.length, faction).toBeGreaterThan(0);
      // The moved unit is not produced at its old technology any more.
      expect(productionOf(offered(state), "SWORDSMAN"), faction).toEqual([]);
      const actor = seatIdV7(state, 0);
      const result = applyOkV7(state, actor, commands[0] as CommandV7);
      const coins = (value: GameStateV7): number =>
        value.players.find((player) => player.id === actor)?.coins ?? 0;
      expect(coins(state) - coins(result.state), faction).toBe(cost);
    }
  });

  it("puts Arms Industry on the heavy's own node in every tree", () => {
    // A city with a working Forge trains the heavy for 1 Coin less (the
    // ordinary Arms Industry rule): the discount and the unit come together.
    for (const faction of FACTION_IDS_V7) {
      const before = technologyCapabilitiesV7(
        chainTo(faction, "ENGINEERING"),
        faction,
      );
      const after = technologyCapabilitiesV7(
        chainTo(faction, "METALLURGY"),
        faction,
      );
      expect(before.armsIndustryDiscountCoins, faction).toBe(0);
      expect(before.trainableRoles, faction).not.toContain("SWORDSMAN");
      expect(after.armsIndustryDiscountCoins, faction).toBe(1);
      expect(after.trainableRoles, faction).toContain("SWORDSMAN");
      expect(after.commands, faction).toContain("BUILD_FORGE");
    }
  });
});

describe("the ninth unit: technology display names", () => {
  const SHARED: Readonly<Record<TechnologyIdV7, string>> = {
    GATHERING: "Gathering",
    FARMING: "Farming",
    MILLING: "Milling",
    ADMINISTRATION: "Leadership",
    PLANNING: "Land Grants",
    HUNTING: "Hunting",
    FORESTRY: "Forestry",
    SAWMILLING: "Sawmilling",
    MARKSMANSHIP: "Marksmanship",
    FIELDCRAFT: "Pathfinding",
    SCOUTING: "Scouting",
    ROADS: "Roads",
    COMMERCE: "Commerce",
    RAIDING: "Raiding",
    CHIVALRY: "Chivalry",
    DRILL: "Crafting",
    ENGINEERING: "Engineering",
    METALLURGY: "Armoury",
    FORTIFICATION: "Fortification",
    EXPLOSIVES: "Explosives",
    SHORECRAFT: "Sailing",
    NAVIGATION: "Navigation",
    NAVAL_ENGINEERING: "Shipbuilding",
    SEAMANSHIP: "Boarding",
    SUBMERSIBLES: "Submersibles",
  };
  const OWN: Readonly<
    Record<FactionIdV7, Readonly<Partial<Record<TechnologyIdV7, string>>>>
  > = {
    ORIGINAL: {},
    UNDEAD: {
      EXPLOSIVES: "Pestilence",
      MILLING: "Bone Mills",
      MARKSMANSHIP: "Banshees",
      SAWMILLING: "Liches",
      CHIVALRY: "Vampires",
    },
    GOBLIN: {
      COMMERCE: "Plunder",
      MARKSMANSHIP: "Bomb Chuckers",
      SAWMILLING: "Rocket Carts",
      CHIVALRY: "Scrap Buggies",
    },
    DINOSAUR: {
      FORTIFICATION: "Nesting",
      EXPLOSIVES: "Wallbreaker",
      // The existing name is kept (the design proposed "Chopping").
      SAWMILLING: "Timber",
      MILLING: "Grinding",
      MARKSMANSHIP: "Spitters",
      CHIVALRY: "T-Rex",
      METALLURGY: "Triceratops",
    },
    MARTIAN: {
      FORTIFICATION: "Force Fields",
      EXPLOSIVES: "Disintegrator",
      FIELDCRAFT: "Heat Sinks",
      MILLING: "Solar Arrays",
      MARKSMANSHIP: "Ray Gunners",
      SAWMILLING: "Tripods",
      SCOUTING: "Saucers",
      CHIVALRY: "Motherships",
    },
    ICE_FOLK: {
      FORTIFICATION: "Deep Winter",
      EXPLOSIVES: "Brittle",
      SHORECRAFT: "Rime",
      NAVIGATION: "Pack Ice",
      NAVAL_ENGINEERING: "Icebound",
      SEAMANSHIP: "Black Ice",
      SUBMERSIBLES: "Glacier",
      SAWMILLING: "Boulders",
      CHIVALRY: "Sabretooths",
      METALLURGY: "Mammoths",
    },
    DWARF: {
      FORTIFICATION: "Dig In",
      EXPLOSIVES: "Blasting Charges",
      MILLING: "Steam Pumps",
      MARKSMANSHIP: "Clockwork",
      SAWMILLING: "Steam Cannons",
      SCOUTING: "Gyrocopters",
      CHIVALRY: "Whirligigs",
      METALLURGY: "Steam Tanks",
      RAIDING: "Dive Bombing",
      ENGINEERING: "Mining",
    },
    CANDY: {
      FORTIFICATION: "Home Sweet Home",
      EXPLOSIVES: "Peppermint Surprise",
      MARKSMANSHIP: "Gumball Gunners",
      SAWMILLING: "Pie Launchers",
      CHIVALRY: "Chocolate Bunnies",
      METALLURGY: "Jawbreakers",
    },
    // The Cultists (`pulp_wars-mch9.3`, RULESET_7_CULTISTS.md section 11).
    CULT: {
      FARMING: "Harvest Rites",
      SAWMILLING: "Stargazers",
      MARKSMANSHIP: "Hexers",
      SCOUTING: "Familiars",
      CHIVALRY: "Callers",
      METALLURGY: "The Chosen",
      FORTIFICATION: "Warding Circles",
      EXPLOSIVES: "The Stars Are Right",
    },
  };

  it("names every technology of every faction, and changes no ID", () => {
    expect(TECHNOLOGY_IDS_V7).toEqual(Object.keys(SHARED));
    expect(TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7).toEqual(OWN);
    // The shared table holds exactly the eight renames.
    expect(TECHNOLOGY_SHARED_DISPLAY_NAMES_V7).toEqual({
      DRILL: "Crafting",
      ADMINISTRATION: "Leadership",
      PLANNING: "Land Grants",
      FIELDCRAFT: "Pathfinding",
      METALLURGY: "Armoury",
      SHORECRAFT: "Sailing",
      NAVAL_ENGINEERING: "Shipbuilding",
      SEAMANSHIP: "Boarding",
    });
    for (const faction of FACTION_IDS_V7) {
      const seen = new Set<string>();
      for (const tech of TECHNOLOGY_IDS_V7) {
        const expected = OWN[faction][tech] ?? SHARED[tech];
        expect(
          technologyDisplayNameV7(tech, faction),
          `${faction} ${tech}`,
        ).toBe(expected);
        // The interface's name helper is the same table.
        expect(technologyNameV7(tech, faction), `${faction} ${tech}`).toBe(
          expected,
        );
        seen.add(expected);
      }
      // No two technologies of a faction share a name.
      expect(seen.size, faction).toBe(TECHNOLOGY_IDS_V7.length);
      // The tree's nodes keep their IDs, tiers, and prerequisites.
      expect(factionTreeV7(faction).nodes.map((node) => node.id)).toEqual(
        TECHNOLOGY_IDS_V7,
      );
    }
    // No old shared name is left for any faction.
    for (const faction of FACTION_IDS_V7)
      for (const tech of TECHNOLOGY_IDS_V7)
        expect([
          "Drill",
          "Administration",
          "Planning",
          "Fieldcraft",
          "Metallurgy",
          "Shorecraft",
          "Naval engineering",
          "Seamanship",
        ]).not.toContain(technologyDisplayNameV7(tech, faction));
  });

  it("names the heavy on its card and in the Help with its mechanic", () => {
    const card = recruitmentRolePresentationV7("SWORDSMAN", "ORIGINAL");
    expect(card.label).toBe("Champion");
    expect(ninthUnitRecruitNotesV7("SWORDSMAN", "ORIGINAL")).toEqual([]);
    const lines: Readonly<Record<string, RegExp>> = {
      "GOBLIN SWORDSMAN": /^Heavyweight: Counts as two units for Gang Up/,
      "UNDEAD SWORDSMAN": /^Rise Again: .* with 7 HP, once/,
      "MARTIAN SWORDSMAN": /^Shock Field: .* takes 3 damage/,
      "CANDY SWORDSMAN": /^Rock Hard: Nothing moves it/,
      "DINOSAUR CATAPULT": /^Thagomizer: .* 1 less Defense/,
      "ICE_FOLK GUARD": /^Frostbite: .* is Frozen/,
      "DWARF KNIGHT": /^Whirl: Hits every enemy next to it at once/,
    };
    for (const [key, pattern] of Object.entries(lines)) {
      const [faction, role] = key.split(" ") as [FactionIdV7, UnitRoleIdV7];
      const notes = ninthUnitRecruitNotesV7(role, faction);
      expect(notes, key).toHaveLength(1);
      expect(notes[0], key).toMatch(pattern);
      // The unit card carries the line.
      expect(
        recruitmentRolePresentationV7(role, faction).restrictions,
        key,
      ).toContain(notes[0]);
      const help = ninthUnitHelpRulesV7(faction);
      expect(help, key).toHaveLength(1);
      expect(help[0]?.[1], key).toContain(
        effectiveRoleRuleV7(role, faction).label,
      );
    }
    expect(ninthUnitHelpRulesV7("ORIGINAL")).toEqual([]);
    expect(
      ninthUnitCombatNotesV7({
        shockDamage: 3,
        crackApplied: true,
        frostbiteApplied: true,
      }),
    ).toEqual([
      "Shock Field: attacker takes 3",
      "Cracked: 1 less Defense",
      "Frostbite: attacker Frozen",
    ]);
    expect(
      ninthUnitCombatNotesV7({
        shockDamage: 0,
        crackApplied: false,
        frostbiteApplied: false,
      }),
    ).toEqual([]);
  });
});

describe("the ninth unit: its own art", () => {
  it("keeps a moved unit's art slot and gives the seven new units their own sprite and portrait", () => {
    // The moved units keep the art made for them.
    expect(unitArtRoleV7("SWORDSMAN", "DINOSAUR")).toBe("CATAPULT");
    expect(unitArtRoleV7("SWORDSMAN", "ICE_FOLK")).toBe("GUARD");
    expect(unitArtRoleV7("SWORDSMAN", "DWARF")).toBe("KNIGHT");
    const subject = (role: UnitRoleIdV7, faction: FactionIdV7) =>
      unitArtSubjectV7({ role, form: "LAND", faction });
    expect(subject("SWORDSMAN", "DINOSAUR")).toBe("UNIT:DINOSAUR:CATAPULT");
    expect(subject("SWORDSMAN", "ICE_FOLK")).toBe("UNIT:ICE_FOLK:GUARD");
    expect(subject("SWORDSMAN", "DWARF")).toBe("UNIT:DWARF:KNIGHT");
    expect(portraitSubjectV7("SWORDSMAN", "DWARF")).toBe(
      "PORTRAIT:DWARF:KNIGHT",
    );
    // The Champion keeps the Swordsman's art.
    expect(subject("SWORDSMAN", "ORIGINAL")).toBe("UNIT:SWORDSMAN");
    expect(ninthUnitStandInLetterV7("UNIT:SWORDSMAN")).toBeNull();
    // Each new unit is the ninth art slot of its faction. Bead
    // `pulp_wars-2yc.34`: each has its own sprite and portrait in the live
    // registry, no sibling stands in, and no unit wears the letter badge.
    expect(NINTH_UNIT_STAND_INS_V7).toEqual({});
    const live = chibiDirectionArtRegistryV7();
    const newUnits: readonly (readonly [
      FactionIdV7,
      UnitRoleIdV7,
      string,
      string,
    ])[] = [
      ["UNDEAD", "SWORDSMAN", "undead-wight", "FIGHTER"],
      ["GOBLIN", "SWORDSMAN", "goblin-ogre", "GUARD"],
      ["MARTIAN", "SWORDSMAN", "martian-shock-trooper", "FIGHTER"],
      ["CANDY", "SWORDSMAN", "candy-jawbreaker", "GUARD"],
      ["DINOSAUR", "CATAPULT", "dinosaur-stegosaurus", "GUARD"],
      ["ICE_FOLK", "GUARD", "ice-folk-musk-ox", "GUARD"],
      ["DWARF", "KNIGHT", "dwarf-whirligig", "MARKSMAN"],
    ];
    for (const [faction, role, name, formerStandIn] of newUnits) {
      const own = subject(role, faction);
      expect(own, faction).toBe(`UNIT:${faction}:SWORDSMAN`);
      expect(
        live.variants(own).map((asset) => asset.id),
        faction,
      ).toEqual([`chibi-direction-${name}`]);
      expect(ninthUnitStandInSubjectV7(own), faction).toBeNull();
      expect(ninthUnitStandInLetterV7(own), faction).toBeNull();
      const portrait = portraitSubjectV7(role, faction);
      expect(portrait, faction).toBe(`PORTRAIT:${faction}:SWORDSMAN`);
      expect(
        live.variants(portrait).map((asset) => asset.id),
        faction,
      ).toEqual([`chibi-direction-portrait-${name}`]);
      expect(ninthUnitStandInSubjectV7(portrait), faction).toBeNull();
      // The sibling that stood in keeps its own art and is another raster.
      const sibling = live.variants(
        `UNIT:${faction}:${formerStandIn}` as ArtSubjectV7,
      );
      expect(sibling).toHaveLength(1);
      expect(sibling[0]?.id, faction).not.toBe(`chibi-direction-${name}`);
      // In a look without the faction's art it falls back like every
      // other faction subject: to the Human unit of the slot.
      expect(chibiFallbackSubjectV7(own), faction).toBe("UNIT:SWORDSMAN");
      expect(chibiFallbackSubjectV7(portrait), faction).toBe(
        "PORTRAIT:SWORDSMAN",
      );
    }
    // No unit subject is a stand-in.
    for (const faction of FACTION_IDS_V7)
      for (const role of LAND_ROLES)
        expect(
          ninthUnitStandInLetterV7(subject(role, faction)),
          `${faction} ${role}`,
        ).toBeNull();
    expect(
      NAVAL_ROLE_IDS_V7.map((role) => unitArtRoleV7(role, "DWARF")),
    ).toEqual(NAVAL_ROLE_IDS_V7);
  });
});

describe("the Ogre: Heavyweight", () => {
  const goblins = (pieces: readonly CandyPieceV7[]) =>
    field(pieces, { factions: ["GOBLIN", "ORIGINAL"] });

  it("counts as two units for the Gang Up of another Goblin attack", () => {
    // A Goblin attacks a Guard; an Ogre stands beside the Guard.
    const state = goblins([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "SWORDSMAN", at: at(5, 1) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(previewOf(state, at(4, 2), at(5, 2)).gangUp).toBe(2);
    // One ordinary helper gives 1.
    const plain = goblins([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 1) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(previewOf(plain, at(4, 2), at(5, 2)).gangUp).toBe(1);
    // The resolution agrees with the preview.
    expect(attackV7(state, at(4, 2), at(5, 2)).combat.gangUp).toBe(2);
  });

  it("keeps the role limits: a rocket takes +1 at most and a bomb none", () => {
    const state = goblins([
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 0, role: "MARKSMAN", at: at(5, 4) },
      { seat: 0, role: "SWORDSMAN", at: at(6, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(previewOf(state, at(3, 2), at(5, 2)).gangUp).toBe(1);
    expect(previewOf(state, at(5, 4), at(5, 2)).gangUp).toBe(0);
  });

  it("takes Gang Up itself like any Goblin unit, and no more than +2", () => {
    const one = goblins([
      { seat: 0, role: "SWORDSMAN", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 1) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(previewOf(one, at(4, 2), at(5, 2)).gangUp).toBe(1);
    // Two Ogres beside the target are still +2 for a third unit.
    const many = goblins([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "SWORDSMAN", at: at(5, 1) },
      { seat: 0, role: "SWORDSMAN", at: at(6, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(previewOf(many, at(4, 2), at(5, 2)).gangUp).toBe(2);
    // The engine helper says the same for the canonical state.
    expect(
      gangUpBonusV7(
        many,
        many.units,
        unitAtV7(many, at(4, 2)),
        unitAtV7(many, at(5, 2)),
      ),
    ).toBe(2);
  });

  it("is not Blast-proof and has no Kaboom or death blast", () => {
    const state = goblins([{ seat: 0, role: "SWORDSMAN", at: at(4, 2) }]);
    const ogre = unitAtV7(state, at(4, 2));
    expect(unitIsBlastProofV7(state, ogre)).toBe(false);
    expect(roleMechanicsV7("SWORDSMAN", "GOBLIN")).toMatchObject({
      blastProof: false,
      kaboomDamage: null,
      deathBlastDamage: null,
    });
    expect(
      offered(state).some(
        (command) => command.kind === "KABOOM" && command.unitId === ogre.id,
      ),
    ).toBe(false);
  });

  it("gives no Gang Up to anyone while a Brain controls it", () => {
    // A Martian Brain at (4, 4) controls the Ogre at (5, 3), which stands
    // beside a Goblin at (5, 2) and beside a Grunt's target.
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 1, role: "SWORDSMAN", at: at(5, 3), controlledBy: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(4, 1) },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    const ogre = unitAtV7(state, at(5, 3));
    expect(ogre.ownerId).toBe(seatIdV7(state, 0));
    // The Martian Grunt attacks the Goblin beside the controlled Ogre: the
    // Martian kind has no Gang Up.
    expect(previewOf(state, at(6, 3), at(5, 2)).gangUp).toBe(0);
    // A Goblin attack on a Martian unit beside the controlled Ogre gets
    // nothing from it: it is the Martians' unit now.
    const goblinTurn = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    expect(
      gangUpBonusV7(
        goblinTurn,
        goblinTurn.units,
        unitAtV7(goblinTurn, at(5, 2)),
        unitAtV7(goblinTurn, at(6, 3)),
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The mechanics. A helper: the state with another seat to move.
// ---------------------------------------------------------------------------

const turnOf = (state: GameStateV7, seat: number): GameStateV7 =>
  checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, seat)),
  });

const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): readonly Extract<DomainEventV7, { readonly kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { readonly kind: K }> =>
      event.kind === kind,
  );

const commandFor = (
  state: GameStateV7,
  kind: CommandV7["kind"],
  where: CoordV7,
): CommandV7 | undefined => {
  const unit = unitAtV7(state, where);
  const active = state.turnOrder[state.activeSeatIndex];
  if (active === undefined) throw new Error("no active seat");
  return queryPlayerCommandsV7(viewForV7(state, active)).find(
    (command) =>
      command.kind === kind &&
      "unitId" in command &&
      command.unitId === unit.id,
  );
};

describe("the Wight: Rise Again", () => {
  const WIGHT = at(5, 2);
  /** A wounded Wight (seat 0, Undead) two tiles from a Human Catapult. */
  const shot = (extra: readonly CandyPieceV7[] = []) =>
    field(
      [
        { seat: 0, role: "SWORDSMAN", at: WIGHT, hp: 3 },
        { seat: 1, role: "CATAPULT", at: at(5, 4) },
        ...extra,
      ],
      { factions: ["UNDEAD", "ORIGINAL"], activeSeat: 1 },
    );

  it("marks the Grave it leaves and climbs out at its owner's next Start Turn at 7 HP", () => {
    const start = shot();
    const wight = unitAtV7(start, WIGHT);
    const undead = seatIdV7(start, 0);
    const killed = attackV7(start, at(5, 4), WIGHT);
    expect(kindsV7(killed.events)).toEqual(
      expect.arrayContaining(["UNIT_DIED", "GRAVE_CREATED"]),
    );
    expect(killed.state.graves).toEqual([WIGHT]);
    expect(killed.state.ninthUnit.wightGraves).toEqual([
      { at: WIGHT, ownerId: undead },
    ]);
    // The marked Grave is public on an explored tile, with its seat.
    expect(
      viewForV7(killed.state, seatIdV7(killed.state, 1)).ninthUnit.wightGraves,
    ).toEqual([{ at: WIGHT, ownerId: undead }]);
    const risen = endTurnUntilV7(killed.state, undead);
    const rise = eventsOf(risen.events, "WIGHT_RISEN");
    expect(rise).toHaveLength(1);
    for (const event of risen.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    const back = unitAtV7(risen.state, WIGHT);
    expect(rise[0]).toEqual({
      kind: "WIGHT_RISEN",
      playerId: undead,
      unitId: back.id,
      at: WIGHT,
      hp: 7,
    });
    // A rising: a new unit with no home city (it fills no slot), no kills.
    expect(back).toMatchObject({
      ownerId: undead,
      role: "SWORDSMAN",
      form: "LAND",
      hp: 7,
      maxHp: 14,
      kills: 0,
      veteran: false,
      homeCityId: null,
    });
    expect(back.id).not.toBe(wight.id);
    // The Grave is gone with its mark, and the Wight is listed as risen.
    expect(risen.state.graves).toEqual([]);
    expect(risen.state.ninthUnit.wightGraves).toEqual([]);
    expect(risen.state.ninthUnit.risenWights).toEqual([back.id]);
    // It rose at the Start Turn, so it acts this turn.
    expect(commandFor(risen.state, "MOVE", WIGHT)).toBeDefined();
    expect(
      viewForV7(risen.state, undead).unitStats.find(
        (stats) => stats.unitId === back.id,
      )?.statuses,
    ).toContain("Risen: will not rise again");
  });

  it("does not rise a second time", () => {
    const start = shot();
    const undead = seatIdV7(start, 0);
    const human = seatIdV7(start, 1);
    const first = attackV7(start, at(5, 4), WIGHT);
    const risen = endTurnUntilV7(first.state, undead);
    const again = endTurnUntilV7(risen.state, human);
    // 7 HP against a Catapult's shot from two tiles (7): dead again.
    const second = attackV7(again.state, at(5, 4), WIGHT);
    expect(second.combat.defenderDies).toBe(true);
    expect(second.state.graves).toEqual([WIGHT]);
    expect(second.state.ninthUnit.wightGraves).toEqual([]);
    expect(second.state.ninthUnit.risenWights).toEqual([]);
    const later = endTurnUntilV7(second.state, undead);
    expect(eventsOf(later.events, "WIGHT_RISEN")).toEqual([]);
    expect(maybeUnitAt(later.state, WIGHT)).toBeUndefined();
  });

  it("waits while a unit stands on the Grave, of either side", () => {
    const start = shot([{ seat: 1, role: "FIGHTER", at: at(6, 3) }]);
    const undead = seatIdV7(start, 0);
    const human = seatIdV7(start, 1);
    const killed = attackV7(start, at(5, 4), WIGHT);
    // The Human Fighter steps onto the Grave.
    const blocked = moveV7(killed.state, at(6, 3), [WIGHT]);
    const waiting = endTurnUntilV7(blocked.state, undead);
    expect(eventsOf(waiting.events, "WIGHT_RISEN")).toEqual([]);
    expect(waiting.state.ninthUnit.wightGraves).toHaveLength(1);
    expect(unitAtV7(waiting.state, WIGHT).role).toBe("FIGHTER");
    // It steps off on its next turn; the Wight rises at the Start Turn
    // after that.
    const humanTurn = endTurnUntilV7(waiting.state, human);
    const freed = moveV7(humanTurn.state, WIGHT, [at(6, 2)]);
    const risen = endTurnUntilV7(freed.state, undead);
    expect(eventsOf(risen.events, "WIGHT_RISEN")).toHaveLength(1);
    expect(unitAtV7(risen.state, WIGHT)).toMatchObject({
      role: "SWORDSMAN",
      hp: 7,
    });
  });

  it("is stood on by a melee killer, which advances onto the Grave", () => {
    const start = field(
      [
        { seat: 0, role: "SWORDSMAN", at: WIGHT, hp: 3 },
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
      ],
      { factions: ["UNDEAD", "ORIGINAL"], activeSeat: 1 },
    );
    const undead = seatIdV7(start, 0);
    const killed = attackV7(start, at(5, 3), WIGHT);
    expect(killed.combat.advances).toBe(true);
    expect(killed.state.ninthUnit.wightGraves).toHaveLength(1);
    const next = endTurnUntilV7(killed.state, undead);
    expect(eventsOf(next.events, "WIGHT_RISEN")).toEqual([]);
    expect(unitAtV7(next.state, WIGHT).role).toBe("KNIGHT");
  });

  it("leaves no marked Grave when it leaves no Grave: a center, a Zombie's kill", () => {
    // On a village center a death leaves no Grave.
    const village = field(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 5), hp: 3 },
        { seat: 1, role: "CATAPULT", at: at(5, 7) },
      ],
      { factions: ["UNDEAD", "ORIGINAL"], activeSeat: 1 },
    );
    const onCenter = attackV7(village, at(5, 7), at(5, 5));
    expect(onCenter.combat.defenderDies).toBe(true);
    expect(onCenter.state.graves).toEqual([]);
    expect(onCenter.state.ninthUnit.wightGraves).toEqual([]);
    // Another Undead seat's Zombie kills it: it rises as that seat's Zombie
    // (Infect) and leaves no Grave.
    const infected = field(
      [
        { seat: 0, role: "SWORDSMAN", at: WIGHT, hp: 2 },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["UNDEAD", "UNDEAD"], activeSeat: 1 },
    );
    const bitten = attackV7(infected, at(5, 3), WIGHT);
    expect(bitten.combat.defenderInfected).toBe(true);
    expect(kindsV7(bitten.events)).toContain("UNIT_INFECTED");
    expect(bitten.state.graves).toEqual([]);
    expect(bitten.state.ninthUnit.wightGraves).toEqual([]);
    expect(unitAtV7(bitten.state, WIGHT)).toMatchObject({
      role: "GUARD",
      ownerId: seatIdV7(infected, 1),
    });
  });

  it("does not rise for a Brain that controlled it", () => {
    // A Martian Brain controls the Undead seat's Wight; an Undead Lich
    // kills it. Only a Wight of its own Undead seat rises.
    const start = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 1) },
        {
          seat: 1,
          role: "SWORDSMAN",
          at: WIGHT,
          hp: 2,
          controlledBy: at(4, 1),
        },
        { seat: 1, role: "CATAPULT", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const killed = attackV7(start, at(5, 4), WIGHT);
    expect(killed.combat.defenderDies).toBe(true);
    expect(killed.state.graves).toEqual([WIGHT]);
    expect(killed.state.ninthUnit.wightGraves).toEqual([]);
  });

  it("ends when the Grave is raised or devoured", () => {
    // Seat 1 (Undead) kills seat 0's Wight at range, then its Necromancer
    // raises the Grave as its own Skeleton.
    const start = field(
      [
        { seat: 0, role: "SWORDSMAN", at: WIGHT, hp: 2 },
        { seat: 1, role: "CATAPULT", at: at(5, 4) },
        { seat: 1, role: "CAPTAIN", at: at(6, 3) },
        { seat: 1, role: "RAIDER", at: at(4, 3) },
      ],
      { factions: ["UNDEAD", "UNDEAD"], activeSeat: 1 },
    );
    const owner = seatIdV7(start, 0);
    const killed = attackV7(start, at(5, 4), WIGHT);
    expect(killed.state.ninthUnit.wightGraves).toEqual([
      { at: WIGHT, ownerId: owner },
    ]);
    const raise = commandFor(killed.state, "RAISE_DEAD", at(6, 3));
    if (raise === undefined) throw new Error("no Raise Dead");
    const raised = applyOkV7(killed.state, seatIdV7(start, 1), raise);
    expect(kindsV7(raised.events)).toContain("DEAD_RAISED");
    expect(raised.state.graves).toEqual([]);
    expect(raised.state.ninthUnit.wightGraves).toEqual([]);
    expect(unitAtV7(raised.state, WIGHT)).toMatchObject({
      role: "FIGHTER",
      ownerId: seatIdV7(start, 1),
    });
    // Or its Ghoul walks onto the Grave and devours it.
    const stepped = moveV7(killed.state, at(4, 3), [WIGHT]);
    const devour = commandFor(stepped.state, "DEVOUR", WIGHT);
    if (devour === undefined) throw new Error("no Devour");
    const devoured = applyOkV7(stepped.state, seatIdV7(start, 1), devour);
    expect(devoured.state.graves).toEqual([]);
    expect(devoured.state.ninthUnit.wightGraves).toEqual([]);
    const later = endTurnUntilV7(devoured.state, owner);
    expect(eventsOf(later.events, "WIGHT_RISEN")).toEqual([]);
  });
});

describe("the Shock Trooper: Shock Field", () => {
  const TROOPER = at(5, 2);
  const martians = (
    pieces: readonly CandyPieceV7[],
    enemy: FactionIdV7 = "ORIGINAL",
    activeSeat = 1,
  ) => candyFieldV7(pieces, { factions: ["MARTIAN", enemy], activeSeat });

  it("shocks a Knight that charges it with its Shield up: 12 dealt, 6 taken", () => {
    const start = martians([
      { seat: 0, role: "SWORDSMAN", at: TROOPER },
      { seat: 1, role: "KNIGHT", at: at(4, 2) },
      { seat: 1, role: "KNIGHT", at: at(6, 2) },
    ]);
    expect(shieldAtV7(start, TROOPER)).toBe(3);
    const first = attackV7(start, at(4, 2), TROOPER);
    // 3 to the Shield and 9 to HP (3 left); the retaliation 3 and the
    // shock 3 (the design's worked example).
    expect(first.combat).toMatchObject({
      defenderShieldDamage: 3,
      damageToDefender: 9,
      defenderDies: false,
      retaliation: true,
      shockDamage: 3,
      damageToAttacker: 6,
      attackerDies: false,
    });
    expect(first.attacker?.hp).toBe(13 - 6);
    expect(first.target?.hp).toBe(3);
    expect(shieldAtV7(first.state, TROOPER)).toBe(0);
    // The second Knight, with the Shield down, kills it and takes nothing.
    const second = attackV7(first.state, at(6, 2), TROOPER);
    expect(second.combat).toMatchObject({
      defenderDies: true,
      shockDamage: 0,
      damageToAttacker: 0,
    });
  });

  it("does not shock an attack from two tiles, nor with the Shield down", () => {
    const ranged = martians([
      { seat: 0, role: "SWORDSMAN", at: TROOPER },
      { seat: 1, role: "MARKSMAN", at: at(5, 4) },
    ]);
    expect(attackV7(ranged, at(5, 4), TROOPER).combat.shockDamage).toBe(0);
    const down = martians([
      { seat: 0, role: "SWORDSMAN", at: TROOPER, shield: 0 },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    expect(attackV7(down, at(4, 2), TROOPER).combat.shockDamage).toBe(0);
  });

  it("shocks the blow that kills it, and is credited the kill of what the shock kills", () => {
    // A Trooper at 1 HP with 1 Shield: the Fighter's blow kills it, and the
    // Fighter is still shocked (there is no retaliation).
    const dying = martians([
      { seat: 0, role: "SWORDSMAN", at: TROOPER, hp: 1, shield: 1 },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    const killed = attackV7(dying, at(4, 2), TROOPER);
    expect(killed.combat).toMatchObject({
      defenderDies: true,
      retaliation: false,
      noRetaliationReason: "DEFENDER_DIED",
      shockDamage: 3,
      damageToAttacker: 3,
      attackerDies: false,
      advances: true,
    });
    expect(killed.attacker?.hp).toBe(12 - 3);
    // A Vampire's attack is never answered, but it is shocked: at 3 HP the
    // shock kills it, and the Trooper is credited with the kill.
    const weak = martians(
      [
        { seat: 0, role: "SWORDSMAN", at: TROOPER },
        { seat: 1, role: "KNIGHT", at: at(4, 2), hp: 3 },
      ],
      "UNDEAD",
    );
    const shocked = attackV7(weak, at(4, 2), TROOPER);
    expect(shocked.combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
      shockDamage: 3,
      damageToAttacker: 3,
      attackerDies: true,
      attackerHeal: 0,
    });
    expect(shocked.attacker).toBeUndefined();
    expect(shocked.target?.kills).toBe(1);
    expect(eventsOf(shocked.events, "UNIT_DIED")).toEqual([
      {
        kind: "UNIT_DIED",
        unitId: unitAtV7(weak, at(4, 2)).id,
        cause: "RETALIATION",
      },
    ]);
  });

  it("is an ordinary melee attacker itself: no shock on its own attacks, no heat ray", () => {
    const start = martians(
      [
        { seat: 0, role: "SWORDSMAN", at: TROOPER },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      "ORIGINAL",
      0,
    );
    const struck = attackV7(start, TROOPER, at(4, 2));
    expect(struck.combat).toMatchObject({
      shockDamage: 0,
      rayPower: "NONE",
      retaliation: true,
    });
    // The faction's only melee unit: every other land role reaches 2.
    expect(effectiveRoleRuleV7("SWORDSMAN", "MARTIAN").range).toBe(1);
    expect(effectiveRoleRuleV7("SWORDSMAN", "MARTIAN").abilities).not.toContain(
      "HEAT_RAY",
    );
  });

  it("is reduced by Armoured, and a hit its Shield absorbs does not bite", () => {
    // An Ankylosaurus takes 1 less from every hit: 2 from the shock.
    const armoured = martians(
      [
        { seat: 0, role: "SWORDSMAN", at: TROOPER },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      "DINOSAUR",
    );
    expect(attackV7(armoured, at(4, 2), TROOPER).combat.shockDamage).toBe(2);
    // A wounded Zombie's hit (3) is absorbed by the Shield: no bite, and
    // the Zombie takes the strike back and the shock.
    const zombie = martians(
      [
        { seat: 0, role: "SWORDSMAN", at: TROOPER },
        { seat: 1, role: "GUARD", at: at(4, 2), hp: 10 },
      ],
      "UNDEAD",
    );
    const bite = attackV7(zombie, at(4, 2), TROOPER);
    expect(bite.combat).toMatchObject({
      damageToDefender: 0,
      defenderShieldDamage: 3,
      defenderBitten: false,
      shockDamage: 3,
      attackerDies: false,
    });
    expect(bite.state.bitten).toEqual([]);
    // A fresh Zombie's hit goes through the Shield and bites.
    const fresh = martians(
      [
        { seat: 0, role: "SWORDSMAN", at: TROOPER },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      "UNDEAD",
    );
    const through = attackV7(fresh, at(4, 2), TROOPER);
    expect(through.combat.damageToDefender).toBeGreaterThan(0);
    expect(through.combat.defenderBitten).toBe(true);
  });
});

describe("the Jawbreaker: Rock Hard", () => {
  const TARGET = at(5, 2);
  const versus = (
    enemy: FactionIdV7,
    role: UnitRoleIdV7,
    attacker: CandyPieceV7,
    extra: readonly CandyPieceV7[] = [],
  ) =>
    candyFieldV7(
      [{ seat: 0, role, at: TARGET }, { ...attacker, seat: 1 }, ...extra],
      { factions: ["CANDY", enemy], activeSeat: 1 },
    );

  it("is not pushed by a Push, a Charge!, or a Knockback", () => {
    // A Juggernaut's Push (the resolution; the public preview of this Push
    // keeps its historical detection rule and may say "unknown").
    const push = (role: UnitRoleIdV7) =>
      attackV7(
        versus("ORIGINAL", role, { seat: 1, role: "JUGGERNAUT", at: at(4, 2) }),
        at(4, 2),
        TARGET,
      ).combat.push;
    expect(push("GUARD")).toBe("WILL_PUSH");
    expect(push("SWORDSMAN")).toBe("BLOCKED");
    // A Triceratops's Charge! (and so no follow into its tile).
    const charge = (role: UnitRoleIdV7) =>
      attackV7(
        versus("DINOSAUR", role, {
          seat: 1,
          role: "SWORDSMAN",
          at: at(4, 2),
          activation: movedV7(1),
        }),
        at(4, 2),
        TARGET,
      );
    const pushed = charge("FIGHTER");
    if (!pushed.combat.defenderDies)
      expect(pushed.combat).toMatchObject({
        push: "WILL_PUSH",
        advances: true,
      });
    const held = charge("SWORDSMAN");
    expect(held.combat).toMatchObject({
      push: "BLOCKED",
      advances: false,
      defenderDies: false,
    });
    expect(held.target?.at).toEqual(TARGET);
    expect(kindsV7(held.events)).not.toContain("UNIT_PUSHED");
    // A Steam Cannon's Knockback.
    const knock = (role: UnitRoleIdV7) =>
      attackV7(
        versus("DWARF", role, { seat: 1, role: "CATAPULT", at: at(3, 2) }),
        at(3, 2),
        TARGET,
      ).combat;
    expect(knock("GUARD").push).toBe("WILL_PUSH");
    expect(knock("SWORDSMAN").push).toBe("BLOCKED");
  });

  it("is not pulled by a Tractor Beam", () => {
    const beam = (role: UnitRoleIdV7) => {
      const state = versus("MARTIAN", role, {
        seat: 1,
        role: "RAIDER",
        at: at(3, 2),
      });
      const command: CommandV7 = {
        kind: "TRACTOR_BEAM",
        unitId: unitAtV7(state, at(3, 2)).id,
        targetUnitId: unitAtV7(state, TARGET).id,
      };
      return {
        offered: offered(state, 1).some(
          (candidate) =>
            candidate.kind === "TRACTOR_BEAM" &&
            candidate.targetUnitId === command.targetUnitId,
        ),
        result: applyCommandV7(state, seatIdV7(state, 1), command),
      };
    };
    const pulled = beam("FIGHTER");
    expect(pulled.offered).toBe(true);
    expect(pulled.result.accepted).toBe(true);
    const held = beam("SWORDSMAN");
    expect(held.offered).toBe(false);
    expect(held.result).toMatchObject({
      accepted: false,
      error: {
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      },
    });
  });

  it("is not bounced when it attacks a Marshmallow", () => {
    const bounce = (role: UnitRoleIdV7) => {
      const state = candyFieldV7(
        [
          { seat: 0, role, at: at(4, 2) },
          { seat: 1, role: "GUARD", at: TARGET },
        ],
        { factions: ["CANDY", "CANDY"] },
      );
      return attackV7(state, at(4, 2), TARGET);
    };
    const light = bounce("FIGHTER");
    expect(light.combat.bounce).toBe("WILL_BOUNCE");
    expect(light.attacker?.at).toEqual(at(3, 2));
    const heavy = bounce("SWORDSMAN");
    expect(heavy.combat).toMatchObject({ bounce: "NONE", bounceTo: null });
    expect(heavy.attacker?.at).toEqual(at(4, 2));
    // Damage still applies in full both ways.
    expect(heavy.combat.damageToDefender).toBeGreaterThan(0);
  });

  it("has Sugar Rush and leaves Crumbs like every Candy unit", () => {
    const state = candyFieldV7([
      { seat: 0, role: "SWORDSMAN", at: at(4, 2), hp: 2 },
      { seat: 1, role: "KNIGHT", at: at(5, 2) },
    ]);
    expect(commandFor(state, "SUGAR_RUSH", at(4, 2))).toBeDefined();
    expect(rebakePriceV7("SWORDSMAN")).toBe(3);
    const killed = attackV7(turnOf(state, 1), at(5, 2), at(4, 2));
    expect(eventsOf(killed.events, "CRUMBS_LEFT")).toEqual([
      {
        kind: "CRUMBS_LEFT",
        playerId: seatIdV7(state, 0),
        at: at(4, 2),
        role: "SWORDSMAN",
      },
    ]);
  });
});

describe("the Stegosaurus: the Thagomizer", () => {
  const dinosaurs = (pieces: readonly CandyPieceV7[]) =>
    field(pieces, { factions: ["DINOSAUR", "ORIGINAL"] });

  it("shoots from two or three tiles, never at a neighbour, and never advances", () => {
    const state = dinosaurs([
      { seat: 0, role: "CATAPULT", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 1), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(2, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 3) },
    ]);
    const stego = unitAtV7(state, at(5, 3));
    const targets = offered(state)
      .flatMap((command) =>
        command.kind === "ATTACK" && command.unitId === stego.id
          ? [command.targetUnitId]
          : [],
      )
      .sort((left, right) => left - right);
    // Two tiles (5, 1) and three tiles (2, 3); not the neighbour (5, 2),
    // and not four tiles (1, 3).
    expect(targets).toEqual(
      [unitAtV7(state, at(5, 1)).id, unitAtV7(state, at(2, 3)).id].sort(
        (left, right) => left - right,
      ),
    );
    const kill = attackV7(state, at(5, 3), at(5, 1));
    expect(kill.combat).toMatchObject({
      defenderDies: true,
      advances: false,
      retaliation: false,
      crackApplied: false,
    });
    expect(kill.attacker?.at).toEqual(at(5, 3));
    // It cannot attack after moving.
    const moved = moveV7(state, at(5, 3), [at(6, 3)]);
    expect(commandFor(moved.state, "ATTACK", at(6, 3))).toBeUndefined();
  });

  it("Cracks what it hits: 1 less Defense for every later attack of the turn, and for the strike back", () => {
    const state = dinosaurs([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const guard = unitAtV7(state, at(5, 2));
    // Before: the Guard's Defense 3 hand to hand.
    const before = previewOf(state, at(4, 2), at(5, 2));
    expect(before.defense2).toBe(6);
    const shot = attackV7(state, at(5, 4), at(5, 2));
    expect(shot.combat).toMatchObject({
      crackApplied: true,
      defenderDies: false,
    });
    // The shot itself met the Guard's own Defense (1 from two tiles).
    expect(shot.combat.defense2).toBe(2);
    expect(shot.state.ninthUnit.crackedThisTurn).toEqual([guard.id]);
    // After: Defense 2 hand to hand, more damage dealt and less taken back.
    const after = previewOf(shot.state, at(4, 2), at(5, 2));
    expect(after.defense2).toBe(4);
    const weaker = dinosaurs([
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2), hp: shot.target?.hp ?? 0 },
    ]);
    const uncracked = previewOf(weaker, at(4, 2), at(5, 2));
    expect(after.damageToDefender).toBeGreaterThan(uncracked.damageToDefender);
    expect(after.damageToAttacker).toBeLessThan(uncracked.damageToAttacker);
    // The resolution uses the same Defense as the preview.
    expect(attackV7(shot.state, at(4, 2), at(5, 2)).combat.defense2).toBe(4);
    // The public stats show it.
    const stats = viewForV7(shot.state, seatIdV7(shot.state, 1)).unitStats.find(
      (entry) => entry.unitId === guard.id,
    );
    expect(stats?.statuses).toContain("Cracked: -1 Defense this turn");
    expect(
      stats?.stats
        .find((entry) => entry.id === "DEFENSE")
        ?.modifiers.map((modifier) => modifier.source),
    ).toContain("CRACKED");
  });

  it("does not stack, never goes below Defense 0.5, and ends with the turn", () => {
    const state = dinosaurs([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 0, role: "CATAPULT", at: at(7, 2) },
      { seat: 0, role: "CATAPULT", at: at(9, 4) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 2) },
      { seat: 1, role: "CATAPULT", at: at(9, 2) },
      { seat: 1, role: "GUARD", at: at(1, 2) },
    ]);
    const giant = unitAtV7(state, at(5, 2));
    // A Juggernaut's Defense 4: 3 once Cracked, and 3 after a second and a
    // third Crack.
    const first = attackV7(state, at(5, 4), at(5, 2));
    expect(first.combat.defense2).toBe(8);
    const second = attackV7(first.state, at(3, 2), at(5, 2));
    expect(second.combat).toMatchObject({ defense2: 6, crackApplied: true });
    expect(second.state.ninthUnit.crackedThisTurn).toEqual([giant.id]);
    expect(previewOf(second.state, at(7, 2), at(5, 2)).defense2).toBe(6);
    // A Catapult's Defense 0.5 stays 0.5.
    const catapult = attackV7(second.state, at(9, 4), at(9, 2));
    expect(catapult.combat).toMatchObject({ defense2: 1, crackApplied: true });
    expect(previewOf(catapult.state, at(7, 2), at(9, 2)).defense2).toBe(1);
    // A Cracked Guard, open to ranged attacks (Defense 1 from two tiles),
    // has 0.5 against the next shot.
    const guard = previewOf(
      checkedV7({
        ...state,
        ninthUnit: {
          ...state.ninthUnit,
          crackedThisTurn: [unitAtV7(state, at(1, 2)).id],
        },
      }),
      at(3, 2),
      at(1, 2),
    );
    expect(guard.defense2).toBe(1);
    // The End Turn empties the list.
    const ended = applyOkV7(catapult.state, seatIdV7(state, 0), {
      kind: "END_TURN",
    });
    expect(catapult.state.ninthUnit.crackedThisTurn).toHaveLength(2);
    expect(ended.state.ninthUnit.crackedThisTurn).toEqual([]);
  });

  it("destroys a Field Defense on its target's tile, like every siege unit", () => {
    // The Human Guard stands on a Field Defense in its own land.
    const base = dinosaurs([
      { seat: 0, role: "CATAPULT", at: at(5, 8) },
      { seat: 1, role: "GUARD", at: at(3, 8) },
    ]);
    const state = fieldDefenseV7(base, at(3, 8));
    expect(tileV7(state, at(3, 8)).fieldDefense).toBe(true);
    const shot = attackV7(state, at(5, 8), at(3, 8));
    expect(eventsOf(shot.events, "FIELD_DEFENSE_DESTROYED")).toEqual([
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 8), reason: "CATAPULT" },
    ]);
    expect(tileV7(shot.state, at(3, 8)).fieldDefense).toBe(false);
  });

  it("is laid as an Egg of two turns that fills one slot, and grows", () => {
    const state = dinosaurs([]);
    const lay = productionOf(offered(state), "CATAPULT")[0];
    expect(lay?.kind).toBe("LAY_EGG");
    const laid = applyOkV7(state, seatIdV7(state, 0), lay as CommandV7);
    const egg = laid.state.units.find((unit) => unit.form === "EGG");
    expect(egg?.role).toBe("CATAPULT");
    expect(
      laid.state.eggs.find((entry) => entry.unitId === egg?.id)?.turnsRemaining,
    ).toBe(2);
    expect(roleMechanicsV7("CATAPULT", "DINOSAUR").capacitySlots).toBe(1);
    // Growth: 16 HP Big and 20 HP Alpha with Attack 3.5 (the growth rules).
    expect(effectiveRoleRuleV7("CATAPULT", "DINOSAUR").abilities).toContain(
      "GROW",
    );
  });
});

describe("the Musk Ox: Frostbite", () => {
  const OX = at(5, 2);
  const iceFolk = (pieces: readonly CandyPieceV7[], activeSeat = 1) =>
    candyFieldV7(pieces, { factions: ["ICE_FOLK", "ORIGINAL"], activeSeat });

  it("Freezes a unit that attacks it from the next tile and survives", () => {
    const state = iceFolk([
      { seat: 0, role: "GUARD", at: OX },
      { seat: 1, role: "KNIGHT", at: at(4, 2) },
    ]);
    const ox = unitAtV7(state, OX);
    const knight = unitAtV7(state, at(4, 2));
    const hit = attackV7(state, at(4, 2), OX);
    expect(hit.combat).toMatchObject({
      frostbiteApplied: true,
      attackerDies: false,
      defenderDies: false,
    });
    // Ice Folk Freeze (`pulp_wars-w49.37`): Frozen during its own turn, so
    // through its owner's next turn (two End Turns).
    expect(hit.state.frozen).toEqual([{ unitId: knight.id, turnsLeft: 2 }]);
    expect(eventsOf(hit.events, "UNITS_FROZEN")).toEqual([
      {
        kind: "UNITS_FROZEN",
        playerId: seatIdV7(state, 0),
        sourceUnitId: ox.id,
        source: "FROSTBITE",
        results: [{ unitId: knight.id, turnsLeft: 2 }],
      },
    ]);
  });

  it("does not Freeze a ranged attacker, and Freezes the unit that kills it", () => {
    const ranged = iceFolk([
      { seat: 0, role: "GUARD", at: OX },
      { seat: 1, role: "MARKSMAN", at: at(5, 4) },
    ]);
    const shot = attackV7(ranged, at(5, 4), OX);
    expect(shot.combat.frostbiteApplied).toBe(false);
    expect(shot.state.frozen).toEqual([]);
    const dying = iceFolk([
      { seat: 0, role: "GUARD", at: OX, hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(4, 2) },
    ]);
    const fighter = unitAtV7(dying, at(4, 2));
    const killed = attackV7(dying, at(4, 2), OX);
    expect(killed.combat).toMatchObject({
      defenderDies: true,
      frostbiteApplied: true,
    });
    expect(killed.state.frozen.map((entry) => entry.unitId)).toEqual([
      fighter.id,
    ]);
  });

  it("does not Freeze an attacker that dies of the strike back", () => {
    const state = iceFolk([
      { seat: 0, role: "GUARD", at: OX },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
    ]);
    const lost = attackV7(state, at(4, 2), OX);
    expect(lost.combat).toMatchObject({
      attackerDies: true,
      frostbiteApplied: false,
    });
    expect(lost.state.frozen).toEqual([]);
  });

  it("holds a tile: it cannot attack after moving, and it captures", () => {
    const state = iceFolk(
      [
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
      0,
    );
    expect(commandFor(state, "ATTACK", at(5, 3))).toBeUndefined();
    const moved = moveV7(state, at(5, 3), [at(5, 2)]);
    expect(commandFor(moved.state, "ATTACK", at(5, 2))).toBeUndefined();
    expect(effectiveRoleRuleV7("GUARD", "ICE_FOLK").abilities).toContain(
      "CAPTURE",
    );
  });
});

// Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig's Whirl replaced
// Three Hammers; its tests are in ruleset-v7-dwarf-crowd-control.test.ts.
describe("the Whirligig's heavy-slot neighbour", () => {
  it("leaves the Steam Tank Plated in the heavy slot", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 2) },
        { seat: 1, role: "KNIGHT", at: at(4, 2) },
      ],
      { factions: ["DWARF", "ORIGINAL"], activeSeat: 1 },
    );
    const hit = attackV7(state, at(4, 2), at(5, 2));
    expect(hit.combat).toMatchObject({
      damageToDefender: 4,
      platedApplied: true,
    });
  });
});

describe("the moved units keep their rules in the heavy slot", () => {
  it("the Triceratops charges, destroys Field Defense, and stays out of War Drums", () => {
    // A Caveman and a Triceratops beside a Shaman: the War Drums reach the
    // Caveman only.
    const drums = field(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "SWORDSMAN", at: at(6, 3) },
        { seat: 0, role: "CATAPULT", at: at(5, 4) },
      ],
      { factions: ["DINOSAUR", "ORIGINAL"] },
    );
    const shaman = unitAtV7(drums, at(5, 3));
    expect(isRallyTargetV7(drums, shaman, unitAtV7(drums, at(4, 3)))).toBe(
      true,
    );
    expect(isRallyTargetV7(drums, shaman, unitAtV7(drums, at(6, 3)))).toBe(
      false,
    );
    // The Stegosaurus is a siege unit: out by its label.
    expect(isRallyTargetV7(drums, shaman, unitAtV7(drums, at(5, 4)))).toBe(
      false,
    );
    const rally = commandFor(drums, "RALLY", at(5, 3));
    if (rally === undefined) throw new Error("no War Drums");
    const rallied = applyOkV7(drums, seatIdV7(drums, 0), rally);
    expect(unitAtV7(rallied.state, at(4, 3)).activation.inspired).toBe(true);
    expect(unitAtV7(rallied.state, at(6, 3)).activation.inspired).toBe(false);
    // Charge! after one tile: +1 Attack, the fortification ignored, and the
    // Field Defense destroyed whatever the push does (a unit behind the
    // target blocks it).
    const base = field(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 8), activation: movedV7(1) },
        { seat: 1, role: "GUARD", at: at(3, 8) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { factions: ["DINOSAUR", "ORIGINAL"] },
    );
    const placed = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.role === "SWORDSMAN" ? { ...unit, at: at(4, 8) } : unit,
      ),
    });
    const state = fieldDefenseV7(placed, at(3, 8));
    const charge = attackV7(state, at(4, 8), at(3, 8));
    expect(charge.combat).toMatchObject({
      runUp: 1,
      push: "BLOCKED",
      advances: false,
    });
    expect(charge.combat.fortificationIgnored).toBeGreaterThan(0);
    expect(eventsOf(charge.events, "FIELD_DEFENSE_DESTROYED")).toEqual([
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 8), reason: "CATAPULT" },
    ]);
  });

  it("the Mammoth sweeps both flanks and tramples Field Defense", () => {
    const base = candyFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(4, 8) },
        { seat: 1, role: "GUARD", at: at(3, 8) },
        { seat: 1, role: "FIGHTER", at: at(3, 7) },
        { seat: 1, role: "FIGHTER", at: at(3, 9) },
      ],
      { factions: ["ICE_FOLK", "ORIGINAL"] },
    );
    const state = fieldDefenseV7(base, at(3, 8));
    const hit = attackV7(state, at(4, 8), at(3, 8));
    expect(hit.combat.sweep).toBe(true);
    expect(hit.combat.splash.map((entry) => entry.damage)).toEqual([2, 2]);
    expect(eventsOf(hit.events, "FIELD_DEFENSE_DESTROYED")).toEqual([
      { kind: "FIELD_DEFENSE_DESTROYED", at: at(3, 8), reason: "TRAMPLE" },
    ]);
    // It attacks after moving, as before.
    expect(
      effectiveRoleRuleV7("SWORDSMAN", "ICE_FOLK").mayUsePrimaryActionAfterMove,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The Normal AI.
// ---------------------------------------------------------------------------

/** Seat 0 plays its turn with the Normal policy; the commands it chose. */
function policyTurn(start: GameStateV7): readonly CommandV7[] {
  const actor = seatIdV7(start, 0);
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    commands.push(command);
    if (command.kind === "END_TURN") return commands;
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

describe("the ninth unit: the Normal AI", () => {
  const ARMY: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "MARTIAN",
    "DINOSAUR",
  ];

  it("has the heavy in every army faction's research order, after its first units", () => {
    for (const faction of ARMY) {
      const order = ARMY_RESEARCH_ROLES_V7[faction] ?? [];
      const index = order.indexOf("SWORDSMAN");
      expect(index, faction).toBeGreaterThanOrEqual(1);
      // Every land unit with a technology is in the order once.
      expect([...order].sort(), faction).toEqual(
        LAND_ROLES.filter(
          (role) => effectiveRoleRuleV7(role, faction).technology !== null,
        )
          .filter((role) => faction !== "ORIGINAL" || role !== "RAIDER")
          .filter((role) => faction !== "UNDEAD" || role !== "RAIDER")
          .sort(),
      );
    }
    // The Human order does not expect the heavy at Engineering: its chain
    // is Drill, Engineering, Metallurgy.
    expect(chainTo("ORIGINAL", "METALLURGY")).toEqual([
      "DRILL",
      "ENGINEERING",
      "METALLURGY",
    ]);
  });

  it("researches Metallurgy for the heavy when it is the one unit technology left", () => {
    for (const faction of FACTION_IDS_V7) {
      const techs = TECHNOLOGY_IDS_V7.filter(
        (tech) =>
          tech !== "METALLURGY" &&
          factionTreeV7(faction).nodes.find((node) => node.id === tech)
            ?.branch !== "NAVAL",
      );
      const state = field(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 8) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: [faction, "ORIGINAL"], techs: { 0: techs }, coins: 200 },
      );
      expect(policyTurn(state), faction).toContainEqual({
        kind: "RESEARCH",
        tech: "METALLURGY",
      });
    }
  });

  it("wants the heavy for a line it is short of (the army factions)", () => {
    // An army with every class but the line: the heavy is the dearer line
    // unit, so it is the one bought.
    const counts: ArmyCountsV7 = {
      total: 6,
      byClass: {
        LINE: 0,
        DEFENDER: 2,
        RANGED: 2,
        SIEGE: 1,
        BREAKTHROUGH: 1,
        SKIRMISHER: 0,
        SUPPORT: 0,
      },
      hostileFragile: 0,
    };
    for (const faction of ARMY) {
      const heavy = armyRoleScoreV7(faction, "SWORDSMAN", counts, false);
      expect(heavy, faction).toBeGreaterThan(
        armyRoleScoreV7(faction, "FIGHTER", counts, false),
      );
      for (const role of ["GUARD", "MARKSMAN", "CATAPULT", "KNIGHT"] as const)
        expect(heavy, `${faction} ${role}`).toBeGreaterThan(
          armyRoleScoreV7(faction, role, counts, false),
        );
      // The Triceratops and the Stegosaurus fight as their labels say.
      expect(armyClassV7(effectiveRoleRuleV7("SWORDSMAN", faction))).toBe(
        "LINE",
      );
    }
    const stegosaurus = effectiveRoleRuleV7("CATAPULT", "DINOSAUR");
    expect(armyClassV7(stegosaurus)).toBe("SIEGE");
    expect(policySiegeRuleV7(stegosaurus)).toBe(true);
    expect(
      policySiegeRuleV7(effectiveRoleRuleV7("SWORDSMAN", "DINOSAUR")),
    ).toBe(false);
  });

  it("values the first heavy of the three factions on the older policy", () => {
    const view = (faction: FactionIdV7) => {
      const state = field([], { factions: [faction, "ORIGINAL"] });
      return viewForV7(state, seatIdV7(state, 0));
    };
    const none = { byRole: new Map<UnitRoleIdV7, number>(), front: 0 };
    expect(
      dwarfProductionAdjustmentV7(
        view("DWARF"),
        "SWORDSMAN",
        { ...none, machines: 0 },
        false,
        false,
        false,
      ),
    ).toBeGreaterThan(0);
    // The Whirligig keeps the first-of-role value of the role it took.
    expect(
      dwarfProductionAdjustmentV7(
        view("DWARF"),
        "KNIGHT",
        { ...none, machines: 0 },
        false,
        false,
        false,
      ),
    ).toBeGreaterThan(0);
    expect(
      iceFolkProductionAdjustmentV7(
        view("ICE_FOLK"),
        "SWORDSMAN",
        none,
        false,
        false,
        false,
      ),
    ).toBeGreaterThan(0);
    // The Musk Ox is a body in a threatened city.
    expect(
      iceFolkProductionAdjustmentV7(
        view("ICE_FOLK"),
        "GUARD",
        none,
        true,
        false,
        false,
      ),
    ).toBeGreaterThan(
      iceFolkProductionAdjustmentV7(
        view("ICE_FOLK"),
        "GUARD",
        none,
        false,
        false,
        false,
      ),
    );
    expect(
      candyProductionAdjustmentV7(view("CANDY"), "SWORDSMAN", none, false),
    ).toBeGreaterThan(0);
  });

  it("can buy every faction's heavy and backfill: the policy scores the purchase as a candidate", () => {
    // Every faction, a free capital center, 100 Coins, every technology,
    // an enemy in sight, and an army without a line unit: the production
    // of the heavy is a command the policy would take (a priority of 0 or
    // more), and so is that of the unit that took a moved unit's role (the
    // Dwarf seat still builds Steam Tanks, at Metallurgy, and Whirligigs,
    // at Chivalry).
    const produced: readonly (readonly [FactionIdV7, UnitRoleIdV7])[] = [
      ...FACTION_IDS_V7.map((faction) => [faction, "SWORDSMAN"] as const),
      ["DINOSAUR", "CATAPULT"],
      ["ICE_FOLK", "GUARD"],
      ["DWARF", "KNIGHT"],
    ];
    for (const [faction, role] of produced) {
      const state = field(
        [
          { seat: 0, role: "MARKSMAN", at: at(9, 7) },
          { seat: 0, role: "MARKSMAN", at: at(9, 9) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
          { seat: 1, role: "FIGHTER", at: at(5, 7) },
        ],
        { factions: [faction, "ORIGINAL"] },
      );
      const view = viewForV7(state, seatIdV7(state, 0));
      const command = productionOf(queryPlayerCommandsV7(view), role)[0];
      if (command === undefined) throw new Error(`${faction} ${role}`);
      expect(
        scoreCommandV7(view, command).priority,
        `${faction} ${role}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("stands an Ogre beside the targets its mob can reach", () => {
    const state = field(
      [
        { seat: 0, role: "SWORDSMAN", at: at(5, 5) },
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(8, 2) },
      ],
      { factions: ["GOBLIN", "ORIGINAL"] },
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const ogre = view.units.find((unit) => unit.role === "SWORDSMAN");
    if (ogre === undefined) throw new Error("no Ogre");
    const hostile = (owner: number): boolean => owner !== view.viewer.id;
    // Beside the Guard a Goblin can reach: one target.
    expect(heavyweightMoveValueV7(view, ogre, at(5, 3), hostile)).toBe(
      NINTH_HEAVYWEIGHT_VALUE_V7,
    );
    // Beside the Guard no other Goblin unit is near: nothing.
    expect(heavyweightMoveValueV7(view, ogre, at(8, 3), hostile)).toBe(0);
    expect(heavyweightMoveValueV7(view, ogre, at(5, 5), hostile)).toBe(0);
    // An ordinary Goblin gets nothing from the rule.
    const goblin = view.units.find((unit) => unit.role === "FIGHTER");
    if (goblin === undefined) throw new Error("no Goblin");
    expect(ninthUnitMoveValueV7(view, goblin, at(5, 3), hostile)).toBe(0);
    expect(ninthUnitMoveValueV7(view, ogre, at(5, 3), hostile)).toBe(
      NINTH_HEAVYWEIGHT_VALUE_V7,
    );
  });

  it("puts a Shielded Shock Trooper in front of the line", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "SWORDSMAN", at: at(7, 4) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 0, role: "MARKSMAN", at: at(6, 4) },
        { seat: 1, role: "KNIGHT", at: at(2, 3) },
      ],
      { factions: ["MARTIAN", "ORIGINAL"] },
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const trooper = view.units.find((unit) => unit.role === "SWORDSMAN");
    if (trooper === undefined) throw new Error("no Trooper");
    const hostile = (owner: number): boolean => owner !== view.viewer.id;
    // (5, 3) is between the Knight and both of the units next to it.
    expect(shockScreenMoveValueV7(view, trooper, at(5, 3), hostile)).toBe(
      2 * NINTH_SHOCK_SCREEN_VALUE_V7,
    );
    // Behind them it screens nobody.
    expect(shockScreenMoveValueV7(view, trooper, at(7, 3), hostile)).toBe(0);
    // With its Shield down the rule is off.
    const down = viewForV7(
      checkedV7({
        ...state,
        shields: state.shields.filter((entry) => entry.unitId !== trooper.id),
      }),
      seatIdV7(state, 0),
    );
    expect(shockScreenMoveValueV7(down, trooper, at(5, 3), hostile)).toBe(0);
  });

  it("sends a Whirligig where several targets stand together (Whirl)", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(8, 4) },
        { seat: 1, role: "MARKSMAN", at: at(4, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), hp: 4 },
        { seat: 1, role: "GUARD", at: at(4, 6) },
        { seat: 1, role: "GUARD", at: at(5, 6) },
      ],
      { factions: ["DWARF", "ORIGINAL"] },
    );
    const view = viewForV7(state, seatIdV7(state, 0));
    const top = view.units.find((unit) => unit.role === "KNIGHT");
    if (top === undefined) throw new Error("no Whirligig");
    const hostile = (owner: number): boolean => owner !== view.viewer.id;
    // Three targets next to (5, 3): two beyond the first. Dwarf crowd
    // control (`pulp_wars-w49.33`): the Whirl hits them all unanswered, so
    // healthy units count too (two Guards next to (5, 5): one beyond).
    expect(whirlMoveValueV7(view, top, at(5, 3), hostile)).toBe(
      2 * NINTH_WHIRL_TARGET_VALUE_V7,
    );
    expect(whirlMoveValueV7(view, top, at(5, 5), hostile)).toBe(
      NINTH_WHIRL_TARGET_VALUE_V7,
    );
    expect(whirlMoveValueV7(view, top, at(8, 4), hostile)).toBe(0);
  });

  it("stands on a hostile Wight's Grave, keeps off its own, and does not raise it while it is safe", () => {
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 0, role: "CAPTAIN", at: at(6, 3) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { factions: ["UNDEAD", "ORIGINAL"] },
    );
    const undead = seatIdV7(base, 0);
    const human = seatIdV7(base, 1);
    const marked = checkedV7({
      ...base,
      graves: [at(5, 2)],
      ninthUnit: {
        ...base.ninthUnit,
        wightGraves: [{ at: at(5, 2), ownerId: undead }],
      },
    });
    // Its own seat keeps off the Grave.
    const own = viewForV7(marked, undead);
    const skeleton = own.units.find((unit) => unit.role === "FIGHTER");
    if (skeleton === undefined) throw new Error("no Skeleton");
    const ownHostile = (owner: number): boolean => owner !== undead;
    expect(wightGraveMoveValueV7(own, skeleton, at(5, 2), ownHostile)).toBe(
      -NINTH_OWN_GRAVE_COST_V7,
    );
    expect(wightGraveMoveValueV7(own, skeleton, at(5, 3), ownHostile)).toBe(0);
    // The enemy's unit is drawn onto it.
    const enemy = viewForV7(marked, human);
    const fighter = enemy.units.find((unit) => unit.ownerId === human);
    if (fighter === undefined) throw new Error("no Fighter");
    expect(
      wightGraveMoveValueV7(
        enemy,
        fighter,
        at(5, 2),
        (owner) => owner !== human,
      ),
    ).toBe(NINTH_GRAVE_DENIAL_VALUE_V7);
    // No enemy near the Grave: the Necromancer's Raise Dead is held, and
    // the policy does not choose it.
    expect(ownWightGraveHeldV7(own, [at(5, 2)], ownHostile)).toBe(true);
    expect(ownWightGraveHeldV7(own, [at(9, 2)], ownHostile)).toBe(false);
    expect(
      policyTurn(marked).some((command) => command.kind === "RAISE_DEAD"),
    ).toBe(false);
    // An enemy two tiles from the Grave would stand on it: the Grave is
    // not left for it.
    const threatened = checkedV7({
      ...marked,
      units: marked.units.map((unit) =>
        unit.ownerId === human ? { ...unit, at: at(3, 2) } : unit,
      ),
    });
    expect(
      ownWightGraveHeldV7(
        viewForV7(threatened, undead),
        [at(5, 2)],
        ownHostile,
      ),
    ).toBe(false);
  });
});
