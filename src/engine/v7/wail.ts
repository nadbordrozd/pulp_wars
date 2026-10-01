import type { UnitId } from "../model/ids";
import {
  EGG_DEFENSE2_V7,
  armouredDamageV7,
  gravesEnabledV7,
  playerFactionV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { defenseBonusForUnitV7, fortificationLevelForUnitV7 } from "./combat";
import { arePlayersHostileV7 } from "./economy";
import type { CombatSplashEntryV7 } from "./events";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";
import type { PlayerViewV7, PublicUnitV7 } from "./view";

/** Revision 13 section 6.6: Wail reaches every tile within Chebyshev 2. */
export const WAIL_RADIUS_V7 = 2;

/** One Wail target with the exact inputs of its ordinary damage formula. */
export interface WailTargetV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly defense2: number;
  readonly defenseBonusNumerator: number;
  readonly defenseBonusDenominator: number;
  readonly fortificationLevel: number;
  readonly damage: number;
  readonly dies: boolean;
}

/** Public Wail preview (section 6.6); it equals the resolution exactly. */
export interface WailPreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly attack2: number;
  readonly targets: readonly (WailTargetV7 & {
    readonly leavesGrave: boolean;
    /** Revision 14: the death rises as the biter's Zombie (no Grave). */
    readonly bittenRises: boolean;
  })[];
}

type WailUnitV7 = Pick<
  UnitStateV7,
  "id" | "ownerId" | "role" | "form" | "at" | "hp" | "maxHp"
>;

/**
 * Canonical Wail targets of `banshee`, sorted by (y, x, id): every alive,
 * hostile, living (owner not UNDEAD) unit visible to the Banshee's owner
 * within {@link WAIL_RADIUS_V7}. Land, naval, and embarked units qualify.
 */
export function wailTargetsV7(
  state: GameStateV7,
  banshee: UnitStateV7,
): readonly WailTargetV7[] {
  const attack2 = unitRoleRuleV7(state, banshee).attack2;
  return sortTargets(
    state.units
      .filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== banshee.id &&
          chebyshev(unit.at, banshee.at) <= WAIL_RADIUS_V7 &&
          arePlayersHostileV7(state, banshee.ownerId, unit.ownerId) &&
          playerFactionV7(state, unit.ownerId) !== "UNDEAD" &&
          isUnitVisibleToPlayerV7(state, banshee.ownerId, unit),
      )
      .map((unit) => {
        const bonus = defenseBonusForUnitV7(state, unit);
        const fortificationLevel = fortificationLevelForUnitV7(state, unit);
        return target(
          state,
          banshee,
          attack2,
          unit,
          defense2For(
            unitRoleRuleV7(state, unit).defense2,
            unit,
            fortificationLevel,
          ),
          bonus.numerator,
          bonus.denominator,
          fortificationLevel,
        );
      }),
  );
}

/**
 * Observation-safe Wail targets of an own `banshee` computed from the public
 * view alone. The view lists exactly the units the viewer can see, and every
 * target must be visible, so this equals {@link wailTargetsV7}.
 */
export function publicWailTargetsV7(
  view: PlayerViewV7,
  banshee: PublicUnitV7,
): readonly WailTargetV7[] {
  const attack2 = unitRoleRuleV7(view, banshee).attack2;
  const targets: WailTargetV7[] = [];
  for (const unit of view.units) {
    if (
      unit.hp <= 0 ||
      unit.id === banshee.id ||
      chebyshev(unit.at, banshee.at) > WAIL_RADIUS_V7 ||
      !arePlayersHostileV7(view, banshee.ownerId, unit.ownerId) ||
      playerFactionV7(view, unit.ownerId) === "UNDEAD"
    )
      continue;
    const tile = publicTile(view, unit.at);
    if (tile?.explored !== true) continue;
    const fortificationLevel =
      unit.form === "LAND" && tile.territoryOwnerId === unit.ownerId
        ? (tile.fortificationLevel ?? 0)
        : 0;
    const covered =
      unit.form === "LAND" &&
      (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN");
    targets.push(
      target(
        view,
        banshee,
        attack2,
        unit,
        defense2For(
          unitRoleRuleV7(view, unit).defense2,
          unit,
          fortificationLevel,
        ),
        covered ? 3 : 1,
        covered ? 2 : 1,
        fortificationLevel,
      ),
    );
  }
  return sortTargets(targets);
}

/** Whether a Wail death of `unit` would leave a Grave, from public facts. */
export function publicWailLeavesGraveV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "form" | "at">,
): boolean {
  if (!gravesEnabledV7(view.setup) || unit.form !== "LAND") return false;
  const tile = publicTile(view, unit.at);
  return (
    tile?.explored === true &&
    tile.biome !== null &&
    tile.site === null &&
    !view.treasureChests.some((chest) => same(chest, unit.at)) &&
    !view.graves.some((grave) => same(grave, unit.at))
  );
}

/** The `WAIL_RESOLVED` result entries in their canonical order. */
export function wailResultEntriesV7(
  targets: readonly WailTargetV7[],
): readonly CombatSplashEntryV7[] {
  return targets.map((entry) => ({
    unitId: entry.unitId,
    at: { x: entry.at.x, y: entry.at.y },
    damage: entry.damage,
    dies: entry.dies,
  }));
}

/**
 * The ordinary damage formula (current rules section 13.2) for one Wail
 * target: the attacker's `attack2` at its current HP against the target's
 * defense, cover, and fortification; `min(target.hp, roundHalfUp(...))`.
 * Revision 19: `armour`, when given, reduces the rounded damage before the
 * cap at the target's HP (an Armoured target).
 */
export function wailDamageV7(input: {
  readonly attack2: number;
  readonly attackerHp: number;
  readonly attackerMaxHp: number;
  readonly defense2: number;
  readonly defenderHp: number;
  readonly defenderMaxHp: number;
  readonly defenseBonusNumerator: number;
  readonly defenseBonusDenominator: number;
  readonly armour?: (damage: number) => number;
}): number {
  const attackOnCommon =
    BigInt(input.attack2) *
    BigInt(input.attackerHp) *
    (2n * BigInt(input.defenderMaxHp) * BigInt(input.defenseBonusDenominator));
  const defenseOnCommon =
    BigInt(input.defense2) *
    BigInt(input.defenderHp) *
    BigInt(input.defenseBonusNumerator) *
    (2n * BigInt(input.attackerMaxHp));
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) throw new RangeError("INVALID_STATE");
  const numerator = attackOnCommon * BigInt(input.attack2) * 9n;
  const denominator = total * 4n;
  const rounded = (2n * numerator + denominator) / (2n * denominator);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("INTEGER_OVERFLOW");
  const damage = Number(rounded);
  return Math.min(
    input.defenderHp,
    input.armour === undefined ? damage : input.armour(damage),
  );
}

function target(
  roster: FactionRosterV7,
  banshee: WailUnitV7,
  attack2: number,
  unit: WailUnitV7,
  defense2: number,
  defenseBonusNumerator: number,
  defenseBonusDenominator: number,
  fortificationLevel: number,
): WailTargetV7 {
  const damage = wailDamageV7({
    attack2,
    attackerHp: banshee.hp,
    attackerMaxHp: banshee.maxHp,
    defense2,
    defenderHp: unit.hp,
    defenderMaxHp: unit.maxHp,
    defenseBonusNumerator,
    defenseBonusDenominator,
    armour: (value) => armouredDamageV7(roster, unit, value),
  });
  return {
    unitId: unit.id,
    at: { x: unit.at.x, y: unit.at.y },
    defense2,
    defenseBonusNumerator,
    defenseBonusDenominator,
    fortificationLevel,
    damage,
    dies: damage >= unit.hp,
  };
}

/**
 * Defense 1 when embarked and for an Egg (revision 19); otherwise base
 * Defense plus fortification.
 */
function defense2For(
  base2: number,
  unit: Pick<WailUnitV7, "form">,
  fortificationLevel: number,
): number {
  return unit.form === "EMBARKED"
    ? 2
    : unit.form === "EGG"
      ? EGG_DEFENSE2_V7
      : base2 + fortificationLevel * 2;
}

function sortTargets<T extends WailTargetV7>(targets: readonly T[]): T[] {
  return [...targets].sort(
    (left, right) =>
      left.at.y - right.at.y ||
      left.at.x - right.at.x ||
      left.unitId - right.unitId,
  );
}

function publicTile(view: PlayerViewV7, at: CoordV7) {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= view.board.width ||
    at.y >= view.board.height
  )
    return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile !== undefined && same(tile.at, at) ? tile : undefined;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
