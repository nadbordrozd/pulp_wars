import { expect } from "vitest";
import {
  applyCommandV7,
  canonicalHash,
  parseEventV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  unitShieldMaximumV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import {
  sameV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "./v7-goblin-arena";
import {
  activeIdV7,
  fieldV7,
  patchTileV7,
  type FieldOptionsV7,
} from "./v7-revision20";

/**
 * Martian rule fixtures (docs/product/RULESET_7_MARTIANS.md) on top of the
 * revision-20 field: a two-seat 11 x 11 board (seat 0 capital (8, 8), seat 1
 * capital (2, 8), villages (5, 5), (8, 5), (5, 8)) whose land outside every
 * territory and site is open Grass. Seat 0 is Martian by default.
 */

export interface MartianPieceV7 extends GoblinPieceV7 {
  /** The unit's current Shield (default: its Shield maximum). */
  readonly shield?: number;
  /**
   * A Cooling entry: `"COOLING"` (fired on its owner's last turn) or
   * `"FIRED"` (fired at full power this turn).
   */
  readonly cooling?: "COOLING" | "FIRED";
  /**
   * The Mind Control revision: the unit (built for its `seat`, its original
   * owner, so it has that seat's kind) is controlled by the Brain standing
   * on this tile: its owner becomes the Brain's owner and its home is
   * cleared.
   */
  readonly controlledBy?: CoordV7;
  /** A Mind Control cooldown entry with this `turnsRemaining`. */
  readonly cooldown?: number;
  readonly kills?: number;
}

export interface MartianFieldOptionsV7 extends FieldOptionsV7 {
  /** Tiles turned into Deep Water. */
  readonly deepWater?: readonly CoordV7[];
}

/**
 * A field with the given pieces. Units of a Martian seat get their Shield
 * (the piece's `shield`, or the maximum), and the pieces' Cooling,
 * control (`mindControlled`), and cooldown entries are added to the side
 * lists.
 */
export function martianFieldV7(
  pieces: readonly MartianPieceV7[],
  options: MartianFieldOptionsV7 = {},
): GameStateV7 {
  const factions: readonly FactionIdV7[] = options.factions ?? [
    "MARTIAN",
    "ORIGINAL",
  ];
  let state = fieldV7(pieces, {
    ...options,
    factions,
    water: [...(options.water ?? []), ...(options.deepWater ?? [])],
  });
  for (const where of options.deepWater ?? [])
    state = patchTileV7(state, where, { terrain: "DEEP_WATER" });
  const unitOf = (piece: MartianPieceV7): UnitStateV7 =>
    unitAtV7(state, piece.at);
  const mindControlled = pieces
    .filter((piece) => piece.controlledBy !== undefined)
    .map((piece) => {
      const unit = unitOf(piece);
      return {
        unitId: unit.id,
        brainUnitId: unitAtV7(state, piece.controlledBy as CoordV7).id,
        originalOwnerId: unit.ownerId,
      };
    })
    .sort((left, right) => left.unitId - right.unitId);
  const controllerOf = new Map(
    pieces
      .filter((piece) => piece.controlledBy !== undefined)
      .map((piece) => [
        unitOf(piece).id,
        unitAtV7(state, piece.controlledBy as CoordV7).ownerId,
      ]),
  );
  const lookup = { players: state.players, mindControlled };
  const shields = pieces
    .flatMap((piece) => {
      const unit = unitOf(piece);
      const maximum = unitShieldMaximumV7(lookup, unit);
      const shield = piece.shield ?? maximum;
      return shield > 0 ? [{ unitId: unit.id, shield }] : [];
    })
    .sort((left, right) => left.unitId - right.unitId);
  return checkedV7({
    ...state,
    units: state.units.map((unit) => {
      const piece = pieces.find((candidate) => sameV7(candidate.at, unit.at));
      const controller = controllerOf.get(unit.id);
      return {
        ...unit,
        ownerId: controller ?? unit.ownerId,
        homeCityId: controller === undefined ? unit.homeCityId : null,
        captureEligible: controller === undefined && unit.captureEligible,
        kills: piece?.kills ?? unit.kills,
      };
    }),
    shields,
    cooling: pieces
      .filter((piece) => piece.cooling !== undefined)
      .map((piece) => ({
        unitId: unitOf(piece).id,
        firedThisTurn: piece.cooling === "FIRED",
      }))
      .sort((left, right) => left.unitId - right.unitId),
    mindControlled,
    mindControlCooldowns: pieces
      .filter((piece) => piece.cooldown !== undefined)
      .map((piece) => ({
        unitId: unitOf(piece).id,
        turnsRemaining: piece.cooldown as number,
      }))
      .sort((left, right) => left.unitId - right.unitId),
  });
}

/** The current Shield of the unit on `where` (0 without an entry). */
export function shieldAtV7(state: GameStateV7, where: CoordV7): number {
  const unit = unitAtV7(state, where);
  return state.shields.find((entry) => entry.unitId === unit.id)?.shield ?? 0;
}

/** Whether a unit stands on `where`. */
export function hasUnitAtV7(state: GameStateV7, where: CoordV7): boolean {
  return state.units.some((unit) => sameV7(unit.at, where));
}

/** The active player's public view. */
export function activeViewV7(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, activeIdV7(state));
}

/** The commands offered to the active player, optionally of some kinds. */
export function offeredV7(
  state: GameStateV7,
  ...kinds: CommandV7["kind"][]
): readonly CommandV7[] {
  const commands = queryPlayerCommandsV7(activeViewV7(state));
  return kinds.length === 0
    ? commands
    : commands.filter((command) => kinds.includes(command.kind));
}

export interface AppliedV7 {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
}

/**
 * Applies `command` for the active player: it must be offered, accepted,
 * deterministic, and every event and the resulting state must round-trip
 * through their schemas.
 */
export function playV7(state: GameStateV7, command: CommandV7): AppliedV7 {
  const actor = activeIdV7(state);
  expect(offeredV7(state), `${command.kind} offered`).toContainEqual(command);
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  const again = applyCommandV7(state, actor, command);
  expect(again.accepted).toBe(true);
  expect(canonicalHash(again.state)).toBe(canonicalHash(result.state));
  return { state: result.state, events: result.events };
}

/**
 * The rejection of `command` for the active player: the command is not
 * offered, the state is unchanged, and the error is returned.
 */
export function rejectedV7(
  state: GameStateV7,
  command: CommandV7,
): { readonly code: string; readonly params: Record<string, unknown> } {
  const result = applyCommandV7(state, activeIdV7(state), command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  expect(result.state).toBe(state);
  expect(offeredV7(state)).not.toContainEqual(command);
  return {
    code: result.error.code,
    params: result.error.params as Record<string, unknown>,
  };
}

/**
 * Every offered command of the given kinds is accepted (section 11): the
 * public query never offers a command the reducer rejects.
 */
export function expectOfferedAcceptedV7(
  state: GameStateV7,
  ...kinds: CommandV7["kind"][]
): readonly CommandV7[] {
  const actor = activeIdV7(state);
  const commands = offeredV7(state, ...kinds);
  for (const command of commands) {
    const result = applyCommandV7(state, actor, command);
    expect(
      result.accepted,
      `${JSON.stringify(command)} ${result.accepted ? "" : result.error.code}`,
    ).toBe(true);
  }
  return commands;
}

/** The player ID of `seat`. */
export const seatV7 = seatIdV7;
