import {
  GROWTH_KILLS_V7,
  effectiveRoleRuleV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  unitGrowthStageV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { previewHatchV7 } from "../engine/v7/query";
import {
  STAMPEDE_DIRECTIONS_V7,
  STAMPEDE_DISTANCES_V7,
  stampedeLaneV7,
  viewStampedeFactsV7,
  type StampedeBoardFactsV7,
} from "../engine/v7/stampede";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * Revision 19 Normal AI Dinosaur helpers (`pulp_wars-c87.5`).
 *
 * Every function reads only the viewer's public view, public commands, and
 * public previews (the Stampede lane geometry is the shared public lane rule
 * applied to the view). Nothing here draws from the PRNG, reads
 * authoritative state, or depends on elapsed time. The policy calls these
 * helpers only in a match with a Dinosaur seat (`dinosaurMatchForPolicyV7`),
 * or through facts that only a Dinosaur-faction unit has (an Egg, `GROW`,
 * `STAMPEDE`, `ACID`, an armour reduction), so Human, Undead, and Goblin
 * decisions in every other match stay byte-identical.
 */

/** A Stampede that kills: an ordinary attack kill (1180). */
export const STAMPEDE_KILL_PRIORITY_V7 = 1180;
/** A Stampede that kills a unit threatening an own city (attack: 1280). */
export const STAMPEDE_CITY_SAVE_PRIORITY_V7 = 1280;
/** A Stampede that kills the unit on a hostile city center (attack: 1350). */
export const STAMPEDE_CLEAR_CENTER_PRIORITY_V7 = 1350;
/**
 * A Stampede that pushes the defender off a hostile city center while an own
 * capturer is near (an attack that opens a capture follow-up: 1345).
 */
export const STAMPEDE_PUSH_CENTER_PRIORITY_V7 = 1345;
/**
 * A Stampede that only damages: just above an ordinary chip attack (900), so
 * the hit (no retaliation) softens the target before the other attacks.
 */
export const STAMPEDE_CHIP_PRIORITY_V7 = 905;
/** A chip Stampede that also destroys Field Defense goes first. */
export const STAMPEDE_BREAKER_PRIORITY_V7 = 910;
/** Field Defense destroyed by a Stampede on a tile, in strategic units. */
export const STAMPEDE_FIELD_DEFENSE_VALUE_V7 = 8;
/** A defender pushed off a hostile city center (the Triceratops besieges). */
export const STAMPEDE_PUSH_CENTER_VALUE_V7 = 20;
/** ...and an own capturer within two tiles can enter next. */
export const STAMPEDE_CAPTURER_NEAR_VALUE_V7 = 15;
/**
 * A Move that puts an unmoved Triceratops on an open lane to a target: above
 * routine moves (700 to 850), below every attack.
 */
export const STAMPEDE_LANE_MOVE_PRIORITY_V7 = 860;
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
/** A cheap unit steps into the lane of a Triceratops aimed at an own center. */
export const LANE_BLOCK_PRIORITY_V7 = 1245;
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
/** The first Stampede unit (a siege unit the seat has none of). */
export const FIRST_STAMPEDE_UNIT_BIAS_V7 = 4;
/** The first Shaman, while a long Egg waits or an army can use War Drums. */
export const SHAMAN_TRAINING_BIAS_V7 = 10;
/** A Shaman (Attack 1, Defense 1) is no defender for a threatened city. */
export const SHAMAN_THREATENED_COST_V7 = 30;
/** Reaching Big and Alpha, in strategic units (+4 HP; +4 HP and +1 Attack). */
export const GROWTH_STAGE_VALUE_V7: readonly [number, number] = [10, 16];
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
 * growing unit that is one kill from Big or from Alpha.
 */
export function growthKillValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): number {
  if (unitGrowthStageV7(view, unit) === null) return 0;
  const kills = unit.kills + 1;
  return kills === GROWTH_KILLS_V7[0]
    ? GROWTH_STAGE_VALUE_V7[0]
    : kills === GROWTH_KILLS_V7[1]
      ? GROWTH_STAGE_VALUE_V7[1]
      : 0;
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

/** Whether `unit` is a land-form unit that may Stampede (a Triceratops). */
export function stampederV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    unit.hp > 0 &&
    unitRoleRuleV7(view, unit).abilities.includes("STAMPEDE")
  );
}

function laneFactsV7(
  view: PlayerViewV7,
  ignoredUnitId: number | undefined,
): StampedeBoardFactsV7 {
  const facts = viewStampedeFactsV7(view);
  if (ignoredUnitId === undefined) return facts;
  return {
    ...facts,
    unitAt: (at) => {
      const unit = facts.unitAt(at);
      return unit?.id === ignoredUnitId ? undefined : unit;
    },
  };
}

/**
 * The lane tiles a Triceratops of `ownerId` standing on `from` would run to
 * hit a unit on `to` (1 or 2), or 0 when there is no open lane. A lane of a
 * hostile Triceratops is open as far as the viewer can see (an unexplored
 * lane tile counts as open); the viewer's own lane must be explored. The
 * unit `ignoredUnitId` is treated as absent (the unit being moved).
 */
export function stampedeLaneRunV7(
  view: PlayerViewV7,
  ownerId: PublicUnitV7["ownerId"],
  from: CoordV7,
  to: CoordV7,
  ignoredUnitId?: number,
): 0 | 1 | 2 {
  if (
    to.x < 0 ||
    to.y < 0 ||
    to.x >= view.board.width ||
    to.y >= view.board.height
  )
    return 0;
  const target = view.board.tiles[to.y * view.board.width + to.x];
  // A Stampede target stands on land.
  if (target === undefined || (target.explored && target.biome === null))
    return 0;
  const lane = stampedeLaneV7(
    laneFactsV7(view, ignoredUnitId),
    ownerId,
    from,
    to,
    ownerId !== view.viewer.id,
  );
  return lane.ok ? lane.runTiles : 0;
}

/**
 * Every land tile a visible Triceratops threatens along an open lane from
 * where it stands (distance 2 or 3 in the eight directions).
 */
export function stampedeLaneTilesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CoordV7[] {
  if (!stampederV7(view, unit)) return [];
  const facts = viewStampedeFactsV7(view);
  const tiles: CoordV7[] = [];
  for (const direction of STAMPEDE_DIRECTIONS_V7)
    for (const distance of STAMPEDE_DISTANCES_V7) {
      const at = {
        x: unit.at.x + direction.x * distance,
        y: unit.at.y + direction.y * distance,
      };
      if (
        at.x < 0 ||
        at.y < 0 ||
        at.x >= view.board.width ||
        at.y >= view.board.height
      )
        continue;
      const tile = view.board.tiles[at.y * view.board.width + at.x];
      if (tile === undefined || (tile.explored && tile.biome === null))
        continue;
      if (
        stampedeLaneV7(
          facts,
          unit.ownerId,
          unit.at,
          at,
          unit.ownerId !== view.viewer.id,
        ).ok
      )
        tiles.push(at);
    }
  return tiles;
}

/**
 * The tiles strictly between a Triceratops on `from` and a unit on `to` when
 * that lane is open (a unit of another seat on one of them closes it).
 */
export function stampedeLaneBetweenV7(
  view: PlayerViewV7,
  ownerId: PublicUnitV7["ownerId"],
  from: CoordV7,
  to: CoordV7,
): readonly CoordV7[] {
  const lane = stampedeLaneV7(
    viewStampedeFactsV7(view),
    ownerId,
    from,
    to,
    ownerId !== view.viewer.id,
  );
  return lane.ok ? lane.lane : [];
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
 * unit lives), the first Stampede unit gains a bias, and the first Shaman
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
    const firstStampeder =
      effectiveRoleRuleV7(command.role, view.viewer.faction).abilities.includes(
        "STAMPEDE",
      ) &&
      !view.units.some(
        (unit) =>
          unit.ownerId === view.viewer.id &&
          unitRoleRuleV7(view, unit).abilities.includes("STAMPEDE"),
      );
    return (
      -EGG_DELAY_COST_V7 * Math.max(0, layEggTurnsV7(view, command.role) - 1) -
      (clogs ? extraSlots * EGG_SLOT_FILL_COST_V7 : 0) +
      (firstStampeder ? FIRST_STAMPEDE_UNIT_BIAS_V7 : 0)
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
