// Whole-game simulations split out of
// ruleset-v7-dwarf-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DWARF_POLICY_OPTIONS_V7,
  setDwarfPolicyOptionsV7,
} from "../../src/ai/v7-dwarf";
import { runAiMatchV7 } from "../../src/headless/v7";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Steampunk Dwarf Normal AI (`pulp_wars-78i.4`,
// docs/product/RULESET_7_DWARVES.md sections 15 and 18). The field: an
// 11 x 11 board, seat 0 (the viewer) capital (8, 8) with territory x 7-9,
// y 7-9; seat 1 capital (2, 8) with territory x 1-3, y 7-9; villages
// (5, 5), (8, 5), (5, 8); every other land tile Grass; every tile
// explored; every technology and 100 Coins unless stated.

afterEach(() => {
  setDwarfPolicyOptionsV7(DEFAULT_DWARF_POLICY_OPTIONS_V7);
});

describe("Dwarf Normal AI: headless", () => {
  it("finishes short matches against every faction in both seat orders", () => {
    const others = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
    ] as const;
    let dwarfCommands = 0;
    for (const [index, other] of others.entries())
      for (const factions of [
        ["DWARF", other],
        [other, "DWARF"],
      ] as const) {
        const match = runAiMatchV7(goblinSetupV7(factions, index + 11), {
          maxRounds: 18,
        });
        const label = factions.join("-");
        expect(match.errors, label).toEqual([]);
        expect(match.stalls, label).toEqual([]);
        expect(["OUTCOME", "ROUND_CAP"], label).toContain(match.termination);
        for (const record of match.commandLog)
          if (
            record.command.kind === "TUNNEL" ||
            record.command.kind === "BOMB_RUN" ||
            record.command.kind === "ASSEMBLE"
          )
            dwarfCommands += 1;
      }
    // The Dwarf policy plays the new commands (the generic one never did).
    expect(dwarfCommands).toBeGreaterThan(0);
  }, 900_000);

  it("is deterministic and bounded in a Dwarf match", () => {
    const setup = goblinSetupV7(["DWARF", "ORIGINAL"], 3);
    const first = runAiMatchV7(setup, { maxRounds: 25 });
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(runAiMatchV7(setup, { maxRounds: 25 }).stateHash).toBe(
      first.stateHash,
    );
  }, 300_000);
});
