import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseEventV7,
  parseGameStateV7,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import { type GoblinPieceV7 } from "../fixtures/v7-goblin-arena";
import { monsterArenaV7 } from "../fixtures/v7-monster-arena";

// Map curiosities, engine II (`pulp_wars-737.3`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.5): the neutral-owner
// fuzz in the Monster arena. Split out of `ruleset-v7-monster.test.ts`
// (`pulp_wars-737.8`) so its four six-round Normal games run beside that
// file's tests and its headless matches
// (`ruleset-v7-monster-headless.sim.test.ts`), each far from its timeout when
// `npm run check` runs on a busy machine. Both are whole-game simulations
// and run only in `npm run test:sim` (`pulp_wars-bwry`).

const at = (x: number, y: number): CoordV7 => ({ x, y });

/**
 * Plays Normal turns from `state` for `rounds` rounds, applying every
 * command and checking its events and state.
 */
function playNormalRounds(state: GameStateV7, rounds: number): GameStateV7 {
  let current = state;
  let commandsThisTurn = 0;
  const finalRound = state.round + rounds;
  for (let step = 0; step < 4000 && current.round < finalRound; step += 1) {
    if (current.outcome !== null) break;
    const actor = current.turnOrder[current.activeSeatIndex] as PlayerId;
    const command = chooseNormalTurnCommandV7(
      viewForV7(current, actor),
      commandsThisTurn,
    );
    if (command === null) throw new Error("no command");
    const result = applyCommandV7(current, actor, command);
    if (!result.accepted)
      throw new Error(`${command.kind} rejected: ${result.error.code}`);
    for (const event of result.events)
      expect(parseEventV7(event).ok, event.kind).toBe(true);
    current = result.state;
    commandsThisTurn = command.kind === "END_TURN" ? 0 : commandsThisTurn + 1;
  }
  expect(parseGameStateV7(JSON.parse(JSON.stringify(current)))).toEqual(
    current,
  );
  return current;
}

describe("neutral-owner fuzz (section 10.5)", () => {
  const lineups: readonly (readonly FactionIdV7[])[] = [
    ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
    ["MARTIAN", "ICE_FOLK", "DWARF", "ORIGINAL"],
  ];
  const ring = [
    at(6, 6),
    at(8, 6),
    at(6, 8),
    at(8, 8),
    at(6, 7),
    at(7, 6),
    at(9, 7),
    at(9, 8),
  ];
  for (const factions of lineups)
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const)
      it(`plays Normal rounds with the Spider next to every seat's units: ${factions.join(", ")} (${aiMode})`, () => {
        const roles = ["FIGHTER", "MARKSMAN"] as const;
        const pieces: GoblinPieceV7[] = ring.map((where, index) => ({
          seat: index % 4,
          role: roles[Math.floor(index / 4)] as (typeof roles)[number],
          at: where,
        }));
        const state = monsterArenaV7(pieces, { aiMode }, factions);
        const after = playNormalRounds(state, 6);
        expect(after.round).toBeGreaterThan(state.round);
      }, 600_000);
});
