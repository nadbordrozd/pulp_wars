// Whole-game simulations split out of
// ruleset-v7-undead-faction.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createPlayableGameV7,
  createReplayV7,
  parseGameStateV7,
  parseReplayJsonV7,
  queryPlayerCommandsV7,
  runReplayV7,
  viewForV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import { mirrorOptionV7 } from "../fixtures/v7-builders";
import { revision13PlayableGameV7 } from "../fixtures/v7-revision13-map";

describe("ruleset-7 per-seat factions", () => {
  it("round-trips mixed factions through save, replay, and checkpoint hashes", () => {
    const setup = setupWith(["UNDEAD", "ORIGINAL"], 7);
    const match = runAiMatchV7(setup, { maxRounds: 8 });
    expect(match.errors).toEqual([]);
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
    expect(replay.checkpoints.at(-1)?.stateHash).toBe(match.stateHash);

    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.factions).toEqual(["UNDEAD", "ORIGINAL"]);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);

    const save = createSaveEnvelopeV7(
      { state, replay },
      "2026-09-29T12:00:00.000Z",
    );
    const loaded = parseSaveV7(JSON.stringify(save));
    expect(loaded).toEqual({ kind: "VALID", save });
    if (loaded.kind !== "VALID") return;
    expect(loaded.save.state.players.map((player) => player.faction)).toEqual([
      "UNDEAD",
      "ORIGINAL",
    ]);
    const swapped = JSON.parse(JSON.stringify(save)) as {
      state: { players: { faction: string; factionTreeId: string }[] };
    };
    const undeadSeat = swapped.state.players[0];
    if (undeadSeat === undefined) throw new Error("seat missing");
    undeadSeat.faction = "ORIGINAL";
    undeadSeat.factionTreeId = "ORIGINAL_BASELINE_V5";
    expect(parseSaveV7(JSON.stringify(swapped)).kind).not.toBe("VALID");
    // Changing only the replay setup changes the canonical start and every
    // checkpoint, so the replay no longer verifies.
    expect(() =>
      runReplayV7({
        ...replay,
        setup: { ...replay.setup, factions: ["ORIGINAL", "ORIGINAL"] },
      }),
    ).toThrow();
  }, 600_000);
});

describe("ruleset-7 all-Human parity digests", () => {
  // Digests of fixed-seed all-Human headless matches with the ruleset
  // identity normalized, first recorded from the revision-12 code (commit
  // 3dddcdd). Revisions 13-15 reproduced them unchanged: revision 14 changes
  // all-Human play only through the village table (VL) and income (E2);
  // these matches start on their revision-13 boards and never reach the E2
  // caps. Revision 16 (`pulp_wars-wwc`) changes all-Human play only through
  // the Normal AI opening (growth-first research and growth harvests before
  // other spending, section 3.6); with those two policy rules disabled the
  // matches still reproduced the revision-12 digests exactly, so the command,
  // event, state, and view digests below are re-recorded from the revision-16
  // code while the map and post-generation PRNG digests are unchanged.
  // Revision 16b (`pulp_wars-zsa`) changes them again only through 2-tile
  // boats (Patrol Boat and embarked Move 2, DISEMBARK spending one point, and
  // the Normal AI's one-cell landing approach, section 5): with Move 3, no
  // landing budget, and no approach bonus restored, both matches reproduced
  // the revision-16a digests exactly. The map and post-generation PRNG
  // digests are unchanged; seed 7 no longer ends by round 17 (its Continents
  // invasion is slower) and now reaches the 30-round cap.
  // Revision 16c (`pulp_wars-4gc`) changes them again only through the
  // economy numbers (research cost slopes, level income cap 4, Market cap
  // 3): the cc5c184 tree with the revision-16b numbers reproduced the
  // revision-16b digests exactly. Map and post-generation PRNG digests,
  // rounds, and terminations are unchanged; seed 7 has 238 commands (was
  // 241) and seed 1234 has 362 (was 363).
  // Revision 17 (`pulp_wars-0ao.2`, identity `pulp-wars-poc-7r17`) reproduces
  // every digest below unchanged: its only all-Human difference is the
  // neutral combat-preview field `gangUp: 0`, removed before hashing like the
  // revision-13 and revision-14 neutral fields.
  // `pulp_wars-0ao.15` (landing ends the activation for every faction,
  // revisions 6 and 16) changes the command, event, final state, view, and
  // command digests: in the 64841f1 matches the Normal AI attacked with a
  // unit it had just landed (seed 7 first at command 55, seed 1234 first at
  // command 342), and each match's first divergence is exactly that Attack,
  // now illegal. With only the old landing activation restored in the
  // reducer, both matches reproduced the previous digests exactly. Map and
  // post-generation PRNG digests, rounds, and terminations are unchanged;
  // seed 7 has 331 commands (was 238) and seed 1234 has 359 (was 362).
  // Revision 18 (`pulp_wars-6gd.2`, identity `pulp-wars-poc-7r18`) changes
  // the command, event, final state, view, and command digests through the
  // movement rules only (friendly pass-through and the Road half cost by
  // origin, with the Normal AI's matching route estimates): the 7r18 tree
  // with `src/engine/v7/movement.ts`, `src/ai/v7.ts`, and
  // `src/ai/v7-endgame.ts` restored to 9b33b7e reproduced the previous
  // digests exactly. Map and post-generation PRNG digests are unchanged;
  // seed 7 now ends by conquest in round 25 with 264 commands (was the
  // 30-round cap with 331) and seed 1234 has 357 commands (was 359).
  // Revision 19 (`pulp_wars-c87.2`, identity `pulp-wars-poc-7r19`) reproduces
  // every digest below unchanged: its only all-Human differences are the
  // empty `eggs` list of the state and the view and the neutral
  // combat-preview fields `stampede: 0`, `acid: false`,
  // `defenderArmoured: false`, and `attackerArmoured: false`, removed before
  // hashing like the earlier neutral fields.
  // Revision 20 (`pulp_wars-0hi.2`, identity `pulp-wars-poc-7r20`) also
  // reproduces every digest: `stampede: 0` is replaced by the neutral
  // `runUp: 0` and `fortificationIgnored: 0`, removed the same way, and
  // neither match promotes a wounded unit (a Promotion now fully heals).
  // Revision 21 (`pulp_wars-9s0.4`, identity `pulp-wars-poc-7r21`) re-pins
  // the command, event, final state, view, and command digests of both
  // matches; map and post-generation PRNG digests are unchanged. Cause: the
  // four new achievements. Each match was compared command by command with
  // the 7r20 tree (93b7823): commands, events, and the state without the
  // four new entitlements are identical until a seat unlocks Sea Dog (seed
  // 7: command 147, round 15, after 146 identical commands; seed 1234:
  // command 234, round 13, after 233), and its Monument changes the match
  // from there. Seed 7 now reaches the 30-round cap with 339 commands (was a
  // conquest in round 25 with 264); seed 1234 still has 357 commands. The
  // four new entitlements and progress entries are removed before hashing.
  // `pulp_wars-9s0.1` (Normal AI campaign plan: jobs by land route, waves,
  // the military share; no rule or identity change) re-pins the command,
  // event, final state, view, and command digests of both matches; map and
  // post-generation PRNG digests are unchanged. Each match was compared
  // command by command with the previous policy (a158cfd): seed 7 first
  // differs at command 26 and seed 1234 at command 18, each a scouting Move
  // to a different tile (two scouts take separate stretches of frontier by
  // route; before, every unit walked to the nearest unexplored tile). Seed 7
  // still reaches the 30-round cap, with 448 commands (was 339); seed 1234
  // has 381 commands (was 357).
  // The Martian revision (`pulp_wars-t6s.2`) reproduces every digest below
  // unchanged: its only all-Human differences are the four empty side lists
  // of the state and the view (`shields`, `cooling`, `mindControlled`,
  // `mindControlCooldowns`), the neutral combat-preview fields
  // `rayPower: "NONE"`, `coolingApplied: false`, `defenderShieldDamage: 0`,
  // and `attackerShieldDamage: 0`, and the neutral `shieldDamage: 0` of
  // splash entries, all removed before hashing like the earlier neutral
  // fields.
  // The Ice Folk revision (`pulp_wars-7g3.3`) reproduces every digest below
  // unchanged as well: its only all-Human differences are the empty
  // `chilled` list of the state and the view, the tile flags `snow: false`
  // and `blizzard: false` of every explored view tile, the `chill: null`
  // unit stat, `curedFrozen: false` in Tend results, and the eight neutral
  // combat-preview fields (`shatters`, `coldBloodApplied`,
  // `rockfallApplied`, `plantedApplied`, `blizzardHalved`, `snowCover`,
  // `sweep`, `hiddenBlizzardPossible`, all false), removed before hashing.
  // `pulp_wars-0hi.3` (revision 20 section 6.3: Human Fighter, Raider, and
  // Marksman 12 HP, Guard 17) re-pins the command, event, final state, view,
  // and command digests of both matches; map and post-generation PRNG
  // digests are unchanged. Every match with a Human seat changes: the
  // starting Fighter already has 12 HP, every exchange with a Human unit
  // resolves on different HP ratios, and the policy values the Human roles
  // by their HP. Seed 7 is now a conquest in round 22 with 232 commands (was
  // the 30-round cap with 448); seed 1234 has 386 commands (was 381).
  // `pulp_wars-if6` (7r41: 3 starting Coins instead of 5, tier 3 technology
  // base cost 9 instead of 12) re-pins the command, event, final state,
  // view, and command digests of both matches; map and post-generation PRNG
  // digests are unchanged. Every opening changes: a first turn has 5 Coins,
  // so no seat buys a unit on it. Seed 7 now reaches the 30-round cap with
  // 466 commands (was a conquest in round 22 with 232); seed 1234 has 341
  // commands (was 386).
  // Tuning 1 (`pulp_wars-w49.3`, 7r46: retaliation, technology costs, the
  // reward and economy numbers) re-pins the same digests of both matches;
  // map and post-generation PRNG digests are unchanged. Seed 7 reaches the
  // cap with 387 commands (was 466) and researches Seamanship, so its
  // combats carry Rams; seed 1234 has 337 commands (was 341). The `ram`,
  // `torpedo`, and `fortificationIgnored` preview fields are hashed now.
  const BASELINE = [
    {
      seed: 7,
      size: 11,
      aiCount: 1,
      aiMode: "RIVAL",
      mapType: "CONTINENTS",
      maxRounds: 30,
      // Tuning 3 (`pulp_wars-w49.3`: the Knight's Attack 4, Forest cover
      // from Forestry, land trade): the match now ends in round 25 (it ran
      // to the cap, 387 commands), and every digest below was recomputed.
      // Tuning 4 (`pulp_wars-w49.3`: research priced by the technologies
      // owned, the reward ladder, land trade 1): the match ends in round 19
      // (206 commands), and every digest below was recomputed.
      // Tuning 5 (`pulp_wars-w49.4`: the Normal AI's army play, the Guard
      // open to ranged attacks, the Swordsman): the match ends in round 23
      // (301 commands), and every digest below was recomputed.
      // Tuning 6 (`pulp_wars-w49.6`: research at 1 Coin a technology owned,
      // the reward unit beside the center, the Normal AI's assault,
      // expansion, and research order): the match ends in round 25 (271
      // commands; round 20 and 228 before the correction pass gave each
      // faction its own research order), and every digest below was
      // recomputed.
      // Tuning 7 (`pulp_wars-w49.10`: the Normal AI's local assault,
      // growth at the unit limit, wartime spending, and target choice):
      // the match ends in round 26 (331 commands), and every digest below
      // but the human's final commands was recomputed.
      // Tuning 8 (`pulp_wars-w49.11`: the capture of a reached center,
      // research on a clock while at war, group sizes): the match ends in
      // round 25 (296 commands), and the same digests were recomputed.
      // Its correction pass: round 24 (284 commands), recomputed.
      // The Martian pass's correction (`pulp_wars-w49.14`: the Human seat's
      // economy-first opening, growth at war, no Guards against shooters,
      // no Knight ahead of its line): round 23 (275 commands), recomputed.
      // The economy rejig (`pulp_wars-w49.16`, 7r54): 218 commands and 19
      // rounds (275 and 23); the hashes below were recomputed with it.
      acceptedCommands: 218,
      rounds: 19,
      termination: "OUTCOME",
      mapHash:
        "251ae814b9c22679f8ed6b288c0a9ae2a06574b84b5b719521970f6f24a3e51c",
      postGenerationPrngHash:
        "a988ca340180a5f62984e0aad88733fb8a247a35228089f59202d66c969776e1",
      commandHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 87c815…d153).
        "9ae0c1b18105562b526d6aafa4319e18157c3616ad8cb35b404f5160fd2044ae",
      eventHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 21337f…0b84).
        "05b2427ec56eea9978eabcf43eebd5315e6d2de8105105a3f1c7555368dff4b7",
      normalizedFinalStateHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // d8241e…d3d1).
        "e437ed39e489e3babb2a459a0bd1d2aecada1759bf77f50157becbc1b018a639",
      normalizedHumanViewHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 0c4cbb…f9c2).
        "654061f7965b6325c09fca47042ae10c38bfeb4788ef0100b45b5738033cba5e",
      normalizedHumanCommandsHash:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    },
    {
      seed: 1234,
      size: 14,
      aiCount: 2,
      aiMode: "COOPERATIVE",
      mapType: "ARCHIPELAGO",
      maxRounds: 18,
      // Tuning 4: 309 commands (337 before), recomputed.
      // Tuning 5: 313 commands, recomputed.
      // Tuning 6 (`pulp_wars-w49.6`): 354 commands, recomputed.
      // Tuning 7 (`pulp_wars-w49.10`): 365 commands, recomputed.
      // Tuning 8 (`pulp_wars-w49.11`): 364 commands, recomputed.
      // The economy rejig (`pulp_wars-w49.16`, 7r54): 338 commands (364);
      // the hashes below were recomputed with it.
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56: the Guard at
      // Fortification, one technology behind the root, and the Workshop at
      // the root): 357 commands (338); the five digests of play below were
      // recomputed, and the map and the post-generation PRNG digests are
      // unchanged. (The seed-7 match above is unchanged: no seat of it
      // buys the root.)
      // Step two of the Human pass (`pulp_wars-w49.22`: what a Human seat
      // of the Normal AI trains in a threatened city and with Coins kept
      // for a technology): 365 commands (357); the five digests of play
      // below were recomputed, the map and the post-generation PRNG
      // digests are unchanged, and so is the seed-7 match above.
      acceptedCommands: 365,
      rounds: 19,
      termination: "ROUND_CAP",
      mapHash:
        "a336769650f1bebe201dce1d1db118a695454f4ff534e90fbdf91f4b18cc5ea5",
      postGenerationPrngHash:
        "b11910d95aeab8c56bbf6f72f63d4e6f6b30f7e43f842d8354e7badf23e1050c",
      commandHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // f0241a…e2f2).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 29fd88…71a3).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 253847…8b8c).
        "dac6168851b4b6fe1495b56bc3affad1dc0abc9e83da965b10f3746eaa827a74",
      eventHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 6194fb…cc7c).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // a75ebd…9f75).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 72340f…2f4c).
        "c9421318c670efc61653ce082663d3b68b27647a6e9957fe59a0978859013ede",
      normalizedFinalStateHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 1f799a…0828).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 9c21de…5fb4).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 4638a2…1bc5).
        "8a36e1e2e4951ae35e442d07ebfcae35db6ce5a9bd08085fee2c74a211d60864",
      normalizedHumanViewHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 6111b8…5070).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 7825d2…a1b8).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // 800648…83f9).
        "92c4d78c157733325e29f7d855741fd069a93583f6b35c41e73e0e4294eac25f",
      normalizedHumanCommandsHash:
        // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
        // 75cd99…98bf).
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
        // 881121…ae25).
        // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
        // b7c041…ae40).
        "d6186d19f519841d5cd69e3f72e624fe8d8db49fa8875f73bb05eb9bfad21e5a",
    },
  ] as const;

  for (const baseline of BASELINE)
    it(`reproduces the revision-16 all-Human match for seed ${baseline.seed} apart from identity`, () => {
      const setup: MatchSetupV7 = {
        rulesetId: RULESET_7_ID,
        seed: baseline.seed,
        width: baseline.size,
        height: baseline.size,
        aiCount: baseline.aiCount,
        aiDifficulty: "NORMAL",
        aiMode: baseline.aiMode,
        humanColor: "CORAL",
        factions: Array.from(
          { length: baseline.aiCount + 1 },
          () => "ORIGINAL" as const,
        ),
        // pulp_wars-w5j.1: a Human mirror through the test only option.
        allowDuplicateFactions: true,
        mapType: baseline.mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
        curiosities: false,
      };
      const result = runAiMatchV7(setup, {
        maxRounds: baseline.maxRounds,
        initialGame: revision13PlayableGameV7(setup),
      });
      // Revision 13 adds the neutral `graves: []` field to state and view;
      // parity is defined apart from identity and neutral values.
      const humanView = viewForV7(result.state, result.state.humanPlayerId);
      expect(result.state.graves).toEqual([]);
      expect(humanView.graves).toEqual([]);
      expect(result.metrics.eventsByKind.GRAVE_CREATED).toBe(0);
      expect(result.metrics.eventsByKind.UNIT_INFECTED).toBe(0);
      // Revision 14 afflictions never occur without Undead units.
      expect(result.state.plagued).toEqual([]);
      expect(result.state.bitten).toEqual([]);
      expect(humanView.plagued).toEqual([]);
      expect(humanView.bitten).toEqual([]);
      for (const kind of [
        "PLAGUE_DAMAGED",
        "PLAGUE_SPREAD",
        "PLAGUE_CLEARED",
        "BITTEN_UNIT_RISEN",
      ] as const)
        expect(result.metrics.eventsByKind[kind] ?? 0).toBe(0);
      // Revision 13 adds neutral Lifesteal/Infect fields to every combat
      // preview; they must be neutral and are removed before hashing.
      // Revision 14 adds neutral Plague/Bitten preview fields and Tend cure
      // flags; they must be neutral and are removed before hashing too.
      const neutralEvents = result.events.map((event) => {
        if (event.kind === "WOUNDED_TENDED")
          return {
            ...event,
            results: event.results.map(
              ({ curedPlague, curedBitten, curedFrozen, ...rest }) => {
                expect({ curedPlague, curedBitten, curedFrozen }).toEqual({
                  curedPlague: false,
                  curedBitten: false,
                  curedFrozen: false,
                });
                return rest;
              },
            ),
          };
        if (event.kind !== "COMBAT_RESOLVED") return event;
        const {
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
          plagued,
          attackerBitten,
          defenderBitten,
          attackerBittenRises,
          defenderBittenRises,
          gangUp,
          runUp,
          fortificationIgnored,
          acid,
          defenderArmoured,
          attackerArmoured,
          rayPower,
          coolingApplied,
          defenderShieldDamage,
          attackerShieldDamage,
          splash: shieldedSplash,
          shatters,
          coldBloodApplied,
          rockfallApplied,
          plantedApplied,
          blizzardHalved,
          snowCover,
          sweep,
          hiddenBlizzardPossible,
          dugIn,
          unflinchingApplied,
          platedApplied,
          sugarRushApplied,
          splatApplied,
          bounce,
          bounceTo,
          ram,
          torpedo,
          iceCover,
          icebound,
          shockDamage,
          crackApplied,
          frostbiteApplied,
          ...previewWithoutSplash
        } = event.preview;
        // The ninth unit (`pulp_wars-w49.17`, 7r55): three neutral fields
        // (no Human unit has a Shock Field, cracks, or frostbites).
        expect([shockDamage, crackApplied, frostbiteApplied]).toEqual([
          0,
          false,
          false,
        ]);
        // The frozen sea (pulp_wars-5ti.3): two neutral fields.
        expect([iceCover, icebound]).toEqual([false, false]);
        // The naval branch (pulp_wars-5ti.2): two fields that were neutral
        // while no seat researched Seamanship or Submersibles. Since tuning
        // 1 (`pulp_wars-w49.3`, 7r46: cheaper technology with many cities)
        // the seed-7 match researches Seamanship and rams, so they stay in
        // the hashed preview (below), like `fortificationIgnored`, which a
        // Breach now sets in an all-Human match.
        // The Candy revision (pulp_wars-jdb.3): four neutral fields.
        expect([sugarRushApplied, splatApplied, bounce, bounceTo]).toEqual([
          false,
          false,
          "NONE",
          null,
        ]);
        // The Dwarf revision (pulp_wars-78i.3): three neutral fields.
        expect([dugIn, unflinchingApplied, platedApplied]).toEqual([
          false,
          false,
          false,
        ]);
        // The Ice Folk revision: eight neutral combat-preview fields.
        expect([
          shatters,
          coldBloodApplied,
          rockfallApplied,
          plantedApplied,
          blizzardHalved,
          snowCover,
          sweep,
          hiddenBlizzardPossible,
        ]).toEqual([false, false, false, false, false, false, false, false]);
        // The Martian revision: the four neutral combat-preview fields and
        // the neutral `shieldDamage: 0` of every splash entry.
        expect({
          rayPower,
          coolingApplied,
          defenderShieldDamage,
          attackerShieldDamage,
        }).toEqual({
          rayPower: "NONE",
          coolingApplied: false,
          defenderShieldDamage: 0,
          attackerShieldDamage: 0,
        });
        const preview = {
          ...previewWithoutSplash,
          ram,
          torpedo,
          fortificationIgnored,
          splash: shieldedSplash.map(({ shieldDamage, ...entry }) => {
            expect(shieldDamage).toBe(0);
            return entry;
          }),
        };
        expect({
          runUp,
          acid,
          defenderArmoured,
          attackerArmoured,
        }).toEqual({
          runUp: 0,
          acid: false,
          defenderArmoured: false,
          attackerArmoured: false,
        });
        expect({
          gangUp,
          attackerHeal,
          defenderHeal,
          attackerInfected,
          defenderInfected,
          plagued,
          attackerBitten,
          defenderBitten,
          attackerBittenRises,
          defenderBittenRises,
        }).toEqual({
          gangUp: 0,
          attackerHeal: 0,
          defenderHeal: 0,
          attackerInfected: false,
          defenderInfected: false,
          plagued: [],
          attackerBitten: false,
          defenderBitten: false,
          attackerBittenRises: false,
          defenderBittenRises: false,
        });
        return { ...event, preview };
      });
      expect(
        result.events.some((event) => event.kind === "COMBAT_RESOLVED"),
      ).toBe(true);
      expect(result.metrics.eventHash).toBe(canonicalHash(result.events));
      const normalize = (value: unknown): unknown => {
        const {
          graves: _graves,
          plagued: _plagued,
          bitten: _bitten,
          eggs,
          shields,
          cooling,
          mindControlled,
          mindControlCooldowns,
          frozen,
          burrowed,
          surfacedThisTurn,
          bombedThisTurn,
          ...rest
        } = value as {
          graves: unknown;
          plagued: unknown;
          bitten: unknown;
          eggs: unknown;
          shields: unknown;
          cooling: unknown;
          mindControlled: unknown;
          mindControlCooldowns: unknown;
          frozen: unknown;
          burrowed: unknown;
          surfacedThisTurn: unknown;
          bombedThisTurn: unknown;
        };
        void _graves;
        void _plagued;
        void _bitten;
        expect(eggs).toEqual([]);
        // The Martian revision: four empty side lists in state and view.
        expect({
          shields,
          cooling,
          mindControlled,
          mindControlCooldowns,
        }).toEqual({
          shields: [],
          cooling: [],
          mindControlled: [],
          mindControlCooldowns: [],
        });
        // The Ice Folk revision: the empty Chill list (`frozen` since Ice
        // Folk Freeze, `pulp_wars-w49.37`), and the neutral tile flags and
        // unit stat, removed (any other value fails the match).
        expect(frozen).toEqual([]);
        // The Dwarf revision (pulp_wars-78i.3): three empty lists.
        expect([burrowed, surfacedThisTurn, bombedThisTurn]).toEqual([
          [],
          [],
          [],
        ]);
        let winterValues = 0;
        const neutral = JSON.parse(
          JSON.stringify(rest).replaceAll(RULESET_7_ID, "IDENTITY"),
          function (key, item: unknown) {
            if ((key === "snow" || key === "blizzard") && item === false)
              return undefined;
            if (key === "frozen" && item === null) return undefined;
            // pulp_wars-5ti.2: the two naval-branch unit facts of a view, at
            // their neutral values (no seat ever holds Submersibles or
            // Seamanship here, so nothing is submerged; the boarding
            // threshold is a constant of the ship).
            if (key === "submerged" && item === false) return undefined;
            if (key === "boardableAt") return undefined;
            // The Patrol Boat's ability list names Ram (naval branch
            // section 2.1); it does nothing before Seamanship.
            if (key === "abilities" && Array.isArray(item))
              return item.filter((ability) => ability !== "RAM");
            // pulp_wars-ykw.2: the map revision a setup names (V3 since the
            // village density); the digests hash the name they were taken
            // with, like the identity.
            if (key === "mapGenerationRevision")
              return "REGIONAL_BIOMES_NAVAL_V2";
            // pulp_wars-w5j.1: the test only mirror option in the setup of
            // this all-Human match; parity is defined apart from it.
            if (key === "allowDuplicateFactions" && item === true)
              return undefined;
            // pulp_wars-737.2: the setup's `curiosities: false` and the empty
            // curiosity list of state and view (any other value fails).
            if (
              key === "curiosities" &&
              (item === false || (Array.isArray(item) && item.length === 0))
            )
              return undefined;
            // pulp_wars-5ti.3: the empty ice list of state and view (an
            // all-Human match never Freezes).
            if (key === "ice" && Array.isArray(item) && item.length === 0)
              return undefined;
            // pulp_wars-737.3: the empty Monster list of state and view.
            if (key === "monsters" && Array.isArray(item) && item.length === 0)
              return undefined;
            // pulp_wars-1wy.3: the empty per-turn Martian lists of state
            // and view (an all-Human match never fills them).
            if (
              (key === "beamedThisTurn" || key === "tractorUsedThisTurn") &&
              Array.isArray(item) &&
              item.length === 0
            )
              return undefined;
            // pulp_wars-jdb.3: the four empty Candy lists of state and view
            // (an all-Human match never fills them).
            if (
              (key === "sugarRush" ||
                key === "crumbs" ||
                key === "splattedThisTurn" ||
                key === "tossedThisTurn" ||
                // pulp_wars-w49.15: the empty hunted list (Pack Hunt).
                key === "huntedThisTurn" ||
                // pulp_wars-w49.35: the empty Berserk list.
                key === "berserkThisTurn" ||
                // pulp_wars-ty6i: the empty Terror and Feast lists.
                key === "terrorThisTurn" ||
                key === "feastedThisTurn") &&
              Array.isArray(item) &&
              item.length === 0
            )
              return undefined;
            // The ninth unit (`pulp_wars-w49.17`, 7r55): the empty
            // `ninthUnit` record of state and view (an all-Human match has
            // no Wight, Stegosaurus, or Whirligig).
            if (key === "ninthUnit") {
              expect(item).toEqual({
                wightGraves: [],
                risenWights: [],
                crackedThisTurn: [],
              });
              return undefined;
            }
            // Dwarf crowd control (`pulp_wars-w49.33`): the empty
            // `barricades` list of state and view.
            if (
              key === "barricades" &&
              Array.isArray(item) &&
              item.length === 0
            )
              return undefined;
            // The giants' signatures (`pulp_wars-w49.30`): the empty
            // `giants` record of state and view.
            if (key === "giants") {
              expect(item).toEqual({ swallowed: [] });
              return undefined;
            }
            // The Cult's Favour (`pulp_wars-mch9.4`): the empty `cult`
            // record of state and view.
            if (key === "cult") {
              expect(item).toEqual({ favour: [] });
              return undefined;
            }
            // Score and modes (`pulp_wars-kaw6.2`): the state's score
            // ledger and the view's score (its `score` block and every
            // leaderboard entry's total) are new facts that change no play;
            // the commands and events above are unchanged.
            if (key === "scoreLedger" || key === "score") return undefined;
            if (key === "snow" || key === "blizzard" || key === "chill")
              winterValues += 1;
            return item;
          },
        ) as {
          players: { achievementEntitlements?: unknown[] }[];
          viewer?: { achievementEntitlements: unknown[] };
          achievementProgress?: unknown[];
        };
        expect(winterValues).toBe(0);
        // Revision 21 appends four entitlements (and, in a view, four
        // progress entries) after the revision-5 three; they are removed
        // before hashing.
        const trimmed = <T extends { achievementEntitlements?: unknown[] }>(
          player: T,
        ): T =>
          player.achievementEntitlements === undefined
            ? player
            : {
                ...player,
                achievementEntitlements: player.achievementEntitlements.slice(
                  0,
                  3,
                ),
              };
        return {
          ...neutral,
          players: neutral.players.map(trimmed),
          ...(neutral.viewer === undefined
            ? {}
            : { viewer: trimmed(neutral.viewer) }),
          ...(neutral.achievementProgress === undefined
            ? {}
            : { achievementProgress: neutral.achievementProgress.slice(0, 3) }),
        };
      };
      expect({
        acceptedCommands: result.acceptedCommands,
        rounds: result.rounds,
        termination: result.termination,
        mapHash: result.metrics.mapHash,
        postGenerationPrngHash: result.metrics.postGenerationPrngHash,
        commandHash: result.metrics.commandHash,
        eventHash: canonicalHash(neutralEvents),
        normalizedFinalStateHash: canonicalHash(normalize(result.state)),
        normalizedHumanViewHash: canonicalHash(normalize(humanView)),
        normalizedHumanCommandsHash: canonicalHash(
          // pulp_wars-5ti.2: apart from the Research offers for the two
          // naval-branch technologies.
          queryPlayerCommandsV7(
            result.state,
            result.state.humanPlayerId,
          ).filter(
            (command) =>
              command.kind !== "RESEARCH" ||
              (command.tech !== "SEAMANSHIP" &&
                command.tech !== "SUBMERSIBLES"),
          ),
        ),
      }).toEqual({
        acceptedCommands: baseline.acceptedCommands,
        rounds: baseline.rounds,
        termination: baseline.termination,
        mapHash: baseline.mapHash,
        postGenerationPrngHash: baseline.postGenerationPrngHash,
        commandHash: baseline.commandHash,
        eventHash: baseline.eventHash,
        normalizedFinalStateHash: baseline.normalizedFinalStateHash,
        normalizedHumanViewHash: baseline.normalizedHumanViewHash,
        normalizedHumanCommandsHash: baseline.normalizedHumanCommandsHash,
      });
    }, 600_000);
});

describe("ruleset-7 Normal AI with Undead seats", () => {
  it("plays Undead-vs-Undead and Undead-vs-Human matches deterministically without errors", () => {
    for (const factions of [
      ["UNDEAD", "UNDEAD"],
      ["ORIGINAL", "UNDEAD"],
    ] as const) {
      const setup = setupWith(factions, 7);
      const first = runAiMatchV7(setup, { maxRounds: 12 });
      expect(first.errors).toEqual([]);
      expect(first.stalls).toEqual([]);
      expect(first.acceptedCommands).toBeGreaterThan(20);
      expect(parseGameStateV7(first.state)).not.toBeNull();
      expect(runAiMatchV7(setup, { maxRounds: 12 }).stateHash).toBe(
        first.stateHash,
      );
    }
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
