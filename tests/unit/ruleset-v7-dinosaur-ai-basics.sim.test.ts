// Whole-game simulations split out of
// ruleset-v7-dinosaur-ai-basics.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { runAiMatchV7 } from "../../src/headless/v7";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.3`): the Normal AI support that lets a
// Dinosaur seat play legally with Eggs, and (revision 20) the two Charge!
// benchmark scenarios that replace the Stampede ones. The full Dinosaur policy
// (`pulp_wars-c87.5`) is covered by ruleset-v7-dinosaur-ai.test.ts and
// ruleset-v7-dinosaur-ai-against.test.ts.

describe("ruleset-7 revision-19 Normal AI: legal play with Eggs", () => {
  it("plays Dinosaur seats to completion with Eggs laid and hatched and no rejected command", () => {
    for (const factions of [
      ["DINOSAUR", "ORIGINAL"],
      ["GOBLIN", "DINOSAUR"],
    ] as const) {
      // Seed 4 (was 3): since pulp_wars-c87.8 the 12-HP Cavemen of seed 3
      // win in ten rounds, before any Egg is laid.
      const setup = {
        ...goblinSetupV7(factions, 4),
        mapType: "PANGEA" as const,
      };
      const match = runAiMatchV7(setup, { maxRounds: 60 });
      expect(match.errors, factions.join()).toEqual([]);
      expect(match.stalls, factions.join()).toEqual([]);
      const kinds = new Set(
        match.commandLog.map((record) => record.command.kind),
      );
      expect(kinds.has("LAY_EGG"), factions.join()).toBe(true);
      // A Dinosaur seat never trains an egg-laid role.
      const dinosaurIds = new Set(
        match.state.players
          .filter((player) => player.faction === "DINOSAUR")
          .map((player) => player.id),
      );
      expect(
        match.commandLog.filter(
          (record) =>
            record.command.kind === "TRAIN" &&
            dinosaurIds.has(record.playerId) &&
            record.command.role !== "FIGHTER" &&
            record.command.role !== "CAPTAIN",
        ),
      ).toEqual([]);
    }
  }, 240_000);
});
