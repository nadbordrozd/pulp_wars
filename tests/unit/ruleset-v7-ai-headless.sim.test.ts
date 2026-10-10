// Whole-game simulations split out of
// ruleset-v7-ai-headless.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { canonicalJson, createPlayableGameV7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-4 AI headless runner", () => {
  it("records a deterministic structured cap without rejection or stall", () => {
    const setup = setupV7(0);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const initialActivePlayerId =
      created.state.turnOrder[created.state.activeSeatIndex];
    if (initialActivePlayerId === undefined)
      throw new Error("Initial active player missing");
    const progress: unknown[] = [];
    const first = runAiMatchV7(setup, {
      maxCommands: 3,
      maxRounds: 5,
      progressEveryCommands: 2,
      onProgress: (item) => progress.push(item),
    });
    const second = runAiMatchV7(setup, {
      maxCommands: 3,
      maxRounds: 5,
    });
    expect(first).toMatchObject({
      termination: "COMMAND_CAP",
      acceptedCommands: 3,
      errors: [],
      stalls: [],
      metrics: {
        rulesetId: "pulp-wars-poc-7r71",
        commandCapHits: 1,
      },
    });
    expect(first.metrics.observation.hiddenInformationViolations).toBe(0);
    expect(progress).toEqual([
      {
        acceptedCommands: 2,
        round: 1,
        activePlayerId: initialActivePlayerId,
      },
    ]);
    // Revision 12: the free opening research comes first. Revision 16: it is
    // the growth technology (Hunting here) and both growth harvests follow.
    expect(first.commandLog.map((entry) => entry.command)).toMatchObject([
      { kind: "RESEARCH", tech: "HUNTING" },
      { kind: "HUNT_GAME" },
      { kind: "HUNT_GAME" },
    ]);
    expect(
      canonicalJson({
        commandHash: first.metrics.commandHash,
        eventHash: first.metrics.eventHash,
        checkpointHash: first.metrics.checkpointHash,
        finalHash: first.metrics.finalHash,
      }),
    ).toBe(
      canonicalJson({
        commandHash: second.metrics.commandHash,
        eventHash: second.metrics.eventHash,
        checkpointHash: second.metrics.checkpointHash,
        finalHash: second.metrics.finalHash,
      }),
    );
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(() =>
      runAiMatchV7(setupV7(0), {
        maxCommands: 1,
        progressEveryCommands: 0,
      }),
    ).toThrow(/progressEveryCommands must be a positive safe integer/);
  });
});
