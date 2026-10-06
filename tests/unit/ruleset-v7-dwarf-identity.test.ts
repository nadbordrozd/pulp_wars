import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  createPlayableGameV7,
  createReplayV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Dwarf revision (`pulp_wars-78i.3`): identity
// (docs/product/RULESET_7_DWARVES.md section 2.1). It took 7r30 after the
// unique-factions rule (7r29); later beads that bump the identity re-pin
// REVISION here: the Dwarf coarse balance (`pulp_wars-78i.7`, bomb 5 and
// Dive 6) took 7r31, the Martian Grunt and Tripod ranges
// (`pulp_wars-b5f.2`) 7r32, Mind Control keeps the unit
// (`pulp_wars-b5f.3`) 7r33, the mission setup (`pulp_wars-68k.2`) 7r34, the
// map curiosities engine I (`pulp_wars-737.2`) 7r35, the Giant Spider
// (`pulp_wars-737.3`) 7r36, the Martian and Ice Folk balance round
// (`pulp_wars-1wy.3`) 7r37, the Candy engine (`pulp_wars-jdb.3`) 7r38, the
// Martian Grunt's 8 HP (`pulp_wars-1wy.6`) 7r39, the village density
// (`pulp_wars-ykw.2`) 7r40, and the early economy tweak (`pulp_wars-if6`,
// 3 starting Coins and tier 3 technology base cost 9) 7r41.

/** The revision number of the current identity (`pulp-wars-poc-7rNN`). */
const REVISION = 48;
const ID = `pulp-wars-poc-7r${REVISION}`;
const PREVIOUS_ID = `pulp-wars-poc-7r${REVISION - 1}`;

describe("the Dwarf revision identity", () => {
  it("is the current identity with the previous one last in the gap-free prior list and its save key obsolete", () => {
    expect(RULESET_7_ID).toBe(ID);
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe(PREVIOUS_ID);
    expect(PRIOR_RULESET_7_IDS).toHaveLength(REVISION - 1);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${REVISION}.current`);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      `pulpWars.save.v7r${REVISION - 1}.current`,
    );
  });

  it("rejects the previous identity, and a state without the three Dwarf lists, without migration", () => {
    const setup = goblinSetupV7(["DWARF", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const { state } = created;
    expect(state.rulesetId).toBe(ID);
    const oldSetup = { ...setup, rulesetId: PREVIOUS_ID };
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({ ...state, rulesetId: PREVIOUS_ID, setup: oldSetup }),
    ).toBeNull();
    for (const key of [
      "burrowed",
      "surfacedThisTurn",
      "bombedThisTurn",
    ] as const) {
      const without = Object.fromEntries(
        Object.entries(state).filter(([name]) => name !== key),
      );
      expect(parseGameStateV7(without), key).toBeNull();
    }
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INCOMPATIBLE_REPLAY" });
    const save = createSaveEnvelopeV7(
      { state, replay: createReplayV7(setup) },
      "2026-10-03T12:00:00.000Z",
    );
    expect(parseSaveV7(JSON.stringify(save))).toMatchObject({ kind: "VALID" });
    expect(
      parseSaveV7(
        JSON.stringify({
          ...save,
          rulesetId: PREVIOUS_ID,
          setup: oldSetup,
          state: { ...save.state, rulesetId: PREVIOUS_ID },
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("reads and clears only the current save key in the browser smoke, apart from its obsolete-key probes", () => {
    // The 7r30 bump first missed the smoke's persisted-boundary read
    // (`persisted boundary failed: {}`): every quoted save key in the
    // script that is not an obsolete-key probe must be the current one.
    const text = readFileSync(
      join(import.meta.dirname, "..", "..", "scripts/browser-smoke-v7.ts"),
      "utf8",
    );
    const reads = [
      ...text.matchAll(
        /(\w+:\s*)?localStorage\.(?:getItem|removeItem)\('(pulpWars\.save\.v7r\d+\.current)'\)/g,
      ),
    ].filter((match) => !/^oldV7/.test(match[1] ?? ""));
    expect(reads.length).toBeGreaterThan(1);
    for (const match of reads) expect(match[2]).toBe(SAVE_STORAGE_KEY_V7);
  });
});
