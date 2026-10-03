import {
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  RUN_UP_MAXIMUM_TILES_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  unitGrowsV7,
  unitGrowthStageV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  type EffectiveRoleRuleV7,
  type TechnologyUnlockV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { previewHatchV7 } from "../engine/v7/query";
import type { CoordV7, TechnologyIdV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Revision 19 Normal AI Dinosaur helpers (`pulp_wars-c87.5`).
 *
 * Every function reads only the viewer's public view, public commands, and
 * public previews. Nothing here draws from the PRNG, reads authoritative
 * state, or depends on elapsed time. The policy calls these helpers only in
 * a match with a Dinosaur seat (`dinosaurMatchForPolicyV7`), or through
 * facts that only a Dinosaur-faction unit has (an Egg, `GROW`,
 * `LINEBREAKER`, `ACID`, an armour reduction), so Human, Undead, and Goblin
 * decisions in every other match stay byte-identical.
 *
 * Revision 20 (`pulp_wars-0hi.2`): the Triceratops is a front-line attacker
 * with the passive Charge! (`LINEBREAKER`). Every Stampede lane heuristic is
 * gone; it is judged by its abilities, never by its `SIEGE` label.
 */

/** Field Defense destroyed by a Charge! on the target tile, in strategic units. */
export const CHARGE_FIELD_DEFENSE_VALUE_V7 = 8;
/** A defender pushed off a hostile city center (the Triceratops besieges). */
export const CHARGE_PUSH_CENTER_VALUE_V7 = 20;
/** ...and an own capturer within two tiles can enter next. */
export const CHARGE_CAPTURER_NEAR_VALUE_V7 = 15;
/**
 * A Charge! that pushes the defender off a hostile city center while an own
 * capturer is near (an attack that opens a capture follow-up: 1345).
 */
export const CHARGE_PUSH_CENTER_PRIORITY_V7 = 1345;
/** A non-lethal Charge! that destroys Field Defense goes before other chips. */
export const CHARGE_BREAKER_PRIORITY_V7 = 910;
/**
 * A Move that ends a Triceratops next to a target it can then Charge: above
 * routine moves (700 to 850), below every attack.
 */
export const CHARGE_APPROACH_PRIORITY_V7 = 860;
/**
 * A Move of a Triceratops that already stands next to a target, when the
 * run-up makes the Charge better than attacking from where it stands: just
 * above the attack it replaces (a chip, 900; a kill, 1180).
 */
export const CHARGE_RUN_UP_CHIP_PRIORITY_V7 = 912;
export const CHARGE_RUN_UP_KILL_PRIORITY_V7 = 1181;
/** A Hatch of an unthreatened Egg: just above ordinary land production. */
export const HATCH_PRIORITY_V7 = 1085;
/** A Hatch of an Egg that visible enemies can hit: above threatened training. */
export const HATCH_THREATENED_PRIORITY_V7 = 1262;
/** A Hatch that saves a single turn: only when the Shaman has nothing better. */
export const HATCH_LAST_TURN_PRIORITY_V7 = 640;
/** A Shaman Move next to an Egg it can hatch right after. */
export const HATCH_APPROACH_PRIORITY_V7 = 1084;
/** A Move that puts a guard next to a threatened own Egg. */
export const EGG_GUARD_PRIORITY_V7 = 760;
/** A Move after which the mover destroys a visible hostile Egg. */
export const EGG_SMASH_SETUP_PRIORITY_V7 = 1179;
/** A grown unit leaves visible lethal reach (a kill, 1180, still goes first). */
export const GROWN_RETREAT_PRIORITY_V7 = 1150;
/** Each hatch turn of an Egg laid in a threatened city costs this much. */
export const THREATENED_EGG_DELAY_COST_V7 = 12;
/** Each hatch turn beyond the first costs this much anywhere else. */
export const EGG_DELAY_COST_V7 = 1;
/** A two-slot Egg that takes the last slots of a small city (per extra slot). */
export const EGG_SLOT_FILL_COST_V7 = 4;
/** A city with at most this capacity is small (level 2, or level 1 with Planning). */
export const SMALL_CITY_CAPACITY_V7 = 3;
/** The first Charge! unit (a line-breaker the seat has none of). */
export const FIRST_LINEBREAKER_UNIT_BIAS_V7 = 20;
/** The first Shaman, while a long Egg waits or an army can use War Drums. */
export const SHAMAN_TRAINING_BIAS_V7 = 10;
/** A Shaman (Attack 1, Defense 1) is no defender for a threatened city. */
export const SHAMAN_THREATENED_COST_V7 = 30;
/**
 * Research toward a signature unit (`pulp_wars-c87.8`): above land production
 * (1080) and the best economic plan (1160), below every naval objective.
 */
export const SIGNATURE_RESEARCH_PRIORITY_V7 = 1170;
/** Signature research starts once the seat owns this many cities. */
export const SIGNATURE_RESEARCH_CITIES_V7 = 2;
/**
 * The Dinosaur signature roles, the Triceratops and the T-Rex: a tie between
 * their remaining research chains goes to the first.
 */
export const SIGNATURE_ROLES_V7: readonly ["CATAPULT", "KNIGHT"] =
  Object.freeze(["CATAPULT", "KNIGHT"]);
/**
 * Revision 20: a growth stage fully heals, so a growth kill is worth the HP
 * it restores (the unit's missing HP plus the stage's 4): this much per two
 * HP (10 for a kill at full HP, as before).
 */
export const GROWTH_RESTORED_HP_VALUE2_V7 = 5;
/** Reaching Alpha also adds 1 Attack to every attack. */
export const ALPHA_STAGE_VALUE_V7 = 6;
/** Killing a wounded hostile dinosaur before it can grow: this share (1/n). */
export const WOUNDED_DINOSAUR_KILL_DIVISOR_V7 = 2;
/**
 * Nesting research (revision 20): each owned city gains a unit slot. Valued
 * per owned city; researched ahead of the next role technology (1060),
 * below land production (1080), while an own city has no room for a
 * two-slot Egg.
 */
export const NESTING_SLOT_VALUE_V7 = 4;
/** Nesting's Egg effects (+4 HP, one turn sooner), valued once. */
export const NESTING_EGG_VALUE_V7 = 4;
export const NESTING_RESEARCH_PRIORITY_V7 = 1062;
/**
 * Wallbreaker research (revision 20): worth this much per visible hostile
 * city with Walls, researched like Nesting while one is visible and the
 * seat owns a dinosaur to use it.
 */
export const WALLBREAKER_WALLED_CITY_VALUE_V7 = 8;
export const WALLBREAKER_RESEARCH_PRIORITY_V7 = 1061;
/** A grown unit's extra value per stage (its kills are not for sale). */
export const GROWN_UNIT_PREMIUM_V7 = 10;
/** A hostile Egg is worth this much more per turn it still needs. */
export const EGG_TURN_TARGET_VALUE_V7 = 2;
/** An Acid attack that ignores the target's cover or fortification. */
export const ACID_TARGET_VALUE_V7 = 3;

/** Whether the match has a Dinosaur seat (the gate of every heuristic). */
export function dinosaurMatchForPolicyV7(view: PlayerViewV7): boolean {
  return view.players.some((player) => player.faction === "DINOSAUR");
}

/** The public countdown of a visible Egg, or undefined for any other unit. */
export function eggStatusV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): PlayerViewV7["eggs"][number] | undefined {
  return unit.form === "EGG"
    ? view.eggs.find((entry) => entry.unitId === unit.id)
    : undefined;
}

/** The value of the unit inside an Egg: its cost times four plus its HP. */
export function eggUnitValueV7(view: PlayerViewV7, egg: PublicUnitV7): number {
  const rule = unitRoleRuleV7(view, egg);
  return (rule.cost ?? 0) * 4 + rule.maxHp;
}

/**
 * What an own Egg is worth defending: the unit inside, scaled by how soon it
 * hatches (all of it next turn, two thirds in two turns, half in three).
 */
export function eggProtectionValueV7(
  view: PlayerViewV7,
  egg: PublicUnitV7,
): number {
  const turns = eggStatusV7(view, egg)?.turnsRemaining ?? 1;
  return Math.floor((eggUnitValueV7(view, egg) * 2) / (1 + turns));
}

/** Extra target value of a visible Egg: the turns it still needs. */
export function eggTargetBonusV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  const status = eggStatusV7(view, unit);
  return status === undefined
    ? 0
    : EGG_TURN_TARGET_VALUE_V7 * status.turnsRemaining;
}

/**
 * The growth value of the next kill credited to `unit`: positive only for a
 * growing unit that is one kill from Big or from Alpha. Revision 20: growing
 * fully heals, so the value is the HP restored (the missing HP plus the
 * stage's 4), plus Alpha's Attack. `hp` is the unit's HP when the kill is
 * credited (its current HP by default).
 */
export function growthKillValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  hp: number = unit.hp,
): number {
  if (unitGrowthStageV7(view, unit) === null) return 0;
  const kills = unit.kills + 1;
  const alpha = kills === GROWTH_KILLS_V7[1];
  if (kills !== GROWTH_KILLS_V7[0] && !alpha) return 0;
  const restored = Math.max(0, unit.maxHp - hp) + GROWTH_HP_V7;
  return (
    Math.floor((GROWTH_RESTORED_HP_VALUE2_V7 * restored) / 2) +
    (alpha ? ALPHA_STAGE_VALUE_V7 : 0)
  );
}

/** The growth stage of a unit (0 for a unit that never grows). */
export function growthStageForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): 0 | 1 | 2 {
  return unitGrowthStageV7(view, unit) ?? 0;
}

/** A grown unit's value above an ungrown one of the same role and HP. */
export function grownUnitPremiumV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  return GROWN_UNIT_PREMIUM_V7 * growthStageForPolicyV7(view, unit);
}

/** Whether damage to `unit` is reduced by Armoured (never for an Egg). */
export function armouredForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form !== "EGG" && unitRoleMechanicsV7(view, unit).armourReduction > 0
  );
}

/** Whether `unit` is a land-form unit with Charge! (a Triceratops). */
export function linebreakerV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    unit.hp > 0 &&
    unitRoleRuleV7(view, unit).abilities.includes("LINEBREAKER")
  );
}

/**
 * The tactical role the policy plays a role rule as. Revision 20: a unit
 * with Charge! is a front-line attacker (`LINE`) whatever its registered
 * label (the Triceratops keeps `SIEGE`, which only excludes it from War
 * Drums). The Ice Folk revision (`pulp_wars-7g3.4`, section 12, "judge
 * units by their abilities"): the Mammoth (`SWEEP`, labelled `DEFENDER`) and
 * the Boulder Yeti (`BOULDERS`, labelled `SIEGE`) attack after moving and
 * march with the wave, so they are line units too. Every other rule keeps
 * its label.
 */
export function policyTacticalRoleV7(
  rule: EffectiveRoleRuleV7,
): EffectiveRoleRuleV7["tacticalRole"] {
  return rule.abilities.includes("LINEBREAKER") ||
    rule.abilities.includes("SWEEP") ||
    rule.abilities.includes("BOULDERS")
    ? "LINE"
    : rule.tacticalRole;
}

/** Whether the policy plays `rule` as a siege unit (never a Charge! unit). */
export function policySiegeRuleV7(rule: EffectiveRoleRuleV7): boolean {
  return policyTacticalRoleV7(rule) === "SIEGE";
}

/**
 * The Charge! run-up `attack2` of a unit with `LINEBREAKER` after a Move of
 * `pathLength` tiles (0 for any other unit).
 */
export function chargeRunUpForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  pathLength: number,
): number {
  if (!linebreakerV7(view, unit)) return 0;
  return (
    unitRoleMechanicsV7(view, unit).runUpBonus2 *
    Math.max(0, Math.min(RUN_UP_MAXIMUM_TILES_V7, pathLength))
  );
}

/**
 * Whether the policy treats an attack by `attacker` as ignoring City Walls.
 * An own dinosaur does with the viewer's Wallbreaker. Another seat's
 * research is not public, so a hostile dinosaur is assumed to have it: the
 * policy never relies on Walls against a dinosaur.
 */
export function ignoresWallsForPolicyV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
): boolean {
  if (attacker.form !== "LAND" || !unitGrowsV7(view, attacker)) return false;
  return attacker.ownerId === view.viewer.id
    ? technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
        .ignoresCityWalls
    : true;
}

/** The viewer's technology that grants `kind` under its own tree, if any. */
export function technologyWithUnlockV7(
  view: PlayerViewV7,
  kind: TechnologyUnlockV7["kind"],
): TechnologyIdV7 | null {
  for (const node of factionTreeV7(view.viewer.faction).nodes)
    if (node.unlocks.some((unlock) => unlock.kind === kind)) return node.id;
  return null;
}

type LayEggCommandV7 = Extract<CommandV7, { kind: "LAY_EGG" }>;

/** The safety facts of one nest tile; larger tuples are safer. */
export interface NestTileSafetyV7 {
  /** Projected damage of the visible enemies' next turn to an Egg there. */
  readonly danger: number;
}

/**
 * The one `LAY_EGG` the policy considers for each city and role: the offered
 * nest tile with the least visible hostile reach this turn (`danger`, the
 * policy's projected damage to an Egg there; 0 without it) and next turn
 * (visible hostile units within two Moves plus their range), then the tile
 * farthest (Chebyshev) from every visible hostile unit that is not an Egg,
 * then the one next to more own units, then the first in (y, x) order. With
 * no visible hostile unit it is the first offered tile next to the most own
 * units.
 */
export function chosenLayEggCommandsV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  danger: (at: CoordV7) => number = () => 0,
): ReadonlySet<CommandV7> {
  const chosen = new Map<
    string,
    { readonly command: LayEggCommandV7; readonly safety: readonly number[] }
  >();
  const safetyByKey = new Map<string, readonly number[]>();
  let hostiles: readonly PublicUnitV7[] | null = null;
  let own: readonly PublicUnitV7[] | null = null;
  for (const command of commands) {
    if (command.kind !== "LAY_EGG") continue;
    hostiles ??= view.units.filter(
      (unit) =>
        unit.hp > 0 && unit.form !== "EGG" && hostileV7(view, unit.ownerId),
    );
    own ??= view.units.filter(
      (unit) =>
        unit.hp > 0 && unit.form === "LAND" && unit.ownerId === view.viewer.id,
    );
    const tileKey = `${command.at.y},${command.at.x}`;
    let safety = safetyByKey.get(tileKey);
    if (safety === undefined) {
      let nearest = Number.MAX_SAFE_INTEGER;
      let nextTurn = 0;
      for (const hostile of hostiles) {
        const gap = distanceV7(hostile.at, command.at);
        nearest = Math.min(nearest, gap);
        const rule = unitRoleRuleV7(view, hostile);
        if (
          hostile.form === "LAND" &&
          rule.abilities.includes("ATTACK") &&
          gap <= 2 * rule.move + rule.range
        )
          nextTurn += 1;
      }
      safety = [
        -danger(command.at),
        -nextTurn,
        nearest,
        own.filter((unit) => distanceV7(unit.at, command.at) === 1).length,
        -command.at.y,
        -command.at.x,
      ];
      safetyByKey.set(tileKey, safety);
    }
    const key = `${command.cityId}:${command.role}`;
    const best = chosen.get(key);
    if (best === undefined || compareTupleV7(safety, best.safety) > 0)
      chosen.set(key, { command, safety });
  }
  return new Set([...chosen.values()].map((entry) => entry.command));
}

/** The hatch time of an Egg of `role` laid now (Nesting included). */
export function layEggTurnsV7(
  view: PlayerViewV7,
  role: LayEggCommandV7["role"],
): number {
  const turns = roleMechanicsV7(role, view.viewer.faction).hatchTurns;
  if (turns === null) return 0;
  return Math.max(
    1,
    turns -
      technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
        .eggHatchTurnReduction,
  );
}

/**
 * The land-production value adjustment of a command: an Egg laid in a
 * threatened city defends nothing until it hatches, so each hatch turn
 * counts against it there. Zero for every other command.
 */
export function layEggAdjustmentV7(
  view: PlayerViewV7,
  command: CommandV7,
  threatened: boolean,
): number {
  if (command.kind !== "LAY_EGG" || !threatened) return 0;
  return -THREATENED_EGG_DELAY_COST_V7 * layEggTurnsV7(view, command.role);
}

/** The city facts Dinosaur production reads. */
export interface DinosaurProductionCityV7 {
  /** Capacity minus the slots its homed units and Eggs use. */
  readonly freeSlots: number;
  readonly capacity: number;
  /** A visible enemy can reach the center. */
  readonly threatened: boolean;
}

/**
 * Dinosaur production by need (zero for every other seat): an Egg's hatch
 * delay beyond one turn counts against it, a two-slot Egg is not laid into
 * the last slots of a small city lightly (it clogs it for as long as the
 * unit lives), the first Charge! unit gains a bias, and the first Shaman
 * gains one while an Egg with two or more turns left waits or at least three
 * own units could use War Drums. A Shaman is not trained to defend a
 * threatened city.
 */
export function dinosaurProductionAdjustmentV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "LAY_EGG" }>,
  city: DinosaurProductionCityV7,
): number {
  if (view.viewer.faction !== "DINOSAUR") return 0;
  if (command.kind === "LAY_EGG") {
    const extraSlots =
      roleMechanicsV7(command.role, view.viewer.faction).capacitySlots - 1;
    const clogs =
      city.capacity <= SMALL_CITY_CAPACITY_V7 &&
      city.freeSlots - extraSlots - 1 <= 0;
    const firstLinebreaker =
      effectiveRoleRuleV7(command.role, view.viewer.faction).abilities.includes(
        "LINEBREAKER",
      ) &&
      !view.units.some(
        (unit) =>
          unit.ownerId === view.viewer.id &&
          unitRoleRuleV7(view, unit).abilities.includes("LINEBREAKER"),
      );
    return (
      -EGG_DELAY_COST_V7 * Math.max(0, layEggTurnsV7(view, command.role) - 1) -
      (clogs ? extraSlots * EGG_SLOT_FILL_COST_V7 : 0) +
      (firstLinebreaker ? FIRST_LINEBREAKER_UNIT_BIAS_V7 : 0)
    );
  }
  if (
    !effectiveRoleRuleV7(command.role, view.viewer.faction).abilities.includes(
      "HATCH",
    )
  )
    return 0;
  if (city.threatened) return -SHAMAN_THREATENED_COST_V7;
  let shamans = 0;
  let fighters = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.form !== "LAND") continue;
    const rule = unitRoleRuleV7(view, unit);
    if (rule.abilities.includes("HATCH")) shamans += 1;
    else if (rule.abilities.includes("ATTACK")) fighters += 1;
  }
  if (shamans > 0) return 0;
  const longEgg = view.eggs.some((entry) => {
    const egg = view.units.find((unit) => unit.id === entry.unitId);
    return egg?.ownerId === view.viewer.id && entry.turnsRemaining >= 2;
  });
  return longEgg || fighters >= 3 ? SHAMAN_TRAINING_BIAS_V7 : 0;
}

/**
 * The previewed value of an offered `HATCH`: the unit that appears, the turns
 * it saves, and whether visible enemies can hit the Egg (`threatened`). An
 * unthreatened Egg that hatches next turn anyway is hatched only when the
 * Shaman has nothing better to do.
 */
export function hatchScoreV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "HATCH" }>,
  threatened: boolean,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const preview = previewHatchV7(view, command.unitId, command.eggUnitId);
  if (preview === null) return { priority: -1, strategic: 0, immediate: 0 };
  const rule = effectiveRoleRuleV7(preview.role, view.viewer.faction);
  return {
    priority: threatened
      ? HATCH_THREATENED_PRIORITY_V7
      : preview.turnsSaved >= 2
        ? HATCH_PRIORITY_V7
        : HATCH_LAST_TURN_PRIORITY_V7,
    strategic:
      (rule.cost ?? 0) * 4 +
      rule.maxHp +
      10 * preview.turnsSaved +
      (threatened ? 20 : 0),
    immediate: 0,
  };
}

function hostileV7(view: PlayerViewV7, ownerId: number): boolean {
  if (ownerId === view.viewer.id) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    ownerId === view.humanPlayerId ||
    view.viewer.id === view.humanPlayerId
  );
}

function compareTupleV7(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

const distanceV7 = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
