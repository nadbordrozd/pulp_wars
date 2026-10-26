import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { martianUiFieldV7 } from "./v7-martian-ui";

/**
 * The tiles of {@link canAttackRingFixtureV7} (bead `pulp_wars-2yc.110`).
 * The viewer's Humans stand round their capital (8, 8): a ready Fighter on
 * `ready`, a Fighter that moved beside the enemy on `attack` (wounded, so
 * its HP bar shows with the ring), a Knight that moved beside another enemy
 * on `attackKnight`, and a Fighter that moved out of reach on `spent`.
 */
export const CAN_ATTACK_RING_UI_V7 = {
  ready: { x: 5, y: 7 },
  attack: { x: 7, y: 7 },
  spent: { x: 9, y: 7 },
  attackKnight: { x: 6, y: 9 },
  foe: { x: 7, y: 6 },
  foeKnight: { x: 5, y: 10 },
} as const satisfies Readonly<Record<string, CoordV7>>;

const MOVED = { moved: true, movedPathLength: 1, handled: true } as const;

/**
 * A playable Human-against-Undead match on the Human's turn showing the
 * three turn states side by side: READY, CAN ATTACK and SPENT. The module
 * imports no test runner, so the browser review mounts it through the dev
 * server.
 */
export function canAttackRingFixtureV7(): GameStateV7 {
  const at = CAN_ATTACK_RING_UI_V7;
  return martianUiFieldV7(
    [
      { seat: 0, role: "FIGHTER", at: at.ready },
      { seat: 0, role: "FIGHTER", at: at.attack, hp: 6, activation: MOVED },
      { seat: 0, role: "FIGHTER", at: at.spent, activation: MOVED },
      { seat: 0, role: "KNIGHT", at: at.attackKnight, activation: MOVED },
      { seat: 1, role: "FIGHTER", at: at.foe },
      { seat: 1, role: "FIGHTER", at: at.foeKnight },
    ],
    { factions: ["ORIGINAL", "UNDEAD"], coins: 20 },
  );
}
