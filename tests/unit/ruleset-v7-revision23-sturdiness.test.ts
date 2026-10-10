import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACTION_IDS_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  UNIT_ROLE_IDS_V7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  runReplayV7,
  type FactionIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { BITTEN_RISING_HP_V7 } from "../../src/engine/v7/afflictions";
import { INFECT_RISING_HP_V7 } from "../../src/engine/v7/infect";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { goblinSetupV7 } from "../fixtures/v7-goblin-arena";

// Revision 20 section 6.3 (`pulp_wars-0hi.3`,
// docs/product/RULESET_7_REVISION_20.md): the sturdiness numbers chosen by
// the balance bead, under the identity `pulp-wars-poc-7r23` (after the
// Martian revision's 7r22). The four core
// Human land roles have +2 maximum HP and the Caveman is back at 10.

class MemoryStorage {
  readonly values: Map<string, string>;
  constructor(entries: readonly (readonly [string, string])[]) {
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

const read = (file: string): string =>
  readFileSync(join(import.meta.dirname, "..", "..", file), "utf8");

// The Ice Folk revision (`pulp_wars-7g3.3`) bumped the identity to 7r24; the
// current identity is pinned in ruleset-v7-ice-folk-identity.test.ts. These
// tests keep the revision-23 facts that still hold: 7r22 and 7r23 are prior
// identities, their save keys are obsolete, and the release contract runs
// this suite.
describe("ruleset-7 revision-23 identity", () => {
  it("keeps 7r22 and 7r23 as prior identities after the later bumps", () => {
    expect(RULESET_7.id).toBe(RULESET_7_ID);
    expect(RULESET_7.version).toBe(7);
    const prior: readonly string[] = PRIOR_RULESET_7_IDS;
    const at = prior.indexOf("pulp-wars-poc-7r22");
    expect(prior.slice(at, at + 2)).toEqual([
      "pulp-wars-poc-7r22",
      "pulp-wars-poc-7r23",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const obsolete: readonly string[] = OBSOLETE_SAVE_STORAGE_KEYS_V7;
    const key = obsolete.indexOf("pulpWars.save.v7r22.current");
    expect(obsolete.slice(key, key + 2)).toEqual([
      "pulpWars.save.v7r22.current",
      "pulpWars.save.v7r23.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through v7r23 and preserves everything else", () => {
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r22.current", "r22"],
      ["pulpWars.save.v7r23.current", "r23"],
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r22.current",
        "pulpWars.save.v7r23.current",
      ],
      removedCount: 2,
      warning: null,
    });
    expect([...storage.values.keys()]).toEqual([
      SAVE_STORAGE_KEY_V7,
      "pulpWars.save.current",
      "pulpWars.settings.v1",
      "pulpWars.artSet.v1",
      "pulpWars.unrelated",
    ]);
  });

  it.each(["pulp-wars-poc-7r22", "pulp-wars-poc-7r23"])(
    "rejects %s setups, states, replays, and saves without migration",
    (oldId) => {
      const setup = goblinSetupV7(["DINOSAUR", "ORIGINAL"]);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      expect(created.state.rulesetId).toBe(RULESET_7_ID);
      const oldSetup = { ...setup, rulesetId: oldId };
      expect(parseMatchSetupV7(setup)).not.toBeNull();
      expect(parseMatchSetupV7(oldSetup)).toBeNull();
      expect(
        parseGameStateV7({
          ...created.state,
          rulesetId: oldId,
          setup: oldSetup,
        }),
      ).toBeNull();
      const oldReplay = {
        format: "pulp-wars-replay",
        version: 7,
        setup: oldSetup,
        commands: [],
        checkpoints: [],
      };
      expect(parseReplayFileV7(oldReplay)).toEqual({
        kind: "INCOMPATIBLE_REPLAY",
      });
      expect(() => runReplayV7(oldReplay)).toThrow(
        expect.objectContaining({ code: "INCOMPATIBLE_REPLAY" }),
      );
      const save = createSaveEnvelopeV7(
        { state: created.state, replay: createReplayV7(setup) },
        "2026-10-02T12:00:00.000Z",
      );
      expect(parseSaveV7(JSON.stringify(save))).toMatchObject({
        kind: "VALID",
      });
      expect(
        parseSaveV7(
          JSON.stringify({
            ...save,
            rulesetId: oldId,
            setup: oldSetup,
            state: { ...save.state, rulesetId: oldId },
          }),
        ),
      ).toMatchObject({ kind: "INCOMPATIBLE" });
    },
  );

  it("keeps the revision-23 suite in the release contract, and the scripts name no prior identity", () => {
    const release = read("scripts/validate-ruleset7-current-release.ts");
    expect(release).toContain(`RULESET_7_ID !== "${RULESET_7_ID}"`);
    expect(release).toContain(SAVE_STORAGE_KEY_V7);
    expect(release).toContain(
      "tests/unit/ruleset-v7-revision23-sturdiness.test.ts",
    );
    const smoke = read("scripts/browser-smoke-v7.ts");
    expect(smoke).toContain(SAVE_STORAGE_KEY_V7);
    expect(smoke).toContain("'pulpWars.save.v7r22.current', 'old-v7r22-bytes'");
    expect(smoke).toContain("keys.oldV7r22 !== null");
    expect(smoke).toContain("'pulpWars.save.v7r23.current', 'old-v7r23-bytes'");
    expect(smoke).toContain("keys.oldV7r23 !== null");
    expect(read("scripts/browser-smoke-v7-contract.ts")).toContain(
      RULESET_7_ID,
    );
    for (const file of [
      "scripts/browser-smoke-v7.ts",
      "scripts/browser-naval-smoke-v7.ts",
      "scripts/browser-smoke-v7-contract.ts",
      "scripts/browser-dinosaur-review-v7.ts",
      "scripts/validate-ruleset7-current-release.ts",
      "scripts/validate-ruleset7-biome.ts",
      "scripts/ruleset7-undead-balance-matrix.ts",
      "src/headless/cli.ts",
      "src/headless/v7.ts",
    ]) {
      expect(read(file), file).not.toContain("pulp-wars-poc-7r22");
      expect(read(file), file).not.toContain("pulp-wars-poc-7r23");
    }
  });
});

describe("ruleset-7 revision-20 section 6.3 sturdiness numbers", () => {
  const LAND: readonly UnitRoleIdV7[] = [
    "FIGHTER",
    "RAIDER",
    "MARKSMAN",
    "GUARD",
    "CAPTAIN",
    "CATAPULT",
    "KNIGHT",
    "JUGGERNAUT",
  ];
  const hp = (faction: FactionIdV7): readonly number[] =>
    LAND.map((role) => effectiveRoleRuleV7(role, faction).maxHp);

  it("pins the maximum HP of every land role of every faction", () => {
    // Fighter, Raider, Marksman, Guard, Captain, Catapult, Knight, Juggernaut.
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): the Human Knight has 13.
    expect(hp("ORIGINAL")).toEqual([12, 12, 12, 17, 10, 10, 13, 40]);
    // The Vampire and Banshee rework (`pulp_wars-ty6i`, 7r70): the Vampire
    // has 13 (was 10).
    expect(hp("UNDEAD")).toEqual([10, 10, 8, 18, 10, 10, 13, 40]);
    expect(hp("GOBLIN")).toEqual([6, 10, 8, 15, 12, 8, 10, 40]);
    // (The ninth unit, 7r55: the Dinosaur siege role is the Stegosaurus,
    // 12 HP; the Triceratops, 20, is the heavy role, pinned in
    // tests/unit/ruleset-v7-ninth-unit.test.ts.)
    expect(hp("DINOSAUR")).toEqual([10, 12, 10, 20, 10, 12, 28, 45]);
    // The Ice Folk revision (`pulp_wars-7g3.3`) adds a sixth faction with its
    // own numbers (docs/product/RULESET_7_ICE_FOLK.md section 3); its coarse
    // balance (`pulp_wars-7g3.7`) gave the Yeti 9 HP.
    // (The ninth unit, 7r55: the defender is the Musk Ox, 16; the Mammoth,
    // 20, is the heavy role.)
    // Ice Folk Freeze (`pulp_wars-w49.37`): the Ice Witch and the Boulder
    // Yeti 10 (were 12), the Frost Giant 36 (was 40).
    expect(hp("ICE_FOLK")).toEqual([9, 10, 8, 16, 10, 10, 14, 36]);
    // The Dwarf revision (`pulp_wars-78i.3`) adds a seventh faction
    // (docs/product/RULESET_7_DWARVES.md section 3).
    // (The ninth unit, 7r55: the breakthrough unit is the Whirligig, 12;
    // the Steam Tank, 16, is the heavy role.)
    expect(hp("DWARF")).toEqual([12, 8, 10, 16, 10, 10, 12, 36]);
    // The Candy revision (`pulp_wars-jdb.3`) adds an eighth faction
    // (docs/product/RULESET_7_CANDY.md section 3).
    expect(hp("CANDY")).toEqual([10, 10, 8, 18, 10, 10, 14, 40]);
    // The Cult registration (`pulp_wars-mch9.3`) adds a ninth faction
    // (docs/product/RULESET_7_CULTISTS.md section 4.1): Initiate, Familiar,
    // Hexer, Idol Bearer, Summoner, Stargazer, Caller, Thing in the Cellar.
    expect(hp("CULT")).toEqual([10, 8, 9, 16, 10, 10, 12, 40]);
    expect(FACTION_IDS_V7).toHaveLength(9);
  });

  it("changes only maximum HP: the Human core roles keep every other value", () => {
    expect(effectiveRoleRuleV7("FIGHTER", "ORIGINAL")).toMatchObject({
      cost: 2,
      attack2: 4,
      defense2: 4,
      move: 1,
      range: 1,
    });
    expect(effectiveRoleRuleV7("RAIDER", "ORIGINAL")).toMatchObject({
      cost: 4,
      attack2: 4,
      defense2: 2,
      move: 2,
    });
    // Tuning 1 (7r46): the Marksman costs 4 (3 before).
    expect(effectiveRoleRuleV7("MARKSMAN", "ORIGINAL")).toMatchObject({
      cost: 4,
      attack2: 4,
      defense2: 2,
      range: 2,
    });
    expect(effectiveRoleRuleV7("GUARD", "ORIGINAL")).toMatchObject({
      cost: 3,
      attack2: 3,
      defense2: 6,
      move: 1,
    });
    expect(effectiveRoleRuleV7("FIGHTER", "DINOSAUR")).toMatchObject({
      label: "Caveman",
      cost: 2,
      attack2: 4,
      defense2: 4,
    });
  });

  it("keeps Humans sturdier than their Undead and Goblin counterparts in the line roles", () => {
    for (const role of ["FIGHTER", "RAIDER", "MARKSMAN"] as const) {
      const human = effectiveRoleRuleV7(role, "ORIGINAL").maxHp;
      expect(human).toBeGreaterThan(effectiveRoleRuleV7(role, "UNDEAD").maxHp);
      expect(human).toBeGreaterThan(effectiveRoleRuleV7(role, "GOBLIN").maxHp);
    }
    expect(effectiveRoleRuleV7("GUARD", "ORIGINAL").maxHp).toBeGreaterThan(
      effectiveRoleRuleV7("GUARD", "GOBLIN").maxHp,
    );
  });

  it("keeps the Skeleton and the Caveman independent of the Human Fighter", () => {
    expect(effectiveRoleRuleV7("FIGHTER", "ORIGINAL").maxHp).toBe(12);
    expect(effectiveRoleRuleV7("FIGHTER", "UNDEAD").maxHp).toBe(10);
    expect(effectiveRoleRuleV7("FIGHTER", "DINOSAUR").maxHp).toBe(10);
    const source = read("src/engine/rules/ruleset-v7.ts");
    for (const role of ["FIGHTER", "RAIDER", "MARKSMAN", "GUARD"])
      expect(source).not.toContain(`...ORIGINAL_ROLE_RULES_V7.${role}`);
  });

  it("kept risings at 10 HP, capped at the Zombie's maximum (12 since 7r57)", () => {
    // Step two of the Undead pass (`pulp_wars-w49.24`): 12 of 18.
    const zombie = effectiveRoleRuleV7("GUARD", "UNDEAD").maxHp;
    expect(Math.min(INFECT_RISING_HP_V7, zombie)).toBe(12);
    expect(Math.min(BITTEN_RISING_HP_V7, zombie)).toBe(12);
  });

  it("starts every unit of a new match at its role's maximum HP", () => {
    const created = createPlayableGameV7(
      goblinSetupV7(["ORIGINAL", "DINOSAUR"]),
    );
    if (!created.ok) throw new Error(created.error.code);
    const factionOf = new Map(
      created.state.players.map((player) => [player.id, player.faction]),
    );
    expect(created.state.units.length).toBeGreaterThan(0);
    for (const unit of created.state.units) {
      const faction = factionOf.get(unit.ownerId);
      if (faction === undefined) throw new Error("owner missing");
      const maxHp = effectiveRoleRuleV7(unit.role, faction).maxHp;
      expect(unit).toMatchObject({ hp: maxHp, maxHp });
    }
    expect(UNIT_ROLE_IDS_V7).toContain("FIGHTER");
  });
});
