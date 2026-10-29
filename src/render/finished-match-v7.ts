import type { PlayerViewV7 } from "../engine/index";
import type { Ruleset7BrowserSnapshot } from "../app/v7-controller";

/**
 * A finished match has no choice left to make (bead pulp_wars-2ha0).
 *
 * The capture that wins a match can also level a city up: a city taken
 * along a Road joins the winner's road network and its capital gains
 * population, so the won state can still hold a pending city reward. The
 * engine ends the match with the reward queued, and nothing can choose it
 * any more (a finished match offers no commands). The interface used to
 * show that reward's dialog under the Victory dialog: both are modal, the
 * modal isolation kept only the first (the reward, hidden under Victory)
 * live and made everything else inert, so every Victory button was dead.
 * The won state is autosaved, so a reload brought the same dead screen
 * back.
 *
 * The interface therefore presents a finished match without its pending
 * choices: Victory (or Defeat) is the only dialog. The stored match is
 * not touched (no rule, save or hash changes), and a save already holding
 * such a state opens on a working Victory dialog.
 *
 * The presented view is cached per view, so a view keeps one identity for
 * everything keyed on it.
 */
const PRESENTED_VIEWS_V7 = new WeakMap<PlayerViewV7, PlayerViewV7>();

/** The view as a finished match presents it: no pending choices. */
export function finishedMatchViewV7(view: PlayerViewV7): PlayerViewV7 {
  if (view.outcome === null || view.pendingChoices.length === 0) return view;
  const cached = PRESENTED_VIEWS_V7.get(view);
  if (cached !== undefined) return cached;
  const presented: PlayerViewV7 = Object.freeze({
    ...view,
    pendingChoices: [],
  });
  PRESENTED_VIEWS_V7.set(view, presented);
  return presented;
}

/** The snapshot the interface draws: a finished match without its choices. */
export function finishedMatchSnapshotV7(
  snapshot: Ruleset7BrowserSnapshot,
): Ruleset7BrowserSnapshot {
  const view = snapshot.view;
  if (snapshot.phase !== "COMPLETE" || view === null) return snapshot;
  const presented = finishedMatchViewV7(view);
  return presented === view
    ? snapshot
    : Object.freeze({ ...snapshot, view: presented });
}
