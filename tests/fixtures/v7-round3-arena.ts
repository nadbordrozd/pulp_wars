import { expect } from "vitest";
import {
  GOLD_CLAIM_TOTAL_V7,
  applyCommandV7,
  parseEventV7,
  type CommandV7,
  type CoordV7,
  type CuriosityV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import {
  round2ArenaV7,
  round2UnitAtV7,
  type Round2ArenaOptionsV7,
} from "./v7-round2-arena";

/**
 * Map curiosities round 3 (`pulp_wars-737.20`,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 13): the hand-built
 * boards of the round-3 tests. The arena is `round2ArenaV7`'s open 20 x 20
 * Dry Land board (player 1's capital at (9, 15), player 2's at (12, 4), the
 * whole board Grass and explored unless the options say otherwise), with
 * the four land curiosities on fixed tiles, each 3 or more from both
 * capitals: the Tesla Tower at (9, 9), the Moon Gun at (4, 10), the Gold
 * Claim at (15, 10), and the Lost Expedition at (4, 4). Only the kinds a
 * test names are placed.
 */
export const at = (x: number, y: number): CoordV7 => ({ x, y });
export const P1 = 1 as PlayerId;
export const P2 = 2 as PlayerId;
export const P3 = 3 as PlayerId;
export const TOWER_V7 = at(9, 9);
export const GUN_V7 = at(4, 10);
export const CLAIM_V7 = at(15, 10);
export const EXPEDITION_V7 = at(4, 4);

export type Round3KindV7 =
  "TESLA_TOWER" | "MOON_GUN" | "GOLD_CLAIM" | "LOST_EXPEDITION";

/** The marker of `kind` on its arena tile, unused. */
export function round3MarkerV7(kind: Round3KindV7): CuriosityV7 {
  switch (kind) {
    case "TESLA_TOWER":
      return { kind, at: TOWER_V7 };
    case "MOON_GUN":
      return { kind, at: GUN_V7, lastFired: null };
    case "GOLD_CLAIM":
      return { kind, at: CLAIM_V7, ownerId: null, left: GOLD_CLAIM_TOTAL_V7 };
    case "LOST_EXPEDITION":
      return { kind, at: EXPEDITION_V7, foundBy: null };
  }
}

export interface Round3ArenaOptionsV7 extends Round2ArenaOptionsV7 {
  /** The round-3 kinds to place unused (on their arena tiles). */
  readonly kinds?: readonly Round3KindV7[];
}

/** The arena with `kinds` placed (and any `curiosities` given as they are). */
export function round3ArenaV7(options: Round3ArenaOptionsV7 = {}): GameStateV7 {
  const { kinds = [], ...rest } = options;
  return round2ArenaV7({
    ...rest,
    curiosities: [...kinds.map(round3MarkerV7), ...(options.curiosities ?? [])],
  });
}

/** The unit standing on `at`. */
export const round3UnitAtV7 = round2UnitAtV7;

/** Applies an accepted command; every event must parse. */
export function applyAcceptedV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const result = applyCommandV7(state, actor, command);
  if (!result.accepted)
    throw new Error(
      `${command.kind} rejected: ${result.error.code} ${JSON.stringify(result.error.params)}`,
    );
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  return result;
}

/** The rule error of a refused command. */
export function rejectionV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): { readonly code: string; readonly params: unknown } {
  const result = applyCommandV7(state, actor, command);
  if (result.accepted) throw new Error(`${command.kind} accepted`);
  return result.error;
}

/** The kinds of `events`, achievements aside. */
export function eventKindsV7(events: readonly DomainEventV7[]): string[] {
  return events
    .map((event) => event.kind)
    .filter((kind) => kind !== "ACHIEVEMENT_UNLOCKED");
}
