// Whole-game simulations split out of
// ruleset-v7-undead-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import { NormalPolicyWorkV7, chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  canonicalHash,
  viewForV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { setupWith, required } from "./ruleset-v7-undead-ai.shared";

describe("ruleset-7 revision-13 Normal AI determinism and headless play", () => {
  it("decides identically cold, synchronously, and with budget one on an Undead view", () => {
    const match = runAiMatchV7(setupWith(["UNDEAD", "ORIGINAL"], 3), {
      maxRounds: 18,
    });
    expect(match.errors).toEqual([]);
    const view = viewForV7(
      match.state,
      required(match.state.turnOrder[match.state.activeSeatIndex]),
    );
    const synchronous = chooseNormalCommandV7(structuredClone(view));
    const work = new NormalPolicyWorkV7(structuredClone(view), () => 0);
    let stepped = work.advanceWork(1);
    while (stepped === null) stepped = work.advanceWork(1);
    const diagnostic = work.diagnostic();
    expect(canonicalHash(stepped)).toBe(canonicalHash(synchronous));
    expect(canonicalHash(chooseNormalCommandV7(structuredClone(view)))).toBe(
      canonicalHash(synchronous),
    );
    expect(stepped.prngDraws).toBe(0);
    expect(diagnostic.workUnits).toBeLessThanOrEqual(
      diagnostic.bounds.declaredMaximumWorkUnits,
    );
  }, 600_000);

  it("finishes Undead-vs-Human and Undead-vs-Undead matches using the whole kit", () => {
    const cases: readonly {
      readonly factions: readonly FactionIdV7[];
      readonly seed: number;
      readonly mapType: MatchSetupV7["mapType"];
    }[] = [
      { factions: ["UNDEAD", "ORIGINAL"], seed: 2, mapType: "CONTINENTS" },
      { factions: ["UNDEAD", "ORIGINAL"], seed: 3, mapType: "DRY_LAND" },
      { factions: ["ORIGINAL", "UNDEAD"], seed: 4, mapType: "DRY_LAND" },
      { factions: ["UNDEAD", "UNDEAD"], seed: 3, mapType: "DRY_LAND" },
      { factions: ["UNDEAD", "UNDEAD"], seed: 4, mapType: "ARCHIPELAGO" },
      // Revision 14 AI (vkq.18): the earlier cases no longer reach a Devour.
      { factions: ["ORIGINAL", "UNDEAD"], seed: 7, mapType: "PANGEA" },
      // pulp_wars-vkq.21 AI: the earlier cases no longer reach a Devour (seed
      // 0 did until the revision-16 economy numbers; seed 13 does with them).
      { factions: ["ORIGINAL", "UNDEAD"], seed: 13, mapType: "PANGEA" },
      // pulp_wars-0ao.15: every Wail of the earlier cases was in seed 2,
      // which changed once a landed unit can no longer attack the same turn
      // (its old command log had three post-landing actions). This Dry Land
      // match has no landings and Wails three times.
      { factions: ["UNDEAD", "ORIGINAL"], seed: 0, mapType: "DRY_LAND" },
      // pulp_wars-9s0.4: with the revision-21 achievements every match
      // changes after its first new unlock and none of the cases above
      // reaches a Devour; this one Devours twice.
      { factions: ["UNDEAD", "ORIGINAL"], seed: 8, mapType: "PANGEA" },
      // pulp_wars-9s0.8: the AI second pass (savings, sieges) changes these
      // matches and none of the cases above Wails any more; this Dry Land
      // match Wails twelve times.
      { factions: ["ORIGINAL", "UNDEAD"], seed: 9, mapType: "DRY_LAND" },
      // pulp_wars-ykw.2: the village density regenerates every board and
      // none of the cases above reaches a Raise Dead or a Wail any more
      // (they still Devour and Rally); these Dry Land matches raise 13 and
      // 4 times, and the second Wails six times.
      { factions: ["UNDEAD", "ORIGINAL"], seed: 15, mapType: "DRY_LAND" },
      { factions: ["UNDEAD", "ORIGINAL"], seed: 21, mapType: "DRY_LAND" },
      // pulp_wars-ykw.3: many seats regenerates every board again and none
      // of the cases above reaches a Devour any more (they still Raise
      // Dead, Wail, and Rally); this Pangea match Devours three times.
      { factions: ["UNDEAD", "ORIGINAL"], seed: 3, mapType: "PANGEA" },
      // Tuning 4 (`pulp_wars-w49.3`): research is priced by the technologies
      // owned and none of the cases above trains a Banshee any more; this
      // Dry Land match Wails 20 times (the only one of seeds 0-9, either
      // seat order, that Wails).
      { factions: ["UNDEAD", "ORIGINAL"], seed: 9, mapType: "DRY_LAND" },
      // Tuning 5 (`pulp_wars-w49.4`): with the army play of the Normal AI
      // none of the cases above reaches a Frenzy (the Undead Rally) any
      // more; this Dry Land match has five.
      { factions: ["UNDEAD", "ORIGINAL"], seed: 8, mapType: "DRY_LAND" },
      // Tuning 6 (`pulp_wars-w49.6`): the Normal AI researches toward
      // ranged, siege, and breakthrough units first and the Necromancer
      // last, so none of the cases above reaches a Frenzy any more (none of
      // seeds 0-15 against Humans does within 45 rounds); this Undead
      // mirror has 18, in a match of 54 rounds.
      { factions: ["UNDEAD", "UNDEAD"], seed: 5, mapType: "DRY_LAND" },
    ];
    const used: Record<string, number> = {
      RAISE_DEAD: 0,
      DEVOUR: 0,
      WAIL: 0,
      RALLY: 0,
    };
    for (const { factions, seed, mapType } of cases) {
      const setup = { ...setupWith(factions, seed), mapType };
      const match = runAiMatchV7(setup, { maxRounds: 120 });
      expect(match.errors).toEqual([]);
      expect(match.stalls).toEqual([]);
      expect(match.termination).toBe("OUTCOME");
      expect(match.metrics.observation.hiddenInformationViolations).toBe(0);
      const undead = new Set(
        match.state.players
          .filter((player) => player.faction === "UNDEAD")
          .map((player) => player.id),
      );
      for (const record of match.commandLog)
        if (undead.has(record.playerId) && record.command.kind in used)
          used[record.command.kind] = (used[record.command.kind] ?? 0) + 1;
    }
    expect(used.RAISE_DEAD).toBeGreaterThan(0);
    expect(used.DEVOUR).toBeGreaterThan(0);
    expect(used.WAIL).toBeGreaterThan(0);
    expect(used.RALLY).toBeGreaterThan(0);
  }, 600_000);
});
