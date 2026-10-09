// Whole-game simulations split out of
// ruleset-v7-mission-directives.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  commandRelocationsV7,
  directivePlanForViewV7,
  leashReadyCommandsV7,
  zoneContainsV7,
} from "../../src/ai/v7-directives";
import {
  applyCommandV7,
  queryAiReadyCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import {
  setupOf,
  playable,
  zoneOf,
  jobs,
  ownLand,
} from "./ruleset-v7-mission-directives.shared";

// Mission directives (`pulp_wars-68k.3`, docs/product/CAMPAIGN.md sections
// 2.5, 7.1, 7.2, and 8.2): directive resolution and `untilRound`, the plan
// hook (RUSH, HOLD, GUARD, the RETURN job), the leash, the garrison choice,
// the naval plan gated on a forbidden Shorecraft, headless behaviour on the
// hidden fixtures TEST_RUSH, TEST_HOLD, and TEST_GUARD, and the headless
// proxy variation.

/** Replays a headless match and visits every accepted command. */
function replay(
  id: string,
  log: ReturnType<typeof runAiMatchV7>["commandLog"],
  visit: (state: GameStateV7, actor: PlayerId, command: CommandV7) => void,
): GameStateV7 {
  let state = playable(id);
  for (const record of log) {
    visit(state, record.playerId, record.command);
    const applied = applyCommandV7(state, record.playerId, record.command);
    if (!applied.accepted) throw new Error("replay refused");
    state = applied.state;
  }
  return state;
}

describe("directives in headless play", () => {
  it(
    "RUSH attacks at once and never takes a village job",
    { timeout: 120_000 },
    () => {
      const result = runAiMatchV7(setupOf("TEST_RUSH"), { maxRounds: 10 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let firstAttack: number | null = null;
      const aiJobs: string[] = [];
      replay("TEST_RUSH", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id) return;
        if (command.kind === "ATTACK") firstAttack ??= state.round;
        if (state.round >= 2 && state.round <= 4)
          for (const item of jobs(viewForV7(state, actor)).assignments)
            aiJobs.push(item.job);
      });
      expect(firstAttack).not.toBeNull();
      expect(firstAttack).toBeLessThanOrEqual(4);
      expect(aiJobs.length).toBeGreaterThan(0);
      expect(new Set(aiJobs)).toEqual(new Set(["ATTACK"]));
    },
  );

  it(
    "HOLD never leaves its zone before untilRound, then plays NORMAL",
    { timeout: 120_000 },
    () => {
      const zone = zoneOf("TEST_HOLD");
      const result = runAiMatchV7(setupOf("TEST_HOLD"), { maxRounds: 12 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let leftAfter: number | null = null;
      let decisions = 0;
      let normalDecisions = 0;
      replay("TEST_HOLD", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id) return;
        const view = viewForV7(state, actor);
        if (state.round < 8) {
          decisions += 1;
          // The policy only ever picks a leashed command.
          const plan = directivePlanForViewV7(view);
          const ready = leashReadyCommandsV7(
            view,
            plan,
            queryAiReadyCommandsV7(view),
          );
          // (END_TURN is not offered while a level reward waits to be
          // chosen: with the +3 Monument of the economy rejig the seat
          // levels a city inside these rounds.)
          expect(ready.some((item) => item.command.kind === "END_TURN")).toBe(
            view.pendingChoices.length === 0,
          );
          expect(
            ready.some(
              (item) =>
                JSON.stringify(item.command) === JSON.stringify(command),
            ),
          ).toBe(true);
          // A unit inside the zone never ends a relocation outside it.
          for (const move of commandRelocationsV7(command)) {
            const unit = view.units.find((item) => item.id === move.unitId);
            if (unit !== undefined && zoneContainsV7(zone, unit.at))
              expect(zoneContainsV7(zone, move.to)).toBe(true);
          }
        } else {
          // From `untilRound` on the seat has no directive plan: its policy
          // is exactly the policy without directives.
          normalDecisions += 1;
          expect(directivePlanForViewV7(view)).toBeNull();
          if (
            command.kind === "END_TURN" &&
            ownLand(view).some((unit) => !zoneContainsV7(zone, unit.at))
          )
            leftAfter ??= state.round;
        }
      });
      expect(decisions).toBeGreaterThan(10);
      expect(normalDecisions).toBeGreaterThan(10);
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): in this match the Human seat now
      // wins the fight inside the zone by round 13 (the retaliation of the
      // Undead defenders no longer uses their cover), so the Undead units
      // never get out; before, they left the zone in round 8 or later. A
      // unit that does leave still leaves only from round 8.
      if (leftAfter !== null) expect(leftAfter).toBeGreaterThanOrEqual(8);
    },
  );

  it(
    "GUARD keeps its garrison in the zone at every End Turn",
    { timeout: 120_000 },
    () => {
      const zone = zoneOf("TEST_GUARD");
      const result = runAiMatchV7(setupOf("TEST_GUARD"), { maxRounds: 13 });
      expect(result.errors).toEqual([]);
      expect(result.stalls).toEqual([]);
      let checks = 0;
      let roamed = false;
      replay("TEST_GUARD", result.commandLog, (state, actor, command) => {
        if (actor !== state.players[1]?.id || command.kind !== "END_TURN")
          return;
        const land = ownLand(viewForV7(state, actor));
        const inside = land.filter((unit) => zoneContainsV7(zone, unit.at));
        expect(inside.length).toBeGreaterThanOrEqual(Math.min(2, land.length));
        if (land.length > inside.length) roamed = true;
        checks += 1;
      });
      expect(checks).toBeGreaterThan(5);
      // The rest of the army does not stay home.
      expect(roamed).toBe(true);
    },
  );
});

describe("proxy variation", () => {
  it(
    "is deterministic per seed, leaves the match PRNG alone, and plays legal commands",
    { timeout: 180_000 },
    () => {
      const setup = setupOf("TEST_RUSH");
      const plain = runAiMatchV7(setup, { maxRounds: 6 });
      const zero = runAiMatchV7(setup, {
        maxRounds: 6,
        proxyVariation: { seed: 3, rate: 0 },
      });
      expect(zero.metrics.commandHash).toBe(plain.metrics.commandHash);
      const hashes = new Set<string>();
      for (const seed of [1, 2, 3]) {
        const first = runAiMatchV7(setup, {
          maxRounds: 6,
          proxyVariation: { seed, rate: 0.5 },
        });
        const again = runAiMatchV7(setup, {
          maxRounds: 6,
          proxyVariation: { seed, rate: 0.5 },
        });
        expect(first.errors).toEqual([]);
        expect(first.stalls).toEqual([]);
        expect(again.metrics.commandHash).toBe(first.metrics.commandHash);
        hashes.add(first.metrics.commandHash);
        // The match PRNG is untouched by the proxy stream.
        expect(first.metrics.postGenerationPrngHash).toBe(
          plain.metrics.postGenerationPrngHash,
        );
      }
      hashes.add(plain.metrics.commandHash);
      expect(hashes.size).toBeGreaterThan(1);
      expect(() =>
        runAiMatchV7(setup, {
          maxRounds: 1,
          proxyVariation: { seed: 1, rate: 1.5 },
        }),
      ).toThrow(RangeError);
    },
  );
});
