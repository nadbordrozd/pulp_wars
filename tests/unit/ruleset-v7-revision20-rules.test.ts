import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as engine from "../../src/engine/index";
import {
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  PRIOR_RULESET_7_IDS,
  PROMOTION_HP_V7,
  PROMOTION_KILLS_V7,
  RULESET_7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  UNIT_ROLE_IDS_V7,
  applyCommandV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  grownUnitV7,
  parseCommandV7,
  parseEventV7,
  parseGameStateV7,
  parseMatchSetupV7,
  parseReplayFileV7,
  previewLayEggV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  runReplayV7,
  viewForV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  cleanupObsoleteRuleset7Saves,
  createSaveEnvelopeV7,
  parseSaveV7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  cityOfV7,
  withEggsV7,
  withKillsV7,
} from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  goblinSetupV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldV7,
  kindsV7,
  patchUnitV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// Revision 20 (`pulp_wars-0hi.2`, docs/product/RULESET_7_REVISION_20.md):
// identity, the removal of Stampede, the T-Rex numbers, and the full heal of
// a Promotion and of a growth stage. Charge! is covered by
// ruleset-v7-revision20-charge.test.ts, Nesting and Wallbreaker by
// ruleset-v7-revision20-industry.test.ts, and the Normal AI by
// ruleset-v7-revision20-ai.test.ts.

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

// Revision 21 (`pulp_wars-9s0.4`) bumped the identity to 7r21; its own pins
// are in ruleset-v7-revision21-achievements.test.ts. These tests keep the
// revision-20 facts that still hold: 7r20 and 7r19 are prior identities, their
// save keys are obsolete, and the scripts perform no Stampede.
describe("ruleset-7 revision-20 identity", () => {
  it("keeps 7r19 and 7r20 as prior identities after the later bumps", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r35");
    expect(RULESET_7.id).toBe("pulp-wars-poc-7r35");
    expect(RULESET_7.version).toBe(7);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r35.current");
    expect(PRIOR_RULESET_7_IDS.slice(-16, -14)).toEqual([
      "pulp-wars-poc-7r19",
      "pulp-wars-poc-7r20",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-16, -14)).toEqual([
      "pulpWars.save.v7r19.current",
      "pulpWars.save.v7r20.current",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });

  it("cleans the obsolete keys through v7r20 and preserves everything else", () => {
    const storage = new MemoryStorage([
      ["pulpWars.save.v7r18.current", "r18"],
      ["pulpWars.save.v7r19.current", "r19"],
      ["pulpWars.save.v7r20.current", "r20"],
      [SAVE_STORAGE_KEY_V7, "r21"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["pulpWars.artSet.v1", "art"],
      ["pulpWars.unrelated", "unrelated"],
    ]);
    expect(cleanupObsoleteRuleset7Saves(storage)).toEqual({
      removedKeys: [
        "pulpWars.save.v7r18.current",
        "pulpWars.save.v7r19.current",
        "pulpWars.save.v7r20.current",
      ],
      removedCount: 3,
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

  it.each(["pulp-wars-poc-7r19", "pulp-wars-poc-7r20"])(
    "rejects %s setups, states, replays, and saves without migration",
    (oldId) => {
      const setup = goblinSetupV7(["DINOSAUR", "ORIGINAL"]);
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      expect(created.state.rulesetId).toBe("pulp-wars-poc-7r35");
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

  it("keeps the revision-20 suites in the release contract and no Stampede in the smoke scripts", () => {
    const read = (file: string): string =>
      readFileSync(join(import.meta.dirname, "..", "..", file), "utf8");
    const release = read("scripts/validate-ruleset7-current-release.ts");
    expect(release).toContain(
      "tests/unit/ruleset-v7-revision20-charge.test.ts",
    );
    expect(release).not.toMatch(/stampede/i);
    const smoke = read("scripts/browser-smoke-v7.ts");
    expect(smoke).toContain("'pulpWars.save.v7r19.current', 'old-v7r19-bytes'");
    expect(smoke).toContain("keys.oldV7r19 !== null");
    // The probe moves a Triceratops, reads "Charge +{n}", and attacks; it
    // performs no Stampede (it only checks that no such control exists).
    expect(smoke).toContain("unit.activation.movedPathLength === 2");
    expect(smoke).not.toMatch(/command-stampede|stampeded|kind === 'STAMPEDE'/);
    for (const file of [
      "scripts/browser-smoke-v7.ts",
      "scripts/browser-naval-smoke-v7.ts",
      "scripts/browser-smoke-v7-contract.ts",
      "scripts/browser-dinosaur-review-v7.ts",
      "scripts/validate-ruleset7-current-release.ts",
      "scripts/validate-ruleset7-biome.ts",
      "src/headless/cli.ts",
      "src/headless/v7.ts",
    ])
      expect(read(file), file).not.toContain("pulp-wars-poc-7r19");
  });
});

describe("ruleset-7 revision-20 Stampede removal", () => {
  it("has no STAMPEDE kind; KABOOM and HATCH stay adjacent (the Mind Control revision: 53 commands, 82 events)", () => {
    // Revision 20 had 45 command kinds and 72 event kinds; the Martian
    // revision inserts three commands after HATCH and four events, the
    // Ice Folk revision two commands after TRACTOR_BEAM and one event, and
    // the Dwarf revision three commands after COLD_SNAP and four events.
    expect(COMMAND_KIND_ORDER_V7).toHaveLength(53);
    expect(COMMAND_KIND_ORDER_V7).not.toContain("STAMPEDE");
    const kaboom = COMMAND_KIND_ORDER_V7.indexOf("KABOOM");
    expect(COMMAND_KIND_ORDER_V7.slice(kaboom, kaboom + 8)).toEqual([
      "KABOOM",
      "HATCH",
      "BEAM_DOWN",
      "MIND_CONTROL",
      "TRACTOR_BEAM",
      "THROW_BOLAS",
      "COLD_SNAP",
      "TUNNEL",
    ]);
    // Map curiosities (pulp_wars-737.2) add FOUNTAIN_HEALED, SHRINE_CLAIMED,
    // and WRECK_SALVAGED (85 event kinds).
    expect(DOMAIN_EVENT_KIND_ORDER_V7).toHaveLength(85);
  });

  it("fails to parse a STAMPEDE command, like any unknown kind", () => {
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const stampede = {
      kind: "STAMPEDE",
      unitId: unitAtV7(state, at(3, 2)).id,
      targetUnitId: unitAtV7(state, at(5, 2)).id,
    };
    expect(parseCommandV7(stampede).ok).toBe(false);
    expect(parseCommandV7({ kind: "NO_SUCH_COMMAND" })).toEqual(
      parseCommandV7(stampede),
    );
    const result = applyCommandV7(state, activeIdV7(state), stampede as never);
    expect(result).toMatchObject({
      accepted: false,
      events: [],
      error: { code: "INVALID_COMMAND" },
    });
    expect(result.state).toBe(state);
    // A replay holding one is invalid, not incompatible.
    expect(
      parseReplayFileV7({
        format: "pulp-wars-replay",
        version: 7,
        setup: state.setup,
        commands: [stampede],
        checkpoints: [],
      }),
    ).toEqual({ kind: "INVALID_REPLAY" });
  });

  it("offers a Triceratops ordinary attacks before and after its Move and never STAMPEDE", () => {
    // A target two tiles away in a straight line: the revision-19 lane.
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 1, role: "GUARD", at: at(3, 1) },
    ]);
    const actor = activeIdV7(state);
    const triceratops = unitAtV7(state, at(3, 2));
    const kinds = (candidate: GameStateV7): readonly string[] =>
      queryPlayerCommandsV7(candidate, actor)
        .filter(
          (command) => "unitId" in command && command.unitId === triceratops.id,
        )
        .map((command) => command.kind);
    expect(kinds(state)).toContain("ATTACK");
    expect(kinds(state)).toContain("MOVE");
    expect(new Set(kinds(state)).has("STAMPEDE" as never)).toBe(false);
    const far = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    expect(
      queryPlayerCommandsV7(far, actor).filter(
        (command) => command.kind === "ATTACK",
      ),
    ).toEqual([]);
    const moved = applyOkV7(far, actor, {
      kind: "MOVE",
      unitId: unitAtV7(far, at(3, 2)).id,
      path: [at(4, 2)],
    }).state;
    expect(
      queryPlayerCommandsV7(moved, actor).filter(
        (command) => command.kind === "ATTACK",
      ),
    ).toEqual([
      {
        kind: "ATTACK",
        unitId: unitAtV7(moved, at(4, 2)).id,
        targetUnitId: unitAtV7(moved, at(5, 2)).id,
      },
    ]);
  });

  it("exports no Stampede query, error, preview field, or reason", () => {
    for (const name of [
      "previewStampedeV7",
      "queryStampedeLanesV7",
      "stampedeLaneV7",
      "viewStampedeFactsV7",
      "stateStampedeFactsV7",
      "STAMPEDE_DIRECTIONS_V7",
      "STAMPEDE_DISTANCES_V7",
      "growthHpGainV7",
    ])
      expect(name in engine, name).toBe(false);
    // No engine, AI, headless, or persistence source names the command, its
    // error code, its preview field, or its no-retaliation reason.
    const root = join(import.meta.dirname, "..", "..");
    const sources = (directory: string): string[] =>
      readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
        (entry) =>
          entry.isDirectory()
            ? sources(`${directory}/${entry.name}`)
            : entry.name.endsWith(".ts")
              ? [`${directory}/${entry.name}`]
              : [],
      );
    for (const file of [
      ...sources("src/engine/v7"),
      "src/engine/rules/ruleset-v7.ts",
      "src/engine/index.ts",
      ...sources("src/ai").filter((name) => name.includes("/v7")),
      ...sources("src/headless"),
      ...sources("src/persistence"),
    ]) {
      const text = readFileSync(join(root, file), "utf8");
      expect(text, file).not.toMatch(
        /STAMPEDE_NOT_LEGAL|"STAMPEDE"|stampede:|stampedeRunBonus|StampedePreview/,
      );
    }
    // A combat preview carries `runUp` and `fortificationIgnored` instead of
    // `stampede`, and an event with `stampede` or the old reason is refused.
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(4, 2) },
    ]);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(Object.keys(run.combat)).not.toContain("stampede");
    expect(Object.keys(run.combat)).toEqual(
      expect.arrayContaining(["runUp", "fortificationIgnored"]),
    );
    const combat = run.events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (combat?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(parseEventV7(combat).ok).toBe(true);
    expect(
      parseEventV7({ ...combat, preview: { ...combat.preview, stampede: 0 } })
        .ok,
    ).toBe(false);
    expect(
      parseEventV7({
        ...combat,
        preview: {
          ...combat.preview,
          retaliation: false,
          damageToAttacker: 0,
          noRetaliationReason: "STAMPEDE",
        },
      }).ok,
    ).toBe(false);
  });
});

describe("ruleset-7 revision-20 T-Rex", () => {
  it("costs 14 and hatches in 4 turns (3 with Nesting); everything else is unchanged", () => {
    expect(effectiveRoleRuleV7("KNIGHT", "DINOSAUR")).toEqual({
      role: "KNIGHT",
      label: "T-Rex",
      tacticalRole: "BREAKTHROUGH",
      cost: 14,
      maxHp: 28,
      attack2: 8,
      defense2: 4,
      move: 2,
      range: 1,
      minimumRange: 1,
      sightRadius: 1,
      technology: "CHIVALRY",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "OVERRUN", "GROW"],
    });
    expect(roleMechanicsV7("KNIGHT", "DINOSAUR")).toMatchObject({
      capacitySlots: 2,
      hatchTurns: 4,
      runUpBonus2: 0,
    });
    for (const [techs, turns, hp] of [
      [withoutTechsV7("DINOSAUR", "FORTIFICATION"), 4, 6],
      [undefined, 3, 10],
    ] as const) {
      const state = goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [{ seat: 1, role: "FIGHTER", at: at(1, 1) }],
        techs === undefined ? {} : { techs: { 0: techs } },
      );
      const city = cityOfV7(state, 0);
      const actor = activeIdV7(state);
      expect(
        previewLayEggV7(viewForV7(state, actor), city.id, "KNIGHT"),
      ).toMatchObject({ cost: 14, slots: 2, turnsToHatch: turns, hp });
      const laid = applyOkV7(state, actor, {
        kind: "LAY_EGG",
        cityId: city.id,
        role: "KNIGHT",
        at: at(7, 7),
      });
      expect(laid.events[0]).toMatchObject({
        kind: "EGG_LAID",
        cost: 14,
        turnsRemaining: turns,
      });
      expect(parseEventV7(laid.events[0]).ok).toBe(true);
      // Disband refund 7, for the Egg too.
      expect(
        applyOkV7(laid.state, actor, {
          kind: "DISBAND",
          unitId: unitAtV7(laid.state, at(7, 7)).id,
        }).events[0],
      ).toMatchObject({ kind: "UNIT_DISBANDED", coinDelta: 7 });
    }
  });

  it("accepts an Egg countdown of 4 and rejects 5", () => {
    const base = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 1, role: "FIGHTER", at: at(1, 1) }],
    );
    const state = withEggsV7(base, [
      { seat: 0, role: "KNIGHT", at: at(7, 7), turnsRemaining: 4 },
    ]);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(
      parseGameStateV7({
        ...state,
        eggs: state.eggs.map((entry) => ({ ...entry, turnsRemaining: 5 })),
      }),
    ).toBeNull();
    // A Triceratops Egg never has more turns left than its hatch time (2).
    expect(() =>
      withEggsV7(base, [
        { seat: 0, role: "CATAPULT", at: at(7, 7), turnsRemaining: 3 },
      ]),
    ).toThrow();
    const laid = {
      kind: "EGG_LAID",
      playerId: 1,
      cityId: 1,
      unitId: 9,
      role: "KNIGHT",
      cost: 14,
      at: at(7, 8),
      hp: 6,
      turnsRemaining: 4,
    };
    expect(parseEventV7(laid).ok).toBe(true);
    expect(parseEventV7({ ...laid, turnsRemaining: 5 }).ok).toBe(false);
  });
});

describe("ruleset-7 revision-20 role registrations (section 6.1)", () => {
  it("states the Skeleton's and the Caveman's own rule, independent of the Human Fighter", () => {
    const line = {
      role: "FIGHTER",
      tacticalRole: "LINE",
      cost: 2,
      attack2: 4,
      defense2: 4,
      move: 1,
      range: 1,
      minimumRange: 1,
      sightRadius: 1,
      technology: null,
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "CAPTURE"],
    };
    // Section 6.3 (`pulp_wars-0hi.3`): the Human Fighter has 12 HP.
    expect(effectiveRoleRuleV7("FIGHTER", "ORIGINAL")).toEqual({
      ...line,
      label: "Fighter",
      maxHp: 12,
    });
    expect(effectiveRoleRuleV7("FIGHTER", "UNDEAD")).toEqual({
      ...line,
      label: "Skeleton",
      maxHp: 10,
    });
    // `pulp_wars-c87.8` tuned the Caveman to 12 HP; `pulp_wars-0hi.3`
    // returned it to the contract's 10 (section 6.3).
    expect(effectiveRoleRuleV7("FIGHTER", "DINOSAUR")).toEqual({
      ...line,
      label: "Caveman",
      maxHp: 10,
    });
    // Neither registration copies the Human Fighter's rule any more.
    const source = readFileSync(
      join(import.meta.dirname, "..", "..", "src/engine/rules/ruleset-v7.ts"),
      "utf8",
    );
    expect(source).not.toContain("...ORIGINAL_ROLE_RULES_V7.FIGHTER");
  });

  it("changes no Undead or Goblin unit number, and only the section 6.3 Human HP", () => {
    const hp = (faction: FactionIdV7): readonly number[] =>
      UNIT_ROLE_IDS_V7.map((role) => effectiveRoleRuleV7(role, faction).maxHp);
    // `pulp_wars-0hi.3`: Fighter, Raider, Marksman 12 (were 10), Guard 17
    // (was 15).
    expect(hp("ORIGINAL")).toEqual([12, 12, 12, 17, 10, 10, 10, 40, 10, 25]);
    expect(hp("UNDEAD")).toEqual([10, 10, 8, 18, 10, 10, 10, 40, 10, 25]);
    expect(hp("GOBLIN")).toEqual([6, 10, 8, 15, 12, 8, 10, 40, 10, 25]);
  });
});

describe("ruleset-7 revision-20 Promotion fully heals", () => {
  const promotable = (
    faction: FactionIdV7,
    role: UnitRoleIdV7,
    hp: number | "FULL",
  ): GameStateV7 => {
    const base = goblinArenaV7(
      [faction, faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL"],
      [
        { seat: 0, role, at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const unit = unitAtV7(base, at(4, 3));
    return patchUnitV7(base, at(4, 3), {
      kills: PROMOTION_KILLS_V7,
      hp: hp === "FULL" ? unit.maxHp : hp,
    });
  };

  it("registers 3 kills and +5 maximum HP", () => {
    expect([PROMOTION_KILLS_V7, PROMOTION_HP_V7]).toEqual([3, 5]);
  });

  it.each([
    ["ORIGINAL", "FIGHTER"],
    ["ORIGINAL", "GUARD"],
    ["UNDEAD", "FIGHTER"],
    ["UNDEAD", "KNIGHT"],
    ["GOBLIN", "FIGHTER"],
    ["GOBLIN", "GUARD"],
    ["DINOSAUR", "FIGHTER"],
    ["DINOSAUR", "CAPTAIN"],
  ] as const)(
    "sets a %s %s's HP to its new maximum at full HP, wounded, and at 1 HP",
    (faction, role) => {
      const maxHp = effectiveRoleRuleV7(role, faction).maxHp;
      for (const hp of ["FULL", Math.ceil(maxHp / 3), 1] as const) {
        const state = promotable(faction, role, hp);
        const unit = unitAtV7(state, at(4, 3));
        const command = { kind: "PROMOTE" as const, unitId: unit.id };
        expect(queryPlayerCommandsV7(state, activeIdV7(state))).toContainEqual(
          command,
        );
        const result = applyOkV7(state, activeIdV7(state), command);
        // Event shape unchanged: `maxHp` now implies `hp`.
        expect(result.events).toEqual([
          { kind: "UNIT_PROMOTED", unitId: unit.id, maxHp: maxHp + 5 },
        ]);
        expect(parseEventV7(result.events[0]).ok).toBe(true);
        expect(unitAtV7(result.state, at(4, 3))).toMatchObject({
          veteran: true,
          maxHp: maxHp + 5,
          hp: maxHp + 5,
          kills: 3,
          // Promotion is independent of the activation.
          activation: unit.activation,
        });
        // Once per unit.
        expect(
          applyCommandV7(result.state, activeIdV7(state), command),
        ).toMatchObject({
          accepted: false,
          error: { code: "PROMOTION_NOT_ELIGIBLE" },
        });
        expect(
          publicUnitStatsV7(result.state, unitAtV7(result.state, at(4, 3)))
            .stats[0]?.modifiers[0],
        ).toMatchObject({
          source: "PROMOTION",
          description: "Promotion adds 5 maximum HP and fully heals.",
        });
      }
    },
  );

  it("matches the spec example: a Fighter at 3 of 12 HP promotes to 17 of 17", () => {
    const state = promotable("ORIGINAL", "FIGHTER", 3);
    const result = applyOkV7(state, activeIdV7(state), {
      kind: "PROMOTE",
      unitId: unitAtV7(state, at(4, 3)).id,
    });
    expect(unitAtV7(result.state, at(4, 3))).toMatchObject({
      hp: 17,
      maxHp: 17,
    });
  });

  it("keeps Plague and Bitten, and still refuses embarked, growing, and unproven units", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3), hp: 2 },
        { seat: 1, role: "GUARD", at: at(1, 1) },
        { seat: 1, role: "CATAPULT", at: at(1, 2) },
      ],
    );
    const fighter = unitAtV7(base, at(4, 3));
    const afflicted = checkedV7({
      ...patchUnitV7(base, at(4, 3), { kills: 3 }),
      bitten: [
        {
          unitId: fighter.id,
          biterPlayerId: seatIdV7(base, 1),
          biterUnitId: unitAtV7(base, at(1, 1)).id,
        },
      ],
      plagued: [
        {
          unitId: fighter.id,
          sourceUnitId: unitAtV7(base, at(1, 2)).id,
          turnsRemaining: 3,
        },
      ],
    });
    const promoted = applyOkV7(afflicted, activeIdV7(afflicted), {
      kind: "PROMOTE",
      unitId: fighter.id,
    }).state;
    expect(unitAtV7(promoted, at(4, 3))).toMatchObject({ hp: 17, maxHp: 17 });
    expect(promoted.bitten).toEqual(afflicted.bitten);
    expect(promoted.plagued).toEqual(afflicted.plagued);
    // A growing unit is never promoted, whatever its kills.
    const raptor = withKillsV7(
      goblinArenaV7(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role: "RAIDER", at: at(4, 3) },
          { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ],
      ),
      at(4, 3),
      3,
    );
    expect(
      applyCommandV7(raptor, activeIdV7(raptor), {
        kind: "PROMOTE",
        unitId: unitAtV7(raptor, at(4, 3)).id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "PROMOTION_NOT_ELIGIBLE" },
    });
    // Two kills are not enough.
    const unproven = patchUnitV7(base, at(4, 3), { kills: 2 });
    expect(
      applyCommandV7(unproven, activeIdV7(unproven), {
        kind: "PROMOTE",
        unitId: fighter.id,
      }),
    ).toMatchObject({
      accepted: false,
      error: { code: "PROMOTION_NOT_ELIGIBLE" },
    });
  });
});

describe("ruleset-7 revision-20 growth fully heals", () => {
  it("heals to the new maximum from an attack kill, before the advance (the spec T-Rex)", () => {
    // A T-Rex at 10 of 28 HP whose attack makes its first kill is at 32 of
    // 32 before it advances and Rampages.
    const state = fieldV7([
      { seat: 0, role: "KNIGHT", at: at(3, 2), hp: 10 },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
      { seat: 1, role: "FIGHTER", at: at(5, 2) },
    ]);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.events.filter((event) => event.kind === "UNIT_GREW")).toEqual([
      {
        kind: "UNIT_GREW",
        unitId: run.attacker?.id,
        stage: 1,
        maxHp: 32,
        hp: 32,
      },
    ]);
    const order = kindsV7(run.events);
    expect(order.indexOf("UNIT_GREW")).toBeLessThan(
      order.indexOf("UNIT_MOVED"),
    );
    expect(run.attacker).toMatchObject({ at: at(4, 2), hp: 32, maxHp: 32 });
    // The Rampage continuation fights at 32 of 32.
    expect(run.attacker?.activation.overrunActive).toBe(true);
    const second = attackV7(run.state, at(4, 2), at(5, 2));
    expect(second.combat.attack2).toBe(8);
    expect(second.attacker?.kills).toBe(2);
  });

  it("heals a wounded Alpha-to-be from a Rampage kill", () => {
    const base = fieldV7([
      { seat: 0, role: "KNIGHT", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
    ]);
    // Two kills (Big, 32 maximum HP) and badly wounded.
    const state = withKillsV7(base, at(3, 2), 2, 5);
    expect(unitAtV7(state, at(3, 2))).toMatchObject({ hp: 5, maxHp: 32 });
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.events.filter((event) => event.kind === "UNIT_GREW")).toEqual([
      {
        kind: "UNIT_GREW",
        unitId: run.attacker?.id,
        stage: 2,
        maxHp: 36,
        hp: 36,
      },
    ]);
    expect(run.attacker).toMatchObject({ kills: 3, hp: 36, maxHp: 36 });
  });

  it("heals from a retaliation kill (the spec Ankylosaurus at 2 HP)", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "GUARD", at: at(3, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    // An Ankylosaurus with two kills (Big, 24) is left at 2 HP by the hit
    // (3 HP, 1 damage) and its retaliation makes its third kill.
    const state = withKillsV7(base, at(4, 2), 2, 3);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 1,
      attackerDies: true,
      defenderDies: false,
    });
    expect(run.target).toMatchObject({ kills: 3, hp: 28, maxHp: 28 });
    expect(run.events.filter((event) => event.kind === "UNIT_GREW")).toEqual([
      {
        kind: "UNIT_GREW",
        unitId: run.target?.id,
        stage: 2,
        maxHp: 28,
        hp: 28,
      },
    ]);
  });

  it("resolves two stages in one command in order, each to its new maximum", () => {
    const state = fieldV7([
      { seat: 0, role: "RAIDER", at: at(3, 2) },
      { seat: 1, role: "FIGHTER", at: at(9, 2) },
    ]);
    const raptor = unitAtV7(state, at(3, 2));
    const events: DomainEventV7[] = [];
    const grown = grownUnitV7(state, 0, { ...raptor, kills: 3, hp: 1 }, events);
    expect(grown).toMatchObject({ hp: 20, maxHp: 20 });
    expect(events).toEqual([
      { kind: "UNIT_GREW", unitId: raptor.id, stage: 1, maxHp: 16, hp: 16 },
      { kind: "UNIT_GREW", unitId: raptor.id, stage: 2, maxHp: 20, hp: 20 },
    ]);
    for (const event of events) expect(parseEventV7(event).ok).toBe(true);
    // `UNIT_GREW` always has `hp` equal to `maxHp`.
    expect(
      parseEventV7({
        kind: "UNIT_GREW",
        unitId: raptor.id,
        stage: 1,
        maxHp: 16,
        hp: 15,
      }).ok,
    ).toBe(false);
  });

  it("does not grow a unit that died in the exchange", () => {
    // The Raptor dies to the Guard's retaliation while its attack kills
    // nothing, and a dead unit never grows.
    const state = fieldV7([
      { seat: 0, role: "RAIDER", at: at(3, 2), hp: 1 },
      { seat: 1, role: "GUARD", at: at(4, 2) },
    ]);
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat.attackerDies).toBe(true);
    expect(run.attacker).toBeUndefined();
    expect(kindsV7(run.events)).not.toContain("UNIT_GREW");
    const dead = grownUnitV7(
      state,
      0,
      { ...unitAtV7(state, at(3, 2)), kills: 1, hp: 0 },
      [],
    );
    expect(dead).toMatchObject({ hp: 0, maxHp: 12 });
  });

  it("keeps Plague and Bitten through a growth", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(3, 2), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(0, 10) },
        { seat: 1, role: "CATAPULT", at: at(1, 10) },
      ],
      { factions: ["DINOSAUR", "UNDEAD"] },
    );
    const raptor = unitAtV7(base, at(3, 2));
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: raptor.id,
          biterPlayerId: seatIdV7(base, 1),
          biterUnitId: unitAtV7(base, at(0, 10)).id,
        },
      ],
      plagued: [
        {
          unitId: raptor.id,
          sourceUnitId: unitAtV7(base, at(1, 10)).id,
          turnsRemaining: 2,
        },
      ],
    });
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.attacker).toMatchObject({ hp: 16, maxHp: 16, kills: 1 });
    expect(run.state.bitten).toEqual(state.bitten);
    expect(run.state.plagued).toEqual(state.plagued);
  });

  it("previews a death-blast chain with the healed HP", () => {
    // A Raptor at 1 HP kills a Scrap Buggy; its blast (4) kills a Rocket
    // Cart, whose blast (4) hits the Raptor again. Healed to 16 by its
    // growth, the Raptor survives both (5 HP, as before revision 20, would
    // not). `attackV7` checks that the chain preview equals the resolution.
    const state = fieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(3, 2), hp: 1 },
        { seat: 1, role: "KNIGHT", at: at(4, 2), hp: 1 },
        { seat: 1, role: "CATAPULT", at: at(5, 2), hp: 3 },
      ],
      { factions: ["DINOSAUR", "GOBLIN"] },
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    const blasts = run.events.filter(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(blasts).toHaveLength(2);
    expect(run.attacker).toMatchObject({
      at: at(4, 2),
      maxHp: 16,
      hp: 16 - 4 - 4,
    });
  });
});
