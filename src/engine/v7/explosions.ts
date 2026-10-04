import { allocateUnitId, type PlayerId, type UnitId } from "../model/ids";
import {
  armouredDamageV7,
  unitRoleMechanicsV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { biteOfV7, recordBittenRisingV7 } from "./afflictions";
import type { CombatSplashEntryV7, DomainEventV7 } from "./events";
import { recordCombatDeathV7 } from "./graves";
import { absorbHitV7, releaseControlledV7, withShieldsV7 } from "./martian";
import { exhaustedActivationV7 } from "./plague";
import { riftAtV7 } from "./rift";
import type {
  BittenStatusV7,
  BoardStateV7,
  BurrowedEntryV7,
  CoordV7,
  GameStateV7,
  MindControlledStatusV7,
  ShieldStatusV7,
  UnitRoleIdV7,
  UnitStateV7,
} from "./types";

/**
 * Revision 17 explosions (docs/product/RULESET_7_REVISION_17_GOBLINS.md
 * section 6): Kaboom, death blasts, and chain reactions. One PRNG-free chain
 * resolver serves canonical resolution and the public previews, so a preview
 * computed from fully visible units equals the resolution exactly.
 */

/** `KABOOM` for a Kaboom, `DEATH` for a death blast. */
export type ExplosionCauseV7 = "KABOOM" | "DEATH";

/** The unit facts a chain reads (canonical state units and public units). */
export interface BlastUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly form: UnitStateV7["form"];
  readonly at: CoordV7;
  readonly hp: number;
}

/** One resolved explosion of a chain, in resolution order. */
export interface ExplosionV7 {
  readonly unitId: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  /** The exploding unit's death tile, the center of the blast area. */
  readonly at: CoordV7;
  readonly cause: ExplosionCauseV7;
  /** 1-based chain wave. */
  readonly wave: number;
  /** The fixed blast damage. */
  readonly damage: number;
  /** Every other unit hit, sorted by (y, x, unitId); possibly empty. */
  readonly results: readonly CombatSplashEntryV7[];
  /** Blast-area tiles that lost Field Defense, in (y, x) order. */
  readonly fieldDefenseDestroyed: readonly CoordV7[];
}

/** One death credited to a player (section 6.8). */
export interface CreditedDeathV7 {
  readonly creditedId: PlayerId;
  readonly victimOwnerId: PlayerId;
  /** Map curiosities (section 8.7): the victim, for the Monster bounty. */
  readonly victimUnitId: UnitId;
}

/**
 * The fixed blast damage of `unit` for an explosion of `cause` under its
 * kind (a body rule: a mind-controlled Goblin unit keeps its blasts), or
 * null when it has no such explosion (a Kaboom of a non-goblin-crewed unit,
 * a death blast of a Goblin or Wolf Rider, or any Human or Undead unit).
 */
export function blastDamageV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
  cause: ExplosionCauseV7,
): number | null {
  const mechanics = unitRoleMechanicsV7(roster, unit);
  return cause === "KABOOM"
    ? mechanics.kaboomDamage
    : mechanics.deathBlastDamage;
}

/** An exploding unit (Bomb Chucker, Rocket Cart, Scrap Buggy) death-blasts. */
export function isExplodingUnitV7(
  roster: FactionRosterV7,
  unit: {
    readonly id: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
  },
): boolean {
  return blastDamageV7(roster, unit, "DEATH") !== null;
}

/** The 3 × 3 blast area around `center`, clipped to the board, in (y, x). */
export function blastAreaV7(
  center: CoordV7,
  width: number,
  height: number,
): readonly CoordV7[] {
  const area: CoordV7[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1)
    for (let x = center.x - 1; x <= center.x + 1; x += 1)
      if (x >= 0 && y >= 0 && x < width && y < height) area.push({ x, y });
  return area;
}

export interface ExplosionChainInputV7<U extends BlastUnitV7> {
  readonly roster: FactionRosterV7;
  readonly width: number;
  readonly height: number;
  /** Units on the board when the chain starts (the wave-1 exploders gone). */
  readonly units: readonly U[];
  /** The wave-1 explosions: exploding units already dead, with their cause. */
  readonly initial: readonly {
    readonly unit: U;
    readonly cause: ExplosionCauseV7;
  }[];
  /** Field Defense on a tile before the chain. */
  readonly fieldDefense: (at: CoordV7) => boolean;
  /**
   * Records one explosion death (`UNIT_DIED` cause `EXPLOSION` and its Grave
   * or Bitten rising) and returns the rising left on its tile, if any.
   * Called in results order after the explosion's Field Defense losses.
   */
  readonly onDeath: (victim: U, explosion: ExplosionV7) => U | null;
  /** Called for each explosion before its Field Defense losses and deaths. */
  readonly onExplosion?: (explosion: ExplosionV7) => void;
  /**
   * The explosion-count bound (`EXPLOSION_CHAIN_MAX_EXPLOSIONS_V7`); by
   * default the units on the board at chain start plus the wave-1
   * exploders that just left it.
   */
  readonly maxExplosions?: number | undefined;
  /**
   * The Martian revision section 5.3: the Shields when the chain starts
   * (unit ID to Shield). Blast damage is taken from a Shield first, and a
   * Shield stripped by one explosion is gone for the next.
   */
  readonly shields?: ReadonlyMap<UnitId, number> | undefined;
  /**
   * The Mind Control revision section 4.2: called after each death is
   * recorded with the units on the board; returns the controlled units
   * released by it (they change owner and stay) and the IDs of those
   * removed with it (an eliminated original owner: they leave the board at
   * once and are hit by no later explosion).
   */
  readonly onRelease?:
    | ((
        units: readonly U[],
        victim: U,
      ) => {
        readonly removed: readonly UnitId[];
        readonly released: readonly U[];
      })
    | undefined;
}

export interface ExplosionChainResultV7<U extends BlastUnitV7> {
  readonly units: readonly U[];
  readonly explosions: readonly ExplosionV7[];
  /** The Shields after the chain (only units that still have one). */
  readonly shields: ReadonlyMap<UnitId, number>;
}

/**
 * The revision-17 explosion-count bound of a chain (section 6.5): every unit
 * explodes at most once and a chain never creates an exploding unit, so a
 * chain has at most as many explosions as there were units on the board when
 * it started (counting the wave-1 exploders that just died). Exceeding it is
 * an internal error that rejects the command with `INVALID_STATE`.
 */
export function explosionChainMaxExplosionsV7(
  unitsAtChainStart: number,
  initialExplosions: number,
): number {
  return unitsAtChainStart + initialExplosions;
}

/**
 * Resolves a chain breadth-first by wave (sections 6.4 and 6.5). The
 * explosions of one wave resolve one at a time in ascending unit ID against
 * current HP: each hits every unit still on the board in its 3 × 3 area
 * (never the exploder) for `min(damage, hp)`, all its hits applying together;
 * it then destroys Field Defense on its whole area and records its deaths in
 * results order. Every exploding unit it kills explodes in the next wave.
 */
export function resolveExplosionChainV7<U extends BlastUnitV7>(
  input: ExplosionChainInputV7<U>,
): ExplosionChainResultV7<U> {
  const maximum =
    input.maxExplosions ??
    explosionChainMaxExplosionsV7(input.units.length, input.initial.length);
  const exploded = new Set<UnitId>();
  const destroyed = new Set<string>();
  const explosions: ExplosionV7[] = [];
  const shields = new Map<UnitId, number>(input.shields ?? []);
  let units: U[] = input.units.filter((unit) => unit.hp > 0);
  let wave: { readonly unit: U; readonly cause: ExplosionCauseV7 }[] = [];
  for (const item of [...input.initial].sort(
    (left, right) => left.unit.id - right.unit.id,
  ))
    if (!exploded.has(item.unit.id)) {
      exploded.add(item.unit.id);
      wave.push(item);
    }
  for (let waveNumber = 1; wave.length > 0; waveNumber += 1) {
    const next: { readonly unit: U; readonly cause: ExplosionCauseV7 }[] = [];
    for (const { unit: exploder, cause } of wave) {
      if (explosions.length >= maximum) throw new RangeError("INVALID_STATE");
      const damage = blastDamageV7(input.roster, exploder, cause);
      if (damage === null || damage <= 0) throw new RangeError("INVALID_STATE");
      const hits = units
        .filter(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== exploder.id &&
            chebyshev(unit.at, exploder.at) <= 1,
        )
        .sort(compareUnitsByTile);
      const results: CombatSplashEntryV7[] = hits.map((unit) => {
        // Revision 19: an Armoured unit takes 1 less from the fixed damage.
        // The Martian revision: the blast is taken from the Shield first.
        const hit = absorbHitV7(
          shields.get(unit.id) ?? 0,
          unit.hp,
          armouredDamageV7(input.roster, unit, damage),
        );
        if (hit.shieldDamage > 0)
          shields.set(unit.id, (shields.get(unit.id) ?? 0) - hit.shieldDamage);
        return {
          unitId: unit.id,
          at: { x: unit.at.x, y: unit.at.y },
          damage: hit.hpDamage,
          dies: hit.hpDamage >= unit.hp,
          shieldDamage: hit.shieldDamage,
        };
      });
      const fieldDefenseDestroyed = blastAreaV7(
        exploder.at,
        input.width,
        input.height,
      ).filter((at) => !destroyed.has(key(at)) && input.fieldDefense(at));
      for (const at of fieldDefenseDestroyed) destroyed.add(key(at));
      const explosion: ExplosionV7 = {
        unitId: exploder.id,
        ownerId: exploder.ownerId,
        role: exploder.role,
        at: { x: exploder.at.x, y: exploder.at.y },
        cause,
        wave: waveNumber,
        damage,
        results,
        fieldDefenseDestroyed,
      };
      explosions.push(explosion);
      input.onExplosion?.(explosion);
      const applied = new Map(
        results.map((entry) => [entry.unitId, entry.damage] as const),
      );
      units = units
        .map((unit) =>
          applied.has(unit.id)
            ? ({ ...unit, hp: unit.hp - (applied.get(unit.id) ?? 0) } as U)
            : unit,
        )
        .filter((unit) => unit.hp > 0);
      for (const [index, entry] of results.entries()) {
        if (!entry.dies) continue;
        const victim = hits[index] as U;
        shields.delete(victim.id);
        const rising = input.onDeath(victim, explosion);
        if (rising !== null) units = [...units, rising];
        const release = input.onRelease?.(units, victim);
        if (release !== undefined && release.removed.length > 0) {
          units = units.filter((unit) => !release.removed.includes(unit.id));
          for (const id of release.removed) shields.delete(id);
        }
        if (release !== undefined && release.released.length > 0) {
          const released = new Map(
            release.released.map((unit) => [unit.id, unit] as const),
          );
          units = units.map((unit) => released.get(unit.id) ?? unit);
        }
        if (
          isExplodingUnitV7(input.roster, victim) &&
          !exploded.has(victim.id)
        ) {
          exploded.add(victim.id);
          next.push({ unit: victim, cause: "DEATH" });
        }
      }
    }
    wave = next.sort((left, right) => left.unit.id - right.unit.id);
  }
  for (const [unitId, shield] of [...shields])
    if (shield <= 0) shields.delete(unitId);
  return { units, explosions, shields };
}

/** The working canonical facts a command's chain reads and changes. */
export interface StateChainWorkV7 {
  readonly units: readonly UnitStateV7[];
  readonly board: BoardStateV7;
  readonly graves: readonly CoordV7[];
  readonly nextEntityId: number;
  readonly bitten: readonly BittenStatusV7[];
  /** The Martian revision: the Shields the chain reads. */
  readonly shields: readonly ShieldStatusV7[];
  /**
   * The Mind Control revision: the controlled units and the burrowed list
   * a release may change.
   */
  readonly mindControlled: readonly MindControlledStatusV7[];
  readonly burrowed: readonly BurrowedEntryV7[];
}

export interface StateChainResultV7 extends StateChainWorkV7 {
  /** Zombie risings the chain created, in creation order. */
  readonly risings: readonly UnitStateV7[];
  /** Explosion deaths, each credited to the exploding unit's owner. */
  readonly credits: readonly CreditedDeathV7[];
  readonly explosions: readonly ExplosionV7[];
}

/**
 * Runs a canonical chain on the working facts of a command (or Start Turn)
 * and appends its events (section 6.7): for each explosion
 * `EXPLOSION_RESOLVED`, its `FIELD_DEFENSE_DESTROYED` (reason `EXPLOSION`),
 * then each death's `UNIT_DIED` (cause `EXPLOSION`) followed by its
 * `GRAVE_CREATED` or `BITTEN_UNIT_RISEN`. Explosions never infect or bite.
 * `lookup` supplies the players, setup, and treasure chests; the roster
 * reads the work's `mindControlled` list.
 */
export function resolveStateExplosionChainV7(
  lookup: Pick<GameStateV7, "players" | "setup" | "treasureChests"> &
    Partial<Pick<GameStateV7, "curiosities">>,
  work: StateChainWorkV7,
  initial: readonly {
    readonly unit: UnitStateV7;
    readonly cause: ExplosionCauseV7;
  }[],
  events: DomainEventV7[],
  maxExplosions?: number,
): StateChainResultV7 {
  if (initial.length === 0)
    return { ...work, risings: [], credits: [], explosions: [] };
  let board = work.board;
  let graves = work.graves;
  let nextEntityId = work.nextEntityId;
  let current: readonly UnitStateV7[] = work.units;
  const risings: UnitStateV7[] = [];
  const credits: CreditedDeathV7[] = [];
  let mindControlled = work.mindControlled;
  let burrowed = work.burrowed;
  const tileIndex = (at: CoordV7): number => at.y * board.width + at.x;
  const chain = resolveExplosionChainV7<UnitStateV7>({
    roster: { players: lookup.players, mindControlled: work.mindControlled },
    width: work.board.width,
    height: work.board.height,
    units: work.units,
    initial,
    fieldDefense: (at) => board.tiles[tileIndex(at)]?.fieldDefense === true,
    maxExplosions,
    shields:
      work.shields.length === 0
        ? undefined
        : new Map(work.shields.map((entry) => [entry.unitId, entry.shield])),
    // The Mind Control revision section 4.2: a Brain killed by a blast
    // releases its controlled unit at once (`UNIT_RELEASED`, or `UNIT_DIED`
    // cause `BRAIN_LOST` when its original owner was eliminated).
    onRelease:
      work.mindControlled.length === 0
        ? undefined
        : (units) => {
            const release = releaseControlledV7(
              units,
              burrowed,
              mindControlled,
              lookup.players,
              events,
            );
            mindControlled = release.mindControlled;
            burrowed = release.burrowed;
            const removed = release.removed.map((unit) => unit.id);
            const released = new Map(
              release.released.map((unit) => [unit.id, unit] as const),
            );
            if (removed.length > 0 || released.size > 0)
              current = current
                .filter((unit) => !removed.includes(unit.id))
                .map((unit) => released.get(unit.id) ?? unit);
            return { removed, released: release.released };
          },
    onExplosion: (explosion) => {
      events.push({
        kind: "EXPLOSION_RESOLVED",
        playerId: explosion.ownerId,
        unitId: explosion.unitId,
        role: explosion.role,
        at: explosion.at,
        cause: explosion.cause,
        wave: explosion.wave,
        damage: explosion.damage,
        results: explosion.results,
      });
      if (explosion.fieldDefenseDestroyed.length > 0) {
        const tiles = [...board.tiles];
        for (const at of explosion.fieldDefenseDestroyed) {
          const tile = tiles[tileIndex(at)];
          if (tile === undefined) throw new RangeError("INVALID_STATE");
          tiles[tileIndex(at)] = { ...tile, fieldDefense: false };
          events.push({
            kind: "FIELD_DEFENSE_DESTROYED",
            at: { x: at.x, y: at.y },
            reason: "EXPLOSION",
          });
        }
        board = { ...board, tiles };
      }
      // The chain's unit list after this explosion's hits, for Bitten homing.
      const damage = new Map(
        explosion.results.map((entry) => [entry.unitId, entry.damage]),
      );
      current = current
        .map((unit) =>
          damage.has(unit.id)
            ? { ...unit, hp: unit.hp - (damage.get(unit.id) ?? 0) }
            : unit,
        )
        .filter((unit) => unit.hp > 0 && unit.id !== explosion.unitId);
    },
    onDeath: (victim, explosion) => {
      credits.push({
        creditedId: explosion.ownerId,
        victimOwnerId: victim.ownerId,
        victimUnitId: victim.id,
      });
      const bite = biteOfV7(work, victim.id);
      // The Rift (RULESET_7_RIFT.md section 4): nothing rises on a Rift.
      if (
        bite === undefined ||
        victim.form !== "LAND" ||
        riftAtV7(board, victim.at)
      ) {
        graves = recordCombatDeathV7(
          {
            setup: lookup.setup,
            board,
            treasureChests: lookup.treasureChests,
            players: lookup.players,
            mindControlled,
            // The Candy revision: Crumbs never lie on a curiosity tile.
            curiosities: lookup.curiosities ?? [],
          },
          graves,
          victim,
          "EXPLOSION",
          events,
        );
        return null;
      }
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        { players: lookup.players, units: current },
        bite,
        victim,
        "EXPLOSION",
        allocation.id,
        exhaustedActivationV7(),
        events,
      );
      risings.push(rising);
      current = [...current, rising];
      return rising;
    },
  });
  return {
    units: chain.units,
    board,
    graves,
    nextEntityId,
    bitten: work.bitten,
    shields:
      work.shields.length === 0
        ? work.shields
        : withShieldsV7(
            work.shields,
            new Map(
              work.shields.map((entry) => [
                entry.unitId,
                chain.shields.get(entry.unitId) ?? 0,
              ]),
            ),
          ),
    mindControlled,
    burrowed,
    risings,
    credits,
    explosions: chain.explosions,
  };
}

function compareUnitsByTile(
  left: Pick<BlastUnitV7, "id" | "at">,
  right: Pick<BlastUnitV7, "id" | "at">,
): number {
  return left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id;
}
const key = (at: CoordV7): string => `${at.y},${at.x}`;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
