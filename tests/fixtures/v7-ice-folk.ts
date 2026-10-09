import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { sameV7, unitAtV7 } from "./v7-goblin-arena";
import {
  martianFieldV7,
  type MartianFieldOptionsV7,
  type MartianPieceV7,
} from "./v7-martian";
import { activeIdV7 } from "./v7-revision20";

/**
 * Ice Folk rule fixtures (docs/product/RULESET_7_ICE_FOLK.md, and Ice Folk
 * Freeze, RULESET_7_CURRENT.md section 21) on top of the
 * revision-20 field (through the Martian field, so Martian pieces get their
 * Shields): a two-seat 11 x 11 board, seat 0 capital (8, 8) with territory
 * x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
 * (5, 5), (8, 5), (5, 8). Every land tile outside a territory and a site is
 * open Grass. Seat 0 is Ice Folk by default, so its territory is Snow.
 */

export interface IcePieceV7 extends MartianPieceV7 {
  /** A Frozen entry for the unit (Ice Folk Freeze, `pulp_wars-w49.37`). */
  readonly frozen?: { readonly turnsLeft: 1 | 2 };
}

export interface IceFieldOptionsV7 extends MartianFieldOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
}

export function iceFieldV7(
  pieces: readonly IcePieceV7[],
  options: IceFieldOptionsV7 = {},
): GameStateV7 {
  const state = martianFieldV7(pieces, {
    ...options,
    factions: options.factions ?? ["ICE_FOLK", "ORIGINAL"],
  });
  return checkedV7({
    ...state,
    frozen: pieces
      .filter((piece) => piece.frozen !== undefined)
      .map((piece) => ({
        unitId: unitAtV7(state, piece.at).id,
        turnsLeft: piece.frozen?.turnsLeft ?? 1,
      }))
      .sort((left, right) => left.unitId - right.unitId),
  });
}

/** The Frozen entry of the unit on `where`, or undefined. */
export function frozenAtV7(
  state: GameStateV7,
  where: CoordV7,
): GameStateV7["frozen"][number] | undefined {
  const unit = unitAtV7(state, where);
  return state.frozen.find((entry) => entry.unitId === unit.id);
}

/** The Frozen entry of a unit by ID, or undefined. */
export function frozenOfUnitV7(
  state: GameStateV7,
  unit: Pick<UnitStateV7, "id">,
): GameStateV7["frozen"][number] | undefined {
  return state.frozen.find((entry) => entry.unitId === unit.id);
}

/** Sets the Frozen entries of the units on the given tiles. */
export function withFrozenUnitsV7(
  state: GameStateV7,
  entries: readonly {
    readonly at: CoordV7;
    readonly turnsLeft: 1 | 2;
  }[],
): GameStateV7 {
  const ids = new Map(
    entries.map((entry) => [unitAtV7(state, entry.at).id, entry] as const),
  );
  return checkedV7({
    ...state,
    frozen: [
      ...state.frozen.filter((entry) => !ids.has(entry.unitId)),
      ...[...ids].map(([unitId, entry]) => ({
        unitId,
        turnsLeft: entry.turnsLeft,
      })),
    ].sort((left, right) => left.unitId - right.unitId),
  });
}

/** The public Snow flag of a tile in the active player's view. */
export function viewSnowV7(state: GameStateV7, where: CoordV7): boolean {
  const view = viewForV7(state, activeIdV7(state));
  const tile = view.board.tiles.find((candidate) =>
    sameV7(candidate.at, where),
  );
  return tile?.explored === true && tile.snow === true;
}

/** The offered commands of the given kind for the unit on `from`. */
export function offeredForV7(
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
