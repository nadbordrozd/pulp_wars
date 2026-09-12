import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  RULESET_7_ID,
  queryPlayerCommandsV7,
  runReplayV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { parseSaveV7 } from "../../src/persistence/index";

const EXPORTED_AT = "2026-09-08T12:34:56.789Z";

describe("Ruleset 7 safe and omniscient exports", () => {
  it("keeps the ordinary log player-safe and the raw bundle explicitly spoiler-labelled", async () => {
    const controller = new Ruleset7BrowserController({
      diagnosticNow: () => EXPORTED_AT,
    });
    expect(controller.exportSafeLog()).toBeNull();
    expect(
      controller.exportDebugBundle({ acknowledgeHiddenInformation: true }),
    ).toEqual({ ok: false, reason: "NO_ACTIVE_MATCH" });

    const launched = await controller.launch(setup());
    if (!launched.ok) throw new Error(launched.diagnostic);
    const wait = queryPlayerCommandsV7(launched.view).find(
      (command) => command.kind === "WAIT",
    );
    if (wait === undefined) throw new Error("WAIT missing");
    expect((await controller.dispatch(wait)).accepted).toBe(true);

    const safe = controller.exportSafeLog();
    if (safe === null) throw new Error("safe log missing");
    const safeValue = JSON.parse(safe.source) as Record<string, unknown>;
    expect(safeValue).toMatchObject({
      format: "pulp-wars-ruleset7-safe-live-log",
      version: 1,
      rulesetId: RULESET_7_ID,
      log: { classification: "PLAYER_SAFE", viewerId: launched.view.viewer.id },
    });
    expect(safe.source).not.toContain('"acceptedCommands"');
    expect(safe.source).not.toContain('"randomState"');
    expect(safe.source).not.toContain('"stateHash"');
    expect(safe.filename).toBe(
      "pulp-wars-ruleset7-safe-log-20260908T123456789Z.json",
    );

    const debug = controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!debug.ok) throw new Error(debug.reason);
    expect(debug.bundle).toMatchObject({
      classification: "OMNISCIENT",
      warning: "INCLUDES_HIDDEN_MAP_AND_UNITS",
      kind: "DEBUG_WITH_SPOILERS",
      payload: {
        format: "pulp-wars-ruleset7-debug-bundle",
        warning: "INCLUDES_HIDDEN_MAP_AND_UNITS",
        reproduction: { save: { commandIndex: 1 } },
      },
    });
    expect(debug.filename).toMatch(
      /^pulp-wars-ruleset7-debug-with-spoilers-20260908T123456789Z-[0-9a-f]{12}\.json$/,
    );
    expect(
      parseSaveV7(JSON.stringify(debug.bundle.payload.reproduction.save)).kind,
    ).toBe("VALID");
    expect(runReplayV7(debug.bundle.payload.reproduction.replay)).toMatchObject(
      {
        acceptedCommands: 1,
        stateHash: debug.bundle.payload.reproduction.save.stateHash,
      },
    );
    controller.destroy();
  });
});

function setup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL"],
    mapGenerationRevision: "REGIONAL_BIOMES_V1",
  };
}
