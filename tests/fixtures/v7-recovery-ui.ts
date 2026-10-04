import type { GameStateV7 } from "../../src/engine/index";
import { undeadUiArenaV7 } from "./v7-undead-ui";

/** Where the pieces of `idleRecoveryUiFixtureV7` stand. */
export const IDLE_RECOVERY_UI_V7 = {
  wounded: { x: 4, y: 5 },
  hurt: { x: 6, y: 5 },
  healthy: { x: 5, y: 7 },
} as const;

/**
 * Bead pulp_wars-v3w: a Human seat on its turn with two wounded idle units
 * (a Fighter and a Guard) and a healthy Fighter, so End Turn heals two units.
 */
export function idleRecoveryUiFixtureV7(): GameStateV7 {
  const at = IDLE_RECOVERY_UI_V7;
  return undeadUiArenaV7(
    [
      { seat: 0, role: "FIGHTER", at: at.wounded, hp: 3 },
      { seat: 0, role: "GUARD", at: at.hurt, hp: 2 },
      { seat: 0, role: "FIGHTER", at: at.healthy },
    ],
    [],
    ["ORIGINAL", "UNDEAD"],
  );
}
