import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7,
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
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// The Ice Folk revision (`pulp_wars-7g3.3`): identity
// (docs/product/RULESET_7_ICE_FOLK.md sections 2.1 and 15). It took 7r24;
// the Martian balance bead (`pulp_wars-t6s.5`, Colossus Defense 2.5) bumped
// the identity to 7r25, the Pangea coast ring (`pulp_wars-9s0.2`) to
// 7r26, the Ice Folk coarse balance (`pulp_wars-7g3.7`, Yeti 9 HP and
// Defense 1.5) to 7r27, the Rift (`pulp_wars-9s0.5`) to 7r28, and the
// unique-factions rule (`pulp_wars-w5j.1`) to 7r29, the Dwarf faction
// engine (`pulp_wars-78i.3`) to 7r30, the Dwarf coarse balance
// (`pulp_wars-78i.7`, bomb 5 and Dive 6) to 7r31, the Martian Grunt and
// Tripod ranges (`pulp_wars-b5f.2`) to 7r32, Mind Control keeps the unit
// (`pulp_wars-b5f.3`) to 7r33, the mission setup (`pulp_wars-68k.2`) to
// 7r34, the map curiosities engine I (`pulp_wars-737.2`) to 7r35, the
// Giant Spider (`pulp_wars-737.3`) to 7r36, the Martian and Ice Folk
// balance round (`pulp_wars-1wy.3`: Glide from Snow onto Snow, Snow cover
// x 1.25) to 7r37, the Candy engine (`pulp_wars-jdb.3`) to 7r38, the
// Martian Grunt's 8 HP (`pulp_wars-1wy.6`) to 7r39, the village density
// (`pulp_wars-ykw.2`) to 7r40, and the early economy tweak (`pulp_wars-if6`,
// 3 starting Coins and tier 3 technology base cost 9) to 7r41, so these
// pins follow the current identity.

/** The revision number of the current identity (`pulp-wars-poc-7rNN`). */
const REVISION = 54;
const ID = `pulp-wars-poc-7r${REVISION}`;
const PREVIOUS_ID = `pulp-wars-poc-7r${REVISION - 1}`;

class MemoryStorage implements StorageAdapter {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries);
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("the Ice Folk revision identity", () => {
  it("is the next identity, with a gap-free prior list ending in the previous one, and its save key", () => {
    expect(RULESET_7_ID).toBe(ID);
    expect(RULESET_7.id).toBe(ID);
    expect(SAVE_STORAGE_KEY_V7).toBe(`pulpWars.save.v7r${REVISION}.current`);
    expect([...PRIOR_RULESET_7_IDS]).toEqual([
      "pulp-wars-poc-7",
      ...Array.from(
        { length: REVISION - 2 },
        (_, index) => `pulp-wars-poc-7r${index + 2}`,
      ),
    ]);
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe(PREVIOUS_ID);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect([...OBSOLETE_SAVE_STORAGE_KEYS_V7]).toEqual([
      "pulpWars.save.v7.current",
      ...Array.from(
        { length: REVISION - 2 },
        (_, index) => `pulpWars.save.v7r${index + 2}.current`,
      ),
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through the previous identity's and preserves everything else", () => {
    const previousKey = `pulpWars.save.v7r${REVISION - 1}.current`;
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r22.current", "martian"],
      [previousKey, "previous"],
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: ["pulpWars.save.v7r22.current", previousKey],
      removedCount: 2,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.unrelated",
    ]);
  });

  it("rejects the previous identity's setups, states, replays, and saves without migration", () => {
    const setup = goblinSetupV7(["ICE_FOLK", "ORIGINAL"]);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.rulesetId).toBe(ID);
    const oldSetup = { ...setup, rulesetId: PREVIOUS_ID };
    expect(parseMatchSetupV7(setup)).not.toBeNull();
    expect(parseMatchSetupV7(oldSetup)).toBeNull();
    expect(
      parseGameStateV7({
        ...created.state,
        rulesetId: PREVIOUS_ID,
        setup: oldSetup,
      }),
    ).toBeNull();
    // A previous-identity state never had a `chilled` list; it is not
    // migrated either.
    const { chilled: _chilled, ...withoutChill } = created.state;
    void _chilled;
    expect(parseGameStateV7(withoutChill)).toBeNull();
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
      { state: created.state, replay: createReplayV7(setup) },
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

  it("names the current save key in every browser probe and review script that hard-codes one", () => {
    // The Martian UI probe showed that a hard-coded save key breaks on an
    // identity bump: every `saveKey`/`SAVE_KEY` constant must be current.
    for (const file of [
      "scripts/browser-smoke-v7.ts",
      "scripts/browser-dinosaur-review-v7.ts",
      "scripts/browser-martian-review-v7.ts",
      // The Ice Folk UI review (pulp_wars-7g3.6).
      "scripts/browser-ice-folk-review-v7.ts",
      // The Dwarf UI review (pulp_wars-78i.6).
      "scripts/browser-dwarf-review-v7.ts",
    ]) {
      const text = readFileSync(
        join(import.meta.dirname, "..", "..", file),
        "utf8",
      );
      const keys = [
        ...text.matchAll(
          /(?:saveKey|SAVE_KEY)\s*=\s*"(pulpWars\.save\.v7r\d+\.current)"/g,
        ),
      ].map((match) => match[1]);
      expect(keys.length, file).toBeGreaterThan(0);
      for (const key of keys) expect(key, file).toBe(SAVE_STORAGE_KEY_V7);
    }
  });
});
