import type { PlayerId } from "../model/ids";
import {
  STAMPEDE_DAMAGE_V7,
  STAMPEDE_RANGE_V7,
  canEnterTerrainV7,
  seatRoleMechanicsV7,
  unitRoleRuleV7,
  type FactionRosterV7,
} from "../rules/ruleset-v7";
import { biteOfV7 } from "./afflictions";
import type { CommandV7 } from "./commands";
import { displacementDestinationLegalV7 } from "./combat";
import { arePlayersHostileV7 } from "./economy";
import type { DomainEventV7, StampedeResultV7 } from "./events";
import {
  fixedSignatureHitV7,
  resolveFixedHitsV7,
  type GiantUnitFactsV7,
  type GiantsReducerKitV7,
} from "./giants";
import { shieldOfV7 } from "./martian";
import { unitSightRadiusAtV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import type { ApplyCommandResultV7 } from "./reducer";
import { noRisingAtV7 } from "./rift";
import { tileAtV7 } from "./spatial-economy";
import type {
  CoordV7,
  GameStateV7,
  TileStateV7,
  UnitActivationV7,
  UnitStateV7,
} from "./types";
import { barricadeAtV7, moundAtV7 } from "./units";

/**
 * Ice Folk Freeze (`pulp_wars-w49.37`, docs/product/RULESET_7_CURRENT.md
 * section 21.18): the Mammoth's Stampede. An unmoved land-form Mammoth
 * charges up to `STAMPEDE_RANGE_V7` tiles in one straight line (orthogonal
 * or diagonal). Each hostile unit in its way takes `STAMPEDE_DAMAGE_V7`
 * fixed damage and is shoved to the first legal side tile (clockwise of the
 * charge first), and the Mammoth goes on; it stops before a unit that is not
 * hostile or cannot be shoved, a settlement center, a mound, a Barricade, a
 * chest, ground it cannot enter, and the board edge. No retaliation; kills
 * are credited to the Mammoth; Sweep and Trample do not apply. The legality
 * helpers read only what the actor knows (explored tiles and visible
 * units), so the public command query and the reducer agree exactly; the
 * stop and the shoves are resolved on the canonical state.
 */

/** A straight charge: the unit step and the number of tiles. */
export interface StampedeLineV7 {
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
  readonly steps: number;
}

/**
 * The straight line from `from` to `to`: orthogonal or diagonal, 1 to
 * `STAMPEDE_RANGE_V7` tiles; null for any other tile.
 */
export function stampedeLineV7(
  from: CoordV7,
  to: CoordV7,
): StampedeLineV7 | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps < 1 || steps > STAMPEDE_RANGE_V7) return null;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  return {
    dx: Math.sign(dx) as -1 | 0 | 1,
    dy: Math.sign(dy) as -1 | 0 | 1,
    steps,
  };
}

/** The tiles of a charge from `from` along `line`, in order. */
export function stampedeTilesV7(
  from: CoordV7,
  line: StampedeLineV7,
): readonly CoordV7[] {
  const tiles: CoordV7[] = [];
  for (let step = 1; step <= line.steps; step += 1)
    tiles.push({ x: from.x + line.dx * step, y: from.y + line.dy * step });
  return tiles;
}

/**
 * The two side tiles of `at` for a charge along `line`, clockwise first:
 * a quarter turn of the charge's step each way (on the screen, where y
 * grows downward).
 */
export function stampedeSideTilesV7(
  at: CoordV7,
  line: Pick<StampedeLineV7, "dx" | "dy">,
): readonly [CoordV7, CoordV7] {
  return [
    { x: at.x - line.dy, y: at.y + line.dx },
    { x: at.x + line.dy, y: at.y - line.dx },
  ];
}

export type StampedeRejectionV7 =
  | { readonly code: "UNIT_ROLE_INVALID" }
  | { readonly code: "UNIT_ALREADY_ACTED" }
  | {
      readonly code: "STAMPEDE_NOT_LEGAL";
      readonly reason: "EMBARKED" | "MOVED";
    };

/**
 * The Stampede legality of the Mammoth itself after the ordinary unit
 * errors: its role has `STAMPEDE`; it is in land form; it has not used a
 * primary action; it has not moved this turn.
 */
export function stampedeActorRejectionV7(
  roster: FactionRosterV7,
  unit: GiantUnitFactsV7 & { readonly activation: UnitActivationV7 },
): StampedeRejectionV7 | null {
  if (!unitRoleRuleV7(roster, unit).abilities.includes("STAMPEDE"))
    return { code: "UNIT_ROLE_INVALID" };
  if (unit.form !== "LAND")
    return { code: "STAMPEDE_NOT_LEGAL", reason: "EMBARKED" };
  if (
    unit.activation.overrunActive ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return { code: "UNIT_ALREADY_ACTED" };
  if (unit.activation.moved)
    return { code: "STAMPEDE_NOT_LEGAL", reason: "MOVED" };
  return null;
}

/**
 * The tile facts the path rule reads, from canonical state or from a
 * player's view (only explored tiles and visible units are known).
 */
export interface StampedeTileFactsV7 {
  /** The tile when the actor has explored it, else undefined. */
  readonly tile: (
    at: CoordV7,
  ) => Pick<TileStateV7, "terrain" | "site"> | undefined;
  readonly ice: (at: CoordV7) => boolean;
  readonly chest: (at: CoordV7) => boolean;
  /** A mound or a Barricade stands on the tile. */
  readonly structure: (at: CoordV7) => boolean;
  /** A unit the actor can see that is not hostile to it is on the tile. */
  readonly friendly: (at: CoordV7) => boolean;
}

/**
 * Whether the path to `at` is open as the actor knows it: a straight line
 * of 1 to 3 tiles, each explored, on the board, not a settlement center,
 * with no chest, mound, Barricade, or visible unit that is not hostile, and
 * ground the Mammoth can enter under the actor's research.
 */
export function stampedePathLegalV7(
  roster: FactionRosterV7,
  facts: StampedeTileFactsV7,
  mammoth: GiantUnitFactsV7,
  researched: readonly string[],
  at: CoordV7,
): boolean {
  const line = stampedeLineV7(mammoth.at, at);
  if (line === null) return false;
  const mechanics = seatRoleMechanicsV7(roster, mammoth.ownerId, mammoth.role);
  for (const step of stampedeTilesV7(mammoth.at, line)) {
    const tile = facts.tile(step);
    if (
      tile === undefined ||
      tile.site !== null ||
      facts.chest(step) ||
      facts.structure(step) ||
      facts.friendly(step) ||
      !canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: mechanics.movementMode,
        afloat: false,
        engineering: researched.includes("ENGINEERING"),
        navigation: researched.includes("NAVIGATION"),
        mountainBorn: mechanics.mountainBorn,
        ice: facts.ice(step),
      })
    )
      return false;
  }
  return true;
}

/** The canonical path facts of the actor `actor`. */
export function canonicalStampedeFactsV7(
  state: GameStateV7,
  actor: PlayerId,
): StampedeTileFactsV7 {
  const player = state.players.find((candidate) => candidate.id === actor);
  const explored = new Set(
    (player?.explored ?? []).map((at) => at.y * state.board.width + at.x),
  );
  return {
    tile: (at) => {
      const tile = tileAtV7(state.board, at);
      return tile === undefined ||
        !explored.has(at.y * state.board.width + at.x)
        ? undefined
        : tile;
    },
    ice: (at) => state.ice.some((entry) => same(entry.at, at)),
    chest: (at) => state.treasureChests.some((chest) => same(chest, at)),
    structure: (at) =>
      moundAtV7(state, at) !== undefined ||
      barricadeAtV7(state, at) !== undefined,
    friendly: (at) =>
      state.units.some(
        (unit) =>
          unit.hp > 0 &&
          same(unit.at, at) &&
          !arePlayersHostileV7(state, actor, unit.ownerId) &&
          isUnitVisibleToPlayerV7(state, actor, unit),
      ),
  };
}

/** The resolved Stampede: the tiles entered, the end tile, the hits. */
export interface StampedePlanV7 {
  readonly path: readonly CoordV7[];
  readonly to: CoordV7;
  readonly results: readonly StampedeResultV7[];
}

/**
 * Resolves the charge of `mammoth` toward `at` (a legal path) on the
 * canonical state. Each unit in the way is met in order: a unit that is
 * not hostile, a mound, a Barricade, or a chest stops the Mammoth before
 * its tile; a hostile unit takes the fixed hit; if it dies (and leaves no
 * rising on its tile) the Mammoth goes on; if it survives it is shoved to
 * the first of the two side tiles that the Push rule allows and the actor
 * has explored (clockwise first) and the Mammoth goes on, or, with no such
 * tile, it stays and the Mammoth stops before it.
 */
export function planStampedeV7(
  state: GameStateV7,
  mammoth: UnitStateV7,
  at: CoordV7,
): StampedePlanV7 {
  const line = stampedeLineV7(mammoth.at, at);
  if (line === null) throw new RangeError("INVALID_STATE");
  const actor = mammoth.ownerId;
  const player = state.players.find((candidate) => candidate.id === actor);
  const explored = new Set(
    (player?.explored ?? []).map((tile) => tile.y * state.board.width + tile.x),
  );
  let units: UnitStateV7[] = [...state.units];
  let position = mammoth.at;
  const path: CoordV7[] = [];
  const results: StampedeResultV7[] = [];
  for (const step of stampedeTilesV7(mammoth.at, line)) {
    if (
      moundAtV7(state, step) !== undefined ||
      barricadeAtV7(state, step) !== undefined ||
      state.treasureChests.some((chest) => same(chest, step))
    )
      break;
    const occupant = units.find(
      (unit) => unit.hp > 0 && unit.id !== mammoth.id && same(unit.at, step),
    );
    if (occupant !== undefined) {
      if (!arePlayersHostileV7(state, actor, occupant.ownerId)) break;
      const hit = fixedSignatureHitV7(
        state,
        occupant,
        shieldOfV7(state.shields, occupant.id),
        STAMPEDE_DAMAGE_V7,
      );
      if (hit.dies) {
        results.push({
          unitId: occupant.id,
          at: { x: step.x, y: step.y },
          damage: hit.damage,
          shieldDamage: hit.shieldDamage,
          dies: true,
          shovedTo: null,
        });
        // A Bitten victim rises on its tile: the Mammoth stops before it.
        if (
          occupant.form === "LAND" &&
          biteOfV7(state, occupant.id) !== undefined &&
          !noRisingAtV7(state.board, occupant.at)
        )
          break;
        units = units.filter((unit) => unit.id !== occupant.id);
      } else {
        const work = { ...state, units } as GameStateV7;
        const side = stampedeSideTilesV7(step, line).find(
          (candidate) =>
            explored.has(candidate.y * state.board.width + candidate.x) &&
            !state.treasureChests.some((chest) => same(chest, candidate)) &&
            displacementDestinationLegalV7(work, occupant, candidate),
        );
        results.push({
          unitId: occupant.id,
          at: { x: step.x, y: step.y },
          damage: hit.damage,
          shieldDamage: hit.shieldDamage,
          dies: false,
          shovedTo: side === undefined ? null : { x: side.x, y: side.y },
        });
        if (side === undefined) break;
        units = units.map((unit) =>
          unit.id === occupant.id ? { ...unit, at: side } : unit,
        );
      }
    }
    position = step;
    path.push({ x: step.x, y: step.y });
    units = units.map((unit) =>
      unit.id === mammoth.id ? { ...unit, at: position } : unit,
    );
  }
  return { path, to: { x: position.x, y: position.y }, results };
}

type StampedeCommandV7 = Extract<CommandV7, { kind: "STAMPEDE" }>;

/** Section 21.18: `STAMPEDE`, a primary action of the unmoved Mammoth. */
export function applyStampedeV7(
  kit: GiantsReducerKitV7,
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: StampedeCommandV7,
): ApplyCommandResultV7 {
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return kit.rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = kit.validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return kit.rejected(original, actorCheck.code, actorCheck.params);
  const mammoth = actorCheck.unit;
  const blocked = stampedeActorRejectionV7(state, mammoth);
  if (blocked !== null)
    return blocked.code === "UNIT_ROLE_INVALID"
      ? kit.rejected(original, "UNIT_ROLE_INVALID", { role: mammoth.role })
      : blocked.code === "UNIT_ALREADY_ACTED"
        ? kit.rejected(original, "UNIT_ALREADY_ACTED", { unitId: mammoth.id })
        : kit.rejected(original, blocked.code, { reason: blocked.reason });
  if (stampedeLineV7(mammoth.at, command.at) === null)
    return kit.rejected(original, "STAMPEDE_NOT_LEGAL", {
      reason: "DIRECTION",
    });
  const player = kit.requirePlayer(state, actor);
  if (
    !stampedePathLegalV7(
      state,
      canonicalStampedeFactsV7(state, actor),
      mammoth,
      player.researchedTechs,
      command.at,
    )
  )
    return kit.rejected(original, "STAMPEDE_NOT_LEGAL", { reason: "BLOCKED" });
  try {
    const plan = planStampedeV7(state, mammoth, command.at);
    const shoved = new Map(
      plan.results
        .filter((entry) => entry.shovedTo !== null)
        .map((entry) => [entry.unitId, entry.shovedTo as CoordV7] as const),
    );
    const charged: UnitStateV7 = {
      ...mammoth,
      at: plan.to,
      captureEligible: false,
      activation: {
        ...mammoth.activation,
        moved: true,
        specialActed: true,
        handled: true,
      },
    };
    const units: UnitStateV7[] = state.units.map((unit) => {
      if (unit.id === mammoth.id) return charged;
      const to = shoved.get(unit.id);
      return to === undefined
        ? unit
        : { ...unit, at: to, captureEligible: false };
    });
    const events: DomainEventV7[] = [
      {
        kind: "MAMMOTH_STAMPEDED",
        playerId: actor,
        unitId: mammoth.id,
        from: { x: mammoth.at.x, y: mammoth.at.y },
        to: plan.to,
        path: plan.path,
        results: plan.results,
      },
    ];
    // Ending on a hostile Field Defense occupies (destroys) it, as a Move
    // does.
    let board = state.board;
    if (plan.path.length > 0) {
      const tile = tileAtV7(board, plan.to) as TileStateV7;
      const territoryOwner =
        tile.territoryCityId === null
          ? undefined
          : state.cities.find((city) => city.id === tile.territoryCityId)
              ?.ownerId;
      if (
        tile.fieldDefense &&
        territoryOwner !== undefined &&
        territoryOwner !== actor &&
        arePlayersHostileV7(state, actor, territoryOwner)
      ) {
        board = kit.replaceTile(state, plan.to, {
          ...tile,
          fieldDefense: false,
        });
        events.push({
          kind: "FIELD_DEFENSE_DESTROYED",
          at: plan.to,
          reason: "OCCUPATION",
        });
      }
    }
    // The Mammoth's sight at its end tile, then each shoved unit's.
    let players = state.players;
    const moved: UnitStateV7[] = [
      charged,
      ...units.filter((unit) => shoved.has(unit.id)),
    ];
    for (const unit of moved) {
      const sightState = { ...state, board, units, players } as GameStateV7;
      const reveal = kit.revealRadius(
        sightState,
        unit.ownerId,
        unit.at,
        unitSightRadiusAtV7(sightState, unit),
      );
      players = kit.setExplored(players, unit.ownerId, reveal.explored);
      if (reveal.revealed.length > 0)
        events.push({
          kind: "TILES_REVEALED",
          playerId: unit.ownerId,
          tiles: reveal.revealed,
        });
    }
    // The hits resolve at once (deaths, risings, blasts, kill credit).
    const hit = resolveFixedHitsV7(
      kit,
      { ...state, board, players, units },
      mammoth.id,
      plan.results.map((entry) => ({
        unitId: entry.unitId,
        at: entry.at,
        damage: entry.damage,
        dies: entry.dies,
        shieldDamage: entry.shieldDamage,
      })),
      "STAMPEDE",
      events,
    );
    const staged = kit.graveActionTail(
      { ...hit, commandIndex: kit.nextSafe(state.commandIndex) },
      actor,
      events,
    );
    return kit.accepted(kit.checked(staged), events);
  } catch (cause) {
    return kit.arithmeticFailure(original, cause);
  }
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
