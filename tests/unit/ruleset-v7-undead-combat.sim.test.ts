// Whole-game simulations split out of
// ruleset-v7-undead-combat.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseEventV7,
  parseReplayJsonV7,
  runReplayV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-13 Infect and Lifesteal: events, fog, and persistence", () => {
  it("round-trips Infect and Lifesteal through replay, checkpoints, and save", () => {
    // Seed 3 shows Infect and Lifesteal within 20 rounds under the
    // revision-18 movement rules (seed 2 did with the revision-16 economy
    // numbers; its first Zombie kill now comes later).
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): a chest gives no Vampire before
    // round 15, so Lifesteal now waits for a trained Vampire: none of seeds
    // 0-10 shows it within 20 rounds, and seeds 6 and 7 do within 40 (seed
    // 6: two Vampires, the match over in round 34). With tuning 3
    // (`pulp_wars-w49.3`) seed 6 shows no Lifesteal; seeds 3, 9, 11, and 15
    // of 0-15 do within 40 rounds (seed 3: three Vampires). With tuning 4
    // (research priced by the technologies owned: the Normal AI reaches
    // Chivalry later) only seed 15 of 0-15 shows a heal within 40 rounds.
    // With tuning 5 (`pulp_wars-w49.4`, the Normal AI's army play) seeds
    // 2, 3, 5, 8, 9, and 10 of 0-15 do (seed 2: the match over in round 32).
    // With tuning 6 (`pulp_wars-w49.6`: the Undead research Drill first
    // and the Vampire last) Infect is common and Lifesteal late: seed 8
    // shows 14 risings and nine heals within the 40 rounds (seeds 2 and 5
    // show risings and no heal). With the Industry reshuffle
    // (`pulp_wars-w49.21`, 7r56) seed 8 shows 38 risings and no heal;
    // seed 9 shows 53 risings and three heals (seeds 6 and 7 of 0-15 heal
    // too). With step two of the Undead pass (`pulp_wars-w49.24`, 7r57)
    // seed 9 shows 46 risings and no heal; seed 1 shows 68 risings and two
    // heals (the only one of seeds 0-15 that heals).
    const setup = setupWith(["UNDEAD", "UNDEAD"], 1);
    const match = runAiMatchV7(setup, { maxRounds: 40 });
    expect(match.errors).toEqual([]);
    expect(match.metrics.eventsByKind.UNIT_INFECTED).toBeGreaterThan(0);
    const previews = match.events.flatMap((event) =>
      event.kind === "COMBAT_RESOLVED" ? [event.preview] : [],
    );
    expect(
      previews.some(
        (preview) => preview.attackerHeal > 0 || preview.defenderHeal > 0,
      ),
    ).toBe(true);
    for (const event of match.events)
      if (event.kind === "COMBAT_RESOLVED" || event.kind === "UNIT_INFECTED")
        expect(parseEventV7(event).ok).toBe(true);

    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    let state = created.state;
    let replay = createReplayV7(setup);
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(canonicalHash(state)).toBe(match.stateHash);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
  }, 600_000);
});

function setupWith(factions: readonly FactionIdV7[], seed = 2): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    ...mirrorOptionV7(factions),
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}
