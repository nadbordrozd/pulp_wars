// Whole-game simulations split out of
// ruleset-v7-undead-followups-ai.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  createPlayableGameV7,
  type MatchSetupV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";

// `pulp_wars-vkq.21` Normal AI follow-ups on the seed-2 DRY_LAND two-seat
// revision-13 board (11 x 11; rows 0-4 west of x 6 are open neutral land).
// Seat 0 moves, with every technology; the listed tiles are Shallow Water.

describe("vkq.21 Normal AI: Liches and Vampires stay ashore", () => {
  it("boards other units but never a Lich or Vampire (HU Archipelago 14, seed 22)", () => {
    // The pre-vkq.21 policy embarked a Vampire in round 7 of seed 1 on
    // revision-15 maps. pulp_wars-wwc: revision-16 maps and the growth-first
    // opening delay seed 1's first Undead embarkation past round 12; seed 29
    // embarked three Undead units within 12 rounds. On the village-density
    // boards (`pulp_wars-ykw.2`) seed 22 embarks Undead units within 12
    // rounds (8 of seeds 0-32 do).
    // With 3 starting Coins (`pulp_wars-if6`) seed 22 embarks none within 12
    // rounds; seed 13 embarks four Undead units (9 of seeds 0-32 embark).
    // With tuning 4 (`pulp_wars-w49.3`) seed 13 embarks none; seed 12
    // embarks six (Ghouls and Skeletons; 8 of seeds 0-32 embark).
    // With tuning 6 (`pulp_wars-w49.6`) seed 12 embarks none; seed 15
    // embarks five (Skeletons and Banshees; 9 of seeds 0-32 embark. Seed 4
    // embarks a Skeleton that came out of a chest before round 15, which
    // the role map below would call a Vampire).
    // With tuning 7 (`pulp_wars-w49.10`) seed 15 embarks none; seed 20
    // embarks six (Zombies and Skeletons; 10 of seeds 0-32 embark. Seeds 4,
    // 6, 18, and 25 embark a unit out of a chest, as seed 4 did).
    // With tuning 8 and its correction pass (`pulp_wars-w49.11`) seed 20
    // embarks three (two Zombies and a Skeleton).
    // With the Undead pass (`pulp_wars-w49.13`, 7r51) seed 20 embarks two
    // Zombies and a Skeleton again.
    // With step two of the Undead pass (`pulp_wars-w49.24`, 7r57: the seat
    // trains before it researches) seed 20 embarks a unit out of a chest
    // first; seed 21 embarks seven (a Zombie, a Ghoul, and Skeletons; 27 of
    // seeds 0-32 embark, 9 of them a unit out of a chest).
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
      seed: 21,
      width: 14,
      height: 14,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "UNDEAD"],
      mapType: "ARCHIPELAGO",
    };
    const result = runAiMatchV7(setup, {
      maxRounds: 12,
      recordCheckpointHashes: false,
    });
    const undead = required(
      result.state.players.find((player) => player.faction === "UNDEAD"),
    ).id;
    // Revision 18: the starting unit may be among the first to embark, so
    // the role map starts from the initial state.
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const roles = new Map<number, UnitRoleIdV7>(
      created.state.units.map((unit) => [unit.id, unit.role]),
    );
    const embarked: UnitRoleIdV7[] = [];
    for (const record of result.commandLog)
      for (const event of record.events) {
        if (
          event.kind === "UNIT_TRAINED" ||
          event.kind === "UNIT_REWARD_GRANTED"
        )
          roles.set(event.unitId, event.role);
        if (event.kind === "TREASURE_CAPTURED" && event.spawnedUnitId !== null)
          roles.set(event.spawnedUnitId, "KNIGHT");
        if (event.kind === "UNIT_EMBARKED" && record.playerId === undead)
          embarked.push(required(roles.get(event.unitId)));
      }
    expect(result.errors).toEqual([]);
    expect(embarked.length).toBeGreaterThan(0);
    expect(embarked).not.toContain("CATAPULT");
    expect(embarked).not.toContain("KNIGHT");
  });
});

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}
