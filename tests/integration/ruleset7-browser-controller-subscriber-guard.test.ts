import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  type MatchSetupV7,
} from "../../src/engine/index";

/**
 * Bead pulp_wars-2yc.93: a snapshot subscriber that throws (a render) never
 * rejects the accepted command, never keeps the snapshot from the
 * subscribers after it, and never leaves the controller transitioning.
 */
describe("Ruleset 7 controller subscribers (pulp_wars-2yc.93)", () => {
  it("accepts a command whose snapshot a subscriber fails to draw", async () => {
    const controller = new Ruleset7BrowserController({ storage: null });
    const launched = await controller.launch(showcaseSetup());
    if (!launched.ok) throw new Error(launched.diagnostic);
    let throwing = false;
    controller.subscribe(() => {
      if (throwing) throw new Error("render failed");
    });
    const seen: boolean[] = [];
    controller.subscribe((snapshot) => seen.push(snapshot.transitioning));
    const move = controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "MOVE");
    if (move === undefined) throw new Error("no Move offered");
    throwing = true;
    const result = await controller.dispatch(move);
    expect(result.accepted).toBe(true);
    expect(controller.snapshot().transitioning).toBe(false);
    // The later subscriber heard the command begin and end.
    expect(seen.at(-1)).toBe(false);
    expect(seen).toContain(true);
    // The controller takes the next command.
    const end = controller
      .snapshot()
      .offeredCommands.find((command) => command.kind === "END_TURN");
    if (end === undefined) throw new Error("no End Turn offered");
    expect((await controller.dispatch(end)).accepted).toBe(true);
    controller.destroy();
  });
});

function showcaseSetup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(2),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}
