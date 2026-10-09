// Whole-game simulations split out of
// ruleset-v7-unique-factions.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { allowDuplicateFactionsV7 } from "../../src/engine/index";
import { runAiBatchV7, runAiMatchV7 } from "../../src/headless/v7";
import { setupOf } from "./ruleset-v7-unique-factions.shared";

// The unique-factions rule (pulp_wars-w5j.1,
// docs/product/RULESET_7_UNIQUE_FACTIONS.md): no two seats may play the same
// faction; headless and test setups may lift it with
// `allowDuplicateFactions: true`, which the browser never accepts.

describe("ruleset-7 unique factions: the headless and test mirror option", () => {
  it("runs mirror matches headless only through the option", () => {
    expect(() =>
      runAiMatchV7(setupOf(["UNDEAD", "UNDEAD"]), { maxCommands: 3 }),
    ).toThrow("CREATE_REJECTED:DUPLICATE_FACTION");
    expect(
      runAiMatchV7(allowDuplicateFactionsV7(setupOf(["UNDEAD", "UNDEAD"])), {
        maxCommands: 3,
      }).acceptedCommands,
    ).toBe(3);
  });

  it("defaults a headless batch to distinct factions and gates mirrors", async () => {
    const batch = await runAiBatchV7({
      seeds: [0],
      curiosities: false,
      aiCounts: [1, 3],
      maxCommands: 1,
    });
    expect(batch.entries.map((entry) => entry.factions)).toEqual([
      ["ORIGINAL", "UNDEAD"],
      ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
    ]);
    await expect(
      runAiBatchV7({
        seeds: [0],
        curiosities: false,
        aiCounts: [1],
        factions: ["GOBLIN", "GOBLIN"],
        maxCommands: 1,
      }),
    ).rejects.toThrow("CREATE_REJECTED:DUPLICATE_FACTION");
    const mirror = await runAiBatchV7({
      seeds: [0],
      curiosities: false,
      aiCounts: [1],
      factions: ["GOBLIN", "GOBLIN"],
      allowDuplicateFactions: true,
      maxCommands: 1,
    });
    expect(mirror.entries[0]?.factions).toEqual(["GOBLIN", "GOBLIN"]);
    expect(mirror.entries[0]?.commands).toBe(1);
  });
});
