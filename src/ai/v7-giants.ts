import type { PlayerId, UnitId } from "../engine/model/ids";
import {
  unitFactionV7,
  unitFliesV7,
  unitIsFrozenV7,
  unitMayEnterMountainV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CombatPreviewV7, CombatSplashEntryV7 } from "../engine/v7/events";
import {
  crushBehindTileV7,
  defenderCrushableV7,
  fixedSignatureHitV7,
  giantSignatureV7,
  swallowRejectionV7,
  swallowedByV7,
  tossCandidateTilesV7,
  type GiantSignatureV7,
} from "../engine/v7/giants";
import { canBeFrozenV7 } from "../engine/v7/ice-folk";
import { shieldOfV7 } from "../engine/v7/martian";
import type { CoordV7 } from "../engine/v7/types";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";

/**
 * The giants' signatures, Normal AI (`pulp_wars-w49.31`,
 * docs/product/RULESET_7_GIANTS.md section 9): what a seat does with its
 * own giant's signature, and what every seat reads of a hostile giant's.
 * The rules are in docs/architecture/NORMAL_AI.md ("The giants'
 * signatures"). No match was played for them (the standing rule of no
 * simulations): the numbers are first values, reasoned from the rules, and
 * each rule is shown on a small hand-built state in
 * `tests/unit/ruleset-v7-giants-ai.test.ts`.
 *
 * Every function reads only the viewer's public view and the engine's own
 * public previews and legality helpers. Nothing here draws from the PRNG,
 * reads authoritative state, or depends on elapsed time, and a view with no
 * visible giant that has a signature decides exactly as before
 * (`giantFactsV7` is null).
 */

// --- Use ------------------------------------------------------------------

/** An Abomination below this HP never Swallows (section 9). */
export const SWALLOW_MINIMUM_HP_V7 = 16;
/** A Swallow's value over the victim's: the Zombie it is spat out as. */
export const SWALLOW_ZOMBIE_VALUE_V7 = 12;
/** A Toss needs a kill, or this much hostile damage net of friendly. */
export const TOSS_MINIMUM_NET_DAMAGE_V7 = 8;
/** The landing tiles of one Troll whose Kaboom is previewed exactly. */
export const TOSS_VERIFIED_TILES_V7 = 2;
/** Goblins kept beside a Troll with an enemy near, and a Move's value. */
export const TOSS_ESCORT_GOBLINS_V7 = 2;
export const TOSS_ESCORT_VALUE_V7 = 6;
/** ... while a visible hostile land unit is within this of the Troll. */
export const TOSS_ESCORT_RADIUS_V7 = 5;
/** A hostile Field Defense a Stomp or a Siege Hammer blow smashes. */
export const GIANT_FIELD_DEFENSE_VALUE_V7 = 8;
/**
 * A Colossus that is Cooling (its ray is at half power whatever it does)
 * strides over a screen to a ranged, siege, or support unit: before its
 * own shot from where it stands (the army's breakthrough tier, 1177).
 */
export const OVERSTRIDE_BREAKTHROUGH_VALUE_V7 = 10;
/** Each unit a Frost Giant's Move or its shards newly freeze. */
export const GLACIAL_FREEZE_VALUE_V7 = 6;
/**
 * A Frost Giant's Move whose Cold Aura freezes a unit beside its new tile
 * goes before its own blow (the frozen unit does not strike back): above
 * the committed blows (1174, 1176), below a kill (1180). With a Glacial
 * Smash to follow it has the tier of a Shatter setup (1179).
 */
export const GLACIAL_AURA_MOVE_PRIORITY_V7 = 1177;
/** A Siege Hammer blow that tears down a hostile city's Walls. */
export const SIEGE_HAMMER_WALLS_VALUE_V7 = 30;
/** Each fortification level a Siege Hammer blow ignores. */
export const SIEGE_HAMMER_LEVEL_VALUE_V7 = 3;
/**
 * The blow that razes Walls or smashes a Field Defense goes before the
 * other blows on that unit, which then meet no fortification: above the
 * committed shots and blows (1176, 1174), below a kill (1180).
 */
export const SIEGE_HAMMER_FIRST_PRIORITY_V7 = 1178;
/** A Brass Titan's Move that brings it nearer the nearest walled city. */
export const SIEGE_HAMMER_APPROACH_VALUE_V7 = 6;
/**
 * A Gingerbread Giant Breaks Off only with this much HP (16 are left: the
 * design's 24 for a piece of 8, with the built piece of 10).
 */
export const BREAK_OFF_MINIMUM_HP_V7 = 26;
/** ... and a visible hostile land unit within this many tiles. */
export const BREAK_OFF_FRONT_RADIUS_V7 = 4;
/**
 * Break Off: below every kill (1180) and far below a Re-bake (1265: the
 * two Gingerbread Men put the home city over its limit, so a Re-bake into
 * that city comes first), above the Giant's own blow that does not kill.
 */
export const BREAK_OFF_PRIORITY_V7 = 1175;

// --- Against --------------------------------------------------------------

/** A routine Move is below this; a giant's signature only costs above it. */
export const GIANT_ROUTINE_MOVE_PRIORITY_V7 = 1100;
/**
 * A unit a hostile Abomination would swallow where it stands steps out of
 * its reach: above routine Moves and the half-HP Recover (930), as the
 * step out of a Shatter (935).
 */
export const SWALLOW_ESCAPE_PRIORITY_V7 = 935;
/** A unit behind the garrison of an own center a Juggernaut can shove. */
export const CRUSH_BACKSTOP_VALUE_V7 = 10;

/** The visible land-form giants that have a signature, by side. */
export interface GiantFactsV7 {
  /** The viewer's own, by unit. */
  readonly own: ReadonlyMap<UnitId, GiantSignatureV7>;
  /** Hostile to the viewer. */
  readonly hostile: readonly {
    readonly unit: PublicUnitV7;
    readonly signature: GiantSignatureV7;
  }[];
}

/**
 * The giants of the view, or null when no visible land-form unit has a
 * signature (the gate of every rule here). The neutral Giant Spider has
 * the role and no signature, so it is never listed.
 */
export function giantFactsV7(
  view: PlayerViewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): GiantFactsV7 | null {
  const own = new Map<UnitId, GiantSignatureV7>();
  const hostile: { unit: PublicUnitV7; signature: GiantSignatureV7 }[] = [];
  for (const unit of view.units) {
    if (unit.role !== "JUGGERNAUT" || unit.form !== "LAND" || unit.hp <= 0)
      continue;
    const signature = giantSignatureV7(view, unit);
    if (signature === null) continue;
    if (unit.ownerId === view.viewer.id) own.set(unit.id, signature);
    else if (isHostile(unit.ownerId)) hostile.push({ unit, signature });
  }
  return own.size === 0 && hostile.length === 0 ? null : { own, hostile };
}

function chebyshev(left: CoordV7, right: CoordV7): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function same(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

function publicTileV7(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["board"]["tiles"][number] | undefined {
  if (at.x < 0 || at.y < 0 || at.x >= view.board.width) return undefined;
  const indexed = view.board.tiles[at.y * view.board.width + at.x];
  if (indexed !== undefined && same(indexed.at, at)) return indexed;
  return view.board.tiles.find((candidate) => same(candidate.at, at));
}

/** A ground unit or an Egg: what a Stomp, a trample, and a crush hit. */
export function giantGroundTargetV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    (unit.form === "LAND" || unit.form === "EGG") && !unitFliesV7(view, unit)
  );
}

// --- Crushing Shove -------------------------------------------------------

/** What the crush of a previewed attack does (section 6.1). */
export interface CrushOutcomeV7 {
  /** The HP the crush takes from the target, and whether it dies of it. */
  readonly damage: number;
  readonly dies: boolean;
  /** The hostile unit behind the target that the collision hits, if any. */
  readonly blocker: {
    readonly unit: PublicUnitV7;
    readonly damage: number;
    readonly dies: boolean;
  } | null;
}

/**
 * The crush of an own attack as its public preview has it: `crushDamage`
 * on the target after the exchange (it dies when that is all it has left)
 * and `collisionDamage` on the hostile unit standing on the tile behind
 * it. Null when the preview has no crush (`crush` is `NONE`), and when it
 * does not know the tile behind and the target would be pushed onto it.
 */
export function crushOutcomeV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  isHostile: (ownerId: PlayerId) => boolean,
): CrushOutcomeV7 | null {
  if (preview.crush === "NONE" || preview.defenderDies) return null;
  const left = target.hp - preview.damageToDefender + preview.defenderHeal;
  const behind = crushBehindTileV7(attacker.at, target.at);
  // The Push preview is `UNKNOWN_BEHIND_FOG` whenever no own unit detects
  // the tile behind, whatever stands there. The view still lists every
  // unit on an explored tile, so a collision in the preview proves a unit
  // there; without one the tile is read as the Push conditions read it.
  if (
    preview.crush === "UNKNOWN_BEHIND_FOG" &&
    preview.collisionDamage <= 0 &&
    !pushBlockedForPolicyV7(view, target, behind, null, null)
  )
    return null;
  const blocker =
    preview.collisionDamage <= 0
      ? undefined
      : view.units.find(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== target.id &&
            unit.id !== attacker.id &&
            same(unit.at, behind) &&
            isHostile(unit.ownerId),
        );
  return {
    damage: preview.crushDamage,
    dies: preview.crushDamage > 0 && preview.crushDamage >= left,
    blocker:
      blocker === undefined
        ? null
        : {
            unit: blocker,
            damage: preview.collisionDamage,
            dies: preview.collisionDamage >= blocker.hp,
          },
  };
}

/**
 * Whether a land unit pushed from `from` onto `behind` would not move, as
 * far as the viewer can tell (a public estimate of the Push conditions for
 * a threat, not the exact rule: an own attack reads the engine's preview):
 * off the board, unexplored, a settlement site, water, a Rift, a Mountain
 * the unit may not enter, a chest, or a tile that holds a unit or a mound.
 * `vacatedBy` is a unit counted as gone from where it stands (the mover).
 */
export function pushBlockedForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  behind: CoordV7,
  vacatedBy: UnitId | null,
  movedTo: CoordV7 | null,
): boolean {
  const tile = publicTileV7(view, behind);
  if (tile === undefined || !tile.explored) return true;
  if (tile.site !== null || tile.biome === null || tile.terrain === "RIFT")
    return true;
  if (
    tile.terrain === "MOUNTAIN" &&
    !unitMayEnterMountainV7(
      view,
      unit,
      unit.ownerId === view.viewer.id &&
        view.viewer.researchedTechs.includes("ENGINEERING"),
      "GROUND",
    )
  )
    return true;
  if (view.treasureChests.some((chest) => same(chest, behind))) return true;
  if (view.burrowed.some((entry) => same(entry.unit.at, behind))) return true;
  if (movedTo !== null && same(movedTo, behind)) return true;
  return view.units.some(
    (other) =>
      other.hp > 0 &&
      other.id !== unit.id &&
      other.id !== vacatedBy &&
      same(other.at, behind),
  );
}

/**
 * The tiles a hostile Juggernaut can strike from next turn: where it
 * stands, and the free land tiles around it (a public estimate: Move 1, no
 * terrain or zone of control).
 */
export function crushStrikeTilesV7(
  view: PlayerViewV7,
  giant: PublicUnitV7,
  vacatedBy: UnitId | null,
  movedTo: CoordV7 | null,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [giant.at];
  if (unitIsFrozenV7(view, giant)) return [];
  for (let y = giant.at.y - 1; y <= giant.at.y + 1; y += 1)
    for (let x = giant.at.x - 1; x <= giant.at.x + 1; x += 1) {
      const at = { x, y };
      if (same(at, giant.at)) continue;
      const tile = publicTileV7(view, at);
      if (
        tile === undefined ||
        !tile.explored ||
        tile.biome === null ||
        tile.terrain === "RIFT"
      )
        continue;
      if (movedTo !== null && same(movedTo, at)) continue;
      if (
        view.units.some(
          (other) =>
            other.hp > 0 && other.id !== vacatedBy && same(other.at, at),
        )
      )
        continue;
      tiles.push(at);
    }
  return tiles;
}

/**
 * The fixed crush a visible hostile Juggernaut would add to its blow on
 * `actor` standing at `at`: the worst over its strike tiles, when the tile
 * behind `actor` is blocked there (it is crushed instead of pushed). 0 for
 * a unit that is never crushed, and with no Juggernaut near.
 */
export function crushDangerV7(
  view: PlayerViewV7,
  facts: GiantFactsV7,
  actor: PublicUnitV7,
  at: CoordV7,
): number {
  if (actor.form !== "LAND") return 0;
  let worst = 0;
  for (const { unit: giant, signature } of facts.hostile) {
    if (signature !== "CRUSH" || chebyshev(giant.at, at) > 2) continue;
    if (!defenderCrushableV7(view, { ...actor, at })) continue;
    const damage = unitRoleMechanicsV7(view, giant).crushDamage;
    if (damage <= 0) continue;
    for (const from of crushStrikeTilesV7(view, giant, actor.id, at)) {
      if (chebyshev(from, at) !== 1) continue;
      const behind = crushBehindTileV7(from, at);
      if (!pushBlockedForPolicyV7(view, actor, behind, actor.id, null))
        continue;
      worst = Math.max(
        worst,
        fixedSignatureHitV7(
          view,
          { ...actor, at },
          shieldOfV7(view.shields, actor.id),
          damage,
        ).damage,
      );
    }
  }
  return worst;
}

/** One own or allied unit a Move would line up for a Crushing Shove. */
export interface CrushColumnHitV7 {
  readonly unit: PublicUnitV7;
  readonly damage: number;
  readonly dies: boolean;
}

/**
 * The column a Move of `actor` to `to` makes in front of a visible hostile
 * Juggernaut (section 9, "do not stand in two rows in front of a
 * Juggernaut"): the other own and allied units the Move lines up for the
 * collision. Two shapes:
 *
 * - `actor` behind `front` (the Juggernaut strikes `front` from the far
 *   side): `front` is no longer pushed but crushed, and `actor` takes the
 *   collision. Both hits are listed.
 * - `actor` in front of `back`: the collision on `back` is listed (the
 *   crush on `actor` itself is in its own danger, `crushDangerV7`).
 *
 * `backstop` is true when `front` stands on a settlement center of its own
 * side: there the unit behind it keeps the garrison on the center, which a
 * Push would empty (the hits are still listed).
 */
export function crushColumnV7(
  view: PlayerViewV7,
  facts: GiantFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  friendly: (ownerId: PlayerId) => boolean,
  ownCenter: (at: CoordV7, ownerId: PlayerId) => boolean,
): { readonly hits: readonly CrushColumnHitV7[]; readonly backstop: boolean } {
  const hits = new Map<UnitId, CrushColumnHitV7>();
  let backstop = false;
  const add = (unit: PublicUnitV7, at: CoordV7, damage: number): void => {
    const hit = fixedSignatureHitV7(
      view,
      { ...unit, at },
      shieldOfV7(view.shields, unit.id),
      damage,
    );
    const prior = hits.get(unit.id);
    if (hit.damage > 0 && (prior === undefined || hit.damage > prior.damage))
      hits.set(unit.id, { unit, damage: hit.damage, dies: hit.dies });
  };
  for (const { unit: giant, signature } of facts.hostile) {
    if (signature !== "CRUSH" || chebyshev(giant.at, to) > 3) continue;
    const damage = unitRoleMechanicsV7(view, giant).crushDamage;
    if (damage <= 0) continue;
    const strikes = crushStrikeTilesV7(view, giant, actor.id, to);
    for (const other of view.units) {
      if (
        other.id === actor.id ||
        other.hp <= 0 ||
        other.form !== "LAND" ||
        !friendly(other.ownerId) ||
        chebyshev(other.at, to) !== 1
      )
        continue;
      // `actor` behind `other`: the strike comes from the far side.
      const far = crushBehindTileV7(to, other.at);
      if (
        strikes.some((from) => same(from, far)) &&
        defenderCrushableV7(view, other) &&
        // It was pushed before the Move: the tile was free and enterable.
        !pushBlockedForPolicyV7(view, other, to, actor.id, null)
      ) {
        add(other, other.at, damage);
        add(actor, to, damage);
        if (ownCenter(other.at, other.ownerId)) backstop = true;
      }
      // `actor` in front of `other`: the strike comes from beyond `actor`.
      const near = crushBehindTileV7(other.at, to);
      if (
        strikes.some((from) => same(from, near)) &&
        defenderCrushableV7(view, { ...actor, at: to })
      )
        add(other, other.at, damage);
    }
  }
  return { hits: [...hits.values()], backstop };
}

// --- Swallow --------------------------------------------------------------

/**
 * Whether a visible hostile Abomination that holds no victim could swallow
 * `actor` standing at `at` on its next turn: the engine's own Swallow
 * legality (`swallowRejectionV7`: one slot, no giant, construct, Rock Hard,
 * icebound, or mind-controlled unit, at most its HP limit) for the
 * Abomination fresh on a tile beside `at`, when `reaches` says it can get
 * there. A Frozen Abomination swallows nothing.
 */
export function swallowDangerV7(
  view: PlayerViewV7,
  facts: GiantFactsV7,
  actor: PublicUnitV7,
  at: CoordV7,
  reaches: (giant: PublicUnitV7) => boolean,
): boolean {
  if (actor.form !== "LAND") return false;
  for (const { unit: giant, signature } of facts.hostile) {
    if (signature !== "SWALLOW" || unitIsFrozenV7(view, giant)) continue;
    if (swallowedByV7(view.giants.swallowed, giant.id) !== undefined) continue;
    if (chebyshev(giant.at, at) !== 1 && !reaches(giant)) continue;
    const rejection = swallowRejectionV7(
      view,
      view.giants.swallowed,
      {
        ...giant,
        // Beside `at` after its Move, with its turn's activation.
        at: { x: at.x + 1, y: at.y },
        activation: {
          ...giant.activation,
          moved: false,
          movedPathLength: 0,
          attacked: false,
          attacksUsed: 0,
          overrunActive: false,
          recovered: false,
          captured: false,
          handled: false,
          specialActed: false,
        },
      },
      { ...actor, at },
    );
    if (rejection === null) return true;
  }
  return false;
}

// --- Thunder Stomp --------------------------------------------------------

/**
 * What a Move of `actor` to `to` adds to the Stomp of a visible hostile
 * Brontosaurus (section 9, "do not crowd it"): the fixed hit on `actor`
 * for each one beside `to` that already has another own or allied ground
 * unit beside it, and that `actor` does not stand beside now. (One unit
 * beside it is attacked, not stomped; the second makes the Stomp the
 * better action, and every unit there is hit.)
 */
export function stompCrowdV7(
  view: PlayerViewV7,
  facts: GiantFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  friendly: (ownerId: PlayerId) => boolean,
): readonly CombatSplashEntryV7[] {
  if (!giantGroundTargetV7(view, actor)) return [];
  const hits: CombatSplashEntryV7[] = [];
  for (const { unit: giant, signature } of facts.hostile) {
    if (
      signature !== "STOMP" ||
      chebyshev(giant.at, to) !== 1 ||
      chebyshev(giant.at, actor.at) === 1 ||
      unitIsFrozenV7(view, giant)
    )
      continue;
    const damage = unitRoleMechanicsV7(view, giant).stompDamage;
    if (damage <= 0) continue;
    const crowded = view.units.some(
      (other) =>
        other.id !== actor.id &&
        other.hp > 0 &&
        friendly(other.ownerId) &&
        chebyshev(other.at, giant.at) === 1 &&
        giantGroundTargetV7(view, other),
    );
    if (!crowded) continue;
    hits.push(
      fixedSignatureHitV7(
        view,
        { ...actor, at: to },
        shieldOfV7(view.shields, actor.id),
        damage,
      ),
    );
  }
  return hits;
}

// --- Goblin Toss ----------------------------------------------------------

/** A Goblin a Troll can throw: the Goblin kind's `FIGHTER`, in land form. */
export function tossPassengerKindV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    unit.form === "LAND" &&
    unit.role === "FIGHTER" &&
    unit.hp > 0 &&
    unitFactionV7(view, unit) === "GOBLIN"
  );
}

/**
 * A Goblin thrown this turn and not yet used: `moved` with no path walked
 * (a Toss sets the flag and keeps everything else; an ordinary Move
 * records its path). A Goblin that walked before it was thrown is not
 * told apart from one that only walked.
 */
export function tossedGoblinV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    tossPassengerKindV7(view, unit) &&
    unit.activation.moved &&
    unit.activation.movedPathLength === 0 &&
    !unit.activation.attacked &&
    !unit.activation.specialActed &&
    !unit.activation.recovered &&
    !unit.activation.captured
  );
}

/**
 * The tiles a visible hostile Goblin could be thrown onto next turn
 * (section 9, against the Troll): the landing tiles (2 to the Toss range
 * from the Troll, known land, no settlement site, free) of every Troll of
 * its seat that it stands beside or can walk beside (`reach` tiles, a
 * Chebyshev estimate). Empty for every other unit and without such a
 * Troll. A Frozen Troll throws nothing, a Frozen Goblin is not thrown.
 */
export function hostileTossLandingsV7(
  view: PlayerViewV7,
  goblin: PublicUnitV7,
  reach: number,
  occupied: (at: CoordV7) => boolean,
): readonly CoordV7[] {
  if (!tossPassengerKindV7(view, goblin) || unitIsFrozenV7(view, goblin))
    return [];
  const landings = new Map<string, CoordV7>();
  for (const troll of view.units) {
    if (
      troll.ownerId !== goblin.ownerId ||
      troll.role !== "JUGGERNAUT" ||
      troll.form !== "LAND" ||
      troll.hp <= 0 ||
      chebyshev(troll.at, goblin.at) > reach + 1 ||
      !unitRoleRuleV7(view, troll).abilities.includes("TOSS") ||
      unitIsFrozenV7(view, troll)
    )
      continue;
    for (const at of tossCandidateTilesV7(
      view.board.width,
      view.board.height,
      troll.at,
      unitRoleMechanicsV7(view, troll).tossRange,
    )) {
      const tile = publicTileV7(view, at);
      if (
        tile === undefined ||
        !tile.explored ||
        tile.biome === null ||
        tile.site !== null ||
        tile.terrain === "RIFT" ||
        occupied(at)
      )
        continue;
      landings.set(`${at.x},${at.y}`, at);
    }
  }
  return [...landings.values()];
}

// --- Glacial Smash --------------------------------------------------------

/**
 * Whether a visible hostile Frost Giant kills `actor` at `at` with a
 * Glacial Smash next turn (section 9, "do not end a turn next to a Frost
 * Giant with a unit its smash would kill"): the visible enemies' damage
 * `total` (the Giant's own blow among it) leaves the unit alive at the
 * Giant's threshold or below, the Giant can come beside it (`reaches`; its
 * Cold Aura freezes the units around the tile its Move ends on), and the
 * unit can be Frozen and shattered (land form, no giant). A Frozen Giant
 * does nothing.
 */
export function glacialSmashLethalV7(
  view: PlayerViewV7,
  facts: GiantFactsV7,
  actor: PublicUnitV7,
  at: CoordV7,
  total: number,
  reaches: (giant: PublicUnitV7) => boolean,
): boolean {
  if (
    total <= 0 ||
    total >= actor.hp ||
    actor.form !== "LAND" ||
    actor.role === "JUGGERNAUT"
  )
    return false;
  const left = actor.hp - total;
  for (const { unit: giant, signature } of facts.hostile) {
    if (signature !== "GLACIAL_SMASH" || unitIsFrozenV7(view, giant)) continue;
    if (left > unitRoleMechanicsV7(view, giant).glacialSmashHp) continue;
    if (!canBeFrozenV7(view, giant.ownerId, actor)) continue;
    if (chebyshev(giant.at, at) === 1 || reaches(giant)) return true;
  }
  return false;
}

/**
 * The units the shards of an own Frost Giant's shattering blow on `target`
 * newly freeze (section 6.6): every other unit around the shattered unit's
 * tile that the Giant's owner can freeze and that is not Frozen yet.
 */
export function glacialShardsV7(
  view: PlayerViewV7,
  giant: PublicUnitV7,
  target: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units.filter(
    (unit) =>
      unit.id !== target.id &&
      unit.id !== giant.id &&
      chebyshev(unit.at, target.at) === 1 &&
      canBeFrozenV7(view, giant.ownerId, unit) &&
      !unitIsFrozenV7(view, unit),
  );
}

/**
 * The units the Cold Aura of an own Frost Giant freezes when its Move ends
 * on `to` (current rules section 21.12): every unit around `to` that its
 * owner can freeze. `fresh` are those not Frozen yet.
 */
export function coldAuraTargetsV7(
  view: PlayerViewV7,
  giant: PublicUnitV7,
  to: CoordV7,
): {
  readonly all: readonly PublicUnitV7[];
  readonly fresh: readonly PublicUnitV7[];
} {
  const all = view.units.filter(
    (unit) =>
      unit.id !== giant.id &&
      chebyshev(unit.at, to) === 1 &&
      canBeFrozenV7(view, giant.ownerId, unit),
  );
  return { all, fresh: all.filter((unit) => !unitIsFrozenV7(view, unit)) };
}
