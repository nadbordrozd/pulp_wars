import { createPlayableGameV7 } from "../../src/engine/v7/reducer";
import type { GameStateV7, MatchSetupV7 } from "../../src/engine/v7/types";
import {
  buildOnlineSetupV7,
  defaultOnlineOptionsV7,
  type FactionPickV7,
  type OnlineMatchOptionsV7,
} from "../../src/online/match";

/**
 * Small online setups for the multiplayer unit tests (`pulp_wars-eqc6.1`):
 * an 11 x 11 Dry Land board, two humans and `aiSeats` AI seats.
 */
export function onlineOptionsFixtureV7(
  seed = 7,
  aiSeats = 0,
  overrides: Partial<OnlineMatchOptionsV7> = {},
): OnlineMatchOptionsV7 {
  return {
    ...defaultOnlineOptionsV7(seed, aiSeats),
    mapType: "DRY_LAND",
    width: 11,
    ...overrides,
  };
}

export function onlineSetupFixtureV7(
  seed = 7,
  aiSeats = 0,
  overrides: Partial<OnlineMatchOptionsV7> = {},
  picks: readonly [FactionPickV7, FactionPickV7] = ["ORIGINAL", "UNDEAD"],
): MatchSetupV7 {
  const built = buildOnlineSetupV7(
    onlineOptionsFixtureV7(seed, aiSeats, overrides),
    picks[0],
    picks[1],
  );
  if (!built.ok) throw new Error(built.code);
  return built.setup;
}

export function onlineStateFixtureV7(setup: MatchSetupV7): GameStateV7 {
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

/** A fixed `[0, 1)` sequence (room codes). */
export function sequenceRandomV7(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}
