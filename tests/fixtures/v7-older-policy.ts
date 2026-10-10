import { afterAll, beforeAll } from "vitest";
import {
  ARMY_PLAY_FACTIONS_V7,
  setArmyPlayFactionsV7,
} from "../../src/ai/v7-army";
import type { FactionIdV7 } from "../../src/engine/index";

/**
 * The older Normal policy in tests (`pulp_wars-jdb.13`).
 *
 * Until the Candy army seat a match with a Candy seat kept the older policy
 * (the one before army play: each faction's first research plan and
 * production values, no assault, no composition) for every seat, and the
 * tests of that policy were written on matches with a Candy seat. Every
 * faction registered then plays the army rules now, so no match reaches the
 * older policy through its factions. Its code is still there, and these
 * tests still pin it: they take the Candy out of the list of army factions
 * for their file (or for one test), which is exactly the state they were
 * written in.
 */
const WITHOUT_CANDY: readonly FactionIdV7[] = ARMY_PLAY_FACTIONS_V7.filter(
  (faction) => faction !== "CANDY",
);

/**
 * For every test of the calling file (or `describe` block): a match with a
 * Candy seat keeps the older policy for every seat, as before the Candy
 * army seat.
 */
export function candySeatKeepsOlderPolicyV7(): void {
  let previous: readonly FactionIdV7[] = ARMY_PLAY_FACTIONS_V7;
  beforeAll(() => {
    previous = setArmyPlayFactionsV7(WITHOUT_CANDY);
  });
  afterAll(() => {
    setArmyPlayFactionsV7(previous);
  });
}

/** The same for one call. */
export function withCandyOnOlderPolicyV7<T>(body: () => T): T {
  const previous = setArmyPlayFactionsV7(WITHOUT_CANDY);
  try {
    return body();
  } finally {
    setArmyPlayFactionsV7(previous);
  }
}
