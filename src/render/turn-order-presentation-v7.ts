import type { PlayerViewV7 } from "../engine/index";

/**
 * Turn order with many players (bead `pulp_wars-ykw.5`,
 * docs/product/RULESET_7_MAP_SCALE.md sections 8.1 and 8.5), read from the
 * public view only.
 */

/**
 * The place of the AI seat whose turn it is among the AI seats still in the
 * game: "(3 of 7)". The count starts with the seat that plays right after
 * the human, so it runs 1, 2, 3… while the player waits, wherever the human
 * sits in the turn order. Null on a human turn, and when a single opponent
 * is left (nothing to count).
 */
export function aiTurnPlaceV7(
  view: Pick<PlayerViewV7, "turnOrder" | "activeSeatIndex" | "players">,
): { readonly index: number; readonly total: number } | null {
  const activeId = view.turnOrder[view.activeSeatIndex];
  const humanIndex = view.turnOrder.findIndex(
    (id) =>
      view.players.find((candidate) => candidate.id === id)?.controller ===
      "HUMAN",
  );
  const waiting = [
    ...view.turnOrder.slice(humanIndex + 1),
    ...view.turnOrder.slice(0, Math.max(0, humanIndex)),
  ];
  const opponents = waiting.filter((id) => {
    const player = view.players.find((candidate) => candidate.id === id);
    return (
      player !== undefined &&
      player.controller === "AI" &&
      (player.status === "ACTIVE" || id === activeId)
    );
  });
  const index = opponents.indexOf(activeId as (typeof opponents)[number]);
  return index < 0 || opponents.length < 2
    ? null
    : { index: index + 1, total: opponents.length };
}

/** The "N players" part of the resume and results summaries. */
export function playerCountLabelV7(
  view: Pick<PlayerViewV7, "players">,
): string {
  return `${view.players.length} players`;
}
