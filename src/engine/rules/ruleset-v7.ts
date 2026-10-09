import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import {
  COMMAND_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  NEUTRAL_OWNER_ID_V7,
  RULESET_7_ID,
  type NeutralBreedV7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNavalRoleV7,
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.2).
  | "BOARD"
  // Tuning 3 (`pulp_wars-w49.3`): Commerce, hiring at a Market.
  | "HIRE"
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
  /** Revision 17 Goblins: Coins for each credited hostile kill (2 since 7r50). */
  | { readonly kind: "PLUNDER"; readonly coins: 2 }
  | { readonly kind: "CAPTAIN_SUPPORT" }
  /** Revision 13 Undead: Necromancer Frenzy (Rally) and Raise Dead. */
  | { readonly kind: "NECROMANCER_SUPPORT" }
  /**
   * Goblin explosions and Berserk (`pulp_wars-w49.35`): the Orc Warboss's
   * Berserk (the `RALLY` command, radius 2), which replaced WAAAGH!.
   */
  | { readonly kind: "BERSERK_SUPPORT" }
  /**
   * Revision 19 Dinosaurs: Nesting (the Dinosaur `FORTIFICATION`): Eggs laid
   * by the owner have `eggHp` more HP and hatch `hatchTurns` sooner.
   * Revision 20: every city the owner owns has `citySlots` more unit slots.
   * The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): `hatchTurns`
   * is 0. With one turn off, every Egg but the T-Rex's hatched at the start
   * of the next turn and the faction's Eggs were never at risk (32 laid and
   * none lost in a hand-played game); the Shaman's Hatch is the way to
   * speed an Egg.
   */
  | {
      readonly kind: "NESTING";
      readonly eggHp: 4;
      readonly hatchTurns: 0;
      readonly citySlots: 1;
    }
  /**
   * Revision 20 Dinosaurs: Wallbreaker (the Dinosaur `EXPLOSIVES`): the
   * attacks of the owner's growing land-form units ignore City Walls.
   */
  | { readonly kind: "WALLBREAKER" }
  /**
   * The Undead pass, correction (`pulp_wars-w49.13`): Pestilence (the
   * Undead `EXPLOSIVES`): the attacks of the owner's units with the
   * `PLAGUE` ability (the Lich) plague. Without it a Lich's shot and its
   * splash deal their damage and plague nobody.
   */
  | { readonly kind: "PESTILENCE" }
  /**
   * The Martian revision: the Brain's Psychic Command (Rally) and Mind
   * Control (the Martian `ADMINISTRATION`).
   */
  | { readonly kind: "BRAIN_SUPPORT" }
  /**
   * The Martian revision: Force Fields (the Martian `FORTIFICATION`): the
   * owner's Shields also recharge at the end of its turn. The Martian pass
   * (`pulp_wars-w49.14`, 7r52): and its Shield Projectors project the Force
   * Field (without it a Projector covers nobody).
   */
  | { readonly kind: "FORCE_FIELDS" }
  /**
   * The Martian pass (`pulp_wars-w49.14`, 7r52): Heat Sinks (the Martian
   * `FIELDCRAFT`): a full-power ray of the owner's units with the
   * `heatSink` role mechanic (the Ray Gunner) leaves the unit not Cooling.
   */
  | { readonly kind: "HEAT_SINKS" }
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
  /**
   * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 4): the
   * Engineer's Repair (the Dwarf `ADMINISTRATION`, no Rally).
   */
  | { readonly kind: "ENGINEER_SUPPORT" }
  /** The Dwarf revision: Engineers Assemble Gunners (`MARKSMANSHIP`). */
  | { readonly kind: "ASSEMBLE" }
  /** The Dwarf revision: Dive, a bomb deals 6 instead of 5 (the Dwarf `RAIDING`). */
  | { readonly kind: "DIVE" }
  /** The Dwarf revision: Dig In (the Dwarf `FORTIFICATION`). */
  | { readonly kind: "DIG_IN" }
  /**
   * The Dwarf revision: Blasting Charges (the Dwarf `EXPLOSIVES`):
   * eruptions deal 3 and Steam Cannon shots ignore fortification.
   */
  | { readonly kind: "BLASTING_CHARGES" }
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 4): the
   * Confectioner's Frosting and Re-bake (the Candy `ADMINISTRATION`, no
   * Rally).
   */
  | { readonly kind: "CONFECTIONER_SUPPORT" }
  /**
   * The Candy revision, Home Sweet Home (the Candy `FORTIFICATION`): a
   * Rushed unit that ends its turn on or next to an own city center does not
   * Crash.
   */
  | { readonly kind: "HOME_SWEET_HOME" }
  /**
   * The Candy revision, Peppermint Surprise (the Candy `EXPLOSIVES`): an
   * enemy that eats the owner's Crumbs takes `PEPPERMINT_DAMAGE_V7`.
   */
  | { readonly kind: "PEPPERMINT_SURPRISE" }
  | { readonly kind: "OVERRUN" }
  | {
      readonly kind: "CHARGE_BONUS";
      readonly attack: 1;
      readonly minimumMove: 2;
    }
  | { readonly kind: "MELEE_FIELD_DEMOLITION" }
  /**
   * Tuning 3 (`pulp_wars-w49.3`): the Forest cover of the owner's ground
   * units (`TERRAIN_COVER_V7`); without it a Forest gives no cover.
   */
  | { readonly kind: "FOREST_COVER" }
  /**
   * Tuning 4 (`pulp_wars-w49.3`): a Forest never ends the Move of the
   * owner's ground units, whatever their role. It waives the Forest stop
   * only; the Snow stop still reads `FOREST_MOVEMENT_FREEDOM`'s roles.
   */
  | { readonly kind: "FOREST_MARCH" }
  | { readonly kind: "NAVAL_TRAINING_DISCOUNT"; readonly coins: 2 }
  /**
   * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1):
   * Seamanship, the owner's Patrol Boats ram.
   */
  | { readonly kind: "RAM" }
  /**
   * The naval branch (section 5.4): Harbours, every active Port and
   * Shipyard of the owner gives `population` more live population.
   */
  | { readonly kind: "HARBOURS"; readonly population: 1 }
  /**
   * The naval branch, the frozen sea (section 8.4): the owner's units
   * Freeze Shallow Water (Rime, the Ice Folk `SHORECRAFT`), or Deep Water
   * too (Pack Ice, the Ice Folk `NAVIGATION`).
   */
  | { readonly kind: "FREEZE"; readonly depth: "SHALLOW" | "DEEP" }
  /**
   * The frozen sea (section 8.9): Icebound (the Ice Folk
   * `NAVAL_ENGINEERING`), a Freeze locks a hostile afloat unit in the ice.
   */
  | { readonly kind: "ICEBOUND" }
  /**
   * The frozen sea (section 8.8): Black Ice (the Ice Folk `SEAMANSHIP`),
   * hostile land units on the owner's ice are Frozen at its Start Turn.
   */
  | { readonly kind: "BLACK_ICE" }
  /**
   * The frozen sea (section 8.10): Glacier (the Ice Folk `SUBMERSIBLES`),
   * the ice the owner makes lasts `iceTurns` of its turns and its units on
   * ice have Snow cover.
   */
  | { readonly kind: "GLACIER"; readonly iceTurns: 5 }
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
  | "COLD_AURA"
  // Ice Folk Freeze (`pulp_wars-w49.37`): the Ice Witch's Frost Bolt and
  // the Mammoth's Stampede.
  | "FROST_BOLT"
  | "STAMPEDE"
  // The Dwarf revision (section 3): the Hammerer rides the tunnel and digs
  // in; the Gyrocopter's bombing run; clockwork and the Gunner's two shots;
  // the Steam Mole's Tunnel and eruption; the Engineer's Assemble; the Steam
  // Cannon's Knockback; the Steam Tank's Plated. Repair keeps the
  // `TEND_WOUNDED` literal.
  | "RIDES_TUNNEL"
  | "DIG_IN"
  | "BOMB_RUN"
  | "CLOCKWORK"
  | "TWIN_SHOT"
  | "TUNNEL"
  | "ERUPTION"
  | "ASSEMBLE"
  | "KNOCKBACK"
  | "PLATED"
  // Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig's Whirl and the
  // Engineer's Barricade.
  | "WHIRL"
  | "BARRICADE"
  // The Candy revision (section 3): every Candy land role's Sugar Rush, the
  // Marshmallow's and the Golem's Bounce, the Pie Launcher's Splat, the
  // Confectioner's Re-bake, and the Gumball Gunner's Sugar Toss. Frosting
  // keeps the `TEND_WOUNDED` literal.
  | "SUGAR_RUSH"
  | "BOUNCE"
  | "SPLAT"
  | "REBAKE"
  | "SUGAR_TOSS"
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md sections 4.1,
  // 5.2, and 5.3): the Patrol Boat's Ram, and the Submarine's Submerged and
  // Torpedo.
  | "RAM"
  | "SUBMERGED"
  | "TORPEDO"
  // The naval branch, the frozen sea (section 8.4): every Ice Folk land
  // role Freezes.
  | "FREEZE"
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6):
  // the Human Juggernaut's Crushing Shove, the Undead Abomination's Swallow,
  // the Goblin Troll's Goblin Toss, the Dinosaur Brontosaurus's Thunder
  // Stomp, the Martian Colossus's Overstride, the Ice Folk Frost Giant's
  // Glacial Smash, the Dwarf Brass Titan's Siege Hammer, and the Candy
  // Gingerbread Giant's Break Off. The Giant Spider has none of them.
  | "CRUSH"
  | "SWALLOW"
  | "TOSS"
  | "STOMP"
  | "OVERSTRIDE"
  | "GLACIAL_SMASH"
  | "SIEGE_HAMMER"
  | "BREAK_OFF";

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
    | "NAVAL_CAPITAL"
    // The naval branch (section 3.2): the Submarine.
    | "NAVAL_HUNTER";
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
  /** Revision 17: Rally (Frenzy, Berserk) reach in Chebyshev distance. */
  readonly rallyRadius: 1 | 2;
  /**
   * Goblin explosions and Berserk (`pulp_wars-w49.35`): what the role's
   * `RALLY` does. `INSPIRE` (Rally, Frenzy, War Drums, Psychic Command)
   * makes its targets Inspired; `BERSERK` (the Orc Warboss, which replaced
   * WAAAGH! and its `rallyReachesSupportAndSiege`) makes every own
   * land-form unit in reach that has not moved this turn Berserk
   * (`berserkThisTurn`): +1 Move and no stop in hostile zones of control
   * until the end of the turn.
   */
  readonly rallyEffect: "INSPIRE" | "BERSERK";
  /** Revision 17: fixed Kaboom damage, or null without Kaboom. */
  readonly kaboomDamage: number | null;
  /** Revision 17: fixed death-blast damage, or null for a non-exploder. */
  readonly deathBlastDamage: number | null;
  /** Revision 17: HP regenerated at its owner's Start Turn (the Troll). */
  readonly regeneration: number;
  /**
   * The Goblin pass (`pulp_wars-w49.12`, 7r50): the most Gang Up the role's
   * attacks get, under its faction's maximum: 0 for the Goblin Bomb Chucker
   * (a bomb is thrown before the mob closes in), 1 for the Rocket Cart (the
   * correction pass: one spotter), 2 for every other role. Irrelevant for a
   * faction without Gang Up.
   */
  readonly gangUpLimit: 0 | 1 | 2;
  /**
   * The Goblin pass: Blast-proof (the Orc Brute). In land form the unit is
   * not hit by an explosion (Kaboom, death blast, Blast Mountain) or by the
   * splash of an attack on a unit next to it.
   */
  readonly blastProof: boolean;
  /**
   * The Goblin pass: Crash (the Scrap Buggy). The unit may Kaboom after it
   * has attacked, also while a Ram continuation is waiting.
   */
  readonly kaboomAfterAttack: boolean;
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
   * The Ice Folk revision (section 6.2): Glide. In land form a step from a
   * Snow tile onto a Snow tile costs one half-point (`pulp_wars-1wy.3`:
   * both ends, no longer every step that leaves Snow). True for every Ice Folk land
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
  /**
   * The Undead pass, correction (`pulp_wars-w49.13`): Carrion, the
   * `attack2` bonus of the unit's own attack on a Bitten or Plagued unit
   * (the Ghoul 2), or 0.
   */
  readonly carrionBonus2: number;
  /**
   * The Dinosaur pass (`pulp_wars-w49.15`, 7r53): Pack Hunt, the `attack2`
   * bonus of the unit's own attack on a unit that stands next to a
   * dinosaur (a land-form growing unit) of the attacker's owner (the
   * Caveman 2), or 0.
   */
  readonly packHuntBonus2: number;
  /**
   * The Martian pass (`pulp_wars-w49.14`, 7r52): the role's heat ray does
   * not overheat once its owner has Heat Sinks (the Martian Ray Gunner):
   * a full-power ray leaves it not Cooling.
   */
  readonly heatSink: boolean;
  /**
   * The Martian pass, correction (`pulp_wars-w49.14`): the role's Rally
   * (the Martian Brain's Psychic Command) leaves the unit Cooling until
   * the end of its owner's next turn, and a Cooling unit cannot Rally: one
   * command every second turn. (The `cooling` list holds the entry, as for
   * a full-power heat ray.)
   */
  readonly rallyCools: boolean;
  /**
   * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 2.3): a
   * construct (Clockwork Gunner, Brass Titan) is fully mechanical: not
   * living, no Grave, Mind Control-immune, never mends itself. False for
   * every role of every other faction.
   */
  readonly construct: boolean;
  /**
   * The Dwarf revision (section 7.1): Unflinching, an `ATTACK` by the unit
   * in land form uses its maximum HP for its own force.
   */
  readonly unflinchingAttack: boolean;
  /** The Dwarf revision (section 9.1): Repair heals it as a machine. */
  readonly repairsAsMachine: boolean;
  /**
   * The Dwarf revision (section 9.1): the Engineer's Repair heals a machine
   * this much (null for every other healer, which heals 2).
   */
  readonly repairMachineHeal: number | null;
  /**
   * The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): the Shaman's
   * Tend Wounded heals a hatched dinosaur (a land-form unit that grows)
   * this much (null for every other healer, which heals 2).
   */
  readonly tendGrowingHeal: number | null;
  /** The Dwarf revision (section 8): the role digs in (Hammerer, Mole). */
  readonly digsIn: boolean;
  /** The Dwarf revision (section 5.1): the Tunnel range, or 0 without. */
  readonly tunnelRange: number;
  /** The Dwarf revision (section 5.5): the role rides a Mole's tunnel. */
  readonly ridesTunnel: boolean;
  /** The Dwarf revision (section 6): the role makes bombing runs. */
  readonly bombs: boolean;
  /**
   * The Dwarf revision (section 7.3): the shots of a turn on which the unit
   * had not moved at its first shot (2 for the Clockwork Gunner), or 1.
   */
  readonly unmovedShots: 1 | 2;
  /**
   * Tuning 5 (`pulp_wars-w49.4`): Open to ranged. The role's Defense in
   * half-points against an attack from two or more tiles, in place of
   * `defense2` (fortification and cover apply on top as usual); null for a
   * role that defends alike at every distance. Only the Human Guard has it.
   */
  readonly rangedDefense2: number | null;
  /** The Dwarf revision (section 10.1): the Steam Cannon's Knockback. */
  readonly knockback: boolean;
  /**
   * The Dwarf revision (section 10.2): Plated, the most HP one instance of
   * damage takes (the Steam Tank's 4), or null.
   */
  readonly plated: number | null;
  /**
   * The Martian balance revision (docs/product/RULESET_7_BALANCE_MARTIAN_ICE.md
   * section 5.3): the role's `TRACTOR_BEAM` is the Heavy Tractor Beam (the
   * Mothership): reach 2 to `HEAVY_TRACTOR_RANGE_V7`, a pull of up to
   * `HEAVY_TRACTOR_PULL_V7` tiles, and free once a turn instead of a primary
   * action. False for every other role (the Saucer's pull is the ordinary
   * primary-action Tractor Beam).
   */
  readonly heavyTractorBeam: boolean;
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 5.4): what
   * the role gets while Rushed besides the Rush itself: the Donut Racer's
   * Escape, the Chocolate Bunny's Sugar Frenzy, or nothing.
   */
  readonly rushPerk: "ESCAPE" | "SUGAR_FRENZY" | null;
  /**
   * The Candy revision (section 6.1): a death of the role leaves Crumbs (the
   * seven trainable Candy land roles). False for every other faction.
   */
  readonly leavesCrumbs: boolean;
  /**
   * The ninth unit (`pulp_wars-w49.17`, 7r55,
   * docs/product/RULESET_7_NINTH_UNIT.md): Heavyweight. How many units the
   * role counts as when it stands next to the target of another own unit's
   * Gang Up attack (the Goblin Ogre 2, every other role 1).
   */
  readonly gangUpWeight: 1 | 2;
  /**
   * The ninth unit: Rise Again. The HP at which a unit of the role climbs
   * out of its own Grave, once, at its owner's next Start Turn (the Undead
   * Wight 7), or null.
   */
  readonly riseAgainHp: number | null;
  /**
   * The ninth unit: Shock Field. The damage a unit takes for attacking a
   * land-form unit of the role from the next tile while that unit's Shield
   * has at least 1 point (the Martian Shock Trooper 3), or 0.
   */
  readonly shockFieldDamage: number;
  /**
   * The ninth unit: Rock Hard. In land form nothing moves the unit: no
   * Push, Charge! shove, Knockback, Tractor Beam, or Bounce (the Candy
   * Jawbreaker).
   */
  readonly immovable: boolean;
  /**
   * The ninth unit: Thagomizer. A unit the role's attack hits and does not
   * kill is Cracked (1 less Defense, never below 0.5) until the end of the
   * attacker's owner's turn (the Dinosaur Stegosaurus).
   */
  readonly cracksArmour: boolean;
  /**
   * The ninth unit: Frostbite. A unit that attacks a land-form unit of the
   * role from the next tile and survives is Frozen (the Ice Folk Musk Ox).
   */
  readonly frostbite: boolean;
  /**
   * Dwarf crowd control (`pulp_wars-w49.33`): Whirl, which replaced the
   * ninth unit's Three Hammers. The role's `WHIRL` primary action hits
   * every visible hostile unit within 1 at once with its ordinary attack,
   * unanswered (the Dwarf Whirligig).
   */
  readonly whirl: boolean;
  /**
   * The ninth unit: the role never gains Inspired from a Rally, whatever
   * its tactical label (the Dinosaur Triceratops: it was excluded from War
   * Drums as a `SIEGE` role and is a `LINE` role now; design decision 10).
   */
  readonly rallyExcluded: boolean;
  /**
   * Every attack of the role destroys a Field Defense on the target's tile
   * (reason `CATAPULT`): the `CATAPULT` role of every faction, and (the
   * ninth unit) the Dinosaur Triceratops, which keeps the rule in the
   * heavy slot.
   */
  readonly demolishesFieldDefense: boolean;
  /**
   * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6):
   * the numbers of the eight signature abilities, each read only when the
   * role, under the unit's kind, has the signature's ability literal (G3).
   * 0 (or false) for every other role and for the neutral Giant Spider.
   *
   * `crushDamage`: Crushing Shove, the fixed damage a defender that is not
   * pushed (and a hostile blocker behind it) takes (`CRUSH_DAMAGE_V7`).
   */
  readonly crushDamage: number;
  /** Swallow: the most HP a unit may have to be swallowed. */
  readonly swallowMaxHp: number;
  /** Goblin Toss: the farthest landing tile (the nearest is 2). */
  readonly tossRange: number;
  /** Thunder Stomp: the fixed damage to every hostile ground unit around. */
  readonly stompDamage: number;
  /** Overstride: the fixed damage to every hostile unit stepped over. */
  readonly trampleDamage: number;
  /** Glacial Smash: the Shatter threshold of the role's melee attacks. */
  readonly glacialSmashHp: number;
  /** Siege Hammer: melee attacks ignore fortification and raze Walls. */
  readonly siegeHammer: boolean;
  /** Break Off: the HP spent (the Giant needs more than this). */
  readonly breakOffHp: number;
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
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the root
    // (Engineering before). The rule and the price are unchanged.
    technology: "DRILL",
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

/**
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`,
 * docs/product/RULESET_7_TUNING_1.md): the economy numbers the hand
 * playtest moved.
 */
/** Commerce: Coins of land trade per connected city (1 before). */
export const LAND_TRADE_INCOME_COINS_V7 = 1 as const;
/**
 * A Monument's live population. 3 before tuning 1, 2 from tuning 1 to 7r53,
 * and 3 again since the economy rejig (`pulp_wars-w49.16`, 7r54), which
 * made the achievements that fund one harder.
 */
export const MONUMENT_POPULATION_V7 = 3 as const;
/**
 * The level from which a city offers its faction's reward giant (the
 * `JUGGERNAUT` reward) or the Treasury, at that level and every later one.
 * The reward ladder rework (`pulp_wars-zypi`): level 5 and every level
 * above it, with no once-per-city limit (the user: "giant OR 10 coins").
 * History: from tuning 4 to 7r53 level 5 and above, in the owner's first
 * capital only (once per player); the economy rejig (`pulp_wars-w49.16`,
 * 7r54) made it every city, once, from level 6.
 */
export const REWARD_UNIT_LEVEL_V7 = 5 as const;
/** The Boom reward's permanent population (unchanged). */
export const BOOM_POPULATION_V7 = 3 as const;
/**
 * Coins of the Coin rewards. The reward ladder rework (`pulp_wars-zypi`):
 * the level-5+ Treasury pays 10 (6 from tuning 4, 12 before), so the Coins
 * are a real alternative to the giant. `TREASURY_6`, the level-4 Treasury
 * of tuning 1 to `pulp_wars-zypi` (8 before tuning 1), is no longer
 * offered; a record that holds it was paid when it was chosen.
 */
export const CITY_REWARD_COINS_V7 = Object.freeze({
  STOCKPILE: 4,
  TREASURY_6: 6,
  TREASURY: 10,
} as const);
/**
 * Tuning 4: the unit capacity one Barracks reward adds to its city. No
 * longer offered since `pulp_wars-zypi`; a city whose reward history holds
 * a Barracks keeps the slot.
 */
export const BARRACKS_CAPACITY_V7 = 1 as const;
/**
 * The reward ladder rework (`pulp_wars-zypi`): the Coins one Economic
 * Miracle (a level-4 reward) adds to its city's income every turn. The
 * record travels with the city on capture, so the captor collects it.
 */
export const ECONOMIC_MIRACLE_COINS_V7 = 1 as const;
/**
 * Tuning 4: the Coins a Pillage pays (1 before), and the Field Defense's
 * fortification levels (1 before).
 */
export const PILLAGE_COINS_V7 = 3 as const;
export const FIELD_DEFENSE_FORTIFICATION_LEVELS_V7 = 2 as const;
// Tuning 5 (`pulp_wars-w49.4`, 7r48): Drill, the paid Promotion at a
// Barracks (`DRILL_UNIT`, 10 Coins), is removed. A Barracks is +1 unit.
/**
 * Land Grant: 1 Coin per explored tile it claims (tuning 5,
 * `pulp_wars-w49.4`; 2 Coins a tile and at least 6 since tuning 1, a flat 6
 * before that). The minimum is one tile's price.
 */
export const LAND_GRANT_COST_PER_TILE_V7 = 1 as const;
export const LAND_GRANT_MINIMUM_COST_V7 = 1 as const;
export function landGrantCostV7(exploredClaimableTiles: number): number {
  if (
    !Number.isSafeInteger(exploredClaimableTiles) ||
    exploredClaimableTiles < 0
  )
    throw new RangeError("INVALID_STATE");
  return Math.max(
    LAND_GRANT_MINIMUM_COST_V7,
    LAND_GRANT_COST_PER_TILE_V7 * exploredClaimableTiles,
  );
}
/**
 * The Goblin pass, correction (`pulp_wars-w49.12`): Plunder pays 2 Coins a
 * kill (1 before): at 1 the Roads and Plunder technologies cost a hand
 * player 37 Coins and returned 8 in four rounds.
 */
export const PLUNDER_COINS_V7 = 2 as const;
/**
 * Goblin explosions and Berserk (`pulp_wars-w49.35`): a Berserk unit's
 * extra Move until the end of the turn.
 */
export const BERSERK_MOVE_BONUS_V7 = 1 as const;
/** Blast Mountain: permanent population for the tile's city (0 before). */
export const BLAST_MOUNTAIN_POPULATION_V7 = 1 as const;
/** Blast Mountain: its price in Coins. */
export const BLAST_MOUNTAIN_COST_V7 = 3 as const;
/**
 * Tuning 3 (`pulp_wars-w49.3`): the fixed damage of a Blast Mountain to
 * every unit on the blasted tile and on the eight tiles around it, friend
 * and foe (an explosion of cause `BLAST`).
 */
export const BLAST_MOUNTAIN_DAMAGE_V7 = 5 as const;
/**
 * Tuning 3 (`pulp_wars-w49.3`): a hired unit costs its training price in
 * the Market's city times 3/2, rounded up.
 */
export function hireCostV7(trainingCost: number): number {
  return Math.ceil((trainingCost * 3) / 2);
}
/** Tuning 3: a Market's city may hold this many units above its capacity. */
export const HIRE_EXTRA_CAPACITY_V7 = 1 as const;
/**
 * Treasure chests: before this round a chest never gives a unit of a tier 3
 * technology; the seat's `RAIDER`-role unit appears instead.
 */
export const TREASURE_TIER_3_UNIT_FIRST_ROUND_V7 = 15 as const;
export const TREASURE_EARLY_UNIT_ROLE_V7 = "RAIDER" as const;

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
      // Tuning 3 (`pulp_wars-w49.3`): Forest cover is this technology's.
      { kind: "FOREST_COVER" },
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
      // Tuning 4 (`pulp_wars-w49.3`): every ground unit marches through
      // Forest.
      { kind: "FOREST_MARCH" },
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
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): 2 Coins per connected city (1
    // before).
    // Tuning 3 (`pulp_wars-w49.3`): Markets hire (`HIRE`).
    [
      { kind: "LAND_TRADE_INCOME", coins: LAND_TRADE_INCOME_COINS_V7 },
      { kind: "COMMAND", command: "HIRE" },
    ],
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
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56,
    // docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): the root (shown as
    // "Crafting") gives the Workshop, which left Engineering; the defender
    // (the `GUARD` role) left it for Fortification. Reveal Ore and the
    // first-capture Spoils stay.
    [
      { kind: "RESOURCE_REVEAL", resources: ["ORE"] },
      { kind: "COMMAND", command: "BUILD_WORKSHOP" },
      {
        kind: "ECONOMIC_FORMULA",
        improvement: "WORKSHOP",
        formula: "DISTINCT_BASIC_TYPES",
      },
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
      { kind: "COMMAND", command: "REDEVELOP" },
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the heavy line unit
      // left this node for Metallurgy (it was the Human Swordsman's from
      // tuning 5 to 7r54). Engineering gives no unit. The Industry
      // reshuffle (7r56): the Workshop left it for the root.
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
      // The ninth unit (`pulp_wars-w49.17`, 7r55): the heavy line unit of
      // every faction (the `SWORDSMAN` role: Champion, Ogre, Wight,
      // Triceratops, Shock Trooper, Mammoth, Steam Tank, Jawbreaker).
      { kind: "UNIT_ROLE", role: "SWORDSMAN" },
    ],
  ),
  node(
    "FORTIFICATION",
    "INDUSTRY",
    2,
    ["DRILL"],
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the defender of
    // every faction (the `GUARD` role: Guard, Zombie, Orc Brute,
    // Ankylosaurus, Shield Projector, Musk Ox, Steam Mole, Marshmallow) is
    // here, on the other sub-branch from the heavy line unit.
    [
      { kind: "COMMAND", command: "BUILD_FIELD_DEFENSE" },
      { kind: "UNIT_ROLE", role: "GUARD" },
    ],
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 2.1):
  // the second Naval line, Shorecraft -> Seamanship -> Submersibles.
  node(
    "SEAMANSHIP",
    "NAVAL",
    2,
    ["SHORECRAFT"],
    [{ kind: "RAM" }, { kind: "COMMAND", command: "BOARD" }],
  ),
  node(
    "SUBMERSIBLES",
    "NAVAL",
    3,
    ["SEAMANSHIP"],
    [
      { kind: "UNIT_ROLE", role: "SUBMARINE" },
      { kind: "HARBOURS", population: 1 },
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

/**
 * Tuning 5 (`pulp_wars-w49.4`): the roles only the Human tree unlocks, and
 * the Human nodes without those unlocks. Every other faction's tree is
 * derived from this list, so a Human-only unit never appears in it.
 *
 * The ninth unit (`pulp_wars-w49.17`, 7r55): the list is empty. Every
 * faction's tree unlocks the heavy line role (`SWORDSMAN`) at Metallurgy,
 * so the shared nodes are the Human nodes.
 */
export const HUMAN_ONLY_ROLES_V7: readonly UnitRoleIdV7[] = Object.freeze([]);
export const SHARED_BASELINE_NODES_V7: readonly TechnologyNodeV7[] = deepFreeze(
  ORIGINAL_BASELINE_V5_NODES.map((original) =>
    node(
      original.id,
      original.branch,
      original.tier,
      original.prerequisites,
      original.unlocks.filter(
        (unlock) =>
          !(
            unlock.kind === "UNIT_ROLE" &&
            HUMAN_ONLY_ROLES_V7.includes(unlock.role)
          ),
      ),
    ),
  ),
);

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
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): 4 Coins (3 before).
    cost: 4,
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
    technology: "FORTIFICATION",
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
    abilities: ["ATTACK", "CAPTURE", "RALLY", "TEND_WOUNDED"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Catapult",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): Attack 3 (3.5 before).
    attack2: 6,
    defense2: 1,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Knight",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): 13 HP (10 before).
    maxHp: 13,
    // Tuning 3 (`pulp_wars-w49.3`): Attack 4 (3 before): it kills a full-HP
    // Raider, Marksman, Captain, Catapult, or Knight in one attack also in
    // Forest cover, and a Fighter in the open but not one in cover, behind
    // a Field Defense, or on a walled center; never a Guard.
    attack2: 8,
    defense2: 2,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    // Tuning 2 (`pulp_wars-w49.3`, 7r47): the Human Knight captures
    // settlements. Since `pulp_wars-ke95` every land role of every faction
    // has `CAPTURE`; only boats and the neutral Giant Spider lack it.
    abilities: ["ATTACK", "CAPTURE", "OVERRUN"],
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
    // The giants' signatures (RULESET_7_GIANTS.md section 6.1): Push stays
    // only on the Human Juggernaut, which crushes what it cannot push.
    abilities: ["ATTACK", "CAPTURE", "PUSH", "CRUSH"],
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
    // The naval branch (section 4.1): the Ram needs Seamanship.
    abilities: ["ATTACK", "RAM"],
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 5.1).
  SUBMARINE: role({
    role: "SUBMARINE",
    label: "Submarine",
    tacticalRole: "NAVAL_HUNTER",
    cost: 9,
    maxHp: 12,
    attack2: 8,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SUBMERSIBLES",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "SUBMERGED", "TORPEDO"],
  }),
  // Tuning 5 (`pulp_wars-w49.4`): the heavy line unit of the Industry
  // branch. Attack 3.5 kills a Guard in two attacks and a Fighter in two;
  // 15 HP at Defense 2.5 survives one Knight attack (11) and two Marksman
  // shots, and falls to two Catapult shots. Move 1, no ability of its own.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): displayed as the Champion
  // (the Swordsman before), 6 Coins (5 before), at Metallurgy (tier 3;
  // Engineering, tier 2, before). The role ID stays `SWORDSMAN`: it is the
  // heavy line slot of every faction.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Champion",
    tacticalRole: "LINE",
    cost: 6,
    maxHp: 15,
    attack2: 7,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
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
          rallyEffect: "INSPIRE",
          kaboomDamage: null,
          deathBlastDamage: null,
          regeneration: 0,
          gangUpLimit: 2,
          blastProof: false,
          kaboomAfterAttack: false,
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
          carrionBonus2: 0,
          packHuntBonus2: 0,
          heatSink: false,
          rallyCools: false,
          construct: false,
          unflinchingAttack: false,
          repairsAsMachine: false,
          repairMachineHeal: null,
          tendGrowingHeal: null,
          digsIn: false,
          tunnelRange: 0,
          ridesTunnel: false,
          bombs: false,
          unmovedShots: 1,
          rangedDefense2: null,
          knockback: false,
          plated: null,
          heavyTractorBeam: false,
          rushPerk: null,
          leavesCrumbs: false,
          gangUpWeight: 1,
          riseAgainHp: null,
          shockFieldDamage: 0,
          immovable: false,
          cracksArmour: false,
          frostbite: false,
          whirl: false,
          rallyExcluded: false,
          demolishesFieldDefense: roleId === "CATAPULT",
          crushDamage: 0,
          swallowMaxHp: 0,
          tossRange: 0,
          stompDamage: 0,
          trampleDamage: 0,
          glacialSmashHp: 0,
          siegeHammer: false,
          breakOffHp: 0,
          ...overrides[roleId],
        },
      ]),
    ) as Record<UnitRoleIdV7, RoleMechanicsV7>,
  );

/**
 * Tuning 2 (`pulp_wars-w49.3`, 7r47): a ranged unit never advances. A unit
 * is ranged when its kind's role rule has a range above 1, whatever the
 * distance of the attack (a Spitter that kills an adjacent unit stays). A
 * reach that an ability adds to a range-1 role (Rockfall) does not make it
 * ranged; such an attack is from distance 2 and never advanced.
 */
/**
 * Tuning 5 (`pulp_wars-w49.4`): the Human Guard's Defense against an attack
 * from two or more tiles (1; its Defense is 3). Two Marksmen leave a Guard
 * in the open at 4 HP, which one Fighter kills.
 */
export const GUARD_RANGED_DEFENSE2_V7 = 2 as const;

/**
 * The Undead pass (`pulp_wars-w49.13`, 7r51,
 * docs/product/RULESET_7_TUNING_UNDEAD.md): Bones. The Undead Skeleton's
 * Defense against an attack from two or more tiles (3; its Defense is 2):
 * arrows pass through it. A Marksman's shot deals a full-HP Skeleton 4
 * instead of 5, so three shots kill it instead of two.
 */
export const SKELETON_RANGED_DEFENSE2_V7 = 6 as const;

/**
 * The Undead pass, correction (`pulp_wars-w49.13`): Carrion. A Ghoul's own
 * attack on a Bitten or Plagued unit has +1 Attack (2 half-units): it
 * finishes what a Zombie or a Lich has marked.
 */
export const GHOUL_CARRION_BONUS2_V7 = 2 as const;

/**
 * The Undead pass, correction: the distance (Chebyshev) within which a
 * Necromancer's Raise Dead reaches a Grave (1 before).
 */
export const RAISE_DEAD_RADIUS_V7 = 2 as const;

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55): the HP at which a Wight
 * climbs out of its own Grave (half its 14).
 */
export const WIGHT_RISE_AGAIN_HP_V7 = 7 as const;
/** The ninth unit: the Ogre counts as this many units for Gang Up. */
export const OGRE_GANG_UP_WEIGHT_V7 = 2 as const;
/** The ninth unit: what a Shock Field deals a melee attacker. */
export const SHOCK_FIELD_DAMAGE_V7 = 3 as const;
/** The ninth unit: the Defense (half-points) a Cracked unit loses. */
export const CRACKED_DEFENSE2_V7 = 2 as const;
/** The ninth unit: the least Defense (half-points) of a Cracked unit. */
export const CRACKED_MINIMUM_DEFENSE2_V7 = 1 as const;

/*
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md sections 6.1 to
 * 6.8; the first numbers to tune are listed in section 7).
 */
/** Crushing Shove: the fixed damage of a crush and of the collision. */
export const CRUSH_DAMAGE_V7 = 3 as const;
/** Swallow: the most HP (Shield not counted) a swallowed unit may have. */
export const SWALLOW_MAX_HP_V7 = 12 as const;
/** Swallow: the HP a held victim loses at its holder's owner's Start Turn. */
export const DIGEST_DAMAGE_V7 = 4 as const;
/** Goblin Toss: the farthest landing distance (the nearest is 2). */
export const TOSS_RANGE_V7 = 3 as const;
/** Goblin Toss: the nearest landing distance. */
export const TOSS_MINIMUM_RANGE_V7 = 2 as const;
/** Thunder Stomp: the fixed damage to every hostile ground unit around. */
export const STOMP_DAMAGE_V7 = 4 as const;
/** Overstride: the fixed damage to each hostile unit stepped over. */
export const TRAMPLE_DAMAGE_V7 = 3 as const;
/** Glacial Smash: the Frost Giant's Shatter threshold. */
export const GLACIAL_SMASH_HP_V7 = 8 as const;
/**
 * Break Off (the user's change of 2026-10-09): the HP the Gingerbread Giant
 * spends (it needs more than this, so 11 or more) to make
 * `BREAK_OFF_UNITS_V7` Gingerbread Men, each an ordinary Toffee Trooper at
 * full HP.
 */
export const BREAK_OFF_HP_V7 = 10 as const;
/** Break Off: the Gingerbread Men one Break Off makes. */
export const BREAK_OFF_UNITS_V7 = 2 as const;
/**
 * Break Off: the presentation variant a Gingerbread Man carries on its unit
 * (`UnitStateV7.variant`); in every rule it is the Candy `FIGHTER` (a
 * Toffee Trooper).
 */
export const GINGERBREAD_MAN_VARIANT_V7 = "GINGERBREAD_MAN" as const;

/**
 * Tuning 5: a land-form defender's base Defense in half-points against an
 * attack from `distance` tiles: the role's `rangedDefense2` from two or
 * more tiles when it has one, else its `defense2`.
 */
export function roleDefense2AtDistanceV7(
  rule: Pick<EffectiveRoleRuleV7, "defense2">,
  mechanics: Pick<RoleMechanicsV7, "rangedDefense2">,
  distance: number,
): number {
  return distance >= 2 && mechanics.rangedDefense2 !== null
    ? mechanics.rangedDefense2
    : rule.defense2;
}

export function isRangedRoleRuleV7(
  rule: Pick<EffectiveRoleRuleV7, "range">,
): boolean {
  return rule.range > 1;
}

export const ORIGINAL_ROLE_MECHANICS_V7 = mechanics({
  // Tuning 1 (`pulp_wars-w49.3`, 7r46): a Marksman never advances after a
  // kill (it used to, after a kill from distance 1).
  MARKSMAN: { advancesAfterKill: false },
  CATAPULT: { advancesAfterKill: false },
  BATTLESHIP: { splash: true },
  // Tuning 5 (`pulp_wars-w49.4`): Open to ranged, the Human Guard only.
  GUARD: { rangedDefense2: GUARD_RANGED_DEFENSE2_V7 },
  // Tuning 4 (`pulp_wars-w49.3`): a Human Raider is not stopped by hostile
  // zones of control (the Sabretooth's Prowl mechanic), so it slips past a
  // screen to the units behind it.
  RAIDER: { ignoresZocStops: true },
  // The giants' signatures (section 6.1): Crushing Shove.
  JUGGERNAUT: { crushDamage: CRUSH_DAMAGE_V7 },
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
  SHARED_BASELINE_NODES_V7.map((original) =>
    node(original.id, original.branch, original.tier, original.prerequisites, [
      ...original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? [{ kind: "NECROMANCER_SUPPORT" }]
          : unlock.kind === "OVERRUN"
            ? []
            : [unlock],
      ),
      // The Undead pass, correction: Explosives (shown as Pestilence)
      // keeps both Human unlocks and adds `PESTILENCE`.
      ...(original.id === "EXPLOSIVES"
        ? [{ kind: "PESTILENCE" } as const]
        : []),
    ]),
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
    // Revision 15 (Undead fragility): 18 HP (was 20); risings keep 10 HP
    // (12 since 7r57, step two of the Undead pass).
    maxHp: 18,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "FORTIFICATION",
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
    abilities: ["ATTACK", "CAPTURE", "RALLY", "RAISE_DEAD"],
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
    abilities: ["ATTACK", "CAPTURE", "PLAGUE"],
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
    // The Undead pass (`pulp_wars-w49.13`, 7r51): Escape. A Vampire that
    // survives its attack may move again (it strikes and flies back).
    abilities: ["ATTACK", "CAPTURE", "LIFESTEAL", "UNANSWERED", "ESCAPE"],
  }),
  JUGGERNAUT: role({
    ...ORIGINAL_ROLE_RULES_V7.JUGGERNAUT,
    label: "Abomination",
    // The Undead pass (7r51): Infect. A land unit the Abomination kills
    // rises as a Zombie (it does not bite: a survivor is not Bitten).
    // The giants' signatures (section 6.2): Swallow instead of Push.
    abilities: ["ATTACK", "CAPTURE", "INFECT", "SWALLOW"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Wight, the Undead
  // heavy line unit (Metallurgy). Rise Again is the role mechanic
  // `riseAgainHp`.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Wight",
    tacticalRole: "LINE",
    cost: 6,
    maxHp: 14,
    attack2: 6,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
});

/**
 * The Zombie never advances after a kill. The Lich keeps Catapult parity and
 * adds the Battleship splash rule (revision 13 section 6.7). The `SPLASH`
 * capability is this engine mechanic rather than a declared role ability, so
 * Human public role abilities stay exactly as in revision 12.
 */
export const UNDEAD_ROLE_MECHANICS_V7 = mechanics({
  // The Undead pass (`pulp_wars-w49.13`, 7r51): Bones.
  FIGHTER: { rangedDefense2: SKELETON_RANGED_DEFENSE2_V7 },
  // The Undead pass, correction: Carrion.
  RAIDER: { carrionBonus2: GHOUL_CARRION_BONUS2_V7 },
  GUARD: { advancesAfterKill: false },
  CATAPULT: { advancesAfterKill: false, splash: true },
  // The Undead pass (7r51): with Infect the Abomination's victim rises on
  // its own tile, so the Abomination does not advance, as the Zombie does
  // not. The giants' signatures (section 6.2): Swallow.
  JUGGERNAUT: { advancesAfterKill: false, swallowMaxHp: SWALLOW_MAX_HP_V7 },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Wight's Rise Again.
  SWORDSMAN: { riseAgainHp: WIGHT_RISE_AGAIN_HP_V7 },
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
 * except that Administration grants Berserk support (`pulp_wars-w49.35`;
 * WAAAGH! support before) instead of Captain
 * support and Commerce (displayed as Plunder) grants Plunder instead of land
 * trade. Chivalry keeps Overrun (displayed as Ram).
 */
export const GOBLIN_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  SHARED_BASELINE_NODES_V7.map((original) =>
    node(
      original.id,
      original.branch,
      original.tier,
      original.prerequisites,
      original.unlocks.map((unlock): TechnologyUnlockV7 =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? { kind: "BERSERK_SUPPORT" }
          : unlock.kind === "LAND_TRADE_INCOME"
            ? { kind: "PLUNDER", coins: PLUNDER_COINS_V7 }
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
    technology: "FORTIFICATION",
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
    abilities: ["ATTACK", "CAPTURE", "RALLY"],
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
    abilities: ["ATTACK", "CAPTURE", "KABOOM"],
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
    abilities: ["ATTACK", "CAPTURE", "OVERRUN", "KABOOM"],
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
    // The giants' signatures (section 6.3): Goblin Toss instead of Push.
    abilities: ["ATTACK", "CAPTURE", "REGENERATE", "TOSS"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Ogre, the Goblin
  // heavy line unit (Metallurgy). No Kaboom, no death blast, not
  // Blast-proof. Heavyweight is the role mechanic `gangUpWeight`.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Ogre",
    tacticalRole: "LINE",
    cost: 5,
    maxHp: 16,
    attack2: 5,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
});

/**
 * Revision 17 Goblin engine mechanics (as amended by the Goblin pass,
 * `pulp_wars-w49.12`, docs/product/RULESET_7_TUNING_GOBLIN.md): only the
 * Orc Brute builds Field Defense, and it is Blast-proof; a Bomb Chucker's
 * bomb gets no Gang Up; a Scrap Buggy may Kaboom after attacking; the Orc
 * Warboss's `RALLY` is Berserk (`pulp_wars-w49.35`, radius 2; it replaced
 * WAAAGH!); goblin-crewed roles carry Kaboom damage and the Bomb Chucker,
 * Rocket Cart, and Scrap Buggy death-blast damage (resolved by
 * `explosions.ts`); the Bomb Chucker's bomb splashes every other unit
 * next to its target (splash target mode `ALL`, friendly fire); the Troll
 * regenerates 4 HP. Boats are Human boats.
 */
export const GOBLIN_ROLE_MECHANICS_V7 = mechanics({
  // Goblin explosions and Berserk (`pulp_wars-w49.35`): the Goblin's
  // Kaboom is 6 (5 before); the other roles keep theirs.
  FIGHTER: { buildsFieldDefense: false, kaboomDamage: 6 },
  RAIDER: { kaboomDamage: 4 },
  // The Goblin pass (7r50): a bomb gets no Gang Up.
  MARKSMAN: {
    splash: true,
    splashTargets: "ALL",
    kaboomDamage: 4,
    // `pulp_wars-w49.35`: every death blast is 3 harder (2 before).
    deathBlastDamage: 5,
    gangUpLimit: 0,
  },
  // The Goblin pass (7r50): the Orc Brute is Blast-proof.
  GUARD: { blastProof: true },
  // `pulp_wars-w49.35`: Berserk (radius 2) replaced WAAAGH!.
  CAPTAIN: { rallyRadius: 2, rallyEffect: "BERSERK" },
  // The Goblin pass, correction: a rocket's Gang Up is at most +1 (with
  // +2 one Cart and two Goblins killed any unit but the Juggernaut).
  CATAPULT: {
    advancesAfterKill: false,
    kaboomDamage: 5,
    // `pulp_wars-w49.35`: 4 before.
    deathBlastDamage: 7,
    gangUpLimit: 1,
  },
  // The Goblin pass (7r50): Crash, a Scrap Buggy may Kaboom after attacking.
  // `pulp_wars-w49.35`: its death blast is 7 (4 before).
  KNIGHT: { kaboomDamage: 5, deathBlastDamage: 7, kaboomAfterAttack: true },
  // The giants' signatures (section 6.3): Goblin Toss.
  JUGGERNAUT: { regeneration: 4, tossRange: TOSS_RANGE_V7 },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Ogre's Heavyweight.
  SWORDSMAN: { gangUpWeight: OGRE_GANG_UP_WEIGHT_V7 },
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
    SHARED_BASELINE_NODES_V7.map((original) =>
      node(
        original.id,
        original.branch,
        original.tier,
        original.prerequisites,
        [
          ...original.unlocks.map((unlock): TechnologyUnlockV7 =>
            unlock.kind === "COMMAND" &&
            unlock.command === "BUILD_FIELD_DEFENSE"
              ? { kind: "NESTING", eggHp: 4, hatchTurns: 0, citySlots: 1 }
              : unlock,
          ),
          ...(original.id === "EXPLOSIVES"
            ? [{ kind: "WALLBREAKER" } as const]
            : []),
        ],
      ),
    ),
  );

/**
 * The Dinosaur pass (`pulp_wars-w49.15`, 7r53): Pack Hunt. A Caveman's own
 * attack on a unit that stands next to one of its owner's dinosaurs has +1
 * Attack (`attack2` 2). Never on its retaliation.
 */
export const CAVEMAN_PACK_HUNT_BONUS2_V7 = 2 as const;
/**
 * The Dinosaur pass, correction: the HP a Shaman's Tend Wounded restores
 * to a hatched dinosaur (2 to a Caveman or a Shaman, as every healer). A
 * dinosaur has 20 to 36 HP where a Human unit has 10 to 17, and resting
 * in its own land restores 4.
 */
export const SHAMAN_TEND_DINOSAUR_V7 = 4 as const;

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
    technology: "FORTIFICATION",
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
    abilities: ["ATTACK", "CAPTURE", "RALLY", "TEND_WOUNDED", "HATCH"],
  }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Stegosaurus, a siege
  // dinosaur at Sawmilling (the Triceratops held this role until 7r54 and
  // is the `SWORDSMAN` role now). Range 2–3, cannot attack after moving,
  // never advances; the Thagomizer is the role mechanic
  // `cracksArmour`.
  CATAPULT: role({
    role: "CATAPULT",
    label: "Stegosaurus",
    tacticalRole: "SIEGE",
    cost: 7,
    maxHp: 12,
    attack2: 5,
    defense2: 2,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "GROW"],
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
    abilities: ["ATTACK", "CAPTURE", "OVERRUN", "GROW"],
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
    // The giants' signatures (section 6.4): Thunder Stomp instead of Push.
    abilities: ["ATTACK", "CAPTURE", "GROW", "STOMP"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Triceratops is the
  // Dinosaur heavy line unit (Metallurgy; it was the `CATAPULT` role at
  // Sawmilling). Its numbers and rules are unchanged; the role mechanics
  // keep it out of War Drums and keep its attacks destroying Field Defense.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Triceratops",
    tacticalRole: "LINE",
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
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "LINEBREAKER", "GROW"],
  }),
});

/**
 * Revision 19 Dinosaur engine mechanics: no role builds Field Defense
 * (Wild); the Triceratops, T-Rex, and Brontosaurus use two capacity slots;
 * the five egg-laid roles carry their hatch time; the Triceratops is a melee
 * body that advances after a kill and carries the Charge! run-up bonus; the
 * Ankylosaurus is Armoured. Boats are Human boats.
 */
export const DINOSAUR_ROLE_MECHANICS_V7 = mechanics({
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): Pack Hunt.
  FIGHTER: {
    buildsFieldDefense: false,
    packHuntBonus2: CAVEMAN_PACK_HUNT_BONUS2_V7,
  },
  RAIDER: { hatchTurns: 1 },
  MARKSMAN: { hatchTurns: 1 },
  GUARD: { buildsFieldDefense: false, hatchTurns: 2, armourReduction: 1 },
  CAPTAIN: { tendGrowingHeal: SHAMAN_TEND_DINOSAUR_V7 },
  // Revision 20 section 2.1 names the Triceratops's 2 slots and hatch time 2
  // (replacing the `pulp_wars-c87.8` interim 1 and 1) and its run-up bonus;
  // section 3 names the T-Rex's hatch time 4 (was 3).
  // The ninth unit (7r55): the Stegosaurus (one slot, hatch time 2, never
  // advances, the Thagomizer).
  CATAPULT: { hatchTurns: 2, advancesAfterKill: false, cracksArmour: true },
  KNIGHT: { capacitySlots: 2, hatchTurns: 4 },
  // The giants' signatures (section 6.4): Thunder Stomp.
  JUGGERNAUT: { capacitySlots: 2, stompDamage: STOMP_DAMAGE_V7 },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Triceratops in the heavy slot keeps its two
  // slots, hatch time, and run-up, stays out of War Drums (`rallyExcluded`;
  // it was excluded as a `SIEGE` role), and its attacks still destroy
  // Field Defense.
  SWORDSMAN: {
    capacitySlots: 2,
    hatchTurns: 2,
    runUpBonus2: 2,
    rallyExcluded: true,
    demolishesFieldDefense: true,
  },
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
    SHARED_BASELINE_NODES_V7.map((original) =>
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
          // The Martian pass (`pulp_wars-w49.14`, 7r52): Fieldcraft (shown
          // as Heat Sinks) keeps every Human unlock and adds `HEAT_SINKS`.
          ...(original.id === "FIELDCRAFT"
            ? [{ kind: "HEAT_SINKS" } as const]
            : []),
        ],
      ),
    ),
  );

/** The Martian roster (docs/product/RULESET_7_MARTIANS.md section 3). */
export const MARTIAN_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  // The Grunt.
  FIGHTER: role({
    role: "FIGHTER",
    label: "Grunt",
    tacticalRole: "LINE",
    cost: 3,
    // `pulp_wars-1wy.3` (balance M4): a real gun and a weaker body, Attack 2
    // and 9 HP (was Attack 1.5 and 10 HP). `pulp_wars-1wy.6` (the balance
    // design's first fallback, Martians above 60%): 8 HP.
    maxHp: 8,
    attack2: 4,
    defense2: 3,
    move: 1,
    // `pulp_wars-b5f.2`: the Grunt's ray pistol, a plain shot (no heat ray)
    // at range 1–2 (RULESET_7_MARTIANS.md section 3).
    range: 2,
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
    // `pulp_wars-1wy.3` (balance M2): the Saucer has the Tractor Beam.
    abilities: [
      "ATTACK",
      "CAPTURE",
      "CHARGE",
      "FLY",
      "BEAM_DOWN",
      "TRACTOR_BEAM",
    ],
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
    technology: "FORTIFICATION",
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
    abilities: ["ATTACK", "CAPTURE", "RALLY", "MIND_CONTROL"],
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
    // `pulp_wars-b5f.2`: a siege ray at exactly range 2 like the Catapult's
    // minimum range (no adjacent shots), seeing two tiles from its height.
    range: 2,
    minimumRange: 2,
    sightRadius: 2,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "STRIDE", "HEAT_RAY", "PIERCE"],
  }),
  KNIGHT: role({
    role: "KNIGHT",
    label: "Mothership",
    tacticalRole: "BREAKTHROUGH",
    // `pulp_wars-1wy.3` (balance M3): the carrier costs 8 (was 10), has Beam
    // Down, and its Tractor Beam is the Heavy one (role mechanic
    // `heavyTractorBeam`).
    cost: 8,
    maxHp: 16,
    attack2: 5,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "FLY", "BEAM_DOWN", "TRACTOR_BEAM"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Colossus",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 32,
    attack2: 8,
    // `pulp_wars-t6s.5`: Defense 2.5 (was 3), section 16.5.
    defense2: 5,
    // The giants' signatures (section 6.5): Move 2 (1 before) and
    // Overstride instead of Push.
    move: 2,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "STRIDE", "HEAT_RAY", "OVERSTRIDE"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Shock Trooper, the
  // Martian heavy line unit (Metallurgy) and the faction's only melee
  // unit: range 1, an ordinary attack (no heat ray). Shock Field is the
  // role mechanic `shockFieldDamage`.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Shock Trooper",
    tacticalRole: "LINE",
    cost: 6,
    maxHp: 12,
    attack2: 6,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE"],
  }),
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
  // The Martian pass (`pulp_wars-w49.14`, 7r52): with Heat Sinks the Ray
  // Gunner's ray does not overheat.
  MARKSMAN: { shield: 2, heatSink: true },
  GUARD: { buildsFieldDefense: false, shield: 3 },
  // The Martian pass, correction: Psychic Command every second turn.
  CAPTAIN: { shield: 2, rallyCools: true },
  CATAPULT: { shield: 2, movementMode: "STRIDE", advancesAfterKill: false },
  KNIGHT: {
    shield: 4,
    movementMode: "FLY",
    advancesAfterKill: false,
    capacitySlots: 2,
    heavyTractorBeam: true,
  },
  // The giants' signatures (section 6.5): Overstride.
  JUGGERNAUT: {
    shield: 3,
    movementMode: "STRIDE",
    capacitySlots: 2,
    trampleDamage: TRAMPLE_DAMAGE_V7,
  },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Shock Trooper, Shield 3 and the Shock Field.
  SWORDSMAN: { shield: 3, shockFieldDamage: SHOCK_FIELD_DAMAGE_V7 },
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
 *
 * The naval branch, the frozen sea
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 2.2): the five Naval nodes
 * keep their IDs, tiers, prerequisites, and economic unlocks, lose every
 * ship, the Ram, and Board, and gain the ice unlocks of
 * `ICE_FOLK_NAVAL_UNLOCKS_V7`. They display as Rime, Pack Ice, Icebound,
 * Black Ice, and Glacier.
 */
const ICE_FOLK_NAVAL_UNLOCKS_V7: Readonly<
  Partial<Record<TechnologyIdV7, readonly TechnologyUnlockV7[]>>
> = deepFreeze({
  SHORECRAFT: [{ kind: "FREEZE", depth: "SHALLOW" }],
  NAVIGATION: [{ kind: "FREEZE", depth: "DEEP" }],
  NAVAL_ENGINEERING: [{ kind: "ICEBOUND" }],
  SEAMANSHIP: [{ kind: "BLACK_ICE" }],
  SUBMERSIBLES: [{ kind: "GLACIER", iceTurns: 5 }],
});
/** The Ice Folk technology nodes (see the comment above). */
export const ICE_FOLK_BASELINE_V1_NODES: readonly TechnologyNodeV7[] =
  deepFreeze(
    SHARED_BASELINE_NODES_V7.map((original) =>
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
                  : // The frozen sea (naval branch sections 2.2 and 8.11):
                    // the Ice Folk tree unlocks no ship, no Ram, and no
                    // Board.
                    (unlock.kind === "UNIT_ROLE" &&
                        isNavalRoleV7(unlock.role)) ||
                      unlock.kind === "RAM" ||
                      (unlock.kind === "COMMAND" && unlock.command === "BOARD")
                    ? []
                    : [unlock],
          ),
          ...(original.id === "EXPLOSIVES"
            ? [{ kind: "BRITTLE" } as const]
            : []),
          ...(ICE_FOLK_NAVAL_UNLOCKS_V7[original.id] ?? []),
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
    maxHp: 9,
    attack2: 4,
    defense2: 3,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "MOUNTAIN_BORN", "ROCKFALL", "FREEZE"],
  }),
  RAIDER: role({
    role: "RAIDER",
    label: "Sled",
    tacticalRole: "SKIRMISHER",
    // Ice Folk Freeze (`pulp_wars-w49.37`): 3 Coins before.
    cost: 4,
    maxHp: 10,
    attack2: 4,
    defense2: 2,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 2,
    technology: "SCOUTING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "BOLAS", "FREEZE"],
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
    abilities: ["ATTACK", "CAPTURE", "COLD_BLOOD", "FREEZE"],
  }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Musk Ox, the Ice Folk
  // defender at Drill (the Mammoth held this role until 7r54 and is the
  // `SWORDSMAN` role now). Frostbite is the role mechanic `frostbite`.
  GUARD: role({
    role: "GUARD",
    label: "Musk Ox",
    tacticalRole: "DEFENDER",
    cost: 4,
    maxHp: 16,
    attack2: 3,
    // Ice Folk Freeze (`pulp_wars-w49.37`): Defense 2 (2.5 before).
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "FORTIFICATION",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "FREEZE"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Ice Witch",
    tacticalRole: "SUPPORT",
    // Ice Folk Freeze (`pulp_wars-w49.37`): 6 Coins and 10 HP (5 and 12
    // before).
    cost: 6,
    maxHp: 10,
    attack2: 2,
    defense2: 2,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "ADMINISTRATION",
    mayUsePrimaryActionAfterMove: true,
    // Ice Folk Freeze: Cold Snap freezes every adjacent hostile unit and the
    // Frost Bolt one unit within 2 (one of the two a turn).
    abilities: [
      "ATTACK",
      "CAPTURE",
      "BLIZZARD",
      "COLD_SNAP",
      "FROST_BOLT",
      "FREEZE",
    ],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Boulder Yeti",
    tacticalRole: "SIEGE",
    // Ice Folk Freeze (`pulp_wars-w49.37`): 9 Coins and 10 HP (8 and 12
    // before).
    cost: 9,
    maxHp: 10,
    attack2: 4,
    defense2: 3,
    move: 2,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "BOULDERS", "MOUNTAIN_BORN", "FREEZE"],
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
    abilities: ["ATTACK", "CAPTURE", "PROWL", "FREEZE"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Frost Giant",
    tacticalRole: "MYTHIC",
    cost: null,
    // Ice Folk Freeze (`pulp_wars-w49.37`): 36 HP (40 before).
    maxHp: 36,
    attack2: 8,
    defense2: 8,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    // The giants' signatures (section 6.6): Glacial Smash instead of Push
    // (Freeze stays last, as on every Ice Folk land role).
    abilities: [
      "ATTACK",
      "CAPTURE",
      "COLD_AURA",
      "MOUNTAIN_BORN",
      "GLACIAL_SMASH",
      "FREEZE",
    ],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Mammoth is the Ice
  // Folk heavy line unit (Metallurgy; it was the `GUARD` role at Drill).
  // Ice Folk Freeze (`pulp_wars-w49.37`): 7 Coins (6 before) and Stampede.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Mammoth",
    tacticalRole: "LINE",
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
    abilities: ["ATTACK", "CAPTURE", "SWEEP", "TRAMPLE", "STAMPEDE", "FREEZE"],
  }),
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
  // The ninth unit (7r55): the Musk Ox (Frostbite).
  GUARD: { buildsFieldDefense: false, glides: true, frostbite: true },
  CAPTAIN: { glides: true },
  CATAPULT: {
    advancesAfterKill: false,
    mountainBorn: true,
    glides: true,
    ignoresFortification: true,
    plantedBonus2: 2,
  },
  KNIGHT: { ignoresZocStops: true },
  // The giants' signatures (section 6.6): Glacial Smash, and the Frost
  // Giant never advances.
  JUGGERNAUT: {
    mountainBorn: true,
    glides: true,
    advancesAfterKill: false,
    glacialSmashHp: GLACIAL_SMASH_HP_V7,
  },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Mammoth in the heavy slot keeps Glide, Sweep,
  // and Trample.
  SWORDSMAN: { glides: true, sweepDamage: 2, tramplesFieldDefense: true },
});

export const ICE_FOLK_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "ICE_FOLK_BASELINE_V1",
  faction: "ICE_FOLK",
  startingTechIds: [],
  nodes: ICE_FOLK_BASELINE_V1_NODES,
  roleRules: ICE_FOLK_ROLE_RULES_V7,
  roleMechanics: ICE_FOLK_ROLE_MECHANICS_V7,
});

/**
 * The Dwarf technology graph (docs/product/RULESET_7_DWARVES.md section 4):
 * identical to ORIGINAL_BASELINE_V5 except that Administration grants
 * `ENGINEER_SUPPORT` (Repair) instead of Captain support, Marksmanship also
 * grants `ASSEMBLE`, Raiding grants `DIVE` instead of `CHARGE_BONUS`,
 * Chivalry grants no Overrun, Fortification (displayed as Dig In) grants
 * `DIG_IN` instead of `BUILD_FIELD_DEFENSE`, and Explosives (displayed as
 * Blasting Charges) keeps both of its unlocks and adds `BLASTING_CHARGES`.
 */
export const DWARF_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  SHARED_BASELINE_NODES_V7.map((original) =>
    node(original.id, original.branch, original.tier, original.prerequisites, [
      ...original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? [{ kind: "ENGINEER_SUPPORT" }]
          : unlock.kind === "OVERRUN"
            ? []
            : unlock.kind === "CHARGE_BONUS"
              ? [{ kind: "DIVE" }]
              : unlock.kind === "COMMAND" &&
                  unlock.command === "BUILD_FIELD_DEFENSE"
                ? [{ kind: "DIG_IN" }]
                : [unlock],
      ),
      ...(original.id === "MARKSMANSHIP"
        ? [{ kind: "ASSEMBLE" } as const]
        : []),
      ...(original.id === "EXPLOSIVES"
        ? [{ kind: "BLASTING_CHARGES" } as const]
        : []),
    ]),
  ),
);

/** The Dwarf roster (docs/product/RULESET_7_DWARVES.md section 3). */
export const DWARF_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    label: "Hammerer",
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
    abilities: ["ATTACK", "CAPTURE", "RIDES_TUNNEL", "DIG_IN"],
  }),
  // The Gyrocopter has no `ATTACK`: its Attack is used only when it
  // retaliates (section 6.1); range 1 is its retaliation reach.
  RAIDER: role({
    role: "RAIDER",
    label: "Gyrocopter",
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
    abilities: ["CAPTURE", "FLY", "BOMB_RUN"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Clockwork Gunner",
    tacticalRole: "RANGED",
    cost: 3,
    maxHp: 10,
    attack2: 3,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 1,
    technology: "MARKSMANSHIP",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CLOCKWORK", "TWIN_SHOT"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Steam Mole",
    tacticalRole: "DEFENDER",
    cost: 5,
    maxHp: 16,
    attack2: 4,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "FORTIFICATION",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "TUNNEL", "ERUPTION", "DIG_IN"],
  }),
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Engineer",
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
    abilities: ["ATTACK", "CAPTURE", "TEND_WOUNDED", "ASSEMBLE", "BARRICADE"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Steam Cannon",
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
    abilities: ["ATTACK", "CAPTURE", "KNOCKBACK"],
  }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Whirligig, a clockwork
  // crowd-fighter at Chivalry (the Steam Tank held this role until 7r54 and
  // is the `SWORDSMAN` role now). A construct and a machine; it never
  // advances. Dwarf crowd control (`pulp_wars-w49.33`): its Whirl (the role
  // mechanic `whirl`) replaced Three Hammers. It captures like every land
  // role since `pulp_wars-ke95`.
  KNIGHT: role({
    role: "KNIGHT",
    label: "Whirligig",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 12,
    attack2: 6,
    defense2: 3,
    move: 3,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "CLOCKWORK", "WHIRL"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    label: "Brass Titan",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 36,
    attack2: 8,
    defense2: 6,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    // The giants' signatures (section 6.7): Siege Hammer instead of Push.
    abilities: ["ATTACK", "CAPTURE", "CLOCKWORK", "SIEGE_HAMMER"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Steam Tank is the
  // Dwarf heavy line unit (Metallurgy; it was the `KNIGHT` role at
  // Chivalry). Its numbers and rules are unchanged (it captures like every
  // land role since `pulp_wars-ke95`).
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Steam Tank",
    tacticalRole: "LINE",
    cost: 9,
    maxHp: 16,
    attack2: 6,
    defense2: 4,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "PLATED"],
  }),
});

/** The Dwarf revision (section 10.2): the Steam Tank's Plated cap. */
export const PLATED_CAP_V7 = 4;
/** The Dwarf revision (section 9.1): Repair on a machine. */
export const REPAIR_MACHINE_V7 = 4;
/** The Dwarf revision (section 7.3): the shots of an unmoved Gunner. */
export const GUNNER_UNMOVED_SHOTS_V7 = 2;
/** The Dwarf revision (section 5.1): the Tunnel range in steps. */
export const TUNNEL_RANGE_V7 = 3;

/**
 * The Dwarf engine mechanics (section 14): no role builds Field Defense; the
 * Hammerer and the Mole dig in, the Hammerer rides the tunnel and the Mole
 * digs it; the Gyrocopter flies and bombs; the Gunner and the Titan are
 * constructs (Unflinching), the Gunner shoots twice when unmoved; the
 * Cannon knocks back; the Tank is Plated; every Dwarf land role but the
 * Hammerer and the Engineer is a machine for Repair, and the Engineer
 * repairs machines by 4. The flyer, the Gunner, and the Cannon never
 * advance. Every role uses one slot. Boats are Human boats.
 */
export const DWARF_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: { buildsFieldDefense: false, digsIn: true, ridesTunnel: true },
  RAIDER: {
    movementMode: "FLY",
    advancesAfterKill: false,
    bombs: true,
    repairsAsMachine: true,
  },
  MARKSMAN: {
    construct: true,
    unflinchingAttack: true,
    advancesAfterKill: false,
    unmovedShots: GUNNER_UNMOVED_SHOTS_V7,
    repairsAsMachine: true,
  },
  GUARD: {
    buildsFieldDefense: false,
    digsIn: true,
    tunnelRange: TUNNEL_RANGE_V7,
    repairsAsMachine: true,
  },
  CAPTAIN: { repairMachineHeal: REPAIR_MACHINE_V7 },
  CATAPULT: {
    advancesAfterKill: false,
    knockback: true,
    repairsAsMachine: true,
  },
  // The ninth unit (7r55): the Whirligig (a construct that never
  // advances); Dwarf crowd control (`pulp_wars-w49.33`): its Whirl.
  KNIGHT: {
    construct: true,
    unflinchingAttack: true,
    repairsAsMachine: true,
    advancesAfterKill: false,
    whirl: true,
  },
  JUGGERNAUT: {
    construct: true,
    unflinchingAttack: true,
    repairsAsMachine: true,
    // The giants' signatures (section 6.7): Siege Hammer.
    siegeHammer: true,
  },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Steam Tank in the heavy slot keeps Plated.
  SWORDSMAN: { plated: PLATED_CAP_V7, repairsAsMachine: true },
});

export const DWARF_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "DWARF_BASELINE_V1",
  faction: "DWARF",
  startingTechIds: [],
  nodes: DWARF_BASELINE_V1_NODES,
  roleRules: DWARF_ROLE_RULES_V7,
  roleMechanics: DWARF_ROLE_MECHANICS_V7,
});

/**
 * The Candy technology graph (docs/product/RULESET_7_CANDY.md section 4):
 * identical to ORIGINAL_BASELINE_V5 except that Administration grants
 * `CONFECTIONER_SUPPORT` (Frosting and Re-bake) instead of Captain support,
 * Chivalry grants no Overrun, Fortification (displayed as Home Sweet Home)
 * grants `HOME_SWEET_HOME` instead of `BUILD_FIELD_DEFENSE`, and Explosives
 * (displayed as Peppermint Surprise) keeps both of its unlocks and adds
 * `PEPPERMINT_SURPRISE`. Raiding keeps `CHARGE_BONUS`.
 */
export const CANDY_BASELINE_V1_NODES: readonly TechnologyNodeV7[] = deepFreeze(
  SHARED_BASELINE_NODES_V7.map((original) =>
    node(original.id, original.branch, original.tier, original.prerequisites, [
      ...original.unlocks.flatMap((unlock): TechnologyUnlockV7[] =>
        unlock.kind === "CAPTAIN_SUPPORT"
          ? [{ kind: "CONFECTIONER_SUPPORT" }]
          : unlock.kind === "OVERRUN"
            ? []
            : unlock.kind === "COMMAND" &&
                unlock.command === "BUILD_FIELD_DEFENSE"
              ? [{ kind: "HOME_SWEET_HOME" }]
              : [unlock],
      ),
      ...(original.id === "EXPLOSIVES"
        ? [{ kind: "PEPPERMINT_SURPRISE" } as const]
        : []),
    ]),
  ),
);

/** The Candy roster (docs/product/RULESET_7_CANDY.md section 3). */
export const CANDY_ROLE_RULES_V7: Readonly<
  Record<UnitRoleIdV7, EffectiveRoleRuleV7>
> = deepFreeze({
  FIGHTER: role({
    role: "FIGHTER",
    // `pulp_wars-w49.3` (7r46): the display name; it was "Gumdrop". The
    // role ID, asset ids, and the AI constants that say `GUMDROP` are kept.
    label: "Toffee Trooper",
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
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH"],
  }),
  // The Donut Racer has Escape only while Rushed (its `rushPerk`).
  RAIDER: role({
    role: "RAIDER",
    label: "Donut Racer",
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
    abilities: ["ATTACK", "CAPTURE", "CHARGE", "SUGAR_RUSH"],
  }),
  MARKSMAN: role({
    role: "MARKSMAN",
    label: "Gumball Gunner",
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
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH", "SUGAR_TOSS"],
  }),
  GUARD: role({
    role: "GUARD",
    label: "Marshmallow",
    tacticalRole: "DEFENDER",
    cost: 4,
    maxHp: 18,
    attack2: 3,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "FORTIFICATION",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH", "BOUNCE"],
  }),
  // The Confectioner has no Rally; Frosting keeps the `TEND_WOUNDED` literal.
  CAPTAIN: role({
    role: "CAPTAIN",
    label: "Confectioner",
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
    abilities: ["ATTACK", "CAPTURE", "TEND_WOUNDED", "REBAKE", "SUGAR_RUSH"],
  }),
  CATAPULT: role({
    role: "CATAPULT",
    label: "Pie Launcher",
    tacticalRole: "SIEGE",
    cost: 8,
    maxHp: 10,
    attack2: 6,
    defense2: 1,
    move: 1,
    range: 3,
    minimumRange: 2,
    sightRadius: 1,
    technology: "SAWMILLING",
    mayUsePrimaryActionAfterMove: false,
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH", "SPLAT"],
  }),
  // The Chocolate Bunny has Overrun (Sugar Frenzy) only while Rushed.
  KNIGHT: role({
    role: "KNIGHT",
    // Displayed as the Gummy Bear before identity 7r46 (`pulp_wars-w49.3`).
    label: "Chocolate Bunny",
    tacticalRole: "BREAKTHROUGH",
    cost: 9,
    maxHp: 14,
    attack2: 6,
    defense2: 3,
    move: 2,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "CHIVALRY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH"],
  }),
  JUGGERNAUT: role({
    role: "JUGGERNAUT",
    // Displayed as the Rock Candy Golem before identity 7r46.
    label: "Gingerbread Giant",
    tacticalRole: "MYTHIC",
    cost: null,
    maxHp: 40,
    attack2: 8,
    defense2: 7,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    // The giants' signatures (section 6.8): Break Off instead of Push.
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH", "BOUNCE", "BREAK_OFF"],
  }),
  PATROL_BOAT: role({ ...ORIGINAL_ROLE_RULES_V7.PATROL_BOAT }),
  BATTLESHIP: role({ ...ORIGINAL_ROLE_RULES_V7.BATTLESHIP }),
  SUBMARINE: role({ ...ORIGINAL_ROLE_RULES_V7.SUBMARINE }),
  // The ninth unit (`pulp_wars-w49.17`, 7r55): the Jawbreaker, the Candy
  // heavy line unit (Metallurgy). Rock Hard is the role mechanic
  // `immovable`.
  SWORDSMAN: role({
    role: "SWORDSMAN",
    label: "Jawbreaker",
    tacticalRole: "LINE",
    cost: 6,
    maxHp: 16,
    attack2: 6,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 1,
    technology: "METALLURGY",
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "CAPTURE", "SUGAR_RUSH"],
  }),
});

/** The Candy revision (section 5.2): a Rushed unit's extra Move. */
export const SUGAR_RUSH_MOVE_BONUS_V7 = 1;
/** The Candy revision (section 5.2): the Rush `attack2` of a first attack. */
export const SUGAR_RUSH_ATTACK2_V7 = 2;
/** The Candy revision (section 5.3): Home Sweet Home reach from a center. */
export const HOME_SWEET_HOME_RADIUS_V7 = 1;
/** The Candy revision (section 6.1): `turnsLeft` of fresh Crumbs. */
export const CRUMBS_TURNS_V7 = 3;
/** The Candy revision (section 6.3): the Peppermint Surprise damage. */
export const PEPPERMINT_DAMAGE_V7 = 3;
/** The Candy revision (section 9): what a Sugar Toss heals. */
export const SUGAR_TOSS_HEAL_V7 = 2;
/** The Candy revision (section 9): the Sugar Toss reach (Chebyshev). */
export const SUGAR_TOSS_RANGE_V7 = 2;
/**
 * The Candy revision (section 5.4, root ruling 7): the most continuations a
 * Sugar Frenzy grants, so a Rushed Chocolate Bunny attacks at most three times a
 * turn. A rule, never raised by a balance pass.
 */
export const SUGAR_FRENZY_MAX_CONTINUATIONS_V7 = 2;

/**
 * The Candy engine mechanics (section 13): no role builds Field Defense;
 * the Donut Racer and the Chocolate Bunny have a Rush perk; the seven trainable
 * land roles leave Crumbs; the Pie Launcher never advances. Every role uses
 * one slot. Boats are Human boats.
 */
export const CANDY_ROLE_MECHANICS_V7 = mechanics({
  FIGHTER: { buildsFieldDefense: false, leavesCrumbs: true },
  RAIDER: { rushPerk: "ESCAPE", leavesCrumbs: true },
  MARKSMAN: { leavesCrumbs: true },
  GUARD: { buildsFieldDefense: false, leavesCrumbs: true },
  CAPTAIN: { leavesCrumbs: true },
  CATAPULT: { advancesAfterKill: false, leavesCrumbs: true },
  KNIGHT: { rushPerk: "SUGAR_FRENZY", leavesCrumbs: true },
  BATTLESHIP: { splash: true },
  // The ninth unit (7r55): the Jawbreaker is Rock Hard and leaves Crumbs.
  SWORDSMAN: { leavesCrumbs: true, immovable: true },
  // The giants' signatures (section 6.8): Break Off.
  JUGGERNAUT: { breakOffHp: BREAK_OFF_HP_V7 },
});

export const CANDY_BASELINE_V1_TREE: FactionTechnologyTreeV7 = deepFreeze({
  id: "CANDY_BASELINE_V1",
  faction: "CANDY",
  startingTechIds: [],
  nodes: CANDY_BASELINE_V1_NODES,
  roleRules: CANDY_ROLE_RULES_V7,
  roleMechanics: CANDY_ROLE_MECHANICS_V7,
});

/**
 * The Candy revision (section 6.4): the Coins a Re-bake of `role` costs:
 * half the role's printed cost, rounded up (Arms Industry never applies).
 * Null for a role that leaves no Crumbs.
 */
export function rebakePriceV7(role: UnitRoleIdV7): number | null {
  const cost = CANDY_ROLE_RULES_V7[role].cost;
  return cost === null || !CANDY_ROLE_MECHANICS_V7[role].leavesCrumbs
    ? null
    : Math.ceil(cost / 2);
}

/**
 * The Candy revision (section 6.4): the HP of a re-baked `role`: half the
 * role's maximum HP, rounded up.
 */
export function rebakeHpV7(role: UnitRoleIdV7): number {
  return Math.ceil(CANDY_ROLE_RULES_V7[role].maxHp / 2);
}

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
  DWARF: DWARF_BASELINE_V1_TREE,
  CANDY: CANDY_BASELINE_V1_TREE,
});

export const FACTION_DISPLAY_NAMES_V7: Readonly<Record<FactionIdV7, string>> =
  deepFreeze({
    ORIGINAL: "Human",
    UNDEAD: "Undead",
    GOBLIN: "Goblin",
    DINOSAUR: "Dinosaur",
    MARTIAN: "Martian",
    ICE_FOLK: "Ice Folk",
    DWARF: "Dwarf",
    CANDY: "Candy",
  });

/**
 * Revision 17: per-faction technology display names. Serialized technology
 * IDs never change; Goblin Commerce is renamed (Plunder), in revision 19
 * Dinosaur Fortification (Nesting), and in revision 20 Dinosaur Explosives
 * (Wallbreaker). The single
 * name helper, `technologyNameV7` in src/render/goblin-presentation-v7.ts,
 * applies these overrides and otherwise keeps the sentence-case name.
 */
/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55; design Part B of
 * docs/product/RULESET_7_DESIGN_HEAVY_SLOT_AND_ECONOMY.md): the shared
 * display names of the technologies whose name is not their ID in sentence
 * case. Serialized technology IDs never change. A faction's own name
 * (`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7`) wins over this table.
 */
export const TECHNOLOGY_SHARED_DISPLAY_NAMES_V7: Readonly<
  Partial<Record<TechnologyIdV7, string>>
> = deepFreeze({
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): "Crafting"
  // ("Garrison" at 7r55, when the node gave the defender).
  DRILL: "Crafting",
  ADMINISTRATION: "Leadership",
  PLANNING: "Land Grants",
  FIELDCRAFT: "Pathfinding",
  METALLURGY: "Armoury",
  SHORECRAFT: "Sailing",
  NAVAL_ENGINEERING: "Shipbuilding",
  SEAMANSHIP: "Boarding",
});

export const TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7: Readonly<
  Record<FactionIdV7, Readonly<Partial<Record<TechnologyIdV7, string>>>>
> = deepFreeze({
  ORIGINAL: {},
  // The Undead pass, correction: Explosives is Pestilence. The ninth unit
  // (7r55): the nodes named for their building or unit.
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
  // The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): Sawmilling is
  // Timber for a Dinosaur player, whose mill is the Chopping Block (the
  // board, the build button, and the technology tree all name it so). The
  // ninth unit (7r55) keeps Timber (the design proposed "Chopping").
  DINOSAUR: {
    FORTIFICATION: "Nesting",
    EXPLOSIVES: "Wallbreaker",
    SAWMILLING: "Timber",
    MILLING: "Grinding",
    MARKSMANSHIP: "Spitters",
    CHIVALRY: "T-Rex",
    METALLURGY: "Triceratops",
  },
  // The Martian revision: Fortification and Explosives are renamed. The
  // Martian pass (`pulp_wars-w49.14`, 7r52): Fieldcraft is Heat Sinks.
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
  // The Ice Folk revision: Fortification and Explosives are renamed.
  // The frozen sea (naval branch section 2.2): the five Naval names.
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
  // The Dwarf revision: Fortification and Explosives are renamed.
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
  // The Candy revision: Fortification and Explosives are renamed.
  CANDY: {
    FORTIFICATION: "Home Sweet Home",
    EXPLOSIVES: "Peppermint Surprise",
    MARKSMANSHIP: "Gumball Gunners",
    SAWMILLING: "Pie Launchers",
    CHIVALRY: "Chocolate Bunnies",
    METALLURGY: "Jawbreakers",
  },
});

/**
 * A technology's display name for a seat of `faction`: the faction's own
 * name, else the shared display name, else the ID in sentence case. THE
 * name of a technology on every surface (the tree, cards, tooltips, Help,
 * the Gallery, the text harness); IDs never change.
 */
export function technologyDisplayNameV7(
  tech: TechnologyIdV7,
  faction: FactionIdV7,
): string {
  return (
    TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7[faction][tech] ??
    TECHNOLOGY_SHARED_DISPLAY_NAMES_V7[tech] ??
    tech
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

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
    // The Dwarf revision (section 13.13): the treasure unit is a Gyrocopter.
    DWARF: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    },
    // The Candy revision (section 12.16): the treasure unit is a Donut Racer.
    CANDY: {
      restless: false,
      cityCapacityBonus: 0,
      gangUpMaximum: 0,
      treasureUnitRole: "RAIDER",
      snow: false,
    },
  });

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 8.1):
 * the kind of a neutral unit (the Giant Spider). It is keyed outside
 * `FACTION_IDS_V7`, so the frozen faction order, setup factions, and the
 * one-faction-per-seat rule are untouched; it is never a seat's faction.
 */
export const NEUTRAL_KIND_V7 = "NEUTRAL" as const;
/** A unit's kind: a seat faction, or the neutral registration. */
export type UnitKindV7 = FactionIdV7 | typeof NEUTRAL_KIND_V7;

/**
 * Section 8.2: the Giant Spider's stats. Its mechanical role is
 * `JUGGERNAUT` (every rule that names that role treats it as a big body:
 * immune to Mind Control, the Tractor Beam, and Shatter); it has `ATTACK`
 * only (no capture, Push, Pillage, or anything else), no Sight (it explores
 * nothing), and no cost.
 */
export const NEUTRAL_MONSTER_ROLE_RULE_V7: EffectiveRoleRuleV7 = deepFreeze({
  role: "JUGGERNAUT",
  label: "Giant Spider",
  tacticalRole: "MYTHIC",
  cost: null,
  maxHp: 24,
  attack2: 6,
  defense2: 4,
  move: 1,
  range: 1,
  minimumRange: 1,
  sightRadius: 0,
  technology: null,
  mayUsePrimaryActionAfterMove: true,
  abilities: ["ATTACK"],
});

/**
 * Section 8.3: the Giant Spider never advances after a kill and regenerates
 * only in the neutral turn (the `regeneration` field is the Troll's Start
 * Turn step, which a neutral unit never has, so it stays 0 here).
 */
export const NEUTRAL_MONSTER_ROLE_MECHANICS_V7: RoleMechanicsV7 = deepFreeze({
  ...ORIGINAL_ROLE_MECHANICS_V7.JUGGERNAUT,
  advancesAfterKill: false,
  buildsFieldDefense: false,
  // The giants' signatures (RULESET_7_GIANTS.md section 6.0, G3): the Giant
  // Spider shares the role and has none of them.
  crushDamage: 0,
  swallowMaxHp: 0,
  tossRange: 0,
  stompDamage: 0,
  trampleDamage: 0,
  glacialSmashHp: 0,
  siegeHammer: false,
  breakOffHp: 0,
});

/**
 * Round 2 (docs/product/RULESET_7_MAP_CURIOSITIES.md sections 25.2, 29.1,
 * and 32.3): the neutral registration by breed. A guard has its faction
 * role's stats with its Shield maximum added to its HP (a neutral unit has
 * no Shield) and may attack after its step; no Sight, no cost, no
 * technology, no capture, no Force Field, Bite, or Infect. Bigfoot never
 * attacks (Attack 0, range 0: it never retaliates either).
 */
export const NEUTRAL_ROLE_RULES_V7: Readonly<
  Record<NeutralBreedV7, EffectiveRoleRuleV7>
> = deepFreeze({
  GIANT_SPIDER: NEUTRAL_MONSTER_ROLE_RULE_V7,
  GRUNT: {
    role: "FIGHTER",
    label: "Grunt",
    tacticalRole: "LINE",
    cost: null,
    maxHp: 10,
    attack2: 4,
    defense2: 3,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 0,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK"],
  },
  RAY_GUNNER: {
    role: "MARKSMAN",
    label: "Ray Gunner",
    tacticalRole: "RANGED",
    cost: null,
    maxHp: 10,
    attack2: 6,
    defense2: 2,
    move: 1,
    range: 2,
    minimumRange: 1,
    sightRadius: 0,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK", "HEAT_RAY"],
  },
  SHIELD_PROJECTOR: {
    role: "GUARD",
    label: "Shield Projector",
    tacticalRole: "DEFENDER",
    cost: null,
    maxHp: 15,
    attack2: 3,
    defense2: 5,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 0,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK"],
  },
  ZOMBIE: {
    role: "GUARD",
    label: "Zombie",
    tacticalRole: "DEFENDER",
    cost: null,
    maxHp: 18,
    attack2: 4,
    defense2: 4,
    move: 1,
    range: 1,
    minimumRange: 1,
    sightRadius: 0,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: ["ATTACK"],
  },
  BIGFOOT: {
    role: "RAIDER",
    label: "Bigfoot",
    tacticalRole: "SKIRMISHER",
    cost: null,
    maxHp: 15,
    attack2: 0,
    defense2: 4,
    move: 3,
    range: 0,
    minimumRange: 1,
    sightRadius: 0,
    technology: null,
    mayUsePrimaryActionAfterMove: true,
    abilities: [],
  },
});

const NEUTRAL_GUARD_MECHANICS_V7 = {
  advancesAfterKill: false,
  buildsFieldDefense: false,
  shield: 0,
} as const;

/**
 * Round 2 (section 32.3): the engine mechanics by breed. No neutral unit
 * advances after a kill, builds Field Defense, or has a Shield; the Ray
 * Gunner's carry `heatSink`, so its ray never Cools (section 25.2).
 */
export const NEUTRAL_ROLE_MECHANICS_V7: Readonly<
  Record<NeutralBreedV7, RoleMechanicsV7>
> = deepFreeze({
  GIANT_SPIDER: NEUTRAL_MONSTER_ROLE_MECHANICS_V7,
  GRUNT: {
    ...ORIGINAL_ROLE_MECHANICS_V7.FIGHTER,
    ...NEUTRAL_GUARD_MECHANICS_V7,
  },
  RAY_GUNNER: {
    ...ORIGINAL_ROLE_MECHANICS_V7.MARKSMAN,
    ...NEUTRAL_GUARD_MECHANICS_V7,
    heatSink: true,
  },
  SHIELD_PROJECTOR: {
    ...ORIGINAL_ROLE_MECHANICS_V7.GUARD,
    ...NEUTRAL_GUARD_MECHANICS_V7,
  },
  ZOMBIE: {
    ...ORIGINAL_ROLE_MECHANICS_V7.GUARD,
    ...NEUTRAL_GUARD_MECHANICS_V7,
  },
  BIGFOOT: {
    ...ORIGINAL_ROLE_MECHANICS_V7.RAIDER,
    ...NEUTRAL_GUARD_MECHANICS_V7,
  },
});

/** Section 8.1: the faction-wide rules of the neutral registration. */
export const NEUTRAL_FACTION_RULES_V7: FactionRulesV7 = deepFreeze({
  restless: false,
  cityCapacityBonus: 0,
  gangUpMaximum: 0,
  treasureUnitRole: "KNIGHT",
  snow: false,
});

/** The display name of the neutral registration (no seat ever has it). */
export const NEUTRAL_DISPLAY_NAME_V7 = "Wilds";

/**
 * The faction-wide rules of a unit's kind (`unitFactionV7`) or of a seat's
 * faction; the neutral kind has every rule off.
 */
export function factionRulesV7(faction: UnitKindV7): FactionRulesV7 {
  if (faction === NEUTRAL_KIND_V7) return NEUTRAL_FACTION_RULES_V7;
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
/** Tuning 4: how many Barracks rewards a city's reward history holds. */
export function cityBarracksV7(city: {
  readonly rewards?: readonly { readonly reward: string }[];
}): number {
  return (city.rewards ?? []).filter((record) => record.reward === "BARRACKS")
    .length;
}

/**
 * Whether a city's reward history may hold `reward` for `level`: the
 * rewards the ladder offers now (`rewardCandidatesForLevelV7`) and those
 * it offered before the reward ladder rework (`pulp_wars-zypi`), so a
 * history that holds an older record (a level-2 Survey, a level-3 Militia,
 * a level-4 `TREASURY_6` or Barracks, a level-5+ Barracks) still parses
 * and keeps its effect. A pending choice must list the current candidates.
 */
export function cityRewardRecordMatchesLevelV7(
  reward: string,
  level: number,
): boolean {
  return level === 2
    ? reward === "STOCKPILE" || reward === "MILITIA" || reward === "SURVEY"
    : level === 3
      ? reward === "SURVEY" || reward === "WALLS" || reward === "MILITIA"
      : level === 4
        ? reward === "BOOM" ||
          reward === "ECONOMIC_MIRACLE" ||
          reward === "TREASURY_6" ||
          reward === "BARRACKS"
        : level >= REWARD_UNIT_LEVEL_V7 &&
          (reward === "JUGGERNAUT" ||
            reward === "TREASURY" ||
            reward === "BARRACKS");
}

/**
 * The candidate list a level's reward choice offers (reward-ID order;
 * `rewardCandidatesForLevelV7` in `src/engine/v7/economy.ts` returns it),
 * or null below level 2. The reward ladder rework (`pulp_wars-zypi`).
 */
export function cityRewardCandidatesV7(
  level: number,
): readonly string[] | null {
  return level === 2
    ? ["STOCKPILE", "MILITIA"]
    : level === 3
      ? ["SURVEY", "WALLS"]
      : level === 4
        ? ["BOOM", "ECONOMIC_MIRACLE"]
        : level >= REWARD_UNIT_LEVEL_V7
          ? ["JUGGERNAUT", "TREASURY"]
          : null;
}

/**
 * `pulp_wars-zypi`: the income Coins a city's Economic Miracle rewards add
 * (`ECONOMIC_MIRACLE_COINS_V7` each). Part of the city's income like its
 * level term, so a besieged city pays none of it.
 */
export function cityEconomicMiracleIncomeV7(city: {
  readonly rewards?: readonly { readonly reward: string }[];
}): number {
  return (
    (city.rewards ?? []).filter(
      (record) => record.reward === "ECONOMIC_MIRACLE",
    ).length * ECONOMIC_MIRACLE_COINS_V7
  );
}

export function cityUnitCapacityForV7(
  level: number,
  ownerResearchedTechs: readonly string[],
  ownerFaction: FactionIdV7,
  // Tuning 4 (`pulp_wars-w49.3`): the city's Barracks rewards
  // ({@link cityBarracksV7}), each one more unit.
  barracks = 0,
): number {
  return (
    level +
    1 +
    barracks * BARRACKS_CAPACITY_V7 +
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
  // Early economy tweak (`pulp_wars-if6`, `pulp-wars-poc-7r41`): 3 (5
  // before). With the first Start Turn's income of 2 a first turn has 5
  // Coins: the free opening research and two harvests, and no unit.
  startingCoins: 3 as const,
  factionTrees: FACTION_TREES_V7,
});

/**
 * Revision 16 (economy deflation, `pulp_wars-4gc`): a technology of tier `t`
 * costs `base + step * (C - 1)` Coins, `C` being the researcher's owned city
 * count. Tier 1 is `5 + 1(C - 1)` (unchanged); tier 2 `7 + 3(C - 1)` (was
 * `7 + 2(C - 1)`); tier 3 `12 + 5(C - 1)` (was `9 + 3(C - 1)`).
 *
 * Early economy tweak (`pulp_wars-if6`, `pulp-wars-poc-7r41`): the tier 3
 * base is 9 (12 before), so the one-city costs read 5 / 7 / 9. The per-city
 * steps are unchanged: tier 3 is `9 + 5(C - 1)`.
 *
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`): the per-city steps
 * are 1 / 2 / 2 (1 / 3 / 5 before), so tier 2 is `7 + 2(C - 1)` and tier 3
 * `9 + 2(C - 1)`; the bases are unchanged.
 *
 * Tuning 4 replaced the city count by the technologies owned; tuning 6
 * (`pulp_wars-w49.6`, `pulp-wars-poc-7r49`) made that step 1 a technology:
 * a technology of tier `t` costs `5 / 7 / 9 + (T - 1)`, `T` being the
 * technologies the researcher already owns.
 *
 * The economy rejig (`pulp_wars-w49.16`, `pulp-wars-poc-7r67`,
 * docs/product/RULESET_7_ECONOMY_REJIG.md): the price is per city again and
 * the technologies owned no longer enter it. A technology of tier `t`
 * costs `5 / 7 / 9 + (1 / 2 / 3) * (C - 1)`, `C` being the cities the
 * researcher owns when it researches. There is no rule against holding
 * fewer cities to pay less (the user: "a fine strategic choice and self
 * limiting").
 */
export const TECHNOLOGY_RESEARCH_COST_V7: Readonly<
  Record<1 | 2 | 3, { readonly base: number; readonly step: number }>
> = deepFreeze({
  // Tuning 4 (`pulp_wars-w49.3`): `step` is per technology the player
  // already owns beyond its first (2 for every tier); it was per city the
  // player owned beyond its first (1 / 2 / 2). The city count no longer
  // enters the price.
  // Tuning 6 (`pulp_wars-w49.6`, `pulp-wars-poc-7r49`): the step is 1 for
  // every tier (2 before). At 2 a tenth technology cost 23 to 27 Coins and
  // neither the hand player nor the Normal AI reached its tier-3 units
  // before round 28.
  // The economy rejig (`pulp_wars-w49.16`, 7r54): `step` is per city the
  // player owns beyond its first, 1 / 2 / 3 by tier. It was per technology
  // owned beyond the first (1 for every tier) from tuning 4 to 7r53.
  1: { base: 5, step: 1 },
  2: { base: 7, step: 2 },
  3: { base: 9, step: 3 },
});

/**
 * The price of a technology of `tier` for a player that owns
 * `ownedCityCount` cities (the free opener is
 * {@link playerTechnologyResearchCostV7}): the tier's base plus the tier's
 * step for each owned city beyond the first. A count below 1 prices as 1.
 */
export function technologyResearchCostV7(
  tier: 1 | 2 | 3,
  ownedCityCount: number,
): number {
  if (
    ![1, 2, 3].includes(tier) ||
    !Number.isSafeInteger(ownedCityCount) ||
    ownedCityCount < 0
  )
    throw new RangeError("INVALID_CITY_COUNT");
  const { base, step } = TECHNOLOGY_RESEARCH_COST_V7[tier];
  const value =
    BigInt(base) + BigInt(step) * BigInt(Math.max(0, ownedCityCount - 1));
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  return Number(value);
}

/**
 * Revision 12 free opening research: while a player has researched no
 * technology, any offered tier-1 technology costs 0 Coins. Afterward the
 * ordinary tier formula applies. The economy rejig (7r54):
 * `researchedTechCount` decides the free opener only; the price follows
 * `ownedCityCount`.
 */
export function playerTechnologyResearchCostV7(
  tier: 1 | 2 | 3,
  researchedTechCount: number,
  ownedCityCount: number,
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

/**
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`): the role of the unit a
 * treasure chest gives a seat of `faction` in `round`. It is the faction's
 * `treasureUnitRole`, except that before round
 * `TREASURE_TIER_3_UNIT_FIRST_ROUND_V7` a role unlocked by a tier 3
 * technology (the Human Knight, the Undead Vampire, the Goblin Scrap Buggy)
 * is replaced by the faction's `RAIDER`-role unit (Raider, Ghoul, Wolf
 * Rider), the role the five other factions' chests always give.
 */
export function treasureUnitRoleForRoundV7(
  faction: FactionIdV7,
  round: number,
): UnitRoleIdV7 {
  const role = factionRulesV7(faction).treasureUnitRole;
  if (round >= TREASURE_TIER_3_UNIT_FIRST_ROUND_V7) return role;
  const tree = factionTreeV7(faction);
  const technology = tree.roleRules[role].technology;
  const tier =
    technology === null
      ? null
      : (tree.nodes.find((node) => node.id === technology)?.tier ?? null);
  return tier === 3 ? TREASURE_EARLY_UNIT_ROLE_V7 : role;
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

/**
 * The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md section
 * 2.1): the part of a `mindControlled` entry the kind resolver reads. The
 * state's and the view's entries both carry it.
 */
export interface MindControlKindEntryV7 {
  readonly unitId: number;
  readonly originalOwnerId: PlayerId;
}

/**
 * Anything that lists players with their bound faction and the
 * mind-controlled units (state or view). `mindControlled` is required so
 * that every synthesized roster states explicitly which units it resolves
 * (the compile-time half of the kind-reader audit, section 2.2).
 */
export interface FactionRosterV7 {
  readonly players: readonly {
    readonly id: PlayerId;
    readonly faction: FactionIdV7;
  }[];
  readonly mindControlled: readonly MindControlKindEntryV7[];
  /**
   * Map curiosities round 2 (section 32.3): the breed of every neutral unit
   * (its `monsters` entry), which the kind resolvers read. A roster without
   * it (setup, role-level reads, and the partial rosters of chains) resolves
   * a neutral unit's breed from its role and maximum HP, which state
   * parsing pins per breed (`neutralBreedOfV7`).
   */
  readonly monsters?: readonly NeutralBreedEntryV7[];
}

/** Round 2 (section 32.3): the breed facts the kind resolvers read. */
export interface NeutralBreedEntryV7 {
  readonly unitId: number;
  readonly breed: NeutralBreedV7;
}

/** The unit facts the kind resolver reads: its ID and its controller. */
export interface UnitKindRefV7 {
  readonly id: number;
  readonly ownerId: PlayerId;
}

/** A roster with no mind-controlled unit (setup, role-level previews). */
export function seatRosterV7(
  players: FactionRosterV7["players"],
): FactionRosterV7 {
  return { players, mindControlled: [] };
}

/** The faction a seat is bound to (its research, production, and economy). */
export function playerFactionV7(
  roster: Pick<FactionRosterV7, "players">,
  playerId: PlayerId,
): FactionIdV7 {
  const player = roster.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player.faction;
}

/**
 * The Mind Control revision (section 2): THE kind resolver. A unit's kind
 * is the faction of its `mindControlled` entry's `originalOwnerId` while it
 * is controlled, else its owner's (its controller's). It decides the
 * label, art, cost, stats, abilities, role mechanics, and every body rule
 * of the unit; the controller (`ownerId`) decides everything seat-level.
 * With an empty list it equals `playerFactionV7(roster, unit.ownerId)`.
 */
export function unitFactionV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7,
): UnitKindV7 {
  // Map curiosities (section 8.1): a neutral unit's kind is the neutral
  // registration (it is never mind-controlled).
  if (unit.ownerId === NEUTRAL_OWNER_ID_V7) return NEUTRAL_KIND_V7;
  if (roster.mindControlled.length > 0) {
    const entry = roster.mindControlled.find(
      (candidate) => candidate.unitId === unit.id,
    );
    if (entry !== undefined)
      return playerFactionV7(roster, entry.originalOwnerId);
  }
  return playerFactionV7(roster, unit.ownerId);
}

/**
 * The Mind Control revision (section 2.2): whether the unit is
 * mind-controlled (it has a `mindControlled` entry).
 */
export function isMindControlledV7(
  roster: Pick<FactionRosterV7, "mindControlled">,
  unitId: number,
): boolean {
  return (
    roster.mindControlled.length > 0 &&
    roster.mindControlled.some((entry) => entry.unitId === unitId)
  );
}

/**
 * The Mind Control revision (section 5.2): the unit-level technology of a
 * unit: its controller's research (`controllerResearchedTechs`) read
 * through its kind's tree. Seat-level unlocks keep reading the controller's
 * own capabilities.
 */
export function unitCapabilitiesV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7,
  controllerResearchedTechs: readonly TechnologyIdV7[],
): TechnologyCapabilitiesV7 {
  const kind = unitFactionV7(roster, unit);
  // Map curiosities (section 8.1): a neutral unit has no technology.
  if (kind === NEUTRAL_KIND_V7) return neutralCapabilitiesV7();
  return technologyCapabilitiesV7(controllerResearchedTechs, kind);
}

/**
 * Map curiosities (section 8.1): the technology capabilities of the empty
 * technology list (no researched technology unlocks anything, whatever the
 * tree), which a neutral unit always has.
 */
export function neutralCapabilitiesV7(): TechnologyCapabilitiesV7 {
  return technologyCapabilitiesV7([], "ORIGINAL");
}

/**
 * Map curiosities (section 10.5): the researched technologies of a unit's
 * controller: the player's own list, or the empty list for the neutral
 * owner. Every reader of "the owner's technology" for a unit that may be
 * neutral goes through this helper; it throws for any other unknown ID.
 */
export function ownerResearchedTechsV7(
  roster: {
    readonly players: readonly {
      readonly id: PlayerId;
      readonly researchedTechs: readonly TechnologyIdV7[];
    }[];
  },
  ownerId: PlayerId,
): readonly TechnologyIdV7[] {
  if (ownerId === NEUTRAL_OWNER_ID_V7) return [];
  const player = roster.players.find((candidate) => candidate.id === ownerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player.researchedTechs;
}

/**
 * The Mind Control revision (section 5.1 ruling 3): the abilities whose
 * result is a new unit (or a controlled unit), which a mind-controlled unit
 * never has: Raise Dead, Infect, Bite, Hatch, Assemble, Mind Control, and
 * tunnel riding. The Steam Mole's `TUNNEL` stays (it tunnels alone). The
 * Candy revision (section 12.5): Re-bake.
 */
export const MIND_CONTROLLED_LOST_ABILITIES_V7: readonly UnitRoleAbilityV7[] =
  deepFreeze([
    "RAISE_DEAD",
    "INFECT",
    "BITE",
    "HATCH",
    "ASSEMBLE",
    "MIND_CONTROL",
    "RIDES_TUNNEL",
    "REBAKE",
  ]);

const CONTROLLED_ROLE_RULES_V7 = new WeakMap<
  EffectiveRoleRuleV7,
  EffectiveRoleRuleV7
>();

/**
 * Resolves a unit's role rule through its kind (`unitFactionV7`). A
 * mind-controlled unit's rule is its kind's without
 * {@link MIND_CONTROLLED_LOST_ABILITIES_V7}, so every "may it use this
 * ability" read (commands, the public query, passive rules such as Infect
 * and Bite) refuses them in one place.
 */
export function unitRoleRuleV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7 & { readonly role: UnitRoleIdV7 },
): EffectiveRoleRuleV7 {
  const kind = unitFactionV7(roster, unit);
  // Map curiosities (section 8.1; round 2, section 32.3): the neutral
  // registration of the unit's breed.
  if (kind === NEUTRAL_KIND_V7)
    return NEUTRAL_ROLE_RULES_V7[neutralBreedOfV7(roster, unit)];
  const rule = effectiveRoleRuleV7(unit.role, kind);
  if (!isMindControlledV7(roster, unit.id)) return rule;
  const cached = CONTROLLED_ROLE_RULES_V7.get(rule);
  if (cached !== undefined) return cached;
  const controlled: EffectiveRoleRuleV7 = deepFreeze({
    ...rule,
    abilities: rule.abilities.filter(
      (ability) => !MIND_CONTROLLED_LOST_ABILITIES_V7.includes(ability),
    ),
  });
  CONTROLLED_ROLE_RULES_V7.set(rule, controlled);
  return controlled;
}

/** Resolves a unit's engine mechanics through its kind. */
export function unitRoleMechanicsV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7 & { readonly role: UnitRoleIdV7 },
): RoleMechanicsV7 {
  const kind = unitFactionV7(roster, unit);
  if (kind === NEUTRAL_KIND_V7)
    return NEUTRAL_ROLE_MECHANICS_V7[neutralBreedOfV7(roster, unit)];
  return roleMechanicsV7(unit.role, kind);
}

/**
 * Map curiosities (section 8.1; round 2, section 32.3): the breed of a
 * neutral unit, read from its `monsters` entry in the roster. A roster
 * without the entry (a partial roster, or a unit that died earlier in the
 * same command) falls back to the breed of the unit's mechanical role (a
 * `GUARD` by its maximum HP: the Zombie's 18, else the Shield Projector),
 * which is exact because state parsing pins each breed's role and maximum
 * HP; a role no breed has is an invalid state.
 */
export function neutralBreedOfV7(
  roster: Pick<FactionRosterV7, "monsters">,
  unit: {
    readonly id: number;
    readonly role: UnitRoleIdV7;
    readonly maxHp?: number;
  },
): NeutralBreedV7 {
  if (roster.monsters !== undefined && roster.monsters.length > 0) {
    const entry = roster.monsters.find(
      (candidate) => candidate.unitId === unit.id,
    );
    if (entry !== undefined) return entry.breed;
  }
  switch (unit.role) {
    case "JUGGERNAUT":
      return "GIANT_SPIDER";
    case "FIGHTER":
      return "GRUNT";
    case "MARKSMAN":
      return "RAY_GUNNER";
    case "GUARD":
      return unit.maxHp === NEUTRAL_ROLE_RULES_V7.ZOMBIE.maxHp
        ? "ZOMBIE"
        : "SHIELD_PROJECTOR";
    case "RAIDER":
      return "BIGFOOT";
    default:
      throw new RangeError(`Unknown v7 neutral role: ${String(unit.role)}`);
  }
}

/**
 * Map curiosities (section 8.1): the role rule of the Giant Spider, whose
 * mechanical role is `JUGGERNAUT`; any other role is an invalid state. Kept
 * for the Spider's readers; every unit read goes through `unitRoleRuleV7`.
 */
export function neutralRoleRuleV7(roleId: UnitRoleIdV7): EffectiveRoleRuleV7 {
  if (roleId !== NEUTRAL_MONSTER_ROLE_RULE_V7.role)
    throw new RangeError(`Unknown v7 neutral role: ${String(roleId)}`);
  return NEUTRAL_MONSTER_ROLE_RULE_V7;
}

/**
 * A role-level read with no unit (training, production rows, previews of a
 * unit not yet built): the role rule under the seat's own faction.
 */
export function seatRoleRuleV7(
  roster: Pick<FactionRosterV7, "players">,
  ownerId: PlayerId,
  role: UnitRoleIdV7,
): EffectiveRoleRuleV7 {
  return effectiveRoleRuleV7(role, playerFactionV7(roster, ownerId));
}

/** The role-level engine mechanics under the seat's own faction. */
export function seatRoleMechanicsV7(
  roster: Pick<FactionRosterV7, "players">,
  ownerId: PlayerId,
  role: UnitRoleIdV7,
): RoleMechanicsV7 {
  return roleMechanicsV7(role, playerFactionV7(roster, ownerId));
}

/**
 * The Frozen facts the Frozen helpers read (canonical state and public view
 * alike): the roster and the Ice Folk `frozen` side list.
 */
export interface FrozenLookupV7 extends FactionRosterV7 {
  readonly frozen?: readonly {
    readonly unitId: number;
  }[];
}

/**
 * Ice Folk Freeze (`pulp_wars-w49.37`, docs/product/RULESET_7_CURRENT.md
 * section 21.2): whether the unit is Frozen (it has a `frozen` entry). A
 * Frozen unit cannot move or use any action and does not retaliate. It is
 * false for every unit of a match without an Ice Folk seat.
 */
export function unitIsFrozenV7(
  lookup: FrozenLookupV7,
  unit: { readonly id: number },
): boolean {
  const frozen = lookup.frozen;
  if (frozen === undefined || frozen.length === 0) return false;
  return frozen.some((entry) => entry.unitId === unit.id);
}

/**
 * THE single "may this unit use a primary action after moving" rule (the
 * Ice Folk revision, section 21.3): its role rule's
 * `mayUsePrimaryActionAfterMove`, and it is not Frozen. Every read of the
 * role flag for a concrete unit goes through this helper; role-level reads
 * (production values, role tables) keep the role flag. A source audit in
 * `tests/unit/ruleset-v7-ice-folk-helpers.test.ts` pins the call sites.
 */
export function unitMayActAfterMoveV7(
  lookup: FrozenLookupV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  return (
    unitRoleRuleV7(lookup, unit).mayUsePrimaryActionAfterMove &&
    !unitIsFrozenV7(lookup, unit)
  );
}

/**
 * Whether a primary action is refused because the unit has moved this turn
 * (the activation flag `moved`, an interrupted Move included) and may not act
 * after moving ({@link unitMayActAfterMoveV7}).
 */
export function primaryActionBlockedAfterMoveV7(
  lookup: FrozenLookupV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly activation: { readonly moved: boolean };
  },
): boolean {
  return unit.activation.moved && !unitMayActAfterMoveV7(lookup, unit);
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
/**
 * Revision 20 Charge!: the most tiles of a Move that count as run-up. The
 * Dinosaur pass (`pulp_wars-w49.15`, 7r53): with Wallbreaker; without it
 * one tile counts (`RUN_UP_BASE_TILES_V7`).
 */
export const RUN_UP_MAXIMUM_TILES_V7 = 2;
/** The Dinosaur pass (7r53): the run-up tiles without Wallbreaker. */
export const RUN_UP_BASE_TILES_V7 = 1;

/** The unit facts the revision-20 Charge! helpers read. */
export interface LinebreakerUnitFactsV7 {
  readonly id: number;
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
  unit: Pick<LinebreakerUnitFactsV7, "id" | "ownerId" | "role" | "form">,
): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(roster, unit).abilities.includes("LINEBREAKER")
  );
}

/**
 * The Dinosaur pass (`pulp_wars-w49.15`, 7r53): the most tiles of a Move
 * that count as this unit's run-up: 1, or 2 when its controller's research
 * grants Wallbreaker in the unit's own tree.
 */
export function chargeRunUpMaximumTilesV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7,
  ownerResearchedTechs: readonly TechnologyIdV7[],
): number {
  return unitCapabilitiesV7(roster, unit, ownerResearchedTechs).runUpTiles;
}

/**
 * Revision 20 Charge! run-up: the tiles that count for the unit's next
 * attack this turn: `min(maximum, movedPathLength)` when it moved and has
 * not attacked, otherwise 0, `maximum` being
 * `chargeRunUpMaximumTilesV7` of its controller's research (the Dinosaur
 * pass, 7r53: 1, or 2 with Wallbreaker). `plannedPathLength` replaces the
 * activation's own path length (an attack after a planned Move).
 */
export function chargeRunUpTilesV7(
  roster: FactionRosterV7,
  unit: LinebreakerUnitFactsV7,
  ownerResearchedTechs: readonly TechnologyIdV7[],
  plannedPathLength?: number,
): number {
  if (!attackIsChargeV7(roster, unit)) return 0;
  const length =
    plannedPathLength ??
    (unit.activation.moved && unit.activation.attacksUsed === 0
      ? unit.activation.movedPathLength
      : 0);
  return Math.max(
    0,
    Math.min(
      chargeRunUpMaximumTilesV7(roster, unit, ownerResearchedTechs),
      length,
    ),
  );
}

/** The `attack2` a Charge! gains from its run-up (0 for any other attack). */
export function chargeRunUpAttack2V7(
  roster: FactionRosterV7,
  unit: LinebreakerUnitFactsV7,
  ownerResearchedTechs: readonly TechnologyIdV7[],
  plannedPathLength?: number,
): number {
  return (
    chargeRunUpTilesV7(roster, unit, ownerResearchedTechs, plannedPathLength) *
    unitRoleMechanicsV7(roster, unit).runUpBonus2
  );
}

/**
 * The Undead pass, correction (`pulp_wars-w49.13`): whether an `ATTACK` by
 * a unit with this role rule plagues: the rule has `PLAGUE` and the
 * controller's researched technology grants `plague` in the unit's own
 * tree (Pestilence, the Undead `EXPLOSIVES`).
 */
export function attackPlaguesV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7,
  rule: Pick<EffectiveRoleRuleV7, "abilities">,
  ownerResearchedTechs: readonly TechnologyIdV7[],
): boolean {
  return (
    rule.abilities.includes("PLAGUE") &&
    unitCapabilitiesV7(roster, unit, ownerResearchedTechs).plague
  );
}

/**
 * Revision 20 Wallbreaker (section 4.2): whether an `ATTACK` by this unit
 * removes the defender's City Walls levels: a land-form growing unit whose
 * owner's researched technology grants `ignoresCityWalls`.
 */
export function attackIgnoresCityWallsV7(
  roster: FactionRosterV7,
  unit: Pick<DinosaurUnitFactsV7, "id" | "ownerId" | "role" | "form">,
  ownerResearchedTechs: readonly TechnologyIdV7[],
): boolean {
  return (
    unit.form === "LAND" &&
    unitGrowsV7(roster, unit) &&
    unitCapabilitiesV7(roster, unit, ownerResearchedTechs).ignoresCityWalls
  );
}

/** The growth stage a growing unit with `kills` has: 0, 1 (Big), 2 (Alpha). */
export function growthStageForKillsV7(kills: number): 0 | 1 | 2 {
  return kills >= GROWTH_KILLS_V7[1] ? 2 : kills >= GROWTH_KILLS_V7[0] ? 1 : 0;
}

/** The unit facts the revision-19 Dinosaur helpers read. */
export interface DinosaurUnitFactsV7 {
  readonly id: number;
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
  unit: Pick<DinosaurUnitFactsV7, "id" | "ownerId" | "role" | "form">,
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
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): number {
  return unitRoleMechanicsV7(roster, unit).capacitySlots;
}

/**
 * Revision 19 Armoured (section 8.2): one instance of `damage` before the cap
 * at current HP, reduced by the unit's armour to a minimum of 1 (0 and 1 are
 * unchanged). It applies in land form and while embarked, never to an Egg.
 * The Dwarf revision (section 10.2): then Plated caps the instance for a
 * land-form Plated unit (the Steam Tank); every hit, splash, Pierce, Sweep,
 * Wail, blast, bomb, eruption, and Plague damage goes through this helper.
 * `plated: false` leaves the cap out (headless telemetry only).
 */
export function armouredDamageV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  damage: number,
  plated = true,
): number {
  if (unit.form === "EGG") return damage;
  const mechanics = unitRoleMechanicsV7(roster, unit);
  const reduction = mechanics.armourReduction;
  const armoured =
    reduction === 0 || damage < 2 ? damage : Math.max(1, damage - reduction);
  return plated && mechanics.plated !== null && unit.form === "LAND"
    ? Math.min(armoured, mechanics.plated)
    : armoured;
}

/**
 * The Goblin pass (`pulp_wars-w49.12`, 7r50): whether a unit's activation
 * allows a Kaboom. Ordinarily the unit has used no primary action and no
 * Ram continuation is waiting; with Crash (`kaboomAfterAttack`, the Scrap
 * Buggy) its attacks do not count, so it may Kaboom after attacking and
 * while a Ram continuation waits. A unit that Recovered, captured, or used
 * a special action never may.
 */
export function kaboomReadyV7(
  activation: {
    readonly attacked: boolean;
    readonly recovered: boolean;
    readonly captured: boolean;
    readonly specialActed: boolean;
    readonly overrunActive: boolean;
  },
  kaboomAfterAttack: boolean,
): boolean {
  if (activation.recovered || activation.captured || activation.specialActed)
    return false;
  return (
    kaboomAfterAttack || (!activation.attacked && !activation.overrunActive)
  );
}

/**
 * The Goblin pass (`pulp_wars-w49.12`, 7r50): Blast-proof. A land-form unit
 * whose kind's role mechanics say so (the Goblin Orc Brute) is not hit by
 * an explosion or by the splash of an attack on a unit next to it.
 */
export function unitIsBlastProofV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
): boolean {
  return unit.form === "LAND" && unitRoleMechanicsV7(roster, unit).blastProof;
}

/**
 * The Dwarf revision (section 10.2): whether Plated lowered one instance of
 * `damage` (after Armoured) to the unit.
 */
export function platedCapAppliesV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly form: UnitFormV7;
  },
  damage: number,
): boolean {
  if (unit.form !== "LAND") return false;
  const plated = unitRoleMechanicsV7(roster, unit).plated;
  if (plated === null) return false;
  const reduction = unitRoleMechanicsV7(roster, unit).armourReduction;
  const armoured =
    reduction === 0 || damage < 2 ? damage : Math.max(1, damage - reduction);
  return armoured > plated;
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
/**
 * The Mind Control revision (section 4.4): the units one Brain controls at
 * most.
 */
export const MIND_CONTROL_LIMIT_V7 = 1;
/**
 * The Martian revision (section 8.4): the Tractor Beam distance: the exact
 * distance of the Saucer's pull and the minimum of the Heavy Tractor Beam.
 */
export const TRACTOR_BEAM_RANGE_V7 = 2;
/** The Martian revision (section 8.4): the tiles a Tractor Beam pulls. */
export const TRACTOR_BEAM_PULL_V7 = 1;
/**
 * The Martian balance revision (section 5.3): the Heavy Tractor Beam (the
 * Mothership) reaches from `TRACTOR_BEAM_RANGE_V7` to this distance.
 */
export const HEAVY_TRACTOR_RANGE_V7 = 3;
/** The Martian balance revision (section 5.3): the most tiles it pulls. */
export const HEAVY_TRACTOR_PULL_V7 = 2;
/**
 * The Martian balance revision (section 5.1): a Beam Down carrier picks up
 * an own unit within this Chebyshev distance (or from an own city).
 */
export const BEAM_DOWN_PICKUP_RANGE_V7 = 2;
/**
 * The Ice Folk balance revision (RULESET_7_BALANCE_MARTIAN_ICE.md section
 * 6.2): Snow cover is `x 1.25`. A Forest or Mountain stays
 * `TERRAIN_COVER_V7` (`x 1.5`) and wins on a snowy Forest or Mountain.
 */
export const SNOW_COVER_V7 = Object.freeze({
  numerator: 5,
  denominator: 4,
} as const);
/** The Forest and Mountain cover, `x 1.5`. */
export const TERRAIN_COVER_V7 = Object.freeze({
  numerator: 3,
  denominator: 2,
} as const);
/** No cover. */
export const NO_COVER_V7 = Object.freeze({
  numerator: 1,
  denominator: 1,
} as const);
/** A cover multiplier on the defender's Defense force. */
export type CoverBonusV7 =
  typeof NO_COVER_V7 | typeof SNOW_COVER_V7 | typeof TERRAIN_COVER_V7;

/**
 * THE cover multiplier of a defender that takes cover, shared by the combat
 * resolution, the public combat preview, Wail, the unit stats, and the AI
 * estimate: the terrain's `x 1.5` on a Forest or Mountain, else Snow cover
 * `x 1.25` (`snowCover`: an Ice Folk unit on Snow with no fortification of
 * its own, on any other terrain), else none. They are never added.
 */
export function coverBonusV7(
  terrainCover: boolean,
  snowCover: boolean,
): CoverBonusV7 {
  return terrainCover
    ? TERRAIN_COVER_V7
    : snowCover
      ? SNOW_COVER_V7
      : NO_COVER_V7;
}

/**
 * Tuning 3 (`pulp_wars-w49.3`): whether `ownerId`'s ground units have the
 * Forest cover (the `forestCover` capability of its technologies under its
 * own tree: a seat-level rule, like its Roads or its Commerce). The neutral
 * owner has no technology and keeps the cover.
 */
export function ownerHasForestCoverV7(
  roster: {
    readonly players: readonly {
      readonly id: PlayerId;
      readonly faction: FactionIdV7;
      readonly researchedTechs: readonly TechnologyIdV7[];
    }[];
  },
  ownerId: PlayerId,
): boolean {
  if (ownerId === NEUTRAL_OWNER_ID_V7) return true;
  const player = roster.players.find((candidate) => candidate.id === ownerId);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return technologyCapabilitiesV7(player.researchedTechs, player.faction)
    .forestCover;
}

/**
 * Whether the terrain gives the Forest and Mountain cover to a ground unit
 * whose owner has (`forestCover` true) or lacks the Forest cover technology.
 * Tuning 3 (`pulp_wars-w49.3`): a Mountain always does; a Forest does only
 * with the owner's `FOREST_COVER` capability (Forestry). The neutral owner
 * has no technology and keeps the Forest cover.
 */
export function terrainGivesCoverV7(
  terrain: string | null | undefined,
  forestCover: boolean,
): boolean {
  return terrain === "MOUNTAIN" || (terrain === "FOREST" && forestCover);
}

/** The Ice Folk revision (section 5.5): the Shatter threshold. */
export const SHATTER_HP_V7 = 3;
/** The Ice Folk revision (section 5.5): the Shatter threshold with Brittle. */
export const BRITTLE_SHATTER_HP_V7 = 4;
/** The Ice Folk revision (section 7.3): the Bolas reach (Chebyshev). */
export const BOLAS_RANGE_V7 = 2;
/**
 * Ice Folk Freeze (`pulp_wars-w49.37`): the Cold Snap reach (Chebyshev):
 * every adjacent unit (2 before).
 */
export const COLD_SNAP_RANGE_V7 = 1;
/** Ice Folk Freeze: the Ice Witch's Frost Bolt reach (Chebyshev). */
export const FROST_BOLT_RANGE_V7 = 2;
/** Ice Folk Freeze: the farthest a Mammoth's Stampede goes (tiles). */
export const STAMPEDE_RANGE_V7 = 3;
/** Ice Folk Freeze: the fixed damage a Stampede deals each unit in its path. */
export const STAMPEDE_DAMAGE_V7 = 3;
/**
 * Ice Folk Freeze: the Move points Glacier adds to an Ice Folk land unit's
 * `MOVE` whose path includes an ice tile.
 */
export const GLACIER_ICE_MOVE_BONUS_V7 = 1;
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

/** The Dwarf revision (section 5.4): the eruption of a surfacing Mole. */
export const ERUPTION_DAMAGE_V7 = 2;
/** The Dwarf revision (section 5.4): the eruption with Blasting Charges. */
export const BLASTING_ERUPTION_DAMAGE_V7 = 3;
/** The Dwarf revision (section 6.2): the bombing-run reach (Chebyshev). */
export const BOMB_RANGE_V7 = 2;
/**
 * Dwarf crowd control (`pulp_wars-w49.33`): the farthest (Chebyshev) a
 * bombing run lands from its target (1 before).
 */
export const BOMB_LANDING_RANGE_V7 = 2;
/** The Dwarf revision (section 6.3): the fixed bomb. */
export const BOMB_DAMAGE_V7 = 5;
/** The Dwarf revision (section 6.3): the bomb with Dive. */
export const DIVE_BOMB_DAMAGE_V7 = 6;
/** The Dwarf revision (section 8): Dig In reach from an own city center. */
export const DIG_IN_RADIUS_V7 = 1;
/** The Dwarf revision (section 9.2): the Coins an Assemble costs. */
export const ASSEMBLE_COST_V7 = 4;
/** Dwarf crowd control (`pulp_wars-w49.33`): the Coins a Barricade costs. */
export const BARRICADE_COST_V7 = 3;
/** Dwarf crowd control: a Barricade's HP (and maximum HP). */
export const BARRICADE_HP_V7 = 10;
/** Dwarf crowd control: a Barricade's Defense in half-points (Defense 2). */
export const BARRICADE_DEFENSE2_V7 = 4;
/** Dwarf crowd control: the standing Barricades a player may have. */
export const BARRICADE_CAP_V7 = 4;

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1): the
 * `attack2` a Ram adds (+1 Attack).
 */
export const RAM_BONUS2_V7 = 2;
/**
 * The naval branch (section 4.2): a ship can be boarded at
 * `floor(maxHp / BOARDING_HP_DIVISOR_V7)` HP or less.
 */
export const BOARDING_HP_DIVISOR_V7 = 3;
/** The naval branch (section 5.4): Harbours, per active Port or Shipyard. */
export const HARBOUR_POPULATION_V7 = 1;

/**
 * The naval branch (section 4.2): the HP at or below which a ship of
 * `maxHp` can be boarded (Patrol Boat 3, Submarine 4, Battleship 8).
 */
export function boardableAtV7(maxHp: number): number {
  return Math.floor(maxHp / BOARDING_HP_DIVISOR_V7);
}

/**
 * The naval branch (section 4.2): the HP of a boarded prize (the prize crew
 * patches it up to one above the boarding line).
 */
export function boardedHpV7(maxHp: number): number {
  return boardableAtV7(maxHp) + 1;
}

/**
 * The naval branch (section 5.4): THE live population of an active dock: a
 * Port gives 1 and a Shipyard 2, plus the owner's `harbourPopulation`
 * (Harbours). A blockaded dock gives 0 (the caller's rule).
 */
export function dockPopulationV7(
  improvement: "PORT" | "SHIPYARD",
  harbourPopulation: number,
): number {
  return (improvement === "SHIPYARD" ? 2 : 1) + harbourPopulation;
}

/** The frozen sea (section 8.5): the turns ice lasts outside its owner's territory. */
export const ICE_TURNS_V7 = 3;
/** The frozen sea (section 8.10): the same with Glacier. */
export const GLACIER_ICE_TURNS_V7 = 5;
/** The frozen sea (section 8.4): the tiles of a Freeze line. */
export const FREEZE_LINE_V7 = 2;
/** The frozen sea (section 8.4): the Ice Witch's Freeze ring (Chebyshev). */
export const WITCH_FREEZE_RADIUS_V7 = 1;
/** The frozen sea (section 8.9): the crush of an icebound unit. */
export const ICE_CRUSH_DAMAGE_V7 = 3;
/** The frozen sea (section 8.11): Sea Dog for an Ice Folk seat. */
export const ICE_SEA_DOG_UNITS_V7 = 5;

/**
 * The frozen sea (section 8.3): anything that lists the ice tiles (a
 * canonical state, or a view with the ice on tiles its viewer has explored).
 */
export interface IceLookupV7 {
  readonly ice: readonly {
    readonly at: { readonly x: number; readonly y: number };
  }[];
}

/**
 * The frozen sea (section 8.3) `iceAtV7`: whether `at` is an ice tile of
 * the lookup. Always false in a match without an Ice Folk seat (the list is
 * empty).
 */
export function isIceAtV7(
  lookup: IceLookupV7,
  at: { readonly x: number; readonly y: number },
): boolean {
  const ice = lookup.ice;
  if (ice.length === 0) return false;
  for (const entry of ice)
    if (entry.at.x === at.x && entry.at.y === at.y) return true;
  return false;
}

/**
 * The frozen sea (section 8.9) `unitIsIceboundV7`: an afloat unit (`NAVAL`
 * or `EMBARKED`) standing on an ice tile. Derived, never stored. It cannot
 * Move, Attack, Board, or retaliate, and no shove, Push, Knockback, or
 * Tractor Beam moves it.
 */
export function unitIsIceboundV7(
  lookup: IceLookupV7,
  unit: {
    readonly form: UnitFormV7;
    readonly at: { readonly x: number; readonly y: number };
  },
): boolean {
  return (
    (unit.form === "NAVAL" || unit.form === "EMBARKED") &&
    isIceAtV7(lookup, unit.at)
  );
}

/** The unit facts the naval-branch helpers read (state and public units). */
export interface NavalBranchUnitFactsV7 {
  readonly id: number;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/**
 * The naval branch (section 5.2): whether the unit is submerged (a
 * `NAVAL`-form unit whose role has `SUBMERGED`: the Submarine). An `ATTACK`
 * on it is legal only from Chebyshev distance 1. The frozen sea (section
 * 8.9): an icebound Submarine is not submerged.
 */
export function unitIsSubmergedV7(
  roster: FactionRosterV7 & IceLookupV7,
  unit: NavalBranchUnitFactsV7 & {
    readonly at: { readonly x: number; readonly y: number };
  },
): boolean {
  return (
    unit.form === "NAVAL" &&
    unitRoleRuleV7(roster, unit).abilities.includes("SUBMERGED") &&
    !isIceAtV7(roster, unit.at)
  );
}

/**
 * The naval branch (section 5.3): whether an `ATTACK` by this unit is a
 * torpedo (a `NAVAL`-form unit whose role has `TORPEDO`): it targets only
 * units afloat and draws no retaliation.
 */
export function attackIsTorpedoV7(
  roster: FactionRosterV7,
  attacker: NavalBranchUnitFactsV7,
): boolean {
  return (
    attacker.form === "NAVAL" &&
    unitRoleRuleV7(roster, attacker).abilities.includes("TORPEDO")
  );
}

/**
 * The naval branch (section 4.1): whether an `ATTACK` is a Ram: a
 * `NAVAL`-form attacker whose role has `RAM` and whose kind's capabilities
 * under its owner have `ram` (Seamanship), that has moved this turn (an
 * interrupted Move counts; `plannedMove` estimates an attack after a planned
 * Move), at Chebyshev distance 1, on a target afloat that is not icebound
 * (the frozen sea, section 8.9: no ram moves a ship frozen in).
 */
export function attackIsRamV7(
  roster: FactionRosterV7 & IceLookupV7,
  attacker: NavalBranchUnitFactsV7 & {
    readonly activation: { readonly moved: boolean };
  },
  target: {
    readonly form: UnitFormV7;
    readonly at: { readonly x: number; readonly y: number };
  },
  distance: number,
  attackerOwnerResearchedTechs: readonly TechnologyIdV7[],
  plannedMove = false,
): boolean {
  return (
    attacker.form === "NAVAL" &&
    distance === 1 &&
    (attacker.activation.moved || plannedMove) &&
    (target.form === "NAVAL" || target.form === "EMBARKED") &&
    !isIceAtV7(roster, target.at) &&
    unitRoleRuleV7(roster, attacker).abilities.includes("RAM") &&
    unitCapabilitiesV7(roster, attacker, attackerOwnerResearchedTechs).ram
  );
}

/** The unit facts the Martian registry helpers read. */
export interface MartianUnitFactsV7 {
  readonly id: number;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitFormV7;
}

/** The movement mode of a unit's role under its owner's registration. */
export function unitMovementModeV7(
  roster: FactionRosterV7,
  unit: Pick<MartianUnitFactsV7, "id" | "ownerId" | "role">,
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
 * `pulp_wars-ke95`: whether a unit's kind can ever capture. Any unit can
 * capture (user direction 2026-10-09): every land role of every faction has
 * `CAPTURE`, flyers and the Prowling Sabretooth included; boats and the
 * neutral Giant Spider do not. Eggs, burrowed and embarked units are no
 * land-form unit on a center, so the capture rules refuse them. The Normal
 * AI picks its capturers with this.
 */
export function unitCanEverCaptureV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7 & { readonly role: UnitRoleIdV7 },
): boolean {
  return unitRoleRuleV7(roster, unit).abilities.includes("CAPTURE");
}

/** {@link unitCanEverCaptureV7} for a faction's role (training choices). */
export function roleCanEverCaptureV7(
  role: UnitRoleIdV7,
  faction: FactionIdV7,
): boolean {
  return effectiveRoleRuleV7(role, faction).abilities.includes("CAPTURE");
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

/**
 * The Martian pass (`pulp_wars-w49.14`, 7r52): whether a full-power ray by
 * this unit leaves it Cooling. Not when its role has the `heatSink`
 * mechanic and its controller's research grants Heat Sinks in the unit's
 * own tree (the Martian `FIELDCRAFT`): then the Ray Gunner fires at full
 * power every turn it does not move.
 */
export function rayOverheatsV7(
  roster: FactionRosterV7,
  unit: UnitKindRefV7 & { readonly role: UnitRoleIdV7 },
  ownerResearchedTechs: readonly TechnologyIdV7[],
): boolean {
  // Map curiosities round 2 (section 25.2): a neutral Ray Gunner's
  // registration has `heatSink`, so it never Cools (it has no technology).
  if (unit.ownerId === NEUTRAL_OWNER_ID_V7)
    return !unitRoleMechanicsV7(roster, unit).heatSink;
  return !(
    unitRoleMechanicsV7(roster, unit).heatSink &&
    unitCapabilitiesV7(roster, unit, ownerResearchedTechs).heatSinks
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
 * - Rift (`pulp_wars-9s0.5`, docs/product/RULESET_7_RIFT.md): **flyers in
 *   land form only** (`!afloat && movementMode === "FLY"`). Walkers, foot
 *   units, Mountain-born units, Eggs, and afloat units may not; Stride is
 *   Forest, Mountain, and Shallow Water, nothing else (the Martian revision
 *   section 7.4).
 *
 * - Ice (the frozen sea, docs/product/RULESET_7_NAVAL_BRANCH.md section
 *   8.3; `ice`: the tile is a water tile with an ice entry): ground for
 *   every unit that is not afloat, whatever the depth and without
 *   Navigation or Engineering, and never entered by an afloat unit. A
 *   caller that places something that may not stand on ice (an Egg, a
 *   reward or treasure unit, a rising, a mound) passes `ice: false`, so the
 *   tile stays water for it.
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
  readonly ice: boolean;
}): boolean {
  if (
    input.ice &&
    (input.terrain === "SHALLOW_WATER" || input.terrain === "DEEP_WATER")
  )
    return !input.afloat;
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
    case "RIFT":
      return !input.afloat && input.movementMode === "FLY";
  }
}

/**
 * THE shared "does entering this tile end the Move" terrain rule (the Martian
 * revision section 7.1; the Ice Folk revision section 7.1). A walker or
 * flyer is never stopped by terrain. For a ground unit a Mountain ends the
 * Move unless the unit is Mountain-born, and a Forest unless the unit has
 * Forest freedom (Fieldcraft); a step along a Road edge (both ends usable
 * Road nodes for the mover) waives both.
 *
 * Slip (the frozen sea, docs/product/RULESET_7_NAVAL_BRANCH.md section
 * 8.7): entering an ice tile (`ice`) ends the Move of a ground unit that is
 * not of the Ice Folk kind (`iceFolk`). No Road edge and no Fieldcraft
 * waives it.
 */
export function terrainStopsMoveV7(input: {
  readonly terrain: TerrainIdV7;
  readonly movementMode: MovementModeV7;
  readonly mountainBorn: boolean;
  readonly ignoresForest: boolean;
  readonly roadEdge: boolean;
  readonly ice: boolean;
  readonly iceFolk: boolean;
}): boolean {
  if (input.movementMode !== "GROUND") return false;
  if (input.ice && !input.iceFolk) return true;
  return (
    !input.roadEdge &&
    ((input.terrain === "MOUNTAIN" && !input.mountainBorn) ||
      (input.terrain === "FOREST" && !input.ignoresForest))
  );
}

/**
 * Whether the tree of `faction` unlocks `role` for training (the Fighter is
 * always trainable). The frozen sea (naval branch section 8.11): the Ice
 * Folk tree unlocks no ship, so `TRAIN_NAVAL` is refused for an Ice Folk
 * seat whatever it researched.
 */
export function factionUnlocksRoleV7(
  faction: FactionIdV7,
  role: UnitRoleIdV7,
): boolean {
  return (
    role === "FIGHTER" ||
    factionTreeV7(faction).nodes.some((item) =>
      item.unlockedRoles.includes(role),
    )
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
    readonly id: number;
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
  unit: {
    readonly id: number;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
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
    ice: false,
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
 * Whether a unit that avoids foreign sites (`unitAvoidsForeignSitesV7`: a
 * Dwarf rider on its surfacing turn) may END a Move, land, or be placed on a
 * tile with this settlement state: never on a neutral village center or on
 * the center of a city it does not own. The Martian revision (section 7.2)
 * applied it to every flyer until any unit could capture (`pulp_wars-ke95`).
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
  readonly activation: { readonly inspired: boolean; readonly moved: boolean };
}

/**
 * The roster plus the Berserk units of the turn (`pulp_wars-w49.35`): a
 * state, or a player's view (whose list names visible units only). The
 * list is optional, like `BerserkLookupV7`'s: a view captured before it
 * existed has no Berserk unit.
 */
export interface RallyLookupV7 extends FactionRosterV7 {
  readonly berserkThisTurn?: readonly number[];
}

/**
 * Whether `target` is affected by `captain`'s `RALLY` (Human Rally, Undead
 * Frenzy, Dinosaur War Drums, Martian Psychic Command, Goblin Berserk).
 * Resolved through the owners' registrations.
 *
 * - `INSPIRE` (`rallyEffect`): another own land-form unit with `ATTACK`,
 *   not already Inspired, within the captain's rally radius, and not a
 *   `SUPPORT` or `SIEGE` role (nor `rallyExcluded`).
 * - `BERSERK` (`pulp_wars-w49.35`, the Orc Warboss; it replaced WAAAGH!):
 *   another own land-form unit of any role (so never an embarked unit, a
 *   boat, or an Egg) within the radius that has not moved this turn and is
 *   not already Berserk.
 */
export function isRallyTargetV7(
  roster: RallyLookupV7,
  captain: RallyUnitV7,
  target: RallyUnitV7,
): boolean {
  if (
    target.hp <= 0 ||
    target.ownerId !== captain.ownerId ||
    target.form !== "LAND" ||
    target.id === captain.id
  )
    return false;
  const mechanics = unitRoleMechanicsV7(roster, captain);
  const inReach =
    Math.max(
      Math.abs(captain.at.x - target.at.x),
      Math.abs(captain.at.y - target.at.y),
    ) <= mechanics.rallyRadius;
  if (mechanics.rallyEffect === "BERSERK")
    return (
      inReach &&
      !target.activation.moved &&
      !(roster.berserkThisTurn ?? []).includes(target.id)
    );
  if (target.activation.inspired) return false;
  const targetRule = unitRoleRuleV7(roster, target);
  const tactical = targetRule.tacticalRole;
  return (
    tactical !== "SUPPORT" &&
    tactical !== "SIEGE" &&
    // The ninth unit (7r55): the Triceratops, a `LINE` role now.
    !unitRoleMechanicsV7(roster, target).rallyExcluded &&
    targetRule.abilities.includes("ATTACK") &&
    inReach
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
  /**
   * Tuning 1 Breach (`pulp_wars-w49.3`, the `MELEE_FIELD_DEMOLITION` unlock
   * of Explosives in every tree): the player's land-form attacks from
   * distance 1 ignore the defender's fortification levels (City Walls, Field
   * Defense, and Dig In; cover stays) and destroy a Field Defense on the
   * target tile.
   */
  readonly breach: boolean;
  /**
   * Tuning 3 (`pulp_wars-w49.3`, the `FOREST_COVER` unlock of Forestry in
   * every tree): the player's ground units standing in a Forest have the
   * terrain cover. Mountain cover needs no technology.
   */
  readonly forestCover: boolean;
  /**
   * Tuning 4 (the `FOREST_MARCH` unlock of Fieldcraft in every tree): no
   * Forest ends the Move of the player's ground units.
   */
  readonly forestMarch: boolean;
  readonly seaTradeIncomeCoins: 0 | 1;
  readonly hostileCaptureSpoilsCoins: 0 | 2;
  /** Revision 17 Goblin Plunder: Coins per credited hostile kill. */
  readonly plunderCoins: 0 | 2;
  /** Revision 19 Nesting: extra HP of every Egg the player lays. */
  readonly eggHpBonus: 0 | 4;
  /** Revision 19 Nesting: turns removed from a laid Egg's hatch time. */
  readonly eggHatchTurnReduction: 0 | 1;
  /** Revision 20 Nesting: extra unit slots of every city the player owns. */
  readonly nestingCityCapacityBonus: 0 | 1;
  /** Revision 20 Wallbreaker: the player's dinosaurs ignore City Walls. */
  readonly ignoresCityWalls: boolean;
  /**
   * The Dinosaur pass (`pulp_wars-w49.15`, 7r53): the most tiles of a Move
   * that count as the run-up of the player's Charge! units:
   * `RUN_UP_BASE_TILES_V7` (1), or `RUN_UP_MAXIMUM_TILES_V7` (2) with
   * Wallbreaker.
   */
  readonly runUpTiles: number;
  /** The Undead pass, correction: Pestilence, the player's Liches plague. */
  readonly plague: boolean;
  /**
   * The Martian revision, Force Fields: the player's Shields also recharge
   * at the end of its turn.
   */
  readonly shieldsRechargeAtEndTurn: boolean;
  /**
   * The Martian pass (`pulp_wars-w49.14`, 7r52), Force Fields: the player's
   * Shield Projectors project the Force Field (a unit that recharges next
   * to one recharges to `FORCE_FIELD_SHIELD_V7`).
   */
  readonly projectsForceField: boolean;
  /**
   * The Martian pass, Heat Sinks: a full-power ray of the player's units
   * with the `heatSink` role mechanic leaves the unit not Cooling.
   */
  readonly heatSinks: boolean;
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
  /**
   * The Dwarf revision (section 8): Dig In, the player's unmoved Hammerers
   * and Moles on or next to its city centers are dug in.
   */
  readonly digIn: boolean;
  /** The Dwarf revision (section 9.2): the player's Engineers Assemble. */
  readonly assemble: boolean;
  /**
   * The Dwarf revision (section 6.3): the bomb of the player's Gyrocopters
   * (`BOMB_DAMAGE_V7`, or `DIVE_BOMB_DAMAGE_V7` with Dive).
   */
  readonly bombDamage: number;
  /**
   * The Dwarf revision (section 5.4): the eruption of the player's Moles
   * (`ERUPTION_DAMAGE_V7`, or `BLASTING_ERUPTION_DAMAGE_V7` with Blasting
   * Charges).
   */
  readonly eruptionDamage: number;
  /**
   * The Dwarf revision (section 10.1): Blasting Charges, the player's Steam
   * Cannon shots ignore the defender's fortification.
   */
  readonly cannonIgnoresFortification: boolean;
  /**
   * The Candy revision (section 5.3): Home Sweet Home, the player's Rushed
   * units on or next to its city centers do not Crash.
   */
  readonly homeSweetHome: boolean;
  /**
   * The Candy revision (section 6.3): Peppermint Surprise, the damage an
   * enemy takes for eating the player's Crumbs (0, or
   * `PEPPERMINT_DAMAGE_V7`).
   */
  readonly crumbsBite: number;
  /**
   * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1):
   * Seamanship, the player's Patrol Boats ram.
   */
  readonly ram: boolean;
  /** The naval branch (section 4.2): Seamanship, the player's ships board. */
  readonly boarding: boolean;
  /**
   * The naval branch (section 5.4): Harbours, the live population every
   * active Port and Shipyard of the player adds (0, or
   * `HARBOUR_POPULATION_V7`).
   */
  readonly harbourPopulation: 0 | 1;
  /**
   * The frozen sea (naval branch section 8.4): what the units of the player
   * Freeze: nothing, Shallow Water (Rime), or Deep Water too (Pack Ice).
   */
  readonly freezeWater: "NONE" | "SHALLOW" | "DEEP";
  /** The frozen sea (section 8.9): a Freeze locks hostile afloat units in. */
  readonly icebound: boolean;
  /** The frozen sea (section 8.8): Black Ice. */
  readonly blackIce: boolean;
  /**
   * The frozen sea (sections 8.5 and 8.10): `turnsLeft` of the ice the
   * player makes (`ICE_TURNS_V7`, or `GLACIER_ICE_TURNS_V7` with Glacier).
   */
  readonly iceTurns: number;
  /** The frozen sea (section 8.10): Glacier's Snow cover on ice. */
  readonly iceCover: boolean;
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
  let breach = false;
  let forestCover = false;
  let forestMarch = false;
  let seaTradeIncomeCoins: 0 | 1 = 0;
  let hostileCaptureSpoilsCoins: 0 | 2 = 0;
  let plunderCoins: 0 | 2 = 0;
  let eggHpBonus: 0 | 4 = 0;
  let eggHatchTurnReduction: 0 | 1 = 0;
  let nestingCityCapacityBonus: 0 | 1 = 0;
  let ignoresCityWalls = false;
  let runUpTiles: number = RUN_UP_BASE_TILES_V7;
  let plague = false;
  let shieldsRechargeAtEndTurn = false;
  let projectsForceField = false;
  let heatSinks = false;
  let raysIgnoreFortification = false;
  let deepWinter = false;
  let shatterThreshold = SHATTER_HP_V7;
  let digIn = false;
  let assemble = false;
  let bombDamage = BOMB_DAMAGE_V7;
  let eruptionDamage = ERUPTION_DAMAGE_V7;
  let cannonIgnoresFortification = false;
  let homeSweetHome = false;
  let crumbsBite = 0;
  let ram = false;
  let harbourPopulation: 0 | 1 = 0;
  let freezeShallow = false;
  let freezeDeep = false;
  let icebound = false;
  let blackIce = false;
  let iceTurns: number = ICE_TURNS_V7;
  let iceCover = false;
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
        landTradeIncomeCoins = LAND_TRADE_INCOME_COINS_V7;
        break;
      case "SEA_TRADE_INCOME":
        seaTradeIncomeCoins = 1;
        break;
      case "FIRST_HOSTILE_CAPTURE_SPOILS":
        hostileCaptureSpoilsCoins = 2;
        break;
      case "PLUNDER":
        plunderCoins = unlock.coins;
        break;
      case "NESTING":
        eggHpBonus = unlock.eggHp;
        eggHatchTurnReduction = unlock.hatchTurns;
        nestingCityCapacityBonus = unlock.citySlots;
        break;
      case "WALLBREAKER":
        ignoresCityWalls = true;
        // The Dinosaur pass (7r53): the second tile of a Charge! run-up.
        runUpTiles = RUN_UP_MAXIMUM_TILES_V7;
        break;
      case "PESTILENCE":
        plague = true;
        break;
      case "FORCE_FIELDS":
        shieldsRechargeAtEndTurn = true;
        projectsForceField = true;
        break;
      case "HEAT_SINKS":
        heatSinks = true;
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
      case "DIG_IN":
        digIn = true;
        break;
      case "ASSEMBLE":
        assemble = true;
        break;
      case "DIVE":
        bombDamage = DIVE_BOMB_DAMAGE_V7;
        break;
      case "BLASTING_CHARGES":
        eruptionDamage = BLASTING_ERUPTION_DAMAGE_V7;
        cannonIgnoresFortification = true;
        break;
      case "HOME_SWEET_HOME":
        homeSweetHome = true;
        break;
      case "PEPPERMINT_SURPRISE":
        crumbsBite = PEPPERMINT_DAMAGE_V7;
        break;
      case "RAM":
        ram = true;
        break;
      case "HARBOURS":
        harbourPopulation = unlock.population;
        break;
      case "FREEZE":
        if (unlock.depth === "DEEP") freezeDeep = true;
        else freezeShallow = true;
        break;
      case "ICEBOUND":
        icebound = true;
        break;
      case "BLACK_ICE":
        blackIce = true;
        break;
      case "GLACIER":
        iceTurns = unlock.iceTurns;
        iceCover = true;
        break;
      case "CONFECTIONER_SUPPORT":
      case "ENGINEER_SUPPORT":
      case "WITCH_SUPPORT":
      case "BRAIN_SUPPORT":
      case "CAPTAIN_SUPPORT":
      case "NECROMANCER_SUPPORT":
      case "BERSERK_SUPPORT":
      case "OVERRUN":
      case "CHARGE_BONUS":
      case "NAVAL_TRAINING_DISCOUNT":
        break;
      case "MELEE_FIELD_DEMOLITION":
        breach = true;
        break;
      case "FOREST_COVER":
        forestCover = true;
        break;
      case "FOREST_MARCH":
        forestMarch = true;
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
    breach,
    forestCover,
    forestMarch,
    seaTradeIncomeCoins,
    hostileCaptureSpoilsCoins,
    plunderCoins,
    eggHpBonus,
    eggHatchTurnReduction,
    nestingCityCapacityBonus,
    ignoresCityWalls,
    runUpTiles,
    plague,
    shieldsRechargeAtEndTurn,
    projectsForceField,
    heatSinks,
    raysIgnoreFortification,
    deepWinter,
    shatterThreshold,
    digIn,
    assemble,
    bombDamage,
    eruptionDamage,
    cannonIgnoresFortification,
    homeSweetHome,
    crumbsBite,
    ram,
    boarding: commands.has("BOARD"),
    harbourPopulation,
    // Pack Ice requires Rime, so `DEEP` implies the shallows.
    freezeWater: freezeDeep ? "DEEP" : freezeShallow ? "SHALLOW" : "NONE",
    icebound,
    blackIce,
    iceTurns,
    iceCover,
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
