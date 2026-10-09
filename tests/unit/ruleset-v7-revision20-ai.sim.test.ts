// Whole-game simulations split out of
// ruleset-v7-revision20-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7 } from "../../src/ai/v7";
import { FACTION_IDS_V7 } from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// Revision 20 (`pulp_wars-0hi.2`): the Normal AI
// (docs/product/RULESET_7_REVISION_20.md section 7.3). The Triceratops is a
// front-line attacker with Charge!; every Stampede lane heuristic is gone.

describe("ruleset-7 revision-20 Normal AI: determinism and bounds", () => {
  const PAIRINGS = FACTION_IDS_V7.flatMap((left) =>
    FACTION_IDS_V7.map((right) => [left, right] as const),
  );

  it.each(PAIRINGS)(
    "plays %s against %s without a stall, a policy error, or an over-long turn",
    (left, right) => {
      const setup = {
        ...goblinSetupV7([left, right], 4),
        mapType: "PANGEA" as const,
      };
      const match = runAiMatchV7(setup, {
        maxRounds: 30,
        recordCheckpointHashes: false,
      });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(
        match.commandLog.some(
          (record) => (record.command.kind as string) === "STAMPEDE",
        ),
      ).toBe(false);
      // At most 128 commands in one owner turn.
      let run = 0;
      for (const record of match.commandLog) {
        run = record.command.kind === "END_TURN" ? 0 : run + 1;
        expect(run).toBeLessThanOrEqual(
          NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
        );
      }
    },
    600_000,
  );
});
