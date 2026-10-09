// Whole-game simulations split out of
// demo-scenario.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_MATCH_SETUP,
  canonicalHash,
  demoScenarioIssues,
} from "../../src/engine/index";
import { headless, runAiMatch } from "../../src/headless/index";

const DEMO_INITIAL_HASH =
  "33e7131617587013ffbe21384391f77c615970821c86178dcc905e4cdd8d734d";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("demo replay, save, headless, and controller boundaries", () => {
  it("exposes a direct headless launch and deterministic Normal-policy advance", async () => {
    const created = await headless.createDemo();
    if (!created.ok) throw new Error(created.error.code);
    expect(canonicalHash(created.state)).toBe(DEMO_INITIAL_HASH);
    expect(demoScenarioIssues(created.state)).toEqual([]);
    const first = runAiMatch(DEMO_MATCH_SETUP, {
      maxCommands: 1,
      maxRounds: 5,
    });
    const second = runAiMatch(DEMO_MATCH_SETUP, {
      maxCommands: 1,
      maxRounds: 5,
    });
    expect(first.commandLog).toEqual(second.commandLog);
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.acceptedCommands).toBe(1);
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
  });
});
