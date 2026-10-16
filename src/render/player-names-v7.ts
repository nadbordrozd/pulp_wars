import type { FactionIdV7 } from "../engine/index";
import { tribePluralV7 } from "./tribe-stars-presentation-v7";

/**
 * How the interface names a player (bead pulp_wars-2yc.56): by tribe, never
 * by seat number. Pure text, shared by the leaderboard, the results, the
 * turn banner, toasts, the event log and every faction's presentation.
 *
 * The style, everywhere:
 * - the viewer is "You" ("you", "your");
 * - another seat is its tribe in the plural: bare as a label ("Martians" on
 *   a leaderboard row, a results row, a unit's owner line) and with "the"
 *   in a sentence ("The Martians are playing…", "Aldmere lost to the
 *   Martians", "the Ice Folk's Ice Archer");
 * - only when two or more rival seats play the same tribe does each of them
 *   carry its place among those seats, in seat order: "Martians (1)",
 *   "Martians (2)". The viewer's own seat never counts, since "You" already
 *   tells it apart, so a rival of the viewer's own tribe stays "Martians".
 *
 * The campaign gives its seats no story names, so missions use the same
 * rule.
 */

/** The parts of a player view the names read. */
export interface PlayerNamingViewV7 {
  readonly viewer: { readonly id: number };
  readonly players: readonly {
    readonly id: number;
    readonly seat: number;
    readonly faction: FactionIdV7;
  }[];
}

/**
 * The tribe label of a seat that is not the viewer: "Martians", or
 * "Martians (2)" when several rival seats share the tribe. Undefined for an
 * unknown player. The viewer's own seat gets its tribe label too (a caller
 * that wants "You" asks `playerNameV7`).
 */
export function tribeLabelV7(
  view: PlayerNamingViewV7,
  playerId: number,
): string | undefined {
  const player = view.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) return undefined;
  const plural = tribePluralV7(player.faction);
  if (player.id === view.viewer.id) return plural;
  const namesakes = view.players
    .filter(
      (candidate) =>
        candidate.id !== view.viewer.id && candidate.faction === player.faction,
    )
    .sort((left, right) => left.seat - right.seat);
  if (namesakes.length < 2) return plural;
  return `${plural} (${namesakes.findIndex((entry) => entry.id === player.id) + 1})`;
}

/** A label: "You" for the viewer, otherwise "Martians". */
export function playerNameV7(
  view: PlayerNamingViewV7,
  playerId: number,
  fallback = "An enemy",
): string {
  if (playerId === view.viewer.id) return "You";
  return tribeLabelV7(view, playerId) ?? fallback;
}

/** Mid-sentence: "you" for the viewer, otherwise "the Martians". */
export function playerObjectV7(
  view: PlayerNamingViewV7,
  playerId: number,
  fallback = "an enemy",
): string {
  if (playerId === view.viewer.id) return "you";
  const label = tribeLabelV7(view, playerId);
  return label === undefined ? fallback : `the ${label}`;
}

/** A sentence's start: "You" for the viewer, otherwise "The Martians". */
export function playerSubjectV7(
  view: PlayerNamingViewV7,
  playerId: number,
  fallback = "An enemy",
): string {
  return capitalizedV7(playerObjectV7(view, playerId, fallback));
}

/**
 * Mid-sentence possessive: "your" for the viewer, otherwise "the Martians'"
 * or "the Ice Folk's".
 */
export function playerPossessiveV7(
  view: PlayerNamingViewV7,
  playerId: number,
  fallback = "an enemy's",
): string {
  if (playerId === view.viewer.id) return "your";
  const label = tribeLabelV7(view, playerId);
  return label === undefined ? fallback : `the ${possessiveOfV7(label)}`;
}

/** "Martians'" for a name ending in s, "Ice Folk's" otherwise. */
function possessiveOfV7(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function capitalizedV7(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
