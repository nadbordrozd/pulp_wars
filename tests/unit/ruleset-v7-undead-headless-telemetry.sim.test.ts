// Whole-game simulations split out of
// ruleset-v7-undead-headless-telemetry.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  UNIT_ROLE_IDS_V7,
  type FactionIdV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { runAiMatchV7, runAiBatchV7 } from "../../src/headless/v7";
import { mirrorOptionV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-13 headless Undead telemetry", () => {
  it("reconciles role damage with every combat, splash, and Wail event in an AI match", () => {
    // Seed 5 fields Lich splashes within 45 rounds on the many-seats boards
    // (`pulp_wars-ykw.3`; seed 2 before, see the area-attack
    // tests; seed 15 until the 3 starting Coins of `pulp_wars-if6`). Seed 12
    // since tuning 1 (`pulp_wars-w49.3`, 7r46), and seed 3 since tuning 3.
    // Seed 5 since tuning 6 (`pulp_wars-w49.6`: seed 3 trains its one Lich
    // too late to splash; seeds 2, 5, 8, 9, 10, and 14 of 0-15 splash).
    // Seed 0 since tuning 7 (`pulp_wars-w49.10`: seed 5 is over in round
    // 31 without a Lich; seeds 0, 3, 7, 14, and 15 of 0-15 splash).
    // Seed 8 since the ninth unit (`pulp_wars-w49.17`, 7r55: the Lich of
    // seed 0 never splashes; seeds 3, 6, 8, 10, 14, 15, and 18 of 0-19 do).
    // Seed 9 since the Industry reshuffle (`pulp_wars-w49.21`, 7r56: seed
    // 8 trains no Lich; seeds 6, 9, 14, 15, 17, and 18 of 0-19 splash).
    // Seed 6 since step two of the Human pass (`pulp_wars-w49.22`: what a
    // Human seat of the Normal AI trains; seed 9 no longer splashes; seeds
    // 6, 10, 15, and 18 of 0-19 do).
    const match = runAiMatchV7(setupWith(["UNDEAD", "ORIGINAL"], 6), {
      maxRounds: 45,
    });
    expect(match.errors).toEqual([]);
    let damage = 0;
    let kills = 0;
    let splash = 0;
    let wail = 0;
    let heal = 0;
    for (const event of match.events) {
      if (event.kind === "COMBAT_RESOLVED") {
        const preview = event.preview;
        const splashDamage = preview.splash.reduce(
          (sum, entry) => sum + entry.damage,
          0,
        );
        splash += splashDamage;
        damage +=
          preview.damageToDefender + preview.damageToAttacker + splashDamage;
        kills +=
          Number(preview.defenderDies) +
          Number(preview.attackerDies && preview.damageToAttacker > 0) +
          preview.splash.filter((entry) => entry.dies).length;
        heal += preview.attackerHeal + preview.defenderHeal;
      }
      if (event.kind === "WAIL_RESOLVED") {
        const wailDamage = event.results.reduce(
          (sum, entry) => sum + entry.damage,
          0,
        );
        wail += wailDamage;
        damage += wailDamage;
        kills += event.results.filter((entry) => entry.dies).length;
      }
    }
    const metrics = match.metrics;
    const total = (record: Record<UnitRoleIdV7, number>) =>
      UNIT_ROLE_IDS_V7.reduce((sum, role) => sum + record[role], 0);
    expect(splash).toBeGreaterThan(0);
    expect(total(metrics.roles.damage)).toBe(damage);
    expect(total(metrics.roles.kills)).toBe(kills);
    expect(
      total(metrics.factionRoles.UNDEAD.damage) +
        total(metrics.factionRoles.ORIGINAL.damage),
    ).toBe(damage);
    expect(metrics.undead.splashDamage).toBe(splash);
    expect(metrics.undead.wailDamage).toBe(wail);
    expect(metrics.undead.lifestealHealing).toBe(heal);
    expect(metrics.undead.infections).toBe(metrics.eventsByKind.UNIT_INFECTED);
    expect(metrics.undead.infections).toBe(
      metrics.undead.infectionsOnAttack +
        metrics.undead.infectionsOnRetaliation,
    );
    expect(metrics.undead.gravesCreated).toBe(
      metrics.eventsByKind.GRAVE_CREATED,
    );
    expect(metrics.undead.raiseDeadUses).toBe(metrics.eventsByKind.DEAD_RAISED);
    expect(metrics.undead.devours).toBe(metrics.eventsByKind.GRAVE_DEVOURED);
    expect(metrics.undead.gravesRemaining).toBe(match.state.graves.length);
    expect(
      total(metrics.factionRoles.UNDEAD.trained) +
        total(metrics.factionRoles.ORIGINAL.trained),
    ).toBe(total(metrics.roles.trained));
    expect(metrics.capacity.overcapacityStates).toBe(
      metrics.capacity.overcapacityStatesByFaction.ORIGINAL +
        metrics.capacity.overcapacityStatesByFaction.UNDEAD,
    );
  }, 600_000);

  it("passes seat-ordered factions through the batch runner", async () => {
    const batch = await runAiBatchV7({
      seeds: [0],
      curiosities: false,
      aiCounts: [1],
      mapTypes: ["DRY_LAND"],
      factions: ["UNDEAD", "ORIGINAL"],
      maxCommands: 4,
      maxRounds: 5,
    });
    expect(batch.entries[0]?.factions).toEqual(["UNDEAD", "ORIGINAL"]);
    expect(batch.entries[0]?.metrics.factionsBySeat).toEqual([
      "UNDEAD",
      "ORIGINAL",
    ]);
    await expect(
      runAiBatchV7({
        seeds: [0],
        curiosities: false,
        aiCounts: [1, 2],
        factions: ["UNDEAD", "ORIGINAL"],
        maxCommands: 4,
      }),
    ).rejects.toThrow(/one entry per seat/);
  });
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
