import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import {
  COMMAND_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CommandKindV7,
  type FactionIdV7,
  type FactionTreeIdV7,
  type ImprovementIdV7,
  type ResourceIdV7,
  type TechnologyIdV7,
  type TerrainIdV7,
  type UnitFormV7,
  type UnitRoleIdV7,
} from "../v7/types";

export const TECHNOLOGY_BRANCH_IDS_V7 = deepFreeze([
  "SETTLEMENT",
  "WILDS",
  "MOBILITY",
  "INDUSTRY",
  "NAVAL",
] as const);
export type TechnologyBranchIdV7 = (typeof TECHNOLOGY_BRANCH_IDS_V7)[number];

export type TechnologyUnlockedCommandV7 = Extract<
  CommandKindV7,
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE"
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_FIELD_DEFENSE"
  | "BUILD_MARKET"
  | "CLEAR_FOREST"
  | "REPLANT_FOREST"
  | "BUILD_ROAD"
  | "REDEVELOP"
  | "PILLAGE"
  | "DISBAND"
  | "HARVEST_FISH"
  | "GATHER_PEARLS"
  | "BUILD_PORT"
  | "BUILD_SHIPYARD"
  | "CULTIVATE_FOREST"
  | "BLAST_MOUNTAIN"
  | "LAND_GRANT"
>;

export type TechnologyUnlockV7 =
  | { readonly kind: "COMMAND"; readonly command: TechnologyUnlockedCommandV7 }
  | {
      readonly kind: "RESOURCE_REVEAL";
      readonly resources: readonly ResourceIdV7[];
    }
  | { readonly kind: "UNIT_ROLE"; readonly role: UnitRoleIdV7 }
  | {
      readonly kind: "ECONOMIC_FORMULA";
      readonly improvement: ImprovementIdV7;
      readonly formula:
        | "ADJACENT_FRIENDLY_CONTRIBUTORS"
        | "DISTINCT_BASIC_TYPES"
        | "DISTINCT_ECONOMIC_FAMILIES";
    }
  | { readonly kind: "CONNECTED_FARM_VISUALS" }
  | {
      readonly kind: "FOREST_MOVEMENT_FREEDOM";
      readonly roles: readonly UnitRoleIdV7[];
    }
  | { readonly kind: "MOUNTAIN_MOVEMENT" }
  | { readonly kind: "HIGH_GROUND_VISION"; readonly radiusBonus: 1 }
  | {
      readonly kind: "ROLE_SIGHT";
      readonly role: UnitRoleIdV7;
      readonly radius: 2;
    }
  | {
      readonly kind: "ROAD_MOVEMENT";
      readonly ordinaryStepCost2: 2;
      readonly connectedOrthogonalStepCost2: 1;
    }
  | { readonly kind: "OWNED_CITY_CAPACITY_BONUS"; readonly capacity: 1 }
  | { readonly kind: "ADJACENT_START_TURN_HEALING"; readonly amount: 6 }
  | { readonly kind: "LAND_ROAD_POPULATION"; readonly amount: 1 }
  | { readonly kind: "MARKET_INCOME_MULTIPLIER"; readonly multiplier: 2 }
  | { readonly kind: "ARMS_INDUSTRY_DISCOUNT"; readonly coins: 1 }
  | { readonly kind: "LAND_TRADE_INCOME"; readonly coins: 1 }
  | { readonly kind: "SEA_TRADE_INCOME"; readonly coins: 1 }
  /** Revision 17 Goblins: 1 Coin for each credited hostile kill. */
  | { readonly kind: "PLUNDER"; readonly coins: 1 }
  | { readonly kind: "CAPTAIN_SUPPORT" }
  /** Revision 13 Undead: Necromancer Frenzy (Rally) and Raise Dead. */
  | { readonly kind: "NECROMANCER_SUPPORT" }
  /** Revision 17 Goblins: the Orc Warboss's WAAAGH! (Rally, radius 2). */
  | { readonly kind: "WAAAGH_SUPPORT" }
  /**
   * Revision 19 Dinosaurs: Nesting (the Dinosaur `FORTIFICATION`): Eggs laid
   * by the owner have `eggHp` more HP and hatch `hatchTurns` sooner.
   * Revision 20: every city the owner owns has `citySlots` more unit slots.
   */
  | {
      readonly kind: "NESTING";
      readonly eggHp: 4;
      readonly hatchTurns: 1;
      readonly citySlots: 1;
    }
  /**
   * Revision 20 Dinosaurs: Wallbreaker (the Dinosaur `EXPLOSIVES`): the
   * attacks of the owner's growing land-form units ignore City Walls.
   */
  | { readonly kind: "WALLBREAKER" }
  /**
   * The Martian revision: the Brain's Psychic Command (Rally) and Mind
   * Control (the Martian `ADMINISTRATION`).
   */
  | { readonly kind: "BRAIN_SUPPORT" }
  /**
   * The Martian revision: Force Fields (the Martian `FORTIFICATION`): the
   * owner's Shields also recharge at the end of its turn.
   */
  | { readonly kind: "FORCE_FIELDS" }
  /**
   * The Martian revision: the Disintegrator (the Martian `EXPLOSIVES`): the
   * owner's heat rays ignore the defender's fortification.
   */
  | { readonly kind: "DISINTEGRATOR" }
  /**
   * The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md section 4):
   * the Ice Witch's Cold Snap (the Ice Folk `ADMINISTRATION`).
   */
  | { readonly kind: "WITCH_SUPPORT" }
  /**
   * The Ice Folk revision, Deep Winter (the Ice Folk `FORTIFICATION`):
   * neutral land within two tiles of each own city center is Snow, and
   * Recover heals 6 in own territory.
   */
  | { readonly kind: "DEEP_WINTER" }
  /**
   * The Ice Folk revision, Brittle (the Ice Folk `EXPLOSIVES`): the Shatter
   * threshold is 4 instead of 3.
   */
  | { readonly kind: "BRITTLE" }
  | { readonly kind: "OVERRUN" }
  | {
      readonly kind: "CHARGE_BONUS";
      readonly attack: 1;
      readonly minimumMove: 2;
    }
  | { readonly kind: "MELEE_FIELD_DEMOLITION" }
  | { readonly kind: "NAVAL_TRAINING_DISCOUNT"; readonly coins: 2 }
  | { readonly kind: "FIRST_HOSTILE_CAPTURE_SPOILS"; readonly coins: 2 };

export interface TechnologyNodeV7 {
  readonly id: TechnologyIdV7;
  readonly branch: TechnologyBranchIdV7;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyIdV7[];
  readonly unlocks: readonly TechnologyUnlockV7[];
  readonly unlockedRoles: readonly UnitRoleIdV7[];
}

export type UnitRoleAbilityV7 =
  | "ATTACK"
  | "CAPTURE"
  | "CHARGE"
  | "RALLY"
  | "TEND_WOUNDED"
  | "OVERRUN"
  | "ESCAPE"
  | "PUSH"
  // Revision 13 Undead ability identifiers.
  | "RAISE_DEAD"
  | "DEVOUR"
  | "INFECT"
  | "LIFESTEAL"
  | "WAIL"
  // Revision 14: a Lich attack plagues living survivors; Zombie damage bites
  // living land units; a Vampire attack receives no retaliation.
  | "PLAGUE"
  | "BITE"
  | "UNANSWERED"
  // Revision 17 Goblins: goblin-crewed units may blow themselves up (the
  // KABOOM command); the Troll regenerates.
  | "KABOOM"
  | "REGENERATE"
  // Revision 19 Dinosaurs: the Shaman Hatch (a command), the Spitter's
  // Acid, the Ankylosaurus's Armoured, and growth from kills instead of
  // Promotion. Revision 20: the Triceratops's passive Charge! (`LINEBREAKER`;
  // `CHARGE` is the Raider's) replaces the Stampede command.
  | "LINEBREAKER"
  | "HATCH"
  | "ACID"
  | "ARMOURED"
  | "GROW"
  // The Martian revision: heat rays (Ray Gunner, Tripod, Colossus), the
  // Tripod's Pierce, the Shield Projector's Force Field, the Saucer's Beam
  // Down, the Brain's Mind Control, the Mothership's Tractor Beam, and the
  // public mirrors of the movement modes `FLY` and `STRIDE`.
  | "HEAT_RAY"
  | "PIERCE"
  | "FORCE_FIELD"
  | "BEAM_DOWN"
  | "MIND_CONTROL"
  | "TRACTOR_BEAM"
  | "FLY"
  | "STRIDE"
  // The Ice Folk revision (section 3): Mountain-born, the Yeti's Rockfall,
  // the Sled's Bolas, the Snow Hunter's Cold Blood, the Mammoth's Sweep and
  // Trample, the Ice Witch's Blizzard and Cold Snap, the Boulder Yeti's
  // Boulders, the Sabretooth's Prowl, and the Frost Giant's Cold Aura.
  | "MOUNTAIN_BORN"
  | "ROCKFALL"
  | "BOLAS"
  | "COLD_BLOOD"
  | "SWEEP"
  | "TRAMPLE"
  | "BLIZZARD"
  | "COLD_SNAP"
  | "BOULDERS"
  | "PROWL"
  | "COLD_AURA";

/**
 * The Martian revision (section 7): how a land-form unit moves. `STRIDE`
 * (walkers) and `FLY` (flyers) are the Martian machines; every other role of
 * every faction is `GROUND`.
 */
export type MovementModeV7 = "GROUND" | "STRIDE" | "FLY";

export interface EffectiveRoleRuleV7 {
  readonly role: UnitRoleIdV7;
  readonly label: string;
  readonly tacticalRole:
    | "LINE"
    | "SKIRMISHER"
    | "RANGED"
    | "DEFENDER"
    | "SUPPORT"
    | "SIEGE"
    | "BREAKTHROUGH"
    | "MYTHIC"
    | "NAVAL_SCREEN"
    | "NAVAL_CAPITAL";
  readonly cost: number | null;
  readonly maxHp: number;
  readonly attack2: number;
  readonly defense2: number;
  readonly move: number;
  readonly range: number;
  readonly minimumRange: number;
  readonly sightRadius: number;
  readonly technology: TechnologyIdV7 | null;
  readonly mayUsePrimaryActionAfterMove: boolean;
  readonly abilities: readonly UnitRoleAbilityV7[];
}

/**
 * Engine-only per-role mechanics that the historical role-rule shape does not
 * carry. They resolve through the owner's faction like every role rule.
 */
export interface RoleMechanicsV7 {
  /** A melee kill moves the surviving attacker onto the defender's tile. */
  readonly advancesAfterKill: boolean;
  /** An attack splashes onto units around the primary target. */
  readonly splash: boolean;
  /**
   * Revision 17 splash target mode: `HOSTILE` (Battleship, Lich) splashes
   * only hostile units; `ALL` (the Goblin Bomb Chucker's bomb) splashes
   * every other unit, own and allied included (friendly fire). Irrelevant
   * without `splash`.
   */
  readonly splashTargets: "HOSTILE" | "ALL";
  /**
   * Revision 17: the role may `BUILD_FIELD_DEFENSE` (with Fortification):
   * the Fighter and Guard roles of every faction except the Goblin Goblin.
   */
  readonly buildsFieldDefense: boolean;
  /** Revision 17: Rally (Frenzy, WAAAGH!) reach in Chebyshev distance. */
  readonly rallyRadius: 1 | 2;
  /** Revision 17: Rally also reaches `SUPPORT` and `SIEGE` roles (WAAAGH!). */
  readonly rallyReachesSupportAndSiege: boolean;
  /** Revision 17: fixed Kaboom damage, or null without Kaboom. */
  readonly kaboomDamage: number | null;
  /** Revision 17: fixed death-blast damage, or null for a non-exploder. */
  readonly deathBlastDamage: number | null;
  /** Revision 17: HP regenerated at its owner's Start Turn (the Troll). */
  readonly regeneration: number;
  /**
   * Revision 19: the city capacity the unit (or its Egg) uses: 2 for the
   * Triceratops, T-Rex, and Brontosaurus, 1 for every other role.
   */
  readonly capacitySlots: 1 | 2;
  /**
   * Revision 19: the Egg's hatch time in owner Start Turns, or null for a
   * role that is not egg-laid.
   */
  readonly hatchTurns: 1 | 2 | 3 | 4 | null;
  /**
   * Revision 20 Charge!: `attack2` per tile moved this turn before the
   * attack, up to `RUN_UP_MAXIMUM_TILES_V7` tiles (0 without Charge!).
   */
  readonly runUpBonus2: 0 | 2;
  /** Revision 19 Armoured: damage removed from every hit of 2 or more. */
  readonly armourReduction: 0 | 1;
  /**
   * The Martian revision (section 5.1): the role's Shield maximum (0 for
   * every role of every other faction and for boats).
   */
  readonly shield: 0 | 1 | 2 | 3 | 4;
  /** The Martian revision (section 7): the role's movement mode. */
  readonly movementMode: MovementModeV7;
  /**
   * The Ice Folk revision (section 7.1): Mountain-born. In land form the
   * unit enters a Mountain without Engineering and a Mountain does not end
   * its Move. False for every role of every other faction.
   */
  readonly mountainBorn: boolean;
  /**
   * The Ice Folk revision (section 6.2): Glide. In land form a step that
   * leaves a Snow tile costs one half-point. True for every Ice Folk land
   * role except the Sabretooth; false for every other faction.
   */
  readonly glides: boolean;
  /**
   * The Ice Folk revision (section 7.7): Prowl. Entering hostile zone of
   * control does not end the unit's Move (the Sabretooth).
   */
  readonly ignoresZocStops: boolean;
  /** The Ice Folk revision (section 7.5): the Sweep damage (0 without). */
  readonly sweepDamage: number;
  /**
   * The Ice Folk revision (section 7.5): Trample, every attack destroys
   * Field Defense on the target's tile (reason `TRAMPLE`).
   */
  readonly tramplesFieldDefense: boolean;
  /**
   * The Ice Folk revision (section 7.6): Boulders, every attack ignores the
   * defender's fortification for the whole exchange (cover stays).
   */
  readonly ignoresFortification: boolean;
  /** The Ice Folk revision (section 7.6): the Planted `attack2` bonus. */
  readonly plantedBonus2: number;
  /**
   * The Ice Folk revision (section 7.2): the `attack2` of a Rockfall (an
   * attack at distance 2 from a Mountain), or 0 without Rockfall.
   */
  readonly rockfallAttack2: number;
  /** The Ice Folk revision (section 7.4): the Cold Blood `attack2` bonus. */
  readonly coldBloodBonus2: number;
}

export interface FactionTechnologyTreeV7 {
  readonly id: FactionTreeIdV7;
  readonly faction: FactionIdV7;
  readonly startingTechIds: readonly [];
  readonly nodes: readonly TechnologyNodeV7[];
  readonly roleRules: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
  readonly roleMechanics: Readonly<Record<UnitRoleIdV7, RoleMechanicsV7>>;
}

export type BasicEconomicCommandKindV7 =
  | "HARVEST_FRUIT"
  | "HUNT_GAME"
  | "HARVEST_FISH"
  | "BUILD_FARM"
  | "BUILD_LUMBER_CAMP"
  | "BUILD_MINE";
export interface BasicEconomicActionRuleV7 {
  readonly command: BasicEconomicCommandKindV7;
  readonly technology: TechnologyIdV7;
  readonly terrain: TerrainIdV7;
  readonly resource: ResourceIdV7 | null;
  readonly cost: number;
  readonly population: number;
  readonly populationCategory: "PERMANENT" | "LIVE";
  readonly improvement: ImprovementIdV7 | null;
}
export const BASIC_ECONOMIC_ACTIONS_V7 = deepFreeze({
  HARVEST_FRUIT: {
    command: "HARVEST_FRUIT",
    technology: "GATHERING",
    terrain: "GRASS",
    resource: "FRUIT",
    cost: 2,
    population: 1,
    populationCategory: "PERMANENT",
    improvement: null,
  },
  HUNT_GAME: {
    command: "HUNT_GAME",
    technology: "HUNTING",
    terrain: "FOREST",
    resource: "GAME",
    cost: 2,
    population: 1,
    populationCategory: "PERMANENT",
    improvement: null,
  },
  HARVEST_FISH: {
    command: "HARVEST_FISH",
    technology: "SHORECRAFT",
    terrain: "SHALLOW_WATER",
    resource: "FISH",
    cost: 2,
    population: 1,
    populationCategory: "PERMANENT",
    improvement: null,
  },
  BUILD_FARM: {
    command: "BUILD_FARM",
    technology: "FARMING",
    terrain: "GRASS",
    resource: "FERTILE_GROUND",
    cost: 5,
    population: 2,
    populationCategory: "LIVE",
    improvement: "FARM",
  },
  BUILD_LUMBER_CAMP: {
    command: "BUILD_LUMBER_CAMP",
    technology: "FORESTRY",
    terrain: "FOREST",
    resource: null,
    cost: 3,
    population: 1,
    populationCategory: "LIVE",
    improvement: "LUMBER_CAMP",
  },
  BUILD_MINE: {
    command: "BUILD_MINE",
    technology: "ENGINEERING",
    terrain: "MOUNTAIN",
    resource: "ORE",
    cost: 5,
    population: 2,
    populationCategory: "LIVE",
    improvement: "MINE",
  },
} satisfies Readonly<
  Record<BasicEconomicCommandKindV7, BasicEconomicActionRuleV7>
>);

export type SpatialEconomicCommandKindV7 =
  | "BUILD_WINDMILL"
  | "BUILD_SAWMILL"
  | "BUILD_FORGE"
  | "BUILD_WORKSHOP"
  | "BUILD_MARKET";
export interface SpatialEconomicActionRuleV7 {
  readonly command: SpatialEconomicCommandKindV7;
  readonly technology: TechnologyIdV7;
  readonly cost: number;
  readonly improvement: ImprovementIdV7;
  readonly placementMinimum: number;
}
export const SPATIAL_ECONOMIC_ACTIONS_V7 = deepFreeze({
  BUILD_WINDMILL: {
    command: "BUILD_WINDMILL",
    technology: "MILLING",
    cost: 5,
    improvement: "WINDMILL",
    placementMinimum: 1,
  },
  BUILD_SAWMILL: {
    command: "BUILD_SAWMILL",
    technology: "SAWMILLING",
    cost: 5,
    improvement: "SAWMILL",
    placementMinimum: 1,
  },
  BUILD_FORGE: {
    command: "BUILD_FORGE",
    technology: "METALLURGY",
    cost: 6,
    improvement: "FORGE",
    placementMinimum: 1,
  },
  BUILD_WORKSHOP: {
    command: "BUILD_WORKSHOP",
    technology: "ENGINEERING",
    cost: 4,
    improvement: "WORKSHOP",
    placementMinimum: 1,
  },
  BUILD_MARKET: {
    command: "BUILD_MARKET",
    technology: "ADMINISTRATION",
    cost: 6,
    improvement: "MARKET",
    placementMinimum: 1,
  },
} satisfies Readonly<
  Record<SpatialEconomicCommandKindV7, SpatialEconomicActionRuleV7>
>);

function node(
  id: TechnologyIdV7,
  branch: TechnologyBranchIdV7,
  tier: 1 | 2 | 3,
  prerequisites: readonly TechnologyIdV7[] = [],
  unlocks: readonly TechnologyUnlockV7[] = [],
): TechnologyNodeV7 {
  return deepFreeze({
    id,
    branch,
    tier,
    prerequisites: [...prerequisites],
    unlocks: [...unlocks],
    unlockedRoles: unlocks.flatMap((unlock) =>
      unlock.kind === "UNIT_ROLE" ? [unlock.role] : [],
    ),
  });
}

export const ORIGINAL_BASELINE_V5_NODES = deepFreeze([
  node(
    "GATHERING",
    "SETTLEMENT",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["FERTILE_GROUND"] },
      { kind: "COMMAND", command: "HARVEST_FRUIT" },
    ],
  ),
  node(
    "FARMING",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "COMMAND", command: "BUILD_FARM" },
      { kind: "CONNECTED_FARM_VISUALS" },
    ],
  ),
  node(
    "MILLING",
    "SETTLEMENT",
    3,
    ["FARMING"],
    [
      { kind: "COMMAND", command: "BUILD_WINDMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WINDMILL",
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "ADJACENT_START_TURN_HEALING", amount: 6 },
    ],
  ),
  node(
    "ADMINISTRATION",
    "SETTLEMENT",
    2,
    ["GATHERING"],
    [
      { kind: "UNIT_ROLE", role: "CAPTAIN" },
      { kind: "CAPTAIN_SUPPORT" },
      { kind: "COMMAND", command: "BUILD_MARKET" },
      { kind: "COMMAND", command: "DISBAND" },
    ],
  ),
  node(
    "PLANNING",
    "SETTLEMENT",
    3,
    ["ADMINISTRATION"],
    [
      { kind: "OWNED_CITY_CAPACITY_BONUS", capacity: 1 },
      { kind: "COMMAND", command: "LAND_GRANT" },
    ],
  ),
  node("HUNTING", "WILDS", 1, [], [{ kind: "COMMAND", command: "HUNT_GAME" }]),
  node(
    "FORESTRY",
    "WILDS",
    2,
    ["HUNTING"],
    [
      { kind: "COMMAND", command: "BUILD_LUMBER_CAMP" },
      { kind: "COMMAND", command: "CLEAR_FOREST" },
    ],
  ),
  node(
    "SAWMILLING",
    "WILDS",
    3,
    ["FORESTRY"],
    [
      { kind: "COMMAND", command: "BUILD_SAWMILL" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "SAWMILL",
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "UNIT_ROLE", role: "CATAPULT" },
    ],
  ),
  node(
    "MARKSMANSHIP",
    "WILDS",
    2,
    ["HUNTING"],
    [{ kind: "UNIT_ROLE", role: "MARKSMAN" }],
  ),
  node(
    "FIELDCRAFT",
    "WILDS",
    3,
    ["MARKSMANSHIP"],
    [
      { kind: "COMMAND", command: "REPLANT_FOREST" },
      { kind: "FOREST_MOVEMENT_FREEDOM", roles: ["RAIDER", "MARKSMAN"] },
      { kind: "ROLE_SIGHT", role: "MARKSMAN", radius: 2 },
    ],
  ),
  node(
    "SCOUTING",
    "MOBILITY",
    1,
    [],
    [
      { kind: "UNIT_ROLE", role: "RAIDER" },
      { kind: "ROLE_SIGHT", role: "RAIDER", radius: 2 },
    ],
  ),
  node(
    "ROADS",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [
      { kind: "COMMAND", command: "BUILD_ROAD" },
      {
        kind: "ROAD_MOVEMENT",
        ordinaryStepCost2: 2,
        connectedOrthogonalStepCost2: 1,
      },
      { kind: "LAND_ROAD_POPULATION", amount: 1 },
    ],
  ),
  node(
    "COMMERCE",
    "MOBILITY",
    3,
    ["ROADS"],
    // Revision 14 (E2): Commerce no longer doubles Market income.
    [{ kind: "LAND_TRADE_INCOME", coins: 1 }],
  ),
  node(
    "RAIDING",
    "MOBILITY",
    2,
    ["SCOUTING"],
    [
      { kind: "COMMAND", command: "PILLAGE" },
      { kind: "CHARGE_BONUS", attack: 1, minimumMove: 2 },
    ],
  ),
  node(
    "CHIVALRY",
    "MOBILITY",
    3,
    ["RAIDING"],
    [
      { kind: "UNIT_ROLE", role: "KNIGHT" },
      { kind: "OVERRUN" },
      { kind: "COMMAND", command: "CULTIVATE_FOREST" },
    ],
  ),
  node(
    "DRILL",
    "INDUSTRY",
    1,
    [],
    [
      { kind: "RESOURCE_REVEAL", resources: ["ORE"] },
      { kind: "UNIT_ROLE", role: "GUARD" },
      { kind: "FIRST_HOSTILE_CAPTURE_SPOILS", coins: 2 },
    ],
  ),
  node(
    "ENGINEERING",
    "INDUSTRY",
    2,
    ["DRILL"],
    [
      { kind: "MOUNTAIN_MOVEMENT" },
      { kind: "HIGH_GROUND_VISION", radiusBonus: 1 },
      { kind: "COMMAND", command: "BUILD_MINE" },
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      { kind: "COMMAND", command: "REDEVELOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
    ],
  ),
  node(
    "METALLURGY",
    "INDUSTRY",
    3,
    ["ENGINEERING"],
    [
      { kind: "COMMAND", command: "BUILD_FORGE" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "FORGE",
        formula: "ADJACENT_FRIENDLY_CONTRIBUTORS",
      },
      { kind: "ARMS_INDUSTRY_DISCOUNT", coins: 1 },
    ],
  ),
  node(
    "FORTIFICATION",
    "INDUSTRY",
    2,
    ["DRILL"],
    [{ kind: "COMMAND", command: "BUILD_FIELD_DEFENSE" }],
  ),
  node(
    "EXPLOSIVES",
    "INDUSTRY",
    3,
    ["FORTIFICATION"],
    [
      { kind: "COMMAND", command: "BLAST_MOUNTAIN" },
      { kind: "MELEE_FIELD_DEMOLITION" },
    ],
  ),
  node(
    "SHORECRAFT",
    "NAVAL",
    1,
    [],
    [
      { kind: "COMMAND", command: "HARVEST_FISH" },
      { kind: "COMMAND", command: "BUILD_PORT" },
      { kind: "UNIT_ROLE", role: "PATROL_BOAT" },
    ],
  ),
  node(
    "NAVIGATION",
    "NAVAL",
    2,
    ["SHORECRAFT"],
    [
      { kind: "COMMAND", command: "GATHER_PEARLS" },
      { kind: "SEA_TRADE_INCOME", coins: 1 },
    ],
  ),
  node(
    "NAVAL_ENGINEERING",
    "NAVAL",
    3,
    ["NAVIGATION"],
    [
      { kind: "UNIT_ROLE", role: "BATTLESHIP" },
      { kind: "COMMAND", command: "BUILD_SHIPYARD" },
      { kind: "NAVAL_TRAINING_DISCOUNT", coins: 2 },
    ],
  ),
] as const);

/**
 * Revision 16 (2-tile boats): an embarked land unit has Move 2 on water, and
 * `DISEMBARK` spends one of those points, so it is legal only while the
 * unit's Move this turn has spent at most `EMBARKED_LANDING_MAX_SPENT_V7`.
 */
export const EMBARKED_MOVE_V7 = 2;
export const EMBARKED_LANDING_MAX_SPENT_V7 = EMBARKED_MOVE_V7 - 1;

/** Movement points an embarked unit's Move has spent this turn (section 5.2). */
export function embarkedMovementSpentV7(activation: {
  readonly moved: boolean;
  readonly movedPathLength: number;
}): number {
  return activation.moved ? activation.movedPathLength : 0;
}

const role = (input: EffectiveRoleRuleV7): EffectiveRoleRuleV7 =>
  deepFreeze(input);
export const ORIGINAL_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  // Revision 20 section 6.3 (`pulp_wars-0hi.3`, identity 7r23): the four core
  // Human land roles have +2 maximum HP (Fighter, Raider, Marksman 12 from
  // 10; Guard 17 from 15). No other faction copies these rules.
  FIGHTER: role({
    role: "FIGHTER",
    label: "Fighter",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 12,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Raider",
    tacticalRole: "SKIRMISHER",
    cost: 4,
    maxHp: 12,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "ESCAPE"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Marksman",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 12,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Guard",
    tacticalRole: "DEFENDER",
    cost: 3,
    maxHp: 17,
    attack2: 3,
    defense2: 6,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Captain",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 10,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY", "TEND_WOUNDED"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Catapult",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    attack2: 7,
    defense2: 1,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Knight",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 10,
    attack2: 6,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "OVERRUN"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Juggernaut",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 40,
    attack2: 8,
    defense2: 8,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH"],
  }),
  PATROL_BOAT: role({
    role: "PATROL_BOAT",
    label: "Patrol Boat",
    tacticalRole: "NAVAL_SCREEN",
    cost: 5,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    // Revision 16 (2-tile boats): Move 2 (was 3).
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SHORECRAFT",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK"],
  }),
  BATTLESHIP: role({
    role: "BATTLESHIP",
    label: "Battleship",
    tacticalRole: "NAVAL_CAPITAL",
    cost: 16,
    maxHp: 25,
    attack2: 12,
    defense2: 8,
    move: 2,
    range: 3,
    minimumRange: 1,
    sightRadius: 3,
    technology: "NAVAL_ENGINEERING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK"],
  }),
});

const mechanics = (
  overrides: Partial<Record<UnitRoleIdV7, Partial<RoleMechanicsV7>>>,
): Readonly<Record<UnitRoleIdV7, RoleMechanicsV7>> =>
  deepFreeze(
    Object.fromEntries(
      UNIT_ROLE_IDS_V7.map((roleId) => [
        roleId,
        {
          advancesAfterKill: true,
          splash: false,
          splashTargets: "HOSTILE",
          buildsFieldDefense: roleId === "FIGHTER" || roleId === "GUARD",
          rallyRadius: 1,
          rallyReachesSupportAndSiege: false,
          kaboomDamage: null,
          deathBlastDamage: null,
          regeneration: 0,
          capacitySlots: 1,
          hatchTurns: null,
          runUpBonus2: 0,
          armourReduction: 0,
          shield: 0,
          movementMode: "GROUND",
          mountainBorn: false,
          glides: false,
          ignoresZocStops: false,
          sweepDamage: 0,
          tramplesFieldDefense: false,
          ignoresFortification: false,
          plantedBonus2: 0,
          rockfallAttack2: 0,
          coldBloodBonus2: 0,
          ...overrides[roleId],
        },
      ]),
    ) as Record<UnitRoleIdV7, RoleMechanicsV7>,
  );

export const ORIGINAL_ROLE_MECHANICS_V7 = mechanics({
  CATAPULT: { advancesAfterKill: false },
  BATTLESHIP: { splash: true },
});

export const ORIGINAL_BASELINE_V5_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ORIGINAL_BASELINE_V5",
  faction: "ORIGINAL",
  startingTechIds: [],
  nodes: ORIGINAL_BASELINE_V5_NODES,
  roleRules: ORIGINAL_ROLE_RULES_V7,
  roleMechanics: ORIGINAL_ROLE_MECHANICS_V7,
});

/**
 * Revision 13 Undead technology graph: identical to ORIGINAL_BASELINE_V5
 * except that Administration grants Necromancer support instead of Captain
 * support and Chivalry grants no Overrun.
 */
export const UNDEAD_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  ORIGINAL_BASELINE_V5_NODES.map((original) =>
    node(
      original.id,
      original.branch,
      original.tier,
      original.prerequisites,
      original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? [{ kind: "NECROMANCER_SUPPORT" }]
          : unlock.kind === "OVERRUN"
            ? []
            : [unlock],
      ),
    ),
  ),
);

export const UNDEAD_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  // Revision 20 section 6.1: the Skeleton states its own rule (it used to
  // copy the Human Fighter's), so a Human Fighter change does not move it.
  FIGHTER: role({
    role: "FIGHTER",
    label: "Skeleton",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Ghoul",
    tacticalRole: "SKIRMISHER",
    cost: 3,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "DEVOUR"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Banshee",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 8,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 0,
    minimumRange: 0,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["CAPTURE", "WAIL"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Zombie",
    tacticalRole: "DEFENDER",
    cost: 3,
    // Revision 15 (Undead fragility): 18 HP (was 20); risings keep 10 HP.
    maxHp: 18,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "INFECT", "BITE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Necromancer",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 10,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY", "RAISE_DEAD"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Lich",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    // Revision 14 (L2): Attack 3 (was 2.5).
    attack2: 6,
    defense2: 2,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "PLAGUE"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Vampire",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 10,
    attack2: 6,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "LIFESTEAL", "UNANSWERED"],
  }),
  JUGGERNAUT: role({
    ...ORIGINAL_ROLE_RULES_V7.JUGGERNAUT,
    label: "Abomination",
    abilities: ["ATTACK", "CAPTURE", "PUSH"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * The Zombie never advances after a kill. The Lich keeps Catapult parity and
 * adds the Battleship splash rule (revision 13 section 6.7). The `SPLASH`
 * capability is this engine mechanic rather than a declared role ability, so
 * Human public role abilities stay exactly as in revision 12.
 */
export const UNDEAD_ROLE_MECHANICS_V7 = mechanics({
  GUARD: { advancesAfterKill: false },
  CATAPULT: { advancesAfterKill: false, splash: true },
  BATTLESHIP: { splash: true },
});

export const UNDEAD_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "UNDEAD_BASELINE_V1",
  faction: "UNDEAD",
  startingTechIds: [],
  nodes: UNDEAD_BASELINE_V1_NODES,
  roleRules: UNDEAD_ROLE_RULES_V7,
  roleMechanics: UNDEAD_ROLE_MECHANICS_V7,
});

/**
 * Revision 17 Goblin technology graph: identical to ORIGINAL_BASELINE_V5
 * except that Administration grants WAAAGH! support instead of Captain
 * support and Commerce (displayed as Plunder) grants Plunder instead of land
 * trade. Chivalry keeps Overrun (displayed as Ram).
 */
export const GOBLIN_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  ORIGINAL_BASELINE_V5_NODES.map((original) =>
    node(
      original.id,
      original.branch,
      original.tier,
      original.prerequisites,
      original.unlocks.map((unlock): TechnologyUnlockV7 =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? { kind: "WAAAGH_SUPPORT" }
          : unlock.kind === "LAND_TRADE_INCOME"
            ? { kind: "PLUNDER", coins: 1 }
            : unlock,
      ),
    ),
  ),
);

/** Revision 17 section 3: the Goblin roster. */
export const GOBLIN_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    label: "Goblin",
    tacticalRole: "LINE",
    cost: 1,
    maxHp: 6,
    attack2: 3,
    defense2: 1,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "KABOOM"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Wolf Rider",
    tacticalRole: "SKIRMISHER",
    cost: 3,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "KABOOM"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Bomb Chucker",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 8,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 2,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "KABOOM"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Orc Brute",
    tacticalRole: "DEFENDER",
    cost: 3,
    maxHp: 15,
    attack2: 4,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Orc Warboss",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 12,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Rocket Cart",
    tacticalRole: "SIEGE",
    cost: 7,
    maxHp: 8,
    attack2: 7,
    defense2: 1,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "KABOOM"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Scrap Buggy",
    tacticalRole: "BREAKTHROUGH",
    cost: 8,
    maxHp: 10,
    attack2: 6,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "OVERRUN", "KABOOM"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Troll",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 40,
    attack2: 8,
    defense2: 6,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH", "REGENERATE"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * Revision 17 Goblin engine mechanics: only the Orc Brute builds Field
 * Defense; the Orc Warboss's WAAAGH! reaches radius 2 including support and
 * siege roles; goblin-crewed roles carry Kaboom damage and the Bomb Chucker,
 * Rocket Cart, and Scrap Buggy death-blast damage (resolved by
 * `explosions.ts`); the Bomb Chucker's bomb splashes every other unit
 * next to its target (splash target mode `ALL`, friendly fire); the Troll
 * regenerates 4 HP. Boats are Human boats.
 */
export const GOBLIN_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: { buildsFieldDefense: false, kaboomDamage: 5 },
  RAIDER: { kaboomDamage: 4 },
  MARKSMAN: {
    splash: true,
    splashTargets: "ALL",
    kaboomDamage: 4,
    deathBlastDamage: 2,
  },
  CAPTAIN: { rallyRadius: 2, rallyReachesSupportAndSiege: true },
  CATAPULT: { advancesAfterKill: false, kaboomDamage: 5, deathBlastDamage: 4 },
  KNIGHT: { kaboomDamage: 5, deathBlastDamage: 4 },
  JUGGERNAUT: { regeneration: 4 },
  BATTLESHIP: { splash: true },
});

export const GOBLIN_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "GOBLIN_BASELINE_V1",
  faction: "GOBLIN",
  startingTechIds: [],
  nodes: GOBLIN_BASELINE_V1_NODES,
  roleRules: GOBLIN_ROLE_RULES_V7,
  roleMechanics: GOBLIN_ROLE_MECHANICS_V7,
});

/**
 * Revision 19 Dinosaur technology graph: identical to ORIGINAL_BASELINE_V5
 * except that Fortification (displayed as Nesting) grants `NESTING` instead
 * of `BUILD_FIELD_DEFENSE`. Chivalry keeps Overrun (displayed as Rampage) and
 * Raiding keeps the Charge bonus (displayed as Pounce). Revision 20: Nesting
 * also grants a city slot, and Explosives (displayed as Wallbreaker) keeps
 * both of its unlocks and adds `WALLBREAKER`.
 */
export const DINOSAUR_BASELINE_V1_NODES: readonly TechnologyNodeV7[] =
  deepFreeze(
    ORIGINAL_BASELINE_V5_NODES.map((original) =>
      node(
        original.id,
        original.branch,
        original.tier,
        original.prerequisites,
        [
          ...original.unlocks.map((unlock): TechnologyUnlockV7 =>
            unlock.kind === "COMMAND" &&
            unlock.command === "BUILD_FIELD_DEFENSE"
              ? { kind: "NESTING", eggHp: 4, hatchTurns: 1, citySlots: 1 }
              : unlock,
          ),
          ...(original.id === "EXPLOSIVES"
            ? [{ kind: "WALLBREAKER" } as const]
            : []),
        ],
      ),
    ),
  );

/** Revision 19 section 3: the Dinosaur roster. */
export const DINOSAUR_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  // Revision 20 section 6.3 (`pulp_wars-0hi.3`): 10 HP again, the contract
  // value (`pulp_wars-c87.8` had raised it to 12 while Dinosaurs were weak).
  // Section 6.1: the Caveman states its own rule (it used to copy the Human
  // Fighter's), so a Human Fighter change does not move it.
  FIGHTER: role({
    role: "FIGHTER",
    label: "Caveman",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Raptor",
    tacticalRole: "SKIRMISHER",
    cost: 4,
    maxHp: 12,
    attack2: 5,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "GROW"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Spitter",
    tacticalRole: "RANGED",
    cost: 4,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "ACID", "GROW"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Ankylosaurus",
    tacticalRole: "DEFENDER",
    cost: 5,
    maxHp: 20,
    attack2: 4,
    defense2: 6,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "ARMOURED", "GROW"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Shaman",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 10,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY", "TEND_WOUNDED", "HATCH"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Triceratops",
    tacticalRole: "SIEGE",
    cost: 8,
    // Revision 20 section 2.1: 20 HP (was 18), Move 2 (was 1), attacks
    // after moving, and the passive Charge! (`LINEBREAKER`).
    maxHp: 20,
    attack2: 6,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "LINEBREAKER", "GROW"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "T-Rex",
    tacticalRole: "BREAKTHROUGH",
    // Revision 20 section 3: cost 14 (was 10).
    cost: 14,
    maxHp: 28,
    attack2: 8,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "OVERRUN", "GROW"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Brontosaurus",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 45,
    attack2: 7,
    defense2: 8,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH", "GROW"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * Revision 19 Dinosaur engine mechanics: no role builds Field Defense
 * (Wild); the Triceratops, T-Rex, and Brontosaurus use two capacity slots;
 * the five egg-laid roles carry their hatch time; the Triceratops is a melee
 * body that advances after a kill and carries the Charge! run-up bonus; the
 * Ankylosaurus is Armoured. Boats are Human boats.
 */
export const DINOSAUR_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: { buildsFieldDefense: false },
  RAIDER: { hatchTurns: 1 },
  MARKSMAN: { hatchTurns: 1 },
  GUARD: { buildsFieldDefense: false, hatchTurns: 2, armourReduction: 1 },
  // Revision 20 section 2.1 names the Triceratops's 2 slots and hatch time 2
  // (replacing the `pulp_wars-c87.8` interim 1 and 1) and its run-up bonus;
  // section 3 names the T-Rex's hatch time 4 (was 3).
  CATAPULT: { capacitySlots: 2, hatchTurns: 2, runUpBonus2: 2 },
  KNIGHT: { capacitySlots: 2, hatchTurns: 4 },
  JUGGERNAUT: { capacitySlots: 2 },
  BATTLESHIP: { splash: true },
});

export const DINOSAUR_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "DINOSAUR_BASELINE_V1",
  faction: "DINOSAUR",
  startingTechIds: [],
  nodes: DINOSAUR_BASELINE_V1_NODES,
  roleRules: DINOSAUR_ROLE_RULES_V7,
  roleMechanics: DINOSAUR_ROLE_MECHANICS_V7,
});

/**
 * The Martian technology graph (docs/product/RULESET_7_MARTIANS.md section
 * 4): identical to ORIGINAL_BASELINE_V5 except that Administration grants
 * `BRAIN_SUPPORT` instead of Captain support, Chivalry grants no Overrun,
 * Fortification (displayed as Force Fields) grants `FORCE_FIELDS` instead of
 * `BUILD_FIELD_DEFENSE`, and Explosives (displayed as Disintegrator) keeps
 * both of its unlocks and adds `DISINTEGRATOR`.
 */
export const MARTIAN_BASELINE_V1_NODES: readonly TechnologyNodeV7[] =
  deepFreeze(
    ORIGINAL_BASELINE_V5_NODES.map((original) =>
      node(
        original.id,
        original.branch,
        original.tier,
        original.prerequisites,
        [
          ...original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? [{ kind: "BRAIN_SUPPORT" }]
              : unlock.kind === "OVERRUN"
                ? []
                : unlock.kind === "COMMAND" &&
                    unlock.command === "BUILD_FIELD_DEFENSE"
                  ? [{ kind: "FORCE_FIELDS" }]
                  : [unlock],
          ),
          ...(original.id === "EXPLOSIVES"
            ? [{ kind: "DISINTEGRATOR" } as const]
            : []),
        ],
      ),
    ),
  );

/** The Martian roster (docs/product/RULESET_7_MARTIANS.md section 3). */
export const MARTIAN_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  // The Grunt; a Thrall is a `FIGHTER`-role unit with a `thralls` entry and
  // shares this statline (section 8.3).
  FIGHTER: role({
    role: "FIGHTER",
    label: "Grunt",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 10,
    attack2: 4,
    defense2: 3,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Saucer",
    tacticalRole: "SKIRMISHER",
    cost: 4,
    maxHp: 8,
    attack2: 3,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CHARGE", "FLY", "BEAM_DOWN"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Ray Gunner",
    tacticalRole: "RANGED",
    cost: 4,
    maxHp: 8,
    attack2: 6,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "HEAT_RAY"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Shield Projector",
    tacticalRole: "DEFENDER",
    cost: 4,
    maxHp: 12,
    attack2: 3,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "FORCE_FIELD"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Brain",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 8,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "RALLY", "MIND_CONTROL"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Tripod",
    tacticalRole: "SIEGE",
    cost: 9,
    maxHp: 12,
    attack2: 8,
    defense2: 2,
    move: 2,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "STRIDE", "HEAT_RAY", "PIERCE"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Mothership",
    tacticalRole: "BREAKTHROUGH",
    cost: 10,
    maxHp: 16,
    attack2: 5,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "FLY", "TRACTOR_BEAM"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Colossus",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 32,
    attack2: 8,
    defense2: 6,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH", "STRIDE", "HEAT_RAY"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * The Martian engine mechanics: no role builds Field Defense; every land
 * role has a Shield maximum; the Saucer and the Mothership fly and the
 * Tripod and the Colossus stride; flyers and the Tripod never advance after
 * a kill; the Mothership and the Colossus use two capacity slots. Boats are
 * Human boats (no Shield).
 */
export const MARTIAN_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: { buildsFieldDefense: false, shield: 2 },
  RAIDER: { shield: 2, movementMode: "FLY", advancesAfterKill: false },
  MARKSMAN: { shield: 2 },
  GUARD: { buildsFieldDefense: false, shield: 3 },
  CAPTAIN: { shield: 2 },
  CATAPULT: { shield: 2, movementMode: "STRIDE", advancesAfterKill: false },
  KNIGHT: {
    shield: 4,
    movementMode: "FLY",
    advancesAfterKill: false,
    capacitySlots: 2,
  },
  JUGGERNAUT: { shield: 3, movementMode: "STRIDE", capacitySlots: 2 },
  BATTLESHIP: { splash: true },
});

export const MARTIAN_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "MARTIAN_BASELINE_V1",
  faction: "MARTIAN",
  startingTechIds: [],
  nodes: MARTIAN_BASELINE_V1_NODES,
  roleRules: MARTIAN_ROLE_RULES_V7,
  roleMechanics: MARTIAN_ROLE_MECHANICS_V7,
});

/**
 * The Ice Folk technology graph (docs/product/RULESET_7_ICE_FOLK.md section
 * 4): identical to ORIGINAL_BASELINE_V5 except that Administration grants
 * `WITCH_SUPPORT` instead of Captain support, Chivalry grants no Overrun,
 * Fortification (displayed as Deep Winter) grants `DEEP_WINTER` instead of
 * `BUILD_FIELD_DEFENSE`, and Explosives (displayed as Brittle) keeps both of
 * its unlocks and adds `BRITTLE`.
 */
export const ICE_FOLK_BASELINE_V1_NODES: readonly TechnologyNodeV7[] =
  deepFreeze(
    ORIGINAL_BASELINE_V5_NODES.map((original) =>
      node(
        original.id,
        original.branch,
        original.tier,
        original.prerequisites,
        [
          ...original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
            unlock.kind === "CAPTAIN_SUPPORT"
              ? [{ kind: "WITCH_SUPPORT" }]
              : unlock.kind === "OVERRUN"
                ? []
                : unlock.kind === "COMMAND" &&
                    unlock.command === "BUILD_FIELD_DEFENSE"
                  ? [{ kind: "DEEP_WINTER" }]
                  : [unlock],
          ),
          ...(original.id === "EXPLOSIVES"
            ? [{ kind: "BRITTLE" } as const]
            : []),
        ],
      ),
    ),
  );

/** The Ice Folk roster (docs/product/RULESET_7_ICE_FOLK.md section 3). */
export const ICE_FOLK_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    label: "Yeti",
    tacticalRole: "LINE",
    cost: 2,
    maxHp: 10,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "MOUNTAIN_BORN", "ROCKFALL"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Sled",
    tacticalRole: "SKIRMISHER",
    cost: 3,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "BOLAS"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Snow Hunter",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 8,
    attack2: 4,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "COLD_BLOOD"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Mammoth",
    tacticalRole: "DEFENDER",
    cost: 6,
    maxHp: 20,
    attack2: 5,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "DRILL",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "SWEEP", "TRAMPLE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Ice Witch",
    tacticalRole: "SUPPORT",
    cost: 5,
    maxHp: 12,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "BLIZZARD", "COLD_SNAP"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Boulder Yeti",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 12,
    attack2: 4,
    defense2: 3,
    move: 2,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "BOULDERS", "MOUNTAIN_BORN"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Sabretooth",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 14,
    attack2: 6,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "PROWL"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Frost Giant",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 40,
    attack2: 8,
    defense2: 8,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PUSH", "COLD_AURA", "MOUNTAIN_BORN"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
});

/**
 * The Ice Folk engine mechanics (section 11): no role builds Field Defense;
 * the Yeti, the Boulder Yeti, and the Frost Giant are Mountain-born; every
 * land role but the Sabretooth Glides; the Sabretooth Prowls; the Mammoth
 * Sweeps and Tramples; the Boulder Yeti ignores fortification, is Planted
 * when unmoved, and never advances; the Yeti has Rockfall and the Snow
 * Hunter Cold Blood. Every role uses one slot. Boats are Human boats.
 */
export const ICE_FOLK_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: {
    buildsFieldDefense: false,
    mountainBorn: true,
    glides: true,
    rockfallAttack2: 3,
  },
  RAIDER: { glides: true },
  MARKSMAN: { glides: true, coldBloodBonus2: 1 },
  GUARD: {
    buildsFieldDefense: false,
    glides: true,
    sweepDamage: 2,
    tramplesFieldDefense: true,
  },
  CAPTAIN: { glides: true },
  CATAPULT: {
    advancesAfterKill: false,
    mountainBorn: true,
    glides: true,
    ignoresFortification: true,
    plantedBonus2: 2,
  },
  KNIGHT: { ignoresZocStops: true },
  JUGGERNAUT: { mountainBorn: true, glides: true },
  BATTLESHIP: { splash: true },
});

export const ICE_FOLK_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ICE_FOLK_BASELINE_V1",
  faction: "ICE_FOLK",
  startingTechIds: [],
  nodes: ICE_FOLK_BASELINE_V1_NODES,
  roleRules: ICE_FOLK_ROLE_RULES_V7,
  roleMechanics: ICE_FOLK_ROLE_MECHANICS_V7,
});

/** Frozen faction registrations; there is no cross-faction fallback. */
export const FACTION_TREES_V7: Readonly<
  Record<FactionIdV7, FactionTechnologyTreeV7>
> = deepFreeze({
  ORIGINAL: ORIGINAL_BASELINE_V5_TREE,
  UNDEAD: UNDEAD_BASELINE_V1_TREE,
  GOBLIN: GOBLIN_BASELINE_V1_TREE,
  DINOSAUR: DINOSAUR_BASELINE_V1_TREE,
  MARTIAN: MARTIAN_BASELINE_V1_TREE,
  ICE_FOLK: ICE_FOLK_BASELINE_V1_TREE,
});

export const FACTION_DISPLAY_NAMES_V7: Readonly<Record<FactionIdV7, string>> =
  deepFreeze({
    ORIGINAL: "Human",
    UNDEAD: "Undead",
    GOBLIN: "Goblin",
    DINOSAUR: "Dinosaur",
    MARTIAN: "Martian",
    ICE_FOLK: "Ice Folk",
  });

/**
 * Revision 17: per-faction technology display names. Serialized technology
 * IDs never change; Goblin Commerce is renamed (Plunder), in revision 19
 * Dinosaur Fortification (Nesting), and in revision 20 Dinosaur Explosives
 * (Wallbreaker). The single
 * name helper, `technologyNameV7` in src/render/goblin-presentation-v7.ts,
 * applies these overrides and otherwise keeps the sentence-case name.
 */
export const TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7: Readonly<
  Record<FactionIdV7, Readonly<Partial<Record<TechnologyIdV7, string>>>>
> = deepFreeze({
  ORIGINAL: {},
  UNDEAD: {},
  GOBLIN: { COMMERCE: "Plunder" },
  DINOSAUR: { FORTIFICATION: "Nesting", EXPLOSIVES: "Wallbreaker" },
  // The Martian revision: Fortification and Explosives are renamed.
  MARTIAN: { FORTIFICATION: "Force Fields", EXPLOSIVES: "Disintegrator" },
  // The Ice Folk revision: Fortification and Explosives are renamed.
  ICE_FOLK: { FORTIFICATION: "Deep Winter", EXPLOSIVES: "Brittle" },
});

export function factionTreeV7(faction: FactionIdV7): FactionTechnologyTreeV7 {
  const tree = Object.hasOwn(FACTION_TREES_V7, faction)
    ? FACTION_TREES_V7[faction]
    : undefined;
  if (tree === undefined)
    throw new RangeError(`Unknown v7 faction: ${String(faction)}`);
  return tree;
}

export function factionTreeIdV7(faction: FactionIdV7): FactionTreeIdV7 {
  return factionTreeV7(faction).id;
}

/** Revision 13 faction-wide rules that are not role rules. */
export interface FactionRulesV7 {
  /**
   * Restless: land-form units recover only in their owner's territory
   * (explicit Recover is illegal elsewhere; idle recovery is 0 there).
   */
  readonly restless: boolean;
  /** Revision 17 Warrens: extra unit capacity of every city the seat owns. */
  readonly cityCapacityBonus: 0 | 1;
  /**
   * Revision 17 Gang Up: a land-form attack gains +1 Attack for each other
   * own unit adjacent to its target, up to this maximum (0 disables it).
   */
  readonly gangUpMaximum: 0 | 2;
  /**
   * Revision 19: the mechanical role of the treasure chest unit (`KNIGHT`
   * for Human, Undead, and Goblin; `RAIDER` for Dinosaur, the Raptor, and
   * for Martian, the Saucer). The serialized `TREASURE_CAPTURED` reward
   * literal stays `KNIGHT`. The Ice Folk revision: the Sled (`RAIDER`).
   */
  readonly treasureUnitRole: UnitRoleIdV7;
  /**
   * The Ice Folk revision (section 6): the faction's land is Snow and its
   * land-form units get the Snow benefits (Glide and Snow cover); every
   * other faction's ground units are stopped by Snow.
   */
  readonly snow: boolean;
}

export const FACTION_RULES_V7: Readonly<Record<FactionIdV7, FactionRulesV7>> =
  deepFreeze({
    ORIGINAL: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "KNIGHT",
      snow: false,
    },
    UNDEAD: {
      restless: true,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "KNIGHT",
      snow: false,
    },
    GOBLIN: {
      restless: false,
      cityCapacityBonus: 1,
      gangUpMaximum: 2,
      treasureUnitRole: "KNIGHT",
      snow: false,
    },
    DINOSAUR: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    },
    MARTIAN: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    },
    ICE_FOLK: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: true,
    },
  });

export function factionRulesV7(faction: FactionIdV7): FactionRulesV7 {
  const rules = Object.hasOwn(FACTION_RULES_V7, faction)
    ? FACTION_RULES_V7[faction]
    : undefined;
  if (rules === undefined)
    throw new RangeError(`Unknown v7 faction: ${String(faction)}`);
  return rules;
}

/**
 * City unit capacity (revision 17 section 5.1): `level + 1`, +1 with
 * Planning, +1 Warrens when the current owner's faction is Goblin, and
 * (revision 20 section 4.1) +1 with Nesting, the technology capability
 * `nestingCityCapacityBonus` that only the Dinosaur tree grants. Every term
 * is read live from the city's current owner. Every capacity surface
 * (training, Egg laying, treasure placement, previews, the city panel, and
 * the Normal AI) uses this formula.
 */
export function cityUnitCapacityForV7(
  level: number,
  ownerResearchedTechs: readonly string[],
  ownerFaction: FactionIdV7,
): number {
  return (
    level +
    1 +
    (ownerResearchedTechs.includes("PLANNING") ? 1 : 0) +
    factionRulesV7(ownerFaction).cityCapacityBonus +
    (ownerResearchedTechs.length === 0
      ? 0
      : technologyCapabilitiesV7(
          ownerResearchedTechs as readonly TechnologyIdV7[],
          ownerFaction,
        ).nestingCityCapacityBonus)
  );
}

/**
 * Revision 13: Graves exist exactly in matches whose setup includes an UNDEAD
 * seat. The property is fixed at setup and survives Undead elimination.
 */
export function gravesEnabledV7(setup: {
  readonly factions: readonly FactionIdV7[];
}): boolean {
  return setup.factions.includes("UNDEAD");
}

export const RULESET_7 = deepFreeze({
  id: RULESET_7_ID,
  version: 7 as const,
  startingCoins: 5 as const,
  factionTrees: FACTION_TREES_V7,
});

/**
 * Revision 16 (economy deflation, `pulp_wars-4gc`): a technology of tier `t`
 * costs `base + step * (C - 1)` Coins, `C` being the researcher's owned city
 * count. Tier 1 is `5 + 1(C - 1)` (unchanged); tier 2 `7 + 3(C - 1)` (was
 * `7 + 2(C - 1)`); tier 3 `12 + 5(C - 1)` (was `9 + 3(C - 1)`).
 */
export const TECHNOLOGY_RESEARCH_COST_V7: Readonly<
  Record<1 | 2 | 3, { readonly base: number; readonly step: number }>
> = deepFreeze({
  1: { base: 5, step: 1 },
  2: { base: 7, step: 3 },
  3: { base: 12, step: 5 },
});

export function technologyResearchCostV7(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
): number {
  if (
    ![1, 2, 3].includes(tier) ||
    !Number.isSafeInteger(ownedCityCount) ||
    ownedCityCount < 1
  )
    throw new RangeError("INVALID_CITY_COUNT");
  const { base, step } = TECHNOLOGY_RESEARCH_COST_V7[tier];
  const value = BigInt(base) + BigInt(step) * BigInt(ownedCityCount - 1);
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  return Number(value);
}

/**
 * Revision 12 free opening research: while a player has researched no
 * technology, any offered tier-1 technology costs 0 Coins. Afterward the
 * ordinary tier formula applies.
 */
export function playerTechnologyResearchCostV7(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
  researchedTechCount: number,
): number {
  const ordinary = technologyResearchCostV7(tier, ownedCityCount);
  return tier === 1 && researchedTechCount === 0 ? 0 : ordinary;
}

/** Resources masked in public observation until the listed technology. */
export const RESOURCE_REVEAL_TECHNOLOGY_V7: Readonly<
  Partial<Record<ResourceIdV7, TechnologyIdV7>>
> = deepFreeze({ FERTILE_GROUND: "GATHERING", ORE: "DRILL" });

export function isResourceRevealedV7(
  resource: ResourceIdV7,
  researchedTechs: readonly string[],
): boolean {
  const required = RESOURCE_REVEAL_TECHNOLOGY_V7[resource];
  return required === undefined || researchedTechs.includes(required);
}

/** The role rule of one faction's registration; the faction is mandatory. */
export function effectiveRoleRuleV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
): EffectiveRoleRuleV7 {
  const rule = factionTreeV7(faction).roleRules[roleId];
  if (rule === undefined)
    throw new RangeError(`Unknown v7 role for ${faction}: ${String(roleId)}`);
  return rule;
}

/** Engine-only role mechanics of one faction's registration. */
export function roleMechanicsV7(
  roleId: UnitRoleIdV7,
  faction: FactionIdV7,
): RoleMechanicsV7 {
  const result = factionTreeV7(faction).roleMechanics[roleId];
  if (result === undefined)
    throw new RangeError(`Unknown v7 role for ${faction}: ${String(roleId)}`);
  return result;
}

/** Anything that lists players with their bound faction (state or view). */
export interface FactionRosterV7 {
  readonly players: readonly {
    readonly id: PlayerId;
    readonly faction: FactionIdV7;
  }[];
}

export function playerFactionV7(
  roster: FactionRosterV7,
  playerId: PlayerId,
): FactionIdV7 {
  const player = roster.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player.faction;
}

/** Resolves a unit's role rule through its owner's faction registration. */
export function unitRoleRuleV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
): EffectiveRoleRuleV7 {
  return effectiveRoleRuleV7(unit.role, playerFactionV7(roster, unit.ownerId));
}

/** Resolves a unit's engine mechanics through its owner's faction. */
export function unitRoleMechanicsV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
): RoleMechanicsV7 {
  return roleMechanicsV7(unit.role, playerFactionV7(roster, unit.ownerId));
}

/**
 * The Chill facts the sluggish helpers read (canonical state and public view
 * alike): the roster and the Ice Folk `chilled` side list.
 */
export interface SluggishLookupV7 extends FactionRosterV7 {
  readonly chilled?: readonly {
    readonly unitId: number;
    readonly sluggish: boolean;
  }[];
}

/**
 * The Ice Folk revision (docs/product/RULESET_7_ICE_FOLK.md section 5.3):
 * whether the unit is sluggish (its Chill entry has `sluggish: true`). It is
 * false for every unit of a match without an Ice Folk seat.
 */
export function unitIsSluggishV7(
  lookup: SluggishLookupV7,
  unit: { readonly id: number },
): boolean {
  const chilled = lookup.chilled;
  if (chilled === undefined || chilled.length === 0) return false;
  return chilled.some((entry) => entry.unitId === unit.id && entry.sluggish);
}

/**
 * THE single "may this unit use a primary action after moving" rule (the
 * Ice Folk revision, section 5.3): its role rule's
 * `mayUsePrimaryActionAfterMove`, and it is not sluggish. Every read of the
 * role flag for a concrete unit goes through this helper; role-level reads
 * (production values, role tables) keep the role flag. A source audit in
 * `tests/unit/ruleset-v7-ice-folk-helpers.test.ts` pins the call sites.
 */
export function unitMayActAfterMoveV7(
  lookup: SluggishLookupV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  return (
    unitRoleRuleV7(lookup, unit).mayUsePrimaryActionAfterMove &&
    !unitIsSluggishV7(lookup, unit)
  );
}

/**
 * Whether a primary action is refused because the unit has moved this turn
 * (the activation flag `moved`, an interrupted Move included) and may not act
 * after moving ({@link unitMayActAfterMoveV7}).
 */
export function primaryActionBlockedAfterMoveV7(
  lookup: SluggishLookupV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly activation: { readonly moved: boolean };
  },
): boolean {
  return unit.activation.moved && !unitMayActAfterMoveV7(lookup, unit);
}

/**
 * The plain sluggish gate (section 5.3) of the actions that do not read the
 * role flag (Kaboom and Pillage, which every unit may use after moving): a
 * sluggish unit that has moved may not use them.
 */
export function sluggishUnitMovedV7(
  lookup: SluggishLookupV7,
  unit: {
    readonly id: number;
    readonly activation: { readonly moved: boolean };
  },
): boolean {
  return unit.activation.moved && unitIsSluggishV7(lookup, unit);
}

/** Kills a unit needs before it may be promoted (once). */
export const PROMOTION_KILLS_V7 = 3;
/**
 * Maximum HP a Promotion adds. Revision 20 section 5: the promoted unit is
 * also fully healed (its HP becomes the new maximum).
 */
export const PROMOTION_HP_V7 = 5;
/** Revision 19 section 6.2: an Egg has 6 HP (10 when laid with Nesting). */
export const EGG_HP_V7 = 6;
/** Revision 19 section 6.2: an Egg's fixed Defense 1 in half-units. */
export const EGG_DEFENSE2_V7 = 2;
/** Revision 19 section 5.2: kills needed for Big (stage 1) and Alpha (2). */
export const GROWTH_KILLS_V7: readonly [number, number] = deepFreeze([1, 3]);
/** Revision 19 section 5.2: maximum and current HP added by each stage. */
export const GROWTH_HP_V7 = 4;
/** Revision 19 section 5.2: an Alpha's extra Attack in half-units. */
export const ALPHA_ATTACK2_V7 = 2;
/** Revision 20 Charge!: the most tiles of a Move that count as run-up. */
export const RUN_UP_MAXIMUM_TILES_V7 = 2;

/** The unit facts the revision-20 Charge! helpers read. */
export interface LinebreakerUnitFactsV7 {
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly activation: {
    readonly moved: boolean;
    readonly movedPathLength: number;
    readonly attacksUsed: number;
  };
}

/**
 * Revision 20 Charge! (section 2.2): whether an `ATTACK` by this unit is a
 * Charge (a land-form unit whose role has `LINEBREAKER`).
 */
export function attackIsChargeV7(
  roster: FactionRosterV7,
  unit: Pick<LinebreakerUnitFactsV7, "ownerId" | "role" | "form">,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("LINEBREAKER")
  );
}

/**
 * Revision 20 Charge! run-up: the tiles that count for the unit's next
 * attack this turn: `min(RUN_UP_MAXIMUM_TILES_V7, movedPathLength)` when it
 * moved and has not attacked, otherwise 0. `plannedPathLength` replaces the
 * activation's own path length (an attack after a planned Move).
 */
export function chargeRunUpTilesV7(
  roster: FactionRosterV7,
  unit: LinebreakerUnitFactsV7,
  plannedPathLength?: number,
): number {
  if (!attackIsChargeV7(roster, unit)) return 0;
  const length =
    plannedPathLength ??
    (unit.activation.moved && unit.activation.attacksUsed === 0
      ? unit.activation.movedPathLength
      : 0);
  return Math.max(0, Math.min(RUN_UP_MAXIMUM_TILES_V7, length));
}

/** The `attack2` a Charge! gains from its run-up (0 for any other attack). */
export function chargeRunUpAttack2V7(
  roster: FactionRosterV7,
  unit: LinebreakerUnitFactsV7,
  plannedPathLength?: number,
): number {
  return (
    chargeRunUpTilesV7(roster, unit, plannedPathLength) *
    unitRoleMechanicsV7(roster, unit).runUpBonus2
  );
}

/**
 * Revision 20 Wallbreaker (section 4.2): whether an `ATTACK` by this unit
 * removes the defender's City Walls levels: a land-form growing unit whose
 * owner's researched technology grants `ignoresCityWalls`.
 */
export function attackIgnoresCityWallsV7(
  roster: FactionRosterV7,
  unit: Pick<DinosaurUnitFactsV7, "ownerId" | "role" | "form">,
  ownerResearchedTechs: readonly TechnologyIdV7[],
): boolean {
  return (
    unit.form === "LAND" &&
    unitGrowsV7(roster, unit) &&
    technologyCapabilitiesV7(
      ownerResearchedTechs,
      playerFactionV7(roster, unit.ownerId),
    ).ignoresCityWalls
  );
}

/** The growth stage a growing unit with `kills` has: 0, 1 (Big), 2 (Alpha). */
export function growthStageForKillsV7(kills: number): 0 | 1 | 2 {
  return kills >= GROWTH_KILLS_V7[1] ? 2 : kills >= GROWTH_KILLS_V7[0] ? 1 : 0;
}

/** The unit facts the revision-19 Dinosaur helpers read. */
export interface DinosaurUnitFactsV7 {
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly kills: number;
}

/**
 * Revision 19: whether the unit grows from kills instead of Promotion (its
 * role has `GROW` under its owner's registration and it is not an Egg).
 */
export function unitGrowsV7(
  roster: FactionRosterV7,
  unit: Pick<DinosaurUnitFactsV7, "ownerId" | "role" | "form">,
): boolean {
  return (
    unit.form !== "EGG" &&
    unitRoleRuleV7(roster, unit).abilities.includes("GROW")
  );
}

/** The growth stage of a growing unit, or null for a unit that never grows. */
export function unitGrowthStageV7(
  roster: FactionRosterV7,
  unit: DinosaurUnitFactsV7,
): 0 | 1 | 2 | null {
  return unitGrowsV7(roster, unit) ? growthStageForKillsV7(unit.kills) : null;
}

/** Alpha's `attack2` bonus on every attack the unit makes (0 otherwise). */
export function unitAlphaAttack2V7(
  roster: FactionRosterV7,
  unit: DinosaurUnitFactsV7,
): number {
  return unitGrowthStageV7(roster, unit) === 2 ? ALPHA_ATTACK2_V7 : 0;
}

/**
 * Revision 19 section 2.3: whether `role` is laid as an Egg, never trained,
 * under `faction`'s registration (the five trainable Dinosaur units).
 */
export function isEggLaidRoleV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): boolean {
  return roleMechanicsV7(role, faction).hatchTurns !== null;
}

/**
 * Revision 19 section 6.2: the maximum HP an Egg may have: the base Egg HP,
 * or the base plus the Nesting bonus of its owner's registration.
 */
export function eggMaxHpOptionsV7(faction: FactionIdV7): readonly number[] {
  const bonuses = new Set<number>([0]);
  for (const node of factionTreeV7(faction).nodes)
    for (const unlock of node.unlocks)
      if (unlock.kind === "NESTING") bonuses.add(unlock.eggHp);
  return [...bonuses].sort((a, b) => a - b).map((bonus) => EGG_HP_V7 + bonus);
}

/** The capacity slots a unit (or the unit inside an Egg) uses in its city. */
export function unitCapacitySlotsV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
): number {
  return unitRoleMechanicsV7(roster, unit).capacitySlots;
}

/**
 * Revision 19 Armoured (section 8.2): one instance of `damage` before the cap
 * at current HP, reduced by the unit's armour to a minimum of 1 (0 and 1 are
 * unchanged). It applies in land form and while embarked, never to an Egg.
 */
export function armouredDamageV7(
  roster: FactionRosterV7,
  unit: {
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  damage: number,
): number {
  if (unit.form === "EGG" || damage < 2) return damage;
  const reduction = unitRoleMechanicsV7(roster, unit).armourReduction;
  return reduction === 0 ? damage : Math.max(1, damage - reduction);
}

/** The Martian revision (section 5.4): a covered unit recharges to this. */
export const FORCE_FIELD_SHIELD_V7 = 4;
/**
 * The Martian revision (section 16.3): no Shield in the game exceeds this
 * value, so a hit of 5 always costs HP.
 */
export const SHIELD_CAP_V7 = 4;
/** The Martian revision (section 8.2): the most HP a Mind Control target has. */
export const MIND_CONTROL_HP_V7 = 6;
/** The Martian revision (section 8.2): Mind Control reach (Chebyshev). */
export const MIND_CONTROL_RANGE_V7 = 2;
/** The Martian revision (section 8.2): the cooldown a Mind Control starts. */
export const MIND_CONTROL_COOLDOWN_TURNS_V7 = 2;
/** The Martian revision (section 8.3): Thralls one Brain controls at most. */
export const MIND_CONTROL_THRALL_LIMIT_V7 = 2;
/** The Martian revision (section 8.4): the exact Tractor Beam distance. */
export const TRACTOR_BEAM_RANGE_V7 = 2;

/** The Ice Folk revision (section 5.5): the Shatter threshold. */
export const SHATTER_HP_V7 = 3;
/** The Ice Folk revision (section 5.5): the Shatter threshold with Brittle. */
export const BRITTLE_SHATTER_HP_V7 = 4;
/** The Ice Folk revision (section 5.2): `turnsLeft` of an applied Chill. */
export const CHILL_TURNS_V7 = 2;
/** The Ice Folk revision (section 7.3): the Bolas reach (Chebyshev). */
export const BOLAS_RANGE_V7 = 2;
/** The Ice Folk revision (section 6.4): the Cold Snap reach (Chebyshev). */
export const COLD_SNAP_RANGE_V7 = 2;
/** The Ice Folk revision (section 6.3): the Blizzard radius (Chebyshev). */
export const BLIZZARD_RADIUS_V7 = 1;
/** The Ice Folk revision (section 6.6): the Deep Winter radius (Chebyshev). */
export const DEEP_WINTER_RADIUS_V7 = 2;
/** The Ice Folk revision (section 6.6): Recover in own territory. */
export const DEEP_WINTER_RECOVER_V7 = 6;
/** The Ice Folk revision (section 7.5): a Sweep flank hit. */
export const SWEEP_DAMAGE_V7 = 2;
/** The Ice Folk revision (section 7.2): the Rockfall `attack2`. */
export const ROCKFALL_ATTACK2_V7 = 3;
/** The Ice Folk revision (section 7.6): the Planted `attack2` bonus. */
export const PLANTED_BONUS2_V7 = 2;
/** The Ice Folk revision (section 7.4): the Cold Blood `attack2` bonus. */
export const COLD_BLOOD_BONUS2_V7 = 1;

/** The unit facts the Martian registry helpers read. */
export interface MartianUnitFactsV7 {
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** The movement mode of a unit's role under its owner's registration. */
export function unitMovementModeV7(
  roster: FactionRosterV7,
  unit: Pick<MartianUnitFactsV7, "ownerId" | "role">,
): MovementModeV7 {
  return unitRoleMechanicsV7(roster, unit).movementMode;
}

/**
 * The Martian revision (section 7.2): whether the unit currently flies (a
 * land-form unit whose role's movement mode is `FLY`). An embarked flyer is
 * an ordinary embarked unit.
 */
export function unitFliesV7(
  roster: FactionRosterV7,
  unit: MartianUnitFactsV7,
): boolean {
  return unit.form === "LAND" && unitMovementModeV7(roster, unit) === "FLY";
}

/**
 * Whether the unit gets terrain cover and fortification: a land-form unit
 * whose movement mode is `GROUND`. The Martian machines (walkers and flyers)
 * are tall and never get either (section 7.1).
 */
export function unitTakesCoverV7(
  roster: FactionRosterV7,
  unit: MartianUnitFactsV7,
): boolean {
  return unit.form === "LAND" && unitMovementModeV7(roster, unit) === "GROUND";
}

/**
 * The Martian revision (section 6.1): whether an `ATTACK` by this unit is a
 * heat ray (a land-form unit whose role has `HEAT_RAY`).
 */
export function attackIsRayV7(
  roster: FactionRosterV7,
  unit: MartianUnitFactsV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("HEAT_RAY")
  );
}

/** The role `attack2` of a ray at half power: half, rounded down. */
export function halfPowerAttack2V7(attack2: number): number {
  return Math.floor(attack2 / 2);
}

/**
 * THE shared "can this unit enter this terrain" rule (the Martian revision,
 * section 7 and concern 11; the Ice Folk revision section 7.1). Every rule
 * that asks whether a unit may stand on a tile goes through it: `MOVE`,
 * `DISEMBARK`, the advance after a kill, Push and Tractor Beam destinations,
 * Beam Down, reward displacement, and treasure-unit placement. `afloat` is
 * whether the unit is, or would be on that tile, a naval or embarked unit;
 * `mountainBorn` whether its role is Mountain-born in land form.
 *
 * - Grass and Forest: every land-form unit.
 * - Mountain: a land-form unit whose owner has Engineering, every walker
 *   and flyer (Stride and Flying need no Engineering), and every
 *   Mountain-born unit (the Ice Folk Yeti, Boulder Yeti, and Frost Giant).
 * - Shallow Water: afloat units only.
 * - Deep Water: afloat units whose owner has Navigation.
 *
 * Rift (the terrain of `pulp_wars-9s0.5`, not in the game yet) belongs here
 * when it lands: **flyers may enter and end a Move on a Rift; walkers, foot
 * units, and afloat units may not** (`!afloat && movementMode === "FLY"`).
 * Stride is Forest, Mountain, and Shallow Water, nothing else (section 7.4).
 *
 * Occupancy, settlement sites, territory, and exploration are not terrain
 * and stay with each caller.
 */
export function canEnterTerrainV7(input: {
  readonly terrain: TerrainIdV7;
  readonly movementMode: MovementModeV7;
  readonly afloat: boolean;
  readonly engineering: boolean;
  readonly navigation: boolean;
  readonly mountainBorn: boolean;
}): boolean {
  switch (input.terrain) {
    case "GRASS":
    case "FOREST":
      return !input.afloat;
    case "MOUNTAIN":
      return (
        !input.afloat &&
        (input.engineering ||
          input.movementMode !== "GROUND" ||
          input.mountainBorn)
      );
    case "SHALLOW_WATER":
      return input.afloat;
    case "DEEP_WATER":
      return input.afloat && input.navigation;
  }
}

/**
 * THE shared "does entering this tile end the Move" terrain rule (the Martian
 * revision section 7.1; the Ice Folk revision section 7.1). A walker or
 * flyer is never stopped by terrain. For a ground unit a Mountain ends the
 * Move unless the unit is Mountain-born, and a Forest unless the unit has
 * Forest freedom (Fieldcraft); a step along a Road edge (both ends usable
 * Road nodes for the mover) waives both.
 */
export function terrainStopsMoveV7(input: {
  readonly terrain: TerrainIdV7;
  readonly movementMode: MovementModeV7;
  readonly mountainBorn: boolean;
  readonly ignoresForest: boolean;
  readonly roadEdge: boolean;
}): boolean {
  return (
    input.movementMode === "GROUND" &&
    !input.roadEdge &&
    ((input.terrain === "MOUNTAIN" && !input.mountainBorn) ||
      (input.terrain === "FOREST" && !input.ignoresForest))
  );
}

/**
 * The Ice Folk revision (section 7.1): whether the unit is Mountain-born now
 * (a land-form unit whose role is `mountainBorn` under its owner's
 * registration). An embarked or naval unit never is.
 */
export function unitIsMountainBornV7(
  roster: FactionRosterV7,
  unit: {
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form?: UnitFormV7;
  },
): boolean {
  return (
    (unit.form === undefined || unit.form === "LAND") &&
    unitRoleMechanicsV7(roster, unit).mountainBorn
  );
}

/**
 * The Ice Folk revision (section 7.1) `unitMayEnterMountainV7`: whether the
 * unit, in land form, may enter a Mountain: {@link canEnterTerrainV7} for a
 * Mountain with the unit's movement mode, Mountain-born, and `engineering`
 * (its owner's Engineering, or what the caller may assume about it).
 */
export function unitMayEnterMountainV7(
  roster: FactionRosterV7,
  unit: { readonly ownerId: PlayerId; readonly role: UnitRoleIdV7 },
  engineering: boolean,
  movementMode: MovementModeV7 = unitMovementModeV7(roster, unit),
): boolean {
  return canEnterTerrainV7({
    terrain: "MOUNTAIN",
    movementMode,
    afloat: false,
    engineering,
    navigation: false,
    mountainBorn: unitRoleMechanicsV7(roster, unit).mountainBorn,
  });
}

/**
 * The Martian revision (section 7.3): whether a LAND-form unit may step
 * onto a water tile inside a Move. A flyer crosses Shallow Water, and Deep
 * Water with Navigation; a walker crosses Shallow Water only; a foot unit
 * never does (it embarks at a Port). A Move that ends on such a tile
 * self-launches the machine there (it embarks).
 */
export function canCrossWaterV7(input: {
  readonly terrain: TerrainIdV7;
  readonly movementMode: MovementModeV7;
  readonly navigation: boolean;
}): boolean {
  if (input.terrain === "SHALLOW_WATER") return input.movementMode !== "GROUND";
  if (input.terrain === "DEEP_WATER")
    return input.movementMode === "FLY" && input.navigation;
  return false;
}

/**
 * The Martian revision (section 7.2): whether a flyer may END a Move, land,
 * or be placed on a tile with this settlement state. A flyer never stands on
 * a neutral village center or on the center of a city it does not own.
 */
export function flyerMayStandOnSiteV7(
  site: "CAPITAL" | "VILLAGE" | "CITY" | null,
  cityOwnerId: PlayerId | null,
  unitOwnerId: PlayerId,
): boolean {
  return site === null || cityOwnerId === unitOwnerId;
}

/** The unit facts Rally eligibility reads (state units and public units). */
export interface RallyUnitV7 {
  readonly id: number;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
  readonly at: { readonly x: number; readonly y: number };
  readonly hp: number;
  readonly activation: { readonly inspired: boolean };
}

/**
 * Whether `target` gains Inspired from `captain`'s Rally (Human Rally, Undead
 * Frenzy, Goblin WAAAGH!): another own land-form unit with `ATTACK`, not
 * already Inspired, within the captain's rally radius, and (except for
 * WAAAGH!) not a `SUPPORT` or `SIEGE` role. Resolved through the owners'
 * registrations.
 */
export function isRallyTargetV7(
  roster: FactionRosterV7,
  captain: RallyUnitV7,
  target: RallyUnitV7,
): boolean {
  if (
    target.hp <= 0 ||
    target.ownerId !== captain.ownerId ||
    target.form !== "LAND" ||
    target.id === captain.id ||
    target.activation.inspired
  )
    return false;
  const mechanics = unitRoleMechanicsV7(roster, captain);
  const targetRule = unitRoleRuleV7(roster, target);
  const tactical = targetRule.tacticalRole;
  return (
    (mechanics.rallyReachesSupportAndSiege ||
      (tactical !== "SUPPORT" && tactical !== "SIEGE")) &&
    targetRule.abilities.includes("ATTACK") &&
    Math.max(
      Math.abs(captain.at.x - target.at.x),
      Math.abs(captain.at.y - target.at.y),
    ) <= mechanics.rallyRadius
  );
}

export function requireTechnologyNodeV7(
  id: TechnologyIdV7,
  faction: FactionIdV7,
): TechnologyNodeV7 {
  const result = factionTreeV7(faction).nodes.find((item) => item.id === id);
  if (result === undefined)
    throw new RangeError(`Unknown v7 technology: ${id}`);
  return result;
}

export interface TechnologyCapabilitiesV7 {
  readonly treeId: FactionTreeIdV7;
  readonly resourceReveals: readonly ResourceIdV7[];
  readonly commands: readonly TechnologyUnlockedCommandV7[];
  readonly trainableRoles: readonly UnitRoleIdV7[];
  readonly roleBindings: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
  readonly economicFormulas: readonly Extract<
    TechnologyUnlockV7,
    { readonly kind: "ECONOMIC_FORMULA" }
  >[];
  readonly connectedFarmVisuals: boolean;
  readonly forestMovementFreedomRoles: readonly UnitRoleIdV7[];
  readonly mountainMovement: boolean;
  readonly highGroundVisionRadiusBonus: 0 | 1;
  readonly roleSightRadius: Readonly<Partial<Record<UnitRoleIdV7, number>>>;
  readonly roadMovement: {
    readonly ordinaryStepCost2: 2;
    readonly connectedOrthogonalStepCost2: 1;
  } | null;
  readonly ownedCityCapacityBonus: 0 | 1;
  readonly adjacentStartTurnHealingAmount: 0 | 6;
  readonly landRoadPopulationAmount: 0 | 1;
  readonly marketIncomeMultiplier: 1 | 2;
  readonly armsIndustryDiscountCoins: 0 | 1;
  readonly landTradeIncomeCoins: 0 | 1;
  readonly seaTradeIncomeCoins: 0 | 1;
  readonly hostileCaptureSpoilsCoins: 0 | 2;
  /** Revision 17 Goblin Plunder: Coins per credited hostile kill. */
  readonly plunderCoins: 0 | 1;
  /** Revision 19 Nesting: extra HP of every Egg the player lays. */
  readonly eggHpBonus: 0 | 4;
  /** Revision 19 Nesting: turns removed from a laid Egg's hatch time. */
  readonly eggHatchTurnReduction: 0 | 1;
  /** Revision 20 Nesting: extra unit slots of every city the player owns. */
  readonly nestingCityCapacityBonus: 0 | 1;
  /** Revision 20 Wallbreaker: the player's dinosaurs ignore City Walls. */
  readonly ignoresCityWalls: boolean;
  /**
   * The Martian revision, Force Fields: the player's Shields also recharge
   * at the end of its turn.
   */
  readonly shieldsRechargeAtEndTurn: boolean;
  /**
   * The Martian revision, Disintegrator: the player's heat rays ignore the
   * defender's fortification.
   */
  readonly raysIgnoreFortification: boolean;
  /**
   * The Ice Folk revision, Deep Winter: Snow spreads to the neutral land
   * within two tiles of the player's city centers, and its land units
   * recover 6 in its territory.
   */
  readonly deepWinter: boolean;
  /**
   * The Ice Folk revision: the player's Shatter threshold
   * (`SHATTER_HP_V7`, or `BRITTLE_SHATTER_HP_V7` with Brittle).
   */
  readonly shatterThreshold: number;
}

export function technologyCapabilitiesV7(
  researchedTechs: readonly TechnologyIdV7[],
  faction: FactionIdV7,
): TechnologyCapabilitiesV7 {
  const tree = factionTreeV7(faction);
  const cacheKey = JSON.stringify([tree.id, ...[...researchedTechs].sort()]);
  const cached = TECHNOLOGY_CAPABILITIES_CACHE_V7.get(cacheKey);
  if (cached !== undefined) {
    TECHNOLOGY_CAPABILITIES_CACHE_V7.delete(cacheKey);
    TECHNOLOGY_CAPABILITIES_CACHE_V7.set(cacheKey, cached);
    return cached;
  }
  const known = new Set(researchedTechs);
  const unlocks = tree.nodes
    .filter((node) => known.has(node.id))
    .flatMap((node) => node.unlocks);
  const resources = new Set<ResourceIdV7>();
  const commands = new Set<TechnologyUnlockedCommandV7>();
  const roles = new Set<UnitRoleIdV7>();
  const formulas: Extract<TechnologyUnlockV7, { kind: "ECONOMIC_FORMULA" }>[] =
    [];
  const forest = new Set<UnitRoleIdV7>();
  const sights: Partial<Record<UnitRoleIdV7, number>> = {};
  let connectedFarmVisuals = false;
  let mountainMovement = false;
  let highGroundVisionRadiusBonus: 0 | 1 = 0;
  let roadMovement: TechnologyCapabilitiesV7["roadMovement"] = null;
  let ownedCityCapacityBonus: 0 | 1 = 0;
  let adjacentStartTurnHealingAmount: 0 | 6 = 0;
  let landRoadPopulationAmount: 0 | 1 = 0;
  let marketIncomeMultiplier: 1 | 2 = 1;
  let armsIndustryDiscountCoins: 0 | 1 = 0;
  let landTradeIncomeCoins: 0 | 1 = 0;
  let seaTradeIncomeCoins: 0 | 1 = 0;
  let hostileCaptureSpoilsCoins: 0 | 2 = 0;
  let plunderCoins: 0 | 1 = 0;
  let eggHpBonus: 0 | 4 = 0;
  let eggHatchTurnReduction: 0 | 1 = 0;
  let nestingCityCapacityBonus: 0 | 1 = 0;
  let ignoresCityWalls = false;
  let shieldsRechargeAtEndTurn = false;
  let raysIgnoreFortification = false;
  let deepWinter = false;
  let shatterThreshold = SHATTER_HP_V7;
  for (const unlock of unlocks)
    switch (unlock.kind) {
      case "COMMAND":
        commands.add(unlock.command);
        break;
      case "RESOURCE_REVEAL":
        unlock.resources.forEach((item) => resources.add(item));
        break;
      case "UNIT_ROLE":
        roles.add(unlock.role);
        break;
      case "ECONOMIC_FORMULA":
        formulas.push(unlock);
        break;
      case "CONNECTED_FARM_VISUALS":
        connectedFarmVisuals = true;
        break;
      case "FOREST_MOVEMENT_FREEDOM":
        unlock.roles.forEach((item) => forest.add(item));
        break;
      case "MOUNTAIN_MOVEMENT":
        mountainMovement = true;
        break;
      case "HIGH_GROUND_VISION":
        highGroundVisionRadiusBonus = 1;
        break;
      case "ROLE_SIGHT":
        sights[unlock.role] = unlock.radius;
        break;
      case "ROAD_MOVEMENT":
        roadMovement = {
          ordinaryStepCost2: 2,
          connectedOrthogonalStepCost2: 1,
        };
        break;
      case "OWNED_CITY_CAPACITY_BONUS":
        ownedCityCapacityBonus = 1;
        break;
      case "ADJACENT_START_TURN_HEALING":
        adjacentStartTurnHealingAmount = 6;
        break;
      case "LAND_ROAD_POPULATION":
        landRoadPopulationAmount = 1;
        break;
      case "MARKET_INCOME_MULTIPLIER":
        marketIncomeMultiplier = 2;
        break;
      case "ARMS_INDUSTRY_DISCOUNT":
        armsIndustryDiscountCoins = 1;
        break;
      case "LAND_TRADE_INCOME":
        landTradeIncomeCoins = 1;
        break;
      case "SEA_TRADE_INCOME":
        seaTradeIncomeCoins = 1;
        break;
      case "FIRST_HOSTILE_CAPTURE_SPOILS":
        hostileCaptureSpoilsCoins = 2;
        break;
      case "PLUNDER":
        plunderCoins = 1;
        break;
      case "NESTING":
        eggHpBonus = unlock.eggHp;
        eggHatchTurnReduction = unlock.hatchTurns;
        nestingCityCapacityBonus = unlock.citySlots;
        break;
      case "WALLBREAKER":
        ignoresCityWalls = true;
        break;
      case "FORCE_FIELDS":
        shieldsRechargeAtEndTurn = true;
        break;
      case "DISINTEGRATOR":
        raysIgnoreFortification = true;
        break;
      case "DEEP_WINTER":
        deepWinter = true;
        break;
      case "BRITTLE":
        shatterThreshold = BRITTLE_SHATTER_HP_V7;
        break;
      case "WITCH_SUPPORT":
      case "BRAIN_SUPPORT":
      case "CAPTAIN_SUPPORT":
      case "NECROMANCER_SUPPORT":
      case "WAAAGH_SUPPORT":
      case "OVERRUN":
      case "CHARGE_BONUS":
      case "MELEE_FIELD_DEMOLITION":
      case "NAVAL_TRAINING_DISCOUNT":
        break;
    }
  const result: TechnologyCapabilitiesV7 = deepFreeze({
    treeId: tree.id,
    resourceReveals: RESOURCE_IDS_V7.filter((item) => resources.has(item)),
    commands: COMMAND_KIND_ORDER_V7.filter((item) =>
      commands.has(item as TechnologyUnlockedCommandV7),
    ) as readonly TechnologyUnlockedCommandV7[],
    trainableRoles: UNIT_ROLE_IDS_V7.filter(
      (item) =>
        tree.roleRules[item].cost !== null &&
        (item === "FIGHTER" || roles.has(item)),
    ),
    roleBindings: tree.roleRules,
    economicFormulas: formulas,
    connectedFarmVisuals,
    forestMovementFreedomRoles: UNIT_ROLE_IDS_V7.filter((item) =>
      forest.has(item),
    ),
    mountainMovement,
    highGroundVisionRadiusBonus,
    roleSightRadius: sights,
    roadMovement,
    ownedCityCapacityBonus,
    adjacentStartTurnHealingAmount,
    landRoadPopulationAmount,
    marketIncomeMultiplier,
    armsIndustryDiscountCoins,
    landTradeIncomeCoins,
    seaTradeIncomeCoins,
    hostileCaptureSpoilsCoins,
    plunderCoins,
    eggHpBonus,
    eggHatchTurnReduction,
    nestingCityCapacityBonus,
    ignoresCityWalls,
    shieldsRechargeAtEndTurn,
    raysIgnoreFortification,
    deepWinter,
    shatterThreshold,
  });
  TECHNOLOGY_CAPABILITIES_CACHE_V7.set(cacheKey, result);
  if (TECHNOLOGY_CAPABILITIES_CACHE_V7.size > 32) {
    const oldest = TECHNOLOGY_CAPABILITIES_CACHE_V7.keys().next().value;
    if (oldest !== undefined) TECHNOLOGY_CAPABILITIES_CACHE_V7.delete(oldest);
  }
  return result;
}

/** Bounded exact memo of immutable technology-only capability tables. */
const TECHNOLOGY_CAPABILITIES_CACHE_V7 = new Map<
  string,
  TechnologyCapabilitiesV7
>();

export function assertRuleset7Registry(): void {
  const complete = FACTION_IDS_V7.every((faction, index) => {
    const tree = FACTION_TREES_V7[faction];
    return (
      tree.faction === faction &&
      tree.id === FACTION_TREE_IDS_V7[index] &&
      tree.nodes.length === TECHNOLOGY_IDS_V7.length &&
      tree.nodes.every((item, position) => {
        const reference = ORIGINAL_BASELINE_V5_NODES[position];
        return (
          item.id === TECHNOLOGY_IDS_V7[position] &&
          reference !== undefined &&
          item.tier === reference.tier &&
          item.branch === reference.branch &&
          JSON.stringify(item.prerequisites) ===
            JSON.stringify(reference.prerequisites)
        );
      }) &&
      Reflect.ownKeys(tree.roleRules).length === UNIT_ROLE_IDS_V7.length &&
      Reflect.ownKeys(tree.roleMechanics).length === UNIT_ROLE_IDS_V7.length &&
      UNIT_ROLE_IDS_V7.every(
        (roleId) =>
          tree.roleRules[roleId].role === roleId &&
          tree.roleRules[roleId].tacticalRole ===
            ORIGINAL_ROLE_RULES_V7[roleId].tacticalRole,
      )
    );
  });
  if (
    !complete ||
    FACTION_IDS_V7.length !== FACTION_TREE_IDS_V7.length ||
    Reflect.ownKeys(FACTION_TREES_V7).length !== FACTION_IDS_V7.length ||
    IMPROVEMENT_IDS_V7.length !== 11
  )
    throw new Error("Ruleset-7 registry is incomplete");
}
