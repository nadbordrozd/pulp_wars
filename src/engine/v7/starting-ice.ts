import { recomputeLiveEconomyV7 } from "./economy";
import { territoryFreezeV7 } from "./ice";
import type { GameStateV7 } from "./types";

/**
 * The starting border freeze (`pulp_wars-s55m.6`, ruleset 7r126): an Ice
 * Folk seat that starts a match with Rime already known (a mission seat
 * whose definition grants it, every Showcase seat) starts with the water of
 * its own territory frozen, as if it had researched Rime on its first turn.
 * Each seat in seat order is put through the border freeze of
 * {@link territoryFreezeV7} over every own city, with the same tiles and
 * exclusions: unexplored tiles, deep water without Pack Ice, own sound ice,
 * and any tile that holds a unit (a ship, an embarked unit, a neutral sea
 * monster) are left, so no ship is frozen and no unit ends up on ice. A
 * seat without Rime (every seat of another faction) freezes nothing. When
 * any tile froze, the live economy is recomputed as after a research (a
 * dock made ice is an Ice Harbour, whose blockade rule differs), so the
 * cities and the ledger stay consistent. Every setup path that can grant a
 * starting technology calls it on its draft state, after the seats, the
 * territory, the exploration and the units are in place and before the
 * score ledger is made.
 */
export function withStartingBorderFreezeV7<
  T extends Omit<GameStateV7, "scoreLedger">,
>(draft: T): T {
  let ice = draft.ice;
  for (const player of draft.players) {
    const freeze = territoryFreezeV7({ ...draft, ice }, player.id, null);
    ice = freeze.ice;
  }
  if (ice === draft.ice) return draft;
  // The score ledger is not read by the economy; the draft stands in for a
  // whole state until the caller makes its ledger.
  const iced = { ...draft, ice } as unknown as GameStateV7;
  const recalculation = recomputeLiveEconomyV7(
    iced,
    iced,
    iced.populationContributions,
  );
  return {
    ...draft,
    ice,
    cities: recalculation.cities,
    populationContributions: recalculation.populationContributions,
  };
}
