import { expect } from "vitest";
import {
  applyCommandV7,
  calculateCombatPreviewV7,
  type CombatOptionsV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type CrumbsV7,
  type FactionIdV7,
  type GameStateV7,
  type SugarRushStatusV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { seatIdV7, unitAtV7 } from "./v7-goblin-arena";
import {
  iceFieldV7,
  type IceFieldOptionsV7,
  type IcePieceV7,
} from "./v7-ice-folk";
import { activeIdV7 } from "./v7-revision20";

/**
 * Candy rule fixtures (docs/product/RULESET_7_CANDY.md) on top of the Ice
 * Folk field (so Martian pieces get their Shields and Ice Folk pieces their
 * Chill): a two-seat 11 x 11 board, seat 0 capital (8, 8) with territory
 * x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
 * (5, 5), (8, 5), (5, 8). Every land tile outside a territory and a site is
 * open Grass. Seat 0 is the Candy seat by default, every seat has every
 * technology and 100 Coins, and every tile is explored.
 */

export interface CandyPieceV7 extends IcePieceV7 {
  /** A `sugarRush` entry for the unit. */
  readonly rush?: SugarRushStatusV7["phase"];
  /** The unit is in `splattedThisTurn`. */
  readonly splatted?: boolean;
  /** The unit is in `tossedThisTurn`. */
  readonly tossed?: boolean;
}

export interface CandyFieldOptionsV7 extends IceFieldOptionsV7 {
  readonly factions?: readonly FactionIdV7[];
  /** Crumbs on the board: the owner's seat, the role, and the turns left. */
  readonly crumbs?: readonly {
    readonly at: CoordV7;
    readonly role: UnitRoleIdV7;
    readonly seat?: number;
    readonly turnsLeft?: CrumbsV7["turnsLeft"];
  }[];
}

export function candyFieldV7(
  pieces: readonly CandyPieceV7[],
  options: CandyFieldOptionsV7 = {},
): GameStateV7 {
  const state = iceFieldV7(pieces, {
    ...options,
    factions: options.factions ?? ["CANDY", "ORIGINAL"],
  });
  const ids = (predicate: (piece: CandyPieceV7) => boolean) =>
    pieces
      .filter(predicate)
      .map((piece) => unitAtV7(state, piece.at).id)
      .sort((left, right) => left - right);
  return checkedV7({
    ...state,
    sugarRush: pieces
      .filter((piece) => piece.rush !== undefined)
      .map((piece) => ({
        unitId: unitAtV7(state, piece.at).id,
        phase: piece.rush as SugarRushStatusV7["phase"],
      }))
      .sort((left, right) => left.unitId - right.unitId),
    splattedThisTurn: ids((piece) => piece.splatted === true),
    tossedThisTurn: ids((piece) => piece.tossed === true),
    crumbs: (options.crumbs ?? [])
      .map((entry) => ({
        at: entry.at,
        role: entry.role,
        ownerId: seatIdV7(state, entry.seat ?? 0),
        turnsLeft: entry.turnsLeft ?? 3,
      }))
      .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x),
  });
}

/** The `sugarRush` phase of the unit on `where`, or null. */
export function rushAtV7(
  state: GameStateV7,
  where: CoordV7,
): SugarRushStatusV7["phase"] | null {
  const unit = unitAtV7(state, where);
  return (
    state.sugarRush.find((entry) => entry.unitId === unit.id)?.phase ?? null
  );
}

/** The Crumbs on `where`, or undefined. */
export function crumbsOnV7(
  state: GameStateV7,
  where: CoordV7,
): CrumbsV7 | undefined {
  return state.crumbs.find(
    (entry) => entry.at.x === where.x && entry.at.y === where.y,
  );
}

/** The canonical exchange of the units on `from` and `to`. */
export function exchangeV7(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 {
  return calculateCombatPreviewV7(
    state,
    unitAtV7(state, from).id,
    unitAtV7(state, to).id,
    undefined,
    options,
  );
}

/** "deals / takes" of an exchange, with what a Shield absorbed. */
export function dealsTakesV7(preview: CombatPreviewV7): string {
  const shield =
    preview.defenderShieldDamage > 0
      ? ` +${preview.defenderShieldDamage} sh`
      : "";
  if (preview.defenderDies) return `${preview.damageToDefender}${shield}, kill`;
  return `${preview.damageToDefender}${shield} / ${
    preview.retaliation ? String(preview.damageToAttacker) : "-"
  }`;
}

/** The rejection of `command` for the active player (state unchanged). */
export function candyRefusalV7(
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
