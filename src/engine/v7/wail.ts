import type { UnitId } from "../model/ids";
import {
  EGG_DEFENSE2_V7,
  armouredDamageV7,
  coverBonusV7,
  gravesEnabledV7,
  ownerHasForestCoverV7,
  terrainGivesCoverV7,
  roleDefense2AtDistanceV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  unitTakesCoverV7,
  type FactionRosterV7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
} from "../rules/ruleset-v7";
import { isLivingUnitV7 } from "./afflictions";
import { fortificationPartsForUnitV7 } from "./combat";
import { publicUnitIsDugInV7 } from "./dwarf";
import { arePlayersHostileV7 } from "./economy";
import type { CombatSplashEntryV7 } from "./events";
import {
  hiddenBlizzardPossibleV7,
  isSnowV7,
  unitOwnerIsIceFolkV7,
} from "./ice-folk";
import { absorbHitV7, shieldOfV7 } from "./martian";
import { isUnitVisibleToPlayerV7 } from "./observation";
import { tileAtV7 } from "./spatial-economy";
import type { CoordV7, GameStateV7, TerrainIdV7, UnitStateV7 } from "./types";
import { publicUnitHasTerrainCoverV7 } from "./units";
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
  /** HP damage. */
  readonly damage: number;
  readonly dies: boolean;
  /** The Martian revision: what the target's Shield absorbs of the hit. */
  readonly shieldDamage: number;
}

/**
 * One public Wail target. `hiddenBlizzardPossible`: a Witch the viewer
 * cannot see may stand next to this Ice Folk target (section 10.10), and her
 * Blizzard's Snow would give it Snow cover and lower the hit; the numbers
 * are those without that Snow (the Snow the viewer knows of). Set only when
 * that Snow would change them.
 */
export interface PublicWailTargetV7 extends WailTargetV7 {
  readonly hiddenBlizzardPossible: boolean;
}

/**
 * Public Wail preview (section 6.6); it equals the resolution exactly
 * except for a target flagged `hiddenBlizzardPossible`.
 */
export interface WailPreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly attack2: number;
  readonly targets: readonly (PublicWailTargetV7 & {
    readonly leavesGrave: boolean;
    /** Revision 14: the death rises as the biter's Zombie (no Grave). */
    readonly bittenRises: boolean;
    /**
     * The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror. The target
     * survives with HP damage above 0, so it will not strike back until
     * the end of the turn.
     */
    readonly terror: boolean;
  })[];
}

type WailUnitV7 = Pick<
  UnitStateV7,
  "id" | "ownerId" | "role" | "form" | "at" | "hp" | "maxHp"
>;

/**
 * The facts of a Wail target's position that its damage reads: its tile's
 * terrain and Snow, its fortification by source (as
 * `fortificationPartsForUnitV7` splits it: the City Walls levels, and the
 * Field Defense part, in which the Dwarf revision's Dig In is one level),
 * and its Martian Shield. The reducer passes the canonical facts and the
 * public preview the viewer's, into the one {@link wailTargetV7}.
 */
export interface WailTargetFactsV7 {
  readonly terrain: TerrainIdV7 | null | undefined;
  /**
   * Tuning 3 (`pulp_wars-w49.3`): whether the target's owner has the Forest
   * cover (Forestry). The public caller reads it from the target's public
   * stats, since another seat's technologies are private.
   */
  readonly forestCover: boolean;
  readonly snow: boolean;
  readonly walls: number;
  readonly fieldDefense: number;
  readonly shield: number;
}

/**
 * Canonical Wail targets of `banshee`, sorted by (y, x, id): every alive,
 * hostile, living (owner not UNDEAD) unit visible to the Banshee's owner
 * within {@link WAIL_RADIUS_V7}. Land, naval, and embarked units qualify.
 */
export function wailTargetsV7(
  state: GameStateV7,
  banshee: UnitStateV7,
): readonly WailTargetV7[] {
  return sortTargets(
    state.units
      .filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== banshee.id &&
          chebyshev(unit.at, banshee.at) <= WAIL_RADIUS_V7 &&
          arePlayersHostileV7(state, banshee.ownerId, unit.ownerId) &&
          // The Dwarf revision section 2.3: the per-unit living test.
          isLivingUnitV7(state, unit) &&
          isUnitVisibleToPlayerV7(state, banshee.ownerId, unit),
      )
      .map((unit) => {
        const parts = fortificationPartsForUnitV7(state, unit);
        return wailTargetV7(state, banshee, unit, {
          terrain: tileAtV7(state.board, unit.at)?.terrain,
          forestCover: ownerHasForestCoverV7(state, unit.ownerId),
          snow: isSnowV7(state, unit.at),
          walls: parts.walls,
          fieldDefense: parts.fieldDefense,
          shield: shieldOfV7(state.shields, unit.id),
        });
      }),
  );
}

/**
 * Observation-safe Wail targets of an own `banshee` computed from the public
 * view alone, with the reducer's own {@link wailTargetV7}. The view lists
 * exactly the units the viewer can see, and every target must be visible,
 * so the targets are those of {@link wailTargetsV7}. The facts are public:
 * the tile's terrain and level (Walls plus Field Defense, in the target
 * owner's territory), Dig In from the target's public stats, and the Snow
 * the viewer knows of. Only a hidden Witch's Blizzard can make the result
 * differ, which `hiddenBlizzardPossible` flags.
 */
export function publicWailTargetsV7(
  view: PlayerViewV7,
  banshee: PublicUnitV7,
): readonly PublicWailTargetV7[] {
  const targets: PublicWailTargetV7[] = [];
  for (const unit of view.units) {
    if (
      unit.hp <= 0 ||
      unit.id === banshee.id ||
      chebyshev(unit.at, banshee.at) > WAIL_RADIUS_V7 ||
      !arePlayersHostileV7(view, banshee.ownerId, unit.ownerId) ||
      !isLivingUnitV7(view, unit)
    )
      continue;
    const tile = publicTile(view, unit.at);
    if (tile?.explored !== true) continue;
    // The public tile level is Walls plus Field Defense (as in the combat
    // preview). The Dwarf revision section 8: Dig In is one level in the
    // Field Defense part (`max`, never added), counted outside territory too.
    const tileLevel =
      tile.territoryOwnerId === unit.ownerId
        ? (tile.fortificationLevel ?? 0)
        : 0;
    const tileFieldDefense = Math.min(
      tileLevel,
      tile.fieldDefense ? FIELD_DEFENSE_FORTIFICATION_LEVELS_V7 : 0,
    );
    const dugIn = publicUnitIsDugInV7(view, unit.id);
    const facts: WailTargetFactsV7 = {
      terrain: tile.terrain,
      forestCover: publicUnitHasTerrainCoverV7(view, unit.id),
      snow: isSnowV7(view, unit.at),
      walls: tileLevel - tileFieldDefense,
      fieldDefense: Math.max(tileFieldDefense, dugIn ? 1 : 0),
      shield: shieldOfV7(view.shields, unit.id),
    };
    const known = wailTargetV7(view, banshee, unit, facts);
    // Section 10.10: a hidden Witch's Blizzard can only add Snow (never on
    // water or a Rift); the target is flagged when that Snow changes it.
    const withHiddenSnow =
      !facts.snow &&
      tile.biome !== null &&
      tile.terrain !== "RIFT" &&
      hiddenBlizzardPossibleV7(view, unit)
        ? wailTargetV7(view, banshee, unit, { ...facts, snow: true })
        : known;
    targets.push({
      ...known,
      hiddenBlizzardPossible:
        withHiddenSnow.damage !== known.damage ||
        withHiddenSnow.shieldDamage !== known.shieldDamage,
    });
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
    // The Rift (RULESET_7_RIFT.md section 4): no Grave lies on a Rift.
    tile.terrain !== "RIFT" &&
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
    shieldDamage: entry.shieldDamage,
  }));
}

/**
 * The ordinary damage formula (current rules section 13.2) for one Wail
 * target: the attacker's `attack2` at its current HP against the target's
 * defense, cover, and fortification; `min(target.hp, roundHalfUp(...))`.
 * Revision 19: `armour`, when given, reduces the rounded damage before the
 * cap at the target's HP (an Armoured target). The Martian revision:
 * `shield`, when given, raises the cap to the Shield plus the HP; the result
 * is then the whole hit, which the caller splits with `absorbHitV7`.
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
  readonly shield?: number;
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
    input.defenderHp + (input.shield ?? 0),
    input.armour === undefined ? damage : input.armour(damage),
  );
}

/**
 * One Wail target from its position facts, shared by the reducer
 * ({@link wailTargetsV7}) and the public preview
 * ({@link publicWailTargetsV7}): the ordinary damage formula with the
 * Banshee's Attack against the target's Defense, fortification, embarked or
 * Egg Defense, and cover (Forest, Mountain, and the Ice Folk revision's
 * Snow cover, section 6.2: an Ice Folk unit on Snow whose own fortification
 * level is 0). The Martian revision: a walker or flyer has no fortification
 * or cover (section 7.1), and the Shield absorbs the hit first (5.3).
 */
export function wailTargetV7(
  roster: FactionRosterV7,
  banshee: WailUnitV7,
  unit: WailUnitV7,
  facts: WailTargetFactsV7,
): WailTargetV7 {
  const takesCover = unitTakesCoverV7(roster, unit);
  const fortificationLevel = takesCover ? facts.walls + facts.fieldDefense : 0;
  // `pulp_wars-1wy.3`: Snow cover is x 1.25 and yields to the x 1.5 of a
  // Forest or Mountain (the shared `coverBonusV7`).
  const terrainCover =
    takesCover && terrainGivesCoverV7(facts.terrain, facts.forestCover);
  const snowCover =
    takesCover &&
    !terrainCover &&
    unitOwnerIsIceFolkV7(roster, unit) &&
    facts.snow &&
    fortificationLevel === 0;
  const cover = coverBonusV7(terrainCover, snowCover);
  const defenseBonusNumerator = cover.numerator;
  const defenseBonusDenominator = cover.denominator;
  const defense2 = defense2For(
    // Tuning 5 (`pulp_wars-w49.4`): the Human Guard is open to ranged
    // attacks, a Wail from two tiles included.
    roleDefense2AtDistanceV7(
      unitRoleRuleV7(roster, unit),
      unitRoleMechanicsV7(roster, unit),
      chebyshev(banshee.at, unit.at),
    ),
    unit,
    fortificationLevel,
  );
  const hit = wailDamageV7({
    attack2: unitRoleRuleV7(roster, banshee).attack2,
    attackerHp: banshee.hp,
    attackerMaxHp: banshee.maxHp,
    defense2,
    defenderHp: unit.hp,
    defenderMaxHp: unit.maxHp,
    defenseBonusNumerator,
    defenseBonusDenominator,
    armour: (value) => armouredDamageV7(roster, unit, value),
    shield: facts.shield,
  });
  const { shieldDamage, hpDamage: damage } = absorbHitV7(
    facts.shield,
    unit.hp,
    hit,
  );
  return {
    unitId: unit.id,
    at: { x: unit.at.x, y: unit.at.y },
    defense2,
    defenseBonusNumerator,
    defenseBonusDenominator,
    fortificationLevel,
    damage,
    dies: damage >= unit.hp,
    shieldDamage,
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
