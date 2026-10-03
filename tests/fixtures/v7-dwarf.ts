import { expect } from "vitest";
import {
  applyCommandV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { sameV7, unitAtV7 } from "./v7-goblin-arena";
import {
  iceFieldV7,
  type IceFieldOptionsV7,
  type IcePieceV7,
} from "./v7-ice-folk";
import { activeIdV7 } from "./v7-revision20";

/**
 * Dwarf rule fixtures (docs/product/RULESET_7_DWARVES.md) on top of the Ice
 * Folk field (so Martian pieces get their Shields and Ice Folk pieces their
 * Chill): a two-seat 11 x 11 board, seat 0 capital (8, 8) with territory
 * x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
 * (5, 5), (8, 5), (5, 8). Every land tile outside a territory and a site is
 * open Grass. Seat 0 is the Dwarf seat by default, every seat has every
 * technology and 100 Coins, and every tile is explored.
 */
export function dwarfFieldV7(
  pieces: readonly IcePieceV7[],
  options: IceFieldOptionsV7 = {},
): GameStateV7 {
  return iceFieldV7(pieces, {
    ...options,
    factions: options.factions ?? ["DWARF", "ORIGINAL"],
  });
}

/**
 * Moves the units on the given tiles into the `burrowed` list with the
 * exhausted activation: each `mole` entry is a Mole, each `rider` entry the
 * rider of the Mole on `moleAt`.
 */
export function withBurrowedV7(
  state: GameStateV7,
  entries: readonly {
    readonly at: CoordV7;
    readonly moleAt?: CoordV7;
  }[],
): GameStateV7 {
  const ids = new Map(
    entries.map((entry) => [unitAtV7(state, entry.at).id, entry] as const),
  );
  const burrowed = [...ids].map(([unitId, entry]) => {
    const unit = state.units.find(
      (candidate) => candidate.id === unitId,
    ) as UnitStateV7;
    return {
      unit: { ...unit, captureEligible: false, activation: EXHAUSTED_V7 },
      moleUnitId:
        entry.moleAt === undefined ? null : unitAtV7(state, entry.moleAt).id,
    };
  });
  return checkedV7({
    ...state,
    units: state.units.filter((unit) => !ids.has(unit.id)),
    burrowed: [...state.burrowed, ...burrowed].sort(
      (left, right) => left.unit.id - right.unit.id,
    ),
  });
}

export const EXHAUSTED_V7: UnitStateV7["activation"] = {
  moved: true,
  movedPathLength: 0,
  attacked: true,
  attacksUsed: 1,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

/** The burrowed record whose mound is on `at`. */
export function moundAtTileV7(
  state: GameStateV7,
  at: CoordV7,
): GameStateV7["burrowed"][number] {
  const entry = state.burrowed.find((candidate) =>
    sameV7(candidate.unit.at, at),
  );
  if (entry === undefined) throw new Error(`no mound at ${at.x},${at.y}`);
  return entry;
}

/** The commands of `kind` the active player is offered for the unit on `from`. */
export function offeredOfV7(
  state: GameStateV7,
  from: CoordV7,
  kind: CommandV7["kind"],
): readonly CommandV7[] {
  const unit = unitAtV7(state, from);
  return queryPlayerCommandsV7(viewForV7(state, activeIdV7(state))).filter(
    (command) =>
      command.kind === kind &&
      "unitId" in command &&
      command.unitId === unit.id,
  );
}

/** A TUNNEL command for the units on the given tiles. */
export function tunnelV7(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  rider?: { readonly from: CoordV7; readonly to: CoordV7 },
): Extract<CommandV7, { kind: "TUNNEL" }> {
  return {
    kind: "TUNNEL",
    unitId: unitAtV7(state, from).id,
    to,
    rider:
      rider === undefined
        ? null
        : { unitId: unitAtV7(state, rider.from).id, to: rider.to },
  };
}

/** A BOMB_RUN command for the Gyrocopter on `from`. */
export function bombV7(
  state: GameStateV7,
  from: CoordV7,
  target: CoordV7,
  to: CoordV7,
): Extract<CommandV7, { kind: "BOMB_RUN" }> {
  return {
    kind: "BOMB_RUN",
    unitId: unitAtV7(state, from).id,
    targetUnitId: unitAtV7(state, target).id,
    to,
  };
}

/** The rejection of `command` for the active player (state unchanged). */
export function refusalV7(
  state: GameStateV7,
  command: CommandV7,
): { readonly code: string; readonly params: Record<string, unknown> } {
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  expect(result.state).toBe(state);
  return {
    code: result.error.code,
    params: result.error.params as Record<string, unknown>,
  };
}
