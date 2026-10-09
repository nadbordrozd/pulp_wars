// Whole-game simulations split out of
// ruleset-v6-ai-headless.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6 } from "../../src/ai/v6";
import { canonicalHash } from "../../src/engine/replay/canonical";
import { runReplayV6, type ReplayFileV6 } from "../../src/engine/v6/replay";
import type { AiModeV6 } from "../../src/engine/v6/types";
import {
  V6_MATCH_MAX_COMMANDS_DEFAULT,
  V6_MATCH_MAX_ROUNDS_DEFAULT,
  V6_PUBLIC_EQUALITY_COMMAND_LIMIT,
  runAiBatchV6,
  runAiMatchV6,
} from "../../src/headless/v6";
import { setupV6, createdState } from "./ruleset-v6-ai-headless.shared";

describe("ruleset-6 deterministic headless execution", () => {
  it("repeats mixed-faction commands, events, checkpoints, and final state", () => {
    const setup = setupV6();
    const first = runAiMatchV6(setup, { maxCommands: 36, maxRounds: 20 });
    const second = runAiMatchV6(setup, { maxCommands: 36, maxRounds: 20 });

    expect(first.termination).toBe("COMMAND_CAP");
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.events).toEqual(second.events);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.metrics.commandHash).toBe(second.metrics.commandHash);
    expect(first.metrics.eventHash).toBe(second.metrics.eventHash);
    expect(first.metrics.checkpointHash).toBe(second.metrics.checkpointHash);
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(first.metrics.publicEquality.mismatches).toBe(0);
    expect(first.metrics.publicEquality.commandChecks).toBe(
      V6_PUBLIC_EQUALITY_COMMAND_LIMIT,
    );
    expect(first.metrics.relationshipViolations.total).toBe(0);
    expect(first.metrics.factionsBySeat).toEqual(["ORIGINAL", "CANDY"]);
    expect(first.metrics.factionTreesBySeat).toEqual([
      "ORIGINAL_BASELINE",
      "CANDY_BASELINE_V1",
    ]);
    expect(first.metrics.commandCapHits).toBe(1);

    const replay: ReplayFileV6 = {
      format: "pulp-wars-replay",
      version: 6,
      setup,
      commands: first.commandLog.map((record) => record.command),
      checkpoints: first.commandLog.map((record) => ({
        index: record.index,
        stateHash: record.stateHash,
      })),
    };
    const replayed = runReplayV6(replay);
    expect(replayed.acceptedCommands).toBe(first.acceptedCommands);
    expect(replayed.stateHash).toBe(first.stateHash);
    expect(canonicalHash(replayed.events)).toBe(canonicalHash(first.events));

    expect(
      Object.values(first.metrics.commandsByKind).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(first.acceptedCommands);
    expect(
      Object.values(first.metrics.eventsByKind).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(first.events.length);
    expect(Object.values(first.metrics.researchByTech).some(Boolean)).toBe(
      true,
    );
    expect(first.metrics.coinsEarned).toBeGreaterThan(0);
    expect(first.metrics.coinsSpent).toBeGreaterThan(0);
  }, 600_000);

  it("audits a cooperative alternating-faction run without allied harm", () => {
    const setup = setupV6({
      aiCount: 2,
      width: 14,
      height: 14,
      aiMode: "COOPERATIVE",
      factions: ["CANDY", "ORIGINAL", "CANDY"],
    });
    const result = runAiMatchV6(setup, { maxCommands: 12, maxRounds: 20 });
    const repeated = runAiMatchV6(setup, {
      maxCommands: 12,
      maxRounds: 20,
    });
    expect(result.errors).toEqual([]);
    expect(result.stalls).toEqual([]);
    expect(result.metrics.relationshipViolations).toMatchObject({ total: 0 });
    expect(result.metrics.publicEquality.mismatches).toBe(0);
    expect(result.commandLog).toEqual(repeated.commandLog);
    expect(result.events).toEqual(repeated.events);
    expect(result.stateHash).toBe(repeated.stateHash);
    expect(result.metrics.checkpointHash).toBe(repeated.metrics.checkpointHash);
  }, 600_000);

  it("preserves map, turn order, and post-generation PRNG across faction-only changes", () => {
    const original = createdState(
      setupV6({ factions: ["ORIGINAL", "ORIGINAL"] }),
    );
    const mixed = createdState(setupV6({ factions: ["ORIGINAL", "CANDY"] }));
    expect(original.board).toEqual(mixed.board);
    expect(original.turnOrder).toEqual(mixed.turnOrder);
    expect(original.random).toEqual(mixed.random);

    const originalMetrics = runAiMatchV6(original.setup, {
      maxCommands: 1,
      maxRounds: 5,
    }).metrics;
    const mixedMetrics = runAiMatchV6(mixed.setup, {
      maxCommands: 1,
      maxRounds: 5,
    }).metrics;
    expect(originalMetrics.mapHash).toBe(mixedMetrics.mapHash);
    expect(originalMetrics.postGenerationPrngHash).toBe(
      mixedMetrics.postGenerationPrngHash,
    );
  });

  it("uses the documented caps and records caps as batch failures", async () => {
    expect(NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6).toBe(128);
    expect(V6_MATCH_MAX_COMMANDS_DEFAULT).toBe(30_000);
    expect(V6_MATCH_MAX_ROUNDS_DEFAULT).toBe(750);
    expect(() =>
      runAiMatchV6(setupV6(), {
        maxCommands: 1,
        maxRounds: 1,
        maxCommandsPerTurn: 129,
      }),
    ).toThrow(RangeError);

    const summary = await runAiBatchV6({
      seeds: [0],
      aiCounts: [1],
      modes: ["RIVAL", "COOPERATIVE"] satisfies readonly AiModeV6[],
      factions: ["ORIGINAL", "CANDY"],
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(summary).toMatchObject({
      matches: 2,
      completed: 0,
      failed: 2,
      capped: 2,
      errors: 0,
      stalls: 0,
      outcomes: { COMMAND_CAP: 2 },
    });
    expect(summary.entries.every((entry) => entry.capFailure)).toBe(true);
    expect(summary.entries.map((entry) => entry.aiMode)).toEqual([
      "RIVAL",
      "COOPERATIVE",
    ]);

    const defaults = await runAiBatchV6({
      seeds: [0],
      aiCounts: [1],
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(defaults.entries).toHaveLength(1);
    expect(defaults.entries[0]).toMatchObject({
      aiMode: "RIVAL",
      capFailure: true,
      metrics: {
        factionsBySeat: ["ORIGINAL", "ORIGINAL"],
        factionTreesBySeat: ["ORIGINAL_BASELINE", "ORIGINAL_BASELINE"],
      },
    });
    const initial = createdState(
      setupV6({ factions: ["ORIGINAL", "ORIGINAL"] }),
    );
    expect(defaults.entries[0]?.metrics.mapHash).toBe(
      canonicalHash({
        board: initial.board,
        treasureChests: initial.treasureChests,
      }),
    );
  });
});
