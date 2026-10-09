// Whole-game simulations split out of
// ruleset-v7-curiosities.test.ts (`pulp_wars-bwry`): they
// play AI matches, so they run only in `npm run test:sim`.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalHash,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  parseEventV7,
  parseGameStateV7,
  parseReplayJsonV7,
  runReplayV7,
  type FactionIdV7,
  type MapTypeV7,
} from "../../src/engine/index";
import { runAiBatchV7, runAiMatchV7 } from "../../src/headless/v7";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import {
  generatedSetup,
  normalizedInitialState,
} from "./ruleset-v7-curiosities.shared";

// Map curiosities, engine I (`pulp_wars-737.2`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 3 to 7, 10, and 13):
// the setup option, placement on its own stream after the Rifts, the
// byte-identical "off" parity with the 7r34 generator and matches, the
// Fountain of Youth, the Shrine, and the Sunken Wreck with their events,
// projection, view, and persistence. The on/off generation check of 150
// boards is in `ruleset-v7-curiosity-generation.test.ts`
// (`pulp_wars-737.8`).

// --------------------------------------------------------- Setup ---

// ---------------------------------------------------- Generation ---

// ------------------------------------------------------ Headless ---

describe("headless parity and the CLI flag", () => {
  it("with the option off plays the pinned matches command for command across map types and factions (recomputed at 7r42)", () => {
    // Computed on main at 7r34 (8540406a): runAiMatchV7 with
    // { maxCommands: 250, maxRounds: 40 }. The Martian and Ice Folk balance
    // round (`pulp_wars-1wy.3`, 7r37) changes, by design, every match with
    // a Martian or Ice Folk seat: the Human against Undead pin is still the
    // 7r34 one (no change without such a seat), and the command and event
    // hashes and rounds of the other four were recomputed at 7r37 (their
    // maps and PRNG ends are the 7r34 ones: generation is untouched). The
    // Martian mobility play (`pulp_wars-1wy.4`, a Normal AI change on 7r37)
    // moved the Pangea pin (its Martian seat buys and uses carriers); the
    // Archipelago pin with a Martian seat and the three pins without one
    // did not move. The Grunt's 8 HP (`pulp_wars-1wy.6`, 7r39) moved the
    // Pangea pin again (commands, events, and rounds; map and PRNG end as
    // before): the Goblin human seat now falls to the Dinosaurs in round
    // 14, after 248 commands, before the cap. The Archipelago pin with a
    // Martian seat did not move. The village density (`pulp_wars-ykw.2`, 7r40)
    // regenerates every board, so all five pins (maps, PRNG ends, commands,
    // events, and rounds) were recomputed at 7r40; the 7r34 boards
    // themselves are held by the parity test above.
    // The early economy tweak (`pulp_wars-if6`, 7r41: 3 starting Coins, tier
    // 3 technology base cost 9) changes every opening, so the command and
    // event hashes of all five pins were recomputed at 7r41, with the rounds
    // of the Pangea and Archipelago pins and the PRNG end of the Pangea pin;
    // the maps did not change.
    // Many seats (`pulp_wars-ykw.3`, 7r42) regenerates every board again
    // (capitals in domains, the long side lakes), so all five pins (maps,
    // PRNG ends, commands, events, and rounds) were recomputed at 7r42; the
    // 7r41 boards are held by the V3 parity rules
    // (tests/unit/ruleset-v7-map-scale.test.ts).
    // Tuning 1 (`pulp_wars-w49.3`, 7r46: retaliation, technology costs, the
    // reward and economy numbers) changes every match, so the command and
    // event hashes of all five pins were recomputed at 7r46 (the Archipelago
    // match keeps its commands and changes only its events), with the
    // rounds of the Dry Land pin (16, was 17); the maps and the PRNG ends
    // did not change. Tuning 2 (7r47: no ranged unit advances, the Human
    // Knight captures) moved the commands and events of the Pangea pin (the
    // only one with a Martian seat); the other four are unchanged. Tuning 3
    // (`pulp_wars-w49.3`: the Knight's Attack, Forest cover from Forestry,
    // land trade, Blast Mountain) recomputed the commands and events of
    // the pins it moved (the Dry Land one is back at 17 rounds).
    const pins: readonly {
      readonly mapType: MapTypeV7;
      readonly factions: readonly FactionIdV7[];
      readonly seed: number;
      readonly rounds: number;
      /** Fewer than the cap of 250 only when the match ended first. */
      readonly acceptedCommands?: number;
      readonly commandHash: string;
      readonly eventHash: string;
      readonly mapHash: string;
      readonly finalPrngHash: string;
    }[] = [
      {
        mapType: "DRY_LAND",
        factions: ["ORIGINAL", "UNDEAD"],
        seed: 3,
        // Tuning 4 (`pulp_wars-w49.3`): 18 rounds (17 before), recomputed.
        // Tuning 5 (`pulp_wars-w49.4`, the Normal AI's army play):
        // recomputed.
        // Tuning 6 (`pulp_wars-w49.6`: research at 1 Coin a technology
        // owned, the Normal AI's assault, expansion, and research order):
        // recomputed.
        // Tuning 7 (`pulp_wars-w49.10`: the Normal AI's local assault,
        // growth at the unit limit, wartime spending, and target choice):
        // 17 rounds (18 before), recomputed. The four pins below have a
        // seat outside the army play and are unchanged.
        // Tuning 8 (`pulp_wars-w49.11`: the capture of a reached center,
        // research on a clock while at war, group sizes): 15 rounds,
        // recomputed; the four pins below are unchanged again.
        // Its correction pass (the research clock under pressure, the
        // battery, the weak garrison): 16 rounds, recomputed (the final
        // PRNG state too: the match ends a round later).
        // The Goblin pass, correction (`pulp_wars-w49.12`: the Human
        // seat's research order): 17 rounds, recomputed.
        // The Undead pass (`pulp_wars-w49.13`: Bones, the Vampire's
        // Escape, Undead Scouts, the Undead seat's research order and
        // shares): 15 rounds, recomputed (the board and the final PRNG
        // state are unchanged). Its correction (the Undead seat's opening
        // and economy rules, the Human seat's answer to Zombies): 15
        // rounds still, recomputed.
        // The Industry reshuffle (`pulp_wars-w49.21`, 7r56: the defender
        // of every faction at Fortification, one technology behind the
        // root): recomputed for every pin of this list (the boards and the
        // final PRNG states are unchanged), 17 rounds here.
        // Step two of the Undead pass (`pulp_wars-w49.24`, 7r57: a rising
        // of 12 HP, and the Undead seat trains before it researches while
        // it is short of units): 18 rounds, recomputed (commands were
        // 56746d…1226, events 08f0db…7fd8); the board and the final PRNG
        // state are unchanged, and so are the four pins below.
        rounds: 18,
        // The Martian pass's correction (`pulp_wars-w49.14`: the Human
        // seat's economy-first opening, growth at war, and Knights):
        // recomputed, 15 rounds still.
        commandHash:
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // 520b30…afe0).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 1eb537…ca55).
          // Step two of the Human pass (`pulp_wars-w49.22`: what a Human
          // seat of the Normal AI trains): recomputed (was d1beda…64cb), 17
          // rounds still; the board and the final PRNG state are unchanged.
          "8b7c92ecd19ec9fcf3cda5b087e505140c5ba737b73c7d036c9b7195d5884f5f",
        eventHash:
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // bd5818…355f).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 1448d4…47f4).
          // Step two of the Human pass (`pulp_wars-w49.22`): recomputed (was
          // a5db4a…efec).
          "c6efafd4b23acf54f9427bbcfaed57a39d70d6cfd89e9823bc1798f7f0b4004e",
        mapHash:
          "1f6ad08d476884229d6cb8a7319ea209b8667cf4e28e24cd07352ebafc3055de",
        finalPrngHash:
          "6ecdac89b46e4cbd434c0c8eec3723232d5419d7308165da635935e8d0fbcca1",
      },
      {
        mapType: "PANGEA",
        factions: ["GOBLIN", "DINOSAUR", "MARTIAN"],
        seed: 11,
        // Tuning 6 (`pulp_wars-w49.6`): research costs 1 Coin a technology
        // owned for every faction, so every match changes at its third
        // technology: 14 rounds (15 before), recomputed. The same holds for
        // the three pins below. The Goblin pass (`pulp_wars-w49.12`, 7r50):
        // the Goblin seat's level-2 Survey grants a Wolf Rider (Scouts), so
        // this pin, the one with a Goblin seat, was recomputed; the map and
        // the PRNG are unchanged. The Dinosaur pass (`pulp_wars-w49.15`,
        // 7r53): a Dinosaur seat plays the army rules, and so do the
        // Goblin and Martian seats beside it (a Dinosaur seat switched
        // them off before); its Survey grants a Raptor: recomputed, 12
        // rounds (14 before; commands c23258…bcff, events d0be88…7572).
        // Its correction (Nesting takes no turn off, the Dinosaur seat's
        // Ankylosaurus cap and garrison): recomputed, 12 rounds still.
        // The economy rejig (`pulp_wars-w49.16`, 7r54; research priced by
        // the cities owned, Monuments +3, the harder achievements):
        // recomputed for every pin of this list, 13 rounds here.
        // Step two of the Martian pass (`pulp_wars-w49.25`, 7r58: the
        // Martian seat trains before it researches while it is short of
        // units, takes the free Saucer, and researches in a new order):
        // 12 rounds, recomputed (the commands and the events); the board
        // and the final PRNG state are unchanged. The Archipelago pin, the
        // other one with a Martian seat, was recomputed too; the three
        // pins without one are unchanged.
        // Step two of the Dinosaur pass (`pulp_wars-w49.26`, no rule and
        // no identity change: the Dinosaur seat researches the Spitter and
        // the Raptor before the Triceratops and trains before it researches
        // while it is short of units): 12 rounds still, recomputed (the
        // commands and the events); the board and the final PRNG state are
        // unchanged, and so are the other four pins, which have no
        // Dinosaur seat.
        rounds: 12,
        commandHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // b030da…af4c).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 4bc504…6f14).
          // Step two of the Goblin pass (`pulp_wars-w49.23`): recomputed (was
          // ed5934…6bf4).
          // Step two of the Martian pass (`pulp_wars-w49.25`): recomputed (was
          // c99053…81a8).
          // Step two of the Dinosaur pass (`pulp_wars-w49.26`): recomputed
          // (was 8bce76…e78f).
          "600a5bac1a9b86e076841ea8399d05072f13d2ab259a898623bca6da2b113373",
        eventHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // 6f55cd…6484).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 3d8b8f…1845).
          // Step two of the Goblin pass (`pulp_wars-w49.23`): recomputed (was
          // bde7a3…b117).
          // Step two of the Martian pass (`pulp_wars-w49.25`): recomputed (was
          // ac5451…4589).
          // Step two of the Dinosaur pass (`pulp_wars-w49.26`): recomputed
          // (was e0c73d…a617).
          "11b11fcf758fee4206ee635dce06d5fd00f48c3e0ab74a503ae0fd7b28cf7cc1",
        mapHash:
          "5b286bbe8cdb2f8a339cd7a74ba219bc2b57a4322370548442b3c8f26bef4ad9",
        finalPrngHash:
          "8cdb862599e395d0cae5c157a7ff48acd492cd2082bab7c6dfb32c3337c6c4df",
      },
      {
        mapType: "CONTINENTS",
        // The frozen sea (`pulp_wars-5ti.3`, 7r44): an Ice Folk seat has no
        // ships, so this match was recomputed at 7r44 (the same board; it
        // was 18 rounds, commands 2c1c37…d518, events bd9d09…7c62).
        factions: ["ICE_FOLK", "DWARF"],
        seed: 5,
        // Tuning 6: 20 rounds (22 before). The economy rejig: 19.
        // The ninth unit (7r55): 18 rounds (19 before).
        // The Industry reshuffle (7r56): 18 rounds again.
        // Step two of the Ice Folk pass (`pulp_wars-w49.27`, 7r59: an Ice
        // Folk seat's level-2 Survey grants a Sled, Scouts): 17 rounds,
        // recomputed (the commands and the events); the board and the
        // final PRNG state are unchanged. The other four pins are
        // unchanged: the Lakes one has an Ice Folk seat that takes no
        // Survey within its 250 commands.
        // Step two of the Dwarf pass (`pulp_wars-w49.28`: a Dwarf seat plays
        // the army rules, so both seats here do): 21 rounds, recomputed (the
        // commands and the events); the board and the final PRNG state are
        // unchanged.
        rounds: 21,
        commandHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // 9f171d…eba6).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // fd31d2…5e68).
          // Step two of the Ice Folk pass (`pulp_wars-w49.27`, 7r59):
          // recomputed (was 9b3f26…3d95).
          // Step two of the Dwarf pass (`pulp_wars-w49.28`): recomputed (was
          // 6ea77a…4bfb).
          "5af3198e087acfc3be00a4e2faa5c302c54e82ded97a027adbf015ff3dffec2d",
        eventHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // b0de91…c9cf).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 1dfe18…8d4d).
          // Step two of the Ice Folk pass (`pulp_wars-w49.27`, 7r59):
          // recomputed (was 2aee4f…2671).
          // Step two of the Dwarf pass (`pulp_wars-w49.28`): recomputed (was
          // 16a4dd…d1f6).
          "c474657bf2aeeae0450206bcc41ad74e01bcc4fd7bd8dfca74d70100d753b07f",
        mapHash:
          "2cbf36a1c5d03e70dd785be13a1ed7d5dd04fecdd54925baa1b483261d71c9be",
        finalPrngHash:
          "c42f592a01a3ffba7df73eb817e340aae85857fac4a465686a83fa4fd8d06f90",
      },
      {
        mapType: "ARCHIPELAGO",
        factions: ["MARTIAN", "ORIGINAL", "GOBLIN"],
        seed: 7,
        // Tuning 5 (`pulp_wars-w49.4`: the Human Guard open to ranged
        // attacks, Land Grant at 1 Coin a tile, the Swordsman): 14 rounds
        // (15 before), recomputed.
        // The Martian pass (`pulp_wars-w49.14`: a Martian seat plays the
        // army rules, and so do the Human and Goblin seats beside it; the
        // Force Field behind Force Fields): recomputed, 14 rounds still.
        // The economy rejig: 13 rounds.
        rounds: 13,
        commandHash:
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // 45d7b1…eb56).
          // Step two of the Goblin pass (`pulp_wars-w49.23`): recomputed (was
          // 7d40e5…b72f).
          // Step two of the Martian pass (`pulp_wars-w49.25`): recomputed (was
          // 57e036…6414), 13 rounds still.
          "b00168751856bb84b4441b40da7185cb007eb6071ab03ce0ffb46c325d9972a2",
        eventHash:
          // The economy rejig (`pulp_wars-w49.16`, 7r54): recomputed (was
          // a2cb57…32ab).
          // Step two of the Goblin pass (`pulp_wars-w49.23`): recomputed (was
          // e15c18…2a2b).
          // Step two of the Martian pass (`pulp_wars-w49.25`): recomputed (was
          // 696f38…73b8).
          "30224e6b16a03d38ffb233de427b967290767e6544d0e1a1cafd9e757be2ba2d",
        mapHash:
          "be112bd78cfeb3f5ae72a6b67f8f91bd45b81814c5d0cdad9abe7f31f221be5d",
        finalPrngHash:
          "93ed9f1c09f66acd0db8cdb2a0b2e1da51eaf630d4e7fa2a4769ecbbc50084a7",
      },
      {
        mapType: "LAKES",
        factions: ["DWARF", "UNDEAD", "ICE_FOLK", "DINOSAUR"],
        seed: 2,
        // Tuning 6: 10 rounds (11 before). The economy rejig: 11.
        // The Industry reshuffle (7r56): 10 rounds.
        // Step two of the Dwarf pass (`pulp_wars-w49.28`: the Dwarf seat and
        // the three beside it play the army rules): 10 rounds still,
        // recomputed; the board and the final PRNG state are unchanged.
        rounds: 10,
        commandHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // 85af21…7e03).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // b331e2…17ee).
          // Step two of the Dwarf pass (`pulp_wars-w49.28`): recomputed (was
          // 1d70af…254e).
          "347bb6f6ebef221abb1655afe916484771a40f728591869f8425576322524c74",
        eventHash:
          // The ninth unit (`pulp_wars-w49.17`, 7r55): recomputed (was
          // 263a85…a9e5).
          // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): recomputed (was
          // 19d010…89f2).
          // Step two of the Dwarf pass (`pulp_wars-w49.28`): recomputed (was
          // 7ebf08…ad22).
          "e6d2db9539b9981ff7ed2e2f32b77685387098684473e57e587443aa688bc613",
        mapHash:
          "70ff339440ce86f231bca6b2be56c748891436934f614f6ef66fa53933f3d5ab",
        finalPrngHash:
          "7b19df276523773e45ee21ddbff082d03424c46ae533dc4ded29b69103a8f124",
      },
    ];
    for (const pin of pins) {
      const aiCount = (pin.factions.length - 1) as 1 | 2 | 3;
      const width = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
      const result = runAiMatchV7(
        generatedSetup(
          pin.seed,
          pin.mapType,
          width,
          aiCount,
          false,
          pin.factions,
        ),
        { maxCommands: 250, maxRounds: 40 },
      );
      // The Candy revision (`pulp_wars-jdb.3`, 7r38) adds four combat
      // preview fields, neutral in every match without a Candy seat; with
      // them removed the events hash to the pins unchanged, so a match
      // without a Candy seat plays and reads exactly as at 7r37.
      expect(result.metrics.eventHash).toBe(canonicalHash(result.events));
      const eventsBeforeCandy = result.events.map((event) => {
        if (event.kind !== "COMBAT_RESOLVED") return event;
        const {
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
          ...preview
        } = event.preview;
        // The ninth unit (`pulp_wars-w49.17`, 7r55) adds three more.
        expect([shockDamage, crackApplied, frostbiteApplied]).toEqual([
          0,
          false,
          false,
        ]);
        // The naval branch (`pulp_wars-5ti.2`, 7r43) adds two more, neutral
        // while no seat holds Seamanship or Submersibles.
        expect([ram, torpedo]).toEqual([false, false]);
        // The frozen sea (`pulp_wars-5ti.3`, 7r44) adds two more, neutral
        // while nothing is frozen.
        expect([iceCover, icebound]).toEqual([false, false]);
        expect([sugarRushApplied, splatApplied, bounce, bounceTo]).toEqual([
          false,
          false,
          "NONE",
          null,
        ]);
        return { ...event, preview };
      });
      expect(
        {
          acceptedCommands: result.acceptedCommands,
          rounds: result.rounds,
          commandHash: result.metrics.commandHash,
          eventHash: canonicalHash(eventsBeforeCandy),
          mapHash: result.metrics.mapHash,
          finalPrngHash: result.metrics.finalPrngHash,
          curiosityKinds: result.metrics.curiosityKinds,
        },
        pin.mapType,
      ).toEqual({
        acceptedCommands: pin.acceptedCommands ?? 250,
        rounds: pin.rounds,
        commandHash: pin.commandHash,
        eventHash: pin.eventHash,
        mapHash: pin.mapHash,
        finalPrngHash: pin.finalPrngHash,
        curiosityKinds: [],
      });
    }
  }, 600_000);

  it("a match with the option on that drew no curiosity plays exactly like the same match off", () => {
    // The first 11 x 11 seed whose stream's first draw aims for none.
    let seed = 0;
    while (curiosityTargetCountV7(11, curiosityRandomStateV7(seed)).count > 0)
      seed += 1;
    const on = generatedSetup(seed, "DRY_LAND", 11, 1, true);
    const withOption = runAiMatchV7(on, { maxCommands: 200 });
    const without = runAiMatchV7(
      { ...on, curiosities: false },
      { maxCommands: 200 },
    );
    expect(withOption.metrics.curiosityKinds).toEqual([]);
    expect(withOption.metrics.commandHash).toBe(without.metrics.commandHash);
    expect(withOption.metrics.eventHash).toBe(without.metrics.eventHash);
    expect(normalizedInitialState(withOption.state)).toBe(
      normalizedInitialState(without.state),
    );
    // Score and modes (`pulp_wars-kaw6.2`): the same score ledger too.
    expect(withOption.state.scoreLedger).toEqual(without.state.scoreLedger);
  }, 600_000);

  it("records the option in every batch entry and the placed kinds in its metrics", async () => {
    const batch = await runAiBatchV7({
      seeds: [1],
      aiCounts: [1],
      boardSize: 16,
      mapTypes: ["DRY_LAND"],
      curiosities: true,
      maxCommands: 1,
    });
    const created = createInitialMapStateV7(
      generatedSetup(1, "DRY_LAND", 16, 1, true),
    );
    if (!created.ok) throw new Error(created.error.code);
    expect(batch.entries[0]).toMatchObject({
      curiosities: true,
      metrics: {
        curiosityKinds: created.state.curiosities.map((entry) => entry.kind),
      },
    });
    expect(created.state.curiosities.length).toBe(1);
    const off = await runAiBatchV7({
      seeds: [1],
      aiCounts: [1],
      boardSize: 16,
      mapTypes: ["DRY_LAND"],
      curiosities: false,
      maxCommands: 1,
    });
    expect(off.entries[0]).toMatchObject({
      curiosities: false,
      metrics: { curiosityKinds: [] },
    });
  }, 300_000);

  it("takes `--curiosities on|off` for match and batch, on by default, and refuses it for a mission", () => {
    const runCli = <T>(...args: readonly string[]): T =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            resolve("node_modules/tsx/dist/cli.mjs"),
            resolve("src/headless/cli.ts"),
            ...args,
          ],
          { encoding: "utf8", timeout: 30_000 },
        ),
      ) as T;
    const common = [
      "--ruleset",
      RULESET_7_ID,
      "--map-type",
      "dry_land",
      "--size",
      "16",
      "--seed",
      "1",
      "--max-commands",
      "1",
    ];
    type Summary = { readonly metrics: { readonly curiosityKinds: string[] } };
    expect(
      runCli<Summary>("match", ...common).metrics.curiosityKinds,
    ).toHaveLength(1);
    expect(
      runCli<Summary>("match", ...common, "--curiosities", "on").metrics
        .curiosityKinds,
    ).toHaveLength(1);
    expect(
      runCli<Summary>("match", ...common, "--curiosities", "off").metrics
        .curiosityKinds,
    ).toEqual([]);
    const batch = runCli<{
      readonly entries: readonly { readonly curiosities: boolean }[];
    }>(
      "batch",
      "--ruleset",
      RULESET_7_ID,
      "--seeds",
      "1",
      "--ai-counts",
      "1",
      "--max-commands",
      "1",
      "--curiosities",
      "off",
    );
    expect(batch.entries.map((entry) => entry.curiosities)).toEqual([false]);
    expect(() => runCli("match", ...common, "--curiosities", "maybe")).toThrow(
      /--curiosities must be on or off/,
    );
    expect(() =>
      runCli(
        "match",
        "--ruleset",
        RULESET_7_ID,
        "--map-type",
        "mission",
        "--mission",
        "TEST_GROUNDS",
        "--curiosities",
        "off",
      ),
    ).toThrow(/--curiosities does not apply to --map-type mission/);
  }, 300_000);
});

// ------------------------------------------------------ Fountain ---

// -------------------------------------------------------- Shrine ---

// --------------------------------------------------------- Wreck ---

// ------------------------------------------- Projection and state ---

// ---------------------------------------------- Saves and replays ---

describe("saves and replays", () => {
  it("round-trips a generated match with curiosities, a Shrine claimed by Normal, through the replay and the save", () => {
    // 16 x 16 Dry Land seed 17, Human v Goblin: one Shrine, which the
    // Normal AI claims inside 30 rounds (seed 10 until the Monster joined
    // the kind draw at 7r36; seed 4 since, also on the village-density
    // boards of `pulp_wars-ykw.2` and `pulp_wars-ykw.7`; seed 12 on the
    // many-seats boards of `pulp_wars-ykw.3`; seed 17 since the round-2
    // kinds joined the kind draw, `pulp_wars-737.14`).
    const setup = generatedSetup(17, "DRY_LAND", 16, 1, true, [
      "ORIGINAL",
      "GOBLIN",
    ]);
    const match = runAiMatchV7(setup, { maxRounds: 30 });
    expect(match.errors).toEqual([]);
    expect(match.metrics.curiosityKinds).toEqual(["SHRINE"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.curiosities).toHaveLength(1);
    let state = created.state;
    let replay = createReplayV7(setup);
    const seen = new Set<string>();
    for (const record of match.commandLog) {
      const result = applyCommandV7(state, record.playerId, record.command);
      if (!result.accepted) throw new Error(result.error.code);
      for (const event of result.events) {
        expect(parseEventV7(event).ok).toBe(true);
        seen.add(event.kind);
      }
      state = result.state;
      replay = appendReplayCommandV7(replay, record.command, state);
    }
    expect(seen.has("SHRINE_CLAIMED")).toBe(true);
    expect(state.curiosities).toEqual([]);
    expect(canonicalHash(state)).toBe(match.stateHash);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const parsedReplay = parseReplayJsonV7(JSON.stringify(replay));
    if (parsedReplay.kind !== "VALID") throw new Error(parsedReplay.kind);
    expect(parsedReplay.replay.setup.curiosities).toBe(true);
    expect(runReplayV7(parsedReplay.replay).stateHash).toBe(match.stateHash);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toEqual({ kind: "VALID", save });
    const late = createSaveEnvelopeV7(
      { state, replay },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(late))).toEqual({
      kind: "VALID",
      save: late,
    });
    // A save whose curiosity list was tampered with is not valid.
    const tampered = JSON.parse(JSON.stringify(save)) as {
      state: { curiosities: unknown };
    };
    tampered.state.curiosities = [];
    expect(parseSaveV7(JSON.stringify(tampered)).kind).not.toBe("VALID");
  }, 600_000);
});
