import { describe, expect, it } from "vitest";
import {
  Ruleset6BrowserController,
  RULESET6_DEBUG_LOG_FORMAT,
  RULESET6_DEBUG_LOG_VERSION,
} from "../../src/app/index";
import {
  canonicalJson,
  queryPlayerCommandsV6,
  runReplayV6,
  type CommandV6,
  type MatchSetupV6,
} from "../../src/engine/index";
import { parseSaveV6 } from "../../src/persistence/index";

const EXPORTED_AT = "2026-09-04T12:34:56.789Z";

describe("ruleset-6 gameplay debug export", () => {
  it("returns an explicit no-match result without reading browser state", () => {
    const controller = new Ruleset6BrowserController({
      diagnosticNow: () => EXPORTED_AT,
    });
    expect(controller.exportDebugLog()).toEqual({
      ok: false,
      reason: "NO_ACTIVE_MATCH",
    });
    controller.destroy();
  });

  it("allowlists versioned metadata and canonical deterministic reproduction data", async () => {
    const controller = new Ruleset6BrowserController({
      diagnosticNow: () => EXPORTED_AT,
    });
    await controller.launch(setupV6());
    const wait = requireCommand(controller, "WAIT");
    expect((await controller.dispatch(wait)).accepted).toBe(true);

    const result = controller.exportDebugLog();
    if (!result.ok) throw new Error(result.reason);
    const parsed = JSON.parse(result.source) as typeof result.bundle;
    expect(Object.keys(parsed)).toEqual([
      "format",
      "version",
      "exportedAt",
      "build",
      "schemas",
      "controller",
      "context",
      "reproduction",
    ]);
    expect(parsed).toMatchObject({
      format: RULESET6_DEBUG_LOG_FORMAT,
      version: RULESET6_DEBUG_LOG_VERSION,
      exportedAt: EXPORTED_AT,
      build: { application: "pulp-wars", packageVersion: "0.1.0" },
      schemas: {
        rulesetId: "pulp-wars-poc-6",
        gameState: 6,
        command: 6,
        event: 6,
        save: 6,
        replay: 6,
      },
      controller: { phase: "ACTIVE", diagnostic: null },
      context: { commandIndex: 1, treasureChestsRemaining: 2 },
      reproduction: {
        replay: { commands: [wait] },
        save: { acceptedCommands: [wait], commandIndex: 1 },
      },
    });
    expect(Object.keys(parsed.controller)).toEqual([
      "phase",
      "diagnostic",
      "transitioning",
    ]);
    expect(Object.keys(parsed.context)).toEqual([
      "commandIndex",
      "activeSeatIndex",
      "activePlayerId",
      "humanPlayerId",
      "treasureChestsRemaining",
      "pendingChoiceKinds",
      "outcomeKind",
    ]);
    expect(parseSaveV6(JSON.stringify(parsed.reproduction.save)).kind).toBe(
      "VALID",
    );
    expect(runReplayV6(parsed.reproduction.replay)).toMatchObject({
      acceptedCommands: 1,
      stateHash: parsed.reproduction.save.stateHash,
    });
    expect(canonicalJson(parsed.reproduction.save.state)).toBe(
      canonicalJson(runReplayV6(parsed.reproduction.replay).state),
    );
    expect(result.filename).toMatch(
      /^pulp-wars-ruleset6-debug-20260904T123456789Z-[0-9a-f]{12}\.json$/,
    );
    for (const forbidden of [
      "localStorage",
      "cookie",
      "userAgent",
      "filesystemPath",
      "credential",
    ]) {
      expect(result.source).not.toContain(forbidden);
    }
    controller.destroy();
  });

  it("remains available in the stopped phase with the exact controller error", async () => {
    const diagnostic = "Normal AI command rejected: MOVEMENT_ILLEGAL.";
    const controller = new Ruleset6BrowserController({
      diagnosticNow: () => EXPORTED_AT,
      chooseAiCommand: () => {
        throw new Error(diagnostic);
      },
    });
    await controller.launch(setupV6());
    expect(
      (await controller.dispatch(requireCommand(controller, "END_TURN")))
        .accepted,
    ).toBe(true);
    const progressed = await controller.progressAiTurns();
    expect(progressed).toMatchObject({ ok: false, diagnostic });
    expect(controller.snapshot()).toMatchObject({
      phase: "ERROR",
      diagnostic,
    });

    const exported = controller.exportDebugLog();
    if (!exported.ok) throw new Error(exported.reason);
    expect(exported.bundle.controller).toEqual({
      phase: "ERROR",
      diagnostic,
      transitioning: false,
    });
    expect(exported.bundle.reproduction.save.stateHash).toBe(
      controller.snapshot().stateHash,
    );
    expect(exported.bundle.reproduction.replay.commands).toHaveLength(
      controller.snapshot().commandIndex,
    );
    controller.destroy();
  });
});

function setupV6(): MatchSetupV6 {
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY"],
  };
}

function requireCommand<K extends CommandV6["kind"]>(
  controller: Ruleset6BrowserController,
  kind: K,
): Extract<CommandV6, { readonly kind: K }> {
  const view = controller.snapshot().view;
  if (view === null) throw new Error("Missing view");
  const command = queryPlayerCommandsV6(view).find(
    (candidate): candidate is Extract<CommandV6, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (command === undefined) throw new Error(`Missing ${kind}`);
  return command;
}
