/**
 * Disabled dock actions (bead pulp_wars-2yc.108; docs/ui/STYLE.md
 * "Unavailable but explained"). A greyed action with its reason teaches the
 * player only when the reason can change: no target in range, not enough
 * Coins, already acted, a technology the player can research. An action
 * that the faction or the unit's kind can never take ("Martians cannot
 * build Field Defense", "Clockwork never recovers by itself") is not shown
 * at all; the unit card's "?" details still say what the kind cannot do.
 *
 * The reason is read from a button's `data-disabled-reason`, which is
 * either a short key ("goblin-field-defense") or the reason's own words.
 */

export type DisabledReasonPermanenceV7 = "PERMANENT" | "SITUATIONAL";

/**
 * The keys of the faction-wide or kind-wide refusals the dock used to show
 * as disabled buttons (the Fortify of every faction without Field Defense,
 * a construct's Recover). Nothing enables them later, so they are never
 * shown; the guard drops them if one is reintroduced.
 */
export const PERMANENT_DISABLED_REASON_KEYS_V7: readonly string[] =
  Object.freeze([
    "goblin-field-defense",
    "dinosaur-field-defense",
    "martian-field-defense",
    "ice-folk-field-defense",
    "dwarf-field-defense",
    "candy-field-defense",
    "clockwork",
    // The engine's refusal of a command the unit's role does not have.
    "unit_role_invalid",
  ]);

const FACTION_SUBJECTS_V7 = [
  "Humans",
  "Goblins",
  "Undead",
  "Dinosaurs",
  "Martians",
  "Ice Folk",
  "Dwarves",
  "Candy",
  "Cultists",
  "Clockwork",
];

/**
 * A reason in words that says a whole faction or kind cannot ("Martians
 * cannot build Field Defense", "Candy can't build Field Defense") or never
 * does ("Clockwork never recovers by itself").
 */
const PERMANENT_WORDING_V7 = new RegExp(
  `^(?:${FACTION_SUBJECTS_V7.join("|")})\\b.*\\b(?:cannot|can't|can not|never)\\b`,
  "i",
);

/**
 * Whether a disabled action's reason is permanent (the faction or the
 * unit's kind can never take it: hide the button) or situational (a later
 * turn, a target, Coins or a researchable technology can lift it: show the
 * button disabled with its reason).
 */
export function disabledReasonPermanenceV7(
  reason: string,
): DisabledReasonPermanenceV7 {
  const key = reason.trim().toLowerCase();
  if (PERMANENT_DISABLED_REASON_KEYS_V7.includes(key)) return "PERMANENT";
  return PERMANENT_WORDING_V7.test(reason.trim()) ? "PERMANENT" : "SITUATIONAL";
}

/**
 * The dock's guard: removes every disabled action in `actions` whose reason
 * is permanent, so the row holds only what the unit could do now or later.
 * Returns how many it removed.
 */
export function hidePermanentlyDisabledActionsV7(actions: ParentNode): number {
  let removed = 0;
  for (const action of [
    ...actions.querySelectorAll<HTMLElement>('[aria-disabled="true"]'),
  ]) {
    const reason = action.dataset.disabledReason;
    if (reason === undefined) continue;
    if (disabledReasonPermanenceV7(reason) !== "PERMANENT") continue;
    action.remove();
    removed += 1;
  }
  return removed;
}
